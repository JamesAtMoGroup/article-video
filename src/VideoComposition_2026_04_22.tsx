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
const H = 720  * S;
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

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// TitleScene:   0s–20.74s     → 0–622
// Scene1:       20.74s–91.18s → 622–2735
// Scene2:       91.18s–151.16s→ 2735–4535
// Scene3:       151.16s–241.4s→ 4535–7242
// SummaryScene: 241.4s–269.4s → 7242–8082
export const SCENES_2026_04_22 = {
  title:   { from: 0,    to: 622   },
  scene1:  { from: 622,  to: 2735  },
  scene2:  { from: 2735, to: 4535  },
  scene3:  { from: 4535, to: 7242  },
  summary: { from: 7242, to: 8082  },
} as const;
export const TOTAL_FRAMES_2026_04_22 = 8082;

const CHAPTERS = [
  { label: "今日焦點",     start: 0    },
  { label: "版權主體",     start: 622  },
  { label: "訓練資料爭議", start: 2735 },
  { label: "使用時須知",   start: 4535 },
  { label: "重點整理",     start: 7242 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 2413, to: 2735, sender: "想一想", text: "如果你花了三小時設計 Prompt、調整輸出，最後得到一幅作品——你覺得這算不算你的創作？" },
  { from: 4310, to: 4535, sender: "想一想", text: "如果你是一個插畫師，發現 AI 在學你的風格生成圖片，你會怎麼看這件事？" },
  { from: 6822, to: 7242, sender: "想一想", text: "如果未來法律規定 AI 生成的版權歸訓練資料的原始創作者，這對大量使用 AI 創作的人會有什麼影響？" },
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
function WordReveal({ text, startFrame, staggerPerWord = 4, fontSize, color, fontFamily, fontWeight, letterSpacing }: {
  text: string; startFrame: number; staggerPerWord?: number;
  fontSize?: number; color?: string; fontFamily?: string;
  fontWeight?: number | string; letterSpacing?: string;
}) {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline", lineHeight: 1.3 }}>
      {text.split(" ").map((word, i) => {
        const f  = Math.max(0, frame - (startFrame + i * staggerPerWord));
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
  return (
    <div style={{
      position: "absolute", top: NOTIF_TOP + slotIndex * NOTIF_SLOT, right: NOTIF_RIGHT,
      width: NOTIF_W, opacity: fadeOut,
      transform: `translateY(${translateY}px)`,
      zIndex: 100,
      background: "rgba(18,18,18,0.95)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderRadius: 16 * S, border: `1px solid rgba(124,255,178,0.2)`,
      padding: `${12 * S}px ${14 * S}px`,
      boxShadow: `0 ${8 * S}px ${24 * S}px rgba(0,0,0,0.6)`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 6 * S }}>
        <div style={{
          width: 10 * S, height: 10 * S, borderRadius: "50%", background: C.primary,
          boxShadow: `0 0 ${6 * S}px ${C.primary}`,
        }} />
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary, letterSpacing: "0.05em",
        }}>{callout.sender}</span>
      </div>
      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text, lineHeight: 1.55,
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

// 1. CopyrightQuestionAnimation — TitleScene, global trigger 286
// triggerFrame=Math.round(9.54*30)=286; DURATION covers to ~20.74s=622; DURATION=622-286=336→340
function CopyrightQuestionAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 340;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const brainScale = easeOutBack(prog(f, 22));
  const lineW = interpolate(Math.max(0, f - 15), [0, 25], [0, 44 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const qScale = easeOutBack(Math.min(Math.max(0, f - 50) / 22, 1));
  const pulse = 1 + Math.sin(f * 0.08) * 0.05;
  const labelOp = interpolate(Math.max(0, f - 80), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 80 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
        {/* AI Brain */}
        <div style={{
          width: 80 * S, height: 80 * S, borderRadius: "50%",
          background: "rgba(124,255,178,0.12)",
          border: `${2 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30 * S,
          transform: `scale(${brainScale * pulse})`,
          boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.35)`,
        }}>🧠</div>

        {/* Dashed connector */}
        <div style={{
          width: lineW, height: 3 * S,
          background: `repeating-linear-gradient(90deg, ${C.muted} 0, ${C.muted} 6px, transparent 6px, transparent 12px)`,
          borderRadius: 2 * S,
        }} />

        {/* © with question */}
        <div style={{
          width: 80 * S, height: 80 * S, borderRadius: "50%",
          background: "rgba(255,107,107,0.1)",
          border: `${2 * S}px solid ${C.red}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${qScale})`,
          boxShadow: `0 0 ${16 * S}px rgba(255,107,107,0.3)`,
        }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 24 * S,
            color: C.red, fontWeight: "700",
          }}>©?</span>
        </div>
      </div>

      <div style={{
        opacity: labelOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.muted, textAlign: "center" as const,
        background: "rgba(0,0,0,0.75)",
        border: `1px solid rgba(255,255,255,0.1)`,
        borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
      }}>AI 創作 = 誰的版權？</div>
    </div>
  );
}

// 2. AINoRightsAnimation — Scene1 local trigger 195
// trigger=Math.round(27.24*30)-622=817-622=195
// DURATION=(600-195)+90=495  last_vtt=40.74s→local600
function AINoRightsAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 495;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const scaleIn = easeOutBack(prog(f, 22));
  const xOp = interpolate(Math.max(0, f - 30), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const labelOp = interpolate(Math.max(0, f - 60), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      width: 220 * S,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
        {/* Robot */}
        <div style={{
          width: 68 * S, height: 68 * S, borderRadius: 12 * S,
          background: "rgba(136,136,136,0.12)",
          border: `${2 * S}px solid ${C.muted}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26 * S, transform: `scale(${scaleIn})`,
        }}>🤖</div>

        <div style={{ opacity: xOp, fontSize: 22 * S, color: C.red, fontWeight: "700",
          textShadow: `0 0 ${12 * S}px rgba(255,107,107,0.7)` }}>✕</div>

        {/* © circle */}
        <div style={{
          width: 68 * S, height: 68 * S, borderRadius: "50%",
          background: "rgba(255,209,102,0.1)",
          border: `${2 * S}px solid ${C.yellow}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transform: `scale(${scaleIn})`,
          boxShadow: `0 0 ${14 * S}px rgba(255,209,102,0.25)`,
        }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.yellow, fontWeight: "700" }}>©</span>
        </div>
      </div>

      <div style={{
        opacity: labelOp,
        background: C.redLight, border: `1px solid ${C.redBorder}`,
        borderRadius: 8 * S, padding: `${8 * S}px ${14 * S}px`,
        textAlign: "center" as const,
      }}>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.red, lineHeight: 1.5, fontWeight: "700",
        }}>法律不承認 AI 是版權主體</div>
      </div>
    </div>
  );
}

// 3. HumanCreativityScaleAnimation — Scene1 local trigger 1072
// trigger=Math.round(56.48*30)-622=1694-622=1072
// DURATION=(1453-1072)+90=471  last_vtt=1:09.180→local1453
function HumanCreativityScaleAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 471;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const baseScale = easeOutBack(prog(f, 20));
  const tiltAngle = interpolate(Math.max(0, f - 60), [0, 120], [0, 16], { easing: E.outCubic, extrapolateRight: "clamp" });
  const item1Op = interpolate(Math.max(0, f - 30), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const item2Op = interpolate(Math.max(0, f - 80), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const item3Op = interpolate(Math.max(0, f - 130), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const protectOp = interpolate(Math.max(0, f - 210), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 190 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      width: 210 * S,
    }}>
      {/* Scale */}
      <div style={{ transform: `scale(${baseScale}) rotate(${tiltAngle}deg)`, transformOrigin: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{
            width: 140 * S, height: 4 * S,
            background: `linear-gradient(90deg, ${C.red}88, ${C.muted}, ${C.primary}88)`,
            borderRadius: 2 * S, position: "relative",
          }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              width: 10 * S, height: 10 * S, borderRadius: "50%", background: C.muted,
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", width: 140 * S }}>
            {/* Left pan: AI */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S }}>
              <div style={{ width: 2 * S, height: 20 * S, background: C.muted }} />
              <div style={{
                width: 52 * S, height: 28 * S,
                background: "rgba(136,136,136,0.12)",
                border: `1px solid rgba(136,136,136,0.35)`,
                borderRadius: `0 0 ${6 * S}px ${6 * S}px`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18 * S,
              }}>🤖</div>
            </div>
            {/* Right pan: Human creativity */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S }}>
              <div style={{ width: 2 * S, height: 20 * S, background: C.muted }} />
              <div style={{
                width: 52 * S, height: 28 * S,
                background: "rgba(124,255,178,0.12)",
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: `0 0 ${6 * S}px ${6 * S}px`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 2 * S,
                fontSize: 18 * S,
              }}>
                <span style={{ opacity: item1Op }}>✍️</span>
                <span style={{ opacity: item2Op }}>🎨</span>
                <span style={{ opacity: item3Op }}>⚡</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        opacity: protectOp,
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S, padding: `${7 * S}px ${14 * S}px`,
        textAlign: "center" as const,
      }}>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.primary, fontWeight: "700",
        }}>足夠創意 → 版權保護你</div>
      </div>
    </div>
  );
}

