"use server";

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
    if (user.plan === "free" && user.freePersonalStatementGenerations >= 1) {
      return NextResponse.json({
        error: "Free generation limit reached",
        requiresUpgrade: true
      }, { status: 403 });
    }

    const {
      prompt,
      customPrompt,
      questionnaireData,
      userInfo
    } = await req.json();

    // Construct a detailed prompt using all available information
    const systemPrompt = `You are a college admissions essay expert. Generate a personal statement that:
    1. Addresses the prompt authentically and personally
    2. Shows, doesn't tell, through specific examples
    3. Maintains the student's voice
    4. Demonstrates reflection and growth
    5. Stays within 650 words

    Student Information:
    - Gender: ${userInfo.gender || 'Not specified'}
    - Country: ${userInfo.country || 'Not specified'}
    - Major Interest: ${userInfo.major || 'Not specified'}
    - Academic Background: ${userInfo.academics || 'Not specified'}

    Additional Context from Student Questionnaire:
    - Academic Interests: ${questionnaireData.academicInterests}
    - Significant Experience: ${questionnaireData.significantExperience}
    - Personal Growth: ${questionnaireData.personalGrowth}
    - Future Goals: ${questionnaireData.futureGoals}
    - Challenges Overcome: ${questionnaireData.challengesOvercome}

    Essay Prompt: ${customPrompt || prompt}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: "Generate a personal, authentic, and reflective college essay based on the provided information."
        }
      ],
      temperature: 0.7,
      max_tokens: 1200,
    });

    const essay = response.choices[0].message.content;

    // If user is on free plan, increment their generation count
    if (user.plan === "free") {
      await db.update(users)
        .set({
          freePersonalStatementGenerations: user.freePersonalStatementGenerations + 1,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    return NextResponse.json({ essay });
  } catch (error) {
    console.error("[PERSONAL_STATEMENT_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
} 