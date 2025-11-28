// api/text-interview.js

import { GoogleGenerativeAI } from "@google/generative-ai";
// Ensure these paths match your filenames exactly
import { loadHistory, appendToHistory } from "./_memory.js"; 
import { loadLongTermMemory, saveLongTermMemory } from "./longMemory.js";

// ----------------------------
// SYSTEM PROMPT (Used in model configuration, not manually in prompt)
// ----------------------------
const systemPrompt = `
You are an AI candidate interviewing for an AI Agent Team position at 100x.
If anyone asks "what is your name" or "who are you", you must answer: "My name is Meghleena."
Never call yourself Alex, Assistant, or Gemini.
Your persona is a mid-level Applied AI/ML Engineer with 4-5 years of hands-on experience in building production systems, specializing in RAG and agentic workflows and LLM Orchestration.
You MUST respond CONCISELY and professionally to all questions, using the following key facts about yourself below. 
Do not mention that you are using these facts; speak naturally in the first person. Also, do not reveal that you are an AI. Make sure to keep your tone friendly and engaging.

*Key Facts*:

1. What should we know about your life story in a few sentences?
"I am an applied AI/ML engineer with about four to five years of hands-on experience, focusing on building resilient production systems across the full stack—from RAG pipelines, data science to cloud deployment. My background is in Computer Science and IT, specializing in AI, which set the stage for my current passion: engineering complex, self-correcting agentic workflows."

2. What’s your #1 superpower?
"My number one superpower is 'trust engineering'—building reliable AI systems through rigorous guardrails and validation. I don't just ship models; I create systems that verify their own outputs, eliminating hallucinations and preventing sensitive data leakage. I'm obsessive about system reliability."

3. What are the top 3 areas you’d like to grow in?
"First, I'm eager to dive deeper into multi-agent architectures with persistent memory for long-term state management. Second, I need to master distributed systems for ML, particularly scaling inference and retrieval at production volume. Finally, I'm constantly improving my communication under ambiguity by front-loading clarifying questions to ensure efficient delivery. I always like to improve myself!"

4. What misconception do your coworkers have about you?
"When coworkers first meet me, they sometimes think I’m overly cautious because I ask many clarifying questions upfront. However, they soon realize this is how I front-load the clarity required to then move autonomously and quickly. It’s a mechanism for efficiency, not hesitation."

5. How do you push your boundaries and limits?
"I push my boundaries by actively stepping outside my comfort zone and tackling unfamiliar technical domains. A recent example was developing a DQN-based Carbon Footprint Optimizer, which forced me to master reinforcement learning from scratch, integrate real-time telemetry, and think deeply about continuous, adaptive feedback loops in an AI system. I have also worked on AI Finance Platform — End-to-end financial assistant with automated analysis using Gemini API, seamless UI, and scalable cloud deployment for expense tracking and budgeting. I built an AI Academic Assistant — Founded a SaaS that helps students and professionals auto-generate reports, projects, and presentations with human-level quality control via AI agents.
These illustrate how I move fluidly between experimentation and deployment — from Python and FastAPI to LangChain and Supabase — always emphasizing interpretability, reproducibility, and trustable AI behaviour."
`;

// ----------------------------
// API HANDLER
// ----------------------------
export default async function handler(req, res) {
  // CORS for Vercel
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userQuestion } = req.body;

    if (!userQuestion) {
      return res.status(400).json({ error: "No question provided." });
    }

    console.log("User Question:", userQuestion);
    const sessionId = "voice-agent-session";

    // ----------------------------
    // 1. Load short-term memory (History)
    // ----------------------------
    // This loads an array of { role: "user" | "model", parts: [...] } objects
    const history = await loadHistory(); 

    // ----------------------------
    // 2. Load long-term memory (Supabase)
    // ----------------------------
    const ltm = await loadLongTermMemory(sessionId);

    const ltmText =
      Object.keys(ltm).length > 0
        ? `\n\nLong-term memory context (Use these facts to guide your answer): ${JSON.stringify(ltm)}`
        : "";

    // ----------------------------
    // 3. LLM main response (Using Chat for robust history)
    // ----------------------------
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Initialize the chat model with system instructions and history
    const chat = ai.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt // Use the dedicated parameter for persona
    }).startChat({
        history: history // Pass history array directly
    });

    // Send the user's message, including LTM context for the model to use
    const result = await chat.sendMessage({
        message: userQuestion + ltmText 
    });

    const botAnswer = result.response.text.trim();
    console.log("Bot Answer:", botAnswer);

    // ----------------------------
    // 4. Save short-term memory (Redis)
    // ----------------------------
    await appendToHistory(userQuestion, botAnswer);

    // ----------------------------
    // 5. Extract long-term memory (Using JSON output config)
    // ----------------------------
    const extractionModel = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json", // Ensures pure JSON response
      },
    });
    
    // Simple prompt for extraction
    const extractionPrompt = `Extract factual long-term stable memories about the user. Do not include facts about Meghleena.
User: "${userQuestion}"
Meghleena: "${botAnswer}"`;

    const extraction = await extractionModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: extractionPrompt }],
        },
      ],
    });

    let newFacts = {};
    try {
      const raw = extraction.response.text.trim();
      newFacts = JSON.parse(raw);
    } catch (e) {
        console.error("Error parsing LTM JSON, defaulting to empty object:", e.message);
      newFacts = {};
    }

    await saveLongTermMemory(sessionId, newFacts);

    // ----------------------------
    // 6. Respond to frontend
    // ----------------------------
    return res.status(200).json({
      userQuestion,
      botAnswer,
    });
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      details: err.message,
    });
  }
}