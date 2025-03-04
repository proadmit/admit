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

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    
    if (!stripeCustomerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: authResult.sessionClaims?.email as string,
        name: `${user.name} ${user.surname}`,
        metadata: {
          userId: user.id,
          clerkId: user.clerkId
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Update user with Stripe customer ID
      await db.update(users)
        .set({ stripeCustomerId: customer.id })
        .where(eq(users.id, user.id));
    }

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: getPlanAmount(priceId),
      currency: 'usd',
      customer: stripeCustomerId,
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
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
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
  return priceId === PRICE_IDS.yearly ? 8000 : 1000; // $80 for yearly, $10 for monthly
} 