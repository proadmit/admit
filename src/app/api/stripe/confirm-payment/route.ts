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
    const { paymentIntentId, priceId, subscriptionId } = body;

    console.log("Received payment confirmation:", { 
      paymentIntentId, 
      priceId,
      subscriptionId,
      monthlyPriceId: PRICE_IDS.monthly,
      yearlyPriceId: PRICE_IDS.yearly
    });

    if (!paymentIntentId || !priceId || !subscriptionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log("Payment intent status:", paymentIntent.status);
    
    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment not successful" }, { status: 400 });
    }

    // Get subscription details from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log("Retrieved Stripe subscription:", {
      id: stripeSubscription.id,
      status: stripeSubscription.status,
      currentPeriodStart: stripeSubscription.current_period_start,
      currentPeriodEnd: stripeSubscription.current_period_end
    });

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
    
    // Determine plan type based on price ID
    const plan = priceId === PRICE_IDS.yearly ? 'yearly' : 'monthly';
    console.log("Determined plan type:", { 
      priceId, 
      yearlyPriceId: PRICE_IDS.yearly,
      monthlyPriceId: PRICE_IDS.monthly,
      plan,
      match: priceId === PRICE_IDS.yearly
    });

    try {
      // Delete existing subscription if exists
      await db
        .delete(subscriptions)
        .where(eq(subscriptions.userId, user.id));

      // Create new subscription record in our database
      await db
        .insert(subscriptions)
        .values({
          id: stripeSubscription.id,
          userId: user.id,
          status: stripeSubscription.status,
          priceId,
          stripeSubscriptionId: stripeSubscription.id,
          quantity: 1,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          createdAt: new Date(stripeSubscription.created * 1000),
        });

      console.log("Created subscription record:", {
        id: stripeSubscription.id,
        userId: user.id,
        status: stripeSubscription.status,
        priceId
      });

      // Update user's plan
      await db
        .update(users)
        .set({
          plan,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return NextResponse.json({
        success: true,
        message: "Subscription updated successfully",
        plan,
        subscription: {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
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
    console.error("Error processing payment confirmation:", error);
    return NextResponse.json(
      { error: "Failed to process payment confirmation" },
      { status: 500 }
    );
  }
} 