// backend/lib/geminiFlash.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL = "gemini-2.5-flash";
const genAI = new GoogleGenerativeAI( process.env.GEMINI_API_KEY || "");
/**
 * Call Gemini-Flash and return parsed JSON.
 * Strips markdown code-fences if the model wraps its answer.
 */
export async function geminiJson(prompt: string): Promise<any> {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const { response } = await model.generateContent(prompt);
  let text = response.text().trim();

  // ────── remove ```json … `````` … ```
  if (text.startsWith("```")) {
    text = text
      .replace(/^```[^\n]*\n?/, "")       // opening fence
      .replace(/\s*```$/, "");            // closing fence
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Gemini JSON parse failed\n----- RAW TEXT -----\n" + text);
    throw err;        // will be caught in the calling route
  }
}