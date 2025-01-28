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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { 
      recommenderName, 
      position, 
      duration, 
      studentName, 
      studentGender, 
      studentMajor 
    } = body;

    // Validate required fields
    if (!recommenderName || !position || !duration) {
      return NextResponse.json(
        { error: "Please provide recommender's name, position, and duration" },
        { status: 400 }
      );
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const systemPrompt = `You are ${recommenderName}, a ${position} writing a letter of recommendation for ${studentName}, a ${studentGender.toLowerCase()} student applying to study ${studentMajor}. You have known the student for ${duration} ${parseInt(duration) === 1 ? 'year' : 'years'}.

Write a compelling letter of recommendation that:
1. Demonstrates your credibility and relationship with the student
2. Provides specific examples of the student's academic abilities and character
3. Compares them to other students (e.g., "top 5% of students I've taught")
4. Discusses their potential for success in ${studentMajor}
5. Includes personal anecdotes that demonstrate their qualities

Format the letter as follows:

${currentDate}

To Whom It May Concern:

[Write 3-4 strong paragraphs following the guidelines above]

Sincerely,
${recommenderName}
${position}
[Your Institution]
[Contact Information]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const letter = completion.choices[0]?.message?.content;
    if (!letter) {
      return NextResponse.json(
        { error: "Failed to generate letter content" },
        { status: 500 }
      );
    }

    return NextResponse.json({ letter });
  } catch (error) {
    console.error("Error generating recommendation letter:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation letter" },
      { status: 500 }
    );
  }
} 