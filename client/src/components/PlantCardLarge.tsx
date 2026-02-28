import { useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import TypeBadge from './TypeBadge';
import HealthBadge from './HealthBadge';
import InterestButton from './InterestButton';
import { countryFlag, timeAgo, isLive } from '@/lib/helpers';
import type { Post, HealthStatus } from '@/types';

interface PlantCardLargeProps {
  post: Post;
  onInterest: (id: string) => void;
}

const PlantCardLarge = ({ post, onInterest }: PlantCardLargeProps) => {
  const navigate = useNavigate();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const flag = countryFlag(post.location?.countryCode);
  const ai = post.aiAnalysis;

  return (
    <div
      ref={ref}
      className={`rounded-card card-shadow bg-background overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer ${
        inView ? 'animate-fade-up' : 'opacity-0'
      }`}
      onClick={() => navigate(`/post/${post._id}`)}
    >
      {/* Image */}
      <div className="relative aspect-video">
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt={ai?.commonName || 'Plant'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute top-3 right-3">
          <TypeBadge type={post.type} />
        </div>
        {isLive(post.createdAt) && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-background/90 rounded-pill px-2 py-1">
            <span className="w-2 h-2 rounded-full bg-danger animate-live-pulse" />
            <span className="text-[0.65rem] font-tag font-medium">Live</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-1">
          <h3 className="font-display text-xl text-foreground">
            {ai?.emoji} {ai?.commonName || post.title || 'Unknown Plant'}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {post.user?.avatar && (
              <img src={post.user.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
            )}
            <span className="font-body">{post.user?.name || 'Anonymous'}</span>
            <span>·</span>
            <span className="font-tag">📍 {post.location?.city || 'Unknown'} {flag}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* FIX 2: ai.healthStatus (flat) instead of ai.health.status (nested) */}
          <HealthBadge
            status={(ai?.healthStatus ?? 'unknown') as HealthStatus}
            size="sm"
          />
          <span className="text-xs text-muted-foreground font-tag">{timeAgo(post.createdAt)}</span>
        </div>

        {/* FIX 3: ai.diagnosis (flat) instead of ai.health.diagnosis (nested) */}
        {ai?.diagnosis && (
          <p className="text-sm text-muted-foreground italic line-clamp-1">
            {ai.diagnosis}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <InterestButton
            count={post.interestedCount || 0}
            isInterested={post.isInterested || false}
            onToggle={() => onInterest(post._id)}
          />
        </div>
      </div>
    </div>
  );
};

export default PlantCardLarge;