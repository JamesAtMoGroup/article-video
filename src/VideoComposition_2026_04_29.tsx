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
  blue: "#7cb8ff",
  blueLight: "rgba(124,184,255,0.08)",
  blueBorder: "rgba(124,184,255,0.22)",
} as const;

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W = 290 * S;
const NOTIF_TOP = 12 * S;
const NOTIF_RIGHT = 20 * S;
const NOTIF_SLOT = 148 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// VTT: 0–16.72s intro → TitleScene (0–502)
//      16.72–100.72s 為什麼要管制 → Scene1 (502–3022)
//      100.72–185.76s 各國路線 → Scene2 (3022–5573)
//      185.76–274.48s 台灣 → Scene3 (5573–8234)
//      274.48–313.6s 重點整理 → Summary (8234–9450)
export const SCENES_2026_04_29 = {
  title: { from: 0, to: 502 },
  scene1: { from: 502, to: 3022 },
  scene2: { from: 3022, to: 5573 },
  scene3: { from: 5573, to: 8234 },
  summary: { from: 8234, to: 9450 },
} as const;
export const TOTAL_FRAMES_2026_04_29 = 9450;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "為什麼要管 AI", start: 502 },
  { label: "各國三種路線", start: 3022 },
  { label: "台灣在哪裡", start: 5573 },
  { label: "重點整理", start: 8234 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 2779, to: 3022, sender: "想一想", text: "你認為政府管制 AI，最迫切需要處理的問題是什麼？" },
  { from: 5369, to: 5573, sender: "比較思考", text: "歐盟、美國、中國三種路線——哪一種你覺得台灣比較適合參考？" },
  { from: 7973, to: 8234, sender: "公共參與", text: "如果你能影響一條台灣的 AI 政策，你最想規範哪一件事？" },
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

// ── SceneFade ──────────────────────────────────────────────────────────────
function SceneFade({ children, durationInFrames }: { children: React.ReactNode; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
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
        background: "radial-gradient(circle, rgba(124,184,255,0.06) 0%, transparent 70%)",
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

// 1. RegulationScalesAnimation — TitleScene (right) trigger 90, DURATION 380
// Visual metaphor: AI brain + balance scale tipping toward regulation
function RegulationScalesAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 380;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const tilt = Math.sin(f * 0.04) * 6;
  const brainScale = easeOutBack(prog(f, 22));
  const beamW = interpolate(Math.max(0, f - 20), [0, 30], [0, 140 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const labelOp = interpolate(Math.max(0, f - 70), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 240 * S,
    }}>
      {/* Brain */}
      <div style={{
        width: 100 * S, height: 100 * S, borderRadius: "50%",
        background: "rgba(124,255,178,0.12)",
        border: `${3 * S}px solid ${C.primary}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 40 * S,
        transform: `scale(${brainScale})`,
        boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.4)`,
      }}>🧠</div>

      {/* Scale beam */}
      <div style={{
        position: "relative", width: beamW, height: 6 * S,
        background: `linear-gradient(to right, transparent, ${C.primary}, transparent)`,
        transform: `rotate(${tilt}deg)`, transformOrigin: "center",
      }}>
        {beamW > 100 * S && (
          <>
            <div style={{
              position: "absolute", left: -10 * S, top: -4 * S,
              fontSize: 24 * S,
            }}>⚖️</div>
            <div style={{
              position: "absolute", right: -10 * S, top: -4 * S,
              fontSize: 24 * S,
            }}>📜</div>
          </>
        )}
      </div>

      {/* Label */}
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.06em",
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
      }}>AI 監管 · 全球路線</div>
    </div>
  );
}

