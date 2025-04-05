import { Metadata } from "next";
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { supplementalEssays } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Supplemental Essays - AdmitApp",
  description: "Manage your college-specific supplemental essays",
};

export default async function SupplementalEssaysPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/auth/sign-in");
  }

  const essays = await db
    .select()
    .from(supplementalEssays)
    .where(eq(supplementalEssays.userId, userId))
    .orderBy(supplementalEssays.updatedAt);

  return (
    <div className="container max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supplemental Essays</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your college-specific supplemental essays
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/supplemental-essays/new">
            <Plus className="mr-2 h-4 w-4" />
            New Essay
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-6">
        {essays.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <h3 className="text-lg font-semibold">No essays yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create your first supplemental essay to get started
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/supplemental-essays/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Essay
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          essays.map((essay) => (
            <Link
              key={essay.id}
              href={`/dashboard/supplemental-essays/${essay.id}`}
            >
              <Card className="hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <CardTitle className="line-clamp-2">{essay.prompt}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {essay.content || "No content yet"}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
