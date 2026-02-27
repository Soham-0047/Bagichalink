const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Convert image URL to base64 for Gemini Vision
 */
const imageUrlToBase64 = async (imageUrl) => {
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  const base64 = Buffer.from(response.data).toString("base64");
  const mimeType = response.headers["content-type"] || "image/jpeg";
  return { base64, mimeType };
};

/**
 * Analyze plant image using Gemini Vision
 * Returns structured diagnosis + care tips based on live weather
 */
const analyzePlant = async ({ imageUrl, imageBase64, mimeType, weather, location }) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Build weather context string
  let weatherContext = "Weather data unavailable.";
  if (weather && weather.temperature !== null) {
    weatherContext = `Current weather in ${location?.displayName || "your location"}:
    - Temperature: ${weather.temperature}°C
    - Humidity: ${weather.humidity}%
    - Condition: ${weather.condition}
    - Windspeed: ${weather.windspeed} km/h
    - Precipitation: ${weather.precipitation}mm
    - Currently raining: ${weather.isRaining ? "Yes" : "No"}
    - High humidity (>75%): ${weather.isHumid ? "Yes" : "No"}`;
  }

  const prompt = `You are an expert botanist and plant care specialist with deep knowledge of plants from all climates and regions worldwide.

${weatherContext}

Analyze this plant photo carefully and respond ONLY with a valid JSON object — no extra text, no markdown, no explanation outside the JSON.

{
  "species": "Scientific name (genus + species)",
  "commonName": "Most common name used globally",
  "localNames": ["Name in local language if recognizable", "any other common names"],
  "diagnosis": "Clear, friendly 2-3 sentence assessment of the plant's health. Mention any visible issues.",
  "healthStatus": "healthy | attention_needed | critical",
  "careLevel": "easy | moderate | expert",
  "tips": [
    "Tip 1: Specific to today's weather if available (watering, shade, etc.)",
    "Tip 2: Pest or disease prevention based on conditions",
    "Tip 3: General best practice for this plant in current climate"
  ],
  "wateringFrequency": "e.g. Every 2-3 days, or Twice weekly",
  "sunlight": "e.g. Bright indirect light, Full sun 6hrs",
  "bestFor": "e.g. Beginner gardeners, Balcony/terrace, Indoor spaces",
  "emoji": "single most fitting plant emoji",
  "tags": ["3-5 short tags like: herb, succulent, indoor, tropical, medicinal etc."],
  "funFact": "One interesting or culturally relevant fact about this plant (1 sentence)"
}`;

  try {
    let imagePart;

    if (imageBase64 && mimeType) {
      imagePart = {
        inlineData: { data: imageBase64, mimeType },
      };
    } else if (imageUrl) {
      const { base64, mimeType: fetchedMime } = await imageUrlToBase64(imageUrl);
      imagePart = {
        inlineData: { data: base64, mimeType: fetchedMime },
      };
    } else {
      throw new Error("No image provided");
    }

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text().trim();

    // Strip markdown code blocks if Gemini adds them
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return { success: true, data: parsed };
  } catch (err) {
    console.error("Gemini analysis error:", err.message);
    return {
      success: false,
      error: err.message,
      data: {
        species: "Unknown",
        commonName: "Unknown Plant",
        diagnosis: "Could not analyze the image. Please try with a clearer photo.",
        healthStatus: "unknown",
        tips: ["Ensure good lighting when taking photos", "Try a closer shot of the plant", "Make sure the plant fills most of the frame"],
        emoji: "🌿",
        tags: [],
        careLevel: "moderate",
      },
    };
  }
};

/**
 * AI Smart Matching – Find best swap candidates for a given post
 * Gemini reads recent posts and suggests intelligent matches
 */
const findSmartMatches = async ({ userPost, allPosts, userLocation }) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Prepare posts summary for Gemini (keep it concise)
  const postsSummary = allPosts
    .slice(0, 50) // Cap at 50 for token limits
    .map((p) => ({
      id: p._id,
      type: p.type,
      species: p.aiAnalysis?.commonName || p.title,
      location: p.location?.displayName,
      healthStatus: p.aiAnalysis?.healthStatus,
      tags: p.tags,
    }));

  const prompt = `You are a plant swap matchmaker. A gardener has a plant post and wants smart swap suggestions.

USER'S POST:
- Type: ${userPost.type} (they are ${userPost.type === "available" ? "offering" : "looking for"} this plant)
- Plant: ${userPost.aiAnalysis?.commonName || userPost.title}
- Species: ${userPost.aiAnalysis?.species || "Unknown"}
- Tags: ${(userPost.tags || []).join(", ")}
- Location: ${userLocation || "Unknown"}
- Health: ${userPost.aiAnalysis?.healthStatus || "unknown"}

AVAILABLE COMMUNITY POSTS:
${JSON.stringify(postsSummary, null, 2)}

Find the top 3 most relevant matches. Consider:
1. Complementary types: if user wants, suggest "available" posts; if user offers, suggest "wanted" posts
2. Plant compatibility (similar care needs = good swap partners)
3. Geographic proximity if location data available
4. Health status (prioritize healthy plants)

Respond ONLY with valid JSON — no extra text:
{
  "matches": [
    {
      "postId": "exact _id from the posts list",
      "reason": "Short, friendly reason why this is a great match (1 sentence)",
      "matchScore": 95
    }
  ],
  "matchTip": "One helpful tip for making a successful plant swap (1 sentence)"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    return { success: true, data: parsed };
  } catch (err) {
    console.error("Gemini matching error:", err.message);
    return { success: false, error: err.message, data: { matches: [], matchTip: "" } };
  }
};

/**
 * Generate a care schedule summary for a user's plant collection
 */
const generateCareSchedule = async ({ plants, weather, location }) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const plantList = plants
    .map((p) => `${p.aiAnalysis?.commonName || p.title} (${p.aiAnalysis?.healthStatus})`)
    .join(", ");

  const prompt = `You are a helpful gardening assistant. Based on this gardener's plant collection and their local weather, generate a practical weekly care schedule.

Plants: ${plantList}
Location: ${location?.displayName || "Unknown"}
Current weather: ${weather?.condition || "Unknown"}, ${weather?.temperature || "?"}°C, ${weather?.humidity || "?"}% humidity

Respond ONLY with valid JSON:
{
  "schedule": {
    "monday": ["task 1", "task 2"],
    "tuesday": ["task 1"],
    "wednesday": ["task 1", "task 2"],
    "thursday": ["task 1"],
    "friday": ["task 1", "task 2"],
    "saturday": ["task 1", "task 2"],
    "sunday": ["task 1"]
  },
  "weeklyTip": "One key tip for this week based on weather (1-2 sentences)",
  "urgentAlerts": ["Any urgent warnings based on current weather conditions"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return { success: true, data: JSON.parse(jsonStr) };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { analyzePlant, findSmartMatches, generateCareSchedule };
