import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { university, wordLimit, prompt } = await req.json();

    if (!university || !wordLimit || !prompt) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const systemPrompt = `You are a highly skilled college admissions essay writer. Write a supplemental essay for ${university} with a word limit of ${wordLimit} words. The essay should be personal, engaging, and showcase the student's unique qualities.

Essay prompt: ${prompt}

Guidelines:
- Stay within the ${wordLimit} word limit
- Be personal and specific
- Show, don't tell
- Focus on personal growth and learning
- Maintain a clear narrative structure
- Use vivid details and examples
- End with a strong conclusion`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: Math.min(wordLimit * 4, 2000), // Approximate tokens needed
    });

    const essay = completion.choices[0].message.content;

    return new NextResponse(JSON.stringify({ essay }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating essay:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to generate essay" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 