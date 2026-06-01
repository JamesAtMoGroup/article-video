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
import { loadFont as loadSyne } from "@remotion/google-fonts/Syne";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";

loadNotoSansTC("normal", { weights: ["400", "500", "700", "900"] });
loadSyne("normal", { weights: ["600", "700", "800"] });
loadDMSans("normal", { weights: ["400", "500"] });

// ── Font stacks (aischool) ────────────────────────────────────────────────
const F_HEAD = "'Syne','Noto Sans TC',sans-serif";
const F_BODY = "'DM Sans','Noto Sans TC',sans-serif";
const F_TC = "'Noto Sans TC',sans-serif";

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
const STAGE_LEFT = 160 * S;

// ── Design tokens (aischool) ──────────────────────────────────────────────
const C = {
  bg: "#09090f",
  surface: "#111118",
  surface2: "#16161f",
  surfaceBorder: "rgba(255,255,255,0.07)",
  primary: "#7cffb2",
  primaryLight: "rgba(124,255,178,0.07)",
  primaryBorder: "rgba(124,255,178,0.2)",
  primaryGlow: "rgba(124,255,178,0.06)",
  text: "#f0f0f5",
  textSub: "rgba(240,240,245,0.65)",
  muted: "rgba(240,240,245,0.45)",
  blue: "#5b8fff",
  blueLight: "rgba(91,143,255,0.1)",
  blueBorder: "rgba(91,143,255,0.28)",
  orange: "#ff9f43",
  orangeLight: "rgba(255,159,67,0.1)",
  orangeBorder: "rgba(255,159,67,0.24)",
  purple: "#a855f7",
  purpleLight: "rgba(168,85,247,0.1)",
  purpleBorder: "rgba(168,85,247,0.28)",
  red: "#f87171",
  redLight: "rgba(248,113,113,0.08)",
  redBorder: "rgba(248,113,113,0.22)",
  chipBg: "rgba(9,9,15,0.85)",
  chipBorder: "rgba(255,255,255,0.06)",
} as const;

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W = 300 * S;
const NOTIF_TOP = 12 * S;
const NOTIF_RIGHT = 20 * S;
const NOTIF_SLOT = 158 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// Title:   0s       → 0     hook + 推理模型 framing
// Scene1:  9s       → 270   什麼是推理模型 (傳統 vs 推理 + 三大代表)
// Scene2:  85s      → 2550  為什麼有效 (快思慢想 + 自我檢查)
// Scene3:  174s     → 5220  怎麼選 (適合/不適合 + 代價/提醒)
// Summary: 246s     → 7380  重點整理
// End:     294s     → 8820  outro buffer +30 → 8850
export const SCENES_2026_06_01 = {
  title: { from: 0, to: 270 },
  scene1: { from: 270, to: 2550 },
  scene2: { from: 2550, to: 5220 },
  scene3: { from: 5220, to: 7380 },
  summary: { from: 7380, to: 8850 },
} as const;
export const TOTAL_FRAMES_2026_06_01 = 8850;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "什麼是推理模型", start: 270 },
  { label: "為什麼有效", start: 2550 },
  { label: "怎麼選", start: 5220 },
  { label: "重點整理", start: 7380 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene1: 01:15 思考題 (你會直接寫答案還是先打草稿)
  { from: 2250, to: 2550, sender: "想一想", text: "你解複雜問題時，是直接寫答案，還是先打草稿？AI 推理模型其實就是在模仿後者。" },
  // Scene2: 02:45 思考題 (開放性創意問題反覆思考真的有幫助嗎)
  { from: 4950, to: 5220, sender: "想一想", text: "推理模型擅長「有明確答案」的題目；那對於開放性的創意問題，讓 AI 反覆思考真的有幫助嗎？" },
  // Scene3: 03:59 思考題 (你平常用 AI 場景哪些不需深度推理)
  { from: 7170, to: 7380, sender: "親身經歷", text: "你平常用 AI 最多的場景，哪些其實不需要深度推理？哪些可能一直在用功能不足的工具？" },
];

// ── Easing tokens (motion-design skill) ───────────────────────────────────
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

// dim → bright tied to a cue (no React hooks; safe inside loops)
function calcDim(activeAt: number, frame: number, dimOpacity = 0.3) {
  const af = Math.max(0, frame - activeAt);
  const t = interpolate(af, [0, 22], [dimOpacity, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const isOn = frame >= activeAt;
  return { op: Math.max(dimOpacity, Math.min(1, t)), isOn };
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
        const ty = interpolate(f, [0, 20], [18 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const op = interpolate(f, [0, 12], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
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
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  return <div style={{ opacity: Math.min(fadeIn, fadeOut), height: "100%" }}>{children}</div>;
}

// ── ContentColumn (kept for spec compliance / reuse) ───────────────────────
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
        width: CONTAINER_W, height: CONTENT_H, overflow: "hidden" as const,
      }}>
        <div style={{ transform: `translateY(${scrollY}px)` }}>{children}</div>
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
        width: 1000 * S, height: 1000 * S, top: -260 * S, left: -180 * S,
        background: "radial-gradient(circle, rgba(124,255,178,0.06) 0%, transparent 68%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: 760 * S, height: 760 * S, bottom: -200 * S, right: -160 * S,
        background: "radial-gradient(circle, rgba(124,255,178,0.045) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: `${60 * S}px ${60 * S}px`,
        WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, #000 0%, transparent 78%)",
        maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, #000 0%, transparent 78%)",
        pointerEvents: "none",
      }} />
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
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: NAV_H,
        background: "rgba(9,9,15,0.9)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: `${10 * S}px ${32 * S}px`,
        transform: `translateY(${interpolate(slideIn, [0, 1], [-NAV_H, 0])}px)`,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
            color: C.text, letterSpacing: "0.02em",
          }}>
            每日 AI <span style={{ color: C.primary, fontWeight: 700 }}>知識庫</span>
          </span>
          <span style={{
            fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
            color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" as const,
          }}>{current.label}</span>
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

