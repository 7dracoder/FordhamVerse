import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, KeyboardControls, useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import type { Building, CampusEvent, LearningPortal, Player } from "@/lib/types";
import { BUILDINGS, PORTALS, EVENTS } from "@/lib/data";
import { gameStore } from "@/lib/store";

enum Controls {
  forward = "forward",
  back = "back",
  left = "left",
  right = "right",
  jump = "jump",
  sprint = "sprint",
}

const KEY_MAP = [
  { name: Controls.forward, keys: ["ArrowUp", "KeyW"] },
  { name: Controls.back, keys: ["ArrowDown", "KeyS"] },
  { name: Controls.left, keys: ["ArrowLeft", "KeyA"] },
  { name: Controls.right, keys: ["ArrowRight", "KeyD"] },
  { name: Controls.jump, keys: ["Space"] },
  { name: Controls.sprint, keys: ["ShiftLeft", "ShiftRight"] },
];

const TREE_POSITIONS: [number, number][] = [
  [-12, -9], [-9, -9], [-6, -9], [6, -10], [10, -9], [12, -5],
  [-12, 7], [-9, 10], [-4, 11], [7, 10], [11, 8],
  [-3, -12], [3, -12], [-11, 2], [11, 2],
];

// ─── Avatar Body ─────────────────────────────────────────────────────────────
function AvatarBody({
  color,
  hasQuest,
}: {
  color: string;
  hasQuest: boolean;
}) {
  const gemRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (gemRef.current) {
      gemRef.current.rotation.y = clock.elapsedTime * 1.2;
      gemRef.current.position.y = 1.9 + Math.sin(clock.elapsedTime * 3) * 0.05;
    }
  });

  return (
    <>
      {/* Body */}
      <mesh castShadow position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.26, 0.34, 0.82, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Head */}
      <mesh castShadow position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.25, 18, 18]} />
        <meshStandardMaterial color="#d9b59d" roughness={0.7} />
      </mesh>
      {/* Ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.43, 0.55, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* Quest gem */}
      {hasQuest && (
        <mesh ref={gemRef} position={[0, 1.9, 0]} castShadow>
          <octahedronGeometry args={[0.16, 0]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={2.5}
            metalness={0.3}
          />
        </mesh>
      )}
      {hasQuest && <pointLight color="#22c55e" intensity={1.2} distance={3} position={[0, 1.9, 0]} />}
    </>
  );
}

// ─── Remote Player ────────────────────────────────────────────────────────────
function RemotePlayer({ player }: { player: Player }) {
  const group = useRef<THREE.Group>(null);
  const targetPos = useMemo(
    () => new THREE.Vector3(player.position.x, player.position.y, player.position.z),
    [player.position.x, player.position.y, player.position.z]
  );

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.lerp(targetPos, 1 - Math.exp(-delta * 8));
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      player.rotationY,
      1 - Math.exp(-delta * 7)
    );
  });

  return (
    <group
      ref={group}
      position={[player.position.x, player.position.y, player.position.z]}
    >
      <AvatarBody color={player.avatarColor} hasQuest={Boolean(player.activeQuestId)} />
      <Html
        position={[0, 1.75, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            background: "rgba(10,14,28,0.75)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "20px",
            padding: "3px 10px",
            fontSize: "11px",
            fontWeight: 600,
            color: "#e2e8f0",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: player.avatarColor,
              display: "inline-block",
            }}
          />
          {player.displayName}
        </div>
      </Html>
    </group>
  );
}

