"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { FixtureDTO, OddsDTO } from "@repo/shared/types";
import { TOP_LEAGUES } from "@repo/shared/constants";
import { useBetslipStore } from "@/stores/betslipStore";
import { useAuth } from "@/lib/auth/useAuth";
import { toast } from "react-hot-toast";
import { getMarketLabel, getSelectionLabel } from "@/stores/betslipUtils";
import type { BetslipSelection } from "@/stores/betslipStore";
import { Skeleton } from "../ui/Skeleton";

interface TopLeaguesFixturesProps {
  date?: string;
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Fetch fixtures for a date (all leagues)
async function fetchFixtures(date: string): Promise<FixtureDTO[]> {
  const response = await fetch(`/api/sm/fixtures?date=${date}`);
  if (!response.ok) {
    throw new Error("Failed to fetch fixtures");
  }
  return response.json();
}

// Fetch odds for a fixture
async function fetchOdds(fixtureId: string | number): Promise<OddsDTO> {
  const response = await fetch(`/api/sm/odds/prematch?fixtureId=${fixtureId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch odds");
  }
  return response.json();
}

// Get 1X2 odds from markets
function get1X2Odds(markets: OddsDTO["markets"]) {
  const market = markets.find((m) => m.market === "1X2" || m.market === "1x2");
  if (!market) return undefined;

  const home = market.selections.find((s) => s.selection === "1" || s.selection === "Home");
  const draw = market.selections.find((s) => s.selection === "X" || s.selection === "Draw");
  const away = market.selections.find((s) => s.selection === "2" || s.selection === "Away");

  return {
    home: home?.odds,
    draw: draw?.odds,
    away: away?.odds,
  };
}

// Format kickoff time
function formatKickoffTime(kickoffAt: Date | string): string {
  const date = typeof kickoffAt === "string" ? new Date(kickoffAt) : kickoffAt;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const kickoffDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const daysDiff = Math.floor((kickoffDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff === 0) {
    return "Today " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } else if (daysDiff === 1) {
    return "Tomorrow " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  } else {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return dayNames[date.getDay()] + " " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
}

// Group fixtures by league (for now, just show all in one group)
function groupFixturesByLeague(fixtures: FixtureDTO[]): Record<string, FixtureDTO[]> {
  // Since API doesn't return league info yet, just group all fixtures together
  return {
    "Today's Matches": fixtures,
  };
}

// Filter fixtures by top leagues
function filterTopLeaguesFixtures(fixtures: FixtureDTO[]): FixtureDTO[] {
  const topLeagueIds = new Set(TOP_LEAGUES.map((l) => String(l.id)));
  return fixtures.filter((f) => {
    const leagueId = (f as any).leagueId;
    return leagueId && topLeagueIds.has(String(leagueId));
  });
}

interface FixtureRowProps {
  fixture: FixtureDTO;
  onAddSelection: (selection: BetslipSelection) => void;
}

function FixtureRow({ fixture, onAddSelection }: FixtureRowProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isOddsLoaded, setIsOddsLoaded] = useState(false);
  
  // Fetch odds
  const {
    data: oddsData,
    isLoading: isLoadingOdds,
  } = useQuery<OddsDTO, Error>({
    queryKey: ["odds", "prematch", fixture.fixtureId],
    queryFn: () => fetchOdds(fixture.fixtureId),
    enabled: true, // Always load odds for top leagues
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Track when odds are loaded
  useEffect(() => {
    if (oddsData && !isOddsLoaded) {
      setIsOddsLoaded(true);
    }
  }, [oddsData, isOddsLoaded]);

  const handleAddSelection = (
    marketKey: string,
    selectionKey: string,
    odds: number
  ) => {
    if (!user) {
      toast.error("Kupon oluşturmak için giriş yapmalısınız");
      router.push("/login");
      return;
    }

    const kickoffAtStr = typeof fixture.kickoffAt === "string" 
      ? fixture.kickoffAt 
      : fixture.kickoffAt.toISOString();

    const selection: BetslipSelection = {
      fixtureId: fixture.fixtureId,
      marketKey,
      selectionKey,
      odds,
      homeTeam: fixture.teams.home,
      awayTeam: fixture.teams.away,
      kickoffAt: kickoffAtStr,
      marketLabel: getMarketLabel(marketKey),
      selectionLabel: getSelectionLabel(selectionKey, marketKey),
    };

    onAddSelection(selection);
    toast.success("Seçim kupona eklendi");
  };

  const odds1X2 = oddsData && oddsData.markets ? get1X2Odds(oddsData.markets) : undefined;

  return (
    <div className="flex items-center gap-4 py-3 px-4 border-b border-white/5 hover:bg-white/5 transition-colors">
      {/* Date & Time */}
      <div className="w-24 text-xs text-gray-400 shrink-0">
        {formatKickoffTime(fixture.kickoffAt)}
      </div>

      {/* Teams */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-white font-medium truncate">
            {fixture.teams.home}
          </span>
          <span className="text-sm text-gray-500">vs</span>
          <span className="text-sm text-white font-medium truncate">
            {fixture.teams.away}
          </span>
        </div>
      </div>

      {/* 1X2 Odds */}
      <div className="flex gap-2 shrink-0">
        {isLoadingOdds ? (
          <>
            <Skeleton className="w-16 h-10" />
            <Skeleton className="w-16 h-10" />
            <Skeleton className="w-16 h-10" />
          </>
        ) : odds1X2 ? (
          <>
            {odds1X2.home && (
              <button
                onClick={() => handleAddSelection("1X2", "1", odds1X2.home!)}
                className="min-w-[64px] px-3 py-2 bg-[#2a2a35] hover:bg-[#353545] text-white text-sm font-semibold rounded transition-colors"
              >
                {odds1X2.home.toFixed(2)}
              </button>
            )}
            {odds1X2.draw && (
              <button
                onClick={() => handleAddSelection("1X2", "X", odds1X2.draw!)}
                className="min-w-[64px] px-3 py-2 bg-[#2a2a35] hover:bg-[#353545] text-white text-sm font-semibold rounded transition-colors"
              >
                {odds1X2.draw.toFixed(2)}
              </button>
            )}
            {odds1X2.away && (
              <button
                onClick={() => handleAddSelection("1X2", "2", odds1X2.away!)}
                className="min-w-[64px] px-3 py-2 bg-[#2a2a35] hover:bg-[#353545] text-white text-sm font-semibold rounded transition-colors"
              >
                {odds1X2.away.toFixed(2)}
              </button>
            )}
          </>
        ) : (
          <span className="text-xs text-gray-500">No odds</span>
        )}
      </div>
    </div>
  );
}

export function TopLeaguesFixtures({ date }: TopLeaguesFixturesProps) {
  const addSelection = useBetslipStore((state) => state.addSelection);
  const today = date || new Date().toISOString().split("T")[0];

  const {
    data: fixtures = [],
    isLoading,
    isError,
    error,
  } = useQuery<FixtureDTO[], Error>({
    queryKey: ["fixtures", "top-leagues", today],
    queryFn: () => fetchFixtures(today),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // For now, show all fixtures (API doesn't return league info yet)
  // TODO: Filter by top leagues when API includes league info
  const grouped = groupFixturesByLeague(fixtures);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-white/5 p-3">
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-text-muted text-sm">
          Fixtures yüklenirken hata oluştu: {error?.message || "Unknown error"}
        </p>
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-text-muted text-sm">Bu tarih için maç bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([leagueName, leagueFixtures]) => (
        <div key={leagueName}>
          {/* League Header */}
          <div className="px-4 py-2 bg-[#1a1a1f] border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">{leagueName}</h3>
          </div>

          {/* Fixtures */}
          <div className="bg-[#15151a]">
            {leagueFixtures.map((fixture) => (
              <FixtureRow
                key={fixture.fixtureId}
                fixture={fixture}
                onAddSelection={addSelection}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

