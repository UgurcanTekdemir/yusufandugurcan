/**
 * Bet365-benzeri görüntüleme için market konfigürasyonu.
 * template: UI şablonu (Over/Under tablosu, Yes/No satırı, 1X2 vb.)
 */

export type MarketTemplate =
  | "ou"
  | "yesno"
  | "1x2"
  | "2way"
  | "dc"
  | "combo_btts"
  | "htft"
  | "cs"
  | "handicap_2way"
  | "handicap_3way"
  | "ou_odd_even"
  | "player_prop"
  | "race_time"
  | "grid"
  | "list";

export interface MarketDisplayConfig {
  marketId: number;
  devName: string;
  label: string;
  template: MarketTemplate;
  group?: string;
  lineRequired?: boolean;
  selectionOrder?: string[];
}

const HOME_DRAW_AWAY = ["Home", "Draw", "Away"] as const;
const HOME_AWAY = ["Home", "Away"] as const;
const YES_NO = ["Yes", "No"] as const;
const OVER_UNDER = ["Over", "Under"] as const;
const ONE_X_TWO = ["1", "X", "2"] as const;
const DC = ["1X", "12", "X2"] as const;

/**
 * Sportmonks market_id -> Bet365-benzeri şablon eşlemesi.
 * Etiketler Bet365’te görüldüğü gibi bırakıldı (lokalizasyon yapılmadı).
 */
