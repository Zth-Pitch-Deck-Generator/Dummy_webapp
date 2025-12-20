// backend/routes/investor-mockroom.ts

import { Router, Request, Response } from "express";
import { z } from "zod";
import multer from "multer";
import pdf from "pdf-parse";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../supabase.js"; // Your Supabase client
import { authenticate } from "../middleware/auth.js"; // Your auth middleware

// LangChain Imports
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";

// Load env variables if not already loaded
import dotenv from "dotenv";
dotenv.config();

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const MAX_DECK_LENGTH = 15000; // Consider increasing if decks are longer

// Schema for the chat endpoint
const chatBodySchema = z.object({
  mockroomId: z.string().uuid(),
  question: z.string().min(1),
});

// Initialize LangChain Models
const analysisModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  apiKey: process.env.GEMINI_API_KEY1,
  temperature: 0.7,
});

const chatModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  apiKey: process.env.GEMINI_API_KEY1,
  temperature: 0.7,
});

// Helper function to safely parse JSON from LLM output
const parseJsonFromLLM = (text: string) => {
  try {
    const cleanText = text.replace(/^```json\s*|```\s*$/g, "").replace(/^```\s*|```\s*$/g, "").trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON from LLM:", text);
    throw new Error("Failed to parse analysis results.");
  }
};

// 1. UPLOAD & ANALYZE ENDPOINT
router.post("/upload", authenticate, upload.single("deckFile"), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const { buffer, originalname } = req.file;
  const userId = (req as any).user.id;
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

    // Step 2: Parse PDF content safely
    let deckContent = "";
    try {
        const data = await pdf(buffer);
        deckContent = data.text;
    } catch (pdfError) {
        console.error("PDF Parse Error:", pdfError);
        await supabase.storage.from("Investor_mockroom_decks").remove([filePath]);
        return res.status(400).json({ error: "Failed to read PDF file. It might be corrupted." });
    }
    if (deckContent.length < 100) {
        await supabase.storage.from("Investor_mockroom_decks").remove([filePath]);
        return res.status(400).json({ error: "PDF content is too short to analyze." });
    }

    //Step 3: Run enhanced analysis with Timeout Protection
    const truncatedContent = deckContent.substring(0, MAX_DECK_LENGTH);
    const analysisPrompt = PromptTemplate.fromTemplate(`
      You are an expert VC analyst at Y Combinator, reviewing an early-stage pitch deck.
      Analyze the provided pitch deck content strictly based on the information within it.
      
      Pitch Deck Content:
      """
      {deck_content}
      """

      Extract the most critical information and formulate insightful questions.
      
      Return ONLY a valid JSON object with the following keys:
      1. "keyElements": An array of strings highlighting 5-7 most important, value-driven aspects for an investor (Metrics, Core Business, Strategy, Team, Ask).
      2. "potentialQuestions": An array of strings listing 5-7 critical, context-aware questions a skeptical YC investor would ask.

      Important: Do not include any markdown formatting, preamble, or explanation. Just the raw JSON object.
    `);

    // Create the AI Promise
    const analysisPromise = analysisPrompt.pipe(analysisModel).invoke({
      deck_content: truncatedContent,
    });

    // Create a Timeout Promise (Set to 55 seconds to beat the 60s Vercel limit)
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("AI Analysis Timed Out")), 55000)
    );

    let result: any;
    try {
        // Race the AI against the clock
        result = await Promise.race([analysisPromise, timeoutPromise]);
    } catch (timeoutError) {
        console.error("Analysis Timeout:", timeoutError);
        // Clean up storage if it failed
        await supabase.storage.from("Investor_mockroom_decks").remove([filePath]);
        return res.status(504).json({ error: "Analysis took too long. Please try a smaller PDF." });
    }
    
    // Manual parsing
    const analysis = parseJsonFromLLM(result.content.toString());

    // Step 4: Create the mock room session in the database
    const initialHistory = [
        { role: "model", content: "I've reviewed your deck from the perspective of a Y Combinator analyst. Here are the key elements I noted and some initial questions. Feel free to ask me anything." }
    ];

    const { data: sessionData, error: insertError } = await supabase
      .from("investor_mockrooms")
      .insert({
        user_id: userId,
        file_path: filePath,
        file_name: originalname,
        key_elements: analysis.keyElements || [],
        potential_questions: analysis.potentialQuestions || [],
        chat_history: initialHistory,
      })
      .select("id")
      .single();

    if (insertError) {
       await supabase.storage.from("Investor_mockroom_decks").remove([filePath]);
      throw new Error(`Database insert error: ${insertError.message}`);
    }

    // Step 5: Return the analysis and the new session ID
    res.status(201).json({
      keyElements: analysis.keyElements,
      potentialQuestions: analysis.potentialQuestions,
      mockroomId: sessionData.id,
    });

  } catch (e: any) {
    console.error("Error in /upload:", e);
    // Ensure we don't try to send headers twice
    if (!res.headersSent) {
        try {
            await supabase.storage.from("Investor_mockroom_decks").remove([filePath]);
        } catch (cleanupError) {
            console.error("Failed to cleanup storage after error:", cleanupError);
        }
        res.status(500).json({ error: "Failed to upload and analyze deck.", message: e.message });
    }
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

    // Step 1: Retrieve the session
    const { data: session, error: fetchError } = await supabase
        .from('investor_mockrooms')
        .select('chat_history, file_path')
        .eq('id', mockroomId)
        .eq('user_id', userId)
        .single();

    if (fetchError || !session) {
        return res.status(404).json({ error: "Session not found or you do not have permission to access it."});
    }

    // Step 2:Download deck context
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("Investor_mockroom_decks")
      .download(session.file_path);

    let deckContent = "";
    if (!downloadError && fileData) {
        try {
            const buffer = Buffer.from(await fileData.arrayBuffer());
            const pdfData = await pdf(buffer);
            deckContent = pdfData.text.substring(0, MAX_DECK_LENGTH);
        } catch (pdfError: any) {
            console.error("Failed to parse PDF content:", pdfError.message);
        }
    }

    // Step 3: Construct LangChain Chat Flow (Gemini 2.0 Flash)
    const conversationHistory = session.chat_history
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n");

    const prompt = PromptTemplate.fromTemplate(`
      You are an expert VC analyst from Y Combinator.
      
      Context:
      1. Pitch Deck Content Summary:
      """
      {deck_content}
      """
      
      2. Conversation History:
      """
      {history}
      """
      
      User's New Question: "{question}"
      
      Instructions:
      - Answer as a skeptical but helpful YC analyst.
      - If the question is deck-specific, use the Deck Content.
      - If it's general/market, use your knowledge + specific deck context.
      - Format your response as a numbered list (1., 2., 3.) strictly.
      - Do not use markdown (bold/italic) or asterisks.
      - Be concise and data-driven.
    `);

    const chain = prompt.pipe(chatModel);

    const response = await chain.invoke({
      deck_content: deckContent || "Content unavailable.",
      history: conversationHistory,
      question: question
    });

    const responseText = response.content.toString();
    const cleanedResponse = responseText.replace(/\*/g, "").trim();

    // Step 5: Update history in DB
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
    if (!res.headersSent) {
        res.status(500).json({ error: "Failed to get an answer.", message: e.message });
    }
  }
});

export default router;