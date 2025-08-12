import { Router, Request, Response, RequestHandler } from "express";
import { z } from "zod";
import { supabase } from "../supabase";
import { geminiJson } from "../lib/geminiFlash";

const router = Router();

/* ---------- POST /api/outline ---------- */
const handleOutline: RequestHandler = async (req, res) => {
  const schema = z.object({
    projectId: z.string().uuid(),
    regenerate: z.boolean().optional(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Bad payload" });
    return;
  }

  const { projectId, regenerate } = parse.data;

  if (!regenerate) {
    const { data } = await supabase
      .from("outlines")
      .select("outline_json")
      .eq("project_id", projectId)
      .maybeSingle();
    if (data) {
      res.json(data.outline_json);
      return;
    }
  }

  const { data: project } = await supabase
    .from("projects")
    .select("slide_count, qa_sessions(transcript)")
    .eq("id", projectId)
    .single();

  if (!project || !project.qa_sessions || project.qa_sessions.length === 0) {
    res.status(404).json({ error: "Project or Q&A session missing" });
    return;
  }

  const slideCount = project.slide_count || 10;
  const transcript = (project.qa_sessions as any[])[0].transcript;
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
  try {
    outline = await geminiJson(prompt);
  } catch (e) {
    console.error("Gemini failure:", e);
    res.status(502).json({ error: "Gemini did not return JSON" });
    return;
  }

  const slideSchema = z.object({
    title: z.string(),
    bullet_points: z.array(z.string()),
    data_needed: z.array(z.string()),
  });
  const outlineSchema = z.array(slideSchema).length(slideCount);
  const valid = outlineSchema.safeParse(outline);

  if (!valid.success) {
    console.error(valid.error.format());
    res.status(502).json({ error: "Outline JSON schema invalid or wrong slide count" });
    return;
  }

  const { error, data: upserted } = await supabase
    .from("outlines")
    .upsert({ project_id: projectId, outline_json: outline })
    .select("id")
    .single();

  if (error) {
    console.error(error);
    res.status(500).json({ error: "DB upsert failed" });
    return;
  }

  res.json({ id: upserted.id, outline });
};

/* ---------- POST /api/outline/eval ---------- */
const handleEval: RequestHandler = async (req, res) => {
  const schema = z.object({ projectId: z.string().uuid() });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Bad payload" });
    return;
  }

  const { projectId } = parse.data;

  const { data: outlineRow } = await supabase
    .from("outlines")
    .select("id, outline_json")
    .eq("project_id", projectId)
    .single();

  if (!outlineRow) {
    res.status(404).json({ error: "Outline not found" });
    return;
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
  try {
    review = await geminiJson(evalPrompt);
    const swotSchema = z.object({
      strength: z.array(z.string()),
      weakness: z.array(z.string()),
      opportunities: z.array(z.string()),
      threats: z.array(z.string()),
    });
    review = swotSchema.parse(review);
  } catch (e) {
    res.status(502).json({ error: "Gemini evaluation failed or returned invalid SWOT format." });
    return;
  }

  res.json(review);
};

router.post("/", handleOutline);
router.post("/eval", handleEval);

export default router;