// 2. BiasScaleAnimation — Scene1 (right) trigger 429, DURATION 580
// Visual metaphor: balance tipped, X marks rejected applicants
function BiasScaleAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 580;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labelOp = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // Tilt animation kicks in at f=80 (when speaker says "歧視性的決定" ~40s = local 698, so f=269)
  // Use continuous tilt that grows
  const tiltDeg = interpolate(Math.max(0, f - 70), [0, 60], [0, -10], { easing: E.outCubic, extrapolateRight: "clamp" });

  // Item delays (local f anchors):
  // f=0    "第一 偏見與歧視"
  // f=72   "AI用於徵才、貸款審核、保釋評估時"  → show 3 use case tags
  // f=195  "如果訓練資料帶有偏見" → highlight bias dataset
  // f=269  "模型就可能做出歧視性的決定" → show X marks
  const itemsAt = [72, 122, 172];   // 徵才/貸款/保釋 — staggered
  const labels = ["徵才", "貸款審核", "保釋評估"];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
    }}>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.red, letterSpacing: "0.08em",
        background: "rgba(255,107,107,0.1)", border: `1px solid ${C.redBorder}`,
        borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
      }}>BIAS · 偏見</div>

      {/* Tilted scale */}
      <div style={{
        position: "relative", width: 200 * S, height: 100 * S,
        transform: `rotate(${tiltDeg}deg)`, transformOrigin: "center 80%",
      }}>
        <div style={{
          position: "absolute", left: 0, right: 0, top: 30 * S, height: 4 * S,
          background: `linear-gradient(to right, ${C.red}, ${C.muted})`,
          borderRadius: 2 * S,
        }} />
        <div style={{
          position: "absolute", left: "50%", top: 30 * S, bottom: 0,
          width: 4 * S, background: C.muted, transform: "translateX(-50%)",
        }} />
        {/* Heavy left pan (bias) */}
        <div style={{
          position: "absolute", left: 0, top: 0,
          width: 60 * S, height: 50 * S, borderRadius: 8 * S,
          border: `2px solid ${C.red}`, background: "rgba(255,107,107,0.18)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24 * S,
        }}>⚠️</div>
        {/* Light right pan */}
        <div style={{
          position: "absolute", right: 0, top: 14 * S,
          width: 60 * S, height: 36 * S, borderRadius: 8 * S,
          border: `2px solid ${C.muted}`, background: "rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18 * S,
        }}>⚖️</div>
      </div>

      {/* Use case tags appearing one by one */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S, width: "100%" }}>
        {itemsAt.map((delay, i) => {
          const itemF = Math.max(0, f - delay);
          const op = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const tx = interpolate(itemF, [0, 22], [25 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: op,
              transform: `translateX(${tx}px)`,
              display: "flex", alignItems: "center", gap: 10 * S,
              background: "rgba(0,0,0,0.78)",
              border: `1px solid rgba(255,107,107,0.2)`,
              borderLeft: `3px solid ${C.red}`,
              borderRadius: 8 * S, padding: `${8 * S}px ${12 * S}px`,
            }}>
              <span style={{ fontSize: 18 * S, color: C.red }}>✕</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text,
              }}>{labels[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 3. DeepfakeMaskAnimation — Scene1 (left) trigger 986, DURATION 510
// Visual metaphor: real face → fake face overlay with glitch
function DeepfakeMaskAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 510;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labelOp = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // Real face shows from 0, fake mask slides in over it from f=80
  const maskSlide = interpolate(Math.max(0, f - 60), [0, 30], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });

  // Impact tags: 選舉 / 名譽 / 媒體信任 — at speaker mentions (~107s local 1293, f≈307)
  const impactsAt = [180, 240, 300];
  const impacts = [
    { icon: "🗳", label: "選舉" },
    { icon: "👤", label: "個人名譽" },
    { icon: "📰", label: "媒體信任" },
  ];

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
    }}>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.yellow, letterSpacing: "0.08em",
        background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
        borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
      }}>DEEPFAKE · 深偽</div>

      {/* Face stack */}
      <div style={{ position: "relative", width: 120 * S, height: 120 * S }}>
        {/* Real face */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "rgba(124,184,255,0.15)",
          border: `2px solid ${C.blue}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 50 * S,
        }}>🙂</div>
        {/* Mask sliding over */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "rgba(255,209,102,0.25)",
          border: `2px solid ${C.yellow}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 50 * S,
          opacity: maskSlide,
          transform: `translateX(${(1 - maskSlide) * 60 * S}px)`,
          boxShadow: `0 0 ${20 * S}px rgba(255,209,102,0.5)`,
        }}>🎭</div>
        {/* Glitch dot */}
        {f > 60 && (
          <div style={{
            position: "absolute", right: -10 * S, top: -10 * S,
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.red,
            background: "rgba(0,0,0,0.85)", padding: `${4 * S}px ${8 * S}px`,
            borderRadius: 4 * S,
            opacity: Math.sin(f * 0.4) * 0.5 + 0.5,
          }}>FAKE</div>
        )}
      </div>

      {/* Impact tags */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S, width: "100%" }}>
        {impactsAt.map((delay, i) => {
          const itemF = Math.max(0, f - delay);
          const op = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const tx = interpolate(itemF, [0, 22], [-25 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: op,
              transform: `translateX(${tx}px)`,
              display: "flex", alignItems: "center", gap: 10 * S,
              background: "rgba(0,0,0,0.78)",
              border: `1px solid ${C.yellowBorder}`,
              borderLeft: `3px solid ${C.yellow}`,
              borderRadius: 8 * S, padding: `${8 * S}px ${12 * S}px`,
            }}>
              <span style={{ fontSize: 20 * S }}>{impacts[i].icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text,
              }}>{impacts[i].label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 4. CriticalInfraAnimation — Scene1 (right) trigger 1461, DURATION 410
// Visual metaphor: 3 infra icons connected to AI hub with warning pulse
function CriticalInfraAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 410;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labelOp = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // Sectors: 能源 (1:09.04 = local 1569, f=108), 醫療 (~f=148), 金融 (~f=188)
  // Warning pulse at "出錯或惡意利用" 1:12.56 = local 1675, f=214
  const sectorsAt = [108, 148, 188];
  const sectors = [
    { icon: "⚡", label: "能源" },
    { icon: "🏥", label: "醫療" },
    { icon: "💰", label: "金融" },
  ];

  const warnPulse = f > 214 ? Math.sin((f - 214) * 0.18) * 0.4 + 0.6 : 0;

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
    }}>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.red, letterSpacing: "0.08em",
        background: "rgba(255,107,107,0.1)", border: `1px solid ${C.redBorder}`,
        borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
      }}>CRITICAL · 關鍵基建</div>

      {/* Central AI brain */}
      <div style={{
        width: 90 * S, height: 90 * S, borderRadius: "50%",
        background: warnPulse > 0 ? `rgba(255,107,107,${warnPulse * 0.3})` : "rgba(124,255,178,0.12)",
        border: `${3 * S}px solid ${warnPulse > 0 ? C.red : C.primary}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36 * S,
        boxShadow: warnPulse > 0
          ? `0 0 ${30 * S}px rgba(255,107,107,${warnPulse * 0.6})`
          : `0 0 ${20 * S}px rgba(124,255,178,0.3)`,
      }}>{warnPulse > 0 ? "⚠️" : "🤖"}</div>

      {/* Sector cards in a row */}
      <div style={{ display: "flex", gap: 10 * S, justifyContent: "center", width: "100%" }}>
        {sectorsAt.map((delay, i) => {
          const itemF = Math.max(0, f - delay);
          const op = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const ty = interpolate(itemF, [0, 22], [25 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          const sectorWarn = warnPulse > 0 ? warnPulse : 1;
          return (
            <div key={i} style={{
              opacity: op,
              transform: `translateY(${ty}px)`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5 * S,
              background: "rgba(0,0,0,0.8)",
              border: `1px solid ${warnPulse > 0 ? C.redBorder : C.primaryBorder}`,
              borderRadius: 10 * S, padding: `${10 * S}px ${10 * S}px`,
              minWidth: 70 * S,
              boxShadow: warnPulse > 0 ? `0 0 ${10 * S}px rgba(255,107,107,${sectorWarn * 0.3})` : "none",
            }}>
              <span style={{ fontSize: 22 * S }}>{sectors[i].icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text,
              }}>{sectors[i].label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 5. PowerCentralizationAnimation — Scene1 (left) trigger 1838, DURATION 460
// Visual metaphor: Many small dots → 3 big company nodes (centralization)
function PowerCentralizationAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 460;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labelOp = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  // Big company appears at "大型AI模型集中..." 1:22.00 = local 1958, f=120
  // Crown appears at "誰擁有AI 誰就擁有權力" — same trigger
  const bigsAt = [40, 80, 120];
  const bigs = ["A", "B", "C"];

  const crownOp = interpolate(Math.max(0, f - 200), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.yellow, letterSpacing: "0.08em",
        background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
        borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
      }}>POWER · 權力集中</div>

      {/* Crown above */}
      <div style={{ opacity: crownOp, fontSize: 32 * S }}>👑</div>

      {/* Three big company circles */}
      <div style={{ display: "flex", gap: 12 * S, justifyContent: "center", alignItems: "center" }}>
        {bigsAt.map((delay, i) => {
          const itemF = Math.max(0, f - delay);
          const scale = easeOutBack(prog(itemF, 22));
          const op = interpolate(itemF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: op,
              transform: `scale(${scale})`,
              width: 70 * S, height: 70 * S,
              borderRadius: "50%",
              background: "rgba(124,255,178,0.15)",
              border: `2px solid ${C.primary}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Space Mono', monospace", fontSize: 26 * S,
              color: C.primary, fontWeight: "700",
              boxShadow: `0 0 ${16 * S}px rgba(124,255,178,0.3)`,
            }}>{bigs[i]}</div>
          );
        })}
      </div>

      {/* Footer label */}
      <div style={{
        opacity: crownOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.muted, textAlign: "center" as const, lineHeight: 1.4,
      }}>少數公司 = 巨大權力</div>
    </div>
  );
}

