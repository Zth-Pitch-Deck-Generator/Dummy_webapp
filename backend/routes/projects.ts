import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";

const router = Router();

// Schema updated to remove slide_count and slide_mode
const projectSchema = z.object({
  projectName: z.string().min(1),
  industry: z.string().min(1),
  stage: z.string().min(1),
  revenue: z.string().min(1),
  description: z.string().min(1),
  decktype: z.string().min(1),
});

router.post("/", async (req, res) => {
  try {
    const parsedData = projectSchema.parse(req.body);

    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          name: parsedData.projectName,
          industry: parsedData.industry,
          stage: parsedData.stage,
          revenue: parsedData.revenue,
          description: parsedData.description,
          decktype: parsedData.decktype,
        },
      ])
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({ id: data.id });
  } catch (error) {
    console.error("Error creating project:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create project" });
  }
});

export default router;
