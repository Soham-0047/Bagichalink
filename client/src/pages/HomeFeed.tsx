import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { getPosts, expressInterest } from '@/lib/api';
import LocationPill from '@/components/LocationPill';
import WeatherBanner from '@/components/WeatherBanner';
import FeedFilters from '@/components/FeedFilters';
import PlantCardLarge from '@/components/PlantCardLarge';
import PlantCardSmall from '@/components/PlantCardSmall';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import type { Post } from '@/types';
import { Leaf } from 'lucide-react';

const HomeFeed = () => {
  const { location, feedType, postType, setFeedType, setPostType, locationPermissionAsked, setNewPostCallback } = useApp();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newPostToast, setNewPostToast] = useState<Post | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { feed: feedType, page: 1, limit: 20 };
      if (postType !== 'all') params.type = postType;
      if (feedType === 'nearby' && location) { params.lat = location.lat; params.lon = location.lon; }
      if (feedType === 'city' && location) { params.city = location.city; }
      const res = await getPosts(params);
      setPosts(res.data?.data?.posts || res.data?.posts || res.data || []);
    } catch (e) {
      console.error('Feed fetch error:', e);
      setPosts([]);
    }
    setLoading(false);
  }, [feedType, postType, location]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    if (!locationPermissionAsked && !location) {
      const timer = setTimeout(() => setShowLocationModal(true), 800);
      return () => clearTimeout(timer);
    }
  }, [locationPermissionAsked, location]);

  useEffect(() => {
    setNewPostCallback((post: Post) => {
      setPosts((prev) => [post, ...prev]);
      setNewPostToast(post);
      setTimeout(() => setNewPostToast(null), 4000);
    });
    return () => setNewPostCallback(null);
  }, [setNewPostCallback]);

  const handleInterest = async (postId: string) => {
    try {
      const res = await expressInterest(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, isInterested: res.data?.isInterested ?? !p.isInterested, interestedCount: res.data?.interestedCount ?? p.interestedCount }
            : p
        )
      );
    } catch (e) { console.error('Interest error:', e); }
  };

  const renderBentoFeed = () => {
    if (posts.length === 0 && !loading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="text-7xl">🪴</div>
          <h2 className="font-display italic text-xl text-foreground">Your garden feed is quiet...</h2>
          <p className="text-sm text-muted-foreground text-center font-body">Be the first to share a plant in your city</p>
          <button className="bg-secondary text-secondary-foreground rounded-pill px-6 py-3 font-body font-semibold transition-transform hover:scale-105 active:scale-95">
            Share My First Plant 🌿
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 auto-rows-max">
        {posts.map((post, idx) => {
          // Every 3 items, insert weather banner
          if (idx > 0 && idx % 6 === 0) {
            return (
              <div key={`weather-${idx}`} className="col-span-1 md:col-span-2 lg:col-span-2">
                <WeatherBanner />
              </div>
            );
          }
          // Show all posts as large cards for better visibility
          return (
            <PlantCardLarge key={post._id} post={post} onInterest={handleInterest} />
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24 pt-4 relative z-10">
      <div className="flex items-center justify-between mb-4">
        {location ? (
          <LocationPill city={location.city} countryCode={location.countryCode} onClick={() => setShowLocationModal(true)} />
        ) : (
          <button onClick={() => setShowLocationModal(true)} className="bg-secondary text-secondary-foreground rounded-pill px-3 py-1.5 font-tag text-sm font-medium">
            📍 Set Location
          </button>
        )}
        <div className="w-8 h-8 rounded-full bg-card card-shadow flex items-center justify-center">
          <Leaf className="w-4 h-4 text-primary" />
        </div>
      </div>

      <div className="mb-4"><WeatherBanner /></div>

      <div className="mb-5">
        <FeedFilters feedType={feedType} postType={postType} onFeedTypeChange={setFeedType} onPostTypeChange={setPostType} />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center py-16 space-y-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground font-tag">Loading plants...</p>
          </div>
        ) : renderBentoFeed()}
      </div>

      {newPostToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-forest text-forest-foreground rounded-pill px-5 py-3 card-shadow flex items-center gap-3 animate-fade-up max-w-[440px]">
          <span className="text-sm font-body">🌿 New plant shared in {newPostToast.location?.city}</span>
          <button onClick={() => setNewPostToast(null)} className="text-xs font-tag font-semibold underline">View</button>
        </div>
      )}

      <LocationPermissionModal open={showLocationModal} onClose={() => setShowLocationModal(false)} />
    </div>
  );
};

export default HomeFeed;