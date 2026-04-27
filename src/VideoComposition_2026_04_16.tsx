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
// TitleScene   0s    → 27.44s  →    0–823    VTT 00:27.440
// Scene1      27.44s → 122.36s →  823–3671   VTT 02:02.360
// Scene2     122.36s → 215.36s → 3671–6461   VTT 03:35.360
// Scene3     215.36s → 324.36s → 6461–9731   VTT 05:24.360
// Summary    324.36s → 368.36s → 9731–11051  VTT 06:08.360
export const TOTAL_FRAMES_2026_04_16 = 11051;

const CHAPTERS = [
  { label: "今日焦點",        start: 0     },
  { label: "AI Agent 是什麼", start: 823   },
  { label: "為什麼區別重要",  start: 3671  },
  { label: "實務上怎麼運用",  start: 6461  },
  { label: "重點整理",        start: 9731  },
] as const;

// ── iMessage callouts ─────────────────────────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  {
    from: 3050, to: 3560,
    sender: "想一想",
    text: "如果 AI Agent 能自主做決定，誰來決定它應該做什麼？界限在哪裡？",
  },
  {
    from: 5900, to: 6400,
    sender: "反思一下",
    text: "當 AI Agent 出錯時，誰應該負責？AI 開發商、企業、還是使用者？",
  },
  {
    from: 9200, to: 9680,
    sender: "值得思考",
    text: "你的日常工作中，哪些任務適合委派給 AI Agent？哪些應該親力親為？",
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

// MG-A: AgentVsChatDiagram — TitleScene, LEFT side
// triggerFrame=45 (within 823f scene)
function AgentVsChatDiagram({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 720;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const rows = [
    { label: "聊天 AI", tag: "被動回應", color: C.muted,   icon: "💬", appear: 0   },
    { label: "AI Agent", tag: "主動行動", color: C.primary, icon: "🤖", appear: 90  },
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 230 * S,
      width: 215 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 18 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.06em",
      }}>主動 vs 被動</div>
      {rows.map((row, i) => {
        const rF  = Math.max(0, f - row.appear);
        const rOp = interpolate(rF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const rTy = interpolate(rF, [0, 22], [15 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: rOp, transform: `translateY(${rTy}px)`,
            background: i === 1 ? C.primaryLight : "rgba(10,10,10,0.9)",
            border: `1px solid ${row.color}33`,
            borderLeft: `${3 * S}px solid ${row.color}`,
            borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
            padding: `${10 * S}px ${14 * S}px`,
            display: "flex", alignItems: "center", gap: 10 * S,
          }}>
            <span style={{ fontSize: 14 * S }}>{row.icon}</span>
            <div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
                color: row.color, fontWeight: 700,
              }}>{row.label}</div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
                color: C.muted, marginTop: 2 * S,
              }}>{row.tag}</div>
            </div>
          </div>
        );
      })}
      {/* Arrow */}
      <div style={{
        opacity: interpolate(Math.max(0, f - 150), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
        fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
        color: C.muted, textAlign: "center" as const,
      }}>↑ 本質差異</div>
    </div>
  );
}

