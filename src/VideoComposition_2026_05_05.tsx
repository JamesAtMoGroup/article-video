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
  blue:         "#93c5fd",
  blueLight:    "rgba(147,197,253,0.10)",
  blueBorder:   "rgba(147,197,253,0.5)",
} as const;

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W       = 290 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLOT    = 148 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// TitleScene:   0s–23.760s    → 0–713
// Scene1:       23.760s–91.520s  → 713–2746   (Temperature 是什麼 + 低溫 vs 高溫)
// Scene2:       91.520s–163.760s → 2746–4913  (低/高溫應用 + AI 隨機性警告)
// Scene3:       163.760s–222.960s → 4913–6689 (三個實用框架)
// Summary:      222.960s–253.7s → 6689–7610   (重點整理 + 結尾)
export const SCENES_2026_05_05 = {
  title:   { from: 0,    to: 713   },
  scene1:  { from: 713,  to: 2746  },
  scene2:  { from: 2746, to: 4913  },
  scene3:  { from: 4913, to: 6689  },
  summary: { from: 6689, to: 7610  },
} as const;
export const TOTAL_FRAMES_2026_05_05 = 7610;

const CHAPTERS = [
  { label: "今日焦點",            start: 0    },
  { label: "Temperature 是什麼",  start: 713  },
  { label: "何時用高溫 / 低溫",   start: 2746 },
  { label: "三個實用框架",        start: 4913 },
  { label: "重點整理",            start: 6689 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // 01:21.280 "你平常用AI時,比較希望拿到穩定可靠的答案" → frame 2438
  { from: 2400, to: 2746, sender: "想一想", text: "你平常用 AI，比較希望拿到「穩定可靠」的答案，還是「多樣有創意」的回應？" },
  // 02:36.640 "如果你在用AI幫你寫一份重要的合約摘要" → frame 4699
  { from: 4660, to: 4913, sender: "親身經歷", text: "用 AI 寫一份重要的合約摘要——你希望溫度高還是低？為什麼？" },
  // 03:36.480 "你最常用AI做什麼任務" → frame 6494
  { from: 6450, to: 6689, sender: "套用框架", text: "你最常用 AI 做什麼任務？用今天的框架想一想——適合高溫還是低溫？" },
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
        background: "radial-gradient(circle, rgba(255,107,107,0.05) 0%, transparent 70%)",
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

// 1. ThermometerAnimation — TitleScene (right)
// VTT trigger: 8.560s "叫做 temperature" → global frame 257
// DURATION 450 (covers through end of TitleScene at 713)
function ThermometerAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 450;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Mercury rises from low to high over ~150 frames, then oscillates
  const baseRise = interpolate(f, [0, 150], [0.1, 0.85], { easing: E.outExpo, extrapolateRight: "clamp" });
  const oscillation = Math.sin((f - 150) * 0.05) * 0.12;
  const mercuryT = Math.max(0.05, Math.min(0.95, baseRise + (f > 150 ? oscillation : 0)));
  const mercuryHeight = mercuryT * 180 * S;

  // Bulb glow pulse
  const glow = Math.sin(f * 0.08) * 0.25 + 0.75;

  // Mercury color blends from blue (cool) to red (hot)
  const mercuryColor = mercuryT < 0.5
    ? `linear-gradient(to top, rgba(147,197,253,0.9), rgba(255,209,102,0.7))`
    : `linear-gradient(to top, rgba(255,209,102,0.85), rgba(255,107,107,0.95))`;

  return (
    <div style={{
      position: "absolute", right: 100 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.12em",
      }}>TEMPERATURE</div>

      <div style={{ position: "relative", width: 100 * S, height: 260 * S }}>
        {/* Tube */}
        <div style={{
          position: "absolute", left: 40 * S, top: 0, width: 20 * S, height: 200 * S,
          background: "rgba(255,255,255,0.06)",
          border: `${2 * S}px solid ${C.primaryBorder}`,
          borderRadius: `${10 * S}px ${10 * S}px 0 0`,
          overflow: "hidden",
        }}>
          {/* Mercury */}
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            height: mercuryHeight,
            background: mercuryColor,
            boxShadow: `inset 0 0 ${6 * S}px rgba(255,255,255,0.2)`,
          }} />
        </div>

        {/* Tick marks beside tube */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <div key={i} style={{
            position: "absolute", right: 30 * S, bottom: 60 * S + t * 180 * S,
            width: 12 * S, height: 2 * S,
            background: C.muted,
          }} />
        ))}

        {/* Bulb */}
        <div style={{
          position: "absolute", left: 20 * S, bottom: 0,
          width: 60 * S, height: 60 * S, borderRadius: "50%",
          background: `radial-gradient(circle, ${C.red}, rgba(255,107,107,0.5))`,
          border: `${3 * S}px solid ${C.red}`,
          boxShadow: `0 0 ${20 * S * glow}px ${C.red}, inset 0 0 ${10 * S}px rgba(255,255,255,0.3)`,
        }} />
      </div>

      {/* Bottom labels */}
      <div style={{
        display: "flex", justifyContent: "space-between", width: 200 * S,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
      }}>
        <span style={{ color: C.blue }}>❄ 穩定</span>
        <span style={{ color: C.red }}>🔥 創意</span>
      </div>
    </div>
  );
}

