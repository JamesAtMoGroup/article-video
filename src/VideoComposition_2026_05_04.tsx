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
const CONTENT_TOP   = NAV_H + CONTENT_GAP;       // 180px
const CONTENT_H     = H - CONTENT_TOP - SUBTITLE_SAFE;  // 1620px

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

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// TitleScene:   0s–23.5s    → 0–705
// Scene1:       23.5s–94.5s → 705–2835   (學 AI 學的到底是什麼)
// Scene2:       94.5s–165.5s → 2835–4965 (為什麼早學的優勢比你想的還要大)
// Scene3:       165.5s–234s → 4965–7020  (三個方向給你參考)
// Summary:      234s–264s   → 7020–7920  (重點整理 + 結尾)
export const SCENES_2026_05_04 = {
  title:   { from: 0,    to: 705   },
  scene1:  { from: 705,  to: 2835  },
  scene2:  { from: 2835, to: 4965  },
  scene3:  { from: 4965, to: 7020  },
  summary: { from: 7020, to: 7920  },
} as const;
export const TOTAL_FRAMES_2026_05_04 = 7920;

const CHAPTERS = [
  { label: "今日焦點",            start: 0    },
  { label: "學 AI 學的是什麼",    start: 705  },
  { label: "早學的複利優勢",      start: 2835 },
  { label: "三個方向",            start: 4965 },
  { label: "重點整理",            start: 7020 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // 84.5s "你現在使用AI工具,有沒有養成記下哪些用法有效"
  { from: 2535, to: 2835, sender: "想一想", text: "你現在使用 AI，有沒有養成記下『哪些用法有效、哪些沒用』的習慣？" },
  // 155.5s "你工作上有沒有一件事,是如果當初早點學"
  { from: 4665, to: 4965, sender: "親身經歷", text: "工作上有沒有一件事，是『如果當初早點學，現在就輕鬆很多』的？" },
  // 223.5s "你現在的工作裡,有哪一個任務可以從今天就開始讓AI參與"
  { from: 6705, to: 7020, sender: "從哪開始", text: "現在的工作裡，有哪一個任務可以從今天就開始讓 AI 參與？" },
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

// ── RippleRing ─────────────────────────────────────────────────────────────
function RippleRing({ activeAt, color }: { activeAt: number; color: string }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - activeAt);
  if (f > 28) return null;
  const scale   = interpolate(f, [0, 24], [0.85, 1.9], { easing: E.outExpo, extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 4, 24, 28], [0, 0.55, 0.2, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", inset: 0,
      border: `${2 * S}px solid ${color}`, borderRadius: 12 * S,
      transform: `scale(${scale})`, opacity, pointerEvents: "none",
    }} />
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
      padding: `${14 * S}px ${16 * S}px`,
      boxShadow: `0 ${8 * S}px ${24 * S}px rgba(0,0,0,0.6)`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 8 * S,
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
// ── Concept Animations ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// 1. AccumulationStackAnimation — TitleScene
// VTT trigger: 13.5s "現在學AI的人,五年後到底會贏在哪裡" → frame 405
// DURATION 280 (covers 13.5s–22.8s)
function AccumulationStackAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 280;
  const envelope = interpolate(f, [0, 12, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const blocks = [
    { label: "判斷",  delay: 20  },
    { label: "經驗",  delay: 70  },
    { label: "直覺",  delay: 120 },
    { label: "資產",  delay: 170 },
  ];

  // Timeline base width grows
  const baseW = interpolate(f, [0, 30], [0, 220 * S], { easing: E.outExpo, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 250 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
    }}>
      {/* Stacked blocks (rendered bottom-up) */}
      <div style={{
        display: "flex", flexDirection: "column-reverse", alignItems: "center",
        gap: 6 * S, marginBottom: 4 * S,
      }}>
        {blocks.map((b, i) => {
          const itemF = Math.max(0, f - b.delay);
          const itemOp = interpolate(itemF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemTy = interpolate(itemF, [0, 22], [-30 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          const w = 80 * S + i * 20 * S;
          return (
            <div key={i} style={{
              opacity: itemOp,
              transform: `translateY(${itemTy}px)`,
              width: w, padding: `${8 * S}px ${10 * S}px`,
              background: "rgba(124,255,178,0.12)",
              border: `1.5px solid ${C.primary}`,
              borderRadius: 8 * S,
              boxShadow: `0 0 ${10 * S}px rgba(124,255,178,0.25)`,
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 18 * S, color: C.primary, fontWeight: "700",
              textAlign: "center" as const,
            }}>{b.label}</div>
          );
        })}
      </div>

      {/* Timeline base */}
      <div style={{
        width: baseW, height: 4 * S,
        background: `linear-gradient(to right, ${C.primary}, rgba(124,255,178,0.4))`,
        borderRadius: 2 * S,
        boxShadow: `0 0 ${8 * S}px rgba(124,255,178,0.5)`,
      }} />
      <div style={{
        display: "flex", justifyContent: "space-between", width: 220 * S,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.06em",
      }}>
        <span>今天</span>
        <span>5 年後</span>
      </div>
    </div>
  );
}

// 2. ToolsVsBrainAnimation — Scene1 Phase A (right)
// VTT trigger: 36s "但現在真正在累積的人,學的不是那些" → local 36*30-705 = 375
// DURATION 430 (ends at local 805 = A_FADE_START)
function ToolsVsBrainAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 430;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Tools fade out (left column items dim over time)
  const tools = ["上課", "Prompt", "工具"];
  // Brain rises and pulses
  const brainScale = easeOutBack(prog(Math.max(0, f - 40), 22));
  const brainPulse = Math.sin(f * 0.06) * 0.08 + 0.92;
  const labelOp = interpolate(Math.max(0, f - 90), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 220 * S,
    }}>
      {/* Top: tools fading */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 8 * S, alignItems: "center",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.muted, letterSpacing: "0.08em", marginBottom: 4 * S,
        }}>表面學的</div>
        {tools.map((t, i) => {
          const tIn = interpolate(Math.max(0, f - i * 8), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          // Fade these out gradually as brain takes over (after f=140)
          const tFade = interpolate(Math.max(0, f - 140), [0, 60], [1, 0.25], clamp);
          return (
            <div key={i} style={{
              opacity: tIn * tFade,
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.muted, padding: `${5 * S}px ${12 * S}px`,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: 6 * S,
            }}>{t}</div>
          );
        })}
      </div>

      {/* vs */}
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
        color: C.muted, letterSpacing: "0.1em",
      }}>vs</div>

      {/* Brain — growing */}
      <div style={{
        width: 120 * S, height: 120 * S, borderRadius: "50%",
        background: "rgba(124,255,178,0.15)",
        border: `${3 * S}px solid ${C.primary}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 56 * S,
        transform: `scale(${brainScale * brainPulse})`,
        boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.45)`,
      }}>🧠</div>

      {/* Label */}
      <div style={{
        opacity: labelOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.primary, fontWeight: "700",
        textAlign: "center" as const,
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
        textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.5)`,
      }}>對 AI 的直覺</div>
    </div>
  );
}

// 3. IntuitionAccumulateAnimation — Scene1 Phase B (right)
// VTT trigger: 66s "這些都是可以重複用的認知資產" → local 66*30-705 = 1275
// DURATION 510 (covers until ~83s)
function IntuitionAccumulateAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 510;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Brain in center (appears immediately)
  const brainScale = easeOutBack(prog(f, 20));
  const brainPulse = Math.sin(f * 0.05) * 0.08 + 0.92;

  // Insight nodes orbit around brain — synced to VTT moments
  // 66s = trigger; nodes appear at:
  //   "出錯了,你記住了" already at 57.5s (before trigger) — show node 1 immediately
  //   "提問特別有效,你內化了" at 61.5s — node 2 already mentioned
  //   "認知資產" at 66s — trigger
  //   "五年後...強很多" at 70s = local 1395, f=120
  //   "判斷力不會自動升級" at 75.5s = local 1560, f=285
  //   "從現在就開始累積" at 80s = local 1695, f=420
  const nodes = [
    { angle: -90,  label: "✗ 出錯場景", delay: 30,  color: C.red },
    { angle: -30,  label: "✓ 有效提問", delay: 60,  color: C.primary },
    { angle: 30,   label: "判斷力",     delay: 120, color: C.primary },
    { angle: 90,   label: "升級條件",   delay: 285, color: C.yellow },
    { angle: 150,  label: "現在累積",   delay: 420, color: C.primary },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
    }}>
      <div style={{ position: "relative", width: 240 * S, height: 240 * S }}>
        {/* Brain center */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%,-50%) scale(${brainScale * brainPulse})`,
          width: 80 * S, height: 80 * S, borderRadius: "50%",
          background: "rgba(124,255,178,0.18)",
          border: `${3 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40 * S,
          boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.5)`,
          zIndex: 2,
        }}>🧠</div>

        {/* Insight nodes */}
        {nodes.map((n, i) => {
          const nF = Math.max(0, f - n.delay);
          const nOp = interpolate(nF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const radius = interpolate(nF, [0, 26], [0, 90 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
          const rad = (n.angle * Math.PI) / 180;
          const cx = 120 * S + Math.cos(rad) * radius;
          const cy = 120 * S + Math.sin(rad) * radius;
          // Connecting line opacity
          const lineOp = interpolate(nF, [10, 30], [0, 0.5], clamp);
          return (
            <React.Fragment key={i}>
              {/* Line from brain to node */}
              <div style={{
                position: "absolute",
                left: 120 * S, top: 120 * S,
                width: radius, height: 1.5 * S,
                background: `linear-gradient(to right, ${n.color}55, transparent)`,
                opacity: lineOp,
                transform: `rotate(${n.angle}deg)`,
                transformOrigin: "left center",
              }} />
              {/* Node */}
              <div style={{
                position: "absolute",
                left: cx, top: cy,
                transform: "translate(-50%, -50%)",
                opacity: nOp,
                background: "rgba(0,0,0,0.85)",
                border: `1.5px solid ${n.color}`,
                borderRadius: 6 * S,
                padding: `${4 * S}px ${8 * S}px`,
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 18 * S, color: n.color, fontWeight: "700",
                whiteSpace: "nowrap" as const,
                boxShadow: `0 0 ${8 * S}px ${n.color}55`,
              }}>{n.label}</div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// 4. CompoundChainAnimation — Scene2 Phase A (right)
// VTT trigger: 99.5s "學AI有一個很強的複利效應" → local 99.5*30-2835 = 150
// DURATION 750 (covers chain growth to 121s "每一步累積讓下一步更容易")
function CompoundChainAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 750;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT-aligned step delays (local from CompoundChain trigger at 99.5s = local 150):
  // 103.5s "整理資料" → step 1 at f=120
  // 110.5s "做簡報" → step 2 at f=330
  // 114.5s "工作流程" → step 3 at f=450
  // 121s   "累積讓下一步更容易" → step 4 (compound) at f=645
  const steps = [
    { icon: "📊", label: "整理資料",   delay: 120, scale: 1.0 },
    { icon: "🔍", label: "分析",       delay: 240, scale: 1.1 },
    { icon: "📑", label: "做簡報",     delay: 330, scale: 1.2 },
    { icon: "⚙️", label: "整個流程",   delay: 450, scale: 1.35 },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 10 * S,
      width: 230 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em", marginBottom: 6 * S,
      }}>複利累積</div>
      {steps.map((s, i) => {
        const sF = Math.max(0, f - s.delay);
        const sOp = interpolate(sF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const sTy = interpolate(sF, [0, 22], [20 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const sScale = easeOutBack(Math.min(sF / 22, 1));
        return (
          <React.Fragment key={i}>
            <div style={{
              opacity: sOp,
              transform: `translateY(${sTy}px) scale(${sScale})`,
              transformOrigin: "left center",
              display: "flex", alignItems: "center", gap: 10 * S,
              background: "rgba(0,0,0,0.82)",
              border: `1.5px solid ${C.primary}${Math.round(80 + i * 30).toString(16)}`,
              borderRadius: 10 * S,
              padding: `${10 * S}px ${14 * S}px`,
              boxShadow: `0 0 ${(8 + i * 4) * S}px rgba(124,255,178,${0.1 + i * 0.06})`,
              width: `${100 * s.scale}%`,
            }}>
              <span style={{ fontSize: 24 * S }}>{s.icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 18 * S, color: C.text, fontWeight: "700",
              }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                opacity: interpolate(Math.max(0, f - s.delay - 18), [0, 14], [0, 0.7], clamp),
                color: C.primary, fontSize: 22 * S, marginLeft: 16 * S,
                transform: "rotate(90deg)",
                width: 18 * S,
              }}>→</div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// 5. WallOfVersionsAnimation — Scene2 Phase B (left)
// VTT trigger: 137s "AI工具本身在快速演化" → local 137*30-2835 = 1275
// DURATION 855 (covers to 162.5s "AI學習曲線也是一樣")
function WallOfVersionsAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 855;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Cycle versions on left side every ~30 frames
  const versionIdx = Math.floor(f / 28) % 8;
  const versions = ["v1.0", "v1.5", "v2.0", "v2.5", "v3.0", "v3.5", "v4.0", "v4.5"];

  // Right-side brain (steady, principle understanding) appears at f=80
  // VTT 140s "今天花時間搞懂AI是怎麼運作的" → local 1425, f=150
  const brainAppear = interpolate(Math.max(0, f - 150), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const brainScale = easeOutBack(prog(Math.max(0, f - 150), 24));

  // VTT 150s "只會操作特定工具的人,每次更新都像重新入門" → local 1665, f=390
  const verdictAppear = interpolate(Math.max(0, f - 390), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 170 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 250 * S,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14 * S,
      }}>
        {/* Left: changing versions */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.06em",
          }}>工具</div>
          <div style={{
            background: "rgba(255,107,107,0.08)",
            border: `1.5px solid ${C.red}`,
            borderRadius: 10 * S,
            padding: `${10 * S}px ${14 * S}px`,
            fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
            color: C.red, fontWeight: "700",
            minWidth: 80 * S,
            textAlign: "center" as const,
            textShadow: `0 0 ${8 * S}px ${C.red}66`,
          }}>{versions[versionIdx]}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.muted, marginTop: 2 * S,
          }}>每次重學</div>
        </div>

        {/* vs */}
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.muted, letterSpacing: "0.1em",
        }}>vs</div>

        {/* Right: stable brain (principle) */}
        <div style={{
          opacity: brainAppear,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.06em",
          }}>原理</div>
          <div style={{
            width: 80 * S, height: 80 * S, borderRadius: "50%",
            background: "rgba(124,255,178,0.18)",
            border: `${3 * S}px solid ${C.primary}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 38 * S,
            transform: `scale(${brainScale})`,
            boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.5)`,
          }}>🧠</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.primary, marginTop: 2 * S, fontWeight: "700",
          }}>一次搞懂</div>
        </div>
      </div>

      {/* Verdict label */}
      <div style={{
        opacity: verdictAppear,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.primary, fontWeight: "700",
        textAlign: "center" as const,
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
        textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.5)`,
      }}>原理不會過時</div>
    </div>
  );
}

// 6. ScanningRadarAnimation — Scene3 (right)
// VTT trigger: 209.5s "不只是哪裡有用" → local 209.5*30-4965 = 1320
// DURATION 420 (covers to 220.5s "五年後才是真正不可取代")
function ScanningRadarAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 420;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Sweep angle 0→360 over 120 frames, looping
  const sweepDeg = (f * 2.5) % 360;

  // Error markers appear at intervals (VTT-aligned):
  // 211.5s "AI素養的核心就是知道什麼時候不能信任AI" → local 1380, f=60
  // 217.5s "知道何時要自己判斷的人" → local 1560, f=240
  // 220.5s "不可取代的" → local 1650, f=330
  const errors = [
    { angle: 60,  delay: 60,  label: "幻覺" },
    { angle: 180, delay: 150, label: "過時" },
    { angle: 300, delay: 240, label: "偏誤" },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>偵測 AI 出錯</div>

      <div style={{ position: "relative", width: 200 * S, height: 200 * S }}>
        {/* Outer ring */}
        <div style={{
          position: "absolute", inset: 0,
          border: `2px solid ${C.primaryBorder}`, borderRadius: "50%",
        }} />
        {/* Inner ring */}
        <div style={{
          position: "absolute", inset: `${30 * S}px`,
          border: `1.5px solid rgba(124,255,178,0.18)`, borderRadius: "50%",
        }} />
        {/* Center dot */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 10 * S, height: 10 * S, borderRadius: "50%",
          background: C.primary,
          boxShadow: `0 0 ${10 * S}px ${C.primary}`,
        }} />
        {/* Sweep arm */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 100 * S, height: 2 * S,
          background: `linear-gradient(to right, ${C.primary}, transparent)`,
          transformOrigin: "left center",
          transform: `rotate(${sweepDeg}deg)`,
          boxShadow: `0 0 ${8 * S}px ${C.primary}88`,
        }} />

        {/* Error markers */}
        {errors.map((err, i) => {
          const eF = Math.max(0, f - err.delay);
          const eOp = interpolate(eF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const eScale = easeOutBack(prog(eF, 18));
          const rad = (err.angle * Math.PI) / 180;
          const cx = 100 * S + Math.cos(rad) * 65 * S;
          const cy = 100 * S + Math.sin(rad) * 65 * S;
          return (
            <div key={i} style={{
              position: "absolute",
              left: cx, top: cy,
              transform: `translate(-50%, -50%) scale(${eScale})`,
              opacity: eOp,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3 * S,
            }}>
              <div style={{
                width: 28 * S, height: 28 * S, borderRadius: "50%",
                background: C.red,
                boxShadow: `0 0 ${10 * S}px ${C.red}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18 * S, color: "#fff", fontWeight: "700",
              }}>✗</div>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 18 * S, color: C.red, fontWeight: "700",
                whiteSpace: "nowrap" as const,
                textShadow: `0 0 ${6 * S}px rgba(0,0,0,0.8)`,
              }}>{err.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_05_04.title.to - SCENES_2026_05_04.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(60);
  const tagStyle = useFadeUp(86);

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
            borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
          }}>每日 AI 知識庫</span>
        </div>

        {/* H1 line 1 */}
        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 36 * S, color: C.text,
        }}>
          <WordReveal text="現在學 AI 的人" startFrame={10} staggerPerWord={6}
            fontSize={36 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 — neon green accent */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 8 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 32 * S, color: C.primary,
        }}>
          <WordReveal text="五年後的優勢是什麼？" startFrame={32} staggerPerWord={6}
            fontSize={32 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle,
          marginTop: 22 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
        }}>
          不是「會不會被取代」——而是你正在累積什麼
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 18 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>判斷直覺 · 認知資產 · 複利效應</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation: AccumulationStackAnimation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <AccumulationStackAnimation triggerFrame={405} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — 學 AI 學的到底是什麼 ──────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_04.scene1.to - SCENES_2026_05_04.scene1.from;
  // Scene 1 starts at global 705. Local frame = global - 705.
  // VTT-based delays:
  // 23.5s "首先,我們得先搞清楚,學AI學的到底是什麼" → local 0
  // 29.5s "很多人以為...學工具,背prompt模板" → local 180
  // 40s   "他們在學的是一種對AI行為的直覺" → local 495
  //   ↓ Phase A → B
  // 53s   "這種直覺只能從大量的實際使用中養成" → local 885 (Phase B first sentence)
  // 66s   "這些都是可以重複用的認知資產" → local 1275
  // 70s   "重要的是,五年後AI工具會比現在強很多" → local 1395

  const HEADER_AT     = 0;
  const COMPARE_AT    = 180;
  const HIGHLIGHT_AT  = 495;

  // Phase A → B boundary
  const A_FADE_START = 805;  // 53*30 - 705 - 80
  const A_REMOVE     = 885;  // 53*30 - 705
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT       = 885;
  const ASSET_AT        = 1275;
  const FIVE_YEAR_AT    = 1395;
  const showB           = frame >= B_SHOW_AT;

  const headerStyle    = useFadeUp(HEADER_AT);
  const compareStyle   = useFadeUp(COMPARE_AT);
  const highlightStyle = useFadeIn(HIGHLIGHT_AT);
  const useStyle       = useFadeUp(showB ? B_SHOW_AT : 999999);
  const assetStyle     = useFadeIn(showB ? ASSET_AT : 999999);
  const fiveYearStyle  = useFadeUp(showB ? FIVE_YEAR_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Header card */}
            <div style={{ ...headerStyle, marginBottom: 18 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
                marginBottom: 12 * S,
              }}>QUESTION</div>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S,
                padding: `${20 * S}px ${24 * S}px`,
                boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.06)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.4,
                }}>「學 AI」<span style={{ color: C.primary }}>學的到底是什麼？</span></div>
              </div>
            </div>

            {/* Comparison card */}
            <div style={{ ...compareStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S,
                padding: `${18 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 14 * S,
                }}>多數人 vs 真正在累積的人</div>

                <div style={{
                  display: "flex", flexDirection: "column", gap: 12 * S,
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12 * S,
                  }}>
                    <span style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                      color: C.red, letterSpacing: "0.06em",
                      background: C.redLight, border: `1px solid ${C.redBorder}`,
                      borderRadius: 6 * S, padding: `${4 * S}px ${10 * S}px`,
                      flexShrink: 0,
                    }}>表面</span>
                    <span style={{
                      fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                      color: C.text, lineHeight: 1.5,
                    }}>上課、學工具、背 Prompt 模板</span>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12 * S,
                  }}>
                    <span style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                      color: C.primary, letterSpacing: "0.06em",
                      background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                      borderRadius: 6 * S, padding: `${4 * S}px ${10 * S}px`,
                      flexShrink: 0,
                    }}>真正</span>
                    <span style={{
                      fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                      color: C.text, lineHeight: 1.5, fontWeight: "700",
                    }}>一種對 <span style={{ color: C.primary }}>AI 行為</span> 的直覺</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Highlight: 對 AI 行為的直覺 */}
            <div style={{ ...highlightStyle }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: "700", lineHeight: 1.4,
                }}>知道何時該用 · 何時會出錯 · 何時要自己來</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            {/* "從使用中養成" card */}
            <div style={{ ...useStyle, marginBottom: 18 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 12 * S,
              }}>從使用中養成</div>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 12 * S, marginBottom: 12 * S,
                }}>
                  <span style={{ fontSize: 22 * S, flexShrink: 0 }}>✗</span>
                  <span style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                    color: C.text, lineHeight: 1.55,
                  }}>用過 AI 在某情境下出錯 → <span style={{ color: C.red }}>你記住了</span></span>
                </div>
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 12 * S,
                }}>
                  <span style={{ fontSize: 22 * S, flexShrink: 0 }}>✓</span>
                  <span style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                    color: C.text, lineHeight: 1.55,
                  }}>試過某種提問特別有效 → <span style={{ color: C.primary }}>你內化了</span></span>
                </div>
              </div>
            </div>

            {/* 認知資產 highlight */}
            <div style={{ ...assetStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: "700", lineHeight: 1.4,
                }}>= 可重複使用的<span style={{ color: C.text }}> 認知資產</span></div>
              </div>
            </div>

            {/* 五年後對比 */}
            <div style={{ ...fiveYearStyle }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>五年後</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55,
                }}>AI 工具會更強，但 <span style={{ color: C.primary, fontWeight: "700" }}>判斷力不會自動升級</span>——必須現在開始累積</div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ToolsVsBrainAnimation triggerLocalFrame={375} />
        <IntuitionAccumulateAnimation triggerLocalFrame={1275} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — 為什麼早學的優勢比你想的還要大 ──────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_04.scene2.to - SCENES_2026_05_04.scene2.from;
  // Scene 2 starts at global 2835.
  // VTT-based delays:
  // 94.5s  "第二個角度,為什麼早學的優勢比你想的還要大" → local 0
  // 99.5s  "學AI有一個很強的複利效應" → local 150
  // 103.5s "你現在學會用AI整理資料" → local 270
  // 121s   "每一步累積讓下一步變得更容易" → local 795
  // 125s   "現在還在觀望的人" → local 915
  //   ↓ Phase A → B
  // 135s   "還有另一個維度" → local 1215 (Phase B first sentence)
  // 140s   "今天花時間搞懂AI是怎麼運作的" → local 1365
  // 150s   "只會操作特定工具的人,每次更新都像重新入門" → local 1665
  // 155.5s "你工作上有沒有一件事" → local 1830 (reflection)

  const HEADER_AT      = 0;
  const COMPOUND_AT    = 150;
  const FIVE_YEAR_AT   = 915;

  // Phase A → B boundary
  const A_FADE_START = 1135;  // 135*30 - 2835 - 80
  const A_REMOVE     = 1215;  // 135*30 - 2835
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT     = 1215;
  const PRINCIPLE_AT  = 1365;  // 140s → 1365
  const REFLECT_AT    = 1830;  // 155.5s → 1830
  const showB         = frame >= B_SHOW_AT;

  const headerStyle    = useFadeUp(HEADER_AT);
  const compoundStyle  = useFadeUp(COMPOUND_AT);
  const fiveYearStyle  = useFadeUp(FIVE_YEAR_AT);
  const evolveStyle    = useFadeUp(showB ? B_SHOW_AT : 999999);
  const principleStyle = useFadeUp(showB ? PRINCIPLE_AT : 999999);
  const reflectStyle   = useFadeIn(showB ? REFLECT_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A: 複利效應 ─────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Header */}
            <div style={{ ...headerStyle, marginBottom: 18 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.1em",
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
                marginBottom: 12 * S,
              }}>COMPOUND EFFECT</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                color: C.text, fontWeight: "700", lineHeight: 1.4,
              }}>學 AI 有一個很強的<span style={{ color: C.yellow }}> 複利效應</span></div>
            </div>

            {/* Compound chain card */}
            <div style={{ ...compoundStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 12 * S,
                }}>每一步讓下一步更容易</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.7,
                }}>
                  <span style={{ color: C.primary, fontWeight: "700" }}>整理資料</span>
                  {" → "}
                  <span style={{ color: C.primary, fontWeight: "700" }}>分析</span>
                  {" → "}
                  <span style={{ color: C.primary, fontWeight: "700" }}>做簡報</span>
                  {" → "}
                  <span style={{ color: C.primary, fontWeight: "700" }}>整個工作流程</span>
                </div>
              </div>
            </div>

            {/* Five-year compare highlight */}
            <div style={{ ...fiveYearStyle }}>
              <div style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(255,209,102,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55,
                }}>觀望的人五年後追的不只是工具——是<span style={{ color: C.yellow, fontWeight: "700" }}> 整整五年的判斷力累積</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B: 工具演化 vs 原理 ───────── */}
        {showB && (
          <>
            {/* Tool evolution */}
            <div style={{ ...evolveStyle, marginBottom: 18 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
                marginBottom: 12 * S,
              }}>另一個維度</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "700", lineHeight: 1.4,
              }}>AI 工具<span style={{ color: C.red }}> 快速演化</span>——只會操作特定工具的人，<span style={{ color: C.red }}>每次更新都像重新入門</span></div>
            </div>

            {/* Principle vs tool comparison card */}
            <div style={{ ...principleStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${18 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 12 * S,
                }}>搞懂原理的人</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55, marginBottom: 8 * S,
                }}>
                  有能力<span style={{ color: C.primary, fontWeight: "700" }}> 評估新工具</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55,
                }}>
                  不用每次換代都<span style={{ color: C.primary, fontWeight: "700" }}> 從零開始學</span>
                </div>
              </div>
            </div>

            {/* Reflection */}
            <div style={{
              ...reflectStyle,
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.muted, lineHeight: 1.6, fontStyle: "italic",
              borderLeft: `3px solid ${C.primary}`, paddingLeft: 18 * S,
            }}>
              AI 的學習曲線跟工作上其他事一樣——早點開始，現在就輕鬆很多
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <CompoundChainAnimation triggerLocalFrame={150} />
        <WallOfVersionsAnimation triggerLocalFrame={1275} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 三個方向給你參考 ─────────────────────────────────────────────
// Card uses dim → bright pattern (always rendered, brightens at activeAt)
function DirectionCard({ index, label, title, body, color, activeAt, entranceAt }: {
  index: number; label: string; title: string; body: string;
  color: string; activeAt: number; entranceAt: number;
}) {
  const frame = useCurrentFrame();
  // Entrance animation
  const entF = Math.max(0, frame - entranceAt);
  const entOp = interpolate(entF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const entTy = interpolate(entF, [0, 22], [22 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  // Dim → bright
  const dimF = Math.max(0, frame - activeAt);
  const activeT = interpolate(dimF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const opMult = interpolate(activeT, [0, 1], [0.32, 1], clamp);

  return (
    <div style={{
      opacity: entOp * opMult, transform: `translateY(${entTy}px)`,
      marginBottom: 14 * S, position: "relative",
    }}>
      <div style={{
        background: `${color}10`,
        border: `1.5px solid ${color}`,
        borderRadius: 14 * S,
        padding: `${14 * S}px ${20 * S}px`,
        boxShadow: activeT > 0.5 ? `0 0 ${20 * S}px ${color}33` : "none",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color, letterSpacing: "0.08em", marginBottom: 8 * S,
        }}>{`0${index + 1}. ${label}`}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
          color: C.text, fontWeight: "700", lineHeight: 1.35, marginBottom: 6 * S,
        }}>{title}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, lineHeight: 1.6,
        }}>{body}</div>
        <RippleRing activeAt={activeAt} color={color} />
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_04.scene3.to - SCENES_2026_05_04.scene3.from;
  // Scene 3 starts at global 4965.
  // VTT-based delays:
  // 165.5s "那現在可以怎麼做呢" → local 0
  // 167.5s "三個方向給你參考" → local 60
  // 169.5s "第一,把AI帶進你最熟悉的工作" → local 120 (Card 1 active)
  // 188s   "第二,練習提問" → local 675 (Card 2 active)
  // 204.5s "第三,也是最重要的" → local 1170 (Card 3 active)
  // 223.5s "你現在的工作裡" → local 1740 (Reflection)

  const HEADER_AT       = 0;
  const SUBHEAD_AT      = 60;
  const CARD_ENTRANCE_AT = 60;
  const CARD1_ACTIVE_AT  = 120;
  const CARD2_ACTIVE_AT  = 675;
  const CARD3_ACTIVE_AT  = 1170;
  const REFLECT_AT       = 1740;

  const headerStyle  = useFadeUp(HEADER_AT);
  const subheadStyle = useFadeIn(SUBHEAD_AT);
  const reflectStyle = useFadeUp(REFLECT_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Header */}
        <div style={{ ...headerStyle, marginBottom: 8 * S }}>
          <div style={{
            display: "inline-block",
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.1em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
            marginBottom: 10 * S,
          }}>HOW TO START</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26 * S,
            color: C.text, fontWeight: "700", lineHeight: 1.3,
          }}>三個方向給你參考</div>
        </div>

        {/* Subhead */}
        <div style={{
          ...subheadStyle, marginBottom: 18 * S,
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, lineHeight: 1.6,
        }}>從今天就可以開始的具體方法</div>

        {/* Direction cards */}
        <DirectionCard
          index={0}
          label="從熟悉的領域切入"
          title="把 AI 帶進你最熟悉的工作"
          body="你有背景知識才能判斷答案對錯——最快養成判斷力的方式"
          color={C.primary}
          activeAt={CARD1_ACTIVE_AT}
          entranceAt={CARD_ENTRANCE_AT}
        />
        <DirectionCard
          index={1}
          label="練習提問"
          title="不只是接受答案，要追問"
          body="問為什麼、有沒有更好的方式、有什麼限制——從使用者升級為協作者"
          color={C.yellow}
          activeAt={CARD2_ACTIVE_AT}
          entranceAt={CARD_ENTRANCE_AT + 20}
        />
        <DirectionCard
          index={2}
          label="關注 AI 出錯之處"
          title="知道何時不能信任 AI"
          body="AI 素養的核心——那些知道何時要自己判斷的人，五年後才是不可取代的"
          color={C.primary}
          activeAt={CARD3_ACTIVE_AT}
          entranceAt={CARD_ENTRANCE_AT + 40}
        />

        {/* Reflection card */}
        <div style={{ ...reflectStyle }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
            borderLeft: `3px solid ${C.primary}`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>從一件小事開始</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
              color: C.text, lineHeight: 1.5,
            }}>不用完美，從今天的一個任務讓 AI 參與就好</div>
          </div>
        </div>
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ScanningRadarAnimation triggerLocalFrame={1320} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene ────────────────────────────────────────────────────────────
function SummaryCard({ number, text, delay, color, border }: {
  number: string; text: string; delay: number; color: string; border: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 18 * S }}>
      <div style={{
        display: "flex", gap: 16 * S, alignItems: "flex-start",
        background: `${border}12`,
        border: `1px solid ${border}`,
        borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
          color, fontWeight: "700", flexShrink: 0, marginTop: 2 * S,
          textShadow: `0 0 ${10 * S}px ${color}88`,
        }}>{number}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.text, lineHeight: 1.65,
        }}>{text}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_05_04.summary.to - SCENES_2026_05_04.summary.from;
  // Summary starts at global 7020 (234s).
  // VTT-based delays (local = global - 7020):
  // 234s "今天的重點整理" → local 0
  // 236s "第一,學AI學的不是工具操作" → local 60
  // 243s "第二,複利效應" → local 270
  // 250s "第三,從你最熟悉的工作切入" → local 480
  // 256s "這裡是每日AI知識庫" → local 660

  const BADGE_AT  = 0;
  const CARD1_AT  = 60;
  const CARD2_AT  = 270;
  const CARD3_AT  = 480;
  const OUTRO_AT  = 660;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{ ...badgeStyle, marginBottom: 22 * S, marginTop: 28 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>
            <WordReveal text="重點整理" startFrame={4} staggerPerWord={5}
              fontSize={18 * S} color={C.primary}
              fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
          </span>
        </div>

        <SummaryCard
          number="01" delay={CARD1_AT}
          text="學 AI 學的不是工具操作，是對 AI 行為的判斷直覺"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="02" delay={CARD2_AT}
          text="複利效應讓早學者的優勢越來越大，追趕成本越來越高"
          color={C.yellow} border={C.yellow}
        />
        <SummaryCard
          number="03" delay={CARD3_AT}
          text="從你熟悉的工作切入、練習提問、觀察 AI 的失敗——這三件事今天就可以開始"
          color={C.primary} border={C.primary}
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
// ── Main Composition ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export function VideoComposition_2026_05_04() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_04.scene1;
  const S2 = SCENES_2026_05_04.scene2;
  const S3 = SCENES_2026_05_04.scene3;
  const SU = SCENES_2026_05_04.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-05-04-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_05_04 - 150, TOTAL_FRAMES_2026_05_04],
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

      {/* Scene 1 — 學 AI 學的到底是什麼 */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — 為什麼早學的優勢比你想的還要大 */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — 三個方向給你參考 */}
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
