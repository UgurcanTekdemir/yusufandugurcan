import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksRoundSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeRounds } from "@/lib/sportmonks/dto";

const QuerySchema = z.object({
  seasonId: z.string().min(1),
  stageId: z.string().optional(),
});

/**
 * GET /api/sm/rounds?seasonId=123&stageId=456
 * Fetch rounds for a season/stage
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      seasonId: searchParams.get("seasonId"),
      stageId: searchParams.get("stageId"),
    });

    const response = await sportmonksClient.getRounds(
      Number(query.seasonId),
      query.stageId ? Number(query.stageId) : undefined
    );
    const validated = SportMonksResponseSchema.parse(response);
    const rounds = (validated.data as unknown[]).map((item) =>
      SportMonksRoundSchema.parse(item)
    );
    const normalized = normalizeRounds(rounds);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching rounds:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch rounds" },
      { status: 500 }
    );
  }
}

