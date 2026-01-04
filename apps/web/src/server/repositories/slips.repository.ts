import "server-only";
import { db } from "@/lib/firebase-admin/db";
import type {
  SlipDocument,
  CreateSlipData,
} from "./types";
import { FieldValue, Query, Timestamp } from "firebase-admin/firestore";

const COLLECTION = "slips";

export interface SlipFilters {
  dealerId?: string;
  status?: string;
  limit?: number;
  startAfter?: string; // slip ID for pagination
  startDate?: Date; // Start date for date range filter
  endDate?: Date; // End date for date range filter
}

/**
 * Get a slip document by slip ID
 */
export async function getSlip(slipId: string): Promise<SlipDocument | null> {
  try {
    const doc = await db.collection(COLLECTION).doc(slipId).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data() as SlipDocument;
  } catch (error) {
    console.error(`Error getting slip ${slipId}:`, error);
    throw error;
  }
}

/**
 * Create a slip document (generates ID)
 */
export async function createSlip(data: CreateSlipData): Promise<string> {
  try {
    const docRef = await db.collection(COLLECTION).add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating slip:", error);
    throw error;
  }
}

/**
 * Update a slip document
 */
export async function updateSlip(
  slipId: string,
  data: Partial<CreateSlipData>
): Promise<void> {
  try {
    await db.collection(COLLECTION).doc(slipId).update(data);
  } catch (error) {
    console.error(`Error updating slip ${slipId}:`, error);
    throw error;
  }
}

/**
 * Get slips for a specific user
 */
export async function getUserSlips(
  userId: string,
  filters?: SlipFilters
): Promise<SlipDocument[]> {
  try {
    let query: Query = db.collection(COLLECTION)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc");

    if (filters?.status) {
      query = query.where("status", "==", filters.status);
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
    return snapshot.docs.map((doc) => doc.data() as SlipDocument);
  } catch (error) {
    console.error(`Error getting slips for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get slips for a specific dealer
 */
export async function getDealerSlips(
  dealerId: string,
  filters?: SlipFilters
): Promise<SlipDocument[]> {
  try {
    let query: Query = db.collection(COLLECTION)
      .where("dealerId", "==", dealerId)
      .orderBy("createdAt", "desc");

    if (filters?.status) {
      query = query.where("status", "==", filters.status);
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
    return snapshot.docs.map((doc) => doc.data() as SlipDocument);
  } catch (error) {
    console.error(`Error getting slips for dealer ${dealerId}:`, error);
    throw error;
  }
}

/**
 * List all slips (superadmin only)
 */
export async function listAllSlips(filters?: SlipFilters): Promise<(SlipDocument & { id: string })[]> {
  try {
    let query: Query = db.collection(COLLECTION).orderBy("createdAt", "desc");

    if (filters?.dealerId) {
      query = query.where("dealerId", "==", filters.dealerId);
    }

    if (filters?.status) {
      query = query.where("status", "==", filters.status);
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
    let slips = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SlipDocument & { id: string });

    // Filter by date range in-memory (if not already filtered in query)
    // Note: The query above should handle date filtering, but we do in-memory as fallback
    if (filters?.startDate || filters?.endDate) {
      slips = slips.filter((slip) => {
        const slipDate = slip.createdAt.toDate();
        if (filters.startDate && slipDate < filters.startDate) {
          return false;
        }
        if (filters.endDate && slipDate > filters.endDate) {
          return false;
        }
        return true;
      });
    }

    return slips;
  } catch (error) {
    console.error("Error listing all slips:", error);
    throw error;
  }
}
