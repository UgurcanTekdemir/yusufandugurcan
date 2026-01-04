import "server-only";
import { db } from "@/lib/firebase-admin/db";
import type {
  TransactionDocument,
  CreateTransactionData,
} from "./types";
import { FieldValue, Query, Timestamp } from "firebase-admin/firestore";

const COLLECTION = "transactions";

export interface TransactionFilters {
  dealerId?: string; // Dealer ID to filter by
  type?: "credit" | "debit" | "adjustment";
  limit?: number;
  startAfter?: string; // transaction ID for pagination
  startDate?: Date; // Start date for date range filter
  endDate?: Date; // End date for date range filter
  uid?: string; // User UID to filter by
}

/**
 * Get a transaction document by transaction ID
 */
export async function getTransaction(txId: string): Promise<TransactionDocument | null> {
  try {
    const doc = await db.collection(COLLECTION).doc(txId).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data() as TransactionDocument;
  } catch (error) {
    console.error(`Error getting transaction ${txId}:`, error);
    throw error;
  }
}

/**
 * Create a transaction document (generates ID)
 */
export async function createTransaction(
  data: CreateTransactionData
): Promise<string> {
  try {
    const docRef = await db.collection(COLLECTION).add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }
}

/**
 * Update a transaction document
 */
export async function updateTransaction(
  txId: string,
  data: Partial<CreateTransactionData>
): Promise<void> {
  try {
    await db.collection(COLLECTION).doc(txId).update(data);
  } catch (error) {
    console.error(`Error updating transaction ${txId}:`, error);
    throw error;
  }
}

/**
 * Get transactions for a specific user (fromUid or toUid)
 */
export async function getUserTransactions(
  userId: string,
  filters?: TransactionFilters
): Promise<TransactionDocument[]> {
  try {
    let query: Query = db.collection(COLLECTION)
      .where("fromUid", "==", userId)
      .orderBy("createdAt", "desc");

    if (filters?.type) {
      query = query.where("type", "==", filters.type);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.startAfter) {
      const startAfterDoc = await db.collection(COLLECTION).doc(filters.startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const snapshot = await query.get();
    
    // Also get transactions where user is the recipient
    let toQuery: Query = db.collection(COLLECTION)
      .where("toUid", "==", userId)
      .orderBy("createdAt", "desc");

    if (filters?.type) {
      toQuery = toQuery.where("type", "==", filters.type);
    }

    if (filters?.limit) {
      toQuery = toQuery.limit(filters.limit);
    }

    const toSnapshot = await toQuery.get();
    
    // Combine and sort results
    const allTransactions = [
      ...snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TransactionDocument & { id: string }),
      ...toSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TransactionDocument & { id: string }),
    ];

    // Sort by createdAt descending and apply limit
    const sorted = allTransactions.sort((a, b) => {
      const aTime = a.createdAt.toMillis();
      const bTime = b.createdAt.toMillis();
      return bTime - aTime;
    });

    return filters?.limit ? sorted.slice(0, filters.limit) : sorted;
  } catch (error) {
    console.error(`Error getting transactions for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get transactions for a specific dealer
 */
export async function getDealerTransactions(
  dealerId: string,
  filters?: TransactionFilters
): Promise<(TransactionDocument & { id: string })[]> {
  try {
    let query: Query = db.collection(COLLECTION)
      .where("dealerId", "==", dealerId)
      .orderBy("createdAt", "desc");

    if (filters?.type) {
      query = query.where("type", "==", filters.type);
    }

    // Date range filtering (using Timestamp)
    if (filters?.startDate) {
      const startTimestamp = Timestamp.fromDate(filters.startDate);
      query = query.where("createdAt", ">=", startTimestamp);
    }

    if (filters?.endDate) {
      const endTimestamp = Timestamp.fromDate(filters.endDate);
      query = query.where("createdAt", "<=", endTimestamp);
    }

    if (filters?.uid) {
      // Filter by user (either fromUid or toUid)
      // Since Firestore doesn't support OR queries easily, we'll filter in-memory
      // For better performance, we could use two queries and merge
    }

    if (filters?.limit) {
      query = query.limit(filters.limit || 1000);
    }

    if (filters?.startAfter) {
      const startAfterDoc = await db.collection(COLLECTION).doc(filters.startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const snapshot = await query.get();
    let transactions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TransactionDocument & { id: string });

    // Filter by UID if provided (in-memory filter since Firestore doesn't support OR easily)
    if (filters?.uid) {
      transactions = transactions.filter(
        (tx) => tx.fromUid === filters.uid || tx.toUid === filters.uid
      );
    }

    // Filter by date range in-memory (if not already filtered in query)
    // Note: The query above should handle date filtering, but we do in-memory as fallback
    if (filters?.startDate || filters?.endDate) {
      transactions = transactions.filter((tx) => {
        const txDate = tx.createdAt.toDate();
        if (filters.startDate && txDate < filters.startDate) {
          return false;
        }
        if (filters.endDate && txDate > filters.endDate) {
          return false;
        }
        return true;
      });
    }

    return transactions;
  } catch (error) {
    console.error(`Error getting transactions for dealer ${dealerId}:`, error);
    throw error;
  }
}

/**
 * List all transactions (superadmin only)
 * Optional filters: dealerId, type, date range, user UID
 */
export async function listAllTransactions(filters?: TransactionFilters): Promise<(TransactionDocument & { id: string })[]> {
  try {
    let query: Query = db.collection(COLLECTION).orderBy("createdAt", "desc");

    if (filters?.dealerId) {
      query = query.where("dealerId", "==", filters.dealerId);
    }

    if (filters?.type) {
      query = query.where("type", "==", filters.type);
    }

    // Date range filtering (using Timestamp)
    if (filters?.startDate) {
      const startTimestamp = Timestamp.fromDate(filters.startDate);
      query = query.where("createdAt", ">=", startTimestamp);
    }

    if (filters?.endDate) {
      const endTimestamp = Timestamp.fromDate(filters.endDate);
      query = query.where("createdAt", "<=", endTimestamp);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit || 1000);
    }

    if (filters?.startAfter) {
      const startAfterDoc = await db.collection(COLLECTION).doc(filters.startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }

    const snapshot = await query.get();
    let transactions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TransactionDocument & { id: string });

    // Filter by UID if provided (in-memory filter since Firestore doesn't support OR easily)
    if (filters?.uid) {
      transactions = transactions.filter(
        (tx) => tx.fromUid === filters.uid || tx.toUid === filters.uid
      );
    }

    // Filter by date range in-memory (if not already filtered in query)
    // Note: The query above should handle date filtering, but we do in-memory as fallback
    if (filters?.startDate || filters?.endDate) {
      transactions = transactions.filter((tx) => {
        const txDate = tx.createdAt.toDate();
        if (filters.startDate && txDate < filters.startDate) {
          return false;
        }
        if (filters.endDate && txDate > filters.endDate) {
          return false;
        }
        return true;
      });
    }

    return transactions;
  } catch (error) {
    console.error("Error listing all transactions:", error);
    throw error;
  }
}
