import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import { getDealerTransactions } from "@/server/repositories/transactions.repository";
import type { Role } from "@/features/rbac/types";
import { requireDealerScope } from "@/features/rbac/requireDealerScope";
import { TransactionsClient } from "./TransactionsClient";
import { auth } from "@/lib/firebase-admin/admin";

interface TransactionsPageProps {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    uid?: string;
  }>;
}

export default async function DealerTransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams;

  // Get authenticated user and validate dealer scope
  const user = await getServerAuthUser();
  if (!user) {
    redirect("/login");
  }

  const userRole = user.role as Role | undefined;
  const userDealerId = user.dealerId as string | undefined;

  if (userRole !== "dealer" || !userDealerId) {
    redirect("/");
  }

  // Enforce dealer scope
  await requireDealerScope(userDealerId);

  // Parse filters
  const filters: {
    startDate?: Date;
    endDate?: Date;
    uid?: string;
    limit?: number;
  } = {
    limit: 1000, // Show more transactions
  };

  if (params.startDate) {
    filters.startDate = new Date(params.startDate);
  }

  if (params.endDate) {
    filters.endDate = new Date(params.endDate);
    // Set to end of day
    filters.endDate.setHours(23, 59, 59, 999);
  }

  if (params.uid) {
    filters.uid = params.uid;
  }

  // Get transactions for this dealer
  const transactions = await getDealerTransactions(userDealerId, filters);

  // Get user emails for display
  const userIds = new Set<string>();
  transactions.forEach((tx) => {
    userIds.add(tx.fromUid);
    userIds.add(tx.toUid);
  });

  const userEmails: Record<string, string | undefined> = {};
  await Promise.all(
    Array.from(userIds).map(async (uid) => {
      try {
        const userRecord = await auth.getUser(uid);
        userEmails[uid] = userRecord.email;
      } catch {
        userEmails[uid] = undefined;
      }
    })
  );

  return (
    <div className="container mx-auto p-8 bg-dark-bg text-text-primary min-h-screen">
      <TransactionsClient
        transactions={transactions}
        userEmails={userEmails}
        initialFilters={{
          startDate: params.startDate,
          endDate: params.endDate,
          uid: params.uid,
        }}
      />
    </div>
  );
}
