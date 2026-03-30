import {
  AbsoluteFill,
  Audio,
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
const W = 1280 * S;                       // 3840
const NAV_H = 50 * S;                     // 150px
const CONTAINER_W = 640 * S;             // 1920px content column
const COL_LEFT = (W - CONTAINER_W) / 2; // 960px

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:           "#000000",
  surface:      "#0d0d0d",
  primary:      "#7cffb2",
  primaryLight: "rgba(124,255,178,0.07)",
  primaryBorder:"rgba(124,255,178,0.14)",
  text:         "#ffffff",
  muted:        "#888888",
  yellow:       "#ffd166",
  yellowLight:  "rgba(255,209,102,0.1)",
  yellowBorder: "rgba(255,209,102,0.2)",
  red:          "#ff6b6b",
} as const;

// ── iMessage notification constants ────────────────────────────────────────
const NOTIF_W          = 290 * S;
const NOTIF_TOP        = 12  * S;
const NOTIF_RIGHT      = 20  * S;
const NOTIF_SLOT       = 148 * S;
const NOTIF_SLIDE_H    = 110 * S;
const FADE_OUT_FRAMES  = 50;

// ── Scenes / timing — derived from corrected Whisper VTT (seconds × 30) ───
// VTT: title 0:00→0:27 | token 0:27→1:37.5 | context 1:37.5→3:05.5
//      tips 3:05.5→4:20.5 | summary 4:20.5→end
export const SCENES_2026_03_30 = {
  title:   { from: 0,    to: 810  },  // 0:00 → 0:27
  token:   { from: 810,  to: 2925 },  // 0:27 → 1:37.5
  context: { from: 2925, to: 5565 },  // 1:37.5 → 3:05.5
  tips:    { from: 5565, to: 7815 },  // 3:05.5 → 4:20.5
  summary: { from: 7815, to: 8930 },  // 4:20.5 → end
} as const;
export const TOTAL_FRAMES_2026_03_30 = 8930;

// ── Subtitle safe area (subtitles occupy bottom ~120 "units" at S=1) ───────
const SUBTITLE_SAFE = 120 * S;  // 360px at 4K — keep content above this

const CHAPTERS = [
  { label: "今日焦點",       start: 0    },
  { label: "Token 是什麼",   start: 810  },
  { label: "上下文視窗",     start: 2925 },
  { label: "4 個實用技巧",   start: 5565 },
  { label: "重點整理",       start: 7815 },
] as const;

// ── Animation helpers ──────────────────────────────────────────────────────
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function useFadeUp(startFrame: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const p = spring({ frame: f, fps, config: { damping: 22, stiffness: 90 } });
  return {
    opacity: interpolate(f, [0, 18], [0, 1], clamp),
    transform: `translateY(${interpolate(p, [0, 1], [24 * S, 0], clamp)}px)`,
  };
}

function useFadeIn(startFrame: number) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  return { opacity: interpolate(f, [0, 24], [0, 1], clamp) };
}

function useFocusHighlight(startFrame: number, duration = 75) {
  const frame = useCurrentFrame();
  const f = frame - startFrame;
  if (f < 0 || f > duration) return {};
  const intensity = interpolate(f, [0, duration], [1, 0], clamp);
  return {
    boxShadow: `0 0 ${Math.round(intensity * 24 * S)}px rgba(124,255,178,${(intensity * 0.55).toFixed(2)})`,
    borderColor: `rgba(124,255,178,${(0.14 + intensity * 0.5).toFixed(2)})`,
  };
}

// ── Background ─────────────────────────────────────────────────────────────
function Background() {
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: -300, right: -300,
        width: 1200, height: 1200,
        background: "radial-gradient(circle, rgba(124,255,178,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -300, left: -300,
        width: 1050, height: 1050,
        background: "radial-gradient(circle, rgba(124,255,178,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────
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
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 10 * S,
          color: C.muted,
          fontFamily: "'Space Mono', monospace",
          letterSpacing: "0.05em",
        }}>
          <span>每日 AI 知識庫 · 2026-03-30</span>
          <span style={{ color: C.primary }}>{current.label}</span>
        </div>
        <div style={{
          height: 3 * S,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 99,
          overflow: "hidden",
          marginTop: 6 * S,
        }}>
          <div style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: C.primary,
            borderRadius: 99,
            boxShadow: `0 0 ${8 * S}px ${C.primary}88`,
          }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── iMessage notification system ───────────────────────────────────────────
interface Callout {
  from: number; to: number;
  sender: string; text: string;
}

