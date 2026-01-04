import { redirect } from "next/navigation";
import { getServerAuthUser, type AuthUser } from "./serverAuth";

/**
 * Require authentication in server components
 * Redirects to login if not authenticated
 * Returns the authenticated user
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getServerAuthUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