// 6. EURiskTierAnimation — Scene2 (right) trigger 199, DURATION 980
// Visual metaphor: 3-tier risk pyramid with EU stars
function EURiskTierAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 980;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labelOp = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // Tiers (delays vs trigger):
  // 不可接受 at 1:55.20 (local 434, f=235)
  // 高風險   at 2:01.36 (local 619, f=420)
  // 低風險   at 2:08.64 (local 838, f=639)
  const tiersAt = [235, 420, 639];
  const tiers = [
    { label: "不可接受", desc: "禁止", color: C.red, border: C.redBorder, h: 40 },
    { label: "高風險", desc: "嚴格審查", color: C.yellow, border: C.yellowBorder, h: 60 },
    { label: "低風險", desc: "自由使用", color: C.primary, border: C.primaryBorder, h: 80 },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
    }}>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.blue, letterSpacing: "0.08em",
        background: C.blueLight, border: `1px solid ${C.blueBorder}`,
        borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
      }}>🇪🇺 EU AI ACT</div>

      {/* Pyramid */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S, width: "100%" }}>
        {tiers.map((t, i) => {
          const itemF = Math.max(0, f - tiersAt[i]);
          const op = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const sx = interpolate(itemF, [0, 22], [0.7, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: op,
              transform: `scaleX(${sx})`,
              width: `${(i + 1) * 33 + 10}%`,
              height: t.h * S,
              background: `${t.border}30`,
              border: `2px solid ${t.color}`,
              borderRadius: 8 * S,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 ${10 * S}px ${t.color}33`,
            }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: t.color, fontWeight: "700",
              }}>{t.label}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.text, opacity: 0.85,
              }}>{t.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 7. USStatePatchworkAnimation — Scene2 (left) trigger 1178, DURATION 540
// Visual metaphor: 50 mini squares with scattered colored "law" patches
function USStatePatchworkAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 540;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labelOp = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // No federal law: f=0 to ~46 ("聯邦AI法案" 2:24.72 = local 1320, f=142)
  // Scattered states: f=142 onwards
  const noFedOp = interpolate(f, [40, 80], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const pragmatismOp = interpolate(Math.max(0, f - 264), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  // 6×4 grid = 24 cells, with random subset highlighted
  const totalCells = 24;
  const highlighted = [3, 7, 11, 14, 18, 21];

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
    }}>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.blue, letterSpacing: "0.08em",
        background: C.blueLight, border: `1px solid ${C.blueBorder}`,
        borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
      }}>🇺🇸 USA · 各州分散</div>

      {/* No federal law banner */}
      <div style={{
        opacity: noFedOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted,
        background: "rgba(255,255,255,0.04)", border: `1px dashed ${C.surfaceBorder}`,
        borderRadius: 6 * S, padding: `${5 * S}px ${10 * S}px`,
      }}>NO FEDERAL LAW</div>

      {/* States grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 * S,
        width: "100%",
      }}>
        {Array.from({ length: totalCells }).map((_, i) => {
          const isHi = highlighted.includes(i);
          const cellDelay = 80 + i * 5;
          const cellF = Math.max(0, f - cellDelay);
          const op = interpolate(cellF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: op,
              height: 28 * S, borderRadius: 4 * S,
              background: isHi ? "rgba(124,184,255,0.3)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${isHi ? C.blue : "rgba(255,255,255,0.1)"}`,
              boxShadow: isHi ? `0 0 ${6 * S}px rgba(124,184,255,0.4)` : "none",
            }} />
          );
        })}
      </div>

      <div style={{
        opacity: pragmatismOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text, textAlign: "center" as const, lineHeight: 1.4,
        background: "rgba(0,0,0,0.6)", border: `1px solid ${C.blueBorder}`,
        borderRadius: 8 * S, padding: `${8 * S}px ${12 * S}px`,
      }}>先發展 · 再修正</div>
    </div>
  );
}

