import { Trash2 } from "lucide-react";
import type { FormEvent, KeyboardEvent } from "react";
import { NAME_MAX_LENGTH } from "../storage";
import type { FieldUnit, Player, PlayerId, Sport } from "../types";
import { FieldUnitsEditor } from "./FieldUnitsEditor";

interface PlayerOnboardingProps {
  teamName: string;
  players: Player[];
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  onAddPlayer: () => void;
  onRemovePlayer: (id: PlayerId) => void;
  sport: Sport;
  fieldUnits: FieldUnit[];
  onAddFieldUnit: (name: string, playerIds: PlayerId[]) => void;
  onUpdateFieldUnit: (id: string, name: string, playerIds: PlayerId[]) => void;
  onRemoveFieldUnit: (id: string) => void;
  onContinue: () => void;
}

export function PlayerOnboarding({
  teamName,
  players,
  playerName,
  onPlayerNameChange,
  onAddPlayer,
  onRemovePlayer,
  sport,
  fieldUnits,
  onAddFieldUnit,
  onUpdateFieldUnit,
  onRemoveFieldUnit,
  onContinue,
}: PlayerOnboardingProps) {
  const addPlayer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onAddPlayer();
  };
  const addPlayerWithEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onAddPlayer();
  };

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card player-onboarding-card">
        <img className="onboarding-logo" src="/assets/peluutin-logo.svg" alt="Peluutin" />
        <span className="eyebrow">JOUKKUE LUOTU</span>
        <h1>{teamName}</h1>
        <p>Lisää seuraavaksi joukkueen pelaajat. Voit täydentää ja muokata listaa myöhemmin.</p>

        <form className="onboarding-player-form" onSubmit={addPlayer}>
          <label htmlFor="onboarding-player-name">Pelaajan nimi</label>
          <div>
            <input
              id="onboarding-player-name"
              autoFocus
              maxLength={NAME_MAX_LENGTH}
              value={playerName}
              onChange={(event) => onPlayerNameChange(event.target.value)}
              onKeyDown={addPlayerWithEnter}
              placeholder="Esim. Erkki"
            />
            <button type="submit" disabled={!playerName.trim()}>Lisää pelaaja</button>
          </div>
        </form>

        <section className="onboarding-roster" aria-labelledby="onboarding-roster-title" aria-live="polite">
          <div className="onboarding-roster-title">
            <h2 id="onboarding-roster-title">Pelaajat</h2>
            <span>{players.length}</span>
          </div>
          {players.length ? (
            <ul>
              {players.map((player) => (
                <li key={player.id}>
                  <span className="onboarding-player-number">{player.number}</span>
                  <strong>{player.name}</strong>
                  <button type="button" onClick={() => onRemovePlayer(player.id)} aria-label={`Poista ${player.name}`} title={`Poista ${player.name}`}>
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="onboarding-roster-empty">Ei pelaajia vielä. Lisää ensimmäinen pelaaja yllä.</p>
          )}
        </section>

        {sport === "futsal" ? (
          <FieldUnitsEditor players={players} fieldUnits={fieldUnits} onAdd={onAddFieldUnit} onUpdate={onUpdateFieldUnit} onRemove={onRemoveFieldUnit} />
        ) : null}

        <button className={`onboarding-continue ${players.length ? "" : "onboarding-skip"}`} type="button" onClick={onContinue}>
          {players.length ? "Jatka Peluuttimeen" : "Ohita toistaiseksi"}
        </button>
        <small>Tiedot tallennetaan vain tämän selaimen muistiin.</small>
      </section>
    </main>
  );
}
