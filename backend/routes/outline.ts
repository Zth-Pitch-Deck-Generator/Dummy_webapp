// backend/routes/outline.ts

import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js"; // ADJUSTED: Using your specific supabase client path
import { geminiJson } from "../lib/geminiFlash.js";

const router = Router();

// --- Zod Schemas for Validation ---

// Existing schema for /api/outline
const OutlineRequestSchema = z.object({
  projectId: z.string().uuid(),
  regenerate: z.boolean().optional(),
});

// Existing schema for /api/outline/eval
const OutlineEvalRequestSchema = z.object({
  outlineId: z.string().uuid(),
  regenerate: z.boolean().optional(),
});

// NEW: Schema for user_edits (matching frontend's Map<number, OutlinePoint[]>)
// User edits will be an object where keys are slide indices (strings) and values are arrays of OutlinePoint
const UserEditPointSchema = z.object({
  content: z.string(),
  isUserAdded: z.literal(true), // Ensure this is always true for user edits saved
  tempId: z.string().optional(), // Can be optional as backend might re-assign or not care
});

// NEW: Schema for the structure of the userEdits object that comes from the frontend
// It's a record where keys are stringified slide indices (e.g., "0", "1")
// and values are arrays of UserEditPointSchema.
const UserEditsSchema = z.record(z.string().regex(/^\d+$/), z.array(UserEditPointSchema));

// NEW: Schema for /api/outline/edits request body
const SaveUserEditsRequestSchema = z.object({
  outlineId: z.string().uuid(),
  userEdits: UserEditsSchema, // Expects the structured userEdits object
});

