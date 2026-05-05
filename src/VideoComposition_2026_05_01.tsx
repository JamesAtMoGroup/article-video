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
const SUBTITLE_SAFE = 120 * S;  // 360px — 勿改
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
const NOTIF_W       = 320 * S;
const NOTIF_TOP     = 14  * S;
const NOTIF_RIGHT   = 22  * S;
const NOTIF_SLOT    = 170 * S;
const NOTIF_SLIDE_H = 130 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// TitleScene:   0s–26.84s    → 0–805
// Scene1 Meta:  26.84s–123.20s → 805–3696
// Scene2 Price: 123.20s–215.96s → 3696–6479
// Scene3 Siri:  215.96s–295.40s → 6479–8862
// Summary:      295.40s–336s     → 8862–10080
export const SCENES_2026_05_01 = {
  title:   { from: 0,    to: 805   },
  scene1:  { from: 805,  to: 3696  },
  scene2:  { from: 3696, to: 6479  },
  scene3:  { from: 6479, to: 8862  },
  summary: { from: 8862, to: 10080 },
} as const;
export const TOTAL_FRAMES_2026_05_01 = 10080;

const CHAPTERS = [
  { label: "今日焦點",          start: 0    },
  { label: "Meta 超級智慧",     start: 805  },
  { label: "AI 工具計費",       start: 3696 },
  { label: "Gemini 進 Siri",   start: 6479 },
  { label: "本週重點",          start: 8862 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 3404, to: 3696, sender: "想一想",   text: "當幾家巨頭都在用千億美元追求超級智慧，你覺得這場競賽的終點是什麼？誰有資格決定方向？" },
  { from: 6126, to: 6479, sender: "親身經歷", text: "如果 AI 工具開始計量收費，你會更謹慎選擇哪些任務交給 AI 嗎？" },
  { from: 8593, to: 8862, sender: "想一想",   text: "你用語音助理時，會在意問題被哪家公司處理嗎？還是只要用得順就不介意？" },
];

// ── Easing tokens (motion-design skill) ───────────────────────────────────
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

// 1. WeeklyAIBriefAnim — TitleScene (triggerFrame=80)
//    News-feed metaphor: three numbered cards stack in, headline = each topic.
function WeeklyAIBriefAnim({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 720;
  const envelope = interpolate(f, [0, 14, DURATION - 26, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const topics = [
    { num: "01", emoji: "🧠", label: "Meta · 超級智慧",  appearsAt: 0   },
    { num: "02", emoji: "💸", label: "月費時代終結",      appearsAt: 60  },
    { num: "03", emoji: "🔗", label: "Gemini × Siri",   appearsAt: 120 },
  ];

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 250 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
      width: 280 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.1em", marginBottom: 4 * S,
      }}>本週焦點</div>
      {topics.map((t, i) => {
        const itemF = Math.max(0, f - t.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [40 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateX(${itemTx}px)`,
            background: "rgba(0,0,0,0.85)",
            borderLeft: `3px solid ${C.primary}`,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 12 * S,
            padding: `${12 * S}px ${16 * S}px`,
            display: "flex", alignItems: "center", gap: 12 * S,
            boxShadow: `0 0 ${16 * S}px rgba(124,255,178,0.1)`,
          }}>
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.primary, fontWeight: "700",
            }}>{t.num}</span>
            <span style={{ fontSize: 28 * S }}>{t.emoji}</span>
            <span style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.text, fontWeight: "700",
            }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// 2. SuperIntelligenceLabAnim — Scene1 Phase A (triggerLocalFrame=151, "成立超級智慧實驗室")
//    Brain inside lab building with neon "SI Labs" badge.
function SuperIntelligenceLabAnim({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 320;
  const envelope = interpolate(f, [0, 12, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labScale = easeOutBack(prog(f, 22));
  const brainPulse = Math.sin(f * 0.06) * 0.12 + 0.92;
  const ringScale = interpolate(Math.max(0, f - 30), [0, 60], [0.6, 1.4], { easing: E.outExpo, extrapolateRight: "clamp" });
  const ringOp = interpolate(Math.max(0, f - 30), [0, 30, 60], [0, 0.6, 0.2], { extrapolateRight: "clamp" });
  const labelOp = interpolate(Math.max(0, f - 50), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 240 * S,
    }}>
      <div style={{ position: "relative", width: 160 * S, height: 160 * S }}>
        {/* Outer pulsing ring */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 130 * S, height: 130 * S, borderRadius: "50%",
          border: `${2 * S}px solid ${C.primary}`,
          transform: `translate(-50%,-50%) scale(${ringScale})`,
          opacity: ringOp,
        }} />
        {/* Lab building */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 110 * S, height: 110 * S,
          transform: `translate(-50%,-50%) scale(${labScale})`,
          background: "rgba(124,255,178,0.10)",
          border: `${2 * S}px solid ${C.primary}`,
          borderRadius: 18 * S,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.45)`,
          fontSize: 56 * S,
        }}>
          <span style={{ transform: `scale(${brainPulse})`, display: "inline-block" }}>🧠</span>
        </div>
      </div>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.1em",
        background: C.primaryLight,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S,
        padding: `${6 * S}px ${14 * S}px`,
        textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.6)`,
      }}>SUPERINTELLIGENCE LABS</div>
    </div>
  );
}

// 3. CapexExplosionAnim — Scene1 Phase A (triggerLocalFrame=1241, "1150億到1350億美元")
//    Number counter from 0 → 1350, money/$ symbols radiating outward.
function CapexExplosionAnim({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 350;
  const envelope = interpolate(f, [0, 12, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const num = Math.round(interpolate(f, [0, 90], [0, 1350], { easing: E.outExpo, extrapolateRight: "clamp" }));
  const numScale = easeOutBack(prog(f, 22));
  const labelOp = interpolate(Math.max(0, f - 100), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const subOp = interpolate(Math.max(0, f - 130), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const dots = [0, 60, 120, 180, 240, 300];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 280 * S,
    }}>
      <div style={{ position: "relative", width: 180 * S, height: 180 * S }}>
        {/* Radiating $ symbols */}
        {dots.map((angle, i) => {
          const dotF = Math.max(0, f - i * 8);
          const radius = interpolate(dotF, [0, 60], [0, 70 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
          const dotOp = interpolate(dotF, [0, 16, 60, 110], [0, 0.9, 0.6, 0.3], { extrapolateRight: "clamp" });
          const rad = (angle * Math.PI) / 180;
          const cx = 90 * S + Math.cos(rad) * radius;
          const cy = 90 * S + Math.sin(rad) * radius;
          return (
            <div key={i} style={{
              position: "absolute",
              left: cx - 12 * S, top: cy - 12 * S,
              fontSize: 22 * S, opacity: dotOp,
              color: C.yellow,
              textShadow: `0 0 ${10 * S}px rgba(255,209,102,0.7)`,
            }}>$</div>
          );
        })}
        {/* Center number */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%,-50%) scale(${numScale})`,
          textAlign: "center" as const,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 44 * S, color: C.primary, fontWeight: "700",
            textShadow: `0 0 ${22 * S}px rgba(124,255,178,0.7)`,
            lineHeight: 1,
          }}>${num}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.muted, marginTop: 6 * S,
          }}>億美元</div>
        </div>
      </div>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.yellow, letterSpacing: "0.08em",
        background: C.yellowLight,
        border: `1px solid ${C.yellowBorder}`,
        borderRadius: 8 * S,
        padding: `${6 * S}px ${14 * S}px`,
      }}>2026 AI CAPEX</div>
      <div style={{
        opacity: subOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text, textAlign: "center" as const, lineHeight: 1.4,
      }}>幾乎是去年的 2 倍</div>
    </div>
  );
}

