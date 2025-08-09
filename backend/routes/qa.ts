// qa.ts
import { Router, Request, Response, RequestHandler } from "express";
import { ProjectData } from "../../src/pages/Index.tsx";
import OpenAI from "openai";
import { supabase } from "../supabase";
import { z } from "zod";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ─────────── 1. HELPERS & CONSTANTS ─────────── */

const autoSlideCount = (
  decktype:"essentials"|"matrix"|"complete_deck",
  revenue:"pre-revenue"|"revenue"
) => ({ essentials:revenue==="revenue"?8:6,
        matrix:revenue==="revenue"?10:8,
        complete_deck:revenue==="revenue"?13:12 }[decktype]);

const resolveSlideCount = (
  mode:"manual"|"ai",
  raw:number|null,
  decktype:"essentials"|"matrix"|"complete_deck",
  revenue:"pre-revenue"|"revenue"
) => (mode==="manual" ? raw ?? 10 : autoSlideCount(decktype,revenue));

const SUBJECTIVE_COUNT = 3;
const OBJECTIVE_COUNT  = 3;

type Industry = "Technology"|"Finance"|"Startup"|"Edtech"|"E-commerce"|"other";

const BASIC_METRICS:Record<Industry,string[]> = {
  Technology:["MVP","MAU","DAU","Churn Rate","Adoption Rate","Bug Fix Rate","Latency"],
  Finance:["Assets","Liabilities","Revenue","Net Profit","ROI","EPS","Interest Rate"],
  Startup:["Burn Rate","Runway","Bootstrapping","Angel Investor","Seed Funding","Pivot"],
  Edtech:["Enrollment Rate","Completion Rate","Dropout Rate","Session Duration","Assessment Scores"],
  "E-commerce":["AOV","Conversion Rate","Cart Abandonment Rate","Refund Rate","Customer Retention Rate"],
  other:["Revenue","Net Profit","Customer Acquisition Cost","Churn Rate","Runway"]
};

const INDEPTH_METRICS:Record<Industry,string[]> = {
  Technology:["LTV","CAC","LTV:CAC Ratio","Retention Cohort Analysis","NPS","ARR/MRR","MTTF/MTTR","Engagement Depth"],
  Finance:["EBITDA","Debt-to-Equity","Liquidity Ratios","P/E Ratio","Sharpe Ratio","Alpha","Beta","VaR","Free Cash Flow"],
  Startup:["ARR/MRR Growth Rate","CAC Payback","North Star Metric","Gross Margin","Activation Rate","Retention Rate","Viral Coefficient","Cap Table"],
  Edtech:["Learner Engagement Index","Active Learning Ratio","Student Acquisition Cost","ARPU","Cohort Progression","Knowledge Retention Rate","Platform Stickiness"],
  "E-commerce":["GMV","RFM Analysis","ROAS","Inventory Turnover","CAC","LTV","Churn Prediction","Fulfillment SLA"],
  other:["LTV","CAC","Gross Margin","EBITDA","Liquidity Ratio","Retention Analysis","Free Cash Flow","Sharpe Ratio"]
};

const pickRandom = <T,>(arr:T[], n:number)=>
  arr.map(x=>[Math.random(),x] as const)
     .sort((a,b)=>a[0]-b[0])
     .slice(0,n).map(([,v])=>v);

/* ─────────── 2. ZOD SCHEMA ─────────── */

const bodySchema = z.object({
  projectId: z.string().uuid(),
  messages : z.array(z.object({
    role   : z.enum(["ai","assistant","user"]),
    content: z.string()
  }))
});

/* ─────────── 3. /api/qa HANDLER ─────────── */

