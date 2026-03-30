// backend/routes/qa.ts
import { Router, Request, Response, RequestHandler } from "express";
import { authenticate } from "../middleware/auth.js";
import { redis } from "../lib/redis.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { supabase } from "../supabase.js";
import { QASessionState, SectionState } from "../types/qa.js";
import {
  validateAnswerRelevance,
  generateMarketEstimates,
  MarketEstimates,
} from "../lib/aiAgent.js";

const router = Router();
const CONFIG_PATH = path.join(
  process.cwd(),
  "backend",
  "qa-configs",
  "section_flow_deck.json"
);
const getSessionKey = (projectId: string) => `session:${projectId}:qa_state`;

// --- HELPER: Extract Context from State ---
// Grabs the Company Name and Problem Statement to help AI validate & estimate market
const getValidationContext = (state: QASessionState): string => {
  let context = "";

  // Try to find Company Name (Cover section)
  const coverSection = state.sections.find((s) => s.id === "cover");
  const nameQ = coverSection?.questions.find((q) => q.id.includes("name"));
  if (nameQ?.answer) context += `Company Name: ${nameQ.answer}. `;

  // Try to find Problem Statement
  const problemSection = state.sections.find((s) => s.id === "problem");
  const probQ = problemSection?.questions[0];
  if (probQ?.answer) context += `Core Problem: ${probQ.answer}. `;

  // Try to find Target Audience (Audience section)
  const audienceSection = state.sections.find((s) => s.id === "audience");
  const audQ = audienceSection?.questions[0];
  if (audQ?.answer) {
    const ans = Array.isArray(audQ.answer)
      ? audQ.answer.join(", ")
      : audQ.answer;
    context += `Target Audience: ${ans}. `;
  }

  return context;
};

/* ------------------------------------------------------------------
   CORE SESSION MANAGEMENT
   ------------------------------------------------------------------ */

/**
 * ROUTE: Initialize/Start Session
 * POST /api/qa/start
 */
const startSchema = z.object({ projectId: z.string().uuid() });

const startHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { projectId } = startSchema.parse(req.body);
    const key = getSessionKey(projectId);

    // Check if session already exists
    const existing = await redis.get(key);
    if (existing) {
      return void res.json(JSON.parse(existing));
    }

    // Load Config
    const configRaw = await fs.readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(configRaw);

    // Build Initial State
    const sections: SectionState[] = config.sections.map(
      (s: any, index: number) => ({
        id: s.id,
        name: s.name,
        status: index === 0 ? "active" : "pending",
        questions: s.questions.map((q: any) => ({
          id: q.id,
          question: q.question,
          tooltip: q.tooltip,
          answerType: q.answerType,
          answer: null,
          choices: q.choices || [],
          isOther: false,
        })),
      })
    );

    const initialState: QASessionState = {
      projectId,
      currentSectionIndex: 0,
      currentQuestionIndex: 0,
      sections,
      marketAnalysis: { tam: null, sam: null, som: null, isComplete: false },
      lastUpdated: Date.now(),
    };

    await redis.set(key, JSON.stringify(initialState));
    return void res.json(initialState);
  } catch (error: any) {
    console.error("Start Session Error:", error);
    return void res.status(500).json({ error: error.message });
  }
};

/**
 * ROUTE: Get Current State
 * GET /api/qa/state/:projectId
 */
const getStateHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    if (!projectId)
      return void res.status(400).json({ error: "Missing projectId" });

    const key = getSessionKey(projectId);
    const stateStr = await redis.get(key);

    if (!stateStr)
      return void res.status(404).json({ error: "Session not found" });

    return void res.json(JSON.parse(stateStr));
  } catch (error: any) {
    return void res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------------------------------
   Q&A INTERACTION
   ------------------------------------------------------------------ */

/**
 * ROUTE: Submit Answer (With AI Validation)
 * POST /api/qa/answer
 */
const answerSchema = z.object({
  projectId: z.string().uuid(),
  answer: z.union([z.string(), z.array(z.string())]),
  isOther: z.boolean().optional(), // For tracking if "Other" text input was used
});

const answerHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { projectId, answer, isOther } = answerSchema.parse(req.body);
    const key = getSessionKey(projectId);

    const stateStr = await redis.get(key);
    if (!stateStr)
      return void res.status(404).json({ error: "Session expired" });

    const state: QASessionState = JSON.parse(stateStr);

    const currentSection = state.sections[state.currentSectionIndex];
    const currentQ = currentSection.questions[state.currentQuestionIndex];

    // --- AI VALIDATION START ---
    // We only strictly validate free-text answers that are longer than 2 chars.
    // Multiple choice answers are generally considered valid by selection.
    // Only validate if answer is longer than 20 chars to allow quick testing
    if (typeof answer === "string" && answer.length > 20) {
      const context = getValidationContext(state);
      const validation = await validateAnswerRelevance(
        currentQ.question,
        answer,
        context
      );

      if (!validation.isValid) {
        return void res.status(400).json({
          error: "Invalid Answer",
          message:
            validation.feedback ||
            "Your answer doesn't seem relevant to the question. Please try again.",
        });
      }
    }
    // --- AI VALIDATION END ---

    // 1. Update current answer
    currentQ.answer = answer;
    currentQ.isOther = isOther || false;

    // 2. Logic: Move to next question or section
    const isLastQuestionInSection =
      state.currentQuestionIndex >= currentSection.questions.length - 1;
    const isLastSection =
      state.currentSectionIndex >= state.sections.length - 1;

    if (isLastQuestionInSection) {
      // Mark section complete
      state.sections[state.currentSectionIndex].status = "completed";

      if (!isLastSection) {
        // Move to next section
        state.currentSectionIndex++;
        state.currentQuestionIndex = 0;
        state.sections[state.currentSectionIndex].status = "active";
      } else {
        // End of QA flow
        // Frontend will detect completion and redirect to Market Analysis
      }
    } else {
      // Move to next question
      state.currentQuestionIndex++;
    }

    state.lastUpdated = Date.now();
    await redis.set(key, JSON.stringify(state));

    return void res.json(state);
  } catch (error: any) {
    console.error("Answer Error:", error);
    return void res.status(500).json({ error: error.message });
  }
};

