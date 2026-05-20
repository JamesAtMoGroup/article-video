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
const W = 1280 * S; // 3840
const H = 720 * S; // 2160
const NAV_H = 50 * S; // 150px
const CONTAINER_W = 640 * S; // 1920px
const COL_LEFT = (W - CONTAINER_W) / 2; // 960px
const SUBTITLE_SAFE = 120 * S; // 360px — 勿改
const CONTENT_GAP = 10 * S; // 30px
const CONTENT_TOP = NAV_H + CONTENT_GAP; // 180px
const CONTENT_H = H - CONTENT_TOP - SUBTITLE_SAFE; // 1620px

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: "#000000",
  surface: "#0d0d0d",
  surfaceBorder: "rgba(255,255,255,0.08)",
  primary: "#7cffb2",
  primaryLight: "rgba(124,255,178,0.07)",
  primaryBorder: "rgba(124,255,178,0.14)",
  text: "#ffffff",
  muted: "#888888",
  yellow: "#ffd166",
  yellowLight: "rgba(255,209,102,0.1)",
  yellowBorder: "rgba(255,209,102,0.2)",
  red: "#ff6b6b",
  redLight: "rgba(255,107,107,0.08)",
  redBorder: "rgba(255,107,107,0.2)",
} as const;

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W = 300 * S;
const NOTIF_TOP = 12 * S;
const NOTIF_RIGHT = 20 * S;
const NOTIF_SLOT = 158 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30, aligned to next topic's first word) ─
// title:    0     → 876   (scene1 "先來說清楚怎麼運作" @29.200s)
// scene1:   876   → 3084  (scene2 "為什麼這個機制那麼重要" @102.800s)
// scene2:   3084  → 4786  (scene3 "對一般使用者來說" @159.520s → 4785.6→4786)
// scene3:   4786  → 7039  (summary "好,今天的重點整理" @234.640s → 7039.2→7039)
// summary:  7039  → 8160  (audio 271.16s = frame 8135 + buffer)
export const SCENES_2026_05_20 = {
  title: { from: 0, to: 876 },
  scene1: { from: 876, to: 3084 },
  scene2: { from: 3084, to: 4786 },
  scene3: { from: 4786, to: 7039 },
  summary: { from: 7039, to: 8160 },
} as const;
export const TOTAL_FRAMES_2026_05_20 = 8160;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "怎麼運作", start: 876 },
  { label: "為什麼重要", start: 3084 },
  { label: "使用者視角", start: 4786 },
  { label: "重點整理", start: 7039 },
] as const;

// ── iMessage callouts (global frames) ──────────────────────────────────────
interface Callout {
  from: number;
  to: number;
  sender: string;
  text: string;
}
const ALL_CALLOUTS: Callout[] = [
  {
    // 89.92s "你用 AI 助理時，哪些功能其實是 AI 呼叫別的工具幫你做的"
    from: 2700,
    to: 3084,
    sender: "想一想",
    text: "你用 AI 助理時，哪些功能其實是它「呼叫別的工具」幫你做的？搜尋、計算、查資料……",
  },
  {
    // 223.6s "如果你的 AI 助理可以呼叫任何工具…你願意給它多大的自主行動空間"
    from: 6710,
    to: 7039,
    sender: "親身經歷",
    text: "如果 AI 能呼叫任何工具——發郵件、轉帳、訂機票——你願意給它多大的自主空間？什麼時候要它先問你？",
  },
];

// ── Easing tokens ──────────────────────────────────────────────────────────
const E = {
  outExpo: Easing.bezier(0.19, 1, 0.22, 1),
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
  const ty = interpolate(f, [0, 22], [22 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const op = interpolate(f, [0, 14], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return { opacity: op, transform: `translateY(${ty}px)` };
}
function useFadeIn(startFrame: number) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  return { opacity: interpolate(f, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }) };
}

// ── WordReveal ─────────────────────────────────────────────────────────────
function WordReveal({
  text,
  startFrame,
  staggerPerWord = 4,
  fontSize,
  color,
  fontFamily,
  fontWeight,
  lineHeight,
  letterSpacing,
}: {
  text: string;
  startFrame: number;
  staggerPerWord?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number | string;
  lineHeight?: number;
  letterSpacing?: string;
}) {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline", lineHeight: lineHeight ?? 1.3 }}>
      {text.split(" ").map((word, i) => {
        const f = Math.max(0, frame - (startFrame + i * staggerPerWord));
        const ty = interpolate(f, [0, 20], [18 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const op = interpolate(f, [0, 12], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: op,
              transform: `translateY(${ty}px)`,
              marginRight: "0.28em",
              fontSize,
              color,
              fontFamily,
              fontWeight,
              letterSpacing,
            }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
}

// ── SceneFade ──────────────────────────────────────────────────────────────
function SceneFade({ children, durationInFrames }: { children: React.ReactNode; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return <div style={{ opacity: Math.min(fadeIn, fadeOut), height: "100%" }}>{children}</div>;
}

// ── ContentColumn ──────────────────────────────────────────────────────────
function ContentColumn({ children, scrollUp }: { children: React.ReactNode; scrollUp?: { at: number; amount: number } }) {
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
      <div
        style={{
          position: "absolute",
          top: CONTENT_TOP,
          left: COL_LEFT,
          width: CONTAINER_W,
          height: CONTENT_H,
          overflow: "hidden" as const,
        }}
      >
        <div style={{ transform: `translateY(${scrollY}px)` }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
}

// ── Background ─────────────────────────────────────────────────────────────
function Background() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div
        style={{
          position: "absolute",
          borderRadius: "50%",
          width: 900 * S,
          height: 900 * S,
          top: -200 * S,
          left: -150 * S,
          background: "radial-gradient(circle, rgba(124,255,178,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          borderRadius: "50%",
          width: 700 * S,
          height: 700 * S,
          top: 300 * S,
          right: -100 * S,
          background: "radial-gradient(circle, rgba(124,255,178,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          borderRadius: "50%",
          width: 500 * S,
          height: 500 * S,
          bottom: 100 * S,
          left: 300 * S,
          background: "radial-gradient(circle, rgba(255,209,102,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
          backgroundSize: `${60 * S}px ${60 * S}px`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
}

// ── ProgressBar ────────────────────────────────────────────────────────────
function ProgressBar({ globalFrame }: { globalFrame: number }) {
  const { durationInFrames } = useVideoConfig();
  const progress = globalFrame / durationInFrames;
  const current = [...CHAPTERS].reverse().find((c) => globalFrame >= c.start) ?? CHAPTERS[0];
  const slideIn = interpolate(globalFrame, [0, 15], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 10 }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: NAV_H,
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.primaryBorder}`,
          padding: `${4 * S}px ${32 * S}px`,
          transform: `translateY(${interpolate(slideIn, [0, 1], [-NAV_H, 0])}px)`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 18 * S,
            color: C.muted,
            fontFamily: "'Space Mono', monospace",
            letterSpacing: "0.05em",
          }}
        >
          <span>每日 AI 知識庫</span>
          <span style={{ color: C.primary }}>{current.label}</span>
        </div>
        <div
          style={{
            height: 3 * S,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 99,
            overflow: "hidden",
            marginTop: 4 * S,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: C.primary,
              borderRadius: 99,
              boxShadow: `0 0 ${8 * S}px ${C.primary}88`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── iMessage Callout ───────────────────────────────────────────────────────
function IMessageCard({ callout, slotIndex, globalFrame }: { callout: Callout; slotIndex: number; globalFrame: number }) {
  const { fps } = useVideoConfig();
  const f = Math.max(0, globalFrame - callout.from);
  const remaining = callout.to - globalFrame;
  const slideY = spring({ frame: f, fps, config: { damping: 22, stiffness: 130 } });
  const translateY = interpolate(slideY, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);
  const fadeOut = remaining < FADE_OUT_FRAMES ? interpolate(remaining, [0, FADE_OUT_FRAMES], [0, 1], clamp) : 1;
  const slotOffset = slotIndex * NOTIF_SLOT;
  return (
    <div
      style={{
        position: "absolute",
        top: NAV_H + NOTIF_TOP + slotOffset,
        right: NOTIF_RIGHT,
        width: NOTIF_W,
        opacity: fadeOut,
        transform: `translateY(${translateY}px)`,
        zIndex: 100,
        background: "rgba(18,18,18,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 16 * S,
        border: `1px solid rgba(124,255,178,0.2)`,
        padding: `${12 * S}px ${16 * S}px`,
        boxShadow: `0 ${8 * S}px ${24 * S}px rgba(0,0,0,0.6)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 6 * S }}>
        <div
          style={{
            width: 10 * S,
            height: 10 * S,
            borderRadius: "50%",
            background: C.primary,
            boxShadow: `0 0 ${6 * S}px ${C.primary}`,
          }}
        />
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary, letterSpacing: "0.05em" }}>
          {callout.sender}
        </span>
      </div>
      <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.55 }}>
        {callout.text}
      </div>
    </div>
  );
}

function IMessageOverlay({ globalFrame }: { globalFrame: number }) {
  const active = ALL_CALLOUTS.filter((c) => globalFrame >= c.from && globalFrame < c.to);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 90 }}>
      {active.map((c, i) => (
        <IMessageCard key={c.from} callout={c} slotIndex={i} globalFrame={globalFrame} />
      ))}
    </AbsoluteFill>
  );
}

