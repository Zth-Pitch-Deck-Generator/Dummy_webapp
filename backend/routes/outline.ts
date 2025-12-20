import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";
import { authenticate } from "../middleware/auth.js";
import { generateOutline } from "../lib/aiAgent.js"; // Use centralized aiAgent
import { geminiJson } from "../lib/aiAgent.js"; // Use centralized aiAgent for SWOT

const router = Router();

// --- Zod Schemas for Validation ---

const OutlineRequestSchema = z.object({
  projectId: z.string().uuid(),
  regenerate: z.boolean().optional(),
});

const OutlineEvalRequestSchema = z.object({
  outlineId: z.string().uuid(),
  regenerate: z.boolean().optional(),
});

const UserEditPointSchema = z.object({
  content: z.string(),
  isUserAdded: z.literal(true),
  tempId: z.string().optional(),
});

const UserEditsSchema = z.record(
  z.string().regex(/^\d+$/),
  z.array(UserEditPointSchema)
);

const SaveUserEditsRequestSchema = z.object({
  outlineId: z.string().uuid(),
  userEdits: UserEditsSchema,
});

/* ---------- POST /api/outline ---------- */
const handleOutline = async (req: any, res: any) => {
  try {
    const parse = OutlineRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res
        .status(400)
        .json({ error: "Bad payload", details: parse.error.errors });
    }

    const { projectId, regenerate } = parse.data;

    // Verify project ownership
    const { data: projectOwnerData, error: projErr } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", projectId)
      .single();

    if (projErr || !projectOwnerData) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (projectOwnerData.user_id !== req.user?.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!regenerate) {
      const { data, error } = await supabase
        .from("outlines")
        .select(`
            id,
            outline_json,
            user_edits,
            outline_reviews (*)
          `)
        .eq("project_id", projectId)
        .single();

      if (data) {
        return res.json({
          id: data.id,
          outline_json: data.outline_json,
          user_edits: data.user_edits || {},
        });
      }
    }

    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("slide_count, decktype")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      return res.status(404).json({ error: "Project not found" });
    }

    const { data: sessionData, error: sessionError } = await supabase
      .from("qa_sessions")
      .select("transcript")
      .eq("project_id", projectId)
      .limit(1)
      .single();

    if (sessionError || !sessionData || !sessionData.transcript) {
      return res
        .status(404)
        .json({ error: "Q&A session missing or transcript is empty" });
    }

    const transcript = sessionData.transcript
      .map(
        (m: any) => `${m.role === "user" ? "Founder" : "Analyst"}: ${m.content}`
      )
      .join("\n");

    let prompt;
    const deckSubtype = projectData.decktype;

    // --- MAIN OUTLINE GENERATION LOGIC ---
    if (deckSubtype === "basic_pitch_deck") {
      prompt = `
    You are a highly empathetic and perceptive strategic investor at Y-Combinator. 
    You evaluate founders based on their answers, and your job is to strategically 
    reconstruct their responses in a way that appeals to investors. Assume the 
    founders are new and inexperienced—they don't know how to pitch. You must 
    present their ideas clearly, concisely, and in an investor-friendly manner.

    Your Mission:
    1. Deep Understanding:
       Carefully read the founder's transcript and fully understand their idea, 
       problem, solution, value proposition, and strategic signals.

    2. Strategic Synthesis:
       Do not simply summarize. Transform their answers into concise, high-impact 
       bullet points for each slide.

    3. Highlight & Emphasize:
       Identify standout insights, metrics, unique advantages, or strong data 
       points and weave them naturally into your bullet points.

    4. Founder Delight:
       Make the outline feel like the founder’s own idea—well-articulated, 
       polished, and investor-ready.

    The outline must contain exactly 10 slides in this order:
    "Cover", "Introduction", "Problem", "Solution", 
    "Market Opportunity", "Traction", "Competition", "Team", 
    "Go-To-Market", "The Ask"

    For each slide:
    1. Use the exact "title" listed above.
    2. Provide 3–4 high-quality, synthesized bullet points.
    3. Rephrase founder answers into investor-ready language.

    Additional Requirements:

    4. Market Opportunity Slide:
       Include market size, growth rate (CAGR), key trends, and major 
       developments. Add one strong metric that shows the industry's growth.

    5. Cover Slide:
       Include the company name and a short tagline.

    6. Problem Slide:
       Provide data-backed bullet points highlighting the problem, including 
       relevant data sources.

    7. Solution Slide:
       Highlight the unique value proposition clearly in one bullet point.

    8. Traction Slide:
       Add metrics, milestones, achievements, or any progress shared by the founder.

    9. Team Slide:
       Highlight founder expertise, background, and anything that builds confidence.

    10. Go-To-Market Slide:
        Outline primary customer acquisition and distribution strategies.

    11. The Ask Slide:
        Clearly mention the funding amount being requested and how it will be used.

    12. Market Opportunity Slide (extra requirement):
        Provide data sources for every number. Also explain the logic behind 
        how SAM and SOM percentages were derived.

    13. Competition Slide:
        Provide detailed competitor analysis including strengths, weaknesses, 
        market position, and differentiators.

    14. Introduction Slide:
        Explain the company using the following structure:
          - Problem with data
          - Market size and CAGR with data
          - Solution in brief
        Example:
          "15% of small businesses struggle with accounting (Source: XYZ Study 2022). 
           The accounting software market is valued at $10B and growing at 8% CAGR 
           (Source: ABC Report 2023). Our product simplifies accounting through 
           AI-driven automation."

    Output Format:
    Return ONLY a valid JSON array of exactly 10 slide objects. 
    Example:
    [
      { "title": "Cover", "bullet_points": ["Point 1", "Point 2",...] },
      { "title": "Introduction", "bullet_points": ["Point 1", "Point 2",...] }
    ]

    Transcript: """${transcript}"""`;
    } else {
      const slideCount = projectData.slide_count || 12;
      prompt = `
      Using the following interview transcript, create a ${slideCount}-slide pitch deck outline for a "${deckSubtype}" deck.
      The outline should intelligently synthesize the user's answers into coherent slide content.
      Return ONLY a valid JSON array of exactly ${slideCount} slide objects:
      [
        { "title": "Slide Title", "bullet_points": ["Point 1", "Point 2"], "data_needed": ["Data 1"] },
        ...
      ]

      Transcript:"""${transcript}"""`;
    }

    // USE OPENAI (GPT-4o) FOR OUTLINE GENERATION
    let outline = await generateOutline(prompt, transcript);

    // ✅ FIX: Normalize output if AI returns an object instead of array
    if (!Array.isArray(outline) && outline.slides) {
      outline = outline.slides;
    } else if (!Array.isArray(outline)) {
        // If it's still not an array, try to force it or fail gracefully
        console.error("AI returned non-array outline:", outline);
        return res.status(502).json({ error: "AI returned invalid format (not an array)" });
    }

    const basicSlideSchema = z.object({
      title: z.string(),
      bullet_points: z.array(z.string()),
    });
    const otherDeckSlideSchema = z.object({
      title: z.string(),
      bullet_points: z.array(z.string()),
      data_needed: z.array(z.string()).optional(),
    });

    const outlineSchema =
      deckSubtype === "basic_pitch_deck"
        ? z.array(basicSlideSchema).min(8)
        : z.array(otherDeckSlideSchema).min(1);

    const valid = outlineSchema.safeParse(outline);

    if (!valid.success) {
      console.error("Zod validation failed for outline:", valid.error.format());
      return res
        .status(502)
        .json({ error: "Outline JSON schema invalid from AI" });
    }

    const { data: upsertedOutline, error } = await supabase
      .from("outlines")
      .upsert({ project_id: projectId, outline_json: outline })
      .select("id, outline_json")
      .single();

    if (error) {
      console.error("Supabase outline upsert error:", error);
      return res.status(500).json({ error: "DB outline upsert failed" });
    }

    return res.json({
      id: upsertedOutline.id,
      outline_json: upsertedOutline.outline_json,
    });
  } catch (e: any) {
    console.error("Error in /api/outline:", e);
    return res
      .status(500)
      .json({ error: "Failed to generate outline.", message: e.message });
  }
};

