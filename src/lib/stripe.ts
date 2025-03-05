import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  typescript: true,
});

export async function createStripeSession(userId: string, priceId: string) {
  try {
    console.log("[Stripe] Creating checkout session:", { userId, priceId });
    
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,
      metadata: {
        userId,
      },
    });

    console.log("[Stripe] Successfully created checkout session:", { 
      sessionId: session.id,
      url: session.url 
    });

    return session;
  } catch (error) {
    console.error("[Stripe] Error creating checkout session:", {
      error,
      name: error?.name,
      message: error instanceof Error ? error.message : "Unknown error",
      code: error instanceof Stripe.errors.StripeError ? error.code : undefined,
      type: error instanceof Stripe.errors.StripeError ? error.type : undefined
    });
    throw error;
  }
}

export { stripe }; 