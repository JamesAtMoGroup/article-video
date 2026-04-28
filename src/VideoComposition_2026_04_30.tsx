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

// ── Scale & canvas ─────────────────────────────────────────────────────────
const S = 3;
const W = 1280 * S;  // 3840
const H = 720  * S;  // 2160
const NAV_H         = 50  * S;
const CONTAINER_W   = 640 * S;
const COL_LEFT      = (W - CONTAINER_W) / 2;
const SUBTITLE_SAFE = 120 * S;
const CONTENT_GAP   = 10  * S;
const CONTENT_TOP   = NAV_H + CONTENT_GAP;
const CONTENT_H     = H - CONTENT_TOP - SUBTITLE_SAFE;

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:           "#000000",
  surface:      "#0d0d0d",
  surfaceBorder:"rgba(255,255,255,0.08)",
  primary:      "#7cffb2",
  primaryLight: "rgba(124,255,178,0.07)",
  primaryBorder:"rgba(124,255,178,0.14)",
  text:         "#ffffff",
  muted:        "#888888",
  yellow:       "#ffd166",
  yellowLight:  "rgba(255,209,102,0.1)",
  yellowBorder: "rgba(255,209,102,0.2)",
  red:          "#ff6b6b",
  redLight:     "rgba(255,107,107,0.08)",
  redBorder:    "rgba(255,107,107,0.2)",
} as const;

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W       = 290 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLOT    = 148 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ────────────────────────────────────
// TitleScene: 0–22.5s    → 0–675
// Scene1:     22.5–104s  → 675–3120
// Scene2:     104–193s   → 3120–5790
// Scene3:     193–281s   → 5790–8430
// Summary:    281–315s   → 8430–9450
export const SCENES_2026_04_30 = {
  title:   { from: 0,    to: 675   },
  scene1:  { from: 675,  to: 3120  },
  scene2:  { from: 3120, to: 5790  },
  scene3:  { from: 5790, to: 8430  },
  summary: { from: 8430, to: 9450  },
} as const;
export const TOTAL_FRAMES_2026_04_30 = 9450;

const CHAPTERS = [
  { label: "今日焦點",     start: 0    },
  { label: "學工具",       start: 675  },
  { label: "學原理",       start: 3120 },
  { label: "兩者並進",     start: 5790 },
  { label: "重點整理",     start: 8430 },
] as const;

// ── iMessage callouts (global frames) ──────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 2835, to: 3120, sender: "想一想", text: "你學過哪些 AI 工具？其中有幾個你現在還在用？又有幾個已經被你棄用了？" },
  { from: 5430, to: 5790, sender: "想一想", text: "你有沒有遇過「知道原理但不知道怎麼用」？或是相反——「會用但不知道為什麼有效」？" },
  { from: 8115, to: 8430, sender: "想一想", text: "你目前的 AI 學習，偏工具還是偏原理？下一步你想補的是哪一塊？" },
];

// ── Easing tokens ──────────────────────────────────────────────────────────
const E = {
  outExpo:  Easing.bezier(0.19, 1, 0.22, 1),
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
  const ty = interpolate(f, [0, 22], [22 * S, 0], { easing: E.outExpo,  extrapolateRight: "clamp" });
  const op = interpolate(f, [0, 14], [0, 1],       { easing: E.outCubic, extrapolateRight: "clamp" });
  return { opacity: op, transform: `translateY(${ty}px)` };
}
function useFadeIn(startFrame: number) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  return { opacity: interpolate(f, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }) };
}

// ── WordReveal ─────────────────────────────────────────────────────────────
function WordReveal({ text, startFrame, staggerPerWord = 4, fontSize, color, fontFamily, fontWeight, lineHeight, letterSpacing }: {
  text: string; startFrame: number; staggerPerWord?: number;
  fontSize?: number; color?: string; fontFamily?: string;
  fontWeight?: number | string; lineHeight?: number; letterSpacing?: string;
}) {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline", lineHeight: lineHeight ?? 1.3 }}>
      {text.split(" ").map((word, i) => {
        const f = Math.max(0, frame - (startFrame + i * staggerPerWord));
        const ty = interpolate(f, [0, 20], [18 * S, 0], { easing: E.outExpo,  extrapolateRight: "clamp" });
        const op = interpolate(f, [0, 12], [0, 1],       { easing: E.outCubic, extrapolateRight: "clamp" });
        return (
          <span key={i} style={{
            display: "inline-block", opacity: op, transform: `translateY(${ty}px)`,
            marginRight: "0.28em", fontSize, color, fontFamily, fontWeight, letterSpacing,
          }}>{word}</span>
        );
      })}
    </span>
  );
}

