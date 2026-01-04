import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import { listDealerSlips } from "@/server/services/slipService";
import type { Role } from "@/features/rbac/types";
import { requireDealerScope } from "@/features/rbac/requireDealerScope";
import { SlipsClient } from "./SlipsClient";
import { auth } from "@/lib/firebase-admin/admin";

export default async function DealerSlipsPage() {
  // Get authenticated user and validate dealer role
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

  // Get dealer's slips
  const slips = await listDealerSlips(userDealerId);

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
      <SlipsClient slips={slips} userEmails={userEmails} />
    </div>
  );
}
