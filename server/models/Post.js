const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Post Type ────────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ["available", "wanted"],
      required: [true, "Post type is required"],
    },

    // ── Plant Info (from user + AI) ──────────────────────────────────────────
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    imageUrl: {
      type: String,
      default: null,
    },
    imagePublicId: {
      type: String, // Cloudinary public ID for deletion
      default: null,
    },

    // ── AI Analysis (from Gemini) ────────────────────────────────────────────
    aiAnalysis: {
      species: { type: String, default: "" },
      commonName: { type: String, default: "" },
      diagnosis: { type: String, default: "" },
      healthStatus: {
        type: String,
        enum: ["healthy", "attention_needed", "critical", "unknown"],
        default: "unknown",
      },
      tips: { type: [String], default: [] },
      emoji: { type: String, default: "🌿" },
      careLevel: {
        type: String,
        enum: ["easy", "moderate", "expert"],
        default: "moderate",
      },
      wateringFrequency: { type: String, default: "" },
      sunlight: { type: String, default: "" },
      analyzedAt: { type: Date, default: null },
    },

    // ── Weather at time of post (snapshot) ──────────────────────────────────
    weatherSnapshot: {
      temperature: { type: Number, default: null }, // Celsius
      humidity: { type: Number, default: null },    // %
      condition: { type: String, default: "" },      // e.g. "Partly Cloudy"
      windspeed: { type: Number, default: null },
    },

    // ── Location ─────────────────────────────────────────────────────────────
    location: {
      city: { type: String, default: "" },
      country: { type: String, default: "" },
      countryCode: { type: String, default: "" },
      displayName: { type: String, default: "" }, // "Mumbai, India"
      // GeoJSON for $near queries
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coords: {
          type: [Number], // [longitude, latitude]
          index: "2dsphere",
        },
      },
    },

    // ── Engagement ───────────────────────────────────────────────────────────
    interestedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    interestedCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    isSwapped: { type: Boolean, default: false },
    swappedAt: { type: Date, default: null },
    swappedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ── Tags (auto-generated from AI or user-added) ──────────────────────────
    tags: { type: [String], default: [] },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Geospatial index
postSchema.index({ "location.coordinates": "2dsphere" });
postSchema.index({ createdAt: -1 }); // For feed sorting
postSchema.index({ "location.city": 1, type: 1 });
postSchema.index({ tags: 1 });

// Virtual: is this post less than 24 hours old?
postSchema.virtual("isNew").get(function () {
  return Date.now() - this.createdAt < 24 * 60 * 60 * 1000;
});

module.exports = mongoose.model("Post", postSchema);
