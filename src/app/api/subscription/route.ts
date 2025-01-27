import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    console.log("🔵 Fetching user subscription info...");

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      console.error("❌ No clerk ID found in auth");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("✅ Authenticated user with clerk ID:", clerkId);

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) {
      console.error("❌ No user found for clerk ID:", clerkId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("✅ Found user subscription info:", {
      userId: user.id,
      plan: user.plan,
      updatedAt: user.updatedAt
    });

    return NextResponse.json({
      plan: user.plan,
      updatedAt: user.updatedAt,
      isPremium: user.plan !== "free",
    });
  } catch (error) {
    console.error("❌ Error fetching subscription:", error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
} 