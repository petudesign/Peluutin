import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { RotateCcw, ZoomIn } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BASKETBALL_HOOP_FROM_BASELINE, getExerciseCourt, getExerciseHoops, getExercisePitchDimensions, type ExerciseCourtId, type ExercisePitchDimensions } from "./exerciseCourts";
import { buildExerciseTimeline, getExercisePlayerFocus, type ExercisePassStyle, type ExerciseShotStyle, type ExercisePlayerFocus, type ExercisePlayerPose, getExercise2dFitZoom, getExerciseAnnotationPoints, exerciseAnnotationIntersectsBox, getExerciseMarkerPositionAt, getExerciseMarkerColor, getExercisePathColor, getExerciseTimelineProgressAt, type ExerciseAnnotation, type ExerciseGoalSize, type ExerciseMarker, type ExercisePath, type ExercisePitchOrientation, type ExercisePitchPreset, type ExercisePitchStyle, type ExerciseTimelineEntry, type ExerciseTool, type ExerciseView } from "./exerciseTypes";

interface ExerciseCanvasProps {
  court?: ExerciseCourtId;
  theme: "light" | "dark"; view: ExerciseView; tool: ExerciseTool; markers: ExerciseMarker[]; paths: ExercisePath[]; annotations: ExerciseAnnotation[]; goalSize: ExerciseGoalSize; pitchPreset: ExercisePitchPreset; pitchOrientation: ExercisePitchOrientation; pitchStyle: ExercisePitchStyle; showNames: boolean;
  zoomScale?: number; labelScale?: number; showResetAtDefault?: boolean; interactive?: boolean;
  selectedIds: string[]; selectedAnnotationIds: string[]; selectedAnnotationId: string | null; selectedPathId: string | null; editingTextId: string | null; playbackPositionMs: number; showPlaybackFrame: boolean;
  onSelect: (id: string | null, additive?: boolean) => void; onBoxSelect: (ids: string[], annotationIds: string[], additive: boolean) => void; onSelectAnnotation: (id: string) => void; onSelectPath: (id: string) => void;
  onChangeText: (id: string, text: string) => void; onFinishTextEdit: (id: string) => void; onMove: (id: string, x: number, z: number) => void;
  onPitchPointer: (phase: "down" | "move" | "up", x: number, z: number) => void; onEraseAnnotation: (id: string) => void;
  /** Called when a basket is clicked while the shot tool is active. */
  onHoopPointer?: (hoop: { x: number; z: number }) => void;
}

const LINE = "#b8c8cc", TWO_D_VERTICAL_OFFSET = -.38;

function CameraControls({ view, dimensions, reference, pitchOrientation, zoomScale = 1, resetSignal, onZoomChange }: { view: ExerciseView; dimensions: ExercisePitchDimensions; reference: ExercisePitchDimensions; pitchOrientation: ExercisePitchOrientation; zoomScale?: number; resetSignal: number; onZoomChange: (percent: number) => void }) {
  const { camera, gl, size } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controlsRef.current = controls;
    controls.target.set(0, 0, 0); controls.enableDamping = true; controls.enableRotate = false; controls.enablePan = false;
    let defaultZoom = 1, defaultDistance = 1;
    if (view === "2d") {
      const orthographic = camera as THREE.OrthographicCamera, fitZoom = getExercise2dFitZoom(size.width, size.height, dimensions, pitchOrientation) * zoomScale;
      camera.position.z = .01 + TWO_D_VERTICAL_OFFSET; controls.target.set(0, 0, TWO_D_VERTICAL_OFFSET);
      orthographic.zoom = fitZoom; orthographic.updateProjectionMatrix(); controls.minZoom = fitZoom * .72; controls.maxZoom = fitZoom * 2.4; controls.update();
      defaultZoom = fitZoom;
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
    } else {
      const scale = dimensions.groundLength / reference.groundLength;
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
  }, [camera, dimensions, gl, onZoomChange, pitchOrientation, reference, size.height, size.width, view, zoomScale]);
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

interface CourtSurfaceProps { preset: ExercisePitchPreset; dimensions: ExercisePitchDimensions; reference: ExercisePitchDimensions; goalSize: ExerciseGoalSize; style: ExercisePitchStyle }

function FootballPitch({ dimensions, reference, goalSize, style }: CourtSurfaceProps) {
  const halfLength = dimensions.length / 2, halfWidth = dimensions.width / 2;
  const scaleX = dimensions.length / reference.length, scaleZ = dimensions.width / reference.width;
  const centerRadius = 1.03 * scaleZ, center = useMemo(() => arc(0, 0, centerRadius, 0, Math.PI * 2, 56), [centerRadius]), boxArcAngle = Math.acos(.375), stripeWidth = dimensions.groundLength / 12;
  const stripeA = style === "dark" ? "#101a1f" : "#286b39", stripeB = style === "dark" ? "#17252a" : "#2f7640";
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[dimensions.groundLength, dimensions.groundWidth]} /><meshStandardMaterial color={stripeA} roughness={.96} /></mesh>
    {Array.from({ length: 12 }, (_, index) => <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[-dimensions.groundLength / 2 + stripeWidth / 2 + index * stripeWidth, .006, 0]}><planeGeometry args={[stripeWidth, dimensions.groundWidth]} /><meshStandardMaterial color={index % 2 ? stripeB : stripeA} roughness={.98} /></mesh>)}
    {style !== "plain-grass" && <>
    <PitchLine points={[[-halfLength, -halfWidth], [halfLength, -halfWidth], [halfLength, halfWidth], [-halfLength, halfWidth], [-halfLength, -halfWidth]]} /><PitchLine points={[[0, -halfWidth], [0, halfWidth]]} /><PitchLine points={center} />
    {[1, -1].map(side => { const end = side * halfLength, penalty = side * (halfLength - 1.33 * scaleX), goal = side * (halfLength - .57 * scaleX), spot = side * (halfLength - 1.03 * scaleX), penaltyHalfWidth = 2.05 * scaleZ, goalHalfWidth = .9 * scaleZ; return <group key={side}><PitchLine points={[[end, -penaltyHalfWidth], [penalty, -penaltyHalfWidth], [penalty, penaltyHalfWidth], [end, penaltyHalfWidth]]} /><PitchLine points={[[end, -goalHalfWidth], [goal, -goalHalfWidth], [goal, goalHalfWidth], [end, goalHalfWidth]]} /><mesh position={[spot, .06, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.045, 18]} /><meshBasicMaterial color={LINE} /></mesh><PitchLine points={arc(spot, 0, .8 * scaleZ, side > 0 ? Math.PI - boxArcAngle : -boxArcAngle, side > 0 ? Math.PI + boxArcAngle : boxArcAngle)} /></group>; })}
    {([[-halfLength, -halfWidth, 0, Math.PI / 2], [halfLength, -halfWidth, Math.PI / 2, Math.PI], [-halfLength, halfWidth, -Math.PI / 2, 0], [halfLength, halfWidth, Math.PI, Math.PI * 1.5]] as Array<[number, number, number, number]>).map(([x, z, from, to], index) => <PitchLine key={index} points={arc(x, z, .18 * scaleZ, from, to, 10)} />)}
    <mesh position={[0, .06, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.05, 18]} /><meshBasicMaterial color={LINE} /></mesh><Goal x={-halfLength - .04} size={goalSize} /><Goal x={halfLength + .04} flip size={goalSize} />
    </>}
  </group>;
}

