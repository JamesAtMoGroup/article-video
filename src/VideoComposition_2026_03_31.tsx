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

// ── iMessage constants ──────────────────────────────────────────────────────
const NOTIF_W         = 290 * S;
const NOTIF_TOP       = 12  * S;
const NOTIF_RIGHT     = 20  * S;
const NOTIF_SLOT      = 148 * S;
const NOTIF_SLIDE_H   = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
export const SCENES_2026_03_31 = {
  title:   { from: 0,    to: 1342  },  // 0:00 → 0:44.72
  scene1:  { from: 1342, to: 3545  },  // 0:44.72 → 1:58.16  幻覺是什麼
  scene2:  { from: 3545, to: 6720  },  // 1:58.16 → 3:44.00  為什麼AI會這樣
  scene3:  { from: 6720, to: 9418  },  // 3:44.00 → 5:13.92  那我們怎麼辦
  summary: { from: 9418, to: 10277 },  // 5:13.92 → 5:42.56
} as const;
export const TOTAL_FRAMES_2026_03_31 = 10277;

const CHAPTERS = [
  { label: "今日焦點",       start: 0    },
  { label: "幻覺是什麼",     start: 1342 },
  { label: "為什麼AI會這樣", start: 3545 },
  { label: "那我們怎麼辦",   start: 6720 },
  { label: "重點整理",       start: 9418 },
] as const;

// ── Animation helpers ──────────────────────────────────────────────────────
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function useFadeUp(startFrame: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const p = spring({ frame: f, fps, config: { damping: 22, stiffness: 90 } });
  return {
    opacity:   interpolate(f, [0, 18], [0, 1], clamp),
    transform: `translateY(${interpolate(p, [0, 1], [24 * S, 0], clamp)}px)`,
  };
}

function useFadeIn(startFrame: number) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - startFrame);
  return { opacity: interpolate(f, [0, 24], [0, 1], clamp) };
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
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 12 * S, color: C.muted,
          fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em",
        }}>
          <span>每日 AI 知識庫 · 2026-03-31</span>
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
interface Callout { from: number; to: number; sender: string; text: string; }

// Global frames from visual-spec-2026-03-31.json
const ALL_CALLOUTS: Callout[] = [
  { from: 3223, to: 3450, sender: "親身經歷",  text: "問AI結果發現是假的... 有點傻眼" },
  { from: 6343, to: 6620, sender: "思考題",    text: "什麼類型的問題最容易讓 AI 出錯？" },
  { from: 9022, to: 9240, sender: "新標準",    text: "懂得質疑 AI，才是真正會用 AI 的人" },
  { from: 9295, to: 9418, sender: "思考題",    text: "驗證 AI 輸出，是誰的責任？" },
];

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
            fontSize: 13 * S, fontWeight: 700, color: "rgba(255,255,255,0.92)",
            marginBottom: 2 * S, whiteSpace: "nowrap" as const,
            overflow: "hidden", textOverflow: "ellipsis",
          }}>{c.sender}</div>
          <div style={{
            fontFamily: "-apple-system,'SF Pro Text','PingFang TC',system-ui,sans-serif",
            fontSize: 13 * S, color: "rgba(255,255,255,0.60)",
            lineHeight: 1.45, minHeight: 13 * S * 1.45,
          }}>{displayText}{cursor}</div>
        </div>
      </div>
    </div>
  );
}

// ── Shared layout helpers ──────────────────────────────────────────────────
// scrollUp: when content exceeds maxHeight, animate translateY to reveal bottom
function ContentColumn({ children, scrollUp }: {
  children: React.ReactNode;
  scrollUp?: { at: number; amount: number };
}) {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const contentTop  = NAV_H + 20 * S;
  const contentMaxH = H - contentTop - SUBTITLE_SAFE; // 1590px

  let scrollY = 0;
  if (scrollUp) {
    const scrollF = Math.max(0, frame - scrollUp.at);
    const p = spring({ frame: scrollF, fps, config: { damping: 20, stiffness: 60 } });
    scrollY = interpolate(p, [0, 1], [0, -scrollUp.amount], clamp);
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: contentTop, left: COL_LEFT,
        width: CONTAINER_W, maxHeight: contentMaxH, overflowY: "hidden" as const,
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
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.primary,
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 99, padding: `${3 * S}px ${12 * S}px`,
      }}>{num}</div>
      <h2 style={{
        fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
        fontSize: 22 * S, fontWeight: 700, color: C.text,
        letterSpacing: "-0.01em", margin: 0,
      }}>{label}</h2>
    </div>
  );
}

