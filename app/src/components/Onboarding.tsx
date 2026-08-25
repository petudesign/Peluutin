import type { KeyboardEvent } from "react";
import { NAME_MAX_LENGTH } from "../storage";

interface OnboardingProps {
  teamName: string;
  onTeamNameChange: (name: string) => void;
  onCreateTeam: () => void;
}

export function Onboarding({ teamName, onTeamNameChange, onCreateTeam }: OnboardingProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") onCreateTeam();
  };

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card">
        <img className="onboarding-logo" src="/assets/peluutin-logo.svg" alt="Peluutin" />
        <span className="eyebrow">TERVETULOA</span>
        <h1>Aloitetaan joukkueesta</h1>
        <p>Luo ensimmäinen joukkue. Seuraavaksi lisäät joukkueen pelaajat.</p>
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
