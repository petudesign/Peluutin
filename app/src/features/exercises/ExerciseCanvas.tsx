import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { RotateCcw, ZoomIn } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildExerciseTimeline, EXERCISE_PITCH_DIMENSIONS, getExercise2dFitZoom, getExerciseMarkerColor, getExercisePathColor, getExerciseTimelineProgressAt, type ExerciseAnnotation, type ExerciseGoalSize, type ExerciseMarker, type ExercisePath, type ExercisePitchOrientation, type ExercisePitchPreset, type ExercisePitchStyle, type ExerciseTimelineEntry, type ExerciseTool, type ExerciseView } from "./exerciseTypes";

interface ExerciseCanvasProps {
  theme: "light" | "dark"; view: ExerciseView; tool: ExerciseTool; markers: ExerciseMarker[]; paths: ExercisePath[]; annotations: ExerciseAnnotation[]; goalSize: ExerciseGoalSize; pitchPreset: ExercisePitchPreset; pitchOrientation: ExercisePitchOrientation; pitchStyle: ExercisePitchStyle; showNames: boolean;
  zoomScale?: number; labelScale?: number; showResetAtDefault?: boolean; interactive?: boolean;
  selectedIds: string[]; selectedAnnotationId: string | null; selectedPathId: string | null; editingTextId: string | null; playbackPositionMs: number; showPlaybackFrame: boolean;
  onSelect: (id: string | null, additive?: boolean) => void; onBoxSelect: (ids: string[], additive: boolean) => void; onSelectAnnotation: (id: string) => void; onSelectPath: (id: string) => void;
  onChangeText: (id: string, text: string) => void; onFinishTextEdit: (id: string) => void; onMove: (id: string, x: number, z: number) => void;
  onPitchPointer: (phase: "down" | "move" | "up", x: number, z: number) => void; onEraseAnnotation: (id: string) => void;
}

const LINE = "#b8c8cc", TWO_D_VERTICAL_OFFSET = -.38;

function CameraControls({ view, pitchPreset, pitchOrientation, zoomScale = 1, resetSignal, onZoomChange }: { view: ExerciseView; pitchPreset: ExercisePitchPreset; pitchOrientation: ExercisePitchOrientation; zoomScale?: number; resetSignal: number; onZoomChange: (percent: number) => void }) {
  const { camera, gl, size } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controlsRef.current = controls;
    controls.target.set(0, 0, 0); controls.enableDamping = true; controls.enableRotate = false; controls.enablePan = false;
    let defaultZoom = 1, defaultDistance = 1;
    if (view === "2d") {
      const orthographic = camera as THREE.OrthographicCamera, fitZoom = getExercise2dFitZoom(size.width, size.height, pitchPreset, pitchOrientation) * zoomScale;
      camera.position.z = .01 + TWO_D_VERTICAL_OFFSET; controls.target.set(0, 0, TWO_D_VERTICAL_OFFSET);
      orthographic.zoom = fitZoom; orthographic.updateProjectionMatrix(); controls.minZoom = fitZoom * .72; controls.maxZoom = fitZoom * 2.4; controls.update();
      defaultZoom = fitZoom;
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    } else {
      const scale = EXERCISE_PITCH_DIMENSIONS[pitchPreset].groundLength / EXERCISE_PITCH_DIMENSIONS.training.groundLength;
      if (size.width / size.height < 1.15 || pitchOrientation === "portrait") camera.position.set(0, 12 * scale, 17 * scale);
      else camera.position.set(0, 8 * scale, 8.8 * scale);
      controls.minDistance = 7 * scale; controls.maxDistance = 30 * scale; controls.maxPolarAngle = Math.PI / 2.1;
      defaultDistance = camera.position.distanceTo(controls.target);
    }
    const reportZoom = () => onZoomChange(Math.round(view === "2d" ? (camera as THREE.OrthographicCamera).zoom / defaultZoom * 100 : defaultDistance / camera.position.distanceTo(controls.target) * 100));
    const setCameraDrag = (enabled: boolean) => { controls.enableRotate = enabled && view === "3d"; controls.enablePan = enabled; };
    const keyDown = (event: KeyboardEvent) => { if (event.key === "Shift") setCameraDrag(true); };
    const keyUp = (event: KeyboardEvent) => { if (event.key === "Shift") setCameraDrag(false); };
    const pointerDown = (event: PointerEvent) => { if (event.shiftKey) setCameraDrag(true); };
    const pointerUp = () => setCameraDrag(false);
    const blur = () => setCameraDrag(false);
    gl.domElement.addEventListener("pointerdown", pointerDown, true); window.addEventListener("pointerup", pointerUp); window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp); window.addEventListener("blur", blur); controls.addEventListener("change", reportZoom); controls.update(); controls.saveState(); reportZoom();
    return () => { controlsRef.current = null; gl.domElement.removeEventListener("pointerdown", pointerDown, true); window.removeEventListener("pointerup", pointerUp); window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); window.removeEventListener("blur", blur); controls.removeEventListener("change", reportZoom); controls.dispose(); };
  }, [camera, gl, onZoomChange, pitchOrientation, pitchPreset, size.height, size.width, view, zoomScale]);
  useEffect(() => { const controls = controlsRef.current; if (!controls) return; controls.reset(); controls.update(); onZoomChange(100); }, [onZoomChange, resetSignal]);
  return null;
}

