import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Sync state document structure
 */
export interface SyncStateDocument {
  lastSyncAt: admin.firestore.Timestamp;
  cacheVersion?: number;
}

const SYNC_STATE_COLLECTION = "sync_state";
const SYNC_FIXTURES_LATEST_DOC_ID = "syncFixturesLatest";

/**
 * Get sync state for fixtures latest sync
 */
export async function getSyncState(): Promise<SyncStateDocument | null> {
  try {
    const doc = await db
      .collection(SYNC_STATE_COLLECTION)
      .doc(SYNC_FIXTURES_LATEST_DOC_ID)
      .get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as SyncStateDocument;
  } catch (error) {
    console.error("Error getting sync state:", error);
    throw error;
  }
}

/**
 * Update sync state for fixtures latest sync
 */
export async function updateSyncState(
  updates: Partial<SyncStateDocument>
): Promise<void> {
  try {
    const docRef = db
      .collection(SYNC_STATE_COLLECTION)
      .doc(SYNC_FIXTURES_LATEST_DOC_ID);

    await docRef.set(
      {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating sync state:", error);
    throw error;
  }
}

