import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    console.log("🔵 Starting subscription cancellation process...");

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      console.error("❌ No clerk ID found in auth");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("✅ Authenticated user with clerk ID:", clerkId);

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      console.error("❌ No user found for clerk ID:", clerkId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log("✅ Found user:", { id: user.id, currentPlan: user.plan });

    // Update user's plan to free
    console.log("🔄 Updating user's plan to free...");
    await db.update(users)
      .set({
        plan: "free",
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    console.log("✅ Successfully updated user plan to free");

    console.log("✅ Cancellation process completed successfully");
    return NextResponse.json({
      success: true,
      message: "Successfully reverted to free plan"
    });
  } catch (error) {
    console.error("❌ Error in cancellation process:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
} 