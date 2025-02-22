import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { name, surname, gender, country, major, achievements } = data;

    // Validate required fields
    if (!name || !surname || !gender || !country || !major) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("Creating user with data:", { clerkId, name, surname, gender, country, major, achievements });

    // Create or update user with plan field
    const result = await db.insert(users).values({
      clerkId,
      name,
      surname,
      gender,
      country,
      major,
      achievements: achievements || null,
      plan: 'free', // Set default plan to free
      freeExtracurricularGenerations: 0,
      freePersonalStatementGenerations: 0
    }).onConflictDoUpdate({
      target: users.clerkId,
      set: {
        name,
        surname,
        gender,
        country,
        major,
        achievements: achievements || null,
        updatedAt: new Date(),
      }
    }).returning({ id: users.id });

    const userId = result[0].id;
    console.log("User created/updated with ID:", userId);

    // Create a free subscription
    await db.insert(subscriptions).values({
      id: `sub_free_${userId}`,
      userId: userId,
      status: "active",
      priceId: "free",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      cancelAtPeriodEnd: false
    }).onConflictDoNothing();

    console.log("Free subscription created");

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error("Error in personal-info route:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    
    // If the error is about missing columns, we need to sync the schema
    if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
      return NextResponse.json(
        { 
          error: "Database schema needs to be updated. Please contact support.",
          details: "Schema sync required"
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to save user data", details: errorMessage },
      { status: 500 }
    );
  }
} 