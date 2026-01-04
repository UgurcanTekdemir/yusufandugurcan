import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import { listUsersByDealerId } from "@/server/repositories/users.repository";
import { getUserBalance } from "@/server/services/walletService";
import { auth } from "@/lib/firebase-admin/admin";
import type { Role } from "@/features/rbac/types";
import { UsersListClient } from "./UsersListClient";
import { requireDealerScope } from "@/features/rbac/requireDealerScope";

export default async function DealerUsersPage() {
  // Get authenticated user and validate dealer scope
  const user = await getServerAuthUser();
  if (!user) {
    redirect("/login");
  }

  const userRole = user.role as Role | undefined;
  const userDealerId = user.dealerId as string | undefined;

  // Validate dealer role and get dealerId
  if (userRole !== "dealer" && userRole !== "superadmin") {
    redirect("/");
  }

  if (userRole !== "dealer" || !userDealerId) {
    redirect("/");
  }

  // Enforce dealer scope
  await requireDealerScope(userDealerId);

  // Get users for this dealer
  const users = await listUsersByDealerId(userDealerId);

  // Get balances and emails for each user
  const usersWithData = await Promise.all(
    users.map(async (userDoc) => {
      try {
        const balance = await getUserBalance(userDoc.uid);
        // Get email from Auth if available
        let email: string | undefined;
        try {
          const userRecord = await auth.getUser(userDoc.uid);
          email = userRecord.email;
        } catch {
          // User might not exist in Auth or email unavailable
        }
        return {
          ...userDoc,
          email,
          balance,
        };
      } catch (error) {
        console.error(`Error getting data for user ${userDoc.uid}:`, error);
        return {
          ...userDoc,
          email: undefined,
          balance: 0,
        };
      }
    })
  );

  return (
    <div className="container mx-auto p-8 bg-dark-bg text-text-primary min-h-screen">
      <UsersListClient
        users={usersWithData}
        dealerId={userDealerId}
      />
    </div>
  );
}
