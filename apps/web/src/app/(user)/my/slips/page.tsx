import { redirect } from "next/navigation";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import { listUserSlips } from "@/server/services/slipService";
import type { Role } from "@/features/rbac/types";

export default async function MySlipsPage() {
  // Get authenticated user and validate user role
  const user = await getServerAuthUser();
  if (!user) {
    redirect("/login");
  }

  const userRole = user.role as Role | undefined;

  // Validate user role (must be 'user' or redirect)
  if (userRole !== "user") {
    redirect("/");
  }

  // Get user's slips
  const slips = await listUserSlips(user.uid);

  // Format dates
  const formatDate = (timestamp: { toDate: () => Date } | Date | string) => {
    try {
      const date =
        typeof timestamp === "object" && "toDate" in timestamp
          ? timestamp.toDate()
          : typeof timestamp === "string"
          ? new Date(timestamp)
          : timestamp;
      return date.toLocaleString();
    } catch {
      return "N/A";
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-6 text-3xl font-bold text-text-primary">My Slips</h1>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-border border border-dark-border">
          <thead className="bg-dark-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Stake
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Potential Return
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Lines
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border bg-dark-surface">
            {slips.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-text-muted">
                  No slips found
                </td>
              </tr>
            ) : (
              slips.map((slip, index) => (
                <tr key={index} className="hover:bg-dark-hover transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold ${
                        slip.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          : slip.status === "won"
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : slip.status === "lost"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                      }`}
                    >
                      {slip.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                    {slip.stake.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                    {slip.potentialReturn.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    {slip.lines.length}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    {formatDate(slip.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
