"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { createDealerAction } from "@/server/actions/adminActions";
import type { DealerDocument } from "@/server/repositories/types";

interface Dealer extends DealerDocument {
  dealerId: string;
}

interface DealersClientProps {
  dealers: Dealer[];
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

export function DealersClient({ dealers }: DealersClientProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [createForm, setCreateForm] = useState({
    dealerId: "",
    name: "",
  });

  const handleCreateDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const result = await createDealerAction({
        dealerId: createForm.dealerId,
        name: createForm.name,
      });

      if (result.success) {
        toast.success("Dealer created successfully!");
        setShowCreateForm(false);
        setCreateForm({ dealerId: "", name: "" });
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create dealer");
      }
    } catch (error) {
      console.error("Error creating dealer:", error);
      toast.error("Failed to create dealer");
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
          <h1 className="text-3xl font-bold text-text-primary">Dealers</h1>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded bg-accent-primary px-4 py-2 text-dark-bg font-medium hover:bg-opacity-90 transition-colors"
        >
          {showCreateForm ? "Cancel" : "Create Dealer"}
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-6 p-6 bg-dark-surface border border-dark-border rounded">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Create New Dealer</h2>
          <form onSubmit={handleCreateDealer} className="space-y-4">
            <div>
              <label htmlFor="dealerId" className="block text-sm font-medium text-text-secondary mb-2">
                Dealer ID
              </label>
              <input
                id="dealerId"
                type="text"
                required
                pattern="[a-zA-Z0-9_-]+"
                value={createForm.dealerId}
                onChange={(e) => setCreateForm({ ...createForm, dealerId: e.target.value })}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                placeholder="dealer-id"
              />
              <p className="text-text-muted text-xs mt-1">Only letters, numbers, hyphens, and underscores</p>
            </div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                maxLength={200}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                placeholder="Dealer Name"
              />
            </div>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded bg-accent-primary px-4 py-2 text-dark-bg font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? "Creating..." : "Create Dealer"}
            </button>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-border border border-dark-border">
          <thead className="bg-dark-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Dealer ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Created At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                Created By
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border bg-dark-surface">
            {dealers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-text-muted">
                  No dealers found
                </td>
              </tr>
            ) : (
              dealers.map((dealer) => (
                <tr key={dealer.dealerId} className="hover:bg-dark-hover transition-colors">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text-primary">
                    {dealer.dealerId}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-primary">
                    {dealer.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary">
                    {formatDate(dealer.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-text-secondary font-mono text-xs">
                    {dealer.createdBy?.substring(0, 8)}...
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

