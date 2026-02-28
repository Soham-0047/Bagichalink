import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserPosts, getMatches } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import MatchScoreRing from '@/components/MatchScoreRing';
import { useInView } from 'react-intersection-observer';
import { countryFlag } from '@/lib/helpers';
import type { Post, MatchResult } from '@/types';

const Matches = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiTip, setAiTip] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    getUserPosts(user.id)
      .then((res) => setMyPosts(res.data?.data?.posts || res.data?.data || res.data || []))
      .catch(() => setMyPosts([]));
  }, [user]);

  const handleSelectPost = async (postId: string) => {
    setSelectedPostId(postId);
    setLoading(true);
    try {
      const res = await getMatches(postId);
      const data = res.data?.data || res.data;
      setMatches(data?.matches || []);
      setAiTip(data?.matchTip || '');
    } catch { setMatches([]); }
    setLoading(false);
  };

  return (
    <div className="max-w-[480px] mx-auto px-4 pb-24 pt-6 relative z-10">
      <h1 className="font-display text-2xl mb-1">Your Swap Matches ✨</h1>
      <p className="text-sm text-muted-foreground font-body mb-6">AI found these based on your plants and location</p>

      {myPosts.length > 0 && (
        <div className="mb-6">
          <p className="text-xs text-muted-foreground font-tag mb-2">Which plant are you matching for?</p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {myPosts.map((post) => (
              <button key={post._id} onClick={() => handleSelectPost(post._id)}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 ${selectedPostId === post._id ? 'opacity-100' : 'opacity-60'}`}>
                <img src={post.imageUrl} alt=""
                  className={`w-14 h-14 rounded-full object-cover border-2 transition-all ${selectedPostId === post._id ? 'border-secondary' : 'border-border'}`} />
                <span className="text-[0.6rem] font-tag text-center max-w-[60px] truncate">
                  {post.aiAnalysis?.commonName || post.title || 'Plant'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center py-16 space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-tag">Finding matches...</p>
        </div>
      ) : matches.length > 0 ? (
        <div className="space-y-4">
          {matches.slice(0, 3).map((match, i) => (
            <MatchCard key={i} match={match} onView={() => navigate(`/post/${match.post._id}`)} delay={i * 100} />
          ))}
        </div>
      ) : selectedPostId ? (
        <div className="flex flex-col items-center py-16 space-y-4">
          <div className="text-5xl">🔍</div>
          <p className="text-sm text-muted-foreground font-body text-center">No matches found yet. Try another plant!</p>
        </div>
      ) : myPosts.length === 0 ? (
        <div className="flex flex-col items-center py-16 space-y-4">
          <div className="text-7xl">🌱</div>
          <h2 className="font-display italic text-lg">Post a plant first to find matches</h2>
          <p className="text-sm text-muted-foreground text-center font-body">Share a plant and AI will find swap partners</p>
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 space-y-4">
          <div className="text-5xl">👆</div>
          <p className="text-sm text-muted-foreground font-body text-center">Select one of your plants above to find matches</p>
        </div>
      )}

      {aiTip && (
        <div className="mt-6 bg-primary-light rounded-card p-4">
          <p className="text-sm font-body italic"><span className="not-italic">💡</span> {aiTip}</p>
        </div>
      )}
    </div>
  );
};

const MatchCard = ({ match, onView, delay }: { match: MatchResult; onView: () => void; delay: number }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const flag = countryFlag(match.post.location?.countryCode);
  const score = match.matchScore ?? match.score ?? 0;

  return (
    <div ref={ref}
      className={`bg-background rounded-card card-shadow p-4 flex gap-4 transition-all ${inView ? 'animate-fade-up' : 'opacity-0'}`}
      style={{ animationDelay: `${delay}ms` }}>
      {match.post.imageUrl && (
        <img src={match.post.imageUrl} alt="" className="w-20 h-20 rounded-card object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <h3 className="font-display text-base truncate">{match.post.aiAnalysis?.commonName || match.post.title}</h3>
        <p className="text-xs text-muted-foreground font-tag">{match.post.location?.city} {flag}</p>
        <p className="text-xs text-muted-foreground italic font-body line-clamp-1">{match.reason}</p>
        <button onClick={onView} className="text-xs font-tag font-medium text-primary border border-primary rounded-pill px-3 py-1 hover:bg-primary/5 transition-colors">
          💬 View Post →
        </button>
      </div>
      <MatchScoreRing score={score} size={56} />
    </div>
  );
};

export default Matches;