// ── RippleRing ─────────────────────────────────────────────────────────────
function RippleRing({ activeAt, color }: { activeAt: number; color: string }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - activeAt);
  if (f > 28) return null;
  const scale = interpolate(f, [0, 24], [0.85, 1.9], { easing: E.outExpo, extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 4, 24, 28], [0, 0.55, 0.2, 0], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        border: `${2 * S}px solid ${color}`,
        borderRadius: 14 * S,
        transform: `scale(${scale})`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── Reusable content cards ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

function SectionBadge({ num, label, delay = 0 }: { num: string; label: string; delay?: number }) {
  const a = useFadeUp(delay);
  return (
    <div style={{ ...a, display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 20 * S }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: C.primaryLight,
          borderLeft: `${4 * S}px solid ${C.primary}`,
          borderRadius: `0 ${8 * S}px ${8 * S}px 0`,
          padding: `${6 * S}px ${12 * S}px`,
        }}
      >
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.06em" }}>
          {num}
        </span>
      </div>
      <h2 style={{ margin: 0 }}>
        <WordReveal
          text={label}
          startFrame={delay}
          staggerPerWord={5}
          fontSize={26 * S}
          color={C.text}
          fontFamily="'Noto Sans TC', sans-serif"
          fontWeight={700}
          letterSpacing="-0.01em"
        />
      </h2>
    </div>
  );
}

