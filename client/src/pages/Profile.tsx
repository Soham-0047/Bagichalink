import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { logout as logoutApi, getUserPosts, getCareSchedule, updateProfile } from '@/lib/api';
import LocationPill from '@/components/LocationPill';
import PlantCardLarge from '@/components/PlantCardLarge';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, MapPin, Edit2, LogOut } from 'lucide-react';
import type { FeedType, Post } from '@/types';

const Profile = () => {
  const navigate = useNavigate();
  const { user, setUser, location, setLocation, feedType, setFeedType, fetchWeather } = useApp();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'plants' | 'swaps'>('plants');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [scheduleData, setScheduleData] = useState<{ day: string; task: string }[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', bio: '' });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const profileName = user?.name || 'Plant Lover';
  const bio = user?.bio || 'Growing my urban jungle one plant at a time 🌿';

  // Fetch user posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!user?._id && !user?.id) return;
      try {
        setLoading(true);
        const userId = user._id || user.id;
        const res = await getUserPosts(userId);
        setUserPosts(res.data?.posts || res.data?.data || []);
      } catch (e) {
        console.error('Error fetching user posts:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [user?._id, user?.id]);

  // Fetch care schedule
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!location) return;
      try {
        const res = await getCareSchedule({ lat: location.lat, lon: location.lon });
        const data = res.data?.schedule || [];
        if (Array.isArray(data) && data.length > 0) {
          setScheduleData(data);
        } else {
          // Fallback: generate based on watering frequency from posts
          generateDefaultSchedule();
        }
      } catch (e) {
        console.error('Error fetching care schedule:', e);
        generateDefaultSchedule();
      }
    };
    fetchSchedule();
  }, [location]);

  const generateDefaultSchedule = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const tasks = [
      'Water succulents & check soil',
      'Mist tropical plants',
      'Check for pests',
      'Rotate plants for light',
      'Deep water soil plants',
      'Fertilize if needed',
      'Prune dead leaves',
    ];
    setScheduleData(days.map((day, i) => ({ day, task: tasks[i] || 'Plant care check' })));
  };

  const handleLogout = async () => {
    try { await logoutApi(); } catch {}
    localStorage.removeItem('bagichalink_token');
    setUser(null);
    navigate('/login');
  };

  const handleUpdateLocation = () => {
    setShowLocationModal(true);
  };

  const handleLocationSelect = (city: string, country: string, countryCode: string, lat: number, lon: number) => {
    setLocation({ city, country, countryCode, lat, lon, displayName: `${city}, ${country}` });
    fetchWeather(lat, lon);
    setShowLocationModal(false);
  };

  const handleEditProfile = () => {
    setEditingProfile(true);
    setProfileForm({ name: user?.name || '', bio: user?.bio || '' });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAvatarPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const formData = new FormData();
      formData.append('name', profileForm.name);
      formData.append('bio', profileForm.bio);
      
      const fileInput = document.getElementById('avatar-input') as HTMLInputElement;
      if (fileInput?.files?.[0]) {
        formData.append('avatar', fileInput.files[0]);
      }

      const res = await updateProfile(formData);
      setUser(res.data?.user || res.data?.data);
      setEditingProfile(false);
      setAvatarPreview(null);
    } catch (e) {
      console.error('Error updating profile:', e);
    }
  };

  const completedSwaps = userPosts.filter(p => p.isSwapped);
  const activePostsCount = userPosts.filter(p => !p.isSwapped).length;
  const stats = {
    plants: activePostsCount,
    swaps: completedSwaps.length,
    rank: 0,
  };

  const handleInterest = () => {
    // Interest functionality for plant cards
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 relative z-10">
      <div className="relative h-40" style={{ background: 'linear-gradient(180deg, hsl(105 40% 85%), hsl(36 33% 96%))' }}>
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="w-24 h-24 rounded-full border-[3px] border-background shadow-lg bg-primary-light flex items-center justify-center overflow-hidden">
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
            ) : user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-display">{profileName[0]}</span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-16 space-y-6">
        {!editingProfile ? (
          <>
            <div className="text-center space-y-1">
              <h1 className="font-display text-2xl">{profileName}</h1>
              <p className="text-sm text-muted-foreground italic font-body">{bio}</p>
              {location && (
                <div className="flex justify-center mt-2">
                  <LocationPill city={location.city} countryCode={location.countryCode} size="sm" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '🌿', value: stats.plants, label: 'Plants' },
                { icon: '🔄', value: stats.swaps, label: 'Swaps' },
                { icon: '🏆', value: stats.rank ? `#${stats.rank}` : '—', label: 'Rank' },
              ].map((stat) => (
                <div key={stat.label} className="bg-background rounded-card card-shadow p-4 text-center space-y-1">
                  <div className="text-lg">{stat.icon}</div>
                  <div className="font-display text-xl text-secondary">{stat.value}</div>
                  <div className="text-[0.7rem] font-tag text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-tag">Show me:</p>
              <div className="flex gap-2">
                {(['global', 'nearby', 'city'] as FeedType[]).map((ft) => (
                  <button key={ft} onClick={() => setFeedType(ft)}
                    className={cn('flex-1 py-2 rounded-pill text-sm font-tag font-medium transition-all',
                      feedType === ft ? 'bg-forest text-forest-foreground' : 'bg-card text-foreground border border-border')}>
                    {ft === 'global' ? '🌍' : ft === 'nearby' ? '📍' : '🏙️'} {ft.charAt(0).toUpperCase() + ft.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-card overflow-hidden">
              <button onClick={() => setScheduleOpen(!scheduleOpen)} className="w-full px-4 py-3.5 flex items-center justify-between">
                <span className="font-body font-semibold text-sm">Your Plant Schedule 📅</span>
                {scheduleOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {scheduleOpen && (
                <div className="px-4 pb-4 space-y-2">
                  {scheduleData.length > 0 ? (
                    scheduleData.map((item) => (
                      <div key={item.day} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                        <span className="text-sm font-tag font-medium">{item.day}</span>
                        <span className="text-xs text-muted-foreground font-body">{item.task}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground py-2">Loading schedule...</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex gap-4 border-b border-border">
                {(['plants', 'swaps'] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={cn('pb-2 text-sm font-body font-medium transition-colors',
                      activeTab === tab ? 'border-b-2 border-secondary text-foreground' : 'text-muted-foreground')}>
                    {tab === 'plants' ? `My Plants (${stats.plants})` : `Completed Swaps (${stats.swaps})`}
                  </button>
                ))}
              </div>
              
              {loading ? (
                <div className="flex flex-col items-center py-12">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activeTab === 'plants' ? (
                userPosts.length > 0 && !userPosts.every(p => p.isSwapped) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userPosts.filter(p => !p.isSwapped).map((post) => (
                      <PlantCardLarge key={post._id} post={post} onInterest={handleInterest} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-12 space-y-3">
                    <div className="text-4xl">🪴</div>
                    <p className="text-sm text-muted-foreground font-body">No active plants posted</p>
                  </div>
                )
              ) : completedSwaps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedSwaps.map((post) => (
                    <PlantCardLarge key={post._id} post={post} onInterest={handleInterest} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-12 space-y-3">
                  <div className="text-4xl">🔄</div>
                  <p className="text-sm text-muted-foreground font-body">No completed swaps yet</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-card rounded-card p-6 space-y-4">
            <h2 className="font-display text-lg">Edit Profile</h2>
            
            <div className="space-y-2">
              <label className="text-xs font-tag font-semibold">Avatar</label>
              <input
                id="avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="w-full text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-tag font-semibold">Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-background rounded-lg border border-border text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-tag font-semibold">Bio</label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                className="w-full px-3 py-2 bg-background rounded-lg border border-border text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSaveProfile}
                className="flex-1 bg-secondary text-secondary-foreground rounded-pill py-2 font-body font-semibold text-sm transition-transform hover:scale-[1.02] active:scale-95"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                className="flex-1 bg-card text-foreground border border-border rounded-pill py-2 font-body font-semibold text-sm transition-transform hover:scale-[1.02] active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4 pb-8">
          <button onClick={handleUpdateLocation} className="flex items-center gap-2 px-4 py-2 rounded-pill bg-card hover:bg-background transition-colors">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-body">Update Location</span>
          </button>
          {!editingProfile && (
            <button onClick={handleEditProfile} className="flex items-center gap-2 px-4 py-2 rounded-pill bg-card hover:bg-background transition-colors">
              <Edit2 className="w-4 h-4" />
              <span className="text-sm font-body">Edit Profile</span>
            </button>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-pill bg-card hover:bg-background transition-colors text-danger">
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-body">Logout</span>
          </button>
        </div>
      </div>

      <LocationPermissionModal open={showLocationModal} onClose={() => setShowLocationModal(false)} />
    </div>
  );
};

export default Profile;