// 4. ArmsRaceAccelerateAnim — Scene1 Phase B (triggerLocalFrame=2154, "AI 競爭不會趨緩,而是加速")
//    Three company badges racing forward with acceleration trails.
function ArmsRaceAccelerateAnim({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 500;
  const envelope = interpolate(f, [0, 12, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const racers = [
    { name: "Meta",       color: C.primary, appearsAt: 0   },
    { name: "OpenAI",     color: C.yellow,  appearsAt: 50  },
    { name: "Anthropic",  color: C.primary, appearsAt: 100 },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
      width: 260 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.1em",
      }}>軍備競賽</div>
      {racers.map((r, i) => {
        const rF = Math.max(0, f - r.appearsAt);
        const trailW = interpolate(rF, [0, 40], [0, 100 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
        const op = interpolate(rF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        // Continuous accel pulse
        const pulse = Math.sin((rF) * 0.08) * 4 * S;
        return (
          <div key={i} style={{
            opacity: op,
            display: "flex", alignItems: "center", gap: 10 * S,
            transform: `translateX(${pulse}px)`,
          }}>
            {/* Trail */}
            <div style={{
              width: trailW, height: 8 * S,
              background: `linear-gradient(to right, transparent, ${r.color})`,
              borderRadius: 4 * S,
              boxShadow: `0 0 ${10 * S}px ${r.color}66`,
            }} />
            {/* Badge */}
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: r.color, fontWeight: "700",
              background: r.color === C.primary ? C.primaryLight : C.yellowLight,
              border: `2px solid ${r.color}`,
              borderRadius: 10 * S,
              padding: `${6 * S}px ${12 * S}px`,
              boxShadow: `0 0 ${14 * S}px ${r.color}55`,
              whiteSpace: "nowrap" as const,
            }}>{r.name}</div>
            {/* Arrow */}
            <span style={{
              fontSize: 22 * S, color: r.color,
              filter: `drop-shadow(0 0 ${6 * S}px ${r.color})`,
            }}>▶</span>
          </div>
        );
      })}
    </div>
  );
}

// 5. AllYouCanEatBowlAnim — Scene2 Phase A (triggerLocalFrame=508, "你付一筆固定費用,就可以無限使用")
//    Bowl with ∞ symbol and price tag — buffet metaphor.
function AllYouCanEatBowlAnim({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 350;
  const envelope = interpolate(f, [0, 12, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const bowlScale = easeOutBack(prog(f, 22));
  const infinityOp = interpolate(Math.max(0, f - 22), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const tagOp = interpolate(Math.max(0, f - 50), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const labelOp = interpolate(Math.max(0, f - 80), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const inftyPulse = Math.sin(f * 0.08) * 0.15 + 0.92;

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 240 * S,
    }}>
      <div style={{ position: "relative", width: 180 * S, height: 160 * S }}>
        {/* Bowl */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 150 * S, height: 130 * S,
          transform: `translate(-50%,-50%) scale(${bowlScale})`,
          background: "rgba(124,255,178,0.10)",
          border: `${2 * S}px solid ${C.primary}`,
          borderRadius: `${30 * S}px ${30 * S}px ${75 * S}px ${75 * S}px`,
          boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.3)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            opacity: infinityOp,
            fontSize: 56 * S, fontWeight: "700",
            color: C.primary,
            transform: `scale(${inftyPulse})`,
            display: "inline-block",
            textShadow: `0 0 ${20 * S}px rgba(124,255,178,0.7)`,
          }}>∞</span>
        </div>
        {/* Price tag */}
        <div style={{
          position: "absolute", bottom: -10 * S, right: -10 * S,
          opacity: tagOp,
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.yellow, fontWeight: "700",
          background: "rgba(0,0,0,0.9)",
          border: `2px solid ${C.yellow}`,
          borderRadius: 10 * S,
          padding: `${8 * S}px ${12 * S}px`,
          transform: `rotate(-8deg)`,
          boxShadow: `0 0 ${14 * S}px rgba(255,209,102,0.4)`,
        }}>$/月</div>
      </div>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
        color: C.text, fontWeight: "700", textAlign: "center" as const,
        lineHeight: 1.4,
      }}>吃到飽 · 月費制</div>
    </div>
  );
}

// 6. ToolUpdateCalcAnim — Scene2 Phase A (triggerLocalFrame=946, "GitHub Copilot本月調整了個人方案")
//    Three tool icons getting "計量" badges in sync with VTT mentions.
//    VTT: Copilot 946 (delay 0) · Cursor 1160 (delay 214) · Claude 1381 (delay 435)
function ToolUpdateCalcAnim({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 530;
  const envelope = interpolate(f, [0, 12, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const tools = [
    { icon: "🐙", name: "Copilot",     change: "暫停新會員",       appearsAt:   0 },
    { icon: "✦",  name: "Cursor",      change: "Max Mode 點數",    appearsAt: 214 },
    { icon: "◈",  name: "Claude Code", change: "計費調整",         appearsAt: 435 },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 190 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 12 * S,
      width: 280 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.1em", marginBottom: 4 * S,
      }}>本月變動</div>
      {tools.map((t, i) => {
        const tF = Math.max(0, f - t.appearsAt);
        const op = interpolate(tF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const tx = interpolate(tF, [0, 22], [40 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const badgeScale = easeOutBack(Math.min(Math.max(0, tF - 20) / 20, 1));
        return (
          <div key={i} style={{
            opacity: op,
            transform: `translateX(${tx}px)`,
            background: "rgba(0,0,0,0.85)",
            borderLeft: `3px solid ${C.yellow}`,
            border: `1px solid ${C.yellowBorder}`,
            borderRadius: 10 * S,
            padding: `${10 * S}px ${14 * S}px`,
            display: "flex", alignItems: "center", gap: 10 * S,
          }}>
            <span style={{ fontSize: 24 * S }}>{t.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.text, fontWeight: "700",
              }}>{t.name}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.muted, marginTop: 2 * S,
              }}>{t.change}</div>
            </div>
            <div style={{
              transform: `scale(${badgeScale})`,
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.yellow, fontWeight: "700",
              background: C.yellowLight,
              border: `1px solid ${C.yellow}`,
              borderRadius: 6 * S,
              padding: `${4 * S}px ${8 * S}px`,
            }}>$↑</div>
          </div>
        );
      })}
    </div>
  );
}

// 7. MeterDialAnim — Scene2 Phase B (triggerLocalFrame=1717, "算力成本比預期高")
//    Spinning gauge dial — meter / pay-as-you-go metaphor.
function MeterDialAnim({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 400;
  const envelope = interpolate(f, [0, 12, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const dialScale = easeOutBack(prog(f, 22));
  // Needle sweeps from -90 → +60 deg (low → high usage), then oscillates
  const needleAngle = interpolate(f, [0, 80, 120, 200, 280, DURATION], [-90, 60, 30, 70, 40, 50], { easing: E.outQuart, extrapolateRight: "clamp" });
  const numCount = Math.round(interpolate(f, [0, 90], [0, 287], { easing: E.outExpo, extrapolateRight: "clamp" }));
  const labelOp = interpolate(Math.max(0, f - 60), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 240 * S,
    }}>
      <div style={{
        position: "relative", width: 180 * S, height: 180 * S,
        transform: `scale(${dialScale})`,
      }}>
        {/* Outer dial ring */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: `${3 * S}px solid ${C.primaryBorder}`,
          background: "rgba(0,0,0,0.6)",
          boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.2)`,
        }} />
        {/* Tick marks */}
        {[0, 30, 60, 90, 120, 150, 180].map((deg, i) => {
          const rad = ((deg - 180) * Math.PI) / 180;
          const r1 = 75 * S;
          const r2 = 85 * S;
          const x1 = 90 * S + Math.cos(rad) * r1;
          const y1 = 90 * S + Math.sin(rad) * r1;
          const x2 = 90 * S + Math.cos(rad) * r2;
          const y2 = 90 * S + Math.sin(rad) * r2;
          return (
            <svg key={i} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={i >= 4 ? C.yellow : C.primary}
                strokeWidth={2 * S} />
            </svg>
          );
        })}
        {/* Needle */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 4 * S, height: 70 * S,
          background: `linear-gradient(to top, ${C.primary}, ${C.yellow})`,
          borderRadius: 2 * S,
          transformOrigin: "50% 100%",
          transform: `translate(-50%, -100%) rotate(${needleAngle}deg)`,
          boxShadow: `0 0 ${10 * S}px ${C.primary}`,
        }} />
        {/* Center hub */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 16 * S, height: 16 * S, borderRadius: "50%",
          background: C.primary,
          transform: "translate(-50%, -50%)",
          boxShadow: `0 0 ${8 * S}px ${C.primary}`,
        }} />
        {/* Counter */}
        <div style={{
          position: "absolute", bottom: 14 * S, left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
          color: C.text, fontWeight: "700",
          background: "rgba(0,0,0,0.85)",
          padding: `${4 * S}px ${10 * S}px`,
          borderRadius: 6 * S,
          letterSpacing: "0.05em",
        }}>{numCount}</div>
      </div>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.1em",
        background: C.primaryLight,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S,
        padding: `${6 * S}px ${14 * S}px`,
      }}>用多少 · 付多少</div>
    </div>
  );
}

// 8. SiriGeminiHandshakeAnim — Scene3 Phase A (triggerLocalFrame=212, "Gemini 整合進 Siri")
//    Apple/Siri logo + Google/Gemini logo + handshake bridge.
function SiriGeminiHandshakeAnim({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 320;
  const envelope = interpolate(f, [0, 12, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const leftScale = easeOutBack(prog(f, 22));
  const rightScale = easeOutBack(prog(Math.max(0, f - 25), 22));
  const linkW = interpolate(Math.max(0, f - 50), [0, 30], [0, 60 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const handOp = interpolate(Math.max(0, f - 70), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const labelOp = interpolate(Math.max(0, f - 90), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
      width: 280 * S,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * S,
      }}>
        {/* Apple/Siri */}
        <div style={{
          width: 80 * S, height: 80 * S, borderRadius: 18 * S,
          background: "rgba(255,255,255,0.10)",
          border: `${2 * S}px solid ${C.text}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40 * S,
          transform: `scale(${leftScale})`,
          boxShadow: `0 0 ${16 * S}px rgba(255,255,255,0.2)`,
        }}>🍎</div>
        {/* Bridge */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
        }}>
          <span style={{
            opacity: handOp,
            fontSize: 24 * S, color: C.primary,
          }}>🤝</span>
          <div style={{
            width: linkW, height: 4 * S,
            background: `linear-gradient(to right, ${C.text}, ${C.primary})`,
            borderRadius: 2 * S,
            boxShadow: `0 0 ${10 * S}px ${C.primary}66`,
          }} />
        </div>
        {/* Google/Gemini */}
        <div style={{
          width: 80 * S, height: 80 * S, borderRadius: 18 * S,
          background: "rgba(124,255,178,0.10)",
          border: `${2 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40 * S,
          transform: `scale(${rightScale})`,
          boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.4)`,
        }}>✦</div>
      </div>
      <div style={{
        opacity: labelOp,
        display: "flex", gap: 8 * S, alignItems: "center",
      }}>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.text, letterSpacing: "0.05em",
          background: "rgba(255,255,255,0.08)",
          border: `1px solid rgba(255,255,255,0.2)`,
          borderRadius: 6 * S,
          padding: `${4 * S}px ${10 * S}px`,
        }}>Siri</span>
        <span style={{ color: C.muted, fontSize: 18 * S }}>×</span>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary, letterSpacing: "0.05em",
          background: C.primaryLight,
          border: `1px solid ${C.primaryBorder}`,
          borderRadius: 6 * S,
          padding: `${4 * S}px ${10 * S}px`,
        }}>Gemini</span>
      </div>
    </div>
  );
}

