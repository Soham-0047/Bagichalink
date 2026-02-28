import { useState, useEffect } from 'react';
import { MapPin, Search as SearchIcon, X } from 'lucide-react';
import { searchCities } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { countryFlag } from '@/lib/helpers';
import type { CitySearchResult } from '@/types';

interface Props { open: boolean; onClose: () => void; }

const LocationPermissionModal = ({ open, onClose }: Props) => {
  const { setLocation, fetchWeather, setLocationPermissionAsked } = useApp();
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchCities(query);
        setResults((res.data?.data || res.data || []).map((r: any) => ({ ...r, city: r.name || r.city })));
      } catch { setResults([]); }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleAllow = () => {
    setLocationPermissionAsked(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { fetchWeather(pos.coords.latitude, pos.coords.longitude); onClose(); },
      () => setShowSearch(true)
    );
  };

  const handleSelectCity = (city: CitySearchResult) => {
    setLocationPermissionAsked(true);
    const cityName = city.city || city.name || '';
    setLocation({ city: cityName, country: city.country, countryCode: city.countryCode, lat: city.lat, lon: city.lon, displayName: `${cityName}, ${city.country}` });
    fetchWeather(city.lat, city.lon);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/30 p-4">
      <div className="bg-background rounded-card w-full max-w-sm p-6 card-shadow space-y-5 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        <div className="text-center text-6xl">🌱</div>

        {!showSearch ? (
          <>
            <div className="text-center space-y-2">
              <h2 className="font-display text-xl">Help us show plants near you 📍</h2>
              <p className="text-sm text-muted-foreground font-body">We'll use your location for weather-aware plant care tips and nearby matches.</p>
            </div>
            <button onClick={handleAllow} className="w-full py-3 bg-secondary text-secondary-foreground rounded-pill font-body font-semibold text-base transition-transform hover:scale-[1.02] active:scale-95">
              <MapPin className="w-4 h-4 inline mr-2" />Allow Location
            </button>
            <button onClick={() => setShowSearch(true)} className="w-full text-center text-sm text-muted-foreground hover:text-foreground font-body">
              Search my city instead
            </button>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl text-center">Find your city 🏙️</h2>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search city..." autoFocus
                className="w-full pl-10 pr-4 py-3 bg-card rounded-card border-0 text-sm font-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {searching && <p className="text-sm text-muted-foreground text-center py-2">Searching...</p>}
              {results.map((city, i) => (
                <button key={i} onClick={() => handleSelectCity(city)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-card transition-colors flex items-center gap-2">
                  <span>{countryFlag(city.countryCode)}</span>
                  <span className="font-body text-sm">{city.city || city.name}, {city.country}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LocationPermissionModal;

// VITE_API_URL=https://your-render-app.onrender.com/api
// VITE_SOCKET_URL=https://your-render-app.onrender.com