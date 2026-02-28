import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../lib/api";
import LoadingBlob from "../components/LoadingBlob";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

// Fix Leaflet default icon
const DefaultIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom green icon for "available"
const AvailableIcon = L.divIcon({
  html: `<div style="
    background: #4ade80;
    border: 2px solid #16a34a;
    border-radius: 50% 50% 50% 0;
    width: 32px; height: 32px;
    transform: rotate(-45deg);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -34],
  className: "",
});

// Custom orange icon for "wanted"
const WantedIcon = L.divIcon({
  html: `<div style="
    background: #fb923c;
    border: 2px solid #ea580c;
    border-radius: 50% 50% 50% 0;
    width: 32px; height: 32px;
    transform: rotate(-45deg);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -34],
  className: "",
});

interface Post {
  _id: string;
  type: "available" | "wanted";
  title?: string;
  imageUrl?: string;
  location?: {
    city?: string;
    country?: string;
    displayName?: string;
    coordinates?: {
      type: string;
      coords?: [number, number];       // your model uses "coords"
      coordinates?: [number, number];  // fallback GeoJSON style
    };
  };
  user?: {
    _id: string;
    name: string;
    avatar?: string;
  };
  aiAnalysis?: {
    commonName?: string;
    emoji?: string;
    healthStatus?: string;
    careLevel?: string;
    diagnosis?: string;
  };
  tags?: string[];
  interestedCount?: number;
}

// ─── Helper: extract [lat, lng] from a post safely ───────────────────────────
const getLatLng = (post: Post): [number, number] | null => {
  const coords = post.location?.coordinates;
  if (!coords) return null;

  // Your MongoDB model stores as "coords" field
  const raw = coords.coords || coords.coordinates;
  if (!raw || raw.length < 2) return null;

  const lon = raw[0];
  const lat = raw[1];

  // Sanity check — valid lat/lon
  if (lat === 0 && lon === 0) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return [lat, lon]; // Leaflet wants [lat, lon]
};

// ─── Auto-fit map to markers ──────────────────────────────────────────────────
const FitBounds: React.FC<{ positions: [number, number][] }> = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 10);
    } else {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
};

// ─── Markers ──────────────────────────────────────────────────────────────────
const MapMarkers: React.FC<{ posts: Post[]; navigate: ReturnType<typeof useNavigate> }> = ({
  posts,
  navigate,
}) => {
  return (
    <>
      {posts.map((post) => {
        const latLng = getLatLng(post);
        if (!latLng) return null;

        const icon = post.type === "available" ? AvailableIcon : WantedIcon;
        const name = post.aiAnalysis?.commonName || post.title || "Plant";
        const emoji = post.aiAnalysis?.emoji || "🌿";
        const health = post.aiAnalysis?.healthStatus;

        return (
          <Marker key={post._id} position={latLng} icon={icon}>
            <Popup closeButton maxWidth={280}>
              <div className="min-w-[240px]">
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt={name}
                    className="w-full h-36 object-cover rounded-lg mb-3"
                  />
                )}

                {/* Header */}
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-2xl">{emoji}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-gray-800">{name}</h3>
                    <p className="text-xs text-gray-500">{post.user?.name || "Anonymous"}</p>
                  </div>
                  {/* Type badge */}
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      post.type === "available"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {post.type === "available" ? "Available" : "Wanted"}
                  </span>
                </div>

                {/* Health */}
                {health && (
                  <div className="flex items-center gap-1 mb-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        health === "healthy"
                          ? "bg-green-500"
                          : health === "attention_needed"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    />
                    <span className="text-xs text-gray-600 capitalize">
                      {health.replace("_", " ")}
                    </span>
                  </div>
                )}

                {/* Location */}
                <p className="text-xs text-gray-500 mb-1">
                  📍 {post.location?.displayName || post.location?.city || "Unknown"}
                </p>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {post.tags.slice(0, 3).map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => navigate(`/post/${post._id}`)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  View Details →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const PlantMapView: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "available" | "wanted">("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.get("/posts?feed=global&limit=100");
        const postList =
          response.data?.data?.posts ||
          response.data?.posts ||
          response.data ||
          [];

        if (!Array.isArray(postList)) {
          setPosts([]);
          return;
        }

        // Only keep posts that have valid coordinates
        const validPosts = postList.filter((post: Post) => getLatLng(post) !== null);
        console.log(`✅ ${validPosts.length}/${postList.length} posts have valid coordinates`);
        setPosts(validPosts);
      } catch (error) {
        console.error("Error fetching posts:", error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const filteredPosts = posts.filter((p) => filter === "all" || p.type === filter);
  const positions = filteredPosts.map((p) => getLatLng(p)!).filter(Boolean);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-green-500 text-white px-4 py-4 shadow-md">
        <h1 className="text-xl font-bold">🗺️ Plant Map</h1>
        <p className="text-xs text-green-100 mb-3">
          {posts.length} plants mapped worldwide
        </p>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "available", "wanted"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                filter === f
                  ? "bg-white text-green-700"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {f === "all" ? "All" : f === "available" ? "🟢 Available" : "🟠 Wanted"}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 px-4 py-2 bg-white border-b text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-400 border border-green-600 inline-block" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-400 border border-orange-600 inline-block" />
          Wanted
        </span>
        <span className="ml-auto text-gray-400">{filteredPosts.length} pins shown</span>
      </div>

      {/* Map */}
      <div className="flex-1 relative w-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <LoadingBlob />
          </div>
        )}
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={3}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {!loading && (
            <>
              <FitBounds positions={positions} />
              <MapMarkers posts={filteredPosts} navigate={navigate} />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};