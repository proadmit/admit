import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { RecommendationLetterForm } from "@/components/recommendation-letter/form";

export default async function RecommendationLetterPage() {
  const { userId: clerkId } = auth();

  if (!clerkId) {
    redirect("/auth/sign-in");
  }

  // Get user details
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) {
    redirect("/personal-info");
  }

  return (
    <div className="container max-w-4xl">
      <RecommendationLetterForm
        userInfo={{
          name: `${user.name} ${user.surname}`,
          gender: user.gender,
          major: user.major,
        }}
        isPremium={user.plan !== "free"}
      />
    </div>
  );
}
