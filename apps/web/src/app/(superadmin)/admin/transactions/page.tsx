import { requireRole } from "@/features/rbac/requireRole";
import { listAllTransactions } from "@/server/repositories/transactions.repository";
import { auth } from "@/lib/firebase-admin/admin";
import { listAllDealers } from "@/server/repositories/dealers.repository";
import { TransactionsClient } from "./TransactionsClient";

interface TransactionsPageProps {
  searchParams: Promise<{
    dealerId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    uid?: string;
  }>;
}

export default async function AdminTransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams;

  // Validate superadmin role
  await requireRole("superadmin");

  // Parse filters
  const filters: {
    dealerId?: string;
    type?: "credit" | "debit" | "adjustment";
    startDate?: Date;
    endDate?: Date;
    uid?: string;
    limit?: number;
  } = {
    limit: 1000, // Show more transactions
  };

  if (params.dealerId) {
    filters.dealerId = params.dealerId;
  }

  if (params.type && ["credit", "debit", "adjustment"].includes(params.type)) {
    filters.type = params.type as "credit" | "debit" | "adjustment";
  }

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

  // Get all transactions with filters
  const transactions = await listAllTransactions(filters);

  // Get all dealers for filter dropdown
  const dealers = await listAllDealers();

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
        dealers={dealers}
        userEmails={userEmails}
        initialFilters={{
          dealerId: params.dealerId,
          type: params.type,
          startDate: params.startDate,
          endDate: params.endDate,
          uid: params.uid,
        }}
      />
    </div>
  );
}

