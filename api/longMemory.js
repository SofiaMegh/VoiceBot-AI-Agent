// api/longMemory.js

import pkg from "@supabase/supabase-js";
const { createClient } = pkg;

// NOTE: export const config MUST BE REMOVED from this file.

// Creating Supabase client where Vercel will provide env vars
// Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in Vercel
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Assuming SERVICE_KEY is intentionally used
);

const TABLE_NAME = "long_term_memory"; // Use a constant for the table name

// -------------------------------------------------------
// LOAD LONG-TERM MEMORY (LTM)
// -------------------------------------------------------
export async function loadLongTermMemory(sessionId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("facts")
      .eq("session_id", sessionId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is the code for "no rows found"
        console.error("LTM Load Error:", error.message);
        return {};
    }

    // Return the facts object, or an empty object if data is null
    return data ? data.facts || {} : {};
  } catch (err) {
    console.error("LTM Catch Error:", err.message);
    return {};
  }
}

// -------------------------------------------------------
// SAVE/MERGE LONG-TERM MEMORY
// -------------------------------------------------------
export async function saveLongTermMemory(sessionId, newFacts) {
  // Check if there are any new facts before proceeding
    if (Object.keys(newFacts).length === 0) {
        return await loadLongTermMemory(sessionId); // Return existing state if nothing new
    }
    
    // Load current facts to merge
    const current = await loadLongTermMemory(sessionId); 

  // Merge new facts into old
  const updatedFacts = { ...current, ...newFacts };

  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert({
        session_id: sessionId,
        facts: updatedFacts,
        // Add a timestamp for tracking when the memory was updated
        updated_at: new Date().toISOString()
      }, { onConflict: 'session_id' }); // Use onConflict for clean upsert

    if (error) throw error;

    return updatedFacts;
  } catch (err) {
    console.error("LTM Save Error:", err.message);
    return updatedFacts;
  }
}