import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { buildMatchXlsx } from "./export.js";
import { createFormation, reorderLineup } from "./formation.js";
import { cleanName, FORMATION_MAX_LENGTH, MAX_FORMATIONS_PER_TEAM_SIZE, NAME_MAX_LENGTH } from "./storage.js";
import type { ActiveMatch, Formation, MatchRecord, PlayerId, ScheduledMatch, Score, Sport, Team, TeamSize, Venue } from "./types";
import { MatchHeader } from "./components/MatchHeader";
import { MobileNav } from "./components/MobileNav";
import { Onboarding } from "./components/Onboarding";
import { PlayerOnboarding } from "./components/PlayerOnboarding";
import { PregameView } from "./components/PregameView";
import { MatchWorkspace } from "./features/match/MatchWorkspace";
import { NewMatchDialog } from "./features/match/NewMatchDialog";
import { GamesDialog } from "./features/match/GamesDialog";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { matchRepository } from "./data/matchRepository";
import { SettingsDialog } from "./features/teams/SettingsDialog";
import { AppSettingsDialog } from "./features/settings/AppSettingsDialog";
import { AnalyticsView } from "./features/match/AnalyticsView";
import { restoreExerciseBackup } from "./features/exercises/exerciseStorage";
import { applyBatchSubstitution, changePlayerGoal } from "./features/match/matchLogic";
import { isScheduledMatchVisible, scheduledStartError } from "./features/match/scheduledDate";
import { analytics } from "./analytics";
import type { PeluutinBackup } from "./data/backup";

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
const initialSport: Sport = localStorage.getItem("peluutin-sport") === "futsal" ? "futsal" : "football";
const initialActiveMatch = matchRepository.loadActiveMatch(initialSport, initialTeams.filter((team) => team.sport === initialSport).map((team) => team.id));
const initialScheduledMatches = matchRepository.loadScheduledMatches();
const initialTeam = initialTeams.find((team) => team.sport === initialSport && team.id === initialActiveMatch?.teamId)
  || initialTeams.find((team) => team.sport === initialSport)
  || null;
