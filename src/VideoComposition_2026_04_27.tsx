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

// ── Design tokens ─────────────────────────────────────────────────────────
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

// ── iMessage constants ────────────────────────────────────────────────────
const NOTIF_W = 290 * S;
const NOTIF_TOP = 12 * S;
const NOTIF_RIGHT = 20 * S;
const NOTIF_SLOT = 148 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// TitleScene:   0     – 614   (0     – 20.48s)
// Scene1:       614   – 3084  (20.48 – 102.8s)   責任 / 品質 / 成長
// Scene2:       3084  – 5258  (102.8 – 175.28s)  失去手感 + 依賴風險
// Scene3:       5258  – 7519  (175.28 – 250.64s) 三步協作姿態
// SummaryScene: 7519  – 8400  (250.64 – 280s)
export const SCENES_2026_04_27 = {
  title: { from: 0, to: 614 },
  scene1: { from: 614, to: 3084 },
  scene2: { from: 3084, to: 5258 },
  scene3: { from: 5258, to: 7519 },
  summary: { from: 7519, to: 8400 },
} as const;
export const TOTAL_FRAMES_2026_04_27 = 8400;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "責任 · 品質 · 成長", start: 614 },
  { label: "AI 與你的手感", start: 3084 },
  { label: "正確協作姿態", start: 5258 },
  { label: "重點整理", start: 7519 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 2780, to: 3060, sender: "想一想",
    text: "你最近用 AI 完成的事情中，有沒有哪一件，其實你自己根本沒有真的思考過？" },
  { from: 5060, to: 5240, sender: "想一想",
    text: "你的核心能力裡，有沒有哪一塊，你已經開始不太自己動腦了？" },
  { from: 7180, to: 7400, sender: "想一想",
    text: "你有沒有設定過——這件事我要自己做，不用 AI？" },
];

// ── Easing tokens (motion-design skill) ───────────────────────────────────
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

// ── Standard hooks ────────────────────────────────────────────────────────
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

