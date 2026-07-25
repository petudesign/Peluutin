import { useEffect, useMemo, useState } from "react";
import { buildMatchXlsx } from "./export.js";
import { createFormation, reorderLineup } from "./formation.js";
import { cleanName, FORMATION_MAX_LENGTH, NAME_MAX_LENGTH } from "./storage.js";
import type { Formation, MatchRecord, PlayerId, Score, SelectedPlayer, Team, Venue } from "./types";
import { MatchHeader } from "./components/MatchHeader";
import { MobileNav } from "./components/MobileNav";
import { Onboarding } from "./components/Onboarding";
import { PregameView } from "./components/PregameView";
import { MatchWorkspace } from "./features/match/MatchWorkspace";
import { NewMatchDialog } from "./features/match/NewMatchDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { matchRepository } from "./data/matchRepository";
import { SettingsDialog } from "./features/teams/SettingsDialog";
import { changePlayerGoal } from "./features/match/matchLogic";

const defaultFormations: Formation[] = ["2–2–3", "3–2–2"].map((name) => ({ id: name, name, slots: createFormation(name)! }));

const initialTeams = matchRepository.loadTeams(defaultFormations);
const initialActiveMatch = matchRepository.loadActiveMatch();
const initialTeam = initialTeams.find((team) => team.id === initialActiveMatch?.teamId) || initialTeams[0] || null;
const restoredMatch = initialActiveMatch?.teamId === initialTeam?.id ? initialActiveMatch : null;

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => localStorage.getItem("peluutin-theme") === "dark" ? "dark" : "light");
  const [teams, setTeams] = useState(initialTeams);
  const [teamId, setTeamId] = useState(initialTeam?.id || "");
  const [onboardingTeamName, setOnboardingTeamName] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newMatchOpen, setNewMatchOpen] = useState(false);
  const [endMatchOpen, setEndMatchOpen] = useState(false);
  const [discardMatchOpen, setDiscardMatchOpen] = useState(false);
  const [resetClockOpen, setResetClockOpen] = useState(false);
  const [deleteTeamOpen, setDeleteTeamOpen] = useState(false);
  const [matchEnded, setMatchEnded] = useState(false);
  const [matchCreated, setMatchCreated] = useState(Boolean(restoredMatch));
  const [opponent, setOpponent] = useState(restoredMatch?.opponent || "");
  const [opponentDraft, setOpponentDraft] = useState("");
  const [venue, setVenue] = useState(restoredMatch?.venue || "home");
  const [venueDraft, setVenueDraft] = useState<Venue>("home");
  const [activePlayerIds, setActivePlayerIds] = useState(restoredMatch?.activePlayerIds || initialTeam?.players.map((player) => player.id) || []);
  const [activePlayerDraft, setActivePlayerDraft] = useState(initialTeam?.players.map((player) => player.id) || []);
  const [teamNameDraft, setTeamNameDraft] = useState(initialTeam?.name || "");
  const [newTeamName, setNewTeamName] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newFormationName, setNewFormationName] = useState("");
  const [historyNotice, setHistoryNotice] = useState("");
  const [formation, setFormation] = useState(restoredMatch?.formation || initialTeam?.formations?.[0]?.id || defaultFormations[0].id);
  const [lineup, setLineup] = useState(restoredMatch?.lineup || initialTeam?.players.slice(0, 8).map((p) => p.id) || []);
  const [selected, setSelected] = useState<SelectedPlayer | null>(null);
  const [seconds, setSeconds] = useState(restoredMatch?.seconds || 0);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState<Score>(restoredMatch?.score || [0, 0]);
  const [minutes, setMinutes] = useState(restoredMatch?.minutes || Object.fromEntries((initialTeam?.players || []).map((p) => [p.id, 0])));
  const [goals, setGoals] = useState(restoredMatch?.goals || {});

  const homeTeam = teams.find((team) => team.id === teamId) || teams[0] || null;
  const roster = homeTeam?.players || [];
  const byId = useMemo(() => Object.fromEntries(roster.map((p) => [p.id, p])), [roster]);
  const activeRoster = roster.filter((player) => activePlayerIds.includes(player.id));
  const bench = activeRoster.filter((p) => !lineup.includes(p.id));
  const teamFormations = homeTeam?.formations || defaultFormations;
  const activeFormation = teamFormations.find((item) => item.id === formation) || teamFormations[0];
  const slots = activeFormation?.slots || defaultFormations[0].slots;
  const selectedPlayer = selected ? byId[selected.id] : null;
  const averageSeconds = activeRoster.length
    ? activeRoster.reduce((total, player) => total + (minutes[player.id] || 0), 0) / activeRoster.length
    : 0;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("peluutin-theme", theme);
  }, [theme]);

  useEffect(() => {
    matchRepository.saveTeams(teams);
  }, [teams]);

  useEffect(() => {
    if (!matchCreated || matchEnded || !homeTeam) {
      matchRepository.saveActiveMatch(null);
      return;
    }
    matchRepository.saveActiveMatch({
      teamId: homeTeam.id,
      opponent,
      venue,
      activePlayerIds,
      formation,
      lineup,
      seconds,
      score,
      minutes,
      goals,
    });
  }, [matchCreated, matchEnded, homeTeam, opponent, venue, activePlayerIds, formation, lineup, seconds, score, minutes, goals]);

  useEffect(() => {
    const modalOpen = settingsOpen || newMatchOpen || endMatchOpen || discardMatchOpen || resetClockOpen || deleteTeamOpen;
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [settingsOpen, newMatchOpen, endMatchOpen, discardMatchOpen, resetClockOpen, deleteTeamOpen]);

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

  const activateTeam = (nextTeam: Team) => {
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

  const selectField = (index: number) => {
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

  const changeFormation = (nextFormation: string) => {
    if (nextFormation === formation) return;
    const next = teamFormations.find((item) => item.id === nextFormation);
    if (!next) return;
    setLineup((current) => reorderLineup(current, slots, next.slots));
    setFormation(nextFormation);
    setSelected(null);
  };

  const updateCurrentTeam = (change: (team: Team) => Team) => {
    setTeams((current) => current.map((team) => team.id === teamId ? change(team) : team));
  };

  const addTeam = () => {
    const name = cleanName(newTeamName);
    if (!name) return;
    const team: Team = { id: `team-${Date.now()}`, name, players: [], formations: defaultFormations, history: [] };
    setTeams((current) => [...current, team]);
    setNewTeamName("");
    activateTeam(team);
  };

  const createFirstTeam = () => {
    const name = cleanName(onboardingTeamName);
    if (!name) return;
    const team: Team = { id: `team-${Date.now()}`, name, players: [], formations: defaultFormations, history: [] };
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
    const name = cleanName(newPlayerName);
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

  const removePlayer = (playerId: PlayerId) => {
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
    const normalizedName = newFormationName.trim().slice(0, FORMATION_MAX_LENGTH).replaceAll("-", "–");
    const nextSlots = createFormation(normalizedName);
    if (!nextSlots || teamFormations.some((item) => item.name === normalizedName)) return;
    updateCurrentTeam((team) => ({ ...team, formations: [...teamFormations, { id: normalizedName, name: normalizedName, slots: nextSlots }] }));
    setNewFormationName("");
  };

  const removeFormation = (formationId: string) => {
    if (teamFormations.length === 1) return;
    const remaining = teamFormations.filter((item) => item.id !== formationId);
    updateCurrentTeam((team) => ({ ...team, formations: remaining }));
    if (formation === formationId) setFormation(remaining[0].id);
  };

  const currentMatchData = (): MatchRecord => ({
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

  const discardMatch = () => {
    setRunning(false);
    setMatchEnded(true);
    setEndMatchOpen(false);
    setDiscardMatchOpen(false);
    setHistoryNotice("Peli lopetettiin tallentamatta.");
  };

  const resetClock = () => {
    setSeconds(0);
    setMinutes(Object.fromEntries(roster.map((player) => [player.id, 0])));
    setResetClockOpen(false);
  };

  const deleteMatch = (matchId: string) => {
    updateCurrentTeam((team) => ({ ...team, history: (team.history || []).filter((match) => match.id !== matchId) }));
  };

  const exportMatch = async (match: MatchRecord) => {
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
    const canShare = typeof navigator.share === "function";
    try {
      if (canShare) await navigator.share({ title: "Ottelutilanne", text });
      else await navigator.clipboard.writeText(text);
      setHistoryNotice(canShare ? "Tilanne jaettu." : "Tilanne kopioitu leikepöydälle.");
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
    const nextOpponent = cleanName(opponentDraft);
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
  const changeScore = (index: 0 | 1, amount: number) => setScore((current) => {
    const next: Score = [...current];
    next[index] = Math.max(0, next[index] + amount);
    return next;
  });
  const markGoal = (playerId: PlayerId) => {
    const next = changePlayerGoal(goals, score, playerId, ownScoreIndex, 1);
    setGoals(next.goals);
    setScore(next.score);
  };
  const removeGoal = (playerId: PlayerId) => {
    const next = changePlayerGoal(goals, score, playerId, ownScoreIndex, -1);
    setGoals(next.goals);
    setScore(next.score);
  };

  const saveTeamName = () => {
    updateCurrentTeam((team) => ({ ...team, name: cleanName(teamNameDraft) || team.name }));
  };
  const updatePlayerNumber = (playerId: PlayerId, number: number) => {
    updateCurrentTeam((team) => ({
      ...team,
      players: team.players.map((player) => player.id === playerId
        ? { ...player, number: Math.min(99, Math.max(0, number)) }
        : player),
    }));
  };
  const updatePlayerName = (playerId: PlayerId, name: string) => {
    updateCurrentTeam((team) => ({
      ...team,
      players: team.players.map((player) => player.id === playerId
        ? { ...player, name: name.slice(0, NAME_MAX_LENGTH) }
        : player),
    }));
  };

  if (!homeTeam) {
    return <Onboarding teamName={onboardingTeamName} onTeamNameChange={setOnboardingTeamName} onCreateTeam={createFirstTeam} />;
  }

  return (
    <main className="app-shell">
      <MatchHeader
        homeName={homeName || ""}
        awayName={awayName || ""}
        score={score}
        matchCreated={matchCreated}
        matchEnded={matchEnded}
        running={running}
        seconds={seconds}
        formattedTime={formatTime(seconds)}
        onChangeScore={changeScore}
        onToggleClock={() => setRunning(!running)}
        onEndMatch={() => setEndMatchOpen(true)}
        onNewMatch={openNewMatch}
        onOpenSettings={() => setSettingsOpen(true)}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
      />

      {!matchCreated ? (
        <PregameView
          hasPlayers={roster.length > 0}
          teamName={homeTeam.name}
          onNewMatch={openNewMatch}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      ) : (
        <MatchWorkspace
          bench={bench}
          lineup={lineup}
          formations={teamFormations}
          formationId={formation}
          slots={slots}
          playersById={byId}
          selected={selected}
          selectedPlayer={selectedPlayer || null}
          minutes={minutes}
          goals={goals}
          averageSeconds={averageSeconds}
          formatTime={formatTime}
          onSelect={setSelected}
          onSelectField={selectField}
          onChangeFormation={changeFormation}
          onMarkGoal={markGoal}
          onRemoveGoal={removeGoal}
        />
      )}

      <MobileNav
        onNewMatch={openNewMatch}
        onOpenSettings={() => setSettingsOpen(true)}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
      />

      {newMatchOpen && (
        <NewMatchDialog
          teams={teams}
          teamId={teamId}
          opponent={opponentDraft}
          venue={venueDraft}
          activePlayerIds={activePlayerDraft}
          roster={roster}
          onSelectTeam={activateTeam}
          onOpponentChange={setOpponentDraft}
          onVenueChange={setVenueDraft}
          onActivePlayerIdsChange={setActivePlayerDraft}
          onCreate={createMatch}
          onClose={() => setNewMatchOpen(false)}
        />
      )}

      {endMatchOpen && (
        <ConfirmDialog
          title="Lopetetaanko peli?"
          description={`Peli päättyy aikaan ${formatTime(seconds)} ja tallennetaan pelihistoriaan. Sitä ei voi enää jatkaa.`}
          confirmLabel="Lopeta ja tallenna"
          cancelLabel="Jatka peliä"
          secondaryActionLabel="Lopeta tallentamatta"
          onConfirm={endMatch}
          onCancel={() => setEndMatchOpen(false)}
          onSecondaryAction={() => {
            setEndMatchOpen(false);
            setDiscardMatchOpen(true);
          }}
        />
      )}

      {discardMatchOpen && (
        <ConfirmDialog
          title="Lopetetaanko tallentamatta?"
          description="Peliä ei lisätä pelihistoriaan ja tämän pelin tiedot poistetaan. Tätä ei voi perua."
          confirmLabel="Lopeta tallentamatta"
          cancelLabel="Palaa takaisin"
          onConfirm={discardMatch}
          onCancel={() => {
            setDiscardMatchOpen(false);
            setEndMatchOpen(true);
          }}
        />
      )}

      {resetClockOpen && (
        <ConfirmDialog
          title="Nollataanko peliajat?"
          description="Ottelun kello ja kaikkien pelaajien peliajat nollataan. Tulosta ja maaleja ei muuteta."
          confirmLabel="Nollaa peliajat"
          cancelLabel="Peruuta"
          onConfirm={resetClock}
          onCancel={() => setResetClockOpen(false)}
        />
      )}

      {deleteTeamOpen && (
        <ConfirmDialog
          title={`Poistetaanko ${homeTeam.name}?`}
          description="Joukkueen kaikki pelaajat, muodostelmat ja pelihistoria poistetaan tältä laitteelta. Tätä ei voi perua."
          confirmLabel="Poista joukkue pysyvästi"
          cancelLabel="Peruuta"
          onConfirm={deleteTeam}
          onCancel={() => setDeleteTeamOpen(false)}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          teams={teams}
          teamId={teamId}
          team={homeTeam}
          roster={roster}
          formations={teamFormations}
          teamNameDraft={teamNameDraft}
          newTeamName={newTeamName}
          newPlayerName={newPlayerName}
          newFormationName={newFormationName}
          historyNotice={historyNotice}
          formatTime={formatTime}
          onClose={() => setSettingsOpen(false)}
          onActivateTeam={activateTeam}
          onTeamNameDraftChange={setTeamNameDraft}
          onNewTeamNameChange={setNewTeamName}
          onNewPlayerNameChange={setNewPlayerName}
          onNewFormationNameChange={setNewFormationName}
          onAddTeam={addTeam}
          onSaveTeamName={saveTeamName}
          onRequestDeleteTeam={() => setDeleteTeamOpen(true)}
          onUpdatePlayerNumber={updatePlayerNumber}
          onUpdatePlayerName={updatePlayerName}
          onRemovePlayer={removePlayer}
          onAddPlayer={addPlayer}
          onRemoveFormation={removeFormation}
          onAddFormation={addFormation}
          onShareSituation={shareSituation}
          onSaveMatch={saveMatch}
          canResetClock={matchCreated && !matchEnded && !running && seconds > 0}
          onRequestResetClock={() => setResetClockOpen(true)}
          onExportMatch={exportMatch}
          onDeleteMatch={deleteMatch}
        />
      )}
    </main>
  );
}
