import "server-only";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import { getUserTransactions } from "@/server/repositories/transactions.repository";
import { getUser } from "@/server/repositories/users.repository";
import type { CreateTransactionData } from "@/server/repositories/types";
import { db } from "@/lib/firebase-admin/db";
import type { Role } from "@/features/rbac/types";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Get user balance by summing transactions
 * Balance = sum(credit transactions to user) - sum(debit transactions from user)
 * Uses index-friendly query (getUserTransactions uses toUid and fromUid filters)
 * Future optimization: Use cached balance document
 */
export async function getUserBalance(uid: string): Promise<number> {
  try {
    // Get all transactions where user is involved (fromUid or toUid) - index-friendly query
    const allTransactions = await getUserTransactions(uid);

    // Calculate balance: credits add (toUid matches), debits subtract (fromUid matches)
    let balance = 0;
    for (const tx of allTransactions) {
      if (tx.toUid === uid && tx.type === "credit") {
        balance += tx.amount;
      } else if (tx.fromUid === uid && tx.type === "debit") {
        balance -= tx.amount;
      }
    }

    return balance;

    // TODO: Future optimization - cache balance in a balance document
    // and update it atomically with transactions using Firestore transactions
  } catch (error) {
    console.error(`Error getting balance for user ${uid}:`, error);
    throw error;
  }
}

export interface CreditUserParams {
  dealerUid?: string;
  superadminUid?: string;
  userUid: string;
  dealerId: string;
  amount: number;
  reason: string;
}

/**
 * Credit a user's wallet (add funds)
 * Validates RBAC and dealer scope server-side
 */
export async function creditUser(
  params: CreditUserParams
): Promise<string> {
  const { dealerUid, superadminUid, userUid, dealerId, amount, reason } =
    params;

  // Get caller's auth info
  const caller = await getServerAuthUser();
  if (!caller) {
    throw new Error("Unauthorized");
  }

  const callerRole = caller.role as Role | undefined;
  const callerDealerId = caller.dealerId as string | undefined;
  const callerUid = caller.uid;

  // Validate RBAC: Must be dealer or superadmin
  if (callerRole !== "dealer" && callerRole !== "superadmin") {
    throw new Error("Access denied: Only dealers or superadmins can credit users");
  }

  // Validate dealer scope: If dealer, can only credit users in their dealerId
  if (callerRole === "dealer") {
    if (!callerDealerId || callerDealerId !== dealerId) {
      throw new Error("Access denied: Dealer can only credit users in their dealerId");
    }
    if (dealerUid && dealerUid !== callerUid) {
      throw new Error("Access denied: Dealer can only credit as themselves");
    }
  }

  // Validate user exists and belongs to dealer (if dealer)
  const user = await getUser(userUid);
  if (!user) {
    throw new Error("User not found");
  }

  if (callerRole === "dealer" && user.dealerId !== dealerId) {
    throw new Error("Access denied: User does not belong to dealer");
  }

  // Determine fromUid (the one crediting)
  const fromUid =
    superadminUid || dealerUid || (callerRole === "superadmin" ? callerUid : dealerUid);

  if (!fromUid) {
    throw new Error("Invalid caller: dealerUid or superadminUid required");
  }

  // Create credit transaction using Firestore transaction for extensibility
  const transactionData: CreateTransactionData = {
    type: "credit",
    amount,
    fromUid,
    toUid: userUid,
    dealerId,
    reason,
  };

  // Use Firestore transaction for atomic writes (extensible for future multi-write operations)
  return await db.runTransaction(async (transaction) => {
    const docRef = db.collection("transactions").doc();
    transaction.set(docRef, {
      ...transactionData,
      createdAt: FieldValue.serverTimestamp(),
    });
    // Future: Could update cached balance here atomically
    return docRef.id;
  });
}

export interface DebitUserParams {
  dealerUid?: string;
  superadminUid?: string;
  userUid: string;
  dealerId: string;
  amount: number;
  reason: string;
}

/**
 * Debit a user's wallet (remove funds)
 * Validates RBAC and dealer scope server-side
 */
export async function debitUser(params: DebitUserParams): Promise<string> {
  const { dealerUid, superadminUid, userUid, dealerId, amount, reason } =
    params;

  // Get caller's auth info
  const caller = await getServerAuthUser();
  if (!caller) {
    throw new Error("Unauthorized");
  }

  const callerRole = caller.role as Role | undefined;
  const callerDealerId = caller.dealerId as string | undefined;
  const callerUid = caller.uid;

  // Validate RBAC: Must be dealer or superadmin
  if (callerRole !== "dealer" && callerRole !== "superadmin") {
    throw new Error("Access denied: Only dealers or superadmins can debit users");
  }

  // Validate dealer scope: If dealer, can only debit users in their dealerId
  if (callerRole === "dealer") {
    if (!callerDealerId || callerDealerId !== dealerId) {
      throw new Error("Access denied: Dealer can only debit users in their dealerId");
    }
    if (dealerUid && dealerUid !== callerUid) {
      throw new Error("Access denied: Dealer can only debit as themselves");
    }
  }

  // Validate user exists and belongs to dealer (if dealer)
  const user = await getUser(userUid);
  if (!user) {
    throw new Error("User not found");
  }

  if (callerRole === "dealer" && user.dealerId !== dealerId) {
    throw new Error("Access denied: User does not belong to dealer");
  }

  // Determine toUid (the one receiving the debit amount)
  const toUid =
    superadminUid || dealerUid || (callerRole === "superadmin" ? callerUid : dealerUid);

  if (!toUid) {
    throw new Error("Invalid caller: dealerUid or superadminUid required");
  }

  // Create debit transaction using Firestore transaction for extensibility
  const transactionData: CreateTransactionData = {
    type: "debit",
    amount,
    fromUid: userUid,
    toUid,
    dealerId,
    reason,
  };

  // Use Firestore transaction for atomic writes (extensible for future multi-write operations)
  return await db.runTransaction(async (transaction) => {
    const docRef = db.collection("transactions").doc();
    transaction.set(docRef, {
      ...transactionData,
      createdAt: FieldValue.serverTimestamp(),
    });
    // Future: Could update cached balance and check balance here atomically
    return docRef.id;
  });
}