// ── iMessage Callout system ────────────────────────────────────────────────
function IMessageCard({ c, globalFrame, allCallouts }: {
  c: Callout; globalFrame: number; allCallouts: Callout[];
}) {
  const { fps } = useVideoConfig();
  const localF = globalFrame - c.from;
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
  const slideY = interpolate(entryP, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);
  const opacity = interpolate(localF, [0, 10, duration, totalVis], [0, 1, 1, 0], clamp);
  const depthAlpha = interpolate(totalYPush / NOTIF_SLOT, [0, 1, 2], [1, 0.65, 0.35], clamp);

  const CHARS_PER_FRAME = 0.8;
  const charsVisible = interpolate(
    Math.max(0, localF - 14), [0, c.text.length / CHARS_PER_FRAME], [0, c.text.length], clamp,
  );
  const displayText = c.text.slice(0, Math.floor(charsVisible));
  const cursor = localF % 20 < 10 && charsVisible < c.text.length ? "|" : "";

  return (
    <div style={{
      position: "absolute", top: NAV_H + NOTIF_TOP + totalYPush, right: NOTIF_RIGHT,
      width: NOTIF_W, transform: `translateY(${slideY}px)`,
      opacity: opacity * depthAlpha, pointerEvents: "none", zIndex: 100,
    }}>
      <div style={{
        background: "rgba(17,17,24,0.92)", backdropFilter: "blur(48px)",
        WebkitBackdropFilter: "blur(48px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 18 * S,
        boxShadow: `0 ${8 * S}px ${40 * S}px rgba(0,0,0,0.6)`,
        padding: `${12 * S}px ${16 * S}px`,
        display: "flex", gap: 12 * S, alignItems: "flex-start",
      }}>
        <div style={{
          width: 44 * S, height: 44 * S, borderRadius: 12 * S,
          background: "linear-gradient(145deg, rgba(124,255,178,0.22) 0%, rgba(124,255,178,0.08) 100%)",
          border: `1px solid ${C.primaryBorder}`,
          boxShadow: `0 ${2 * S}px ${10 * S}px rgba(124,255,178,0.18)`,
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24 * S,
        }}>💬</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 * S,
          }}>
            <span style={{
              fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700,
              color: C.primary, letterSpacing: "0.02em",
            }}>{c.sender}</span>
            <span style={{
              fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
            }}>now</span>
          </div>
          <div style={{
            fontFamily: F_TC, fontSize: 18 * S, color: C.textSub, lineHeight: 1.5,
          }}>{displayText}{cursor}</div>
        </div>
      </div>
    </div>
  );
}

function IMessageOverlay({ globalFrame }: { globalFrame: number }) {
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 90 }}>
      {ALL_CALLOUTS.map((c) => (
        <IMessageCard key={c.from} c={c} globalFrame={globalFrame} allCallouts={ALL_CALLOUTS} />
      ))}
    </AbsoluteFill>
  );
}

// ── RippleRing ─────────────────────────────────────────────────────────────
function RippleRing({ activeAt, color, radius = "50%" }: { activeAt: number; color: string; radius?: number | string }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - activeAt);
  if (f > 30) return null;
  const scale = interpolate(f, [0, 26], [0.85, 1.9], { easing: E.outExpo, extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 4, 26, 30], [0, 0.5, 0.18, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", inset: 0,
      border: `${2 * S}px solid ${color}`, borderRadius: radius,
      transform: `scale(${scale})`, opacity, pointerEvents: "none",
    }} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Hero stage scaffolding ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function StageEyebrow({ label, delay, color = C.primary }: { label: string; delay: number; color?: string }) {
  const frame = useCurrentFrame();
  const a = useFadeIn(delay);
  const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));
  return (
    <div style={{ ...a, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S }}>
      <span style={{
        width: 8 * S, height: 8 * S, borderRadius: "50%", background: color,
        opacity: pulse, boxShadow: `0 0 ${8 * S}px ${color}`, flexShrink: 0,
      }} />
      <span style={{
        fontFamily: F_BODY, fontWeight: 500, fontSize: 20 * S, color,
        letterSpacing: "0.2em", textTransform: "uppercase" as const,
      }}>{label}</span>
    </div>
  );
}

function StageSentence({ text, delay, color = C.text, fontSize = 28 * S }: {
  text: string; delay: number; color?: string; fontSize?: number;
}) {
  const a = useFadeUp(delay);
  return (
    <div style={{
      ...a, textAlign: "center", fontFamily: F_HEAD,
      fontWeight: 700, lineHeight: 1.35, maxWidth: 600 * S, margin: "0 auto",
      fontSize, color, wordBreak: "break-word" as const,
    }}>{text}</div>
  );
}

