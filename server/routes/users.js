const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Post = require("../models/Post");
const { protect } = require("../middleware/auth");

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name avatar bio location totalPosts totalSwaps createdAt"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch user." });
  }
});

// ─── GET /api/users/:id/posts ─────────────────────────────────────────────────
router.get("/:id/posts", async (req, res) => {
  try {
    const { type, page = 1, limit = 12 } = req.query;
    const query = { user: req.params.id, isActive: true };
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [posts, total] = await Promise.all([
      Post.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Post.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        posts,
        pagination: { total, page: parseInt(page), hasMore: skip + posts.length < total },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch posts." });
  }
});

// ─── GET /api/users/leaderboard/swappers ─────────────────────────────────────
// Top gardeners by swap count (global or city)
router.get("/leaderboard/swappers", async (req, res) => {
  try {
    const { city } = req.query;
    const query = {};
    if (city) query["location.city"] = { $regex: new RegExp(city, "i") };

    const users = await User.find(query)
      .sort({ totalSwaps: -1, totalPosts: -1 })
      .limit(10)
      .select("name avatar location.city location.country totalPosts totalSwaps");

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch leaderboard." });
  }
});

module.exports = router;
