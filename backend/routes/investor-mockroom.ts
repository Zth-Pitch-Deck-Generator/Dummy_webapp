import { Router, Request, Response } from "express";
import { z } from "zod";
import multer from "multer";
import { geminiJson } from "../lib/geminiFlash.js";
import { extractPdfText } from "../lib/pdfTextExtractor.js";   // Implements extraction as shown earlier
import { extractPptxText } from "../lib/pptxTextExtractor.js"; // Implements extraction as shown earlier

const router = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // Max file size 10MB

// -------- DATA SCHEMAS --------

const analysisBodySchema = z.object({
  deckContent: z.string().min(50, "Pitch deck content is too short."),
});

const chatBodySchema = z.object({
  deckContent: z.string().min(50),
  messages: z.array(
    z.object({
      role: z.enum(["user", "model"]),
      content: z.string(),
    })
  ),
});

// -------- HANDLE TEXT INPUT (legacy, for .txt/.md, POST body) --------

router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const parsed = analysisBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }
    const { deckContent } = parsed.data;
    // Count slides/pages (estimate, for .txt/.md)
    const slideMatches = deckContent.match(/(Slide |\n#|\n---)/gi);
    const slideCount = slideMatches ? slideMatches.length : 1;
    if (slideCount > 15) {
      res.status(400).json({ error: `Deck has ${slideCount} slides/pages. Max allowed is 15.` });
      return;
    }
    // Truncate for safety
    const truncatedContent = deckContent.length > 12000
      ? deckContent.slice(0, 12000)
      : deckContent;
    const prompt = `
      You are an expert VC analyst. Analyze the following pitch deck content and provide:
      1. Key Elements: A list of the strongest elements that will attract investors.
      2. Potential Questions: A list of questions an investor might ask about this pitch.

      Pitch Deck Content:
      """
      ${truncatedContent}
      """
      Respond with a valid JSON object: { "keyElements": [string], "potentialQuestions": [string] }
    `;
    let analysis = await geminiJson(prompt);
    res.json({
      keyElements: Array.isArray(analysis?.keyElements) ? analysis.keyElements : [],
      potentialQuestions: Array.isArray(analysis?.potentialQuestions) ? analysis.potentialQuestions : [],
    });
  } catch (e: any) {
    console.error("Error in /api/investor-mockroom/analyze:", e);
    res.json({
      keyElements: [],
      potentialQuestions: [],
      error: "Failed to analyze pitch deck."
    });
  }
});

// -------- HANDLE PDF/PPTX Uploads --------

// Upload using form-data, with "deckFile" as field name
router.post("/analyze-file", upload.single('deckFile'), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    if (!file) {
       res.status(400).json({ error: "No file uploaded" });
       return;
    }

    let parsedDeck;
    if (file.mimetype === 'application/pdf') {
      parsedDeck = await extractPdfText(file.buffer, 15); // chunks, numPages
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      parsedDeck = await extractPptxText(file.path, 15);  // chunks, numSlides
    } else {
       res.status(400).json({ error: "Unsupported file type. Only PDF and PPTX accepted." });
       return;
    }

    // Compose a master prompt from first N pages/slides, or aggregate all text
    const deckSummary = parsedDeck.chunks
      .map(chunk => `Page/Slide ${chunk.page || chunk.slide}: ${chunk.text}`)
      .join("\n");

    // Truncate for safety (LLM token limit)
    const truncatedContent = deckSummary.length > 12000
      ? deckSummary.slice(0, 12000)
      : deckSummary;

    // ---- Gemini Analysis ----
    const prompt = `
      You are an expert VC analyst. Analyze the following pitch deck content and provide:
      1. Key Elements: A list of the strongest elements that will attract investors.
      2. Potential Questions: A list of questions an investor might ask about this pitch.

      Pitch Deck Content:
      """
      ${truncatedContent}
      """
      Respond with a valid JSON object: { "keyElements": [string], "potentialQuestions": [string] }
    `;
    let analysis = await geminiJson(prompt);

    res.json({
      keyElements: Array.isArray(analysis?.keyElements) ? analysis.keyElements : [],
      potentialQuestions: Array.isArray(analysis?.potentialQuestions) ? analysis.potentialQuestions : [],
      pageOrSlideCount: parsedDeck.numPages || parsedDeck.numSlides
    });

  } catch (e: any) {
    console.error("Error in /api/investor-mockroom/analyze-file:", e);
    res.status(400).json({ keyElements: [], potentialQuestions: [], error: e.message });
  }
});

// -------- Q&A remains unchanged; you may want similar chunk logic for context --------

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
      Using the pitch deck and previous conversation:
      Pitch Deck Content:
      """
      ${deckContent}
      """
      History:
      ${conversationHistory}

      Answer the user's last question in a single helpful sentence. Respond with: { "answer": "text here" }
    `;
    const model = await geminiJson(prompt);
    res.json({ answer: model?.answer || "I'm sorry, I could not find an answer to that question." });
  } catch (e: any) {
    console.error("Error in /api/investor-mockroom/ask:", e);
    res.json({
      answer: "Sorry, your request could not be processed at this moment due to an error."
    });
  }
});

export default router;
