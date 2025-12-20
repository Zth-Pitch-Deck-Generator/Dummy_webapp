import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY2,
});

export async function generateOutline(prompt: string) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: "gpt-4o", // or "gpt-3.5-turbo"
      response_format: { type: "json_object" }, // Ensures valid JSON
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content generated");
    
    return JSON.parse(content);
  } catch (error) {
    console.error("OpenAI Outline Error:", error);
    throw error;
  }
}