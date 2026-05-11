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
  muted:        "#a0a0a0",
  yellow:       "#ffd166",
  yellowLight:  "rgba(255,209,102,0.1)",
  yellowBorder: "rgba(255,209,102,0.2)",
  red:          "#ff6b6b",
  redLight:     "rgba(255,107,107,0.08)",
  redBorder:    "rgba(255,107,107,0.2)",
  blue:         "#7ec8ff",
  blueLight:    "rgba(126,200,255,0.08)",
  blueBorder:   "rgba(126,200,255,0.22)",
} as const;

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W       = 290 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLOT    = 148 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// VTT timestamps:
//   "第一件,Claude開始做夢了"          → 21.44s → 643
//   "第二件,Claude全面進攻金融業"      → 115.68s → 3470
//   "第三件,Anthropic算力大擴張"        → 216.24s → 6487
//   "好,快速整理本週三件大事"           → 321.04s → 9631
//   end "掰掰"                            → 366.48s → 10994.4 → 10995
export const SCENES_2026_05_08 = {
  title:   { from: 0,    to: 643   },
  scene1:  { from: 643,  to: 3470  },
  scene2:  { from: 3470, to: 6487  },
  scene3:  { from: 6487, to: 9631  },
  summary: { from: 9631, to: 10995 },
} as const;
export const TOTAL_FRAMES_2026_05_08 = 10995;

const CHAPTERS = [
  { label: "本週焦點",        start: 0     },
  { label: "Claude 做夢",     start: 643   },
  { label: "金融 & M365",     start: 3470  },
  { label: "算力大擴張",      start: 6487  },
  { label: "重點整理",        start: 9631  },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
// Question: "你最希望它記住什麼,最不希望它記住什麼"        110.56s → 3317  (scene1 end 3470)
// Question: "如果AI幫你做完一份重要審查,你願意為它的判斷負責嗎"  205.52s → 6166  (scene2 end 6487)
// Question: "現在掌握最多算力的公司,未來會有什麼樣的優勢"   312.64s → 9379  (scene3 end 9631)
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 3317, to: 3470, sender: "親身經歷", text: "如果你的 AI 助手能在你不在時自動學習你的習慣，你最希望它記住什麼？最不希望它記住什麼？" },
  { from: 6166, to: 6487, sender: "想一想", text: "如果 AI 幫你做完一份重要審查，你願意為它的判斷負責嗎？你會怎麼確認它沒有出錯？" },
  { from: 9379, to: 9631, sender: "未來思考", text: "如果算力是 AI 時代的石油，掌握最多算力的公司未來會有什麼優勢？這個集中化趨勢讓你擔心嗎？" },
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
        background: "radial-gradient(circle, rgba(126,200,255,0.06) 0%, transparent 70%)",
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

