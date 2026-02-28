import React, { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../lib/api";
import LoadingBlob from "../components/LoadingBlob";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import type { Post } from "@/types";

// ─── Pulse + slide animations ─────────────────────────────────────────────────
const pulseStyle = `
  @keyframes mapPulse {
    0%   { transform: scale(1);   opacity: 0.6; }
    70%  { transform: scale(2.8); opacity: 0; }
    100% { transform: scale(1);   opacity: 0; }
  }
  @keyframes slideUp {
    from { transform: translateY(100%); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes fadeChip {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pulse-ring {
    position: absolute;
    border-radius: 50%;
    animation: mapPulse 2s ease-out infinite;
  }
  .bottom-sheet-anim {
    animation: slideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  }
  .stat-chip-anim {
    animation: fadeChip 0.4s ease both;
  }
`;

// ─── Helper: extract [lat, lon] from post ────────────────────────────────────
const getLatLng = (post: Post): [number, number] | null => {
  const coords = (post as any).location?.coordinates;
  if (!coords) return null;
  const raw = coords.coords || coords.coordinates;
  if (!raw || raw.length < 2) return null;
  const lon = raw[0], lat = raw[1];
  if (lat === 0 && lon === 0) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return [lat, lon];
};

const isNewPost = (post: Post) =>
  Date.now() - new Date(post.createdAt).getTime() < 24 * 60 * 60 * 1000;

// ─── Custom map pins ──────────────────────────────────────────────────────────
const makePin = (bg: string, border: string, pulse = false) =>
  L.divIcon({
    html: `
      <div style="position:relative;width:40px;height:40px;">
        ${
          pulse
            ? `<div class="pulse-ring" style="width:36px;height:36px;top:2px;left:2px;background:${bg};"></div>`
            : ""
        }
        <div style="
          position:absolute;top:4px;left:4px;
          width:32px;height:32px;
          background:${bg};
          border:2.5px solid ${border};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 3px 10px rgba(0,0,0,0.22);
        "></div>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -42],
    className: "",
  });

const UserPin = L.divIcon({
  html: `<div style="
    width:42px;height:42px;
    background:linear-gradient(135deg,#6366f1,#8b5cf6);
    border:3px solid #fff;
    border-radius:50%;
    box-shadow:0 0 0 5px rgba(99,102,241,0.25), 0 4px 14px rgba(0,0,0,0.25);
    display:flex;align-items:center;justify-content:center;
    font-size:20px;line-height:1;
  ">🧑‍🌾</div>`,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  className: "",
});

// ─── FlyTo controller ─────────────────────────────────────────────────────────
const FlyToLocation: React.FC<{ target: [number, number] | null }> = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 13, { duration: 1.6 });
  }, [target, map]);
  return null;
};

