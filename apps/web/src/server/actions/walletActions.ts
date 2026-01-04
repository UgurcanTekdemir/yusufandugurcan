"use server";

import { z } from "zod";
import { creditUser, debitUser } from "@/server/services/walletService";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import type { Role } from "@/features/rbac/types";

// Zod schemas for validation
const UidSchema = z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, "Invalid UID format");
const AmountSchema = z.number().positive("Amount must be positive");
const ReasonSchema = z.string().min(1).max(500, "Reason must be between 1 and 500 characters");

const CreditUserActionSchema = z.object({
  userUid: UidSchema,
  dealerId: z.string().min(1),
  amount: AmountSchema,
  reason: ReasonSchema,
});

const DebitUserActionSchema = z.object({
  userUid: UidSchema,
  dealerId: z.string().min(1),
  amount: AmountSchema,
  reason: ReasonSchema,
});

export interface CreditUserActionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface DebitUserActionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Server action to credit a user's wallet
 * Validates RBAC and dealer scope server-side
 */
export async function creditUserAction(
  params: z.infer<typeof CreditUserActionSchema>
): Promise<CreditUserActionResult> {
  try {
    // Validate input
    const validated = CreditUserActionSchema.parse(params);

    // Get caller and validate RBAC
    const caller = await getServerAuthUser();
    if (!caller) {
      return { success: false, error: "Unauthorized" };
    }

    const callerRole = caller.role as Role | undefined;
    if (callerRole !== "dealer" && callerRole !== "superadmin") {
      return { success: false, error: "Access denied: Only dealers or superadmins can credit users" };
    }

    const callerDealerId = caller.dealerId as string | undefined;
    if (callerRole === "dealer" && (!callerDealerId || callerDealerId !== validated.dealerId)) {
      return { success: false, error: "Access denied: Dealer can only credit users in their dealerId" };
    }

    // Call wallet service
    const transactionId = await creditUser({
      dealerUid: callerRole === "dealer" ? caller.uid : undefined,
      superadminUid: callerRole === "superadmin" ? caller.uid : undefined,
      userUid: validated.userUid,
      dealerId: validated.dealerId,
      amount: validated.amount,
      reason: validated.reason,
    });

    return { success: true, transactionId };
  } catch (error) {
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
 * Server action to debit a user's wallet
 * Validates RBAC and dealer scope server-side
 */
export async function debitUserAction(
  params: z.infer<typeof DebitUserActionSchema>
): Promise<DebitUserActionResult> {
  try {
    // Validate input
    const validated = DebitUserActionSchema.parse(params);

    // Get caller and validate RBAC
    const caller = await getServerAuthUser();
    if (!caller) {
      return { success: false, error: "Unauthorized" };
    }

    const callerRole = caller.role as Role | undefined;
    if (callerRole !== "dealer" && callerRole !== "superadmin") {
      return { success: false, error: "Access denied: Only dealers or superadmins can debit users" };
    }

    const callerDealerId = caller.dealerId as string | undefined;
    if (callerRole === "dealer" && (!callerDealerId || callerDealerId !== validated.dealerId)) {
      return { success: false, error: "Access denied: Dealer can only debit users in their dealerId" };
    }

    // Call wallet service
    const transactionId = await debitUser({
      dealerUid: callerRole === "dealer" ? caller.uid : undefined,
      superadminUid: callerRole === "superadmin" ? caller.uid : undefined,
      userUid: validated.userUid,
      dealerId: validated.dealerId,
      amount: validated.amount,
      reason: validated.reason,
    });

    return { success: true, transactionId };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors.map((e) => e.message).join(", ") };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An error occurred" };
  }
}
