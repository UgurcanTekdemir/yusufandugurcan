import "server-only";
import { NextResponse } from "next/server";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksCountrySchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeCountries } from "@/lib/sportmonks/dto";

/**
 * GET /api/sm/countries
 * Fetch all countries from SportMonks API
 */
export async function GET() {
  try {
    const response = await sportmonksClient.getCountries();
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

