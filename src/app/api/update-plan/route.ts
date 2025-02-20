import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    const { priceId, paymentIntentId } = await req.json();

    console.log("Received plan update request:", {
      clerkId,
      priceId,
      paymentIntentId
    });

    if (!clerkId) {
      console.error("No clerk ID provided");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    console.log("Found user:", user);

    if (!user) {
      console.error("User not found:", clerkId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update the plan
    const newPlan = priceId.includes('yearly') ? 'yearly' : 'monthly';
    
    console.log("Updating plan:", {
      userId: user.id,
      currentPlan: user.plan,
      newPlan: newPlan
    });

    // Perform the update in a transaction
    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({
          plan: newPlan,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Verify the update
      const updatedUser = await tx.query.users.findFirst({
        where: eq(users.id, user.id),
      });

      if (updatedUser?.plan !== newPlan) {
        throw new Error("Plan update verification failed");
      }
    });

    // Double check the update
    const verifiedUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    console.log("Plan update complete:", {
      userId: user.id,
      oldPlan: user.plan,
      newPlan: verifiedUser?.plan,
      updatedAt: verifiedUser?.updatedAt
    });

    return NextResponse.json({
      success: true,
      plan: newPlan,
      userId: user.id,
      updatedAt: new Date()
    });

  } catch (error) {
    console.error("Error updating plan:", error);
    return NextResponse.json({ 
      error: "Failed to update plan",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 