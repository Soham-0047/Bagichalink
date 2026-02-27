const express = require("express");
const router = express.Router();
const { getWeather, reverseGeocode, searchCity } = require("../utils/weather");

// ─── GET /api/weather/current?lat=&lon= ───────────────────────────────────────
router.get("/current", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: "lat and lon query parameters are required.",
      });
    }

    const weather = await getWeather(parseFloat(lat), parseFloat(lon));

    res.json({ success: true, data: weather });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch weather." });
  }
});

// ─── GET /api/weather/geocode?lat=&lon= ───────────────────────────────────────
// Reverse geocode coordinates to city/country name
router.get("/geocode", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: "lat and lon are required." });
    }

    const location = await reverseGeocode(parseFloat(lat), parseFloat(lon));
    res.json({ success: true, data: location });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to geocode location." });
  }
});

// ─── GET /api/weather/search?q=city_name ──────────────────────────────────────
// Search cities for manual location selection
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Search query must be at least 2 characters." });
    }

    const results = await searchCity(q.trim());
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: "City search failed." });
  }
});

// ─── GET /api/weather/full?lat=&lon= ─────────────────────────────────────────
// Get weather + location info in one call (used on app load)
router.get("/full", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: "lat and lon are required." });
    }

    const [weather, location] = await Promise.all([
      getWeather(parseFloat(lat), parseFloat(lon)),
      reverseGeocode(parseFloat(lat), parseFloat(lon)),
    ]);

    res.json({ success: true, data: { weather, location } });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch weather data." });
  }
});

module.exports = router;
