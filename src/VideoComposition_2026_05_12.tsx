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

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W       = 400 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLOT    = 200 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// TitleScene:   0s      – 14.24s   → 0–427
// Scene1:       14.24s  – 80.16s   → 427–2405    (痛點 + 工作流定義)
// Scene2:       80.16s  – 144.96s  → 2405–4349   (三個真實範例)
// Scene3:       144.96s – 235.20s  → 4349–7056   (n8n + 監督)
// Summary:      235.20s – 270s     → 7056–8100
export const SCENES_2026_05_12 = {
  title:   { from: 0,    to: 427  },
  scene1:  { from: 427,  to: 2405 },
  scene2:  { from: 2405, to: 4349 },
  scene3:  { from: 4349, to: 7056 },
  summary: { from: 7056, to: 8100 },
} as const;
export const TOTAL_FRAMES_2026_05_12 = 8100;

const CHAPTERS = [
  { label: "今日焦點",         start: 0    },
  { label: "什麼是工作流",      start: 427  },
  { label: "三個真實範例",      start: 2405 },
  { label: "n8n 工具入門",      start: 4349 },
  { label: "重點整理",         start: 7056 },
] as const;

// ── iMessage callouts (global frames, VTT-aligned) ────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // 01:09.12 – 01:17.76 → 2074–2333 (Scene1 reflection)
  { from: 2074, to: 2400, sender: "親身經歷",
    text: "你工作中有哪個「每次做法都一樣、只是很花時間」的任務 — 其實可以自動化？" },
  // 02:17.60 – 02:23.76 → 4128–4313 (Scene2 reflection)
  { from: 4128, to: 4349, sender: "想一想",
    text: "你每天/每週有哪些重複動作？如果能自動化一個，你最想自動化哪個？" },
  // 03:48.16 – 03:55.20 → 6845–7056 (Scene3 reflection)
  { from: 6845, to: 7056, sender: "動腦時間",
    text: "如果一個工作流每天在幫你工作，但偶爾會出錯，你會怎麼設計「檢查機制」？" },
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

// 1. WorkflowFlowAnimation — TitleScene, RIGHT, trigger=101 (VTT 03.36s "今天要聊的主題"), DUR=325
// Visual metaphor: 4 connected workflow nodes with flowing dots
function WorkflowFlowAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 325;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const nodes = [
    { emoji: "📧", label: "觸發", color: C.primary,  delay: 0  },
    { emoji: "🤖", label: "AI",   color: C.blue,     delay: 30 },
    { emoji: "📝", label: "整理", color: C.yellow,   delay: 60 },
    { emoji: "🔔", label: "通知", color: C.purple,   delay: 90 },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S,
      width: 280 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.08em",
        textShadow: `0 0 ${8 * S}px ${C.primary}66`,
      }}>WORKFLOW</div>

      <div style={{
        position: "relative", width: 260 * S, height: 280 * S,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
      }}>
        {nodes.map((n, i) => {
          const itemF = Math.max(0, f - n.delay);
          const sc = easeOutBack(prog(itemF, 22));
          const itemOp = interpolate(itemF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          return (
            <React.Fragment key={i}>
              <div style={{
                opacity: itemOp,
                transform: `scale(${sc})`,
                display: "flex", alignItems: "center", gap: 12 * S,
                padding: `${10 * S}px ${16 * S}px`,
                background: "rgba(0,0,0,0.7)",
                border: `${2 * S}px solid ${n.color}`,
                borderRadius: 12 * S,
                boxShadow: `0 0 ${16 * S}px ${n.color}44`,
                minWidth: 180 * S,
              }}>
                <span style={{ fontSize: 28 * S }}>{n.emoji}</span>
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: n.color, fontWeight: "700",
                  textShadow: `0 0 ${6 * S}px ${n.color}88`,
                }}>{n.label}</span>
              </div>
              {i < nodes.length - 1 && (() => {
                const arrowF = Math.max(0, f - n.delay - 12);
                const aOp = interpolate(arrowF, [0, 18], [0, 0.85], { easing: E.outCubic, extrapolateRight: "clamp" });
                // flowing dot offset (loops)
                const cycle = (f * 2) % 60;
                const dotY = cycle < 30 ? interpolate(cycle, [0, 30], [0, 24 * S]) : -1000;
                return (
                  <div style={{
                    width: 4 * S, height: 30 * S,
                    background: `linear-gradient(to bottom, ${n.color}, ${nodes[i + 1].color})`,
                    borderRadius: 2 * S, opacity: aOp,
                    position: "relative",
                  }}>
                    {dotY >= 0 && (
                      <div style={{
                        position: "absolute", top: dotY, left: -3 * S,
                        width: 10 * S, height: 10 * S, borderRadius: "50%",
                        background: C.primary,
                        boxShadow: `0 0 ${8 * S}px ${C.primary}`,
                      }} />
                    )}
                  </div>
                );
              })()}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// 2. PainCycleAnimation — Scene1 Phase A, LEFT, triggerLocal=149 (VTT 19.20s "每天早上開啟信箱"), DUR=433
// Visual metaphor: 3 manual step boxes + "x100" badge — pain of repetition
function PainCycleAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 433;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT-aligned step appearance:
  // 19.20s 信箱 → in-anim 0
  // 21.36s 筆記 → in-anim (21.36-19.20)*30 = 65
  // 24.48s PM   → in-anim (24.48-19.20)*30 = 158
  // 27.76s x100 → in-anim (27.76-19.20)*30 = 257
  const steps = [
    { emoji: "📧", label: "信箱篩選", appearsAt: 0   },
    { emoji: "📝", label: "整理筆記", appearsAt: 65  },
    { emoji: "📊", label: "更新 PM",  appearsAt: 158 },
  ];

  const x100F = Math.max(0, f - 257);
  const x100Op = interpolate(x100F, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const x100Sc = easeOutBack(prog(x100F, 22));
  // gentle shake to suggest fatigue
  const shake = Math.sin(f * 0.4) * 2 * S;

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 280 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.red, letterSpacing: "0.08em",
        textShadow: `0 0 ${8 * S}px ${C.red}66`,
        marginBottom: 14 * S,
      }}>MANUAL · 每天重複</div>

      {/* Step boxes */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 * S }}>
        {steps.map((s, i) => {
          const itemF = Math.max(0, f - s.appearsAt);
          const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemTx = interpolate(itemF, [0, 22], [-22 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <React.Fragment key={i}>
              <div style={{
                opacity: itemOp,
                transform: `translateX(${itemTx}px) translateY(${shake * 0.3}px)`,
                display: "flex", alignItems: "center", gap: 12 * S,
                padding: `${10 * S}px ${14 * S}px`,
                background: "rgba(0,0,0,0.7)",
                border: `1px solid rgba(255,107,107,0.3)`,
                borderRadius: 10 * S,
              }}>
                <span style={{ fontSize: 26 * S }}>{s.emoji}</span>
                <span style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text,
                }}>{s.label}</span>
                <span style={{
                  marginLeft: "auto",
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted,
                }}>↓</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* x100 badge */}
      <div style={{
        marginTop: 16 * S,
        opacity: x100Op,
        transform: `scale(${x100Sc})`,
        display: "flex", alignItems: "center", gap: 10 * S, justifyContent: "center",
        padding: `${10 * S}px ${16 * S}px`,
        background: C.redLight,
        border: `${2 * S}px solid ${C.red}`,
        borderRadius: 12 * S,
        boxShadow: `0 0 ${18 * S}px ${C.red}44`,
      }}>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
          color: C.red, fontWeight: "700",
          textShadow: `0 0 ${8 * S}px ${C.red}88`,
        }}>x 100+ 次</span>
        <span style={{ fontSize: 22 * S }}>😮‍💨</span>
      </div>
    </div>
  );
}

