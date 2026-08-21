import { useEffect, useMemo, useState } from "react";
import type { Team } from "../../types";
import { ExerciseCanvas } from "./ExerciseCanvas";
import type { ExerciseDraft, ExerciseMarker, ExercisePath, ExerciseTool, ExerciseView } from "./exerciseTypes";

interface ExercisePlannerProps {
  team: Team;
  theme: "light" | "dark";
  onBack: () => void;
  onToggleTheme: () => void;
}

const STORAGE_KEY = "peluutin-exercise-draft-v1";

function seedDraft(team: Team): ExerciseDraft {
  const names = team.players.map((player) => ({ name: player.name, number: player.number }));
  const fallback = ["Aino", "Leo", "Sofia", "Miro", "Eeli", "Noel"];
  const spots: Array<[number, number]> = [[-3.6, 2.2], [-1.4, 1.2], [-3.2, -1.2], [2.8, 2], [1.3, .6], [3.3, -1.5]];
  const markers: ExerciseMarker[] = spots.map(([x, z], index) => ({
    id: `player-${index + 1}`,
    kind: "player",
    team: index < 3 ? "blue" : "red",
    name: names[index]?.name || fallback[index],
    number: names[index]?.number || index + 1,
    x,
    z,
  }));
  markers.push({ id: "ball-1", kind: "ball", name: "Pallo", x: -0.5, z: 0.1 });
  return {
    name: "Syöttö ja liike",
    markers,
    paths: [{ id: "path-1", kind: "pass", fromId: "player-2", toId: "player-5" }],
    updatedAt: new Date().toISOString(),
  };
}