// Global frames derived from corrected VTT (seconds × 30):
// 0:42.5→1275 積木 | 1:24.5→2535 估算 | 1:56.5→3495 桌面視窗
// 2:56.5→5295 長期記憶 | 3:13.5→5805 技巧1 | 4:04.5→7335 技巧4
const ALL_CALLOUTS: Callout[] = [
  { from: 1275, to: 1425, sender: "積木比喻",      text: "AI 把句子拆成積木再理解" },
  { from: 2535, to: 2685, sender: "Token 小教室",  text: "1000 Token ≈ 500 個中文字" },
  { from: 3495, to: 3645, sender: "上下文視窗",    text: "桌面大小 = AI 能記住的上限" },
  { from: 5295, to: 5445, sender: "重要提醒",      text: "AI 沒有長期記憶，只有當下視窗" },
  { from: 5805, to: 5955, sender: "實用技巧 #1",   text: "重要的事放後面，不要放前面" },
  { from: 7335, to: 7485, sender: "實用技巧 #4",   text: "長任務分段處理，效果更好" },
];

function NotificationCard({
  c,
  globalFrame,
  allCallouts,
}: {
  c: Callout;
  globalFrame: number;
  allCallouts: Callout[];
}) {
  const { fps } = useVideoConfig();
  const localF = globalFrame - c.from;
  const duration = c.to - c.from;
  const totalVisible = duration + FADE_OUT_FRAMES;

  if (localF < 0 || localF >= totalVisible) return null;

  let totalYPush = 0;
  for (const newer of allCallouts) {
    if (newer.from <= c.from) continue;
    if (globalFrame < newer.from) continue;
    const pushF = globalFrame - newer.from;
    const pushP = spring({ frame: pushF, fps, config: { damping: 22, stiffness: 120 } });
    totalYPush += NOTIF_SLOT * pushP;
  }

  const entryP = spring({ frame: localF, fps, config: { damping: 22, stiffness: 130 } });
  const slideY = interpolate(entryP, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);

  const opacity = interpolate(
    localF,
    [0, 10, duration, totalVisible],
    [0, 1, 1, 0],
    clamp,
  );

  const stackDepth = totalYPush / NOTIF_SLOT;
  const depthAlpha = interpolate(stackDepth, [0, 1, 2], [1, 0.65, 0.35], clamp);

  const CHARS_PER_FRAME = 0.85;
  const charsVisible = interpolate(
    Math.max(0, localF - 14),
    [0, c.text.length / CHARS_PER_FRAME],
    [0, c.text.length],
    clamp,
  );
  const displayText = c.text.slice(0, Math.floor(charsVisible));
  const cursor = localF % 20 < 10 && charsVisible < c.text.length ? "|" : "";

  const iconSize = 38 * S;
  const fontBase  = 11 * S;
  const fontSender = 13 * S;
  const fontBody   = 13 * S;

  return (
    <div style={{
      position: "absolute",
      top: NAV_H + NOTIF_TOP + totalYPush,
      right: NOTIF_RIGHT,
      width: NOTIF_W,
      transform: `translateY(${slideY}px)`,
      opacity: opacity * depthAlpha,
      pointerEvents: "none",
      zIndex: 100,
    }}>
      <div style={{
        background: "rgba(28,28,30,0.9)",
        backdropFilter: "blur(48px)",
        WebkitBackdropFilter: "blur(48px)",
        border: `${1 * S}px solid rgba(255,255,255,0.13)`,
        borderRadius: 14 * S,
        boxShadow: `0 ${8 * S}px ${40 * S}px rgba(0,0,0,0.6), 0 ${1}px 0 rgba(255,255,255,0.06) inset`,
        padding: `${10 * S}px ${14 * S}px`,
        display: "flex",
        gap: 11 * S,
        alignItems: "flex-start",
      }}>
        <div style={{
          width: iconSize, height: iconSize,
          borderRadius: 9 * S,
          background: "linear-gradient(145deg, #3DDC6A 0%, #25A244 100%)",
          boxShadow: `0 ${2 * S}px ${10 * S}px rgba(52,199,89,0.45)`,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{ position: "relative", width: 22 * S, height: 20 * S }}>
            <div style={{
              position: "absolute", top: 0, left: 0,
              width: 22 * S, height: 16 * S,
              background: "white",
              borderRadius: 5 * S,
              opacity: 0.95,
            }} />
            <div style={{
              position: "absolute", bottom: 0, left: 4 * S,
              width: 0, height: 0,
              borderLeft: `${5 * S}px solid transparent`,
              borderTop: `${6 * S}px solid white`,
              opacity: 0.95,
            }} />
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 3 * S,
          }}>
            <span style={{
              fontFamily: "-apple-system, 'SF Pro Text', 'PingFang TC', system-ui, sans-serif",
              fontSize: fontBase,
              fontWeight: 600,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.01em",
            }}>iMessage</span>
            <span style={{
              fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
              fontSize: fontBase,
              color: "rgba(255,255,255,0.3)",
            }}>now</span>
          </div>
          <div style={{
            fontFamily: "-apple-system, 'SF Pro Text', 'PingFang TC', system-ui, sans-serif",
            fontSize: fontSender,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            marginBottom: 2 * S,
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap" as const,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>{c.sender}</div>
          <div style={{
            fontFamily: "-apple-system, 'SF Pro Text', 'PingFang TC', system-ui, sans-serif",
            fontSize: fontBody,
            fontWeight: 400,
            color: "rgba(255,255,255,0.60)",
            lineHeight: 1.45,
            letterSpacing: "-0.005em",
            minHeight: fontBody * 1.45,
          }}>{displayText}{cursor}</div>
        </div>
      </div>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────
function ContentColumn({ children }: { children: React.ReactNode }) {
  const H = 720 * S; // canvas height at 4K
  const contentTop = NAV_H + 20 * S;
  const contentMaxH = H - contentTop - SUBTITLE_SAFE;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{
        position: "absolute",
        top: contentTop,
        left: COL_LEFT,
        width: CONTAINER_W,
        maxHeight: contentMaxH,
        overflowY: "hidden" as const,
      }}>
        {children}
      </div>
    </AbsoluteFill>
  );
}

function SectionBadge({ num, label }: { num: string; label: string }) {
  const a = useFadeUp(0);
  return (
    <div style={{ ...a, display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 20 * S }}>
      <div style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 11 * S,
        color: C.primary,
        background: C.primaryLight,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 99,
        padding: `${3 * S}px ${12 * S}px`,
      }}>{num}</div>
      <h2 style={{
        fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
        fontSize: 22 * S,
        fontWeight: 700,
        color: C.text,
        letterSpacing: "-0.01em",
        margin: 0,
      }}>{label}</h2>
    </div>
  );
}

