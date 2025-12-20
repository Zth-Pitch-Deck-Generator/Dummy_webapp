// backend/routes/qa.ts
import { Router, Request, Response, RequestHandler } from "express";
import { supabase } from "../supabase.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { authenticate } from "../middleware/auth.js";

// Updated imports from aiAgent.ts
import { 
  analyzeAnswer,
  enhanceQuestion,
  generateDynamicOptions,
  generateBridgeQuestion
} from "../lib/aiAgent.js";

const router = Router();

const bodySchema = z.object({
  projectId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "model"]),
      content: z.string(),
    })
  ),
});

const completeBodySchema = z.object({
  projectId: z.string().uuid(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "model"]),
      content: z.string(),
    })
  ),
});

/* ------------------------------------------------------------------
   ROUTE: /session/complete
   ------------------------------------------------------------------ */
const completeHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const parsed = completeBodySchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid payload" });

    const { projectId, messages } = parsed.data;

    const { data: proj } = await supabase.from('projects').select('user_id').eq('id', projectId).single();
    if (!proj) return void res.status(404).json({ error: 'Project not found' });
    if (proj.user_id !== (req as any).user?.id) return void res.status(403).json({ error: 'Forbidden' });

    const { error } = await supabase.from("qa_sessions").upsert(
      {
        project_id: projectId,
        transcript: messages.map(m => ({ role: m.role, content: m.content, timestamp: Date.now() })),
        completed: new Date().toISOString()
      },
      { onConflict: 'project_id' }
    );

    if (error) throw error;
    return void res.status(204).end();
  } catch (e: any) {
    console.error("Error in /api/qa/session/complete:", e);
    return void res.status(500).json({ error: "Failed to save session.", message: e.message });
  }
};
router.post("/session/complete", authenticate, completeHandler);

/* ------------------------------------------------------------------
   ROUTE: / (Main Q&A Logic)
   ------------------------------------------------------------------ */
const qaHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({ error: "Invalid payload" });
    const { projectId, messages } = parsed.data;

    const { data: projectData } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (!projectData) return void res.status(404).json({ error: "Project not found" });

    // FIXED: Use process.cwd() to correctly locate files in Vercel serverless environment
    // __dirname does not work as expected in Vercel's bundled function environment
    const configPath = path.join(process.cwd(), 'backend', 'qa-configs', `${projectData.decktype}.json`);
    
    // Check if file exists before reading to prevent crashes
    try {
        await fs.access(configPath);
    } catch (err) {
        console.error(`Config file not found: ${configPath}`);
        return void res.status(500).json({ error: "QA Configuration not found on server." });
    }

    const qaConfig = JSON.parse(await fs.readFile(configPath, "utf-8"));

    // Filter Questions
    const filteredQuestions = qaConfig.questions.filter((q: any) => {
      if (q.requiredRevenue === "revenue" && projectData.revenue === "pre-revenue") return false;
      if (q.requiredStage && q.requiredStage !== "all" && q.requiredStage !== projectData.stage) return false;
      return true;
    });

    // UPDATED: Use maxQuestions from config if available, clamped to actual array length
    const configMax = typeof qaConfig.maxQuestions === 'number' ? qaConfig.maxQuestions : Infinity;
    const MAX_QUESTIONS = Math.min(configMax, filteredQuestions.length);

    const userMessages = messages.filter((m) => m.role === "user");
    let nextQuestionIndex = userMessages.length;
    
    // Analyze Previous Interaction
    const lastUserMessage = messages[messages.length - 1];
    let isRetry = false;

    if (lastUserMessage && lastUserMessage.role === "user" && nextQuestionIndex > 0) {
      const prevQuestionObj = filteredQuestions[nextQuestionIndex - 1];
      const status = await analyzeAnswer(prevQuestionObj.question, lastUserMessage.content);
      
      // If user doesn't know, we trigger the "Bridge" logic
      if (status === "UNKNOWN" || status === "HELP_NEEDED") {
        nextQuestionIndex = nextQuestionIndex - 1;
        isRetry = true;
      }
    }

    if (nextQuestionIndex >= MAX_QUESTIONS) {
      return void res.json({ isComplete: true, question: "Done.", answerType: "complete" });
    }

    const nextQConfig = filteredQuestions[nextQuestionIndex];
    let finalQuestionText = nextQConfig.question;
    let choices = nextQConfig.choices || [];
    let answerType = nextQConfig.answerType;

    if (isRetry) {
      // --- BRIDGE QUESTION LOGIC ---
      console.log("User stuck. Generating bridge question...");
      
      try {
        const bridge = await generateBridgeQuestion(nextQConfig.question, projectData);
        finalQuestionText = bridge.question;
        choices = bridge.choices; 
        answerType = 'multiple_choice'; 
      } catch (e) {
        console.error("Bridge question error:", e);
        finalQuestionText = "Which of these best describes your current status?";
        choices = ["Just an idea", "Building product", "Selling to customers", "Other"];
        answerType = 'multiple_choice'; 
      }
      
    } else {
      // --- ENHANCE QUESTION ---
      try {
        finalQuestionText = await enhanceQuestion(nextQConfig.question, projectData);
      } catch (e) {
        console.error("Question enhancement error:", e);
        finalQuestionText = nextQConfig.question; // Fallback to original
      }
      
      // --- GENERATE OPTIONS ---
      if (answerType === 'multiple_choice' && choices.length === 0) {
        try {
          choices = await generateDynamicOptions(finalQuestionText, projectData);
        } catch (e) {
          console.error("Options generation error:", e);
          choices = ["Yes", "No", "Other"];
        }
      }
    }

    res.json({
      question: finalQuestionText,
      originalQuestion: nextQConfig.question,
      topic: nextQConfig.topic,
      answerType: answerType,
      tooltip: nextQConfig.tooltip,
      choices: choices,
      isRetry,
      isComplete: false
    });

  } catch (e: any) {
    console.error("QA Error:", e);
    // Prevent sending response if headers already sent (rare but possible in async flows)
    if(!res.headersSent) {
        res.status(500).json({ error: "QA Process Failed" });
    }
  }
};
router.post("/", authenticate, qaHandler);

export default router;