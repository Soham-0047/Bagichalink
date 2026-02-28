export const countryFlag = (countryCode?: string): string => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  return countryCode
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');
};

export const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export const weatherEmoji = (condition?: string): string => {
  if (!condition) return '🌤️';
  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('shower')) return '🌧️';
  if (c.includes('thunder')) return '⛈️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('fog')) return '🌫️';
  if (c.includes('cloud')) return '☁️';
  if (c.includes('clear') || c.includes('sunny')) return '☀️';
  if (c.includes('partly')) return '⛅';
  return '🌤️';
};

export const isLive = (dateStr: string): boolean => {
  return Date.now() - new Date(dateStr).getTime() < 60 * 60 * 1000; // < 1 hour old
};