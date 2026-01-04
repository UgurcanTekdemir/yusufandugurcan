"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SlipStatusBadge } from "@/components/dealer";
import type { SlipDocument, DealerDocument } from "@/server/repositories/types";

interface Slip extends SlipDocument {
  id: string;
}

interface Dealer extends DealerDocument {
  dealerId: string;
}

interface SlipsClientProps {
  slips: Slip[];
  dealers: Dealer[];
  userEmails: Record<string, string | undefined>;
  initialFilters: {
    dealerId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
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

export function SlipsClient({
  slips,
  dealers,
  userEmails,
  initialFilters,
}: SlipsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState({
    dealerId: initialFilters.dealerId || "",
    status: initialFilters.status || "",
    startDate: initialFilters.startDate || "",
    endDate: initialFilters.endDate || "",
  });

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams();
      if (filters.dealerId) {
        params.set("dealerId", filters.dealerId);
      }
      if (filters.status) {
        params.set("status", filters.status);
      }
      if (filters.startDate) {
        params.set("startDate", filters.startDate);
      }
      if (filters.endDate) {
        params.set("endDate", filters.endDate);
      }
      router.push(`/admin/slips?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    setFilters({ dealerId: "", status: "", startDate: "", endDate: "" });
    startTransition(() => {
      router.push("/admin/slips");
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/admin"
            className="text-accent-primary hover:underline text-sm mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-text-primary">All Slips</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-6 bg-dark-surface border border-dark-border rounded">
        <h2 className="text-lg font-semibold mb-4 text-text-primary">Filters</h2>
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="dealerId" className="block text-sm font-medium text-text-secondary mb-2">
              Dealer ID (optional)
            </label>
            <select
              id="dealerId"
              value={filters.dealerId}
              onChange={(e) => setFilters({ ...filters, dealerId: e.target.value })}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="">All Dealers</option>
              {dealers.map((dealer) => (
                <option key={dealer.dealerId} value={dealer.dealerId}>
                  {dealer.dealerId} - {dealer.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-text-secondary mb-2">
              Status (optional)
            </label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-text-secondary mb-2">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-text-secondary mb-2">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-4">
            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-accent-primary px-4 py-2 text-dark-bg font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Filtering..." : "Apply Filters"}
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={isPending}
              className="rounded bg-dark-surface border border-dark-border px-4 py-2 text-text-primary hover:bg-dark-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Slips Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-border border border-dark-border">
          <thead className="bg-dark-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Dealer ID
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
                <td colSpan={7} className="px-6 py-4 text-center text-text-muted">
                  No slips found
                </td>
              </tr>
            ) : (
              slips.map((slip) => (
                <tr key={slip.id} className="hover:bg-dark-hover transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                    {userEmails[slip.userId] || slip.userId}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    {slip.dealerId}
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

