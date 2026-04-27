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
// TitleScene:   0s–34.72s   → 0–1042
// Scene1:       34.72s–150.64s → 1042–4519
// Scene2:       150.64s–287.76s → 4519–8633
// Scene3:       287.76s–375.12s → 8633–11254
// SummaryScene: 375.12s–420.24s → 11254–12607
export const SCENES_2026_04_17 = {
  title:   { from: 0,     to: 1042  },
  scene1:  { from: 1042,  to: 4519  },
  scene2:  { from: 4519,  to: 8633  },
  scene3:  { from: 8633,  to: 11254 },
  summary: { from: 11254, to: 12607 },
} as const;
export const TOTAL_FRAMES_2026_04_17 = 12607;

const CHAPTERS = [
  { label: "今日焦點",      start: 0     },
  { label: "Google 的佈局", start: 1042  },
  { label: "Claude 大升級", start: 4519  },
  { label: "Snap 裁員事件", start: 8633  },
  { label: "重點整理",      start: 11254 },
] as const;

// ── iMessage callouts (global frames) ──────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  {
    from: 4111, to: 4519,
    sender: "想一想",
    text: "如果你的瀏覽器或電腦隨時都內建 AI，你最希望它在哪個情境下幫你？",
  },
  {
    from: 8275, to: 8633,
    sender: "想一想",
    text: "如果 Claude 可以設定「當某件事發生就自動做」，你最想自動化的工作流程是什麼？",
  },
  {
    from: 10838, to: 11254,
    sender: "想一想",
    text: "你覺得「AI 替代重複性工作」這個說法公平嗎？企業應該要幫員工轉型嗎？",
  },
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
        background: "radial-gradient(circle, rgba(124,255,178,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: 700 * S, height: 700 * S, top: 300 * S, right: -100 * S,
        background: "radial-gradient(circle, rgba(124,255,178,0.04) 0%, transparent 70%)",
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

