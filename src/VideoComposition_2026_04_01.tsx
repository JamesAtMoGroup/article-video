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
const NAV_H = 50 * S;            // 150px
const CONTAINER_W = 640 * S;    // 1920px
const COL_LEFT = (W - CONTAINER_W) / 2; // 960px

// ── Subtitle safe zone (全片強制) ─────────────────────────────────────────
const SUBTITLE_SAFE = 120 * S;  // 360px — 勿改

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:           "#000000",
  surface:      "#0d0d0d",
  surfaceBorder:"rgba(255,255,255,0.08)",
  primary:      "#7cffb2",
  primaryLight: "rgba(124,255,178,0.07)",
  primaryBorder:"rgba(124,255,178,0.14)",
  accent:       "#7cffb2",
  accentLight:  "rgba(124,255,178,0.07)",
  accentBorder: "rgba(124,255,178,0.14)",
  text:         "#ffffff",
  muted:        "#888888",
  yellow:       "#ffd166",
  yellowLight:  "rgba(255,209,102,0.1)",
  yellowBorder: "rgba(255,209,102,0.2)",
  red:          "#ff6b6b",
  redLight:     "rgba(255,107,107,0.08)",
  redBorder:    "rgba(255,107,107,0.2)",
} as const;

// ── iMessage constants ──────────────────────────────────────────────────────
const NOTIF_W         = 290 * S;
const NOTIF_TOP       = 12  * S;
const NOTIF_RIGHT     = 20  * S;
const NOTIF_SLOT      = 148 * S;
const NOTIF_SLIDE_H   = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
export const SCENES_2026_04_01 = {
  title:   { from: 0,    to: 644   },  // 0:00 → 0:21.480
  scene1:  { from: 644,  to: 3226  },  // 0:21.480 → 1:47.520  RAG 是什麼
  scene2:  { from: 3226, to: 4993  },  // 1:47.520 → 2:46.440  為什麼重要
  scene3:  { from: 4993, to: 7135  },  // 2:46.440 → 3:57.840  怎麼用
  summary: { from: 7135, to: 8322  },  // 3:57.840 → end
} as const;
export const TOTAL_FRAMES_2026_04_01 = 8322;

const CHAPTERS = [
  { label: "今日焦點",   start: 0    },
  { label: "RAG 是什麼", start: 644  },
  { label: "為什麼重要", start: 3226 },
  { label: "怎麼用",     start: 4993 },
  { label: "重點整理",   start: 7135 },
] as const;

// ── iMessage callouts (global frames) ────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }

const ALL_CALLOUTS: Callout[] = [
  { from: 3094, to: 3226, sender: "想一想", text: "如果你的工作需要大量查閱文件，RAG 能幫你省下哪些步驟？" },
  { from: 4741, to: 4963, sender: "想一想", text: "你身邊有哪些資訊是外部 AI 不可能知道，但如果 AI 知道了會很有幫助？" },
  { from: 6932, to: 7135, sender: "想一想", text: "你願意把哪些資料餵給 AI？哪些覺得還是不要碰比較好？" },
];

// ── Easing tokens (motion-design skill) ───────────────────────────────────
const E = {
  outExpo:  Easing.bezier(0.19, 1, 0.22, 1),       // --ease-out-expo (aggressive)
  outCubic: Easing.bezier(0.215, 0.61, 0.355, 1),  // --ease-out-cubic (moderate)
  outQuart: Easing.bezier(0.165, 0.84, 0.44, 1),   // --ease-out-quart (strong)
} as const;
// easeOutBack not in motion-design tokens — keep custom math
const easeOutBack = (t: number, s = 1.55) => {
  const c = Math.min(t, 1);
  return 1 + (s + 1) * Math.pow(c - 1, 3) + s * Math.pow(c - 1, 2);
};
const prog = (f: number, dur: number) => Math.min(f / dur, 1);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Slide up + fade in — Expo.easeOut: snaps into position, no trailing bounce
function useFadeUp(startFrame: number) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  const ty = interpolate(f, [0, 22], [22 * S, 0], { easing: E.outExpo,  extrapolateRight: "clamp" });
  const op = interpolate(f, [0, 14], [0, 1],       { easing: E.outCubic, extrapolateRight: "clamp" });
  return { opacity: op, transform: `translateY(${ty}px)` };
}

// Simple opacity fade — Power3.easeOut
function useFadeIn(startFrame: number) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  return { opacity: interpolate(f, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }) };
}

// Word-by-word staggered reveal — Remotion-safe (hook at top level, not inside map)
function WordReveal({ text, startFrame, staggerPerWord = 4, fontSize, color, fontFamily, fontWeight, lineHeight, letterSpacing }: {
  text: string; startFrame: number; staggerPerWord?: number;
  fontSize?: number; color?: string; fontFamily?: string;
  fontWeight?: number | string; lineHeight?: number; letterSpacing?: string;
}) {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <span style={{ display: "inline", lineHeight: lineHeight ?? 1.3 }}>
      {words.map((word, i) => {
        const f = Math.max(0, frame - (startFrame + i * staggerPerWord));
        const ty  = interpolate(f, [0, 20], [18 * S, 0], { easing: E.outExpo,  extrapolateRight: "clamp" });
        const op  = interpolate(f, [0, 12], [0, 1],       { easing: E.outCubic, extrapolateRight: "clamp" });
        return (
          <span key={i} style={{
            display: "inline-block",
            opacity: op,
            transform: `translateY(${ty}px)`,
            marginRight: "0.28em",
            fontSize, color, fontFamily, fontWeight, letterSpacing,
          }}>{word}</span>
        );
      })}
    </span>
  );
}

// Fade in over first 12 frames, fade out over last 12 frames of each scene
function SceneFade({ children, durationInFrames }: {
  children: React.ReactNode; durationInFrames: number;
}) {
  const frame = useCurrentFrame();
  const fadeIn  = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return (
    <div style={{ opacity: Math.min(fadeIn, fadeOut), height: "100%" }}>
      {children}
    </div>
  );
}

