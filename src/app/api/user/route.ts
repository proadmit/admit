import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, surname, gender, country, major, achievements } = body;

    // Update or create user in database
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });

    if (existingUser) {
      await db
        .update(users)
        .set({
          name,
          surname,
          gender,
          country,
          major,
          achievements,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkId, userId));
    } else {
      await db.insert(users).values({
        clerkId: userId,
        name,
        surname,
        gender,
        country,
        major,
        achievements,
      });
    }

    return new NextResponse("Success", { status: 200 });
  } catch (error) {
    console.error("[USER_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 