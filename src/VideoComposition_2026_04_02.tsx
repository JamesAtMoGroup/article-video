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

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// TitleScene:   0s–22s     → 0–660
// Scene1:       22s–123s   → 660–3690
// Scene2:       123s–222s  → 3690–6660
// Scene3:       222s–311s  → 6660–9330
// SummaryScene: 311s–347s  → 9330–10416
export const SCENES_2026_04_02 = {
  title:   { from: 0,    to: 660   },
  scene1:  { from: 660,  to: 3690  },
  scene2:  { from: 3690, to: 6660  },
  scene3:  { from: 6660, to: 9330  },
  summary: { from: 9330, to: 10416 },
} as const;
export const TOTAL_FRAMES_2026_04_02 = 10416;

const CHAPTERS = [
  { label: "今日焦點",        start: 0    },
  { label: "MCP 是什麼",      start: 660  },
  { label: "為什麼受關注",    start: 3690 },
  { label: "使用者視角",      start: 6660 },
  { label: "重點整理",        start: 9330 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 3390, to: 3690, sender: "想一想", text: "你的 AI 工具，有什麼懂但做不到的事？那可能就是還沒連上對的 MCP" },
  { from: 6420, to: 6660, sender: "開發者思考", text: "有了 MCP，你最想讓 AI 連接哪些工具？" },
  { from: 9060, to: 9330, sender: "親身經歷", text: "如果 MCP 可以讀取你所有 Gmail，你願意開啟嗎？你的標準是什麼？" },
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
      <div style={{
        display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 6 * S,
      }}>
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

// 1. IsolatedBrainAnimation — TitleScene triggerFrame=150, DURATION=400
function IsolatedBrainAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 400;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const pulse = Math.sin(f * 0.06) * 0.12 + 0.88;
  const brainScale = easeOutBack(prog(f, 20));

  // blocked arrow icons positions: top, right, bottom, left
  const arrowPositions = [
    { top: 0, left: "50%", transform: "translateX(-50%) translateY(-100%)", label: "📁 Drive" },
    { top: "50%", right: 0, transform: "translateX(100%) translateY(-50%)", label: "📅 Cal" },
    { bottom: 0, left: "50%", transform: "translateX(-50%) translateY(100%)", label: "🗒 Notion" },
    { top: "50%", left: 0, transform: "translateX(-100%) translateY(-50%)", label: "💬 Slack" },
  ];

  return (
    <div style={{
      position: "absolute", top: 200 * S, right: 80 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
    }}>
      <div style={{ position: "relative", width: 200 * S, height: 200 * S }}>
        {/* Brain circle */}
        <div style={{
          width: 100 * S, height: 100 * S,
          borderRadius: "50%",
          background: "rgba(124,255,178,0.12)",
          border: `${3 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%,-50%) scale(${pulse * brainScale})`,
          boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.4)`,
          fontSize: 36 * S,
        }}>
          🧠
        </div>

        {/* Blocked arrows with service names */}
        {arrowPositions.map((pos, i) => {
          const delayF = i * 10;
          const itemF = Math.max(0, f - delayF);
          const itemOp = interpolate(itemF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const flashPulse = Math.sin((f - delayF) * 0.2) * 0.3 + 0.7;
          return (
            <div key={i} style={{
              position: "absolute", ...pos,
              opacity: itemOp * flashPulse,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3 * S,
              padding: `${6 * S}px ${8 * S}px`,
              background: "rgba(255,107,107,0.1)",
              border: `1px solid rgba(255,107,107,0.3)`,
              borderRadius: 8 * S,
            }}>
              <span style={{ fontSize: 18 * S, color: C.red }}>✕</span>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 13 * S, color: C.muted, whiteSpace: "nowrap" as const,
              }}>{pos.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 2. BrainHandsAnimation — Scene1 local=630, DURATION=240
function BrainHandsAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 240;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const brainScale = easeOutBack(prog(f, 20));
  const leftArmW = interpolate(Math.max(0, f - 20), [0, 30], [0, 60 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const rightArmW = interpolate(Math.max(0, f - 30), [0, 30], [0, 60 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const labelOp = interpolate(Math.max(0, f - 60), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 160 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
    }}>
      {/* Brain + arms */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {/* Left arm */}
        <div style={{
          width: leftArmW, height: 10 * S,
          background: `linear-gradient(to left, ${C.primary}, transparent)`,
          borderRadius: 5 * S,
          transformOrigin: "right",
        }} />
        <div style={{ fontSize: 14 * S, marginRight: 4 * S }}>🤚</div>

        {/* Brain */}
        <div style={{
          width: 70 * S, height: 70 * S, borderRadius: "50%",
          background: "rgba(124,255,178,0.12)",
          border: `${2 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28 * S,
          transform: `scale(${brainScale})`,
          boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.4)`,
        }}>🧠</div>

        {/* Right arm */}
        <div style={{ fontSize: 14 * S, marginLeft: 4 * S }}>🤚</div>
        <div style={{
          width: rightArmW, height: 10 * S,
          background: `linear-gradient(to right, ${C.primary}, transparent)`,
          borderRadius: 5 * S,
          transformOrigin: "left",
        }} />
      </div>

      {/* Label */}
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
        color: C.primary, letterSpacing: "0.08em",
        textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.6)`,
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 6 * S, padding: `${5 * S}px ${12 * S}px`,
      }}>有了 MCP</div>
    </div>
  );
}

