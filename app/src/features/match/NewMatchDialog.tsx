import { useEffect, useState } from "react";
import { NAME_MAX_LENGTH } from "../../storage";
import type { Formation, Player, PlayerId, Team, TeamSize, Venue } from "../../types";

interface NewMatchDialogProps {
  teams: Team[];
  teamId: string;
  opponent: string;
  venue: Venue;
  activePlayerIds: PlayerId[];
  roster: Player[];
  formations: Formation[];
  initialFormationId: string;
  onSelectTeam: (team: Team) => void;
  onOpponentChange: (opponent: string) => void;
  onVenueChange: (venue: Venue) => void;
  onActivePlayerIdsChange: (ids: PlayerId[]) => void;
  onCreate: (formationId: string, lineup: PlayerId[]) => void;
  onClose: () => void;
}

export function NewMatchDialog({
  teams,
  teamId,
  opponent,
  venue,
  activePlayerIds,
  roster,
  formations,
  initialFormationId,
  onSelectTeam,
  onOpponentChange,
  onVenueChange,
  onActivePlayerIdsChange,
  onCreate,
  onClose,
}: NewMatchDialogProps) {
  const initialFormation = formations.find((item) => item.id === initialFormationId) || formations[0];
  const [step, setStep] = useState<"details" | "lineup">("details");
  const [teamSize, setTeamSize] = useState<TeamSize>(initialFormation?.teamSize || 8);
  const availableFormations = formations.filter((item) => item.teamSize === teamSize);
  const [formationId, setFormationId] = useState(initialFormation?.id || "");
  const [lineup, setLineup] = useState<PlayerId[]>([]);
  const selectedFormation = availableFormations.find((item) => item.id === formationId) || availableFormations[0];
  const requiredPlayers = selectedFormation?.slots.length || 0;
  const canCreate = Boolean(opponent.trim() && requiredPlayers && activePlayerIds.length >= requiredPlayers);
  const automaticLineup = activePlayerIds.slice(0, requiredPlayers);
  const activePlayersAlphabetically = roster
    .filter((player) => activePlayerIds.includes(player.id))
    .sort((a, b) => a.name.localeCompare(b.name, "fi", { sensitivity: "base" }));

  useEffect(() => {
    if (!availableFormations.some((item) => item.id === formationId)) {
      setFormationId(availableFormations[0]?.id || "");
    }
  }, [availableFormations, formationId]);

  const togglePlayer = (playerId: PlayerId) => {
    onActivePlayerIdsChange(
      activePlayerIds.includes(playerId)
        ? activePlayerIds.filter((id) => id !== playerId)
        : [...activePlayerIds, playerId],
    );
  };

  const openLineup = () => {
    setLineup(automaticLineup);
    setStep("lineup");
  };

  const changeLineupPlayer = (index: number, playerId: PlayerId) => {
    setLineup((current) => {
      const next = [...current];
      const previousIndex = next.indexOf(playerId);
      if (previousIndex >= 0) next[previousIndex] = next[index];
      next[index] = playerId;
      return next;
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`new-match-modal ${step === "lineup" ? "lineup-step" : ""}`} role="dialog" aria-modal="true" aria-labelledby="new-match-title">
        <div className="settings-header">
          {step === "lineup" && (
            <button className="lineup-back-button" onClick={() => setStep("details")} aria-label="Takaisin pelin tietoihin">
              <img src="/assets/icon-back.svg" alt="" />
            </button>
          )}
          <div>
            <span className="eyebrow">{step === "details" ? "OTTELU" : "KOKOONPANO"}</span>
            <h2 id="new-match-title">{step === "details" ? "Luo uusi peli" : "Muokkaa aloituskokoonpanoa"}</h2>
          </div>
          <button className="close-button" onClick={onClose}>Sulje</button>
        </div>
        {step === "details" ? (
          <>
            <label>
              <span>Oma joukkue</span>
              <select
                value={teamId}
                onChange={(event) => {
                  const team = teams.find((item) => item.id === event.target.value);
                  if (team) onSelectTeam(team);
                }}
              >
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
            <label>
              <span>Vastustaja</span>
              <input
                autoFocus
                maxLength={NAME_MAX_LENGTH}
                value={opponent}
                onChange={(event) => onOpponentChange(event.target.value)}
                placeholder="Esim. Vastustaja FC"
              />
            </label>
            <label>
              <span>Pelimuoto</span>
              <select
                value={teamSize}
                onChange={(event) => {
                  const nextSize = Number(event.target.value) as TeamSize;
                  setTeamSize(nextSize);
                  setFormationId(formations.find((item) => item.teamSize === nextSize)?.id || "");
                }}
              >
                <option value="5">5v5</option>
                <option value="8">8v8</option>
                <option value="11">11v11</option>
              </select>
              {!availableFormations.length && <small className="form-warning">Lisää ensin {teamSize}v{teamSize}-muodostelma asetuksissa.</small>}
            </label>
            <fieldset>
              <legend>Oma joukkue pelaa</legend>
              <div className="venue-switch">
                <button type="button" className={venue === "home" ? "active" : ""} onClick={() => onVenueChange("home")}>Kotona</button>
                <button type="button" className={venue === "away" ? "active" : ""} onClick={() => onVenueChange("away")}>Vieraissa</button>
              </div>
            </fieldset>
            <fieldset>
              <div className="attendance-heading">
                <legend>Aktiiviset pelaajat</legend>
                <span>{activePlayerIds.length}/{roster.length} mukana</span>
              </div>
              <div className="attendance-list">
                {roster.map((player) => (
                  <label key={player.id}>
                    <input type="checkbox" checked={activePlayerIds.includes(player.id)} onChange={() => togglePlayer(player.id)} />
                    <span className="avatar">{player.number}</span>
                    <strong>{player.name}</strong>
                  </label>
                ))}
              </div>
              {activePlayerIds.length < requiredPlayers && (
                <p className="form-warning">Valitse vähintään {requiredPlayers} pelaajaa tähän pelimuotoon.</p>
              )}
            </fieldset>
            <button className="create-match-button" disabled={!canCreate} onClick={() => onCreate(formationId, automaticLineup)}>Luo peli</button>
            <button className="lineup-edit-trigger" disabled={!canCreate} onClick={openLineup}>Muokkaa aloituskokoonpanoa</button>
          </>
        ) : (
          <>
            <p className="lineup-intro">Pelaajat on täytetty automaattisesti. Vaihda vain ne paikat, joita haluat muuttaa.</p>
            <label>
              <span>Muodostelma</span>
              <select value={formationId} onChange={(event) => setFormationId(event.target.value)}>
                {availableFormations.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <div className="starting-lineup-list">
              {selectedFormation.slots.map(([role], index) => (
                <label key={`${formationId}-${index}`}>
                  <span>{role}</span>
                  <select
                    value={lineup[index]}
                    onChange={(event) => {
                      const playerId = activePlayerIds.find((id) => String(id) === event.target.value);
                      if (playerId !== undefined) changeLineupPlayer(index, playerId);
                    }}
                  >
                    {activePlayersAlphabetically.map((player) => (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <button className="create-match-button" onClick={() => onCreate(formationId, lineup)}>Luo peli tällä kokoonpanolla</button>
          </>
        )}
      </section>
    </div>
  );
}