// ── HighlightPulse ─────────────────────────────────────────────────────────
type PulseColor = "green" | "yellow" | "red";
function HighlightPulse({ delay, text, color = "yellow", sub }: {
  delay: number; text: string; color?: PulseColor; sub?: string;
}) {
  const frame = useCurrentFrame();
  const a = useFadeUp(delay);
  const f = Math.max(0, frame - delay);
  const pulse = 0.5 + 0.5 * Math.sin(f * 0.15);
  const col = color === "green"
    ? { main: C.primary,  light: C.primaryLight,  border: C.primaryBorder }
    : color === "red"
    ? { main: C.red,      light: C.redLight,       border: C.redBorder }
    : { main: C.yellow,   light: C.yellowLight,    border: C.yellowBorder };
  return (
    <div style={{ ...a, marginBottom: 12 * S }}>
      <div style={{
        background: col.light, border: `${1.5 * S}px solid ${col.border}`,
        borderRadius: 14 * S, padding: `${12 * S}px ${18 * S}px`,
        boxShadow: `0 0 ${(6 + pulse * 10) * S}px ${col.main}44`,
      }}>
        <div style={{
          fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
          fontSize: 20 * S, fontWeight: 700, color: col.main,
          lineHeight: 1.5, letterSpacing: "-0.01em",
        }}>{text}</div>
        {sub && <div style={{
          fontFamily: "'Noto Sans TC',sans-serif",
          fontSize: 16 * S, color: C.muted, marginTop: 10 * S, lineHeight: 1.6,
        }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── AnalogyCompare ─────────────────────────────────────────────────────────
function AnalogyCompare({ delay, leftLabel, leftDesc, rightLabel, rightDesc, rightReveal }: {
  delay: number; leftLabel: string; leftDesc: string;
  rightLabel: string; rightDesc: string; rightReveal?: number;
}) {
  const frame = useCurrentFrame();
  const a = useFadeUp(delay);
  const rightF = rightReveal ?? delay;
  const rightOpacity = interpolate(
    Math.max(0, frame - rightF),
    [0, 30], [rightReveal ? 0.2 : 1, 1], clamp,
  );
  return (
    <div style={{ ...a, marginBottom: 14 * S }}>
      <div style={{ display: "flex", gap: 12 * S }}>
        {/* Left card */}
        <div style={{
          flex: 1, background: C.redLight, border: `1px solid ${C.redBorder}`,
          borderRadius: 14 * S, padding: `${14 * S}px ${16 * S}px`,
        }}>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 12 * S,
            color: C.red, letterSpacing: "0.06em", marginBottom: 8 * S,
          }}>{leftLabel}</div>
          <div style={{
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 13 * S, color: C.text, lineHeight: 1.6,
          }}>{leftDesc}</div>
        </div>
        {/* Right card */}
        <div style={{
          flex: 1, opacity: rightOpacity,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 14 * S, padding: `${14 * S}px ${16 * S}px`,
        }}>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 12 * S,
            color: C.primary, letterSpacing: "0.06em", marginBottom: 8 * S,
          }}>{rightLabel}</div>
          <div style={{
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 13 * S, color: C.text, lineHeight: 1.6,
          }}>{rightDesc}</div>
        </div>
      </div>
    </div>
  );
}

// ── CauseEffectArrow ───────────────────────────────────────────────────────
function CauseEffectArrow({ delay, left, right, symbol = "→" }: {
  delay: number; left: string; right: string; symbol?: string;
}) {
  const a = useFadeUp(delay);
  return (
    <div style={{ ...a, marginBottom: 12 * S }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10 * S,
      }}>
        <div style={{
          flex: 1, background: C.surface, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 12 * S, padding: `${10 * S}px ${14 * S}px`,
          fontFamily: "'Noto Sans TC',sans-serif",
          fontSize: 15 * S, color: C.text, lineHeight: 1.5,
        }}>{left}</div>
        <div style={{
          fontFamily: "'Space Mono',monospace",
          fontSize: 18 * S, color: C.primary, flexShrink: 0,
        }}>{symbol}</div>
        <div style={{
          flex: 1, background: C.surface, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 12 * S, padding: `${10 * S}px ${14 * S}px`,
          fontFamily: "'Noto Sans TC',sans-serif",
          fontSize: 15 * S, color: C.text, lineHeight: 1.5,
        }}>{right}</div>
      </div>
    </div>
  );
}

// ── TagsRow ────────────────────────────────────────────────────────────────
function TagsRow({ delay, tags, color = "primary" }: {
  delay: number; tags: string[]; color?: "primary" | "yellow" | "red";
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
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
        const p = spring({ frame: f, fps, config: { damping: 18, stiffness: 110 } });
        const opacity = interpolate(f, [0, 12], [0, 1], clamp);
        const scale   = interpolate(p, [0, 1], [0.7, 1], clamp);
        return (
          <div key={i} style={{
            opacity, transform: `scale(${scale})`,
            background: col.light, border: `1px solid ${col.border}`,
            borderRadius: 99, padding: `${6 * S}px ${14 * S}px`,
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 13 * S, color: col.main, fontWeight: 700,
          }}>{tag}</div>
        );
      })}
    </div>
  );
}

