import type { BetslipSelection } from "@/stores/betslipStore";

export interface SlipLine {
  id: string;
  fixtureId: string | number;
  market: string;
  selection: string;
  odds: number;
}

/**
 * Transform betslip selections to slip lines format
 */
export function transformSelectionsToLines(
  selections: BetslipSelection[]
): SlipLine[] {
  return selections.map((selection, index) => ({
    id: `${selection.fixtureId}-${selection.marketKey}-${selection.selectionKey}-${index}`,
    fixtureId: selection.fixtureId,
    market: selection.marketKey,
    selection: selection.selectionKey,
    odds: selection.odds,
  }));
}

/**
 * Create odds snapshot from selections
 * Key format: ${fixtureId}-${marketKey}-${selectionKey}
 */
export function createOddsSnapshot(
  selections: BetslipSelection[]
): Record<string, number> {
  const snapshot: Record<string, number> = {};
  selections.forEach((selection) => {
    const key = `${selection.fixtureId}-${selection.marketKey}-${selection.selectionKey}`;
    snapshot[key] = selection.odds;
  });
  return snapshot;
}

