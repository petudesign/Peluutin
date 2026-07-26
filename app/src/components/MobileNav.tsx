interface MobileNavProps {
  onNewMatch: () => void;
  onOpenSettings: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function MobileNav({ onNewMatch, onOpenSettings, theme, onToggleTheme }: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Päätoiminnot">
      <button className="mobile-nav-theme" onClick={onToggleTheme} aria-label={theme === "dark" ? "Vaihda vaaleaan teemaan" : "Vaihda tummaan teemaan"}>
        <span className="theme-icon" aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
        <span>{theme === "dark" ? "Vaalea" : "Tumma"}</span>
      </button>
      <button className="mobile-nav-new" onClick={onNewMatch}>
        <img className="mobile-nav-plus add-icon" src="/assets/icon-add.svg" alt="" />
        <span>Uusi peli</span>
      </button>
      <button className="mobile-nav-settings" onClick={onOpenSettings}>
        <img src="/assets/icon-settings.svg" alt="" />
        <span>Asetukset</span>
      </button>
    </nav>
  );
}
