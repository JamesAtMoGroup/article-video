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

// ── Scale & canvas (4K = 3840×2160) ──────────────────────────────────────────
const S = 3;
const W = 1280 * S;   // 3840
const H = 720  * S;   // 2160
const NAV_H         = 50  * S;  // 150px
const CONTAINER_W   = 640 * S;  // 1920px
const COL_LEFT      = (W - CONTAINER_W) / 2;  // 960px
const SUBTITLE_SAFE = 120 * S;  // 360px — bottom safe zone
const CONTENT_GAP   = 10  * S;
const CONTENT_TOP   = NAV_H + CONTENT_GAP;     // 180px
const CONTENT_H     = H - CONTENT_TOP - SUBTITLE_SAFE;  // 1620px

// ── Design tokens ─────────────────────────────────────────────────────────────
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

// ── iMessage constants ────────────────────────────────────────────────────────
const NOTIF_W       = 290 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLOT    = 148 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT-derived, ×30fps) ───────────────────────────────────
// TitleScene   0s   →  58.5s  →    0–1755
// Scene1      58.5s → 154.5s  → 1755–4635
// Scene2     154.5s → 241.5s  → 4635–7245
// Scene3     241.5s → 348.0s  → 7245–10440
// Summary    348.0s → 403.5s  → 10440–12105
export const TOTAL_FRAMES_2026_04_15 = 12105;

const CHAPTERS = [
  { label: "今日焦點",        start: 0     },
  { label: "AI 的溫度是什麼",  start: 1755  },
  { label: "多樣性的價值",     start: 4635  },
  { label: "如何掌控輸出變異", start: 7245  },
  { label: "重點整理",         start: 10440 },
] as const;

// ── iMessage callouts ─────────────────────────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  {
    from: 4440, to: 4635,
    sender: "想一想",
    text: "如果 AI 的答案永遠都一樣，還會有那麼多人問它同樣的問題嗎？",
  },
  {
    from: 7020, to: 7245,
    sender: "反思一下",
    text: "如果我們可以控制 AI 的「隨機性」，應該如何找到創意和可靠性的平衡點？",
  },
  {
    from: 10200, to: 10440,
    sender: "值得思考",
    text: "你在工作中，什麼時候需要 AI 的「穩定答案」，什麼時候想要「創意多樣」的回應？",
  },
];

// ── Easing tokens ─────────────────────────────────────────────────────────────
const E = {
  outExpo:  Easing.bezier(0.19, 1, 0.22, 1),
  outCubic: Easing.bezier(0.215, 0.61, 0.355, 1),
  outQuart: Easing.bezier(0.165, 0.84, 0.44, 1),
} as const;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ── Plain style helpers ───────────────────────────────────────────────────────
function fadeUp(frame: number, start: number) {
  const f = Math.max(0, frame - start);
  return {
    opacity:   interpolate(f, [0, 14], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(f, [0, 22], [22 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" })}px)`,
  };
}

// ── SceneFade ─────────────────────────────────────────────────────────────────
function SceneFade({ children, dur }: { children: React.ReactNode; dur: number }) {
  const frame = useCurrentFrame();
  const op = Math.min(
    interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(frame, [dur - 12, dur], [1, 0], { extrapolateLeft: "clamp" }),
  );
  return <div style={{ opacity: op, height: "100%" }}>{children}</div>;
}

// ── ContentColumn ─────────────────────────────────────────────────────────────
function ContentColumn({
  children,
  scrollUp,
}: {
  children: React.ReactNode;
  scrollUp?: { at: number; amount: number };
}) {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  let scrollY = 0;
  if (scrollUp) {
    const p = spring({ frame: Math.max(0, frame - scrollUp.at), fps, config: { damping: 200 } });
    scrollY = interpolate(p, [0, 1], [0, -scrollUp.amount], clamp);
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: CONTENT_TOP, left: COL_LEFT,
        width: CONTAINER_W, height: CONTENT_H, overflow: "hidden" as const,
      }}>
        <div style={{ transform: `translateY(${scrollY}px)` }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
}

// ── Background ────────────────────────────────────────────────────────────────
function Background() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: 900 * S, height: 900 * S, top: -200 * S, right: -150 * S,
        background: "radial-gradient(circle, rgba(124,255,178,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: 600 * S, height: 600 * S, bottom: 50 * S, left: -100 * S,
        background: "radial-gradient(circle, rgba(124,255,178,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: [
          "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)",
        ].join(", "),
        backgroundSize: `${60 * S}px ${60 * S}px`,
        pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );
}

