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
const W = 1280 * S;
const H = 720 * S;
const NAV_H = 50 * S;
const CONTAINER_W = 640 * S;
const COL_LEFT = (W - CONTAINER_W) / 2;
const SUBTITLE_SAFE = 120 * S;
const CONTENT_GAP = 10 * S;
const CONTENT_TOP = NAV_H + CONTENT_GAP;
const CONTENT_H = H - CONTENT_TOP - SUBTITLE_SAFE;

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
const NOTIF_W = 290 * S;
const NOTIF_TOP = 12 * S;
const NOTIF_RIGHT = 20 * S;
const NOTIF_SLOT = 148 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// title:    0    → 1018   (scene1 first "先來解釋為什麼這樣做有效" at 33.92s)
// scene1:   1018 → 2934   (scene2 first "Chain of Thought 的重要性" at 97.80s)
// scene2:   2934 → 4722   (scene3 first "怎麼用很簡單一句話就夠了" at 157.40s)
// scene3:   4722 → 7076   (summary first "好今天的重點整理" at 235.88s)
// summary:  7076 → 8109   (last cue end 270.28s)
export const SCENES_2026_05_18 = {
  title: { from: 0, to: 1018 },
  scene1: { from: 1018, to: 2934 },
  scene2: { from: 2934, to: 4722 },
  scene3: { from: 4722, to: 7076 },
  summary: { from: 7076, to: 8109 },
} as const;
export const TOTAL_FRAMES_2026_05_18 = 8109;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "為什麼有效", start: 1018 },
  { label: "推理可見", start: 2934 },
  { label: "怎麼用", start: 4722 },
  { label: "重點整理", start: 7076 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout {
  from: number;
  to: number;
  sender: string;
  text: string;
}
const ALL_CALLOUTS: Callout[] = [
  {
    from: 2400,
    to: 2934,
    sender: "想一想",
    text: "你平常遇到複雜問題，是『直覺跳答案』還是『一步步拆解』？AI 其實和你一樣",
  },
  {
    from: 6700,
    to: 7076,
    sender: "親身體驗",
    text: "下次讓 AI 解難題，試著加上『請一步一步思考』——答案有沒有變得更清楚？",
  },
];

// ── Easing tokens ─────────────────────────────────────────────────────────
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
          padding: `${10 * S}px ${32 * S}px`,
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
            marginTop: 6 * S,
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
function IMessageCard({ callout, slotIndex, globalFrame }: {
  callout: Callout;
  slotIndex: number;
  globalFrame: number;
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
    <div
      style={{
        position: "absolute",
        top: NOTIF_TOP + slotOffset,
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
        padding: `${12 * S}px ${14 * S}px`,
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
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 18 * S,
            color: C.primary,
            letterSpacing: "0.05em",
          }}
        >
          {callout.sender}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 18 * S,
          color: C.text,
          lineHeight: 1.55,
        }}
      >
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

// ─────────────────────────────────────────────────────────────────────────────
// ── Concept Animations ───────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// 1. CoTBrainStepsAnimation — TitleScene
//    Visual: pulsing brain → chain of step nodes (1 → 2 → 3) → green ✓
//    Position: top right
function CoTBrainStepsAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 950;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const brainScale = easeOutBack(prog(f, 22));
  const pulse = Math.sin(f * 0.05) * 0.08 + 1;

  const steps = ["1", "2", "3"];

  return (
    <div
      style={{
        position: "absolute",
        top: 220 * S,
        right: 50 * S,
        width: 230 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14 * S,
      }}
    >
      {/* Brain */}
      <div
        style={{
          width: 110 * S,
          height: 110 * S,
          borderRadius: "50%",
          background: "rgba(124,255,178,0.12)",
          border: `${3 * S}px solid ${C.primary}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 50 * S,
          transform: `scale(${brainScale * pulse})`,
          boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.45)`,
        }}
      >
        🧠
      </div>

      {/* Vertical chain of steps */}
      {steps.map((label, i) => {
        const stagger = 80 + i * 90;
        const itemF = Math.max(0, f - stagger);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemScale = easeOutBack(Math.min(itemF / 22, 1));
        return (
          <React.Fragment key={i}>
            {/* Arrow */}
            <div
              style={{
                opacity: itemOp,
                color: C.primary,
                fontSize: 22 * S,
                lineHeight: 1,
                textShadow: `0 0 ${8 * S}px ${C.primary}`,
              }}
            >
              ▼
            </div>
            {/* Step circle */}
            <div
              style={{
                opacity: itemOp,
                transform: `scale(${itemScale})`,
                width: 56 * S,
                height: 56 * S,
                borderRadius: "50%",
                background: C.primaryLight,
                border: `2px solid ${C.primary}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Space Mono', monospace",
                fontSize: 22 * S,
                color: C.primary,
                fontWeight: "700",
                boxShadow: `0 0 ${14 * S}px rgba(124,255,178,0.35)`,
              }}
            >
              {label}
            </div>
          </React.Fragment>
        );
      })}

      {/* Final checkmark badge */}
      {(() => {
        const finalF = Math.max(0, f - 360);
        const finalOp = interpolate(finalF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const finalScale = easeOutBack(Math.min(finalF / 22, 1));
        return (
          <div
            style={{
              opacity: finalOp,
              transform: `scale(${finalScale})`,
              marginTop: 4 * S,
              padding: `${8 * S}px ${16 * S}px`,
              background: C.primaryLight,
              border: `1.5px solid ${C.primary}`,
              borderRadius: 10 * S,
              fontFamily: "'Space Mono', monospace",
              fontSize: 20 * S,
              color: C.primary,
              fontWeight: "700",
              letterSpacing: "0.05em",
              boxShadow: `0 0 ${18 * S}px rgba(124,255,178,0.4)`,
            }}
          >
            ✓ 更準
          </div>
        );
      })()}
    </div>
  );
}

// 2. DirectVsStepwiseAnimation — Scene 1 (right side)
//    Visual: two parallel paths
//      Top: Q → red jump arrow → ✗
//      Bottom: Q → step ● ● ● → ✓
function DirectVsStepwiseAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 348;
  const envelope = interpolate(f, [0, 14, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // path widths
  const directW = interpolate(Math.max(0, f - 30), [0, 28], [0, 130 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const stepwiseAppearAt = 110;
  const stepCount = 3;

  return (
    <div
      style={{
        position: "absolute",
        right: 50 * S,
        top: 200 * S,
        width: 250 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 28 * S,
      }}
    >
      {/* Top: direct path */}
      <div>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 18 * S,
            color: C.red,
            letterSpacing: "0.08em",
            marginBottom: 8 * S,
          }}
        >
          直接跳答案
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 * S }}>
          <div
            style={{
              width: 40 * S,
              height: 40 * S,
              borderRadius: 8 * S,
              background: "rgba(255,107,107,0.15)",
              border: `1.5px solid ${C.red}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Space Mono', monospace",
              fontSize: 20 * S,
              color: C.red,
              fontWeight: "700",
            }}
          >
            Q
          </div>
          {/* red arrow */}
          <div
            style={{
              width: directW,
              height: 3 * S,
              background: `linear-gradient(to right, ${C.red}, transparent)`,
              borderRadius: 2 * S,
              boxShadow: `0 0 ${6 * S}px ${C.red}aa`,
            }}
          />
          <div
            style={{
              opacity: interpolate(Math.max(0, f - 60), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
              width: 40 * S,
              height: 40 * S,
              borderRadius: 8 * S,
              background: "rgba(255,107,107,0.2)",
              border: `1.5px solid ${C.red}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22 * S,
              color: C.red,
              fontWeight: "700",
            }}
          >
            ✕
          </div>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1 * S,
          background: "rgba(255,255,255,0.1)",
          width: "100%",
        }}
      />

      {/* Bottom: step-by-step path */}
      <div>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 18 * S,
            color: C.primary,
            letterSpacing: "0.08em",
            marginBottom: 8 * S,
          }}
        >
          一步一步
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 * S, flexWrap: "wrap" as const }}>
          <div
            style={{
              opacity: interpolate(Math.max(0, f - stepwiseAppearAt), [0, 16], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
              width: 40 * S,
              height: 40 * S,
              borderRadius: 8 * S,
              background: C.primaryLight,
              border: `1.5px solid ${C.primary}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Space Mono', monospace",
              fontSize: 20 * S,
              color: C.primary,
              fontWeight: "700",
            }}
          >
            Q
          </div>
          {Array.from({ length: stepCount }).map((_, i) => {
            const stepF = Math.max(0, f - (stepwiseAppearAt + 30 + i * 35));
            const stepOp = interpolate(stepF, [0, 16], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
            const stepScale = easeOutBack(Math.min(stepF / 16, 1));
            return (
              <React.Fragment key={i}>
                <span
                  style={{
                    opacity: stepOp,
                    color: C.primary,
                    fontSize: 18 * S,
                  }}
                >
                  ▶
                </span>
                <div
                  style={{
                    opacity: stepOp,
                    transform: `scale(${stepScale})`,
                    width: 28 * S,
                    height: 28 * S,
                    borderRadius: "50%",
                    background: C.primary,
                    boxShadow: `0 0 ${8 * S}px ${C.primary}`,
                  }}
                />
              </React.Fragment>
            );
          })}
          {/* final check */}
          {(() => {
            const finalAt = stepwiseAppearAt + 30 + stepCount * 35;
            const fF = Math.max(0, f - finalAt);
            const fOp = interpolate(fF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
            const fScale = easeOutBack(Math.min(fF / 18, 1));
            return (
              <>
                <span style={{ opacity: fOp, color: C.primary, fontSize: 18 * S }}>▶</span>
                <div
                  style={{
                    opacity: fOp,
                    transform: `scale(${fScale})`,
                    width: 40 * S,
                    height: 40 * S,
                    borderRadius: 8 * S,
                    background: C.primaryLight,
                    border: `1.5px solid ${C.primary}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22 * S,
                    color: C.primary,
                    fontWeight: "700",
                    boxShadow: `0 0 ${10 * S}px rgba(124,255,178,0.5)`,
                  }}
                >
                  ✓
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// 3. NotebookScribbleAnimation — Scene 1 (right side, later)
//    Visual: notebook paper with handwritten step lines appearing one by one
function NotebookScribbleAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 305;
  const envelope = interpolate(f, [0, 14, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const lines = [
    { label: "Step 1", text: "理解問題" },
    { label: "Step 2", text: "拆解條件" },
    { label: "Step 3", text: "推導結論" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 60 * S,
        top: 220 * S,
        width: 240 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid rgba(255,255,255,0.12)`,
          borderRadius: 12 * S,
          padding: `${14 * S}px ${16 * S}px`,
          boxShadow: `0 0 ${22 * S}px rgba(124,255,178,0.08)`,
          // Notebook line texture
          backgroundImage: `repeating-linear-gradient(transparent 0px, transparent ${28 * S}px, rgba(255,255,255,0.04) ${28 * S}px, rgba(255,255,255,0.04) ${29 * S}px)`,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 18 * S,
            color: C.muted,
            letterSpacing: "0.08em",
            marginBottom: 10 * S,
            borderBottom: `1px solid rgba(255,255,255,0.1)`,
            paddingBottom: 6 * S,
          }}
        >
          📝 便條紙
        </div>
        {lines.map((line, i) => {
          const stagger = i * 50;
          const lineF = Math.max(0, f - stagger);
          // Underline draws from left to right
          const drawW = interpolate(lineF, [0, 26], [0, 200 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
          const textOp = interpolate(lineF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ marginBottom: 8 * S, position: "relative" }}>
              <div
                style={{
                  opacity: textOp,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8 * S,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.primary,
                    fontWeight: "700",
                  }}
                >
                  {line.label}:
                </span>
                <span
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                  }}
                >
                  {line.text}
                </span>
              </div>
              {/* drawn underline */}
              <div
                style={{
                  width: drawW,
                  height: 2 * S,
                  background: C.primary,
                  marginTop: 2 * S,
                  borderRadius: 1 * S,
                  boxShadow: `0 0 ${4 * S}px ${C.primary}66`,
                }}
              />
            </div>
          );
        })}
        {/* Final ✓ */}
        {(() => {
          const fF = Math.max(0, f - 180);
          const fOp = interpolate(fF, [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const fScale = easeOutBack(Math.min(fF / 20, 1));
          return (
            <div
              style={{
                opacity: fOp,
                transform: `scale(${fScale})`,
                marginTop: 6 * S,
                display: "flex",
                alignItems: "center",
                gap: 8 * S,
                fontFamily: "'Space Mono', monospace",
                fontSize: 20 * S,
                color: C.primary,
                fontWeight: "700",
              }}
            >
              <span style={{ textShadow: `0 0 ${10 * S}px ${C.primary}` }}>✓</span>
              <span style={{ fontSize: 18 * S }}>答案更準確</span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// 4. BlackBoxToTransparentAnimation — Scene 2 (right side)
//    Visual: 4-stage sequence
//      0-200: opaque black box with "?"
//      200-400: glass/transparent box reveals chain of step nodes inside
//      400-600: one node flashes red (error found)
//      600-800: "可追蹤" label
function BlackBoxToTransparentAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 800;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Box transparency: opaque (0-200) → transparent (200-400)
  const transparency = interpolate(f, [200, 400], [0, 1], clamp);
  const boxBg = `rgba(13,13,13,${1 - transparency * 0.7})`;
  const boxBorder = transparency > 0.5 ? C.primaryBorder : "rgba(255,255,255,0.2)";

  // Question mark visible 0-180, fades out
  const qOpacity = interpolate(f, [0, 22, 180, 220], [0, 1, 1, 0], clamp);
  const qPulse = Math.sin(f * 0.08) * 0.1 + 1;

  // Steps revealed inside transparent box
  const stepCount = 4;

  return (
    <div
      style={{
        position: "absolute",
        right: 50 * S,
        top: 200 * S,
        width: 280 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 18 * S,
          color: C.muted,
          letterSpacing: "0.08em",
          marginBottom: 8 * S,
          textAlign: "center" as const,
        }}
      >
        {transparency > 0.5 ? "可見的推理鏈" : "黑盒子"}
      </div>

      {/* The box */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 180 * S,
          background: boxBg,
          border: `2px solid ${boxBorder}`,
          borderRadius: 14 * S,
          boxShadow: transparency > 0.5
            ? `0 0 ${24 * S}px rgba(124,255,178,0.25)`
            : `0 0 ${24 * S}px rgba(0,0,0,0.6)`,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Question mark inside */}
        <div
          style={{
            position: "absolute",
            opacity: qOpacity,
            fontFamily: "'Space Mono', monospace",
            fontSize: 80 * S,
            color: C.muted,
            fontWeight: "700",
            transform: `scale(${qPulse})`,
            textShadow: `0 0 ${20 * S}px rgba(255,255,255,0.2)`,
          }}
        >
          ?
        </div>

        {/* Chain of steps inside transparent box */}
        <div
          style={{
            opacity: transparency,
            display: "flex",
            alignItems: "center",
            gap: 6 * S,
          }}
        >
          {Array.from({ length: stepCount }).map((_, i) => {
            const stepAppearAt = 220 + i * 30;
            const stepF = Math.max(0, f - stepAppearAt);
            const stepOp = interpolate(stepF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
            const stepScale = easeOutBack(Math.min(stepF / 18, 1));

            // Step 2 (index 1) flashes red after 400
            const isErrorStep = i === 1;
            const errorAt = 460;
            const errorF = Math.max(0, f - errorAt);
            const errorPulse = isErrorStep && f > errorAt ? Math.sin(errorF * 0.15) * 0.3 + 0.7 : 1;
            const nodeColor = isErrorStep && f > errorAt ? C.red : C.primary;
            const nodeBg = isErrorStep && f > errorAt ? "rgba(255,107,107,0.25)" : C.primaryLight;

            return (
              <React.Fragment key={i}>
                <div
                  style={{
                    opacity: stepOp * errorPulse,
                    transform: `scale(${stepScale})`,
                    width: 40 * S,
                    height: 40 * S,
                    borderRadius: "50%",
                    background: nodeBg,
                    border: `2px solid ${nodeColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: nodeColor,
                    fontWeight: "700",
                    boxShadow: `0 0 ${10 * S}px ${nodeColor}88`,
                  }}
                >
                  {i + 1}
                </div>
                {i < stepCount - 1 && (
                  <div
                    style={{
                      opacity: stepOp,
                      width: 16 * S,
                      height: 2 * S,
                      background: C.primary,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Bottom label — appears after error step flashes */}
      {(() => {
        const labelAt = 560;
        const labelF = Math.max(0, f - labelAt);
        const labelOp = interpolate(labelF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const labelScale = easeOutBack(Math.min(labelF / 22, 1));
        return (
          <div
            style={{
              opacity: labelOp,
              transform: `scale(${labelScale})`,
              marginTop: 12 * S,
              padding: `${8 * S}px ${14 * S}px`,
              background: C.primaryLight,
              border: `1.5px solid ${C.primary}`,
              borderRadius: 10 * S,
              fontFamily: "'Space Mono', monospace",
              fontSize: 20 * S,
              color: C.primary,
              fontWeight: "700",
              letterSpacing: "0.05em",
              textAlign: "center" as const,
              boxShadow: `0 0 ${18 * S}px rgba(124,255,178,0.35)`,
            }}
          >
            ✓ 可追蹤偏掉的點
          </div>
        );
      })()}
    </div>
  );
}

// 5. PromptStepByStepAnimation — Scene 3 (right side)
//    Visual: prompt box typing "Let's think step by step" → arrow → response box reveals stats
function PromptStepByStepAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 405;
  const envelope = interpolate(f, [0, 14, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Typewriter effect for prompt text
  const promptText = "Let's think step by step";
  const charsPerFrame = 0.6;
  const charsVisible = Math.min(promptText.length, Math.floor(Math.max(0, f - 14) * charsPerFrame));
  const typed = promptText.slice(0, charsVisible);

  // Cursor blink
  const cursorVisible = Math.floor(f / 15) % 2 === 0;

  // Arrow appears after typing done
  const arrowAt = 22 + Math.ceil(promptText.length / charsPerFrame) + 10;
  const arrowF = Math.max(0, f - arrowAt);
  const arrowOp = interpolate(arrowF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  // Result box
  const resultAt = arrowAt + 30;
  const resultF = Math.max(0, f - resultAt);
  const resultOp = interpolate(resultF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const resultTy = interpolate(resultF, [0, 22], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });

  // Accuracy counter
  const counterAt = resultAt + 40;
  const counterF = Math.max(0, f - counterAt);
  const accVal = Math.round(interpolate(counterF, [0, 60], [0, 28], { easing: E.outExpo, extrapolateRight: "clamp" }));

  return (
    <div
      style={{
        position: "absolute",
        right: 50 * S,
        top: 200 * S,
        width: 260 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10 * S,
      }}
    >
      {/* Prompt box */}
      <div
        style={{
          width: "100%",
          background: "rgba(0,0,0,0.85)",
          border: `1.5px solid ${C.primaryBorder}`,
          borderRadius: 12 * S,
          padding: `${12 * S}px ${14 * S}px`,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 18 * S,
            color: C.muted,
            letterSpacing: "0.06em",
            marginBottom: 6 * S,
          }}
        >
          PROMPT
        </div>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 18 * S,
            color: C.text,
            lineHeight: 1.5,
            minHeight: 28 * S,
          }}
        >
          {typed}
          {cursorVisible && (
            <span
              style={{
                display: "inline-block",
                width: 8 * S,
                height: 20 * S,
                background: C.primary,
                marginLeft: 2 * S,
                verticalAlign: "middle",
              }}
            />
          )}
        </div>
      </div>

      {/* Arrow */}
      <div
        style={{
          opacity: arrowOp,
          color: C.primary,
          fontSize: 22 * S,
          textShadow: `0 0 ${10 * S}px ${C.primary}`,
        }}
      >
        ▼
      </div>

      {/* Result box */}
      <div
        style={{
          opacity: resultOp,
          transform: `translateY(${resultTy}px)`,
          width: "100%",
          background: C.primaryLight,
          border: `1.5px solid ${C.primary}`,
          borderRadius: 12 * S,
          padding: `${14 * S}px ${14 * S}px`,
          boxShadow: `0 0 ${22 * S}px rgba(124,255,178,0.3)`,
          textAlign: "center" as const,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 18 * S,
            color: C.primary,
            letterSpacing: "0.06em",
            marginBottom: 8 * S,
          }}
        >
          AI 推理準確率
        </div>
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 42 * S,
            color: C.primary,
            fontWeight: "700",
            lineHeight: 1,
            textShadow: `0 0 ${20 * S}px rgba(124,255,178,0.7)`,
          }}
        >
          ↑ {accVal}%
        </div>
        <div
          style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 18 * S,
            color: C.text,
            marginTop: 6 * S,
            lineHeight: 1.5,
          }}
        >
          一句話，大幅提升
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_05_18.title.to - SCENES_2026_05_18.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(56);
  const tagStyle = useFadeUp(72);

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
        {/* Badge */}
        <div style={{ ...badgeOp, marginBottom: 14 * S }}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 18 * S,
              color: C.primary,
              letterSpacing: "0.12em",
              background: C.primaryLight,
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 6 * S,
              padding: `${5 * S}px ${14 * S}px`,
            }}
          >
            每日 AI 知識庫
          </span>
        </div>

        {/* H1 line 1 */}
        <h1
          style={{
            margin: 0,
            lineHeight: 1.15,
            fontFamily: "'Noto Sans TC', sans-serif",
            fontWeight: 900,
            fontSize: 40 * S,
            color: C.text,
          }}
        >
          <WordReveal
            text="為什麼 AI 越想越準？"
            startFrame={10}
            staggerPerWord={6}
            fontSize={40 * S}
            color={C.text}
            fontFamily="'Noto Sans TC', sans-serif"
            fontWeight={900}
          />
        </h1>

        {/* H1 line 2 — neon green */}
        <h1
          style={{
            margin: 0,
            lineHeight: 1.2,
            marginTop: 4 * S,
            fontFamily: "'Noto Sans TC', sans-serif",
            fontWeight: 900,
            fontSize: 30 * S,
            color: C.primary,
          }}
        >
          <WordReveal
            text="Chain of Thought 的原理"
            startFrame={32}
            staggerPerWord={6}
            fontSize={30 * S}
            color={C.primary}
            fontFamily="'Noto Sans TC', sans-serif"
            fontWeight={900}
          />
        </h1>

        {/* Subtitle */}
        <p
          style={{
            ...subtitleStyle,
            marginTop: 20 * S,
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 20 * S,
            color: C.muted,
            lineHeight: 1.6,
          }}
        >
          一句話，讓 AI 推理能力大幅提升的技巧
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 16 * S }}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 18 * S,
              color: C.muted,
              letterSpacing: "0.1em",
            }}
          >
            CoT · 思維鏈 · Prompt 技巧 · 推理透明
          </span>
        </div>
      </AbsoluteFill>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <CoTBrainStepsAnimation triggerFrame={60} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene 1 — 為什麼 CoT 有效？ ────────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_18.scene1.to - SCENES_2026_05_18.scene1.from;

  // VTT anchors (local = global - 1018)
  //  00:33.920 簡稱CoT (scene1 starts) → local 0
  //  00:36.920 語言模型在預測答案時 → local 90
  //  00:42.120 如果你讓AI直接說答案 → local 246
  //  00:50.720 省略的步驟就是錯誤最容易發生 → local 504
  //  00:55.320 反過來 → local 642
  //  00:56.280 如果你要求AI把每個步驟都說出來 → local 671
  //  01:08.000 就像在寫便條紙幫自己理清思路 → local 1022
  //  01:15.160 更直觀的類比 → local 1237
  //  01:30.120 AI的邏輯和你一樣都需要思考空間 → local 1686

  const BADGE_A_AT = 0;
  const MECH_AT = 90;
  const DIRECT_AT = 246;
  const HIGHLIGHT_A_AT = 504;
  const STEPWISE_ANIM_AT = 246;

  // Phase A → B
  const A_FADE_START = 642 - 80; // 562
  const A_REMOVE = 642;
  const B_SHOW_AT = 642;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp)
    : 1;
  const showB = frame >= B_SHOW_AT;

  const BADGE_B_AT = 642;
  const STEPWISE_CARD_AT = 671;
  const NOTEBOOK_AT = 1022;
  const EXAM_AT = 1237;
  const HIGHLIGHT_B_AT = 1686;
  const NOTEBOOK_ANIM_AT = 1022;

  const badgeAStyle = useFadeUp(BADGE_A_AT);
  const mechStyle = useFadeUp(MECH_AT);
  const directStyle = useFadeUp(DIRECT_AT);
  const highlightAStyle = useFadeIn(HIGHLIGHT_A_AT);
  const badgeBStyle = useFadeUp(showB ? BADGE_B_AT : 999999);
  const stepwiseCardStyle = useFadeUp(showB ? STEPWISE_CARD_AT : 999999);
  const notebookStyle = useFadeUp(showB ? NOTEBOOK_AT : 999999);
  const examStyle = useFadeUp(showB ? EXAM_AT : 999999);
  const highlightBStyle = useFadeIn(showB ? HIGHLIGHT_B_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ──────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Section badge */}
            <div style={{ ...badgeAStyle, marginBottom: 16 * S }}>
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18 * S,
                  color: C.primary,
                  letterSpacing: "0.1em",
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                }}
              >
                為什麼這樣做有效？
              </span>
            </div>

            {/* Mechanism card */}
            <div style={{ ...mechStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                  boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.06)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.primary,
                    letterSpacing: "0.08em",
                    marginBottom: 10 * S,
                  }}
                >
                  語言模型怎麼預測
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: "700",
                    lineHeight: 1.45,
                  }}
                >
                  一個字接一個字往前推
                </div>
              </div>
            </div>

            {/* Direct path warning */}
            <div style={{ ...directStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: C.redLight,
                  border: `1px solid ${C.redBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.red,
                    letterSpacing: "0.08em",
                    marginBottom: 10 * S,
                  }}
                >
                  ⚠ 直接跳答案
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  從問題一步跳到結論，中間邏輯都被省略
                </div>
              </div>
            </div>

            {/* Highlight */}
            <div style={{ ...highlightAStyle }}>
              <div
                style={{
                  background: C.yellowLight,
                  border: `1.5px solid ${C.yellow}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                  boxShadow: `0 0 ${22 * S}px rgba(255,209,102,0.15)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.yellow,
                    fontWeight: "700",
                    lineHeight: 1.4,
                  }}>
                  省略的步驟＝錯誤最容易發生的地方
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ──────────────────────────── */}
        {showB && (
          <>
            {/* Section badge */}
            <div style={{ ...badgeBStyle, marginBottom: 16 * S }}>
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18 * S,
                  color: C.primary,
                  letterSpacing: "0.1em",
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                }}
              >
                把每個步驟說出來
              </span>
            </div>

            {/* Stepwise card */}
            <div style={{ ...stepwiseCardStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                  boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.08)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.primary,
                    letterSpacing: "0.08em",
                    marginBottom: 10 * S,
                  }}
                >
                  ✓ 推理一段一段展開
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  每個小步驟都成為下一步的依據
                </div>
              </div>
            </div>

            {/* Notebook analogy */}
            <div style={{ ...notebookStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.surfaceBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 10 * S,
                  }}
                >
                  📝 類比
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  像在<span style={{ color: C.primary, fontWeight: "700" }}>便條紙</span>上幫自己理清思路——走下來，答案更準確
                </div>
              </div>
            </div>

            {/* Exam analogy */}
            <div style={{ ...examStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.surfaceBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 10 * S,
                  }}
                >
                  🎓 更直觀
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  把計算過程寫在紙上 <span style={{ color: C.muted }}>vs.</span> 直接心算——哪個比較容易出錯？
                </div>
              </div>
            </div>

            {/* Highlight */}
            <div style={{ ...highlightBStyle }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1.5px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                  boxShadow: `0 0 ${22 * S}px rgba(124,255,178,0.18)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.primary,
                    fontWeight: "700",
                    lineHeight: 1.4,
                  }}
                >
                  AI 也需要「思考空間」
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <DirectVsStepwiseAnimation triggerLocalFrame={STEPWISE_ANIM_AT} />
        <NotebookScribbleAnimation triggerLocalFrame={NOTEBOOK_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene 2 — 推理過程變得可見 ────────────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_18.scene2.to - SCENES_2026_05_18.scene2.from;

  // VTT anchors (local = global - 2934)
  //  01:37.800 Chain of Thought 的重要性 → local 0
  //  01:40.000 不只是讓 AI 更準 → local 66
  //  01:46.360 傳統 AI 的問題之一是黑盒子 → local 257
  //  02:01.120 CoT 改變了這件事 → local 700
  //  02:10.200 這對高風險任務尤其重要 → local 972
  //  02:23.680 研究也顯示 → local 1376
  //  02:25.000 對複雜推理任務 → local 1416
  //  02:29.920 對簡單問題差異不大 → local 1563
  //  02:33.160 越是複雜的問題 → local 1660

  const BADGE_A_AT = 0;
  const IMPORTANCE_AT = 66;
  const BLACKBOX_AT = 257;
  const COT_CHANGE_AT = 700;
  const HIGH_RISK_AT = 972;
  const BLACKBOX_ANIM_AT = 257;

  const A_FADE_START = 1376 - 80; // 1296
  const A_REMOVE = 1376;
  const B_SHOW_AT = 1376;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp)
    : 1;
  const showB = frame >= B_SHOW_AT;

  const BADGE_B_AT = 1376;
  const RESEARCH_AT = 1416;
  const SIMPLE_AT = 1563;
  const HIGHLIGHT_B_AT = 1660;

  const badgeAStyle = useFadeUp(BADGE_A_AT);
  const importanceStyle = useFadeIn(IMPORTANCE_AT);
  const blackboxStyle = useFadeUp(BLACKBOX_AT);
  const cotChangeStyle = useFadeUp(COT_CHANGE_AT);
  const highRiskStyle = useFadeUp(HIGH_RISK_AT);

  const badgeBStyle = useFadeUp(showB ? BADGE_B_AT : 999999);
  const researchStyle = useFadeUp(showB ? RESEARCH_AT : 999999);
  const simpleStyle = useFadeUp(showB ? SIMPLE_AT : 999999);
  const highlightBStyle = useFadeIn(showB ? HIGHLIGHT_B_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ──────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Section badge */}
            <div style={{ ...badgeAStyle, marginBottom: 14 * S }}>
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18 * S,
                  color: C.primary,
                  letterSpacing: "0.1em",
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                }}
              >
                推理過程變得「可見」
              </span>
            </div>

            {/* Importance highlight */}
            <div style={{ ...importanceStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1.5px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                  boxShadow: `0 0 ${22 * S}px rgba(124,255,178,0.15)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: "700",
                    lineHeight: 1.4,
                  }}
                >
                  CoT 不只讓 AI <span style={{ color: C.primary }}>更準</span>——還讓推理變得 <span style={{ color: C.primary }}>可見</span>
                </div>
              </div>
            </div>

            {/* Black box card */}
            <div style={{ ...blackboxStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.surfaceBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 10 * S,
                  }}
                >
                  ⬛ 傳統 AI ＝ 黑盒子
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  丟進問題、吐出答案——你不知道它為什麼這樣回答，也很難發現它哪裡想錯
                </div>
              </div>
            </div>

            {/* CoT change card */}
            <div style={{ ...cotChangeStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                  boxShadow: `0 0 ${22 * S}px rgba(124,255,178,0.08)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.primary,
                    letterSpacing: "0.08em",
                    marginBottom: 10 * S,
                  }}
                >
                  ✓ CoT 改變這件事
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  追蹤每個推理步驟，找出它在哪一步偏掉了
                </div>
              </div>
            </div>

            {/* High risk applications */}
            <div style={{ ...highRiskStyle }}>
              <div
                style={{
                  background: C.yellowLight,
                  border: `1px solid ${C.yellowBorder}`,
                  borderRadius: 14 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.yellow,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  ⚠ 高風險任務尤其重要
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  分析財務數據、醫療判斷——必須追蹤推理過程，不能只看結論
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ──────────────────────────── */}
        {showB && (
          <>
            {/* Section badge */}
            <div style={{ ...badgeBStyle, marginBottom: 16 * S }}>
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18 * S,
                  color: C.primary,
                  letterSpacing: "0.1em",
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                }}
              >
                研究發現
              </span>
            </div>

            {/* Research finding card */}
            <div style={{ ...researchStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                  boxShadow: `0 0 ${22 * S}px rgba(124,255,178,0.08)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.primary,
                    letterSpacing: "0.08em",
                    marginBottom: 10 * S,
                  }}
                >
                  ✓ 複雜推理任務
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: "700",
                    lineHeight: 1.4,
                  }}
                >
                  CoT 效果<span style={{ color: C.primary }}>特別顯著</span>
                </div>
              </div>
            </div>

            {/* Simple problems note */}
            <div style={{ ...simpleStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.surfaceBorder}`,
                  borderRadius: 14 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  簡單問題
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  差異不大，不必每次都展開
                </div>
              </div>
            </div>

            {/* Insight highlight */}
            <div style={{ ...highlightBStyle }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1.5px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                  boxShadow: `0 0 ${22 * S}px rgba(124,255,178,0.18)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.primary,
                    fontWeight: "700",
                    lineHeight: 1.4,
                  }}
                >
                  越複雜的問題，越值得讓 AI 把思路展開
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <BlackBoxToTransparentAnimation triggerLocalFrame={BLACKBOX_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene 3 — 怎麼用 ──────────────────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_18.scene3.to - SCENES_2026_05_18.scene3.from;

  // VTT anchors (local = global - 4722)
  //  02:37.400 怎麼用 很簡單一句話就夠了 → local 0
  //  02:40.680 在你的 prompt 加上這些說法 → local 98
  //  02:43.560 請一步一步思考 → local 185
  //  02:45.560 請把推理過程說清楚 → local 245
  //  02:49.360 請先拆解這個問題 → local 359
  //  02:53.640 Let's think step by step → local 487
  //  02:58.880 準確率就能大幅提升 → local 644
  //  03:05.600 進階一點 → local 846
  //  03:11.520 這叫做 Few-shot CoT → local 1024
  //  03:14.360 效果通常比只說一步步來更好 → local 1109
  //  03:22.120 最後一個重要提醒 → local 1342
  //  03:23.880 讓錯誤更容易被發現 → local 1394
  //  03:29.080 它展示的是它的思考邏輯 → local 1550
  //  03:34.400 有時候步驟看起來條理清晰 → local 1710
  //  03:39.520 重要任務還是需要你自己驗證 → local 1864
  //  03:43.600 下次你要讓 AI 解決複雜問題 → local 1986

  const BADGE_A_AT = 0;
  const INTRO_AT = 98;
  const PHRASE1_AT = 185;
  const PHRASE2_AT = 245;
  const PHRASE3_AT = 359;
  const MAGIC_AT = 487;
  const STATS_AT = 644;
  const FEWSHOT_AT = 846;
  const PROMPT_ANIM_AT = 487;

  const A_FADE_START = 1342 - 80; // 1262
  const A_REMOVE = 1342;
  const B_SHOW_AT = 1342;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp)
    : 1;
  const showB = frame >= B_SHOW_AT;

  const BADGE_B_AT = 1342;
  const WARN_AT = 1394;
  const INSIGHT_AT = 1550;
  const TRAP_AT = 1710;
  const ACTION_AT = 1864;
  const CTA_AT = 1986;

  const badgeAStyle = useFadeUp(BADGE_A_AT);
  const introStyle = useFadeUp(INTRO_AT);
  const phrase1Style = useFadeUp(PHRASE1_AT);
  const phrase2Style = useFadeUp(PHRASE2_AT);
  const phrase3Style = useFadeUp(PHRASE3_AT);
  const magicStyle = useFadeUp(MAGIC_AT);
  const statsStyle = useFadeIn(STATS_AT);
  const fewshotStyle = useFadeUp(FEWSHOT_AT);

  const badgeBStyle = useFadeUp(showB ? BADGE_B_AT : 999999);
  const warnStyle = useFadeUp(showB ? WARN_AT : 999999);
  const insightStyle = useFadeIn(showB ? INSIGHT_AT : 999999);
  const trapStyle = useFadeUp(showB ? TRAP_AT : 999999);
  const actionStyle = useFadeUp(showB ? ACTION_AT : 999999);
  const ctaStyle = useFadeIn(showB ? CTA_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ──────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Section badge */}
            <div style={{ ...badgeAStyle, marginBottom: 14 * S }}>
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18 * S,
                  color: C.primary,
                  letterSpacing: "0.1em",
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                }}
              >
                怎麼用？一句話就夠了
              </span>
            </div>

            {/* Intro line */}
            <div
              style={{
                ...introStyle,
                marginBottom: 12 * S,
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 18 * S,
                color: C.muted,
                lineHeight: 1.5,
              }}
            >
              在你的 Prompt 加上這些說法 👇
            </div>

            {/* Phrase pills */}
            <div style={{ ...phrase1Style, marginBottom: 8 * S }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.primaryBorder}`,
                  borderLeft: `3px solid ${C.primary}`,
                  borderRadius: 10 * S,
                  padding: `${10 * S}px ${16 * S}px`,
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S,
                  color: C.text,
                  lineHeight: 1.5,
                }}
              >
                「請一步一步思考」
              </div>
            </div>
            <div style={{ ...phrase2Style, marginBottom: 8 * S }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.primaryBorder}`,
                  borderLeft: `3px solid ${C.primary}`,
                  borderRadius: 10 * S,
                  padding: `${10 * S}px ${16 * S}px`,
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S,
                  color: C.text,
                  lineHeight: 1.5,
                }}
              >
                「請把你的推理過程說清楚，再給我答案」
              </div>
            </div>
            <div style={{ ...phrase3Style, marginBottom: 16 * S }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.primaryBorder}`,
                  borderLeft: `3px solid ${C.primary}`,
                  borderRadius: 10 * S,
                  padding: `${10 * S}px ${16 * S}px`,
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S,
                  color: C.text,
                  lineHeight: 1.5,
                }}
              >
                「請先拆解這個問題，再逐步回答」
              </div>
            </div>

            {/* Magic phrase highlight */}
            <div style={{ ...magicStyle, marginBottom: 12 * S }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1.5px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                  boxShadow: `0 0 ${22 * S}px rgba(124,255,178,0.18)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.primary,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  ✨ 一句神奇咒語
                </div>
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: "700",
                    lineHeight: 1.4,
                    textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.5)`,
                  }}
                >
                  "Let's think step by step"
                </div>
              </div>
            </div>

            {/* Stats line */}
            <div
              style={{
                ...statsStyle,
                marginBottom: 14 * S,
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 18 * S,
                color: C.muted,
                lineHeight: 1.5,
              }}
            >
              加在 Prompt 末尾 → AI 推理準確率<span style={{ color: C.primary, fontWeight: "700" }}>大幅提升</span>
            </div>

            {/* Advanced Few-shot card */}
            <div style={{ ...fewshotStyle }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.primary,
                    letterSpacing: "0.08em",
                    marginBottom: 10 * S,
                  }}
                >
                  進階：Few-shot CoT
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  給 AI 幾個有步驟的範例——它有了具體格式可以模仿，效果通常更好
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ──────────────────────────── */}
        {showB && (
          <>
            {/* Section badge */}
            <div style={{ ...badgeBStyle, marginBottom: 14 * S }}>
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18 * S,
                  color: C.yellow,
                  letterSpacing: "0.1em",
                  background: C.yellowLight,
                  border: `1px solid ${C.yellowBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                }}
              >
                ⚠ 重要提醒
              </span>
            </div>

            {/* Warning card */}
            <div style={{ ...warnStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.yellowLight,
                  border: `1.5px solid ${C.yellow}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                  boxShadow: `0 0 ${22 * S}px rgba(255,209,102,0.15)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: "700",
                    lineHeight: 1.45,
                  }}
                >
                  CoT 讓錯誤更易發現——但<span style={{ color: C.yellow }}>不代表</span>推理一定正確
                </div>
              </div>
            </div>

            {/* Insight */}
            <div
              style={{
                ...insightStyle,
                marginBottom: 14 * S,
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 18 * S,
                color: C.muted,
                lineHeight: 1.6,
              }}
            >
              它展示的是<span style={{ color: C.text, fontWeight: "700" }}>它的思考邏輯</span>——不是<span style={{ color: C.yellow, fontWeight: "700" }}>客觀正確的邏輯</span>
            </div>

            {/* Trap card */}
            <div style={{ ...trapStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.redLight,
                  border: `1px solid ${C.redBorder}`,
                  borderRadius: 14 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.red,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  ⚠ 常見陷阱
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  步驟看起來條理清晰，<span style={{ color: C.red, fontWeight: "700" }}>但前提本身就是錯的</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div style={{ ...actionStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.surfaceBorder}`,
                  borderRadius: 14 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  重要任務還是需要你自己<span style={{ color: C.primary, fontWeight: "700" }}>驗證關鍵步驟</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ ...ctaStyle }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1.5px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                  boxShadow: `0 0 ${22 * S}px rgba(124,255,178,0.18)`,
                  textAlign: "center" as const,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.primary,
                    fontWeight: "700",
                    lineHeight: 1.4,
                  }}
                >
                  下次試試：Prompt 加「請一步一步思考」
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <PromptStepByStepAnimation triggerLocalFrame={PROMPT_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene ────────────────────────────────────────────────────────────
function SummaryCard({ number, text, delay, color, border }: {
  number: string;
  text: string;
  delay: number;
  color: string;
  border: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div
        style={{
          display: "flex",
          gap: 14 * S,
          alignItems: "flex-start",
          background: `${border}14`,
          border: `1px solid ${border}`,
          borderRadius: 14 * S,
          padding: `${14 * S}px ${20 * S}px`,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 22 * S,
            color,
            fontWeight: "700",
            flexShrink: 0,
            marginTop: 2 * S,
            textShadow: `0 0 ${10 * S}px ${color}88`,
          }}
        >
          {number}
        </div>
        <div
          style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 18 * S,
            color: C.text,
            lineHeight: 1.6,
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_05_18.summary.to - SCENES_2026_05_18.summary.from;

  // VTT anchors (local = global - 7076)
  //  03:55.880 好今天的重點整理 → local 0
  //  04:00.360 第一 Chain of Thought ... → local 134
  //  04:07.800 第二 推理過程可見 → local 358
  //  04:12.920 第三 使用方式很簡單 → local 511
  //  04:27.400 這裡是每日 AI 知識庫 → local 945

  const BADGE_AT = 0;
  const CARD1_AT = 134;
  const CARD2_AT = 358;
  const CARD3_AT = 511;
  const OUTRO_AT = 945;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{ ...badgeStyle, marginBottom: 18 * S, marginTop: 16 * S }}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 18 * S,
              color: C.primary,
              letterSpacing: "0.12em",
              background: C.primaryLight,
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 6 * S,
              padding: `${5 * S}px ${14 * S}px`,
            }}
          >
            <WordReveal
              text="重點整理"
              startFrame={4}
              staggerPerWord={5}
              fontSize={18 * S}
              color={C.primary}
              fontFamily="'Space Mono', monospace"
              letterSpacing="0.12em"
            />
          </span>
        </div>

        <SummaryCard
          number="01"
          delay={CARD1_AT}
          text="Chain of Thought = 要求 AI 把推理過程展開說，而不是直接跳答案——準確率顯著提升"
          color={C.primary}
          border={C.primary}
        />
        <SummaryCard
          number="02"
          delay={CARD2_AT}
          text="推理過程可見，錯誤更容易被追蹤——對複雜任務效果尤其明顯"
          color={C.primary}
          border={C.primary}
        />
        <SummaryCard
          number="03"
          delay={CARD3_AT}
          text="使用方式很簡單：Prompt 加「請一步一步思考」或給範例。但清晰步驟 ≠ 正確，仍需自己核實"
          color={C.yellow}
          border={C.yellow}
        />

        {/* Outro */}
        <div style={{ ...outroStyle, marginTop: 14 * S }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 18 * S,
              color: C.muted,
              letterSpacing: "0.08em",
              textAlign: "center" as const,
            }}
          >
            每日 AI 知識庫
          </div>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Composition ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export function VideoComposition_2026_05_18() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_18.scene1;
  const S2 = SCENES_2026_05_18.scene2;
  const S3 = SCENES_2026_05_18.scene3;
  const SU = SCENES_2026_05_18.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-05-18-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_05_18 - 150, TOTAL_FRAMES_2026_05_18],
            [v, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          return Math.min(fi, fo);
        }}
        loop
      />

      <Background />

      {/* TitleScene */}
      <Sequence from={0} durationInFrames={S1.from}>
        <TitleScene />
      </Sequence>

      {/* Scene 1 — 為什麼有效 */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — 推理可見 */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — 怎麼用 */}
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
