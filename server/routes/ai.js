const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { uploadPlant } = require("../config/cloudinary");
const { analyzePlant, findSmartMatches, generateCareSchedule } = require("../utils/gemini");
const { getWeather } = require("../utils/weather");
const Post = require("../models/Post");

// ─── POST /api/ai/analyze ─────────────────────────────────────────────────────
// Analyze a plant image → return species, diagnosis, care tips
// Supports: image upload OR Cloudinary URL
router.post("/analyze", protect, uploadPlant.single("image"), async (req, res) => {
  try {
    const { lat, lon, imageUrl, city, country } = req.body;

    // Fetch live weather if location provided
    let weather = null;
    if (lat && lon) {
      weather = await getWeather(parseFloat(lat), parseFloat(lon));
    }

    const location = {
      displayName: city && country ? `${city}, ${country}` : city || "your location",
    };

    let analysisParams = { weather, location };

    if (req.file) {
      // Image uploaded directly → Cloudinary URL available
      analysisParams.imageUrl = req.file.path;
    } else if (imageUrl) {
      // Image URL provided (e.g. already uploaded Cloudinary URL)
      analysisParams.imageUrl = imageUrl;
    } else {
      return res.status(400).json({
        success: false,
        message: "Please provide an image file or imageUrl.",
      });
    }

    const result = await analyzePlant(analysisParams);

    res.json({
      success: result.success,
      data: result.data,
      imageUrl: req.file?.path || imageUrl,
      weather: weather,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("AI analyze error:", err);
    res.status(500).json({ success: false, message: "Analysis failed. Please try again." });
  }
});

// ─── POST /api/ai/analyze-url ─────────────────────────────────────────────────
// Lighter endpoint: analyze from base64 (for mobile direct camera capture)
router.post("/analyze-base64", protect, async (req, res) => {
  try {
    const { imageBase64, mimeType, lat, lon, city, country } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ success: false, message: "imageBase64 and mimeType are required." });
    }

    let weather = null;
    if (lat && lon) {
      weather = await getWeather(parseFloat(lat), parseFloat(lon));
    }

    const location = { displayName: city && country ? `${city}, ${country}` : "your location" };

    const result = await analyzePlant({ imageBase64, mimeType, weather, location });

    res.json({
      success: result.success,
      data: result.data,
      weather,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("AI base64 analyze error:", err);
    res.status(500).json({ success: false, message: "Analysis failed." });
  }
});

// ─── POST /api/ai/match ───────────────────────────────────────────────────────
// Find smart swap matches for a given post
router.post("/match", protect, async (req, res) => {
  try {
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({ success: false, message: "postId is required." });
    }

    // Get the user's post
    const userPost = await Post.findById(postId);
    if (!userPost) {
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    // Get recent active posts (exclude user's own + same type for sensible matching)
    const oppositeType = userPost.type === "available" ? "wanted" : "available";
    const allPosts = await Post.find({
      isActive: true,
      user: { $ne: req.user._id }, // Exclude own posts
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("_id type title aiAnalysis location tags user");

    const userLocation = userPost.location?.displayName;

    const result = await findSmartMatches({ userPost, allPosts, userLocation });

    if (!result.success) {
      return res.status(500).json({ success: false, message: "Matching failed. Try again." });
    }

    // Hydrate matched posts with full data
    const matchedPostIds = result.data.matches.map((m) => m.postId);
    const matchedPosts = await Post.find({ _id: { $in: matchedPostIds } })
      .populate("user", "name avatar location.city location.country");

    // Merge match reasons with post data
    const enrichedMatches = result.data.matches
      .map((match) => {
        const post = matchedPosts.find((p) => p._id.toString() === match.postId);
        if (!post) return null;
        return {
          post,
          reason: match.reason,
          matchScore: match.matchScore,
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      data: {
        matches: enrichedMatches,
        matchTip: result.data.matchTip,
        totalCandidates: allPosts.length,
      },
    });
  } catch (err) {
    console.error("AI match error:", err);
    res.status(500).json({ success: false, message: "Matching failed." });
  }
});

// ─── GET /api/ai/care-schedule ────────────────────────────────────────────────
// Generate a personalized weekly care schedule for the user's plants
router.get("/care-schedule", protect, async (req, res) => {
  try {
    const { lat, lon } = req.query;

    // Get user's active plants
    const userPosts = await Post.find({
      user: req.user._id,
      isActive: true,
      type: "available",
    }).select("aiAnalysis title");

    if (!userPosts.length) {
      return res.json({
        success: true,
        message: "No plants found. Share some plants first!",
        data: null,
      });
    }

    let weather = null;
    if (lat && lon) {
      weather = await getWeather(parseFloat(lat), parseFloat(lon));
    }

    const result = await generateCareSchedule({
      plants: userPosts,
      weather,
      location: req.user.location,
    });

    res.json({ success: result.success, data: result.data });
  } catch (err) {
    console.error("Care schedule error:", err);
    res.status(500).json({ success: false, message: "Failed to generate care schedule." });
  }
});

module.exports = router;
