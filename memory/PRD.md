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

## Next Tasks
- Deploy app and connect custom domain ucycle.com.au