function PitchLine({ points, color = LINE, y = .055 }: { points: Array<[number, number]>; color?: string; y?: number }) {
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, y, z))), [points, y]);
  const material = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: true, opacity: .96 }), [color]);
  const line = useMemo(() => new THREE.Line(geometry, material), [geometry, material]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <primitive object={line} />;
}

function arc(cx: number, cz: number, radius: number, from: number, to: number, count = 28): Array<[number, number]> {
  return Array.from({ length: count + 1 }, (_, index) => { const angle = from + (to - from) * index / count; return [cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius]; });
}

const GOAL_DIMENSIONS: Record<ExerciseGoalSize, { width: number; height: number; depth: number }> = {
  small: { width: 1.15, height: .3, depth: .36 },
  youth: { width: 1.4, height: .46, depth: .52 },
  full: { width: 2.05, height: .58, depth: .65 },
};

function GoalNet({ x, back, width, height }: { x: number; back: number; width: number; height: number }) {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [], halfWidth = width / 2;
    const segment = (a: [number, number, number], b: [number, number, number]) => points.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
    for (let index = 0; index <= 6; index += 1) {
      const z = -halfWidth + width * index / 6;
      segment([back, .02, z], [back, height, z]);
      segment([x, height, z], [back, height, z]);
    }
    for (let index = 0; index <= 4; index += 1) {
      const y = .02 + (height - .02) * index / 4;
      segment([back, y, -halfWidth], [back, y, halfWidth]);
      segment([x, y, -halfWidth], [back, y, -halfWidth]);
      segment([x, y, halfWidth], [back, y, halfWidth]);
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [back, height, width, x]);
  const material = useMemo(() => new THREE.LineBasicMaterial({ color: "#91a5ad", transparent: true, opacity: .68 }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <lineSegments geometry={geometry} material={material} />;
}

function Goal({ x, flip = false, size }: { x: number; flip?: boolean; size: ExerciseGoalSize }) {
  const dimensions = GOAL_DIMENSIONS[size], depth = flip ? dimensions.depth : -dimensions.depth, back = x + depth, middle = x + depth / 2, halfWidth = dimensions.width / 2;
  return <group>
    {[x, back].flatMap((postX, row) => [-halfWidth, halfWidth].map(z => <mesh key={`${row}-${z}`} position={[postX, dimensions.height / 2, z]}><cylinderGeometry args={[.024, .024, dimensions.height, 12]} /><meshStandardMaterial color="#e4ebed" roughness={.45} /></mesh>))}
    {[x, back].map(postX => <mesh key={postX} position={[postX, dimensions.height, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.024, .024, dimensions.width, 12]} /><meshStandardMaterial color="#e4ebed" roughness={.45} /></mesh>)}
    {[-halfWidth, halfWidth].map(z => <mesh key={z} position={[middle, dimensions.height, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.02, .02, Math.abs(depth), 10]} /><meshStandardMaterial color="#d7e1e4" roughness={.5} /></mesh>)}
    <GoalNet x={x} back={back} width={dimensions.width} height={dimensions.height} />
  </group>;
}

function Pitch({ goalSize, preset, style }: { goalSize: ExerciseGoalSize; preset: ExercisePitchPreset; style: ExercisePitchStyle }) {
  const dimensions = EXERCISE_PITCH_DIMENSIONS[preset], halfLength = dimensions.length / 2, halfWidth = dimensions.width / 2;
  const scaleX = dimensions.length / EXERCISE_PITCH_DIMENSIONS.training.length, scaleZ = dimensions.width / EXERCISE_PITCH_DIMENSIONS.training.width;
  const centerRadius = 1.03 * scaleZ, center = useMemo(() => arc(0, 0, centerRadius, 0, Math.PI * 2, 56), [centerRadius]), boxArcAngle = Math.acos(.375), stripeWidth = dimensions.groundLength / 12;
  const stripeA = style === "dark" ? "#101a1f" : "#286b39", stripeB = style === "dark" ? "#17252a" : "#2f7640";
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[dimensions.groundLength, dimensions.groundWidth]} /><meshStandardMaterial color={stripeA} roughness={.96} /></mesh>
    {Array.from({ length: 12 }, (_, index) => <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[-dimensions.groundLength / 2 + stripeWidth / 2 + index * stripeWidth, .006, 0]}><planeGeometry args={[stripeWidth, dimensions.groundWidth]} /><meshStandardMaterial color={index % 2 ? stripeB : stripeA} roughness={.98} /></mesh>)}
    <PitchLine points={[[-halfLength, -halfWidth], [halfLength, -halfWidth], [halfLength, halfWidth], [-halfLength, halfWidth], [-halfLength, -halfWidth]]} /><PitchLine points={[[0, -halfWidth], [0, halfWidth]]} /><PitchLine points={center} />
    {[1, -1].map(side => { const end = side * halfLength, penalty = side * (halfLength - 1.33 * scaleX), goal = side * (halfLength - .57 * scaleX), spot = side * (halfLength - 1.03 * scaleX), penaltyHalfWidth = 2.05 * scaleZ, goalHalfWidth = .9 * scaleZ; return <group key={side}><PitchLine points={[[end, -penaltyHalfWidth], [penalty, -penaltyHalfWidth], [penalty, penaltyHalfWidth], [end, penaltyHalfWidth]]} /><PitchLine points={[[end, -goalHalfWidth], [goal, -goalHalfWidth], [goal, goalHalfWidth], [end, goalHalfWidth]]} /><mesh position={[spot, .06, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.045, 18]} /><meshBasicMaterial color={LINE} /></mesh><PitchLine points={arc(spot, 0, .8 * scaleZ, side > 0 ? Math.PI - boxArcAngle : -boxArcAngle, side > 0 ? Math.PI + boxArcAngle : boxArcAngle)} /></group>; })}
    {([[-halfLength, -halfWidth, 0, Math.PI / 2], [halfLength, -halfWidth, Math.PI / 2, Math.PI], [-halfLength, halfWidth, -Math.PI / 2, 0], [halfLength, halfWidth, Math.PI, Math.PI * 1.5]] as Array<[number, number, number, number]>).map(([x, z, from, to], index) => <PitchLine key={index} points={arc(x, z, .18 * scaleZ, from, to, 10)} />)}
    <mesh position={[0, .06, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.05, 18]} /><meshBasicMaterial color={LINE} /></mesh><Goal x={-halfLength - .04} size={goalSize} /><Goal x={halfLength + .04} flip size={goalSize} />
  </group>;
}