// ── WordReveal ────────────────────────────────────────────────────────────
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
        const ty = interpolate(f, [0, 20], [18 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const op = interpolate(f, [0, 12], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
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

// ── SceneFade ─────────────────────────────────────────────────────────────
function SceneFade({ children, durationInFrames }: { children: React.ReactNode; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return <div style={{ opacity: Math.min(fadeIn, fadeOut), height: "100%" }}>{children}</div>;
}

// ── ContentColumn ─────────────────────────────────────────────────────────
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

// ── Background ────────────────────────────────────────────────────────────
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

// ── ProgressBar ───────────────────────────────────────────────────────────
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

// ── iMessage Callout system ───────────────────────────────────────────────
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

// 1. WhoseWorkAnimation — Title scene
//    visual metaphor: 人 → AI brain → document with floating "?"
//    "成果到底算不算是你的"
function WhoseWorkAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 280;
  const envelope = interpolate(f, [0, 12, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const personScale = easeOutBack(prog(f, 18));
  const arrow1W = interpolate(Math.max(0, f - 18), [0, 22], [0, 50 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const aiScale = easeOutBack(prog(Math.max(0, f - 38), 18));
  const arrow2W = interpolate(Math.max(0, f - 56), [0, 22], [0, 50 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const docScale = easeOutBack(prog(Math.max(0, f - 76), 18));
  const qBounce = Math.sin(Math.max(0, f - 110) * 0.12) * 0.08 + 1;
  const qOp = interpolate(Math.max(0, f - 110), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 80 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", alignItems: "center", gap: 0,
    }}>
      {/* Person */}
      <div style={{
        width: 80 * S, height: 80 * S, borderRadius: "50%",
        background: "rgba(255,255,255,0.06)",
        border: `${2 * S}px solid rgba(255,255,255,0.2)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${personScale})`,
        fontSize: 32 * S,
      }}>🧑</div>
      {/* Arrow 1 */}
      <div style={{
        width: arrow1W, height: 3 * S,
        background: `linear-gradient(to right, transparent, ${C.muted})`,
        borderRadius: 2 * S,
        marginLeft: 4 * S, marginRight: 4 * S,
      }} />
      {/* AI brain */}
      <div style={{
        width: 90 * S, height: 90 * S, borderRadius: "50%",
        background: C.primaryLight,
        border: `${2 * S}px solid ${C.primary}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${aiScale})`,
        fontSize: 36 * S,
        boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.4)`,
      }}>🧠</div>
      {/* Arrow 2 */}
      <div style={{
        width: arrow2W, height: 3 * S,
        background: `linear-gradient(to right, ${C.primary}, ${C.primary})`,
        borderRadius: 2 * S,
        marginLeft: 4 * S, marginRight: 4 * S,
        boxShadow: `0 0 ${6 * S}px ${C.primary}66`,
      }} />
      {/* Document */}
      <div style={{
        position: "relative",
        width: 90 * S, height: 100 * S,
        background: "rgba(255,255,255,0.08)",
        border: `${2 * S}px solid ${C.yellow}`,
        borderRadius: 8 * S,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${docScale})`,
        boxShadow: `0 0 ${20 * S}px rgba(255,209,102,0.3)`,
      }}>
        <div style={{ fontSize: 36 * S }}>📄</div>
        {/* Floating ? above doc */}
        <div style={{
          position: "absolute", top: -50 * S, left: "50%",
          transform: `translateX(-50%) scale(${qBounce})`,
          opacity: qOp,
          fontFamily: "'Space Mono', monospace", fontSize: 40 * S,
          color: C.yellow, fontWeight: 700,
          textShadow: `0 0 ${16 * S}px rgba(255,209,102,0.7)`,
        }}>?</div>
      </div>
    </div>
  );
}

// 2. ResponsibilityChainAnimation — Scene 1
//    visual metaphor: 文件 + 你的署名 stamp + 鎖鏈 + 後果警告
//    "不管是誰幫你做的,後果最終是你的"
function ResponsibilityChainAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 842;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const docScale = easeOutBack(prog(f, 20));
  const stampF = Math.max(0, f - 50);
  const stampScale = interpolate(stampF, [0, 14], [1.6, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  const stampOp = interpolate(stampF, [0, 14], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const chainW = interpolate(Math.max(0, f - 80), [0, 24], [0, 100 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const warnF = Math.max(0, f - 130);
  const warnPulse = Math.sin(warnF * 0.15) * 0.12 + 0.88;
  const warnOp = interpolate(warnF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 240 * S,
    }}>
      {/* Document with signature stamp */}
      <div style={{
        position: "relative",
        width: 180 * S, height: 130 * S,
        background: "rgba(255,255,255,0.05)",
        border: `${2 * S}px solid ${C.surfaceBorder}`,
        borderRadius: 10 * S,
        padding: `${12 * S}px`,
        transform: `scale(${docScale})`,
        boxShadow: `0 0 ${16 * S}px rgba(0,0,0,0.4)`,
      }}>
        <div style={{ height: 4 * S, background: "rgba(255,255,255,0.15)", borderRadius: 2, marginBottom: 6 * S, width: "85%" }} />
        <div style={{ height: 4 * S, background: "rgba(255,255,255,0.12)", borderRadius: 2, marginBottom: 6 * S, width: "70%" }} />
        <div style={{ height: 4 * S, background: "rgba(255,255,255,0.10)", borderRadius: 2, marginBottom: 6 * S, width: "78%" }} />
        <div style={{ height: 4 * S, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 6 * S, width: "60%" }} />
        {/* Signature stamp */}
        <div style={{
          position: "absolute", bottom: 10 * S, right: 12 * S,
          opacity: stampOp,
          transform: `scale(${stampScale}) rotate(-8deg)`,
          border: `${2 * S}px solid ${C.red}`,
          borderRadius: 6 * S,
          padding: `${4 * S}px ${8 * S}px`,
          background: "rgba(255,107,107,0.1)",
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.red, fontWeight: 700, letterSpacing: "0.06em",
        }}>你的署名</div>
      </div>
      {/* Chain link */}
      <div style={{
        width: chainW, height: 14 * S,
        background: `repeating-linear-gradient(90deg, ${C.yellow}aa 0 ${10 * S}px, transparent ${10 * S}px ${16 * S}px)`,
        borderRadius: 4 * S,
      }} />
      {/* Warning label */}
      <div style={{
        opacity: warnOp,
        transform: `scale(${warnPulse})`,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.red, fontWeight: 700,
        background: C.redLight,
        border: `${2 * S}px solid ${C.red}`,
        borderRadius: 8 * S,
        padding: `${8 * S}px ${14 * S}px`,
        textAlign: "center" as const,
        boxShadow: `0 0 ${16 * S}px rgba(255,107,107,0.3)`,
      }}>⚠ 後果是你的</div>
    </div>
  );
}

// 3. QualityScaleAnimation — Scene 1
//    visual metaphor: 天平 — 「夠用」 vs 「最好」 + 「需要判斷力」
//    "AI 給的很多時候是夠用,不是最好"
function QualityScaleAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 690;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const baseScale = easeOutBack(prog(f, 18));
  const leftPanF = Math.max(0, f - 30);
  const leftTilt = interpolate(leftPanF, [0, 30], [0, 12], { easing: E.outQuart, extrapolateRight: "clamp" });
  const leftOp = interpolate(leftPanF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const rightOp = interpolate(Math.max(0, f - 80), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // judgment label appears later — speaker says "判斷力是靠累積來的" at ~75s VTT (delay~480)
  const judgF = Math.max(0, f - 480);
  const judgOp = interpolate(judgF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const judgTy = interpolate(judgF, [0, 22], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 240 * S,
    }}>
      <div style={{
        position: "relative",
        width: 220 * S, height: 130 * S,
        transform: `scale(${baseScale})`,
      }}>
        {/* Beam (tilted) */}
        <div style={{
          position: "absolute", top: 30 * S, left: 0, width: 220 * S, height: 4 * S,
          background: C.muted,
          transform: `rotate(${leftTilt}deg)`,
          transformOrigin: "center",
          borderRadius: 2 * S,
        }} />
        {/* Pivot */}
        <div style={{
          position: "absolute", top: 28 * S, left: "50%", marginLeft: -6 * S,
          width: 12 * S, height: 30 * S, background: C.muted, borderRadius: 4 * S,
        }} />
        {/* Base */}
        <div style={{
          position: "absolute", top: 100 * S, left: "50%", marginLeft: -40 * S,
          width: 80 * S, height: 8 * S, background: C.muted, borderRadius: 4 * S,
        }} />
        {/* Left pan ("夠用") */}
        <div style={{
          position: "absolute", top: 70 * S, left: 4 * S,
          opacity: leftOp,
          width: 90 * S, padding: `${8 * S}px ${4 * S}px`,
          background: "rgba(136,136,136,0.18)",
          border: `${2 * S}px solid ${C.muted}`,
          borderRadius: 8 * S, textAlign: "center" as const,
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
          color: C.muted,
        }}>夠用</div>
        {/* Right pan ("最好") */}
        <div style={{
          position: "absolute", top: 0, right: 4 * S,
          opacity: rightOp,
          width: 90 * S, padding: `${8 * S}px ${4 * S}px`,
          background: C.primaryLight,
          border: `${2 * S}px solid ${C.primary}`,
          borderRadius: 8 * S, textAlign: "center" as const,
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
          color: C.primary, fontWeight: 700,
          boxShadow: `0 0 ${14 * S}px rgba(124,255,178,0.4)`,
          textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.6)`,
        }}>最好 ★</div>
      </div>
      <div style={{
        opacity: judgOp,
        transform: `translateY(${judgTy}px)`,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.08em",
        background: C.primaryLight,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 6 * S, padding: `${6 * S}px ${12 * S}px`,
        textAlign: "center" as const,
        textShadow: `0 0 ${8 * S}px rgba(124,255,178,0.4)`,
      }}>需要判斷力</div>
    </div>
  );
}

// 4. GrowthSkipAnimation — Scene 1
//    visual metaphor: 材料 → [跳過過程 X] → 成品
//    "繞過的正是把材料轉化成成品的過程"
function GrowthSkipAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 470;
  const envelope = interpolate(f, [0, 12, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const matScale = easeOutBack(prog(f, 18));
  const procOp = interpolate(Math.max(0, f - 60), [0, 18], [0, 0.6], { easing: E.outCubic, extrapolateRight: "clamp" });
  const crossOp = interpolate(Math.max(0, f - 90), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const crossW = interpolate(Math.max(0, f - 90), [0, 22], [0, 70 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const goodScale = easeOutBack(prog(Math.max(0, f - 120), 18));
  const labelOp = interpolate(Math.max(0, f - 180), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 240 * S,
    }}>
      <div style={{ position: "relative", width: 240 * S, height: 110 * S }}>
        {/* Material (left) */}
        <div style={{
          position: "absolute", top: 25 * S, left: 0,
          width: 60 * S, height: 60 * S, borderRadius: 12 * S,
          background: "rgba(255,255,255,0.06)",
          border: `${2 * S}px solid rgba(255,255,255,0.25)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${matScale})`,
          fontSize: 24 * S,
        }}>📦</div>
        {/* Process (middle, dimmed) */}
        <div style={{
          position: "absolute", top: 25 * S, left: 90 * S,
          opacity: procOp,
          width: 60 * S, height: 60 * S, borderRadius: 12 * S,
          background: "rgba(136,136,136,0.1)",
          border: `${2 * S}px dashed ${C.muted}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22 * S,
          filter: "grayscale(1)",
        }}>⚙️</div>
        {/* Cross-out line */}
        <div style={{
          position: "absolute", top: 55 * S, left: 90 * S,
          width: crossW, height: 4 * S,
          background: C.red,
          borderRadius: 2 * S,
          opacity: crossOp,
          transform: "rotate(-22deg)",
          transformOrigin: "left",
          boxShadow: `0 0 ${6 * S}px ${C.red}88`,
        }} />
        {/* Output (right) */}
        <div style={{
          position: "absolute", top: 25 * S, right: 0,
          width: 60 * S, height: 60 * S, borderRadius: 12 * S,
          background: C.primaryLight,
          border: `${2 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${goodScale})`,
          fontSize: 24 * S,
          boxShadow: `0 0 ${16 * S}px rgba(124,255,178,0.3)`,
        }}>📄</div>
      </div>
      {/* Label */}
      <div style={{
        opacity: labelOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.red, fontWeight: 700,
        background: C.redLight,
        border: `1px solid ${C.redBorder}`,
        borderRadius: 8 * S, padding: `${8 * S}px ${14 * S}px`,
        textAlign: "center" as const,
      }}>跳過過程＝失去成長</div>
    </div>
  );
}

// 5. AIDependenceAnimation — Scene 2
//    visual metaphor: AI 插頭被拔除 → 人茫然
//    "當 AI 不在的時候,你還能做嗎"
function AIDependenceAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 530;
  const envelope = interpolate(f, [0, 12, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const aiScale = easeOutBack(prog(f, 18));
  const pullF = Math.max(0, f - 80);
  const plugX = interpolate(pullF, [0, 36], [0, -50 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const dimF = Math.max(0, f - 110);
  const aiOp = interpolate(dimF, [0, 30], [1, 0.3], { easing: E.outCubic, extrapolateRight: "clamp" });
  const personF = Math.max(0, f - 150);
  const personOp = interpolate(personF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const personTy = interpolate(personF, [0, 22], [20 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const labelF = Math.max(0, f - 240);
  const labelOp = interpolate(labelF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const sparkOp = pullF > 30 && pullF < 80
    ? interpolate(pullF, [30, 50, 80], [0, 1, 0], clamp)
    : 0;

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 250 * S,
    }}>
      {/* AI brain + plug */}
      <div style={{ position: "relative", width: 220 * S, height: 100 * S }}>
        <div style={{
          position: "absolute", top: 10 * S, right: 0,
          width: 80 * S, height: 80 * S, borderRadius: "50%",
          background: C.primaryLight,
          border: `${2 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32 * S,
          transform: `scale(${aiScale})`,
          opacity: aiOp,
          boxShadow: aiOp > 0.6 ? `0 0 ${20 * S}px rgba(124,255,178,0.4)` : "none",
        }}>🧠</div>
        {/* Plug + cable */}
        <div style={{
          position: "absolute", top: 42 * S, left: plugX,
          display: "flex", alignItems: "center",
        }}>
          <div style={{
            width: 90 * S, height: 4 * S,
            background: `linear-gradient(to right, transparent, ${C.muted})`,
          }} />
          <div style={{
            width: 24 * S, height: 18 * S,
            background: C.yellow,
            borderRadius: 4 * S,
            border: `${2 * S}px solid ${C.muted}`,
            position: "relative",
          }}>
            <div style={{
              position: "absolute", right: -4 * S, top: 3 * S,
              width: 4 * S, height: 3 * S, background: C.muted,
            }} />
            <div style={{
              position: "absolute", right: -4 * S, bottom: 3 * S,
              width: 4 * S, height: 3 * S, background: C.muted,
            }} />
          </div>
        </div>
        {/* Spark when disconnected */}
        <div style={{
          position: "absolute", top: 38 * S, right: 78 * S,
          fontSize: 24 * S,
          opacity: sparkOp,
          color: C.yellow,
          textShadow: `0 0 ${10 * S}px ${C.yellow}`,
        }}>⚡</div>
      </div>
      {/* Person (confused) */}
      <div style={{
        opacity: personOp,
        transform: `translateY(${personTy}px)`,
        width: 70 * S, height: 70 * S, borderRadius: "50%",
        background: "rgba(255,107,107,0.08)",
        border: `${2 * S}px solid ${C.redBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 32 * S,
      }}>😵</div>
      {/* Label */}
      <div style={{
        opacity: labelOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.yellow, fontWeight: 700,
        background: C.yellowLight,
        border: `1px solid ${C.yellowBorder}`,
        borderRadius: 8 * S, padding: `${8 * S}px ${14 * S}px`,
        textAlign: "center" as const,
      }}>沒了 AI，你還能?</div>
    </div>
  );
}

// 6. AIToHumanFlowAnimation — Scene 3
//    visual metaphor: AI (起點) → flow arrow → 人腦判斷 (終點)
//    "以 AI 為起點,以人的判斷為終點"
function AIToHumanFlowAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 290;
  const envelope = interpolate(f, [0, 12, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const aiScale = easeOutBack(prog(f, 18));
  const startLabelOp = interpolate(Math.max(0, f - 24), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const arrowW = interpolate(Math.max(0, f - 50), [0, 30], [0, 80 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const personScale = easeOutBack(prog(Math.max(0, f - 90), 18));
  const endLabelOp = interpolate(Math.max(0, f - 120), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const flowOffset = (f * 1.5) % (30 * S);
  const showFlow = arrowW > 70 * S;

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 280 * S,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {/* AI (start) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S }}>
          <div style={{
            width: 70 * S, height: 70 * S, borderRadius: 14 * S,
            background: C.primaryLight,
            border: `${2 * S}px solid ${C.primary}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28 * S,
            transform: `scale(${aiScale})`,
            boxShadow: `0 0 ${16 * S}px rgba(124,255,178,0.35)`,
          }}>🤖</div>
          <span style={{
            opacity: startLabelOp,
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.06em",
          }}>起點</span>
        </div>
        {/* Flow arrow */}
        <div style={{
          position: "relative",
          width: 100 * S, height: 30 * S,
          marginLeft: 4 * S, marginRight: 4 * S,
        }}>
          <div style={{
            position: "absolute", top: 13 * S, left: 0,
            width: arrowW, height: 4 * S,
            background: `linear-gradient(to right, ${C.primary}, ${C.yellow})`,
            borderRadius: 2 * S,
            boxShadow: `0 0 ${6 * S}px rgba(124,255,178,0.4)`,
          }} />
          {showFlow && (
            <div style={{
              position: "absolute", top: 6 * S, left: arrowW - 6 * S,
              fontSize: 18 * S, color: C.yellow,
              filter: `drop-shadow(0 0 ${4 * S}px ${C.yellow})`,
            }}>▶</div>
          )}
          {showFlow && [0, 1, 2].map((i) => {
            const x = (flowOffset + i * 30 * S) % (90 * S);
            return (
              <div key={i} style={{
                position: "absolute", top: 11 * S, left: x,
                width: 8 * S, height: 8 * S, borderRadius: "50%",
                background: C.primary,
                boxShadow: `0 0 ${4 * S}px ${C.primary}`,
              }} />
            );
          })}
        </div>
        {/* Human judgment (end) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S }}>
          <div style={{
            width: 70 * S, height: 70 * S, borderRadius: 14 * S,
            background: "rgba(255,209,102,0.10)",
            border: `${2 * S}px solid ${C.yellow}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28 * S,
            transform: `scale(${personScale})`,
            boxShadow: `0 0 ${16 * S}px rgba(255,209,102,0.35)`,
          }}>🧠</div>
          <span style={{
            opacity: endLabelOp,
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.yellow, letterSpacing: "0.06em",
          }}>終點</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_04_27.title.to - SCENES_2026_04_27.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(46);
  const tagStyle = useFadeUp(64);

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
        <div style={{ ...badgeOp, marginBottom: 14 * S }}>
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
          <WordReveal text="AI 幫你做完的工作" startFrame={10} staggerPerWord={6}
            fontSize={38 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 38 * S, color: C.primary,
        }}>
          <WordReveal text="你還算做了嗎" startFrame={28} staggerPerWord={6}
            fontSize={38 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle, margin: 0,
          marginTop: 22 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 22 * S, color: C.muted, lineHeight: 1.6,
        }}>
          責任、品質、成長 — AI 時代的工作哲學
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 18 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>責任 · 判斷力 · 手感 · 協作</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation: WhoseWorkAnimation at frame 319 (=10.64s VTT) */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <WhoseWorkAnimation triggerFrame={319} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — 責任 / 品質 / 成長 ─────────────────────────────────────────
function ThreeThingsCard({ index, label, body, delay, color }: {
  index: string; label: string; body: string; delay: number; color: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        background: `${color}10`,
        border: `${1 * S}px solid ${color}55`,
        borderLeft: `${4 * S}px solid ${color}`,
        borderRadius: 12 * S,
        padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 8 * S,
        }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
            color, fontWeight: 700, letterSpacing: "0.05em",
            textShadow: `0 0 ${8 * S}px ${color}66`,
          }}>{index}</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
            color, fontWeight: 700,
          }}>{label}</span>
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.text, lineHeight: 1.65,
        }}>{body}</div>
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_27.scene1.to - SCENES_2026_04_27.scene1.from;

  // VTT-based local frame anchors (local = global - 614)
  // 20.48s → 0    "先從第一個情境開始"
  // 23.52s → 92   "假設你叫AI幫你寫一份報告"
  // 33.6s  → 394  "這背後牽涉到三件事"
  // 36.08s → 468  "第一,責任"
  // 59.36s → 1167 "第二,品質"
  // 79.12s → 1760 "第三,成長"
  // 91.52s → 2132 "停頓,問你一個問題" (Phase B starts)
  const HEADER_AT = 0;
  const SCENARIO_AT = 92;
  const THREE_INTRO_AT = 394;
  const RESP_AT = 468;
  const QUAL_AT = 1167;
  const GROW_AT = 1760;

  // Phase A → B
  const A_FADE_START = 2052;
  const A_REMOVE = 2132;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = 2132;
  const showB = frame >= B_SHOW_AT;

  const headerStyle = useFadeUp(HEADER_AT);
  const scenarioStyle = useFadeUp(SCENARIO_AT);
  const threeIntroStyle = useFadeUp(THREE_INTRO_AT);
  const reflectStyle = useFadeUp(showB ? B_SHOW_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Section header */}
            <div style={{ ...headerStyle, marginBottom: 14 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                display: "inline-block", marginBottom: 10 * S,
              }}>SCENARIO</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                color: C.text, fontWeight: 700, lineHeight: 1.4,
              }}>當 AI 幫你做完，那是不是你的成果？</div>
            </div>

            {/* Scenario card */}
            <div style={{ ...scenarioStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.6,
                }}>
                  AI 幫你寫初稿，你
                  <span style={{ color: C.yellow, fontWeight: 700 }}> 改了幾個字 </span>
                  就送出去了——
                  <span style={{ color: C.primary, fontWeight: 700 }}>算是你做的嗎？</span>
                </div>
              </div>
            </div>

            {/* Three things intro */}
            <div style={{ ...threeIntroStyle, marginBottom: 14 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.08em",
              }}>這背後牽涉到三件事</div>
            </div>

            {/* Three cards */}
            <ThreeThingsCard
              index="01" label="責任"
              body="不管是誰幫你做的，後果最終是你的。AI 不能當擋箭牌。"
              delay={RESP_AT} color={C.red}
            />
            <ThreeThingsCard
              index="02" label="品質"
              body="AI 給的常是「夠用」不是「最好」。沒判斷力，你連差別都看不出來。"
              delay={QUAL_AT} color={C.yellow}
            />
            <ThreeThingsCard
              index="03" label="成長"
              body="材料轉化成成品的過程，正是你學最多的地方。跳過了就失去了。"
              delay={GROW_AT} color={C.primary}
            />
          </div>
        )}

        {/* ── Phase B: Reflection question ────────────────── */}
        {showB && (
          <div style={{ ...reflectStyle, marginTop: 60 * S }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.primary, letterSpacing: "0.1em",
              background: C.primaryLight,
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
              display: "inline-block", marginBottom: 16 * S,
            }}>停頓 · 想一想</div>

            <div style={{
              background: C.surface,
              border: `${2 * S}px solid ${C.primary}`,
              borderRadius: 14 * S,
              padding: `${22 * S}px ${24 * S}px`,
              boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.15)`,
            }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26 * S,
                color: C.text, fontWeight: 700, lineHeight: 1.5,
              }}>
                你最近用 AI 完成的事情中，有沒有哪一件——
                <span style={{ color: C.primary }}>你自己根本沒有真的思考過？</span>
              </div>
            </div>
          </div>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ResponsibilityChainAnimation triggerLocalFrame={RESP_AT} />
        <QualityScaleAnimation triggerLocalFrame={QUAL_AT} />
        <GrowthSkipAnimation triggerLocalFrame={GROW_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — 失去手感 + 依賴 AI 的風險 ──────────────────────────────────
function ExampleItem({ icon, text, delay }: { icon: string; text: string; delay: number }) {
  const style = useFadeUp(delay);
  return (
    <div style={{
      ...style,
      display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 10 * S,
      padding: `${8 * S}px ${14 * S}px`,
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${C.surfaceBorder}`,
      borderRadius: 10 * S,
    }}>
      <span style={{ fontSize: 22 * S }}>{icon}</span>
      <span style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text, lineHeight: 1.55,
      }}>{text}</span>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_27.scene2.to - SCENES_2026_04_27.scene2.from;

  // VTT anchors (local = global - 3084)
  // 102.8s  → 0     "有一種能力叫做手感"
  // 105.84s → 91    "寫作的人知道"
  // 110.56s → 233   "設計的人知道"
  // 116.32s → 405   "就算是算術"
  // 123.6s  → 624   "AI也一樣"
  // 134.4s  → 948   "AI是加速工具"
  // 150.72s → 1438  "更實際的風險是"
  // 168.24s → 1963  "再問你一個問題" (Phase B starts)
  const HEADER_AT = 0;
  const EX1_AT = 91;
  const EX2_AT = 233;
  const EX3_AT = 405;
  const AI_COMPARE_AT = 624;
  const TOOL_AT = 948;
  const RISK_AT = 1438;

  const A_FADE_START = 1883;
  const A_REMOVE = 1963;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = 1963;
  const showB = frame >= B_SHOW_AT;

  // Phase A height: header 100 + 3 examples (3*100=300) + AI compare 200 + tool 220 + risk 250
  //   = 1070 + 5 margins (5*48=240) = 1310 < 1620, no early fade needed.

  const headerStyle = useFadeUp(HEADER_AT);
  const aiCompareStyle = useFadeUp(AI_COMPARE_AT);
  const toolStyle = useFadeUp(TOOL_AT);
  const riskStyle = useFadeUp(RISK_AT);
  const reflectStyle = useFadeUp(showB ? B_SHOW_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 14 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.1em",
                background: C.yellowLight,
                border: `1px solid ${C.yellowBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                display: "inline-block", marginBottom: 10 * S,
              }}>HANDS-ON 手感</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                color: C.text, fontWeight: 700, lineHeight: 1.4,
              }}>有一種能力，叫做<span style={{ color: C.yellow }}> 手感</span></div>
            </div>

            <ExampleItem icon="✍️" text="寫作 — 反覆寫才會找到自己的聲音" delay={EX1_AT} />
            <ExampleItem icon="🎨" text="設計 — 做過才知道什麼叫比例感" delay={EX2_AT} />
            <ExampleItem icon="🧮" text="算術 — 計算機算多了，數感就退化" delay={EX3_AT} />

            <div style={{ ...aiCompareStyle, marginTop: 16 * S, marginBottom: 14 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `${1.5 * S}px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: 700, lineHeight: 1.5,
                }}>
                  AI 也一樣——把<span style={{ color: C.text }}>「思考的起點」</span>都交給它，
                  你繞過的還有<span style={{ color: C.text }}>訓練自己的機會</span>。
                </div>
              </div>
            </div>

            <div style={{ ...toolStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 10 * S,
                padding: `${12 * S}px ${18 * S}px`,
                display: "flex", alignItems: "center", gap: 14 * S,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em",
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 6 * S, padding: `${4 * S}px ${10 * S}px`,
                  flexShrink: 0,
                }}>記住</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.5,
                }}>
                  AI 是<span style={{ color: C.primary, fontWeight: 700 }}>加速工具</span>，
                  不是<span style={{ color: C.red, fontWeight: 700 }}>替代你思考</span>的機器。
                </div>
              </div>
            </div>

            <div style={{ ...riskStyle }}>
              <div style={{
                background: C.yellowLight,
                border: `${1.5 * S}px solid ${C.yellow}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${16 * S}px rgba(255,209,102,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.1em", marginBottom: 8 * S,
                }}>⚠ 更實際的風險</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: 700, lineHeight: 1.5,
                }}>當 AI 不在的時候，你還能做嗎？</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B: Reflection ────────────────────────── */}
        {showB && (
          <div style={{ ...reflectStyle, marginTop: 60 * S }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.primary, letterSpacing: "0.1em",
              background: C.primaryLight,
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
              display: "inline-block", marginBottom: 16 * S,
            }}>再問一個問題</div>

            <div style={{
              background: C.surface,
              border: `${2 * S}px solid ${C.primary}`,
              borderRadius: 14 * S,
              padding: `${22 * S}px ${24 * S}px`,
              boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.15)`,
            }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26 * S,
                color: C.text, fontWeight: 700, lineHeight: 1.5,
              }}>
                你的核心能力裡，有沒有哪一塊——
                <span style={{ color: C.primary }}>你已經開始不太自己動腦了？</span>
              </div>
            </div>
          </div>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <AIDependenceAnimation triggerLocalFrame={RISK_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 三步協作姿態 ──────────────────────────────────────────────
function StepCard({ index, label, body, delay, color }: {
  index: string; label: string; body: string; delay: number; color: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        background: `${color}10`,
        border: `${1 * S}px solid ${color}55`,
        borderLeft: `${4 * S}px solid ${color}`,
        borderRadius: 12 * S,
        padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 6 * S,
        }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
            color, fontWeight: 700, letterSpacing: "0.05em",
            textShadow: `0 0 ${8 * S}px ${color}66`,
          }}>STEP {index}</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
            color, fontWeight: 700,
          }}>{label}</span>
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.text, lineHeight: 1.65,
        }}>{body}</div>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_27.scene3.to - SCENES_2026_04_27.scene3.from;

  // VTT anchors (local = global - 5258)
  // 175.28 → 0    "有一個概念我很喜歡"
  // 177.04 → 53   "以AI為起點" (AIToHumanFlowAnimation trigger)
  // 180.88 → 168  "具體怎麼做"
  // 183.6  → 250  "第一"
  // 184.24 → 269  "先自己想"
  // 197.28 → 660  "把AI的輸出當草稿"
  // 209.6  → 1030 "保留那個你才能說的部分"
  // 220.64 → 1361 "成品就會變成沒有人味的東西"
  // 226.16 → 1527 "從AI素養的角度來說" (Phase B starts)
  // 232.4  → 1714 "但知道什麼時候不該用AI"
  // 234.8  → 1786 "有些工作"
  // 239.28 → 1920 "最後一個問題"
  const HEADER_AT = 0;
  const TAGLINE_AT = 53;
  const HOWTO_AT = 168;
  const STEP1_AT = 269;
  const STEP2_AT = 660;
  const STEP3_AT = 1030;
  const HUMANITY_AT = 1361;
  const AI_FLOW_TRIGGER = 53;

  const A_FADE_START = 1447;
  const A_REMOVE = 1527;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = 1527;
  const showB = frame >= B_SHOW_AT;

  // Phase A height: header 110 + tagline 200 + howto 70 + 3 step cards (3*250=750) + humanity 130
  //   = 1260 + 5 margins (5*48=240) = 1500 < 1620 ✓

  const B_HIGHLIGHT_AT = 1714;
  const B_BASE_AT = 1786;
  const B_FINAL_Q_AT = 1920;

  const headerStyle = useFadeUp(HEADER_AT);
  const taglineStyle = useFadeUp(TAGLINE_AT);
  const howtoStyle = useFadeUp(HOWTO_AT);
  const humanityStyle = useFadeUp(HUMANITY_AT);
  const bHeaderStyle = useFadeUp(showB ? B_SHOW_AT : 999999);
  const bHighlightStyle = useFadeUp(showB ? B_HIGHLIGHT_AT : 999999);
  const bBaseStyle = useFadeUp(showB ? B_BASE_AT : 999999);
  const bFinalQStyle = useFadeUp(showB ? B_FINAL_Q_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ──────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 14 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                display: "inline-block",
              }}>正確協作姿態</div>
            </div>

            <div style={{ ...taglineStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `${2 * S}px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                  color: C.text, fontWeight: 700, lineHeight: 1.5,
                }}>
                  以 <span style={{ color: C.primary }}>AI 為起點</span>，
                  以 <span style={{ color: C.yellow }}>人的判斷為終點</span>
                </div>
              </div>
            </div>

            <div style={{ ...howtoStyle, marginBottom: 12 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.08em",
              }}>具體怎麼做？分三點說</div>
            </div>

            <StepCard
              index="01" label="先自己想，再問 AI"
              body="先花五分鐘把想法寫下來。這樣是「協作」，不是請 AI 替你想。"
              delay={STEP1_AT} color={C.primary}
            />
            <StepCard
              index="02" label="把輸出當草稿，不是終稿"
              body="判斷哪裡好、哪裡不夠、哪裡需要你補充你才有的觀點。"
              delay={STEP2_AT} color={C.yellow}
            />
            <StepCard
              index="03" label="保留你才能說的部分"
              body="你的個人經驗、對情境的理解、你的判斷——這些是 AI 沒有的。"
              delay={STEP3_AT} color={C.primary}
            />

            <div style={{
              ...humanityStyle,
              marginTop: 8 * S,
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.muted, lineHeight: 1.6, fontStyle: "italic" as const,
            }}>
              省掉這些，成品就會變成<span style={{ color: C.red }}>沒有人味的東西</span>。
            </div>
          </div>
        )}

        {/* ── Phase B ──────────────────────── */}
        {showB && (
          <>
            <div style={{ ...bHeaderStyle, marginBottom: 14 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.1em",
                background: C.yellowLight,
                border: `1px solid ${C.yellowBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                display: "inline-block", marginBottom: 10 * S,
              }}>AI 素養</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: 700, lineHeight: 1.4,
              }}>學會和 AI 協作是一種能力——</div>
            </div>

            <div style={{ ...bHighlightStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `${1.5 * S}px solid ${C.yellow}`,
                borderRadius: 12 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(255,209,102,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                  color: C.yellow, fontWeight: 700, lineHeight: 1.5,
                }}>
                  但「<span style={{ color: C.text }}>知道什麼時候不該用 AI</span>」也是。
                </div>
              </div>
            </div>

            <div style={{ ...bBaseStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 10 * S,
                padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.6,
                }}>
                  有些工作，
                  <span style={{ color: C.primary, fontWeight: 700 }}>刻意自己完成</span>
                  ，是為了保持你的<span style={{ color: C.primary, fontWeight: 700 }}>能力基準線</span>。
                </div>
              </div>
            </div>

            <div style={{ ...bFinalQStyle }}>
              <div style={{
                background: C.surface,
                border: `${2 * S}px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${20 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>最後一個問題</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: 700, lineHeight: 1.5,
                }}>
                  你有沒有設定過——「
                  <span style={{ color: C.primary }}>這件事我要自己做，不用 AI</span>
                  」？
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <AIToHumanFlowAnimation triggerLocalFrame={AI_FLOW_TRIGGER} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene ───────────────────────────────────────────────────────
function SummaryCard({ number, label, body, delay, color }: {
  number: string; label: string; body: string; delay: number; color: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        display: "flex", gap: 14 * S, alignItems: "flex-start",
        background: `${color}12`,
        border: `1px solid ${color}55`,
        borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
          color, fontWeight: 700, flexShrink: 0, marginTop: 2 * S,
          textShadow: `0 0 ${10 * S}px ${color}88`,
        }}>{number}</div>
        <div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
            color, fontWeight: 700, marginBottom: 6 * S, lineHeight: 1.4,
          }}>{label}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.text, lineHeight: 1.65,
          }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_04_27.summary.to - SCENES_2026_04_27.summary.from;

  // VTT anchors (local = global - 7519)
  // 250.64 → 0    "我們來快速整理今天的重點"
  // 253.52 → 86   "第一,責任不能外包"
  // 261.84 → 336  "第二,代勞的代價"
  // 267.84 → 516  "第三,正確的協作姿態"
  // 275.44 → 744  "這裡是每日AI知識庫"
  const BADGE_AT = 0;
  const CARD1_AT = 86;
  const CARD2_AT = 336;
  const CARD3_AT = 516;
  const OUTRO_AT = 744;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
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
          number="01" label="責任不能外包" delay={CARD1_AT}
          body="成果不管誰幫你做，最終責任都是你的——AI 不是擋箭牌。"
          color={C.red}
        />
        <SummaryCard
          number="02" label="代勞的代價" delay={CARD2_AT}
          body="讓 AI 跳過思考的過程，你也跳過了成長的機會。"
          color={C.yellow}
        />
        <SummaryCard
          number="03" label="正確的協作姿態" delay={CARD3_AT}
          body="先想再問、把輸出當草稿、保留你才有的判斷與觀點。"
          color={C.primary}
        />

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
export function VideoComposition_2026_04_27() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_04_27.scene1;
  const S2 = SCENES_2026_04_27.scene2;
  const S3 = SCENES_2026_04_27.scene3;
  const SU = SCENES_2026_04_27.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-27-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_04_27 - 150, TOTAL_FRAMES_2026_04_27],
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
