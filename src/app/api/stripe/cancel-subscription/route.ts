import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user's plan to free
    await db.update(users)
      .set({
        plan: "free",
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: "Successfully reverted to free plan"
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("❌ Error in cancellation process:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error("❌ Error in cancellation process:", error);
    }

    return NextResponse.json(
      { 
        error: "Failed to cancel subscription", 
        details: error instanceof Error ? error.message : "An unknown error occurred" 
      },
      { status: 500 }
    );
  }
} 