import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksStageSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeStages } from "@/lib/sportmonks/dto";
import { withRateLimit } from "@/lib/rateLimit/middleware";

const QuerySchema = z.object({
  seasonId: z.string().optional(),
  locale: z.string().optional(),
});

/**
 * GET /api/sm/stages?seasonId=123&locale=en
 * Fetch stages from SportMonks API (1-5 min cache)
 */
async function handler(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      seasonId: searchParams.get("seasonId") || undefined,
      locale: searchParams.get("locale") || undefined,
    });

    const seasonId = query.seasonId ? Number(query.seasonId) : undefined;
    const response = await sportmonksClient.getStages(seasonId, query.locale);
    const validated = SportMonksResponseSchema.parse(response);
    const stages = (validated.data as unknown[]).map((item) =>
      SportMonksStageSchema.parse(item)
    );
    const normalized = normalizeStages(stages);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching stages:", error);
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
      { error: "Failed to fetch stages" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler);
