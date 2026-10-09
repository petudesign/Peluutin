import { CirclePlus, Layers3, Route, Shapes, Trash2, Type, X } from "lucide-react";
import type { ExerciseDraft, ExerciseLayerKind } from "./exerciseTypes";

interface ExerciseLayersPanelProps {
  draft: ExerciseDraft;
  selectedMarkerIds: string[];
  selectedPathId: string | null;
  selectedAnnotationIds: string[];
  onSelect: (kind: ExerciseLayerKind, id: string) => void;
  onRemove: (kind: ExerciseLayerKind, id: string) => void;
  onClose: () => void;
}

const shapeNames = { draw: "Vapaa piirto", line: "Viiva", arrow: "Nuoli", rectangle: "Suorakulmio", circle: "Ympyrä", text: "Teksti" };
const routeNames = { pass: "Syöttö", run: "Juoksu", dribble: "Kuljetus", shot: "Veto" };

export function ExerciseLayersPanel({ draft, selectedMarkerIds, selectedPathId, selectedAnnotationIds, onSelect, onRemove, onClose }: ExerciseLayersPanelProps) {
  const counts = new Map<string, number>();
  const numbered = (kind: string, label: string) => {
    const number = (counts.get(kind) || 0) + 1;
    counts.set(kind, number);
    return `${label} ${number}`;
  };
  const groups = [
    {
      title: "Pelaajat ja välineet", kind: "marker" as const,
      items: draft.markers.map(marker => ({
        id: marker.id,
        name: marker.kind === "player" ? marker.name : numbered(marker.kind, marker.name),
        detail: marker.kind === "player" ? (marker.team === "red" ? "Vastustaja" : "Oma joukkue") : "Väline",
        Icon: CirclePlus,
        selected: selectedMarkerIds.includes(marker.id),
      })),
    },
    {
      title: "Reitit", kind: "path" as const,
      items: draft.paths.map(path => ({
        id: path.id, name: numbered(path.kind, routeNames[path.kind]),
        detail: `${draft.markers.find(marker => marker.id === path.fromId)?.name || "Lähtö"} → ${draft.markers.find(marker => marker.id === path.toId)?.name || "Kenttäkohta"}`,
        Icon: Route, selected: selectedPathId === path.id,
      })),
    },
    {
      title: "Piirrokset ja tekstit", kind: "annotation" as const,
      items: draft.annotations.map(item => ({
        id: item.id, name: numbered(item.kind, shapeNames[item.kind]),
        detail: item.kind === "text" ? (item.text || "Tyhjä teksti") : "Piirros",
        Icon: item.kind === "text" ? Type : Shapes, selected: selectedAnnotationIds.includes(item.id),
      })),
    },
  ];
  const count = draft.markers.length + draft.paths.length + draft.annotations.length;
  return <aside className="exercise-layers-panel" aria-label="Harjoitteen tasot" id="exercise-layers-panel">
    <div className="exercise-popover-title"><span><Layers3 size={16} />Tasot <b>{count}</b></span><button onClick={onClose} aria-label="Sulje tasot"><X size={16} /></button></div>
    <div className="exercise-layers-list">
      {count === 0 && <p className="exercise-layers-empty">Ei vielä elementtejä. Lisää pelaajia, välineitä tai piirroksia kentälle.</p>}
      {groups.filter(group => group.items.length > 0).map(group => <section key={group.kind} aria-label={group.title}>
        <h2>{group.title}<span>{group.items.length}</span></h2>
        <ul>{group.items.map(({ id, name, detail, Icon, selected }) => <li key={id} className={selected ? "active" : ""}>
          <button className="exercise-layer-select" aria-pressed={selected} onClick={() => onSelect(group.kind, id)}><Icon size={16} /><span><b>{name}</b><small>{detail}</small></span></button>
          <button className="exercise-layer-delete" onClick={() => onRemove(group.kind, id)} aria-label={`Poista ${name}`} title={`Poista ${name}`}><Trash2 size={16} /></button>
        </li>)}</ul>
      </section>)}
    </div>
  </aside>;
}