// ── ProgressBar ───────────────────────────────────────────────────────────────
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

// ── iMessage Callout ──────────────────────────────────────────────────────────
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
  return (
    <div style={{
      position: "absolute",
      top: NOTIF_TOP + slotIndex * NOTIF_SLOT,
      right: NOTIF_RIGHT,
      width: NOTIF_W,
      opacity: fadeOut,
      transform: `translateY(${translateY}px)`,
      zIndex: 100,
      background: "rgba(18,18,18,0.95)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderRadius: 16 * S,
      border: "1px solid rgba(124,255,178,0.2)",
      padding: `${12 * S}px ${14 * S}px`,
      boxShadow: `0 ${8 * S}px ${24 * S}px rgba(0,0,0,0.6)`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 6 * S }}>
        <div style={{
          width: 10 * S, height: 10 * S, borderRadius: "50%",
          background: C.primary, boxShadow: `0 0 ${6 * S}px ${C.primary}`,
        }} />
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
          color: C.primary, letterSpacing: "0.05em",
        }}>{callout.sender}</span>
      </div>
      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
        color: C.text, lineHeight: 1.55,
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

// ── Motion Graphics ───────────────────────────────────────────────────────────

// 1. TemperatureDialAnimation — TitleScene, LEFT side
function TemperatureDialAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 1600;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labelOp  = interpolate(Math.max(0, f - 0),   [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const dialOp   = interpolate(Math.max(0, f - 20),  [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const lowOp    = interpolate(Math.max(0, f - 50),  [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const highOp   = interpolate(Math.max(0, f - 80),  [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const needleP  = spring({ frame: Math.max(0, f - 30), fps, config: { damping: 18, stiffness: 80 } });
  // Needle swings from center to right (high temp)
  const needleAngle = interpolate(needleP, [0, 1], [-90, 30], clamp);

  const trackW = 200 * S;
  const fillPct = interpolate(needleP, [0, 1], [0, 80], clamp);

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 210 * S,
      width: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
    }}>
      {/* Label */}
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>TEMPERATURE</div>

      {/* Gauge track */}
      <div style={{ opacity: dialOp }}>
        <div style={{
          height: 16 * S, borderRadius: 8 * S, overflow: "hidden",
          background: "rgba(255,255,255,0.06)",
          position: "relative",
        }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: `${fillPct}%`,
            background: `linear-gradient(90deg, ${C.primary}, ${C.yellow})`,
            borderRadius: 8 * S,
            boxShadow: `0 0 ${8 * S}px rgba(124,255,178,0.5)`,
          }} />
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
          color: C.muted, marginTop: 6 * S,
        }}>
          <span>0.0</span>
          <span>1.0</span>
        </div>
      </div>

      {/* Low temp card */}
      <div style={{ opacity: lowOp }}>
        <div style={{
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 10 * S, padding: `${8 * S}px ${12 * S}px`,
          display: "flex", alignItems: "center", gap: 8 * S,
        }}>
          <span style={{ fontSize: 14 * S }}>🎯</span>
          <div>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 9 * S,
              color: C.primary, letterSpacing: "0.06em",
            }}>低溫 ≈ 0</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S,
              color: "rgba(255,255,255,0.75)",
            }}>精準、穩定</div>
          </div>
        </div>
      </div>

      {/* High temp card */}
      <div style={{ opacity: highOp }}>
        <div style={{
          background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
          borderRadius: 10 * S, padding: `${8 * S}px ${12 * S}px`,
          display: "flex", alignItems: "center", gap: 8 * S,
        }}>
          <span style={{ fontSize: 14 * S }}>✨</span>
          <div>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 9 * S,
              color: C.yellow, letterSpacing: "0.06em",
            }}>高溫 0.7–1.0</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S,
              color: "rgba(255,255,255,0.75)",
            }}>創意、多樣</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. TempRangeAnimation — Scene1, LEFT side
function TempRangeAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 2750;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const titleOp = interpolate(Math.max(0, f - 0), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const rows = [
    { label: "低溫 (≈0)",      fill: 0.15, color: C.primary, tag: "保守可靠", appear: 50  },
    { label: "中溫 (0.4–0.6)", fill: 0.50, color: C.yellow,  tag: "平衡",     appear: 120 },
    { label: "高溫 (0.7–1.0)", fill: 0.92, color: C.red,     tag: "創意多變", appear: 190 },
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 270 * S,
      width: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 20 * S,
    }}>
      <div style={{
        opacity: titleOp,
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.06em",
      }}>溫度 vs 輸出風格</div>
      {rows.map((row, i) => {
        const rF  = Math.max(0, f - row.appear);
        const rOp = interpolate(rF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const barW = interpolate(rF, [0, 50], [0, row.fill * 100], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ opacity: rOp }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S,
              color: "rgba(255,255,255,0.7)", marginBottom: 6 * S,
            }}>
              <span>{row.label}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", color: row.color, fontSize: 11 * S }}>{row.tag}</span>
            </div>
            <div style={{
              height: 14 * S, background: "rgba(255,255,255,0.06)",
              borderRadius: 7 * S, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${barW}%`,
                background: row.color, borderRadius: 7 * S,
                boxShadow: `0 0 ${8 * S}px ${row.color}88`,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 3. DiversityAnimation — Scene2, LEFT side
function DiversityAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 2500;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const titleOp = interpolate(Math.max(0, f - 0), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const bubbles = [
    { icon: "💡", label: "角度 A：框架分析", color: C.primary, appear: 50  },
    { icon: "🎨", label: "角度 B：創意發想", color: C.yellow,  appear: 200 },
    { icon: "🔍", label: "角度 C：批判思考", color: C.red,     appear: 350 },
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 260 * S,
      width: 215 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
    }}>
      <div style={{
        opacity: titleOp,
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.06em",
      }}>同一問題 × 多元視角</div>
      {bubbles.map((b, i) => {
        const bF  = Math.max(0, f - b.appear);
        const bOp = interpolate(bF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const bTy = interpolate(bF, [0, 22], [15 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: bOp, transform: `translateY(${bTy}px)`,
            background: "rgba(10,10,10,0.9)",
            border: `1px solid ${b.color}33`,
            borderLeft: `${3 * S}px solid ${b.color}`,
            borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
            padding: `${8 * S}px ${12 * S}px`,
            display: "flex", alignItems: "center", gap: 10 * S,
          }}>
            <span style={{ fontSize: 14 * S }}>{b.icon}</span>
            <span style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S,
              color: "rgba(255,255,255,0.8)",
            }}>{b.label}</span>
          </div>
        );
      })}
      {/* Arrow down */}
      <div style={{
        opacity: interpolate(Math.max(0, f - 450), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
        textAlign: "center" as const,
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted,
      }}>↓ 思維更豐富</div>
    </div>
  );
}

// 4. MethodCheckAnimation — Scene3, LEFT side
function MethodCheckAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 3050;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const titleOp = interpolate(Math.max(0, f - 0), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const items = [
    { icon: "🎛️", label: "指定溫度參數",  sub: "平台設定或語言提示",   color: C.primary, appear: 115 },
    { icon: "📝", label: "修改提示語氣",  sub: "「最可靠」vs「十個創意」", color: C.yellow, appear: 715 },
    { icon: "🔒", label: "高準確性任務", sub: "醫療、法律 → 低溫",    color: C.red,     appear: 1190 },
    { icon: "🌈", label: "創意探索任務", sub: "企劃、文案 → 高溫",    color: C.primary, appear: 1675 },
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 260 * S,
      width: 215 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 16 * S,
    }}>
      <div style={{
        opacity: titleOp,
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.primary, letterSpacing: "0.06em",
      }}>掌控技巧清單</div>
      {items.map((item, i) => {
        const iF  = Math.max(0, f - item.appear);
        const iOp = interpolate(iF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const iTy = interpolate(iF, [0, 22], [15 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: iOp, transform: `translateY(${iTy}px)`,
            display: "flex", alignItems: "flex-start", gap: 10 * S,
            background: "rgba(10,10,10,0.9)",
            border: `1px solid ${item.color}33`,
            borderRadius: 10 * S, padding: `${8 * S}px ${12 * S}px`,
          }}>
            <span style={{ fontSize: 14 * S, flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S,
                color: item.color, fontWeight: 700,
              }}>{item.label}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 11 * S,
                color: C.muted, marginTop: 2 * S,
              }}>{item.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Scene Components ──────────────────────────────────────────────────────────

function TitleScene({ dur }: { dur: number }) {
  const frame = useCurrentFrame();
  const topics = ["AI 的溫度機制", "多樣性的價值", "掌控輸出變異"];

  return (
    <SceneFade dur={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{ ...fadeUp(frame, 10), display: "inline-flex", alignItems: "center", gap: 8 * S, marginBottom: 20 * S }}>
          <div style={{
            width: 8 * S, height: 8 * S, borderRadius: "50%",
            background: C.primary, boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          }} />
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 12 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>AI TEMPERATURE · 2026-04-15</span>
        </div>

        {/* Title */}
        <div style={{ ...fadeUp(frame, 25), marginBottom: 16 * S }}>
          <h1 style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 36 * S, fontWeight: 900,
            color: C.text, lineHeight: 1.25,
            margin: 0, marginBottom: 14 * S,
          }}>
            為什麼同一個問題問 AI，<br />
            <span style={{ color: C.primary }}>每次答案都不一樣？</span>
          </h1>
        </div>

        {/* Key sentence */}
        <div style={{ ...fadeUp(frame, 42), marginBottom: 30 * S }}>
          <div style={{
            background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
            borderRadius: 12 * S, padding: `${14 * S}px ${18 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>CORE INSIGHT</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 17 * S, color: C.text, lineHeight: 1.5,
            }}>
              這不是 <span style={{ color: C.red, fontWeight: 700 }}>bug</span>，而是 <span style={{ color: C.primary, fontWeight: 700 }}>feature</span>——<br />
              溫度參數讓 AI 在創意和穩定性之間找到平衡
            </div>
          </div>
        </div>

        {/* Topic pills */}
        <div style={{ display: "flex", gap: 12 * S, flexWrap: "wrap" as const }}>
          {topics.map((t, i) => (
            <div key={i} style={{
              ...fadeUp(frame, 60 + i * 12),
              background: C.primaryLight,
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 99 * S,
              padding: `${7 * S}px ${18 * S}px`,
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 14 * S, color: C.primary,
            }}>{t}</div>
          ))}
        </div>
      </ContentColumn>
      <TemperatureDialAnimation triggerFrame={60} />
    </SceneFade>
  );
}

function Scene1Temperature({ dur }: { dur: number }) {
  const frame = useCurrentFrame();

  // Fade out early analogy before high/low cards dominate
  const FADE1_START = 770;
  const REMOVE1     = 920;
  const earlyOp = frame > FADE1_START
    ? interpolate(frame, [FADE1_START, REMOVE1], [1, 0], clamp) : 1;
  const showEarly = frame < REMOVE1;

  return (
    <SceneFade dur={dur}>
      <ContentColumn scrollUp={frame > 1400 ? { at: 1400, amount: 260 * S } : undefined}>
        {/* Section badge */}
        <div style={{ ...fadeUp(frame, 0), marginBottom: 18 * S }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8 * S,
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 99 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.primary, letterSpacing: "0.1em" }}>PART 01</span>
            <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>AI 的「溫度」是什麼？</span>
          </div>
        </div>

        {/* Definition card */}
        <div style={{ ...fadeUp(frame, 15), marginBottom: 18 * S }}>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.surfaceBorder}`,
            borderLeft: `${4 * S}px solid ${C.primary}`,
            borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
            padding: `${20 * S}px ${24 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
            }}>DEFINITION</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 21 * S, fontWeight: 700, color: C.text, lineHeight: 1.4,
            }}>
              <span style={{ color: C.primary }}>溫度（Temperature）</span><br />
              決定 AI 選詞的「冒險程度」
            </div>
          </div>
        </div>

        {/* Analogy — fades out before compare appears */}
        {showEarly && (
          <div style={{ opacity: earlyOp }}>
            <div style={{ ...fadeUp(frame, 40), marginBottom: 18 * S }}>
              <div style={{
                background: C.surface,
                borderLeft: `${4 * S}px solid ${C.yellow}`,
                borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
                border: `1px solid ${C.surfaceBorder}`,
                padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
                  color: C.yellow, marginBottom: 8 * S, letterSpacing: "0.08em",
                }}>ANALOGY</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 17 * S, color: C.text, lineHeight: 1.6,
                }}>
                  想像 AI 站在<span style={{ color: C.yellow, fontWeight: 700 }}>機率的地景前</span>——<br />
                  溫度高時：蒙著眼睛亂選<br />
                  溫度低時：精準選擇最可能的字
                </div>
              </div>
            </div>
          </div>
        )}

        {/* High vs Low compare grid */}
        <div style={{ ...fadeUp(frame, 825), marginBottom: 18 * S }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 * S }}>
            <div style={{
              background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
              borderRadius: 12 * S, padding: `${14 * S}px ${16 * S}px`,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
                color: C.primary, marginBottom: 8 * S, letterSpacing: "0.08em",
              }}>低溫（≈0）</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 15 * S, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, fontWeight: 700,
              }}>保守、重複</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 13 * S, color: C.muted, marginTop: 8 * S,
              }}>→ 答案更可靠</div>
            </div>
            <div style={{
              background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
              borderRadius: 12 * S, padding: `${14 * S}px ${16 * S}px`,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
                color: C.yellow, marginBottom: 8 * S, letterSpacing: "0.08em",
              }}>高溫（0.7–1.0）</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 15 * S, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, fontWeight: 700,
              }}>創意、多變</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 13 * S, color: C.yellow, marginTop: 8 * S,
              }}>→ 品質較不穩定</div>
            </div>
          </div>
        </div>

        {/* Logic summary card */}
        <div style={{ ...fadeUp(frame, 2295), marginBottom: 18 * S }}>
          <div style={{
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 12 * S, padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>DESIGN LOGIC</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 17 * S, color: C.text, lineHeight: 1.6,
            }}>
              需要<span style={{ color: C.yellow, fontWeight: 700 }}>創意</span>→ 提高溫度<br />
              需要<span style={{ color: C.primary, fontWeight: 700 }}>準確性</span>→ 降低溫度
            </div>
          </div>
        </div>
      </ContentColumn>
      <TempRangeAnimation triggerFrame={30} />
    </SceneFade>
  );
}