// 3. MCPToolsListAnimation — Scene1 local=1620, DURATION=280
function MCPToolsListAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 220; // ends at local ~1960, before USBUnifyAnimation starts at 1980
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const items = [
    { icon: "📁", label: "讀本地資料夾" },
    { icon: "🔍", label: "搜尋 Notion" },
    { icon: "🌐", label: "操作瀏覽器" },
    { icon: "🗄️", label: "查資料庫" },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 150 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 10 * S,
    }}>
      {items.map((item, i) => {
        const stagger = i * 40;
        const itemF = Math.max(0, f - stagger);
        const itemOp = interpolate(itemF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 20], [30 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const dotScale = easeOutBack(Math.min(itemF / 20, 1));
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateX(${itemTx}px)`,
            display: "flex", alignItems: "center", gap: 10 * S,
            background: "rgba(0,0,0,0.8)",
            border: `1px solid rgba(124,255,178,0.15)`,
            borderRadius: 10 * S,
            padding: `${8 * S}px ${14 * S}px`,
          }}>
            {/* Green dot */}
            <div style={{
              width: 8 * S, height: 8 * S, borderRadius: "50%",
              background: C.primary,
              boxShadow: `0 0 ${6 * S}px ${C.primary}`,
              transform: `scale(${dotScale})`,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 18 * S }}>{item.icon}</span>
            <span style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 16 * S, color: C.text,
            }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// 4. USBUnifyAnimation — Scene1 local=1950, DURATION=300
function USBUnifyAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 300;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const arrowW = interpolate(Math.max(0, f - 40), [0, 30], [0, 50 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const mcpScale = easeOutBack(Math.min(Math.max(0, f - 70) / 20, 1));
  const labelOp = interpolate(Math.max(0, f - 100), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const connectors = ["PS/2", "VGA", "DVI", "HDMI"];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 240 * S,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
        {/* Old connectors */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 5 * S,
          fontFamily: "'Space Mono', monospace", fontSize: 14 * S, color: C.muted,
        }}>
          {connectors.map((c, i) => {
            const cOp = interpolate(Math.max(0, f - i * 8), [0, 16], [0, 0.6], { easing: E.outCubic, extrapolateRight: "clamp" });
            return (
              <span key={i} style={{ opacity: cOp }}>{c}</span>
            );
          })}
        </div>

        {/* Arrow */}
        <div style={{
          width: arrowW, height: 3 * S,
          background: `linear-gradient(to right, transparent, ${C.primary})`,
          borderRadius: 2 * S,
          boxShadow: `0 0 ${8 * S}px ${C.primary}66`,
          position: "relative",
        }}>
          <div style={{
            position: "absolute", right: 0, top: "50%",
            transform: "translateY(-50%)",
            fontSize: 14 * S, color: C.primary,
          }}>▶</div>
        </div>

        {/* MCP box */}
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary, fontWeight: "700", letterSpacing: "0.05em",
          background: C.primaryLight, border: `2px solid ${C.primary}`,
          borderRadius: 10 * S, padding: `${8 * S}px ${14 * S}px`,
          transform: `scale(${mcpScale})`,
          boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.35)`,
          textShadow: `0 0 ${12 * S}px rgba(124,255,178,0.7)`,
        }}>MCP</div>
      </div>

      {/* Bottom label */}
      <div style={{
        opacity: labelOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
        color: C.muted, textAlign: "center" as const, letterSpacing: "0.04em",
      }}>一個標準，連接所有工具</div>
    </div>
  );
}