// 8. ChinaDualGoalAnimation — Scene2 (right) trigger 1629, DURATION 720
// Visual metaphor: AI rocket (powerful) + control panel (control)
function ChinaDualGoalAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 720;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labelOp = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // Dual goals at "中國同時有兩個目標" 2:36.64 = local 1677, f=48
  // 強國 at 2:38.72 (f=111), 控制 at "維持政治和社會的控制" (f=180)
  const goal1F = Math.max(0, f - 48);
  const goal2F = Math.max(0, f - 180);
  const op1 = interpolate(goal1F, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const op2 = interpolate(goal2F, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const tx1 = interpolate(goal1F, [0, 22], [-25 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const tx2 = interpolate(goal2F, [0, 22], [25 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });

  // Constraints at "演算法推薦管理規範" 2:50.88 = local 2104, f=475
  const ruleOp = interpolate(Math.max(0, f - 475), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.red, letterSpacing: "0.08em",
        background: "rgba(255,107,107,0.1)", border: `1px solid ${C.redBorder}`,
        borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
      }}>🇨🇳 CHINA · 雙重目標</div>

      {/* Two goal cards side by side */}
      <div style={{ display: "flex", gap: 10 * S, justifyContent: "center", width: "100%" }}>
        <div style={{
          opacity: op1,
          transform: `translateX(${tx1}px)`,
          background: "rgba(0,0,0,0.78)",
          border: `1px solid ${C.primaryBorder}`,
          borderRadius: 10 * S, padding: `${10 * S}px ${10 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
          flex: 1,
        }}>
          <span style={{ fontSize: 28 * S }}>🚀</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.primary, fontWeight: "700",
          }}>AI 強國</span>
        </div>
        <div style={{
          opacity: op2,
          transform: `translateX(${tx2}px)`,
          background: "rgba(0,0,0,0.78)",
          border: `1px solid ${C.redBorder}`,
          borderRadius: 10 * S, padding: `${10 * S}px ${10 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
          flex: 1,
        }}>
          <span style={{ fontSize: 28 * S }}>🔒</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.red, fontWeight: "700",
          }}>政治控制</span>
        </div>
      </div>

      {/* Rule banner */}
      <div style={{
        opacity: ruleOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text, lineHeight: 1.4, textAlign: "center" as const,
        background: "rgba(255,107,107,0.08)", border: `1px solid ${C.redBorder}`,
        borderRadius: 8 * S, padding: `${8 * S}px ${12 * S}px`,
      }}>演算法推薦 · 嚴格管理</div>
    </div>
  );
}

