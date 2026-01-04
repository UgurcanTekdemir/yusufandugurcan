import "server-only";
import { db } from "@/lib/firebase-admin/db";
import type {
  UserDocument,
  CreateUserData,
} from "./types";
import { FieldValue, Query } from "firebase-admin/firestore";

const COLLECTION = "users";

/**
 * Get a user document by UID
 */
export async function getUser(uid: string): Promise<UserDocument | null> {
  try {
    const doc = await db.collection(COLLECTION).doc(uid).get();
    if (!doc.exists) {
      return null;
    }
    return doc.data() as UserDocument;
  } catch (error) {
    console.error(`Error getting user ${uid}:`, error);
    throw error;
  }
}

/**
 * Create a user document
 */
export async function createUser(
  uid: string,
  data: CreateUserData
): Promise<void> {
  try {
    await db.collection(COLLECTION).doc(uid).set({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error(`Error creating user ${uid}:`, error);
    throw error;
  }
}

/**
 * Update a user document
 */
export async function updateUser(
  uid: string,
  data: Partial<CreateUserData>
): Promise<void> {
  try {
    await db.collection(COLLECTION).doc(uid).update(data);
  } catch (error) {
    console.error(`Error updating user ${uid}:`, error);
    throw error;
  }
}

/**
 * Delete a user document
 */
export async function deleteUser(uid: string): Promise<void> {
  try {
    await db.collection(COLLECTION).doc(uid).delete();
  } catch (error) {
    console.error(`Error deleting user ${uid}:`, error);
    throw error;
  }
}

/**
 * List users by dealerId
 */
export async function listUsersByDealerId(
  dealerId: string
): Promise<(UserDocument & { uid: string })[]> {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .where("dealerId", "==", dealerId)
      .get();
    return snapshot.docs.map(
      (doc) => ({ uid: doc.id, ...doc.data() }) as UserDocument & { uid: string }
    );
  } catch (error) {
    console.error(`Error listing users for dealer ${dealerId}:`, error);
    throw error;
  }
}

/**
 * List all users (superadmin only)
 * Optional filters: dealerId, role
 */
export async function listAllUsers(filters?: {
  dealerId?: string;
  role?: "superadmin" | "dealer" | "user";
}): Promise<(UserDocument & { uid: string })[]> {
  try {
    let query: Query = db.collection(COLLECTION) as Query;

    if (filters?.dealerId) {
      query = query.where("dealerId", "==", filters.dealerId);
    }

    if (filters?.role) {
      query = query.where("role", "==", filters.role);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(
      (doc) => ({ uid: doc.id, ...doc.data() }) as UserDocument & { uid: string }
    );
  } catch (error) {
    console.error("Error listing all users:", error);
    throw error;
  }
}