// 5. CompanyAdoptionAnimation — Scene2 local=660, DURATION=280
function CompanyAdoptionAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 280;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const companies = ["Anthropic", "OpenAI", "Google", "Microsoft"];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 170 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 10 * S,
      alignItems: "flex-end",
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
        color: C.muted, letterSpacing: "0.08em", marginBottom: 4 * S,
      }}>採用順序</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 * S }}>
        {companies.map((co, i) => {
          const stagger = i * 40;
          const itemF = Math.max(0, f - stagger);
          const itemOp = interpolate(itemF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemTy = interpolate(itemF, [0, 20], [20 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <React.Fragment key={i}>
              <div style={{
                opacity: itemOp,
                transform: `translateY(${itemTy}px)`,
                fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
                color: i === 0 ? C.primary : C.text,
                background: i === 0 ? C.primaryLight : "rgba(255,255,255,0.06)",
                border: `1px solid ${i === 0 ? C.primaryBorder : "rgba(255,255,255,0.12)"}`,
                borderRadius: 8 * S, padding: `${7 * S}px ${10 * S}px`,
                textAlign: "center" as const,
                minWidth: 80 * S,
                boxShadow: i === 0 ? `0 0 ${12 * S}px rgba(124,255,178,0.2)` : "none",
              }}>{co}</div>
              {i < companies.length - 1 && (
                <div style={{
                  opacity: interpolate(Math.max(0, f - stagger - 20), [0, 15], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
                  color: C.muted, fontSize: 16 * S,
                }}>→</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// 6. ThreeReasonsAnimation — Scene2 local=810, DURATION=420
function ThreeReasonsAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  // Each item appears exactly when speaker mentions it (VTT-synced):
  // 第一 at 151s = local 840 → f=90  | 第二 at 171s = local 1440 → f=690 | 第三 at 192s = local 2070 → f=1320
  const DURATION = 1700;
  const envelope = interpolate(f, [0, 10, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const reasons = [
    { icon: "🔓", label: "第一：開放標準",     desc: "任何人都能做",  color: C.primary, appearsAt:   90 },
    { icon: "🎯", label: "第二：解決真實痛點", desc: "統一整合規則",  color: C.yellow,  appearsAt:  690 },
    { icon: "🤖", label: "第三：AI Agent 可用", desc: "補上基礎建設", color: C.primary, appearsAt: 1320 },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 160 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 12 * S,
      width: 220 * S,
    }}>
      {reasons.map((r, i) => {
        const itemF = Math.max(0, f - r.appearsAt);
        const itemOp = interpolate(itemF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 20], [25 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateX(${itemTx}px)`,
            background: "rgba(0,0,0,0.82)",
            border: `1px solid ${r.color}44`,
            borderLeft: `3px solid ${r.color}`,
            borderRadius: 10 * S,
            padding: `${10 * S}px ${14 * S}px`,
            display: "flex", alignItems: "center", gap: 10 * S,
          }}>
            <span style={{ fontSize: 20 * S, flexShrink: 0 }}>{r.icon}</span>
            <div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 18 * S, color: r.color, fontWeight: "700",
                lineHeight: 1.2,
              }}>{r.label}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 13 * S, color: C.muted, marginTop: 3 * S,
              }}>{r.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 7. EcosystemBurstAnimation — Scene2 local=1320, DURATION=110
// Positioned LEFT side to avoid overlapping ThreeReasonsAnimation (right side)
function EcosystemBurstAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 110;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Animated counter: 0 → 300
  const count = Math.round(interpolate(f, [0, 120], [0, 300], { easing: E.outExpo, extrapolateRight: "clamp" }));
  const counterScale = easeOutBack(Math.min(f / 25, 1));

  // Radiating dots
  const dotPositions = [
    { angle: 0 },
    { angle: 60 },
    { angle: 120 },
    { angle: 180 },
    { angle: 240 },
    { angle: 300 },
  ];

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
    }}>
      {/* Counter + dots container */}
      <div style={{ position: "relative", width: 160 * S, height: 160 * S }}>
        {/* Radiating dots */}
        {dotPositions.map((dot, i) => {
          const dotF = Math.max(0, f - i * 15);
          const radius = interpolate(dotF, [0, 60], [0, 60 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
          const dotOp = interpolate(dotF, [0, 15, 60, 90], [0, 0.8, 0.6, 0.3], { extrapolateRight: "clamp" });
          const rad = (dot.angle * Math.PI) / 180;
          const cx = 80 * S + Math.cos(rad) * radius;
          const cy = 80 * S + Math.sin(rad) * radius;
          return (
            <div key={i} style={{
              position: "absolute",
              left: cx - 5 * S,
              top: cy - 5 * S,
              width: 10 * S, height: 10 * S,
              borderRadius: "50%",
              background: C.primary,
              opacity: dotOp,
              boxShadow: `0 0 ${6 * S}px ${C.primary}`,
            }} />
          );
        })}

        {/* Counter */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%, -50%) scale(${counterScale})`,
          textAlign: "center" as const,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 36 * S,
            color: C.primary, fontWeight: "700",
            textShadow: `0 0 ${20 * S}px rgba(124,255,178,0.7)`,
            lineHeight: 1,
          }}>{count}+</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S,
            color: C.muted, marginTop: 6 * S,
          }}>MCP 工具</div>
        </div>
      </div>
    </div>
  );
}

// 8. AgentFlowAnimation — Scene2 local=1740, DURATION=300
function AgentFlowAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 300;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const agentScale = easeOutBack(Math.min(f / 20, 1));
  const lineH = interpolate(Math.max(0, f - 20), [0, 25], [0, 30 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const mcpOp = interpolate(Math.max(0, f - 35), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const tools = [
    { icon: "📁", label: "Notion" },
    { icon: "📅", label: "Calendar" },
    { icon: "📧", label: "Gmail" },
    { icon: "💬", label: "Slack" },
  ];

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 150 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
    }}>
      {/* AI Agent box */}
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 15 * S,
        color: C.primary, border: `2px solid ${C.primaryBorder}`,
        borderRadius: 10 * S, padding: `${8 * S}px ${16 * S}px`,
        background: C.primaryLight,
        boxShadow: `0 0 ${16 * S}px rgba(124,255,178,0.25)`,
        transform: `scale(${agentScale})`,
      }}>AI Agent</div>

      {/* Vertical line */}
      <div style={{
        width: 2 * S, height: lineH,
        background: `linear-gradient(to bottom, ${C.primary}, rgba(124,255,178,0.3))`,
      }} />

      {/* MCP bridge */}
      <div style={{
        opacity: mcpOp,
        fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
        color: C.muted, letterSpacing: "0.06em",
        background: "rgba(255,255,255,0.05)",
        border: `1px solid rgba(255,255,255,0.1)`,
        borderRadius: 6 * S, padding: `${5 * S}px ${10 * S}px`,
        marginBottom: 8 * S,
      }}>↕ MCP ↕</div>

      {/* Tools grid */}
      <div style={{ display: "flex", gap: 8 * S, flexWrap: "wrap" as const, justifyContent: "center", maxWidth: 200 * S }}>
        {tools.map((tool, i) => {
          const stagger = i * 18;
          const toolF = Math.max(0, f - 60 - stagger);
          const toolOp = interpolate(toolF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const toolScale = easeOutBack(Math.min(toolF / 18, 1));
          return (
            <div key={i} style={{
              opacity: toolOp,
              transform: `scale(${toolScale})`,
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 12 * S,
              color: C.text, background: "rgba(255,255,255,0.08)",
              border: `1px solid rgba(255,255,255,0.12)`,
              borderRadius: 8 * S, padding: `${5 * S}px ${8 * S}px`,
              display: "flex", alignItems: "center", gap: 5 * S,
            }}>
              <span style={{ fontSize: 14 * S }}>{tool.icon}</span>
              {tool.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 9. CapabilitiesRevealAnimation — Scene3 local=780, DURATION=360
function CapabilitiesRevealAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 360;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const cards = [
    { icon: "📁", label: "本機檔案" },
    { icon: "🔍", label: "Notion & Drive" },
    { icon: "📅", label: "查行事曆" },
    { icon: "📅", label: "建立活動" },
    { icon: "💬", label: "Slack & Gmail" },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 150 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 10 * S,
      width: 200 * S,
    }}>
      {cards.map((card, i) => {
        const stagger = i * 50;
        const cardF = Math.max(0, f - stagger);
        const cardOp = interpolate(cardF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const cardTx = interpolate(cardF, [0, 20], [40 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: cardOp,
            transform: `translateX(${cardTx}px)`,
            display: "flex", alignItems: "center", gap: 10 * S,
            background: "rgba(0,0,0,0.8)",
            borderLeft: `3px solid ${C.primary}`,
            borderRadius: 8 * S,
            padding: `${8 * S}px ${12 * S}px`,
            boxShadow: `0 0 ${10 * S}px rgba(124,255,178,0.08)`,
          }}>
            <span style={{ fontSize: 18 * S }}>{card.icon}</span>
            <span style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 15 * S, color: C.text,
            }}>{card.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// 10. EvalChecklistAnimation — Scene3 local=2400, DURATION=300
function EvalChecklistAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 300;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const items = [
    { label: "是否開源？", color: C.text },
    { label: "有沒有明確隱私政策？", color: C.text },
    { label: "背後是哪家公司？", color: C.primary },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 170 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 12 * S,
      width: 230 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
        color: C.muted, letterSpacing: "0.08em", marginBottom: 4 * S,
      }}>選擇前評估</div>
      {items.map((item, i) => {
        const stagger = i * 50;
        const itemF = Math.max(0, f - stagger);
        const itemOp = interpolate(itemF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTy = interpolate(itemF, [0, 20], [15 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        // Checkbox fill animation
        const boxFill = Math.min(itemF / 20, 1);
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateY(${itemTy}px)`,
            display: "flex", alignItems: "center", gap: 10 * S,
          }}>
            {/* Animated checkbox */}
            <div style={{
              width: 18 * S, height: 18 * S, borderRadius: 4 * S,
              border: `2px solid ${item.color}`,
              background: `rgba(${item.color === C.primary ? "124,255,178" : "255,255,255"}, ${boxFill * (item.color === C.primary ? 0.25 : 0.12)})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.3s",
            }}>
              <span style={{ fontSize: 12 * S, opacity: boxFill, color: item.color }}>✓</span>
            </div>
            <span style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 16 * S, color: item.color,
              fontWeight: item.color === C.primary ? "700" : "400",
            }}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_02.title.to - SCENES_2026_04_02.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(30);
  const tagStyle = useFadeUp(46);

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

        {/* H1 line 1 */}
        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 40 * S, color: C.text,
        }}>
          <WordReveal text="什麼是 MCP？" startFrame={10} staggerPerWord={6}
            fontSize={40 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 — neon green accent */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 4 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 30 * S, color: C.primary,
        }}>
          <WordReveal text="為什麼最近大家都在講" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle,
          marginTop: 20 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
        }}>
          Model Context Protocol — 幫 AI 長出手腳的開放標準
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 16 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>MCP · AI Agent · 開放標準 · 隱私</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation: IsolatedBrainAnimation at frame 150 */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <IsolatedBrainAnimation triggerFrame={150} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — MCP 是什麼？ ──────────────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_02.scene1.to - SCENES_2026_04_02.scene1.from;
  // VTT-based frame anchors (local frames = global - 660)
  const DEF_CARD_AT   = 120;   // 26s (global 780, local 120)
  const ISOLATED_AT   = 300;   // keep definition card at 120, isolated problem card at 300
  const BRAIN_HANDS_AT = 780;  // 48s (global 1440, local 780) — BrainHandsAnimation
  const HIGHLIGHT_AT  = 1080;  // 58s (global 1740, local 1080)
  const MCP_TOOLS_AT  = 1740;  // 80s (global 2400, local 1740) — MCPToolsListAnimation

  // Phase A → B boundary
  // 88s = "拿一個更生活化的比喻" → local 1980 — Phase A stays until then
  const A_FADE_START = 1920;
  const A_REMOVE     = 1970;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B: USB analogy + connection list
  // B shows immediately at 1980 (USB card visible from start of Phase B)
  const B_SHOW_AT    = 1980;
  const USB_AT       = 1980;   // USB card shows as soon as Phase B starts (88s = "比喻")
  const CONNECT_AT   = 2310;   // 99s → "MCP 就像是 USB" list
  const showB        = frame >= B_SHOW_AT;

  const defStyle = useFadeUp(DEF_CARD_AT);
  const isoStyle = useFadeUp(ISOLATED_AT);
  const hlStyle  = useFadeIn(HIGHLIGHT_AT);
  const usbStyle = useFadeUp(showB ? USB_AT : 999999);
  const connStyle = useFadeUp(showB ? CONNECT_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Definition card */}
            <div style={{ ...defStyle, marginBottom: 16 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
                marginBottom: 10 * S,
              }}>MODEL CONTEXT PROTOCOL</div>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S,
                padding: `${18 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.06)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 36 * S,
                  color: C.primary, fontWeight: "700", letterSpacing: "0.05em",
                  textShadow: `0 0 ${20 * S}px rgba(124,255,178,0.5)`,
                  marginBottom: 8 * S,
                }}>MCP</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, lineHeight: 1.6,
                }}>模型情境協議 · 幫 AI 長出手腳的標準</div>
              </div>
            </div>

            {/* Isolated AI card */}
            <div style={{ ...isoStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.redLight,
                border: `1px solid ${C.redBorder}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                  color: C.red, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>⚠ AI 的孤立問題</div>
                <div style={{
                  display: "flex", gap: 16 * S, alignItems: "center", flexWrap: "wrap" as const,
                }}>
                  <div style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                    color: C.text, fontWeight: "700",
                    background: "rgba(255,107,107,0.12)", borderRadius: 8 * S,
                    padding: `${8 * S}px ${12 * S}px`,
                  }}>🧠 AI 模型</div>
                  <div style={{ color: C.red, fontSize: 20 * S }}>✕</div>
                  <div style={{
                    display: "flex", flexDirection: "column", gap: 6 * S,
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S, color: C.muted,
                  }}>
                    <span>📁 Google Drive</span>
                    <span>📅 行事曆</span>
                    <span>🗒 Notion</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Highlight: MCP = 手腳 */}
            <div style={{ ...hlStyle }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 12 * S,
                padding: `${14 * S}px ${20 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: "700", lineHeight: 1.4,
                }}>MCP = 幫 AI 長出手腳的標準</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            {/* USB Analogy */}
            <div style={{ ...usbStyle, marginBottom: 18 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
              }}>比喻</div>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S, padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 16 * S, marginBottom: 14 * S,
                }}>
                  <div style={{ textAlign: "center" as const }}>
                    <div style={{
                      fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                      color: C.muted, marginBottom: 6 * S,
                    }}>以前：每台裝置各自接頭</div>
                    <div style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 16 * S,
                      color: C.muted,
                    }}>PS/2 · VGA · DVI · ...</div>
                  </div>
                  <div style={{
                    fontSize: 18 * S, color: C.primary,
                    filter: `drop-shadow(0 0 ${6 * S}px ${C.primary})`,
                  }}>→</div>
                  <div style={{ textAlign: "center" as const }}>
                    <div style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
                      color: C.primary, fontWeight: "700",
                      textShadow: `0 0 ${12 * S}px rgba(124,255,178,0.6)`,
                    }}>USB</div>
                    <div style={{
                      fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                      color: C.muted, marginTop: 4 * S,
                    }}>統一規格</div>
                  </div>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.5,
                  borderTop: `1px solid rgba(255,255,255,0.06)`, paddingTop: 12 * S,
                }}>
                  <span style={{ color: C.primary, fontWeight: "700" }}>MCP</span>
                  {" "}讓所有 AI 工具說同一種語言——一個標準，解決一堆問題
                </div>
              </div>
            </div>

            {/* Connection capabilities */}
            <div style={{ ...connStyle }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>MCP 可連接</div>
                {["📁 本地資料夾", "🔍 Notion / Google Drive", "🌐 操作瀏覽器", "🗄️ 查詢資料庫"].map((item, i) => (
                  <div key={i} style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                    color: C.text, lineHeight: 1.5,
                    padding: `${4 * S}px 0`,
                    borderBottom: i < 3 ? `1px solid rgba(255,255,255,0.04)` : "none",
                  }}>{item}</div>
                ))}
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <BrainHandsAnimation triggerLocalFrame={BRAIN_HANDS_AT} />
        <MCPToolsListAnimation triggerLocalFrame={MCP_TOOLS_AT} />
        <USBUnifyAnimation triggerLocalFrame={USB_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — 為什麼大家都在講？ ───────────────────────────────────────────
// Three-reason diagram with dim→bright activeAt pattern
function ReasonNode({ label, detail, color, border, activeAt, index }: {
  label: string; detail: string; color: string; border: string;
  activeAt: number; index: number;
}) {
  const frame = useCurrentFrame();
  // Entrance animation
  const entF = Math.max(0, frame - (index * 12));
  const entOp = interpolate(entF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const entTy = interpolate(entF, [0, 22], [22 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  // Dim → bright
  const dimF = Math.max(0, frame - activeAt);
  const activeT = interpolate(dimF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const opMult = interpolate(activeT, [0, 1], [0.28, 1], clamp);
  return (
    <div style={{
      opacity: entOp * opMult, transform: `translateY(${entTy}px)`,
      marginBottom: 14 * S, position: "relative",
    }}>
      <div style={{
        background: `${border}18`,
        border: `1.5px solid ${border}`,
        borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
        boxShadow: activeT > 0.5 ? `0 0 ${20 * S}px ${border}22` : "none",
        transition: "box-shadow 0.3s",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
          color, letterSpacing: "0.08em", marginBottom: 8 * S,
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
  const dur = SCENES_2026_04_02.scene2.to - SCENES_2026_04_02.scene2.from;

  const TIMELINE_AT = 0;
  const COMPANY_AT  = 360;  // 135s → local 360
  const COMPANY_ANIM_AT = 390; // 136s → local 390
  const NODES_AT    = 750;
  const NODE1_AT    = 750;
  const ECOSYSTEM_AT = 1320; // 167s → local 1320
  const NODE2_AT    = 1410;
  const NODE3_AT    = 2070; // 192s → local 2070 (AgentFlowAnimation)
  const AGENT_FLOW_AT = 2070;

  const timelineStyle = useFadeUp(TIMELINE_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Timeline header */}
        <div style={{ ...timelineStyle, marginBottom: 18 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
            color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
          }}>為什麼受關注？</div>
          <div style={{
            background: C.surface, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.text, lineHeight: 1.65, marginBottom: 10 * S,
            }}>
              由 <span style={{ color: C.primary, fontWeight: "700" }}>Anthropic</span>（Claude 背後的公司）在
              <span style={{ color: C.primary }}> 2024 年底</span>提出
            </div>
            <div style={{
              display: "flex", gap: 10 * S, flexWrap: "wrap" as const,
            }}>
              {["OpenAI", "Google", "微軟"].map((co, i) => (
                <span key={i} style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                  color: C.primary, background: C.primaryLight,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 4 * S, padding: `${3 * S}px ${8 * S}px`,
                }}>跟進 · {co}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Three reason nodes — all rendered from NODES_AT, dim until activeAt */}
        {frame >= NODES_AT && (
          <>
            <ReasonNode
              label="它是開放的" index={0}
              activeAt={NODE1_AT}
              color={C.primary} border={C.primary}
              detail="無需授權・無需付費。任何人都能做自己的 MCP 伺服器，短時間就冒出幾百個現成工具"
            />
            <ReasonNode
              label="解決真實痛點" index={1}
              activeAt={NODE2_AT}
              color={C.yellow} border={C.yellow}
              detail="以前各平台各自整合外部工具，費時費力。MCP 統一規則——開發者做一次，多個 AI 都能用"
            />
            <ReasonNode
              label="讓 AI Agent 真正可用" index={2}
              activeAt={NODE3_AT}
              color={C.primary} border={C.primary}
              detail="AI Agent 能自主完成多步驟任務。Agent 要跑起來，需要穩定連接各種工具。MCP 補上了這塊基礎建設"
            />
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <CompanyAdoptionAnimation triggerLocalFrame={COMPANY_ANIM_AT} />
        <ThreeReasonsAnimation triggerLocalFrame={NODES_AT} />
        <EcosystemBurstAnimation triggerLocalFrame={ECOSYSTEM_AT} />
        <AgentFlowAnimation triggerLocalFrame={AGENT_FLOW_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 一般使用者視角 ────────────────────────────────────────────────
function CapabilityItem({ text, delay }: { text: string; delay: number }) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, display: "flex", alignItems: "flex-start", gap: 10 * S, marginBottom: 10 * S }}>
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

function ChecklistItem({ text, delay, color }: { text: string; delay: number; color: string }) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, display: "flex", alignItems: "flex-start", gap: 10 * S, marginBottom: 10 * S }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 16 * S,
        color, flexShrink: 0,
      }}>✓</div>
      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text, lineHeight: 1.65,
      }}>{text}</div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_02.scene3.to - SCENES_2026_04_02.scene3.from;
  // scene3 starts at global 6660 (222s)
  // VTT anchors (local = global - 6660):
  // 234s → local 360 (tools support)
  // 249s → local 810 (capabilities list start) — CapabilitiesRevealAnimation
  // 259s → local 1110 (本機資料夾)
  // 262s → local 1200 (Notion/Drive)
  // 265s → local 1290 (行事曆/活動)
  // 271s → local 1470 (Slack/Gmail)
  // 283s → local 1830 (重要提醒)
  // 289s → local 2010 (三個評估標準) — EvalChecklistAnimation

  const HEADER_AT    = 0;
  const TOOLS_AT     = 210;
  const CAP1_AT      = 660;
  const CAP2_AT      = 780;
  const CAP3_AT      = 930;
  const CAP4_AT      = 1050;
  const CAPABILITIES_ANIM_AT = 810;  // CapabilitiesRevealAnimation — 249s = global 7470 → local 810

  // Phase A → B: 258s → local 1110
  const A_FADE_START = 1110;
  const A_REMOVE     = A_FADE_START + 80;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT    = A_REMOVE + 20;
  const WARNING_AT   = 1200;  // 261s → local 1200
  const CHECKLIST_AT = 1500;  // 271s → local 1500
  const EVAL_ANIM_AT = 2010;  // 289s → local 2010 — EvalChecklistAnimation
  const showB        = frame >= B_SHOW_AT;

  const headerStyle      = useFadeUp(HEADER_AT);
  const toolsStyle       = useFadeUp(TOOLS_AT);
  const warnStyle        = useFadeUp(showB ? WARNING_AT : 999999);
  const captionStyle     = useFadeIn(CAP4_AT + 30);
  const checklistLabelStyle = useFadeIn(CHECKLIST_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A: 能力展示 ─────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 16 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
              }}>一般使用者</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "700", lineHeight: 1.3,
              }}>MCP 讓你的 AI 工具能做到這些事</div>
            </div>

            <div style={{ ...toolsStyle, marginBottom: 16 * S }}>
              <div style={{
                display: "flex", gap: 10 * S, flexWrap: "wrap" as const, marginBottom: 14 * S,
              }}>
                {["Claude Desktop", "Cursor", "AI 筆記工具"].map((t, i) => (
                  <span key={i} style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                    color: C.primary, background: C.primaryLight,
                    border: `1px solid ${C.primaryBorder}`,
                    borderRadius: 4 * S, padding: `${3 * S}px ${10 * S}px`,
                  }}>{t}</span>
                ))}
              </div>
            </div>

            <CapabilityItem text="直接讀取本機資料夾的檔案" delay={CAP1_AT} />
            <CapabilityItem text="搜尋你的 Notion 或 Google Drive" delay={CAP2_AT} />
            <CapabilityItem text="查詢今天的行事曆，甚至幫你建立活動" delay={CAP3_AT} />
            <CapabilityItem text="發送 Slack 訊息或 Gmail" delay={CAP4_AT} />

            <div style={{
              ...captionStyle,
              marginTop: 12 * S,
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
              color: C.muted, lineHeight: 1.6,
            }}>
              這些能力，幾個月前還要靠複雜設定才能做到——現在只要開啟對應的 MCP 就行
            </div>

          </div>
        )}

        {/* ── Phase B: 隱私提醒 ─────────────────── */}
        {showB && (
          <>
            {/* Warning card */}
            <div style={{ ...warnStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(255,209,102,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>⚠ 重要提醒</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65, fontWeight: "700",
                }}>MCP 連接外部服務，也代表 AI 有機會讀取你的私人資料</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
                  color: C.muted, lineHeight: 1.6, marginTop: 8 * S,
                }}>授權前，先問：這個工具可信嗎？它會把我的資料傳到哪裡？</div>
              </div>
            </div>

            {/* Checklist */}
            <div style={{ marginBottom: 10 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
                ...checklistLabelStyle,
              }}>選擇 MCP 工具前確認</div>
              <ChecklistItem text="是否開源（可驗證其行為）" delay={CHECKLIST_AT + 10} color={C.primary} />
              <ChecklistItem text="有沒有明確的隱私政策" delay={CHECKLIST_AT + 22} color={C.primary} />
              <ChecklistItem text="背後是哪家公司在維護" delay={CHECKLIST_AT + 34} color={C.primary} />
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <CapabilitiesRevealAnimation triggerLocalFrame={CAPABILITIES_ANIM_AT} />
        <EvalChecklistAnimation triggerLocalFrame={EVAL_ANIM_AT} />
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
  const dur = SCENES_2026_04_02.summary.to - SCENES_2026_04_02.summary.from;

  const BADGE_AT  = 0;
  const CARD1_AT  = 90;
  const CARD2_AT  = 330;
  const CARD3_AT  = 630;
  const OUTRO_AT  = 900;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{ ...badgeStyle, marginBottom: 18 * S, marginTop: 24 * S }}>
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
          text="MCP 是讓 AI 連接外部工具的開放標準——就像 USB 統一了接頭規格，MCP 統一了 AI 與工具的溝通語言"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="02" delay={CARD2_AT}
          text="它之所以受關注：開放無門檻・解決整合痛點・讓 AI Agent 真正有辦法落地運作"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="03" delay={CARD3_AT}
          text="使用 MCP 前，先評估隱私風險：確認工具是否開源、有無隱私政策、維護公司是否可信"
          color={C.yellow} border={C.yellow}
        />

        {/* Outro */}
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
export function VideoComposition_2026_04_02() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_04_02.scene1;
  const S2 = SCENES_2026_04_02.scene2;
  const S3 = SCENES_2026_04_02.scene3;
  const SU = SCENES_2026_04_02.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/ai-knowledge-2026-04-02-processed.wav")} volume={1.0} />

      <Background />

      {/* TitleScene */}
      <Sequence from={0} durationInFrames={S1.from}>
        <TitleScene />
      </Sequence>

      {/* Scene 1 — MCP 是什麼 */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — 為什麼受關注 */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — 使用者視角 */}
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