router.post("/", authenticate, handleOutline);

/* ---------- POST /api/outline/eval ---------- */
router.post("/eval", authenticate, async (req, res) => {
  try {
    const parse = OutlineEvalRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res
        .status(400)
        .json({ error: "Bad payload", details: parse.error.errors });
    }
    const { outlineId, regenerate } = parse.data;

    const { data: outlineRow } = await supabase
      .from("outlines")
      .select("project_id")
      .eq("id", outlineId)
      .single();
    if (!outlineRow)
      return res.status(404).json({ error: "Outline not found" });

    const { data: projRow } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", outlineRow.project_id)
      .single();
    if (!projRow || projRow.user_id !== (req as any).user?.id)
      return res.status(403).json({ error: "Forbidden" });

    if (!regenerate) {
      const { data: existingReview } = await supabase
        .from("outline_reviews")
        .select("swot_json")
        .eq("outline_id", outlineId)
        .maybeSingle();
      if (existingReview && existingReview.swot_json) {
        return res.json(existingReview.swot_json);
      }
    }
    const { data: outlineData } = await supabase
      .from("outlines")
      .select("outline_json, project_id")
      .eq("id", outlineId)
      .single();

    if (!outlineData) {
      return res.status(404).json({ error: "Outline not found" });
    }
    const { data: sessionData } = await supabase
      .from("qa_sessions")
      .select("transcript")
      .eq("project_id", outlineData.project_id)
      .single();

    if (!sessionData || !sessionData.transcript) {
      return res.status(404).json({ error: "Q&A transcript not found" });
    }

    const transcript = sessionData.transcript
      .map(
        (m: any) => `${m.role === "user" ? "Founder" : "Analyst"}: ${m.content}`
      )
      .join("\n");
    const prompt = `
      Using the following pitch deck outline and founder interview transcript, generate a SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) for this startup.
      Return ONLY a valid JSON object with four arrays: { "strength": string[], "weakness": string[], "opportunities": string[], "threats": string[] }

      Outline: ${JSON.stringify(outlineData.outline_json, null, 2)}
      Transcript: """${transcript}"""
    `;

    // ✅ Use centralized geminiJson function (mapped to Gemini 2.0 Flash in aiAgent.ts)
    const swot = await geminiJson(prompt);

    const swotSchema = z.object({
      strength: z.array(z.string()),
      weakness: z.array(z.string()),
      opportunities: z.array(z.string()),
      threats: z.array(z.string()),
    });
    const valid = swotSchema.safeParse(swot);
    if (!valid.success) {
      return res
        .status(502)
        .json({ error: "SWOT JSON schema invalid from AI" });
    }
    const { error: upsertError } = await supabase
      .from("outline_reviews")
      .upsert({ outline_id: outlineId, swot_json: swot })
      .select("id")
      .single();

    if (upsertError) {
      console.error("Supabase SWOT upsert error:", upsertError);
      return res
        .status(500)
        .json({ error: "Failed to save SWOT analysis to DB." });
    }
    return res.json(swot);
  } catch (e: any) {
    console.error("Error in /api/outline/eval:", e);
    return res
      .status(500)
      .json({ error: "Failed to generate SWOT analysis.", message: e.message });
  }
});

