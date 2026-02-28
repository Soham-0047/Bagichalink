const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// ─── Vision Models (support images) ──────────────────────────────────────────
const OPENROUTER_VISION_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "qwen/qwen2.5-vl-72b-instruct:free",
];

// ─── Text Models (no image support, for matching/schedule) ───────────────────
const OPENROUTER_TEXT_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "google/gemma-3-27b-it:free",
  "qwen/qwen2.5-72b-instruct:free",
];

// ─── Shared prompt builder ────────────────────────────────────────────────────
const buildPlantPrompt = (weather, location) => {
  let weatherContext = "Weather data unavailable.";
  if (weather && weather.temperature !== null) {
    weatherContext = `Temperature: ${weather.temperature}°C, Humidity: ${weather.humidity}%, Condition: ${weather.condition}`;
  }

  return `You are an expert botanist. Weather: ${weatherContext}. Location: ${
    location?.displayName || "unknown"
  }.

Analyze this plant and respond ONLY with valid JSON, no markdown, no extra text:
{
  "species": "Scientific name",
  "commonName": "Common name",
  "localNames": [],
  "diagnosis": "2-3 sentence health assessment",
  "healthStatus": "healthy or attention_needed or critical",
  "careLevel": "easy or moderate or expert",
  "tips": ["weather-aware tip 1", "pest/disease tip 2", "general tip 3"],
  "wateringFrequency": "e.g. Every 2-3 days",
  "sunlight": "e.g. Bright indirect light",
  "bestFor": "e.g. Beginner gardeners",
  "emoji": "single plant emoji",
  "tags": ["3-5 tags like herb, succulent, indoor"],
  "funFact": "One interesting fact"
}`;
};

// ─── Parse JSON helper ────────────────────────────────────────────────────────
const parseJSON = (text) => {
  const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(clean);
};

// ─── Fallback data ────────────────────────────────────────────────────────────
const fallbackAnalysis = {
  species: "Unknown",
  commonName: "Unknown Plant",
  diagnosis: "Could not analyze the image. Please try with a clearer photo.",
  healthStatus: "unknown",
  tips: ["Ensure good lighting", "Try a closer shot", "Make sure plant fills the frame"],
  emoji: "🌿",
  tags: [],
  careLevel: "moderate",
  wateringFrequency: "Unknown",
  sunlight: "Unknown",
  bestFor: "All gardeners",
  funFact: "Plants are amazing living organisms!",
  localNames: [],
};

// ─── 1. Groq Vision ───────────────────────────────────────────────────────────
const analyzePlantGroq = async ({ imageBase64, mimeType, weather, location }) => {
  let weatherContext = "Weather data unavailable.";
  if (weather && weather.temperature !== null) {
    weatherContext = `Current weather in ${location?.displayName || "your location"}:
    - Temperature: ${weather.temperature}°C
    - Humidity: ${weather.humidity}%
    - Condition: ${weather.condition}
    - Currently raining: ${weather.isRaining ? "Yes" : "No"}
    - High humidity (>75%): ${weather.isHumid ? "Yes" : "No"}`;
  }

  const prompt = `You are an expert botanist. ${weatherContext}

Analyze this plant photo and respond ONLY with valid JSON, no markdown, no extra text:
{
  "species": "Scientific name",
  "commonName": "Common name",
  "localNames": ["other names"],
  "diagnosis": "2-3 sentence health assessment",
  "healthStatus": "healthy or attention_needed or critical",
  "careLevel": "easy or moderate or expert",
  "tips": ["weather-aware tip 1", "pest/disease tip 2", "general tip 3"],
  "wateringFrequency": "e.g. Every 2-3 days",
  "sunlight": "e.g. Bright indirect light",
  "bestFor": "e.g. Beginner gardeners",
  "emoji": "single plant emoji",
  "tags": ["3-5 tags like herb, succulent, indoor"],
  "funFact": "One interesting fact"
}`;

  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          { type: "text", text: prompt },
        ],
      },
    ],
    max_tokens: 1000,
    temperature: 0.3,
  });

  const text = response.choices[0]?.message?.content?.trim() || "";
  return { success: true, data: parseJSON(text) };
};

// ─── 2. Gemini Vision ─────────────────────────────────────────────────────────
const analyzePlantGemini = async ({ imageUrl, imageBase64, mimeType, weather, location }) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // 1.5-flash has higher free quota
  const prompt = buildPlantPrompt(weather, location);

  let imagePart;
  if (imageBase64 && mimeType) {
    imagePart = { inlineData: { data: imageBase64, mimeType } };
  } else {
    const axios = require("axios");
    const response = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 8000 });
    imagePart = {
      inlineData: {
        data: Buffer.from(response.data).toString("base64"),
        mimeType: response.headers["content-type"] || "image/jpeg",
      },
    };
  }

  const result = await model.generateContent([prompt, imagePart]);
  const text = result.response.text().trim();
  return { success: true, data: parseJSON(text) };
};

// ─── 3. OpenRouter Vision (tries each model until one works) ──────────────────
const analyzePlantOpenRouter = async ({ imageBase64, mimeType, weather, location }) => {
  const prompt = buildPlantPrompt(weather, location);

  const messages = [
    {
      role: "user",
      content: imageBase64
        ? [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            { type: "text", text: prompt },
          ]
        : prompt,
    },
  ];

  for (const model of OPENROUTER_VISION_MODELS) {
    try {
      console.log(`Trying OpenRouter model: ${model}`);
      const response = await openrouter.chat.completions.create({
        model,
        messages,
        max_tokens: 800,
        temperature: 0.3,
      });
      const text = response.choices[0]?.message?.content?.trim() || "";
      const parsed = parseJSON(text);
      console.log(`✅ OpenRouter success with: ${model}`);
      return { success: true, data: parsed };
    } catch (err) {
      console.error(`OpenRouter model ${model} failed:`, err.message);
      // Continue to next model
    }
  }

  // All models exhausted — return fallback
  console.error("All OpenRouter vision models failed. Returning fallback.");
  return { success: false, data: fallbackAnalysis };
};