// 3. AutomatedFlowAnimation — Scene1 Phase B, RIGHT, triggerLocal=1030 (VTT 48.56s "工作流是一個一直在運作的系統"), DUR=526
// Visual metaphor: continuously running flow — 4 nodes with persistent dot flow
function AutomatedFlowAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 526;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT-aligned step appearance within animation:
  // 48.56 工作流是持續運作   → in-anim 0
  // 55.76 舉個例子          → in-anim (55.76-48.56)*30 = 216 (start flowing dots)
  // 58.00 AI自動摘要        → already shown
  // 59.28 送進Notion        → already shown
  // 61.60 重要的通知你       → already shown
  const nodes = [
    { emoji: "📧", label: "新郵件",   color: C.primary, delay: 0   },
    { emoji: "🤖", label: "AI 摘要",  color: C.blue,    delay: 36  },
    { emoji: "📝", label: "Notion",   color: C.yellow,  delay: 72  },
    { emoji: "🔔", label: "通知你",   color: C.purple,  delay: 108 },
  ];

  const loopBadgeF = Math.max(0, f - 216);
  const loopBadgeOp = interpolate(loopBadgeF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const loopBadgeSc = easeOutBack(prog(loopBadgeF, 22));

  // pulsing glow as a sign of "always running"
  const glowPulse = Math.sin(f * 0.08) * 0.3 + 0.7;

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 290 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.08em",
        textShadow: `0 0 ${8 * S}px ${C.primary}${Math.floor(glowPulse * 99).toString(16).padStart(2, "0")}`,
      }}>AUTO · 持續運作</div>

      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
        width: "100%",
      }}>
        {nodes.map((n, i) => {
          const itemF = Math.max(0, f - n.delay);
          const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const sc = easeOutBack(prog(itemF, 22));
          return (
            <React.Fragment key={i}>
              <div style={{
                opacity: itemOp,
                transform: `scale(${sc})`,
                display: "flex", alignItems: "center", gap: 12 * S,
                padding: `${10 * S}px ${14 * S}px`,
                background: "rgba(0,0,0,0.75)",
                border: `${2 * S}px solid ${n.color}`,
                borderRadius: 10 * S,
                minWidth: 200 * S,
                boxShadow: `0 0 ${14 * S}px ${n.color}55`,
              }}>
                <span style={{ fontSize: 26 * S }}>{n.emoji}</span>
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: n.color, fontWeight: "700",
                }}>{n.label}</span>
              </div>
              {i < nodes.length - 1 && (() => {
                const arrowF = Math.max(0, f - n.delay - 12);
                const aOp = interpolate(arrowF, [0, 16], [0, 0.85], { easing: E.outCubic, extrapolateRight: "clamp" });
                // Always flowing dot
                const cycle = ((f - n.delay) * 1.8) % 36;
                const dotY = cycle < 22 ? interpolate(cycle, [0, 22], [0, 22 * S]) : -1000;
                return (
                  <div style={{
                    width: 4 * S, height: 26 * S,
                    background: `linear-gradient(to bottom, ${n.color}, ${nodes[i + 1].color})`,
                    borderRadius: 2 * S, opacity: aOp,
                    position: "relative",
                  }}>
                    {dotY >= 0 && f > 216 && (
                      <div style={{
                        position: "absolute", top: dotY, left: -4 * S,
                        width: 12 * S, height: 12 * S, borderRadius: "50%",
                        background: C.primary,
                        boxShadow: `0 0 ${10 * S}px ${C.primary}`,
                      }} />
                    )}
                  </div>
                );
              })()}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{
        opacity: loopBadgeOp,
        transform: `scale(${loopBadgeSc})`,
        display: "flex", alignItems: "center", gap: 8 * S,
        padding: `${8 * S}px ${14 * S}px`,
        background: C.primaryLight,
        border: `${2 * S}px solid ${C.primary}`,
        borderRadius: 12 * S,
        boxShadow: `0 0 ${16 * S}px ${C.primary}55`,
      }}>
        <span style={{ fontSize: 20 * S }}>🔁</span>
        <span style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.primary, fontWeight: "700",
        }}>設定一次 · 跑無數次</span>
      </div>
    </div>
  );
}

