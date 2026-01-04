import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// Import sync function
import { syncFixturesLatest } from "./sync/syncFixturesLatest";

type Role = "superadmin" | "dealer" | "user";

/**
 * Set default role claim when a user is created
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    await auth.setCustomUserClaims(user.uid, {
      role: "user",
    });
    functions.logger.info(`Set default role 'user' for user ${user.uid}`);
  } catch (error) {
    functions.logger.error(`Error setting default role for user ${user.uid}:`, error);
    throw error;
  }
});

/**
 * Verify that the caller is a superadmin
 */
async function requireSuperadmin(context: functions.https.CallableContext): Promise<void> {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const user = await auth.getUser(context.auth.uid);
  const claims = user.customClaims as { role?: Role } | undefined;

  if (claims?.role !== "superadmin") {
    throw new functions.https.HttpsError("permission-denied", "Only superadmin can perform this action");
  }
}

/**
 * Verify that the caller is a superadmin or dealer
 */
async function requireSuperadminOrDealer(context: functions.https.CallableContext): Promise<{ role: Role; dealerId?: string }> {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const user = await auth.getUser(context.auth.uid);
  const claims = user.customClaims as { role?: Role; dealerId?: string } | undefined;

  if (!claims?.role || (claims.role !== "superadmin" && claims.role !== "dealer")) {
    throw new functions.https.HttpsError("permission-denied", "Only superadmin or dealer can perform this action");
  }

  return {
    role: claims.role,
    dealerId: claims.dealerId,
  };
}

/**
 * Set user role and dealerId (superadmin only)
 */
export const setUserRole = functions.https.onCall(async (data, context) => {
  await requireSuperadmin(context);

  const { uid, role, dealerId } = data as {
    uid: string;
    role: Role;
    dealerId?: string;
  };

  if (!uid || !role) {
    throw new functions.https.HttpsError("invalid-argument", "uid and role are required");
  }

  if (!["superadmin", "dealer", "user"].includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid role");
  }

  try {
    const claims: { role: Role; dealerId?: string } = { role };

    // If role is 'dealer', dealerId is required
    if (role === "dealer") {
      if (!dealerId) {
        throw new functions.https.HttpsError("invalid-argument", "dealerId is required when role is 'dealer'");
      }
      claims.dealerId = dealerId;
    } else if (dealerId) {
      // If user belongs to a dealer, set dealerId
      claims.dealerId = dealerId;
    }

    await auth.setCustomUserClaims(uid, claims);
    functions.logger.info(`Set role '${role}' for user ${uid}`);

    return { success: true };
  } catch (error) {
    functions.logger.error(`Error setting role for user ${uid}:`, error);
    throw new functions.https.HttpsError("internal", "Failed to set user role");
  }
});

/**
 * Create a dealer (superadmin only)
 */
export const createDealer = functions.https.onCall(async (data, context) => {
  await requireSuperadmin(context);

  const { dealerId, name, userId } = data as {
    dealerId: string;
    name: string;
    userId?: string;
  };

  if (!dealerId || !name) {
    throw new functions.https.HttpsError("invalid-argument", "dealerId and name are required");
  }

  try {
    // Create dealer document in Firestore
    await db.collection("dealers").doc(dealerId).set({
      name,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(`Created dealer ${dealerId}`);

    // If userId is provided, set dealerId claim for that user
    if (userId) {
      const user = await auth.getUser(userId);
      const currentClaims = (user.customClaims as { role?: Role; dealerId?: string }) || {};
      await auth.setCustomUserClaims(userId, {
        ...currentClaims,
        dealerId,
      });
      functions.logger.info(`Set dealerId '${dealerId}' for user ${userId}`);
    }

    return { success: true, dealerId };
  } catch (error) {
    functions.logger.error(`Error creating dealer ${dealerId}:`, error);
    throw new functions.https.HttpsError("internal", "Failed to create dealer");
  }
});

/**
 * Create a user (superadmin or dealer)
 * Dealers can only create users with their own dealerId
 */
export const createUser = functions.https.onCall(async (data, context) => {
  const callerInfo = await requireSuperadminOrDealer(context);

  const { email, password, role, dealerId } = data as {
    email: string;
    password: string;
    role: Role;
    dealerId?: string;
  };

  if (!email || !password || !role) {
    throw new functions.https.HttpsError("invalid-argument", "email, password, and role are required");
  }

  if (!["superadmin", "dealer", "user"].includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid role");
  }

  // If caller is a dealer, they can only create users with their own dealerId
  let finalDealerId = dealerId;
  if (callerInfo.role === "dealer") {
    if (!callerInfo.dealerId) {
      throw new functions.https.HttpsError("permission-denied", "Dealer must have a dealerId");
    }
    // Dealers cannot create other dealers
    if (role === "dealer") {
      throw new functions.https.HttpsError("permission-denied", "Dealers cannot create other dealers");
    }
    // Force dealerId to be the caller's dealerId
    finalDealerId = callerInfo.dealerId;
  }

  try {
    // Create user with Firebase Admin SDK
    const userRecord = await auth.createUser({
      email,
      password,
    });

    // Set custom claims based on role
    const claims: { role: Role; dealerId?: string } = { role };
    if (role === "dealer" && finalDealerId) {
      claims.dealerId = finalDealerId;
    } else if (finalDealerId) {
      // If user belongs to a dealer, set dealerId
      claims.dealerId = finalDealerId;
    }

    await auth.setCustomUserClaims(userRecord.uid, claims);
    functions.logger.info(`Created user ${userRecord.uid} with role '${role}'`);

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    functions.logger.error(`Error creating user:`, error);
    throw new functions.https.HttpsError("internal", "Failed to create user");
  }
});

/**
 * Scheduled function to sync latest fixtures from SportMonks API
 * Runs every 5 minutes in production
 */
export const syncFixturesLatestScheduled = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async (context) => {
    functions.logger.info(
      `syncFixturesLatestScheduled triggered at ${context.timestamp}`
    );
    await syncFixturesLatest();
  });
