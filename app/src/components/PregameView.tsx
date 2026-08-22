import { CalendarDays } from "lucide-react";
import { ScheduledMatchesList } from "./ScheduledMatchesList";
import type { ScheduledMatch, Team } from "../types";

interface PregameViewProps {
  hasPlayers: boolean;
  teamName: string;
  scheduledMatches: ScheduledMatch[];
  teams: Team[];
  onNewMatch: () => void;
  onOpenSettings: () => void;
  onOpenScheduledMatch: (match: ScheduledMatch) => void;
  onDeleteScheduledMatch: (id: string) => void;
}

export function PregameView({
  hasPlayers, teamName, scheduledMatches, teams, onNewMatch, onOpenSettings, onOpenScheduledMatch, onDeleteScheduledMatch,
}: PregameViewProps) {
  return (
    <section className="pregame-workspace">
      <div className="pregame-content">
        <div className="pregame-card">
          <span className="pregame-icon" aria-hidden="true">
            {hasPlayers ? "✓" : <img className="add-icon" src="/assets/icon-add.svg" alt="" />}
          </span>
          <span className="eyebrow">SEURAAVA VAIHE</span>
          <h1>{hasPlayers ? "Luo joukkueelle peli" : "Lisää joukkueen pelaajat"}</h1>
          <p>{hasPlayers
            ? "Aloita peli heti tai tallenna seuraavat ottelut valmiiksi myöhempää käyttöä varten."
            : `${teamName} on luotu. Lisää seuraavaksi pelaajat, jotta voit muodostaa kokoonpanon ja aloittaa pelin.`}</p>
          <button onClick={hasPlayers ? onNewMatch : onOpenSettings}>{hasPlayers ? "Luo uusi peli" : "Avaa pelaaja-asetukset"}</button>
          {hasPlayers ? <button className="pregame-secondary" onClick={onOpenSettings}>Muokkaa joukkuetta</button> : null}
        </div>

        {scheduledMatches.length ? (
          <section className="upcoming-matches" aria-labelledby="upcoming-title">
            <div className="upcoming-heading">
              <div><CalendarDays aria-hidden="true" /><h2 id="upcoming-title">Tulevat pelit</h2></div>
              <span>{scheduledMatches.length} {scheduledMatches.length === 1 ? "peli" : "peliä"}</span>
            </div>
            <ScheduledMatchesList matches={scheduledMatches} teams={teams} canOpen onOpen={onOpenScheduledMatch} onDelete={onDeleteScheduledMatch} />
          </section>
        ) : null}
      </div>
    </section>
  );
}