// 4. ThreeExamplesAnimation — Scene2, RIGHT, triggerLocal=228 (VTT 87.76s "第一個"), DUR=1136
// Visual metaphor: 3 example flows accumulate — each is trigger → AI → output
function ThreeExamplesAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1136;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT-aligned example appearance:
  // 87.76s 第一個 → in-anim 0
  // 100.24s 第二個 → in-anim (100.24-87.76)*30 = 374
  // 112.80s 第三個 → in-anim (112.80-87.76)*30 = 751
  const examples = [
    { trigger: "📋", task: "表單", output: "📧", outLabel: "自動回信", color: C.primary, appearsAt: 0   },
    { trigger: "📰", task: "電子報", output: "💬", outLabel: "Slack 摘要", color: C.blue,    appearsAt: 374 },
    { trigger: "✨", task: "主題",  output: "📱", outLabel: "社群草稿",  color: C.yellow,  appearsAt: 751 },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 16 * S,
      width: 290 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em",
        textAlign: "right" as const,
      }}>真實範例 · 設定一次</div>

      {examples.map((e, i) => {
        const itemF = Math.max(0, f - e.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [32 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const aiF = Math.max(0, itemF - 14);
        const aiOp = interpolate(aiF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const aiSc = easeOutBack(prog(aiF, 22));
        const outF = Math.max(0, itemF - 32);
        const outOp = interpolate(outF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const outTx = interpolate(outF, [0, 22], [-12 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateX(${itemTx}px)`,
            display: "flex", alignItems: "center", gap: 8 * S,
            padding: `${10 * S}px ${12 * S}px`,
            background: "rgba(0,0,0,0.7)",
            borderLeft: `${4 * S}px solid ${e.color}`,
            border: `1px solid ${e.color}55`,
            borderRadius: 10 * S,
          }}>
            {/* trigger */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * S,
              minWidth: 60 * S,
            }}>
              <span style={{ fontSize: 26 * S }}>{e.trigger}</span>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted,
              }}>{e.task}</span>
            </div>
            <span style={{
              opacity: outOp,
              color: e.color, fontSize: 22 * S,
              textShadow: `0 0 ${6 * S}px ${e.color}88`,
            }}>→</span>
            {/* AI center */}
            <div style={{
              opacity: aiOp,
              transform: `scale(${aiSc})`,
              width: 50 * S, height: 50 * S, borderRadius: "50%",
              background: e.color + "22",
              border: `${2 * S}px solid ${e.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22 * S,
              boxShadow: `0 0 ${12 * S}px ${e.color}66`,
              flexShrink: 0,
            }}>🤖</div>
            <span style={{
              opacity: outOp,
              color: e.color, fontSize: 22 * S,
              textShadow: `0 0 ${6 * S}px ${e.color}88`,
            }}>→</span>
            {/* output */}
            <div style={{
              opacity: outOp,
              transform: `translateX(${outTx}px)`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * S,
              marginLeft: "auto",
              minWidth: 80 * S,
            }}>
              <span style={{ fontSize: 26 * S }}>{e.output}</span>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: e.color, fontWeight: "700",
                textShadow: `0 0 ${5 * S}px ${e.color}77`,
              }}>{e.outLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 5. N8nVisualNodesAnimation — Scene3 Phase A, LEFT, triggerLocal=308 (VTT 155.20s "第一 視覺化介面"), DUR=1500
// Visual metaphor: n8n-style canvas with progressive feature reveals
function N8nVisualNodesAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1500;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT-aligned reveals (in-anim time):
  // 155.20s 第一 視覺化介面 → 0
  // 157.36s 拖拉方塊 → (157.36-155.20)*30 = 65
  // 164.00s 第二 整合廣泛 → 264
  // 168.88s Gmail等服務 → (168.88-155.20)*30 = 410
  // 180.96s 第三 可以自己架 → 772
  // 182.96s 開源版本部署 → 832
  const nodes = [
    { emoji: "🔌", label: "Trigger",  color: C.primary, delay: 0   },
    { emoji: "⚙",  label: "IF",       color: C.blue,    delay: 24  },
    { emoji: "🤖", label: "AI",       color: C.yellow,  delay: 48  },
    { emoji: "📤", label: "Output",   color: C.purple,  delay: 72  },
  ];
  const services = [
    { emoji: "📧", label: "Gmail"   },
    { emoji: "📝", label: "Notion"  },
    { emoji: "💬", label: "Slack"   },
    { emoji: "🗂", label: "Airtable" },
  ];

  const servicesF = Math.max(0, f - 264);
  const servicesOp = interpolate(servicesF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const servicesTy = interpolate(servicesF, [0, 22], [18 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });

  const selfHostF = Math.max(0, f - 772);
  const selfHostOp = interpolate(selfHostF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const selfHostSc = easeOutBack(prog(selfHostF, 22));

  return (
    <div style={{
      position: "absolute", left: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 290 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.08em",
        textShadow: `0 0 ${8 * S}px ${C.primary}66`,
        marginBottom: 14 * S,
      }}>n8n · CANVAS</div>

      {/* Node grid (2×2 — visual canvas) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10 * S,
        padding: 14 * S,
        background: "rgba(0,0,0,0.55)",
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 14 * S,
        marginBottom: 14 * S,
      }}>
        {nodes.map((n, i) => {
          const itemF = Math.max(0, f - n.delay);
          const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const sc = easeOutBack(prog(itemF, 22));
          return (
            <div key={i} style={{
              opacity: itemOp,
              transform: `scale(${sc})`,
              display: "flex", alignItems: "center", gap: 8 * S,
              padding: `${8 * S}px ${10 * S}px`,
              background: "rgba(0,0,0,0.7)",
              border: `${2 * S}px solid ${n.color}`,
              borderRadius: 10 * S,
              boxShadow: `0 0 ${10 * S}px ${n.color}44`,
            }}>
              <span style={{ fontSize: 22 * S }}>{n.emoji}</span>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: n.color, fontWeight: "700",
              }}>{n.label}</span>
            </div>
          );
        })}
      </div>

      {/* Services row — Phase 2 (integrations) */}
      <div style={{
        opacity: servicesOp,
        transform: `translateY(${servicesTy}px)`,
        marginBottom: 14 * S,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.blue, letterSpacing: "0.06em", marginBottom: 8 * S,
        }}>+ 整合幾百個服務</div>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 6 * S,
        }}>
          {services.map((s, i) => {
            const sF = Math.max(0, f - 264 - i * 18);
            const sOp = interpolate(sF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                opacity: sOp,
                display: "flex", alignItems: "center", gap: 6 * S,
                padding: `${6 * S}px ${10 * S}px`,
                background: C.blueLight,
                border: `1px solid ${C.blueBorder}`,
                borderRadius: 8 * S,
              }}>
                <span style={{ fontSize: 20 * S }}>{s.emoji}</span>
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.text,
                }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Self-hosted badge — Phase 3 */}
      <div style={{
        opacity: selfHostOp,
        transform: `scale(${selfHostSc})`,
        display: "flex", alignItems: "center", gap: 10 * S, justifyContent: "center",
        padding: `${10 * S}px ${14 * S}px`,
        background: C.yellowLight,
        border: `${2 * S}px solid ${C.yellow}`,
        borderRadius: 12 * S,
        boxShadow: `0 0 ${14 * S}px ${C.yellow}44`,
      }}>
        <span style={{ fontSize: 22 * S }}>🔒</span>
        <span style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.yellow, fontWeight: "700",
          textShadow: `0 0 ${6 * S}px ${C.yellow}77`,
        }}>開源 · 自己架</span>
      </div>
    </div>
  );
}

// 6. SupervisionAnimation — Scene3 Phase B, RIGHT, triggerLocal=1841 (VTT 206.32s "最後一個很重要的提醒"), DUR=836
// Visual metaphor: eye watching a workflow + periodic check/warning marks
function SupervisionAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 836;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT-aligned sub-steps (in-anim time):
  // 206.32s 最後一個提醒 → 0
  // 214.32s 定期審核 → (214.32-206.32)*30 = 240
  // 221.20s 對外溝通 → (221.20-206.32)*30 = 446
  const eyeF = Math.max(0, f);
  const eyeOp = interpolate(eyeF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const eyeSc = easeOutBack(prog(eyeF, 22));
  // blinking eye
  const blink = ((f) % 80) < 6 ? 0.2 : 1;

  const flowF = Math.max(0, f - 30);
  const flowOp = interpolate(flowF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const reviewF = Math.max(0, f - 240);
  const reviewOp = interpolate(reviewF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const reviewSc = easeOutBack(prog(reviewF, 22));

  const warningF = Math.max(0, f - 446);
  const warningOp = interpolate(warningF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const warningSc = easeOutBack(prog(warningF, 22));

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 290 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.yellow, letterSpacing: "0.08em",
        textShadow: `0 0 ${8 * S}px ${C.yellow}66`,
      }}>SUPERVISE · 別放生</div>

      {/* Eye */}
      <div style={{
        opacity: eyeOp,
        transform: `scale(${eyeSc * blink})`,
        width: 80 * S, height: 80 * S, borderRadius: "50%",
        background: C.yellowLight,
        border: `${2 * S}px solid ${C.yellow}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36 * S,
        boxShadow: `0 0 ${20 * S}px ${C.yellow}66`,
      }}>👁</div>

      {/* Workflow line below */}
      <div style={{
        opacity: flowOp,
        display: "flex", alignItems: "center", gap: 8 * S,
        padding: `${8 * S}px ${12 * S}px`,
        background: "rgba(0,0,0,0.7)",
        border: `1px solid rgba(255,255,255,0.18)`,
        borderRadius: 10 * S,
      }}>
        <span style={{ fontSize: 22 * S }}>📧</span>
        <span style={{ color: C.muted, fontSize: 18 * S }}>→</span>
        <span style={{ fontSize: 22 * S }}>🤖</span>
        <span style={{ color: C.muted, fontSize: 18 * S }}>→</span>
        <span style={{ fontSize: 22 * S }}>📤</span>
      </div>

      {/* Periodic review check */}
      <div style={{
        opacity: reviewOp,
        transform: `scale(${reviewSc})`,
        display: "flex", alignItems: "center", gap: 8 * S,
        padding: `${8 * S}px ${14 * S}px`,
        background: C.primaryLight,
        border: `${2 * S}px solid ${C.primary}`,
        borderRadius: 10 * S,
        boxShadow: `0 0 ${14 * S}px ${C.primary}55`,
      }}>
        <span style={{ fontSize: 22 * S, color: C.primary }}>✓</span>
        <span style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.primary, fontWeight: "700",
        }}>定期審核輸出</span>
      </div>

      {/* External communication warning */}
      <div style={{
        opacity: warningOp,
        transform: `scale(${warningSc})`,
        display: "flex", alignItems: "center", gap: 8 * S,
        padding: `${8 * S}px ${14 * S}px`,
        background: C.redLight,
        border: `${2 * S}px solid ${C.red}`,
        borderRadius: 10 * S,
        boxShadow: `0 0 ${14 * S}px ${C.red}55`,
      }}>
        <span style={{ fontSize: 22 * S }}>⚠</span>
        <span style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.red, fontWeight: "700",
        }}>對外回信 · 必檢查</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_05_12.title.to - SCENES_2026_05_12.title.from;
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
          <WordReveal text="什麼是 AI 工作流？" startFrame={10} staggerPerWord={6}
            fontSize={42 * S} color={C.text}
            fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 — neon green accent */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 32 * S, color: C.primary,
        }}>
          <WordReveal text="n8n 能幫你自動化什麼" startFrame={32} staggerPerWord={6}
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
          問 AI 是一次性互動 — 工作流是一直在運作的系統
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 18 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>AI 工作流 · 自動化 · n8n</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation — trigger at 03.36s "今天要聊的主題" */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <WorkflowFlowAnimation triggerFrame={101} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene 1 — 痛點 + 工作流定義 (Phase A/B) ───────────────────────────────
// Phase A: morning routine pain → manual repetition
// Phase B: workflow vs one-shot Q&A (Notion example)
function StepCard({ emoji, label, delay, color, border }: {
  emoji: string; label: string; delay: number; color: string; border: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 12 * S }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14 * S,
        background: "rgba(0,0,0,0.5)",
        border: `1px solid ${border}`,
        borderLeft: `${4 * S}px solid ${color}`,
        borderRadius: 10 * S,
        padding: `${12 * S}px ${20 * S}px`,
      }}>
        <span style={{ fontSize: 26 * S }}>{emoji}</span>
        <span style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
          color: C.text, fontWeight: "700",
        }}>{label}</span>
      </div>
    </div>
  );
}

function ComparisonCard({ side, title, body, delay }: {
  side: "left" | "right"; title: string; body: string; delay: number;
}) {
  const style = useFadeUp(delay);
  const color = side === "left" ? C.red : C.primary;
  const light = side === "left" ? C.redLight : C.primaryLight;
  const border = side === "left" ? C.redBorder : C.primaryBorder;
  return (
    <div style={{ ...style }}>
      <div style={{
        background: light,
        border: `1.5px solid ${color}`,
        borderRadius: 14 * S,
        padding: `${14 * S}px ${20 * S}px`,
        height: "100%",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color, letterSpacing: "0.06em", marginBottom: 8 * S,
          textShadow: `0 0 ${6 * S}px ${color}77`,
        }}>{title}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
          color: C.text, lineHeight: 1.55, fontWeight: "700",
        }}>{body}</div>
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_12.scene1.to - SCENES_2026_05_12.scene1.from;
  // scene1 starts at 14.24s = global 427 (local = global - 427)
  //
  // Phase A — morning routine pain (local 0–688):
  //   Header at 0
  //   Step1 信箱 at 15.76s → local (472.8-427) = 46
  //   Step2 筆記 at 21.36s → local 214
  //   Step3 PM   at 24.48s → local 307
  //   Footer "百次" at 27.76s → local 405
  //   Solution callout "AI 工作流要解決" at 32.96s → local 562
  //
  // Phase B — 工作流 vs 一次性問答 (local 689+):
  //   Header at 689
  //   Comparison cards at 38.56s → local 729
  //   Notion flow card at 56.80s → local 1277
  //   Concept "工作流" at 66.64s → local 1572
  //   Reflection question at 69.12s → local 1647

  const HEADER_A_AT   = 0;
  const STEP1_AT      = 46;
  const STEP2_AT      = 214;
  const STEP3_AT      = 307;
  const FOOTER_AT     = 405;
  const SOLUTION_AT   = 562;

  // Phase A→B transition (Phase B first sentence "先來說清楚" at 37.20s → local 689)
  const A_FADE_START  = 609;   // 689 - 80
  const A_REMOVE      = 689;
  const B_SHOW_AT     = 689;

  const HEADER_B_AT   = B_SHOW_AT;
  const COMPARE_AT    = 729;   // 38.56s → local 729
  const NOTION_AT     = 1277;  // 56.80s → local 1277
  const CONCEPT_AT    = 1572;  // 66.64s → local 1572
  const QUESTION_AT   = 1647;  // 69.12s → local 1647

  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  const headerAStyle  = useFadeUp(HEADER_A_AT);
  const footerStyle   = useFadeUp(FOOTER_AT);
  const solutionStyle = useFadeUp(SOLUTION_AT);

  const headerBStyle  = useFadeUp(showB ? HEADER_B_AT : 999999);
  const compareStyle  = useFadeUp(showB ? COMPARE_AT  : 999999);
  const notionStyle   = useFadeUp(showB ? NOTION_AT   : 999999);
  const conceptStyle  = useFadeIn(showB ? CONCEPT_AT  : 999999);
  const questionStyle = useFadeUp(showB ? QUESTION_AT : 999999);

  // Concept animations
  const PAIN_CYCLE_AT     = 149;   // VTT 19.20s "每天早上開啟信箱"
  const AUTO_FLOW_AT      = 1030;  // VTT 48.56s "工作流是一個一直在運作的系統"

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerAStyle, marginBottom: 18 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
              }}>每天早上的劇本</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "700", lineHeight: 1.35,
              }}>你有沒有這種經驗？</div>
            </div>

            <StepCard emoji="📧" label="篩選重要郵件"     delay={STEP1_AT} color={C.primary} border={C.primaryBorder} />
            <StepCard emoji="📝" label="把資訊整理成筆記" delay={STEP2_AT} color={C.blue}    border={C.blueBorder} />
            <StepCard emoji="📊" label="更新到 PM 工具"   delay={STEP3_AT} color={C.yellow}  border={C.yellowBorder} />

            <div style={{ ...footerStyle, marginTop: 4 * S, marginBottom: 18 * S }}>
              <div style={{
                background: C.redLight,
                border: `1px solid ${C.redBorder}`,
                borderRadius: 12 * S,
                padding: `${12 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.red, lineHeight: 1.55, fontWeight: "700",
                }}>同樣的三步，已經手動做了 100+ 次</div>
              </div>
            </div>

            <div style={{ ...solutionStyle }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${20 * S}px ${C.primary}1a`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>AI 工作流要解決的</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.45,
                }}>重複但有規律的多步驟任務</div>
              </div>
            </div>
          </div>
        )}

        {showB && (
          <>
            <div style={{ ...headerBStyle, marginBottom: 16 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
              }}>先來說清楚</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "700", lineHeight: 1.35,
              }}>工作流 vs 一次性問答 — 差在哪？</div>
            </div>

            <div style={{ ...compareStyle, marginBottom: 16 * S }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12 * S,
              }}>
                <ComparisonCard side="left"
                  title="一次性問答"
                  body="你問，它答 — 結束。每次都要重新發問。"
                  delay={COMPARE_AT}
                />
                <ComparisonCard side="right"
                  title="工作流"
                  body="設定一次 — 它就幫你跑無數次，不需要你介入。"
                  delay={COMPARE_AT + 18}
                />
              </div>
            </div>

            <div style={{ ...notionStyle, marginBottom: 14 * S }}>
              <div style={{
                background: "rgba(0,0,0,0.6)",
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>舉個例子 · 新郵件流程</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.7,
                }}>
                  新郵件進來 → AI 自動摘要 → 分類送進 Notion → 重要的另外通知你
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.6, marginTop: 8 * S,
                }}>你不用按任何東西 — 它就完成了。</div>
              </div>
            </div>

            <div style={{
              ...conceptStyle,
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
              color: C.primary, lineHeight: 1.6, fontWeight: "700",
              marginBottom: 14 * S, textAlign: "center" as const,
            }}>
              這就是「工作流」的概念。
            </div>

            <div style={{ ...questionStyle }}>
              <div style={{
                background: "rgba(0,0,0,0.5)",
                border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>親身經歷</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55, fontWeight: "700",
                }}>你工作中有哪個「每次做法都一樣、只是很花時間」的任務，其實是可以自動化的？</div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <PainCycleAnimation triggerLocalFrame={PAIN_CYCLE_AT} />
        <AutomatedFlowAnimation triggerLocalFrame={AUTO_FLOW_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene 2 — 三個真實範例 + 共同點 + 反思 ────────────────────────────────
function ExampleScenarioCard({ icon, title, body, delay, color, border, light }: {
  icon: string; title: string; body: string; delay: number;
  color: string; border: string; light: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        background: light,
        border: `1.5px solid ${color}`,
        borderLeft: `${5 * S}px solid ${color}`,
        borderRadius: 12 * S,
        padding: `${14 * S}px ${20 * S}px`,
        boxShadow: `0 0 ${18 * S}px ${color}1a`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 8 * S,
        }}>
          <span style={{ fontSize: 26 * S }}>{icon}</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
            color, fontWeight: "700",
            textShadow: `0 0 ${6 * S}px ${color}55`,
          }}>{title}</span>
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.text, lineHeight: 1.6,
        }}>{body}</div>
      </div>
    </div>
  );
}

function Scene2() {
  const dur = SCENES_2026_05_12.scene2.to - SCENES_2026_05_12.scene2.from;
  // scene2 starts at 80.16s = global 2405 (local = global - 2405)
  //
  //   Header at 0
  //   Subhead "舉幾個例子" at 82.16s → local 60
  //   Ex1 表單 at 87.76s → local 228
  //   Ex2 電子報 at 100.24s → local 602
  //   Ex3 社群 at 112.80s → local 979
  //   共同點 callout at 124.96s → local 1344
  //   省時間 statement at 133.04s → local 1586

  const HEADER_AT     = 0;
  const SUBHEAD_AT    = 60;
  const EX1_AT        = 228;
  const EX2_AT        = 602;
  const EX3_AT        = 979;
  const SHARED_AT     = 1344;
  const SAVE_TIME_AT  = 1586;

  const headerStyle   = useFadeUp(HEADER_AT);
  const subheadStyle  = useFadeUp(SUBHEAD_AT);
  const sharedStyle   = useFadeUp(SHARED_AT);
  const saveStyle     = useFadeIn(SAVE_TIME_AT);

  // Concept animation
  const THREE_EX_AT = 228;  // VTT 87.76s "第一個"

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn scrollUp={{ at: SHARED_AT - 30, amount: 500 }}>
        <div style={{ ...headerStyle, marginBottom: 14 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
          }}>那工作流能做什麼？</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
            color: C.text, fontWeight: "700", lineHeight: 1.35,
          }}>三個真實可行的例子</div>
        </div>

        <div style={{ ...subheadStyle, marginBottom: 18 * S }}>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.muted, lineHeight: 1.55,
          }}>不是科技公司專屬 — 一般工作者也用得上</div>
        </div>

        <ExampleScenarioCard
          icon="📋" title="表單 → 自動分類 + 回信"
          body="有人填表單 → AI 分析內容、判斷優先級 → 自動發送對應的回覆郵件。你不在，它一樣跑。"
          delay={EX1_AT} color={C.primary} border={C.primaryBorder} light={C.primaryLight}
        />
        <ExampleScenarioCard
          icon="📰" title="英文電子報 → 每週重點摘要"
          body="訂閱的電子報 → AI 每週翻譯重點、整理摘要 → 送到你的 Slack 或 LINE。"
          delay={EX2_AT} color={C.blue} border={C.blueBorder} light={C.blueLight}
        />
        <ExampleScenarioCard
          icon="✨" title="社群草稿 → 你審核發布"
          body="給定主題 → AI 自動起草社群貼文 → 送到你審核後一鍵發布。"
          delay={EX3_AT} color={C.yellow} border={C.yellowBorder} light={C.yellowLight}
        />

        <div style={{ ...sharedStyle, marginBottom: 12 * S }}>
          <div style={{
            background: C.primaryLight,
            border: `1.5px solid ${C.primary}`,
            borderRadius: 14 * S,
            padding: `${14 * S}px ${22 * S}px`,
            boxShadow: `0 0 ${20 * S}px ${C.primary}1a`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
              color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>共同點</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
              color: C.text, fontWeight: "700", lineHeight: 1.45,
            }}>設定一次 — 之後重複執行，不需要你介入</div>
          </div>
        </div>

        <div style={{
          ...saveStyle,
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, lineHeight: 1.6, textAlign: "center" as const,
          padding: `${4 * S}px ${4 * S}px`,
        }}>
          這才是 AI 真正幫你省時間的方式 — 而不是每次都手動問它。
        </div>
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ThreeExamplesAnimation triggerLocalFrame={THREE_EX_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene 3 — n8n 特點 + 入門 + 監督 (Phase A/B) ──────────────────────────
function FeatureCard({ num, title, body, delay, color, border, light }: {
  num: string; title: string; body: string; delay: number;
  color: string; border: string; light: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        display: "flex", gap: 16 * S, alignItems: "flex-start",
        background: light,
        border: `1px solid ${border}`,
        borderLeft: `${5 * S}px solid ${color}`,
        borderRadius: 12 * S,
        padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
          color, fontWeight: "700", flexShrink: 0,
          textShadow: `0 0 ${8 * S}px ${color}88`,
        }}>{num}</div>
        <div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
            color, fontWeight: "700", lineHeight: 1.4, marginBottom: 6 * S,
          }}>{title}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.text, lineHeight: 1.6,
          }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_12.scene3.to - SCENES_2026_05_12.scene3.from;
  // scene3 starts at 144.96s = global 4349 (local = global - 4349)
  //
  // Phase A — n8n 三特點 + 入門 (local 0–1840):
  //   Header at 0
  //   intro n8n 是開源工具 at 150.08s → local 154
  //   Feature 1 視覺化 at 155.20s → local 308
  //   Feature 2 整合廣泛 at 164.00s → local 572
  //   Feature 3 自己架 at 180.96s → local 1080
  //   入門方法 callout at 187.84s → local 1287
  //
  // Phase B starts at "最後一個很重要的提醒" 206.32s → local 1841
  //   提醒 header at 1841
  //   "定期審核" headline at 214.32s → local 2081
  //   "對外溝通必檢查" at 221.20s → local 2287
  //   反思 question at 228.16s → local 2495

  const HEADER_AT     = 0;
  const INTRO_AT      = 154;
  const FEAT1_AT      = 308;
  const FEAT2_AT      = 572;
  const FEAT3_AT      = 1080;
  const STARTER_AT    = 1287;

  // Phase A→B transition (B first sentence at 206.32s → local 1841)
  const A_FADE_START  = 1761;     // 1841 - 80
  const A_REMOVE      = 1841;
  const B_SHOW_AT     = 1841;

  const HEADER_B_AT   = B_SHOW_AT;
  const REVIEW_AT     = 2081;     // 214.32s → local 2081
  const WARN_AT       = 2287;     // 221.20s → local 2287
  const QUESTION_AT   = 2495;     // 228.16s → local 2495

  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  const headerStyle   = useFadeUp(HEADER_AT);
  const introStyle    = useFadeUp(INTRO_AT);
  const starterStyle  = useFadeUp(STARTER_AT);

  const headerBStyle  = useFadeUp(showB ? HEADER_B_AT : 999999);
  const reviewStyle   = useFadeUp(showB ? REVIEW_AT   : 999999);
  const warnStyle     = useFadeUp(showB ? WARN_AT     : 999999);
  const questionStyle = useFadeUp(showB ? QUESTION_AT : 999999);

  // Concept animations
  const N8N_AT          = 308;   // VTT 155.20s "第一 視覺化介面"
  const SUPERVISION_AT  = 1841;  // VTT 206.32s "最後一個很重要的提醒"

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <ContentColumn scrollUp={{ at: STARTER_AT - 30, amount: 420 }}>
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 12 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
              }}>說到工具</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "700", lineHeight: 1.35,
              }}>n8n — 開源工作流自動化工具</div>
            </div>

            <div style={{ ...introStyle, marginBottom: 16 * S }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.muted, lineHeight: 1.6,
              }}>它的特點有三個 ↓</div>
            </div>

            <FeatureCard num="01" title="視覺化介面"
              body="拖拉方塊連接不同工具 — 不需寫程式（進階功能才需要）。"
              delay={FEAT1_AT} color={C.primary} border={C.primaryBorder} light={C.primaryLight}
            />
            <FeatureCard num="02" title="整合廣泛"
              body="支援幾百個服務 — Gmail、Notion、Slack、Airtable、Google Sheets、Claude、OpenAI 等。"
              delay={FEAT2_AT} color={C.blue} border={C.blueBorder} light={C.blueLight}
            />
            <FeatureCard num="03" title="可以自己架"
              body="開源版本可自己部署 — 資料不需要經過第三方。"
              delay={FEAT3_AT} color={C.yellow} border={C.yellowBorder} light={C.yellowLight}
            />

            <div style={{ ...starterStyle }}>
              <div style={{
                background: "rgba(0,0,0,0.6)",
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>入門方法</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>
                  ① 有沒有<span style={{ color: C.primary, fontWeight: "700" }}>觸發條件</span>？（例：收到新郵件）<br/>
                  ② 有沒有<span style={{ color: C.primary, fontWeight: "700" }}>固定輸出</span>？（例：寫一段摘要）<br/>
                  <span style={{ color: C.muted, fontSize: 18 * S }}>都有 → 就是好候選人</span>
                </div>
              </div>
            </div>
          </div>
        </ContentColumn>
      )}

      {showB && (
        <ContentColumn>
          <>
            <div style={{ ...headerBStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${20 * S}px ${C.yellow}1a`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>⚠ 最後一個很重要的提醒</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.45,
                }}>自動化跑起來 — 你不一定每次都會去看它做了什麼</div>
              </div>
            </div>

            <div style={{ ...reviewStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>正確心態</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55, fontWeight: "700",
                }}>定期審核輸出 — 比「設定好就不管」重要得多</div>
              </div>
            </div>

            <div style={{ ...warnStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.redLight,
                border: `1px solid ${C.redBorder}`,
                borderRadius: 12 * S,
                padding: `${12 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.red, lineHeight: 1.55, fontWeight: "700",
                }}>對外溝通的流程（例如自動回信）— 更不能完全不檢查</div>
              </div>
            </div>

            <div style={{ ...questionStyle }}>
              <div style={{
                background: "rgba(0,0,0,0.5)",
                border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>動腦時間</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55, fontWeight: "700",
                }}>如果一個工作流每天在幫你工作，但偶爾會出錯 — 你會怎麼設計「檢查機制」？</div>
              </div>
            </div>
          </>
        </ContentColumn>
      )}

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <N8nVisualNodesAnimation triggerLocalFrame={N8N_AT} />
        <SupervisionAnimation triggerLocalFrame={SUPERVISION_AT} />
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
  const dur = SCENES_2026_05_12.summary.to - SCENES_2026_05_12.summary.from;
  // summary starts at 235.20s = global 7056 (local = global - 7056)
  //
  //   Badge at 0
  //   Card1 多工具自動串接 at 237.28s → local (237.28-235.20)*30 = 62
  //   Card2 設定一次重複執行 at 247.20s → local 360
  //   Card3 n8n + 監督 at 254.00s → local 564
  //   Outro 自動化不等於免監督 at 265.44s → local 907
  //   Bye at 268.96s → local 1013

  const BADGE_AT  = 0;
  const CARD1_AT  = 62;
  const CARD2_AT  = 360;
  const CARD3_AT  = 564;
  const OUTRO_AT  = 907;

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
          title="工作流 = 多工具自動串接"
          text="從一次性問答升級成持續運作的系統"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="02" delay={CARD2_AT}
          title="設定一次 · 重複執行"
          text="才是 AI 真正幫你省時間的方式"
          color={C.blue} border={C.blue}
        />
        <SummaryCard
          number="03" delay={CARD3_AT}
          title="n8n + 定期審核"
          text="從一個重複動作開始入門 — 但自動化不等於免監督"
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
export function VideoComposition_2026_05_12() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_12.scene1;
  const S2 = SCENES_2026_05_12.scene2;
  const S3 = SCENES_2026_05_12.scene3;
  const SU = SCENES_2026_05_12.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-05-12-processed.wav")} volume={1.0} />
      <Audio src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_05_12 - 150, TOTAL_FRAMES_2026_05_12],
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