const restoredMatch = initialActiveMatch?.teamId === initialTeam?.id ? initialActiveMatch : null;

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export function App() {
  const [activeFeature, setActiveFeature] = useState<"matches" | "exercises">(() => window.location.hash === "#harjoitteet" || window.location.hash.startsWith("#harjoite=") ? "exercises" : "matches");
  const [theme, setTheme] = useState<"light" | "dark">(() => localStorage.getItem("peluutin-theme") === "dark" ? "dark" : "light");
  const [teams, setTeams] = useState(initialTeams);
  const [sport, setSport] = useState<Sport>(initialSport);
  const [teamId, setTeamId] = useState(initialTeam?.id || "");
  const [historyTeamId, setHistoryTeamId] = useState(initialTeam?.id || "");
  const [onboardingTeamName, setOnboardingTeamName] = useState("");
  const [onboardingPlayerTeamId, setOnboardingPlayerTeamId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [appSettingsReturnToTeams, setAppSettingsReturnToTeams] = useState(false);
  const [settingsTeamId, setSettingsTeamId] = useState(initialTeam?.id || "");
  const [newMatchOpen, setNewMatchOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
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
  const [selectedBenchIds, setSelectedBenchIds] = useState<PlayerId[]>([]);
  const [selectedFieldIndexes, setSelectedFieldIndexes] = useState<number[]>([]);
  const [seconds, setSeconds] = useState(restoredMatch?.seconds || 0);
  const [running, setRunning] = useState(restoredMatch?.clockRunning === true);
  const [startedAt, setStartedAt] = useState(restoredMatch?.startedAt);
  const [score, setScore] = useState<Score>(restoredMatch?.score || [0, 0]);
  const [minutes, setMinutes] = useState(restoredMatch?.minutes || Object.fromEntries((initialTeam?.players || []).map((p) => [p.id, 0])));
  const [goals, setGoals] = useState(restoredMatch?.goals || {});
  const [scheduledMatches, setScheduledMatches] = useState<ScheduledMatch[]>(initialScheduledMatches);
  const [activeScheduledMatchId, setActiveScheduledMatchId] = useState(restoredMatch?.scheduledMatchId);
  const sportTeams = teams.filter((team) => team.sport === sport);
  const visibleScheduledMatches = scheduledMatches.filter((match) => teams.find((team) => team.id === match.teamId)?.sport === sport)
    .filter((match) => isScheduledMatchVisible(match, activeScheduledMatchId));

  const homeTeam = teams.find((team) => team.id === teamId && team.sport === sport) || null;
  const settingsTeam = teams.find((team) => team.id === settingsTeamId && team.sport === sport) || homeTeam;
  const onboardingPlayerTeam = teams.find((team) => team.id === onboardingPlayerTeamId) || null;
  const roster = homeTeam?.players || [];
  const settingsRoster = settingsTeam?.players || [];
  const byId = useMemo(() => Object.fromEntries(roster.map((p) => [p.id, p])), [roster]);
  const activeRoster = roster.filter((player) => activePlayerIds.includes(player.id));
  const bench = activeRoster.filter((p) => !lineup.includes(p.id));
  const sportFormations = (homeTeam?.formations || defaultFormations).filter((item) => sport === "football" || item.teamSize === 5);
  const teamFormations = sportFormations.map((item) => ({
    ...item,
    slots: createFormation(item.name, item.teamSize) || item.slots,
  }));
  const settingsFormations = (settingsTeam?.formations || defaultFormations).filter((item) => sport === "football" || item.teamSize === 5).map((item) => ({
    ...item,
    slots: createFormation(item.name, item.teamSize) || item.slots,
  }));
  const activeFormation = teamFormations.find((item) => item.id === formation) || teamFormations[0];
  const slots = activeFormation?.slots || defaultFormations[0].slots;
  const selectedPlayers = selectedBenchIds.length
    ? selectedBenchIds.map((id) => byId[id]).filter(Boolean)
    : selectedFieldIndexes.map((index) => byId[lineup[index]]).filter(Boolean);
  const averageSeconds = activeRoster.length
    ? activeRoster.reduce((total, player) => total + (minutes[player.id] || 0), 0) / activeRoster.length
    : 0;
  const matchHasActivity = seconds > 0 || score.some((value) => value > 0) || Object.values(goals).some((value) => value > 0);

  const clearPlayerSelection = () => {
    setSelectedBenchIds([]);
    setSelectedFieldIndexes([]);
  };

  useEffect(() => {
    localStorage.setItem("peluutin-sport", sport);
  }, [sport]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("peluutin-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.title = `Peluutin – ${activeFeature === "exercises" ? "Harjoitteet" : "Ottelut"}`;
  }, [activeFeature]);

  useEffect(() => {
    const syncFeatureFromHash = () => setActiveFeature(window.location.hash === "#harjoitteet" || window.location.hash.startsWith("#harjoite=") ? "exercises" : "matches");
    window.addEventListener("hashchange", syncFeatureFromHash);
    return () => window.removeEventListener("hashchange", syncFeatureFromHash);
  }, []);

  useEffect(() => {
    matchRepository.saveTeams(teams);
  }, [teams]);

  useEffect(() => {
    if (historyTeamId && teams.some((team) => team.id === historyTeamId)) return;
    setHistoryTeamId(teamId || teams[0]?.id || "");
  }, [historyTeamId, teamId, teams]);

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
      matchRepository.saveActiveMatch(null, sport);
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
      clockRunning: running,
      startedAt,
    }, sport);
  }, [matchCreated, matchEnded, activeScheduledMatchId, homeTeam, opponent, venue, activePlayerIds, formation, lineup, seconds, score, minutes, goals, running, startedAt, sport]);

  useEffect(() => {
    const modalOpen = settingsOpen || appSettingsOpen || newMatchOpen || gamesOpen || analyticsOpen || endMatchOpen || discardMatchOpen || resetClockOpen || deleteTeamOpen;
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [settingsOpen, appSettingsOpen, newMatchOpen, gamesOpen, analyticsOpen, endMatchOpen, discardMatchOpen, resetClockOpen, deleteTeamOpen]);

  useEffect(() => {
    if (!running || !startedAt) return;
    const syncClock = () => {
      const nextSeconds = Math.max(seconds, Math.floor((Date.now() - startedAt) / 1000));
      const delta = nextSeconds - seconds;
      if (delta <= 0) return;
      setSeconds(nextSeconds);
      setMinutes((current) => {
        const next = { ...current };
        lineup.filter(Boolean).forEach((id) => { next[id] = (next[id] || 0) + delta; });
        return next;
      });
    };
    const timer = setInterval(syncClock, 1000);
    document.addEventListener("visibilitychange", syncClock);
    window.addEventListener("focus", syncClock);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", syncClock); window.removeEventListener("focus", syncClock); };
  }, [running, startedAt, seconds, lineup]);

  const activateTeam = (nextTeam: Team) => {
    const nextFormation = (nextTeam.formations || defaultFormations)[0];
    setTeamId(nextTeam.id);
    setHistoryTeamId(nextTeam.id);
    setTeamNameDraft(nextTeam.name);
    setFormation(nextFormation.id);
    setLineup(nextTeam.players.slice(0, nextFormation.slots.length).map((player) => player.id));
    setActivePlayerIds(nextTeam.players.map((player) => player.id));
    setActivePlayerDraft(nextTeam.players.map((player) => player.id));
    setMinutes(Object.fromEntries(nextTeam.players.map((player) => [player.id, 0])));
    setGoals({});
    clearPlayerSelection();
    setSeconds(0);
    setScore([0, 0]);
    setRunning(false);
    setMatchEnded(false);
    setMatchCreated(false);
    setActiveScheduledMatchId(undefined);
  };

  const changeSport = (nextSport: Sport) => {
    if (nextSport === sport) return;
    const nextTeam = teams.find((team) => team.sport === nextSport) || null;
    const nextMatch = nextTeam ? matchRepository.loadActiveMatch(nextSport, [nextTeam.id]) : null;
    const nextFormation = nextTeam?.formations?.find((item) => item.id === nextMatch?.formation) || nextTeam?.formations?.[0];
    const nextLineup = nextMatch?.lineup || nextTeam?.players.slice(0, nextFormation?.slots.length || 8).map((player) => player.id) || [];
    setSport(nextSport);
    setTeamId(nextTeam?.id || "");
    setSettingsTeamId(nextTeam?.id || "");
    setHistoryTeamId(nextTeam?.id || "");
    setOpponent(nextMatch?.opponent || "");
    setVenue(nextMatch?.venue || "home");
    setActivePlayerIds(nextMatch?.activePlayerIds || nextTeam?.players.map((player) => player.id) || []);
    setFormation(nextMatch?.formation || nextFormation?.id || defaultFormations[0].id);
    setLineup(nextLineup);
    setSeconds(nextMatch?.seconds || 0);
    setScore(nextMatch?.score || [0, 0]);
    setMinutes(nextMatch?.minutes || Object.fromEntries((nextTeam?.players || []).map((player) => [player.id, 0])));
    setGoals(nextMatch?.goals || {});
    setMatchCreated(Boolean(nextMatch));
    setMatchEnded(false);
    setRunning(nextMatch?.clockRunning === true);
    setStartedAt(nextMatch?.startedAt);
    clearPlayerSelection();
    setActiveScheduledMatchId(nextMatch?.scheduledMatchId);
  };

  const openTeamSettings = () => {
    const nextTeam = teams.find((item) => item.id === settingsTeamId) || homeTeam;
    if (!nextTeam) return;
    setSettingsTeamId(nextTeam.id);
    setTeamNameDraft(nextTeam.name);
    setNewFormationTeamSize(nextTeam.sport === "futsal" ? 5 : nextTeam.formations?.[0]?.teamSize || activeFormation?.teamSize || 8);
    setSettingsOpen(true);
  };

  const selectSettingsTeam = (nextTeam: Team) => {
    if (nextTeam.sport !== sport) return;
    setSettingsTeamId(nextTeam.id);
    setTeamNameDraft(nextTeam.name);
    setNewFormationTeamSize(nextTeam.sport === "futsal" ? 5 : nextTeam.formations?.[0]?.teamSize || 8);
  };

  const selectBench = (playerId: PlayerId) => {
    if (!bench.some((player) => player.id === playerId)) return;
    if (selectedFieldIndexes.length) {
      const nextBenchIds = selectedBenchIds.includes(playerId)
        ? selectedBenchIds.filter((id) => id !== playerId)
        : selectedBenchIds.length < selectedFieldIndexes.length ? [...selectedBenchIds, playerId] : selectedBenchIds;
      if (nextBenchIds.length === selectedFieldIndexes.length) {
        setLineup((current) => applyBatchSubstitution(current, nextBenchIds, selectedFieldIndexes));
        clearPlayerSelection();
      } else setSelectedBenchIds(nextBenchIds);
      return;
    }
    setSelectedBenchIds((current) => current.includes(playerId)
      ? current.filter((id) => id !== playerId)
      : current.length < 5 ? [...current, playerId] : current);
  };

  const selectFieldUnit = (fieldUnitId: string) => {
    const unit = homeTeam?.fieldUnits.find((item) => item.id === fieldUnitId);
    if (!unit) return;
    const benchPlayerIds = new Set(bench.map((player) => player.id));
    const availableIds = unit.playerIds.filter((id) => benchPlayerIds.has(id)).slice(0, 5);
    if (!availableIds.length) return;
    setSelectedBenchIds(availableIds);
    setSelectedFieldIndexes([]);
  };

  const selectField = (index: number) => {
    if (!byId[lineup[index]]) return;
    if (!selectedBenchIds.length && selectedFieldIndexes.length === 1 && selectedFieldIndexes[0] !== index) {
      setLineup((current) => {
        const next = [...current];
        [next[selectedFieldIndexes[0]], next[index]] = [next[index], next[selectedFieldIndexes[0]]];
        return next;
      });
      clearPlayerSelection();
      return;
    }
    const nextIndexes = selectedFieldIndexes.includes(index)
      ? selectedFieldIndexes.filter((item) => item !== index)
      : selectedFieldIndexes.length < (selectedBenchIds.length || 5) ? [...selectedFieldIndexes, index] : selectedFieldIndexes;

    if (selectedBenchIds.length && nextIndexes.length === selectedBenchIds.length) {
      setLineup((current) => applyBatchSubstitution(current, selectedBenchIds, nextIndexes));
      clearPlayerSelection();
      return;
    }
    setSelectedFieldIndexes(nextIndexes);
  };

  const changeFormation = (nextFormation: string) => {
    if (nextFormation === formation) return;
    const next = teamFormations.find((item) => item.id === nextFormation);
    if (!next) return;
    setLineup((current) => reorderLineup(current, slots, next.slots));
    setFormation(nextFormation);
    clearPlayerSelection();
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
    const team: Team = { id: `team-${Date.now()}`, name, sport, players: [], formations: defaultFormations, fieldUnits: [], history: [] };
    setTeams((current) => [...current, team]);
    setNewTeamName("");
    setSettingsTeamId(team.id);
    setTeamNameDraft(team.name);
    setNewFormationTeamSize(team.formations[0]?.teamSize || 8);
    analytics.track("team_created", { source: "settings" });
  };

  const createFirstTeam = () => {
    const name = cleanName(onboardingTeamName);
    if (!name) return;
    const team: Team = { id: `team-${Date.now()}`, name, sport, players: [], formations: defaultFormations, fieldUnits: [], history: [] };
    setTeams((current) => [...current, team]);
    setOnboardingTeamName("");
    activateTeam(team);
    setSettingsTeamId(team.id);
    setOnboardingPlayerTeamId(team.id);
    analytics.track("team_created", { source: "onboarding" });
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
      clearPlayerSelection();
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
    updateSettingsTeam((team) => ({
      ...team,
      players: remaining,
      fieldUnits: team.fieldUnits
        .map((unit) => ({ ...unit, playerIds: unit.playerIds.filter((id) => id !== playerId) }))
        .filter((unit) => unit.playerIds.length),
    }));
    if (settingsTeamId !== teamId) return;
    setLineup((current) => {
      const next = current.filter((id) => id !== playerId);
      remaining.forEach((player) => {
        if (next.length < slots.length && !next.includes(player.id)) next.push(player.id);
      });
      return next;
    });
    clearPlayerSelection();
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

  const addFieldUnit = (name: string, playerIds: PlayerId[]) => {
    const normalizedName = cleanName(name);
    if (!normalizedName || settingsTeam?.sport !== "futsal") return;
    updateSettingsTeam((team) => {
      const validPlayerIds = [...new Set(playerIds.filter((id) => team.players.some((player) => player.id === id)))].slice(0, 5);
      if (!validPlayerIds.length || team.fieldUnits.some((unit) => unit.name.toLocaleLowerCase("fi") === normalizedName.toLocaleLowerCase("fi"))) return team;
      return { ...team, fieldUnits: [...team.fieldUnits, { id: `unit-${Date.now()}`, name: normalizedName, playerIds: validPlayerIds }] };
    });
  };

  const removeFieldUnit = (fieldUnitId: string) => {
    updateSettingsTeam((team) => ({ ...team, fieldUnits: team.fieldUnits.filter((unit) => unit.id !== fieldUnitId) }));
  };

  const updateFieldUnit = (fieldUnitId: string, name: string, playerIds: PlayerId[]) => {
    const normalizedName = cleanName(name);
    if (!normalizedName || settingsTeam?.sport !== "futsal") return;
    updateSettingsTeam((team) => {
      const validPlayerIds = [...new Set(playerIds.filter((id) => team.players.some((player) => player.id === id)))].slice(0, 5);
      if (!validPlayerIds.length || team.fieldUnits.some((unit) => unit.id !== fieldUnitId && unit.name.toLocaleLowerCase("fi") === normalizedName.toLocaleLowerCase("fi"))) return team;
      return { ...team, fieldUnits: team.fieldUnits.map((unit) => unit.id === fieldUnitId ? { ...unit, name: normalizedName, playerIds: validPlayerIds } : unit) };
    });
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

  const activeMatchSnapshot: ActiveMatch | null = matchCreated && !matchEnded && homeTeam ? {
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
  } : null;

  const restoreBackup = (backup: PeluutinBackup) => {
    setTeams(backup.teams);
    setScheduledMatches(backup.scheduledMatches);
    restoreExerciseBackup(backup.exercises);
    const restored = backup.activeMatch;
    const nextTeam = backup.teams.find((team) => team.id === restored?.teamId) || backup.teams[0];
    if (!nextTeam) return;

    setTeamId(nextTeam.id);
    setHistoryTeamId(nextTeam.id);
    setSettingsTeamId(nextTeam.id);
    setTeamNameDraft(nextTeam.name);
    const nextFormation = nextTeam.formations?.find((item) => item.id === restored?.formation) || nextTeam.formations?.[0];
    setFormation(nextFormation?.id || restored?.formation || defaultFormations[0].id);
    setActivePlayerIds(restored?.teamId === nextTeam.id ? restored.activePlayerIds : nextTeam.players.map((player) => player.id));
    setActivePlayerDraft(nextTeam.players.map((player) => player.id));
    setLineup(restored?.teamId === nextTeam.id ? restored.lineup : nextTeam.players.slice(0, nextFormation?.slots.length || 8).map((player) => player.id));
    setOpponent(restored?.teamId === nextTeam.id ? restored.opponent : "");
    setVenue(restored?.teamId === nextTeam.id ? restored.venue : "home");
    setSeconds(restored?.teamId === nextTeam.id ? restored.seconds : 0);
    setScore(restored?.teamId === nextTeam.id ? restored.score : [0, 0]);
    setMinutes(restored?.teamId === nextTeam.id ? restored.minutes : Object.fromEntries(nextTeam.players.map((player) => [player.id, 0])));
    setGoals(restored?.teamId === nextTeam.id ? restored.goals : {});
    setActiveScheduledMatchId(restored?.teamId === nextTeam.id ? restored.scheduledMatchId : undefined);
    setMatchCreated(Boolean(restored?.teamId === nextTeam.id));
    setMatchEnded(false);
    setRunning(false);
    setStartedAt(undefined);
    clearPlayerSelection();
  };

  const saveMatch = () => {
    if (!matchHasActivity) return;
    const match = currentMatchData();
    updateCurrentTeam((team) => ({ ...team, history: [match, ...(team.history || [])] }));
    setHistoryNotice("Peli tallennettu historiaan.");
  };

  const endMatch = () => {
    if (!matchHasActivity) {
      discardMatch();
      return;
    }
    setRunning(false);
    setStartedAt(undefined);
    saveMatch();
    setMatchEnded(true);
    if (activeScheduledMatchId) setScheduledMatches((current) => current.filter((item) => item.id !== activeScheduledMatchId));
    setActiveScheduledMatchId(undefined);
    setEndMatchOpen(false);
    analytics.matchCompleted(true, seconds);
  };

  const discardMatch = () => {
    setRunning(false);
    setMatchEnded(true);
    setActiveScheduledMatchId(undefined);
    setEndMatchOpen(false);
    setDiscardMatchOpen(false);
    setHistoryNotice(matchHasActivity ? "Peli lopetettiin tallentamatta." : "Käynnistämätön peli poistettiin.");
    analytics.matchCompleted(false, seconds);
  };

  const resetClock = () => {
    setSeconds(0);
    setMinutes(Object.fromEntries(roster.map((player) => [player.id, 0])));
    setRunning(false);
    setStartedAt(undefined);
    setResetClockOpen(false);
  };

  const deleteMatch = (historyTeamId: string, matchId: string) => {
    setTeams((current) => current.map((team) => team.id === historyTeamId
      ? { ...team, history: (team.history || []).filter((match) => match.id !== matchId) }
      : team));
    setHistoryNotice("Peli poistettu historiasta.");
  };

  const exportMatch = async (match: MatchRecord, teamName = homeTeam?.name || "Joukkue") => {
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
    if (matchCreated && !matchEnded && !matchHasActivity) {
      setMatchCreated(false);
      setMatchEnded(false);
      setRunning(false);
      setStartedAt(undefined);
    }
    setOpponentDraft(opponent);
    setVenueDraft(venue);
    setActivePlayerDraft(roster.map((player) => player.id));
    setNewMatchOpen(true);
  };

  const changeGoal = (playerId: PlayerId, amount: 1 | -1) => {
    const result = changePlayerGoal(goals, score, playerId, venue === "home" ? 0 : 1, amount);
    setGoals(result.goals);
    setScore(result.score);
  };

  const createMatch = (formationId: string, startingLineup: PlayerId[]) => {
    const nextOpponent = cleanName(opponentDraft);
    if (!nextOpponent || (matchCreated && !matchEnded && matchHasActivity)) return;
    setOpponent(nextOpponent);
    setVenue(venueDraft);
    setActivePlayerIds(activePlayerDraft);
    setFormation(formationId);
    setLineup(startingLineup);
    setSeconds(0);
    setScore([0, 0]);
    setMinutes(Object.fromEntries(roster.map((player) => [player.id, 0])));
    setGoals({});
    clearPlayerSelection();
    setRunning(false);
    setStartedAt(undefined);
    setMatchEnded(false);
    setMatchCreated(true);
    setActiveScheduledMatchId(undefined);
    setHistoryNotice("");
    setNewMatchOpen(false);
    analytics.track("match_created", { source: "new" });
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
    setHistoryTeamId(team.id);
    setOpponent(scheduled.opponent);
    setVenue(scheduled.venue);
    setActivePlayerIds(nextActive);
    setFormation(teamFormation.id);
    setLineup(nextLineup.slice(0, teamFormation.slots.length));
    setSeconds(0);
    setScore([0, 0]);
    setMinutes(Object.fromEntries(team.players.map((player) => [player.id, 0])));
    setGoals({});
    clearPlayerSelection();
    setRunning(false);
    setMatchEnded(false);
    setMatchCreated(true);
    setActiveScheduledMatchId(scheduled.id);
    setGamesOpen(false);
    analytics.track("match_created", { source: "scheduled" });
  };

  const homeName = venue === "home" ? homeTeam?.name : opponent;
  const awayName = venue === "home" ? opponent : homeTeam?.name;
  const changeScore = (index: 0 | 1, amount: number) => setScore((current) => {
    const next: Score = [...current];
    next[index] = Math.max(0, next[index] + amount);
    return next;
  });
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
    analytics.track("feature_opened", { module: "exercises" });
  };

  const closeExercises = () => {
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    setActiveFeature("matches");
    analytics.track("feature_opened", { module: "matches" });
  };

  const sharedExercise = window.location.hash.startsWith("#harjoite=");

  if (!homeTeam && !sharedExercise) {
    return <Onboarding teamName={onboardingTeamName} onTeamNameChange={setOnboardingTeamName} onCreateTeam={createFirstTeam} sport={sport} onSportChange={changeSport} />;
  }

  if (onboardingPlayerTeam) {
    return (
      <PlayerOnboarding
        teamName={onboardingPlayerTeam.name}
        players={onboardingPlayerTeam.players}
        playerName={newPlayerName}
        onPlayerNameChange={setNewPlayerName}
        onAddPlayer={addPlayer}
        onRemovePlayer={removePlayer}
        sport={onboardingPlayerTeam.sport}
        fieldUnits={onboardingPlayerTeam.fieldUnits}
        onAddFieldUnit={addFieldUnit}
        onUpdateFieldUnit={updateFieldUnit}
        onRemoveFieldUnit={removeFieldUnit}
        onContinue={() => {
          setNewPlayerName("");
          setOnboardingPlayerTeamId(null);
        }}
      />
    );
  }

  if (activeFeature === "exercises") {
    return (
      <Suspense fallback={<main className="exercise-loading">Avataan harjoituseditoria…</main>}>
        <ExercisePlanner
          team={homeTeam || { id: "shared", name: "Jaettu harjoite", sport: "football", players: [], formations: [], fieldUnits: [], history: [] }}
          shared={sharedExercise}
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
        onToggleClock={() => setRunning((current) => {
          const next = !current;
          setStartedAt(next ? Date.now() - seconds * 1000 : undefined);
          return next;
        })}
        onEndMatch={() => setEndMatchOpen(true)}
        onNewMatch={openNewMatch}
        onOpenTeams={openTeamSettings}
        onOpenGames={() => setGamesOpen(true)}
        onOpenSettings={() => { setAppSettingsReturnToTeams(false); setAppSettingsOpen(true); }}
        onOpenExercises={openExercises}
        sport={sport}
        onSportChange={changeSport}
      />

      {!matchCreated ? (
        <PregameView
          hasPlayers={roster.length > 0}
          teamName={homeTeam?.name || "Joukkue"}
          onNewMatch={openNewMatch}
          onOpenSettings={openTeamSettings}
          scheduledMatches={visibleScheduledMatches}
          teams={sportTeams}
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
          fieldUnits={homeTeam?.fieldUnits || []}
          selectedBenchIds={selectedBenchIds}
          selectedFieldIndexes={selectedFieldIndexes}
          selectedPlayers={selectedPlayers}
          minutes={minutes}
          averageSeconds={averageSeconds}
          formatTime={formatTime}
          goals={goals}
          onChangeGoal={changeGoal}
          onSelectBench={selectBench}
          onSelectField={selectField}
          onSelectFieldUnit={selectFieldUnit}
          onClearSelection={clearPlayerSelection}
          onChangeFormation={changeFormation}
          canResetClock={matchCreated && !matchEnded && !running && seconds > 0}
          onRequestResetClock={() => setResetClockOpen(true)}
          sport={sport}
        />
      )}

      <MobileNav
        onNewMatch={openNewMatch}
        onOpenTeams={openTeamSettings}
        onOpenGames={() => setGamesOpen(true)}
      />

      {newMatchOpen && (
        <NewMatchDialog
          teams={sportTeams}
          teamId={teamId}
          opponent={opponentDraft}
          venue={venueDraft}
          activePlayerIds={activePlayerDraft}
          roster={roster}
          formations={teamFormations}
          initialFormationId={formation}
          scheduledMatches={scheduledMatches}
          canStartNow={!matchCreated || matchEnded || !matchHasActivity}
          onSelectTeam={activateTeam}
          onOpponentChange={setOpponentDraft}
          onVenueChange={setVenueDraft}
          onActivePlayerIdsChange={setActivePlayerDraft}
          onAddPlayers={openTeamSettings}
          onCreate={createMatch}
          onSchedule={scheduleMatch}
          onClose={() => setNewMatchOpen(false)}
          sport={sport}
        />
      )}

      {gamesOpen && (
        <GamesDialog
          matches={visibleScheduledMatches}
          teams={sportTeams}
          canOpen={!matchCreated || matchEnded}
          activeScheduledMatchId={activeScheduledMatchId}
          currentTeamId={teamId}
          historyTeamId={historyTeamId}
          canSaveMatch={matchCreated && matchHasActivity}
          historyNotice={historyNotice}
          formatTime={formatTime}
          onNewMatch={() => { setGamesOpen(false); openNewMatch(); }}
          onHistoryTeamChange={setHistoryTeamId}
          onOpenAnalytics={() => { setGamesOpen(false); setAnalyticsOpen(true); }}
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
          title={matchHasActivity ? "Lopetetaanko peli?" : "Poistetaanko käynnistämätön peli?"}
          description={matchHasActivity ? `Peli päättyy aikaan ${formatTime(seconds)} ja tallennetaan pelihistoriaan. Sitä ei voi enää jatkaa.` : "Kelloa ei ole käynnistetty, joten peliä ei tallenneta historiaan."}
          confirmLabel={matchHasActivity ? "Lopeta ja tallenna" : "Poista peli"}
          cancelLabel="Jatka peliä"
          secondaryActionLabel={matchHasActivity ? "Lopeta tallentamatta" : undefined}
          onConfirm={endMatch}
          onCancel={() => setEndMatchOpen(false)}
          onSecondaryAction={() => {
            setEndMatchOpen(false);
            setDiscardMatchOpen(true);
          }}
        />
      )}

      {analyticsOpen && (
        <AnalyticsView
          teams={teams}
          selectedTeamId={historyTeamId}
          onSelectedTeamChange={setHistoryTeamId}
          onClose={() => setAnalyticsOpen(false)}
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
          teams={sportTeams}
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
          onAddFieldUnit={addFieldUnit}
          onUpdateFieldUnit={updateFieldUnit}
          onRemoveFieldUnit={removeFieldUnit}
          sport={sport}
        />
      )}
      {appSettingsOpen && (
        <AppSettingsDialog
          theme={theme}
          teams={teams}
          scheduledMatches={scheduledMatches}
          activeMatch={activeMatchSnapshot}
          defaultFormations={defaultFormations}
          closeLabel={appSettingsReturnToTeams ? "Takaisin" : "Sulje"}
          onThemeChange={setTheme}
          onRestoreBackup={restoreBackup}
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
