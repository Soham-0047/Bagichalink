const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // ── Register user to their personal room ───────────────────────────────────
  socket.on("user_connected", (userId) => {
    socket.userId = String(userId);
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined personal room`);
  });

  // ── Explicit personal room join (belt + suspenders) ───────────────────────
  socket.on("join_user_room", (userId) => {
    socket.userId = String(userId);
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined user room`);
  });

  // ── Join feed/city room ────────────────────────────────────────────────────
  socket.on("join_room", (room) => {
    socket.join(room);
    socket.join("global");
    console.log(`📍 ${socket.id} joined room: ${room}`);
  });

  // ── Send message via socket (backup — REST is primary) ────────────────────
  socket.on("send_message", async (data) => {
    try {
      const { recipientId, content, postId, senderId: clientSenderId } = data;
      const senderId = socket.userId || clientSenderId;

      if (!senderId || !recipientId || !content) {
        socket.emit("error", "Missing required fields");
        return;
      }

      const Message = require("./models/Message");
      const message = await Message.create({
        senderId,
        recipientId,
        content,
        postId: postId || null,
      });

      const payload = {
        _id:         message._id,
        senderId:    message.senderId,
        recipientId: message.recipientId,
        content:     message.content,
        isRead:      message.isRead,
        createdAt:   message.createdAt,
        postId:      message.postId,
      };

      io.to(`user_${recipientId}`).emit("new_message", payload);
      io.to(`user_${senderId}`).emit("new_message", payload);
      socket.emit("message_sent", { _id: message._id, success: true });
    } catch (error) {
      console.error("Socket message error:", error.message);
      socket.emit("error", "Failed to send message");
    }
  });

  // ── Mark message as read ───────────────────────────────────────────────────
  socket.on("mark_read", async (messageId) => {
    try {
      const Message = require("./models/Message");
      await Message.findByIdAndUpdate(messageId, { isRead: true });
      io.emit("message_read", { messageId, isRead: true });
    } catch (error) {
      console.error("Mark read error:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // raised from 100 — socket polling was exhausting the limit
  message: { success: false, message: "Too many requests, please try again." },
  skip: (req) => req.path.startsWith("/socket.io"), // never limit socket polling
});
app.use("/api", limiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: "AI rate limit hit. Please wait a moment." },
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/posts",    require("./routes/posts"));
app.use("/api/ai",       aiLimiter, require("./routes/ai"));
app.use("/api/weather",  require("./routes/weather"));
app.use("/api/users",    require("./routes/users"));
app.use("/api/featured", require("./routes/featured"));
app.use("/api/messages", require("./routes/messages"));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🌿 BagichaLink API is running",
    version: "1.0.0",
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ─── MongoDB + Start ──────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 BagichaLink server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = { app, io };