"use client";

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import type { FirebaseOptions } from "firebase/app";

// Firebase configuration - use dummy values if not set (for development)
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dummy-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dummy-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:dummy",
};

// Initialize Firebase app (singleton pattern)
let firebaseApp: FirebaseApp;

if (getApps().length === 0) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0];
}

// Initialize and export Auth instance
// Note: This will fail if Firebase config is invalid, but allows development without real config
export const auth: Auth = getAuth(firebaseApp);

// Connect to Auth emulator in development if enabled
if (
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
) {
  try {
    connectAuthEmulator(auth, process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST, {
      disableWarnings: true,
    });
  } catch (error) {
    // Emulator already connected, ignore error
  }
}

export { firebaseApp as app };