export const bet365LikeMarketDisplay: MarketDisplayConfig[] = [
  // Match result / temel
  { marketId: 1, devName: "FULLTIME_RESULT", label: "Full Time Result", template: "1x2", selectionOrder: ONE_X_TWO as unknown as string[], group: "Match Result" },
  { marketId: 2, devName: "DOUBLE_CHANCE", label: "Double Chance", template: "dc", selectionOrder: DC as unknown as string[], group: "Match Result" },
  { marketId: 10, devName: "DRAW_NO_BET", label: "Draw No Bet", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Match Result" },
  { marketId: 14, devName: "BOTH_TEAMS_TO_SCORE", label: "Both Teams To Score", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Goals" },
  { marketId: 13, devName: "RESULT_BOTH_TEAMS_TO_SCORE", label: "Result & BTTS", template: "combo_btts", group: "Combos" },

  // Goals / totals / lines
  { marketId: 3, devName: "X_GOAL", label: "To Qualify / Win", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Goals/Lines" },
  { marketId: 4, devName: "MATCH_GOALS", label: "Match Goals O/U", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 5, devName: "ALTERNATIVE_MATCH_GOALS", label: "Alternative Match Goals", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 7, devName: "GOAL_LINE", label: "Goal Line", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 12, devName: "GOALS_ODD_EVEN", label: "Goals Odd/Even", template: "ou_odd_even", selectionOrder: ["Odd", "Even"], group: "Totals" },
  { marketId: 18, devName: "HOME_TEAM_EXACT_GOALS", label: "Home Exact Goals", template: "cs", group: "Goals" },
  { marketId: 19, devName: "AWAY_TEAM_EXACT_GOALS", label: "Away Exact Goals", template: "cs", group: "Goals" },
  { marketId: 20, devName: "HOME_TEAM_GOALS", label: "Home Team Goals O/U", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Goals" },
  { marketId: 21, devName: "AWAY_TEAM_GOALS", label: "Away Team Goals O/U", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Goals" },
  { marketId: 28, devName: "1ST_HALF_GOALS", label: "1st Half Goals O/U", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 33, devName: "FIRST_HALF_EXACT_GOALS", label: "1st Half Exact Goals", template: "cs", group: "Goals" },
  { marketId: 38, devName: "SECOND_HALF_EXACT_GOALS", label: "2nd Half Exact Goals", template: "cs", group: "Goals" },
  { marketId: 53, devName: "2ND_HALF_GOALS", label: "2nd Half Goals O/U", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 57, devName: "CORRECT_SCORE", label: "Correct Score", template: "cs", group: "Score" },
  { marketId: 80, devName: "GOALS_OVER_UNDER", label: "Goals Over/Under", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 81, devName: "ALTERNATIVE_TOTAL_GOALS", label: "Alternative Total Goals", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 82, devName: "TOTAL_GOALS_BOTH_TEAMS_TO_SCORE", label: "Total Goals & BTTS", template: "grid", group: "Combos" },
  { marketId: 83, devName: "NUMBER_OF_GOALS_IN_MATCH", label: "Number of Goals in Match", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 84, devName: "EARLY_GOAL", label: "Early Goal", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Totals" },
  { marketId: 85, devName: "LATE_GOAL", label: "Late Goal", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Totals" },
  { marketId: 86, devName: "TEAM_TOTAL_GOALS", label: "Team Total Goals", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 88, devName: "TO_SCORE_IN_HALF", label: "To Score in Half", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Goals" },
  { marketId: 90, devName: "GOALSCORERS", label: "Goal Scorers", template: "player_prop", group: "Player Props" },
  { marketId: 92, devName: "TEAM_GOALSCORER", label: "Team Goalscorer", template: "player_prop", group: "Player Props" },
  { marketId: 93, devName: "EXACT_TOTAL_GOALS", label: "Exact Total Goals", template: "list", group: "Totals" },
  { marketId: 95, devName: "1ST_HALF_GOALS_ODD_EVEN", label: "1st Half Goals Odd/Even", template: "ou_odd_even", selectionOrder: ["Odd", "Even"], group: "Totals" },
  { marketId: 97, devName: "2ND_HALF_RESULT", label: "2nd Half Result", template: "1x2", selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Halves" },
  { marketId: 99, devName: "TIME_OF_1ST_TEAM_GOAL", label: "Time of 1st Team Goal", template: "race_time", group: "Time" },
  { marketId: 100, devName: "MULTI_SCORERS", label: "Multi Scorers", template: "player_prop", group: "Player Props" },
  { marketId: 101, devName: "HALF_WITH_MOST_GOALS", label: "Half With Most Goals", template: "1x2", selectionOrder: ["1st Half", "Equal", "2nd Half"], group: "Halves" },
  { marketId: 102, devName: "TIME_OF_FIRST_GOAL_BRACKETS", label: "Time of First Goal", template: "race_time", group: "Time" },
  { marketId: 103, devName: "TOTAL_GOAL_MINUTES", label: "Total Goal Minutes", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 104, devName: "ALTERNATIVE_ASIAN_HANDICAP", label: "Alternative Asian Handicap", template: "handicap_2way", lineRequired: true, selectionOrder: HOME_AWAY as unknown as string[], group: "Handicap" },
  { marketId: 105, devName: "ALTERNATIVE_GOAL_LINE", label: "Alternative Goal Line", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 107, devName: "ALTERNATIVE_1ST_HALF_GOAL_LINE", label: "Alt. 1st Half Goal Line", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 120, devName: "HOME_TEAM_HIGHEST_SCORING_HALF", label: "Home Team Highest Scoring Half", template: "1x2", selectionOrder: ["1st Half", "Equal", "2nd Half"], group: "Halves" },
  { marketId: 121, devName: "AWAY_TEAM_HIGHEST_SCORING_HALF", label: "Away Team Highest Scoring Half", template: "1x2", selectionOrder: ["1st Half", "Equal", "2nd Half"], group: "Halves" },
  { marketId: 122, devName: "HALF_TIME_RESULT_BOTH_TEAM_TO_SCORE", label: "HT Result & BTTS", template: "combo_btts", group: "Combos" },
  { marketId: 123, devName: "HALF_TIME_RESULT_TOTAL_GOALS", label: "HT Result & Total Goals", template: "grid", group: "Combos" },
  { marketId: 124, devName: "2ND_HALF_GOALS_ODD_EVEN", label: "2nd Half Goals Odd/Even", template: "ou_odd_even", selectionOrder: ["Odd", "Even"], group: "Totals" },
  { marketId: 125, devName: "BOTH_TEAM_TO_SCORE_1ST_HALF_2ND_HALF", label: "BTTS 1st & 2nd Half", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Goals" },

  // Handicap
  { marketId: 6, devName: "ASIAN_HANDICAP", label: "Asian Handicap", template: "handicap_2way", lineRequired: true, selectionOrder: HOME_AWAY as unknown as string[], group: "Handicap" },
  { marketId: 9, devName: "3_WAY_HANDICAP", label: "3-Way Handicap", template: "handicap_3way", lineRequired: true, selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Handicap" },
  { marketId: 26, devName: "1ST_HALF_ASIAN_HANDICAP", label: "1st Half Asian Handicap", template: "handicap_2way", lineRequired: true, selectionOrder: HOME_AWAY as unknown as string[], group: "Handicap" },
  { marketId: 32, devName: "1ST_HALF_HANDICAP", label: "1st Half Handicap", template: "handicap_3way", lineRequired: true, selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Handicap" },
  { marketId: 56, devName: "HANDICAP_RESULT", label: "Handicap Result", template: "handicap_3way", lineRequired: true, selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Handicap" },
  { marketId: 94, devName: "ALTERNATIVE_HANDICAP_RESULT", label: "Alternative Handicap Result", template: "handicap_3way", lineRequired: true, selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Handicap" },
  { marketId: 96, devName: "ALTERNATIVE_1ST_HALF_HANDICAP_RESULT", label: "Alt. 1st Half Handicap Result", template: "handicap_3way", lineRequired: true, selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Handicap" },
  { marketId: 104, devName: "ALTERNATIVE_ASIAN_HANDICAP", label: "Alternative Asian Handicap", template: "handicap_2way", lineRequired: true, selectionOrder: HOME_AWAY as unknown as string[], group: "Handicap" },
  { marketId: 106, devName: "ALTERNATIVE_1ST_HALF_ASIAN_HANDICAP", label: "Alt. 1st Half Asian Handicap", template: "handicap_2way", lineRequired: true, selectionOrder: HOME_AWAY as unknown as string[], group: "Handicap" },

  // Devre / HT-FT
  { marketId: 15, devName: "BOTH_TEAMS_TO_SCORE_IN_1ST_HALF", label: "BTTS 1st Half", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Halves" },
  { marketId: 16, devName: "BOTH_TEAMS_TO_SCORE_IN_2ND_HALF", label: "BTTS 2nd Half", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Halves" },
  { marketId: 29, devName: "HALF_TIME_FULL_TIME", label: "Half Time / Full Time", template: "htft", group: "Halves" },
  { marketId: 30, devName: "HALF_TIME_CORRECT_SCORE", label: "HT Correct Score", template: "cs", group: "Halves" },
  { marketId: 31, devName: "HALF_TIME_RESULT", label: "Half Time Result", template: "1x2", selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Halves" },
  { marketId: 34, devName: "FIRST_10_MIN_WINNER", label: "First 10 Min Winner", template: "1x2", selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Time" },
  { marketId: 37, devName: "RESULT_TOTAL_GOALS", label: "Result & Total Goals", template: "grid", group: "Combos" },
  { marketId: 40, devName: "TO_WIN_BOTH_HALVES", label: "To Win Both Halves", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Halves" },
  { marketId: 47, devName: "DOUBLE_CHANGE_1ST_HALF", label: "Double Chance 1st Half", template: "dc", selectionOrder: DC as unknown as string[], group: "Halves" },
  { marketId: 89, devName: "FULL_TIME_RESULT_ENHANCHED_PRICES", label: "Full Time Result – Enhanced", template: "1x2", selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Match Result" },
  { marketId: 91, devName: "TEN_MINUTE_RESULT", label: "Ten Minute Result", template: "1x2", selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Time" },
  { marketId: 98, devName: "TEAMS_TO_SCORE", label: "Teams To Score", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Goals" },

  // Clean sheet / win to nil
  { marketId: 17, devName: "TEAM_CLEAN_SHEET", label: "Team Clean Sheet", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Clean Sheet" },
  { marketId: 46, devName: "WIN_TO_NIL", label: "Win To Nil", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Clean Sheet" },
  { marketId: 50, devName: "CLEAN_SHEET_HOME", label: "Home Clean Sheet", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Clean Sheet" },
  { marketId: 51, devName: "CLEAN_SHEET_AWAY", label: "Away Clean Sheet", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Clean Sheet" },

  // Corners
  { marketId: 60, devName: "2_WAY_CORNERS", label: "2-Way Corners", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Corners" },
  { marketId: 61, devName: "ASIAN_TOTAL_CORNERS", label: "Asian Total Corners", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Corners" },
  { marketId: 62, devName: "ASIAN_HANDICAP_CORNERS", label: "Asian Handicap Corners", template: "handicap_2way", lineRequired: true, selectionOrder: HOME_AWAY as unknown as string[], group: "Corners" },
  { marketId: 63, devName: "1ST_HALF_ASIAN_CORNERS", label: "1st Half Asian Corners", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Corners" },
  { marketId: 67, devName: "CORNER_MARKET", label: "Corner Market", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Corners" },
  { marketId: 68, devName: "TOTAL_CORNERS", label: "Total Corners", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Corners" },
  { marketId: 69, devName: "ALTERNATIVE_CORNERS", label: "Alternative Corners", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Corners" },
  { marketId: 70, devName: "FIRST_HALF_CORNERS", label: "First Half Corners", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Corners" },
  { marketId: 71, devName: "CORNER_MATCH_BET", label: "Corner Match Bet", template: "1x2", selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Corners" },
  { marketId: 72, devName: "CORNER_HANDICAP", label: "Corner Handicap", template: "handicap_2way", lineRequired: true, selectionOrder: HOME_AWAY as unknown as string[], group: "Corners" },
  { marketId: 73, devName: "TIME_OF_FIRST_CORNER", label: "Time of First Corner", template: "race_time", group: "Corners" },
  { marketId: 74, devName: "TEAM_CORNERS", label: "Team Corners", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Corners" },
  { marketId: 75, devName: "CORNERS_RACE", label: "Corners Race", template: "race_time", group: "Corners" },
  { marketId: 76, devName: "1ST_MATCH_CORNER", label: "1st Match Corner", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Corners" },
  { marketId: 77, devName: "LAST_MATCH_CORNER", label: "Last Match Corner", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Corners" },
  { marketId: 78, devName: "MULTICORNERS", label: "Multicorners", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Corners" },
  { marketId: 264, devName: "MOST_CORNERS", label: "Most Corners", template: "1x2", selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Corners" },
  { marketId: 265, devName: "SECOND_HALF_CORNERS", label: "Second Half Corners", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Corners" },

  // Cards / penalties / takım istatistikleri / oyuncu props
  { marketId: 64, devName: "PLAYER_TO_BE_BOOKED", label: "Player To Be Booked", template: "player_prop", group: "Cards" },
  { marketId: 65, devName: "1ST_PLAYER_BOOKED", label: "1st Player Booked", template: "player_prop", group: "Cards" },
  { marketId: 66, devName: "PLAYER_TO_BE_SENT_OFF", label: "Player To Be Sent Off", template: "player_prop", group: "Cards" },
  { marketId: 255, devName: "NUMBER_OF_CARDS", label: "Number of Cards", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Cards" },
  { marketId: 270, devName: "TO_SCORE_A_PENALTY", label: "To Score a Penalty", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Cards" },
  { marketId: 271, devName: "TO_MISS_A_PENALTY", label: "To Miss a Penalty", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Cards" },
  { marketId: 272, devName: "ASIAN_TOTAL_CARDS", label: "Asian Total Cards", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Cards" },
  { marketId: 273, devName: "ASIAN_HANDICAP_CARDS", label: "Asian Handicap Cards", template: "handicap_2way", lineRequired: true, selectionOrder: HOME_AWAY as unknown as string[], group: "Cards" },
  { marketId: 274, devName: "BOTH_TEAMS_TO_RECEIVE_A_CARD", label: "Both Teams To Receive a Card", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Cards" },
  { marketId: 275, devName: "TEAM_PERFORMANCES", label: "Team Performances", template: "list", group: "Cards" },
  { marketId: 276, devName: "BOTH_TEAMS_TO_RECEIVE_MORE_THAN_TWO_CARDS", label: "Both Teams To Receive >2 Cards", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Cards" },
  { marketId: 277, devName: "HANDICAP_CARDS", label: "Handicap Cards", template: "handicap_2way", lineRequired: true, selectionOrder: HOME_AWAY as unknown as string[], group: "Cards" },
  { marketId: 278, devName: "ALTERNATIVE_HANDICAP_CARDS", label: "Alternative Handicap Cards", template: "handicap_2way", lineRequired: true, selectionOrder: HOME_AWAY as unknown as string[], group: "Cards" },
  { marketId: 279, devName: "FIRST_CARD_RECEIVED", label: "First Card Received", template: "1x2", selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Cards" },
  { marketId: 280, devName: "TIME_OF_FIRST_CARD", label: "Time of First Card", template: "race_time", group: "Cards" },
  { marketId: 281, devName: "TEAM_CARDS", label: "Team Cards", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Cards" },
  { marketId: 282, devName: "RED_CARD_IN_MATCH", label: "Red Card in Match", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Cards" },
  { marketId: 283, devName: "PENALTY_IN_MATCH", label: "Penalty in Match", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Cards" },
  { marketId: 284, devName: "TEAM_SHOTS_ON_TARGET", label: "Team Shots on Target", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Stats" },
  { marketId: 285, devName: "TEAM_SHOTS", label: "Team Shots", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Stats" },
  { marketId: 286, devName: "TEAM_OFFSIDES", label: "Team Offsides", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Stats" },
  { marketId: 287, devName: "PLAYER_TOTAL_TACKLES", label: "Player Total Tackles", template: "player_prop", group: "Player Props" },
  { marketId: 290, devName: "PLAYER_TOTAL_PASSES", label: "Player Total Passes", template: "player_prop", group: "Player Props" },
  { marketId: 291, devName: "MATCH_SHOTS_ON_TARGET", label: "Match Shots on Target", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Stats" },
  { marketId: 292, devName: "MATCH_SHOTS", label: "Match Shots", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Stats" },
  { marketId: 293, devName: "MATCH_TACKLES", label: "Match Tackles", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Stats" },
  { marketId: 294, devName: "MATCH_OFFSIDES", label: "Match Offsides", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Stats" },
  { marketId: 267, devName: "PLAYER_TOTAL_SHOTS_ON_TARGET", label: "Player Total Shots on Target", template: "player_prop", group: "Player Props" },
  { marketId: 268, devName: "PLAYER_TOTAL_SHOTS", label: "Player Total Shots", template: "player_prop", group: "Player Props" },
  { marketId: 331, devName: "PLAYER_TO_SCORE", label: "Player To Score", template: "player_prop", group: "Player Props" },
  { marketId: 332, devName: "PLAYER_TO_ASSIST", label: "Player To Assist", template: "player_prop", group: "Player Props" },
  { marketId: 333, devName: "PLAYER_TO_SCORE_OR_ASSIST", label: "Player To Score or Assist", template: "player_prop", group: "Player Props" },

  // Alternatif totals / scorer / zaman marketleri (devam)
  { marketId: 11, devName: "LAST_TEAM_TO_SCORE", label: "Last Team To Score", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Goals" },
  { marketId: 23, devName: "TO_WIN_2ND_HALF", label: "To Win 2nd Half", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Halves" },
  { marketId: 25, devName: "TEAM_TO_SCORE_IN_2ND_HALF", label: "Team To Score in 2nd Half", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Halves" },
  { marketId: 27, devName: "1ST_HALF_GOAL_LINE", label: "1st Half Goal Line", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 28, devName: "1ST_HALF_GOALS", label: "1st Half Goals", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 32, devName: "1ST_HALF_HANDICAP", label: "1st Half Handicap", template: "handicap_3way", lineRequired: true, selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Handicap" },
  { marketId: 34, devName: "FIRST_10_MIN_WINNER", label: "First 10 Min Winner", template: "1x2", selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Time" },
  { marketId: 37, devName: "RESULT_TOTAL_GOALS", label: "Result & Total Goals", template: "grid", group: "Combos" },
  { marketId: 40, devName: "TO_WIN_BOTH_HALVES", label: "To Win Both Halves", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Halves" },
  { marketId: 42, devName: "HOME_ODD_EVEN", label: "Home Odd/Even", template: "ou_odd_even", selectionOrder: ["Odd", "Even"], group: "Totals" },
  { marketId: 43, devName: "AWAY_ODD_EVEN", label: "Away Odd/Even", template: "ou_odd_even", selectionOrder: ["Odd", "Even"], group: "Totals" },
  { marketId: 44, devName: "ODD_EVEN", label: "Odd/Even", template: "ou_odd_even", selectionOrder: ["Odd", "Even"], group: "Totals" },
  { marketId: 45, devName: "ODD_EVEN_1ST_HALF", label: "1st Half Odd/Even", template: "ou_odd_even", selectionOrder: ["Odd", "Even"], group: "Totals" },
  { marketId: 46, devName: "WIN_TO_NIL", label: "Win To Nil", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Clean Sheet" },
  { marketId: 47, devName: "DOUBLE_CHANGE_1ST_HALF", label: "Double Chance 1st Half", template: "dc", selectionOrder: DC as unknown as string[], group: "Halves" },
  { marketId: 50, devName: "CLEAN_SHEET_HOME", label: "Home Clean Sheet", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Clean Sheet" },
  { marketId: 51, devName: "CLEAN_SHEET_AWAY", label: "Away Clean Sheet", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Clean Sheet" },
  { marketId: 53, devName: "2ND_HALF_GOALS", label: "2nd Half Goals", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Totals" },
  { marketId: 56, devName: "HANDICAP_RESULT", label: "Handicap Result", template: "handicap_3way", lineRequired: true, selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Handicap" },
  { marketId: 57, devName: "CORRECT_SCORE", label: "Correct Score", template: "cs", group: "Score" },

  // Other specials / outcomes
  { marketId: 8, devName: "FINAL_SCORE", label: "Final Score", template: "cs", group: "Score" },
  { marketId: 89, devName: "FULL_TIME_RESULT_ENHANCHED_PRICES", label: "Full Time Result – Enhanced Prices", template: "1x2", selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Match Result" },
  { marketId: 91, devName: "TEN_MINUTE_RESULT", label: "Ten Minute Result", template: "1x2", selectionOrder: HOME_DRAW_AWAY as unknown as string[], group: "Time" },
  { marketId: 126, devName: "WINNING_MARGIN", label: "Winning Margin", template: "list", group: "Specials" },
  { marketId: 127, devName: "SPECIALS", label: "Specials", template: "list", group: "Specials" },
  { marketId: 128, devName: "OWN_GOAL", label: "Own Goal", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Specials" },
  { marketId: 247, devName: "FIRST_TEAM_TO_SCORE", label: "First Team To Score", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Goals" },
  { marketId: 248, devName: "TEAM_TO_SCORE_IN_BOTH_HALVES", label: "Team To Score in Both Halves", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Goals" },
  { marketId: 250, devName: "FIRST_GOAL_METHOD", label: "First Goal Method", template: "list", group: "Goals" },
  { marketId: 256, devName: "TEAM_TO_QUALIFY", label: "Team To Qualify", template: "2way", selectionOrder: HOME_AWAY as unknown as string[], group: "Outrights" },
  { marketId: 266, devName: "TO_WIN_EITHER_HALF", label: "To Win Either Half", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Halves" },
  { marketId: 298, devName: "GAME_DECIDED_AFTER_PENALTIES", label: "Game Decided After Penalties", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Specials" },
  { marketId: 299, devName: "GAME_DECIDED_IN_EXTRA_TIME", label: "Game Decided in Extra Time", template: "yesno", selectionOrder: YES_NO as unknown as string[], group: "Specials" },
  { marketId: 300, devName: "METHOD_OF_VICTORY", label: "Method of Victory", template: "list", group: "Specials" },
  { marketId: 330, devName: "TEAM_TACKLES", label: "Team Tackles", template: "ou", lineRequired: true, selectionOrder: OVER_UNDER as unknown as string[], group: "Stats" },
];