/* ---------- POST /api/outline ---------- */
const handleOutline: any = async (req: any, res: any) => {
  try {
    const parse = OutlineRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return void res.status(400).json({ error: "Bad payload", details: parse.error.errors }); // ADJUSTED: Added details for better error messages
    }

    const { projectId, regenerate } = parse.data;

    if (!regenerate) {
      const { data, error } = await supabase
        .from("outlines")
        .select(
          `
          id,
          outline_json,
          outline_reviews(user_edits) // Selecting user_edits from related outline_reviews
          `
        )
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) {
        console.error("Supabase fetch outline with edits error:", error);
        // Continue without user_edits if there's an error, or throw.
        // For now, let's proceed to allow generation if fetch failed for existing.
      }

      if (data) {
        // Extract user_edits from the nested structure, defaulting to an empty object if none
        const userEdits = data.outline_reviews?.[0]?.user_edits || {};
        return void res.json({
          id: data.id,
          outline_json: data.outline_json,
          user_edits: userEdits, // Include user_edits in the response
        });
      }
    }

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('slide_count, decktype')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      return void res.status(404).json({ error: 'Project not found' });
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from('qa_sessions')
      .select('transcript')
      .eq('project_id', projectId)
      .limit(1)
      .single();

    if (sessionError || !sessionData || !sessionData.transcript) {
      return void res.status(404).json({ error: "Q&A session missing or transcript is empty" });
    }

    const transcript = sessionData.transcript
      .map((m: any) => `${m.role === "user" ? "Founder" : "Analyst"}: ${m.content}`)
      .join("\n");

    let prompt;
    const deckSubtype = projectData.decktype;

    // --- Dynamic Prompt Generation based on Deck Subtype ---
    if (deckSubtype === 'basic_pitch_deck') {
      prompt = `
        You are a highly empathetic and perceptive strategic partner for a startup founder. Your goal is to transform their raw interview transcript into an incredibly compelling, 8-slide "Basic Pitch Deck" outline that makes them feel their vision has been *perfectly understood and articulated*.

        **Your Mission:**
        1.  **Deep Understanding:** Read the founder's transcript with utmost care, truly grasping their core idea, problem, solution, unique value, and strategic points.
        2.  **Strategic Synthesis:** Do not just summarize. Synthesize the transcript into concise, impactful bullet points for each slide.
        3.  **Highlight & Emphasize:** **Crucially, identify and highlight any standout information, key metrics, unique advantages, or particularly strong answers directly within the bullet points.** These should be woven in naturally, conveying their significance without explicit labels.
        4.  **Client Delight:** Frame the content in a way that resonates deeply with the founder, making them feel like this outline is *exactly* what they envisioned, but better articulated.

        **The outline must contain exactly 8 slides with these specific titles in this order:**
        "Cover", "Problem", "Solution", "Market Opportunity", "Traction", "Team", "Go-To-Market", "The Ask"

        **For each slide, you must:**
        1.  Provide the exact "title" from the list above.
        2.  Generate 3-4 highly synthesized and impactful "bullet_points" that capture the essence of the slide, naturally incorporating and highlighting any key insights or impressive data from the transcript. For the "Cover" slide, include the company name and a compelling tagline.

        **Output Format:**
        Return ONLY a valid JSON array of exactly 8 slide objects with this exact structure:
        [
          {
            "title": "Cover",
            "bullet_points": string[]
          },
          {
            "title": "Problem",
            "bullet_points": string[]
          },
          {
            "title": "Solution",
            "bullet_points": string[]
          },
          {
            "title": "Market Opportunity",
            "bullet_points": string[]
          },
          {
            "title": "Traction",
            "bullet_points": string[]
          },
          {
            "title": "Team",
            "bullet_points": string[]
          },
          {
            "title": "Go-To-Market",
            "bullet_points": string[]
          },
          {
            "title": "The Ask",
            "bullet_points": string[]
          }
        ]

        Transcript:"""${transcript}"""`; // FIXED: Changed transcriptTxt to transcript
    } else {
      // Prompt for other deck types, retaining original behavior for bullet_points and data_needed.
      const slideCount = projectData.slide_count || 12;
      prompt = `
      Using the following interview transcript, create a ${slideCount}-slide pitch deck outline for a "${deckSubtype}" deck.
      The outline should intelligently synthesize the user's answers into coherent slide content.
      Return ONLY a valid JSON array of exactly ${slideCount} slide objects:
      [
        { "title": string, "bullet_points": string[], "data_needed": string[] },
        ...
      ]

      Transcript:"""${transcript}"""`; // FIXED: Changed transcriptTxt to transcript
    }
    // --- End Dynamic Prompt Generation ---

    const outline = await geminiJson(prompt);
    // --- Zod Schema Definitions & Conditional Validation ---
    // Schema for basic_pitch_deck: only title and bullet_points.
    const basicSlideSchema = z.object({
      title: z.string(),
      bullet_points: z.array(z.string()),
    });
    const otherDeckSlideSchema = z.object({
      title: z.string(),
      bullet_points: z.array(z.string()),
      data_needed: z.array(z.string()),
    });
    // Selects the appropriate Zod schema based on deck subtype for validation.
    const outlineSchema = deckSubtype === 'basic_pitch_deck'
      ? z.array(basicSlideSchema).length(8)
      : z.array(otherDeckSlideSchema).min(1);
    // --- End Zod Schema Definitions & Conditional Validation ---
    const valid = outlineSchema.safeParse(outline);

    if (!valid.success) {
      console.error("Zod validation failed for outline:", valid.error.format());
      return void res.status(502).json({ error: "Outline JSON schema invalid from AI" });
    }

    const { data: upsertedOutline, error } = await supabase
      .from("outlines")
      .upsert({ project_id: projectId, outline_json: outline })
      .select("id, outline_json") // Select both id and the content
      .single();

    if (error) {
      console.error("Supabase outline upsert error:", error);
      return void res.status(500).json({ error: "DB outline upsert failed" });
    }

    // Return an object containing the new outline's ID and its content
    return void res.json({ id: upsertedOutline.id, outline_json: upsertedOutline.outline_json });
  } catch (e: any) {
    console.error("Error in /api/outline:", e);
    return void res.status(500).json({ error: "Failed to generate outline.", message: e.message });
  }
};

router.post("/", handleOutline);

