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

    const { code } = await req.json();
    console.log("🔍 Validating coupon code:", code);

    if (!code) {
      return NextResponse.json(
        { valid: false, message: "Coupon code is required" },
        { status: 400 }
      );
    }

    try {
      // First try to find the promotion code
      const promotionCodes = await stripe.promotionCodes.list({
        code: code,
        active: true,
        limit: 1,
      });
      console.log("🎫 Found promotion codes:", promotionCodes.data);

      if (promotionCodes.data.length > 0) {
        const promoCode = promotionCodes.data[0];
        const coupon = await stripe.coupons.retrieve(promoCode.coupon.id);
        console.log("✅ Found coupon:", coupon);

        return NextResponse.json({
          valid: true,
          discount: coupon.percent_off || coupon.amount_off,
          discountType: coupon.percent_off ? 'percent' : 'fixed',
          message: "Coupon applied successfully",
          couponId: coupon.id
        });
      }

      // If no promotion code found, try direct coupon
      const coupons = await stripe.coupons.list({
        limit: 100
      });

      const coupon = coupons.data.find(
        (c) => c.id.toLowerCase() === code.toLowerCase()
      );

      if (coupon && coupon.valid) {
        return NextResponse.json({
          valid: true,
          discount: coupon.percent_off || coupon.amount_off,
          discountType: coupon.percent_off ? 'percent' : 'fixed',
          message: "Coupon applied successfully",
          couponId: coupon.id
        });
      }

      return NextResponse.json(
        { 
          valid: false, 
          message: "Invalid or expired coupon code" 
        },
        { status: 400 }
      );

    } catch (stripeError) {
      console.error("❌ Stripe error:", stripeError);
      return NextResponse.json(
        { 
          valid: false, 
          message: "Error validating coupon" 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("💥 Server error:", error);
    return NextResponse.json(
      { 
        valid: false, 
        message: "Server error validating coupon" 
      },
      { status: 500 }
    );
  }
} 