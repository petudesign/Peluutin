import type { PlayerId, Score } from "../../types";

export function changePlayerGoal(
  goals: Record<PlayerId, number>,
  score: Score,
  playerId: PlayerId,
  ownScoreIndex: 0 | 1,
  amount: 1 | -1,
): { goals: Record<PlayerId, number>; score: Score } {
  const currentGoals = goals[playerId] || 0;
  if (amount < 0 && currentGoals === 0) return { goals, score };

  const nextScore: Score = [...score];
  nextScore[ownScoreIndex] = Math.max(0, nextScore[ownScoreIndex] + amount);
  return {
    goals: { ...goals, [playerId]: Math.max(0, currentGoals + amount) },
    score: nextScore,
  };
}

export type PlaytimeComparisonState = "behind" | "balanced" | "ahead";

export function comparePlaytime(playerSeconds: number, averageSeconds: number): {
  state: PlaytimeComparisonState;
  differenceSeconds: number;
} {
  const differenceSeconds = Math.round(playerSeconds - averageSeconds);
  const state = differenceSeconds < -30 ? "behind" : differenceSeconds > 30 ? "ahead" : "balanced";
  return { state, differenceSeconds };
}
