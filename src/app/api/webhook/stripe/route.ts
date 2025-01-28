import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature");

  if (!signature) {
    return new NextResponse("No signature found", { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const userId = session.metadata.userId;
        const priceId = session.line_items?.data[0]?.price.id;

        if (userId && priceId) {
          const plan = priceId === "price_yearly_test" ? "yearly" : "monthly";
          await db.update(users)
            .set({
              plan,
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

          await db.insert(subscriptions).values({
            userId,
            status: "active",
            priceId,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + (plan === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000),
          }).onConflictDoUpdate({
            target: [subscriptions.userId],
            set: {
              status: "active",
              priceId,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + (plan === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000),
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const userId = subscription.metadata.userId;

        if (userId) {
          await db.update(users)
            .set({
              plan: "free",
              updatedAt: new Date(),
            })
            .where(eq(users.id, userId));

          await db.update(subscriptions)
            .set({
              status: "canceled",
              canceledAt: new Date(),
            })
            .where(eq(subscriptions.userId, userId));
        }
        break;
      }
    }

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return new NextResponse("Webhook error", { status: 400 });
  }
} 