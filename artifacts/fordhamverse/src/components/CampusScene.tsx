import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, KeyboardControls, Stars, useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import type { Building, CampusEvent, LearningPortal, Player } from "@/lib/types";
import { BUILDINGS, PORTALS, EVENTS } from "@/lib/data";
import { gameStore } from "@/lib/store";
import { touchControls } from "@/lib/touchControls";

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
  [13, -1], [14, 5], [9, 5], [13, 9], [16, 8],
  [-8, -2], [-8, 5], [-13, 5], [-13, 9], [-13, -12],
  [8, -7], [-2, -8], [6, -6], [-9, -5], [9, 13],
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
    const k = getKeys();
    const forward = k.forward || touchControls.forward;
    const back = k.back || touchControls.back;
    const left = k.left || touchControls.left;
    const right = k.right || touchControls.right;
    const jump = k.jump || touchControls.jump;
    const sprint = k.sprint || touchControls.sprint;

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
      const px = portal.position
        ? portal.position.x
        : building.position.x - building.size[0] / 2 - 1;
      const pz = portal.position
        ? portal.position.z
        : building.position.z + building.size[2] / 2 - 0.5;
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

      {/* Rooftop accent (skipped on landmark buildings) */}
      {!building.landmark && (
        <mesh position={[0, h + 0.35, 0]}>
          <boxGeometry args={[w * 0.3, 0.1, d * 0.3]} />
          <meshStandardMaterial
            color="#22c55e"
            emissive="#22c55e"
            emissiveIntensity={1.2}
          />
        </mesh>
      )}

      {/* Keating Hall clock tower */}
      {building.landmark === "tower" && (
        <group position={[0, h, 0]}>
          <mesh castShadow position={[0, 1.6, 0]}>
            <boxGeometry args={[Math.min(w * 0.5, 2), 3.2, Math.min(d * 0.5, 2)]} />
            <meshStandardMaterial
              color={building.color}
              roughness={0.7}
              metalness={0.15}
            />
          </mesh>
          {/* Clock face */}
          <mesh position={[0, 2.4, Math.min(d * 0.5, 2) / 2 + 0.02]}>
            <circleGeometry args={[0.42, 24]} />
            <meshStandardMaterial
              color="#fde68a"
              emissive="#fbbf24"
              emissiveIntensity={0.9}
            />
          </mesh>
          {/* Spire cap */}
          <mesh castShadow position={[0, 3.55, 0]}>
            <coneGeometry args={[Math.min(w * 0.4, 1.5), 1.2, 4]} />
            <meshStandardMaterial color="#161d30" roughness={0.8} />
          </mesh>
          <pointLight
            color="#fbbf24"
            intensity={0.8}
            distance={8}
            position={[0, 2.4, 1.6]}
          />
        </group>
      )}

      {/* University Church spire */}
      {building.landmark === "spire" && (
        <group position={[0, h, 0]}>
          <mesh castShadow position={[0, 1.9, 0]}>
            <coneGeometry args={[Math.min(w, d) * 0.45, 3.8, 8]} />
            <meshStandardMaterial
              color={building.color}
              roughness={0.75}
              metalness={0.2}
            />
          </mesh>
          {/* Finial cross */}
          <mesh position={[0, 4.05, 0]}>
            <boxGeometry args={[0.12, 0.75, 0.12]} />
            <meshStandardMaterial
              color="#fde68a"
              emissive="#fbbf24"
              emissiveIntensity={1}
            />
          </mesh>
          <mesh position={[0, 3.92, 0]}>
            <boxGeometry args={[0.42, 0.12, 0.12]} />
            <meshStandardMaterial
              color="#fde68a"
              emissive="#fbbf24"
              emissiveIntensity={1}
            />
          </mesh>
        </group>
      )}

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
  const px = portal.position
    ? portal.position.x
    : building
      ? building.position.x - building.size[0] / 2 - 1
      : 0;
  const pz = portal.position
    ? portal.position.z
    : building
      ? building.position.z + building.size[2] / 2 - 0.5
      : 0;

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
      {/* Far ground base — fills out to the horizon under the fog */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#0a2417" roughness={1} />
      </mesh>
      {/* Grass */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[48, 48]} />
        <meshStandardMaterial color="#12361f" roughness={0.96} />
      </mesh>
      {/* South entrance walk — spawn up to Edwards Parade */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-0.5, 0.004, 12.5]}>
        <planeGeometry args={[2.6, 12]} />
        <meshStandardMaterial color="#1e2533" roughness={0.95} />
      </mesh>
      {/* West connector toward Dealy Hall */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-7.5, 0.004, 0]}>
        <planeGeometry args={[3.5, 1.6]} />
        <meshStandardMaterial color="#1e2533" roughness={0.95} />
      </mesh>
      {/* East connector toward Keating Hall */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[5.75, 0.004, -1]}>
        <planeGeometry args={[2.5, 1.6]} />
        <meshStandardMaterial color="#1e2533" roughness={0.95} />
      </mesh>
      {/* North connector toward Hughes Hall */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[1, 0.004, -7]}>
        <planeGeometry args={[1.6, 4]} />
        <meshStandardMaterial color="#1e2533" roughness={0.95} />
      </mesh>

      {/* Edwards Parade — central lawn border */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[1.5, 0.008, 1]}>
        <planeGeometry args={[15.4, 13.4]} />
        <meshStandardMaterial color="#0c2a1c" roughness={0.95} />
      </mesh>
      {/* Edwards Parade — manicured lawn */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[1.5, 0.012, 1]}>
        <planeGeometry args={[14.6, 12.6]} />
        <meshStandardMaterial
          color="#0f3d28"
          emissive="#0a3d22"
          emissiveIntensity={0.12}
          roughness={0.92}
        />
      </mesh>
      {/* Diagonal parade walkways forming an X */}
      <group position={[1.5, 0.016, 1]} rotation={[0, Math.PI / 4, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.3, 18]} />
          <meshStandardMaterial color="#243049" roughness={0.95} />
        </mesh>
      </group>
      <group position={[1.5, 0.016, 1]} rotation={[0, -Math.PI / 4, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.3, 18]} />
          <meshStandardMaterial color="#243049" roughness={0.95} />
        </mesh>
      </group>

      {/* Flagpole at the heart of Edwards Parade */}
      <mesh castShadow position={[1.5, 1.6, 1]}>
        <cylinderGeometry args={[0.07, 0.09, 3.2, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[1.97, 2.85, 1]}>
        <planeGeometry args={[0.9, 0.55]} />
        <meshStandardMaterial
          color="#7f1d1d"
          emissive="#991b1b"
          emissiveIntensity={0.45}
          side={THREE.DoubleSide}
          roughness={0.5}
        />
      </mesh>
      <pointLight color="#ffd9a0" intensity={1.3} distance={10} position={[1.5, 2.6, 1]} />
    </>
  );
}

