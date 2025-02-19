import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { priceId, plan } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Create a checkout session with coupon support
    const session = await stripe.checkout.sessions.create({
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment?canceled=true`,
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: body.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        plan,
      },
      // Enable coupon collection in checkout
      allow_promotion_codes: true,
      // Optional: Add specific coupon restrictions
      promotion_code_restrictions: {
        minimum_amount: 100, // Minimum amount in cents (e.g., $1.00)
        currency: 'usd',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 