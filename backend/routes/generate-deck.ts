// backend/routes/generate-deck.ts
import { Router } from "express";
import { z } from "zod";
import { geminiJson } from "../lib/geminiFlash.js";
import pptxgen from "pptxgenjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const router = Router();

// Helper to get the correct directory path in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const slideSchema = z.object({
  title: z.string(),
  bullet_points: z.array(z.string()),
  data_needed: z.array(z.string()),
});

const bodySchema = z.object({
  outline: z.array(slideSchema),
  templateSlug: z.string(),
});

router.post("/", async (req, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { outline, templateSlug } = parsed.data;
    const
 
jobId = `deck_${crypto.randomUUID()}`;

    // Step 1: Generate slide content with Gemini
    console.log(`[${jobId}] Starting content generation...`);
    const prompt = `
      You are an expert pitch deck writer. Based on the provided slide outline for a "${templateSlug}" template, generate the complete content for a presentation.
      OUTLINE:
      ${JSON.stringify(outline, null, 2)}
      INSTRUCTIONS:
      1. For each slide, expand on the "bullet_points" to create detailed, compelling content.
      2. Each bullet point generated must be a maximum of 20 words.
      3. Return a valid JSON array of slide objects with this schema: { "title": string, "content": string[] }
      4. Respond ONLY with the JSON array, no markdown or explanations.
    `;
    const generatedSlides = await geminiJson(prompt);
    console.log(`[${jobId}] Content generated successfully.`);

    // Step 2: Generate the PPTX file
    console.log(`[${jobId}] Creating PPTX file...`);
    const pres = new pptxgen();

    // Use the ZTH.pdf as a guide for slide layouts
    generatedSlides.forEach((slideContent: { title: string; content: string[] }) => {
      const slide = pres.addSlide();
      slide.addText(slideContent.title, { x: 0.5, y: 0.25, fontSize: 32, bold: true, w: '90%' });
      slide.addText(slideContent.content.join('\n\n'), { x: 0.5, y: 1.5, fontSize: 18, w: '90%', h: '75%', bullet: true });
    });
    
    // Step 3: Save the file to a temporary public directory
    const tempDir = path.join(__dirname, '..', '..', 'public', 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    const filePath = path.join(tempDir, `${jobId}.pptx`);
    await pres.writeFile({ fileName: filePath });
    console.log(`[${jobId}] PPTX file saved to ${filePath}`);

    // Step 4: Create a public URL for the file
    const downloadUrl = `/temp/${jobId}.pptx`;

    // Step 5: Return the generated content and download URL
    res.status(200).json({
      slides: generatedSlides,
      downloadUrl: downloadUrl,
    });

  } catch (error: any) {
    console.error("Error in /api/generate-deck:", error);
    res.status(500).json({ error: "Failed to generate deck." });
  }
});

export default router;
