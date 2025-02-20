import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from 'next/headers';

export async function GET() {
  try {
    // Get headers first
    const headersList = headers();
    
    // Then use auth
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Checking subscription for user:", clerkId);

    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    console.log("Found user:", user);

    return NextResponse.json({
      plan: user?.plan || "free",
      updatedAt: user?.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json({ error: "Failed to fetch subscription" }, { status: 500 });
  }
} 