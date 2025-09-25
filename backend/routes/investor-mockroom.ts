import { Router, Request, Response } from "express";
import { z } from "zod";
import { geminiJson } from "../lib/geminiFlash.js";
import multer from "multer";
import { PDFExtract, PDFExtractResult } from "pdf.js-extract";

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

const MAX_DECK_LENGTH = 15000; // Limit content size for the API

router.post("/analyze", upload.single('deck'), async (req: Request, res: Response) => {
  try {
    // This check handles the 'undefined' possibility for req.file
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded." });
      return;
    }

    const fileBuffer = req.file.buffer; // Store the buffer in a variable

    const pdfExtract = new PDFExtract();
    
    // Correctly handle the buffer and the potentially undefined result
    const data: PDFExtractResult = await new Promise((resolve, reject) => {
      pdfExtract.extractBuffer(fileBuffer, {}, (err, data) => {
        if (err) {
          return reject(err);
        }
        // Ensure data is not undefined before resolving
        if (data) {
          resolve(data);
        } else {
          reject(new Error("Failed to extract data from PDF."));
        }
      });
    });

    const deckContent = data.pages.map(page => page.content.map(item => item.str).join(' ')).join('\n');

    if (deckContent.length < 100) {
      res.status(400).json({ error: "The content of the PDF is too short to analyze." });
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
    res.status(500).json({ error: "Failed to analyze the pitch deck.", message: e.message });
  }
});

router.post("/ask", async (req: Request, res: Response) => {
    try {
        const parsed = chatBodySchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
          return;
        }
        const { deckContent, messages } = parsed.data;

        const conversationHistory = messages.map(m => `${m.role}: ${m.content}`).join('\n');

        const prompt = `
        You are an expert VC analyst acting as a mock investor.
        Answer the user's questions based on the provided deck content.

        Pitch Deck Content:
        """
        ${deckContent.substring(0, MAX_DECK_LENGTH)} 
        """

        Conversation History:
        ${conversationHistory}

        Provide a concise and helpful answer to the last user question.
        `;

        const model = (await geminiJson(prompt));
        const responseText = model.answer || "I'm sorry, I could not find an answer to that question.";

        res.json({ answer: responseText });

    } catch (e: any) {
        console.error("Error in /api/investor-mockroom/ask:", e);
        res.status(500).json({ error: "Failed to get an answer.", message: e.message });
    }
});

export default router;