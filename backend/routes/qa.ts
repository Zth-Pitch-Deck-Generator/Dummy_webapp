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

  // 2. CONSTRUCT DECKTYPE-SPECIFIC INSTRUCTIONS FOR THE AI
  let deckTypeSpecificInstructions = '';
  switch (projectData.decktype) {
    case 'essentials':
      deckTypeSpecificInstructions = `
        The user has chosen the 'Essentials' deck. Your primary role is to be a structured guide.
        Focus on foundational business questions (Problem, Solution, Market, Team, Ask).
        Your goal is to get the core narrative right. Synthesize the user's raw thoughts into clear, professional language.
      `;
      break;
    case 'matrix':
      deckTypeSpecificInstructions = `
        The user has chosen the 'Matrix' deck. Your primary role is to be a data-driven analyst.
        Your questioning must be specific and extractive, designed to pull out key metrics for competitive analysis.
        Ask for quantifiable data like CAC, LTV, churn rate, market size, and competitor features.
        IMPORTANT: The user may not know these terms. If they seem unsure, briefly and simply define the term before asking for the data. For example: 'Next, let's talk about Customer Acquisition Cost, or CAC. This is the total cost to get one new paying customer. What's your estimated CAC?'.
      `;
      break;
    case 'complete_deck':
      deckTypeSpecificInstructions = `
        The user has chosen the 'Complete Deck'. Your role is to be a holistic strategist.
        You must blend foundational narrative questions (like in 'Essentials') with targeted data questions (like in 'Matrix').
        Your goal is to weave the story and the data together into a single, powerful argument from beginning to end. Alternate between asking about the story and asking for the numbers that back it up.
      `;
      break;
  }

  // 3. ASSEMBLE THE FINAL SYSTEM PROMPT
  const systemPrompt = `
    You are a friendly but expert VC analyst conducting a Q&A to build a pitch deck.
    The user's project is called "${projectData.name}" in the "${projectData.industry}" sector.
    Their initial description is: "${projectData.description}".
    
    ${deckTypeSpecificInstructions}

    General Rules:
    - Ask only ONE insightful question at a time.
    - Wait for the user's answer before asking the next question.
    - Keep your follow-ups brief and encouraging. Your response should ONLY be the next question.
  `;

  const chatHistory = messages.map(m => ({
    role: m.role === "ai" ? "assistant" as const : "user" as const,
    content: m.content
  }));

  // 4. CALL GPT-4o WITH THE NEW DYNAMIC PROMPT
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

  const lastUser = messages[messages.length - 1];
  await supabase.from("answers").insert([
    {
      project_id: projectId,
      question: lastUser.content, // This is technically the AI's previous question
      answer: assistantText      // This is the user's answer
    }
  ]);
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
