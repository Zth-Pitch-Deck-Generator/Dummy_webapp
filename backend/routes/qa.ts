// backend/routes/qa.ts
import { Router, Request, Response, RequestHandler } from "express";
import { supabase } from "../supabase";
import { z } from "zod";
import { geminiJson } from "../lib/geminiFlash";

const router = Router();

// Define the maximum number of questions here
const MAX_QUESTIONS = 5; // You can change this value for testing

const bodySchema = z.object({
  projectId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(["ai", "user", "model"]), // Added 'model' to the enum
      content: z.string(),
    })
  ),
});

const completeBodySchema = z.object({
    projectId: z.string().uuid(),
    messages: z.array(
      z.object({
        role: z.enum(["ai", "user", "model"]), // Also updated here for consistency
        content: z.string(),
      })
    ),
  });

const qaHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("Zod validation failed:", parsed.error.flatten());
      return void res.status(400).json({ error: "Invalid payload" });
    }
    const { projectId, messages } = parsed.data;

    /* 1. Fetch project details */
    const { data: projectData, error } = await supabase
      .from("projects")
      .select("name, industry, description, decktype, stage, revenue")
      .eq("id", projectId)
      .single();

    if (error || !projectData) {
      return void res.status(404).json({ error: "Project not found" });
    }

    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length >= MAX_QUESTIONS) { // Use the constant here
      return void res.json({
        isComplete: true,
        question: "Thank you! We have enough information to proceed.",
        answerType: "complete",
      });
    }

    /* 2. Construct the Gemini Prompt */
    const deckTypeExplanation: { [key: string]: string } = {
        essentials:
          "a basic pitch deck covering the core concepts (problem, solution, market). The questions should be straightforward.",
        matrix:
          "a detailed pitch deck for VCs, including basic concepts plus in-depth industry-specific metrics and competitive analysis.",
        complete_deck:
          "a comprehensive, investor-ready deck combining both essential concepts and detailed metrics, covering all aspects of the business.",
      };

    const conversationHistory = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
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
You are an expert business analyst conducting an interview to create a pitch deck.
Your goal is to gather enough information to generate a compelling pitch deck based on the user's project details.

Project Details:
- Name: ${projectData.name}
- Industry: ${projectData.industry}
- Stage: ${projectData.stage}
- Revenue: ${projectData.revenue}
- Description: ${projectData.description}
- Deck Type Required: ${projectData.decktype} (${
      deckTypeExplanation[projectData.decktype]
    })

Conversation History:
${conversationHistory}
---
Instructions:
1. Based on the project details and conversation history, determine the single best NEXT question to ask.
2. The total number of questions should not exceed ${MAX_QUESTIONS}. If you have enough information to create the specified deck type, respond with \`{"isComplete": true}\`.
3. ${
      clarificationInstruction ||
      'Prioritize asking objective, multiple-choice questions to be efficient. Always include "Other" as a choice.'
    }
4. Your response MUST be a single, valid JSON object with the following structure:
   \`{"topic": string, "question": string, "answerType": "free_text" | "multiple_choice", "choices": string[] | null, "explanation": string | null, "isComplete": boolean}\`
   - "topic": The general subject of the question (e.g., "Revenue Model", "Target Market").
   - "question": The specific question for the user.
   - "answerType": "free_text" for open-ended answers, "multiple_choice" for options.
   - "choices": An array of strings for multiple-choice questions, otherwise null. Must include "Other" if it is a multiple choice question.
   - "explanation": If explaining a term, provide a simple definition here, otherwise null.
   - "isComplete": A boolean indicating if the Q&A session is finished.

Generate the next question now.
`;

    const aiResponse = await geminiJson(prompt);
    res.json(aiResponse);
  } catch (e: any) {
    console.error("Error calling Gemini or processing request in /api/qa:", e);
    res.status(500).json({ error: "Failed to generate next question.", message: e.message });
  }
};
router.post("/", qaHandler);

const completeHandler: RequestHandler = async (req: Request, res: Response) => {
    try {
        const parsed = completeBodySchema.safeParse(req.body);
        if (!parsed.success) {
          return void res.status(400).json({ error: "Invalid payload for completion" });
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
            return void res.status(500).json({error: "Failed to save session transcript"});
        }

        return void res.status(204).end();
    } catch (e: any) {
        console.error("Error in /api/qa/session/complete:", e);
        return void res.status(500).json({ error: "Failed to save session.", message: e.message });
    }
};
router.post("/session/complete", completeHandler);

export default router;
