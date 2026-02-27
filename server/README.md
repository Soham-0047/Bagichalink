# 🌿 BagichaLink – Backend API

**Global balcony garden community** – AI plant doctor, live weather tips, realtime swaps, worldwide.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in your MongoDB, Cloudinary, and Gemini keys

# 3. Run development server
npm run dev

# 4. Production
npm start
```

Server runs on `http://localhost:5000`

---

## 🔑 Free API Keys You Need

| Service | Get From | Cost |
|---|---|---|
| MongoDB Atlas | https://cloud.mongodb.com | Free 512MB |
| Cloudinary | https://cloudinary.com | Free 10GB |
| Gemini 1.5 Flash | https://aistudio.google.com/app/apikey | Free tier |
| Open-Meteo (weather) | No key needed! | Always free |
| Nominatim (geocoding) | No key needed! | Always free |

---

## 📡 Socket.io Realtime Events

Connect: `io('http://localhost:5000')`

### Emit (client → server)
```js
socket.emit('join_room', 'global')          // Join global feed
socket.emit('join_room', 'mumbai')          // Join city feed (lowercase)
```

### Listen (server → client)
```js
socket.on('new_post', (post) => { })        // New post created
socket.on('delete_post', ({ postId }) => { }) // Post deleted
socket.on('post_interest', (data) => { })   // Someone interested in a post
```

---

## 📋 API Reference

### Base URL: `/api`
### Auth Header: `Authorization: Bearer <token>`

---

## 🔐 Auth Routes

### POST `/api/auth/register`
```json
{
  "name": "Priya Sharma",
  "email": "priya@example.com",
  "password": "securepassword",
  "location": {
    "city": "Mumbai",
    "country": "India",
    "countryCode": "IN",
    "lat": 19.0760,
    "lon": 72.8777
  }
}
```
**Response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { "id": "...", "name": "Priya Sharma", "email": "...", "location": { ... } }
}
```

### POST `/api/auth/login`
```json
{ "email": "priya@example.com", "password": "securepassword" }
```

### GET `/api/auth/me` 🔒
Returns current user profile.

### PATCH `/api/auth/update-location` 🔒
```json
{ "city": "Delhi", "country": "India", "countryCode": "IN", "lat": 28.6139, "lon": 77.2090 }
```

### PATCH `/api/auth/update-profile` 🔒 (multipart/form-data)
Fields: `name`, `bio`, `feedPreference` (global|nearby|city), `avatar` (file)

### POST `/api/auth/logout` 🔒

---

## 🌱 Posts Routes

### GET `/api/posts`
**Query params:**
| Param | Values | Default |
|---|---|---|
| `feed` | `global`, `nearby`, `city` | `global` |
| `type` | `available`, `wanted` | all |
| `lat` | number | - |
| `lon` | number | - |
| `city` | string | - |
| `radius` | meters | 50000 |
| `search` | string | - |
| `tags` | comma-separated | - |
| `healthStatus` | `healthy`, `attention_needed`, `critical` | - |
| `page` | number | 1 |
| `limit` | number | 20 |

**Example:** `GET /api/posts?feed=nearby&lat=19.07&lon=72.87&type=available&page=1`

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [...],
    "pagination": { "total": 48, "page": 1, "limit": 20, "hasMore": true }
  }
}
```

### POST `/api/posts` 🔒 (multipart/form-data)
| Field | Type | Required |
|---|---|---|
| `type` | `available` or `wanted` | ✅ |
| `image` | file | Recommended |
| `title` | string | Optional (AI fills) |
| `description` | string | Optional |
| `lat` | number | Optional |
| `lon` | number | Optional |
| `city` | string | Optional |
| `country` | string | Optional |
| `countryCode` | string | Optional |
| `aiAnalysis` | JSON string | Optional (from analyze) |
| `tags` | JSON array string | Optional |

### GET `/api/posts/:id`
### PATCH `/api/posts/:id` 🔒
### DELETE `/api/posts/:id` 🔒

### POST `/api/posts/:id/interest` 🔒
Toggle interest in a post (like "raise hand" for swap).
```json
{ "success": true, "isInterested": true, "interestedCount": 3 }
```

### PATCH `/api/posts/:id/mark-swapped` 🔒
```json
{ "swappedWithUserId": "optional_user_id" }
```

### GET `/api/posts/user/:userId`

---

## 🤖 AI Routes 🔒 (Rate limited: 10/min)

### POST `/api/ai/analyze` (multipart/form-data)
Upload image → get AI plant analysis + weather-aware care tips.

