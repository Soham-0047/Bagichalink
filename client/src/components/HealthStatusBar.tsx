import type { HealthStatus } from '@/types';

interface HealthStatusBarProps {
  status?: HealthStatus;
  score?: number; // optional fallback
}

// Map status to a visual fill level (0-5 segments)
const statusToFill: Record<HealthStatus, number> = {
  healthy:          5,
  attention_needed: 3,
  critical:         1,
  unknown:          0,
};

const segmentColor = (i: number, total: number): string => {
  const ratio = i / total;
  if (ratio < 0.4) return 'bg-success';
  if (ratio < 0.8) return 'bg-warning';
  return 'bg-danger';
};

const HealthStatusBar = ({ status, score }: HealthStatusBarProps) => {
  const segments = 5;
  let filled = 0;

  if (status && status in statusToFill) {
    filled = statusToFill[status];
  } else if (score !== undefined) {
    filled = Math.round((score / 100) * segments);
  }

  return (
    <div className="flex gap-1 w-full">
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-pill transition-all ${
            i < filled ? segmentColor(i, segments) : 'bg-border'
          }`}
        />
      ))}
    </div>
  );
};

export default HealthStatusBar;