// 2. KnobDialAnimation — Scene1 Phase A (right)
// VTT trigger: 26.640s "簡單說...是一個...旋鈕" → frame 799 → local 86
// DURATION 311 (covers through "AI模型其實會算出每個可能回答的機率" at 34s = local 307)
function KnobDialAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 311;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Rotate from -100deg to +100deg, oscillating
  const sweep = Math.sin(f * 0.045) * 100;

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 240 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.1em",
      }}>RANDOMNESS DIAL</div>

      <div style={{
        position: "relative", width: 200 * S, height: 200 * S,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,255,178,0.12) 0%, rgba(0,0,0,0.7) 70%)",
        border: `${3 * S}px solid ${C.primary}`,
        boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.3)`,
      }}>
        {/* Tick marks */}
        {[-100, -50, 0, 50, 100].map((angle, i) => (
          <div key={i} style={{
            position: "absolute", top: "50%", left: "50%",
            width: 3 * S, height: 90 * S,
            background: i === 2 ? C.primary : "rgba(255,255,255,0.4)",
            transformOrigin: "center bottom",
            transform: `translate(-50%, -100%) rotate(${angle}deg)`,
            borderRadius: 2 * S,
          }} />
        ))}

        {/* Indicator arrow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 6 * S, height: 80 * S,
          background: `linear-gradient(to top, ${C.primary}, ${C.yellow})`,
          borderRadius: 3 * S,
          transformOrigin: "center bottom",
          transform: `translate(-50%, -100%) rotate(${sweep}deg)`,
          boxShadow: `0 0 ${12 * S}px ${C.primary}`,
        }} />

        {/* Center cap */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 32 * S, height: 32 * S, borderRadius: "50%",
          background: C.primary,
          border: `${2 * S}px solid #000`,
          boxShadow: `0 0 ${15 * S}px ${C.primary}`,
        }} />
      </div>

      {/* Range labels */}
      <div style={{
        display: "flex", justifyContent: "space-between", width: 220 * S,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted,
      }}>
        <span style={{ color: C.blue }}>LOW · 0</span>
        <span style={{ color: C.red }}>HIGH · 1+</span>
      </div>
    </div>
  );
}

