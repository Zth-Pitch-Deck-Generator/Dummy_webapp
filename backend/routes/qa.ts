// backend/routes/qa.ts
import { Router, Request, Response, RequestHandler } from "express";
import { supabase } from "../supabase";
import { z } from "zod";
import { geminiJson } from "../lib/geminiFlash";

const router = Router();

// This schema is for the main Q&A endpoint
const bodySchema = z.object({
  projectId: z.string().uuid(),
  messages: z.array(
    z.object({
      // It correctly accepts 'model'
      role: z.enum(["user", "model"]),
      content: z.string(),
    })
  ),
});

// --- THIS IS THE FIX ---
// The validation schema for the completion endpoint now also accepts 'model'.
const completeBodySchema = z.object({
    projectId: z.string().uuid(),
    messages: z.array(
      z.object({
        role: z.enum(["user", "model"]), // Changed from ["ai", "user", "assistant"]
        content: z.string(),
      })
    ),
  });
// --- END OF FIX ---


const qaHandler: RequestHandler = async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    console.error("Zod validation failed:", parsed.error.format());
    res.status(400).json({ error: "Invalid payload for qa handler" });
    return;
  }
  const { projectId, messages } = parsed.data;

  const { data: projectData, error } = await supabase
    .from("projects")
    .select("name, industry, description, decktype, stage, revenue")
    .eq("id", projectId)
    .single();

  if (error || !projectData) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length >= 5) { // Using 5 for testing
    res.json({
      isComplete: true,
      question: "Thank you! We have enough information to proceed.",
      answerType: "complete",
    });
    return;
  }

  const conversationHistory = messages
    .map((m) => `${m.role === 'model' ? 'AI' : 'USER'}: ${m.content}`) // Use AI/USER for prompt clarity
    .join("\n");

  const lastUserAnswer = messages[messages.length - 1]?.content.toLowerCase();
  let clarificationInstruction = "";
  if (
    lastUserAnswer &&
    (lastUserAnswer.includes("don't know") ||
      lastUserAnswer.includes("not sure"))
  ) {
    const lastQuestion = messages[messages.length - 2]?.content;
    clarificationInstruction = `The user did not know the answer to the last question: "${lastQuestion}". Please explain the key term in that question simply and then ask a related, easier follow-up question.`;
  }

  const prompt = `
You are an expert business analyst. Your task is to conduct an interview to gather information for a pitch deck.

**Project Information:**
- Name: ${projectData.name}
- Industry: ${projectData.industry}
- Deck Type: ${projectData.decktype}

**Conversation History:**
${conversationHistory}
---
**Your Instructions:**
1.  Analyze the conversation and project details.
2.  Determine the single best question to ask next to gather missing information for the deck.
3.  Prioritize multiple-choice questions for efficiency. Always include an "Other" option.
4.  Format your response as a single, valid JSON object with this exact structure: \`{"topic": string, "question": string, "answerType": "free_text" | "multiple_choice", "choices": string[] | null, "explanation": string | null, "isComplete": boolean}\`.
5.  If the user says they "don't know", explain the term and ask a simpler follow-up.
6.  If you have enough information (after ~4 user answers), set \`isComplete\` to true.

Generate the JSON for the next question now.
`;

  try {
    const aiResponse = await geminiJson(prompt);
    res.json(aiResponse);
  } catch (e) {
    console.error("Error calling Gemini:", e);
    res.status(500).json({ error: "Failed to generate next question." });
  }
};
router.post("/", qaHandler);

const completeHandler: RequestHandler = async (req: Request, res: Response) => {
    const parsed = completeBodySchema.safeParse(req.body);
    if (!parsed.success) {
        // This is where the 400 error was being triggered.
        console.error("Completion validation failed:", parsed.error.format());
        res.status(400).json({ error: "Invalid payload for completion" });
        return;
    }

    const { projectId, messages } = parsed.data;

    const { error } = await supabase.from("qa_sessions").upsert(
      {
        project_id: projectId,
        transcript: messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: Date.now()
        })),
        completed: new Date().toISOString()
      },
      { onConflict: 'project_id' }
    );
    if (error) {
        console.error("Supabase upsert error:", error);
        res.status(500).json({error: "Failed to save session transcript"});
        return;
    }

    res.status(204).end();
};
router.post("/session/complete", completeHandler);


export default router;