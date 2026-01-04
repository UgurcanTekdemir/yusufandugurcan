import "server-only";
import * as admin from "firebase-admin";

let app: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 * In development, this will only initialize if FIREBASE_SERVICE_ACCOUNT_KEY is set
 */
export function initializeAdmin() {
  if (app) {
    return app;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  // In development, allow running without service account key for frontend-only testing
  if (!serviceAccountKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set"
      );
    }
    // Development mode: return null, admin SDK won't be initialized
    // This allows frontend development without Firebase backend setup
    console.warn(
      "Warning: FIREBASE_SERVICE_ACCOUNT_KEY not set. Admin SDK features will not work."
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return app;
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    console.warn("Warning: Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}

/**
 * Get Firebase Admin Auth instance
 * Returns null if admin SDK is not initialized
 */
export function getAuth() {
  const appInstance = initializeAdmin();
  if (!appInstance) {
    return null;
  }
  return admin.auth(appInstance);
}

/**
 * Get Firebase Admin Auth instance (throws error if not initialized)
 */
export const auth = new Proxy(
  {} as admin.auth.Auth,
  {
    get(target, prop) {
      const appInstance = initializeAdmin();
      if (!appInstance) {
        throw new Error(
          "Firebase Admin SDK is not initialized. Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable."
        );
      }
      const authInstance = admin.auth(appInstance);
      return (authInstance as any)[prop];
    },
  }
);
