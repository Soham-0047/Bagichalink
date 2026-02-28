import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { getMe, getFullWeather } from "@/lib/api";
import type { User, Location, Weather, FeedType, PostType, Post } from "@/types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

interface AppContextType {
  user: User | null;
  setUser: (u: User | null) => void;
  location: Location | null;
  setLocation: (l: Location | null) => void;
  weather: Weather | null;
  setWeather: (w: Weather | null) => void;
  feedType: FeedType;
  setFeedType: (f: FeedType) => void;
  postType: PostType;
  setPostType: (p: PostType) => void;
  locationPermissionAsked: boolean;
  setLocationPermissionAsked: (v: boolean) => void;
  fetchWeather: (lat: number, lon: number) => Promise<void>;
  socket: Socket | null;
  setNewPostCallback: (cb: ((post: Post) => void) | null) => void;
  isAuthenticated: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useState<Location | null>(() => {
    try {
      const saved = localStorage.getItem("bagichalink_location");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [weather, setWeather]   = useState<Weather | null>(null);
  const [feedType, setFeedType] = useState<FeedType>("global");
  const [postType, setPostType] = useState<PostType>("all");
  const [locationPermissionAsked, setLocationPermissionAsked] = useState(
    () => localStorage.getItem("bagichalink_loc_asked") === "true",
  );
  const [socket, setSocket] = useState<Socket | null>(null);
  const newPostCallbackRef  = useRef<((post: Post) => void) | null>(null);
  // Keep a ref so the connect handler always reads the latest user
  const userRef = useRef<User | null>(null);

  const isAuthenticated = !!user;

  // Keep userRef in sync
  useEffect(() => { userRef.current = user; }, [user]);

  // ── Load user on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("bagichalink_token");
    if (!token) return;
    getMe()
      .then((res) => setUser(res.data?.user || res.data))
      .catch(() => localStorage.removeItem("bagichalink_token"));
  }, []);

  // ── Persist location ──────────────────────────────────────────────────────
  useEffect(() => {
    if (location) localStorage.setItem("bagichalink_location", JSON.stringify(location));
  }, [location]);

  useEffect(() => {
    localStorage.setItem("bagichalink_loc_asked", String(locationPermissionAsked));
  }, [locationPermissionAsked]);

  // ── Socket — created once, uses ref to access latest user ────────────────
  useEffect(() => {
    const s = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000, // back off aggressively to avoid 429
    });

    const registerUser = () => {
      const uid = userRef.current?.id || (userRef.current as any)?._id;
      s.emit("join_room", "global");
      if (uid) {
        s.emit("user_connected", uid);
        s.emit("join_user_room", uid);
      }
    };

    s.on("connect", registerUser);

    s.on("new_post", (post: Post) => {
      newPostCallbackRef.current?.(post);
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, []); // runs once only

  // ── Re-register when user logs in after socket already connected ──────────
  useEffect(() => {
    if (!socket || !user?.id) return;
    const uid = user.id || (user as any)._id;
    socket.emit("user_connected", uid);
    socket.emit("join_user_room", uid);
    socket.emit("join_room", "global");
    if (location?.city) socket.emit("join_room", location.city.toLowerCase());
  }, [user?.id]); // only re-run when user id changes, NOT on socket change

  // ── Weather fetch ─────────────────────────────────────────────────────────
  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const res = await getFullWeather(lat, lon);
      const payload = res.data?.data || res.data;
      if (payload?.weather) setWeather(payload.weather);
      if (payload?.location) {
        setLocation({
          city: payload.location.city,
          country: payload.location.country,
          countryCode: payload.location.countryCode,
          lat,
          lon,
          displayName: payload.location.displayName,
        });
      }
    } catch (e) {
      console.error("Weather fetch failed:", e);
    }
  };

  const setNewPostCallback = (cb: ((post: Post) => void) | null) => {
    newPostCallbackRef.current = cb;
  };

  return (
    <AppContext.Provider value={{
      user, setUser,
      location, setLocation,
      weather, setWeather,
      feedType, setFeedType,
      postType, setPostType,
      locationPermissionAsked, setLocationPermissionAsked,
      fetchWeather,
      socket,
      setNewPostCallback,
      isAuthenticated,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
};

export { AppContext };