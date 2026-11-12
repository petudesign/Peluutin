import { CalendarDays, Check, ChevronDown, ClipboardList, Menu, Settings, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Score, Sport } from "../types";
import { getSport, SPORTS } from "../sports";

interface MatchHeaderProps {
  homeName: string;
  awayName: string;
  score: Score;
  matchCreated: boolean;
  matchEnded: boolean;
  running: boolean;
  seconds: number;
  formattedTime: string;
  onAddGoal: (index: 0 | 1) => void;
  onEditScore: (index: 0 | 1) => void;
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
  running,
  seconds,
  formattedTime,
  onAddGoal,
  onEditScore,
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
  const [tabletActionsOpen, setTabletActionsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isScrolledRef = useRef(false);
  const sportMenuRef = useRef<HTMLDivElement>(null);
  const mobileSportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScrollState = () => {
      const scrollY = Math.max(window.scrollY, 0);
      const nextIsScrolled = isScrolledRef.current ? scrollY > 12 : scrollY > 32;
      if (nextIsScrolled === isScrolledRef.current) return;
      isScrolledRef.current = nextIsScrolled;
      setIsScrolled(nextIsScrolled);
    };
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

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
      {SPORTS.map((item) => (
        <button key={item.id} className={`sport-switcher-option ${sport === item.id ? "active" : ""}`} type="button" role="menuitem" onClick={() => { onSportChange(item.id); setSportMenuOpen(false); }}>
          <img src={item.image} alt="" />
          <span className="sport-switcher-option-copy"><strong>{item.name}</strong><small>{sport === item.id ? "Valittu laji" : "Vaihda lajiin"}</small></span>
          {sport === item.id && <Check size={16} aria-hidden="true" />}
        </button>
      ))}
    </div>
  );

  return (
    <header className={`topbar${isScrolled ? " is-compact" : ""}`}>
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
            <span>{getSport(sport).name}</span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          {renderSportMenu()}
        </div>
      </div>
      <div className="mobile-brand-sport" ref={mobileSportMenuRef}>
        <button
          className="mobile-sport-trigger"
          type="button"
          aria-label={`Vaihda lajia. Valittuna ${getSport(sport).name.toLowerCase()}`}
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
        <div className="score-name"><span className="eyebrow">KOTI</span><strong>{homeName || "Uusi joukkue"}</strong></div>
        <ScoreButton index={0} value={score[0]} teamName={homeName || "Kotijoukkue"} disabled={!matchCreated} onAddGoal={onAddGoal} onEditScore={onEditScore} />
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
        <div className="score-name"><span className="eyebrow">VIERAS</span><strong>{awayName || "Vierasjoukkue"}</strong></div>
        <ScoreButton index={1} value={score[1]} teamName={awayName || "Vierasjoukkue"} disabled={!matchCreated} onAddGoal={onAddGoal} onEditScore={onEditScore} />
      </div>
      <a className="exercise-nav-link" href="#harjoitteet" onClick={onOpenExercises}>
        <ClipboardList size={16} aria-hidden="true" />
        <span>Harjoitteet</span>
      </a>
      <button className="new-match-trigger" onClick={onNewMatch}><img className="add-icon" src="/assets/icon-add.svg" alt="" /> Uusi peli</button>
      <div className="tablet-actions">
        <button className="tablet-actions-trigger" aria-label="Lisätoiminnot" aria-expanded={tabletActionsOpen} onClick={() => setTabletActionsOpen((open) => !open)}>
          <Menu size={20} aria-hidden="true" />
        </button>
        {tabletActionsOpen && <div className="tablet-actions-menu" role="menu">
          <button onClick={() => { onOpenGames(); setTabletActionsOpen(false); }}><CalendarDays size={17} aria-hidden="true" />Pelit</button>
          <button onClick={() => { onOpenTeams(); setTabletActionsOpen(false); }}><UsersRound size={17} aria-hidden="true" />Joukkueet</button>
          <button onClick={() => { onOpenSettings(); setTabletActionsOpen(false); }}><Settings size={17} aria-hidden="true" />Asetukset</button>
        </div>}
      </div>
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

interface ScoreButtonProps {
  index: 0 | 1;
  value: number;
  teamName: string;
  disabled: boolean;
  onAddGoal: (index: 0 | 1) => void;
  onEditScore: (index: 0 | 1) => void;
}

const LONG_PRESS_MS = 480;

// The score is the button: a tap adds a goal, a long press (or right click) opens the remove sheet.
function ScoreButton({ index, value, teamName, disabled, onAddGoal, onEditScore }: ScoreButtonProps) {
  const timerRef = useRef<number | undefined>(undefined);
  const longPressedRef = useRef(false);
  const startRef = useRef<[number, number] | null>(null);

  const cancel = () => {
    window.clearTimeout(timerRef.current);
    startRef.current = null;
  };

  return (
    <button
      type="button"
      className="score-button"
      disabled={disabled}
      aria-label={`${teamName}: ${value}. Lisää maali napauttamalla, poista pitkällä painalluksella.`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        longPressedRef.current = false;
        startRef.current = [event.clientX, event.clientY];
        timerRef.current = window.setTimeout(() => {
          longPressedRef.current = true;
          navigator.vibrate?.(8);
          onEditScore(index);
        }, LONG_PRESS_MS);
      }}
      onPointerMove={(event) => {
        const start = startRef.current;
        if (start && Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 10) cancel();
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => {
        event.preventDefault();
        if (longPressedRef.current) return;
        cancel();
        longPressedRef.current = true;
        onEditScore(index);
      }}
      onClick={() => {
        if (longPressedRef.current) {
          longPressedRef.current = false;
          return;
        }
        onAddGoal(index);
      }}
    >
      <b key={`score-${index}-${value}`} className="score-value">{value}</b>
    </button>
  );
}
