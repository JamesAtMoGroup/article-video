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
const W = 1280 * S;  // 3840
const H = 720  * S;  // 2160
const NAV_H         = 50  * S;  // 150px
const CONTAINER_W   = 640 * S;  // 1920px
const COL_LEFT      = (W - CONTAINER_W) / 2;  // 960px
const SUBTITLE_SAFE = 120 * S;  // 360px
const CONTENT_GAP   = 10  * S;  // 30px
const CONTENT_TOP   = NAV_H + CONTENT_GAP;             // 180px
const CONTENT_H     = H - CONTENT_TOP - SUBTITLE_SAFE; // 1620px

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:            "#000000",
  surface:       "#0d0d0d",
  surfaceBorder: "rgba(255,255,255,0.08)",
  primary:       "#7cffb2",
  primaryLight:  "rgba(124,255,178,0.07)",
  primaryBorder: "rgba(124,255,178,0.14)",
  text:          "#ffffff",
  muted:         "#888888",
  yellow:        "#ffd166",
  yellowLight:   "rgba(255,209,102,0.1)",
  yellowBorder:  "rgba(255,209,102,0.25)",
  red:           "#ff6b6b",
  redLight:      "rgba(255,107,107,0.08)",
  redBorder:     "rgba(255,107,107,0.25)",
  blue:          "#74b9ff",
  blueLight:     "rgba(116,185,255,0.1)",
  blueBorder:    "rgba(116,185,255,0.25)",
  purple:        "#b794f6",
  purpleLight:   "rgba(183,148,246,0.1)",
  purpleBorder:  "rgba(183,148,246,0.25)",
} as const;

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W       = 400 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLOT    = 200 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// TitleScene:   0       – 24.76s   → 0–743    (intro)
// Scene1:       24.76s  – 74.36s   → 743–2231 (基本定義: PE / FT)
// Scene2:       74.36s  – 176.64s  → 2231–5299 (成本 + 三情境 + 天花板)
// Scene3:       176.64s – 245.64s  → 5299–7369 (判斷框架 + 災難性遺忘)
// Summary:      245.64s – 282s     → 7369–8460
export const SCENES_2026_05_13 = {
  title:   { from: 0,    to: 743  },
  scene1:  { from: 743,  to: 2231 },
  scene2:  { from: 2231, to: 5299 },
  scene3:  { from: 5299, to: 7369 },
  summary: { from: 7369, to: 8460 },
} as const;
export const TOTAL_FRAMES_2026_05_13 = 8460;

const CHAPTERS = [
  { label: "今日焦點",     start: 0    },
  { label: "基本定義",     start: 743  },
  { label: "成本與場景",   start: 2231 },
  { label: "判斷與代價",   start: 5299 },
  { label: "重點整理",     start: 7369 },
] as const;

// ── iMessage callouts (global frames, VTT-aligned) ────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene1 Phase B reflection: 01:02.08 – 01:10.52 → 1862–2115
  { from: 1862, to: 2210, sender: "想一想",
    text: "你現在碰到 AI 回答不夠好的問題，是因為「問得不夠清楚」，還是「模型根本不懂這個領域」？" },
  // Scene2 Phase C reflection: 02:47.08 – 02:56.64 → 5012–5290
  { from: 5012, to: 5290, sender: "親身經歷",
    text: "你現在遇到的 AI 問題，是「問法不夠好」，還是「模型根本沒有這方面的知識」？" },
  // Scene3 Phase B reflection: 03:52.44 – 04:05.64 → 6973–7340
  { from: 6973, to: 7340, sender: "動腦時間",
    text: "如果你能讓一個 AI 模型「專精」某件事，你會希望它專精什麼？這件事靠寫清楚說明就能做到，還是需要大量訓練資料？" },
];

// ── Easing tokens ─────────────────────────────────────────────────────────
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
  const op = interpolate(f, [0, 14], [0, 1],      { easing: E.outCubic, extrapolateRight: "clamp" });
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
        const op = interpolate(f, [0, 12], [0, 1],      { easing: E.outCubic, extrapolateRight: "clamp" });
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
        background: "radial-gradient(circle, rgba(183,148,246,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: 500 * S, height: 500 * S, bottom: 100 * S, left: 300 * S,
        background: "radial-gradient(circle, rgba(255,209,102,0.05) 0%, transparent 70%)",
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

