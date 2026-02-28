

# 🌿 BagichaLink — Full Build Plan

## Overview
A beautifully designed mobile-first (480px max-width) balcony garden community app that feels like a botanical journal meets a modern social feed. All 5 screens, floating pill navigation, full design system, and live API integration.

---

## Phase 1: Design System & Foundation

### Custom Theme & Fonts
- Import DM Serif Display, DM Sans, and Space Grotesk from Google Fonts
- Replace entire color palette with the botanical theme (warm parchment #FAF7F2 background, sage greens, terracotta accents)
- Set up typography scale with display, body, and mono/tag font families
- Add subtle paper grain texture overlay on the base background
- Configure pill-shaped border radii (100px buttons, 20px cards)

### Reusable Component Library
- **LocationPill** — terracotta pill showing city + country flag emoji
- **TypeBadge** — "Available" (sage green) and "Wanted" (peach) pill badges
- **HealthBadge** — color-coded health status indicator
- **HealthStatusBar** — segmented visual meter (green → yellow → red)
- **InterestButton** — toggle button with scale animation and count bounce
- **MatchScoreRing** — CSS circular progress ring with percentage
- **WeatherBanner** — premium postcard-style weather card with gradient, blob, and 3-day forecast
- **LoadingBlob** — morphing CSS gradient blobs for AI loading states
- **ToastNotification** — realtime "new plant shared" banner

### Floating Pill Navigation Bar
- Fixed bottom pill nav with dark forest background (#1C2B1A) and white icons
- 5 tabs: Home, Explore, center FAB (camera), Matches, Profile
- Center FAB: terracotta circle elevated above nav with pulse ring animation
- No text labels, icons only

---

## Phase 2: Location & Weather Flow

### Location Permission & Detection
- Custom beautiful permission modal (not browser default) with plant illustration
- GPS auto-detect → fetch city/weather from your API
- Fallback: city search drawer using `/api/weather/search`
- Location stored in global state (Zustand or Context)

### Weather Integration
- Fetch weather data from `/api/weather/full` on app load
- Weather card on home feed showing temp, humidity, condition, watering advice
- Animated rain droplets when humidity > 85%

---

## Phase 3: Home Feed (Screen 1)

### Bento Grid Layout
- Alternating rhythm: full-width featured card → 2-column small cards → weather banner → repeat
- Cards fade-up on scroll into viewport using Intersection Observer

### Plant Post Cards
- **Large card**: 16:9 image, species name (DM Serif), poster info with city + flag emoji, AI health badge, type badge, interest count, "I'm Interested" CTA
- **Small card**: Square image, species name, city, type pill — taps to full detail
- Realtime "🔴 Live" pulsing dot on posts less than 1 hour old

### Feed Filters
- Horizontal scrollable pill row: Global / Nearby / My City + Available / Wanted
- Smooth sliding background on selection

### Realtime Updates
- Socket.io connection joining global + city rooms
- Slide-down toast when new post arrives with "View" button
- Auto-dismiss after 4 seconds

### Empty State
- Botanical line art illustration with italic prompt text and terracotta CTA

---

## Phase 4: Scan / AI Analyze (Screen 2)

### Upload Flow
- Full-screen drawer sliding up from bottom
- Two large cards: Take Photo / Upload Photo
- Instant image preview using FileReader API

### AI Analysis Loading
- Full-screen animated state with cycling text that fades in/out
- Morphing gradient blobs (pure CSS) in moss green and peach
- Thin sage green progress bar

### AI Result Card — "The Hero Moment"
- Beautiful bottom sheet (80vh) with plant image, floating emoji + health badge
- Species block: common name, scientific name, fun fact with terracotta left border
- Care level and watering pills
- Health Report with segmented status bar
- Weather-aware tips: 3 stacked tip cards with numbered badges
- Horizontal scrollable tag pills
- Sticky action buttons: Post as Available, Post as Wanted, Save to Garden
- Confetti burst on successful post creation

---

## Phase 5: Post Detail (Screen 3)

### Full Page View
- Edge-to-edge hero image with floating frosted back button
- Content card sliding up with -40px image overlap
- Species info, poster row with avatar + city + time ago
- Health section matching the AI result card
- Weather snapshot showing conditions when posted
- Collapsible care tips accordion
- Approximate location map placeholder
- Interest section with avatar stack and full-width swap CTA
- Toast confirmation on interest expression

---

## Phase 6: AI Smart Matches (Screen 4)

### Match Interface
- Header with DM Serif title
- Horizontal scroll of user's own posts to select which plant to match
- Up to 3 match cards with fade-up entry animation
- Each card: plant image, species, city, match reason in italic, circular match score ring
- "View Post" outline button
- AI tip box at bottom with sage green background

### Empty State
- Botanical illustration with prompt to post a plant first

---

## Phase 7: Profile (Screen 5)

### Profile Header
- Gradient background (moss → parchment)
- Large avatar with white border and shadow
- Name in DM Serif, italic bio, location pill

### Stats Bento Row
- Three equal cards: Plants count, Swaps count, Global Rank
- Numbers in terracotta DM Serif, labels in Space Grotesk

### Content
- Feed preference toggle (Global / Nearby / My City)
- Collapsible weekly care schedule accordion
- "My Plants" and "Completed Swaps" tabs with 2-column bento grid
- Settings footer: plain text links for Update Location, Edit Profile, Logout

---

## Phase 8: Auth Screens (UI Only)

### Login Screen
- Warm parchment background with large botanical SVG line art
- Tagline in DM Serif italic
- Minimal form with subtle inputs (bottom-border focus style)
- Full-width dark pill sign-in button
- Link to register

### Register Screen
- Name, Email, Password fields
- City search with dropdown (wired to live API)
- Selected city shown as flag pill
- Terracotta "Join BagichaLink" CTA

---

## Phase 9: Micro-interactions & Polish

- Card lift on hover/press with shadow deepening
- FAB pulse rings animation
- Interest button scale + count bounce
- Success confetti using canvas-confetti
- Weather card parallax on scroll
- Smooth pill switcher transitions
- Subtle leaf sway on profile stats
- Sprout growth animation on post button

---

## API Wiring

All screens will call your live Express backend:
- **Feed**: `GET /api/posts` with feed type and pagination
- **Weather**: `GET /api/weather/full` and `/api/weather/search`
- **AI Analyze**: `POST /api/ai/analyze` (multipart)
- **Create Post**: `POST /api/posts` (multipart)
- **AI Match**: `POST /api/ai/match`
- **Interest**: `POST /api/posts/{id}/interest`
- **Auth**: `POST /api/auth/login` and `/api/auth/register` (UI only, forms wired)
- **Realtime**: Socket.io for new posts, deletions, interest updates

Global state managed with React Context or Zustand holding user, location, weather, feed preferences, and socket instance.

