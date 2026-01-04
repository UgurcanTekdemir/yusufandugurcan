"use server";

import { z } from "zod";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import { createDealer as createDealerDoc } from "@/server/repositories/dealers.repository";
import { createUser as createUserDoc } from "@/server/repositories/users.repository";
import { auth } from "@/lib/firebase-admin/admin";
import type { Role } from "@/features/rbac/types";

// Zod schemas
const DealerIdSchema = z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, "Invalid dealerId format");
const NameSchema = z.string().min(1).max(200, "Name must be at most 200 characters");
const EmailSchema = z.string().email("Invalid email format");
const PasswordSchema = z.string().min(6, "Password must be at least 6 characters");
const RoleSchema = z.enum(["superadmin", "dealer", "user"]);

const CreateDealerActionSchema = z.object({
  dealerId: DealerIdSchema,
  name: NameSchema,
});

const CreateUserActionSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  role: RoleSchema,
  dealerId: z.string().optional(),
});

export interface CreateDealerActionResult {
  success: boolean;
  dealerId?: string;
  error?: string;
}

export interface CreateUserActionResult {
  success: boolean;
  uid?: string;
  error?: string;
}

/**
 * Server action to create a dealer (superadmin only)
 * Validates superadmin role and creates dealer document
 */
export async function createDealerAction(
  params: z.infer<typeof CreateDealerActionSchema>
): Promise<CreateDealerActionResult> {
  try {
    // Validate input
    const validated = CreateDealerActionSchema.parse(params);

    // Get caller and validate RBAC
    const caller = await getServerAuthUser();
    if (!caller) {
      return { success: false, error: "Unauthorized" };
    }

    const callerRole = caller.role as Role | undefined;

    // Only superadmin can create dealers
    if (callerRole !== "superadmin") {
      return { success: false, error: "Access denied: Only superadmin can create dealers" };
    }

    // Create dealer document in Firestore
    await createDealerDoc(validated.dealerId, {
      name: validated.name,
      createdBy: caller.uid,
    });

    return { success: true, dealerId: validated.dealerId };
  } catch (error) {
    console.error("Error creating dealer:", error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map((e) => e.message).join(", ") };
    }
    if (error instanceof Error) {
      // Handle Firestore errors
      if (error.message.includes("already exists") || error.message.includes("ALREADY_EXISTS")) {
        return { success: false, error: "Dealer already exists" };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "An error occurred" };
  }
}

/**
 * Server action to create a user (superadmin only)
 * Validates superadmin role and creates user in Auth and Firestore
 * Can assign dealerId (optional)
 */
export async function createUserActionAdmin(
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

    // Only superadmin can use this action
    if (callerRole !== "superadmin") {
      return { success: false, error: "Access denied: Only superadmin can create users" };
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: validated.email,
      password: validated.password,
    });

    // Set custom claims based on role
    const claims: { role: Role; dealerId?: string } = { role: validated.role };
    
    if (validated.role === "dealer" && validated.dealerId) {
      claims.dealerId = validated.dealerId;
    } else if (validated.dealerId) {
      // If user belongs to a dealer, set dealerId
      claims.dealerId = validated.dealerId;
    }

    await auth.setCustomUserClaims(userRecord.uid, claims);

    // Create user document in Firestore
    await createUserDoc(userRecord.uid, {
      role: validated.role,
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

