import type { PlayerId, Score } from "../../types";

export function applyBatchSubstitution(lineup: PlayerId[], incoming: PlayerId[], outgoingIndexes: number[]): PlayerId[] {
  if (!incoming.length || incoming.length > 5 || incoming.length !== outgoingIndexes.length) return lineup;
  if (new Set(incoming).size !== incoming.length || new Set(outgoingIndexes).size !== outgoingIndexes.length) return lineup;
  if (incoming.some((id) => lineup.includes(id)) || outgoingIndexes.some((index) => index < 0 || index >= lineup.length)) return lineup;

  const next = [...lineup];
  outgoingIndexes.forEach((index, order) => { next[index] = incoming[order]; });
  return next;
}

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

export function formatPitchPlayerName(name: string): string {
  const normalized = name.trim().replaceAll(/\s+/g, " ");
  if (normalized.length <= 12) return normalized;
  const parts = normalized.split(" ");
  if (parts.length === 1) return `${normalized.slice(0, 11)}…`;
  const abbreviated = `${parts[0]} ${parts.at(-1)![0]}.`;
  return abbreviated.length <= 14 ? abbreviated : `${parts[0].slice(0, 11)}…`;
}
