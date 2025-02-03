import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

// Initialize Stripe with test key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
  yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!,
} as const;

export async function POST(req: Request) {
  try {
    const authResult = await auth();
    const clerkId = authResult?.userId;
    
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
    }

    if (![PRICE_IDS.monthly, PRICE_IDS.yearly].includes(priceId)) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create a PaymentIntent instead of a Checkout Session
    const paymentIntent = await stripe.paymentIntents.create({
      amount: getPlanAmount(priceId),
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: user.id,
        clerkId: user.clerkId,
        priceId: priceId,
        planType: priceId === PRICE_IDS.monthly ? 'monthly' : 'yearly'
      }
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Payment intent creation error:", {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      } : error,
    });

    return NextResponse.json(
      { 
        error: "Failed to create payment intent",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Helper functions for plan details
function getPlanName(priceId: string): string {
  switch (priceId) {
    case PRICE_IDS.monthly:
      return "Premium Plan (Monthly)";
    case PRICE_IDS.yearly:
      return "Premium Plan (Yearly)";
    default:
      return "Premium Plan";
  }
}

function getPlanDescription(priceId: string): string {
  switch (priceId) {
    case PRICE_IDS.monthly:
      return "Monthly subscription with unlimited access to all features";
    case PRICE_IDS.yearly:
      return "Yearly subscription with 33% discount and unlimited access to all features";
    default:
      return "Unlimited access to all features";
  }
}

function getPlanAmount(priceId: string): number {
  switch (priceId) {
    case PRICE_IDS.monthly:
      return 1000; // $10.00
    case PRICE_IDS.yearly:
      return 8000; // $80.00
    default:
      return 1000;
  }
} 