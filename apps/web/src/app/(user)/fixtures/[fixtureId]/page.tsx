"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import type { FixtureDTO } from "@repo/shared/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { OddsDisplay } from "@/components/OddsDisplay/OddsDisplay";

async function fetchFixture(fixtureId: string): Promise<FixtureDTO> {
  const response = await fetch(`/api/sm/fixtures/${fixtureId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    let errorMessage = errorData?.error || `HTTP ${response.status}`;
    
    // Add upstream error details if available
    if (errorData?.upstream) {
      try {
        const upstream = typeof errorData.upstream === "string" 
          ? JSON.parse(errorData.upstream) 
          : errorData.upstream;
        if (upstream?.message) {
          errorMessage += ` - ${upstream.message}`;
        }
      } catch {
        // If parsing fails, just use the upstream string
        if (typeof errorData.upstream === "string") {
          errorMessage += ` - ${errorData.upstream.substring(0, 200)}`;
        }
      }
    }
    
    // Add validation details if available
    if (errorData?.details && Array.isArray(errorData.details)) {
      const validationErrors = errorData.details
        .map((err: { path?: string[]; message?: string }) => {
          const path = err.path?.join(".") || "unknown";
          return `${path}: ${err.message || "validation error"}`;
        })
        .join("; ");
      if (validationErrors) {
        errorMessage += ` (${validationErrors})`;
      }
    }
    
    throw new Error(`Failed to fetch fixture: ${errorMessage}`);
  }
  return response.json();
}

export default function FixtureDetailPage() {
  const params = useParams();
  const fixtureId = params.fixtureId as string;

  const {
    data: fixture,
    isLoading,
    isError,
    error,
  } = useQuery<FixtureDTO, Error>({
    queryKey: ["fixture", fixtureId],
    queryFn: () => fetchFixture(fixtureId),
    enabled: !!fixtureId,
    // Poll every 10 seconds for live matches
    refetchInterval: (query) => {
      const fixture = query.state.data;
      if (fixture?.isLive) {
        return 10 * 1000; // 10 seconds for live matches
      }
      return false; // No polling for non-live matches
    },
    refetchIntervalInBackground: true,
  });

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-red-400">
            <h2 className="text-xl font-bold mb-2">Hata</h2>
            <p>{error?.message || "Maç bilgileri yüklenirken bir hata oluştu"}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!fixture) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-text-muted">Maç bulunamadı</p>
        </div>
      </div>
    );
  }

  const formatKickoffTime = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("tr-TR", {
      timeZone: "Europe/Istanbul",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {fixture.teams.home} vs {fixture.teams.away}
          </h1>
          <p className="text-text-muted text-sm">
            {formatKickoffTime(fixture.kickoffAt)}
          </p>
          {fixture.league && (
            <p className="text-text-muted text-sm mt-1">
              {fixture.league}
            </p>
          )}
        </div>

        {/* Match Info */}
        <div className="bg-dark-surface rounded-lg p-4 border border-dark-border">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Maç Bilgileri</h2>
          
          {/* Live Match Score & Time */}
          {(fixture.isLive || fixture.isStarted) && (
            <div className="mb-4 pb-4 border-b border-dark-border">
              <div className="flex items-center justify-center gap-6">
                {/* Home Team */}
                <div className="flex items-center gap-3">
                  {fixture.homeTeamLogo && (
                    <img
                      src={fixture.homeTeamLogo}
                      alt={fixture.teams.home}
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        // Hide image on error
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <div className="text-right">
                    <p className="text-text-primary font-semibold text-lg">{fixture.teams.home}</p>
                    {fixture.score && (
                      <p className="text-accent-primary font-bold text-2xl">{fixture.score.home}</p>
                    )}
                  </div>
                </div>

                {/* Match Time / Score */}
                <div className="flex flex-col items-center gap-2">
                  {fixture.isLive && fixture.minute !== null && fixture.minute !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-full bg-red-600 text-white text-xs font-bold uppercase animate-pulse">
                        Live
                      </span>
                      <span className="text-text-primary font-semibold">
                        {fixture.minute}'
                      </span>
                    </div>
                  )}
                  {fixture.score && (
                    <div className="text-text-primary font-bold text-3xl">
                      {fixture.score.home} - {fixture.score.away}
                    </div>
                  )}
                  {!fixture.isLive && fixture.isStarted && (
                    <span className="text-text-muted text-sm">
                      {fixture.isFinished ? "Maç Bitti" : "Devam Ediyor"}
                    </span>
                  )}
                </div>

                {/* Away Team */}
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <p className="text-text-primary font-semibold text-lg">{fixture.teams.away}</p>
                    {fixture.score && (
                      <p className="text-accent-primary font-bold text-2xl">{fixture.score.away}</p>
                    )}
                  </div>
                  {fixture.awayTeamLogo && (
                    <img
                      src={fixture.awayTeamLogo}
                      alt={fixture.teams.away}
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        // Hide image on error
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pre-Match Teams with Logos */}
          {!fixture.isStarted && (
            <div className="mb-4 pb-4 border-b border-dark-border">
              <div className="flex items-center justify-center gap-6">
                {/* Home Team */}
                <div className="flex items-center gap-3">
                  {fixture.homeTeamLogo && (
                    <img
                      src={fixture.homeTeamLogo}
                      alt={fixture.teams.home}
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <p className="text-text-primary font-semibold text-lg">{fixture.teams.home}</p>
                </div>

                <span className="text-text-muted">vs</span>

                {/* Away Team */}
                <div className="flex items-center gap-3">
                  <p className="text-text-primary font-semibold text-lg">{fixture.teams.away}</p>
                  {fixture.awayTeamLogo && (
                    <img
                      src={fixture.awayTeamLogo}
                      alt={fixture.teams.away}
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            {fixture.venue && (
              <div>
                <p className="text-text-muted text-sm mb-1">Stadyum</p>
                <p className="text-text-primary">{fixture.venue}</p>
              </div>
            )}
            {fixture.referee && (
              <div>
                <p className="text-text-muted text-sm mb-1">Hakem</p>
                <p className="text-text-primary">{fixture.referee}</p>
              </div>
            )}
          </div>
        </div>

        {/* Pre-Match Odds */}
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-4">Pre-Match Oranlar</h2>
          <OddsDisplay
            fixtureId={fixture.fixtureId}
            homeTeam={fixture.teams.home}
            awayTeam={fixture.teams.away}
            kickoffAt={fixture.kickoffAt}
          />
        </div>
      </div>
    </div>
  );
}

