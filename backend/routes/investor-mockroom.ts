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
      throw new Error(
        `Failed to fetch PDF from URL: ${pdfResponse.statusText}`
      );
    }
    const fileBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    const data = await pdf(buffer, {
      pagerender: (pageData) => pageData.getTextContent(),
    });
    const deckContent = data.text;

    if (deckContent.length < 100) {
      return res
        .status(400)
        .json({ error: "The content of the PDF is too short to analyze." });
    }

    const truncatedContent = deckContent.substring(0, MAX_DECK_LENGTH);
    const prompt = `
      You are an expert VC analyst at Y-Combinator. Your task is to analyze the provided pitch deck content.
      Your analysis must be based strictly on the information within the pitch deck. Do not infer or add external information. Do not make assumptions beyond what is explicitly stated in the content.

      From the content, provide:
      1.  Key Elements: For the key elements, analyze the entire pitch deck given based on that think like an analyst or an investor and give 8 to 10 most important key elements in and out of the pitch deck based on the market as well. 
      2.  Potential Questions: A list of critical questions a skeptical investor would ask. These questions should probe for weaknesses, seek clarification on vague points, or request more detail on key metrics. Include questions that address potential risks or gaps in the information presented.
      These questions should be challenging and should provide new insights about the pitch deck content.

      Pitch Deck Content:
      """
      ${truncatedContent}
      """

      Return a single, valid JSON object with two keys: "keyElements" and "potentialQuestions".
      The value for each key should be an array of strings.
      Do not use quotation marks inside the strings you return.
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
You are an expert VC analyst acting as a mock investor. Your task is to answer the user's question based on the provided pitch deck content and conversation history.

Conversation History for Context:
"""
${conversationHistory}
"""

Your Instructions:
1. **Always format your response as a numbered list**, starting each point with its number (e.g., "1.", "2.").
2. **Each answer MUST be split into individual points**. Use paragraph-style sentences for each point where more explanation/detail is needed, but never combine multiple concepts into a single block paragraph or summary.
3. **Start your response immediately with "1." without any greeting, preamble, or restatement of the user's question.**
4. **Make expert assumptions ONLY where specific info is missing, and clearly state "Assumption:" at the start of those points.**
5. **Do NOT include any extra labels or formatting ("User:", "AI:", "Answer:", etc.).**
6. **Each point must stand alone as an independent explanation, fact, or logical step. Do not bundle points together.**
7. **Be as concise and direct as possible.**

Example response:
1. Our customer acquisition cost is currently estimated at $150 per user.
2. Assumption: As the deck does not specify marketing channels, I assume organic reach will improve post-launch, driving costs down.
3. We project CAC to decrease to under $100 with scaled marketing.
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