function Boards({ preset }: { preset: ExercisePitchPreset }) {
  const [logo, setLogo] = useState<THREE.Texture | null>(null);
  useEffect(() => { let active = true, loaded: THREE.Texture | undefined; new THREE.TextureLoader().load("/icons/peluutin-192.png", texture => { loaded = texture; texture.colorSpace = THREE.SRGBColorSpace; if (active) setLogo(texture); }); return () => { active = false; loaded?.dispose(); }; }, []);
  const wordmark = useMemo(() => { const canvas = document.createElement("canvas"); canvas.width = 300; canvas.height = 80; const context = canvas.getContext("2d")!; context.font = "800 42px Manrope, sans-serif"; context.textAlign = "center"; context.fillStyle = "#f5f8fa"; context.fillText("Peluutin", 150, 53); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture; }, []);
  useEffect(() => () => wordmark.dispose(), [wordmark]);
  const boards = useMemo(() => { const dimensions = EXERCISE_PITCH_DIMENSIONS[preset], result: Array<{ x: number; z: number; rot: number; w: number; branded?: boolean }> = [], longCount = Math.max(6, Math.floor(dimensions.length / 1.8)), shortCount = Math.max(4, Math.floor(dimensions.width / 1.4)), longW = dimensions.length / longCount * .92, shortW = dimensions.width / shortCount * .88, brandedLeft = Math.floor((longCount - 1) / 2), brandedRight = Math.ceil((longCount - 1) / 2); for (let index = 0; index < longCount; index += 1) { const x = -dimensions.length / 2 + dimensions.length * (index + .5) / longCount, branded = index === brandedLeft || index === brandedRight; result.push({ x, z: -dimensions.width / 2 - .33, rot: 0, w: longW, branded }, { x, z: dimensions.width / 2 + .33, rot: 0, w: longW, branded }); } for (let index = 0; index < shortCount; index += 1) { const z = -dimensions.width / 2 + dimensions.width * (index + .5) / shortCount; if (Math.abs(z) < 1.3) continue; result.push({ x: -dimensions.length / 2 - .33, z, rot: Math.PI / 2, w: shortW }, { x: dimensions.length / 2 + .33, z, rot: Math.PI / 2, w: shortW }); } return result; }, [preset]);
  return <group>{boards.map((board, index) => { const innerSide = board.z > 0 ? -1 : 1; return <group key={index}><mesh position={[board.x, .13, board.z]} rotation={[0, board.rot, 0]}><boxGeometry args={[board.w, .28, .07]} /><meshStandardMaterial color={board.branded ? "#17324d" : index % 3 === 0 ? "#194263" : "#162934"} emissive={board.branded ? "#0d2840" : index % 3 === 0 ? "#0d3658" : "#091820"} emissiveIntensity={.45} /></mesh>{board.branded && <group position={[board.x, .14, board.z + innerSide * .041]} rotation={[0, innerSide < 0 ? Math.PI : 0, 0]}>{logo && <mesh position={[-.47, 0, 0]}><planeGeometry args={[.25, .25]} /><meshBasicMaterial map={logo} transparent toneMapped={false} /></mesh>}<mesh position={[.18, 0, 0]}><planeGeometry args={[.9, .24]} /><meshBasicMaterial map={wordmark} transparent toneMapped={false} /></mesh></group>}</group>; })}</group>;
}

