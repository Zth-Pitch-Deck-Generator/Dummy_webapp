import { Router, Request, Response, RequestHandler } from "express";
import { supabase } from "../supabase.js";
import { z } from "zod";

const router = Router();

/* ---------- request-body contract ---------- */
const bodySchema = z.object({
  projectName: z.string().min(1),
  industry:    z.string().min(1),
  stage:       z.enum(["pre-seed","seed","series-a","series-b","series-c","other"]),
  revenue: z.enum(["pre-revenue", "revenue"]),
  description: z.string().min(5),
  slide_mode: z.enum(["manual", "ai"]),
  slide_count:  z.number().int().min(5).max(14).nullable().optional(),
  decktype:    z.enum(["basic_pitch_deck", "complete_pitch_deck", "guided_dataroom", "direct_dataroom"])
}).refine(
  d => {
    if (d.slide_mode === "manual") return d.slide_count !== null && d.slide_count !== undefined;
    return true;
  },
  {
    message: "slide_count is required when slide_mode is manual",
    path: ["slide_count"]
  }
);


/* ---------- POST /api/projects ---------- */
router.post("/", async (req, res) => {
  try {
    /* 1. validate body */
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      console.log("zod errors:", parsed.error.flatten());
      res.status(400).json({ error: "Invalid payload" });
      return;
    }
    const { projectName, industry, stage, revenue, description, slide_mode, slide_count, decktype } = parsed.data;

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
      .select("id")
      .single();

    /* 3. error / success response */
    if (error) {
      throw new Error(error.message);
    }
    res.status(201).json({ id: data.id });
  } catch (error: any) {
    console.error("Error creating project:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
