import { Router, Request, Response } from "express";
import { supabase } from "../supabase.js";
import { geminiJson } from "../lib/geminiFlash.js";
import { z } from "zod";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      sector: z.string(),
      deckType: z.string(),
      projectId: z.string().uuid(),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return void res.status(400).json({ error: "Invalid query parameters" });
    }

    const { sector, deckType, projectId } = parsed.data;

    const prompt = `
      Based on the following project details, recommend a presentation template slug.
      Sector: ${sector}
      Deck Type: ${deckType}

      Available template slugs are: "modern", "modern-tech", "business-professional", "creative-startup", "minimalist", "bold".

      Return ONLY a single JSON object with the key "decktypeSlug".
    `;

    const recommendation = await geminiJson(prompt);

    // Store the recommended template in the projects table
    const { error } = await supabase
      .from("projects")
      .update({ template: recommendation.decktypeSlug })
      .eq("id", projectId);

    if (error) {
      console.error("Error updating project with template:", error);
      // You might want to handle this error more gracefully
    }

    res.json(recommendation);
  } catch (e: any) {
    console.error("Error in /api/template:", e);
    res.status(500).json({ error: "Failed to get template recommendation." });
  }
});

export default router;