// 9. TaiwanLawListAnimation — Scene3 (right) trigger 257, DURATION 620
// Visual metaphor: Taiwan island outline + 4 law badges stacking around it
function TaiwanLawListAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 620;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labelOp = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // Laws (delays vs trigger 257):
  // 個資法     local 257  → f=0
  // 著作權法   local 386  → f=129
  // 金融醫療   local 466  → f=209
  // 數位部     local 561  → f=304
  const lawsAt = [0, 129, 209, 304];
  const laws = [
    "個人資料保護法",
    "著作權法討論",
    "金融 / 醫療指引",
    "數位部 AI 應用指引",
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
    }}>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.08em",
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
      }}>🇹🇼 TAIWAN · 現有法規</div>

      {/* Taiwan emoji + label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10 * S,
        background: "rgba(124,255,178,0.06)",
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 10 * S, padding: `${8 * S}px ${14 * S}px`,
      }}>
        <span style={{ fontSize: 28 * S }}>🏝</span>
        <span style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.text, fontWeight: "700",
        }}>沒有專屬 AI 法案</span>
      </div>

      {/* Law list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S, width: "100%" }}>
        {lawsAt.map((delay, i) => {
          const itemF = Math.max(0, f - delay);
          const op = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const tx = interpolate(itemF, [0, 22], [25 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: op,
              transform: `translateX(${tx}px)`,
              display: "flex", alignItems: "center", gap: 10 * S,
              background: "rgba(0,0,0,0.78)",
              border: `1px solid ${C.surfaceBorder}`,
              borderLeft: `3px solid ${C.primary}`,
              borderRadius: 8 * S, padding: `${8 * S}px ${12 * S}px`,
            }}>
              <span style={{ fontSize: 18 * S, color: C.primary }}>📜</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text,
              }}>{laws[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 10. SemiconductorVsGovernanceAnimation — Scene3 (left) trigger 926, DURATION 410
// Visual metaphor: chip (leader) on top, governance gear (follower) below
function SemiconductorVsGovernanceAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 410;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labelOp = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // Chip leader at "半導體產業是全球AI供應鏈的核心" 3:36.64 = local 926, f=0
  // Follower at "反而是個跟隨者而非領導者" 3:43.20 = local 1123, f=197
  const chipScale = easeOutBack(prog(f, 22));
  const followerOp = interpolate(Math.max(0, f - 150), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const followerTy = interpolate(Math.max(0, f - 150), [0, 22], [25 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.yellow, letterSpacing: "0.08em",
        background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
        borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
      }}>TAIWAN · 處境特殊</div>

      {/* Chip leader card */}
      <div style={{
        transform: `scale(${chipScale})`,
        background: "rgba(124,255,178,0.1)",
        border: `2px solid ${C.primary}`,
        borderRadius: 12 * S, padding: `${10 * S}px ${14 * S}px`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
        width: "100%",
        boxShadow: `0 0 ${14 * S}px rgba(124,255,178,0.3)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 * S }}>
          <span style={{ fontSize: 28 * S }}>💎</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.primary, fontWeight: "700",
          }}>半導體 = 領導者</span>
        </div>
      </div>

      {/* vs separator */}
      <div style={{
        opacity: followerOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted,
      }}>VS</div>

      {/* Follower card */}
      <div style={{
        opacity: followerOp,
        transform: `translateY(${followerTy}px)`,
        background: "rgba(255,209,102,0.08)",
        border: `2px solid ${C.yellow}`,
        borderRadius: 12 * S, padding: `${10 * S}px ${14 * S}px`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
        width: "100%",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 * S }}>
          <span style={{ fontSize: 28 * S }}>🐢</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.yellow, fontWeight: "700",
          }}>AI 治理 = 跟隨者</span>
        </div>
      </div>
    </div>
  );
}

// 11. AILiteracyAnimation — Scene3 (right) trigger 1349, DURATION 620
// Visual metaphor: Person with shield surrounded by 3 literacy skills
function AILiteracyAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 620;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labelOp = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // Skills (delays vs trigger 1349):
  // 瞭解規則    local 1455 → f=106
  // 知道資料    local 1589 → f=240
  // 保持判斷力  local 1656 → f=307
  const skillsAt = [106, 240, 307];
  const skills = [
    { icon: "📖", label: "瞭解工具規則" },
    { icon: "🔍", label: "資料如何使用" },
    { icon: "🧭", label: "保持判斷力" },
  ];

  const shieldScale = easeOutBack(prog(f, 22));

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.08em",
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
      }}>AI LITERACY · 素養</div>

      {/* Person + shield */}
      <div style={{
        transform: `scale(${shieldScale})`,
        width: 90 * S, height: 90 * S, borderRadius: "50%",
        background: "rgba(124,255,178,0.12)",
        border: `${3 * S}px solid ${C.primary}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 40 * S,
        boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.4)`,
      }}>🛡</div>

      {/* Skills list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S, width: "100%" }}>
        {skillsAt.map((delay, i) => {
          const itemF = Math.max(0, f - delay);
          const op = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const tx = interpolate(itemF, [0, 22], [25 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: op,
              transform: `translateX(${tx}px)`,
              display: "flex", alignItems: "center", gap: 10 * S,
              background: "rgba(0,0,0,0.78)",
              border: `1px solid ${C.surfaceBorder}`,
              borderLeft: `3px solid ${C.primary}`,
              borderRadius: 8 * S, padding: `${8 * S}px ${12 * S}px`,
            }}>
              <span style={{ fontSize: 22 * S }}>{skills[i].icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text,
              }}>{skills[i].label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 12. CivicActionsAnimation — Scene3 (left) trigger 1872, DURATION 620
// Visual metaphor: Person → 3 outgoing arrows to civic actions
function CivicActionsAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 620;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labelOp = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // Actions (delays vs trigger 1872):
  // 公共諮詢   local 1939 → f=67
  // 數位部報告 local 2052 → f=180
  // 工作領域   local 2199 → f=327
  const actsAt = [67, 180, 327];
  const acts = [
    { icon: "🗳", label: "支持公共諮詢" },
    { icon: "📊", label: "關注政府報告" },
    { icon: "💼", label: "工作領域推動" },
  ];

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.yellow, letterSpacing: "0.08em",
        background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
        borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
      }}>YOU · 公民行動</div>

      {/* Center person */}
      <div style={{
        width: 80 * S, height: 80 * S, borderRadius: "50%",
        background: "rgba(255,209,102,0.15)",
        border: `${3 * S}px solid ${C.yellow}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36 * S,
        boxShadow: `0 0 ${16 * S}px rgba(255,209,102,0.4)`,
      }}>🙋</div>

      {/* Action list with arrow */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S, width: "100%" }}>
        {actsAt.map((delay, i) => {
          const itemF = Math.max(0, f - delay);
          const op = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const tx = interpolate(itemF, [0, 22], [-25 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: op,
              transform: `translateX(${tx}px)`,
              display: "flex", alignItems: "center", gap: 10 * S,
              background: "rgba(0,0,0,0.78)",
              border: `1px solid ${C.yellowBorder}`,
              borderLeft: `3px solid ${C.yellow}`,
              borderRadius: 8 * S, padding: `${8 * S}px ${12 * S}px`,
            }}>
              <span style={{ fontSize: 22 * S }}>{acts[i].icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text,
              }}>{acts[i].label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_04_29.title.to - SCENES_2026_04_29.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(60);
  const tagStyle = useFadeUp(80);

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
          margin: 0, lineHeight: 1.18,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 36 * S, color: C.text,
        }}>
          <WordReveal text="為什麼有些國家要管制 AI" startFrame={10} staggerPerWord={6}
            fontSize={36 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 — accent */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 32 * S, color: C.primary,
        }}>
          <WordReveal text="台灣呢？" startFrame={36} staggerPerWord={6}
            fontSize={32 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle,
          marginTop: 26 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
        }}>
          AI 監管的全球路線 · 與台灣的位置
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 18 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>歐盟 · 美國 · 中國 · 台灣</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <RegulationScalesAnimation triggerFrame={90} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — 為什麼要管制 AI ───────────────────────────────────────────────
function ReasonCard({ delay, num, label, color, border, body }: {
  delay: number; num: string; label: string; color: string; border: string; body: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div style={{
        background: `${border}18`,
        border: `1.5px solid ${border}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 14 * S,
        padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color, letterSpacing: "0.08em", marginBottom: 8 * S,
        }}>{num} · {label}</div>
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
  const dur = SCENES_2026_04_29.scene1.to - SCENES_2026_04_29.scene1.from;
  // Scene 1 starts at global 502 (16.72s)
  // VTT anchors (local = global - 502):
  // 0   → "第一段 為什麼要管制AI"
  // 74  → "AI這麼有用 為什麼要管它"
  // 151 → "這是一個合理的問題"
  // 384 → "理由大概有幾個"
  // 429 → "第一 偏見與歧視"
  // 986 → "第二 深偽與錯誤資訊"
  // 1461→ "第三 關鍵基礎設施的安全"
  // 1838→ "第四 誰擁有AI 誰就擁有權力"
  // 2277→ "停一秒 問你一個問題"

  const HEADER_AT = 0;
  const QUESTION_AT = 74;
  const INTRO_AT = 151;
  const REASONS_LABEL_AT = 384;
  const REASON1_AT = 429;
  const REASON2_AT = 986;

  // Phase A → B at "第三 關鍵基礎設施" local 1461
  const A_FADE_START = 1461 - 80;  // 1381
  const A_REMOVE = 1461;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = A_REMOVE;
  const REASON3_AT = 1461;
  const REASON4_AT = 1838;
  const QUESTION_PROMPT_AT = 2277;
  const showB = frame >= B_SHOW_AT;

  const headerStyle = useFadeUp(HEADER_AT);
  const questionStyle = useFadeUp(QUESTION_AT);
  const introStyle = useFadeUp(INTRO_AT);
  const reasonLabelStyle = useFadeIn(REASONS_LABEL_AT);
  const promptStyle = useFadeUp(showB ? QUESTION_PROMPT_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Section heading */}
            <div style={{ ...headerStyle, marginBottom: 14 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
                marginBottom: 12 * S,
              }}>第一段</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "900", lineHeight: 1.3,
              }}>為什麼要管制 AI？</div>
            </div>

            {/* Question + answer */}
            <div style={{ ...questionStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.5,
                }}>「AI 這麼有用，為什麼要管它？」</div>
              </div>
            </div>

            <div style={{ ...introStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.primary, fontWeight: "700", lineHeight: 1.5,
                }}>不是「阻止發展」 — 而是「處理風險」</div>
              </div>
            </div>

            <div style={{
              ...reasonLabelStyle,
              marginBottom: 10 * S,
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.muted, letterSpacing: "0.08em",
            }}>四個主要理由</div>

            {/* Reason 1 */}
            <ReasonCard
              delay={REASON1_AT}
              num="01" label="偏見與歧視"
              color={C.red} border={C.redBorder}
              body="AI 用於徵才、貸款、保釋——若資料帶偏見，模型就做出歧視性決定，披著「客觀」外衣"
            />

            {/* Reason 2 */}
            <ReasonCard
              delay={REASON2_AT}
              num="02" label="深偽與錯誤資訊"
              color={C.yellow} border={C.yellowBorder}
              body="生成式 AI 讓偽造影像、聲音的成本降為零，衝擊選舉、名譽、媒體信任"
            />
          </div>
        )}

        {/* ── Phase B ── */}
        {showB && (
          <>
            {/* Reason 3 */}
            <ReasonCard
              delay={REASON3_AT}
              num="03" label="關鍵基建安全"
              color={C.red} border={C.redBorder}
              body="AI 用於能源、醫療、金融——出錯或被惡意利用，後果不只是個人損失"
            />

            {/* Reason 4 */}
            <ReasonCard
              delay={REASON4_AT}
              num="04" label="權力集中"
              color={C.yellow} border={C.yellowBorder}
              body="大型 AI 模型集中在少數科技公司——誰擁有 AI，誰就擁有權力"
            />

            {/* Question prompt */}
            <div style={{ ...promptStyle, marginTop: 6 * S }}>
              <div style={{
                background: "rgba(255,209,102,0.08)",
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
                display: "flex", alignItems: "center", gap: 14 * S,
              }}>
                <span style={{ fontSize: 28 * S }}>💭</span>
                <div>
                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                    color: C.yellow, letterSpacing: "0.08em", marginBottom: 4 * S,
                  }}>停一秒 · 想一想</div>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                    color: C.text, lineHeight: 1.5,
                  }}>哪一個風險，你最希望政府優先處理？</div>
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <BiasScaleAnimation triggerLocalFrame={REASON1_AT} />
        <DeepfakeMaskAnimation triggerLocalFrame={REASON2_AT} />
        <CriticalInfraAnimation triggerLocalFrame={REASON3_AT} />
        <PowerCentralizationAnimation triggerLocalFrame={REASON4_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — 各國三種路線 ────────────────────────────────────────────────
function CountryCard({ delay, flag, name, principle, color, border, body }: {
  delay: number; flag: string; name: string; principle: string;
  color: string; border: string; body: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div style={{
        background: `${border}18`,
        border: `1.5px solid ${border}`,
        borderRadius: 14 * S,
        padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 8 * S,
        }}>
          <span style={{ fontSize: 28 * S }}>{flag}</span>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
            color, fontWeight: "700",
          }}>{name}</div>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.06em", marginLeft: "auto",
          }}>{principle}</div>
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.text, lineHeight: 1.65,
        }}>{body}</div>
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_29.scene2.to - SCENES_2026_04_29.scene2.from;
  // Scene 2 starts at global 3022 (100.72s)
  // VTT anchors (local = global - 3022):
  // 0    → "第二 各國怎麼管三種不同路線"
  // 94   → "我們來看三個主要路線"
  // 151  → "第一個是歐盟"
  // 199  → "歐盟的AI Act是目前全球最完整的AI法規"
  // 921  → "歐盟的邏輯是公民的基本權利優先"
  // 1178 → "第二個是美國"
  // 1629 → "第三個是中國"
  // 2256 → "三種路線"
  // 2347 → "問你一個問題"

  const HEADER_AT = 0;
  const INTRO_AT = 94;
  const EU_AT = 151;
  const EU_HIGHLIGHT_AT = 921;

  // Phase A → B at "第二個是美國" local 1178
  const A_FADE_START = 1178 - 80;  // 1098
  const A_REMOVE = 1178;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = A_REMOVE;
  const US_AT = 1178;
  const CHINA_AT = 1629;
  const COMPARE_AT = 2256;
  const showB = frame >= B_SHOW_AT;

  const headerStyle = useFadeUp(HEADER_AT);
  const introStyle = useFadeUp(INTRO_AT);
  const euHighlightStyle = useFadeUp(EU_HIGHLIGHT_AT);
  const compareStyle = useFadeUp(showB ? COMPARE_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A: 歐盟 ── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 14 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
                marginBottom: 12 * S,
              }}>第二段</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "900", lineHeight: 1.3,
              }}>各國怎麼管？三種不同路線</div>
            </div>

            <div style={{ ...introStyle, marginBottom: 14 * S }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.muted, lineHeight: 1.6,
              }}>歐盟、美國、中國 — 三種優先順序</div>
            </div>

            <CountryCard
              delay={EU_AT}
              flag="🇪🇺" name="歐盟"
              principle="保護優先"
              color={C.blue} border={C.blueBorder}
              body="《AI Act》全球最完整的 AI 法規 · 核心邏輯：「風險分級」 — 不可接受直接禁止、高風險嚴格審查、低風險自由使用"
            />

            <div style={{ ...euHighlightStyle }}>
              <div style={{
                background: C.blueLight,
                border: `1.5px solid ${C.blue}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
                boxShadow: `0 0 ${16 * S}px rgba(124,184,255,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.blue, letterSpacing: "0.08em", marginBottom: 6 * S,
                }}>EU 邏輯</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.5,
                }}>公民基本權利優先 — 即便讓創新放慢</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B: 美國 + 中國 + 比較 ── */}
        {showB && (
          <>
            <CountryCard
              delay={US_AT}
              flag="🇺🇸" name="美國"
              principle="創新優先"
              color={C.blue} border={C.blueBorder}
              body="沒有統一聯邦 AI 法案 · 透過行政命令和各州立法分散管制 · 「先發展、再修正」的實用主義路線"
            />

            <CountryCard
              delay={CHINA_AT}
              flag="🇨🇳" name="中國"
              principle="控制與發展並行"
              color={C.red} border={C.redBorder}
              body="兩個目標並行：成為全球 AI 強國 + 維持政治社會控制 · 生成式 AI 須符合社會主義核心價值觀，演算法推薦嚴格管理"
            />

            <div style={{ ...compareStyle }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>三種優先順序</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.7,
                }}>
                  <span style={{ color: C.blue, fontWeight: "700" }}>歐盟</span> 保護　·
                  <span style={{ color: C.blue, fontWeight: "700" }}> 美國</span> 創新　·
                  <span style={{ color: C.red, fontWeight: "700" }}> 中國</span> 控制 + 發展
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <EURiskTierAnimation triggerLocalFrame={EU_AT + 48} />
        <USStatePatchworkAnimation triggerLocalFrame={US_AT} />
        <ChinaDualGoalAnimation triggerLocalFrame={CHINA_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 台灣在哪裡 ────────────────────────────────────────────────────
function LawItem({ delay, label }: { delay: number; label: string }) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, display: "flex", alignItems: "flex-start", gap: 10 * S, marginBottom: 8 * S }}>
      <span style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, marginTop: 4 * S, flexShrink: 0,
      }}>›</span>
      <span style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text, lineHeight: 1.65,
      }}>{label}</span>
    </div>
  );
}

function ActionItem({ delay, icon, text }: { delay: number; icon: string; text: string }) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, display: "flex", alignItems: "flex-start", gap: 12 * S, marginBottom: 10 * S }}>
      <span style={{ fontSize: 22 * S, flexShrink: 0 }}>{icon}</span>
      <span style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text, lineHeight: 1.65,
      }}>{text}</span>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_29.scene3.to - SCENES_2026_04_29.scene3.from;
  // Scene 3 starts at global 5573 (185.76s)
  // VTT anchors (local = global - 5573):
  // 0    → "第三"
  // 17   → "台灣在哪裡你可以做什麼?"
  // 96   → "台灣目前沒有專屬的AI管制法案"
  // 257  → "現有的相關法規包含個人資料保護法"
  // 386  → "著作權法的相關討論"
  // 466  → "金融與醫療領域的AI使用指引"
  // 561  → "數位部也陸續發布AI應用的指引文件"
  // 693  → "但整體仍屬自律框架"
  // 778  → "尚未有強制性立法"
  // 847  → "台灣面對的處境有點特殊"
  // 1241 → "那你能做什麼?"
  // 1349 → "但AI素養是你可以掌握的"
  // 1759 → "這些都是公民在AI時代的基本能力"
  // 1872 → "更直接的行動是"
  // 2400 → "最後一個問題"

  const HEADER_AT = 0;
  const NO_LAW_AT = 96;
  const LAWS_LABEL_AT = 220;
  const LAW1_AT = 257;
  const LAW2_AT = 386;
  const LAW3_AT = 466;
  const LAW4_AT = 561;
  const FRAMEWORK_AT = 693;

  // Phase A → B1 at "台灣面對的處境有點特殊" local 847
  const A_FADE_START = 847 - 80;  // 767
  const A_REMOVE = 847;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B1: 處境特殊 (847 - 1241)
  const B1_SHOW_AT = A_REMOVE;
  const SPECIAL_AT = 847;
  const B1_FADE_START = 1241 - 80;  // 1161
  const B1_REMOVE = 1241;
  const showB1 = frame >= B1_SHOW_AT && frame < B1_REMOVE;
  const b1Opacity = frame > B1_FADE_START
    ? interpolate(frame, [B1_FADE_START, B1_REMOVE], [1, 0], clamp) : 1;

  // Phase B2: 你能做什麼 + 行動 (1241 onwards)
  const B2_SHOW_AT = B1_REMOVE;
  const ACTION_HEADER_AT = 1241;
  const LITERACY_AT = 1349;
  const LITERACY_FOOTER_AT = 1759;
  const DIRECT_HEADER_AT = 1872;
  const ACTION1_AT = 1939;
  const ACTION2_AT = 2052;
  const ACTION3_AT = 2199;
  const showB2 = frame >= B2_SHOW_AT;

  const headerStyle = useFadeUp(HEADER_AT);
  const noLawStyle = useFadeUp(NO_LAW_AT);
  const lawLabelStyle = useFadeIn(LAWS_LABEL_AT);
  const frameworkStyle = useFadeUp(FRAMEWORK_AT);
  const specialStyle = useFadeUp(showB1 ? SPECIAL_AT : 999999);
  const actionHeaderStyle = useFadeUp(showB2 ? ACTION_HEADER_AT : 999999);
  const literacyStyle = useFadeUp(showB2 ? LITERACY_AT : 999999);
  const literacyFooterStyle = useFadeIn(showB2 ? LITERACY_FOOTER_AT : 999999);
  const directHeaderStyle = useFadeUp(showB2 ? DIRECT_HEADER_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A: 台灣現況 ── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 14 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
                marginBottom: 12 * S,
              }}>第三段</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "900", lineHeight: 1.3,
              }}>台灣在哪裡？你可以做什麼？</div>
            </div>

            <div style={{ ...noLawStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
                display: "flex", alignItems: "center", gap: 14 * S,
              }}>
                <span style={{ fontSize: 28 * S }}>🏝</span>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.5,
                }}>沒有專屬 AI 法案 — 但也不是完全沒動作</div>
              </div>
            </div>

            <div style={{
              ...lawLabelStyle, marginBottom: 10 * S,
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.muted, letterSpacing: "0.08em",
            }}>現有相關法規</div>

            <LawItem delay={LAW1_AT} label="個人資料保護法" />
            <LawItem delay={LAW2_AT} label="著作權法的相關討論" />
            <LawItem delay={LAW3_AT} label="金融、醫療領域的 AI 使用指引" />
            <LawItem delay={LAW4_AT} label="數位部陸續發布 AI 應用指引" />

            <div style={{ ...frameworkStyle, marginTop: 14 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 6 * S,
                }}>整體框架</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.5,
                }}>仍屬自律框架 · 尚未有強制立法</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B1: 處境特殊 ── */}
        {showB1 && (
          <div style={{ opacity: b1Opacity }}>
            <div style={{ ...specialStyle }}>
              <div style={{
                background: C.surface, border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.1)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>TAIWAN · 處境特殊</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.55, marginBottom: 12 * S,
                }}>半導體 = 全球 AI 供應鏈的核心</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.65, marginBottom: 14 * S,
                }}>但在 AI 應用與治理上 — 反而是個跟隨者，而非領導者</div>

                <div style={{
                  display: "flex", gap: 12 * S, alignItems: "center", justifyContent: "center",
                  paddingTop: 8 * S, borderTop: `1px solid ${C.surfaceBorder}`,
                }}>
                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                    color: C.primary,
                    background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                    borderRadius: 6 * S, padding: `${6 * S}px ${12 * S}px`,
                  }}>💎 領導</div>
                  <span style={{ color: C.muted, fontSize: 18 * S }}>vs</span>
                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                    color: C.yellow,
                    background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                    borderRadius: 6 * S, padding: `${6 * S}px ${12 * S}px`,
                  }}>🐢 跟隨</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B2: 你能做什麼 + 行動 ── */}
        {showB2 && (
          <>
            <div style={{ ...actionHeaderStyle, marginBottom: 14 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.1em",
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
                marginBottom: 12 * S,
              }}>那你能做什麼？</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "900", lineHeight: 1.3,
              }}>AI 素養 · 你可以掌握的事</div>
            </div>

            <div style={{ ...literacyStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.7,
                }}>
                  <span style={{ color: C.primary, fontWeight: "700" }}>了解規則</span>　·
                  <span style={{ color: C.primary, fontWeight: "700" }}>知道資料去處</span>　·
                  <span style={{ color: C.primary, fontWeight: "700" }}>保持判斷力</span>
                </div>
              </div>
            </div>

            <div style={{
              ...literacyFooterStyle, marginBottom: 18 * S,
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.muted, lineHeight: 1.6, textAlign: "center" as const,
            }}>這些都是公民在 AI 時代的基本能力</div>

            <div style={{ ...directHeaderStyle, marginBottom: 12 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.08em",
              }}>更直接的行動</div>
            </div>

            <ActionItem delay={ACTION1_AT} icon="🗳" text="支持需要你意見的公共諮詢" />
            <ActionItem delay={ACTION2_AT} icon="📊" text="關注數位部與相關研究機構的報告" />
            <ActionItem delay={ACTION3_AT} icon="💼" text="在你的工作領域，推動負責任的 AI 使用規範" />
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <TaiwanLawListAnimation triggerLocalFrame={LAW1_AT} />
        <SemiconductorVsGovernanceAnimation triggerLocalFrame={SPECIAL_AT + 79} />
        <AILiteracyAnimation triggerLocalFrame={LITERACY_AT} />
        <CivicActionsAnimation triggerLocalFrame={DIRECT_HEADER_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene ────────────────────────────────────────────────────────────
function SummaryCard({ number, label, text, delay, color, border }: {
  number: string; label: string; text: string; delay: number; color: string; border: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        display: "flex", gap: 14 * S, alignItems: "flex-start",
        background: `${border}12`,
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
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color, letterSpacing: "0.08em", marginBottom: 6 * S,
          }}>{label}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.text, lineHeight: 1.65,
          }}>{text}</div>
        </div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_04_29.summary.to - SCENES_2026_04_29.summary.from;
  // Summary starts at global 8234 (274.48s)
  // VTT anchors (local = global - 8234):
  // 0    → "好 快速整理今天的三個重點"
  // 87   → "第一 為什麼要管?"
  // 471  → "第二 各國路線差異"
  // 766  → "第三 台灣現況"
  // 1023 → "這裡是每日AI知識庫"

  const BADGE_AT = 0;
  const CARD1_AT = 87;
  const CARD2_AT = 471;
  const CARD3_AT = 766;
  const OUTRO_AT = 1023;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{ ...badgeStyle, marginBottom: 18 * S, marginTop: 18 * S }}>
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
          number="01" label="為什麼要管 AI"
          delay={CARD1_AT}
          text="偏見、深偽、基礎設施安全、權力集中 — 都是政府不能不管的理由"
          color={C.red} border={C.redBorder}
        />
        <SummaryCard
          number="02" label="各國路線差異"
          delay={CARD2_AT}
          text="歐盟保護優先 · 美國創新優先 · 中國控制與發展並行"
          color={C.blue} border={C.blueBorder}
        />
        <SummaryCard
          number="03" label="台灣現況"
          delay={CARD3_AT}
          text="尚無強制立法 — AI 素養與公民參與，是你現在可以做的事"
          color={C.primary} border={C.primary}
        />

        <div style={{ ...outroStyle, marginTop: 20 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em", textAlign: "center" as const,
          }}>每日 AI 知識庫 · 我們明天見</div>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Composition ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export function VideoComposition_2026_04_29() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_04_29.scene1;
  const S2 = SCENES_2026_04_29.scene2;
  const S3 = SCENES_2026_04_29.scene3;
  const SU = SCENES_2026_04_29.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-29-processed.wav")} volume={1.0} />

      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_04_29 - 150, TOTAL_FRAMES_2026_04_29],
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
