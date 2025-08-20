// backend/routes/generate-deck.ts
import { Router } from "express";
import { z } from "zod";
import { geminiJson } from "../lib/geminiFlash.js";
import pptxgen from "pptxgenjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const slideSchema = z.object({
  title: z.string(),
  bullet_points: z.array(z.string()),
});

const bodySchema = z.object({
  outline: z.array(slideSchema),
});

// --- Pexels Image Fetching Function ---
const getImageUrl = async (query: string): Promise<string | null> => {
    if (!process.env.PEXELS_API_KEY || !query) return null;
    try {
        const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
            headers: { Authorization: process.env.PEXELS_API_KEY }
        });
        if (!response.ok) throw new Error('Pexels API request failed');
        const data: any = await response.json();
        return data.photos[0]?.src.medium || null;
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
    const { outline } = parsed.data;
    const jobId = `deck_${crypto.randomUUID()}`;

    // Step 1: Enhanced prompt to get content, image ideas, and chart data
    console.log(`[${jobId}] Starting content generation...`);
    const prompt = `
      You are an expert pitch deck writer. Based on the provided slide outline, generate the complete content for a presentation.
      For each slide, provide:
      1. A "title".
      2. "content" as an array of concise bullet points (max 15 words each).
      3. An "image_prompt": a simple 2-3 word search query for a stock photo (e.g., "team working", "data graph", "happy customer").
      4. "chart_data": If the slide is about data (e.g., Traction, Market Size), provide a sample 'chart' object. Otherwise, make it null. The chart object should have a 'type' (bar or pie), an array of 'labels', and an array of 'values'. Example: { "type": "bar", "labels": ["Q1", "Q2", "Q3"], "values": [10, 25, 45] }.

      OUTLINE:
      ${JSON.stringify(outline, null, 2)}

      Return a valid JSON array of these slide objects. Respond ONLY with the JSON array.
    `;
    const generatedSlides = await geminiJson(prompt);
    console.log(`[${jobId}] Content generated successfully.`);

    // Step 2: Generate the PPTX file with advanced features
    console.log(`[${jobId}] Creating enhanced PPTX file...`);
    const pres = new pptxgen();

    // --- Define Master Slide Layouts ---
    pres.defineSlideMaster({
      title: "TITLE_SLIDE",
      background: { color: "F1F1F1" },
      objects: [
        { text: { text: "Company Title", options: { x: 0.5, y: 2.5, w: '90%', fontSize: 42, fontFace: "Georgia", color: "003366" } } },
        { text: { text: "Tagline", options: { x: 0.5, y: 3.5, w: '90%', fontSize: 24, fontFace: "Arial", color: "4F4F4F" } } },
      ],
    });

    pres.defineSlideMaster({
      title: "CONTENT_SLIDE",
      background: { color: "FFFFFF" },
      objects: [
        { text: { text: "Slide Title", options: { x: 0.5, y: 0.2, w: '90%', h: 0.75, fontSize: 32, fontFace: "Georgia", color: "003366" } } },
        { placeholder: { options: { name: "body", type: "body", x: 0.5, y: 1.2, w: '50%', h: '75%' }, text: 'Content Placeholder'}},
      ],
    });

    // --- Create Slides using Master Layouts and Generated Content ---
    for (const [index, slideContent] of generatedSlides.entries()) {
      const slideLayout = index === 0 ? "TITLE_SLIDE" : "CONTENT_SLIDE";
      const slide = pres.addSlide({ masterName: slideLayout });

      slide.addText(slideContent.title, { placeholder: index === 0 ? "title" : "title" });
      
      if (index > 0) {
        // Add text content
        slide.addText(slideContent.content.join('\n'), { 
            placeholder: "body", 
            fontFace: "Arial", 
            fontSize: 16, 
            bullet: true 
        });

        // Add Image
        const imageUrl = await getImageUrl(slideContent.image_prompt);
        if (imageUrl) {
            const imageBuffer = await fetch(imageUrl).then(res => res.buffer());
            const imageBase64 = imageBuffer.toString('base64');
            slide.addImage({ data: `data:image/png;base64,${imageBase64}`, x: 6, y: 1.5, w: 3.5, h: 3.5 });
        }

        // Add Chart
        if (slideContent.chart_data && slideContent.chart_data.labels) {
            slide.addChart(
                slideContent.chart_data.type === 'pie' ? pres.ChartType.pie : pres.ChartType.bar,
                [{ name: "Chart Data", labels: slideContent.chart_data.labels, values: slideContent.chart_data.values }],
                { x: 6, y: 1.5, w: 3.5, h: 3.5 }
            );
        }
      } else {
        // For title slide, add tagline
        slide.addText(slideContent.content[0] || '', { placeholder: "body" });
      }
    }
    
    // Step 3: Save and return the file
    const tempDir = path.join(__dirname, '..', '..', 'public', 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    const filePath = path.join(tempDir, `${jobId}.pptx`);
    await pres.writeFile({ fileName: filePath });
    console.log(`[${jobId}] PPTX file saved to ${filePath}`);

    const downloadUrl = `/temp/${jobId}.pptx`;

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