// ── AnalogyBox (reused) ────────────────────────────────────────────────────
function AnalogyBox({ delay, label, children }: {
  delay: number; label: string; children: React.ReactNode;
}) {
  const a = useFadeIn(delay);
  return (
    <div style={{ ...a, marginBottom: 12 * S }}>
      <div style={{
        background: C.primaryLight,
        borderLeft: `${4 * S}px solid ${C.primary}`,
        borderRadius: `0 ${14 * S}px ${14 * S}px 0`,
        padding: `${10 * S}px ${16 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono',monospace", fontSize: 11 * S, color: C.primary,
          textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6 * S,
        }}>{label}</div>
        <p style={{
          fontFamily: "'Noto Sans TC',sans-serif",
          fontSize: 16 * S, color: "#c8ffe0", lineHeight: 1.65, margin: 0,
        }}>{children}</p>
      </div>
    </div>
  );
}

// ── HallucinationTypeCard ──────────────────────────────────────────────────
function HallucinationTypeCard({ delay, num, title, desc, active, color }: {
  delay: number; num: string; title: string; desc: string;
  active: boolean; color: "primary" | "yellow" | "red";
}) {
  const a = useFadeUp(delay);
  const col = color === "yellow"
    ? { main: C.yellow, light: C.yellowLight, border: C.yellowBorder }
    : color === "red"
    ? { main: C.red, light: C.redLight, border: C.redBorder }
    : { main: C.primary, light: C.primaryLight, border: C.primaryBorder };
  return (
    <div style={{ ...a, opacity: (a.opacity as number) * (active ? 1 : 0.38), marginBottom: 10 * S }}>
      <div style={{
        background: active ? col.light : C.surface,
        border: `1px solid ${active ? col.border : "rgba(255,255,255,0.07)"}`,
        borderRadius: 14 * S, padding: `${12 * S}px ${16 * S}px`,
        display: "flex", alignItems: "flex-start", gap: 14 * S,
      }}>
        <div style={{
          fontFamily: "'Space Mono',monospace", fontSize: 18 * S, fontWeight: 700,
          color: active ? col.main : C.muted, flexShrink: 0, width: 28 * S, lineHeight: 1,
          textAlign: "center" as const,
        }}>{num}</div>
        <div style={{ borderLeft: `2px solid ${active ? col.border : "rgba(255,255,255,0.07)"}`, paddingLeft: 14 * S }}>
          <div style={{
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 16 * S, fontWeight: 700,
            color: active ? C.text : C.muted, marginBottom: 5 * S,
          }}>{title}</div>
          <div style={{
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 13 * S, color: C.muted, lineHeight: 1.6,
          }}>{desc}</div>
        </div>
      </div>
    </div>
  );
}

// ── PredictionStepCard ─────────────────────────────────────────────────────
function PredictionStepCard({ delay, num, title, desc }: {
  delay: number; num: string; title: string; desc: string;
}) {
  const a = useFadeUp(delay);
  return (
    <div style={{ ...a, marginBottom: 10 * S }}>
      <div style={{
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 12 * S, padding: `${10 * S}px ${16 * S}px`,
        display: "flex", alignItems: "center", gap: 14 * S,
      }}>
        <div style={{
          fontFamily: "'Space Mono',monospace", fontSize: 18 * S, fontWeight: 700,
          color: C.primary, flexShrink: 0,
        }}>{num}</div>
        <div>
          <div style={{
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 15 * S, fontWeight: 700, color: C.text, marginBottom: 4 * S,
          }}>{title}</div>
          <div style={{
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 13 * S, color: C.muted, lineHeight: 1.55,
          }}>{desc}</div>
        </div>
      </div>
    </div>
  );
}

// ── EstimateCard31 ─────────────────────────────────────────────────────────
function EstimateCard31({ delay }: { delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localF = Math.max(0, frame - delay);
  const p = spring({ frame: localF, fps, config: { damping: 20, stiffness: 85 } });
  const opacity    = interpolate(localF, [0, 20], [0, 1], clamp);
  const translateY = interpolate(p, [0, 1], [30 * S, 0], clamp);
  const glow       = interpolate(localF, [0, 40, 90], [0, 1, 0.4], clamp);

  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)`, marginBottom: 14 * S }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 14 * S, padding: `${18 * S}px ${22 * S}px`,
        display: "flex", alignItems: "center", gap: 22 * S,
        boxShadow: `0 0 ${Math.round(glow * 32 * S)}px rgba(124,255,178,${(glow * 0.18).toFixed(2)})`,
      }}>
        <div style={{ flexShrink: 0, textAlign: "center" as const }}>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 42 * S, fontWeight: 700,
            color: C.primary, lineHeight: 1, letterSpacing: "-0.02em",
            textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.5)`,
          }}>幾千億</div>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 12 * S, color: C.muted,
            letterSpacing: "0.06em", marginTop: 4 * S, textTransform: "uppercase" as const,
          }}>個字</div>
        </div>
        <div style={{
          width: 2 * S, height: 55 * S, background: C.primaryBorder, borderRadius: 99, flexShrink: 0,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 12 * S, color: C.muted,
            letterSpacing: "0.06em", marginBottom: 8 * S, textTransform: "uppercase" as const,
          }}>訓練資料規模</div>
          <div style={{
            fontFamily: "'Noto Sans TC',sans-serif",
            fontSize: 14 * S, color: C.text, lineHeight: 1.7,
          }}>
            學到了什麼詞語<br />通常跟什麼詞語一起出現
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FakeCitationCard ───────────────────────────────────────────────────────
// 事實捏造：looks like a real academic reference, but it doesn't exist
function FakeCitationCard({ delay }: { delay: number }) {
  const a = useFadeUp(delay);
  const frame = useCurrentFrame();
  const warnOpacity = interpolate(Math.max(0, frame - delay - 25), [0, 20], [0, 1], clamp);
  return (
    <div style={{ ...a, marginBottom: 12 * S }}>
      <div style={{
        background: C.surface, border: `1px solid rgba(255,209,102,0.25)`,
        borderRadius: 14 * S, padding: `${14 * S}px ${18 * S}px`,
        position: "relative" as const,
      }}>
        <div style={{
          fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
          color: C.muted, letterSpacing: "0.06em", marginBottom: 12 * S,
        }}>AI 給出的「來源」↓</div>
        <div style={{ fontFamily: "'Noto Sans TC',sans-serif", fontSize: 14 * S, color: C.text, lineHeight: 1.8 }}>
          <span style={{ color: C.yellow, fontWeight: 700 }}>《AI 幻覺與認知偏誤的量化研究》</span>
          <br />
          <span style={{ color: C.muted }}>林峰博士、王曉薇教授 著</span>
          <br />
          <span style={{ color: C.muted }}>台灣大學出版社 · 2023 · ISBN 978-986-XXXX · p.142</span>
        </div>
        <div style={{
          opacity: warnOpacity,
          position: "absolute" as const, top: 14 * S, right: 18 * S,
          background: C.redLight, border: `1px solid ${C.redBorder}`,
          borderRadius: 99, padding: `${4 * S}px ${12 * S}px`,
          fontFamily: "'Space Mono',monospace",
          fontSize: 11 * S, color: C.red, letterSpacing: "0.05em",
        }}>此書不存在</div>
      </div>
    </div>
  );
}

// ── BrokenChain ────────────────────────────────────────────────────────────
// 過度延伸：correct premise → logic breaks → wrong conclusion
function BrokenChain({ delay }: { delay: number }) {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const a = useFadeUp(delay);
  const breakF = Math.max(0, frame - delay - 30);
  const breakP = spring({ frame: breakF, fps, config: { damping: 18, stiffness: 90 } });
  const breakOpacity = interpolate(breakF, [0, 15], [0, 1], clamp);

  const boxStyle = (color: string, bg: string, border: string) => ({
    flex: 1, background: bg, border: `1px solid ${border}`,
    borderRadius: 10 * S, padding: `${12 * S}px ${12 * S}px`,
    fontFamily: "'Noto Sans TC',sans-serif",
    fontSize: 13 * S, color, lineHeight: 1.55, textAlign: "center" as const,
  });

  return (
    <div style={{ ...a, marginBottom: 12 * S }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 14 * S, padding: `${14 * S}px ${18 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
          color: C.muted, letterSpacing: "0.06em", marginBottom: 14 * S,
        }}>過度延伸的邏輯鏈</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 * S }}>
          <div style={boxStyle(C.primary, C.primaryLight, C.primaryBorder)}>
            正確前提 A<br /><span style={{ fontSize: 13 * S, color: C.muted }}>（真實的）</span>
          </div>
          <div style={{
            fontFamily: "'Space Mono',monospace",
            fontSize: 18 * S, color: C.primary, flexShrink: 0,
          }}>→</div>
          <div style={boxStyle(C.yellow, C.yellowLight, C.yellowBorder)}>
            推導 B<br /><span style={{ fontSize: 13 * S, color: C.muted }}>（合理的）</span>
          </div>
          {/* Broken link */}
          <div style={{
            opacity: breakOpacity,
            fontFamily: "'Space Mono',monospace",
            fontSize: 18 * S, color: C.red, flexShrink: 0,
            transform: `rotate(${interpolate(breakP, [0, 1], [0, 15], clamp)}deg)`,
          }}>✗</div>
          <div style={{ ...boxStyle(C.red, C.redLight, C.redBorder), opacity: breakOpacity }}>
            錯誤結論 C<br /><span style={{ fontSize: 13 * S, color: C.muted }}>（AI說得很順）</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TokenPrediction ────────────────────────────────────────────────────────
