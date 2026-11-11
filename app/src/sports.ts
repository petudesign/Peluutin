import type { Sport, TeamSize } from "./types";

export interface SportDefinition {
  id: Sport;
  name: string;
  /** Finnish noun for a team of this sport, e.g. "Luo jalkapallojoukkue". */
  teamNoun: string;
  image: string;
  /** Formats offered for new matches and formations, smallest first. */
  teamSizes: readonly TeamSize[];
  defaultTeamSize: TeamSize;
  /** Whether the sport rotates whole lines (kentälliset) rather than single players. */
  fieldUnits: boolean;
  /** "own-half" keeps the lineup in the team's own half, as on a futsal court. */
  pitchLayout: "full" | "own-half";
}

// Adding a sport means adding it to the Sport type, describing it here and giving `.pitch-<id>` a pitch background.
export const SPORTS: readonly SportDefinition[] = [
  {
    id: "football",
    name: "Jalkapallo",
    teamNoun: "jalkapallojoukkue",
    image: "/assets/sport-football.png",
    teamSizes: [5, 8, 11],
    defaultTeamSize: 8,
    fieldUnits: false,
    pitchLayout: "full",
  },
  {
    id: "futsal",
    name: "Futsal",
    teamNoun: "futsaljoukkue",
    image: "/assets/sport-futsal.png",
    teamSizes: [5],
    defaultTeamSize: 5,
    fieldUnits: true,
    pitchLayout: "own-half",
  },
];

export const DEFAULT_SPORT: Sport = SPORTS[0].id;

export function isSport(value: unknown): value is Sport {
  return SPORTS.some((sport) => sport.id === value);
}

export function getSport(id: Sport | null | undefined): SportDefinition {
  return SPORTS.find((sport) => sport.id === id) ?? SPORTS[0];
}

/** The format to use for a sport, keeping the requested size when the sport offers it. */
export function teamSizeFor(id: Sport, requested?: number | null): TeamSize {
  const sport = getSport(id);
  return sport.teamSizes.find((size) => size === requested) ?? sport.defaultTeamSize;
}
