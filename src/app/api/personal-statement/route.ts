import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { personalStatements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateEssayFeedback } from "@/lib/ai/openai";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await req.json();
    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    // Get the user's ID from the database
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.clerkId, clerkId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const statement = await db
      .insert(personalStatements)
      .values({
        userId: user.id,
        content,
      })
      .returning();

    return NextResponse.json(statement[0]);
  } catch (error) {
    console.error("Error in personal-statement route:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to save personal statement", details: errorMessage },
      { status: 500 }
    );
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
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, content } = await req.json();
    if (!id || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const statement = await db
      .update(personalStatements)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(personalStatements.id, id))
      .returning();

    return NextResponse.json(statement[0]);
  } catch (error) {
    console.error("Error updating personal statement:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update personal statement", details: errorMessage },
      { status: 500 }
    );
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