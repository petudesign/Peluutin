import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { buildMatchXlsx } from "./export.js";
import { createFormation, reorderLineup } from "./formation.js";
import { cleanName, FORMATION_MAX_LENGTH, MAX_FORMATIONS_PER_TEAM_SIZE, NAME_MAX_LENGTH } from "./storage.js";
import type { Formation, MatchRecord, PlayerId, ScheduledMatch, Score, SelectedPlayer, Team, TeamSize, Venue } from "./types";
import { MatchHeader } from "./components/MatchHeader";
import { MobileNav } from "./components/MobileNav";
import { Onboarding } from "./components/Onboarding";
import { PregameView } from "./components/PregameView";
import { MatchWorkspace } from "./features/match/MatchWorkspace";
import { NewMatchDialog } from "./features/match/NewMatchDialog";
import { GamesDialog } from "./features/match/GamesDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { matchRepository } from "./data/matchRepository";
import { SettingsDialog } from "./features/teams/SettingsDialog";
import { AppSettingsDialog } from "./features/settings/AppSettingsDialog";
import { changePlayerGoal } from "./features/match/matchLogic";
import { scheduledStartError } from "./features/match/scheduledDate";

const ExercisePlanner = lazy(() => import("./features/exercises/ExercisePlanner.js").then((module) => ({ default: module.ExercisePlanner })));

const defaultFormations: Formation[] = [
  [8, "2–3–2"],
  [8, "3–2–2"],
  [5, "1–2–1"],
  [11, "4–4–2"],
].map(([teamSize, name]) => ({
  id: `${teamSize}-${name}`,
  name: String(name),
  teamSize: teamSize as TeamSize,
  slots: createFormation(String(name), teamSize as TeamSize)!,
}));

