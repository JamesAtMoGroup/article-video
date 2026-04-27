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

// ── Scale & canvas ─────────────────────────────────────────────────────────
const S = 3;
const W = 1280 * S;  // 3840
const H = 720  * S;  // 2160
const NAV_H         = 50  * S;  // 150px
const CONTAINER_W   = 640 * S;  // 1920px
const COL_LEFT      = (W - CONTAINER_W) / 2;  // 960px
const SUBTITLE_SAFE = 120 * S;  // 360px
const CONTENT_GAP   = 10  * S;
const CONTENT_TOP   = NAV_H + CONTENT_GAP;
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
// TitleScene:   0s–17.76s  → 0–533
// Scene1:       17.76s–82.88s → 533–2486
// Scene2:       82.88s–168.8s → 2486–5064
// Scene3:       168.8s–256.48s → 5064–7694
// SummaryScene: 256.48s–294.48s → 7694–8835
export const SCENES_2026_04_23 = {
  title:   { from: 0,    to: 533  },
  scene1:  { from: 533,  to: 2486 },
  scene2:  { from: 2486, to: 5064 },
  scene3:  { from: 5064, to: 7694 },
  summary: { from: 7694, to: 8835 },
} as const;
export const TOTAL_FRAMES_2026_04_23 = 8835;

const CHAPTERS = [
  { label: "今日焦點",          start: 0    },
  { label: "什麼是上下文視窗",  start: 533  },
  { label: "為什麼是競爭關鍵",  start: 2486 },
  { label: "實際使用建議",      start: 5064 },
  { label: "重點整理",          start: 7694 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 2200, to: 2486, sender: "想一想",   text: "你有沒有遇過 AI 在長對話中突然「忘記」你說的事？那就是碰到了上下文視窗的邊界" },
  { from: 4750, to: 5064, sender: "開發者思考", text: "如果你需要讓 AI 分析整份報告，你會選哪個模型？視窗大小影響了你的選擇嗎？" },
  { from: 7350, to: 7694, sender: "親身經歷", text: "下次用 AI，試著把最重要的資訊放在 Prompt 的開頭或結尾，看看回答品質有差異嗎？" },
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
        <div style={{ transform: `translateY(${scrollY}px)` }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
}

// ── Background ─────────────────────────────────────────────────────────────
function Background() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div style={{ position: "absolute", borderRadius: "50%", width: 900 * S, height: 900 * S, top: -200 * S, left: -150 * S, background: "radial-gradient(circle, rgba(124,255,178,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", borderRadius: "50%", width: 700 * S, height: 700 * S, top: 300 * S, right: -100 * S, background: "radial-gradient(circle, rgba(124,255,178,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", borderRadius: "50%", width: 500 * S, height: 500 * S, bottom: 100 * S, left: 300 * S, background: "radial-gradient(circle, rgba(255,209,102,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`, backgroundSize: `${60 * S}px ${60 * S}px`, pointerEvents: "none" }} />
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 18 * S, color: C.muted, fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em" }}>
          <span>每日 AI 知識庫</span>
          <span style={{ color: C.primary }}>{current.label}</span>
        </div>
        <div style={{ height: 3 * S, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginTop: 4 * S }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: C.primary, borderRadius: 99, boxShadow: `0 0 ${8 * S}px ${C.primary}88` }} />
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
    <div style={{ position: "absolute", inset: 0, border: `${2 * S}px solid ${color}`, borderRadius: 12 * S, transform: `scale(${scale})`, opacity, pointerEvents: "none" }} />
  );
}