// 9. SearchSafariHistoryAnim — Scene3 Phase A (triggerLocalFrame=609, "Google Search 是 Safari 預設")
//    Historical timeline: Safari logo + Google Search badge with $ flow.
function SearchSafariHistoryAnim({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 350;
  const envelope = interpolate(f, [0, 12, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const safariScale = easeOutBack(prog(f, 22));
  const searchOp = interpolate(Math.max(0, f - 25), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const arrowW = interpolate(Math.max(0, f - 50), [0, 30], [0, 50 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const dollarOp = interpolate(Math.max(0, f - 80), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const labelOp = interpolate(Math.max(0, f - 110), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 260 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.1em", marginBottom: 2 * S,
      }}>不是第一次</div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
        {/* Safari box */}
        <div style={{
          width: 70 * S, height: 70 * S, borderRadius: 14 * S,
          background: "rgba(255,255,255,0.08)",
          border: `${2 * S}px solid ${C.text}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32 * S,
          transform: `scale(${safariScale})`,
        }}>🧭</div>
        {/* Arrow with $ */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
        }}>
          <span style={{ opacity: dollarOp, fontSize: 22 * S, color: C.yellow }}>$</span>
          <div style={{
            width: arrowW, height: 3 * S,
            background: `linear-gradient(to right, ${C.text}, ${C.primary})`,
            borderRadius: 2 * S,
          }} />
        </div>
        {/* Google Search box */}
        <div style={{
          opacity: searchOp,
          width: 70 * S, height: 70 * S, borderRadius: 14 * S,
          background: "rgba(124,255,178,0.10)",
          border: `${2 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32 * S,
          boxShadow: `0 0 ${14 * S}px rgba(124,255,178,0.3)`,
        }}>🔍</div>
      </div>
      <div style={{
        display: "flex", gap: 10 * S,
        opacity: labelOp,
      }}>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.muted, letterSpacing: "0.04em",
        }}>Safari</span>
        <span style={{ color: C.muted, fontSize: 18 * S }}>·</span>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary, letterSpacing: "0.04em",
        }}>Google Search</span>
      </div>
    </div>
  );
}

// 10. DataFlowToCloudAnim — Scene3 Phase B (triggerLocalFrame=1375, "答案的可能是Google的模型")
//     User → iPhone → Google cloud — flowing data dots.
function DataFlowToCloudAnim({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 400;
  const envelope = interpolate(f, [0, 12, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const userScale = easeOutBack(prog(f, 22));
  const phoneScale = easeOutBack(prog(Math.max(0, f - 30), 22));
  const cloudScale = easeOutBack(prog(Math.max(0, f - 60), 22));
  const labelOp = interpolate(Math.max(0, f - 100), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  // Flowing data dots that travel along the path repeatedly
  const dots = [0, 1, 2, 3];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 280 * S,
    }}>
      <div style={{ position: "relative", width: 260 * S, height: 110 * S }}>
        {/* Static path */}
        <div style={{
          position: "absolute", left: 60 * S, top: 50 * S,
          width: 140 * S, height: 3 * S,
          background: `linear-gradient(to right, rgba(255,255,255,0.2), rgba(255,107,107,0.4))`,
          borderRadius: 2 * S,
        }} />
        {/* Flowing dots */}
        {dots.map((i) => {
          const phase = (f * 0.025 + i * 0.25) % 1;
          const x = 60 * S + phase * 140 * S;
          const dotOp = phase < 0.1 ? phase / 0.1 : phase > 0.9 ? (1 - phase) / 0.1 : 1;
          return (
            <div key={i} style={{
              position: "absolute",
              left: x - 6 * S, top: 50 * S - 3 * S,
              width: 12 * S, height: 12 * S,
              borderRadius: "50%",
              background: C.red,
              opacity: dotOp * 0.9,
              boxShadow: `0 0 ${8 * S}px ${C.red}`,
            }} />
          );
        })}
        {/* User icon */}
        <div style={{
          position: "absolute", left: 0, top: 25 * S,
          width: 60 * S, height: 60 * S, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: `${2 * S}px solid ${C.text}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32 * S,
          transform: `scale(${userScale})`,
        }}>👤</div>
        {/* iPhone icon (middle) */}
        <div style={{
          position: "absolute", left: 100 * S, top: 25 * S,
          width: 60 * S, height: 60 * S, borderRadius: 14 * S,
          background: "rgba(255,255,255,0.08)",
          border: `${2 * S}px solid ${C.text}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28 * S,
          transform: `scale(${phoneScale})`,
        }}>📱</div>
        {/* Cloud icon */}
        <div style={{
          position: "absolute", right: 0, top: 15 * S,
          width: 80 * S, height: 80 * S, borderRadius: 18 * S,
          background: "rgba(255,107,107,0.10)",
          border: `${2 * S}px solid ${C.red}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36 * S,
          transform: `scale(${cloudScale})`,
          boxShadow: `0 0 ${16 * S}px rgba(255,107,107,0.35)`,
        }}>☁︎</div>
      </div>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.red, letterSpacing: "0.08em",
        background: C.redLight,
        border: `1px solid ${C.redBorder}`,
        borderRadius: 8 * S,
        padding: `${6 * S}px ${14 * S}px`,
      }}>資料流向 Google</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_05_01.title.to - SCENES_2026_05_01.title.from;
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
        <div style={{ ...badgeOp, marginBottom: 16 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
          }}>每日 AI 知識庫</span>
        </div>

        {/* H1 line 1 */}
        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 42 * S, color: C.text,
        }}>
          <WordReveal text="本週 AI 焦點" startFrame={10} staggerPerWord={6}
            fontSize={42 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 — neon green accent */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 32 * S, color: C.primary,
        }}>
          <WordReveal text="三件 大事 一次 看懂" startFrame={28} staggerPerWord={6}
            fontSize={32 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle,
          marginTop: 22 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
        }}>
          Meta 千億豪賭 · 月費時代終結 · Gemini 進 Siri
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 18 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>AI · 巨頭競爭 · 收費模式 · 跨陣營合作</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <WeeklyAIBriefAnim triggerFrame={80} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — Meta 超級智慧 ─────────────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_01.scene1.to - SCENES_2026_05_01.scene1.from;
  // VTT-based scene-local frame anchors:
  // 31.88s   → local 151  (成立超級智慧實驗室)
  // 39.44s   → local 378  (Muse Spark)
  // 68.20s   → local 1241 (1150-1350億美元)
  // 75.08s   → local 1447 (兩倍)
  // 83.28s   → local 1693 (Phase B: 過去Meta的策略是開源)
  // 94.80s   → local 2039 (超越人類的AI)
  // 98.64s   → local 2154 (AI競爭不會趨緩,加速)
  // 113.48s  → local 2599 (千億美元追求超級智慧)

  const A_FADE_START = 1613;          // 1693 - 80
  const A_REMOVE     = 1693;
  const B_SHOW_AT    = 1693;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB        = frame >= B_SHOW_AT;

  // Phase A delays
  const A1_AT = 50;     // intro card — Meta announces
  const A2_AT = 1100;   // capex card — appears just before "1150-1350億" mention
  // Phase A→B animations
  const SI_LAB_AT  = 151;
  const CAPEX_AT   = 1241;

  // Phase B delays
  const B1_AT = B_SHOW_AT;        // 1693 — strategy shift
  const B2_AT = 2154;             // arms race accelerate
  const B3_AT = 2599;             // thinking question
  const ARMS_RACE_AT = 2154;

  const a1Style = useFadeUp(showA ? A1_AT : 999999);
  const a2Style = useFadeUp(showA ? A2_AT : 999999);
  const b1Style = useFadeUp(showB ? B1_AT : 999999);
  const b2Style = useFadeUp(showB ? B2_AT : 999999);
  const b3Style = useFadeUp(showB ? B3_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* A1: Meta Superintelligence Labs intro */}
            <div style={{ ...a1Style, marginBottom: 16 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 8 * S, padding: `${5 * S}px ${14 * S}px`,
                marginBottom: 12 * S,
              }}>SUPERINTELLIGENCE LABS</div>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S,
                padding: `${20 * S}px ${24 * S}px`,
                boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.06)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.35,
                  marginBottom: 12 * S,
                }}>
                  Meta 成立<span style={{ color: C.primary }}> 超級智慧實驗室</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.65,
                }}>
                  推出旗艦模型 <span style={{ color: C.text, fontWeight: "700" }}>Muse Spark</span>——多模態，主打推理、健康、代理任務，且算力效率優於對手
                </div>
              </div>
            </div>

            {/* A2: Capex announcement */}
            <div style={{ ...a2Style }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.1em",
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 8 * S, padding: `${5 * S}px ${14 * S}px`,
                marginBottom: 12 * S,
              }}>2026 AI CAPEX</div>
              <div style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 14 * S,
                padding: `${20 * S}px ${24 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(255,209,102,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 32 * S,
                  color: C.yellow, fontWeight: "700",
                  textShadow: `0 0 ${16 * S}px rgba(255,209,102,0.6)`,
                  marginBottom: 8 * S, lineHeight: 1.1,
                }}>$1,150–1,350 億</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.5,
                }}>幾乎是去年的兩倍——把賭注押在「超級智慧」</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            {/* B1: Strategy shift */}
            <div style={{ ...b1Style, marginBottom: 16 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.1em",
                marginBottom: 12 * S,
              }}>STRATEGY SHIFT</div>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${20 * S}px ${24 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.35,
                  marginBottom: 12 * S,
                }}>
                  從<span style={{ color: C.muted }}> 開源策略 </span>→<span style={{ color: C.primary }}> 正面競爭</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.65,
                }}>
                  目標不再是「很好用的 AI」，而是<span style={{ color: C.text, fontWeight: "700" }}> 超越人類的 AI</span>
                </div>
              </div>
            </div>

            {/* B2: Arms race accelerating */}
            <div style={{ ...b2Style, marginBottom: 16 * S }}>
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
                }}>AI 競爭不會趨緩,而是加速</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65, marginTop: 8 * S,
                }}>
                  競賽走向由幾家公司決定——不是民主投票出來的結果
                </div>
              </div>
            </div>

            {/* B3: Thinking question */}
            <div style={{ ...b3Style }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.1em",
                marginBottom: 10 * S,
              }}>想一想</div>
              <div style={{
                background: C.surface,
                border: `1px dashed ${C.yellowBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.6,
                }}>
                  千億美元追求超級智慧——終點是什麼？誰有資格決定方向？
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <SuperIntelligenceLabAnim triggerLocalFrame={SI_LAB_AT} />
        <CapexExplosionAnim triggerLocalFrame={CAPEX_AT} />
        <ArmsRaceAccelerateAnim triggerLocalFrame={ARMS_RACE_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — AI 工具計費 ───────────────────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_01.scene2.to - SCENES_2026_05_01.scene2.from;
  // VTT scene-local frame anchors:
  // 140.12s → local 508  (你付一筆固定費用,就可以無限使用)
  // 154.72s → local 946  (GitHub Copilot 本月調整)
  // 161.88s → local 1160 (Cursor Max Mode)
  // 169.24s → local 1381 (Claude Code 調整計費)
  // 172.32s → local 1474 (Phase B: 從吃到飽走向用多少付多少)
  // 180.44s → local 1717 (算力成本比預期高)
  // 191.52s → local 2050 (對你我的意義)

  const A_FADE_START = 1394;          // 1474 - 80
  const A_REMOVE     = 1474;
  const B_SHOW_AT    = 1474;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB        = frame >= B_SHOW_AT;

  // Phase A delays
  const A1_AT = 50;
  const A2_AT = 323;
  const A3_AT = 946;
  const BOWL_AT = 508;
  const TOOLS_AT = 946;

  // Phase B delays
  const B1_AT = B_SHOW_AT;
  const B2_AT = 1717;
  const B3_AT = 2050;
  const METER_AT = 1717;

  const a1Style = useFadeUp(showA ? A1_AT : 999999);
  const a2Style = useFadeUp(showA ? A2_AT : 999999);
  const a3Style = useFadeUp(showA ? A3_AT : 999999);
  const b1Style = useFadeUp(showB ? B1_AT : 999999);
  const b2Style = useFadeUp(showB ? B2_AT : 999999);
  const b3Style = useFadeUp(showB ? B3_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* A1: Subscription era definition */}
            <div style={{ ...a1Style, marginBottom: 14 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 8 * S, padding: `${5 * S}px ${14 * S}px`,
                marginBottom: 10 * S,
              }}>過去：月費制</div>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.4,
                }}>
                  付一筆固定費用 · 可以無限使用
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.65, marginTop: 6 * S,
                }}>
                  讓開發者很安心：預算固定,用多用少都一樣
                </div>
              </div>
            </div>

            {/* A2: Affected tools */}
            <div style={{ ...a2Style, marginBottom: 14 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.1em", marginBottom: 8 * S,
              }}>受影響的 AI 編碼工具</div>
              <div style={{
                display: "flex", gap: 10 * S, flexWrap: "wrap" as const,
              }}>
                {["GitHub Copilot", "Cursor", "Claude Code"].map((t, i) => (
                  <span key={i} style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                    color: C.text, background: "rgba(255,255,255,0.06)",
                    border: `1px solid rgba(255,255,255,0.14)`,
                    borderRadius: 8 * S, padding: `${6 * S}px ${12 * S}px`,
                  }}>{t}</span>
                ))}
              </div>
            </div>

            {/* A3: Updates rolling out */}
            <div style={{ ...a3Style }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.1em",
                marginBottom: 10 * S,
              }}>本月變化</div>
              <div style={{
                background: C.yellowLight,
                border: `1px solid ${C.yellowBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.7,
                }}>
                  <div style={{ marginBottom: 4 * S }}>
                    <span style={{ color: C.yellow, fontWeight: "700" }}>Copilot</span>　調整方案 · 暫停新會員
                  </div>
                  <div style={{ marginBottom: 4 * S }}>
                    <span style={{ color: C.yellow, fontWeight: "700" }}>Cursor</span>　最強模型移到 Max Mode 後付點數
                  </div>
                  <div>
                    <span style={{ color: C.yellow, fontWeight: "700" }}>Claude Code</span>　同步調整計費方式
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            {/* B1: Era transition */}
            <div style={{ ...b1Style, marginBottom: 16 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${20 * S}px ${24 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.1em", marginBottom: 10 * S,
                }}>METER MODEL</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.4,
                }}>
                  從<span style={{ color: C.muted }}> 吃到飽 </span>→<span style={{ color: C.primary }}> 用多少付多少</span>
                </div>
              </div>
            </div>

            {/* B2: Why is this happening */}
            <div style={{ ...b2Style, marginBottom: 16 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.1em",
                marginBottom: 10 * S,
              }}>背後原因</div>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${18 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.4,
                  marginBottom: 8 * S,
                }}>算力成本比預期高很多</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.65,
                }}>
                  AI 真的開始被大量使用——「月費吃到飽」對公司開始不划算
                </div>
              </div>
            </div>

            {/* B3: What this means for you */}
            <div style={{ ...b3Style }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.1em",
                marginBottom: 10 * S,
              }}>對你的影響</div>
              <div style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.5,
                }}>
                  重新評估使用習慣——別等帳單嚇到才反應
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <AllYouCanEatBowlAnim triggerLocalFrame={BOWL_AT} />
        <ToolUpdateCalcAnim triggerLocalFrame={TOOLS_AT} />
        <MeterDialAnim triggerLocalFrame={METER_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — Gemini × Siri ─────────────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_01.scene3.to - SCENES_2026_05_01.scene3.from;
  // VTT scene-local frame anchors:
  // 219.56s → local 108  (Google 確認了)
  // 223.04s → local 212  (Gemini 整合進 Siri)
  // 229.16s → local 396  (Apple 跟 Google,不是競爭對手嗎?)
  // 236.28s → local 609  (Google Search 是 Safari 預設)
  // 256.36s → local 1212 (Phase B: 但有個地方值得我們多想一秒)
  // 261.80s → local 1375 (答案的可能是 Google 的模型)
  // 272.92s → local 1709 (資料的邊界變得模糊)
  // 286.44s → local 2114 (你會在意嗎?)

  const A_FADE_START = 1132;          // 1212 - 80
  const A_REMOVE     = 1212;
  const B_SHOW_AT    = 1212;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB        = frame >= B_SHOW_AT;

  // Phase A delays
  const A1_AT = 50;
  const A2_AT = 396;
  const A3_AT = 609;
  const HANDSHAKE_AT = 212;
  const HISTORY_AT   = 609;

  // Phase B delays
  const B1_AT = B_SHOW_AT;
  const B2_AT = 1709;
  const B3_AT = 2114;
  const DATAFLOW_AT  = 1375;

  const a1Style = useFadeUp(showA ? A1_AT : 999999);
  const a2Style = useFadeUp(showA ? A2_AT : 999999);
  const a3Style = useFadeUp(showA ? A3_AT : 999999);
  const b1Style = useFadeUp(showB ? B1_AT : 999999);
  const b2Style = useFadeUp(showB ? B2_AT : 999999);
  const b3Style = useFadeUp(showB ? B3_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* A1: Gemini integrates into Siri */}
            <div style={{ ...a1Style, marginBottom: 14 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 8 * S, padding: `${5 * S}px ${14 * S}px`,
                marginBottom: 10 * S,
              }}>跨陣營合作</div>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${18 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.4,
                  marginBottom: 8 * S,
                }}>
                  <span style={{ color: C.primary }}>Gemini</span> 將整合進 Apple <span style={{ color: C.primary }}>Siri</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.65,
                }}>
                  成為新一代 Siri 的技術基礎之一
                </div>
              </div>
            </div>

            {/* A2: Wait, weren't they competitors? */}
            <div style={{ ...a2Style, marginBottom: 14 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1.5px dashed ${C.yellow}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.1em", marginBottom: 6 * S,
                }}>等等？</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.4,
                }}>
                  Apple 跟 Google——不是競爭對手嗎？
                </div>
              </div>
            </div>

            {/* A3: It's not the first time */}
            <div style={{ ...a3Style }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.1em", marginBottom: 8 * S,
              }}>其實不是第一次</div>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>
                  <span style={{ color: C.primary, fontWeight: "700" }}>Google Search</span> 長期是 <span style={{ color: C.text, fontWeight: "700" }}>Safari</span> 預設搜尋引擎——背後一筆大合作費。這次 Gemini × Siri 也是各取所需
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            {/* B1: Worth one more second of thought */}
            <div style={{ ...b1Style, marginBottom: 16 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.red, letterSpacing: "0.1em",
                marginBottom: 10 * S,
              }}>隱私邊界</div>
              <div style={{
                background: C.redLight,
                border: `1.5px solid ${C.red}`,
                borderRadius: 14 * S,
                padding: `${20 * S}px ${24 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(255,107,107,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.4,
                  marginBottom: 8 * S,
                }}>
                  你問 Siri 的問題——<span style={{ color: C.red }}>背後可能是 Google 的模型</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.65,
                }}>
                  你說的每一句話、提的每個問題——很可能流向 Google 的系統
                </div>
              </div>
            </div>

            {/* B2: Data boundary blurs */}
            <div style={{ ...b2Style, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${18 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.1em", marginBottom: 8 * S,
                }}>服務深度整合</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.5,
                }}>
                  資料的邊界變得模糊——我的資料去哪了？誰在處理它？
                </div>
              </div>
            </div>

            {/* B3: Thinking question */}
            <div style={{ ...b3Style }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.1em",
                marginBottom: 10 * S,
              }}>想一想</div>
              <div style={{
                background: C.surface,
                border: `1px dashed ${C.yellowBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.6,
                }}>
                  你會在意問題被哪家公司處理嗎？還是只要用得順就不介意？
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <SiriGeminiHandshakeAnim triggerLocalFrame={HANDSHAKE_AT} />
        <SearchSafariHistoryAnim triggerLocalFrame={HISTORY_AT} />
        <DataFlowToCloudAnim triggerLocalFrame={DATAFLOW_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene ────────────────────────────────────────────────────────────
function SummaryCard({ number, title, body, delay, color, border }: {
  number: string; title: string; body: string; delay: number; color: string; border: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        display: "flex", gap: 14 * S, alignItems: "flex-start",
        background: `${border}15`,
        border: `1px solid ${border}`,
        borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
          color, fontWeight: "700", flexShrink: 0, marginTop: 2 * S,
          textShadow: `0 0 ${10 * S}px ${color}88`,
        }}>{number}</div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
            color: C.text, fontWeight: "700", lineHeight: 1.3,
            marginBottom: 6 * S,
          }}>{title}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.muted, lineHeight: 1.55,
          }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_05_01.summary.to - SCENES_2026_05_01.summary.from;
  // VTT scene-local frame anchors:
  // 0      → 好,快速整理
  // 108    → 第一,Meta成立超級智慧實驗室,砸下千億美元
  // 463    → 第二,AI工具月費時代結束
  // 787    → 第三,Gemini進Siri
  // 1037   → 這裡是每日AI知識庫

  const BADGE_AT = 0;
  const CARD1_AT = 108;
  const CARD2_AT = 463;
  const CARD3_AT = 787;
  const OUTRO_AT = 1037;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{ ...badgeStyle, marginBottom: 18 * S, marginTop: 20 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 8 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>
            <WordReveal text="本週 重點" startFrame={4} staggerPerWord={5}
              fontSize={18 * S} color={C.primary}
              fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
          </span>
        </div>

        <SummaryCard
          number="01" delay={CARD1_AT}
          title="Meta 砸千億美元追超級智慧"
          body="2026 資本支出 1150–1350 億——AI 軍備競賽進入新規模"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="02" delay={CARD2_AT}
          title="AI 工具月費時代結束"
          body="Copilot · Cursor · Claude Code 都往計量收費走——成本更透明,也更浮動"
          color={C.yellow} border={C.yellow}
        />
        <SummaryCard
          number="03" delay={CARD3_AT}
          title="Gemini 進 Siri"
          body="跨陣營合作讓 AI 更普及——但資料隱私的邊界更難界定"
          color={C.primary} border={C.primary}
        />

        {/* Outro */}
        <div style={{ ...outroStyle, marginTop: 12 * S }}>
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
export function VideoComposition_2026_05_01() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_01.scene1;
  const S2 = SCENES_2026_05_01.scene2;
  const S3 = SCENES_2026_05_01.scene3;
  const SU = SCENES_2026_05_01.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-05-01-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_05_01 - 150, TOTAL_FRAMES_2026_05_01], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return Math.min(fi, fo);
        }}
        loop
      />

      <Background />

      {/* TitleScene */}
      <Sequence from={0} durationInFrames={S1.from}>
        <TitleScene />
      </Sequence>

      {/* Scene 1 — Meta 超級智慧 */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — AI 工具計費 */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — Gemini × Siri */}
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
