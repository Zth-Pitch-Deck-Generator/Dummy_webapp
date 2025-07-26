import { Router, Request, Response, RequestHandler } from "express";  // Added RequestHandler
import { supabase } from "../supabase";  // service-role client
import { z } from "zod";

const router = Router();

/* ---------- request-body contract ---------- */
const bodySchema = z.object({
  projectName: z.string().min(1),
  industry:    z.string().min(1),
  stage:       z.enum(["pre-seed","seed","series-a","series-b","series-c","other"]),
  description: z.string().min(5),
  slideCount:  z.number().int().min(5).max(14),
  decktype:    z.enum(["essentials", "matrix", "complete_deck"])
});


/* ---------- POST /api/projects ---------- */
router.post("/", async (req, res) => {
  /* 1. validate body */
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    console.log("zod errors:", parsed.error.flatten());
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
const { projectName, industry, stage, description, slideCount, decktype } = parsed.data;  // Changed from 'template'


  /* 2. insert row */
  const { data, error } = await supabase
    .from("projects")
    .insert([
      {
        name:         projectName,
        industry,
        stage,
        description,
        slide_count:  slideCount,
        decktype
      }
    ])
    .select("id")         // only need the primary key back
    .single();

  /* 3. error / success response */
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json({ id: data.id });
});

export default router;
