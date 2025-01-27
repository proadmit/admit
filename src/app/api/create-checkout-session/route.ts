import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { stripe } from "@/lib/stripe";

const DOMAIN = process.env.NEXT_PUBLIC_APP_URL;

const PLANS = {
  premium: {
    name: "Premium Plan",
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID,
  },
  "premium-yearly": {
    name: "Premium Plan (Yearly)",
    priceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
  },
};

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const { planId } = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) {
      return new NextResponse("Invalid plan", { status: 400 });
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: userId, // You might want to get the actual email from Clerk
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${DOMAIN}/dashboard?success=true`,
      cancel_url: `${DOMAIN}/payment?canceled=true`,
      metadata: {
        userId,
        planId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[STRIPE_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 