// StepExplainCard — colored left-border step with mono label + body
function StepCard({ delay, color, label, text }: { delay: number; color: string; label: string; text: string }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const opacity = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const translateY = interpolate(f, [0, 22], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)`, marginBottom: 16 * S }}>
      <div
        style={{
          borderLeftWidth: 4 * S,
          borderLeftStyle: "solid",
          borderLeftColor: color,
          paddingLeft: 20 * S,
          paddingTop: 10 * S,
          paddingBottom: 10 * S,
          borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
          background: `${color}14`,
        }}
      >
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color, letterSpacing: "0.05em", marginBottom: 8 * S }}>
          {label}
        </div>
        <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.6 }}>{text}</div>
      </div>
    </div>
  );
}

// HighlightPulse — glass card with big featured text
function HighlightCard({ delay, label, text, color = C.primary }: { delay: number; label: string; text: string; color?: string }) {
  const a = useFadeUp(delay);
  return (
    <div style={{ ...a, marginBottom: 16 * S }}>
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderLeft: `${4 * S}px solid ${color}`,
          borderRadius: 16 * S,
          padding: `${18 * S}px ${24 * S}px`,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: `0 ${4 * S}px ${28 * S}px rgba(0,0,0,0.3), 0 0 ${24 * S}px ${color}1f`,
        }}
      >
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, fontWeight: 700, color, letterSpacing: "0.08em", marginBottom: 10 * S, opacity: 0.9 }}>
          {label}
        </div>
        <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 26 * S, fontWeight: 700, lineHeight: 1.45, color: C.text }}>
          <WordReveal
            text={text}
            startFrame={delay + 4}
            staggerPerWord={4}
            fontSize={26 * S}
            color={C.text}
            fontFamily="'Noto Sans TC', sans-serif"
            fontWeight={700}
          />
        </div>
      </div>
    </div>
  );
}

// Wrap a static styled card so its border+content fade in together at its VTT moment
function FadeUpBox({ delay, children, style }: { delay: number; children: React.ReactNode; style?: React.CSSProperties }) {
  const a = useFadeUp(delay);
  return <div style={{ ...a, ...style }}>{children}</div>;
}

export const SCENES = SCENES_2026_05_20;

// ══════════════════════════════════════════════════════════════════════════
// ── Concept Animations — floating visual metaphors synced to VTT ───────────
// ══════════════════════════════════════════════════════════════════════════

// 1. TalkOnlyAnimation — TitleScene (right)
// Metaphor: AI 只能輸出文字(💬)，做事的工具被擋住(✕)
// Trigger VTT: 10.560s "語言模型本質上只能做一件事,說話" → frame 317
// Last topic: 22.240s "那這些做事的能力怎麼來" → frame 667
// DURATION = (667 - 0 - 317) + 90 = 440 → 460
function TalkOnlyAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 460;
  const envelope = interpolate(f, [0, 12, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const brainScale = easeOutBack(prog(f, 22));
  const pulse = Math.sin(f * 0.08) * 0.06 + 0.94;
  const blocked = [
    { icon: "☁️", label: "查天氣" },
    { icon: "🔍", label: "搜尋資料" },
    { icon: "✈️", label: "訂機票" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 50 * S,
        top: 230 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16 * S,
        width: 240 * S,
      }}
    >
      {/* Brain that can only talk */}
      <div style={{ position: "relative", width: 200 * S, height: 150 * S }}>
        <div
          style={{
            position: "absolute",
            top: "52%",
            left: "50%",
            transform: `translate(-50%,-50%) scale(${brainScale * pulse})`,
            width: 120 * S,
            height: 120 * S,
            borderRadius: "50%",
            background: "rgba(124,255,178,0.12)",
            border: `${3 * S}px solid ${C.primary}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 60 * S,
            boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.4)`,
          }}
        >
          🧠
        </div>
        {/* speech bubble */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            opacity: interpolate(f, [10, 26], [0, 1], clamp),
            fontSize: 44 * S,
            filter: `drop-shadow(0 0 ${8 * S}px rgba(124,255,178,0.5))`,
          }}
        >
          💬
        </div>
      </div>
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 20 * S,
          color: C.primary,
          letterSpacing: "0.06em",
          textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.5)`,
        }}
      >
        只能輸出文字
      </div>

      {/* blocked actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 * S, width: "100%" }}>
        {blocked.map((b, i) => {
          const itemF = Math.max(0, f - (60 + i * 28));
          const op = interpolate(itemF, [0, 16], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const tx = interpolate(itemF, [0, 16], [26 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateX(${tx}px)`,
                display: "flex",
                alignItems: "center",
                gap: 10 * S,
                background: "rgba(255,107,107,0.1)",
                border: `1px solid ${C.redBorder}`,
                borderRadius: 10 * S,
                padding: `${8 * S}px ${12 * S}px`,
              }}
            >
              <span style={{ fontSize: 26 * S }}>{b.icon}</span>
              <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, flex: 1 }}>{b.label}</span>
              <span style={{ fontSize: 22 * S, color: C.red, fontWeight: 700 }}>✕</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 2. FunctionCallLoopAnimation — Scene1 Phase A (right)
// Metaphor: 請求/回應的循環 — AI 識別→輸出指令→工具執行→回傳整合
// Trigger VTT: 36.480s "識別出我現在需要外部工具" → scene1 local 218
// Step delays (local - trigger): 識別 0 | 指令 (403-218)=185 | 執行 (578-218)=360 | 回應 (734-218)=516
// DURATION = (734 - 218) + 90 = 606
function FunctionCallLoopAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 606;
  const envelope = interpolate(f, [0, 14, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const nodes = [
    { icon: "🧠", title: "AI 識別需求", color: C.primary, appearsAt: 0 },
    { icon: "📋", title: "輸出結構化指令", color: C.yellow, appearsAt: 185 },
    { icon: "⚙️", title: "外部工具執行", color: C.text, appearsAt: 360 },
    { icon: "↩️", title: "回傳，AI 整合回應", color: C.primary, appearsAt: 516 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 50 * S,
        top: 200 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        width: 240 * S,
      }}
    >
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, letterSpacing: "0.1em", marginBottom: 14 * S }}>
        FUNCTION CALLING
      </div>
      {nodes.map((n, i) => {
        const nf = Math.max(0, f - n.appearsAt);
        const op = interpolate(nf, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const sc = easeOutBack(prog(nf, 20));
        const arrowOp = i > 0 ? interpolate(Math.max(0, f - (nodes[i].appearsAt - 30)), [0, 14], [0, 1], clamp) : 0;
        return (
          <React.Fragment key={i}>
            {i > 0 && <div style={{ opacity: arrowOp, fontSize: 24 * S, color: C.muted, lineHeight: 1, margin: `${2 * S}px 0` }}>↓</div>}
            <div
              style={{
                opacity: op,
                transform: `scale(${sc})`,
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12 * S,
                background: "rgba(0,0,0,0.82)",
                border: `1px solid ${n.color}55`,
                borderLeft: `${4 * S}px solid ${n.color}`,
                borderRadius: 12 * S,
                padding: `${10 * S}px ${14 * S}px`,
              }}
            >
              <span style={{ fontSize: 30 * S, flexShrink: 0 }}>{n.icon}</span>
              <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, fontWeight: 700, lineHeight: 1.3 }}>
                {n.title}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// 3. CommanderAnimation — Scene1 Phase B (left)
// Metaphor: AI 是「指揮官」，真正執行的是外部工具
// Trigger VTT: 84.480s "但實際上AI扮演的是指揮官" → scene1 local 1658
// Last topic: 87.680s "真正查詢的是外部工具" → local 1754
// DURATION = (1754 - 1658) + 90 = 186 → 220
function CommanderAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 220;
  const envelope = interpolate(f, [0, 12, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const brainScale = easeOutBack(prog(f, 20));
  const lineH = interpolate(Math.max(0, f - 24), [0, 22], [0, 40 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const tools = [
    { icon: "🔍", label: "搜尋" },
    { icon: "🗄️", label: "資料庫" },
    { icon: "☁️", label: "天氣 API" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        left: 50 * S,
        top: 220 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        width: 240 * S,
      }}
    >
      {/* Commander brain */}
      <div
        style={{
          transform: `scale(${brainScale})`,
          display: "flex",
          alignItems: "center",
          gap: 10 * S,
          background: C.primaryLight,
          border: `${2 * S}px solid ${C.primary}`,
          borderRadius: 14 * S,
          padding: `${10 * S}px ${16 * S}px`,
          boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.3)`,
        }}
      >
        <span style={{ fontSize: 36 * S }}>🧠</span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary, fontWeight: 700 }}>指揮官</span>
          <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted }}>下指令</span>
        </div>
      </div>

      <div style={{ width: 3 * S, height: lineH, background: `linear-gradient(to bottom, ${C.primary}, rgba(124,255,178,0.3))` }} />

      <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, marginBottom: 10 * S }}>真正執行的工具</div>

      <div style={{ display: "flex", gap: 10 * S, justifyContent: "center", flexWrap: "wrap" as const }}>
        {tools.map((t, i) => {
          const tf = Math.max(0, f - (60 + i * 16));
          const op = interpolate(tf, [0, 16], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const sc = easeOutBack(prog(tf, 18));
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `scale(${sc})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4 * S,
                background: "rgba(255,255,255,0.06)",
                border: `1px solid rgba(255,255,255,0.14)`,
                borderRadius: 10 * S,
                padding: `${8 * S}px ${10 * S}px`,
                minWidth: 64 * S,
              }}
            >
              <span style={{ fontSize: 28 * S }}>{t.icon}</span>
              <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 4. AnswererToActorAnimation — Scene2 Phase A (left)
