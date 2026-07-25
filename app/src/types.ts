export type PlayerId = string | number;
export type Venue = "home" | "away";
export type Score = [number, number];
export type FormationSlot = readonly [role: string, x: number, y: number];

export interface Player {
  id: PlayerId;
  name: string;
  number: number;
}

export interface Formation {
  id: string;
  name: string;
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

export type SelectedPlayer =
  | { source: "bench"; id: PlayerId }
  | { source: "field"; id: PlayerId; index: number };
