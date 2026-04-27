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

// ── Scale & canvas (4K = 3840×2160) ──────────────────────────────────────────
const S = 3;
const W = 1280 * S;  // 3840
const H = 720  * S;  // 2160
const NAV_H         = 50  * S;  // 150px
const CONTAINER_W   = 640 * S;  // 1920px
const COL_LEFT      = (W - CONTAINER_W) / 2;  // 960px
const SUBTITLE_SAFE = 120 * S;  // 360px — 勿改
const CONTENT_GAP   = 10  * S;  // 30px
const CONTENT_TOP   = NAV_H + CONTENT_GAP;           // 180px
const CONTENT_H     = H - CONTENT_TOP - SUBTITLE_SAFE; // 1620px

// ── Design tokens ─────────────────────────────────────────────────────────────
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

// ── iMessage constants ────────────────────────────────────────────────────────
const NOTIF_W       = 290 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLOT    = 148 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ──────────────────────────────────────
// TitleScene:    0s  → 39.200s  → 0    → 1176f
// Scene1 Mythos: 39.200s → 184.400s → 1176 → 5532f
// Scene2 Muse:   184.400s → 323.920s → 5532 → 9718f
// Scene3 微軟:   323.920s → 454.160s → 9718 → 13625f
// SummaryScene:  454.160s → 510.633s → 13625 → 15319f
export const SCENES_2026_04_10 = {
  title:   { from: 0,     to: 1176  },
  scene1:  { from: 1176,  to: 5532  },
  scene2:  { from: 5532,  to: 9718  },
  scene3:  { from: 9718,  to: 13625 },
  summary: { from: 13625, to: 15319 },
} as const;
export const TOTAL_FRAMES_2026_04_10 = 15319;

const CHAPTERS = [
  { label: "今日焦點",         start: 0     },
  { label: "Anthropic Mythos", start: 1176  },
  { label: "Meta Muse Spark",  start: 5532  },
  { label: "微軟 MAI 三連發",  start: 9718  },
  { label: "重點整理",         start: 13625 },
] as const;

// ── iMessage callouts (global frames) ────────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // 02:56.880 = 176.88s × 30 = 5306 global
  { from: 5100, to: 5532, sender: "想一想", text: "你願意給 AI 多少自主權？這是每個人都得開始思考的問題" },
  // 05:16.160 = 316.16s × 30 = 9484 global
  { from: 9300, to: 9718, sender: "選擇題", text: "如果你在公司導入 AI 工具，你會選開源自己架，還是用閉源 API？兩種策略各有什麼風險" },
  // 07:29.760 = 449.76s × 30 = 13492 global
  { from: 13300, to: 13625, sender: "思考題", text: "你每天工作中有哪些非文字資訊？AI 要真正幫到你，還需要學會哪些感官？" },
];

// ── Easing tokens ─────────────────────────────────────────────────────────────
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

// ── Standard hooks ─────────────────────────────────────────────────────────────
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

// ── WordReveal ─────────────────────────────────────────────────────────────────
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

// ── SceneFade ──────────────────────────────────────────────────────────────────
function SceneFade({ children, durationInFrames }: { children: React.ReactNode; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const fadeIn  = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return <div style={{ opacity: Math.min(fadeIn, fadeOut), height: "100%" }}>{children}</div>;
}

// ── ContentColumn ──────────────────────────────────────────────────────────────
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

// ── Background ─────────────────────────────────────────────────────────────────
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

// ── ProgressBar ────────────────────────────────────────────────────────────────
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
          fontSize: 12 * S, color: C.muted,
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

// ── iMessage Callout system ────────────────────────────────────────────────────
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
      <div style={{ display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 6 * S }}>
        <div style={{
          width: 10 * S, height: 10 * S, borderRadius: "50%", background: C.primary,
          boxShadow: `0 0 ${6 * S}px ${C.primary}`,
        }} />
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 14 * S, color: C.primary,
          letterSpacing: "0.05em",
        }}>{callout.sender}</span>
      </div>
      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S, color: C.text,
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

