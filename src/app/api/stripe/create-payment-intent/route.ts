import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    await headers();
    const { userId: clerkId } = await auth();

    const body = await req.json();
    const { priceId, couponId } = body;

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("Creating payment intent for:", {
      clerkId,
      userId: user.id,
      priceId,
      couponId
    });

    // Create or get customer
    let customer;
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id
        }
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: {
        userId: user.id
      },
      expand: ['latest_invoice.payment_intent']
    });

    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice.payment_intent as any;

    console.log("Created payment intent with metadata:", {
      priceId,
      userId: user.id,
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
} 