// 1. ChromeAIIntegrationAnimation
// trigger global 403 (00:13.440) "Google把Gemini塞進了你每天在用的地方"
// DURATION=539 → covers to global 942 (still within TitleScene 0-1042)
function ChromeAIIntegrationAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 539;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const browserScale = easeOutBack(prog(f, 20));
  const geminiF = Math.max(0, f - 30);
  const geminiOp = interpolate(geminiF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const geminiScale = easeOutBack(Math.min(geminiF / 20, 1));
  const pulse = Math.sin(f * 0.05) * 0.25 + 0.75;
  const labelOp = interpolate(Math.max(0, f - 60), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
    }}>
      {/* Chrome browser frame */}
      <div style={{
        width: 180 * S, height: 130 * S,
        border: `${2 * S}px solid rgba(255,255,255,0.18)`,
        borderRadius: 14 * S,
        background: "rgba(10,10,10,0.85)",
        display: "flex", flexDirection: "column",
        transform: `scale(${browserScale})`,
        overflow: "hidden",
      }}>
        {/* Browser tab bar */}
        <div style={{
          height: 22 * S,
          background: "rgba(255,255,255,0.05)",
          borderBottom: `1px solid rgba(255,255,255,0.08)`,
          display: "flex", alignItems: "center", gap: 5 * S, padding: `0 ${8 * S}px`,
          flexShrink: 0,
        }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
            <div key={i} style={{ width: 7 * S, height: 7 * S, borderRadius: "50%", background: c }} />
          ))}
        </div>
        {/* AI inside browser */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          opacity: geminiOp,
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 * S }}>
            <div style={{
              width: 38 * S, height: 38 * S, borderRadius: "50%",
              background: `radial-gradient(circle, rgba(124,255,178,0.25), rgba(124,255,178,0.04))`,
              border: `${2 * S}px solid ${C.primary}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18 * S,
              transform: `scale(${geminiScale})`,
              boxShadow: `0 0 ${Math.round(20 * S * pulse)}px rgba(124,255,178,0.55)`,
            }}>✨</div>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
              color: C.primary, letterSpacing: "0.06em",
            }}>AI Mode</div>
          </div>
        </div>
      </div>
      {/* Label */}
      <div style={{
        opacity: labelOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
        color: C.muted, textAlign: "center" as const,
      }}>Gemini 進入 Chrome</div>
    </div>
  );
}

// 2. SearchEvolutionAnimation
// Scene1 local trigger 2052 (01:43.120) "這讓我想到搜尋引擎的演變"
// DURATION=680 → covers to local 2732 (01:43.120→02:02.800 "基礎設施")
function SearchEvolutionAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 680;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Steps in a visual flow — all from one sentence, small stagger is appropriate
  const s1Op = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const a1Op = interpolate(Math.max(0, f - 22), [0, 14], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const s2Op = interpolate(Math.max(0, f - 36), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const a2Op = interpolate(Math.max(0, f - 58), [0, 14], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const s3Op = interpolate(Math.max(0, f - 72), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const s3Scale = easeOutBack(Math.min(Math.max(0, f - 72) / 18, 1));

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 10 * S,
      alignItems: "flex-end",
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>搜尋引擎演變</div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 * S }}>
        {/* Step 1 */}
        <div style={{
          opacity: s1Op,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
          background: "rgba(0,0,0,0.8)", border: `1px solid rgba(255,255,255,0.1)`,
          borderRadius: 10 * S, padding: `${8 * S}px ${10 * S}px`, minWidth: 68 * S,
        }}>
          <span style={{ fontSize: 18 * S }}>🌐</span>
          <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S, color: C.muted, textAlign: "center" as const }}>特定網站</span>
        </div>
        <div style={{ opacity: a1Op, color: C.muted, fontSize: 16 * S }}>→</div>
        {/* Step 2 */}
        <div style={{
          opacity: s2Op,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
          background: "rgba(0,0,0,0.8)", border: `1px solid rgba(255,255,255,0.15)`,
          borderRadius: 10 * S, padding: `${8 * S}px ${10 * S}px`, minWidth: 68 * S,
        }}>
          <span style={{ fontSize: 18 * S }}>🔍</span>
          <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S, color: C.text, textAlign: "center" as const }}>瀏覽器列</span>
        </div>
        <div style={{ opacity: a2Op, color: C.primary, fontSize: 16 * S }}>→</div>
        {/* Step 3 */}
        <div style={{
          opacity: s3Op,
          transform: `scale(${s3Scale})`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
          background: C.primaryLight, border: `1.5px solid ${C.primaryBorder}`,
          borderRadius: 10 * S, padding: `${8 * S}px ${10 * S}px`, minWidth: 68 * S,
          boxShadow: `0 0 ${14 * S}px rgba(124,255,178,0.25)`,
        }}>
          <span style={{ fontSize: 18 * S }}>✨</span>
          <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S, color: C.primary, textAlign: "center" as const, fontWeight: "700" }}>AI 無所不在</span>
        </div>
      </div>
    </div>
  );
}

// 3. RoutinesClockAnimation
// Scene2 local trigger 1635 (03:25.120) "Routines 例行任務上線"
// DURATION=1013 → covers to local 2648 (03:54.240 "GitHub事件自動啟動")
// trigger delays VTT-synced:
//   排程:    03:44.640 → global 6686 → local 6686-4519=2167 → f=2167-1635=532
//   API:     03:47.280 → global 6882 → local 6882-4519=2363 → f=2363-1635=728
//   GitHub:  03:50.240 → global 7007 → local 7007-4519=2488 → f=2488-1635=853
//   自動執行: 03:58.400 → global 7152 → local 7152-4519=2633 → f=2633-1635=998
function RoutinesClockAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1013;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const gearScale = easeOutBack(prog(f, 20));
  const labelOp = interpolate(Math.max(0, f - 12), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const triggerItems = [
    { label: "⏰ 排程自動執行", delayF: 532 },
    { label: "🔗 API 觸發",    delayF: 728 },
    { label: "📦 GitHub PR",   delayF: 853 },
  ];

  const checkF = Math.max(0, f - 998);
  const checkOp = interpolate(checkF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const checkScale = easeOutBack(Math.min(checkF / 20, 1));

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 160 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
      width: 210 * S,
    }}>
      {/* Gear + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
        <div style={{
          width: 48 * S, height: 48 * S, borderRadius: "50%",
          border: `${2 * S}px solid ${C.primary}`,
          background: C.primaryLight,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22 * S,
          transform: `scale(${gearScale})`,
          boxShadow: `0 0 ${16 * S}px rgba(124,255,178,0.3)`,
        }}>⚙️</div>
        <div style={{
          opacity: labelOp,
          fontFamily: "'Space Mono', monospace", fontSize: 12 * S,
          color: C.primary, letterSpacing: "0.06em",
        }}>ROUTINES</div>
      </div>

      {/* Trigger options (VTT-synced) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S, width: "100%" }}>
        {triggerItems.map((t, i) => {
          const tOp = interpolate(Math.max(0, f - t.delayF), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const tTx = interpolate(Math.max(0, f - t.delayF), [0, 18], [20 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: tOp,
              transform: `translateX(${tTx}px)`,
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
              color: C.text,
              background: "rgba(0,0,0,0.7)",
              border: `1px solid rgba(124,255,178,0.14)`,
              borderRadius: 8 * S,
              padding: `${5 * S}px ${10 * S}px`,
            }}>{t.label}</div>
          );
        })}
      </div>

      {/* AI 自動執行 confirmation */}
      <div style={{
        opacity: checkOp,
        transform: `scale(${checkScale})`,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
        color: C.primary, fontWeight: "700",
        background: C.primaryLight,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S,
        padding: `${6 * S}px ${14 * S}px`,
        boxShadow: `0 0 ${12 * S}px rgba(124,255,178,0.3)`,
      }}>✓ AI 自動執行</div>
    </div>
  );
}

// 4. PassiveActiveShiftAnimation
// Scene2 local trigger 2892 (04:07.040) "推進成一個它自己會去做的Agent"
// DURATION=505 → covers to local 3397 (04:20.880 "不需要你每次都在線盯著")
// VTT-synced delays:
//   BEFORE box: appears immediately (trigger = when speaker introduces shift)
//   AFTER box: 04:13.840 → local 3096 → f=3096-2892=204 "過去是你主動問它被動答"
function PassiveActiveShiftAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 505;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const beforeScale = easeOutBack(prog(f, 20));
  const arrowOp = interpolate(Math.max(0, f - 40), [0, 15], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // After box appears at f=204 — VTT 04:13.840 "過去是你主動問,它被動答"
  const afterF = Math.max(0, f - 204);
  const afterOp = interpolate(afterF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const afterScale = easeOutBack(Math.min(afterF / 18, 1));

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 10 * S,
      width: 220 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>模式轉變</div>

      {/* Before */}
      <div style={{
        transform: `scale(${beforeScale})`,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid rgba(255,255,255,0.12)`,
        borderRadius: 10 * S,
        padding: `${10 * S}px ${12 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
          color: C.muted, marginBottom: 5 * S, letterSpacing: "0.06em",
        }}>BEFORE</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
          color: C.muted, lineHeight: 1.5,
        }}>你問 → AI 答（被動）</div>
      </div>

      {/* Arrow */}
      <div style={{
        opacity: arrowOp, fontSize: 18 * S,
        color: C.primary, textAlign: "center" as const,
        filter: `drop-shadow(0 0 ${5 * S}px ${C.primary})`,
      }}>↓</div>

      {/* After */}
      <div style={{
        opacity: afterOp,
        transform: `scale(${afterScale})`,
        background: C.primaryLight,
        border: `1.5px solid ${C.primaryBorder}`,
        borderRadius: 10 * S,
        padding: `${10 * S}px ${12 * S}px`,
        boxShadow: `0 0 ${16 * S}px rgba(124,255,178,0.2)`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
          color: C.primary, marginBottom: 5 * S, letterSpacing: "0.06em",
        }}>AFTER</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
          color: C.text, lineHeight: 1.5, fontWeight: "700",
        }}>觸發 → AI 自動做（主動）</div>
      </div>
    </div>
  );
}

// 5. SnapLayoffAnimation
// Scene3 local trigger 893 (05:17.520) "他說的很直接：AI已經可以取代重複性的工作了"
// DURATION=646 → covers to local 1539 (05:36.080 "節省超過5億美元")
// VTT-synced delays:
//   AI bot:    05:20.960 → local 9629-8633=996 → f=996-893=103
//   fades:     05:23.360 → local 9701-8633=1068 → f=1068-893=175
//   $500M:     05:29.120 → local 9874-8633=1241 → f=1241-893=348
function SnapLayoffAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 646;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const peopleOp = interpolate(f, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const botF = Math.max(0, f - 103);
  const botOp = interpolate(botF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const botScale = easeOutBack(Math.min(botF / 20, 1));
  const moneyF = Math.max(0, f - 348);
  const moneyOp = interpolate(moneyF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const moneyScale = easeOutBack(Math.min(moneyF / 20, 1));

  const personFadeStart = 175;

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 190 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 12 * S,
      alignItems: "center", width: 190 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>Snap 裁員 10%</div>

      {/* 10 people grid */}
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 * S, justifyContent: "center" }}>
        {Array.from({ length: 10 }, (_, i) => {
          const isFading = i < 9;
          const fadeDelay = personFadeStart + i * 14;
          const personDim = isFading
            ? interpolate(Math.max(0, f - fadeDelay), [0, 20], [1, 0.15], { extrapolateRight: "clamp" })
            : 1;
          const xOp = isFading
            ? interpolate(Math.max(0, f - fadeDelay - 6), [0, 12], [0, 1], { extrapolateRight: "clamp" })
            : 0;
          return (
            <div key={i} style={{ position: "relative", opacity: peopleOp * personDim }}>
              <span style={{ fontSize: 16 * S }}>👤</span>
              {isFading && (
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11 * S, color: C.red, opacity: xOp,
                  fontWeight: "700",
                }}>✕</div>
              )}
            </div>
          );
        })}
      </div>

      {/* AI robot */}
      <div style={{
        opacity: botOp,
        transform: `scale(${botScale})`,
        fontSize: 26 * S,
        filter: `drop-shadow(0 0 ${10 * S}px rgba(124,255,178,0.6))`,
      }}>🤖</div>

      {/* Savings counter */}
      <div style={{
        opacity: moneyOp,
        transform: `scale(${moneyScale})`,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, fontWeight: "700",
        textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.6)`,
        textAlign: "center" as const,
        background: C.primaryLight,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S,
        padding: `${6 * S}px ${12 * S}px`,
      }}>省 $5 億 / 年</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_17.title.to - SCENES_2026_04_17.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(32);
  const tagStyle = useFadeUp(48);

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
            fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
          }}>每日 AI 知識庫</span>
        </div>

        <h1 style={{ margin: 0, lineHeight: 1.15, fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900, fontSize: 40 * S, color: C.text }}>
          <WordReveal text="Google 把 AI 塞進你的瀏覽器" startFrame={10} staggerPerWord={6}
            fontSize={40 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>
        <h1 style={{ margin: 0, lineHeight: 1.2, marginTop: 4 * S, fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900, fontSize: 30 * S, color: C.primary }}>
          <WordReveal text="Claude 也在同一週大升級" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 20 * S,
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
        }}>
          本週三大 AI 事件：Gemini 入場、Claude 升級、Snap 裁員一千人
        </p>

        <div style={{ ...tagStyle, marginTop: 16 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>Google · Claude · AI 裁員 · 週五時事</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ChromeAIIntegrationAnimation triggerFrame={403} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — Google 的佈局 ─────────────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_17.scene1.to - SCENES_2026_04_17.scene1.from;
  // scene1 starts at global 1042
  // VTT local frame anchors (global - 1042):
  // 00:39.600 → global 1188 → local 146    (AI Mode Chrome)
  // 01:03.680 → global 1910 → local 868    (MacOS Gemini App)
  // 01:20.640 → global 2419 → local 1377   (Personal Intelligence)
  // 01:33.680 → global 2810 → local 1768   (Google 策略)
  // 01:43.120 → global 3094 → local 2052   (搜尋引擎演變 — SearchEvolutionAnimation)
  // Phase A ends at: 02:17.040 → global 4111 → local 3069

  const CHROME_AT  = 146;
  const MACOS_AT   = 868;
  const PI_AT      = 1377;
  const STRAT_AT   = 1768;
  const SEARCH_ANIM_AT = 2052;

  const A_FADE_START = 3069;
  const A_REMOVE     = A_FADE_START + 80;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B: 02:17.040 "停一下想一想" → end of scene
  const B_SHOW_AT   = A_REMOVE + 20;  // 3169
  // 02:19.200 → global 4236 → local 3194 (Phase B question content)
  const QUESTION_AT = showA ? 999999 : 3194;
  const showB       = frame >= B_SHOW_AT;

  const chromeStyle   = useFadeUp(CHROME_AT);
  const macosStyle    = useFadeUp(MACOS_AT);
  const piStyle       = useFadeUp(PI_AT);
  const stratStyle    = useFadeUp(STRAT_AT);
  const questionStyle = useFadeUp(QUESTION_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Section heading */}
            <div style={{ marginBottom: 16 * S, marginTop: 10 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 12 * S,
                color: C.muted, letterSpacing: "0.1em", marginBottom: 8 * S,
              }}>STORY 01</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                color: C.text, fontWeight: "900", lineHeight: 1.25,
              }}>Google 的佈局</div>
            </div>

            {/* Chrome AI Mode card */}
            <div style={{ ...chromeStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.05)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>① AI MODE · CHROME</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: "700", marginBottom: 8 * S,
                }}>AI Mode 正式進入 Chrome</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                  color: C.muted, lineHeight: 1.6,
                }}>原生整合，不是插件。瀏覽網頁時直接提問、摘要、深入探索，無需切換視窗。</div>
              </div>
            </div>

            {/* MacOS Gemini App card */}
            <div style={{ ...macosStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>② GEMINI APP · MACOS</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, fontWeight: "700", marginBottom: 8 * S,
                }}>原生 Gemini App 上線</div>
                <div style={{
                  display: "flex", gap: 12 * S, flexWrap: "wrap" as const, marginBottom: 8 * S,
                }}>
                  {["macOS 15+", "免費", "Option + Space"].map((t, i) => (
                    <span key={i} style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                      color: C.yellow, background: C.yellowLight,
                      border: `1px solid ${C.yellowBorder}`,
                      borderRadius: 4 * S, padding: `${3 * S}px ${8 * S}px`,
                    }}>{t}</span>
                  ))}
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                  color: C.muted, lineHeight: 1.6,
                }}>桌面任何地方直接呼叫，不需要切換視窗。</div>
              </div>
            </div>

            {/* Personal Intelligence */}
            <div style={{ ...piStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${12 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 6 * S,
                }}>③ PERSONAL INTELLIGENCE</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                  color: C.text, lineHeight: 1.6,
                }}>連線你的 <span style={{ color: C.primary }}>Gmail、日曆、照片</span>，給你更個人化的回應，向全球推出。</div>
              </div>
            </div>

            {/* Google strategy */}
            <div style={{ ...stratStyle }}>
              <div style={{
                background: "rgba(0,0,0,0.6)", border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
                boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.primary, fontWeight: "700", lineHeight: 1.5,
                }}>讓 Gemini 出現在你根本不需要特別去找的地方</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <div style={{ ...questionStyle }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 12 * S,
              color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S, marginTop: 14 * S,
            }}>🔒 AI 素養提醒</div>
            <div style={{
              background: C.yellowLight, border: `1.5px solid ${C.yellow}`,
              borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
              marginBottom: 16 * S,
            }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.yellow, fontWeight: "700", lineHeight: 1.5, marginBottom: 8 * S,
              }}>Personal Intelligence 讓 AI 讀取你的個人資料</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                color: C.muted, lineHeight: 1.6,
              }}>開啟之前，花幾分鐘了解你授權了哪些資料範圍。</div>
            </div>
          </div>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <SearchEvolutionAnimation triggerLocalFrame={SEARCH_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — Claude 大升級 ─────────────────────────────────────────────────
// Phase A height estimate:
//   Header:    ~156px
//   Opus card: ~380px (with marginBottom 42px)
//   Code card: ~380px
//   Routines:  ~380px
//   Highlight: ~120px
//   Total: 1416px < 1620px ✓
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_17.scene2.to - SCENES_2026_04_17.scene2.from;
  // scene2 starts at global 4519
  // VTT local frame anchors (global - 4519):
  // 02:38.720 → global 4762 → local 243    (Opus 4.7)
  // 03:00.320 → global 5410 → local 891    (Claude Code)
  // 03:25.120 → global 6154 → local 1635   (Routines — RoutinesClockAnimation)
  // 03:58.400 → global 7152 → local 2633   (Claude自己去做事 highlight)
  // Phase A ends: 04:02.800 → global 7284 → local 2765
  // (故意在"三件事合在一起"之前結束，讓Agent shift進入Phase B)

  const OPUS_AT     = 243;
  const CODE_AT     = 891;
  const ROUTINES_AT = 1635;
  const AUTO_AT     = 2633;
  const ROUTINES_ANIM_AT = 1635;

  // Phase A → B at "三件事合在一起其實在說同一件事" 04:01.040 → local 2712
  // But use 2633 (Auto_AT) so the Agent shift content goes in Phase B
  const A_FADE_START = 2633;
  const A_REMOVE     = A_FADE_START + 80;  // 2713
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = A_REMOVE + 20;   // 2733
  // Phase B content timing:
  // 04:02.800 → local 2765 (三件事合在一起)
  // 04:07.040 → local 2892 (推進成Agent — PassiveActiveShiftAnimation)
  // 04:13.840 → local 3096 (過去被動)
  // 04:18.640 → local 3240 (你設定好規則AI自己執行)
  // 04:24.000 → local 3401 (AI素養課題)
  const AGENT_SHIFT_AT = showA ? 999999 : 2765;
  const PASSIVE_ANIM_AT = 2892;
  const RESP_AT     = showA ? 999999 : 3401;
  const showB       = frame >= B_SHOW_AT;

  const opusStyle     = useFadeUp(OPUS_AT);
  const codeStyle     = useFadeUp(CODE_AT);
  const routinesStyle = useFadeUp(ROUTINES_AT);
  const agentStyle    = useFadeUp(AGENT_SHIFT_AT);
  const respStyle     = useFadeUp(RESP_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ marginBottom: 14 * S, marginTop: 10 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 12 * S,
                color: C.muted, letterSpacing: "0.1em", marginBottom: 8 * S,
              }}>STORY 02</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                color: C.text, fontWeight: "900", lineHeight: 1.25,
              }}>Claude 大升級</div>
            </div>

            {/* Opus 4.7 */}
            <div style={{ ...opusStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>① CLAUDE OPUS 4.7</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", marginBottom: 8 * S,
                }}>正式釋出，價格同 Opus 4.6</div>
                <div style={{
                  display: "flex", flexWrap: "wrap" as const, gap: 8 * S,
                }}>
                  {["軟體工程能力↑", "視覺理解↑", "指令遵循↑", "Agent 穩定性↑"].map((t, i) => (
                    <span key={i} style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                      color: C.primary, background: C.primaryLight,
                      border: `1px solid ${C.primaryBorder}`,
                      borderRadius: 4 * S, padding: `${3 * S}px ${8 * S}px`,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Claude Code */}
            <div style={{ ...codeStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>② CLAUDE CODE 桌面 APP</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", marginBottom: 8 * S,
                }}>全面大改版</div>
                {["側邊欄：多個平行工作階段", "整合終端機 + 內建檔案編輯器", "diff 檢視器重建，支援大型變更", "預覽面板：HTML / PDF / 開發伺服器"].map((t, i) => (
                  <div key={i} style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                    color: C.muted, lineHeight: 1.55,
                    paddingLeft: 14 * S,
                    borderLeft: `2px solid rgba(255,209,102,0.3)`,
                    marginBottom: 6 * S,
                  }}>· {t}</div>
                ))}
              </div>
            </div>

            {/* Routines */}
            <div style={{ ...routinesStyle }}>
              <div style={{
                background: C.primaryLight, border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.1)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>③ ROUTINES — 最值得關注</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: "900", marginBottom: 8 * S,
                }}>例行任務自動化上線</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                  color: C.text, lineHeight: 1.65,
                }}>把 Claude Code 任務打包成一套設定，選擇讓它<span style={{ color: C.primary }}> 按排程 / API / GitHub 事件</span>自動執行。</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            <div style={{ ...agentStyle, marginTop: 14 * S, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>三件事說的是同一件事</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, fontWeight: "700", lineHeight: 1.5,
                }}>
                  Anthropic 正在把 Claude 從<span style={{ color: C.muted }}>「你去問它」</span>的工具，<br />
                  推進成<span style={{ color: C.primary }}>「它自己會去做」</span>的 Agent
                </div>
              </div>
            </div>

            <div style={{ ...respStyle }}>
              <div style={{
                background: C.yellowLight, border: `1.5px solid ${C.yellow}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>⚠ AI 素養課題</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.6,
                }}>讓 AI 自動執行任務，代表你也要對它的行為負責。了解它設定了什麼、會觸發什麼動作。</div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <RoutinesClockAnimation triggerLocalFrame={ROUTINES_ANIM_AT} />
        <PassiveActiveShiftAnimation triggerLocalFrame={PASSIVE_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — Snap 裁員事件 ─────────────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_17.scene3.to - SCENES_2026_04_17.scene3.from;
  // scene3 starts at global 8633
  // VTT local frame anchors (global - 8633):
  // 04:50.000 → global 8700 → local 67    (Snap intro)
  // 04:57.440 → global 8923 → local 290   (裁員1000人)
  // 05:04.960 → global 9149 → local 516   (關閉300職缺)
  // 05:16.240 → global 9487 → local 854   (CEO Evan Spiegel)
  // 05:17.520 → global 9526 → local 893   (SnapLayoffAnimation trigger)
  // 05:29.120 → global 9874 → local 1241  ($500M)
  // Phase A ends: 05:48.000 → global 10440 → local 1807 ("更重要的問題是")

  const INTRO_AT    = 0;
  const LAYOFF_AT   = 290;
  const CEO_AT      = 854;
  const CONCRETE_AT = 1241;
  const SNAP_ANIM_AT = 893;

  const A_FADE_START = 1807;
  const A_REMOVE     = A_FADE_START + 80;  // 1887
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = A_REMOVE + 20;  // 1907
  // 05:53.680 → local 1977 (哪些部分AI難以取代)
  // 05:57.120 → local 2081 (執行者→判斷者)
  const QUESTION_AT = showA ? 999999 : 1977;
  const showB       = frame >= B_SHOW_AT;

  const introStyle    = useFadeUp(INTRO_AT);
  const layoffStyle   = useFadeUp(LAYOFF_AT);
  const ceoStyle      = useFadeUp(CEO_AT);
  const concreteStyle = useFadeUp(CONCRETE_AT);
  const questionStyle = useFadeUp(QUESTION_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...introStyle, marginBottom: 14 * S, marginTop: 10 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 12 * S,
                color: C.muted, letterSpacing: "0.1em", marginBottom: 8 * S,
              }}>STORY 03</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                color: C.text, fontWeight: "900", lineHeight: 1.25,
              }}>Snap 裁員事件</div>
            </div>

            {/* Layoff facts */}
            <div style={{ ...layoffStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.redLight, border: `1px solid ${C.redBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.red, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>SNAP · SNAPCHAT 母公司</div>
                <div style={{ display: "flex", gap: 16 * S, flexWrap: "wrap" as const }}>
                  {[
                    { num: "~1,000", label: "人 裁員" },
                    { num: "10%",    label: "全公司員工" },
                    { num: "300+",   label: "職缺關閉" },
                  ].map((stat, i) => (
                    <div key={i} style={{ textAlign: "center" as const }}>
                      <div style={{
                        fontFamily: "'Space Mono', monospace", fontSize: 28 * S,
                        color: C.red, fontWeight: "700",
                        textShadow: `0 0 ${14 * S}px rgba(255,107,107,0.5)`,
                      }}>{stat.num}</div>
                      <div style={{
                        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
                        color: C.muted,
                      }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CEO quote */}
            <div style={{ ...ceoStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
                borderLeft: `4px solid ${C.red}`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.muted, letterSpacing: "0.06em", marginBottom: 8 * S,
                }}>CEO Evan Spiegel</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55, fontWeight: "700",
                }}>
                  「AI 已經可以取代重複性的工作了，所以公司<span style={{ color: C.red }}>不再需要那麼多人力</span>。」
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 15 * S,
                  color: C.muted, marginTop: 8 * S,
                }}>沒有用「組織優化」，就直說：是 AI。</div>
              </div>
            </div>

            {/* $500M savings */}
            <div style={{ ...concreteStyle }}>
              <div style={{
                background: C.primaryLight, border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.55,
                }}>
                  這波裁員預計幫 Snap 在 2026 年下半年節省<br />
                  <span style={{ color: C.primary, fontWeight: "700", fontSize: 26 * S }}>超過 5 億美元</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 15 * S,
                  color: C.muted, marginTop: 6 * S,
                }}>AI 取代工作不再是未來式，是財務決策的現實依據。</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <div style={{ ...questionStyle, marginTop: 14 * S }}>
            <div style={{
              background: C.yellowLight, border: `1.5px solid ${C.yellow}`,
              borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
              marginBottom: 14 * S,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                color: C.yellow, letterSpacing: "0.08em", marginBottom: 10 * S,
              }}>更重要的問題</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                color: C.text, fontWeight: "700", lineHeight: 1.55, marginBottom: 10 * S,
              }}>你現在的工作裡，哪些部分是 AI 難以取代的？</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.primary, fontWeight: "700", lineHeight: 1.5,
              }}>怎麼把自己從「執行者」變成「判斷者」？</div>
            </div>
          </div>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <SnapLayoffAnimation triggerLocalFrame={SNAP_ANIM_AT} />
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
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_17.summary.to - SCENES_2026_04_17.summary.from;
  // summary starts at global 11254
  // 06:15.120 → local 0    (第一 Google)
  // 06:29.600 → local 434  (第二 Claude)
  // 06:46.480 → local 940  (第三 Snap)
  // 06:55.440 → local 1209 (outro)

  const BADGE_AT = 0;
  const CARD1_AT = 60;
  const CARD2_AT = 434;
  const CARD3_AT = 940;
  const OUTRO_AT = 1209;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        <div style={{ ...badgeStyle, marginBottom: 18 * S, marginTop: 20 * S }}>
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

        <SummaryCard
          number="01" delay={CARD1_AT}
          text="Google 把 Gemini 塞進了 Chrome 和 Mac App。AI 從偶爾用的工具，正在變成隨時都在的基礎設施。入口之爭，決定誰掌握你的日常習慣。"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="02" delay={CARD2_AT}
          text="Claude 這週推了 Opus 4.7、桌面 App 大改版，以及 Routines 自動化。Anthropic 正在把 Claude 從「被動回答」推向「主動執行」，AI Agent 自動化真正落地。"
          color={C.yellow} border={C.yellow}
        />
        <SummaryCard
          number="03" delay={CARD3_AT}
          text="Snap 裁員一千人，CEO 點名 AI。AI 取代工作不再是未來式，企業已經在用它做財務決策了。"
          color={C.red} border={C.red}
        />

        <div style={{ ...outroStyle, marginTop: 10 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
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
export function VideoComposition_2026_04_17() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_04_17.scene1;
  const S2 = SCENES_2026_04_17.scene2;
  const S3 = SCENES_2026_04_17.scene3;
  const SU = SCENES_2026_04_17.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-17-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_04_17 - 150, TOTAL_FRAMES_2026_04_17], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return Math.min(fi, fo);
        }}
        loop
      />

      <Background />

      {/* TitleScene */}
      <Sequence from={0} durationInFrames={S1.from}>
        <TitleScene />
      </Sequence>

      {/* Scene 1 — Google */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — Claude */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — Snap */}
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
