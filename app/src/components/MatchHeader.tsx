import { CalendarDays, Settings, UsersRound } from "lucide-react";
import type { Score } from "../types";

interface MatchHeaderProps {
  homeName: string;
  awayName: string;
  score: Score;
  matchCreated: boolean;
  matchEnded: boolean;
  running: boolean;
  seconds: number;
  formattedTime: string;
  onChangeScore: (index: 0 | 1, amount: number) => void;
  onToggleClock: () => void;
  onEndMatch: () => void;
  onNewMatch: () => void;
  onOpenTeams: () => void;
  onOpenGames: () => void;
  onOpenSettings: () => void;
  onOpenExercises: () => void;
}

export function MatchHeader({
  homeName,
  awayName,
  score,
  matchCreated,
  matchEnded,
  running,
  seconds,
  formattedTime,
  onChangeScore,
  onToggleClock,
  onEndMatch,
  onNewMatch,
  onOpenTeams,
  onOpenGames,
  onOpenSettings,
  onOpenExercises,
}: MatchHeaderProps) {
  return (
    <header className="topbar">
      <div className="desktop-brand" aria-label="Peluutin Ottelut">
        <img src="/favicon.svg" alt="" />
        <span className="desktop-brand-lockup"><strong>Peluutin</strong><small>Ottelut</small></span>
        <button className="exercise-nav-link" onClick={onOpenExercises}>Harjoitteet</button>
      </div>
      <div className="team-score">
        <div><span className="eyebrow">KOTI</span><strong>{homeName || "Uusi joukkue"}</strong></div>
        <button disabled={!matchCreated} aria-label="Vähennä kotijoukkueen maalia" onClick={() => onChangeScore(0, -1)}>
          <span className="score-minus-icon" aria-hidden="true" />
        </button>
        <b>{score[0]}</b>
        <button disabled={!matchCreated} aria-label="Lisää kotijoukkueen maali" onClick={() => onChangeScore(0, 1)}>
          <img className="add-icon" src="/assets/icon-add.svg" alt="" />
        </button>
      </div>
      <div className="match-clock">
        {matchCreated ? <span>{formattedTime}</span> : <span className="no-match-status">Ei aktiivista peliä</span>}
        {!matchCreated ? null : matchEnded ? (
          <button onClick={onNewMatch}>Uusi peli</button>
        ) : (
          <div className="clock-actions">
            <button className={`${running ? "pause" : ""} ${seconds > 0 ? "in-match" : ""}`} onClick={onToggleClock}>
              {running ? "Tauko" : seconds ? "Jatka" : "Aloita peli"}
            </button>
            {seconds > 0 && <button className="end-match-button" onClick={onEndMatch}>Lopeta</button>}
          </div>
        )}
      </div>
      <div className="team-score away">
        <div><span className="eyebrow">VIERAS</span><strong>{awayName || "Vierasjoukkue"}</strong></div>
        <button disabled={!matchCreated} aria-label="Vähennä vierasjoukkueen maalia" onClick={() => onChangeScore(1, -1)}>
          <span className="score-minus-icon" aria-hidden="true" />
        </button>
        <b>{score[1]}</b>
        <button disabled={!matchCreated} aria-label="Lisää vierasjoukkueen maali" onClick={() => onChangeScore(1, 1)}>
          <img className="add-icon" src="/assets/icon-add.svg" alt="" />
        </button>
      </div>
      <button className="new-match-trigger" onClick={onNewMatch}><img className="add-icon" src="/assets/icon-add.svg" alt="" /> Uusi peli</button>
      <button className="teams-trigger" aria-label="Joukkueet" title="Joukkueet" onClick={onOpenTeams}>
        <UsersRound size={18} aria-hidden="true"/>
      </button>
      <button className="games-trigger" aria-label="Pelit" title="Pelit" onClick={onOpenGames}>
        <CalendarDays size={18} aria-hidden="true"/>
      </button>
      <button className="settings-trigger" aria-label="Asetukset" title="Asetukset" onClick={onOpenSettings}>
        <Settings size={19} aria-hidden="true" />
      </button>
    </header>
  );
}
