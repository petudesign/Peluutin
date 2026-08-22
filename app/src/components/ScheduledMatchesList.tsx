import { formatScheduledDateTime } from "../features/match/scheduledDate";
import type { ScheduledMatch, Team } from "../types";

interface ScheduledMatchesListProps {
  matches: ScheduledMatch[];
  teams: Team[];
  canOpen: boolean;
  activeScheduledMatchId?: string;
  onOpen: (match: ScheduledMatch) => void;
  onDelete: (id: string) => void;
}

export function ScheduledMatchesList({ matches, teams, canOpen, activeScheduledMatchId, onOpen, onDelete }: ScheduledMatchesListProps) {
  if (!matches.length) return <p className="games-empty">Ei tallennettuja tulevia pelejä.</p>;

  return (
    <div className="upcoming-list">
      {matches.map((match) => {
        const team = teams.find((item) => item.id === match.teamId);
        const formation = team?.formations.find((item) => item.id === match.formation);
        const teamSize = formation?.teamSize || match.lineup.length;
        const isActive = match.id === activeScheduledMatchId;
        return (
          <article key={match.id}>
            <time dateTime={match.scheduledAt}>{formatScheduledDateTime(match.scheduledAt)}</time>
            <div className="upcoming-match-copy">
              <strong>{team?.name || "Poistettu joukkue"} – {match.opponent}</strong>
              <span>{match.venue === "home" ? "Kotipeli" : "Vieraspeli"} · {teamSize}v{teamSize} · {match.activePlayerIds.length} pelaajaa</span>
            </div>
            <div className="upcoming-actions">
              <button className="button-primary" disabled={!team || !canOpen || isActive} onClick={() => onOpen(match)}>{isActive ? "Käynnissä" : "Avaa peli"}</button>
              <button className="button-danger-quiet" disabled={isActive} onClick={() => onDelete(match.id)}>Poista</button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
