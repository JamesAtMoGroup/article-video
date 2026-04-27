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
const CONTENT_TOP   = NAV_H + CONTENT_GAP;            // 180px
const CONTENT_H     = H - CONTENT_TOP - SUBTITLE_SAFE; // 1620px

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

// ── Scene boundaries (VTT seconds × 30) ────────────────────────────────────
// TitleScene:  0s–27.52s   → 0–826
// Scene1:     27.52s–128.16s → 826–3845   (GPT-5.5)
// Scene2:    128.16s–231.84s → 3845–6955  (Mythos)
// Scene3:    231.84s–320.16s → 6955–9605  (Anthropic 雙發)
// Summary:   320.16s–356.8s  → 9605–10704
export const SCENES_2026_04_24 = {
  title:   { from: 0,    to: 826   },
  scene1:  { from: 826,  to: 3646  },
  scene2:  { from: 3646, to: 6955  },
  scene3:  { from: 6955, to: 9605  },
  summary: { from: 9605, to: 10704 },
} as const;
export const TOTAL_FRAMES_2026_04_24 = 10704;

const CHAPTERS = [
  { label: "今日焦點",        start: 0    },
  { label: "GPT-5.5 代理時代", start: 826  },
  { label: "Mythos 資安風波",  start: 3646 },
  { label: "Anthropic 雙發",   start: 6955 },
  { label: "重點整理",         start: 9605 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 3521, to: 3845, sender: "想一想", text: "你工作上有哪個多步驟但重複的任務，你最希望 AI 幫你自動做完？" },
  { from: 6665, to: 6955, sender: "想一想", text: "如果能找漏洞的 AI 被惡意取得，你覺得最大的風險是什麼？" },
  { from: 9523, to: 9605, sender: "想一想", text: "你有沒有哪件事是因為設計能力不夠而做不好的，可以讓 Claude Design 試試看？" },
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
          <span key={i} style={{ display: "inline-block", opacity: op, transform: `translateY(${ty}px)`, marginRight: "0.28em", fontSize, color, fontFamily, fontWeight, letterSpacing }}>{word}</span>
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
        width: 700 * S, height: 700 * S, bottom: 100 * S, right: -100 * S,
        background: "radial-gradient(circle, rgba(255,209,102,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)`,
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
    ? interpolate(remaining, [0, FADE_OUT_FRAMES], [0, 1], clamp) : 1;
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
        <div style={{ width: 10 * S, height: 10 * S, borderRadius: "50%", background: C.primary, boxShadow: `0 0 ${6 * S}px ${C.primary}` }} />
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary, letterSpacing: "0.05em" }}>{callout.sender}</span>
      </div>
      <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.55 }}>{callout.text}</div>
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

