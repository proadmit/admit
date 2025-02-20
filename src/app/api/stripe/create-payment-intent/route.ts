import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { priceId, couponCode } = body;

    console.log("💰 Creating payment intent:", {
      priceId,
      couponCode,
    });

    // Get the price details
    const price = await stripe.prices.retrieve(priceId);
    let amount = price.unit_amount || 0;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await stripe.coupons.retrieve(couponCode);
      if (coupon.percent_off) {
        amount = amount * (1 - coupon.percent_off / 100);
      } else if (coupon.amount_off) {
        amount = amount - coupon.amount_off;
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Round to nearest integer
      currency: "usd",
      metadata: {
        userId,
        priceId,
        couponCode,
      },
    });

    console.log("✅ Payment intent created:", {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error: any) {
    console.error("💥 Payment intent error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to create payment intent" 
      }, 
      { status: 500 }
    );
  }
} 