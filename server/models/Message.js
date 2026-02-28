const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Conversation participants
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Message content
    content: {
      type: String,
      required: true,
      trim: true,
    },

    // Reference to post (optional - for swap context)
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },

    // Read status
    isRead: {
      type: Boolean,
      default: false,
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

// Index for efficient conversation queries
messageSchema.index([
  { senderId: 1, recipientId: 1, createdAt: -1 },
  { recipientId: 1, senderId: 1, createdAt: -1 },
]);

module.exports = mongoose.model("Message", messageSchema);
