import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";
import { authenticate } from "../middleware/auth.js";


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

// GET endpoint to retrieve all projects for the authenticated user
router.get("/", authenticate, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", req.user.id);

    if (error) {
      throw error;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});


// POST endpoint to create a new project
router.post("/", authenticate, async (req: any, res) => {
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
          user_id: req.user.id, // Add the user_id from the authenticated user
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
router.patch("/:id", authenticate, async (req: any, res) => {
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
      .eq('user_id', req.user.id) // Ensure the user owns the project
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw new Error(`Failed to update project ${id}: ${error.message}`);
    }

    if (!data) {
      return res.status(404).json({ error: `Project with id ${id} not found or you don't have permission to update it.` });
    }

    res.status(200).json(data);
  } catch (error: any) {
    console.error("Error in PATCH /api/projects/:id:", error.message);
    res.status(500).json({ error: "Failed to update project." });
  }
});


export default router;