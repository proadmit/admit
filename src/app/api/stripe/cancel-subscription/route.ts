import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
    const { userId: clerkId } = auth();
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const subscription = user.subscription;
    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    try {
      // Cancel the subscription in Stripe
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

      // Delete subscription record
      await db.delete(subscriptions)
        .where(eq(subscriptions.userId, user.id));

      // Reset user to free plan
    await db.update(users)
      .set({
          plan: 'free',
          updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

      console.log("Successfully cancelled subscription:", {
        userId: user.id,
        subscriptionId: subscription.stripeSubscriptionId
      });

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      return NextResponse.json(
        { error: "Failed to cancel subscription" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Subscription cancellation failed:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
} 