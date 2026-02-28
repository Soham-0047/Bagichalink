import { useNavigate } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import TypeBadge from './TypeBadge';
import { countryFlag } from '@/lib/helpers';
import type { Post } from '@/types';

interface PlantCardSmallProps {
  post: Post;
}

const PlantCardSmall = ({ post }: PlantCardSmallProps) => {
  const navigate = useNavigate();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const flag = countryFlag(post.location?.countryCode);

  return (
    <div
      ref={ref}
      onClick={() => navigate(`/post/${post._id}`)}
      className={`rounded-card card-shadow bg-background overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:card-shadow-hover hover:shadow-xl ${
        inView ? 'animate-fade-up' : 'opacity-0'
      }`}
    >
      <div className="aspect-square relative">
        <img
          src={post.imageUrl}
          alt={post.aiAnalysis?.species?.commonName || 'Plant'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute bottom-2 left-2">
          <TypeBadge type={post.type} size="sm" />
        </div>
      </div>
      <div className="p-3 space-y-1">
        <h4 className="font-display text-sm leading-tight line-clamp-2">
          {post.aiAnalysis?.species?.commonName || 'Unknown Plant'}
        </h4>
        <p className="text-[0.7rem] font-tag text-muted-foreground">
          {post.location?.city} {flag}
        </p>
      </div>
    </div>
  );
};

export default PlantCardSmall;