// 3. ProbabilityBarsAnimation — Scene1 Phase A (left)
// VTT trigger: 37.440s "比如吐司70%,燕麥20%,火鍋2%" → frame 1123 → local 410
// DURATION 263 (covers through 43.2s "溫度低的時候接近0" → local 583)
function ProbabilityBarsAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 263;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Single VTT cue 37.440s-43.200s = 172 frames; bars stagger across cue
  const items = [
    { label: "吐司", value: 70, delay: 0,  color: C.primary },
    { label: "燕麥", value: 20, delay: 30, color: C.yellow },
    { label: "火鍋", value: 2,  delay: 60, color: C.red },
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>P(早餐 | 今天) %</div>

      <div style={{
        display: "flex", alignItems: "flex-end", gap: 22 * S, height: 200 * S,
      }}>
        {items.map((item, i) => {
          const itemF = Math.max(0, f - item.delay);
          const heightPct = interpolate(itemF, [0, 30], [0, item.value], { easing: E.outExpo, extrapolateRight: "clamp" });
          const barH = (heightPct / 100) * 180 * S;
          const labelOp = interpolate(itemF, [10, 30], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
            }}>
              <div style={{
                opacity: labelOp,
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: item.color, fontWeight: "700",
                textShadow: `0 0 ${6 * S}px ${item.color}88`,
              }}>{Math.round(heightPct)}%</div>
              <div style={{
                width: 50 * S, height: barH,
                background: `linear-gradient(to top, ${item.color}, ${item.color}88)`,
                borderRadius: `${4 * S}px ${4 * S}px 0 0`,
                boxShadow: `0 0 ${10 * S}px ${item.color}66`,
              }} />
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.text, fontWeight: "700",
              }}>{item.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 4. LowTempDartAnimation — Scene1 Phase B (right)
// VTT trigger: 43.200s "溫度低的時候接近0" → frame 1296 → local 583
// DURATION 380 (ends at local 963, before HighTempDart at 984)
function LowTempDartAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 380;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT delays from trigger:
  // 45.920s "AI幾乎每次都選最高機率" → f=82
  // 49.840s "回答很穩定" → f=199
  // Darts hit center sequentially across this period
  const darts = [
    { delay: 30 },
    { delay: 80 },
    { delay: 130 },
    { delay: 180 },
    { delay: 230 },
  ];

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.blue, letterSpacing: "0.08em",
      }}>低溫 · TEMPERATURE ≈ 0</div>

      <div style={{
        position: "relative", width: 200 * S, height: 200 * S,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(147,197,253,0.18) 0%, rgba(255,255,255,0.04) 50%, transparent 80%)",
        border: `${2 * S}px solid ${C.blueBorder}`,
        boxShadow: `0 0 ${15 * S}px rgba(147,197,253,0.3)`,
      }}>
        {/* Inner rings */}
        <div style={{
          position: "absolute", inset: 30 * S,
          borderRadius: "50%", border: `${1.5 * S}px solid rgba(147,197,253,0.3)`,
        }} />
        <div style={{
          position: "absolute", inset: 60 * S,
          borderRadius: "50%", border: `${1.5 * S}px solid rgba(147,197,253,0.4)`,
        }} />

        {/* Bullseye */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 18 * S, height: 18 * S, borderRadius: "50%",
          background: C.primary,
          boxShadow: `0 0 ${12 * S}px ${C.primary}`,
        }} />

        {/* Darts at center with tiny jitter */}
        {darts.map((d, i) => {
          const dF = Math.max(0, f - d.delay);
          const dOp = interpolate(dF, [0, 10], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const dScale = easeOutBack(prog(dF, 14));
          const dx = (i - 2) * 4 * S;
          const dy = ((i % 2) * 2 - 1) * 3 * S;
          return (
            <div key={i} style={{
              position: "absolute", top: "50%", left: "50%",
              transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${dScale})`,
              opacity: dOp,
              fontSize: 26 * S,
              filter: `drop-shadow(0 0 ${4 * S}px ${C.primary})`,
            }}>📌</div>
          );
        })}
      </div>

      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.blue, fontWeight: "700", textAlign: "center" as const,
      }}>每次都選最高機率<br />→ 穩定 · 可預測</div>
    </div>
  );
}

// 5. HighTempDartAnimation — Scene1 Phase B (right)
// VTT trigger: 56.560s "溫度高的時候,接近一甚至更高" → frame 1697 → local 984
// DURATION 405 (ends ~1389, before "不是越高越好" highlight)
function HighTempDartAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 405;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT delays from trigger:
  // 59.920s "AI會把低機率的選項也拉進來" → f=101
  // 63.680s "結果更多變,更有創意" → f=214
  // 65.920s "有時候出人意表,但...跑偏" → f=281
  const darts = [
    { delay: 30,  x: -55, y: -35 },
    { delay: 75,  x: 50,  y: -28 },
    { delay: 120, x: -32, y: 48  },
    { delay: 165, x: 58,  y: 28  },
    { delay: 210, x: -50, y: 8   },
    { delay: 260, x: 24,  y: -55 },
    { delay: 305, x: 10,  y: 60  },
  ];

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.red, letterSpacing: "0.08em",
      }}>高溫 · TEMPERATURE ≥ 1</div>

      <div style={{
        position: "relative", width: 200 * S, height: 200 * S,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,107,107,0.16) 0%, rgba(255,209,102,0.10) 50%, transparent 85%)",
        border: `${2 * S}px solid rgba(255,107,107,0.55)`,
        boxShadow: `0 0 ${18 * S}px rgba(255,107,107,0.35)`,
      }}>
        <div style={{
          position: "absolute", inset: 30 * S,
          borderRadius: "50%", border: `${1.5 * S}px solid rgba(255,107,107,0.3)`,
        }} />
        <div style={{
          position: "absolute", inset: 60 * S,
          borderRadius: "50%", border: `${1.5 * S}px solid rgba(255,209,102,0.4)`,
        }} />

        {/* Bullseye dimmed */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 16 * S, height: 16 * S, borderRadius: "50%",
          background: "rgba(255,255,255,0.25)",
        }} />

        {/* Scattered darts */}
        {darts.map((d, i) => {
          const dF = Math.max(0, f - d.delay);
          const dOp = interpolate(dF, [0, 10], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const dScale = easeOutBack(prog(dF, 14));
          return (
            <div key={i} style={{
              position: "absolute", top: "50%", left: "50%",
              transform: `translate(calc(-50% + ${d.x * S}px), calc(-50% + ${d.y * S}px)) scale(${dScale})`,
              opacity: dOp,
              fontSize: 26 * S,
              filter: `drop-shadow(0 0 ${4 * S}px ${C.red})`,
            }}>🎯</div>
          );
        })}
      </div>

      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.red, fontWeight: "700", textAlign: "center" as const,
      }}>把低機率也拉進來<br />→ 多變 · 有創意</div>
    </div>
  );
}

// 6. LowTempUseCasesAnimation — Scene2 Phase A (left)
// VTT trigger: 94.560s "比如翻譯、摘要、整理資料、寫程式" → frame 2837 → local 91
// DURATION 400 (covers through "更應該把溫度壓低" at 104.560s = local 391)
function LowTempUseCasesAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 400;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Single VTT cue 94.560s-98.880s = 129 frames lists 4 items; stagger 32f each
  const items = [
    { icon: "🌐", label: "翻譯",      delay: 0   },
    { icon: "📝", label: "摘要",      delay: 32  },
    { icon: "📊", label: "整理資料",  delay: 64  },
    { icon: "💻", label: "寫程式",    delay: 96  },
  ];
  // Verdict appears at f=233 (when "更應該把溫度壓低,確保輸出一致" at 104.56s = local 391, f=300)
  const verdictAppear = interpolate(Math.max(0, f - 233), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      width: 250 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.blue, letterSpacing: "0.08em",
      }}>LOW TEMP · 穩定任務</div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: 12 * S, width: "100%",
      }}>
        {items.map((it, i) => {
          const itF = Math.max(0, f - it.delay);
          const itOp = interpolate(itF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itTy = interpolate(itF, [0, 22], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: itOp, transform: `translateY(${itTy}px)`,
              background: C.blueLight,
              border: `${1.5 * S}px solid ${C.blueBorder}`,
              borderRadius: 10 * S,
              padding: `${10 * S}px ${12 * S}px`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
              boxShadow: `0 0 ${8 * S}px rgba(147,197,253,0.18)`,
            }}>
              <span style={{ fontSize: 26 * S }}>{it.icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.text, fontWeight: "700",
              }}>{it.label}</span>
            </div>
          );
        })}
      </div>

      {/* Verdict */}
      <div style={{
        opacity: verdictAppear,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.blue, fontWeight: "700", textAlign: "center" as const,
        background: C.blueLight, border: `1px solid ${C.blueBorder}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
      }}>輸出一致 · 自動化必備</div>
    </div>
  );
}

// 7. HighTempUseCasesAnimation — Scene2 Phase A (right)
// VTT trigger: 108.400s "高溫度適合需要創意的場景" → frame 3252 → local 506
// DURATION 380 (ends ~886, before Phase B at 909)
function HighTempUseCasesAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 380;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT cue 111.440s-115.120s "腦力激盪、廣告文案、故事創作" = 110 frames
  // trigger=506, items appear at f=91 (=local 597) onward, stagger 32f
  const items = [
    { icon: "💡", label: "腦力激盪",  delay: 91  },
    { icon: "📰", label: "廣告文案",  delay: 123 },
    { icon: "📖", label: "故事創作",  delay: 155 },
  ];
  // Verdict at "意想不到的角度" 115.120s = local 708, f=202
  const verdictAppear = interpolate(Math.max(0, f - 202), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      width: 250 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.red, letterSpacing: "0.08em",
      }}>HIGH TEMP · 創意任務</div>

      <div style={{
        display: "flex", flexDirection: "column", gap: 10 * S, width: "100%",
      }}>
        {items.map((it, i) => {
          const itF = Math.max(0, f - it.delay);
          const itOp = interpolate(itF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itTy = interpolate(itF, [0, 22], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: itOp, transform: `translateY(${itTy}px)`,
              display: "flex", alignItems: "center", gap: 14 * S,
              background: "rgba(255,107,107,0.10)",
              border: `${1.5 * S}px solid rgba(255,107,107,0.55)`,
              borderRadius: 10 * S,
              padding: `${10 * S}px ${14 * S}px`,
              boxShadow: `0 0 ${8 * S}px rgba(255,107,107,0.18)`,
            }}>
              <span style={{ fontSize: 26 * S }}>{it.icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                color: C.text, fontWeight: "700",
              }}>{it.label}</span>
            </div>
          );
        })}
      </div>

      <div style={{
        opacity: verdictAppear,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.red, fontWeight: "700", textAlign: "center" as const,
        background: "rgba(255,107,107,0.08)", border: `1px solid ${C.red}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
      }}>意想不到的角度</div>
    </div>
  );
}

// 8. RandomSelectionAnimation — Scene2 Phase B (left)
// VTT trigger: 125.680s "AI素養觀念" — too early. Use 125.680s = local 1024 (when "重要的AI素養觀念要特別說")
// Actually trigger when "本質上有隨機性" at 125.680s is mentioned
// Wait — 02:05.680 = 125.680s × 30 = 3770 → local 3770-2746=1024
// DURATION 460 (ends ~1484, before HighStakes at 1507)
function RandomSelectionAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 460;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT delays from trigger 1024:
  // 129.520s "AI的回答本質上有一定的隨機性" → f=116
  // 132.800s "它不是在找到唯一正確答案" → f=214
  // 136.640s "而是在根據機率選擇" → f=329
  const cursorIdx = Math.floor((f / 14) % 4);
  const answers = [
    { letter: "A", pct: 60 },
    { letter: "B", pct: 25 },
    { letter: "C", pct: 10 },
    { letter: "D", pct: 5  },
  ];
  // Verdict at f=329
  const verdictAppear = interpolate(Math.max(0, f - 329), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 240 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.yellow, letterSpacing: "0.08em",
      }}>P(answer | question)</div>

      <div style={{
        display: "flex", flexDirection: "column", gap: 8 * S, width: "100%",
      }}>
        {answers.map((a, i) => {
          const isActive = i === cursorIdx;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12 * S,
              background: isActive ? "rgba(255,209,102,0.18)" : "rgba(255,255,255,0.04)",
              border: `${1.5 * S}px solid ${isActive ? C.yellow : "rgba(255,255,255,0.1)"}`,
              borderRadius: 8 * S,
              padding: `${10 * S}px ${14 * S}px`,
              boxShadow: isActive ? `0 0 ${12 * S}px ${C.yellow}66` : "none",
            }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: isActive ? C.yellow : C.muted, fontWeight: "700",
                width: 24 * S,
              }}>{a.letter}</span>
              <div style={{
                flex: 1, height: 10 * S, borderRadius: 5 * S,
                background: "rgba(255,255,255,0.05)", overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${a.pct}%`,
                  background: isActive ? C.yellow : "rgba(255,255,255,0.25)",
                  borderRadius: 5 * S,
                }} />
              </div>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: isActive ? C.yellow : C.muted, fontWeight: "700",
              }}>{a.pct}%</span>
            </div>
          );
        })}
      </div>

      <div style={{
        opacity: verdictAppear,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.yellow, fontWeight: "700", textAlign: "center" as const,
        background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
      }}>不是「找答案」是「選機率」</div>
    </div>
  );
}