// ── SceneFade ──────────────────────────────────────────────────────────────
function SceneFade({ children, durationInFrames }: { children: React.ReactNode; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const fadeIn  = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return <div style={{ opacity: Math.min(fadeIn, fadeOut), height: "100%" }}>{children}</div>;
}

// ── ContentColumn ──────────────────────────────────────────────────────────
function ContentColumn({ children, scrollUp }: {
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
      <div style={{
        position: "absolute", top: CONTENT_TOP, left: COL_LEFT,
        width: CONTAINER_W, height: CONTENT_H,
        overflow: "hidden" as const,
      }}>
        <div style={{ transform: `translateY(${scrollY}px)` }}>
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Background ─────────────────────────────────────────────────────────────
function Background() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: 900 * S, height: 900 * S, top: -200 * S, left: -150 * S,
        background: "radial-gradient(circle, rgba(124,255,178,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: 700 * S, height: 700 * S, top: 300 * S, right: -100 * S,
        background: "radial-gradient(circle, rgba(124,255,178,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: 500 * S, height: 500 * S, bottom: 100 * S, left: 300 * S,
        background: "radial-gradient(circle, rgba(255,209,102,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
        backgroundSize: `${60 * S}px ${60 * S}px`,
        pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );
}

// ── ProgressBar ────────────────────────────────────────────────────────────
function ProgressBar({ globalFrame }: { globalFrame: number }) {
  const { durationInFrames } = useVideoConfig();
  const progress = globalFrame / durationInFrames;
  const current = [...CHAPTERS].reverse().find(c => globalFrame >= c.start) ?? CHAPTERS[0];
  const slideIn = interpolate(globalFrame, [0, 15], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 10 }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: NAV_H,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.primaryBorder}`,
        padding: `${10 * S}px ${32 * S}px`,
        transform: `translateY(${interpolate(slideIn, [0, 1], [-NAV_H, 0])}px)`,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 18 * S, color: C.muted,
          fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em",
        }}>
          <span>每日 AI 知識庫</span>
          <span style={{ color: C.primary }}>{current.label}</span>
        </div>
        <div style={{
          height: 3 * S, background: "rgba(255,255,255,0.06)",
          borderRadius: 99, overflow: "hidden", marginTop: 6 * S,
        }}>
          <div style={{
            height: "100%", width: `${progress * 100}%`,
            background: C.primary, borderRadius: 99,
            boxShadow: `0 0 ${8 * S}px ${C.primary}88`,
          }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── iMessage ───────────────────────────────────────────────────────────────
function IMessageCard({ callout, slotIndex, globalFrame }: {
  callout: Callout; slotIndex: number; globalFrame: number;
}) {
  const { fps } = useVideoConfig();
  const f = Math.max(0, globalFrame - callout.from);
  const remaining = callout.to - globalFrame;
  const slideY = spring({ frame: f, fps, config: { damping: 22, stiffness: 130 } });
  const translateY = interpolate(slideY, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);
  const fadeOut = remaining < FADE_OUT_FRAMES
    ? interpolate(remaining, [0, FADE_OUT_FRAMES], [0, 1], clamp)
    : 1;
  const slotOffset = slotIndex * NOTIF_SLOT;
  return (
    <div style={{
      position: "absolute", top: NOTIF_TOP + slotOffset, right: NOTIF_RIGHT,
      width: NOTIF_W, opacity: fadeOut,
      transform: `translateY(${translateY}px)`,
      zIndex: 100,
      background: "rgba(18,18,18,0.95)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderRadius: 16 * S,
      border: `1px solid rgba(124,255,178,0.2)`,
      padding: `${12 * S}px ${14 * S}px`,
      boxShadow: `0 ${8 * S}px ${24 * S}px rgba(0,0,0,0.6)`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 6 * S,
      }}>
        <div style={{
          width: 10 * S, height: 10 * S, borderRadius: "50%", background: C.primary,
          boxShadow: `0 0 ${6 * S}px ${C.primary}`,
        }} />
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary,
          letterSpacing: "0.05em",
        }}>{callout.sender}</span>
      </div>
      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text,
        lineHeight: 1.55,
      }}>{callout.text}</div>
    </div>
  );
}

function IMessageOverlay({ globalFrame }: { globalFrame: number }) {
  const active = ALL_CALLOUTS.filter(c => globalFrame >= c.from && globalFrame < c.to);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 90 }}>
      {active.map((c, i) => (
        <IMessageCard key={c.from} callout={c} slotIndex={i} globalFrame={globalFrame} />
      ))}
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Concept Animations ──────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// 1. TwoPathsAnimation — TitleScene (trigger=150 global), DURATION=400
// Visual metaphor: 中央分歧點，兩條路 — 左「用 AI」(手 + APP)、右「懂 AI」(brain + gear)
function TwoPathsAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 400;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const nodeScale = easeOutBack(prog(f, 22));
  const leftPathW  = interpolate(Math.max(0, f - 24), [0, 36], [0, 90 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const rightPathW = interpolate(Math.max(0, f - 36), [0, 36], [0, 90 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const leftCardOp  = interpolate(Math.max(0, f - 70), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const rightCardOp = interpolate(Math.max(0, f - 90), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: "50%", bottom: SUBTITLE_SAFE + 60 * S,
      transform: "translateX(-50%)",
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 720 * S,
    }}>
      {/* Top row: left card | center node | right card */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 0,
        width: "100%",
      }}>
        {/* LEFT card: 用 AI */}
        <div style={{
          opacity: leftCardOp,
          fontFamily: "'Noto Sans TC', sans-serif",
          background: C.surface,
          border: `1px solid ${C.primaryBorder}`,
          borderRadius: 14 * S,
          padding: `${12 * S}px ${18 * S}px`,
          textAlign: "center" as const,
          minWidth: 200 * S,
        }}>
          <div style={{ fontSize: 44 * S, lineHeight: 1, marginBottom: 6 * S }}>🛠</div>
          <div style={{
            fontSize: 20 * S, color: C.primary, fontWeight: "700",
            letterSpacing: "0.04em",
          }}>用 AI</div>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, marginTop: 4 * S,
          }}>tools</div>
        </div>

        {/* Left path */}
        <div style={{
          width: leftPathW, height: 4 * S,
          background: `linear-gradient(to right, ${C.primary}, transparent)`,
          borderRadius: 2 * S, marginRight: -1 * S,
          boxShadow: `0 0 ${10 * S}px ${C.primary}66`,
        }} />

        {/* Center diamond node */}
        <div style={{
          transform: `rotate(45deg) scale(${nodeScale})`,
          width: 50 * S, height: 50 * S,
          background: C.bg,
          border: `${3 * S}px solid ${C.primary}`,
          boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.55)`,
          flexShrink: 0,
        }} />

        {/* Right path */}
        <div style={{
          width: rightPathW, height: 4 * S,
          background: `linear-gradient(to left, ${C.primary}, transparent)`,
          borderRadius: 2 * S, marginLeft: -1 * S,
          boxShadow: `0 0 ${10 * S}px ${C.primary}66`,
        }} />

        {/* RIGHT card: 懂 AI */}
        <div style={{
          opacity: rightCardOp,
          fontFamily: "'Noto Sans TC', sans-serif",
          background: C.surface,
          border: `1px solid ${C.primaryBorder}`,
          borderRadius: 14 * S,
          padding: `${12 * S}px ${18 * S}px`,
          textAlign: "center" as const,
          minWidth: 200 * S,
        }}>
          <div style={{ fontSize: 44 * S, lineHeight: 1, marginBottom: 6 * S }}>🧠</div>
          <div style={{
            fontSize: 20 * S, color: C.primary, fontWeight: "700",
            letterSpacing: "0.04em",
          }}>懂 AI</div>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, marginTop: 4 * S,
          }}>principles</div>
        </div>
      </div>
    </div>
  );
}

