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

    if (deckSubtype === 'basic_pitch_deck') {
        // Refactored prompt for 'basic_pitch_deck' to generate analytical content.
        // Sets AI persona as VC analyst, emphasizes synthesis, and requires specific
        // 'talking_points', 'key_insight', and 'visual_suggestion' fields for 8 fixed slides.
        prompt = `
        You are a top-tier Venture Capital analyst and pitch deck expert. Your task is to transform a founder's raw interview transcript into a compelling, strategic 8-slide "Basic Pitch Deck" outline.

        **Your Goal:** Do not just summarize. Your primary goal is to ANALYZE and SYNTHESIZE the founder's points, uncover the hidden strengths, and structure the information into a powerful narrative that would impress an investor.

        **The outline must contain exactly 8 slides with these specific titles in this order:**
        "Cover", "Problem", "Solution", "Market Opportunity", "Traction", "Team", "Go-To-Market", "The Ask"

        **For each slide, you must:**
        1.  Create the specific title from the list above.
        2.  List the most critical "talking_points" as an array of 2-3 concise strings, synthesizing the user's answers. The "Cover" slide's talking_points should include the company name and tagline.
        3.  Provide a "key_insight". This is your expert analysis. For example, if the founder provides a TAM, don't just state the number. Explain why it's a significant market opportunity. If they describe a feature, explain the strategic advantage it provides.
        4.  Give a "visual_suggestion" for the slide, such as "A compelling hero image with company logo" or "A graph showing month-over-month user growth."

        **Output Format:**
        Return ONLY a valid JSON array of exactly 8 slide objects with this exact structure:
        [
          {
            "title": "Cover",
            "talking_points": string[],
            "key_insight": string,
            "visual_suggestion": string
          },
          {
            "title": "Problem",
            "talking_points": string[],
            "key_insight": string,
            "visual_suggestion": string
          },
          {
            "title": "Solution",
            "talking_points": string[],
            "key_insight": string,
            "visual_suggestion": string
          },
          {
            "title": "Market Opportunity",
            "talking_points": string[],
            "key_insight": string,
            "visual_suggestion": string
          },
          {
            "title": "Traction",
            "talking_points": string[],
            "key_insight": string,
            "visual_suggestion": string
          },
          {
            "title": "Team",
            "talking_points": string[],
            "key_insight": string,
            "visual_suggestion": string
          },
          {
            "title": "Go-To-Market",
            "talking_points": string[],
            "key_insight": string,
            "visual_suggestion": string
          },
          {
            "title": "The Ask",
            "talking_points": string[],
            "key_insight": string,
            "visual_suggestion": string
          }
        ]

        Transcript:"""${transcriptTxt}"""`;
    } else {
      // Original prompt for other deck types (unchanged).
      // Generates an N-slide outline with 'bullet_points' and 'data_needed'.
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
    // --- End: Basic Pitch Deck Enhancement ---

    const outline = await geminiJson(prompt);
     // --- Start: Zod Schema Updates for Validation ---
    // Schema for the enhanced 'basic_pitch_deck' output.
    // Expects 'talking_points', 'key_insight', and 'visual_suggestion'.
    const basicSlideSchema = z.object({
      title: z.string(),
      talking_points: z.array(z.string()),
      key_insight: z.string().describe("AI's analysis of why this slide's content is compelling."),
      visual_suggestion: z.string(),
    });
    
    // Schema for other deck types, matching their original output structure.
    const otherDeckSlideSchema = z.object({
        title: z.string(),
        bullet_points: z.array(z.string()),
        data_needed: z.array(z.string()),
    });

    // Conditionally apply the correct Zod schema based on the deck type.
    const outlineSchema = deckSubtype === 'basic_pitch_deck' 
        ? z.array(basicSlideSchema).length(8)
        : z.array(otherDeckSlideSchema).min(1);
    // --- End: Zod Schema Updates for Validation ---
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
