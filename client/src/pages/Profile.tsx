import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  logout as logoutApi, getUserPosts, getCareSchedule,
  updateProfile, deletePost, markSwapped,
} from '@/lib/api';
import api from '@/lib/api';
import LocationPill from '@/components/LocationPill';
import LocationPermissionModal from '@/components/LocationPermissionModal';
import { cn } from '@/lib/utils';
import {
  ChevronDown, MapPin, Edit2, LogOut, RefreshCw,
  Trash2, CheckCircle2, Camera, Sprout, BarChart3,
  Calendar, X, Trophy,
} from 'lucide-react';
import type { FeedType, Post } from '@/types';
import confetti from 'canvas-confetti';

// ── Inject animations once ────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById('profile-anim')) return;
  const el = document.createElement('style');
  el.id = 'profile-anim';
  el.textContent = `
    @keyframes fadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes popIn    { 0%{opacity:0;transform:scale(0.6) rotate(-8deg)} 70%{transform:scale(1.12) rotate(2deg)} 100%{opacity:1;transform:scale(1) rotate(0)} }
    @keyframes barGrow  { from{width:0!important} }
    @keyframes glow     { 0%,100%{box-shadow:0 0 0 0 rgba(92,122,78,.25)} 50%{box-shadow:0 0 0 7px rgba(92,122,78,0)} }
    @keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    .anim-fade-up  { animation: fadeUp  .45s ease both }
    .anim-pop      { animation: popIn   .55s cubic-bezier(.34,1.56,.64,1) both }
    .anim-bar      { animation: barGrow .9s  cubic-bezier(.34,1.56,.64,1) both }
    .anim-glow     { animation: glow    2s   ease-in-out infinite }
    .anim-shimmer  {
      background:linear-gradient(90deg,transparent 25%,rgba(255,255,255,.45) 50%,transparent 75%);
      background-size:200% 100%;
      animation:shimmer 1.6s infinite;
    }
    .scale-hover   { transition:transform .2s; }
    .scale-hover:hover { transform:translateY(-2px); }
  `;
  document.head.appendChild(el);
};

// ── Rank helper ───────────────────────────────────────────────────────────────
const getRankInfo = (r: number) => {
  if (r === 1) return { emoji:'🥇', label:'Top Gardener',  color:'text-yellow-600', bg:'bg-yellow-50 border-yellow-200' };
  if (r <= 3)  return { emoji:'🥈', label:'Elite Swapper', color:'text-slate-500',  bg:'bg-slate-50  border-slate-200'  };
  if (r <= 5)  return { emoji:'🥉', label:'Expert',        color:'text-orange-600', bg:'bg-orange-50 border-orange-200' };
  if (r <= 10) return { emoji:'🌟', label:'Rising Star',   color:'text-blue-600',   bg:'bg-blue-50   border-blue-200'   };
  return              { emoji:'🌱', label:'Gardener',      color:'text-green-600',  bg:'bg-green-50  border-green-200'  };
};

// ── Animated stat card ────────────────────────────────────────────────────────
const StatCard = ({ icon, value, label, delay=0, glow=false }:
  { icon:string; value:string|number; label:string; delay?:number; glow?:boolean }) => {
  const [vis, setVis] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const obs = new IntersectionObserver(([e])=>{ if(e.isIntersecting){setVis(true);obs.disconnect();} },{threshold:.2});
    if(ref.current) obs.observe(ref.current);
    return ()=>obs.disconnect();
  },[]);
  return (
    <div ref={ref}
      className={cn('rounded-2xl p-4 text-center space-y-1 border transition-all duration-300 scale-hover',
        glow ? 'bg-gradient-to-br from-secondary/20 to-primary/10 border-secondary/30 card-shadow anim-glow' : 'bg-background card-shadow border-border/50',
        vis ? 'anim-fade-up' : 'opacity-0')}
      style={{animationDelay:`${delay}ms`}}>
      <div className="text-xl">{icon}</div>
      <div className={cn('font-display text-2xl', glow?'text-secondary':'text-foreground',
        vis?'anim-pop':'opacity-0')} style={{animationDelay:`${delay+100}ms`}}>{value}</div>
      <div className="text-[0.65rem] font-tag text-muted-foreground leading-tight">{label}</div>
    </div>
  );
};

