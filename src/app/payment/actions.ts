'use server';

import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getUserSubscription() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
    with: {
      subscription: {
        where: eq(subscriptions.status, "active"),
      },
    },
  });

  if (!user) return null;

  // Return only active subscription
  return user.subscription || {
    status: "active",
    priceId: "free",
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  };
} 