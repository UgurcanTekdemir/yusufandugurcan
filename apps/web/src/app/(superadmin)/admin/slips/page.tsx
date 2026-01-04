import { requireRole } from "@/features/rbac/requireRole";
import { listAllSlips } from "@/server/repositories/slips.repository";
import { auth } from "@/lib/firebase-admin/admin";
import { listAllDealers } from "@/server/repositories/dealers.repository";
import { SlipsClient } from "./SlipsClient";

interface SlipsPageProps {
  searchParams: Promise<{
    dealerId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function AdminSlipsPage({ searchParams }: SlipsPageProps) {
  const params = await searchParams;

  // Validate superadmin role
  await requireRole("superadmin");

  // Parse filters
  const filters: {
    dealerId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {
    limit: 1000, // Show more slips
  };

  if (params.dealerId) {
    filters.dealerId = params.dealerId;
  }

  if (params.status) {
    filters.status = params.status;
  }

  if (params.startDate) {
    filters.startDate = new Date(params.startDate);
  }

  if (params.endDate) {
    filters.endDate = new Date(params.endDate);
    // Set to end of day
    filters.endDate.setHours(23, 59, 59, 999);
  }

  // Get all slips with filters
  const slips = await listAllSlips(filters);

  // Get all dealers for filter dropdown
  const dealers = await listAllDealers();

  // Get user emails for display
  const userIds = new Set<string>();
  slips.forEach((slip) => {
    userIds.add(slip.userId);
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
      <SlipsClient
        slips={slips}
        dealers={dealers}
        userEmails={userEmails}
        initialFilters={{
          dealerId: params.dealerId,
          status: params.status,
          startDate: params.startDate,
          endDate: params.endDate,
        }}
      />
    </div>
  );
}
