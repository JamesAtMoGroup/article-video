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
  yellowBorder:  "rgba(255,209,102,0.2)",
  red:           "#ff6b6b",
  redLight:      "rgba(255,107,107,0.08)",
  redBorder:     "rgba(255,107,107,0.2)",
  blue:          "#74b9ff",
  blueLight:     "rgba(116,185,255,0.1)",
  blueBorder:    "rgba(116,185,255,0.25)",
  purple:        "#b794f6",
  purpleLight:   "rgba(183,148,246,0.1)",
  purpleBorder:  "rgba(183,148,246,0.25)",
} as const;

// Brand colors per AI
type AISpec = { color: string; label: string; border: string; light: string };
const AI: { claude: AISpec; gpt: AISpec; gemini: AISpec } = {
  claude: { color: C.primary, label: "Claude",  border: C.primaryBorder, light: C.primaryLight },
  gpt:    { color: C.blue,    label: "GPT",     border: C.blueBorder,    light: C.blueLight },
  gemini: { color: C.yellow,  label: "Gemini",  border: C.yellowBorder,  light: C.yellowLight },
};

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W       = 400 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLOT    = 200 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// TitleScene:   0s    – 30.6s   → 0–918
// Scene1:       30.6s – 112.8s  → 918–3384   (三個助理個性)
// Scene2:       112.8s– 175.2s  → 3384–5256  (選錯工具事倍功半)
// Scene3:       175.2s– 229.2s  → 5256–6876  (快速選擇邏輯)
// Summary:      229.2s– 260s    → 6876–7800
export const SCENES_2026_05_11 = {
  title:   { from: 0,    to: 918  },
  scene1:  { from: 918,  to: 3384 },
  scene2:  { from: 3384, to: 5256 },
  scene3:  { from: 5256, to: 6876 },
  summary: { from: 6876, to: 7800 },
} as const;
export const TOTAL_FRAMES_2026_05_11 = 7800;

const CHAPTERS = [
  { label: "今日焦點",         start: 0    },
  { label: "三個 AI 的個性",   start: 918  },
  { label: "選錯工具事倍功半", start: 3384 },
  { label: "快速選擇邏輯",     start: 5256 },
  { label: "重點整理",         start: 6876 },
] as const;

// ── iMessage callouts (global frames, VTT-aligned) ────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // 01:47.0 – 01:52.8 → 3210–3384
  { from: 3210, to: 3384, sender: "想一想",
    text: "你目前最常用哪一個？是有意識地選擇，還是只是習慣？" },
  // 02:48.0 – 02:55.2 → 5040–5256
  { from: 5040, to: 5256, sender: "親身經歷",
    text: "你工作中最常需要 AI 的那類任務，現在用的工具真的是最適合的嗎？" },
  // 03:43.2 – 03:49.2 → 6696–6876
  { from: 6696, to: 6876, sender: "推薦一下",
    text: "如果你要推薦一個 AI 工具，你會推薦哪個？理由是什麼？" },
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
        background: "radial-gradient(circle, rgba(116,185,255,0.05) 0%, transparent 70%)",
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
        padding: `${8 * S}px ${32 * S}px`,
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
      padding: `${14 * S}px ${18 * S}px`,
      boxShadow: `0 ${8 * S}px ${24 * S}px rgba(0,0,0,0.6)`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 8 * S,
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

