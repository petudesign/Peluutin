import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookmarkPlus, Circle, CircleDot, CirclePlus, Copy, Crosshair, Download, Eraser, Eye, EyeOff, Footprints, FolderOpen, Goal, Link2, Maximize2, Minimize2, Moon, MousePointer2, PanelLeft, PanelRight, Pause, Pencil, PersonStanding, Play, Redo2, Route, Rows3, Scaling, Share2, Shapes, Slash, Spline, Square, StickyNote, Sun, TrafficCone, Trash2, Triangle, Type, UserRoundPlus, X } from "lucide-react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import type { Team } from "../../types";
import { ExerciseCanvas } from "./ExerciseCanvas";
import { EXERCISE_DRAFT_STORAGE_KEY, exerciseDraftContentKey, loadSavedExercises, saveSavedExercises, writeStoredExerciseDraft, type SavedExercise } from "./exerciseStorage";
import { downloadExerciseImage } from "./exerciseImageExport";
import { buildExerciseTimeline, canAddTeamPlayer, canPassBetween, canTargetExercisePath, createExerciseMarkerCopy, EXERCISE_MAX_DURATION_MS, EXERCISE_MIN_DURATION_MS, EXERCISE_NATURAL_SPEEDS, formatRouteCount, getExerciseMarkerColor, getExercisePathNaturalDurationMs, getNextExercisePathStartMs, isExerciseBallPath, isExercisePathValid, moveExerciseMarkerSelection, normalizeExercisePlayerRole, normalizeExerciseTimeline, resetExercisePathDuration, resizeExerciseDraftContent, setExercisePathDurationMs, setExercisePathStartMs, type ExerciseAnnotation, type ExerciseDraft, type ExerciseGoalSize, type ExerciseMarker, type ExercisePath, type ExercisePitchOrientation, type ExercisePitchPreset, type ExercisePitchStyle, type ExercisePlayerRole, type ExerciseTimelineEntry, type ExerciseTool, type ExerciseView } from "./exerciseTypes";

interface ExercisePlannerProps { team: Team; theme: "light" | "dark"; shared?: boolean; onBack: () => void; onToggleTheme: () => void; }
type ToolMenu = "player" | "element" | "pitch" | "route" | "shape" | null;

const TOOL_SIDE_KEY = "peluutin-exercise-tool-side";
const HIDE_NAMES_KEY = "peluutin-exercise-hide-names";
const DRAW_TOOLS: ExerciseTool[] = ["draw", "line", "rectangle", "circle"];
const DRAW_COLORS = ["#f6b323", "#f25f54", "#4c9ee8", "#45b77b", "#ffffff"];
const SHAPE_ITEMS: Array<{ tool: ExerciseTool; label: string; icon: typeof Pencil }> = [
  { tool: "draw", label: "Vapaa piirto", icon: Pencil },
  { tool: "line", label: "Suora viiva", icon: Slash },
  { tool: "rectangle", label: "Suorakulmio", icon: Square },
  { tool: "circle", label: "Ympyrä", icon: Circle },
];
const GOAL_SIZE_ITEMS: Array<{ value: ExerciseGoalSize; label: string; icon: typeof Goal }> = [
  { value: "small", label: "Pieni", icon: Minimize2 },
  { value: "youth", label: "Juniori", icon: Scaling },
  { value: "full", label: "Iso", icon: Maximize2 },
];

function BenchIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M3 8h18v4H3z" /><path d="M6 12v5m12-5v5M4 17h4m8 0h4" /></svg>;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function encodeExerciseShare(draft: ExerciseDraft) {
  const bytes = new TextEncoder().encode(JSON.stringify({ version: 1, draft }));
  return bytesToBase64Url(bytes);
}

async function encodeExerciseShareCompressed(draft: ExerciseDraft) {
  if (!("CompressionStream" in window)) return encodeExerciseShare(draft);
  const source = new TextEncoder().encode(JSON.stringify({ version: 1, draft }));
  const stream = new Blob([source]).stream().pipeThrough(new CompressionStream("gzip"));
  return `g.${bytesToBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()))}`;
}

async function decodeExerciseShare() {
  try {
    const encoded = window.location.hash.slice("#harjoite=".length), compressed = encoded.startsWith("g."), data = compressed ? encoded.slice(2) : encoded;
    if (!encoded || encoded.length > 100_000) return null;
    const padded = data.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(data.length / 4) * 4, "=");
    const binary = atob(padded), bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    if (compressed && "DecompressionStream" in window) {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
      const payload = await new Response(stream).json() as { version?: number; draft?: ExerciseDraft };
      return payload.version === 1 ? payload.draft || null : null;
    }
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as { version?: number; draft?: ExerciseDraft };
    const draft = payload.version === 1 ? payload.draft : null;
    if (!draft || !Array.isArray(draft.markers) || !Array.isArray(draft.paths) || !Array.isArray(draft.annotations) || draft.markers.length > 100 || draft.paths.length > 250 || draft.annotations.length > 250) return null;
    return draft;
  } catch { return null; }
}

function formatTimelineTime(milliseconds: number) {
  const totalTenths = Math.max(0, Math.round(milliseconds / 100));
  const minutes = Math.floor(totalTenths / 600), seconds = Math.floor(totalTenths / 10) % 60, tenths = totalTenths % 10;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")},${tenths}`;
}

function formatTimelineDuration(milliseconds: number) {
  const seconds = Math.max(0, milliseconds) / 1000;
  return `${seconds.toFixed(1).replace(".", ",")} s`;
}

function assignTimelineLanes(entries: ExerciseTimelineEntry[], paths: ExercisePath[]) {
  const lanes: ExerciseTimelineEntry[][] = [];
  [...entries].sort((a, b) => a.startMs - b.startMs).forEach(entry => {
    const savedLane = paths.find(path => path.id === entry.pathId)?.timelineLane;
    if (Number.isInteger(savedLane) && savedLane! >= 0) {
      while (lanes.length <= savedLane!) lanes.push([]);
      lanes[savedLane!].push(entry);
      return;
    }
    const lane = lanes.find(items => {
      const previous = items.at(-1);
      return !previous || previous.startMs + previous.durationMs <= entry.startMs;
    });
    (lane || (lanes.push([]), lanes.at(-1)!)).push(entry);
  });
  return lanes.length ? lanes : [[]];
}

function seedDraft(team: Team): ExerciseDraft {
  const names = team.players.map(player => ({ name: player.name, number: player.number }));
  const fallback = ["Aino", "Leo", "Sofia", "Miro", "Eeli", "Noel"];
  const spots: Array<[number, number]> = [[-3.6, 2.2], [-1.4, 1.2], [-3.2, -1.2], [2.8, 2], [1.3, .6], [3.3, -1.5]];
  const ownRoles: ExercisePlayerRole[] = ["defender", "midfielder", "attacker"];
  const markers: ExerciseMarker[] = spots.map(([x, z], index) => ({ id: `player-${index + 1}`, kind: "player", team: index < 3 ? "blue" : "red", role: index < 3 ? ownRoles[index] : "midfielder", name: names[index]?.name || fallback[index], number: names[index]?.number || index + 1, x, z }));
  return { name: "Syöttö ja liike", notes: "", exerciseTheme: "", coachingPoints: "", keyQuestions: "", markers, paths: [{ id: "path-1", kind: "pass", fromId: "player-2", toId: "player-3" }], annotations: [], goalSize: "youth", pitchPreset: "training", pitchOrientation: "landscape", pitchStyle: "grass", updatedAt: new Date().toISOString() };
}

function loadDraft(team: Team): ExerciseDraft {
  try {
    const stored = localStorage.getItem(`${EXERCISE_DRAFT_STORAGE_KEY}-${team.id}`);
    if (!stored) return seedDraft(team);
    const draft = JSON.parse(stored) as Partial<ExerciseDraft>;
    if (!Array.isArray(draft.markers) || !Array.isArray(draft.paths)) return seedDraft(team);
    const markers = draft.markers.map(marker => marker.kind === "player" ? { ...marker, role: normalizeExercisePlayerRole(marker.role) } : marker.kind === "goal" ? { ...marker, goalSize: (["small", "youth", "full"] as ExerciseGoalSize[]).includes(marker.goalSize as ExerciseGoalSize) ? marker.goalSize : "youth" } : marker);
    return {
      name: typeof draft.name === "string" ? draft.name : "Nimetön harjoite",
      notes: typeof draft.notes === "string" ? draft.notes : "",
      exerciseTheme: typeof draft.exerciseTheme === "string" ? draft.exerciseTheme : "",
      coachingPoints: typeof draft.coachingPoints === "string" ? draft.coachingPoints : "",
      keyQuestions: typeof draft.keyQuestions === "string" ? draft.keyQuestions : "",
      markers,
      paths: normalizeExerciseTimeline(draft.paths.filter(path => isExercisePathValid(path, markers)), markers),
      annotations: Array.isArray(draft.annotations) ? draft.annotations : [],
      goalSize: (["small", "youth", "full"] as ExerciseGoalSize[]).includes(draft.goalSize as ExerciseGoalSize) ? draft.goalSize as ExerciseGoalSize : "youth",
      pitchPreset: (["training", "full"] as ExercisePitchPreset[]).includes(draft.pitchPreset as ExercisePitchPreset) ? draft.pitchPreset as ExercisePitchPreset : "training",
      pitchOrientation: (["landscape", "portrait"] as ExercisePitchOrientation[]).includes(draft.pitchOrientation as ExercisePitchOrientation) ? draft.pitchOrientation as ExercisePitchOrientation : "landscape",
      pitchStyle: (["dark", "grass"] as ExercisePitchStyle[]).includes(draft.pitchStyle as ExercisePitchStyle) ? draft.pitchStyle as ExercisePitchStyle : "grass",
      updatedAt: typeof draft.updatedAt === "string" ? draft.updatedAt : new Date().toISOString(),
    };
  } catch {
    return seedDraft(team);
  }
}

