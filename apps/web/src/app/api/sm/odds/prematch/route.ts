import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksOddsSchema,
  SportMonksSingleResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeOdds } from "@/lib/sportmonks/dto";
import { BET365_BOOKMAKER_ID } from "@repo/shared/constants";
import { withRateLimit } from "@/lib/rateLimit/middleware";

const QuerySchema = z.object({
  fixtureId: z.string().min(1),
  bookmakerId: z.string().optional(),
  locale: z.string().optional(),
});

/**
 * GET /api/sm/odds/prematch?fixtureId=123&bookmakerId=2&locale=en
 * Fetch prematch odds for a fixture with bookmaker filter (30-120s cache)
 * Uses bet365 (ID=2) by default
 */
async function handler(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      fixtureId: searchParams.get("fixtureId"),
      bookmakerId: searchParams.get("bookmakerId") || undefined,
      locale: searchParams.get("locale") || undefined,
    });

    const fixtureId = Number(query.fixtureId);
    const bookmakerId = query.bookmakerId ? Number(query.bookmakerId) : BET365_BOOKMAKER_ID;

    const response = await sportmonksClient.getPrematchOddsByFixture(fixtureId, bookmakerId, query.locale);
    const validated = SportMonksSingleResponseSchema.parse(response);
    const odds = SportMonksOddsSchema.parse(validated.data);
    const normalized = normalizeOdds(odds, bookmakerId);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching prematch odds:", error);
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
      { error: "Failed to fetch prematch odds" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler);
