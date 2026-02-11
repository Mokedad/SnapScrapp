from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# Emergent LLM key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
ADMIN_PIN = os.environ.get('ADMIN_PIN', '9090')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ MODELS ============

class PostCreate(BaseModel):
    image_base64: str  # Primary image (required)
    images: Optional[List[str]] = None  # Additional images (optional)
    title: str
    category: str
    description: Optional[str] = ""  # NOW OPTIONAL for fast posting
    expiry_hours: int = 48
    latitude: float
    longitude: float
    poster_phone: Optional[str] = None  # Optional contact number for pickers

class PostResponse(BaseModel):
    id: str
    image_base64: str  # Primary image for backwards compatibility
    images: List[str] = []  # All images including primary
    title: str
    category: str
    description: str
    latitude: float
    longitude: float
    created_at: str
    expires_at: str
    status: str  # "active", "pending", "collected", "expired", "removed"
    report_count: int = 0
    claim_id: Optional[str] = None  # Active claim ID if any
    poster_phone: Optional[str] = None  # Only revealed on active claim

class AIAnalysisRequest(BaseModel):
    image_base64: str

class AIAnalysisResponse(BaseModel):
    title: str
    category: str
    description: str

# NEW: Fast title-only response for 2-speed workflow
class FastTitleRequest(BaseModel):
    image_base64: str

class FastTitleResponse(BaseModel):
    title: str
    category: str

# NEW: Background description generation
class GenerateDescriptionRequest(BaseModel):
    post_id: str

class ReportCreate(BaseModel):
    post_id: str
    reason: str  # "not_correct", "illegal_dumping"
    details: Optional[str] = ""  # Additional details for illegal dumping

class ReportResponse(BaseModel):
    id: str
    post_id: str
    reason: str
    details: Optional[str] = ""
    status: str
    created_at: str
    # For illegal dumping reports
    suburb: Optional[str] = None
    region: Optional[str] = None
    post_title: Optional[str] = None
    post_description: Optional[str] = None
    post_category: Optional[str] = None
    post_image: Optional[str] = None  # Base64 or URL
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None

# Illegal Dumping Report - full data for email
class IllegalDumpingReport(BaseModel):
    id: str
    post_id: str
    post_title: str
    post_description: str
    post_category: str
    post_image: str
    latitude: float
    longitude: float
    address: str
    suburb: str
    region: str
    reporter_details: Optional[str] = ""
    created_at: str
    status: str = "pending"

# Admin Branding/Companies tracking
class BrandCreate(BaseModel):
    name: str
    category: str  # "appliances", "electronics", "furniture", etc.
    notes: Optional[str] = ""

class BrandResponse(BaseModel):
    id: str
    name: str
    category: str
    notes: str
    scan_count: int
    last_scanned: Optional[str]
    created_at: str

class AdminVerify(BaseModel):
    pin: str

class StatsResponse(BaseModel):
    total_posts: int
    active_posts: int
    collected_posts: int
    expired_posts: int
    removed_posts: int
    pending_reports: int
    categories: dict

# Item Type Tracking (for "Types of Scrap" tab)
class ItemTypeRecord(BaseModel):
    category: str
    title: str
    brand: Optional[str] = None
    count: int = 1

# Partner Click Tracking
class PartnerClickRecord(BaseModel):
    partner_id: str
    partner_name: str
    post_id: Optional[str] = None
    category: Optional[str] = None

# Interaction Logging (for analytics)
class InteractionLog(BaseModel):
    post_id: str
    interaction_type: str  # 'direction_click', 'contact_reveal', 'claim_intent'

# Claim System (for item claiming handshake)
class ClaimCreate(BaseModel):
    post_id: str

class ClaimResponse(BaseModel):
    claim_id: str
    post_id: str
    status: str  # 'pending', 'active', 'expired', 'completed'
    created_at: str
    expires_at: str
    minutes_remaining: int
    poster_phone: Optional[str] = None  # Only revealed when claim is active

# ============ HELPER FUNCTIONS ============

def generate_id():
    return str(uuid.uuid4())

def now_utc():
    return datetime.now(timezone.utc)

def to_iso(dt: datetime) -> str:
    return dt.isoformat()

def from_iso(s: str) -> datetime:
    return datetime.fromisoformat(s.replace('Z', '+00:00'))

# Fuzzy location (offset by ~30-50m randomly for privacy, but still accurate)
import random
def fuzz_location(lat: float, lng: float) -> tuple:
    # ~0.0005 degree is about 50m - enough for privacy but still accurate area
    offset_lat = random.uniform(-0.0005, 0.0005)
    offset_lng = random.uniform(-0.0005, 0.0005)
    return (lat + offset_lat, lng + offset_lng)

# ============ AI CONTENT MODERATION ============

