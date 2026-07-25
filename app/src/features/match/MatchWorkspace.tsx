import type { Formation, FormationSlot, Player, PlayerId, SelectedPlayer } from "../../types";

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
  playRange: string;
  formatTime: (seconds: number) => string;
  onSelect: (selected: SelectedPlayer | null) => void;
  onSelectField: (index: number) => void;
  onChangeFormation: (formationId: string) => void;
  onMarkGoal: (playerId: PlayerId) => void;
  onRemoveGoal: (playerId: PlayerId) => void;
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
  playRange,
  formatTime,
  onSelect,
  onSelectField,
  onChangeFormation,
  onMarkGoal,
  onRemoveGoal,
}: MatchWorkspaceProps) {
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
              onClick={() => onSelect({ source: "bench", id: player.id })}
            >
              <span className="avatar">{player.number}</span>
              <span><strong>{player.name}</strong><small>Valmiina vaihtoon</small></span>
              <span className="player-time">{formatTime(minutes[player.id] || 0)}</span>
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
                    <strong>{player.name}</strong><span>{slots[index][0]} · {formatTime(minutes[id] || 0)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="fairness"><span>Peliajat</span><strong>{playRange}</strong></div>
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
        </div>
        <div className="pitch">
          {slots.map(([role, x, y], index) => {
            const player = playersById[lineup[index]];
            if (!player) {
              return (
                <div key={`${formationId}-${index}`} style={{ left: `${x}%`, top: `${y}%` }} className="player-card empty-slot">
                  <span className="role">{role}</span><strong>Tyhjä</strong>
                </div>
              );
            }
            return (
              <button
                key={`${formationId}-${index}`}
                style={{ left: `${x}%`, top: `${y}%` }}
                className={`player-card ${selected?.source === "bench" ? "allowed" : ""} ${selected?.source === "field" && selected.index === index ? "selected" : ""}`}
                onClick={() => onSelectField(index)}
                aria-label={`${player.name}, paikka ${role}`}
              >
                <span className="player-meta"><span className="role">{role}</span><em>{goals[player.id] || 0} <span aria-hidden="true">⚽</span></em></span>
                <strong>{player.name}</strong>
                <span className="player-time-on-field">{formatTime(minutes[player.id] || 0)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="side-panel details">
        <span className="eyebrow">PELAAJA</span>
        <h2>{selectedPlayer?.name || "Valitse pelaaja"}</h2>
        {selectedPlayer ? (
          <>
            <div className="big-time">{formatTime(minutes[selectedPlayer.id] || 0)}</div>
            <p className="muted">Pelaaja voidaan vaihtaa vapaasti mille tahansa paikalle.</p>
            <div className="goal-actions">
              <button className="goal-button" onClick={() => onMarkGoal(selectedPlayer.id)}>Merkitse maali</button>
              {(goals[selectedPlayer.id] || 0) > 0 && (
                <button className="secondary remove-goal-button" onClick={() => onRemoveGoal(selectedPlayer.id)}>
                  Poista maali ({goals[selectedPlayer.id]})
                </button>
              )}
            </div>
            <button className="secondary" onClick={() => onSelect(null)}>Peru valinta</button>
          </>
        ) : <p className="empty-copy">Näet tästä peliajan ja voit merkitä maalin.</p>}
      </aside>
    </section>
  );
}
