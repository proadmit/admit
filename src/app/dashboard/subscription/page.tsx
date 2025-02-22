import { Metadata } from "next";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createStripeSession } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Subscription - Admituz",
  description: "Manage your subscription",
};

export default async function SubscriptionPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/auth/sign-in");
  }

  const subscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(subscriptions.createdAt);

  const currentSubscription = subscription[0];

  async function createCheckoutSession() {
    "use server";

    const { userId } = auth();
    if (!userId) {
      return redirect("/auth/sign-in");
    }

    const session = await createStripeSession(userId);
    return redirect(session.url!);
  }

  return (
    <div className="container max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your subscription plan
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {currentSubscription ? (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Status</p>
                  <p className="text-sm text-muted-foreground">
                    {currentSubscription.status}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Current Period</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(
                      currentSubscription.currentPeriodStart!
                    ).toLocaleDateString()}{" "}
                    -{" "}
                    {new Date(
                      currentSubscription.currentPeriodEnd!
                    ).toLocaleDateString()}
                  </p>
                </div>
                {currentSubscription.cancelAt && (
                  <div>
                    <p className="font-medium">Cancels On</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(
                        currentSubscription.cancelAt
                      ).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You are not currently subscribed to any plan.
                </p>
                <form action={createCheckoutSession}>
                  <Button>Subscribe Now</Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