function textureFor(text: string, fontSize = 28, theme: "light" | "dark" = "dark") {
  const canvas = document.createElement("canvas"); canvas.width = 320; canvas.height = 88; const context = canvas.getContext("2d")!; context.font = `700 ${fontSize}px Manrope, sans-serif`; context.textAlign = "center";
  const width = Math.min(300, context.measureText(text).width + 32), left = (320 - width) / 2; context.fillStyle = theme === "dark" ? "rgba(23,50,77,.97)" : "rgba(248,251,251,.97)"; context.roundRect(left, 5, width, 52, 11); context.fill();
  if (theme === "light") { context.strokeStyle = "rgba(27,60,72,.22)"; context.lineWidth = 2; context.stroke(); }
  context.fillStyle = theme === "dark" ? "#fff" : "#17303a"; context.fillText(text, 160, 42); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function soccerBallTexture() {
  const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 128; const context = canvas.getContext("2d")!;
  context.fillStyle = "#f4f3ec"; context.fillRect(0, 0, canvas.width, canvas.height); context.strokeStyle = "#9da2a3"; context.lineWidth = 3;
  const patches = [[34, 34], [112, 25], [204, 38], [74, 96], [166, 91], [246, 102]];
  patches.forEach(([cx, cy], index) => {
    context.beginPath();
    for (let point = 0; point < 5; point += 1) { const angle = -Math.PI / 2 + point * Math.PI * 2 / 5, x = cx + Math.cos(angle) * 13, y = cy + Math.sin(angle) * 13; point ? context.lineTo(x, y) : context.moveTo(x, y); }
    context.closePath(); context.fillStyle = "#20292d"; context.fill();
    const next = patches[(index + 1) % patches.length]; context.beginPath(); context.moveTo(cx, cy); context.lineTo(next[0], next[1]); context.stroke();
  });
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping; return texture;
}

function SoccerBall({ radius, castShadow = false }: { radius: number; castShadow?: boolean }) {
  const ballMap = useMemo(soccerBallTexture, []);
  useEffect(() => () => ballMap.dispose(), [ballMap]);
  return <><mesh castShadow={castShadow}><sphereGeometry args={[radius, 24, 24]} /><meshStandardMaterial map={ballMap} color="#f8f7f0" roughness={.72} /></mesh><mesh position={[0, radius * .97, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[radius * .37, 5]} /><meshBasicMaterial color="#182126" toneMapped={false} /></mesh></>;
}

function Marker({ marker, animatedPosition, selected, theme, view, showName, labelScale = 1, interactive = true, onPointerDown }: { marker: ExerciseMarker; animatedPosition?: THREE.Vector3; selected: boolean; theme: "light" | "dark"; view: ExerciseView; showName: boolean; labelScale?: number; interactive?: boolean; onPointerDown: (id: string, additive: boolean) => void }) {
  const texture = useMemo(() => textureFor(marker.kind === "ball" ? "Pallo" : marker.name, view === "2d" ? 42 : 34, theme), [marker, theme, view]); useEffect(() => () => texture.dispose(), [texture]);
  const color = getExerciseMarkerColor(marker, theme), ringColor = marker.team === "red" ? "#d6dde0" : "#f2f6f7";
  const isEquipment = marker.kind !== "player" && marker.kind !== "ball", baseY = isEquipment ? .02 : .11;
  const goalRadius = GOAL_DIMENSIONS[marker.goalSize ?? "youth"].width / 2;
  const selectionRadius = marker.kind === "player" ? [.26, .31] : marker.kind === "bench" || marker.kind === "ladder" ? [.62, .69] : marker.kind === "dummy" || marker.kind === "tall-cone" ? [.2, .25] : marker.kind === "goal" ? [goalRadius + .08, goalRadius + .14] : [.14, .19];
  const nameY = marker.kind === "dummy" && view === "3d" ? .82 : marker.kind === "player" ? .31 : .24;
  const nameZ = view === "2d" && marker.kind === "dummy" ? -.3 : view === "2d" && marker.kind !== "player" ? -.2 : 0;
  const spriteScale = ((view === "2d" ? [1.52, .42, 1] : [1.35, .37, 1]).map(value => value * labelScale)) as [number, number, number];
  return <group position={[animatedPosition?.x ?? marker.x, baseY, animatedPosition?.z ?? marker.z]} onPointerDown={(event: ThreeEvent<PointerEvent>) => { if (!interactive) return; event.stopPropagation(); onPointerDown(marker.id, event.shiftKey); }}>
    {marker.kind === "ball" && <SoccerBall radius={.1} castShadow={view === "3d"} />}
    {marker.kind === "player" && <><mesh castShadow={view === "3d"}><cylinderGeometry args={[.19, .19, .12, 32]} /><meshStandardMaterial color={color} roughness={.4} emissive={selected ? color : "#000"} emissiveIntensity={selected ? .35 : 0} /></mesh><mesh position={[0, .065, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.14, .18, 32]} /><meshBasicMaterial color={ringColor} /></mesh></>}
    {marker.kind === "cone" && <group><mesh position={[0, .016, 0]}><cylinderGeometry args={[.11, .13, .032, 24]} /><meshStandardMaterial color={color} roughness={.65} /></mesh><mesh position={[0, .034, 0]}><torusGeometry args={[.065, .012, 8, 24]} /><meshStandardMaterial color="#ffad55" roughness={.55} /></mesh></group>}
    {marker.kind === "tall-cone" && <group><mesh position={[0, .14, 0]} castShadow={view === "3d"}><coneGeometry args={[.13, .28, 24]} /><meshStandardMaterial color={color} roughness={.55} /></mesh><mesh position={[0, .018, 0]}><cylinderGeometry args={[.17, .17, .036, 24]} /><meshStandardMaterial color="#c94f17" roughness={.65} /></mesh></group>}
    {marker.kind === "bench" && <group rotation={[0, THREE.MathUtils.degToRad(marker.rotation ?? 0), 0]}><mesh position={[0, .16, 0]} castShadow={view === "3d"}><boxGeometry args={[1.1, .13, .28]} /><meshStandardMaterial color={color} roughness={.7} /></mesh>{[-.38, .38].map(x => <mesh key={x} position={[x, .07, 0]}><boxGeometry args={[.09, .14, .22]} /><meshStandardMaterial color="#52636b" roughness={.8} /></mesh>)}</group>}
    {marker.kind === "ladder" && <group rotation={[0, THREE.MathUtils.degToRad(marker.rotation ?? 0), 0]}>{[-.22, .22].map(z => <mesh key={z} position={[0, .018, z]}><boxGeometry args={[1.2, .025, .035]} /><meshStandardMaterial color={color} roughness={.65} /></mesh>)}{[-.48, -.24, 0, .24, .48].map(x => <mesh key={x} position={[x, .02, 0]}><boxGeometry args={[.035, .028, .44]} /><meshStandardMaterial color={color} roughness={.65} /></mesh>)}</group>}
    {marker.kind === "dummy" && <group rotation={[0, THREE.MathUtils.degToRad(marker.rotation ?? 0), 0]}>{view === "2d" ? <group><mesh position={[0, .032, .01]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[.34, .14]} /><meshBasicMaterial color="#26343a" /></mesh><mesh position={[0, .036, .01]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[.29, .09]} /><meshBasicMaterial color={color} /></mesh><mesh position={[0, .041, -.145]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.09, 24]} /><meshBasicMaterial color="#26343a" /></mesh><mesh position={[0, .045, -.145]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.065, 24]} /><meshBasicMaterial color={color} /></mesh></group> : <group><mesh position={[0, .045, 0]}><boxGeometry args={[.31, .06, .09]} /><meshStandardMaterial color="#26343a" roughness={.7} /></mesh>{[-.085, .085].map(x => <mesh key={x} position={[x, .235, 0]}><cylinderGeometry args={[.014, .014, .34, 10]} /><meshStandardMaterial color={color} roughness={.5} /></mesh>)}<mesh position={[0, .43, 0]}><boxGeometry args={[.27, .28, .05]} /><meshStandardMaterial color={color} roughness={.5} emissive={selected ? "#526600" : "#000"} emissiveIntensity={selected ? .3 : 0} /></mesh><mesh position={[0, .65, 0]}><torusGeometry args={[.095, .02, 10, 24]} /><meshStandardMaterial color={color} roughness={.5} /></mesh></group>}</group>}
    {marker.kind === "goal" && <group rotation={[0, THREE.MathUtils.degToRad(marker.rotation ?? 0), 0]}><Goal x={0} flip size={marker.goalSize ?? "youth"} /></group>}
    {selected && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .01, 0]}><ringGeometry args={[selectionRadius[0], selectionRadius[1], 36]} /><meshBasicMaterial color="#f3a712" /></mesh>}{showName && <sprite position={[0, nameY, nameZ]} scale={spriteScale}><spriteMaterial map={texture} transparent depthTest={false} /></sprite>}
  </group>;
}

