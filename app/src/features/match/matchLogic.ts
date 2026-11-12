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

const PITCH_NAME_MAX_LENGTH = 16;

// Pitch cards fit two short lines, so long names keep the first name and shorten the rest to an initial.
export function formatPitchPlayerName(name: string): string {
  const normalized = name.trim().replaceAll(/\s+/g, " ");
  if (normalized.length <= PITCH_NAME_MAX_LENGTH) return normalized;
  const parts = normalized.split(" ");
  if (parts.length > 1) {
    const abbreviated = `${parts[0]} ${parts.at(-1)![0]}.`;
    if (abbreviated.length <= PITCH_NAME_MAX_LENGTH) return abbreviated;
  }
  const [first, ...rest] = parts[0].split("-");
  if (rest.length) {
    const abbreviated = `${first}-${rest[0][0]}.`;
    if (abbreviated.length <= PITCH_NAME_MAX_LENGTH) return abbreviated;
  }
  return `${parts[0].slice(0, PITCH_NAME_MAX_LENGTH - 1)}…`;
}

export function pitchNameLength(name: string): "short" | "medium" | "long" {
  return name.length <= 7 ? "short" : name.length <= 11 ? "medium" : "long";
}

/** Credits an already counted goal to a player, leaving the score as it is. */
export function creditScorer(goals: Record<PlayerId, number>, playerId: PlayerId): Record<PlayerId, number> {
  return { ...goals, [playerId]: (goals[playerId] || 0) + 1 };
}

/** Own goals that no player has been credited with, e.g. goals skipped in the scorer prompt. */
export function uncreditedGoals(score: Score, ownScoreIndex: 0 | 1, goals: Record<PlayerId, number>): number {
  const credited = Object.values(goals).reduce((sum, count) => sum + count, 0);
  return Math.max(0, score[ownScoreIndex] - credited);
}