function Boards({ dimensions }: { dimensions: ExercisePitchDimensions }) {
  const [logo, setLogo] = useState<THREE.Texture | null>(null);
  useEffect(() => { let active = true, loaded: THREE.Texture | undefined; new THREE.TextureLoader().load("/icons/peluutin-192.png", texture => { loaded = texture; texture.colorSpace = THREE.SRGBColorSpace; if (active) setLogo(texture); }); return () => { active = false; loaded?.dispose(); }; }, []);
  const wordmark = useMemo(() => { const canvas = document.createElement("canvas"); canvas.width = 300; canvas.height = 80; const context = canvas.getContext("2d")!; context.font = "800 42px Manrope, sans-serif"; context.textAlign = "center"; context.fillStyle = "#f5f8fa"; context.fillText("Peluutin", 150, 53); const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture; }, []);
  useEffect(() => () => wordmark.dispose(), [wordmark]);
  const boards = useMemo(() => { const result: Array<{ x: number; z: number; rot: number; w: number; branded?: boolean }> = [], longCount = Math.max(6, Math.floor(dimensions.length / 1.8)), shortCount = Math.max(4, Math.floor(dimensions.width / 1.4)), longW = dimensions.length / longCount * .92, shortW = dimensions.width / shortCount * .88, brandedLeft = Math.floor((longCount - 1) / 2), brandedRight = Math.ceil((longCount - 1) / 2); for (let index = 0; index < longCount; index += 1) { const x = -dimensions.length / 2 + dimensions.length * (index + .5) / longCount, branded = index === brandedLeft || index === brandedRight; result.push({ x, z: -dimensions.width / 2 - .33, rot: 0, w: longW, branded }, { x, z: dimensions.width / 2 + .33, rot: 0, w: longW, branded }); } for (let index = 0; index < shortCount; index += 1) { const z = -dimensions.width / 2 + dimensions.width * (index + .5) / shortCount; if (Math.abs(z) < 1.3) continue; result.push({ x: -dimensions.length / 2 - .33, z, rot: Math.PI / 2, w: shortW }, { x: dimensions.length / 2 + .33, z, rot: Math.PI / 2, w: shortW }); } return result; }, [dimensions]);
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

function FootballSurface(props: CourtSurfaceProps) {
  return <><FootballPitch {...props} />{props.style !== "plain-grass" && <Boards dimensions={props.dimensions} />}</>;
}

// FIBA court markings in metres, measured from the baseline or the basket.
const BASKETBALL_SCENE_METERS = getExerciseCourt("basketball").pace.metersPerUnit;
const BASKETBALL = { courtWidth: 15, basket: BASKETBALL_HOOP_FROM_BASELINE, backboard: 1.2, backboardWidth: 1.8, keyLength: 5.8, keyHalfWidth: 2.45, circle: 1.8, threePoint: 6.75, cornerThree: 6.6, noCharge: 1.25, rim: 3.05 } as const;

const RIM_RADIUS = .225;

// A net hangs about 40 cm and narrows towards the bottom; its cords cross into diamonds between the rings.
function HoopNet({ radius, depth }: { radius: number; depth: number }) {
  const geometry = useMemo(() => {
    const cords = 12, levels = 4, step = Math.PI * 2 / cords, points: THREE.Vector3[] = [];
    const at = (level: number, index: number) => {
      const t = level / levels, ring = radius * (1 - t * .42), angle = (index + level * .5) * step;
      return new THREE.Vector3(Math.cos(angle) * ring, -depth * t, Math.sin(angle) * ring);
    };
    for (let level = 0; level < levels; level += 1) {
      for (let index = 0; index < cords; index += 1) points.push(at(level, index), at(level + 1, index), at(level, index), at(level + 1, index - 1));
    }
    for (let index = 0; index < cords; index += 1) points.push(at(levels, index), at(levels, index + 1));
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [depth, radius]);
  const material = useMemo(() => new THREE.LineBasicMaterial({ color: "#f4f6f6", transparent: true, opacity: .85 }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <lineSegments geometry={geometry} material={material} />;
}

function BasketballHoop({ baseline, direction, scale }: { baseline: number; direction: 1 | -1; scale: number }) {
  const at = (meters: number) => baseline + direction * meters * scale, rimY = BASKETBALL.rim * scale, boardY = (BASKETBALL.rim + .4) * scale, poleX = baseline - direction * .55;
  const boardFace = at(BASKETBALL.backboard) + direction * .025, rimBack = at(BASKETBALL.basket) - direction * RIM_RADIUS * scale;
  return <group>
    <mesh position={[poleX, rimY * .62, 0]} castShadow><cylinderGeometry args={[.06, .07, rimY * 1.24, 14]} /><meshStandardMaterial color="#33424a" roughness={.5} /></mesh>
    <mesh position={[(poleX + at(BASKETBALL.backboard)) / 2, rimY * 1.18, 0]}><boxGeometry args={[Math.abs(at(BASKETBALL.backboard) - poleX), .07, .07]} /><meshStandardMaterial color="#33424a" roughness={.5} /></mesh>
    <mesh position={[at(BASKETBALL.backboard), boardY, 0]}><boxGeometry args={[.05, 1.05 * scale, BASKETBALL.backboardWidth * scale]} /><meshStandardMaterial color="#f4f7f8" roughness={.3} transparent opacity={.88} /></mesh>
    <mesh position={[at(BASKETBALL.basket), rimY, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[RIM_RADIUS * scale, .025, 8, 28]} /><meshStandardMaterial color="#e5541f" roughness={.45} /></mesh>
    {/* The rim is bolted to the backboard by a short bracket that spans the gap to the ring. */}
    <mesh position={[(boardFace + rimBack) / 2, rimY - .015, 0]}><boxGeometry args={[Math.abs(rimBack - boardFace) + .02, .045, .14 * scale]} /><meshStandardMaterial color="#d24a1a" roughness={.45} /></mesh>
    <mesh position={[boardFace + direction * .012, rimY - .06 * scale, 0]}><boxGeometry args={[.025, .2 * scale, .26 * scale]} /><meshStandardMaterial color="#d24a1a" roughness={.45} /></mesh>
    <group position={[at(BASKETBALL.basket), rimY, 0]}><HoopNet radius={RIM_RADIUS * scale} depth={.42 * scale} /></group>
  </group>;
}

function BasketballEnd({ baseline, direction, scale, color }: { baseline: number; direction: 1 | -1; scale: number; color: string }) {
  const at = (meters: number) => baseline + direction * meters * scale, keyEnd = at(BASKETBALL.keyLength), keyHalf = BASKETBALL.keyHalfWidth * scale, basket = at(BASKETBALL.basket);
  const facing = direction > 0 ? 0 : Math.PI, threeAngle = Math.asin(BASKETBALL.cornerThree / BASKETBALL.threePoint), corner = BASKETBALL.cornerThree * scale;
  const lines = useMemo(() => ({
    // The corner lines run from the baseline to where they meet the arc; the arc starts on the -direction side.
    threePoint: [[baseline, -direction * corner] as [number, number], ...arc(basket, 0, BASKETBALL.threePoint * scale, facing - threeAngle, facing + threeAngle, 48), [baseline, direction * corner] as [number, number]],
    // Only the half of the free-throw circle outside the key is drawn, as on most courts; FIBA's dashed inner half is left out.
    freeThrow: arc(keyEnd, 0, BASKETBALL.circle * scale, facing - Math.PI / 2, facing + Math.PI / 2, 24),
    noCharge: arc(basket, 0, BASKETBALL.noCharge * scale, facing - Math.PI / 2, facing + Math.PI / 2, 20),
  }), [baseline, basket, corner, direction, facing, keyEnd, scale, threeAngle]);
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(baseline + keyEnd) / 2, .012, 0]}><planeGeometry args={[Math.abs(keyEnd - baseline), keyHalf * 2]} /><meshStandardMaterial color={color} roughness={.8} /></mesh>
    <CourtLine points={[[baseline, -keyHalf], [keyEnd, -keyHalf], [keyEnd, keyHalf], [baseline, keyHalf]]} />
    <CourtLine points={lines.freeThrow} />
    <CourtLine points={lines.noCharge} />
    <CourtLine points={lines.threePoint} />
    <BasketballHoop baseline={baseline} direction={direction} scale={scale} />
  </group>;
}

const LINE_FOR_COURT = "#f5efe4";

// Hairlines vanish against parquet, so court markings are flat strips about 5 cm wide.
function CourtLine({ points }: { points: Array<[number, number]> }) {
  const geometry = useMemo(() => createAnnotationStrokeGeometry({ id: "court-line", kind: "draw", color: LINE_FOR_COURT, points: points.map(([x, z]) => ({ x, z })) }, .022), [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshBasicMaterial color={LINE_FOR_COURT} side={THREE.DoubleSide} /></mesh>;
}

// Memoised so playback frames, which re-render the scene, do not rebuild the line geometry.
const BasketballCourt = memo(function BasketballCourt({ preset, dimensions, style }: CourtSurfaceProps) {
  const halfLength = dimensions.length / 2, halfWidth = dimensions.width / 2, scale = dimensions.width / BASKETBALL.courtWidth, half = preset === "half";
  const wood = style === "wood", apron = wood ? "#6f4d31" : "#0c1418", boards = wood ? ["#c48c52", "#cd975e"] : ["#111c21", "#15222a"], key = wood ? "#a4492b" : "#1b3a47";
  const boardWidth = dimensions.width / 20, centerX = half ? halfLength : 0;
  const centerCircle = useMemo(() => half ? arc(centerX, 0, BASKETBALL.circle * scale, Math.PI / 2, Math.PI * 1.5, 28) : arc(0, 0, BASKETBALL.circle * scale, 0, Math.PI * 2, 56), [centerX, half, scale]);
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[dimensions.groundLength, dimensions.groundWidth]} /><meshStandardMaterial color={apron} roughness={.9} /></mesh>
    {Array.from({ length: 20 }, (_, index) => <mesh key={index} rotation={[-Math.PI / 2, 0, 0]} position={[0, .006, -halfWidth + boardWidth / 2 + index * boardWidth]} receiveShadow><planeGeometry args={[dimensions.length, boardWidth]} /><meshStandardMaterial color={boards[index % 2]} roughness={.62} /></mesh>)}
    <CourtLine points={[[-halfLength, -halfWidth], [halfLength, -halfWidth], [halfLength, halfWidth], [-halfLength, halfWidth], [-halfLength, -halfWidth]]} />
    <CourtLine points={[[centerX, -halfWidth], [centerX, halfWidth]]} /><CourtLine points={centerCircle} />
    <BasketballEnd baseline={-halfLength} direction={1} scale={scale} color={key} />
    {!half && <BasketballEnd baseline={halfLength} direction={-1} scale={scale} color={key} />}
  </group>;
});

function basketballTexture() {
  const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 128; const context = canvas.getContext("2d")!;
  context.fillStyle = "#df6d2a"; context.fillRect(0, 0, canvas.width, canvas.height); context.strokeStyle = "#2a1a12"; context.lineWidth = 4;
  context.beginPath(); context.moveTo(0, 64); context.lineTo(256, 64); [64, 192].forEach(x => { context.moveTo(x, 0); context.lineTo(x, 128); }); context.stroke();
  [0, 128].forEach(x => { context.beginPath(); context.ellipse(x + 64, 64, 34, 64, 0, 0, Math.PI * 2); context.stroke(); });
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping; return texture;
}

function Basketball({ radius, castShadow = false }: { radius: number; castShadow?: boolean }) {
  const ballMap = useMemo(basketballTexture, []);
  useEffect(() => () => ballMap.dispose(), [ballMap]);
  return <mesh castShadow={castShadow} rotation={[0, 0, Math.PI / 2]}><sphereGeometry args={[radius, 24, 24]} /><meshStandardMaterial map={ballMap} roughness={.8} /></mesh>;
}

type BallComponent = (props: { radius: number; castShadow?: boolean }) => React.JSX.Element;

// Each court draws its own surface and ball; the markers, routes and annotations on top are shared.
const COURT_RENDERERS: Record<ExerciseCourtId, { Surface: React.ComponentType<CourtSurfaceProps>; Ball: BallComponent; shotArcs: Record<ExerciseShotStyle, ShotArc> | null; figureHeight: number; outfit: FigureOutfit; ballHeights: BallHeights | null; ballRadius: number | null; lob: LobArc }> = {
  // Figures are stylised on the football pitch, where true scale would make them tiny; on the basketball court they stand about 1.85 m tall.
  football: { Surface: FootballSurface, Ball: SoccerBall, shotArcs: null, figureHeight: .75, outfit: "football", ballHeights: null, ballRadius: null,
    // A lofted ball leaves and lands on the grass and rises with the length of the pass.
    lob: { release: .075, catch: .075, minLift: .5, liftPerUnit: .22 } },
  // A jump shot is released at about 2.4 m into a rim at 3.05 m, rising at least half a metre above the rim.
  basketball: { Surface: BasketballCourt, Ball: Basketball, shotArcs: {
    jump: { release: 2.4 / BASKETBALL_SCENE_METERS, rim: BASKETBALL.rim / BASKETBALL_SCENE_METERS, clearance: .5 / BASKETBALL_SCENE_METERS },
    // A lay-up is laid up softly from just under the rim; a dunk is pushed down through it from above.
    layup: { release: 2.9 / BASKETBALL_SCENE_METERS, rim: BASKETBALL.rim / BASKETBALL_SCENE_METERS, clearance: .2 / BASKETBALL_SCENE_METERS },
    // The dunk leaves the hands just above the rim, where the dunker's raised hands are at the top of the jump.
    dunk: { release: 3.15 / BASKETBALL_SCENE_METERS, rim: BASKETBALL.rim / BASKETBALL_SCENE_METERS, clearance: -1 },
  }, figureHeight: 1.85 / BASKETBALL_SCENE_METERS / getExerciseCourt("basketball").markerScale, outfit: "basketball",
    // Passes travel at chest height; a dribble is drawn by the dribbler, bouncing in time with the hand.
    ballHeights: { pass: 1.2 / BASKETBALL_SCENE_METERS },
    // The ball is sized to the figure rather than in centimetres: about as wide as its head and some 40 % of its
    // shoulders, as on a real player. The figures' heads are a little large, so a true 24 cm ball looks too small.
    ballRadius: .165 / BASKETBALL_SCENE_METERS,
    // A lob is thrown from above the head and caught high, peaking well over a defender's reach.
    lob: { release: 2.2 / BASKETBALL_SCENE_METERS, catch: 2.3 / BASKETBALL_SCENE_METERS, minLift: 1.1 / BASKETBALL_SCENE_METERS, liftPerUnit: .22 } },
};

// Skin parts share one neutral tone so the figures read as game pieces rather than particular people.
const FIGURE_SKIN = "#d9cdc1", FIGURE_HAIR = "#3b3430";

export type FigureOutfit = "football" | "basketball";
/** What a player is doing with the ball at this moment of playback; a pose raises or reaches the arms. */
export type FigurePose = ExercisePlayerPose;
/** Movement shared from the marker to its figure: which way it faces and how far into its stride it is. */
export interface FigureMotion { heading: number; phase: number; moving: boolean }

function numberTexture(number: number | undefined) {
  const canvas = document.createElement("canvas"); canvas.width = 128; canvas.height = 128; const context = canvas.getContext("2d")!;
  if (number !== undefined) {
    context.font = "800 84px Manrope, sans-serif"; context.textAlign = "center"; context.textBaseline = "middle";
    context.lineWidth = 10; context.strokeStyle = "rgba(10,20,26,.55)"; context.strokeText(String(number), 64, 68);
    context.fillStyle = "#ffffff"; context.fillText(String(number), 64, 68);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

/** Turns the shortest way from one heading to another. */
function approachAngle(current: number, target: number, amount: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * amount;
}

/** A body part turned on a lathe from a side profile of [radius, height] pairs, in units of the figure's height. */
function useLathe(profile: Array<[number, number]>, h: number) {
  const geometry = useMemo(() => new THREE.LatheGeometry(profile.map(([radius, y]) => new THREE.Vector2(radius * h, y * h)), 24), [h, profile]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

// Side profiles for the torso and shorts: narrow at the waist, full at the chest, sloping into the shoulders and neck.
// Both are squashed front to back, so the body reads as a body rather than a barrel.
const TORSO_PROFILE: Array<[number, number]> = [[.112, 0], [.118, .06], [.135, .14], [.148, .21], [.152, .25], [.13, .29], [.07, .315], [.001, .32]];
const SHORTS_PROFILE: Array<[number, number]> = [[.001, .09], [.118, .09], [.13, .05], [.138, 0], [.001, 0]];
const BODY_DEPTH = .7;
// Leg and arm segments, in units of the figure's height. The hips sit at 0.48 and the shoulders at 0.76.
const HIP = .48, THIGH = .22, SHIN = .21, SHOULDER = .755, UPPER_ARM = .15, FOREARM = .14;
// The dribbling arm reaches forward and down beside the hip; with these joint angles the right hand sits at about
// 0.52 of the figure's height, 0.21 out to the side and 0.17 in front, which is where the ball meets it at the top.
const DRIBBLE_ARM = { upper: -.25, elbow: -.75, spread: .2 }, DRIBBLE_CONTACT_Y = .52, DRIBBLE_BALL_X = .21, DRIBBLE_BALL_Z = .17;

/**
 * A stylised player for the 3D view, built from basic shapes. Legs bend at hip and knee and arms at shoulder and elbow,
 * so a stride, a shot or a catch is only a rotation of those joints. `height` is in the marker's own units.
 */
function PlayerFigure({ height, color, number, outfit, motion, pose, passStyle = "direct", shotStyle = "jump", poseProgress = 0, releaseAt = .5, holding = false, Ball, ballRadius, selected }: { height: number; color: string; number?: number; outfit: FigureOutfit; motion: RefObject<FigureMotion>; pose: FigurePose; passStyle?: ExercisePassStyle; shotStyle?: ExerciseShotStyle; poseProgress?: number; releaseAt?: number; holding?: boolean; Ball: BallComponent; ballRadius: number; selected: boolean }) {
  const h = height, basketball = outfit === "basketball";
  const root = useRef<THREE.Group>(null), body = useRef<THREE.Group>(null), upper = useRef<THREE.Group>(null);
  const hips = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)], knees = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const shoulders = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)], elbows = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const torso = useLathe(TORSO_PROFILE, h), shortsShape = useLathe(SHORTS_PROFILE, h);
  const stride = useRef(0), jump = useRef(0), sway = useRef(Math.random() * Math.PI * 2), dribbleBall = useRef<THREE.Group>(null);
  const numberMap = useMemo(() => numberTexture(number), [number]); useEffect(() => () => numberMap.dispose(), [numberMap]);
  useFrame((_, delta) => {
    const state = motion.current, ease = 1 - Math.exp(-delta * (pose === "shoot" || pose === "pass" ? 20 : 12)), turn = 1 - Math.exp(-delta * 7);
    // Where the player is within a shot or pass: gathering the ball, bringing it up, or past the release.
    const progress = Math.min(1, Math.max(0, poseProgress)), released = progress >= releaseAt;
    const rise = releaseAt > 0 ? Math.min(1, progress / releaseAt) : 1, fall = releaseAt < 1 ? Math.max(0, (progress - releaseAt) / (1 - releaseAt)) : 1;
    const gathering = rise < .35;
    stride.current += ((state.moving ? 1 : 0) - stride.current) * ease;
    sway.current += delta * 1.6;
    const run = stride.current, still = 1 - run, phase = state.phase;
    const approach = (object: THREE.Object3D | null, axis: "x" | "y" | "z", target: number) => { if (object) object.rotation[axis] += (target - object.rotation[axis]) * ease; };
    // Turning is a little slower than the limbs, so a change of direction reads as a turn rather than a snap.
    if (root.current) root.current.rotation.y = approachAngle(root.current.rotation.y, state.heading, turn);
    // A jump shot follows the clock: a dip to load the legs, up to the highest point as the ball leaves the hands,
    // then back down to land. Standing players shift their weight a touch so nobody is frozen.
    // A lay-up rises higher than a jump shot and a dunk highest of all; a dunker hangs at the rim a moment before dropping.
    // The figures' arms are a little short, so a dunker jumps higher than life to put straight arms over the rim.
    const peak = (shotStyle === "dunk" ? .6 : shotStyle === "layup" ? .32 : .2) * h;
    if (pose === "shoot") jump.current = released ? Math.cos(Math.max(0, shotStyle === "dunk" ? (fall - .25) / .75 : fall) * Math.PI / 2) * peak
      : gathering ? -Math.sin(rise / .35 * Math.PI) * .035 * h : Math.sin((rise - .35) / .65 * Math.PI / 2) * peak;
    else jump.current += (0 - jump.current) * (1 - Math.exp(-delta * 16));
    if (body.current) {
      // A runner rises twice a stride, once off each foot.
      body.current.position.y = jump.current + Math.abs(Math.cos(phase)) * .025 * h * run - .015 * h * run;
      body.current.rotation.z = Math.sin(sway.current) * .015 * still;
    }
    // The upper body leans into the run and twists slightly against the legs, as the arms drive.
    approach(upper.current, "x", .16 * run);
    if (upper.current) upper.current.rotation.y = Math.sin(phase) * .14 * run;
    hips.forEach((hip, index) => {
      // Each thigh swings forward and back; the knee folds while the leg comes through and straightens to land.
      const legPhase = phase + index * Math.PI, swing = Math.sin(legPhase);
      // In a jump shot the knees load in the gather, straighten in the air and give a little on landing.
      // A lay-up drives the right knee up off the left foot; a dunker tucks both knees in the air.
      const shotKnee = gathering && !released ? .85 : released ? .2 + fall * .35 : .25;
      const airborne = !gathering || released, driveKnee = index === 0;
      const [shotThigh, shotKneeBend] = shotStyle === "layup" && airborne ? (driveKnee ? [-1.35, 1.6] : [.25, .15])
        : shotStyle === "dunk" && airborne ? [-.55, .95] : [-shotKnee * .45, shotKnee];
      const thigh = pose === "shoot" ? shotThigh : -swing * .7 * run;
      const knee = pose === "shoot" ? shotKneeBend : (.12 + Math.max(0, Math.cos(legPhase)) * 1.25) * run + .05 * still;
      approach(hip.current, "x", thigh);
      approach(knees[index].current, "x", knee);
    });
    // A dribble bounces once every two steps. At the top of the bounce the ball meets the right hand, which pushes it
    // down by straightening the elbow; the ball is fastest at the floor and slows as it comes back up into the hand.
    const bounce = ((phase / (Math.PI * 2)) % 1 + 1) % 1, dribblePush = Math.sin(Math.PI * Math.min(1, bounce / .6));
    if (dribbleBall.current) {
      dribbleBall.current.visible = pose === "dribble";
      dribbleBall.current.position.y = ballRadius + (DRIBBLE_CONTACT_Y * h - ballRadius * 1.9) * Math.abs(Math.cos(Math.PI * bounce));
    }
    shoulders.forEach((shoulder, index) => {
      // Index 0 is the figure's right arm, the shooting and dribbling hand; index 1 is the guide hand.
      // Running, the arms drive against the legs with bent elbows. Catching, both hands reach together towards the passer.
      // Holding, the ball sits at the chest. A jump shot gathers the ball at the chest, sets it above the forehead with the
      // shooting elbow under the ball and the guide hand at its side, then the shooting arm extends up and follows through.
      // A pass brings the ball to the chest and pushes it out with both arms.
      const side = index ? 1 : -1, legPhase = phase + index * Math.PI, shootingHand = index === 0;
      const chest: [number, number, number] = [-.75, -1.55, -.16];
      // A lay-up carries the ball up in the right hand and lays it off at full stretch. A dunk holds the ball high in both
      // hands and slams it down through the rim; in an alley-oop the hands reach up for the lob before it arrives.
      const [upperArm, elbow, spread] = pose === "shoot" && shotStyle === "layup" ? (released ? (shootingHand ? [-2.85, -.05, .02] : [-1.3, -.5, .3]) : gathering ? chest : (shootingHand ? [-2.6, -.6, .02] : [-1.5, -.6, .3]))
        // Both hands hold the ball straight overhead, or reach straight up for an alley-oop lob, then slam forward and down through the rim.
        : pose === "shoot" && shotStyle === "dunk" ? (released ? [-2.25, -.05, .04] : gathering && holding ? chest : [-3.0, -.15, .06])
        : pose === "shoot" ? (released ? (shootingHand ? [-2.65, -.08, .02] : [-2.05, -.75, .3]) : gathering ? chest : (shootingHand ? [-2.35, -1.75, .02] : [-2.1, -1.45, .32]))
        // A lob is lifted above the head and released high; a bounce pass is pushed down towards the floor.
        : pose === "pass" ? (passStyle === "lob" ? (released ? [-2.7, -.1, .05] : [-2.35, -1.2, .08]) : passStyle === "bounce" ? (released ? [-.85, -.05, -.08] : chest) : (released ? [-1.4, -.08, -.06] : chest))
        // A lob is caught with the hands high, a bounce pass low at the waist.
        : pose === "catch" ? (passStyle === "lob" ? [-2.5, -.3, -.15] : passStyle === "bounce" ? [-.7, -.3, -.25] : [-1.2, -.35, -.2])
        : pose === "hold" ? chest
        : pose === "dribble" ? (shootingHand ? [DRIBBLE_ARM.upper + .1 * dribblePush, DRIBBLE_ARM.elbow + .42 * dribblePush, DRIBBLE_ARM.spread] : [-.6, -1.05, .25])
        : [Math.sin(legPhase) * .65 * run, -(.25 * still + 1.45 * run), .12];
      approach(shoulder.current, "x", upperArm);
      approach(shoulder.current, "z", side * spread);
      approach(elbows[index].current, "x", elbow);
    });
  });
  const jersey = <meshStandardMaterial color={color} roughness={.55} emissive={selected ? color : "#000"} emissiveIntensity={selected ? .35 : 0} />;
  const skin = <meshStandardMaterial color={FIGURE_SKIN} roughness={.7} />;
  const shorts = <meshStandardMaterial color={color} roughness={.6} />;
  const sock = <meshStandardMaterial color={basketball ? "#f4f6f6" : color} roughness={.7} />;
  const shoe = <meshStandardMaterial color={basketball ? "#f8f9f9" : "#1f272c"} roughness={.5} />;
  const hair = <meshStandardMaterial color={FIGURE_HAIR} roughness={.85} />;
  // Basketball shorts reach the knee and the jersey is sleeveless; football has short shorts, sleeves and long socks.
  const shortsLength = basketball ? THIGH : .11, sockLength = basketball ? .07 : .16;
  return <group ref={root}>
    <group ref={dribbleBall} position={[-DRIBBLE_BALL_X * h, ballRadius, DRIBBLE_BALL_Z * h]} visible={false}><Ball radius={ballRadius} castShadow /></group>
    <group ref={body}>
    {[-1, 1].map((side, index) => <group key={side} ref={hips[index]} position={[side * .068 * h, HIP * h, 0]}>
      <mesh position={[0, -shortsLength / 2 * h, 0]} castShadow><cylinderGeometry args={[.068 * h, .062 * h, shortsLength * h, 12]} />{shorts}</mesh>
      {!basketball && <mesh position={[0, -(shortsLength + (THIGH - shortsLength) / 2) * h, 0]} castShadow><cylinderGeometry args={[.05 * h, .045 * h, (THIGH - shortsLength) * h, 10]} />{skin}</mesh>}
      <group ref={knees[index]} position={[0, -THIGH * h, 0]}>
        <mesh position={[0, -SHIN / 2 * h, 0]} castShadow><cylinderGeometry args={[.044 * h, .034 * h, SHIN * h, 10]} />{skin}</mesh>
        <mesh position={[0, -(SHIN - sockLength / 2) * h, 0]} castShadow><cylinderGeometry args={[.04 * h, .036 * h, sockLength * h, 10]} />{sock}</mesh>
        <mesh position={[0, -(SHIN + .02) * h, .028 * h]} castShadow><boxGeometry args={[.075 * h, .045 * h, .15 * h]} />{shoe}</mesh>
      </group>
    </group>)}
    <mesh geometry={shortsShape} position={[0, (HIP - .03) * h, 0]} scale={[1, 1, BODY_DEPTH + .1]} castShadow>{shorts}</mesh>
    <group ref={upper} position={[0, HIP * h, 0]}>
      <mesh geometry={torso} position={[0, .02 * h, 0]} scale={[1, 1, BODY_DEPTH]} castShadow>{jersey}</mesh>
      {/* A small number on the chest and a big one on the back, as on a real jersey, so the front and back differ. */}
      {[1, -1].map(side => <mesh key={side} position={[0, (side > 0 ? .21 : .17) * h, side * .106 * h]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}><planeGeometry args={side > 0 ? [.08 * h, .08 * h] : [.15 * h, .15 * h]} /><meshBasicMaterial map={numberMap} transparent depthWrite={false} /></mesh>)}
      {[-1, 1].map((side, index) => <group key={side} ref={shoulders[index]} position={[side * .165 * h, (SHOULDER - HIP) * h, 0]}>
        <mesh castShadow><sphereGeometry args={[.048 * h, 12, 10]} />{basketball ? skin : jersey}</mesh>
        {!basketball && <mesh position={[0, -.045 * h, 0]} castShadow><cylinderGeometry args={[.047 * h, .043 * h, .09 * h, 10]} />{jersey}</mesh>}
        <mesh position={[0, -UPPER_ARM / 2 * h, 0]} castShadow><cylinderGeometry args={[.036 * h, .031 * h, UPPER_ARM * h, 10]} />{skin}</mesh>
        <group ref={elbows[index]} position={[0, -UPPER_ARM * h, 0]}>
          <mesh position={[0, -FOREARM / 2 * h, 0]} castShadow><cylinderGeometry args={[.031 * h, .026 * h, FOREARM * h, 10]} />{skin}</mesh>
          <mesh position={[0, -(FOREARM + .02) * h, 0]} castShadow><sphereGeometry args={[.032 * h, 10, 8]} />{skin}</mesh>
          {/* The ball rides in the shooting hand, nudged towards the middle so both hands hold it at the chest. */}
          {index === 0 && holding && <group position={[.06 * h, -(FOREARM + .02) * h - ballRadius * .7, ballRadius * .6]}><Ball radius={ballRadius} castShadow /></group>}
        </group>
      </group>)}
      <mesh position={[0, .33 * h, 0]}><cylinderGeometry args={[.04 * h, .046 * h, .06 * h, 10]} />{skin}</mesh>
      <group position={[0, .42 * h, 0]}>
        <mesh scale={[1, 1.1, 1]} castShadow><sphereGeometry args={[.083 * h, 20, 16]} />{skin}</mesh>
        {/* Hair covers the whole crown and the back of the head down to the neck; the face stays clear, so which way a
            figure looks reads from any camera angle, also from straight above. */}
        <mesh scale={[1, 1.1, 1]}><sphereGeometry args={[.088 * h, 20, 10, 0, Math.PI * 2, 0, Math.PI * .4]} />{hair}</mesh>
        <mesh scale={[1, 1.1, 1]}><sphereGeometry args={[.088 * h, 20, 12, Math.PI, Math.PI, 0, Math.PI * .7]} />{hair}</mesh>
      </group>
    </group>
    {/* An invisible column makes the whole figure easy to click. */}
    <mesh position={[0, .5 * h, 0]}><cylinderGeometry args={[.2 * h, .2 * h, h, 10]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
  </group></group>;
}

function Marker({ marker, Ball, ballSize, scale, figureHeight, outfit, focus, handPoses, animatedPosition, selected, theme, view, showName, labelScale = 1, interactive = true, onPointerDown }: { marker: ExerciseMarker; Ball: BallComponent; ballSize: number | null; scale: number; figureHeight: number; outfit: FigureOutfit; focus?: ExercisePlayerFocus; handPoses: boolean; animatedPosition?: THREE.Vector3; selected: boolean; theme: "light" | "dark"; view: ExerciseView; showName: boolean; labelScale?: number; interactive?: boolean; onPointerDown: (id: string, additive: boolean) => void }) {
  const texture = useMemo(() => textureFor(marker.kind === "ball" ? "Pallo" : marker.name, view === "2d" ? 42 : 34, theme), [marker, theme, view]); useEffect(() => () => texture.dispose(), [texture]);
  const color = getExerciseMarkerColor(marker, theme), ringColor = marker.team === "red" ? "#d6dde0" : "#f2f6f7";
  const showFigure = marker.kind === "player" && view === "3d";
  // In 3D the figure is the player and stands on the floor; the disc is only drawn in 2D.
  const isEquipment = marker.kind !== "player" && marker.kind !== "ball", baseY = isEquipment || showFigure ? .02 : .11;
  const goalRadius = GOAL_DIMENSIONS[marker.goalSize ?? "youth"].width / 2;
  const selectionRadius = marker.kind === "player" ? [.26, .31] : marker.kind === "bench" || marker.kind === "ladder" ? [.62, .69] : marker.kind === "dummy" || marker.kind === "tall-cone" ? [.2, .25] : marker.kind === "goal" ? [goalRadius + .08, goalRadius + .14] : [.14, .19];
  // While moving the figure strides and faces where it is going; otherwise it looks where the focus rule says.
  const motion = useRef<FigureMotion>({ heading: 0, phase: 0, moving: false }), lastPosition = useRef<THREE.Vector3 | null>(null);
  useEffect(() => {
    const state = motion.current, previous = lastPosition.current, position = animatedPosition ?? new THREE.Vector3(marker.x, 0, marker.z);
    lastPosition.current = animatedPosition?.clone() ?? null;
    const dx = previous && animatedPosition ? animatedPosition.x - previous.x : 0, dz = previous && animatedPosition ? animatedPosition.z - previous.z : 0, step = Math.hypot(dx, dz);
    state.moving = step > .0005;
    if (state.moving) { state.heading = Math.atan2(dx, dz); state.phase += step / (.42 * figureHeight * scale) * Math.PI; return; }
    if (focus?.heading !== undefined) state.heading = focus.heading;
    else if (focus?.target) state.heading = Math.atan2(focus.target.x - position.x, focus.target.z - position.z);
  }, [animatedPosition, focus, figureHeight, marker.x, marker.z, scale]);
  const pose = handPoses ? focus?.pose ?? null : null;
  const nameY = marker.kind === "dummy" && view === "3d" ? .82 : showFigure ? figureHeight + .2 : marker.kind === "player" ? .31 : .24;
  const nameZ = view === "2d" && marker.kind === "dummy" ? -.3 : view === "2d" && marker.kind !== "player" ? -.2 : 0;
  const spriteScale = ((view === "2d" ? [1.52, .42, 1] : [1.35, .37, 1]).map(value => value * labelScale)) as [number, number, number];
  return <group position={[animatedPosition?.x ?? marker.x, baseY, animatedPosition?.z ?? marker.z]} scale={scale} onPointerDown={(event: ThreeEvent<PointerEvent>) => { if (!interactive) return; event.stopPropagation(); onPointerDown(marker.id, event.shiftKey); }}>
    {marker.kind === "ball" && <Ball radius={ballSize ? ballSize / scale : .1} castShadow={view === "3d"} />}
    {marker.kind === "player" && !showFigure && <><mesh castShadow={view === "3d"}><cylinderGeometry args={[.19, .19, .12, 32]} /><meshStandardMaterial color={color} roughness={.4} emissive={selected ? color : "#000"} emissiveIntensity={selected ? .35 : 0} /></mesh><mesh position={[0, .065, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.14, .18, 32]} /><meshBasicMaterial color={ringColor} /></mesh></>}
    {showFigure && <PlayerFigure height={figureHeight} color={color} number={marker.number} outfit={outfit} motion={motion} pose={pose} passStyle={focus?.passStyle} shotStyle={focus?.shotStyle} poseProgress={focus?.poseProgress} releaseAt={focus?.releaseAt} holding={handPoses && Boolean(focus?.holding)} Ball={Ball} ballRadius={(ballSize ?? .13 * scale) / scale} selected={selected} />}
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

/** Heights a ball is carried at in scene units, for sports where it is played with the hands rather than along the ground. */
interface BallHeights { pass: number }

/** Heights of a lob in scene units: where it is thrown and caught, and how far it rises above that line at the least and per unit of pass length. */
interface LobArc { release: number; catch: number; minLift: number; liftPerUnit: number }

/** The flight of a lob from the passer to the receiver. */
function createLobCurve(start: THREE.Vector3, end: THREE.Vector3, arc: LobArc) {
  const lift = Math.max(arc.minLift, Math.hypot(end.x - start.x, end.z - start.z) * arc.liftPerUnit);
  return new THREE.CatmullRomCurve3(Array.from({ length: 25 }, (_, index) => {
    const t = index / 24;
    return new THREE.Vector3(start.x + (end.x - start.x) * t, arc.release + (arc.catch - arc.release) * t + 4 * lift * t * (1 - t), start.z + (end.z - start.z) * t);
  }));
}

// A bounce pass hits the floor about two thirds of the way and comes up to the receiver's waist.
const BOUNCE_POINT = .62;

/** Heights of a jump shot in scene units: where the ball leaves the hands, where the rim is, and how far above the rim it must at least rise. */
interface ShotArc { release: number; rim: number; clearance: number }

// Shots come down into the rim at about 45°, so the arc rises higher the further out the shot is taken.
const SHOT_ENTRY_SLOPE = Math.tan(THREE.MathUtils.degToRad(45));

/** How much the arc bulges above the straight line from release to rim, for a shot of this length. */
function getShotLift(arc: ShotArc, distance: number) {
  const average = (arc.release + arc.rim) / 2;
  return Math.max(arc.rim + arc.clearance - average, (distance * SHOT_ENTRY_SLOPE + arc.rim - arc.release) / 4);
}

// The ball spends most of the shot in flight and the rest dropping through the net to the floor.
const SHOT_FLIGHT_SHARE = .82;

/** Where a shot into the basket is at a point in its playback, and how high it is relative to the arc's peak. */
function getHoopShotPoint(start: THREE.Vector3, hoop: { x: number; z: number }, arc: ShotArc, ballRadius: number, progress: number) {
  const lift = getShotLift(arc, Math.hypot(hoop.x - start.x, hoop.z - start.z)), peak = Math.max(.1, Math.max(arc.rim, (arc.release + arc.rim) / 2 + lift) - arc.release);
  if (progress < SHOT_FLIGHT_SHARE) {
    const t = progress / SHOT_FLIGHT_SHARE;
    const y = arc.release + (arc.rim - arc.release) * t + 4 * lift * t * (1 - t);
    return { point: new THREE.Vector3(start.x + (hoop.x - start.x) * t, y, start.z + (hoop.z - start.z) * t), height: (y - arc.release) / peak };
  }
  const drop = (progress - SHOT_FLIGHT_SHARE) / (1 - SHOT_FLIGHT_SHARE), y = arc.rim - (arc.rim - ballRadius) * drop * drop;
  return { point: new THREE.Vector3(hoop.x, y, hoop.z), height: (y - arc.release) / peak };
}

/** A pulsing ring around a rim that marks it as something to shoot at, with a generous hit area around it. */
function HoopTarget({ hoop, rim, onPointerDown }: { hoop: { x: number; z: number }; rim: number; onPointerDown: () => void }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { ring.current?.scale.setScalar(1 + .12 * Math.sin(clock.elapsedTime * 4)); });
  return <group position={[hoop.x, rim + .02, hoop.z]}>
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}><ringGeometry args={[.3, .4, 40]} /><meshBasicMaterial color={SHOT_TARGET_COLOR} transparent opacity={.95} depthTest={false} side={THREE.DoubleSide} /></mesh>
    <mesh onPointerDown={(event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onPointerDown(); }}><sphereGeometry args={[.6, 16, 12]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
  </group>;
}

const SHOT_TARGET_COLOR = "#ff766c";

/** The flight of a shot into the basket, from the release above the shooter to the rim. */
function createHoopShotCurve(start: THREE.Vector3, hoop: { x: number; z: number }, arc: ShotArc) {
  return new THREE.CatmullRomCurve3(Array.from({ length: 25 }, (_, index) => getHoopShotPoint(start, hoop, arc, 0, SHOT_FLIGHT_SHARE * index / 24).point));
}

function AnimatedPath({ path, Ball, ballScale, ballSize, shotArcs, ballHeights, lob, view, from, to, theme, playbackPositionMs, showPlaybackFrame, timelineEntry, timelineTotalMs, selected, erase, interactive, onSelect }: { path: ExercisePath; Ball: BallComponent; ballScale: number; ballSize: number | null; lob: LobArc; shotArcs: Record<ExerciseShotStyle, ShotArc> | null; ballHeights: BallHeights | null; view: ExerciseView; from: ExerciseMarker; to: PathTarget; theme: "light" | "dark"; playbackPositionMs: number; showPlaybackFrame: boolean; timelineEntry: ExerciseTimelineEntry; timelineTotalMs: number; selected: boolean; erase: boolean; interactive: boolean; onSelect: (id: string) => void }) {
  const pulse = useRef<THREE.Group | null>(null);
  const hoopShot = path.kind === "shot" && to.kind === "point" && shotArcs ? shotArcs[path.shotStyle ?? "jump"] : null;
  const groundCurve = useMemo<THREE.Curve<THREE.Vector3>>(() => createPathCurve(path, from, to), [from, path, to]);
  // A shot at the basket is drawn along its flight; a line along the floor would read as a pass to under the basket.
  const lobbed = path.kind === "pass" && path.passStyle === "lob", bounced = path.kind === "pass" && path.passStyle === "bounce";
  // Shots at the basket and lobs are drawn along their flight; everything else along the floor.
  const curve = useMemo<THREE.Curve<THREE.Vector3>>(() => hoopShot ? createHoopShotCurve(groundCurve.getPoint(0), to, hoopShot)
    // An alley-oop lob is caught in the air, at about rim height, by a receiver who has already taken off.
    : lobbed ? createLobCurve(groundCurve.getPoint(0), groundCurve.getPoint(1), timelineEntry.alleyOop && shotArcs ? { ...lob, catch: shotArcs.dunk.rim + .1 } : lob) : groundCurve, [groundCurve, hoopShot, lob, lobbed, shotArcs, timelineEntry.alleyOop, to]);
  const bouncePoint = useMemo(() => groundCurve.getPoint(BOUNCE_POINT), [groundCurve]);
  const movementCurve = useMemo<THREE.Curve<THREE.Vector3>>(() => createPathCurve(path, from, to, false), [from, path, to]);
  const color = getExercisePathColor(path.kind, theme);
  useFrame(() => {
    if (!pulse.current) return;
    const playback = getExerciseTimelineProgressAt(playbackPositionMs, timelineEntry, timelineTotalMs), active = showPlaybackFrame && playback.active;
    pulse.current.visible = active;
    if (!active) return;
    const animatedCurve = path.kind === "dribble" ? movementCurve : curve;
    if (hoopShot) {
      // Seen from above the arc has no height, so in 2D the ball grows towards the peak and shrinks as it drops through the net.
      const shot = getHoopShotPoint(groundCurve.getPoint(0), to, hoopShot, ballRadius, playback.progress);
      pulse.current.position.copy(shot.point);
      pulse.current.scale.setScalar(view === "2d" ? Math.max(.6, 1 + .55 * shot.height) : 1);
      pulse.current.rotation.x = playback.progress * Math.PI * 3;
      return;
    }
    pulse.current.position.copy(animatedCurve.getPoint(playback.progress));
    // Played by hand, a pass flies at chest height with a slight lift and a dribble bounces between the floor and the hip.
    // Played by hand, a direct pass flies at chest height with a slight lift; a bounce pass drops to the floor and
    // comes up to the receiver's waist. A lob already carries its height in its curve.
    if (ballHeights && path.kind === "pass" && !lobbed) {
      const t = playback.progress;
      pulse.current.position.y = bounced ? (t < BOUNCE_POINT ? ballHeights.pass + (ballRadius - ballHeights.pass) * (t / BOUNCE_POINT) : ballRadius + (ballHeights.pass * .75 - ballRadius) * ((t - BOUNCE_POINT) / (1 - BOUNCE_POINT)))
        : ballHeights.pass + Math.sin(Math.PI * t) * .12;
    }
    if (lobbed && view === "2d") pulse.current.scale.setScalar(1 + .45 * Math.sin(Math.PI * playback.progress));
    if (path.kind === "pass" || path.kind === "shot") pulse.current.rotation.x = playback.progress * Math.PI * 4;
    else { const tangent = animatedCurve.getTangent(playback.progress); pulse.current.rotation.set(0, -Math.atan2(tangent.z, tangent.x), 0); }
  });
  const ballRadius = ballSize ?? .13 * ballScale, animatedBall = <Ball radius={ballRadius} />;
  const dashed = path.kind === "run" || path.kind === "dribble";
  return <group onPointerDown={(event: ThreeEvent<PointerEvent>) => { if (!interactive) return; event.stopPropagation(); onSelect(path.id); }}>{selected && <PathStroke curve={curve} radius={.075} color="#fff" dashed={dashed} opacity={.7} />}<PathStroke curve={curve} radius={.042} color={erase ? "#ff766c" : color} dashed={dashed} />{bounced && <mesh position={[bouncePoint.x, .02, bouncePoint.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.07, .12, 24]} /><meshBasicMaterial color={erase ? "#ff766c" : color} /></mesh>}<mesh><tubeGeometry args={[curve, 20, .14, 6, false]} /><meshBasicMaterial transparent opacity={.001} depthWrite={false} /></mesh>{path.kind !== "run" && !(path.kind === "dribble" && (from.kind === "ball" || ballHeights)) && <group ref={pulse} visible={false}>{path.kind === "dribble" ? <group position={[.23, .02, 0]}>{animatedBall}</group> : animatedBall}</group>}</group>;
}

function Annotation({ item, erase, editing, selected, theme, interactive, onErase, onSelect }: { item: ExerciseAnnotation; erase: boolean; editing: boolean; selected: boolean; theme: "light" | "dark"; interactive: boolean; onErase: (id: string) => void; onSelect: (id: string) => void }) {
  const click = (event: ThreeEvent<PointerEvent>) => { if (!interactive) return; event.stopPropagation(); erase ? onErase(item.id) : onSelect(item.id); };
  const texture = useMemo(() => item.kind === "text" ? textureFor(item.text || "Teksti", 28, theme) : null, [item.kind, item.text, theme]); useEffect(() => () => texture?.dispose(), [texture]);
  if (item.kind === "text") return editing ? null : <sprite onPointerDown={click} position={[item.points[0]?.x || 0, .16, item.points[0]?.z || 0]} scale={[1.8, .5, 1]}><spriteMaterial map={texture} transparent depthTest={false} /></sprite>;
  return <AnnotationStroke item={item} selected={selected} interactive={interactive} onPointerDown={click} />;
}

function createAnnotationStrokeGeometry(item: ExerciseAnnotation, halfWidth: number) {
    const points = getExerciseAnnotationPoints(item).filter((point, index, all) => index === 0 || Math.hypot(point.x - all[index - 1].x, point.z - all[index - 1].z) > .0001);
    const vertices: number[] = [], indices: number[] = [];
    if (item.kind === "arrow") {
      // Independent strips keep the arrowhead joins stable in every direction.
      points.slice(1).forEach((end, index) => {
        const start = points[index], dx = end.x - start.x, dz = end.z - start.z, length = Math.hypot(dx, dz);
        if (length < .0001) return;
        const nx = -dz / length * halfWidth, nz = dx / length * halfWidth, n = vertices.length / 3;
        vertices.push(start.x + nx, .018, start.z + nz, start.x - nx, .018, start.z - nz,
          end.x + nx, .018, end.z + nz, end.x - nx, .018, end.z - nz);
        indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      });
      const result = new THREE.BufferGeometry();
      result.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); result.setIndex(indices);
      return result;
    }
    const closed = points.length > 2 && Math.hypot(points[0].x - points.at(-1)!.x, points[0].z - points.at(-1)!.z) < .0001;
    points.forEach((point, index) => {
      const before = points[index - 1] ?? (closed ? points.at(-2)! : point);
      const after = points[index + 1] ?? (closed ? points[1] : point);
      const incoming = new THREE.Vector2(point.x - before.x, point.z - before.z).normalize();
      const outgoing = new THREE.Vector2(after.x - point.x, after.z - point.z).normalize();
      if (incoming.lengthSq() === 0) incoming.copy(outgoing);
      if (outgoing.lengthSq() === 0) outgoing.copy(incoming);
      const normal = new THREE.Vector2(-incoming.y - outgoing.y, incoming.x + outgoing.x).normalize();
      const scale = Math.min(halfWidth * 3, halfWidth / Math.max(.1, normal.dot(new THREE.Vector2(-outgoing.y, outgoing.x))));
      normal.multiplyScalar(scale);
      vertices.push(point.x + normal.x, .018, point.z + normal.y, point.x - normal.x, .018, point.z - normal.y);
      if (index > 0) { const n = index * 2; indices.push(n - 2, n - 1, n, n - 1, n + 1, n); }
    });
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); result.setIndex(indices);
    return result;
}

function AnnotationStroke({ item, selected, interactive, onPointerDown }: { item: ExerciseAnnotation; selected: boolean; interactive: boolean; onPointerDown: (event: ThreeEvent<PointerEvent>) => void }) {
  const geometry = useMemo(() => createAnnotationStrokeGeometry(item, ({ 1: .012, 2: .026, 3: .05 } as const)[item.width ?? 2]), [item]);
  const hitGeometry = useMemo(() => interactive && (item.width ?? 2) !== 3 ? createAnnotationStrokeGeometry(item, .075) : null, [item, interactive]);
  useEffect(() => () => { geometry.dispose(); hitGeometry?.dispose(); }, [geometry, hitGeometry]);
  return <group>
    <mesh geometry={geometry} onPointerDown={onPointerDown}><meshBasicMaterial color={selected ? "#fff" : item.color} side={THREE.DoubleSide} /></mesh>
    {hitGeometry && <mesh geometry={hitGeometry} onPointerDown={onPointerDown}><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} side={THREE.DoubleSide} /></mesh>}
  </group>;
}

function TextEditorTracker({ item, inputRef, orientation }: { item: ExerciseAnnotation; inputRef: RefObject<HTMLInputElement | null>; orientation: ExercisePitchOrientation }) {
  const { camera, size } = useThree(), point = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => { if (!inputRef.current) return; const x = item.points[0]?.x || 0, z = item.points[0]?.z || 0; point.set(orientation === "portrait" ? z : x, .24, orientation === "portrait" ? -x : z).project(camera); inputRef.current.style.left = `${(point.x * .5 + .5) * size.width}px`; inputRef.current.style.top = `${(-point.y * .5 + .5) * size.height}px`; });
  return null;
}

function Scene(props: ExerciseCanvasProps & { editingInputRef: RefObject<HTMLInputElement | null>; resetSignal: number; onZoomChange: (percent: number) => void }) {
  const dragging = useRef<string | null>(null), [selectionBox, setSelectionBox] = useState<{ start: { x: number; z: number }; end: { x: number; z: number }; additive: boolean } | null>(null), markerMap = useMemo(() => Object.fromEntries(props.markers.map(marker => [marker.id, marker])), [props.markers]), editingText = props.annotations.find(item => item.id === props.editingTextId);
  const court = getExerciseCourt(props.court), { Surface, Ball, shotArcs, figureHeight, outfit, ballHeights, ballRadius, lob } = COURT_RENDERERS[court.id];
  const timeline = useMemo(() => buildExerciseTimeline(props.paths, props.markers, court.pace), [court.pace, props.markers, props.paths]);
  const timelineByPath = useMemo(() => new Map(timeline.entries.map(entry => [entry.pathId, entry])), [timeline.entries]);
  // Every player looks somewhere that makes sense at this moment, also when nothing plays: the start of the drill is shown.
  const focusPositionMs = props.showPlaybackFrame ? props.playbackPositionMs : 0;
  const focuses = useMemo(() => new Map(props.markers.filter(marker => marker.kind === "player").map(marker => [marker.id, getExercisePlayerFocus(marker, props.markers, props.paths, timeline.entries, focusPositionMs)])), [focusPositionMs, props.markers, props.paths, timeline.entries]);
  const animatedMarkerPositions = useMemo(() => {
    const positions = new Map<string, THREE.Vector3>();
    if (!props.showPlaybackFrame) return positions;
    props.markers.forEach(marker => {
      const position = getExerciseMarkerPositionAt(marker, props.paths, timeline.entries, props.playbackPositionMs);
      positions.set(marker.id, new THREE.Vector3(position.x, .075, position.z));
    });
    return positions;
  }, [props.markers, props.paths, props.playbackPositionMs, props.showPlaybackFrame, timeline.entries]);
  const dimensions = getExercisePitchDimensions(court.id, props.pitchPreset), reference = court.presets[0].dimensions, limitX = dimensions.length / 2 - .25, limitZ = dimensions.width / 2 - .25;
  const pitchPoint = (point: THREE.Vector3) => props.pitchOrientation === "portrait" ? { x: -point.z, z: point.x } : { x: point.x, z: point.z };
  const pointer = (phase: "down" | "move" | "up", event: ThreeEvent<PointerEvent>) => {
    const groundPoint = event.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -.01), new THREE.Vector3());
    if (!groundPoint || props.interactive === false) return;
    event.stopPropagation();
    const point = pitchPoint(groundPoint), bounded = { x: THREE.MathUtils.clamp(point.x, -limitX, limitX), z: THREE.MathUtils.clamp(point.z, -limitZ, limitZ) };
    if (phase === "move" && dragging.current) props.onMove(dragging.current, bounded.x, bounded.z);
    if (props.tool === "select" && !dragging.current) {
      if (phase === "down") { (event.target as unknown as PointerCaptureTarget).setPointerCapture(event.pointerId); if (!event.shiftKey) props.onSelect(null); setSelectionBox({ start: bounded, end: bounded, additive: event.shiftKey }); }
      else if (phase === "move" && selectionBox) setSelectionBox(current => current ? { ...current, end: bounded } : null);
      else if (phase === "up" && selectionBox) {
        const left = Math.min(selectionBox.start.x, bounded.x), right = Math.max(selectionBox.start.x, bounded.x), top = Math.min(selectionBox.start.z, bounded.z), bottom = Math.max(selectionBox.start.z, bounded.z);
        props.onBoxSelect(props.markers.filter(marker => marker.x >= left && marker.x <= right && marker.z >= top && marker.z <= bottom).map(marker => marker.id), props.annotations.filter(item => exerciseAnnotationIntersectsBox(item, { left, right, top, bottom })).map(item => item.id), selectionBox.additive);
        setSelectionBox(null); (event.target as unknown as PointerCaptureTarget).releasePointerCapture(event.pointerId);
      }
      return;
    }
    if (phase === "up") dragging.current = null;
    if (["draw", "line", "arrow", "rectangle", "circle"].includes(props.tool)) {
      const target = event.target as unknown as PointerCaptureTarget;
      if (phase === "down") target.setPointerCapture(event.pointerId);
      if (phase === "up") target.releasePointerCapture(event.pointerId);
    }
    props.onPitchPointer(phase, point.x, point.z);
  };
  return <><color attach="background" args={[props.theme === "dark" ? "#081217" : "#e7edef"]} /><ambientLight intensity={props.theme === "dark" ? 1.25 : 1.55} /><directionalLight position={[4, 9, 5]} intensity={props.theme === "dark" ? 1.8 : 1.55} castShadow={props.view === "3d"} /><group rotation={[0, props.pitchOrientation === "portrait" ? Math.PI / 2 : 0, 0]}><Surface preset={props.pitchPreset} dimensions={dimensions} reference={reference} goalSize={props.goalSize} style={props.pitchStyle} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .01, 0]} onPointerMove={(event: ThreeEvent<PointerEvent>) => { if (!event.shiftKey) pointer("move", event); }} onPointerUp={(event: ThreeEvent<PointerEvent>) => { if (!event.shiftKey) pointer("up", event); }} onPointerCancel={(event: ThreeEvent<PointerEvent>) => pointer("up", event)} onPointerDown={(event: ThreeEvent<PointerEvent>) => { if (event.shiftKey) return; if (props.tool !== "select" && props.tool !== "pass" && props.tool !== "run") props.onSelect(null); pointer("down", event); }}><planeGeometry args={[dimensions.length, dimensions.width]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
    {props.paths.map(path => { const timelineEntry = timelineByPath.get(path.id), source = markerMap[path.fromId], from = source ? { ...source, ...timelineEntry?.from } : null, targetMarker = path.toId ? markerMap[path.toId] : null, to: PathTarget | null = targetMarker ? { ...targetMarker, ...timelineEntry?.to } : timelineEntry?.to ? { ...timelineEntry.to, kind: "point" } : null; return from && to && timelineEntry ? <AnimatedPath key={path.id} path={path} Ball={Ball} ballScale={court.markerScale} ballSize={ballRadius} lob={lob} shotArcs={shotArcs} ballHeights={ballHeights} view={props.view} from={from} to={to} theme={props.theme} playbackPositionMs={props.playbackPositionMs} showPlaybackFrame={props.showPlaybackFrame} timelineEntry={timelineEntry} timelineTotalMs={timeline.totalMs} selected={path.id === props.selectedPathId} erase={props.tool === "erase"} interactive={props.interactive !== false && (props.tool === "select" || props.tool === "erase")} onSelect={props.onSelectPath} /> : null; })}
    {props.annotations.map(item => <Annotation key={item.id} item={item} erase={props.tool === "erase"} editing={item.id === props.editingTextId} selected={props.selectedAnnotationIds.includes(item.id)} theme={props.theme} interactive={props.interactive !== false && (props.tool === "select" || props.tool === "erase")} onErase={props.onEraseAnnotation} onSelect={props.onSelectAnnotation} />)}
    {shotArcs && props.tool === "shot" && props.interactive !== false && props.onHoopPointer && getExerciseHoops(court.id, props.pitchPreset).map(hoop => <HoopTarget key={hoop.x} hoop={hoop} rim={shotArcs.jump.rim} onPointerDown={() => props.onHoopPointer?.(hoop)} />)}
    {selectionBox && <SelectionBox start={selectionBox.start} end={selectionBox.end} />}
    {props.markers.map(marker => <Marker key={marker.id} marker={marker} Ball={Ball} ballSize={ballRadius} scale={court.markerScale} figureHeight={figureHeight} outfit={outfit} focus={focuses.get(marker.id)} handPoses={Boolean(ballHeights)} animatedPosition={animatedMarkerPositions.get(marker.id)} selected={props.selectedIds.includes(marker.id)} theme={props.theme} view={props.view} labelScale={props.labelScale} showName={props.showNames && marker.kind !== "goal"} interactive={props.interactive !== false && ["select", "erase", "pass", "run", "dribble", "shot"].includes(props.tool)} onPointerDown={(id, additive) => { if (props.tool === "select") dragging.current = id; props.onSelect(id, additive); }} />)}
    {editingText && <TextEditorTracker item={editingText} inputRef={props.editingInputRef} orientation={props.pitchOrientation} />}</group><CameraControls view={props.view} dimensions={dimensions} reference={reference} pitchOrientation={props.pitchOrientation} zoomScale={props.zoomScale} resetSignal={props.resetSignal} onZoomChange={props.onZoomChange} />
  </>;
}

