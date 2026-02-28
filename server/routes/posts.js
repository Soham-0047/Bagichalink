const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const User = require("../models/User");
const { protect, optionalAuth } = require("../middleware/auth");
const { uploadPlant, deleteImage, uploadBufferToCloudinary } = require("../config/cloudinary");
const { getWeather } = require("../utils/weather");

// ─── GET /api/posts ───────────────────────────────────────────────────────────
// Public feed with filtering: global | city | nearby | type | search
router.get("/", optionalAuth, async (req, res) => {
  try {
    const {
      feed = "global",  // global | nearby | city
      type,            // available | wanted
      lat,
      lon,
      city,
      radius = 50000,  // meters (default 50km)
      search,
      tags,
      page = 1,
      limit = 20,
      healthStatus,
    } = req.query;

    const query = { isActive: true };

    // Feed filter
    if (feed === "nearby" && lat && lon) {
      query["location.coordinates"] = {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(lon), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      };
    } else if (feed === "city" && city) {
      query["location.city"] = { $regex: new RegExp(city, "i") };
    }
    // global: no filter

    // Type filter
    if (type && ["available", "wanted"].includes(type)) {
      query.type = type;
    }

    // Health filter
    if (healthStatus) {
      query["aiAnalysis.healthStatus"] = healthStatus;
    }

    // Tag filter
    if (tags) {
      const tagArr = tags.split(",").map((t) => t.trim());
      query.tags = { $in: tagArr };
    }

    // Search (species name, title, description)
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { title: regex },
        { "aiAnalysis.commonName": regex },
        { "aiAnalysis.species": regex },
        { description: regex },
        { tags: { $in: [regex] } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let posts = [];
    let total = 0;

    try {
      // Build the query - geospatial queries require special handling
      let dbQuery = Post.find(query);
      
      // For geospatial queries, we MUST specify sort before executing
      if (feed === "nearby" && lat && lon) {
        // Geospatial queries must be sorted
        dbQuery = dbQuery.sort({ "location.coordinates": 1 });
      } else {
        dbQuery = dbQuery.sort({ createdAt: -1 });
      }

      // Apply pagination
      dbQuery = dbQuery.skip(skip).limit(parseInt(limit));

      // Populate and execute
      dbQuery = dbQuery.populate("user", "name avatar location.city location.country location.countryCode");

      const postsResult = await dbQuery.exec();
      const totalResult = await Post.countDocuments(query);
      
      posts = postsResult;
      total = totalResult;
    } catch (queryErr) {
      console.error("Post query error:", queryErr.message);
      // If geospatial query fails, fall back to global feed
      if (feed === "nearby") {
        console.warn("Falling back to global feed due to geospatial query error");
        const fallbackQuery = { isActive: true };
        const [postsResult, totalResult] = await Promise.all([
          Post.find(fallbackQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate("user", "name avatar location.city location.country location.countryCode"),
          Post.countDocuments(fallbackQuery),
        ]);
        posts = postsResult;
        total = totalResult;
      } else {
        throw queryErr;
      }
    }

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
          hasMore: skip + posts.length < total,
        },
      },
    });
  } catch (err) {
    console.error("Get posts error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch posts." });
  }
});

