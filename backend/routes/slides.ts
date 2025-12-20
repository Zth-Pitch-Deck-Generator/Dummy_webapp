// backend/routes/slides.ts
import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";

const router = Router();

const updateSlideSchema = z.object({
  html_content: z.string(),
});

// Endpoint to update a specific slide's HTML content
router.put("/:slideId", async (req, res) => {
  try {
    const { slideId } = req.params;
    const { html_content } = updateSlideSchema.parse(req.body);

    const { data, error } = await supabase
      .from('deck_slides')
      .update({ html_content, updated_at: new Date().toISOString() })
      .eq('id', slideId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update slide: ${error.message}`);
    
    res.status(200).json(data);
  } catch (error: any) {
    console.error(`Error in PUT /api/slides/${req.params.slideId}:`, error.message);
    res.status(500).json({ error: "Failed to update slide." });
  }
});

export default router;