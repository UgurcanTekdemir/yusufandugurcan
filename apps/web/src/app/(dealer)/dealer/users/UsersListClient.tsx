"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { createUserAction, banUserAction, unbanUserAction } from "@/server/actions/userActions";
import { UserStatusBadge } from "@/components/dealer";

interface User {
  uid: string;
  email?: string;
  role: string;
  status: "active" | "banned";
  balance: number;
  createdAt: any;
}

interface UsersListClientProps {
  users: User[];
  dealerId: string;
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

export function UsersListClient({ users, dealerId }: UsersListClientProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [banningUid, setBanningUid] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const result = await createUserAction({
        email: createForm.email,
        password: createForm.password,
        dealerId,
      });

      if (result.success) {
        toast.success("User created successfully!");
        setShowCreateForm(false);
        setCreateForm({ email: "", password: "" });
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

  const handleBanUser = async (uid: string) => {
    if (!confirm("Are you sure you want to ban this user?")) {
      return;
    }

    setBanningUid(uid);
    try {
      const result = await banUserAction({ uid });

      if (result.success) {
        toast.success("User banned successfully!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to ban user");
      }
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Failed to ban user");
    } finally {
      setBanningUid(null);
    }
  };

  const handleUnbanUser = async (uid: string) => {
    if (!confirm("Are you sure you want to unban this user?")) {
      return;
    }

    setBanningUid(uid);
    try {
      const result = await unbanUserAction({ uid });

      if (result.success) {
        toast.success("User unbanned successfully!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to unban user");
      }
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast.error("Failed to unban user");
    } finally {
      setBanningUid(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-text-primary">Dealer Users</h1>
        <div className="flex gap-4">
          <Link
            href="/dealer/transactions"
            className="rounded bg-dark-surface border border-dark-border px-4 py-2 text-text-primary hover:bg-dark-hover transition-colors"
          >
            View Transactions
          </Link>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded bg-accent-primary px-4 py-2 text-dark-bg font-medium hover:bg-opacity-90 transition-colors"
          >
            {showCreateForm ? "Cancel" : "Create User"}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-4 bg-dark-surface border border-dark-border rounded">
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
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Balance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border bg-dark-surface">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-text-muted">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((userDoc) => (
                <tr key={userDoc.uid} className="hover:bg-dark-hover transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <Link
                      href={`/dealer/users/${userDoc.uid}`}
                      className="text-accent-primary hover:underline font-medium"
                    >
                      {userDoc.email || userDoc.uid}
                    </Link>
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
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      {userDoc.status === "active" ? (
                        <button
                          onClick={() => handleBanUser(userDoc.uid)}
                          disabled={banningUid === userDoc.uid}
                          className="rounded bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 text-xs font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {banningUid === userDoc.uid ? "Banning..." : "Ban"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnbanUser(userDoc.uid)}
                          disabled={banningUid === userDoc.uid}
                          className="rounded bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 text-xs font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {banningUid === userDoc.uid ? "Unbanning..." : "Unban"}
                        </button>
                      )}
                    </div>
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