async def check_image_safety(image_base64: str) -> dict:
    """Check if image contains inappropriate content using Gemini"""
    import json
    import re
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"safety-{generate_id()}",
            system_message="""You are a content moderation AI. Analyze this image and determine if it's appropriate for a community marketplace app where people give away unwanted household items.

REJECT images that contain:
- Sexual or adult content
- Nudity or suggestive content
- Violence or gore
- Illegal items (drugs, weapons, stolen goods)
- Dangerous items that could harm others
- Explicit or offensive content

APPROVE images that show:
- Household items, furniture, electronics
- Clothing, toys, books, sports equipment
- Garden items, tools, appliances
- Any normal item someone might give away

Respond ONLY with JSON:
{"safe": true/false, "reason": "brief reason if unsafe"}"""
        ).with_model("gemini", "gemini-2.5-flash")
        
        image_content = ImageContent(image_base64=image_base64)
        user_message = UserMessage(
            text="Is this image safe and appropriate for a community item giveaway app?",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        response_text = response.strip() if isinstance(response, str) else str(response).strip()
        
        # Parse JSON
        json_match = re.search(r'\{[^{}]*\}', response_text, re.DOTALL)
        if json_match:
            result = json.loads(json_match.group())
            return {"safe": result.get("safe", True), "reason": result.get("reason", "")}
        
        return {"safe": True, "reason": ""}
    except Exception as e:
        print(f"Safety check error: {e}")
        # Default to safe if check fails (don't block legitimate posts)
        return {"safe": True, "reason": ""}

# ============ AI IMAGE ANALYSIS ============

@api_router.post("/analyze-image", response_model=AIAnalysisResponse)
async def analyze_image(request: AIAnalysisRequest):
    """
    FACTORY RESET: HIGH-QUALITY VISION ANALYSIS
    - Prioritizes ACCURACY and SPECIFICITY over speed
    - Uses powerful prompting for detailed, intelligent responses
    - STRICTLY FORBIDS generic titles
    """
    import json
    import re
    
    try:
        # Step 1: Safety Filter (Block inappropriate content)
        safety_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"safety-{generate_id()}",
            system_message="You are a content safety moderator for a community giveaway app."
        ).with_model("gemini", "gemini-2.5-flash")
        
        safety_message = UserMessage(
            text="Does this image contain nudity, sexual content, drugs, weapons, violence, gore, hate symbols, or illegal activity? Reply ONLY 'SAFE' or 'UNSAFE'.",
            file_contents=[ImageContent(image_base64=request.image_base64)]
        )
        
        safety_response = await safety_chat.send_message(safety_message)
        safety_text = safety_response.strip() if isinstance(safety_response, str) else str(safety_response).strip()
        
        if "UNSAFE" in safety_text.upper():
            raise HTTPException(status_code=400, detail="Post rejected due to inappropriate content.")
        
        # Step 2: HIGH-QUALITY Image Analysis with detailed expert prompt
        analysis_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analyze-{generate_id()}",
            system_message="""You are a world-class item identification expert for Ucycle, a curbside giveaway app.

## YOUR MISSION
Analyze the image and return a PRECISE 3-WORD title that identifies the item.

## TITLE RULES (CRITICAL)
- EXACTLY 3 WORDS - no more, no less!
- Format: [Adjective] [Material/Color] [Item] (e.g., "Modern Silver Fridge", "Brown Leather Chair")
- Be SPECIFIC - identify the exact item type
- STOP immediately after 3 words

## FORBIDDEN WORDS (NEVER USE):
- "Free", "Item", "Object", "Stuff", "Thing", "Unknown", "Miscellaneous", "Unidentified"

## EXCELLENT 3-WORD EXAMPLES:
- "Modern Silver Fridge"
- "Brown Leather Chair"
- "Rusty Garden Shed"
- "White Washing Machine"
- "Oak Bed Frame"
- "Pink Barbie House"
- "Copper Pipe Bundle"
- "Flattened Cardboard Boxes"

## CATEGORY
Choose ONE: furniture, electronics, appliances, sports, toys, books, clothing, garden, kitchen, tools, e-waste, scrap-metal, cardboard, general

## DESCRIPTION
Write 1-2 sentences MAX describing condition and location.

## OUTPUT FORMAT (JSON ONLY):
{"title": "Three Word Title", "category": "category-name", "description": "Brief description."}"""
        ).with_model("gemini", "gemini-2.5-flash")
        
        analysis_message = UserMessage(
            text="""Analyze this image. Return ONLY a 3-word title like "Modern Silver Fridge" or "Brown Leather Chair".
            
RULES:
- Title: EXACTLY 3 words (e.g., "Rusty Metal Shed")
- Category: One word from the list
- Description: 1-2 sentences MAX

Respond with JSON only: {"title": "...", "category": "...", "description": "..."}""",
            file_contents=[ImageContent(image_base64=request.image_base64)]
        )
        
        # Add 5-second timeout to prevent AI stall
        try:
            response = await asyncio.wait_for(
                analysis_chat.send_message(analysis_message),
                timeout=5.0
            )
            response_text = response.strip() if isinstance(response, str) else str(response).strip()
            logger.info(f"AI Raw Response: {response_text[:500]}")
        except asyncio.TimeoutError:
            logger.warning("AI analysis timed out after 5 seconds - using fallback")
            return {"title": "Curbside Item", "category": "general", "description": "Item available for pickup."}
        
        # Parse JSON from response
        if "```" in response_text:
            match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
            if match:
                response_text = match.group(1).strip()
        
        # Find JSON object in response
        json_match = re.search(r'\{[^{}]*"title"[^{}]*\}', response_text, re.DOTALL)
        if json_match:
            response_text = json_match.group(0)
        
        data = json.loads(response_text)
        
        # Extract and validate fields
        title = data.get("title", "").strip()
        category = data.get("category", "general").lower().strip()
        description = data.get("description", "").strip()
        
        # Validate category
        valid_categories = ["furniture", "electronics", "appliances", "sports", "toys", "books", 
                          "clothing", "garden", "kitchen", "tools", "e-waste", "scrap-metal", "cardboard", "general"]
        if category not in valid_categories:
            category = "general"
        
        # ENFORCE TITLE LENGTH LIMIT (max 6 words / ~50 chars)
        title_words = title.split()
        if len(title_words) > 6:
            # Take first 6 words
            title = " ".join(title_words[:6])
            logger.info(f"Title truncated to 6 words: '{title}'")
        
        # Also enforce character limit as backup
        if len(title) > 50:
            # Find a natural break point
            title = title[:50].rsplit(' ', 1)[0]
            logger.info(f"Title truncated to ~50 chars: '{title}'")
        
        # STRICT TITLE VALIDATION
        forbidden_patterns = [
            "item", "object", "stuff", "thing", "unknown", "miscellaneous", 
            "various", "assorted", "free item", "free stuff"
        ]
        title_lower = title.lower()
        
        title_is_bad = (
            not title or 
            len(title) < 5 or
            any(bad == title_lower for bad in forbidden_patterns) or
            any(bad == title_lower.replace("free ", "") for bad in forbidden_patterns) or
            title_lower in valid_categories  # Just a bare category name
        )
        
        # If title is bad, do a focused retry
        if title_is_bad:
            logger.warning(f"Bad title detected: '{title}' - retrying with focused prompt")
            
            retry_chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"retry-{generate_id()}",
                system_message="You are an expert at identifying objects. You must give SPECIFIC names, never generic words like 'item' or 'object'."
            ).with_model("gemini", "gemini-2.5-flash")
            
            retry_message = UserMessage(
                text="""I need you to identify this item with a SPECIFIC name.

RULES:
- Include the material (wood, metal, plastic, fabric)
- Include the color if visible
- Include what type of item it is specifically
- NEVER say "Item", "Object", "Thing", or "Stuff"

Examples of GOOD names:
- "Purple Travel Neck Pillow"
- "Rusty Metal Garden Shed"
- "Wooden Dining Table"
- "Blue Fabric Office Chair"
- "Stack of Cardboard Boxes"

Reply with ONLY a JSON object: {"title": "Your Specific Name Here"}""",
                file_contents=[ImageContent(image_base64=request.image_base64)]
            )
            
            retry_response = await retry_chat.send_message(retry_message)
            retry_text = retry_response.strip() if isinstance(retry_response, str) else str(retry_response).strip()
            logger.info(f"Retry response: {retry_text[:200]}")
            
            try:
                retry_match = re.search(r'\{[^{}]*"title"[^{}]*\}', retry_text)
                if retry_match:
                    retry_data = json.loads(retry_match.group(0))
                    new_title = retry_data.get("title", "").strip()
                    if new_title and len(new_title) >= 5 and new_title.lower() not in forbidden_patterns:
                        title = new_title
            except Exception as retry_err:
                logger.warning(f"Retry parsing failed: {retry_err}")
        
        # Final fallback - create a descriptive title based on category (but NEVER "Item")
        if not title or len(title) < 5 or title.lower() in forbidden_patterns or "item" in title.lower():
            category_descriptive_fallbacks = {
                "furniture": "Household Furniture Piece",
                "electronics": "Electronic Device for Pickup",
                "appliances": "Home Appliance Available",
                "sports": "Sports Equipment Bundle",
                "toys": "Kids Toy Collection",
                "books": "Books Available for Pickup",
                "clothing": "Clothing Bundle",
                "garden": "Garden Equipment",
                "kitchen": "Kitchen Supplies",
                "tools": "Tool Set Available",
                "e-waste": "Electronic Waste for Recycling",
                "scrap-metal": "Scrap Metal for Collection",
                "cardboard": "Cardboard Boxes Bundle",
                "general": "Curbside Pickup Available"
            }
            title = category_descriptive_fallbacks.get(category, "Curbside Pickup Available")
            logger.warning(f"Using fallback title: {title}")
        
        # Validate and LIMIT description length (max ~350 chars for mobile display)
        if not description or len(description) < 20:
            description = "Available for free pickup. Check the photo for condition details."
        elif len(description) > 350:
            # Truncate at sentence boundary if possible
            truncated = description[:350]
            last_period = truncated.rfind('.')
            if last_period > 200:
                description = truncated[:last_period + 1]
            else:
                description = truncated.rsplit(' ', 1)[0] + '...'
            logger.info(f"Description truncated to {len(description)} chars")
        
        logger.info(f"Final AI Analysis - Title: '{title}', Category: '{category}', Desc length: {len(description)}")
        
        return AIAnalysisResponse(
            title=title,
            category=category,
            description=description
        )
        
    except HTTPException:
        raise
    except json.JSONDecodeError as je:
        logger.error(f"JSON parsing error: {je}")
        return AIAnalysisResponse(
            title="Curbside Pickup Available",
            category="general",
            description="Item available for free pickup. Please review the photo for details."
        )
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        return AIAnalysisResponse(
            title="Curbside Pickup Available",
            category="general",
            description="Item available for free pickup. Please review the photo for details."
        )

# ============ FAST TITLE-ONLY ANALYSIS (The Sprinter) ============