// MG-B: PassiveStepsAnimation — Scene1, LEFT side
// triggerFrame=181 in scene-local frames
// VTT 00:33.480 → local f=181 → component trigger
function PassiveStepsAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 1100;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const titleOp = interpolate(Math.max(0, f - 0), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const steps = [
    { label: "指令 1", desc: "幫我搜集這些數據", appear: 194 }, // VTT 00:39.940 → local 375 → comp 194
    { label: "指令 2", desc: "整理成表格",       appear: 240 }, // VTT 00:41.480 → local 421 → comp 240
    { label: "指令 3", desc: "寫成段落",         appear: 306 }, // VTT 00:43.680 → local 487 → comp 306
    { label: "等待…",  desc: "每步都要你催",     appear: 366 }, // VTT 00:45.680 → local 547 → comp 366
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 250 * S,
      width: 215 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
    }}>
      <div style={{
        opacity: titleOp,
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.06em",
      }}>聊天 AI 的方式</div>
      {steps.map((step, i) => {
        const sF  = Math.max(0, f - step.appear);
        const sOp = interpolate(sF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const sTy = interpolate(sF, [0, 22], [12 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const isLast = i === steps.length - 1;
        return (
          <div key={i} style={{
            opacity: sOp, transform: `translateY(${sTy}px)`,
            display: "flex", alignItems: "center", gap: 10 * S,
            background: isLast ? C.redLight : "rgba(10,10,10,0.9)",
            border: `1px solid ${isLast ? C.red : "rgba(255,255,255,0.08)"}33`,
            borderRadius: 8 * S,
            padding: `${7 * S}px ${10 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 9 * S,
              color: isLast ? C.red : C.yellow,
              minWidth: 45 * S,
            }}>{step.label}</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 12 * S,
              color: "rgba(255,255,255,0.7)",
            }}>{step.desc}</div>
          </div>
        );
      })}
    </div>
  );
}

// MG-C: AgentToolsAnimation — Scene1, LEFT side (after PassiveStepsAnimation)
// triggerFrame=1341 in scene-local frames
// VTT 01:12.120 → local f=1341 → component trigger
function AgentToolsAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 1400;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const titleOp = interpolate(Math.max(0, f - 0), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const tools = [
    { icon: "📅", label: "調用日曆",   color: C.primary, appear: 105 }, // VTT 01:15.620 → local 1446 → comp 105
    { icon: "💻", label: "執行程式碼", color: C.yellow,  appear: 225 }, // VTT 01:19.620 → local 1566 → comp 225
    { icon: "🗄️", label: "查詢數據庫", color: C.yellow,  appear: 255 }, // VTT 01:19.620 → stagger +30
    { icon: "📧", label: "發送電子郵件",color: C.yellow,  appear: 285 }, // VTT 01:19.620 → stagger +60
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 240 * S,
      width: 215 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
    }}>
      <div style={{
        opacity: titleOp,
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.primary, letterSpacing: "0.06em",
      }}>Agent 能使用工具</div>
      {tools.map((tool, i) => {
        const tF  = Math.max(0, f - tool.appear);
        const tOp = interpolate(tF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const tTy = interpolate(tF, [0, 22], [12 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: tOp, transform: `translateY(${tTy}px)`,
            display: "flex", alignItems: "center", gap: 10 * S,
            background: C.primaryLight,
            border: `1px solid ${tool.color}33`,
            borderRadius: 8 * S,
            padding: `${7 * S}px ${12 * S}px`,
          }}>
            <span style={{ fontSize: 14 * S }}>{tool.icon}</span>
            <span style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S,
              color: "rgba(255,255,255,0.85)",
            }}>{tool.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// MG-D: EfficiencyAnimation — Scene2, LEFT side
// triggerFrame=210 in scene-local frames
// VTT 02:09.360 → local f=210 → component trigger
function EfficiencyAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 780;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const titleOp = interpolate(Math.max(0, f - 0), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const rows = [
    {
      icon: "💬", label: "聊天 AI", tag: "單次提問",
      use: "查事實 / 寫點子", color: C.muted,
      appear: 60,  // VTT 02:11.360 → local 270 → comp 60
    },
    {
      icon: "🤖", label: "AI Agent", tag: "自主執行",
      use: "自動化重複流程", color: C.primary,
      appear: 375, // VTT 02:21.860 → local 585 → comp 375
    },
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 250 * S,
      width: 215 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 16 * S,
    }}>
      <div style={{
        opacity: titleOp,
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.06em",
      }}>效率角度：選對工具</div>
      {rows.map((row, i) => {
        const rF  = Math.max(0, f - row.appear);
        const rOp = interpolate(rF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const rTy = interpolate(rF, [0, 22], [12 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: rOp, transform: `translateY(${rTy}px)`,
            background: i === 1 ? C.primaryLight : "rgba(10,10,10,0.9)",
            border: `1px solid ${row.color}33`,
            borderLeft: `${3 * S}px solid ${row.color}`,
            borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
            padding: `${10 * S}px ${14 * S}px`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 6 * S }}>
              <span style={{ fontSize: 14 * S }}>{row.icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
                color: row.color, fontWeight: 700,
              }}>{row.label}</span>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 9 * S,
                color: C.muted,
              }}>{row.tag}</span>
            </div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 12 * S,
              color: "rgba(255,255,255,0.65)",
            }}>→ {row.use}</div>
          </div>
        );
      })}
    </div>
  );
}

// MG-E: TrustControlAnimation — Scene2, LEFT side (after EfficiencyAnimation)
// triggerFrame=1050 in scene-local frames
// VTT 02:37.360 → local f=1050 → component trigger
function TrustControlAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 800;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const titleOp = interpolate(Math.max(0, f - 0), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const items = [
    { label: "聊天 AI 每步可見",   sub: "你可隨時查看、叫停",    color: C.primary, appear: 75  }, // VTT 02:39.860 → local 1125 → comp 75
    { label: "Agent 有自主性",    sub: "會做未明確指示的決定",   color: C.yellow,  appear: 285 }, // VTT 02:46.860 → local 1335 → comp 285
    { label: "新的信任挑戰",      sub: "決定安全嗎？符合你的價值觀？", color: C.red, appear: 450 }, // VTT 02:52.360 → local 1500 → comp 450
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 250 * S,
      width: 215 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
    }}>
      <div style={{
        opacity: titleOp,
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.06em",
      }}>信任與控制</div>
      {items.map((item, i) => {
        const iF  = Math.max(0, f - item.appear);
        const iOp = interpolate(iF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const iTy = interpolate(iF, [0, 22], [12 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: iOp, transform: `translateY(${iTy}px)`,
            background: "rgba(10,10,10,0.9)",
            border: `1px solid ${item.color}33`,
            borderLeft: `${3 * S}px solid ${item.color}`,
            borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
            padding: `${8 * S}px ${12 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S,
              color: item.color, fontWeight: 700,
            }}>{item.label}</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 11 * S,
              color: C.muted, marginTop: 3 * S,
            }}>{item.sub}</div>
          </div>
        );
      })}
    </div>
  );
}

