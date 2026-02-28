import { cn } from '@/lib/utils';

interface TypeBadgeProps {
  type: 'available' | 'wanted';
  size?: 'sm' | 'md';
}

const TypeBadge = ({ type, size = 'md' }: TypeBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill font-tag font-medium',
        type === 'available'
          ? 'bg-primary-light text-foreground'
          : 'bg-secondary-light text-foreground',
        size === 'sm' ? 'px-2 py-0.5 text-[0.65rem]' : 'px-3 py-1 text-xs'
      )}
    >
      {type === 'available' ? 'Available' : 'Wanted'}
    </span>
  );
};

export default TypeBadge;
