import { Metadata } from "next";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { recommendationLetters } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Recommendation Letters - Admituz",
  description: "Manage your letters of recommendation",
};

export default async function RecommendationLettersPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/auth/sign-in");
  }

  const letters = await db
    .select()
    .from(recommendationLetters)
    .where(eq(recommendationLetters.userId, userId))
    .orderBy(recommendationLetters.updatedAt);

  return (
    <div className="container max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recommendation Letters</h1>
          <p className="mt-2 text-muted-foreground">
            Track and manage your letters of recommendation
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/recommendation-letters/new">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-6">
        {letters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <h3 className="text-lg font-semibold">
                No recommendation letters yet
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Request your first letter of recommendation to get started
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/recommendation-letters/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Request
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          letters.map((letter) => (
            <Link
              key={letter.id}
              href={`/dashboard/recommendation-letters/${letter.id}`}
            >
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <CardTitle>{letter.teacherName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {letter.teacherEmail}
                    </p>
                    <span
                      className={`text-sm ${
                        letter.status === "pending"
                          ? "text-yellow-500"
                          : letter.status === "completed"
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {letter.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