// 1. ThreeDirectionsAnimation — TitleScene
//    triggerFrame = 240 (8s, before "它開始有記憶,職場,管制" listed at 15.04s = 451)
//    DURATION = 380 (covers 240–620, beyond title end 643)
//    Visual: 3 nodes orbiting central AI, each labeled with one direction's icon
function ThreeDirectionsAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 380;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const coreScale = easeOutBack(prog(f, 22));
  const orbitRot = (f * 0.012) % (Math.PI * 2);
  const pulseGlow = Math.sin(f * 0.05) * 0.15 + 0.85;

  // each direction appears at its VTT mention: 記憶 ~150, 職場 ~210, 管制 ~270
  const directions = [
    { angle: -90, label: "記憶",  icon: "🧠", color: C.primary, appearsAt: 60 },
    { angle:  30, label: "職場",  icon: "💼", color: C.yellow,  appearsAt: 150 },
    { angle: 150, label: "監管",  icon: "⚖️", color: C.blue,    appearsAt: 240 },
  ];

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S, height: 260 * S,
    }}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {/* Central AI core */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 90 * S, height: 90 * S, borderRadius: "50%",
          background: "rgba(124,255,178,0.12)",
          border: `${3 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32 * S,
          transform: `translate(-50%,-50%) scale(${coreScale * pulseGlow})`,
          boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.45)`,
        }}>🤖</div>

        {/* Three orbiting nodes */}
        {directions.map((d, i) => {
          const itemF = Math.max(0, f - d.appearsAt);
          const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemScale = easeOutBack(prog(itemF, 22));
          const radius = 100 * S;
          const baseRad = (d.angle * Math.PI) / 180;
          const rad = baseRad + orbitRot * 0.3;
          const cx = 130 * S + Math.cos(rad) * radius - 36 * S;
          const cy = 130 * S + Math.sin(rad) * radius - 36 * S;
          return (
            <div key={i} style={{
              position: "absolute",
              left: cx, top: cy,
              opacity: itemOp,
              transform: `scale(${itemScale})`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
            }}>
              <div style={{
                width: 72 * S, height: 72 * S, borderRadius: "50%",
                background: `${d.color}1f`,
                border: `${2 * S}px solid ${d.color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 30 * S,
                boxShadow: `0 0 ${16 * S}px ${d.color}55`,
              }}>{d.icon}</div>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: d.color, letterSpacing: "0.06em",
                background: "rgba(0,0,0,0.6)", padding: `${3 * S}px ${8 * S}px`,
                borderRadius: 6 * S,
              }}>{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 2. DreamingBrainAnimation — Scene1 Phase A
//    triggerLocalFrame = 200 (after "做夢" first uttered at 5.5s = local 165)
//    DURATION = 1280 (covers to ~1480, before Phase A wind-down at 1797)
//    Visual: brain in sleep state with floating Z's + memory blocks consolidating into a chip
function DreamingBrainAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1280;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const brainScale = easeOutBack(prog(f, 22));
  const breath = Math.sin(f * 0.04) * 0.06 + 1;

  // Floating Z's loop
  const zs = [0, 1, 2];

  // Memory blocks consolidate: appear, drift inward, fade into chip
  // Aligned to VTT: "找規律、整理偏好、更新記憶" at 41.92s = local 614 → relative f=414
  const blocks = [
    { label: "規律",   appearsAt: 200, color: C.primary },
    { label: "偏好",   appearsAt: 320, color: C.yellow  },
    { label: "習慣",   appearsAt: 440, color: C.blue    },
  ];

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S,
    }}>
      {/* Brain with Z's */}
      <div style={{ position: "relative", width: 200 * S, height: 160 * S }}>
        {/* Brain */}
        <div style={{
          position: "absolute", top: "55%", left: "50%",
          width: 110 * S, height: 110 * S, borderRadius: "50%",
          background: "rgba(124,255,178,0.12)",
          border: `${3 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 44 * S,
          transform: `translate(-50%,-50%) scale(${brainScale * breath})`,
          boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.4)`,
        }}>🧠</div>

        {/* Floating Z's */}
        {zs.map((i) => {
          const phase = (f * 0.6 + i * 40) % 120;
          const op = interpolate(phase, [0, 30, 90, 120], [0, 0.95, 0.6, 0], clamp);
          const ty = interpolate(phase, [0, 120], [0, -70 * S], clamp);
          const tx = Math.sin(phase * 0.05 + i) * 14 * S;
          const sz = interpolate(phase, [0, 60, 120], [16 * S, 22 * S, 26 * S], clamp);
          return (
            <div key={i} style={{
              position: "absolute",
              top: 30 * S, left: "62%",
              transform: `translate(${tx}px, ${ty}px)`,
              opacity: op,
              fontFamily: "'Space Mono', monospace", fontSize: sz,
              color: C.primary, fontWeight: 700,
              textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.7)`,
            }}>Z</div>
          );
        })}
      </div>

      {/* Memory chip */}
      <div style={{
        position: "relative",
        width: 180 * S, padding: `${12 * S}px ${16 * S}px`,
        background: "rgba(0,0,0,0.78)",
        border: `${2 * S}px solid ${C.primaryBorder}`,
        borderRadius: 12 * S,
        boxShadow: `0 0 ${16 * S}px rgba(124,255,178,0.18)`,
        display: "flex", flexDirection: "column", gap: 6 * S, alignItems: "center",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary, letterSpacing: "0.08em",
        }}>MEMORY.LOG</div>
        <div style={{ display: "flex", gap: 6 * S, flexWrap: "wrap" as const, justifyContent: "center" }}>
          {blocks.map((b, i) => {
            const itemF = Math.max(0, f - b.appearsAt);
            const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
            const blink = Math.sin((f - b.appearsAt) * 0.12) * 0.18 + 0.82;
            return (
              <div key={i} style={{
                opacity: itemOp * blink,
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: b.color,
                background: `${b.color}1c`,
                border: `1px solid ${b.color}66`,
                borderRadius: 6 * S,
                padding: `${4 * S}px ${10 * S}px`,
              }}>{b.label}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 3. TenAgentTemplatesAnimation — Scene2 Phase A (LEFT side)
//    triggerLocalFrame = 403 (matches "10套AI代理模板" at 129.12s)
//    DURATION = 600 (ends at 1003, before M365 anim starts at 1054 — but on LEFT so safe)
//    Visual: counter 0 → 10 with finance task icons radiating out
function TenAgentTemplatesAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 600;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const count = Math.round(interpolate(f, [0, 60], [0, 10], { easing: E.outExpo, extrapolateRight: "clamp" }));
  const counterScale = easeOutBack(prog(f, 22));

  // Tasks aligned to VTT mentions:
  // 投資簡報 (133.6s = local 538 → relative f=135), KYC (134-138s), 月底結帳 (139s)
  const tasks = [
    { icon: "📊", label: "投資簡報",   appearsAt: 135 },
    { icon: "📋", label: "KYC 審查",   appearsAt: 200 },
    { icon: "📒", label: "月結帳關帳", appearsAt: 280 },
  ];

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 220 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      {/* Counter */}
      <div style={{
        display: "flex", alignItems: "baseline", gap: 6 * S,
        transform: `scale(${counterScale})`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 64 * S,
          color: C.primary, fontWeight: 700, lineHeight: 1,
          textShadow: `0 0 ${24 * S}px rgba(124,255,178,0.6)`,
        }}>{count}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
          color: C.muted,
        }}>套模板</div>
      </div>

      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>FINANCIAL AGENTS</div>

      {/* Task list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S, width: "100%" }}>
        {tasks.map((t, i) => {
          const itemF = Math.max(0, f - t.appearsAt);
          const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemTx = interpolate(itemF, [0, 22], [-30 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: itemOp,
              transform: `translateX(${itemTx}px)`,
              display: "flex", alignItems: "center", gap: 10 * S,
              background: "rgba(0,0,0,0.78)",
              borderLeft: `${3 * S}px solid ${C.primary}`,
              borderRadius: 10 * S,
              padding: `${8 * S}px ${12 * S}px`,
            }}>
              <span style={{ fontSize: 22 * S }}>{t.icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 18 * S, color: C.text,
              }}>{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 4. M365IntegrationAnimation — Scene2 Phase A (RIGHT side)
//    triggerLocalFrame = 1054 (matches "Microsoft 365整合" at 150.8s)
//    DURATION = 580 (ends at 1634, before A_FADE_START at 1641)
//    Visual: 4 apps connecting via shared bus → Claude
function M365IntegrationAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 580;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Apps revealed when listed in VTT (155.44s = local 1193 → relative f=139)
  const apps = [
    { icon: "📊", label: "Excel",      color: "#21A366", appearsAt: 90  },
    { icon: "📺", label: "PowerPoint", color: "#D24726", appearsAt: 130 },
    { icon: "📝", label: "Word",       color: "#2B579A", appearsAt: 170 },
    { icon: "📧", label: "Outlook",    color: "#0078D4", appearsAt: 210 },
  ];

  // Bus + Claude bubble appear at 161.12s = local 1364 → relative f=310
  const busOp = interpolate(Math.max(0, f - 280), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const claudeScale = easeOutBack(prog(Math.max(0, f - 320), 22));
  const claudeOp = interpolate(Math.max(0, f - 320), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>MICROSOFT 365</div>

      {/* 2x2 app grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 * S, width: "100%",
      }}>
        {apps.map((a, i) => {
          const itemF = Math.max(0, f - a.appearsAt);
          const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemScale = easeOutBack(prog(itemF, 22));
          return (
            <div key={i} style={{
              opacity: itemOp,
              transform: `scale(${itemScale})`,
              display: "flex", alignItems: "center", gap: 8 * S,
              background: "rgba(0,0,0,0.82)",
              border: `${2 * S}px solid ${a.color}`,
              borderRadius: 10 * S,
              padding: `${8 * S}px ${10 * S}px`,
              boxShadow: `0 0 ${10 * S}px ${a.color}33`,
            }}>
              <span style={{ fontSize: 24 * S }}>{a.icon}</span>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: a.color, fontWeight: 700,
              }}>{a.label}</span>
            </div>
          );
        })}
      </div>

      {/* Bus / context line */}
      <div style={{
        opacity: busOp,
        width: "70%", height: 4 * S,
        background: `linear-gradient(to bottom, ${C.primary}, transparent)`,
        position: "relative",
        marginTop: 4 * S,
      }}>
        <div style={{
          position: "absolute", top: -10 * S, left: "50%", transform: "translateX(-50%)",
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary, background: "rgba(0,0,0,0.85)",
          padding: `${4 * S}px ${10 * S}px`, borderRadius: 6 * S,
          letterSpacing: "0.06em",
        }}>↕ context</div>
      </div>

      {/* Claude target */}
      <div style={{
        opacity: claudeOp,
        transform: `scale(${claudeScale})`,
        display: "flex", alignItems: "center", gap: 10 * S,
        marginTop: 8 * S,
        background: C.primaryLight,
        border: `${2 * S}px solid ${C.primary}`,
        borderRadius: 12 * S,
        padding: `${10 * S}px ${18 * S}px`,
        boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.4)`,
      }}>
        <span style={{ fontSize: 26 * S }}>🤖</span>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
          color: C.primary, fontWeight: 700, letterSpacing: "0.04em",
          textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.7)`,
        }}>Claude</span>
      </div>
    </div>
  );
}

