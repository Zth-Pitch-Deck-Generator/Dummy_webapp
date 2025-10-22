import { Router } from "express";
import { z } from "zod";
import { geminiProHtmlSlides } from "../lib/geminiPro.js";
import { supabase } from "../supabase.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const bodySchema = z.object({
  projectId: z.string().uuid(),
  productDescription: z.string().optional(),
});

router.post("/", authenticate, async (req: any, res) => {
  try {
    const { projectId, productDescription = "" } = bodySchema.parse(req.body);

    // 1. Get project and templateId (assume your projects table has template_id)
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('template_id, user_id')
      .eq('id', projectId)
      .single();
    if (projectError) throw new Error(`Project error: ${projectError.message}`);
    if (projectData.user_id !== req.user?.id) throw new Error('Forbidden');
    if (!projectData.template_id) throw new Error("No template selected for this project.");

    // 2. Fetch template with UI/UX description
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('name, description, ui_ux_description')
      .eq('id', projectData.template_id)
      .single();

    if (templateError) throw new Error("Template fetch error: " + templateError.message);
    if (!template?.ui_ux_description) throw new Error("Template is missing UI/UX description.");

    // 3. Fetch outline JSON
    const { data: outlineData, error: outlineError } = await supabase
      .from('outlines')
      .select('outline_json')
      .eq('project_id', projectId)
      .single();
    if (outlineError || !outlineData) throw new Error("Outline not found!");

    const outline = outlineData.outline_json;

    // 4. Use the UI/UX description as design description
    const designDescription =
      typeof template.ui_ux_description === "string"
        ? template.ui_ux_description
        : JSON.stringify(template.ui_ux_description);

    // 5. Generate HTML/CSS slides via Gemini Pro
    const generatedSlides = await geminiProHtmlSlides({
      designDescription,
      outline,
      productDescription,
    });

    // 6. Save slides in DB
    const slidesToInsert = generatedSlides.map((slide, i) => ({
      project_id: projectId,
      slide_number: i + 1,
      title: slide.title,
      html_content: slide.html_content,
    }));
    const { data: savedSlides, error: insertError } = await supabase
      .from('deck_slides')
      .insert(slidesToInsert)
      .select();
    if (insertError) throw new Error("Failed to save slides: " + insertError.message);

    res.status(201).json(savedSlides);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate deck" });
  }
});
export default router;
