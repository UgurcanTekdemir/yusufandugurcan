"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { creditUserAction, debitUserAction } from "@/server/actions/walletActions";
import { UserStatusBadge, TransactionTypeBadge } from "@/components/dealer";
import type { TransactionDocument } from "@/server/repositories/types";

interface User {
  uid: string;
  email?: string;
  status: "active" | "banned";
  balance: number;
  dealerId: string;
  createdAt: any;
}

type Transaction = TransactionDocument & { id: string };

interface UserDetailClientProps {
  user: User;
  transactions: Transaction[];
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

export function UserDetailClient({ user, transactions }: UserDetailClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "credit" as "credit" | "debit",
    amount: "",
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount");
        setIsSubmitting(false);
        return;
      }

      const action = form.type === "credit" ? creditUserAction : debitUserAction;
      const result = await action({
        userUid: user.uid,
        dealerId: user.dealerId,
        amount,
        reason: form.reason,
      });

      if (result.success) {
        toast.success(`${form.type === "credit" ? "Credited" : "Debited"} ${amount.toFixed(2)} successfully!`);
        setForm({ type: "credit", amount: "", reason: "" });
        router.refresh();
      } else {
        toast.error(result.error || `Failed to ${form.type} user`);
      }
    } catch (error) {
      console.error(`Error ${form.type}ing user:`, error);
      toast.error(`Failed to ${form.type} user`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dealer/users"
          className="text-accent-primary hover:underline text-sm mb-4 inline-block"
        >
          ← Back to Users
        </Link>
        <h1 className="text-3xl font-bold text-text-primary">User Details</h1>
      </div>

      {/* User Info Card */}
      <div className="mb-8 p-6 bg-dark-surface border border-dark-border rounded">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">User Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-text-secondary text-sm">Email:</span>
            <p className="text-text-primary font-medium">{user.email || user.uid}</p>
          </div>
          <div>
            <span className="text-text-secondary text-sm">Status:</span>
            <p className="mt-1">
              <UserStatusBadge status={user.status} />
            </p>
          </div>
          <div>
            <span className="text-text-secondary text-sm">Balance:</span>
            <p className="text-text-primary font-bold text-lg">{user.balance.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-text-secondary text-sm">Created At:</span>
            <p className="text-text-primary">{formatDate(user.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Credit/Debit Form */}
      <div className="mb-8 p-6 bg-dark-surface border border-dark-border rounded">
        <h2 className="text-xl font-semibold mb-4 text-text-primary">
          {form.type === "credit" ? "Credit" : "Debit"} User
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-text-secondary mb-2">
              Type
            </label>
            <select
              id="type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "credit" | "debit" })}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-text-secondary mb-2">
              Amount
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              placeholder="0.00"
            />
          </div>
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-text-secondary mb-2">
              Reason
            </label>
            <textarea
              id="reason"
              required
              maxLength={500}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              rows={3}
              placeholder="Reason for credit/debit"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-accent-primary px-4 py-2 text-dark-bg font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Processing..." : `${form.type === "credit" ? "Credit" : "Debit"} User`}
          </button>
        </form>
      </div>

      {/* Transactions Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-text-primary">Transactions</h2>
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
                  <td colSpan={4} className="px-6 py-4 text-center text-text-muted">
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
    </div>
  );
}