// MG-F: UseCaseAnimation — Scene2, LEFT side (after TrustControlAnimation)
// triggerFrame=1905 in scene-local frames
// VTT 03:05.860 → local f=1905 → component trigger
function UseCaseAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 820;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const titleOp = interpolate(Math.max(0, f - 0), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const rows = [
    {
      icon: "💬", color: C.muted, label: "聊天 AI 適合",
      tags: ["知識工作", "創意思考", "學習解釋"],
      appear: 75, // VTT 03:08.360 → local 1980 → comp 75
    },
    {
      icon: "🤖", color: C.primary, label: "AI Agent 適合",
      tags: ["自動化", "流程管理", "多步驟任務"],
      appear: 225, // VTT 03:13.360 → local 2130 → comp 225
    },
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 250 * S,
      width: 215 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 16 * S,
    }}>
      <div style={{
        opacity: titleOp,
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.06em",
      }}>應用場景比較</div>
      {rows.map((row, i) => {
        const rF  = Math.max(0, f - row.appear);
        const rOp = interpolate(rF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const rTy = interpolate(rF, [0, 22], [12 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: rOp, transform: `translateY(${rTy}px)`,
            background: i === 1 ? C.primaryLight : "rgba(10,10,10,0.9)",
            border: `1px solid ${row.color}33`,
            borderRadius: 10 * S,
            padding: `${10 * S}px ${12 * S}px`,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 8 * S,
            }}>
              <span style={{ fontSize: 13 * S }}>{row.icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S,
                color: row.color, fontWeight: 700,
              }}>{row.label}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 * S }}>
              {row.tags.map((tag, j) => (
                <span key={j} style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 9 * S,
                  color: C.muted, background: "rgba(255,255,255,0.06)",
                  borderRadius: 4 * S, padding: `${3 * S}px ${8 * S}px`,
                }}>{tag}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// MG-G: DecisionCriteriaAnimation — Scene3, LEFT side
// triggerFrame=270 in scene-local frames
// VTT 03:44.360 → local f=270 → component trigger
function DecisionCriteriaAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 760;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const titleOp = interpolate(Math.max(0, f - 0), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const rows = [
    {
      icon: "💬", label: "單個問題", example: "怎麼煮蛋 / 廣告文案",
      result: "聊天 AI · 30 秒", color: C.muted,
      appear: 60, // VTT 03:46.360 → local 330 → comp 60
    },
    {
      icon: "🤖", label: "多步驟重複", example: "自動摘要新聞 / 待辦管理",
      result: "AI Agent 的舞台", color: C.primary,
      appear: 330, // VTT 03:55.360 → local 600 → comp 330
    },
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 250 * S,
      width: 215 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 16 * S,
    }}>
      <div style={{
        opacity: titleOp,
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.06em",
      }}>判斷標準：步驟數量</div>
      {rows.map((row, i) => {
        const rF  = Math.max(0, f - row.appear);
        const rOp = interpolate(rF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const rTy = interpolate(rF, [0, 22], [12 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: rOp, transform: `translateY(${rTy}px)`,
            background: i === 1 ? C.primaryLight : "rgba(10,10,10,0.9)",
            border: `1px solid ${row.color}33`,
            borderLeft: `${3 * S}px solid ${row.color}`,
            borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
            padding: `${10 * S}px ${12 * S}px`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 5 * S }}>
              <span style={{ fontSize: 13 * S }}>{row.icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S,
                color: row.color, fontWeight: 700,
              }}>{row.label}</span>
            </div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 11 * S,
              color: C.muted, marginBottom: 4 * S,
            }}>{row.example}</div>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: row.color,
            }}>→ {row.result}</div>
          </div>
        );
      })}
    </div>
  );
}

