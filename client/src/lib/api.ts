import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bagichalink_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bagichalink_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const register = (data: {
  name: string; email: string; password: string;
  location?: { city: string; country: string; countryCode: string; lat: number; lon: number };
}) => api.post('/auth/register', data);

export const getMe = () => api.get('/auth/me');
export const updateLocation = (data: { city: string; country: string; countryCode: string; lat: number; lon: number }) =>
  api.patch('/auth/update-location', data);
export const updateProfile = (formData: FormData) =>
  api.patch('/auth/update-profile', formData);
export const logout = () => api.post('/auth/logout');

// ── Posts ─────────────────────────────────────────────────────────────────────
export const getPosts = (params: Record<string, unknown>) => api.get('/posts', { params });
export const getPost = (id: string) => api.get(`/posts/${id}`);
export const createPost = (formData: FormData) =>
  api.post('/posts', formData);
export const deletePost = (id: string) => api.delete(`/posts/${id}`);
export const expressInterest = (postId: string) => api.post(`/posts/${postId}/interest`);
export const markSwapped = (postId: string, swappedWithUserId?: string) =>
  api.patch(`/posts/${postId}/mark-swapped`, { swappedWithUserId });
export const getUserPosts = (userId: string) => api.get(`/posts/user/${userId}`);

// ── AI ────────────────────────────────────────────────────────────────────────
export const analyzePlant = (formData: FormData) =>
  api.post('/ai/analyze', formData);
export const getMatches = (postId: string) => api.post('/ai/match', { postId });
export const getCareSchedule = (params?: { lat?: number; lon?: number }) =>
  api.get('/ai/care-schedule', { params });

// ── Weather ───────────────────────────────────────────────────────────────────
export const getFullWeather = (lat: number, lon: number) =>
  api.get('/weather/full', { params: { lat, lon } });
export const searchCities = (q: string) => api.get('/weather/search', { params: { q } });

// ── OTP Auth (add to existing api.ts) ────────────────────────────────────────
export const sendOTP = (email: string, purpose: 'register' | 'login', name?: string) =>
  api.post('/auth/send-otp', { email, purpose, name });

export const verifyOTPLogin = (email: string, otp: string) =>
  api.post('/auth/verify-otp-login', { email, otp });

export const registerWithOTP = (data: {
  name: string;
  email: string;
  otp: string;
  password?: string;
  location?: { city: string; country: string; countryCode: string; lat: number; lon: number };
}) => api.post('/auth/register-with-otp', data);

// ── Featured ──────────────────────────────────────────────────────────────────
export const getPlantOfTheDay = () => api.get('/featured/plant-of-the-day');

// ─── ADD THESE to your existing api.ts ───────────────────────────────────────

// Notifications
export const getNotifications = () => api.get("/notifications");
export const markAllRead = () => api.patch("/notifications/read-all");
export const markOneRead = (id: string) => api.patch(`/notifications/${id}/read`);
export const deleteNotification = (id: string) => api.delete(`/notifications/${id}`);

export default api;