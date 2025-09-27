import { Router, Request, Response } from "express";
import { z } from "zod";
import { geminiJson, geminiText } from "../lib/geminiFlash.js";
import multer from "multer";
import pdf from "pdf-parse"; // <-- 1. Import pdf-parse

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const chatBodySchema = z.object({
  deckContent: z.string().min(100),
  messages: z.array(
    z.object({
      role: z.enum(["user", "model"]),
      content: z.string(),
    })
  ),
});

const MAX_DECK_LENGTH = 15000;

router.post(
  "/analyze",
  upload.single("deck"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded." });
        return;
      }

      // --- 2. Use pdf-parse to extract text ---
      const data = await pdf(req.file.buffer);
      const deckContent = data.text;
      // -----------------------------------------

      if (deckContent.length < 100) {
        res
          .status(400)
          .json({ error: "The content of the PDF is too short to analyze." });
        return;
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
  }
);

router.post("/ask", async (req: Request, res: Response) => {
  try {
    const parsed = chatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }
    const { deckContent, messages } = parsed.data;
    const conversationHistory = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    const prompt = `
You are an expert VC analyst acting as a mock investor.

Carefully read the pitch deck content below and the conversation history, then ONLY answer the most recent user question.
DO NOT repeat or rephrase the user's question in your answer.
If you need to infer from the deck, do so, and make relevant, thoughtful assumptions if explicit data is missing.
Do not repeat or rephrase the user's question.
Do not include the user's question, any "User:", "AI:", or similar labels in your answer.
Only return a direct answer, in the form of numbered points (1., 2., 3., ...).
Use paragraph-style points where detail is needed, but never just restate the user query.

Pitch Deck Content:
"""
${deckContent.substring(0, MAX_DECK_LENGTH)}
"""

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