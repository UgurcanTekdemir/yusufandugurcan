"use client";

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import type { FirebaseOptions } from "firebase/app";

/**
 * Check and log environment variable status
 * Uses static process.env access (required for Next.js client bundle)
 */
function envOrUndefined(name: string, value: string | undefined): string | undefined {
  const status = value ? "OK" : "MISSING";
  console.log(`[ENV CHECK] ${name}: ${status}`);
  return value;
}

// Build Firebase config with static process.env access (required for Next.js client bundle)
const firebaseConfig: FirebaseOptions = {
  apiKey: envOrUndefined("NEXT_PUBLIC_FIREBASE_API_KEY", process.env.NEXT_PUBLIC_FIREBASE_API_KEY) || "",
  authDomain: envOrUndefined("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) || "",
  projectId: envOrUndefined("NEXT_PUBLIC_FIREBASE_PROJECT_ID", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) || "",
  storageBucket: envOrUndefined("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) || "",
  messagingSenderId: envOrUndefined("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) || "",
  appId: envOrUndefined("NEXT_PUBLIC_FIREBASE_APP_ID", process.env.NEXT_PUBLIC_FIREBASE_APP_ID) || "",
};

// Check if all required config values are present
const requiredFields: Array<{ key: keyof FirebaseOptions; envName: string }> = [
  { key: "apiKey", envName: "NEXT_PUBLIC_FIREBASE_API_KEY" },
  { key: "authDomain", envName: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" },
  { key: "projectId", envName: "NEXT_PUBLIC_FIREBASE_PROJECT_ID" },
];

function hasAllClientConfig(): boolean {
  return requiredFields.every((field) => {
    const value = firebaseConfig[field.key];
    return value && value.trim() !== "";
  });
}

// Singleton storage
let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * Get Firebase app instance (null if config is missing or window is undefined)
 */
function getFirebaseApp(): FirebaseApp | null {
  // Client-side only
  if (typeof window === "undefined") {
    return null;
  }

  // Check if config is complete
  if (!hasAllClientConfig()) {
    console.error(
      "[FIREBASE] Missing required environment variables. Firebase will not be initialized. " +
        "Add them to apps/web/.env.local: " +
        requiredFields.map((f) => f.envName).join(", ")
    );
    return null;
  }

  // Return existing app if already initialized
  if (firebaseApp) {
    return firebaseApp;
  }

  // Initialize if not already initialized
  if (getApps().length === 0) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
      console.log("[FIREBASE] Initialized successfully");
    } catch (error) {
      console.error("[FIREBASE] Failed to initialize Firebase:", error);
      return null;
    }
  } else {
    firebaseApp = getApps()[0]!;
  }

  return firebaseApp;
}

/**
 * Get Firebase Auth instance (null if app is null)
 */
function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  if (auth) {
    return auth;
  }

  auth = getAuth(app);

  // Optional: connect to Auth Emulator in development
  if (process.env.NODE_ENV === "development") {
    const host = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
    if (host) {
      const url = host.startsWith("http") ? host : `http://${host}`;
      try {
        if (auth) {
          connectAuthEmulator(auth, url, { disableWarnings: true });
        }
      } catch {
        // already connected
      }
    }
  }

  return auth;
}

// Initialize on module load (client-side only)
if (typeof window !== "undefined") {
  firebaseApp = getFirebaseApp();
  auth = getFirebaseAuth();
}

export { firebaseApp as app, auth };
