// api/_memory.js

import { Redis } from "@upstash/redis";

// ------------------------------
// Initialize Redis (Make sure environment variables are set on Vercel)
// ------------------------------
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Single session key for your voice agent
const SESSION_KEY = "voice-agent-session";

// ------------------------------
// Save message history
// ------------------------------
export async function saveHistory(history) {
  try {
    // We use JSON.stringify here for safety, ensuring Redis stores a clean string.
    await redis.set(SESSION_KEY, JSON.stringify(history), {
      ex: 3600, // 1 hour expiry
    });
    return true;
  } catch (err) {
    console.error("❌ Redis saveHistory Error:", err);
    return false;
  }
}

// ------------------------------
// Load history
// ------------------------------
export async function loadHistory() {
  try {
    const raw = await redis.get(SESSION_KEY);
    if (!raw) return [];

    // Upstash/Redis client sometimes returns the deserialized object, 
    // but the safest approach is to ensure JSON parsing if it's a string.
    if (typeof raw === "string") {
        return JSON.parse(raw);
    }

    // If it's already an object (deserialized by the client), return it.
    return Array.isArray(raw) ? raw : [];

  } catch (err) {
    console.error("❌ Redis loadHistory Error:", err);
    return [];
  }
}

// ------------------------------
// Append to memory
// ------------------------------
export async function appendToHistory(userMessage, botMessage) {
  try {
    const history = await loadHistory();
    const updated = [
      ...history,
      {
        role: "user",
        parts: [{ text: userMessage }],
      },
      {
        role: "model",
        parts: [{ text: botMessage }],
      },
    ];

    await saveHistory(updated);
    return updated;
  } catch (err) {
    console.error("❌ Redis appendToHistory Error:", err);
    return null;
  }
}

// NOTE: clearMemory and hasMemory are not used by text-interview.js, 
// so they can be removed or kept, but they don't affect the crash.

export { redis }; // Exporting redis isn't used, but doesn't hurt.