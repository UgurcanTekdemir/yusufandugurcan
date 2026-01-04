"use server";

import { z } from "zod";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import { getUser, createUser as createUserDoc, updateUser } from "@/server/repositories/users.repository";
import { auth } from "@/lib/firebase-admin/admin";
import type { Role } from "@/features/rbac/types";

// Zod schemas
const UidSchema = z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, "Invalid UID format");
const EmailSchema = z.string().email("Invalid email format");
const PasswordSchema = z.string().min(6, "Password must be at least 6 characters");
const DealerIdSchema = z.string().min(1);

const CreateUserActionSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  dealerId: DealerIdSchema,
});

const BanUserActionSchema = z.object({
  uid: UidSchema,
});

const UnbanUserActionSchema = z.object({
  uid: UidSchema,
});

export interface GetCurrentUserResult {
  success: boolean;
  uid?: string;
  dealerId?: string;
  error?: string;
}

export interface GetCurrentUserActionResult {
  success: boolean;
  uid?: string;
  role?: Role;
  dealerId?: string;
  error?: string;
}

export interface CreateUserActionResult {
  success: boolean;
  uid?: string;
  error?: string;
}

export interface BanUserActionResult {
  success: boolean;
  error?: string;
}

export interface UnbanUserActionResult {
  success: boolean;
  error?: string;
}

/**
 * Server action to get current user info (uid and dealerId)
 */
export async function getCurrentUserAction(): Promise<GetCurrentUserActionResult> {
  try {
    const caller = await getServerAuthUser();
    if (!caller) {
      return { success: false, error: "Unauthorized" };
    }

    const role = caller.role as Role | undefined;
    const dealerId = caller.dealerId as string | undefined;

    return {
      success: true,
      uid: caller.uid,
      role,
      dealerId,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unknown error occurred" };
  }
}

/**
 * Server action to create a user
 * Validates dealer scope and creates user in Auth and Firestore
 */
export async function createUserAction(
  params: z.infer<typeof CreateUserActionSchema>
): Promise<CreateUserActionResult> {
  try {
    // Validate input
    const validated = CreateUserActionSchema.parse(params);

    // Get caller and validate RBAC
    const caller = await getServerAuthUser();
    if (!caller) {
      return { success: false, error: "Unauthorized" };
    }

    const callerRole = caller.role as Role | undefined;
    const callerDealerId = caller.dealerId as string | undefined;

    // Only dealers can create users (superadmins would use different flow)
    if (callerRole !== "dealer") {
      return { success: false, error: "Access denied: Only dealers can create users" };
    }

    // Validate dealer scope
    if (!callerDealerId || callerDealerId !== validated.dealerId) {
      return { success: false, error: "Access denied: Dealer can only create users for their own dealerId" };
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: validated.email,
      password: validated.password,
    });

    // Set custom claims (role='user', dealerId)
    await auth.setCustomUserClaims(userRecord.uid, {
      role: "user",
      dealerId: validated.dealerId,
    });

    // Create user document in Firestore
    await createUserDoc(userRecord.uid, {
      role: "user",
      dealerId: validated.dealerId,
      status: "active",
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    console.error("Error creating user:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map((e) => e.message).join(", ") };
    }
    if (error instanceof Error) {
      // Handle Firebase Auth errors
      if (error.message.includes("email-already-exists")) {
        return { success: false, error: "Email already exists" };
      }
      if (error.message.includes("invalid-email")) {
        return { success: false, error: "Invalid email format" };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "An error occurred" };
  }
}

/**
 * Server action to ban a user
 * Validates dealer scope and updates user status to 'banned'
 */
export async function banUserAction(
  params: z.infer<typeof BanUserActionSchema>
): Promise<BanUserActionResult> {
  try {
    // Validate input
    const validated = BanUserActionSchema.parse(params);

    // Get caller and validate RBAC
    const caller = await getServerAuthUser();
    if (!caller) {
      return { success: false, error: "Unauthorized" };
    }

    const callerRole = caller.role as Role | undefined;
    const callerDealerId = caller.dealerId as string | undefined;

    // Only dealers can ban users
    if (callerRole !== "dealer") {
      return { success: false, error: "Access denied: Only dealers can ban users" };
    }

    if (!callerDealerId) {
      return { success: false, error: "Access denied: Dealer must have a dealerId" };
    }

    // Get user to verify they belong to dealer
    const user = await getUser(validated.uid);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Validate dealer scope
    if (user.dealerId !== callerDealerId) {
      return { success: false, error: "Access denied: User does not belong to dealer" };
    }

    // Update user status to 'banned'
    await updateUser(validated.uid, { status: "banned" });

    return { success: true };
  } catch (error) {
    console.error("Error banning user:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map((e) => e.message).join(", ") };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An error occurred" };
  }
}

/**
 * Server action to unban a user
 * Validates dealer scope and updates user status to 'active'
 */
export async function unbanUserAction(
  params: z.infer<typeof UnbanUserActionSchema>
): Promise<UnbanUserActionResult> {
  try {
    // Validate input
    const validated = UnbanUserActionSchema.parse(params);

    // Get caller and validate RBAC
    const caller = await getServerAuthUser();
    if (!caller) {
      return { success: false, error: "Unauthorized" };
    }

    const callerRole = caller.role as Role | undefined;
    const callerDealerId = caller.dealerId as string | undefined;

    // Only dealers can unban users
    if (callerRole !== "dealer") {
      return { success: false, error: "Access denied: Only dealers can unban users" };
    }

    if (!callerDealerId) {
      return { success: false, error: "Access denied: Dealer must have a dealerId" };
    }

    // Get user to verify they belong to dealer
    const user = await getUser(validated.uid);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Validate dealer scope
    if (user.dealerId !== callerDealerId) {
      return { success: false, error: "Access denied: User does not belong to dealer" };
    }

    // Update user status to 'active'
    await updateUser(validated.uid, { status: "active" });

    return { success: true };
  } catch (error) {
    console.error("Error unbanning user:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map((e) => e.message).join(", ") };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An error occurred" };
  }
}
