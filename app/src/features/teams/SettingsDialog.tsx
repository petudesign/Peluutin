import { useState } from "react";
import { validateFormation } from "../../formation";
import { FORMATION_MAX_LENGTH, MAX_FORMATIONS_PER_TEAM_SIZE, NAME_MAX_LENGTH } from "../../storage";
import type { Formation, MatchRecord, Player, PlayerId, Team, TeamSize } from "../../types";

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
  newFormationTeamSize: TeamSize;
  historyNotice: string;
  formatTime: (seconds: number) => string;
  onClose: () => void;
  onActivateTeam: (team: Team) => void;
  onTeamNameDraftChange: (value: string) => void;
  onNewTeamNameChange: (value: string) => void;
  onNewPlayerNameChange: (value: string) => void;
  onNewFormationNameChange: (value: string) => void;
  onNewFormationTeamSizeChange: (value: TeamSize) => void;
  onAddTeam: () => void;
  onSaveTeamName: () => void;
  onRequestDeleteTeam: () => void;
  onUpdatePlayerNumber: (id: PlayerId, number: number) => void;
  onUpdatePlayerName: (id: PlayerId, name: string) => void;
  onRemovePlayer: (id: PlayerId) => void;
  onAddPlayer: () => void;
  onRemoveFormation: (id: string) => void;
  onAddFormation: () => void;
  onSaveMatch: () => void;
  onExportMatch: (match: MatchRecord) => void;
  onDeleteMatch: (id: string) => void;
}

