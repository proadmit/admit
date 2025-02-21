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
} as const;

async function updateSubscriptionInDB(subscription: Stripe.Subscription, userId: string) {
  console.log('🔄 Updating subscription in DB:', {
    subscriptionId: subscription.id,
    userId,
    status: subscription.status,
    priceId: subscription.items.data[0].price.id
  });

  try {
    await db
      .update(subscriptions)
      .set({
        id: subscription.id,
        userId: userId,
        status: subscription.status,
        priceId: subscription.items.data[0].price.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })
      .where(eq(subscriptions.userId, userId));

    // Update user's plan based on the price ID
    const priceId = subscription.items.data[0].price.id;
    const plan = priceId === PRICE_IDS.yearly ? 'yearly' : 'monthly';
    
    await db
      .update(users)
      .set({
        plan,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    console.log('✅ Successfully updated subscription and user plan:', {
      subscriptionId: subscription.id,
      userId,
      plan
    });
  } catch (error) {
    console.error('❌ Error updating subscription in DB:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
  const body = await req.text();
    const signature = headers().get("Stripe-Signature");

    console.log('📥 Received webhook event');

  if (!signature) {
      console.error('❌ No Stripe signature found');
      return NextResponse.json({ error: "No signature found" }, { status: 400 });
  }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    console.log('🎯 Processing webhook event:', event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        console.log('💳 Checkout session completed');
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.metadata?.userId) {
          console.log('📦 Retrieving subscription details:', session.subscription);
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await updateSubscriptionInDB(subscription, session.metadata.userId);
        }
        break;
      }

      case "customer.subscription.created": {
        console.log('🆕 New subscription created');
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;
        if (userId) {
          await updateSubscriptionInDB(subscription, userId);
        }
        break;
      }

      case "customer.subscription.updated": {
        console.log('📝 Subscription updated');
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;
        if (userId) {
          await updateSubscriptionInDB(subscription, userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        console.log('🗑️ Subscription deleted');
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;
        if (userId) {
          try {
            await db
              .update(subscriptions)
              .set({
                status: 'canceled',
                cancelAtPeriodEnd: true,
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.userId, userId));

        await db
              .update(users)
              .set({
                plan: 'free',
                updatedAt: new Date(),
              })
              .where(eq(users.id, userId));

            console.log('✅ Successfully processed subscription deletion:', {
              userId,
              subscriptionId: subscription.id
            });
          } catch (error) {
            console.error('❌ Error processing subscription deletion:', error);
            throw error;
          }
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment succeeded - Full object:", paymentIntent);

        const { userId, priceId } = paymentIntent.metadata;
        console.log("Processing payment for user:", { userId, priceId });

        try {
          // Direct database update using the user ID from metadata
          const newPlan = priceId.includes('yearly') ? 'yearly' : 'monthly';
          
          await db.update(users)
            .set({
              plan: newPlan,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId)); // Using the database user ID

          console.log("Updated plan for user:", {
            userId,
            newPlan
          });

          // Verify the update
          const updatedUser = await db.query.users.findFirst({
            where: eq(users.id, userId),
          });

          console.log("Verified user update:", {
            userId,
            plan: updatedUser?.plan,
            updatedAt: updatedUser?.updatedAt
          });

          return NextResponse.json({ success: true });
        } catch (error) {
          console.error("Error in webhook:", error);
          throw error;
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('❌ Payment failed:', {
          paymentIntentId: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message,
          customerId: paymentIntent.customer
        });
        break;
      }
    }

    console.log('✅ Successfully processed webhook event:', event.type);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
} 