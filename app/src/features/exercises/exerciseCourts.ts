import type { Sport } from "../../types";
import type { ExerciseGoalSize, ExercisePassStyle, ExercisePitchPreset, ExercisePitchStyle, ExerciseShotStyle, ExerciseTool } from "./exerciseTypes";

/** How fast routes play back: the court's real-world scale and how fast a shot travels in its sport. */
export interface ExercisePace { metersPerUnit: number; shotKmh: number }

/** Playing area and the ground drawn around it, in scene units. */
export interface ExercisePitchDimensions { length: number; width: number; groundLength: number; groundWidth: number }

export type ExerciseCourtId = "football" | "basketball";

/** Equipment the element menu can offer; goals are offered separately through `portableGoals`. */
export type ExerciseEquipmentTool = Extract<ExerciseTool, "ball" | "cone" | "tall-cone" | "bench" | "ladder" | "dummy">;

export interface ExerciseCourt {
  id: ExerciseCourtId;
  /** Shown in the planner's sport picker. */
  label: string;
  /** Real-world scale and shot speed, so routes play back at believable speeds. */
  pace: ExercisePace;
  /** Field sizes offered, the reference size first; the camera and line markings scale from it. */
  presets: ReadonlyArray<{ id: ExercisePitchPreset; label: string; dimensions: ExercisePitchDimensions; hoopEnds?: ReadonlyArray<-1 | 1> }>;
  styles: ReadonlyArray<{ id: ExercisePitchStyle; label: string }>;
  defaultStyle: ExercisePitchStyle;
  /** Goal sizes offered for the goals at each end, or none when the court has no end goals to size. */
  endGoalSizes: readonly ExerciseGoalSize[];
  equipment: readonly ExerciseEquipmentTool[];
  /** Whether training goals can be placed on the court. */
  portableGoals: boolean;
  /** What a shot route is called in this sport. */
  shotLabel: string;
  /** The kinds of pass offered in this sport, the default first. */
  passStyles: ReadonlyArray<{ id: ExercisePassStyle; label: string }>;
  /** The ways a shot at the basket can be taken, the default first; none where shots are not at a basket. */
  shotStyles: ReadonlyArray<{ id: ExerciseShotStyle; label: string }>;
  maxPlayersPerTeam: number;
  /** Size of players, balls and equipment relative to the football pitch, so they read well on a larger court. */
  markerScale: number;
}

/** Distance from the baseline to the centre of the basket, in metres. */
export const BASKETBALL_HOOP_FROM_BASELINE = 1.575;

// A basketball court is 28 × 15 m; at 1.5 m per unit its half court is about the size of the football training pitch.
const BASKETBALL_METERS_PER_UNIT = 1.5;
const basketball = (lengthMeters: number) => {
  const length = lengthMeters / BASKETBALL_METERS_PER_UNIT, width = 15 / BASKETBALL_METERS_PER_UNIT;
  return { length, width, groundLength: length + 1.4, groundWidth: width + 1.4 };
};

// Adding a court means listing it here and giving the canvas a surface and ball for it.
const EXERCISE_COURTS: Record<ExerciseCourtId, ExerciseCourt> = {
  football: {
    id: "football",
    label: "Jalkapallo",
    pace: { metersPerUnit: 8.75, shotKmh: 75 },
    presets: [
      { id: "training", label: "Harjoituskenttä", dimensions: { length: 11.5, width: 7.5, groundLength: 13, groundWidth: 8.8 } },
      { id: "full", label: "Iso kenttä", dimensions: { length: 16, width: 10.4, groundLength: 17.2, groundWidth: 11.4 } },
    ],
    styles: [{ id: "dark", label: "Tumma" }, { id: "grass", label: "Nurmi" }, { id: "plain-grass", label: "Pelkkä nurmi" }],
    defaultStyle: "grass",
    endGoalSizes: ["small", "youth", "full"],
    equipment: ["ball", "cone", "tall-cone", "bench", "ladder", "dummy"],
    portableGoals: true,
    shotLabel: "Veto",
    passStyles: [{ id: "direct", label: "Maata pitkin" }, { id: "lob", label: "Nosto" }],
    shotStyles: [],
    maxPlayersPerTeam: 11,
    markerScale: 1,
  },
  basketball: {
    id: "basketball",
    label: "Koripallo",
    // A jump shot travels slowly on a high arc; about a second from release to the rim.
    pace: { metersPerUnit: BASKETBALL_METERS_PER_UNIT, shotKmh: 22 },
    // The half court keeps its basket at the left baseline and the centre line at the right.
    presets: [
      { id: "half", label: "Puolikenttä", dimensions: basketball(14), hoopEnds: [-1] },
      { id: "full", label: "Koko kenttä", dimensions: basketball(28), hoopEnds: [-1, 1] },
    ],
    styles: [{ id: "wood", label: "Parketti" }, { id: "dark", label: "Tumma" }],
    defaultStyle: "wood",
    endGoalSizes: [],
    equipment: ["ball", "cone", "tall-cone", "bench", "ladder"],
    portableGoals: false,
    shotLabel: "Heitto",
    passStyles: [{ id: "direct", label: "Suora" }, { id: "lob", label: "Lobbi" }, { id: "bounce", label: "Pomppu" }],
    shotStyles: [{ id: "jump", label: "Hyppyheitto" }, { id: "layup", label: "Lay-up" }, { id: "dunk", label: "Donkki" }],
    maxPlayersPerTeam: 12,
    // The full court is longer than the big football pitch, so the 2D view zooms further out.
    markerScale: 1.2,
  },
};

export const EXERCISE_COURT_LIST: readonly ExerciseCourt[] = Object.values(EXERCISE_COURTS);

// Futsal drills are drawn on the football pitch until futsal has a court of its own.
const COURT_FOR_SPORT: Record<Sport, ExerciseCourtId> = { football: "football", futsal: "football" };

/** The court a new exercise starts on for a team of this sport. */
export function exerciseCourtForSport(sport: Sport | null | undefined): ExerciseCourtId {
  return (sport && COURT_FOR_SPORT[sport]) || "football";
}

export function isExerciseCourtId(value: unknown): value is ExerciseCourtId {
  return typeof value === "string" && Object.hasOwn(EXERCISE_COURTS, value);
}

/** The court an exercise is drawn on. Drafts saved before exercises had a court were all drawn on the football pitch. */
export function getExerciseCourt(id: ExerciseCourtId | null | undefined): ExerciseCourt {
  return isExerciseCourtId(id) ? EXERCISE_COURTS[id] : EXERCISE_COURTS.football;
}

/** Where the baskets are on this court and field size, in scene units; empty for courts without baskets. */
export function getExerciseHoops(id: ExerciseCourtId | null | undefined, preset: ExercisePitchPreset): Array<{ x: number; z: number }> {
  const court = getExerciseCourt(id), entry = court.presets.find(item => item.id === preset) ?? court.presets[0];
  const inset = BASKETBALL_HOOP_FROM_BASELINE / court.pace.metersPerUnit;
  return (entry.hoopEnds ?? []).map(end => ({ x: end * (entry.dimensions.length / 2 - inset), z: 0 }));
}

export function getExercisePitchDimensions(id: ExerciseCourtId | null | undefined, preset: ExercisePitchPreset): ExercisePitchDimensions {
  const court = getExerciseCourt(id);
  return (court.presets.find(item => item.id === preset) ?? court.presets[0]).dimensions;
}