// 1. ThreeLogosVsAnimation — TitleScene, triggerFrame=216, DURATION=702
// Visual metaphor: 3 AI brains with ❓ between them — "What's different?"
function ThreeLogosVsAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 702;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const logos = [
    { ai: AI.claude, emoji: "🧠", delay: 0 },
    { ai: AI.gpt,    emoji: "🧠", delay: 24 },
    { ai: AI.gemini, emoji: "🧠", delay: 48 },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14 * S,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
        {logos.map((l, i) => {
          const itemF = Math.max(0, f - l.delay);
          const sc = easeOutBack(prog(itemF, 22));
          const itemOp = interpolate(itemF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const pulse = Math.sin((f - l.delay) * 0.05) * 0.06 + 1;
          return (
            <React.Fragment key={i}>
              <div style={{
                opacity: itemOp,
                transform: `scale(${sc * pulse})`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
              }}>
                <div style={{
                  width: 80 * S, height: 80 * S, borderRadius: "50%",
                  background: l.ai.light,
                  border: `${2 * S}px solid ${l.ai.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 38 * S,
                  boxShadow: `0 0 ${24 * S}px ${l.ai.color}55`,
                }}>{l.emoji}</div>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: l.ai.color, fontWeight: "700", letterSpacing: "0.04em",
                  textShadow: `0 0 ${10 * S}px ${l.ai.color}88`,
                }}>{l.ai.label}</div>
              </div>
              {i < logos.length - 1 && (
                <div style={{
                  opacity: interpolate(Math.max(0, f - l.delay - 12), [0, 16], [0, 0.85], { easing: E.outCubic, extrapolateRight: "clamp" }),
                  fontFamily: "'Space Mono', monospace", fontSize: 32 * S, color: C.muted,
                  marginBottom: 24 * S,
                }}>?</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// 2. ClaudeBalanceAnimation — Scene1 local=324, DURATION=654
// Visual metaphor: balance scale — "誠實" heavy/down, "硬掰" light/up
function ClaudeBalanceAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 654;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // tilt: 0 (flat) → 10 deg (honest side drops)
  const tilt = interpolate(f, [20, 80], [0, 10], { easing: E.outExpo, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOp = interpolate(Math.max(0, f - 70), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S,
      width: 260 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: AI.claude.color, letterSpacing: "0.08em",
        textShadow: `0 0 ${8 * S}px ${AI.claude.color}77`,
      }}>{AI.claude.label} · 誠實態度</div>

      {/* Balance scale */}
      <div style={{ position: "relative", width: 220 * S, height: 140 * S }}>
        {/* Beam */}
        <div style={{
          position: "absolute", top: 38 * S, left: "50%",
          width: 200 * S, height: 6 * S,
          background: `linear-gradient(to right, ${C.primary}, ${C.primary})`,
          borderRadius: 3 * S,
          transform: `translateX(-50%) rotate(${tilt}deg)`,
          transformOrigin: "center",
          boxShadow: `0 0 ${10 * S}px ${C.primary}66`,
        }} />
        {/* Pivot */}
        <div style={{
          position: "absolute", top: 38 * S, left: "50%",
          width: 10 * S, height: 10 * S, borderRadius: "50%",
          background: C.primary, transform: "translate(-50%,-50%)",
          boxShadow: `0 0 ${12 * S}px ${C.primary}`,
        }} />
        {/* Left pan — heavy (誠實) */}
        <div style={{
          position: "absolute", top: 38 * S, left: 14 * S,
          transform: `translateY(${tilt * 4}px)`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
        }}>
          <div style={{ width: 2 * S, height: 24 * S, background: C.primary }} />
          <div style={{
            padding: `${6 * S}px ${10 * S}px`,
            background: C.primaryLight,
            border: `${2 * S}px solid ${C.primary}`,
            borderRadius: 10 * S,
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.primary, fontWeight: "700",
            boxShadow: `0 0 ${14 * S}px ${C.primary}55`,
            whiteSpace: "nowrap" as const,
          }}>我不確定</div>
        </div>
        {/* Right pan — light (硬掰) */}
        <div style={{
          position: "absolute", top: 38 * S, right: 14 * S,
          transform: `translateY(${-tilt * 4}px)`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
        }}>
          <div style={{ width: 2 * S, height: 24 * S, background: C.muted }} />
          <div style={{
            padding: `${6 * S}px ${10 * S}px`,
            background: "rgba(255,255,255,0.06)",
            border: `1px solid rgba(255,255,255,0.15)`,
            borderRadius: 10 * S,
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.muted, fontWeight: "400",
            whiteSpace: "nowrap" as const,
            textDecoration: "line-through",
          }}>硬掰</div>
        </div>
      </div>

      <div style={{
        opacity: labelOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text, textAlign: "center" as const, lineHeight: 1.5,
        background: "rgba(0,0,0,0.5)",
        border: `1px solid ${AI.claude.border}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${12 * S}px`,
      }}>長文閱讀 · 深度推理 · 穩健</div>
    </div>
  );
}

// 3. GPTPluginEcosystemAnimation — Scene1 local=1068, DURATION=630
// Visual metaphor: center GPT with radiating plugin icons — ecosystem breadth
function GPTPluginEcosystemAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 630;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const plugins = [
    { emoji: "🔌", angle: 0 },
    { emoji: "📊", angle: 51 },
    { emoji: "🎨", angle: 102 },
    { emoji: "💻", angle: 153 },
    { emoji: "🎵", angle: 205 },
    { emoji: "📅", angle: 256 },
    { emoji: "🌐", angle: 308 },
  ];

  const centerScale = easeOutBack(prog(f, 20));
  const labelOp = interpolate(Math.max(0, f - 140), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: AI.gpt.color, letterSpacing: "0.08em",
        textShadow: `0 0 ${8 * S}px ${AI.gpt.color}77`,
      }}>{AI.gpt.label} · 生態系最廣</div>

      <div style={{ position: "relative", width: 220 * S, height: 220 * S }}>
        {/* Plugins radiating outward */}
        {plugins.map((p, i) => {
          const pDelay = 30 + i * 12;
          const pF = Math.max(0, f - pDelay);
          const r = interpolate(pF, [0, 30], [0, 90 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
          const pOp = interpolate(pF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const rad = (p.angle * Math.PI) / 180;
          const cx = 110 * S + Math.cos(rad) * r;
          const cy = 110 * S + Math.sin(rad) * r;
          return (
            <div key={i} style={{
              position: "absolute",
              left: cx - 22 * S, top: cy - 22 * S,
              width: 44 * S, height: 44 * S, borderRadius: "50%",
              background: AI.gpt.light,
              border: `${1.5 * S}px solid ${AI.gpt.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22 * S,
              opacity: pOp,
              boxShadow: `0 0 ${10 * S}px ${AI.gpt.color}44`,
            }}>{p.emoji}</div>
          );
        })}
        {/* Center GPT */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%,-50%) scale(${centerScale})`,
          width: 84 * S, height: 84 * S, borderRadius: "50%",
          background: AI.gpt.light,
          border: `${2 * S}px solid ${AI.gpt.color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
          color: AI.gpt.color, fontWeight: "700",
          boxShadow: `0 0 ${22 * S}px ${AI.gpt.color}66`,
          textShadow: `0 0 ${10 * S}px ${AI.gpt.color}88`,
        }}>GPT</div>
      </div>

      <div style={{
        opacity: labelOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text, textAlign: "center" as const,
        background: "rgba(0,0,0,0.5)",
        border: `1px solid ${AI.gpt.border}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${12 * S}px`,
      }}>外掛 · API · 業界最廣</div>
    </div>
  );
}

