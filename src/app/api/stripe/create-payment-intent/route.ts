import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

// Initialize Stripe with error handling
let stripe: Stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not defined");
  }
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
} catch (error) {
  console.error("Failed to initialize Stripe:", error);
  throw error;
}

export async function POST(req: Request) {
  try {
    // Validate request body
    const body = await req.json();
    if (!body.priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }
    const { priceId } = body;

    // Authenticate user
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("Creating payment intent for user:", clerkId);

    // Get user data
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      with: {
        subscription: true,
      },
    });

    if (!user) {
      console.error("User not found:", clerkId);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log("Found user:", user.id, "Current subscription:", user.subscription?.status);

    // Calculate amount
    const amount = getPlanAmount(priceId);
    console.log("Creating payment intent for amount:", amount);

    try {
      // Create PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          userId: user.id,
          priceId: priceId,
          isUpgrade: user.subscription?.status === "active" ? "true" : "false",
          oldPriceId: user.subscription?.priceId || null,
        },
        description: `Subscription ${user.subscription?.status === "active" ? "upgrade" : "purchase"} - ${getPlanName(priceId)}`,
      });

      console.log("Payment intent created successfully:", paymentIntent.id);

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (stripeError: any) {
      console.error("Stripe error:", stripeError);
      return NextResponse.json(
        { error: stripeError.message || "Failed to create payment intent" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in payment intent endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getPlanAmount(priceId: string): number {
  switch (priceId) {
    case "price_monthly_test":
      return 1000; // $10.00
    case "price_yearly_test":
      return 8000; // $80.00
    default:
      throw new Error(`Invalid price ID: ${priceId}`);
  }
}

function getPlanName(priceId: string): string {
  switch (priceId) {
    case "price_monthly_test":
      return "Monthly Premium Plan";
    case "price_yearly_test":
      return "Yearly Premium Plan";
    default:
      return "Premium Plan";
  }
} 