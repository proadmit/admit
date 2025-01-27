import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = await req.json();
    const { name, surname, gender, country, major, achievements } = data;

    // Validate required fields
    if (!name || !surname || !gender || !country || !major) {
      return new NextResponse("Missing required fields", { status: 400 });
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
        // Don't update plan on conflict to preserve existing plan
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
    }).onConflictDoNothing();

    console.log("Free subscription created");

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error("Error in personal-info route:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to save user data", details: error.message }), 
      { status: 500 }
    );
  }
} 