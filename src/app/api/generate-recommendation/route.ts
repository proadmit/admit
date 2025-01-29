import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // Check authentication
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body
    const body = await req.json();
    const { 
      recommenderName, 
      position, 
      duration,
      studentName,
      studentGender,
      studentMajor
    } = body;

    if (!recommenderName || !position || !duration) {
      return NextResponse.json(
        { error: "Please provide recommender's name, position, and duration" },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const systemPrompt = `You are ${recommenderName}, a ${position} writing a letter of recommendation for ${studentName}, a ${studentGender?.toLowerCase() || 'student'} applying to study ${studentMajor || 'their chosen field'}. You have known the student for ${duration} ${parseInt(duration) === 1 ? 'year' : 'years'}.

Write a compelling letter of recommendation that:
1. Demonstrates your credibility and relationship with the student
2. Provides specific examples of the student's academic abilities and character
3. Compares them to other students (e.g., "top 5% of students I've taught")
4. Discusses their potential for success in ${studentMajor || 'their chosen field'}
5. Includes personal anecdotes that demonstrate their qualities

Format the response as a JSON object with this structure:
{
  "letter": {
    "recommenderName": "${recommenderName}",
    "position": "${position}",
    "duration": "${duration}",
    "status": "pending",
    "content": "The formatted letter content including the date (${currentDate}), salutation, body paragraphs, and signature"
  }
}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      // Parse and validate the response
      const parsedResponse = JSON.parse(response);
      
      if (!parsedResponse.letter || !parsedResponse.letter.content) {
        throw new Error("Invalid response format");
      }

      return NextResponse.json(parsedResponse);
    } catch (error) {
      console.error("OpenAI API Error:", error);
      return NextResponse.json(
        { error: "Failed to generate recommendation letter" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in generate-recommendation:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation letter" },
      { status: 500 }
    );
  }
} 