function AnalogyBox({ label, children, delay }: { label: string; children: React.ReactNode; delay: number }) {
  const a = useFadeIn(delay);
  return (
    <div style={{ ...a }}>
      <div style={{
        background: C.primaryLight,
        borderLeft: `${4 * S}px solid ${C.primary}`,
        borderRadius: `0 ${14 * S}px ${14 * S}px 0`,
        padding: `${10 * S}px ${16 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 9 * S,
          color: C.primary,
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
          marginBottom: 5 * S,
        }}>{label}</div>
        <p style={{
          fontSize: 12 * S, color: "#c8ffe0", lineHeight: 1.6, margin: 0,
          textRendering: "geometricPrecision",
        }}>{children}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 0 — Title (0–450f)
// ══════════════════════════════════════════════════════════════════════════
function TitleScene() {
  const frame = useCurrentFrame();
  const badge = useFadeUp(0);
  const title = useFadeUp(10);
  const sub   = useFadeUp(22);
  const pills = useFadeUp(35);
  const dotPulse = 0.5 + 0.5 * Math.sin(frame * 0.15);

  const topics = [
    { label: "Token 積木",    bg: C.primaryLight, border: C.primaryBorder, color: C.primary },
    { label: "上下文視窗",    bg: C.yellowLight,  border: C.yellowBorder,  color: C.yellow  },
    { label: "4 個技巧",      bg: C.primaryLight, border: C.primaryBorder, color: C.primary },
  ];

  return (
    <AbsoluteFill style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: `${NAV_H}px ${80 * S}px 0`,
    }}>
      {/* Date badge */}
      <div style={{ ...badge, marginBottom: 18 * S }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8 * S,
          background: C.primaryLight,
          border: `1px solid ${C.primaryBorder}`,
          borderRadius: 99,
          padding: `${5 * S}px ${16 * S}px`,
        }}>
          <span style={{
            display: "inline-block",
            width: 5 * S, height: 5 * S,
            background: C.primary, borderRadius: "50%",
            boxShadow: `0 0 ${8 * S}px ${C.primary}`,
            opacity: dotPulse,
          }} />
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11 * S, color: C.muted, letterSpacing: "0.05em",
          }}>2026-03-30 · 每日 AI 知識庫</span>
        </div>
      </div>

      {/* Headline */}
      <div style={{ ...title, textAlign: "center", marginBottom: 16 * S }}>
        <h1 style={{
          fontSize: 52 * S, fontWeight: 900, color: C.text,
          lineHeight: 1.25, letterSpacing: "-0.02em", margin: 0,
        }}>
          AI 說「我不記得了」
          <br />
          <span style={{ color: C.primary }}>其實它從來沒有記憶</span>
        </h1>
      </div>

      {/* Subtitle */}
      <div style={{
        ...sub,
        fontSize: 17 * S, color: C.muted, lineHeight: 1.65,
        textAlign: "center", marginBottom: 36 * S, maxWidth: 560 * S,
      }}>
        理解 Token，就能更聰明地使用 AI
      </div>

      {/* Topic pills */}
      <div style={{ ...pills, display: "flex", gap: 12 * S }}>
        {topics.map((t, i) => (
          <div key={i} style={{
            padding: `${7 * S}px ${18 * S}px`,
            background: t.bg, border: `1px solid ${t.border}`,
            borderRadius: 99,
            fontFamily: "'Space Mono', monospace",
            fontSize: 11 * S, color: t.color, letterSpacing: "0.03em",
          }}>{t.label}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 1 — Token (450–3300f, local 0–2850f)
// ══════════════════════════════════════════════════════════════════════════

// TokenBlocks: colored squares fading in one by one
function TokenBlocks({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const blocks = [
    { color: C.primary },
    { color: C.yellow  },
    { color: C.primary },
    { color: C.primary },
    { color: C.yellow  },
    { color: C.primary },
    { color: C.yellow  },
    { color: C.primary },
  ];

  const blockSize = 36 * S;
  const gap = 10 * S;
  const labelFontSize = 9 * S;

  return (
    <div style={{
      display: "flex",
      gap,
      alignItems: "flex-start",
    }}>
      {blocks.map((b, i) => {
        const blockStart = startFrame + i * 8;
        const localF = Math.max(0, frame - blockStart);
        const p = spring({ frame: localF, fps, config: { damping: 18, stiffness: 110 } });
        const opacity = interpolate(localF, [0, 12], [0, 1], clamp);
        const scale = interpolate(p, [0, 1], [0.4, 1], clamp);
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S }}>
            <div style={{
              width: blockSize,
              height: blockSize,
              background: b.color,
              borderRadius: 6 * S,
              boxShadow: `0 0 ${10 * S}px ${b.color}66`,
              opacity,
              transform: `scale(${scale})`,
            }} />
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: labelFontSize,
              color: b.color,
              opacity,
              letterSpacing: "0.05em",
            }}>T</span>
          </div>
        );
      })}
    </div>
  );
}

// CompareTable
function CompareTable({ startFrame }: { startFrame: number }) {
  const a = useFadeUp(startFrame);
  const highlight = useFocusHighlight(startFrame + 30, 90);

  const rows = [
    { lang: "英文", example: "hello",         tokens: "1",   color: C.primary },
    { lang: "英文", example: "unfortunately",  tokens: "2",   color: C.yellow  },
    { lang: "中文", example: "中文字",          tokens: "1–2", color: C.primary },
  ];

  return (
    <div style={{ ...a, marginBottom: 14 * S }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 14 * S,
        overflow: "hidden",
        ...highlight,
      }}>
        {/* Header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr 1fr",
          background: C.primaryLight,
          borderBottom: `1px solid ${C.primaryBorder}`,
          padding: `${10 * S}px ${16 * S}px`,
        }}>
          {["語言", "範例", "Token 數"].map((h, i) => (
            <div key={i} style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 10 * S,
              color: C.primary,
              letterSpacing: "0.06em",
              textAlign: i === 2 ? "center" as const : "left" as const,
            }}>{h}</div>
          ))}
        </div>
        {/* Rows */}
        {rows.map((r, i) => (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr 1fr",
            padding: `${10 * S}px ${16 * S}px`,
            borderBottom: i < rows.length - 1 ? `1px solid rgba(124,255,178,0.06)` : "none",
            alignItems: "center",
          }}>
            <div style={{ fontSize: 12 * S, color: C.muted, fontFamily: "'Noto Sans TC', sans-serif" }}>{r.lang}</div>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 13 * S,
              color: C.text,
              letterSpacing: "0.02em",
            }}>{r.example}</div>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 14 * S,
              color: r.color,
              textAlign: "center" as const,
              fontWeight: 700,
            }}>{r.tokens}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// EstimateCard
function EstimateCard({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localF = Math.max(0, frame - startFrame);
  const p = spring({ frame: localF, fps, config: { damping: 20, stiffness: 85 } });
  const opacity = interpolate(localF, [0, 20], [0, 1], clamp);
  const translateY = interpolate(p, [0, 1], [30 * S, 0], clamp);
  const glow = interpolate(localF, [0, 40, 90], [0, 1, 0.4], clamp);

  return (
    <div style={{
      opacity,
      transform: `translateY(${translateY}px)`,
      marginBottom: 14 * S,
    }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 14 * S,
        padding: `${20 * S}px ${24 * S}px`,
        display: "flex",
        alignItems: "center",
        gap: 24 * S,
        boxShadow: `0 0 ${Math.round(glow * 32 * S)}px rgba(124,255,178,${(glow * 0.18).toFixed(2)})`,
      }}>
        {/* Big number */}
        <div style={{ flexShrink: 0, textAlign: "center" as const }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 48 * S,
            fontWeight: 700,
            color: C.primary,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            textShadow: `0 0 ${16 * S}px rgba(124,255,178,0.5)`,
          }}>1,000</div>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11 * S,
            color: C.muted,
            letterSpacing: "0.07em",
            marginTop: 4 * S,
            textTransform: "uppercase" as const,
          }}>Token</div>
        </div>

        {/* Divider */}
        <div style={{
          width: 2 * S,
          height: 60 * S,
          background: C.primaryBorder,
          borderRadius: 99,
          flexShrink: 0,
        }} />

        {/* Formula */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10 * S,
            color: C.muted,
            letterSpacing: "0.06em",
            marginBottom: 8 * S,
            textTransform: "uppercase" as const,
          }}>約等於</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 16 * S,
            color: C.text,
            lineHeight: 1.8,
          }}>
            <span style={{ color: C.yellow, fontWeight: 700 }}>750</span>
            <span style={{ color: C.muted }}> 英文單字</span>
            <br />
            <span style={{ color: C.primary, fontWeight: 700 }}>500</span>
            <span style={{ color: C.muted }}> 中文字</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// TokenAnalogyBox
function TokenAnalogyBox({ startFrame }: { startFrame: number }) {
  const a = useFadeIn(startFrame);
  return (
    <div style={{ ...a }}>
      <div style={{
        background: C.primaryLight,
        borderLeft: `${4 * S}px solid ${C.primary}`,
        borderRadius: `0 ${14 * S}px ${14 * S}px 0`,
        padding: `${16 * S}px ${20 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10 * S,
          color: C.primary,
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
          marginBottom: 8 * S,
        }}>積木比喻</div>
        <p style={{
          fontSize: 14 * S, color: "#c8ffe0", lineHeight: 1.75, margin: 0,
          fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
        }}>
          AI 不是一個字一個字讀，而是把文字拆成<strong style={{ color: C.primary }}>積木</strong>單位。中文每個字通常就是 1–2 個積木，英文一個長詞可能拆成多塊。積木越多，AI 需要消耗的「算力預算」就越大。
        </p>
      </div>
    </div>
  );
}

// TokenBlocksRow wrapper with label
function TokenBlocksRow({ startFrame }: { startFrame: number }) {
  const labelA = useFadeIn(startFrame);
  const arrowA = useFadeIn(startFrame + 60);

  return (
    <div style={{ marginBottom: 14 * S }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 14 * S,
        padding: `${18 * S}px ${22 * S}px`,
      }}>
        {/* Label */}
        <div style={{
          ...labelA,
          fontFamily: "'Space Mono', monospace",
          fontSize: 10 * S,
          color: C.primary,
          textTransform: "uppercase" as const,
          letterSpacing: "0.07em",
          marginBottom: 14 * S,
        }}>文字 → Token 積木</div>

        {/* Source text */}
        <div style={{
          ...labelA,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 14 * S,
          color: C.muted,
          marginBottom: 12 * S,
          letterSpacing: "0.02em",
        }}>
          "Hello, 世界！ Unfortunately..."
        </div>

        {/* Arrow */}
        <div style={{
          ...arrowA,
          fontFamily: "'Space Mono', monospace",
          fontSize: 14 * S,
          color: C.primary,
          marginBottom: 12 * S,
        }}>↓ 拆解</div>

        {/* Blocks */}
        <TokenBlocks startFrame={startFrame + 60} />
      </div>
    </div>
  );
}