// --- Endpoint to Save User Edits ---
router.post("/edits", authenticate, async (req, res) => {
  // ... (Code remains unchanged) ...
    try {
    const parse = SaveUserEditsRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res
        .status(400)
        .json({ error: "Bad payload", details: parse.error.errors });
    }
    const { outlineId, userEdits } = parse.data;

    const { data: outlineRow } = await supabase
      .from("outlines")
      .select("project_id")
      .eq("id", outlineId)
      .single();
    if (!outlineRow)
      return res.status(404).json({ error: "Outline not found" });

    const { data: projRow } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", outlineRow.project_id)
      .single();
    if (!projRow || projRow.user_id !== (req as any).user?.id)
      return res.status(403).json({ error: "Forbidden" });

    const { data, error } = await supabase
      .from("outlines")
      .update({ user_edits: userEdits })
      .eq("id", outlineId)
      .select("id, user_edits")
      .single();

    if (error) {
      console.error("Supabase update user edits error:", error);
      return res
        .status(500)
        .json({ error: "Failed to save user edits to database." });
    }

    if (!data) {
      return res
        .status(500)
        .json({ error: "No data returned after saving user edits." });
    }

    res.json({
      message: "User edits saved successfully",
      savedEdits: data.user_edits,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error("User edits validation error:", error.errors);
      return res.status(400).json({
        error: "Invalid request data for user edits.",
        details: error.errors,
      });
    }
    console.error("Error saving user edits:", error);
    res
      .status(500)
      .json({ error: "An unexpected error occurred while saving user edits." });
  }
});

export default router;