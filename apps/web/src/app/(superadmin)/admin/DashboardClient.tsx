"use client";

import Link from "next/link";

interface DashboardStats {
  totalUsers: number;
  totalDealers: number;
  totalCredits: number;
  totalDebits: number;
}

interface DashboardClientProps {
  stats: DashboardStats;
}

export function DashboardClient({ stats }: DashboardClientProps) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Admin Dashboard</h1>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users Card */}
        <Link
          href="/admin/users"
          className="p-6 bg-dark-surface border border-dark-border rounded hover:bg-dark-hover transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm font-medium mb-1">Total Users</p>
              <p className="text-text-primary text-3xl font-bold">{stats.totalUsers}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-accent-primary/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-accent-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
        </Link>

        {/* Total Dealers Card */}
        <Link
          href="/admin/dealers"
          className="p-6 bg-dark-surface border border-dark-border rounded hover:bg-dark-hover transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm font-medium mb-1">Total Dealers</p>
              <p className="text-text-primary text-3xl font-bold">{stats.totalDealers}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-accent-primary/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-accent-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
        </Link>

        {/* Total Credits Card */}
        <Link
          href="/admin/transactions?type=credit"
          className="p-6 bg-dark-surface border border-dark-border rounded hover:bg-dark-hover transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm font-medium mb-1">Total Credits</p>
              <p className="text-text-primary text-3xl font-bold">
                {stats.totalCredits.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
          </div>
        </Link>

        {/* Total Debits Card */}
        <Link
          href="/admin/transactions?type=debit"
          className="p-6 bg-dark-surface border border-dark-border rounded hover:bg-dark-hover transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm font-medium mb-1">Total Debits</p>
              <p className="text-text-primary text-3xl font-bold">
                {stats.totalDebits.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 12H4"
                />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/admin/dealers"
          className="p-4 bg-dark-surface border border-dark-border rounded hover:bg-dark-hover transition-colors"
        >
          <h2 className="text-lg font-semibold text-text-primary mb-2">Dealers</h2>
          <p className="text-text-secondary text-sm">Manage dealers</p>
        </Link>
        <Link
          href="/admin/users"
          className="p-4 bg-dark-surface border border-dark-border rounded hover:bg-dark-hover transition-colors"
        >
          <h2 className="text-lg font-semibold text-text-primary mb-2">Users</h2>
          <p className="text-text-secondary text-sm">Manage users</p>
        </Link>
        <Link
          href="/admin/slips"
          className="p-4 bg-dark-surface border border-dark-border rounded hover:bg-dark-hover transition-colors"
        >
          <h2 className="text-lg font-semibold text-text-primary mb-2">Slips</h2>
          <p className="text-text-secondary text-sm">View all slips</p>
        </Link>
        <Link
          href="/admin/transactions"
          className="p-4 bg-dark-surface border border-dark-border rounded hover:bg-dark-hover transition-colors"
        >
          <h2 className="text-lg font-semibold text-text-primary mb-2">Transactions</h2>
          <p className="text-text-secondary text-sm">View all transactions</p>
        </Link>
      </div>
    </div>
  );
}

