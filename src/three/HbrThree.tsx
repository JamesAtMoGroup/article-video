import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, interpolate } from "remotion";
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const NEON_GREEN = "#7cffb2";
const RED = "#ff6b6b";
const GREY = "#888888";

const CHART_X = 3.2;
const CHART_Y = -0.5;
const FLOOR_Y = -1.2;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface AnimatedBarProps {
  frame: number;
  startFrame: number;
  endFrame: number;
  finalHeight: number;
  width: number;
  depth: number;
  color: string;
  posX: number;
  posY: number;
  lightIntensity?: number;
}

function AnimatedBar({
  frame,
  startFrame,
  endFrame,
  finalHeight,
  width,
  depth,
  color,
  posX,
  posY,
  lightIntensity = 0.3,
}: AnimatedBarProps) {
  const rawT = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const t = easeOutCubic(rawT);
  const currentHeight = finalHeight * t;

  if (currentHeight <= 0.001) return null;

  const barCenterY = CHART_Y + posY + currentHeight / 2;
  const lightY = CHART_Y + posY + currentHeight + 0.2;

  return (
    <group>
      <mesh position={[CHART_X + posX, barCenterY, 0]}>
        <boxGeometry args={[width, currentHeight, depth]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight
        position={[CHART_X + posX, lightY, 0.5]}
        color={color}
        intensity={lightIntensity * t}
        distance={3}
      />
    </group>
  );
}

interface FloorGridProps {
  visible: boolean;
}

function FloorGrid({ visible }: FloorGridProps) {
  const ref = useRef<THREE.GridHelper>(null);

  if (!visible) return null;

  return (
    <primitive
      ref={ref}
      object={(() => {
        const grid = new THREE.GridHelper(4, 8, NEON_GREEN, NEON_GREEN);
        (grid.material as THREE.Material).transparent = true;
        (grid.material as THREE.Material).opacity = 0.12;
        grid.position.set(CHART_X, CHART_Y + FLOOR_Y, 0);
        return grid;
      })()}
    />
  );
}

interface HbrSceneInnerProps {
  frame: number;
}

function HbrSceneInner({ frame }: HbrSceneInnerProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      const period = 200;
      const angle = Math.sin((frame / period) * Math.PI * 2) * 0.15;
      groupRef.current.rotation.y = angle;
    }
  });

  const bar1StartFrame = 617;
  const bar1EndFrame = 677;
  const bar2StartFrame = 1326;
  const bar2EndFrame = 1386;
  const bar3StartFrame = 1356;
  const bar3EndFrame = 1416;

  const bar1Height = 2.4;
  const bar2Height = 0.8;
  const bar3Height = 1.6;

  const bar1T = easeOutCubic(
    interpolate(frame, [bar1StartFrame, bar1EndFrame], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const bar2T = easeOutCubic(
    interpolate(frame, [bar2StartFrame, bar2EndFrame], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const bar3T = easeOutCubic(
    interpolate(frame, [bar3StartFrame, bar3EndFrame], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const bar2CurrentHeight = bar2Height * bar2T;

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.05} />

      <FloorGrid visible={frame >= bar1StartFrame} />

      {/* Bar 1 — 舊方式 (Before AI) */}
      <AnimatedBar
        frame={frame}
        startFrame={bar1StartFrame}
        endFrame={bar1EndFrame}
        finalHeight={bar1Height}
        width={0.4}
        depth={0.4}
        color={GREY}
        posX={-0.8}
        posY={FLOOR_Y}
      />

      {/* Bar 2 — AI 完成 (AI-completed task) */}
      <AnimatedBar
        frame={frame}
        startFrame={bar2StartFrame}
        endFrame={bar2EndFrame}
        finalHeight={bar2Height}
        width={0.4}
        depth={0.4}
        color={NEON_GREEN}
        posX={0.2}
        posY={FLOOR_Y}
      />

      {/* Bar 3 — 額外工作 (Extra work stacked on top of Bar 2) */}
      {bar3T > 0 && bar2CurrentHeight > 0.001 && (
        <group>
          <mesh
            position={[
              CHART_X + 0.2,
              CHART_Y + FLOOR_Y + bar2CurrentHeight + (bar3Height * bar3T) / 2,
              0,
            ]}
          >
            <boxGeometry args={[0.4, bar3Height * bar3T, 0.4]} />
            <meshBasicMaterial color={RED} />
          </mesh>
          <pointLight
            position={[
              CHART_X + 0.2,
              CHART_Y +
                FLOOR_Y +
                bar2CurrentHeight +
                bar3Height * bar3T +
                0.2,
              0.5,
            ]}
            color={RED}
            intensity={0.3 * bar3T}
            distance={3}
          />
        </group>
      )}
    </group>
  );
}

export default function HbrThree() {
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
          position: [3.2, 1.0, 5],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
      >
        <HbrSceneInner frame={frame} />
      </ThreeCanvas>
    </div>
  );
}
