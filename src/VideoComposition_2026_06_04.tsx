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
const F_HEAD = "'Syne','Noto Sans TC',sans-serif"; // headings / titles / big numbers / Latin
const F_BODY = "'DM Sans','Noto Sans TC',sans-serif"; // body / labels / eyebrows / takeaways
const F_TC = "'Noto Sans TC',sans-serif"; // CJK-heavy sentences / dot labels

// ── Scale & canvas (4K = 3840×2160) ───────────────────────────────────────
const S = 3;
const W = 1280 * S; // 3840
const H = 720 * S; // 2160
const NAV_H = 50 * S; // 150px
const CONTAINER_W = 640 * S; // 1920px
const COL_LEFT = (W - CONTAINER_W) / 2; // 960px
const SUBTITLE_SAFE = 120 * S; // 360px — 勿改
const CONTENT_GAP = 10 * S; // 30px
const CONTENT_TOP = NAV_H + CONTENT_GAP; // 180px
const CONTENT_H = H - CONTENT_TOP - SUBTITLE_SAFE; // 1620px

// ── Hero stage geometry (Direction A — Hero-Centered Stage) ────────────────
const STAGE_LEFT = 160 * S; // x = 480

// ── Design tokens (aischool 官網系統) ───────────────────────────────────────
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
// Title:   0s        → 0     hook：知識蒸餾、上手機/工廠/車子
// Scene1:  15.76s    → 473   核心機制：大模型太大 → Student 向 Teacher 學機率分佈
// Scene2:  53.76s    → 1613  巴黎的祕密：機率分佈例子 + 蒸餾命名隱喻
// Scene3:  141.76s   → 4253  為什麼重要：成本/速度/硬體 + Apple Intelligence/Claude Haiku
// Scene4:  229.76s   → 6893  實際應用三場景 + AI 素養（版權灰色地帶）
// Summary: 331.76s   → 9953  重點整理
// End:     386.76s(audio) → 11640
export const SCENES_2026_06_04 = {
  title: { from: 0, to: 473 },
  scene1: { from: 473, to: 1613 },
  scene2: { from: 1613, to: 4253 },
  scene3: { from: 4253, to: 6893 },
  scene4: { from: 6893, to: 9953 },
  summary: { from: 9953, to: 11644 },
} as const;
export const TOTAL_FRAMES_2026_06_04 = 11644;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "核心機制", start: 473 },
  { label: "巴黎的祕密", start: 1613 },
  { label: "為什麼重要", start: 4253 },
  { label: "實際應用", start: 6893 },
  { label: "重點整理", start: 9953 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene2 Phase B 想一想 — 老師告訴你 ABC 的結構性知識 (g3743「這裡先想一想」)
  { from: 3743, to: 4253, sender: "想一想", text: "如果老師不只說『答案是 A』，還告訴你『B 也接近、C 完全錯』，你是不是學到更多關於這題的結構？" },
  // Scene4 Phase B 結尾問題 (g9563「最後留你一個問題」)
  { from: 9563, to: 9953, sender: "親身經歷", text: "你每天用的手機 AI 功能，哪些背後其實是蒸餾過的小模型，而不是直接呼叫雲端大模型？" },
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

// dim → bright tied to a VTT cue (scene-local frame), cubic settle
function calcDim(activeAt: number, frame: number, dimOpacity = 0.3) {
  const af = Math.max(0, frame - activeAt);
  const t = interpolate(af, [0, 22], [dimOpacity, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const isOn = frame >= activeAt;
  return { op: Math.max(dimOpacity, Math.min(1, t)), isOn };
}
// dim → bright with back overshoot (for nodes that pop)
function calcActive(activeAt: number, frame: number, dim = 0.28) {
  const dimF = Math.max(0, frame - activeAt);
  const t = easeOutBack(prog(dimF, 22));
  const op = interpolate(t, [0, 1], [dim, 1], clamp);
  return { op: Math.max(dim, Math.min(1, op)), isOn: frame >= activeAt };
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
              fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.02em",
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
        fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color,
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
  const a = useFadeUp(delay);
  return (
    <div style={{
      ...a, textAlign: "center", margin: "0 auto",
      fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 500,
      color: C.text, lineHeight: 1.45, maxWidth: 1120 * S,
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
  eyebrow: React.ReactNode; sentence: React.ReactNode;
  takeaway: React.ReactNode; children: React.ReactNode;
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
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        {takeaway}
      </div>
    </AbsoluteFill>
  );
}

// ── Reusable: probability bar (horizontal) ─────────────────────────────────
function ProbBar({ label, pct, activeAt, accent, highlight }: {
  label: string; pct: number; activeAt: number; accent: string; highlight?: boolean;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  const grow = interpolate(Math.max(0, frame - activeAt), [0, 26], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  const TRACK = 620 * S;
  return (
    <div style={{ opacity: op, display: "flex", alignItems: "center", gap: 18 * S }}>
      <span style={{
        width: 168 * S, textAlign: "right", flexShrink: 0,
        fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700,
        color: isOn ? (highlight ? accent : C.text) : C.textSub,
      }}>{label}</span>
      <div style={{ width: TRACK, height: 34 * S, background: "rgba(255,255,255,0.05)", borderRadius: 10 * S, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${Math.max(pct * 100 * grow, isOn ? 3 : 0)}%`,
          background: highlight ? accent : "rgba(240,240,245,0.22)",
          borderRadius: 10 * S,
          boxShadow: highlight && isOn ? `0 0 ${22 * S}px ${accent}55` : "none",
        }} />
      </div>
      <span style={{
        width: 96 * S, flexShrink: 0,
        fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800,
        color: isOn ? (highlight ? accent : C.textSub) : C.muted,
      }}>{(pct).toFixed(2)}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// hero teaser: Teacher (大) → 蒸餾 → Student (小)
function DistillTeaser() {
  const frame = useCurrentFrame();
  const flow = (frame % 75) / 75;
  const tA = calcActive(150, frame, 0.32); // teacher
  const sA = calcActive(300, frame, 0.32); // student
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 44 * S }}>
      {/* Teacher */}
      <div style={{
        opacity: tA.op, width: 200 * S, height: 200 * S, borderRadius: 32 * S,
        background: C.surface, border: `${2 * S}px solid ${tA.isOn ? C.primaryBorder : C.surfaceBorder}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 * S,
        boxShadow: tA.isOn ? `0 0 ${40 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontSize: 70 * S }}>🧠</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: C.primary }}>Teacher · 大</span>
      </div>
      {/* distill arrow with flowing dot */}
      <div style={{ position: "relative", width: 180 * S, height: 60 * S, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", height: 3 * S, background: `linear-gradient(90deg, ${C.primary}, ${C.blue})`, borderRadius: 2 * S, opacity: 0.6 }} />
        <div style={{
          position: "absolute", left: `${flow * 100}%`, top: "50%", transform: "translate(-50%,-50%)",
          width: 16 * S, height: 16 * S, borderRadius: "50%", background: C.primary,
          boxShadow: `0 0 ${14 * S}px ${C.primary}`,
        }} />
        <span style={{
          position: "absolute", top: -34 * S, fontFamily: F_BODY, fontSize: 18 * S,
          color: C.primary, letterSpacing: "0.16em", textTransform: "uppercase" as const,
        }}>蒸餾</span>
      </div>
      {/* Student */}
      <div style={{
        opacity: sA.op, width: 138 * S, height: 138 * S, borderRadius: 26 * S,
        background: C.surface, border: `${2 * S}px solid ${sA.isOn ? C.blueBorder : C.surfaceBorder}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 * S,
        boxShadow: sA.isOn ? `0 0 ${28 * S}px rgba(91,143,255,0.12)` : "none",
      }}>
        <span style={{ fontSize: 48 * S }}>📱</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 18 * S, fontWeight: 700, color: C.blue }}>Student · 小</span>
      </div>
    </div>
  );
}

function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_04.title.to - SCENES_2026_06_04.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(34);
  const tagStyle = useFadeUp(50);
  const heroStyle = useFadeUp(96);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        paddingTop: CONTENT_TOP, paddingBottom: SUBTITLE_SAFE,
        paddingLeft: 80 * S, paddingRight: 80 * S,
        textAlign: "center", zIndex: 5,
      }}>
        <div style={{
          ...badgeOp, marginBottom: 16 * S,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S,
        }}>
          <span style={{
            width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
            opacity: eyebrowPulse, boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          }} />
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.2em", textTransform: "uppercase" as const,
          }}>每日 AI 知識庫</span>
        </div>

        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 44 * S, color: C.text,
        }}>
          <WordReveal text="知識蒸餾是什麼？" startFrame={10} staggerPerWord={6}
            fontSize={44 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary,
        }}>
          <WordReveal text="小模型如何學大模型的能力" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 20 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          讓 AI 能上手機、上工廠、上車子的關鍵技術
        </p>

        <div style={{ ...heroStyle, marginTop: 40 * S }}>
          <DistillTeaser />
        </div>

        <div style={{ ...tagStyle, marginTop: 36 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>Teacher → Student · 機率分佈 · 模型輕量化</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — 核心機制：大模型太大 → Student 向 Teacher 學機率分佈 ──────────
// ═══════════════════════════════════════════════════════════════════════════

function ProblemChip({ icon, label, activeAt, entranceAt }: { icon: string; label: string; activeAt: number; entranceAt: number }) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.4);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      display: "flex", alignItems: "center", gap: 10 * S,
      background: C.surface, border: `1px solid ${isOn ? C.redBorder : C.surfaceBorder}`,
      borderRadius: 12 * S, padding: `${9 * S}px ${16 * S}px`,
    }}>
      <span style={{ fontSize: 24 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function Scene1HeroA() {
  const frame = useCurrentFrame();
  const tA = calcActive(570, frame, 0.32); // Student appears @核心概念
  const sB = calcActive(690, frame, 0.32); // Teacher labelled @Teacher line
  const flow = (frame % 75) / 75;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * S }}>
      {/* Teacher → distill → Student */}
      <div style={{ display: "flex", alignItems: "center", gap: 40 * S }}>
        <div style={{
          width: 240 * S, height: 220 * S, borderRadius: 30 * S,
          background: C.surface, border: `${2 * S}px solid ${C.primaryBorder}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 * S,
          boxShadow: `0 0 ${44 * S}px ${C.primaryGlow}`, opacity: sB.op,
        }}>
          <span style={{ fontSize: 78 * S }}>🧠</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: C.primary }}>Teacher · 大模型</span>
        </div>
        <div style={{ position: "relative", width: 170 * S, height: 60 * S, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", height: 3 * S, background: `linear-gradient(90deg, ${C.primary}, ${C.blue})`, borderRadius: 2 * S, opacity: tA.isOn ? 0.7 : 0.2 }} />
          {tA.isOn && (
            <div style={{
              position: "absolute", left: `${flow * 100}%`, top: "50%", transform: "translate(-50%,-50%)",
              width: 16 * S, height: 16 * S, borderRadius: "50%", background: C.primary,
              boxShadow: `0 0 ${14 * S}px ${C.primary}`,
            }} />
          )}
          <span style={{
            position: "absolute", top: -32 * S, fontFamily: F_BODY, fontSize: 18 * S,
            color: tA.isOn ? C.primary : C.muted, letterSpacing: "0.16em", textTransform: "uppercase" as const,
          }}>蒸餾學習</span>
        </div>
        <div style={{
          width: 150 * S, height: 150 * S, borderRadius: 26 * S,
          background: C.surface, border: `${2 * S}px solid ${tA.isOn ? C.blueBorder : C.surfaceBorder}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 * S,
          boxShadow: tA.isOn ? `0 0 ${28 * S}px rgba(91,143,255,0.12)` : "none", opacity: tA.op,
        }}>
          <span style={{ fontSize: 52 * S }}>📱</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 18 * S, fontWeight: 700, color: C.blue }}>Student · 小</span>
        </div>
      </div>
      {/* problems of being too big */}
      <div style={{ display: "flex", gap: 16 * S, justifyContent: "center" }}>
        <ProblemChip icon="💸" label="訓練要花幾百萬美元" entranceAt={20} activeAt={120} />
        <ProblemChip icon="🖥️" label="推論需要高端 GPU" entranceAt={20} activeAt={120} />
        <ProblemChip icon="📵" label="上不了手機與一般裝置" entranceAt={20} activeAt={270} />
      </div>
    </div>
  );
}