type PathTarget = { x: number; z: number; kind: ExerciseMarker["kind"] | "point" };
type PointerCaptureTarget = { setPointerCapture: (pointerId: number) => void; releasePointerCapture: (pointerId: number) => void };

function createPathCurve(path: ExercisePath, from: ExerciseMarker, to: PathTarget, inset = true) {
  const direction = new THREE.Vector3(to.x - from.x, 0, to.z - from.z).normalize();
  const fromRadius = inset ? from.kind === "ball" ? .18 : .25 : 0, toRadius = inset ? to.kind === "ball" ? .18 : to.kind === "point" ? 0 : .25 : 0;
  const start = new THREE.Vector3(from.x, .075, from.z).addScaledVector(direction, fromRadius), end = new THREE.Vector3(to.x, .075, to.z).addScaledVector(direction, -toRadius);
  if (Math.abs(path.curve ?? 0) < .01) return new THREE.LineCurve3(start, end);
  const midpoint = start.clone().lerp(end, .5), perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
  return new THREE.QuadraticBezierCurve3(start, midpoint.addScaledVector(perpendicular, start.distanceTo(end) * (path.curve ?? 0) * .38), end);
}

function SelectionBox({ start, end }: { start: { x: number; z: number }; end: { x: number; z: number } }) {
  const left = Math.min(start.x, end.x), right = Math.max(start.x, end.x), top = Math.min(start.z, end.z), bottom = Math.max(start.z, end.z);
  return <group><mesh position={[(left + right) / 2, .09, (top + bottom) / 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[right - left, bottom - top]} /><meshBasicMaterial color="#5da8ff" transparent opacity={.13} depthWrite={false} /></mesh><PitchLine y={.105} color="#75d7ff" points={[[left, top], [right, top], [right, bottom], [left, bottom], [left, top]]} /></group>;
}

function PathStroke({ curve, radius, color, dashed = false, opacity = .98 }: { curve: THREE.Curve<THREE.Vector3>; radius: number; color: string; dashed?: boolean; opacity?: number }) {
  if (!dashed) return <mesh><tubeGeometry args={[curve, 36, radius, 8, false]} /><meshBasicMaterial color={color} transparent opacity={opacity} /></mesh>;
  const count = Math.max(2, Math.ceil(curve.getLength() / .3));
  return <group>{Array.from({ length: count }, (_, index) => {
    const from = index / count, to = Math.min(1, from + .58 / count), segment = new THREE.LineCurve3(curve.getPoint(from), curve.getPoint(to));
    return <mesh key={index}><tubeGeometry args={[segment, 3, radius, 8, false]} /><meshBasicMaterial color={color} transparent opacity={opacity} /></mesh>;
  })}</group>;
}

function AnimatedPath({ path, from, to, theme, playbackPositionMs, showPlaybackFrame, timelineEntry, timelineTotalMs, selected, erase, onSelect }: { path: ExercisePath; from: ExerciseMarker; to: PathTarget; theme: "light" | "dark"; playbackPositionMs: number; showPlaybackFrame: boolean; timelineEntry: ExerciseTimelineEntry; timelineTotalMs: number; selected: boolean; erase: boolean; onSelect: (id: string) => void }) {
  const pulse = useRef<THREE.Group | null>(null);
  const curve = useMemo<THREE.Curve<THREE.Vector3>>(() => createPathCurve(path, from, to), [from, path, to]);
  const movementCurve = useMemo<THREE.Curve<THREE.Vector3>>(() => createPathCurve(path, from, to, false), [from, path, to]);
  const color = getExercisePathColor(path.kind, theme);
  useFrame(() => {
    if (!pulse.current) return;
    const playback = getExerciseTimelineProgressAt(playbackPositionMs, timelineEntry, timelineTotalMs), active = showPlaybackFrame && playback.active;
    pulse.current.visible = active;
    if (!active) return;
    const animatedCurve = path.kind === "dribble" ? movementCurve : curve;
    pulse.current.position.copy(animatedCurve.getPoint(playback.progress));
    if (path.kind === "pass" || path.kind === "shot") pulse.current.rotation.x = playback.progress * Math.PI * 4;
    else { const tangent = animatedCurve.getTangent(playback.progress); pulse.current.rotation.set(0, -Math.atan2(tangent.z, tangent.x), 0); }
  });
  const animatedBall = <SoccerBall radius={.13} />;
  const dashed = path.kind === "run" || path.kind === "dribble";
  return <group onPointerDown={(event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onSelect(path.id); }}>{selected && <PathStroke curve={curve} radius={.075} color="#fff" dashed={dashed} opacity={.7} />}<PathStroke curve={curve} radius={.042} color={erase ? "#ff766c" : color} dashed={dashed} /><mesh><tubeGeometry args={[curve, 20, .14, 6, false]} /><meshBasicMaterial transparent opacity={.001} depthWrite={false} /></mesh>{path.kind !== "run" && !(path.kind === "dribble" && from.kind === "ball") && <group ref={pulse} visible={false}>{path.kind === "dribble" ? <group position={[.23, .02, 0]}>{animatedBall}</group> : animatedBall}</group>}</group>;
}

function Annotation({ item, erase, editing, selected, theme, onErase, onSelect }: { item: ExerciseAnnotation; erase: boolean; editing: boolean; selected: boolean; theme: "light" | "dark"; onErase: (id: string) => void; onSelect: (id: string) => void }) {
  const click = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); erase ? onErase(item.id) : onSelect(item.id); };
  const texture = useMemo(() => item.kind === "text" ? textureFor(item.text || "Teksti", 28, theme) : null, [item.kind, item.text, theme]); useEffect(() => () => texture?.dispose(), [texture]);
  if (item.kind === "text") return editing ? null : <sprite onPointerDown={click} position={[item.points[0]?.x || 0, .16, item.points[0]?.z || 0]} scale={[1.8, .5, 1]}><spriteMaterial map={texture} transparent depthTest={false} /></sprite>;
  const first = item.points[0], last = item.points.at(-1); if (!first || !last) return null; let points = item.points.map(point => [point.x, point.z] as [number, number]);
  if (item.kind === "rectangle") points = [[first.x, first.z], [last.x, first.z], [last.x, last.z], [first.x, last.z], [first.x, first.z]];
  if (item.kind === "circle") { const radiusX = Math.abs(last.x - first.x), radiusZ = Math.abs(last.z - first.z); points = Array.from({ length: 41 }, (_, index) => { const angle = index / 40 * Math.PI * 2; return [first.x + Math.cos(angle) * radiusX, first.z + Math.sin(angle) * radiusZ]; }); }
  const curve = new THREE.CurvePath<THREE.Vector3>();
  for (let index = 1; index < points.length; index += 1) curve.add(new THREE.LineCurve3(new THREE.Vector3(points[index - 1][0], .09, points[index - 1][1]), new THREE.Vector3(points[index][0], .09, points[index][1])));
  const radius = ({ 1: .012, 2: .026, 3: .05 } as const)[item.width ?? 2];
  return <group onPointerDown={click}><mesh><tubeGeometry args={[curve, Math.max(1, points.length - 1), radius, 6, false]} /><meshBasicMaterial color={selected ? "#fff" : item.color} /></mesh></group>;
}

