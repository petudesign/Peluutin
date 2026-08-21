export type ExerciseView = "2d" | "3d";
export type ExerciseTool = "select" | "player-blue" | "player-red" | "ball" | "pass" | "run";

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

export interface ExerciseDraft {
  name: string;
  markers: ExerciseMarker[];
  paths: ExercisePath[];
  updatedAt: string;
}
