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
  blue:         "#7cb8ff",
  blueLight:    "rgba(124,184,255,0.08)",
  blueBorder:   "rgba(124,184,255,0.22)",
} as const;

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W       = 320 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLOT    = 200 * S;
const NOTIF_SLIDE_H = 130 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// VTT: TitleScene 0–31.98s, Scene1 31.98–104.46s, Scene2 104.46–164.94s,
//      Scene3 164.94–231.18s, Summary 231.18–264s
export const SCENES_2026_05_06 = {
  title:   { from: 0,    to: 959  },
  scene1:  { from: 959,  to: 3134 },
  scene2:  { from: 3134, to: 4948 },
  scene3:  { from: 4948, to: 6935 },
  summary: { from: 6935, to: 7920 },
} as const;
export const TOTAL_FRAMES_2026_05_06 = 7920;

const CHAPTERS = [
  { label: "今日焦點",           start: 0    },
  { label: "System Prompt 是什麼", start: 959  },
  { label: "為什麼這重要",        start: 3134 },
  { label: "自己動手寫",          start: 4948 },
  { label: "重點整理",           start: 6935 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 2729, to: 3134, sender: "想一想", text: "你有沒有用過某個 AI 工具，感覺它「只會說某些話」、或拒絕你某些問題？很可能就是 System Prompt 在限制它" },
  { from: 4708, to: 4948, sender: "好奇心", text: "如果你能看到你常用的 AI 產品的完整 System Prompt，你最想知道裡面寫了什麼？" },
  { from: 6755, to: 6935, sender: "親身設計", text: "如果你能給你常用的 AI 工具一份 System Prompt，你最想在裡面寫什麼？" },
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
        background: "radial-gradient(circle, rgba(124,184,255,0.06) 0%, transparent 70%)",
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

// ── iMessage Callout ───────────────────────────────────────────────────────
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

// 1. HiddenPromptAnimation — TitleScene global frame 388, DURATION 560
//    Visual: A locked SYSTEM card that floats in front of an AI chat bubble,
//    showing the "invisible layer" between user and model.
function HiddenPromptAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 560;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const chatScale  = easeOutBack(prog(f, 22));
  const sysOp      = interpolate(Math.max(0, f - 30), [0, 24], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const sysTy      = interpolate(Math.max(0, f - 30), [0, 24], [-20 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const sysPulse   = Math.sin(f * 0.06) * 0.05 + 1;
  const lockOp     = interpolate(Math.max(0, f - 90), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const labelOp    = interpolate(Math.max(0, f - 130), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 80 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      {/* Hidden SYSTEM card — front */}
      <div style={{
        opacity: sysOp,
        transform: `translateY(${sysTy}px) scale(${sysPulse})`,
        background: "rgba(124,255,178,0.06)",
        border: `${2 * S}px dashed ${C.primary}`,
        borderRadius: 14 * S,
        padding: `${14 * S}px ${18 * S}px`,
        width: "100%",
        boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.18)`,
        position: "relative",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 6 * S,
        }}>
          <span style={{ opacity: lockOp, fontSize: 22 * S }}>🔒</span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.1em", fontWeight: 700,
          }}>SYSTEM</span>
        </div>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.muted, letterSpacing: "0.04em",
          opacity: 0.6,
        }}>{"// hidden prompt //"}</div>
      </div>

      {/* Down arrow */}
      <div style={{
        opacity: lockOp,
        fontSize: 22 * S, color: C.primary,
        textShadow: `0 0 ${10 * S}px ${C.primary}`,
      }}>↓</div>

      {/* AI chat bubble */}
      <div style={{
        transform: `scale(${chatScale})`,
        background: C.surface,
        border: `${2 * S}px solid ${C.primaryBorder}`,
        borderRadius: 14 * S,
        padding: `${14 * S}px ${18 * S}px`,
        width: "100%",
        textAlign: "center" as const,
      }}>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.text, lineHeight: 1.55,
        }}>AI 對話介面</div>
      </div>

      {/* Bottom label */}
      <div style={{
        opacity: labelOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.muted, textAlign: "center" as const, lineHeight: 1.55,
      }}>你看不到這層，但它一直在運作</div>
    </div>
  );
}

// 2. InvisibleInstructionAnimation — Scene1 local 256, DURATION 750
//    Visual: A vertical conversation timeline showing SYSTEM (hidden, dim)
//    arrives BEFORE the user's first message, with AI responding under that lens.
function InvisibleInstructionAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 750;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Three messages appear in order: SYSTEM → USER → AI
  // delays correspond to "其實你不是第一個跟AI說話的人" (256, base) →
  //                     "在你之前產品開發者已先送一份指令" (405, +149) →
  //                     "影響著 AI 對你每一個問題的回應" (946, +690)
  const sysDelay  = 0;
  const userDelay = 149;
  const aiDelay   = 380;

  const items = [
    { delay: sysDelay,  label: "[hidden] SYSTEM", color: C.primary, bg: "rgba(124,255,178,0.06)", border: C.primary, dashed: true,  text: "你是誰、能說什麼、不能說什麼" },
    { delay: userDelay, label: "USER",            color: C.text,    bg: "rgba(255,255,255,0.05)", border: C.surfaceBorder, dashed: false, text: "（你的第一則訊息）" },
    { delay: aiDelay,   label: "AI",              color: C.blue,    bg: C.blueLight,              border: C.blueBorder, dashed: false, text: "受 SYSTEM 影響的回應" },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 170 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 280 * S,
      display: "flex", flexDirection: "column", gap: 14 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em", marginBottom: 4 * S,
      }}>對話順序</div>

      {items.map((item, i) => {
        const itemF = Math.max(0, f - item.delay);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [30 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const dimMult = item.delay === sysDelay
          ? interpolate(itemF, [0, 22], [0.55, 0.85], { extrapolateRight: "clamp" })
          : 1;
        return (
          <div key={i} style={{
            position: "relative",
            opacity: itemOp * dimMult,
            transform: `translateX(${itemTx}px)`,
            background: item.bg,
            border: item.dashed ? `${2 * S}px dashed ${item.border}` : `1px solid ${item.border}`,
            borderRadius: 10 * S,
            padding: `${10 * S}px ${14 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: item.color, letterSpacing: "0.06em", marginBottom: 4 * S,
              fontWeight: 700,
            }}>{item.label}</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.muted, lineHeight: 1.5,
            }}>{item.text}</div>
            {/* Down arrow between items */}
            {i < items.length - 1 && (
              <div style={{
                position: "absolute",
                left: "50%",
                bottom: -14 * S,
                transform: "translateX(-50%)",
                fontSize: 18 * S,
                color: C.muted,
                opacity: itemOp,
              }}>↓</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 3. TwoFacedClaudeAnimation — Scene1 local 1058, DURATION 700
//    Visual: One Claude logo at top, splits to two products with different styles.
function TwoFacedClaudeAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 700;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Claude appears, then split lines, then two product cards.
  // Aligned to VTT (local-1058 base):
  //   "舉個例子,同樣是 Claude" → 0
  //   "客服機器人" → 1133-1058 = 75
  //   "創意寫作工具" → 1358-1058 = 300
  const claudeScale = easeOutBack(prog(f, 22));
  const lineH = interpolate(Math.max(0, f - 30), [0, 25], [0, 28 * S], { easing: E.outExpo, extrapolateRight: "clamp" });

  const products = [
    { delay: 60,  label: "客服機器人",   tone: "嚴謹守規",     color: C.yellow, border: C.yellowBorder, bg: C.yellowLight, icon: "🛟" },
    { delay: 285, label: "創意寫作工具", tone: "活潑天馬行空", color: C.primary, border: C.primaryBorder, bg: C.primaryLight, icon: "✨" },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 160 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 320 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
    }}>
      {/* Claude box */}
      <div style={{
        transform: `scale(${claudeScale})`,
        fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
        color: C.primary, fontWeight: 700, letterSpacing: "0.05em",
        background: C.primaryLight, border: `${2 * S}px solid ${C.primary}`,
        borderRadius: 10 * S, padding: `${10 * S}px ${20 * S}px`,
        boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.35)`,
        textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.7)`,
      }}>Claude</div>

      {/* Split lines */}
      <div style={{
        height: lineH, width: 80 * S, position: "relative", marginTop: 4 * S,
      }}>
        <div style={{
          position: "absolute", left: "50%", top: 0,
          width: 2 * S, height: "40%",
          background: C.muted, transform: "translateX(-50%)",
        }} />
        <div style={{
          position: "absolute", left: 0, top: "40%",
          width: "100%", height: 2 * S, background: C.muted,
        }} />
        <div style={{
          position: "absolute", left: 0, top: "40%",
          width: 2 * S, height: "60%", background: C.muted,
        }} />
        <div style={{
          position: "absolute", right: 0, top: "40%",
          width: 2 * S, height: "60%", background: C.muted,
        }} />
      </div>

      {/* Two product cards */}
      <div style={{
        display: "flex", gap: 16 * S, marginTop: 8 * S, width: "100%",
        justifyContent: "center",
      }}>
        {products.map((p, i) => {
          const pF = Math.max(0, f - p.delay);
          const pOp = interpolate(pF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const pTy = interpolate(pF, [0, 22], [20 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          const pScale = easeOutBack(Math.min(pF / 22, 1));
          return (
            <div key={i} style={{
              opacity: pOp,
              transform: `translateY(${pTy}px) scale(${pScale})`,
              background: p.bg,
              border: `${1.5 * S}px solid ${p.border}`,
              borderRadius: 12 * S,
              padding: `${10 * S}px ${12 * S}px`,
              flex: 1,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
            }}>
              <div style={{ fontSize: 26 * S }}>{p.icon}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.text, fontWeight: 700, textAlign: "center" as const,
                lineHeight: 1.3,
              }}>{p.label}</div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: p.color, letterSpacing: "0.04em", textAlign: "center" as const,
              }}>{p.tone}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 4. ThreeMysteriesAnimation — Scene2 local 0, DURATION 1544
//    Visual: Three "mystery" cards that flip from ❓ to ✓ when speaker mentions them.
//    Aligned VTT: 第一 at local 180, 第二 at local 442, 第三 at local 907.
function ThreeMysteriesAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1544;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const mysteries = [
    { num: "01", label: "感覺不一樣", appearsAt: 180,  color: C.primary },
    { num: "02", label: "莫名被拒絕", appearsAt: 442,  color: C.yellow },
    { num: "03", label: "被別人設定", appearsAt: 907,  color: C.primary },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 170 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 240 * S,
      display: "flex", flexDirection: "column", gap: 14 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em", marginBottom: 4 * S,
      }}>三個謎題</div>

      {mysteries.map((m, i) => {
        // Entrance — all visible from start, dim
        const entF = Math.max(0, f - i * 12);
        const entOp = interpolate(entF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const entTx = interpolate(entF, [0, 22], [25 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        // Active — flip from ❓ to ✓
        const actF = Math.max(0, f - m.appearsAt);
        const isActive = actF > 0;
        const actT = interpolate(actF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const opMult = interpolate(actT, [0, 1], [0.32, 1], clamp);
        // Icon flip animation
        const iconRotY = interpolate(actF, [0, 18], [0, 180], { easing: E.outCubic, extrapolateRight: "clamp" });
        const showCheck = actF > 9;
        return (
          <div key={i} style={{
            opacity: entOp * opMult,
            transform: `translateX(${entTx}px)`,
            background: "rgba(0,0,0,0.82)",
            border: `${1.5 * S}px solid ${m.color}44`,
            borderLeft: `${3 * S}px solid ${m.color}`,
            borderRadius: 12 * S,
            padding: `${12 * S}px ${14 * S}px`,
            display: "flex", alignItems: "center", gap: 12 * S,
            position: "relative",
            boxShadow: isActive && actT > 0.5 ? `0 0 ${16 * S}px ${m.color}33` : "none",
          }}>
            {/* Flip icon */}
            <div style={{
              width: 38 * S, height: 38 * S,
              position: "relative",
              transformStyle: "preserve-3d" as const,
              transform: `rotateY(${iconRotY}deg)`,
              flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {!showCheck && (
                <span style={{ fontSize: 26 * S, position: "absolute" }}>❓</span>
              )}
              {showCheck && (
                <span style={{
                  fontSize: 26 * S, position: "absolute",
                  color: m.color, fontWeight: 700,
                  textShadow: `0 0 ${10 * S}px ${m.color}`,
                  transform: "rotateY(180deg)",
                }}>✓</span>
              )}
            </div>
            <div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: m.color, letterSpacing: "0.06em",
                fontWeight: 700,
              }}>{m.num}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.text, marginTop: 2 * S,
              }}>{m.label}</div>
            </div>
            <RippleRing activeAt={m.appearsAt} color={m.color} />
          </div>
        );
      })}
    </div>
  );
}

// 5. PromptTemplateAnimation — Scene3 local 607, DURATION 825
//    Visual: A "system_prompt.txt" file editor that types in three sections.
//    VTT alignment (base 607):
//      "設定 AI 的角色"     →   0
//      "設定輸出格式"       → 300 (local 907)
//      "告訴 AI 你的背景"   → 555 (local 1162)
function PromptTemplateAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 825;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const fileScale = easeOutBack(prog(f, 22));

  const sections = [
    { delay: 0,    label: "ROLE",       text: "你是專門的協助助手" },
    { delay: 300,  label: "FORMAT",     text: "先結論、再理由" },
    { delay: 555,  label: "BACKGROUND", text: "我有 5 年的相關經驗" },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 160 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 280 * S,
      transform: `scale(${fileScale})`,
      transformOrigin: "top right",
      background: "rgba(13,13,13,0.95)",
      border: `${1.5 * S}px solid ${C.primaryBorder}`,
      borderRadius: 12 * S,
      overflow: "hidden",
      boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.12)`,
    }}>
      {/* File header */}
      <div style={{
        background: "rgba(124,255,178,0.05)",
        padding: `${10 * S}px ${14 * S}px`,
        borderBottom: `1px solid ${C.primaryBorder}`,
        display: "flex", alignItems: "center", gap: 8 * S,
      }}>
        <div style={{ display: "flex", gap: 4 * S }}>
          <div style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.red }} />
          <div style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.yellow }} />
          <div style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary }} />
        </div>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.muted, letterSpacing: "0.04em",
        }}>system_prompt.txt</span>
      </div>

      {/* Sections */}
      <div style={{ padding: `${14 * S}px ${16 * S}px`, display: "flex", flexDirection: "column", gap: 14 * S }}>
        {sections.map((s, i) => {
          const sF = Math.max(0, f - s.delay);
          const sOp = interpolate(sF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const sTy = interpolate(sF, [0, 22], [12 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          // Type effect — reveal characters
          const charsToShow = Math.floor(interpolate(sF, [10, 50], [0, s.text.length], { extrapolateRight: "clamp" }));
          return (
            <div key={i} style={{
              opacity: sOp,
              transform: `translateY(${sTy}px)`,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.08em", marginBottom: 6 * S,
                fontWeight: 700,
              }}>{`# ${s.label}`}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.text, lineHeight: 1.55, minHeight: 28 * S,
              }}>{s.text.slice(0, charsToShow)}{charsToShow < s.text.length ? "▍" : ""}</div>
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
  const dur = SCENES_2026_05_06.title.to - SCENES_2026_05_06.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(56);
  const tagStyle = useFadeUp(72);

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
            fontWeight: 700,
          }}>每日 AI 知識庫</span>
        </div>

        {/* H1 line 1 */}
        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 38 * S, color: C.text,
        }}>
          <WordReveal text="什麼是 System Prompt？" startFrame={10} staggerPerWord={6}
            fontSize={38 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 — neon green accent */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 30 * S, color: C.primary,
        }}>
          <WordReveal text="你看不到的那層指令" startFrame={32} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle,
          marginTop: 22 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
        }}>
          決定 AI 怎麼回應你的隱藏設定
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 18 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>System Prompt · Custom Instructions · Claude · ChatGPT</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation: HiddenPromptAnimation at frame 388 (12.94s) */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <HiddenPromptAnimation triggerFrame={388} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — System Prompt 是什麼？ ────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_06.scene1.to - SCENES_2026_05_06.scene1.from;

  // VTT-based local frames (= global - 959)
  // Phase A:
  //   31.98s → local 0    "那 System Prompt 到底是什麼"
  //   33.98s → local 60   "簡單說,每一次你開啟一個 AI 聊天介面"
  //   38.48s → local 195  "輸入第一個問題"
  //   40.48s → local 256  "其實你不是第一個跟這個 AI 說話的人"
  //   45.48s → local 405  "在你之前,產品開發者已先送了一份指令給 AI"
  //   51.24s → local 578  "你是誰,你的任務是什麼"
  //   53.24s → local 638  "你可以說什麼"
  //   57.98s → local 781  "這份指令不會出現在畫面上"
  //   1:00.48 → local 856 "你看不到它,但它一直在運作"
  //   1:03.48 → local 946 "影響著 AI 對你每一個問題的回應"
  // Phase B (starts 1:07.22 → local 1058):
  //   1:09.72 → local 1133 "放在一個客服機器人裡"
  //   1:11.72 → local 1193 "只能回答這個產品相關的問題"
  //   1:17.22 → local 1358 "放在一個創意寫作工具裡"
  //   1:19.72 → local 1433 "語氣輕鬆活潑"
  //   1:25.22 → local 1598 "背後是同一個模型"
  //   1:27.72 → local 1673 "但 System Prompt 不同,行為就完全不一樣"

  const BADGE_AT      = 0;
  const HEADING_AT    = 60;
  const ORDER_AT      = 256;
  const INSTR_AT      = 405;
  const HIDDEN_AT     = 781;

  // Phase A → B boundary ("舉個例子" at local 1058)
  const A_FADE_START = 978;
  const A_REMOVE     = 1058;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B
  const B_SHOW_AT     = 1058;
  const EXAMPLE_BADGE = 1058;
  const SPLIT_AT      = 1133;
  const PUNCH_AT      = 1673;
  const showB         = frame >= B_SHOW_AT;

  // Phase A elements
  const badgeStyle    = useFadeUp(BADGE_AT);
  const headingStyle  = useFadeUp(HEADING_AT);
  const orderStyle    = useFadeUp(ORDER_AT);
  const instrStyle    = useFadeUp(INSTR_AT);
  const hiddenStyle   = useFadeUp(HIDDEN_AT);

  // Phase B elements
  const exBadgeStyle  = useFadeUp(showB ? EXAMPLE_BADGE : 999999);
  const splitStyle    = useFadeUp(showB ? SPLIT_AT : 999999);
  const punchStyle    = useFadeIn(showB ? PUNCH_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* SECTION badge */}
            <div style={{ ...badgeStyle, marginBottom: 12 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
                fontWeight: 700,
              }}>SYSTEM PROMPT</span>
            </div>

            {/* Heading */}
            <h2 style={{ ...headingStyle, margin: 0, marginBottom: 18 * S }}>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 28 * S,
                color: C.text, fontWeight: 700, lineHeight: 1.3,
              }}>
                <WordReveal text="對話開始前的隱藏指令" startFrame={HEADING_AT + 4} staggerPerWord={5}
                  fontSize={28 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={700} />
              </span>
            </h2>

            {/* Conversation order card */}
            <div style={{ ...orderStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.06em", marginBottom: 10 * S,
                }}>對話順序</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.6,
                }}>
                  你不是第一個跟這個 AI 說話的人——
                  <span style={{ color: C.primary, fontWeight: 700 }}>產品開發者已先送了一份指令</span>
                </div>
              </div>
            </div>

            {/* Instruction contents card */}
            <div style={{ ...instrStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.06em", marginBottom: 10 * S,
                }}>指令內含</div>
                {[
                  "你是誰",
                  "你的任務是什麼",
                  "你可以說什麼、不能說什麼",
                  "遇到某些情況要怎麼回應",
                ].map((item, i) => (
                  <div key={i} style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                    color: C.text, lineHeight: 1.55,
                    padding: `${4 * S}px 0`,
                    borderBottom: i < 3 ? `1px solid rgba(255,255,255,0.04)` : "none",
                  }}>· {item}</div>
                ))}
              </div>
            </div>

            {/* Highlight: 看不到，但一直在運作 */}
            <div style={{ ...hiddenStyle }}>
              <div style={{
                background: C.primaryLight,
                border: `${1.5 * S}px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: 700, lineHeight: 1.4,
                }}>看不到它，但它一直在運作</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            {/* Example badge */}
            <div style={{ ...exBadgeStyle, marginBottom: 14 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.1em",
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
                fontWeight: 700,
              }}>舉個例子</span>
            </div>

            {/* Split card: same Claude, two products */}
            <div style={{ ...splitStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${18 * S}px ${20 * S}px`,
              }}>
                {/* Header — same Claude */}
                <div style={{
                  textAlign: "center" as const, marginBottom: 14 * S,
                }}>
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
                    color: C.primary, fontWeight: 700, letterSpacing: "0.05em",
                    textShadow: `0 0 ${12 * S}px rgba(124,255,178,0.55)`,
                  }}>同一個 Claude</span>
                </div>

                {/* Two columns */}
                <div style={{
                  display: "flex", gap: 14 * S, alignItems: "stretch",
                }}>
                  {/* Customer support */}
                  <div style={{
                    flex: 1,
                    background: C.yellowLight,
                    border: `1px solid ${C.yellowBorder}`,
                    borderRadius: 10 * S,
                    padding: `${12 * S}px ${14 * S}px`,
                  }}>
                    <div style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                      color: C.yellow, letterSpacing: "0.06em", marginBottom: 6 * S,
                      fontWeight: 700,
                    }}>客服機器人</div>
                    <div style={{
                      fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                      color: C.text, lineHeight: 1.55,
                    }}>只回答產品相關的問題</div>
                  </div>

                  {/* Creative writing */}
                  <div style={{
                    flex: 1,
                    background: C.primaryLight,
                    border: `1px solid ${C.primaryBorder}`,
                    borderRadius: 10 * S,
                    padding: `${12 * S}px ${14 * S}px`,
                  }}>
                    <div style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                      color: C.primary, letterSpacing: "0.06em", marginBottom: 6 * S,
                      fontWeight: 700,
                    }}>創意寫作工具</div>
                    <div style={{
                      fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                      color: C.text, lineHeight: 1.55,
                    }}>語氣輕鬆活潑，鼓勵天馬行空</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Punchline */}
            <div style={{ ...punchStyle }}>
              <div style={{
                background: C.primaryLight,
                border: `${1.5 * S}px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: 700, lineHeight: 1.4,
                }}>
                  同模型，<span style={{ color: C.primary }}>不同 System Prompt</span> = 完全不同行為
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <InvisibleInstructionAnimation triggerLocalFrame={256} />
        <TwoFacedClaudeAnimation triggerLocalFrame={1058} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — 為什麼這重要：三個謎題 ────────────────────────────────────────
function MysteryNode({ index, label, detail, color, activeAt }: {
  index: number; label: string; detail: string; color: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  // Entrance
  const entF = Math.max(0, frame - (index * 16));
  const entOp = interpolate(entF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const entTy = interpolate(entF, [0, 22], [22 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  // Dim → bright
  const dimF = Math.max(0, frame - activeAt);
  const activeT = interpolate(dimF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const opMult = interpolate(activeT, [0, 1], [0.3, 1], clamp);
  return (
    <div style={{
      opacity: entOp * opMult, transform: `translateY(${entTy}px)`,
      marginBottom: 14 * S, position: "relative",
    }}>
      <div style={{
        background: `${color}14`,
        border: `${1.5 * S}px solid ${color}`,
        borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
        boxShadow: activeT > 0.5 ? `0 0 ${20 * S}px ${color}22` : "none",
        transition: "box-shadow 0.3s",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color, letterSpacing: "0.08em", marginBottom: 8 * S,
          fontWeight: 700,
        }}>
          {`0${index + 1}. `}{label}
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.text, lineHeight: 1.65,
        }}>{detail}</div>
        <RippleRing activeAt={activeAt} color={color} />
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_06.scene2.to - SCENES_2026_05_06.scene2.from;

  // VTT (local = global - 3134):
  //   0    "了解 System Prompt 能幫你解開幾個謎"
  //   180  "第一,為什麼同一個 AI 在不同地方感覺不一樣"
  //   442  "第二,為什麼 AI 有時候拒絕你"
  //   907  "第三,其實也是最重要的一點"

  const HEADER_AT = 0;
  const NODES_AT  = 90;
  const NODE1_AT  = 180;
  const NODE2_AT  = 442;
  const NODE3_AT  = 907;

  const headerStyle = useFadeUp(HEADER_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Header */}
        <div style={{ ...headerStyle, marginBottom: 18 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
            fontWeight: 700,
          }}>為什麼這重要</div>
          <h2 style={{ margin: 0 }}>
            <span style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26 * S,
              color: C.text, fontWeight: 700, lineHeight: 1.3,
            }}>
              <WordReveal text="它幫你解開三個謎" startFrame={HEADER_AT + 4} staggerPerWord={5}
                fontSize={26 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={700} />
            </span>
          </h2>
        </div>

        {/* Three reason nodes — all rendered together, dim until activeAt */}
        {frame >= NODES_AT && (
          <>
            <MysteryNode
              index={0} label="同一個 AI，不同感覺"
              activeAt={NODE1_AT} color={C.primary}
              detail="不是模型變了，而是 System Prompt 不同——所以同一個 AI 在不同產品中感覺天差地別"
            />
            <MysteryNode
              index={1} label="AI 為什麼拒絕你"
              activeAt={NODE2_AT} color={C.yellow}
              detail="「這超出我的能力範圍」——可能不是模型的限制，而是 System Prompt 告訴它要這樣說"
            />
            <MysteryNode
              index={2} label="你在跟一個被設定過的 AI 互動"
              activeAt={NODE3_AT} color={C.primary}
              detail="第三方產品都有自己的 System Prompt——保持這個意識，是使用 AI 工具的重要素養"
            />
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ThreeMysteriesAnimation triggerLocalFrame={0} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 自己動手寫 System Prompt ──────────────────────────────────────
function PlatformChip({ delay, name, sub }: { delay: number; name: string; sub: string }) {
  const style = useFadeUp(delay);
  return (
    <div style={{
      ...style,
      background: C.surface, border: `1px solid ${C.primaryBorder}`,
      borderRadius: 10 * S, padding: `${10 * S}px ${14 * S}px`,
      flex: 1,
      display: "flex", flexDirection: "column", gap: 4 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.04em", fontWeight: 700,
      }}>{name}</div>
      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.muted, lineHeight: 1.5,
      }}>{sub}</div>
    </div>
  );
}

function TemplateCard({ delay, label, color, border, bg, fieldTitle, body }: {
  delay: number; label: string; color: string; border: string; bg: string;
  fieldTitle: string; body: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        background: bg,
        border: `${1.5 * S}px solid ${border}`,
        borderRadius: 12 * S,
        padding: `${14 * S}px ${18 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color, letterSpacing: "0.06em", marginBottom: 8 * S,
          fontWeight: 700,
        }}>{label}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
          color: C.text, fontWeight: 700, lineHeight: 1.4, marginBottom: 8 * S,
        }}>{fieldTitle}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, lineHeight: 1.6,
          paddingLeft: 12 * S, borderLeft: `${2 * S}px solid ${border}`,
        }}>「{body}」</div>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_06.scene3.to - SCENES_2026_05_06.scene3.from;

  // VTT (local = global - 4948):
  //   0    "好消息是 System Prompt 不是只有公司才能用"
  //   135  "如果你在使用 API 或者支援自訂指示的介面"
  //   307  "比如 ChatGPT 的 Custom Instructions"
  //   427  "Claude 的 Projects 功能"
  //   487  "你可以自己寫 System Prompt"
  //   547  "幾個實用的方向"  ← Phase B starts here
  //   607  "設定 AI 的角色"
  //   787  "回答時請保持嚴謹,不要過度自信"
  //   907  "設定輸出格式"
  //   1102 "控制在 300 字內"
  //   1162 "告訴 AI 你的背景"
  //   1342 "技術問題可以直接用專業術語回答"

  const BADGE_AT      = 0;
  const HEADING_AT    = 60;
  const PLATFORMS_AT  = 307;
  const PHIL_AT       = 487;

  // Phase A → B boundary ("幾個實用的方向" at local 547)
  const A_FADE_START = 467;
  const A_REMOVE     = 547;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B
  const B_SHOW_AT     = 547;
  const SECTION_AT    = 547;
  const ROLE_AT       = 607;
  const FORMAT_AT     = 907;
  const BG_AT         = 1162;
  const showB         = frame >= B_SHOW_AT;

  // Phase B card heights estimate:
  //   SectionBadge (54px Space Mono + padding + 14*S marginBottom): ~110px
  //   Each TemplateCard:
  //     useFadeUp baseline 22*S = 66px translate offset (counts toward layout? no — only on transform)
  //     padding 14*S top + 14*S bottom = 84px
  //     label 18*S + marginBottom 8*S = 78px
  //     fieldTitle 22*S × 1.4 + marginBottom 8*S = 116px
  //     body 18*S × 2 lines × 1.6 + paddingLeft = 173px
  //     marginBottom 14*S = 42px
  //     ≈ 493px per card
  //   3 cards × 493 = 1479px + sectionBadge 110 = ~1589px
  //   Comfortably under CONTENT_H = 1620px ✓ no scrollUp needed.

  const badgeStyle    = useFadeUp(BADGE_AT);
  const headingStyle  = useFadeUp(HEADING_AT);
  const philStyle     = useFadeIn(PHIL_AT);
  const sectionStyle  = useFadeUp(showB ? SECTION_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Badge */}
            <div style={{ ...badgeStyle, marginBottom: 14 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
                fontWeight: 700,
              }}>好消息</span>
            </div>

            {/* Heading */}
            <h2 style={{ ...headingStyle, margin: 0, marginBottom: 22 * S }}>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 28 * S,
                color: C.text, fontWeight: 700, lineHeight: 1.3,
              }}>
                <WordReveal text="System Prompt 你也可以自己寫" startFrame={HEADING_AT + 4} staggerPerWord={5}
                  fontSize={28 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={700} />
              </span>
            </h2>

            {/* Where to write — platform chips */}
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
              fontWeight: 700,
            }}>哪裡可以寫</div>
            <div style={{ display: "flex", gap: 12 * S, marginBottom: 22 * S }}>
              <PlatformChip delay={PLATFORMS_AT}        name="ChatGPT"  sub="Custom Instructions" />
              <PlatformChip delay={PLATFORMS_AT + 60}   name="Claude"   sub="Projects 功能" />
              <PlatformChip delay={PLATFORMS_AT + 120}  name="API"      sub="直接傳 system 欄位" />
            </div>

            {/* Philosophy / hook line */}
            <div style={{ ...philStyle }}>
              <div style={{
                background: C.primaryLight,
                border: `${1.5 * S}px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: 700, lineHeight: 1.4,
                }}>你也可以自己寫 System Prompt</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            {/* Section badge: 幾個實用方向 */}
            <div style={{ ...sectionStyle, marginBottom: 14 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
                fontWeight: 700,
              }}>幾個實用方向</span>
            </div>

            <TemplateCard
              delay={ROLE_AT}
              label="01. 設定 AI 的角色"
              color={C.primary} border={C.primary} bg={C.primaryLight}
              fieldTitle="角色"
              body="你是一個專門協助財務分析的助手，回答時請保持嚴謹，不要過度自信"
            />

            <TemplateCard
              delay={FORMAT_AT}
              label="02. 設定輸出格式"
              color={C.yellow} border={C.yellow} bg={C.yellowLight}
              fieldTitle="格式"
              body="每次回答請先給結論，再說理由，控制在 300 字以內"
            />

            <TemplateCard
              delay={BG_AT}
              label="03. 告訴 AI 你的背景"
              color={C.blue} border={C.blue} bg={C.blueLight}
              fieldTitle="背景"
              body="我是軟體工程師，有五年 Python 經驗，技術問題可以直接用專業術語"
            />
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <PromptTemplateAnimation triggerLocalFrame={607} />
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
        background: `${border}12`,
        border: `1px solid ${border}`,
        borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
          color, fontWeight: 700, flexShrink: 0, marginTop: 2 * S,
          textShadow: `0 0 ${10 * S}px ${color}88`,
        }}>{number}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
          color: C.text, lineHeight: 1.65,
        }}>{text}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_05_06.summary.to - SCENES_2026_05_06.summary.from;

  // VTT (local = global - 6935):
  //   0    "今天的重點整理"
  //   60   "第一,System Prompt 是對話開始前就存在的隱藏指令"
  //   270  "第二,了解它能幫你看清楚"
  //   615  "第三,你也可以自己寫 System Prompt"
  //   795  "這裡是每日 AI 知識庫"

  const BADGE_AT  = 0;
  const CARD1_AT  = 60;
  const CARD2_AT  = 270;
  const CARD3_AT  = 615;
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
            borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
            fontWeight: 700,
          }}>
            <WordReveal text="重點整理" startFrame={4} staggerPerWord={5}
              fontSize={18 * S} color={C.primary}
              fontFamily="'Space Mono', monospace" letterSpacing="0.12em" fontWeight={700} />
          </span>
        </div>

        <SummaryCard
          number="01" delay={CARD1_AT}
          text="System Prompt 是對話開始前就存在的隱藏指令——決定 AI 的行為邊界和個性"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="02" delay={CARD2_AT}
          text="了解它能幫你看清楚，為什麼 AI 在不同產品中表現不同，以及誰在控制 AI 的行為"
          color={C.yellow} border={C.yellow}
        />
        <SummaryCard
          number="03" delay={CARD3_AT}
          text="你也可以自己寫 System Prompt——讓 AI 更穩定地符合你的需求"
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
export function VideoComposition_2026_05_06() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_06.scene1;
  const S2 = SCENES_2026_05_06.scene2;
  const S3 = SCENES_2026_05_06.scene3;
  const SU = SCENES_2026_05_06.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-05-06-processed.wav")} volume={1.0} />
      <Audio src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_05_06 - 150, TOTAL_FRAMES_2026_05_06], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return Math.min(fi, fo);
        }}
        loop />

      <Background />

      {/* TitleScene */}
      <Sequence from={0} durationInFrames={S1.from}>
        <TitleScene />
      </Sequence>

      {/* Scene 1 — System Prompt 是什麼 */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — 為什麼這重要 */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — 自己動手寫 */}
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
