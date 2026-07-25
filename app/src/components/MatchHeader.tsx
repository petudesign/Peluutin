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
  onOpenSettings: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
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
  onOpenSettings,
  theme,
  onToggleTheme,
}: MatchHeaderProps) {
  return (
    <header className="topbar">
      <div className="desktop-brand" aria-label="Peluutin">
        <img src="/favicon.svg" alt="" />
        <strong>Peluutin</strong>
      </div>
      <div className="team-score">
        <div><span className="eyebrow">KOTI</span><strong>{homeName || "Uusi joukkue"}</strong></div>
        <button disabled={!matchCreated} aria-label="Vähennä kotijoukkueen maalia" onClick={() => onChangeScore(0, -1)}>−</button>
        <b>{score[0]}</b>
        <button disabled={!matchCreated} aria-label="Lisää kotijoukkueen maali" onClick={() => onChangeScore(0, 1)}>+</button>
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
        <button disabled={!matchCreated} aria-label="Vähennä vierasjoukkueen maalia" onClick={() => onChangeScore(1, -1)}>−</button>
        <b>{score[1]}</b>
        <button disabled={!matchCreated} aria-label="Lisää vierasjoukkueen maali" onClick={() => onChangeScore(1, 1)}>+</button>
      </div>
      <button className="new-match-trigger" onClick={onNewMatch}><span aria-hidden="true">+</span> Uusi peli</button>
      <button className="settings-trigger" aria-label="Asetukset" onClick={onOpenSettings}>
        <img src="/assets/settings-svgrepo-com.svg" alt="" />
      </button>
      <button
        className="desktop-theme-trigger"
        aria-label={theme === "dark" ? "Vaihda vaaleaan teemaan" : "Vaihda tummaan teemaan"}
        onClick={onToggleTheme}
      >
        <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      </button>
    </header>
  );
}
