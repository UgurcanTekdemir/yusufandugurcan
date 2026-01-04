"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FixtureDTO, OddsDTO, MarketOdds } from "@repo/shared/types";
import { Skeleton } from "../ui/Skeleton";
import { useBetslipStore, type BetslipSelection } from "@/stores/betslipStore";
import { getMarketLabel, getSelectionLabel } from "@/stores/betslipUtils";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth/useAuth";

interface FixturesListProps {
  leagueId?: string | null;
  date?: string | null;
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Fetch fixtures
async function fetchFixtures(
  leagueId: string,
  date?: string | null
): Promise<FixtureDTO[]> {
  const params = new URLSearchParams();
  params.set("leagueId", leagueId);
  if (date) {
    params.set("date", date);
  }
  const response = await fetch(`/api/sm/fixtures?${params.toString()}`);
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

// Format kickoff time
function formatKickoffTime(kickoffAt: Date | string): string {
  try {
    const date = typeof kickoffAt === "string" ? new Date(kickoffAt) : kickoffAt;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const fixtureDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const diffDays = Math.floor(
      (fixtureDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (diffDays === 0) {
      return `Today ${timeStr}`;
    } else if (diffDays === 1) {
      return `Tomorrow ${timeStr}`;
    } else if (diffDays === -1) {
      return `Yesterday ${timeStr}`;
    } else {
      return `${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} ${timeStr}`;
    }
  } catch {
    return "TBD";
  }
}

// Filter odds by market type
function filterOddsByMarket(
  markets: MarketOdds[],
  marketType: string
): MarketOdds[] {
  return markets.filter(
    (m) => m.market.toLowerCase() === marketType.toLowerCase()
  );
}

// Get 1X2 odds
function get1X2Odds(markets: MarketOdds[]): {
  home?: number;
  draw?: number;
  away?: number;
} {
  const market1X2 = filterOddsByMarket(markets, "1X2");
  const odds: { home?: number; draw?: number; away?: number } = {};

  for (const market of market1X2) {
    const selection = market.selection.toLowerCase();
    if (selection === "1" || selection === "home") {
      odds.home = market.odds;
    } else if (selection === "x" || selection === "draw") {
      odds.draw = market.odds;
    } else if (selection === "2" || selection === "away") {
      odds.away = market.odds;
    }
  }

  return odds;
}

// Get OU2.5 odds
function getOU25Odds(markets: MarketOdds[]): {
  over?: number;
  under?: number;
} {
  const marketOU = filterOddsByMarket(markets, "OU2.5");
  const odds: { over?: number; under?: number } = {};

  for (const market of marketOU) {
    const selection = market.selection.toLowerCase();
    if (selection === "over") {
      odds.over = market.odds;
    } else if (selection === "under") {
      odds.under = market.odds;
    }
  }

  return odds;
}

// Get BTTS odds
function getBTTSOdds(markets: MarketOdds[]): {
  yes?: number;
  no?: number;
} {
  const marketBTTS = filterOddsByMarket(markets, "BTTS");
  const odds: { yes?: number; no?: number } = {};

  for (const market of marketBTTS) {
    const selection = market.selection.toLowerCase();
    if (selection === "yes") {
      odds.yes = market.odds;
    } else if (selection === "no") {
      odds.no = market.odds;
    }
  }

  return odds;
}

interface FixtureRowProps {
  fixture: FixtureDTO;
  isExpanded: boolean;
  onToggle: () => void;
  onAddSelection: (selection: BetslipSelection) => void;
}

function FixtureRow({ fixture, isExpanded, onToggle, onAddSelection }: FixtureRowProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  // Fetch odds when expanded
  const {
    data: oddsData,
    isLoading: isLoadingOdds,
    isError: isErrorOdds,
  } = useQuery<OddsDTO, Error>({
    queryKey: ["odds", "prematch", fixture.fixtureId],
    queryFn: () => fetchOdds(fixture.fixtureId),
    enabled: isExpanded,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleAddSelection = (
    marketKey: string,
    selectionKey: string,
    odds: number
  ) => {
    // Check if user is authenticated
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

  // Get 1X2 odds from fixture data if available, otherwise from fetched odds
  const odds1X2 = oddsData ? get1X2Odds(oddsData.markets) : undefined;
  const oddsOU25 = oddsData ? getOU25Odds(oddsData.markets) : undefined;
  const oddsBTTS = oddsData ? getBTTSOdds(oddsData.markets) : undefined;

  return (
    <div className={`border-b border-dark-border p-3 hover:bg-dark-hover transition-colors`}>
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Meta & Teams */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs ${cn(isExpanded ? "text-text-primary" : "text-text-secondary")}`}>
              {formatKickoffTime(fixture.kickoffAt)}
            </span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex justify-between items-center">
              <span className={`${cn(isExpanded ? "text-text-primary font-medium" : "text-text-secondary")}`}>
                {fixture.teams.home}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`${cn(isExpanded ? "text-text-primary font-medium" : "text-text-secondary")}`}>
                {fixture.teams.away}
              </span>
            </div>
          </div>
        </div>

        {/* 1X2 Odds Grid */}
        <div className="grid grid-cols-3 gap-1 w-full md:w-[280px] shrink-0">
          {odds1X2?.home && (
            <OddsButton
              label="1"
              odds={odds1X2.home}
              onClick={() => handleAddSelection("1X2", "1", odds1X2.home!)}
            />
          )}
          {odds1X2?.draw && (
            <OddsButton
              label="X"
              odds={odds1X2.draw}
              onClick={() => handleAddSelection("1X2", "X", odds1X2.draw!)}
            />
          )}
          {odds1X2?.away && (
            <OddsButton
              label="2"
              odds={odds1X2.away}
              onClick={() => handleAddSelection("1X2", "2", odds1X2.away!)}
            />
          )}
          {!odds1X2 && !isLoadingOdds && (
            <>
              <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                <span className="text-[10px] opacity-50">-</span>
              </div>
              <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                <span className="text-[10px] opacity-50">-</span>
              </div>
              <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                <span className="text-[10px] opacity-50">-</span>
              </div>
            </>
          )}
          {isLoadingOdds && (
            <>
              <Skeleton className="h-12 w-full" variant="rectangular" />
              <Skeleton className="h-12 w-full" variant="rectangular" />
              <Skeleton className="h-12 w-full" variant="rectangular" />
            </>
          )}
        </div>

        {/* Expand Button */}
        <div className="hidden md:flex items-center justify-center w-8">
          <button
            onClick={onToggle}
            className={cn(
              "text-xs text-text-muted hover:text-text-primary transition-colors",
              isExpanded ? "text-text-primary" : undefined
            )}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "−" : "+"}
          </button>
        </div>
      </div>

      {/* Expanded Content - OU2.5 and BTTS */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-dark-border">
          {isLoadingOdds ? (
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 w-full" variant="rectangular" />
              <Skeleton className="h-10 w-full" variant="rectangular" />
            </div>
          ) : isErrorOdds ? (
            <div className="text-text-muted text-sm">
              Odds yüklenirken hata oluştu
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* OU2.5 */}
              <div>
                <div className="text-xs text-text-muted mb-1">Over/Under 2.5</div>
                <div className="grid grid-cols-2 gap-1">
                  {oddsOU25?.over && (
                    <OddsButton
                      label="Over"
                      odds={oddsOU25.over}
                      onClick={() => handleAddSelection("OU2.5", "Over", oddsOU25.over!)}
                    />
                  )}
                  {oddsOU25?.under && (
                    <OddsButton
                      label="Under"
                      odds={oddsOU25.under}
                      onClick={() => handleAddSelection("OU2.5", "Under", oddsOU25.under!)}
                    />
                  )}
                  {!oddsOU25 && (
                    <>
                      <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                        <span className="text-[10px] opacity-50">-</span>
                      </div>
                      <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                        <span className="text-[10px] opacity-50">-</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* BTTS */}
              <div>
                <div className="text-xs text-text-muted mb-1">Both Teams to Score</div>
                <div className="grid grid-cols-2 gap-1">
                  {oddsBTTS?.yes && (
                    <OddsButton
                      label="Yes"
                      odds={oddsBTTS.yes}
                      onClick={() => handleAddSelection("BTTS", "Yes", oddsBTTS.yes!)}
                    />
                  )}
                  {oddsBTTS?.no && (
                    <OddsButton
                      label="No"
                      odds={oddsBTTS.no}
                      onClick={() => handleAddSelection("BTTS", "No", oddsBTTS.no!)}
                    />
                  )}
                  {!oddsBTTS && (
                    <>
                      <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                        <span className="text-[10px] opacity-50">-</span>
                      </div>
                      <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                        <span className="text-[10px] opacity-50">-</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface OddsButtonProps {
  label: string;
  odds: number;
  onClick: () => void;
}

function OddsButton({ label, odds, onClick }: OddsButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface hover:bg-dark-hover transition-colors text-text-primary"
    >
      <span className="text-[10px] font-medium opacity-80 text-text-secondary">{label}</span>
      <span className="text-sm font-bold text-[#ffdf1b]">{odds.toFixed(2)}</span>
    </button>
  );
}

export function FixturesList({ leagueId, date }: FixturesListProps) {
  const addSelection = useBetslipStore((state) => state.addSelection);
  const [expandedFixtures, setExpandedFixtures] = useState<Set<string | number>>(
    new Set()
  );

  // Only fetch if leagueId is provided
  const {
    data: fixtures = [],
    isLoading,
    isError,
    error,
  } = useQuery<FixtureDTO[], Error>({
    queryKey: ["fixtures", leagueId, date],
    queryFn: () => {
      if (!leagueId) {
        return Promise.resolve([]);
      }
      return fetchFixtures(leagueId, date);
    },
    enabled: !!leagueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const toggleFixture = (fixtureId: string | number) => {
    setExpandedFixtures((prev) => {
      const next = new Set(prev);
      if (next.has(fixtureId)) {
        next.delete(fixtureId);
      } else {
        next.add(fixtureId);
      }
      return next;
    });
  };

  if (!leagueId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-text-muted text-sm">
          Bir lig seçin
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-dark-border p-3">
            <Skeleton className="h-16 w-full" variant="rectangular" />
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
    <div className="space-y-4">
      {fixtures.map((fixture) => (
        <FixtureRow
          key={fixture.fixtureId}
          fixture={fixture}
          isExpanded={expandedFixtures.has(fixture.fixtureId)}
          onToggle={() => toggleFixture(fixture.fixtureId)}
          onAddSelection={addSelection}
        />
      ))}
    </div>
  );
}
