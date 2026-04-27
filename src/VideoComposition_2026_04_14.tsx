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
// TitleScene  0s   → 28.2s  →   0–846
// Scene1     28.2s → 101.3s → 846–3039
// Scene2    101.3s → 176.1s → 3039–5283
// Scene3    176.1s → 273.3s → 5283–8199
// Summary   273.3s → 296.9s → 8199–8907
export const TOTAL_FRAMES_2026_04_14 = 8907;

const CHAPTERS = [
  { label: "今日焦點",      start: 0    },
  { label: "Prompt 是什麼", start: 846  },
  { label: "四個常見地雷",  start: 3039 },
  { label: "四個改善技巧",  start: 5283 },
  { label: "重點整理",      start: 8199 },
] as const;

// ── iMessage callouts ─────────────────────────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  {
    from: 2820, to: 3039,
    sender: "想一想",
    text: "你最近問AI的問題，有沒有給足夠的背景資訊？還是習慣用一句話打發它？",
  },
  {
    from: 4980, to: 5283,
    sender: "反思一下",
    text: "你上次覺得AI回答很爛，是AI的問題，還是其實Prompt本身也有問題？",
  },
  {
    from: 7920, to: 8199,
    sender: "值得思考",
    text: "你願意花多少時間練習寫Prompt？這項技能，你覺得值得投資嗎？",
  },
];

