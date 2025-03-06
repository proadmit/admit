import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    await headers();
    const { userId: clerkId } = await auth();

    const body = await req.json();
    const { priceId, couponId } = body;

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("Creating payment intent with details:", {
      clerkId,
      userId: user.id,
      priceId,
      couponId
    });

    // Create or get customer
    let customer;
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id
        }
      });
    }

    // Prepare subscription create parameters
    const subscriptionParams: any = {
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      metadata: {
        userId: user.id
      },
      expand: ['latest_invoice.payment_intent']
    };

    // If coupon ID is provided, validate and apply it
    if (couponId) {
      try {
        // Verify the coupon exists and is valid
        const coupon = await stripe.coupons.retrieve(couponId);
        console.log("Applying coupon to subscription:", {
          couponId,
          discountType: coupon.amount_off ? 'fixed' : 'percentage',
          discountValue: coupon.amount_off ? coupon.amount_off / 100 : coupon.percent_off
        });

        // Add coupon to subscription
        subscriptionParams.coupon = couponId;
      } catch (couponError) {
        console.error("Error applying coupon:", couponError);
        return NextResponse.json({ error: "Invalid coupon" }, { status: 400 });
      }
    }

    // Create subscription with coupon if provided
    const subscription = await stripe.subscriptions.create(subscriptionParams);

    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice.payment_intent as any;

    console.log("Created subscription with payment details:", {
      subscriptionId: subscription.id,
      priceId,
      couponId,
      originalAmount: subscription.items.data[0].price.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : 0,
      finalAmount: paymentIntent.amount / 100,
      discount: subscription.discount ? {
        couponId: subscription.discount.coupon.id,
        amountOff: subscription.discount.coupon.amount_off ? subscription.discount.coupon.amount_off / 100 : null,
        percentOff: subscription.discount.coupon.percent_off
      } : null
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
} 