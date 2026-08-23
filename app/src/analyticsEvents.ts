export type MatchDurationBucket = "under_15_min" | "15_to_45_min" | "over_45_min";

export const matchDurationBucket = (seconds: number): MatchDurationBucket => {
  if (seconds < 15 * 60) return "under_15_min";
  if (seconds <= 45 * 60) return "15_to_45_min";
  return "over_45_min";
};
