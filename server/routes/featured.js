const express = require("express");
const router = express.Router();
const Post = require("../models/Post");

// ─── GET /api/featured/plant-of-the-day ─────────────────────────────────────
// Get one featured plant for the day (same for everyone, rotates daily)
router.get("/plant-of-the-day", async (req, res) => {
  try {
    // Use the date to seed a "random" selection that's consistent for 24 hours
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const seed = Math.floor(dayStart.getTime() / (24 * 60 * 60 * 1000)); // Days since epoch
    
    // Count total active posts
    const total = await Post.countDocuments({ isActive: true });
    if (total === 0) {
      return res.json({ success: true, data: null });
    }

    // Use seed to pick a consistent post for the day
    const skip = seed % total;
    
    const post = await Post.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(1)
      .populate("user", "name avatar location.city location.country location.countryCode");

    res.json({
      success: true,
      data: post,
    });
  } catch (err) {
    console.error("Plant of the day error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch plant of the day" });
  }
});

module.exports = router;
