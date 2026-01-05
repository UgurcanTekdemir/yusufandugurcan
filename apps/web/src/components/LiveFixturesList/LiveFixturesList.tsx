"use client";

import { useState, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LiveFixtureDTO, OddsDTO, MarketOdds } from "@repo/shared/types";
import { Skeleton } from "../ui/Skeleton";
import { useBetslipStore, type BetslipSelection } from "@/stores/betslipStore";
import { getMarketLabel, getSelectionLabel } from "@/stores/betslipUtils";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth/useAuth";

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Fetch live fixtures
async function fetchLiveFixtures(): Promise<LiveFixtureDTO[]> {
  const response = await fetch("/api/sm/livescores");
  if (!response.ok) {
    throw new Error("Failed to fetch live fixtures");
  }
  return response.json();
}

// Fetch inplay odds for a fixture
async function fetchInplayOdds(fixtureId: string | number): Promise<OddsDTO> {
  const response = await fetch(`/api/sm/odds/inplay?fixtureId=${fixtureId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch inplay odds");
  }
  return response.json();
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

interface LiveFixtureRowProps {
  fixture: LiveFixtureDTO;
  isExpanded: boolean;
  onToggle: () => void;
  onAddSelection: (selection: BetslipSelection) => void;
}

const LiveFixtureRow = memo(function LiveFixtureRow({
  fixture,
  isExpanded,
  onToggle,
  onAddSelection,
}: LiveFixtureRowProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Fetch inplay odds when expanded
  const {
    data: oddsData,
    isLoading: isLoadingOdds,
    isError: isErrorOdds,
  } = useQuery<OddsDTO, Error>({
    queryKey: ["odds", "inplay", fixture.fixtureId],
    queryFn: () => fetchInplayOdds(fixture.fixtureId),
    enabled: isExpanded,
    refetchInterval: 7 * 1000, // Poll every 7 seconds
    refetchIntervalInBackground: true,
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

    const kickoffAtStr = new Date().toISOString();

    const selection: BetslipSelection = {
      fixtureId: fixture.fixtureId,
      marketKey,
      selectionKey,
      odds,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      kickoffAt: kickoffAtStr,
      marketLabel: getMarketLabel(marketKey),
      selectionLabel: getSelectionLabel(selectionKey, marketKey),
    };

    onAddSelection(selection);
    toast.success("Seçim kupona eklendi");
  };

  // Get odds
  const odds1X2 = oddsData ? get1X2Odds(oddsData.markets) : undefined;
  const oddsOU25 = oddsData ? getOU25Odds(oddsData.markets) : undefined;
  const oddsBTTS = oddsData ? getBTTSOdds(oddsData.markets) : undefined;

  // Format score
  const score = fixture.score
    ? `${fixture.score.home} - ${fixture.score.away}`
    : null;

  return (
    <div className={`border-b border-dark-border p-3 hover:bg-dark-hover transition-colors`}>
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Meta & Teams */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase animate-pulse">
              Live
            </span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex justify-between items-center">
              <span className="text-text-primary font-medium">{fixture.homeTeam}</span>
              {score && (
                <span className="text-accent-primary font-bold text-lg">
                  {fixture.score?.home}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-primary font-medium">{fixture.awayTeam}</span>
              {score && (
                <span className="text-accent-primary font-bold text-lg">
                  {fixture.score?.away}
                </span>
              )}
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
});

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

export function LiveFixturesList() {
  const addSelection = useBetslipStore((state) => state.addSelection);
  const [expandedFixtures, setExpandedFixtures] = useState<Set<string | number>>(
    new Set()
  );

  // Fetch live fixtures with polling
  const {
    data: fixtures = [],
    isLoading,
    isError,
    error,
  } = useQuery<LiveFixtureDTO[], Error>({
    queryKey: ["livescores"],
    queryFn: fetchLiveFixtures,
    refetchInterval: 7 * 1000, // Poll every 7 seconds
    refetchIntervalInBackground: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
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
          Live fixtures yüklenirken hata oluştu: {error?.message || "Unknown error"}
        </p>
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-text-muted text-sm">Şu anda canlı maç yok</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fixtures.map((fixture) => (
        <LiveFixtureRow
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
