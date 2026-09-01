import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { NAME_MAX_LENGTH } from "../storage";
import type { FieldUnit, Player, PlayerId } from "../types";

interface FieldUnitsEditorProps {
  players: Player[];
  fieldUnits: FieldUnit[];
  onAdd: (name: string, playerIds: PlayerId[]) => void;
  onUpdate: (id: string, name: string, playerIds: PlayerId[]) => void;
  onRemove: (id: string) => void;
}

export function FieldUnitsEditor({ players, fieldUnits, onAdd, onUpdate, onRemove }: FieldUnitsEditorProps) {
  const [name, setName] = useState("");
  const [playerIds, setPlayerIds] = useState<PlayerId[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const normalizedName = name.trim();
  const duplicateName = fieldUnits.some((unit) => unit.id !== editingId && unit.name.toLocaleLowerCase("fi") === normalizedName.toLocaleLowerCase("fi"));

  const togglePlayer = (playerId: PlayerId) => {
    setPlayerIds((current) => current.includes(playerId)
      ? current.filter((id) => id !== playerId)
      : current.length < 5 ? [...current, playerId] : current);
  };
  const saveUnit = () => {
    if (!normalizedName || !playerIds.length || duplicateName) return;
    if (editingId) onUpdate(editingId, normalizedName, playerIds);
    else onAdd(normalizedName, playerIds);
    setName("");
    setPlayerIds([]);
    setEditingId(null);
  };
  const editUnit = (unit: FieldUnit) => {
    setEditingId(unit.id);
    setName(unit.name);
    setPlayerIds(unit.playerIds);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setPlayerIds([]);
  };

  return (
    <section className="settings-section field-units-editor">
      <div className="section-title">
        <div><span className="eyebrow">FUTSAL</span><h3>Kentälliset</h3></div>
        <span className="section-hint">Tallenna enintään viisi pelaajaa samaan kentälliseen.</span>
      </div>
      {fieldUnits.length ? (
        <div className="field-unit-list">
          {fieldUnits.map((unit) => (
            <div className="field-unit-card" key={unit.id}>
              <span><strong>{unit.name}</strong><small>{unit.playerIds.map((id) => players.find((player) => player.id === id)?.name).filter(Boolean).join(", ")}</small></span>
              <span className="field-unit-actions">
                <button className="team-action-button" type="button" onClick={() => editUnit(unit)} aria-label={`Muokkaa kentällistä ${unit.name}`} title={`Muokkaa ${unit.name}`}>
                  <Pencil size={15} aria-hidden="true" />
                </button>
                <button className="delete-icon-button" type="button" onClick={() => onRemove(unit.id)} aria-label={`Poista kentällinen ${unit.name}`} title={`Poista ${unit.name}`}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : <p className="field-unit-empty">Ei tallennettuja kentällisiä.</p>}
      <div className="field-unit-player-picker" aria-label="Valitse kentällisen pelaajat">
        {players.map((player) => (
          <button
            className={playerIds.includes(player.id) ? "active" : ""}
            type="button"
            key={player.id}
            aria-pressed={playerIds.includes(player.id)}
            onClick={() => togglePlayer(player.id)}
          >
            <span>{player.number}</span>{player.name}
          </button>
        ))}
      </div>
      <div className="add-row field-unit-add-row">
        <input maxLength={NAME_MAX_LENGTH} value={name} onChange={(event) => setName(event.target.value)} placeholder="Esim. Ykköskentällinen" />
        <button className="button-add" type="button" disabled={!normalizedName || !playerIds.length || duplicateName} onClick={saveUnit}>{editingId ? "Tallenna" : "Lisää kentällinen"} ({playerIds.length}/5)</button>
      </div>
      {editingId ? <button className="field-unit-cancel" type="button" onClick={cancelEdit}>Peru muokkaus</button> : null}
      {duplicateName ? <p className="field-error" role="alert">Tämänniminen kentällinen on jo olemassa.</p> : null}
    </section>
  );
}