// ─── POST /api/posts ──────────────────────────────────────────────────────────
// Create a new post (with image upload)
router.post("/", protect, uploadPlant.single("image"), async (req, res) => {
  try {
    const { type, title, description, lat, lon, city, country, countryCode, aiAnalysis, tags } = req.body;

    if (!type || !["available", "wanted"].includes(type)) {
      return res.status(400).json({ success: false, message: "Post type must be 'available' or 'wanted'." });
    }

    // Parse aiAnalysis if sent as string (from FormData)
    let parsedAI = {};
    try {
      parsedAI = typeof aiAnalysis === "string" ? JSON.parse(aiAnalysis) : (aiAnalysis || {});
    } catch (_) {}

    // Parse tags
    let parsedTags = [];
    try {
      parsedTags = typeof tags === "string" ? JSON.parse(tags) : (tags || []);
    } catch (_) {}

    // Fetch live weather snapshot at time of post
    let weatherSnapshot = {};
    if (lat && lon) {
      const weather = await getWeather(parseFloat(lat), parseFloat(lon));
      weatherSnapshot = {
        temperature: weather.temperature,
        humidity: weather.humidity,
        condition: weather.condition,
        windspeed: weather.windspeed,
      };
    }

    const postData = {
      user: req.user._id,
      type,
      title: title || parsedAI.commonName || parsedAI.species || "My Plant",
      description: description || "",
      aiAnalysis: parsedAI,
      weatherSnapshot,
      tags: parsedTags.length ? parsedTags : (parsedAI.tags || []),
      location: {
        city: city || "",
        country: country || "",
        countryCode: countryCode || "",
        displayName: city && country ? `${city}, ${country}` : city || country || "Unknown",
        coordinates: {
          type: "Point",
          coordinates: [parseFloat(lon) || 0, parseFloat(lat) || 0],
        },
      },
    };

    // Upload image to Cloudinary if provided
    if (req.file) {
      try {
        console.log("Uploading image to Cloudinary:", req.file.originalname, req.file.mimetype, "Size:", req.file.size);
        const uploaded = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype);
        console.log("Cloudinary upload successful:", uploaded.secure_url);
        postData.imageUrl = uploaded.secure_url;
        postData.imagePublicId = uploaded.public_id;
      } catch (uploadErr) {
        console.error("Cloudinary upload error (non-fatal):", uploadErr.message);
        // Don't fail the whole request, but log it
      }
    } else {
      console.warn("No image file provided in request");
    }

    const post = await Post.create(postData);
    await post.populate("user", "name avatar location.city location.country");

    // Update user's post count
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalPosts: 1 } });

    // 🔴 Emit realtime event to all relevant rooms
    const io = req.app.get("io");
    if (io) {
      const postData_emit = post.toJSON();
      io.to("global").emit("new_post", postData_emit);
      if (post.location?.city) {
        io.to(post.location.city.toLowerCase()).emit("new_post", postData_emit);
      }
    }

    res.status(201).json({
      success: true,
      message: "Post created! 🌿",
      data: post,
    });
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ success: false, message: "Failed to create post." });
  }
});

// ─── GET /api/posts/:id ───────────────────────────────────────────────────────
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "user", "name avatar bio location"
    );

    if (!post || !post.isActive) {
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch post." });
  }
});

// ─── PATCH /api/posts/:id ─────────────────────────────────────────────────────
router.patch("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only edit your own posts." });
    }

    const allowedFields = ["title", "description", "type", "isActive", "tags"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) post[field] = req.body[field];
    });

    await post.save();

    res.json({ success: true, message: "Post updated.", data: post });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update post." });
  }
});

// ─── DELETE /api/posts/:id ────────────────────────────────────────────────────
router.delete("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only delete your own posts." });
    }

    // Delete image from Cloudinary
    if (post.imagePublicId) {
      await deleteImage(post.imagePublicId);
    }

    await post.deleteOne();
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalPosts: -1 } });

    // Emit delete event
    const io = req.app.get("io");
    if (io) io.to("global").emit("delete_post", { postId: req.params.id });

    res.json({ success: true, message: "Post deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete post." });
  }
});

// ─── POST /api/posts/:id/interest ─────────────────────────────────────────────
// Toggle interest in a post (like a "raise hand" for swap)
router.post("/:id/interest", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });

    const userId = req.user._id;
    const alreadyInterested = post.interestedUsers.includes(userId);

    if (alreadyInterested) {
      post.interestedUsers.pull(userId);
      post.interestedCount = Math.max(0, post.interestedCount - 1);
    } else {
      post.interestedUsers.push(userId);
      post.interestedCount += 1;
    }

    await post.save();

    // Notify post owner in realtime
    const io = req.app.get("io");
    if (io && !alreadyInterested) {
      io.to("global").emit("post_interest", {
        postId: post._id,
        interestedCount: post.interestedCount,
        interestedBy: { id: req.user._id, name: req.user.name },
      });
    }

    res.json({
      success: true,
      message: alreadyInterested ? "Interest removed." : "Interest noted! 🌱",
      isInterested: !alreadyInterested,
      interestedCount: post.interestedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update interest." });
  }
});

// ─── PATCH /api/posts/:id/mark-swapped ────────────────────────────────────────
router.patch("/:id/mark-swapped", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    post.isSwapped = true;
    post.isActive = false;
    post.swappedAt = new Date();
    if (req.body.swappedWithUserId) post.swappedWith = req.body.swappedWithUserId;

    await post.save();
    await User.findByIdAndUpdate(req.user._id, { $inc: { totalSwaps: 1 } });

    res.json({ success: true, message: "Marked as swapped! 🎉", data: post });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to mark as swapped." });
  }
});

// ─── GET /api/posts/user/:userId ──────────────────────────────────────────────
router.get("/user/:userId", async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId, isActive: true })
      .sort({ createdAt: -1 })
      .populate("user", "name avatar location.city");

    res.json({ success: true, data: posts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch user posts." });
  }
});

module.exports = router;
