# Ucycle - Product Requirements Document

## Original Problem Statement
Build a web-based, mobile-first MVP app called "Ucycle" - a public live-map utility that lets anyone post unwanted bulky or recyclable items so nearby people can discover and collect them quickly.

## Architecture
- **Frontend**: React with Leaflet/OpenStreetMap, Tailwind CSS, Shadcn UI components
- **Backend**: FastAPI (Python) with MongoDB
- **AI Integration**: Gemini 2.0 Flash via Emergent LLM key for image analysis
- **Map**: Leaflet with CartoDB Positron tiles

## User Personas
1. **Giver**: Person wanting to give away unwanted items quickly without hassle
2. **Collector**: Person looking for free items in their area
3. **Admin**: Platform moderator managing reports and content

## Core Requirements (Static)
- No user accounts/login/signup
- No payments or transactions
- No in-app messaging
- Map-first, photo-first interface
- Approximate location only (privacy)
- Auto-expiry system (24/48/72 hours)

## What's Been Implemented (Jan 28, 2026)

### Backend APIs
- `POST /api/analyze-image` - AI image analysis with Gemini
- `POST /api/posts` - Create new post
- `GET /api/posts` - Get all active posts
- `GET /api/posts/{id}` - Get single post
- `PATCH /api/posts/{id}/collected` - Mark as collected
- `POST /api/reports` - Report a post
- `POST /api/admin/verify` - Admin PIN verification
- `GET /api/admin/stats` - Admin statistics
- `GET /api/admin/posts` - Admin view all posts
- `DELETE /api/admin/posts/{id}` - Admin remove post
- `PATCH /api/admin/reports/{id}/reviewed` - Mark report reviewed

### Frontend Features
- Full-screen interactive map with CartoDB tiles
- Glass-morphism header with Ucycle branding
- **Search bar** - search by keyword (title, description, category) AND location/address
- **Location geocoding** - uses OpenStreetMap Nominatim API
- **Combined search results** - shows items AND places in dropdown
- FAB button for posting items
- **"My Location" button** - flies map to user's exact location with pulsing marker
- **Geolocation with permission request** - high accuracy, proper error handling
- **"Use my current location" option** in post creation
- Bottom sheet drawer for post creation
- AI-powered image analysis (auto-fills title, category, description)
- Category selection (14 categories)
- Expiry time selection (24/48/72 hours)
- Location picker with map tap
- Post detail view with safety notice
- "Mark as Collected" functionality
- Report system with 4 reasons
- **Share feature with shareable links** (`/post/{id}`)
- **Dedicated shared post page for social sharing**
- **Social share dialog with WhatsApp, Facebook, Twitter, Copy Link**
- Admin panel with PIN entry (9090)
- Admin dashboard with stats, posts, and reports tabs

