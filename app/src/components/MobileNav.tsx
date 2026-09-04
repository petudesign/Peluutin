import { CalendarDays, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface MobileNavProps {
  onNewMatch: () => void;
  onOpenTeams: () => void;
  onOpenGames: () => void;
}

export function MobileNav({ onNewMatch, onOpenTeams, onOpenGames }: MobileNavProps) {
  const [isHidden, setIsHidden] = useState(false);
  const isHiddenRef = useRef(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    const updateVisibility = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const setVisibility = (hidden: boolean) => {
        if (isHiddenRef.current === hidden) return;
        isHiddenRef.current = hidden;
        setIsHidden(hidden);
      };

      if (currentScrollY <= 16) setVisibility(false);
      else if (currentScrollY > lastScrollY.current + 2) setVisibility(true);
      else if (currentScrollY < lastScrollY.current - 2) setVisibility(false);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  return (
    <nav className={`mobile-nav${isHidden ? " is-hidden" : ""}`} aria-label="Päätoiminnot">
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
