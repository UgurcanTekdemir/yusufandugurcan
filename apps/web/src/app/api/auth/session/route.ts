import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/firebase-admin/admin";
import { cookies } from "next/headers";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 5; // 5 days in seconds
const MAX_AGE_MS = MAX_AGE_SECONDS * 1000; // 5 days in milliseconds

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: "ID token is required" },
        { status: 400 }
      );
    }

    // Verify the ID token
    const decodedIdToken = await auth.verifyIdToken(idToken);

    // Only process if the user just signed in in the last 5 minutes
    if (new Date().getTime() / 1000 - decodedIdToken.auth_time < 5 * 60) {
      // Create session cookie
      const sessionCookie = await auth.createSessionCookie(idToken, {
        expiresIn: MAX_AGE_SECONDS,
      });

      const cookieStore = await cookies();
      cookieStore.set("session", sessionCookie, {
        maxAge: MAX_AGE_MS,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      return NextResponse.json({ success: true });
    } else {
      // Recent sign-in required
      return NextResponse.json(
        { error: "Recent sign-in required" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error creating session cookie:", error);
    
    // In development, provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isDevelopment = process.env.NODE_ENV === "development";
    
    return NextResponse.json(
      { 
        error: "Failed to create session",
        ...(isDevelopment && { details: errorMessage })
      },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("session");

  return NextResponse.json({ success: true });
}
