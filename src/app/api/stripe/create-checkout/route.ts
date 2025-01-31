import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

// Initialize Stripe with test key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

const PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
  yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!,
} as const;

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { priceId } = await req.json();
    if (!priceId) {
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment?canceled=true`,
      metadata: {
        userId: user.id,
        clerkId: user.clerkId,
      },
      customer_email: user.email,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      subscription_data: {
        metadata: {
          userId: user.id,
          clerkId: user.clerkId,
        },
      },
    });

    if (!session.url) {
      console.error("No session URL in response:", session);
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Detailed error logging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Stripe Error Details:', {
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack,
        } : error,
        stripeKey: process.env.STRIPE_SECRET_KEY ? 'Present' : 'Missing',
        priceId,
        userId: user?.id,
        clerkId,
      });
    } else {
      console.error("Error in create-checkout:", error);
    }

    return NextResponse.json(
      { 
        error: "Failed to create checkout session",
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined
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