// 2. ToolListAnimation — Scene1 PA (right), triggerLocal=255 = 31s "ChatGPT"
// VTT-aligned tool reveals (delay relative to trigger):
//   ChatGPT (31s): f=0      | Midjourney (35.5s): f=135
//   Notion AI (39.5s): f=255 | Cursor (42.5s): f=345
// DURATION=540: covers until 49.5s (tool reveal + 7s buffer). Ends well before A_FADE_START=1120.
function ToolListAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 540;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const tools = [
    { icon: "🤖", name: "ChatGPT",     task: "寫行銷文案",   appearsAt:   0 },
    { icon: "🎨", name: "Midjourney",  task: "生成圖片",     appearsAt: 135 },
    { icon: "📝", name: "Notion AI",   task: "整理會議記錄", appearsAt: 255 },
    { icon: "💻", name: "Cursor",      task: "改程式",       appearsAt: 345 },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 12 * S,
      width: 280 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em", marginBottom: 4 * S,
      }}>常見 AI 工具</div>
      {tools.map((tool, i) => {
        const itemF = Math.max(0, f - tool.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [30 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const dotScale = easeOutBack(prog(itemF, 22));
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateX(${itemTx}px)`,
            display: "flex", alignItems: "center", gap: 12 * S,
            background: "rgba(0,0,0,0.82)",
            border: `1px solid ${C.primaryBorder}`,
            borderLeft: `3px solid ${C.primary}`,
            borderRadius: 12 * S,
            padding: `${10 * S}px ${14 * S}px`,
          }}>
            <div style={{
              width: 12 * S, height: 12 * S, borderRadius: "50%",
              background: C.primary,
              boxShadow: `0 0 ${8 * S}px ${C.primary}`,
              transform: `scale(${dotScale})`, flexShrink: 0,
            }} />
            <span style={{ fontSize: 26 * S, lineHeight: 1 }}>{tool.icon}</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 18 * S, color: C.primary, fontWeight: "700",
              }}>{tool.name}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 18 * S, color: C.muted, marginTop: 2 * S,
              }}>{tool.task}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 3. ToolReplacementAnimation — Scene1 PB (left), triggerLocal=1455 = 71s "AI工具更新速度非常快"
// VTT-aligned step reveals:
//   v1.0 → v2.0 (75s, "介面大改"): f=120
//   v2.0 → v3.0 (79s, "功能取代"):  f=240
//   v3.0 → ✕    (82.5s, "工具被取代"): f=345
//   "從零開始" label (90s): f=570
// DURATION=720: covers up to 95s = local 2175 (90s "從零開始" + 5s buffer)
function ToolReplacementAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 720;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Stages: each stage activates at appearsAt; once active, stays bright
  const stages = [
    { ver: "v1.0", label: "原版介面",     color: C.primary, appearsAt:   0 },
    { ver: "v2.0", label: "介面大改",     color: C.yellow,  appearsAt: 120 },
    { ver: "v3.0", label: "功能被取代",   color: C.yellow,  appearsAt: 240 },
    { ver: "v?",   label: "整個工具被取代", color: C.red,     appearsAt: 345 },
  ];

  // 從零開始 stamp at f=570
  const stampF = Math.max(0, f - 570);
  const stampOp = interpolate(stampF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const stampScale = easeOutBack(prog(stampF, 26));

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 160 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 10 * S,
      width: 280 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em", marginBottom: 4 * S,
      }}>tool churn</div>

      {stages.map((stage, i) => {
        const itemF = Math.max(0, f - stage.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTy = interpolate(itemF, [0, 22], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const isObsolete = i < stages.length - 1;
        // Once next stage appears, this one dims & gets struck through
        const nextStageF = i < stages.length - 1
          ? Math.max(0, f - stages[i + 1].appearsAt)
          : 0;
        const dimT = nextStageF > 0
          ? interpolate(nextStageF, [0, 24], [1, 0.32], { easing: E.outCubic, extrapolateRight: "clamp" })
          : 1;
        return (
          <div key={i} style={{
            opacity: itemOp * dimT,
            transform: `translateY(${itemTy}px)`,
            display: "flex", alignItems: "center", gap: 12 * S,
            background: "rgba(0,0,0,0.78)",
            border: `1px solid ${stage.color}44`,
            borderLeft: `3px solid ${stage.color}`,
            borderRadius: 10 * S,
            padding: `${9 * S}px ${14 * S}px`,
            position: "relative",
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 18 * S, color: stage.color, fontWeight: "700",
              minWidth: 50 * S,
              textDecoration: isObsolete && nextStageF > 8 ? "line-through" : "none",
            }}>{stage.ver}</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 18 * S, color: C.text,
              textDecoration: isObsolete && nextStageF > 8 ? "line-through" : "none",
            }}>{stage.label}</div>
          </div>
        );
      })}

      {/* Stamp: 從零開始 */}
      <div style={{
        opacity: stampOp,
        transform: `scale(${stampScale}) rotate(-6deg)`,
        marginTop: 8 * S, alignSelf: "center",
        fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
        color: C.red, fontWeight: "700",
        background: C.redLight,
        border: `${2 * S}px solid ${C.red}`,
        borderRadius: 8 * S,
        padding: `${8 * S}px ${16 * S}px`,
        letterSpacing: "0.08em",
        boxShadow: `0 0 ${16 * S}px rgba(255,107,107,0.4)`,
      }}>RESET → 0</div>
    </div>
  );
}

// 4. CompoundEffectAnimation — Scene2 PB (right), triggerLocal=1245 = 145.5s "當你懂了Token的概念"
// VTT-aligned reveals:
//   Brain "Token" core (145.5s):    f=0
//   Lines extend (148s):             f=75
//   ChatGPT/Claude/Gemini (148-156s): f=75/165/255
//   "通吃" label (160s):              f=435
// DURATION=600: covers up to 165.5s = local 1845 (162.5s "純學原理" + 3s buffer)
function CompoundEffectAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 600;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const brainScale = easeOutBack(prog(f, 24));
  const pulse = Math.sin(f * 0.06) * 0.08 + 0.92;

  const tools = [
    { name: "ChatGPT", appearsAt:  75 },
    { name: "Claude",  appearsAt: 165 },
    { name: "Gemini",  appearsAt: 255 },
  ];

  const labelF = Math.max(0, f - 435);
  const labelOp = interpolate(labelF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const labelTy = interpolate(labelF, [0, 22], [12 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 170 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 300 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>compound effect</div>

      {/* Brain core (Token concept) */}
      <div style={{
        transform: `scale(${brainScale * pulse})`,
        width: 110 * S, height: 110 * S, borderRadius: "50%",
        background: "rgba(124,255,178,0.14)",
        border: `${3 * S}px solid ${C.primary}`,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.5)`,
      }}>
        <div style={{ fontSize: 36 * S, lineHeight: 1 }}>🧠</div>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary, fontWeight: "700", marginTop: 2 * S,
          letterSpacing: "0.05em",
        }}>Token</div>
      </div>

      {/* Spreading lines (vertical descenders) and tool boxes */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 10 * S, width: "100%",
      }}>
        {tools.map((tool, i) => {
          const itemF = Math.max(0, f - tool.appearsAt);
          const lineH = interpolate(itemF, [0, 24], [0, 24 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
          const boxOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const boxScale = easeOutBack(prog(Math.max(0, itemF - 8), 22));
          return (
            <div key={i} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
            }}>
              {/* Vertical line */}
              <div style={{
                width: 2 * S, height: lineH,
                background: `linear-gradient(to bottom, ${C.primary}, rgba(124,255,178,0.3))`,
                boxShadow: `0 0 ${4 * S}px ${C.primary}66`,
              }} />
              {/* Tool box */}
              <div style={{
                opacity: boxOp,
                transform: `scale(${boxScale})`,
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.text, fontWeight: "700",
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
                letterSpacing: "0.04em",
              }}>{tool.name}</div>
            </div>
          );
        })}
      </div>

      {/* 通吃 label */}
      <div style={{
        opacity: labelOp,
        transform: `translateY(${labelTy}px)`,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.primary, fontWeight: "700",
        background: C.primaryLight,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
        letterSpacing: "0.05em",
        textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.6)`,
      }}>學一次，通吃多工具</div>
    </div>
  );
}

// 5. AdaptiveCoreAnimation — Scene3 PB (right), triggerLocal=1800 = 253s "從 AI 素養的角度來說"
// VTT-aligned reveals:
//   Core "適應力" (253s):              f=0
//   Tool ring start spinning (255.5s): f=75
//   Tool labels swap (258s, 261.5s):   passive (continuous spin)
//   "最值錢的能力" label (265.5s):      f=375
// DURATION=600: covers up to 273s = local 2400 (270.5s "最後一個問題" + buffer)
function AdaptiveCoreAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 600;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const coreScale = easeOutBack(prog(f, 26));
  const corePulse = Math.sin(f * 0.05) * 0.06 + 0.94;

  // Rotating ring of tools — angle continuously rotates
  const ringStart = 75;
  const ringF = Math.max(0, f - ringStart);
  const rotation = (ringF * 0.8) % 360;
  const ringOp = interpolate(ringF, [0, 24], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const orbitTools = [
    { icon: "🤖", angle:   0 },
    { icon: "🎨", angle:  60 },
    { icon: "📝", angle: 120 },
    { icon: "💻", angle: 180 },
    { icon: "🔍", angle: 240 },
    { icon: "📊", angle: 300 },
  ];

  const radius = 85 * S;
  const center = 110 * S;

  // 最值錢的能力 label
  const labelF = Math.max(0, f - 375);
  const labelOp = interpolate(labelF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const labelTy = interpolate(labelF, [0, 22], [12 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 30 * S, top: 170 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 280 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>adaptive core</div>

      {/* Orbit container */}
      <div style={{
        position: "relative", width: center * 2, height: center * 2,
      }}>
        {/* Orbit ring (visual circle) */}
        <div style={{
          position: "absolute",
          left: center - radius - 6 * S,
          top: center - radius - 6 * S,
          width: (radius + 6 * S) * 2, height: (radius + 6 * S) * 2,
          borderRadius: "50%",
          border: `${2 * S}px dashed rgba(124,255,178,0.22)`,
          opacity: ringOp,
        }} />

        {/* Center core */}
        <div style={{
          position: "absolute",
          left: center - 50 * S, top: center - 50 * S,
          width: 100 * S, height: 100 * S, borderRadius: "50%",
          background: "rgba(124,255,178,0.14)",
          border: `${3 * S}px solid ${C.primary}`,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 ${28 * S}px rgba(124,255,178,0.55)`,
          transform: `scale(${coreScale * corePulse})`,
        }}>
          <div style={{ fontSize: 30 * S, lineHeight: 1 }}>🧭</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.primary, fontWeight: "700", marginTop: 2 * S,
          }}>適應力</div>
        </div>

        {/* Orbiting tools */}
        {orbitTools.map((tool, i) => {
          const finalAngle = (tool.angle + rotation) * (Math.PI / 180);
          const x = center + Math.cos(finalAngle) * radius;
          const y = center + Math.sin(finalAngle) * radius;
          const stagger = i * 12;
          const toolF = Math.max(0, ringF - stagger);
          const toolOp = interpolate(toolF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const toolScale = easeOutBack(prog(toolF, 22));
          return (
            <div key={i} style={{
              position: "absolute",
              left: x - 20 * S, top: y - 20 * S,
              width: 40 * S, height: 40 * S, borderRadius: "50%",
              background: "rgba(0,0,0,0.85)",
              border: `1px solid ${C.primaryBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22 * S,
              opacity: toolOp,
              transform: `scale(${toolScale})`,
              boxShadow: `0 0 ${10 * S}px rgba(124,255,178,0.2)`,
            }}>{tool.icon}</div>
          );
        })}
      </div>

      {/* Label */}
      <div style={{
        opacity: labelOp,
        transform: `translateY(${labelTy}px)`,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
        color: C.primary, fontWeight: "700",
        background: C.primaryLight,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
        letterSpacing: "0.04em",
        textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.6)`,
      }}>最值錢的能力</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene (0–675) ─────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_04_30.title.to - SCENES_2026_04_30.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(50);
  const tagStyle = useFadeUp(70);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        paddingBottom: SUBTITLE_SAFE,
        paddingLeft: 80 * S, paddingRight: 80 * S,
        textAlign: "center",
      }}>
        {/* Badge */}
        <div style={{ ...badgeOp, marginBottom: 18 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
          }}>每日 AI 知識庫</span>
        </div>

        {/* H1 line 1 */}
        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 38 * S, color: C.text,
        }}>
          <WordReveal text="學 AI 工具，和學 AI 原理"
            startFrame={10} staggerPerWord={6}
            fontSize={38 * S} color={C.text}
            fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 — primary */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 38 * S, color: C.primary,
        }}>
          <WordReveal text="有什麼不同？"
            startFrame={28} staggerPerWord={6}
            fontSize={38 * S} color={C.primary}
            fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle,
          marginTop: 22 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
          maxWidth: 800 * S,
        }}>
          兩條學習路徑——一條快速有感，一條複利通吃。目的不同，效果也完全不一樣。
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 18 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>用 AI · 懂 AI · 適應能力</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation: TwoPathsAnimation at frame 150 */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <TwoPathsAnimation triggerFrame={150} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — 學 AI 工具 (675–3120) ─────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_30.scene1.to - SCENES_2026_04_30.scene1.from;
  // VTT-aligned local frames (scene starts at 22.5s = 675 global)
  // Phase A:
  //   Header        — 22.5s "第一段 學AI工具是什麼"           local 0
  //   Definition    — 26s   "學會操作特定的 AI 應用程式或功能" local 105
  //   Feature card  — 46.5s "快、有感、容易上手"               local 720
  // Phase B (transition at 62.5s "但工具型學習有一個天然的限制"):
  //   PB header     — 62.5s                                  local 1200
  //   Update warn   — 71s   "AI工具更新的速度非常快速"        local 1455
  //   Risk1 介面大改 — 75s                                    local 1575
  //   Risk2 功能取代 — 79s                                    local 1695
  //   Risk3 工具取代 — 82.5s                                  local 1800
  //   從零highlight  — 90s   "起點幾乎是從零"                  local 2025

  const HEADER_AT  = 0;
  const DEF_AT     = 105;
  const FEATURE_AT = 720;
  const TOOL_LIST_AT = 255; // ToolListAnimation: trigger when "ChatGPT" mentioned (31s)

  // Phase A → B
  const A_FADE_START = 1120;
  const A_REMOVE     = 1200;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT    = 1200;
  const PB_HEADER_AT = 1200;
  const UPDATE_AT    = 1455;
  const RISK1_AT     = 1575;
  const RISK2_AT     = 1695;
  const RISK3_AT     = 1800;
  const RESET_AT     = 2025;
  const TOOL_REPL_AT = 1455; // ToolReplacementAnimation
  const showB        = frame >= B_SHOW_AT;

  const headerStyle  = useFadeUp(HEADER_AT);
  const defStyle     = useFadeUp(DEF_AT);
  const featureStyle = useFadeUp(FEATURE_AT);
  const pbHeaderStyle = useFadeUp(showB ? PB_HEADER_AT : 999999);
  const updateStyle  = useFadeUp(showB ? UPDATE_AT  : 999999);
  const risk1Style   = useFadeUp(showB ? RISK1_AT   : 999999);
  const risk2Style   = useFadeUp(showB ? RISK2_AT   : 999999);
  const risk3Style   = useFadeUp(showB ? RISK3_AT   : 999999);
  const resetStyle   = useFadeUp(showB ? RESET_AT   : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Section header */}
            <div style={{ ...headerStyle, marginBottom: 20 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.12em",
                marginBottom: 8 * S,
              }}>第一段 / TOOLS</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 32 * S,
                color: C.text, fontWeight: 900, lineHeight: 1.2,
              }}>
                <WordReveal text="學 AI 工具是什麼？"
                  startFrame={HEADER_AT + 4} staggerPerWord={5}
                  fontSize={32 * S} color={C.text}
                  fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
              </div>
            </div>

            {/* Definition card */}
            <div style={{ ...defStyle, marginBottom: 20 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S,
                padding: `${18 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.06)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>定義</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, lineHeight: 1.6, fontWeight: 700,
                }}>學會操作特定的 AI 應用程式或功能。</div>
              </div>
            </div>

            {/* Feature highlight */}
            <div style={{ ...featureStyle }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>特點</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: 700, lineHeight: 1.4, marginBottom: 8 * S,
                }}>快、有感、容易上手</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>今天學，明天就能用在工作上 · 本週看到效率提升。對大多數人，是進入 AI 最直接的路徑。</div>
              </div>
            </div>
          </div>
        )}

        {showB && (
          <>
            {/* PB Header */}
            <div style={{ ...pbHeaderStyle, marginBottom: 18 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.12em",
                marginBottom: 8 * S,
              }}>但 / LIMITS</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 30 * S,
                color: C.text, fontWeight: 900, lineHeight: 1.25,
              }}>
                <WordReveal text="工具型學習有一個天然限制"
                  startFrame={PB_HEADER_AT + 4} staggerPerWord={5}
                  fontSize={30 * S} color={C.text}
                  fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
              </div>
            </div>

            {/* Update speed warning */}
            <div style={{ ...updateStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.yellow, fontWeight: 700, lineHeight: 1.4,
                }}>當工具改變，知識需要重新更新</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65, marginTop: 6 * S,
                }}>而 AI 工具更新的速度非常快——</div>
              </div>
            </div>

            {/* Risk 1 */}
            <div style={{ ...risk1Style, marginBottom: 12 * S }}>
              <div style={{
                background: "rgba(0,0,0,0.6)",
                border: `1px solid ${C.yellowBorder}`,
                borderLeft: `3px solid ${C.yellow}`,
                borderRadius: 10 * S,
                padding: `${12 * S}px ${18 * S}px`,
                display: "flex", alignItems: "flex-start", gap: 14 * S,
              }}>
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
                  color: C.yellow, fontWeight: 700, minWidth: 36 * S,
                }}>01</span>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.5,
                }}>三個月後，操作介面可能大改</div>
              </div>
            </div>

            {/* Risk 2 */}
            <div style={{ ...risk2Style, marginBottom: 12 * S }}>
              <div style={{
                background: "rgba(0,0,0,0.6)",
                border: `1px solid ${C.yellowBorder}`,
                borderLeft: `3px solid ${C.yellow}`,
                borderRadius: 10 * S,
                padding: `${12 * S}px ${18 * S}px`,
                display: "flex", alignItems: "flex-start", gap: 14 * S,
              }}>
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
                  color: C.yellow, fontWeight: 700, minWidth: 36 * S,
                }}>02</span>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.5,
                }}>某個功能被新功能取代</div>
              </div>
            </div>

            {/* Risk 3 */}
            <div style={{ ...risk3Style, marginBottom: 14 * S }}>
              <div style={{
                background: "rgba(0,0,0,0.6)",
                border: `1px solid ${C.redBorder}`,
                borderLeft: `3px solid ${C.red}`,
                borderRadius: 10 * S,
                padding: `${12 * S}px ${18 * S}px`,
                display: "flex", alignItems: "flex-start", gap: 14 * S,
              }}>
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
                  color: C.red, fontWeight: 700, minWidth: 36 * S,
                }}>03</span>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.5,
                }}>整個工具被另一個更強的工具取代</div>
              </div>
            </div>

            {/* Reset highlight */}
            <div style={{ ...resetStyle }}>
              <div style={{
                background: C.redLight,
                border: `1.5px solid ${C.red}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(255,107,107,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.red, fontWeight: 700, lineHeight: 1.4,
                }}>只會操作某一個工具 → 起點幾乎是從零</div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ToolListAnimation triggerLocalFrame={TOOL_LIST_AT} />
        <ToolReplacementAnimation triggerLocalFrame={TOOL_REPL_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — 學 AI 原理 (3120–5790) ────────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_30.scene2.to - SCENES_2026_04_30.scene2.from;
  // Scene starts at 104s. Local = global - 3120.
  // Phase A:
  //   Header     — 104s  "第二段 學AI原理又是什麼"      local 0
  //   Definition — 109.5s "學AI原理是理解AI背後怎麼運作的" local 165
  //   Token       — 116.5s "Token / 上下文視窗"           local 375
  //   Predict     — 123s   "下一字預測"                   local 570
  //   RAG         — 128s   "RAG"                          local 720
  //   Temperature — 131s   "Temperature"                  local 810
  //   Feature     — 137.5s "原理特點"                     local 1005
  // Phase B (transition at 145.5s "當你懂了Token的概念"):
  //   PB header   — 145.5s                                local 1245
  //   Bridge text — 145.5s "懂 Token 後 ChatGPT/Claude/Gemini 都通用" local 1245
  //   Highlight   — 160s   "學一次通吃多個工具和情境"     local 1680
  //   Caution     — 162.5s "純學原理不用工具也有問題"     local 1755
  //   Conclusion  — 174s   "理論若無實作接地"             local 2100

  const HEADER_AT     = 0;
  const DEF_AT        = 165;
  const TOKEN_AT      = 375;
  const PREDICT_AT    = 570;
  const RAG_AT        = 720;
  const TEMP_AT       = 810;
  const FEATURE_AT    = 1005;

  const A_FADE_START = 1165;
  const A_REMOVE     = 1245;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT    = 1245;
  const PB_HEADER_AT = 1245;
  const BRIDGE_AT    = 1245;
  const HIGHLIGHT_AT = 1680;
  const CAUTION_AT   = 1755;
  const CONCLUSION_AT = 2100;
  const COMPOUND_AT  = 1245; // CompoundEffectAnimation
  const showB        = frame >= B_SHOW_AT;

  const headerStyle   = useFadeUp(HEADER_AT);
  const defStyle      = useFadeUp(DEF_AT);
  const tokenStyle    = useFadeUp(TOKEN_AT);
  const predictStyle  = useFadeUp(PREDICT_AT);
  const ragStyle      = useFadeUp(RAG_AT);
  const tempStyle     = useFadeUp(TEMP_AT);
  const featureStyle  = useFadeUp(FEATURE_AT);
  const pbHeaderStyle = useFadeUp(showB ? PB_HEADER_AT : 999999);
  const bridgeStyle   = useFadeUp(showB ? BRIDGE_AT    : 999999);
  const highlightStyle = useFadeUp(showB ? HIGHLIGHT_AT : 999999);
  const cautionStyle  = useFadeUp(showB ? CAUTION_AT   : 999999);
  const conclusionStyle = useFadeUp(showB ? CONCLUSION_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Section header */}
            <div style={{ ...headerStyle, marginBottom: 18 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.12em",
                marginBottom: 8 * S,
              }}>第二段 / PRINCIPLES</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 32 * S,
                color: C.text, fontWeight: 900, lineHeight: 1.2,
              }}>
                <WordReveal text="學 AI 原理又是什麼？"
                  startFrame={HEADER_AT + 4} staggerPerWord={5}
                  fontSize={32 * S} color={C.text}
                  fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
              </div>
            </div>

            {/* Definition */}
            <div style={{ ...defStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>定義</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, lineHeight: 1.55, fontWeight: 700,
                }}>理解 AI 背後怎麼運作的。</div>
              </div>
            </div>

            {/* 4 principle examples — each appears at VTT mention */}
            <PrincipleCard style={tokenStyle}   icon="🔡" title="Token / 上下文視窗" outcome="知道為什麼 AI 有字數限制" />
            <PrincipleCard style={predictStyle} icon="🎲" title="下一字預測"          outcome="知道為什麼它會幻覺" />
            <PrincipleCard style={ragStyle}     icon="📚" title="RAG 機制"             outcome="知道什麼時候該用它" />
            <PrincipleCard style={tempStyle}    icon="🌡" title="Temperature 參數"     outcome="能根據需求調整創意度" />

            {/* Feature highlight */}
            <div style={{ ...featureStyle, marginTop: 12 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.primary, fontWeight: 700, lineHeight: 1.5,
                }}>一開始硬，但學到後對每個工具的理解都會更深</div>
              </div>
            </div>
          </div>
        )}

        {showB && (
          <>
            {/* PB Header */}
            <div style={{ ...pbHeaderStyle, marginBottom: 16 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.12em",
                marginBottom: 8 * S,
              }}>原理的 / COMPOUND EFFECT</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 30 * S,
                color: C.text, fontWeight: 900, lineHeight: 1.25,
              }}>
                <WordReveal text="原理學習的複利效應"
                  startFrame={PB_HEADER_AT + 4} staggerPerWord={5}
                  fontSize={30 * S} color={C.text}
                  fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
              </div>
            </div>

            {/* Bridge example */}
            <div style={{ ...bridgeStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.65,
                }}>
                  懂了 <span style={{ color: C.primary, fontWeight: 700 }}>Token</span> 的概念，
                  不管 ChatGPT、Claude、Gemini，你都知道為什麼有時候會被截斷——
                  <span style={{ color: C.muted }}> 不需要每個工具重新學一遍。</span>
                </div>
              </div>
            </div>

            {/* Highlight */}
            <div style={{ ...highlightStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${22 * S}px rgba(124,255,178,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                  color: C.primary, fontWeight: 700, lineHeight: 1.4,
                }}>學一次，通吃多個工具和情境</div>
              </div>
            </div>

            {/* Caution */}
            <div style={{ ...cautionStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>⚠ 但純學原理也有問題</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55,
                }}>你可能懂很多，但做不了什麼。</div>
              </div>
            </div>

            {/* Conclusion */}
            <div style={{ ...conclusionStyle }}>
              <div style={{
                background: "rgba(0,0,0,0.6)",
                border: `1px solid ${C.surfaceBorder}`,
                borderLeft: `3px solid ${C.muted}`,
                borderRadius: 10 * S,
                padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>理論若沒有實作接地——很容易只是 <span style={{ color: C.yellow, fontWeight: 700 }}>知識</span>，不是 <span style={{ color: C.primary, fontWeight: 700 }}>能力</span>。</div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <CompoundEffectAnimation triggerLocalFrame={COMPOUND_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

function PrincipleCard({ style, icon, title, outcome }: {
  style: React.CSSProperties; icon: string; title: string; outcome: string;
}) {
  return (
    <div style={{ ...style, marginBottom: 10 * S }}>
      <div style={{
        background: "rgba(0,0,0,0.6)",
        border: `1px solid ${C.primaryBorder}`,
        borderLeft: `3px solid ${C.primary}`,
        borderRadius: 10 * S,
        padding: `${10 * S}px ${16 * S}px`,
        display: "flex", alignItems: "center", gap: 14 * S,
      }}>
        <span style={{ fontSize: 24 * S, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 * S }}>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
            color: C.primary, fontWeight: 700, lineHeight: 1.3,
          }}>{title}</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.muted, lineHeight: 1.5,
          }}>→ {outcome}</span>
        </div>
      </div>
    </div>
  );
}

