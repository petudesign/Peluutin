import type { KeyboardEvent } from "react";
import { NAME_MAX_LENGTH } from "../storage";
import type { Sport } from "../types";

interface OnboardingProps {
  teamName: string;
  onTeamNameChange: (name: string) => void;
  onCreateTeam: () => void;
  sport: Sport;
  onSportChange: (sport: Sport) => void;
}

export function Onboarding({ teamName, onTeamNameChange, onCreateTeam, sport, onSportChange }: OnboardingProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") onCreateTeam();
  };

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card">
        <img className="onboarding-logo" src="/assets/peluutin-logo.svg" alt="Peluutin" />
        <span className="eyebrow">TERVETULOA</span>
        <h1>Luo {sport === "futsal" ? "futsaljoukkue" : "jalkapallojoukkue"}</h1>
        <p>Luo ensimmäinen joukkue. Seuraavaksi lisäät joukkueen pelaajat.</p>
        <div className="onboarding-sport-switch" aria-label="Valitse laji">
          <button className={sport === "football" ? "active" : ""} onClick={() => onSportChange("football")}>Jalkapallo</button>
          <button className={sport === "futsal" ? "active" : ""} onClick={() => onSportChange("futsal")}>Futsal</button>
        </div>
        <label>
          <span>Joukkueen nimi</span>
          <input
            autoFocus
            maxLength={NAME_MAX_LENGTH}
            value={teamName}
            onChange={(event) => onTeamNameChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Esim. Testijoukkue FC"
          />
        </label>
        <button disabled={!teamName.trim()} onClick={onCreateTeam}>Luo joukkue</button>
        <small>Tiedot tallennetaan vain tämän selaimen muistiin.</small>
      </section>
    </main>
  );
}