// 5. GPUStackAnimation — Scene3 Phase A
//    triggerLocalFrame = 1654 (matches "30萬瓦/22萬顆GPU" at 271.36s)
//    DURATION = 540 (ends at 2194, before A_FADE_START at 2152 — overlap 42f, fine)
//    Visual: counter 0 → 220,000 GPUs with grid of dots
function GPUStackAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 540;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Counter: 0 → 220,000 over first 80f
  const count = Math.round(interpolate(f, [0, 80], [0, 220000], { easing: E.outExpo, extrapolateRight: "clamp" }));
  const counterScale = easeOutBack(prog(f, 22));

  // 8x6 grid of GPU dots
  const cols = 8, rows = 6;
  const dots: { x: number; y: number; idx: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push({ x: c, y: r, idx: r * cols + c });
    }
  }

  // Wattage label appears at f=120
  const wattOp = interpolate(Math.max(0, f - 120), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 240 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      {/* Counter */}
      <div style={{
        transform: `scale(${counterScale})`, textAlign: "center" as const,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 36 * S,
          color: C.primary, fontWeight: 700, lineHeight: 1,
          textShadow: `0 0 ${22 * S}px rgba(124,255,178,0.6)`,
        }}>{count.toLocaleString()}+</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
          color: C.muted, marginTop: 6 * S,
        }}>NVIDIA GPU</div>
      </div>

      {/* GPU grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 4 * S, width: "92%",
        padding: `${8 * S}px`,
        background: "rgba(0,0,0,0.55)",
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S,
      }}>
        {dots.map((d) => {
          const dotF = Math.max(0, f - d.idx * 1.5);
          const dotOp = interpolate(dotF, [0, 14], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const blink = Math.sin((f + d.idx * 7) * 0.18) * 0.25 + 0.75;
          return (
            <div key={d.idx} style={{
              width: "100%", aspectRatio: "1", borderRadius: 2 * S,
              background: C.primary,
              opacity: dotOp * blink,
              boxShadow: `0 0 ${3 * S}px ${C.primary}88`,
            }} />
          );
        })}
      </div>

      {/* Wattage badge */}
      <div style={{
        opacity: wattOp,
        display: "flex", gap: 10 * S, alignItems: "center",
        background: C.yellowLight,
        border: `1px solid ${C.yellowBorder}`,
        borderRadius: 8 * S,
        padding: `${6 * S}px ${14 * S}px`,
      }}>
        <span style={{ fontSize: 22 * S }}>⚡</span>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
          color: C.yellow, fontWeight: 700,
        }}>30 萬瓦</span>
      </div>
    </div>
  );
}

