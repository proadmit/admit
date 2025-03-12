import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { Footer } from "@/components/Footer";

async function getUserInfo(clerkId: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    return user || null;
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
}

async function createFreeSubscription(userId: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // Don't create free subscription if user already has a paid plan
    if (user?.plan === "monthly" || user?.plan === "yearly") {
      return;
    }

    const currentDate = new Date();

    // Create new free subscription only if user has no paid plan
    await db
      .insert(subscriptions)
      .values({
        id: `sub_free_${userId}`,
        userId,
        status: "active",
        priceId: "free",
        quantity: 1,
        cancelAtPeriodEnd: false,
        currentPeriodStart: currentDate,
        currentPeriodEnd: new Date(
          currentDate.getTime() + 365 * 24 * 60 * 60 * 1000
        ),
        createdAt: currentDate,
      })
      .onConflictDoNothing();

    // Update user's plan to free only if they don't have a paid plan
    if (!user?.plan) {
      await db
        .update(users)
        .set({
          plan: "free",
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(users.id, userId));
    }
  } catch (error) {
    console.error("Error creating free subscription:", error);
  }
}

async function syncUserPlan(userId: string, subscription: any) {
  try {
    let plan = "free";

    if (subscription?.status === "active") {
      plan =
        subscription.priceId === "price_yearly_test"
          ? "yearly"
          : subscription.priceId === "price_monthly_test"
          ? "monthly"
          : "free";
    }

    await db
      .update(users)
      .set({
        plan,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error("Error syncing user plan:", error);
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const { userId: clerkId } = auth();

    if (!clerkId) {
      redirect("/auth/sign-in");
    }

    // Get user info
    const user = await getUserInfo(clerkId);

    // Create free subscription if needed
    if (user && !user.plan) {
      await createFreeSubscription(user.id);
    }

    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow bg-gray-100">
          <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
        <Footer />
      </div>
    );
  } catch (error) {
    console.error("Error in DashboardLayout:", error);
    redirect("/auth/sign-in");
  }
}