@api_router.post("/analyze-image-fast", response_model=FastTitleResponse)
async def analyze_image_fast(request: FastTitleRequest):
    """
    FAST TITLE-ONLY ANALYSIS - The Sprinter
    Returns title + category in under 1 second
    Skips description for speed - that comes later in background
    """
    import json
    import re
    
    try:
        # Quick safety check
        safety_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"fast-safety-{generate_id()}",
            system_message="Content safety check. Reply SAFE or UNSAFE only."
        ).with_model("gemini", "gemini-2.5-flash")
        
        safety_response = await safety_chat.send_message(UserMessage(
            text="Is this image appropriate? Reply SAFE or UNSAFE.",
            file_contents=[ImageContent(image_base64=request.image_base64)]
        ))
        safety_text = safety_response.strip() if isinstance(safety_response, str) else str(safety_response).strip()
        
        if "UNSAFE" in safety_text.upper():
            raise HTTPException(status_code=400, detail="Image rejected - inappropriate content.")
        
        # FAST title generation - minimal prompt for speed
        fast_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"fast-title-{generate_id()}",
            system_message="""Identify items in 2-4 words. Be specific.
Good: "Rusty Metal Shed", "White Washing Machine", "Cardboard Boxes"
Bad: "Item", "Object", "Stuff", "Thing"
Reply JSON: {"title": "2-4 words", "category": "furniture/electronics/appliances/sports/toys/books/clothing/garden/kitchen/tools/e-waste/scrap-metal/cardboard/general"}"""
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await fast_chat.send_message(UserMessage(
            text="What is this? 2-4 word title + category. JSON only.",
            file_contents=[ImageContent(image_base64=request.image_base64)]
        ))
        response_text = response.strip() if isinstance(response, str) else str(response).strip()
        logger.info(f"Fast AI Response: {response_text[:200]}")
        
        # Parse JSON
        json_match = re.search(r'\{[^{}]*\}', response_text)
        if json_match:
            data = json.loads(json_match.group(0))
            title = data.get("title", "").strip()
            category = data.get("category", "general").lower().strip()
            
            # Validate
            valid_categories = ["furniture", "electronics", "appliances", "sports", "toys", "books", 
                              "clothing", "garden", "kitchen", "tools", "e-waste", "scrap-metal", "cardboard", "general"]
            if category not in valid_categories:
                category = "general"
            
            # Ensure title is not generic
            forbidden = ["item", "object", "stuff", "thing", "unknown"]
            if not title or title.lower() in forbidden or len(title) < 3:
                title = "Curbside Pickup"
            
            # Enforce 4 word limit
            words = title.split()
            if len(words) > 4:
                title = " ".join(words[:4])
            
            return FastTitleResponse(title=title, category=category)
        
        return FastTitleResponse(title="Curbside Pickup", category="general")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fast analysis error: {e}")
        return FastTitleResponse(title="Curbside Pickup", category="general")

# ============ BACKGROUND DESCRIPTION GENERATION (The Marathon) ============

@api_router.post("/posts/{post_id}/generate-description")
async def generate_description_background(post_id: str):
    """
    BACKGROUND DESCRIPTION - The Marathon
    Called after post is created to add detailed description
    Updates the post silently in the database
    """
    import json
    import re
    from fastapi import BackgroundTasks
    
    # Get the post
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # If description already exists and is good, skip
    existing_desc = post.get("description", "")
    if existing_desc and len(existing_desc) > 50:
        return {"status": "already_has_description", "description": existing_desc}
    
    try:
        # Generate detailed description
        desc_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"desc-{generate_id()}",
            system_message="""Write a brief 2-3 sentence description for a curbside giveaway item.
Include: what it is, condition, and who might want it.
Keep it under 300 characters. Be natural and helpful."""
        ).with_model("gemini", "gemini-2.5-flash")
        
        image_base64 = post.get("image_base64", "")
        title = post.get("title", "Item")
        
        response = await desc_chat.send_message(UserMessage(
            text=f"This is a '{title}'. Write a brief 2-3 sentence description. Include condition and who might want it.",
            file_contents=[ImageContent(image_base64=image_base64)] if image_base64 else []
        ))
        description = response.strip() if isinstance(response, str) else str(response).strip()
        
        # Clean up - remove any JSON formatting if present
        if description.startswith('{') or description.startswith('```'):
            try:
                json_match = re.search(r'"description"\s*:\s*"([^"]+)"', description)
                if json_match:
                    description = json_match.group(1)
            except:
                pass
        
        # Limit length
        if len(description) > 350:
            description = description[:350].rsplit('.', 1)[0] + '.'
        
        # Update the post
        await db.posts.update_one(
            {"id": post_id},
            {"$set": {"description": description}}
        )
        
        logger.info(f"Background description added for post {post_id}: {description[:100]}...")
        return {"status": "success", "description": description}
        
    except Exception as e:
        logger.error(f"Background description error for {post_id}: {e}")
        # Set a default description on error
        default_desc = "Available for free pickup. Check the photo for condition details."
        await db.posts.update_one(
            {"id": post_id},
            {"$set": {"description": default_desc}}
        )
        return {"status": "fallback", "description": default_desc}

# ============ POSTS ============

@api_router.post("/posts", response_model=PostResponse)
async def create_post(post: PostCreate):
    """Create a new post"""
    
    # Check image safety first
    safety_result = await check_image_safety(post.image_base64)
    if not safety_result["safe"]:
        raise HTTPException(
            status_code=400, 
            detail=f"⚠️ Image rejected: {safety_result['reason']}. Please only post appropriate household items."
        )
    
    # Check additional images if present
    if post.images:
        for i, img in enumerate(post.images):
            safety = await check_image_safety(img)
            if not safety["safe"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"⚠️ Image {i+2} rejected: {safety['reason']}. Please only post appropriate items."
                )
    
    now = now_utc()
    expires = now + timedelta(hours=post.expiry_hours)
    
    # Fuzz the location slightly for privacy (but keep it accurate ~50m)
    fuzzed_lat, fuzzed_lng = fuzz_location(post.latitude, post.longitude)
    
    # Build images array - primary image first, then additional images
    all_images = [post.image_base64]
    if post.images:
        all_images.extend(post.images)
    
    post_doc = {
        "id": generate_id(),
        "image_base64": post.image_base64,  # Keep for backwards compatibility
        "images": all_images,  # All images array
        "title": post.title,
        "category": post.category,
        "description": post.description,
        "latitude": fuzzed_lat,
        "longitude": fuzzed_lng,
        "original_latitude": post.latitude,
        "original_longitude": post.longitude,
        "created_at": to_iso(now),
        "expires_at": to_iso(expires),
        "status": "active",
        "report_count": 0,
        "poster_phone": post.poster_phone  # Contact for pickers
    }
    
    await db.posts.insert_one(post_doc)
    
    # Update statistics
    await update_stats("post_created", post.category)
    
    # BACKGROUND: Track item type for "Types of Scrap" reporting (no delay to user)
    # This runs after the post is created
    asyncio.create_task(track_item_type(post.title, post.category))
    
    # BACKGROUND: Auto-detect and track brands from title/description
    asyncio.create_task(auto_detect_and_track_brand(post.title, post.description, post.category))
    
    return PostResponse(
        id=post_doc["id"],
        image_base64=post_doc["image_base64"],
        images=post_doc["images"],
        title=post_doc["title"],
        category=post_doc["category"],
        description=post_doc["description"],
        latitude=post_doc["latitude"],
        longitude=post_doc["longitude"],
        created_at=post_doc["created_at"],
        expires_at=post_doc["expires_at"],
        status=post_doc["status"],
        report_count=post_doc["report_count"]
    )

@api_router.get("/posts", response_model=List[PostResponse])
async def get_posts(
    include_expired: bool = False,
    limit: int = 200,
    skip: int = 0,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: Optional[float] = None
):
    """Get posts with pagination and optional geo-filtering for performance"""
    now = now_utc()
    
    # Update expired posts (quick inline update)
    await db.posts.update_many(
        {
            "status": "active",
            "expires_at": {"$lt": to_iso(now)}
        },
        {"$set": {"status": "expired"}}
    )
    
    # Build query - include both 'active' AND 'pending' items
    # Pending items are shown so users can see their claimed items
    query = {"status": {"$in": ["active", "pending"]}} if not include_expired else {}
    
    # Projection - exclude heavy fields for list view
    projection = {
        "_id": 0, 
        "original_latitude": 0, 
        "original_longitude": 0
    }
    
    # Optimized query with sorting by newest first, with pagination
    posts = await db.posts.find(query, projection).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # If geo-filtering requested, filter by distance (client-side for simplicity)
    if lat is not None and lng is not None and radius_km is not None:
        from math import radians, sin, cos, sqrt, atan2
        def within_radius(post):
            if post.get("latitude") and post.get("longitude"):
                R = 6371  # Earth's radius in km
                lat1, lng1 = radians(lat), radians(lng)
                lat2, lng2 = radians(post["latitude"]), radians(post["longitude"])
                dlat, dlng = lat2 - lat1, lng2 - lng1
                a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
                c = 2 * atan2(sqrt(a), sqrt(1-a))
                distance = R * c
                return distance <= radius_km
            return False
        posts = [p for p in posts if within_radius(p)]
    
    # Ensure backward compatibility
    result = []
    for p in posts:
        if "images" not in p:
            p["images"] = [p["image_base64"]] if p.get("image_base64") else []
        result.append(PostResponse(**p))
    
    return result

