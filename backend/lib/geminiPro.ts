import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY || "";
if (!geminiApiKey) throw new Error("Missing Gemini API Key!");

const genAI = new GoogleGenerativeAI(geminiApiKey);

/**
 * Generates HTML+CSS slides using Gemini 2.0 Pro based on design and outline.
 * The function guarantees to only return a valid JSON array of slides.
 */
export async function geminiProHtmlSlides({
  designDescription,
  outline,
  productDescription,
}: {
  designDescription: string;
  outline: any;
  productDescription: string;
}) {
  const prompt = `
You are an advanced UI/UX engine. Given the design description and outline, generate self-contained HTML+CSS slides.

Design Description:
${designDescription}

Product: ${productDescription}

Outline:
${JSON.stringify(outline, null, 2)}

Instructions:
- For each slide, output a JSON object with keys:
    - "title": Slide title
    - "html_content": Complete HTML (CSS inside <style> tag, 16:9 aspect ratio, highly visual and responsive design)
- PERSONALIZE all visuals and content to match the product/service provided.
- Make sure that the overall style strictly matches the design description.
- IMPORTANT: Output ONLY a valid JSON array, no markdown, no commentary, no explanation, no \`\`\` or backticks.

Example:
[
  {
    "title": "Welcome",
    "html_content": "<html>...<style>...</style>...</html>"
  },
  {
    "title": "Problem",
    "html_content": "<html>...<style>...</style>...</html>"
  }
]
`;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-pro" });
  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Helper: extract JSON array even if there is any leading explanation or other text
  const extractJsonArray = (str: string) => {
    const first = str.indexOf("[");
    const last = str.lastIndexOf("]");
    if (first >= 0 && last >= 0 && last > first) {
      return str.substring(first, last + 1);
    }
    throw new Error("No JSON array found in Gemini output");
  };

  try {
    let slides: unknown;
    try {
      // Try the direct parse first
      slides = JSON.parse(response);
    } catch {
      // If that fails, try to extract just the JSON part
      slides = JSON.parse(extractJsonArray(response));
    }
    if (!Array.isArray(slides)) throw new Error("Model output is not an array");
    return slides;
  } catch (err) {
    throw new Error(
      `Could not parse Gemini Pro output: ${err instanceof Error ? err.message : String(err)}\nRaw output:\n${response}`
    );
  }
}
