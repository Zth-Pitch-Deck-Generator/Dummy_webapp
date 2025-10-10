// backend/routes/deck.ts
import { Router } from "express";
import { z } from "zod";
import { geminiJson } from "../lib/geminiFlash.js";
import { supabase } from "../supabase.js";

const router = Router();

const feedbackBodySchema = z.object({
  projectId: z.string().uuid(),
});

router.post("/feedback", async (req, res) => {
  try {
    const parsed = feedbackBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({ error: "Invalid payload" });
    }
    const { projectId } = parsed.data;

    const { data: sessionData, error: sessionError } = await supabase
      .from('qa_sessions')
      .select('transcript')
      .eq('project_id', projectId)
      .limit(1)
      .single();

    if (sessionError || !sessionData || !sessionData.transcript) {
      return void res.status(404).json({ error: "Q&A session missing or transcript is empty" });
    }

    const transcriptTxt = (sessionData.transcript as any[])
      .map((m: any) => `${m.role === "user" ? "Founder" : "Analyst"}: ${m.content}`)
      .join("\n");

    const prompt = `
      You are a VC analyst reviewing a startup's pitch based on an interview transcript.
      Provide three concise, actionable recommendations for the founder to improve their pitch deck.
      For each recommendation, provide a "title", a "description", and a "type" ('positive', 'suggestion', 'critical').

      Transcript:
      """
      ${transcriptTxt}
      """

      Return ONLY a valid JSON object with a single key "recommendations" which is an array of the three recommendation objects.
      Example format:
      {
        "recommendations": [
          { "title": "Strong Problem Definition", "description": "Your problem is clear. Use data to back it up.", "type": "positive" },
          { "title": "Clarify Target Audience", "description": "Consider creating user personas for your market slide.", "type": "suggestion" },
          { "title": "Vague Revenue Model", "description": "Your revenue streams are unclear. Specify pricing tiers.", "type": "critical" }
        ]
      }
    `;

    const feedback = await geminiJson(prompt);

    res.status(200).json(feedback);

  } catch (error: any) {
    console.error("Error in /api/deck/feedback:", error.message);
    res.status(500).json({ error: "Failed to generate feedback." });
  }
});

export default router;
