import { loadHistory } from "./_memory.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const history = await loadHistory();
    return res.status(200).json({ history });
  } catch (error) {
    console.error("get-memory Error:", error);
    return res.status(500).json({ error: "Failed to load memory" });
  }
}
