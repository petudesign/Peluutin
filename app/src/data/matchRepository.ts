import { parseActiveMatch, parseScheduledMatches, parseTeams } from "../storage";
import type { ActiveMatch, Formation, ScheduledMatch, Sport, Team } from "../types";

const TEAMS_KEY = "vaihtopeli-teams";
const ACTIVE_MATCH_KEY = "peluutin-active-match";
const SCHEDULED_MATCHES_KEY = "peluutin-scheduled-matches";

export const matchRepository = {
  loadTeams(defaultFormations: Formation[]): Team[] {
    return parseTeams(localStorage.getItem(TEAMS_KEY), defaultFormations);
  },

  saveTeams(teams: Team[]): void {
    localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  },

  loadActiveMatch(sport?: Sport): ActiveMatch | null {
    const raw = localStorage.getItem(ACTIVE_MATCH_KEY);
    if (!sport) return parseActiveMatch(raw);
    try {
      const value: unknown = JSON.parse(raw || "null");
      if (value && typeof value === "object" && !Array.isArray(value) && ("football" in value || "futsal" in value)) {
        const matches = value as Record<Sport, unknown>;
        return parseActiveMatch(JSON.stringify(matches[sport] || null));
      }
      return parseActiveMatch(raw);
    } catch { return null; }
  },

  saveActiveMatch(match: ActiveMatch | null, sport: Sport): void {
    let matches: Partial<Record<Sport, ActiveMatch>> = {};
    try {
      const value: unknown = JSON.parse(localStorage.getItem(ACTIVE_MATCH_KEY) || "null");
      if (value && typeof value === "object" && !Array.isArray(value)) matches = value as Partial<Record<Sport, ActiveMatch>>;
      else if (value && typeof value === "object" && "teamId" in value) matches = { football: value as ActiveMatch };
    } catch { /* discard malformed active-match data */ }
    if (match) matches[sport] = match;
    else delete matches[sport];
    if (matches.football || matches.futsal) localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(matches));
    else localStorage.removeItem(ACTIVE_MATCH_KEY);
  },

  loadScheduledMatches(): ScheduledMatch[] {
    return parseScheduledMatches(localStorage.getItem(SCHEDULED_MATCHES_KEY));
  },

  saveScheduledMatches(matches: ScheduledMatch[]): void {
    localStorage.setItem(SCHEDULED_MATCHES_KEY, JSON.stringify(matches));
  },
};