// MG-H: ThreeRemindersAnimation — Scene3, LEFT side (after DecisionCriteriaAnimation)
// triggerFrame=1080 in scene-local frames
// VTT 04:11.360 → local f=1080 → component trigger
function ThreeRemindersAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 2100;
  const envelope = interpolate(f, [0, 15, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const titleOp = interpolate(Math.max(0, f - 0), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const reminders = [
    { num: "01", icon: "🔍", label: "透明度",   sub: "確保能看到 Agent 在做什麼",       color: C.primary, appear: 90  }, // VTT 04:14.360 → local 1170 → comp 90
    { num: "02", icon: "🔒", label: "權限邊界", sub: "不給超過必要的權限",               color: C.yellow,  appear: 510 }, // VTT 04:28.360 → local 1590 → comp 510
    { num: "03", icon: "👁️", label: "人類監督", sub: "關鍵決策需人類覆核才執行",         color: C.red,     appear: 930 }, // VTT 04:42.360 → local 2010 → comp 930
  ];

  return (
    <div style={{
      position: "absolute", left: 60 * S, top: 230 * S,
      width: 215 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
    }}>
      <div style={{
        opacity: titleOp,
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.primary, letterSpacing: "0.06em",
      }}>使用 Agent 三提醒</div>
      {reminders.map((r, i) => {
        const rF  = Math.max(0, f - r.appear);
        const rOp = interpolate(rF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const rTy = interpolate(rF, [0, 22], [12 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: rOp, transform: `translateY(${rTy}px)`,
            display: "flex", gap: 10 * S, alignItems: "flex-start",
            background: "rgba(10,10,10,0.9)",
            border: `1px solid ${r.color}33`,
            borderRadius: 10 * S,
            padding: `${8 * S}px ${12 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 12 * S,
              color: r.color, fontWeight: 700, flexShrink: 0,
            }}>{r.num}</div>
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 6 * S, marginBottom: 3 * S,
              }}>
                <span style={{ fontSize: 12 * S }}>{r.icon}</span>
                <span style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 13 * S,
                  color: r.color, fontWeight: 700,
                }}>{r.label}</span>
              </div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 11 * S,
                color: C.muted,
              }}>{r.sub}</div>
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
  const topics = ["AI Agent 是什麼", "為什麼區別重要", "實務上怎麼運用"];

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
          }}>AI AGENT · 2026-04-16</span>
        </div>

        {/* Title */}
        <div style={{ ...fadeUp(frame, 20), marginBottom: 16 * S }}>
          <h1 style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 34 * S, fontWeight: 900,
            color: C.text, lineHeight: 1.25,
            margin: 0, marginBottom: 14 * S,
          }}>
            AI Agent 和一般 AI 聊天，<br />
            <span style={{ color: C.primary }}>有什麼本質差異？</span>
          </h1>
        </div>

        {/* Core insight */}
        <div style={{ ...fadeUp(frame, 36), marginBottom: 28 * S }}>
          <div style={{
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 12 * S, padding: `${14 * S}px ${18 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>CORE INSIGHT</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 17 * S, color: C.text, lineHeight: 1.5,
            }}>
              <span style={{ color: C.primary, fontWeight: 700 }}>Agent</span> 自主規劃執行，
              <span style={{ color: C.muted }}>聊天 AI</span> 只回應提問——<br />
              一個<span style={{ color: C.primary, fontWeight: 700 }}>主動出擊</span>，一個<span style={{ color: C.muted }}>被動等待</span>
            </div>
          </div>
        </div>

        {/* Topic pills */}
        <div style={{ display: "flex", gap: 12 * S, flexWrap: "wrap" as const }}>
          {topics.map((t, i) => (
            <div key={i} style={{
              ...fadeUp(frame, 54 + i * 12),
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
      <AgentVsChatDiagram triggerFrame={45} />
    </SceneFade>
  );
}

function Scene1AgentVsChat({ dur }: { dur: number }) {
  const frame = useCurrentFrame();

  // Fade out PassiveSteps before AgentTools appears
  // PassiveSteps ends at local ~1281 (triggerFrame=181 + DURATION=1100)
  // AgentTools starts at local 1341
  // Passive fade: 1200→1300
  const FADE1_START = 1200;
  const REMOVE1     = 1310;
  const passiveOp   = frame > FADE1_START
    ? interpolate(frame, [FADE1_START, REMOVE1], [1, 0], clamp) : 1;

  return (
    <SceneFade dur={dur}>
      <ContentColumn scrollUp={frame > 1800 ? { at: 1800, amount: 280 * S } : undefined}>
        {/* Section badge */}
        <div style={{ ...fadeUp(frame, 0), marginBottom: 18 * S }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8 * S,
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 99 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.primary, letterSpacing: "0.1em" }}>PART 01</span>
            <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>AI Agent 是什麼？</span>
          </div>
        </div>

        {/* Definition card */}
        <div style={{ ...fadeUp(frame, 12), marginBottom: 18 * S }}>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.surfaceBorder}`,
            borderLeft: `${4 * S}px solid ${C.primary}`,
            borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
            padding: `${18 * S}px ${22 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.muted, letterSpacing: "0.08em", marginBottom: 10 * S,
            }}>DEFINITION</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 20 * S, fontWeight: 700, color: C.text, lineHeight: 1.4,
            }}>
              <span style={{ color: C.primary }}>AI Agent</span> = 自主規劃 + 執行任務<br />
              <span style={{ fontSize: 16 * S, color: C.muted, fontWeight: 400 }}>不需要每步都給指令</span>
            </div>
          </div>
        </div>

        {/* Analogy: market report */}
        <div style={{ ...fadeUp(frame, 181), marginBottom: 18 * S }}>
          {/* VTT 00:33.480 → local f=181 */}
          <div style={{
            background: C.surface,
            borderLeft: `${4 * S}px solid ${C.yellow}`,
            borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
            border: `1px solid ${C.surfaceBorder}`,
            padding: `${14 * S}px ${18 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.yellow, marginBottom: 8 * S, letterSpacing: "0.08em",
            }}>ANALOGY</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 17 * S, color: C.text, lineHeight: 1.6,
            }}>
              整理市場報告——<br />
              聊天 AI：<span style={{ color: C.red }}>一步步催促</span><br />
              AI Agent：<span style={{ color: C.primary }}>告訴目標，自己走完</span>
            </div>
          </div>
        </div>

        {/* Passive steps fade out, then agent contrast appears */}
        <div style={{ opacity: passiveOp }}>
          <div style={{ ...fadeUp(frame, 375), marginBottom: 18 * S }}>
            {/* VTT 00:39.940 → local f=375 */}
            <div style={{
              background: C.redLight,
              border: `1px solid ${C.redBorder}`,
              borderRadius: 12 * S, padding: `${14 * S}px ${18 * S}px`,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
                color: C.red, letterSpacing: "0.08em", marginBottom: 8 * S,
              }}>聊天 AI 限制</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 17 * S, color: C.text, lineHeight: 1.6,
              }}>
                被動、單次、純對話——<br />
                <span style={{ color: C.red }}>它只能在你提問時才動作</span>
              </div>
            </div>
          </div>
        </div>

        {/* Agent proactive + tools — appears after VTT 01:12.120 */}
        <div style={{ ...fadeUp(frame, 1341), marginBottom: 18 * S }}>
          {/* VTT 01:12.120 → local f=1341 */}
          <div style={{
            background: C.primaryLight,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 12 * S, padding: `${14 * S}px ${18 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>AI AGENT 優勢</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 17 * S, color: C.text, lineHeight: 1.6,
            }}>
              主動、連續、<span style={{ color: C.primary, fontWeight: 700 }}>有行動能力</span>——<br />
              能調用工具，真實行動，不只生成文字
            </div>
          </div>
        </div>

        {/* Summary contrast card */}
        <div style={{ ...fadeUp(frame, 2704), marginBottom: 18 * S }}>
          {/* VTT 01:30.120 → local f=2704-823=1881; appears at local 1881 */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 * S,
          }}>
            <div style={{
              background: "rgba(10,10,10,0.9)",
              border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: 12 * S, padding: `${14 * S}px ${16 * S}px`,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
                color: C.muted, marginBottom: 8 * S,
              }}>聊天 AI</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 14 * S, color: C.muted, lineHeight: 1.5,
              }}>被動・單次・純對話</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 12 * S, color: "rgba(255,255,255,0.4)", marginTop: 6 * S,
              }}>像聰明的知識庫</div>
            </div>
            <div style={{
              background: C.primaryLight,
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 12 * S, padding: `${14 * S}px ${16 * S}px`,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
                color: C.primary, marginBottom: 8 * S,
              }}>AI Agent</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 14 * S, color: C.primary, lineHeight: 1.5, fontWeight: 700,
              }}>主動・連續・有行動力</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 12 * S, color: "rgba(124,255,178,0.6)", marginTop: 6 * S,
              }}>像智能助理</div>
            </div>
          </div>
        </div>
      </ContentColumn>
      <PassiveStepsAnimation triggerFrame={181} />
      <AgentToolsAnimation triggerFrame={1341} />
    </SceneFade>
  );
}

