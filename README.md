# 🌿 BagichaLink — Plant Swap Community

> **Swap plants with gardeners near you. AI identifies your plants, diagnoses health issues, and finds perfect swap matches. 100% free.**


## 📸 What is BagichaLink?

BagichaLink is a **free, community-driven plant swap platform** built for urban gardeners and plant lovers. Instead of cluttered WhatsApp groups or Facebook Marketplace chaos, BagichaLink gives you a clean, AI-powered experience to:

- 📷 **Scan any plant** with your camera — AI identifies species, health, and care needs instantly
- 🌍 **Find swap partners** near you or globally using smart AI matching
- 💬 **Chat in real-time** with other gardeners to arrange swaps
- 🗺️ **Explore the Plant Map** — see posts from around the world
- 📅 **Get a personalized care schedule** based on your location and weather

---

## ✨ Features

### 🔬 AI Plant Intelligence
- **Instant plant identification** — upload or photograph any plant and get species name, emoji, fun facts
- **Health diagnosis** — AI assesses plant health (Healthy / Needs Care / Critical) with detailed diagnosis
- **Weather-aware care tips** — tips tailored to your current local weather conditions
- **Smart swap matching** — AI compares your plant against others and scores compatibility
- **Weekly care schedule** — personalized 7-day schedule for all your plants

### 🔄 Plant Swapping
- Post plants as **Available** or **Wanted**
- Express interest in others' plants with one tap
- AI-powered match scoring with reasons
- Real-time notifications when someone is interested in your plant
- Mark swaps as complete with confetti celebration 🎉

### 💬 Real-time Chat
- Direct messaging between gardeners
- Socket.io powered — messages arrive instantly
- Unread badge on nav
- Full chat history with read receipts

### 🔐 Authentication
- Email + password login
- **Email OTP login** — passwordless, 6-digit code sent to inbox
- OTP registration flow with animated digit input boxes
- 60-second resend cooldown
- JWT tokens, 7-day sessions
- Gmail SMTP via Nodemailer (free, 500 emails/day)
- MongoDB TTL index auto-deletes expired OTPs after 10 minutes

### 🗺️ Plant Map
- Interactive Leaflet map showing plants globally
- GPS "Plants Near Me" button
- Pulse animations on fresh posts
- Bottom sheet preview on pin tap

### 👤 Profile & Garden
- Personal garden with health overview
- Dynamic global rank based on swap count
- Edit profile with avatar upload
- AI care schedule with urgent alerts

### 🔔 Smart Notifications
- Real-time push via Socket.io
- Interest alerts, new messages, swap matches
- Mark all read, delete individual

---

## 🛠️ Tech Stack

### Frontend
| Tech | Usage |
|------|-------|
| **React 18** + TypeScript | UI framework |
| **Vite** | Build tool |
| **Tailwind CSS** | Styling |
| **React Router v6** | Client-side routing |
| **Socket.io Client** | Real-time events |
| **Leaflet** + React Leaflet | Interactive maps |
| **canvas-confetti** | Swap celebration 🎉 |
| **Lucide React** | Icons |

### Backend
| Tech | Usage |
|------|-------|
| **Node.js** + Express | API server |
| **MongoDB** + Mongoose | Database |
| **Socket.io** | Real-time bi-directional events |
| **Cloudinary v1** | Image storage & CDN (memory buffer upload) |
| **JWT** + bcrypt | Authentication |
| **Multer** (memoryStorage) | File upload — buffer passed directly to AI |
| **Nodemailer** + Gmail SMTP | OTP email delivery |
| **express-rate-limit** | API protection |

### AI & External APIs
| Service | Usage | Free Tier |
|---------|-------|-----------|
| **Groq** (`llama-4-scout`) | Plant vision analysis (primary) | 14,400 req/day |
| **Google Gemini 2.0 Flash** | Fallback AI for analysis & matching | Limited |
| **Open-Meteo** | Real-time weather (no key needed) | Unlimited |
| **Nominatim / OpenStreetMap** | Reverse geocoding | Unlimited |

