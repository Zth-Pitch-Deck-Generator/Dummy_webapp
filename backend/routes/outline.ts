import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";
import { geminiJson } from "../lib/geminiFlash.js";

const router = Router();

/* ---------- POST /api/outline ---------- */
const handleOutline: any = async (req: any, res: any) => {
  try {
    const schema = z.object({
      projectId: z.string().uuid(),
      regenerate: z.boolean().optional(),
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) {
      return void res.status(400).json({ error: "Bad payload" });
    }

    const { projectId, regenerate } = parse.data;

    if (!regenerate) {
      const { data } = await supabase
        .from("outlines")
        .select("outline_json")
        .eq("project_id", projectId)
        .maybeSingle();
      if (data) {
        return void res.json(data.outline_json);
      }
    }

    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('slide_count, decktype') // decktype now holds the subtype
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

    const transcript = sessionData.transcript;
    const transcriptTxt = transcript
      .map((m: any) => `${m.role === "user" ? "Founder" : "Analyst"}: ${m.content}`)
      .join("\n");

    let prompt;
    const deckSubtype = projectData.decktype;

        // --- Dynamic Prompt Generation based on Deck Subtype ---
    if (deckSubtype === 'basic_pitch_deck') {
        // Generates a highly empathetic and insightful outline for basic pitch decks.
        // The AI is instructed to deeply understand, strategically synthesize,
        // and implicitly highlight key information within concise bullet points.
        // Output adheres to original Zod schema: title and bullet_points.
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

        Transcript:"""${transcriptTxt}"""`;
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

      Transcript:"""${transcriptTxt}"""`;
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

    const { error, data: upserted } = await supabase
      .from("outlines")
      .upsert({ project_id: projectId, outline_json: outline })
      .select("id")
      .single();
      
    if (error) {
      console.error("Supabase upsert error:", error);
      return void res.status(500).json({ error: "DB upsert failed" });
    }

    return void res.json(outline);
  } catch (e: any) {
    console.error("Error in /api/outline:", e);
    return void res.status(500).json({ error: "Failed to generate outline.", message: e.message });
  }
};

router.post("/", handleOutline);

/* ---------- POST /api/outline/eval ---------- */
router.post("/eval", async (req, res) => {
  try {
    const schema = z.object({
      projectId: z.string().uuid(),
    });
    const parse = schema.safeParse(req.body);
    if (!parse.success) {
      return void res.status(400).json({ error: "Bad payload" });
    }
    const { projectId } = parse.data;

    // Fetch outline and transcript for the project
    const { data: outlineData, error: outlineError } = await supabase
      .from("outlines")
      .select("outline_json")
      .eq("project_id", projectId)
      .maybeSingle();

    if (outlineError || !outlineData || !outlineData.outline_json) {
      return void res.status(404).json({ error: "Outline not found" });
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

    return void res.json(swot);
  } catch (e: any) {
    console.error("Error in /api/outline/eval:", e);
    return void res.status(500).json({ error: "Failed to generate SWOT analysis.", message: e.message });
  }
});

export default router;