// 填字接龍：sentence fills in token by token, blank → predicted token springs in
function TokenPrediction({ delay }: { delay: number }) {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const a = useFadeUp(delay);
  const fillStart = delay + 50;
  const fillF = Math.max(0, frame - fillStart);
  const fillP = spring({ frame: fillF, fps, config: { damping: 18, stiffness: 95 } });
  const tokenScale   = interpolate(fillP, [0, 1], [0.4, 1], clamp);
  const tokenOpacity = interpolate(fillF, [0, 10], [0, 1], clamp);
  const blankOpacity = interpolate(fillF, [0, 15], [1, 0], clamp);

  const words = ["台灣", "的", "首都", "是"];

  return (
    <div style={{ ...a, marginBottom: 14 * S }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
          color: C.muted, letterSpacing: "0.06em", marginBottom: 16 * S,
        }}>填字接龍示範 — 語言模型逐字預測</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 * S, flexWrap: "wrap" as const }}>
          {words.map((word, i) => (
            <div key={i} style={{
              background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
              borderRadius: 6 * S, padding: `${6 * S}px ${12 * S}px`,
              fontFamily: "'Noto Sans TC',sans-serif",
              fontSize: 15 * S, color: C.text, fontWeight: 700,
            }}>{word}</div>
          ))}
          {/* Blank slot → predicted token */}
          <div style={{ position: "relative" as const, width: 62 * S, height: 42 * S }}>
            <div style={{
              position: "absolute" as const, inset: 0,
              border: `2px dashed ${C.primaryBorder}`,
              borderRadius: 6 * S, opacity: blankOpacity,
            }} />
            <div style={{
              position: "absolute" as const, inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: C.primary, borderRadius: 6 * S,
              fontFamily: "'Noto Sans TC',sans-serif",
              fontSize: 15 * S, color: C.bg, fontWeight: 900,
              boxShadow: `0 0 ${14 * S}px ${C.primary}88`,
              opacity: tokenOpacity,
              transform: `scale(${tokenScale})`,
            }}>台北</div>
          </div>
          <div style={{
            fontFamily: "'Space Mono',monospace",
            fontSize: 13 * S, color: C.primary, opacity: tokenOpacity,
          }}>← 預測</div>
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC',sans-serif",
          fontSize: 13 * S, color: C.muted, marginTop: 14 * S, lineHeight: 1.6,
        }}>語言模型做的就是這件事——只是規模大到難以想像</div>
      </div>
    </div>
  );
}

