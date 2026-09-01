import { ArrowLeft, BarChart3 } from "lucide-react";
import { useMemo } from "react";
import type { MatchRecord, Team } from "../../types";

interface AnalyticsViewProps {
  teams: Team[];
  selectedTeamId: string;
  onSelectedTeamChange: (teamId: string) => void;
  onClose: () => void;
}

const formatMinutes = (seconds: number) => {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
};

const resultFor = (match: MatchRecord): "Voitto" | "Tasapeli" | "Tappio" => {
  const own = match.venue === "away" ? match.score[1] : match.score[0];
  const opponent = match.venue === "away" ? match.score[0] : match.score[1];
  return own > opponent ? "Voitto" : own < opponent ? "Tappio" : "Tasapeli";
};

export function AnalyticsView({ teams, selectedTeamId, onSelectedTeamChange, onClose }: AnalyticsViewProps) {
  const team = teams.find((item) => item.id === selectedTeamId) || teams[0];
  const matches = team?.history || [];
  const summary = useMemo(() => {
    const results = matches.reduce((counts, match) => {
      counts[resultFor(match)] += 1;
      return counts;
    }, { Voitto: 0, Tasapeli: 0, Tappio: 0 });
    const goalsFor = matches.reduce((sum, match) => sum + (match.venue === "away" ? match.score[1] : match.score[0]), 0);
    const goalsAgainst = matches.reduce((sum, match) => sum + (match.venue === "away" ? match.score[0] : match.score[1]), 0);
    const totalMatchSeconds = matches.reduce((sum, match) => sum + match.duration, 0);
    return { ...results, goalsFor, goalsAgainst, totalMatchSeconds };
  }, [matches]);
  const playerStats = useMemo(() => {
    const stats = new Map<string | number, { name: string; number: number; seconds: number; goals: number; appearances: number }>();
    matches.forEach((match) => match.players.forEach((player) => {
      const key = player.id;
      const current = stats.get(key) || { name: player.name, number: player.number, seconds: 0, goals: 0, appearances: 0 };
      current.name = player.name;
      current.number = player.number;
      current.seconds += player.seconds;
      current.goals += player.goals;
      if (player.seconds > 0) current.appearances += 1;
      stats.set(key, current);
    }));
    return [...stats.values()].sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name, "fi"));
  }, [matches]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="settings-modal analytics-modal" role="dialog" aria-modal="true" aria-labelledby="analytics-title">
        <div className="settings-header">
          <div><h2 id="analytics-title">Analytiikka</h2></div>
          <button className="close-button" onClick={onClose}><ArrowLeft size={16} aria-hidden="true" />Takaisin</button>
        </div>
        <div className="analytics-toolbar">
          <div className="analytics-heading"><BarChart3 size={20} aria-hidden="true" /><span>Pelihistoriaan perustuva yhteenveto</span></div>
          {teams.length > 1 && (
            <label className="analytics-team-select"><span>Joukkue</span><select value={team?.id || ""} onChange={(event) => onSelectedTeamChange(event.target.value)}>{teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          )}
        </div>
        {!matches.length ? (
          <p className="games-empty">Tallenna ensimmäinen ottelu, niin näet sen tilastot täällä.</p>
        ) : (
          <>
            <p className="analytics-note">Mukana {matches.length} tallennettua ottelua. Tilastot perustuvat ottelun lopputulokseen ja pelaajakohtaisiin peliaikoihin.</p>
            <div className="analytics-summary-grid">
              <article><span>Ottelut</span><strong>{matches.length}</strong></article>
              <article><span>Voitot · Tasapelit · Tappiot</span><strong>{summary.Voitto} · {summary.Tasapeli} · {summary.Tappio}</strong></article>
              <article><span>Maalit</span><strong>{summary.goalsFor}–{summary.goalsAgainst}</strong></article>
              <article><span>Otteluiden kesto yhteensä</span><strong>{formatMinutes(summary.totalMatchSeconds)}</strong></article>
            </div>
            <section className="analytics-section">
              <div className="section-title"><div><span className="eyebrow">PELAAJAT</span><h3>Peliajat ja maalit</h3></div></div>
              <div className="analytics-table-wrap">
                <table className="analytics-table"><thead><tr><th scope="col">Pelaaja</th><th scope="col">Ottelut</th><th scope="col">Peliminuutit</th><th scope="col">Maalit</th></tr></thead><tbody>{playerStats.map((player) => <tr key={`${player.number}-${player.name}`}><th scope="row"><span className="analytics-player-number">{player.number}</span>{player.name}</th><td>{player.appearances}</td><td>{formatMinutes(player.seconds)}</td><td>{player.goals}</td></tr>)}</tbody></table>
              </div>
            </section>
            <section className="analytics-section">
              <div className="section-title"><div><span className="eyebrow">OTTELUT</span><h3>Viimeisimmät tallennukset</h3></div></div>
              <div className="analytics-match-list">{matches.slice(0, 8).map((match) => <article key={match.id}><div><strong>{new Date(match.playedAt).toLocaleDateString("fi-FI")} · {match.opponent}</strong><span>{match.venue === "home" ? "Koti" : "Vieras"} · {match.formation}</span></div><b className={`analytics-result ${resultFor(match).toLowerCase()}`}>{resultFor(match)} {match.score[0]}–{match.score[1]}</b></article>)}</div>
            </section>
          </>
        )}
      </section>
    </div>
  );
}