// ── iMessage Callout ───────────────────────────────────────────────────────
function IMessageCard({ callout, slotIndex, globalFrame }: { callout: Callout; slotIndex: number; globalFrame: number }) {
  const { fps } = useVideoConfig();
  const f = Math.max(0, globalFrame - callout.from);
  const remaining = callout.to - globalFrame;
  const slideY  = spring({ frame: f, fps, config: { damping: 22, stiffness: 130 } });
  const translateY = interpolate(slideY, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);
  const fadeOut = remaining < FADE_OUT_FRAMES ? interpolate(remaining, [0, FADE_OUT_FRAMES], [0, 1], clamp) : 1;
  return (
    <div style={{
      position: "absolute", top: NOTIF_TOP + slotIndex * NOTIF_SLOT, right: NOTIF_RIGHT,
      width: NOTIF_W, opacity: fadeOut, transform: `translateY(${translateY}px)`,
      zIndex: 100, background: "rgba(18,18,18,0.95)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderRadius: 16 * S, border: `1px solid rgba(124,255,178,0.2)`,
      padding: `${12 * S}px ${14 * S}px`, boxShadow: `0 ${8 * S}px ${24 * S}px rgba(0,0,0,0.6)`,
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
      {active.map((c, i) => <IMessageCard key={c.from} callout={c} slotIndex={i} globalFrame={globalFrame} />)}
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Concept Animations
// ─────────────────────────────────────────────────────────────────────────────

// 1. ContextWindowViewAnimation — TitleScene, global triggerFrame=100, DURATION=420
//    視覺隱喻：AI 的「可視範圍」框架，框內文字亮，框外暗淡
function ContextWindowViewAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 420;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const windowScale = easeOutBack(prog(f, 22));
  const linesOp   = interpolate(Math.max(0, f - 15), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const labelOp   = interpolate(Math.max(0, f - 50), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const pulse     = 0.9 + Math.sin(f * 0.05) * 0.1;

  return (
    <div style={{ position: "absolute", left: 40 * S, top: 200 * S, opacity: envelope, pointerEvents: "none", zIndex: 50 }}>
      <div style={{ transform: `scale(${windowScale})`, transformOrigin: "top left" }}>
        {/* Dim lines above window */}
        <div style={{ opacity: linesOp * 0.35 }}>
          {[70, 50, 85].map((w, i) => (
            <div key={i} style={{ height: 6 * S, width: w * S, background: "rgba(255,255,255,0.2)", borderRadius: 3 * S, marginBottom: 8 * S }} />
          ))}
        </div>
        {/* The "context window" bright frame */}
        <div style={{
          border: `${2 * S}px solid ${C.primary}`,
          borderRadius: 8 * S,
          padding: `${10 * S}px ${14 * S}px`,
          background: "rgba(124,255,178,0.06)",
          boxShadow: `0 0 ${20 * S}px rgba(124,255,178,${0.2 * pulse})`,
          opacity: linesOp,
          position: "relative",
          minWidth: 90 * S,
        }}>
          {[80, 60, 75].map((w, i) => (
            <div key={i} style={{ height: 6 * S, width: w * S, background: i === 0 ? C.primary + "cc" : C.text + "88", borderRadius: 3 * S, marginBottom: i < 2 ? 8 * S : 0 }} />
          ))}
        </div>
        {/* Dim lines below window */}
        <div style={{ opacity: linesOp * 0.35 }}>
          {[55, 80, 45].map((w, i) => (
            <div key={i} style={{ height: 6 * S, width: w * S, background: "rgba(255,255,255,0.2)", borderRadius: 3 * S, marginTop: 8 * S }} />
          ))}
        </div>
      </div>
      {/* Label */}
      <div style={{ opacity: labelOp, marginTop: 12 * S, display: "flex", alignItems: "center", gap: 8 * S }}>
        <div style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary, boxShadow: `0 0 ${6 * S}px ${C.primary}` }} />
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary, letterSpacing: "0.06em" }}>上下文視窗</span>
      </div>
      <div style={{ opacity: labelOp * 0.7, marginTop: 6 * S, fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted }}>AI 能「看到」的範圍</div>
    </div>
  );
}

// 2. TokenSizeRaceAnimation — Scene1 localTrigger=1068, DURATION=671
//    視覺隱喻：三條橫向成長條（早期/Claude/Gemini），VTT 精確對齊
function TokenSizeRaceAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 671;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT delays (relative to triggerLocalFrame=1068):
  // Early: f=0 | Claude: f=197 (local 1265) | Gemini: f=401 (local 1469)
  const bars = [
    { label: "早期模型", sublabel: "~2K tokens", maxPct: 5,  color: C.muted,    delay: 0   },
    { label: "Claude",   sublabel: "200K tokens", maxPct: 40, color: C.primary,  delay: 197 },
    { label: "Gemini",   sublabel: "1M tokens",   maxPct: 100, color: C.yellow,  delay: 401 },
  ];

  return (
    <div style={{ position: "absolute", right: 40 * S, top: 180 * S, opacity: envelope, pointerEvents: "none", zIndex: 50, width: 250 * S }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em", marginBottom: 12 * S }}>視窗大小競賽</div>
      {bars.map((bar, i) => {
        const barF  = Math.max(0, f - bar.delay);
        const barOp = interpolate(barF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const barTy = interpolate(barF, [0, 18], [15 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const fillW = interpolate(barF, [0, 40], [0, bar.maxPct], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ opacity: barOp, transform: `translateY(${barTy}px)`, marginBottom: 14 * S }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 * S }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: bar.color }}>{bar.label}</span>
              <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted }}>{bar.sublabel}</span>
            </div>
            <div style={{ height: 10 * S, background: "rgba(255,255,255,0.06)", borderRadius: 5 * S, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${fillW}%`, background: bar.color, borderRadius: 5 * S, boxShadow: `0 0 ${8 * S}px ${bar.color}88` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 3. DocumentOverflowAnimation — Scene2 localTrigger=233, DURATION=606
//    視覺隱喻：小視窗裝不下長文件，文件被截斷
function DocumentOverflowAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 606;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const boxScale = easeOutBack(prog(f, 20));
  // VTT delays: doc1 at f=0, doc2 (讀不完) at f=151 (local 384), doc3 (片段) at f=348 (local 581)
  const docs = [
    { label: "長報告", blocked: false, delay: 0   },
    { label: "逐字稿", blocked: true,  delay: 151 },
    { label: "習慣記憶", blocked: true, delay: 348 },
  ];

  return (
    <div style={{ position: "absolute", left: 40 * S, top: 220 * S, opacity: envelope, pointerEvents: "none", zIndex: 50 }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em", marginBottom: 10 * S }}>短視窗限制</div>
      <div style={{ transform: `scale(${boxScale})`, transformOrigin: "top left" }}>
        {/* Small window box */}
        <div style={{ width: 130 * S, height: 90 * S, border: `${2 * S}px solid rgba(255,255,255,0.18)`, borderRadius: 10 * S, background: "rgba(255,255,255,0.03)", overflow: "hidden" as const, position: "relative" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: "rgba(255,255,255,0.15)" }}>AI</div>
          {docs.map((doc, i) => {
            const dF  = Math.max(0, f - doc.delay);
            const dOp = interpolate(dF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                opacity: dOp, position: "absolute",
                top: 8 * S + i * 24 * S, left: 8 * S, right: 8 * S, height: 16 * S,
                background: doc.blocked ? C.red + "33" : C.primary + "33",
                border: `1px solid ${doc.blocked ? C.red + "66" : C.primaryBorder}`,
                borderRadius: 4 * S, display: "flex", alignItems: "center", paddingLeft: 6 * S,
              }}>
                <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: doc.blocked ? C.red : C.primary }}>
                  {doc.blocked ? "✕" : "✓"} {doc.label}
                </span>
              </div>
            );
          })}
        </div>
        {/* Overflow indicator */}
        <div style={{
          opacity: interpolate(Math.max(0, f - 200), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
          marginTop: 10 * S, fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.red,
          textAlign: "center" as const,
        }}>超出範圍 ✕</div>
      </div>
    </div>
  );
}

// 4. LostInMiddleAnimation — Scene2 localTrigger=2062, DURATION=361
//    視覺隱喻：橫條注意力分佈，兩端亮、中間暗（迷失在中間問題）
function LostInMiddleAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 361;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const barScale  = easeOutBack(prog(f, 22));
  const dimOp     = interpolate(Math.max(0, f - 20), [0, 25], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const labelOp   = interpolate(Math.max(0, f - 50), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", right: 40 * S, top: 220 * S, opacity: envelope, pointerEvents: "none", zIndex: 50, width: 220 * S }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, marginBottom: 12 * S, letterSpacing: "0.06em" }}>迷失在中間</div>
      {/* Attention bar */}
      <div style={{ transform: `scaleX(${barScale})`, transformOrigin: "center" }}>
        <div style={{ display: "flex", height: 26 * S, borderRadius: 6 * S, overflow: "hidden" as const }}>
          <div style={{ flex: 0.2, background: C.primary, boxShadow: `0 0 ${10 * S}px ${C.primary}` }} />
          <div style={{ flex: 0.6, opacity: dimOp, position: "relative", background: "rgba(255,255,255,0.06)" }}>
            <div style={{ position: "absolute", inset: 0, background: `repeating-linear-gradient(90deg, transparent 0px, transparent 8px, rgba(255,107,107,0.1) 8px, rgba(255,107,107,0.1) 9px)` }} />
          </div>
          <div style={{ flex: 0.2, background: C.primary, boxShadow: `0 0 ${10 * S}px ${C.primary}` }} />
        </div>
      </div>
      {/* Labels */}
      <div style={{ opacity: labelOp, display: "flex", justifyContent: "space-between", marginTop: 8 * S }}>
        <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.primary }}>⭐ 開頭</span>
        <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.red }}>⚠ 中間</span>
        <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.primary }}>⭐ 結尾</span>
      </div>
      <div style={{ opacity: labelOp * 0.7, marginTop: 8 * S, fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted }}>注意力分佈不均勻</div>
    </div>
  );
}

// 5. ThreeCautionsAnimation — Scene3 localTrigger=789, DURATION=1579
//    視覺隱喻：三張注意卡，VTT 精確對齊每條建議出現時機
function ThreeCautionsAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1579;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // c1 at f=0 (B_SHOW_AT=789) | c2 at f=488 (local 1277) | c3 at f=901 (local 1690)
  const cautions = [
    { icon: "💰", label: "第一：成本",   desc: "按 tokens 計費 · 只放必要內容", color: C.yellow,  delay: 0   },
    { icon: "📍", label: "第二：位置",   desc: "關鍵資訊放開頭或結尾",          color: C.primary, delay: 488 },
    { icon: "🧠", label: "第三：記憶",   desc: "視窗 ≠ 長記憶 · 換對話歸零",   color: C.red,     delay: 901 },
  ];

  return (
    <div style={{ position: "absolute", left: 40 * S, top: 180 * S, opacity: envelope, pointerEvents: "none", zIndex: 50, width: 220 * S }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S }}>使用注意</div>
      {cautions.map((c, i) => {
        const itemF  = Math.max(0, f - c.delay);
        const itemOp = interpolate(itemF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 20], [25 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ opacity: itemOp, transform: `translateX(${itemTx}px)`, marginBottom: 12 * S, background: "rgba(0,0,0,0.82)", border: `1px solid ${c.color}44`, borderLeft: `${3 * S}px solid ${c.color}`, borderRadius: 10 * S, padding: `${10 * S}px ${14 * S}px`, display: "flex", alignItems: "flex-start", gap: 10 * S }}>
            <span style={{ fontSize: 22 * S, flexShrink: 0 }}>{c.icon}</span>
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: c.color, fontWeight: "700", lineHeight: 1.2 }}>{c.label}</div>
              <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, marginTop: 3 * S }}>{c.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene Components
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur       = SCENES_2026_04_23.title.to - SCENES_2026_04_23.title.from;
  const badgeOp   = useFadeIn(5);
  const subStyle  = useFadeUp(30);
  const tagStyle  = useFadeUp(46);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: SUBTITLE_SAFE, paddingLeft: 80 * S, paddingRight: 80 * S, textAlign: "center" }}>
        <div style={{ ...badgeOp, marginBottom: 14 * S }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary, letterSpacing: "0.12em", background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px` }}>每日 AI 知識庫</span>
        </div>
        <h1 style={{ margin: 0, lineHeight: 1.15, fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900, fontSize: 38 * S, color: C.text }}>
          <WordReveal text="為什麼 AI 公司" startFrame={10} staggerPerWord={6} fontSize={38 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>
        <h1 style={{ margin: 0, lineHeight: 1.2, marginTop: 4 * S, fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900, fontSize: 28 * S, color: C.primary }}>
          <WordReveal text="都在搶上下文視窗長度" startFrame={28} staggerPerWord={6} fontSize={28 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>
        <p style={{ ...subStyle, marginTop: 20 * S, fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.muted, lineHeight: 1.6 }}>
          Context Window — 決定 AI 任務能力的核心規格
        </p>
        <div style={{ ...tagStyle, marginTop: 16 * S }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.1em" }}>上下文視窗 · Tokens · 迷失在中間 · 競爭優勢</span>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ContextWindowViewAnimation triggerFrame={100} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 helpers ─────────────────────────────────────────────────────────
function SizeItem({ label, sublabel, color, delay }: { label: string; sublabel: string; color: string; delay: number }) {
  const s = useFadeUp(delay);
  return (
    <div style={{ ...s, display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 14 * S }}>
      <div style={{ width: 10 * S, height: 10 * S, borderRadius: "50%", background: color, boxShadow: `0 0 ${6 * S}px ${color}88`, flexShrink: 0 }} />
      <div>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color, fontWeight: "700" }}>{label}</span>
        <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, marginLeft: 10 * S }}>{sublabel}</span>
      </div>
    </div>
  );
}

// ── Scene1 — 什麼是上下文視窗？ ────────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur   = SCENES_2026_04_23.scene1.to - SCENES_2026_04_23.scene1.from;
  // scene1 global start = 533

  // VTT-anchored delays (local = global - 533):
  // "你跟AI對話" 20.80s → 624 → local 91
  // "視窗的大小用tokens計算" 43.12s → 1294 → local 761
  // Phase A ends: "早期的語言模型視窗只有幾千個tokens" 53.36s → 1601 → local 1068
  const DEF_AT   = 91;
  const TOKEN_AT = 761;
  const A_FADE_START = 1068;
  const A_REMOVE     = 1148;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B:
  // "現在Claude的視窗已經達到20萬tokens" 59.92s → 1798 → local 1265
  // "Gemini設定達到100萬tokens" 66.72s → 2002 → local 1469
  // "整本書都能塞進去" 72.72s → 2182 → local 1649
  // bridge / rhetorical → 01:22.720 = 82.72s → 2482 → local 1949
  const B_SHOW_AT  = 1168;
  const CLAUDE_AT  = 1265;
  const GEMINI_AT  = 1469;
  const BRIDGE_AT  = 1649;
  const showB = frame >= B_SHOW_AT;

  const headerStyle     = useFadeUp(0);
  const defStyle        = useFadeUp(DEF_AT);
  const tokenStyle      = useFadeUp(TOKEN_AT);
  const sizeHeaderStyle = useFadeIn(showB ? B_SHOW_AT : 999999);
  const bridgeStyle     = useFadeIn(showB ? BRIDGE_AT : 999999);

  // Phase A height estimate:
  // header ~82px + def card ~200px + token card ~150px = ~432px < 1620px ✓

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Phase A */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 16 * S }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S }}>定義</div>
              <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S, color: C.text, fontWeight: "700", lineHeight: 1.3 }}>
                <WordReveal text="上下文視窗是什麼？" startFrame={4} staggerPerWord={5} fontSize={22 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={700} />
              </div>
            </div>

            <div style={{ ...defStyle, marginBottom: 16 * S }}>
              <div style={{ background: C.surface, border: `1px solid ${C.primaryBorder}`, borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`, boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.06)` }}>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65, marginBottom: 10 * S }}>
                  AI 在處理請求時，能同時「看到」的<span style={{ color: C.primary, fontWeight: "700" }}>最大文字量</span>
                </div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, lineHeight: 1.65, marginBottom: 10 * S }}>
                  包含：你說的話 · 對話歷史 · 貼入的文件
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.red, background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 8 * S, padding: `${6 * S}px ${12 * S}px`, display: "inline-block" }}>
                  超出範圍 → 模型看不到
                </div>
              </div>
            </div>

            <div style={{ ...tokenStyle }}>
              <div style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px` }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S }}>TOKEN 單位</div>
                <div style={{ display: "flex", gap: 18 * S, flexWrap: "wrap" as const }}>
                  <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65 }}>英文單字 ≈ <span style={{ color: C.primary, fontWeight: "700" }}>1 token</span></span>
                  <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65 }}>中文字 ≈ <span style={{ color: C.primary, fontWeight: "700" }}>1–2 tokens</span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase B — size evolution */}
        {showB && (
          <>
            <div style={{ ...sizeHeaderStyle, marginBottom: 16 * S }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S }}>視窗大小演進</div>
              <div style={{ background: C.surface, border: `1px solid ${C.primaryBorder}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px` }}>
                <SizeItem label="早期模型"   sublabel="~2K tokens · 一兩千字文章"  color={C.muted}   delay={B_SHOW_AT} />
                <SizeItem label="Claude 3.5+" sublabel="200K tokens · 約15萬英文字" color={C.primary} delay={CLAUDE_AT} />
                <SizeItem label="Gemini 1.5+" sublabel="1M tokens · 整本書都能塞進去" color={C.yellow} delay={GEMINI_AT} />
              </div>
            </div>

            <div style={{ ...bridgeStyle }}>
              <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 12 * S, padding: `${14 * S}px ${20 * S}px` }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.red, letterSpacing: "0.06em", marginBottom: 8 * S }}>真實痛點</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65 }}>
                  跟 AI 聊到後面它突然「忘記」之前說的事？那就是碰到了<span style={{ color: C.red, fontWeight: "700" }}>上下文視窗的邊界</span>了
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <TokenSizeRaceAnimation triggerLocalFrame={1068} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 helpers ─────────────────────────────────────────────────────────
function LimitItem({ text, delay }: { text: string; delay: number }) {
  const s = useFadeUp(delay);
  return (
    <div style={{ ...s, display: "flex", alignItems: "flex-start", gap: 10 * S, marginBottom: 10 * S }}>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.red, flexShrink: 0 }}>✕</span>
      <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65 }}>{text}</div>
    </div>
  );
}
function PowerItem({ text, delay }: { text: string; delay: number }) {
  const s = useFadeUp(delay);
  return (
    <div style={{ ...s, display: "flex", alignItems: "flex-start", gap: 10 * S, marginBottom: 10 * S }}>
      <div style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary, marginTop: 7 * S, flexShrink: 0, boxShadow: `0 0 ${6 * S}px ${C.primary}88` }} />
      <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65 }}>{text}</div>
    </div>
  );
}

// ── Scene2 — 為什麼是競爭關鍵？ ───────────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur   = SCENES_2026_04_23.scene2.to - SCENES_2026_04_23.scene2.from;
  // scene2 global start = 2486

  // VTT-anchored delays (local = global - 2486):
  // "短視窗的時代...分析" 01:30.640 = 90.64s → 2719 → local 233
  // "它可能讀不完" 01:35.680 = 95.68s → 2870 → local 384
  // "只能處理片段" 01:42.240 = 102.24s → 3067 → local 581
  // "過了幾輪對話就全忘了" 01:47.840 = 107.84s → 3235 → local 749
  // "長視窗帶來的新可能" 01:47.840 = 107.84s → 3235 → local 749
  // "整本合約" 01:51.040 = 111.04s → 3331 → local 845
  // "幾個小時的訪談" 01:54.240 = 114.24s → 3427 → local 941
  // "整個程式碼庫" 01:58.160 = 118.16s → 3545 → local 1059
  // Phase A ends: "是非常實際的競爭優勢" 02:18.000 = 138s → 4140 → local 1654
  const SHORT_AT  = 233;
  const LIMIT1_AT = 384;
  const LIMIT2_AT = 581;
  const LIMIT3_AT = 749;
  const LONG_AT   = 749;
  const POWER1_AT = 845;
  const POWER2_AT = 941;
  const POWER3_AT = 1059;

  const A_FADE_START = 1654;
  const A_REMOVE     = 1734;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B:
  // "研究發現" 02:20.160 = 140.16s → 4205 → local 1719 (< 1754 → clamp to B_SHOW_AT)
  // "這叫做迷失在中間問題" 02:31.600 = 151.6s → 4548 → local 2062
  const B_SHOW_AT    = 1754;
  const LOST_NAME_AT = 2062;
  const showB = frame >= B_SHOW_AT;

  const headerStyle    = useFadeUp(0);
  const shortLabel     = useFadeIn(SHORT_AT);
  const longLabel      = useFadeIn(LONG_AT);
  const lostDefStyle   = useFadeUp(showB ? B_SHOW_AT : 999999);
  const lostNameStyle  = useFadeUp(showB ? LOST_NAME_AT : 999999);

  // Phase A height estimate:
  // header ~82px + short card ~220px + long card ~220px = ~522px < 1620px ✓

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Phase A — short vs long window */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 18 * S }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S }}>為什麼是競爭關鍵？</div>
              <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S, color: C.text, fontWeight: "700", lineHeight: 1.3 }}>
                視窗長短直接決定 AI 能做什麼任務
              </div>
            </div>

            {/* Short window failures */}
            <div style={{ ...shortLabel, marginBottom: 16 * S }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.red, letterSpacing: "0.08em", marginBottom: 8 * S }}>短視窗時代的限制</div>
              <div style={{ background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px` }}>
                <LimitItem text="貼一份長報告給 AI，它可能讀不完"    delay={LIMIT1_AT} />
                <LimitItem text="整理會議記錄，它只能處理片段"        delay={LIMIT2_AT} />
                <LimitItem text="幾輪對話後就忘記你的使用習慣"        delay={LIMIT3_AT} />
              </div>
            </div>

            {/* Long window possibilities */}
            <div style={{ ...longLabel }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S }}>長視窗帶來的新可能</div>
              <div style={{ background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`, boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.08)` }}>
                <PowerItem text="整本合約一次丟進去讓 AI 分析"               delay={POWER1_AT} />
                <PowerItem text="幾小時訪談逐字稿，一次全部處理"             delay={POWER2_AT} />
                <PowerItem text="整個程式碼庫讓 AI 通覽，理解整體架構再回答" delay={POWER3_AT} />
              </div>
            </div>
          </div>
        )}

        {/* Phase B — Lost in the middle */}
        {showB && (
          <>
            <div style={{ ...lostDefStyle, marginBottom: 16 * S }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S }}>⚠ 有趣的反例</div>
              <div style={{ background: C.yellowLight, border: `1.5px solid ${C.yellow}`, borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`, boxShadow: `0 0 ${24 * S}px rgba(255,209,102,0.1)` }}>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65, marginBottom: 10 * S }}>
                  研究發現，很多模型在處理超長文字時，被放在<span style={{ color: C.yellow, fontWeight: "700" }}>中間的內容表現比較差</span>
                </div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, lineHeight: 1.65 }}>
                  對開頭和結尾的注意力更高
                </div>
              </div>
            </div>

            <div style={{ ...lostNameStyle }}>
              <div style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px` }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: C.yellow, fontWeight: "700", letterSpacing: "0.06em", marginBottom: 8 * S, textShadow: `0 0 ${12 * S}px rgba(255,209,102,0.5)` }}>「迷失在中間」問題</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, lineHeight: 1.65 }}>
                  視窗夠長，不代表每個位置都被「好好閱讀」
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <DocumentOverflowAnimation triggerLocalFrame={233} />
        <LostInMiddleAnimation triggerLocalFrame={2062} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 helpers ─────────────────────────────────────────────────────────
