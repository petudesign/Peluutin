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
