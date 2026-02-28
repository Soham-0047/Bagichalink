export type FeedType = 'global' | 'nearby' | 'city';
export type PostType = 'all' | 'available' | 'wanted';
export type PostTypeFilter = PostType; // alias so FeedFilters.tsx import works

export type HealthStatus = 'healthy' | 'attention_needed' | 'critical' | 'unknown';

export interface Location {
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  displayName: string;
}

export interface Weather {
  temperature: number | null;
  humidity: number | null;
  condition: string;
  windspeed: number | null;
  isRaining: boolean;
  isHumid: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: Location;
  totalPosts: number;
  totalSwaps: number;
  // legacy shape support
  stats?: { plants: number; swaps: number; rank: number };
}

export interface AIAnalysis {
  // Flat shape (what backend actually returns)
  species?: string;
  commonName?: string;
  localNames?: string[];
  diagnosis?: string;
  healthStatus?: HealthStatus;
  careLevel?: 'easy' | 'moderate' | 'expert';
  tips?: string[];
  wateringFrequency?: string;
  sunlight?: string;
  bestFor?: string;
  emoji?: string;
  tags?: string[];
  funFact?: string;
}

export interface Post {
  _id: string;
  user: User;
  type: 'available' | 'wanted';
  title?: string;
  description?: string;
  imageUrl?: string;
  aiAnalysis?: AIAnalysis;
  weatherSnapshot?: {
    temperature: number;
    humidity: number;
    condition: string;
    windspeed: number;
  };
  location?: {
    city: string;
    country: string;
    countryCode: string;
    displayName: string;
  };
  interestedCount: number;
  isInterested?: boolean;
  isActive: boolean;
  isSwapped: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MatchResult {
  post: Post;
  reason: string;
  matchScore: number; // backend returns matchScore, not score
}

export interface CitySearchResult {
  name?: string;   // backend returns name
  city?: string;   // fallback
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  displayName?: string;
}