function Scene1HeroB() {
  const frame = useCurrentFrame();
  // answer-only vs full-distribution (local: B_SHOW_AT 810, 機率分佈 960)
  const ans = calcActive(810, frame, 0.32);
  const dist = calcActive(960, frame, 0.32);
  const bars = [
    { label: "選項 A", pct: 0.9, accent: C.primary, hl: true },
    { label: "選項 B", pct: 0.07, accent: C.blue, hl: false },
    { label: "選項 C", pct: 0.02, accent: C.muted, hl: false },
  ];
  return (
    <div style={{ display: "flex", alignItems: "stretch", justifyContent: "center", gap: 40 * S }}>
      {/* only final answer */}
      <div style={{
        opacity: ans.op, width: 440 * S, borderRadius: 24 * S,
        background: C.surface, border: `1px solid ${ans.isOn ? C.redBorder : C.surfaceBorder}`,
        padding: `${24 * S}px ${28 * S}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S,
      }}>
        <span style={{ fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 700, color: C.red, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>只學最終答案</span>
        <div style={{
          width: 240 * S, height: 110 * S, borderRadius: 18 * S, background: C.redLight,
          border: `1px solid ${C.redBorder}`, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: F_HEAD, fontSize: 38 * S, fontWeight: 800, color: C.text,
        }}>正確答案 ✓</div>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, textAlign: "center" }}>學到的信息量非常有限</span>
      </div>
      {/* full distribution */}
      <div style={{
        opacity: dist.op, width: 560 * S, borderRadius: 24 * S,
        background: C.surface, border: `1px solid ${dist.isOn ? C.primaryBorder : C.surfaceBorder}`,
        padding: `${24 * S}px ${30 * S}px`, display: "flex", flexDirection: "column", gap: 14 * S,
        boxShadow: dist.isOn ? `0 0 ${44 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.1em", textTransform: "uppercase" as const, textAlign: "center" }}>學完整機率分佈</span>
        {bars.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
            <span style={{ width: 110 * S, fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 700, color: b.hl ? C.primary : C.textSub }}>{b.label}</span>
            <div style={{ flex: 1, height: 28 * S, background: "rgba(255,255,255,0.05)", borderRadius: 8 * S, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${b.pct * 100}%`, borderRadius: 8 * S,
                background: b.hl ? C.primary : "rgba(240,240,245,0.22)",
                boxShadow: b.hl && dist.isOn ? `0 0 ${18 * S}px ${C.primary}55` : "none",
              }} />
            </div>
            <span style={{ width: 72 * S, fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 800, color: b.hl ? C.primary : C.muted }}>{b.pct.toFixed(2)}</span>
          </div>
        ))}
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.primary, fontWeight: 700, textAlign: "center", marginTop: 4 * S }}>連「哪個接近、哪個全錯」都學到</span>
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_04.scene1.to - SCENES_2026_06_04.scene1.from;
  // local = global - 473. Phase B 第一句「但關鍵Student學的不是最終答案」g1283 → local 810
  const A_FADE_START = 730;
  const A_REMOVE = 810;
  const B_SHOW_AT = 810;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local): 0 太大 | 120 訓練/GPU | 420 知識蒸餾解決 | 570 Student/Teacher
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="核心機制 ／ THE SETUP" delay={0} color={C.primary} />}
            sentence={
              frame >= 570
                ? <StageSentence text="讓小模型 Student 向大模型 Teacher 學習" delay={570} color={C.primary} fontSize={26 * S} />
                : frame >= 420
                ? <StageSentence text="知識蒸餾，就是為了解決這個矛盾" delay={420} color={C.text} />
                : <StageSentence text="大模型很強，但它太大了" delay={0} color={C.text} />
            }
            takeaway={<StageTakeaway text="訓練貴、要 GPU、上不了手機——這正是知識蒸餾要解決的事" delay={120} color={C.primary} />}
          >
            <Scene1HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="關鍵 ／ THE TRICK" delay={B_SHOW_AT} color={C.primary} />}
          sentence={
            frame >= 960
              ? <StageSentence text="而是 Teacher 給每個選項的機率分佈" delay={960} color={C.primary} fontSize={26 * S} />
              : <StageSentence text="Student 學的不是最終答案" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="機率分佈裡藏著答案背後的「為什麼」" delay={960} color={C.primary} />}
        >
          <Scene1HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 巴黎的祕密：機率分佈例子 + 蒸餾命名隱喻 ───────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function HiddenKnowChip({ label, activeAt, entranceAt }: { label: string; activeAt: number; entranceAt: number }) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      display: "flex", alignItems: "center", gap: 8 * S,
      background: C.surface, border: `1px solid ${isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 12 * S, padding: `${9 * S}px ${18 * S}px`,
    }}>
      <span style={{ color: C.primary, fontSize: 18 * S }}>◆</span>
      <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function Scene2HeroA() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      {/* question */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12 * S,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${10 * S}px ${24 * S}px`,
      }}>
        <span style={{ fontSize: 26 * S }}>❓</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: C.text }}>巴黎在哪個國家？</span>
      </div>
      {/* probability bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 * S }}>
        <ProbBar label="法國" pct={0.90} activeAt={240} accent={C.primary} highlight />
        <ProbBar label="法蘭西" pct={0.08} activeAt={300} accent={C.blue} />
        <ProbBar label="比利時" pct={0.01} activeAt={300} accent={C.muted} />
      </div>
      {/* hidden knowledge chips */}
      <div style={{ display: "flex", gap: 16 * S, justifyContent: "center", flexWrap: "wrap" as const }}>
        <HiddenKnowChip label="語意關係" entranceAt={540} activeAt={690} />
        <HiddenKnowChip label="概念相鄰性" entranceAt={540} activeAt={690} />
        <HiddenKnowChip label="模型的不確定程度" entranceAt={540} activeAt={690} />
      </div>
    </div>
  );
}

function Scene2HeroB() {
  const frame = useCurrentFrame();
  // distillation metaphor (local): 原料 1740 | 蒸餾 1830 | 精華 2040
  const raw = calcActive(1740, frame, 0.32);
  const distill = calcActive(1830, frame, 0.32);
  const essence = calcActive(2040, frame, 0.32);
  const flow = (frame % 70) / 70;
  // raw material messy dots
  const dots = Array.from({ length: 18 });
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 36 * S }}>
      {/* raw material */}
      <div style={{
        opacity: raw.op, width: 260 * S, height: 230 * S, borderRadius: 26 * S,
        background: C.surface, border: `1px solid ${raw.isOn ? C.surfaceBorder : C.surfaceBorder}`,
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 16 * S,
      }}>
        {dots.map((_, i) => {
          const col = i % 6, row = Math.floor(i / 6);
          return (
            <span key={i} style={{
              position: "absolute", left: `${12 + col * 14}%`, top: `${14 + row * 20}%`,
              width: 14 * S, height: 14 * S, borderRadius: "50%",
              background: i % 3 === 0 ? C.primary : i % 3 === 1 ? C.blue : C.orange, opacity: 0.5,
            }} />
          );
        })}
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.textSub, zIndex: 2 }}>龐大原料 · 知識</span>
      </div>
      {/* distiller */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S, opacity: distill.op }}>
        <div style={{
          width: 130 * S, height: 130 * S, borderRadius: "50%",
          background: C.surface, border: `${2 * S}px solid ${distill.isOn ? C.primaryBorder : C.surfaceBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 58 * S,
          boxShadow: distill.isOn ? `0 0 ${30 * S}px ${C.primaryGlow}` : "none",
        }}>⚗️</div>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.primary, letterSpacing: "0.14em", textTransform: "uppercase" as const }}>蒸餾</span>
        <div style={{ position: "relative", width: 90 * S, height: 24 * S }}>
          <div style={{ position: "absolute", top: "50%", width: "100%", height: 3 * S, background: C.primary, opacity: distill.isOn ? 0.6 : 0.2, transform: "translateY(-50%)" }} />
          {distill.isOn && (
            <div style={{
              position: "absolute", left: `${flow * 100}%`, top: "50%", transform: "translate(-50%,-50%)",
              width: 12 * S, height: 12 * S, borderRadius: "50%", background: C.primary, boxShadow: `0 0 ${10 * S}px ${C.primary}`,
            }} />
          )}
        </div>
      </div>
      {/* essence */}
      <div style={{
        opacity: essence.op, width: 170 * S, height: 170 * S, borderRadius: 24 * S,
        background: C.surface, border: `1px solid ${essence.isOn ? C.primaryBorder : C.surfaceBorder}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 * S,
        boxShadow: essence.isOn ? `0 0 ${40 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontSize: 56 * S }}>💧</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 800, color: C.primary }}>精華 · 小模型</span>
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_04.scene2.to - SCENES_2026_06_04.scene2.from;
  // local = global - 1613. Phase B 第一句「名稱很有詩意」g3263 → local 1650
  const A_FADE_START = 1570;
  const A_REMOVE = 1650;
  const B_SHOW_AT = 1650;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local): 0 為什麼重要 | 150 巴黎 | 240 法國 | 540 隱性知識 | 900 只學答案 | 1140 學分佈
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="巴黎的祕密 ／ EXAMPLE" delay={0} color={C.primary} />}
            sentence={
              frame >= 1140
                ? <StageSentence text="只學答案學得少，學分佈才學到關係" delay={1140} color={C.primary} fontSize={26 * S} />
                : frame >= 540
                ? <StageSentence text="這些機率背後，藏著大量隱性知識" delay={540} color={C.text} fontSize={26 * S} />
                : frame >= 150
                ? <StageSentence text="答案是法國——但 AI 同時給了完整機率" delay={150} color={C.text} fontSize={26 * S} />
                : <StageSentence text="為什麼這一點很重要？舉個例子" delay={0} color={C.text} />
            }
            takeaway={<StageTakeaway text="法蘭西 0.08、比利時 0.01——這就是知識蒸餾的精髓" delay={300} color={C.primary} />}
          >
            <Scene2HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="名稱的由來 ／ DISTILLATION" delay={B_SHOW_AT} color={C.primary} />}
          sentence={
            frame >= 1920
              ? <StageSentence text="把龐大知識，濃縮進輕盈的小模型" delay={1920} color={C.primary} fontSize={26 * S} />
              : <StageSentence text="這名稱很有詩意：像釀酒的蒸餾" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="把大量原料濃縮成精華——知識也能這樣濃縮" delay={1830} color={C.primary} />}
        >
          <Scene2HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 為什麼重要：成本/速度/硬體 + 熟悉名字 ─────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function CostCard({ icon, title, desc, accent, activeAt, entranceAt }: {
  icon: string; title: string; desc: string; accent: string; activeAt: number; entranceAt: number;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op, position: "relative",
      width: 340 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${20 * S}px`,
      boxShadow: isOn ? `0 0 ${30 * S}px ${accent}1f` : "none",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 84 * S, height: 84 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 * S,
      }}>{icon}</div>
      <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{title}</span>
      <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, textAlign: "center", lineHeight: 1.4 }}>{desc}</span>
    </div>
  );
}

function TradeChip({ label, activeAt }: { label: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      opacity: op, display: "flex", alignItems: "center", gap: 8 * S,
      background: C.primaryLight, border: `1px solid ${isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 12 * S, padding: `${9 * S}px ${18 * S}px`,
    }}>
      <span style={{ color: C.primary, fontSize: 18 * S }}>✓</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function Scene3HeroA() {
  const frame = useCurrentFrame();
  const sacrifice = calcDim(1170, frame, 0.32);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * S }}>
      {/* three problems */}
      <div style={{ display: "flex", gap: 22 * S, justifyContent: "center" }}>
        <CostCard icon="💰" title="成本" desc="呼叫大型 API，規模一大就很可觀" accent={C.orange} entranceAt={20} activeAt={210} />
        <CostCard icon="⏱️" title="速度" desc="推論延遲數秒，即時場景用不了" accent={C.blue} entranceAt={20} activeAt={450} />
        <CostCard icon="📱" title="硬體" desc="手機、車載沒有大模型要的 GPU" accent={C.purple} entranceAt={20} activeAt={780} />
      </div>
      {/* trade-off */}
      <div style={{
        display: "flex", alignItems: "center", gap: 18 * S,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 18 * S, padding: `${14 * S}px ${24 * S}px`,
      }}>
        <span style={{ opacity: sacrifice.op, fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.orange }}>犧牲一點精度</span>
        <span style={{ fontSize: 26 * S, color: C.primary }}>→</span>
        <TradeChip label="降成本" activeAt={1230} />
        <TradeChip label="更快速度" activeAt={1290} />
        <TradeChip label="更小硬體" activeAt={1350} />
      </div>
    </div>
  );
}