/* ---------- POST /api/outline/eval ---------- */
router.post("/eval", async (req, res) => {
  try {
    const parse = OutlineEvalRequestSchema.safeParse(req.body); // ADJUSTED: Using predefined schema
    if (!parse.success) {
      return void res.status(400).json({ error: "Bad payload", details: parse.error.errors }); // ADJUSTED: Added details
    }
    const { outlineId, regenerate } = parse.data;

    if (!regenerate) {
      const { data: existingReview } = await supabase
        .from("outline_reviews")
        .select("swot_json")
        .eq("outline_id", outlineId)
        .maybeSingle();
      if (existingReview && existingReview.swot_json) {
        return void res.json(existingReview.swot_json);
      }
    }
    // Fetch the outline and its project_id for context
    const { data: outlineData } = await supabase
      .from("outlines")
      .select("outline_json, project_id")
      .eq("id", outlineId)
      .single();

    if (!outlineData) {
      return void res.status(404).json({ error: "Outline not found" });
    }
    // Fetch the transcript using the project_id from the outline
    const { data: sessionData } = await supabase
      .from('qa_sessions')
      .select('transcript')
      .eq('project_id', outlineData.project_id)
      .single();

    if (!sessionData || !sessionData.transcript) {
      return void res.status(404).json({ error: "Q&A transcript not found" });
    }

    const transcript = sessionData.transcript
      .map((m: any) => `${m.role === "user" ? "Founder" : "Analyst"}: ${m.content}`)
      .join("\n");
    // Prompt for SWOT analysis
    const prompt = `
      Using the following pitch deck outline and founder interview transcript, generate a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for this startup.
      Return ONLY a valid JSON object with four arrays: { "strength": string[], "weakness": string[], "opportunities": string[], "threats": string[] }

      Outline: ${JSON.stringify(outlineData.outline_json, null, 2)}
      Transcript: """${transcript}"""
    `;

    const swot = await geminiJson(prompt);

    // Validate SWOT structure
    const swotSchema = z.object({
      strength: z.array(z.string()),
      weakness: z.array(z.string()),
      opportunities: z.array(z.string()),
      threats: z.array(z.string()),
    });
    const valid = swotSchema.safeParse(swot);
    if (!valid.success) {
      return void res.status(502).json({ error: "SWOT JSON schema invalid from AI" });
    }
    const { error: upsertError } = await supabase
      .from("outline_reviews")
      .upsert({ outline_id: outlineId, swot_json: swot })
      .select("id")
      .single();

    if (upsertError) {
      console.error("Supabase SWOT upsert error:", upsertError);
      return void res.status(500).json({ error: "Failed to save SWOT analysis to DB." });
    }
    return void res.json(swot);
  } catch (e: any) {
    console.error("Error in /api/outline/eval:", e);
    return void res.status(500).json({ error: "Failed to generate SWOT analysis.", message: e.message });
  }
});

// --- NEW: Endpoint to Save User Edits ---
router.post("/edits", async (req, res) => { // ADJUSTED: Removed authenticateToken
  try {
    const parse = SaveUserEditsRequestSchema.safeParse(req.body); // ADJUSTED: Using predefined schema
    if (!parse.success) {
      return void res.status(400).json({ error: "Bad payload", details: parse.error.errors }); // ADJUSTED: Added details
    }
    const { outlineId, userEdits } = parse.data;

    // Supabase upsert operation
    // We update the user_edits column for the review associated with outlineId
    const { data, error } = await supabase
      .from("outline_reviews")
      .upsert(
        {
          outline_id: outlineId,
          user_edits: userEdits, // This will store the object received from frontend
        },
        {
          onConflict: "outline_id", // If a record with this outline_id exists, update it
          ignoreDuplicates: false, // Ensure update happens if conflict
        }
      )
      .select("id, outline_id, user_edits") // Select what was upserted for confirmation
      .single(); // Expect a single record to be returned

    if (error) {
      console.error("Supabase upsert user edits error:", error);
      return res.status(500).json({ error: "Failed to save user edits to database." });
    }

    if (!data) {
      // This case should ideally not happen with upsert.single(), but good to guard
      return res.status(500).json({ error: "No data returned after saving user edits." });
    }

    // Respond with the saved user edits
    res.json({ message: "User edits saved successfully", savedEdits: data.user_edits });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error("User edits validation error:", error.errors);
      return res.status(400).json({ error: "Invalid request data for user edits.", details: error.errors });
    }
    console.error("Error saving user edits:", error);
    res.status(500).json({ error: "An unexpected error occurred while saving user edits." });
  }
});

export default router;