function Scene2Diversity({ dur }: { dur: number }) {
  const frame = useCurrentFrame();

  const valueCards = [
    {
      icon: "🧠", color: C.primary,
      title: "突破思維框架",
      desc: "多樣答案能給你「Problem-Solution」之外的框架，激發更深層的思考。",
      appear: 330,
    },
    {
      icon: "🔍", color: C.yellow,
      title: "培養批判性思維",
      desc: "我們不能盲目信任任何一個答案，而是需要比較、驗證、思考。",
      appear: 900,
    },
    {
      icon: "🎨", color: C.red,
      title: "創意工作的靈感",
      desc: "AI 的隨機性就像人類的靈感——無法被完全控制，卻正因此產出真正有新意的東西。",
      appear: 1320,
    },
  ];

  return (
    <SceneFade dur={dur}>
      <ContentColumn scrollUp={frame > 1600 ? { at: 1600, amount: 280 * S } : undefined}>
        {/* Section badge */}
        <div style={{ ...fadeUp(frame, 0), marginBottom: 18 * S }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8 * S,
            background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
            borderRadius: 99 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.yellow, letterSpacing: "0.1em" }}>PART 02</span>
            <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>為什麼多樣性回答對你很重要</span>
          </div>
        </div>

        {/* Key insight card */}
        <div style={{ ...fadeUp(frame, 15), marginBottom: 18 * S }}>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.surfaceBorder}`,
            borderLeft: `${4 * S}px solid ${C.yellow}`,
            borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
            padding: `${18 * S}px ${22 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>KEY INSIGHT</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 19 * S, color: C.text, lineHeight: 1.5,
            }}>
              AI 的<span style={{ color: C.yellow, fontWeight: 700 }}>變異性</span>看似不穩定，<br />
              實際上帶來<span style={{ color: C.primary, fontWeight: 700 }}>巨大的價值</span>
            </div>
          </div>
        </div>

        {/* Value cards — sequential reveal */}
        {valueCards.map((card, i) => (
          <div key={i} style={{ ...fadeUp(frame, card.appear + 10), marginBottom: 16 * S }}>
            <div style={{
              background: "rgba(10,10,10,0.9)",
              border: `1px solid ${card.color}33`,
              borderLeft: `${4 * S}px solid ${card.color}`,
              borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
              padding: `${16 * S}px ${20 * S}px`,
              display: "flex", gap: 14 * S, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 20 * S, flexShrink: 0, marginTop: 2 * S }}>{card.icon}</span>
              <div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 17 * S, fontWeight: 700, color: card.color, marginBottom: 8 * S,
                }}>{card.title}</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 15 * S, color: C.muted, lineHeight: 1.6,
                }}>{card.desc}</div>
              </div>
            </div>
          </div>
        ))}

        {/* Analogy box */}
        <div style={{ ...fadeUp(frame, 1680), marginBottom: 16 * S }}>
          <div style={{
            background: C.surface,
            borderLeft: `${4 * S}px solid ${C.primary}`,
            borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
            border: `1px solid ${C.surfaceBorder}`,
            padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.primary, marginBottom: 8 * S, letterSpacing: "0.08em",
            }}>EXAMPLE</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 16 * S, color: C.text, lineHeight: 1.6,
            }}>
              一個寫手問 AI 同一問題<span style={{ color: C.primary, fontWeight: 700 }}>十次</span>，<br />
              每次挑最有趣的觀點，組合成<span style={{ color: C.yellow, fontWeight: 700 }}>獨特的文章</span>——<br />
              就像和朋友每次談話都能發現新角度
            </div>
          </div>
        </div>
      </ContentColumn>
      <DiversityAnimation triggerFrame={30} />
    </SceneFade>
  );
}

