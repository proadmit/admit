import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = auth();
    
    if (!clerkId) {
      console.log("Unauthorized attempt to cancel subscription - no clerkId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting subscription cancellation process for:", clerkId);

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      console.error("User not found in database:", { clerkId });
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("Found user:", { userId: user.id, plan: user.plan });

    // Get active subscription with detailed logging
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, user.id),
    });

    if (!subscription) {
      console.error("No active subscription found:", { userId: user.id, plan: user.plan });
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Log detailed subscription info
    console.log("Found subscription details:", {
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId: subscription.priceId,
      currentPeriodEnd: subscription.currentPeriodEnd,
      isLocalId: subscription.id.startsWith('sub_') && subscription.id.includes('_'),
      stripeFormat: subscription.id.match(/^sub_[A-Za-z0-9]{24}$/) !== null
    });

    try {
      // Get customer's subscriptions from Stripe
      const stripeSubscriptions = await stripe.subscriptions.list({
        limit: 1,
        customer: user.stripeCustomerId,
        status: 'active',
      });

      if (stripeSubscriptions.data.length === 0) {
        console.error("No active Stripe subscription found for customer:", {
          userId: user.id,
          stripeCustomerId: user.stripeCustomerId
        });
        throw new Error("No active Stripe subscription found");
      }

      const stripeSubscription = stripeSubscriptions.data[0];
      console.log("Found Stripe subscription:", {
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000)
      });

      // Cancel the subscription in Stripe using the actual Stripe subscription ID
      const updatedSubscription = await stripe.subscriptions.update(
        stripeSubscription.id,
        {
          cancel_at_period_end: true,
        }
      );

      console.log("Successfully cancelled subscription in Stripe:", {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancelAt: updatedSubscription.cancel_at,
        currentPeriodEnd: updatedSubscription.current_period_end
      });

      try {
        // Update subscription in database
        await db.update(subscriptions)
          .set({
            cancelAtPeriodEnd: true,
            cancelAt: updatedSubscription.cancel_at 
              ? new Date(updatedSubscription.cancel_at * 1000)
              : null,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, subscription.id));

        // Update user's plan to indicate pending cancellation
        await db.update(users)
          .set({
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        console.log("Successfully updated database records");

        return NextResponse.json({
          success: true,
          message: "Subscription will be cancelled at the end of the billing period",
          cancelAt: updatedSubscription.cancel_at 
            ? new Date(updatedSubscription.cancel_at * 1000)
            : null,
          details: {
            subscriptionId: subscription.id,
            currentPeriodEnd: updatedSubscription.current_period_end,
            status: updatedSubscription.status
          }
        });
      } catch (dbError) {
        console.error("Database update failed:", {
          error: dbError,
          message: dbError instanceof Error ? dbError.message : "Unknown database error",
          subscriptionId: subscription.id,
          userId: user.id
        });
        throw new Error("Failed to update subscription in database");
      }
    } catch (stripeError) {
      console.error("Stripe cancellation failed:", {
        error: stripeError,
        message: stripeError instanceof Error ? stripeError.message : "Unknown Stripe error",
        subscriptionId: subscription.id
      });
      throw new Error("Failed to cancel subscription in Stripe");
    }
  } catch (error) {
    console.error("Error in cancel subscription endpoint:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: "Failed to cancel subscription",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 