function TokenScene() {
  // VTT-driven local frames (global − 810):
  // 0:35.5→255 TokenBlocks | 0:42.5→465 AnalogyBox | 0:51.5→735 CompareTable | 1:24.5→1725 EstimateCard
  //
  // Subtitle safe zone rule: early elements must exit DOM before EstimateCard enters,
  // so total stacked height never exceeds maxHeight = H - contentTop - SUBTITLE_SAFE.
  // Fade out → remove from DOM: TokenBlocksRow at 1000–1100, TokenAnalogyBox at 1150–1250.
  const frame = useCurrentFrame();

  const showBlocks = frame < 1100;
  const blocksOpacity = frame > 1000 ? interpolate(frame, [1000, 1100], [1, 0], clamp) : 1;

  const showAnalogy = frame < 1250;
  const analogyOpacity = frame > 1150 ? interpolate(frame, [1150, 1250], [1, 0], clamp) : 1;

  return (
    <ContentColumn>
      <SectionBadge num="01" label="Token 是什麼" />
      {showBlocks && (
        <div style={{ opacity: blocksOpacity }}>
          <TokenBlocksRow startFrame={255} />
        </div>
      )}
      {showAnalogy && (
        <div style={{ opacity: analogyOpacity }}>
          <TokenAnalogyBox startFrame={465} />
        </div>
      )}
      <CompareTable startFrame={735} />
      <EstimateCard startFrame={1725} />
    </ContentColumn>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 2 — Context Window (3300–6300f, local 0–3000f)
// ══════════════════════════════════════════════════════════════════════════

// DeskViz — pure CSS "桌面" metaphor
function DeskViz({ startFrame }: { startFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localF = Math.max(0, frame - startFrame);
  const p = spring({ frame: localF, fps, config: { damping: 22, stiffness: 80 } });
  const opacity = interpolate(localF, [0, 20], [0, 1], clamp);
  const scaleX = interpolate(p, [0, 1], [0.6, 1], clamp);

  // The glowing edge pulses
  const edgeGlow = 0.4 + 0.35 * Math.sin(frame * 0.12);

  const deskH = 80 * S;
  const paperW = 150 * S;
  const paperH = 50 * S;
  const papers = [
    { rotate: "-2deg", left: 0 * S,   color: "#1a1a1a", border: "rgba(124,255,178,0.15)" },
    { rotate: "1deg",  left: 170 * S, color: "#181818", border: "rgba(124,255,178,0.12)" },
    { rotate: "-1deg", left: 340 * S, color: "#1a1a1a", border: "rgba(124,255,178,0.15)" },
    { rotate: "2deg",  left: 510 * S, color: "#181818", border: "rgba(124,255,178,0.12)" },
    { rotate: "-3deg", left: 630 * S, color: "#1d1d1d", border: `rgba(255,107,107,${edgeGlow})` },
  ];

  return (
    <div style={{ opacity, marginBottom: 16 * S }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 14 * S,
        padding: `${18 * S}px ${22 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10 * S,
          color: C.primary,
          textTransform: "uppercase" as const,
          letterSpacing: "0.07em",
          marginBottom: 14 * S,
        }}>桌面 = 上下文視窗</div>

        {/* Desk rectangle */}
        <div style={{
          position: "relative",
          width: "100%",
          height: deskH,
          background: "#0d0d0d",
          border: `${2 * S}px solid rgba(124,255,178,0.25)`,
          borderRadius: 8 * S,
          overflow: "hidden",
          transform: `scaleX(${scaleX})`,
          transformOrigin: "left center",
          boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.05)`,
        }}>
          {/* Papers on desk */}
          {papers.map((paper, i) => {
            const paperStart = startFrame + 15 + i * 6;
            const pLocalF = Math.max(0, frame - paperStart);
            const pSpring = spring({ frame: pLocalF, fps, config: { damping: 20, stiffness: 100 } });
            const pOpacity = interpolate(pLocalF, [0, 10], [0, 1], clamp);
            const pY = interpolate(pSpring, [0, 1], [-paperH, (deskH - paperH) / 2], clamp);

            // Last paper hangs off the edge
            const isLast = i === papers.length - 1;
            return (
              <div key={i} style={{
                position: "absolute",
                left: paper.left,
                top: pY,
                width: paperW,
                height: paperH,
                background: paper.color,
                border: `${1 * S}px solid ${paper.border}`,
                borderRadius: 5 * S,
                transform: `rotate(${paper.rotate})`,
                opacity: pOpacity,
                boxShadow: isLast
                  ? `0 0 ${Math.round(edgeGlow * 20 * S)}px rgba(255,107,107,${edgeGlow * 0.6})`
                  : undefined,
              }}>
                {/* Paper lines */}
                {[0.3, 0.55, 0.78].map((yFrac, li) => (
                  <div key={li} style={{
                    position: "absolute",
                    left: 8 * S,
                    right: 8 * S,
                    top: `${yFrac * 100}%`,
                    height: 1.5 * S,
                    background: isLast ? "rgba(255,107,107,0.3)" : "rgba(255,255,255,0.07)",
                    borderRadius: 99,
                  }} />
                ))}
              </div>
            );
          })}

          {/* Right edge overflow indicator */}
          <div style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 20 * S,
            background: `linear-gradient(to right, transparent, rgba(255,107,107,${edgeGlow * 0.25}))`,
          }} />
        </div>

        {/* Caption */}
        <div style={{
          marginTop: 8 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 11 * S,
          color: C.muted,
          display: "flex",
          justifyContent: "space-between",
        }}>
          <span>← 視窗起點</span>
          <span style={{ color: "rgba(255,107,107,0.7)" }}>超出視窗 → 被推掉 →</span>
        </div>
      </div>
    </div>
  );
}

