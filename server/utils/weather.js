const axios = require("axios");

// WMO Weather Condition Codes → Human readable
const WMO_CODES = {
  0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
  45: "Foggy", 48: "Icy Fog",
  51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
  61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain",
  71: "Slight Snow", 73: "Moderate Snow", 75: "Heavy Snow",
  80: "Slight Showers", 81: "Moderate Showers", 82: "Violent Showers",
  95: "Thunderstorm", 96: "Thunderstorm with Hail", 99: "Heavy Thunderstorm",
};

/**
 * Fetch live weather data for any lat/long using Open-Meteo (no API key needed)
 */
const getWeather = async (lat, lon) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weathercode,windspeed_10m,precipitation&timezone=auto`;

    const { data } = await axios.get(url, { timeout: 5000 });
    const current = data.current;

    return {
      temperature: Math.round(current.temperature_2m),
      humidity: current.relative_humidity_2m,
      condition: WMO_CODES[current.weathercode] || "Unknown",
      windspeed: Math.round(current.windspeed_10m),
      precipitation: current.precipitation,
      timezone: data.timezone,
      isRaining: [61, 63, 65, 80, 81, 82, 95, 96, 99].includes(current.weathercode),
      isHumid: current.relative_humidity_2m > 75,
      unit: "metric",
    };
  } catch (err) {
    console.error("Weather fetch error:", err.message);
    // Return a neutral fallback so AI still works
    return {
      temperature: null,
      humidity: null,
      condition: "Unknown",
      windspeed: null,
      precipitation: null,
      isRaining: false,
      isHumid: false,
      unit: "metric",
    };
  }
};

/**
 * Reverse geocode lat/long to city + country using Open-Meteo Geocoding API
 * (totally free, no key needed)
 */
const reverseGeocode = async (lat, lon) => {
  try {
    // Open-Meteo doesn't do reverse geocode, use Nominatim (OpenStreetMap) – free
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const { data } = await axios.get(url, {
      timeout: 5000,
      headers: { "User-Agent": "BagichaLink/1.0" }, // Required by Nominatim
    });

    const city =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.county ||
      "Unknown City";

    const country = data.address?.country || "Unknown";
    const countryCode = data.address?.country_code?.toUpperCase() || "";

    return {
      city,
      country,
      countryCode,
      displayName: `${city}, ${country}`,
    };
  } catch (err) {
    console.error("Reverse geocode error:", err.message);
    return {
      city: "Unknown City",
      country: "Unknown",
      countryCode: "",
      displayName: "Unknown Location",
    };
  }
};

/**
 * Search cities by name (for manual location input)
 */
const searchCity = async (query) => {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const { data } = await axios.get(url, { timeout: 5000 });

    if (!data.results) return [];

    return data.results.map((r) => ({
      name: r.name,
      country: r.country,
      countryCode: r.country_code,
      lat: r.latitude,
      lon: r.longitude,
      displayName: `${r.name}, ${r.country}`,
      admin1: r.admin1 || "", // State/Province
    }));
  } catch (err) {
    console.error("City search error:", err.message);
    return [];
  }
};

module.exports = { getWeather, reverseGeocode, searchCity };
