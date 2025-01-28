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

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
      metadata: {
        userId: user.id,
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof Error) {
      console.error("❌ Error in checkout session creation:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    } else {
      console.error("❌ Error in checkout session creation:", error);
    }

    return NextResponse.json(
      { 
        error: "Failed to create checkout session", 
        details: error instanceof Error ? error.message : "An unknown error occurred" 
      },
      { status: 500 }
    );
  }
}

function getPlanName(priceId: string): string {
  switch (priceId) {
    case "price_monthly_test":
      return "Premium Plan (Monthly)";
    case "price_yearly_test":
      return "Premium Plan (Yearly)";
    default:
      return "Premium Plan";
  }
}

function getPlanDescription(priceId: string): string {
  switch (priceId) {
    case "price_monthly_test":
      return "Monthly subscription with unlimited access to all features";
    case "price_yearly_test":
      return "Yearly subscription with 33% discount and unlimited access to all features";
    default:
      return "Unlimited access to all features";
  }
}

function getPlanAmount(priceId: string): number {
  switch (priceId) {
    case "price_monthly_test":
      return 1499; // $14.99
    case "price_yearly_test":
      return 11988; // $119.88 ($9.99/month)
    default:
      return 1499;
  }
} 