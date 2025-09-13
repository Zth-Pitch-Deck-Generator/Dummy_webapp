// backend/routes/generate-deck.ts
import { Router } from "express";
import { z } from "zod";
import { createRequire } from "module";
import { geminiJson } from "../lib/geminiFlash.js"; // Note: This might need updating to support multimodal (PDF) inputs
import { supabase } from "../supabase.js";
import puppeteer from 'puppeteer'; // Import Puppeteer
import fs from 'fs/promises'; // To read the PDF file
import path from 'path';

// --- Template Configurations ---
// Updated to include the path to the reference PDF for each template.
const templates: Record<string, any> = {
  'technology': {
    name: 'Technology Pitch Deck',
    pdfPath: 'public/Technology Pitch Deck Template.pdf',
    promptFragment: "a sleek, modern, and professional design suitable for a technology company. Use clean lines, sans-serif fonts, and a professional color palette (blues, dark grays, whites).",
  },
  'startup': {
    name: 'Startup Pitch Deck',
    pdfPath: 'public/Startup Pitch Deck Template.pdf',
    promptFragment: "a clean, bold, and minimalist design perfect for an early-stage startup seeking investment. Focus on clarity and strong typography.",
  },
  'ecommerce': {
    name: 'E-commerce Pitch Deck',
    pdfPath: 'public/E-commerce Pitch Deck Template.pdf',
    promptFragment: "a vibrant, engaging, and visual design for an e-commerce brand. Use high-quality product imagery and a bright, appealing color scheme.",
  },
  // Add other templates here...
  'default': {
    name: 'General Pitch Deck',
    pdfPath: 'public/General Pitch Deck Template.pdf',
    promptFragment: "a versatile and classic business presentation style. It should be clear, professional, and easily adaptable.",
  }
};

const require = createRequire(import.meta.url);
const PptxGenJS = require('pptxgenjs');

const router = Router();

const bodySchema = z.object({
  projectId: z.string().uuid(),
  templateSlug: z.string(),
});

router.post("/", async (req, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }
    const { projectId, templateSlug } = parsed.data;

    const template = templates[templateSlug] || templates['default'];
    console.log(`[${projectId}] Using template: ${template.name}`);

    const { data: outlineData, error: outlineError } = await supabase
      .from('outlines')
      .select('outline_json')
      .eq('project_id', projectId)
      .single();

    if (outlineError || !outlineData) {
      throw new Error(`Failed to fetch outline for project ${projectId}: ${outlineError?.message}`);
    }
    const outline = outlineData.outline_json;

    // --- 1. Multimodal AI Content & Design Generation ---
    // In a real implementation, you would pass the PDF file buffer to a multimodal-capable Gemini function.
    // For now, we describe the style in the prompt as a stand-in.
    console.log(`[${projectId}] Starting AI content and HTML/CSS generation...`);
    const prompt = `
      You are a world-class presentation designer and content strategist.
      Your task is to generate a pitch deck based on a user's outline and inspired by a reference PDF template.

      **Style Reference**: The design should be inspired by the provided template, which has ${template.promptFragment}. Do NOT copy it exactly, but use it as a guide for layout, typography, and color.

      **User's Outline**:
      ${JSON.stringify(outline, null, 2)}

      **Your Task**:
      For each slide in the outline, generate a JSON object containing a single key "slideHtml".
      The value of "slideHtml" must be a string containing a single, self-contained HTML file.
      This HTML MUST include all necessary CSS within a <style> tag.
      The HTML should be structured for a 16:9 aspect ratio (e.g., a container div of 1280px by 720px).
      Use placeholder images from a service like Pexels or Unsplash if needed.

      Return a valid JSON array of these objects, e.g., [{ "slideHtml": "<html>...</html>" }, { "slideHtml": "<html>...</html>" }].
    `;

    // This function call assumes `geminiJson` can handle a large text-only prompt.
    // A true multimodal implementation would pass the PDF file itself.
    const generatedSlides: { slideHtml: string }[] = await geminiJson(prompt);
    console.log(`[${projectId}] HTML/CSS for ${generatedSlides.length} slides generated.`);


    // --- 2. Convert HTML/CSS to Images using Puppeteer ---
    console.log(`[${projectId}] Converting HTML slides to images...`);
    const browser = await puppeteer.launch();
    const slideImageBuffers: Buffer[] = [];

    for (const slide of generatedSlides) {
      const page = await browser.newPage();
      // Set viewport to a standard 16:9 presentation size
      await page.setViewport({ width: 1280, height: 720 });
      await page.setContent(slide.slideHtml, { waitUntil: 'networkidle0' });
      const screenshot = await page.screenshot({ type: 'png' });
      const imageBuffer = Buffer.from(screenshot); // Convert Uint8Array to Buffer
      slideImageBuffers.push(imageBuffer);
      await page.close();
    }
    await browser.close();
    console.log(`[${projectId}] Image conversion complete.`);


    // --- 3. Assemble Images into a PPTX ---
    console.log(`[${projectId}] Assembling PPTX file...`);
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';

    for (const imageBuffer of slideImageBuffers) {
      const slide = pres.addSlide();
      // Add the screenshot image, covering the whole slide.
      slide.addImage({
        data: `data:image/png;base64,${imageBuffer.toString('base64')}`,
        x: 0,
        y: 0,
        w: '100%',
        h: '100%',
      });
    }

    // --- 4. Upload and Finalize ---
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
      slides: generatedSlides.map((s, i) => ({ title: `Slide ${i + 1}`, content: "HTML content generated" })), // Return a simplified slide structure
      downloadUrl: urlData.publicUrl,
    });

  } catch (error: any) {
    console.error("Error in /api/generate-deck:", error.message);
    res.status(500).json({ error: "Failed to generate deck." });
  }
});

export default router;