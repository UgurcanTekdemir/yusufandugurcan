import "server-only";
import { NextResponse } from "next/server";
import { requireRole } from "@/features/rbac/requireRole";
import { redisCache } from "@/lib/cache/redisCache";

/**
 * POST /api/sm/cache/bump
 * Admin endpoint to invalidate all cached data by bumping cache version
 * Superadmin only
 */
export async function POST() {
  try {
    // Validate superadmin role
    await requireRole("superadmin");

    // Bump cache version
    const newVersion = await redisCache.bumpVersion();

    return NextResponse.json({
      version: newVersion,
      success: true,
    });
  } catch (error) {
    console.error("Error bumping cache version:", error);
    if (error instanceof Error) {
      // Check if it's an authorization error
      if (error.message.includes("role") || error.message.includes("unauthorized")) {
        return NextResponse.json(
          { error: "Unauthorized: Superadmin role required" },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to bump cache version" },
      { status: 500 }
    );
  }
}