| Field | Type | Notes |
|---|---|---|
| `image` | file | Plant photo |
| `lat` | number | For weather context |
| `lon` | number | For weather context |
| `city` | string | Display name |
| `country` | string | Display name |

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://res.cloudinary.com/...",
  "weather": { "temperature": 28, "humidity": 85, "condition": "Partly Cloudy" },
  "analyzedAt": "2025-02-27T12:00:00Z",
  "data": {
    "species": "Ocimum basilicum",
    "commonName": "Sweet Basil",
    "localNames": ["Tulsi", "Basil"],
    "diagnosis": "Your basil looks generally healthy with good leaf color. Minor yellowing on lower leaves suggests slight overwatering.",
    "healthStatus": "attention_needed",
    "careLevel": "easy",
    "tips": [
      "Humidity is 85% today — hold off watering for 2 days",
      "Check undersides of leaves for whiteflies common in humid conditions",
      "Pinch off flower buds to encourage bushy leaf growth"
    ],
    "wateringFrequency": "Every 2-3 days",
    "sunlight": "Full sun, 6+ hours",
    "bestFor": "Beginner gardeners, Balcony/terrace, Kitchen garden",
    "emoji": "🌿",
    "tags": ["herb", "edible", "aromatic", "kitchen"],
    "funFact": "Basil is considered sacred in many Indian households and is often associated with the goddess Lakshmi."
  }
}
```

### POST `/api/ai/analyze-base64`
For mobile camera capture (no file upload needed).
```json
{
  "imageBase64": "data:image/jpeg;base64,...",
  "mimeType": "image/jpeg",
  "lat": 19.07, "lon": 72.87,
  "city": "Mumbai", "country": "India"
}
```

### POST `/api/ai/match` 🔒
Find smart swap partners for a post.
```json
{ "postId": "676abc..." }
```
**Response:**
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "post": { ...full post object... },
        "reason": "Both are easy-care tropical plants — perfect swap companions!",
        "matchScore": 92
      }
    ],
    "matchTip": "When swapping online, share a short video of your plant's roots for extra trust.",
    "totalCandidates": 43
  }
}
```

### GET `/api/ai/care-schedule?lat=&lon=` 🔒
Generate a personalized weekly care schedule for all your plants.

---

## 🌤️ Weather Routes

### GET `/api/weather/current?lat=&lon=`
```json
{
  "temperature": 28,
  "humidity": 85,
  "condition": "Partly Cloudy",
  "windspeed": 12,
  "precipitation": 0,
  "isRaining": false,
  "isHumid": true
}
```

### GET `/api/weather/geocode?lat=&lon=`
Reverse geocode to city name.
```json
{ "city": "Mumbai", "country": "India", "countryCode": "IN", "displayName": "Mumbai, India" }
```

### GET `/api/weather/search?q=Mumbai`
Search cities (for location picker).
```json
[
  { "name": "Mumbai", "country": "India", "countryCode": "IN", "lat": 19.07, "lon": 72.87, "displayName": "Mumbai, India" }
]
```

### GET `/api/weather/full?lat=&lon=`
Weather + location in one call. Use on app load.

---

## 👤 User Routes

### GET `/api/users/:id`
Public user profile.

### GET `/api/users/:id/posts?type=available&page=1`
All posts by a user.

### GET `/api/users/leaderboard/swappers?city=Mumbai`
Top 10 gardeners by swap count (global or city-filtered).

---

## 🗄️ MongoDB Schema Overview

### Post Object
```js
{
  _id, user, type, title, description, imageUrl,
  aiAnalysis: {
    species, commonName, localNames, diagnosis, healthStatus,
    careLevel, tips, wateringFrequency, sunlight, emoji, tags, funFact
  },
  weatherSnapshot: { temperature, humidity, condition, windspeed },
  location: {
    city, country, countryCode, displayName,
    coordinates: { type: "Point", coords: [lon, lat] }
  },
  interestedUsers, interestedCount,
  isActive, isSwapped, swappedAt,
  tags, createdAt, updatedAt
}
```

---

## 🌍 Recommended Frontend Flow (for Lovable)

```
1. App load
   → GET /api/weather/full?lat=&lon= (browser geolocation)
   → Store city + weather in state

2. Home Feed
   → GET /api/posts?feed=global (or nearby/city)
   → Connect Socket.io, join room
   → Listen for new_post events → prepend to feed

3. Create Post
   → POST /api/ai/analyze (upload image + location)
   → Show AI result card to user
   → User taps "Post as Available/Wanted"
   → POST /api/posts (with aiAnalysis JSON from previous step)

4. Find Matches
   → POST /api/ai/match { postId }
   → Show 3 match cards with reasons

5. Profile
   → GET /api/auth/me
   → GET /api/users/:id/posts
   → GET /api/ai/care-schedule?lat=&lon=
```

---

## 🚀 Deploy to Railway (Free)

```bash
# Push to GitHub, then connect Railway
# Set all .env variables in Railway dashboard
# Railway auto-detects Node.js and runs npm start
```

Or use **Render** (free tier, may sleep after inactivity).
