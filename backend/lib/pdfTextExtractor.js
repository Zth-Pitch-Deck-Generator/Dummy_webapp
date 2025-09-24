import pdfParse from "pdf-parse";

/**
 * Extracts text per page from a PDF Buffer.
 * @param {Buffer} fileBuffer - Buffer from upload (req.file.buffer)
 * @param {number} maxPages - Max page limit
 * @returns {Promise<{numPages: number, chunks: Array<{page: number, text: string}>, fullText: string}>}
 */
export async function extractPdfText(fileBuffer, maxPages = 15) {
  const data = await pdfParse(fileBuffer);

  // Split by form feed (\f) or (optional) by page pattern, crude fallback for multiline page breaks
  const rawPages = data.text.split(/\f|\n(?:\s*\d+\s*)?\n/g);

  if (data.numpages > maxPages) {
    throw new Error(`PDF has ${data.numpages} pages, limit is ${maxPages}`);
  }

  const chunks = rawPages.map((text, idx) => ({
    page: idx + 1,
    text: text.trim()
  })).filter(chunk => !!chunk.text);

  return {
    numPages: data.numpages,
    chunks,
    fullText: data.text
  };
}
