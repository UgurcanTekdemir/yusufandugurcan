import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BetslipSelection {
  fixtureId: string | number;
  marketKey: string; // e.g., "1X2", "OU2.5", "BTTS"
  selectionKey: string; // e.g., "1", "X", "2", "Over", "Under", "Yes", "No"
  odds: number;
  // Additional display fields
  homeTeam?: string;
  awayTeam?: string;
  kickoffAt?: string;
  marketLabel?: string; // e.g., "1X2", "Over/Under 2.5"
  selectionLabel?: string; // e.g., "Home", "Draw", "Away", "Over", "Under"
}

interface BetslipState {
  selections: BetslipSelection[];
  stake: number;
  // Actions
  addSelection: (selection: BetslipSelection) => void;
  removeSelection: (index: number) => void;
  setStake: (stake: number) => void;
  clearBetslip: () => void;
  // Computed
  getPotentialReturn: () => number;
}

// Calculate potential return: stake * (odds1 * odds2 * ... * oddsN)
function calculatePotentialReturn(
  stake: number,
  selections: BetslipSelection[]
): number {
  if (stake <= 0 || selections.length === 0) {
    return 0;
  }

  // Check if any selection has invalid odds
  if (selections.some((s) => s.odds <= 0)) {
    return 0;
  }

  // Calculate product of all odds
  const totalOdds = selections.reduce((acc, selection) => acc * selection.odds, 1);

  return stake * totalOdds;
}

export const useBetslipStore = create<BetslipState>()(
  persist(
    (set, get) => ({
      selections: [],
      stake: 10.0,

      addSelection: (selection) => {
        const state = get();

        // Validate selection
        if (
          !selection.fixtureId ||
          !selection.marketKey ||
          !selection.selectionKey ||
          selection.odds <= 0
        ) {
          return; // Silently ignore invalid selection
        }

        // Check for duplicate (same fixtureId + marketKey + selectionKey)
        const isDuplicate = state.selections.some(
          (s) =>
            s.fixtureId === selection.fixtureId &&
            s.marketKey === selection.marketKey &&
            s.selectionKey === selection.selectionKey
        );

        if (isDuplicate) {
          return; // Silently ignore duplicate
        }

        // Add selection
        set({
          selections: [...state.selections, selection],
        });
      },

      removeSelection: (index) => {
        const state = get();
        if (index < 0 || index >= state.selections.length) {
          return;
        }

        const newSelections = state.selections.filter((_, i) => i !== index);
        set({
          selections: newSelections,
        });
      },

      setStake: (stake) => {
        // Validate stake
        const numStake = Number(stake);
        if (isNaN(numStake) || !isFinite(numStake) || numStake < 0) {
          return; // Silently ignore invalid stake
        }

        set({ stake: numStake });
      },

      clearBetslip: () => {
        set({
          selections: [],
          stake: 10.0,
        });
      },
    }),
    {
      name: "betslip-storage",
    }
  )
);