// 1. TaskFlowAnimation — Scene1 右側，triggerLocalFrame=537，DURATION=628
// 視覺隱喻：AI Agent 自主走完目標→查→寫→跑→完成 的流程
function TaskFlowAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 628;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const goalScale = easeOutBack(prog(f, 18));
  const arrowW = interpolate(Math.max(0, f - 18), [0, 20], [0, 30 * S], { easing: E.outExpo, extrapolateRight: "clamp" });

  const steps = [
    { icon: "🌐", label: "上網查資料", delay: 40 },
    { icon: "💻", label: "寫程式",     delay: 90 },
    { icon: "▶",  label: "跑腳本",     delay: 140 },
    { icon: "🖥",  label: "操作軟體",  delay: 190 },
  ];
  const doneOp = interpolate(Math.max(0, f - 240), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
      width: 200 * S,
    }}>
      {/* Goal box */}
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, fontWeight: "700",
        background: C.primaryLight, border: `2px solid ${C.primaryBorder}`,
        borderRadius: 10 * S, padding: `${8 * S}px ${16 * S}px`,
        transform: `scale(${goalScale})`,
        boxShadow: `0 0 ${16 * S}px rgba(124,255,178,0.25)`,
        textAlign: "center" as const,
      }}>🎯 任務目標</div>

      {/* Arrow down */}
      <div style={{ width: 3 * S, height: arrowW, background: `linear-gradient(to bottom, ${C.primary}, rgba(124,255,178,0.3))`, borderRadius: 2 * S }} />

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 * S, width: "100%" }}>
        {steps.map((step, i) => {
          const itemF = Math.max(0, f - step.delay);
          const itemOp = interpolate(itemF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemTx = interpolate(itemF, [0, 18], [20 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: itemOp, transform: `translateX(${itemTx}px)`,
              display: "flex", alignItems: "center", gap: 8 * S,
              background: "rgba(0,0,0,0.85)", border: `1px solid rgba(124,255,178,0.12)`,
              borderRadius: 8 * S, padding: `${6 * S}px ${10 * S}px`,
            }}>
              <span style={{ fontSize: 18 * S }}>{step.icon}</span>
              <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Done */}
      <div style={{
        opacity: doneOp,
        fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
        color: C.primary, fontWeight: "700",
        textShadow: `0 0 ${12 * S}px rgba(124,255,178,0.7)`,
        letterSpacing: "0.08em",
      }}>✓ 自動完成</div>
    </div>
  );
}

// 2. BenchmarkBarAnimation — Scene1 左側，triggerLocalFrame=1351，DURATION=361
// 視覺隱喻：兩根長條 bar 往上延伸，對比業界水準
function BenchmarkBarAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 361;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const bars = [
    { label: "Terminal-Bench", pct: 82.7, delay: 0,  color: C.primary },
    { label: "SWE-Bench Pro",  pct: 58.6, delay: 40, color: C.yellow  },
  ];
  const BAR_MAX_H = 120 * S;
  const titleOp = interpolate(Math.max(0, f - 200), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>業界最高水準</div>
      <div style={{ display: "flex", gap: 24 * S, alignItems: "flex-end" }}>
        {bars.map((bar, i) => {
          const barF = Math.max(0, f - bar.delay);
          const barH = interpolate(barF, [0, 30], [0, (bar.pct / 100) * BAR_MAX_H], { easing: E.outExpo, extrapolateRight: "clamp" });
          const numOp = interpolate(Math.max(0, barF - 30), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S }}>
              <div style={{ opacity: numOp, fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: bar.color, fontWeight: "700", textShadow: `0 0 ${10 * S}px ${bar.color}88` }}>{bar.pct}%</div>
              <div style={{ width: 50 * S, height: barH, background: `linear-gradient(to top, ${bar.color}, ${bar.color}66)`, borderRadius: `${6 * S}px ${6 * S}px 0 0`, boxShadow: `0 0 ${12 * S}px ${bar.color}44` }} />
              <div style={{ width: 50 * S, height: 2 * S, background: "rgba(255,255,255,0.15)" }} />
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, textAlign: "center" as const, maxWidth: 60 * S, lineHeight: 1.3 }}>{bar.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ opacity: titleOp, fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, textAlign: "center" as const }}>GPT-5.5</div>
    </div>
  );
}

// 3. ZeroDay17Animation — Scene2 右側，triggerLocalFrame=355，DURATION=572
// 視覺隱喻：盾牌 + "17年" 計數 + 裂縫 + 零日漏洞圖示
function ZeroDay17Animation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 572;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const shieldScale = easeOutBack(prog(f, 22));
  const crackOp = interpolate(Math.max(0, f - 80), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const yearOp = interpolate(Math.max(0, f - 30), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const zeroDayOp = interpolate(Math.max(0, f - 200), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
    }}>
      {/* Shield */}
      <div style={{
        position: "relative",
        width: 100 * S, height: 110 * S,
        background: "rgba(255,107,107,0.08)",
        border: `${3 * S}px solid ${C.red}`,
        borderRadius: `${20 * S}px ${20 * S}px ${10 * S}px ${10 * S}px`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        transform: `scale(${shieldScale})`,
        boxShadow: `0 0 ${24 * S}px rgba(255,107,107,0.3)`,
        gap: 4 * S,
      }}>
        <span style={{ fontSize: 24 * S }}>🛡</span>
        <div style={{ opacity: yearOp, fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.red, fontWeight: "700" }}>17年</div>
        {/* Crack line */}
        <div style={{
          opacity: crackOp, position: "absolute",
          top: "20%", left: "50%", width: 2 * S, height: "60%",
          background: C.red, transform: "rotate(8deg) translateX(-50%)",
          boxShadow: `0 0 ${8 * S}px ${C.red}`,
        }} />
      </div>
      {/* Label */}
      <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.red, textAlign: "center" as const }}>
        17 年系統漏洞
      </div>
      {/* Zero-day stat */}
      <div style={{
        opacity: zeroDayOp,
        display: "flex", alignItems: "center", gap: 8 * S,
        background: C.redLight, border: `1px solid ${C.redBorder}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${12 * S}px`,
      }}>
        <span style={{ fontSize: 20 * S }}>🐛</span>
        <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.red }}>數千個零日漏洞</div>
      </div>
    </div>
  );
}

