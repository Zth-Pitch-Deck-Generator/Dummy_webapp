import { Router, Request, Response, RequestHandler } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";
import { geminiJson } from "../lib/geminiFlash.js";

const router = Router();

/* ---------- POST /api/outline ---------- */
const handleOutline: RequestHandler = async (req, res) => {
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
      .select('slide_count')
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

    const slideCount = projectData.slide_count || 10;
    const transcript = sessionData.transcript;

    const transcriptTxt = transcript
      .map((m: any) => `${m.role === "user" ? "Founder" : "Analyst"}: ${m.content}`)
      .join("\n");

    const prompt = `
Using the following interview transcript, create a ${slideCount}-slide pitch deck outline.
The outline should intelligently synthesize the user's answers into coherent slide content.
Return ONLY a valid JSON array of exactly ${slideCount} slide objects:
[
  { "title": string, "bullet_points": string[], "data_needed": string[] },
  ...
]

Transcript:"""${transcriptTxt}"""`;

    let outline: any;
    outline = await geminiJson(prompt);

    const slideSchema = z.object({
      title: z.string(),
      bullet_points: z.array(z.string()),
      data_needed: z.array(z.string()),
    });
    const outlineSchema = z.array(slideSchema).min(1);
    const valid = outlineSchema.safeParse(outline);
    
    if (!valid.success) {
      console.error(valid.error.format());
      return void res
        .status(502)
        .json({ error: "Outline JSON schema invalid" });
    }

    const { error, data: upserted } = await supabase
      .from("outlines")
      .upsert({ project_id: projectId, outline_json: outline })
      .select("id")
      .single();
    if (error) {
      console.error(error);
      return void res.status(500).json({ error: "DB upsert failed" });
    }

    return void res.json({ id: upserted.id, outline });
  } catch (e: any) {
    console.error("Error in /api/outline:", e);
    return void res.status(500).json({ error: "Failed to generate outline.", message: e.message });
  }
};

/* ---------- POST /api/outline/eval ---------- */
const handleEval: RequestHandler = async (req, res) => {
  try {
    const schema = z.object({ projectId: z.string().uuid() });
    const parse = schema.safeParse(req.body);
    if (!parse.success) {
      return void res.status(400).json({ error: "Bad payload" });
    }
  
    const { projectId } = parse.data;
  
    const { data: outlineRow } = await supabase
      .from("outlines")
      .select("id, outline_json")
      .eq("project_id", projectId)
      .single();
    if (!outlineRow) {
      return void res.status(404).json({ error: "Outline not found" });
    }
  
    const evalPrompt = `
  You are a VC Pitch Coach. Review the provided pitch deck outline and perform a SWOT analysis based on the information within it.
  Respond ONLY with a valid JSON object with four keys: "strength", "weakness", "opportunities", and "threats". Each key should have an array of strings as its value.
  
  {
    "strength": string[],
    "weakness": string[],
    "opportunities": string[],
    "threats": string[]
  }
  
  Outline:${JSON.stringify(outlineRow.outline_json)}`;
  
    let review;
    review = await geminiJson(evalPrompt);
    const swotSchema = z.object({
      strength: z.array(z.string()),
      weakness: z.array(z.string()),
      opportunities: z.array(z.string()),
      threats: z.array(z.string()),
    });
    review = swotSchema.parse(review);
  
    // Save the SWOT analysis to the database
    const { error: insertError } = await supabase.from("outline_reviews").insert({
      outline_id: outlineRow.id,
      summary: "SWOT Analysis", // A generic summary
      improvements: review, // The full SWOT object
    });

    if (insertError) {
        console.error("Failed to save SWOT analysis:", insertError);
        // We can still return the review to the user even if DB save fails
    }

    return void res.json(review);
  } catch (e: any) {
    console.error("Error in /api/outline/eval:", e);
    return void res.status(502).json({ error: "Gemini evaluation failed or returned invalid SWOT format.", message: e.message });
  }
};

router.post("/", handleOutline);
router.post("/eval", handleEval);

export default router;