// 9. HighStakesDomainsAnimation — Scene2 Phase B (right)
// VTT trigger: 141.760s "比如法律文件、醫療資訊、財務數字" → frame 4253 → local 1507
// DURATION 400 (covers through "還是需要自己驗證" at 149.680s = local 1744, f=237)
function HighStakesDomainsAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 400;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT cue 141.760s-146.000s = 127 frames lists 3 domains
  const domains = [
    { icon: "⚖️", label: "法律文件", delay: 0  },
    { icon: "🏥", label: "醫療資訊", delay: 42 },
    { icon: "💰", label: "財務數字", delay: 84 },
  ];
  // Verdict at "你要特別謹慎,不能直接信任" 146.000s = local 1634, f=127
  const verdictAppear = interpolate(Math.max(0, f - 127), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 250 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.red, letterSpacing: "0.08em",
      }}>⚠ HIGH-STAKES</div>

      <div style={{
        display: "flex", flexDirection: "column", gap: 10 * S, width: "100%",
      }}>
        {domains.map((d, i) => {
          const dF = Math.max(0, f - d.delay);
          const dOp = interpolate(dF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const dTy = interpolate(dF, [0, 22], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: dOp, transform: `translateY(${dTy}px)`,
              display: "flex", alignItems: "center", gap: 14 * S,
              background: "rgba(255,107,107,0.12)",
              border: `${1.5 * S}px solid ${C.red}`,
              borderRadius: 10 * S,
              padding: `${10 * S}px ${14 * S}px`,
              boxShadow: `0 0 ${10 * S}px rgba(255,107,107,0.22)`,
            }}>
              <span style={{ fontSize: 28 * S }}>{d.icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                color: C.text, fontWeight: "700",
              }}>{d.label}</span>
              <span style={{
                marginLeft: "auto" as const, fontSize: 22 * S, color: C.red,
              }}>⚠</span>
            </div>
          );
        })}
      </div>

      <div style={{
        opacity: verdictAppear,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.red, fontWeight: "700", textAlign: "center" as const,
        background: "rgba(255,107,107,0.08)", border: `1px solid ${C.red}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
      }}>不能直接信任 · 自己驗證</div>
    </div>
  );
}

// 10. TaskClassificationAnimation — Scene3 (right) — Framework 1
// VTT trigger: 170.160s "第一,事實型任務調低,創意型任務調高" → frame 5105 → local 192
// DURATION 290 (ends ~482, before Framework 2 at 487)
function TaskClassificationAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 290;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT 172.480s-180.000s "翻譯、整理資料、寫程式...廣告文案、故事開頭、腦力激盪" = 226 frames
  // trigger=192, this cue starts at f=70
  const lowTasks = [
    { label: "翻譯",   delay: 70  },
    { label: "整理",   delay: 100 },
    { label: "寫程式", delay: 130 },
  ];
  const highTasks = [
    { label: "廣告",     delay: 170 },
    { label: "故事",     delay: 200 },
    { label: "腦力激盪", delay: 230 },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 12 * S,
      width: 260 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em", textAlign: "center" as const,
      }}>事實 vs 創意</div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 * S }}>
        {/* LOW column */}
        <div style={{
          flex: 1,
          background: C.blueLight,
          border: `${1.5 * S}px solid ${C.blueBorder}`,
          borderRadius: 10 * S,
          padding: `${10 * S}px ${10 * S}px`,
          display: "flex", flexDirection: "column", gap: 8 * S, alignItems: "center",
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.blue, fontWeight: "700",
          }}>LOW</div>
          {lowTasks.map((t, i) => {
            const tF = Math.max(0, f - t.delay);
            const tOp = interpolate(tF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
            const tTy = interpolate(tF, [0, 18], [12 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                opacity: tOp, transform: `translateY(${tTy}px)`,
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.text, fontWeight: "700",
              }}>{t.label}</div>
            );
          })}
        </div>

        {/* HIGH column */}
        <div style={{
          flex: 1,
          background: "rgba(255,107,107,0.10)",
          border: `${1.5 * S}px solid rgba(255,107,107,0.5)`,
          borderRadius: 10 * S,
          padding: `${10 * S}px ${10 * S}px`,
          display: "flex", flexDirection: "column", gap: 8 * S, alignItems: "center",
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.red, fontWeight: "700",
          }}>HIGH</div>
          {highTasks.map((t, i) => {
            const tF = Math.max(0, f - t.delay);
            const tOp = interpolate(tF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
            const tTy = interpolate(tF, [0, 18], [12 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                opacity: tOp, transform: `translateY(${tTy}px)`,
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.text, fontWeight: "700",
              }}>{t.label}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 11. MidpointDialAnimation — Scene3 (left) — Framework 2
// VTT trigger: 184.240s "預設溫度大約在0.7左右" → frame 5527 → local 614
// DURATION 365 (ends ~979, before Framework 3 at 986)
function MidpointDialAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 365;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Marker animates to 0.7 over 60 frames
  const markerPos = interpolate(f, [0, 60], [0, 0.7], { easing: E.outExpo, extrapolateRight: "clamp" });
  // Subtle pulse after settling
  const pulse = Math.sin(f * 0.1) * 0.04 + 1;
  // VTT 188.640s "有點靈活但不會太瘋的平衡點" → local 746, f=132
  const labelAppear = interpolate(Math.max(0, f - 132), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 260 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S,
      width: 280 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.yellow, letterSpacing: "0.1em",
      }}>DEFAULT ≈ 0.7</div>

      {/* Slider track */}
      <div style={{
        position: "relative", width: 220 * S, height: 14 * S,
        background: "linear-gradient(to right, rgba(147,197,253,0.5), rgba(255,209,102,0.6), rgba(255,107,107,0.6))",
        borderRadius: 7 * S,
        boxShadow: `0 0 ${10 * S}px rgba(255,209,102,0.3)`,
      }}>
        {/* Marker */}
        <div style={{
          position: "absolute", top: "50%", left: `${markerPos * 100}%`,
          transform: `translate(-50%,-50%) scale(${pulse})`,
          width: 28 * S, height: 28 * S, borderRadius: "50%",
          background: C.yellow,
          border: `${3 * S}px solid #fff`,
          boxShadow: `0 0 ${18 * S}px ${C.yellow}`,
        }} />
      </div>

      {/* Scale labels */}
      <div style={{
        display: "flex", justifyContent: "space-between", width: 220 * S,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted,
      }}>
        <span>0</span>
        <span style={{ color: C.yellow, fontWeight: "700" }}>0.7</span>
        <span>1</span>
      </div>

      <div style={{
        opacity: labelAppear,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.yellow, fontWeight: "700", textAlign: "center" as const,
        background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
      }}>有點靈活 · 不會太瘋</div>
    </div>
  );
}

