const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { uploadPlant, uploadBufferToCloudinary } = require("../config/cloudinary");
const { analyzePlant, findSmartMatches, generateCareSchedule } = require("../utils/gemini");
const { getWeather } = require("../utils/weather");
const Post = require("../models/Post");

// ─── POST /api/ai/analyze ─────────────────────────────────────────────────────
router.post("/analyze", protect, uploadPlant.single("image"), async (req, res) => {
  try {
    const { lat, lon, city, country } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please provide an image file." });
    }

    // 1. Fetch weather
    let weather = null;
    if (lat && lon) {
      weather = await getWeather(parseFloat(lat), parseFloat(lon));
    }

    const location = {
      displayName: city && country ? `${city}, ${country}` : city || "your location",
    };

    // 2. Send buffer directly to Gemini (no re-fetch from Cloudinary needed)
    const imageBase64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "image/jpeg";

    const result = await analyzePlant({ imageBase64, mimeType, weather, location });

    // 3. Upload to Cloudinary AFTER Gemini (so we always have the image URL)
    let imageUrl = null;
    let imagePublicId = null;
    try {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);
      imageUrl = uploaded.secure_url;
      imagePublicId = uploaded.public_id;
    } catch (uploadErr) {
      console.error("Cloudinary upload error:", uploadErr.message);
      // Don't fail the whole request — Gemini result is more important
    }

    res.json({
      success: result.success,
      data: result.data,
      imageUrl,
      imagePublicId,
      weather,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("AI analyze error:", err);
    res.status(500).json({ success: false, message: "Analysis failed. Please try again." });
  }
});

// ─── POST /api/ai/analyze-base64 ─────────────────────────────────────────────
router.post("/analyze-base64", protect, async (req, res) => {
  try {
    const { imageBase64, mimeType, lat, lon, city, country } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ success: false, message: "imageBase64 and mimeType are required." });
    }

    let weather = null;
    if (lat && lon) weather = await getWeather(parseFloat(lat), parseFloat(lon));

    const location = { displayName: city && country ? `${city}, ${country}` : "your location" };
    const result = await analyzePlant({ imageBase64, mimeType, weather, location });

    res.json({ success: result.success, data: result.data, weather, analyzedAt: new Date().toISOString() });
  } catch (err) {
    console.error("AI base64 analyze error:", err);
    res.status(500).json({ success: false, message: "Analysis failed." });
  }
});

// ─── POST /api/ai/match ───────────────────────────────────────────────────────
router.post("/match", protect, async (req, res) => {
  try {
    const { postId } = req.body;
    if (!postId) return res.status(400).json({ success: false, message: "postId is required." });

    const userPost = await Post.findById(postId);
    if (!userPost) return res.status(404).json({ success: false, message: "Post not found." });

    const allPosts = await Post.find({ isActive: true, user: { $ne: req.user._id } })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("_id type title aiAnalysis location tags user");

    const result = await findSmartMatches({ userPost, allPosts, userLocation: userPost.location?.displayName });

    if (!result.success) return res.status(500).json({ success: false, message: "Matching failed." });

    // Validate and filter match IDs - ensure they are valid ObjectIds
    const validMatches = result.data.matches.filter((m) => {
      // Check if postId is a valid MongoDB ObjectId (24 hex chars)
      return m.postId && typeof m.postId === 'string' && /^[0-9a-f]{24}$/i.test(m.postId);
    });

    if (validMatches.length === 0) {
      return res.json({ success: true, data: { matches: [], matchTip: "No valid matches found at the moment." } });
    }

    const matchedPosts = await Post.find({ _id: { $in: validMatches.map((m) => m.postId) } })
      .populate("user", "name avatar location.city location.country");

    const enrichedMatches = validMatches
      .map((match) => {
        const post = matchedPosts.find((p) => p._id.toString() === match.postId);
        return post ? { post, reason: match.reason, matchScore: match.matchScore } : null;
      })
      .filter(Boolean);

    res.json({ success: true, data: { matches: enrichedMatches, matchTip: result.data.matchTip } });
  } catch (err) {
    console.error("AI match error:", err);
    res.status(500).json({ success: false, message: "Matching failed." });
  }
});

// ─── GET /api/ai/care-schedule ────────────────────────────────────────────────
router.get("/care-schedule", protect, async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const userPosts = await Post.find({ user: req.user._id, isActive: true, type: "available" }).select("aiAnalysis title");

    if (!userPosts.length) return res.json({ success: true, message: "No plants found.", data: null });

    let weather = null;
    if (lat && lon) weather = await getWeather(parseFloat(lat), parseFloat(lon));

    const result = await generateCareSchedule({ plants: userPosts, weather, location: req.user.location });
    res.json({ success: result.success, data: result.data });
  } catch (err) {
    console.error("Care schedule error:", err);
    res.status(500).json({ success: false, message: "Failed to generate care schedule." });
  }
});

module.exports = router;