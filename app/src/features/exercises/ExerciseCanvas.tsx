import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ExerciseMarker, ExercisePath, ExerciseView } from "./exerciseTypes";

interface ExerciseCanvasProps {
  view: ExerciseView;
  markers: ExerciseMarker[];
  paths: ExercisePath[];
  selectedId: string | null;
  playing: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, z: number) => void;
  onPitchClick: (x: number, z: number) => void;
}

const PITCH_WIDTH = 12;
const PITCH_HEIGHT = 8;

function CameraControls({ view }: { view: ExerciseView }) {
  const { camera, gl, size } = useThree();

  useEffect(() => {
    if (view !== "3d") return;
    if (size.width / size.height < 1.1) camera.position.set(0, 9, 12.5);
    const controls = new OrbitControls(camera, gl.domElement);
    controls.target.set(0, 0, 1.05);
    controls.enableDamping = true;
    controls.minDistance = 7;
    controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.update();
    return () => controls.dispose();
  }, [camera, gl, size.height, size.width, view]);

  return null;
}

function PitchLine({ points }: { points: Array<[number, number]> }) {
  const geometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) => new THREE.Vector3(x, 0.018, z))),
    [points],
  );
  const line = useMemo(() => new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: "#eef7ef", transparent: true, opacity: 0.88 })), [geometry]);
  useEffect(() => () => {
    geometry.dispose();
    (line.material as THREE.Material).dispose();
  }, [geometry, line]);
  return <primitive object={line} />;
}

function PitchMarkings() {
  const circle = useMemo(() => Array.from({ length: 49 }, (_, index) => {
    const angle = (index / 48) * Math.PI * 2;
    return [Math.cos(angle) * 1.05, Math.sin(angle) * 1.05] as [number, number];
  }), []);

  return (
    <group>
      <PitchLine points={[[-5.75, -3.75], [5.75, -3.75], [5.75, 3.75], [-5.75, 3.75], [-5.75, -3.75]]} />
      <PitchLine points={[[0, -3.75], [0, 3.75]]} />
      <PitchLine points={circle} />
      <PitchLine points={[[-2.05, -3.75], [-2.05, -2.5], [2.05, -2.5], [2.05, -3.75]]} />
      <PitchLine points={[[-2.05, 3.75], [-2.05, 2.5], [2.05, 2.5], [2.05, 3.75]]} />
      <PitchLine points={[[-0.85, -3.75], [-0.85, -3.25], [0.85, -3.25], [0.85, -3.75]]} />
      <PitchLine points={[[-0.85, 3.75], [-0.85, 3.25], [0.85, 3.25], [0.85, 3.75]]} />
    </group>
  );
}

function labelTexture(marker: ExerciseMarker) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 96;
  const context = canvas.getContext("2d")!;
  context.font = "700 31px Manrope, sans-serif";
  context.textAlign = "center";
  context.fillStyle = "rgba(10, 25, 32, .92)";
  const text = marker.kind === "ball" ? "Pallo" : marker.name;
  const width = Math.min(300, context.measureText(text).width + 34);
  context.roundRect((320 - width) / 2, 6, width, 52, 12);
  context.fill();
  context.fillStyle = "white";
  context.fillText(text, 160, 42);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Marker({ marker, selected, onPointerDown }: {
  marker: ExerciseMarker;
  selected: boolean;
  onPointerDown: (id: string) => void;
}) {
  const texture = useMemo(() => labelTexture(marker), [marker]);
  useEffect(() => () => texture.dispose(), [texture]);
  const color = marker.kind === "ball" ? "#f4a51c" : marker.team === "red" ? "#c94e43" : "#1765c1";

  return (
    <group position={[marker.x, 0.12, marker.z]} onPointerDown={(event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onPointerDown(marker.id);
    }}>
      {marker.kind === "ball" ? (
        <mesh castShadow>
          <sphereGeometry args={[0.18, 24, 24]} />
          <meshStandardMaterial color={color} roughness={0.62} />
        </mesh>
      ) : (
        <mesh castShadow>
          <cylinderGeometry args={[0.28, 0.28, 0.13, 32]} />
          <meshStandardMaterial color={color} roughness={0.5} emissive={selected ? "#4f91df" : "#000000"} emissiveIntensity={selected ? 0.35 : 0} />
        </mesh>
      )}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
          <ringGeometry args={[0.36, 0.43, 36]} />
          <meshBasicMaterial color="#f3a712" />
        </mesh>
      )}
      <sprite position={[0, 0.48, 0]} scale={[1.85, 0.56, 1]}>
        <spriteMaterial map={texture} transparent depthTest={false} />
      </sprite>
    </group>
  );
}

