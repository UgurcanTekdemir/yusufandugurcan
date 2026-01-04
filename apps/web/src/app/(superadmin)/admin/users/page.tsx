import { requireRole } from "@/features/rbac/requireRole";
import { listAllUsers } from "@/server/repositories/users.repository";
import { getUserBalance } from "@/server/services/walletService";
import { auth } from "@/lib/firebase-admin/admin";
import { listAllDealers } from "@/server/repositories/dealers.repository";
import { UsersClient } from "./UsersClient";

interface UsersPageProps {
  searchParams: Promise<{
    dealerId?: string;
    role?: string;
  }>;
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;

  // Validate superadmin role
  await requireRole("superadmin");

  // Parse filters
  const filters: {
    dealerId?: string;
    role?: "superadmin" | "dealer" | "user";
  } = {};

  if (params.dealerId) {
    filters.dealerId = params.dealerId;
  }

  if (params.role && ["superadmin", "dealer", "user"].includes(params.role)) {
    filters.role = params.role as "superadmin" | "dealer" | "user";
  }

  // Get all users with filters
  const users = await listAllUsers(filters);

  // Get all dealers for filter dropdown
  const dealers = await listAllDealers();

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
      <UsersClient
        users={usersWithData}
        dealers={dealers}
        initialFilters={{
          dealerId: params.dealerId,
          role: params.role,
        }}
      />
    </div>
  );
}

