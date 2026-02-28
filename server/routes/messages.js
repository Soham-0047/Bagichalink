const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { protect } = require("../middleware/auth");

// ⚠️  ROUTE ORDER MATTERS — specific routes MUST come before /:userId wildcard

// ─── GET /api/messages/conversations ─────────────────────────────────────────
router.get("/conversations", protect, async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: req.user._id },
            { recipientId: req.user._id },
          ],
        },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", req.user._id] },
              "$recipientId",
              "$senderId",
            ],
          },
          lastMessage:     { $last: "$content" },
          lastMessageTime: { $last: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$recipientId", req.user._id] },
                    { $eq: ["$isRead", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageTime: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId:             "$_id",
          userName:           "$user.name",
          userProfilePicture: "$user.avatar",
          lastMessage:        1,
          lastMessageTime:    1,
          unreadCount:        1,
        },
      },
    ]);

    res.json({ success: true, data: conversations });
  } catch (err) {
    console.error("Get conversations error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch conversations." });
  }
});

// ─── POST /api/messages ───────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { recipientId, content, postId } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({
        success: false,
        message: "recipientId and content are required.",
      });
    }

    const message = await Message.create({
      senderId:    req.user._id,
      recipientId,
      content,
      postId: postId || null,
    });

    // Emit to both participants via socket
    const io = req.app.get("io");
    if (io) {
      io.to(`user_${recipientId}`).emit("new_message", message);
      io.to(`user_${String(req.user._id)}`).emit("new_message", message);
    }

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    console.error("Send message error:", err.message);
    res.status(500).json({ success: false, message: "Failed to send message." });
  }
});

// ─── GET /api/messages/:userId ────────────────────────────────────────────────
// ⚠️  MUST be last — wildcard will swallow /conversations and / if placed first
router.get("/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, recipientId: userId },
        { senderId: userId,        recipientId: req.user._id },
      ],
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Mark all received messages in this conversation as read
    await Message.updateMany(
      {
        recipientId: req.user._id,
        senderId:    userId,
        isRead:      false,
      },
      { isRead: true }
    );

    res.json({ success: true, data: messages });
  } catch (err) {
    console.error("Get messages error:", err.message);
    res.status(500).json({ success: false, message: "Failed to fetch messages." });
  }
});

module.exports = router;