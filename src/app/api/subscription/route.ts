import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function getPlanLabel(plan: string): string {
  switch (plan) {
    case 'yearly':
      return 'Premium Plan (Yearly)';
    case 'monthly':
      return 'Premium Plan (Monthly)';
    default:
      return 'Free Plan';
  }
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and their subscription
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      with: {
        subscription: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return subscription details
    return NextResponse.json({
      userId: user.id,
      plan: user.plan || 'free',
      planLabel: getPlanLabel(user.plan || 'free'),
      subscription: user.subscription ? {
        id: user.subscription.id,
        status: user.subscription.status,
        currentPeriodEnd: user.subscription.currentPeriodEnd
      } : null
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription details" },
      { status: 500 }
    );
  }
} 