function NameCard({ icon, brand, desc, accent, activeAt, entranceAt }: {
  icon: string; brand: string; desc: string; accent: string; activeAt: number; entranceAt: number;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      width: 460 * S, display: "flex", alignItems: "center", gap: 22 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${26 * S}px`,
      boxShadow: isOn ? `0 0 ${34 * S}px ${accent}1f` : "none",
    }}>
      <div style={{
        width: 90 * S, height: 90 * S, borderRadius: 22 * S, flexShrink: 0,
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 * S,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color: isOn ? C.text : C.textSub, marginBottom: 6 * S }}>{brand}</div>
        <div style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, lineHeight: 1.45 }}>{desc}</div>
      </div>
    </div>
  );
}

function Scene3HeroB() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      <NameCard icon="📱" brand="Apple Intelligence" desc="大量蒸餾技術，讓 AI 直接在 iPhone 本地運算，不必把資料送上雲端" accent={C.primary} entranceAt={20} activeAt={1800} />
      <NameCard icon="⚡" brand="Claude Haiku · GPT-4o mini" desc="輕量版模型靠蒸餾或類似技術，用更低成本提供接近旗艦的體驗" accent={C.blue} entranceAt={20} activeAt={2220} />
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_04.scene3.to - SCENES_2026_06_04.scene3.from;
  // local = global - 4253. Phase B 第一句「你今天用到熟悉名字」g5723 → local 1470
  const A_FADE_START = 1390;
  const A_REMOVE = 1470;
  const B_SHOW_AT = 1470;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local): 0 為什麼重要 | 210 成本 | 450 速度 | 780 硬體 | 1050 出路
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="為什麼重要 ／ THE WHY" delay={0} color={C.orange} />}
            sentence={
              frame >= 1050
                ? <StageSentence text="犧牲一點精度，換來普及的可能" delay={1050} color={C.orange} fontSize={26 * S} />
                : frame >= 210
                ? <StageSentence text="成本、速度、硬體——三道現實門檻" delay={210} color={C.text} fontSize={26 * S} />
                : <StageSentence text="大模型有幾個問題，讓它難以普及" delay={0} color={C.text} fontSize={26 * S} />
            }
            takeaway={<StageTakeaway text="知識蒸餾讓這三道門檻，全都找到了出路" delay={1050} color={C.orange} />}
          >
            <Scene3HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="你已經在用 ／ FAMILIAR NAMES" delay={B_SHOW_AT} color={C.primary} />}
          sentence={<StageSentence text="你熟悉的幾個名字，背後都有它" delay={B_SHOW_AT} color={C.text} fontSize={26 * S} />}
          takeaway={<StageTakeaway text="蒸餾，正是這些輕量 AI 能放進手機的關鍵" delay={2220} color={C.primary} />}
        >
          <Scene3HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 4 — 實際應用三場景 + AI 素養（版權灰色地帶）──────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function UseCaseCard({ icon, index, title, desc, accent, activeAt, entranceAt }: {
  icon: string; index: string; title: string; desc: string; accent: string; activeAt: number; entranceAt: number;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op, position: "relative",
      width: 360 * S, height: 392 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 24 * S, padding: `${22 * S}px ${22 * S}px`,
      boxShadow: isOn ? `0 0 ${34 * S}px ${accent}1f` : "none",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={24 * S} />}
      <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: accent, letterSpacing: "0.1em" }}>{index}</span>
      <div style={{
        width: 100 * S, height: 100 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50 * S,
      }}>{icon}</div>
      <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 700, color: isOn ? C.text : C.textSub, textAlign: "center" }}>{title}</span>
      <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, textAlign: "center", lineHeight: 1.5 }}>{desc}</span>
    </div>
  );
}

function Scene4HeroA() {
  return (
    <div style={{ display: "flex", gap: 26 * S, justifyContent: "center" }}>
      <UseCaseCard icon="🏭" index="01" title="邊緣運算" desc="工廠、車載、醫療設備沒有穩定網路，只能靠本地輕量模型" accent={C.primary} entranceAt={20} activeAt={180} />
      <UseCaseCard icon="⚡" index="02" title="低延遲" desc="即時翻譯、語音助理、遊戲對話需要毫秒級的回應" accent={C.blue} entranceAt={20} activeAt={750} />
      <UseCaseCard icon="🔒" index="03" title="隱私部署" desc="醫療、法律、金融不想把資料送雲端，蒸餾本地專用小模型" accent={C.purple} entranceAt={20} activeAt={1200} />
    </div>
  );
}

function Scene4HeroB() {
  const frame = useCurrentFrame();
  // local: teacher誰的 2040 | student繼承 2280 | 責任 2370 | 灰色 2490
  const teacher = calcActive(1800, frame, 0.32);
  const student = calcActive(2280, frame, 0.32);
  const resp = calcDim(2370, frame, 0);
  const gray = calcDim(2490, frame, 0);
  const flow = (frame % 75) / 75;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
      {/* teacher (?) → student inherits */}
      <div style={{ display: "flex", alignItems: "center", gap: 32 * S }}>
        <div style={{
          opacity: teacher.op, width: 230 * S, height: 180 * S, borderRadius: 26 * S,
          background: C.surface, border: `1px solid ${teacher.isOn ? C.orangeBorder : C.surfaceBorder}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 * S,
        }}>
          <span style={{ fontSize: 58 * S }}>🧠❓</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 21 * S, fontWeight: 700, color: C.orange }}>Teacher 是誰的？</span>
        </div>
        <div style={{ position: "relative", width: 150 * S, height: 50 * S, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", height: 3 * S, background: C.orange, opacity: student.isOn ? 0.6 : 0.2, borderRadius: 2 * S }} />
          {student.isOn && (
            <div style={{
              position: "absolute", left: `${flow * 100}%`, top: "50%", transform: "translate(-50%,-50%)",
              width: 14 * S, height: 14 * S, borderRadius: "50%", background: C.orange, boxShadow: `0 0 ${12 * S}px ${C.orange}`,
            }} />
          )}
          <span style={{ position: "absolute", top: -30 * S, fontFamily: F_BODY, fontSize: 18 * S, color: C.orange, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>繼承知識</span>
        </div>
        <div style={{
          opacity: student.op, width: 200 * S, height: 160 * S, borderRadius: 24 * S,
          background: C.surface, border: `1px solid ${student.isOn ? C.orangeBorder : C.surfaceBorder}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 * S,
        }}>
          <span style={{ fontSize: 46 * S }}>📱</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 19 * S, fontWeight: 700, color: C.text }}>Student 繼承了它</span>
        </div>
      </div>
      {/* responsibility → gray zone */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 * S }}>
        <div style={{
          opacity: resp.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.surface, border: `1px solid ${C.orangeBorder}`, borderRadius: 14 * S, padding: `${10 * S}px ${20 * S}px`,
        }}>
          <span style={{ fontSize: 28 * S }}>⚖️</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text }}>版權責任算誰的？</span>
        </div>
        <span style={{ fontSize: 26 * S, color: C.muted }}>→</span>
        <div style={{
          opacity: gray.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: "rgba(150,150,160,0.1)", border: "1px solid rgba(200,200,210,0.25)", borderRadius: 14 * S, padding: `${10 * S}px ${20 * S}px`,
        }}>
          <span style={{ fontSize: 28 * S }}>🌫️</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.textSub }}>法律上的灰色地帶</span>
        </div>
      </div>
    </div>
  );
}

function Scene4() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_04.scene4.to - SCENES_2026_06_04.scene4.from;
  // local = global - 6893. Phase B 第一句「最後AI素養提醒」g8603 → local 1710
  const A_FADE_START = 1630;
  const A_REMOVE = 1710;
  const B_SHOW_AT = 1710;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local): 0 用在哪 | 180 第一邊緣 | 750 第二低延遲 | 1200 第三隱私
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="實際應用 ／ WHERE" delay={0} color={C.primary} />}
            sentence={
              frame >= 1200
                ? <StageSentence text="第三：隱私保護的本地部署" delay={1200} color={C.purple} fontSize={26 * S} />
                : frame >= 750
                ? <StageSentence text="第二：毫秒級回應的低延遲場景" delay={750} color={C.blue} fontSize={26 * S} />
                : frame >= 180
                ? <StageSentence text="第一：沒有網路的邊緣運算" delay={180} color={C.primary} fontSize={26 * S} />
                : <StageSentence text="知識蒸餾，實際用在哪裡？" delay={0} color={C.text} />
            }
            takeaway={<StageTakeaway text="沒網路、要即時、重隱私——蒸餾讓 AI 走進這些場景" delay={1200} color={C.primary} />}
          >
            <Scene4HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="AI 素養提醒 ／ THE CAVEAT" delay={B_SHOW_AT} color={C.orange} />}
          sentence={
            frame >= 2040
              ? <StageSentence text="被蒸餾的老師模型，到底是誰的？" delay={2040} color={C.orange} fontSize={26 * S} />
              : <StageSentence text="它帶出一個尚未解決的法律問題" delay={B_SHOW_AT} color={C.text} fontSize={26 * S} />
          }
          takeaway={<StageTakeaway text="蒸餾繼承的知識，版權算誰的？至今仍是灰色地帶" delay={2490} color={C.orange} />}
        >
          <Scene4HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SUMMARY SCENE ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function RecapCard({ index, icon, title, body, accent, activeAt }: {
  index: string; icon: string; title: string; body: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.28);
  return (
    <div style={{
      width: 1180 * S, opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${30 * S}px`,
      display: "flex", alignItems: "center", gap: 24 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${accent}1f` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 90 * S, height: 90 * S, borderRadius: "50%", flexShrink: 0,
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42 * S,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 6 * S }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 22 * S, color: accent }}>{index}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 25 * S, color: isOn ? C.text : C.textSub }}>{title}</span>
        </div>
        <div style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, lineHeight: 1.45 }}>{body}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_04.summary.to - SCENES_2026_06_04.summary.from;
  const eyebrowFade = useFadeIn(6);
  const headFade = useFadeUp(14);
  const outroFade = useFadeUp(1440);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        paddingTop: CONTENT_TOP + 16 * S, paddingBottom: SUBTITLE_SAFE,
        paddingLeft: 80 * S, paddingRight: 80 * S,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ ...eyebrowFade, display: "flex", alignItems: "center", gap: 10 * S }}>
          <span style={{
            width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
            opacity: eyebrowPulse, boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          }} />
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.primary,
            letterSpacing: "0.2em", textTransform: "uppercase" as const,
          }}>重點整理 — RECAP</span>
        </div>
        <h2 style={{
          ...headFade, margin: `${10 * S}px 0 ${26 * S}px`,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 34 * S, color: C.text, textAlign: "center",
        }}>知識蒸餾 — 三個重點</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 * S }}>
          <RecapCard index="01" icon="🧪" title="是什麼" accent={C.primary} activeAt={90}
            body="讓小模型模仿大模型的機率分佈，而不是只學答案——知識更豐富、模型更輕量，名稱來自烈酒蒸餾。" />
          <RecapCard index="02" icon="📱" title="為什麼重要" accent={C.blue} activeAt={570}
            body="讓 AI 能上手機、邊緣裝置，降低成本和延遲。Apple Intelligence、Claude Haiku 背後都有它，是 AI 普及化的核心技術。" />
          <RecapCard index="03" icon="⚖️" title="要注意" accent={C.orange} activeAt={1110}
            body="蒸餾繼承知識的版權歸屬問題，法律上仍是灰色地帶，值得持續關注。" />
        </div>

        <div style={{ ...outroFade, marginTop: 28 * S, display: "flex", alignItems: "center", gap: 12 * S }}>
          <span style={{
            width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
            boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          }} />
          <span style={{ fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 500, color: C.textSub }}>
            這裡是<span style={{ color: C.primary, fontWeight: 700 }}>每日 AI 知識庫</span>，我們明天見 👋
          </span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── ROOT COMPOSITION ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export const VideoComposition_2026_06_04: React.FC = () => {
  const frame = useCurrentFrame();
  const Sx = SCENES_2026_06_04;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-06-04-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f, [TOTAL_FRAMES_2026_06_04 - 150, TOTAL_FRAMES_2026_06_04], [v, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return Math.min(fi, fo);
        }}
        loop
      />

      <Background />

      <Sequence from={Sx.title.from} durationInFrames={Sx.title.to - Sx.title.from}>
        <TitleScene />
      </Sequence>
      <Sequence from={Sx.scene1.from} durationInFrames={Sx.scene1.to - Sx.scene1.from}>
        <Scene1 />
      </Sequence>
      <Sequence from={Sx.scene2.from} durationInFrames={Sx.scene2.to - Sx.scene2.from}>
        <Scene2 />
      </Sequence>
      <Sequence from={Sx.scene3.from} durationInFrames={Sx.scene3.to - Sx.scene3.from}>
        <Scene3 />
      </Sequence>
      <Sequence from={Sx.scene4.from} durationInFrames={Sx.scene4.to - Sx.scene4.from}>
        <Scene4 />
      </Sequence>
      <Sequence from={Sx.summary.from} durationInFrames={Sx.summary.to - Sx.summary.from}>
        <SummaryScene />
      </Sequence>

      <ProgressBar globalFrame={frame} />
      <IMessageOverlay globalFrame={frame} />
    </AbsoluteFill>
  );
};
