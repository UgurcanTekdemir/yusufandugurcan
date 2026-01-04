import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Cache version document structure
 */
export interface CacheVersionDocument {
  version: number;
  updatedAt: admin.firestore.Timestamp;
}

const CACHE_STATE_COLLECTION = "cache_state";
const CACHE_VERSION_DOC_ID = "cacheVersion";

/**
 * Increment cache version and return new version
 */
export async function incrementCacheVersion(): Promise<number> {
  try {
    const docRef = db
      .collection(CACHE_STATE_COLLECTION)
      .doc(CACHE_VERSION_DOC_ID);

    // Use transaction to atomically increment version
    return await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      let newVersion = 1;
      if (doc.exists) {
        const data = doc.data() as CacheVersionDocument;
        newVersion = (data.version || 0) + 1;
      }

      transaction.set(
        docRef,
        {
          version: newVersion,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return newVersion;
    });
  } catch (error) {
    console.error("Error incrementing cache version:", error);
    throw error;
  }
}

/**
 * Get current cache version
 */
export async function getCacheVersion(): Promise<number> {
  try {
    const doc = await db
      .collection(CACHE_STATE_COLLECTION)
      .doc(CACHE_VERSION_DOC_ID)
      .get();

    if (!doc.exists) {
      return 0;
    }

    const data = doc.data() as CacheVersionDocument;
    return data.version || 0;
  } catch (error) {
    console.error("Error getting cache version:", error);
    throw error;
  }
}