export function ExerciseCanvas(props: ExerciseCanvasProps) {
  const is2d = props.view === "2d", editingText = props.annotations.find(item => item.id === props.editingTextId), editingInputRef = useRef<HTMLInputElement>(null);
  const [zoomPercent, setZoomPercent] = useState(100), [resetSignal, setResetSignal] = useState(0);
  useEffect(() => setZoomPercent(100), [props.pitchOrientation, props.court, props.pitchPreset, props.view]);
  return <><div className="exercise-canvas-wrap"><Canvas key={`${props.court ?? "football"}-${props.view}-${props.pitchPreset}-${props.pitchOrientation}`} className="exercise-canvas" gl={{ preserveDrawingBuffer: true }} shadows={!is2d} orthographic={is2d} camera={is2d ? { position: [0, 10, .01], zoom: 82, near: .1, far: 30 } : { position: [0, 8, 8.8], fov: 42, near: .1, far: 60 }} dpr={[1, 1.5]}><Scene {...props} editingInputRef={editingInputRef} resetSignal={resetSignal} onZoomChange={setZoomPercent} /></Canvas>{editingText && <input ref={editingInputRef} className="exercise-canvas-text-input" autoFocus value={editingText.text || ""} placeholder="Kirjoita teksti" aria-label="Kentän teksti" onPointerDown={event => event.stopPropagation()} onChange={event => props.onChangeText(editingText.id, event.target.value.slice(0, 80))} onBlur={() => props.onFinishTextEdit(editingText.id)} onKeyDown={event => { event.stopPropagation(); if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur(); }} />}</div><div className="exercise-zoom-status" aria-label={`Näkymän zoomaus ${zoomPercent} prosenttia`}><output><ZoomIn size={15} />{zoomPercent} %</output>{(props.showResetAtDefault !== false || zoomPercent !== 100) && <button onClick={() => setResetSignal(current => current + 1)} title="Palauta näkymä 100 prosenttiin" aria-label="Palauta näkymä 100 prosenttiin"><RotateCcw size={14} />Palauta</button>}</div></>;
}
