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

    console.log("📦 Creating checkout session:", {
      priceId,
      couponCode,
    });

    // Validate coupon if provided
    let validatedCoupon;
    if (couponCode) {
      try {
        validatedCoupon = await stripe.coupons.retrieve(couponCode);
        if (!validatedCoupon.valid) {
          return NextResponse.json(
            { error: "Invalid or expired coupon" },
            { status: 400 }
          );
        }
        console.log("✅ Coupon validated:", validatedCoupon.id);
      } catch (error) {
        console.error("❌ Invalid coupon:", error);
        return NextResponse.json(
          { error: "Invalid coupon code" },
          { status: 400 }
        );
      }
    }

    // Create checkout session configuration
    const sessionConfig: any = {
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment?canceled=true`,
      mode: "subscription",
      billing_address_collection: "auto",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        couponCode: validatedCoupon?.id,
      },
    };

    // Apply coupon if validated
    if (validatedCoupon) {
      console.log("🎫 Adding validated coupon:", validatedCoupon.id);
      sessionConfig.discounts = [{
        coupon: validatedCoupon.id,
      }];
    } else {
      // Only allow promotion codes input if no specific coupon is provided
      console.log("✨ Enabling promotion codes input");
      sessionConfig.allow_promotion_codes = true;
    }

    console.log("🛍️ Final session config:", sessionConfig);

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);

    if (!session?.url) {
      throw new Error("Failed to create checkout session URL");
    }

    console.log("✅ Checkout session created:", {
      sessionId: session.id,
      url: session.url,
      appliedCoupon: validatedCoupon?.id
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("💥 Checkout session error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to create checkout session" 
      }, 
      { status: 500 }
    );
  }
} 