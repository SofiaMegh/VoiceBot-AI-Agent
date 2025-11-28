// /api/memory.js
export const config = {
  runtime: "nodejs"
};

import { Redis } from "@upstash/redis";

// ------------------------------
// Initialize Redis (Vercel provides env automatically)
// ------------------------------
export const redis = new Redis({
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

    // If Upstash already returns parsed JSON
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "object") return Array.isArray(raw) ? raw : [raw];

    // Otherwise: raw is JSON string
    return JSON.parse(raw);

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

// ------------------------------
// Clear memory
// ------------------------------
export async function clearMemory() {
  try {
    await redis.del(SESSION_KEY);
    return true;
  } catch (err) {
    console.error("❌ Redis clearMemory Error:", err);
    return false;
  }
}

// ------------------------------
// Check if memory exists
// ------------------------------
export async function hasMemory() {
  try {
    const raw = await redis.get(SESSION_KEY);
    return !!raw;
  } catch {
    return false;
  }
}