// ── Background ─────────────────────────────────────────────────────────────
function Background() {
  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      {/* Ambient gradient orbs — give glassmorphism content to blur */}
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
      {/* Subtle grid overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
        backgroundSize: `${60 * S}px ${60 * S}px`,
        pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );
}

// ── Progress bar (original style) ─────────────────────────────────────────
function ProgressBar({ globalFrame }: { globalFrame: number }) {
  const { durationInFrames } = useVideoConfig();
  const progress = globalFrame / durationInFrames;
  const current = [...CHAPTERS].reverse().find(c => globalFrame >= c.start) ?? CHAPTERS[0];
  const slideIn = interpolate(globalFrame, [0, 15], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: NAV_H,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.primaryBorder}`,
        padding: `${30}px ${96}px`,
        transform: `translateY(${interpolate(slideIn, [0, 1], [-NAV_H, 0])}px)`,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 12 * S, color: C.muted,
          fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em",
        }}>
          <span>每日 AI 知識庫 · 2026-04-01</span>
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

// ── iMessage notification system ───────────────────────────────────────────
function NotificationCard({ c, globalFrame, allCallouts }: {
  c: Callout; globalFrame: number; allCallouts: Callout[];
}) {
  const { fps } = useVideoConfig();
  const localF   = globalFrame - c.from;
  const duration = c.to - c.from;
  const totalVis = duration + FADE_OUT_FRAMES;

  if (localF < 0 || localF >= totalVis) return null;

  let totalYPush = 0;
  for (const newer of allCallouts) {
    if (newer.from <= c.from) continue;
    if (globalFrame < newer.from) continue;
    const pushF = globalFrame - newer.from;
    const pushP = spring({ frame: pushF, fps, config: { damping: 22, stiffness: 120 } });
    totalYPush += NOTIF_SLOT * pushP;
  }

  const entryP = spring({ frame: localF, fps, config: { damping: 22, stiffness: 130 } });
  const slideY  = interpolate(entryP, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);
  const opacity = interpolate(localF, [0, 10, duration, totalVis], [0, 1, 1, 0], clamp);
  const depthAlpha = interpolate(totalYPush / NOTIF_SLOT, [0, 1, 2], [1, 0.65, 0.35], clamp);

  const CHARS_PER_FRAME = 0.85;
  const charsVisible = interpolate(
    Math.max(0, localF - 14), [0, c.text.length / CHARS_PER_FRAME], [0, c.text.length], clamp,
  );
  const displayText = c.text.slice(0, Math.floor(charsVisible));
  const cursor = localF % 20 < 10 && charsVisible < c.text.length ? "|" : "";

  const iconSize = 38 * S;
  return (
    <div style={{
      position: "absolute", top: NAV_H + NOTIF_TOP + totalYPush, right: NOTIF_RIGHT,
      width: NOTIF_W, transform: `translateY(${slideY}px)`,
      opacity: opacity * depthAlpha, pointerEvents: "none", zIndex: 100,
    }}>
      <div style={{
        background: "rgba(28,28,30,0.9)", backdropFilter: "blur(48px)",
        WebkitBackdropFilter: "blur(48px)",
        border: `${1 * S}px solid rgba(255,255,255,0.13)`,
        borderRadius: 14 * S,
        boxShadow: `0 ${8 * S}px ${40 * S}px rgba(0,0,0,0.6)`,
        padding: `${10 * S}px ${14 * S}px`,
        display: "flex", gap: 11 * S, alignItems: "flex-start",
      }}>
        <div style={{
          width: iconSize, height: iconSize, borderRadius: 9 * S,
          background: "linear-gradient(145deg, #3DDC6A 0%, #25A244 100%)",
          boxShadow: `0 ${2 * S}px ${10 * S}px rgba(52,199,89,0.45)`,
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ position: "relative", width: 22 * S, height: 20 * S }}>
            <div style={{
              position: "absolute", top: 0, left: 0,
              width: 22 * S, height: 16 * S, background: "white",
              borderRadius: 5 * S, opacity: 0.95,
            }} />
            <div style={{
              position: "absolute", bottom: 0, left: 4 * S,
              width: 0, height: 0,
              borderLeft: `${5 * S}px solid transparent`,
              borderTop: `${6 * S}px solid white`, opacity: 0.95,
            }} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: 3 * S,
          }}>
            <span style={{
              fontFamily: "-apple-system,'SF Pro Text',system-ui,sans-serif",
              fontSize: 11 * S, fontWeight: 600, color: "rgba(255,255,255,0.45)",
            }}>iMessage</span>
            <span style={{
              fontFamily: "-apple-system,'SF Pro Text',system-ui,sans-serif",
              fontSize: 11 * S, color: "rgba(255,255,255,0.3)",
            }}>now</span>
          </div>
          <div style={{
            fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif",
            fontSize: 16 * S, fontWeight: 700, color: "rgba(255,255,255,0.92)",
            marginBottom: 2 * S, whiteSpace: "nowrap" as const,
            overflow: "hidden", textOverflow: "ellipsis",
          }}>{c.sender}</div>
          <div style={{
            fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif",
            fontSize: 16 * S, color: "rgba(255,255,255,0.60)",
            lineHeight: 1.45, minHeight: 13 * S * 1.45,
          }}>{displayText}{cursor}</div>
        </div>
      </div>
    </div>
  );
}

// ── Shared layout helpers ──────────────────────────────────────────────────
const CONTENT_GAP = 10 * S;  // gap between navbar bottom and content top
const CONTENT_TOP = NAV_H + CONTENT_GAP;        // 150 + 30 = 180px
const CONTENT_H   = H - CONTENT_TOP - SUBTITLE_SAFE; // 2160 - 180 - 360 = 1620px

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
      {/* Fixed-height clip box — overflow:hidden clips ALL 4 edges, including top */}
      <div style={{
        position: "absolute", top: CONTENT_TOP, left: COL_LEFT,
        width: CONTAINER_W, height: CONTENT_H, overflow: "hidden" as const,
      }}>
        <div style={{ transform: `translateY(${scrollY}px)` }}>
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function SectionBadge({ num, label }: { num: string; label: string }) {
  const a = useFadeUp(0);
  return (
    <div style={{ ...a, display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 18 * S }}>
      {/* Feature badge: colored left-border + light bg, Space Mono uppercase */}
      <div style={{
        display: "flex", alignItems: "center",
        borderLeft: `${3 * S}px solid ${C.primary}`,
        paddingLeft: 10 * S,
        background: C.primaryLight,
        borderRadius: `0 ${6 * S}px ${6 * S}px 0`,
        padding: `${4 * S}px ${10 * S}px ${4 * S}px ${10 * S}px`,
        borderLeftWidth: 3 * S, borderLeftStyle: "solid" as const, borderLeftColor: C.primary,
      }}>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 10 * S, fontWeight: 700,
          color: C.primary, letterSpacing: "0.08em",
        }}>SECTION {num}</span>
      </div>
      <h2 style={{ fontSize: 25 * S, fontWeight: 700, color: C.text, margin: 0, letterSpacing: "-0.01em" }}>
        <WordReveal text={label} startFrame={0} staggerPerWord={5}
          fontSize={20 * S} color={C.text} fontFamily="'Noto Sans TC','PingFang TC',sans-serif"
          fontWeight={700} letterSpacing="-0.01em" />
      </h2>
    </div>
  );
}

