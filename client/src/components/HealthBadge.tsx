import { cn } from '@/lib/utils';
import type { HealthStatus } from '@/types';

interface HealthBadgeProps {
  status: HealthStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<HealthStatus, { label: string; className: string }> = {
  healthy:          { label: '🟢 Healthy',          className: 'bg-primary-light text-foreground' },
  attention_needed: { label: '🟡 Needs Attention',  className: 'bg-[hsl(42,65%,90%)] text-foreground' },
  critical:         { label: '🔴 Critical',          className: 'bg-[hsl(10,60%,90%)] text-foreground' },
  unknown:          { label: '⚪ Unknown',            className: 'bg-card text-muted-foreground' },
};

const HealthBadge = ({ status, size = 'md' }: HealthBadgeProps) => {
  const config = statusConfig[status] ?? statusConfig.unknown;
  return (
    <span className={cn(
      'inline-flex items-center rounded-pill font-tag font-medium',
      config.className,
      size === 'sm' ? 'px-2 py-0.5 text-[0.65rem]' : 'px-3 py-1 text-xs'
    )}>
      {config.label}
    </span>
  );
};

export default HealthBadge;