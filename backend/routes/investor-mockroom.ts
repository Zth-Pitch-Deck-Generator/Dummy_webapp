// backend/routes/investor-mockroom.ts

import { Router, Request, Response } from "express";
import { z } from "zod";
import { geminiJson, geminiText } from "../lib/geminiFlash.js";
import pdf from "pdf-parse";
import fetch from "node-fetch";

const router = Router();

const analyzeBodySchema = z.object({
  deckUrl: z.string().url("A valid URL for the pitch deck is required."),
});

const chatBodySchema = z.object({
  deckContent: z.string().optional(),
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
    // This is the correct way to handle errors - always returning JSON.
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
    const { messages } = parsed.data;
    const conversationHistory = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const prompt = `
You are an expert VC analyst acting as a mock investor. You have already analyzed a pitch deck.
Based ONLY on the conversation history below, provide a direct answer to the most recent user question.
Do not repeat the user's question. Respond in numbered points (1., 2., 3., ...).

Conversation History:
${conversationHistory}

Your task is to act as the investor and directly answer the last user message in the history.
`;

    const responseText = await geminiText(prompt);
    res.json({ answer: responseText });
  } catch (e: any) {
    console.error("Error in /api/investor-mockroom/ask:", e);
    // This is also correct.
    res
      .status(500)
      .json({ error: "Failed to get an answer.", message: e.message });
  }
});

export default router;