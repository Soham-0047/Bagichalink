const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "interest",       // someone expressed interest in your plant
        "new_message",    // someone sent you a message
        "new_post_city",  // new plant posted in your city
        "match_found",    // AI found a match for your plant
        "swap_complete",  // a swap was marked complete
      ],
      required: true,
    },
    // Human-readable text
    title: { type: String, required: true },
    body:  { type: String, required: true },

    // References
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },

    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);