import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { generateEssayFeedback } from "@/lib/ai/openai";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { content } = await req.json();
    if (!content) {
      return new NextResponse("Content is required", { status: 400 });
    }

    const feedback = await generateEssayFeedback(content);
    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("[AI_FEEDBACK_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 