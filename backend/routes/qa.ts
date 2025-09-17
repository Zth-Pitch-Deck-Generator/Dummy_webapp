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

    const MAX_QUESTIONS = 7;
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

    // Only enhance questions where company context would be genuinely helpful
    // Most questions from basic_pitch_deck.json are already well-written
    const shouldEnhanceQuestion = (question: string, topic: string, company: any) => {
      // Only enhance certain question types where context really matters
      const contextualTopics = ['Company', 'Problem/Opportunity', 'Audience', 'Solution'];
      const hasCompanyName = question.toLowerCase().includes('company') || question.toLowerCase().includes('your');

      return contextualTopics.includes(topic) && hasCompanyName && company.name && company.industry;
    };

    // Only enhance questions where it genuinely adds value
    if (shouldEnhanceQuestion(nextQuestionFromConfig.question, nextQuestionFromConfig.topic, projectData)) {
      try {
        const questionEnhancePrompt = `
          Original Question: "${nextQuestionFromConfig.question}"
          Company: ${projectData.name} (${projectData.industry} industry)

          Add minimal context to make this question more relevant, but keep it simple:
          1. Only add context if it genuinely helps
          2. Keep it 1-2 lines maximum
          3. Use simple, clear language
          4. Don't over-complicate - the original is already good

          Examples:
          - Original: "What is your company's name and what is its one-line tagline?"
          - Enhanced: "What's ${projectData.name} and how do you describe it in one line?"

          - Original: "Who is your primary target audience?"
          - Enhanced: "Who are your main customers in ${projectData.industry}?"

          If the original question is already perfect, return it unchanged.

          Return ONLY a JSON object:
          {
            "enhanced_question": "Your enhanced question here"
          }
        `;

        const enhanceResult = await geminiJson(questionEnhancePrompt);
        const enhanceSchema = z.object({
          enhanced_question: z.string().min(1)
        });
        const parsedEnhance = enhanceSchema.safeParse(enhanceResult);

        if (parsedEnhance.success && parsedEnhance.data.enhanced_question.trim() !== "") {
          finalQuestion.question = parsedEnhance.data.enhanced_question;
          console.log(`✅ Question enhanced for ${projectData.industry} (${projectData.stage}) startup`);
          console.log(`📝 Original: "${nextQuestionFromConfig.question}"`);
          console.log(`🎯 Enhanced: "${finalQuestion.question}"`);
        } else {
          console.log("⚠️ Using original question as enhancement failed or returned empty result");
        }
      } catch (e) {
        console.error("❌ Error enhancing question with Gemini:", e);
        console.log("🔄 Falling back to original question");
        // Keep the original question if enhancement fails
      }
    } else {
      console.log(`📋 Using original question as-is: "${nextQuestionFromConfig.question}"`);
    }

    // Generate dynamic multiple choice options if needed
    if (finalQuestion.answerType === 'multiple_choice') {
      const choiceGenPrompt = `
        Create simple multiple-choice options for a ${projectData.industry} startup.

        Company: ${projectData.name} (${projectData.stage} stage, ${projectData.revenue})
        Question: "${finalQuestion.question}"

        Generate 3-4 realistic options that are:
        1. Easy to understand (simple language)
        2. Relevant for ${projectData.industry} companies
        3. Appropriate for ${projectData.stage} stage
        4. Clear and specific

        Always include "Other" as the last option.

        Example for revenue question:
        {
          "choices": ["$0 - No revenue yet", "$1K - $10K per month", "$10K - $50K per month", "Other"]
        }

        Return ONLY a JSON object:
        {
          "choices": ["Option 1", "Option 2", "Option 3", "Other"]
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
          console.log(`✅ Generated ${finalQuestion.choices.length} contextual choices for multiple choice question`);
        } else {
            // Fallback if AI fails to generate valid choices
            console.error("❌ Gemini failed to generate valid choices, using default.", parsedChoices.error);
            if (!finalQuestion.choices || finalQuestion.choices.length === 0) {
                finalQuestion.choices = ["Yes", "No", "Other"];
            }
        }
      } catch (e) {
        console.error("❌ Error generating dynamic choices from Gemini:", e);
        console.log("🔄 Using fallback choices");
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