function Scene2WhyMatters({ dur }: { dur: number }) {
  const frame = useCurrentFrame();

  // Fade out each MG before next one starts
  // EfficiencyAnimation: 210→990 (DURATION=780) — fades out at 990
  // TrustControlAnimation: 1050→1850 (DURATION=800) — fades out at 1850
  // UseCaseAnimation: 1905→2725 (DURATION=820) — fades out at 2725

  return (
    <SceneFade dur={dur}>
      <ContentColumn scrollUp={frame > 1600 ? { at: 1600, amount: 260 * S } : undefined}>
        {/* Section badge */}
        <div style={{ ...fadeUp(frame, 0), marginBottom: 18 * S }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8 * S,
            background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
            borderRadius: 99 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.yellow, letterSpacing: "0.1em" }}>PART 02</span>
            <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>為什麼這個區別很重要？</span>
          </div>
        </div>

        {/* Intro card */}
        <div style={{ ...fadeUp(frame, 15), marginBottom: 18 * S }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.surfaceBorder}`,
            borderLeft: `${4 * S}px solid ${C.yellow}`,
            borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
            padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 18 * S, color: C.text, lineHeight: 1.55,
            }}>
              理解差異，影響你的<br />
              <span style={{ color: C.yellow, fontWeight: 700 }}>效率</span>和
              <span style={{ color: C.red, fontWeight: 700 }}>安全性</span>
            </div>
          </div>
        </div>

        {/* Efficiency card — VTT 02:09.360 → local 210 */}
        <div style={{ ...fadeUp(frame, 210), marginBottom: 16 * S }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.surfaceBorder}`,
            borderRadius: 12 * S, padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>01 · 效率角度</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 16 * S, color: C.text, lineHeight: 1.55,
            }}>
              用錯工具，不只浪費時間——<br />
              <span style={{ color: C.yellow }}>聊天 AI</span>：單問題快速高效<br />
              <span style={{ color: C.primary }}>AI Agent</span>：自動化重複流程
            </div>
          </div>
        </div>

        {/* Trust card — VTT 02:37.360 → local 1050 */}
        <div style={{ ...fadeUp(frame, 1050), marginBottom: 16 * S }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.surfaceBorder}`,
            borderRadius: 12 * S, padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>02 · 信任與控制</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 16 * S, color: C.text, lineHeight: 1.55,
            }}>
              Agent 的自主性帶來新挑戰——<br />
              <span style={{ color: C.red }}>它會做你沒有明確指示的決定</span>
            </div>
          </div>
        </div>

        {/* Use case card — VTT 03:05.860 → local 1905 */}
        <div style={{ ...fadeUp(frame, 1905), marginBottom: 16 * S }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.surfaceBorder}`,
            borderRadius: 12 * S, padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.red, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>03 · 應用場景</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 16 * S, color: C.text, lineHeight: 1.55,
            }}>
              <span style={{ color: C.muted }}>聊天 AI</span>：知識 / 創意 / 學習<br />
              <span style={{ color: C.primary }}>AI Agent</span>：自動化 / 流程 / 多步驟
            </div>
          </div>
        </div>
      </ContentColumn>
      <EfficiencyAnimation triggerFrame={210} />
      <TrustControlAnimation triggerFrame={1050} />
      <UseCaseAnimation triggerFrame={1905} />
    </SceneFade>
  );
}

