// backend/routes/qa.ts
import { Router, Request, Response, RequestHandler } from "express";
import OpenAI from "openai";
import { supabase } from "../supabase";
import { z } from "zod";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ─────────── 1. HELPERS & CONSTANTS ─────────── */

type Industry =
  | "Technology"
  | "Finance"
  | "Startup"
  | "Edtech"
  | "E-commerce"
  | "other";

const SUBJECTIVE_COUNT = 3;
const OBJECTIVE_COUNT = 3;

const BASIC_METRICS: Record<Industry, string[]> = {
  Technology: ["MVP", "MAU", "DAU", "Churn Rate", "Adoption Rate", "Bug Fix Rate", "Latency"],
  Finance: ["Assets", "Liabilities", "Revenue", "Net Profit", "ROI", "EPS", "Interest Rate"],
  Startup: ["Burn Rate", "Runway", "Bootstrapping", "Angel Investor", "Seed Funding", "Pivot"],
  Edtech: ["Enrollment Rate", "Completion Rate", "Dropout Rate", "Session Duration", "Assessment Scores"],
  "E-commerce": ["AOV", "Conversion Rate", "Cart Abandonment Rate", "Refund Rate", "Customer Retention Rate"],
  other: ["Revenue", "Net Profit", "Customer Acquisition Cost", "Churn Rate", "Runway"]
};

const INDEPTH_METRICS: Record<Industry, string[]> = {
  Technology: ["LTV", "CAC", "LTV:CAC Ratio", "Retention Cohort Analysis", "NPS", "ARR/MRR", "MTTF/MTTR", "Engagement Depth"],
  Finance: ["EBITDA", "Debt-to-Equity", "Liquidity Ratios", "P/E Ratio", "Sharpe Ratio", "Alpha", "Beta", "VaR", "Free Cash Flow"],
  Startup: ["ARR/MRR Growth Rate", "CAC Payback", "North Star Metric", "Gross Margin", "Activation Rate", "Retention Rate", "Viral Coefficient", "Cap Table"],
  Edtech: ["Learner Engagement Index", "Active Learning Ratio", "Student Acquisition Cost", "ARPU", "Cohort Progression", "Knowledge Retention Rate", "Platform Stickiness"],
  "E-commerce": ["GMV", "RFM Analysis", "ROAS", "Inventory Turnover", "CAC", "LTV", "Churn Prediction", "Fulfillment SLA"],
  other: ["LTV", "CAC", "Gross Margin", "EBITDA", "Liquidity Ratio", "Retention Analysis", "Free Cash Flow", "Sharpe Ratio"]
};

const SUBJECTIVE_QUESTIONS_POOL = [
    "Please explain how {metric} impacts your business strategy.",
    "What are your current goals related to {metric}?",
    "How do you measure and track {metric}?",
    "Describe your team's approach to improving {metric}."
];

const OBJECTIVE_QUESTIONS_POOL = [
    "Which of the following {type} metrics are top priorities for your team? (Select all that apply)",
    "Which of these areas represents your biggest challenge right now? (Select all that apply)",
    "What are your primary growth drivers? (Select all that apply)",
    "Which tools do you use for tracking metrics like these? (Select all that apply)"
];

/* 1.1 – SAFE pickRandom */
const pickRandom = <T,>(arr: T[] | undefined, n: number): T[] => {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return arr
    .map(x => [Math.random(), x] as const)
    .sort((a, b) => a[0] - b[0])
    .slice(0, n)
    .map(([, v]) => v);
};

/* ─────────── 2. ZOD SCHEMA ─────────── */

const bodySchema = z.object({
  projectId: z.string().uuid(),     // must be a valid UUID
  messages : z.array(               // non-empty array
    z.object({
      role   : z.enum(["ai","assistant","user"]),
      content: z.string()
    })
  )
});


/* ─────────── 3. /api/qa HANDLER ─────────── */

const qaHandler: RequestHandler = async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    console.error("Zod validation failed:", parsed.error);
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const { projectId, messages } = parsed.data;

  /* 3.1 fetch project */
  const { data: projectData, error } = await supabase
    .from("projects")
    .select("name, industry, description, decktype, stage, revenue, slide_mode, slide_count")
    .eq("id", projectId)
    .single();
  if (error || !projectData) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  /* 3.2 QA set */
  const validIndustries = Object.keys(BASIC_METRICS) as Industry[];
  const rawIndustry = projectData.industry as Industry | undefined;
  const industry: Industry = validIndustries.includes(rawIndustry!) ? rawIndustry! : "other";

  const usingBasic = projectData.decktype === "essentials";
  const metricPool = usingBasic ? BASIC_METRICS[industry] : INDEPTH_METRICS[industry];

  if (!metricPool || metricPool.length === 0) {
    res.status(400).json({ error: `No metrics found for industry: ${projectData.industry}` });
    return;
  }

  // Generate a unique set of questions for the session
  const subjectiveQs = pickRandom(SUBJECTIVE_QUESTIONS_POOL, SUBJECTIVE_COUNT).map(qTemplate => ({
    question: qTemplate.replace('{metric}', pickRandom(metricPool, 1)[0]),
    type: "free_text" as const
  }));

  const objectiveQs = pickRandom(OBJECTIVE_QUESTIONS_POOL, OBJECTIVE_COUNT).map(qTemplate => ({
    question: qTemplate.replace('{type}', usingBasic ? "basic" : "in-depth"),
    type: "multiple_choice" as const,
    choices: [...pickRandom(metricPool, 4), "Other"]
  }));

  const qaSet = [...subjectiveQs, ...objectiveQs];
  // Shuffle the set to make the conversation more natural
  const shuffledQaSet = qaSet.sort(() => Math.random() - 0.5);

  /* 3.3 decide next action */
  const answeredCount = messages.filter(m => m.role === "user").length;
  if (answeredCount >= shuffledQaSet.length) {
    res.json({
      question: "Thank you! Our Smart-Engine Deck Builder is now processing your input and will generate the outline.",
      type: "complete"
    });
    return;
  }

  /* local question delivery */
  res.json(shuffledQaSet[answeredCount]);
};

router.post("/", qaHandler);

/* ─────────── 4. /api/qa/session/complete ─────────── */

const completeHandler: RequestHandler = async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const { projectId, messages } = parsed.data;

  await supabase.from("qa_sessions").upsert([
    {
      project_id: projectId,
      transcript: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: Date.now()
      })),
      completed: new Date().toISOString()
    }
  ]);

  res.status(204).end();
};
router.post("/session/complete", completeHandler);

/* ─────────── EXPORT ─────────── */
export default router;
