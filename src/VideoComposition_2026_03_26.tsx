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
const S = 3;                              // multiply all px values by this
const W = 1280 * S;                       // 3840
const NAV_H = 50 * S;                     // 150px progress bar
const CONTAINER_W = 640 * S;             // 1920px content column
const COL_LEFT = (W - CONTAINER_W) / 2; // 960px

// ── Design tokens — Vibe Coding style ─────────────────────────────────────
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
const NOTIF_W          = 290 * S;   // 870px  card width
const NOTIF_TOP        = 12  * S;   // 36px   gap below nav bar
const NOTIF_RIGHT      = 20  * S;   // 60px   from right edge
const NOTIF_SLOT       = 148 * S;   // 444px  vertical slot per notification
const NOTIF_SLIDE_H    = 110 * S;   // 330px  slide-in distance from top
const FADE_OUT_FRAMES  = 50;        // frames to linger after `to` (slow fade)

// ── Scenes / timing (aligned to TTS audio durations) ──────────────────────
export const SCENES_2026_03_26 = {
  title:   { from: 0,    to: 499  }, // 16.6s — ai-26-1.mp3
  agents:  { from: 499,  to: 2567 }, // 68.9s — ai-26-2.mp3
  prod:    { from: 2567, to: 5058 }, // 83.0s — ai-26-3.mp3
  coding:  { from: 5058, to: 7213 }, // 71.8s — ai-26-4.mp3
} as const;
export const TOTAL_FRAMES_2026_03_26 = 7213;

const CHAPTERS = [
  { label: "今日焦點",           start: 0    },
  { label: "AI 代理人接管日常",   start: 499  },
  { label: "生產力悖論",         start: 2567 },
  { label: "Cursor vs Copilot", start: 5058 },
] as const;

// ── Animation helpers ──────────────────────────────────────────────────────
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function fi(frame: number, from: number, to: number, inV = 0, outV = 1) {
  return interpolate(frame, [from, to], [inV, outV], clamp);
}

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
  const slideIn = fi(globalFrame, 0, 15);

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
          <span>每日 AI 知識庫 · 2026-03-26</span>
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

// ── iMessage notification stacking system ──────────────────────────────────
interface Callout {
  from: number; to: number;
  sender: string; text: string;
}

// Callouts with deliberate overlap so stacking is visible
const ALL_CALLOUTS: Callout[] = [
  // Agents scene — overlap frames 400-450
  { from: 1939, to: 2300, sender: "產業觀察",     text: "亞馬遜同步裁員 1.6 萬人" },
  { from: 2329, to: 2560, sender: "AI 未來學院",  text: "AI 開始主動替你執行任務了 🤖" },
  // Productivity scene — overlap frames 665-695
  { from: 4217, to: 4680, sender: "2030 年展望",  text: "AI 淨增 7,800 萬個新職位" },
  { from: 4547, to: 5050, sender: "BCG 研究報告", text: "AI 技能工作者薪資溢價達 56%" },
  // Coding scene — overlap frames 925-950
  { from: 5898, to: 6380, sender: "最新估值",     text: "Cursor 估值達 293 億美元" },
  { from: 6408, to: 7205, sender: "AI 素養提醒",  text: "讀懂 AI 寫的程式才是核心能力" },
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

  // ── Stack push-down from newer notifications ──────────────────────────
  // For each newer callout that has started, spring-animate this card downward
  let totalYPush = 0;
  for (const newer of allCallouts) {
    if (newer.from <= c.from) continue;             // not newer
    if (globalFrame < newer.from) continue;         // hasn't started yet
    const pushF = globalFrame - newer.from;
    const pushP = spring({ frame: pushF, fps, config: { damping: 22, stiffness: 120 } });
    totalYPush += NOTIF_SLOT * pushP;
  }

  // ── Entry: slide down from top ────────────────────────────────────────
  const entryP = spring({ frame: localF, fps, config: { damping: 22, stiffness: 130 } });
  const slideY = interpolate(entryP, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);

  // ── Opacity: fade in → hold → slow fade out ───────────────────────────
  const opacity = interpolate(
    localF,
    [0, 10, duration, totalVisible],
    [0, 1, 1, 0],
    clamp,
  );

  // ── Stack depth fade: deeper cards get dimmer ─────────────────────────
  const stackDepth = totalYPush / NOTIF_SLOT;
  const depthAlpha = interpolate(stackDepth, [0, 1, 2], [1, 0.65, 0.35], clamp);

  // ── Typewriter on message body ─────────────────────────────────────────
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

        {/* Messages app icon */}
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
          {/* CSS speech bubble */}
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

        {/* Text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* App name + timestamp row */}
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

          {/* Sender name */}
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

          {/* Message body — typewriter */}
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

// ── Shared scene helpers (all px × S) ─────────────────────────────────────

function ContentColumn({ children }: { children: React.ReactNode }) {
  return (
    <AbsoluteFill style={{ paddingTop: NAV_H, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: NAV_H + 20 * S, left: COL_LEFT, width: CONTAINER_W }}>
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

function Card({ children, delay }: { children: React.ReactNode; delay: number }) {
  const a = useFadeUp(delay);
  return (
    <div style={{ ...a, marginBottom: 14 * S }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 14 * S,
        padding: `${18 * S}px ${22 * S}px`,
      }}>{children}</div>
    </div>
  );
}

function CardLabel({ children, color = C.primary }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: 10 * S,
      color,
      textTransform: "uppercase" as const,
      letterSpacing: "0.07em",
      marginBottom: 8 * S,
    }}>{children}</div>
  );
}

