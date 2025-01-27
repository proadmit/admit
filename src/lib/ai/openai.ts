import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEssayFeedback(content: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: "You are an expert college admissions counselor. Provide constructive feedback on college application essays.",
      },
      {
        role: "user",
        content: `Please review this essay and provide specific, actionable feedback on how to improve it: ${content}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.choices[0].message.content;
}

export async function generateEssayIdeas(prompt: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview",
    messages: [
      {
        role: "system",
        content: "You are an expert college admissions counselor. Help students brainstorm ideas for their college application essays.",
      },
      {
        role: "user",
        content: `Help me brainstorm ideas for this essay prompt: ${prompt}`,
      },
    ],
    temperature: 0.8,
    max_tokens: 1000,
  });

  return response.choices[0].message.content;
} 