function Scene3HowToUse({ dur }: { dur: number }) {
  const frame = useCurrentFrame();

  return (
    <SceneFade dur={dur}>
      <ContentColumn scrollUp={frame > 2000 ? { at: 2000, amount: 280 * S } : undefined}>
        {/* Section badge */}
        <div style={{ ...fadeUp(frame, 0), marginBottom: 18 * S }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8 * S,
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 99 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.primary, letterSpacing: "0.1em" }}>PART 03</span>
            <span style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text }}>實務上怎麼運用？</span>
          </div>
        </div>

        {/* Decision card */}
        <div style={{ ...fadeUp(frame, 15), marginBottom: 18 * S }}>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.surfaceBorder}`,
            borderLeft: `${4 * S}px solid ${C.primary}`,
            borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
            padding: `${16 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>判斷標準</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 18 * S, fontWeight: 700, color: C.text, lineHeight: 1.45,
            }}>
              你的任務需要多少<br />
              <span style={{ color: C.primary }}>步驟和自主判斷</span>？
            </div>
          </div>
        </div>

        {/* Single task card — VTT 03:44.360 → local 270 */}
        <div style={{ ...fadeUp(frame, 270), marginBottom: 16 * S }}>
          <div style={{
            background: "rgba(10,10,10,0.9)", border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 12 * S, padding: `${14 * S}px ${18 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>單個問題</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 16 * S, color: C.text, lineHeight: 1.55,
            }}>
              怎麼煮完美的蛋 / 想廣告文案<br />
              <span style={{ color: C.yellow }}>→ 用聊天 AI，30 秒有答案</span>
            </div>
          </div>
        </div>

        {/* Multi-step card — VTT 03:55.360 → local 600 */}
        <div style={{ ...fadeUp(frame, 600), marginBottom: 18 * S }}>
          <div style={{
            background: C.primaryLight,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 12 * S, padding: `${14 * S}px ${18 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 10 * S,
              color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
            }}>重複 · 多步驟工作</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 16 * S, color: C.text, lineHeight: 1.55,
            }}>
              每天自動摘要新聞 / 管理待辦優先級<br />
              <span style={{ color: C.primary, fontWeight: 700 }}>→ 這是 AI Agent 的舞台</span>
            </div>
          </div>
        </div>

        {/* Three reminders title — VTT 04:11.360 → local 1080 */}
        <div style={{ ...fadeUp(frame, 1080), marginBottom: 16 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.primary, letterSpacing: "0.1em",
          }}>使用 AI Agent 三點提醒：</div>
        </div>

        {/* Reminder 1: 透明度 — VTT 04:14.360 → local 1170 */}
        <div style={{ ...fadeUp(frame, 1170), marginBottom: 14 * S }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.primaryBorder}`,
            borderLeft: `${4 * S}px solid ${C.primary}`,
            borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
            padding: `${12 * S}px ${16 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
              color: C.primary, fontWeight: 700, marginBottom: 6 * S,
            }}>01 透明度</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 15 * S,
              color: "rgba(255,255,255,0.75)", lineHeight: 1.5,
            }}>確保你能看到 Agent 在做什麼，黑箱操作很危險</div>
          </div>
        </div>

        {/* Reminder 2: 權限邊界 — VTT 04:28.360 → local 1590 */}
        <div style={{ ...fadeUp(frame, 1590), marginBottom: 14 * S }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.yellowBorder}`,
            borderLeft: `${4 * S}px solid ${C.yellow}`,
            borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
            padding: `${12 * S}px ${16 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
              color: C.yellow, fontWeight: 700, marginBottom: 6 * S,
            }}>02 權限邊界</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 15 * S,
              color: "rgba(255,255,255,0.75)", lineHeight: 1.5,
            }}>不要給超過必要的權限，這是基本的防守</div>
          </div>
        </div>

        {/* Reminder 3: 人類監督 — VTT 04:42.360 → local 2010 */}
        <div style={{ ...fadeUp(frame, 2010), marginBottom: 14 * S }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.redBorder}`,
            borderLeft: `${4 * S}px solid ${C.red}`,
            borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
            padding: `${12 * S}px ${16 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 16 * S,
              color: C.red, fontWeight: 700, marginBottom: 6 * S,
            }}>03 人類監督</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 15 * S,
              color: "rgba(255,255,255,0.75)", lineHeight: 1.5,
            }}>關鍵決策需人類覆核，盲目自動化很危險</div>
          </div>
        </div>
      </ContentColumn>
      <DecisionCriteriaAnimation triggerFrame={270} />
      <ThreeRemindersAnimation triggerFrame={1080} />
    </SceneFade>
  );
}

