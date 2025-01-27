import { Metadata } from "next";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { extracurricularActivities, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Extracurricular Activities - NazranAdmit",
  description: "Manage your extracurricular activities",
};

export default async function ExtracurricularPage() {
  const { userId: clerkId } = auth();

  if (!clerkId) {
    redirect("/auth/sign-in");
  }

  // Fetch user details
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) {
    redirect("/personal-info");
  }

  // Fetch activities
  const activities = await db
    .select()
    .from(extracurricularActivities)
    .where(eq(extracurricularActivities.userId, user.id))
    .orderBy(extracurricularActivities.startDate);

  return (
    <div className="container max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Extracurricular Activities</h1>
          <p className="mt-2 text-muted-foreground">
            Document your activities and achievements
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/extracurricular/new">
            <Plus className="mr-2 h-4 w-4" />
            New Activity
          </Link>
        </Button>
      </div>

      {/* User Info Card */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-lg font-medium">
                {user?.name || "N/A"} {user?.surname || ""}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Country</p>
              <p className="text-lg font-medium">{user?.country || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Major</p>
              <p className="text-lg font-medium">{user?.major || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="text-lg font-medium capitalize">
                {user?.plan || "Free Plan"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-6">
        {activities.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No activities yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Start by adding your first activity
              </p>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity) => (
            <Card key={activity.id}>
              <CardHeader>
                <CardTitle>{activity.name || "Untitled Activity"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {activity.organization || "N/A"} • {activity.role || "N/A"}
                  </p>
                  <p>{activity.description || "No description provided"}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
