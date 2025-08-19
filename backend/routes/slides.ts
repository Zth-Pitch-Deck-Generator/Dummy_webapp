// backend/routes/slides.ts
import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";
import { geminiJson } from "../lib/geminiFlash.js";

const router = Router();

// --- Mock Job Queue and Storage ---
// In a real application, you would use Redis/BullMQ and a database (like Supabase)
// to manage job state. For this example, we'll simulate it in memory.
const jobStore = new Map<string, { status: string; url?: string; slides?: any[] }>();

const slideSchema = z.object({
  title: z.string(),
  bullet_points: z.array(z.string()),
  data_needed: z.array(z.string()),
});

const bodySchema = z.object({
  projectId: z.string().uuid(),
  outline: z.array(slideSchema),
  templateSlug: z.string(),
});

/**
 * POST /api/slides
 * Kicks off the slide content generation process.
 */
router.post("/", async (req, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return void res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    }

    const { outline, templateSlug } = parsed.data;
    const jobId = `job_${crypto.randomUUID()}`;

    jobStore.set(jobId, { status: "processing" });

    // Asynchronously generate content without blocking the response
    generateSlideContent(jobId, outline, templateSlug);

    res.status(202).json({ jobId });

  } catch (error: any) {
    console.error("Error starting slide generation job:", error);
    res.status(500).json({ error: "Failed to start slide generation." });
  }
});

/**
 * GET /api/deck/:jobId/status
 * Checks the status of a slide generation job.
 */
router.get("/deck/:jobId/status", (req, res) => {
  const { jobId } = req.params;
  const job = jobStore.get(jobId);

  if (!job) {
    return void res.status(404).json({ error: "Job not found" });
  }

  res.status(200).json(job);
});


async function generateSlideContent(jobId: string, outline: z.infer<typeof slideSchema>[], templateSlug: string) {
  try {
    console.log(`[${jobId}] Starting content generation with Gemini 1.5 Pro...`);

    const prompt = `
      You are an expert pitch deck writer. Based on the provided slide outline from the ZTH template, generate the complete content for a presentation.
      The template is "${templateSlug}".

      OUTLINE:
      ${JSON.stringify(outline, null, 2)}

      INSTRUCTIONS:
      1. For each slide in the outline, expand the "bullet_points" into detailed, compelling content.
      2. Each bullet point you generate must be a maximum of 20 words. This is a strict limit.
      3. The final output must be a valid JSON array of slide objects, following this exact schema for each object:
          {
            "title": "The Original Slide Title",
            "content": [
              "Expanded bullet point 1 (max 20 words).",
              "Expanded bullet point 2 (max 20 words).",
              "..."
            ]
          }
      4. Do not include any explanations or markdown formatting. Respond ONLY with the JSON array.
    `;

    const generatedSlides = await geminiJson(prompt);

    console.log(`[${jobId}] Content generated successfully.`);
    
    // This simulates the handoff to the Python worker
    simulatePptxGeneration(jobId, generatedSlides);

  } catch (error) {
    console.error(`[${jobId}] Error during content generation:`, error);
    jobStore.set(jobId, { status: "failed" });
  }
}

function simulatePptxGeneration(jobId: string, slides: any[]) {
    console.log(`[${jobId}] Simulating Python PPTX worker...`);

    setTimeout(() => {
        console.log(`[${jobId}] PPTX generation complete. Uploading to cloud storage...`);
        const downloadUrl = `https://your-cloud-storage.com/decks/${jobId}.pptx`;
        jobStore.set(jobId, { status: "complete", url: downloadUrl, slides });
        console.log(`[${jobId}] Job complete. Download URL: ${downloadUrl}`);
    }, 5000); // 5-second delay to simulate work
}

export default router;
