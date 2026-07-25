import { FORMATION_MAX_LENGTH, MAX_FORMATIONS, NAME_MAX_LENGTH } from "../../storage";
import type { Formation, MatchRecord, Player, PlayerId, Team } from "../../types";

interface SettingsDialogProps {
  teams: Team[];
  teamId: string;
  team: Team;
  roster: Player[];
  formations: Formation[];
  teamNameDraft: string;
  newTeamName: string;
  newPlayerName: string;
  newFormationName: string;
  historyNotice: string;
  formatTime: (seconds: number) => string;
  onClose: () => void;
  onActivateTeam: (team: Team) => void;
  onTeamNameDraftChange: (value: string) => void;
  onNewTeamNameChange: (value: string) => void;
  onNewPlayerNameChange: (value: string) => void;
  onNewFormationNameChange: (value: string) => void;
  onAddTeam: () => void;
  onSaveTeamName: () => void;
  onRequestDeleteTeam: () => void;
  onUpdatePlayerNumber: (id: PlayerId, number: number) => void;
  onUpdatePlayerName: (id: PlayerId, name: string) => void;
  onRemovePlayer: (id: PlayerId) => void;
  onAddPlayer: () => void;
  onRemoveFormation: (id: string) => void;
  onAddFormation: () => void;
  onShareSituation: () => void;
  onSaveMatch: () => void;
  canResetClock: boolean;
  onRequestResetClock: () => void;
  onExportMatch: (match: MatchRecord) => void;
  onDeleteMatch: (id: string) => void;
}

export function SettingsDialog(props: SettingsDialogProps) {
  const {
    teams, teamId, team, roster, formations, teamNameDraft, newTeamName, newPlayerName,
    newFormationName, historyNotice, formatTime, onClose, onActivateTeam,
    onTeamNameDraftChange, onNewTeamNameChange, onNewPlayerNameChange,
    onNewFormationNameChange, onAddTeam, onSaveTeamName, onRequestDeleteTeam,
    onUpdatePlayerNumber, onUpdatePlayerName, onRemovePlayer, onAddPlayer,
    onRemoveFormation, onAddFormation, onShareSituation, onSaveMatch, canResetClock, onRequestResetClock,
    onExportMatch, onDeleteMatch,
  } = props;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-header">
          <div><span className="eyebrow">JOUKKUEET JA PELAAJAT</span><h2 id="settings-title">Asetukset</h2></div>
          <button className="close-button" onClick={onClose}>Sulje</button>
        </div>
        <div className="settings-layout">
          <aside className="team-settings">
            <h3>Joukkueet</h3>
            <div className="team-list">
              {teams.map((item) => (
                <button key={item.id} className={item.id === teamId ? "active" : ""} onClick={() => onActivateTeam(item)}>
                  <strong>{item.name}</strong><span>{item.players.length} pelaajaa</span>
                </button>
              ))}
            </div>
            <div className="add-row">
              <input maxLength={NAME_MAX_LENGTH} value={newTeamName} onChange={(event) => onNewTeamNameChange(event.target.value)} placeholder="Uuden joukkueen nimi" />
              <button onClick={onAddTeam}>Lisää</button>
            </div>
          </aside>
          <div className="player-settings">
            <h3>Valittu joukkue</h3>
            <div className="team-name-row">
              <input maxLength={NAME_MAX_LENGTH} value={teamNameDraft} onChange={(event) => onTeamNameDraftChange(event.target.value)} aria-label="Joukkueen nimi" />
              {teamNameDraft.trim() !== team.name && <button onClick={onSaveTeamName}>Tallenna nimi</button>}
              <button className="danger destructive-filled" onClick={onRequestDeleteTeam}>Poista joukkue</button>
            </div>
            <div className="player-editor-list">
              {roster.map((player) => (
                <div className="player-editor" key={player.id}>
                  <input type="number" min="0" max="99" aria-label={`${player.name} pelinumero`} value={player.number}
                    onChange={(event) => onUpdatePlayerNumber(player.id, Number(event.target.value) || 0)} />
                  <input maxLength={NAME_MAX_LENGTH} aria-label={`${player.name} nimi`} value={player.name}
                    onChange={(event) => onUpdatePlayerName(player.id, event.target.value)} />
                  <button className="danger destructive-filled" onClick={() => onRemovePlayer(player.id)}>Poista</button>
                </div>
              ))}
            </div>
            <div className="add-row player-add">
              <input maxLength={NAME_MAX_LENGTH} value={newPlayerName} onChange={(event) => onNewPlayerNameChange(event.target.value)} placeholder="Pelaajan nimi" />
              <button onClick={onAddPlayer}>Lisää pelaaja</button>
            </div>

            <section className="settings-section">
              <div className="section-title">
                <div><span className="eyebrow">JOUKKUEKOHTAINEN</span><h3>Muodostelmat</h3></div>
                <span className="section-hint">Kolmen rivin pitää sisältää yhteensä 7 kenttäpelaajaa.</span>
              </div>
              <div className="formation-editor-list">
                {formations.map((item) => (
                  <div key={item.id}>
                    <strong>{item.name}</strong>
                    <button className="danger" disabled={formations.length === 1} onClick={() => onRemoveFormation(item.id)}>Poista</button>
                  </div>
                ))}
              </div>
              <div className="add-row">
                <input
                  maxLength={FORMATION_MAX_LENGTH}
                  value={newFormationName}
                  onChange={(event) => onNewFormationNameChange(event.target.value)}
                  placeholder={formations.length >= MAX_FORMATIONS ? "Enintään 3 muodostelmaa" : "Esim. 2–3–2"}
                  disabled={formations.length >= MAX_FORMATIONS}
                />
                <button disabled={formations.length >= MAX_FORMATIONS} onClick={onAddFormation}>Lisää muodostelma</button>
              </div>
            </section>

            <section className="settings-section">
              <div className="section-title">
                <div><span className="eyebrow">PAIKALLINEN TALLENNUS</span><h3>Pelihistoria</h3></div>
                <div className="history-actions">
                  <button onClick={onShareSituation}>Jaa tilanne</button>
                  <button onClick={onSaveMatch}>Tallenna nykyinen peli</button>
                  {canResetClock && <button className="danger" onClick={onRequestResetClock}>Nollaa peliajat</button>}
                </div>
              </div>
              {historyNotice && <p className="success-note">{historyNotice}</p>}
              <div className="history-list">
                {(team.history || []).length ? team.history.map((match) => (
                  <article key={match.id}>
                    <div>
                      <strong>{new Date(match.playedAt).toLocaleDateString("fi-FI")} · {match.score[0]}–{match.score[1]}</strong>
                      <span>{match.opponent} · {formatTime(match.duration)} · {match.formation}</span>
                    </div>
                    <div className="history-row-actions">
                      <button onClick={() => onExportMatch(match)}>Vie Exceliin</button>
                      <button className="danger destructive-filled" onClick={() => onDeleteMatch(match.id)}>Poista</button>
                    </div>
                  </article>
                )) : <p className="empty-history">Ei vielä tallennettuja pelejä.</p>}
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
