export type PlayerId = string | number;
export type Venue = "home" | "away";
export type Score = [number, number];
export type FormationSlot = readonly [role: string, x: number, y: number];
export type TeamSize = 5 | 8 | 11;

export interface Player {
  id: PlayerId;
  name: string;
  number: number;
}

export interface Formation {
  id: string;
  name: string;
  teamSize: TeamSize;
  slots: FormationSlot[];
}

export interface MatchPlayer extends Player {
  seconds: number;
  goals: number;
}

export interface MatchRecord {
  id: string;
  playedAt: string;
  opponent: string;
  venue: Venue;
  score: Score;
  duration: number;
  formation: string;
  players: MatchPlayer[];
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  formations: Formation[];
  history: MatchRecord[];
}

export interface ActiveMatch {
  scheduledMatchId?: string;
  teamId: string;
  opponent: string;
  venue: Venue;
  activePlayerIds: PlayerId[];
  formation: string;
  lineup: PlayerId[];
  seconds: number;
  score: Score;
  minutes: Record<PlayerId, number>;
  goals: Record<PlayerId, number>;
}

export interface ScheduledMatch {
  id: string;
  scheduledAt: string;
  teamId: string;
  opponent: string;
  venue: Venue;
  formation: string;
  activePlayerIds: PlayerId[];
  lineup: PlayerId[];
}

export type SelectedPlayer =
  | { source: "bench"; id: PlayerId }
  | { source: "field"; id: PlayerId; index: number };
