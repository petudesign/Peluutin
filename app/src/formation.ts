import type { FormationSlot, PlayerId } from "./types";

type RowType = "defense" | "midfield" | "attack";
type RowCount = 1 | 2 | 3;

const roleLabels: Record<RowType, Record<RowCount, string[]>> = {
  defense: { 1: ["KP"], 2: ["VP", "OP"], 3: ["VP", "KP", "OP"] },
  midfield: { 1: ["KK"], 2: ["VK", "OK"], 3: ["VK", "KK", "OK"] },
  attack: { 1: ["KH"], 2: ["VH", "OH"], 3: ["VH", "KH", "OH"] },
};
const xPositions: Record<RowCount, number[]> = { 1: [50], 2: [30, 70], 3: [20, 50, 80] };

const rowSlots = (count: RowCount, y: number, type: RowType): FormationSlot[] =>
  roleLabels[type][count].map((role, index) => [role, xPositions[count][index], y]);

export function createFormation(name: string): FormationSlot[] | null {
  const counts = name.replaceAll("–", "-").split("-").map(Number);
  if (
    counts.length !== 3
    || counts.some((value) => !Number.isInteger(value) || value < 1 || value > 3)
    || counts.reduce((a, b) => a + b, 0) !== 7
  ) return null;

  const [defense, midfield, attack] = counts as [RowCount, RowCount, RowCount];
  return [
    ["MV", 50, 91],
    ...rowSlots(defense, 70, "defense"),
    ...rowSlots(midfield, 47, "midfield"),
    ...rowSlots(attack, 21, "attack"),
  ];
}

interface Candidate {
  id: PlayerId;
  slot: FormationSlot;
}

interface SearchResult {
  cost: number;
  order: PlayerId[];
}

export function reorderLineup(
  lineup: PlayerId[],
  fromSlots: FormationSlot[],
  toSlots: FormationSlot[],
): PlayerId[] {
  if (lineup.length < 2 || fromSlots.length !== toSlots.length) return lineup;
  const candidates: Candidate[] = lineup.slice(1).map((id, index) => ({ id, slot: fromSlots[index + 1] }));
  let best: SearchResult | null = null;

  const search = (remaining: Candidate[], order: PlayerId[], cost: number): void => {
    if (!remaining.length) {
      if (!best || cost < best.cost) best = { cost, order };
      return;
    }
    const target = toSlots[order.length + 1];
    remaining.forEach((candidate, index) => {
      const sidePenalty = Math.sign(candidate.slot[1] - 50) !== Math.sign(target[1] - 50) ? 80 : 0;
      const nextCost = cost + Math.abs(candidate.slot[1] - target[1]) * 3 + Math.abs(candidate.slot[2] - target[2]) + sidePenalty;
      if (!best || nextCost < best.cost) {
        search(remaining.filter((_, itemIndex) => itemIndex !== index), [...order, candidate.id], nextCost);
      }
    });
  };

  search(candidates, [], 0);
  const result = best as SearchResult | null;
  return [lineup[0], ...(result?.order || lineup.slice(1))];
}
