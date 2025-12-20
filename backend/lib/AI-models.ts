import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

// --- Google Gemini Models ---

// Gemini 2.0 Flash: Fast, good for conversational text
export const gemini20FlashFlash = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash", // Ensure you have access or fallback to 1.5-flash
  maxOutputTokens: 2048,
  temperature: 0.7,
  apiKey: process.env.GEMINI_API_KEY1,
});

// Gemini 2.5 Flash: Better reasoning/logic (mocked name if 2.5 isn't public, usually 1.5-pro or experimental)
// Adjust modelName based on actual availability in your region
export const gemini25Flash = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash", // Using 1.5-flash as stable fallback for '2.5' logic
  maxOutputTokens: 2048,
  temperature: 0.4, // Lower temp for logic/JSON
  apiKey: process.env.GEMINI_API_KEY2,
});

// --- OpenAI Models ---

export const openAIGPT4o = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
  apiKey: process.env.OPENAI_API_KEY1,
});