function CardBody({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 15 * S, color: C.muted, lineHeight: 1.75, margin: 0 }}>{children}</p>
  );
}

function AnalogyBox({ label, children, delay }: { label: string; children: React.ReactNode; delay: number }) {
  const a = useFadeUp(delay);
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
        }}>{label}</div>
        <p style={{ fontSize: 14 * S, color: "#c8ffe0", lineHeight: 1.75, margin: 0 }}>{children}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 0 — Title (0–180f)
// ══════════════════════════════════════════════════════════════════════════
function TitleScene() {
  const frame = useCurrentFrame();
  const badge = useFadeUp(0);
  const title = useFadeUp(15);
  const sub   = useFadeUp(35);
  const pills = useFadeUp(52);
  const dotPulse = 0.5 + 0.5 * Math.sin(frame * 0.15);

  const topics = [
    { label: "AI 代理人",   bg: C.primaryLight,  border: C.primaryBorder, color: C.primary },
    { label: "生產力悖論", bg: C.yellowLight,   border: C.yellowBorder,  color: C.yellow  },
    { label: "程式工具大戰",bg: C.primaryLight,  border: C.primaryBorder, color: C.primary },
  ];

  return (
    <AbsoluteFill style={{
      fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      paddingTop: NAV_H,
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
          }}>2026-03-26 · 每日 AI 知識庫</span>
        </div>
      </div>

      {/* Headline */}
      <div style={{ ...title, textAlign: "center", marginBottom: 16 * S }}>
        <h1 style={{
          fontSize: 52 * S, fontWeight: 900, color: C.text,
          lineHeight: 1.25, letterSpacing: "-0.02em", margin: 0,
        }}>
          AI 幫你買東西、幫你寫程式、
          <br />
          <span style={{ color: C.primary }}>還讓你更累？</span>
        </h1>
      </div>

      {/* Subtitle */}
      <div style={{
        ...sub,
        fontSize: 17 * S, color: C.muted, lineHeight: 1.65,
        textAlign: "center", marginBottom: 36 * S, maxWidth: 560 * S,
      }}>
        AI 代理人正式進入日常生活，三個你必須知道的發展
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
// Scene 1 — AI 代理人 (180–480f, local 0–300f)
// ══════════════════════════════════════════════════════════════════════════
function AgentsScene() {
  return (
    <ContentColumn>
      <SectionBadge num="01" label="AI 代理人悄悄接管你的日常" />
      <Card delay={20}>
        <CardLabel>亞馬遜 × 醫療</CardLabel>
        <CardBody>
          推出 <strong style={{ color: C.text }}>Health AI Agent</strong>，Prime 會員 24 小時免費問診、查驗血報告、預約門診。Visa 也在測試讓 AI 代理人<strong style={{ color: C.text }}>替你刷卡</strong>——設定預算規則，AI 自動完成購物。
        </CardBody>
      </Card>
      <Card delay={55}>
        <CardLabel color={C.yellow}>NVIDIA Agent Toolkit</CardLabel>
        <CardBody>
          2026 年 3 月正式發布，讓開發者更容易打造「可以<strong style={{ color: C.text }}>自主學習、自我進化</strong>」的 AI 系統。同時亞馬遜宣布裁員約 <strong style={{ color: C.primary }}>1.6 萬名</strong>中階管理與行政人員。
        </CardBody>
      </Card>
      <AnalogyBox label="Agentic AI" delay={95}>
        AI 不再只是「你問它才回答」的工具，它開始<strong style={{ color: C.text }}>主動替你執行任務</strong>，授權範圍與信任邊界值得你認真思考。
      </AnalogyBox>
    </ContentColumn>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 2 — 生產力悖論 (480–750f, local 0–270f)
// ══════════════════════════════════════════════════════════════════════════
function ProductivityScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const statsAnim = useFadeUp(20);
  const card2Anim = useFadeUp(70);

  const stats = [
    { value: "90%", label: "知識工作者說省時間",  color: C.primary },
    { value: "-9%", label: "深度專注工作時間",    color: C.red     },
    { value: "×2",  label: "電子郵件往來量",      color: C.yellow  },
  ];

  return (
    <ContentColumn>
      <SectionBadge num="02" label="AI 讓你更有生產力，但也讓你更累？" />

      {/* Stats row */}
      <div style={{ ...statsAnim, display: "flex", gap: 12 * S, marginBottom: 14 * S }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            flex: 1, background: C.surface,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 14 * S,
            padding: `${16 * S}px ${14 * S}px`,
            textAlign: "center" as const,
          }}>
            <div style={{
              fontSize: 36 * S, fontWeight: 900, color: s.color,
              fontFamily: "'Space Mono', monospace",
              letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 8 * S,
            }}>{s.value}</div>
            <div style={{ fontSize: 11 * S, color: C.muted, lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 2030 outlook card */}
      <div style={{ ...card2Anim }}>
        <div style={{
          background: C.surface, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 14 * S, padding: `${18 * S}px ${22 * S}px`, marginBottom: 14 * S,
        }}>
          <CardLabel color={C.yellow}>2030 年展望</CardLabel>
          <CardBody>
            AI 將淘汰 <strong style={{ color: C.text }}>9,200 萬個</strong>工作，但同時創造{" "}
            <strong style={{ color: C.primary }}>1.7 億個新職位</strong>，淨增 7,800 萬就業機會。擁有 AI 技能的工作者，薪資比同職位高出{" "}
            <strong style={{ color: C.yellow }}>56%</strong>。
          </CardBody>
        </div>
        <div style={{
          background: C.primaryLight,
          borderLeft: `${4 * S}px solid ${C.primary}`,
          borderRadius: `0 ${14 * S}px ${14 * S}px 0`,
          padding: `${14 * S}px ${18 * S}px`,
        }}>
          <p style={{ fontSize: 13 * S, color: "#c8ffe0", lineHeight: 1.75, margin: 0 }}>
            挑戰不只是「AI 會不會搶我的工作」，而是：<strong style={{ color: C.text }}>你能不能聰明地使用 AI，而不是被 AI 使用</strong>？
          </p>
        </div>
      </div>
    </ContentColumn>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 3 — Cursor vs Copilot (750–1020f, local 0–270f)
// ══════════════════════════════════════════════════════════════════════════
function CodingScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const compAnim   = useFadeUp(20);
  const warningAnim = useFadeUp(85);

  const copilotPct = interpolate(
    spring({ frame: Math.max(0, frame - 25), fps, config: { damping: 22, stiffness: 80 } }),
    [0, 1], [0, 56], clamp,
  );
  const cursorPct = interpolate(
    spring({ frame: Math.max(0, frame - 42), fps, config: { damping: 22, stiffness: 80 } }),
    [0, 1], [0, 52], clamp,
  );

  const bars = [
    { name: "GitHub Copilot", pct: copilotPct, color: C.primary, sub: "微軟旗下 · 深度整合 VS Code" },
    { name: "Cursor",         pct: cursorPct,  color: C.yellow,  sub: "後起之秀 · 多模型整合" },
  ];

  return (
    <ContentColumn>
      <SectionBadge num="03" label="AI 程式助手大戰：Cursor vs Copilot" />

      <div style={{ ...compAnim, marginBottom: 14 * S }}>
        <div style={{
          background: C.surface, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 14 * S, padding: `${20 * S}px ${22 * S}px`,
        }}>
          {bars.map((b, i) => (
            <div key={i} style={{ marginBottom: i < bars.length - 1 ? 18 * S : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 * S }}>
                <div>
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13 * S, color: C.text, fontWeight: 700,
                  }}>{b.name}</span>
                  <span style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10 * S, color: C.muted, marginLeft: 10 * S,
                  }}>{b.sub}</span>
                </div>
                <span style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 14 * S, color: b.color, fontWeight: 700,
                }}>{Math.round(b.pct)}%</span>
              </div>
              <div style={{
                height: 10 * S, background: "rgba(255,255,255,0.06)",
                borderRadius: 10 * S, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${b.pct}%`,
                  background: b.color, borderRadius: 10 * S,
                  boxShadow: `0 0 ${10 * S}px ${b.color}88`,
                }} />
              </div>
            </div>
          ))}
          <div style={{
            marginTop: 12 * S, fontSize: 10 * S, color: C.muted,
            fontFamily: "'Space Mono', monospace",
          }}>SWE-bench 標準測試解題率</div>
        </div>
      </div>

      <div style={{ ...warningAnim }}>
        <div style={{
          background: C.primaryLight,
          borderLeft: `${4 * S}px solid ${C.primary}`,
          borderRadius: `0 ${14 * S}px ${14 * S}px 0`,
          padding: `${16 * S}px ${20 * S}px`,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10 * S, color: C.primary,
            textTransform: "uppercase" as const, letterSpacing: "0.08em",
            marginBottom: 8 * S,
          }}>AI 素養提醒</div>
          <p style={{ fontSize: 13 * S, color: "#c8ffe0", lineHeight: 1.75, margin: 0 }}>
            AI 生成的程式碼可能含有<strong style={{ color: C.text }}>錯誤、安全漏洞、邏輯問題</strong>。把 AI 當成「快速草稿機」——自己還是要能讀懂並驗證它寫的東西，這才是真正的核心能力。
          </p>
        </div>
      </div>
    </ContentColumn>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Root composition export
// ══════════════════════════════════════════════════════════════════════════
export function VideoComposition_2026_03_26() {
  const frame = useCurrentFrame();
  const sc = SCENES_2026_03_26;

  return (
    <AbsoluteFill style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif" }}>
      <Background />

      {/* BG music — Vibe Coding track */}
      <Audio src={staticFile("audio/course_bgmusic.wav")} volume={0.06} />

      {/* Scene TTS — uncomment and add public/audio/ai-26-{1..4}.mp3 */}
      <Sequence from={sc.title.from}  durationInFrames={sc.title.to  - sc.title.from}><Audio src={staticFile("audio/ai-26-1.mp3")} /></Sequence>
      <Sequence from={sc.agents.from} durationInFrames={sc.agents.to - sc.agents.from}><Audio src={staticFile("audio/ai-26-2.mp3")} /></Sequence>
      <Sequence from={sc.prod.from}   durationInFrames={sc.prod.to   - sc.prod.from  }><Audio src={staticFile("audio/ai-26-3.mp3")} /></Sequence>
      <Sequence from={sc.coding.from} durationInFrames={sc.coding.to - sc.coding.from}><Audio src={staticFile("audio/ai-26-4.mp3")} /></Sequence>

      {/* Progress bar */}
      <ProgressBar globalFrame={frame} />

      {/* Scenes */}
      <Sequence from={sc.title.from}  durationInFrames={sc.title.to  - sc.title.from}><TitleScene /></Sequence>
      <Sequence from={sc.agents.from} durationInFrames={sc.agents.to - sc.agents.from}><AgentsScene /></Sequence>
      <Sequence from={sc.prod.from}   durationInFrames={sc.prod.to   - sc.prod.from}><ProductivityScene /></Sequence>
      <Sequence from={sc.coding.from} durationInFrames={sc.coding.to - sc.coding.from}><CodingScene /></Sequence>

      {/* iMessage notification stack — always on top */}
      {ALL_CALLOUTS.map((c, i) => (
        <NotificationCard key={i} c={c} globalFrame={frame} allCallouts={ALL_CALLOUTS} />
      ))}
    </AbsoluteFill>
  );
}
