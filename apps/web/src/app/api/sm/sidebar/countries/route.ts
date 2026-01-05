import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksCountrySchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeCountries } from "@/lib/sportmonks/dto";

/**
 * GET /api/sm/sidebar/countries
 * Fetch all countries from SportMonks API
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page");
    const locale = searchParams.get("locale");

    const params: { page?: number; locale?: string } = {};
    if (page) {
      params.page = Number(page);
    }
    if (locale) {
      params.locale = locale;
    }

    const response = await sportmonksClient.getCountries(
      Object.keys(params).length > 0 ? params : undefined
    );
    const validated = SportMonksResponseSchema.parse(response);
    const countries = (validated.data as unknown[]).map((item) =>
      SportMonksCountrySchema.parse(item)
    );
    const normalized = normalizeCountries(countries);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching countries:", error);

    // Parse upstream error status if available
    if (error instanceof Error && error.message.startsWith("SportMonks ")) {
      const match = error.message.match(/SportMonks (\d+): (.+)/);
      if (match) {
        const status = parseInt(match[1]!, 10);
        const body = match[2]!;
        return NextResponse.json(
          { error: `Upstream error: ${error.message}`, upstream: body },
          { status }
        );
      }
    }

    // Upstream schema bozulduysa bu kullanıcı hatası değil:
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Upstream response schema mismatch", details: error.errors },
        { status: 502 }
      );
    }

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

