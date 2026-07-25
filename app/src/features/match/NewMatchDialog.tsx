import { NAME_MAX_LENGTH } from "../../storage";
import type { Player, PlayerId, Team, Venue } from "../../types";

interface NewMatchDialogProps {
  teams: Team[];
  teamId: string;
  opponent: string;
  venue: Venue;
  activePlayerIds: PlayerId[];
  roster: Player[];
  onSelectTeam: (team: Team) => void;
  onOpponentChange: (opponent: string) => void;
  onVenueChange: (venue: Venue) => void;
  onActivePlayerIdsChange: (ids: PlayerId[]) => void;
  onCreate: () => void;
  onClose: () => void;
}

export function NewMatchDialog({
  teams,
  teamId,
  opponent,
  venue,
  activePlayerIds,
  roster,
  onSelectTeam,
  onOpponentChange,
  onVenueChange,
  onActivePlayerIdsChange,
  onCreate,
  onClose,
}: NewMatchDialogProps) {
  const togglePlayer = (playerId: PlayerId) => {
    onActivePlayerIdsChange(
      activePlayerIds.includes(playerId)
        ? activePlayerIds.filter((id) => id !== playerId)
        : [...activePlayerIds, playerId],
    );
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="new-match-modal" role="dialog" aria-modal="true" aria-labelledby="new-match-title">
        <div className="settings-header">
          <div><span className="eyebrow">OTTELU</span><h2 id="new-match-title">Luo uusi peli</h2></div>
          <button className="close-button" onClick={onClose}>Sulje</button>
        </div>
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
            placeholder="Vastustajan nimi"
          />
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
        </fieldset>
        <button className="create-match-button" disabled={!opponent.trim() || !activePlayerIds.length} onClick={onCreate}>Luo peli</button>
      </section>
    </div>
  );
}