const initialTeams = matchRepository.loadTeams(defaultFormations);
const initialActiveMatch = matchRepository.loadActiveMatch();
const initialScheduledMatches = matchRepository.loadScheduledMatches();
const initialTeam = initialTeams.find((team) => team.id === initialActiveMatch?.teamId) || initialTeams[0] || null;
const restoredMatch = initialActiveMatch?.teamId === initialTeam?.id ? initialActiveMatch : null;

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export function App() {
  const [activeFeature, setActiveFeature] = useState<"matches" | "exercises">(() => window.location.hash === "#harjoitteet" ? "exercises" : "matches");
  const [theme, setTheme] = useState<"light" | "dark">(() => localStorage.getItem("peluutin-theme") === "dark" ? "dark" : "light");
  const [teams, setTeams] = useState(initialTeams);
  const [teamId, setTeamId] = useState(initialTeam?.id || "");
  const [onboardingTeamName, setOnboardingTeamName] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [appSettingsReturnToTeams, setAppSettingsReturnToTeams] = useState(false);
  const [settingsTeamId, setSettingsTeamId] = useState(initialTeam?.id || "");
  const [newMatchOpen, setNewMatchOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
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
  const [newFormationTeamSize, setNewFormationTeamSize] = useState<TeamSize>(8);
  const [historyNotice, setHistoryNotice] = useState("");
  const [formation, setFormation] = useState(restoredMatch?.formation || initialTeam?.formations?.[0]?.id || defaultFormations[0].id);
  const initialFormation = initialTeam?.formations?.find((item) => item.id === (restoredMatch?.formation || initialTeam.formations[0]?.id));
  const [lineup, setLineup] = useState(restoredMatch?.lineup || initialTeam?.players.slice(0, initialFormation?.slots.length || 8).map((p) => p.id) || []);
  const [selected, setSelected] = useState<SelectedPlayer | null>(null);
  const [seconds, setSeconds] = useState(restoredMatch?.seconds || 0);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState<Score>(restoredMatch?.score || [0, 0]);
  const [minutes, setMinutes] = useState(restoredMatch?.minutes || Object.fromEntries((initialTeam?.players || []).map((p) => [p.id, 0])));
  const [goals, setGoals] = useState(restoredMatch?.goals || {});
  const [scheduledMatches, setScheduledMatches] = useState<ScheduledMatch[]>(initialScheduledMatches);
  const [activeScheduledMatchId, setActiveScheduledMatchId] = useState(restoredMatch?.scheduledMatchId);

  const homeTeam = teams.find((team) => team.id === teamId) || teams[0] || null;
  const settingsTeam = teams.find((team) => team.id === settingsTeamId) || homeTeam;
  const roster = homeTeam?.players || [];
  const settingsRoster = settingsTeam?.players || [];
  const byId = useMemo(() => Object.fromEntries(roster.map((p) => [p.id, p])), [roster]);
  const activeRoster = roster.filter((player) => activePlayerIds.includes(player.id));
  const bench = activeRoster.filter((p) => !lineup.includes(p.id));
  const teamFormations = (homeTeam?.formations || defaultFormations).map((item) => ({
    ...item,
    slots: createFormation(item.name, item.teamSize) || item.slots,
  }));
  const settingsFormations = (settingsTeam?.formations || defaultFormations).map((item) => ({
    ...item,
    slots: createFormation(item.name, item.teamSize) || item.slots,
  }));
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
    document.title = `Peluutin – ${activeFeature === "exercises" ? "Harjoitteet" : "Ottelut"}`;
  }, [activeFeature]);

  useEffect(() => {
    const syncFeatureFromHash = () => setActiveFeature(window.location.hash === "#harjoitteet" ? "exercises" : "matches");
    window.addEventListener("hashchange", syncFeatureFromHash);
    return () => window.removeEventListener("hashchange", syncFeatureFromHash);
  }, []);

  useEffect(() => {
    matchRepository.saveTeams(teams);
  }, [teams]);

  useEffect(() => {
    matchRepository.saveScheduledMatches(scheduledMatches);
  }, [scheduledMatches]);

  useEffect(() => {
    if (!historyNotice) return;
    const timer = window.setTimeout(() => setHistoryNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [historyNotice]);

  useEffect(() => {
    if (!matchCreated || matchEnded || !homeTeam) {
      matchRepository.saveActiveMatch(null);
      return;
    }
    matchRepository.saveActiveMatch({
      scheduledMatchId: activeScheduledMatchId,
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
  }, [matchCreated, matchEnded, activeScheduledMatchId, homeTeam, opponent, venue, activePlayerIds, formation, lineup, seconds, score, minutes, goals]);

  useEffect(() => {
    const modalOpen = settingsOpen || appSettingsOpen || newMatchOpen || gamesOpen || endMatchOpen || discardMatchOpen || resetClockOpen || deleteTeamOpen;
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [settingsOpen, appSettingsOpen, newMatchOpen, gamesOpen, endMatchOpen, discardMatchOpen, resetClockOpen, deleteTeamOpen]);

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
    const nextFormation = (nextTeam.formations || defaultFormations)[0];
    setTeamId(nextTeam.id);
    setTeamNameDraft(nextTeam.name);
    setFormation(nextFormation.id);
    setLineup(nextTeam.players.slice(0, nextFormation.slots.length).map((player) => player.id));
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
    setActiveScheduledMatchId(undefined);
  };

  const openTeamSettings = () => {
    if (!homeTeam) return;
    setSettingsTeamId(homeTeam.id);
    setTeamNameDraft(homeTeam.name);
    setNewFormationTeamSize(activeFormation?.teamSize || 8);
    setSettingsOpen(true);
  };

  const selectSettingsTeam = (nextTeam: Team) => {
    setSettingsTeamId(nextTeam.id);
    setTeamNameDraft(nextTeam.name);
    setNewFormationTeamSize(nextTeam.formations?.[0]?.teamSize || 8);
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

  const updateSettingsTeam = (change: (team: Team) => Team) => {
    setTeams((current) => current.map((team) => team.id === settingsTeamId ? change(team) : team));
  };

  const addTeam = () => {
    const name = cleanName(newTeamName);
    if (!name) return;
    const team: Team = { id: `team-${Date.now()}`, name, players: [], formations: defaultFormations, history: [] };
    setTeams((current) => [...current, team]);
    setNewTeamName("");
    setSettingsTeamId(team.id);
    setTeamNameDraft(team.name);
    setNewFormationTeamSize(team.formations[0]?.teamSize || 8);
  };

  const createFirstTeam = () => {
    const name = cleanName(onboardingTeamName);
    if (!name) return;
    const team: Team = { id: `team-${Date.now()}`, name, players: [], formations: defaultFormations, history: [] };
    setTeams([team]);
    setOnboardingTeamName("");
    activateTeam(team);
    setSettingsTeamId(team.id);
    setSettingsOpen(true);
  };

  const deleteTeam = () => {
    const remaining = teams.filter((team) => team.id !== settingsTeamId);
    setTeams(remaining);
    setScheduledMatches((current) => current.filter((match) => match.teamId !== settingsTeamId));
    if (settingsTeamId === teamId && remaining.length) {
      activateTeam(remaining[0]);
      setSettingsTeamId(remaining[0].id);
      setTeamNameDraft(remaining[0].name);
    } else if (remaining.length) {
      setSettingsTeamId(remaining[0].id);
      setTeamNameDraft(remaining[0].name);
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
      number: settingsRoster.reduce((max, item) => Math.max(max, item.number || 0), 0) + 1,
    };
    updateSettingsTeam((team) => ({ ...team, players: [...team.players, player] }));
    if (settingsTeamId === teamId) {
      setMinutes((current) => ({ ...current, [player.id]: 0 }));
      if (newMatchOpen) setActivePlayerDraft((current) => [...current, player.id]);
    }
    setNewPlayerName("");
  };

  const removePlayer = (playerId: PlayerId) => {
    const remaining = settingsRoster.filter((player) => player.id !== playerId);
    updateSettingsTeam((team) => ({ ...team, players: remaining }));
    if (settingsTeamId !== teamId) return;
    setLineup((current) => {
      const next = current.filter((id) => id !== playerId);
      remaining.forEach((player) => {
        if (next.length < slots.length && !next.includes(player.id)) next.push(player.id);
      });
      return next;
    });
    setSelected(null);
  };

  const addFormation = () => {
    if (settingsFormations.filter((item) => item.teamSize === newFormationTeamSize).length >= MAX_FORMATIONS_PER_TEAM_SIZE) return;
    const normalizedName = newFormationName.trim().slice(0, FORMATION_MAX_LENGTH).replaceAll("-", "–");
    const nextSlots = createFormation(normalizedName, newFormationTeamSize);
    if (!nextSlots || settingsFormations.some((item) => item.name === normalizedName && item.teamSize === newFormationTeamSize)) return;
    const id = `${newFormationTeamSize}-${normalizedName}`;
    updateSettingsTeam((team) => ({
      ...team,
      formations: [...settingsFormations, { id, name: normalizedName, teamSize: newFormationTeamSize, slots: nextSlots }],
    }));
    setNewFormationName("");
  };

  const removeFormation = (formationId: string) => {
    if (settingsFormations.length === 1) return;
    const remaining = settingsFormations.filter((item) => item.id !== formationId);
    updateSettingsTeam((team) => ({ ...team, formations: remaining }));
    if (settingsTeamId === teamId && formation === formationId) {
      const nextFormation = remaining.find((item) => item.teamSize === activeFormation?.teamSize) || remaining[0];
      setFormation(nextFormation.id);
      setLineup((current) => reorderLineup(current, slots, nextFormation.slots));
    }
  };

  const currentMatchData = (): MatchRecord => ({
    id: `match-${Date.now()}`,
    playedAt: new Date().toISOString(),
    opponent,
    venue,
    score: [...score],
    duration: seconds,
    formation: activeFormation?.name || formation,
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
    if (activeScheduledMatchId) setScheduledMatches((current) => current.filter((item) => item.id !== activeScheduledMatchId));
    setActiveScheduledMatchId(undefined);
    setEndMatchOpen(false);
  };

  const discardMatch = () => {
    setRunning(false);
    setMatchEnded(true);
    setActiveScheduledMatchId(undefined);
    setEndMatchOpen(false);
    setDiscardMatchOpen(false);
    setHistoryNotice("Peli lopetettiin tallentamatta.");
  };

  const resetClock = () => {
    setSeconds(0);
    setMinutes(Object.fromEntries(roster.map((player) => [player.id, 0])));
    setResetClockOpen(false);
  };

  const deleteMatch = (historyTeamId: string, matchId: string) => {
    setTeams((current) => current.map((team) => team.id === historyTeamId
      ? { ...team, history: (team.history || []).filter((match) => match.id !== matchId) }
      : team));
    setHistoryNotice("Peli poistettu historiasta.");
  };

  const exportMatch = async (match: MatchRecord, teamName = homeTeam.name) => {
    try {
      const xlsx = await buildMatchXlsx(match, teamName);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([xlsx], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      link.download = `${teamName}-${match.playedAt.slice(0, 10)}.xlsx`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      setHistoryNotice("Excel-tiedosto luotu.");
    } catch {
      setHistoryNotice("Excel-tiedoston luominen epäonnistui.");
    }
  };

  const openNewMatch = () => {
    setOpponentDraft(opponent);
    setVenueDraft(venue);
    setActivePlayerDraft(roster.map((player) => player.id));
    setNewMatchOpen(true);
  };

  const createMatch = (formationId: string, startingLineup: PlayerId[]) => {
    const nextOpponent = cleanName(opponentDraft);
    if (!nextOpponent || (matchCreated && !matchEnded)) return;
    setOpponent(nextOpponent);
    setVenue(venueDraft);
    setActivePlayerIds(activePlayerDraft);
    setFormation(formationId);
    setLineup(startingLineup);
    setSeconds(0);
    setScore([0, 0]);
    setMinutes(Object.fromEntries(roster.map((player) => [player.id, 0])));
    setGoals({});
    setSelected(null);
    setRunning(false);
    setMatchEnded(false);
    setMatchCreated(true);
    setActiveScheduledMatchId(undefined);
    setHistoryNotice("");
    setNewMatchOpen(false);
  };

  const scheduleMatch = (scheduledAt: string, formationId: string, startingLineup: PlayerId[]) => {
    const nextOpponent = cleanName(opponentDraft);
    if (!nextOpponent || !homeTeam || scheduledStartError(new Date(scheduledAt), homeTeam.id, scheduledMatches)) return;
    const scheduled: ScheduledMatch = {
      id: `scheduled-${Date.now()}`,
      scheduledAt,
      teamId: homeTeam.id,
      opponent: nextOpponent,
      venue: venueDraft,
      formation: formationId,
      activePlayerIds: activePlayerDraft,
      lineup: startingLineup,
    };
    setScheduledMatches((current) => [...current, scheduled].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)));
    setHistoryNotice("Peli lisättiin tuleviin peleihin.");
    setNewMatchOpen(false);
  };

  const openScheduledMatch = (scheduled: ScheduledMatch) => {
    const team = teams.find((item) => item.id === scheduled.teamId);
    if (!team) return;
    const teamFormation = team.formations.find((item) => item.id === scheduled.formation) || team.formations[0];
    const playerIds = new Set(team.players.map((player) => player.id));
    const nextActive = scheduled.activePlayerIds.filter((id) => playerIds.has(id));
    const nextLineup = scheduled.lineup.filter((id) => playerIds.has(id));
    nextActive.forEach((id) => { if (nextLineup.length < teamFormation.slots.length && !nextLineup.includes(id)) nextLineup.push(id); });
    setTeamId(team.id);
    setOpponent(scheduled.opponent);
    setVenue(scheduled.venue);
    setActivePlayerIds(nextActive);
    setFormation(teamFormation.id);
    setLineup(nextLineup.slice(0, teamFormation.slots.length));
    setSeconds(0);
    setScore([0, 0]);
    setMinutes(Object.fromEntries(team.players.map((player) => [player.id, 0])));
    setGoals({});
    setSelected(null);
    setRunning(false);
    setMatchEnded(false);
    setMatchCreated(true);
    setActiveScheduledMatchId(scheduled.id);
    setGamesOpen(false);
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
    updateSettingsTeam((team) => ({ ...team, name: cleanName(teamNameDraft) || team.name }));
  };
  const updatePlayerNumber = (playerId: PlayerId, number: number) => {
    updateSettingsTeam((team) => ({
      ...team,
      players: team.players.map((player) => player.id === playerId
        ? { ...player, number: Math.min(99, Math.max(0, number)) }
        : player),
    }));
  };
  const updatePlayerName = (playerId: PlayerId, name: string) => {
    updateSettingsTeam((team) => ({
      ...team,
      players: team.players.map((player) => player.id === playerId
        ? { ...player, name: name.slice(0, NAME_MAX_LENGTH) }
        : player),
    }));
  };

  const openExercises = () => {
    window.history.replaceState(null, "", "#harjoitteet");
    setActiveFeature("exercises");
  };

  const closeExercises = () => {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    setActiveFeature("matches");
  };

  if (!homeTeam) {
    return <Onboarding teamName={onboardingTeamName} onTeamNameChange={setOnboardingTeamName} onCreateTeam={createFirstTeam} />;
  }

  if (activeFeature === "exercises") {
    return (
      <Suspense fallback={<main className="exercise-loading">Avataan harjoituseditoria…</main>}>
        <ExercisePlanner
          team={homeTeam}
          theme={theme}
          onBack={closeExercises}
          onToggleTheme={() => setTheme((current) => current === "dark" ? "light" : "dark")}
        />
      </Suspense>
    );
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
        onOpenTeams={openTeamSettings}
        onOpenGames={() => setGamesOpen(true)}
        onOpenSettings={() => { setAppSettingsReturnToTeams(false); setAppSettingsOpen(true); }}
        onOpenExercises={openExercises}
      />

      {!matchCreated ? (
        <PregameView
          hasPlayers={roster.length > 0}
          teamName={homeTeam.name}
          onNewMatch={openNewMatch}
          onOpenSettings={openTeamSettings}
          scheduledMatches={scheduledMatches}
          teams={teams}
          onOpenScheduledMatch={openScheduledMatch}
          onDeleteScheduledMatch={(id) => setScheduledMatches((current) => current.filter((item) => item.id !== id))}
        />
      ) : (
        <MatchWorkspace
          bench={bench}
          lineup={lineup}
          formations={teamFormations.filter((item) => item.slots.length === slots.length)}
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
          canResetClock={matchCreated && !matchEnded && !running && seconds > 0}
          onRequestResetClock={() => setResetClockOpen(true)}
        />
      )}

      <MobileNav
        onNewMatch={openNewMatch}
        onOpenTeams={openTeamSettings}
        onOpenGames={() => setGamesOpen(true)}
      />

      {newMatchOpen && (
        <NewMatchDialog
          teams={teams}
          teamId={teamId}
          opponent={opponentDraft}
          venue={venueDraft}
          activePlayerIds={activePlayerDraft}
          roster={roster}
          formations={teamFormations}
          initialFormationId={formation}
          scheduledMatches={scheduledMatches}
          canStartNow={!matchCreated || matchEnded}
          onSelectTeam={activateTeam}
          onOpponentChange={setOpponentDraft}
          onVenueChange={setVenueDraft}
          onActivePlayerIdsChange={setActivePlayerDraft}
          onAddPlayers={openTeamSettings}
          onCreate={createMatch}
          onSchedule={scheduleMatch}
          onClose={() => setNewMatchOpen(false)}
        />
      )}

      {gamesOpen && (
        <GamesDialog
          matches={scheduledMatches}
          teams={teams}
          canOpen={!matchCreated || matchEnded}
          activeScheduledMatchId={activeScheduledMatchId}
          currentTeamId={teamId}
          canSaveMatch={matchCreated}
          historyNotice={historyNotice}
          formatTime={formatTime}
          onNewMatch={() => { setGamesOpen(false); openNewMatch(); }}
          onOpen={openScheduledMatch}
          onDelete={(id) => setScheduledMatches((current) => current.filter((item) => item.id !== id))}
          onSaveMatch={saveMatch}
          onExportMatch={exportMatch}
          onDeleteMatch={deleteMatch}
          onClose={() => setGamesOpen(false)}
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
          title="Nollataanko tämän pelin ajat?"
          description="Ottelun kello ja kaikkien pelaajien peliajat nollataan. Tulosta ja maaleja ei muuteta."
          confirmLabel="Nollaa ajat"
          cancelLabel="Peruuta"
          onConfirm={resetClock}
          onCancel={() => setResetClockOpen(false)}
        />
      )}

      {deleteTeamOpen && (
        <ConfirmDialog
          title={`Poistetaanko ${settingsTeam?.name || "joukkue"}?`}
          description="Joukkueen kaikki pelaajat, muodostelmat ja pelihistoria poistetaan tältä laitteelta. Tätä ei voi perua."
          confirmLabel="Poista joukkue pysyvästi"
          cancelLabel="Peruuta"
          onConfirm={deleteTeam}
          onCancel={() => setDeleteTeamOpen(false)}
        />
      )}

      {settingsOpen && settingsTeam && (
        <SettingsDialog
          teams={teams}
          teamId={settingsTeam.id}
          team={settingsTeam}
          roster={settingsRoster}
          formations={settingsFormations}
          teamNameDraft={teamNameDraft}
          newTeamName={newTeamName}
          newPlayerName={newPlayerName}
          newFormationName={newFormationName}
          newFormationTeamSize={newFormationTeamSize}
          onClose={() => setSettingsOpen(false)}
          onOpenAppSettings={() => { setSettingsOpen(false); setAppSettingsReturnToTeams(true); setAppSettingsOpen(true); }}
          onActivateTeam={selectSettingsTeam}
          onTeamNameDraftChange={setTeamNameDraft}
          onNewTeamNameChange={setNewTeamName}
          onNewPlayerNameChange={setNewPlayerName}
          onNewFormationNameChange={setNewFormationName}
          onNewFormationTeamSizeChange={setNewFormationTeamSize}
          onAddTeam={addTeam}
          onSaveTeamName={saveTeamName}
          onRequestDeleteTeam={() => setDeleteTeamOpen(true)}
          onUpdatePlayerNumber={updatePlayerNumber}
          onUpdatePlayerName={updatePlayerName}
          onRemovePlayer={removePlayer}
          onAddPlayer={addPlayer}
          onRemoveFormation={removeFormation}
          onAddFormation={addFormation}
        />
      )}
      {appSettingsOpen && (
        <AppSettingsDialog
          theme={theme}
          closeLabel={appSettingsReturnToTeams ? "Takaisin" : "Sulje"}
          onThemeChange={setTheme}
          onClose={() => {
            setAppSettingsOpen(false);
            if (appSettingsReturnToTeams) setSettingsOpen(true);
            setAppSettingsReturnToTeams(false);
          }}
        />
      )}
    </main>
  );
}
