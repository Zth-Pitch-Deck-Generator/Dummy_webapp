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

  let browser;
  try {
    const { data: slides, error: fetchError } = await supabase
      .from('deck_slides')
      .select('html_content')
      .eq('project_id', projectId)
      .order('slide_number');

    if (fetchError || !slides || slides.length === 0) {
      throw new Error("No slides found for this project.");
    }

    console.log(`[${projectId}] Launching Puppeteer...`);
    browser = await puppeteer.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 }); 

    const imageBuffers: Buffer[] = [];

    console.log(`[${projectId}] Taking screenshots of ${slides.length} slides...`);
    for (let i = 0; i < slides.length; i++) {
      const fullHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body, html { 
                margin: 0; padding: 0; 
                width: 1280px; height: 720px; 
                overflow: hidden; 
                background-color: white;
              }
              #container {
                width: 100%; height: 100%;
                display: flex; flex-direction: column;
              }
            </style>
          </head>
          <body>
            <div id="container">
              ${slides[i].html_content}
            </div>
          </body>
        </html>
      `;

      await page.setContent(fullHtml, { waitUntil: 'load' });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const screenshot = await page.screenshot({ type: 'png' });
      imageBuffers.push(Buffer.from(screenshot));
      console.log(`[${projectId}] Slide ${i + 1} captured.`);
    }

    await browser.close();
    browser = null; 

    console.log(`[${projectId}] Building PPTX file...`);
    
    // --- THE ESM / CJS FIX ---
    // Extract the constructor properly depending on how the module was resolved
    const PptxGenConstructor = typeof PptxGenJS === 'function' ? PptxGenJS : (PptxGenJS as any).default;
    const pres = new PptxGenConstructor();
    // -------------------------

    pres.layout = 'LAYOUT_16x9';

    for (const imageBuffer of imageBuffers) {
      const slide = pres.addSlide();
      slide.addImage({ 
        data: `data:image/png;base64,${imageBuffer.toString('base64')}`, 
        x: 0, y: 0, w: '100%', h: '100%' 
      });
    }

    const pptxBuffer = await pres.write({ outputType: 'nodebuffer' }) as Buffer;
    const filePath = `deck-${projectId}-${Date.now()}.pptx`;

    console.log(`[${projectId}] Uploading PPTX to Supabase...`);
    const { error: uploadError } = await supabase.storage
      .from('pitch-decks')
      .upload(filePath, pptxBuffer, { 
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        upsert: true
      });
    
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('pitch-decks').getPublicUrl(filePath);

    console.log(`[${projectId}] Saving URL to database...`);
    await supabase
        .from('projects')
        .update({ generated_deck_url: urlData.publicUrl })
        .eq('id', projectId);

    console.log(`[${projectId}] Success! PPTX is ready.`);
    res.status(200).json({ downloadUrl: urlData.publicUrl });

  } catch (error: any) {
    console.error(`[${projectId}] Error compiling deck:`, error);
    if (browser) await browser.close();
    res.status(500).json({ error: error.message || "Failed to compile pitch deck." });
  }
});

export default router;