// 4. TrainingDataAnimation — Scene2 local trigger 165
// trigger=Math.round(96.68*30)-2735=2900-2735=165
// DURATION=(540-165)+90=465  last_vtt=1:49.180→local540
function TrainingDataAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 465;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const brainScale = easeOutBack(prog(f, 20));
  const pulse = 1 + Math.sin(f * 0.07) * 0.04;

  const dataItems = [
    { icon: "📄", angle: -120, delay: 20, warn: false },
    { icon: "🖼️", angle: -50,  delay: 40, warn: false },
    { icon: "💻", angle:  50,  delay: 60, warn: false },
    { icon: "📄", angle:  120, delay: 80, warn: true  },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 190 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
    }}>
      <div style={{ position: "relative", width: 200 * S, height: 200 * S }}>
        {/* Brain */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%,-50%) scale(${brainScale * pulse})`,
          width: 72 * S, height: 72 * S, borderRadius: "50%",
          background: "rgba(124,255,178,0.12)",
          border: `${2 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26 * S,
          boxShadow: `0 0 ${18 * S}px rgba(124,255,178,0.4)`,
        }}>🧠</div>

        {/* Incoming data */}
        {dataItems.map((item, i) => {
          const itemF = Math.max(0, f - item.delay);
          const dist = interpolate(itemF, [0, 30], [80 * S, 40 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
          const itemOp = interpolate(itemF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const rad = (item.angle * Math.PI) / 180;
          const cx = 100 * S + Math.cos(rad) * dist - 14 * S;
          const cy = 100 * S + Math.sin(rad) * dist - 14 * S;
          return (
            <div key={i} style={{
              position: "absolute", left: cx, top: cy,
              opacity: itemOp,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * S,
              background: item.warn ? "rgba(255,107,107,0.15)" : "rgba(255,255,255,0.07)",
              border: `1px solid ${item.warn ? C.redBorder : "rgba(255,255,255,0.12)"}`,
              borderRadius: 6 * S, padding: `${4 * S}px ${6 * S}px`,
            }}>
              <span style={{ fontSize: 18 * S }}>{item.icon}</span>
              {item.warn && (
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.red }}>©</span>
              )}
            </div>
          );
        })}

        {/* Warning label */}
        <div style={{
          position: "absolute", bottom: -10 * S, left: "50%",
          transform: "translateX(-50%)",
          opacity: interpolate(Math.max(0, f - 120), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
          background: C.redLight, border: `1px solid ${C.redBorder}`,
          borderRadius: 6 * S, padding: `${5 * S}px ${10 * S}px`,
          whiteSpace: "nowrap" as const,
        }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.red }}>含有版權原創作品 ⚠</span>
        </div>
      </div>
    </div>
  );
}

