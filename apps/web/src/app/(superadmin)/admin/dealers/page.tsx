import { requireRole } from "@/features/rbac/requireRole";
import { listAllDealers } from "@/server/repositories/dealers.repository";
import { DealersClient } from "./DealersClient";

export default async function AdminDealersPage() {
  // Validate superadmin role
  await requireRole("superadmin");

  // Get all dealers
  const dealers = await listAllDealers();

  return (
    <div className="container mx-auto p-8 bg-dark-bg text-text-primary min-h-screen">
      <DealersClient dealers={dealers} />
    </div>
  );
}