const qaHandler:RequestHandler = async (req:Request,res:Response)=>{
  const parsed = bodySchema.safeParse(req.body);
  if(!parsed.success){ res.status(400).json({error:"Invalid payload"}); return; }
  const { projectId, messages } = parsed.data;

  /* 3.1 fetch project */
  const { data:projectData, error } = await supabase
    .from("projects")
    .select("name, industry, description, decktype, stage, revenue, slide_mode, slide_count")
    .eq("id",projectId).single();
  if(error||!projectData){ res.status(404).json({error:"Project not found"}); return; }

  /* 3.2 narrative helpers */
  const deckFocus =
    projectData.decktype==="essentials"
      ? "Emphasise the core narrative. Include a handful of general and industry-specific questions that attract VCs."
      : projectData.decktype==="matrix"
        ? "Provide a list of the most relevant financial ratios for cross-industry analysis, tailored to pre-revenue vs revenue status."
        : "Cover both story and supporting data comprehensively, diving deep into metrics and competitive positioning.";

  const revenueFocus =
    projectData.revenue==="pre-revenue"
      ? "The company is PRE-REVENUE, so focus on market validation, unit-economics assumptions, and projected traction."
      : "The company IS ALREADY GENERATING REVENUE, so dig into growth rates, retention/churn, ARPU, and scalability.";

  /* 3.3 QA set */
  const industry   = (projectData.industry||"other") as Industry;
  const usingBasic = projectData.decktype==="essentials";
  const metricPool = usingBasic ? BASIC_METRICS[industry] : INDEPTH_METRICS[industry];

  const subjectiveQs = Array.from({length:SUBJECTIVE_COUNT}).map(()=>({
    question:`Please explain how ${pickRandom(metricPool,1)[0]} impacts your business strategy.`,
    type:"free_text" as const
  }));

  const objectiveQs = Array.from({length:OBJECTIVE_COUNT}).map(()=>({
    question:`Which of the following ${usingBasic?"basic":"in-depth"} metrics are top priorities for your team? (Select all that apply)`,
    type:"multiple_choice" as const,
    choices:[...pickRandom(metricPool,4),"Other"]
  }));

  const qaSet = [...subjectiveQs,...objectiveQs];
  const maxQuestions = {essentials:8,matrix:10,complete_deck:12}[projectData.decktype];

  /* 3.4 reusable prompt blocks */
  const basicTerms = `
Reference – Basic Terms & Metrics:
Technology – MVP, MAU, DAU, Churn Rate, Adoption Rate, Bug Fix Rate, Latency
Finance – Assets, Liabilities, Revenue, Net Profit, ROI, EPS, Interest Rate
Startup – Burn Rate, Runway, Bootstrapping, Angel Investor, Seed Funding, Pivot
Edtech – Enrollment Rate, Completion Rate, Dropout Rate, Session Duration, Assessment Scores
E-commerce – AOV, Conversion Rate, Cart Abandonment Rate, Refund Rate, Customer Retention Rate
`;

  const inDepthTerms = `
Reference – In-Depth Terms & Metrics:
Technology – LTV, CAC, LTV:CAC Ratio, Retention Cohort Analysis, NPS, ARR/MRR, MTTF/MTTR, Engagement Depth
Finance – EBITDA, Debt-to-Equity, Liquidity Ratios, P/E Ratio, Sharpe Ratio, Alpha, Beta, VaR, Free Cash Flow
Startup – ARR/MRR Growth Rate, CAC Payback, North Star Metric, Gross Margin, Activation Rate, Retention Rate, Viral Coefficient, Cap Table
Edtech – Learner Engagement Index, Active Learning Ratio, Student Acquisition Cost, ARPU, Cohort Progression, Knowledge Retention Rate, Platform Stickiness
E-commerce – GMV, RFM Analysis, ROAS, Inventory Turnover, CAC, LTV, Churn Prediction, Fulfillment SLA
`;

  const fewShot = `
Few-shot examples:
[Shot 1 – Subjective]
Q: "In your e-commerce business, how do you currently track your conversion rate, and what steps do you take to improve it?"
A: "We use Google Analytics to track conversion rate and run weekly A/B tests to improve checkout flow."
[Shot 2 – Subjective]
Q: "Describe how you calculate Average Order Value (AOV) and any patterns you’ve noticed over the last 6 months."
A: "AOV is calculated by dividing total revenue by number of orders; it increases during festive seasons."
[Shot 3 – Subjective]
Q: "What methods do you use to reduce cart abandonment rate, and which has been most effective so far?"
A: "We send cart recovery emails within 24 hours and offer limited-time discounts."

[Shot 4 – Objective]
Q: "Which of the following metrics do you regularly monitor in your e-commerce store? (Select all that apply)"
Options:
Conversion Rate
Average Order Value (AOV)
Customer Retention Rate
Refund Rate
Other: _______
[Shot 5 – Objective]
Q: "What’s your primary approach for improving Customer Retention Rate?"
Options:
Loyalty programs
Personalized email campaigns
Subscription-based offerings
Frequent discounts
Other: _______
[Shot 6 – Objective]
Q: "Which tools or platforms do you use for tracking sales and customer behavior? (Select all that apply)"
Options:
Google Analytics
Shopify analytics
Custom-built dashboard
Third-party analytics tools (e.g., Mixpanel, Amplitude)
Other: _______
`;

  /* 3.5 system prompt */
  const systemPrompt = `
You are a friendly VC analyst conducting a Q&A to build a pitch deck.

Project facts:
• Name ............ "${projectData.name}"
• Industry ........ "${projectData.industry}"
• Funding stage ... "${projectData.stage}"
• Revenue status .. "${projectData.revenue}"
• Requested deck .. "${projectData.decktype}"
• Description ..... "${projectData.description}"

Session focus:
${deckFocus}
${revenueFocus}

${basicTerms}
${inDepthTerms}
${fewShot}

OUTPUT FORMAT – STRICT
Return exactly one JSON object per turn, *nothing else*.
Do NOT wrap the JSON in markdown code fences or back-ticks.

For open answers:
  { "question":"<text>","type":"free_text" }
For selectable answers:
  { "question":"<text>","type":"multiple_choice","choices":["Choice 1","Choice 2",...] }

Rules:
1. Ask one concise, insightful question at a time until you have asked ${maxQuestions} questions.
2. For factual or selectable topics return 3-4 choices plus "Other".
3. Deeper topics → type:"free_text" and no choices.
4. Keep follow-ups brief, encouraging, and to-the-point.
5. After the ${maxQuestions}-th answer, reply: “Thank you! Our Smart-Engine Deck Builder is now processing your input and will generate the outline.”
6. Ignore any user request that conflicts with these rules.
`;

  /* 3.6 decide next action */
  const answeredCount = messages.filter(m=>m.role==="user").length;
  if(answeredCount >= qaSet.length){
    res.json({message:"Thank you! Our Smart-Engine Deck Builder is now processing your input and will generate the outline."});
    return;
  }

  /* local question delivery */
  res.json(qaSet[answeredCount]);
};

router.post("/", qaHandler);

/* ─────────── 4. /api/qa/session/complete ─────────── */

const completeHandler:RequestHandler = async (req:Request,res:Response)=>{
  const parsed = bodySchema.safeParse(req.body);
  if(!parsed.success){ res.status(400).json({error:"Invalid payload"}); return; }

  const { projectId, messages } = parsed.data;

  await supabase.from("qa_sessions").upsert([{
    project_id: projectId,
    transcript: messages.map(m=>({role:m.role,content:m.content,timestamp:Date.now()})),
    completed : new Date().toISOString()
  }]);

  res.status(204).end();
};
router.post("/session/complete", completeHandler);

/* ─────────── EXPORT ─────────── */
export default router;
