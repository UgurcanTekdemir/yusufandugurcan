import { requireRole } from "@/features/rbac/requireRole";
import { listAllDealers } from "@/server/repositories/dealers.repository";
import { listAllUsers } from "@/server/repositories/users.repository";
import { listAllTransactions } from "@/server/repositories/transactions.repository";
import { DashboardClient } from "./DashboardClient";

export default async function AdminDashboardPage() {
  // Validate superadmin role
  await requireRole("superadmin");

  // Fetch statistics (simple queries for MVP)
  // For MVP: Fetch all and compute counts/sums (can optimize with aggregation queries later)
  const [dealers, users, transactions] = await Promise.all([
    listAllDealers(),
    listAllUsers(),
    listAllTransactions({ limit: 10000 }), // Large limit to get all for MVP
  ]);

  // Calculate statistics
  const totalDealers = dealers.length;
  const totalUsers = users.length;
  
  // Sum credits and debits
  const totalCredits = transactions
    .filter((tx) => tx.type === "credit")
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalDebits = transactions
    .filter((tx) => tx.type === "debit")
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="container mx-auto p-8 bg-dark-bg text-text-primary min-h-screen">
      <DashboardClient
        stats={{
          totalUsers,
          totalDealers,
          totalCredits,
          totalDebits,
        }}
      />
    </div>
  );
}

