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

    const body = await req.json().catch(() => null);
    if (!body?.major || !body?.gender || !body?.country) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { major, gender, country } = body;

    const systemPrompt = `You are a college admissions expert. Generate three sets of extracurricular activities for a ${gender} student from ${country} who wants to major in ${major}. The activities should be impressive and realistic.

Please generate activities in these three categories:
1. Academic/Leadership Activities (3 activities)
2. Creative/Artistic Activities (3 activities)
3. Community Service/Volunteer Activities (3 activities)

For each activity:
- Make it specific and detailed
- Include realistic time commitments
- Show progression and leadership
- Align with the student's interests and major
- Include measurable achievements
- Keep it authentic and believable

Format each activity as a brief paragraph describing the involvement, role, and achievements.`;

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

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return NextResponse.json({ error: "Failed to generate activities" }, { status: 500 });
    }

    const sections = response.split(/\d\.\s+(?:Academic|Creative|Community)/);
    if (sections.length < 4) {
      return NextResponse.json({ error: "Invalid response format" }, { status: 500 });
    }

    const [_, academic, creative, service] = sections;

    // Split each section into individual activities
    const parseActivities = (text: string = "") => {
      return text
        .split(/(?:\r?\n){2,}/)
        .filter(activity => activity.trim().length > 0)
        .map(activity => activity.trim());
    };

    return NextResponse.json({
      activities: {
        activity: parseActivities(academic),
        creativity: parseActivities(creative),
        service: parseActivities(service),
      }
    });
  } catch (error) {
    console.error("Error generating activities:", error);
    return NextResponse.json(
      { error: "Failed to generate activities" },
      { status: 500 }
    );
  }
} 