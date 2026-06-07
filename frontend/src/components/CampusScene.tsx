import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Sky } from "@react-three/drei";
import * as THREE from "three";

import type { Building, CampusEvent, LearningPortal, LearningStat, Player } from "../lib/types";

interface CampusSceneProps {
  buildings: Building[];
  portals: LearningPortal[];
  events: CampusEvent[];
  players: Player[];
  currentPlayer: Player;
  stats: LearningStat[];
  hostMode: boolean;
  heatmapEnabled: boolean;
  onMove: (position: { x: number; y: number; z: number }, rotationY: number) => void;
  onProximity: (portalId: string | null, eventId: string | null) => void;
  onSelectPortal: (portalId: string) => void;
  onSelectEvent: (eventId: string) => void;
}

function portalPosition(portal: LearningPortal, buildings: Building[]): THREE.Vector3 {
  const building = buildings.find((item) => item.id === portal.buildingId);
  if (!building) return new THREE.Vector3();
  return new THREE.Vector3(
    building.position.x - building.size[0] / 2 - 1,
    0,
    building.position.z + building.size[2] / 2 - 0.5,
  );
}

function AvatarBody({ color, activeQuest }: { color: string; activeQuest: boolean }) {
  return (
    <>
      <mesh castShadow position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.26, 0.34, 0.82, 16]} />
        <meshStandardMaterial color={color} roughness={0.42} metalness={0.08} />
      </mesh>
      <mesh castShadow position={[0, 1.28, 0]}>
        <sphereGeometry args={[0.25, 18, 18]} />
        <meshStandardMaterial color="#d9b59d" roughness={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.43, 0.53, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.82} side={THREE.DoubleSide} />
      </mesh>
      {activeQuest && (
        <group position={[0, 1.82, 0]}>
          <mesh>
            <octahedronGeometry args={[0.16, 0]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2.4} />
          </mesh>
          <pointLight color="#22c55e" intensity={0.8} distance={2.5} />
        </group>
      )}
    </>
  );
}

function RemotePlayer({ player }: { player: Player }) {
  const group = useRef<THREE.Group>(null);
  const target = useMemo(
    () => new THREE.Vector3(player.position.x, player.position.y, player.position.z),
    [player.position.x, player.position.y, player.position.z],
  );

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.lerp(target, 1 - Math.exp(-delta * 8));
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, player.rotationY, 1 - Math.exp(-delta * 7));
  });

  return (
    <group ref={group} position={[player.position.x, player.position.y, player.position.z]}>
      <AvatarBody color={player.avatarColor} activeQuest={Boolean(player.activeQuestId)} />
      <Html position={[0, 1.72, 0]} center distanceFactor={12} style={{ pointerEvents: "none" }}>
        <div className="world-nameplate">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: player.avatarColor }} />
          {player.displayName}
        </div>
      </Html>
    </group>
  );
}

function ControllablePlayer({
  player,
  portals,
  buildings,
  events,
  hostMode,
  onMove,
  onProximity,
}: {
  player: Player;
  portals: LearningPortal[];
  buildings: Building[];
  events: CampusEvent[];
  hostMode: boolean;
  onMove: CampusSceneProps["onMove"];
  onProximity: CampusSceneProps["onProximity"];
}) {
  const group = useRef<THREE.Group>(null);
  const keys = useRef(new Set<string>());
  const position = useRef(new THREE.Vector3(player.position.x, player.position.y, player.position.z));
  const verticalVelocity = useRef(0);
  const rotation = useRef(player.rotationY);
  const lastSent = useRef(0);
  const lastPortal = useRef<string | null>(null);
  const lastEvent = useRef<string | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    position.current.set(player.position.x, player.position.y, player.position.z);
  }, [player.id]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((event.target as HTMLElement)?.tagName)) return;
      keys.current.add(event.key.toLowerCase());
      if (event.key === " ") event.preventDefault();
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const direction = new THREE.Vector3();
    if (keys.current.has("w") || keys.current.has("arrowup")) direction.z -= 1;
    if (keys.current.has("s") || keys.current.has("arrowdown")) direction.z += 1;
    if (keys.current.has("a") || keys.current.has("arrowleft")) direction.x -= 1;
    if (keys.current.has("d") || keys.current.has("arrowright")) direction.x += 1;
    const moving = direction.lengthSq() > 0;

    if (moving) {
      direction.normalize();
      const speed = keys.current.has("shift") ? 6.2 : 3.8;
      position.current.addScaledVector(direction, speed * delta);
      position.current.x = THREE.MathUtils.clamp(position.current.x, -15, 15);
      position.current.z = THREE.MathUtils.clamp(position.current.z, -15, 15);
      rotation.current = Math.atan2(direction.x, direction.z);
    }

    if (keys.current.has(" ") && position.current.y <= 0.001) verticalVelocity.current = 4.4;
    verticalVelocity.current -= 11 * delta;
    position.current.y += verticalVelocity.current * delta;
    if (position.current.y < 0) {
      position.current.y = 0;
      verticalVelocity.current = 0;
    }

    if (group.current) {
      group.current.position.copy(position.current);
      group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, rotation.current, 1 - Math.exp(-delta * 14));
    }

    if (!hostMode) {
      const cameraTarget = new THREE.Vector3(position.current.x, position.current.y + 4.6, position.current.z + 7.5);
      camera.position.lerp(cameraTarget, 1 - Math.exp(-delta * 4.2));
      camera.lookAt(position.current.x, position.current.y + 0.8, position.current.z);
    }

    if ((moving || position.current.y > 0) && clock.elapsedTime - lastSent.current > 0.08) {
      lastSent.current = clock.elapsedTime;
      onMove(
        { x: position.current.x, y: position.current.y, z: position.current.z },
        rotation.current,
      );
    }

    let nearestPortal: string | null = null;
    let portalDistance = 2.7;
    for (const portal of portals) {
      const distance = position.current.distanceTo(portalPosition(portal, buildings));
      if (distance < portalDistance) {
        nearestPortal = portal.id;
        portalDistance = distance;
      }
    }

    let nearestEvent: string | null = null;
    let eventDistance = 2.8;
    for (const event of events) {
      const distance = position.current.distanceTo(new THREE.Vector3(event.position.x, 0, event.position.z));
      if (distance < eventDistance) {
        nearestEvent = event.id;
        eventDistance = distance;
      }
    }

    if (nearestPortal !== lastPortal.current || nearestEvent !== lastEvent.current) {
      lastPortal.current = nearestPortal;
      lastEvent.current = nearestEvent;
      onProximity(nearestPortal, nearestEvent);
    }
  });

  return (
    <group ref={group} position={[player.position.x, player.position.y, player.position.z]}>
      <AvatarBody color={player.avatarColor} activeQuest={Boolean(player.activeQuestId)} />
      <Html position={[0, 1.72, 0]} center distanceFactor={12} style={{ pointerEvents: "none" }}>
        <div className="world-nameplate world-nameplate-current">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {player.displayName}
        </div>
      </Html>
    </group>
  );
}

