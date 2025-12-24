// backend/lib/aiAgent.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser, JsonOutputParser } from "@langchain/core/output_parsers";
import "dotenv/config";

// --- 1. MODEL CONFIGURATION ---

// Gemini 2.0 Flash: For fast, conversational text AND JSON (SWOT)
const gemini20Flash = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  maxOutputTokens: 2048,
  temperature: 0.7,
  apiKey: process.env.GEMINI_API_KEY1,
});

// Gemini 2.5 Flash: For reasoning (Validation, Bridge Questions, MCQs)
const gemini25Flash = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash", // Or 1.5-pro if 2.5 is unavailable
  maxOutputTokens: 2048,
  temperature: 0.3, // Low temperature for strict validation
  apiKey: process.env.GEMINI_API_KEY2,
});

// OpenAI GPT-4o: For Outline generation
const openai = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.7,
  apiKey: process.env.OPENAI_API_KEY1,
});

/* ------------------------------------------------------------------
   2. AGENT FUNCTIONS
   ------------------------------------------------------------------ */

export interface ValidationResult {
  isValid: boolean;
  feedback?: string;
}

// --- NEW: Strict Relevance Validation ---
export async function validateAnswerRelevance(
  question: string, 
  answer: string, 
  context: string = ""
): Promise<ValidationResult> {
  const prompt = PromptTemplate.fromTemplate(`
    You are a strict data entry validator for a startup pitch deck builder.
    
    Context about the startup (if available):
    {context}

    Question asked to founder: "{question}"
    Founder's Answer: "{answer}"

    Task: determine if the answer is RELEVANT and APPROPRIATE.
    
    Rules:
    1. If the answer is gibberish, spam, or completely unrelated to the question, mark isValid: false.
    2. If the answer is "I don't know" or "Not sure", mark isValid: true (we handle this logic elsewhere).
    3. If the answer is too short to be meaningful (e.g., "adsf"), mark isValid: false.
    4. If the answer contradicts the Context significantly (e.g., Context says "Bakery", Answer says "We build rockets"), mark isValid: false.
    5. Otherwise, mark isValid: true.

    Return strictly valid JSON:
    {{
      "isValid": boolean,
      "feedback": "Short polite message explaining why it was rejected (only if isValid is false)"
    }}
  `);

  const chain = prompt.pipe(gemini25Flash).pipe(new JsonOutputParser<ValidationResult>());

  try {
    const result = await chain.invoke({ question, answer, context });
    return result;
  } catch (error) {
    console.error("Validation Error:", error);
    // Fail safe: assume valid to avoid blocking user on API errors
    return { isValid: true };
  }
}

// --- Existing: Generic JSON Generator ---
export async function geminiJson(promptText: string): Promise<any> {
  const prompt = PromptTemplate.fromTemplate(`
    {promptText}
    Return ONLY valid JSON.
  `);
  const chain = prompt.pipe(gemini20Flash).pipe(new JsonOutputParser());
  return await chain.invoke({ promptText });
}

// --- Existing: Enhance Question ---
export async function enhanceQuestion(originalQuestion: string, projectData: any): Promise<string> {
  const prompt = PromptTemplate.fromTemplate(`
    Refine this question for a {stage} stage {industry} startup.
    Original Question: "{question}"
    Rules: Keep it conversational but direct (max 20 words). No formatting.
    Return ONLY the plain text string.
  `);

  const chain = prompt.pipe(gemini20Flash).pipe(new StringOutputParser());
  return (await chain.invoke({ 
    question: originalQuestion, 
    stage: projectData.stage || "seed", 
    industry: projectData.industry || "technology" 
  })).trim();
}

// --- Existing: Generate Options ---
export async function generateDynamicOptions(question: string, projectData: any): Promise<string[]> {
  const prompt = PromptTemplate.fromTemplate(`
    Generate 4 simple multiple-choice options for: "{question}"
    Context: {industry}, {stage}.
    Rules: No markdown. Short. ALWAYS include "Other" as last option.
    Return JSON array of strings.
  `);
  const chain = prompt.pipe(gemini25Flash).pipe(new JsonOutputParser<string[]>());
  try {
    return await chain.invoke({ 
      question, 
      stage: projectData.stage || "seed", 
      industry: projectData.industry || "technology" 
    });
  } catch {
    return ["Yes", "No", "Other"];
  }
}

interface BridgeQuestionOutput {
  question: string;
  choices: string[];
}

// --- Existing: Bridge Question ---
export async function generateBridgeQuestion(originalQuestion: string, projectData: any): Promise<BridgeQuestionOutput> {
  const prompt = PromptTemplate.fromTemplate(`
    User said "I don't know" to: "{question}".
    Create a simpler concept check question.
    Return JSON: {{ "question": "...", "choices": ["..."] }}
  `);
  const chain = prompt.pipe(gemini25Flash).pipe(new JsonOutputParser<BridgeQuestionOutput>());
  try {
    return await chain.invoke({ 
      question: originalQuestion, 
      stage: projectData.stage || "seed",
      industry: projectData.industry || "technology",
      description: projectData.description || "No description"
    });
  } catch {
    return {
      question: "Which describes you best?",
      choices: ["Idea Stage", "Building", "Growing", "Other"]
    };
  }
}

// --- Existing: Generate Outline ---
export async function generateOutline(systemPrompt: string, transcript: string): Promise<any> {
  const prompt = PromptTemplate.fromTemplate(`
    {systemPrompt}
    Transcript: {transcript}
    Return strictly valid JSON.
  `);
  const chain = prompt.pipe(openai).pipe(new JsonOutputParser());
  return await chain.invoke({ systemPrompt, transcript });
}

export interface MarketEstimates {
  tam: string;
  sam: string;
  som: string;
  reasoning: string;
}

// --- NEW: Market Size Estimator ---
export async function generateMarketEstimates(
  context: string,
  region: string = "Global"
): Promise<MarketEstimates> {
  const prompt = PromptTemplate.fromTemplate(`
    You are a Venture Capital Analyst. Estimate the TAM, SAM, and SOM for a startup with this context:
    "{context}"
    
    Target Region: {region}

    Definitions:
    - TAM (Total Addressable Market): Total market demand for the product.
    - SAM (Serviceable Available Market): Segment of TAM within your geographical reach.
    - SOM (Serviceable Obtainable Market): Portion of SAM you can capture.

    Task:
    1. Estimate specific dollar values (e.g., "$5B") based on general market data for this industry.
    2. Provide a 1-sentence reasoning for the calculation.
    
    Return strictly valid JSON:
    {{
      "tam": "$X Billion",
      "sam": "$Y Million",
      "som": "$Z Million",
      "reasoning": "Based on [Industry] market size of $X..."
    }}
  `);

  const chain = prompt.pipe(gemini25Flash).pipe(new JsonOutputParser<MarketEstimates>());

  try {
    return await chain.invoke({ context, region });
  } catch (error) {
    console.error("Market Estimation Error:", error);
    return {
      tam: "Unknown",
      sam: "Unknown",
      som: "Unknown",
      reasoning: "AI could not calculate estimates at this time."
    };
  }
}