function SummaryScene({ dur }: { dur: number }) {
  const frame = useCurrentFrame();

  const recaps = [
    {
      num: "01", theme: "主動性 vs 被動性",
      insight: "AI Agent 自主規劃執行多步任務，聊天 AI 只回應單次提問",
      color: C.primary,
      appear: 90,   // VTT 05:27.360 → local f=90
    },
    {
      num: "02", theme: "工具使用能力",
      insight: "Agent 能調用外部工具真實行動，聊天 AI 只生成文字建議",
      color: C.yellow,
      appear: 510,  // VTT 05:41.360 → local f=510
    },
    {
      num: "03", theme: "安全與責任",
      insight: "使用 Agent 需要透明度、權限邊界和人類監督才能安全有效",
      color: C.red,
      appear: 840,  // VTT 05:52.360 → local f=840
    },
  ];

  return (
    <SceneFade dur={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{ ...fadeUp(frame, 0), marginBottom: 22 * S }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10 * S,
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 99 * S, padding: `${7 * S}px ${18 * S}px`,
          }}>
            <div style={{
              width: 8 * S, height: 8 * S, borderRadius: "50%",
              background: C.primary, boxShadow: `0 0 ${8 * S}px ${C.primary}`,
            }} />
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: 12 * S,
              color: C.primary, letterSpacing: "0.1em",
            }}>重點整理</span>
          </div>
        </div>

        {/* Recap cards */}
        {recaps.map((r, i) => (
          <div key={i} style={{ ...fadeUp(frame, r.appear), marginBottom: 18 * S }}>
            <div style={{
              background: C.surface,
              border: `1px solid ${r.color}22`,
              borderLeft: `${4 * S}px solid ${r.color}`,
              borderRadius: `0 ${12 * S}px ${12 * S}px 0`,
              padding: `${18 * S}px ${22 * S}px`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 10 * S }}>
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: r.color, letterSpacing: "0.1em",
                }}>{r.num}</span>
                <span style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: r.color, fontWeight: 700,
                }}>{r.theme}</span>
              </div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 16 * S, color: "rgba(255,255,255,0.8)", lineHeight: 1.6,
              }}>{r.insight}</div>
            </div>
          </div>
        ))}
      </ContentColumn>
    </SceneFade>
  );
}

