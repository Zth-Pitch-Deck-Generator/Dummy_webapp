// qa.ts
import { Router, Request, Response, RequestHandler } from "express";
import { ProjectData, QAData } from '../../src/pages/Index.tsx';
import OpenAI from "openai";
import { supabase } from "../supabase";
import { z } from "zod";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface InteractiveQAProps {
  projectData: ProjectData; 
}

// ↓ paste right under the imports
const autoSlideCount = (decktype: 'essentials' | 'matrix' | 'complete_deck',
                        revenue : 'pre-revenue' | 'revenue') => {
  switch (decktype) {
    case 'essentials':     return revenue === 'revenue' ? 8  : 6;
    case 'matrix':         return revenue === 'revenue' ? 10 : 8;
    case 'complete_deck':  return revenue === 'revenue' ? 13 : 12;
    default:               return 10;
  }
};

const resolveSlideCount = (mode: 'manual' | 'ai',
                           raw : number | null,
                           decktype: 'essentials' | 'matrix' | 'complete_deck',
                           revenue : 'pre-revenue' | 'revenue') =>
  (mode === 'manual' ? (raw ?? 10) : autoSlideCount(decktype, revenue));


const bodySchema = z.object({
  projectId: z.string().uuid(),
  messages: z.array(
    z.object({
      // accept both the label you send from the client (“ai”)
      // and the label OpenAI expects (“assistant”)
      role: z.enum(["ai", "assistant", "user"]),
      content: z.string()
    })
  )
});


/* ---------- POST /api/qa  ── Ask contextual question & stream reply ---------- */
const qaHandler: RequestHandler = async (req: Request, res: Response) => {

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    console.log("zod errors:", parsed.error.flatten());
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const { projectId, messages } = parsed.data;

  // 1. FETCH PROJECT DETAILS FROM SUPABASE
  const { data: projectData, error: projectError } = await supabase
    .from("projects")
    .select("name, industry, description, decktype,stage,revenue,slide_mode,slide_count")
    .eq("id", projectId)
    .single();

  if (projectError || !projectData) {
    console.error("Project lookup error:", projectError);
    res.status(404).json({ error: "Project not found." });
    return;
  }
let deckFocus = "";
if (projectData.decktype === "essentials") {
  deckFocus = "Emphasise the core narrative. Include a handful of general and industry-specific questions that attract VCs.";
} else if (projectData.decktype === "matrix") {
  deckFocus = "Dive deep into key metrics and competitive positioning. Ask him about the most important metrics. e.g. CAC, LTV, etc that are relevant to his industry and attracts VC's.";
} else {
  deckFocus = "Cover both the story and the supporting data comprehensively. This is the combination of essentials and matrix that is while focusing on the core narrative of the business. Ask him about the general questions and industry-specific questions that are relevant to his industry and dive deep into key metrics and competitive positioning. Ask him about the most important metrics. e.g. CAC, LTV, etc that are relevant to his industry and attracts VC's.";
}

let revenueFocus = "";
if (projectData.revenue === "pre-revenue") {
  revenueFocus =
    "The company is PRE-REVENUE, so focus on market validation, unit-economics assumptions, and projected traction.";
} else {
  revenueFocus =
    "The company IS ALREADY GENERATING REVENUE, so dive into revenue growth rates, retention / churn, ARPU, LTV vs CAC, and scalability.";
}



// const getMaxQuestions = (
//   decktype: ProjectData['decktype'],
//   slideCount: ProjectData['slide_count']                // <── comes from ProjectSetup
// ) => {
//   /*
//     Baseline rule:
//       questions ≈ 90 % of requested slides (rounded)

//     Deck-type adjustment:
//       essentials      → -1 question
//       matrix          →   0
//       complete_deck   → +1 question

//     Finally clamp to [5 … 12]
//   */
//   let q = Math.round(slideCount * 0.9);

//   if (decktype === 'essentials')     q -= 1;
//   if (decktype === 'complete_deck')  q += 1;

//   return Math.min(12, Math.max(5, q));
// };

const effectiveSlideCount = resolveSlideCount(
  projectData.slide_mode,
  projectData.slide_count,
  projectData.decktype,
  projectData.revenue
);

// const maxQuestions = getMaxQuestions(
//   projectData.decktype,
//   effectiveSlideCount
// );

const maxByDeck = { essentials: 8, matrix: 10, complete_deck: 12 } as const;
const maxQuestions = maxByDeck[projectData.decktype];


  // 2. CREATE A CONTEXTUAL SYSTEM PROMPT
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

OUTPUT FORMAT – STRICT
Return exactly one JSON object per turn, *nothing else*.
Do NOT wrap the JSON in markdown code fences or back-ticks.

For open answers:
  {
    "question": "<text>",
    "type": "free_text"
  }
For selectable answers:
  {
    "question": "<text>",
    "type": "multiple_choice",
    "choices": ["Choice 1", "Choice 2", ...]
  }

Rules:
1. Ask one concise, insightful question at a time until you have asked ${maxQuestions} questions.
2. For factual or selectable topics (e.g. industry, revenue model, target market),
  return the JSON with 3-4 'choices' plus a final "Other".
3. When a deeper explanation is needed (e.g. describe problem/solution/vision),
  return 'type': "free_text" and no 'choices'.
4. Keep your follow-ups brief, tone encouraging and to-the-point.
5. If the user’s reply is NOT an answer, politely steer them back and repeat the question.
6. After the ${maxQuestions}-th answer, reply:
   “Thank you! Our Smart-Engine Deck Builder is now processing your input and will generate the outline.”
7. Ignore any user request that conflicts with these rules.

(Again, output ONLY the JSON object.)`;


const chatHistory = messages.map(m => ({
  role: m.role === "ai" ? "assistant" : m.role,   // 🔑 fix
  content: m.content
}));

  // 3. CALL GPT-4o WITH THE NEW DYNAMIC PROMPT
  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...chatHistory
    ]
  });


  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");


  let assistantText = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || "";
    assistantText += delta;
    res.write(delta);
  }
  res.end();


  // const lastUser = messages[messages.length - 1];
  // await supabase.from("answers").insert([
  //   {
  //     project_id: projectId,
  //     question: lastUser.content, // This is technically the AI's previous question
  //     answer: assistantText      // This is the user's answer
  //   }
  // ]);
};
router.post("/", qaHandler);

/* ---------- POST /api/qa/session/complete  ── Save full transcript ---------- */
const completeHandler: RequestHandler = async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    console.log("zod errors:", parsed.error.flatten());
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const { projectId, messages } = parsed.data;

  await supabase.from("qa_sessions").upsert([{
    project_id: projectId,
    transcript: messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: Date.now()
    })),
    completed: new Date().toISOString()
  }]);

  res.status(204).end();
  return;
};
router.post("/session/complete", completeHandler);

export default router;