export function ExercisePlanner({ team, theme, shared = false, onBack, onToggleTheme }: ExercisePlannerProps) {
  const [draft, setDraft] = useState(() => loadDraft(team));
  useEffect(() => { if (!shared) return; let active = true; decodeExerciseShare().then(sharedDraft => { if (active && sharedDraft) setDraft(sharedDraft); }); return () => { active = false; }; }, [shared, team]);
  const [view, setView] = useState<ExerciseView>(() => shared ? "2d" : "3d");
  const [tool, setTool] = useState<ExerciseTool>("select");
  const [openMenu, setOpenMenu] = useState<ToolMenu>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedId = selectedIds.at(-1) ?? null;
  const setSelectedId = useCallback((id: string | null) => setSelectedIds(id ? [id] : []), []);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [routesOpen, setRoutesOpen] = useState(false);
  const [hideNames, setHideNames] = useState(() => shared || localStorage.getItem(HIDE_NAMES_KEY) !== "false");
  const [playing, setPlaying] = useState(false);
  const [playbackStartedAt, setPlaybackStartedAt] = useState(0);
  const [playbackElapsedMs, setPlaybackElapsedMs] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const [shareLabel, setShareLabel] = useState("Kopioi jakolinkki");
  const [imageExportLabel, setImageExportLabel] = useState("Lataa kuvana (PNG)");
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [drawingId, setDrawingId] = useState<string | null>(null);
  const [ink, setInk] = useState("#f6b323");
  const [inkWidth, setInkWidth] = useState<1 | 2 | 3>(2);
  const [playerTeam, setPlayerTeam] = useState<"blue" | "red">("blue");
  const [playerColor, setPlayerColor] = useState(DRAW_COLORS[2]);
  const [pathError, setPathError] = useState("");
  const [toolSide, setToolSide] = useState<"left" | "right">(() => localStorage.getItem(TOOL_SIDE_KEY) === "left" ? "left" : "right");
  const history = useRef<ExerciseDraft[]>([]);
  const copiedMarker = useRef<ExerciseMarker | null>(null);
  const pasteCount = useRef(0);
  const historyOpen = useRef(false);
  const historyTimer = useRef<number | null>(null);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const [timelineDrag, setTimelineDrag] = useState<{ pathId: string; pointerX: number; pointerY: number; initialStartMs: number; initialLane: number } | null>(null);
  const [timelineTrim, setTimelineTrim] = useState<{ pathId: string; pointerX: number; initialDurationMs: number } | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [clearRoutesOpen, setClearRoutesOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [savedExercises, setSavedExercises] = useState<SavedExercise[]>(() => loadSavedExercises().filter(item => item.teamId === team.id));
  const [savedExerciseId, setSavedExerciseId] = useState<string | null>(() => savedExercises.find(item => exerciseDraftContentKey(item.draft) === exerciseDraftContentKey(draft))?.id || null);
  const isSavedVersion = savedExercises.some(item => exerciseDraftContentKey(item.draft) === exerciseDraftContentKey(draft));

  const selected = useMemo(() => selectedIds.length === 1 ? draft.markers.find(marker => marker.id === selectedId) || null : null, [draft.markers, selectedId, selectedIds.length]);
  const selectedAnnotation = useMemo(() => draft.annotations.find(annotation => annotation.id === selectedAnnotationId) || null, [draft.annotations, selectedAnnotationId]);
  const selectedPath = useMemo(() => draft.paths.find(path => path.id === selectedPathId) || null, [draft.paths, selectedPathId]);
  const teamLimit = !canAddTeamPlayer(draft.markers, playerTeam);
  const timeline = useMemo(() => buildExerciseTimeline(draft.paths, draft.markers), [draft.markers, draft.paths]);
  const timelineWindowMs = Math.max(6000, Math.ceil((timeline.totalMs + 1000) / 1000) * 1000);
  const timelineByPath = useMemo(() => new Map(timeline.entries.map(entry => [entry.pathId, entry])), [timeline.entries]);
  const timelineLanes = useMemo(() => assignTimelineLanes(timeline.entries, draft.paths), [draft.paths, timeline.entries]);

  const updateDraft = useCallback((updater: (current: ExerciseDraft) => ExerciseDraft) => {
    setDraft(current => {
      if (!historyOpen.current) {
        history.current.push(current);
        history.current = history.current.slice(-40);
        historyOpen.current = true;
      }
      if (historyTimer.current) window.clearTimeout(historyTimer.current);
      historyTimer.current = window.setTimeout(() => { historyOpen.current = false; }, 300);
      return updater(current);
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null); setSelectedAnnotationId(null); setSelectedPathId(null); setEditingTextId(null);
  }, []);

  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (!previous) return;
    historyOpen.current = false;
    if (historyTimer.current) window.clearTimeout(historyTimer.current);
    setDraft(previous); clearSelection();
  }, [clearSelection]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable='true']")) return;
      event.preventDefault(); undo();
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [undo]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase(), target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (key === "c") {
        const marker = draft.markers.find(item => item.id === selectedId);
        if (!marker) return;
        event.preventDefault();
        copiedMarker.current = { ...marker };
        pasteCount.current = 0;
        return;
      }
      if (key !== "v" || !copiedMarker.current) return;
      event.preventDefault();
      const source = copiedMarker.current, sequence = pasteCount.current + 1;
      const copy = createExerciseMarkerCopy(draft.markers, source, sequence, `${source.kind}-copy-${Date.now()}-${sequence}`);
      if (!copy) {
        setPathError("Joukkueen 11 pelaajan raja on täynnä");
        return;
      }
      pasteCount.current = sequence;
      updateDraft(current => ({ ...current, markers: [...current.markers, copy] }));
      setPathError(""); setSelectedAnnotationId(null); setSelectedPathId(null); setEditingTextId(null); setSelectedId(copy.id); setOpenMenu(null); setTool("select");
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [draft.markers, selectedId, updateDraft]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = (now - playbackStartedAt) * playbackSpeed;
      if (elapsed >= timeline.totalMs) {
        setPlaybackElapsedMs(timeline.totalMs);
        setPlaying(false);
        return;
      }
      setPlaybackElapsedMs(elapsed);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playbackSpeed, playbackStartedAt, playing, timeline.totalMs]);

  useEffect(() => {
    if (!timelineDrag) return;
    const move = (event: PointerEvent) => {
      const width = timelineTrackRef.current?.getBoundingClientRect().width;
      if (!width) return;
      const requested = timelineDrag.initialStartMs + (event.clientX - timelineDrag.pointerX) / width * timelineWindowMs;
      const lane = Math.max(0, Math.min(timelineLanes.length - 1, timelineDrag.initialLane + Math.round((event.clientY - timelineDrag.pointerY) / 42)));
      updateDraft(current => ({ ...current, paths: setExercisePathStartMs(current.paths, timelineDrag.pathId, requested, current.markers).map(path => path.id === timelineDrag.pathId ? { ...path, timelineLane: lane } : path) }));
      setPlaying(false);
      setPlaybackElapsedMs(0);
    };
    const up = () => setTimelineDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [timelineDrag, timelineLanes.length, timelineWindowMs, updateDraft]);

  useEffect(() => {
    if (!timelineTrim) return;
    const move = (event: PointerEvent) => {
      const width = timelineTrackRef.current?.getBoundingClientRect().width;
      if (!width) return;
      const requested = timelineTrim.initialDurationMs + (event.clientX - timelineTrim.pointerX) / width * timelineWindowMs;
      updateDraft(current => ({ ...current, paths: setExercisePathDurationMs(current.paths, timelineTrim.pathId, requested, current.markers) }));
      setPlaying(false);
    };
    const up = () => setTimelineTrim(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [timelineTrim, timelineWindowMs, updateDraft]);

  const seekTimeline = useCallback((clientX: number) => {
    const rect = timelineTrackRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    const requested = (clientX - rect.left) / rect.width * timelineWindowMs;
    setPlaybackElapsedMs(Math.min(timeline.totalMs, Math.max(0, requested)));
  }, [timeline.totalMs, timelineWindowMs]);

  useEffect(() => {
    if (!scrubbing) return;
    const move = (event: PointerEvent) => seekTimeline(event.clientX);
    const up = () => setScrubbing(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [scrubbing, seekTimeline]);

  useEffect(() => {
    setPlaybackElapsedMs(current => Math.min(current, timeline.totalMs));
  }, [timeline.totalMs]);

  useEffect(() => {
    setSavedExercises(loadSavedExercises().filter(item => item.teamId === team.id));
    setSavedExerciseId(null);
  }, [team.id]);

  useEffect(() => {
    if (shared) return;
    const timer = window.setTimeout(() => {
      writeStoredExerciseDraft(team.id, { ...draft, updatedAt: new Date().toISOString() });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft, shared, team.id]);

  const shareExercise = async () => {
    const url = `${window.location.origin}${window.location.pathname}#harjoite=${await encodeExerciseShareCompressed(draft)}`;
    await navigator.clipboard.writeText(url);
    setShareMenuOpen(false);
    setShareLabel("Linkki kopioitu");
    window.setTimeout(() => setShareLabel("Kopioi jakolinkki"), 1800);
  };

  const exportExerciseImage = async () => {
    try {
      clearSelection();
      setPlaying(false);
      setPlaybackElapsedMs(0);
      const pitchCanvas = document.querySelector<HTMLCanvasElement>(".exercise-stage .exercise-canvas canvas");
      if (!pitchCanvas) throw new Error("Kenttäkuvaa ei löytynyt.");
      setImageExportLabel("Luodaan kuvaa…");
      await downloadExerciseImage(draft, team.name, pitchCanvas);
      setImageExportLabel("Kuva ladattu");
      window.setTimeout(() => { setShareMenuOpen(false); setImageExportLabel("Lataa kuvana (PNG)"); }, 1200);
    } catch {
      setImageExportLabel("Kuvan luonti epäonnistui");
      window.setTimeout(() => setImageExportLabel("Lataa kuvana (PNG)"), 2400);
    }
  };

  const saveExercise = () => {
    const now = new Date().toISOString();
    const snapshot = { ...draft, updatedAt: now };
    const existing = savedExerciseId ? savedExercises.find(item => item.id === savedExerciseId) : undefined;
    const entry: SavedExercise = existing
      ? { ...existing, name: snapshot.name, draft: snapshot, updatedAt: now }
      : { id: `exercise-${Date.now()}`, teamId: team.id, name: snapshot.name, draft: snapshot, createdAt: now, updatedAt: now };
    const next = existing ? savedExercises.map(item => item.id === entry.id ? entry : item) : [entry, ...savedExercises];
    saveSavedExercises(next);
    setSavedExercises(next);
    setSavedExerciseId(entry.id);
    setDraft(snapshot);
  };

  const openSavedExercise = (item: SavedExercise) => {
    setDraft(item.draft);
    setSavedExerciseId(item.id);
    setLibraryOpen(false);
    clearSelection();
    setPlaying(false);
    setPlaybackElapsedMs(0);
  };

  const useSavedAsTemplate = (item: SavedExercise) => {
    const now = new Date().toISOString();
    setDraft({ ...item.draft, name: `${item.name} – kopio`, updatedAt: now });
    setSavedExerciseId(null);
    setLibraryOpen(false);
    clearSelection();
    setPlaying(false);
    setPlaybackElapsedMs(0);
  };

  const removeSavedExercise = (item: SavedExercise) => {
    if (!window.confirm(`Poistetaanko harjoite “${item.name}”?`)) return;
    const next = savedExercises.filter(saved => saved.id !== item.id);
    saveSavedExercises(next);
    setSavedExercises(next);
    if (savedExerciseId === item.id) setSavedExerciseId(null);
  };

  const armTool = (nextTool: ExerciseTool) => { setPathError(""); setOpenMenu(null); setTool(nextTool); };
  const toggleMenu = (menu: Exclude<ToolMenu, null>) => {
    setPathError("");
    const opening = openMenu !== menu;
    setOpenMenu(opening ? menu : null);
    if (menu === "player") setTool(opening ? (playerTeam === "red" ? "player-red" : "player-blue") : "select");
    else if (opening && (tool === "player-blue" || tool === "player-red")) setTool("select");
  };
  const setPlayerTeamAndArm = (nextTeam: "blue" | "red") => { setPlayerTeam(nextTeam); setTool(nextTeam === "red" ? "player-red" : "player-blue"); };

  const addMarker = (kind: ExerciseTool, x: number, z: number) => {
    const teamColor = kind === "player-red" ? "red" : "blue";
    if ((kind === "player-blue" || kind === "player-red") && !canAddTeamPlayer(draft.markers, teamColor)) return;
    const id = `${kind}-${Date.now()}`;
    const count = draft.markers.filter(marker => marker.kind === "player").length + 1;
    const goalSize = kind.startsWith("goal-") ? kind.slice(5) as ExerciseGoalSize : null;
    const marker: ExerciseMarker = goalSize
      ? { id, kind: "goal", name: "Harjoitusmaali", goalSize, x, z, rotation: 0 }
      : kind === "ball"
      ? { id, kind: "ball", name: "Pallo", x, z }
      : kind === "cone"
        ? { id, kind: "cone", name: "Tötsä", x, z }
        : kind === "tall-cone"
          ? { id, kind: "tall-cone", name: "Kartio", x, z }
          : kind === "bench"
            ? { id, kind: "bench", name: "Penkki", x, z, rotation: 0 }
            : kind === "ladder"
              ? { id, kind: "ladder", name: "Tikkaat", x, z, rotation: 0 }
        : kind === "dummy"
          ? { id, kind: "dummy", name: "Harjoitusnukke", x, z, rotation: 0 }
          : { id, kind: "player", team: teamColor, role: "midfielder", color: playerColor, name: `Pelaaja ${count}`, number: count, x, z };
    updateDraft(current => ({ ...current, markers: [...current.markers, marker] }));
    clearSelection(); setSelectedId(id); setTool(kind === "player-blue" || kind === "player-red" ? kind : "select");
  };

  const selectMarker = (id: string | null, additive = false) => {
    if (!id) { clearSelection(); return; }
    setSelectedAnnotationId(null); setSelectedPathId(null); setEditingTextId(null);
    if (tool === "erase") {
      updateDraft(current => ({ ...current, markers: current.markers.filter(marker => marker.id !== id), paths: current.paths.filter(path => path.fromId !== id && path.toId !== id) }));
      setSelectedId(null); return;
    }
    if ((tool === "pass" || tool === "run" || tool === "dribble" || tool === "shot") && selectedId && selectedId !== id) {
      const from = draft.markers.find(marker => marker.id === selectedId), to = draft.markers.find(marker => marker.id === id);
      if (!from || !to || !canTargetExercisePath(tool, from, to)) { setPathError(tool === "pass" ? "Syötön voi kohdistaa vain saman joukkueen pelaajalle" : tool === "shot" ? "Vedon voi kohdistaa maaliin tai vapaaseen kenttäkohtaan" : "Valitse reitin kohteeksi pelaaja, pallo tai vapaa kenttäkohta"); return; }
      const pathId = `path-${Date.now()}`;
      updateDraft(current => ({ ...current, paths: [...normalizeExerciseTimeline(current.paths, current.markers), { id: pathId, kind: tool, fromId: selectedId, toId: id, startMs: getNextExercisePathStartMs(current.paths, current.markers) }] }));
      setPathError(""); setSelectedId(null); setSelectedPathId(pathId); setTool("select"); return;
    }
    setPathError("");
    if (tool === "select") {
      if (additive) setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
      else if (!selectedIds.includes(id)) setSelectedId(id);
      return;
    }
    setSelectedId(id);
  };

  const selectMarkerBox = (ids: string[], additive: boolean) => {
    setSelectedAnnotationId(null); setSelectedPathId(null); setEditingTextId(null); setPathError("");
    setSelectedIds(current => additive ? [...new Set([...current, ...ids])] : ids);
  };

  const selectPath = (id: string) => {
    if (tool === "erase") {
      updateDraft(current => ({ ...current, paths: current.paths.filter(path => path.id !== id) }));
      if (selectedPathId === id) setSelectedPathId(null);
      return;
    }
    setSelectedId(null); setSelectedAnnotationId(null); setEditingTextId(null); setSelectedPathId(id); setTool("select"); setOpenMenu(null); setRoutesOpen(false);
  };

  const selectAnnotation = (id: string) => {
    const annotation = draft.annotations.find(item => item.id === id);
    setSelectedId(null); setSelectedPathId(null); setSelectedAnnotationId(id); setOpenMenu(null); setTool("select");
    setEditingTextId(annotation?.kind === "text" ? id : null);
  };

  const pitchPointer = (phase: "down" | "move" | "up", x: number, z: number) => {
    if (phase === "down" && (tool === "player-blue" || tool === "player-red" || tool === "ball" || tool === "cone" || tool === "tall-cone" || tool === "bench" || tool === "ladder" || tool === "dummy" || tool.startsWith("goal-"))) return addMarker(tool, x, z);
    if (phase === "down" && (tool === "run" || tool === "dribble" || tool === "shot") && selectedId) {
      const pathId = `path-${Date.now()}`;
      updateDraft(current => ({ ...current, paths: [...normalizeExerciseTimeline(current.paths, current.markers), { id: pathId, kind: tool, fromId: selectedId, toPoint: { x, z }, startMs: getNextExercisePathStartMs(current.paths, current.markers) }] }));
      setPathError(""); setSelectedId(null); setSelectedPathId(pathId); setTool("select"); return;
    }
    if (phase === "down" && tool === "pass") { setPathError("Valitse syötön kohteeksi saman joukkueen pelaaja tai pallo"); return; }
    if (phase === "down" && tool === "text") {
      const id = `annotation-${Date.now()}`;
      updateDraft(current => ({ ...current, annotations: [...current.annotations, { id, kind: "text", text: "", color: ink, points: [{ x, z }] }] }));
      clearSelection(); setSelectedAnnotationId(id); setEditingTextId(id); setTool("select"); return;
    }
    if (!DRAW_TOOLS.includes(tool)) return;
    if (phase === "down") {
      const id = `annotation-${Date.now()}`;
      const item: ExerciseAnnotation = { id, kind: tool as ExerciseAnnotation["kind"], color: ink, width: inkWidth, points: [{ x, z }, { x, z }] };
      setDrawingId(id); updateDraft(current => ({ ...current, annotations: [...current.annotations, item] }));
    } else if (phase === "move" && drawingId) {
      updateDraft(current => ({ ...current, annotations: current.annotations.map(annotation => annotation.id !== drawingId ? annotation : { ...annotation, points: annotation.kind === "draw" ? [...annotation.points, { x, z }] : [annotation.points[0], { x, z }] }) }));
    } else if (phase === "up") {
      setDrawingId(null); setTool("select");
    }
  };

  const finishTextEdit = (id: string) => {
    const annotation = draft.annotations.find(item => item.id === id);
    if (!annotation?.text?.trim()) {
      updateDraft(current => ({ ...current, annotations: current.annotations.filter(item => item.id !== id) }));
      setSelectedAnnotationId(null);
    }
    setEditingTextId(null);
  };

  const removeSelected = useCallback(() => {
    if (selectedPathId) { updateDraft(current => ({ ...current, paths: current.paths.filter(path => path.id !== selectedPathId) })); clearSelection(); return; }
    if (selectedAnnotationId) { updateDraft(current => ({ ...current, annotations: current.annotations.filter(annotation => annotation.id !== selectedAnnotationId) })); clearSelection(); return; }
    if (!selectedIds.length) return;
    const ids = new Set(selectedIds);
    updateDraft(current => ({ ...current, markers: current.markers.filter(marker => !ids.has(marker.id)), paths: current.paths.filter(path => !ids.has(path.fromId) && (!path.toId || !ids.has(path.toId))) }));
    clearSelection();
  }, [clearSelection, selectedAnnotationId, selectedIds, selectedPathId, updateDraft]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete") return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      removeSelected();
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [removeSelected]);

  const updatePath = (patch: Partial<ExercisePath>) => {
    if (!selectedPath) return;
    updateDraft(current => {
      const paths = current.paths.map(path => path.id === selectedPath.id ? { ...path, ...patch } : path);
      const updated = paths.find(path => path.id === selectedPath.id);
      return { ...current, paths: updated && isExerciseBallPath(updated.kind) ? setExercisePathStartMs(paths, updated.id, updated.startMs ?? 0, current.markers) : paths };
    });
  };

  const routeFrom = selectedPath ? draft.markers.find(marker => marker.id === selectedPath.fromId) : null;
  const routeTo = selectedPath?.toId ? draft.markers.find(marker => marker.id === selectedPath.toId) : null;
  const routeTarget = routeTo || selectedPath?.toPoint;
  const playbackPositionMs = Math.min(timeline.totalMs, playbackElapsedMs);
  const timelineTicks = Array.from({ length: Math.floor(timelineWindowMs / 1000) + 1 }, (_, index) => index * 1000);
  const markerName = (id?: string) => draft.markers.find(marker => marker.id === id)?.name || "Vapaa kohta";
  const togglePlayback = () => {
    if (playing) { setPlaying(false); return; }
    const startMs = playbackElapsedMs >= timeline.totalMs ? 0 : playbackElapsedMs;
    setPlaybackElapsedMs(startMs);
    setPlaybackStartedAt(performance.now() - startMs / playbackSpeed);
    setPlaying(true);
  };
  const renderTimelineClip = (entry: ExerciseTimelineEntry, lane: number) => {
    const path = draft.paths.find(item => item.id === entry.pathId);
    if (!path) return null;
    const naturalDuration = getExercisePathNaturalDurationMs(path, draft.markers);
    const durationChanged = Number.isFinite(path.durationMs) && Math.abs(entry.durationMs - naturalDuration) >= 25;
    const changeDuration = (durationMs: number) => updateDraft(current => ({ ...current, paths: setExercisePathDurationMs(current.paths, entry.pathId, durationMs, current.markers) }));
    return <div
      key={entry.pathId}
      role="button"
      tabIndex={0}
      className={`exercise-timeline-clip ${path.kind} ${entry.pathId === selectedPathId ? "active" : ""} ${durationChanged ? "trimmed" : ""}`}
      style={{ left: `${entry.startMs / timelineWindowMs * 100}%`, width: `${entry.durationMs / timelineWindowMs * 100}%` }}
      onPointerDown={event => { event.preventDefault(); setSelectedId(null); setSelectedAnnotationId(null); setSelectedPathId(entry.pathId); updateDraft(current => ({ ...current, paths: current.paths.map(item => item.id === entry.pathId ? { ...item, timelineLane: lane } : item) })); setTimelineDrag({ pathId: entry.pathId, pointerX: event.clientX, pointerY: event.clientY, initialStartMs: entry.startMs, initialLane: lane }); }}
      onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(null); setSelectedAnnotationId(null); setSelectedPathId(entry.pathId); } }}
      title={`${({ pass: "Syöttö", run: "Juoksu", dribble: "Kuljetus", shot: "Veto" } as const)[path.kind]}: ${markerName(path.fromId)} → ${markerName(path.toId)} · ${formatTimelineDuration(entry.durationMs)}`}
    ><span className="exercise-timeline-route-label"><b>{({ pass: "Syöttö", run: "Juoksu", dribble: "Kuljetus", shot: "Veto" } as const)[path.kind]} · {markerName(path.fromId)}</b><ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" /><b>{markerName(path.toId)}</b></span><small>{formatTimelineDuration(entry.durationMs)}</small><span
      className="exercise-timeline-trim-handle"
      role="slider"
      tabIndex={0}
      aria-label={`Säädä reitin ${markerName(path.fromId)}–${markerName(path.toId)} kestoa`}
      aria-valuemin={EXERCISE_MIN_DURATION_MS}
      aria-valuemax={EXERCISE_MAX_DURATION_MS}
      aria-valuenow={Math.round(entry.durationMs)}
      aria-valuetext={formatTimelineDuration(entry.durationMs)}
      onPointerDown={event => { event.preventDefault(); event.stopPropagation(); setSelectedId(null); setSelectedAnnotationId(null); setSelectedPathId(entry.pathId); setTimelineTrim({ pathId: entry.pathId, pointerX: event.clientX, initialDurationMs: entry.durationMs }); }}
      onKeyDown={event => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return; event.preventDefault(); event.stopPropagation(); changeDuration(entry.durationMs + (event.key === "ArrowRight" ? 100 : -100)); }}
    /></div>;
  };
  const undoKeys = <><kbd>Ctrl</kbd><span className="exercise-key-or">/</span><kbd>⌘ Cmd</kbd><span>+</span><kbd>Z</kbd></>;
  const toolHint = tool === "pass" ? (selectedId ? "Valitse syötön vastaanottaja" : "Valitse ensin lähtöpiste") : tool === "run" ? (selectedId ? "Valitse pelaaja, pallo tai vapaa kenttäkohta" : "Valitse ensin lähtöpiste") : tool === "dribble" ? (selectedId ? "Valitse kuljetuksen kohde tai vapaa kenttäkohta" : "Valitse ensin pallollinen pelaaja") : tool === "shot" ? (selectedId ? "Valitse maali tai vapaa kenttäkohta" : "Valitse ensin laukoja") : tool === "player-blue" || tool === "player-red" ? "Napsauta kenttää lisätäksesi pelaajan" : tool === "ball" ? "Napsauta kenttää lisätäksesi pallon" : tool === "cone" ? "Napsauta kenttää lisätäksesi tötsän" : tool === "tall-cone" ? "Napsauta kenttää lisätäksesi kartion" : tool === "bench" ? "Napsauta kenttää lisätäksesi penkin" : tool === "ladder" ? "Napsauta kenttää lisätäksesi tikkaat" : tool === "dummy" ? "Napsauta kenttää lisätäksesi harjoitusnuken" : tool.startsWith("goal-") ? "Napsauta kenttää lisätäksesi maalin" : tool === "text" ? "Napsauta kenttää ja kirjoita" : DRAW_TOOLS.includes(tool) ? "Piirrä kentälle raahaamalla" : null;
  const hint = pathError || toolHint || (view === "3d" ? <><span>Raahaa pelaajia</span><span className="exercise-hint-divider">·</span><kbd className="exercise-shift-key"><span aria-hidden="true">⇧</span><span>Shift</span></kbd><span>+ raahaus siirtää kenttää</span><span className="exercise-hint-divider">·</span><span>rulla zoomaa</span><span className="exercise-hint-divider">·</span>{undoKeys}<span>kumoaa viimeisimmän toiminnon</span></> : <><span>Raahaa pelaajia</span><span className="exercise-hint-divider">·</span><kbd className="exercise-shift-key"><span aria-hidden="true">⇧</span><span>Shift</span></kbd><span>+ raahaus siirtää kenttää</span><span className="exercise-hint-divider">·</span><span>rulla zoomaa</span><span className="exercise-hint-divider">·</span>{undoKeys}<span>kumoaa viimeisimmän toiminnon</span></>);

  const inspectorOpen = !openMenu && (selectedIds.length > 1 || selected || selectedPath || (selectedAnnotation && selectedAnnotation.kind !== "text"));

  if (shared) return <main className="exercise-shell"><section className={`exercise-desktop-app exercise-shared exercise-shared-${view} ${playing ? "exercise-playing" : ""}`}>
    <header className="exercise-header"><div className="exercise-header-inner"><button className="exercise-icon-button exercise-back-left" onClick={onBack} title="Peluutin-etusivulle"><ArrowLeft size={18} /></button><button className="exercise-brand" onClick={onBack}><img src="/favicon.svg" alt="" /><span className="exercise-brand-lockup"><b>Peluutin</b><small>Jaettu harjoite</small></span></button><span className="exercise-divider" /><strong className="exercise-shared-title">{draft.name}</strong><div className="exercise-header-actions"><div className={`exercise-view-switch ${view === "3d" ? "is-3d" : ""}`}><span className="exercise-view-switch-thumb" aria-hidden="true" /><button className={view === "2d" ? "active" : ""} onClick={() => setView("2d")}>2D</button><button className={view === "3d" ? "active" : ""} onClick={() => setView("3d")}>3D</button></div><button className={`exercise-icon-button ${hideNames ? "active" : ""}`} onClick={() => setHideNames(current => !current)}>{hideNames ? <EyeOff size={18} /> : <Eye size={18} />}</button><button className="exercise-icon-button" onClick={onToggleTheme}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button></div></div></header>
    <section className="exercise-stage"><ExerciseCanvas theme={theme} view={view} tool="pass" markers={draft.markers} paths={draft.paths} annotations={draft.annotations} goalSize={draft.goalSize} pitchPreset={draft.pitchPreset} pitchOrientation="portrait" pitchStyle={draft.pitchStyle} zoomScale={view === "2d" ? 1.12 : 1} labelScale={1.2} showResetAtDefault={false} showNames={!hideNames} selectedIds={[]} selectedAnnotationId={null} selectedPathId={null} editingTextId={null} playbackPositionMs={playbackPositionMs} showPlaybackFrame={playing || playbackElapsedMs > 0} onSelect={() => {}} onBoxSelect={() => {}} onSelectAnnotation={() => {}} onSelectPath={() => {}} onChangeText={() => {}} onFinishTextEdit={() => {}} onMove={() => {}} onPitchPointer={() => {}} onEraseAnnotation={() => {}} />{notesOpen && (draft.exerciseTheme || draft.notes || draft.coachingPoints || draft.keyQuestions) && <div className="exercise-shared-notes">{draft.exerciseTheme && <><b>Teema</b><span>{draft.exerciseTheme}</span></>}{draft.notes && <><b>Kuvaus ja säännöt</b><span>{draft.notes}</span></>}{draft.coachingPoints && <><b>Valmennuspisteet</b><span>{draft.coachingPoints}</span></>}{draft.keyQuestions && <><b>Avainkysymykset</b><span>{draft.keyQuestions}</span></>}</div>}</section>
    {(draft.exerciseTheme || draft.notes || draft.coachingPoints || draft.keyQuestions) && <button className={`exercise-shared-notes-toggle ${notesOpen ? "active" : ""}`} onClick={() => setNotesOpen(current => !current)} title={notesOpen ? "Piilota harjoitteen tiedot" : "Avaa harjoitteen tiedot"} aria-label={notesOpen ? "Piilota harjoitteen tiedot" : "Avaa harjoitteen tiedot"} aria-pressed={notesOpen}><StickyNote size={17} /></button>}
    <div className="exercise-playback-stack"><div className="exercise-playback"><button className={playing ? "active" : ""} onClick={togglePlayback}>{playing ? <Pause size={16} /> : <Play size={16} />} {playing ? "Pysäytä" : "Toista"}</button><div className={`exercise-speed-switch speed-${playbackSpeed === 1 ? "1" : playbackSpeed === 1.5 ? "1-5" : "2"}`}><span className="exercise-speed-switch-thumb" aria-hidden="true" />{([1, 1.5, 2] as const).map(speed => <button key={speed} className={playbackSpeed === speed ? "active" : ""} onClick={() => { setPlaying(false); setPlaybackSpeed(speed); }}>{speed}×</button>)}</div></div></div>
  </section></main>;

  return <main className="exercise-shell">
    <div className="exercise-mobile-block"><img src="/assets/peluutin-logo.svg" alt="Peluutin" /><h1>Harjoitteet tarvitsee leveämmän näkymän</h1><p><strong>Käytätkö tablettia?</strong> Käännä se vaaka-asentoon, niin voit avata harjoituseditorin. Harjoitteita ei ole suunniteltu puhelimella käytettäväksi.</p><button onClick={onBack}>Takaisin otteluihin</button></div>
    <section className={`exercise-desktop-app exercise-tools-${toolSide}`}>
      <header className="exercise-header"><div className="exercise-header-inner"><button className="exercise-icon-button exercise-back-left" onClick={onBack} title="Takaisin otteluihin"><ArrowLeft size={18} /></button><button className="exercise-brand" onClick={onBack} aria-label="Peluutin Ottelut -näkymään"><img src="/favicon.svg" alt="" /><span className="exercise-brand-lockup"><b>Peluutin</b><small>Harjoitteet</small></span></button><span className="exercise-divider" /><label className="exercise-title-editor"><input className="exercise-title-input" size={Math.max(12, Math.min(32, draft.name.length + 1))} value={draft.name} onChange={event => updateDraft(current => ({ ...current, name: event.target.value.slice(0, 60) }))} aria-label="Harjoitteen nimi" /><Pencil size={14} aria-hidden="true" /></label><div className="exercise-title-actions"><button className={`exercise-save-trigger ${isSavedVersion ? "is-saved" : ""}`} onClick={saveExercise} disabled={isSavedVersion}><BookmarkPlus size={15} />{isSavedVersion ? "Tallennettu" : "Tallenna"}</button><button className="exercise-icon-button" onClick={() => setLibraryOpen(true)} title="Tallennetut harjoitteet" aria-label="Tallennetut harjoitteet"><FolderOpen size={18} /></button></div><div className="exercise-header-actions"><div className={`exercise-view-switch ${view === "3d" ? "is-3d" : ""}`}><span className="exercise-view-switch-thumb" aria-hidden="true" /><button className={view === "2d" ? "active" : ""} onClick={() => setView("2d")}>2D</button><button className={view === "3d" ? "active" : ""} onClick={() => setView("3d")}>3D</button></div><button className={`exercise-icon-button ${hideNames ? "active" : ""}`} onClick={() => setHideNames(current => { const next = !current; localStorage.setItem(HIDE_NAMES_KEY, String(next)); return next; })} title={hideNames ? "Näytä nimet" : "Piilota nimet"} aria-label={hideNames ? "Näytä nimet" : "Piilota nimet"} aria-pressed={hideNames}>{hideNames ? <EyeOff size={18} /> : <Eye size={18} />}</button><button className="exercise-icon-button" onClick={onToggleTheme} title={theme === "dark" ? "Vaihda vaaleaan teemaan" : "Vaihda tummaan teemaan"} aria-label={theme === "dark" ? "Vaihda vaaleaan teemaan" : "Vaihda tummaan teemaan"}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button></div></div></header>

      <section className={`exercise-stage ${routesOpen ? "timeline-open" : ""}`}><ExerciseCanvas theme={theme} view={view} tool={tool} markers={draft.markers} paths={draft.paths} annotations={draft.annotations} goalSize={draft.goalSize} pitchPreset={draft.pitchPreset} pitchOrientation={draft.pitchOrientation} pitchStyle={draft.pitchStyle} showNames={!hideNames} selectedIds={selectedIds} selectedAnnotationId={selectedAnnotationId} selectedPathId={selectedPathId} editingTextId={editingTextId} playbackPositionMs={playbackPositionMs} showPlaybackFrame={playing || scrubbing || playbackElapsedMs > 0} onSelect={selectMarker} onBoxSelect={selectMarkerBox} onSelectAnnotation={selectAnnotation} onSelectPath={selectPath} onChangeText={(id, text) => updateDraft(current => ({ ...current, annotations: current.annotations.map(annotation => annotation.id === id ? { ...annotation, text } : annotation) }))} onFinishTextEdit={finishTextEdit} onMove={(id, x, z) => updateDraft(current => ({ ...current, markers: moveExerciseMarkerSelection(current.markers, selectedIds.includes(id) ? selectedIds : [id], id, x, z, current.pitchPreset) }))} onPitchPointer={pitchPointer} onEraseAnnotation={id => updateDraft(current => ({ ...current, annotations: current.annotations.filter(annotation => annotation.id !== id) }))} /><div className="exercise-stage-hint">{hint}</div></section>

      <div className="exercise-share-control"><button className="exercise-share-trigger" onClick={() => setShareMenuOpen(current => !current)} aria-expanded={shareMenuOpen} aria-haspopup="menu"><Share2 size={16} />Jaa</button>{shareMenuOpen && <div className="exercise-share-menu" role="menu"><button role="menuitem" onClick={() => void shareExercise()}><Link2 size={15} />{shareLabel}</button><button role="menuitem" disabled={imageExportLabel !== "Lataa kuvana (PNG)"} onClick={() => void exportExerciseImage()}><Download size={15} />{imageExportLabel}</button></div>}</div>
      {libraryOpen && <div className="exercise-library-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && setLibraryOpen(false)}><section className="exercise-library-modal" role="dialog" aria-modal="true" aria-labelledby="exercise-library-title"><header><div><span className="eyebrow">HARJOITTEET</span><h2 id="exercise-library-title">Tallennetut harjoitteet</h2></div><button className="exercise-icon-button" onClick={() => setLibraryOpen(false)} aria-label="Sulje"><X size={18} /></button></header>{savedExercises.length ? <div className="exercise-library-list">{savedExercises.map(item => <article key={item.id}><div><strong>{item.name}</strong><small>Muokattu {new Date(item.updatedAt).toLocaleDateString("fi-FI")}</small></div><div className="exercise-library-actions"><button className="button-primary" onClick={() => openSavedExercise(item)}>Avaa</button><button className="button-secondary" onClick={() => useSavedAsTemplate(item)}><Copy size={14} />Käytä mallina</button><button className="exercise-library-delete" onClick={() => removeSavedExercise(item)} aria-label={`Poista harjoite ${item.name}`}><Trash2 size={15} /></button></div></article>)}</div> : <p className="exercise-library-empty">Et ole vielä tallentanut harjoitteita. Tallenna nykyinen harjoite, niin voit käyttää sitä myöhemmin mallina.</p>}</section></div>}
      <aside className="exercise-tools" aria-label="Harjoitteen työkalut">
        <button className={tool === "select" && !openMenu ? "active" : ""} onClick={() => { armTool("select"); clearSelection(); }} title="Valitse ja siirrä" aria-label="Valitse ja siirrä"><MousePointer2 size={19} /></button>
        <button className={openMenu === "player" || tool === "player-blue" || tool === "player-red" ? "active" : ""} onClick={() => toggleMenu("player")} title="Lisää pelaaja" aria-label="Lisää pelaaja"><UserRoundPlus size={19} /></button>
        <button className={openMenu === "element" || ["ball", "cone", "tall-cone", "bench", "ladder", "dummy"].includes(tool) || tool.startsWith("goal-") ? "active" : ""} onClick={() => toggleMenu("element")} title="Lisää elementtejä" aria-label="Lisää elementtejä"><CirclePlus size={19} /></button>
        <button className={openMenu === "pitch" || tool.startsWith("goal-") ? "active" : ""} onClick={() => toggleMenu("pitch")} title="Kenttä ja maalit" aria-label="Kenttä ja maalit"><Goal size={19} /></button>
        <button className={`${openMenu === "route" || tool === "pass" || tool === "run" || tool === "dribble" || tool === "shot" ? "active" : ""} tool-break`} onClick={() => toggleMenu("route")} title="Lisää reitti" aria-label="Lisää reitti"><Route size={19} /></button>
        <button className={openMenu === "shape" || DRAW_TOOLS.includes(tool) ? "active" : ""} onClick={() => toggleMenu("shape")} title="Piirrä ja lisää kuvioita" aria-label="Piirrä ja lisää kuvioita"><Shapes size={19} /></button>
        <button className={tool === "text" ? "active" : ""} onClick={() => armTool("text")} title="Lisää teksti" aria-label="Lisää teksti"><Type size={19} /></button>
        <button className={notesOpen ? "active" : ""} onClick={() => setNotesOpen(current => !current)} title="Harjoitteen tiedot" aria-label="Harjoitteen tiedot"><StickyNote size={19} /></button>
        <button className={`${tool === "erase" ? "active" : ""} tool-break`} onClick={() => armTool("erase")} title="Pyyhi" aria-label="Pyyhi"><Eraser size={19} /></button>
        <button className="tool-break" onClick={() => setToolSide(current => { const next = current === "right" ? "left" : "right"; localStorage.setItem(TOOL_SIDE_KEY, next); return next; })} title={`Siirrä työkalut ${toolSide === "right" ? "vasemmalle" : "oikealle"}`} aria-label={`Siirrä työkalut ${toolSide === "right" ? "vasemmalle" : "oikealle"}`}>{toolSide === "right" ? <PanelLeft size={19} /> : <PanelRight size={19} />}</button>
      </aside>

      {openMenu === "player" && <aside className="exercise-tool-popover" aria-label="Pelaajan asetukset"><div className="exercise-popover-title"><span>Lisää pelaaja</span><button onClick={() => { setOpenMenu(null); setTool("select"); }} aria-label="Sulje"><X size={16} /></button></div><fieldset><legend>Rooli harjoitteessa</legend><div className="exercise-option-row"><button className={playerTeam === "blue" ? "active" : ""} onClick={() => setPlayerTeamAndArm("blue")}><span className="exercise-team-dot own" />Oma joukkue</button><button className={playerTeam === "red" ? "active" : ""} onClick={() => setPlayerTeamAndArm("red")}><span className="exercise-team-dot opponent" />Vastustaja</button></div></fieldset><fieldset><legend>Väri</legend><div className="exercise-color-row">{DRAW_COLORS.map(color => <button key={color} className={`${playerColor === color ? "active" : ""} ${color === "#ffffff" ? "light-swatch" : ""}`} style={{ backgroundColor: color }} onClick={() => setPlayerColor(color)} aria-label={`Valitse pelaajan väri ${color}`} />)}</div></fieldset><p className="exercise-popover-copy exercise-player-add-hint">{teamLimit ? "11 pelaajan raja täynnä" : "Napsauta kenttää lisätäksesi pelaajan"}</p></aside>}
      {openMenu === "element" && <aside className="exercise-tool-popover" aria-label="Lisää elementtejä"><div className="exercise-popover-title"><span>Lisää elementtejä</span><button onClick={() => setOpenMenu(null)} aria-label="Sulje"><X size={16} /></button></div><div className="exercise-element-grid"><button onClick={() => armTool("ball")}><CircleDot size={18} /><span><b>Pallo</b><small>Lisää kentälle</small></span></button><button onClick={() => armTool("cone")}><Triangle size={18} /><span><b>Tötsä</b><small>Matala merkki</small></span></button><button onClick={() => armTool("tall-cone")}><TrafficCone size={18} /><span><b>Kartio</b><small>Korkea kartio</small></span></button><button onClick={() => armTool("bench")}><BenchIcon /><span><b>Penkki</b><small>Pitkä vaihtopenkki</small></span></button><button onClick={() => armTool("ladder")}><Rows3 size={18} /><span><b>Tikkaat</b><small>Maahan asetettavat</small></span></button><button onClick={() => armTool("dummy")}><PersonStanding size={18} /><span><b>Harjoitusnukke</b><small>Muuri ja vastus</small></span></button></div><fieldset><legend>Lisää maali</legend><div className="exercise-goal-size-options">{GOAL_SIZE_ITEMS.map(({ value, label, icon: Icon }) => <button key={value} onClick={() => armTool(`goal-${value}` as ExerciseTool)}><Icon size={16} />{label}</button>)}</div></fieldset></aside>}

      {openMenu === "pitch" && <aside className="exercise-tool-popover" aria-label="Kentän ja maalien asetukset"><div className="exercise-popover-title"><span>Kenttä ja maalit</span><button onClick={() => setOpenMenu(null)} aria-label="Sulje"><X size={16} /></button></div><fieldset><legend>Tyyli</legend><div className="exercise-option-row">{([['dark', 'Tumma'], ['grass', 'Nurmi']] as Array<[ExercisePitchStyle, string]>).map(([value, label]) => <button key={value} className={draft.pitchStyle === value ? "active" : ""} onClick={() => updateDraft(current => ({ ...current, pitchStyle: value }))}>{label}</button>)}</div></fieldset><fieldset><legend>Kentän koko</legend><div className="exercise-option-row">{([['training', 'Harjoituskenttä'], ['full', 'Iso kenttä']] as Array<[ExercisePitchPreset, string]>).map(([value, label]) => <button key={value} className={draft.pitchPreset === value ? "active" : ""} onClick={() => updateDraft(current => resizeExerciseDraftContent(current, value))}>{label}</button>)}</div></fieldset><fieldset><legend>Suunta</legend><div className="exercise-option-row">{([['landscape', 'Vaaka'], ['portrait', 'Pysty']] as Array<[ExercisePitchOrientation, string]>).map(([value, label]) => <button key={value} className={draft.pitchOrientation === value ? "active" : ""} onClick={() => updateDraft(current => ({ ...current, pitchOrientation: value }))}>{label}</button>)}</div></fieldset><fieldset><legend>Päätymaalien koko</legend><div className="exercise-goal-size-options">{GOAL_SIZE_ITEMS.map(({ value, label, icon: Icon }) => <button key={value} className={draft.goalSize === value ? "active" : ""} onClick={() => updateDraft(current => ({ ...current, goalSize: value }))}><Icon size={16} />{label}</button>)}</div></fieldset></aside>}

      {openMenu === "route" && <aside className="exercise-tool-popover" aria-label="Reitin asetukset"><div className="exercise-popover-title"><span>Lisää reitti</span><button onClick={() => setOpenMenu(null)} aria-label="Sulje"><X size={16} /></button></div>{selected && (selected.kind === "player" || selected.kind === "ball") ? <><p className="exercise-popover-copy">Lähtöpiste: <strong>{selected.name}</strong></p><div className="exercise-option-column"><button onClick={() => armTool("pass")}><Route size={17} />Syöttö</button><button onClick={() => armTool("run")}><Footprints size={17} />Juoksu</button><button onClick={() => armTool("dribble")}><Spline size={17} />Kuljetus</button><button onClick={() => armTool("shot")}><Crosshair size={17} />Veto</button></div></> : <p className="exercise-popover-copy">Valitse ensin kentältä pelaaja tai pallo, josta reitti alkaa.</p>}</aside>}

      {openMenu === "shape" && <aside className="exercise-tool-popover" aria-label="Piirrostyökalut"><div className="exercise-popover-title"><span>Piirrä ja muodot</span><button onClick={() => setOpenMenu(null)} aria-label="Sulje"><X size={16} /></button></div><div className="exercise-shape-grid">{SHAPE_ITEMS.map(({ tool: item, label, icon: Icon }) => <button key={item} onClick={() => armTool(item)}><Icon size={17} />{label}</button>)}</div><fieldset><legend>Piirrosväri</legend><div className="exercise-color-row">{DRAW_COLORS.map(color => <button key={color} className={`${ink === color ? "active" : ""} ${color === "#ffffff" ? "light-swatch" : ""}`} style={{ backgroundColor: color }} onClick={() => setInk(color)} aria-label={`Valitse väri ${color}`} />)}</div></fieldset><fieldset><legend>Paksuus</legend><div className="exercise-width-options">{([[1, "Ohut"], [2, "Normaali"], [3, "Paksu"]] as Array<[1 | 2 | 3, string]>).map(([width, label]) => <button key={width} className={inkWidth === width ? "active" : ""} onClick={() => setInkWidth(width)}>{label}</button>)}</div></fieldset><small>Väri ja paksuus vaikuttavat uusiin piirroksiin ja kuvioihin.</small></aside>}

      {notesOpen && <aside className="exercise-notes-panel" aria-label="Harjoitteen tiedot"><div className="exercise-popover-title"><span>Harjoitteen tiedot</span><button onClick={() => setNotesOpen(false)} aria-label="Piilota harjoitteen tiedot"><X size={16} /></button></div><label>Teema<input value={draft.exerciseTheme || ""} maxLength={120} onChange={event => updateDraft(current => ({ ...current, exerciseTheme: event.target.value }))} placeholder="Esim. Pelaaminen ylivoimalla" /></label><label>Kuvaus ja säännöt<textarea className="exercise-details-description" value={draft.notes} onChange={event => updateDraft(current => ({ ...current, notes: event.target.value.slice(0, 2000) }))} placeholder="Kuvaa harjoitteen kulku ja säännöt…" /></label><label>Valmennuspisteet<textarea value={draft.coachingPoints || ""} onChange={event => updateDraft(current => ({ ...current, coachingPoints: event.target.value.slice(0, 1500) }))} placeholder="Mihin valmentaja kiinnittää huomiota?" /></label><label>Avainkysymykset<textarea value={draft.keyQuestions || ""} onChange={event => updateDraft(current => ({ ...current, keyQuestions: event.target.value.slice(0, 1500) }))} placeholder="Mitä kysymyksiä pelaajille esitetään?" /></label><small>Tyhjät osiot jätetään pois jaettavasta kuvasta.</small></aside>}

      {inspectorOpen && <aside className="exercise-inspector"><div className="exercise-inspector-title"><span>{selectedIds.length > 1 ? `${selectedIds.length} valittua` : selectedPath ? "Reitti" : selectedAnnotation ? "Kuvio" : selected?.kind === "player" ? "Pelaaja" : "Elementti"}</span><button onClick={clearSelection} aria-label="Sulje"><X size={16} /></button></div>
        {selectedIds.length > 1 && <p className="exercise-popover-copy">Raahaa yhtä valituista elementeistä siirtääksesi koko ryhmää.</p>}
        {selected && <><label>Nimi<input value={selected.name} onChange={event => updateDraft(current => ({ ...current, markers: current.markers.map(marker => marker.id === selected.id ? { ...marker, name: event.target.value.slice(0, 28) } : marker) }))} /></label>{selected.kind === "player" && <><label>Numero<input type="number" min="0" max="99" value={selected.number || 0} onChange={event => updateDraft(current => ({ ...current, markers: current.markers.map(marker => marker.id === selected.id ? { ...marker, number: Number(event.target.value) } : marker) }))} /></label>{selected.team === "red" && <div className="exercise-opponent-label"><span className="exercise-team-dot opponent" />Vastustajapelaaja</div>}<fieldset><legend>Väri</legend><div className="exercise-color-row">{DRAW_COLORS.map(color => <button key={color} className={`${getExerciseMarkerColor(selected, theme) === color ? "active" : ""} ${color === "#ffffff" ? "light-swatch" : ""}`} style={{ backgroundColor: color }} onClick={() => updateDraft(current => ({ ...current, markers: current.markers.map(marker => marker.id === selected.id ? { ...marker, color } : marker) }))} aria-label={`Vaihda pelaajan väri ${color}`} />)}</div></fieldset></>}{(selected.kind === "dummy" || selected.kind === "bench" || selected.kind === "ladder") && <label>Suunta<div className="exercise-curve-control"><input type="range" min="0" max="345" step="15" value={selected.rotation ?? 0} onChange={event => updateDraft(current => ({ ...current, markers: current.markers.map(marker => marker.id === selected.id ? { ...marker, rotation: Number(event.target.value) } : marker) }))} /><output>{selected.rotation ?? 0}°</output></div></label>}{selected.kind === "goal" && <><fieldset><legend>Koko</legend><div className="exercise-goal-size-options">{([['small', 'Pieni'], ['youth', 'Juniori'], ['full', 'Iso']] as Array<[ExerciseGoalSize, string]>).map(([value, label]) => <button key={value} className={selected.goalSize === value ? "active" : ""} onClick={() => updateDraft(current => ({ ...current, markers: current.markers.map(marker => marker.id === selected.id ? { ...marker, goalSize: value } : marker) }))}><Goal size={15} />{label}</button>)}</div></fieldset><label>Suunta<div className="exercise-curve-control"><input type="range" min="0" max="345" step="15" value={selected.rotation ?? 0} onChange={event => updateDraft(current => ({ ...current, markers: current.markers.map(marker => marker.id === selected.id ? { ...marker, rotation: Number(event.target.value) } : marker) }))} /><output>{selected.rotation ?? 0}°</output></div></label></>}</>}
        {selectedAnnotation && <><fieldset><legend>Väri</legend><div className="exercise-color-row">{DRAW_COLORS.map(color => <button key={color} className={`${selectedAnnotation.color === color ? "active" : ""} ${color === "#ffffff" ? "light-swatch" : ""}`} style={{ backgroundColor: color }} onClick={() => updateDraft(current => ({ ...current, annotations: current.annotations.map(annotation => annotation.id === selectedAnnotation.id ? { ...annotation, color } : annotation) }))} aria-label={`Vaihda väri ${color}`} />)}</div></fieldset><fieldset><legend>Paksuus</legend><div className="exercise-width-options">{([[1, "Ohut"], [2, "Normaali"], [3, "Paksu"]] as Array<[1 | 2 | 3, string]>).map(([width, label]) => <button key={width} className={(selectedAnnotation.width ?? 2) === width ? "active" : ""} onClick={() => updateDraft(current => ({ ...current, annotations: current.annotations.map(annotation => annotation.id === selectedAnnotation.id ? { ...annotation, width } : annotation) }))}>{label}</button>)}</div></fieldset></>}
        {selectedPath && routeFrom && routeTarget && <><div className="exercise-path-kind">{([['pass', 'Syöttö', Route], ['run', 'Juoksu', Footprints], ['dribble', 'Kuljetus', CircleDot], ['shot', 'Veto', Goal]] as const).map(([kind, label, Icon]) => { const enabled = routeTo ? canTargetExercisePath(kind, routeFrom, routeTo) : kind !== "pass"; return <button key={kind} className={selectedPath.kind === kind ? "active" : ""} disabled={!enabled} onClick={() => enabled && updatePath({ kind })}><Icon size={15} />{label}</button>; })}</div><label>Lähtö<select value={selectedPath.fromId} onChange={event => { const nextFrom = draft.markers.find(marker => marker.id === event.target.value); if (nextFrom && (routeTo ? canTargetExercisePath(selectedPath.kind, nextFrom, routeTo) : nextFrom.kind === "player" || nextFrom.kind === "ball")) updatePath({ fromId: event.target.value }); }}>{draft.markers.filter(marker => (marker.kind === "player" || marker.kind === "ball") && (!routeTo || canTargetExercisePath(selectedPath.kind, marker, routeTo))).map(marker => <option key={marker.id} value={marker.id}>{marker.name}</option>)}</select></label><label>Kohde<select value={selectedPath.toId || "__point__"} onChange={event => { if (event.target.value === "__point__") return; const nextTo = draft.markers.find(marker => marker.id === event.target.value); if (nextTo && canTargetExercisePath(selectedPath.kind, routeFrom, nextTo)) updatePath({ toId: event.target.value, toPoint: undefined }); }}>{selectedPath.toPoint && <option value="__point__">Vapaa kenttäkohta</option>}{draft.markers.filter(marker => marker.id !== selectedPath.fromId && canTargetExercisePath(selectedPath.kind, routeFrom, marker)).map(marker => <option key={marker.id} value={marker.id}>{marker.name}</option>)}</select></label><label>Kaarevuus<div className="exercise-curve-control"><input type="range" min="-1" max="1" step="0.05" value={selectedPath.curve ?? 0} onChange={event => updatePath({ curve: Number(event.target.value) })} /><output>{Math.round((selectedPath.curve ?? 0) * 100)} %</output></div></label><div className="exercise-path-duration"><span>Kesto <b>{formatTimelineDuration(timelineByPath.get(selectedPath.id)?.durationMs ?? 0)}</b></span>{Number.isFinite(selectedPath.durationMs) && <button onClick={() => updateDraft(current => ({ ...current, paths: resetExercisePathDuration(current.paths, selectedPath.id, current.markers) }))}><Redo2 size={14} />Palauta luonnollinen kesto</button>}</div></>}
        <button className="exercise-delete-button" onClick={removeSelected}><Trash2 size={15} />Poista</button>
      </aside>}

      <div className={`exercise-playback-stack ${routesOpen ? "timeline-open" : ""}`}>
        <div className="exercise-playback"><button className={playing ? "active" : ""} onClick={togglePlayback}>{playing ? <Pause size={16} /> : <Play size={16} />} {playing ? "Pysäytä" : "Toista"}</button><button className="exercise-route-count" onClick={() => setRoutesOpen(current => !current)} disabled={!draft.paths.length} aria-expanded={routesOpen} aria-label={`Aikajana, ${formatRouteCount(draft.paths.length)}`}>Aikajana</button><div className={`exercise-speed-switch speed-${playbackSpeed === 1 ? "1" : playbackSpeed === 1.5 ? "1-5" : "2"}`} aria-label="Toistonopeus"><span className="exercise-speed-switch-thumb" aria-hidden="true" />{([1, 1.5, 2] as const).map(speed => <button key={speed} className={playbackSpeed === speed ? "active" : ""} aria-pressed={playbackSpeed === speed} title={`${speed}×: juoksu ${EXERCISE_NATURAL_SPEEDS.runKmh * speed} km/h, pallo ${EXERCISE_NATURAL_SPEEDS.passKmh * speed} km/h`} onClick={() => { setPlaying(false); setPlaybackSpeed(speed); }}>{speed}×</button>)}</div><button className="exercise-clear-routes" onClick={() => setClearRoutesOpen(true)} disabled={!draft.paths.length}><Redo2 size={15} />Tyhjennä reitit</button></div>
        {routesOpen && <aside className={`exercise-timeline-editor ${timelineLanes.length > 5 ? "has-overflow" : ""}`} aria-label="Reittien aikajana">
          <header><div><b>Aikajana</b><span>Kesto {formatTimelineTime(timeline.totalMs)}</span></div><small>{playbackSpeed.toString().replace(".", ",")}× · perusnopeus: juoksu {EXERCISE_NATURAL_SPEEDS.runKmh * playbackSpeed} km/h · pallo {EXERCISE_NATURAL_SPEEDS.passKmh * playbackSpeed} km/h</small><button onClick={() => setRoutesOpen(false)} aria-label="Sulje aikajana"><X size={16} /></button></header>
          <div className="exercise-timeline-body"><div className="exercise-timeline-labels"><span className="ruler-spacer" />{timelineLanes.map((_, index) => <span key={index}>Raita {index + 1}</span>)}</div><div className="exercise-timeline-track-area" ref={timelineTrackRef}><div className="exercise-timeline-ruler">{timelineTicks.map(tick => <span key={tick} style={{ left: `${tick / timelineWindowMs * 100}%` }}>{tick / 1000}s</span>)}</div>{timelineTicks.map(tick => <i className="exercise-timeline-grid-line" key={tick} style={{ left: `${tick / timelineWindowMs * 100}%` }} />)}{timelineLanes.map((lane, index) => <div className="exercise-timeline-track" key={index}>{lane.map(entry => renderTimelineClip(entry, index))}</div>)}<div className={`exercise-timeline-playhead ${scrubbing ? "dragging" : ""}`} role="slider" tabIndex={0} aria-label="Toiston kohta" aria-valuemin={0} aria-valuemax={Math.round(timeline.totalMs)} aria-valuenow={Math.round(playbackPositionMs)} aria-valuetext={formatTimelineTime(playbackPositionMs)} style={{ left: `${playbackPositionMs / timelineWindowMs * 100}%` }} onPointerDown={event => { event.preventDefault(); setPlaying(false); setScrubbing(true); seekTimeline(event.clientX); }} onKeyDown={event => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return; event.preventDefault(); setPlaying(false); setPlaybackElapsedMs(current => Math.min(timeline.totalMs, Math.max(0, current + (event.key === "ArrowRight" ? 100 : -100)))); }}><span>{formatTimelineTime(playbackPositionMs)}</span></div></div></div>
        </aside>}
      </div>
      {clearRoutesOpen && <ConfirmDialog title="Tyhjennetäänkö reitit?" description={`Harjoitteesta poistetaan ${draft.paths.length === 1 ? "1 reitti" : `${draft.paths.length} reittiä`}. Tätä ei voi perua.`} confirmLabel="Tyhjennä reitit" cancelLabel="Peruuta" onCancel={() => setClearRoutesOpen(false)} onConfirm={() => { updateDraft(current => ({ ...current, paths: [] })); setSelectedPathId(null); setRoutesOpen(false); setPlaying(false); setPlaybackElapsedMs(0); setClearRoutesOpen(false); }} />}
    </section>
  </main>;
}
