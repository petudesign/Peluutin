import type { ExerciseDraft } from "./exerciseTypes";

export function createExerciseShareDraft(draft: ExerciseDraft, withoutPlayerNames = true): ExerciseDraft {
  return {
    ...draft,
    markers: draft.markers.map((marker, index) => ({
      ...marker,
      number: withoutPlayerNames && marker.kind === "player" ? undefined : marker.number,
      name: withoutPlayerNames && marker.kind === "player" ? `Pelaaja ${index + 1}` : marker.name,
    })),
  };
}
