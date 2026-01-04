import "server-only";
import { db } from "@/lib/firebase-admin/db";
import type {
  DealerDocument,
  CreateDealerData,
} from "./types";
import { FieldValue } from "firebase-admin/firestore";

const COLLECTION = "dealers";

/**
 * Get a dealer document by dealerId
 */
export async function getDealer(dealerId: string): Promise<DealerDocument | null> {
  try {
    const doc = await db.collection(COLLECTION).doc(dealerId).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data() as DealerDocument;
  } catch (error) {
    console.error(`Error getting dealer ${dealerId}:`, error);
    throw error;
  }
}

/**
 * Create a dealer document
 */
export async function createDealer(
  dealerId: string,
  data: CreateDealerData
): Promise<void> {
  try {
    await db.collection(COLLECTION).doc(dealerId).set({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error creating dealer ${dealerId}:`, error);
    throw error;
  }
}

/**
 * Update a dealer document
 */
export async function updateDealer(
  dealerId: string,
  data: Partial<CreateDealerData>
): Promise<void> {
  try {
    await db.collection(COLLECTION).doc(dealerId).update(data);
  } catch (error) {
    console.error(`Error updating dealer ${dealerId}:`, error);
    throw error;
  }
}

/**
 * List all dealers
 */
export async function listAllDealers(): Promise<(DealerDocument & { dealerId: string })[]> {
  try {
    const snapshot = await db.collection(COLLECTION).get();
    return snapshot.docs.map(
      (doc) => ({ dealerId: doc.id, ...doc.data() }) as DealerDocument & { dealerId: string }
    );
  } catch (error) {
    console.error("Error listing dealers:", error);
    throw error;
  }
}

/**
 * List all dealers (alias for backwards compatibility)
 * @deprecated Use listAllDealers instead
 */
export async function listDealers(): Promise<DealerDocument[]> {
  const dealers = await listAllDealers();
  return dealers;
}