// MG-2: ZeroDayBurstAnimation — Scene1, LEFT side
// VTT source: 00:41.440 = 41.44s × 30 = 1243 global → local = 1243 - 1176 = 67
// triggerLocalFrame: 67 (spec says ~50, using VTT-precise 67)
// Represents: 盾牌裂縫 → 數千個漏洞向外爆散
function ZeroDayBurstAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 300;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const shieldScale = easeOutBack(prog(f, 22));
  const crackOp = interpolate(Math.max(0, f - 30), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const burstDots = [
    { dx: -55, dy: -40, delay: 40 },
    { dx:  60, dy: -50, delay: 50 },
    { dx: -70, dy:  10, delay: 45 },
    { dx:  65, dy:  30, delay: 55 },
    { dx: -30, dy:  60, delay: 48 },
    { dx:  40, dy:  55, delay: 52 },
  ];

  const count = Math.round(interpolate(Math.max(0, f - 80), [0, 100], [0, 3000], { easing: E.outExpo, extrapolateRight: "clamp" }));

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
    }}>
      <div style={{ position: "relative", width: 180 * S, height: 180 * S }}>
        {/* Shield */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%,-50%) scale(${shieldScale})`,
          width: 80 * S, height: 90 * S,
          background: "rgba(255,107,107,0.08)",
          border: `${3 * S}px solid ${C.red}`,
          borderRadius: `${16 * S}px ${16 * S}px ${40 * S}px ${40 * S}px`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28 * S,
          boxShadow: `0 0 ${20 * S}px rgba(255,107,107,0.3)`,
        }}>🛡️</div>

        {/* Crack flash */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          opacity: crackOp, fontSize: 22 * S, color: C.red,
          textShadow: `0 0 ${10 * S}px ${C.red}`,
          pointerEvents: "none",
        }}>⚡</div>

        {/* Burst dots radiating out */}
        {burstDots.map((dot, i) => {
          const dotF = Math.max(0, f - dot.delay);
          const radius = interpolate(dotF, [0, 50], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
          const dotOp = interpolate(dotF, [0, 10, 50, 80], [0, 1, 0.8, 0.3], { extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              position: "absolute", top: "50%", left: "50%",
              transform: `translate(calc(-50% + ${dot.dx * radius * S}px), calc(-50% + ${dot.dy * radius * S}px))`,
              width: 10 * S, height: 10 * S, borderRadius: "50%",
              background: C.red, opacity: dotOp,
              boxShadow: `0 0 ${8 * S}px ${C.red}`,
            }} />
          );
        })}
      </div>

      <div style={{
        opacity: interpolate(Math.max(0, f - 20), [0, 16], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
        fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
        color: C.red, letterSpacing: "0.06em", textAlign: "center" as const,
      }}>零日漏洞</div>

      <div style={{
        opacity: interpolate(Math.max(0, f - 80), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
        textAlign: "center" as const,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 28 * S,
          color: C.red, fontWeight: "700",
          textShadow: `0 0 ${16 * S}px rgba(255,107,107,0.6)`, lineHeight: 1,
        }}>{count.toLocaleString()}+</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
          color: C.muted, marginTop: 4 * S,
        }}>個安全漏洞</div>
      </div>
    </div>
  );
}

// MG-1: AgentAutonomyAnimation — Scene1, RIGHT side
// VTT source: 01:18.800 = 78.8s × 30 = 2364 global → local = 2364 - 1176 = 1188
// triggerLocalFrame: 1188
// Represents: 大腦 + 四步驟環形自主循環 (AI Agent 核心)
function AgentAutonomyAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 906;
  const envelope = interpolate(f, [0, 10, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const pulse = Math.sin(f * 0.07) * 0.1 + 0.9;
  const brainScale = easeOutBack(prog(f, 22));

  // Steps synced to VTT (triggerLocalFrame=2414):
  // 「目標」  01:59.680 → immediate (delay 15)
  // 「拆解」  02:10.880 → f = (130.88-119.68)×30 = 336
  // 「執行」  02:13.200 → f = (133.2-119.68)×30  = 406
  // 「完成」  02:24.880 → f = (144.88-119.68)×30 = 756
  const steps = [
    { label: "目標", angle: -90, delay: 15,  color: C.primary },
    { label: "拆解", angle:   0, delay: 336, color: C.yellow  },
    { label: "執行", angle:  90, delay: 406, color: C.yellow  },
    { label: "完成", angle: 180, delay: 756, color: C.primary },
  ];
  const radius = 75 * S;

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
    }}>
      <div style={{ position: "relative", width: 220 * S, height: 220 * S }}>
        {/* Central brain */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%,-50%) scale(${pulse * brainScale})`,
          width: 70 * S, height: 70 * S,
          borderRadius: "50%",
          background: "rgba(124,255,178,0.12)",
          border: `${3 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28 * S,
          boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.5)`,
        }}>🧠</div>

        {/* Step nodes */}
        {steps.map((step, i) => {
          const rad = (step.angle * Math.PI) / 180;
          const cx = 110 * S + Math.cos(rad) * radius;
          const cy = 110 * S + Math.sin(rad) * radius;
          const stepF = Math.max(0, f - step.delay);
          const stepOp = interpolate(stepF, [0, 16], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const stepScale = easeOutBack(prog(stepF, 20));
          const lineLen = interpolate(stepF, [0, 20], [0, radius - 35 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
          const arrowAngle = step.angle + 180;
          return (
            <React.Fragment key={i}>
              <div style={{
                position: "absolute", top: cy, left: cx,
                width: lineLen, height: 2 * S,
                background: `linear-gradient(to right, ${step.color}88, transparent)`,
                transformOrigin: "0 50%",
                transform: `rotate(${arrowAngle}deg) translateY(-50%)`,
                opacity: stepOp,
              }} />
              <div style={{
                position: "absolute",
                left: cx - 22 * S, top: cy - 14 * S,
                opacity: stepOp,
                transform: `scale(${stepScale})`,
                background: `${step.color}18`,
                border: `1.5px solid ${step.color}`,
                borderRadius: 8 * S,
                padding: `${5 * S}px ${10 * S}px`,
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 16 * S, color: step.color, fontWeight: "700",
                textAlign: "center" as const, whiteSpace: "nowrap" as const,
              }}>{step.label}</div>
            </React.Fragment>
          );
        })}
      </div>

      <div style={{
        opacity: interpolate(Math.max(0, f - 30), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
        fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
        color: C.primary, letterSpacing: "0.08em", textAlign: "center" as const, marginTop: 4 * S,
      }}>AI Agent 自主循環</div>
    </div>
  );
}

// MG-4: MetaShiftAnimation — Scene2, LEFT side
// VTT source: 03:23.360 = 203.36s × 30 = 6100 global → local = 6100 - 5532 = 568
// triggerLocalFrame: 568
// Represents: Llama 開源 → 箭頭動畫 → Muse Spark 閉源 + 數字統計
function MetaShiftAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  // DURATION covers trigger(1030) → 流量450%(local 1901) + buffer
  // stat1: f = 1658-1030 = 628 (App 87%,  VTT 03:59.680)
  // stat2: f = 1901-1030 = 871 (流量 450%, VTT 04:07.760)
  const DURATION = 1050;
  const envelope = interpolate(f, [0, 10, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const llamaOp = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const llamaTy = interpolate(f, [0, 18], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const arrowScale = interpolate(Math.max(0, f - 30), [0, 25], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const closedOp = interpolate(Math.max(0, f - 60), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const closedTy = interpolate(Math.max(0, f - 60), [0, 18], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const stat1Op = interpolate(Math.max(0, f - 628), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const stat2Op = interpolate(Math.max(0, f - 871), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 210 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 * S,
      width: 220 * S,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
        {/* Llama open */}
        <div style={{
          opacity: llamaOp, transform: `translateY(${llamaTy}px)`,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 10 * S, padding: `${7 * S}px ${12 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
        }}>
          <span style={{ fontSize: 22 * S }}>🦙</span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.primary, letterSpacing: "0.06em",
          }}>開源</span>
        </div>

        {/* Arrow */}
        <div style={{
          width: 40 * S, height: 3 * S,
          background: `linear-gradient(to right, ${C.muted}, ${C.red})`,
          borderRadius: 2 * S,
          transformOrigin: "left center",
          transform: `scaleX(${arrowScale})`,
          position: "relative",
        }}>
          <div style={{
            position: "absolute", right: 0, top: "50%",
            transform: "translateY(-50%)",
            fontSize: 12 * S, color: C.red,
          }}>▶</div>
        </div>

        {/* Lock closed */}
        <div style={{
          opacity: closedOp, transform: `translateY(${closedTy}px)`,
          background: C.redLight, border: `1px solid ${C.redBorder}`,
          borderRadius: 10 * S, padding: `${7 * S}px ${12 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
        }}>
          <span style={{ fontSize: 22 * S }}>🔒</span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.red, letterSpacing: "0.06em",
          }}>閉源</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S }}>
        <div style={{
          opacity: stat1Op,
          fontFamily: "'Space Mono', monospace", fontSize: 14 * S, color: C.yellow,
          background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
          borderRadius: 6 * S, padding: `${5 * S}px ${10 * S}px`,
        }}>App ↑ 87%</div>
        <div style={{
          opacity: stat2Op,
          fontFamily: "'Space Mono', monospace", fontSize: 14 * S, color: C.yellow,
          background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
          borderRadius: 6 * S, padding: `${5 * S}px ${10 * S}px`,
        }}>流量 ↑ 450%</div>
      </div>
    </div>
  );
}

// MG-3: OpenClosedAnimation — Scene2, RIGHT side
// VTT source: 03:46.960 = 226.96s × 30 = 6808.8 global → local = 6809 - 5532 = 1277
// triggerLocalFrame: 1277
// Represents: 開源 📦 vs 閉源 🔐 左右對比
function OpenClosedAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  // trigger=1277, Phase B starts at 2130 → survives through Phase B open/closed explanation
  const DURATION = 880;
  const envelope = interpolate(f, [0, 10, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const leftOp  = interpolate(f, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const leftTy  = interpolate(f, [0, 20], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const divOp   = interpolate(Math.max(0, f - 15), [0, 18], [0, 0.4], { easing: E.outCubic, extrapolateRight: "clamp" });
  const rightOp = interpolate(Math.max(0, f - 25), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const rightTy = interpolate(Math.max(0, f - 25), [0, 20], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const flyIcons = ["📦", "🔧", "⚡"];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 10 * S,
      width: 200 * S,
    }}>
      <div style={{ display: "flex", gap: 0, alignItems: "flex-start" }}>
        {/* Open left */}
        <div style={{
          opacity: leftOp, transform: `translateY(${leftTy}px)`,
          flex: 1,
          background: C.primaryLight, border: `1.5px solid ${C.primaryBorder}`,
          borderRadius: `${10 * S}px 0 0 ${10 * S}px`,
          padding: `${10 * S}px ${10 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
        }}>
          <span style={{ fontSize: 24 * S }}>📦</span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.primary, letterSpacing: "0.06em",
          }}>開源</span>
          <div style={{ display: "flex", gap: 6 * S }}>
            {flyIcons.map((icon, i) => {
              const iconF = Math.max(0, f - (30 + i * 20));
              const iconOp = interpolate(iconF, [0, 16], [0, 0.85], { easing: E.outCubic, extrapolateRight: "clamp" });
              const iconTy = interpolate(iconF, [0, 20], [0, -12 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
              return (
                <span key={i} style={{
                  fontSize: 14 * S, opacity: iconOp,
                  transform: `translateY(${iconTy}px)`, display: "inline-block",
                }}>{icon}</span>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{
          opacity: divOp, width: 1.5 * S, alignSelf: "stretch",
          background: "rgba(255,255,255,0.3)",
        }} />

        {/* Closed right */}
        <div style={{
          opacity: rightOp, transform: `translateY(${rightTy}px)`,
          flex: 1,
          background: C.redLight, border: `1.5px solid ${C.redBorder}`,
          borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
          padding: `${10 * S}px ${10 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
        }}>
          <span style={{ fontSize: 24 * S }}>🔐</span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.red, letterSpacing: "0.06em",
          }}>閉源</span>
          <span style={{
            fontSize: 18 * S, color: C.red,
            opacity: interpolate(Math.max(0, f - 50), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
          }}>✕</span>
        </div>
      </div>

      <div style={{
        opacity: interpolate(Math.max(0, f - 60), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
        display: "flex", justifyContent: "space-around",
      }}>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
          color: C.primary, textAlign: "center" as const,
        }}>透明・可客製</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
          color: C.red, textAlign: "center" as const,
        }}>依賴廠商</div>
      </div>
    </div>
  );
}

// MG-5: ModalitySensesAnimation — Scene3, RIGHT side
// VTT source: 06:23.120 = 383.12s × 30 = 11493 global → local = 11493 - 9718 = 1775
// triggerLocalFrame: 1775
// Sense VTT timing (f = VTT_global - 9718 - 1775):
//   👂 06:28.560 = 11656 global → local 1938 → f = 163
//   💬 06:29.600 = 11688 global → local 1970 → f = 195
//   👁️ 06:30.400 = 11712 global → local 1994 → f = 219
function ModalitySensesAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 280;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const brainPulse = Math.sin(f * 0.06) * 0.1 + 0.9;
  const brainScale = easeOutBack(prog(f, 18));

  const senses = [
    { icon: "👂", label: "聽", color: C.primary, appearsAt: 163, angle: -90 },
    { icon: "💬", label: "說", color: C.yellow,  appearsAt: 195, angle:  30 },
    { icon: "👁️", label: "看", color: C.primary, appearsAt: 219, angle: 150 },
  ];
  const senseRadius = 70 * S;

  const allLitF = Math.max(0, f - 225);
  const glowStrength = interpolate(allLitF, [0, 25], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
    }}>
      <div style={{ position: "relative", width: 200 * S, height: 200 * S }}>
        {/* Brain */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%,-50%) scale(${brainPulse * brainScale})`,
          width: 66 * S, height: 66 * S,
          borderRadius: "50%",
          background: `rgba(124,255,178,${0.12 + glowStrength * 0.2})`,
          border: `${3 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26 * S,
          boxShadow: `0 0 ${(20 + glowStrength * 30) * S}px rgba(124,255,178,${0.35 + glowStrength * 0.4})`,
        }}>🧠</div>

        {/* Sense nodes */}
        {senses.map((sense, i) => {
          const rad = (sense.angle * Math.PI) / 180;
          const cx = 100 * S + Math.cos(rad) * senseRadius;
          const cy = 100 * S + Math.sin(rad) * senseRadius;
          const senseF = Math.max(0, f - sense.appearsAt);
          const senseOp = interpolate(senseF, [0, 16], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const senseScale = easeOutBack(prog(senseF, 18));
          const lineLen = interpolate(senseF, [0, 20], [0, senseRadius - 33 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
          const lineAngle = sense.angle + 180;
          return (
            <React.Fragment key={i}>
              <div style={{
                position: "absolute", top: cy, left: cx,
                width: lineLen, height: 2 * S,
                background: `linear-gradient(to right, ${sense.color}66, transparent)`,
                transformOrigin: "0 50%",
                transform: `rotate(${lineAngle}deg) translateY(-50%)`,
                opacity: senseOp,
              }} />
              <div style={{
                position: "absolute",
                left: cx - 22 * S, top: cy - 22 * S,
                opacity: senseOp,
                transform: `scale(${senseScale})`,
                width: 44 * S, height: 44 * S, borderRadius: "50%",
                background: `${sense.color}18`,
                border: `2px solid ${sense.color}`,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 2 * S,
                boxShadow: senseF > 16 ? `0 0 ${12 * S}px ${sense.color}66` : "none",
              }}>
                <span style={{ fontSize: 16 * S, lineHeight: 1 }}>{sense.icon}</span>
                <span style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 11 * S,
                  color: sense.color, fontWeight: "700",
                }}>{sense.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div style={{
        opacity: interpolate(Math.max(0, f - 230), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
        fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
        color: C.primary, letterSpacing: "0.08em",
        textAlign: "center" as const, marginTop: 6 * S,
        textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.5)`,
      }}>多模態 AI</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_04_10.title.to - SCENES_2026_04_10.title.from;
  const badgeOp      = useFadeIn(5);
  const subtitleStyle = useFadeUp(34);
  const tagStyle     = useFadeUp(50);

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
            fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${4 * S}px ${14 * S}px`,
          }}>每日 AI 知識庫</span>
        </div>

        {/* H1 line 1 */}
        <h1 style={{
          margin: 0, lineHeight: 1.2,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 34 * S, color: C.text,
        }}>
          <WordReveal
            text="Anthropic 推出「太危險不公開」的 Mythos"
            startFrame={10} staggerPerWord={5}
            fontSize={34 * S} color={C.text}
            fontFamily="'Noto Sans TC', sans-serif" fontWeight={900}
          />
        </h1>

        {/* H1 line 2 */}
        <h1 style={{
          margin: 0, lineHeight: 1.25, marginTop: 6 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 28 * S, color: C.primary,
        }}>
          <WordReveal
            text="Meta 告別開源路線"
            startFrame={32} staggerPerWord={6}
            fontSize={28 * S} color={C.primary}
            fontFamily="'Noto Sans TC', sans-serif" fontWeight={900}
          />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle,
          marginTop: 22 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 20 * S, color: C.muted, lineHeight: 1.65,
        }}>
          三件大事 × 三個 AI 概念——AI Agent、開源 vs 閉源、多模態 AI
        </p>

        {/* Tags */}
        <div style={{ ...tagStyle, marginTop: 16 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>Mythos · Muse Spark · MAI · Agent · 多模態</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — Anthropic Mythos ──────────────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_10.scene1.to - SCENES_2026_04_10.scene1.from;

  // VTT local anchors (global - 1176):
  // 00:41.440 → local 67   (Mythos發布)
  // 01:05.360 → local 784  (Project Glasswing)
  // 01:13.040 → local 834  (資安能力)
  // 01:22.640 → local 1102 (零日漏洞)
  // 01:30.240 → local 1327 (FreeBSD 17年)
  // 01:59.680 → local 2514 (AI Agent概念)
  // 02:06.160 → local 2608 (一般AI vs Agent)
  // 02:13.200 → local 2820 (AI安全)

  const HEADER_AT   = 0;
  const PARTNERS_AT = 700;
  const ZEROBUG_AT  = 950;
  const FREEBSD_AT  = 1200;

  const A_FADE_START = 2460;
  const A_REMOVE     = 2510;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Element fade-out: header + partners fade out before freebsd appears
  const HP_FADE_START = FREEBSD_AT - 120; // 1080
  const HP_REMOVE     = FREEBSD_AT - 10;  // 1190
  const showHP        = showA && frame < HP_REMOVE;
  const hpOpacity     = frame > HP_FADE_START
    ? interpolate(frame, [HP_FADE_START, HP_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT     = 2510;
  const AGENT_DEF_AT  = 2510;
  const AGENT_STEP1_AT = 2650;
  const AGENT_STEP2_AT = 2730;
  const SAFETY_AT     = 2830;
  const showB         = frame >= B_SHOW_AT;

  const headerStyle   = useFadeUp(HEADER_AT);
  const partnersStyle = useFadeUp(PARTNERS_AT);
  const zerobugStyle  = useFadeUp(ZEROBUG_AT);
  const freebsdStyle  = useFadeUp(FREEBSD_AT);
  const agentDefStyle = useFadeUp(showB ? AGENT_DEF_AT   : 999999);
  const step1Style    = useFadeUp(showB ? AGENT_STEP1_AT : 999999);
  const step2Style    = useFadeUp(showB ? AGENT_STEP2_AT : 999999);
  const safetyStyle   = useFadeUp(showB ? SAFETY_AT      : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Header + Partners: fade out before FreeBSD card appears */}
            {showHP && (
              <div style={{ opacity: hpOpacity }}>
            {/* Section badge + Mythos card */}
            <div style={{ ...headerStyle, marginBottom: 14 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                marginBottom: 10 * S,
              }}>ANTHROPIC × MYTHOS</div>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${28 * S}px rgba(124,255,178,0.06)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 32 * S,
                  color: C.primary, fontWeight: "700", letterSpacing: "0.05em",
                  textShadow: `0 0 ${18 * S}px rgba(124,255,178,0.5)`, marginBottom: 8 * S,
                }}>Mythos</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.6,
                }}>Anthropic 最新模型——<span style={{ color: C.yellow, fontWeight: "700" }}>強到不敢對外公開</span></div>
              </div>
            </div>

            {/* Partners card */}
            <div style={{ ...partnersStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>僅開放 40 個合作夥伴</div>
                <div style={{ display: "flex", gap: 10 * S, flexWrap: "wrap" as const }}>
                  {["AWS", "Apple", "Google", "微軟", "CrowdStrike"].map((p, i) => (
                    <span key={i} style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                      color: C.primary, background: C.primaryLight,
                      border: `1px solid ${C.primaryBorder}`,
                      borderRadius: 4 * S, padding: `${3 * S}px ${10 * S}px`,
                    }}>{p}</span>
                  ))}
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                  color: C.muted, marginTop: 10 * S, lineHeight: 1.5,
                }}>透過 <span style={{ color: C.primary }}>Project Glasswing</span> 計劃使用</div>
              </div>
            </div>
              </div>
            )}

            {/* Zero-day card */}
            <div style={{ ...zerobugStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.redLight, border: `1.5px solid ${C.red}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(255,107,107,0.1)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
                  color: C.red, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>⚠ 資安能力</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.4,
                }}>
                  掃描主流作業系統與瀏覽器<br />
                  找到 <span style={{ color: C.red, fontSize: 28 * S }}>數千個</span>零日漏洞
                </div>
              </div>
            </div>

            {/* FreeBSD */}
            <div style={{ ...freebsdStyle }}>
              <div style={{
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>最誇張的案例</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.6,
                }}>
                  FreeBSD 藏了 <span style={{ color: C.yellow, fontWeight: "700" }}>17 年</span>的遠端執行漏洞——
                  Mythos 完全自主找到，還驗證可利用
                </div>
              </div>
            </div>
          </div>
        )}

        {showB && (
          <>
            <div style={{ ...agentDefStyle, marginBottom: 16 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                marginBottom: 10 * S,
              }}>AI AGENT 概念</div>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.08)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: "700", marginBottom: 10 * S,
                }}>AI Agent = AI 代理人</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.65,
                }}>一般 AI：你問一句，它答一句</div>
              </div>
            </div>

            <div style={{ ...step1Style, marginBottom: 12 * S }}>
              <div style={{
                background: C.primaryLight, border: `1.5px solid ${C.primaryBorder}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.4,
                }}>
                  Agent：給它一個<span style={{ color: C.primary }}>目標</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.6, marginTop: 6 * S,
                }}>自己拆解步驟 → 呼叫工具 → 做決策 → 執行到完成</div>
              </div>
            </div>

            <div style={{ ...step2Style, marginBottom: 12 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.6,
                }}>
                  Mythos 被指派「找安全漏洞」，就<span style={{ color: C.primary, fontWeight: "700" }}>自己一步步去做</span>，完全不需要人介入
                </div>
              </div>
            </div>

            <div style={{ ...safetyStyle }}>
              <div style={{
                background: C.yellowLight, border: `1.5px solid ${C.yellow}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(255,209,102,0.1)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>AI 安全</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>當 AI 有能力自主行動，我們怎麼確保它只做我們希望它做的事？</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                  color: C.muted, marginTop: 8 * S, lineHeight: 1.5,
                }}>Anthropic 選擇不公開，正是因為目前還無法保證這一點</div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ZeroDayBurstAnimation triggerLocalFrame={1188} />
        <AgentAutonomyAnimation triggerLocalFrame={2414} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — Meta Muse Spark ───────────────────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_10.scene2.to - SCENES_2026_04_10.scene2.from;

  // VTT local anchors (global - 5532):
  // 03:09.280 → local 146   (Muse Spark)
  // 03:20.800 → local 492   (Alexandr Wang)
  // 03:23.360 → local 568   ← MetaShiftAnimation trigger
  // 03:38.720 → local 1029  (不開源)
  // 03:42.960 → local 1157  (路線轉變)
  // 03:46.960 → local 1277  ← OpenClosedAnimation trigger
  // 03:59.680 → local 1901  (App 統計)
  // 04:15.440 → local 2134  (理解開源閉源)

  const HEADER_AT  = 0;
  const FEATURES_AT = 300;
  const CLOSED_AT  = 900;

  const A_FADE_START = 2080;
  const A_REMOVE     = 2130;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT     = 2130;
  const OPEN_DEF_AT   = 2130;
  const OPEN_PROS_AT  = 2380;
  const CLOSED_DEF_AT = 2600;
  const RISK_AT       = 2900;
  const showB         = frame >= B_SHOW_AT;

  // Element fade-out: 開源兩張卡在閉源出現前 fade out + DOM 移除
  const OPEN_FADE_START = CLOSED_DEF_AT - 120; // 2480
  const OPEN_REMOVE     = CLOSED_DEF_AT - 10;  // 2590
  const showOpen        = showB && frame < OPEN_REMOVE;
  const openGroupOpacity = frame > OPEN_FADE_START
    ? interpolate(frame, [OPEN_FADE_START, OPEN_REMOVE], [1, 0], clamp) : 1;

  const headerStyle    = useFadeUp(HEADER_AT);
  const featuresStyle  = useFadeUp(FEATURES_AT);
  const closedStyle    = useFadeUp(CLOSED_AT);
  const openDefStyle   = useFadeUp(showB ? OPEN_DEF_AT   : 999999);
  const openProsStyle  = useFadeUp(showB ? OPEN_PROS_AT  : 999999);
  const closedDefStyle = useFadeUp(showB ? CLOSED_DEF_AT : 999999);
  const riskStyle      = useFadeUp(showB ? RISK_AT       : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 14 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                marginBottom: 10 * S,
              }}>META × MUSE SPARK</div>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.06)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 28 * S,
                  color: C.primary, fontWeight: "700", letterSpacing: "0.05em",
                  textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.5)`, marginBottom: 8 * S,
                }}>Muse Spark</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.6,
                }}>前 Scale AI 執行長 Alexandr Wang 加入 Meta 後<br />第一個正式發布的模型</div>
              </div>
            </div>

            <div style={{ ...featuresStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>功能亮點</div>
                <div style={{ display: "flex", gap: 10 * S, flexWrap: "wrap" as const }}>
                  {["文字", "語音", "圖片 輸入", "健康問答", "複雜推理"].map((ft, i) => (
                    <span key={i} style={{
                      fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                      color: C.text, background: "rgba(255,255,255,0.06)",
                      border: `1px solid rgba(255,255,255,0.1)`,
                      borderRadius: 6 * S, padding: `${4 * S}px ${10 * S}px`,
                    }}>{ft}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ ...closedStyle }}>
              <div style={{
                background: C.redLight, border: `1.5px solid ${C.red}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(255,107,107,0.1)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
                  color: C.red, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>最大新聞</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.4,
                }}>Muse Spark 是<span style={{ color: C.red }}>閉源</span>的</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.6, marginTop: 8 * S,
                }}>Meta 非常大的路線轉變——過去 Llama 系列全球免費下載<br />
                  Muse Spark 僅透過 Meta AI App 和網頁提供</div>
                <div style={{ display: "flex", gap: 16 * S, marginTop: 14 * S, flexWrap: "wrap" as const }}>
                  {[
                    { label: "App 下載量", value: "↑ 87%"  },
                    { label: "網站流量",   value: "↑ 450%" },
                  ].map((stat, i) => (
                    <div key={i} style={{
                      background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                      borderRadius: 8 * S, padding: `${8 * S}px ${14 * S}px`,
                    }}>
                      <div style={{
                        fontFamily: "'Space Mono', monospace", fontSize: 13 * S, color: C.muted,
                      }}>{stat.label}</div>
                      <div style={{
                        fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
                        color: C.yellow, fontWeight: "700",
                        textShadow: `0 0 ${10 * S}px rgba(255,209,102,0.5)`,
                      }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showB && (
          <>
            {/* 開源兩張卡：在閉源出現前 fade out + DOM 移除 */}
            {showOpen && (
              <div style={{ opacity: openGroupOpacity }}>
            <div style={{ ...openDefStyle, marginBottom: 14 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                marginBottom: 10 * S,
              }}>開源 vs 閉源</div>
              <div style={{
                background: C.primaryLight, border: `1.5px solid ${C.primaryBorder}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.primary, fontWeight: "700", marginBottom: 8 * S,
                }}>開源模型</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>核心結構和參數公開，任何人可下載、修改、部署</div>
                <div style={{ display: "flex", gap: 8 * S, marginTop: 10 * S, flexWrap: "wrap" as const }}>
                  {["Meta Llama", "Mistral"].map((m, i) => (
                    <span key={i} style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
                      color: C.muted, background: "rgba(255,255,255,0.06)",
                      border: `1px solid rgba(255,255,255,0.1)`,
                      borderRadius: 4 * S, padding: `${3 * S}px ${8 * S}px`,
                    }}>{m}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ ...openProsStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 10 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
                  color: C.muted, letterSpacing: "0.06em", marginBottom: 8 * S,
                }}>開源優缺點</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 17 * S,
                  color: C.primary, lineHeight: 1.6,
                }}>優：透明・可客製・不依賴單一公司</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 17 * S,
                  color: C.muted, lineHeight: 1.6, marginTop: 4 * S,
                }}>缺：最頂尖能力通常閉源的先出來</div>
              </div>
            </div>
            </div>
            )}

            <div style={{ ...closedDefStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.redLight, border: `1.5px solid ${C.redBorder}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.red, fontWeight: "700", marginBottom: 8 * S,
                }}>閉源模型</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>只能透過 API 或產品使用，核心技術不公開</div>
                <div style={{ display: "flex", gap: 8 * S, marginTop: 10 * S, flexWrap: "wrap" as const }}>
                  {["OpenAI GPT", "Anthropic Claude", "Google Gemini"].map((m, i) => (
                    <span key={i} style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
                      color: C.muted, background: "rgba(255,255,255,0.06)",
                      border: `1px solid rgba(255,255,255,0.1)`,
                      borderRadius: 4 * S, padding: `${3 * S}px ${8 * S}px`,
                    }}>{m}</span>
                  ))}
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 17 * S,
                  color: C.primary, lineHeight: 1.6, marginTop: 10 * S,
                }}>優：通常最強・持續更新</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 17 * S,
                  color: C.muted, lineHeight: 1.6, marginTop: 4 * S,
                }}>缺：完全依賴對方；漲價也只能接受</div>
              </div>
            </div>

            <div style={{ ...riskStyle }}>
              <div style={{
                background: C.yellowLight, border: `1.5px solid ${C.yellow}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${18 * S}px rgba(255,209,102,0.1)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>趨勢影響</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>Meta 從開源轉閉源——<span style={{ color: C.yellow, fontWeight: "700" }}>原本可以免費自己架的強力模型，未來可能越來越少</span></div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <MetaShiftAnimation triggerLocalFrame={1030} />
        <OpenClosedAnimation triggerLocalFrame={1277} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 微軟 MAI 三連發 ────────────────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_10.scene3.to - SCENES_2026_04_10.scene3.from;

  // VTT local anchors (global - 9718):
  // 05:30.400 → local 194   (微軟同一週)
  // 05:40.720 → local 503   (三款分別是)
  // 05:46.080 → local 664   (MAI-Transcribe-1)
  // 05:54.000 → local 902   (MAI-Voice-1)
  // 06:01.120 → local 1115  (MAI-Image-2)
  // 06:23.120 → local 1775  ← ModalitySensesAnimation trigger
  // 06:27.760 → local 1914  (三種感官)

  const HEADER_AT  = 0;
  const INTRO_AT   = 120;
  const MODEL1_AT  = 540;
  const MODEL2_AT  = 780;
  const MODEL3_AT  = 1020;

  const A_FADE_START = 1740;
  const A_REMOVE     = 1790;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Element fade-out: header + intro fade out before model3 appears
  const HI_FADE_START = MODEL3_AT - 120; // 900
  const HI_REMOVE     = MODEL3_AT - 10;  // 1010
  const showHI        = showA && frame < HI_REMOVE;
  const hiOpacity     = frame > HI_FADE_START
    ? interpolate(frame, [HI_FADE_START, HI_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT    = 1790;
  const MODAL_DEF_AT = 1790;
  const MODAL_EX_AT  = 2000;
  const EMBED_AT     = 2300;
  const showB        = frame >= B_SHOW_AT;

  const headerStyle   = useFadeUp(HEADER_AT);
  const introStyle    = useFadeUp(INTRO_AT);
  const model1Style   = useFadeUp(MODEL1_AT);
  const model2Style   = useFadeUp(MODEL2_AT);
  const model3Style   = useFadeUp(MODEL3_AT);
  const modalDefStyle = useFadeUp(showB ? MODAL_DEF_AT : 999999);
  const modalExStyle  = useFadeUp(showB ? MODAL_EX_AT  : 999999);
  const embedStyle    = useFadeUp(showB ? EMBED_AT     : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Header + Intro: fade out before model3 appears */}
            {showHI && (
              <div style={{ opacity: hiOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 14 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                marginBottom: 10 * S,
              }}>微軟 × MAI 三連發</div>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.4,
                }}>同一週悄悄發布三款新模型</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                  color: C.muted, marginTop: 6 * S, lineHeight: 1.5,
                }}>透過 Microsoft Foundry + MAI Playground 對外開放</div>
              </div>
            </div>

            <div style={{ ...introStyle, marginBottom: 14 * S }}>
              <div style={{ display: "flex", gap: 10 * S, flexWrap: "wrap" as const }}>
                {["語音辨識", "語音生成", "圖片生成"].map((c, i) => (
                  <span key={i} style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                    color: C.primary, background: C.primaryLight,
                    border: `1px solid ${C.primaryBorder}`,
                    borderRadius: 4 * S, padding: `${3 * S}px ${10 * S}px`,
                  }}>補齊 {c}</span>
                ))}
              </div>
            </div>
              </div>
            )}

            <div style={{ ...model1Style, marginBottom: 12 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 6 * S }}>
                  <span style={{ fontSize: 22 * S }}>🎙️</span>
                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 16 * S,
                    color: C.primary, fontWeight: "700",
                  }}>MAI-Transcribe-1</div>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.6,
                }}>語音轉文字——25 大語言平均錯字率</div>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 28 * S,
                  color: C.primary, fontWeight: "700", marginTop: 6 * S,
                  textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.5)`,
                }}>3.8%</div>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13 * S, color: C.muted, marginTop: 2 * S,
                }}>號稱目前最佳</div>
              </div>
            </div>

            <div style={{ ...model2Style, marginBottom: 12 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 6 * S }}>
                  <span style={{ fontSize: 22 * S }}>🔊</span>
                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 16 * S,
                    color: C.primary, fontWeight: "700",
                  }}>MAI-Voice-1</div>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.6,
                }}>語音生成引擎——自然流暢的語音輸出</div>
              </div>
            </div>

            <div style={{ ...model3Style }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 6 * S }}>
                  <span style={{ fontSize: 22 * S }}>🖼️</span>
                  <div style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 16 * S,
                    color: C.primary, fontWeight: "700",
                  }}>MAI-Image-2</div>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.6,
                }}>升級版圖片生成模型</div>
              </div>
            </div>
          </div>
        )}

        {showB && (
          <>
            <div style={{ ...modalDefStyle, marginBottom: 14 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                marginBottom: 10 * S,
              }}>多模態 AI 概念</div>
              <div style={{
                background: C.primaryLight, border: `1.5px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.08)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: "700", marginBottom: 10 * S,
                }}>多模態 AI = AI 的三種感官</div>
                <div style={{ display: "flex", gap: 16 * S, alignItems: "center" }}>
                  {[{ icon: "👂", label: "聽" }, { icon: "💬", label: "說" }, { icon: "👁️", label: "看" }].map((s, i) => (
                    <div key={i} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
                      background: "rgba(124,255,178,0.1)",
                      border: `1px solid ${C.primaryBorder}`,
                      borderRadius: 10 * S, padding: `${8 * S}px ${12 * S}px`,
                      minWidth: 50 * S,
                    }}>
                      <span style={{ fontSize: 22 * S }}>{s.icon}</span>
                      <span style={{
                        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                        color: C.primary, fontWeight: "700",
                      }}>{s.label}</span>
                    </div>
                  ))}
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                    color: C.text, lineHeight: 1.5,
                  }}>Multimodal AI</div>
                </div>
              </div>
            </div>

            <div style={{ ...modalExStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
                  color: C.muted, letterSpacing: "0.06em", marginBottom: 8 * S,
                }}>演進</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.65,
                }}>早期：只懂文字→輸入文字→輸出文字</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65, marginTop: 6 * S,
                }}>現在：同時處理<span style={{ color: C.primary, fontWeight: "700" }}>文字・語音・圖片・影片</span>——就像人類同時閱讀、聽講、看圖</div>
              </div>
            </div>

            <div style={{ ...embedStyle }}>
              <div style={{
                background: C.yellowLight, border: `1.5px solid ${C.yellow}`,
                borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${18 * S}px rgba(255,209,102,0.1)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>為什麼重要</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>現實工作幾乎都是跨模態的——<br />越能處理多種模態的 AI，<span style={{ color: C.yellow, fontWeight: "700" }}>越能真正嵌入你的工作流程</span></div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                  color: C.muted, marginTop: 8 * S, lineHeight: 1.5,
                }}>微軟補齊三塊——把 AI 感知能力整合進 Azure + Office 生態系</div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ModalitySensesAnimation triggerLocalFrame={1775} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene ──────────────────────────────────────────────────────────────
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
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_10.summary.to - SCENES_2026_04_10.summary.from;

  // VTT local anchors (global - 13625):
  // 07:38.960 → local 143   (第一，Anthropic Mythos)
  // 07:49.200 → local 453   (帶走概念 AI Agent)
  // 07:53.120 → local 568   (第二，Meta Muse Spark)
  // 08:05.920 → local 953   (帶走概念 開源閉源)
  // 08:09.200 → local 1051  (第三，微軟)

  const BADGE_AT = 0;
  const CARD1_AT = 90;
  const CARD2_AT = 360;
  const CARD3_AT = 660;
  const OUTRO_AT = 1050;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        paddingBottom: SUBTITLE_SAFE,
        paddingLeft: 60 * S, paddingRight: 60 * S,
      }}>
        <div style={{ ...badgeStyle, marginBottom: 22 * S, alignSelf: "flex-start" }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
          }}>
            <WordReveal text="重點整理" startFrame={4} staggerPerWord={5}
              fontSize={14 * S} color={C.primary}
              fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
          </span>
        </div>

        <div style={{ width: "100%" }}>
          <SummaryCard
            number="01" delay={CARD1_AT}
            text="Anthropic Mythos 自主找到數千個零日漏洞，強到不敢公開。帶走概念：AI Agent 的自主性，以及為什麼 AI 安全很重要"
            color={C.primary} border={C.primary}
          />
          <SummaryCard
            number="02" delay={CARD2_AT}
            text="Meta Muse Spark 從開源轉向閉源，AI 掌控權往大公司集中。帶走概念：開源 vs 閉源模型的差異，以及你的選擇對未來的影響"
            color={C.primary} border={C.primary}
          />
          <SummaryCard
            number="03" delay={CARD3_AT}
            text="微軟 MAI 三模型補齊語音與圖片場景。帶走概念：多模態 AI 是什麼，為什麼它讓 AI 越來越接近真實工作"
            color={C.yellow} border={C.yellow}
          />
        </div>

        <div style={{ ...outroStyle, marginTop: 14 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
            color: C.muted, letterSpacing: "0.08em", textAlign: "center" as const,
          }}>每日 AI 知識庫</div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Composition ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export function VideoComposition_2026_04_10() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_04_10.scene1;
  const S2 = SCENES_2026_04_10.scene2;
  const S3 = SCENES_2026_04_10.scene3;
  const SU = SCENES_2026_04_10.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-10-processed.wav")} volume={1.0} />

      {/* Background music with fade in/out */}
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_04_10 - 150, TOTAL_FRAMES_2026_04_10], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
