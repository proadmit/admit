'use server';

import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
  yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!,
};

export async function getUserSubscription() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return null;

    // Get user with their subscription
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      with: {
        subscription: true
      }
    });

    if (!user) return null;

    // If user has no plan or it's free
    if (!user.plan || user.plan === "free") {
      return {
        status: "active",
        priceId: "free",
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        plan: "free",
        planType: "Free Plan",
        isYearly: false
      };
    }

    // User has a paid plan - get the subscription details
    const subscription = user.subscription?.[0]; // Get the first subscription since it's an array

    // Set plan details based on user.plan (source of truth)
    const isYearly = user.plan === "yearly";
    const planType = isYearly ? "Premium Plan (Yearly)" : "Premium Plan (Monthly)";
    const priceId = isYearly ? PRICE_IDS.yearly : PRICE_IDS.monthly;

    console.log("getUserSubscription details:", {
      userPlan: user.plan,
      isYearly,
      priceId,
      yearlyPriceId: PRICE_IDS.yearly,
      monthlyPriceId: PRICE_IDS.monthly,
      subscriptionPriceId: subscription?.priceId
    });

    return {
      status: subscription?.status || "active",
      priceId: priceId,
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString(),
      currentPeriodStart: subscription?.currentPeriodStart?.toISOString(),
      plan: user.plan,
      planType: planType,
      isYearly: isYearly,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false
    };
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return null;
  }
} 