@api_router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: str):
    """Get a single post by ID"""
    post = await db.posts.find_one({"id": post_id}, {"_id": 0, "original_latitude": 0, "original_longitude": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Ensure backward compatibility - add images array if missing
    if "images" not in post:
        post["images"] = [post["image_base64"]] if post.get("image_base64") else []
    
    return PostResponse(**post)

@api_router.get("/og/{post_id}")
async def get_og_meta(post_id: str):
    """Get Open Graph meta data for a post (for social media previews)"""
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {
        "title": f"{post.get('title', 'Free Item')} - Free on Ucycle",
        "description": f"Free pickup available! {post.get('description', 'Grab it before it is gone!')}",
        "image": post.get("image_base64", ""),
        "category": post.get("category", "general"),
        "status": post.get("status", "active"),
        "url": f"/post/{post_id}"
    }

# ============ POST IMAGE FOR SOCIAL SHARING ============
from fastapi.responses import Response, HTMLResponse

@api_router.get("/post-image/{post_id}.jpg")
async def get_post_image(post_id: str):
    """
    Serve the post image as an actual JPEG file for social media previews.
    Social crawlers (Facebook, Twitter, etc.) need a real URL to an image file.
    """
    post = await db.posts.find_one({"id": post_id}, {"_id": 0, "image_base64": 1})
    if not post or not post.get("image_base64"):
        raise HTTPException(status_code=404, detail="Post or image not found")
    
    # Decode base64 to bytes
    image_data = post["image_base64"]
    # Strip data URL prefix if present
    if "," in image_data:
        image_data = image_data.split(",")[1]
    
    try:
        image_bytes = base64.b64decode(image_data)
        return Response(
            content=image_bytes,
            media_type="image/jpeg",
            headers={
                "Cache-Control": "public, max-age=86400",  # Cache for 24 hours
                "Content-Disposition": f"inline; filename={post_id}.jpg"
            }
        )
    except Exception as e:
        logger.error(f"Failed to decode image for post {post_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to process image")


# ============ POST META PAGE FOR SOCIAL SHARING ============
# This serves HTML with proper OG tags that social media crawlers can read

@api_router.get("/post-meta/{post_id}")
async def get_post_meta_page(post_id: str):
    """
    Serve an HTML page with Open Graph meta tags for social media sharing.
    This is accessed by social media crawlers when someone shares a post link.
    The page auto-redirects human users to the actual app.
    """
    from starlette.requests import Request
    
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    title = post.get("title", "Free Item")
    description = post.get("description", "Grab it before it's gone!")[:200]
    category = post.get("category", "general")
    
    # Get the base URL from environment - use FRONTEND_URL or CORS_ORIGINS
    base_url = os.environ.get("FRONTEND_URL", os.environ.get("CORS_ORIGINS", "")).split(",")[0].strip()
    if not base_url or base_url == "*":
        # Fallback to request origin or default domain
        base_url = os.environ.get("BASE_URL", "https://ucycle.com.au")
    
    # Image URL must be absolute and publicly accessible
    image_url = f"{base_url}/api/post-image/{post_id}.jpg"
    post_url = f"{base_url}/post/{post_id}"
    
    # Generate HTML with proper OG tags
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Primary Meta Tags -->
    <title>{title} - Free on Ucycle</title>
    <meta name="title" content="{title} - Free on Ucycle">
    <meta name="description" content="Free pickup available! {description}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="{post_url}">
    <meta property="og:title" content="{title} - Free on Ucycle">
    <meta property="og:description" content="Free pickup available! {description}">
    <meta property="og:image" content="{image_url}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Ucycle">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="{post_url}">
    <meta property="twitter:title" content="{title} - Free on Ucycle">
    <meta property="twitter:description" content="Free pickup available! {description}">
    <meta property="twitter:image" content="{image_url}">
    
    <!-- Auto-redirect for human visitors (crawlers don't execute JS) -->
    <script>
        window.location.href = "{post_url}";
    </script>
    <noscript>
        <meta http-equiv="refresh" content="0;url={post_url}">
    </noscript>
    
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #166534, #22c55e);
            color: white;
            text-align: center;
            padding: 20px;
        }}
        h1 {{ margin-bottom: 10px; }}
        a {{ color: white; text-decoration: underline; }}
    </style>
</head>
<body>
    <h1>🔄 Redirecting to Ucycle...</h1>
    <p>Taking you to: <strong>{title}</strong></p>
    <p><a href="{post_url}">Click here if not redirected</a></p>
</body>
</html>"""
    
    return HTMLResponse(content=html_content, status_code=200)

@api_router.patch("/posts/{post_id}/collected")
async def mark_collected(post_id: str):
    """Mark a post as collected"""
    # Also accept pending status (for claimed items)
    result = await db.posts.update_one(
        {"id": post_id, "status": {"$in": ["active", "pending"]}},
        {"$set": {"status": "collected", "collected_at": to_iso(now_utc())}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found or already collected")
    
    # Also clear any active claims on this post
    await db.claims.update_many(
        {"post_id": post_id, "status": "active"},
        {"$set": {"status": "completed"}}
    )
    
    # Get post for stats
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if post:
        await update_stats("post_collected", post.get("category", "general"))
    
    return {"success": True, "message": "Post marked as collected"}

@api_router.post("/posts/{post_id}/complete")
async def complete_pickup(post_id: str):
    """Complete a pickup - marks post as collected and clears claim"""
    # Update post status
    result = await db.posts.update_one(
        {"id": post_id, "status": {"$in": ["active", "pending"]}},
        {"$set": {"status": "collected", "collected_at": to_iso(now_utc())}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found or already collected")
    
    # Clear any claims
    await db.claims.update_many(
        {"post_id": post_id, "status": "active"},
        {"$set": {"status": "completed"}}
    )
    
    # Update stats
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if post:
        await update_stats("post_collected", post.get("category", "general"))
    
    return {"success": True, "message": "Pickup completed"}

# ============ REPORTS ============

# Sydney region mapping based on suburbs
SYDNEY_REGIONS = {
    "penrith": ["penrith", "emu plains", "jamisontown", "south penrith", "cranebrook", "werrington", "kingswood", "cambridge park", "st marys", "oxley park", "mount druitt", "rooty hill"],
    "blacktown": ["blacktown", "seven hills", "toongabbie", "lalor park", "kings langley", "prospect", "doonside", "quakers hill", "riverstone", "schofields", "marsden park"],
    "parramatta": ["parramatta", "westmead", "harris park", "granville", "merrylands", "guildford", "auburn", "lidcombe", "homebush", "strathfield", "burwood"],
    "liverpool": ["liverpool", "casula", "prestons", "moorebank", "chipping norton", "fairfield", "cabramatta", "canley vale", "wetherill park", "smithfield"],
    "campbelltown": ["campbelltown", "ingleburn", "minto", "leumeah", "macquarie fields", "glenfield", "narellan", "camden", "harrington park"],
    "sutherland": ["sutherland", "cronulla", "miranda", "caringbah", "engadine", "menai", "bankstown", "punchbowl", "revesby", "padstow"],
    "northern_sydney": ["chatswood", "north sydney", "lane cove", "ryde", "eastwood", "macquarie park", "epping", "hornsby", "gordon", "turramurra"],
    "eastern_sydney": ["bondi", "randwick", "coogee", "maroubra", "mascot", "botany", "kensington", "kingsford"],
    "inner_west": ["marrickville", "newtown", "leichhardt", "ashfield", "canterbury", "dulwich hill", "summer hill", "concord"],
    "cbd": ["sydney", "surry hills", "darlinghurst", "potts point", "ultimo", "pyrmont", "chippendale", "redfern", "waterloo"]
}

def get_region_from_suburb(suburb: str) -> str:
    """Determine the region based on suburb name"""
    suburb_lower = suburb.lower().strip()
    for region, suburbs in SYDNEY_REGIONS.items():
        for s in suburbs:
            if s in suburb_lower or suburb_lower in s:
                return region.replace("_", " ").title()
    return "Greater Sydney"

@api_router.post("/reports")
async def create_report(report: ReportCreate):
    """Report a post - supports regular reports and illegal dumping reports"""
    # Check if post exists
    post = await db.posts.find_one({"id": report.post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Get suburb from post address
    address = post.get("address", "")
    suburb = ""
    if address:
        # Try to extract suburb from address (usually before state/postcode)
        parts = address.split(",")
        if len(parts) >= 2:
            suburb = parts[-2].strip() if len(parts) > 2 else parts[0].strip()
        else:
            suburb = address.split()[0] if address else "Unknown"
    
    region = get_region_from_suburb(suburb) if suburb else "Greater Sydney"
    
    report_doc = {
        "id": generate_id(),
        "post_id": report.post_id,
        "reason": report.reason,
        "details": report.details or "",
        "created_at": to_iso(now_utc()),
        "status": "pending",
        # Post details for context
        "post_title": post.get("title", ""),
        "post_description": post.get("description", ""),
        "post_category": post.get("category", ""),
        "latitude": post.get("latitude"),
        "longitude": post.get("longitude"),
        "address": address,
        "suburb": suburb,
        "region": region
    }
    
    # For illegal dumping, store the image reference
    if report.reason == "illegal_dumping":
        report_doc["post_image"] = post.get("image_base64", "")[:100] + "..." if post.get("image_base64") else ""
        report_doc["full_image_available"] = bool(post.get("image_base64"))
        
        # Also store in separate illegal_dumping collection grouped by region
        illegal_doc = {
            "id": report_doc["id"],
            "post_id": report.post_id,
            "post_title": post.get("title", ""),
            "post_description": post.get("description", ""),
            "post_category": post.get("category", ""),
            "latitude": post.get("latitude"),
            "longitude": post.get("longitude"),
            "address": address,
            "suburb": suburb,
            "region": region,
            "reporter_details": report.details or "",
            "created_at": to_iso(now_utc()),
            "status": "pending",
            "email_sent": False
        }
        await db.illegal_dumping_reports.insert_one(illegal_doc)
    
    await db.reports.insert_one(report_doc)
    
    # Increment report count on post
    await db.posts.update_one(
        {"id": report.post_id},
        {"$inc": {"report_count": 1}}
    )
    
    return report_doc

@api_router.get("/reports")
async def get_reports(status: Optional[str] = None, reason: Optional[str] = None):
    """Get all reports (admin)"""
    query = {}
    if status:
        query["status"] = status
    if reason:
        query["reason"] = reason
    reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return reports

@api_router.get("/admin/illegal-dumping-reports")
async def get_illegal_dumping_reports(pin: str = Query(...), region: Optional[str] = None):
    """Get illegal dumping reports grouped by region"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    query = {}
    if region:
        query["region"] = region
    
    reports = await db.illegal_dumping_reports.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Group by region
    by_region = {}
    for r in reports:
        reg = r.get("region", "Unknown")
        if reg not in by_region:
            by_region[reg] = []
        by_region[reg].append(r)
    
    return {
        "total": len(reports),
        "by_region": by_region,
        "reports": reports
    }

@api_router.get("/admin/illegal-dumping-email/{report_id}")
async def get_illegal_dumping_email_content(report_id: str, pin: str = Query(...)):
    """Generate email content for an illegal dumping report"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    report = await db.illegal_dumping_reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Get the full post with image
    post = await db.posts.find_one({"id": report["post_id"]}, {"_id": 0})
    
    # Generate email content
    email_subject = f"Illegal Dumping Report - {report.get('suburb', 'Unknown')} ({report.get('region', 'Sydney')})"
    
    email_body = f"""
ILLEGAL DUMPING REPORT
======================
Report ID: {report['id']}
Date: {report['created_at']}
Region: {report.get('region', 'Unknown')}
Suburb: {report.get('suburb', 'Unknown')}

LOCATION DETAILS
----------------
Address: {report.get('address', 'Not provided')}
Coordinates: {report.get('latitude', 'N/A')}, {report.get('longitude', 'N/A')}
Google Maps: https://www.google.com/maps?q={report.get('latitude', 0)},{report.get('longitude', 0)}

ITEM DETAILS
------------
Title: {report.get('post_title', 'Unknown')}
Category: {report.get('post_category', 'Unknown')}
Description: {report.get('post_description', 'No description')}

REPORTER NOTES
--------------
{report.get('reporter_details', 'No additional details provided')}

---
This report was generated by Ucycle
From: admin@ucycle.com.au
"""
    
    return {
        "subject": email_subject,
        "body": email_body,
        "from_email": "admin@ucycle.com.au",
        "report": report,
        "has_image": bool(post and post.get("image_base64")),
        "image_url": f"/api/post-image/{report['post_id']}.jpg" if post and post.get("image_base64") else None
    }

# ============ ADMIN ============

@api_router.post("/admin/verify")
async def verify_admin(data: AdminVerify):
    """Verify admin PIN"""
    if data.pin == ADMIN_PIN:
        return {"verified": True}
    raise HTTPException(status_code=401, detail="Invalid PIN")

@api_router.delete("/admin/posts/{post_id}")
async def admin_delete_post(post_id: str, pin: str = Query(...)):
    """Admin: Remove a post"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    result = await db.posts.update_one(
        {"id": post_id},
        {"$set": {"status": "removed"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"message": "Post removed"}

@api_router.patch("/admin/reports/{report_id}/reviewed")
async def mark_report_reviewed(report_id: str, pin: str = Query(...)):
    """Admin: Mark report as reviewed"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    result = await db.reports.update_one(
        {"id": report_id},
        {"$set": {"status": "reviewed"}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return {"message": "Report marked as reviewed"}

@api_router.get("/admin/stats", response_model=StatsResponse)
async def get_stats(pin: str = Query(...)):
    """Admin: Get statistics"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    # Update expired posts first
    now = now_utc()
    await db.posts.update_many(
        {
            "status": "active",
            "expires_at": {"$lt": to_iso(now)}
        },
        {"$set": {"status": "expired"}}
    )
    
    # Count posts by status
    total_posts = await db.posts.count_documents({})
    active_posts = await db.posts.count_documents({"status": "active"})
    collected_posts = await db.posts.count_documents({"status": "collected"})
    expired_posts = await db.posts.count_documents({"status": "expired"})
    removed_posts = await db.posts.count_documents({"status": "removed"})
    
    # Count pending reports
    pending_reports = await db.reports.count_documents({"status": "pending"})
    
    # Get category distribution
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    categories_cursor = db.posts.aggregate(pipeline)
    categories = {}
    async for doc in categories_cursor:
        categories[doc["_id"]] = doc["count"]
    
    return StatsResponse(
        total_posts=total_posts,
        active_posts=active_posts,
        collected_posts=collected_posts,
        expired_posts=expired_posts,
        removed_posts=removed_posts,
        pending_reports=pending_reports,
        categories=categories
    )

@api_router.get("/admin/posts", response_model=List[PostResponse])
async def admin_get_all_posts(pin: str = Query(...)):
    """Admin: Get all posts including inactive"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    posts = await db.posts.find({}, {"_id": 0, "original_latitude": 0, "original_longitude": 0}).to_list(1000)
    return [PostResponse(**p) for p in posts]

# ============ ADMIN BRAND/COMPANY TRACKING ============

@api_router.get("/admin/brands")
async def admin_get_brands(pin: str = Query(...)):
    """Get all tracked brands (admin)"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    brands = await db.brands.find({}, {"_id": 0}).sort("scan_count", -1).to_list(1000)
    return brands

@api_router.post("/admin/brands")
async def admin_create_brand(brand: BrandCreate, pin: str = Query(...)):
    """Add a new brand to track (admin)"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    brand_doc = {
        "id": generate_id(),
        "name": brand.name,
        "category": brand.category,
        "notes": brand.notes or "",
        "scan_count": 0,
        "last_scanned": None,
        "created_at": to_iso(now_utc())
    }
    
    await db.brands.insert_one(brand_doc)
    del brand_doc["_id"]
    return brand_doc

@api_router.put("/admin/brands/{brand_id}")
async def admin_update_brand(brand_id: str, brand: BrandCreate, pin: str = Query(...)):
    """Update a brand (admin)"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    result = await db.brands.update_one(
        {"id": brand_id},
        {"$set": {
            "name": brand.name,
            "category": brand.category,
            "notes": brand.notes or ""
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    return {"status": "updated"}

@api_router.delete("/admin/brands/{brand_id}")
async def admin_delete_brand(brand_id: str, pin: str = Query(...)):
    """Delete a brand (admin)"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    result = await db.brands.delete_one({"id": brand_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    return {"status": "deleted"}

@api_router.post("/admin/brands/{brand_id}/increment")
async def admin_increment_brand_scan(brand_id: str, pin: str = Query(...)):
    """Increment scan count for a brand (admin)"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    result = await db.brands.update_one(
        {"id": brand_id},
        {
            "$inc": {"scan_count": 1},
            "$set": {"last_scanned": to_iso(now_utc())}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    return {"status": "incremented"}

@api_router.get("/admin/brand-stats")
async def admin_get_brand_stats(pin: str = Query(...)):
    """Get brand statistics for presentation (admin)"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    # Get total brands
    total_brands = await db.brands.count_documents({})
    
    # Get brands by category
    pipeline = [
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1},
            "total_scans": {"$sum": "$scan_count"}
        }},
        {"$sort": {"total_scans": -1}}
    ]
    by_category = await db.brands.aggregate(pipeline).to_list(100)
    
    # Get top scanned brands
    top_brands = await db.brands.find({}, {"_id": 0}).sort("scan_count", -1).limit(10).to_list(10)
    
    return {
        "total_brands": total_brands,
        "by_category": by_category,
        "top_brands": top_brands
    }

# ============ AUTO BRAND DETECTION ============

# Common brand keywords to auto-detect from titles/descriptions
KNOWN_BRANDS = [
    # Appliances
    "samsung", "lg", "whirlpool", "bosch", "miele", "electrolux", "westinghouse", "fisher paykel", 
    "fisher & paykel", "haier", "panasonic", "hitachi", "sharp", "breville", "sunbeam", "delonghi",
    "dyson", "hoover", "bissell", "karcher", "philips", "braun", "tefal", "kitchenaid", "smeg",
    # Electronics
    "apple", "sony", "microsoft", "hp", "dell", "lenovo", "asus", "acer", "toshiba", "canon",
    "nikon", "gopro", "bose", "jbl", "nintendo", "playstation", "xbox", "logitech", "razer",
    # Furniture
    "ikea", "freedom", "fantastic", "amart", "focus on furniture", "oz design", "king living",
    "nick scali", "harvey norman", "officeworks", "bunnings",
    # Tools
    "makita", "dewalt", "bosch", "milwaukee", "ryobi", "ozito", "stanley", "craftsman", "black decker",
    "black & decker", "stihl", "husqvarna",
    # Outdoor/Garden
    "weber", "masport", "victa", "rover", "toro", "coleman", "oztrail",
    # Baby/Kids
    "fisher price", "little tikes", "step2", "baby jogger", "bugaboo", "uppababy", "chicco",
    # Sports
    "nike", "adidas", "reebok", "puma", "under armour", "spalding", "wilson"
]

async def auto_detect_and_track_brand(title: str, description: str, category: str):
    """Automatically detect brand names from post title/description and track them"""
    text_to_search = f"{title} {description}".lower()
    
    for brand_name in KNOWN_BRANDS:
        if brand_name in text_to_search:
            # Check if brand exists in our database
            existing = await db.brands.find_one({"name": {"$regex": f"^{brand_name}$", "$options": "i"}})
            
            if existing:
                # Increment scan count
                await db.brands.update_one(
                    {"id": existing["id"]},
                    {
                        "$inc": {"scan_count": 1},
                        "$set": {"last_scanned": to_iso(now_utc())}
                    }
                )
            else:
                # Auto-create the brand
                brand_doc = {
                    "id": generate_id(),
                    "name": brand_name.title(),  # Capitalize properly
                    "category": category,
                    "notes": "Auto-detected from post",
                    "scan_count": 1,
                    "last_scanned": to_iso(now_utc()),
                    "created_at": to_iso(now_utc()),
                    "auto_detected": True
                }
                await db.brands.insert_one(brand_doc)
            
            # Log the detection
            logger.info(f"Auto-detected brand: {brand_name} in category {category}")
            break  # Only track first brand found

# ============ ANALYTICS ENDPOINTS ============

@api_router.get("/admin/analytics")
async def get_analytics(pin: str = Query(...), days: int = 30):
    """Get comprehensive analytics data for admin dashboard"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    now = now_utc()
    start_date = now - timedelta(days=days)
    
    # Posts over time
    posts_pipeline = [
        {"$match": {"created_at": {"$gte": to_iso(start_date)}}},
        {"$addFields": {"date": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    posts_by_date = await db.posts.aggregate(posts_pipeline).to_list(100)
    
    # Category distribution
    category_pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    categories = await db.posts.aggregate(category_pipeline).to_list(100)
    
    # Status distribution
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    statuses = await db.posts.aggregate(status_pipeline).to_list(10)
    
    # Reports by reason
    reports_pipeline = [
        {"$group": {"_id": "$reason", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    reports_by_reason = await db.reports.aggregate(reports_pipeline).to_list(20)
    
    # Reports by region (for illegal dumping)
    region_pipeline = [
        {"$match": {"reason": "illegal_dumping"}},
        {"$group": {"_id": "$region", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    reports_by_region = await db.reports.aggregate(region_pipeline).to_list(20)
    
    # Top brands
    top_brands = await db.brands.find({}, {"_id": 0, "name": 1, "scan_count": 1, "category": 1}).sort("scan_count", -1).limit(10).to_list(10)
    
    # Partner clicks over time
    partner_pipeline = [
        {"$match": {"created_at": {"$gte": to_iso(start_date)}}},
        {"$group": {"_id": "$partner_id", "clicks": {"$sum": 1}}},
        {"$sort": {"clicks": -1}}
    ]
    partner_clicks = await db.partner_clicks.aggregate(partner_pipeline).to_list(20)
    
    # Calculate conversion rate (collected / total active+collected)
    total = await db.posts.count_documents({})
    collected = await db.posts.count_documents({"status": "collected"})
    conversion_rate = (collected / total * 100) if total > 0 else 0
    
    # Average posts per day
    avg_posts_per_day = len(posts_by_date) > 0 and sum(p["count"] for p in posts_by_date) / len(posts_by_date) or 0
    
    return {
        "period_days": days,
        "posts_by_date": posts_by_date,
        "categories": categories,
        "statuses": statuses,
        "reports_by_reason": reports_by_reason,
        "reports_by_region": reports_by_region,
        "top_brands": top_brands,
        "partner_clicks": partner_clicks,
        "metrics": {
            "conversion_rate": round(conversion_rate, 1),
            "avg_posts_per_day": round(avg_posts_per_day, 1),
            "total_posts": total,
            "total_collected": collected
        }
    }

# ============ STATS HELPER ============

async def update_stats(event: str, category: str):
    """Update internal statistics"""
    now = now_utc()
    date_key = now.strftime("%Y-%m-%d")
    
    await db.stats.update_one(
        {"date": date_key},
        {
            "$inc": {
                f"events.{event}": 1,
                f"categories.{category}": 1
            },
            "$setOnInsert": {"date": date_key}
        },
        upsert=True
    )

# ============ BACKGROUND ITEM TYPE TRACKING ============
# Runs AFTER post is created - no delay to user

async def track_item_type(title: str, category: str):
    """Track item type for 'Types of Scrap' reporting - runs in background"""
    try:
        now = now_utc()
        
        # Extract potential brand from title (common brand patterns)
        brand = None
        common_brands = [
            "Samsung", "LG", "Sony", "Panasonic", "Philips", "Bosch", "Miele",
            "Fisher-Price", "IKEA", "Kmart", "Target", "Big W", "Bunnings",
            "Dyson", "Breville", "Sunbeam", "Kenwood", "DeLonghi", "Smeg",
            "Westinghouse", "Electrolux", "Whirlpool", "Haier", "Hisense",
            "Nintendo", "PlayStation", "Xbox", "Apple", "Dell", "HP", "Lenovo"
        ]
        title_lower = title.lower()
        for b in common_brands:
            if b.lower() in title_lower:
                brand = b
                break
        
        # Normalize title for grouping (remove numbers, special chars)
        normalized_title = re.sub(r'[0-9\-\.\,\(\)]', '', title).strip()
        normalized_title = ' '.join(normalized_title.split())  # Clean whitespace
        
        # Update or create item type record
        await db.item_types.update_one(
            {
                "category": category,
                "normalized_title": normalized_title.lower()
            },
            {
                "$inc": {"count": 1},
                "$set": {
                    "original_title": title,
                    "category": category,
                    "brand": brand,
                    "last_posted": to_iso(now)
                },
                "$setOnInsert": {
                    "first_posted": to_iso(now),
                    "normalized_title": normalized_title.lower()
                }
            },
            upsert=True
        )
        
        # Also track by category totals
        await db.category_stats.update_one(
            {"category": category},
            {
                "$inc": {"total_posts": 1},
                "$set": {"last_posted": to_iso(now)},
                "$setOnInsert": {"category": category, "first_posted": to_iso(now)}
            },
            upsert=True
        )
        
        logger.info(f"Tracked item type: {title} ({category}) - brand: {brand}")
    except Exception as e:
        logger.error(f"Item type tracking error: {e}")

# ============ ADMIN ITEM TYPES ENDPOINTS ============

@api_router.get("/admin/item-types")
async def admin_get_item_types(pin: str = Query(...), category: str = None):
    """Get all tracked item types for 'Types of Scrap' reporting"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    query = {}
    if category:
        query["category"] = category
    
    items = await db.item_types.find(query, {"_id": 0}).sort("count", -1).to_list(500)
    return items

@api_router.get("/admin/category-stats")
async def admin_get_category_stats(pin: str = Query(...)):
    """Get category statistics for reporting"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    stats = await db.category_stats.find({}, {"_id": 0}).sort("total_posts", -1).to_list(50)
    return stats

@api_router.get("/admin/item-types-summary")
async def admin_get_item_types_summary(pin: str = Query(...)):
    """Get summary of item types for dashboard"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    # Total unique item types
    total_types = await db.item_types.count_documents({})
    
    # Items with brands detected
    with_brands = await db.item_types.count_documents({"brand": {"$ne": None}})
    
    # Top categories
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": "$count"}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_categories = await db.item_types.aggregate(pipeline).to_list(10)
    
    # Top brands
    brand_pipeline = [
        {"$match": {"brand": {"$ne": None}}},
        {"$group": {"_id": "$brand", "count": {"$sum": "$count"}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_brands = await db.item_types.aggregate(brand_pipeline).to_list(10)
    
    return {
        "total_types": total_types,
        "with_brands": with_brands,
        "top_categories": top_categories,
        "top_brands": top_brands
    }

# ============ PARTNER TRACKING ============

@api_router.post("/track-partner-click")
async def track_partner_click(partner_id: str, partner_name: str, post_id: str = None, category: str = None):
    """Track when user clicks to go to partner (e.g., Norman's Scrap Yard)"""
    try:
        now = now_utc()
        
        # Record the click
        click_doc = {
            "id": generate_id(),
            "partner_id": partner_id,
            "partner_name": partner_name,
            "post_id": post_id,
            "category": category,
            "clicked_at": to_iso(now)
        }
        await db.partner_clicks.insert_one(click_doc)
        
        # Update partner stats
        await db.partner_stats.update_one(
            {"partner_id": partner_id},
            {
                "$inc": {"total_clicks": 1},
                "$set": {
                    "partner_name": partner_name,
                    "last_click": to_iso(now)
                },
                "$setOnInsert": {
                    "partner_id": partner_id,
                    "first_click": to_iso(now)
                }
            },
            upsert=True
        )
        
        logger.info(f"Partner click tracked: {partner_name} (post: {post_id})")
        return {"status": "tracked"}
    except Exception as e:
        logger.error(f"Partner tracking error: {e}")
        return {"status": "error"}

@api_router.get("/admin/partners")
async def admin_get_partners(pin: str = Query(...)):
    """Get all partner statistics"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    partners = await db.partner_stats.find({}, {"_id": 0}).sort("total_clicks", -1).to_list(100)
    return partners

@api_router.get("/admin/partner-clicks")
async def admin_get_partner_clicks(pin: str = Query(...), partner_id: str = None, limit: int = 100):
    """Get partner click history"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    query = {}
    if partner_id:
        query["partner_id"] = partner_id
    
    clicks = await db.partner_clicks.find(query, {"_id": 0}).sort("clicked_at", -1).limit(limit).to_list(limit)
    return clicks

@api_router.get("/admin/partner-summary")
async def admin_get_partner_summary(pin: str = Query(...)):
    """Get partner summary for dashboard"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    # Total clicks
    total_clicks = await db.partner_clicks.count_documents({})
    
    # Clicks by partner
    pipeline = [
        {"$group": {
            "_id": "$partner_name",
            "clicks": {"$sum": 1},
            "last_click": {"$max": "$clicked_at"}
        }},
        {"$sort": {"clicks": -1}}
    ]
    by_partner = await db.partner_clicks.aggregate(pipeline).to_list(50)
    
    # Clicks by category
    cat_pipeline = [
        {"$match": {"category": {"$ne": None}}},
        {"$group": {"_id": "$category", "clicks": {"$sum": 1}}},
        {"$sort": {"clicks": -1}}
    ]
    by_category = await db.partner_clicks.aggregate(cat_pipeline).to_list(20)
    
    # Recent clicks
    recent = await db.partner_clicks.find({}, {"_id": 0}).sort("clicked_at", -1).limit(10).to_list(10)
    
    return {
        "total_clicks": total_clicks,
        "by_partner": by_partner,
        "by_category": by_category,
        "recent_clicks": recent
    }

# ============ ADMIN DATA EXPORT ============

from fastapi.responses import StreamingResponse
import io
import csv

@api_router.get("/admin/export/item-types")
async def admin_export_item_types(pin: str = Query(...)):
    """Export item types data as CSV"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    items = await db.item_types.find({}, {"_id": 0}).sort("count", -1).to_list(5000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Title", "Category", "Brand", "Count", "First Posted", "Last Posted"])
    
    for item in items:
        writer.writerow([
            item.get("original_title", ""),
            item.get("category", ""),
            item.get("brand", ""),
            item.get("count", 0),
            item.get("first_posted", ""),
            item.get("last_posted", "")
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ucycle_item_types.csv"}
    )

@api_router.get("/admin/export/partner-clicks")
async def admin_export_partner_clicks(pin: str = Query(...)):
    """Export partner clicks data as CSV"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    clicks = await db.partner_clicks.find({}, {"_id": 0}).sort("clicked_at", -1).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Partner Name", "Partner ID", "Category", "Post ID", "Clicked At"])
    
    for click in clicks:
        writer.writerow([
            click.get("partner_name", ""),
            click.get("partner_id", ""),
            click.get("category", ""),
            click.get("post_id", ""),
            click.get("clicked_at", "")
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ucycle_partner_clicks.csv"}
    )

@api_router.get("/admin/export/brands")
async def admin_export_brands(pin: str = Query(...)):
    """Export brands data as CSV"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    brands = await db.brands.find({}, {"_id": 0}).sort("scan_count", -1).to_list(1000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Brand Name", "Category", "Scan Count", "Notes", "Last Scanned", "Created At"])
    
    for brand in brands:
        writer.writerow([
            brand.get("name", ""),
            brand.get("category", ""),
            brand.get("scan_count", 0),
            brand.get("notes", ""),
            brand.get("last_scanned", ""),
            brand.get("created_at", "")
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ucycle_brands.csv"}
    )

@api_router.get("/admin/export/posts")
async def admin_export_posts(pin: str = Query(...)):
    """Export all posts data as CSV"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    posts = await db.posts.find({}, {"_id": 0, "image_base64": 0, "images": 0}).sort("created_at", -1).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Category", "Description", "Status", "Latitude", "Longitude", "Created At", "Expires At"])
    
    for post in posts:
        coords = post.get("location", {}).get("coordinates", [0, 0])
        writer.writerow([
            post.get("id", ""),
            post.get("title", ""),
            post.get("category", ""),
            post.get("description", "")[:200],  # Truncate long descriptions
            post.get("status", ""),
            coords[1] if len(coords) > 1 else "",  # lat
            coords[0] if len(coords) > 0 else "",  # lng
            post.get("created_at", ""),
            post.get("expires_at", "")
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ucycle_posts.csv"}
    )

@api_router.get("/admin/export/all")
async def admin_export_all(pin: str = Query(...)):
    """Export all data as a single CSV bundle (JSON format for complex data)"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    import json
    
    # Gather all data
    data = {
        "exported_at": to_iso(now_utc()),
        "item_types": await db.item_types.find({}, {"_id": 0}).to_list(5000),
        "partner_clicks": await db.partner_clicks.find({}, {"_id": 0}).to_list(10000),
        "brands": await db.brands.find({}, {"_id": 0}).to_list(1000),
        "category_stats": await db.category_stats.find({}, {"_id": 0}).to_list(50),
        "partner_stats": await db.partner_stats.find({}, {"_id": 0}).to_list(100)
    }
    
    output = json.dumps(data, indent=2)
    
    return StreamingResponse(
        iter([output]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=ucycle_full_export.json"}
    )

# ============ INTERACTION LOGGING ============

@api_router.post("/log-interaction")
async def log_interaction(interaction: InteractionLog):
    """Log user interactions for analytics"""
    interaction_doc = {
        "id": generate_id(),
        "post_id": interaction.post_id,
        "interaction_type": interaction.interaction_type,
        "created_at": to_iso(now_utc())
    }
    await db.interactions.insert_one(interaction_doc)
    
    # Update aggregated stats
    await db.interaction_stats.update_one(
        {"type": interaction.interaction_type},
        {"$inc": {"count": 1}, "$set": {"last_at": to_iso(now_utc())}},
        upsert=True
    )
    
    return {"success": True}

# ============ CLAIMING SYSTEM (60-min handshake) ============

@api_router.post("/claims")
async def create_claim(claim: ClaimCreate):
    """Create a claim on a post - starts 30-minute timer"""
    # Check if post exists and is active
    post = await db.posts.find_one({"id": claim.post_id, "status": "active"}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found or not available")
    
    # Check if there's already an active claim on this post
    existing_claim = await db.claims.find_one({
        "post_id": claim.post_id,
        "status": "active",
        "expires_at": {"$gt": to_iso(now_utc())}
    })
    if existing_claim:
        raise HTTPException(status_code=409, detail="Item already has an active claim")
    
    # Create claim with 30-minute expiry (CHANGED FROM 60)
    expires_at = now_utc() + timedelta(minutes=30)
    claim_doc = {
        "id": generate_id(),
        "post_id": claim.post_id,
        "status": "active",
        "created_at": to_iso(now_utc()),
        "expires_at": to_iso(expires_at)
    }
    await db.claims.insert_one(claim_doc)
    
    # Update post status to pending
    await db.posts.update_one(
        {"id": claim.post_id},
        {"$set": {"status": "pending", "claim_id": claim_doc["id"]}}
    )
    
    # Log the claim intent interaction
    await db.interactions.insert_one({
        "id": generate_id(),
        "post_id": claim.post_id,
        "interaction_type": "claim_intent",
        "created_at": to_iso(now_utc())
    })
    await db.interaction_stats.update_one(
        {"type": "claim_intent"},
        {"$inc": {"count": 1}, "$set": {"last_at": to_iso(now_utc())}},
        upsert=True
    )
    
    # Calculate minutes remaining
    minutes_remaining = 30
    
    return {
        "claim_id": claim_doc["id"],
        "post_id": claim.post_id,
        "status": "active",
        "created_at": claim_doc["created_at"],
        "expires_at": claim_doc["expires_at"],
        "minutes_remaining": minutes_remaining,
        "poster_phone": post.get("poster_phone")  # Reveal phone on active claim
    }

@api_router.get("/claims/{post_id}")
async def get_claim_status(post_id: str):
    """Get claim status for a post"""
    claim = await db.claims.find_one(
        {"post_id": post_id, "status": "active"},
        {"_id": 0}
    )
    
    if not claim:
        return {"status": "available", "claim_id": None}
    
    # Check if expired
    expires_at = from_iso(claim["expires_at"])
    if now_utc() > expires_at:
        # Expire the claim
        await db.claims.update_one(
            {"id": claim["id"]},
            {"$set": {"status": "expired"}}
        )
        await db.posts.update_one(
            {"id": post_id},
            {"$set": {"status": "active"}, "$unset": {"claim_id": ""}}
        )
        return {"status": "available", "claim_id": None}
    
    # Calculate remaining time
    remaining = expires_at - now_utc()
    minutes_remaining = max(0, int(remaining.total_seconds() / 60))
    
    return {
        "claim_id": claim["id"],
        "post_id": post_id,
        "status": "active",
        "created_at": claim["created_at"],
        "expires_at": claim["expires_at"],
        "minutes_remaining": minutes_remaining
    }

@api_router.delete("/claims/{claim_id}")
async def release_claim(claim_id: str):
    """Release/cancel a claim"""
    claim = await db.claims.find_one({"id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Update claim status
    await db.claims.update_one(
        {"id": claim_id},
        {"$set": {"status": "released"}}
    )
    
    # Reset post status to active
    await db.posts.update_one(
        {"id": claim["post_id"]},
        {"$set": {"status": "active"}, "$unset": {"claim_id": ""}}
    )
    
    return {"success": True}

# ============ ADMIN DASHBOARD (Full Data) ============

@api_router.get("/admin/dashboard-full")
async def admin_dashboard_full(pin: str = Query(...)):
    """Get full dashboard data for admin HQ"""
    if pin != ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin PIN")
    
    # Get interaction stats
    direction_clicks = await db.interaction_stats.find_one({"type": "direction_click"}, {"_id": 0})
    contact_reveals = await db.interaction_stats.find_one({"type": "contact_reveal"}, {"_id": 0})
    claim_intents = await db.interaction_stats.find_one({"type": "claim_intent"}, {"_id": 0})
    
    # Get recent reports
    reports = await db.reports.find(
        {},
        {"_id": 0, "id": 1, "post_id": 1, "reason": 1, "created_at": 1, "status": 1}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Get active claims
    active_claims = await db.claims.count_documents({"status": "active"})
    
    # Get post stats
    total_posts = await db.posts.count_documents({})
    active_posts = await db.posts.count_documents({"status": "active"})
    pending_posts = await db.posts.count_documents({"status": "pending"})
    collected_posts = await db.posts.count_documents({"status": "collected"})
    
    return {
        "stats": {
            "direction_clicks": direction_clicks.get("count", 0) if direction_clicks else 0,
            "contact_reveals": contact_reveals.get("count", 0) if contact_reveals else 0,
            "claim_intents": claim_intents.get("count", 0) if claim_intents else 0,
            "active_claims": active_claims,
            "total_posts": total_posts,
            "active_posts": active_posts,
            "pending_posts": pending_posts,
            "collected_posts": collected_posts
        },
        "reports": [
            {
                "id": r["id"],
                "post_id": r["post_id"],
                "reason": r["reason"],
                "timestamp": r["created_at"],
                "status": r.get("status", "pending")
            }
            for r in reports
        ]
    }

# ============ HEALTH CHECK ============

@api_router.get("/")
async def root():
    return {"message": "Ucycle API is running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": to_iso(now_utc())}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ DATABASE INDEXES FOR PERFORMANCE ============
@app.on_event("startup")
async def create_indexes():
    """Create database indexes for optimized queries"""
    try:
        # Posts collection indexes
        await db.posts.create_index("id", unique=True)
        await db.posts.create_index("status")
        await db.posts.create_index("created_at")
        await db.posts.create_index("expires_at")
        await db.posts.create_index("category")
        await db.posts.create_index([("status", 1), ("created_at", -1)])  # Compound index for main query
        await db.posts.create_index([("latitude", 1), ("longitude", 1)])  # Geo queries
        
        # Reports collection indexes
        await db.reports.create_index("post_id")
        await db.reports.create_index("status")
        await db.reports.create_index("reason")
        await db.reports.create_index("created_at")
        
        # Brands collection indexes
        await db.brands.create_index("id", unique=True)
        await db.brands.create_index("name")
        await db.brands.create_index("scan_count")
        
        # Item types collection indexes
        await db.item_types.create_index([("category", 1), ("normalized_title", 1)])
        await db.item_types.create_index("count")
        
        # Partner clicks indexes
        await db.partner_clicks.create_index("partner_id")
        await db.partner_clicks.create_index("created_at")
        
        # Interactions collection indexes
        await db.interactions.create_index("post_id")
        await db.interactions.create_index("interaction_type")
        await db.interactions.create_index("created_at")
        
        # Claims collection indexes
        await db.claims.create_index("id", unique=True)
        await db.claims.create_index("post_id")
        await db.claims.create_index("status")
        await db.claims.create_index([("post_id", 1), ("status", 1)])
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.warning(f"Error creating indexes (may already exist): {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
