import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { getPost, expressInterest } from '@/lib/api';
import HealthBadge from '@/components/HealthBadge';
import HealthStatusBar from '@/components/HealthStatusBar';
import TypeBadge from '@/components/TypeBadge';
import InterestButton from '@/components/InterestButton';
import { countryFlag, timeAgo, weatherEmoji } from '@/lib/helpers';
import { useToast } from '@/hooks/use-toast';
import type { Post, HealthStatus } from '@/types';

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipsOpen, setTipsOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await getPost(id);
        setPost(res.data?.data || res.data);
      } catch (e) {
        console.error('Post fetch error:', e);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleInterest = async () => {
    if (!post) return;
    try {
      const res = await expressInterest(post._id);
      setPost((prev) =>
        prev ? {
          ...prev,
          isInterested: res.data?.isInterested ?? !prev.isInterested,
          interestedCount: res.data?.interestedCount ?? prev.interestedCount,
        } : prev
      );
      if (!post.isInterested) toast({ title: "Interest sent! They'll see your profile 🌿" });
    } catch (e) {
      console.error('Interest error:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-3">
        <p className="font-body text-muted-foreground">Post not found</p>
        <button onClick={() => navigate('/')} className="text-primary font-body font-medium">Go Home</button>
      </div>
    );
  }

  // Flat AI analysis shape from backend
  const ai = post.aiAnalysis;
  const flag = countryFlag(post.location?.countryCode);
  const healthStatus = (ai?.healthStatus ?? 'unknown') as HealthStatus;
  const tips = ai?.tips ?? [];

  return (
    <div className="max-w-[480px] mx-auto pb-24 relative z-10">
      {/* Hero Image */}
      <div className="relative h-72">
        {post.imageUrl && (
          <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
        )}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Content card overlapping image */}
      <div className="relative -mt-10 bg-background rounded-t-[2rem] px-5 pt-6 pb-8 space-y-5">

        {/* Species + type */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="font-display text-2xl">
              {ai?.emoji} {ai?.commonName || post.title || 'Unknown Plant'}
            </h1>
            <p className="text-sm text-muted-foreground italic font-body">{ai?.species}</p>
          </div>
          <TypeBadge type={post.type} />
        </div>

        {/* Poster info */}
        <div className="flex items-center gap-3">
          {post.user?.avatar ? (
            <img src={post.user.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center font-display text-sm">
              {(post.user?.name || '?')[0]}
            </div>
          )}
          <div>
            <p className="font-body font-medium text-sm">{post.user?.name}</p>
            <p className="text-xs text-muted-foreground font-tag">
              📍 {post.location?.city} {flag} · {timeAgo(post.createdAt)}
            </p>
          </div>
        </div>

        {/* Health */}
        <div className="space-y-3">
          <HealthBadge status={healthStatus} />
          <p className="text-sm font-body">{ai?.diagnosis}</p>
          <HealthStatusBar status={healthStatus} />
        </div>

        {/* Fun fact */}
        {ai?.funFact && (
          <div className="bg-card rounded-card p-3.5 border-l-[3px] border-secondary">
            <p className="text-sm font-body italic text-muted-foreground">💡 {ai.funFact}</p>
          </div>
        )}

        {/* Care details pills */}
        {(ai?.careLevel || ai?.wateringFrequency || ai?.sunlight) && (
          <div className="flex flex-wrap gap-2">
            {ai?.careLevel && (
              <span className="bg-primary-light text-foreground rounded-pill px-3 py-1 text-xs font-tag">
                ⚡ {ai.careLevel} care
              </span>
            )}
            {ai?.wateringFrequency && (
              <span className="bg-primary-light text-foreground rounded-pill px-3 py-1 text-xs font-tag">
                💧 {ai.wateringFrequency}
              </span>
            )}
            {ai?.sunlight && (
              <span className="bg-primary-light text-foreground rounded-pill px-3 py-1 text-xs font-tag">
                ☀️ {ai.sunlight}
              </span>
            )}
          </div>
        )}

        {/* Weather snapshot */}
        {post.weatherSnapshot && (
          <div className="bg-card rounded-card p-3.5 flex items-center gap-2">
            <span className="text-lg">{weatherEmoji(post.weatherSnapshot.condition)}</span>
            <p className="text-sm font-tag text-muted-foreground">
              Posted when it was {Math.round(post.weatherSnapshot.temperature)}°C in {post.location?.city}
            </p>
          </div>
        )}

        {/* Care tips accordion */}
        {tips.length > 0 && (
          <div className="bg-card rounded-card overflow-hidden">
            <button
              onClick={() => setTipsOpen(!tipsOpen)}
              className="w-full px-4 py-3.5 flex items-center justify-between"
            >
              <span className="font-body font-semibold text-sm">Care Tips 🌿</span>
              {tipsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {tipsOpen && (
              <div className="px-4 pb-4 space-y-2">
                {tips.map((tip, i) => (
                  <div key={i} className="flex gap-3 border-l-[3px] border-secondary pl-3 py-1">
                    <span className="text-xs font-tag font-semibold text-primary flex-shrink-0">{i + 1}.</span>
                    <p className="text-sm font-body">{tip}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {post.tags.map((tag, i) => (
              <span key={i} className="bg-primary-light text-foreground rounded-pill px-3 py-1 text-xs font-tag whitespace-nowrap">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Interest CTA */}
        <div className="space-y-3 pt-2">
          {(post.interestedCount || 0) > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[...Array(Math.min(post.interestedCount || 0, 3))].map((_, i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-primary-light border-2 border-background flex items-center justify-center text-[0.5rem] font-tag">
                    🌿
                  </div>
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-tag">
                {post.interestedCount} people interested
              </span>
            </div>
          )}
          <InterestButton
            count={post.interestedCount || 0}
            isInterested={post.isInterested || false}
            onToggle={handleInterest}
            fullWidth
          />
        </div>
      </div>
    </div>
  );
};

export default PostDetail;