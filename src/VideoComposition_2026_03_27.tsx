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
import NvidiaThree from "./three/NvidiaThree";
import McpThree from "./three/McpThree";
import HbrThree from "./three/HbrThree";
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

// ── Scenes / timing (aligned to WAV audio, 30fps) ─────────────────────────
export const SCENES_2026_03_27 = {
  title:  { from: 0,    to: 1515  }, // 0:00.000 → 0:50.760
  nvidia: { from: 1515, to: 4299  }, // 0:50.760 → 2:26.560
  mcp:    { from: 4299, to: 7781  }, // 2:26.560 → 4:21.120
  hbr:    { from: 7781, to: 11678 }, // 4:21.120 → end (6:29.480)
} as const;
export const TOTAL_FRAMES_2026_03_27 = 11678;

const CHAPTERS = [
  { label: "今日焦點",             start: 0    },
  { label: "NVIDIA 開放模型家族",  start: 1515 },
  { label: "企業 AI 代理人工作流程", start: 4299 },
  { label: "AI 工作強度悖論",      start: 7781 },
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

// Opacity-only fade — for text-heavy blocks where translateY causes layout jitter
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
          <span>每日 AI 知識庫 · 2026-03-27</span>
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

const ALL_CALLOUTS: Callout[] = [
  { from: 2710,  to: 3400,  sender: "NVIDIA",       text: "為代理人 AI 時代打地基" },
  { from: 5883,  to: 6400,  sender: "新標準",        text: "MCP · Model Context Protocol" },
  { from: 6421,  to: 7200,  sender: "PwC 調查",      text: "79% 企業已部署 AI 代理人" },
  { from: 7980,  to: 8700,  sender: "哈佛商業評論",   text: "AI 讓工作更密集而非更少" },
  { from: 10050, to: 11670, sender: "AI 素養提醒",   text: "學會設定邊界，不被效率壓榨" },
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
  let totalYPush = 0;
  for (const newer of allCallouts) {
    if (newer.from <= c.from) continue;
    if (globalFrame < newer.from) continue;
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
  const a = useFadeIn(delay);
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
        <p style={{
          fontSize: 14 * S, color: "#c8ffe0", lineHeight: 1.75, margin: 0,
          textRendering: "geometricPrecision",
        }}>{children}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 0 — Title (0–1523f)
// ══════════════════════════════════════════════════════════════════════════
function TitleScene() {
  const frame = useCurrentFrame();
  const badge = useFadeUp(0);
  const title = useFadeUp(15);
  const sub   = useFadeUp(35);
  const pills = useFadeUp(52);
  const dotPulse = 0.5 + 0.5 * Math.sin(frame * 0.15);

  const topics = [
    { label: "NVIDIA 模型家族", bg: C.primaryLight,  border: C.primaryBorder, color: C.primary },
    { label: "企業 AI 代理人",  bg: C.yellowLight,   border: C.yellowBorder,  color: C.yellow  },
    { label: "工作強度悖論",    bg: C.primaryLight,  border: C.primaryBorder, color: C.primary },
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
          }}>2026-03-27 · 每日 AI 知識庫</span>
        </div>
      </div>

      {/* Headline */}
      <div style={{ ...title, textAlign: "center", marginBottom: 16 * S }}>
        <h1 style={{
          fontSize: 52 * S, fontWeight: 900, color: C.text,
          lineHeight: 1.25, letterSpacing: "-0.02em", margin: 0,
        }}>
          AI 讓你更輕鬆？
          <br />
          <span style={{ color: C.primary }}>還是更累？</span>
        </h1>
      </div>

      {/* Subtitle */}
      <div style={{
        ...sub,
        fontSize: 17 * S, color: C.muted, lineHeight: 1.65,
        textAlign: "center", marginBottom: 36 * S, maxWidth: 560 * S,
      }}>
        揭開工作加速的秘密｜三個你必須知道的 AI 發展
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
// Scene 1 — NVIDIA (1523–4397f, local 0–2874f)
// Local offsets: Nemotron=386, Isaac=600, AnalogyBox=1483
// ══════════════════════════════════════════════════════════════════════════
function NvidiaScene() {
  return (
    <ContentColumn>
      <SectionBadge num="01" label="NVIDIA 開放模型家族" />
      <Card delay={390}>
        <CardLabel>三大新系列</CardLabel>
        <CardBody>
          <strong style={{ color: C.text }}>Nemotron 3</strong> — 專為 AI 代理人設計的多模態理解模型。<strong style={{ color: C.text }}>Isaac GR00T N1.7</strong> — 實體機器人 AI 的下一代模型。<strong style={{ color: C.text }}>Cosmos 3</strong> — 支援物理 AI 環境的生成模型。
        </CardBody>
      </Card>
      <Card delay={1196}>
        <CardLabel color={C.yellow}>代理人 AI 時代</CardLabel>
        <CardBody>
          未來的 AI 不只回答問題，而是能<strong style={{ color: C.text }}>自主行動</strong>——從讀取資料、做判斷、執行任務，一路到回報結果全部自己來。
        </CardBody>
      </Card>
      <AnalogyBox label="為什麼重要" delay={1483}>
        過去企業部署這種能力需要花大錢買封閉的商業服務。NVIDIA 開放這些模型，<strong style={{ color: C.text }}>讓整個 AI 生態系的門檻降低了一大截</strong>。從醫療、工廠自動化到機器人，應用場景幾乎無限。
      </AnalogyBox>
    </ContentColumn>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 2 — MCP / Enterprise AI (4397–7834f, local 0–3437f)
// Local offsets: RPA=617, MCP=1491, PwC=2113, AnalogyBox=2767
// ══════════════════════════════════════════════════════════════════════════
function McpScene() {
  return (
    <ContentColumn>
      <SectionBadge num="02" label="企業 AI 代理人工作流程" />
      <Card delay={702}>
        <CardLabel>RPA → AI 代理人</CardLabel>
        <CardBody>
          傳統 RPA 只能照固定規則走，遇到例外就卡住。<strong style={{ color: C.text }}>AI 代理人</strong>能根據情況自主判斷、嘗試解決例外，透過統一標準協定連接所有工具。
        </CardBody>
      </Card>
      <Card delay={1584}>
        <CardLabel color={C.yellow}>MCP · Model Context Protocol</CardLabel>
        <CardBody>
          讓 AI 代理人統一「連接」各種工具與服務，不需為每個平台寫專屬串接程式。<strong style={{ color: C.text }}>PwC 調查：79% 企業已在正式環境運行 AI 代理人</strong>，66% 回報可量化的生產力提升。
        </CardBody>
      </Card>
      <AnalogyBox label="AI 透明度" delay={2667}>
        當代理人在幫你「執行」時，你有沒有辦法理解它做了什麼決定？<strong style={{ color: C.text }}>盲目信任代理人的結果，跟以前盲目信任 Excel 公式的問題一樣危險。</strong>
      </AnalogyBox>
    </ContentColumn>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 3 — HBR (7834–11685f, local 0–3851f)
// Local offsets: stats=568, card=1286, AnalogyBox=2144
// ══════════════════════════════════════════════════════════════════════════
function HbrScene() {
  const statsAnim = useFadeUp(617);
  const cardAnim  = useFadeUp(1326);

  const stats = [
    { value: "更快", label: "工作速度明顯加快", color: C.primary },
    { value: "更廣", label: "承擔任務範圍擴大", color: C.yellow  },
    { value: "更長", label: "工作時間自主延伸", color: C.red     },
  ];

  return (
    <ContentColumn>
      <SectionBadge num="03" label="AI 工作強度悖論（哈佛商業評論）" />

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

      {/* Work intensity card */}
      <div style={{ ...cardAnim, marginBottom: 14 * S }}>
        <div style={{
          background: C.surface,
          border: `1px solid ${C.primaryBorder}`,
          borderRadius: 14 * S,
          padding: `${18 * S}px ${22 * S}px`,
        }}>
          <CardLabel>工作加速的真相</CardLabel>
          <CardBody>
            以前寫一份報告要三小時，現在用 AI 一小時完成——但你不是就此休息，而是繼續用剩下兩小時<strong style={{ color: C.text }}>再多做幾件事</strong>。AI 工具確實有效，才能讓人願意主動多做。但生產力提升的成果若都被「更多工作量」吸收，員工最終得到的是什麼？
          </CardBody>
        </div>
      </div>

      <AnalogyBox label="AI 素養提醒" delay={2269}>
        學會使用 AI 工具固然重要，但更重要的是學會<strong style={{ color: C.text }}>設定邊界</strong>——什麼時候該說「夠了」，而不是讓效率的提升變成另一種形式的壓榨。
      </AnalogyBox>
    </ContentColumn>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Root composition export
// ══════════════════════════════════════════════════════════════════════════
export function VideoComposition_2026_03_27() {
  const frame = useCurrentFrame();
  const sc = SCENES_2026_03_27;

  return (
    <AbsoluteFill style={{ fontFamily: "'Noto Sans TC', 'PingFang TC', sans-serif" }}>
      <Background />

      
      <Audio src={staticFile("audio/ai-knowledge-2026-03-27-processed.wav")} volume={1.0} />

      
      

      {/* Progress bar */}
      <ProgressBar globalFrame={frame} />

      {/* Scenes */}
      <Sequence from={sc.title.from}  durationInFrames={sc.title.to  - sc.title.from}>
        <TitleScene />
      </Sequence>
      <Sequence from={sc.nvidia.from} durationInFrames={sc.nvidia.to - sc.nvidia.from}>
        <NvidiaThree />
        <NvidiaScene />
      </Sequence>
      <Sequence from={sc.mcp.from}    durationInFrames={sc.mcp.to   - sc.mcp.from}>
        <McpThree />
        <McpScene />
      </Sequence>
      <Sequence from={sc.hbr.from}    durationInFrames={sc.hbr.to   - sc.hbr.from}>
        <HbrThree />
        <HbrScene />
      </Sequence>

      {/* iMessage notification stack — always on top */}
      {ALL_CALLOUTS.map((c, i) => (
        <NotificationCard key={i} c={c} globalFrame={frame} allCallouts={ALL_CALLOUTS} />
      ))}
    </AbsoluteFill>
  );
}
