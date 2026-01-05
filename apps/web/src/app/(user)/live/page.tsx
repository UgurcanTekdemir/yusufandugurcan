"use client";

import { LiveFixturesList, SearchBar } from "@/components";

export default function LivePage() {
  const handleSearch = (query: string) => {
    console.log("Search query:", query);
    // TODO: Implement search functionality
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg relative custom-scrollbar">
      {/* Search Bar */}
      <div className="px-6 pt-6 pb-4">
        <SearchBar placeholder="Search live matches..." onSearch={handleSearch} />
      </div>

      {/* Live Fixtures List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <LiveFixturesList />
        <div className="h-20"></div>
      </div>
    </div>
  );
}
