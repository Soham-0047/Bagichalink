import { cn } from '@/lib/utils';
import type { FeedType, PostTypeFilter } from '@/types';

interface FeedFiltersProps {
  feedType: FeedType;
  postType: PostTypeFilter;
  onFeedTypeChange: (f: FeedType) => void;
  onPostTypeChange: (p: PostTypeFilter) => void;
}

const feedOptions: { value: FeedType; label: string; icon: string }[] = [
  { value: 'global', label: 'Global', icon: '🌍' },
  { value: 'nearby', label: 'Nearby', icon: '📍' },
  { value: 'city',   label: 'My City', icon: '🏙️' },
];

const postOptions: { value: PostTypeFilter; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'wanted',    label: 'Wanted' },
];

const FeedFilters = ({ feedType, postType, onFeedTypeChange, onPostTypeChange }: FeedFiltersProps) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 -mx-4 px-4">
      {feedOptions.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onFeedTypeChange(opt.value)}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-pill text-sm font-tag font-medium whitespace-nowrap transition-all',
            feedType === opt.value
              ? 'bg-forest text-forest-foreground'
              : 'bg-background text-foreground border border-border hover:bg-card'
          )}
        >
          {opt.icon} {opt.label}
        </button>
      ))}

      <div className="w-px h-6 bg-border flex-shrink-0" />

      {postOptions.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onPostTypeChange(opt.value)}
          className={cn(
            'px-3.5 py-2 rounded-pill text-sm font-tag font-medium whitespace-nowrap transition-all',
            postType === opt.value
              ? 'bg-forest text-forest-foreground'
              : 'bg-background text-foreground border border-border hover:bg-card'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default FeedFilters;