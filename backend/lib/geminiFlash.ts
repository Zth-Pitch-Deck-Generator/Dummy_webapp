import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * A wrapper for the Gemini API that returns a JSON object.
 * @param prompt The prompt to send to the AI.
 * @returns A JSON object.
 */
export async function geminiJson(prompt: string) {
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const rawText = response.text().replace(/^```json\s*|```\s*$/g, "");
    return JSON.parse(rawText);
  } catch (e) {
    console.error("Gemini JSON parse failed");
    const result = await model.generateContent(prompt);
    const response = result.response;
    console.log("----- RAW TEXT -----");
    console.log(response.text());
    throw e;
  }
}

/**
 * A new function that returns a plain text string from the Gemini API.
 * @param prompt The prompt to send to the AI.
 * @returns A string of text.
 */
export async function geminiText(prompt: string): Promise<string> {
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (e) {
    console.error("Gemini text generation failed:", e);
    return "Sorry, I encountered an error while generating a response.";
  }
}