function TextEditorTracker({ item, inputRef, orientation }: { item: ExerciseAnnotation; inputRef: RefObject<HTMLInputElement | null>; orientation: ExercisePitchOrientation }) {
  const { camera, size } = useThree(), point = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => { if (!inputRef.current) return; const x = item.points[0]?.x || 0, z = item.points[0]?.z || 0; point.set(orientation === "portrait" ? z : x, .24, orientation === "portrait" ? -x : z).project(camera); inputRef.current.style.left = `${(point.x * .5 + .5) * size.width}px`; inputRef.current.style.top = `${(-point.y * .5 + .5) * size.height}px`; });
  return null;
}

function Scene(props: ExerciseCanvasProps & { editingInputRef: RefObject<HTMLInputElement | null>; resetSignal: number; onZoomChange: (percent: number) => void }) {
  const dragging = useRef<string | null>(null), [selectionBox, setSelectionBox] = useState<{ start: { x: number; z: number }; end: { x: number; z: number }; additive: boolean } | null>(null), markerMap = useMemo(() => Object.fromEntries(props.markers.map(marker => [marker.id, marker])), [props.markers]), editingText = props.annotations.find(item => item.id === props.editingTextId);
  const timeline = useMemo(() => buildExerciseTimeline(props.paths, props.markers), [props.markers, props.paths]);
  const timelineByPath = useMemo(() => new Map(timeline.entries.map(entry => [entry.pathId, entry])), [timeline.entries]);
  const animatedMarkerPositions = useMemo(() => {
    const positions = new Map<string, THREE.Vector3>();
    if (!props.showPlaybackFrame) return positions;
    props.paths.forEach(path => {
      if (path.kind !== "run" && path.kind !== "dribble") return;
      const from = markerMap[path.fromId], targetMarker = path.toId ? markerMap[path.toId] : null, to: PathTarget | null = targetMarker || (path.toPoint ? { ...path.toPoint, kind: "point" } : null), entry = timelineByPath.get(path.id);
      if (!from || !to || !entry) return;
      const playback = getExerciseTimelineProgressAt(props.playbackPositionMs, entry, timeline.totalMs);
      if (playback.active) positions.set(from.id, createPathCurve(path, from, to, false).getPoint(playback.progress));
    });
    return positions;
  }, [markerMap, props.paths, props.playbackPositionMs, props.showPlaybackFrame, timeline.totalMs, timelineByPath]);
  const dimensions = EXERCISE_PITCH_DIMENSIONS[props.pitchPreset], limitX = dimensions.length / 2 - .25, limitZ = dimensions.width / 2 - .25;
  const pitchPoint = (point: THREE.Vector3) => props.pitchOrientation === "portrait" ? { x: -point.z, z: point.x } : { x: point.x, z: point.z };
  const pointer = (phase: "down" | "move" | "up", event: ThreeEvent<PointerEvent>) => {
    const point = pitchPoint(event.point), bounded = { x: THREE.MathUtils.clamp(point.x, -limitX, limitX), z: THREE.MathUtils.clamp(point.z, -limitZ, limitZ) };
    if (phase === "move" && dragging.current) props.onMove(dragging.current, bounded.x, bounded.z);
    if (props.tool === "select" && !dragging.current && props.interactive !== false) {
      if (phase === "down") { (event.target as unknown as PointerCaptureTarget).setPointerCapture(event.pointerId); if (!event.shiftKey) props.onSelect(null); setSelectionBox({ start: bounded, end: bounded, additive: event.shiftKey }); }
      else if (phase === "move" && selectionBox) setSelectionBox(current => current ? { ...current, end: bounded } : null);
      else if (phase === "up" && selectionBox) {
        const left = Math.min(selectionBox.start.x, bounded.x), right = Math.max(selectionBox.start.x, bounded.x), top = Math.min(selectionBox.start.z, bounded.z), bottom = Math.max(selectionBox.start.z, bounded.z);
        props.onBoxSelect(props.markers.filter(marker => marker.x >= left && marker.x <= right && marker.z >= top && marker.z <= bottom).map(marker => marker.id), selectionBox.additive);
        setSelectionBox(null); (event.target as unknown as PointerCaptureTarget).releasePointerCapture(event.pointerId);
      }
      return;
    }
    if (phase === "up") dragging.current = null;
    props.onPitchPointer(phase, point.x, point.z);
  };
  return <><color attach="background" args={[props.theme === "dark" ? "#081217" : "#e7edef"]} /><ambientLight intensity={props.theme === "dark" ? 1.25 : 1.55} /><directionalLight position={[4, 9, 5]} intensity={props.theme === "dark" ? 1.8 : 1.55} castShadow={props.view === "3d"} /><group rotation={[0, props.pitchOrientation === "portrait" ? Math.PI / 2 : 0, 0]}><Pitch goalSize={props.goalSize} preset={props.pitchPreset} style={props.pitchStyle} /><Boards preset={props.pitchPreset} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .035, 0]} onPointerMove={(event: ThreeEvent<PointerEvent>) => { if (!event.shiftKey) pointer("move", event); }} onPointerUp={(event: ThreeEvent<PointerEvent>) => { if (!event.shiftKey) pointer("up", event); }} onPointerDown={(event: ThreeEvent<PointerEvent>) => { if (event.shiftKey) return; if (props.tool !== "select" && props.tool !== "pass" && props.tool !== "run") props.onSelect(null); pointer("down", event); }}><planeGeometry args={[dimensions.length, dimensions.width]} /><meshBasicMaterial transparent opacity={0} /></mesh>
    {props.paths.map(path => { const from = markerMap[path.fromId], targetMarker = path.toId ? markerMap[path.toId] : null, to: PathTarget | null = targetMarker || (path.toPoint ? { ...path.toPoint, kind: "point" } : null), timelineEntry = timelineByPath.get(path.id); return from && to && timelineEntry ? <AnimatedPath key={path.id} path={path} from={from} to={to} theme={props.theme} playbackPositionMs={props.playbackPositionMs} showPlaybackFrame={props.showPlaybackFrame} timelineEntry={timelineEntry} timelineTotalMs={timeline.totalMs} selected={path.id === props.selectedPathId} erase={props.tool === "erase"} onSelect={props.onSelectPath} /> : null; })}
    {props.annotations.map(item => <Annotation key={item.id} item={item} erase={props.tool === "erase"} editing={item.id === props.editingTextId} selected={item.id === props.selectedAnnotationId} theme={props.theme} onErase={props.onEraseAnnotation} onSelect={props.onSelectAnnotation} />)}
    {selectionBox && <SelectionBox start={selectionBox.start} end={selectionBox.end} />}
    {props.markers.map(marker => <Marker key={marker.id} marker={marker} animatedPosition={animatedMarkerPositions.get(marker.id)} selected={props.selectedIds.includes(marker.id)} theme={props.theme} view={props.view} labelScale={props.labelScale} showName={props.showNames && marker.kind !== "goal"} onPointerDown={(id, additive) => { if (props.tool === "select") dragging.current = id; props.onSelect(id, additive); }} />)}
    {editingText && <TextEditorTracker item={editingText} inputRef={props.editingInputRef} orientation={props.pitchOrientation} />}</group><CameraControls view={props.view} pitchPreset={props.pitchPreset} pitchOrientation={props.pitchOrientation} zoomScale={props.zoomScale} resetSignal={props.resetSignal} onZoomChange={props.onZoomChange} />
  </>;
}

