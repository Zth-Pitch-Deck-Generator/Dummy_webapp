// backend/routes/outline.ts
import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";
import { geminiJson } from "../lib/geminiFlash.js";
import { authenticate } from "../middleware/auth.js";

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
      .from('projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (projErr || !projectOwnerData) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (projectOwnerData.user_id !== req.user?.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!regenerate) {
        // **FIXED QUERY**: Select user_edits directly from the outlines table
        const { data, error } = await supabase
        .from("outlines")
        .select(
          `
            id,
            outline_json,
            user_edits,
            outline_reviews (*)
          `
        )
        .eq("project_id", projectId)
        .single();

      if (error) {
        console.error("Supabase fetch outline with edits error:", error);
        // Fall through to generate a new one if fetching fails
      }

      if (data) {
        return res.json({
          id: data.id,
          outline_json: data.outline_json,
          // **FIXED DATA ACCESS**: Access user_edits directly from the outline data
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

    if (deckSubtype === "basic_pitch_deck") {
        prompt = ` 
        You are a highly empathetic and perceptive strategic investor at Y - Combinator and have invested in several startups based on the answers that the founders give us in the questions that we ask them you need to strategically recreate there answers in a way that will look interesting from an investors point of view consider that the founders are new they dont have any idea about the pitch.
        Your goal is to present there answers or idea in such a way that an investor who is reading it can relate in a pitch deck.

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
        3. For all the answers which we get from the founder they should be rephrased in a more investor ready manner, think like you are an investor at Y-Combinator based on all your experiences.How would you want
        4. For the market opportunity slide make sure that you add the market size, growth rate, key developments that might take place and the opportunity in the outline part (Example: The fintech market is currently of 80 billion dollars and is subjected to grow at a CGAR of 12% and the key trends and the other competitors are.) Add the CAGR as well for this insutry, and one important metrics that shows the growth in this industry.
        **Output Format:**
        Return ONLY a valid JSON array of exactly 8 slide objects with this exact structure:
        [
          { "title": "Cover", "bullet_points": string[] },
          { "title": "Problem", "bullet_points": string[] },
          { "title": "Solution", "bullet_points": string[] },
          { "title": "Market Opportunity", "bullet_points": string[] },
          { "title": "Traction", "bullet_points": string[] },
          { "title": "Team", "bullet_points": string[] },
          { "title": "Go-To-Market", "bullet_points": string[] },
          { "title": "The Ask", "bullet_points": string[] }
        ]

        Transcript:"""${transcript}"""`;
    } else {
      const slideCount = projectData.slide_count || 12;
      prompt = `
      Using the following interview transcript, create a ${slideCount}-slide pitch deck outline for a "${deckSubtype}" deck.
      The outline should intelligently synthesize the user's answers into coherent slide content.
      Return ONLY a valid JSON array of exactly ${slideCount} slide objects:
      [
        { "title": string, "bullet_points": string[], "data_needed": string[] },
        ...
      ]

      Transcript:"""${transcript}"""`;
    }

    const outline = await geminiJson(prompt);

    const basicSlideSchema = z.object({
      title: z.string(),
      bullet_points: z.array(z.string()),
    });
    const otherDeckSlideSchema = z.object({
      title: z.string(),
      bullet_points: z.array(z.string()),
      data_needed: z.array(z.string()),
    });

    const outlineSchema =
      deckSubtype === "basic_pitch_deck"
        ? z.array(basicSlideSchema).length(8)
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
      .from('outlines')
      .select('project_id')
      .eq('id', outlineId)
      .single();
    if (!outlineRow) return res.status(404).json({ error: 'Outline not found' });

    const { data: projRow } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', outlineRow.project_id)
      .single();
    if (!projRow || projRow.user_id !== (req as any).user?.id) return res.status(403).json({ error: 'Forbidden' });

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

// --- NEW: Endpoint to Save User Edits ---
router.post("/edits", authenticate, async (req, res) => {
  try {
    const parse = SaveUserEditsRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res
        .status(400)
        .json({ error: "Bad payload", details: parse.error.errors });
    }
    const { outlineId, userEdits } = parse.data;

    const { data: outlineRow } = await supabase
      .from('outlines')
      .select('project_id')
      .eq('id', outlineId)
      .single();
    if (!outlineRow) return res.status(404).json({ error: 'Outline not found' });

    const { data: projRow } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', outlineRow.project_id)
      .single();
    if (!projRow || projRow.user_id !== (req as any).user?.id) return res.status(403).json({ error: 'Forbidden' });

    // **FIXED UPDATE LOGIC**: Update the user_edits column on the 'outlines' table
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
      return res
        .status(400)
        .json({
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