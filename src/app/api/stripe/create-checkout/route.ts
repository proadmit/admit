import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

// Initialize Stripe with test key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: "2023-10-16",
});

export async function POST(req: Request) {
  try {
    console.log("🔵 Starting payment intent creation...");

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      console.error("❌ No clerk ID found in auth");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("✅ Authenticated user with clerk ID:", clerkId);

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      console.error("❌ No user found for clerk ID:", clerkId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log("✅ Found user:", { id: user.id, plan: user.plan });

    const { priceId } = await req.json();
    console.log("📦 Received price ID:", priceId);

    // Calculate amount based on plan
    const amount = priceId === "price_yearly_test" ? 11988 : 1499;
    console.log("💰 Calculated amount:", amount);

    // Create payment intent
    console.log("🔄 Creating payment intent...");
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: {
        userId: user.id,
        priceId: priceId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    if (!paymentIntent.client_secret) {
      console.error("❌ No client secret in payment intent");
      return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
    }

    console.log("✅ Payment intent created:", paymentIntent.id);
    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error) {
    console.error("❌ Error in payment intent creation:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
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