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

const PLAN_TYPES = {
  [PRICE_IDS.monthly]: 'monthly',
  [PRICE_IDS.yearly]: 'yearly',
} as const;

async function updateSubscriptionInDB(subscription: Stripe.Subscription, userId: string) {
  const priceId = subscription.items.data[0].price.id;
  
  console.log('🔄 Starting subscription update in DB:', {
    subscriptionId: subscription.id,
    userId,
    status: subscription.status,
    priceId,
    planType: PLAN_TYPES[priceId] || 'unknown',
    metadata: subscription.metadata,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000)
  });

  try {
    // First verify the user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!existingUser) {
      console.error('❌ User not found:', userId);
      throw new Error(`User not found: ${userId}`);
    }

    // Update user's Stripe customer ID if not set
    if (!existingUser.stripeCustomerId && subscription.customer) {
      await db
        .update(users)
        .set({
          stripeCustomerId: subscription.customer as string,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      
      console.log('✅ Updated user with Stripe customer ID:', subscription.customer);
    }

    // Update subscription record
    console.log('📝 Updating subscription record...');
    await db
      .update(subscriptions)
      .set({
        id: subscription.id,
        userId: userId,
        status: subscription.status,
        priceId: priceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })
      .where(eq(subscriptions.userId, userId));

    console.log('✅ Subscription record updated');

    // Only update the user's plan if the subscription is active
    if (subscription.status === 'active') {
      console.log('🔍 Determining plan type from priceId:', {
        priceId,
        yearlyPriceId: PRICE_IDS.yearly,
        monthlyPriceId: PRICE_IDS.monthly,
        determinedPlanType: PLAN_TYPES[priceId] || 'unknown'
      });

      // Get plan type from the mapping
      const plan = PLAN_TYPES[priceId];
      
      if (!plan) {
        console.error('❌ Unknown price ID:', priceId);
        throw new Error(`Unknown price ID: ${priceId}`);
      }

      console.log('📅 Setting plan to:', plan);
      
      await db
        .update(users)
        .set({
          plan,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Verify the update
      const updatedUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
          subscription: true
        }
      });

      console.log('✅ Successfully updated user plan - Final state:', {
        subscriptionId: subscription.id,
        userId,
        plan: updatedUser?.plan,
        subscriptionStatus: updatedUser?.subscription?.status,
        updatedAt: updatedUser?.updatedAt,
        priceId: updatedUser?.subscription?.priceId
      });
    } else {
      console.log('⚠️ Subscription not active, skipping plan update:', {
        subscriptionId: subscription.id,
        userId,
        status: subscription.status
      });
    }
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

    console.log('🎯 Processing webhook event:', {
      type: event.type,
      id: event.id,
      object: event.data.object.object,
    });

    switch (event.type) {
      case "checkout.session.completed": {
        console.log('💳 Checkout session completed - Full details:', event.data.object);
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.metadata?.userId) {
          console.log('📦 Retrieving subscription details:', {
            subscriptionId: session.subscription,
            userId: session.metadata.userId
          });
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
        console.log("Payment succeeded:", paymentIntent.id);
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400 }
    );
  }
} 