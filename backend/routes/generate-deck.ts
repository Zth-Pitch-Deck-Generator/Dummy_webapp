// backend/routes/generate-deck.ts
import { Router } from "express";
import { z } from "zod";
import { geminiJson } from "../lib/geminiFlash.js";
import { supabase } from "../supabase.js";
import pptxgen from "pptxgenjs";
import fetch from 'node-fetch';

const router = Router();

// Zod schema for validating the incoming request
const bodySchema = z.object({
  projectId: z.string().uuid(),
  templateSlug: z.string(), // e.g., 'ZTH-template'
});

// --- Pexels Image Fetching Function ---
const getImageUrl = async (query: string): Promise<string | null> => {
    if (!process.env.PEXELS_API_KEY || !query) return null;
    try {
        const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
            headers: { Authorization: process.env.PEXELS_API_KEY }
        });
        if (!response.ok) throw new Error(`Pexels API failed with status: ${response.status}`);
        const data: any = await response.json();
        return data.photos[0]?.src.large || null;
    } catch (error) {
        console.error("Pexels image fetch error:", error);
        return null;
    }
};


// --- Main Route Handler ---
router.post("/", async (req, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const { projectId, templateSlug } = parsed.data;

    // 1. Fetch the user-approved outline from Supabase
    const { data: outlineData, error: outlineError } = await supabase
      .from('outlines')
      .select('outline_json')
      .eq('project_id', projectId)
      .single();

    if (outlineError || !outlineData) {
      throw new Error(`Failed to fetch outline for project ${projectId}: ${outlineError?.message}`);
    }
    const outline = outlineData.outline_json;

    // 2. AI Enrichment Prompt
    console.log(`[${projectId}] Starting AI content enrichment...`);
    const prompt = `
      You are a world-class pitch deck designer. Your task is to take a raw slide outline and enrich it with visual and data-driven elements.
      For each slide in the provided outline, you must return a JSON object with the following fields:
      - "title": The original title from the outline.
      - "content": The original bullet points from the outline.
      - "image_query": A concise, 2-4 word search query for a professional stock photo that visually represents the slide's core message (e.g., "team collaboration", "data analytics graph", "market growth").
      - "chart_data": If the slide's content is inherently data-driven (like 'Traction' or 'Market Size'), provide a sample chart object: { "type": "bar" | "pie", "labels": string[], "values": number[] }. Otherwise, this field MUST be null.
      - "diagram_prompt": If the slide explains a complex process or concept (like 'Solution' or 'Business Model'), provide a detailed prompt for an AI image generator to create a visually appealing diagram or illustration. Otherwise, this field MUST be null.

      This is the user's approved outline:
      ${JSON.stringify(outline, null, 2)}

      Return a valid JSON array of these enriched slide objects. Ensure the output strictly follows this structure.
    `;
    const enrichedSlides = await geminiJson(prompt);
    console.log(`[${projectId}] Content enrichment complete.`);

    // 3. Generate the PPTX file with professional design
    console.log(`[${projectId}] Creating visually rich PPTX file...`);
    const pres = new pptxgen();

    // --- Define Master Slide Layouts (mimicking a professional template) ---
    pres.defineLayout({ name: 'TITLE', width: 10, height: 5.625 });
    pres.defineLayout({ name: 'CONTENT', width: 10, height: 5.625 });
    
    // Title Master
    pres.defineSlideMaster({
      title: "MASTER_TITLE",
      background: { color: "000042" }, // Dark blue background
      objects: [
        { 'rect': { x: 0, y: 4.5, w: 10, h: 1.12, fill: { color: "FFFFFF" } } },
        { 'text': {
            text: "Company Name",
            options: { x: 0.5, y: 2.0, w: 9, h: 1, fontFace: "Georgia", fontSize: 48, color: "FFFFFF", bold: true, align: "center" }
        }},
        { 'text': {
            text: "Pitch Deck Tagline",
            options: { x: 0.5, y: 3.0, w: 9, h: 0.75, fontFace: "Arial", fontSize: 24, color: "F1F1F1", align: "center" }
        }},
      ],
    });
    
    // Content Master
    pres.defineSlideMaster({
      title: "MASTER_CONTENT",
      background: { color: "F1F1F1" }, // Light gray background
      objects: [
        { 'rect': { x: 0, y: 0, w: 10, h: 0.75, fill: { color: "003366" } } },
        { 'text': {
            text: "SLIDE_TITLE",
            options: { x: 0.5, y: 0.1, w: 9, h: 0.6, fontFace: "Georgia", fontSize: 28, color: "FFFFFF", bold: true }
        }},
      ],
    });
    
     // --- Loop and Create Slides ---
    for (const [index, slideData] of enrichedSlides.entries()) {
        const slide = pres.addSlide({ masterName: index === 0 ? "MASTER_TITLE" : "MASTER_CONTENT" });

        if (index === 0) { // Title Slide
            slide.addText(slideData.title, { placeholder: "title" });
            slide.addText(slideData.content[0] || ' ', { placeholder: "body" });
        } else { // Content Slides
            slide.addText(slideData.title, { placeholder: "title" });

            const textOptions: pptxgen.TextPropsOptions = { 
                x: 0.5, y: 1.0, w: 5.5, h: 4.0, 
                fontFace: "Arial", fontSize: 14, 
                color: "333333", bullet: { type: 'bullet', code: '2022' } 
            };
            slide.addText(slideData.content.join('\n'), textOptions);
            
            // Add Visuals: Chart > Diagram > Image
            let visualAdded = false;
            if (slideData.chart_data && slideData.chart_data.labels?.length) {
                slide.addChart(
                    slideData.chart_data.type === 'pie' ? pres.ChartType.pie : pres.ChartType.bar,
                    [{ name: slideData.title, labels: slideData.chart_data.labels, values: slideData.chart_data.values }],
                    { x: 6.5, y: 1.2, w: 3, h: 3, showLegend: true }
                );
                visualAdded = true;
            } 
            
            if (!visualAdded) {
                const imageQuery = slideData.diagram_prompt || slideData.image_query;
                const imageUrl = await getImageUrl(imageQuery);
                if (imageUrl) {
                    slide.addImage({ path: imageUrl, x: 6.5, y: 1.2, w: 3, h: 3 });
                }
            }
        }
    }

    // 4. Generate buffer and upload to Supabase
    const pptxBuffer = await pres.write({ outputType: 'nodebuffer' });
    const filePath = `deck-${projectId}-${Date.now()}.pptx`;

    const { error: uploadError } = await supabase.storage
      .from('pitch-decks')
      .upload(filePath, pptxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
    }
    
    // 5. Get public URL and return to frontend
    const { data: urlData } = supabase.storage.from('pitch-decks').getPublicUrl(filePath);
    
    res.status(200).json({
      slides: enrichedSlides,
      downloadUrl: urlData.publicUrl,
    });

  } catch (error: any) {
    console.error("Error in /api/generate-deck:", error.message);
    res.status(500).json({ error: "Failed to generate deck." });
  }
});

export default router;

