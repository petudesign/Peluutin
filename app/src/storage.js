export const NAME_MAX_LENGTH = 60;
export const FORMATION_MAX_LENGTH = 12;
export const cleanName = (value) => String(value || "").trim().slice(0, NAME_MAX_LENGTH);

export function parseTeams(raw, defaultFormations) {
  try {
    const teams = JSON.parse(raw);
    if (!Array.isArray(teams)) return [];
    return teams.filter((team) =>
      team && typeof team.id === "string" && typeof team.name === "string" && Array.isArray(team.players)
    ).map((team) => {
      const formations = Array.isArray(team.formations)
        ? team.formations.filter((item) =>
          item && typeof item.id === "string" && typeof item.name === "string" && Array.isArray(item.slots)
        )
        : [];
      return {
        ...team,
        name: cleanName(team.name) || "Nimetön joukkue",
        players: team.players.filter((player) =>
          player && ["string", "number"].includes(typeof player.id) && typeof player.name === "string"
        ).map((player) => ({
          ...player,
          name: cleanName(player.name) || "Nimetön pelaaja",
          number: Number.isFinite(Number(player.number)) ? Math.min(99, Math.max(0, Number(player.number))) : 0,
        })),
        formations: formations.length ? formations : defaultFormations,
        history: Array.isArray(team.history)
          ? team.history.filter((match) =>
            match && typeof match.id === "string" && typeof match.opponent === "string"
            && Array.isArray(match.score) && Array.isArray(match.players)
          )
          : [],
      };
    });
  } catch {
    return [];
  }
}

export function parseActiveMatch(raw) {
  try {
    const saved = JSON.parse(raw);
    return saved
      && typeof saved.teamId === "string"
      && typeof saved.opponent === "string"
      && Array.isArray(saved.activePlayerIds)
      && Array.isArray(saved.lineup)
      && Array.isArray(saved.score)
      && saved.score.length === 2 && saved.score.every(Number.isFinite)
      && Number.isFinite(saved.seconds)
      && typeof saved.formation === "string"
      && ["home", "away"].includes(saved.venue)
      && saved.minutes && typeof saved.minutes === "object"
      && saved.goals && typeof saved.goals === "object"
      ? { ...saved, opponent: cleanName(saved.opponent) }
      : null;
  } catch {
    return null;
  }
}