// ─── Sky ──────────────────────────────────────────────────────────────────────
function SkyDome() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#01030a"); // zenith
    grad.addColorStop(0.45, "#040b1c");
    grad.addColorStop(0.72, "#0a1f37");
    grad.addColorStop(0.9, "#15314c");
    grad.addColorStop(1, "#1f4663"); // horizon glow
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh>
      <sphereGeometry args={[160, 32, 32]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
      />
    </mesh>
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
      {/* Sky & atmosphere */}
      <color attach="background" args={["#040b1c"]} />
      <fog attach="fog" args={["#0a1f37", 40, 130]} />
      <SkyDome />
      <Stars radius={150} depth={60} count={2600} factor={4} saturation={0} fade speed={0.6} />
      {/* Moon */}
      <mesh position={[-46, 58, -80]}>
        <sphereGeometry args={[5, 24, 24]} />
        <meshBasicMaterial color="#dce8ff" fog={false} />
      </mesh>
      <pointLight position={[-46, 58, -80]} color="#9db8e0" intensity={0.5} distance={260} />

      {/* Lighting */}
      <hemisphereLight args={["#1a3a5c", "#08160e", 0.4]} />
      <ambientLight intensity={0.2} color="#1a3a5c" />
      <directionalLight
        position={[12, 22, 12]}
        intensity={0.95}
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
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFShadowMap;
        }}
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
