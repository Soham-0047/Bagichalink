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

// ─── Allowed origins ──────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://bagichalink.netlify.app",  // production
  "http://localhost:8080",             // Vite default
  "http://localhost:3000",             // alternate
  "http://localhost:5173",             // Vite alternate
];

// Also allow any custom CLIENT_URL set in env (e.g. custom domain later)
if (process.env.CLIENT_URL && !ALLOWED_ORIGINS.includes(process.env.CLIENT_URL)) {
  ALLOWED_ORIGINS.push(process.env.CLIENT_URL);
}

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render self-ping)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`🚫 CORS blocked: ${origin}`);
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ─── Socket.io ───────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on("user_connected", (userId) => {
    socket.userId = String(userId);
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined personal room`);
  });

  socket.on("join_user_room", (userId) => {
    socket.userId = String(userId);
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined user room`);
  });

  socket.on("join_room", (room) => {
    socket.join(room);
    socket.join("global");
    console.log(`📍 ${socket.id} joined room: ${room}`);
  });

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
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight for ALL routes

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: "Too many requests, please try again." },
  skip: (req) => req.path.startsWith("/socket.io"),
});
app.use("/api", limiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: "AI rate limit hit. Please wait a moment." },
});

// ─── Health check ─────────────────────────────────────────────────────────────
// Before all other routes — never rate-limited, always fast
app.get("/health", (req, res) => {
  res.json({
    status:    "ok",
    uptime:    Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    db:        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🌿 BagichaLink API is running",
    version: "1.0.0",
  });
});

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth",          require("./routes/auth"));
app.use("/api/posts",         require("./routes/posts"));
app.use("/api/ai",            aiLimiter, require("./routes/ai"));
app.use("/api/weather",       require("./routes/weather"));
app.use("/api/users",         require("./routes/users"));
app.use("/api/featured",      require("./routes/featured"));
app.use("/api/messages",      require("./routes/messages"));
app.use("/api/notifications", require("./routes/notifications"));

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
      console.log(`🔒 Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);

      // ── Self-ping keep-alive (prevents Render free tier sleep) ─────────────
      if (process.env.NODE_ENV === "production" && process.env.RENDER_EXTERNAL_URL) {
        const PING_URL      = `${process.env.RENDER_EXTERNAL_URL}/health`;
        const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes

        const selfPing = async () => {
          try {
            const res  = await fetch(PING_URL, { signal: AbortSignal.timeout(10_000) });
            const data = await res.json();
            console.log(`🏓 Keep-alive OK — DB: ${data.db}, uptime: ${data.uptime}s`);
          } catch (err) {
            console.warn("🏓 Keep-alive ping failed:", err.message);
          }
        };

        setTimeout(() => {
          selfPing();
          setInterval(selfPing, PING_INTERVAL);
        }, 30_000);

        console.log(`🏓 Keep-alive scheduler started → ${PING_URL} every 14 min`);
      }
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = { app, io };