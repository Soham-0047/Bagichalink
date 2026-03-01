const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { uploadPlant, uploadBufferToCloudinary } = require("../config/cloudinary");
const { analyzePlant, findSmartMatches, generateCareSchedule } = require("../utils/gemini");
const { getWeather } = require("../utils/weather");
const Post = require("../models/Post");

// ─── In-memory per-user rate limit store ─────────────────────────────────────
// Structure: { userId: { endpoint: { count, resetAt } } }
// Simple Map — resets on server restart, good enough for free tier protection
const userLimits = new Map();

const LIMITS = {
  // endpoint        requests   window (ms)    friendly message
  analyze:    { max: 10,  window: 60 * 60 * 1000,  msg: "You've used all 10 plant scans for this hour. Try again in a bit! 🌿"      },
  match:      { max: 15,  window: 60 * 60 * 1000,  msg: "Match limit reached (15/hour). Come back soon for more matches! ✨"         },
  schedule:   { max: 5,   window: 60 * 60 * 1000,  msg: "Care schedule limit reached (5/hour). Your schedule is saved already! 📅"  },
};

/**
 * Per-user rate limiter middleware factory.
 * Completely skipped in development — no limits locally.
 *
 * @param {keyof LIMITS} endpoint
 */
const perUserLimit = (endpoint) => (req, res, next) => {
  // ── Skip entirely in local dev ────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") return next();

  const userId = String(req.user._id || req.user.id);
  const rule   = LIMITS[endpoint];
  const now    = Date.now();

  // Init user map if first request
  if (!userLimits.has(userId)) userLimits.set(userId, {});
  const userMap = userLimits.get(userId);

  // Init or reset window for this endpoint
  if (!userMap[endpoint] || now > userMap[endpoint].resetAt) {
    userMap[endpoint] = { count: 0, resetAt: now + rule.window };
  }

  userMap[endpoint].count++;

  // Set headers so client knows their remaining quota
  res.setHeader("X-RateLimit-Limit",     rule.max);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, rule.max - userMap[endpoint].count));
  res.setHeader("X-RateLimit-Reset",     Math.ceil(userMap[endpoint].resetAt / 1000));

  if (userMap[endpoint].count > rule.max) {
    const retryAfterSecs = Math.ceil((userMap[endpoint].resetAt - now) / 1000);
    res.setHeader("Retry-After", retryAfterSecs);
    return res.status(429).json({
      success: false,
      message: rule.msg,
      retryAfter: retryAfterSecs,
      limit: rule.max,
      windowHours: rule.window / (60 * 60 * 1000),
    });
  }

  next();
};

// ─── POST /api/ai/analyze ─────────────────────────────────────────────────────
router.post(
  "/analyze",
  protect,
  perUserLimit("analyze"),              // 10 scans/hour per user (prod only)
  uploadPlant.single("image"),
  async (req, res) => {
    try {
      const { lat, lon, city, country } = req.body;

      if (!req.file) {
        return res.status(400).json({ success: false, message: "Please provide an image file." });
      }

      let weather = null;
      if (lat && lon) weather = await getWeather(parseFloat(lat), parseFloat(lon));

      const location = {
        displayName: city && country ? `${city}, ${country}` : city || "your location",
      };

      const imageBase64 = req.file.buffer.toString("base64");
      const mimeType    = req.file.mimetype || "image/jpeg";

      const result = await analyzePlant({ imageBase64, mimeType, weather, location });

      let imageUrl      = null;
      let imagePublicId = null;
      try {
        const uploaded = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);
        imageUrl      = uploaded.secure_url;
        imagePublicId = uploaded.public_id;
      } catch (uploadErr) {
        console.error("Cloudinary upload error:", uploadErr.message);
      }

      res.json({
        success:    result.success,
        data:       result.data,
        imageUrl,
        imagePublicId,
        weather,
        analyzedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("AI analyze error:", err);
      res.status(500).json({ success: false, message: "Analysis failed. Please try again." });
    }
  }
);

// ─── POST /api/ai/analyze-base64 ─────────────────────────────────────────────
router.post(
  "/analyze-base64",
  protect,
  perUserLimit("analyze"),              // counts against same scan quota
  async (req, res) => {
    try {
      const { imageBase64, mimeType, lat, lon, city, country } = req.body;

      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ success: false, message: "imageBase64 and mimeType are required." });
      }

      let weather = null;
      if (lat && lon) weather = await getWeather(parseFloat(lat), parseFloat(lon));

      const location = { displayName: city && country ? `${city}, ${country}` : "your location" };
      const result   = await analyzePlant({ imageBase64, mimeType, weather, location });

      res.json({
        success:    result.success,
        data:       result.data,
        weather,
        analyzedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("AI base64 analyze error:", err);
      res.status(500).json({ success: false, message: "Analysis failed." });
    }
  }
);

