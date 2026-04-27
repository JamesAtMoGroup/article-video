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
// TitleScene:   0s–14.840s   → 0–445
// Scene1:       14.840s–99.640s  → 445–2989
// Scene2:       99.640s–173.480s → 2989–5204
// Scene3:       173.480s–238.800s → 5204–7164
// SummaryScene: 238.800s–262.760s → 7164–7883
export const SCENES_2026_04_21 = {
  title:   { from: 0,    to: 445  },
  scene1:  { from: 445,  to: 2989 },
  scene2:  { from: 2989, to: 5204 },
  scene3:  { from: 5204, to: 7164 },
  summary: { from: 7164, to: 7883 },
} as const;
export const TOTAL_FRAMES_2026_04_21 = 7883;

const CHAPTERS = [
  { label: "今日焦點",       start: 0    },
  { label: "為什麼越來越便宜", start: 445  },
  { label: "能力同時提升",    start: 2989 },
  { label: "對你的影響",      start: 5204 },
  { label: "重點整理",        start: 7164 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 2674, to: 2989, sender: "想一想", text: "越來越便宜的趨勢，你會更積極善用 AI，還是等更強再說？" },
  { from: 4975, to: 5204, sender: "未來思考", text: "AI 能力每年都在提升，你覺得五年後哪些工作會根本改變？" },
  { from: 6875, to: 7164, sender: "想一想", text: "你有沒有辦法區分一篇文章是人寫的、AI 寫的、還是 AI 幫人改過的？" },
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
        width: CONTAINER_W,
        height: CONTENT_H,
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

// ── iMessage system ────────────────────────────────────────────────────────
function IMessageCard({ callout, slotIndex, globalFrame }: {
  callout: Callout; slotIndex: number; globalFrame: number;
}) {
  const { fps } = useVideoConfig();
  const f = Math.max(0, globalFrame - callout.from);
  const remaining = callout.to - globalFrame;
  const slideY = spring({ frame: f, fps, config: { damping: 22, stiffness: 130 } });
  const translateY = interpolate(slideY, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);
  const fadeOut = remaining < FADE_OUT_FRAMES
    ? interpolate(remaining, [0, FADE_OUT_FRAMES], [0, 1], clamp) : 1;
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
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary,
          letterSpacing: "0.05em",
        }}>{callout.sender}</span>
      </div>
      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.55,
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

// 1. PriceStrengthAnimation — TitleScene, global trigger=223, right side
// 視覺隱喻：兩條交叉曲線 — 成本↓ 能力↑
function PriceStrengthAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 220;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const W_BOX = 180 * S;
  const H_BOX = 120 * S;
  const drawP = interpolate(f, [0, 40], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const labelOp = interpolate(Math.max(0, f - 50), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  // cost curve: starts top-left → ends bottom-right
  const costY1 = 10 * S;
  const costY2 = H_BOX - 10 * S;
  // capability curve: starts bottom-left → ends top-right
  const capY1  = H_BOX - 10 * S;
  const capY2  = 10 * S;

  const costX2 = drawP * (W_BOX - 10 * S);
  const costYcur = costY1 + drawP * (costY2 - costY1);
  const capX2 = drawP * (W_BOX - 10 * S);
  const capYcur = capY1 + drawP * (capY2 - capY1);

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 * S,
    }}>
      <svg width={W_BOX} height={H_BOX} style={{ overflow: "visible" }}>
        {/* Cost line (↓ red) */}
        <line x1={10 * S} y1={costY1} x2={costX2} y2={costYcur}
          stroke={C.red} strokeWidth={3 * S} strokeLinecap="round" opacity={0.85} />
        {/* Capability line (↑ green) */}
        <line x1={10 * S} y1={capY1} x2={capX2} y2={capYcur}
          stroke={C.primary} strokeWidth={3 * S} strokeLinecap="round" />
      </svg>
      <div style={{ opacity: labelOp, display: "flex", flexDirection: "column", gap: 6 * S, alignItems: "flex-end" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 * S }}>
          <div style={{ width: 18 * S, height: 3 * S, background: C.primary, borderRadius: 2 * S }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary }}>能力 ↑</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 * S }}>
          <div style={{ width: 18 * S, height: 3 * S, background: C.red, borderRadius: 2 * S }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.red }}>成本 ↓</span>
        </div>
      </div>
    </div>
  );
}