// ── HighlightPulse ─────────────────────────────────────────────────────────
type PulseColor = "green" | "yellow" | "red";
function HighlightPulse({ delay, text, color = "yellow", sub }: {
  delay: number; text: string; color?: PulseColor; sub?: string;
}) {
  const a = useFadeUp(delay);
  const col = color === "green"
    ? { main: C.primary,  light: C.primaryLight,  border: C.primaryBorder }
    : color === "red"
    ? { main: C.red,      light: C.redLight,       border: C.redBorder }
    : { main: C.yellow,   light: C.yellowLight,    border: C.yellowBorder };
  return (
    <div style={{ ...a, marginBottom: 12 * S }}>
      {/* Product feature callout: glass card + colored 4px left-border accent */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderLeft: `${4 * S}px solid ${col.main}`,
        borderRadius: 14 * S, padding: `${14 * S}px ${18 * S}px`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: `0 ${4*S}px ${24*S}px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}>
        {/* KEY CONCEPT badge */}
        <div style={{
          fontFamily: "'Space Mono',monospace", fontSize: 10 * S, fontWeight: 700,
          color: col.main, letterSpacing: "0.10em", marginBottom: 8 * S,
          opacity: 0.85,
        }}>KEY CONCEPT</div>
        {/* Large gradient text */}
        <div style={{
          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
          fontSize: 25 * S, fontWeight: 700,
          lineHeight: 1.5, letterSpacing: "-0.01em",
          background: `linear-gradient(135deg, ${col.main} 0%, rgba(255,255,255,0.85) 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          <WordReveal text={text} startFrame={delay + 4} staggerPerWord={4}
            fontSize={20 * S} color={col.main}
            fontFamily="'Noto Sans TC','PingFang TC',sans-serif"
            fontWeight={700} letterSpacing="-0.01em" />
        </div>
        {sub && <div style={{
          fontFamily: "'Noto Sans TC',sans-serif",
          fontSize: 18 * S, color: C.muted, marginTop: 10 * S, lineHeight: 1.6,
        }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── TagsRow ────────────────────────────────────────────────────────────────
function TagsRow({ delay, tags, color = "primary" }: {
  delay: number; tags: string[]; color?: "primary" | "yellow" | "red";
}) {
  const frame = useCurrentFrame();
  const col = color === "yellow"
    ? { main: C.yellow, light: C.yellowLight, border: C.yellowBorder }
    : color === "red"
    ? { main: C.red, light: C.redLight, border: C.redBorder }
    : { main: C.primary, light: C.primaryLight, border: C.primaryBorder };

  return (
    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10 * S, marginBottom: 14 * S }}>
      {tags.map((tag, i) => {
        const tagStart = delay + i * 15;
        const f = Math.max(0, frame - tagStart);
        const opacity = interpolate(f, [0, 12], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const scale   = easeOutBack(prog(f, 16));   // Back.easeOut — pop
        return (
          <div key={i} style={{
            opacity, transform: `scale(${scale})`,
            background: col.light, border: `1px solid ${col.border}`,
            borderRadius: 99, padding: `${6 * S}px ${14 * S}px`,
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 16 * S, color: col.main, fontWeight: 700,
          }}>{tag}</div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Purpose-built components for this episode
// ══════════════════════════════════════════════════════════════════════════

// ── AssistantCompare ───────────────────────────────────────────────────────
// Side-by-side: 靠記憶的人 (left, red) vs 翻資料的助理 (right, green)
function AssistantCompare({ delay, rightReveal }: {
  delay: number; rightReveal: number;
}) {
  const frame = useCurrentFrame();
  const a = useFadeUp(delay);
  const rightOpacity = interpolate(
    Math.max(0, frame - rightReveal),
    [0, 30], [0.15, 1], { ...clamp, easing: E.outCubic },
  );
  return (
    <div style={{ ...a, marginBottom: 14 * S }}>
      <div style={{ display: "flex", gap: 12 * S }}>
        {/* Left — 靠記憶的人 */}
        <div style={{
          flex: 1, background: C.redLight, border: `1px solid ${C.redBorder}`,
          borderRadius: 14 * S, padding: `${14 * S}px ${16 * S}px`,
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          boxShadow: `0 ${4*S}px ${20*S}px rgba(0,0,0,0.3)`,
        }}>
          <div style={{
            fontSize: 34 * S, textAlign: "center" as const, marginBottom: 8 * S,
          }}>🧠</div>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
            color: C.red, letterSpacing: "0.06em", marginBottom: 8 * S,
            textAlign: "center" as const,
          }}>一般 AI</div>
          <div style={{
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 17 * S, color: C.text, lineHeight: 1.6,
            textAlign: "center" as const,
          }}>只靠訓練時記住的知識回答，不知道你的私人資料</div>
        </div>
        {/* Right — 翻資料的助理 */}
        <div style={{
          flex: 1, opacity: rightOpacity,
          background: "rgba(255,255,255,0.04)", border: `1px solid ${C.primaryBorder}`,
          borderRadius: 14 * S, padding: `${14 * S}px ${16 * S}px`,
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          boxShadow: `0 ${4*S}px ${20*S}px rgba(0,0,0,0.3)`,
        }}>
          <div style={{
            fontSize: 34 * S, textAlign: "center" as const, marginBottom: 8 * S,
          }}>📚</div>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
            color: C.primary, letterSpacing: "0.06em", marginBottom: 8 * S,
            textAlign: "center" as const,
          }}>RAG 的 AI</div>
          <div style={{
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 17 * S, color: C.text, lineHeight: 1.6,
            textAlign: "center" as const,
          }}>先查你指定的資料，再整理成有條理的回答</div>
        </div>
      </div>
    </div>
  );
}

// Expanding ring that emits when a node activates — runs once for 28 frames
function RippleRing({ activeAt, color }: { activeAt: number; color: string }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - activeAt);
  if (f > 28) return null;
  const scale   = interpolate(f, [0, 24], [0.85, 1.9], { easing: E.outExpo, extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 4, 24, 28], [0, 0.55, 0.2, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", inset: 0,
      border: `${2 * S}px solid ${color}`,
      borderRadius: 12 * S,
      transform: `scale(${scale})`,
      opacity,
      pointerEvents: "none",
    }} />
  );
}

// ── RAGFlowNode — extracted so hooks are always at top level ──────────────
// activeAt: scene-local frame when node brightens (undefined = always bright)
function RAGFlowNode({ label, subLabel, delay, colorType, activeAt }: {
  label: string; subLabel: string; delay: number;
  colorType: "white" | "yellow" | "green"; activeAt?: number;
}) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const entranceP = interpolate(f, [0, 14], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const scale     = easeOutBack(prog(f, 18));

  // Smooth dim→bright transition when node activates
  const dimF    = activeAt !== undefined ? Math.max(0, frame - activeAt) : 1e9;
  const activeT = activeAt !== undefined
    ? interpolate(dimF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" })
    : 1;
  const opacityMult = interpolate(activeT, [0, 1], [0.28, 1], clamp);

  const bg        = colorType === "yellow" ? C.yellowLight
                  : colorType === "green"  ? C.primaryLight : "rgba(255,255,255,0.07)";
  const border    = colorType === "yellow" ? C.yellowBorder
                  : colorType === "green"  ? C.primaryBorder : "rgba(255,255,255,0.12)";
  const textColor = colorType === "yellow" ? C.yellow
                  : colorType === "green"  ? C.primary : C.text;
  const ringColor = colorType === "yellow" ? C.yellow
                  : colorType === "green"  ? C.primary : "rgba(255,255,255,0.5)";

  return (
    <div style={{
      position: "relative",
      opacity: entranceP * opacityMult, transform: `scale(${scale})`,
      background: bg, border: `1px solid ${border}`,
      borderRadius: 12 * S, padding: `${10 * S}px ${14 * S}px`,
      textAlign: "center" as const, flex: 1,
    }}>
      {activeAt !== undefined && <RippleRing activeAt={activeAt} color={ringColor} />}
      <div style={{
        fontFamily: "'Noto Sans TC',sans-serif",
        fontSize: 17 * S, fontWeight: 700, color: textColor,
        marginBottom: 4 * S,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Space Mono',monospace",
        fontSize: 11 * S, color: C.muted, lineHeight: 1.4,
      }}>{subLabel}</div>
    </div>
  );
}

// ── RAGFlowArrow — extracted for hook safety ──────────────────────────────
function RAGFlowArrow({ delay, activeAt }: { delay: number; activeAt?: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const entranceP = interpolate(f, [0, 10], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const scaleX    = interpolate(f, [0, 12], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const dimF    = activeAt !== undefined ? Math.max(0, frame - activeAt) : 1e9;
  const activeT = activeAt !== undefined
    ? interpolate(dimF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" })
    : 1;
  const opacityMult = interpolate(activeT, [0, 1], [0.22, 1], clamp);

  return (
    <div style={{
      opacity: entranceP * opacityMult, transform: `scaleX(${scaleX})`,
      fontFamily: "'Space Mono',monospace",
      fontSize: 22 * S, color: C.muted, flexShrink: 0,
      display: "flex", alignItems: "center",
    }}>→</div>
  );
}

// ── StepExplainCard — step description that fills space below the diagram ──
function StepExplainCard({ delay, color, border, label, text }: {
  delay: number; color: string; border: string; label: string; text: string;
}) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const opacity    = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const translateY = interpolate(f, [0, 22], [14 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  return (
    <div style={{
      opacity, transform: `translateY(${translateY}px)`, marginBottom: 12 * S,
    }}>
      <div style={{
        borderLeft: `3 * S px solid ${color}`,
        borderLeftWidth: 3 * S,
        borderLeftStyle: "solid" as const,
        borderLeftColor: color,
        paddingLeft: 16 * S,
        paddingTop: 4 * S, paddingBottom: 4 * S,
        borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
        background: `${border}22`,
      }}>
        <div style={{
          fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
          color, letterSpacing: "0.06em", marginBottom: 6 * S,
        }}>{label}</div>
        <div style={{
          fontFamily: "'Noto Sans TC',sans-serif",
          fontSize: 18 * S, color: C.text, lineHeight: 1.65,
        }}>{text}</div>
      </div>
    </div>
  );
}

// ── RAGFlowDiagram ─────────────────────────────────────────────────────────
// All 4 nodes shown from Phase B start — inactive nodes are dimmed, brighten as steps activate
function RAGFlowDiagram({ delay, step1ActiveAt, step2ActiveAt }: {
  delay: number; step1ActiveAt: number; step2ActiveAt: number;
}) {
  const frame = useCurrentFrame();
  const a = useFadeIn(delay);

  // Label transitions
  const step1LabelF  = useFadeIn(delay);
  const step2LabelAt = Math.max(0, frame - step2ActiveAt);
  const step2LabelA  = { opacity: interpolate(step2LabelAt, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }) };
  const step1IsActive  = frame >= step1ActiveAt;
  const step2IsActive  = frame >= step2ActiveAt;

  return (
    <div style={{ ...a, marginBottom: 16 * S }}>
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16 * S, padding: `${16 * S}px ${18 * S}px`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: `0 ${4*S}px ${32*S}px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}>
        {/* Step labels */}
        <div style={{ display: "flex", gap: 12 * S, marginBottom: 12 * S }}>
          <div style={{
            ...step1LabelF,
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
            color: step1IsActive ? C.yellow : C.muted, letterSpacing: "0.06em",
            flex: 1,
          }}>
            {step1IsActive ? "① 第一步：檢索" : "RAG 兩步驟概覽"}
          </div>
          {step2IsActive && (
            <div style={{
              ...step2LabelA,
              fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
              color: C.primary, letterSpacing: "0.06em",
            }}>
              ② 第二步：生成
            </div>
          )}
        </div>

        {/* ALL 4 nodes — always visible, dim until activated */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 * S }}>
          <RAGFlowNode label="你的問題" subLabel="user query"
            delay={delay} colorType="white" />
          <RAGFlowArrow delay={delay + 8} activeAt={step1ActiveAt} />
          <RAGFlowNode label="向量資料庫" subLabel="vector DB"
            delay={delay + 16} colorType="yellow" activeAt={step1ActiveAt} />
          <RAGFlowArrow delay={delay + 24} activeAt={step2ActiveAt} />
          <RAGFlowNode label="語言模型" subLabel="LLM"
            delay={delay + 32} colorType="green" activeAt={step2ActiveAt} />
          <RAGFlowArrow delay={delay + 40} activeAt={step2ActiveAt} />
          <RAGFlowNode label="最終回答" subLabel="answer"
            delay={delay + 48} colorType="green" activeAt={step2ActiveAt} />
        </div>
      </div>
    </div>
  );
}


// ── KnowledgeCutoffTimeline ────────────────────────────────────────────────
// Horizontal split: frozen knowledge (left) vs private data gap (right)
function KnowledgeCutoffTimeline({ delay }: { delay: number }) {
  const frame = useCurrentFrame();
  const a = useFadeUp(delay);
  const arrowF = Math.max(0, frame - delay - 60);
  const arrowOpacity = interpolate(arrowF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const arrowScale   = easeOutBack(prog(arrowF, 20));   // Back.easeOut — punch in

  return (
    <div style={{ ...a, marginBottom: 14 * S }}>
      <div style={{
        display: "flex", gap: 12 * S, marginBottom: 12 * S,
      }}>
        {/* Left — frozen knowledge */}
        <div style={{
          flex: 1, background: "rgba(255,255,255,0.04)",
          border: `1px solid rgba(255,255,255,0.10)`,
          borderRadius: 14 * S, padding: `${14 * S}px ${16 * S}px`,
          opacity: 0.6,
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          boxShadow: `0 ${2*S}px ${16*S}px rgba(0,0,0,0.3)`,
        }}>
          <div style={{ fontSize: 24 * S, marginBottom: 6 * S }}>❄️</div>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
            color: C.muted, letterSpacing: "0.06em", marginBottom: 8 * S,
          }}>訓練截止日前</div>
          <div style={{
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 17 * S, color: C.muted, lineHeight: 1.6,
          }}>知識已凍結</div>
        </div>
        {/* Right — private data gap */}
        <div style={{
          flex: 1, background: C.redLight,
          border: `1px solid ${C.redBorder}`,
          borderRadius: 14 * S, padding: `${14 * S}px ${16 * S}px`,
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          boxShadow: `0 ${2*S}px ${16*S}px rgba(255,107,107,0.1)`,
        }}>
          <div style={{ fontSize: 24 * S, marginBottom: 6 * S }}>🔒</div>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
            color: C.red, letterSpacing: "0.06em", marginBottom: 8 * S,
          }}>你的私人資料</div>
          <div style={{
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 17 * S, color: C.text, lineHeight: 1.6,
          }}>AI 完全不知道</div>
        </div>
      </div>

      {/* RAG solution arrow */}
      <div style={{
        opacity: arrowOpacity, transform: `scale(${arrowScale})`,
        background: "rgba(255,255,255,0.04)", border: `1px solid ${C.primaryBorder}`,
        borderRadius: 10 * S, padding: `${10 * S}px ${16 * S}px`,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", gap: 10 * S,
      }}>
        <div style={{
          fontFamily: "'Space Mono',monospace", fontSize: 17 * S,
          color: C.primary, fontWeight: 700,
        }}>RAG 讓 AI 能即時讀取 →</div>
        <div style={{
          fontFamily: "'Noto Sans TC',sans-serif",
          fontSize: 17 * S, color: C.text,
        }}>不需要重新訓練，直接接觸新知識</div>
      </div>
    </div>
  );
}

// ── VectorFlowStep — extracted for hook safety ────────────────────────────
function VectorFlowStep({ emoji, label, subLabel, delay }: {
  emoji: string; label: string; subLabel: string; delay: number;
}) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const opacity    = interpolate(f, [0, 14], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const translateY = interpolate(f, [0, 20], [18 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });

  return (
    <div style={{
      opacity, transform: `translateY(${translateY}px)`,
      flex: 1, background: "rgba(255,255,255,0.04)",
      border: `1px solid rgba(255,255,255,0.10)`,
      borderRadius: 12 * S, padding: `${12 * S}px ${12 * S}px`,
      textAlign: "center" as const,
      backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      boxShadow: `0 ${2*S}px ${12*S}px rgba(0,0,0,0.3)`,
    }}>
      <div style={{ fontSize: 27 * S, marginBottom: 6 * S }}>{emoji}</div>
      <div style={{
        fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
        color: C.primary, fontWeight: 700, marginBottom: 4 * S,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
        color: C.muted, lineHeight: 1.4,
      }}>{subLabel}</div>
    </div>
  );
}

// ── VectorFlowCard ─────────────────────────────────────────────────────────
// 4-step developer flow for vector database
function VectorFlowCard({ delay }: { delay: number }) {
  const a = useFadeIn(delay);

  return (
    <div style={{ ...a, marginBottom: 14 * S }}>
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16 * S, padding: `${16 * S}px ${18 * S}px`,
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        boxShadow: `0 ${4*S}px ${24*S}px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}>
        <div style={{
          fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
          color: C.muted, letterSpacing: "0.06em", marginBottom: 14 * S,
        }}>開發者做法 — 向量資料庫流程</div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 * S }}>
          <VectorFlowStep
            emoji="📄" label="文件" subLabel="doc"
            delay={delay + 10}
          />
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 19 * S,
            color: C.muted, paddingTop: 18 * S, flexShrink: 0,
          }}>→</div>
          <VectorFlowStep
            emoji="✂️" label="切成片段" subLabel="chunks"
            delay={delay + 30}
          />
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 19 * S,
            color: C.muted, paddingTop: 18 * S, flexShrink: 0,
          }}>→</div>
          <VectorFlowStep
            emoji="🔢" label="轉成向量" subLabel="embed"
            delay={delay + 50}
          />
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 19 * S,
            color: C.muted, paddingTop: 18 * S, flexShrink: 0,
          }}>→</div>
          <VectorFlowStep
            emoji="🔍" label="快速比對" subLabel="search"
            delay={delay + 70}
          />
        </div>
      </div>
    </div>
  );
}

// ── PrivacyWarningItem — extracted for hook safety ────────────────────────
function PrivacyWarningItem({ question, detail, delay }: {
  question: string; detail: string; delay: number;
}) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const opacity    = interpolate(f, [0, 14], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const translateY = interpolate(f, [0, 20], [14 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });

  return (
    <div style={{
      opacity, transform: `translateY(${translateY}px)`,
      display: "flex", alignItems: "flex-start", gap: 10 * S,
      marginBottom: 10 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono',monospace", fontSize: 17 * S,
        color: C.red, flexShrink: 0, marginTop: 2 * S,
      }}>?</div>
      <div>
        <div style={{
          fontFamily: "'Noto Sans TC',sans-serif",
          fontSize: 19 * S, fontWeight: 700, color: C.text,
          marginBottom: 3 * S,
        }}>{question}</div>
        <div style={{
          fontFamily: "'Noto Sans TC',sans-serif",
          fontSize: 17 * S, color: C.muted, lineHeight: 1.5,
        }}>{detail}</div>
      </div>
    </div>
  );
}

// ── PrivacyWarningCard ─────────────────────────────────────────────────────
// Red-bordered warning card with 3 animated questions
function PrivacyWarningCard({ delay }: { delay: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const opacity = interpolate(f, [0, 20], [0, 1], clamp);
  const pulse = 0.5 + 0.5 * Math.sin(f * 0.12);

  return (
    <div style={{
      opacity,
      background: C.redLight,
      border: `${1.5 * S}px solid ${C.redBorder}`,
      borderRadius: 16 * S,
      padding: `${16 * S}px ${18 * S}px`,
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      boxShadow: `0 0 ${(12 + pulse * 20) * S}px ${C.red}44, 0 ${4*S}px ${32*S}px rgba(255,107,107,0.15), inset 0 1px 0 rgba(255,107,107,0.1)`,
      marginBottom: 14 * S,
    }}>
      {/* Header */}
      <div style={{
        fontFamily: "'Space Mono',monospace", fontSize: 17 * S,
        color: C.red, fontWeight: 700, letterSpacing: "0.04em",
        marginBottom: 16 * S,
      }}>⚠️ 使用 RAG 前先想清楚</div>

      <PrivacyWarningItem
        question="資料存在哪裡？"
        detail="雲端服務商伺服器 or 本機？"
        delay={delay + 20}
      />
      <PrivacyWarningItem
        question="是敏感資料嗎？"
        detail="客戶資料、合約內容——需確認服務隱私政策"
        delay={delay + 60}
      />
      <PrivacyWarningItem
        question="確認過隱私政策嗎？"
        detail="考慮使用可本機運行的私有部署方案"
        delay={delay + 100}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Concept Animations — floating overlays synced to VTT frames
// ══════════════════════════════════════════════════════════════════════════

// Animation 1: BrainForgetAnimation
// Trigger: local frame 415 in TitleScene (speaker says "它記不住你的事情")
function BrainForgetAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 180;

  // Overall envelope: fade in 0-10, hold, fade out 160-180
  const envelope = interpolate(f, [0, 10, 160, DURATION], [0, 1, 1, 0], clamp);

  // Brain circle scale: pop in with spring feel
  const brainScale = interpolate(f, [0, 16], [0.5, 1], { easing: E.outExpo, extrapolateRight: "clamp" });

  // 5 memory nodes, each blink out at different times
  const nodeFrames = [8, 16, 24, 32, 40]; // when each node disappears
  const nodePositions = [
    { x: -32*S, y: -18*S }, { x: 18*S, y: -32*S }, { x: 40*S, y: 0 },
    { x: 14*S, y: 25*S }, { x: -25*S, y: 18*S }
  ];

  // ❓ floats up: starts at frame 20, drifts up 90px, fades at 60
  const qY = interpolate(f, [20, 55], [0, -90*S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const qOpacity = interpolate(f, [20, 28, 50, 65], [0, 1, 1, 0], clamp);
  const qScale = interpolate(f, [20, 30], [0.6, 1], { easing: E.outExpo, extrapolateRight: "clamp" });

  const brainR = 65*S;

  if (f > DURATION) return null;

  return (
    <div style={{
      position: "absolute",
      left: "50%", bottom: 280*S,
      transform: "translateX(-50%)",
      opacity: envelope,
      display: "flex", flexDirection: "column", alignItems: "center",
      pointerEvents: "none", zIndex: 50,
    }}>
      {/* ❓ floats above brain */}
      <div style={{
        fontSize: 50*S, lineHeight: 1,
        opacity: qOpacity,
        transform: `translateY(${qY}px) scale(${qScale})`,
        marginBottom: -36*S,
        filter: `drop-shadow(0 0 ${22*S}px rgba(255,209,102,0.8))`,
      }}>❓</div>

      {/* Brain circle + nodes */}
      <div style={{
        position: "relative",
        width: brainR*2, height: brainR*2,
        transform: `scale(${brainScale})`,
      }}>
        {/* Brain body */}
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: `${5*S}px solid rgba(124,255,178,0.5)`,
          background: "rgba(124,255,178,0.06)",
          boxShadow: `0 0 ${36*S}px rgba(124,255,178,0.15)`,
        }} />
        {/* Memory nodes */}
        {nodePositions.map((pos, i) => {
          const disappearFrame = nodeFrames[i];
          const nodeOpacity = interpolate(f, [disappearFrame, disappearFrame+8], [1, 0], clamp);
          const pulseScale = interpolate(f, [disappearFrame-4, disappearFrame], [1, 2], clamp);
          return (
            <div key={i} style={{
              position: "absolute",
              left: brainR + pos.x - 9*S,
              top: brainR + pos.y - 9*S,
              width: 18*S, height: 18*S,
              borderRadius: "50%",
              background: "#7cffb2",
              boxShadow: `0 0 ${14*S}px #7cffb2`,
              opacity: nodeOpacity,
              transform: `scale(${pulseScale})`,
            }} />
          );
        })}
        {/* Center label */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40*S, opacity: interpolate(f, [0, 12], [0, 0.7], clamp),
        }}>🧠</div>
      </div>

      {/* Label */}
      <div style={{
        marginTop: 18*S,
        fontFamily: "'Space Mono',monospace",
        fontSize: 18*S, color: "rgba(255,255,255,0.4)",
        letterSpacing: "0.08em",
        opacity: interpolate(f, [15, 25], [0, 1], clamp),
      }}>記憶清空中...</div>
    </div>
  );
}

// Animation 2: KnowledgeFreezeAnimation
// Trigger: local frame 109 in Scene2 (global 3335, Scene2 starts at 3226)
function KnowledgeFreezeAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 210;

  const envelope = interpolate(f, [0, 12, 190, DURATION], [0, 1, 1, 0], clamp);

  const BAR_W = 504*S;
  const BAR_H = 22*S;
  const freezeSweep = interpolate(f, [0, 35], [0, BAR_W * 0.5], { easing: E.outExpo, extrapolateRight: "clamp" });

  const iceOpacity = interpolate(f, [18, 30], [0, 1], clamp);
  const iceScale = interpolate(f, [18, 30], [0.3, 1], { easing: E.outExpo, extrapolateRight: "clamp" });

  const labelOpacity = interpolate(f, [25, 40], [0, 1], clamp);

  if (f > DURATION) return null;

  return (
    <div style={{
      position: "absolute",
      right: 80*S, top: 180*S,
      opacity: envelope,
      pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 22*S,
    }}>
      {/* Title */}
      <div style={{
        fontFamily: "'Space Mono',monospace",
        fontSize: 18*S, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em",
        opacity: interpolate(f, [0, 15], [0, 1], clamp),
      }}>AI 知識範圍</div>

      {/* Timeline bar */}
      <div style={{ position: "relative", width: BAR_W, height: BAR_H }}>
        {/* Track */}
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(255,255,255,0.06)",
          borderRadius: BAR_H/2,
        }} />
        {/* Warm / known side */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: BAR_W * 0.5,
          background: "linear-gradient(90deg, rgba(124,255,178,0.8) 0%, rgba(124,255,178,0.4) 100%)",
          borderRadius: BAR_H/2,
          boxShadow: `0 0 ${18*S}px rgba(124,255,178,0.4)`,
        }} />
        {/* Freeze sweep */}
        <div style={{
          position: "absolute", left: BAR_W * 0.5, top: 0, bottom: 0,
          width: freezeSweep,
          background: "linear-gradient(90deg, rgba(147,197,253,0.5) 0%, rgba(147,197,253,0.15) 100%)",
          borderRadius: `0 ${BAR_H/2}px ${BAR_H/2}px 0`,
        }} />
        {/* Freeze line at center */}
        <div style={{
          position: "absolute",
          left: BAR_W * 0.5 - 3*S, top: -11*S, bottom: -11*S,
          width: 5*S,
          background: "rgba(147,197,253,0.9)",
          boxShadow: `0 0 ${14*S}px rgba(147,197,253,0.8)`,
        }} />
        {/* ❄️ icon at freeze point */}
        <div style={{
          position: "absolute",
          left: BAR_W * 0.5 - 29*S,
          top: -50*S,
          opacity: iceOpacity,
          transform: `scale(${iceScale})`,
          fontSize: 36*S,
          filter: `drop-shadow(0 0 ${14*S}px rgba(147,197,253,0.9))`,
        }}>❄️</div>
      </div>

      {/* Label */}
      <div style={{
        fontFamily: "'Space Mono',monospace",
        fontSize: 18*S, color: "rgba(147,197,253,0.8)",
        letterSpacing: "0.06em",
        opacity: labelOpacity,
      }}>← 訓練截止日 | 未知 →</div>
    </div>
  );
}

