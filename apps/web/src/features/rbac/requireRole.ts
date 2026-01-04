import "server-only";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import type { Role } from "./types";

/**
 * Require a specific role from the authenticated user
 * Redirects to login if not authenticated, throws error if role doesn't match
 */
export async function requireRole(role: Role) {
  const user = await getServerAuthUser();

  if (!user) {
    redirect("/login");
  }

  const userRole = user.role as Role | undefined;

  if (!userRole || userRole !== role) {
    throw new Error(`Access denied: Requires role '${role}'`);
  }

  return user;
}
