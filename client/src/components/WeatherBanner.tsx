import { useApp } from '@/context/AppContext';
import { weatherEmoji } from '@/lib/helpers';

const WeatherBanner = () => {
  const { weather, location } = useApp();

  if (!weather || !location) return null;

  const emoji = weatherEmoji(weather.condition);
  const isHumid = weather.humidity > 85;

  return (
    <div className="relative overflow-hidden rounded-card p-5 card-shadow" style={{
      background: 'linear-gradient(135deg, hsl(105 40% 85%), hsl(105 40% 92%))',
    }}>
      {/* Organic blob */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full animate-blob opacity-30" style={{
        background: 'hsl(107 22% 39% / 0.3)',
      }} />

      {/* Rain drops */}
      {isHumid && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute text-xs animate-rain"
              style={{
                left: `${15 + i * 15}%`,
                animationDelay: `${i * 0.2}s`,
                top: '-10px',
              }}
            >
              💧
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className="font-display italic text-lg text-foreground">{location.city}</p>
          <p className="text-2xl font-body font-semibold text-foreground">
            {emoji} {Math.round(weather.temperature)}°C
          </p>
          <p className="text-sm font-tag text-muted-foreground">
            {weather.humidity}% humidity
            {weather.wateringAdvice && ` · ${weather.wateringAdvice}`}
          </p>
        </div>

        {weather.forecast && weather.forecast.length > 0 && (
          <div className="flex gap-1.5">
            {weather.forecast.slice(0, 3).map((day, i) => (
              <div
                key={i}
                className="flex flex-col items-center bg-background/60 rounded-pill px-2 py-1.5"
              >
                <span className="text-[0.6rem] font-tag text-muted-foreground">{day.day}</span>
                <span className="text-xs">{weatherEmoji(day.condition)}</span>
                <span className="text-[0.6rem] font-tag font-medium">{Math.round(day.temp)}°</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherBanner;
