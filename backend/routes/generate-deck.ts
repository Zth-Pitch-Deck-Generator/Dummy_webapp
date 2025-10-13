// backend/routes/generate-deck.ts
import { Router } from "express";
import { z } from "zod";
import { geminiJson } from "../lib/geminiFlash.js";
import { supabase } from "../supabase.js";

const router = Router();

const bodySchema = z.object({
  projectId: z.string().uuid(),
});

router.post("/", async (req, res) => {
  try {
    const { projectId } = bodySchema.parse(req.body);

    // 1. Fetch Project, Template, and Outline data from Supabase
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('industry, templates ( name, description )')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData || !projectData.templates) {
      throw new Error(`Project or template not found: ${projectError?.message}`);
    }

    const { data: outlineData, error: outlineError } = await supabase
      .from('outlines')
      .select('outline_json')
      .eq('project_id', projectId)
      .single();

    if (outlineError || !outlineData) throw new Error(`Outline not found`);
    
    const template = projectData.templates;
    const outline = outlineData.outline_json;

    // 2. Instruct the AI to generate HTML/CSS for each slide
    console.log(`[${projectId}] Generating HTML/CSS slides with '${template.name}' style...`);
    const prompt = `
      You are an expert frontend developer specializing in HTML and CSS for presentations.
      Based on the user's outline and the desired template style, generate the complete HTML and CSS for each slide.

      **Template Style:** "${template.name} - ${template.description}"
      **User's Outline:** ${JSON.stringify(outline, null, 2)}

      For each slide in the outline, generate a JSON object with:
      - "title": A concise title for the slide.
      - "html_content": A single string containing a complete, self-contained HTML document for the slide. This HTML MUST include all necessary CSS within a <style> tag. The design must be responsive and visually match the template description. Use a 16:9 aspect ratio container.

      Return ONLY a valid JSON array of these slide objects.
    `;
    
    const generatedSlides: { title: string; html_content: string }[] = await geminiJson(prompt);

    // 3. Save each generated slide to the database
    const slidesToInsert = generatedSlides.map((slide, index) => ({
      project_id: projectId,
      slide_number: index + 1,
      title: slide.title,
      html_content: slide.html_content,
    }));

    const { data: savedSlides, error: insertError } = await supabase
      .from('deck_slides')
      .insert(slidesToInsert)
      .select();

    if (insertError) {
      throw new Error(`Failed to save slides: ${insertError.message}`);
    }

    console.log(`[${projectId}] Successfully saved ${savedSlides.length} slides.`);
    res.status(201).json(savedSlides);

  } catch (error: any) {
    console.error("Error in /api/generate-deck:", error.message);
    res.status(500).json({ error: "Failed to generate HTML slides." });
  }
});

export default router;