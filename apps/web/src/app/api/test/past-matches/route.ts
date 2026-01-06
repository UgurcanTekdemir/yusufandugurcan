import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksFixtureSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeFixtures } from "@/lib/sportmonks/dto";

/**
 * GET /api/test/past-matches?days=7
 * Test endpoint to fetch and list past match results
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7", 10);
    
    const today = new Date();
    const results: Array<{
      date: string;
      matches: Array<{
        fixtureId: string | number;
        homeTeam: string;
        awayTeam: string;
        score?: { home: number; away: number };
        leagueName?: string;
        kickoffAt: string;
        state?: string;
        isFinished: boolean;
      }>;
    }> = [];
    
    // Fetch fixtures for each day in the past
    for (let i = 1; i <= days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        // Fetch fixtures for this date with includes for scores and state
        // Include league for better data
        const response = await sportmonksClient.getFixturesByDate(dateStr, {
          include: "participants:name,image_path,meta;state;scores;league:name",
        });
        
        const validated = SportMonksResponseSchema.parse(response);
        const dataArray = Array.isArray(validated.data) ? validated.data : [];
        const fixtures = dataArray.map((item) => SportMonksFixtureSchema.parse(item));
        
        // Debug: Log raw data for first finished fixture
        if (fixtures.length > 0) {
          const firstFixture = fixtures[0];
          const rawState = firstFixture.state;
          const rawScores = firstFixture.scores;
          const rawParticipants = firstFixture.participants;
          console.log(`[DEBUG ${dateStr}] Raw fixture data:`, {
            id: firstFixture.id,
            state: rawState,
            stateType: typeof rawState,
            scores: rawScores,
            scoresType: typeof rawScores,
            participants: rawParticipants?.map((p: any) => ({
              name: p.name,
              meta: p.meta,
            })),
          });
        }
        
        const normalized = normalizeFixtures(fixtures);
        
        // Filter for finished matches only
        const finishedMatches = normalized.filter(f => f.isFinished === true);
        
        if (finishedMatches.length > 0) {
          results.push({
            date: dateStr,
            matches: finishedMatches.map(m => ({
              fixtureId: m.fixtureId,
              homeTeam: m.homeTeam || m.teams.home,
              awayTeam: m.awayTeam || m.teams.away,
              score: m.score,
              leagueName: m.leagueName,
              kickoffAt: m.kickoffAt,
              state: m.state || null,
              isFinished: m.isFinished,
            })),
          });
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching ${dateStr}:`, error);
        // Continue to next date
      }
    }
    
    // Calculate summary
    const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
    
    return NextResponse.json({
      success: true,
      daysChecked: days,
      totalMatches,
      results,
      summary: {
        datesWithMatches: results.length,
        totalMatches,
        averageMatchesPerDay: results.length > 0 ? (totalMatches / results.length).toFixed(2) : 0,
      },
    });
  } catch (error) {
    console.error("Error in past-matches test:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