// 2. HardwareCostAnimation — Scene1, left side, local trigger=537
// 視覺隱喻：GPU 晶片圖標 + 成本下降箭頭
function HardwareCostAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 555;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const chipScale = easeOutBack(prog(f, 22));
  const arrowH = interpolate(Math.max(0, f - 30), [0, 25], [0, 50 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const costOp = interpolate(Math.max(0, f - 60), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const labelOp = interpolate(Math.max(0, f - 80), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
    }}>
      {/* GPU chip */}
      <div style={{
        width: 70 * S, height: 70 * S,
        background: "rgba(124,255,178,0.08)",
        border: `${2 * S}px solid ${C.primary}`,
        borderRadius: 10 * S,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28 * S,
        transform: `scale(${chipScale})`,
        boxShadow: `0 0 ${16 * S}px rgba(124,255,178,0.3)`,
        position: "relative",
      }}>
        🖥️
        {/* Corner pads */}
        {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([dx, dy], i) => (
          <div key={i} style={{
            position: "absolute",
            left: dx < 0 ? -4 * S : undefined,
            right: dx > 0 ? -4 * S : undefined,
            top: dy < 0 ? -4 * S : undefined,
            bottom: dy > 0 ? -4 * S : undefined,
            width: 8 * S, height: 8 * S,
            background: C.muted, borderRadius: 2 * S,
          }} />
        ))}
      </div>

      {/* Downward arrow */}
      <div style={{
        height: arrowH, width: 3 * S,
        background: `linear-gradient(to bottom, ${C.primary}, ${C.red})`,
        borderRadius: 2 * S,
        position: "relative",
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: "50%",
          transform: "translateX(-50%)",
          color: C.red, fontSize: 18 * S,
        }}>▼</div>
      </div>

      {/* Cost label */}
      <div style={{ opacity: costOp, textAlign: "center" as const }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
          color: C.red, fontWeight: "700",
          textShadow: `0 0 ${12 * S}px rgba(255,107,107,0.6)`,
        }}>每年↓</div>
      </div>

      {/* Sub-label */}
      <div style={{ opacity: labelOp }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.muted, letterSpacing: "0.06em", textAlign: "center" as const,
        }}>硬體成本</div>
      </div>
    </div>
  );
}

