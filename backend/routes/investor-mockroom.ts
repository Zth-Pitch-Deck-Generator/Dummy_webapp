// backend/routes/investor-mockroom.ts

import { Router, Request, Response } from "express";
import { z } from "zod";
import multer from "multer";
import pdf from "pdf-parse";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../supabase.js"; // Your Supabase client
import { geminiJson, geminiText } from "../lib/geminiFlash.js";
import { authenticate } from "../middleware/auth.js"; // Your auth middleware

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAX_DECK_LENGTH = 15000;

// Schema for the chat endpoint
const chatBodySchema = z.object({
  mockroomId: z.string().uuid(),
  question: z.string().min(1),
});

// 1. UPLOAD & ANALYZE ENDPOINT
router.post("/upload", authenticate, upload.single("deckFile"), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const { buffer, originalname } = req.file;
  const userId = (req as any).user.id; // From authenticate middleware
  const fileExt = originalname.split(".").pop();
  const newFileName = `${uuidv4()}.${fileExt}`;
  const filePath = `${userId}/${newFileName}`;

  try {
    // Step 1: Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("Investor_mockroom_decks")
      .upload(filePath, buffer);

    if (uploadError) {
      throw new Error(`Storage Error: ${uploadError.message}`);
    }

    // Step 2: Parse PDF content
    const data = await pdf(buffer);
    const deckContent = data.text;
    if (deckContent.length < 100) {
      return res.status(400).json({ error: "PDF content is too short to analyze." });
    }

    // Step 3: Run analysis with Gemini
    const truncatedContent = deckContent.substring(0, MAX_DECK_LENGTH);
    const analysisPrompt = `
      You are an expert VC analyst at Y-Combinator. Analyze the provided pitch deck content strictly based on the information within it.
      Provide:
      1. Key Elements: 8 to 10 most important key elements from the pitch deck and the market.
      2. Potential Questions: A list of critical questions a skeptical investor would ask.
      Pitch Deck Content: """ ${truncatedContent} """
      Return a single, valid JSON object with two keys: "keyElements" and "potentialQuestions", each being an array of strings.
    `;
    const analysis = await geminiJson(analysisPrompt);

    // Step 4: Create the mock room session in the database
    const initialHistory = [
        { role: "model", content: "I have analyzed your pitch deck. Feel free to ask me any questions an investor might have." }
    ];

    const { data: sessionData, error: insertError } = await supabase
      .from("investor_mockrooms")
      .insert({
        user_id: userId,
        file_path: filePath,
        file_name: originalname,
        key_elements: analysis.keyElements,
        potential_questions: analysis.potentialQuestions,
        chat_history: initialHistory,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Database insert error: ${insertError.message}`);
    }

    // Step 5: Return the analysis and the new session ID
    res.status(201).json({
      ...analysis,
      deckContent: truncatedContent, // Send content for context if needed
      mockroomId: sessionData.id,
    });

  } catch (e: any) {
    console.error("Error in /upload:", e);
    res.status(500).json({ error: "Failed to upload and analyze deck.", message: e.message });
  }
});

// 2. CHAT ENDPOINT
router.post("/chat", authenticate, async (req: Request, res: Response) => {
  try {
    const parsed = chatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const { mockroomId, question } = parsed.data;
    const userId = (req as any).user.id;

    // Step 1: Retrieve the session and its history
    const { data: session, error: fetchError } = await supabase
        .from('investor_mockrooms')
        .select('chat_history, file_path')
        .eq('id', mockroomId)
        .eq('user_id', userId) // Security: Ensure user owns the session
        .single();

    if (fetchError || !session) {
        return res.status(404).json({ error: "Session not found or you do not have permission to access it."});
    }

    // Step 2: Download and parse the original deck for full context
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("Investor_mockroom_decks")
      .download(session.file_path);

    if (downloadError) {
      throw new Error(`Failed to download deck: ${downloadError.message}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const pdfData = await pdf(buffer);
    const deckContent = pdfData.text;

    // Step 3: Construct conversation history for Gemini
    const conversationHistory = session.chat_history
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n");

    const prompt = `
      You are an expert VC analyst. Your primary goal is to answer the user's question based on the provided pitch deck content.
      If the deck does not contain the answer, use your expertise to provide a helpful, insightful response based on the business idea presented in the deck.

      Pitch Deck Content:
      """
      ${deckContent}
      """

      Conversation History:
      """
      ${conversationHistory}
      """

      User's New Question: "${question}"

      Your Instructions:
      1.  First, try to answer using the pitch deck content.
      2.  If the answer isn't in the deck, provide a strategic answer based on the user's product and market, as described in the deck.
      3.  Always format your response as a numbered list.
      4.  Start your response immediately with "1." without any preamble.
      5.  Clearly state "Assumption:" at the start of any points that are expert assumptions.
      6.  Do NOT use the '*' character anywhere in your response.
      7.  Do NOT include markdown, headings, or code fences. Plain text only.
    `;

  // Step 4: Get the answer from Gemini
  const responseText = await geminiText(prompt);

  // Sanitize the model reply to enforce prompt rules (e.g., no '*' characters)
  const cleanedResponse = (responseText || "").replace(/\*/g, "").trim();

  // Step 5: Update the chat history in the database using the cleaned response
  const updatedHistory = [
    ...session.chat_history,
    { role: 'user', content: question },
    { role: 'model', content: cleanedResponse }
  ];

  await supabase
    .from('investor_mockrooms')
    .update({ chat_history: updatedHistory, updated_at: new Date().toISOString() })
    .eq('id', mockroomId);

  res.json({ answer: cleanedResponse });

  } catch (e: any) {
    console.error("Error in /chat:", e);
    res.status(500).json({ error: "Failed to get an answer.", message: e.message });
  }
});

export default router;