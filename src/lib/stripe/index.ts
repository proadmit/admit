import Stripe from "stripe";
import { config } from "../config";

export const stripe = new Stripe(config.stripe.secretKey!, {
  apiVersion: "2023-10-16",
  typescript: true,
});

export async function createStripeCustomer(email: string, name?: string) {
  const customer = await stripe.customers.create({
    email,
    name,
  });

  return customer;
}

export async function createStripeSession(customerId: string) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${config.app.url}/dashboard?success=true`,
    cancel_url: `${config.app.url}/dashboard?canceled=true`,
    subscription_data: {
      trial_period_days: 7,
    },
  });

  return session;
}

export async function getStripeSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
} 