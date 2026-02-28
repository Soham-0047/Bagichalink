import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import LoadingBlob from "../components/LoadingBlob";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { useApp } from "../context/AppContext";

interface Conversation {
  userId: string;
  userName: string;
  userProfilePicture?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export const Conversations: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!currentUser) return;

      try {
        const response = await api.get("/messages/conversations");
        setConversations(response.data.data || []);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="flex items-center gap-4 bg-gradient-to-r from-green-600 to-green-500 text-white p-4">
          <button onClick={() => navigate(-1)} className="hover:bg-white/20 p-2 rounded">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold flex-1">Messages</h1>
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
      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-4 shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="hover:bg-white/20 p-2 rounded transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-sm text-green-50">Your conversations</p>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <MessageCircle size={48} className="mb-4 opacity-50" />
            <p className="text-center">
              <span className="block text-lg font-medium mb-2">No conversations yet</span>
              <span className="text-sm">
                Start a conversation by visiting a plant post or finding someone to chat with!
              </span>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <button
                key={conversation.userId}
                onClick={() => navigate(`/chat/${conversation.userId}`)}
                className="w-full text-left p-4 hover:bg-green-50 transition active:bg-green-100"
              >
                <div className="flex items-center gap-3">
                  {conversation.userProfilePicture ? (
                    <img
                      src={conversation.userProfilePicture}
                      alt={conversation.userName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">
                      {conversation.userName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {conversation.userName}
                      </h3>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="default" className="bg-red-500">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage || "No messages yet"}
                    </p>
                    {conversation.lastMessageTime && (
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(conversation.lastMessageTime).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