// 6. OilMetaphorAnimation — Scene3 Phase B
//    triggerLocalFrame = 2803 (matches "如果算力是AI時代的石油" at 309.68s)
//    DURATION = 320 (ends at 3123, before scene end 3144 buffer)
//    Visual: oil drum → arrow flowing into AI brain (compute = oil metaphor)
function OilMetaphorAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 320;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const oilScale = easeOutBack(prog(f, 22));
  const arrowW = interpolate(Math.max(0, f - 30), [0, 30], [0, 60 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const brainScale = easeOutBack(prog(Math.max(0, f - 60), 22));
  const labelOp = interpolate(Math.max(0, f - 90), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  // Oil drops flowing
  const drops = [0, 1, 2];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 280 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 * S }}>
        {/* Oil drum */}
        <div style={{
          fontSize: 48 * S, transform: `scale(${oilScale})`,
          filter: `drop-shadow(0 0 ${10 * S}px rgba(255,209,102,0.5))`,
        }}>🛢️</div>

        {/* Flow arrow with drops */}
        <div style={{
          width: arrowW, height: 6 * S,
          background: `linear-gradient(to right, ${C.yellow}, ${C.primary})`,
          borderRadius: 3 * S,
          boxShadow: `0 0 ${10 * S}px rgba(255,209,102,0.6)`,
          position: "relative",
        }}>
          {drops.map((i) => {
            const phase = (f * 1.5 + i * 25) % 75;
            const op = interpolate(phase, [0, 20, 55, 75], [0, 1, 0.6, 0], clamp);
            const tx = interpolate(phase, [0, 75], [0, arrowW], clamp);
            return (
              <div key={i} style={{
                position: "absolute", top: -6 * S, left: tx - 6 * S,
                width: 12 * S, height: 12 * S, borderRadius: "50%",
                background: C.yellow, opacity: op,
                boxShadow: `0 0 ${8 * S}px ${C.yellow}`,
              }} />
            );
          })}
        </div>

        {/* AI brain */}
        <div style={{
          width: 80 * S, height: 80 * S, borderRadius: "50%",
          background: "rgba(124,255,178,0.14)",
          border: `${3 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36 * S,
          transform: `scale(${brainScale})`,
          boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.45)`,
        }}>🧠</div>
      </div>

      {/* Label */}
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
        color: C.primary, fontWeight: 700, letterSpacing: "0.05em",
        textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.7)`,
        background: "rgba(0,0,0,0.85)",
        border: `${2 * S}px solid ${C.primaryBorder}`,
        borderRadius: 8 * S,
        padding: `${6 * S}px ${14 * S}px`,
      }}>算力 = AI 石油</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_05_08.title.to - SCENES_2026_05_08.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(60);
  // VTT: "三個更深的方向" mention at 7.44s = 223; "記憶/職場/管制" at 15.04s = 451
  const tagStyle = useFadeUp(220);

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
            borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
          }}>每日 AI 知識庫</span>
        </div>

        {/* H1 line 1 */}
        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 44 * S, color: C.text,
        }}>
          <WordReveal text="本週 AI 大事播報" startFrame={10} staggerPerWord={6}
            fontSize={44 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 — neon green accent */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 30 * S, color: C.primary,
        }}>
          <WordReveal text="三件正在改變一切的事" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle,
          margin: 0, marginTop: 22 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 22 * S, color: C.muted, lineHeight: 1.6,
        }}>
          AI 開始有記憶、進入更嚴肅的職場、政府開始管它了
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 18 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>Dreaming · Microsoft 365 · 算力擴張</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation: ThreeDirectionsAnimation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ThreeDirectionsAnimation triggerFrame={240} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — Claude 開始做夢 ────────────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_08.scene1.to - SCENES_2026_05_08.scene1.from;
  // VTT-aligned local delays (local = global − 643):
  //   0   → "第一件,Claude開始做夢了" (21.44s)
  //   165 → "Anthropic發布Dreaming"   (26.96s)
  //   399 → "對話之間的空檔自主回顧"   (34.72s)
  //   614 → "找規律、整理偏好"         (41.92s)
  //   782 → "下班了關掉電腦,Claude還在消化" (47.52s)
  //   1090 → "AI最大限制 — 沒有跨對話記憶" (57.76s)
  //   1267 → "Dreaming就是要解決這個問題"  (63.76s)
  //   1797 → "目前以研究預覽形式推出"   (81.36s)
  //   2074 → Phase B: "停下來想的問題"   (90.56s)
  //   2278 → "誰有權限查看,能不能刪除"   (97.36s)
  //   2675 → "如果AI能在你不在時自動學習" (110.56s)
  //   2827 → end (115.68s)

  const BADGE_AT     = 0;
  const H2_AT        = 0;
  const DEF_AT       = 165;
  const MECH_AT      = 399;
  const DAILY_AT     = 782;
  const LIMIT_AT     = 1090;

  // Phase A→B: Phase B first sentence at 90.56s = local 2074
  const A_FADE_START = 1994;
  const A_REMOVE     = 2074;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B
  const B_SHOW_AT    = 2074;
  const B_BADGE_AT   = 2074;
  const B_INSIGHT_AT = 2074;
  const B_PRIVACY_AT = 2278;
  const B_QUESTION_AT = 2675;
  const showB        = frame >= B_SHOW_AT;

  const badgeStyle  = useFadeUp(BADGE_AT);
  const h2Style     = useFadeUp(H2_AT + 20);
  const defStyle    = useFadeUp(DEF_AT);
  const mechStyle   = useFadeUp(MECH_AT);
  const dailyStyle  = useFadeUp(DAILY_AT);
  const limitStyle  = useFadeUp(LIMIT_AT);

  const bBadgeStyle = useFadeUp(showB ? B_BADGE_AT : 999999);
  const bH2Style    = useFadeUp(showB ? B_BADGE_AT + 14 : 999999);
  const bInsightStyle = useFadeUp(showB ? B_INSIGHT_AT + 28 : 999999);
  const bPrivStyle  = useFadeUp(showB ? B_PRIVACY_AT : 999999);
  const bQStyle     = useFadeUp(showB ? B_QUESTION_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Section badge */}
            <div style={{ ...badgeStyle, marginBottom: 12 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.12em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
              }}>FEATURE · DREAMING</span>
            </div>

            {/* H2 heading */}
            <h2 style={{
              ...h2Style, margin: 0, marginBottom: 18 * S,
              fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900,
              fontSize: 26 * S, color: C.text, lineHeight: 1.25,
            }}>Claude 開始「做夢」了</h2>

            {/* Definition card */}
            <div style={{ ...defStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>DREAMING 是什麼</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.65,
                }}>
                  Anthropic 新功能 — 讓 Claude 在
                  <span style={{ color: C.primary, fontWeight: 700 }}> 對話與對話之間的空檔</span>
                  ，自主回顧之前的工作內容
                </div>
              </div>
            </div>

            {/* Mechanism card (3 actions) */}
            <div style={{ ...mechStyle, marginBottom: 14 * S }}>
              <div style={{
                background: "rgba(0,0,0,0.55)",
                border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>它在空檔做什麼</div>
                <div style={{
                  display: "flex", gap: 10 * S, flexWrap: "wrap" as const,
                }}>
                  {["🔍 找規律", "⚙️ 整理偏好", "📁 更新記憶檔案"].map((t, i) => (
                    <span key={i} style={{
                      fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                      color: C.text, background: C.primaryLight,
                      border: `1px solid ${C.primaryBorder}`,
                      borderRadius: 8 * S, padding: `${6 * S}px ${12 * S}px`,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily life highlight */}
            <div style={{ ...dailyStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: 700, lineHeight: 1.45,
                }}>
                  你下班了關掉電腦，Claude 還在「消化」今天做了什麼
                </div>
              </div>
            </div>

            {/* Pain point + solution combined */}
            <div style={{ ...limitStyle }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S,
                padding: `${12 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.muted, lineHeight: 1.65,
                }}>
                  <span style={{ color: C.red, fontWeight: 700 }}>過去：</span>
                  每次新對話 AI 就像失憶了一樣 ／
                  <span style={{ color: C.primary, fontWeight: 700 }}>現在：</span>
                  認識你的長期夥伴
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            <div style={{ ...bBadgeStyle, marginBottom: 12 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.12em",
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
              }}>WHAT IT MEANS</span>
            </div>

            <h2 style={{
              ...bH2Style, margin: 0, marginBottom: 18 * S,
              fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900,
              fontSize: 26 * S, color: C.text, lineHeight: 1.25,
            }}>AI 有了記憶，意味著什麼</h2>

            {/* Insight card */}
            <div style={{ ...bInsightStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.65,
                }}>
                  AI 不再是「每次重新自我介紹」的工具，可以主動學習你、累積對你的理解 ——
                  <span style={{ color: C.primary, fontWeight: 700 }}> 長期協作成為可能</span>
                </div>
              </div>
            </div>

            {/* Privacy warning card */}
            <div style={{ ...bPrivStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(255,209,102,0.1)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>⚠ 新的問題</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.65, fontWeight: 700,
                }}>記憶裡存的是什麼？誰有權限查看？能不能刪除？</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.6, marginTop: 8 * S,
                }}>不是只有工程師才需要關心</div>
              </div>
            </div>

            {/* Reflection question */}
            <div style={{ ...bQStyle }}>
              <div style={{
                background: "rgba(0,0,0,0.55)",
                borderLeft: `${4 * S}px solid ${C.primary}`,
                borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
                padding: `${10 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.65, fontStyle: "italic" as const,
                }}>
                  你最希望它記住什麼？最不希望它記住什麼？
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <DreamingBrainAnimation triggerLocalFrame={200} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — 金融 + Microsoft 365 ──────────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_08.scene2.to - SCENES_2026_05_08.scene2.from;
  // VTT-aligned local delays (local = global − 3470):
  //   0    → "第二件,進攻金融業" (115.68s)
  //   223  → "正式進軍金融服務"   (123.12s)
  //   403  → "10套AI代理模板"      (129.12s)
  //   538  → "投資簡報、KYC、結帳" (133.6s)
  //   831  → "AI代理可接手"        (143.36s)
  //   1054 → "Microsoft 365整合"   (150.8s)
  //   1193 → "Excel/PPT/Word/Outlook" (155.44s)
  //   1364 → "跨應用情境"           (161.12s)
  //   1484 → "Word合約Outlook回信"  (165.12s)
  //   1721 → Phase B: "意義不只是又多一個AI功能" (173.04s)
  //   2004 → "高責任流程"            (182.48s)
  //   2184 → "簽名負責的人還是你"    (188.48s)
  //   2454 → "AI做完一份重要審查"    (205.52s)
  //   3017 → end (216.24s)

  const BADGE_AT       = 0;
  const H2_AT          = 0;
  const TEMPLATE_AT    = 403;
  const TASKS_AT       = 538;
  const M365_AT        = 1054;
  const APPS_AT        = 1193;
  const HIGHLIGHT_AT   = 1484;

  // Phase A→B at 173.04s = local 1721
  const A_FADE_START   = 1641;
  const A_REMOVE       = 1721;
  const showA          = frame < A_REMOVE;
  const aOpacity       = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B
  const B_SHOW_AT      = 1721;
  const B_INSIGHT_AT   = 2004;
  const B_WARNING_AT   = 2184;
  const B_QUESTION_AT  = 2454;
  const showB          = frame >= B_SHOW_AT;

  const badgeStyle    = useFadeUp(BADGE_AT);
  const h2Style       = useFadeUp(H2_AT + 20);
  const templateStyle = useFadeUp(TEMPLATE_AT);
  const tasksStyle    = useFadeUp(TASKS_AT);
  const m365Style     = useFadeUp(M365_AT);
  const appsStyle     = useFadeUp(APPS_AT);
  const hlStyle       = useFadeUp(HIGHLIGHT_AT);

  const bBadgeStyle   = useFadeUp(showB ? B_SHOW_AT : 999999);
  const bH2Style      = useFadeUp(showB ? B_SHOW_AT + 14 : 999999);
  const bInsightStyle = useFadeUp(showB ? B_INSIGHT_AT : 999999);
  const bWarnStyle    = useFadeUp(showB ? B_WARNING_AT : 999999);
  const bQStyle       = useFadeUp(showB ? B_QUESTION_AT : 999999);

  // Element fade-out for Phase A: HIGHLIGHT + APPS appear after TEMPLATE/TASKS
  // To keep cumulative height under 1620px, fade out TEMPLATE+TASKS as M365 appears
  const EARLY_FADE_START = M365_AT - 120;
  const EARLY_REMOVE = M365_AT - 10;
  const showEarly = frame < EARLY_REMOVE;
  const earlyOpacity = frame > EARLY_FADE_START
    ? interpolate(frame, [EARLY_FADE_START, EARLY_REMOVE], [1, 0], clamp) : 1;

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...badgeStyle, marginBottom: 12 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.12em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
              }}>ENTERPRISE · FINANCE & M365</span>
            </div>

            <h2 style={{
              ...h2Style, margin: 0, marginBottom: 18 * S,
              fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900,
              fontSize: 26 * S, color: C.text, lineHeight: 1.25,
            }}>Claude 進攻金融業 + 整合 Microsoft 365</h2>

            {/* Templates + tasks (early — fade out before M365) */}
            {showEarly && (
              <div style={{ opacity: earlyOpacity }}>
                {/* 10 Templates card */}
                <div style={{ ...templateStyle, marginBottom: 14 * S }}>
                  <div style={{
                    background: C.surface,
                    border: `1px solid ${C.primaryBorder}`,
                    borderRadius: 14 * S,
                    padding: `${14 * S}px ${20 * S}px`,
                  }}>
                    <div style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                      color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                    }}>FINANCIAL AGENT TEMPLATES</div>
                    <div style={{
                      fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                      color: C.text, fontWeight: 700, lineHeight: 1.4,
                    }}>
                      <span style={{ color: C.primary }}>10 套</span>
                      {" 隨開即用 — 針對金融業最耗時的工作"}
                    </div>
                  </div>
                </div>

                {/* Tasks list */}
                <div style={{ ...tasksStyle, marginBottom: 14 * S }}>
                  <div style={{
                    background: "rgba(0,0,0,0.55)",
                    border: `1px solid ${C.surfaceBorder}`,
                    borderRadius: 14 * S,
                    padding: `${14 * S}px ${20 * S}px`,
                  }}>
                    <div style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                      color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
                    }}>原本要資深員工花大量時間</div>
                    <div style={{
                      display: "flex", gap: 8 * S, flexWrap: "wrap" as const,
                    }}>
                      {["📊 投資簡報", "📋 KYC 審查", "📒 月底結帳"].map((t, i) => (
                        <span key={i} style={{
                          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                          color: C.text, background: C.primaryLight,
                          border: `1px solid ${C.primaryBorder}`,
                          borderRadius: 8 * S, padding: `${6 * S}px ${12 * S}px`,
                        }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* M365 card */}
            <div style={{ ...m365Style, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>MICROSOFT 365 整合</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.6,
                }}>
                  Excel · PowerPoint · Word · Outlook —
                  <span style={{ color: C.primary, fontWeight: 700 }}> 四個應用全部支援</span>
                </div>
              </div>
            </div>

            <div style={{ ...appsStyle, marginBottom: 14 * S }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                color: C.muted, lineHeight: 1.65, paddingLeft: 16 * S,
                borderLeft: `${3 * S}px solid ${C.primaryBorder}`,
              }}>
                跨應用的情境會自動帶著走
              </div>
            </div>

            {/* Cross-app highlight */}
            <div style={{ ...hlStyle }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: 700, lineHeight: 1.45,
                }}>
                  你在 Word 處理的合約，Claude 在 Outlook 寫信時已經知道背景
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            <div style={{ ...bBadgeStyle, marginBottom: 12 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.12em",
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
              }}>RESPONSIBILITY</span>
            </div>

            <h2 style={{
              ...bH2Style, margin: 0, marginBottom: 18 * S,
              fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900,
              fontSize: 26 * S, color: C.text, lineHeight: 1.25,
            }}>高責任流程，誰來簽名？</h2>

            {/* Insight card */}
            <div style={{ ...bInsightStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.65,
                }}>
                  金融業是對
                  <span style={{ color: C.primary, fontWeight: 700 }}>準確性與合規</span>
                  要求極高的行業 — AI 進入這裡，代表它開始接觸到真正
                  <span style={{ color: C.primary, fontWeight: 700 }}>高責任的流程</span>
                </div>
              </div>
            </div>

            {/* Warning card */}
            <div style={{ ...bWarnStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(255,209,102,0.1)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>⚠ 提醒</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, lineHeight: 1.45, fontWeight: 700,
                }}>簽名負責的人還是你</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.muted, lineHeight: 1.6, marginTop: 8 * S,
                }}>監督和驗證 AI 的責任，更不能省略</div>
              </div>
            </div>

            {/* Reflection */}
            <div style={{ ...bQStyle }}>
              <div style={{
                background: "rgba(0,0,0,0.55)",
                borderLeft: `${4 * S}px solid ${C.primary}`,
                borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
                padding: `${10 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.65, fontStyle: "italic" as const,
                }}>
                  你願意為 AI 的判斷負責嗎？怎麼確認它沒有出錯？
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations — TenAgentTemplates LEFT, M365Integration RIGHT */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <TenAgentTemplatesAnimation triggerLocalFrame={TEMPLATE_AT} />
        <M365IntegrationAnimation triggerLocalFrame={M365_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 算力大擴張 ────────────────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_08.scene3.to - SCENES_2026_05_08.scene3.from;
  // VTT-aligned local delays (local = global − 6487):
  //   0    → "第三件,算力大擴張" (216.24s)
  //   168  → "宣布對每用戶都很直接的事" (221.84s)
  //   315  → "速率限制翻倍"        (226.72s)
  //   518  → "尖峰降速取消"        (233.52s)
  //   641  → "Opus調高"            (237.6s)
  //   809  → "原本一小時兩倍"      (243.2s)
  //   1083 → "為什麼能突然做到"    (252.32s)
  //   1303 → "SpaceX簽署協議"      (259.68s)
  //   1414 → "Colossus 1全部算力"  (263.36s)
  //   1654 → "30萬瓦/22萬顆GPU"    (271.36s)
  //   1968 → "Amazon/Google/MS協議" (281.84s)
  //   2168 → "千億等級"            (288.48s)
  //   2232 → Phase B: "揭露很有意思的事" (290.64s)
  //   2311 → "AI工具變快了"        (293.28s)
  //   2465 → "公司基礎設施投資"    (298.4s)
  //   2652 → "算力是AI競爭核心"    (304.64s)
  //   2803 → "如果算力是AI石油"    (309.68s)
  //   2891 → "掌握最多算力的優勢"  (312.64s)
  //   3030 → "集中化趨勢擔心"      (317.28s)
  //   3144 → end (321.04s)

  const BADGE_AT     = 0;
  const H2_AT        = 0;
  const LIMIT_AT     = 315;
  const BENEFIT_AT   = 809;
  const REASON_AT    = 1083;
  const SPACEX_AT    = 1303;
  const COMPANIES_AT = 1968;

  // Phase A→B at 290.64s = local 2232
  const A_FADE_START = 2152;
  const A_REMOVE     = 2232;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B
  const B_SHOW_AT     = 2232;
  const B_INFRA_AT    = 2465;
  const B_OIL_AT      = 2803;
  const B_QUESTION_AT = 2891;
  const showB         = frame >= B_SHOW_AT;

  // Element fade-out for Phase A: fade limit/benefit/reason cards as SpaceX/Companies appear
  // SPACEX_AT = 1303. Fade early cards by then to keep height in bounds.
  const EARLY_FADE_START = SPACEX_AT - 120;
  const EARLY_REMOVE     = SPACEX_AT - 10;
  const showEarly        = frame < EARLY_REMOVE;
  const earlyOpacity     = frame > EARLY_FADE_START
    ? interpolate(frame, [EARLY_FADE_START, EARLY_REMOVE], [1, 0], clamp) : 1;

  const badgeStyle      = useFadeUp(BADGE_AT);
  const h2Style         = useFadeUp(H2_AT + 20);
  const limitStyle      = useFadeUp(LIMIT_AT);
  const benefitStyle    = useFadeUp(BENEFIT_AT);
  const reasonStyle     = useFadeUp(REASON_AT);
  const spacexStyle     = useFadeUp(SPACEX_AT);
  const companiesStyle  = useFadeUp(COMPANIES_AT);

  const bBadgeStyle     = useFadeUp(showB ? B_SHOW_AT : 999999);
  const bH2Style        = useFadeUp(showB ? B_SHOW_AT + 14 : 999999);
  const bInfraStyle     = useFadeUp(showB ? B_INFRA_AT : 999999);
  const bOilStyle       = useFadeUp(showB ? B_OIL_AT : 999999);
  const bQStyle         = useFadeUp(showB ? B_QUESTION_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...badgeStyle, marginBottom: 12 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.12em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
              }}>INFRA · COMPUTE EXPANSION</span>
            </div>

            <h2 style={{
              ...h2Style, margin: 0, marginBottom: 18 * S,
              fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900,
              fontSize: 26 * S, color: C.text, lineHeight: 1.25,
            }}>速率限制翻倍，背後是巨大算力擴張</h2>

            {/* Early cards (limit + benefit + reason) — fade out before SpaceX */}
            {showEarly && (
              <div style={{ opacity: earlyOpacity }}>
                {/* Rate limit doubling card */}
                <div style={{ ...limitStyle, marginBottom: 14 * S }}>
                  <div style={{
                    background: C.surface,
                    border: `1px solid ${C.primaryBorder}`,
                    borderRadius: 14 * S,
                    padding: `${14 * S}px ${20 * S}px`,
                  }}>
                    <div style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                      color: C.primary, letterSpacing: "0.08em", marginBottom: 10 * S,
                    }}>RATE LIMITS · ×2</div>
                    <div style={{
                      display: "flex", gap: 8 * S, flexWrap: "wrap" as const,
                    }}>
                      {["Pro", "Max", "Team", "Enterprise"].map((p, i) => (
                        <span key={i} style={{
                          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                          color: C.primary, background: C.primaryLight,
                          border: `1px solid ${C.primaryBorder}`,
                          borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                        }}>{p}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Benefit highlight */}
                <div style={{ ...benefitStyle, marginBottom: 14 * S }}>
                  <div style={{
                    background: C.primaryLight,
                    border: `1.5px solid ${C.primary}`,
                    borderRadius: 12 * S,
                    padding: `${14 * S}px ${20 * S}px`,
                    boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.1)`,
                  }}>
                    <div style={{
                      fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                      color: C.primary, fontWeight: 700, lineHeight: 1.45,
                    }}>原本一小時能問的次數，現在可以問兩倍</div>
                  </div>
                </div>

                {/* Reason transition */}
                <div style={{ ...reasonStyle }}>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                    color: C.muted, lineHeight: 1.65, paddingLeft: 16 * S,
                    borderLeft: `${3 * S}px solid ${C.primaryBorder}`,
                  }}>
                    為什麼能突然做到？背後是同步公布的算力大擴張
                  </div>
                </div>
              </div>
            )}

            {/* SpaceX deal card */}
            <div style={{ ...spacexStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>SPACEX × ANTHROPIC</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: 700, lineHeight: 1.4,
                }}>
                  取得 Colossus 1 資料中心
                  <span style={{ color: C.primary }}> 全部算力</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.muted, lineHeight: 1.6, marginTop: 8 * S,
                }}>
                  220,000+ NVIDIA GPU ／ 30 萬瓦容量 ／ 一個月內上線
                </div>
              </div>
            </div>

            {/* Other companies tags */}
            <div style={{ ...companiesStyle }}>
              <div style={{
                background: "rgba(0,0,0,0.55)",
                border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>同期落地的算力協議</div>
                <div style={{
                  display: "flex", gap: 8 * S, flexWrap: "wrap" as const,
                }}>
                  {["Amazon", "Google", "Microsoft"].map((c, i) => (
                    <span key={i} style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
                      color: C.text, background: "rgba(255,255,255,0.06)",
                      border: `1px solid rgba(255,255,255,0.14)`,
                      borderRadius: 8 * S, padding: `${6 * S}px ${12 * S}px`,
                      fontWeight: 700,
                    }}>{c}</span>
                  ))}
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
                    color: C.yellow, background: C.yellowLight,
                    border: `1px solid ${C.yellowBorder}`,
                    borderRadius: 8 * S, padding: `${6 * S}px ${12 * S}px`,
                    fontWeight: 700,
                  }}>千億級規模</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            <div style={{ ...bBadgeStyle, marginBottom: 12 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.12em",
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
              }}>WHY IT MATTERS</span>
            </div>

            <h2 style={{
              ...bH2Style, margin: 0, marginBottom: 18 * S,
              fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900,
              fontSize: 26 * S, color: C.text, lineHeight: 1.25,
            }}>算力，已是 AI 競爭核心戰場</h2>

            {/* Infra insight card */}
            <div style={{ ...bInfraStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.65,
                }}>
                  我們在
                  <span style={{ color: C.primary, fontWeight: 700 }}>前端感受到的「變快了、限制放寬了」</span>
                  ，背後是公司在
                  <span style={{ color: C.primary, fontWeight: 700 }}>基礎設施層面</span>
                  非常巨大的投資在支撐
                </div>
              </div>
            </div>

            {/* Oil metaphor highlight */}
            <div style={{ ...bOilStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 14 * S,
                padding: `${18 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(255,209,102,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>METAPHOR</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                  color: C.text, fontWeight: 700, lineHeight: 1.4,
                }}>
                  算力，是 AI 時代的
                  <span style={{ color: C.yellow }}>「石油」</span>
                </div>
              </div>
            </div>

            {/* Reflection question */}
            <div style={{ ...bQStyle }}>
              <div style={{
                background: "rgba(0,0,0,0.55)",
                borderLeft: `${4 * S}px solid ${C.primary}`,
                borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
                padding: `${10 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.65, fontStyle: "italic" as const,
                }}>
                  掌握最多算力的公司，未來會有什麼樣的優勢？這個集中化的趨勢，讓你擔心嗎？
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <GPUStackAnimation triggerLocalFrame={1654} />
        <OilMetaphorAnimation triggerLocalFrame={2803} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene ────────────────────────────────────────────────────────────
function SummaryCard({ number, title, body, delay, color, border }: {
  number: string; title: string; body: string;
  delay: number; color: string; border: string;
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
          fontFamily: "'Space Mono', monospace", fontSize: 24 * S,
          color, fontWeight: 700, flexShrink: 0, marginTop: 2 * S,
          textShadow: `0 0 ${10 * S}px ${color}88`,
        }}>{number}</div>
        <div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
            color: C.text, fontWeight: 700, lineHeight: 1.3, marginBottom: 6 * S,
          }}>{title}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
            color: C.muted, lineHeight: 1.55,
          }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_05_08.summary.to - SCENES_2026_05_08.summary.from;
  // VTT-aligned local delays (local = global − 9631):
  //   0    → "好,快速整理本週三件大事" (321.04s)
  //   100  → "第一,Claude做夢功能"   (324.4s)
  //   439  → "第二,Claude進軍金融M365" (335.68s)
  //   686  → "第三,Anthropic算力大擴張" (343.92s)
  //   1231 → "這裡是每日AI知識庫"     (362.08s)

  const BADGE_AT  = 0;
  const CARD1_AT  = 100;
  const CARD2_AT  = 439;
  const CARD3_AT  = 686;
  const OUTRO_AT  = 1231;

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
            <WordReveal text="本週重點整理" startFrame={4} staggerPerWord={5}
              fontSize={18 * S} color={C.primary}
              fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
          </span>
        </div>

        <SummaryCard
          number="01" delay={CARD1_AT}
          title="Claude 做夢功能"
          body="AI 開始有跨對話的記憶，長期協作成為可能 — 但隱私和記憶管理的問題也跟著來了"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="02" delay={CARD2_AT}
          title="進軍金融 + Microsoft 365 整合"
          body="AI 代理開始接管高責任的專業流程 — 使用者的監督責任更重要了，不能完全放手"
          color={C.yellow} border={C.yellow}
        />
        <SummaryCard
          number="03" delay={CARD3_AT}
          title="Anthropic 算力大擴張"
          body="速率限制翻倍背後是 SpaceX、Amazon、Google、Microsoft 的千億算力投資 — 算力已是 AI 競爭核心戰場"
          color={C.blue} border={C.blue}
        />

        {/* Outro */}
        <div style={{ ...outroStyle, marginTop: 12 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em", textAlign: "center" as const,
          }}>每日 AI 知識庫 · 掰掰</div>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Composition ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export function VideoComposition_2026_05_08() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_08.scene1;
  const S2 = SCENES_2026_05_08.scene2;
  const S3 = SCENES_2026_05_08.scene3;
  const SU = SCENES_2026_05_08.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-05-08-processed.wav")} volume={1.0} />
      <Audio src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_05_08 - 150, TOTAL_FRAMES_2026_05_08], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return Math.min(fi, fo);
        }}
        loop />

      <Background />

      {/* TitleScene */}
      <Sequence from={0} durationInFrames={S1.from}>
        <TitleScene />
      </Sequence>

      {/* Scene 1 — Claude 做夢 */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — 金融 + M365 */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — 算力大擴張 */}
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
