import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, Check, CheckCheck, Trash2, ArrowLeft } from "lucide-react";
import { getNotifications, markAllRead, markOneRead, deleteNotification } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { timeAgo } from "@/lib/helpers";

interface Notification {
  _id: string;
  type: "interest" | "new_message" | "new_post_city" | "match_found" | "swap_complete";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    _id: string;
    name: string;
    avatar?: string;
  };
  postId?: {
    _id: string;
    title?: string;
    imageUrl?: string;
    aiAnalysis?: { commonName?: string; emoji?: string };
  };
}

// ─── Icon + color per type ────────────────────────────────────────────────────
const typeConfig: Record<
  Notification["type"],
  { emoji: string; bg: string; border: string }
> = {
  interest:       { emoji: "🌿", bg: "bg-green-50",  border: "border-green-200" },
  new_message:    { emoji: "💬", bg: "bg-blue-50",   border: "border-blue-200"  },
  new_post_city:  { emoji: "📍", bg: "bg-yellow-50", border: "border-yellow-200"},
  match_found:    { emoji: "✨", bg: "bg-purple-50", border: "border-purple-200"},
  swap_complete:  { emoji: "🤝", bg: "bg-teal-50",  border: "border-teal-200"  },
};

// ─── Single notification card ─────────────────────────────────────────────────
const NotifCard = ({
  notif,
  onRead,
  onDelete,
  onNavigate,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (notif: Notification) => void;
}) => {
  const cfg = typeConfig[notif.type] || typeConfig.interest;

  return (
    <div
      className={`relative flex gap-3 p-4 rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-md active:scale-[0.99] ${
        notif.isRead
          ? "bg-white border-gray-100"
          : `${cfg.bg} ${cfg.border} shadow-sm`
      }`}
      onClick={() => {
        if (!notif.isRead) onRead(notif._id);
        onNavigate(notif);
      }}
    >
      {/* Unread dot */}
      {!notif.isRead && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500" />
      )}

      {/* Avatar / emoji */}
      <div className="flex-shrink-0">
        {notif.sender?.avatar ? (
          <img
            src={notif.sender.avatar}
            alt=""
            className="w-11 h-11 rounded-full object-cover"
          />
        ) : (
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl ${cfg.bg} border ${cfg.border}`}>
            {cfg.emoji}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-4">
        <p className={`text-sm font-semibold leading-snug ${notif.isRead ? "text-gray-700" : "text-gray-900"}`}>
          {notif.title}
        </p>
        <p className={`text-xs mt-0.5 leading-relaxed ${notif.isRead ? "text-gray-400" : "text-gray-600"}`}>
          {notif.body}
        </p>

        {/* Post thumbnail */}
        {notif.postId?.imageUrl && (
          <div className="mt-2 flex items-center gap-2">
            <img
              src={notif.postId.imageUrl}
              alt=""
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
            />
            <span className="text-xs text-gray-400 truncate">
              {notif.postId.aiAnalysis?.emoji}{" "}
              {notif.postId.aiAnalysis?.commonName || notif.postId.title}
            </span>
          </div>
        )}

        <p className="text-[11px] text-gray-400 mt-1.5">{timeAgo(notif.createdAt)}</p>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notif._id);
        }}
        className="absolute bottom-3 right-3 w-6 h-6 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const Notifications = () => {
  const navigate = useNavigate();
  const { socket, user } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      const data = res.data?.data;
      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unreadCount || 0);
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time: incoming notification via socket
  useEffect(() => {
    if (!socket) return;
    const handler = (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadCount((c) => c + 1);
    };
    socket.on("new_notification", handler);
    return () => { socket.off("new_notification", handler); };
  }, [socket]);

  const handleRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await markOneRead(id).catch(() => {});
  };

  const handleDelete = async (id: string) => {
    const notif = notifications.find((n) => n._id === id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (notif && !notif.isRead) setUnreadCount((c) => Math.max(0, c - 1));
    await deleteNotification(id).catch(() => {});
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await markAllRead().catch(() => {});
    setMarkingAll(false);
  };

  const handleNavigate = (notif: Notification) => {
    if (notif.type === "new_message" && notif.sender) {
      navigate(`/chat/${notif.sender._id}`);
    } else if (notif.postId?._id) {
      navigate(`/post/${notif.postId._id}`);
    }
  };

  const unread = notifications.filter((n) => !n.isRead);
  const read   = notifications.filter((n) => n.isRead);

  return (
    <div className="max-w-[480px] mx-auto pb-24 relative z-10">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm px-4 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-xs text-muted-foreground font-body">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-full transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-body">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 px-8 gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center">
            <BellOff className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="font-display italic text-lg text-center text-foreground">
            No notifications yet
          </h2>
          <p className="text-sm text-muted-foreground text-center font-body leading-relaxed">
            When someone is interested in your plant or sends you a message, you'll see it here.
          </p>
          <button
            onClick={() => navigate("/feed")}
            className="mt-2 bg-secondary text-secondary-foreground rounded-pill px-6 py-2.5 text-sm font-semibold transition-transform hover:scale-105 active:scale-95"
          >
            Browse Plants 🌿
          </button>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-6">
          {/* Unread section */}
          {unread.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                New
              </p>
              {unread.map((n) => (
                <NotifCard
                  key={n._id}
                  notif={n}
                  onRead={handleRead}
                  onDelete={handleDelete}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}

          {/* Read section */}
          {read.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                Earlier
              </p>
              {read.map((n) => (
                <NotifCard
                  key={n._id}
                  notif={n}
                  onRead={handleRead}
                  onDelete={handleDelete}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;