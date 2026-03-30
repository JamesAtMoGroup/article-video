import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, interpolate } from "remotion";
import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sphere, Torus, Line } from "@react-three/drei";

const NEON_GREEN = "#7cffb2";
const YELLOW = "#ffd166";
const CENTER_X = 3.5;
const ORBIT_RADIUS = 1.8;
const ORBIT_PERIOD = 500;
const TOOL_COUNT = 5;

// ─── Central MCP Hub ────────────────────────────────────────────────────────

function McpHub() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <mesh ref={meshRef} position={[CENTER_X, 0, 0]} scale={0.5}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={YELLOW} wireframe />
    </mesh>
  );
}

// ─── Tool Nodes ──────────────────────────────────────────────────────────────

interface ToolNodeProps {
  frame: number;
  index: number;
}

function ToolNode({ frame, index }: ToolNodeProps) {
  const angleOffset = (index / TOOL_COUNT) * Math.PI * 2;
  const angle = angleOffset + (frame / ORBIT_PERIOD) * Math.PI * 2;
  const x = CENTER_X + Math.cos(angle) * ORBIT_RADIUS;
  const y = Math.sin(angle) * ORBIT_RADIUS;
  const color = index % 2 === 0 ? NEON_GREEN : NEON_GREEN;

  return (
    <Sphere args={[0.12, 12, 12]} position={[x, y, 0]}>
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={index % 2 === 0 ? 1.0 : 0.6}
      />
    </Sphere>
  );
}

// ─── Connection Lines ─────────────────────────────────────────────────────────

interface ConnectionLineProps {
  frame: number;
  index: number;
}

function ConnectionLine({ frame, index }: ConnectionLineProps) {
  const opacity = interpolate(frame, [0, 30], [0, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const angleOffset = (index / TOOL_COUNT) * Math.PI * 2;
  const angle = angleOffset + (frame / ORBIT_PERIOD) * Math.PI * 2;
  const x = CENTER_X + Math.cos(angle) * ORBIT_RADIUS;
  const y = Math.sin(angle) * ORBIT_RADIUS;

  const points: [number, number, number][] = [
    [CENTER_X, 0, 0],
    [x, y, 0],
  ];

  return (
    <Line
      points={points}
      color={NEON_GREEN}
      lineWidth={1}
      transparent
      opacity={opacity}
    />
  );
}

// ─── Pulse Ring ───────────────────────────────────────────────────────────────

interface PulseRingProps {
  frame: number;
  delay: number;
}

function PulseRing({ frame, delay }: PulseRingProps) {
  const PULSE_START = 1584;
  const LOOP_PERIOD = 90;
  const EXPAND_FRAMES = 60;

  const localFrame = frame - PULSE_START - delay;

  if (localFrame < 0) return null;

  const loopFrame = localFrame % LOOP_PERIOD;

  const scale = interpolate(loopFrame, [0, EXPAND_FRAMES], [0, 3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(loopFrame, [0, EXPAND_FRAMES], [0.8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Torus
      args={[0.5, 0.02, 8, 64]}
      position={[CENTER_X, 0, 0]}
      scale={scale}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <meshBasicMaterial color={YELLOW} transparent opacity={opacity} />
    </Torus>
  );
}

// ─── Disconnected RPA Nodes ───────────────────────────────────────────────────

interface RpaNodeProps {
  frame: number;
  position: [number, number, number];
}

function RpaNode({ frame, position }: RpaNodeProps) {
  const opacity = interpolate(frame, [672, 702], [0.5, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (frame >= 702) return null;

  return (
    <Sphere args={[0.14, 10, 10]} position={position}>
      <meshBasicMaterial color="#ff6464" transparent opacity={opacity} />
    </Sphere>
  );
}

// ─── Scene Inner ──────────────────────────────────────────────────────────────

interface McpSceneInnerProps {
  frame: number;
}

const RPA_POSITIONS: [number, number, number][] = [
  [CENTER_X - 2.5, 1.2, 0.5],
  [CENTER_X + 2.2, -1.4, -0.3],
  [CENTER_X - 0.8, -2.0, 0.8],
];

function McpSceneInner({ frame }: McpSceneInnerProps) {
  return (
    <>
      <ambientLight intensity={0.05} />
      <pointLight position={[CENTER_X, 0, 4]} intensity={0.4} color={NEON_GREEN} />
      <pointLight position={[CENTER_X, 2, 2]} intensity={0.2} color={YELLOW} />

      {/* Central MCP Hub */}
      <McpHub />

      {/* Tool nodes orbiting the hub */}
      {Array.from({ length: TOOL_COUNT }, (_, i) => (
        <ToolNode key={i} frame={frame} index={i} />
      ))}

      {/* Connection lines from tools to hub */}
      {Array.from({ length: TOOL_COUNT }, (_, i) => (
        <ConnectionLine key={i} frame={frame} index={i} />
      ))}

      {/* Pulse rings appearing at frame 1584 */}
      <PulseRing frame={frame} delay={0} />
      <PulseRing frame={frame} delay={30} />

      {/* Old disconnected RPA nodes (visible before frame 702) */}
      {RPA_POSITIONS.map((pos, i) => (
        <RpaNode key={i} frame={frame} position={pos} />
      ))}
    </>
  );
}

// ─── Default Export ───────────────────────────────────────────────────────────

export default function McpThree() {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <ThreeCanvas
        width={3840}
        height={2160}
        camera={{
          position: [3.5, 0.5, 6],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
      >
        <McpSceneInner frame={frame} />
      </ThreeCanvas>
    </div>
  );
}