// 4. SupplyChainAnimation — Scene2 右側，triggerLocalFrame=2090，DURATION=666
// 視覺隱喻：供應鏈 → 一環斷裂
function SupplyChainAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 666;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const companies = ["Anthropic", "AWS", "Apple", "MS"];
  const breakIdx = 2;  // Apple link breaks

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      width: 200 * S,
    }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>供應鏈</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
        {companies.map((co, i) => {
          const coF = Math.max(0, f - i * 25);
          const coOp = interpolate(coF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const coTy = interpolate(coF, [0, 20], [15 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          const isBroken = i === breakIdx;
          const breakF = Math.max(0, f - 150);
          const shakeX = isBroken && breakF > 0 && breakF < 30
            ? Math.sin(breakF * 0.8) * 8 * S : 0;
          return (
            <React.Fragment key={i}>
              <div style={{
                opacity: coOp, transform: `translateY(${coTy}px) translateX(${shakeX}px)`,
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: isBroken ? C.red : C.primary,
                background: isBroken ? C.redLight : C.primaryLight,
                border: `1.5px solid ${isBroken ? C.red : C.primaryBorder}`,
                borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
                textAlign: "center" as const, width: "100%",
                boxShadow: isBroken ? `0 0 ${12 * S}px rgba(255,107,107,0.3)` : "none",
              }}>{isBroken ? "⚠ " : ""}{co}</div>
              {i < companies.length - 1 && (
                <div style={{
                  opacity: interpolate(Math.max(0, f - i * 25 - 10), [0, 15], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
                  width: 2 * S, height: 14 * S,
                  background: i === breakIdx - 1 ? C.red : `rgba(124,255,178,0.4)`,
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{
        opacity: interpolate(Math.max(0, f - 200), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.yellow, textAlign: "center" as const,
      }}>一個環節出問題</div>
    </div>
  );
}

// 5. ClaudeDesignAnimation — Scene3 左側，triggerLocalFrame=1030，DURATION=1026
// 視覺隱喻：對話框 → 設計輸出 (簡報/原型/文件) 流出來
function ClaudeDesignAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1026;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const chatScale = easeOutBack(prog(f, 22));
  const arrowW = interpolate(Math.max(0, f - 22), [0, 20], [0, 30 * S], { easing: E.outExpo, extrapolateRight: "clamp" });

  const outputs = [
    { icon: "📊", label: "簡報",   delay: 50  },
    { icon: "🖼",  label: "原型",   delay: 100 },
    { icon: "📄", label: "一頁稿", delay: 150 },
  ];
  const tagOp = interpolate(Math.max(0, f - 250), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
      width: 180 * S,
    }}>
      {/* Chat bubble */}
      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text,
        background: "rgba(255,255,255,0.08)", border: `1px solid rgba(255,255,255,0.15)`,
        borderRadius: 14 * S, padding: `${10 * S}px ${14 * S}px`,
        transform: `scale(${chatScale})`,
        boxShadow: `0 0 ${16 * S}px rgba(255,255,255,0.06)`,
        textAlign: "center" as const,
        lineHeight: 1.5,
      }}>💬 你說清楚<br />想要什麼</div>

      {/* Arrow */}
      <div style={{ width: 3 * S, height: arrowW, background: `linear-gradient(to bottom, rgba(255,255,255,0.4), ${C.primary})`, borderRadius: 2 * S }} />

      {/* Output items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 * S, width: "100%" }}>
        {outputs.map((out, i) => {
          const oF = Math.max(0, f - out.delay);
          const oOp = interpolate(oF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const oTx = interpolate(oF, [0, 18], [-20 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          const oScale = easeOutBack(Math.min(oF / 18, 1));
          return (
            <div key={i} style={{
              opacity: oOp, transform: `translateX(${oTx}px) scale(${oScale})`,
              display: "flex", alignItems: "center", gap: 8 * S,
              background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
              borderRadius: 8 * S, padding: `${6 * S}px ${12 * S}px`,
            }}>
              <span style={{ fontSize: 20 * S }}>{out.icon}</span>
              <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.primary }}>{out.label}</span>
            </div>
          );
        })}
      </div>

      {/* No Figma tag */}
      <div style={{
        opacity: tagOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.05em",
        background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 6 * S, padding: `${4 * S}px ${10 * S}px`,
      }}>不需要 Figma</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_04_24.title.to - SCENES_2026_04_24.title.from;
  const badgeOp = useFadeIn(5);
  const tagStyle = useFadeUp(36);

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
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
          }}>每日 AI 知識庫</span>
        </div>

        {/* Tag line — 週五時事 */}
        <div style={{ ...tagStyle, marginBottom: 20 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.yellow, letterSpacing: "0.1em",
            background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
            borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
          }}>本週 AI 大事</span>
        </div>

        {/* H1 line 1 */}
        <h1 style={{ margin: 0, lineHeight: 1.15, fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900, fontSize: 38 * S, color: C.text }}>
          <WordReveal text="GPT-5.5 問世" startFrame={10} staggerPerWord={6}
            fontSize={38 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 */}
        <h1 style={{ margin: 0, marginTop: 6 * S, lineHeight: 1.2, fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900, fontSize: 28 * S, color: C.primary }}>
          <WordReveal text="Mythos 資安風波、Anthropic 雙發" startFrame={28} staggerPerWord={5}
            fontSize={28 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Sub */}
        <p style={{
          marginTop: 22 * S,
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
          color: C.muted, lineHeight: 1.6,
          opacity: interpolate(36, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
        }}>
          2026年第17週 AI 圈三大事件速覽
        </p>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — GPT-5.5 代理時代 ──────────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_24.scene1.to - SCENES_2026_04_24.scene1.from;

  // VTT-synced local frames (global - 826)
  const LAUNCH_AT  = 211;   // 00:34.560 OpenAI在4月23日
  const AUTO_AT    = 537;   // 00:45.440 自主完成複雜的多步驟任務
  const BENCH_AT   = 1075;  // 01:03.360 Terminal-Bench 82.7%
  const SWE_AT     = 1351;  // 01:12.560 SWE-Bench Pro 58.6%
  const WHY_AT     = 1682;  // 01:23.600 為什麼OpenAI這樣做

  // Phase A → B at "過去我們問AI問題" 01:31.840 → local 1929
  const A_FADE_START = 1849;  // 01:29.63 開始淡出 Phase A
  const A_REMOVE     = 1929;  // 01:32.30 移除 Phase A
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = 1929;    // 01:31.840 過去我們問AI問題（VTT對齊）
  const AGENT_AT  = 1929;    // 01:31.840 比較卡：問AI問題 vs Agent模式
  const IMPACT_AT = 2179;    // 01:40.160 對你我的意義
  const WORKFL_AT = 2428;    // 01:48.480 查資料整理寫報告
  const showB = frame >= B_SHOW_AT;

  const launchStyle = useFadeUp(LAUNCH_AT);
  const autoStyle   = useFadeUp(AUTO_AT);
  const benchStyle  = useFadeUp(BENCH_AT);
  const sweStyle    = useFadeUp(SWE_AT);
  const whyStyle    = useFadeIn(WHY_AT);
  const agentStyle  = useFadeUp(showB ? AGENT_AT  : 999999);
  const impactStyle = useFadeUp(showB ? IMPACT_AT : 999999);
  const workStyle   = useFadeUp(showB ? WORKFL_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ───────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Section badge */}
            <div style={{ marginBottom: 14 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.1em",
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
              }}>第一件：GPT-5.5</span>
            </div>

            {/* Launch card */}
            <div style={{ ...launchStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.06)`,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em", marginBottom: 8 * S }}>2026.04.23（週四）發布</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S, color: C.text, fontWeight: "700", lineHeight: 1.3 }}>
                  <span style={{ color: C.primary }}>GPT-5.5</span>
                  {" — AI 代理時代旗艦"}
                </div>
              </div>
            </div>

            {/* Autonomous task card */}
            <div style={{ ...autoStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.primaryLight, border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary, letterSpacing: "0.06em", marginBottom: 8 * S }}>⚡ 核心設計</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S, color: C.text, fontWeight: "700", lineHeight: 1.4, marginBottom: 8 * S }}>
                  自主完成複雜的多步驟任務
                </div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, lineHeight: 1.65 }}>
                  給它一個目標，它會自己上網查資料、寫程式、跑腳本、操作軟體，一路做到完成為止
                </div>
              </div>
            </div>

            {/* Benchmark cards */}
            <div style={{ ...benchStyle, marginBottom: 10 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
                display: "flex", gap: 16 * S, alignItems: "center",
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.primary, fontWeight: "700", textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.5)`, flexShrink: 0 }}>82.7%</div>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, marginBottom: 4 * S }}>Terminal-Bench</div>
                  <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>複雜命令列工作流程</div>
                </div>
              </div>
            </div>

            <div style={{ ...sweStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
                display: "flex", gap: 16 * S, alignItems: "center",
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.yellow, fontWeight: "700", textShadow: `0 0 ${10 * S}px rgba(255,209,102,0.5)`, flexShrink: 0 }}>58.6%</div>
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, marginBottom: 4 * S }}>SWE-Bench Pro</div>
                  <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>真實 GitHub 問題解決</div>
                </div>
              </div>
            </div>

            {/* Why shift */}
            <div style={whyStyle}>
              <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.muted, lineHeight: 1.65 }}>
                AI 產業重心：<span style={{ color: C.text }}>更聰明</span>
                <span style={{ color: C.muted }}> → </span>
                <span style={{ color: C.primary, fontWeight: "700" }}>更能獨立做事</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ───────────────────── */}
        {showB && (
          <>
            {/* Agent vs Chat comparison */}
            <div style={{ ...agentStyle, marginBottom: 16 * S }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S }}>模式對比</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
                <div style={{
                  background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.1)`,
                  borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
                  display: "flex", alignItems: "center", gap: 14 * S,
                }}>
                  <div style={{ fontSize: 22 * S, flexShrink: 0 }}>💬</div>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted }}>以前</div>
                    <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text }}>問 AI 問題 → 收到答案</div>
                  </div>
                </div>
                <div style={{
                  background: C.primaryLight, border: `1.5px solid ${C.primaryBorder}`,
                  borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
                  display: "flex", alignItems: "center", gap: 14 * S,
                }}>
                  <div style={{ fontSize: 22 * S, flexShrink: 0 }}>🤖</div>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary }}>Agent 模式</div>
                    <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, fontWeight: "700" }}>給目標 → 自己跑完</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Impact card */}
            <div style={{ ...impactStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.yellow, marginBottom: 8 * S }}>對你我的意義</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.65 }}>
                  如果你的工作包含<span style={{ color: C.yellow, fontWeight: "700" }}>「查資料 → 整理 → 寫報告 → 回覆」</span>這樣的流程，代理模型就是在瞄準你的場景
                </div>
              </div>
            </div>

            <div style={workStyle}>
              <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, lineHeight: 1.65 }}>
                給一個目標，讓它自己跑完，是下一個競爭焦點
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <TaskFlowAnimation triggerLocalFrame={AUTO_AT} />
        <BenchmarkBarAnimation triggerLocalFrame={SWE_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — Mythos 資安風波 ────────────────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_24.scene2.to - SCENES_2026_04_24.scene2.from;

  // VTT-synced local frames (global - 3646, scene2.from moved from 3845 → 3646)
  const INTRO_AT     = 292;   // 02:11.280 最讓人玩味的故事
  const MYTHOS_AT    = 505;   // 02:18.400 Claude Mythos Preview
  const STRONG_AT    = 554;   // 02:20.000 強到什麼程度
  const VULN17_AT    = 756;   // 02:26.720 17年系統漏洞
  const ZERODAY_AT   = 1036;  // 02:36.080 數千個零日漏洞
  const GLASSWING_AT = 1298;  // 02:44.800 Project Glasswing
  const FORTY_AT     = 1536;  // 02:52.720 約40家
  const BREACH_AT    = 2008;  // 03:08.480 未授權存取

  // Element fade-out: badge + intro fade before GLASSWING_AT
  const EARLY_FADE_START = GLASSWING_AT - 120; // 1178
  const EARLY_REMOVE     = GLASSWING_AT - 10;  // 1288
  const showEarlyS2 = frame < EARLY_REMOVE;
  const earlyS2Opacity = frame > EARLY_FADE_START
    ? interpolate(frame, [EARLY_FADE_START, EARLY_REMOVE], [1, 0], clamp) : 1;

  // Phase A → B at "白話說" 03:15.520 → local 2220 (global - 3646)
  const A_FADE_START = 2220;
  const A_REMOVE     = 2300;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = 2320;
  const PARADOX_AT = 2289;   // 03:17.840 弔詭在哪裡
  const CHAIN_AT   = 2527;   // 03:25.760 供應鏈風險點
  const CRACK_AT   = 2676;   // 03:30.720 一個環節出問題
  const IMPACT_AT  = 2865;   // 03:37.040 整個供應鏈每一個環節
  const showB = frame >= B_SHOW_AT;

  const introStyle    = useFadeUp(INTRO_AT);
  const mythosStyle   = useFadeUp(MYTHOS_AT);
  const vuln17Style   = useFadeUp(VULN17_AT);
  const zerodayStyle  = useFadeUp(ZERODAY_AT);
  const glasswStyle   = useFadeUp(GLASSWING_AT);
  const fortyStyle    = useFadeUp(FORTY_AT);
  const breachStyle   = useFadeUp(BREACH_AT);
  const paradoxStyle  = useFadeUp(showB ? PARADOX_AT : 999999);
  const chainStyle    = useFadeUp(showB ? CHAIN_AT   : 999999);
  const crackStyle    = useFadeUp(showB ? CRACK_AT   : 999999);
  const impactStyle2  = useFadeUp(showB ? IMPACT_AT  : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ───────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Badge + intro (early fadeout) */}
            {showEarlyS2 && (
              <div style={{ opacity: earlyS2Opacity }}>
                <div style={{ marginBottom: 14 * S }}>
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                    color: C.red, letterSpacing: "0.1em",
                    background: C.redLight, border: `1px solid ${C.redBorder}`,
                    borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                  }}>第二件：Mythos 資安風波</span>
                </div>
                <div style={{ ...introStyle, marginBottom: 14 * S }}>
                  <div style={{
                    background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                    borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
                  }}>
                    <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S, color: C.text, fontWeight: "700", lineHeight: 1.3 }}>本週最讓人玩味的故事</div>
                  </div>
                </div>
              </div>
            )}

            {/* Mythos capability */}
            <div style={{ ...mythosStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.redLight, border: `1.5px solid ${C.redBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.red, letterSpacing: "0.06em", marginBottom: 8 * S }}>⚠ Claude Mythos Preview</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S, color: C.text, fontWeight: "700", lineHeight: 1.3, marginBottom: 10 * S }}>
                  資安能力特別強的 AI
                </div>
                <div style={{ ...vuln17Style }}>
                  <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65 }}>
                    自主找到一個存在長達 <span style={{ color: C.red, fontWeight: "700" }}>17 年</span>的系統漏洞
                  </div>
                </div>
                <div style={{ ...zerodayStyle, marginTop: 6 * S }}>
                  <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, lineHeight: 1.65 }}>
                    辨識各大作業系統和瀏覽器的<span style={{ color: C.red }}> 數千個零日漏洞</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Project Glasswing */}
            <div style={{ ...glasswStyle, marginBottom: 10 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
                position: "relative",
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary, letterSpacing: "0.06em", marginBottom: 8 * S }}>🔒 Project Glasswing</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65 }}>
                  存取權嚴格限制：
                </div>
                <div style={{ ...fortyStyle, marginTop: 6 * S }}>
                  <div style={{
                    display: "flex", flexWrap: "wrap" as const, gap: 8 * S, marginBottom: 8 * S,
                  }}>
                    {["AWS", "Apple", "Google", "Microsoft"].map((co, i) => (
                      <span key={i} style={{
                        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                        color: C.primary, background: C.primaryLight,
                        border: `1px solid ${C.primaryBorder}`,
                        borderRadius: 4 * S, padding: `${3 * S}px ${8 * S}px`,
                      }}>{co}</span>
                    ))}
                    <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted }}>等約 40 家</span>
                  </div>
                  <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted }}>
                    僅限防禦性資安工作
                  </div>
                </div>
                <RippleRing activeAt={GLASSWING_AT} color={C.primary} />
              </div>
            </div>

            {/* Breach */}
            <div style={breachStyle}>
              <div style={{
                background: C.redLight, border: `1.5px solid ${C.red}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(255,107,107,0.15)`,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.red, letterSpacing: "0.06em", marginBottom: 8 * S }}>🚨 本週出事了</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, fontWeight: "700", lineHeight: 1.4 }}>
                  透過第三方廠商環境的<span style={{ color: C.red }}> 未授權存取</span>事件
                </div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, marginTop: 6 * S, lineHeight: 1.65 }}>
                  有人繞過管控，在不該有存取權的情況下用到了這個模型
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ───────────────────── */}
        {showB && (
          <>
            <div style={{ ...paradoxStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.yellowLight, border: `1.5px solid ${C.yellow}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.yellow, letterSpacing: "0.06em", marginBottom: 8 * S }}>⚡ 弔詭之處</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.65 }}>
                  越強大的 AI，越需要嚴格管控
                </div>
              </div>
            </div>

            <div style={{ ...chainStyle, marginBottom: 10 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.65 }}>
                  但合作廠商越多，<span style={{ color: C.yellow, fontWeight: "700" }}>供應鏈的風險點就越多</span>
                </div>
              </div>
            </div>

            <div style={{ ...crackStyle, marginBottom: 10 * S }}>
              <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, lineHeight: 1.65 }}>
                你保護得再好，一個環節出問題，就可能被人鑽進來
              </div>
            </div>

            <div style={impactStyle2}>
              <div style={{
                background: C.redLight, border: `1px solid ${C.redBorder}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.red, marginBottom: 8 * S }}>對你我的意義</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.65 }}>
                  AI 工具的安全性，不只取決於 AI 公司本身，而是<span style={{ color: C.red, fontWeight: "700" }}>整個供應鏈的每一個環節</span>
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ZeroDay17Animation triggerLocalFrame={STRONG_AT} />
        <SupplyChainAnimation triggerLocalFrame={PARADOX_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — Anthropic 雙發 ────────────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_24.scene3.to - SCENES_2026_04_24.scene3.from;

  // VTT-synced local frames (global - 6955)
  const INTRO_AT   = 0;     // 03:51.840 scene start
  const OPUS_AT    = 375;   // 04:04.320 Claude Opus 4.7
  const OPUSDTL_AT = 600;   // 04:11.840 強化軟體工程
  const PRICING_AT = 876;   // 04:21.040 定價不變

  // Phase A → B at 04:21.040 (Opus 4.7 done, Claude Design starts)
  const A_FADE_START = 876;
  const A_REMOVE     = 956;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT  = 976;
  const DESIGN_AT  = 1030;  // 04:26.160 Claude Design正式推出
  const OUTPUT_AT  = 1248;  // 04:33.440 輸出設計稿原型
  const NOFIGMA_AT = 1479;  // 04:41.120 不需要學Figma
  const SIGNAL_AT  = 1714;  // 04:48.960 這兩個方向
  const NONDES_AT  = 2088;  // 05:01.440 非設計師特別值得試試
  const QUEST_AT   = 2393;  // 05:11.600 現在有了語言入口
  const showB = frame >= B_SHOW_AT;

  const introStyle  = useFadeUp(INTRO_AT);
  const opusStyle   = useFadeUp(OPUS_AT);
  const opusDStyle  = useFadeUp(OPUSDTL_AT);
  const priceStyle  = useFadeIn(PRICING_AT);
  const designStyle = useFadeUp(showB ? DESIGN_AT  : 999999);
  const outputStyle = useFadeUp(showB ? OUTPUT_AT  : 999999);
  const figmaStyle  = useFadeUp(showB ? NOFIGMA_AT : 999999);
  const signalStyle = useFadeUp(showB ? SIGNAL_AT  : 999999);
  const nondesStyle = useFadeUp(showB ? NONDES_AT  : 999999);
  const questStyle  = useFadeIn(showB ? QUEST_AT   : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A: Opus 4.7 ─────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...introStyle, marginBottom: 14 * S }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
              }}>第三件：Anthropic 雙發</span>
            </div>

            <div style={{ ...opusStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.08)`,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary, letterSpacing: "0.06em", marginBottom: 8 * S }}>① Claude Opus 4.7 發布</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S, color: C.text, fontWeight: "700", lineHeight: 1.3, marginBottom: 10 * S }}>
                  旗艦模型升級
                </div>
                <div style={{ ...opusDStyle }}>
                  {[
                    "🛠 強化軟體工程和長任務處理能力",
                    "👁 視覺理解更好，辨識更高解析度圖片",
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 * S, marginBottom: 6 * S }}>
                      <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65 }}>{item}</div>
                    </div>
                  ))}
                </div>
                <div style={{ ...priceStyle, marginTop: 8 * S }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary }}>定價不變 · 即刻全平台上線</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B: Claude Design ────── */}
        {showB && (
          <>
            <div style={{ ...designStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.08)`,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary, letterSpacing: "0.06em", marginBottom: 8 * S }}>② Claude Design 正式推出</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S, color: C.text, fontWeight: "700", lineHeight: 1.3, marginBottom: 10 * S }}>
                  對話式設計工具
                </div>
                <div style={{ ...outputStyle }}>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 * S }}>
                    {["設計稿", "原型", "簡報", "一頁式文件"].map((tag, i) => (
                      <span key={i} style={{
                        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                        color: C.primary, background: C.primaryLight,
                        border: `1px solid ${C.primaryBorder}`,
                        borderRadius: 6 * S, padding: `${4 * S}px ${10 * S}px`,
                      }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ ...figmaStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.primaryLight, border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S, color: C.text, fontWeight: "700", lineHeight: 1.4 }}>
                  不需要學 Figma，不需要設計軟體
                </div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, marginTop: 6 * S, lineHeight: 1.65 }}>
                  你說清楚想要什麼，Claude 幫你做出來
                </div>
              </div>
            </div>

            <div style={{ ...signalStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em", marginBottom: 8 * S }}>策略訊號</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.65 }}>
                  Anthropic 不只做最強模型，也讓能力對<span style={{ color: C.primary, fontWeight: "700" }}>普通人更容易使用</span>
                </div>
              </div>
            </div>

            <div style={{ ...nondesStyle, marginBottom: 10 * S }}>
              <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.65 }}>
                對非設計師特別值得試試——現在有了一個<span style={{ color: C.primary }}> 語言入口</span>
              </div>
            </div>

            <div style={questStyle}>
              <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, lineHeight: 1.65 }}>
                如果你平常需要做簡報或說明文件，但設計能力是你的弱點
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ClaudeDesignAnimation triggerLocalFrame={DESIGN_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryCard ─────────────────────────────────────────────────────────────
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
        <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.65 }}>{text}</div>
      </div>
    </div>
  );
}