function Scene3Control({ dur }: { dur: number }) {
  const frame = useCurrentFrame();

  const WARNING_APPEAR = 1140;

  return (
    <SceneFade dur={dur}>
      <ContentColumn scrollUp={frame > 2000 ? { at: 2000, amount: 340 * S } : undefined}>
        {/* Section badge */}
        <div style={{ ...fadeUp(frame, 0), marginBottom: 18 * S }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8 * S,
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 99 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.primary, letterSpacing: "0.1em" }}>PART 03</span>
            <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>如何掌控 AI 的輸出變異</span>
          </div>
        </div>

        {/* Method 01 card */}
        <div style={{ ...fadeUp(frame, 165), marginBottom: 16 * S }}>
          <div style={{
            background: "rgba(10,10,10,0.9)",
            border: `1px solid ${C.primaryBorder}`,
            borderLeft: `${4 * S}px solid ${C.primary}`,
            borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
            padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.primary, letterSpacing: "0.1em", marginBottom: 8 * S,
            }}>方法 01 · 明確指示溫度</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 16 * S, color: C.muted, lineHeight: 1.6,
            }}>
              在 AI 平台調整溫度參數，或用語言提示引導
            </div>
          </div>
        </div>

        {/* Prompt examples */}
        <div style={{ ...fadeUp(frame, 495), marginBottom: 16 * S }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 * S }}>
            <div style={{
              background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
              borderRadius: 12 * S, padding: `${12 * S}px ${14 * S}px`,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 9 * S,
                color: C.primary, marginBottom: 6 * S, letterSpacing: "0.08em",
              }}>低溫提示</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 13 * S, color: "rgba(255,255,255,0.8)", lineHeight: 1.5,
              }}>「請給我<br /><span style={{ color: C.primary, fontWeight: 700 }}>最可靠的答案</span>」</div>
            </div>
            <div style={{
              background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
              borderRadius: 12 * S, padding: `${12 * S}px ${14 * S}px`,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 9 * S,
                color: C.yellow, marginBottom: 6 * S, letterSpacing: "0.08em",
              }}>高溫提示</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 13 * S, color: "rgba(255,255,255,0.8)", lineHeight: 1.5,
              }}>「請給我<br /><span style={{ color: C.yellow, fontWeight: 700 }}>十個創意想法</span>」</div>
            </div>
          </div>
        </div>

        {/* Method 02 card */}
        <div style={{ ...fadeUp(frame, 765), marginBottom: 16 * S }}>
          <div style={{
            background: "rgba(10,10,10,0.9)",
            border: `1px solid ${C.yellowBorder}`,
            borderLeft: `${4 * S}px solid ${C.yellow}`,
            borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
            padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.yellow, letterSpacing: "0.1em", marginBottom: 8 * S,
            }}>方法 02 · 修改提示詞</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 15 * S, color: C.muted, lineHeight: 1.7,
            }}>
              加入關鍵詞引導輸出風格：<br />
              <span style={{ color: C.primary }}>"請逐步思考"</span>
              <span style={{ color: C.yellow }}>"請提供多個視角"</span><br />
              <span style={{ color: C.red }}>"請選擇最保守的方案"</span>
            </div>
          </div>
        </div>

        {/* Warning card */}
        <div style={{ ...fadeUp(frame, WARNING_APPEAR + 10), marginBottom: 16 * S }}>
          <div style={{
            background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
            borderRadius: 12 * S, padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>⚠ 責任使用</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 16 * S, color: C.text, lineHeight: 1.6,
            }}>
              <span style={{ color: C.red, fontWeight: 700 }}>高準確性任務</span>（醫療、法律）→ 低溫<br />
              <span style={{ color: C.primary, fontWeight: 700 }}>創意探索任務</span>（企劃、文案）→ 高溫<br />
              <span style={{ color: C.yellow }}>永遠保持批判性思考</span>
            </div>
          </div>
        </div>

        {/* Practical tip */}
        <div style={{ ...fadeUp(frame, 2475), marginBottom: 16 * S }}>
          <div style={{
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 12 * S, padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>💡 實用技巧</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 16 * S, color: C.text, lineHeight: 1.6,
            }}>
              發現好答案時，告訴 AI：<br />
              「<span style={{ color: C.primary, fontWeight: 700 }}>我喜歡你前面這個角度</span>」<br />
              幫助後續對話保持類似的思路
            </div>
          </div>
        </div>
      </ContentColumn>
      <MethodCheckAnimation triggerFrame={50} />
    </SceneFade>
  );
}