// 5. ThreeRulesAnimation — Scene3 local trigger 105
// trigger=Math.round(154.66*30)-4535=4640-4535=105
// step delays: Rule1=0, Rule2=682(177.4s→787-105), Rule3=1312(198.4s→1417-105)
// DURATION=(1837-105)+90=1822  last_vtt=3:34.400→local1837
function ThreeRulesAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1822;
  const envelope = interpolate(f, [0, 10, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const rules = [
    { label: "規則一", text: "看清楚使用條款", color: C.primary, border: C.primaryBorder, appearsAt:    0 },
    { label: "規則二", text: "商業用途特別謹慎", color: C.yellow, border: C.yellowBorder, appearsAt:  682 },
    { label: "規則三", text: "相似作品仍有風險", color: C.red,    border: C.redBorder,    appearsAt: 1312 },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 190 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 12 * S,
      width: 210 * S,
    }}>
      {rules.map((r, i) => {
        const itemF = Math.max(0, f - r.appearsAt);
        const itemOp = interpolate(itemF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 20], [28 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const dotScale = easeOutBack(Math.min(itemF / 20, 1));
        return (
          <div key={i} style={{
            opacity: itemOp, transform: `translateX(${itemTx}px)`,
            background: "rgba(0,0,0,0.85)",
            border: `1px solid ${r.border}`,
            borderLeft: `3px solid ${r.color}`,
            borderRadius: 10 * S,
            padding: `${10 * S}px ${14 * S}px`,
            display: "flex", alignItems: "center", gap: 12 * S,
          }}>
            <div style={{
              width: 14 * S, height: 14 * S, borderRadius: "50%",
              background: r.color, flexShrink: 0,
              transform: `scale(${dotScale})`,
              boxShadow: `0 0 ${8 * S}px ${r.color}88`,
            }} />
            <div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: r.color, letterSpacing: "0.04em", marginBottom: 3 * S,
              }}>{r.label}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.text, lineHeight: 1.4,
              }}>{r.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_22.title.to - SCENES_2026_04_22.title.from;
  const badgeOp      = useFadeIn(5);
  const subtitleStyle = useFadeUp(30);
  const tagStyle      = useFadeUp(46);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        paddingBottom: SUBTITLE_SAFE,
        paddingLeft: 80 * S, paddingRight: 80 * S,
        textAlign: "center",
      }}>
        <div style={{ ...badgeOp, marginBottom: 14 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
          }}>每日 AI 知識庫</span>
        </div>

        <h1 style={{ margin: 0, lineHeight: 1.15, fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900, fontSize: 40 * S, color: C.text }}>
          <WordReveal text="用 AI 寫的東西" startFrame={10} staggerPerWord={6}
            fontSize={40 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        <h1 style={{ margin: 0, lineHeight: 1.2, marginTop: 4 * S, fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900, fontSize: 32 * S, color: C.primary }}>
          <WordReveal text="版權是誰的？" startFrame={28} staggerPerWord={6}
            fontSize={32 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        <p style={{
          ...subtitleStyle,
          marginTop: 20 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
        }}>一個讓很多人出乎意料的法律現實</p>

        <div style={{ ...tagStyle, marginTop: 16 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>版權法 · 灰色地帶 · AI 創作 · 商業風險</span>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <CopyrightQuestionAnimation triggerFrame={286} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — 版權主體 ──────────────────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_22.scene1.to - SCENES_2026_04_22.scene1.from;

  // VTT local anchors (global - 622):
  // 24.0s→local98 / 27.24s→195 / 40.74s→600 / 44.24s→705 / 54.04s→999
  const HEADER_AT  = 0;
  const LAW_AT     = 98;
  const PUBLIC_AT  = 600;
  const NOEASY_AT  = 705;
  const GREY_AT    = 999;

  // Phase A→B: "如果你花了大量心力設計Prompt" at 56.48s → local 1072
  const A_FADE_START = 1072;
  const A_REMOVE     = A_FADE_START + 80;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = A_REMOVE + 20;  // 1172
  const showB     = frame >= B_SHOW_AT;

  // Phase B VTT local: 1:09.180→1453 / 1:13.180→1573
  const PROMPT_AT  = B_SHOW_AT;
  const PROTECT_AT = 1453;
  const GZ_AT      = 1573;

  const headerStyle  = useFadeUp(HEADER_AT);
  const lawStyle     = useFadeUp(LAW_AT);
  const publicStyle  = useFadeUp(PUBLIC_AT);
  const noEasyStyle  = useFadeUp(NOEASY_AT);
  const greyStyle    = useFadeUp(GREY_AT);
  const promptStyle  = useFadeUp(showB ? PROMPT_AT  : 999999);
  const protectStyle = useFadeUp(showB ? PROTECT_AT : 999999);
  const gzStyle      = useFadeIn(showB ? GZ_AT      : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Phase A */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 16 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                marginBottom: 10 * S,
              }}>版權現況</div>
            </div>

            {/* AI is not a copyright subject */}
            <div style={{ ...lawStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.redLight, border: `1px solid ${C.redBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.red, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>⚠ AI 不是版權主體</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.45,
                }}>全球大多數國家的版權法<br />都不承認 AI 是版權的主體</div>
              </div>
            </div>

            {/* Public domain */}
            <div style={{ ...publicStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.6 }}>
                  版權保護的前提是「人類作者」——沒有意識的程式生成的東西，法律上多半視為
                  <span style={{ color: C.yellow, fontWeight: "700" }}>公共財</span>
                </div>
              </div>
            </div>

            {/* US ruling */}
            <div style={{ ...noEasyStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
                display: "flex", alignItems: "center", gap: 12 * S,
              }}>
                <span style={{ fontSize: 22 * S, flexShrink: 0 }}>🇺🇸</span>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.muted, lineHeight: 1.55 }}>
                  美國版權局：純 AI 生成的作品<span style={{ color: C.text, fontWeight: "700" }}>不受版權保護</span>
                </div>
              </div>
            </div>

            {/* Grey zone intro */}
            <div style={{ ...greyStyle }}>
              <div style={{
                background: C.yellowLight, border: `1.5px solid ${C.yellow}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.yellow, fontWeight: "700", lineHeight: 1.5 }}>
                  但這裡有一個重要的灰色地帶…
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase B */}
        {showB && (
          <>
            <div style={{ ...promptStyle, marginBottom: 18 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
              }}>灰色地帶</div>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.65 }}>
                  如果你花了大量心力設計 Prompt、<br />選擇方向、後期修改——<br />
                  加入了足夠的「<span style={{ color: C.primary, fontWeight: "700" }}>人類創意</span>」
                </div>
              </div>
            </div>

            <div style={{ ...protectStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.primaryLight, border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.15)`,
              }}>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S, color: C.primary, fontWeight: "700", lineHeight: 1.4 }}>
                  版權保護的是你這個人，不是 AI
                </div>
              </div>
            </div>

            <div style={{ ...gzStyle }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                color: C.muted, lineHeight: 1.6,
                borderLeft: `3px solid ${C.primaryBorder}`, paddingLeft: 14 * S,
              }}>「足夠的人類創意」沒有精確標準——目前靠個案判定</div>
            </div>
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <AINoRightsAnimation triggerLocalFrame={195} />
        <HumanCreativityScaleAnimation triggerLocalFrame={1072} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — 訓練資料版權爭議 ─────────────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_22.scene2.to - SCENES_2026_04_22.scene2.from;

  // VTT local (sceneStart=2735): 96.68s→165 / 100.18s→270 / 105.68s→435
  // 109.18s→540 / 115.18s→720 / 119.42s→848 / 121.92s→923 / 127.92s→1103
  const HEADER_AT    = 0;
  const DATA_AT      = 270;
  const COPYRIGHT_AT = 435;
  const LAWSUIT_AT   = 540;
  const COMPANIES_AT = 720;
  const ONGOING_AT   = 848;

  // Phase A→B: 127.92s → local 1103
  const A_FADE_START = 1103;
  const A_REMOVE     = A_FADE_START + 80;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = A_REMOVE + 20;  // 1203
  const showB     = frame >= B_SHOW_AT;

  // Phase B: 136.92s→local1373
  const WARN_AT  = B_SHOW_AT;
  const COMM_AT  = 1373;

  const headerStyle    = useFadeUp(HEADER_AT);
  const dataStyle      = useFadeUp(DATA_AT);
  const copyrightStyle = useFadeUp(COPYRIGHT_AT);
  const lawsuitStyle   = useFadeUp(LAWSUIT_AT);
  const companiesStyle = useFadeUp(COMPANIES_AT);
  const ongoingStyle   = useFadeIn(ONGOING_AT);
  const warnStyle      = useFadeUp(showB ? WARN_AT : 999999);
  const commStyle      = useFadeUp(showB ? COMM_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Phase A */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 16 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.1em",
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                marginBottom: 10 * S,
              }}>訓練資料版權爭議</div>
              <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S, color: C.text, fontWeight: "700", lineHeight: 1.35 }}>
                AI 模型靠大量資料訓練
              </div>
            </div>

            <div style={{ ...dataStyle, marginBottom: 16 * S }}>
              <div style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px` }}>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.65 }}>
                  這些資料很多是從網路上抓取的<br />
                  <span style={{ color: C.muted }}>文章、圖片、程式碼</span>
                </div>
              </div>
            </div>

            <div style={{ ...copyrightStyle, marginBottom: 16 * S }}>
              <div style={{ background: C.yellowLight, border: `1px solid ${C.yellowBorder}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px` }}>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.yellow, fontWeight: "700", lineHeight: 1.55 }}>
                  其中有大量是<span style={{ color: C.text }}>有版權的原創作品</span>
                </div>
              </div>
            </div>

            <div style={{ ...lawsuitStyle, marginBottom: 12 * S }}>
              <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px` }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.red, letterSpacing: "0.06em", marginBottom: 8 * S }}>⚖ 法律行動</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.6 }}>
                  不少創作者和媒體公司對 AI 公司提告<br />主張版權被侵害
                </div>
              </div>
            </div>

            <div style={{ ...companiesStyle, marginBottom: 10 * S }}>
              <div style={{ display: "flex", gap: 8 * S, flexWrap: "wrap" as const }}>
                {["Google", "OpenAI", "Anthropic"].map((co, i) => (
                  <span key={i} style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                    color: C.muted, background: "rgba(255,255,255,0.05)",
                    border: `1px solid rgba(255,255,255,0.1)`,
                    borderRadius: 6 * S, padding: `${4 * S}px ${10 * S}px`,
                  }}>{co}</span>
                ))}
              </div>
            </div>

            <div style={{ ...ongoingStyle }}>
              <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.muted, lineHeight: 1.6 }}>
                有些和解了，有些還在打——這個問題<span style={{ color: C.yellow }}>還沒有定論</span>
              </div>
            </div>
          </div>
        )}

        {/* Phase B */}
        {showB && (
          <>
            <div style={{ ...warnStyle, marginBottom: 18 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
              }}>你需要留意的風險</div>
              <div style={{ background: C.yellowLight, border: `1.5px solid ${C.yellow}`, borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`, boxShadow: `0 0 ${24 * S}px rgba(255,209,102,0.12)` }}>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.65, fontWeight: "700" }}>
                  你用 AI 生成的作品，有沒有可能「包含了」某個原創作者的風格或內容，而你自己根本不知道？
                </div>
              </div>
            </div>

            <div style={{ ...commStyle }}>
              <div style={{ background: C.surface, border: `1px solid ${C.redBorder}`, borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px` }}>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.6 }}>
                  在<span style={{ color: C.yellow, fontWeight: "700" }}>商業用途</span>上，這個法律風險目前不明確——但謹慎是必要的
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <TrainingDataAnimation triggerLocalFrame={165} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 使用時須知 ───────────────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_22.scene3.to - SCENES_2026_04_22.scene3.from;

  // VTT local (sceneStart=4535):
  // 154.66s→105 / 157.16s→180 / 161.16s→300 / 165.66s→435 / 173.4s→667
  // 177.4s→787 / 180.9s→892 / 192.4s→1237 / 198.4s→1417 / 204.4s→1597
  // 212.4s→1837 / 214.4s→1897 / 220.4s→2077 / 224.4s→2197
  const HEADER_AT = 0;
  const RULE1_AT  = 105;
  const RULE1D_AT = 180;
  const RULE1E_AT = 300;
  const RULE2_AT  = 787;
  const RULE2D_AT = 892;
  const RULE2E_AT = 1237;
  const RULE3_AT  = 1417;
  const RULE3D_AT = 1597;

  // Phase A→B: "AI讓創作的速度..." at 214.4s → local 1897
  const A_FADE_START = 1897;
  const A_REMOVE     = A_FADE_START + 80;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = A_REMOVE + 20;  // 1997
  const showB     = frame >= B_SHOW_AT;

  const FUTURE_AT = 2077;
  const OUTRO_AT  = 2197;

  const headerStyle  = useFadeUp(HEADER_AT);
  const r1Style      = useFadeUp(RULE1_AT);
  const r1dStyle     = useFadeIn(RULE1D_AT);
  const r1eStyle     = useFadeIn(RULE1E_AT);
  const r2Style      = useFadeUp(RULE2_AT);
  const r2dStyle     = useFadeIn(RULE2D_AT);
  const r2eStyle     = useFadeIn(RULE2E_AT);
  const r3Style      = useFadeUp(RULE3_AT);
  const r3dStyle     = useFadeIn(RULE3D_AT);
  const futureStyle  = useFadeUp(showB ? FUTURE_AT : 999999);
  const outroStyle   = useFadeIn(showB ? OUTRO_AT  : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Phase A */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 18 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`, marginBottom: 10 * S,
              }}>使用時注意事項</div>
              <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S, color: C.text, fontWeight: "700", lineHeight: 1.35 }}>
                那實際使用時，你應該注意什麼？
              </div>
            </div>

            {/* Rule 1 */}
            <div style={{ ...r1Style, marginBottom: 14 * S }}>
              <div style={{ background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px` }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S }}>01 · 看清楚使用條款 🔍</div>
                <div style={{ ...r1dStyle }}>
                  <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.muted, lineHeight: 1.6 }}>不同 AI 服務對輸出物版權規定不一樣</div>
                </div>
                <div style={{ ...r1eStyle }}>
                  <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.6, marginTop: 6 * S }}>
                    OpenAI 允許商業用途，但仍有條款限制——<span style={{ color: C.primary }}>不要假設都一樣</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rule 2 */}
            <div style={{ ...r2Style, marginBottom: 14 * S }}>
              <div style={{ background: C.yellowLight, border: `1px solid ${C.yellowBorder}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px` }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S }}>02 · 商業用途要特別謹慎 ⚠️</div>
                <div style={{ ...r2dStyle }}>
                  <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.muted, lineHeight: 1.6 }}>廣告、出版品、商品——仍有法律模糊地帶</div>
                </div>
                <div style={{ ...r2eStyle }}>
                  <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.6, marginTop: 6 * S }}>
                    建議加入足夠人工創意，確保<span style={{ color: C.yellow }}>人的貢獻看得見</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rule 3 */}
            <div style={{ ...r3Style }}>
              <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px` }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.red, letterSpacing: "0.08em", marginBottom: 8 * S }}>03 · 高度相似仍有風險 🪤</div>
                <div style={{ ...r3dStyle }}>
                  <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.6 }}>
                    若 AI 輸出<span style={{ color: C.red }}>高度相似</span>於某原創作品，你還是可能踩到雷
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase B */}
        {showB && (
          <>
            <div style={{ ...futureStyle, marginBottom: 18 * S }}>
              <div style={{ background: C.surface, border: `1px solid ${C.primaryBorder}`, borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`, boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.08)` }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em", marginBottom: 10 * S }}>版權法還在追趕</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.65 }}>
                  AI 讓創作速度和門檻大幅改變，<br />
                  但<span style={{ color: C.primary, fontWeight: "700" }}>這個領域的法規在未來幾年會持續演變</span><br />
                  保持關注是很值得做的事
                </div>
              </div>
            </div>

            <div style={{ ...outroStyle }}>
              <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.muted, lineHeight: 1.6, borderLeft: `3px solid ${C.primaryBorder}`, paddingLeft: 14 * S }}>
                法規方向在未來幾年仍不確定——但謹慎使用、了解規則，是你現在就能做的事
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ThreeRulesAnimation triggerLocalFrame={RULE1_AT} />
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
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div style={{
        display: "flex", gap: 14 * S, alignItems: "flex-start",
        background: `${border}12`, border: `1px solid ${border}`,
        borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
          color, fontWeight: "700", flexShrink: 0, marginTop: 2 * S,
          textShadow: `0 0 ${10 * S}px ${color}88`,
        }}>{number}</div>
        <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.65 }}>{text}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_22.summary.to - SCENES_2026_04_22.summary.from;

  // VTT local (sceneStart=7242): 245.4s→120 / 251.4s→300 / 255.4s→420
  const BADGE_AT = 0;
  const CARD1_AT = 120;
  const CARD2_AT = 300;
  const CARD3_AT = 420;
  const OUTRO_AT = 660;

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
          number="01" delay={CARD1_AT}
          text="大多數國家不承認 AI 是版權主體——純 AI 輸出多半被視為公共財，不受版權保護"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="02" delay={CARD2_AT}
          text="加入足夠的人類創意，版權保護的是你這個人——但「足夠」沒有精確標準，靠個案判定"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="03" delay={CARD3_AT}
          text="商業用途要謹慎：看清楚服務條款、加入人工創意、避免高度相似於受保護原創作品"
          color={C.yellow} border={C.yellow}
        />

        <div style={{ ...outroStyle, marginTop: 10 * S }}>
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
export function VideoComposition_2026_04_22() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_04_22.scene1;
  const S2 = SCENES_2026_04_22.scene2;
  const S3 = SCENES_2026_04_22.scene3;
  const SU = SCENES_2026_04_22.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-22-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_04_22 - 150, TOTAL_FRAMES_2026_04_22], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
