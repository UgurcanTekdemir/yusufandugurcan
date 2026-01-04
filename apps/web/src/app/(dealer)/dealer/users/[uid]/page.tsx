import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import { getUser } from "@/server/repositories/users.repository";
import { getUserTransactions } from "@/server/repositories/transactions.repository";
import { getUserBalance } from "@/server/services/walletService";
import { auth } from "@/lib/firebase-admin/admin";
import type { Role } from "@/features/rbac/types";
import type { TransactionDocument } from "@/server/repositories/types";
import { requireDealerScope } from "@/features/rbac/requireDealerScope";
import { UserDetailClient } from "./UserDetailClient";

interface UserDetailPageProps {
  params: Promise<{ uid: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { uid } = await params;

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

  // Get target user and verify they belong to dealer
  const targetUser = await getUser(uid);
  if (!targetUser) {
    redirect("/dealer/users");
  }

  // Enforce dealer scope
  if (targetUser.dealerId !== userDealerId) {
    redirect("/dealer/users");
  }

  await requireDealerScope(userDealerId);

  // Get user email and balance
  let email: string | undefined;
  try {
    const userRecord = await auth.getUser(uid);
    email = userRecord.email;
  } catch {
    // User might not exist in Auth
  }

  const balance = await getUserBalance(uid);

  // Get user transactions
  const transactions = await getUserTransactions(uid, { limit: 100 });
  
  // Add id field to transactions (getUserTransactions returns TransactionDocument[])
  // Note: In a real implementation, we'd want to include doc.id from the query
  const transactionsWithId = transactions.map((tx, index) => ({
    ...tx,
    id: `tx-${index}`,
  })) as (TransactionDocument & { id: string })[];

  return (
    <div className="container mx-auto p-8 bg-dark-bg text-text-primary min-h-screen">
      <UserDetailClient
        user={{
          uid,
          email,
          status: targetUser.status,
          balance,
          dealerId: targetUser.dealerId || userDealerId,
          createdAt: targetUser.createdAt,
        }}
        transactions={transactionsWithId}
      />
    </div>
  );
}