function SummaryScene({ dur }: { dur: number }) {
  const frame = useCurrentFrame();

  const recaps = [
    {
      num: "01", color: C.primary,
      title: "溫度參數機制",
      desc: "AI 的「溫度」決定了回答的隨機性程度，就像靈感的控制裝置。",
    },
    {
      num: "02", color: C.yellow,
      title: "多樣性的價值",
      desc: "不同的答案能幫助我們突破思維框架，啟發更深層的創意。",
    },
    {
      num: "03", color: C.red,
      title: "實踐控制技巧",
      desc: "通過調整提示詞和選擇合適的溫度，平衡創意與可靠性。",
    },
  ];

  return (
    <SceneFade dur={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{ ...fadeUp(frame, 10), display: "inline-flex", alignItems: "center", gap: 10 * S, marginBottom: 20 * S }}>
          <div style={{
            width: 8 * S, height: 8 * S, borderRadius: "50%",
            background: C.primary, boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          }} />
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.primary, letterSpacing: "0.1em",
          }}>重點整理</span>
        </div>

        {/* Recap cards */}
        {recaps.map((recap, i) => (
          <div key={i} style={{ ...fadeUp(frame, 30 + i * 50), marginBottom: 18 * S }}>
            <div style={{
              background: C.surface, border: `1px solid ${C.surfaceBorder}`,
              borderLeft: `${4 * S}px solid ${recap.color}`,
              borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
              padding: `${18 * S}px ${22 * S}px`,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
                color: recap.color, letterSpacing: "0.1em", marginBottom: 8 * S,
              }}>#{recap.num}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 18 * S, fontWeight: 700, color: C.text, marginBottom: 8 * S,
              }}>{recap.title}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 16 * S, color: C.muted, lineHeight: 1.6,
              }}>{recap.desc}</div>
            </div>
          </div>
        ))}

        {/* Sign-off */}
        <div style={{ ...fadeUp(frame, 220), textAlign: "center" as const, marginTop: 10 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 12 * S,
            color: C.muted, letterSpacing: "0.06em",
          }}>每日 AI 知識庫 · AI 未來學院</span>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

