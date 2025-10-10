import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";

const router = Router();

// Schema for creating a new project
const projectSchema = z.object({
  projectName: z.string().min(1),
  industry: z.string().min(1),
  stage: z.string().min(1),
  revenue: z.string().min(1),
  description: z.string().min(1),
  decktype: z.string().min(1),
});

// Schema for updating a project (specifically for the template)
const updateProjectSchema = z.object({
  templateId: z.string().uuid(),
});

// POST endpoint to create a new project
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

// PATCH endpoint to update a project with a template ID
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = updateProjectSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { templateId } = parsed.data;

    const { data, error } = await supabase
      .from('projects')
      .update({ template_id: templateId, "updatedAt": new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw new Error(`Failed to update project ${id}: ${error.message}`);
    }

    if (!data) {
      return res.status(404).json({ error: `Project with id ${id} not found` });
    }

    res.status(200).json(data);
  } catch (error: any) {
    console.error("Error in PATCH /api/projects/:id:", error.message);
    res.status(500).json({ error: "Failed to update project." });
  }
});


export default router;