// ─── Controllable Player ─────────────────────────────────────────────────────
function ControllablePlayer({
  player,
  onMove,
  onProximity,
}: {
  player: Player;
  onMove: (pos: { x: number; y: number; z: number }, rot: number) => void;
  onProximity: (portalId: string | null, eventId: string | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const posRef = useRef(
    new THREE.Vector3(player.position.x, player.position.y, player.position.z)
  );
  const velY = useRef(0);
  const rotRef = useRef(player.rotationY);
  const lastSent = useRef(0);
  const lastPortal = useRef<string | null>(null);
  const lastEvent = useRef<string | null>(null);
  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls<Controls>();

  useFrame(({ clock }, delta) => {
    const { forward, back, left, right, jump, sprint } = getKeys();

    const dir = new THREE.Vector3();
    if (forward) dir.z -= 1;
    if (back) dir.z += 1;
    if (left) dir.x -= 1;
    if (right) dir.x += 1;

    const moving = dir.lengthSq() > 0;
    if (moving) {
      dir.normalize();
      const speed = sprint ? 6.5 : 4;
      posRef.current.addScaledVector(dir, speed * delta);
      posRef.current.x = THREE.MathUtils.clamp(posRef.current.x, -17, 17);
      posRef.current.z = THREE.MathUtils.clamp(posRef.current.z, -17, 17);
      rotRef.current = Math.atan2(dir.x, dir.z);
    }

    // Jump & gravity
    if (jump && posRef.current.y <= 0.01) velY.current = 4.6;
    velY.current -= 11 * delta;
    posRef.current.y += velY.current * delta;
    if (posRef.current.y < 0) {
      posRef.current.y = 0;
      velY.current = 0;
    }

    // Apply to mesh
    if (group.current) {
      group.current.position.copy(posRef.current);
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        rotRef.current,
        1 - Math.exp(-delta * 14)
      );
    }

    // Follow camera
    const camTarget = new THREE.Vector3(
      posRef.current.x,
      posRef.current.y + 5,
      posRef.current.z + 8
    );
    camera.position.lerp(camTarget, 1 - Math.exp(-delta * 4.5));
    camera.lookAt(posRef.current.x, posRef.current.y + 0.8, posRef.current.z);

    // Throttle sync
    if (
      (moving || posRef.current.y > 0.01) &&
      clock.elapsedTime - lastSent.current > 0.1
    ) {
      lastSent.current = clock.elapsedTime;
      onMove(
        { x: posRef.current.x, y: posRef.current.y, z: posRef.current.z },
        rotRef.current
      );
    }

    // Proximity detection
    let nearPortal: string | null = null;
    let nearPortalDist = 2.8;
    for (const portal of PORTALS) {
      const building = BUILDINGS.find((b) => b.id === portal.buildingId);
      if (!building) continue;
      const px = building.position.x - building.size[0] / 2 - 1;
      const pz = building.position.z + building.size[2] / 2 - 0.5;
      const d = posRef.current.distanceTo(new THREE.Vector3(px, 0, pz));
      if (d < nearPortalDist) {
        nearPortal = portal.id;
        nearPortalDist = d;
      }
    }

    let nearEvent: string | null = null;
    let nearEventDist = 3;
    for (const evt of EVENTS) {
      const d = posRef.current.distanceTo(
        new THREE.Vector3(evt.position.x, 0, evt.position.z)
      );
      if (d < nearEventDist) {
        nearEvent = evt.id;
        nearEventDist = d;
      }
    }

    if (nearPortal !== lastPortal.current || nearEvent !== lastEvent.current) {
      lastPortal.current = nearPortal;
      lastEvent.current = nearEvent;
      onProximity(nearPortal, nearEvent);
    }
  });

  return (
    <group
      ref={group}
      position={[player.position.x, player.position.y, player.position.z]}
    >
      <AvatarBody color={player.avatarColor} hasQuest={Boolean(player.activeQuestId)} />
      <Html
        position={[0, 1.75, 0]}
        center
        distanceFactor={12}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            background: "rgba(34,197,94,0.15)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(34,197,94,0.4)",
            borderRadius: "20px",
            padding: "3px 10px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#86efac",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              display: "inline-block",
            }}
          />
          {player.displayName}
        </div>
      </Html>
    </group>
  );
}