// 4. GeminiGoogleHubAnimation — Scene1 local=1698, DURATION=684
// Visual metaphor: Gemini at center with Google services connected via lines
function GeminiGoogleHubAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 684;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const services = [
    { icon: "📧", label: "Gmail",  delay: 30 },
    { icon: "📄", label: "Docs",   delay: 70 },
    { icon: "🔍", label: "Search", delay: 110 },
    { icon: "📁", label: "Drive",  delay: 150 },
  ];

  const centerScale = easeOutBack(prog(f, 20));

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      width: 260 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: AI.gemini.color, letterSpacing: "0.08em",
        textShadow: `0 0 ${8 * S}px ${AI.gemini.color}77`,
      }}>{AI.gemini.label} · Google 整合</div>

      {/* Center Gemini */}
      <div style={{
        width: 80 * S, height: 80 * S, borderRadius: "50%",
        background: AI.gemini.light,
        border: `${2 * S}px solid ${AI.gemini.color}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: AI.gemini.color, fontWeight: "700",
        transform: `scale(${centerScale})`,
        boxShadow: `0 0 ${22 * S}px ${AI.gemini.color}66`,
        textShadow: `0 0 ${10 * S}px ${AI.gemini.color}88`,
      }}>Gemini</div>

      {/* Connector lines + service grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10 * S, width: "100%",
      }}>
        {services.map((s, i) => {
          const sF = Math.max(0, f - s.delay);
          const sOp = interpolate(sF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const sTy = interpolate(sF, [0, 20], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: sOp,
              transform: `translateY(${sTy}px)`,
              display: "flex", alignItems: "center", gap: 8 * S,
              padding: `${8 * S}px ${10 * S}px`,
              background: "rgba(0,0,0,0.6)",
              border: `1px solid ${AI.gemini.border}`,
              borderRadius: 8 * S,
            }}>
              <span style={{ fontSize: 22 * S }}>{s.icon}</span>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.text,
              }}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 5. TaskRouterAnimation — Scene2 local=192, DURATION=1284
// Visual metaphor: 3 tasks each routing to the right AI
function TaskRouterAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1284;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT-aligned appearance:
  // 119.2s 合約 → f=0
  // 136.4s 點子 → f=(136.4-119.2)*30=516
  // 147.0s 新聞 → f=(147-119.2)*30=834
  const tasks = [
    { emoji: "📋", task: "50 頁合約", ai: AI.claude, appearsAt: 0 },
    { emoji: "💡", task: "腦力激盪", ai: AI.gpt,    appearsAt: 516 },
    { emoji: "📰", task: "新聞 / Gmail", ai: AI.gemini, appearsAt: 834 },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 18 * S,
      width: 260 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em", textAlign: "right" as const,
      }}>任務 → 對的工具</div>

      {tasks.map((t, i) => {
        const itemF = Math.max(0, f - t.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [32 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const arrowW = interpolate(Math.max(0, itemF - 18), [0, 22], [0, 28 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
        const aiOp = interpolate(Math.max(0, itemF - 32), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const aiScale = easeOutBack(Math.min(Math.max(0, itemF - 32) / 22, 1));
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateX(${itemTx}px)`,
            display: "flex", alignItems: "center", gap: 8 * S,
          }}>
            {/* Task chip */}
            <div style={{
              flex: 1,
              display: "flex", alignItems: "center", gap: 8 * S,
              padding: `${10 * S}px ${12 * S}px`,
              background: "rgba(0,0,0,0.7)",
              border: `1px solid rgba(255,255,255,0.18)`,
              borderRadius: 10 * S,
            }}>
              <span style={{ fontSize: 22 * S }}>{t.emoji}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.text,
              }}>{t.task}</span>
            </div>
            {/* Arrow */}
            <div style={{
              width: arrowW, height: 3 * S,
              background: `linear-gradient(to right, transparent, ${t.ai.color})`,
              borderRadius: 2 * S,
              boxShadow: `0 0 ${6 * S}px ${t.ai.color}66`,
              flexShrink: 0,
            }} />
            {/* AI badge */}
            <div style={{
              opacity: aiOp,
              transform: `scale(${aiScale})`,
              padding: `${8 * S}px ${10 * S}px`,
              background: t.ai.light,
              border: `${2 * S}px solid ${t.ai.color}`,
              borderRadius: 10 * S,
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: t.ai.color, fontWeight: "700",
              boxShadow: `0 0 ${12 * S}px ${t.ai.color}55`,
              textShadow: `0 0 ${6 * S}px ${t.ai.color}88`,
              flexShrink: 0,
            }}>{t.ai.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// 6. DecisionTreeAnimation — Scene3 local=96, DURATION=546
// Visual metaphor: decision tree fan-out — 3 task types branch to 3 AIs
function DecisionTreeAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 546;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT: 178.4 / 183.6 / 189.6
  const branches = [
    { keyword: "長文件",   ai: AI.claude, appearsAt: 0   },
    { keyword: "創意",     ai: AI.gpt,    appearsAt: 156 },
    { keyword: "即時資訊", ai: AI.gemini, appearsAt: 336 },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 260 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em",
        textAlign: "right" as const, marginBottom: 14 * S,
      }}>快速決策</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 * S }}>
        {branches.map((b, i) => {
          const itemF = Math.max(0, f - b.appearsAt);
          const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemTy = interpolate(itemF, [0, 22], [22 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: itemOp,
              transform: `translateY(${itemTy}px)`,
              display: "flex", alignItems: "center", gap: 10 * S,
              padding: `${10 * S}px ${14 * S}px`,
              background: "rgba(0,0,0,0.7)",
              borderLeft: `${4 * S}px solid ${b.ai.color}`,
              border: `1px solid ${b.ai.border}`,
              borderRadius: 10 * S,
              boxShadow: `0 0 ${14 * S}px ${b.ai.color}22`,
            }}>
              <div style={{
                flex: 1,
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.text,
              }}>{b.keyword}</div>
              <div style={{ color: b.ai.color, fontSize: 22 * S }}>→</div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: b.ai.color, fontWeight: "700",
                textShadow: `0 0 ${6 * S}px ${b.ai.color}88`,
              }}>{b.ai.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 7. CrossCheckAnimation — Scene3 local=552, DURATION=570
// Visual metaphor: two AIs cross-checking — same question, compared answers
function CrossCheckAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 570;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const aOp = interpolate(f, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const aSc = easeOutBack(prog(f, 22));
  const bOp = interpolate(Math.max(0, f - 30), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const bSc = easeOutBack(Math.min(Math.max(0, f - 30) / 22, 1));
  const lineW = interpolate(Math.max(0, f - 70), [0, 30], [0, 60 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const checkOp = interpolate(Math.max(0, f - 110), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const checkSc = easeOutBack(Math.min(Math.max(0, f - 110) / 22, 1));

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 260 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.08em",
        textShadow: `0 0 ${8 * S}px ${C.primary}66`,
      }}>交叉比對</div>

      {/* Same question */}
      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.muted,
        padding: `${6 * S}px ${12 * S}px`,
        background: "rgba(0,0,0,0.5)",
        border: `1px solid rgba(255,255,255,0.12)`,
        borderRadius: 8 * S,
      }}>同一個問題 ?</div>

      {/* Two AIs side by side */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
        <div style={{
          opacity: aOp, transform: `scale(${aSc})`,
          padding: `${8 * S}px ${12 * S}px`,
          background: AI.claude.light,
          border: `${2 * S}px solid ${AI.claude.color}`,
          borderRadius: 10 * S,
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: AI.claude.color, fontWeight: "700",
          boxShadow: `0 0 ${14 * S}px ${AI.claude.color}55`,
        }}>Claude</div>
        <div style={{
          width: lineW, height: 3 * S,
          background: `linear-gradient(to right, ${AI.claude.color}, ${AI.gpt.color})`,
          borderRadius: 2 * S,
          boxShadow: `0 0 ${6 * S}px ${C.primary}55`,
        }} />
        <div style={{
          opacity: bOp, transform: `scale(${bSc})`,
          padding: `${8 * S}px ${12 * S}px`,
          background: AI.gpt.light,
          border: `${2 * S}px solid ${AI.gpt.color}`,
          borderRadius: 10 * S,
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: AI.gpt.color, fontWeight: "700",
          boxShadow: `0 0 ${14 * S}px ${AI.gpt.color}55`,
        }}>GPT</div>
      </div>

      {/* Better answer check */}
      <div style={{
        opacity: checkOp, transform: `scale(${checkSc})`,
        display: "flex", alignItems: "center", gap: 8 * S,
        padding: `${8 * S}px ${14 * S}px`,
        background: C.primaryLight,
        border: `${2 * S}px solid ${C.primary}`,
        borderRadius: 10 * S,
        boxShadow: `0 0 ${18 * S}px ${C.primary}44`,
      }}>
        <span style={{ fontSize: 22 * S, color: C.primary }}>✓</span>
        <span style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.primary, fontWeight: "700",
        }}>更可靠的判斷</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_05_11.title.to - SCENES_2026_05_11.title.from;
  const badgeOp     = useFadeIn(5);
  const subtitleStyle = useFadeUp(60);
  const tagStyle      = useFadeUp(82);

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
          fontWeight: 900, fontSize: 42 * S, color: C.text,
        }}>
          <WordReveal text="Claude、GPT、Gemini" startFrame={10} staggerPerWord={6}
            fontSize={42 * S} color={C.text}
            fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 — neon green accent */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 32 * S, color: C.primary,
        }}>
          <WordReveal text="到底差在哪" startFrame={32} staggerPerWord={6}
            fontSize={32 * S} color={C.primary}
            fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle,
          marginTop: 22 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
          maxWidth: 800 * S,
        }}>
          三個助理的設計哲學不同 — 選對工具，才能少走冤枉路
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 18 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>Claude · GPT · Gemini · 工具選擇</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation — entry at "Claude, GPT, Gemini 到底差在哪" 7.2s */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ThreeLogosVsAnimation triggerFrame={216} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene 1 — 三個助理各自個性 ────────────────────────────────────────────
// Cards appear when speaker introduces each AI
function PersonalityCard({ ai, lead, body, examples, delay }: {
  ai: AISpec; lead: string; body: string; examples: string; delay: number;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div style={{
        background: ai.light,
        border: `1.5px solid ${ai.color}`,
        borderLeft: `${5 * S}px solid ${ai.color}`,
        borderRadius: 14 * S,
        padding: `${16 * S}px ${22 * S}px`,
        boxShadow: `0 0 ${24 * S}px ${ai.color}1f`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 10 * S,
        }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
            color: ai.color, fontWeight: "700", letterSpacing: "0.04em",
            textShadow: `0 0 ${10 * S}px ${ai.color}66`,
          }}>{ai.label}</span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.06em",
          }}>· {lead}</span>
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.text, lineHeight: 1.55, marginBottom: 8 * S,
        }}>{body}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, lineHeight: 1.55,
        }}>{examples}</div>
      </div>
    </div>
  );
}

