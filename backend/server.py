from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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
    description: str
    expiry_hours: int = 48
    latitude: float
    longitude: float

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
    status: str  # "active", "collected", "expired", "removed"
    report_count: int = 0

class AIAnalysisRequest(BaseModel):
    image_base64: str

class AIAnalysisResponse(BaseModel):
    title: str
    category: str
    description: str

class ReportCreate(BaseModel):
    post_id: str
    reason: str  # "item_gone", "incorrect_location", "unsafe", "spam"

class ReportResponse(BaseModel):
    id: str
    post_id: str
    reason: str
    created_at: str
    status: str  # "pending", "reviewed"

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
        
        response = chat.send_message(user_message)
        response_text = response.content.strip()
        
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
    """High-quality AI image analysis - let the AI think naturally"""
    import json
    import re
    
    try:
        # First, check for inappropriate content (Safety Guard)
        safety_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"safety-{generate_id()}",
            system_message="You are a content safety checker. Analyze images for prohibited content."
        ).with_model("gemini", "gemini-2.5-flash")
        
        safety_check = UserMessage(
            text="Does this image contain any of the following: nudity, sexual content, weapons, drugs, violence, or illegal activity? Reply with ONLY 'SAFE' or 'UNSAFE'.",
            file_contents=[ImageContent(image_base64=request.image_base64)]
        )
        
        safety_response = safety_chat.send_message(safety_check)
        safety_text = safety_response.content.strip() if hasattr(safety_response, 'content') else str(safety_response).strip()
        
        if "UNSAFE" in safety_text.upper():
            raise HTTPException(status_code=400, detail="Upload rejected: Inappropriate content detected.")
        
        # Main analysis - natural, high-quality prompt
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analyze-{generate_id()}",
            system_message="""You are a helpful assistant that identifies items in photos for a free stuff giveaway app.

When you see an image, provide:
1. A specific, descriptive Title for the item (be precise - what exactly is it?)
2. A Category from: furniture, electronics, appliances, sports, toys, books, clothing, garden, kitchen, tools, e-waste, scrap-metal, cardboard, general
3. A helpful Description of the item's condition and any notable features

Respond in JSON format:
{"title": "...", "category": "...", "description": "..."}"""
        ).with_model("gemini", "gemini-2.5-flash")

        image_content = ImageContent(image_base64=request.image_base64)
        
        user_message = UserMessage(
            text="Analyze this image. What item is this? Provide a natural Title and a helpful Description.",
            file_contents=[image_content]
        )
        
        response = chat.send_message(user_message)
        logger.info(f"AI Response: {response}")
        
        # Parse JSON from response
        response_text = response.content.strip() if hasattr(response, 'content') else str(response).strip()
        
        # Remove markdown code blocks if present
        if "```" in response_text:
            match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
            if match:
                response_text = match.group(1).strip()
        
        # Try to find JSON object in response
        json_match = re.search(r'\{[^{}]*\}', response_text)
        if json_match:
            response_text = json_match.group(0)
        
        data = json.loads(response_text)
        
        # Validate category
        valid_categories = ["furniture", "electronics", "appliances", "sports", "toys", "books", 
                          "clothing", "garden", "kitchen", "tools", "e-waste", "scrap-metal", "cardboard", "general"]
        category = data.get("category", "general").lower()
        if category not in valid_categories:
            category = "general"
        
        return AIAnalysisResponse(
            title=data.get("title", "Free Item"),
            category=category,
            description=data.get("description", "Available for pickup")
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        return AIAnalysisResponse(
            title="Free Item",
            category="general",
            description="Please add your own description"
        )

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
        "report_count": 0
    }
    
    await db.posts.insert_one(post_doc)
    
    # Update statistics
    await update_stats("post_created", post.category)
    
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
async def get_posts(include_expired: bool = False):
    """Get all active posts (auto-expire check)"""
    now = now_utc()
    
    # First, update expired posts
    await db.posts.update_many(
        {
            "status": "active",
            "expires_at": {"$lt": to_iso(now)}
        },
        {"$set": {"status": "expired"}}
    )
    
    # Query for active posts
    query = {"status": "active"} if not include_expired else {}
    posts = await db.posts.find(query, {"_id": 0, "original_latitude": 0, "original_longitude": 0}).to_list(1000)
    
    # Ensure backward compatibility - add images array if missing
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
    
    # Create data URL for image (first 500 chars for preview)
    image_preview = f"data:image/jpeg;base64,{post.get('image_base64', '')[:500]}..."
    
    return {
        "title": f"{post.get('title', 'Free Item')} - Free on Ucycle",
        "description": f"Free pickup available! {post.get('description', 'Grab it before it is gone!')}",
        "image": post.get("image_base64", ""),
        "category": post.get("category", "general"),
        "status": post.get("status", "active"),
        "url": f"/post/{post_id}"
    }

@api_router.patch("/posts/{post_id}/collected")
async def mark_collected(post_id: str):
    """Mark a post as collected"""
    result = await db.posts.update_one(
        {"id": post_id, "status": "active"},
        {"$set": {"status": "collected", "collected_at": to_iso(now_utc())}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found or already collected")
    
    # Get post for stats
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if post:
        await update_stats("post_collected", post.get("category", "general"))
    
    return {"message": "Post marked as collected"}

# ============ REPORTS ============

@api_router.post("/reports", response_model=ReportResponse)
async def create_report(report: ReportCreate):
    """Report a post"""
    # Check if post exists
    post = await db.posts.find_one({"id": report.post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    report_doc = {
        "id": generate_id(),
        "post_id": report.post_id,
        "reason": report.reason,
        "created_at": to_iso(now_utc()),
        "status": "pending"
    }
    
    await db.reports.insert_one(report_doc)
    
    # Increment report count on post
    await db.posts.update_one(
        {"id": report.post_id},
        {"$inc": {"report_count": 1}}
    )
    
    return ReportResponse(**report_doc)

@api_router.get("/reports", response_model=List[ReportResponse])
async def get_reports(status: Optional[str] = None):
    """Get all reports (admin)"""
    query = {"status": status} if status else {}
    reports = await db.reports.find(query, {"_id": 0}).to_list(1000)
    return [ReportResponse(**r) for r in reports]

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