// SituationCards
function SituationCards({ startFrame }: { startFrame: number }) {
  const situations = [
    {
      icon: "💬",
      title: "聊久忘記",
      desc: "對話越長，越早說的內容就越可能超出視窗，AI 真的不記得了",
      color: C.primary,
      bg: C.primaryLight,
      border: C.primaryBorder,
      delay: 0,
    },
    {
      icon: "📄",
      title: "長文亂答",
      desc: "貼入超長文章時，視窗快滿，前面的問題可能被後面的文章擠掉",
      color: C.yellow,
      bg: C.yellowLight,
      border: C.yellowBorder,
      delay: 390,  // 2:35.5 - 2:22.5 = 13s × 30
    },
    {
      icon: "🔄",
      title: "新對話歸零",
      desc: "每次開新對話就是全新桌面，上次談的事 AI 完全不知道",
      color: C.red,
      bg: "rgba(255,107,107,0.07)",
      border: "rgba(255,107,107,0.2)",
      delay: 690,  // 2:45.5 - 2:22.5 = 23s × 30
    },
  ];

  return (
    <div style={{ display: "flex", gap: 12 * S, marginBottom: 14 * S }}>
      {situations.map((s, i) => {
        const a = useFadeUp(startFrame + s.delay);
        return (
          <div key={i} style={{ ...a, flex: 1 }}>
            <div style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              borderRadius: 14 * S,
              padding: `${16 * S}px ${14 * S}px`,
              height: "100%",
            }}>
              <div style={{
                fontSize: 24 * S,
                marginBottom: 10 * S,
                lineHeight: 1,
              }}>{s.icon}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 15 * S,
                fontWeight: 700,
                color: s.color,
                marginBottom: 8 * S,
                lineHeight: 1.3,
              }}>{s.title}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 12 * S,
                color: C.muted,
                lineHeight: 1.7,
              }}>{s.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContextScene() {
  // VTT-driven local frames (global − 2925):
  // 1:47.5→300 DeskViz | 2:22.5→1350 SituationCards | 2:56.5→2370 AnalogyBox
  return (
    <ContentColumn>
      <SectionBadge num="02" label="上下文視窗" />
      <DeskViz startFrame={300} />
      <SituationCards startFrame={1350} />
      <AnalogyBox label="核心觀念" delay={2370}>
        AI <strong style={{ color: C.primary }}>沒有長期記憶</strong>，只有當下看得到的那個視窗。每次對話都是全新的桌面，它只能看到這次你放上來的東西。
      </AnalogyBox>
    </ContentColumn>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 3 — Tips (6300–8930f, local 0–2630f)
// ══════════════════════════════════════════════════════════════════════════

interface StepData {
  num: string;
  title: string;
  desc: string;
  delay: number;
  color: string;
  bg: string;
  border: string;
}

function StepCard({ step }: { step: StepData }) {
  const a = useFadeUp(step.delay);
  return (
    <div style={{ ...a, marginBottom: 6 * S }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 14 * S,
        padding: `${10 * S}px ${16 * S}px`,
        display: "flex",
        gap: 14 * S,
        alignItems: "flex-start",
      }}>
        {/* Number circle */}
        <div style={{
          width: 38 * S,
          height: 38 * S,
          borderRadius: "50%",
          background: step.bg,
          border: `${2 * S}px solid ${step.border}`,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Space Mono', monospace",
          fontSize: 14 * S,
          fontWeight: 700,
          color: step.color,
          boxShadow: `0 0 ${10 * S}px ${step.border}`,
        }}>{step.num}</div>

        {/* Text */}
        <div style={{ flex: 1, paddingTop: 2 * S }}>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 18 * S,
            fontWeight: 700,
            color: C.text,
            marginBottom: 4 * S,
            lineHeight: 1.3,
          }}>{step.title}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 12 * S,
            color: C.muted,
            lineHeight: 1.6,
          }}>{step.desc}</div>
        </div>
      </div>
    </div>
  );
}