function Scene1() {
  const dur = SCENES_2026_05_11.scene1.to - SCENES_2026_05_11.scene1.from;
  // VTT-based delays (local = global - 918, scene starts at 30.6s):
  // Header at 0
  // Claude card at 34.4s   → local 114
  // GPT card at 60.2s      → local 888
  // Gemini card at 84.2s   → local 1608
  // Reflection question at 107s → local 2502

  const HEADER_AT     = 0;
  const CLAUDE_AT     = 114;
  const GPT_AT        = 888;
  const GEMINI_AT     = 1608;
  const QUESTION_AT   = 2502;

  // Concept animations
  const CLAUDE_ANIM_AT = 324;   // 41.4s → local 324
  const GPT_ANIM_AT    = 1068;  // 66.2s → local 1068
  const GEMINI_ANIM_AT = 1698;  // 87.2s → local 1698

  const headerStyle   = useFadeUp(HEADER_AT);
  const questionStyle = useFadeUp(QUESTION_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        <div style={{ ...headerStyle, marginBottom: 18 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
          }}>三個助理的個性</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
            color: C.text, fontWeight: "700", lineHeight: 1.3,
          }}>設計哲學不同 — 擅長的事情也不同</div>
        </div>

        <PersonalityCard
          ai={AI.claude}
          lead="安全 / 誠實 / 可靠"
          body="不確定時會說「我不確定」，而不是硬掰一個聽起來有信心的答案。"
          examples="擅長：長文閱讀、深度分析、複雜推理"
          delay={CLAUDE_AT}
        />
        <PersonalityCard
          ai={AI.gpt}
          lead="生態系最廣"
          body="最早普及的 AI 助理。外掛、API、第三方功能業界最廣。"
          examples="擅長：創意寫作、指令跟隨、找現成 GPT 工具"
          delay={GPT_AT}
        />
        <PersonalityCard
          ai={AI.gemini}
          lead="Google 深度整合"
          body="Gmail、Google 文件、Google 搜尋都能直接串接。"
          examples="擅長：即時資訊搜尋、Google 生態系工作"
          delay={GEMINI_AT}
        />

        {/* Reflection question card — VTT 107s */}
        <div style={{ ...questionStyle, marginTop: 8 * S }}>
          <div style={{
            background: "rgba(0,0,0,0.5)",
            border: `1px solid rgba(255,255,255,0.1)`,
            borderRadius: 12 * S,
            padding: `${14 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>想一想</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
              color: C.text, lineHeight: 1.55, fontWeight: "700",
            }}>你目前最常用哪一個？是有意識地選擇，還是只是習慣？</div>
          </div>
        </div>
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ClaudeBalanceAnimation triggerLocalFrame={CLAUDE_ANIM_AT} />
        <GPTPluginEcosystemAnimation triggerLocalFrame={GPT_ANIM_AT} />
        <GeminiGoogleHubAnimation triggerLocalFrame={GEMINI_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene 2 — 選錯工具事倍功半 ────────────────────────────────────────────
// Phase A: 3 example use-cases (合約/點子/Gmail) → A_FADE_START at Phase B
// Phase B: "在對的時機選對工具" + reflection question
function ExampleCard({ ai, task, why, delay }: {
  ai: AISpec; task: string; why: string; delay: number;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        background: "rgba(0,0,0,0.5)",
        border: `1px solid ${ai.border}`,
        borderLeft: `${5 * S}px solid ${ai.color}`,
        borderRadius: 12 * S,
        padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 8 * S,
        }}>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
            color: C.text, fontWeight: "700",
          }}>{task}</span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: ai.color, letterSpacing: "0.04em",
            background: ai.light, border: `1px solid ${ai.color}`,
            borderRadius: 6 * S, padding: `${3 * S}px ${10 * S}px`,
            textShadow: `0 0 ${6 * S}px ${ai.color}77`,
          }}>{ai.label}</span>
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, lineHeight: 1.55,
        }}>{why}</div>
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_11.scene2.to - SCENES_2026_05_11.scene2.from;
  // scene2 starts at 112.8s = global 3384 (local = global - 3384)
  // Phase A:
  //   Header at 0
  //   Quote "選錯工具事倍功半" at 115.4s → local 78
  //   Example Claude/合約 at 119.2s → local 192
  //   Example GPT/點子 at 136.4s → local 708
  //   Example Gemini/Gmail at 147s → local 1026
  //   Wrap-up "在對的時機選對工具" at 159s → local 1386
  // Phase B starts at reflection question 168s → local 1656

  const HEADER_AT  = 0;
  const QUOTE_AT   = 78;
  const EX1_AT     = 192;
  const EX2_AT     = 708;
  const EX3_AT     = 1026;
  const WRAP_AT    = 1386;

  // Phase B first sentence VTT 168s → local 1656
  const A_FADE_START = 1576;        // 1656 - 80
  const A_REMOVE     = 1656;
  const B_SHOW_AT    = 1656;
  const QUESTION_AT  = B_SHOW_AT;   // = 1656

  const showA  = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  const headerStyle = useFadeUp(HEADER_AT);
  const quoteStyle  = useFadeUp(QUOTE_AT);
  const wrapStyle   = useFadeIn(WRAP_AT);
  const questionStyle = useFadeUp(showB ? QUESTION_AT : 999999);

  // Concept animation
  const TASK_ROUTER_AT = 192;

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 16 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
              }}>為什麼要在意</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "700", lineHeight: 1.3,
              }}>選錯工具，事倍功半</div>
            </div>

            <div style={{ ...quoteStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${12 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${20 * S}px ${C.primary}1a`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.primary, fontWeight: "700", lineHeight: 1.4,
                }}>了解強項，才能在對的任務用對的 AI</div>
              </div>
            </div>

            <ExampleCard
              ai={AI.claude} task="📋 50 頁合約找風險"
              why="需要長文本理解、謹慎推理、不確定時誠實說「不確定」"
              delay={EX1_AT}
            />
            <ExampleCard
              ai={AI.gpt} task="💡 行銷活動腦力激盪"
              why="需要大量有趣的點子、快速切換風格"
              delay={EX2_AT}
            />
            <ExampleCard
              ai={AI.gemini} task="📰 新聞最新進展 / Gmail 整理"
              why="需要即時搜尋、Google 服務直接整合"
              delay={EX3_AT}
            />

            <div style={{
              ...wrapStyle,
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.muted, lineHeight: 1.6, marginTop: 6 * S,
            }}>
              不是哪個更好 — 而是「對的時機選對工具」。
            </div>
          </div>
        )}

        {showB && (
          <div style={{ ...questionStyle }}>
            <div style={{
              background: C.surface,
              border: `1.5px solid ${C.primary}`,
              borderRadius: 14 * S,
              padding: `${18 * S}px ${24 * S}px`,
              boxShadow: `0 0 ${24 * S}px ${C.primary}1a`,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em", marginBottom: 10 * S,
              }}>親身經歷</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "700", lineHeight: 1.5,
              }}>你工作中最常需要 AI 幫忙的那類任務 —</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.primary, fontWeight: "700", lineHeight: 1.5, marginTop: 4 * S,
              }}>現在用的工具，真的是最適合的嗎？</div>
            </div>
          </div>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <TaskRouterAnimation triggerLocalFrame={TASK_ROUTER_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene 3 — 快速選擇邏輯 + 交叉比對 ─────────────────────────────────────
// Phase A: 快速選擇邏輯 (3 task → AI rules)
// Phase B: 交叉比對 + 中立性提醒
function QuickRule({ aiKey, taskKeyword, delay }: {
  aiKey: keyof typeof AI; taskKeyword: string; delay: number;
}) {
  const ai = AI[aiKey];
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14 * S,
        background: "rgba(0,0,0,0.5)",
        border: `1px solid ${ai.border}`,
        borderLeft: `${5 * S}px solid ${ai.color}`,
        borderRadius: 12 * S,
        padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          flex: 1,
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
          color: C.text, lineHeight: 1.5,
        }}>{taskKeyword}</div>
        <div style={{ color: ai.color, fontSize: 24 * S }}>→</div>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
          color: ai.color, fontWeight: "700",
          background: ai.light, border: `${2 * S}px solid ${ai.color}`,
          borderRadius: 8 * S, padding: `${4 * S}px ${12 * S}px`,
          textShadow: `0 0 ${8 * S}px ${ai.color}77`,
        }}>{ai.label}</div>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_11.scene3.to - SCENES_2026_05_11.scene3.from;
  // scene3 starts at 175.2s = global 5256 (local = global - 5256)
  // Phase A:
  //   Header at 0
  //   Claude rule at 178.4s → local 96
  //   GPT rule at 183.6s → local 252
  //   Gemini rule at 189.6s → local 432
  // Phase B starts at "還有一個很實用的習慣" 193.6s → local 552
  //   Habit headline at 552
  //   "比較答案" at 199.2s → local 720
  //   Outcome at 202.0s → local 804
  //   Reminder card at 209.6s → local 1032
  //   Final reflection at 223.2s → local 1440

  const HEADER_AT     = 0;
  const RULE1_AT      = 96;
  const RULE2_AT      = 252;
  const RULE3_AT      = 432;

  const A_FADE_START  = 472;    // 552 - 80
  const A_REMOVE      = 552;
  const B_SHOW_AT     = 552;

  const HABIT_AT      = B_SHOW_AT;
  const OUTCOME_AT    = 720;     // 199.2s
  const REMINDER_AT   = 1032;    // 209.6s
  const REFLECTION_AT = 1440;    // 223.2s

  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  const headerStyle    = useFadeUp(HEADER_AT);
  const habitStyle     = useFadeUp(showB ? HABIT_AT : 999999);
  const outcomeStyle   = useFadeIn(showB ? OUTCOME_AT : 999999);
  const reminderStyle  = useFadeUp(showB ? REMINDER_AT : 999999);
  const reflectStyle   = useFadeUp(showB ? REFLECTION_AT : 999999);

  const DECISION_TREE_AT = 96;
  const CROSS_CHECK_AT   = 552;

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 16 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
              }}>快速選擇邏輯</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "700", lineHeight: 1.3,
              }}>看任務類型，挑對的 AI</div>
            </div>

            <QuickRule aiKey="claude" delay={RULE1_AT}
              taskKeyword="長文件閱讀 · 深度分析 · 複雜推理" />
            <QuickRule aiKey="gpt"    delay={RULE2_AT}
              taskKeyword="創意寫作 · 腦力激盪 · 需要外掛" />
            <QuickRule aiKey="gemini" delay={RULE3_AT}
              taskKeyword="即時資訊 · Google 生態整合" />
          </div>
        )}

        {showB && (
          <>
            <div style={{ ...habitStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px ${C.primary}1f`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>實用習慣</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.5,
                }}>對重要任務，用兩個 AI 問同樣的問題</div>
              </div>
            </div>

            <div style={{
              ...outcomeStyle,
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.muted, lineHeight: 1.6, marginBottom: 18 * S,
              padding: `0 ${4 * S}px`,
            }}>
              比較答案 — 不只更好的結果，也能建立對各自特性的直覺。
            </div>

            <div style={{ ...reminderStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${20 * S}px ${C.yellow}1a`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>⚠ 重要提醒</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55, fontWeight: "700",
                }}>三個 AI 都不是客觀中立的 — 都有訓練偏向和限制</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.6, marginTop: 8 * S,
                }}>重要的決策，永遠需要你自己的判斷，不能照單全收。</div>
              </div>
            </div>

            <div style={{ ...reflectStyle }}>
              <div style={{
                background: "rgba(0,0,0,0.5)",
                border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>推薦一下</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55, fontWeight: "700",
                }}>如果今天要推薦一個 AI 工具，你會推薦哪個？你的理由是什麼？</div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <DecisionTreeAnimation triggerLocalFrame={DECISION_TREE_AT} />
        <CrossCheckAnimation triggerLocalFrame={CROSS_CHECK_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene ──────────────────────────────────────────────────────────
function SummaryCard({ number, title, text, delay, color, border }: {
  number: string; title: string; text: string; delay: number; color: string; border: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div style={{
        display: "flex", gap: 14 * S, alignItems: "flex-start",
        background: `${border}1f`,
        border: `1px solid ${border}`,
        borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
          color, fontWeight: "700", flexShrink: 0, marginTop: 2 * S,
          textShadow: `0 0 ${10 * S}px ${color}88`,
        }}>{number}</div>
        <div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
            color, fontWeight: "700", lineHeight: 1.4, marginBottom: 6 * S,
          }}>{title}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.text, lineHeight: 1.6,
          }}>{text}</div>
        </div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_05_11.summary.to - SCENES_2026_05_11.summary.from;
  // scene starts at 229.2s = global 6876 (local = global - 6876)
  // Beats:
  //   Badge at 0
  //   Card1 "三者設計哲學不同" at 231.0s → local 54
  //   Card2 "工具選錯事倍功半" at 241.8s → local 378
  //   Card3 "兩個 AI 交叉比對" at 248.8s → local 588
  //   Outro at 254.4s → local 756

  const BADGE_AT  = 0;
  const CARD1_AT  = 54;
  const CARD2_AT  = 378;
  const CARD3_AT  = 588;
  const OUTRO_AT  = 756;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        <div style={{ ...badgeStyle, marginBottom: 22 * S, marginTop: 24 * S }}>
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
          title="設計哲學不同"
          text="Claude 重誠實穩健 · GPT 重生態廣度 · Gemini 重 Google 整合"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="02" delay={CARD2_AT}
          title="選錯工具事倍功半"
          text="了解強項，才能在對的任務用對的 AI"
          color={C.blue} border={C.blue}
        />
        <SummaryCard
          number="03" delay={CARD3_AT}
          title="重要任務交叉比對"
          text="用兩個 AI 問同題，永遠保留自己的判斷"
          color={C.yellow} border={C.yellow}
        />

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
export function VideoComposition_2026_05_11() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_11.scene1;
  const S2 = SCENES_2026_05_11.scene2;
  const S3 = SCENES_2026_05_11.scene3;
  const SU = SCENES_2026_05_11.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-05-11-processed.wav")} volume={1.0} />
      <Audio src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_05_11 - 150, TOTAL_FRAMES_2026_05_11],
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
