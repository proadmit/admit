import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { RecommendationLetterForm } from "@/components/recommendation-letter/form";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import Link from "next/link";

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

  const isPremium = user.plan !== "free";

  return (
    <div className="container max-w-4xl relative">
      {!isPremium && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-lg">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
            <Lock className="w-12 h-12 text-[#7857FF] mx-auto mb-4" />
            <h3 className="text-2xl font-semibold mb-2">Premium Feature</h3>
            <p className="text-gray-600 mb-6">
              Upgrade to Premium to access AI-powered recommendation letters and
              stand out in your college applications.
            </p>
            <Button
              asChild
              className="bg-[#7857FF] hover:bg-[#6544FF] text-white rounded-full px-8 py-2"
            >
              <Link href="/payment">Upgrade Now</Link>
            </Button>
          </div>
        </div>
      )}
      <div className={!isPremium ? "filter blur-[2px]" : ""}>
        <RecommendationLetterForm
          userInfo={{
            name: `${user.name} ${user.surname}`,
            gender: user.gender,
            major: user.major,
          }}
          isPremium={isPremium}
        />
      </div>
    </div>
  );
}