### Design System
- Colors: Forest Green (#166534), Lime (#84cc16), Orange accent (#f97316)
- Typography: Manrope (headings), Inter (body)
- Mobile-first responsive design
- **Fully opaque drawer/modal backgrounds for better readability**

## Test Coverage
- Backend: 100% (22/22 tests)
- Frontend: 95% (minor UX issue fixed)

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Map view with posts as pins
- [x] Post creation flow - **Compact 1-screen design**
- [x] AI image analysis (Gemini 2.5 Flash)
- [x] Auto-expiry system
- [x] Mark as collected
- [x] Report system
- [x] Admin panel (PIN: 26081992)
- [x] Share feature with shareable links
- [x] Social sharing (WhatsApp, Facebook, Twitter)
- [x] Geolocation with "My Location" button
- [x] Search bar (keywords + locations)
- [x] Image compression before upload
- [x] Category filter chips (radius-based)
- [x] **Radius filter (1-100km slider)**
- [x] Nearby items notifications
- [x] PWA support (installable)
- [x] SEO meta tags
- [x] **Camera-first experience (Snapchat-style)**
- [x] **Full-screen camera view with gallery option**
- [x] **Welcome popup with Aussie "help a mate" language**
- [x] **Norman Scrap Yard partner ad (Western Sydney only)**
- [x] **Auto-dismiss popups (3 seconds)**
- [x] **Centered share dialog (2x2 grid)**
- [x] **Pinch-to-zoom on camera view**
- [x] **Welcome popup only for first-time users** (uses localStorage)
- [x] **Improved Australian address search** (countrycodes=au parameter)
- [x] **Auto-set user location in post form** (from geolocation)
- [x] **Norman's Scrap Metal logo in ad dialog**
- [x] **Clickable "Get directions" link** (opens Google Maps)
- [x] **User Favorites** - Save items to local storage with heart icon toggle
- [x] **Updated share options** - WhatsApp, Messenger, FB Groups, Gumtree, Copy Link
- [x] **Simplified camera UI** - Removed text, just camera icon
- [x] **Multiple images per post** - Up to 5 photos with gallery view + swipe gestures
- [x] **Facebook Community sharing** - Direct link to Ucycle Facebook group
- [x] **Distance indicator** - Shows "Xm" or "X.Xkm away" on posts
- [x] **Fullscreen image viewer** - Swipeable gallery with swipe-down-to-close
- [x] **AI Content Moderation** - Blocks inappropriate/unsafe images using Gemini
- [x] **In-App Notification System** - Banner notifications with ding sound for nearby items and collected items

### P2 (Medium Priority) - Future
- [ ] Email digest of nearby items
- [ ] Post analytics for admins
- [ ] Rate limiting for spam prevention

## Completed Tasks (Jan 29, 2026)
1. ✅ Welcome popup only shows to first-time users
2. ✅ Fixed address search for Australian addresses
3. ✅ Auto-set location from geolocation in post form
4. ✅ Added Norman's Scrap Metal logo to partner ad
5. ✅ Made location clickable with Google Maps directions
6. ✅ Moved camera/location buttons to bottom-left (away from Emergent logo)
7. ✅ Updated share options (Messenger, FB Groups, Gumtree instead of X)
8. ✅ Simplified camera UI (removed text overlay)
9. ✅ Added User Favorites feature with localStorage persistence
10. ✅ Facebook Community share - opens Ucycle FB group directly
11. ✅ Multiple images per post (up to 5 photos with gallery view)
12. ✅ Swipe gestures for image gallery on mobile
13. ✅ Distance indicator showing how far each item is
14. ✅ Fullscreen image viewer with swipe navigation
15. ✅ AI content moderation for uploaded images
16. ✅ In-app notification system with ding sound (nearby items within 1km, collected items)
17. ✅ Notification toggle in menu (ON by default)
18. ✅ Image interaction hints ("Tap to expand • Swipe to browse" on posts, exit instructions in fullscreen)
19. ✅ Fresh GPS location on post - fetches current location when posting (not cached), with manual "Refresh" button
20. ✅ Smart permission handling - checks permission status before requesting, no repeated prompts if already granted
21. ✅ Partner Update (Norman Scrap Yard) - Added White Goods to accepted items, geofenced to Sydney Metro (300km)
22. ✅ Feed Geo-Filtering - Default 105km radius, dynamic filtering based on user location
23. ✅ Scrap Market Rates - New menu item showing NSW scrap metal prices (8 materials)
24. ✅ Toast Notifications - Moved to center-middle screen, 1.2 second duration
25. ✅ Filter UI Redesign - White background card, collapsible "Filter" button for categories
26. ✅ Partner Ad Improvements - Swipe/tap to dismiss, 5 second auto-timeout
27. ✅ AI Analysis Quality - Specific titles (1-5 words like "Blue IKEA Bookshelf"), detailed descriptions (4-15 words with condition info)
28. ✅ Filter Box Visibility - Solid white background with border and shadow, higher z-index
29. ✅ AI Vision Restored - QUALITY over speed, strict "no Item" rules, category-based fallback titles
30. ✅ Enlarged UI Elements - Floating pill bar (larger text/padding), Camera FAB (72px), Location button (56px)
31. ✅ Redesigned Search - High contrast bar, "Search 'Fridge', 'Copper', 'St Marys'..." placeholder, green GO button, quick keyword chips

## Partner System (Expandable)
- **Norman's Scrap Metal** (Sydney Metro - 300km radius from Penrith)
  - Accepted: Scrap Metal, White Goods, Car Batteries, Aluminium, Copper, Brass, Steel
  - Future regions: Newcastle, Interstate partners, Return & Earn locations, Pallet recyclers

## Completed Tasks (Jan 30 - Feb 2, 2026)
1. ✅ **AI Factory Reset (P0 Critical Fix)** - Complete rewrite of AI image analysis
   - **Title length limit: 3-6 words MAX** for mobile UI fit
   - **Description length limit: ~350 chars MAX** (2-3 sentences, ~8 lines)
   - Strict prohibition on generic words ("Item", "Object", "Stuff", "Thing")
   - Example outputs: "Double Glass Door Refrigerator" (4 words, 147 char desc)
2. ✅ **AI Analyzing UI Enhancement** - Much larger, more visible processing indicator
   - Expanded image area during analysis (h-40 → h-56)
   - Large animated spinner with pulsing ring
   - Clear "AI Analyzing" and "Identifying your item..." text
   - Gradient overlay for better visibility
3. ✅ **Location Button Zoom** - Now zooms to level 18 (~1km radius view)
4. ✅ **2-SPEED WORKFLOW (Fast Post Flow)** - Camera to Post in ~5 seconds
   - **Instant GPS Stamp**: Fetches high-accuracy GPS immediately when photo taken
   - **Reverse Geocoding**: Converts coordinates to human-readable address (e.g., "12 High St, St Marys")
   - **Auto-fill Location**: Address field auto-populated, editable if GPS is off
   - **Fast Title (The Sprinter)**: New `/api/analyze-image-fast` endpoint returns 2-4 word title in ~3-5 seconds
   - **Background Description (The Marathon)**: `/api/posts/{id}/generate-description` runs AFTER post is created
   - **Instant Posting**: User can post as soon as title is ready - no waiting for description
   - GPS + AI Title run in PARALLEL for maximum speed
5. ✅ **MODULE 1: LIVE LOCATION TRACKING**
   - Switched from `getCurrentPosition` to `watchPosition` for continuous tracking
   - Real-time distance updates every 5 seconds as user moves
   - Auto-starts after initial location obtained
   - Proper cleanup on unmount
6. ✅ **MODULE 2: CAMERA PERMISSIONS OVERHAUL**
   - Checks camera permission state on app load
   - Opens camera IMMEDIATELY if already granted (no nagging)
   - Only prompts if browser returns 'prompt' state
   - Silent fallback to gallery picker if denied
   - Existing pinch-to-zoom + zoom slider (1x-5x) preserved
7. ✅ **MODULE 3: OPTIMISTIC 2-SPEED POSTING**
   - Image displays INSTANTLY on capture
   - Non-blocking AI analysis in background
   - Spinner auto-hides after 2 seconds (user can type while waiting)
   - AI only fills fields if user hasn't typed anything
   - User feels instant even if AI takes 10+ seconds
8. ✅ **NATIVE CAMERA APP** - Opens device's default camera app
   - Camera FAB now triggers native camera via `capture="environment"`
   - Full access to device camera features (zoom, flash, etc.)
   - Gallery option available after photo taken
9. ✅ **IMPROVED AI ANALYSIS ANIMATION**
   - Shows step-by-step progress: "Scanning image..." → "Identifying item..." → "Analysis complete!"
   - Animated scanning line overlay
   - Spinning loader with Eye icon
   - Gradient overlay with clear status text
10. ✅ **ADMIN BRANDS/COMPANIES TRACKING**
    - New "Brands" tab in Admin Panel
    - Add/Edit/Delete brands to track
    - Track scan counts and last scanned dates
    - Category-based organization (appliances, electronics, furniture, etc.)
    - Brand statistics summary for presentations
    - API endpoints: `/admin/brands`, `/admin/brand-stats`
11. ✅ **ADMIN "TYPES OF SCRAP" TAB** (PIN-protected, admin only)
    - Tracks all item types being posted automatically
    - Background processing - NO delay to posting flow
    - Auto-detects brand names from titles (Samsung, LG, IKEA, etc.)
    - Category filter (All, Furniture, Electronics, Appliances...)
    - Shows: item title, category, brand (if detected), count
    - API endpoints: `/admin/item-types`, `/admin/item-types-summary`
12. ✅ **ADMIN "PARTNERS" TAB** (PIN-protected, admin only)
    - Tracks all clicks to partner links (Norman's Scrap Yard)
    - Featured partner card: Norman's Scrap Yard (Sydney Metro)
    - Shows: total clicks, status, region
    - Recent clicks history with timestamps
    - Clicks by category breakdown
    - API endpoints: `/admin/partners`, `/admin/partner-summary`
    - Click tracking: `/track-partner-click` (called when user taps "Get directions")
13. ✅ **PWA SHORTCUT TO CAMERA**
    - Added "Post Item" shortcut in manifest.json
    - Opens camera directly via `?action=camera` URL parameter
    - Appears in iOS/Android app shortcuts menu
14. ✅ **"ADD TO HOME SCREEN" PROMPT (iOS)**
    - Detects if app is NOT in standalone mode (PWA not installed)
    - Shows overlay with arrow pointing to Share button
    - Step-by-step instructions: Share → Add to Home Screen → Add
    - Includes Safari camera settings tip
    - Only shows once (saved to localStorage)
15. ✅ **NATIVE CAMERA INTEGRATION**
    - Uses `<input type="file" capture="environment">` for native camera
    - Bypasses repeated permission prompts
    - System handles permissions persistently
    - Full access to device camera features (zoom, flash, etc.)
16. ✅ **ADMIN DATA EXPORT OPTIONS**
    - Export buttons in Stats tab for all data types
    - Individual export buttons in Types and Partners tabs
    - Export formats:
      - **Posts CSV**: ID, Title, Category, Description, Status, Location, Dates
      - **Item Types CSV**: Title, Category, Brand, Count, First/Last Posted
      - **Partner Clicks CSV**: Partner Name, ID, Category, Post ID, Click Time
      - **Brands CSV**: Brand Name, Category, Scan Count, Notes, Dates
      - **Full Export (JSON)**: All data in single JSON file
    - API endpoints: `/admin/export/item-types`, `/admin/export/partner-clicks`, `/admin/export/brands`, `/admin/export/posts`, `/admin/export/all`
17. ✅ **iOS ONBOARDING & MENU SYSTEM**
    - **Download App Section** (Menu):
      - Shows only if NOT in standalone mode
      - "Add to Home Screen" button triggers iOS install guide
    - **Device Options Section** (Menu - iOS only):
      - "Action Button" - Guide for iPhone hardware button mapping
      - "Quick Guide" - Comprehensive setup modal
    - **Add to Home Screen Overlay**:
      - Triggers after "Let's Go" on first visit (if not standalone + iOS)
      - Animated arrow pointing to Safari Share button
      - Step-by-step visual guide with icons
      - Persists dismissal in localStorage
    - **Quick Setup Guide Modal** (swipe to dismiss):
      - Home Screen installation instructions
      - iPhone Action Button setup (Settings → Action Button → Shortcut)
      - Camera Permission tips (AA menu → Website Settings → Allow)
    - **Action Button Guide Modal**:
      - Step-by-step numbered instructions
      - Pro tip about Home Screen installation
    - **Camera Troubleshoot Tooltip**:
      - One-time tooltip explaining "AA" menu camera settings
      - Shows when camera is opened (iOS only)
      - Auto-dismisses after 6 seconds

## Next Tasks
- Deploy app and connect custom domain ucycle.com.au

## Completed Tasks (Feb 2, 2026) - Bug Fixes
18. ✅ **SOCIAL SHARING IMAGE FIX (P0 Critical Bug)**
    - **Issue**: When sharing post URL on social media, image preview was blank
    - **Root cause**: Social crawlers need actual URLs, not base64 data
    - **Fix implemented**:
      - New `/api/post-image/{post_id}.jpg` endpoint that serves actual JPEG image
      - New `/api/post-meta/{post_id}` endpoint that serves HTML with proper OG tags
      - OG tags: og:title, og:image, og:description, og:url, twitter:card, twitter:image
      - Share URLs now point to `/api/post-meta/{post_id}` which auto-redirects to actual post
19. ✅ **REMOVE ACTION BUTTON FEATURE (P1)**
    - **Issue**: iOS Action Button can't launch PWAs - feature was misleading
    - **Fix**: Removed from:
      - Menu "Device Options" section (no more Action Button button)
      - Quick Guide modal (removed Action Button section)
      - Action Button Guide Modal (removed entirely)
    - Kept: "Quick Guide" button in Device Options with Camera Permission tips
20. ✅ **REWORD ADD TO HOME SCREEN INSTRUCTIONS (P1)**
    - **Issue**: "Tap the Share button below" was confusing
    - **Fix**: Changed to "Tap the Share icon in your browser's toolbar (Safari, Chrome)"
    - Updated in: Add to Home Screen overlay and Quick Guide modal
21. ✅ **ADD TO HOME SCREEN MODAL UX IMPROVEMENTS**
    - **Issue**: Button hidden behind Emergent logo, no swipe gesture
    - **Fix**: 
      - Increased bottom margin (`mb-20`) to move modal up from Emergent logo
      - Added swipe-down-to-dismiss gesture (80px threshold)
      - Added tap-backdrop-to-dismiss
      - Added drag handle indicator with "Swipe down to close" text

22. ✅ **SMOOTH SWIPE-TO-DISMISS ON ALL MODALS & PERFORMANCE OPTIMIZATION**
    - **Request**: Add swipe-to-dismiss to all slider boxes, make app flawless and smooth
    - **Changes implemented**:
      - CSS Animations Overhaul with GPU acceleration
      - Drawer, Dialog, Button components enhanced
      - All modals now have swipe-to-dismiss

23. ✅ **ADMIN REPORTS TAB REINSTATED & ENHANCED**
    - Added Reports tab to admin panel
    - Reports grouped by "All Reports" and "Illegal Dumping"
    - Shows report reason, post title, suburb, region
    - Mark Reviewed button for each report

24. ✅ **ADMIN ANALYTICS TAB ADDED**
    - Conversion rate metric (items collected vs total)
    - Average posts per day
    - Category distribution with visual progress bars
    - Post status distribution
    - Top auto-detected brands
    - Illegal dumping reports by region

25. ✅ **AUTO BRAND DETECTION FROM POSTS**
    - Backend auto-detects known brands from post titles and descriptions
    - Automatically creates or increments brand records
    - 70+ common brands supported (Samsung, IKEA, Dyson, etc.)
    - Brands shown in Analytics and Brands tabs

26. ✅ **ENHANCED REPORT OPTIONS FOR POSTS**
    - Two report types now available:
      1. "Not Correct/Misleading" - Regular report for incorrect info
      2. "Illegal Dumping" - Reports to local council
    - Illegal dumping reports:
      - Collect full post data (title, description, category, image, location)
      - Auto-detect suburb and region from address
      - Stored in separate collection grouped by region
      - Email generation endpoint for council notification
      - Email from: admin@ucycle.com.au

27. ✅ **SYDNEY REGION MAPPING**
    - Implemented region detection for Sydney suburbs
    - 10 regions: Penrith, Blacktown, Parramatta, Liverpool, Campbelltown, Sutherland, Northern Sydney, Eastern Sydney, Inner West, CBD
    - Used for illegal dumping report organization

28. ✅ **MAP PERFORMANCE OPTIMIZATION (Feb 2, 2026)**
    - Implemented `react-leaflet-cluster` for marker clustering
    - Frontend sends map bounds to backend for viewport-based loading
    - Backend uses `$geoWithin` geospatial filter with pagination
    - Added `2dsphere` index to MongoDB posts collection
    - Map loads much faster with many items

29. ✅ **FINAL UI/UX POLISH (Feb 2, 2026)**
    - **Dialog Centering Fixed**: All dialogs (Welcome, Share, Report, Scrap Prices) now perfectly centered on screen
    - **Map Popup Bubble Removed**: Clicking map markers no longer shows popup bubble - directly opens item detail drawer
    - **Tap-Out Functionality**: All dialogs can be closed by tapping outside (clicking the overlay)
    - **Performance Improvement**: Removed unnecessary Leaflet Popup component for faster map interaction

30. ✅ **CODE REFACTORING FOUNDATION (Feb 2, 2026)**
    - Created modular component structure for better maintainability
    - **New directories created:**
      - `/app/frontend/src/utils/` - constants.js, api.js, mapUtils.js
      - `/app/frontend/src/hooks/` - useGeolocation.js, usePosts.js, useCamera.js, useNotifications.js
      - `/app/frontend/src/components/map/` - LocationPicker, UserLocationMarker, MapHelpers
      - `/app/frontend/src/components/dialogs/` - ShareDialog, ReportDialog, WelcomeDialog, ScrapPricesDialog
      - `/app/frontend/src/components/post/` - PostCard, ImageGallery
      - `/app/frontend/src/components/layout/` - Header, FilterBar
    - App.js now imports from utils/constants.js and utils/mapUtils.js
    - Foundation ready for gradual migration of remaining code

## Code Architecture (After Refactoring)
```
/app/frontend/src/
├── components/
│   ├── ui/              # Shadcn UI components
│   ├── map/             # Map-related components
│   │   ├── LocationPicker.jsx
│   │   ├── UserLocationMarker.jsx
│   │   └── MapHelpers.jsx
│   ├── post/            # Post-related components
│   │   ├── PostCard.jsx
│   │   └── ImageGallery.jsx
│   ├── dialogs/         # Modal dialogs
│   │   ├── ShareDialog.jsx
│   │   ├── ReportDialog.jsx
│   │   ├── WelcomeDialog.jsx
│   │   └── ScrapPricesDialog.jsx
│   └── layout/          # Layout components
│       ├── Header.jsx
│       └── FilterBar.jsx
├── hooks/               # Custom React hooks
│   ├── useGeolocation.js
│   ├── usePosts.js
│   ├── useCamera.js
│   └── useNotifications.js
├── utils/               # Utility functions
│   ├── constants.js     # App constants, categories, partners
│   ├── api.js          # API client functions
│   └── mapUtils.js     # Map helper functions
├── App.js              # Main app (still large, but now imports from utils)
└── index.css           # Global styles
```

## Next Tasks
- Deploy app and connect custom domain ucycle.com.au

## Future/Backlog
- **P1:** Continue refactoring App.js - migrate remaining inline code to new components
- **P2:** Add support for more regional partners (Newcastle, Interstate)
- **P2:** Integrate "Return and Earn" locations or pallet recyclers
- **P2:** Email digest of nearby items
- **P2:** Post analytics enhancements
- **P2:** Rate limiting for spam prevention
