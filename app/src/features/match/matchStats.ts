import type { MatchRecord, PlayerId } from "../../types";

export type MatchResult = "Voitto" | "Tasapeli" | "Tappio";

export interface MatchSummary {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  totalMatchSeconds: number;
}

export interface PlayerStat {
  id: PlayerId;
  name: string;
  number: number;
  seconds: number;
  goals: number;
  appearances: number;
}

export interface TeamMetric {
  id: string;
  label: string;
  value: (summary: MatchSummary) => string;
}

const ownGoals = (match: MatchRecord) => match.venue === "away" ? match.score[1] : match.score[0];
const opponentGoals = (match: MatchRecord) => match.venue === "away" ? match.score[0] : match.score[1];

export const formatMinutes = (seconds: number) => `${Math.round(seconds / 60)} min`;

export function resultFor(match: MatchRecord): MatchResult {
  const own = ownGoals(match);
  const opponent = opponentGoals(match);
  return own > opponent ? "Voitto" : own < opponent ? "Tappio" : "Tasapeli";
}

export function summarizeMatches(matches: MatchRecord[]): MatchSummary {
  const summary: MatchSummary = { matches: matches.length, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, totalMatchSeconds: 0 };
  matches.forEach((match) => {
    const result = resultFor(match);
    if (result === "Voitto") summary.wins += 1;
    else if (result === "Tappio") summary.losses += 1;
    else summary.draws += 1;
    summary.goalsFor += ownGoals(match);
    summary.goalsAgainst += opponentGoals(match);
    summary.totalMatchSeconds += match.duration;
  });
  return summary;
}

export function summarizePlayers(matches: MatchRecord[]): PlayerStat[] {
  const stats = new Map<PlayerId, PlayerStat>();
  matches.forEach((match) => match.players.forEach((player) => {
    const current = stats.get(player.id) || { id: player.id, name: player.name, number: player.number, seconds: 0, goals: 0, appearances: 0 };
    current.name = player.name;
    current.number = player.number;
    current.seconds += player.seconds;
    current.goals += player.goals;
    if (player.seconds > 0) current.appearances += 1;
    stats.set(player.id, current);
  }));
  return [...stats.values()].sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name, "fi"));
}

// The team summary cards, in display order. A new metric is one more entry here.
export const TEAM_METRICS: readonly TeamMetric[] = [
  { id: "matches", label: "Ottelut", value: (summary) => String(summary.matches) },
  { id: "results", label: "Voitot · Tasapelit · Tappiot", value: (summary) => `${summary.wins} · ${summary.draws} · ${summary.losses}` },
  { id: "goals", label: "Maalit", value: (summary) => `${summary.goalsFor}–${summary.goalsAgainst}` },
  { id: "duration", label: "Otteluiden kesto yhteensä", value: (summary) => formatMinutes(summary.totalMatchSeconds) },
];
