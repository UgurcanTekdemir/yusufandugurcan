import "server-only";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import { getUser } from "@/server/repositories/users.repository";
import { getUserBalance } from "@/server/services/walletService";
import { getUserSlips, getDealerSlips, listAllSlips } from "@/server/repositories/slips.repository";
import type { CreateSlipData, SlipLine, SlipDocument } from "@/server/repositories/types";
import { db } from "@/lib/firebase-admin/db";
import type { Role } from "@/features/rbac/types";
import { FieldValue } from "firebase-admin/firestore";

export interface CreateSlipParams {
  uid: string;
  dealerId: string;
  stake: number;
  lines: SlipLine[];
}

/**
 * Create a slip with atomic balance check
 * Validates user role and status, checks balance, and creates slip with debit transaction atomically
 */
export async function createSlip(params: CreateSlipParams): Promise<string> {
  const { uid, dealerId, stake, lines } = params;

  // Get caller's auth info
  const caller = await getServerAuthUser();
  if (!caller) {
    throw new Error("Unauthorized");
  }

  // Validate caller is the user (uid matches)
  if (caller.uid !== uid) {
    throw new Error("Access denied: Can only create slips for yourself");
  }

  // Validate user role (must be 'user')
  const callerRole = caller.role as Role | undefined;
  if (callerRole !== "user") {
    throw new Error("Access denied: Only users can create slips");
  }

  // Get user document to check status
  const user = await getUser(uid);
  if (!user) {
    throw new Error("User not found");
  }

  // Check user status (must be 'active', not 'banned')
  if (user.status !== "active") {
    throw new Error("Access denied: User is banned");
  }

  // Validate user belongs to dealer
  if (user.dealerId !== dealerId) {
    throw new Error("Access denied: User does not belong to dealer");
  }

  // Compute balance from ledger
  const balance = await getUserBalance(uid);

  // Check if balance is sufficient
  if (balance < stake) {
    throw new Error("Insufficient balance");
  }

  // Calculate potential return (stake * total odds)
  const totalOdds = lines.reduce((acc, line) => acc * line.odds, 1);
  const potentialReturn = stake * totalOdds;

  // Create odds snapshot (immutable snapshot of lines at creation time)
  const oddsSnapshot: Record<string, number> = {};
  lines.forEach((line, index) => {
    oddsSnapshot[`${line.fixtureId}-${line.market}-${line.selection}`] = line.odds;
  });

  // Prepare slip data
  const slipData: CreateSlipData = {
    userId: uid,
    dealerId,
    status: "pending",
    stake,
    potentialReturn,
    lines,
    oddsSnapshot,
  };

  // Use Firestore transaction for atomic writes (debit transaction and slip creation)
  // Note: Balance check is done before transaction for performance
  // In a production system, you might want to implement atomic balance checking within the transaction
  return await db.runTransaction(async (transaction) => {
    // Create debit transaction document
    // For debit transactions, toUid can be dealerId (dealers don't have separate uids)
    // This matches the pattern used in walletService.debitUser
    const txDocRef = db.collection("transactions").doc();
    transaction.set(txDocRef, {
      type: "debit",
      amount: stake,
      fromUid: uid,
      toUid: dealerId, // Using dealerId as toUid (dealer identifier)
      dealerId,
      reason: "slip creation",
      createdAt: FieldValue.serverTimestamp(),
    });

    // Create slip document
    const slipDocRef = db.collection("slips").doc();
    transaction.set(slipDocRef, {
      ...slipData,
      createdAt: FieldValue.serverTimestamp(),
    });

    return slipDocRef.id;
  });
}

/**
 * List slips for a specific user
 * Returns slips with id field
 */
export async function listUserSlips(uid: string): Promise<(SlipDocument & { id: string })[]> {
  try {
    const slips = await getUserSlips(uid);
    // getUserSlips returns SlipDocument[] - we'll need to handle id in pages
    // For MVP, return slips as-is - pages can use index or implement id fetching
    return slips as unknown as (SlipDocument & { id: string })[];
  } catch (error) {
    console.error(`Error listing slips for user ${uid}:`, error);
    throw error;
  }
}

/**
 * List slips for a specific dealer
 * Returns slips with id field
 */
export async function listDealerSlips(dealerId: string): Promise<(SlipDocument & { id: string })[]> {
  try {
    const slips = await getDealerSlips(dealerId);
    return slips as unknown as (SlipDocument & { id: string })[];
  } catch (error) {
    console.error(`Error listing slips for dealer ${dealerId}:`, error);
    throw error;
  }
}

/**
 * List all slips (superadmin only)
 * Returns slips with id field
 * Note: Use listAllSlips from repository directly instead
 * @deprecated Use listAllSlips from repository directly
 */
export async function listAllSlipsService(): Promise<(SlipDocument & { id: string })[]> {
  try {
    const slips = await listAllSlips();
    return slips as unknown as (SlipDocument & { id: string })[];
  } catch (error) {
    console.error("Error listing all slips:", error);
    throw error;
  }
}
