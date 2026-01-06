"use client";

import { useState } from "react";
import { HeaderBar, LeftSidebar, RightBetslip, Footer } from "@/components";
import { useBetslipStore } from "@/stores/betslipStore";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);

  // Get selections count from betslip store
  const selections = useBetslipStore((state) => state.selections);
  const selectionsCount = selections.length;

  // TODO: Get balance from user data/context - for now use placeholder
  const balance = 2500.0;

  return (
    <div className="min-h-screen bg-[#0b0b0f] flex flex-col">
      {/* Header */}
      <HeaderBar
        balance={balance}
        userName="User"
        onLeftDrawerClick={() => setLeftDrawerOpen(true)}
        onRightDrawerClick={() => setRightDrawerOpen(true)}
        selectionsCount={selectionsCount}
      />

      {/* Main Layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar */}
        <LeftSidebar
          isOpen={leftDrawerOpen}
          onClose={() => setLeftDrawerOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
          {/* Footer - Hide on mobile when drawer is open */}
          {!leftDrawerOpen && <Footer />}
        </main>

        {/* Right Betslip */}
        <RightBetslip
          isOpen={rightDrawerOpen}
          onClose={() => setRightDrawerOpen(false)}
        />
      </div>
    </div>
  );
}
