"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { createUserActionAdmin } from "@/server/actions/adminActions";
import { UserStatusBadge } from "@/components/dealer";
import type { UserDocument, DealerDocument } from "@/server/repositories/types";

interface User extends UserDocument {
  uid: string;
  email?: string;
  balance: number;
}

interface Dealer extends DealerDocument {
  dealerId: string;
}

interface UsersClientProps {
  users: User[];
  dealers: Dealer[];
  initialFilters: {
    dealerId?: string;
    role?: string;
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

export function UsersClient({ users, dealers, initialFilters }: UsersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [filters, setFilters] = useState({
    dealerId: initialFilters.dealerId || "",
    role: initialFilters.role || "",
  });

  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    role: "user" as "superadmin" | "dealer" | "user",
    dealerId: "",
  });

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const params = new URLSearchParams();
      if (filters.dealerId) {
        params.set("dealerId", filters.dealerId);
      }
      if (filters.role) {
        params.set("role", filters.role);
      }
      router.push(`/admin/users?${params.toString()}`);
    });
  };

  const handleClearFilters = () => {
    setFilters({ dealerId: "", role: "" });
    startTransition(() => {
      router.push("/admin/users");
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const result = await createUserActionAdmin({
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        dealerId: createForm.dealerId || undefined,
      });

      if (result.success) {
        toast.success("User created successfully!");
        setShowCreateForm(false);
        setCreateForm({ email: "", password: "", role: "user", dealerId: "" });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
    } finally {
      setIsCreating(false);
    }
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
          <h1 className="text-3xl font-bold text-text-primary">Users</h1>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded bg-accent-primary px-4 py-2 text-dark-bg font-medium hover:bg-opacity-90 transition-colors"
        >
          {showCreateForm ? "Cancel" : "Create User"}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 p-6 bg-dark-surface border border-dark-border rounded">
        <h2 className="text-lg font-semibold mb-4 text-text-primary">Filters</h2>
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="filterDealerId" className="block text-sm font-medium text-text-secondary mb-2">
              Dealer ID (optional)
            </label>
            <select
              id="filterDealerId"
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
            <label htmlFor="filterRole" className="block text-sm font-medium text-text-secondary mb-2">
              Role (optional)
            </label>
            <select
              id="filterRole"
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="">All Roles</option>
              <option value="superadmin">Superadmin</option>
              <option value="dealer">Dealer</option>
              <option value="user">User</option>
            </select>
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

      {showCreateForm && (
        <div className="mb-6 p-6 bg-dark-surface border border-dark-border rounded">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Create New User</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                placeholder="Password (min 6 characters)"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-text-secondary mb-2">
                Role
              </label>
              <select
                id="role"
                required
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    role: e.target.value as "superadmin" | "dealer" | "user",
                  })
                }
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="user">User</option>
                <option value="dealer">Dealer</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
            <div>
              <label htmlFor="dealerId" className="block text-sm font-medium text-text-secondary mb-2">
                Dealer ID (optional)
              </label>
              <select
                id="dealerId"
                value={createForm.dealerId}
                onChange={(e) => setCreateForm({ ...createForm, dealerId: e.target.value })}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="">No Dealer</option>
                {dealers.map((dealer) => (
                  <option key={dealer.dealerId} value={dealer.dealerId}>
                    {dealer.dealerId} - {dealer.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded bg-accent-primary px-4 py-2 text-dark-bg font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Creating..." : "Create User"}
            </button>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-border border border-dark-border">
          <thead className="bg-dark-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Dealer ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Balance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Created At
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border bg-dark-surface">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-text-muted">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((userDoc) => (
                <tr key={userDoc.uid} className="hover:bg-dark-hover transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                    {userDoc.email || userDoc.uid}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    {userDoc.role}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    {userDoc.dealerId || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <UserStatusBadge status={userDoc.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                    {userDoc.balance.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    {formatDate(userDoc.createdAt)}
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

