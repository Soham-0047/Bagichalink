import { countryFlag } from '@/lib/helpers';

interface LocationPillProps {
  city: string;
  countryCode: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

const LocationPill = ({ city, countryCode, size = 'md', onClick }: LocationPillProps) => {
  const flag = countryFlag(countryCode);
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 bg-secondary text-secondary-foreground rounded-pill font-tag font-medium transition-transform hover:scale-105 ${
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      }`}
    >
      📍 {city}, {flag}
    </button>
  );
};

export default LocationPill;