// ── iMessage Callout system ────────────────────────────────────────────────
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
      padding: `${16 * S}px ${20 * S}px`,
      boxShadow: `0 ${8 * S}px ${24 * S}px rgba(0,0,0,0.6)`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 10 * S,
      }}>
        <div style={{
          width: 12 * S, height: 12 * S, borderRadius: "50%", background: C.primary,
          boxShadow: `0 0 ${6 * S}px ${C.primary}`,
        }} />
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary,
          letterSpacing: "0.05em",
        }}>{callout.sender}</span>
      </div>
      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text,
        lineHeight: 1.5,
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
// ── Concept Animations ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// 1. VsAnimation — TitleScene (right side)
// Trigger: 200 (≈6.67s). DURATION: 530.
function VsAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 530;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const leftScale  = easeOutBack(prog(f, 22));
  const rightScale = easeOutBack(prog(Math.max(0, f - 12), 22));
  const vsScale    = easeOutBack(prog(Math.max(0, f - 30), 18));
  const vsPulse    = 0.92 + Math.sin(f * 0.12) * 0.08;

  return (
    <div style={{
      position: "absolute", right: 80 * S, top: 240 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", alignItems: "center", gap: 16 * S,
    }}>
      {/* Left box: Prompt */}
      <div style={{
        transform: `scale(${leftScale})`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
        width: 200 * S,
        background: C.primaryLight, border: `2px solid ${C.primary}`,
        borderRadius: 16 * S, padding: `${18 * S}px ${14 * S}px`,
        boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.3)`,
      }}>
        <div style={{ fontSize: 42 * S }}>💬</div>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary, fontWeight: 700, letterSpacing: "0.04em",
          textAlign: "center" as const,
        }}>Prompt</div>
      </div>

      {/* VS */}
      <div style={{
        transform: `scale(${vsScale * vsPulse})`,
        fontFamily: "'Space Mono', monospace", fontSize: 32 * S,
        fontWeight: 700, color: C.yellow,
        textShadow: `0 0 ${14 * S}px rgba(255,209,102,0.7)`,
      }}>VS</div>

      {/* Right box: Fine-tuning */}
      <div style={{
        transform: `scale(${rightScale})`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
        width: 200 * S,
        background: C.purpleLight, border: `2px solid ${C.purple}`,
        borderRadius: 16 * S, padding: `${18 * S}px ${14 * S}px`,
        boxShadow: `0 0 ${24 * S}px rgba(183,148,246,0.3)`,
      }}>
        <div style={{ fontSize: 42 * S }}>⚙️</div>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.purple, fontWeight: 700, letterSpacing: "0.04em",
          textAlign: "center" as const,
        }}>Fine-tune</div>
      </div>
    </div>
  );
}

// 2. OutsideAdjustAnimation — Scene1 Phase A (right side)
// Trigger: local 51. DURATION: 650. Concept: model is sealed; prompt nudges from outside.
function OutsideAdjustAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 650;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const boxScale = easeOutBack(prog(f, 24));
  const lockPulse = 0.88 + Math.sin(f * 0.07) * 0.12;

  const hints = [
    { label: "繁體中文", color: C.primary, appearsAt: 100 },
    { label: "JSON 格式", color: C.yellow,  appearsAt: 200 },
    { label: "Step-by-step", color: C.blue, appearsAt: 320 },
  ];

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S,
      width: 280 * S,
    }}>
      {/* Sealed Model box with lock */}
      <div style={{
        position: "relative", transform: `scale(${boxScale})`,
        width: 220 * S, height: 130 * S,
        background: "rgba(255,255,255,0.04)",
        border: `2px solid ${C.muted}`,
        borderRadius: 14 * S,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `inset 0 0 ${20 * S}px rgba(255,255,255,0.04)`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
          color: C.text, fontWeight: 700, letterSpacing: "0.08em",
        }}>MODEL</div>
        {/* Lock badge */}
        <div style={{
          position: "absolute", top: -16 * S, right: -16 * S,
          width: 44 * S, height: 44 * S, borderRadius: "50%",
          background: "rgba(255,107,107,0.15)", border: `2px solid ${C.red}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22 * S,
          opacity: lockPulse,
          boxShadow: `0 0 ${12 * S}px rgba(255,107,107,0.4)`,
        }}>🔒</div>
      </div>

      {/* Hints floating outside */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 * S, alignItems: "center" }}>
        {hints.map((h, i) => {
          const itemF = Math.max(0, f - h.appearsAt);
          const itemOp = interpolate(itemF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemTy = interpolate(itemF, [0, 20], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          const orbit  = Math.sin((f - h.appearsAt) * 0.05 + i) * 4 * S;
          return (
            <div key={i} style={{
              opacity: itemOp,
              transform: `translate(${orbit}px, ${itemTy}px)`,
              display: "flex", alignItems: "center", gap: 10 * S,
              background: "rgba(0,0,0,0.85)",
              border: `1px solid ${h.color}55`,
              borderRadius: 24 * S, padding: `${8 * S}px ${16 * S}px`,
            }}>
              <span style={{ fontSize: 18 * S, color: h.color }}>►</span>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: h.color, letterSpacing: "0.04em", fontWeight: 700,
                whiteSpace: "nowrap" as const,
              }}>{h.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 3. InsideModifyAnimation — Scene1 Phase B (left side)
// Trigger: local 701. DURATION: 350. Concept: open model, modify parameters.
function InsideModifyAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 350;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const boxScale = easeOutBack(prog(f, 22));
  const wrenchSpin = (f * 2) % 360;

  // 12 parameter nodes inside the model
  const nodes = Array.from({ length: 12 }).map((_, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const appearsAt = 30 + i * 12;
    return { col, row, appearsAt };
  });

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
      width: 280 * S,
    }}>
      {/* Open model box with internal parameter grid */}
      <div style={{
        position: "relative", transform: `scale(${boxScale})`,
        width: 240 * S, height: 160 * S,
        background: C.primaryLight,
        border: `2px solid ${C.primary}`,
        borderTop: `2px dashed ${C.primary}`,
        borderRadius: 14 * S,
        padding: `${18 * S}px ${22 * S}px`,
        display: "flex", flexDirection: "column", gap: 8 * S,
        boxShadow: `inset 0 0 ${20 * S}px rgba(124,255,178,0.12)`,
      }}>
        {/* Header */}
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary, fontWeight: 700, letterSpacing: "0.08em",
          textAlign: "center" as const,
        }}>MODEL · OPEN</div>
        {/* Parameter grid */}
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "repeat(3, 1fr)",
          gap: 6 * S,
          alignItems: "center", justifyItems: "center",
        }}>
          {nodes.map((node, i) => {
            const nodeF = Math.max(0, f - node.appearsAt);
            const scale = easeOutBack(prog(nodeF, 18));
            const pulse = 0.6 + Math.sin((f + i * 8) * 0.12) * 0.4;
            return (
              <div key={i} style={{
                width: 14 * S, height: 14 * S, borderRadius: "50%",
                background: C.primary,
                transform: `scale(${scale})`,
                opacity: pulse,
                boxShadow: `0 0 ${6 * S}px ${C.primary}`,
              }} />
            );
          })}
        </div>
        {/* Wrench badge */}
        <div style={{
          position: "absolute", top: -16 * S, right: -16 * S,
          width: 44 * S, height: 44 * S, borderRadius: "50%",
          background: C.primaryLight, border: `2px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22 * S,
          transform: `rotate(${wrenchSpin}deg)`,
          boxShadow: `0 0 ${12 * S}px rgba(124,255,178,0.5)`,
        }}>🔧</div>
      </div>

      {/* Label */}
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, fontWeight: 700, letterSpacing: "0.08em",
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S, padding: `${8 * S}px ${16 * S}px`,
      }}>從模型「裡面」改</div>
    </div>
  );
}

// 4. WastedTimeAnimation — Scene2 Phase A (left side)
// Trigger: local 174. DURATION: 380. Concept: FT cost — clock + $ + ✕.
function WastedTimeAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 380;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const clockScale = easeOutBack(prog(f, 22));
  const handAngle = (f * 6) % 360;

  const costs = [
    { icon: "📦", label: "資料",   appearsAt:  60 },
    { icon: "💰", label: "算力",   appearsAt: 140 },
    { icon: "🔧", label: "技術",   appearsAt: 220 },
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 240 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
      width: 240 * S,
    }}>
      {/* Spinning clock */}
      <div style={{
        position: "relative",
        width: 110 * S, height: 110 * S, borderRadius: "50%",
        background: "rgba(255,107,107,0.1)",
        border: `3px solid ${C.red}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${clockScale})`,
        boxShadow: `0 0 ${20 * S}px rgba(255,107,107,0.3)`,
      }}>
        {/* Clock hand */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 4 * S, height: 40 * S,
          background: C.red,
          transformOrigin: "50% 100%",
          transform: `translate(-50%, -100%) rotate(${handAngle}deg)`,
          borderRadius: 2 * S,
        }} />
        <div style={{
          width: 8 * S, height: 8 * S, borderRadius: "50%",
          background: C.red, zIndex: 1,
        }} />
      </div>

      {/* Costs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S, alignItems: "stretch", width: "100%" }}>
        {costs.map((cost, i) => {
          const itemF = Math.max(0, f - cost.appearsAt);
          const itemOp = interpolate(itemF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemTx = interpolate(itemF, [0, 20], [-20 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: itemOp,
              transform: `translateX(${itemTx}px)`,
              display: "flex", alignItems: "center", gap: 12 * S,
              background: "rgba(255,107,107,0.06)",
              border: `1px solid ${C.redBorder}`,
              borderLeft: `4px solid ${C.red}`,
              borderRadius: 10 * S,
              padding: `${10 * S}px ${14 * S}px`,
            }}>
              <span style={{ fontSize: 22 * S }}>{cost.icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                color: C.text, fontWeight: 700,
              }}>{cost.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 5. ThreeScenariosAnimation — Scene2 Phase B (right side)
// Trigger: local 1009. DURATION: 900.
// Items aligned to VTT: 第一 (local 1009, offset 0), 第二 (local 1345, offset 336), 第三 (local 1775, offset 766).
function ThreeScenariosAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 900;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const items = [
    { icon: "🎨", label: "風格一致",   sub: "品牌語氣",  color: C.primary, appearsAt:   0 },
    { icon: "🏥", label: "專業領域",   sub: "醫療/法律", color: C.yellow,  appearsAt: 336 },
    { icon: "🔁", label: "重複任務",   sub: "效率優先",  color: C.blue,    appearsAt: 766 },
  ];

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
      width: 240 * S,
    }}>
      {items.map((item, i) => {
        const itemF = Math.max(0, f - item.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [40 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const iconScale = easeOutBack(prog(itemF, 22));
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateX(${itemTx}px)`,
            background: "rgba(0,0,0,0.82)",
            border: `1px solid ${item.color}55`,
            borderLeft: `4px solid ${item.color}`,
            borderRadius: 12 * S,
            padding: `${12 * S}px ${16 * S}px`,
            display: "flex", alignItems: "center", gap: 14 * S,
            boxShadow: `0 0 ${14 * S}px ${item.color}22`,
          }}>
            <span style={{
              fontSize: 32 * S,
              transform: `scale(${iconScale})`,
              flexShrink: 0,
            }}>{item.icon}</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 22 * S, color: item.color, fontWeight: 700,
                lineHeight: 1.2,
              }}>{item.label}</div>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 18 * S, color: C.muted, marginTop: 4 * S,
                letterSpacing: "0.04em",
              }}>{item.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 6. CeilingAnimation — Scene2 Phase C (left side)
// Trigger: local 2187. DURATION: 870. Concept: bars climbing toward ceiling.
// Techniques appear at VTT: 角色設定 (offset 0), Few-shot (~+106), CoT (~+212).
function CeilingAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 870;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Bars rise from bottom; ceiling line stays at top.
  const bars = [
    { label: "角色設定",       short: "Role",     appearsAt: 450, h: 120 },
    { label: "Few-shot",       short: "Few-shot", appearsAt: 555, h: 165 },
    { label: "Chain of Thought", short: "CoT",    appearsAt: 615, h: 205 },
  ];

  const ceilingOp = interpolate(f, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
      width: 280 * S,
    }}>
      {/* Ceiling label */}
      <div style={{
        opacity: ceilingOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.yellow, letterSpacing: "0.06em", fontWeight: 700,
      }}>↑ 天花板</div>

      {/* Ceiling line */}
      <div style={{
        opacity: ceilingOp,
        width: "100%", height: 3 * S,
        background: C.yellow,
        boxShadow: `0 0 ${10 * S}px rgba(255,209,102,0.6)`,
      }} />

      {/* Bars */}
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-around",
        gap: 14 * S, width: "100%", height: 230 * S,
        paddingTop: 8 * S,
      }}>
        {bars.map((bar, i) => {
          const barF = Math.max(0, f - bar.appearsAt);
          const barH = interpolate(barF, [0, 30], [0, bar.h * S], { easing: E.outExpo, extrapolateRight: "clamp" });
          const labelOp = interpolate(barF, [10, 30], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              flex: 1, height: "100%",
              justifyContent: "flex-end",
            }}>
              <div style={{
                opacity: labelOp,
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, fontWeight: 700, marginBottom: 4 * S,
                letterSpacing: "0.04em",
              }}>{bar.short}</div>
              <div style={{
                width: 60 * S, height: barH,
                background: `linear-gradient(to top, ${C.primary}88, ${C.primary})`,
                borderTopLeftRadius: 6 * S, borderTopRightRadius: 6 * S,
                boxShadow: `0 0 ${10 * S}px rgba(124,255,178,0.45)`,
              }} />
            </div>
          );
        })}
      </div>

      {/* Floor line */}
      <div style={{
        width: "100%", height: 2 * S,
        background: C.muted,
        opacity: 0.5,
      }} />
    </div>
  );
}

