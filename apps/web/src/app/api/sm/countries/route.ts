import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksCountrySchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeCountries } from "@/lib/sportmonks/dto";

/**
 * GET /api/sm/countries
 * Fetch all countries from SportMonks API
 * Updated to use new client methods with query params support
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

