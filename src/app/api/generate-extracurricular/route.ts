import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and their current plan
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is on free plan and has used their free generation
    if (user.plan === "free" && user.freeExtracurricularGenerations >= 1) {
      return NextResponse.json({
        error: "Free generation limit reached",
        requiresUpgrade: true
      }, { status: 403 });
    }

    const { prompt } = await req.json();

    // Generate the content using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert in crafting compelling extracurricular activities descriptions for college applications. Focus on highlighting leadership, initiative, and impact."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;

    // If user is on free plan, increment their generation count
    if (user.plan === "free") {
      await db.update(users)
        .set({
          freeExtracurricularGenerations: user.freeExtracurricularGenerations + 1,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("[EXTRACURRICULAR_GENERATION_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
} 