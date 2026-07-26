import type { FormationSlot, PlayerId, TeamSize } from "./types";

type RowType = "defense" | "midfield" | "attack";
type RowCount = 1 | 2 | 3 | 4 | 5;

const roleLabels: Record<RowType, Record<RowCount, string[]>> = {
  defense: {
    1: ["KP"], 2: ["VP", "OP"], 3: ["VP", "KP", "OP"],
    4: ["VP", "VKP", "OKP", "OP"], 5: ["VP", "VKP", "KP", "OKP", "OP"],
  },
  midfield: {
    1: ["KK"], 2: ["VK", "OK"], 3: ["VK", "KK", "OK"],
    4: ["VL", "VKK", "OKK", "OL"], 5: ["VL", "VKK", "KK", "OKK", "OL"],
  },
  attack: {
    1: ["KH"], 2: ["VH", "OH"], 3: ["VH", "KH", "OH"],
    4: ["VH", "VKH", "OKH", "OH"], 5: ["VLH", "VKH", "KH", "OKH", "OLH"],
  },
};
const xPositions: Record<RowCount, number[]> = {
  1: [50], 2: [30, 70], 3: [20, 50, 80], 4: [14, 38, 62, 86], 5: [11, 30, 50, 70, 89],
};

const rowCurve: Partial<Record<RowCount, number[]>> = {
  4: [-3, 3, 3, -3],
  5: [-5, 1, 4, 1, -5],
};

const rowSlots = (count: RowCount, y: number, type: RowType): FormationSlot[] =>
  roleLabels[type][count].map((role, index) => [
    role,
    xPositions[count][index],
    y + (rowCurve[count]?.[index] || 0),
  ]);

const formationCounts = (name: string) =>
  name.trim().replace(/[–—−]/g, "-").split("-").map(Number);

export function validateFormation(name: string, teamSize: TeamSize): string | null {
  if (!name.trim()) return "Kirjoita muodostelma, esimerkiksi 4–3–3.";
  if (!/^\d+(?:[-–—−]\d+){2,3}$/.test(name.trim())) {
    return "Käytä 3–4 numeroa väliviivoilla eroteltuna, esimerkiksi 4–3–3.";
  }

  const counts = formationCounts(name);
  const maxRowSize = teamSize === 5 ? 2 : teamSize === 8 ? 4 : 5;
  if (counts.some((value) => value < 1 || value > maxRowSize)) {
    return `${teamSize}v${teamSize}-pelissä rivillä voi olla enintään ${maxRowSize} pelaajaa.`;
  }

  const expectedFieldPlayers = teamSize - 1;
  const fieldPlayerCount = counts.reduce((total, count) => total + count, 0);
  if (fieldPlayerCount !== expectedFieldPlayers) {
    return `Riveillä pitää olla yhteensä ${expectedFieldPlayers} pelaajaa. Maalivahti lisätään erikseen.`;
  }
  return null;
}

export function createFormation(name: string, teamSize: TeamSize): FormationSlot[] | null {
  if (validateFormation(name, teamSize)) return null;
  const counts = formationCounts(name);
  const rows = counts as RowCount[];
  return [
    ["MV", 50, 91],
    ...rows.flatMap((count, index) => {
      const type: RowType = index === 0 ? "defense" : index === rows.length - 1 ? "attack" : "midfield";
      const y = 70 - (49 * index) / (rows.length - 1);
      return rowSlots(count, y, type);
    }),
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