function loadDraft(team: Team) {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${team.id}`);
    if (!stored) return seedDraft(team);
    const draft = JSON.parse(stored) as ExerciseDraft;
    return Array.isArray(draft.markers) && Array.isArray(draft.paths) ? draft : seedDraft(team);
  } catch {
    return seedDraft(team);
  }
}

export function ExercisePlanner({ team, theme, onBack, onToggleTheme }: ExercisePlannerProps) {
  const [draft, setDraft] = useState(() => loadDraft(team));
  const [view, setView] = useState<ExerciseView>("3d");
  const [tool, setTool] = useState<ExerciseTool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pathStartId, setPathStartId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [saveLabel, setSaveLabel] = useState("Tallennettu");

  const selected = useMemo(() => draft.markers.find((marker) => marker.id === selectedId) || null, [draft.markers, selectedId]);

  useEffect(() => {
    setSaveLabel("Tallennetaan…");
    const timer = window.setTimeout(() => {
      localStorage.setItem(`${STORAGE_KEY}-${team.id}`, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }));
      setSaveLabel("Tallennettu");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft, team.id]);

  const addMarker = (kind: ExerciseTool, x = 0, z = 0) => {
    const id = `${kind}-${Date.now()}`;
    const count = draft.markers.filter((marker) => marker.kind === "player").length + 1;
    const marker: ExerciseMarker = kind === "ball"
      ? { id, kind: "ball", name: "Pallo", x, z }
      : { id, kind: "player", team: kind === "player-red" ? "red" : "blue", name: `Pelaaja ${count}`, number: count, x, z };
    setDraft((current) => ({ ...current, markers: [...current.markers, marker] }));
    setSelectedId(id);
    setTool("select");
  };

  const selectMarker = (id: string | null) => {
    if (!id) return setSelectedId(null);
    if ((tool === "pass" || tool === "run") && selectedId && selectedId !== id) {
      const path: ExercisePath = { id: `path-${Date.now()}`, kind: tool, fromId: selectedId, toId: id };
      setDraft((current) => ({ ...current, paths: [...current.paths, path] }));
      setPathStartId(null);
      setSelectedId(id);
      setTool("select");
      return;
    }
    setSelectedId(id);
    if (tool === "pass" || tool === "run") setPathStartId(id);
  };

  const setActiveTool = (next: ExerciseTool) => {
    setTool(next);
    setPathStartId(next === "pass" || next === "run" ? selectedId : null);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setDraft((current) => ({
      ...current,
      markers: current.markers.filter((marker) => marker.id !== selectedId),
      paths: current.paths.filter((path) => path.fromId !== selectedId && path.toId !== selectedId),
    }));
    setSelectedId(null);
  };

  return (
    <main className="exercise-shell">
      <div className="exercise-mobile-block">
        <img src="/assets/peluutin-logo.svg" alt="Peluutin" />
        <h1>Harjoituseditori tarvitsee suuremman näytön</h1>
        <p>Avaa Harjoitteet tabletilla tai tietokoneella. Otteluiden peluutus toimii edelleen puhelimella normaalisti.</p>
        <button onClick={onBack}>Takaisin otteluihin</button>
      </div>

      <section className="exercise-desktop-app">
        <header className="exercise-header">
          <button className="exercise-brand" onClick={onBack} aria-label="Takaisin Peluuttimeen">
            <img src="/favicon.svg" alt="" />
            <span>Peluutin</span>
          </button>
          <span className="exercise-divider" />
          <input
            className="exercise-title-input"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value.slice(0, 60) }))}
            aria-label="Harjoitteen nimi"
          />
          <div className="exercise-header-actions">
            <span className="exercise-save-state">{saveLabel}</span>
            <div className="exercise-view-switch" aria-label="Kentän näkymä">
              <button className={view === "2d" ? "active" : ""} onClick={() => setView("2d")}>2D</button>
              <button className={view === "3d" ? "active" : ""} onClick={() => setView("3d")}>3D</button>
            </div>
            <button className="exercise-theme-button" onClick={onToggleTheme}>{theme === "dark" ? "Vaalea" : "Tumma"}</button>
            <button className="exercise-back-button" onClick={onBack}>Ottelut</button>
          </div>
        </header>

        <div className="exercise-workspace">
          <aside className="exercise-tools" aria-label="Harjoitteen työkalut">
            <h2>Lisää kentälle</h2>
            <button className={tool === "select" ? "active" : ""} onClick={() => setActiveTool("select")}><span>Valitse</span><small>Siirrä objekteja</small></button>
            <button className={tool === "player-blue" ? "active" : ""} onClick={() => setActiveTool("player-blue")}><span>Sininen pelaaja</span><small>Klikkaa kenttää</small></button>
            <button className={tool === "player-red" ? "active" : ""} onClick={() => setActiveTool("player-red")}><span>Punainen pelaaja</span><small>Klikkaa kenttää</small></button>
            <button className={tool === "ball" ? "active" : ""} onClick={() => setActiveTool("ball")}><span>Pallo</span><small>Klikkaa kenttää</small></button>
            <div className="exercise-tool-rule" />
            <button disabled={!selectedId} className={tool === "pass" ? "active" : ""} onClick={() => setActiveTool("pass")}><span>Syöttö</span><small>Valitse kohde</small></button>
            <button disabled={!selectedId} className={tool === "run" ? "active" : ""} onClick={() => setActiveTool("run")}><span>Juoksu</span><small>Valitse kohde</small></button>
          </aside>

          <section className="exercise-stage">
            <ExerciseCanvas
              view={view}
              markers={draft.markers}
              paths={draft.paths}
              selectedId={selectedId}
              playing={playing}
              onSelect={selectMarker}
              onMove={(id, x, z) => setDraft((current) => ({ ...current, markers: current.markers.map((marker) => marker.id === id ? { ...marker, x, z } : marker) }))}
              onPitchClick={(x, z) => {
                if (tool === "player-blue" || tool === "player-red" || tool === "ball") addMarker(tool, x, z);
              }}
            />
            <div className="exercise-stage-hint">
              {pathStartId ? "Valitse reitin päätepiste kentältä" : view === "3d" ? "Kierrä näkymää hiirellä ja zoomaa rullalla" : "Raahaa pelaajat haluamiisi paikkoihin"}
            </div>
            <div className="exercise-playback">
              <button className={playing ? "active" : ""} onClick={() => setPlaying((current) => !current)}>{playing ? "Pysäytä" : "Toista"}</button>
              <span>{draft.paths.length} reittiä</span>
              <button onClick={() => setDraft((current) => ({ ...current, paths: [] }))} disabled={!draft.paths.length}>Tyhjennä reitit</button>
            </div>
          </section>

          <aside className="exercise-inspector">
            <h2>{selected ? "Valittu objekti" : "Harjoite"}</h2>
            {selected ? (
              <>
                <label>Nimi<input value={selected.name} onChange={(event) => setDraft((current) => ({ ...current, markers: current.markers.map((marker) => marker.id === selected.id ? { ...marker, name: event.target.value.slice(0, 28) } : marker) }))} /></label>
                {selected.kind === "player" && <label>Numero<input type="number" min="0" max="99" value={selected.number || 0} onChange={(event) => setDraft((current) => ({ ...current, markers: current.markers.map((marker) => marker.id === selected.id ? { ...marker, number: Number(event.target.value) } : marker) }))} /></label>}
                <dl><div><dt>Tyyppi</dt><dd>{selected.kind === "ball" ? "Pallo" : selected.team === "red" ? "Punainen pelaaja" : "Sininen pelaaja"}</dd></div><div><dt>Sijainti</dt><dd>{selected.x.toFixed(1)}, {selected.z.toFixed(1)}</dd></div></dl>
                <button className="exercise-delete-button" onClick={removeSelected}>Poista kentältä</button>
              </>
            ) : (
              <>
                <p>Valitse pelaaja tai pallo muokataksesi sitä. Voit raahata objekteja sekä 2D- että 3D-näkymässä.</p>
                <dl><div><dt>Pelaajia</dt><dd>{draft.markers.filter((marker) => marker.kind === "player").length}</dd></div><div><dt>Reittejä</dt><dd>{draft.paths.length}</dd></div></dl>
              </>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
