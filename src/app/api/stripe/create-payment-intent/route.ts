import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    
    const body = await req.json();
    const { priceId } = body;

    // Get the user from database to get their ID
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    console.log("Creating payment intent for:", {
      clerkId,
      userId: user.id,
      priceId
    });

    const price = await stripe.prices.retrieve(priceId);
    let amount = price.unit_amount || 0;

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Round to nearest integer
      currency: "usd",
      metadata: {
        userId: user.id,
        priceId,
      },
    });

    console.log("Created payment intent with metadata:", paymentIntent.metadata);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
  }
} 