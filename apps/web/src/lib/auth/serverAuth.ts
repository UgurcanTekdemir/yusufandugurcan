import "server-only";
import { cookies } from "next/headers";
import { auth } from "@/lib/firebase-admin/admin";
import { DecodedIdToken } from "firebase-admin/auth";

export interface AuthUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  customClaims?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Get the current authenticated user from the server-side session
 * Extracts and verifies the ID token from cookies
 */
export async function getServerAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return null;
    }

    // Verify the session cookie
    const decodedClaims = await auth.verifySessionCookie(
      sessionCookie.value,
      true // check if token is revoked
    );

    // Get additional user data if needed
    const userRecord = await auth.getUser(decodedClaims.uid);

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      emailVerified: userRecord.emailVerified,
      customClaims: decodedClaims,
      ...decodedClaims,
    };
  } catch (error) {
    // Token verification failed (invalid, expired, or revoked)
    return null;
  }
}

/**
 * Get the ID token from cookies and verify it
 * Returns the decoded token claims
 */
export async function getServerIdToken(): Promise<DecodedIdToken | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (!sessionCookie?.value) {
      return null;
    }

    const decodedClaims = await auth.verifySessionCookie(
      sessionCookie.value,
      true
    );

    return decodedClaims;
  } catch (error) {
    return null;
  }
}
