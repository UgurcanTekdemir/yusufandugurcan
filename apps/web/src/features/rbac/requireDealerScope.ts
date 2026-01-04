import "server-only";
import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import type { Role } from "./types";

/**
 * Require access to a specific dealer scope
 * Allows access if:
 * - User is superadmin, OR
 * - User's dealerId claim matches the requested dealerId
 * Redirects to login if not authenticated, throws error if access denied
 */
export async function requireDealerScope(dealerId: string) {
  const user = await getServerAuthUser();

  if (!user) {
    redirect("/login");
  }

  const userRole = user.role as Role | undefined;
  const userDealerId = user.dealerId as string | undefined;

  // Superadmin has access to all dealers
  if (userRole === "superadmin") {
    return user;
  }

  // Check if user's dealerId matches the requested dealerId
  if (!userDealerId || userDealerId !== dealerId) {
    throw new Error(`Access denied: No access to dealer '${dealerId}'`);
  }

  return user;
}
