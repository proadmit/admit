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
    const { priceId, couponCode } = body;

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
      priceId,
      couponCode
    });

    const price = await stripe.prices.retrieve(priceId);
    let amount = price.unit_amount || 0;

    // If coupon code is provided, validate and apply discount
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon.valid) {
          if (coupon.percent_off) {
            amount = amount * (1 - coupon.percent_off / 100);
          } else if (coupon.amount_off) {
            amount = amount - coupon.amount_off;
          }
        }
      } catch (error) {
        console.error("Error validating coupon:", error);
      }
    }

    // Create payment intent with coupon metadata
      const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.max(Math.round(amount), 0), // Ensure amount is not negative
        currency: "usd",
        metadata: {
          userId: user.id,
        priceId,
        couponCode: couponCode || undefined,
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