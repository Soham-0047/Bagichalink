import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  logout as logoutApi,
  getUserPosts,
  getCareSchedule,
  updateProfile,
  deletePost,
  markSwapped,
} from '@/lib/api';
import LocationPill from '@/components/LocationPill';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import { cn } from '@/lib/utils';
import {
  ChevronDown, ChevronUp, MapPin, Edit2, LogOut,
  Leaf, RefreshCw, Trash2, CheckCircle2, Camera,
  Sprout, BarChart3, Calendar, X,
} from 'lucide-react';
import type { FeedType, Post, HealthStatus } from '@/types';
import confetti from 'canvas-confetti';

// ─── Health bar component ─────────────────────────────────────────────────────
const HealthOverview = ({ posts }: { posts: Post[] }) => {
  const healthy  = posts.filter(p => p.aiAnalysis?.healthStatus === 'healthy').length;
  const attention = posts.filter(p => p.aiAnalysis?.healthStatus === 'attention_needed').length;
  const critical  = posts.filter(p => p.aiAnalysis?.healthStatus === 'critical').length;
  const unknown   = posts.filter(p => !p.aiAnalysis?.healthStatus || p.aiAnalysis.healthStatus === 'unknown').length;
  const total = posts.length || 1;

  if (posts.length === 0) return null;

  return (
    <div className="bg-card rounded-card p-4 space-y-3">
      <p className="text-xs font-tag font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5" /> Garden Health
      </p>
      {/* Segmented bar */}
      <div className="flex rounded-full overflow-hidden h-2.5 gap-0.5">
        {healthy   > 0 && <div className="bg-green-400  transition-all" style={{ width: `${(healthy  /total)*100}%` }} />}
        {attention > 0 && <div className="bg-yellow-400 transition-all" style={{ width: `${(attention/total)*100}%` }} />}
        {critical  > 0 && <div className="bg-red-400    transition-all" style={{ width: `${(critical /total)*100}%` }} />}
        {unknown   > 0 && <div className="bg-gray-200   transition-all" style={{ width: `${(unknown  /total)*100}%` }} />}
      </div>
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Healthy',  count: healthy,   color: 'bg-green-400'  },
          { label: 'Needs care', count: attention, color: 'bg-yellow-400' },
          { label: 'Critical', count: critical,  color: 'bg-red-400'    },
        ].filter(s => s.count > 0).map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            <span className="text-xs font-tag text-muted-foreground">{s.count} {s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Garden plant card (profile-specific, with actions) ──────────────────────
const GardenCard = ({
  post,
  onView,
  onRescan,
  onMarkSwapped,
  onDelete,
}: {
  post: Post;
  onView: () => void;
  onRescan: () => void;
  onMarkSwapped: () => void;
  onDelete: () => void;
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ai = post.aiAnalysis;
  const healthColor =
    ai?.healthStatus === 'healthy'         ? 'bg-green-400'
    : ai?.healthStatus === 'attention_needed' ? 'bg-yellow-400'
    : ai?.healthStatus === 'critical'        ? 'bg-red-400'
    : 'bg-gray-300';

  return (
    <div className="bg-background rounded-card card-shadow overflow-hidden group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      {/* Image */}
      <div
        className="relative aspect-video cursor-pointer overflow-hidden"
        onClick={onView}
      >
        {post.imageUrl ? (
          <img
            src={post.imageUrl}
            alt={ai?.commonName || 'Plant'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-primary-light flex items-center justify-center text-4xl">
            {ai?.emoji || '🌿'}
          </div>
        )}

        {/* Health dot */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/85 backdrop-blur-sm rounded-full px-2.5 py-1">
          <span className={`w-2 h-2 rounded-full ${healthColor}`} />
          <span className="text-[10px] font-tag font-semibold capitalize">
            {(ai?.healthStatus || 'unknown').replace('_', ' ')}
          </span>
        </div>

        {/* Type */}
        <div className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full shadow ${
          post.type === 'available' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
        }`}>
          {post.type === 'available' ? '🌱 Available' : '🔍 Wanted'}
        </div>

        {/* Swapped overlay */}
        {post.isSwapped && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-full px-4 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-bold text-green-700">Swapped!</span>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-display text-base leading-tight">
            {ai?.emoji} {ai?.commonName || post.title || 'My Plant'}
          </h3>
          {(ai as any)?.species && (
            <p className="text-[11px] text-muted-foreground italic">{(ai as any).species}</p>
          )}
        </div>

        {/* Care pills */}
        {(ai?.wateringFrequency || ai?.sunlight) && (
          <div className="flex gap-1.5 flex-wrap">
            {ai?.wateringFrequency && (
              <span className="text-[10px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                💧 {ai.wateringFrequency}
              </span>
            )}
            {ai?.sunlight && (
              <span className="text-[10px] bg-yellow-50 text-yellow-700 rounded-full px-2 py-0.5">
                ☀️ {ai.sunlight}
              </span>
            )}
          </div>
        )}

        {/* Action row */}
        {!post.isSwapped ? (
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={onView}
              className="flex-1 py-1.5 text-[11px] font-semibold bg-primary-light text-foreground rounded-lg hover:bg-primary/20 transition-colors"
            >
              View
            </button>
            <button
              onClick={onRescan}
              title="Re-scan plant"
              className="w-8 h-7 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <button
              onClick={onMarkSwapped}
              title="Mark as swapped"
              className="w-8 h-7 flex items-center justify-center bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Delete post"
                className="w-8 h-7 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            ) : (
              <button
                onClick={onDelete}
                className="px-2 py-1 text-[10px] font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Confirm
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs text-green-600 font-semibold">Swap complete</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Care schedule ────────────────────────────────────────────────────────────
const CareSchedule = ({ location }: { location: any }) => {
  const [open, setOpen] = useState(false);
  const [schedule, setSchedule] = useState<Record<string, string[]>>({});
  const [tip, setTip] = useState('');
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const dayLabels: Record<string, string> = {
    monday:'Mon', tuesday:'Tue', wednesday:'Wed',
    thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun',
  };

  useEffect(() => {
    if (!open || !location || Object.keys(schedule).length > 0) return;
    setLoading(true);
    getCareSchedule({ lat: location.lat, lon: location.lon })
      .then(res => {
        const data = res.data?.data || res.data;
        setSchedule(data?.schedule || {});
        setTip(data?.weeklyTip || '');
        setAlerts(data?.urgentAlerts || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, location]);

  return (
    <div className="bg-card rounded-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3.5 flex items-center justify-between"
      >
        <span className="font-body font-semibold text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          AI Care Schedule 📅
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {alerts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                  {alerts.map((a, i) => (
                    <p key={i} className="text-xs text-red-700 font-body">⚠️ {a}</p>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                {days.map(day => {
                  const tasks = schedule[day] || [];
                  return (
                    <div key={day} className="flex items-start gap-3 py-1.5 border-b border-border last:border-0">
                      <span className="text-xs font-tag font-bold text-primary w-8 flex-shrink-0 pt-0.5">
                        {dayLabels[day]}
                      </span>
                      <div className="flex-1 space-y-0.5">
                        {tasks.length > 0
                          ? tasks.map((t, i) => (
                              <p key={i} className="text-xs text-muted-foreground font-body">{t}</p>
                            ))
                          : <p className="text-xs text-muted-foreground/50 font-body italic">Rest day 🌿</p>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>

              {tip && (
                <div className="bg-primary-light rounded-lg p-3">
                  <p className="text-xs font-body italic">💡 {tip}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Edit profile modal ───────────────────────────────────────────────────────
const EditProfileModal = ({
  user,
  onSave,
  onClose,
}: {
  user: any;
  onSave: (data: FormData) => Promise<void>;
  onClose: () => void;
}) => {
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '' });
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('bio', form.bio);
    const fileInput = document.getElementById('avatar-edit-input') as HTMLInputElement;
    if (fileInput?.files?.[0]) fd.append('avatar', fileInput.files[0]);
    await onSave(fd);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[900] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-background rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Edit Profile</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-light border-2 border-border overflow-hidden flex items-center justify-center text-2xl flex-shrink-0">
            {preview ? (
              <img src={preview} className="w-full h-full object-cover" alt="" />
            ) : user?.avatar ? (
              <img src={user.avatar} className="w-full h-full object-cover" alt="" />
            ) : (
              (user?.name || '?')[0]
            )}
          </div>
          <label className="flex items-center gap-2 text-sm font-body text-primary cursor-pointer hover:underline">
            <Camera className="w-4 h-4" />
            Change photo
            <input
              id="avatar-edit-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) { const r = new FileReader(); r.onload = ev => setPreview(ev.target?.result as string); r.readAsDataURL(f); }
              }}
            />
          </label>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-tag font-semibold text-muted-foreground">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full px-3 py-2.5 bg-card rounded-xl border border-border text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-tag font-semibold text-muted-foreground">Bio</label>
            <textarea
              value={form.bio}
              onChange={e => setForm({ ...form, bio: e.target.value })}
              rows={3}
              maxLength={200}
              className="mt-1 w-full px-3 py-2.5 bg-card rounded-xl border border-border text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-0.5">{form.bio.length}/200</p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-pill font-body font-semibold text-sm transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-card border border-border text-foreground rounded-pill font-body font-semibold text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Profile ─────────────────────────────────────────────────────────────
const Profile = () => {
  const navigate  = useNavigate();
  const { user, setUser, location, setLocation, feedType, setFeedType, fetchWeather } = useApp();

  const [activeTab,  setActiveTab]  = useState<'garden' | 'swaps'>('garden');
  const [userPosts,  setUserPosts]  = useState<Post[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showEditModal,     setShowEditModal]     = useState(false);

  const profileName = user?.name || 'Plant Lover';
  const bio = user?.bio || 'Growing my urban jungle one plant at a time 🌿';

  // ── Fetch user posts ───────────────────────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    const uid = user?._id || user?.id;
    if (!uid) return;
    setLoading(true);
    try {
      const res = await getUserPosts(uid);
      const list = res.data?.data?.posts || res.data?.posts || res.data?.data || res.data || [];
      setUserPosts(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Error fetching user posts:', e);
      setUserPosts([]);
    } finally {
      setLoading(false);
    }
  }, [user?._id, user?.id]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // ── Derived counts ─────────────────────────────────────────────────────────
  const activePosts    = userPosts.filter(p => !p.isSwapped);
  const swappedPosts   = userPosts.filter(p => p.isSwapped);
  const stats = {
    plants: activePosts.length,
    swaps:  swappedPosts.length,
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleMarkSwapped = async (postId: string) => {
    try {
      await markSwapped(postId);
      setUserPosts(prev => prev.map(p => p._id === postId ? { ...p, isSwapped: true } : p));
      setUser(prev => prev ? { ...prev, totalSwaps: (prev.totalSwaps || 0) + 1 } : prev);
      confetti({ particleCount: 120, spread: 80, colors: ['#5C7A4E','#C4714A','#D6E8C8','#F2D5C4'], origin: { y: 0.6 } });
    } catch (e) { console.error('Mark swapped error:', e); }
  };

  const handleDelete = async (postId: string) => {
    try {
      await deletePost(postId);
      setUserPosts(prev => prev.filter(p => p._id !== postId));
      setUser(prev => prev ? { ...prev, totalPosts: Math.max(0, (prev.totalPosts || 0) - 1) } : prev);
    } catch (e) { console.error('Delete error:', e); }
  };

  const handleRescan = (post: Post) => {
    navigate('/scan', { state: { rescanPost: post } });
  };

  const handleSaveProfile = async (formData: FormData) => {
    try {
      const res = await updateProfile(formData);
      setUser(res.data?.user || res.data?.data || res.data);
      setShowEditModal(false);
    } catch (e) { console.error('Update profile error:', e); }
  };

  const handleLogout = async () => {
    try { await logoutApi(); } catch {}
    localStorage.removeItem('bagichalink_token');
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 relative z-10">

      {/* ── Hero banner ── */}
      <div
        className="relative h-36"
        style={{ background: 'linear-gradient(135deg, hsl(105 40% 82%), hsl(36 33% 90%), hsl(155 35% 75%))' }}
      >
        {/* Decorative leaves */}
        <div className="absolute top-4 right-6 text-5xl opacity-20 select-none">🌿</div>
        <div className="absolute bottom-2 left-8 text-3xl opacity-15 select-none">🪴</div>

        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div
            className="w-24 h-24 rounded-full border-[3px] border-background shadow-xl bg-primary-light flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setShowEditModal(true)}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-display">{profileName[0]}</span>
            )}
          </div>
          {/* Edit overlay on avatar */}
          <button
            onClick={() => setShowEditModal(true)}
            className="absolute bottom-0 right-0 w-7 h-7 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center shadow-md"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-16 space-y-5">

        {/* ── Name + bio ── */}
        <div className="text-center space-y-1">
          <h1 className="font-display text-2xl">{profileName}</h1>
          <p className="text-sm text-muted-foreground italic font-body">{bio}</p>
          {location && (
            <div className="flex justify-center mt-2">
              <LocationPill city={location.city} countryCode={location.countryCode} size="sm" />
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '🌿', value: stats.plants, label: 'Active Plants' },
            { icon: '🔄', value: stats.swaps,  label: 'Swaps Done'   },
            { icon: '🏆', value: userPosts.length > 0 ? `#${Math.max(1, 100 - stats.swaps * 10)}` : '—', label: 'Rank' },
          ].map(s => (
            <div key={s.label} className="bg-background rounded-card card-shadow p-4 text-center space-y-1">
              <div className="text-lg">{s.icon}</div>
              <div className="font-display text-xl text-secondary">{s.value}</div>
              <div className="text-[0.65rem] font-tag text-muted-foreground leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Health overview ── */}
        {activePosts.length > 0 && <HealthOverview posts={activePosts} />}

        {/* ── Feed preference ── */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-tag">Show me:</p>
          <div className="flex gap-2">
            {(['global', 'nearby', 'city'] as FeedType[]).map(ft => (
              <button
                key={ft}
                onClick={() => setFeedType(ft)}
                className={cn('flex-1 py-2 rounded-pill text-sm font-tag font-medium transition-all',
                  feedType === ft
                    ? 'bg-forest text-forest-foreground'
                    : 'bg-card text-foreground border border-border hover:border-primary'
                )}
              >
                {ft === 'global' ? '🌍' : ft === 'nearby' ? '📍' : '🏙️'} {ft.charAt(0).toUpperCase() + ft.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Care schedule ── */}
        {location && <CareSchedule location={location} />}

        {/* ── Garden tabs ── */}
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-border">
            {([
              { key: 'garden', label: `My Garden`, icon: Sprout, count: stats.plants },
              { key: 'swaps',  label: 'Swapped',   icon: CheckCircle2, count: stats.swaps  },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'pb-2.5 text-sm font-body font-medium transition-colors flex items-center gap-1.5',
                  activeTab === tab.key
                    ? 'border-b-2 border-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full font-tag',
                  activeTab === tab.key ? 'bg-secondary/15 text-secondary' : 'bg-muted text-muted-foreground'
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground font-body">Loading your garden...</p>
            </div>
          ) : activeTab === 'garden' ? (
            activePosts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePosts.map(post => (
                  <GardenCard
                    key={post._id}
                    post={post}
                    onView={() => navigate(`/post/${post._id}`)}
                    onRescan={() => handleRescan(post)}
                    onMarkSwapped={() => handleMarkSwapped(post._id)}
                    onDelete={() => handleDelete(post._id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center text-4xl">🪴</div>
                <h2 className="font-display italic text-lg text-foreground">Your garden is empty</h2>
                <p className="text-sm text-muted-foreground text-center font-body max-w-xs">
                  Scan a plant and post it to start building your garden
                </p>
                <button
                  onClick={() => navigate('/scan')}
                  className="bg-secondary text-secondary-foreground rounded-pill px-6 py-3 font-body font-semibold transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" /> Scan My First Plant
                </button>
              </div>
            )
          ) : (
            swappedPosts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {swappedPosts.map(post => (
                  <GardenCard
                    key={post._id}
                    post={post}
                    onView={() => navigate(`/post/${post._id}`)}
                    onRescan={() => handleRescan(post)}
                    onMarkSwapped={() => {}}
                    onDelete={() => handleDelete(post._id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center text-4xl">🔄</div>
                <h2 className="font-display italic text-lg">No swaps yet</h2>
                <p className="text-sm text-muted-foreground text-center font-body max-w-xs">
                  Complete a swap and mark it here to track your history
                </p>
                <button
                  onClick={() => navigate('/matches')}
                  className="bg-secondary text-secondary-foreground rounded-pill px-6 py-3 font-body font-semibold transition-transform hover:scale-105 active:scale-95"
                >
                  Find Swap Matches ✨
                </button>
              </div>
            )
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-col gap-2 pt-2 pb-10">
          <button
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-card bg-card hover:bg-muted transition-colors text-sm font-body"
          >
            <MapPin className="w-4 h-4 text-muted-foreground" />
            Update Location
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-card bg-card hover:bg-muted transition-colors text-sm font-body"
          >
            <Edit2 className="w-4 h-4 text-muted-foreground" />
            Edit Profile
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-card bg-card hover:bg-red-50 transition-colors text-sm font-body text-red-500"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* ── Modals ── */}
      <LocationPermissionModal
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
      />
      {showEditModal && (
        <EditProfileModal
          user={user}
          onSave={handleSaveProfile}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

export default Profile;