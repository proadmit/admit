import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { personalStatements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateEssayFeedback } from "@/lib/ai/openai";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { content, prompt } = await req.json();
    if (!content) {
      return new NextResponse("Content is required", { status: 400 });
    }

    const statement = await db
      .insert(personalStatements)
      .values({
        id: crypto.randomUUID(),
        userId,
        content,
        prompt,
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(statement[0]);
  } catch (error) {
    console.error("[PERSONAL_STATEMENT_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const statement = await db
      .select()
      .from(personalStatements)
      .where(eq(personalStatements.userId, userId))
      .orderBy(personalStatements.updatedAt);

    return NextResponse.json(statement[0] || null);
  } catch (error) {
    console.error("[PERSONAL_STATEMENT_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id, content, prompt } = await req.json();
    if (!id || !content) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const statement = await db
      .update(personalStatements)
      .set({
        content,
        prompt,
        updatedAt: new Date(),
      })
      .where(eq(personalStatements.id, id))
      .returning();

    return NextResponse.json(statement[0]);
  } catch (error) {
    console.error("[PERSONAL_STATEMENT_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new NextResponse("Missing id", { status: 400 });
    }

    await db
      .delete(personalStatements)
      .where(eq(personalStatements.id, id));

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[PERSONAL_STATEMENT_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 