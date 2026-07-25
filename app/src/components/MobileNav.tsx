interface MobileNavProps {
  onNewMatch: () => void;
  onOpenSettings: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export function MobileNav({ onNewMatch, onOpenSettings, theme, onToggleTheme }: MobileNavProps) {
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
      <button onClick={onToggleTheme} aria-label={theme === "dark" ? "Vaihda vaaleaan teemaan" : "Vaihda tummaan teemaan"}>
        <span className="theme-icon" aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
        <span>{theme === "dark" ? "Vaalea" : "Tumma"}</span>
      </button>
    </nav>
  );
}