// ─── FitBounds (runs once after load) ────────────────────────────────────────
const FitBounds: React.FC<{ positions: [number, number][]; done: boolean }> = ({
  positions,
  done,
}) => {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !done || positions.length === 0) return;
    fitted.current = true;
    if (positions.length === 1) map.setView(positions[0], 10);
    else map.fitBounds(positions, { padding: [55, 55] });
  }, [positions, done, map]);
  return null;
};

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────
const BottomSheet: React.FC<{
  post: Post | null;
  onClose: () => void;
  navigate: ReturnType<typeof useNavigate>;
}> = ({ post, onClose, navigate }) => {
  if (!post) return null;
  const ai = post.aiAnalysis;
  const health = ai?.healthStatus;
  const healthColor =
    health === "healthy"
      ? "#22c55e"
      : health === "attention_needed"
      ? "#f59e0b"
      : health === "critical"
      ? "#ef4444"
      : "#94a3b8";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[900] bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[1000] bottom-sheet-anim max-w-[520px] mx-auto">
        <div className="bg-white rounded-t-3xl shadow-2xl overflow-hidden">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Image */}
          {post.imageUrl && (
            <div className="relative mx-4 mb-4 h-44 rounded-2xl overflow-hidden">
              <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
              <span
                className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full shadow-md ${
                  post.type === "available"
                    ? "bg-green-500 text-white"
                    : "bg-orange-500 text-white"
                }`}
              >
                {post.type === "available" ? "🌱 Available" : "🔍 Wanted"}
              </span>
              {isNewPost(post) && (
                <span className="absolute top-3 left-3 text-xs font-bold px-2 py-1 rounded-full bg-amber-400 text-amber-900 shadow-md">
                  ✨ New today
                </span>
              )}
            </div>
          )}

          <div className="px-5 pb-7 space-y-4">
            {/* Name + health */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {ai?.emoji || "🌿"} {ai?.commonName || post.title || "Plant"}
                </h2>
                {(ai as any)?.species && (
                  <p className="text-xs text-gray-400 italic mt-0.5">{(ai as any).species}</p>
                )}
              </div>
              {health && (
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 flex-shrink-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: healthColor }}
                  />
                  <span className="text-xs font-medium text-gray-600 capitalize whitespace-nowrap">
                    {health.replace(/_/g, " ")}
                  </span>
                </div>
              )}
            </div>

            {/* Poster */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700 text-sm flex-shrink-0">
                {(post.user?.name || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {post.user?.name || "Anonymous"}
                </p>
                <p className="text-xs text-gray-400">
                  📍 {(post as any).location?.displayName || (post as any).location?.city || "Unknown"}
                </p>
              </div>
            </div>

            {/* Care pills */}
            {(ai?.careLevel || ai?.wateringFrequency || ai?.sunlight) && (
              <div className="flex gap-2 flex-wrap">
                {ai?.careLevel && (
                  <span className="text-xs bg-green-50 text-green-700 border border-green-100 rounded-full px-3 py-1">
                    ⚡ {ai.careLevel} care
                  </span>
                )}
                {ai?.wateringFrequency && (
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1">
                    💧 {ai.wateringFrequency}
                  </span>
                )}
                {ai?.sunlight && (
                  <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-full px-3 py-1">
                    ☀️ {ai.sunlight}
                  </span>
                )}
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {post.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[11px] bg-gray-100 text-gray-500 rounded-full px-2.5 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Interested */}
            {(post.interestedCount || 0) > 0 && (
              <p className="text-xs text-gray-400">
                👀 {post.interestedCount} {post.interestedCount === 1 ? "person" : "people"} interested
              </p>
            )}

            {/* CTA */}
            <button
              onClick={() => {
                onClose();
                navigate(`/post/${post._id}`);
              }}
              className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-green-200 hover:shadow-xl transition-all hover:scale-[1.01] active:scale-[0.98]"
            >
              View Full Details →
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Stats Bar ────────────────────────────────────────────────────────────────
const StatsBar: React.FC<{ posts: Post[] }> = ({ posts }) => {
  const countries = new Set(
    posts.map((p) => (p as any).location?.countryCode).filter(Boolean)
  ).size;
  const available = posts.filter((p) => p.type === "available").length;
  const wanted = posts.filter((p) => p.type === "wanted").length;
  const newToday = posts.filter(isNewPost).length;

  const chips = [
    { icon: "🌍", value: countries, label: "countries" },
    { icon: "🌿", value: posts.length, label: "plants" },
    { icon: "🟢", value: available, label: "available" },
    { icon: "🟠", value: wanted, label: "wanted" },
    ...(newToday > 0 ? [{ icon: "✨", value: newToday, label: "new today" }] : []),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none px-4 py-2.5 bg-white border-b border-gray-100 shadow-sm">
      {chips.map((c, i) => (
        <div
          key={c.label}
          className="stat-chip-anim flex-shrink-0 flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <span className="text-sm">{c.icon}</span>
          <span className="text-xs font-bold text-gray-800">{c.value}</span>
          <span className="text-xs text-gray-400">{c.label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Map Markers ──────────────────────────────────────────────────────────────
const MapMarkers: React.FC<{
  posts: Post[];
  onSelect: (post: Post) => void;
}> = ({ posts, onSelect }) => (
  <>
    {posts.map((post) => {
      const latLng = getLatLng(post);
      if (!latLng) return null;
      const fresh = isNewPost(post);
      const icon =
        post.type === "available"
          ? makePin("#4ade80", "#16a34a", fresh)
          : makePin("#fb923c", "#ea580c", fresh);
      return (
        <Marker
          key={post._id}
          position={latLng}
          icon={icon}
          eventHandlers={{ click: () => onSelect(post) }}
        />
      );
    })}
  </>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
export const PlantMapView: React.FC = () => {
  const { location: userLocation } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "available" | "wanted">("all");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [userLatLng, setUserLatLng] = useState<[number, number] | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const navigate = useNavigate();

  // Inject CSS
  useEffect(() => {
    if (document.getElementById("map-pulse-style")) return;
    const el = document.createElement("style");
    el.id = "map-pulse-style";
    el.textContent = pulseStyle;
    document.head.appendChild(el);
  }, []);

  // Fetch posts
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/posts?feed=global&limit=100");
        const list =
          res.data?.data?.posts || res.data?.posts || res.data || [];
        const valid = Array.isArray(list)
          ? list.filter((p: Post) => getLatLng(p) !== null)
          : [];
        setPosts(valid);
      } catch (e) {
        console.error("Map fetch error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Seed from context
  useEffect(() => {
    if (userLocation?.lat && userLocation?.lon) {
      setUserLatLng([userLocation.lat, userLocation.lon]);
    }
  }, [userLocation]);

  // Near Me
  const handleNearMe = useCallback(() => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos: [number, number] = [coords.latitude, coords.longitude];
        setUserLatLng(pos);
        setFlyTarget(pos);
        setLocating(false);
      },
      () => {
        setLocating(false);
        if (userLocation?.lat && userLocation?.lon) {
          setFlyTarget([userLocation.lat, userLocation.lon]);
        }
      },
      { timeout: 8000 }
    );
  }, [userLocation]);

  const filteredPosts = posts.filter(
    (p) => filter === "all" || p.type === filter
  );
  const positions = filteredPosts
    .map((p) => getLatLng(p)!)
    .filter(Boolean) as [number, number][];

  return (
    <div className="flex flex-col h-screen bg-white relative overflow-hidden">

      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 via-green-600 to-emerald-500 text-white px-4 pt-4 pb-3 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">🗺️ Plant Map</h1>
            <p className="text-[11px] text-green-100 mt-0.5">
              {loading
                ? "Loading plants..."
                : `${posts.length} plants across ${
                    new Set(posts.map((p) => (p as any).location?.countryCode).filter(Boolean)).size
                  } countries`}
            </p>
          </div>
          {/* Near Me — desktop */}
          <button
            onClick={handleNearMe}
            disabled={locating}
            className="hidden sm:flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-full transition-all disabled:opacity-60 border border-white/30"
          >
            {locating ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              "📍"
            )}
            Plants Near Me
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "available", "wanted"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                filter === f
                  ? "bg-white text-green-700 shadow-sm"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              {f === "all"
                ? "🌐 All"
                : f === "available"
                ? "🟢 Available"
                : "🟠 Wanted"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      {!loading && <StatsBar posts={filteredPosts} />}

      {/* Map */}
      <div className="flex-1 relative w-full min-h-0">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 z-10 gap-3">
            <LoadingBlob />
            <p className="text-sm text-gray-500 font-medium animate-pulse">
              Mapping plants worldwide...
            </p>
          </div>
        )}

        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={3}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {!loading && (
            <>
              <FitBounds positions={positions} done={!loading} />
              <FlyToLocation target={flyTarget} />
              <MapMarkers posts={filteredPosts} onSelect={setSelectedPost} />
              {userLatLng && (
                <>
                  <Circle
                    center={userLatLng}
                    radius={1000}
                    pathOptions={{
                      color: "#6366f1",
                      fillColor: "#6366f1",
                      fillOpacity: 0.08,
                      weight: 1.5,
                      dashArray: "4 4",
                    }}
                  />
                  <Marker position={userLatLng} icon={UserPin} />
                </>
              )}
            </>
          )}
        </MapContainer>

        {/* Near Me — mobile FAB */}
        <button
          onClick={handleNearMe}
          disabled={locating}
          className="sm:hidden absolute bottom-6 right-4 z-[800] flex items-center gap-2 bg-white text-green-700 font-bold text-sm px-4 py-3 rounded-2xl shadow-xl border border-green-100 hover:shadow-2xl transition-all active:scale-95 disabled:opacity-60"
        >
          {locating ? (
            <span className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>📍</span>
          )}
          {locating ? "Locating..." : "Plants Near Me"}
        </button>

        {/* Legend */}
        <div className="absolute bottom-6 left-4 z-[800] bg-white/92 backdrop-blur-sm rounded-2xl px-3 py-2.5 shadow-lg border border-gray-100 space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Legend</p>
          {[
            { color: "bg-green-400 border-green-600", label: "Available" },
            { color: "bg-orange-400 border-orange-600", label: "Wanted" },
            { color: "bg-indigo-400 border-indigo-600", label: "You" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${l.color}`} />
              <span className="text-[11px] font-medium text-gray-600">{l.label}</span>
            </div>
          ))}
          <div className="pt-1 border-t border-gray-100">
            <span className="text-[10px] text-gray-400">✨ pulse = posted today</span>
          </div>
        </div>

        {/* Pin count */}
        <div className="absolute top-3 right-3 z-[800] bg-white/92 backdrop-blur-sm rounded-full px-3 py-1.5 shadow border border-gray-100">
          <span className="text-xs font-bold text-gray-700">
            {filteredPosts.length} {filteredPosts.length === 1 ? "pin" : "pins"}
          </span>
        </div>
      </div>

      {/* Bottom sheet */}
      <BottomSheet
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        navigate={navigate}
      />
    </div>
  );
};

export default PlantMapView;