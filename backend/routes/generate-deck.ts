import { Router } from "express";
import { z } from "zod";
import { geminiJson } from "../lib/geminiFlash.js";
import { geminiProHtmlSlides } from "../lib/geminiPro.js";
import { supabase } from "../supabase.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const bodySchema = z.object({
  projectId: z.string().uuid(),
  productDescription: z.string().optional(), // Add this field for personalization
});

router.post("/", authenticate, async (req: any, res) => {
  try {
    const { projectId, productDescription = "" } = bodySchema.parse(req.body);

    // Fetch template info from project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('templates ( name, description ), user_id')
      .eq('id', projectId)
      .single();
    if (projectError) throw new Error(`Project error: ${projectError.message}`);
    if (projectData.user_id !== req.user?.id) throw new Error('Forbidden');
    const template = Array.isArray(projectData.templates)
      ? projectData.templates[0]
      : projectData.templates;
    if (!template) throw new Error("Template not found!");

    // Fetch outline
    const { data: outlineData, error: outlineError } = await supabase
      .from('outlines')
      .select('outline_json')
      .eq('project_id', projectId)
      .single();
    if (outlineError || !outlineData) throw new Error("Outline not found!");

    const outline = outlineData.outline_json;

    // -- Step 1: Extract design info using Flash --
    const flashPrompt = `
Analyze this template and extract a detailed UI/UX description (colors, fonts, animations, style, layout):
Template Name: "${template.name}"
Description: "${template.description}"
`;
    const designDescription = await geminiJson(flashPrompt);

    // -- Step 2: Generate HTML/CSS slides from Pro --
    const generatedSlides = await geminiProHtmlSlides({
      designDescription: typeof designDescription === "string"
        ? designDescription
        : JSON.stringify(designDescription),
      outline,
      productDescription,
    });

    // -- Save slides in DB --
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

    // -- Optionally run compile-deck to generate PPTX now or handle via UI later --
    res.status(201).json(savedSlides);
  } catch (error: any) {
    res.status(500).json({error: error.message || "Failed to generate deck"});
  }
});
export default router;
