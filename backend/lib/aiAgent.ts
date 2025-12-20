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

// Gemini 2.5 Flash: For reasoning (Bridge Questions, MCQs)
const gemini25Flash = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  maxOutputTokens: 2048,
  temperature: 0.5,
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

// --- NEW: Generic JSON Generator (for SWOT) ---
export async function geminiJson(promptText: string): Promise<any> {
  const prompt = PromptTemplate.fromTemplate(`
    {promptText}
    
    Return ONLY valid JSON.
  `);
  
  const chain = prompt.pipe(gemini20Flash).pipe(new JsonOutputParser());
  return await chain.invoke({ promptText });
}


// --- VALIDATION: Check if user answered ---
export async function analyzeAnswer(question: string, userAnswer: string): Promise<string> {
  const prompt = PromptTemplate.fromTemplate(`
    You are a helpful startup analyst.
    I asked the founder: "{question}"
    The founder answered: "{userAnswer}"

    Did the founder answer the question effectively?
    - If they answered (even partially), return "ANSWERED".
    - If they said "I don't know", "Not sure", "Skip", or nonsense, return "UNKNOWN".
    - If they asked for help, return "HELP_NEEDED".
    
    Return ONLY the status string (no quotes, no extra text).
  `);
  
  try {
    const chain = prompt.pipe(gemini25Flash).pipe(new StringOutputParser());
    const result = await chain.invoke({ question, userAnswer });
    return result.trim();
  } catch (error) {
    console.error("Error in analyzeAnswer:", error);
    return "ANSWERED"; // Fallback
  }
}

// --- TEXT GENERATION: Enhance Question (Gemini 2.0 Flash) ---
export async function enhanceQuestion(originalQuestion: string, projectData: any): Promise<string> {
  const prompt = PromptTemplate.fromTemplate(`
    Refine this question for a {stage} stage {industry} startup named "{name}".
    Product Description: {description}
    
    Original Question: "{question}"
    
    Rules:
    1. Keep it SHORT and PRECISE (max 20 words).
    2. STRICTLY NO asterisks (*), bullets, or bold formatting.
    3. Use "₹" (Rupee) ONLY if the question is explicitly about financial metrics.
    4. Make it conversational but direct.
    5. Tailor the question based on the product description and industry.
    6. Return ONLY the plain text string of the question.
  `);

  const chain = prompt.pipe(gemini20Flash).pipe(new StringOutputParser());
  
  const result = await chain.invoke({ 
    question: originalQuestion, 
    stage: projectData.stage || "seed", 
    industry: projectData.industry || "technology", 
    name: projectData.name || "your startup",
    description: projectData.description || "No description provided"
  });
  
  return result.trim();
}

// --- LOGIC/JSON: Generate Options (Gemini 2.5 Flash) ---
export async function generateDynamicOptions(question: string, projectData: any): Promise<string[]> {
  const prompt = PromptTemplate.fromTemplate(`
    Generate 4 simple multiple-choice options for: "{question}"
    
    Context: 
    - Industry: {industry}
    - Stage: {stage}
    - Product: {description}

    Rules:
    1. Use "₹" (Rupee) ONLY if the question implies financial values.
    2. STRICTLY NO asterisks (*) or markdown.
    3. Keep options short (max 10 words each).
    4. Make options relevant to the product description and industry.
    5. ALWAYS include "Other" as the last option.
    6. Return ONLY a valid JSON array of strings.
    
    Example Output: ["Option A", "Option B", "Option C", "Other"]
  `);

  const chain = prompt.pipe(gemini25Flash).pipe(new JsonOutputParser<string[]>());
  
  try {
    const res = await chain.invoke({ 
      question, 
      stage: projectData.stage || "seed", 
      industry: projectData.industry || "technology",
      description: projectData.description || "No description"
    });
    
    if (Array.isArray(res) && res.every(item => typeof item === 'string')) {
      return res;
    }
    
    return ["Yes", "No", "Other"];
  } catch (e) {
    console.error("Option generation error:", e);
    return ["Yes", "No", "Other"];
  }
}

interface BridgeQuestionOutput {
  question: string;
  choices: string[];
}

// --- LOGIC/JSON: Bridge Question (Gemini 2.5 Flash) ---
export async function generateBridgeQuestion(
  originalQuestion: string, 
  projectData: any
): Promise<BridgeQuestionOutput> {
  // Escaped curly braces for JSON output
  const prompt = PromptTemplate.fromTemplate(`
    The user said "I don't know" to: "{question}".
    
    Context:
    - Stage: {stage}
    - Industry: {industry}
    - Product: {description}
    
    Your goal: Extract relevant info by asking a simpler concept check related to their product.
    
    Rules:
    1. Create a simpler multiple-choice question about a foundational concept.
    2. Short and clear text (max 15 words).
    3. STRICTLY NO asterisks (*) or formatting.
    4. Generate 3-4 options that are relevant to their industry and product.
    5. Return ONLY valid JSON with this exact structure:
    
    {{
      "question": "Your simple bridge question here?",
      "choices": ["Concept A", "Concept B", "Concept C", "None of these"]
    }}
  `);

  const chain = prompt.pipe(gemini25Flash).pipe(new JsonOutputParser<BridgeQuestionOutput>());
  
  try {
    const result = await chain.invoke({ 
      question: originalQuestion, 
      stage: projectData.stage || "seed",
      industry: projectData.industry || "technology",
      description: projectData.description || "No description"
    });
    
    if (
      result && 
      typeof result.question === 'string' && 
      Array.isArray(result.choices) &&
      result.choices.every((c: any) => typeof c === 'string')
    ) {
      return result;
    }
    
    throw new Error("Invalid bridge question format");
  } catch (e) {
    console.error("Bridge question generation error:", e);
    return {
      question: "Which of these best describes your current status?",
      choices: ["Just an idea", "Building product", "Selling to customers", "Other"]
    };
  }
}

// --- REASONING: Generate Outline (OpenAI GPT-4o) ---
export async function generateOutline(systemPrompt: string, transcript: string): Promise<any> {
  const prompt = PromptTemplate.fromTemplate(`
    {systemPrompt}
    
    Transcript:
    {transcript}
    
    Return strictly valid JSON.
  `);

  const chain = prompt.pipe(openai).pipe(new JsonOutputParser());
  
  return await chain.invoke({ systemPrompt, transcript }); // Passed both variables
}
