import { Router, Request, Response, RequestHandler } from "express";  // Ensure RequestHandler is imported
import OpenAI from "openai";
import { supabase } from "../supabase";
import { z } from "zod";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ---------- request-body contract ---------- */
const bodySchema = z.object({
  projectId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(["ai", "user"]),   // aligns with your front-end shape
      content: z.string()
    })
  )
});

/* ---------- POST /api/qa  ── ask next question & stream reply ---------- */
const qaHandler: RequestHandler = async (req: Request, res: Response) => {
  /* 1. validate body */
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    console.log("zod errors:", parsed.error.flatten());
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const { projectId, messages } = parsed.data;

  /* 2. transform to OpenAI format */
  const chatHistory = messages.map(m => ({
    role: m.role === "ai" ? "assistant" as const : "user" as const,
    content: m.content
  }));

  /* 3. call GPT-4o with streaming on */
  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    stream: true,
    messages: [
      {
        role: "system",
        content:
          "You are a friendly VC analyst AI. Conduct a strategic Q&A interview to gather everything needed to craft a compelling pitch deck. Ask only one insightful question at a time; wait for the user's answer before continuing."
      },
      ...chatHistory
    ]
  });

  /* 4. SSE headers */
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  /* 5. stream assistant reply & accumulate full text */
  let assistantText = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || "";
    assistantText += delta;
    res.write(delta);
  }
  res.end();

  /* 6. persist latest turn (user question + AI reply) */
  const lastUser = messages[messages.length - 1];
  await supabase.from("answers").insert([
    {
      project_id: projectId,
      question:   lastUser.content,
      answer:     assistantText
    }
  ]);
};
router.post("/", qaHandler);

/* ---------- POST /api/qa/session/complete  ── save full transcript ---------- */
const completeHandler: RequestHandler = async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    console.log("zod errors:", parsed.error.flatten());
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const { projectId, messages } = parsed.data;

  const { error } = await supabase.from("qa_sessions").upsert([
    {
      project_id: projectId,
      transcript: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: Date.now()
      })),
      completed: new Date().toISOString()
    }
  ]);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(204).end();  // No return here
};
router.post("/session/complete", completeHandler);

export default router;