// ── Easing tokens ─────────────────────────────────────────────────────────────
const E = {
  outExpo:  Easing.bezier(0.19, 1, 0.22, 1),
  outCubic: Easing.bezier(0.215, 0.61, 0.355, 1),
  outQuart: Easing.bezier(0.165, 0.84, 0.44, 1),
} as const;
const easeOutBack = (t: number, s = 1.55) => {
  const c = Math.min(t, 1);
  return 1 + (s + 1) * Math.pow(c - 1, 3) + s * Math.pow(c - 1, 2);
};
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ── Plain style helpers (not hooks) ──────────────────────────────────────────
function fadeUp(frame: number, start: number) {
  const f = Math.max(0, frame - start);
  return {
    opacity:   interpolate(f, [0, 14], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(f, [0, 22], [22 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" })}px)`,
  };
}
function fadeIn(frame: number, start: number) {
  const f = Math.max(0, frame - start);
  return { opacity: interpolate(f, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }) };
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

// 1. PromptCompareAnimation — TitleScene, LEFT side
function PromptCompareAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 780;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const vagueOp  = interpolate(Math.max(0, f - 0),  [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const vagueTx  = interpolate(Math.max(0, f - 0),  [0, 22], [20 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const arrowOp  = interpolate(Math.max(0, f - 50), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const detailOp = interpolate(Math.max(0, f - 80), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const detailTx = interpolate(Math.max(0, f - 80), [0, 22], [20 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const cursorBlink = Math.floor(f / 18) % 2 === 0 ? 1 : 0;

  const vagueStr  = "幫我寫一封信";
  const vagueLen  = Math.floor(interpolate(Math.max(0, f), [0, 28], [0, vagueStr.length], { extrapolateRight: "clamp" }));
  const detailStr = "幫我寫一封給客戶的道歉信，出貨延誤三天，語氣真誠不卑微，200字以內";
  const detailLen = Math.floor(interpolate(Math.max(0, f - 80), [0, 90], [0, detailStr.length], { extrapolateRight: "clamp" }));

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 220 * S,
      width: 230 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 16 * S,
    }}>
      {/* Vague */}
      <div style={{ opacity: vagueOp, transform: `translateX(${vagueTx}px)` }}>
        <div style={{
          background: C.redLight, border: `1px solid ${C.redBorder}`,
          borderRadius: 10 * S, padding: `${10 * S}px ${14 * S}px`,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.red, marginBottom: 6 * S, letterSpacing: "0.06em",
          }}>❌ 模糊 Prompt</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 15 * S, color: "rgba(255,255,255,0.7)", lineHeight: 1.5,
          }}>{vagueStr.slice(0, vagueLen)}{vagueLen < vagueStr.length && <span style={{ opacity: cursorBlink, color: C.red }}>|</span>}</div>
        </div>
      </div>
      {/* Arrow */}
      <div style={{
        opacity: arrowOp, alignSelf: "center" as const,
        fontFamily: "'Space Mono', monospace", fontSize: 16 * S, color: C.muted,
      }}>↓</div>
      {/* Detailed */}
      <div style={{ opacity: detailOp, transform: `translateX(${detailTx}px)` }}>
        <div style={{
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 10 * S, padding: `${10 * S}px ${14 * S}px`,
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.primary, marginBottom: 6 * S, letterSpacing: "0.06em",
          }}>✓ 清楚 Prompt</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 13 * S, color: "rgba(255,255,255,0.85)", lineHeight: 1.6,
          }}>
            {detailStr.slice(0, detailLen)}
            <span style={{ opacity: cursorBlink, color: C.primary }}>|</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. QualityBarAnimation — Scene1, LEFT side
function QualityBarAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 1800;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const bars = [
    { label: "模糊 Prompt", fill: 0.15, color: C.red },
    { label: "普通 Prompt", fill: 0.50, color: C.yellow },
    { label: "清楚 Prompt", fill: 0.92, color: C.primary },
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 280 * S,
      width: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 20 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.06em",
      }}>AI 輸出品質</div>
      {bars.map((bar, i) => {
        const itemF = Math.max(0, f - i * 40);
        const itemOp = interpolate(itemF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const barW   = interpolate(itemF, [0, 50], [0, bar.fill * 100], { easing: E.outExpo, extrapolateRight: "clamp" });
        const pct    = Math.round(barW);
        return (
          <div key={i} style={{ opacity: itemOp }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S,
              color: "rgba(255,255,255,0.7)", marginBottom: 6 * S,
            }}>
              <span>{bar.label}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", color: bar.color, fontSize: 13 * S }}>{pct}%</span>
            </div>
            <div style={{
              height: 14 * S, background: "rgba(255,255,255,0.06)",
              borderRadius: 7 * S, overflow: "hidden",
            }}>
              <div style={{
                height: "100%", width: `${barW}%`,
                background: bar.color, borderRadius: 7 * S,
                boxShadow: `0 0 ${8 * S}px ${bar.color}88`,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 3. LandminesAnimation — Scene2, LEFT side
function LandminesAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 2100;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Local appear offsets match scene card appears: 153, 618, 1116, 1584f → minus triggerFrame=30
  const mines = [
    { label: "太短沒語境",   appear: 123  },
    { label: "沒說輸出格式", appear: 588  },
    { label: "一次丟太多",   appear: 1086 },
    { label: "沒說你是誰",   appear: 1554 },
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 260 * S,
      width: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 16 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.red, letterSpacing: "0.06em",
      }}>地雷清單</div>
      {mines.map((mine, i) => {
        const mF  = Math.max(0, f - mine.appear);
        const mOp = interpolate(mF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const mTy = interpolate(mF, [0, 22], [15 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const sc  = easeOutBack(Math.min(mF / 18, 1));
        const shakeAmp = interpolate(mF, [0, 12], [8 * S, 0], { extrapolateRight: "clamp" });
        const shakeX   = mF < 18 ? Math.sin(mF * 1.8) * shakeAmp : 0;
        return (
          <div key={i} style={{
            opacity: mOp, transform: `translateY(${mTy}px)`,
            display: "flex", alignItems: "center", gap: 10 * S,
            background: C.redLight, border: `1px solid ${C.redBorder}`,
            borderRadius: 10 * S, padding: `${8 * S}px ${12 * S}px`,
          }}>
            <span style={{ fontSize: 16 * S, transform: `scale(${sc}) translateX(${shakeX}px)`, display: "inline-block" }}>💣</span>
            <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S, color: "rgba(255,255,255,0.8)" }}>
              {mine.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 4. TechniqueCheckAnimation — Scene3, LEFT side
function TechniqueCheckAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 2700;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const techs = [
    { icon: "🎭", label: "給 AI 一個角色", appear: 136 },
    { icon: "📋", label: "說清楚輸出格式", appear: 640 },
    { icon: "📝", label: "直接給一個範例", appear: 1102 },
    { icon: "🪜", label: "複雜任務分步驟", appear: 1525 },
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 260 * S,
      width: 210 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 16 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.primary, letterSpacing: "0.06em",
      }}>改善技巧</div>
      {techs.map((tech, i) => {
        const tF  = Math.max(0, f - tech.appear);
        const tOp = interpolate(tF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const tTy = interpolate(tF, [0, 22], [15 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const sc  = easeOutBack(Math.min(tF / 20, 1));
        return (
          <div key={i} style={{
            opacity: tOp, transform: `translateY(${tTy}px)`,
            display: "flex", alignItems: "center", gap: 10 * S,
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 10 * S, padding: `${8 * S}px ${12 * S}px`,
          }}>
            <span style={{ fontSize: 16 * S, transform: `scale(${sc})`, display: "inline-block" }}>{tech.icon}</span>
            <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S, color: "rgba(255,255,255,0.85)" }}>
              {tech.label}
            </span>
            <div style={{
              marginLeft: "auto" as const,
              width: 10 * S, height: 10 * S, borderRadius: "50%",
              background: C.primary, boxShadow: `0 0 ${5 * S}px ${C.primary}`,
              transform: `scale(${sc})`,
            }} />
          </div>
        );
      })}
    </div>
  );
}

// ── Scene Components ──────────────────────────────────────────────────────────

function TitleScene({ dur }: { dur: number }) {
  const frame = useCurrentFrame();
  const topics = ["Prompt 是什麼", "四個常見地雷", "四個改善技巧"];

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
          }}>PROMPT MASTERY · 2026-04-14</span>
        </div>

        {/* Title */}
        <div style={{ ...fadeUp(frame, 25), marginBottom: 16 * S }}>
          <h1 style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 38 * S, fontWeight: 900,
            color: C.text, lineHeight: 1.2,
            margin: 0, marginBottom: 14 * S,
          }}>
            Prompt 寫不好的人<br />
            <span style={{ color: C.primary }}>都犯了這個錯</span>
          </h1>
        </div>

        {/* Subtitle */}
        <div style={{ ...fadeUp(frame, 40), marginBottom: 30 * S }}>
          <p style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 17 * S, color: C.muted, lineHeight: 1.6, margin: 0,
          }}>
            你每天都在跟 AI 說話，但 AI 給你的答案，<br />
            其實大部分是你自己決定的。
          </p>
        </div>

        {/* Topic pills */}
        <div style={{ display: "flex", gap: 12 * S, flexWrap: "wrap" as const }}>
          {topics.map((t, i) => (
            <div key={i} style={{
              ...fadeUp(frame, 55 + i * 12),
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
      <PromptCompareAnimation triggerFrame={60} />
    </SceneFade>
  );
}

function Scene1Prompt({ dur }: { dur: number }) {
  const frame = useCurrentFrame();

  // Fade out definition block before compare cards dominate
  const FADE1_START  = 800;
  const REMOVE1      = 950;
  const earlyOp = frame > FADE1_START
    ? interpolate(frame, [FADE1_START, REMOVE1], [1, 0], clamp) : 1;
  const showEarly = frame < REMOVE1;

  return (
    <SceneFade dur={dur}>
      <ContentColumn scrollUp={frame > 1300 ? { at: 1300, amount: 280 * S } : undefined}>
        {/* Section badge */}
        <div style={{ ...fadeUp(frame, 0), marginBottom: 18 * S }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8 * S,
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 99 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.primary, letterSpacing: "0.1em" }}>PART 01</span>
            <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>Prompt 是什麼？</span>
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
              fontSize: 22 * S, fontWeight: 700, color: C.text, lineHeight: 1.4,
            }}>
              <span style={{ color: C.primary }}>Prompt</span> 就是<br />「你打給 AI 的那一段話」
            </div>
          </div>
        </div>

        {/* Key insight — fades out before compare appears */}
        {showEarly && (
          <div style={{ opacity: earlyOp }}>
            <div style={{ ...fadeUp(frame, 40), marginBottom: 18 * S }}>
              <div style={{
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 12 * S, padding: `${16 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>KEY INSIGHT</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S, color: C.text, lineHeight: 1.5,
                }}>
                  AI 的輸出品質，<span style={{ color: C.yellow, fontWeight: 700 }}>八成</span>取決於你的 Prompt 品質
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compare grid */}
        <div style={{ ...fadeUp(frame, 80), marginBottom: 18 * S }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 * S }}>
            <div style={{
              background: C.redLight, border: `1px solid ${C.redBorder}`,
              borderRadius: 12 * S, padding: `${14 * S}px ${16 * S}px`,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
                color: C.red, marginBottom: 8 * S, letterSpacing: "0.08em",
              }}>❌ 模糊</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 16 * S, color: "rgba(255,255,255,0.75)", lineHeight: 1.5,
              }}>幫我寫一封信</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 13 * S, color: C.muted, marginTop: 8 * S,
              }}>→ AI 只能亂猜</div>
            </div>
            <div style={{
              background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
              borderRadius: 12 * S, padding: `${14 * S}px ${16 * S}px`,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
                color: C.primary, marginBottom: 8 * S, letterSpacing: "0.08em",
              }}>✓ 清楚</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 14 * S, color: "rgba(255,255,255,0.85)", lineHeight: 1.6,
              }}>給客戶道歉信，出貨延誤三天，語氣真誠不卑微，200字以內</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 13 * S, color: C.primary, marginTop: 8 * S,
              }}>→ 天差地遠的結果</div>
            </div>
          </div>
        </div>

        {/* Analogy box */}
        <div style={{ ...fadeUp(frame, 120) }}>
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
              fontSize: 16 * S, color: C.text, lineHeight: 1.6,
            }}>
              把 AI 想像成<span style={{ color: C.yellow, fontWeight: 700 }}>能力很強的新助理</span>——<br />
              你交代得越清楚，它做得越好；<br />
              你說「你看著辦」，它也只能亂猜。
            </div>
          </div>
        </div>
      </ContentColumn>
      <QualityBarAnimation triggerFrame={200} />
    </SceneFade>
  );
}

function Scene2Landmines({ dur }: { dur: number }) {
  const frame = useCurrentFrame();

  // Local frames when each landmine narration starts (VTT-derived)
  const mines = [
    {
      num: "01", title: "太簡短、沒有語境",
      desc: "「幫我翻譯這段話」——翻成哪種語氣？給誰看？商業文件還是社群貼文？AI 完全不知道，只能亂猜。",
      appear: 153,
    },
    {
      num: "02", title: "沒說清楚你要什麼輸出格式",
      desc: "「給我一些建議」vs「給我五條可執行建議，每條不超過兩句，條列式」——差別一目瞭然。",
      appear: 618,
    },
    {
      num: "03", title: "一次丟太多任務",
      desc: "「寫行銷計劃，整理競爭對手，分析市場趨勢」——讓 AI 疲於奔命，每件事都做得很表面。",
      appear: 1116,
    },
    {
      num: "04", title: "沒有說「你是誰」",
      desc: "AI 不知道你是工程師還是業務、新手還是老手，所以只能給你通用答案，對你不一定有用。",
      appear: 1584,
    },
  ];

  return (
    <SceneFade dur={dur}>
      <ContentColumn scrollUp={frame > 1300 ? { at: 1300, amount: 300 * S } : undefined}>
        {/* Section badge */}
        <div style={{ ...fadeUp(frame, 0), marginBottom: 18 * S }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8 * S,
            background: C.redLight, border: `1px solid ${C.redBorder}`,
            borderRadius: 99 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.red, letterSpacing: "0.1em" }}>PART 02</span>
            <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>最常見的四個 Prompt 地雷</span>
          </div>
        </div>

        {/* Landmine cards — sequential reveal, previous persist */}
        {mines.map((mine, i) => (
          <div key={i} style={{ ...fadeUp(frame, mine.appear + 10), marginBottom: 16 * S }}>
            <div style={{
              background: "rgba(10,10,10,0.9)",
              border: `1px solid rgba(255,107,107,0.2)`,
              borderLeft: `${4 * S}px solid ${C.red}`,
              borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
              padding: `${16 * S}px ${20 * S}px`,
              display: "flex", gap: 14 * S, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 18 * S, flexShrink: 0, marginTop: 2 * S }}>💣</span>
              <div>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
                  color: C.red, letterSpacing: "0.1em", marginBottom: 6 * S,
                }}>地雷 {mine.num}</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 17 * S, fontWeight: 700, color: C.text, marginBottom: 8 * S,
                }}>{mine.title}</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 16 * S, color: C.muted, lineHeight: 1.6,
                }}>{mine.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </ContentColumn>
      <LandminesAnimation triggerFrame={30} />
    </SceneFade>
  );
}

function Scene3Techniques({ dur }: { dur: number }) {
  const frame = useCurrentFrame();

  // Local frames when each technique narration starts (VTT-derived)
  const techniques = [
    {
      num: "01", icon: "🎭", title: "給 AI 一個角色",
      desc: "在 Prompt 前加「你是一個有十年經驗的行銷專家」——AI 會自動調整回答的深度和口吻。",
      appear: 186,
    },
    {
      num: "02", icon: "📋", title: "說清楚輸出格式",
      desc: "「請用條列式回答」「請分三段說明」「請用表格比較」——格式說清楚，輸出才整齊好用。",
      appear: 690,
    },
    {
      num: "03", icon: "📝", title: "直接給 AI 一個範例",
      desc: "「請模仿以下這段文字的風格：……」直接貼例子，是讓 AI 理解你期望最快的方法之一。",
      appear: 1152,
    },
    {
      num: "04", icon: "🪜", title: "複雜任務分步驟問",
      desc: "不要想一次問完所有事。先讓 AI 做第一步，確認方向再繼續，比較不容易走偏。",
      appear: 1575,
    },
  ];

  const WARNING_APPEAR = 2040;

  return (
    <SceneFade dur={dur}>
      <ContentColumn scrollUp={frame > 1800 ? { at: 1800, amount: 320 * S } : undefined}>
        {/* Section badge */}
        <div style={{ ...fadeUp(frame, 0), marginBottom: 18 * S }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8 * S,
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 99 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.primary, letterSpacing: "0.1em" }}>PART 03</span>
            <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>四個馬上可以用的改善技巧</span>
          </div>
        </div>

        {/* Technique cards — sequential reveal, previous persist */}
        {techniques.map((tech, i) => (
          <div key={i} style={{ ...fadeUp(frame, tech.appear + 10), marginBottom: 16 * S }}>
            <div style={{
              background: "rgba(10,10,10,0.9)",
              border: `1px solid ${C.primaryBorder}`,
              borderLeft: `${4 * S}px solid ${C.primary}`,
              borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
              padding: `${16 * S}px ${20 * S}px`,
              display: "flex", gap: 14 * S, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 22 * S, flexShrink: 0, marginTop: 2 * S }}>{tech.icon}</span>
              <div>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
                  color: C.primary, letterSpacing: "0.1em", marginBottom: 6 * S,
                }}>技巧 {tech.num}</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 17 * S, fontWeight: 700, color: C.text, marginBottom: 8 * S,
                }}>{tech.title}</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 16 * S, color: C.muted, lineHeight: 1.6,
                }}>{tech.desc}</div>
              </div>
            </div>
          </div>
        ))}

        {/* Warning card */}
        <div style={{ ...fadeUp(frame, WARNING_APPEAR + 10), marginBottom: 16 * S }}>
          <div style={{
            background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
            borderRadius: 12 * S, padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>⚠ 重要提醒</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 16 * S, color: C.text, lineHeight: 1.6,
            }}>
              <span style={{ color: C.yellow, fontWeight: 700 }}>Prompt 寫得好 ≠ AI 答案一定正確。</span><br />
              善用 AI，同時保持批判性思考——這才是完整的 AI 素養。
            </div>
          </div>
        </div>
      </ContentColumn>
      <TechniqueCheckAnimation triggerFrame={50} />
    </SceneFade>
  );
}

function SummaryScene({ dur }: { dur: number }) {
  const frame = useCurrentFrame();

  const recaps = [
    {
      num: "01", color: C.primary,
      title: "Prompt 就是給 AI 的指令",
      desc: "模糊的問題只會得到模糊的答案。",
    },
    {
      num: "02", color: C.red,
      title: "四個常見地雷",
      desc: "太短、沒格式、問太多、沒背景——踩到任何一個，AI 都只能亂猜。",
    },
    {
      num: "03", color: C.yellow,
      title: "四個改善技巧",
      desc: "給角色、說格式、附範例、分步驟——今天就可以開始試。",
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
        <div style={{ ...fadeUp(frame, 210), textAlign: "center" as const, marginTop: 10 * S }}>
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
export function VideoComposition_2026_04_14() {
  const frame = useCurrentFrame();

  const TITLE_FROM = 0;
  const TITLE_TO   = 846;
  const S1_FROM    = 846;
  const S1_TO      = 3039;
  const S2_FROM    = 3039;
  const S2_TO      = 5283;
  const S3_FROM    = 5283;
  const S3_TO      = 8199;
  const SUM_FROM   = 8199;
  const SUM_TO     = 8907;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Background />
      <Audio src={staticFile("audio/2026-04-14-processed.wav")} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fadeIn  = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fadeOut = interpolate(f, [TOTAL_FRAMES_2026_04_14 - 150, TOTAL_FRAMES_2026_04_14], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return Math.min(fadeIn, fadeOut);
        }}
        loop
      />

      <Sequence from={TITLE_FROM} durationInFrames={TITLE_TO - TITLE_FROM}>
        <TitleScene dur={TITLE_TO - TITLE_FROM} />
      </Sequence>

      <Sequence from={S1_FROM} durationInFrames={S1_TO - S1_FROM}>
        <Scene1Prompt dur={S1_TO - S1_FROM} />
      </Sequence>

      <Sequence from={S2_FROM} durationInFrames={S2_TO - S2_FROM}>
        <Scene2Landmines dur={S2_TO - S2_FROM} />
      </Sequence>

      <Sequence from={S3_FROM} durationInFrames={S3_TO - S3_FROM}>
        <Scene3Techniques dur={S3_TO - S3_FROM} />
      </Sequence>

      <Sequence from={SUM_FROM} durationInFrames={SUM_TO - SUM_FROM}>
        <SummaryScene dur={SUM_TO - SUM_FROM} />
      </Sequence>

      <ProgressBar globalFrame={frame} />
      <IMessageOverlay globalFrame={frame} />
    </AbsoluteFill>
  );
}
