import pptxParser from "pptx-parser";

/**
 * Extracts text per slide from a PPTX file path.
 * @param {string} filePath - Path from multer (req.file.path)
 * @param {number} maxSlides - Max slide limit
 * @returns {Promise<{numSlides: number, chunks: Array<{slide: number, text: string}>, allText: string}>}
 */
export async function extractPptxText(filePath, maxSlides = 15) {
  const slides = await pptxParser.parse(filePath);
  const numSlides = slides.length;
  if (numSlides > maxSlides) {
    throw new Error(`PPTX has ${numSlides} slides, limit is ${maxSlides}`);
  }

  const chunks = slides.map((slide, idx) => ({
    slide: idx + 1,
    text: (slide.text || "").trim()
  })).filter(chunk => !!chunk.text);

  return {
    numSlides,
    chunks,
    allText: chunks.map(ch => ch.text).join("\n")
  };
}
