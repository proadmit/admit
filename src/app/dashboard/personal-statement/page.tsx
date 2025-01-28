import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { personalStatements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PersonalStatementEditor } from "@/components/personal-statement/editor";

export default async function PersonalStatementPage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/auth/sign-in");
  }

  const statement = await db
    .select()
    .from(personalStatements)
    .where(eq(personalStatements.userId, userId))
    .orderBy(personalStatements.updatedAt);

  return (
    <div className="container max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personal Statement</h1>
          <p className="mt-2 text-muted-foreground">
            Write and edit your college application personal statement
          </p>
        </div>
      </div>

      <div className="mt-8">
        <PersonalStatementEditor initialStatement={statement[0]} />
      </div>
    </div>
  );
}
