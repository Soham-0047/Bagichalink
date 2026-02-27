const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { uploadAvatar } = require("../config/cloudinary");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, location } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    const userData = { name, email, password };

    // Attach location if provided
    if (location) {
      userData.location = {
        city: location.city || "",
        country: location.country || "",
        countryCode: location.countryCode || "",
        coordinates: {
          type: "Point",
          coords: [location.lon || 0, location.lat || 0],
        },
      };
    }

    const user = await User.create(userData);
    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: "Welcome to BagichaLink! 🌿",
      token,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ success: false, message: "Registration failed. Please try again." });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const token = signToken(user._id);

    res.json({
      success: true,
      message: "Welcome back! 🌱",
      token,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
});

// ─── PATCH /api/auth/update-location ─────────────────────────────────────────
router.patch("/update-location", protect, async (req, res) => {
  try {
    const { city, country, countryCode, lat, lon } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        location: {
          city,
          country,
          countryCode,
          coordinates: {
            type: "Point",
            coords: [lon || 0, lat || 0],
          },
        },
      },
      { new: true }
    );

    res.json({ success: true, message: "Location updated.", user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update location." });
  }
});

// ─── PATCH /api/auth/update-profile ──────────────────────────────────────────
router.patch("/update-profile", protect, uploadAvatar.single("avatar"), async (req, res) => {
  try {
    const updates = {};

    if (req.body.name) updates.name = req.body.name;
    if (req.body.bio !== undefined) updates.bio = req.body.bio;
    if (req.body.feedPreference) updates.feedPreference = req.body.feedPreference;
    if (req.file) updates.avatar = req.file.path;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });

    res.json({ success: true, message: "Profile updated.", user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to update profile." });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post("/logout", protect, (req, res) => {
  // JWT is stateless — client just deletes the token
  res.json({ success: true, message: "Logged out successfully." });
});

module.exports = router;
