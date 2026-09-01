import { useState } from "react";
import { Check, Pencil, Settings, Trash2 } from "lucide-react";
import { validateFormation } from "../../formation";
import { FORMATION_MAX_LENGTH, MAX_FORMATIONS_PER_TEAM_SIZE, NAME_MAX_LENGTH } from "../../storage";
import type { Formation, Player, PlayerId, Team, TeamSize } from "../../types";

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
  onClose: () => void;
  onOpenAppSettings: () => void;
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
}

export function SettingsDialog(props: SettingsDialogProps) {
  const [formationError, setFormationError] = useState("");
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const {
    teams, teamId, team, roster, formations, teamNameDraft, newTeamName, newPlayerName,
    newFormationName, newFormationTeamSize, onClose, onOpenAppSettings, onActivateTeam,
    onTeamNameDraftChange, onNewTeamNameChange, onNewPlayerNameChange,
    onNewFormationNameChange, onNewFormationTeamSizeChange, onAddTeam, onSaveTeamName, onRequestDeleteTeam,
    onUpdatePlayerNumber, onUpdatePlayerName, onRemovePlayer, onAddPlayer,
    onRemoveFormation, onAddFormation,
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
  const saveTeamName = () => {
    if (!teamNameDraft.trim()) return;
    if (teamNameDraft.trim() !== team.name) onSaveTeamName();
    setIsEditingTeamName(false);
  };
  const finishSettings = () => {
    if (isEditingTeamName && teamNameDraft.trim() && teamNameDraft.trim() !== team.name) onSaveTeamName();
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && finishSettings()}>
      <section className="settings-modal team-management-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-header">
              <div><h2 id="settings-title">Joukkueet</h2><p className="autosave-note">Muutokset tallentuvat automaattisesti.</p></div>
              <div className="settings-header-actions">
                <button className="mobile-team-settings" aria-label="Asetukset" onClick={onOpenAppSettings}><Settings size={18} aria-hidden="true"/></button>
                <button className="close-button" onClick={finishSettings}>Valmis</button>
              </div>
        </div>
        <div className="settings-layout">
          <aside className="team-settings">
            <div className="team-list">
              {teams.map((item) => {
                const isActive = item.id === teamId;
                return (
                  <div key={item.id} className={`team-list-item${isActive ? " active" : ""}`}>
                    {isActive && isEditingTeamName ? (
                      <input
                        className="team-name-input"
                        maxLength={NAME_MAX_LENGTH}
                        value={teamNameDraft}
                        onChange={(event) => onTeamNameDraftChange(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveTeamName();
                          if (event.key === "Escape") {
                            onTeamNameDraftChange(team.name);
                            setIsEditingTeamName(false);
                          }
                        }}
                        aria-label="Joukkueen nimi"
                        autoFocus
                      />
                    ) : (
                      <button
                        className="team-select-button"
                        onClick={() => {
                          setIsEditingTeamName(false);
                          onActivateTeam(item);
                        }}
                      >
                        <strong>{item.name}</strong>
                        <span>{item.players.length} pelaajaa</span>
                      </button>
                    )}
                    {isActive && (
                      <div className="team-card-actions">
                        <button
                          className="team-action-button"
                          onClick={() => isEditingTeamName ? saveTeamName() : setIsEditingTeamName(true)}
                          disabled={isEditingTeamName && !teamNameDraft.trim()}
                          aria-label={isEditingTeamName ? "Tallenna joukkueen nimi" : `Muokkaa joukkueen ${team.name} nimeä`}
                          title={isEditingTeamName ? "Tallenna nimi" : "Muokkaa nimeä"}
                        >
                          {isEditingTeamName ? <Check size={17} aria-hidden="true" /> : <Pencil size={16} aria-hidden="true" />}
                        </button>
                        <button className="delete-icon-button team-delete-button" onClick={onRequestDeleteTeam} aria-label={`Poista ${team.name}`} title={`Poista ${team.name}`}>
                          <Trash2 size={17} aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="add-row">
              <input maxLength={NAME_MAX_LENGTH} value={newTeamName} onChange={(event) => onNewTeamNameChange(event.target.value)} placeholder="Esim. Testijoukkue FC" />
              <button className="button-add" onClick={onAddTeam}>Lisää</button>
            </div>
          </aside>
          <div className="player-settings">
            <div className="player-editor-list">
              {roster.map((player) => (
                <div className="player-editor" key={player.id}>
                  <input type="number" min="0" max="99" aria-label={`${player.name} pelinumero`} value={player.number}
                    onChange={(event) => onUpdatePlayerNumber(player.id, Number(event.target.value) || 0)} />
                  <input maxLength={NAME_MAX_LENGTH} aria-label={`${player.name} nimi`} value={player.name}
                    onChange={(event) => onUpdatePlayerName(player.id, event.target.value)} />
                  <button className="delete-icon-button" onClick={() => onRemovePlayer(player.id)} aria-label={`Poista ${player.name}`} title={`Poista ${player.name}`}>
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <div className="add-row player-add">
              <input maxLength={NAME_MAX_LENGTH} value={newPlayerName} onChange={(event) => onNewPlayerNameChange(event.target.value)} placeholder="Esim. Erkki" />
              <button className="button-add" onClick={onAddPlayer}>Lisää pelaaja</button>
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
                    <button className="delete-icon-button formation-delete-button" disabled={formations.length === 1} onClick={() => onRemoveFormation(item.id)} aria-label={`Poista muodostelma ${item.name}`} title={`Poista muodostelma ${item.name}`}>
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
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
                <button className="button-add" disabled={formationLimitReached} onClick={addFormation}>Lisää muodostelma</button>
              </div>
              {formationLimitReached && (
                <p className="form-warning">
                  {newFormationTeamSize}v{newFormationTeamSize}-pelimuodolle on jo tallennettu enimmäismäärä ({MAX_FORMATIONS_PER_TEAM_SIZE}) muodostelmia. Poista yksi, jos haluat lisätä uuden.
                </p>
              )}
              {formationError && <p id="formation-error" className="field-error" role="alert">{formationError}</p>}
            </section>

          </div>
        </div>
      </section>
    </div>
  );
}
