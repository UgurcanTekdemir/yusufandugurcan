/**
 * Utility functions for mapping market and selection keys to display labels
 */

/**
 * Map market key to display label
 */
export function getMarketLabel(marketKey: string): string {
  const marketLower = marketKey.toLowerCase();
  
  if (marketLower === "1x2" || marketLower === "match winner") {
    return "1X2";
  }
  if (marketLower === "ou2.5" || marketLower.includes("over/under")) {
    return "Over/Under 2.5";
  }
  if (marketLower === "btts" || marketLower.includes("both teams to score")) {
    return "Both Teams To Score";
  }
  
  // Default: return original key capitalized
  return marketKey.toUpperCase();
}

/**
 * Map selection key to display label based on market type
 */
export function getSelectionLabel(
  selectionKey: string,
  marketKey: string
): string {
  const selectionLower = selectionKey.toLowerCase();
  const marketLower = marketKey.toLowerCase();

  // 1X2 market
  if (marketLower === "1x2" || marketLower === "match winner") {
    if (selectionLower === "1" || selectionLower === "home") {
      return "Home";
    }
    if (selectionLower === "x" || selectionLower === "draw") {
      return "Draw";
    }
    if (selectionLower === "2" || selectionLower === "away") {
      return "Away";
    }
  }

  // Over/Under 2.5 market
  if (marketLower === "ou2.5" || marketLower.includes("over/under")) {
    if (selectionLower.includes("over") || selectionLower === "over 2.5") {
      return "Over 2.5";
    }
    if (selectionLower.includes("under") || selectionLower === "under 2.5") {
      return "Under 2.5";
    }
  }

  // Both Teams To Score market
  if (marketLower === "btts" || marketLower.includes("both teams to score")) {
    if (selectionLower === "yes") {
      return "Yes";
    }
    if (selectionLower === "no") {
      return "No";
    }
  }

  // Default: return original key capitalized
  return selectionKey.charAt(0).toUpperCase() + selectionKey.slice(1).toLowerCase();
}

