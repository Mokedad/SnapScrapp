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
- [x] Admin panel (PIN: 9090)
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

### P1 (High Priority) - Future
- [ ] Email digest of nearby items
- [ ] Photo gallery (multiple images per post)
- [ ] Distance indicator on posts

### P2 (Medium Priority) - Future
- [ ] User favorites (local storage)
- [ ] Post analytics for admins
- [ ] Rate limiting for spam prevention

### P2 (Medium Priority) - Future
- [ ] Share post link
- [ ] Multiple images per post
- [ ] Distance display on posts
- [ ] Post analytics for admins

## Next Tasks
1. Add image compression to reduce upload size
2. Implement search/filter by category on map
3. Add push notification support for nearby posts
4. Improve mobile touch interactions
