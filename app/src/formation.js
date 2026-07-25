const roleLabels = {
  defense: { 1: ["KP"], 2: ["VP", "OP"], 3: ["VP", "KP", "OP"] },
  midfield: { 1: ["KK"], 2: ["VK", "OK"], 3: ["VK", "KK", "OK"] },
  attack: { 1: ["KH"], 2: ["VH", "OH"], 3: ["VH", "KH", "OH"] },
};
const xPositions = { 1: [50], 2: [30, 70], 3: [20, 50, 80] };

const rowSlots = (count, y, type) => {
  const labels = roleLabels[type][count];
  if (!labels) return [];
  return labels.map((role, index) => [role, xPositions[count][index], y]);
};

export function createFormation(name) {
  const counts = name.replaceAll("–", "-").split("-").map(Number);
  if (counts.length !== 3 || counts.some((value) => !Number.isInteger(value) || value < 1 || value > 3) || counts.reduce((a, b) => a + b, 0) !== 7) {
    return null;
  }
  return [
    ["MV", 50, 91],
    ...rowSlots(counts[0], 70, "defense"),
    ...rowSlots(counts[1], 47, "midfield"),
    ...rowSlots(counts[2], 21, "attack"),
  ];
}

export function reorderLineup(lineup, fromSlots, toSlots) {
  if (lineup.length < 2 || fromSlots.length !== toSlots.length) return lineup;
  const candidates = lineup.slice(1).map((id, index) => ({ id, slot: fromSlots[index + 1] }));
  let best = null;

  const search = (remaining, order, cost) => {
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
  return [lineup[0], ...(best?.order || lineup.slice(1))];
}
