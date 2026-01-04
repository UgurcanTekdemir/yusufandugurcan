import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import { SportMonksResponseSchema } from "@/lib/sportmonks/schemas";
import { withRateLimit } from "@/lib/rateLimit/middleware";

const QuerySchema = z.object({
  locale: z.string().optional(),
});

/**
 * GET /api/sm/core/continents?locale=en
 * Fetch continents from SportMonks API (24h cache)
 */
async function handler(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      locale: searchParams.get("locale") || undefined,
    });

    const response = await sportmonksClient.getContinents(query.locale);
    const validated = SportMonksResponseSchema.parse(response);

    return NextResponse.json(validated.data);
  } catch (error) {
    console.error("Error fetching continents:", error);
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
      { error: "Failed to fetch continents" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler);