### Infrastructure
| Service | Usage |
|---------|-------|
| **Netlify** | Frontend hosting |
| **Render** | Backend hosting |
| **MongoDB Atlas** | Cloud database (GeoJSON 2dsphere index) |
| **Cloudinary** | Image CDN |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier)
- Cloudinary account (free tier)
- Groq API key — [console.groq.com](https://console.groq.com) (free, no credit card)
- Gmail account with App Password enabled

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/bagichalink.git
cd bagichalink
```

### 2. Setup Backend
```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://your-cluster.mongodb.net/bagichalink
JWT_SECRET=your-super-secret-jwt-key
CLIENT_URL=http://localhost:8080

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# AI — Groq (primary, free)
GROQ_API_KEY=your-groq-api-key

# AI — Gemini (fallback)
GEMINI_API_KEY=your-gemini-api-key

# Gmail OTP (free, 500 emails/day)
# Step 1: Enable 2-Step Verification on your Google account
# Step 2: Go to Google Account → Security → App Passwords
# Step 3: Generate app password for "Mail" → copy 16-char password
GMAIL_USER=yourgmail@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

```bash
npm start
# Server runs on http://localhost:5000
```

### 3. Setup Frontend
```bash
cd client
npm install
```

Create `client/.env.local`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

```bash
npm run dev
# App runs on http://localhost:8080
```

---

## 📁 Project Structure

```
bagichalink/
├── client/                        # React frontend
│   └── src/
│       ├── components/
│       │   ├── FloatingNav.tsx    # Mobile bottom nav
│       │   ├── PlantCardLarge.tsx
│       │   ├── PlantCardSmall.tsx
│       │   ├── HealthBadge.tsx    # healthy / attention_needed / critical / unknown
│       │   ├── HealthStatusBar.tsx
│       │   ├── LocationPermissionModal.tsx
│       │   ├── WeatherBanner.tsx
│       │   ├── MatchScoreRing.tsx
│       │   └── LoadingBlob.tsx    # Morphing blob for AI loading states
│       ├── pages/
│       │   ├── HomeFeed.tsx       # Bento grid feed + realtime toast
│       │   ├── ScanAnalyze.tsx    # AI plant scanner
│       │   ├── PostDetail.tsx     # Post detail + care tips accordion
│       │   ├── Profile.tsx        # User profile & garden
│       │   ├── Matches.tsx        # AI swap matches
│       │   ├── Login.tsx          # Password + OTP login tabs
│       │   ├── Register.tsx       # OTP registration flow
│       │   ├── ChatRoom.tsx       # Real-time 1:1 chat
│       │   └── Conversations.tsx  # Conversations list
│       ├── context/
│       │   └── AppContext.tsx     # Global state + socket (userRef pattern)
│       └── lib/
│           ├── api.ts             # Axios client with auth interceptor
│           └── helpers.ts         # countryFlag, timeAgo, weatherEmoji, isLive
│
└── server/                        # Node.js backend
    ├── models/
    │   ├── User.js                # GeoJSON Point (coordinates field)
    │   ├── Post.js                # GeoJSON Point + 2dsphere index
    │   ├── Message.js             # Chat messages with TTL
    │   └── OTP.js                 # 10-min TTL auto-delete via MongoDB index
    ├── routes/
    │   ├── auth.js                # register, login, send-otp, verify-otp-login,
    │   │                          # register-with-otp, update-location, update-profile
    │   ├── posts.js               # CRUD + interest + mark-swapped
    │   │                          # ⚠️ /user/:userId BEFORE /:id
    │   ├── messages.js            # DMs + conversations
    │   │                          # ⚠️ /conversations BEFORE /:userId
    │   ├── ai.js                  # analyze (buffer→Groq), match, care-schedule
    │   ├── weather.js             # current, full, geocode, search
    │   ├── users.js               # profile, leaderboard
    │   └── featured.js            # plant of the day
    ├── utils/
    │   ├── gemini.js              # Groq (primary) + Gemini (fallback) AI chain
    │   ├── weather.js             # Open-Meteo + Nominatim (10s timeout)
    │   └── mailer.js              # Nodemailer Gmail OTP sender
    ├── config/
    │   └── cloudinary.js          # memoryStorage → buffer → uploadBufferToCloudinary
    ├── middleware/
    │   └── auth.js                # protect + optionalAuth JWT middleware
    └── server.js                  # Express + Socket.io + rate limiting
```

---

## ⚠️ Important Implementation Notes

### Route Order (Critical)
Express matches routes top-to-bottom. Specific routes **must** come before wildcard `/:param` routes or they get swallowed:

```javascript
// ✅ Correct order in routes/posts.js
router.get("/user/:userId", ...)  // specific — first
router.get("/:id", ...)           // wildcard — last

// ✅ Correct order in routes/messages.js
router.get("/conversations", ...) // specific — first
router.get("/:userId", ...)       // wildcard — last
```

### MongoDB GeoJSON (Critical)
MongoDB's `2dsphere` index requires the coordinates array to be named **exactly** `coordinates` — any other name causes `MongoServerError: Can't extract geo keys`:

```javascript
// ✅ Correct
coordinates: { type: "Point", coordinates: [lon, lat] }

// ❌ Wrong — causes geo key error
coordinates: { type: "Point", coords: [lon, lat] }
```

### Image Upload Flow
Cloudinary's `multer-storage-cloudinary` discards the file buffer after upload, so Groq/Gemini has nothing to analyze. The fix uses `multer.memoryStorage()` instead:

```
Request → multer (memoryStorage) → req.file.buffer
                                        ↓
                              base64 → Groq Vision API
                                        ↓
                              uploadBufferToCloudinary()
                                        ↓
                              imageUrl saved to Post
```

### Socket.io User Registration
The socket `connect` handler closes over `user` state which is `null` at mount (loaded async). Use a `ref` to always read the latest value:

```typescript
const userRef = useRef<User | null>(null);
useEffect(() => { userRef.current = user; }, [user]);

// In socket connect handler — reads current user, not stale null
s.on("connect", () => {
  const uid = userRef.current?.id;
  if (uid) socket.emit("user_connected", uid);
});
```

---

## 🔒 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| All `/api/*` | 500 requests | per 15 min |
| Plant scan (`/api/ai/analyze`) | 10 scans | per min |
| Swap matching (`/api/ai/match`) | 10 matches | per min |
| Socket.io polling | **excluded** | — |

> Socket.io polling is excluded from rate limiting via the `skip` function — otherwise reconnects exhaust the quota and cause 429 errors on regular API calls.

---

## 🌐 Deployment

### Frontend (Netlify)
1. Build: `cd client && npm run build`
2. Upload `client/dist/` to Netlify or connect Git repo
3. Add environment variables in Netlify dashboard:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   VITE_SOCKET_URL=https://your-backend.onrender.com
   ```
4. Add `public/_redirects` for SPA routing:
   ```
   /* /index.html 200
   ```

### Backend (Render)
1. Connect GitHub repo to Render
2. Build command: `npm install`
3. Start command: `node server.js`
4. Add all `.env` variables in Render dashboard
5. Drop and recreate MongoDB `users` and `posts` collections after any GeoJSON schema change

> **Note:** Render free tier sleeps after 15 minutes of inactivity. Add a self-ping cron or use [cron-job.org](https://cron-job.org) to hit your health endpoint every 14 minutes.

---

## 🤝 Contributing

Pull requests are welcome! For major changes please open an issue first.

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

Built with 🌿 by **Soham-0047**

---

## 🙏 Acknowledgements

- [Groq](https://groq.com/) — Ultra-fast AI inference (primary vision model)
- [Google Gemini](https://deepmind.google/technologies/gemini/) — AI fallback
- [Open-Meteo](https://open-meteo.com/) — Free weather API
- [Nominatim](https://nominatim.org/) — Free geocoding
- [Leaflet.js](https://leafletjs.com/) — Interactive maps
- [Cloudinary](https://cloudinary.com/) — Image CDN
- [Render](https://render.com/) — Backend hosting
- [Netlify](https://netlify.com/) — Frontend hosting

---

<p align="center">
  <strong>🌿 Happy Swapping! 🌿</strong><br/>
  <a href="https://bagichalink.netlify.app">bagichalink.netlify.app</a>
</p>