// Metaphor: AI 從「回答者」(💬) 升格成「行動者」(🦾)
// Trigger VTT: 104.800s "讓AI從回答者升格成了行動者" → scene2 local 60
// before 反白 at "出現之前" 109.840s → local 211-60=151 | after at "有了FC之後" 119.600s → local 504-60=444
// DURATION = (564 - 60) + 90 = 594
function AnswererToActorAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 594;
  const envelope = interpolate(f, [0, 14, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const beforeF = Math.max(0, f - 151);
  const afterF = Math.max(0, f - 444);
  const beforeScale = easeOutBack(prog(beforeF, 20));
  const afterScale = easeOutBack(prog(afterF, 20));
  const afterOp = interpolate(afterF, [0, 18], [0.18, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const arrowOp = interpolate(Math.max(0, f - 360), [0, 18], [0, 1], clamp);

  return (
    <div
      style={{
        position: "absolute",
        left: 50 * S,
        top: 230 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16 * S,
        width: 240 * S,
      }}
    >
      {/* before — 回答者 */}
      <div
        style={{
          transform: `scale(${beforeScale})`,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6 * S,
          background: C.redLight,
          border: `1px solid ${C.redBorder}`,
          borderRadius: 14 * S,
          padding: `${14 * S}px`,
        }}
      >
        <span style={{ fontSize: 48 * S }}>💬</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.red }}>回答者</span>
        <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, textAlign: "center" as const }}>
          你問它答，無法行動
        </span>
      </div>

      <div style={{ opacity: arrowOp, fontSize: 30 * S, color: C.primary, lineHeight: 1, filter: `drop-shadow(0 0 ${8 * S}px ${C.primary})` }}>
        ↓
      </div>

      {/* after — 行動者 */}
      <div
        style={{
          opacity: afterOp,
          transform: `scale(${afterScale})`,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6 * S,
          background: C.primaryLight,
          border: `${2 * S}px solid ${C.primary}`,
          borderRadius: 14 * S,
          padding: `${14 * S}px`,
          boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.3)`,
        }}
      >
        <span style={{ fontSize: 48 * S }}>🦾</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary, fontWeight: 700 }}>行動者</span>
        <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, textAlign: "center" as const }}>
          能呼叫工具，真正做事
        </span>
      </div>
    </div>
  );
}

// 5. ToolboxAnimation — Scene2 Phase B (right)
// Metaphor: Function Calling = AI 的工具箱(🧰)，工具越多能做的越多
// Trigger VTT: 137.120s "你可以把FC想成AI的工具箱" → scene2 local 1029
// Last topic: 154.080s "差別在於連接了哪些工具" → local 1538
// DURATION = (1538 - 1029) + 90 = 599
function ToolboxAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 599;
  const envelope = interpolate(f, [0, 14, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const boxScale = easeOutBack(prog(f, 22));
  const tools = ["🔍", "🗄️", "📅", "📧", "⚙️", "🌐"];

  return (
    <div
      style={{
        position: "absolute",
        right: 50 * S,
        top: 220 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18 * S,
        width: 240 * S,
      }}
    >
      <div style={{ fontSize: 80 * S, transform: `scale(${boxScale})`, filter: `drop-shadow(0 0 ${16 * S}px rgba(124,255,178,0.45))` }}>🧰</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary, letterSpacing: "0.08em" }}>AI 的工具箱</div>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 12 * S, justifyContent: "center" }}>
        {tools.map((t, i) => {
          const tf = Math.max(0, f - (90 + i * 50));
          const op = interpolate(tf, [0, 16], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const sc = easeOutBack(prog(tf, 18));
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `scale(${sc})`,
                width: 64 * S,
                height: 64 * S,
                borderRadius: 14 * S,
                background: "rgba(124,255,178,0.1)",
                border: `1px solid ${C.primaryBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34 * S,
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, textAlign: "center" as const }}>
        給它哪些工具，它就能做哪些事
      </div>
    </div>
  );
}

// 6. ToolBoundaryAnimation — Scene3 Phase A (right)
// Metaphor: 工具邊界 = 能力邊界。連到的工具能用(✅)，沒連的就做不到(✕)
// Trigger VTT: 177.920s "第一,工具邊界決定AI的能力邊界" → scene3 local 551
// disconnected at 186.720s "沒連結你的Google日曆" → local 815-551=264
// DURATION = (815 - 551) + 90 = 354
function ToolBoundaryAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 354;
  const envelope = interpolate(f, [0, 14, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const brainScale = easeOutBack(prog(f, 20));
  const connected = [
    { icon: "🔍", label: "搜尋網路", at: 30 },
    { icon: "💻", label: "執行程式", at: 70 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 50 * S,
        top: 220 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14 * S,
        width: 240 * S,
      }}
    >
      <div
        style={{
          transform: `scale(${brainScale})`,
          width: 100 * S,
          height: 100 * S,
          borderRadius: "50%",
          background: "rgba(124,255,178,0.12)",
          border: `${3 * S}px solid ${C.primary}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 48 * S,
          boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.35)`,
        }}
      >
        🧠
      </div>

      {/* connected tools */}
      {connected.map((c, i) => {
        const cf = Math.max(0, f - c.at);
        const op = interpolate(cf, [0, 16], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              opacity: op,
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10 * S,
              background: C.primaryLight,
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 10 * S,
              padding: `${8 * S}px ${12 * S}px`,
            }}
          >
            <span style={{ fontSize: 26 * S }}>{c.icon}</span>
            <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, flex: 1 }}>{c.label}</span>
            <span style={{ fontSize: 22 * S, color: C.primary, fontWeight: 700 }}>✅</span>
          </div>
        );
      })}

      {/* disconnected tool */}
      <div
        style={{
          opacity: interpolate(Math.max(0, f - 264), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 10 * S,
          background: "rgba(255,107,107,0.1)",
          border: `1px dashed ${C.redBorder}`,
          borderRadius: 10 * S,
          padding: `${8 * S}px ${12 * S}px`,
        }}
      >
        <span style={{ fontSize: 26 * S, filter: "grayscale(1)", opacity: 0.6 }}>📅</span>
        <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, flex: 1 }}>Google 日曆</span>
        <span style={{ fontSize: 22 * S, color: C.red, fontWeight: 700 }}>✕</span>
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.red, letterSpacing: "0.04em" }}>沒連到 = 做不到</div>
    </div>
  );
}

