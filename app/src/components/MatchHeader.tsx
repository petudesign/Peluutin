import { CalendarDays, Check, ChevronDown, ClipboardList, Settings, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Score, Sport } from "../types";

interface MatchHeaderProps {
  homeName: string;
  awayName: string;
  score: Score;
  matchCreated: boolean;
  matchEnded: boolean;
  matchHasActivity: boolean;
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
  sport: Sport;
  onSportChange: (sport: Sport) => void;
}

export function MatchHeader({
  homeName,
  awayName,
  score,
  matchCreated,
  matchEnded,
  matchHasActivity,
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
  sport,
  onSportChange,
}: MatchHeaderProps) {
  const [sportMenuOpen, setSportMenuOpen] = useState(false);
  const sportMenuRef = useRef<HTMLDivElement>(null);
  const mobileSportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sportMenuOpen) return;
    const closeMenu = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!sportMenuRef.current?.contains(target) && !mobileSportMenuRef.current?.contains(target)) setSportMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [sportMenuOpen]);

  const renderSportMenu = () => sportMenuOpen && (
    <div className="sport-switcher-menu" role="menu" aria-label="Valitse laji">
      <button className={`sport-switcher-option ${sport === "football" ? "active" : ""}`} type="button" role="menuitem" onClick={() => { onSportChange("football"); setSportMenuOpen(false); }}>
        <img src="/assets/sport-football.png" alt="" />
        <span className="sport-switcher-option-copy"><strong>Jalkapallo</strong><small>{sport === "football" ? "Valittu laji" : "Vaihda lajiin"}</small></span>
        {sport === "football" && <Check size={16} aria-hidden="true" />}
      </button>
      <button className={`sport-switcher-option ${sport === "futsal" ? "active" : ""}`} type="button" role="menuitem" onClick={() => { onSportChange("futsal"); setSportMenuOpen(false); }}>
        <img src="/assets/sport-futsal.png" alt="" />
        <span className="sport-switcher-option-copy"><strong>Futsal</strong><small>{sport === "futsal" ? "Valittu laji" : "Vaihda lajiin"}</small></span>
        {sport === "futsal" && <Check size={16} aria-hidden="true" />}
      </button>
    </div>
  );

  return (
    <header className="topbar">
      <div className="desktop-brand" aria-label="Peluutin Ottelut">
        <img src="/favicon.svg" alt="" />
        <span className="desktop-brand-lockup"><strong>Peluutin</strong><small>Ottelut</small></span>
        <div className="sport-switcher" ref={sportMenuRef}>
          <button
            className="sport-switcher-trigger"
            type="button"
            aria-haspopup="menu"
            aria-expanded={sportMenuOpen}
            onClick={() => setSportMenuOpen((open) => !open)}
          >
            <span>{sport === "futsal" ? "Futsal" : "Jalkapallo"}</span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          {renderSportMenu()}
        </div>
      </div>
      <div className="mobile-brand-sport" ref={mobileSportMenuRef}>
        <button
          className="mobile-sport-trigger"
          type="button"
          aria-label={`Vaihda lajia. Valittuna ${sport === "futsal" ? "futsal" : "jalkapallo"}`}
          aria-haspopup="menu"
          aria-expanded={sportMenuOpen}
          onClick={() => setSportMenuOpen((open) => !open)}
        >
          <img src="/favicon.svg" alt="" />
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        {renderSportMenu()}
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
            {matchHasActivity && <button className="end-match-button" onClick={onEndMatch}>Lopeta</button>}
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
      <a className="exercise-nav-link" href="#harjoitteet" onClick={onOpenExercises}>
        <ClipboardList size={16} aria-hidden="true" />
        <span>Harjoitteet</span>
      </a>
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
