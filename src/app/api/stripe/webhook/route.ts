import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function POST(req: Request) {
  try {
  const body = await req.text();
    const headersList = headers();
    const signature = headersList.get("Stripe-Signature");

  if (!signature) {
      return new NextResponse("No signature found", { status: 400 });
  }

    let event: Stripe.Event;

  try {
      event = stripe.webhooks.constructEvent(
      body,
      signature,
        process.env.STRIPE_WEBHOOK_SECRET!
    );
    } catch (error) {
      console.error("Error verifying webhook signature:", error);
      return new NextResponse("Invalid signature", { status: 400 });
    }

    try {
    switch (event.type) {
      case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // Update user's subscription in database
          if (session.metadata?.userId) {
        await db
              .update(subscriptions)
              .set({
                id: subscription.id,
            userId: session.metadata.userId,
                status: subscription.status,
                priceId: subscription.items.data[0].price.id,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
              })
              .where(eq(subscriptions.userId, session.metadata.userId));
          }
        break;
      }

        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata.userId;

          if (userId) {
            if (event.type === "customer.subscription.deleted") {
              // Create a new free subscription
              await db.insert(subscriptions).values({
                id: `sub_free_${userId}`,
                userId: userId,
                status: "active",
                priceId: "free",
                quantity: 1,
                cancelAtPeriodEnd: false,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
              }).onConflictDoNothing();
            } else {
              // Update existing subscription
        await db
          .update(subscriptions)
          .set({
                  status: subscription.status,
                  priceId: subscription.items.data[0].price.id,
                  currentPeriodStart: new Date(subscription.current_period_start * 1000),
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                  cancelAtPeriodEnd: subscription.cancel_at_period_end,
                  cancelAt: subscription.cancel_at
                    ? new Date(subscription.cancel_at * 1000)
                    : null,
                  canceledAt: subscription.canceled_at
                    ? new Date(subscription.canceled_at * 1000)
                    : null,
                })
                .where(eq(subscriptions.userId, userId));
            }
          }
          break;
        }

        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const userId = paymentIntent.metadata.userId;
          const priceId = paymentIntent.metadata.priceId;

          if (userId && priceId) {
            const newPlan = priceId === "price_yearly_test" ? "yearly" : "monthly";
            await db.update(users)
              .set({
                plan: newPlan,
                updatedAt: new Date(),
              })
              .where(eq(users.id, userId));
          }
        break;
      }
    }

    return new NextResponse(null, { status: 200 });
    } catch (error) {
      console.error("Error handling webhook:", error);
      return new NextResponse("Webhook handler failed", { status: 500 });
    }
  } catch (error) {
    console.error("Error handling webhook:", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
} 