// 7. RealActionAnimation — Scene3 Phase B (right)
// Metaphor: FC 執行的動作是真實的(REAL)，不是模擬
// Trigger VTT: 190.720s "第二,FC執行的動作是真實的" → scene3 local 935
// actions at 194.720s "幫你傳送郵件修改文件呼叫API" → local 1055-935=120
// emphasis at 203.200s "後果也是真實的" → local 1310-935=375
// DURATION = (1310 - 935) + 90 = 465
function RealActionAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 465;
  const envelope = interpolate(f, [0, 14, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const stampScale = easeOutBack(prog(Math.max(0, f - 375), 18));
  const stampPulse = 0.5 + 0.5 * Math.sin(Math.max(0, f - 375) * 0.16);
  const actions = [
    { icon: "📧", label: "寄出郵件", at: 120 },
    { icon: "📝", label: "修改文件", at: 175 },
    { icon: "🔗", label: "呼叫 API", at: 230 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 50 * S,
        top: 220 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14 * S,
        width: 240 * S,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 * S, width: "100%" }}>
        {actions.map((a, i) => {
          const af = Math.max(0, f - a.at);
          const op = interpolate(af, [0, 16], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const tx = interpolate(af, [0, 16], [26 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `translateX(${tx}px)`,
                display: "flex",
                alignItems: "center",
                gap: 10 * S,
                background: "rgba(0,0,0,0.8)",
                border: `1px solid ${C.yellowBorder}`,
                borderLeft: `${4 * S}px solid ${C.yellow}`,
                borderRadius: 10 * S,
                padding: `${10 * S}px ${14 * S}px`,
              }}
            >
              <span style={{ fontSize: 28 * S }}>{a.icon}</span>
              <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>{a.label}</span>
            </div>
          );
        })}
      </div>

      {/* REAL stamp */}
      <div
        style={{
          transform: `scale(${stampScale})`,
          fontFamily: "'Space Mono', monospace",
          fontSize: 22 * S,
          fontWeight: 700,
          color: C.red,
          letterSpacing: "0.1em",
          border: `${3 * S}px solid ${C.red}`,
          borderRadius: 12 * S,
          padding: `${8 * S}px ${18 * S}px`,
          background: "rgba(255,107,107,0.08)",
          boxShadow: `0 0 ${(8 + stampPulse * 16) * S}px ${C.red}55`,
          textShadow: `0 0 ${10 * S}px rgba(255,107,107,0.6)`,
        }}
      >
        REAL · 真實發生
      </div>
      <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted }}>不是模擬</div>
    </div>
  );
}

// 8. MinPermissionAnimation — Scene3 Phase B (left)
// Metaphor: 給 AI「最小必要」的工具權限(🛡️)，非必要的關起來(🔒)
// Trigger VTT: 210.400s "你應該清楚他能呼叫哪些工具權限有多大" → scene3 local 1526
// Last topic: 214.400s "給最小必要的工具權限" → local 1646
// DURATION = (1646 - 1526) + 90 = 210 → 300 (cover up to thinking question @local 1826)
function MinPermissionAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 300;
  const envelope = interpolate(f, [0, 14, DURATION - 22, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const shieldScale = easeOutBack(prog(f, 20));
  const perms = [
    { icon: "📅", label: "讀行事曆", on: true, at: 50 },
    { icon: "📧", label: "發郵件", on: false, at: 90 },
    { icon: "💸", label: "轉帳", on: false, at: 130 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        left: 50 * S,
        top: 220 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14 * S,
        width: 240 * S,
      }}
    >
      <div style={{ fontSize: 70 * S, transform: `scale(${shieldScale})`, filter: `drop-shadow(0 0 ${14 * S}px rgba(124,255,178,0.4))` }}>🛡️</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.primary, letterSpacing: "0.06em" }}>最小必要權限</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 * S, width: "100%" }}>
        {perms.map((p, i) => {
          const pf = Math.max(0, f - p.at);
          const op = interpolate(pf, [0, 16], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const col = p.on ? C.primary : C.muted;
          return (
            <div
              key={i}
              style={{
                opacity: op,
                display: "flex",
                alignItems: "center",
                gap: 10 * S,
                background: p.on ? C.primaryLight : "rgba(255,255,255,0.04)",
                border: `1px solid ${p.on ? C.primaryBorder : "rgba(255,255,255,0.1)"}`,
                borderRadius: 10 * S,
                padding: `${8 * S}px ${12 * S}px`,
              }}
            >
              <span style={{ fontSize: 26 * S, opacity: p.on ? 1 : 0.55, filter: p.on ? "none" : "grayscale(1)" }}>{p.icon}</span>
              <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: p.on ? C.text : C.muted, flex: 1 }}>{p.label}</span>
              <span style={{ fontSize: 22 * S, color: col }}>{p.on ? "✅" : "🔒"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── Scene-specific item components (hook-safe) ─────────────────────────────
// ══════════════════════════════════════════════════════════════════════════

// Weather example row — used in Scene1 Phase B
function WeatherRow({ delay, role, roleColor, text, mono }: { delay: number; role: string; roleColor: string; text: string; mono?: boolean }) {
  const a = useFadeUp(delay);
  return (
    <div style={{ ...a, display: "flex", alignItems: "flex-start", gap: 14 * S, marginBottom: 12 * S }}>
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 18 * S,
          color: roleColor,
          fontWeight: 700,
          flexShrink: 0,
          minWidth: 92 * S,
          paddingTop: 2 * S,
        }}
      >
        {role}
      </div>
      <div
        style={{
          fontFamily: mono ? "'Space Mono', monospace" : "'Noto Sans TC', sans-serif",
          fontSize: mono ? 18 * S : 20 * S,
          color: C.text,
          lineHeight: 1.55,
        }}
      >
        {text}
      </div>
    </div>
  );
}

// Two-column contrast — used in Scene2
function ContrastTwoCol({
  delay,
  leftIcon,
  leftLabel,
  leftLabelColor,
  leftText,
  leftBg,
  leftBorder,
  rightIcon,
  rightLabel,
  rightLabelColor,
  rightText,
  rightBg,
  rightBorder,
  rightReveal,
}: {
  delay: number;
  leftIcon: string;
  leftLabel: string;
  leftLabelColor: string;
  leftText: string;
  leftBg: string;
  leftBorder: string;
  rightIcon: string;
  rightLabel: string;
  rightLabelColor: string;
  rightText: string;
  rightBg: string;
  rightBorder: string;
  rightReveal: number;
}) {
  const frame = useCurrentFrame();
  const a = useFadeUp(delay);
  const rightOp = interpolate(Math.max(0, frame - rightReveal), [0, 26], [0.18, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return (
    <div style={{ ...a, display: "flex", gap: 14 * S, marginBottom: 16 * S }}>
      <div style={{ flex: 1, background: leftBg, border: `1px solid ${leftBorder}`, borderRadius: 14 * S, padding: `${16 * S}px ${18 * S}px` }}>
        <div style={{ fontSize: 40 * S, textAlign: "center" as const, marginBottom: 8 * S }}>{leftIcon}</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: leftLabelColor, textAlign: "center" as const, marginBottom: 8 * S }}>
          {leftLabel}
        </div>
        <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.55, textAlign: "center" as const }}>
          {leftText}
        </div>
      </div>
      <div style={{ flex: 1, opacity: rightOp, background: rightBg, border: `1px solid ${rightBorder}`, borderRadius: 14 * S, padding: `${16 * S}px ${18 * S}px` }}>
        <div style={{ fontSize: 40 * S, textAlign: "center" as const, marginBottom: 8 * S }}>{rightIcon}</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: rightLabelColor, textAlign: "center" as const, marginBottom: 8 * S }}>
          {rightLabel}
        </div>
        <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text, lineHeight: 1.55, textAlign: "center" as const }}>
          {rightText}
        </div>
      </div>
    </div>
  );
}

