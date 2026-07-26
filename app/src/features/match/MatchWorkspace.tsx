import type { CSSProperties } from "react";
import type { Formation, FormationSlot, Player, PlayerId, SelectedPlayer } from "../../types";
import { comparePlaytime, formatPitchPlayerName } from "./matchLogic";

const displayRole = (role: string) => role === "VTP" ? "VKP" : role === "OTP" ? "OKP" : role;
const mobileCurve = [-3, 3, -3];

const slotStyle = (slots: FormationSlot[], slotIndex: number): CSSProperties => {
  const [, x, y] = slots[slotIndex];
  const row = slots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => slot[2] === y);
  const rowIndex = row.findIndex(({ index }) => index === slotIndex);
  const curve = row.length === 3 ? mobileCurve[rowIndex] : 0;

  return {
    left: `${x}%`,
    top: `calc(${y}% + var(--mobile-row-curve, 0%))`,
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
  selected: SelectedPlayer | null;
  selectedPlayer: Player | null;
  minutes: Record<PlayerId, number>;
  goals: Record<PlayerId, number>;
  averageSeconds: number;
  formatTime: (seconds: number) => string;
  onSelect: (selected: SelectedPlayer | null) => void;
  onSelectField: (index: number) => void;
  onChangeFormation: (formationId: string) => void;
  onMarkGoal: (playerId: PlayerId) => void;
  onRemoveGoal: (playerId: PlayerId) => void;
  canResetClock: boolean;
  onRequestResetClock: () => void;
}

export function MatchWorkspace({
  bench,
  lineup,
  formations,
  formationId,
  slots,
  playersById,
  selected,
  selectedPlayer,
  minutes,
  goals,
  averageSeconds,
  formatTime,
  onSelect,
  onSelectField,
  onChangeFormation,
  onMarkGoal,
  onRemoveGoal,
  canResetClock,
  onRequestResetClock,
}: MatchWorkspaceProps) {
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
          {selectedPlayer ? `${selectedPlayer.name} valittu — valitse uusi paikka.` : "Valitse vaihtopelaaja ja sitten hänen uusi paikkansa."}
        </p>
        <div className="bench-list">
          {bench.map((player) => (
            <button
              key={player.id}
              className={`bench-player ${selected?.id === player.id ? "selected" : ""}`}
              onClick={() => onSelect(selected?.source === "bench" && selected.id === player.id
                ? null
                : { source: "bench", id: player.id })}
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
        {selected?.source === "bench" && (
          <div className="mobile-replace">
            <div className="replace-heading"><span>Kenet vaihdetaan pois?</span><button onClick={() => onSelect(null)}>Peru</button></div>
            <div className="replace-grid">
              {lineup.map((id, index) => {
                const player = playersById[id];
                return player && (
                  <button key={id} onClick={() => onSelectField(index)}>
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
        <div className={`pitch ${slots.some(([, x]) => x <= 14) ? "pitch-compact-cards" : ""} ${slots.some(([, x]) => x === 11) ? "pitch-five-player-row" : ""}`}>
          {slots.map(([role], index) => {
            const visibleRole = displayRole(role);
            const player = playersById[lineup[index]];
            if (!player) {
              return (
                <div key={`${formationId}-${index}`} style={slotStyle(slots, index)} className="player-card empty-slot">
                  <span className="role">{visibleRole}</span><strong>Tyhjä</strong>
                </div>
              );
            }
            return (
              <button
                key={`${formationId}-${index}`}
                style={slotStyle(slots, index)}
                className={`player-card ${selected?.source === "bench" ? "allowed" : ""} ${selected?.source === "field" && selected.index === index ? "selected" : ""}`}
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
        <h2>{selectedPlayer?.name || "Valitse pelaaja"}</h2>
        {selectedPlayer ? (
          <>
            <div className="big-time">{formatTime(minutes[selectedPlayer.id] || 0)}</div>
            {(() => {
              const { state, differenceSeconds } = comparePlaytime(minutes[selectedPlayer.id] || 0, averageSeconds);
              const label = state === "behind"
                ? `↓ ${formatTime(Math.abs(differenceSeconds))} alle aktiivisten pelaajien keskiarvon`
                : state === "ahead"
                  ? `↑ ${formatTime(Math.abs(differenceSeconds))} yli aktiivisten pelaajien keskiarvon`
                  : "≈ Lähellä aktiivisten pelaajien keskiarvoa";
              return <p className={`playtime-comparison ${state}`}>{label}</p>;
            })()}
            <p className="selected-goal-count"><span aria-hidden="true">⚽</span> Maalit {goals[selectedPlayer.id] || 0}</p>
            <div className="goal-actions">
              <button
                className={`goal-button ${selected?.source === "bench" ? "bench-goal-button" : ""}`}
                onClick={() => onMarkGoal(selectedPlayer.id)}
              >
                Merkitse maali
              </button>
              {(goals[selectedPlayer.id] || 0) > 0 && (
                <button className="secondary remove-goal-button" onClick={() => onRemoveGoal(selectedPlayer.id)}>
                  Poista maali ({goals[selectedPlayer.id]})
                </button>
              )}
            </div>
            <button className="secondary" onClick={() => onSelect(null)}>Peru valinta</button>
          </>
        ) : <p className="empty-copy">Valitse pelaaja nähdäksesi hänen peliaikansa ja maalinsa tai merkitäksesi uuden maalin.</p>}
      </aside>
    </section>
  );
}
