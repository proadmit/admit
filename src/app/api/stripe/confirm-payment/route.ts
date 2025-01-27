import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

// Ensure Stripe secret key is available
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function POST(req: Request) {
  try {
    console.log("🔵 Starting payment confirmation...");

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      console.error("❌ No clerk ID found in auth");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentIntentId, priceId } = await req.json();
    if (!paymentIntentId || !priceId) {
      return NextResponse.json(
        { error: "Payment intent ID and price ID are required" },
        { status: 400 }
      );
    }

    // Get user data
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    try {
      // Retrieve payment intent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      const newPlan = priceId === "price_monthly_test" ? "monthly" : "yearly";

        // Update user's plan
      await db
        .update(users)
        .set({
          plan: newPlan,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

        return NextResponse.json({ 
          success: true,
          plan: newPlan
        });
    }

    return NextResponse.json(
        { error: `Payment not succeeded. Status: ${paymentIntent.status}` },
      { status: 400 }
    );
    } catch (stripeError: any) {
      console.error("Stripe error:", stripeError);
      return NextResponse.json(
        { error: stripeError.message || "Stripe operation failed" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("❌ Error confirming payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to confirm payment" },
      { status: 500 }
    );
  }
} 