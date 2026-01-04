import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import { SportMonksResponseSchema } from "@/lib/sportmonks/schemas";
import { withRateLimit } from "@/lib/rateLimit/middleware";

const QuerySchema = z.object({
  search: z.string().optional(),
  locale: z.string().optional(),
});

/**
 * GET /api/sm/core/regions?search=query&locale=en
 * Fetch regions from SportMonks API (24h cache)
 */
async function handler(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      search: searchParams.get("search") || undefined,
      locale: searchParams.get("locale") || undefined,
    });

    const response = await sportmonksClient.getRegions(query.search, query.locale);
    const validated = SportMonksResponseSchema.parse(response);

    return NextResponse.json(validated.data);
  } catch (error) {
    console.error("Error fetching regions:", error);
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
      { error: "Failed to fetch regions" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler);