/**
 * ROUTE: Jump to Section/Question
 * POST /api/qa/jump
 */
const jumpSchema = z.object({
  projectId: z.string().uuid(),
  sectionIndex: z.number().min(0),
  questionIndex: z.number().min(0),
});

const jumpHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { projectId, sectionIndex, questionIndex } = jumpSchema.parse(
      req.body
    );
    const key = getSessionKey(projectId);
    const stateStr = await redis.get(key);
    if (!stateStr)
      return void res.status(404).json({ error: "Session not found" });

    const state: QASessionState = JSON.parse(stateStr);

    const targetSection = state.sections[sectionIndex];

    // Security: User cannot jump to a 'pending' section (one they haven't reached yet)
    // Exception: If they are simply navigating within the *current* active section
    if (
      targetSection.status === "pending" &&
      sectionIndex !== state.currentSectionIndex
    ) {
      return void res
        .status(403)
        .json({ error: "Cannot jump to locked section" });
    }

    state.currentSectionIndex = sectionIndex;
    state.currentQuestionIndex = questionIndex;

    await redis.set(key, JSON.stringify(state));
    return void res.json(state);
  } catch (error: any) {
    return void res.status(500).json({ error: error.message });
  }
};

/* ------------------------------------------------------------------
   MARKET ANALYSIS MODULE
   ------------------------------------------------------------------ */

/**
 * ROUTE: Estimate Market Size (AI Assist)
 * POST /api/qa/market-analysis/estimate
 */
const estimateSchema = z.object({
  projectId: z.string().uuid(),
  region: z.string().optional(),
});

const estimateHandler: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { projectId, region } = estimateSchema.parse(req.body);
    const key = getSessionKey(projectId);
    const stateStr = await redis.get(key);

    if (!stateStr)
      return void res.status(404).json({ error: "Session not found" });
    const state: QASessionState = JSON.parse(stateStr);

    // Build Context from Q&A History
    const context = getValidationContext(state);

    // Call AI Agent
    const estimates = await generateMarketEstimates(
      context,
      region || "Global"
    );

    return void res.json(estimates);
  } catch (e: any) {
    console.error("Estimate Error:", e);
    return void res.status(500).json({ error: e.message });
  }
};

/**
 * ROUTE: Save Market Analysis Data
 * POST /api/qa/market-analysis/save
 */
const saveMarketSchema = z.object({
  projectId: z.string().uuid(),
  tam: z.string(),
  sam: z.string(),
  som: z.string(),
});

const saveMarketHandler: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { projectId, tam, sam, som } = saveMarketSchema.parse(req.body);
    const key = getSessionKey(projectId);
    const stateStr = await redis.get(key);

    if (!stateStr)
      return void res.status(404).json({ error: "Session not found" });
    const state: QASessionState = JSON.parse(stateStr);

    // Update Redis State
    state.marketAnalysis = {
      tam,
      sam,
      som,
      isComplete: true,
    };
    await redis.set(key, JSON.stringify(state));

    // --- NEW FIX: Compile Transcript and Save to Supabase ---
    // The outline generator expects an array of { role: string, content: string }
    const transcript: { role: string; content: string }[] = [];
    
    state.sections.forEach((section) => {
      section.questions.forEach((q) => {
        if (q.answer) {
          // Add the AI's question
          transcript.push({ role: "assistant", content: q.question });
          
          // Format and add the User's answer
          const answerStr = Array.isArray(q.answer) ? q.answer.join(", ") : q.answer;
          transcript.push({ role: "user", content: answerStr });
        }
      });
    });

    // Upsert the transcript into the qa_sessions table
    const { error: dbError } = await supabase
      .from("qa_sessions")
      .upsert({
        project_id: projectId,
        transcript: transcript,
      });

    if (dbError) {
      console.error("Supabase Transcript Save Error:", dbError);
      return void res.status(500).json({ error: "Failed to save transcript to database" });
    }
    // --------------------------------------------------------

    return void res.json(state);
  } catch (e: any) {
    return void res.status(500).json({ error: e.message });
  }
};

// --- Mount Routes ---
router.post("/start", authenticate, startHandler);
router.get("/state/:projectId", authenticate, getStateHandler);
router.post("/answer", authenticate, answerHandler);
router.post("/jump", authenticate, jumpHandler);

// Market Analysis Routes
router.post("/market-analysis/estimate", authenticate, estimateHandler);
router.post("/market-analysis/save", authenticate, saveMarketHandler);

export default router;