// ── Main Composition ──────────────────────────────────────────────────────────
export function VideoComposition_2026_04_15() {
  const frame = useCurrentFrame();

  const TITLE_FROM = 0;
  const TITLE_TO   = 1755;
  const S1_FROM    = 1755;
  const S1_TO      = 4635;
  const S2_FROM    = 4635;
  const S2_TO      = 7245;
  const S3_FROM    = 7245;
  const S3_TO      = 10440;
  const SUM_FROM   = 10440;
  const SUM_TO     = 12105;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Background />
      <Audio src={staticFile("audio/2026-04-15-processed.wav")} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fadeIn  = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fadeOut = interpolate(f, [TOTAL_FRAMES_2026_04_15 - 150, TOTAL_FRAMES_2026_04_15], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return Math.min(fadeIn, fadeOut);
        }}
        loop
      />

      <Sequence from={TITLE_FROM} durationInFrames={TITLE_TO - TITLE_FROM}>
        <TitleScene dur={TITLE_TO - TITLE_FROM} />
      </Sequence>

      <Sequence from={S1_FROM} durationInFrames={S1_TO - S1_FROM}>
        <Scene1Temperature dur={S1_TO - S1_FROM} />
      </Sequence>

      <Sequence from={S2_FROM} durationInFrames={S2_TO - S2_FROM}>
        <Scene2Diversity dur={S2_TO - S2_FROM} />
      </Sequence>

      <Sequence from={S3_FROM} durationInFrames={S3_TO - S3_FROM}>
        <Scene3Control dur={S3_TO - S3_FROM} />
      </Sequence>

      <Sequence from={SUM_FROM} durationInFrames={SUM_TO - SUM_FROM}>
        <SummaryScene dur={SUM_TO - SUM_FROM} />
      </Sequence>

      <ProgressBar globalFrame={frame} />
      <IMessageOverlay globalFrame={frame} />
    </AbsoluteFill>
  );
}
