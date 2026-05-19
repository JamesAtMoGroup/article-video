import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import React from "react";
import { loadFont as loadNotoSansTC } from "@remotion/google-fonts/NotoSansTC";
import { loadFont as loadSpaceMono } from "@remotion/google-fonts/SpaceMono";

loadNotoSansTC("normal", { weights: ["400", "700", "900"] });
loadSpaceMono("normal", { weights: ["400", "700"] });

// ── Scale & canvas (4K = 3840×2160) ───────────────────────────────────────
const S = 3;
const W = 1280 * S;
const H = 720 * S;
const NAV_H = 50 * S;
const CONTAINER_W = 640 * S;
const COL_LEFT = (W - CONTAINER_W) / 2;
const SUBTITLE_SAFE = 120 * S;
const CONTENT_GAP = 10 * S;
const CONTENT_TOP = NAV_H + CONTENT_GAP;
const CONTENT_H = H - CONTENT_TOP - SUBTITLE_SAFE;

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: "#000000",
  surface: "#0d0d0d",
  surfaceBorder: "rgba(255,255,255,0.08)",
  primary: "#7cffb2",
  primaryLight: "rgba(124,255,178,0.07)",
  primaryBorder: "rgba(124,255,178,0.14)",
  text: "#ffffff",
  muted: "#888888",
  yellow: "#ffd166",
  yellowLight: "rgba(255,209,102,0.1)",
  yellowBorder: "rgba(255,209,102,0.2)",
  red: "#ff6b6b",
  redLight: "rgba(255,107,107,0.08)",
  redBorder: "rgba(255,107,107,0.2)",
} as const;

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W = 290 * S;
const NOTIF_TOP = 12 * S;
const NOTIF_RIGHT = 20 * S;
const NOTIF_SLOT = 148 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// VTT cues:
//   title:    0      → 794   (scene1 first "這就是今天要講的主題" at 26.480s)
//   scene1:   794    → 2449  (scene2 first "為什麼有人不想用雲端AI" at 81.620s)
//   scene2:   2449   → 4471  (scene3 first "現實面呢" at 149.040s)
//   scene3:   4471   → 6965  (summary first "今天的重點整理" at 232.180s)
//   summary:  6965   → 8090  (last cue ends 268.180s = frame 8045 + buffer)
export const SCENES_2026_05_19 = {
  title: { from: 0, to: 794 },
  scene1: { from: 794, to: 2449 },
  scene2: { from: 2449, to: 4471 },
  scene3: { from: 4471, to: 6965 },
  summary: { from: 6965, to: 8090 },
} as const;
export const TOTAL_FRAMES_2026_05_19 = 8090;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "什麼是 Local AI", start: 794 },
  { label: "為什麼不雲端", start: 2449 },
  { label: "現實與門檻", start: 4471 },
  { label: "重點整理", start: 6965 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout {
  from: number;
  to: number;
  sender: string;
  text: string;
}
const ALL_CALLOUTS: Callout[] = [
  {
    from: 2200,
    to: 2449,
    sender: "想一想",
    text: "客戶資料、健康狀況、機密文件——這些你輸入過嗎？它們去了哪裡？",
  },
  {
    from: 6700,
    to: 6965,
    sender: "親身體驗",
    text: "如果有天雲端 AI 隱私政策讓你不放心，你能在自己的裝置上跑一個 AI 嗎？",
  },
];

// ── Easing tokens ─────────────────────────────────────────────────────────
const E = {
  outExpo: Easing.bezier(0.19, 1, 0.22, 1),
  outCubic: Easing.bezier(0.215, 0.61, 0.355, 1),
  outQuart: Easing.bezier(0.165, 0.84, 0.44, 1),
} as const;
const easeOutBack = (t: number, s = 1.55) => {
  const c = Math.min(t, 1);
  return 1 + (s + 1) * Math.pow(c - 1, 3) + s * Math.pow(c - 1, 2);
};
const prog = (f: number, dur: number) => Math.min(f / dur, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ── Standard hooks ─────────────────────────────────────────────────────────
function useFadeUp(startFrame: number) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const ty = interpolate(f, [0, 22], [22 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const op = interpolate(f, [0, 14], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return { opacity: op, transform: `translateY(${ty}px)` };
}
function useFadeIn(startFrame: number) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  return { opacity: interpolate(f, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }) };
}

// ── WordReveal ─────────────────────────────────────────────────────────────
function WordReveal({
  text,
  startFrame,
  staggerPerWord = 4,
  fontSize,
  color,
  fontFamily,
  fontWeight,
  lineHeight,
  letterSpacing,
}: {
  text: string;
  startFrame: number;
  staggerPerWord?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number | string;
  lineHeight?: number;
  letterSpacing?: string;
}) {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline", lineHeight: lineHeight ?? 1.3 }}>
      {text.split(" ").map((word, i) => {
        const f = Math.max(0, frame - (startFrame + i * staggerPerWord));
        const ty = interpolate(f, [0, 20], [18 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const op = interpolate(f, [0, 12], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: op,
              transform: `translateY(${ty}px)`,
              marginRight: "0.28em",
              fontSize,
              color,
              fontFamily,
              fontWeight,
              letterSpacing,
            }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}

// ── SceneFade ──────────────────────────────────────────────────────────────
function SceneFade({ children, durationInFrames }: { children: React.ReactNode; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return <div style={{ opacity: Math.min(fadeIn, fadeOut), height: "100%" }}>{children}</div>;
}

// ── ContentColumn ──────────────────────────────────────────────────────────
function ContentColumn({
  children,
  scrollUp,
}: {
  children: React.ReactNode;
  scrollUp?: { at: number; amount: number };
}) {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  let scrollY = 0;
  if (scrollUp) {
    const scrollF = Math.max(0, frame - scrollUp.at);
    const p = spring({ frame: scrollF, fps, config: { damping: 200 } });
    scrollY = interpolate(p, [0, 1], [0, -scrollUp.amount], clamp);
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          top: CONTENT_TOP,
          left: COL_LEFT,
          width: CONTAINER_W,
          height: CONTENT_H,
          overflow: "hidden" as const,
        }}
      >
        <div style={{ transform: `translateY(${scrollY}px)` }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
}

// ── Background ─────────────────────────────────────────────────────────────
function Background() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div
        style={{
          position: "absolute",
          borderRadius: "50%",
          width: 900 * S,
          height: 900 * S,
          top: -200 * S,
          left: -150 * S,
          background: "radial-gradient(circle, rgba(124,255,178,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          borderRadius: "50%",
          width: 700 * S,
          height: 700 * S,
          top: 300 * S,
          right: -100 * S,
          background: "radial-gradient(circle, rgba(124,255,178,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          borderRadius: "50%",
          width: 500 * S,
          height: 500 * S,
          bottom: 100 * S,
          left: 300 * S,
          background: "radial-gradient(circle, rgba(255,209,102,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
          backgroundSize: `${60 * S}px ${60 * S}px`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}

// ── ProgressBar ────────────────────────────────────────────────────────────
function ProgressBar({ globalFrame }: { globalFrame: number }) {
  const { durationInFrames } = useVideoConfig();
  const progress = globalFrame / durationInFrames;
  const current = [...CHAPTERS].reverse().find((c) => globalFrame >= c.start) ?? CHAPTERS[0];
  const slideIn = interpolate(globalFrame, [0, 15], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 10 }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: NAV_H,
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.primaryBorder}`,
          padding: `${4 * S}px ${32 * S}px`,
          transform: `translateY(${interpolate(slideIn, [0, 1], [-NAV_H, 0])}px)`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 18 * S,
            color: C.muted,
            fontFamily: "'Space Mono', monospace",
            letterSpacing: "0.05em",
          }}
        >
          <span>每日 AI 知識庫</span>
          <span style={{ color: C.primary }}>{current.label}</span>
        </div>
        <div
          style={{
            height: 3 * S,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 99,
            overflow: "hidden",
            marginTop: 4 * S,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: C.primary,
              borderRadius: 99,
              boxShadow: `0 0 ${8 * S}px ${C.primary}88`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── iMessage Callout ───────────────────────────────────────────────────────
function IMessageCard({
  callout,
  slotIndex,
  globalFrame,
}: {
  callout: Callout;
  slotIndex: number;
  globalFrame: number;
}) {
  const { fps } = useVideoConfig();
  const f = Math.max(0, globalFrame - callout.from);
  const remaining = callout.to - globalFrame;
  const slideY = spring({ frame: f, fps, config: { damping: 22, stiffness: 130 } });
  const translateY = interpolate(slideY, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);
  const fadeOut =
    remaining < FADE_OUT_FRAMES ? interpolate(remaining, [0, FADE_OUT_FRAMES], [0, 1], clamp) : 1;
  const slotOffset = slotIndex * NOTIF_SLOT;
  return (
    <div
      style={{
        position: "absolute",
        top: NOTIF_TOP + slotOffset,
        right: NOTIF_RIGHT,
        width: NOTIF_W,
        opacity: fadeOut,
        transform: `translateY(${translateY}px)`,
        zIndex: 100,
        background: "rgba(18,18,18,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 16 * S,
        border: `1px solid rgba(124,255,178,0.2)`,
        padding: `${12 * S}px ${14 * S}px`,
        boxShadow: `0 ${8 * S}px ${24 * S}px rgba(0,0,0,0.6)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 6 * S }}>
        <div
          style={{
            width: 10 * S,
            height: 10 * S,
            borderRadius: "50%",
            background: C.primary,
            boxShadow: `0 0 ${6 * S}px ${C.primary}`,
          }}
        />
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 20 * S,
            color: C.primary,
            letterSpacing: "0.05em",
          }}
        >
          {callout.sender}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 18 * S,
          color: C.text,
          lineHeight: 1.55,
        }}
      >
        {callout.text}
      </div>
    </div>
  );
}

function IMessageOverlay({ globalFrame }: { globalFrame: number }) {
  const active = ALL_CALLOUTS.filter((c) => globalFrame >= c.from && globalFrame < c.to);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 90 }}>
      {active.map((c, i) => (
        <IMessageCard key={c.from} callout={c} slotIndex={i} globalFrame={globalFrame} />
      ))}
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Concept Animations ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// 1. CloudUploadAnimation — TitleScene (right side)
// Visual metaphor: user data (訊息/文件/問題) rising up to cloud server
// Trigger VTT: 8.140s "他們全部都被送到OpenAI或Anthropic的伺服器上處理"
// Last topic: 18.140s "再傳回來給你" → frame 544
// DURATION = (544 - 0 - 244) + 90 = 390
function CloudUploadAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 390;
  const envelope = interpolate(f, [0, 12, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const cloudScale = easeOutBack(prog(f, 22));
  const messages = ["💬 訊息", "📄 文件", "❓ 問題"];

  return (
    <div
      style={{
        position: "absolute",
        right: 80 * S,
        top: 250 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14 * S,
        width: 260 * S,
      }}
    >
      {/* Cloud server icon */}
      <div
        style={{
          fontSize: 80 * S,
          transform: `scale(${cloudScale})`,
          filter: `drop-shadow(0 0 ${16 * S}px rgba(124,255,178,0.45))`,
        }}
      >
        ☁️
      </div>
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 20 * S,
          color: C.muted,
          letterSpacing: "0.08em",
        }}
      >
        第三方伺服器
      </div>

      {/* Flow line */}
      <div
        style={{
          width: 3 * S,
          height: 60 * S,
          background: `linear-gradient(to bottom, ${C.primary}88, transparent)`,
        }}
      />

      {/* Rising user-data bubbles */}
      <div style={{ position: "relative", width: 240 * S, height: 100 * S }}>
        {messages.map((m, i) => {
          const delay = i * 60;
          const itemF = Math.max(0, f - delay);
          const itemOp = interpolate(itemF, [0, 18, 110, 140], [0, 1, 1, 0], { extrapolateRight: "clamp" });
          const itemY = interpolate(itemF, [0, 110], [60 * S, -40 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
          const xOff = (i - 1) * 70 * S;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: "50%",
                transform: `translate(calc(-50% + ${xOff}px), ${itemY}px)`,
                opacity: itemOp,
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 18 * S,
                color: C.text,
                background: "rgba(255,255,255,0.08)",
                border: `1px solid rgba(255,255,255,0.18)`,
                borderRadius: 8 * S,
                padding: `${6 * S}px ${12 * S}px`,
                whiteSpace: "nowrap" as const,
              }}
            >
              {m}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 2. LocalDeviceLoopAnimation — Scene1 Phase A (left side)
// Visual metaphor: 筆電 + 內部資料循環 + 鎖頭 → 資料留在裝置內
// Trigger VTT: 26.480s = scene1 local 0 ("這就是今天要講的主題 本地部署AI")
// Last topic: 49.480s "目前最常用來本地部署的工具" → local 690
// DURATION = (690 - 0) + 90 = 780
function LocalDeviceLoopAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 780;
  const envelope = interpolate(f, [0, 14, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const deviceScale = easeOutBack(prog(f, 22));
  const lockOp = interpolate(Math.max(0, f - 60), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const rotation = (f * 1.4) % 360;
  const labelOp = interpolate(Math.max(0, f - 100), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        left: 80 * S,
        top: 240 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18 * S,
        width: 260 * S,
      }}
    >
      <div style={{ position: "relative", width: 200 * S, height: 200 * S }}>
        {/* Rotating data ring */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: `${3 * S}px dashed ${C.primary}66`,
            borderRadius: "50%",
            transform: `rotate(${rotation}deg)`,
          }}
        />
        {/* Laptop center */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${deviceScale})`,
            fontSize: 80 * S,
            filter: `drop-shadow(0 0 ${20 * S}px ${C.primary}88)`,
          }}
        >
          💻
        </div>
        {/* Lock badge top-right */}
        <div
          style={{
            position: "absolute",
            top: -6 * S,
            right: 6 * S,
            opacity: lockOp,
            fontSize: 40 * S,
            filter: `drop-shadow(0 0 ${10 * S}px ${C.primary})`,
          }}
        >
          🔒
        </div>
      </div>
      <div
        style={{
          opacity: labelOp,
          fontFamily: "'Space Mono', monospace",
          fontSize: 20 * S,
          color: C.primary,
          letterSpacing: "0.08em",
          background: C.primaryLight,
          border: `1px solid ${C.primary}`,
          borderRadius: 8 * S,
          padding: `${8 * S}px ${14 * S}px`,
          boxShadow: `0 0 ${14 * S}px rgba(124,255,178,0.3)`,
          textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.5)`,
        }}
      >
        資料留下 · 不離機
      </div>
    </div>
  );
}

// 3. ToolsTriadAnimation — Scene1 Phase B (right side)
// Visual metaphor: 三個工具列表 — Ollama / LM Studio / llama.cpp
// Trigger VTT: 49.480s = scene1 local 690
// Tool step delays (relative to trigger):
//   Ollama:    49.480s → 0
//   LM Studio: 60.620s → Math.round(60.620*30) - 794 - 690 = 1818 - 1484 = 334
//   llama.cpp: 63.620s → Math.round(63.620*30) - 794 - 690 = 1908 - 1484 = 424
// Last topic: 70.620s "你在AI工具裡輸入過哪些資訊" (question moment) → local 1325
// DURATION = (1325 - 690) + 90 = 725
function ToolsTriadAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 725;
  const envelope = interpolate(f, [0, 14, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const tools = [
    { icon: "🦙", name: "Ollama", desc: "一行指令本機跑", appearsAt: 0 },
    { icon: "🖥️", name: "LM Studio", desc: "圖形介面", appearsAt: 334 },
    { icon: "⚡", name: "llama.cpp", desc: "輕量執行", appearsAt: 424 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 80 * S,
        top: 220 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 14 * S,
        width: 280 * S,
      }}
    >
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 20 * S,
          color: C.muted,
          letterSpacing: "0.1em",
          marginBottom: 4 * S,
          textAlign: "right" as const,
        }}
      >
        LOCAL-AI TOOLS
      </div>
      {tools.map((t, i) => {
        const itemF = Math.max(0, f - t.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [40 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const ringScale = easeOutBack(Math.min(itemF / 20, 1));
        return (
          <div
            key={i}
            style={{
              opacity: itemOp,
              transform: `translateX(${itemTx}px)`,
              display: "flex",
              alignItems: "center",
              gap: 14 * S,
              background: "rgba(0,0,0,0.82)",
              border: `1px solid ${C.primaryBorder}`,
              borderLeft: `3px solid ${C.primary}`,
              borderRadius: 10 * S,
              padding: `${12 * S}px ${14 * S}px`,
            }}
          >
            <span style={{ fontSize: 32 * S, flexShrink: 0, transform: `scale(${ringScale})` }}>{t.icon}</span>
            <div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 22 * S,
                  color: C.primary,
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {t.name}
              </div>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S,
                  color: C.muted,
                  marginTop: 4 * S,
                }}
              >
                {t.desc}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 4. ThreeReasonsListAnimation — Scene 2 (right side, persistent across phases)
// Visual metaphor: 三個原因卡片 — 隱私 · 離線 · 成本
// Trigger VTT: 86.760s "通常有三類原因" = scene2 local 154
// appearsAt (relative to trigger):
//   第一 隱私: 88.760s →  60
//   第二 離線: 116.900s → 904
//   第三 成本: 132.900s → 1384
// Last topic: 146.040s "前提是你有足夠的硬體" → local 1932
// DURATION = (1932 - 154) + 90 = 1868
function ThreeReasonsListAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1868;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const reasons = [
    { icon: "🔒", label: "第一：隱私安全", desc: "資料根本不出去", color: C.primary, appearsAt: 60 },
    { icon: "📡", label: "第二：離線穩定", desc: "電腦能開就能用", color: C.yellow, appearsAt: 904 },
    { icon: "💰", label: "第三：長期成本", desc: "重度使用更划算", color: C.primary, appearsAt: 1384 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 80 * S,
        top: 220 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 14 * S,
        width: 280 * S,
      }}
    >
      {reasons.map((r, i) => {
        const itemF = Math.max(0, f - r.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [40 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              opacity: itemOp,
              transform: `translateX(${itemTx}px)`,
              background: "rgba(0,0,0,0.85)",
              border: `1px solid ${r.color}55`,
              borderLeft: `3px solid ${r.color}`,
              borderRadius: 10 * S,
              padding: `${12 * S}px ${14 * S}px`,
              display: "flex",
              alignItems: "center",
              gap: 12 * S,
              boxShadow: `0 0 ${10 * S}px ${r.color}22`,
            }}
          >
            <span style={{ fontSize: 28 * S, flexShrink: 0 }}>{r.icon}</span>
            <div>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 20 * S,
                  color: r.color,
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {r.label}
              </div>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S,
                  color: C.muted,
                  marginTop: 4 * S,
                }}
              >
                {r.desc}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 5. HardwareGPUAnimation — Scene 3 Phase A (right side)
// Visual metaphor: GPU 記憶體門檻 bar chart — 8GB / 16GB / 32+GB
// Trigger VTT: 161.040s "以 Llama 的 8B 參數版本為例" = scene3 local 360
// Step delays (relative to trigger):
//   8B:       161.040s → 0
//   中型:    165.040s → 120 (講 8GB)... actually each tier card grows as speaker mentions
//   大型:    168.180s → 214 ("更大的模型需要更高端的配置")
// Last topic: 176.180s "但速度可能很慢" → local 754
// DURATION = (754 - 360) + 90 = 484
function HardwareGPUAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 484;
  const envelope = interpolate(f, [0, 14, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const tiers = [
    { label: "Llama 8B", gb: "8 GB", barW: 30, color: C.primary, appearsAt: 0 },
    { label: "中型模型", gb: "16 GB", barW: 55, color: C.yellow, appearsAt: 120 },
    { label: "大型模型", gb: "32+ GB", barW: 90, color: C.red, appearsAt: 214 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 80 * S,
        top: 240 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 14 * S,
        width: 320 * S,
      }}
    >
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 20 * S,
          color: C.muted,
          letterSpacing: "0.08em",
          textAlign: "right" as const,
        }}
      >
        GPU 記憶體門檻
      </div>
      {tiers.map((t, i) => {
        const itemF = Math.max(0, f - t.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const barWidth = interpolate(itemF, [0, 30], [0, t.barW * 2.8 * S], {
          easing: E.outExpo,
          extrapolateRight: "clamp",
        });
        return (
          <div key={i} style={{ opacity: itemOp }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 6 * S,
              }}
            >
              <span
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S,
                  color: C.text,
                }}
              >
                {t.label}
              </span>
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 20 * S,
                  color: t.color,
                  fontWeight: 700,
                  textShadow: `0 0 ${8 * S}px ${t.color}77`,
                }}
              >
                {t.gb}
              </span>
            </div>
            <div
              style={{
                height: 12 * S,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 6 * S,
                overflow: "hidden" as const,
              }}
            >
              <div
                style={{
                  width: barWidth,
                  height: "100%",
                  background: t.color,
                  borderRadius: 6 * S,
                  boxShadow: `0 0 ${8 * S}px ${t.color}77`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 6. TerminalCmdAnimation — Scene 3 Phase B (right side)
// Visual metaphor: 終端機 + ollama run llama3 typewriter
// Trigger VTT: 193.180s "是下載 Ollama 用一行指令" = scene3 local 1324
// Last topic: 201.180s "從小模型開始感受看看" → local 1564
// DURATION = (1564 - 1324) + 90 = 330
function TerminalCmdAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 330;
  const envelope = interpolate(f, [0, 14, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const cmd = "$ ollama run llama3";
  const chars = Math.floor(prog(f, 70) * cmd.length);
  const visible = cmd.slice(0, chars);
  const cursorOn = Math.floor(f / 15) % 2 === 0;
  const labelOp = interpolate(Math.max(0, f - 90), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        right: 80 * S,
        top: 240 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        width: 360 * S,
        background: "rgba(8,8,8,0.96)",
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 14 * S,
        overflow: "hidden" as const,
        boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.18)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8 * S,
          padding: `${10 * S}px ${14 * S}px`,
          background: "rgba(255,255,255,0.04)",
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
        }}
      >
        <div style={{ width: 12 * S, height: 12 * S, borderRadius: "50%", background: "#ff5f56" }} />
        <div style={{ width: 12 * S, height: 12 * S, borderRadius: "50%", background: "#ffbd2e" }} />
        <div style={{ width: 12 * S, height: 12 * S, borderRadius: "50%", background: "#27c93f" }} />
        <span
          style={{
            marginLeft: 8 * S,
            fontFamily: "'Space Mono', monospace",
            fontSize: 18 * S,
            color: C.muted,
          }}
        >
          terminal
        </span>
      </div>
      <div style={{ padding: `${20 * S}px ${18 * S}px`, minHeight: 100 * S }}>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 22 * S,
            color: C.primary,
            letterSpacing: "0.02em",
            textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.5)`,
            wordBreak: "break-all" as const,
          }}
        >
          {visible}
          <span style={{ opacity: cursorOn ? 1 : 0, color: C.primary }}>▊</span>
        </div>
        <div
          style={{
            opacity: labelOp,
            marginTop: 14 * S,
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 18 * S,
            color: C.muted,
          }}
        >
          一行指令就能跑起來
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Scene Components ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_05_19.title.to - SCENES_2026_05_19.title.from;
  const badgeStyle = useFadeIn(5);
  const subtitleStyle = useFadeUp(46);
  const tagStyle = useFadeUp(70);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: SUBTITLE_SAFE,
          paddingLeft: 80 * S,
          paddingRight: 80 * S,
          textAlign: "center",
        }}
      >
        {/* Badge */}
        <div style={{ ...badgeStyle, marginBottom: 18 * S }}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 20 * S,
              color: C.primary,
              letterSpacing: "0.12em",
              background: C.primaryLight,
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 8 * S,
              padding: `${6 * S}px ${16 * S}px`,
            }}
          >
            每日 AI 知識庫
          </span>
        </div>

        {/* H1 line 1 */}
        <h1
          style={{
            margin: 0,
            lineHeight: 1.15,
            fontFamily: "'Noto Sans TC', sans-serif",
            fontWeight: 900,
            fontSize: 40 * S,
            color: C.text,
          }}
        >
          <WordReveal
            text="本地部署 AI 是什麼"
            startFrame={10}
            staggerPerWord={6}
            fontSize={40 * S}
            color={C.text}
            fontFamily="'Noto Sans TC', sans-serif"
            fontWeight={900}
          />
        </h1>

        {/* H1 line 2 — neon green accent */}
        <h1
          style={{
            margin: 0,
            lineHeight: 1.2,
            marginTop: 8 * S,
            fontFamily: "'Noto Sans TC', sans-serif",
            fontWeight: 900,
            fontSize: 30 * S,
            color: C.primary,
          }}
        >
          <WordReveal
            text="為什麼有人不想用雲端"
            startFrame={28}
            staggerPerWord={6}
            fontSize={30 * S}
            color={C.primary}
            fontFamily="'Noto Sans TC', sans-serif"
            fontWeight={900}
          />
        </h1>

        {/* Subtitle */}
        <p
          style={{
            ...subtitleStyle,
            marginTop: 22 * S,
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 20 * S,
            color: C.muted,
            lineHeight: 1.6,
          }}
        >
          把 AI 裝在自己的電腦上跑——資料完全不離開你的裝置
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 20 * S }}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 20 * S,
              color: C.muted,
              letterSpacing: "0.1em",
            }}
          >
            Local AI · 隱私 · 離線 · 開源
          </span>
        </div>
      </AbsoluteFill>

      {/* Concept animation: CloudUploadAnimation at frame 244 */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <CloudUploadAnimation triggerFrame={244} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene 1 — 什麼是本地部署 AI + 工具 ────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_19.scene1.to - SCENES_2026_05_19.scene1.from;
  // VTT anchors (scene1 local = global - 794):
  //   26.480s "這就是今天要講的主題 本地部署AI"       → 0
  //   31.480s "概念很直接 你把AI模型的檔案下載"        → 150
  //   36.480s "讓模型直接在本地運行"                   → 300
  //   39.480s "輸入什麼 輸出什麼 資料從頭到尾..."     → 390
  //   45.480s "不需要網路 也不會有任何資訊送到第三方" → 570
  //   49.480s "目前最常用來本地部署的工具"             → 690  ← Phase B start
  //   60.620s "LM Studio有圖形介面"                    → 1024
  //   63.620s "還有 llama.cpp"                          → 1114
  //   70.620s "你在AI工具裡輸入過哪些資訊"             → 1325
  //   74.620s "客戶資料、健康狀況、公司機密文件"      → 1445
  //   78.620s "這些你有想過他們去了哪裡嗎"             → 1565

  // Phase A: 本地部署 AI 概念定義 (0-690)
  const HEADING_AT = 0;
  const DEF_AT = 150;
  const KEY_HIGHLIGHT_AT = 570;

  // Phase A → B transition
  const A_FADE_START = 690 - 80; // 610
  const A_REMOVE = 690;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B: 三個工具 + 思考問題 (690+)
  const B_SHOW_AT = A_REMOVE;
  const TOOLS_HEAD_AT = 690; // = B_SHOW_AT (first phase B element)
  const OLLAMA_AT = 690;
  const LMSTUDIO_AT = 1024;
  const LLAMACPP_AT = 1114;
  const QUESTION_AT = 1325;
  const showB = frame >= B_SHOW_AT;

  // Concept animation triggers
  const LOCAL_DEVICE_AT = 0; // LocalDeviceLoopAnimation (left)
  const TOOLS_TRIAD_AT = 690; // ToolsTriadAnimation (right)

  const headingStyle = useFadeUp(HEADING_AT);
  const defStyle = useFadeUp(DEF_AT);
  const keyHighlightStyle = useFadeUp(KEY_HIGHLIGHT_AT);
  const toolsHeadStyle = useFadeUp(showB ? TOOLS_HEAD_AT : 999999);
  const ollamaStyle = useFadeUp(showB ? OLLAMA_AT : 999999);
  const lmStudioStyle = useFadeUp(showB ? LMSTUDIO_AT : 999999);
  const llamaCppStyle = useFadeUp(showB ? LLAMACPP_AT : 999999);
  const questionStyle = useFadeUp(showB ? QUESTION_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A: 本地部署 AI 概念 ─────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Section heading */}
            <div style={{ ...headingStyle, marginBottom: 18 * S }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 20 * S,
                  color: C.primary,
                  letterSpacing: "0.1em",
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                  display: "inline-block",
                  marginBottom: 12 * S,
                }}
              >
                WHAT IS LOCAL AI
              </div>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 26 * S,
                  color: C.text,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                本地部署 AI =<br />
                把模型放在你自己的裝置上
              </div>
            </div>

            {/* Definition card */}
            <div style={{ ...defStyle, marginBottom: 18 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                  boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.06)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 10 * S,
                  }}
                >
                  概念很直接
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.text,
                    lineHeight: 1.65,
                  }}
                >
                  把 AI 模型檔案下載到自己的電腦或伺服器，
                  <br />
                  讓模型<span style={{ color: C.primary, fontWeight: 700 }}> 直接在本地運行</span>
                </div>
              </div>
            </div>

            {/* Key highlight */}
            <div style={{ ...keyHighlightStyle }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1.5px solid ${C.primary}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                  boxShadow: `0 0 ${28 * S}px rgba(124,255,178,0.16)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.primary,
                    fontWeight: 700,
                    lineHeight: 1.4,
                  }}
                >
                  資料從頭到尾不離開你的裝置
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.muted,
                    lineHeight: 1.6,
                    marginTop: 8 * S,
                  }}
                >
                  不需要網路 · 沒有任何資訊送到第三方
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B: 三個常用工具 + 思考問題 ────────────── */}
        {showB && (
          <>
            {/* Section heading */}
            <div style={{ ...toolsHeadStyle, marginBottom: 18 * S }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 20 * S,
                  color: C.primary,
                  letterSpacing: "0.1em",
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                  display: "inline-block",
                  marginBottom: 12 * S,
                }}
              >
                LOCAL-AI TOOLS
              </div>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 24 * S,
                  color: C.text,
                  fontWeight: 700,
                  lineHeight: 1.3,
                }}
              >
                三個最常用的本地部署工具
              </div>
            </div>

            {/* Ollama */}
            <div style={{ ...ollamaStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderLeft: `3px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${22 * S}px`,
                  display: "flex",
                  gap: 18 * S,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 24 * S,
                    color: C.primary,
                    fontWeight: 700,
                    minWidth: 200 * S,
                    textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.45)`,
                  }}
                >
                  Ollama
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.55,
                  }}
                >
                  一行指令在本機跑各種開源模型
                </div>
              </div>
            </div>

            {/* LM Studio */}
            <div style={{ ...lmStudioStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderLeft: `3px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${22 * S}px`,
                  display: "flex",
                  gap: 18 * S,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 24 * S,
                    color: C.primary,
                    fontWeight: 700,
                    minWidth: 200 * S,
                    textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.45)`,
                  }}
                >
                  LM Studio
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.55,
                  }}
                >
                  圖形介面 · 不需要打指令
                </div>
              </div>
            </div>

            {/* llama.cpp */}
            <div style={{ ...llamaCppStyle, marginBottom: 18 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderLeft: `3px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${22 * S}px`,
                  display: "flex",
                  gap: 18 * S,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 24 * S,
                    color: C.primary,
                    fontWeight: 700,
                    minWidth: 200 * S,
                    textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.45)`,
                  }}
                >
                  llama.cpp
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.55,
                  }}
                >
                  讓模型在一般電腦上輕量執行
                </div>
              </div>
            </div>

            {/* Question prompt */}
            <div style={{ ...questionStyle }}>
              <div
                style={{
                  background: C.redLight,
                  border: `1.5px solid ${C.redBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.red,
                    letterSpacing: "0.08em",
                    marginBottom: 10 * S,
                  }}
                >
                  ⚠ 想一想
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: 700,
                    lineHeight: 1.45,
                  }}
                >
                  你在 AI 工具裡輸入過哪些資訊？
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.muted,
                    lineHeight: 1.6,
                    marginTop: 8 * S,
                  }}
                >
                  客戶資料 · 健康狀況 · 公司機密文件——它們都去了哪裡？
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <LocalDeviceLoopAnimation triggerLocalFrame={LOCAL_DEVICE_AT} />
        <ToolsTriadAnimation triggerLocalFrame={TOOLS_TRIAD_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene 2 — 為什麼有人不想用雲端 AI ────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_19.scene2.to - SCENES_2026_05_19.scene2.from;
  // VTT anchors (scene2 local = global - 2449):
  //    81.620s "為什麼有人不想用雲端AI"           →   0
  //    86.760s "通常有三類原因"                    → 154
  //    88.760s "第一 隱私和資料安全"               → 214
  //    94.760s "律師不能把客戶案件..."             → 394
  //    99.760s "醫療機構不能..."                   → 544
  //   103.760s "處理競爭敏感資訊的公司..."        → 664
  //   112.900s "本地部署能解決這類顧慮"           → 938
  //   116.900s "第二 離線使用和穩定性"            → 1058 ← Phase B start
  //   120.900s "在沒有網路或網路不穩定的環境下"  → 1178
  //   132.900s "第三 長期成本控制"                → 1538
  //   134.900s "重度使用API的開發者"              → 1598
  //   141.040s "硬體上長期算下來..."              → 1782
  //   146.040s "前提是你有足夠的硬體"             → 1932

  // Phase A elements
  const HEADING_AT = 0;
  const INTRO_AT = 154;
  const REASON1_AT = 214;
  const EX1_AT = 394;
  const EX2_AT = 544;
  const EX3_AT = 664;
  const CONCLUDE_A_AT = 938;

  // Phase A → B
  const A_FADE_START = 1058 - 80; // 978
  const A_REMOVE = 1058;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B
  const B_SHOW_AT = A_REMOVE;
  const REASON2_AT = 1058; // = B_SHOW_AT (first Phase B element)
  const REASON2_DETAIL_AT = 1178;
  const REASON3_AT = 1538;
  const REASON3_DETAIL_AT = 1598;
  const CAVEAT_AT = 1932;
  const showB = frame >= B_SHOW_AT;

  // Concept animation
  const THREE_REASONS_AT = 154; // ThreeReasonsListAnimation (right) — persistent across phases

  const headingStyle = useFadeUp(HEADING_AT);
  const introStyle = useFadeUp(INTRO_AT);
  const reason1Style = useFadeUp(REASON1_AT);
  const ex1Style = useFadeUp(EX1_AT);
  const ex2Style = useFadeUp(EX2_AT);
  const ex3Style = useFadeUp(EX3_AT);
  const concludeAStyle = useFadeUp(CONCLUDE_A_AT);
  const reason2Style = useFadeUp(showB ? REASON2_AT : 999999);
  const reason2DetailStyle = useFadeUp(showB ? REASON2_DETAIL_AT : 999999);
  const reason3Style = useFadeUp(showB ? REASON3_AT : 999999);
  const reason3DetailStyle = useFadeUp(showB ? REASON3_DETAIL_AT : 999999);
  const caveatStyle = useFadeUp(showB ? CAVEAT_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A: 隱私和資料安全 ─────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headingStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 20 * S,
                  color: C.primary,
                  letterSpacing: "0.1em",
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                  display: "inline-block",
                  marginBottom: 10 * S,
                }}
              >
                WHY NOT CLOUD
              </div>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 26 * S,
                  color: C.text,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                為什麼有人不想用雲端 AI
              </div>
            </div>

            <div style={{ ...introStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 20 * S,
                  color: C.muted,
                  lineHeight: 1.6,
                }}
              >
                通常有三類原因。
              </div>
            </div>

            {/* Reason 1 main card */}
            <div style={{ ...reason1Style, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1.5px solid ${C.primary}`,
                  borderRadius: 14 * S,
                  padding: `${14 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.primary,
                    letterSpacing: "0.08em",
                    marginBottom: 6 * S,
                  }}
                >
                  01 · REASON
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  🔒 隱私和資料安全
                </div>
              </div>
            </div>

            {/* Examples */}
            <div style={{ ...ex1Style, marginBottom: 10 * S }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10 * S,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderRadius: 10 * S,
                  padding: `${10 * S}px ${16 * S}px`,
                }}
              >
                <span style={{ fontSize: 20 * S, flexShrink: 0 }}>⚖️</span>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.55,
                  }}
                >
                  律師不能把客戶案件細節貼進公開 AI
                </div>
              </div>
            </div>
            <div style={{ ...ex2Style, marginBottom: 10 * S }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10 * S,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderRadius: 10 * S,
                  padding: `${10 * S}px ${16 * S}px`,
                }}
              >
                <span style={{ fontSize: 20 * S, flexShrink: 0 }}>🏥</span>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.55,
                  }}
                >
                  醫療機構不能把病患資訊送到第三方伺服器
                </div>
              </div>
            </div>
            <div style={{ ...ex3Style, marginBottom: 14 * S }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10 * S,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderRadius: 10 * S,
                  padding: `${10 * S}px ${16 * S}px`,
                }}
              >
                <span style={{ fontSize: 20 * S, flexShrink: 0 }}>🏢</span>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.55,
                  }}
                >
                  公司不願讓雲端服務商看到自己的策略文件
                </div>
              </div>
            </div>

            {/* Conclude */}
            <div style={{ ...concludeAStyle }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${12 * S}px ${20 * S}px`,
                  boxShadow: `0 0 ${18 * S}px rgba(124,255,178,0.15)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.primary,
                    fontWeight: 700,
                    lineHeight: 1.5,
                  }}
                >
                  本地部署解決這類顧慮——資料根本不出去
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B: 離線使用 + 長期成本 ────────────────── */}
        {showB && (
          <>
            {/* Reason 2 main */}
            <div style={{ ...reason2Style, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.yellowLight,
                  border: `1.5px solid ${C.yellow}`,
                  borderRadius: 14 * S,
                  padding: `${14 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.yellow,
                    letterSpacing: "0.08em",
                    marginBottom: 6 * S,
                  }}
                >
                  02 · REASON
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  📡 離線使用和穩定性
                </div>
              </div>
            </div>

            <div style={{ ...reason2DetailStyle, marginBottom: 18 * S }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderRadius: 10 * S,
                  padding: `${12 * S}px ${18 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  沒網路、網路不穩——
                  <span style={{ color: C.yellow, fontWeight: 700 }}>雲端用不了</span>。
                  <br />
                  本地模型只要電腦能開隨時能用。
                </div>
              </div>
            </div>

            {/* Reason 3 main */}
            <div style={{ ...reason3Style, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1.5px solid ${C.primary}`,
                  borderRadius: 14 * S,
                  padding: `${14 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.primary,
                    letterSpacing: "0.08em",
                    marginBottom: 6 * S,
                  }}
                >
                  03 · REASON
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  💰 長期成本控制
                </div>
              </div>
            </div>

            <div style={{ ...reason3DetailStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderRadius: 10 * S,
                  padding: `${12 * S}px ${18 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  重度使用 API 的開發者，月費可觀。一次下載模型跑在自己硬體上，
                  <span style={{ color: C.primary, fontWeight: 700 }}>長期可能更划算</span>。
                </div>
              </div>
            </div>

            {/* Caveat */}
            <div style={{ ...caveatStyle }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 20 * S,
                  color: C.muted,
                  letterSpacing: "0.06em",
                  textAlign: "center" as const,
                  padding: `${8 * S}px 0`,
                }}
              >
                * 前提是你有足夠的硬體
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ThreeReasonsListAnimation triggerLocalFrame={THREE_REASONS_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene 3 — 現實面 + 入門 + 提醒 ────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_19.scene3.to - SCENES_2026_05_19.scene3.from;
  // VTT anchors (scene3 local = global - 4471):
  //   149.040s "現實面呢"                                  →    0
  //   150.040s "本地部署的吸引力很大"                       →   30
  //   154.040s "最大的問題是硬體要求"                       →  150
  //   161.040s "以 Llama 的 8B 參數版本為例"                →  360
  //   168.180s "更大的模型需要更高端的配置"                 →  574
  //   171.180s "如果只有一般筆電跑得起來"                   →  664
  //   176.180s "還有一個現實"                               →  814
  //   177.180s "本地能跑的開源模型"                         →  844
  //   183.180s "仍然和頂級雲端模型有差距"                   → 1024
  //   186.180s "雖然這個差距正在持續縮小中"                 → 1114
  //   189.180s "如果你想試試看"                             → 1204 ← Phase B
  //   193.180s "是下載 Ollama 用一行指令"                   → 1324
  //   198.180s "LM Studio則有比較友善的圖形介面"            → 1474
  //   201.180s "從小模型開始感受看看"                       → 1564
  //   204.180s "最後一個提醒"                               → 1654
  //   209.180s "但開源模型的訓練資料"                       → 1804
  //   214.180s "跑在自己電腦上不等於完全可信"               → 1954
  //   218.180s "模型輸出仍然需要批判性的評估"               → 2074
  //   222.180s "如果有一天雲端AI服務的隱私政策讓你不放心"   → 2194

  // Phase A
  const HEADING_AT = 0;
  const HW_MAIN_AT = 150;
  const HW_STAT_AT = 360;
  const HW_CAVEAT_AT = 664;
  const GAP_AT = 814;
  const GAP_NOTE_AT = 1114;

  // Phase A → B
  const A_FADE_START = 1204 - 80; // 1124
  const A_REMOVE = 1204;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B
  const B_SHOW_AT = A_REMOVE;
  const START_HEAD_AT = 1204; // = B_SHOW_AT (first Phase B element)
  const OLLAMA_AT = 1324;
  const LMSTUDIO_AT = 1474;
  const TIP_AT = 1564;
  const REMIND_HEAD_AT = 1654;
  const TRUST_AT = 1804;
  const EVAL_AT = 2074;
  const REFLECTION_AT = 2194;
  const showB = frame >= B_SHOW_AT;

  // Concept animations
  const HW_GPU_AT = 360; // HardwareGPUAnimation (right) Phase A
  const TERMINAL_AT = 1324; // TerminalCmdAnimation (right) Phase B

  const headingStyle = useFadeUp(HEADING_AT);
  const hwMainStyle = useFadeUp(HW_MAIN_AT);
  const hwStatStyle = useFadeUp(HW_STAT_AT);
  const hwCaveatStyle = useFadeUp(HW_CAVEAT_AT);
  const gapStyle = useFadeUp(GAP_AT);
  const gapNoteStyle = useFadeUp(GAP_NOTE_AT);

  const startHeadStyle = useFadeUp(showB ? START_HEAD_AT : 999999);
  const ollamaStyle = useFadeUp(showB ? OLLAMA_AT : 999999);
  const lmStudioStyle = useFadeUp(showB ? LMSTUDIO_AT : 999999);
  const tipStyle = useFadeUp(showB ? TIP_AT : 999999);
  const remindHeadStyle = useFadeUp(showB ? REMIND_HEAD_AT : 999999);
  const trustStyle = useFadeUp(showB ? TRUST_AT : 999999);
  const evalStyle = useFadeUp(showB ? EVAL_AT : 999999);
  const reflectionStyle = useFadeUp(showB ? REFLECTION_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      {/* Phase A: separate ContentColumn (no scroll) */}
      {showA && (
        <ContentColumn>
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headingStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 20 * S,
                  color: C.yellow,
                  letterSpacing: "0.1em",
                  background: C.yellowLight,
                  border: `1px solid ${C.yellowBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                  display: "inline-block",
                  marginBottom: 10 * S,
                }}
              >
                REALITY CHECK
              </div>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 26 * S,
                  color: C.text,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                現實面——本地部署的門檻
              </div>
            </div>

            {/* Hardware main */}
            <div style={{ ...hwMainStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.yellowLight,
                  border: `1.5px solid ${C.yellow}`,
                  borderRadius: 14 * S,
                  padding: `${14 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.yellow,
                    letterSpacing: "0.08em",
                    marginBottom: 6 * S,
                  }}
                >
                  ⚠ 最大的問題
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  硬體要求 · 大量 GPU 記憶體
                </div>
              </div>
            </div>

            {/* GPU stat */}
            <div style={{ ...hwStatStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid rgba(255,255,255,0.08)`,
                  borderRadius: 10 * S,
                  padding: `${12 * S}px ${18 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  以 <span style={{ color: C.primary, fontWeight: 700 }}>Llama 8B</span> 為例——
                  <br />
                  至少需要 <span style={{ color: C.primary, fontWeight: 700 }}>8GB GPU 記憶體</span>。更大的模型需要更高配置。
                </div>
              </div>
            </div>

            {/* Caveat (laptop slow) */}
            <div style={{ ...hwCaveatStyle, marginBottom: 18 * S }}>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S,
                  color: C.muted,
                  lineHeight: 1.55,
                  fontStyle: "italic",
                }}
              >
                一般筆電跑得起來——但速度可能很慢。
              </div>
            </div>

            {/* Open-source gap */}
            <div style={{ ...gapStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.surfaceBorder}`,
                  borderLeft: `3px solid ${C.yellow}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.yellow,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  另一個現實
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.text,
                    lineHeight: 1.5,
                  }}
                >
                  開源模型在通用任務上 · 仍與頂級雲端模型有差距
                </div>
              </div>
            </div>

            {/* Gap note */}
            <div style={{ ...gapNoteStyle }}>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S,
                  color: C.primary,
                  lineHeight: 1.55,
                  textAlign: "center" as const,
                  padding: `${4 * S}px 0`,
                }}
              >
                ↗ 但這個差距正在持續縮小中
              </div>
            </div>
          </div>
        </ContentColumn>
      )}

      {/* Phase B: separate ContentColumn with scrollUp (Phase B est_height ~1700px > 1620 → must scrollUp) */}
      {showB && (
        <ContentColumn scrollUp={{ at: REFLECTION_AT - 30, amount: 400 }}>
          <>
            <div style={{ ...startHeadStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 20 * S,
                  color: C.primary,
                  letterSpacing: "0.1em",
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                  display: "inline-block",
                  marginBottom: 10 * S,
                }}
              >
                GETTING STARTED
              </div>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 24 * S,
                  color: C.text,
                  fontWeight: 700,
                  lineHeight: 1.3,
                }}
              >
                想試試看——最簡單的入門方式
              </div>
            </div>

            {/* Ollama start */}
            <div style={{ ...ollamaStyle, marginBottom: 12 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderLeft: `3px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${12 * S}px ${20 * S}px`,
                  display: "flex",
                  gap: 16 * S,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 22 * S,
                    color: C.primary,
                    fontWeight: 700,
                    minWidth: 180 * S,
                  }}
                >
                  Ollama
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.55,
                  }}
                >
                  一行指令跑 Llama / Mistral
                </div>
              </div>
            </div>

            {/* LM Studio start */}
            <div style={{ ...lmStudioStyle, marginBottom: 12 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderLeft: `3px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${12 * S}px ${20 * S}px`,
                  display: "flex",
                  gap: 16 * S,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 22 * S,
                    color: C.primary,
                    fontWeight: 700,
                    minWidth: 180 * S,
                  }}
                >
                  LM Studio
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.55,
                  }}
                >
                  友善的圖形介面
                </div>
              </div>
            </div>

            {/* Tip */}
            <div style={{ ...tipStyle, marginBottom: 18 * S }}>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S,
                  color: C.muted,
                  lineHeight: 1.55,
                  textAlign: "center" as const,
                  padding: `${4 * S}px 0`,
                }}
              >
                從小模型開始 · 先感受看看
              </div>
            </div>

            {/* Final reminder section */}
            <div style={{ ...remindHeadStyle, marginBottom: 12 * S }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 20 * S,
                  color: C.red,
                  letterSpacing: "0.1em",
                  background: C.redLight,
                  border: `1px solid ${C.redBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                  display: "inline-block",
                }}
              >
                ⚠ 最後一個提醒
              </div>
            </div>

            {/* Trust warning */}
            <div style={{ ...trustStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.redLight,
                  border: `1.5px solid ${C.red}`,
                  borderRadius: 14 * S,
                  padding: `${14 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: 700,
                    lineHeight: 1.4,
                  }}
                >
                  跑在自己電腦上 ≠ 完全可信
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.muted,
                    lineHeight: 1.6,
                    marginTop: 8 * S,
                  }}
                >
                  開源模型的訓練資料、偏向、限制，你未必完全清楚。
                </div>
              </div>
            </div>

            <div style={{ ...evalStyle, marginBottom: 18 * S }}>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S,
                  color: C.text,
                  lineHeight: 1.6,
                  textAlign: "center" as const,
                }}
              >
                模型輸出 · 仍需 <span style={{ color: C.red, fontWeight: 700 }}>批判性評估</span>
              </div>
            </div>

            {/* Reflection prompt */}
            <div style={{ ...reflectionStyle }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1.5px solid ${C.primary}`,
                  borderRadius: 14 * S,
                  padding: `${14 * S}px ${22 * S}px`,
                  boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.15)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.primary,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  REFLECT
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.text,
                    fontWeight: 700,
                    lineHeight: 1.45,
                  }}
                >
                  你有能力在自己的裝置上跑一個 AI 嗎？
                </div>
              </div>
            </div>
          </>
        </ContentColumn>
      )}

      {/* Concept animations — both on right side, no time overlap */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <HardwareGPUAnimation triggerLocalFrame={HW_GPU_AT} />
        <TerminalCmdAnimation triggerLocalFrame={TERMINAL_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene ───────────────────────────────────────────────────────────
function SummaryCard({
  number,
  text,
  delay,
  color,
  border,
}: {
  number: string;
  text: string;
  delay: number;
  color: string;
  border: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div
        style={{
          display: "flex",
          gap: 16 * S,
          alignItems: "flex-start",
          background: `${border}12`,
          border: `1px solid ${border}`,
          borderRadius: 14 * S,
          padding: `${14 * S}px ${22 * S}px`,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 24 * S,
            color,
            fontWeight: 700,
            flexShrink: 0,
            marginTop: 2 * S,
            textShadow: `0 0 ${10 * S}px ${color}88`,
          }}
        >
          {number}
        </div>
        <div
          style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 18 * S,
            color: C.text,
            lineHeight: 1.65,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_05_19.summary.to - SCENES_2026_05_19.summary.from;
  // summary local = global - 6965:
  //   232.180s "今天的重點整理"             →   0
  //   234.180s "第一,本地部署AI..."         →  60
  //   241.180s "第二,選擇這條路的原因"     → 270
  //   248.180s "第三,Ollama和LM Studio..."  → 480
  //   263.180s "這裡是每日 AI 知識庫"       → 930

  const BADGE_AT = 0;
  const CARD1_AT = 60;
  const CARD2_AT = 270;
  const CARD3_AT = 480;
  const OUTRO_AT = 930;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{ ...badgeStyle, marginBottom: 22 * S, marginTop: 30 * S }}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 20 * S,
              color: C.primary,
              letterSpacing: "0.12em",
              background: C.primaryLight,
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 8 * S,
              padding: `${6 * S}px ${16 * S}px`,
            }}
          >
            <WordReveal
              text="重點整理"
              startFrame={4}
              staggerPerWord={5}
              fontSize={20 * S}
              color={C.primary}
              fontFamily="'Space Mono', monospace"
              letterSpacing="0.12em"
            />
          </span>
        </div>

        <SummaryCard
          number="01"
          delay={CARD1_AT}
          text="本地部署 AI 讓模型跑在你的裝置上——資料不經過雲端，完全本地處理。"
          color={C.primary}
          border={C.primary}
        />
        <SummaryCard
          number="02"
          delay={CARD2_AT}
          text="選擇這條路的三個原因：隱私保護 · 離線使用 · 長期成本控制。"
          color={C.primary}
          border={C.primary}
        />
        <SummaryCard
          number="03"
          delay={CARD3_AT}
          text="Ollama 和 LM Studio 是入門最簡單的工具——硬體是門檻，能力仍有差距但在縮小。本地 ≠ 免驗證，仍需批判性評估。"
          color={C.yellow}
          border={C.yellow}
        />

        {/* Outro */}
        <div style={{ ...outroStyle, marginTop: 18 * S }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 20 * S,
              color: C.muted,
              letterSpacing: "0.08em",
              textAlign: "center" as const,
            }}
          >
            每日 AI 知識庫
          </div>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Main Composition ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export function VideoComposition_2026_05_19() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_19.scene1;
  const S2 = SCENES_2026_05_19.scene2;
  const S3 = SCENES_2026_05_19.scene3;
  const SU = SCENES_2026_05_19.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Main narration */}
      <Audio src={staticFile("audio/2026-05-19-processed.wav")} volume={1.0} />

      {/* Background music (0.10 vol, fade in/out) */}
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_05_19 - 150, TOTAL_FRAMES_2026_05_19],
            [v, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          return Math.min(fi, fo);
        }}
        loop
      />

      <Background />

      {/* TitleScene */}
      <Sequence from={0} durationInFrames={S1.from}>
        <TitleScene />
      </Sequence>

      {/* Scene 1 — 什麼是本地部署 AI + 工具 */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — 為什麼有人不想用雲端 AI */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — 現實面 + 入門 + 提醒 */}
      <Sequence from={S3.from} durationInFrames={S3.to - S3.from}>
        <Scene3 />
      </Sequence>

      {/* Summary */}
      <Sequence from={SU.from} durationInFrames={SU.to - SU.from}>
        <SummaryScene />
      </Sequence>

      {/* Global overlays */}
      <ProgressBar globalFrame={frame} />
      <IMessageOverlay globalFrame={frame} />
    </AbsoluteFill>
  );
}