// Tag chips row
function TagChip({ delay, text, color, light, border }: { delay: number; text: string; color: string; light: string; border: string }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const op = interpolate(f, [0, 12], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const sc = easeOutBack(prog(f, 16));
  return (
    <div
      style={{
        opacity: op,
        transform: `scale(${sc})`,
        background: light,
        border: `1px solid ${border}`,
        borderRadius: 99,
        padding: `${7 * S}px ${16 * S}px`,
        fontFamily: "'Noto Sans TC', sans-serif",
        fontSize: 20 * S,
        color,
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}

// Caution card — Scene3 (label + main + sub items)
function CautionSubItem({ delay, text }: { delay: number; text: string }) {
  const a = useFadeUp(delay);
  return (
    <div style={{ ...a, display: "flex", alignItems: "flex-start", gap: 10 * S, marginTop: 10 * S }}>
      <div style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.muted, marginTop: 12 * S, flexShrink: 0 }} />
      <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.muted, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

// Checklist item — Scene3 Phase B / generic
function ChecklistItem({ text, delay, color }: { text: string; delay: number; color: string }) {
  const a = useFadeUp(delay);
  return (
    <div style={{ ...a, display: "flex", alignItems: "flex-start", gap: 12 * S, marginBottom: 10 * S }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color, flexShrink: 0 }}>✓</div>
      <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

// Summary card
function SummaryCard({ number, text, delay, color }: { number: string; text: string; delay: number; color: string }) {
  const a = useFadeUp(delay);
  return (
    <div style={{ ...a, marginBottom: 18 * S }}>
      <div
        style={{
          display: "flex",
          gap: 16 * S,
          alignItems: "flex-start",
          background: `${color}12`,
          border: `1px solid ${color}`,
          borderRadius: 16 * S,
          padding: `${16 * S}px ${22 * S}px`,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 24 * S,
            color,
            fontWeight: 700,
            flexShrink: 0,
            marginTop: 2 * S,
            textShadow: `0 0 ${10 * S}px ${color}88`,
          }}
        >
          {number}
        </div>
        <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, lineHeight: 1.6 }}>{text}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── TitleScene ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
function TitleScene() {
  const dur = SCENES_2026_05_20.title.to - SCENES_2026_05_20.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(34);
  const tagStyle = useFadeUp(50);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: SUBTITLE_SAFE,
          paddingLeft: 80 * S,
          paddingRight: 80 * S,
          textAlign: "center",
        }}
      >
        <div style={{ ...badgeOp, marginBottom: 16 * S }}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 20 * S,
              color: C.primary,
              letterSpacing: "0.12em",
              background: C.primaryLight,
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 8 * S,
              padding: `${6 * S}px ${16 * S}px`,
            }}
          >
            每日 AI 知識庫
          </span>
        </div>

        <h1 style={{ margin: 0, lineHeight: 1.14, fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900, fontSize: 46 * S, color: C.text }}>
          <WordReveal
            text="Function Calling 是什麼？"
            startFrame={10}
            staggerPerWord={6}
            fontSize={46 * S}
            color={C.text}
            fontFamily="'Noto Sans TC', sans-serif"
            fontWeight={900}
          />
        </h1>

        <h1 style={{ margin: 0, marginTop: 6 * S, lineHeight: 1.2, fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900, fontSize: 34 * S, color: C.primary }}>
          <WordReveal
            text="讓 AI 真的能「做事」"
            startFrame={30}
            staggerPerWord={6}
            fontSize={34 * S}
            color={C.primary}
            fontFamily="'Noto Sans TC', sans-serif"
            fontWeight={900}
          />
        </h1>

        <p style={{ ...subtitleStyle, marginTop: 22 * S, fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S, color: C.muted, lineHeight: 1.6 }}>
          語言模型只會說話——它是怎麼學會幫你查天氣、訂機票的？
        </p>

        <div style={{ ...tagStyle, marginTop: 18 * S }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, letterSpacing: "0.1em" }}>
            Function Calling · 工具 · AI Agent · 權限
          </span>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <TalkOnlyAnimation triggerFrame={317} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── Scene1 — Function Calling 怎麼運作 ─────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_20.scene1.to - SCENES_2026_05_20.scene1.from;
  // local = global - 876
  // Phase A: mechanism. Phase B: weather example + commander.
  // Phase B first sentence "具體的例子" 56.320s = frame 1690 → local 814
  const A_FADE_START = 734; // 814 - 80
  const A_REMOVE = 814;
  const B_SHOW_AT = 814;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A anchors (local)
  const STEP1_AT = 218; // 36.480s 識別
  const STEP2_AT = 403; // 42.640s 輸出指令
  const STEP3_AT = 578; // 48.480s 外部執行回傳

  // Phase B anchors (local)
  const WHEADER_AT = 814; // 56.320s 具體的例子
  const WROW1_AT = 864; // 58.000s 你問
  const WROW2_AT = 957; // 61.120s AI判斷
  const WROW3_AT = 1135; // 67.040s 函數呼叫
  const WROW4_AT = 1382; // 75.280s AI回答
  const COMMANDER_HL_AT = 1658; // 84.480s 指揮官
  const TAGS_AT = 1994; // 95.680s 搜尋、計算、查資料

  return (
    <SceneFade durationInFrames={dur}>
      {/* Phase B accumulates ~1630px once tags appear → scroll up to keep tags above the clip */}
      <ContentColumn scrollUp={{ at: TAGS_AT - 30, amount: 250 }}>
        {/* Phase A — mechanism */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <SectionBadge num="怎麼運作" label="AI 怎麼學會「做事」" delay={0} />
            <StepCard delay={STEP1_AT} color={C.primary} label="① 識別需求" text="AI 在對話中判斷：我現在需要一個外部工具來幫忙" />
            <StepCard delay={STEP2_AT} color={C.yellow} label="② 輸出結構化指令" text="告訴外部系統：去用這個工具、帶這些參數、做這件事" />
            <StepCard delay={STEP3_AT} color={C.primary} label="③ 執行並回傳" text="外部系統執行完，把結果交回給 AI，AI 再整合成回答" />
          </div>
        )}

        {/* Phase B — weather example + commander */}
        {showB && (
          <>
            <HighlightCard delay={WHEADER_AT} label="具體例子 · 查天氣" text="「明天台北會下雨嗎？」" color={C.primary} />

            <FadeUpBox
              delay={WHEADER_AT}
              style={{
                background: C.surface,
                border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 16 * S,
                padding: `${20 * S}px ${24 * S}px`,
                marginBottom: 16 * S,
              }}
            >
              <WeatherRow delay={WROW1_AT} role="你問" roleColor={C.muted} text="明天台北會下雨嗎？" />
              <WeatherRow delay={WROW2_AT} role="AI 判斷" roleColor={C.yellow} text="這題我得查天氣，光靠語言答不了" />
              <WeatherRow delay={WROW3_AT} role="函數呼叫" roleColor={C.primary} text={`weather_api(地點="台北", 時間="明天")`} mono />
              <WeatherRow delay={WROW4_AT} role="AI 回答" roleColor={C.primary} text="明天台北有 60% 機率下雨" />
            </FadeUpBox>

            <HighlightCard
              delay={COMMANDER_HL_AT}
              label="關鍵理解"
              text="AI 是「指揮官」，真正查詢的是外部工具"
              color={C.primary}
            />

            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 12 * S }}>
              <TagChip delay={TAGS_AT} text="搜尋" color={C.primary} light={C.primaryLight} border={C.primaryBorder} />
              <TagChip delay={TAGS_AT + 12} text="計算" color={C.primary} light={C.primaryLight} border={C.primaryBorder} />
              <TagChip delay={TAGS_AT + 24} text="查資料" color={C.primary} light={C.primaryLight} border={C.primaryBorder} />
              <TagChip delay={TAGS_AT + 36} text="背後都有 Function Calling" color={C.muted} light="rgba(255,255,255,0.05)" border="rgba(255,255,255,0.12)" />
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <FunctionCallLoopAnimation triggerLocalFrame={STEP1_AT} />
        <CommanderAnimation triggerLocalFrame={COMMANDER_HL_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── Scene2 — 為什麼這個機制那麼重要 ────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_20.scene2.to - SCENES_2026_05_20.scene2.from;
  // local = global - 3084
  // Phase B first sentence "你可以把FC想成AI的工具箱" 137.120s = frame 4113 → local 1029
  const A_FADE_START = 949; // 1029 - 80
  const A_REMOVE = 1029;
  const B_SHOW_AT = 1029;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A anchors (local)
  const HL_TRANSFORM_AT = 60; // 104.800s 升格成行動者
  const COMPARE_AT = 271; // 111.840s 回答者... ; rightReveal at 504 有了FC之後
  const COMPARE_RIGHT_REVEAL = 504;
  const TOOLS_HEADER_AT = 679; // 125.440s 搜尋引擎資料庫...

  // Phase B anchors (local)
  const TOOLBOX_HL_AT = 1029; // 137.120s 工具箱
  const HAVE_COMPARE_AT = 1137; // 140.720s 給工具能做事
  const HAVE_RIGHT_REVEAL = 1240; // 144.160s 沒給工具只能說話
  const DIFF_HL_AT = 1538; // 154.080s 差別在工具

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Phase A — 回答者 → 行動者 + 工具無上限 */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <SectionBadge num="為什麼重要" label="從「回答者」升格成「行動者」" delay={0} />

            <ContrastTwoCol
              delay={COMPARE_AT}
              leftIcon="💬"
              leftLabel="以前：回答者"
              leftLabelColor={C.red}
              leftText="你問，它答，但沒辦法真正採取行動"
              leftBg={C.redLight}
              leftBorder={C.redBorder}
              rightIcon="🦾"
              rightLabel="現在：行動者"
              rightLabelColor={C.primary}
              rightText="能呼叫工具，幾乎沒有上限"
              rightBg={C.primaryLight}
              rightBorder={C.primaryBorder}
              rightReveal={COMPARE_RIGHT_REVEAL}
            />

            <FadeUpBox
              delay={TOOLS_HEADER_AT}
              style={{
                background: C.surface,
                border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 16 * S,
                padding: `${18 * S}px ${22 * S}px`,
              }}
            >
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, letterSpacing: "0.06em", marginBottom: 14 * S }}>
                任何能寫成 API 的工具都能接
              </div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 12 * S }}>
                {["搜尋引擎", "資料庫", "日曆", "電子郵件", "CRM 系統", "程式執行環境"].map((t, i) => (
                  <TagChip key={i} delay={TOOLS_HEADER_AT + 14 + i * 14} text={t} color={C.primary} light={C.primaryLight} border={C.primaryBorder} />
                ))}
              </div>
            </FadeUpBox>
          </div>
        )}

        {/* Phase B — 工具箱 + 有/沒工具 + 差別在工具 */}
        {showB && (
          <>
            <HighlightCard delay={TOOLBOX_HL_AT} label="一個比喻" text="Function Calling = AI 的工具箱" color={C.primary} />

            <ContrastTwoCol
              delay={HAVE_COMPARE_AT}
              leftIcon="🧰"
              leftLabel="給它工具"
              leftLabelColor={C.primary}
              leftText="它就能做那些事"
              leftBg={C.primaryLight}
              leftBorder={C.primaryBorder}
              rightIcon="🔇"
              rightLabel="沒給工具"
              rightLabelColor={C.muted}
              rightText="它就只能靠語言能力說話"
              rightBg="rgba(255,255,255,0.04)"
              rightBorder="rgba(255,255,255,0.12)"
              rightReveal={HAVE_RIGHT_REVEAL}
            />

            <HighlightCard
              delay={DIFF_HL_AT}
              label="重點"
              text="差別不在模型多聰明，而在它連接了哪些工具"
              color={C.yellow}
            />
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <AnswererToActorAnimation triggerLocalFrame={HL_TRANSFORM_AT} />
        <ToolboxAnimation triggerLocalFrame={TOOLBOX_HL_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── Scene3 — 一般使用者視角 + 注意事項 ─────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_20.scene3.to - SCENES_2026_05_20.scene3.from;
  // local = global - 4786
  // Phase B first sentence "第二,FC執行的動作是真實的" 194.720s = frame 5721 → local 935
  const A_FADE_START = 855; // 935 - 80
  const A_REMOVE = 935;
  const B_SHOW_AT = 935;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A anchors (local)
  const INTRO_AT = 60; // 161.520s 幕後運作
  const EXAMPLES_AT = 180; // 165.520s 你每次讓Claude...
  const CAUTION1_AT = 551; // 177.920s 第一,工具邊界
  const CAUTION1_SUB_AT = 815; // 186.720s 沒連日曆

  // Phase B anchors (local)
  const CAUTION2_AT = 935; // 190.720s 第二,執行的動作是真實的
  const CAUTION2_SUB1_AT = 1055; // 194.720s 發郵件、改文件、呼叫 API
  const CAUTION2_SUB2_AT = 1310; // 203.200s 後果也是真實的
  const CAUTION3_AT = 1466; // 208.400s 當你授權 AI 去做事
  const CAUTION3_CHECK_AT = 1646; // 214.400s 給最小必要的工具權限

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Phase A — 幕後運作 + caution ① 工具邊界 */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <SectionBadge num="使用者視角" label="它一直在幕後幫你做事" delay={0} />

            <HighlightCard delay={INTRO_AT} label="一般使用者" text="Function Calling 通常在幕後運作，你不用自己設定" color={C.primary} />

            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 12 * S, marginBottom: 16 * S }}>
              {["Claude 搜尋網路", "ChatGPT 執行程式", "AI 查行事曆"].map((t, i) => (
                <TagChip key={i} delay={EXAMPLES_AT + i * 16} text={t} color={C.primary} light={C.primaryLight} border={C.primaryBorder} />
              ))}
            </div>

            <FadeUpBox
              delay={CAUTION1_AT}
              style={{
                background: C.surface,
                border: `1px solid ${C.surfaceBorder}`,
                borderLeft: `${4 * S}px solid ${C.text}`,
                borderRadius: `0 ${14 * S}px ${14 * S}px 0`,
                padding: `${16 * S}px ${22 * S}px`,
              }}
            >
              <CautionLine label="① 工具邊界 = 能力邊界" text="AI 沒連接到的工具，它就真的做不了那件事" labelColor={C.text} />
              <CautionSubItem delay={CAUTION1_SUB_AT} text="沒連結你的 Google 日曆，它就不知道你的行程" />
            </FadeUpBox>
          </div>
        )}

        {/* Phase B — caution ② 真實動作 + caution ③ 最小權限 */}
        {showB && (
          <>
            <FadeUpBox
              delay={CAUTION2_AT}
              style={{
                background: C.redLight,
                border: `1.5px solid ${C.redBorder}`,
                borderRadius: 16 * S,
                padding: `${18 * S}px ${22 * S}px`,
                marginBottom: 18 * S,
                boxShadow: `0 0 ${24 * S}px rgba(255,107,107,0.1)`,
              }}
            >
              <CautionLine label="② 執行的動作是真實的" text="AI 發郵件、改文件、呼叫 API——都真實發生，不是模擬" labelColor={C.red} />
              <CautionSubItem delay={CAUTION2_SUB1_AT} text="它真的會把信寄出去、把文件改掉" />
              <CautionSubItem delay={CAUTION2_SUB2_AT} text="AI 判斷錯誤帶來的後果，也是真實的" />
            </FadeUpBox>

            <FadeUpBox
              delay={CAUTION3_AT}
              style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 16 * S,
                padding: `${18 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(255,209,102,0.12)`,
              }}
            >
              <CautionLine label="③ 給「最小必要」的權限" text="授權前先清楚：它能呼叫哪些工具、權限有多大" labelColor={C.yellow} />
              <ChecklistItem delay={CAUTION3_CHECK_AT} text="只開啟任務真正需要的工具" color={C.yellow} />
              <ChecklistItem delay={CAUTION3_CHECK_AT + 14} text="這是使用 AI Agent 的基本原則" color={C.yellow} />
            </FadeUpBox>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ToolBoundaryAnimation triggerLocalFrame={CAUTION1_AT} />
        <RealActionAnimation triggerLocalFrame={CAUTION2_AT} />
        <MinPermissionAnimation triggerLocalFrame={1526} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// Caution headline line (label + main text) — static; entrance handled by parent FadeUpBox
