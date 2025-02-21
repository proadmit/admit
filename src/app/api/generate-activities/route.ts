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

    const { major, gender, country } = await req.json();

    // Generate activities using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert in crafting compelling extracurricular activities for college applications. 
          Generate detailed activities that showcase leadership, initiative, and measurable achievements.
          
          Format each activity with:
          - A clear title and role
          - A detailed paragraph explaining the activity, responsibilities, and impact
          - Measurable achievements or outcomes
          
          Each activity should be specific, impactful, and demonstrate the student's commitment and growth.`
        },
        {
          role: "user",
          content: `Generate extracurricular activities for a ${gender} student from ${country} interested in ${major}.
          
          Create three sections:
          
          1. Academic/Professional Activities:
          Generate 3 activities that demonstrate academic excellence and professional development in ${major}.
          Format: "- [Activity Title and Role]: [Detailed paragraph description]"
          
          2. Creative/Artistic Activities:
          Generate 3 activities that showcase creativity and artistic expression.
          Format: "- [Activity Title and Role]: [Detailed paragraph description]"
          
          3. Community Service/Leadership Activities:
          Generate 3 activities that demonstrate leadership and community impact.
          Format: "- [Activity Title and Role]: [Detailed paragraph description]"
          
          Separate sections with "---" and ensure each activity starts with a hyphen and title.`
        }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    
    // Split content into categories
    const categories = content.split('---').filter(Boolean);
    
    // Parse activities for each category
    const parseActivities = (category: string) => {
      return category
        ?.split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(activity => activity.trim())
        .filter(Boolean)
        .slice(0, 3) || [];
    };

    const formattedActivities = {
      activity: parseActivities(categories[0]),
      creativity: parseActivities(categories[1]),
      service: parseActivities(categories[2])
    };

    // Ensure exactly 3 activities per category
    const ensureThreeItems = (arr: string[]) => {
      if (arr.length < 3) {
        return [...arr, ...Array(3 - arr.length).fill("- Additional Activity: Details to be generated")];
      }
      return arr.slice(0, 3);
    };

    const finalActivities = {
      activity: ensureThreeItems(formattedActivities.activity),
      creativity: ensureThreeItems(formattedActivities.creativity),
      service: ensureThreeItems(formattedActivities.service)
    };

    // If user is on free plan, increment their generation count
    if (user.plan === "free") {
      await db.update(users)
        .set({
          freeExtracurricularGenerations: user.freeExtracurricularGenerations + 1,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }

    return NextResponse.json({ activities: finalActivities });
  } catch (error) {
    console.error("[ACTIVITIES_GENERATION_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate activities" }, { status: 500 });
  }
} 