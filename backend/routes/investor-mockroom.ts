import { Router, Request, Response } from "express";
import { z } from "zod";
import { geminiJson, geminiText } from "../lib/geminiFlash.js";
import pdf from "pdf-parse";
import fetch from "node-fetch";

const router = Router();

const analyzeBodySchema = z.object({
  deckUrl: z.string().url("A valid URL for the pitch deck is required."),
});

// --- FIX #1: Make deckContent optional ---
// The backend will no longer require the full deck text for follow-up questions.
const chatBodySchema = z.object({
  deckContent: z.string().optional(), // Changed from .min(100) to .optional()
  messages: z.array(
    z.object({
      role: z.enum(["user", "model"]),
      content: z.string(),
    })
  ),
});

const MAX_DECK_LENGTH = 15000;

router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const parsed = analyzeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const { deckUrl } = parsed.data;

    const pdfResponse = await fetch(deckUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF from URL: ${pdfResponse.statusText}`);
    }
    const fileBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    const data = await pdf(buffer);
    const deckContent = data.text;

    if (deckContent.length < 100) {
      return res
        .status(400)
        .json({ error: "The content of the PDF is too short to analyze." });
    }

    const truncatedContent = deckContent.substring(0, MAX_DECK_LENGTH);
    const prompt = `
      You are an expert VC analyst. Analyze the following pitch deck content and provide:
      1.  **Key Elements**: A list of the strongest elements that will attract investors.
      2.  **Potential Questions**: A list of questions an investor might ask about this pitch.
      Pitch Deck Content:
      """
      ${truncatedContent}
      """
      Return a single, valid JSON object with two keys: "keyElements" and "potentialQuestions".
    `;
    const analysis = await geminiJson(prompt);
    res.json({ ...analysis, deckContent });
  } catch (e: any) {
    console.error("Error in /api/investor-mockroom/analyze:", e);
    res.status(500).json({
      error: "Failed to analyze the pitch deck.",
      message: e.message,
    });
  }
});

router.post("/ask", async (req: Request, res: Response) => {
  try {
    const parsed = chatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    // We only need the messages now, deckContent is not used for follow-ups
    const { messages } = parsed.data;
    const conversationHistory = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    // --- FIX #2: Simplified prompt for follow-up questions ---
    // The prompt now relies only on the conversation history.
    const prompt = `
You are an expert VC analyst acting as a mock investor.

Carefully read the pitch deck content below and the conversation history, then ONLY answer the most recent user question.
DO NOT repeat or rephrase the user's question in your answer.
If you need to infer from the deck, do so, and make relevant, thoughtful assumptions if explicit data is missing.
Do not repeat or rephrase the user's question.
Do not include the user's question, any "User:", "AI:", or similar labels in your answer.
Only return a direct answer, in the form of numbered points (1., 2., 3., ...).
Use paragraph-style points where detail is needed, but never just restate the user query.

Previous chat for context (do **not** reference directly):
${conversationHistory}

Example output (for any question):
1. Direct, fact-based answer part one.
2. Deeper explanation or calculation, if required.
3. Further points as needed.

Always output **only** numbered points directly answering the latest user question, without repeating or rephrasing the user's prompt.
`;

    const responseText = await geminiText(prompt);
    res.json({ answer: responseText });
  } catch (e: any) {
    console.error("Error in /api/investor-mockroom/ask:", e);
    res
      .status(500)
      .json({ error: "Failed to get an answer.", message: e.message });
  }
});

export default router;