// ─── Building Block ───────────────────────────────────────────────────────────
function BuildingBlock({
  building,
  heatmap,
}: {
  building: Building;
  heatmap: boolean;
}) {
  const [w, h, d] = building.size;
  const windowPositions = useMemo<[number, number, number][]>(() => {
    const count = Math.max(2, Math.floor(w / 1.2));
    return Array.from({ length: count }, (_, i) => [
      -w / 2 + 0.65 + i * ((w - 1.3) / Math.max(1, count - 1)),
      h * 0.58,
      d / 2 + 0.012,
    ]);
  }, [w, h, d]);

  const emissiveColor = heatmap ? "#22c55e" : "#000000";
  const emissiveIntensity = heatmap ? 0.4 : 0.1;

  return (
    <group position={[building.position.x, 0, building.position.z]}>
      {/* Main body */}
      <mesh castShadow receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={building.color}
          roughness={0.65}
          metalness={0.15}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      {/* Rooftop ledge */}
      <mesh castShadow position={[0, h + 0.15, 0]}>
        <boxGeometry args={[w + 0.3, 0.3, d + 0.3]} />
        <meshStandardMaterial color="#0d1120" roughness={0.85} />
      </mesh>

      {/* Rooftop accent */}
      <mesh position={[0, h + 0.35, 0]}>
        <boxGeometry args={[w * 0.3, 0.1, d * 0.3]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={1.2}
        />
      </mesh>

      {/* Windows */}
      {windowPositions.map((wp, i) => (
        <mesh key={i} position={wp}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshStandardMaterial
            color="#7dd3fc"
            emissive="#38bdf8"
            emissiveIntensity={0.7}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* Door */}
      <mesh position={[0, 0.75, d / 2 + 0.02]}>
        <planeGeometry args={[0.8, 1.5]} />
        <meshStandardMaterial color="#0a0f1e" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Label */}
      <Html
        position={[0, h + 0.8, 0]}
        center
        distanceFactor={18}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            background: "rgba(10,14,28,0.8)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            padding: "3px 10px",
            fontSize: "11px",
            fontWeight: 600,
            color: "#94a3b8",
            whiteSpace: "nowrap",
          }}
        >
          {building.shortName}
        </div>
      </Html>

      {/* Heatmap glow */}
      {heatmap && <pointLight color="#22c55e" intensity={2} distance={8} position={[0, h + 1, 0]} />}
    </group>
  );
}

// ─── Portal Marker ────────────────────────────────────────────────────────────
function PortalMarker({
  portal,
  onSelect,
}: {
  portal: LearningPortal;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const building = BUILDINGS.find((b) => b.id === portal.buildingId);
  const px = building ? building.position.x - building.size[0] / 2 - 1 : 0;
  const pz = building ? building.position.z + building.size[2] / 2 - 0.5 : 0;

  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.elapsedTime * 0.5;
    group.current.position.y = 1.1 + Math.sin(clock.elapsedTime * 2 + px) * 0.1;
  });

  return (
    <group
      ref={group}
      position={[px, 1.1, pz]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Outer ring */}
      <mesh>
        <torusGeometry args={[0.62, 0.1, 12, 40]} />
        <meshStandardMaterial
          color="#34d399"
          emissive="#22c55e"
          emissiveIntensity={2.5}
          metalness={0.35}
          roughness={0.2}
        />
      </mesh>
      {/* Inner fill */}
      <mesh>
        <circleGeometry args={[0.48, 32]} />
        <meshBasicMaterial
          color="#22c55e"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Glow */}
      <pointLight color="#22c55e" intensity={2} distance={4.5} />
      {/* Label */}
      <Html position={[0, 1.1, 0]} center distanceFactor={12}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={{
            background: "rgba(34,197,94,0.15)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(34,197,94,0.4)",
            borderRadius: "20px",
            padding: "4px 12px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#86efac",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Quest
        </button>
      </Html>
    </group>
  );
}

// ─── Event Marker ─────────────────────────────────────────────────────────────
function EventMarker({
  event,
  onSelect,
}: {
  event: CampusEvent;
  onSelect: () => void;
}) {
  const markerRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (markerRef.current) {
      markerRef.current.position.y =
        0.08 + Math.sin(clock.elapsedTime * 2.5 + event.position.x) * 0.08;
    }
  });

  return (
    <group
      ref={markerRef}
      position={[event.position.x, 0.08, event.position.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Sphere beacon */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.28, 18, 18]} />
        <meshStandardMaterial
          color="#fb7185"
          emissive="#e11d48"
          emissiveIntensity={2}
        />
      </mesh>
      {/* Pole */}
      <mesh position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.7, 8]} />
        <meshStandardMaterial color="#fda4af" />
      </mesh>
      {/* Ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.45, 0.58, 28]} />
        <meshBasicMaterial
          color="#fb7185"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight color="#fb7185" intensity={1.5} distance={4} />
      {/* Label */}
      <Html position={[0, 1.3, 0]} center distanceFactor={13}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={{
            background: "rgba(251,113,133,0.15)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(251,113,133,0.4)",
            borderRadius: "20px",
            padding: "4px 12px",
            fontSize: "11px",
            fontWeight: 700,
            color: "#fda4af",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Live Event
        </button>
      </Html>
    </group>
  );
}