function TipsScene() {
  // VTT-driven local frames (global − 5565):
  // 3:13.5→240 step1 | 3:33.5→840 step2 | 3:49.5→1320 step3 | 4:03.5→1740 step4 | 4:20.5→2250 analogy
  const steps: StepData[] = [
    {
      num: "01",
      title: "重要的事放後面",
      desc: "關鍵資訊在問題前再提，比放開頭更可靠——視窗後段最接近輸出，AI 更容易注意到",
      delay: 240,
      color: C.primary,
      bg: C.primaryLight,
      border: C.primaryBorder,
    },
    {
      num: "02",
      title: "長文只給必要段落",
      desc: "抓重點段落，比貼全文效果更好。Token 有限，精準勝過完整",
      delay: 840,
      color: C.yellow,
      bg: C.yellowLight,
      border: C.yellowBorder,
    },
    {
      num: "03",
      title: "答非所問就開新對話",
      desc: "視窗塞滿的信號——重新整理問題，開新對話再來，效果往往更好",
      delay: 1320,
      color: C.red,
      bg: "rgba(255,107,107,0.07)",
      border: "rgba(255,107,107,0.2)",
    },
    {
      num: "04",
      title: "長任務分段處理",
      desc: "分段給、逐步確認，最後統一整合。比一次塞進去更穩定，也更好控制",
      delay: 1740,
      color: C.primary,
      bg: C.primaryLight,
      border: C.primaryBorder,
    },
  ];

  return (
    <ContentColumn>
      <SectionBadge num="03" label="4 個實用技巧" />
      {steps.map((step, i) => (
        <StepCard key={i} step={step} />
      ))}
      {/* AnalogyBox removed: delay=2250 == scene duration, never visible. */}
    </ContentColumn>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 4 — Summary (7815–8930f, local 0–1115f)
// VTT: 4:22.5→local60 pt1 | 4:29.5→local270 pt2 | 4:38.5→local540 pt3
// ══════════════════════════════════════════════════════════════════════════
function SummaryScene() {
  const frame = useCurrentFrame();
  const dotPulse = 0.5 + 0.5 * Math.sin(frame * 0.12);
  const titleA = useFadeUp(0);

  const points = [
    {
      delay: 60,
      num: "01",
      title: "Token 是什麼",
      body: "AI 讀文字的最小單位。中文字 ≈ 1–2 個 Token。",
      color: C.primary, bg: C.primaryLight, border: C.primaryBorder,
    },
    {
      delay: 270,
      num: "02",
      title: "上下文視窗",
      body: "AI 每次只能看有限的 Token——超過就「忘記」，這才是 AI 遺忘的真正原因。",
      color: C.yellow, bg: C.yellowLight, border: C.yellowBorder,
    },
    {
      delay: 540,
      num: "03",
      title: "聰明使用 AI",
      body: "重要的事放後面、長文拆段給、視窗塞滿就開新對話。",
      color: C.primary, bg: C.primaryLight, border: C.primaryBorder,
    },
  ];

  return (
    <AbsoluteFill style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: `${NAV_H + 20 * S}px ${80 * S}px ${SUBTITLE_SAFE + 20 * S}px`,
    }}>
      {/* Header */}
      <div style={{ ...titleA, textAlign: "center", marginBottom: 32 * S }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 * S,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 99, padding: `${5 * S}px ${18 * S}px`, marginBottom: 16 * S }}>
          <span style={{ display: "inline-block", width: 5 * S, height: 5 * S,
            background: C.primary, borderRadius: "50%",
            boxShadow: `0 0 ${8 * S}px ${C.primary}`, opacity: dotPulse }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
            color: C.primary, letterSpacing: "0.06em" }}>重點整理</span>
        </div>
        <h2 style={{ fontSize: 32 * S, fontWeight: 900, color: C.text,
          letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2 }}>
          今天學了什麼？
        </h2>
      </div>

      {/* Summary points */}
      <div style={{ width: "100%", maxWidth: CONTAINER_W, display: "flex", flexDirection: "column", gap: 12 * S }}>
        {points.map((p) => {
          const a = useFadeUp(p.delay);
          return (
            <div key={p.num} style={{ ...a }}>
              <div style={{
                background: p.bg,
                border: `1px solid ${p.border}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${20 * S}px`,
                display: "flex", gap: 16 * S, alignItems: "center",
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 20 * S, fontWeight: 700, color: p.color,
                  flexShrink: 0, width: 32 * S, textAlign: "center" as const,
                }}>{p.num}</div>
                <div style={{ borderLeft: `2px solid ${p.border}`, paddingLeft: 16 * S, flex: 1 }}>
                  <div style={{ fontSize: 18 * S, fontWeight: 700, color: C.text,
                    marginBottom: 4 * S }}>{p.title}</div>
                  <div style={{ fontSize: 13 * S, color: C.muted, lineHeight: 1.6 }}>{p.body}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Root composition export
// ══════════════════════════════════════════════════════════════════════════
export function VideoComposition_2026_03_30() {
  const frame = useCurrentFrame();
  const sc = SCENES_2026_03_30;

  return (
    <AbsoluteFill style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif" }}>
      <Background />

      <Audio src={staticFile("audio/ai-knowledge-2026-03-30-processed.wav")} volume={1.0} />

      {/* Progress bar */}
      <ProgressBar globalFrame={frame} />

      {/* Scenes */}
      <Sequence from={sc.title.from}   durationInFrames={sc.title.to   - sc.title.from}>
        <TitleScene />
      </Sequence>
      <Sequence from={sc.token.from}   durationInFrames={sc.token.to   - sc.token.from}>
        <TokenScene />
      </Sequence>
      <Sequence from={sc.context.from} durationInFrames={sc.context.to - sc.context.from}>
        <ContextScene />
      </Sequence>
      <Sequence from={sc.tips.from}    durationInFrames={sc.tips.to    - sc.tips.from}>
        <TipsScene />
      </Sequence>
      <Sequence from={sc.summary.from} durationInFrames={sc.summary.to - sc.summary.from}>
        <SummaryScene />
      </Sequence>

      {/* iMessage notification stack — always on top */}
      {ALL_CALLOUTS.map((c, i) => (
        <NotificationCard key={i} c={c} globalFrame={frame} allCallouts={ALL_CALLOUTS} />
      ))}
    </AbsoluteFill>
  );
}