// 12. ConsistencyLockAnimation — Scene3 (right) — Framework 3
// VTT trigger: 201.520s "第三,固定任務要固定設定" → frame 6046 → local 986
// DURATION 380 (covers through "輸出更一致,更容易品質控管" at 209.840s = local 1262, f=276)
function ConsistencyLockAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 380;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT delays from trigger 986:
  // 206.520s "把溫度設低" → f=147
  // 211.720s "甚至設成0" → f=303
  // Slider drops from 0.6 to 0 between f=147 and f=303
  const sliderVal = interpolate(f, [147, 200, 303, 350], [0.6, 0.4, 0.0, 0.0], { easing: E.outCubic, ...clamp });

  // Lock appears at f=303 ("設成 0")
  const lockOp = interpolate(Math.max(0, f - 303), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const lockScale = easeOutBack(prog(Math.max(0, f - 303), 22));

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 240 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.08em",
      }}>LOCK · 自動化流程</div>

      {/* Vertical slider */}
      <div style={{ position: "relative", width: 100 * S, height: 220 * S }}>
        {/* Track */}
        <div style={{
          position: "absolute", left: 45 * S, top: 0,
          width: 12 * S, height: "100%",
          background: "linear-gradient(to top, rgba(147,197,253,0.5), rgba(255,209,102,0.5), rgba(255,107,107,0.5))",
          borderRadius: 6 * S,
        }} />

        {/* Tick marks */}
        {[0, 0.5, 1].map((t, i) => (
          <div key={i} style={{
            position: "absolute", right: 25 * S, bottom: `${t * 100}%`,
            transform: "translateY(50%)",
            width: 14 * S, height: 2 * S, background: C.muted,
          }} />
        ))}

        {/* Marker (current temperature) */}
        <div style={{
          position: "absolute", left: 51 * S,
          bottom: `${sliderVal * 100}%`,
          transform: "translate(-50%, 50%)",
          width: 36 * S, height: 36 * S, borderRadius: "50%",
          background: C.primary,
          border: `${3 * S}px solid #fff`,
          boxShadow: `0 0 ${18 * S}px ${C.primary}`,
        }} />

        {/* Lock icon (appears when value reaches 0) */}
        <div style={{
          position: "absolute", left: 51 * S, bottom: "0%",
          transform: `translate(-50%, -110%) scale(${lockScale})`,
          opacity: lockOp,
          fontSize: 38 * S,
          filter: `drop-shadow(0 0 ${6 * S}px ${C.primary})`,
        }}>🔒</div>
      </div>

      {/* Value labels */}
      <div style={{
        display: "flex", justifyContent: "space-between", width: 200 * S,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted,
      }}>
        <span style={{ color: C.primary, fontWeight: "700" }}>0.0</span>
        <span>0.5</span>
        <span>1.0</span>
      </div>

      <div style={{
        opacity: lockOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.primary, fontWeight: "700", textAlign: "center" as const,
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
      }}>輸出一致 · 品質可控</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_05_05.title.to - SCENES_2026_05_05.title.from;
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

        {/* H1 line 1 — white */}
        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 36 * S, color: C.text,
        }}>
          <WordReveal text="什麼是 Temperature?" startFrame={10} staggerPerWord={6}
            fontSize={36 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 — primary green */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 8 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 30 * S, color: C.primary,
        }}>
          <WordReveal text="為什麼它決定 AI 有多有創意" startFrame={32} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle,
          marginTop: 22 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
        }}>
          一個旋鈕，控制 AI 是「穩定」還是「有創意」
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 18 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>機率分布 · 隨機性 · 任務匹配</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation: ThermometerAnimation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ThermometerAnimation triggerFrame={257} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — Temperature 是什麼 + 低溫 vs 高溫 ────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_05.scene1.to - SCENES_2026_05_05.scene1.from;
  // Scene 1 starts at global 713. local = global - 713.
  // VTT-aligned delays:
  // 23.760s "先說說 temperature 到底是什麼" → local 0
  // 26.640s "簡單說...是一個...旋鈕" → local 86
  // 34.000s "AI模型其實會算出每個可能回答的機率" → local 307
  //   ↓ Phase A → B (Phase B first sentence at 43.200s = local 583)
  // 43.200s "溫度低的時候接近0" → local 583 (Phase B starts)
  // 56.560s "溫度高的時候,接近一甚至更高" → local 984
  // 70.080s "所以 temperature 不是越高越好" → local 1389

  const HEADER_AT  = 0;
  const CONCEPT_AT = 86;
  const EXAMPLE_AT = 307;

  // Phase A → B boundary
  const A_FADE_START = 503;  // 583 - 80
  const A_REMOVE     = 583;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT  = 583;
  const HIGH_AT    = 984;
  const VERDICT_AT = 1389;
  const showB      = frame >= B_SHOW_AT;

  const headerStyle  = useFadeUp(HEADER_AT);
  const conceptStyle = useFadeIn(CONCEPT_AT);
  const exampleStyle = useFadeUp(EXAMPLE_AT);
  const lowStyle     = useFadeUp(showB ? B_SHOW_AT : 999999);
  const highStyle    = useFadeUp(showB ? HIGH_AT : 999999);
  const verdictStyle = useFadeIn(showB ? VERDICT_AT : 999999);

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
              }}>WHAT IS TEMPERATURE</div>
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
                }}>
                  <WordReveal text="Temperature 到底是什麼?" startFrame={HEADER_AT + 4} staggerPerWord={5}
                    fontSize={24 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={700} />
                </div>
              </div>
            </div>

            {/* Concept highlight: 旋鈕 */}
            <div style={{ ...conceptStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `${1.5 * S}px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.45,
                }}>
                  控制 AI 輸出 <span style={{ color: C.primary }}>「隨機程度」</span> 的旋鈕
                </div>
              </div>
            </div>

            {/* Example card */}
            <div style={{ ...exampleStyle }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>EXAMPLE · 早餐吃什麼</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55,
                }}>
                  AI 內部其實會算每個答案的<span style={{ color: C.primary, fontWeight: "700" }}> 機率分布</span>
                  ——吐司 70%、燕麥 20%、火鍋 2%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            {/* 低溫 card */}
            <div style={{ ...lowStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.blueLight,
                border: `${1.5 * S}px solid ${C.blueBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(147,197,253,0.18)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.blue, letterSpacing: "0.1em", marginBottom: 10 * S,
                }}>低溫 · TEMPERATURE ≈ 0</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55,
                }}>
                  幾乎每次都選<span style={{ color: C.blue, fontWeight: "700" }}> 最高機率 </span>那個
                  → <span style={{ color: C.blue, fontWeight: "700" }}>穩定 · 可預測</span>，但有點模板感
                </div>
              </div>
            </div>

            {/* 高溫 card */}
            <div style={{ ...highStyle, marginBottom: 16 * S }}>
              <div style={{
                background: "rgba(255,107,107,0.10)",
                border: `${1.5 * S}px solid ${C.red}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(255,107,107,0.18)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.red, letterSpacing: "0.1em", marginBottom: 10 * S,
                }}>高溫 · TEMPERATURE ≥ 1</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55,
                }}>
                  把<span style={{ color: C.red, fontWeight: "700" }}> 低機率選項 </span>也拉進來
                  → <span style={{ color: C.red, fontWeight: "700" }}>多變 · 有創意</span>，但有時跑偏
                </div>
              </div>
            </div>

            {/* Verdict highlight */}
            <div style={{ ...verdictStyle }}>
              <div style={{
                background: C.yellowLight,
                border: `${1.5 * S}px solid ${C.yellow}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${18 * S}px rgba(255,209,102,0.18)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.5,
                }}>
                  不是越高越好——<span style={{ color: C.yellow }}>看你的任務需要什麼</span>
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <KnobDialAnimation triggerLocalFrame={86} />
        <ProbabilityBarsAnimation triggerLocalFrame={410} />
        <LowTempDartAnimation triggerLocalFrame={583} />
        <HighTempDartAnimation triggerLocalFrame={984} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — 何時用低溫/高溫 + AI 隨機性警告 ─────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_05.scene2.to - SCENES_2026_05_05.scene2.from;
  // Scene 2 starts at global 2746. local = global - 2746.
  // VTT-aligned delays:
  // 91.520s "低溫度適合需要準確答案的場景" → local 0
  // 94.560s "比如翻譯、摘要、整理資料、寫程式" → local 91
  // 102.320s "如果你在做一個自動化流程" → local 324
  // 108.400s "高溫度適合需要創意的場景" → local 506
  //   ↓ Phase A → B (Phase B first sentence at 121.840s = local 909)
  // 121.840s "這裡有一個很重要的AI素養觀念要特別說" → local 909 (Phase B starts)
  // 125.680s "AI的回答本質上有一定的隨機性" → local 1024
  // 136.720s "所以在需要高度準確的場景下" → local 1356
  // 146.000s "你要特別謹慎,不能直接信任AI的輸出" → local 1634

  const LOW_HEADER_AT = 0;
  const LOW_CARD_AT   = 91;
  const HIGH_CARD_AT  = 506;

  // Phase A → B boundary
  const A_FADE_START = 829;  // 909 - 80
  const A_REMOVE     = 909;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT      = 909;
  const RANDOM_AT      = 1024;
  const HIGHSTAKES_AT  = 1356;
  const WARNING_AT     = 1634;
  const showB          = frame >= B_SHOW_AT;

  const lowHeaderStyle = useFadeUp(LOW_HEADER_AT);
  const lowCardStyle   = useFadeUp(LOW_CARD_AT);
  const highCardStyle  = useFadeUp(HIGH_CARD_AT);
  const bHeaderStyle   = useFadeUp(showB ? B_SHOW_AT : 999999);
  const randomStyle    = useFadeIn(showB ? RANDOM_AT : 999999);
  const highStakesStyle = useFadeUp(showB ? HIGHSTAKES_AT : 999999);
  const warningStyle   = useFadeIn(showB ? WARNING_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Header */}
            <div style={{ ...lowHeaderStyle, marginBottom: 18 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
                marginBottom: 12 * S,
              }}>WHEN TO USE</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                color: C.text, fontWeight: "700", lineHeight: 1.4,
              }}>
                <WordReveal text="什麼時候用低溫，什麼時候用高溫?" startFrame={LOW_HEADER_AT + 4} staggerPerWord={5}
                  fontSize={24 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={700} />
              </div>
            </div>

            {/* 低溫 use case card */}
            <div style={{ ...lowCardStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.blueLight,
                border: `${1.5 * S}px solid ${C.blueBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.blue, letterSpacing: "0.1em", marginBottom: 10 * S,
                }}>LOW TEMP · 穩定任務</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55, marginBottom: 12 * S,
                }}>
                  <span style={{ color: C.blue, fontWeight: "700" }}>翻譯 · 摘要 · 整理資料 · 寫程式</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.55,
                }}>
                  自動化流程 → 必須壓低，<span style={{ color: C.blue }}>確保輸出一致</span>
                </div>
              </div>
            </div>

            {/* 高溫 use case card */}
            <div style={{ ...highCardStyle }}>
              <div style={{
                background: "rgba(255,107,107,0.10)",
                border: `${1.5 * S}px solid ${C.red}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.red, letterSpacing: "0.1em", marginBottom: 10 * S,
                }}>HIGH TEMP · 創意任務</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55, marginBottom: 12 * S,
                }}>
                  <span style={{ color: C.red, fontWeight: "700" }}>腦力激盪 · 廣告文案 · 故事創作</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.55,
                }}>
                  希望 AI 給<span style={{ color: C.red }}>意想不到的角度</span>，不只最明顯的答案
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            {/* B Header */}
            <div style={{ ...bHeaderStyle, marginBottom: 18 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.red, letterSpacing: "0.1em",
                background: "rgba(255,107,107,0.10)", border: `1px solid ${C.red}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
                marginBottom: 12 * S,
              }}>⚠ AI 素養觀念</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                color: C.text, fontWeight: "700", lineHeight: 1.4,
              }}>
                <WordReveal text="AI 回答 本質上 有隨機性" startFrame={B_SHOW_AT + 4} staggerPerWord={5}
                  fontSize={24 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={700} />
              </div>
            </div>

            {/* 隨機性 highlight */}
            <div style={{ ...randomStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `${1.5 * S}px solid ${C.yellow}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${18 * S}px rgba(255,209,102,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.5,
                }}>
                  不是「找<span style={{ color: C.yellow }}>唯一正確答案</span>」——是「<span style={{ color: C.yellow }}>根據機率選擇</span>」
                </div>
              </div>
            </div>

            {/* 高精度場景 card */}
            <div style={{ ...highStakesStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.red}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.red, letterSpacing: "0.1em", marginBottom: 12 * S,
                }}>高精度場景 · 特別謹慎</div>
                <div style={{
                  display: "flex", flexWrap: "wrap" as const, gap: 12 * S,
                }}>
                  {[
                    { icon: "⚖️", label: "法律文件" },
                    { icon: "🏥", label: "醫療資訊" },
                    { icon: "💰", label: "財務數字" },
                  ].map((d, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10 * S,
                      background: "rgba(255,107,107,0.08)",
                      border: `1px solid ${C.redBorder}`,
                      borderRadius: 8 * S,
                      padding: `${8 * S}px ${14 * S}px`,
                    }}>
                      <span style={{ fontSize: 22 * S }}>{d.icon}</span>
                      <span style={{
                        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                        color: C.text, fontWeight: "700",
                      }}>{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Warning highlight */}
            <div style={{ ...warningStyle }}>
              <div style={{
                background: "rgba(255,107,107,0.10)",
                border: `${1.5 * S}px solid ${C.red}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${18 * S}px rgba(255,107,107,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.5,
                }}>
                  <span style={{ color: C.red }}>不能直接信任 AI</span>——還是要自己驗證
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <LowTempUseCasesAnimation triggerLocalFrame={91} />
        <HighTempUseCasesAnimation triggerLocalFrame={506} />
        <RandomSelectionAnimation triggerLocalFrame={1024} />
        <HighStakesDomainsAnimation triggerLocalFrame={1507} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 三個實用框架 ─────────────────────────────────────────────────
// FrameworkCard uses dim → bright pattern (always rendered, brightens at activeAt)
function FrameworkCard({ index, label, title, body, color, activeAt, entranceAt }: {
  index: number; label: string; title: string; body: string;
  color: string; activeAt: number; entranceAt: number;
}) {
  const frame = useCurrentFrame();
  // Entrance
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
        border: `${1.5 * S}px solid ${color}`,
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
  const dur = SCENES_2026_05_05.scene3.to - SCENES_2026_05_05.scene3.from;
  // Scene 3 starts at global 4913. local = global - 4913.
  // VTT-aligned delays:
  // 163.760s "最後三個實用的框架給你帶走" → local 0
  // 170.160s "第一,事實型任務調低,創意型任務調高" → local 192
  // 180.000s "第二,不確定的時候,先用中間值試試" → local 487
  // 184.240s "預設溫度大約在0.7左右" → local 614
  // 196.640s "第三,固定任務要固定設定" → local 986
  // 216.480s "你最常用AI做什麼任務" → local 1581 (reflection)
  // wait — let me recompute. 03:16.640 = 196.640s? No.
  // 03:16.640 = 3*60 + 16.640 = 196.640s × 30 = 5899. local = 5899 - 4913 = 986. ✓
  // 03:36.480 = 3*60 + 36.480 = 216.480s × 30 = 6494. local = 6494 - 4913 = 1581. ✓

  const HEADER_AT       = 0;
  const SUBHEAD_AT      = 60;
  const CARD_ENTRANCE_AT = 60;
  const CARD1_ACTIVE_AT  = 192;
  const CARD2_ACTIVE_AT  = 487;
  const CARD3_ACTIVE_AT  = 986;
  const REFLECT_AT       = 1581;

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
          }}>PRACTICAL FRAMEWORKS</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26 * S,
            color: C.text, fontWeight: "700", lineHeight: 1.3,
          }}>
            <WordReveal text="三個實用框架 給你帶走" startFrame={HEADER_AT + 4} staggerPerWord={5}
              fontSize={26 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={700} />
          </div>
        </div>

        {/* Subhead */}
        <div style={{
          ...subheadStyle, marginBottom: 18 * S,
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, lineHeight: 1.6,
        }}>
          從今天就可以用的三個判斷方式
        </div>

        {/* Framework cards */}
        <FrameworkCard
          index={0}
          label="FACT vs CREATIVE"
          title="事實型調低 · 創意型調高"
          body="翻譯、整理資料、寫程式 → 低溫；廣告文案、故事創作、腦力激盪 → 高溫"
          color={C.primary}
          activeAt={CARD1_ACTIVE_AT}
          entranceAt={CARD_ENTRANCE_AT}
        />
        <FrameworkCard
          index={1}
          label="START AT 0.7"
          title="不確定先用中間值試"
          body="多數工具預設約 0.7，有點靈活但不會太瘋——從這裡開始，再依結果調整"
          color={C.yellow}
          activeAt={CARD2_ACTIVE_AT}
          entranceAt={CARD_ENTRANCE_AT + 20}
        />
        <FrameworkCard
          index={2}
          label="LOCK FOR CONSISTENCY"
          title="固定任務 · 固定設定"
          body="自動化流程要把溫度壓低、甚至設成 0——輸出一致、品質可控"
          color={C.primary}
          activeAt={CARD3_ACTIVE_AT}
          entranceAt={CARD_ENTRANCE_AT + 40}
        />

        {/* Reflection card */}
        <div style={{ ...reflectStyle }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
            borderLeft: `${3 * S}px solid ${C.primary}`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>套用練習</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
              color: C.text, lineHeight: 1.55,
            }}>你最常用 AI 做什麼任務？適合<span style={{ color: C.primary, fontWeight: "700" }}> 高溫還是低溫 </span>?</div>
          </div>
        </div>
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <TaskClassificationAnimation triggerLocalFrame={192} />
        <MidpointDialAnimation triggerLocalFrame={614} />
        <ConsistencyLockAnimation triggerLocalFrame={986} />
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
  const dur = SCENES_2026_05_05.summary.to - SCENES_2026_05_05.summary.from;
  // Summary starts at global 6689 (222.960s).
  // VTT delays (local = global - 6689):
  // 222.960s "好,今天重點整理" → local 0
  // 224.720s "第一,temperature是控制AI輸出隨機程度的參數" → local 53
  // 232.960s "第二,事實型任務用低溫度,創意型任務用高溫度" → local 300
  // 238.240s "第三,AI的輸出本質有隨機性" → local 458
  // 248.000s "這裡是每日AI知識庫" → local 751

  const BADGE_AT = 0;
  const CARD1_AT = 53;
  const CARD2_AT = 300;
  const CARD3_AT = 458;
  const OUTRO_AT = 751;

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
          text="Temperature 是控制 AI 輸出「隨機程度」的旋鈕——影響穩定性與創意性"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="02" delay={CARD2_AT}
          text="事實型任務調低、創意型任務調高；不確定就從 0.7 開始試"
          color={C.yellow} border={C.yellow}
        />
        <SummaryCard
          number="03" delay={CARD3_AT}
          text="AI 輸出本質有隨機性——法律、醫療、財務等高精度場景，務必自己驗證"
          color={C.red} border={C.red}
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
export function VideoComposition_2026_05_05() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_05.scene1;
  const S2 = SCENES_2026_05_05.scene2;
  const S3 = SCENES_2026_05_05.scene3;
  const SU = SCENES_2026_05_05.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-05-05-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_05_05 - 150, TOTAL_FRAMES_2026_05_05],
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

      {/* Scene 1 — Temperature 是什麼 + 低溫 vs 高溫 */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — 何時用低溫/高溫 + AI 隨機性警告 */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — 三個實用框架 */}
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