// ── ChatBubbleCompare ──────────────────────────────────────────────────────
// 問法對比：side-by-side chat UI showing bad vs good question style
function ChatBubbleCompare({ delay, rightReveal }: { delay: number; rightReveal: number }) {
  const frame = useCurrentFrame();
  const a = useFadeUp(delay);
  const rightOpacity = interpolate(Math.max(0, frame - rightReveal), [0, 20], [0, 1], clamp);

  const bubbleUser = (text: string, color: string, bg: string) => (
    <div style={{
      background: bg, borderRadius: `${8 * S}px ${8 * S}px 2px ${8 * S}px`,
      padding: `${8 * S}px ${12 * S}px`, marginBottom: 10 * S,
      fontFamily: "'Noto Sans TC',sans-serif",
      fontSize: 13 * S, color, lineHeight: 1.6,
    }}>{text}</div>
  );

  const bubbleAI = (text: string) => (
    <div style={{
      background: C.surface, borderRadius: `2px ${8 * S}px ${8 * S}px ${8 * S}px`,
      padding: `${8 * S}px ${12 * S}px`,
      fontFamily: "'Noto Sans TC',sans-serif",
      fontSize: 13 * S, color: C.text, lineHeight: 1.6,
    }}>{text}</div>
  );

  return (
    <div style={{ ...a, marginBottom: 14 * S }}>
      <div style={{ display: "flex", gap: 12 * S }}>
        {/* Left — bad question */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
            color: C.red, letterSpacing: "0.05em", marginBottom: 10 * S,
          }}>❌ 直接問</div>
          <div style={{
            background: C.redLight, border: `1px solid ${C.redBorder}`,
            borderRadius: 14 * S, padding: `${13 * S}px ${14 * S}px`,
          }}>
            {bubbleUser("台灣最大的 AI 公司是哪家？", C.text, "rgba(255,107,107,0.2)")}
            {bubbleAI("台灣最大的 AI 公司是「XX科技」，年營收⋯")}
            <div style={{
              fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
              color: C.red, marginTop: 10 * S,
            }}>↑ 聽起來合理，但可能是幻覺</div>
          </div>
        </div>

        {/* Right — good question */}
        <div style={{ flex: 1, opacity: rightOpacity }}>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
            color: C.primary, letterSpacing: "0.05em", marginBottom: 10 * S,
          }}>✓ 更好的問法</div>
          <div style={{
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 14 * S, padding: `${13 * S}px ${14 * S}px`,
          }}>
            {bubbleUser("你有哪些不確定的資訊請告訴我", C.text, "rgba(124,255,178,0.15)")}
            <div style={{
              background: C.surface, borderRadius: `2px ${8 * S}px ${8 * S}px ${8 * S}px`,
              padding: `${8 * S}px ${12 * S}px`,
              fontFamily: "'Noto Sans TC',sans-serif",
              fontSize: 13 * S, color: C.text, lineHeight: 1.6,
            }}>關於這個問題，<span style={{ color: C.primary, fontWeight: 700 }}>我無法確認</span>最新數據，建議查閱⋯</div>
            <div style={{
              fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
              color: C.primary, marginTop: 10 * S,
            }}>↑ 模型承認不確定性</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 0 — Title (local 0–1342)
