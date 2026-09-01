import { BarChart3, CalendarDays } from "lucide-react";
import { ScheduledMatchesList } from "../../components/ScheduledMatchesList";
import type { MatchRecord, ScheduledMatch, Team } from "../../types";

interface GamesDialogProps {
  matches: ScheduledMatch[];
  teams: Team[];
  canOpen: boolean;
  activeScheduledMatchId?: string;
  currentTeamId: string;
  historyTeamId: string;
  canSaveMatch: boolean;
  historyNotice: string;
  formatTime: (seconds: number) => string;
  onNewMatch: () => void;
  onHistoryTeamChange: (teamId: string) => void;
  onOpenAnalytics: () => void;
  onOpen: (match: ScheduledMatch) => void;
  onDelete: (id: string) => void;
  onSaveMatch: () => void;
  onExportMatch: (match: MatchRecord, teamName: string) => void;
  onDeleteMatch: (teamId: string, matchId: string) => void;
  onClose: () => void;
}

export function GamesDialog({
  matches, teams, canOpen, activeScheduledMatchId, currentTeamId, historyTeamId, canSaveMatch, historyNotice, formatTime,
  onNewMatch, onHistoryTeamChange, onOpenAnalytics, onOpen, onDelete, onSaveMatch, onExportMatch, onDeleteMatch, onClose,
}: GamesDialogProps) {
  const historyTeam = teams.find((team) => team.id === historyTeamId) || teams[0];
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-modal games-modal" role="dialog" aria-modal="true" aria-labelledby="games-title">
        <div className="settings-header">
          <div><h2 id="games-title">Pelit</h2></div>
          <button className="close-button" onClick={onClose}>Sulje</button>
        </div>
        <div className="games-toolbar">
          <div><CalendarDays aria-hidden="true" /><span><strong>Tulevat pelit</strong><small>{matches.length} {matches.length === 1 ? "peli" : "peliä"}</small></span></div>
          <button className="button-primary" onClick={onNewMatch}>Uusi peli</button>
        </div>
        {!canOpen && <p className="games-notice">Lopeta nykyinen peli ennen kuin avaat toisen ottelun. Voit silti tarkastella tulevia pelejä.</p>}
        <ScheduledMatchesList matches={matches} teams={teams} canOpen={canOpen} activeScheduledMatchId={activeScheduledMatchId} onOpen={onOpen} onDelete={onDelete} />
        <section className="games-history">
          <div className="section-title games-history-title">
            <div><span className="eyebrow">TALLENNETUT OTTELUT</span><h3>Pelihistoria</h3></div>
            {teams.length > 1 && (
              <label className="history-team-select">
                <span>Joukkue</span>
                <select value={historyTeam?.id || ""} onChange={(event) => onHistoryTeamChange(event.target.value)}>
                  {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </label>
            )}
            <div className="history-actions">
              {canSaveMatch && historyTeam?.id === currentTeamId && <button className="history-save button-primary" onClick={onSaveMatch}>Tallenna peli</button>}
              <button className="history-analytics button-secondary" onClick={onOpenAnalytics}><BarChart3 size={16} aria-hidden="true" />Analytiikka</button>
            </div>
          </div>
          {historyNotice && historyTeam?.id === currentTeamId && <p className="success-note">{historyNotice}</p>}
          <div className="history-list">
            {(historyTeam?.history || []).length ? historyTeam.history.map((match) => (
              <article key={match.id}>
                <div>
                  <strong>{new Date(match.playedAt).toLocaleDateString("fi-FI")} · {match.score[0]}–{match.score[1]}</strong>
                  <span>{match.opponent} · {formatTime(match.duration)} · {match.formation}</span>
                </div>
                <div className="history-row-actions">
                  <button className="button-secondary" onClick={() => onExportMatch(match, historyTeam.name)}>Vie Exceliin</button>
                  <button className="danger destructive-filled" onClick={() => onDeleteMatch(historyTeam.id, match.id)}>Poista</button>
                </div>
              </article>
            )) : <p className="empty-history">Ei vielä tallennettuja pelejä.</p>}
          </div>
        </section>
      </section>
    </div>
  );
}
