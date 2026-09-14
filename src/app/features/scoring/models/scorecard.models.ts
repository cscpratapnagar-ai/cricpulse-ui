export interface ScorecardBattingRow {
  playerId: string;
  playerName: string;
  dismissal?: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
}

export interface ScorecardBowlingRow {
  playerId: string;
  playerName: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface ScorecardData {
  inningsId: string;
  inningsNumber: number;
  teamName: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  extras: number;
  batting: ScorecardBattingRow[];
  bowling: ScorecardBowlingRow[];
  fallOfWickets: string[];
}
