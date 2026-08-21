export type ExerciseView = "2d" | "3d";
export type ExerciseTool = "select" | "player-blue" | "player-red" | "ball" | "pass" | "run" | "text" | "draw" | "line" | "rectangle" | "circle" | "erase";

export interface ExerciseMarker {
  id: string;
  kind: "player" | "ball";
  team?: "blue" | "red";
  name: string;
  number?: number;
  x: number;
  z: number;
}

export interface ExercisePath {
  id: string;
  kind: "pass" | "run";
  fromId: string;
  toId: string;
}

export interface ExerciseAnnotation {
  id: string;
  kind: "text" | "draw" | "line" | "rectangle" | "circle";
  color: string;
  text?: string;
  points: Array<{ x: number; z: number }>;
}

export interface ExerciseDraft {
  name: string;
  markers: ExerciseMarker[];
  paths: ExercisePath[];
  annotations: ExerciseAnnotation[];
  updatedAt: string;
}

export function canPassBetween(from: ExerciseMarker, to: ExerciseMarker) {
  return from.kind === "ball" || to.kind === "ball" || from.team === to.team;
}

export function keepSingleBall(markers: ExerciseMarker[]) {
  let hasBall = false;
  return markers.filter((marker) => marker.kind !== "ball" || (!hasBall && (hasBall = true)));
}

export function canAddTeamPlayer(markers: ExerciseMarker[], team: "blue" | "red") {
  return markers.filter((marker) => marker.kind === "player" && marker.team === team).length < 11;
}
