"use client";

import { useState } from "react";

interface MatchResult {
  fixtureId: string | number;
  homeTeam: string;
  awayTeam: string;
  score?: { home: number; away: number };
  leagueName?: string;
  kickoffAt: string;
  state?: string;
  isFinished: boolean;
}

interface DateResult {
  date: string;
  matches: MatchResult[];
}

interface ApiResponse {
  success: boolean;
  daysChecked: number;
  totalMatches: number;
  results: DateResult[];
  summary: {
    datesWithMatches: number;
    totalMatches: number;
    averageMatchesPerDay: string;
  };
}

export default function PastMatchesTestPage() {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPastMatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/test/past-matches?days=${days}`);
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (score?: { home: number; away: number }): string => {
    if (!score || score.home === undefined || score.away === undefined) {
      return "N/A";
    }
    return `${score.home} - ${score.away}`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("tr-TR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatKickoff = (kickoffAt: string): string => {
    try {
      const date = new Date(kickoffAt);
      return date.toLocaleString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return kickoffAt;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Geçmiş Maç Sonuçları Test</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="days" className="block text-sm font-medium mb-2">
              Kaç gün geriye gidilsin?
            </label>
            <input
              id="days"
              type="number"
              min="1"
              max="30"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 7)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
          <button
            onClick={fetchPastMatches}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Yükleniyor..." : "Maçları Getir"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
          <strong>Hata:</strong> {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Özet</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Kontrol Edilen Gün</div>
                <div className="text-2xl font-bold">{data.daysChecked}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Toplam Maç</div>
                <div className="text-2xl font-bold">{data.totalMatches}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Maç Bulunan Gün</div>
                <div className="text-2xl font-bold">{data.summary.datesWithMatches}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Günlük Ortalama</div>
                <div className="text-2xl font-bold">{data.summary.averageMatchesPerDay}</div>
              </div>
            </div>
          </div>

          {/* Results by Date */}
          {data.results.length === 0 ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded">
              Belirtilen süre içinde bitmiş maç bulunamadı.
            </div>
          ) : (
            data.results.map((dateResult) => (
              <div
                key={dateResult.date}
                className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden"
              >
                <div className="bg-gray-100 dark:bg-gray-700 px-6 py-4 border-b">
                  <h3 className="text-lg font-semibold">
                    {formatDate(dateResult.date)} ({dateResult.matches.length} maç)
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {dateResult.matches.map((match) => (
                    <div key={match.fixtureId} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <div className="font-medium text-lg">
                                {match.homeTeam} vs {match.awayTeam}
                              </div>
                              {match.leagueName && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {match.leagueName}
                                </div>
                              )}
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold">
                                {formatScore(match.score)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatKickoff(match.kickoffAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {match.fixtureId}
                          </div>
                          {match.state && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Durum: {match.state}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!data && !loading && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Geçmiş maç sonuçlarını görmek için yukarıdaki butona tıklayın.
          </p>
        </div>
      )}
    </div>
  );
}

