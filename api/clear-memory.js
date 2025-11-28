import { clearMemory } from "./_memory.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await clearMemory();
    return res.status(200).json({
      success: true,
      message: "Memory cleared.",
    });
  } catch (error) {
    console.error("clear-memory Error:", error);
    return res.status(500).json({
      error: "Failed to clear memory",
    });
  }
}