// ══════════════════════════════════════════════════════════════════════════
function TitleScene() {
  const frame = useCurrentFrame();
  const badge  = useFadeUp(0);
  const title  = useFadeUp(10);
  const sub    = useFadeUp(22);
  const pills  = useFadeUp(35);
  const dotPulse = 0.5 + 0.5 * Math.sin(frame * 0.15);

  const topics = [
    { label: "幻覺是什麼",     bg: C.primaryLight, border: C.primaryBorder, color: C.primary },
    { label: "為什麼AI會這樣", bg: C.yellowLight,  border: C.yellowBorder,  color: C.yellow  },
    { label: "那我們怎麼辦",   bg: C.primaryLight, border: C.primaryBorder, color: C.primary },
  ];

  return (
    <AbsoluteFill style={{
      fontFamily: "'Noto Sans TC','PingFang TC',sans-serif",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: `${NAV_H}px ${80 * S}px ${SUBTITLE_SAFE + 20 * S}px`,
    }}>
      {/* Date badge */}
      <div style={{ ...badge, marginBottom: 18 * S }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8 * S,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 99, padding: `${5 * S}px ${16 * S}px`,
        }}>
          <span style={{
            display: "inline-block", width: 5 * S, height: 5 * S,
            background: C.primary, borderRadius: "50%",
            boxShadow: `0 0 ${8 * S}px ${C.primary}`, opacity: dotPulse,
          }} />
          <span style={{
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
            color: C.muted, letterSpacing: "0.05em",
          }}>2026-03-31 · 每日 AI 知識庫</span>
        </div>
      </div>

      {/* Headline */}
      <div style={{ ...title, textAlign: "center", marginBottom: 16 * S }}>
        <h1 style={{
          fontSize: 50 * S, fontWeight: 900, color: C.text,
          lineHeight: 1.25, letterSpacing: "-0.02em", margin: 0,
        }}>
          AI 為什麼會幻覺？
          <br />
          <span style={{ color: C.primary }}>它不是在說謊</span>
        </h1>
      </div>

      {/* Subtitle */}
      <div style={{
        ...sub, fontSize: 16 * S, color: C.muted, lineHeight: 1.65,
        textAlign: "center", marginBottom: 36 * S, maxWidth: 560 * S,
      }}>
        理解 AI 幻覺，是使用 AI 最重要的素養之一
      </div>

      {/* Topic pills */}
      <div style={{ ...pills, display: "flex", gap: 12 * S }}>
        {topics.map((t, i) => (
          <div key={i} style={{
            padding: `${7 * S}px ${18 * S}px`,
            background: t.bg, border: `1px solid ${t.border}`, borderRadius: 99,
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S,
            color: t.color, letterSpacing: "0.03em",
          }}>{t.label}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 1 — 幻覺是什麼 (global 1342–3545, local 0–2203)
// Phase A: local 0–550  (SectionBadge + definition + analogy)
//   A_FADE_START=450, A_REMOVE=550
// Phase B: local 600+   (三種類型 step cards)
//   Step1=650, Step2=1092, Step3=1392, AnalogyBox=1615
// ══════════════════════════════════════════════════════════════════════════
function Scene1() {
  const frame = useCurrentFrame();

  // A_FADE_START aligned to VTT: Phase A analogy ends at t≈01:03.920 (local 576)
  const A_FADE_START = 560;
  const A_REMOVE     = 640;
  const showA  = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const showB = frame >= 660;

  // Step active states for 3-type cards (VTT-aligned)
  const step1Active = frame >= 660;   // "第一 是事實捏造" local ≈650
  const step2Active = frame >= 1092;  // "第二種是時間錯亂" local ≈1091 ✓
  const step3Active = frame >= 1460;  // "第三種是過度延伸" local ≈1471

  // Always call hooks at top level — never inside conditionals
  const phaseBHeaderA = useFadeIn(650);

  return (
    // scrollUp: BrokenChain overflows ~210px when step3Active, scroll up 230px starting at frame 1460
    <ContentColumn scrollUp={{ at: 1460, amount: 230 }}>
      {/* Phase A */}
      {showA && (
        <div style={{ opacity: aOpacity }}>
          <SectionBadge num="01" label="幻覺是什麼" />
          <HighlightPulse
            delay={69}
            text="AI 不是故意騙你，它沒有壞意圖"
            color="green"
            sub="這個詞選得很妙——就像在霧中看到幻象，不是惡意，而是感知出了問題"
          />
          <AnalogyBox delay={247} label="比喻">
            它更像是一個在霧中走路的人，看到模糊的輪廓，就有自信的說那是一棵樹——但走近一看，什麼都沒有。
          </AnalogyBox>
        </div>
      )}

      {/* Phase B — 三種形態，purpose-built visuals */}
      {showB && (
        <div>
          <div style={{
            fontFamily: "'Space Mono',monospace", fontSize: 11 * S, color: C.muted,
            letterSpacing: "0.06em", marginBottom: 12 * S,
            ...phaseBHeaderA,
          }}>幻覺常見的三種形態</div>

          {/* 01 事實捏造 — fake citation card */}
          <HallucinationTypeCard
            delay={670} num="01" title="事實捏造" color="primary"
            desc="格式看起來完全正確，讓你完全不會懷疑"
            active={step1Active && !step2Active}
          />
          {step1Active && <FakeCitationCard delay={720} />}

          {/* 02 時間錯亂 */}
          {step2Active && (
            <HallucinationTypeCard
              delay={1092} num="02" title="時間錯亂" color="yellow"
              desc="把不同時期發生的事情混在一起，或說出不符合現實時間點的資訊"
              active={step2Active && !step3Active}
            />
          )}

          {/* 03 過度延伸 — broken logic chain */}
          {step3Active && (
            <HallucinationTypeCard
              delay={1460} num="03" title="過度延伸" color="red"
              desc="從正確前提推導出錯誤結論——邏輯鏈中間斷掉，AI 說得很順"
              active={step3Active}
            />
          )}
          {step3Active && <BrokenChain delay={1520} />}
        </div>
      )}
    </ContentColumn>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 2 — 為什麼AI會這樣 (global 3545–6720, local 0–3175)
// Phase A: local 0–1100  (SectionBadge + 搜尋引擎vs語言模型 + 逐字預測3步驟 + 填字接龍)
//   A_FADE_START=1000, A_REMOVE=1100
// Phase B: local 1200+   (幾千億 + 3能力 + 限制 + 預測≠事實)
// ══════════════════════════════════════════════════════════════════════════
function Scene2() {
  const frame = useCurrentFrame();

  // A_FADE_START aligned to VTT: Phase A (TokenPrediction) ends at t≈02:32.160 (local 1020)
  // Phase B starts at t≈02:37.520 (local 1181)
  const A_FADE_START = 1050;
  const A_REMOVE     = 1140;
  const showA    = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const showB = frame >= 1160;

  return (
    <ContentColumn>
      {/* Phase A */}
      {showA && (
        <div style={{ opacity: aOpacity }}>
          <SectionBadge num="02" label="為什麼AI會這樣" />
          <AnalogyCompare
            delay={146}
            leftLabel="❌ 常見誤解"
            leftDesc="很多人以為 AI 像搜尋引擎，去某個資料庫查答案"
            rightLabel="✓ 實際機制"
            rightDesc="語言模型做的是根據你說的話，預測下一個最有可能出現的字"
            rightReveal={321}
          />
          <PredictionStepCard delay={437} num="①" title="輸入：你說的話 + 前文" desc="根據目前所有的文字內容" />
          <PredictionStepCard delay={549} num="②" title="預測：下一個最可能的字" desc="計算下一個字的概率分佈" />
          <PredictionStepCard delay={624} num="③" title="逐字生成輸出" desc="然後一個字一個字接著生成" />
          {/* TokenPrediction: interactive demo of the filling-in mechanic */}
          <TokenPrediction delay={720} />
        </div>
      )}

      {/* Phase B */}
      {showB && (
        <div>
          <EstimateCard31 delay={1181} />
          <TagsRow delay={1423} tags={["寫文章", "寫程式", "做翻譯"]} color="primary" />
          <HighlightPulse
            delay={1615}
            text="但它有一個根本的限制"
            color="yellow"
            sub="預測聽起來對的東西，不等於知道實際上對的東西"
          />
          <CauseEffectArrow
            delay={1800}
            left="預測聽起來對的答案"
            right="知道實際上對的東西"
            symbol="≠"
          />
          <CauseEffectArrow
            delay={1934}
            left="訓練資料裡很少出現 / 有矛盾的問題"
            right="模型用聽起來合理的方式把答案填滿"
          />
          <AnalogyBox delay={2551} label="結論">
            它不是在說謊，只是在做它被訓練做的事——生成看起來像對的答案的輸出。
          </AnalogyBox>
        </div>
      )}
    </ContentColumn>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 3 — 那我們怎麼辦 (global 6720–9418, local 0–2698)
// Phase A: local 0–1250  (SectionBadge + Step1高風險 + Step2低風險)
//   A_FADE_START=1150, A_REMOVE=1250
// Phase B: local 1350+   (Step3問法 + 問法對比 + 智慧總結)
// ══════════════════════════════════════════════════════════════════════════
function Scene3() {
  const frame = useCurrentFrame();

  // A_FADE_START aligned to VTT: Phase A (低風險任務) ends at t≈04:25.360 (local 1241)
  // Phase B starts at t≈04:27.520 (local 1306) "第三 問法也有差"
  const A_FADE_START = 1235;
  const A_REMOVE     = 1310;
  const showA    = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const showB = frame >= 1330;

  return (
    <ContentColumn>
      {/* Phase A */}
      {showA && (
        <div style={{ opacity: aOpacity }}>
          <SectionBadge num="03" label="那我們怎麼辦" />
          <HighlightPulse
            delay={0}
            text="知道幻覺的存在不代表要停用 AI，而是要用得更聰明"
            color="green"
          />
          <HighlightPulse
            delay={223}
            text="① 高風險任務要驗證"
            color="red"
            sub="法律條文、醫療建議、歷史事件、統計數字——AI 的回答一定要去原始資料核對，不能直接引用"
          />
          <TagsRow
            delay={326}
            tags={["法律條文", "醫療建議", "歷史事件", "統計數字"]}
            color="red"
          />
          <HighlightPulse
            delay={727}
            text="② 低風險任務放心用"
            color="green"
            sub="想法發散、文章草稿、程式架構、解釋概念——就算有小錯誤，你也很容易在過程中發現並修正"
          />
          <TagsRow
            delay={850}
            tags={["想法發散", "文章草稿", "程式架構", "解釋概念"]}
            color="primary"
          />
        </div>
      )}

      {/* Phase B */}
      {showB && (
        <div>
          <HighlightPulse
            delay={1330}
            text="③ 問法也有差"
            color="yellow"
          />
          {/* ChatBubbleCompare — actual chat UI, much more visual than abstract cards */}
          <ChatBubbleCompare delay={1306} rightReveal={1543} />
          <AnalogyBox delay={1853} label="核心素養">
            好的提問可以讓幻覺少一點。理解幻覺，是使用 AI 最重要的素養之一。
          </AnalogyBox>
          <AnalogyCompare
            delay={2076}
            leftLabel="❌ 盲目信任"
            leftDesc="直接把 AI 的答案用在報告或工作上，不加驗證"
            rightLabel="✓ 懂得質疑"
            rightDesc="會用 AI 的人，是懂得什麼時候要質疑它的人"
          />
        </div>
      )}
    </ContentColumn>
  );
}

// ── SummaryCard (own component so hooks are at top level, not in .map()) ──
function SummaryCard({ delay, num, title, body, color, bg, border }: {
  delay: number; num: string; title: string; body: string;
  color: string; bg: string; border: string;
}) {
  const a = useFadeUp(delay);
  return (
    <div style={{ ...a }}>
      <div style={{
        background: bg, border: `1px solid ${border}`,
        borderRadius: 14 * S, padding: `${13 * S}px ${18 * S}px`,
        display: "flex", gap: 14 * S, alignItems: "center",
      }}>
        <div style={{
          fontFamily: "'Space Mono',monospace",
          fontSize: 18 * S, fontWeight: 700, color,
          flexShrink: 0, width: 28 * S, textAlign: "center" as const,
        }}>{num}</div>
        <div style={{ borderLeft: `2px solid ${border}`, paddingLeft: 14 * S, flex: 1 }}>
          <div style={{ fontSize: 15 * S, fontWeight: 700, color: C.text, marginBottom: 4 * S }}>{title}</div>
          <div style={{ fontSize: 13 * S, color: C.muted, lineHeight: 1.55 }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Summary (global 9418–10277, local 0–859)
// VTT: 5:13.92→0  5:15.76→55  5:21.84→237  5:28.96→451
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
      {/* Header */}
      <div style={{ ...titleA, textAlign: "center", marginBottom: 28 * S }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10 * S,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
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
          fontSize: 30 * S, fontWeight: 900, color: C.text,
          letterSpacing: "-0.02em", margin: 0, lineHeight: 1.2,
        }}>今天學了什麼？</h2>
      </div>

      {/* Summary cards — each in its own component to satisfy Rules of Hooks */}
      <div style={{ width: "100%", maxWidth: CONTAINER_W, display: "flex", flexDirection: "column", gap: 12 * S }}>
        <SummaryCard delay={55}  num="01"
          title="AI幻覺不是在騙你"
          body="是它預測文字的本質導致的——生成聽起來像對的輸出，而不是查找事實"
          color={C.primary} bg={C.primaryLight} border={C.primaryBorder}
        />
        <SummaryCard delay={237} num="02"
          title="語言模型逐字預測，沒有查找事實的能力"
          body="訓練資料稀少或有矛盾時，模型會用聽起來合理的方式把答案填滿——哪怕內容是假的"
          color={C.yellow} bg={C.yellowLight} border={C.yellowBorder}
        />
        <SummaryCard delay={451} num="03"
          title="高風險驗證 · 低風險放心用 · 好問法減少幻覺"
          body="懂得什麼時候要質疑 AI，才是真正會用 AI 的人"
          color={C.primary} bg={C.primaryLight} border={C.primaryBorder}
        />
      </div>
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Root composition export
// ══════════════════════════════════════════════════════════════════════════
export function VideoComposition_2026_03_31() {
  const frame = useCurrentFrame();
  const sc = SCENES_2026_03_31;

  return (
    <AbsoluteFill style={{ fontFamily: "'Noto Sans TC','PingFang TC',sans-serif" }}>
      <Background />

      <Audio src={staticFile("audio/ai-knowledge-2026-03-31-processed.wav")} volume={1.0} />

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
