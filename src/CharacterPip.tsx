import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Lottie } from "@remotion/lottie";
import characterData from "../public/lottie/character2.json";

// ── Scene boundaries ──────────────────────────────────────────────────────
const SCENES = {
  title:   { start: 0,   end: 171  },
  copilot: { start: 171, end: 437  },
  mcp:     { start: 437, end: 705  },
  work:    { start: 705, end: 1011 },
};

// ── Speech bubbles — appear to the LEFT of the character ─────────────────
const BUBBLES: { from: number; to: number; text: string }[] = [
  { from: 20,  to: 100, text: "大家好！\n今天來聊 AI 🎉" },
  { from: 200, to: 310, text: "Copilot 56%\nvs Cursor 52% 🔥" },
  { from: 460, to: 560, text: "MCP = AI 的\nUSB 介面 🔌" },
  { from: 730, to: 840, text: "AI 技能薪資\n+56%！💰" },
];

function fi(frame: number, from: number, to: number) {
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// ── Speech bubble — floats to the LEFT, tail points right toward character ─
function SpeechBubble({ text, opacity }: { text: string; opacity: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 50,           // align with character vertically
        right: 150,           // sits to the left of the 140px character
        opacity,
        transform: `scale(${0.88 + opacity * 0.12}) translateX(${(1 - opacity) * -12}px)`,
        transformOrigin: "bottom right",
        background: "white",
        borderRadius: 14,
        padding: "10px 14px",
        minWidth: 150,
        maxWidth: 190,
        boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontFamily: "Inter, Nunito, system-ui, sans-serif",
          fontWeight: 700,
          color: "#1a1a2e",
          lineHeight: 1.6,
          whiteSpace: "pre-line",
        }}
      >
        {text}
      </div>
      {/* Tail pointing right toward the character */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: -10,
          width: 0,
          height: 0,
          borderTop: "10px solid transparent",
          borderBottom: "10px solid transparent",
          borderLeft: "10px solid white",
        }}
      />
    </div>
  );
}

// ── Reaction emoji pops — float UP above the character ────────────────────
const REACTIONS: { frame: number; emoji: string }[] = [
  { frame: 171, emoji: "🛠️" },
  { frame: 390, emoji: "🔌" },
  { frame: 630, emoji: "💼" },
  { frame: 750, emoji: "🎉" },
];

function ReactionPop({ frame }: { frame: number }) {
  return (
    <>
      {REACTIONS.map((r) => {
        const age = frame - r.frame;
        if (age < 0 || age > 45) return null;
        const p = fi(frame, r.frame, r.frame + 45);
        const y = interpolate(p, [0, 0.5, 1], [0, -28, -52]);
        const scale = interpolate(p, [0, 0.15, 0.75, 1], [0, 1.4, 1.1, 0]);
        return (
          <div
            key={r.frame}
            style={{
              position: "absolute",
              bottom: 155,        // above the character circle
              right: 50,          // centered over character
              transform: `translateY(${y}px) scale(${scale})`,
              fontSize: 30,
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
              zIndex: 20,
            }}
          >
            {r.emoji}
          </div>
        );
      })}
    </>
  );
}

// ── Pointing arrow — points LEFT toward the content ──────────────────────
function PointingArrow({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "35%",
        left: -38,
        opacity: visible ? 1 : 0,
        fontSize: 26,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
        pointerEvents: "none",
      }}
    >
      👈
    </div>
  );
}

// ── Main CharacterPip ─────────────────────────────────────────────────────
export function CharacterPip() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance — slide up from below
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 90 },
    durationInFrames: 20,
  });
  const enterY = interpolate(enterProgress, [0, 1], [120, 0]);
  const enterOpacity = fi(frame, 0, 15);

  // Idle bob
  const bob = Math.sin(frame * 0.06) * 4;

  // Speed up at scene transitions
  const isTransition = [SCENES.copilot.start, SCENES.mcp.start, SCENES.work.start].some(
    (s) => Math.abs(frame - s) < 15
  );
  const playbackRate = isTransition ? 2.5 : 1;

  // Active speech bubble
  const activeBubble = BUBBLES.find((b) => frame >= b.from && frame <= b.to);
  const bubbleOpacity = activeBubble
    ? interpolate(
        frame,
        [activeBubble.from, activeBubble.from + 12, activeBubble.to - 12, activeBubble.to],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  // Pointing arrow during stat-heavy moments
  const isPointing = (frame > 250 && frame < 400) || (frame > 750 && frame < 880);

  // Subtle glow pulse
  const glowPulse = 0.85 + Math.sin(frame * 0.08) * 0.1;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Wrapper — anchored to bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: 52,
          right: 24,
          opacity: enterOpacity,
          transform: `translateY(${enterY + bob}px)`,
        }}
      >
        {/* Speech bubble — rendered outside character box, to the left */}
        {activeBubble && (
          <SpeechBubble text={activeBubble.text} opacity={bubbleOpacity} />
        )}

        {/* Reaction emoji pops — above the character */}
        <ReactionPop frame={frame} />

        {/* Character circle */}
        <div style={{ position: "relative", width: 140, height: 140 }}>
          {/* Glow ring */}
          <div
            style={{
              position: "absolute",
              inset: 6,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(32,217,186,0.22) 0%, transparent 70%)",
              transform: `scale(${glowPulse})`,
            }}
          />

          {/* Lottie */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              overflow: "hidden",
              background: "rgba(255,255,255,0.06)",
              border: "2px solid rgba(32,217,186,0.4)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.45), 0 0 20px rgba(32,217,186,0.12)",
            }}
          >
            <Lottie
              animationData={characterData}
              playbackRate={playbackRate}
              loop
              style={{ width: "100%", height: "100%" }}
            />
          </div>

          {/* Pointing arrow toward content (left) */}
          <PointingArrow visible={isPointing} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
