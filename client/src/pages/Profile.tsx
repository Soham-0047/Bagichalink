import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { logout as logoutApi } from '@/lib/api';
import LocationPill from '@/components/LocationPill';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, MapPin, Edit2, LogOut } from 'lucide-react';
import type { FeedType } from '@/types';

const Profile = () => {
  const navigate = useNavigate();
  const { user, setUser, location, feedType, setFeedType } = useApp();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'plants' | 'swaps'>('plants');

  const profileName = user?.name || 'Plant Lover';
  const bio = user?.bio || 'Growing my urban jungle one plant at a time 🌿';
  const stats = {
    plants: user?.totalPosts ?? 0,
    swaps: user?.totalSwaps ?? 0,
    rank: 0,
  };

  const handleLogout = async () => {
    try { await logoutApi(); } catch {}
    localStorage.removeItem('bagichalink_token');
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="max-w-[480px] mx-auto pb-24 relative z-10">
      <div className="relative h-40" style={{ background: 'linear-gradient(180deg, hsl(105 40% 85%), hsl(36 33% 96%))' }}>
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="w-24 h-24 rounded-full border-[3px] border-background shadow-lg bg-primary-light flex items-center justify-center">
            {user?.avatar
              ? <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              : <span className="text-3xl font-display">{profileName[0]}</span>}
          </div>
        </div>
      </div>

      <div className="px-4 pt-16 space-y-6">
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
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm font-tag font-medium">{day}</span>
                  <span className="text-xs text-muted-foreground font-body">Check moisture levels</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex gap-4 border-b border-border">
            {(['plants', 'swaps'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn('pb-2 text-sm font-body font-medium transition-colors',
                  activeTab === tab ? 'border-b-2 border-secondary text-foreground' : 'text-muted-foreground')}>
                {tab === 'plants' ? 'My Plants' : 'Completed Swaps'}
              </button>
            ))}
          </div>
          <div className="flex flex-col items-center py-12 space-y-3">
            <div className="text-4xl">🪴</div>
            <p className="text-sm text-muted-foreground font-body">
              {activeTab === 'plants' ? 'No plants posted yet' : 'No completed swaps yet'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 pt-4 pb-8">
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-body">
            <MapPin className="w-3.5 h-3.5" /> Update Location
          </button>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-body">
            <Edit2 className="w-3.5 h-3.5" /> Edit Profile
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-body">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;