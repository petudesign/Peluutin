import { Goal } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Player, PlayerId, Score } from "../types";
import { Jersey } from "./Jersey";

/**
 * What the goal sheet is showing. `id` changes on every prompt so a new goal restarts the dismiss timer.
 * - scorer: an own goal was just added; ask who scored.
 * - added: a goal without a scorer question (the opponent's, or a team without players on the pitch).
 * - remove: opened by a long press on a score; pick which goal to take back.
 */
export type GoalPrompt =
  | { kind: "scorer"; id: number }
  | { kind: "added"; id: number; index: 0 | 1 }
  | { kind: "remove"; id: number; index: 0 | 1 };

interface GoalSheetProps {
  prompt: GoalPrompt;
  score: Score;
  ownIndex: 0 | 1;
  teamNames: [string, string];
  fieldPlayers: Player[];
  benchPlayers: Player[];
  goalkeeperId?: PlayerId;
  goals: Record<PlayerId, number>;
  uncredited: number;
  onCredit: (playerId: PlayerId) => void;
  onUndo: () => void;
  onRemove: (index: 0 | 1, playerId: PlayerId | null) => void;
  onClose: () => void;
}

const DISMISS_MS = { scorer: 9000, added: 4000 } as const;

// "Aleksi Virtanen" → "Aleksi V.", short enough for a four-across grid on a phone.
const shortName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};

const goalCount = (count: number) => `${count} ${count === 1 ? "maali" : "maalia"}`;

export function GoalSheet({
  prompt,
  score,
  ownIndex,
  teamNames,
  fieldPlayers,
  benchPlayers,
  goalkeeperId,
  goals,
  uncredited,
  onCredit,
  onUndo,
  onRemove,
  onClose,
}: GoalSheetProps) {
  const timerRef = useRef<number | undefined>(undefined);
  const scoreLine = `${score[0]}–${score[1]}`;

  // Quick prompts close themselves; touching the sheet means the coach is using it, so the timer stops.
  useEffect(() => {
    window.clearTimeout(timerRef.current);
    if (prompt.kind !== "remove") timerRef.current = window.setTimeout(onClose, DISMISS_MS[prompt.kind]);
    return () => window.clearTimeout(timerRef.current);
  }, [prompt.id, prompt.kind, onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const holdOpen = () => window.clearTimeout(timerRef.current);

  if (prompt.kind === "added") {
    return (
      <div className="goal-sheet goal-toast" role="status" key={prompt.id} onPointerDown={holdOpen}>
        <span className="goal-toast-text">
          <strong>Maali · {teamNames[prompt.index]}</strong>
          <span className="goal-toast-score">{scoreLine}</span>
        </span>
        <button type="button" className="goal-sheet-undo" onClick={onUndo}>Kumoa</button>
      </div>
    );
  }

  if (prompt.kind === "scorer") {
    const renderPlayer = (player: Player) => (
      <button key={player.id} type="button" className="goal-scorer" onClick={() => onCredit(player.id)}>
        <Jersey number={player.number} variant={player.id === goalkeeperId ? "keeper" : "outfield"} />
        <span>{shortName(player.name)}</span>
      </button>
    );
    return (
      <section className="goal-sheet" role="dialog" aria-label="Kuka teki maalin?" key={prompt.id} onPointerDown={holdOpen}>
        <header className="goal-sheet-head">
          <div>
            <span className="goal-sheet-eyebrow">Maali · {scoreLine}</span>
            <h2>Kuka teki maalin?</h2>
          </div>
          <button type="button" className="goal-sheet-undo" onClick={onUndo}>Kumoa</button>
        </header>
        <div className="goal-sheet-body">
          <div className="goal-scorers">{fieldPlayers.map(renderPlayer)}</div>
          {benchPlayers.length > 0 && (
            <>
              <h3 className="goal-sheet-subhead">Vaihdossa</h3>
              <div className="goal-scorers goal-scorers-bench">{benchPlayers.map(renderPlayer)}</div>
            </>
          )}
        </div>
        <footer className="goal-sheet-foot">
          <button type="button" className="secondary" onClick={onClose}>Ohita</button>
        </footer>
      </section>
    );
  }

  const isOwn = prompt.index === ownIndex;
  const scorers = isOwn
    ? [...fieldPlayers, ...benchPlayers].filter((player) => (goals[player.id] || 0) > 0)
    : [];
  const teamScore = score[prompt.index];
  return (
    <section className="goal-sheet" role="dialog" aria-label={`Poista maali: ${teamNames[prompt.index]}`} key={prompt.id}>
      <header className="goal-sheet-head">
        <div>
          <span className="goal-sheet-eyebrow">{teamNames[prompt.index]} · {goalCount(teamScore)}</span>
          <h2>Poista maali</h2>
        </div>
        <button type="button" className="goal-sheet-undo" onClick={onClose}>Peruuta</button>
      </header>
      <div className="goal-sheet-body">
        {teamScore === 0 ? (
          <p className="goal-sheet-empty">Ei poistettavia maaleja.</p>
        ) : (
          <ul className="goal-remove-list">
            {scorers.map((player) => (
              <li key={player.id}>
                <Jersey number={player.number} variant={player.id === goalkeeperId ? "keeper" : "outfield"} />
                <span><strong>{player.name}</strong><small>{goalCount(goals[player.id] || 0)}</small></span>
                <button type="button" className="danger" onClick={() => onRemove(prompt.index, player.id)}>Poista</button>
              </li>
            ))}
            {(!isOwn || uncredited > 0) && (
              <li>
                <span className="goal-remove-plain" aria-hidden="true"><Goal size={18} /></span>
                <span>
                  <strong>{isOwn ? "Maali ilman maalintekijää" : "Vastustajan maali"}</strong>
                  <small>{isOwn ? goalCount(uncredited) : `${teamScore} → ${teamScore - 1}`}</small>
                </span>
                <button type="button" className="danger" onClick={() => onRemove(prompt.index, null)}>Poista</button>
              </li>
            )}
          </ul>
        )}
      </div>
    </section>
  );
}