// 7. DecisionFrameworkAnimation — Scene3 Phase A (right side)
// Trigger: local 131. DURATION: 1020.
// Branches: Yes (offset 228), No-knowledge (offset 361), No-style (offset 767).
function DecisionFrameworkAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1020;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const qScale = easeOutBack(prog(f, 22));

  const branches = [
    { icon: "✓",  label: "Prompt",   color: C.primary, appearsAt: 228 },
    { icon: "📚", label: "RAG",      color: C.blue,    appearsAt: 361 },
    { icon: "🛠", label: "Fine-tune", color: C.purple,  appearsAt: 767 },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
      width: 280 * S,
    }}>
      {/* Question diamond */}
      <div style={{
        transform: `scale(${qScale})`,
        width: 200 * S, padding: `${14 * S}px ${18 * S}px`,
        background: C.yellowLight, border: `2px solid ${C.yellow}`,
        borderRadius: 14 * S,
        boxShadow: `0 0 ${16 * S}px rgba(255,209,102,0.3)`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.yellow, fontWeight: 700, letterSpacing: "0.05em",
          textAlign: "center" as const,
        }}>Prompt 能做到嗎？</div>
      </div>

      {/* Connector line */}
      <div style={{
        width: 3 * S, height: 24 * S,
        background: C.muted, opacity: 0.5,
      }} />

      {/* Branches stacked vertically */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 * S, width: "100%" }}>
        {branches.map((b, i) => {
          const itemF = Math.max(0, f - b.appearsAt);
          const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemTx = interpolate(itemF, [0, 22], [30 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          const ringScale = easeOutBack(prog(itemF, 22));
          return (
            <div key={i} style={{
              opacity: itemOp,
              transform: `translateX(${itemTx}px)`,
              display: "flex", alignItems: "center", gap: 12 * S,
              background: "rgba(0,0,0,0.82)",
              border: `1px solid ${b.color}55`,
              borderLeft: `4px solid ${b.color}`,
              borderRadius: 12 * S,
              padding: `${10 * S}px ${14 * S}px`,
              boxShadow: `0 0 ${12 * S}px ${b.color}22`,
            }}>
              <div style={{
                width: 40 * S, height: 40 * S, borderRadius: "50%",
                background: `${b.color}22`, border: `2px solid ${b.color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20 * S, fontWeight: 700, color: b.color,
                transform: `scale(${ringScale})`,
                flexShrink: 0,
              }}>{b.icon}</div>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
                color: b.color, fontWeight: 700, letterSpacing: "0.04em",
              }}>{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 8. CatastrophicForgettingAnimation — Scene3 Phase B (left side)
// Trigger: local 1232. DURATION: 420. Concept: brain with one bright spot, others fading.
function CatastrophicForgettingAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 420;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const brainScale = easeOutBack(prog(f, 22));
  const focusPulse = 0.7 + Math.sin(f * 0.1) * 0.3;
  const fadingPulse = interpolate(f, [60, 180], [0.7, 0.15], { easing: E.outCubic, extrapolateRight: "clamp" });

  // 5 areas in a fan layout — 1 focused (top), 4 dim
  const areas = [
    { angle: -90, label: "專精", focused: true,  appearsAt:  20 },
    { angle: -30, label: "...",  focused: false, appearsAt:  80 },
    { angle:  30, label: "...",  focused: false, appearsAt: 100 },
    { angle: 150, label: "...",  focused: false, appearsAt: 120 },
    { angle: 210, label: "...",  focused: false, appearsAt: 140 },
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 240 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
      width: 280 * S,
    }}>
      {/* Brain with surrounding areas */}
      <div style={{ position: "relative", width: 220 * S, height: 220 * S }}>
        {/* Central brain */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%, -50%) scale(${brainScale})`,
          width: 100 * S, height: 100 * S, borderRadius: "50%",
          background: "rgba(124,255,178,0.12)",
          border: `3px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40 * S,
          boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.3)`,
        }}>🧠</div>

        {/* Surrounding areas */}
        {areas.map((a, i) => {
          const itemF = Math.max(0, f - a.appearsAt);
          const op = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const rad = (a.angle * Math.PI) / 180;
          const r = 90 * S;
          const cx = 110 * S + Math.cos(rad) * r;
          const cy = 110 * S + Math.sin(rad) * r;
          const bg = a.focused ? `rgba(124,255,178,${focusPulse * 0.4})` : `rgba(255,255,255,${fadingPulse * 0.15})`;
          const border = a.focused ? C.primary : C.muted;
          const color  = a.focused ? C.primary : C.muted;
          const glow   = a.focused ? `0 0 ${14 * S}px rgba(124,255,178,${focusPulse * 0.8})` : "none";
          const fontWeight: number = a.focused ? 700 : 400;
          return (
            <div key={i} style={{
              position: "absolute",
              left: cx - 32 * S, top: cy - 18 * S,
              width: 64 * S, padding: `${6 * S}px ${4 * S}px`,
              opacity: op * (a.focused ? 1 : fadingPulse * 1.3 + 0.2),
              background: bg,
              border: `1px solid ${border}`,
              borderRadius: 8 * S,
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              fontWeight, color, textAlign: "center" as const,
              boxShadow: glow,
            }}>{a.label}</div>
          );
        })}
      </div>

      {/* Caption */}
      <div style={{
        opacity: interpolate(f, [40, 80], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.yellow, letterSpacing: "0.06em", fontWeight: 700,
        background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
        borderRadius: 8 * S, padding: `${8 * S}px ${14 * S}px`,
      }}>災難性遺忘</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_05_13.title.to - SCENES_2026_05_13.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(60);
  const tagStyle = useFadeUp(82);

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
        <div style={{ ...badgeOp, marginBottom: 20 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>每日 AI 知識庫</span>
        </div>

        {/* H1 line 1 */}
        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 50 * S, color: C.text,
        }}>
          <WordReveal text="Fine-tuning vs Prompt" startFrame={10} staggerPerWord={6}
            fontSize={50 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 — neon green accent */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 8 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 36 * S, color: C.primary,
        }}>
          <WordReveal text="哪個更值得學？" startFrame={32} staggerPerWord={6}
            fontSize={36 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle,
          marginTop: 28 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 22 * S, color: C.muted, lineHeight: 1.6,
          maxWidth: 1400 * S,
        }}>
          在模型「外面」調整，還是進到模型「裡面」改？選對方法，少走冤枉路。
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 22 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>Prompt · Fine-tune · RAG · 災難性遺忘</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <VsAnimation triggerFrame={200} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — 基本定義 (PE / FT) ────────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_13.scene1.to - SCENES_2026_05_13.scene1.from;

  // VTT-aligned local frames
  // Phase A (local 0–701) — Prompt Engineering 定義
  const PA_BADGE_AT    = 0;   // "先來說基本定義" 00:24.76
  const PA_DEF_AT      = 51;  // "Prompt Engineering 是在不改動模型本身" 00:26.48
  const PA_OUTSIDE_AT  = 461; // "就像同一個人,你用不同的方式..." 00:40.12
  // Phase A → B
  const AB_FADE_START  = 621;
  const AB_REMOVE      = 701;
  // Phase B (local 701–1488) — Fine-tuning 定義
  const PB_BADGE_AT    = 701; // "Fine-tuning 是真的去修改模型的參數" 00:48.12
  const PB_DEF_AT      = 757; // "用你準備的特定資料集" 00:52.36
  const PB_INSIDE_AT   = 957; // "這是從模型裡面改" 00:56.68

  const showA = frame < AB_REMOVE;
  const aOpacity = frame > AB_FADE_START
    ? interpolate(frame, [AB_FADE_START, AB_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= AB_REMOVE;

  const aBadge = useFadeUp(PA_BADGE_AT);
  const aDef   = useFadeUp(PA_DEF_AT);
  const aOut   = useFadeUp(PA_OUTSIDE_AT);
  const bBadge = useFadeUp(showB ? PB_BADGE_AT : 999999);
  const bDef   = useFadeUp(showB ? PB_DEF_AT   : 999999);
  const bIns   = useFadeUp(showB ? PB_INSIDE_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ─────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...aBadge, marginBottom: 22 * S, marginTop: 24 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.12em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>
                <WordReveal text="Prompt Engineering" startFrame={PA_BADGE_AT + 4} staggerPerWord={5}
                  fontSize={18 * S} color={C.primary}
                  fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
              </span>
            </div>

            {/* Definition card */}
            <div style={{ ...aDef, marginBottom: 22 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 16 * S,
                padding: `${22 * S}px ${26 * S}px`,
                boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.08)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 12 * S,
                }}>DEFINITION</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 26 * S, color: C.text, fontWeight: 700, lineHeight: 1.4,
                }}>不改動模型本身</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
                  marginTop: 10 * S,
                }}>透過調整「怎麼說」、「給什麼背景」、「要求什麼格式」，讓 AI 輸出更符合需求。</div>
              </div>
            </div>

            {/* Outside highlight */}
            <div style={{ ...aOut }}>
              <div style={{
                background: C.primaryLight,
                border: `1px solid ${C.primaryBorder}`,
                borderLeft: `4px solid ${C.primary}`,
                borderRadius: 10 * S,
                padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 22 * S, color: C.primary, fontWeight: 700, lineHeight: 1.4,
                }}>在模型「外面」調整</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S, color: C.text, lineHeight: 1.55,
                  marginTop: 6 * S,
                }}>同一個人，不同的交代方式 → 不同的結果。</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ─────────────────────── */}
        {showB && (
          <div>
            <div style={{ ...bBadge, marginBottom: 22 * S, marginTop: 24 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.purple, letterSpacing: "0.12em",
                background: C.purpleLight, border: `1px solid ${C.purpleBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>
                <WordReveal text="Fine-tuning" startFrame={PB_BADGE_AT + 4} staggerPerWord={5}
                  fontSize={18 * S} color={C.purple}
                  fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
              </span>
            </div>

            {/* Definition card */}
            <div style={{ ...bDef, marginBottom: 22 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.purpleBorder}`,
                borderRadius: 16 * S,
                padding: `${22 * S}px ${26 * S}px`,
                boxShadow: `0 0 ${30 * S}px rgba(183,148,246,0.08)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.purple, letterSpacing: "0.08em", marginBottom: 12 * S,
                }}>DEFINITION</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 26 * S, color: C.text, fontWeight: 700, lineHeight: 1.4,
                }}>修改模型的參數</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
                  marginTop: 10 * S,
                }}>用你準備的特定資料集，讓模型更認識你的任務、語言風格、或專業領域。</div>
              </div>
            </div>

            {/* Inside highlight */}
            <div style={{ ...bIns }}>
              <div style={{
                background: C.purpleLight,
                border: `1px solid ${C.purpleBorder}`,
                borderLeft: `4px solid ${C.purple}`,
                borderRadius: 10 * S,
                padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 22 * S, color: C.purple, fontWeight: 700, lineHeight: 1.4,
                }}>從模型「裡面」改</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S, color: C.text, lineHeight: 1.55,
                  marginTop: 6 * S,
                }}>同樣的人，重新「訓練」過 → 思考方式跟著改變。</div>
              </div>
            </div>
          </div>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <OutsideAdjustAnimation triggerLocalFrame={51} />
        <InsideModifyAnimation triggerLocalFrame={701} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — 成本 + 三情境 + 天花板 ────────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_13.scene2.to - SCENES_2026_05_13.scene2.from;

  // ── Phase A (local 0–885) — 為什麼差別重要 + Fine-tuning 成本
  const PA_BADGE_AT    = 0;    // "為什麼這個差別很重要" 01:14.36
  const PA_COST_AT     = 173;  // "卻花了大量時間去研究 Fine-tuning" 01:20.16
  const PA_EXAMPLES_AT = 524;  // "如果你只是想讓AI每次都用繁體中文回答" 01:31.84
  const AB_FADE_START  = 805;
  const AB_REMOVE      = 885;
  // ── Phase B (local 885–2108) — Fine-tuning 三情境
  const PB_BADGE_AT    = 885;  // "那 Fine-tuning 真正適合的是什麼?有幾個情境" 01:43.88
  const PB_S1_AT       = 1009; // "第一,風格一致性" 01:48.00
  const PB_S2_AT       = 1345; // "第二,高度專業領域" 01:59.20
  const PB_S3_AT       = 1775; // "第三,大量重複任務" 02:13.52
  const BC_FADE_START  = 2028;
  const BC_REMOVE      = 2108;
  // ── Phase C (local 2108–3068) — Prompt 天花板
  const PC_BADGE_AT    = 2108; // "但這裡有一個重要的現實" 02:24.36
  const PC_CEILING_AT  = 2187; // "prompt engineering 的天花板..." 02:27.28
  const PC_NOTE_AT     = 2804; // "光是這幾個技巧組合..." 02:37.84

  const showA = frame < AB_REMOVE;
  const aOpacity = frame > AB_FADE_START
    ? interpolate(frame, [AB_FADE_START, AB_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= AB_REMOVE && frame < BC_REMOVE;
  const bOpacity = frame > BC_FADE_START
    ? interpolate(frame, [BC_FADE_START, BC_REMOVE], [1, 0], clamp) : 1;
  const showC = frame >= BC_REMOVE;

  const aBadge = useFadeUp(PA_BADGE_AT);
  const aCost  = useFadeUp(PA_COST_AT);
  const aEx    = useFadeUp(PA_EXAMPLES_AT);

  const bBadge = useFadeUp(showB ? PB_BADGE_AT : 999999);
  const bS1    = useFadeUp(showB ? PB_S1_AT    : 999999);
  const bS2    = useFadeUp(showB ? PB_S2_AT    : 999999);
  const bS3    = useFadeUp(showB ? PB_S3_AT    : 999999);

  const cBadge = useFadeUp(showC ? PC_BADGE_AT : 999999);
  const cTitle = useFadeUp(showC ? PC_CEILING_AT : 999999);
  const cNote  = useFadeUp(showC ? PC_NOTE_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ─────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...aBadge, marginBottom: 22 * S, marginTop: 24 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.red, letterSpacing: "0.12em",
                background: C.redLight, border: `1px solid ${C.redBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>
                <WordReveal text="為什麼差別很重要" startFrame={PA_BADGE_AT + 4} staggerPerWord={5}
                  fontSize={18 * S} color={C.red}
                  fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
              </span>
            </div>

            {/* Cost card */}
            <div style={{ ...aCost, marginBottom: 22 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.redBorder}`,
                borderRadius: 16 * S,
                padding: `${22 * S}px ${26 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.red, letterSpacing: "0.08em", marginBottom: 12 * S,
                }}>FINE-TUNING COST</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 24 * S, color: C.text, fontWeight: 700, lineHeight: 1.4,
                }}>不只浪費時間 — 還要付出代價</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
                  marginTop: 10 * S,
                }}>準備資料 · 付費算力 · 處理一堆技術問題</div>
              </div>
            </div>

            {/* Prompt examples */}
            <div style={{ ...aEx }}>
              <div style={{
                background: C.primaryLight,
                border: `1px solid ${C.primaryBorder}`,
                borderLeft: `4px solid ${C.primary}`,
                borderRadius: 10 * S,
                padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 22 * S, color: C.primary, fontWeight: 700, lineHeight: 1.4,
                }}>這些用 Prompt 就能解決</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S, color: C.text, lineHeight: 1.55,
                  marginTop: 6 * S,
                }}>「每次用繁體中文回答」、「輸出 JSON 格式」 → 完全不需要 Fine-tuning。</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ─────────────────────── */}
        {showB && (
          <div style={{ opacity: bOpacity }}>
            <div style={{ ...bBadge, marginBottom: 22 * S, marginTop: 24 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.purple, letterSpacing: "0.12em",
                background: C.purpleLight, border: `1px solid ${C.purpleBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>
                <WordReveal text="Fine-tuning 真正適合的場景" startFrame={PB_BADGE_AT + 4} staggerPerWord={5}
                  fontSize={18 * S} color={C.purple}
                  fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
              </span>
            </div>

            {/* Scenario 01 */}
            <div style={{ ...bS1, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primary}33`,
                borderLeft: `4px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 6 * S, fontWeight: 700,
                }}>01 · STYLE</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 22 * S, color: C.text, fontWeight: 700, lineHeight: 1.3,
                }}>風格一致性要求極高</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S, color: C.muted, lineHeight: 1.55,
                  marginTop: 4 * S,
                }}>完全模仿品牌語氣，需要大量範例。</div>
              </div>
            </div>

            {/* Scenario 02 */}
            <div style={{ ...bS2, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.yellow}33`,
                borderLeft: `4px solid ${C.yellow}`,
                borderRadius: 12 * S,
                padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 6 * S, fontWeight: 700,
                }}>02 · DOMAIN</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 22 * S, color: C.text, fontWeight: 700, lineHeight: 1.3,
                }}>高度專業的領域知識</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S, color: C.muted, lineHeight: 1.55,
                  marginTop: 4 * S,
                }}>幾千筆醫療問答 → 精確、不要通用答案。</div>
              </div>
            </div>

            {/* Scenario 03 */}
            <div style={{ ...bS3 }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.blue}33`,
                borderLeft: `4px solid ${C.blue}`,
                borderRadius: 12 * S,
                padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.blue, letterSpacing: "0.08em", marginBottom: 6 * S, fontWeight: 700,
                }}>03 · REPEAT</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 22 * S, color: C.text, fontWeight: 700, lineHeight: 1.3,
                }}>大量重複使用同一任務</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S, color: C.muted, lineHeight: 1.55,
                  marginTop: 4 * S,
                }}>效率更高，prompt 可以寫得更短。</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase C ─────────────────────── */}
        {showC && (
          <div>
            <div style={{ ...cBadge, marginBottom: 22 * S, marginTop: 24 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.12em",
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>
                <WordReveal text="一個重要的現實" startFrame={PC_BADGE_AT + 4} staggerPerWord={5}
                  fontSize={18 * S} color={C.yellow}
                  fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
              </span>
            </div>

            {/* Ceiling card */}
            <div style={{ ...cTitle, marginBottom: 22 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.yellowBorder}`,
                borderRadius: 16 * S,
                padding: `${22 * S}px ${26 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 26 * S, color: C.yellow, fontWeight: 700, lineHeight: 1.4,
                }}>Prompt Engineering 的天花板</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 22 * S, color: C.text, lineHeight: 1.55,
                  marginTop: 10 * S,
                }}>比很多人想像的還要高很多。</div>
              </div>
            </div>

            {/* Techniques note */}
            <div style={{ ...cNote }}>
              <div style={{
                background: C.primaryLight,
                border: `1px solid ${C.primaryBorder}`,
                borderLeft: `4px solid ${C.primary}`,
                borderRadius: 10 * S,
                padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 20 * S, color: C.primary, fontWeight: 700, lineHeight: 1.5,
                }}>角色設定 + Few-shot + Chain of Thought</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S, color: C.text, lineHeight: 1.55,
                  marginTop: 6 * S,
                }}>光是這幾個技巧組合，就能讓品質大幅提升 — 而且沒有技術門檻。</div>
              </div>
            </div>
          </div>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <WastedTimeAnimation triggerLocalFrame={174} />
        <ThreeScenariosAnimation triggerLocalFrame={1009} />
        <CeilingAnimation triggerLocalFrame={2187} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 實用判斷框架 + 災難性遺忘 ─────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_13.scene3.to - SCENES_2026_05_13.scene3.from;

  // ── Phase A (local 0–1195) — 判斷框架
  const PA_BADGE_AT      = 0;    // "最後給你一個判斷要用哪個的實用框架" 02:56.64
  const PA_QUESTION_AT   = 131;  // "先問自己,如果我在 Prompt 裡給它足夠清楚的說明" 03:01.00
  const PA_OUTCOME_YES_AT = 359; // "如果能,繼續優化你的 Prompt" 03:08.60
  const PA_OUTCOME_RAG_AT = 492; // "如果不能,因為它不懂這個領域" 03:13.04
  const PA_OUTCOME_FT_AT  = 897; // "如果不能,因為我需要高度一致的風格" 03:26.56
  const AB_FADE_START    = 1115;
  const AB_REMOVE        = 1195;
  // ── Phase B (local 1195–2070) — 災難性遺忘
  const PB_BADGE_AT      = 1195; // "最後一個提醒" 03:36.48
  const PB_FOCUS_AT      = 1232; // "Fine-tuning 會讓模型更專注" 03:37.72
  const PB_FORGET_AT     = 1474; // "這叫做災難性遺忘" 03:45.80
  const PB_NOTE_AT       = 1560; // "調整模型從來不是只有好處沒有代價的" 03:48.64

  const showA = frame < AB_REMOVE;
  const aOpacity = frame > AB_FADE_START
    ? interpolate(frame, [AB_FADE_START, AB_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= AB_REMOVE;

  const aBadge   = useFadeUp(PA_BADGE_AT);
  const aQ       = useFadeUp(PA_QUESTION_AT);
  const aYes     = useFadeUp(PA_OUTCOME_YES_AT);
  const aRag     = useFadeUp(PA_OUTCOME_RAG_AT);
  const aFt      = useFadeUp(PA_OUTCOME_FT_AT);
  const bBadge   = useFadeUp(showB ? PB_BADGE_AT  : 999999);
  const bFocus   = useFadeUp(showB ? PB_FOCUS_AT  : 999999);
  const bForget  = useFadeUp(showB ? PB_FORGET_AT : 999999);
  const bNote    = useFadeUp(showB ? PB_NOTE_AT   : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ─────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...aBadge, marginBottom: 22 * S, marginTop: 24 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.12em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>
                <WordReveal text="實用判斷框架" startFrame={PA_BADGE_AT + 4} staggerPerWord={5}
                  fontSize={18 * S} color={C.primary}
                  fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
              </span>
            </div>

            {/* Question */}
            <div style={{ ...aQ, marginBottom: 22 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1px solid ${C.yellowBorder}`,
                borderLeft: `4px solid ${C.yellow}`,
                borderRadius: 12 * S,
                padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 6 * S, fontWeight: 700,
                }}>ASK YOURSELF</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 22 * S, color: C.text, fontWeight: 700, lineHeight: 1.45,
                }}>在 Prompt 裡給足夠清楚的說明和範例，它能做到嗎？</div>
              </div>
            </div>

            {/* Outcome: Yes → Prompt */}
            <div style={{ ...aYes, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primary}33`,
                borderLeft: `4px solid ${C.primary}`,
                borderRadius: 10 * S,
                padding: `${14 * S}px ${20 * S}px`,
                display: "flex", alignItems: "center", gap: 16 * S,
              }}>
                <div style={{
                  width: 56 * S, padding: `${6 * S}px ${8 * S}px`,
                  background: `${C.primary}22`, border: `1px solid ${C.primary}`,
                  borderRadius: 8 * S, textAlign: "center" as const,
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, fontWeight: 700, flexShrink: 0,
                }}>✓</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S, color: C.primary, fontWeight: 700, lineHeight: 1.3,
                  }}>能 → 繼續優化 Prompt</div>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S, color: C.muted, lineHeight: 1.5, marginTop: 4 * S,
                  }}>不需要 Fine-tuning。</div>
                </div>
              </div>
            </div>

            {/* Outcome: No (knowledge) → RAG */}
            <div style={{ ...aRag, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.blue}33`,
                borderLeft: `4px solid ${C.blue}`,
                borderRadius: 10 * S,
                padding: `${14 * S}px ${20 * S}px`,
                display: "flex", alignItems: "center", gap: 16 * S,
              }}>
                <div style={{
                  width: 56 * S, padding: `${6 * S}px ${8 * S}px`,
                  background: `${C.blue}22`, border: `1px solid ${C.blue}`,
                  borderRadius: 8 * S, textAlign: "center" as const,
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.blue, fontWeight: 700, flexShrink: 0,
                }}>RAG</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S, color: C.blue, fontWeight: 700, lineHeight: 1.3,
                  }}>不懂領域 → 先考慮 RAG</div>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S, color: C.muted, lineHeight: 1.5, marginTop: 4 * S,
                  }}>讓 AI 搜尋你的文件再回答 — 更實用，也好維護。</div>
                </div>
              </div>
            </div>

            {/* Outcome: No (style) → Fine-tuning */}
            <div style={{ ...aFt }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.purple}33`,
                borderLeft: `4px solid ${C.purple}`,
                borderRadius: 10 * S,
                padding: `${14 * S}px ${20 * S}px`,
                display: "flex", alignItems: "center", gap: 16 * S,
              }}>
                <div style={{
                  width: 56 * S, padding: `${6 * S}px ${8 * S}px`,
                  background: `${C.purple}22`, border: `1px solid ${C.purple}`,
                  borderRadius: 8 * S, textAlign: "center" as const,
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.purple, fontWeight: 700, flexShrink: 0,
                }}>FT</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S, color: C.purple, fontWeight: 700, lineHeight: 1.3,
                  }}>高度一致風格 + 大量 → Fine-tuning</div>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S, color: C.muted, lineHeight: 1.5, marginTop: 4 * S,
                  }}>這才是 Fine-tuning 真正出場的時候。</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ─────────────────────── */}
        {showB && (
          <div>
            <div style={{ ...bBadge, marginBottom: 22 * S, marginTop: 24 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.12em",
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>
                <WordReveal text="最後一個提醒" startFrame={PB_BADGE_AT + 4} staggerPerWord={5}
                  fontSize={18 * S} color={C.yellow}
                  fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
              </span>
            </div>

            {/* Focus vs weaken */}
            <div style={{ ...bFocus, marginBottom: 22 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.yellowBorder}`,
                borderRadius: 16 * S,
                padding: `${22 * S}px ${26 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 24 * S, color: C.text, fontWeight: 700, lineHeight: 1.4,
                }}>更專注在某個方向 — 同時也可能變弱</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
                  marginTop: 10 * S,
                }}>專精的代價：在其他方面變弱。</div>
              </div>
            </div>

            {/* Catastrophic forgetting */}
            <div style={{ ...bForget, marginBottom: 22 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1px solid ${C.yellowBorder}`,
                borderLeft: `4px solid ${C.yellow}`,
                borderRadius: 12 * S,
                padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.06em", marginBottom: 6 * S, fontWeight: 700,
                }}>CATASTROPHIC FORGETTING</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 22 * S, color: C.text, fontWeight: 700, lineHeight: 1.45,
                }}>災難性遺忘 — 學了新的，可能忘了舊的。</div>
              </div>
            </div>

            {/* Note */}
            <div style={{ ...bNote }}>
              <div style={{
                background: C.redLight,
                border: `1px solid ${C.redBorder}`,
                borderLeft: `4px solid ${C.red}`,
                borderRadius: 10 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 20 * S, color: C.red, fontWeight: 700, lineHeight: 1.5,
                }}>調整模型 ≠ 只有好處沒有代價</div>
              </div>
            </div>
          </div>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <DecisionFrameworkAnimation triggerLocalFrame={131} />
        <CatastrophicForgettingAnimation triggerLocalFrame={1232} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryCard ────────────────────────────────────────────────────────────