function CautionItem({ icon, title, detail, delay, color }: { icon: string; title: string; detail: string; delay: number; color: string }) {
  const s = useFadeUp(delay);
  return (
    <div style={{ ...s, marginBottom: 14 * S }}>
      <div style={{ display: "flex", gap: 14 * S, alignItems: "flex-start", background: `${color}12`, border: `1px solid ${color}44`, borderRadius: 14 * S, padding: `${14 * S}px ${18 * S}px` }}>
        <span style={{ fontSize: 24 * S, flexShrink: 0 }}>{icon}</span>
        <div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color, fontWeight: "700", marginBottom: 6 * S }}>{title}</div>
          <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65 }}>{detail}</div>
        </div>
      </div>
    </div>
  );
}

// ── Scene3 — 實際使用建議 ──────────────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur   = SCENES_2026_04_23.scene3.to - SCENES_2026_04_23.scene3.from;
  // scene3 global start = 5064

  // VTT-anchored delays (local = global - 5064):
  // "好訊息是" 02:52.400 = 172.4s → 5172 → local 108
  // "不用在手動切片" 02:59.200 = 179.2s → 5376 → local 312
  // "對需要做檔案分析" 03:02.640 = 182.64s → 5479 → local 415
  // Phase A ends: "這是巨大的效率提升" ends 03:11.760 = 191.76s → 5753 → local 689
  const GOOD_AT     = 108;
  const USECASES_AT = 415;

  const A_FADE_START = 689;
  const A_REMOVE     = 769;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B:
  // "第一,成本隨視窗增長" 03:13.600 = 193.6s → 5808 → local 744 (< 789 → clamp to B_SHOW_AT)
  // "第二,不是塞越多越好" 03:31.360 = 211.36s → 6341 → local 1277
  // "第三,長視窗不等於長記憶" 03:45.120 = 225.12s → 6754 → local 1690
  const B_SHOW_AT  = 789;
  const CAUTION1_AT = B_SHOW_AT;  // 789 (since 744 < 789)
  const CAUTION2_AT = 1277;
  const CAUTION3_AT = 1690;
  const showB = frame >= B_SHOW_AT;

  const headerStyle  = useFadeUp(0);
  const goodStyle    = useFadeUp(GOOD_AT);
  const usecasesStyle = useFadeUp(USECASES_AT);
  const bHeaderStyle = useFadeIn(showB ? B_SHOW_AT : 999999);

  // Phase B height estimate:
  // header ~38px + 3 caution cards × ~170px = ~548px < 1620px ✓

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Phase A — good news */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 16 * S }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S }}>對你的實際影響</div>
              <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S, color: C.text, fontWeight: "700", lineHeight: 1.3 }}>
                長視窗讓這些任務成為可能
              </div>
            </div>

            <div style={{ ...goodStyle, marginBottom: 16 * S }}>
              <div style={{ background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`, boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.08)` }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary, letterSpacing: "0.06em", marginBottom: 8 * S }}>好消息</div>
                <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65 }}>
                  現在可以把更長的文件、更複雜的背景資料丟給 AI，不用再手動切片分批處理
                </div>
              </div>
            </div>

            <div style={{ ...usecasesStyle }}>
              <div style={{ background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px` }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S }}>適用場景</div>
                {["📄 文件分析 · 合約審查", "💬 逐字稿整理 · 會議記錄", "💻 程式碼審查 · 架構理解"].map((item, i) => (
                  <div key={i} style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65, padding: `${4 * S}px 0`, borderBottom: i < 2 ? `1px solid rgba(255,255,255,0.04)` : "none" }}>{item}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Phase B — three cautions */}
        {showB && (
          <>
            <div style={{ ...bHeaderStyle, marginBottom: 16 * S }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em" }}>但有幾件事要注意</div>
            </div>
            <CautionItem icon="💰" title="第一：成本隨視窗增長"    detail="AI API 按 tokens 計費，塞越多費用越高。只放真正需要的內容。"                                           delay={CAUTION1_AT} color={C.yellow} />
            <CautionItem icon="📍" title="第二：不是塞越多越好"    detail="迷失在中間問題：關鍵資訊最好放在 Prompt 的開頭或結尾，避免被忽略。"                                   delay={CAUTION2_AT} color={C.primary} />
            <CautionItem icon="🧠" title="第三：長視窗 ≠ 長記憶"  detail="上下文視窗只作用於當次對話。下次新對話，AI 又從零開始。長期記憶需要其他機制。" delay={CAUTION3_AT} color={C.red} />
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ThreeCautionsAnimation triggerLocalFrame={B_SHOW_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene ────────────────────────────────────────────────────────────
function SummaryCard({ number, text, delay, color, border }: { number: string; text: string; delay: number; color: string; border: string }) {
  const s = useFadeUp(delay);
  return (
    <div style={{ ...s, marginBottom: 16 * S }}>
      <div style={{ display: "flex", gap: 14 * S, alignItems: "flex-start", background: `${border}12`, border: `1px solid ${border}`, borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px` }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color, fontWeight: "700", flexShrink: 0, marginTop: 2 * S, textShadow: `0 0 ${10 * S}px ${color}88` }}>{number}</div>
        <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.65 }}>{text}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_04_23.summary.to - SCENES_2026_04_23.summary.from;
  // summary global start = 7694
  // VTT-anchored delays (local = global - 7694):
  // "上下文視窗是AI在處理請求時" 04:18.400 = 258.4s → 7752 → local 58
  // "各家公司搶著拉長視窗" 04:27.360 = 267.36s → 8021 → local 327
  // "使用時記得" 04:38.000 = 278s → 8340 → local 646
  // "這裡是每日AI知識庫" 04:49.120 = 289.12s → 8674 → local 980
  const BADGE_AT  = 0;
  const CARD1_AT  = 58;
  const CARD2_AT  = 327;
  const CARD3_AT  = 646;
  const OUTRO_AT  = 980;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        <div style={{ ...badgeStyle, marginBottom: 18 * S, marginTop: 24 * S }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary, letterSpacing: "0.12em", background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px` }}>
            <WordReveal text="重點整理" startFrame={4} staggerPerWord={5} fontSize={18 * S} color={C.primary} fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
          </span>
        </div>

        <SummaryCard number="01" delay={CARD1_AT} color={C.primary} border={C.primary}
          text="上下文視窗是 AI 在處理請求時能同時看到的最大文字量——超出就看不到，大小以 tokens 計算"
        />
        <SummaryCard number="02" delay={CARD2_AT} color={C.primary} border={C.primary}
          text="各家公司搶著拉長視窗，因為這直接決定 AI 能做哪些複雜任務，是真實的競爭優勢"
        />
        <SummaryCard number="03" delay={CARD3_AT} color={C.yellow} border={C.yellow}
          text="使用時記得：成本隨視窗增長 · 關鍵資訊放開頭或結尾 · 長視窗不等於長期記憶"
        />

        <div style={{ ...outroStyle, marginTop: 10 * S }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em", textAlign: "center" as const }}>每日 AI 知識庫</div>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Composition
// ─────────────────────────────────────────────────────────────────────────────
export function VideoComposition_2026_04_23() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_04_23.scene1;
  const S2 = SCENES_2026_04_23.scene2;
  const S3 = SCENES_2026_04_23.scene3;
  const SU = SCENES_2026_04_23.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-23-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v  = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_04_23 - 150, TOTAL_FRAMES_2026_04_23], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
