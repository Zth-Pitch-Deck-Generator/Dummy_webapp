// backend/routes/generate-deck.ts
import { Router } from "express";
import { z } from "zod";
import PptxGenJS from 'pptxgenjs'; // Import statically at the top
import { geminiJson } from "../lib/geminiFlash.js";
import { supabase } from "../supabase.js";
import fetch from 'node-fetch';

const router = Router();

const bodySchema = z.object({
  projectId: z.string().uuid(),
  templateSlug: z.string(),
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
    const { projectId } = parsed.data;

    const { data: outlineData, error: outlineError } = await supabase
      .from('outlines')
      .select('outline_json')
      .eq('project_id', projectId)
      .single();

    if (outlineError || !outlineData) {
      throw new Error(`Failed to fetch outline for project ${projectId}: ${outlineError?.message}`);
    }
    const outline = outlineData.outline_json;

    console.log(`[${projectId}] Starting AI content enrichment (Airbnb Style)...`);
    const prompt = `
      You are a pitch deck consultant creating a presentation in the style of the famous original Airbnb pitch deck.
      Based on the user's outline, enrich each slide with visual and data-driven elements that match this clean, iconic style.
      For each slide, return a JSON object with:
      - "title": The original slide title.
      - "content": The original bullet points.
      - "image_query": A simple, clean 2-3 word search query for a high-quality stock photo (e.g., "friendly host", "city skyline", "simple graph").
      - "chart_data": For data-heavy slides (Traction, Market Size), provide a sample chart object: { "type": "bar", "labels": string[], "values": number[] }. Otherwise, MUST be null.

      This is the user's approved outline:
      ${JSON.stringify(outline, null, 2)}

      Return a valid JSON array of these enriched slide objects.
    `;
    const enrichedSlides = await geminiJson(prompt);
    console.log(`[${projectId}] Content enrichment complete.`);

    console.log(`[${projectId}] Creating Airbnb-style PPTX file...`);

    // Use the imported PptxGenJS directly
    const pres = new PptxGenJS();

    // --- Airbnb Template Color Palette ---
    const AIRBNB_PINK = "FF5A5F";
    const AIRBNB_GRAY_DARK = "484848";
    const AIRBNB_GRAY_LIGHT = "767676";
    const AIRBNB_BACKGROUND = "F7F7F7";

    // --- Airbnb Master Slide Layouts ---
    pres.defineSlideMaster({
      title: "MASTER_TITLE_AIRBNB",
      background: { color: AIRBNB_BACKGROUND },
      objects: [
        { text: {
            text: "Company Name",
            options: { placeholder: "title", x: 0.5, y: 2.2, w: 9, h: 1, fontFace: "Helvetica", fontSize: 42, color: AIRBNB_GRAY_DARK, bold: true, align: "center" }
        }},
        { text: {
            text: "Tagline or short description",
            options: { placeholder: "body", x: 0.5, y: 3.2, w: 9, h: 0.75, fontFace: "Helvetica", fontSize: 18, color: AIRBNB_GRAY_LIGHT, align: "center" }
        }},
      ],
    });

    pres.defineSlideMaster({
      title: "MASTER_CONTENT_AIRBNB",
      background: { color: AIRBNB_BACKGROUND },
      objects: [
        { text: {
            text: "SLIDE_TITLE",
            options: { placeholder: "title", x: 0.5, y: 0.2, w: 9, h: 0.6, fontFace: "Helvetica", fontSize: 18, color: AIRBNB_GRAY_LIGHT, bold: true }
        }},
        { 'placeholder': { options: { name: "body", type: "body", x: 0.5, y: 1.0, w: 8.5, h: 4.0 }, text: 'Content Placeholder'}},
      ],
    });

    for (const [index, slideData] of enrichedSlides.entries()) {
        const slide = pres.addSlide({ masterName: index === 0 ? "MASTER_TITLE_AIRBNB" : "MASTER_CONTENT_AIRBNB" });

        slide.addText(slideData.title, { placeholder: "title" });

        if (index > 0) {
             slide.addText(slideData.content.join('\n'), {
                placeholder: "body",
                fontFace: "Helvetica",
                fontSize: 24,
                color: AIRBNB_GRAY_DARK,
                bullet: { indent: 30 },
                lineSpacing: 36
            });
        } else {
            slide.addText(slideData.content[0] || ' ', { placeholder: "body" });
        }
    }

    const pptxBuffer = await pres.write({ outputType: 'nodebuffer' });
    const filePath = `deck-${projectId}-${Date.now()}.pptx`;

    const { error: uploadError } = await supabase.storage
      .from('pitch-decks')
      .upload(filePath, pptxBuffer as ArrayBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
    }

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