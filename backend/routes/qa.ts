// qa.ts
import { Router, Request, Response, RequestHandler } from "express";
import OpenAI from "openai";
import { supabase } from "../supabase";
import { z } from "zod";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


const bodySchema = z.object({
  projectId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(["ai", "user"]),
      content: z.string()
    })
  )
});

/* ---------- POST /api/qa  ── Ask contextual question & stream reply ---------- */
const qaHandler: RequestHandler = async (req: Request, res: Response) => {

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    console.log("zod errors:", parsed.error.flatten());
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const { projectId, messages } = parsed.data;

  // 1. FETCH PROJECT DETAILS FROM SUPABASE
  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("name, industry, description, decktype")
    .eq("id", projectId)
    .single();

  if (projectError || !projectData) {
    console.error("Project lookup error:", projectError);
    res.status(404).json({ error: "Project not found." });
    return;
  }

  // 2. CREATE A CONTEXTUAL SYSTEM PROMPT
  const systemPrompt = `
    You are a friendly VC analyst conducting a Q&A to build a pitch deck.
    The user's project is called "${projectData.name}" in the "${projectData.industry}" sector.
    Their goal is to create a "${projectData.decktype}" deck.
    Their initial description is: "${projectData.description}".

    Based on this context and the chat history, ask ONE insightful question at a time to gather the necessary information.
    Keep your follow-ups brief and encouraging. Your response should ONLY be the next question.
  `;

  const chatHistory = messages.map(m => ({
    role: m.role === "ai" ? "assistant" as const : "user" as const,
    content: m.content
  }));

  // 3. CALL GPT-4o WITH THE NEW DYNAMIC PROMPT
  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },




      ...chatHistory
    ]
  });


  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");


  let assistantText = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || "";
    assistantText += delta;
    res.write(delta);
  }
  res.end();


  // const lastUser = messages[messages.length - 1];
  // await supabase.from("answers").insert([
  //   {
  //     project_id: projectId,
  //     question: lastUser.content, // This is technically the AI's previous question
  //     answer: assistantText      // This is the user's answer
  //   }
  // ]);
};
router.post("/", qaHandler);

/* ---------- POST /api/qa/session/complete  ── Save full transcript ---------- */
const completeHandler: RequestHandler = async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    console.log("zod errors:", parsed.error.flatten());
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const { projectId, messages } = parsed.data;

  await supabase.from("qa_sessions").upsert([{
    project_id: projectId,
    transcript: messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: Date.now()
    })),
    completed: new Date().toISOString()
  }]);



  res.status(204).end();
  return;



};
router.post("/session/complete", completeHandler);

export default router;