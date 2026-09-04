import { parseActiveMatch, parseScheduledMatches, parseTeams } from "../storage";
import type { ActiveMatch, Formation, ScheduledMatch, Sport, Team } from "../types";

const TEAMS_KEY = "vaihtopeli-teams";
const ACTIVE_MATCH_KEY = "peluutin-active-match";
const SCHEDULED_MATCHES_KEY = "peluutin-scheduled-matches";
type StoredActiveMatches = Partial<Record<Sport, ActiveMatch>> & { legacy?: ActiveMatch };

export const matchRepository = {
  loadTeams(defaultFormations: Formation[]): Team[] {
    return parseTeams(localStorage.getItem(TEAMS_KEY), defaultFormations);
  },

  saveTeams(teams: Team[]): void {
    localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  },

  loadActiveMatch(sport?: Sport, teamIds?: string[]): ActiveMatch | null {
    const raw = localStorage.getItem(ACTIVE_MATCH_KEY);
    if (!sport) return parseActiveMatch(raw);
    try {
      const value: unknown = JSON.parse(raw || "null");
      const isStoredMatches = value && typeof value === "object" && !Array.isArray(value)
        && ("football" in value || "futsal" in value || "legacy" in value);
      if (isStoredMatches) {
        const matches = value as StoredActiveMatches;
        const storedMatch = parseActiveMatch(JSON.stringify(matches[sport] || null));
        if (storedMatch) return storedMatch;
        const legacy = parseActiveMatch(JSON.stringify(matches.legacy || null));
        return legacy && (!teamIds || teamIds.includes(legacy.teamId)) ? legacy : null;
      }
      const legacy = parseActiveMatch(raw);
      return legacy && (!teamIds || teamIds.includes(legacy.teamId)) ? legacy : null;
    } catch { return null; }
  },

  saveActiveMatch(match: ActiveMatch | null, sport: Sport): void {
    let matches: StoredActiveMatches = {};
    try {
      const value: unknown = JSON.parse(localStorage.getItem(ACTIVE_MATCH_KEY) || "null");
      if (value && typeof value === "object" && !Array.isArray(value) && "teamId" in value) {
        const legacy = parseActiveMatch(JSON.stringify(value));
        if (legacy) matches.legacy = legacy;
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        const stored = value as StoredActiveMatches;
        matches = {
          football: stored.football,
          futsal: stored.futsal,
          legacy: stored.legacy,
        };
      }
    } catch { /* discard malformed active-match data */ }
    if (match) {
      matches[sport] = match;
      if (matches.legacy?.teamId === match.teamId) delete matches.legacy;
    }
    else delete matches[sport];
    if (matches.football || matches.futsal || matches.legacy) localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(matches));
    else localStorage.removeItem(ACTIVE_MATCH_KEY);
  },

  loadScheduledMatches(): ScheduledMatch[] {
    return parseScheduledMatches(localStorage.getItem(SCHEDULED_MATCHES_KEY));
  },

  saveScheduledMatches(matches: ScheduledMatch[]): void {
    localStorage.setItem(SCHEDULED_MATCHES_KEY, JSON.stringify(matches));
  },
};