function BuildingBlock({
  building,
  stat,
  heatmapEnabled,
}: {
  building: Building;
  stat?: LearningStat;
  heatmapEnabled: boolean;
}) {
  const active = stat?.activeQuestCount ?? 0;
  const glow = active > 1 ? "#22c55e" : active === 1 ? "#84cc16" : "#000000";
  const [width, height, depth] = building.size;
  const windows = useMemo(() => {
    const result: Array<[number, number, number]> = [];
    const count = Math.max(2, Math.floor(width / 1.2));
    for (let index = 0; index < count; index += 1) {
      result.push([-width / 2 + 0.65 + index * ((width - 1.3) / Math.max(1, count - 1)), height * 0.58, depth / 2 + 0.011]);
    }
    return result;
  }, [width, height, depth]);

  return (
    <group position={[building.position.x, 0, building.position.z]}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={building.color}
          roughness={0.68}
          emissive={heatmapEnabled ? glow : "#16070b"}
          emissiveIntensity={heatmapEnabled ? Math.min(1.8, active * 0.75) : 0.12}
        />
      </mesh>
      <mesh castShadow position={[0, height + 0.15, 0]}>
        <boxGeometry args={[width + 0.28, 0.3, depth + 0.28]} />
        <meshStandardMaterial color="#2a1720" roughness={0.82} />
      </mesh>
      {windows.map((windowPosition, index) => (
        <mesh key={index} position={windowPosition}>
          <planeGeometry args={[0.5, 0.55]} />
          <meshStandardMaterial color="#bde7ed" emissive="#6bb8c6" emissiveIntensity={0.65} roughness={0.24} />
        </mesh>
      ))}
      <mesh position={[0, 0.75, depth / 2 + 0.02]}>
        <planeGeometry args={[0.8, 1.5]} />
        <meshStandardMaterial color="#241017" metalness={0.3} roughness={0.4} />
      </mesh>
      <Html position={[0, height + 0.72, 0]} center distanceFactor={16} style={{ pointerEvents: "none" }}>
        <div className="building-label">
          <span>{building.shortName}</span>
          {heatmapEnabled && active > 0 && <strong>{active} active</strong>}
        </div>
      </Html>
      {heatmapEnabled && active > 0 && <pointLight position={[0, height + 1, 0]} color={glow} intensity={active * 2.2} distance={8} />}
    </group>
  );
}

function PortalMarker({
  portal,
  buildings,
  onSelect,
}: {
  portal: LearningPortal;
  buildings: Building[];
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const position = portalPosition(portal, buildings);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.elapsedTime * 0.45;
    group.current.position.y = 1.05 + Math.sin(clock.elapsedTime * 2 + position.x) * 0.08;
  });

  return (
    <group ref={group} position={[position.x, 1.05, position.z]} onClick={(event) => { event.stopPropagation(); onSelect(); }}>
      <mesh>
        <torusGeometry args={[0.62, 0.1, 12, 38]} />
        <meshStandardMaterial color="#34d399" emissive="#22c55e" emissiveIntensity={2.4} metalness={0.35} roughness={0.25} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.48, 32]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color="#22c55e" intensity={1.7} distance={4} />
      <Html position={[0, 1.05, 0]} center distanceFactor={12}>
        <button className="world-chip" onClick={onSelect}>Quest</button>
      </Html>
    </group>
  );
}