function AnimatedPath({ path, from, to, playing }: {
  path: ExercisePath;
  from: ExerciseMarker;
  to: ExerciseMarker;
  playing: boolean;
}) {
  const pulse = useRef<THREE.Mesh>(null);
  const curve = useMemo(() => new THREE.LineCurve3(
    new THREE.Vector3(from.x, 0.12, from.z),
    new THREE.Vector3(to.x, 0.12, to.z),
  ), [from.x, from.z, to.x, to.z]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(curve.getPoints(32)), [curve]);
  const routeLine = useMemo(() => {
    const line = new THREE.Line(geometry, new THREE.LineDashedMaterial({
      color: path.kind === "pass" ? "#f3a712" : "#c7d6ff",
      dashSize: path.kind === "pass" ? 0.24 : 0.12,
      gapSize: 0.12,
    }));
    line.computeLineDistances();
    return line;
  }, [geometry, path.kind]);

  useEffect(() => () => {
    geometry.dispose();
    (routeLine.material as THREE.Material).dispose();
  }, [geometry, routeLine]);

  useFrame(({ clock }) => {
    if (!pulse.current) return;
    const progress = playing ? (clock.getElapsedTime() * 0.42) % 1 : 0;
    pulse.current.position.copy(curve.getPoint(progress));
  });

  const color = path.kind === "pass" ? "#f3a712" : "#c7d6ff";
  return (
    <group>
      <primitive object={routeLine} />
      <mesh ref={pulse}>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ExerciseScene({ view, markers, paths, selectedId, playing, onSelect, onMove, onPitchClick }: ExerciseCanvasProps) {
  const draggingId = useRef<string | null>(null);
  const markerMap = useMemo(() => Object.fromEntries(markers.map((marker) => [marker.id, marker])), [markers]);

  return (
    <>
      <color attach="background" args={[view === "3d" ? "#101b1d" : "#203d32"]} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[4, 9, 5]} intensity={2.2} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[PITCH_WIDTH, PITCH_HEIGHT]} />
        <meshStandardMaterial color="#2f7d3c" roughness={0.92} />
      </mesh>
      <PitchMarkings />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.025, 0]}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          if (!draggingId.current) return;
          onMove(draggingId.current, THREE.MathUtils.clamp(event.point.x, -5.5, 5.5), THREE.MathUtils.clamp(event.point.z, -3.5, 3.5));
        }}
        onPointerUp={() => { draggingId.current = null; }}
        onPointerDown={(event: ThreeEvent<PointerEvent>) => {
          onSelect(null);
          onPitchClick(event.point.x, event.point.z);
        }}
      >
        <planeGeometry args={[PITCH_WIDTH, PITCH_HEIGHT]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {paths.map((path) => {
        const from = markerMap[path.fromId];
        const to = markerMap[path.toId];
        return from && to ? <AnimatedPath key={path.id} path={path} from={from} to={to} playing={playing} /> : null;
      })}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          marker={marker}
          selected={marker.id === selectedId}
          onPointerDown={(id) => {
            draggingId.current = id;
            onSelect(id);
          }}
        />
      ))}
      <CameraControls view={view} />
    </>
  );
}

export function ExerciseCanvas(props: ExerciseCanvasProps) {
  const is2d = props.view === "2d";
  return (
    <Canvas
      key={props.view}
      className="exercise-canvas"
      shadows
      orthographic={is2d}
      camera={is2d
        ? { position: [0, 10, 0.01], zoom: 72, near: 0.1, far: 30 }
        : { position: [0, 7.2, 8.8], fov: 42, near: 0.1, far: 40 }}
      dpr={[1, 1.5]}
    >
      <ExerciseScene {...props} />
    </Canvas>
  );
}