// ── Main Composition ──────────────────────────────────────────────────────────
export function VideoComposition_2026_04_16() {
  const frame = useCurrentFrame();

  const TITLE_DUR   = 823;
  const S1_START    = 823;
  const S1_DUR      = 2848;
  const S2_START    = 3671;
  const S2_DUR      = 2790;
  const S3_START    = 6461;
  const S3_DUR      = 3270;
  const SUM_START   = 9731;
  const SUM_DUR     = 1320;

  return (
    <AbsoluteFill style={{ width: W, height: H }}>
      <Background />

      {/* Audio — main voice */}
      <Audio src={staticFile("audio/2026-04-16-processed.wav")} />

      {/* Background music — fade in 0→45f, fade out last 150f */}
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v  = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_04_16 - 150, TOTAL_FRAMES_2026_04_16], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return Math.min(fi, fo);
        }}
        loop
      />

      <ProgressBar globalFrame={frame} />
      <IMessageOverlay globalFrame={frame} />

      <Sequence from={0} durationInFrames={TITLE_DUR}>
        <TitleScene dur={TITLE_DUR} />
      </Sequence>
      <Sequence from={S1_START} durationInFrames={S1_DUR}>
        <Scene1AgentVsChat dur={S1_DUR} />
      </Sequence>
      <Sequence from={S2_START} durationInFrames={S2_DUR}>
        <Scene2WhyMatters dur={S2_DUR} />
      </Sequence>
      <Sequence from={S3_START} durationInFrames={S3_DUR}>
        <Scene3HowToUse dur={S3_DUR} />
      </Sequence>
      <Sequence from={SUM_START} durationInFrames={SUM_DUR}>
        <SummaryScene dur={SUM_DUR} />
      </Sequence>
    </AbsoluteFill>
  );
}
