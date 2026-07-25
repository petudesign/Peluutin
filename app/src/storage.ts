import type { ActiveMatch, Formation, MatchRecord, Player, Score, Team, Venue } from "./types";

export const NAME_MAX_LENGTH = 60;
export const FORMATION_MAX_LENGTH = 12;
export const cleanName = (value: unknown): string => String(value || "").trim().slice(0, NAME_MAX_LENGTH);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parsePlayer = (value: unknown): Player | null => {
  if (!isRecord(value) || !["string", "number"].includes(typeof value.id) || typeof value.name !== "string") return null;
  return {
    id: value.id as Player["id"],
    name: cleanName(value.name) || "Nimetön pelaaja",
    number: Number.isFinite(Number(value.number)) ? Math.min(99, Math.max(0, Number(value.number))) : 0,
  };
};

const isFormation = (value: unknown): value is Formation =>
  isRecord(value) && typeof value.id === "string" && typeof value.name === "string" && Array.isArray(value.slots);

const isMatchRecord = (value: unknown): value is MatchRecord =>
  isRecord(value) && typeof value.id === "string" && typeof value.opponent === "string"
  && Array.isArray(value.score) && Array.isArray(value.players);

export function parseTeams(raw: string | null, defaultFormations: Formation[]): Team[] {
  try {
    const teams: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(teams)) return [];
    return teams.flatMap((value): Team[] => {
      if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || !Array.isArray(value.players)) return [];
      const formations = Array.isArray(value.formations) ? value.formations.filter(isFormation) : [];
      return [{
        id: value.id,
        name: cleanName(value.name) || "Nimetön joukkue",
        players: value.players.map(parsePlayer).filter((player): player is Player => player !== null),
        formations: formations.length ? formations : defaultFormations,
        history: Array.isArray(value.history) ? value.history.filter(isMatchRecord) : [],
      }];
    });
  } catch {
    return [];
  }
}

export function parseActiveMatch(raw: string | null): ActiveMatch | null {
  try {
    const value: unknown = JSON.parse(raw || "null");
    if (
      !isRecord(value)
      || typeof value.teamId !== "string"
      || typeof value.opponent !== "string"
      || !Array.isArray(value.activePlayerIds)
      || !Array.isArray(value.lineup)
      || !Array.isArray(value.score)
      || value.score.length !== 2 || !value.score.every(Number.isFinite)
      || !Number.isFinite(value.seconds)
      || typeof value.formation !== "string"
      || !["home", "away"].includes(String(value.venue))
      || !isRecord(value.minutes)
      || !isRecord(value.goals)
    ) return null;

    return {
      teamId: value.teamId,
      opponent: cleanName(value.opponent),
      venue: value.venue as Venue,
      activePlayerIds: value.activePlayerIds as ActiveMatch["activePlayerIds"],
      formation: value.formation,
      lineup: value.lineup as ActiveMatch["lineup"],
      seconds: value.seconds as number,
      score: value.score as Score,
      minutes: value.minutes as ActiveMatch["minutes"],
      goals: value.goals as ActiveMatch["goals"],
    };
  } catch {
    return null;
  }
}
