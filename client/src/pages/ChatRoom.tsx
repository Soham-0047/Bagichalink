import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import LoadingBlob from "../components/LoadingBlob";
import { Button } from "../components/ui/button";
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

  // currentUser id — handles both {id} and {_id} shapes
  const myId = currentUser?.id || (currentUser as any)?._id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Register this socket with the server so DMs are delivered
  useEffect(() => {
    if (socket && myId) {
      socket.emit("user_connected", myId);
      socket.emit("join_user_room", myId);
    }
  }, [socket, myId]);

  // Fetch messages + other user info on mount
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

  // Listen for real-time incoming messages
  useEffect(() => {
    if (!socket || !userId) return;

    const handleNewMessage = (message: Message) => {
      const senderStr   = String(message.senderId);
      const recipStr    = String(message.recipientId);
      const myIdStr     = String(myId);
      const otherIdStr  = String(userId);

      const isThisConversation =
        (senderStr === otherIdStr && recipStr === myIdStr) ||
        (senderStr === myIdStr   && recipStr === otherIdStr);

      if (isThisConversation) {
        setMessages((prev) => {
          // Deduplicate by _id
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
      // Always use REST — guarantees persistence + triggers socket emit on server
      const response = await api.post("/messages", {
        recipientId: userId,
        content,
      });

      const saved: Message = response.data?.data;
      if (saved) {
        setMessages((prev) => {
          const exists = prev.some((m) => String(m._id) === String(saved._id));
          return exists ? prev : [...prev, saved];
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessageInput(content); // Restore on error
    } finally {
      setSending(false);
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
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-4 bg-gradient-to-r from-green-600 to-green-500 text-white p-4 shadow-md">
        <button
          onClick={() => navigate(-1)}
          className="hover:bg-white/20 p-2 rounded transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3 flex-1">
          {/* Avatar */}
          {otherUser?.avatar || otherUser?.profilePicture ? (
            <img
              src={otherUser.avatar || otherUser.profilePicture}
              alt={otherUser.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
              {(otherUser?.name || "U")[0].toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold leading-tight">{otherUser?.name || "User"}</h1>
            <p className="text-xs text-green-100">Plant swapper</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <span className="text-4xl mb-3 block">💬</span>
              <p className="font-medium">No messages yet</p>
              <p className="text-sm mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            // Robust own-message check — handles ObjectId vs string comparison
            const isOwnMessage =
              String(message.senderId) === String(myId);

            return (
              <div
                key={message._id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                    isOwnMessage
                      ? "bg-green-500 text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                  }`}
                >
                  <p className="leading-relaxed">{message.content}</p>
                  <p className={`text-[0.65rem] mt-1 text-right ${
                    isOwnMessage ? "text-green-100" : "text-gray-400"
                  }`}>
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2 items-center">
          <Input
            type="text"
            placeholder="Type a message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1 rounded-full border-gray-200 bg-gray-50 focus:bg-white"
          />
          <Button
            onClick={handleSendMessage}
            disabled={sending || !messageInput.trim()}
            className="bg-green-600 hover:bg-green-700 text-white rounded-full w-10 h-10 p-0 flex-shrink-0"
            size="icon"
          >
            {sending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Send size={16} />
            }
          </Button>
        </div>
      </div>
    </div>
  );
};