// ── Scene3 — 兩個都要 (5790–8430) ──────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_30.scene3.to - SCENES_2026_04_30.scene3.from;
  // Scene starts at 193s. Local = global - 5790.
  // Phase A:
  //   Header   — 193s  "第三 兩個都要 但比例因人而異"          local 0
  //   Sub      — 197s  "這不是只能選一個 是比例怎麼配"         local 120
  //   Persona1 — 202s  "如果你是剛開始接觸AI的人 → 先工具"      local 270
  //   Persona2 — 221s  "如果你已經用了一段時間 → 補原理"        local 840
  //   Persona3 — 241.5s "如果工作和AI深度相關 → 兩條線並進"     local 1455
  // Phase B (transition at 253s "從 AI 素養的角度來說"):
  //   PB header — 253s                                         local 1800
  //   Quote 1   — 255.5s "重要的不是你學了什麼"                local 1875
  //   Quote 2   — 258s   "而是工具改變時"                       local 1950
  //   Pillars   — 261.5s "怎麼選 / 怎麼用 / 為什麼用"            local 2055
  //   Highlight — 265.5s "適應能力 = 最值錢的能力"              local 2175

  const HEADER_AT   = 0;
  const SUB_AT      = 120;
  const PERSONA1_AT = 270;
  const PERSONA2_AT = 840;
  const PERSONA3_AT = 1455;

  const A_FADE_START = 1720;
  const A_REMOVE     = 1800;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT     = 1800;
  const PB_HEADER_AT  = 1800;
  const QUOTE1_AT     = 1875;
  const QUOTE2_AT     = 1950;
  const PILLARS_AT    = 2055;
  const HIGHLIGHT_AT  = 2175;
  const ADAPTIVE_AT   = 1800; // AdaptiveCoreAnimation
  const showB         = frame >= B_SHOW_AT;

  const headerStyle  = useFadeUp(HEADER_AT);
  const subStyle     = useFadeUp(SUB_AT);
  const persona1Style = useFadeUp(PERSONA1_AT);
  const persona2Style = useFadeUp(PERSONA2_AT);
  const persona3Style = useFadeUp(PERSONA3_AT);
  const pbHeaderStyle = useFadeUp(showB ? PB_HEADER_AT : 999999);
  const quote1Style  = useFadeUp(showB ? QUOTE1_AT : 999999);
  const quote2Style  = useFadeUp(showB ? QUOTE2_AT : 999999);
  const pillarsStyle = useFadeUp(showB ? PILLARS_AT : 999999);
  const highlightStyle = useFadeUp(showB ? HIGHLIGHT_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Section header */}
            <div style={{ ...headerStyle, marginBottom: 14 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.12em",
                marginBottom: 8 * S,
              }}>第三段 / RATIO</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 30 * S,
                color: C.text, fontWeight: 900, lineHeight: 1.25,
              }}>
                <WordReveal text="兩個都要，但比例因人而異"
                  startFrame={HEADER_AT + 4} staggerPerWord={5}
                  fontSize={30 * S} color={C.text}
                  fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
              </div>
            </div>

            {/* Sub statement */}
            <div style={{ ...subStyle, marginBottom: 18 * S }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                color: C.muted, lineHeight: 1.6,
              }}>不是「只能選一個」，而是「比例怎麼配」。</div>
            </div>

            {/* Persona 1 */}
            <PersonaCard style={persona1Style}
              tag="新手" tagColor={C.primary}
              when="剛開始接觸 AI"
              advice="先從工具下手"
              detail="選一個工作上最常需要的場景，找對應工具用到順手。" />

            {/* Persona 2 */}
            <PersonaCard style={persona2Style}
              tag="瓶頸期" tagColor={C.yellow}
              when="用了一段時間，進步遇到瓶頸"
              advice="補原理特別有效"
              detail="會突然發現過去的「奇怪問題」都有原理層面的解釋。" />

            {/* Persona 3 */}
            <PersonaCard style={persona3Style}
              tag="深度使用者" tagColor={C.primary}
              when="工作和 AI 深度相關"
              advice="兩條線同時推進"
              detail="工具讓你保持實戰感，原理讓你在快速變化中保持判斷力。" />
          </div>
        )}

        {showB && (
          <>
            {/* PB Header */}
            <div style={{ ...pbHeaderStyle, marginBottom: 16 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.12em",
                marginBottom: 8 * S,
              }}>AI LITERACY</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 30 * S,
                color: C.text, fontWeight: 900, lineHeight: 1.25,
              }}>
                <WordReveal text="AI 素養的核心"
                  startFrame={PB_HEADER_AT + 4} staggerPerWord={5}
                  fontSize={30 * S} color={C.text}
                  fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
              </div>
            </div>

            {/* Quote 1 */}
            <div style={{ ...quote1Style, marginBottom: 8 * S }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.muted, lineHeight: 1.55,
              }}>重要的不是<span style={{ color: C.text }}>「你學了什麼」</span>——</div>
            </div>

            {/* Quote 2 */}
            <div style={{ ...quote2Style, marginBottom: 16 * S }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: 700, lineHeight: 1.55,
              }}>而是工具改變時，你還能不能<span style={{ color: C.primary }}>知道怎麼選、怎麼用、為什麼用</span>。</div>
            </div>

            {/* 3 Pillars */}
            <div style={{ ...pillarsStyle, marginBottom: 16 * S }}>
              <div style={{
                display: "flex", gap: 10 * S, flexWrap: "wrap" as const,
              }}>
                {["怎麼選", "怎麼用", "為什麼用"].map((p, i) => (
                  <div key={i} style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
                    color: C.primary, fontWeight: 700,
                    background: C.primaryLight,
                    border: `1px solid ${C.primaryBorder}`,
                    borderRadius: 8 * S, padding: `${8 * S}px ${14 * S}px`,
                    letterSpacing: "0.04em",
                  }}>{p}</div>
                ))}
              </div>
            </div>

            {/* Highlight */}
            <div style={{ ...highlightStyle }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${22 * S}px rgba(124,255,178,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: 700, lineHeight: 1.45,
                }}>那種<span style={{
                  textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.6)`,
                }}>適應能力</span>，才是 AI 時代最值錢的能力。</div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <AdaptiveCoreAnimation triggerLocalFrame={ADAPTIVE_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

function PersonaCard({ style, tag, tagColor, when, advice, detail }: {
  style: React.CSSProperties; tag: string; tagColor: string;
  when: string; advice: string; detail: string;
}) {
  return (
    <div style={{ ...style, marginBottom: 12 * S }}>
      <div style={{
        background: "rgba(0,0,0,0.65)",
        border: `1px solid ${tagColor}33`,
        borderLeft: `3px solid ${tagColor}`,
        borderRadius: 10 * S,
        padding: `${12 * S}px ${18 * S}px`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 6 * S,
        }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: tagColor, fontWeight: 700, letterSpacing: "0.06em",
            background: `${tagColor}1a`,
            border: `1px solid ${tagColor}55`,
            borderRadius: 6 * S, padding: `${3 * S}px ${10 * S}px`,
          }}>{tag}</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.muted,
          }}>{when}</span>
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
          color: C.text, fontWeight: 700, lineHeight: 1.35, marginBottom: 4 * S,
        }}>→ {advice}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, lineHeight: 1.55,
        }}>{detail}</div>
      </div>
    </div>
  );
}

// ── SummaryScene (8430–9450) ───────────────────────────────────────────────
function SummaryCard({ number, title, body, delay, color }: {
  number: string; title: string; body: string; delay: number; color: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div style={{
        display: "flex", gap: 16 * S, alignItems: "flex-start",
        background: `${color}12`,
        border: `1px solid ${color}55`,
        borderRadius: 14 * S,
        padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 28 * S,
          color, fontWeight: 700, flexShrink: 0,
          textShadow: `0 0 ${10 * S}px ${color}88`, lineHeight: 1,
        }}>{number}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 * S }}>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
            color, fontWeight: 700, lineHeight: 1.3,
          }}>{title}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.text, lineHeight: 1.6,
          }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_04_30.summary.to - SCENES_2026_04_30.summary.from;
  // Summary starts at 281s. Local = global - 8430.
  //   Badge        — 281s    local 0
  //   Card 1 學工具 — 283s    local 60
  //   Card 2 學原理 — 291s    local 300
  //   Card 3 怎麼選 — 298s    local 510
  //   Outro         — 307.5s  local 795

  const BADGE_AT  = 0;
  const CARD1_AT  = 60;
  const CARD2_AT  = 300;
  const CARD3_AT  = 510;
  const OUTRO_AT  = 795;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{ ...badgeStyle, marginBottom: 18 * S, marginTop: 24 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
          }}>
            <WordReveal text="重點整理" startFrame={4} staggerPerWord={5}
              fontSize={18 * S} color={C.primary}
              fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
          </span>
        </div>

        <SummaryCard
          number="01" delay={CARD1_AT} color={C.primary}
          title="學工具：快速有感"
          body="今天學，明天就能用。但工具改變時，需要重新學。"
        />
        <SummaryCard
          number="02" delay={CARD2_AT} color={C.primary}
          title="學原理：複利效應"
          body="一開始較難，但學一次，通吃多個工具與情境。"
        />
        <SummaryCard
          number="03" delay={CARD3_AT} color={C.yellow}
          title="怎麼選：因階段而異"
          body="初學者先工具，有基礎後補原理，深度使用者兩者並進。"
        />

        {/* Outro */}
        <div style={{ ...outroStyle, marginTop: 14 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em", textAlign: "center" as const,
          }}>每日 AI 知識庫</div>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Composition ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export function VideoComposition_2026_04_30() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_04_30.scene1;
  const S2 = SCENES_2026_04_30.scene2;
  const S3 = SCENES_2026_04_30.scene3;
  const SU = SCENES_2026_04_30.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-30-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_04_30 - 150, TOTAL_FRAMES_2026_04_30],
            [v, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          return Math.min(fi, fo);
        }}
        loop
      />

      <Background />

      <Sequence from={0} durationInFrames={S1.from}>
        <TitleScene />
      </Sequence>

      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      <Sequence from={S3.from} durationInFrames={S3.to - S3.from}>
        <Scene3 />
      </Sequence>

      <Sequence from={SU.from} durationInFrames={SU.to - SU.from}>
        <SummaryScene />
      </Sequence>

      <ProgressBar globalFrame={frame} />
      <IMessageOverlay globalFrame={frame} />
    </AbsoluteFill>
  );
}