// ── SummaryScene ─────────────────────────────────────────────────────────────
function SummaryScene() {
  const dur = SCENES_2026_04_24.summary.to - SCENES_2026_04_24.summary.from;

  // VTT-synced local frames (global - 9605)
  const BADGE_AT = 0;
  const CARD1_AT = 117;   // 05:24.080 第一 GPT-5.5
  const CARD2_AT = 396;   // 05:33.360 第二 Mythos
  const CARD3_AT = 665;   // 05:42.320 第三 Anthropic
  const OUTRO_AT = 960;   // 05:52.160 這裡是每日AI知識庫

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        <div style={{ ...badgeStyle, marginBottom: 20 * S, marginTop: 22 * S }}>
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
          text="GPT-5.5 發布。AI 從聊天走向代理——給個目標，讓它自己跑完，是下一個競爭焦點"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="02" delay={CARD2_AT}
          text="Mythos 資安風波。越強大的 AI 工具，對供應鏈安全的要求就越高，這次是一個警示"
          color={C.red} border={C.red}
        />
        <SummaryCard
          number="03" delay={CARD3_AT}
          text="Anthropic 雙發。同時強化旗艦模型和降低使用門檻，兩條腿並行是本週的策略訊號"
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
export function VideoComposition_2026_04_24() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_04_24.scene1;
  const S2 = SCENES_2026_04_24.scene2;
  const S3 = SCENES_2026_04_24.scene3;
  const SU = SCENES_2026_04_24.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-24-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_04_24 - 150, TOTAL_FRAMES_2026_04_24], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return Math.min(fi, fo);
        }}
        loop
      />

      <Background />

      {/* TitleScene */}
      <Sequence from={0} durationInFrames={S1.from}>
        <TitleScene />
      </Sequence>

      {/* Scene 1 — GPT-5.5 代理時代 */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — Mythos 資安風波 */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — Anthropic 雙發 */}
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