export function ExerciseCanvas(props: ExerciseCanvasProps) {
  const is2d = props.view === "2d", editingText = props.annotations.find(item => item.id === props.editingTextId), editingInputRef = useRef<HTMLInputElement>(null);
  const [zoomPercent, setZoomPercent] = useState(100), [resetSignal, setResetSignal] = useState(0);
  useEffect(() => setZoomPercent(100), [props.pitchOrientation, props.pitchPreset, props.view]);
  return <><div className="exercise-canvas-wrap"><Canvas key={`${props.view}-${props.pitchPreset}-${props.pitchOrientation}`} className="exercise-canvas" shadows={!is2d} orthographic={is2d} camera={is2d ? { position: [0, 10, .01], zoom: 82, near: .1, far: 30 } : { position: [0, 8, 8.8], fov: 42, near: .1, far: 60 }} dpr={[1, 1.5]}><Scene {...props} editingInputRef={editingInputRef} resetSignal={resetSignal} onZoomChange={setZoomPercent} /></Canvas>{editingText && <input ref={editingInputRef} className="exercise-canvas-text-input" autoFocus value={editingText.text || ""} placeholder="Kirjoita teksti" aria-label="Kentän teksti" onPointerDown={event => event.stopPropagation()} onChange={event => props.onChangeText(editingText.id, event.target.value.slice(0, 80))} onBlur={() => props.onFinishTextEdit(editingText.id)} onKeyDown={event => { event.stopPropagation(); if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur(); }} />}</div><div className="exercise-zoom-status" aria-label={`Näkymän zoomaus ${zoomPercent} prosenttia`}><output><ZoomIn size={15} />{zoomPercent} %</output>{(props.showResetAtDefault !== false || zoomPercent !== 100) && <button onClick={() => setResetSignal(current => current + 1)} title="Palauta näkymä 100 prosenttiin" aria-label="Palauta näkymä 100 prosenttiin"><RotateCcw size={14} />Palauta</button>}</div></>;
}
