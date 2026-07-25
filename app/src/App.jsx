import { useEffect, useMemo, useState } from "react";
import { buildMatchXlsx } from "./export.js";
import { createFormation, reorderLineup } from "./formation.js";

const defaultFormations = ["2–2–3", "3–2–2"].map((name) => ({ id: name, name, slots: createFormation(name) }));

const normalizeTeams = (teams) => teams.map((team) => ({
  ...team,
  formations: team.formations?.length ? team.formations : defaultFormations,
  history: team.history || [],
}));

const loadTeams = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("vaihtopeli-teams"));
    return normalizeTeams(Array.isArray(saved) ? saved : []);
  } catch {
    return [];
  }
};

const initialTeams = loadTeams();
const initialTeam = initialTeams[0] || null;

const formatTime = (seconds) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export function App() {
  const [teams, setTeams] = useState(initialTeams);
  const [teamId, setTeamId] = useState(initialTeam?.id || "");
  const [onboardingTeamName, setOnboardingTeamName] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newMatchOpen, setNewMatchOpen] = useState(false);
  const [endMatchOpen, setEndMatchOpen] = useState(false);
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false);
  const [matchEnded, setMatchEnded] = useState(false);
  const [matchCreated, setMatchCreated] = useState(false);
  const [opponent, setOpponent] = useState("");
  const [opponentDraft, setOpponentDraft] = useState("");
  const [venue, setVenue] = useState("home");
  const [venueDraft, setVenueDraft] = useState("home");
  const [activePlayerIds, setActivePlayerIds] = useState(initialTeam?.players.map((player) => player.id) || []);
  const [activePlayerDraft, setActivePlayerDraft] = useState(initialTeam?.players.map((player) => player.id) || []);
  const [teamNameDraft, setTeamNameDraft] = useState(initialTeam?.name || "");
  const [newTeamName, setNewTeamName] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newFormationName, setNewFormationName] = useState("");
  const [historyNotice, setHistoryNotice] = useState("");
  const [formation, setFormation] = useState(initialTeam?.formations?.[0]?.id || defaultFormations[0].id);
  const [lineup, setLineup] = useState(initialTeam?.players.slice(0, 8).map((p) => p.id) || []);
  const [selected, setSelected] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState([0, 0]);
  const [minutes, setMinutes] = useState(Object.fromEntries((initialTeam?.players || []).map((p) => [p.id, 0])));
  const [goals, setGoals] = useState({});

  const homeTeam = teams.find((team) => team.id === teamId) || teams[0] || null;
  const roster = homeTeam?.players || [];
  const byId = useMemo(() => Object.fromEntries(roster.map((p) => [p.id, p])), [roster]);
  const activeRoster = roster.filter((player) => activePlayerIds.includes(player.id));
  const bench = activeRoster.filter((p) => !lineup.includes(p.id));
  const teamFormations = homeTeam?.formations || defaultFormations;
  const activeFormation = teamFormations.find((item) => item.id === formation) || teamFormations[0];
  const slots = activeFormation?.slots || defaultFormations[0].slots;
  const selectedPlayer = selected ? byId[selected.id] : null;
  const playedValues = activeRoster.map((player) => minutes[player.id] || 0);
  const playRange = playedValues.length
    ? `${Math.round(Math.min(...playedValues) / 60)}–${Math.round(Math.max(...playedValues) / 60)} min`
    : "0–0 min";

  useEffect(() => {
    localStorage.setItem("vaihtopeli-teams", JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    const modalOpen = settingsOpen || newMatchOpen || endMatchOpen || deleteTeamOpen;
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [settingsOpen, newMatchOpen, endMatchOpen, deleteTeamOpen]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSeconds((value) => value + 1);
      setMinutes((current) => {
        const next = { ...current };
        lineup.filter(Boolean).forEach((id) => { next[id] = (next[id] || 0) + 1; });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running, lineup]);

  const activateTeam = (nextTeam) => {
    setTeamId(nextTeam.id);
    setTeamNameDraft(nextTeam.name);
    setFormation((nextTeam.formations || defaultFormations)[0].id);
    setLineup(nextTeam.players.slice(0, 8).map((player) => player.id));
    setActivePlayerIds(nextTeam.players.map((player) => player.id));
    setActivePlayerDraft(nextTeam.players.map((player) => player.id));
    setMinutes(Object.fromEntries(nextTeam.players.map((player) => [player.id, 0])));
    setGoals({});
    setSelected(null);
    setSeconds(0);
    setScore([0, 0]);
    setRunning(false);
    setMatchEnded(false);
    setMatchCreated(false);
  };

  const selectField = (index) => {
    const player = byId[lineup[index]];
    if (!player) return;
    if (!selected) return setSelected({ source: "field", id: player.id, index });
    if (selected.source === "field" && selected.index === index) return setSelected(null);
    if (selected.source === "field") {
      setLineup((current) => {
        const next = [...current];
        [next[selected.index], next[index]] = [next[index], next[selected.index]];
        return next;
      });
    } else {
      setLineup((current) => current.map((id, i) => i === index ? selected.id : id));
    }
    setSelected(null);
  };

  const changeFormation = (nextFormation) => {
    if (nextFormation === formation) return;
    const next = teamFormations.find((item) => item.id === nextFormation);
    setLineup((current) => reorderLineup(current, slots, next.slots));
    setFormation(nextFormation);
    setSelected(null);
  };

  const updateCurrentTeam = (change) => {
    setTeams((current) => current.map((team) => team.id === teamId ? change(team) : team));
  };

  const addTeam = () => {
    const name = newTeamName.trim();
    if (!name) return;
    const team = { id: `team-${Date.now()}`, name, players: [], formations: defaultFormations, history: [] };
    setTeams((current) => [...current, team]);
    setNewTeamName("");
    activateTeam(team);
  };

  const createFirstTeam = () => {
    const name = onboardingTeamName.trim();
    if (!name) return;
    const team = { id: `team-${Date.now()}`, name, players: [], formations: defaultFormations, history: [] };
    setTeams([team]);
    setOnboardingTeamName("");
    activateTeam(team);
    setSettingsOpen(true);
  };

  const deleteTeam = () => {
    const remaining = teams.filter((team) => team.id !== teamId);
    setTeams(remaining);
    if (remaining.length) {
      activateTeam(remaining[0]);
    } else {
      setTeamId("");
      setTeamNameDraft("");
      setLineup([]);
      setActivePlayerIds([]);
      setActivePlayerDraft([]);
      setMinutes({});
      setGoals({});
      setSelected(null);
      setSeconds(0);
      setScore([0, 0]);
      setRunning(false);
      setMatchEnded(false);
      setMatchCreated(false);
      setSettingsOpen(false);
    }
    setDeleteTeamOpen(false);
  };

  const addPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    const player = {
      id: Date.now(),
      name,
      number: roster.reduce((max, item) => Math.max(max, item.number || 0), 0) + 1,
    };
    updateCurrentTeam((team) => ({ ...team, players: [...team.players, player] }));
    setMinutes((current) => ({ ...current, [player.id]: 0 }));
    setNewPlayerName("");
  };

  const removePlayer = (playerId) => {
    const remaining = roster.filter((player) => player.id !== playerId);
    updateCurrentTeam((team) => ({ ...team, players: remaining }));
    setLineup((current) => {
      const next = current.filter((id) => id !== playerId);
      remaining.forEach((player) => {
        if (next.length < 8 && !next.includes(player.id)) next.push(player.id);
      });
      return next;
    });
    setSelected(null);
  };

  const addFormation = () => {
    const normalizedName = newFormationName.trim().replaceAll("-", "–");
    const nextSlots = createFormation(normalizedName);
    if (!nextSlots || teamFormations.some((item) => item.name === normalizedName)) return;
    updateCurrentTeam((team) => ({ ...team, formations: [...teamFormations, { id: normalizedName, name: normalizedName, slots: nextSlots }] }));
    setNewFormationName("");
  };

  const removeFormation = (formationId) => {
    if (teamFormations.length === 1) return;
    const remaining = teamFormations.filter((item) => item.id !== formationId);
    updateCurrentTeam((team) => ({ ...team, formations: remaining }));
    if (formation === formationId) setFormation(remaining[0].id);
  };

  const currentMatchData = () => ({
    id: `match-${Date.now()}`,
    playedAt: new Date().toISOString(),
    opponent,
    venue,
    score: [...score],
    duration: seconds,
    formation,
    players: activeRoster.map((player) => ({
      id: player.id,
      name: player.name,
      number: player.number,
      seconds: minutes[player.id] || 0,
      goals: goals[player.id] || 0,
    })),
  });

  const saveMatch = () => {
    const match = currentMatchData();
    updateCurrentTeam((team) => ({ ...team, history: [match, ...(team.history || [])] }));
    setHistoryNotice("Peli tallennettu historiaan.");
  };

  const endMatch = () => {
    setRunning(false);
    saveMatch();
    setMatchEnded(true);
    setEndMatchOpen(false);
  };

  const deleteMatch = (matchId) => {
    updateCurrentTeam((team) => ({ ...team, history: (team.history || []).filter((match) => match.id !== matchId) }));
  };

  const exportMatch = async (match) => {
    try {
      const xlsx = await buildMatchXlsx(match, homeTeam.name);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([xlsx], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      link.download = `${homeTeam.name}-${match.playedAt.slice(0, 10)}.xlsx`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      setHistoryNotice("Excel-tiedosto luotu.");
    } catch {
      setHistoryNotice("Excel-tiedoston luominen epäonnistui.");
    }
  };

  const shareSituation = async () => {
    const homeName = venue === "home" ? homeTeam.name : opponent;
    const awayName = venue === "home" ? opponent : homeTeam.name;
    const text = `${homeName} ${score[0]}–${score[1]} ${awayName} · ${formatTime(seconds)}`;
    try {
      if (navigator.share) await navigator.share({ title: "Ottelutilanne", text });
      else await navigator.clipboard.writeText(text);
      setHistoryNotice(navigator.share ? "Tilanne jaettu." : "Tilanne kopioitu leikepöydälle.");
    } catch {
      setHistoryNotice("Jakaminen peruttiin.");
    }
  };

  const openNewMatch = () => {
    setOpponentDraft(opponent);
    setVenueDraft(venue);
    setActivePlayerDraft(roster.map((player) => player.id));
    setNewMatchOpen(true);
  };

  const createMatch = () => {
    const nextOpponent = opponentDraft.trim();
    if (!nextOpponent) return;
    setOpponent(nextOpponent);
    setVenue(venueDraft);
    setActivePlayerIds(activePlayerDraft);
    setLineup(activePlayerDraft.slice(0, 8));
    setSeconds(0);
    setScore([0, 0]);
    setMinutes(Object.fromEntries(roster.map((player) => [player.id, 0])));
    setGoals({});
    setSelected(null);
    setRunning(false);
    setMatchEnded(false);
    setMatchCreated(true);
    setHistoryNotice("");
    setNewMatchOpen(false);
  };

  const ownScoreIndex = venue === "home" ? 0 : 1;
  const homeName = venue === "home" ? homeTeam?.name : opponent;
  const awayName = venue === "home" ? opponent : homeTeam?.name;
  const changeScore = (index, amount) => setScore((current) =>
    current.map((value, itemIndex) => itemIndex === index ? Math.max(0, value + amount) : value)
  );

  if (!homeTeam) {
    return (
      <main className="onboarding-shell">
        <section className="onboarding-card">
          <img className="onboarding-logo" src="/assets/peluutin-logo.svg" alt="Peluutin" />
          <span className="eyebrow">TERVETULOA</span>
          <h1>Aloitetaan joukkueesta</h1>
          <p>Luo ensimmäinen joukkue. Seuraavaksi pääset lisäämään pelaajat ja valitsemaan muodostelmat.</p>
          <label>
            <span>Joukkueen nimi</span>
            <input autoFocus value={onboardingTeamName} onChange={(event) => setOnboardingTeamName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && createFirstTeam()} placeholder="Kirjoita joukkueen nimi" />
          </label>
          <button disabled={!onboardingTeamName.trim()} onClick={createFirstTeam}>Luo joukkue</button>
          <small>Tiedot tallennetaan vain tämän selaimen muistiin.</small>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="team-score">
          <div><span className="eyebrow">KOTI</span><strong>{homeName || "Uusi joukkue"}</strong></div>
          <button disabled={!matchCreated} aria-label="Vähennä kotijoukkueen maalia" onClick={() => changeScore(0, -1)}>−</button>
          <b>{score[0]}</b>
          <button disabled={!matchCreated} aria-label="Lisää kotijoukkueen maali" onClick={() => changeScore(0, 1)}>+</button>
        </div>
        <div className="match-clock">
          {matchCreated ? <span>{formatTime(seconds)}</span> : <span className="no-match-status">Ei aktiivista peliä</span>}
          {!matchCreated ? null : matchEnded ? (
            <button onClick={openNewMatch}>Uusi peli</button>
          ) : (
            <div className="clock-actions">
              <button className={`${running ? "pause" : ""} ${seconds > 0 ? "in-match" : ""}`} onClick={() => setRunning(!running)}>
                {running ? "Tauko" : seconds ? "Jatka" : "Aloita peli"}
              </button>
              {seconds > 0 && <button className="end-match-button" onClick={() => setEndMatchOpen(true)}>Lopeta</button>}
            </div>
          )}
        </div>
        <div className="team-score away">
          <div><span className="eyebrow">VIERAS</span><strong>{awayName || "Vierasjoukkue"}</strong></div>
          <button disabled={!matchCreated} aria-label="Vähennä vierasjoukkueen maalia" onClick={() => changeScore(1, -1)}>−</button>
          <b>{score[1]}</b>
          <button disabled={!matchCreated} aria-label="Lisää vierasjoukkueen maali" onClick={() => changeScore(1, 1)}>+</button>
        </div>
        <button className="new-match-trigger" onClick={openNewMatch}><span aria-hidden="true">+</span> Uusi peli</button>
        <button className="settings-trigger" aria-label="Asetukset" onClick={() => setSettingsOpen(true)}>
          <img src="/assets/settings-svgrepo-com.svg" alt="" />
        </button>
      </header>

      {!matchCreated ? (
        <section className="pregame-workspace">
          <div className="pregame-card">
            <span className="pregame-icon" aria-hidden="true">{roster.length ? "✓" : "+"}</span>
            <span className="eyebrow">SEURAAVA VAIHE</span>
            <h1>{roster.length ? "Luo joukkueelle peli" : "Lisää joukkueen pelaajat"}</h1>
            <p>{roster.length
              ? "Valitse vastustaja, koti- tai vieraspeli sekä tämän ottelun aktiiviset pelaajat ennen kellon käynnistämistä."
              : `${homeTeam.name} on luotu. Lisää seuraavaksi pelaajat, jotta voit muodostaa kokoonpanon ja aloittaa pelin.`}</p>
            <button onClick={roster.length ? openNewMatch : () => setSettingsOpen(true)}>
              {roster.length ? "Luo uusi peli" : "Avaa pelaaja-asetukset"}
            </button>
            {roster.length > 0 && <button className="pregame-secondary" onClick={() => setSettingsOpen(true)}>Muokkaa joukkuetta</button>}
          </div>
        </section>
      ) : <section className="workspace">
        <aside className="side-panel bench-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">KOKOONPANO</span><h1>Vaihtopenkki</h1></div>
            <span className="count">{bench.length}</span>
          </div>
          <p className="helper">
            {selectedPlayer ? `${selectedPlayer.name} valittu — valitse uusi paikka.` : "Valitse vaihtopelaaja ja sitten hänen uusi paikkansa."}
          </p>
          <div className="bench-list">
            {bench.map((player) => (
              <button key={player.id} className={`bench-player ${selected?.id === player.id ? "selected" : ""}`} onClick={() => setSelected({ source: "bench", id: player.id })}>
                <span className="avatar">{player.number}</span>
                <span><strong>{player.name}</strong><small>Valmiina vaihtoon</small></span>
                <span className="player-time">{formatTime(minutes[player.id] || 0)}</span>
              </button>
            ))}
          </div>
          {selected?.source === "bench" && (
            <div className="mobile-replace">
              <div className="replace-heading"><span>Kenet vaihdetaan pois?</span><button onClick={() => setSelected(null)}>Peru</button></div>
              <div className="replace-grid">
                {lineup.map((id, index) => {
                  const player = byId[id];
                  return player && (
                    <button key={id} onClick={() => selectField(index)}>
                      <strong>{player.name}</strong><span>{slots[index][0]} · {formatTime(minutes[id] || 0)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="fairness"><span>Peliajat</span><strong>{playRange}</strong></div>
        </aside>

        <section className="field-area">
          <div className="field-toolbar">
            <div>
              <span className="eyebrow">MUODOSTELMA</span>
              <div className="formation-switch">
                {teamFormations.map((item) => (
                  <button key={item.id} className={formation === item.id ? "active" : ""} onClick={() => changeFormation(item.id)}>{item.name}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="pitch">
            {slots.map(([role, x, y], index) => {
              const player = byId[lineup[index]];
              if (!player) {
                return <div key={`${formation}-${index}`} style={{ left: `${x}%`, top: `${y}%` }} className="player-card empty-slot"><span className="role">{role}</span><strong>Tyhjä</strong></div>;
              }
              return (
                <button key={`${formation}-${index}`} style={{ left: `${x}%`, top: `${y}%` }}
                  className={`player-card ${selected?.source === "bench" ? "allowed" : ""} ${selected?.source === "field" && selected.index === index ? "selected" : ""}`}
                  onClick={() => selectField(index)} aria-label={`${player.name}, paikka ${role}`}>
                  <span className="player-meta"><span className="role">{role}</span><em>{goals[player.id] || 0} <span aria-hidden="true">⚽</span></em></span>
                  <strong>{player.name}</strong>
                  <span className="player-time-on-field">{formatTime(minutes[player.id] || 0)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="side-panel details">
          <span className="eyebrow">PELAAJA</span>
          <h2>{selectedPlayer?.name || "Valitse pelaaja"}</h2>
          {selectedPlayer ? (
            <>
              <div className="big-time">{formatTime(minutes[selectedPlayer.id] || 0)}</div>
              <p className="muted">Pelaaja voidaan vaihtaa vapaasti mille tahansa paikalle.</p>
              <button className="goal-button" onClick={() => {
                setGoals((current) => ({ ...current, [selectedPlayer.id]: (current[selectedPlayer.id] || 0) + 1 }));
                changeScore(ownScoreIndex, 1);
              }}>Merkitse maali</button>
              <button className="secondary" onClick={() => setSelected(null)}>Peru valinta</button>
            </>
          ) : <p className="empty-copy">Näet tästä peliajan ja voit merkitä maalin.</p>}
        </aside>
      </section>}

      <nav className="mobile-nav" aria-label="Päätoiminnot">
        <button onClick={openNewMatch}>
          <span className="mobile-nav-plus" aria-hidden="true">+</span>
          <span>Uusi peli</span>
        </button>
        <button onClick={() => setSettingsOpen(true)}>
          <img src="/assets/settings-svgrepo-com.svg" alt="" />
          <span>Asetukset</span>
        </button>
      </nav>

      {newMatchOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setNewMatchOpen(false)}>
          <section className="new-match-modal" role="dialog" aria-modal="true" aria-labelledby="new-match-title">
            <div className="settings-header">
              <div><span className="eyebrow">OTTELU</span><h2 id="new-match-title">Luo uusi peli</h2></div>
              <button className="close-button" onClick={() => setNewMatchOpen(false)}>Sulje</button>
            </div>
            <label>
              <span>Oma joukkue</span>
              <select value={teamId} onChange={(event) => {
                const nextTeam = teams.find((team) => team.id === event.target.value);
                if (nextTeam) activateTeam(nextTeam);
              }}>
                {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
            <label>
              <span>Vastustaja</span>
              <input autoFocus value={opponentDraft} onChange={(event) => setOpponentDraft(event.target.value)} placeholder="Vastustajan nimi" />
            </label>
            <fieldset>
              <legend>Oma joukkue pelaa</legend>
              <div className="venue-switch">
                <button type="button" className={venueDraft === "home" ? "active" : ""} onClick={() => setVenueDraft("home")}>Kotona</button>
                <button type="button" className={venueDraft === "away" ? "active" : ""} onClick={() => setVenueDraft("away")}>Vieraissa</button>
              </div>
            </fieldset>
            <fieldset>
              <div className="attendance-heading">
                <legend>Aktiiviset pelaajat</legend>
                <span>{activePlayerDraft.length}/{roster.length} mukana</span>
              </div>
              <div className="attendance-list">
                {roster.map((player) => (
                  <label key={player.id}>
                    <input type="checkbox" checked={activePlayerDraft.includes(player.id)} onChange={() => setActivePlayerDraft((current) =>
                      current.includes(player.id) ? current.filter((id) => id !== player.id) : [...current, player.id]
                    )} />
                    <span className="avatar">{player.number}</span>
                    <strong>{player.name}</strong>
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="create-match-button" disabled={!opponentDraft.trim() || !activePlayerDraft.length} onClick={createMatch}>Luo peli</button>
          </section>
        </div>
      )}

      {endMatchOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEndMatchOpen(false)}>
          <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="end-match-title" aria-describedby="end-match-description">
            <span className="eyebrow">VARMISTUS</span>
            <h2 id="end-match-title">Lopetetaanko peli?</h2>
            <p id="end-match-description">Peli päättyy aikaan {formatTime(seconds)} ja tallennetaan pelihistoriaan. Sitä ei voi enää jatkaa.</p>
            <div className="confirm-actions">
              <button className="secondary" onClick={() => setEndMatchOpen(false)}>Jatka peliä</button>
              <button className="danger-confirm" onClick={endMatch}>Lopeta ja tallenna</button>
            </div>
          </section>
        </div>
      )}

      {deleteTeamOpen && (
        <div className="modal-backdrop confirmation-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDeleteTeamOpen(false)}>
          <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-team-title" aria-describedby="delete-team-description">
            <span className="eyebrow">VARMISTUS</span>
            <h2 id="delete-team-title">Poistetaanko {homeTeam.name}?</h2>
            <p id="delete-team-description">Joukkueen kaikki pelaajat, muodostelmat ja pelihistoria poistetaan tältä laitteelta. Tätä ei voi perua.</p>
            <div className="confirm-actions">
              <button className="secondary" onClick={() => setDeleteTeamOpen(false)}>Peruuta</button>
              <button className="danger-confirm" onClick={deleteTeam}>Poista joukkue pysyvästi</button>
            </div>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSettingsOpen(false)}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="settings-header">
              <div><span className="eyebrow">JOUKKUEET JA PELAAJAT</span><h2 id="settings-title">Asetukset</h2></div>
              <button className="close-button" onClick={() => setSettingsOpen(false)}>Sulje</button>
            </div>
            <div className="settings-layout">
              <aside className="team-settings">
                <h3>Joukkueet</h3>
                <div className="team-list">
                  {teams.map((team) => (
                    <button key={team.id} className={team.id === teamId ? "active" : ""} onClick={() => activateTeam(team)}>
                      <strong>{team.name}</strong><span>{team.players.length} pelaajaa</span>
                    </button>
                  ))}
                </div>
                <div className="add-row">
                  <input value={newTeamName} onChange={(event) => setNewTeamName(event.target.value)} placeholder="Uuden joukkueen nimi" />
                  <button onClick={addTeam}>Lisää</button>
                </div>
              </aside>
              <div className="player-settings">
                <h3>Valittu joukkue</h3>
                <div className="team-name-row">
                  <input value={teamNameDraft} onChange={(event) => setTeamNameDraft(event.target.value)} aria-label="Joukkueen nimi" />
                  {teamNameDraft.trim() !== homeTeam.name && (
                    <button onClick={() => updateCurrentTeam((team) => ({ ...team, name: teamNameDraft.trim() || team.name }))}>Tallenna nimi</button>
                  )}
                  <button className="danger destructive-filled" onClick={() => setDeleteTeamOpen(true)}>Poista joukkue</button>
                </div>
                <div className="player-editor-list">
                  {roster.map((player) => (
                    <div className="player-editor" key={player.id}>
                      <input type="number" aria-label={`${player.name} pelinumero`} value={player.number}
                        onChange={(event) => updateCurrentTeam((team) => ({ ...team, players: team.players.map((item) => item.id === player.id ? { ...item, number: Number(event.target.value) } : item) }))} />
                      <input aria-label={`${player.name} nimi`} value={player.name}
                        onChange={(event) => updateCurrentTeam((team) => ({ ...team, players: team.players.map((item) => item.id === player.id ? { ...item, name: event.target.value } : item) }))} />
                      <button className="danger destructive-filled" onClick={() => removePlayer(player.id)}>Poista</button>
                    </div>
                  ))}
                </div>
                <div className="add-row player-add">
                  <input value={newPlayerName} onChange={(event) => setNewPlayerName(event.target.value)} placeholder="Pelaajan nimi" />
                  <button onClick={addPlayer}>Lisää pelaaja</button>
                </div>

                <section className="settings-section">
                  <div className="section-title">
                    <div><span className="eyebrow">JOUKKUEKOHTAINEN</span><h3>Muodostelmat</h3></div>
                    <span className="section-hint">Kolmen rivin pitää sisältää yhteensä 7 kenttäpelaajaa.</span>
                  </div>
                  <div className="formation-editor-list">
                    {teamFormations.map((item) => (
                      <div key={item.id}>
                        <strong>{item.name}</strong>
                        <button className="danger" disabled={teamFormations.length === 1} onClick={() => removeFormation(item.id)}>Poista</button>
                      </div>
                    ))}
                  </div>
                  <div className="add-row">
                    <input value={newFormationName} onChange={(event) => setNewFormationName(event.target.value)} placeholder="Esim. 2–3–2" />
                    <button onClick={addFormation}>Lisää muodostelma</button>
                  </div>
                </section>

                <section className="settings-section">
                  <div className="section-title">
                    <div><span className="eyebrow">PAIKALLINEN TALLENNUS</span><h3>Pelihistoria</h3></div>
                    <div className="history-actions">
                      <button onClick={shareSituation}>Jaa tilanne</button>
                      <button onClick={saveMatch}>Tallenna nykyinen peli</button>
                    </div>
                  </div>
                  {historyNotice && <p className="success-note">{historyNotice}</p>}
                  <div className="history-list">
                    {(homeTeam.history || []).length ? homeTeam.history.map((match) => (
                      <article key={match.id}>
                        <div>
                          <strong>{new Date(match.playedAt).toLocaleDateString("fi-FI")} · {match.score[0]}–{match.score[1]}</strong>
                          <span>{match.opponent} · {formatTime(match.duration)} · {match.formation}</span>
                        </div>
                        <div className="history-row-actions">
                          <button onClick={() => exportMatch(match)}>Vie Exceliin</button>
                          <button className="danger destructive-filled" onClick={() => deleteMatch(match.id)}>Poista</button>
                        </div>
                      </article>
                    )) : <p className="empty-history">Ei vielä tallennettuja pelejä.</p>}
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