function StageTakeaway({ text, delay, color = C.primary }: { text: string; delay: number; color?: string }) {
  // dim→bright: present from scene start at 0.28 opacity, brighten to 1 at delay
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const op = interpolate(f, [0, 18], [0.28, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const ty = interpolate(f, [0, 22], [8 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const a = { opacity: op, transform: `translateY(${ty}px)` };
  return (
    <div style={{
      ...a, textAlign: "center", margin: "0 auto",
      fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 500,
      color: C.text, lineHeight: 1.45, maxWidth: 1180 * S,
      background: C.surface, border: `1px solid ${C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${16 * S}px ${30 * S}px`,
      boxShadow: `0 0 ${60 * S}px ${C.primaryGlow}`,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12 * S,
    }}>
      <span style={{
        width: 8 * S, height: 8 * S, borderRadius: "50%", background: color,
        boxShadow: `0 0 ${8 * S}px ${color}`, flexShrink: 0,
      }} />
      <span>{text}</span>
    </div>
  );
}

function HeroFrame({ eyebrow, sentence, takeaway, children }: {
  eyebrow: React.ReactNode;
  sentence: React.ReactNode;
  takeaway: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AbsoluteFill style={{
      paddingTop: CONTENT_TOP + 8 * S, paddingBottom: SUBTITLE_SAFE,
      paddingLeft: STAGE_LEFT, paddingRight: STAGE_LEFT,
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S }}>
        {eyebrow}
        {sentence}
      </div>
      <div style={{
        flex: 1, width: "100%", position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: 18 * S, marginBottom: 18 * S, minHeight: 0,
      }}>
        {children}
      </div>
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>{takeaway}</div>
    </AbsoluteFill>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Mini AI bubble for title — shows "thinking..." morphing into reasoning steps
function ThinkingAIPreview() {
  const frame = useCurrentFrame();
  const thinkPulse = 0.5 + 0.5 * Math.sin(frame * 0.18);
  const stepAt = [120, 160, 200];
  return (
    <div style={{
      position: "relative",
      display: "flex", alignItems: "center", gap: 30 * S,
      padding: `${22 * S}px ${36 * S}px`,
      background: C.surface, border: `1px solid ${C.primaryBorder}`,
      borderRadius: 24 * S, boxShadow: `0 0 ${50 * S}px ${C.primaryGlow}`,
    }}>
      {/* AI brain icon */}
      <div style={{
        width: 110 * S, height: 110 * S, borderRadius: "50%",
        background: "rgba(124,255,178,0.12)", border: `${2 * S}px solid ${C.primary}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 56 * S, flexShrink: 0,
        boxShadow: `0 0 ${(20 + thinkPulse * 20) * S}px rgba(124,255,178,0.4)`,
      }}>🧠</div>
      {/* thinking → steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 * S, minWidth: 360 * S }}>
        <span style={{
          fontFamily: F_BODY, fontSize: 18 * S, color: C.primary, letterSpacing: "0.14em",
          textTransform: "uppercase" as const, opacity: 0.6 + 0.4 * thinkPulse,
        }}>thinking...</span>
        {[
          { t: "拆解問題", at: stepAt[0] },
          { t: "推導步驟", at: stepAt[1] },
          { t: "驗證答案", at: stepAt[2] },
        ].map((step, i) => {
          const a = calcDim(step.at, frame, 0.0);
          const tx = interpolate(Math.max(0, frame - step.at), [0, 22], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: a.op, transform: `translateX(${tx}px)`,
              display: "flex", alignItems: "center", gap: 10 * S,
            }}>
              <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary, boxShadow: `0 0 ${6 * S}px ${C.primary}` }} />
              <span style={{ fontFamily: F_TC, fontSize: 22 * S, color: C.text, fontWeight: 700 }}>{step.t}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_01.title.to - SCENES_2026_06_01.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(36);
  const tagStyle = useFadeUp(52);
  const heroStyle = useFadeUp(80);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        paddingTop: CONTENT_TOP, paddingBottom: SUBTITLE_SAFE,
        paddingLeft: 80 * S, paddingRight: 80 * S,
        textAlign: "center",
      }}>
        <div style={{
          ...badgeOp, marginBottom: 14 * S,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S,
        }}>
          <span style={{
            width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
            opacity: eyebrowPulse, boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          }} />
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 20 * S,
            color: C.primary, letterSpacing: "0.2em", textTransform: "uppercase" as const,
          }}>每日 AI 知識庫</span>
        </div>

        <h1 style={{ margin: 0, lineHeight: 1.15, fontFamily: F_HEAD, fontWeight: 800, fontSize: 42 * S, color: C.text }}>
          <WordReveal text="推理模型是什麼？" startFrame={10} staggerPerWord={6}
            fontSize={42 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>
        <h1 style={{ margin: 0, lineHeight: 1.2, marginTop: 6 * S, fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary }}>
          <WordReveal text="為什麼 AI 想多一點 效果差很多" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 18 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          打草稿再謄正——AI 也學會了慢慢想
        </p>

        {/* Central hero — thinking AI preview */}
        <div style={{ ...heroStyle, marginTop: 32 * S }}>
          <ThinkingAIPreview />
        </div>

        <div style={{ ...tagStyle, marginTop: 26 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>推理模型 · 快思慢想 · OpenAI o1/o3 · Claude Extended Thinking</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — 什麼是推理模型 ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero — 傳統 LM vs 推理模型 dual panel
function TradReasonComparison({
  tradHeaderAt, tradFlowAt, tradFlawAt,
  reasonHeaderAt, reasonChainAt, reasonAnswerAt,
}: {
  tradHeaderAt: number; tradFlowAt: number; tradFlawAt: number;
  reasonHeaderAt: number; reasonChainAt: number; reasonAnswerAt: number;
}) {
  const frame = useCurrentFrame();
  const tHead = calcDim(tradHeaderAt, frame, 0.3);
  const tFlow = calcDim(tradFlowAt, frame, 0.28);
  const tFlaw = calcDim(tradFlawAt, frame, 0);
  const rHead = calcDim(reasonHeaderAt, frame, 0.3);
  const rChain = calcDim(reasonChainAt, frame, 0);
  const rAnswer = calcDim(reasonAnswerAt, frame, 0);

  const Panel = ({ accent, headerOp, headerLabel, children, isReason }: {
    accent: string; headerOp: number; headerLabel: string; children: React.ReactNode; isReason: boolean;
  }) => (
    <div style={{
      width: 460 * S, height: 380 * S, position: "relative",
      background: C.surface, border: `1px solid ${isReason && rChain.isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${18 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
      boxShadow: isReason && rChain.isOn ? `0 0 ${50 * S}px ${C.primaryGlow}` : "none",
    }}>
      {/* panel header */}
      <div style={{
        opacity: headerOp,
        display: "flex", alignItems: "center", gap: 10 * S,
        background: isReason ? C.primaryLight : "rgba(255,255,255,0.04)",
        border: `1px solid ${isReason ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${6 * S}px ${18 * S}px`,
      }}>
        <span style={{
          width: 10 * S, height: 10 * S, borderRadius: "50%", background: accent,
          boxShadow: `0 0 ${8 * S}px ${accent}`,
        }} />
        <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color: accent }}>{headerLabel}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 40 * S }}>
      {/* Left — 傳統 LM */}
      <Panel accent={C.muted} headerOp={tHead.op} headerLabel="傳統 LM" isReason={false}>
        {/* flow: ? -> 🤖 -> A */}
        <div style={{
          opacity: tFlow.op,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 14 * S,
          padding: `${10 * S}px 0`,
        }}>
          <span style={{ fontSize: 44 * S }}>❓</span>
          <span style={{ fontSize: 30 * S, color: C.muted }}>→</span>
          <div style={{
            width: 84 * S, height: 84 * S, borderRadius: "50%",
            background: "rgba(255,255,255,0.04)", border: `${2 * S}px solid rgba(255,255,255,0.18)`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 * S,
          }}>🤖</div>
          <span style={{ fontSize: 30 * S, color: C.muted }}>→</span>
          <span style={{ fontSize: 44 * S }}>💬</span>
        </div>
        <div style={{
          opacity: tFlow.op,
          fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, textAlign: "center",
          background: C.surface2, border: `1px solid ${C.surfaceBorder}`,
          borderRadius: 12 * S, padding: `${8 * S}px ${18 * S}px`,
        }}>
          一口氣說完，沒有中間驗證
        </div>
        {/* flaw badge */}
        <div style={{
          opacity: tFlaw.op,
          marginTop: "auto",
          display: "flex", alignItems: "center", gap: 10 * S,
          background: C.redLight, border: `1px solid ${C.redBorder}`,
          borderRadius: 12 * S, padding: `${8 * S}px ${16 * S}px`,
        }}>
          <span style={{ fontSize: 24 * S }}>⚠️</span>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: C.red }}>沒有驗證和修正機制</span>
        </div>
      </Panel>

      {/* Right — 推理模型 */}
      <Panel accent={C.primary} headerOp={rHead.op} headerLabel="推理模型" isReason={true}>
        {/* flow: ? -> 🧠 -> chain */}
        <div style={{
          opacity: rHead.op,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 14 * S,
          padding: `${6 * S}px 0`,
        }}>
          <span style={{ fontSize: 44 * S }}>❓</span>
          <span style={{ fontSize: 30 * S, color: C.primary }}>→</span>
          <div style={{
            width: 84 * S, height: 84 * S, borderRadius: "50%",
            background: "rgba(124,255,178,0.12)", border: `${2 * S}px solid ${C.primary}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 * S,
            boxShadow: rHead.isOn ? `0 0 ${20 * S}px rgba(124,255,178,0.5)` : "none",
          }}>🧠</div>
        </div>
        {/* internal chain */}
        <div style={{
          opacity: rChain.op, width: "100%",
          display: "flex", flexDirection: "column", gap: 4 * S,
          background: "rgba(124,255,178,0.05)", border: `1px solid ${C.primaryBorder}`,
          borderRadius: 14 * S, padding: `${10 * S}px ${14 * S}px`,
        }}>
          <div style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.primary, letterSpacing: "0.1em", textTransform: "uppercase" as const, textAlign: "center" as const, marginBottom: 4 * S }}>內部思考</div>
          {["拆解", "推導", "驗證"].map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 * S, justifyContent: "center" }}>
              <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary }} />
              <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.text, fontWeight: 700 }}>{t}</span>
            </div>
          ))}
        </div>
        {/* answer badge */}
        <div style={{
          opacity: rAnswer.op, marginTop: "auto",
          display: "flex", alignItems: "center", gap: 10 * S,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 12 * S, padding: `${8 * S}px ${16 * S}px`,
        }}>
          <span style={{ fontSize: 24 * S }}>✓</span>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: C.primary }}>確認邏輯，再給最終答案</span>
        </div>
      </Panel>
    </div>
  );
}

// Phase B hero — 3 representative brand cards
function RepCard({ brand, model, color, desc, activeAt }: {
  brand: string; model: string; color: string; desc: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  const sc = isOn ? easeOutBack(prog(Math.max(0, frame - activeAt), 22)) : 0.92;
  return (
    <div style={{
      width: 360 * S, opacity: op,
      transform: `scale(${Math.max(0.92, Math.min(1, sc))})`,
      background: C.surface, border: `1px solid ${isOn ? color + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${24 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", gap: 12 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${color}22` : "none",
      position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={color} radius={22 * S} />}
      <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
        <div style={{
          width: 60 * S, height: 60 * S, borderRadius: 14 * S,
          background: `${color}1a`, border: `1px solid ${color}66`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 * S,
        }}>🏢</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>{brand}</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: isOn ? color : C.textSub, lineHeight: 1.15 }}>{model}</span>
        </div>
      </div>
      <div style={{
        fontFamily: F_TC, fontSize: 20 * S, color: C.text, fontWeight: 500, lineHeight: 1.4,
        background: C.surface2, border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 12 * S, padding: `${10 * S}px ${14 * S}px`,
      }}>{desc}</div>
    </div>
  );
}

function Scene1HeroB({ openaiAt, claudeAt, geminiAt }: { openaiAt: number; claudeAt: number; geminiAt: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 28 * S }}>
      <RepCard
        brand="OpenAI" model="o1 / o3"
        color={C.primary} desc="特別擅長數學、程式題的多步驟推導"
        activeAt={openaiAt}
      />
      <RepCard
        brand="Anthropic" model="Claude Extended Thinking"
        color={C.orange} desc="回答前進行更深度的內部推導"
        activeAt={claudeAt}
      />
      <RepCard
        brand="Google" model="Gemini Deep Research"
        color={C.blue} desc="多步驟推理結合網路搜尋，做複雜研究任務"
        activeAt={geminiAt}
      />
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_01.scene1.to - SCENES_2026_06_01.scene1.from;
  // Phase B first sentence: "目前最具代表性的例子" at 00:51 local 1260
  const A_FADE_START = 1180;
  const A_REMOVE = 1260;
  const B_SHOW_AT = 1260;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A activations (local)
  const HEADER_AT = 0; // 你有沒有注意到
  const TRAD_HEADER_AT = 360; // 00:21 傳統語言模型
  const TRAD_FLOW_AT = 510; // 00:26 你輸入它輸出 + 一口氣
  const TRAD_FLAW_AT = 630; // 00:30 沒有驗證和修正
  const REASON_HEADER_AT = 720; // 00:33 推理模型不同
  const REASON_CHAIN_AT = 870; // 00:38 拆解推導驗證
  const REASON_ANSWER_AT = 1020; // 00:43 確認邏輯正確再給答案
  const DRAFT_AT = 1080; // 00:45 打草稿再謄正

  // Phase B activations (local)
  const REP_HEADER_AT = B_SHOW_AT; // 1260 (00:51) 目前最具代表性
  const OPENAI_AT = 1320; // 00:53 OpenAI o1 o3
  const CLAUDE_AT = 1530; // 01:00 Claude Extended Thinking
  const GEMINI_AT = 1740; // 01:07 Gemini Deep Research
  const MIMIC_AT = 2070; // 01:18 直接寫答案還是打草稿

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="推理模型的特徵 ／ THINKING STEP" delay={HEADER_AT} color={C.primary} />}
            sentence={
              frame >= REASON_HEADER_AT
                ? <StageSentence text="推理模型會先做完內部思考，再給答案" delay={REASON_HEADER_AT} color={C.primary} fontSize={28 * S} />
                : frame >= TRAD_HEADER_AT
                ? <StageSentence text="傳統 LM：一口氣說完，沒有中間驗證" delay={TRAD_HEADER_AT} color={C.text} fontSize={28 * S} />
                : <StageSentence text="AI 回答前出現「思考中…」就是推理模型" delay={HEADER_AT} color={C.text} fontSize={26 * S} />
            }
            takeaway={<StageTakeaway text="像「打草稿再謄正」，而不是直接在正式考卷上作答" delay={DRAFT_AT} color={C.primary} />}
          >
            <TradReasonComparison
              tradHeaderAt={TRAD_HEADER_AT} tradFlowAt={TRAD_FLOW_AT} tradFlawAt={TRAD_FLAW_AT}
              reasonHeaderAt={REASON_HEADER_AT} reasonChainAt={REASON_CHAIN_AT} reasonAnswerAt={REASON_ANSWER_AT}
            />
          </HeroFrame>
        </div>
      )}

      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="目前的代表 ／ THE LINEUP" delay={REP_HEADER_AT} color={C.primary} />}
          sentence={
            frame >= MIMIC_AT
              ? <StageSentence text="AI 推理模型其實是在模仿你打草稿" delay={MIMIC_AT} color={C.primary} fontSize={26 * S} />
              : <StageSentence text="目前最具代表性的三個推理系列" delay={REP_HEADER_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="三大廠各自把「先思考再回答」變成標準能力" delay={GEMINI_AT} color={C.primary} />}
        >
          <Scene1HeroB openaiAt={OPENAI_AT} claudeAt={CLAUDE_AT} geminiAt={GEMINI_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 為什麼有效 (快思慢想 + 自我檢查) ─────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero — System 1 vs System 2 brain split
function DualBrain({ s1HeaderAt, s1DescAt, s2HeaderAt, s2DescAt, biasAt, errorAt }: {
  s1HeaderAt: number; s1DescAt: number; s2HeaderAt: number; s2DescAt: number;
  biasAt: number; errorAt: number;
}) {
  const frame = useCurrentFrame();
  const s1h = calcDim(s1HeaderAt, frame, 0.3);
  const s1d = calcDim(s1DescAt, frame, 0);
  const s2h = calcDim(s2HeaderAt, frame, 0.3);
  const s2d = calcDim(s2DescAt, frame, 0);
  const bias = calcDim(biasAt, frame, 0.28);
  const errorDim = calcDim(errorAt, frame, 0.28);

  const BrainPanel = ({ side, header, headerOp, accent, emoji, desc, descOp, headerLabel, isOn }: {
    side: "left" | "right"; header: string; headerOp: number; accent: string; emoji: string;
    desc: string; descOp: number; headerLabel: string; isOn: boolean;
  }) => (
    <div style={{
      width: 420 * S, height: 340 * S, position: "relative",
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${20 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      boxShadow: isOn ? `0 0 ${36 * S}px ${accent}1f` : "none",
    }}>
      <div style={{
        opacity: headerOp,
        display: "flex", alignItems: "center", gap: 10 * S,
        background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}55`,
        borderRadius: 12 * S, padding: `${4 * S}px ${14 * S}px`,
      }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 800, color: accent, letterSpacing: "0.04em" }}>{header}</span>
      </div>
      <div style={{
        width: 130 * S, height: 130 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60 * S,
        boxShadow: isOn ? `0 0 ${20 * S}px ${accent}66` : "none",
      }}>{emoji}</div>
      <div style={{
        fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color: accent, opacity: headerOp,
      }}>{headerLabel}</div>
      <div style={{
        opacity: descOp,
        fontFamily: F_TC, fontSize: 20 * S, color: C.text, fontWeight: 500, textAlign: "center" as const,
        lineHeight: 1.45,
      }}>{desc}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * S }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 36 * S }}>
        <BrainPanel
          side="left" header="SYSTEM 1" headerOp={s1h.op} accent={C.orange} emoji="⚡"
          headerLabel="快思" desc="直覺、快速、但容易出錯" descOp={s1d.op} isOn={s1h.isOn}
        />
        <div style={{ fontFamily: F_BODY, fontSize: 32 * S, color: C.muted }}>vs</div>
        <BrainPanel
          side="right" header="SYSTEM 2" headerOp={s2h.op} accent={C.primary} emoji="⚙️"
          headerLabel="慢想" desc="緩慢、需要精力、但更嚴謹" descOp={s2d.op} isOn={s2h.isOn}
        />
      </div>
      {/* bias indicator + error indicator */}
      <div style={{ display: "flex", gap: 16 * S, flexWrap: "wrap" as const, justifyContent: "center" }}>
        <div style={{
          opacity: bias.op,
          display: "flex", alignItems: "center", gap: 10 * S,
          background: C.orangeLight, border: `1px solid ${C.orangeBorder}`, borderRadius: 12 * S,
          padding: `${8 * S}px ${18 * S}px`,
        }}>
          <span style={{ fontSize: 22 * S }}>🤖</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.orange }}>傳統 AI 高度偏向 → 快思</span>
        </div>
        <div style={{
          opacity: errorDim.op,
          display: "flex", alignItems: "center", gap: 10 * S,
          background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 12 * S,
          padding: `${8 * S}px ${18 * S}px`,
        }}>
          <span style={{ fontSize: 22 * S }}>❌</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.red }}>數學 · 邏輯 · 程式錯誤率高</span>
        </div>
      </div>
    </div>
  );
}

// Phase B hero — 自我檢查 step chain
function StepNode({ idx, label, status, activeAt, fixedAt }: {
  idx: number; label: string; status: "ok" | "bad" | "fixed";
  activeAt: number; fixedAt?: number;
}) {
  const frame = useCurrentFrame();
  const a = calcDim(activeAt, frame, 0.3);
  // "fixed" = appears bad first, becomes ok at fixedAt; "bad" = stays bad; "ok" = always ok
  const isBad =
    status === "bad" ||
    (status === "fixed" && fixedAt !== undefined && frame < fixedAt);
  const isOk =
    status === "ok" ||
    (status === "fixed" && fixedAt !== undefined && frame >= fixedAt);
  const color = isBad ? C.red : C.primary;
  const icon = isBad ? "✕" : isOk ? "✓" : "•";
  return (
    <div style={{
      position: "relative",
      width: 150 * S, height: 110 * S, borderRadius: 16 * S,
      background: isBad ? C.redLight : C.surface,
      border: `1px solid ${a.isOn ? color + "66" : C.surfaceBorder}`,
      opacity: a.op,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 * S,
      boxShadow: a.isOn ? `0 0 ${20 * S}px ${color}22` : "none",
    }}>
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>步驟 {idx}</span>
      <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub }}>{label}</span>
      <span style={{
        position: "absolute", top: -10 * S, right: -10 * S,
        width: 32 * S, height: 32 * S, borderRadius: "50%",
        background: color, color: C.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 800,
        boxShadow: `0 0 ${10 * S}px ${color}88`, opacity: a.isOn ? 1 : 0.3,
      }}>{icon}</span>
    </div>
  );
}

function SelfCheckChain({ s1At, s2At, badAt, fixAt, fixedAt, finalAt, foundAt }: {
  s1At: number; s2At: number; badAt: number; fixAt: number; fixedAt: number; finalAt: number; foundAt: number;
}) {
  const frame = useCurrentFrame();
  const arrow = (at: number, color: string) => {
    const a = calcDim(at, frame, 0.2);
    return <span style={{ fontSize: 30 * S, color, opacity: a.op }}>→</span>;
  };
  const found = calcDim(foundAt, frame, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * S }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
        <StepNode idx={1} label="拆解" status="ok" activeAt={s1At} />
        {arrow(s1At + 30, C.primary)}
        <StepNode idx={2} label="推導" status="ok" activeAt={s2At} />
        {arrow(s2At + 30, C.primary)}
        <StepNode idx={3} label="驗證" status="fixed" activeAt={badAt} fixedAt={fixedAt} />
        {arrow(fixedAt + 10, C.primary)}
        <div style={{
          width: 150 * S, height: 110 * S, borderRadius: 16 * S,
          background: C.primaryLight, border: `1px solid ${calcDim(finalAt, frame, 0).isOn ? C.primaryBorder : C.surfaceBorder}`,
          opacity: calcDim(finalAt, frame, 0.3).op,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 * S,
          boxShadow: calcDim(finalAt, frame, 0).isOn ? `0 0 ${24 * S}px ${C.primaryGlow}` : "none",
        }}>
          <span style={{ fontSize: 30 * S }}>✓</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.primary }}>最終答案</span>
        </div>
      </div>
      {/* found-and-fixed callout under step 3 */}
      <div style={{
        opacity: found.op,
        display: "flex", alignItems: "center", gap: 12 * S,
        background: C.surface, border: `1px solid ${C.primaryBorder}`, borderRadius: 14 * S,
        padding: `${10 * S}px ${22 * S}px`, boxShadow: `0 0 ${28 * S}px ${C.primaryGlow}`,
      }}>
        <span style={{ fontSize: 26 * S }}>🔍</span>
        <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text }}>
          發現邏輯有問題 → <span style={{ color: C.primary }}>輸出前自我修正</span>
        </span>
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_01.scene2.to - SCENES_2026_06_01.scene2.from;
  // Phase B first sentence: "強制讓 AI 進入慢想模式" at 02:03 local 1140
  const A_FADE_START = 1060;
  const A_REMOVE = 1140;
  const B_SHOW_AT = 1140;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A (local)
  const HEADER_AT = 0; // 01:25 為什麼這麼有用
  const KAHN_AT = 150; // 01:30 Kahneman 兩種模式
  const S1_HEAD_AT = 270; // 01:34 System 1 快思
  const S1_DESC_AT = 330; // 01:36 直覺快速但易錯
  const S2_HEAD_AT = 420; // 01:39 System 2 慢想
  const S2_DESC_AT = 480; // 01:41 緩慢精力但嚴謹
  const BIAS_AT = 570; // 01:44 傳統 AI 偏快思
  const ERROR_AT = 1050; // 02:00 錯誤率特別高

  // Phase B (local)
  const FORCE_HEAD_AT = B_SHOW_AT; // 1140 (02:03) 強制慢想
  const STEP1_AT = 1290; // 02:08 研究數據
  const STEP2_AT = 1470; // 02:14 法律
  const BAD_AT = 1710; // 02:22 難點不是知道
  const FIXED_AT = 2160; // 02:37 輸出前發現修正
  const FINAL_AT = 2280; // 02:41 不讓錯誤帶到最終
  const FOUND_AT = 1980; // 02:31 自我檢查

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="快思慢想 ／ DUAL SYSTEM" delay={HEADER_AT} color={C.primary} />}
            sentence={
              frame >= S2_HEAD_AT
                ? <StageSentence text="快思流暢，但多步驟容易第一步踏錯" delay={S2_HEAD_AT} color={C.text} fontSize={26 * S} />
                : frame >= S1_HEAD_AT
                ? <StageSentence text="人類思考的兩種模式：快思直覺、慢想嚴謹" delay={S1_HEAD_AT} color={C.text} fontSize={28 * S} />
                : frame >= KAHN_AT
                ? <StageSentence text="心理學家 Kahneman 把人類思考分成兩種模式" delay={KAHN_AT} color={C.text} fontSize={26 * S} />
                : <StageSentence text="為什麼推理模型有用？用「快思慢想」解釋" delay={HEADER_AT} color={C.text} fontSize={26 * S} />
            }
            takeaway={<StageTakeaway text="傳統 AI 偏向快思——第一步踏錯，後面全部跟著錯" delay={ERROR_AT} color={C.red} />}
          >
            <DualBrain
              s1HeaderAt={S1_HEAD_AT} s1DescAt={S1_DESC_AT}
              s2HeaderAt={S2_HEAD_AT} s2DescAt={S2_DESC_AT}
              biasAt={BIAS_AT} errorAt={ERROR_AT}
            />
          </HeroFrame>
        </div>
      )}

      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="自我檢查 ／ INTERNAL CHECK" delay={FORCE_HEAD_AT} color={C.primary} />}
          sentence={
            frame >= BAD_AT
              ? <StageSentence text="難點不是知道答案，而是找到推導路徑" delay={BAD_AT} color={C.text} fontSize={26 * S} />
              : <StageSentence text="推理模型強制 AI 進入慢想，在輸出前自我檢查" delay={FORCE_HEAD_AT} color={C.primary} fontSize={26 * S} />
          }
          takeaway={<StageTakeaway text="中途發現邏輯有問題 → 修正後再輸出，而不是錯到底" delay={FIXED_AT} color={C.primary} />}
        >
          <SelfCheckChain
            s1At={FORCE_HEAD_AT + 60} s2At={STEP1_AT} badAt={BAD_AT}
            fixAt={FIXED_AT - 30} fixedAt={FIXED_AT} finalAt={FINAL_AT} foundAt={FOUND_AT}
          />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 怎麼選 (適合/不適合 + 代價/AI 素養) ──────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function FitItem({ icon, label, activeAt, fit }: {
  icon: string; label: string; activeAt: number; fit: boolean;
}) {
  const frame = useCurrentFrame();
  const a = calcDim(activeAt, frame, 0.3);
  const accent = fit ? C.primary : C.red;
  return (
    <div style={{
      opacity: a.op,
      display: "flex", alignItems: "center", gap: 12 * S, width: 460 * S,
      background: C.surface, border: `1px solid ${a.isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${10 * S}px ${18 * S}px`,
      boxShadow: a.isOn ? `0 0 ${22 * S}px ${accent}1f` : "none",
    }}>
      <span style={{ fontSize: 26 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub, flex: 1 }}>{label}</span>
      <span style={{
        width: 30 * S, height: 30 * S, borderRadius: "50%",
        background: `${accent}22`, border: `1px solid ${accent}66`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F_HEAD, fontSize: 18 * S, fontWeight: 800, color: accent,
      }}>{fit ? "✓" : "✕"}</span>
    </div>
  );
}

function FitGrid({
  fitHeaderAt, math, code, legal, decide,
  unfitHeaderAt, translate, creative, realtime,
}: {
  fitHeaderAt: number; math: number; code: number; legal: number; decide: number;
  unfitHeaderAt: number; translate: number; creative: number; realtime: number;
}) {
  const frame = useCurrentFrame();
  const fitHead = calcDim(fitHeaderAt, frame, 0.3);
  const unfitHead = calcDim(unfitHeaderAt, frame, 0.3);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", gap: 36 * S }}>
      {/* 適合 column */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 12 * S,
        background: C.surface, border: `1px solid ${fitHead.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 22 * S, padding: `${20 * S}px ${20 * S}px`,
        boxShadow: fitHead.isOn ? `0 0 ${40 * S}px ${C.primaryGlow}` : "none",
      }}>
        <div style={{
          opacity: fitHead.op,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 12 * S, padding: `${6 * S}px ${20 * S}px`, marginBottom: 4 * S,
        }}>
          <span style={{ fontSize: 22 * S }}>✅</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color: C.primary }}>適合場景</span>
        </div>
        <FitItem icon="📐" label="多步驟數學 / 邏輯題" activeAt={math} fit />
        <FitItem icon="💻" label="程式碼錯誤分析與偵錯" activeAt={code} fit />
        <FitItem icon="📜" label="複雜合約 / 法律文件" activeAt={legal} fit />
        <FitItem icon="⚖️" label="多角度比較的決策題" activeAt={decide} fit />
      </div>

      {/* 不適合 column */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 12 * S,
        background: C.surface, border: `1px solid ${unfitHead.isOn ? C.redBorder : C.surfaceBorder}`,
        borderRadius: 22 * S, padding: `${20 * S}px ${20 * S}px`,
      }}>
        <div style={{
          opacity: unfitHead.op,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S,
          background: C.redLight, border: `1px solid ${C.redBorder}`,
          borderRadius: 12 * S, padding: `${6 * S}px ${20 * S}px`, marginBottom: 4 * S,
        }}>
          <span style={{ fontSize: 22 * S }}>❌</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color: C.red }}>不適合場景</span>
        </div>
        <FitItem icon="📝" label="翻譯 / 改寫 / 摘要" activeAt={translate} fit={false} />
        <FitItem icon="✨" label="開放性創意寫作" activeAt={creative} fit={false} />
        <FitItem icon="⚡" label="需要即時回應 — 推理太慢" activeAt={realtime} fit={false} />
      </div>
    </div>
  );
}

