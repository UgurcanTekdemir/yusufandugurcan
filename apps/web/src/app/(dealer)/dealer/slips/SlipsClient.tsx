"use client";

import Link from "next/link";
import { SlipStatusBadge } from "@/components/dealer";
import type { SlipDocument } from "@/server/repositories/types";

interface Slip extends SlipDocument {
  id: string;
}

interface SlipsClientProps {
  slips: Slip[];
  userEmails: Record<string, string | undefined>;
}

function formatDate(timestamp: { toDate: () => Date } | Date | string): string {
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
}

export function SlipsClient({ slips, userEmails }: SlipsClientProps) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-text-primary">Dealer Slips</h1>
        <Link
          href="/dealer/users"
          className="rounded bg-dark-surface border border-dark-border px-4 py-2 text-text-primary hover:bg-dark-hover transition-colors"
        >
          View Users
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-border border border-dark-border">
          <thead className="bg-dark-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                User
              </th>
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
                <td colSpan={6} className="px-6 py-4 text-center text-text-muted">
                  No slips found
                </td>
              </tr>
            ) : (
              slips.map((slip, index) => (
                <tr key={slip.id || index} className="hover:bg-dark-hover transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Link
                      href={`/dealer/users/${slip.userId}`}
                      className="text-accent-primary hover:underline font-medium"
                    >
                      {userEmails[slip.userId] || slip.userId}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <SlipStatusBadge status={slip.status} />
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