// 3. InferenceTrioAnimation — Scene1, right side, local trigger=1002
// 視覺隱喻：三大推論優化技術逐一出現
// step delays: 量化 f=348, 蒸餾 f=460, 批次 f=571
function InferenceTrioAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 815;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const items = [
    { icon: "🗜️", label: "量化",   desc: "更少記憶體",  color: C.primary, delay: 348 },
    { icon: "🎓", label: "蒸餾",   desc: "小模型學大模型", color: C.yellow,  delay: 460 },
    { icon: "⚡", label: "批次",   desc: "同時服務更多",  color: C.primary, delay: 571 },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 170 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 12 * S,
      width: 210 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em", marginBottom: 4 * S,
      }}>推論效率三招</div>
      {items.map((item, i) => {
        const itemF = Math.max(0, f - item.delay);
        const itemOp = interpolate(itemF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 20], [30 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const dotScale = easeOutBack(Math.min(itemF / 20, 1));
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateX(${itemTx}px)`,
            display: "flex", alignItems: "center", gap: 10 * S,
            background: "rgba(0,0,0,0.85)",
            border: `1px solid ${item.color}33`,
            borderLeft: `3px solid ${item.color}`,
            borderRadius: 10 * S,
            padding: `${9 * S}px ${12 * S}px`,
          }}>
            <div style={{
              width: 8 * S, height: 8 * S, borderRadius: "50%",
              background: item.color,
              boxShadow: `0 0 ${6 * S}px ${item.color}`,
              transform: `scale(${dotScale})`,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 18 * S }}>{item.icon}</span>
            <div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: item.color, letterSpacing: "0.06em",
              }}>{item.label}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.muted, marginTop: 2 * S,
              }}>{item.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 4. MoEArchitectureAnimation — Scene2, right side, local trigger=961
// 視覺隱喻：神經網路中只有部分節點亮起 (Mixture of Experts)
function MoEArchitectureAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 416;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const containerScale = easeOutBack(prog(f, 20));
  const labelOp = interpolate(Math.max(0, f - 40), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  // 6 nodes: 3 active (bright green), 3 inactive (dim)
  const nodes = [
    { cx: 40, cy: 30, active: true  },
    { cx: 40, cy: 70, active: false },
    { cx: 40, cy: 110, active: true },
    { cx: 120, cy: 30, active: false },
    { cx: 120, cy: 70, active: true },
    { cx: 120, cy: 110, active: false },
  ];
  const SIZE = S;

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      transform: `scale(${containerScale})`,
      transformOrigin: "top right",
    }}>
      <svg width={160 * S} height={140 * S} style={{ overflow: "visible" }}>
        {/* Connections */}
        {nodes.slice(0,3).map((n1, i) =>
          nodes.slice(3).map((n2, j) => {
            const bothActive = n1.active && n2.active;
            const lineOp = interpolate(Math.max(0, f - 10), [0, 25], [0, bothActive ? 0.7 : 0.12], { easing: E.outCubic, extrapolateRight: "clamp" });
            return (
              <line key={`${i}-${j}`}
                x1={n1.cx * SIZE} y1={n1.cy * SIZE}
                x2={n2.cx * SIZE} y2={n2.cy * SIZE}
                stroke={bothActive ? C.primary : C.muted}
                strokeWidth={bothActive ? 2 * S : 1 * S}
                opacity={lineOp}
              />
            );
          })
        )}
        {/* Nodes */}
        {nodes.map((n, i) => {
          const nodeF = Math.max(0, f - i * 8);
          const nodeOp = interpolate(nodeF, [0, 16], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const nodeScale = easeOutBack(Math.min(nodeF / 16, 1));
          return (
            <g key={i} transform={`translate(${n.cx * SIZE}, ${n.cy * SIZE})`}>
              <circle
                r={10 * SIZE}
                fill={n.active ? "rgba(124,255,178,0.18)" : "rgba(255,255,255,0.05)"}
                stroke={n.active ? C.primary : C.muted}
                strokeWidth={2 * S}
                opacity={nodeOp}
                transform={`scale(${nodeScale})`}
              />
              {n.active && (
                <circle r={4 * SIZE} fill={C.primary}
                  opacity={nodeOp}
                  style={{ filter: `drop-shadow(0 0 ${4 * SIZE}px ${C.primary})` }}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ opacity: labelOp, textAlign: "center" as const }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary, letterSpacing: "0.06em",
        }}>只啟動部分神經元</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, marginTop: 4 * S,
        }}>省資源・維持品質</div>
      </div>
    </div>
  );
}

// 5. QualityFilterAnimation — Scene3, left side, local trigger=1211
// 視覺隱喻：篩選器分辨 AI 生成內容 vs 人工優質內容
function QualityFilterAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 453;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const filterScale = easeOutBack(prog(f, 22));
  const badOp  = interpolate(Math.max(0, f - 30), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const goodOp = interpolate(Math.max(0, f - 60), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const labelOp = interpolate(Math.max(0, f - 90), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
      width: 160 * S,
    }}>
      {/* Filter box */}
      <div style={{
        width: 100 * S, height: 60 * S,
        background: "rgba(124,255,178,0.08)",
        border: `${2 * S}px solid ${C.primary}`,
        borderRadius: 10 * S,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22 * S,
        transform: `scale(${filterScale})`,
        boxShadow: `0 0 ${16 * S}px rgba(124,255,178,0.25)`,
        position: "relative",
      }}>
        🔍
        <div style={{
          position: "absolute", top: -3 * S, right: -3 * S,
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary, background: C.primaryLight,
          border: `1px solid ${C.primaryBorder}`, borderRadius: 4 * S,
          padding: `${1 * S}px ${4 * S}px`,
        }}>篩</div>
      </div>

      {/* Good content (passes) */}
      <div style={{ opacity: goodOp, display: "flex", alignItems: "center", gap: 8 * S }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary,
        }}>✓</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.primary, background: C.primaryLight,
          border: `1px solid ${C.primaryBorder}`,
          borderRadius: 6 * S, padding: `${4 * S}px ${8 * S}px`,
        }}>有品質的輸出</div>
      </div>

      {/* Bad content (blocked) */}
      <div style={{ opacity: badOp, display: "flex", alignItems: "center", gap: 8 * S }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.red,
        }}>✕</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.red, background: C.redLight,
          border: `1px solid ${C.redBorder}`,
          borderRadius: 6 * S, padding: `${4 * S}px ${8 * S}px`,
          textDecoration: "line-through",
        }}>AI 快速垃圾</div>
      </div>

      <div style={{ opacity: labelOp }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.muted, letterSpacing: "0.06em", textAlign: "center" as const,
        }}>辨識能力越來越重要</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_04_21.title.to - SCENES_2026_04_21.title.from;
  const badgeStyle  = useFadeIn(5);
  const sub1Style   = useFadeUp(30);
  const tagStyle    = useFadeUp(46);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        paddingBottom: SUBTITLE_SAFE,
        paddingLeft: 80 * S, paddingRight: 80 * S,
        textAlign: "center",
      }}>
        <div style={{ ...badgeStyle, marginBottom: 14 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
          }}>每日 AI 知識庫</span>
        </div>

        <h1 style={{ margin: 0, lineHeight: 1.2,
          fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900, fontSize: 38 * S, color: C.text }}>
          <WordReveal text="為什麼模型越來越便宜" startFrame={10} staggerPerWord={6}
            fontSize={38 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>
        <h1 style={{ margin: 0, marginTop: 4 * S, lineHeight: 1.2,
          fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900, fontSize: 30 * S, color: C.primary }}>
          <WordReveal text="但能力越來越強？" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        <p style={{ ...sub1Style, marginTop: 20 * S,
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.muted, lineHeight: 1.6 }}>
          這不是矛盾——背後有真實的技術與市場邏輯
        </p>

        <div style={{ ...tagStyle, marginTop: 16 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>硬體成本 · 推論效率 · 架構進化 · 規模定律</span>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <PriceStrengthAnimation triggerFrame={223} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — 為什麼越來越便宜 ─────────────────────────────────────────────
// local frame offsets (VTT × 30 − 445):
//   Reason1 硬體: local 537  (00:32.720)
//   Reason2 推論: local 1002 (00:48.240)
//     量化 sub:   local 1350 (00:59.840)
//     蒸餾 sub:   local 1462 (01:03.560)
//     批次 sub:   local 1573 (01:07.280)
//   Reason3 競爭: local 1727 (01:12.400)
//   Result:       local 2017 (01:22.080)

function SubTechItem({ icon, label, detail, delay, color }: {
  icon: string; label: string; detail: string; delay: number; color: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, display: "flex", alignItems: "flex-start", gap: 8 * S, marginTop: 8 * S }}>
      <span style={{ fontSize: 18 * S, flexShrink: 0 }}>{icon}</span>
      <div>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color,
        }}>{label}</span>
        <span style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted,
          marginLeft: 6 * S,
        }}>{detail}</span>
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_21.scene1.to - SCENES_2026_04_21.scene1.from;

  const HEADER_AT   = 0;
  const REASON1_AT  = 537;
  const REASON2_AT  = 1002;
  const REASON3_AT  = 1727;
  const RESULT_AT   = 2017;

  const headerStyle  = useFadeUp(HEADER_AT);
  const reason1Style = useFadeUp(REASON1_AT);
  const reason2Style = useFadeUp(REASON2_AT);
  const reason3Style = useFadeUp(REASON3_AT);
  const resultStyle  = useFadeIn(RESULT_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Header */}
        <div style={{ ...headerStyle, marginBottom: 18 * S, marginTop: 20 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
          }}>
            <WordReveal text="為什麼越來越便宜" startFrame={4} staggerPerWord={5}
              fontSize={14 * S} color={C.primary}
              fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
          </span>
        </div>

        {/* Reason 1: 硬體成本 */}
        <div style={{ ...reason1Style, marginBottom: 16 * S }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>01. 硬體成本持續下降</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.text, lineHeight: 1.65,
            }}>GPU 生產規模擴大，加上各家公司自研 AI 推論晶片持續迭代——跑一個模型的<span style={{ color: C.primary, fontWeight: "700" }}>硬體成本每年都在降</span></div>
          </div>
        </div>

        {/* Reason 2: 推論效率 */}
        <div style={{ ...reason2Style, marginBottom: 16 * S }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>02. 推論效率大幅提升</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.muted, lineHeight: 1.65, marginBottom: 6 * S,
            }}>工程師在「問答過程」這塊下了大量功夫：</div>
            <SubTechItem icon="🗜️" label="量化" detail="讓模型用更少記憶體跑起來" delay={1350} color={C.primary} />
            <SubTechItem icon="🎓" label="蒸餾" detail="讓小模型學到大模型的能力" delay={1462} color={C.yellow} />
            <SubTechItem icon="⚡" label="批次" detail="同一套硬體同時服務更多請求" delay={1573} color={C.primary} />
          </div>
        </div>

        {/* Reason 3: 競爭 */}
        <div style={{ ...reason3Style, marginBottom: 16 * S }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.surfaceBorder}`,
            borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>03. 競爭加速壓價</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.text, lineHeight: 1.65,
            }}>每隔幾個月就有新競爭者出現，廠商不得不降價維持市場地位</div>
          </div>
        </div>

        {/* Result highlight */}
        <div style={{ ...resultStyle }}>
          <div style={{
            background: C.primaryLight, border: `1.5px solid ${C.primary}`,
            borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
            boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.12)`,
          }}>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
              color: C.primary, fontWeight: "700", lineHeight: 1.5,
            }}>結果：你現在花幾年前<span style={{ fontSize: 24 * S }}>十分之一</span>的錢，能處理一樣甚至更多的內容</div>
          </div>
        </div>
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <HardwareCostAnimation triggerLocalFrame={REASON1_AT} />
        <InferenceTrioAnimation triggerLocalFrame={REASON2_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — 能力同時提升 ─────────────────────────────────────────────────
// local offsets (VTT × 30 − 2989):
//   Header intro:    local 111  (01:43.320)
//   Reason1 訓練:   local 309  (01:49.920)
//   Reason1 detail: local 556  (01:58.160)
//   Reason2 架構:   local 787  (02:05.880)
//   MoE detail:     local 961  (02:11.680)
//   A_FADE_START:   local 1163 (02:18.400) — "將寄神資源" last of MoE
//   Phase B:
//   Reason3 規模:   local 1287 (02:22.520)
//   Detail 精準:    local 1539 (02:30.920)
//   Conclusion:     local 1798 (02:39.560)

function ReasonNode2({ label, detail, color, border, activeAt, index }: {
  label: string; detail: string; color: string; border: string;
  activeAt: number; index: number;
}) {
  const frame = useCurrentFrame();
  const entF = Math.max(0, frame - (index * 12));
  const entOp = interpolate(entF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const entTy = interpolate(entF, [0, 22], [22 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const dimF  = Math.max(0, frame - activeAt);
  const activeT = interpolate(dimF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const opMult  = interpolate(activeT, [0, 1], [0.28, 1], clamp);
  return (
    <div style={{
      opacity: entOp * opMult, transform: `translateY(${entTy}px)`,
      marginBottom: 14 * S, position: "relative",
    }}>
      <div style={{
        background: `${border}15`,
        border: `1.5px solid ${border}`,
        borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color, letterSpacing: "0.08em", marginBottom: 8 * S,
        }}>{label}</div>
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
  const dur = SCENES_2026_04_21.scene2.to - SCENES_2026_04_21.scene2.from;

  const HEADER_AT = 111;
  const R1_AT     = 309;
  const R1DET_AT  = 556;
  const R2_AT     = 787;
  const MOE_AT    = 961;

  // Phase A → B
  const A_FADE_START = 1163;
  const A_REMOVE     = A_FADE_START + 80;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = A_REMOVE + 20;
  const R3_AT     = B_SHOW_AT;
  const DET3_AT   = 1539;
  const CONCL_AT  = 1798;
  const showB     = frame >= B_SHOW_AT;

  const headerStyle = useFadeUp(HEADER_AT);
  const r1Style     = useFadeUp(R1_AT);
  const r1DetStyle  = useFadeIn(R1DET_AT);
  const r2Style     = useFadeUp(R2_AT);
  const moeStyle    = useFadeIn(MOE_AT);
  const r3Style     = useFadeUp(showB ? R3_AT : 999999);
  const det3Style   = useFadeIn(showB ? DET3_AT : 999999);
  const conclStyle  = useFadeIn(showB ? CONCL_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 18 * S, marginTop: 20 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.12em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
              }}>
                <WordReveal text="能力同時提升" startFrame={HEADER_AT + 4} staggerPerWord={5}
                  fontSize={14 * S} color={C.primary} fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
              </span>
            </div>

            {/* Reason 1: 訓練效率 */}
            <div style={{ ...r1Style, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>01. 訓練效率提升了</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>更好的訓練方式讓模型不需要「暴力餵資料」就能變聰明</div>
                <div style={{ ...r1DetStyle, marginTop: 8 * S }}>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                    color: C.primary, lineHeight: 1.5,
                    background: C.primaryLight, borderRadius: 8 * S,
                    padding: `${6 * S}px ${10 * S}px`,
                  }}>同樣訓練預算，現在能產出比幾年前更強的模型</div>
                </div>
              </div>
            </div>

            {/* Reason 2: 架構進化 */}
            <div style={{ ...r2Style, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>02. 架構不斷進化</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>Transformer 這幾年經歷了很多改良</div>
                <div style={{ ...moeStyle, marginTop: 10 * S }}>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                    color: C.text, lineHeight: 1.65,
                    borderLeft: `3px solid ${C.yellow}`, paddingLeft: 12 * S,
                  }}>
                    「<span style={{ color: C.yellow, fontWeight: "700" }}>專家混合</span>」設計：回答問題時只啟動部分神經元——<span style={{ color: C.primary }}>省資源，品質維持高水準</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            <div style={{ ...r3Style, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface, border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>03. 規模定律帶來複利效應</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>研究發現模型能力跟訓練資源之間有<span style={{ color: C.primary, fontWeight: "700" }}>可預測的規律</span></div>
                <div style={{ ...det3Style, marginTop: 10 * S }}>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                    color: C.muted, lineHeight: 1.6,
                  }}>廠商可以更精準分配預算，換取最大能力提升——而不是盲目堆算力</div>
                </div>
              </div>
            </div>

            <div style={{ ...conclStyle }}>
              <div style={{
                background: C.primaryLight, border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: "700", lineHeight: 1.4,
                }}>「聰明地訓練」正在取代「暴力堆算力」</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.6, marginTop: 8 * S,
                }}>效益越來越高</div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <MoEArchitectureAnimation triggerLocalFrame={MOE_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 對你的實際影響 ────────────────────────────────────────────────
// local offsets (VTT × 30 − 5204):
//   Header:      local 0
//   門檻card:    local 158  (02:58.720)
//   中小型:      local 306  (03:03.680)
//   不用AI劣勢:  local 515  (03:10.640)
//   選擇card:    local 707  (03:17.040)
//   評估能力:    local 1043 (03:28.240)
//   A_FADE:      local 1144 (03:31.600)
//   Phase B:
//   警覺card:    local 1244 (B_SHOW, near 03:35.640)
//   量暴增:      local 1372 (03:39.200)
//   辨識:        local 1481 (03:42.840)

function ImpactItem({ text, delay }: { text: string; delay: number }) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, display: "flex", alignItems: "flex-start", gap: 10 * S, marginTop: 8 * S }}>
      <div style={{
        width: 8 * S, height: 8 * S, borderRadius: "50%",
        background: C.primary, marginTop: 7 * S, flexShrink: 0,
        boxShadow: `0 0 ${6 * S}px ${C.primary}88`,
      }} />
      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text, lineHeight: 1.65,
      }}>{text}</div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_21.scene3.to - SCENES_2026_04_21.scene3.from;

  const BARRIER_AT = 158;
  const SMALL_AT   = 306;
  const DISADV_AT  = 515;
  const CHOICE_AT  = 707;
  const JUDGE_AT   = 1043;

  const A_FADE_START = 1144;
  const A_REMOVE     = A_FADE_START + 80;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT   = A_REMOVE + 20;
  const WARN_AT     = B_SHOW_AT;
  const VOLUME_AT   = 1372;
  const DISCERN_AT  = 1481;
  const showB       = frame >= B_SHOW_AT;

  const headerStyle  = useFadeUp(0);
  const barrierStyle = useFadeUp(BARRIER_AT);
  const choiceStyle  = useFadeUp(CHOICE_AT);
  const warnStyle    = useFadeUp(showB ? WARN_AT : 999999);
  const volStyle     = useFadeIn(showB ? VOLUME_AT : 999999);
  const discernStyle = useFadeIn(showB ? DISCERN_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 18 * S, marginTop: 20 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.12em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
              }}>
                <WordReveal text="對你的實際影響" startFrame={4} staggerPerWord={5}
                  fontSize={14 * S} color={C.primary} fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
              </span>
            </div>

            {/* 門檻下降 card */}
            <div style={{ ...barrierStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>✦ 門檻在下降</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>以前只有大公司才負擔得起的 AI 功能</div>
                <ImpactItem text="中小型團隊甚至個人都能用" delay={SMALL_AT} />
                <ImpactItem text="創造了更平等的競爭環境" delay={SMALL_AT + 60} />
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.red, lineHeight: 1.5, marginTop: 10 * S,
                  opacity: frame >= DISADV_AT ? interpolate(Math.max(0, frame - DISADV_AT), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }) : 0,
                }}>⚠ 但也意味著：你不用 AI 的競爭劣勢，會越來越明顯</div>
              </div>
            </div>

            {/* 選擇變多 card */}
            <div style={{ ...choiceStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>✦ 選擇變多了，但需要判斷力</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>市場上的模型選項爆炸性成長</div>
                <div style={{
                  opacity: frame >= JUDGE_AT ? interpolate(Math.max(0, frame - JUDGE_AT), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }) : 0,
                  marginTop: 8 * S,
                }}>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                    color: C.muted, lineHeight: 1.6,
                    borderLeft: `3px solid ${C.yellow}`, paddingLeft: 12 * S,
                  }}>你需要能評估哪個模型適合哪種任務，而不是只會用「那個最有名的」</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            <div style={{ ...warnStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(255,209,102,0.1)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>⚠ 值得警覺</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65, fontWeight: "700",
                }}>便宜不代表沒有隱患</div>
                <div style={{ ...volStyle, marginTop: 8 * S }}>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                    color: C.muted, lineHeight: 1.6,
                  }}>更低的成本讓 AI 生成內容的量爆增</div>
                </div>
              </div>
            </div>

            <div style={{ ...discernStyle }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>越來越重要的能力</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>能不能辨別哪些是真正有品質的輸出、哪些是「用 AI 快速生成的垃圾」</div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <QualityFilterAnimation triggerLocalFrame={1211} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene ────────────────────────────────────────────────────────────
// local offsets (VTT × 30 − 7164):
//   Badge:    local 0
//   Card1:    local 97   (04:02.040)
//   Card2:    local 290  (04:08.480)
//   Outro:    local 576  (04:18.000)

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
          fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
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
  const dur = SCENES_2026_04_21.summary.to - SCENES_2026_04_21.summary.from;
  const badgeStyle = useFadeIn(0);
  const outroStyle = useFadeIn(576);

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
              fontSize={14 * S} color={C.primary}
              fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
          </span>
        </div>

        <SummaryCard
          number="01" delay={97}
          text="為什麼越來越便宜——硬體成本降低、推論效率提升、市場競爭，三個力量同向"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="02" delay={290}
          text="為什麼同時變更強——訓練演算法、架構優化（MoE）、規模定律，「聰明訓練」正在取代「暴力堆算力」"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="03" delay={475}
          text="對你的影響——門檻下降、選擇爆炸需要判斷力、辨識 AI 生成品質成為重要能力"
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
export function VideoComposition_2026_04_21() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_04_21.scene1;
  const S2 = SCENES_2026_04_21.scene2;
  const S3 = SCENES_2026_04_21.scene3;
  const SU = SCENES_2026_04_21.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-21-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_04_21 - 150, TOTAL_FRAMES_2026_04_21], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
