"use client";

import { useSearchParams } from "next/navigation";
import { FixturesList, SearchBar } from "@/components";

export default function FixturesPage() {
  const searchParams = useSearchParams();
  const leagueId = searchParams.get("leagueId");
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const handleSearch = (query: string) => {
    console.log("Search query:", query);
    // TODO: Implement search functionality
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg relative custom-scrollbar">
      {/* Search Bar */}
      <div className="px-6 pt-6 pb-4">
        <SearchBar placeholder="Search fixtures..." onSearch={handleSearch} />
      </div>

      {/* Fixtures List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <FixturesList leagueId={leagueId || undefined} date={date} />
        <div className="h-20"></div>
      </div>
    </div>
  );
}
