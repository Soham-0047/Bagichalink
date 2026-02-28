const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');
const { sendOTPEmail } = require('../utils/mailer');
const { uploadBufferToCloudinary } = require('../config/cloudinary');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit

// ── POST /api/auth/send-otp ───────────────────────────────────────────────────
// Step 1 of OTP flow: send OTP to email (for register or login)
router.post('/send-otp', async (req, res) => {
  try {
    const { email, purpose = 'register', name } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    // For login OTP: user must exist
    if (purpose === 'login') {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json({ success: false, message: 'No account found with this email.' });
      }
    }

    // For register OTP: email must not already exist
    if (purpose === 'register') {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }
    }

    // Delete any existing OTPs for this email+purpose
    await OTP.deleteMany({ email: email.toLowerCase(), purpose });

    const otp = generateOTP();

    await OTP.create({
      email: email.toLowerCase(),
      otp,
      purpose,
    });

    await sendOTPEmail(email, otp, name);

    res.json({
      success: true,
      message: `Verification code sent to ${email}`,
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
});

// ── POST /api/auth/verify-otp-login ──────────────────────────────────────────
// OTP-only login (no password needed)
router.post('/verify-otp-login', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      purpose: 'login',
      verified: false,
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'OTP not found. Please request a new one.' });
    }

    if (new Date() > otpRecord.expiresAt) {
      await otpRecord.deleteOne();
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // Mark as verified and delete
    await otpRecord.deleteOne();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const token = signToken(user._id);

    res.json({
      success: true,
      message: 'Logged in successfully! 🌿',
      token,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    console.error('OTP login error:', err);
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
});

// ── POST /api/auth/register-with-otp ─────────────────────────────────────────
// Complete registration after OTP verified
// ── POST /api/auth/register-with-otp ─────────────────────────────────────────
router.post('/register-with-otp', async (req, res) => {
  try {
    const { name, email, otp, password, location } = req.body;

    if (!name || !email || !otp) {
      return res.status(400).json({ success: false, message: 'Name, email, and OTP are required.' });
    }

    // DEBUG: log what we're searching for (remove after fix confirmed)
    console.log('Looking for OTP:', { email: email.toLowerCase(), purpose: 'register', otp });

    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      purpose: 'register',
    });

    // DEBUG: log what was found
    console.log('OTP record found:', otpRecord);

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found for this email. Please click "Send Verification Code" first.',
      });
    }

    if (new Date() > otpRecord.expiresAt) {
      await otpRecord.deleteOne();
      return res.status(400).json({
        success: false,
        message: 'OTP has expired (10 min limit). Please request a new one.',
      });
    }

    if (otpRecord.otp !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. Expected ${otpRecord.otp.length}-digit code.`,
      });
    }

    await otpRecord.deleteOne();

    const userData = {
      name,
      email,
      password: password || require('crypto').randomBytes(16).toString('hex'),
      isVerified: true,
    };

    if (location) {
      userData.location = {
        city: location.city || '',
        country: location.country || '',
        countryCode: location.countryCode || '',
        coordinates: {
          type: 'Point',
          coordinates: [location.lon || 0, location.lat || 0],
        },
      };
    }

    const user = await User.create(userData);
    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Welcome to BagichaLink! 🌿',
      token,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    console.error('Register with OTP error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/register (password-based, still works) ────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, location } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const userData = { name, email, password };
    if (location) {
      userData.location = {
        city: location.city || '',
        country: location.country || '',
        countryCode: location.countryCode || '',
        coordinates: { type: 'Point', coordinates: [location.lon || 0, location.lat || 0] },
      };
    }

    const user = await User.create(userData);
    const token = signToken(user._id);

    res.status(201).json({ success: true, token, user: user.toPublicJSON() });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed.' });
  }
});

// ── POST /api/auth/login (password-based, still works) ───────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);
    res.json({ success: true, token, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
});

// ── PATCH /api/auth/update-location ──────────────────────────────────────────
router.patch('/update-location', protect, async (req, res) => {
  try {
    const { city, country, countryCode, lat, lon } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { location: { city, country, countryCode, coordinates: { type: 'Point', coordinates: [lon || 0, lat || 0] } } },
      { new: true }
    );
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update location.' });
  }
});

// ── PATCH /api/auth/update-profile ───────────────────────────────────────────
router.patch('/update-profile', protect, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.bio !== undefined) updates.bio = req.body.bio;
    if (req.body.feedPreference) updates.feedPreference = req.body.feedPreference;

    // Upload avatar buffer to Cloudinary if provided
    if (req.file) {
      const uploaded = await uploadBufferToCloudinary(
        req.file.buffer,
        req.file.mimetype,
        'bagichalink/avatars'
      );
      updates.avatar = uploaded.secure_url;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', protect, (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;