import { Router } from "express";
import { z } from "zod";
import { createRequire } from "module";
import { geminiJson } from "../lib/geminiFlash.js";
import { supabase } from "../supabase.js";

const require = createRequire(import.meta.url);
const PptxGenJS = require('pptxgenjs');

// Define a type for our structured slide content
interface SlideContent {
  title: string;
  bulletPoints?: string[];
  body?: string;
}

const router = Router();

// The body now only requires the projectId
const bodySchema = z.object({
  projectId: z.string().uuid(),
});

router.post("/", async (req, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const { projectId } = parsed.data;

    // 1. Fetch project to get the saved template_id
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('template_id, industry') // Also fetch industry for the prompt
      .eq('id', projectId)
      .single();

    if (projectError || !projectData || !projectData.template_id) {
      throw new Error(`Project or selected template not found for project ${projectId}. Details: ${projectError?.message}`);
    }
    const templateId = projectData.template_id;

    // 2. Fetch the specific template's details from the database
    const { data: templateData, error: templateError } = await supabase
      .from('templates')
      .select('name, description') // Fetch details for the prompt
      .eq('id', templateId)
      .single();

    if (templateError || !templateData) {
      throw new Error(`Template details not found for template ${templateId}. Details: ${templateError?.message}`);
    }
    
    console.log(`[${projectId}] Using template from DB: ${templateData.name}`);

    // 3. Fetch the project's outline
    const { data: outlineData, error: outlineError } = await supabase
      .from('outlines')
      .select('outline_json')
      .eq('project_id', projectId)
      .single();

    if (outlineError || !outlineData) {
      throw new Error(`Failed to fetch outline for project ${projectId}: ${outlineError?.message}`);
    }
    const outline = outlineData.outline_json;

    // 4. Generate structured, editable content from AI
    console.log(`[${projectId}] Generating structured content for slides...`);
    const prompt = `
      You are a world-class business consultant and content strategist. 
      Your task is to generate the professional content for a pitch deck.

      The deck is for a company in the **${projectData.industry}** industry.
      The chosen presentation style is described as: "${templateData.name} - ${templateData.description}".
      
      Based on the following slide outline, generate the content for each slide.
      Outline:
      ${JSON.stringify(outline, null, 2)}

      For each slide, provide a "title" and either "bulletPoints" (an array of concise, impactful strings) or a "body" (a single paragraph string).

      Return ONLY a valid JSON array of these slide objects.
    `;

    const generatedSlides: SlideContent[] = await geminiJson(prompt);
    console.log(`[${projectId}] Content for ${generatedSlides.length} slides generated.`);

    // 5. Assemble Editable PPTX
    console.log(`[${projectId}] Assembling editable PPTX file...`);
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';

    for (const slideContent of generatedSlides) {
      const slide = pres.addSlide();
      // Add title (editable)
      slide.addText(slideContent.title, { 
        x: 0.5, y: 0.25, w: '90%', h: 1, 
        fontSize: 32, bold: true, align: 'center', color: '363636'
      });
      // Add content (editable)
      const content = slideContent.bulletPoints 
        ? slideContent.bulletPoints.map(point => ({ text: point }))
        : [{ text: slideContent.body || '' }];

      slide.addText(content, { 
        x: 1, y: 1.5, w: '80%', h: 4, 
        fontSize: 18, 
        color: '494949',
        bullet: !!slideContent.bulletPoints 
      });
    }

    // 6. Upload and Finalize
    const pptxBuffer = await pres.write({ outputType: 'nodebuffer' });
    const filePath = `deck-${projectId}-${Date.now()}.pptx`;

    const { error: uploadError } = await supabase.storage
      .from('pitch-decks') // FIX: Corrected bucket name
      .upload(filePath, pptxBuffer as ArrayBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage.from('pitch-decks').getPublicUrl(filePath); // FIX: Corrected bucket name

    res.status(200).json({
      slides: generatedSlides.map(s => ({ title: s.title, content: s.bulletPoints?.join('\n') || s.body || "" })),
      downloadUrl: urlData.publicUrl,
    });

  } catch (error: any) {
    console.error("Error in /api/generate-deck:", error.message);
    res.status(500).json({ error: "Failed to generate deck." });
  }
});

export default router;