function CautionLine({ label, text, labelColor }: { label: string; text: string; labelColor: string }) {
  return (
    <div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22 * S, color: labelColor, fontWeight: 700, letterSpacing: "0.03em", marginBottom: 10 * S }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S, color: C.text, fontWeight: 700, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── SummaryScene ───────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
function SummaryScene() {
  const dur = SCENES_2026_05_20.summary.to - SCENES_2026_05_20.summary.from;
  // local = global - 7039
  const BADGE_AT = 0;
  const CARD1_AT = 168; // 240.240s 第一
  const CARD2_AT = 480; // 250.640s 第二
  const CARD3_AT = 775; // 260.480s 第三
  const OUTRO_AT = 984; // 267.440s 這裡是每日AI知識庫
  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        <div style={{ ...badgeStyle, marginBottom: 20 * S, marginTop: 24 * S }}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 20 * S,
              color: C.primary,
              letterSpacing: "0.12em",
              background: C.primaryLight,
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 8 * S,
              padding: `${6 * S}px ${16 * S}px`,
            }}
          >
            <WordReveal text="重點整理" startFrame={4} staggerPerWord={5} fontSize={20 * S} color={C.primary} fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
          </span>
        </div>

        <SummaryCard
          number="01"
          delay={CARD1_AT}
          text="Function Calling 讓 AI 識別需求、輸出指令、整合結果——這是 AI Agent 完成複雜任務的技術基礎"
          color={C.primary}
        />
        <SummaryCard
          number="02"
          delay={CARD2_AT}
          text="AI 能做什麼，很大程度取決於它被賦予了哪些工具，而不只是模型本身有多聰明"
          color={C.primary}
        />
        <SummaryCard
          number="03"
          delay={CARD3_AT}
          text="AI 執行的動作是真實的，授權時應謹慎，盡量給最小必要的工具權限"
          color={C.yellow}
        />

        <div style={{ ...outroStyle, marginTop: 12 * S }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20 * S, color: C.muted, letterSpacing: "0.08em", textAlign: "center" as const }}>
            每日 AI 知識庫
          </div>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// ── Main Composition ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
export function VideoComposition_2026_05_20() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_20.scene1;
  const S2 = SCENES_2026_05_20.scene2;
  const S3 = SCENES_2026_05_20.scene3;
  const SU = SCENES_2026_05_20.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Main narration */}
      <Audio src={staticFile("audio/2026-05-20-processed.wav")} volume={1.0} />

      {/* Background music (0.10 vol, fade in/out) */}
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_05_20 - 150, TOTAL_FRAMES_2026_05_20], [v, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return Math.min(fi, fo);
        }}
        loop
      />

      <Background />

      {/* TitleScene */}
      <Sequence from={0} durationInFrames={S1.from}>
        <TitleScene />
      </Sequence>

      {/* Scene 1 — Function Calling 怎麼運作 */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — 為什麼重要 */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — 使用者視角 + 注意事項 */}
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
