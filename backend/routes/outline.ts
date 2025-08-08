import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabase } from "../supabase";
import { geminiJson } from "../lib/geminiFlash";

const router = Router();

/* ---------- POST /api/outline ---------- */
router.post("/", async (req: Request, res: Response) => {
  const schema = z.object({
    projectId : z.string().uuid(),
    regenerate: z.boolean().optional()
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return void res.status(400).json({ error: "Bad payload" });

  const { projectId, regenerate } = parse.data;

  /* 1. Return cached outline unless regenerate === true */
  if (!regenerate) {
    const { data } = await supabase
      .from("outlines")
      .select("outline_json")
      .eq("project_id", projectId)
      .maybeSingle();
    if (data) return void res.json(data.outline_json);
  }

  /* 2. Fetch Q&A transcript */
  const { data: qas } = await supabase
    .from("qa_sessions")
    .select("transcript")
    .eq("project_id", projectId)
    .single();
  if (!qas)
    return void res.status(404).json({ error: "Q&A session missing" });

  const transcriptTxt = qas.transcript
    .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  /* 3. Gemini prompt */
  const prompt = `
Using the following interview transcript, create a 12-slide seed-deck outline.
Return ONLY valid JSON array:
[
  { "title": string, "bullet_points": string[], "data_needed": string[] },
  ...
]  (12 elements)

Transcript:"""${transcriptTxt}"""`;

  /* 4. Generate outline */
  let outline: any;
  try {
    outline = await geminiJson(prompt);
  } catch (e) {
    console.error("Gemini failure:", e);
    return void res.status(502).json({ error: "Gemini did not return JSON" });
  }

  /* 5. Validate outline */
  const slideSchema   = z.object({
    title        : z.string(),
    bullet_points: z.array(z.string()),
    data_needed  : z.array(z.string())
  });
  const outlineSchema = z.array(slideSchema).length(12);
  const valid = outlineSchema.safeParse(outline);
  if (!valid.success) {
    console.error(valid.error.format());
    return void res.status(502).json({ error: "Outline JSON schema invalid" });
  }

  /* 6. Upsert + respond */
  const { error, data: upserted } = await supabase
    .from("outlines")
    .upsert({ project_id: projectId, outline_json: outline })
    .select("id")
    .single();
  if (error) {
    console.error(error);
    return void res.status(500).json({ error: "DB upsert failed" });
  }

  res.json({ id: upserted.id, outline });
});

/* ---------- POST /api/outline/eval ---------- */
router.post("/eval", async (req: Request, res: Response) => {
  const schema = z.object({ projectId: z.string().uuid() });
  const parse  = schema.safeParse(req.body);
  if (!parse.success) return void res.status(400).json({ error: "Bad payload" });

  const { projectId } = parse.data;

  const { data: outlineRow } = await supabase
    .from("outlines")
    .select("id, outline_json")
    .eq("project_id", projectId)
    .single();
  if (!outlineRow)
    return void res.status(404).json({ error: "Outline not found" });

  const evalPrompt = `
You are YC Pitch Coach. Review the outline (JSON) and respond ONLY:
{
  "summary": string,
  "missing_slides": string[],
  "clarity_issues": string[],
  "data_gaps": string[]
}

Outline:${JSON.stringify(outlineRow.outline_json)}`;

  let review;
  try {
    review = await geminiJson(evalPrompt);
  } catch (e) {
    return void res.status(502).json({ error: "Gemini evaluation failed" });
  }

  await supabase.from("outline_reviews").insert({
    outline_id : outlineRow.id,
    summary    : review.summary,
    improvements: {
      missing_slides : review.missing_slides,
      clarity_issues : review.clarity_issues,
      data_gaps      : review.data_gaps
    }
  });

  res.json(review);
});

export default router;
