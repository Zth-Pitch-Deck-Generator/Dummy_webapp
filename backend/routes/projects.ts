import { Router, Request, Response, RequestHandler } from "express";  // Added RequestHandler
import { supabase } from "../supabase";  // service-role client
import { z } from "zod";

const router = Router();

/* ---------- request-body contract ---------- */
const bodySchema = z.object({
  projectName: z.string().min(1),
  industry:    z.string().min(1),
  stage:       z.enum(["pre-seed","seed","series-a","series-b","series-c","other"]),
  revenue: z.enum(["pre-revenue", "revenue"]),
  description: z.string().min(5),
  slide_mode: z.enum(["manual", "ai"]),  // Optional for AI mode
  slide_count:  z.number().int().min(5).max(14).nullable().optional(),  // Optional for AI mode
  decktype:    z.enum(["essentials", "matrix", "complete_deck"])
}).refine( 
  d=> (d.slide_mode === "ai" && d.slide_count !== null), {
  message: "slide_count is required when slide_mode is manual",
  path: ["slide_count"]
}
);


/* ---------- POST /api/projects ---------- */
router.post("/", async (req, res) => {
  /* 1. validate body */
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    console.log("zod errors:", parsed.error.flatten());
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
const { projectName, industry, stage, revenue, description, slide_mode, slide_count, decktype } = parsed.data;  // Changed from 'template'


  /* 2. insert row */
  const { data, error } = await supabase
    .from("projects")
    .insert([
      {
        name:         projectName,
        industry,
        stage,
        revenue,
        description,
        slide_mode,
        slide_count:  slide_mode === "ai" ? null : slide_count,
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
