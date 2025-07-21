import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabase';
import { z } from 'zod';
import 'dotenv/config';

const router = Router();

/* ── 0.  SDK boot ─────────────────────────────────────────────── */
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY / GOOGLE_API_KEY missing');
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

/* ── 1.  Zod schema ──────────────────────────────────────────── */
const bodySchema = z.object({
  projectId: z.string().uuid(),
  messages: z.array(
    z.object({ role: z.enum(['ai', 'user']), content: z.string() })
  )
});

/* helper for deck-type instructions */
const deckInstructions = (d: string) =>
  d === 'essentials'
    ? `
        The user has chosen the 'Essentials' deck. Your primary role is to be a structured guide.
        Focus on foundational business questions (Problem, Solution, Market, Team, Ask).
        Your goal is to get the core narrative right. Synthesize the user's raw thoughts into clear, professional language.
      `
    : d === 'matrix'
    ? `
        The user has chosen the 'Matrix' deck. Your primary role is to be a data-driven analyst.
        Your questioning must be specific and extractive, designed to pull out key metrics for competitive analysis.
        Ask for quantifiable data like CAC, LTV, churn rate, market size, and competitor features.
        IMPORTANT: The user may not know these terms. If they seem unsure, briefly and simply define the term before asking for the data. For example: 'Next, let's talk about Customer Acquisition Cost, or CAC. This is the total cost to get one new paying customer. What's your estimated CAC?'.
      `
    : d === 'complete_deck'
    ? `
        The user has chosen the 'Complete Deck'. Your role is to be a holistic strategist.
        You must blend foundational narrative questions (like in 'Essentials') with targeted data questions (like in 'Matrix').
        Your goal is to weave the story and the data together into a single, powerful argument from beginning to end. Alternate between asking about the story and asking for the numbers that back it up.
      `
    : '';

/* ── 2.  POST /api/qa ────────────────────────────────────────── */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const ok = bodySchema.safeParse(req.body);
    if (!ok.success) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    const { projectId, messages } = ok.data;

    /* project lookup */
    const { data: project, error: pErr } = await supabase
      .from('projects')
      .select('name, industry, description, decktype')
      .eq('id', projectId)
      .single();
    if (pErr || !project) {
      res.status(404).json({ error: 'Project not found', details: pErr?.message });
      return;
    }

  /* prompt */
  const system = `
    You are a friendly but expert VC analyst conducting a Q&A to build a pitch deck.
    The user's project is called "${project.name}" in the "${project.industry}" sector.
    Their initial description is: "${project.description}".
    ${deckInstructions(project.decktype)}
General Rules:
    - Ask only ONE insightful question at a time.
    - Wait for the user's answer before asking the next question.
    - Keep your follow-ups brief and encouraging. Your response should ONLY be the next question.
  `;
  const chat = [system, ...messages.map(m => `${m.role}: ${m.content}`)].join('\n\n');

  /* model fallback loop */
  const candidates=['gemini-2.0-flash'];
  let reply = '', lastErr: any = null;

  for (const modelName of candidates) {
    try {
      const result = await genAI.getGenerativeModel({ model: modelName }).generateContent(chat);
      reply = result.response.text().trim();
      break;
    } catch (e: any) {
      lastErr = e;
      const msg = e?.message || '';
      if (msg.includes('SERVICE_DISABLED') || msg.includes('PERMISSION_DENIED')) continue;
      break;
    }
  }
  if (!reply) {
    res.status(500).json({ error: 'Gemini failure', details: lastErr?.message });
    return;
  }

  /* ------------ SSE stream to FE ------------ */
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  for (let i = 0; i < reply.length; i += 120) {
    res.write(reply.slice(i, i + 120));
    await new Promise(r => setTimeout(r, 25));
  }
  res.end();

  /* ------------ persist turn --------------- */
  await supabase.from('answers').insert([{
    project_id: projectId,
    question:   messages.at(-1)!.content,
    answer:     reply
  }]);

/* ------------ upsert full session -------- */
const fullTranscript = [...messages, { role: 'ai', content: reply }];
await supabase.from('qa_sessions').upsert([{
  project_id: projectId,
  transcript: fullTranscript        // jsonb column
}], { onConflict: 'project_id' });   // guarantees single row
} catch (error) {
  console.error('Error in QA route:', error);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
});

/* ── 3.  Optional explicit /session/complete (still harmless) ── */
router.post('/session/complete', async (req: Request, res: Response) => {
  const ok = bodySchema.safeParse(req.body);
  if (!ok.success) {
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }
  const { projectId, messages } = ok.data;
  await supabase.from('qa_sessions').upsert([{
    project_id: projectId,
    transcript: messages
  }], { onConflict: 'project_id' });
  res.status(204).end();
});

export default router;
