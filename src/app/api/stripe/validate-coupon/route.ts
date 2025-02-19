import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      console.log("Auth failed - no userId");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { code } = await req.json();
    console.log("⭐ Validating coupon:", {
      receivedCode: code,
      type: typeof code,
      length: code?.length
    });

    // Add this to check your Stripe connection
    const testCoupon = await stripe.coupons.list({
      limit: 1
    });
    console.log("⭐ Test coupon list:", testCoupon.data);

    if (!code) {
      console.log("No coupon code provided");
      return NextResponse.json(
        { valid: false, message: "Coupon code is required" },
        { status: 400 }
      );
    }

    try {
      // Log all available promotion codes
      const allPromoCodes = await stripe.promotionCodes.list({
        active: true,
        limit: 100
      });
      console.log("Available promotion codes:", 
        allPromoCodes.data.map(p => ({
          code: p.code,
          active: p.active,
          couponId: p.coupon.id
        }))
      );

      // First try to find the promotion code
      const promotionCodes = await stripe.promotionCodes.list({
        code: code,
        active: true,
        limit: 1,
      });
      console.log("Found promotion codes:", promotionCodes.data);

      if (promotionCodes.data.length > 0) {
        const promoCode = promotionCodes.data[0];
        const coupon = await stripe.coupons.retrieve(promoCode.coupon.id);
        console.log("Found coupon:", coupon);

        return NextResponse.json({
          valid: true,
          discount: coupon.percent_off || coupon.amount_off,
          discountType: coupon.percent_off ? 'percent' : 'fixed',
          message: "Coupon applied successfully"
        });
      }

      // Log all available coupons
      const allCoupons = await stripe.coupons.list({
        limit: 100
      });
      console.log("Available coupons:", 
        allCoupons.data.map(c => ({
          id: c.id,
          valid: c.valid,
          amount_off: c.amount_off,
          percent_off: c.percent_off
        }))
      );

      // If no promotion code found, try to find direct coupon
      const coupon = allCoupons.data.find(
        (c) => c.id === code
      );
      console.log("Found direct coupon:", coupon);

      if (coupon && coupon.valid) {
        return NextResponse.json({
          valid: true,
          discount: coupon.percent_off || coupon.amount_off,
          discountType: coupon.percent_off ? 'percent' : 'fixed',
          message: "Coupon applied successfully"
        });
      }

      console.log("No valid coupon found");
      return NextResponse.json(
        { 
          valid: false, 
          message: "Invalid or expired coupon code" 
        },
        { status: 400 }
      );

    } catch (stripeError: any) {
      console.error("Stripe error:", stripeError);
      return NextResponse.json(
        { 
          valid: false, 
          message: "Error validating coupon" 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { 
        valid: false, 
        message: "Server error validating coupon" 
      },
      { status: 500 }
    );
  }
} 