// ── Rank card ─────────────────────────────────────────────────────────────────
const RankCard = ({ rank, delay=0 }: { rank:number|null; delay?:number }) => {
  const [vis, setVis] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setVis(true),delay); return()=>clearTimeout(t); },[delay]);
  if (rank === null) return (
    <div className="rounded-2xl p-4 text-center space-y-1 bg-background card-shadow border border-border/50">
      <div className="text-xl">🏆</div>
      <div className="font-display text-2xl text-muted-foreground animate-pulse">…</div>
      <div className="text-[0.65rem] font-tag text-muted-foreground">Rank</div>
    </div>
  );
  const info = getRankInfo(rank);
  return (
    <div className={cn('rounded-2xl p-4 text-center space-y-1 border card-shadow scale-hover',
      info.bg, vis?'anim-pop':'opacity-0')}>
      <div className="text-xl">{info.emoji}</div>
      <div className={cn('font-display text-2xl font-bold', info.color)}>#{rank}</div>
      <div className="text-[0.6rem] font-tag text-muted-foreground leading-tight">{info.label}</div>
    </div>
  );
};

// ── Health bar ────────────────────────────────────────────────────────────────
const HealthOverview = ({ posts }: { posts:Post[] }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setMounted(true),400); return()=>clearTimeout(t); },[]);
  if (!posts.length) return null;
  const healthy  = posts.filter(p=>p.aiAnalysis?.healthStatus==='healthy').length;
  const attn     = posts.filter(p=>p.aiAnalysis?.healthStatus==='attention_needed').length;
  const critical = posts.filter(p=>p.aiAnalysis?.healthStatus==='critical').length;
  const total    = posts.length;
  return (
    <div className="bg-card rounded-2xl p-4 space-y-3 border border-border/50 anim-fade-up" style={{animationDelay:'200ms'}}>
      <p className="text-xs font-tag font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <BarChart3 className="w-3.5 h-3.5"/> Garden Health
      </p>
      <div className="flex rounded-full overflow-hidden h-3 bg-gray-100 gap-0.5">
        {healthy  >0&&<div className={cn('bg-green-400 rounded-full',mounted?'anim-bar':'')} style={{width:`${(healthy /total)*100}%`,animationDelay:'100ms'}}/>}
        {attn     >0&&<div className={cn('bg-yellow-400 rounded-full',mounted?'anim-bar':'')} style={{width:`${(attn    /total)*100}%`,animationDelay:'200ms'}}/>}
        {critical >0&&<div className={cn('bg-red-400 rounded-full',mounted?'anim-bar':'')} style={{width:`${(critical/total)*100}%`,animationDelay:'300ms'}}/>}
      </div>
      <div className="flex gap-4 flex-wrap">
        {[{label:'Healthy',count:healthy,c:'bg-green-400',t:'text-green-700'},
          {label:'Needs care',count:attn,c:'bg-yellow-400',t:'text-yellow-700'},
          {label:'Critical',count:critical,c:'bg-red-400',t:'text-red-700'}]
          .filter(s=>s.count>0).map(s=>(
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${s.c}`}/>
            <span className={`text-xs font-semibold ${s.t}`}>{s.count}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Garden card ───────────────────────────────────────────────────────────────
const GardenCard = ({post,delay=0,onView,onRescan,onMarkSwapped,onDelete}:{
  post:Post; delay?:number;
  onView:()=>void; onRescan:()=>void; onMarkSwapped:()=>void; onDelete:()=>void;
}) => {
  const [vis, setVis] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const obs = new IntersectionObserver(([e])=>{ if(e.isIntersecting){setVis(true);obs.disconnect();} },{threshold:.1});
    if(ref.current) obs.observe(ref.current);
    return ()=>obs.disconnect();
  },[]);
  const ai = post.aiAnalysis;
  const hc = ai?.healthStatus==='healthy'?'#4ade80':ai?.healthStatus==='attention_needed'?'#facc15':ai?.healthStatus==='critical'?'#f87171':'#d1d5db';
  return (
    <div ref={ref}
      className={cn('bg-background rounded-2xl overflow-hidden border border-border/50 card-shadow group',
        'transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/20',
        vis?'anim-fade-up':'opacity-0')}
      style={{animationDelay:`${delay}ms`}}>
      <div className="relative aspect-video cursor-pointer overflow-hidden" onClick={onView}>
        {post.imageUrl
          ? <img src={post.imageUrl} alt={ai?.commonName||'Plant'} loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
          : <div className="w-full h-full bg-gradient-to-br from-primary-light to-secondary/20 flex items-center justify-center text-5xl">{ai?.emoji||'🌿'}</div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"/>
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
          <span className="w-2 h-2 rounded-full" style={{background:hc}}/>
          <span className="text-[10px] font-bold text-white capitalize">{(ai?.healthStatus||'unknown').replace('_',' ')}</span>
        </div>
        <span className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md ${post.type==='available'?'bg-green-500 text-white':'bg-orange-500 text-white'}`}>
          {post.type==='available'?'🌱':'🔍'} {post.type}
        </span>
        {post.isSwapped&&(
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1">
            <CheckCircle2 className="w-10 h-10 text-green-400"/>
            <span className="text-sm font-bold text-white">Swapped!</span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-2.5">
        <div>
          <h3 className="font-display text-base leading-tight truncate">{ai?.emoji} {ai?.commonName||post.title||'My Plant'}</h3>
          {(ai as any)?.species&&<p className="text-[11px] text-muted-foreground italic truncate">{(ai as any).species}</p>}
        </div>
        {(ai?.wateringFrequency||ai?.careLevel)&&(
          <div className="flex gap-1.5 flex-wrap">
            {ai?.careLevel&&<span className="text-[10px] bg-primary-light text-foreground rounded-full px-2 py-0.5 font-medium">⚡ {ai.careLevel}</span>}
            {ai?.wateringFrequency&&<span className="text-[10px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">💧 {ai.wateringFrequency}</span>}
          </div>
        )}
        {!post.isSwapped&&(
          <div className="flex gap-1.5 pt-0.5">
            <button onClick={onView} className="flex-1 py-1.5 text-[11px] font-semibold bg-primary-light hover:bg-primary/20 rounded-xl transition-colors">View</button>
            <button onClick={onRescan} title="Re-scan" className="w-8 h-7 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group/r">
              <RefreshCw className="w-3.5 h-3.5 text-gray-400 group-hover/r:rotate-180 transition-transform duration-300"/>
            </button>
            <button onClick={onMarkSwapped} title="Mark swapped" className="w-8 h-7 flex items-center justify-center bg-green-50 hover:bg-green-100 rounded-xl transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500"/>
            </button>
            {!confirmDel
              ? <button onClick={()=>setConfirmDel(true)} title="Delete" className="w-8 h-7 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-400"/>
                </button>
              : <button onClick={onDelete} className="px-2.5 py-1 text-[10px] font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors animate-pulse">Sure?</button>
            }
          </div>
        )}
      </div>
    </div>
  );
};

// ── Care schedule ─────────────────────────────────────────────────────────────
const CareSchedule = ({ location }: { location:any }) => {
  const [open,setOpen]         = useState(false);
  const [schedule,setSchedule] = useState<Record<string,string[]>>({});
  const [tip,setTip]           = useState('');
  const [alerts,setAlerts]     = useState<string[]>([]);
  const [loading,setLoading]   = useState(false);
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const dl:Record<string,string> = {monday:'Mon',tuesday:'Tue',wednesday:'Wed',thursday:'Thu',friday:'Fri',saturday:'Sat',sunday:'Sun'};
  const today = new Date().toLocaleDateString('en',{weekday:'long'}).toLowerCase();
  useEffect(()=>{
    if(!open||!location||Object.keys(schedule).length>0) return;
    setLoading(true);
    getCareSchedule({lat:location.lat,lon:location.lon})
      .then(res=>{ const d=res.data?.data||res.data; setSchedule(d?.schedule||{}); setTip(d?.weeklyTip||''); setAlerts(d?.urgentAlerts||[]); })
      .catch(()=>{}).finally(()=>setLoading(false));
  },[open,location]);
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border/50">
      <button onClick={()=>setOpen(!open)} className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-muted/50 transition-colors">
        <span className="font-body font-semibold text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-primary"/> AI Care Schedule</span>
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground transition-transform duration-300',open&&'rotate-180')}/>
      </button>
      {open&&(
        <div className="px-4 pb-4 space-y-3 border-t border-border/50">
          {loading ? <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"/></div> : (
            <>
              {alerts.length>0&&(
                <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
                  {alerts.map((a,i)=><p key={i} className="text-xs text-red-700 font-body">⚠️ {a}</p>)}
                </div>
              )}
              <div className="mt-3 space-y-1">
                {days.map(day=>{
                  const tasks=schedule[day]||[]; const isToday=day===today;
                  return (
                    <div key={day} className={cn('flex items-start gap-3 py-2 px-2 rounded-xl',isToday?'bg-primary-light border border-primary/20':'hover:bg-muted/30')}>
                      <span className={cn('text-xs font-tag font-bold w-8 flex-shrink-0 pt-0.5',isToday?'text-primary':'text-muted-foreground')}>
                        {dl[day]}{isToday&&<span className="block text-[9px]">today</span>}
                      </span>
                      <div className="flex-1 space-y-0.5">
                        {tasks.length>0?tasks.map((t,j)=><p key={j} className="text-xs font-body">{t}</p>)
                          :<p className="text-xs text-muted-foreground/50 italic">Rest day 🌿</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {tip&&<div className="bg-secondary/10 border border-secondary/20 rounded-xl p-3"><p className="text-xs font-body italic">💡 {tip}</p></div>}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Edit modal ────────────────────────────────────────────────────────────────
const EditModal = ({user,onSave,onClose}:{user:any;onSave:(d:FormData)=>Promise<void>;onClose:()=>void}) => {
  const [form,setForm]     = useState({name:user?.name||'',bio:user?.bio||''});
  const [preview,setPreview] = useState<string|null>(null);
  const [saving,setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    const fd=new FormData(); fd.append('name',form.name); fd.append('bio',form.bio);
    const fi=document.getElementById('av-input') as HTMLInputElement;
    if(fi?.files?.[0]) fd.append('avatar',fi.files[0]);
    await onSave(fd); setSaving(false);
  };
  return (
    <div className="fixed inset-0 z-[900] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-background rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden anim-fade-up">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <h2 className="font-display text-lg">Edit Profile</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"><X className="w-4 h-4"/></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-primary-light border-2 border-border overflow-hidden flex items-center justify-center text-2xl">
                {preview?<img src={preview} className="w-full h-full object-cover" alt=""/>:user?.avatar?<img src={user.avatar} className="w-full h-full object-cover" alt=""/>:(user?.name||'?')[0]}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition-transform">
                <Camera className="w-3.5 h-3.5"/>
                <input id="av-input" type="file" accept="image/*" className="hidden"
                  onChange={e=>{const f=e.target.files?.[0];if(f){const r=new FileReader();r.onload=ev=>setPreview(ev.target?.result as string);r.readAsDataURL(f);}}}/>
              </label>
            </div>
            <div><p className="text-sm font-semibold font-body">{user?.name}</p><p className="text-xs text-muted-foreground">Tap camera to change</p></div>
          </div>
          <div>
            <label className="text-xs font-tag font-bold text-muted-foreground uppercase tracking-wide">Name</label>
            <input type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}
              className="mt-1.5 w-full px-4 py-2.5 bg-card rounded-xl border border-border text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30"/>
          </div>
          <div>
            <label className="text-xs font-tag font-bold text-muted-foreground uppercase tracking-wide">Bio</label>
            <textarea value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} rows={3} maxLength={200}
              className="mt-1.5 w-full px-4 py-2.5 bg-card rounded-xl border border-border text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"/>
            <p className="text-[10px] text-muted-foreground text-right">{form.bio.length}/200</p>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={submit} disabled={saving}
            className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-pill font-body font-semibold text-sm hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all">
            {saving?<span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Saving...</span>:'Save Changes'}
          </button>
          <button onClick={onClose} className="flex-1 py-3 bg-card border border-border text-foreground rounded-pill font-body font-semibold text-sm hover:bg-muted transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const Profile = () => {
  const navigate = useNavigate();
  const {user,setUser,location,setLocation,feedType,setFeedType,fetchWeather} = useApp();
  const [activeTab,setActiveTab]         = useState<'garden'|'swaps'>('garden');
  const [userPosts,setUserPosts]         = useState<Post[]>([]);
  const [loading,setLoading]             = useState(true);
  const [rank,setRank]                   = useState<number|null>(null);
  const [showLocModal,setShowLocModal]   = useState(false);
  const [showEditModal,setShowEditModal] = useState(false);
  const [headerVis,setHeaderVis]         = useState(false);

  const profileName = user?.name||'Plant Lover';
  const bio = user?.bio||'Growing my urban jungle one plant at a time 🌿';

  useEffect(()=>{ injectStyles(); const t=setTimeout(()=>setHeaderVis(true),50); return()=>clearTimeout(t); },[]);

  // fetch posts
  const fetchPosts = useCallback(async()=>{
    const uid=user?._id||user?.id; if(!uid) return;
    setLoading(true);
    try {
      const res=await getUserPosts(uid);
      const list=res.data?.data?.posts||res.data?.posts||res.data?.data||res.data||[];
      setUserPosts(Array.isArray(list)?list:[]);
    } catch(e){ setUserPosts([]); } finally { setLoading(false); }
  },[user?._id,user?.id]);
  useEffect(()=>{ fetchPosts(); },[fetchPosts]);

  // fetch dynamic rank
  useEffect(()=>{
    const uid=user?._id||user?.id; if(!uid) return;
    api.get('/users/leaderboard/swappers')
      .then(res=>{
        const board:any[]=res.data?.data||[];
        const idx=board.findIndex(u=>String(u._id)===String(uid)||String(u.id)===String(uid));
        setRank(idx>=0 ? idx+1 : board.length+1);
      })
      .catch(()=>setRank(null));
  },[user?._id,user?.id]);

  const activePosts  = userPosts.filter(p=>!p.isSwapped);
  const swappedPosts = userPosts.filter(p=>p.isSwapped);

  const handleMarkSwapped = async(postId:string)=>{
    try {
      await markSwapped(postId);
      setUserPosts(prev=>prev.map(p=>p._id===postId?{...p,isSwapped:true}:p));
      setUser((prev:any)=>prev?{...prev,totalSwaps:(prev.totalSwaps||0)+1}:prev);
      confetti({particleCount:130,spread:80,colors:['#5C7A4E','#C4714A','#D6E8C8','#F2D5C4'],origin:{y:.6}});
    } catch(e){ console.error(e); }
  };
  const handleDelete = async(postId:string)=>{
    try {
      await deletePost(postId);
      setUserPosts(prev=>prev.filter(p=>p._id!==postId));
      setUser((prev:any)=>prev?{...prev,totalPosts:Math.max(0,(prev.totalPosts||0)-1)}:prev);
    } catch(e){ console.error(e); }
  };
  const handleSaveProfile = async(fd:FormData)=>{
    try { const res=await updateProfile(fd); setUser(res.data?.user||res.data?.data||res.data); setShowEditModal(false); } catch(e){ console.error(e); }
  };
  const handleLogout = async()=>{
    try{await logoutApi();}catch{}
    localStorage.removeItem('bagichalink_token'); setUser(null); navigate('/login');
  };

  const rankInfo = rank!==null ? getRankInfo(rank) : null;

  return (
    <div className="max-w-5xl mx-auto pb-24 relative z-10">

      {/* Hero banner — no overflow:hidden so avatar isn't clipped */}
      <div className={cn('relative transition-opacity duration-700', headerVis?'opacity-100':'opacity-0')}>
        {/* Banner */}
        <div className="h-44 relative"
          style={{background:'linear-gradient(135deg,hsl(105 40% 80%) 0%,hsl(155 35% 72%) 50%,hsl(36 33% 85%) 100%)'}}>
          {/* Soft blobs */}
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/20 blur-2xl pointer-events-none"/>
          <div className="absolute bottom-0 left-8  w-28 h-28 rounded-full bg-white/15 blur-xl  pointer-events-none"/>
          {/* Decorative plants */}
          <div className="absolute top-5 right-14 text-7xl opacity-[0.12] select-none rotate-12 pointer-events-none">🌿</div>
          <div className="absolute bottom-4 left-5 text-4xl opacity-[0.10] select-none -rotate-6 pointer-events-none">🪴</div>
          {/* Rank ribbon */}
          {rankInfo&&rank!==null&&(
            <div className={cn('absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shadow-md backdrop-blur-sm',rankInfo.bg,rankInfo.color)}>
              <Trophy className="w-3 h-3"/> #{rank} {rankInfo.label}
            </div>
          )}
        </div>

        {/* Avatar — sits ON TOP of banner, half overlapping */}
        <div className="flex justify-center">
          <div className="relative -mt-14 z-10">
            <div
              className="w-28 h-28 rounded-full border-4 border-background shadow-2xl bg-primary-light overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300 flex items-center justify-center"
              onClick={()=>setShowEditModal(true)}
            >
              {user?.avatar
                ? <img src={user.avatar} alt="" className="w-full h-full object-cover"/>
                : <span className="text-4xl font-display">{profileName[0]}</span>
              }
              <div className="absolute inset-0 bg-black/25 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                <Camera className="w-7 h-7 text-white"/>
              </div>
            </div>
            {/* Edit badge */}
            <button
              onClick={()=>setShowEditModal(true)}
              className="absolute bottom-1 right-1 w-8 h-8 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-2 border-background"
            >
              <Camera className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">

        {/* Name + bio */}
        <div className={cn('text-center space-y-2',headerVis?'anim-fade-up':'opacity-0')} style={{animationDelay:'100ms'}}>
          <h1 className="font-display text-2xl tracking-tight">{profileName}</h1>
          <p className="text-sm text-muted-foreground italic font-body px-8 leading-relaxed">{bio}</p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {location&&<LocationPill city={location.city} countryCode={location.countryCode} size="sm"/>}
            {rankInfo&&rank!==null&&(
              <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm',rankInfo.bg,rankInfo.color)}>
                {rankInfo.emoji} {rankInfo.label} · #{rank} globally
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon="🌿" value={activePosts.length}  label="Active Plants" delay={0}   />
          <StatCard icon="🤝" value={swappedPosts.length} label="Swaps Done"    delay={80}  glow={swappedPosts.length>0}/>
          <RankCard rank={rank} delay={160}/>
        </div>

        {activePosts.length>0&&<HealthOverview posts={activePosts}/>}

        {/* Feed preference */}
        <div className="space-y-2 anim-fade-up" style={{animationDelay:'300ms'}}>
          <p className="text-xs text-muted-foreground font-tag">Show me:</p>
          <div className="flex gap-2">
            {(['global','nearby','city'] as FeedType[]).map(ft=>(
              <button key={ft} onClick={()=>setFeedType(ft)}
                className={cn('flex-1 py-2.5 rounded-pill text-sm font-tag font-medium transition-all duration-200',
                  feedType===ft?'bg-forest text-forest-foreground shadow-md scale-[1.03]':'bg-card text-foreground border border-border hover:border-primary hover:scale-[1.01]')}>
                {ft==='global'?'🌍':ft==='nearby'?'📍':'🏙️'} {ft.charAt(0).toUpperCase()+ft.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {location&&<CareSchedule location={location}/>}

        {/* Garden tabs */}
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-border">
            {([{key:'garden',label:'My Garden',icon:Sprout,count:activePosts.length},
               {key:'swaps', label:'Swapped',  icon:CheckCircle2,count:swappedPosts.length}] as const).map(tab=>(
              <button key={tab.key} onClick={()=>setActiveTab(tab.key)}
                className={cn('pb-2.5 text-sm font-body font-medium transition-all duration-200 flex items-center gap-1.5',
                  activeTab===tab.key?'border-b-2 border-secondary text-foreground':'text-muted-foreground hover:text-foreground')}>
                <tab.icon className="w-4 h-4"/>
                {tab.label}
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-tag transition-colors',
                  activeTab===tab.key?'bg-secondary/15 text-secondary':'bg-muted text-muted-foreground')}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {loading?(
            <div className="flex flex-col items-center py-16 gap-3">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
              <p className="text-sm text-muted-foreground font-body">Loading your garden...</p>
            </div>
          ):activeTab==='garden'?(
            activePosts.length>0?(
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePosts.map((post,i)=>(
                  <GardenCard key={post._id} post={post} delay={i*60}
                    onView={()=>navigate(`/post/${post._id}`)}
                    onRescan={()=>navigate('/scan',{state:{rescanPost:post}})}
                    onMarkSwapped={()=>handleMarkSwapped(post._id)}
                    onDelete={()=>handleDelete(post._id)}/>
                ))}
              </div>
            ):(
              <div className="flex flex-col items-center py-16 space-y-4 anim-fade-up">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-light to-secondary/20 flex items-center justify-center text-4xl shadow-inner">🪴</div>
                <h2 className="font-display italic text-lg">Your garden is empty</h2>
                <p className="text-sm text-muted-foreground text-center font-body max-w-xs">Scan a plant and post it to start building your garden</p>
                <button onClick={()=>navigate('/scan')}
                  className="bg-secondary text-secondary-foreground rounded-pill px-6 py-3 font-body font-semibold transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shadow-md">
                  <Camera className="w-4 h-4"/> Scan My First Plant
                </button>
              </div>
            )
          ):(
            swappedPosts.length>0?(
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {swappedPosts.map((post,i)=>(
                  <GardenCard key={post._id} post={post} delay={i*60}
                    onView={()=>navigate(`/post/${post._id}`)}
                    onRescan={()=>navigate('/scan',{state:{rescanPost:post}})}
                    onMarkSwapped={()=>{}}
                    onDelete={()=>handleDelete(post._id)}/>
                ))}
              </div>
            ):(
              <div className="flex flex-col items-center py-16 space-y-4 anim-fade-up">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-light to-secondary/20 flex items-center justify-center text-4xl shadow-inner">🔄</div>
                <h2 className="font-display italic text-lg">No swaps yet</h2>
                <p className="text-sm text-muted-foreground text-center font-body max-w-xs">Complete a swap and mark it here to track your history</p>
                <button onClick={()=>navigate('/matches')}
                  className="bg-secondary text-secondary-foreground rounded-pill px-6 py-3 font-body font-semibold transition-all hover:scale-105 active:scale-95 shadow-md">
                  Find Swap Matches ✨
                </button>
              </div>
            )
          )}
        </div>

        {/* Actions */}
        <div className="space-y-1.5 pt-2 pb-10 anim-fade-up" style={{animationDelay:'400ms'}}>
          {[
            {icon:MapPin, label:'Update Location', onClick:()=>setShowLocModal(true),  danger:false},
            {icon:Edit2,  label:'Edit Profile',    onClick:()=>setShowEditModal(true), danger:false},
            {icon:LogOut, label:'Logout',           onClick:handleLogout,               danger:true },
          ].map(item=>(
            <button key={item.label} onClick={item.onClick}
              className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body transition-all duration-200 hover:translate-x-1',
                item.danger?'text-red-500 hover:bg-red-50':'text-foreground hover:bg-card')}>
              <item.icon className="w-4 h-4 flex-shrink-0"/>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <LocationPermissionModal open={showLocModal} onClose={()=>setShowLocModal(false)}/>
      {showEditModal&&<EditModal user={user} onSave={handleSaveProfile} onClose={()=>setShowEditModal(false)}/>}
    </div>
  );
};

export default Profile;