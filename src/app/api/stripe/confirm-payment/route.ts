import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";

const PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
  yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!,
} as const;

export async function POST(req: Request) {
  try {
    // Ensure headers are awaited
    await headers();
    const authResult = await auth();
    const clerkId = authResult?.userId;
    
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { paymentIntentId, priceId } = body;

    console.log("Received payment confirmation:", { paymentIntentId, priceId });

    if (!paymentIntentId || !priceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log("Payment intent status:", paymentIntent.status);
    
    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment not successful" }, { status: 400 });
    }

    // Get user from database
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .execute();

    if (!userResult || userResult.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult[0];
    const plan = priceId === PRICE_IDS.yearly ? 'yearly' : 'monthly';
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (plan === 'yearly' ? 365 : 30));

    try {
      // Update user's plan
      await db
        .update(users)
        .set({
          plan,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));

      // Delete existing subscription if exists
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.userId, user.id));

      // Create new subscription
      await db
        .insert(subscriptions)
        .values({
          id: `sub_${Date.now()}_${user.id}`,
          userId: user.id,
          status: 'active',
          priceId,
          quantity: 1,
          cancelAtPeriodEnd: false,
          currentPeriodStart: now,
          currentPeriodEnd: endDate,
          createdAt: now,
        });

      return NextResponse.json({
        success: true,
        message: "Subscription updated successfully",
        plan,
        user: {
          id: user.id,
          plan
        }
      });
    } catch (dbError) {
      console.error("Database error details:", {
        error: dbError,
        message: dbError instanceof Error ? dbError.message : "Unknown database error",
        stack: dbError instanceof Error ? dbError.stack : undefined,
        userId: user.id,
        plan
      });
      
      return NextResponse.json(
        { 
          error: "Failed to update subscription in database",
          details: dbError instanceof Error ? dbError.message : "Unknown database error"
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error confirming payment:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: "Failed to confirm payment",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 