// /api/longMemory.js
import pkg from "@supabase/supabase-js";
const { createClient } = pkg;

// Creating Supabase client where Vercel will provide env vars
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// -------------------------------------------------------
// LOAD LONG-TERM MEMORY (LTM)
// -------------------------------------------------------
export async function loadLongTermMemory(sessionId) {
  const { data, error } = await supabase
    .from("long_term_memory")
    .select("facts")
    .eq("session_id", sessionId)
    .single();

  if (error || !data) return {};

  return data.facts || {};
}

// -------------------------------------------------------
// SAVE/MERGE LONG-TERM MEMORY
// -------------------------------------------------------
export async function saveLongTermMemory(sessionId, newFacts) {
  const current = await loadLongTermMemory(sessionId);

  // Merge new facts into old
  const updatedFacts = { ...current, ...newFacts };

  const { error } = await supabase
    .from("long_term_memory")
    .upsert({
      session_id: sessionId,
      facts: updatedFacts
    });

  if (error) console.error("LTM Save Error:", error);

  return updatedFacts;
}