// ─── Main analyzePlant — full fallback chain ──────────────────────────────────
const analyzePlant = async ({ imageUrl, imageBase64, mimeType, weather, location }) => {
  // 1. Try Groq
  if (imageBase64) {
    try {
      return await analyzePlantGroq({ imageBase64, mimeType, weather, location });
    } catch (err) {
      console.error("Groq failed:", err.message);
    }
  }

  // 2. Try Gemini
  try {
    return await analyzePlantGemini({ imageUrl, imageBase64, mimeType, weather, location });
  } catch (err) {
    console.error("Gemini failed:", err.message);
  }

  // 3. Try OpenRouter (cycles through all free vision models)
  return await analyzePlantOpenRouter({ imageBase64, mimeType, weather, location });
};

// ─── Smart Matching — Groq → Gemini → OpenRouter ─────────────────────────────
const findSmartMatches = async ({ userPost, allPosts, userLocation }) => {
  const postsSummary = allPosts.slice(0, 50).map((p) => ({
    id: p._id,
    type: p.type,
    species: p.aiAnalysis?.commonName || p.title,
    location: p.location?.displayName,
    tags: p.tags,
  }));

  const prompt = `You are a plant swap matchmaker.

USER'S POST:
- Type: ${userPost.type}
- Plant: ${userPost.aiAnalysis?.commonName || userPost.title}
- Tags: ${(userPost.tags || []).join(", ")}
- Location: ${userLocation || "Unknown"}

COMMUNITY POSTS:
${JSON.stringify(postsSummary)}

Find top 3 matches. Respond ONLY with valid JSON, no markdown:
{
  "matches": [
    { "postId": "exact _id", "reason": "short reason", "matchScore": 90 }
  ],
  "matchTip": "one helpful swap tip"
}`;

  // 1. Try Groq
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
    });
    const text = response.choices[0]?.message?.content?.trim() || "";
    const parsed = parseJSON(text);
    if (!parsed.matches || !Array.isArray(parsed.matches)) throw new Error("Invalid format");
    return { success: true, data: parsed };
  } catch (err) {
    console.error("Groq matching failed:", err.message);
  }

  // 2. Try Gemini
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = parseJSON(text);
    if (!parsed.matches || !Array.isArray(parsed.matches)) throw new Error("Invalid format");
    return { success: true, data: parsed };
  } catch (err) {
    console.error("Gemini matching failed:", err.message);
  }

  // 3. Try OpenRouter text models
  for (const model of OPENROUTER_TEXT_MODELS) {
    try {
      console.log(`Trying OpenRouter text model for matching: ${model}`);
      const response = await openrouter.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.3,
      });
      const text = response.choices[0]?.message?.content?.trim() || "";
      const parsed = parseJSON(text);
      if (!parsed.matches || !Array.isArray(parsed.matches)) throw new Error("Invalid format");
      console.log(`✅ OpenRouter matching success with: ${model}`);
      return { success: true, data: parsed };
    } catch (err) {
      console.error(`OpenRouter model ${model} matching failed:`, err.message);
    }
  }

  // All failed — return graceful empty
  return {
    success: true,
    data: { matches: [], matchTip: "No matches found right now. Try again later!" },
  };
};

// ─── Care Schedule — Groq → Gemini → OpenRouter ───────────────────────────────
const generateCareSchedule = async ({ plants, weather, location }) => {
  const plantList = plants.map((p) => p.aiAnalysis?.commonName || p.title).join(", ");

  const prompt = `Generate a weekly plant care schedule.
Plants: ${plantList}
Location: ${location?.city || "Unknown"}
Weather: ${weather?.condition || "Unknown"}, ${weather?.temperature || "?"}°C, ${weather?.humidity || "?"}% humidity

Respond ONLY with valid JSON, no markdown:
{
  "schedule": {
    "monday": ["task"],
    "tuesday": ["task"],
    "wednesday": ["task"],
    "thursday": ["task"],
    "friday": ["task"],
    "saturday": ["task"],
    "sunday": ["task"]
  },
  "weeklyTip": "one tip",
  "urgentAlerts": ["any urgent warnings"]
}`;

  // 1. Try Groq
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.3,
    });
    const text = response.choices[0]?.message?.content?.trim() || "";
    return { success: true, data: parseJSON(text) };
  } catch (err) {
    console.error("Groq care schedule failed:", err.message);
  }

  // 2. Try Gemini
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return { success: true, data: parseJSON(text) };
  } catch (err) {
    console.error("Gemini care schedule failed:", err.message);
  }

  // 3. Try OpenRouter text models
  for (const model of OPENROUTER_TEXT_MODELS) {
    try {
      console.log(`Trying OpenRouter text model for care schedule: ${model}`);
      const response = await openrouter.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.3,
      });
      const text = response.choices[0]?.message?.content?.trim() || "";
      const parsed = parseJSON(text);
      console.log(`✅ OpenRouter care schedule success with: ${model}`);
      return { success: true, data: parsed };
    } catch (err) {
      console.error(`OpenRouter model ${model} care schedule failed:`, err.message);
    }
  }

  return { success: false, error: "All AI providers failed to generate care schedule." };
};

module.exports = { analyzePlant, findSmartMatches, generateCareSchedule };