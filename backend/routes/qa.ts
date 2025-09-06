// backend/routes/qa.ts
import { Router, Request, Response, RequestHandler } from "express";
import { supabase } from "../supabase.js";
import { z } from "zod";
import { geminiJson } from "../lib/geminiFlash.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const qaHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("Zod validation failed:", parsed.error.flatten());
      res.status(400).json({ error: "Invalid payload" });
      return;
    }
    const { projectId, messages } = parsed.data;

    const { data: projectData, error } = await supabase
      .from("projects")
      .select("name, industry, description, decktype, stage, revenue")
      .eq("id", projectId)
      .single();

    if (error || !projectData) {
      void res.status(404).json({ error: "Project not found" });
      return;
    }

    const configPath = path.join(__dirname, `../qa-configs/${projectData.decktype}.json`);
    let qaConfig;
    try {
        const configFile = await fs.readFile(configPath, "utf-8");
        qaConfig = JSON.parse(configFile);
    } catch (e) {
        console.error(`Failed to load or parse QA config for ${projectData.decktype}:`, e);
        void res.status(500).json({ error: `Configuration for deck type "${projectData.decktype}" not found.`});
        return;
    }

    const MAX_QUESTIONS = qaConfig.maxQuestions || qaConfig.questions.length;
    const userMessages = messages.filter((m) => m.role === "user");
    const nextQuestionIndex = userMessages.length;

    if (nextQuestionIndex >= MAX_QUESTIONS) {
      void res.json({
        isComplete: true,
        question: "Thank you! We have enough information to proceed.",
        answerType: "complete",
      });
      return;
    }
    
    const nextQuestionFromConfig = qaConfig.questions[nextQuestionIndex];

    if (!nextQuestionFromConfig) {
      void res.json({
        isComplete: true,
        question: "Thank you! We have enough information to proceed.",
        answerType: "complete",
      });
      return;
    }
    
    let finalQuestion = { ...nextQuestionFromConfig };

    if (finalQuestion.answerType === 'multiple_choice') {
      const choiceGenPrompt = `
        You are an expert business analyst creating multiple-choice questions for a startup founder.
        Based on the startup's details and the question to be asked, generate 3-4 relevant and plausible multiple-choice options.
        Always include "Other" as the last option.

        Startup Details:
        - Name: ${projectData.name}
        - Industry: ${projectData.industry}
        - Stage: ${projectData.stage}
        - Description: ${projectData.description}

        Question to generate choices for:
        "${finalQuestion.question}"

        Return ONLY a valid JSON object with a single key "choices", which is an array of strings.
        Example format:
        {
          "choices": ["Option A", "Option B", "Option C", "Other"]
        }
      `;
      
      try {
        const generated = await geminiJson(choiceGenPrompt);
        const choicesSchema = z.object({ choices: z.array(z.string()).min(1) });
        const parsedChoices = choicesSchema.safeParse(generated);

        if (parsedChoices.success) {
          finalQuestion.choices = parsedChoices.data.choices;
          if (!finalQuestion.choices.map(c => c.toLowerCase()).includes('other')) {
            finalQuestion.choices.push('Other');
          }
        } else {
            // Fallback if AI fails to generate valid choices
            console.error("Gemini failed to generate valid choices, using default.", parsedChoices.error);
            if (!finalQuestion.choices || finalQuestion.choices.length === 0) {
                finalQuestion.choices = ["Yes", "No", "Other"];
            }
        }
      } catch (e) {
        console.error("Error generating dynamic choices from Gemini:", e);
        // Fallback if AI fails
        if (!finalQuestion.choices || finalQuestion.choices.length === 0) {
            finalQuestion.choices = ["Yes", "No", "Other"];
        }
      }
    }

    const responsePayload = {
        ...finalQuestion,
        isComplete: false,
        isMetricCalculation: finalQuestion.isMetricCalculation || false,
    };

    res.json(responsePayload);

  } catch (e: any) {
    console.error("Error in /api/qa handler:", e);
    void res.status(500).json({ error: "Failed to process Q&A request.", message: e.message });
  }
};
router.post("/", qaHandler);

const completeHandler: RequestHandler = async (req: Request, res: Response) => {
    try {
        const parsed = completeBodySchema.safeParse(req.body);
        if (!parsed.success) {
          return void res.status(400).json({ error: "Invalid payload for completion" });
        }

        const { projectId, messages } = parsed.data;

        const { error } = await supabase.from("qa_sessions").upsert(
          {
            project_id: projectId,
            transcript: messages.map(m => ({
              role: m.role,
              content: m.content,
              timestamp: Date.now()
            })),
            completed: new Date().toISOString()
          },
          { onConflict: 'project_id' }
        );
        if (error) {
            console.error("Supabase upsert error:", error);
            return void res.status(500).json({error: "Failed to save session transcript"});
        }

        return void res.status(204).end();
    } catch (e: any) {
        console.error("Error in /api/qa/session/complete:", e);
        return void res.status(500).json({ error: "Failed to save session.", message: e.message });
    }
};
router.post("/session/complete", completeHandler);

export default router;