// ─── POST /api/ai/match ───────────────────────────────────────────────────────
router.post(
  "/match",
  protect,
  perUserLimit("match"),                // 15 matches/hour per user (prod only)
  async (req, res) => {
    try {
      const { postId } = req.body;
      if (!postId) return res.status(400).json({ success: false, message: "postId is required." });

      const userPost = await Post.findById(postId);
      if (!userPost) return res.status(404).json({ success: false, message: "Post not found." });

      const allPosts = await Post.find({ isActive: true, user: { $ne: req.user._id } })
        .sort({ createdAt: -1 })
        .limit(50)
        .select("_id type title aiAnalysis location tags user");

      const result = await findSmartMatches({
        userPost,
        allPosts,
        userLocation: userPost.location?.displayName,
      });

      if (!result.success) {
        return res.status(500).json({ success: false, message: "Matching failed." });
      }

      const validMatches = result.data.matches.filter(
        (m) => m.postId && typeof m.postId === "string" && /^[0-9a-f]{24}$/i.test(m.postId)
      );

      if (validMatches.length === 0) {
        return res.json({
          success: true,
          data: { matches: [], matchTip: "No valid matches found at the moment." },
        });
      }

      const matchedPosts = await Post.find({ _id: { $in: validMatches.map((m) => m.postId) } })
        .populate("user", "name avatar location.city location.country");

      const enrichedMatches = validMatches
        .map((match) => {
          const post = matchedPosts.find((p) => p._id.toString() === match.postId);
          return post ? { post, reason: match.reason, matchScore: match.matchScore } : null;
        })
        .filter(Boolean);

      res.json({
        success: true,
        data: { matches: enrichedMatches, matchTip: result.data.matchTip },
      });
    } catch (err) {
      console.error("AI match error:", err);
      res.status(500).json({ success: false, message: "Matching failed." });
    }
  }
);

// ─── GET /api/ai/care-schedule ────────────────────────────────────────────────
router.get(
  "/care-schedule",
  protect,
  perUserLimit("schedule"),             // 5 schedules/hour per user (prod only)
  async (req, res) => {
    try {
      const { lat, lon } = req.query;
      const userPosts = await Post.find({
        user: req.user._id,
        isActive: true,
        type: "available",
      }).select("aiAnalysis title");

      if (!userPosts.length) {
        return res.json({ success: true, message: "No plants found.", data: null });
      }

      let weather = null;
      if (lat && lon) weather = await getWeather(parseFloat(lat), parseFloat(lon));

      const result = await generateCareSchedule({
        plants:   userPosts,
        weather,
        location: req.user.location,
      });

      res.json({ success: result.success, data: result.data });
    } catch (err) {
      console.error("Care schedule error:", err);
      res.status(500).json({ success: false, message: "Failed to generate care schedule." });
    }
  }
);

// ─── GET /api/ai/quota ────────────────────────────────────────────────────────
// Let the frontend check remaining quota without making a real AI call
router.get("/quota", protect, (req, res) => {
  // Always return full quota in dev
  if (process.env.NODE_ENV !== "production") {
    return res.json({
      success: true,
      dev: true,
      quota: {
        analyze:  { used: 0, max: LIMITS.analyze.max,  remaining: LIMITS.analyze.max  },
        match:    { used: 0, max: LIMITS.match.max,    remaining: LIMITS.match.max    },
        schedule: { used: 0, max: LIMITS.schedule.max, remaining: LIMITS.schedule.max },
      },
    });
  }

  const userId  = String(req.user._id || req.user.id);
  const userMap = userLimits.get(userId) || {};
  const now     = Date.now();

  const getQuota = (endpoint) => {
    const entry = userMap[endpoint];
    if (!entry || now > entry.resetAt) {
      return { used: 0, max: LIMITS[endpoint].max, remaining: LIMITS[endpoint].max };
    }
    return {
      used:      entry.count,
      max:       LIMITS[endpoint].max,
      remaining: Math.max(0, LIMITS[endpoint].max - entry.count),
      resetAt:   entry.resetAt,
    };
  };

  res.json({
    success: true,
    quota: {
      analyze:  getQuota("analyze"),
      match:    getQuota("match"),
      schedule: getQuota("schedule"),
    },
  });
});

module.exports = router;