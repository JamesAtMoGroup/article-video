import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, interpolate } from "remotion";
import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Sphere, Line, Points, PointMaterial } from "@react-three/drei";

const NEON_GREEN = "#7cffb2";
const YELLOW = "#ffd166";

function CentralIcosahedron() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.3;
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.rotation.z += delta * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} position={[3.2, 0, 0]} scale={1.2}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={NEON_GREEN} wireframe={true} />
    </mesh>
  );
}

interface OrbitingSphereProps {
  frame: number;
  radius: number;
  angleOffset: number;
  color: string;
  orbitPeriod: number;
  centerX: number;
}

function OrbitingSphere({
  frame,
  radius,
  angleOffset,
  color,
  orbitPeriod,
  centerX,
}: OrbitingSphereProps) {
  const opacity = interpolate(frame, [390, 420], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const angle =
    angleOffset + (frame / orbitPeriod) * Math.PI * 2;
  const x = centerX + Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  return (
    <Sphere args={[0.18, 16, 16]} position={[x, y, 0]}>
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </Sphere>
  );
}

interface ConnectingLineProps {
  frame: number;
  radius: number;
  angleOffset: number;
  orbitPeriod: number;
  centerX: number;
}

function ConnectingLine({
  frame,
  radius,
  angleOffset,
  orbitPeriod,
  centerX,
}: ConnectingLineProps) {
  const opacity = interpolate(frame, [390, 420], [0, 0.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const angle =
    angleOffset + (frame / orbitPeriod) * Math.PI * 2;
  const x = centerX + Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  const points: [number, number, number][] = [
    [centerX, 0, 0],
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

function ParticleField() {
  const count = 80;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = 1 + Math.random() * 4;
      pos[i * 3 + 1] = -2 + Math.random() * 4;
      pos[i * 3 + 2] = -1 + Math.random() * 2;
    }
    return pos;
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  return (
    <Points geometry={geometry}>
      <PointMaterial
        color={NEON_GREEN}
        size={0.015}
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </Points>
  );
}

interface NvidiaSceneInnerProps {
  frame: number;
}

function NvidiaSceneInner({ frame }: NvidiaSceneInnerProps) {
  const centerX = 3.2;
  const orbitRadius = 2.2;
  const orbitPeriod = 300;

  const sphereConfigs = [
    { angleOffset: 0, color: NEON_GREEN },
    { angleOffset: (120 * Math.PI) / 180, color: YELLOW },
    { angleOffset: (240 * Math.PI) / 180, color: NEON_GREEN },
  ];

  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[3.2, 0, 4]} intensity={0.5} color={NEON_GREEN} />

      <CentralIcosahedron />

      <ParticleField />

      {sphereConfigs.map((cfg, i) => (
        <OrbitingSphere
          key={i}
          frame={frame}
          radius={orbitRadius}
          angleOffset={cfg.angleOffset}
          color={cfg.color}
          orbitPeriod={orbitPeriod}
          centerX={centerX}
        />
      ))}

      {sphereConfigs.map((cfg, i) => (
        <ConnectingLine
          key={i}
          frame={frame}
          radius={orbitRadius}
          angleOffset={cfg.angleOffset}
          orbitPeriod={orbitPeriod}
          centerX={centerX}
        />
      ))}
    </>
  );
}

export default function NvidiaThree() {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      <ThreeCanvas
        width={3840}
        height={2160}
        camera={{
          position: [3.0, 0, 6],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
      >
        <NvidiaSceneInner frame={frame} />
      </ThreeCanvas>
    </div>
  );
}
