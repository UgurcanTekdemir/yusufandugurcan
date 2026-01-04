import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksCountrySchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeCountries } from "@/lib/sportmonks/dto";
import { withRateLimit } from "@/lib/rateLimit/middleware";

/**
 * GET /api/sm/countries?locale=en
 * Fetch countries from SportMonks API (24h cache)
 */
async function handler(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get("locale") || undefined;

    const response = await sportmonksClient.getCountries(locale);
    const validated = SportMonksResponseSchema.parse(response);
    const countries = (validated.data as unknown[]).map((item) =>
      SportMonksCountrySchema.parse(item)
    );
    const normalized = normalizeCountries(countries);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching countries:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler);
