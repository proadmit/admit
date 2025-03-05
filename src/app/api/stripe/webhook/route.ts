import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

const PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
  yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!,
};

// Simple function to update user's subscription
async function updateSubscriptionInDB(subscription: Stripe.Subscription, userId: string) {
  try {
    console.log("Updating subscription in DB:", {
      subscriptionId: subscription.id,
      userId,
      items: subscription.items.data,
      priceId: subscription.items.data[0].price.id,
      yearlyPriceId: PRICE_IDS.yearly,
      monthlyPriceId: PRICE_IDS.monthly
    });

    // Get the price ID from the subscription
    const priceId = subscription.items.data[0].price.id;

    // Determine plan type based on EXACT matching against price IDs
    const plan = priceId === PRICE_IDS.yearly ? 'yearly' : 
                 priceId === PRICE_IDS.monthly ? 'monthly' : 'free';

    console.log("Determined plan type:", {
      priceId,
      yearlyPriceId: PRICE_IDS.yearly,
      monthlyPriceId: PRICE_IDS.monthly,
      plan,
      yearlyMatch: priceId === PRICE_IDS.yearly,
      monthlyMatch: priceId === PRICE_IDS.monthly
    });

    // First delete any existing subscriptions
    await db.delete(subscriptions)
      .where(eq(subscriptions.userId, userId));

    // Create new subscription record
    await db.insert(subscriptions).values({
      id: subscription.id,
      userId: userId,
      status: subscription.status,
      priceId: priceId,
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: new Date()
    });

    // Update user's plan
    await db.update(users)
      .set({
        plan,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    console.log("Successfully updated subscription:", {
      subscriptionId: subscription.id,
      userId,
      plan,
      priceId,
      yearlyMatch: priceId === PRICE_IDS.yearly,
      monthlyMatch: priceId === PRICE_IDS.monthly
    });
  } catch (error) {
    console.error("Error updating subscription in DB:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = headers().get("Stripe-Signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature found" }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.metadata?.userId) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await updateSubscriptionInDB(subscription, session.metadata.userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata?.userId) {
          await updateSubscriptionInDB(subscription, subscription.metadata.userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata?.userId) {
          // Delete subscription record
          await db.delete(subscriptions)
            .where(eq(subscriptions.userId, subscription.metadata.userId));

          // Reset to free plan
          await db.update(users)
            .set({
              plan: 'free',
              updatedAt: new Date()
            })
            .where(eq(users.id, subscription.metadata.userId));

          console.log('Reset user to free plan:', subscription.metadata.userId);
        }
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
} 