import { CalendarDays, UsersRound } from "lucide-react";

interface MobileNavProps {
  onNewMatch: () => void;
  onOpenTeams: () => void;
  onOpenGames: () => void;
}

export function MobileNav({ onNewMatch, onOpenTeams, onOpenGames }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Päätoiminnot">
      <button className="mobile-nav-teams" onClick={onOpenTeams}>
        <UsersRound aria-hidden="true" />
        <span>Joukkueet</span>
      </button>
      <button className="mobile-nav-new" onClick={onNewMatch}>
        <span className="mobile-nav-plus" aria-hidden="true">+</span>
        <span>Uusi peli</span>
      </button>
      <button className="mobile-nav-games" onClick={onOpenGames}>
        <CalendarDays aria-hidden="true" />
        <span>Pelit</span>
      </button>
    </nav>
  );
}
