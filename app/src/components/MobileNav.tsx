interface MobileNavProps {
  onNewMatch: () => void;
  onOpenSettings: () => void;
}

export function MobileNav({ onNewMatch, onOpenSettings }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Päätoiminnot">
      <button onClick={onNewMatch}>
        <span className="mobile-nav-plus" aria-hidden="true">+</span>
        <span>Uusi peli</span>
      </button>
      <button onClick={onOpenSettings}>
        <img src="/assets/settings-svgrepo-com.svg" alt="" />
        <span>Asetukset</span>
      </button>
    </nav>
  );
}
