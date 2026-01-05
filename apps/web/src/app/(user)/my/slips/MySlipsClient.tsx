"use client";

import { SearchBar } from "@/components";
import type { SlipDocument } from "@/server/repositories/types";

interface MySlipsClientProps {
  slips: (SlipDocument & { id: string })[];
}

export function MySlipsClient({ slips }: MySlipsClientProps) {
  const handleSearch = (query: string) => {
    console.log("Search query:", query);
    // TODO: Implement search functionality
  };

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
    <div className="flex flex-col h-full bg-dark-bg relative custom-scrollbar">
      {/* Search Bar */}
      <div className="px-6 pt-6 pb-4">
        <SearchBar placeholder="Search slips..." onSearch={handleSearch} />
      </div>

      {/* Slips Table */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
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
        <div className="h-20"></div>
      </div>
    </div>
  );
}