// Animation 3: DocumentSliceAnimation
// Trigger: local frame 706 in Scene3 (global 5699, Scene3 starts at 4993)
function DocumentSliceAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 160;

  const envelope = interpolate(f, [0, 10, 140, DURATION], [0, 1, 1, 0], clamp);

  const DOC_W = 180*S;
  const DOC_H = 234*S;
  const CHUNK_H = (DOC_H - 11*S) / 3;

  // Document pop in
  const docScale = interpolate(f, [0, 14], [0.7, 1], { easing: E.outExpo, extrapolateRight: "clamp" });

  // Slice lines sweep at frames 15, 22
  const slice1X = interpolate(f, [15, 27], [0, DOC_W], { easing: E.outExpo, extrapolateRight: "clamp" });
  const slice2X = interpolate(f, [22, 34], [0, DOC_W], { easing: E.outExpo, extrapolateRight: "clamp" });

  // Chunks separate after frame 38
  const chunkSep = interpolate(f, [38, 55], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  const chunk0Y = chunkSep * -18*S;
  const chunk2Y = chunkSep * 18*S;

  // Token labels fade in at frame 50
  const tokenOpacity = interpolate(f, [50, 62], [0, 1], clamp);
  const tokens = ["[0.82, -0.31...]", "[0.15, 0.94...]", "[-0.67, 0.22...]"];

  if (f > DURATION) return null;

  return (
    <div style={{
      position: "absolute",
      left: 110*S, top: "50%",
      transform: "translateY(-50%)",
      opacity: envelope,
      pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14*S,
    }}>
      {/* Label */}
      <div style={{
        fontFamily: "'Space Mono',monospace",
        fontSize: 18*S, color: "rgba(255,255,255,0.35)",
        letterSpacing: "0.08em", marginBottom: 7*S,
      }}>文件 → 向量切片</div>

      <div style={{ display: "flex", gap: 36*S, alignItems: "center" }}>
        {/* Document with slice lines */}
        <div style={{
          position: "relative", width: DOC_W, height: DOC_H,
          transform: `scale(${docScale})`,
          transformOrigin: "top left",
        }}>
          {/* Chunk 0 (top) */}
          <div style={{
            position: "absolute", left: 0, top: chunk0Y, width: DOC_W, height: CHUNK_H,
            background: "rgba(255,255,255,0.07)",
            border: `2px solid rgba(124,255,178,0.25)`,
            borderRadius: 7*S,
          }} />
          {/* Chunk 1 (middle) */}
          <div style={{
            position: "absolute", left: 0, top: CHUNK_H+5*S, width: DOC_W, height: CHUNK_H,
            background: "rgba(255,255,255,0.07)",
            border: `2px solid rgba(124,255,178,0.25)`,
            borderRadius: 7*S,
          }} />
          {/* Chunk 2 (bottom) */}
          <div style={{
            position: "absolute", left: 0, top: (CHUNK_H+5*S)*2 + chunk2Y, width: DOC_W, height: CHUNK_H,
            background: "rgba(255,255,255,0.07)",
            border: `2px solid rgba(124,255,178,0.25)`,
            borderRadius: 7*S,
          }} />
          {/* Slice line 1 */}
          {f >= 15 && (
            <div style={{
              position: "absolute",
              top: CHUNK_H - 3*S, left: 0, height: 5*S, width: slice1X,
              background: "#7cffb2",
              boxShadow: `0 0 ${11*S}px #7cffb2`,
            }} />
          )}
          {/* Slice line 2 */}
          {f >= 22 && (
            <div style={{
              position: "absolute",
              top: CHUNK_H*2 + 5*S - 3*S, left: 0, height: 5*S, width: slice2X,
              background: "#7cffb2",
              boxShadow: `0 0 ${11*S}px #7cffb2`,
            }} />
          )}
        </div>

        {/* Arrow */}
        <div style={{
          fontSize: 32*S,
          opacity: interpolate(f, [38, 50], [0, 1], clamp),
          color: "rgba(124,255,178,0.6)",
        }}>→</div>

        {/* Token tags */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 11*S,
          opacity: tokenOpacity,
        }}>
          {tokens.map((t, i) => (
            <div key={i} style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: 14*S, color: "#7cffb2",
              background: "rgba(124,255,178,0.06)",
              border: "2px solid rgba(124,255,178,0.2)",
              borderRadius: 7*S, padding: `${5*S}px ${14*S}px`,
              whiteSpace: "nowrap" as const,
            }}>{t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Animation 4: AssistantVsMemoryAnimation
// Trigger: local frame 878 in Scene1 (global 1522, "一般的 AI 就像一個只靠記憶回答的人")
function AssistantVsMemoryAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 180;
  const envelope = interpolate(f, [0, 10, 160, DURATION], [0, 1, 1, 0], clamp);

  const leftOpacity = interpolate(f, [0, 14], [0, 1], clamp);
  const rightOpacity = interpolate(f, [30, 42], [0, 1], clamp);
  const rightScale = interpolate(f, [30, 42], [0.8, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  const glassAngle = interpolate(f, [42, 58, 70, 82], [-15, 15, -8, 0], clamp);

  if (f > DURATION) return null;

  const cardStyle: React.CSSProperties = {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 14*S,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 22*S,
    padding: `${25*S}px ${36*S}px`,
    minWidth: 198*S,
  };

  return (
    <div style={{
      position: "absolute",
      bottom: 200*S, left: "50%", transform: "translateX(-50%)",
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", alignItems: "flex-end", gap: 29*S,
    }}>
      {/* Left: plain AI */}
      <div style={{ ...cardStyle, opacity: leftOpacity, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 47*S }}>🧠</div>
        <div style={{ fontSize: 32*S }}>😶</div>
        <div style={{
          fontFamily: "'Space Mono',monospace", fontSize: 16*S,
          color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em", textAlign: "center",
        }}>{"普通 AI\n只靠記憶"}</div>
      </div>

      {/* VS */}
      <div style={{
        fontFamily: "'Space Mono',monospace", fontSize: 20*S,
        color: "rgba(255,255,255,0.2)", marginBottom: 36*S,
        opacity: interpolate(f, [14, 24], [0, 1], clamp),
      }}>VS</div>

      {/* Right: RAG AI */}
      <div style={{
        ...cardStyle,
        opacity: rightOpacity,
        transform: `scale(${rightScale})`,
        border: `2px solid rgba(124,255,178,0.3)`,
        boxShadow: `0 0 ${36*S}px rgba(124,255,178,0.12)`,
      }}>
        <div style={{ fontSize: 47*S }}>🧠</div>
        <div style={{
          fontSize: 36*S,
          display: "inline-block",
          transform: `rotate(${glassAngle}deg)`,
          transformOrigin: "bottom center",
        }}>🔍</div>
        <div style={{
          fontFamily: "'Space Mono',monospace", fontSize: 16*S,
          color: "#7cffb2", letterSpacing: "0.06em", textAlign: "center",
        }}>{"RAG AI\n先查資料"}</div>
      </div>
    </div>
  );
}

// Animation 5: PrivacyLockAnimation
// Trigger: local frame 204 in Scene2 (global 3430, "它完全不知道你的私人資料")
function PrivacyLockAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 210;
  const envelope = interpolate(f, [0, 10, 190, DURATION], [0, 1, 1, 0], clamp);

  const lockScale = interpolate(f, [0, 16], [0.4, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  const lockGlow = interpolate(f, [16, 36, 56], [0.3, 0.8, 0.3], clamp);

  const chips = [
    { emoji: "📋", label: "會議記錄", delay: 8 },
    { emoji: "👤", label: "客戶資料", delay: 16 },
    { emoji: "📁", label: "公司文件", delay: 24 },
    { emoji: "🗒️", label: "個人筆記", delay: 32 },
  ];
  const orbitPositions = [
    { x: -126*S, y: -72*S },
    { x: 90*S,   y: -90*S },
    { x: 108*S,  y: 54*S  },
    { x: -108*S, y: 72*S  },
  ];

  if (f > DURATION) return null;

  return (
    <div style={{
      position: "absolute",
      right: 80*S, bottom: 250*S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
    }}>
      <div style={{
        position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 108*S, height: 108*S,
      }}>
        {/* Lock icon */}
        <div style={{
          fontSize: 50*S,
          transform: `scale(${lockScale})`,
          filter: `drop-shadow(0 0 ${22*S}px rgba(255,107,107,${lockGlow}))`,
          position: "relative", zIndex: 2,
        }}>🔒</div>

        {/* Data chips */}
        {chips.map((chip, i) => {
          const chipOpacity = interpolate(f, [chip.delay, chip.delay+12], [0, 1], clamp);
          const chipScale = interpolate(f, [chip.delay, chip.delay+12], [0.5, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
          const pos = orbitPositions[i];
          return (
            <div key={i} style={{
              position: "absolute",
              left: 54*S + pos.x - 63*S,
              top: 54*S + pos.y - 29*S,
              opacity: chipOpacity,
              transform: `scale(${chipScale})`,
              display: "flex", alignItems: "center", gap: 9*S,
              background: "rgba(255,107,107,0.08)",
              border: "2px solid rgba(255,107,107,0.25)",
              borderRadius: 11*S,
              padding: `${7*S}px ${14*S}px`,
              whiteSpace: "nowrap" as const,
            }}>
              <span style={{ fontSize: 22*S }}>{chip.emoji}</span>
              <span style={{
                fontFamily: "'Space Mono',monospace",
                fontSize: 14*S, color: "rgba(255,107,107,0.8)",
              }}>{chip.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Animation 6: DataCloudAnimation
// Trigger: local frame 1704 in Scene3 (global 6697, "資料交給 AI 處理，不等於資料就消失了")
function DataCloudAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 210;
  const envelope = interpolate(f, [0, 10, 190, DURATION], [0, 1, 1, 0], clamp);

  const docOpacity = interpolate(f, [0, 12], [0, 1], clamp);
  const arrowW = interpolate(f, [15, 35], [0, 144*S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const cloudScale = interpolate(f, [30, 42], [0.4, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  const copyOpacity = interpolate(f, [45, 58], [0, 1], clamp);
  const warnOpacity = interpolate(f, [50, 60], [0, 1], clamp);
  const warnScale = interpolate(f, [50, 60], [0.5, 1], { easing: E.outExpo, extrapolateRight: "clamp" });

  if (f > DURATION) return null;

  return (
    <div style={{
      position: "absolute",
      left: "50%", bottom: 180*S,
      transform: "translateX(-50%)",
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 18*S,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18*S }}>
        {/* Left: document + copy indicator */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 7*S }}>
          <div style={{ fontSize: 47*S, opacity: docOpacity }}>📄</div>
          <div style={{
            opacity: copyOpacity,
            fontFamily: "'Space Mono',monospace", fontSize: 14*S,
            color: "#7cffb2", letterSpacing: "0.05em",
            background: "rgba(124,255,178,0.08)",
            border: "2px solid rgba(124,255,178,0.25)",
            borderRadius: 7*S, padding: `${4*S}px ${11*S}px`,
          }}>仍在這裡</div>
        </div>

        {/* Arrow */}
        <div style={{ position: "relative", height: 5*S, overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: arrowW, height: 5*S,
            background: "linear-gradient(90deg, rgba(255,209,102,0.8) 0%, rgba(255,209,102,0.3) 100%)",
            borderRadius: 4*S,
          }} />
        </div>

        {/* Right: cloud + warning */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 7*S }}>
          <div style={{
            fontSize: 47*S,
            transform: `scale(${cloudScale})`,
            display: "inline-block",
          }}>☁️</div>
          <div style={{
            opacity: warnOpacity,
            transform: `scale(${warnScale})`,
            fontSize: 25*S,
            position: "absolute", top: -18*S, right: -25*S,
          }}>⚠️</div>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 14*S,
            color: "rgba(255,209,102,0.7)",
            letterSpacing: "0.04em", opacity: warnOpacity,
          }}>雲端伺服器</div>
        </div>
      </div>

      {/* Bottom label */}
      <div style={{
        fontFamily: "'Space Mono',monospace", fontSize: 16*S,
        color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em",
        opacity: interpolate(f, [50, 65], [0, 1], clamp),
      }}>資料交出去 ≠ 資料消失了</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 0 — Title (global 0–600, local 0–600)
// ══════════════════════════════════════════════════════════════════════════
function TitleScene() {
  const frame = useCurrentFrame();
  const badge  = useFadeUp(0);
  const title  = useFadeUp(10);
  const sub    = useFadeUp(22);
  const pills  = useFadeUp(35);
  const dotPulse = 0.5 + 0.5 * Math.sin(frame * 0.15);

  const topics = [
    { label: "RAG 是什麼",   bg: C.primaryLight, border: C.primaryBorder, color: C.primary },
    { label: "為什麼重要",   bg: C.yellowLight,  border: C.yellowBorder,  color: C.yellow  },
    { label: "資料隱私提醒", bg: C.redLight,     border: C.redBorder,     color: C.red     },
  ];

  return (
    <AbsoluteFill style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif" }}>
      <SceneFade durationInFrames={644}>
      {/* True center within the safe zone between navbar and subtitles */}
      <div style={{
        position: "absolute", top: NAV_H, left: 0, right: 0, bottom: SUBTITLE_SAFE,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: `0 ${80 * S}px`,
      }}>
      {/* EPISODE badge — SaaS hero pill */}
      <div style={{ ...badge, marginBottom: 20 * S }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8 * S,
          background: "rgba(129,140,248,0.10)",
          border: "1px solid rgba(129,140,248,0.25)",
          borderRadius: 99, padding: `${5 * S}px ${18 * S}px`,
        }}>
          <span style={{
            display: "inline-block", width: 5 * S, height: 5 * S,
            background: C.primary, borderRadius: "50%",
            boxShadow: `0 0 ${8 * S}px ${C.primary}`, opacity: dotPulse,
          }} />
          <span style={{
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
            color: C.primary, letterSpacing: "0.08em", fontWeight: 700,
          }}>每日 AI 知識庫</span>
        </div>
      </div>

      {/* Headline — large gradient text */}
      <div style={{ ...title, textAlign: "center", marginBottom: 10 * S }}>
        <h1 style={{ fontSize: 62 * S, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.02em", margin: 0,
          background: "linear-gradient(135deg, #7cffb2 0%, #ffffff 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          <WordReveal text="RAG 是什麼？" startFrame={10} staggerPerWord={6}
            fontSize={52 * S} color={C.primary}
            fontFamily="'Noto Sans TC','PingFang TC',sans-serif" fontWeight={900} letterSpacing="-0.02em" />
        </h1>
      </div>

      {/* Sub-headline */}
      <div style={{ ...sub, textAlign: "center", marginBottom: 14 * S }}>
        <p style={{ fontSize: 31 * S, fontWeight: 700, color: "rgba(241,245,249,0.75)", margin: 0, letterSpacing: "-0.01em" }}>
          讓 AI 查你的資料
        </p>
      </div>

      {/* Subtitle */}
      <div style={{
        ...sub, fontSize: 18 * S, color: C.muted, lineHeight: 1.65,
        textAlign: "center", marginBottom: 36 * S, maxWidth: 520 * S,
      }}>
        突破訓練截止日，讓 AI 真正讀懂你的資訊
      </div>

      {/* Topic pills — glass treatment */}
      <div style={{ ...pills, display: "flex", gap: 12 * S }}>
        {topics.map((t, i) => (
          <div key={i} style={{
            padding: `${8 * S}px ${18 * S}px`,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${t.border}`,
            borderRadius: 99,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
            color: t.color, letterSpacing: "0.04em", fontWeight: 700,
          }}>{t.label}</div>
        ))}
      </div>
      </div>
      </SceneFade>
      <BrainForgetAnimation triggerFrame={446} />
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 1 — RAG 是什麼 (global 644–3226, local 0–2582)
// Phase A: local 0–1340  (SectionBadge + HighlightPulse + AssistantCompare)
//   A_FADE_START=1281, A_REMOVE=1360, showB=frame>=1380
// Phase B: local 1380+   (RAGFlowDiagram + examples)
// ══════════════════════════════════════════════════════════════════════════
function Scene1() {
  const frame = useCurrentFrame();

  const A_FADE_START = 1281;
  const A_REMOVE     = 1360;
  const showA  = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const showB = frame >= 1380;

  // VTT-aligned step active states
  // "RAG 分兩個步驟" at 1:04.840 → global 1945, local 1301
  // "第一步，檢索" at 1:08.600 → global 2058, local 1414
  // "第二步，生成" at 1:18.280 → global 2348, local 1704
  // "例如你公司的文件" at 1:33.560 → global 2807, local 2163
  const step1Active  = frame >= 1414;
  const step2Active  = frame >= 1704;
  const examplesActive = frame >= 2163;

  // Phase B hooks — must be at top level, not inside conditionals
  const phaseBHeader = useFadeIn(1380);

  return (
    <>
    <ContentColumn>
      <SceneFade durationInFrames={2582}>
      {/* Phase A */}
      {showA && (
        <div style={{ opacity: aOpacity }}>
          <SectionBadge num="01" label="RAG 是什麼" />
          <HighlightPulse
            delay={60}
            text="RAG — 檢索增強生成"
            color="green"
            sub="Retrieval-Augmented Generation：讓 AI 在回答前先查你指定的資料"
          />
          <AssistantCompare delay={380} rightReveal={900} />
        </div>
      )}

      {/* Phase B — all nodes shown at once; step cards fill the empty space */}
      {showB && (
        <div>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S, color: C.muted,
            letterSpacing: "0.06em", marginBottom: 12 * S,
            ...phaseBHeader,
          }}>具體來說，RAG 分兩個步驟</div>

          {/* Diagram: all 4 nodes always visible, dim → bright as steps activate */}
          <RAGFlowDiagram
            delay={1380}
            step1ActiveAt={1414}
            step2ActiveAt={1704}
          />

          {/* Step 1 explanation card — appears when narrator says 第一步 */}
          <StepExplainCard
            delay={1414}
            color={C.yellow}
            border={C.yellowBorder}
            label="① 第一步：檢索"
            text="系統先從你提供的文件或資料庫，找出與問題最相關的片段"
          />

          {/* Step 2 explanation card — appears when narrator says 第二步 */}
          {step2Active && (
            <StepExplainCard
              delay={1704}
              color={C.primary}
              border={C.primaryBorder}
              label="② 第二步：生成"
              text="語言模型把這些片段當作參考資料，整理成有條理的回答給你"
            />
          )}

          {examplesActive && (
            <TagsRow
              delay={2163}
              tags={["公司文件", "最新產品說明", "你自己的筆記"]}
              color="primary"
            />
          )}
        </div>
      )}
      </SceneFade>
    </ContentColumn>
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AssistantVsMemoryAnimation triggerLocalFrame={878} />
    </AbsoluteFill>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 2 — 為什麼重要 (global 3226–4993, local 0–1767)
// Phase A: local 0–600  (知識凍結 + 無法回答私人資料)
//   A_FADE_START=560, A_REMOVE=620, showB=frame>=640
// Phase B: local 640+   (KnowledgeCutoffTimeline + faster/cheaper + 企業)
// VTT: "知識凍結" at 1:51.160 → local 109; "私人資料" at 1:54.320 → local 204
// VTT: "RAG 解決" at 2:06.840 → local 579; "比起微調" at 2:15.000 → local 824
// ══════════════════════════════════════════════════════════════════════════
function Scene2() {
  const frame = useCurrentFrame();

  const A_FADE_START = 560;
  const A_REMOVE     = 620;
  const showA    = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const showB = frame >= 640;

  // VTT-aligned delays for Phase B elements
  // "RAG 解決的就是這個問題" at 2:06.840 → local 579
  // "比起重新微調一個模型" at 2:15.000 → local 824

  // Phase B hooks — must be at top level
  const phaseBHeader = useFadeIn(640);

  return (
    <>
    <ContentColumn>
      <SceneFade durationInFrames={1767}>
      {/* Phase A */}
      {showA && (
        <div style={{ opacity: aOpacity }}>
          <SectionBadge num="02" label="為什麼 RAG 很重要" />
          <HighlightPulse
            delay={0}
            text="一般語言模型有一個根本限制"
            color="yellow"
            sub="它的知識凍結在訓練截止日，而且完全不知道你的私人資料"
          />
          <HighlightPulse
            delay={300}
            text="問它上週的會議記錄？它沒辦法回答"
            color="red"
            sub="問它你的客戶資料？它也沒辦法回答"
          />
        </div>
      )}

      {/* Phase B */}
      {showB && (
        <div>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S, color: C.muted,
            letterSpacing: "0.06em", marginBottom: 12 * S,
            ...phaseBHeader,
          }}>RAG 解決了什麼</div>

          <KnowledgeCutoffTimeline delay={640} />

          <HighlightPulse
            delay={824}
            text="架設更快，成本更低"
            color="green"
            sub="比起重新微調模型，RAG 只要更新文件就好，不需要重新訓練"
          />

          <HighlightPulse
            delay={1100}
            text="這是企業導入 AI 助理的第一步"
            color="yellow"
            sub="讓 AI 能讀懂公司的資料，才真正有實用價值"
          />
        </div>
      )}
      </SceneFade>
    </ContentColumn>
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <KnowledgeFreezeAnimation triggerLocalFrame={109} />
      <PrivacyLockAnimation triggerLocalFrame={204} />
    </AbsoluteFill>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 3 — 怎麼用 (global 4993–7135, local 0–2142)
// Phase A: local 0–980  (一般使用者 + TagsRow + VectorFlowCard)
//   A_FADE_START=920, A_REMOVE=990, showB=frame>=1010
// Phase B: local 1010+   (PrivacyWarningCard + 總結警語)
// VTT: "如果你是開發者" at 3:04.880 → local 553
// VTT: "把文件切成小片段" at 3:09.960 → local 706
// VTT: "很重要的提醒" at 3:18.000 → local 947
// VTT: "資料交給AI處理" at 3:43.240 → local 1704
// ══════════════════════════════════════════════════════════════════════════
function Scene3() {
  const frame = useCurrentFrame();

  const A_FADE_START = 920;
  const A_REMOVE     = 990;
  const showA    = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const showB = frame >= 1010;

  // VTT-aligned
  // "如果你是開發者" at 3:04.880 → local 553
  // "這裡有一個很重要的提醒" at 3:18.000 → local 947
  // "當你把私人文件交給 RAG 系統" → local 1010 approx
  // "資料交給 AI 處理 不等於資料就消失了" at 3:43.240 → local 1704
  const devSectionActive = frame >= 553;

  // Phase B hooks — must be at top level
  const phaseBHeader = useFadeIn(1010);

  return (
    <>
    <ContentColumn>
      <SceneFade durationInFrames={2142}>
      {/* Phase A */}
      {showA && (
        <div style={{ opacity: aOpacity }}>
          <SectionBadge num="03" label="怎麼用 RAG" />
          <HighlightPulse
            delay={0}
            text="一般使用者"
            color="green"
            sub="許多工具已內建類似 RAG 的功能——上傳文件給 AI、連接 Notion 筆記"
          />
          <TagsRow
            delay={120}
            tags={["上傳文件", "Notion 連接", "AI 助理"]}
            color="primary"
          />

          {devSectionActive && (
            <VectorFlowCard delay={553} />
          )}
        </div>
      )}

      {/* Phase B — 隱私警示 */}
      {showB && (
        <div>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S, color: C.muted,
            letterSpacing: "0.06em", marginBottom: 12 * S,
            ...phaseBHeader,
          }}>一個很重要的提醒</div>

          <PrivacyWarningCard delay={1010} />

          <HighlightPulse
            delay={1704}
            text="資料交給 AI 處理，不等於資料就消失了"
            color="red"
            sub="使用 RAG 相關工具之前，一定要先想清楚"
          />
        </div>
      )}
      </SceneFade>
    </ContentColumn>
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <DocumentSliceAnimation triggerLocalFrame={706} />
      <DataCloudAnimation triggerLocalFrame={1704} />
    </AbsoluteFill>
    </>
  );
}

// ── SummaryCard ────────────────────────────────────────────────────────────
function SummaryCard({ delay, num, title, body, color, bg, border }: {
  delay: number; num: string; title: string; body: string;
  color: string; bg: string; border: string;
}) {
  const a = useFadeUp(delay);
  return (
    <div style={{ ...a, marginBottom: 10 * S }}>
      <div style={{
        background: bg,
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        border: `1px solid ${border}`,
        borderRadius: 16 * S,
        padding: `${16 * S}px ${20 * S}px`,
        display: "flex", gap: 16 * S, alignItems: "center",
        boxShadow: `0 ${4*S}px ${24*S}px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}>
        <div style={{
          fontFamily: "'Space Mono',monospace",
          fontSize: 27 * S, fontWeight: 700, color,
          flexShrink: 0, width: 32 * S, textAlign: "center" as const,
          opacity: 0.6,
        }}>{num}</div>
        <div style={{
          borderLeft: `${2 * S}px solid ${border}`,
          paddingLeft: 16 * S, flex: 1,
        }}>
          <div style={{
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 19 * S, fontWeight: 700, color: C.text, marginBottom: 5 * S,
          }}>{title}</div>
          <div style={{
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 17 * S, color: C.muted, lineHeight: 1.6,
          }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Summary (global 7135–8322, local 0–1187)
// VTT: 3:57.840→0  approx local55→card1  local237→card2  local451→card3
// ══════════════════════════════════════════════════════════════════════════
function SummaryScene() {
  const frame = useCurrentFrame();
  const dotPulse = 0.5 + 0.5 * Math.sin(frame * 0.12);
  const titleA   = useFadeUp(0);

  return (
    <AbsoluteFill style={{
      fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: `${NAV_H + 20 * S}px ${80 * S}px ${SUBTITLE_SAFE + 20 * S}px`,
    }}>
      <SceneFade durationInFrames={1187}>
      {/* Header */}
      <div style={{ ...titleA, textAlign: "center", marginBottom: 28 * S }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10 * S,
          background: "rgba(129,140,248,0.10)", border: `1px solid ${C.primaryBorder}`,
          borderRadius: 99, padding: `${5 * S}px ${18 * S}px`, marginBottom: 14 * S,
        }}>
          <span style={{
            display: "inline-block", width: 5 * S, height: 5 * S,
            background: C.primary, borderRadius: "50%",
            boxShadow: `0 0 ${8 * S}px ${C.primary}`, opacity: dotPulse,
          }} />
          <span style={{
            fontFamily: "'Space Mono',monospace", fontSize: 12 * S,
            color: C.primary, letterSpacing: "0.06em",
          }}>重點整理</span>
        </div>
        <h2 style={{
          fontSize: 36 * S, fontWeight: 900, color: C.text,
          letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2,
        }}>今天學了什麼？</h2>
      </div>

      {/* Summary cards */}
      <div style={{ width: "100%", maxWidth: CONTAINER_W, display: "flex", flexDirection: "column", gap: 12 * S }}>
        <SummaryCard delay={55} num="01" title="RAG 是什麼"
          body="讓 AI 在回答前先查你指定的資料，突破訓練截止日與私人知識的限制"
          color={C.primary} bg={C.primaryLight} border={C.primaryBorder}
        />
        <SummaryCard delay={237} num="02" title="為什麼重要"
          body="比重新訓練模型更快更省，是企業導入 AI 助理的第一步"
          color={C.yellow} bg={C.yellowLight} border={C.yellowBorder}
        />
        <SummaryCard delay={451} num="03" title="怎麼用"
          body="許多工具已內建，但使用前務必確認資料存放位置與隱私政策"
          color={C.primary} bg={C.primaryLight} border={C.primaryBorder}
        />
      </div>
      </SceneFade>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Root composition export
// ══════════════════════════════════════════════════════════════════════════
export function VideoComposition_2026_04_01() {
  const frame = useCurrentFrame();
  const sc = SCENES_2026_04_01;

  return (
    <AbsoluteFill style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif" }}>
      <Background />

      <Audio src={staticFile("audio/ai-knowledge-2026-04-01-processed.wav")} volume={1.0} />

      <ProgressBar globalFrame={frame} />

      <Sequence from={sc.title.from}   durationInFrames={sc.title.to   - sc.title.from}>
        <TitleScene />
      </Sequence>
      <Sequence from={sc.scene1.from}  durationInFrames={sc.scene1.to  - sc.scene1.from}>
        <Scene1 />
      </Sequence>
      <Sequence from={sc.scene2.from}  durationInFrames={sc.scene2.to  - sc.scene2.from}>
        <Scene2 />
      </Sequence>
      <Sequence from={sc.scene3.from}  durationInFrames={sc.scene3.to  - sc.scene3.from}>
        <Scene3 />
      </Sequence>
      <Sequence from={sc.summary.from} durationInFrames={sc.summary.to - sc.summary.from}>
        <SummaryScene />
      </Sequence>

      {/* iMessage notifications — always on top */}
      {ALL_CALLOUTS.map((c, i) => (
        <NotificationCard key={i} c={c} globalFrame={frame} allCallouts={ALL_CALLOUTS} />
      ))}
    </AbsoluteFill>
  );
}
