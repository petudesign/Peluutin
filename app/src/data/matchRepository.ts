import { parseActiveMatch, parseScheduledMatches, parseTeams } from "../storage";
import type { ActiveMatch, Formation, ScheduledMatch, Team } from "../types";

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

  loadActiveMatch(): ActiveMatch | null {
    return parseActiveMatch(localStorage.getItem(ACTIVE_MATCH_KEY));
  },

  saveActiveMatch(match: ActiveMatch | null): void {
    if (match) localStorage.setItem(ACTIVE_MATCH_KEY, JSON.stringify(match));
    else localStorage.removeItem(ACTIVE_MATCH_KEY);
  },

  loadScheduledMatches(): ScheduledMatch[] {
    return parseScheduledMatches(localStorage.getItem(SCHEDULED_MATCHES_KEY));
  },

  saveScheduledMatches(matches: ScheduledMatch[]): void {
    localStorage.setItem(SCHEDULED_MATCHES_KEY, JSON.stringify(matches));
  },
};