// ─── Tree ─────────────────────────────────────────────────────────────────────
function Tree({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 1.4, 8]} />
        <meshStandardMaterial color="#3d2b1a" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 2.0, 0]}>
        <coneGeometry args={[0.9, 2.2, 8]} />
        <meshStandardMaterial color="#14532d" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 1.4, 0]}>
        <coneGeometry args={[0.65, 1.6, 8]} />
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Campus Ground ────────────────────────────────────────────────────────────
function CampusGround() {
  return (
    <>
      {/* Grass */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#071a12" roughness={0.96} />
      </mesh>
      {/* Main path N-S */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[3.5, 38]} />
        <meshStandardMaterial color="#1e2533" roughness={0.95} />
      </mesh>
      {/* Main path E-W */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[38, 3.5]} />
        <meshStandardMaterial color="#1e2533" roughness={0.95} />
      </mesh>
      {/* Central fountain base */}
      <mesh receiveShadow position={[0, 0.18, 1]}>
        <cylinderGeometry args={[1.4, 1.55, 0.35, 32]} />
        <meshStandardMaterial color="#2a3244" roughness={0.75} />
      </mesh>
      {/* Fountain water */}
      <mesh position={[0, 0.42, 1]}>
        <cylinderGeometry args={[0.9, 1, 0.18, 32]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={0.5}
          roughness={0.28}
          metalness={0.1}
        />
      </mesh>
      <pointLight color="#38bdf8" intensity={1.5} distance={6} position={[0, 1, 1]} />
    </>
  );
}

// ─── Scene Interior ───────────────────────────────────────────────────────────
function SceneContent({
  myPlayer,
  otherPlayers,
  heatmap,
  onMove,
  onProximity,
  onSelectPortal,
  onSelectEvent,
}: {
  myPlayer: Player;
  otherPlayers: Player[];
  heatmap: boolean;
  onMove: (pos: { x: number; y: number; z: number }, rot: number) => void;
  onProximity: (portalId: string | null, eventId: string | null) => void;
  onSelectPortal: (id: string) => void;
  onSelectEvent: (id: string) => void;
}) {
  return (
    <>
      {/* Lighting */}
      <color attach="background" args={["#050a14"]} />
      <fog attach="fog" args={["#050a14", 22, 65]} />
      <ambientLight intensity={0.18} color="#1a3a5c" />
      <directionalLight
        position={[12, 22, 12]}
        intensity={0.9}
        color="#dce8ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-8, 10, -8]} intensity={0.25} color="#1a2f4a" />

      {/* Ground & environment */}
      <CampusGround />
      {TREE_POSITIONS.map(([x, z]) => (
        <Tree key={`${x}-${z}`} x={x} z={z} />
      ))}

      {/* Buildings */}
      {BUILDINGS.map((b) => (
        <BuildingBlock key={b.id} building={b} heatmap={heatmap} />
      ))}

      {/* Portals */}
      {PORTALS.map((p) => (
        <PortalMarker
          key={p.id}
          portal={p}
          onSelect={() => onSelectPortal(p.id)}
        />
      ))}

      {/* Events */}
      {EVENTS.map((e) => (
        <EventMarker
          key={e.id}
          event={e}
          onSelect={() => onSelectEvent(e.id)}
        />
      ))}

      {/* Remote players */}
      {otherPlayers.map((p) => (
        <RemotePlayer key={p.id} player={p} />
      ))}

      {/* Controllable player */}
      <ControllablePlayer
        player={myPlayer}
        onMove={onMove}
        onProximity={onProximity}
      />
    </>
  );
}

// ─── Campus Scene (exported) ──────────────────────────────────────────────────
export function CampusScene({
  myPlayer,
  otherPlayers,
  heatmap,
  onProximity,
  onSelectPortal,
  onSelectEvent,
}: {
  myPlayer: Player;
  otherPlayers: Player[];
  heatmap: boolean;
  onProximity: (portalId: string | null, eventId: string | null) => void;
  onSelectPortal: (id: string) => void;
  onSelectEvent: (id: string) => void;
}) {
  const handleMove = (pos: { x: number; y: number; z: number }, rot: number) => {
    gameStore.updateMyPositionSilent(pos, rot);
  };

  return (
    <KeyboardControls map={KEY_MAP}>
      <Canvas
        camera={{ position: [0, 8, 16], fov: 60 }}
        shadows
        style={{ width: "100%", height: "100%" }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, shadowMapType: THREE.PCFShadowMap }}
      >
        <SceneContent
          myPlayer={myPlayer}
          otherPlayers={otherPlayers}
          heatmap={heatmap}
          onMove={handleMove}
          onProximity={onProximity}
          onSelectPortal={onSelectPortal}
          onSelectEvent={onSelectEvent}
        />
      </Canvas>
    </KeyboardControls>
  );
}
