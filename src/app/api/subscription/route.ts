import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from 'next/headers';

const PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID!,
  yearly: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID!,
} as const;

function getPlanType(priceId: string | null): 'free' | 'monthly' | 'yearly' {
  if (!priceId) return 'free';
  if (priceId === PRICE_IDS.yearly) return 'yearly';
  if (priceId === PRICE_IDS.monthly) return 'monthly';
  return 'free';
}

function getPlanLabel(plan: string): string {
  switch (plan) {
    case 'yearly':
      return 'Premium Plan (Yearly)';
    case 'monthly':
      return 'Premium Plan (Monthly)';
    default:
      return 'Free Plan';
  }
}

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      console.log('❌ No clerk ID found in request');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First get the user ID from clerk ID
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      console.log('❌ User not found in database:', clerkId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Then use the user ID to get subscription details
    const userWithSubscription = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: {
        subscription: true
      }
    });

    console.log('📋 Found user data:', {
      userId: user.id,
      plan: userWithSubscription?.plan,
      subscription: {
        id: userWithSubscription?.subscription?.id,
        status: userWithSubscription?.subscription?.status,
        priceId: userWithSubscription?.subscription?.priceId,
        currentPeriodEnd: userWithSubscription?.subscription?.currentPeriodEnd,
      }
    });

    // Check subscription status
    const subscription = userWithSubscription?.subscription;
    const isActiveSubscription = subscription?.status === 'active';
    const currentPlan = userWithSubscription?.plan || 'free';
    const planLabel = getPlanLabel(currentPlan);

    console.log('📊 Subscription status check:', {
      userId: user.id,
      isActiveSubscription,
      subscriptionStatus: subscription?.status,
      userPlan: currentPlan,
      planLabel,
      priceId: subscription?.priceId
    });

    // If no active subscription or plan is free, return free plan
    if (!isActiveSubscription || currentPlan === 'free') {
      console.log('ℹ️ Returning free plan details:', {
        userId: user.id,
        reason: !isActiveSubscription ? 'No active subscription' : 'User on free plan',
        plan: 'free',
        planLabel: 'Free Plan'
      });

      return NextResponse.json({
        userId: user.id,
        plan: 'free',
        planLabel: 'Free Plan',
        updatedAt: userWithSubscription?.updatedAt,
        status: 'active'
      });
    }

    // Return the active subscription details
    console.log('✅ Returning active subscription details:', {
      userId: user.id,
      plan: currentPlan,
      planLabel,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
    });

    return NextResponse.json({
      userId: user.id,
      plan: currentPlan,
      planLabel,
      updatedAt: userWithSubscription?.updatedAt,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
    });
  } catch (error) {
    console.error('❌ Error fetching subscription:', error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
} 