import type { ActiveMatch, Formation, MatchRecord, Player, ScheduledMatch, Score, Team, TeamSize, Venue } from "./types";

export const NAME_MAX_LENGTH = 60;
export const FORMATION_MAX_LENGTH = 12;
export const MAX_FORMATIONS = 9;
export const MAX_FORMATIONS_PER_TEAM_SIZE = 3;
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

const parseFormation = (value: unknown): Formation | null => {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || !Array.isArray(value.slots)) return null;
  const inferredTeamSize = value.slots.length;
  const teamSize = [5, 8, 11].includes(Number(value.teamSize))
    ? Number(value.teamSize)
    : inferredTeamSize;
  if (![5, 8, 11].includes(teamSize)) return null;
  return { id: value.id, name: value.name, teamSize: teamSize as TeamSize, slots: value.slots as Formation["slots"] };
};

const isMatchRecord = (value: unknown): value is MatchRecord =>
  isRecord(value) && typeof value.id === "string" && typeof value.opponent === "string"
  && Array.isArray(value.score) && Array.isArray(value.players);

export function parseTeams(raw: string | null, defaultFormations: Formation[]): Team[] {
  try {
    const teams: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(teams)) return [];
    return teams.flatMap((value): Team[] => {
      if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || !Array.isArray(value.players)) return [];
      const formationCounts = new Map<TeamSize, number>();
      const formations = Array.isArray(value.formations)
        ? value.formations
          .map(parseFormation)
          .filter((item): item is Formation => {
            if (!item) return false;
            const count = formationCounts.get(item.teamSize) || 0;
            if (count >= MAX_FORMATIONS_PER_TEAM_SIZE) return false;
            formationCounts.set(item.teamSize, count + 1);
            return true;
          })
          .slice(0, MAX_FORMATIONS)
        : [];
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
      scheduledMatchId: typeof value.scheduledMatchId === "string" ? value.scheduledMatchId : undefined,
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

export function parseScheduledMatches(raw: string | null): ScheduledMatch[] {
  try {
    const values: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(values)) return [];
    return values.flatMap((value): ScheduledMatch[] => {
      if (
        !isRecord(value)
        || typeof value.id !== "string"
        || typeof value.teamId !== "string"
        || typeof value.opponent !== "string"
        || typeof value.formation !== "string"
        || typeof value.scheduledAt !== "string"
        || Number.isNaN(Date.parse(value.scheduledAt))
        || !["home", "away"].includes(String(value.venue))
        || !Array.isArray(value.activePlayerIds)
        || !Array.isArray(value.lineup)
      ) return [];
      return [{
        id: value.id,
        scheduledAt: value.scheduledAt,
        teamId: value.teamId,
        opponent: cleanName(value.opponent),
        venue: value.venue as Venue,
        formation: value.formation,
        activePlayerIds: value.activePlayerIds as ScheduledMatch["activePlayerIds"],
        lineup: value.lineup as ScheduledMatch["lineup"],
      }];
    }).sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  } catch {
    return [];
  }
}
