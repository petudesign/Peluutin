import { useEffect, useState } from "react";
import { NAME_MAX_LENGTH } from "../../storage";
import type { Formation, Player, PlayerId, ScheduledMatch, Sport, Team, TeamSize, Venue } from "../../types";
import { formatScheduledDate, parseScheduledDate, scheduledDateFromInputValue, scheduledDateToInputValue, scheduledStartError } from "./scheduledDate";

const defaultScheduledAt = () => {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return { date: formatScheduledDate(date), time: `${String(date.getHours()).padStart(2, "0")}:00` };
};

interface NewMatchDialogProps {
  teams: Team[];
  teamId: string;
  opponent: string;
  venue: Venue;
  activePlayerIds: PlayerId[];
  roster: Player[];
  formations: Formation[];
  initialFormationId: string;
  scheduledMatches: ScheduledMatch[];
  canStartNow: boolean;
  onSelectTeam: (team: Team) => void;
  onOpponentChange: (opponent: string) => void;
  onVenueChange: (venue: Venue) => void;
  onActivePlayerIdsChange: (ids: PlayerId[]) => void;
  onAddPlayers: () => void;
  onCreate: (formationId: string, lineup: PlayerId[]) => void;
  onSchedule: (scheduledAt: string, formationId: string, lineup: PlayerId[]) => void;
  onClose: () => void;
  sport: Sport;
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
  scheduledMatches,
  canStartNow,
  onSelectTeam,
  onOpponentChange,
  onVenueChange,
  onActivePlayerIdsChange,
  onAddPlayers,
  onCreate,
  onSchedule,
  onClose,
  sport,
}: NewMatchDialogProps) {
  const initialFormation = formations.find((item) => item.id === initialFormationId) || formations[0];
  const [step, setStep] = useState<"details" | "lineup">("details");
  const [teamSize, setTeamSize] = useState<TeamSize>(sport === "futsal" ? 5 : initialFormation?.teamSize || 8);
  const availableFormations = formations.filter((item) => item.teamSize === teamSize);
  const [formationId, setFormationId] = useState(initialFormation?.id || "");
  const [lineup, setLineup] = useState<PlayerId[]>([]);
  const [initialSchedule] = useState(defaultScheduledAt);
  const [scheduledDate, setScheduledDate] = useState(initialSchedule.date);
  const [scheduledTime, setScheduledTime] = useState(initialSchedule.time);
  const selectedFormation = availableFormations.find((item) => item.id === formationId) || availableFormations[0];
  const requiredPlayers = selectedFormation?.slots.length || 0;
  const canCreate = Boolean(opponent.trim() && requiredPlayers && activePlayerIds.length >= requiredPlayers);
  const needsMorePlayers = roster.length < requiredPlayers;
  const automaticLineup = activePlayerIds.slice(0, requiredPlayers);
  const activePlayersAlphabetically = roster
    .filter((player) => activePlayerIds.includes(player.id))
    .sort((a, b) => a.name.localeCompare(b.name, "fi", { sensitivity: "base" }));
  const scheduledAt = parseScheduledDate(scheduledDate, scheduledTime);
  const scheduleError = scheduledStartError(scheduledAt, teamId, scheduledMatches);
  const canSchedule = canCreate && !scheduleError;

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

  const schedule = (selectedLineup: PlayerId[]) => {
    if (!scheduledAt || !canSchedule) return;
    onSchedule(scheduledAt.toISOString(), formationId, selectedLineup);
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
            {step === "lineup" && <span className="eyebrow">KOKOONPANO</span>}
            <h2 id="new-match-title">{step === "details" ? "Luo uusi peli" : "Muokkaa aloituskokoonpanoa"}</h2>
          </div>
          {step === "details" && <button className="close-button" onClick={onClose}>Sulje</button>}
        </div>
        {step === "details" ? (
          <div className="new-match-details">
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
                  setTeamSize(sport === "futsal" ? 5 : nextSize);
                  setFormationId(formations.find((item) => item.teamSize === nextSize)?.id || "");
                }}
              >
                <option value="5">5v5</option>
                {sport === "football" && <>
                  <option value="8">8v8</option>
                  <option value="11">11v11</option>
                </>}
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
            <fieldset className="schedule-section">
              <legend>Ajankohta tulevaa peliä varten</legend>
              <div className="schedule-fields">
                <label><span>Päivä</span><input type="date" value={scheduledDateToInputValue(scheduledDate)} onChange={(event) => setScheduledDate(scheduledDateFromInputValue(event.target.value))} /></label>
                <label><span>Aika</span><input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} /></label>
              </div>
              {scheduleError && <small className="schedule-hint form-warning">{scheduleError}</small>}
            </fieldset>
            <fieldset className="attendance-section">
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
            <button className="create-match-button" disabled={!canCreate || !canStartNow} onClick={() => onCreate(formationId, automaticLineup)}>Luo peli nyt</button>
            {!canStartNow && <small className="schedule-hint">Nykyinen peli pitää lopettaa ennen uuden pelin aloittamista. Voit silti tallentaa tämän tulevaksi peliksi.</small>}
            <button className="schedule-match-button" disabled={!canSchedule} onClick={() => schedule(automaticLineup)}>Tallenna tulevaksi peliksi</button>
            <button
              className="lineup-edit-trigger"
              disabled={!needsMorePlayers && !canCreate}
              onClick={needsMorePlayers ? onAddPlayers : openLineup}
            >
              {needsMorePlayers ? "Lisää pelaajia" : "Muokkaa aloituskokoonpanoa"}
            </button>
          </div>
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
            <button className="create-match-button" disabled={!canStartNow} onClick={() => onCreate(formationId, lineup)}>Luo peli tällä kokoonpanolla</button>
            <button className="schedule-match-button" disabled={!canSchedule} onClick={() => schedule(lineup)}>Tallenna tulevaksi peliksi</button>
          </>
        )}
      </section>
    </div>
  );
}
