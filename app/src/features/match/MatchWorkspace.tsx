import type { CSSProperties } from "react";
import type { FieldUnit, Formation, FormationSlot, Player, PlayerId, Sport } from "../../types";
import { comparePlaytime, formatPitchPlayerName } from "./matchLogic";

const displayRole = (role: string) => role === "VTP" ? "VKP" : role === "OTP" ? "OKP" : role;
const mobileCurve = [-3, 3, -3];

const slotStyle = (slots: FormationSlot[], slotIndex: number, sport: Sport): CSSProperties => {
  const [role, x, y] = slots[slotIndex];
  const row = slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slot[2] === y);
  const rowIndex = row.findIndex(({ index }) => index === slotIndex);
  const curve = row.length === 3 ? mobileCurve[rowIndex] : 0;
  const displayX = sport === "futsal" && row.length === 2 ? (rowIndex === 0 ? 22 : 78) : x;
  const displayY = sport === "futsal"
    ? role === "MV" ? 91 : 52 + ((y - 21) / 70) * 36
    : y;

  return {
    left: `${displayX}%`,
    top: `calc(${displayY}% + var(--mobile-row-curve, 0%))`,
    "--mobile-row-curve-value": `${curve}%`,
  } as CSSProperties;
};

interface MatchWorkspaceProps {
  bench: Player[];
  lineup: PlayerId[];
  formations: Formation[];
  formationId: string;
  slots: FormationSlot[];
  playersById: Record<PlayerId, Player>;
  fieldUnits: FieldUnit[];
  selectedBenchIds: PlayerId[];
  selectedFieldIndexes: number[];
  selectedPlayers: Player[];
  minutes: Record<PlayerId, number>;
  goals: Record<PlayerId, number>;
  averageSeconds: number;
  onChangeGoal: (playerId: PlayerId, amount: 1 | -1) => void;
  formatTime: (seconds: number) => string;
  onSelectBench: (playerId: PlayerId) => void;
  onSelectField: (index: number) => void;
  onSelectFieldUnit: (fieldUnitId: string) => void;
  onClearSelection: () => void;
  onChangeFormation: (formationId: string) => void;
  onAddPlayer: () => void;
  canResetClock: boolean;
  onRequestResetClock: () => void;
  sport: Sport;
}

