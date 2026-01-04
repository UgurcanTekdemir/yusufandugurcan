"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TransactionTypeBadge } from "@/components/dealer";
import type { TransactionDocument } from "@/server/repositories/types";

interface Transaction extends TransactionDocument {
  id: string;
}

interface TransactionsClientProps {
  transactions: Transaction[];
  userEmails: Record<string, string | undefined>;
  initialFilters: {
    startDate?: string;
    endDate?: string;
    uid?: string;
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

export function TransactionsClient({
  transactions,
  userEmails,
  initialFilters,
}: TransactionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState({
    startDate: initialFilters.startDate || "",
    endDate: initialFilters.endDate || "",
    uid: initialFilters.uid || "",
  });

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams();
      if (filters.startDate) {
        params.set("startDate", filters.startDate);
      }
      if (filters.endDate) {
        params.set("endDate", filters.endDate);
      }
      if (filters.uid) {
        params.set("uid", filters.uid);
      }
      router.push(`/dealer/transactions?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    setFilters({ startDate: "", endDate: "", uid: "" });
    startTransition(() => {
      router.push("/dealer/transactions");
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-text-primary">Dealer Transactions</h1>
        <Link
          href="/dealer/users"
          className="rounded bg-dark-surface border border-dark-border px-4 py-2 text-text-primary hover:bg-dark-hover transition-colors"
        >
          View Users
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 p-6 bg-dark-surface border border-dark-border rounded">
        <h2 className="text-lg font-semibold mb-4 text-text-primary">Filters</h2>
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div>
            <label htmlFor="uid" className="block text-sm font-medium text-text-secondary mb-2">
              User UID (optional)
            </label>
            <input
              id="uid"
              type="text"
              value={filters.uid}
              onChange={(e) => setFilters({ ...filters, uid: e.target.value })}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              placeholder="User UID"
            />
          </div>
          <div className="flex items-end gap-2">
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

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-border border border-dark-border">
          <thead className="bg-dark-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                From
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border bg-dark-surface">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-text-muted">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-dark-hover transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <TransactionTypeBadge type={tx.type} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                    {tx.amount.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    <Link
                      href={`/dealer/users/${tx.fromUid}`}
                      className="text-accent-primary hover:underline"
                    >
                      {userEmails[tx.fromUid] || tx.fromUid}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    <Link
                      href={`/dealer/users/${tx.toUid}`}
                      className="text-accent-primary hover:underline"
                    >
                      {userEmails[tx.toUid] || tx.toUid}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">{tx.reason}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    {formatDate(tx.createdAt)}
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