// Phase B hero — 代價 (3 cost chips) + 素養 提醒 (越強 ≠ 越適合)
function CostMeter({ tokenAt, feeAt, waitAt }: { tokenAt: number; feeAt: number; waitAt: number }) {
  const items = [
    { icon: "🪙", label: "更多 token", color: C.orange, at: tokenAt },
    { icon: "💰", label: "更高費用", color: C.orange, at: feeAt },
    { icon: "⏱️", label: "更長等待", color: C.orange, at: waitAt },
  ];
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 22 * S, justifyContent: "center" }}>
      {items.map((it, i) => {
        const a = calcDim(it.at, frame, 0.3);
        return (
          <div key={i} style={{
            opacity: a.op, width: 320 * S, height: 110 * S,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 14 * S,
            background: C.surface, border: `1px solid ${a.isOn ? C.orangeBorder : C.surfaceBorder}`,
            borderRadius: 18 * S,
            boxShadow: a.isOn ? `0 0 ${30 * S}px ${C.orange}1f` : "none",
          }}>
            <span style={{ fontSize: 40 * S }}>{it.icon}</span>
            <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color: a.isOn ? it.color : C.textSub }}>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LiteracyBox({ activeAt, leftAt, rightAt }: { activeAt: number; leftAt: number; rightAt: number }) {
  const frame = useCurrentFrame();
  const head = calcDim(activeAt, frame, 0.3);
  const left = calcDim(leftAt, frame, 0.32);
  const right = calcDim(rightAt, frame, 0.32);
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      width: 1080 * S,
      background: C.surface, border: `1px solid ${head.isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${20 * S}px ${30 * S}px`,
      boxShadow: head.isOn ? `0 0 ${44 * S}px ${C.primaryGlow}` : "none",
      opacity: head.op,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10 * S,
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 12 * S, padding: `${6 * S}px ${18 * S}px`,
      }}>
        <span style={{ fontSize: 22 * S }}>💡</span>
        <span style={{ fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>AI 素養提醒</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 30 * S }}>
        <div style={{
          opacity: left.op,
          fontFamily: F_HEAD, fontSize: 28 * S, fontWeight: 800, color: left.isOn ? C.red : C.textSub,
          display: "flex", alignItems: "center", gap: 10 * S,
        }}>
          <span style={{ fontSize: 28 * S }}>✕</span><span>越強</span>
        </div>
        <div style={{ fontFamily: F_BODY, fontSize: 28 * S, color: C.muted, fontWeight: 500 }}>≠</div>
        <div style={{
          opacity: right.op,
          fontFamily: F_HEAD, fontSize: 28 * S, fontWeight: 800, color: right.isOn ? C.primary : C.textSub,
          display: "flex", alignItems: "center", gap: 10 * S,
        }}>
          <span style={{ fontSize: 28 * S }}>✓</span><span>越適合</span>
        </div>
      </div>
      <div style={{
        fontFamily: F_TC, fontSize: 22 * S, color: C.text, fontWeight: 500, textAlign: "center" as const, lineHeight: 1.5,
      }}>
        理解模型的設計邏輯，比盲目追求最新最貴的模型更重要
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_01.scene3.to - SCENES_2026_06_01.scene3.from;
  // Phase B first sentence: "推理模型太慢/代價是真實的" — use 03:35 (代價是真實的) local 1230
  const A_FADE_START = 1150;
  const A_REMOVE = 1230;
  const B_SHOW_AT = 1230;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A (local) — 適合/不適合 items
  const HEADER_AT = 0; // 02:54 那怎麼用才對
  const FIT_HEAD_AT = 150; // 02:59 適合場景
  const FIT_MATH = 270; // 03:03 多步驟數學
  const FIT_CODE = 390; // 03:07 程式碼除錯
  const FIT_LEGAL = 510; // 03:11 法律文件
  const FIT_DECIDE = 720; // 03:18 多角度決策
  const UNFIT_HEAD_AT = 780; // 03:20 不適合場景
  const UNFIT_TRANS = 840; // 03:22 翻譯改寫摘要
  const UNFIT_CREATE = 960; // 03:26 創意寫作
  const UNFIT_REAL = 1140; // 03:32 即時回應

  // Phase B (local)
  const COST_HEAD_AT = B_SHOW_AT; // 1230 (03:35) 代價是真實的
  const TOKEN_AT = 1290; // 03:37 消耗更多 token
  const FEE_AT = 1380; // 03:40 高費用長等待
  const WAIT_AT = 1380; // 03:40 同上
  const LIT_HEAD_AT = 1530; // 03:45 AI 素養提醒
  const LIT_LEFT_AT = 1710; // 03:51 不是越強
  const LIT_RIGHT_AT = 1770; // 03:53 越適合越好

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="怎麼選 ／ FIT FOR PURPOSE" delay={HEADER_AT} color={C.primary} />}
            sentence={
              frame >= UNFIT_HEAD_AT
                ? <StageSentence text="不適合的場景也明確——別用錯地方" delay={UNFIT_HEAD_AT} color={C.red} fontSize={26 * S} />
                : frame >= FIT_HEAD_AT
                ? <StageSentence text="適合多步驟、有明確推導過程的問題" delay={FIT_HEAD_AT} color={C.primary} fontSize={28 * S} />
                : <StageSentence text="推理模型不是萬用工具，選對場景很重要" delay={HEADER_AT} color={C.text} fontSize={28 * S} />
            }
            takeaway={<StageTakeaway text="有明確答案 ＝ 用推理；要靈性、要即時 ＝ 別用推理" delay={UNFIT_REAL} color={C.primary} />}
          >
            <FitGrid
              fitHeaderAt={FIT_HEAD_AT}
              math={FIT_MATH} code={FIT_CODE} legal={FIT_LEGAL} decide={FIT_DECIDE}
              unfitHeaderAt={UNFIT_HEAD_AT}
              translate={UNFIT_TRANS} creative={UNFIT_CREATE} realtime={UNFIT_REAL}
            />
          </HeroFrame>
        </div>
      )}

      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="代價與素養 ／ THE TRADEOFFS" delay={COST_HEAD_AT} color={C.orange} />}
          sentence={
            frame >= LIT_HEAD_AT
              ? <StageSentence text="「AI 想越多越好」是常見的誤解" delay={LIT_HEAD_AT} color={C.primary} fontSize={28 * S} />
              : <StageSentence text="思考步驟消耗更多 token——代價是真實的" delay={COST_HEAD_AT} color={C.orange} fontSize={28 * S} />
          }
          takeaway={<StageTakeaway text="用在不需要的場景，不只浪費成本，也不一定更好" delay={LIT_RIGHT_AT} color={C.primary} />}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
            <CostMeter tokenAt={TOKEN_AT} feeAt={FEE_AT} waitAt={WAIT_AT} />
            <LiteracyBox activeAt={LIT_HEAD_AT} leftAt={LIT_LEFT_AT} rightAt={LIT_RIGHT_AT} />
          </div>
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SUMMARY ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function BigTakeaway({ number, text, delay, color, top }: {
  number: string; text: string; delay: number; color: string; top: number;
}) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const op = interpolate(f, [0, 16], [0.28, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const numScale = easeOutBack(prog(f, 22));
  return (
    <div style={{
      position: "absolute", left: STAGE_LEFT, right: STAGE_LEFT, top,
      opacity: op, display: "flex", alignItems: "center", gap: 34 * S,
      background: C.surface, border: `1px solid ${C.surfaceBorder}`,
      borderRadius: 24 * S, padding: `${22 * S}px ${40 * S}px`,
      boxShadow: `0 0 ${60 * S}px ${color}14`,
    }}>
      <div style={{
        flexShrink: 0, width: 90 * S, height: 90 * S, borderRadius: "50%",
        transform: `scale(${Math.max(0.6, numScale)})`,
        background: C.surface2, border: `1px solid ${color}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F_HEAD, fontSize: 36 * S, color, fontWeight: 800,
        boxShadow: `0 0 ${24 * S}px ${color}33`,
      }}>{number}</div>
      <div style={{ fontFamily: F_TC, fontSize: 24 * S, color: C.text, fontWeight: 700, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_01.summary.to - SCENES_2026_06_01.summary.from;
  // local frames (Summary starts at 7380)
  const BADGE_AT = 0; // 04:06 好 今天的重點整理
  const CARD1_AT = 90; // 04:09 第一 推理模型是什麼
  const CARD2_AT = 570; // 04:25 第二 為什麼有效
  const CARD3_AT = 960; // 04:38 第三 怎麼選
  const OUTRO_AT = 1350; // 04:51 這裡是每日 AI 知識庫

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ paddingTop: CONTENT_TOP + 8 * S, paddingBottom: SUBTITLE_SAFE }}>
        <div style={{
          ...badgeStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 * S, marginBottom: 4 * S,
        }}>
          <span style={{
            width: 10 * S, height: 10 * S, borderRadius: "50%", background: C.primary,
            opacity: eyebrowPulse, boxShadow: `0 0 ${10 * S}px ${C.primary}`,
          }} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary, letterSpacing: "0.04em" }}>
            <WordReveal text="重點整理" startFrame={4} staggerPerWord={5}
              fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
          </span>
        </div>
      </AbsoluteFill>

      <BigTakeaway number="01" delay={CARD1_AT} color={C.primary} top={360}
        text="推理模型在回答前先進行內部思考——「打草稿再作答」。代表：OpenAI o1/o3、Claude Extended Thinking" />
      <BigTakeaway number="02" delay={CARD2_AT} color={C.blue} top={800}
        text="強制 AI 進入慢想模式：對有明確推導路徑的問題準確率顯著提升，能在輸出前自我檢查並修正" />
      <BigTakeaway number="03" delay={CARD3_AT} color={C.orange} top={1240}
        text="多步驟、有標準答案最適合；開放性、即時對話代價大於效益。選對場景比追求最強模型更重要" />

      <div style={{ ...outroStyle, position: "absolute", left: 0, right: 0, top: 1700, textAlign: "center" }}>
        <div style={{
          fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.muted,
          letterSpacing: "0.2em", textTransform: "uppercase" as const,
        }}>每日 AI 知識庫</div>
      </div>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Main Composition ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export function VideoComposition_2026_06_01() {
  const frame = useCurrentFrame();
  const T = SCENES_2026_06_01.title;
  const S1 = SCENES_2026_06_01.scene1;
  const S2 = SCENES_2026_06_01.scene2;
  const S3 = SCENES_2026_06_01.scene3;
  const SU = SCENES_2026_06_01.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Main narration */}
      <Audio src={staticFile("audio/2026-06-01-processed.wav")} volume={1.0} />

      {/* Background music (0.10 vol, fade in/out) */}
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_06_01 - 150, TOTAL_FRAMES_2026_06_01], [v, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return Math.min(fi, fo);
        }}
        loop
      />

      <Background />

      <Sequence from={T.from} durationInFrames={T.to - T.from}>
        <TitleScene />
      </Sequence>
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>
      <Sequence from={S3.from} durationInFrames={S3.to - S3.from}>
        <Scene3 />
      </Sequence>
      <Sequence from={SU.from} durationInFrames={SU.to - SU.from}>
        <SummaryScene />
      </Sequence>

      <ProgressBar globalFrame={frame} />
      <IMessageOverlay globalFrame={frame} />
    </AbsoluteFill>
  );
}
