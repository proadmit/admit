"use server";

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

    const { prompt, customPrompt } = await req.json();

    if (!prompt) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const systemPrompt = `You are a highly skilled college admissions essay writer. Write a personal statement essay that responds to the following prompt. The essay should be personal, engaging, and showcase unique qualities.

Essay prompt: ${customPrompt || prompt}

Guidelines:
- Stay within 650 words (Common App limit)
- Be personal and specific
- Show, don't tell
- Focus on personal growth and learning
- Maintain a clear narrative structure
- Use vivid details and examples
- End with a strong conclusion
- Demonstrate authenticity and self-reflection`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500, // Approximately 650 words
    });

    const essay = completion.choices[0].message.content;

    return new NextResponse(JSON.stringify({ essay }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating personal statement:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to generate personal statement" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 