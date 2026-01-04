import "server-only";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// Ensure Firebase Admin is initialized (will be initialized by admin.ts)
// This import ensures admin.ts is loaded first
import "@/lib/firebase-admin/admin";

// Export Firestore database instance
// Uses the default app instance initialized in admin.ts
export const db: Firestore = getFirestore();
