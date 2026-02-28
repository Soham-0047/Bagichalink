const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, // Never return password in queries
    },
    avatar: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      maxlength: 200,
      default: "",
    },

    // ── Location ────────────────────────────────────────────────────────────
    location: {
      city: { type: String, default: "" },
      country: { type: String, default: "" },
      countryCode: { type: String, default: "" }, // e.g. "IN", "US"
      // GeoJSON Point for MongoDB $near queries
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
      },
    },

    // ── Stats ────────────────────────────────────────────────────────────────
    totalPosts: { type: Number, default: 0 },
    totalSwaps: { type: Number, default: 0 },

    // ── Preferences ──────────────────────────────────────────────────────────
    feedPreference: {
      type: String,
      enum: ["global", "nearby", "city"],
      default: "global",
    },
    notificationsEnabled: { type: Boolean, default: true },

    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for geospatial queries
userSchema.index({ "location.coordinates": "2dsphere" });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Clean up output (remove sensitive fields)
userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    bio: this.bio,
    location: this.location,
    totalPosts: this.totalPosts,
    totalSwaps: this.totalSwaps,
    feedPreference: this.feedPreference,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
