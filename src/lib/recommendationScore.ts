export type MatchBand = "STRONG" | "GOOD" | "EXPLORATORY";

export type MatchDetails = { matchedOn: string[]; builds: string[]; outcome: string; whyNow: string };

export type SavedRankedProject = {
  projectId?: string;
  projectTitle?: string;
  rank?: number;
  matchBand?: MatchBand;
  reasonCodes?: string[];
  reason?: string;
  matchDetails?: MatchDetails;
};

export function matchBandLabel(value: MatchBand | string | null | undefined): string {
  if (value === "STRONG") return "Strong match";
  if (value === "GOOD") return "Good match";
  if (value === "EXPLORATORY") return "Worth exploring";
  return "Worth exploring";
}