export function SettingsDialog(props: SettingsDialogProps) {
  const [storageInfoOpen, setStorageInfoOpen] = useState(false);
  const [formationError, setFormationError] = useState("");
  const {
    teams, teamId, team, roster, formations, teamNameDraft, newTeamName, newPlayerName,
    newFormationName, newFormationTeamSize, historyNotice, formatTime, onClose, onActivateTeam,
    onTeamNameDraftChange, onNewTeamNameChange, onNewPlayerNameChange,
    onNewFormationNameChange, onNewFormationTeamSizeChange, onAddTeam, onSaveTeamName, onRequestDeleteTeam,
    onUpdatePlayerNumber, onUpdatePlayerName, onRemovePlayer, onAddPlayer,
    onRemoveFormation, onAddFormation, onSaveMatch,
    onExportMatch, onDeleteMatch,
  } = props;
  const visibleFormations = formations.filter((item) => item.teamSize === newFormationTeamSize);
  const formationLimitReached = visibleFormations.length >= MAX_FORMATIONS_PER_TEAM_SIZE;
  const maxPlayersPerRow = newFormationTeamSize === 5 ? 2 : newFormationTeamSize === 8 ? 4 : 5;
  const addFormation = () => {
    const validationError = validateFormation(newFormationName, newFormationTeamSize);
    const normalizedName = newFormationName.trim().replaceAll("-", "–");
    const duplicate = visibleFormations.some((item) => item.name === normalizedName);
    const nextError = validationError || (duplicate ? "Tämä muodostelma on jo tallennettu tälle pelimuodolle." : "");
    if (nextError) {
      setFormationError(nextError);
      return;
    }
    setFormationError("");
    onAddFormation();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        {storageInfoOpen ? (
          <>
            <div className="settings-header">
              <div><span className="eyebrow">SOVELLUKSEN TIEDOT</span><h2 id="settings-title">Tietosuoja ja tallennus</h2></div>
              <button className="close-button" onClick={() => setStorageInfoOpen(false)}>Takaisin</button>
            </div>
            <div className="storage-info">
              <section>
                <h3>Tiedot pysyvät tällä laitteella</h3>
                <p>Joukkueet, pelaajat, muodostelmat ja pelihistoria tallennetaan tämän selaimen paikalliseen tallennustilaan. Niitä ei lähetetä Peluuttimen palvelimelle.</p>
              </section>
              <section>
                <h3>Pidä tiedot tallessa</h3>
                <p>Selaimen sivustodatan tyhjentäminen tai selaimen poistaminen voi poistaa tallennetut tiedot. Peluutin ei tällä hetkellä tee niistä pilvivarmuuskopiota.</p>
              </section>
              <section>
                <h3>Tietojen poistaminen</h3>
                <p>Voit poistaa yksittäisiä pelejä tai kokonaisen joukkueen asetuksista. Kaikki tiedot voi poistaa myös tyhjentämällä Peluuttimen sivustodatan selaimen asetuksista.</p>
              </section>
              <section>
                <h3>Pelaajien tiedot</h3>
                <p>Lisää vain pelin seuraamiseen tarvittavat tiedot. Etunimi tai kutsumanimi ja pelinumero riittävät yleensä.</p>
              </section>
            </div>
          </>
        ) : (
          <>
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
              <input maxLength={NAME_MAX_LENGTH} value={newTeamName} onChange={(event) => onNewTeamNameChange(event.target.value)} placeholder="Esim. Testijoukkue FC" />
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
              <input maxLength={NAME_MAX_LENGTH} value={newPlayerName} onChange={(event) => onNewPlayerNameChange(event.target.value)} placeholder="Esim. Erkki" />
              <button onClick={onAddPlayer}>Lisää pelaaja</button>
            </div>

            <section className="settings-section">
              <div className="section-title">
                <div><span className="eyebrow">JOUKKUEKOHTAINEN</span><h3>Muodostelmat</h3></div>
                <span className="section-hint">
                  Valitse pelimuoto ensin. {newFormationTeamSize}v{newFormationTeamSize} sallii enintään 4 riviä ja {maxPlayersPerRow} pelaajaa rivillä.
                </span>
              </div>
              <div className="formation-editor-list">
                {visibleFormations.map((item) => (
                  <div key={item.id}>
                    <strong>{item.name}</strong>
                    <button className="danger" disabled={formations.length === 1} onClick={() => onRemoveFormation(item.id)}>Poista</button>
                  </div>
                ))}
              </div>
              <div className="add-row formation-add-row">
                <select
                  aria-label="Pelimuoto"
                  value={newFormationTeamSize}
                  onChange={(event) => {
                    setFormationError("");
                    onNewFormationTeamSizeChange(Number(event.target.value) as TeamSize);
                  }}
                >
                  <option value="5">5v5</option>
                  <option value="8">8v8</option>
                  <option value="11">11v11</option>
                </select>
                <input
                  maxLength={FORMATION_MAX_LENGTH}
                  value={newFormationName}
                  onChange={(event) => {
                    setFormationError("");
                    onNewFormationNameChange(event.target.value);
                  }}
                  aria-invalid={Boolean(formationError)}
                  aria-describedby={formationError ? "formation-error" : undefined}
                  placeholder={formationLimitReached
                    ? `Enintään ${MAX_FORMATIONS_PER_TEAM_SIZE} muodostelmaa`
                    : newFormationTeamSize === 5 ? "Esim. 1–2–1" : newFormationTeamSize === 8 ? "Esim. 4–2–1" : "Esim. 4–3–2–1"}
                  disabled={formationLimitReached}
                />
                <button disabled={formationLimitReached} onClick={addFormation}>Lisää muodostelma</button>
              </div>
              {formationLimitReached && (
                <p className="form-warning">
                  {newFormationTeamSize}v{newFormationTeamSize}-pelimuodolle on jo tallennettu enimmäismäärä ({MAX_FORMATIONS_PER_TEAM_SIZE}) muodostelmia. Poista yksi, jos haluat lisätä uuden.
                </p>
              )}
              {formationError && <p id="formation-error" className="field-error" role="alert">{formationError}</p>}
            </section>

            <section className="settings-section">
              <div className="section-title">
                <div><span className="eyebrow">PAIKALLINEN TALLENNUS</span><h3>Pelihistoria</h3></div>
                <div className="history-actions">
                  <button className="history-save" onClick={onSaveMatch}>Tallenna peli</button>
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
            <button className="storage-info-link" onClick={() => setStorageInfoOpen(true)}>
              <span><strong>Tietosuoja ja tallennus</strong><small>Miten tiedot säilytetään tällä laitteella</small></span>
              <span aria-hidden="true">›</span>
            </button>
          </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