export function MatchWorkspace({
  bench,
  lineup,
  formations,
  formationId,
  slots,
  playersById,
  fieldUnits,
  selectedBenchIds,
  selectedFieldIndexes,
  selectedPlayers,
  minutes,
  goals,
  averageSeconds,
  onChangeGoal,
  formatTime,
  onSelectBench,
  onSelectField,
  onSelectFieldUnit,
  onClearSelection,
  onChangeFormation,
  onAddPlayer,
  canResetClock,
  onRequestResetClock,
  sport,
}: MatchWorkspaceProps) {
  const benchIds = new Set(bench.map((player) => player.id));
  const playtimeIndicator = (playerId: PlayerId) => {
    const { state } = comparePlaytime(minutes[playerId] || 0, averageSeconds);
    const symbol = state === "behind" ? "↓" : state === "ahead" ? "↑" : "≈";
    const label = state === "behind"
      ? "Alle aktiivisten pelaajien keskiarvon"
      : state === "ahead"
        ? "Yli aktiivisten pelaajien keskiarvon"
        : "Lähellä aktiivisten pelaajien keskiarvoa";
    return <span className={`playtime-indicator ${state}`} title={label} aria-label={label}>{symbol}</span>;
  };

  return (
    <section className="workspace">
      <aside className="side-panel bench-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">KOKOONPANO</span><h1>Vaihtopenkki</h1></div>
          <span className="count">{bench.length}</span>
        </div>
        <p className="helper">
          {selectedBenchIds.length
            ? `${selectedBenchIds.length} vaihtopelaajaa valittu — valitse kentältä ${selectedBenchIds.length} poistuvaa (${selectedFieldIndexes.length}/${selectedBenchIds.length}).`
            : "Valitse 1–5 vaihtopelaajaa ja sen jälkeen sama määrä pelaajia kentältä."}
        </p>
        <button className="add-player-trigger" type="button" onClick={onAddPlayer}>+ Lisää pelaaja joukkueeseen</button>
        {sport === "futsal" && fieldUnits.length ? (
          <div className="bench-field-units" aria-label="Kentälliset">
            {fieldUnits.map((unit) => {
              const availableCount = unit.playerIds.filter((id) => benchIds.has(id)).length;
              return (
                <button type="button" key={unit.id} disabled={!availableCount} onClick={() => onSelectFieldUnit(unit.id)}>
                  <strong>{unit.name}</strong><span>{availableCount} penkillä</span>
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="bench-list">
          {bench.map((player) => (
            <button
              key={player.id}
              className={`bench-player ${selectedBenchIds.includes(player.id) ? "selected" : ""}`}
              aria-pressed={selectedBenchIds.includes(player.id)}
              onClick={() => onSelectBench(player.id)}
            >
              <span className="avatar">{player.number}</span>
              <span><strong>{player.name}</strong><small>Valmiina vaihtoon</small></span>
              <span className="bench-time-meta">
                {playtimeIndicator(player.id)}
                <span className="player-time">{formatTime(minutes[player.id] || 0)}</span>
              </span>
            </button>
          ))}
        </div>
        {selectedBenchIds.length > 0 && (
          <div className="mobile-replace">
            <div className="replace-heading"><span>Valitse pois {selectedBenchIds.length} ({selectedFieldIndexes.length}/{selectedBenchIds.length})</span><button onClick={onClearSelection}>Peru</button></div>
            <div className="replace-grid">
              {lineup.map((id, index) => {
                const player = playersById[id];
                return player && (
                  <button className={selectedFieldIndexes.includes(index) ? "selected" : ""} key={id} onClick={() => onSelectField(index)}>
                    <strong>{player.name}</strong>
                    <span>{playtimeIndicator(id)} {displayRole(slots[index][0])} · {formatTime(minutes[id] || 0)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      <section className="field-area">
        <div className="field-toolbar">
          <div>
            <span className="eyebrow">MUODOSTELMA</span>
            <div className="formation-switch">
              {formations.map((item) => (
                <button
                  key={item.id}
                  className={formationId === item.id ? "active" : ""}
                  onClick={() => onChangeFormation(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          {canResetClock && (
            <button className="toolbar-reset-trigger" onClick={onRequestResetClock}>Ajan nollaus</button>
          )}
        </div>
        <div className={`pitch pitch-${sport} ${slots.some(([, x]) => x <= 14) ? "pitch-compact-cards" : ""} ${slots.some(([, x]) => x === 11) ? "pitch-five-player-row" : ""}`}>
          {slots.map(([role], index) => {
            const visibleRole = displayRole(role);
            const player = playersById[lineup[index]];
            if (!player) {
              return (
                <div key={`${formationId}-${index}`} style={slotStyle(slots, index, sport)} className="player-card empty-slot">
                  <span className="role">{visibleRole}</span><strong>Tyhjä</strong>
                </div>
              );
            }
            return (
              <button
                key={`${formationId}-${index}`}
                style={slotStyle(slots, index, sport)}
                className={`player-card ${selectedBenchIds.length ? "allowed" : ""} ${selectedFieldIndexes.includes(index) ? "selected" : ""}`}
                onClick={() => onSelectField(index)}
                aria-label={`${player.name}, paikka ${visibleRole}`}
                title={player.name}
              >
                {playtimeIndicator(player.id)}
                <span className="player-meta">
                  <span className="role">{visibleRole}</span>
                </span>
                <strong>{formatPitchPlayerName(player.name)}</strong>
                <span className="player-time-on-field">{formatTime(minutes[player.id] || 0)}</span>
              </button>
            );
          })}
          {canResetClock && <button className="pitch-reset-trigger" onClick={onRequestResetClock}>Ajan nollaus</button>}
        </div>
      </section>

      <aside className="side-panel details">
        <span className="eyebrow">PELAAJA</span>
        <h2>{selectedPlayers.length === 1 ? selectedPlayers[0].name : selectedPlayers.length > 1 ? `${selectedPlayers.length} valittu` : "Valitse pelaaja"}</h2>
        {selectedPlayers.length ? (
          <>
            <div className="selected-player-list">
              {selectedPlayers.map((player) => (
                <div className="selected-player-row" key={player.id}>
                  {playtimeIndicator(player.id)}
                  <strong>{player.name}</strong>
                  <span>{formatTime(minutes[player.id] || 0)}</span>
                </div>
              ))}
            </div>
            <button className="secondary" onClick={onClearSelection}>Peru valinta</button>
            {selectedPlayers.length === 1 && (
              <div className="goal-controls">
                <span>Maalit {goals[selectedPlayers[0].id] || 0}</span>
                <button className="secondary" onClick={() => onChangeGoal(selectedPlayers[0].id, -1)} disabled={!goals[selectedPlayers[0].id]}>Poista maali</button>
                <button className="secondary" onClick={() => onChangeGoal(selectedPlayers[0].id, 1)}>Merkitse maali</button>
              </div>
            )}
          </>
        ) : <p className="empty-copy">Valitse pelaaja nähdäksesi hänen peliaikansa ja maalinsa tai merkitäksesi uuden maalin.</p>}
      </aside>
    </section>
  );
}