function SummaryCard({ number, delay, title, text, color }: {
  number: string; delay: number; title: string; text: string; color: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${color}33`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12 * S,
        padding: `${16 * S}px ${22 * S}px`,
        display: "flex", gap: 18 * S, alignItems: "center",
      }}>
        <div style={{
          width: 60 * S, padding: `${6 * S}px ${8 * S}px`,
          background: `${color}22`, border: `1px solid ${color}`,
          borderRadius: 8 * S, textAlign: "center" as const,
          fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
          color, fontWeight: 700, flexShrink: 0,
        }}>{number}</div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 22 * S, color, fontWeight: 700, lineHeight: 1.3,
          }}>{title}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 18 * S, color: C.muted, lineHeight: 1.55,
            marginTop: 4 * S,
          }}>{text}</div>
        </div>
      </div>
    </div>
  );
}

// ── SummaryScene ───────────────────────────────────────────────────────────
function SummaryScene() {
  const dur = SCENES_2026_05_13.summary.to - SCENES_2026_05_13.summary.from;

  // VTT-aligned (Summary offset 7369)
  // "今天的重點整理" 04:05.64 → local 0
  // "第一,Prompt Engineering 是不改模型..." 04:06.88 → local 37
  // "第二,Fine-tuning 是修改模型本身" 04:17.00 → local 341
  // "第三,實用判斷" 04:25.48 → local 595
  // "這裡是每日 AI 知識庫" 04:36.44 → local 924
  const BADGE_AT = 0;
  const CARD1_AT = 37;
  const CARD2_AT = 341;
  const CARD3_AT = 595;
  const OUTRO_AT = 924;

  const badgeStyle = useFadeUp(BADGE_AT);
  const outroStyle = useFadeUp(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        <div style={{ ...badgeStyle, marginBottom: 22 * S, marginTop: 24 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>
            <WordReveal text="重點整理" startFrame={4} staggerPerWord={5}
              fontSize={20 * S} color={C.primary}
              fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
          </span>
        </div>

        <SummaryCard number="01" delay={CARD1_AT}
          title="Prompt Engineering = 不改模型"
          text="靠問法優化輸出 · 門檻低 · 見效快 · 大多數人應該先學的"
          color={C.primary}
        />
        <SummaryCard number="02" delay={CARD2_AT}
          title="Fine-tuning = 修改模型本身"
          text="適合高度專業或風格一致性極高的場景 · 有技術門檻"
          color={C.purple}
        />
        <SummaryCard number="03" delay={CARD3_AT}
          title="Prompt → RAG → Fine-tuning"
          text="先試 Prompt，不夠試 RAG，真的都不夠才考慮 Fine-tuning — 而且要記得它有代價"
          color={C.yellow}
        />

        <div style={{ ...outroStyle, marginTop: 18 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em", textAlign: "center" as const,
          }}>每日 AI 知識庫</div>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Composition ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export function VideoComposition_2026_05_13() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_13.scene1;
  const S2 = SCENES_2026_05_13.scene2;
  const S3 = SCENES_2026_05_13.scene3;
  const SU = SCENES_2026_05_13.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-05-13-processed.wav")} volume={1.0} />
      <Audio src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_05_13 - 150, TOTAL_FRAMES_2026_05_13],
            [v, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          return Math.min(fi, fo);
        }}
        loop />

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
