"use server";

import { z } from "zod";
import { createSlip, listUserSlips, listDealerSlips, listAllSlipsService } from "@/server/services/slipService";
import { getServerAuthUser } from "@/lib/auth/serverAuth";
import type { Role } from "@/features/rbac/types";

// Zod schemas for validation
const SlipLineSchema = z.object({
  id: z.string().min(1),
  fixtureId: z.union([z.string(), z.number()]),
  market: z.string().min(1),
  selection: z.string().min(1),
  odds: z.number().positive("Odds must be positive"),
});

const CreateSlipActionSchema = z.object({
  uid: z.string().min(1),
  dealerId: z.string().min(1),
  stake: z.number().positive("Stake must be positive"),
  lines: z.array(SlipLineSchema).min(1, "At least one line is required"),
});

export interface CreateSlipActionResult {
  success: boolean;
  slipId?: string;
  error?: string;
}

/**
 * Server action to create a slip
 * Validates input, caller, and creates slip with atomic balance check
 */
export async function createSlipAction(
  params: z.infer<typeof CreateSlipActionSchema>
): Promise<CreateSlipActionResult> {
  try {
    // Validate input
    const validated = CreateSlipActionSchema.parse(params);

    // Get caller and validate
    const caller = await getServerAuthUser();
    if (!caller) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate caller is the user (uid matches)
    if (caller.uid !== validated.uid) {
      return { success: false, error: "Access denied: Can only create slips for yourself" };
    }

    // Call slip service
    const slipId = await createSlip(validated);

    return { success: true, slipId };
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
 * Server action to list user's slips
 */
export async function listUserSlipsAction() {
  try {
    const caller = await getServerAuthUser();
    if (!caller) {
      throw new Error("Unauthorized");
    }

    const slips = await listUserSlips(caller.uid);
    return { success: true, slips };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message, slips: [] };
    }
    return { success: false, error: "An error occurred", slips: [] };
  }
}

/**
 * Server action to list dealer's slips
 */
export async function listDealerSlipsAction(dealerId: string) {
  try {
    const caller = await getServerAuthUser();
    if (!caller) {
      throw new Error("Unauthorized");
    }

    const callerRole = caller.role as Role | undefined;
    if (callerRole !== "dealer" && callerRole !== "superadmin") {
      throw new Error("Access denied: Only dealers or superadmins can list dealer slips");
    }

    const callerDealerId = caller.dealerId as string | undefined;
    if (callerRole === "dealer" && (!callerDealerId || callerDealerId !== dealerId)) {
      throw new Error("Access denied: Dealer can only list slips for their own dealerId");
    }

    const slips = await listDealerSlips(dealerId);
    return { success: true, slips };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message, slips: [] };
    }
    return { success: false, error: "An error occurred", slips: [] };
  }
}

/**
 * Server action to list all slips (superadmin only)
 */
export async function listAllSlipsAction() {
  try {
    const caller = await getServerAuthUser();
    if (!caller) {
      throw new Error("Unauthorized");
    }

    const callerRole = caller.role as Role | undefined;
    if (callerRole !== "superadmin") {
      throw new Error("Access denied: Only superadmin can list all slips");
    }

    const slips = await listAllSlipsService();
    return { success: true, slips };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message, slips: [] };
    }
    return { success: false, error: "An error occurred", slips: [] };
  }
}
