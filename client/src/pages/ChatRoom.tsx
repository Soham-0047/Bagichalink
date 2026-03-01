import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import LoadingBlob from "../components/LoadingBlob";
import { Input } from "../components/ui/input";
import { useApp } from "../context/AppContext";
import { Send, ArrowLeft } from "lucide-react";

interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  postId?: string;
}

interface OtherUser {
  _id: string;
  name: string;
  avatar?: string;
  profilePicture?: string;
}

export const ChatRoom: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, socket } = useApp();
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const myId = currentUser?.id || (currentUser as any)?._id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (socket && myId) {
      socket.emit("user_connected", myId);
      socket.emit("join_user_room", myId);
    }
  }, [socket, myId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId || !myId) return;
      try {
        const [messagesRes, userRes] = await Promise.all([
          api.get(`/messages/${userId}?page=1&limit=50`),
          api.get(`/users/${userId}`),
        ]);
        const messageList = messagesRes.data?.data || [];
        setMessages(Array.isArray(messageList) ? messageList : []);
        setOtherUser(userRes.data?.data || userRes.data);
      } catch (error) {
        console.error("Error fetching chat data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, myId]);

  useEffect(() => {
    if (!socket || !userId) return;
    const handleNewMessage = (message: Message) => {
      const senderStr  = String(message.senderId);
      const recipStr   = String(message.recipientId);
      const myIdStr    = String(myId);
      const otherIdStr = String(userId);
      const isThis =
        (senderStr === otherIdStr && recipStr === myIdStr) ||
        (senderStr === myIdStr   && recipStr === otherIdStr);
      if (isThis) {
        setMessages((prev) => {
          const exists = prev.some((m) => String(m._id) === String(message._id));
          return exists ? prev : [...prev, message];
        });
      }
    };
    socket.on("new_message", handleNewMessage);
    return () => { socket.off("new_message", handleNewMessage); };
  }, [socket, userId, myId]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !userId || sending) return;
    setSending(true);
    const content = messageInput;
    setMessageInput("");
    try {
      const response = await api.post("/messages", { recipientId: userId, content });
      const saved: Message = response.data?.data;
      if (saved) {
        setMessages((prev) => {
          const exists = prev.some((m) => String(m._id) === String(saved._id));
          return exists ? prev : [...prev, saved];
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessageInput(content);
    } finally {
      setSending(false);
      // Re-focus input after send on mobile
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="flex items-center gap-4 bg-gradient-to-r from-green-600 to-green-500 text-white p-4">
          <button onClick={() => navigate(-1)} className="hover:bg-white/20 p-2 rounded">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold flex-1">Chat</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingBlob />
        </div>
      </div>
    );
  }

  return (
    /*
      Key fix: h-[100dvh] uses dynamic viewport height — on mobile this
      accounts for the browser chrome (address bar) appearing/disappearing.
      The input bar is sticky to the bottom of THIS container, not the window,
      so it never gets covered by the floating nav (which is hidden on chat rooms).
    */
    <div className="flex flex-col bg-white" style={{ height: '100dvh', maxHeight: '100dvh' }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center gap-3 bg-gradient-to-r from-green-600 to-green-500 text-white px-4 py-3 shadow-md"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <button
          onClick={() => navigate(-1)}
          className="hover:bg-white/20 p-2 rounded-full transition"
        >
          <ArrowLeft size={20} />
        </button>
        {/* Avatar */}
        {otherUser?.avatar || otherUser?.profilePicture ? (
          <img
            src={otherUser.avatar || otherUser.profilePicture}
            alt={otherUser.name}
            className="w-10 h-10 rounded-full object-cover border-2 border-white/30 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg flex-shrink-0">
            {(otherUser?.name || "U")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold leading-tight truncate">{otherUser?.name || "User"}</h1>
          <p className="text-xs text-green-100">Plant swapper</p>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50 px-4 py-3 space-y-3 overscroll-contain">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <span className="text-4xl mb-3 block">💬</span>
              <p className="font-medium text-sm">No messages yet</p>
              <p className="text-xs mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = String(message.senderId) === String(myId);
            return (
              <div key={message._id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  isOwn
                    ? "bg-green-500 text-white rounded-br-sm"
                    : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                }`}>
                  <p className="leading-relaxed break-words">{message.content}</p>
                  <p className={`text-[0.6rem] mt-1 text-right ${isOwn ? "text-green-100" : "text-gray-400"}`}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar — sticky to bottom of container ── */}
      <div
        className="flex-shrink-0 bg-white border-t border-gray-100 px-3 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-300 text-sm transition-all disabled:opacity-60"
          />
          <button
            onClick={handleSendMessage}
            disabled={sending || !messageInput.trim()}
            className="w-10 h-10 flex-shrink-0 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-all active:scale-90"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send size={16} />
            }
          </button>
        </div>
      </div>
    </div>
  );
};