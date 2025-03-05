import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Stripe from "stripe";

// Helper function to sync subscription data
async function syncSubscriptionData(userId: string) {
  console.log("[Sync Subscription] Starting sync for user:", userId);
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      subscription: true
    }
  });

  if (!user) {
    console.log("[Sync Subscription] User not found");
    return;
  }

  console.log("[Sync Subscription] Current state:", {
    userPlan: user.plan,
    subscription: user.subscription
  });

  // If user has a monthly/yearly plan but free subscription, check Stripe for active subscription
  if ((user.plan === 'monthly' || user.plan === 'yearly') && 
      user.subscription?.priceId === 'free') {
    console.log("[Sync Subscription] Inconsistent state detected - checking Stripe for active subscription");
    
    try {
      // List customer's subscriptions in Stripe
      const stripeSubscriptions = await stripe.subscriptions.list({
        limit: 1,
        status: 'active',
        customer: user.stripeCustomerId
      });

      if (stripeSubscriptions.data.length > 0) {
        const stripeSubscription = stripeSubscriptions.data[0];
        console.log("[Sync Subscription] Found active Stripe subscription:", stripeSubscription.id);

        // Delete the free subscription
        await db.delete(subscriptions)
          .where(eq(subscriptions.id, user.subscription.id));

        // Create new subscription record with Stripe data
        await db.insert(subscriptions).values({
          id: `stripe_${stripeSubscription.id}`,
          userId: user.id,
          status: stripeSubscription.status,
          priceId: stripeSubscription.items.data[0].price.id,
          stripeSubscriptionId: stripeSubscription.id,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          cancelAt: stripeSubscription.cancel_at ? new Date(stripeSubscription.cancel_at * 1000) : null,
          canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
          createdAt: new Date(stripeSubscription.created * 1000)
        });

        console.log("[Sync Subscription] Created new subscription record with Stripe data");
      } else {
        console.log("[Sync Subscription] No active Stripe subscription found - resetting to free plan");
        
        // Delete the free subscription
        await db.delete(subscriptions)
          .where(eq(subscriptions.id, user.subscription.id));

        // Reset user to free plan since we don't have a valid paid subscription
        await db.update(users)
          .set({ plan: 'free' })
          .where(eq(users.id, userId));
      }
    } catch (error) {
      console.error("[Sync Subscription] Error checking Stripe subscription:", error);
      throw error;
    }
  }
}

export async function POST(req: Request) {
  try {
    // Ensure headers are awaited
    await headers();
    const authResult = await auth();
    const clerkId = authResult?.userId;
    
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Processing subscription cancellation for:", clerkId);

    // Get user and their subscription
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      with: {
        subscription: true
      }
    });

    if (!user) {
      console.log("User not found:", clerkId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("Found user subscription data:", {
      userId: user.id,
      subscription: user.subscription,
      plan: user.plan
    });

    const subscription = user.subscription;
    if (!subscription?.stripeSubscriptionId) {
      console.log("No active subscription found for user:", {
        userId: user.id,
        subscriptionData: subscription
      });
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    try {
      console.log("Attempting to cancel Stripe subscription:", subscription.stripeSubscriptionId);
      
      // Cancel the subscription in Stripe
      const canceledSubscription = await stripe.subscriptions.cancel(
        subscription.stripeSubscriptionId
      );

      console.log("Stripe subscription cancelled successfully:", {
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        status: canceledSubscription.status
      });

      // Delete subscription record
      await db.delete(subscriptions)
        .where(eq(subscriptions.userId, user.id));

      console.log("Deleted subscription record from database");

      // Reset user to free plan
      await db.update(users)
        .set({
          plan: 'free',
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      console.log("Reset user to free plan:", {
        userId: user.id,
        previousPlan: user.plan
      });

      return NextResponse.json({ 
        success: true,
        message: "Subscription cancelled successfully"
      });
    } catch (error: any) {
      console.error("Error cancelling subscription:", {
        error: error,
        code: error.code,
        type: error.type,
        message: error.message,
        subscriptionId: subscription.stripeSubscriptionId
      });
      
      return NextResponse.json(
        { 
          error: "Failed to cancel subscription",
          details: error.message
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Subscription cancellation failed:", {
      error: error,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        error: "Failed to process cancellation request",
        details: error.message
      },
      { status: 500 }
    );
  }
} 