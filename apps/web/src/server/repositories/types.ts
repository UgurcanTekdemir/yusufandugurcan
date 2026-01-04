import type { Timestamp } from "firebase-admin/firestore";

/**
 * User document structure in Firestore
 */
export interface UserDocument {
  role: "superadmin" | "dealer" | "user";
  dealerId?: string;
  status: "active" | "banned";
  createdAt: Timestamp;
}

/**
 * Dealer document structure in Firestore
 */
export interface DealerDocument {
  name: string;
  createdAt: Timestamp;
  createdBy: string; // uid of creator
}

/**
 * Transaction document structure in Firestore
 */
export interface TransactionDocument {
  type: "credit" | "debit" | "adjustment";
  amount: number;
  fromUid: string;
  toUid: string;
  dealerId: string;
  createdAt: Timestamp;
  reason: string;
}

/**
 * Bet line structure within a slip
 */
export interface SlipLine {
  id: string;
  fixtureId: string | number;
  market: string;
  selection: string;
  odds: number;
}

/**
 * Slip document structure in Firestore
 */
export interface SlipDocument {
  userId: string;
  dealerId: string;
  status: string;
  stake: number;
  potentialReturn: number;
  lines: SlipLine[];
  oddsSnapshot: Record<string, number>;
  createdAt: Timestamp;
}

/**
 * Input types for creating documents
 */
export type CreateUserData = Omit<UserDocument, "createdAt">;
export type CreateDealerData = Omit<DealerDocument, "createdAt">;
export type CreateTransactionData = Omit<TransactionDocument, "createdAt">;
export type CreateSlipData = Omit<SlipDocument, "createdAt">;
