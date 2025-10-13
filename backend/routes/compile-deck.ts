// backend/routes/compile-deck.ts
import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";
import puppeteer from 'puppeteer';
import PptxGenJS from 'pptxgenjs';

const router = Router();

const bodySchema = z.object({
  projectId: z.string().uuid(),
});

router.post("/", async (req, res) => {
  const { projectId } = bodySchema.parse(req.body);
  console.log(`[${projectId}] Starting PPTX compilation...`);

  try {
    const { data: slides, error: fetchError } = await supabase
      .from('deck_slides')
      .select('html_content')
      .eq('project_id', projectId)
      .order('slide_number');

    if (fetchError || !slides || slides.length === 0) {
      throw new Error("No slides found for this project.");
    }

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const imageBuffers: Buffer[] = [];

    for (const slide of slides) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      await page.setContent(slide.html_content, { waitUntil: 'networkidle0' });
      const screenshot = await page.screenshot({ type: 'png' });
      imageBuffers.push(Buffer.from(screenshot));
      await page.close();
    }
    await browser.close();

    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';

    for (const imageBuffer of imageBuffers) {
      const slide = pres.addSlide();
      slide.addImage({ data: `data:image/png;base64,${imageBuffer.toString('base64')}`, x: 0, y: 0, w: '100%', h: '100%' });
    }

    const pptxBuffer = await pres.write({ outputType: 'nodebuffer' });
    const filePath = `deck-${projectId}-${Date.now()}.pptx`;

    const { error: uploadError } = await supabase.storage
      .from('pitch-decks')
      .upload(filePath, pptxBuffer as ArrayBuffer, { contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('pitch-decks').getPublicUrl(filePath);

    // Update the projects table with the final URL
    const { error: updateError } = await supabase
        .from('projects')
        .update({ generated_deck_url: urlData.publicUrl })
        .eq('id', projectId);

    if (updateError) {
        console.warn(`[${projectId}] Failed to save generated_deck_url: ${updateError.message}`);
    }

    res.status(200).json({ downloadUrl: urlData.publicUrl });

  } catch (error: any) {
    console.error(`[${projectId}] Error compiling deck:`, error.message);
    res.status(500).json({ error: "Failed to compile pitch deck." });
  }
});

export default router;