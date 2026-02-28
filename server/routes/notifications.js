const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Fetch latest 30 notifications for the logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("sender", "name avatar")
      .populate("postId", "title aiAnalysis.commonName aiAnalysis.emoji imageUrl");

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({ success: true, data: { notifications, unreadCount } });
  } catch (err) {
    console.error("Get notifications error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch notifications." });
  }
});

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
router.patch("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to mark as read." });
  }
});

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
router.patch("/:id/read", protect, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to mark as read." });
  }
});

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────
router.delete("/:id", protect, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to delete notification." });
  }
});

// ─── Helper exported for other routes to call ────────────────────────────────
const createAndEmit = async (io, { recipient, sender, type, title, body, postId, messageId }) => {
  try {
    // Don't notify yourself
    if (String(recipient) === String(sender)) return;

    const notif = await Notification.create({
      recipient,
      sender,
      type,
      title,
      body,
      postId: postId || null,
      messageId: messageId || null,
    });

    const populated = await notif.populate("sender", "name avatar");

    if (io) {
      io.to(`user_${String(recipient)}`).emit("new_notification", populated);
    }

    return populated;
  } catch (err) {
    console.error("createAndEmit notification error:", err.message);
  }
};

module.exports = router;
module.exports.createAndEmit = createAndEmit;