function EventMarker({ event, onSelect }: { event: CampusEvent; onSelect: () => void }) {
  const marker = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (marker.current) marker.current.position.y = 0.08 + Math.sin(clock.elapsedTime * 2.5 + event.position.x) * 0.08;
  });

  return (
    <group
      ref={marker}
      position={[event.position.x, 0.08, event.position.z]}
      onClick={(pointerEvent) => {
        pointerEvent.stopPropagation();
        onSelect();
      }}
    >
      <mesh position={[0, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.28, 18, 18]} />
        <meshStandardMaterial color="#fb7185" emissive="#e11d48" emissiveIntensity={1.8} />
      </mesh>
      <mesh position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.7, 8]} />
        <meshStandardMaterial color="#fda4af" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.45, 0.55, 28]} />
        <meshBasicMaterial color="#fb7185" transparent opacity={0.62} side={THREE.DoubleSide} />
      </mesh>
      <Html position={[0, 1.28, 0]} center distanceFactor={13}>
        <button className="world-chip world-chip-event" onClick={onSelect}>Live event</button>
      </Html>
    </group>
  );
}

const TREES: Array<[number, number]> = [
  [-12, -9], [-9, -9], [-6, -9], [6, -10], [10, -9], [12, -5], [-12, 7], [-9, 10], [-4, 11], [7, 10], [11, 8],
];

function CampusGround() {
  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[34, 34]} />
        <meshStandardMaterial color="#102c24" roughness={0.96} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[4.4, 32]} />
        <meshStandardMaterial color="#74716a" roughness={0.95} />
      </mesh>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]}>
        <planeGeometry args={[31, 3.7]} />
        <meshStandardMaterial color="#74716a" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[0, 0.18, 1.2]}>
        <cylinderGeometry args={[1.35, 1.45, 0.35, 32]} />
        <meshStandardMaterial color="#475569" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.43, 1.2]}>
        <cylinderGeometry args={[0.9, 1, 0.18, 32]} />
        <meshStandardMaterial color="#1e7891" emissive="#0e7490" emissiveIntensity={0.45} roughness={0.28} />
      </mesh>
      {TREES.map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh castShadow position={[0, 0.68, 0]}>
            <cylinderGeometry args={[0.1, 0.14, 1.35, 9]} />
            <meshStandardMaterial color="#4b2d1e" roughness={1} />
          </mesh>
          <mesh castShadow position={[0, 1.65, 0]}>
            <icosahedronGeometry args={[0.68, 1]} />
            <meshStandardMaterial color="#1f6b43" roughness={0.92} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function SceneContent(props: CampusSceneProps) {
  const otherPlayers = props.players.filter((player) => player.id !== props.currentPlayer.id && player.connected);
  return (
    <>
      <color attach="background" args={["#08111e"]} />
      <fog attach="fog" args={["#08111e", 18, 42]} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#bfd9ff", "#11251c", 1.15]} />
      <directionalLight
        castShadow
        position={[10, 16, 8]}
        intensity={2.4}
        color="#fff2d7"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={40}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />
      <Sky distance={450000} sunPosition={[8, 5, 10]} turbidity={8} rayleigh={2} mieCoefficient={0.006} mieDirectionalG={0.8} />
      <CampusGround />

      {props.buildings.map((building) => (
        <BuildingBlock
          key={building.id}
          building={building}
          stat={props.stats.find((item) => item.buildingId === building.id)}
          heatmapEnabled={props.heatmapEnabled}
        />
      ))}
      {props.portals.map((portal) => (
        <PortalMarker key={portal.id} portal={portal} buildings={props.buildings} onSelect={() => props.onSelectPortal(portal.id)} />
      ))}
      {props.events.map((event) => (
        <EventMarker key={event.id} event={event} onSelect={() => props.onSelectEvent(event.id)} />
      ))}
      {otherPlayers.map((player) => <RemotePlayer key={player.id} player={player} />)}
      <ControllablePlayer
        player={props.currentPlayer}
        portals={props.portals}
        buildings={props.buildings}
        events={props.events}
        hostMode={props.hostMode}
        onMove={props.onMove}
        onProximity={props.onProximity}
      />
      {props.hostMode && (
        <OrbitControls
          makeDefault
          target={[0, 0.8, 0]}
          minDistance={8}
          maxDistance={28}
          maxPolarAngle={Math.PI / 2.05}
          enableDamping
        />
      )}
    </>
  );
}

export function CampusScene(props: CampusSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 7, 16], fov: 48, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
