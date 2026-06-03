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
const F_HEAD = "'Syne','Noto Sans TC',sans-serif"; // headings / titles / Latin emphasis
const F_BODY = "'DM Sans','Noto Sans TC',sans-serif"; // body / labels / eyebrows
const F_TC = "'Noto Sans TC',sans-serif"; // CJK-heavy body sentences

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
  orangeBorder: "rgba(255,159,67,0.22)",
  purple: "#a855f7",
  purpleLight: "rgba(168,85,247,0.1)",
  purpleBorder: "rgba(168,85,247,0.28)",
  red: "#f87171",
  redLight: "rgba(248,113,113,0.08)",
  redBorder: "rgba(248,113,113,0.28)",
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
// Title:   0s        → 0     hook + 合成資料 = AI 生成、用來訓練 AI 的資料
// Scene1:  26.72s    → 802   定義：醫療例子 + 形式多元 + Meta/MS/Google
// Scene2:  99.72s    → 2992  為什麼重要：版權 / 標註成本 / 規模 三壓力 + 按需生產
// Scene3:  172.12s   → 5164  風險：模型崩潰（影印機）+ 業界應對 + 版權灰色地帶
// Summary: 262.16s   → 7865  重點整理
// End:     315.4s    → 9462（+buffer → 9510）
// 2026-06-03 修：cut 前 60f (2s) 爆音 → Title 縮 742、其餘 scene 全 -60、TOTAL=9450
export const SCENES_2026_06_03 = {
  title: { from: 0, to: 742 },
  scene1: { from: 742, to: 2932 },
  scene2: { from: 2932, to: 5104 },
  scene3: { from: 5104, to: 7805 },
  summary: { from: 7805, to: 9450 },
} as const;
export const TOTAL_FRAMES_2026_06_03 = 9450;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "什麼是合成資料", start: 742 },
  { label: "為什麼重要", start: 2932 },
  { label: "風險與提醒", start: 5104 },
  { label: "重點整理", start: 7805 },
] as const;

// ── iMessage callouts (global frames) — 全 -60 對齊 cut 後 timeline ────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene1 結尾：想一想
  { from: 2513, to: 2932, sender: "想一想", text: "如果訓練資料是『合理的假資料』，AI 學到的算是真正的知識嗎？還是要看合成資料的品質與多樣性？" },
  // Scene3 結尾：最後一個問題
  { from: 7331, to: 7805, sender: "留個問題", text: "如果未來 AI 越來越多從 AI 生成的內容學習，而不是人類原創，你覺得它會越來越好，還是越來越偏？" },
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

// dim → bright tied to a VTT cue (scene-local frame). Present from scene start.
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

// ── RippleRing (rounded rect) ──────────────────────────────────────────────
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
      fontWeight: 700, lineHeight: 1.35, maxWidth: 640 * S, margin: "0 auto",
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

// ── FlowArrow — small directional connector ────────────────────────────────
function FlowArrow({ activeAt, label }: { activeAt: number; label?: string }) {
  const frame = useCurrentFrame();
  const { op } = calcActive(activeAt, frame, 0.2);
  return (
    <div style={{ opacity: op, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S }}>
      {label && <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>{label}</span>}
      <span style={{ fontFamily: F_BODY, fontSize: 34 * S, color: C.primary, lineHeight: 1 }}>→</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SyntheticLoop — central metaphor: AI 生成 → 假資料 → 訓練 AI（循環）────────
// ═══════════════════════════════════════════════════════════════════════════
function SyntheticLoop({ size, genAt, dataAt, traineeAt, loopAt }: {
  size: number; genAt: number; dataAt: number; traineeAt: number; loopAt: number;
}) {
  const frame = useCurrentFrame();
  const gen = calcActive(genAt, frame, 0.3);
  const data = calcActive(dataAt, frame, 0.3);
  const trainee = calcActive(traineeAt, frame, 0.3);
  const loop = calcActive(loopAt, frame, 0.2);
  const genPulse = 0.5 + 0.5 * Math.sin(frame * 0.06);

  const Node = ({ a, emoji, label, sub, accent, scaleBig }: {
    a: { op: number; isOn: boolean }; emoji: string; label: string; sub: string; accent: string; scaleBig?: boolean;
  }) => (
    <div style={{
      opacity: a.op, position: "relative",
      width: (scaleBig ? 0.34 : 0.3) * size, height: (scaleBig ? 0.34 : 0.3) * size,
      borderRadius: "50%", background: C.surface,
      border: `${2 * S}px solid ${a.isOn ? accent : C.surfaceBorder}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 * S,
      boxShadow: a.isOn ? `0 0 ${(28 + (scaleBig ? genPulse * 16 : 0)) * S}px ${accent}55` : "none",
    }}>
      {a.isOn && <RippleRing activeAt={scaleBig ? genAt : (label === "合成資料" ? dataAt : traineeAt)} color={accent} />}
      <span style={{ fontSize: 0.12 * size }}>{emoji}</span>
      <span style={{ fontFamily: F_HEAD, fontSize: 19 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub }}>{label}</span>
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>{sub}</span>
    </div>
  );

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S }}>
      {/* loop label arc on top */}
      <div style={{
        opacity: loop.op,
        fontFamily: F_BODY, fontSize: 18 * S, color: C.primary, letterSpacing: "0.08em",
        display: "flex", alignItems: "center", gap: 10 * S,
      }}>
        <span style={{ fontSize: 24 * S }}>↻</span> AI 用 AI 生成的資料訓練自己
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 22 * S }}>
        <Node a={gen} emoji="🏭" label="強大 AI" sub="GENERATOR" accent={C.primary} scaleBig />
        <FlowArrow activeAt={dataAt} label="生成" />
        <Node a={data} emoji="📄" label="合成資料" sub="SYNTHETIC" accent={C.blue} />
        <FlowArrow activeAt={traineeAt} label="訓練" />
        <Node a={trainee} emoji="🎓" label="目標模型" sub="TRAINEE" accent={C.orange} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_03.title.to - SCENES_2026_06_03.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(34);
  const tagStyle = useFadeUp(50);
  const loopStyle = useFadeUp(90);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));

  // teaser「AI 生成、用來訓練 AI 的資料」17.68→530（title-local = global）
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

        <h1 style={{ margin: 0, lineHeight: 1.15, fontFamily: F_HEAD, fontWeight: 800, fontSize: 40 * S, color: C.text }}>
          <WordReveal text="什麼是合成資料？" startFrame={10} staggerPerWord={6}
            fontSize={40 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>
        <h1 style={{ margin: 0, lineHeight: 1.2, marginTop: 6 * S, fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary }}>
          <WordReveal text="AI 開始用 AI 的資料訓練自己" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 18 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          AI 生成、用來訓練 AI 的資料
        </p>

        {/* central hero loop teaser — forms as the narration previews 生成 → 資料 → 訓練 */}
        <div style={{ ...loopStyle, marginTop: 30 * S }}>
          <SyntheticLoop size={250 * S} genAt={420} dataAt={500} traineeAt={580} loopAt={653} />
        </div>

        <div style={{ ...tagStyle, marginTop: 28 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>Synthetic Data · 合成資料 · 模型崩潰 · 按需生產</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — 什麼是合成資料：醫療例子 + 形式多元 + 三廠採用 ─────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: real medical data (locked) → strong AI generator → trainee model
function MedicalPipeline({ realAt, genAt, dataAt, traineeAt }: {
  realAt: number; genAt: number; dataAt: number; traineeAt: number;
}) {
  const frame = useCurrentFrame();
  const real = calcActive(realAt, frame, 0.3);
  const gen = calcActive(genAt, frame, 0.3);
  const data = calcActive(dataAt, frame, 0.3);
  const trainee = calcActive(traineeAt, frame, 0.3);

  const Stage = ({ a, emoji, title, note, accent, locked, scaleBig }: {
    a: { op: number; isOn: boolean }; emoji: string; title: string; note: string; accent: string; locked?: boolean; scaleBig?: boolean;
  }) => (
    <div style={{
      opacity: a.op, position: "relative",
      width: (scaleBig ? 300 : 268) * S, borderRadius: 20 * S,
      background: locked ? C.redLight : C.surface,
      border: `1px solid ${a.isOn ? (locked ? C.redBorder : accent + "66") : C.surfaceBorder}`,
      padding: `${20 * S}px ${18 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
      boxShadow: a.isOn && !locked ? `0 0 ${30 * S}px ${accent}1f` : "none",
    }}>
      {a.isOn && !locked && <RippleRing activeAt={scaleBig ? genAt : traineeAt} color={accent} radius={20 * S} />}
      <div style={{
        width: 90 * S, height: 90 * S, borderRadius: "50%",
        background: `${locked ? C.red : accent}1a`, border: `${2 * S}px solid ${locked ? C.red : accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46 * S,
        filter: locked ? "grayscale(0.3)" : "none",
      }}>{emoji}</div>
      <span style={{ fontFamily: F_HEAD, fontSize: 23 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub, textAlign: "center" }}>{title}</span>
      <span style={{
        fontFamily: F_TC, fontSize: 19 * S, fontWeight: 500, color: locked ? C.red : C.textSub,
        textAlign: "center", lineHeight: 1.35,
      }}>{note}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
      <Stage a={real} emoji="🔒" title="真實病歷" note="取得困難 · 隱私與法規" accent={C.red} locked />
      <FlowArrow activeAt={genAt} label="改用" />
      <Stage a={gen} emoji="🏭" title="強大 AI" note="批量生成假但合理的問答" accent={C.primary} scaleBig />
      <FlowArrow activeAt={traineeAt} label="拿來訓練" />
      <Stage a={trainee} emoji="🎓" title="目標模型" note="學會回答醫療問題" accent={C.orange} />
    </div>
  );
}

// Phase B hero: 合成資料的多元形式 + 三大廠採用
function FormChip({ emoji, label, activeAt }: { emoji: string; label: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const a = calcActive(activeAt, frame, 0.28);
  return (
    <div style={{
      opacity: a.op, width: 250 * S,
      display: "flex", alignItems: "center", gap: 12 * S,
      background: C.surface, border: `1px solid ${a.isOn ? C.blueBorder : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${12 * S}px ${18 * S}px`,
      boxShadow: a.isOn ? `0 0 ${24 * S}px ${C.blue}1f` : "none",
    }}>
      <span style={{ fontSize: 30 * S }}>{emoji}</span>
      <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function CompanyCard({ emoji, name, model, activeAt }: { emoji: string; name: string; model: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const a = calcActive(activeAt, frame, 0.28);
  return (
    <div style={{
      opacity: a.op, position: "relative", width: 320 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
      background: C.surface, border: `1px solid ${a.isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 18 * S, padding: `${16 * S}px ${18 * S}px`,
      boxShadow: a.isOn ? `0 0 ${28 * S}px ${C.primaryGlow}` : "none",
    }}>
      {a.isOn && <RippleRing activeAt={activeAt} color={C.primary} radius={18 * S} />}
      <span style={{ fontSize: 38 * S }}>{emoji}</span>
      <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub }}>{name}</span>
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500, color: C.primary, letterSpacing: "0.04em" }}>{model}</span>
    </div>
  );
}

function FormsAndCompanies({ formsAt, stdAt, c1At, c2At, c3At }: {
  formsAt: number; stdAt: number; c1At: number; c2At: number; c3At: number;
}) {
  const frame = useCurrentFrame();
  const std = calcActive(stdAt, frame, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      {/* form chips — listed in one breath, uniform stagger */}
      <div style={{ display: "flex", gap: 16 * S, justifyContent: "center", flexWrap: "wrap" as const, maxWidth: 1080 * S }}>
        <FormChip emoji="📝" label="文字問答" activeAt={formsAt} />
        <FormChip emoji="💻" label="程式碼" activeAt={formsAt + 14} />
        <FormChip emoji="🖼️" label="圖片" activeAt={formsAt + 28} />
        <FormChip emoji="📊" label="結構化表格" activeAt={formsAt + 42} />
      </div>
      {/* standard-config badge */}
      <div style={{
        opacity: std.op, display: "flex", alignItems: "center", gap: 10 * S,
        fontFamily: F_BODY, fontSize: 19 * S, fontWeight: 700, color: C.primary,
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 99, padding: `${8 * S}px ${22 * S}px`, letterSpacing: "0.06em",
      }}>
        ✓ 已是大模型訓練的「標準配件」
      </div>
      {/* three companies */}
      <div style={{ display: "flex", gap: 22 * S, justifyContent: "center" }}>
        <CompanyCard emoji="🟦" name="Meta" model="Llama 3" activeAt={c1At} />
        <CompanyCard emoji="🟨" name="Microsoft" model="Phi 系列" activeAt={c2At} />
        <CompanyCard emoji="🔵" name="Google" model="Gemini" activeAt={c3At} />
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_03.scene1.to - SCENES_2026_06_03.scene1.from;
  // local = global - 802. Phase B 第一句「形式非常多元」58.72→1762, local 960
  const A_FADE_START = 880;
  const A_REMOVE = 960;
  const B_SHOW_AT = 960;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g802 先想像一個情境
  const DIFF_AT = 146; // g948 真實病歷取得困難涉及隱私
  const GEN_AT = 453; // g1255 用強大 AI 批量生成
  const TRAINEE_AT = 606; // g1408 拿來訓練目標模型
  const DEF_AT = 715; // g1517 這就是合成資料核心概念

  // Phase B captions (local)
  const FORMS_AT = 1034; // g1836 文字/程式碼/圖片/表格
  const STD_AT = 1308; // g2110 標準配件之一
  const C1_AT = 1474; // g2276 Meta Llama 3
  const C2_AT = 1530; // g2332 Microsoft Phi
  const C3_AT = 1597; // g2399 Google Gemini

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A hero — 醫療例子 pipeline ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="核心概念 ／ DEFINITION" delay={HEADER_AT} color={C.primary} />}
            sentence={
              frame >= GEN_AT
                ? <StageSentence text="改用強大 AI，生成假但合理的問答" delay={GEN_AT} color={C.primary} fontSize={26 * S} />
                : frame >= DIFF_AT
                ? <StageSentence text="真實病歷難取得——隱私與法規嚴格" delay={DIFF_AT} color={C.red} fontSize={26 * S} />
                : <StageSentence text="想像：你要訓練一個醫療 AI" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="合成資料：由 AI 生成、供其他 AI 使用的訓練資料" delay={DEF_AT} color={C.primary} />}
          >
            <MedicalPipeline realAt={DIFF_AT} genAt={GEN_AT} dataAt={GEN_AT + 40} traineeAt={TRAINEE_AT} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B hero — 形式多元 + 三廠採用 ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="標準配件 ／ EVERYWHERE" delay={B_SHOW_AT} color={C.blue} />}
          sentence={
            frame >= STD_AT
              ? <StageSentence text="它已是大模型訓練的標準配件之一" delay={STD_AT} color={C.text} fontSize={26 * S} />
              : <StageSentence text="合成資料的形式非常多元" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="Meta、Microsoft、Google 都在訓練時大量引入" delay={C1_AT} color={C.primary} />}
        >
          <FormsAndCompanies formsAt={FORMS_AT} stdAt={STD_AT} c1At={C1_AT} c2At={C2_AT} c3At={C3_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 為什麼重要：三個壓力 + 按需生產 ───────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: three pressure columns
function PressureCard({ index, emoji, title, note, activeAt, accent }: {
  index: string; emoji: string; title: string; note: string; activeAt: number; accent: string;
}) {
  const frame = useCurrentFrame();
  const a = calcActive(activeAt, frame, 0.28);
  const sc = a.isOn ? easeOutBack(prog(Math.max(0, frame - activeAt), 22)) : 0.9;
  return (
    <div style={{
      opacity: a.op, position: "relative",
      transform: `scale(${Math.max(0.9, Math.min(1, sc))})`,
      width: 340 * S, height: 360 * S, borderRadius: 22 * S,
      background: C.surface, border: `1px solid ${a.isOn ? accent + "66" : C.surfaceBorder}`,
      padding: `${24 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      boxShadow: a.isOn ? `0 0 ${36 * S}px ${accent}22` : "none",
    }}>
      {a.isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: accent,
        background: `${accent}1a`, border: `1px solid ${accent}66`, borderRadius: 99,
        width: 56 * S, height: 56 * S, display: "flex", alignItems: "center", justifyContent: "center",
      }}>{index}</div>
      <div style={{
        width: 96 * S, height: 96 * S, borderRadius: "50%",
        background: `${accent}14`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 50 * S,
      }}>{emoji}</div>
      <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub, textAlign: "center" }}>{title}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500, color: C.textSub, textAlign: "center", lineHeight: 1.4 }}>{note}</span>
    </div>
  );
}

function ThreePressures({ p1At, p2At, p3At }: { p1At: number; p2At: number; p3At: number }) {
  return (
    <div style={{ display: "flex", gap: 24 * S, justifyContent: "center", alignItems: "center" }}>
      <PressureCard index="01" emoji="🔒" title="版權收緊" note="媒體封鎖爬蟲、NYT・Getty 興訟，免費抓取時代結束" activeAt={p1At} accent={C.orange} />
      <PressureCard index="02" emoji="💰" title="標註成本高" note="人工標註費時又貴，專業領域的標註員本身就稀缺" activeAt={p2At} accent={C.blue} />
      <PressureCard index="03" emoji="📈" title="規模擴張" note="模型要更多資料，真實資料的成長已跟不上需求" activeAt={p3At} accent={C.primary} />
    </div>
  );
}

// Phase B hero: on-demand generation + research effectiveness
function OnDemand({ tapAt, researchAt, barAt }: { tapAt: number; researchAt: number; barAt: number }) {
  const frame = useCurrentFrame();
  const tap = calcActive(tapAt, frame, 0.3);
  const research = calcActive(researchAt, frame, 0.32);
  const synthGrow = interpolate(Math.max(0, frame - barAt), [0, 28], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  const realGrow = interpolate(Math.max(0, frame - barAt - 10), [0, 28], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  const maxH = 200 * S;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 70 * S }}>
      {/* on-demand faucet */}
      <div style={{
        opacity: tap.op, position: "relative",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
        background: C.surface, border: `1px solid ${tap.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 24 * S, padding: `${28 * S}px ${40 * S}px`,
        boxShadow: tap.isOn ? `0 0 ${40 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontSize: 76 * S }}>🚰</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color: C.primary }}>按需生產</span>
        <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 500, color: C.textSub, textAlign: "center", lineHeight: 1.4 }}>你需要多少<br />就生成多少</span>
      </div>
      {/* effectiveness comparison */}
      <div style={{
        opacity: research.op,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
      }}>
        <span style={{ fontFamily: F_BODY, fontSize: 19 * S, color: C.muted, letterSpacing: "0.06em" }}>特定任務上的訓練效果</span>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 40 * S, height: maxH }}>
          {/* synthetic bar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S, justifyContent: "flex-end" }}>
            <div style={{
              width: 120 * S, height: maxH * 0.92 * synthGrow,
              background: C.primary, borderRadius: `${10 * S}px ${10 * S}px 0 0`,
              boxShadow: `0 0 ${24 * S}px ${C.primary}44`,
            }} />
            <span style={{ fontFamily: F_BODY, fontSize: 19 * S, fontWeight: 700, color: C.primary }}>高品質合成</span>
          </div>
          <span style={{ fontFamily: F_HEAD, fontSize: 40 * S, fontWeight: 800, color: C.text, alignSelf: "center" }}>≈</span>
          {/* real bar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S, justifyContent: "flex-end" }}>
            <div style={{
              width: 120 * S, height: maxH * 1.0 * realGrow,
              background: "rgba(240,240,245,0.28)", borderRadius: `${10 * S}px ${10 * S}px 0 0`,
              border: `1px solid ${C.surfaceBorder}`,
            }} />
            <span style={{ fontFamily: F_BODY, fontSize: 19 * S, fontWeight: 700, color: C.textSub }}>等量真實</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_03.scene2.to - SCENES_2026_06_03.scene2.from;
  // local = global - 2992. Phase B 第一句「按需生產的出路」154.80→4644, local 1652
  const A_FADE_START = 1572;
  const A_REMOVE = 1652;
  const B_SHOW_AT = 1652;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g2992 為什麼這麼重要
  const THREE_AT = 80; // g3072 三個現實壓力
  const P1_AT = 256; // g3248 第一 真實資料難取得
  const P2_AT = 1026; // g4018 第二 標註成本
  const P3_AT = 1359; // g4351 第三 規模擴張

  // Phase B captions (local)
  const TAP_AT = 1652; // g4644 按需生產
  const RESEARCH_AT = 1870; // g4862 研究也顯示
  const BAR_AT = 1962; // g4954 高品質合成資料效果

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A hero — 三個壓力 ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="為什麼重要 ／ THE DRIVERS" delay={HEADER_AT} color={C.orange} />}
            sentence={
              frame >= P3_AT
                ? <StageSentence text="壓力三：模型規模需求只增不減" delay={P3_AT} color={C.primary} fontSize={26 * S} />
                : frame >= P2_AT
                ? <StageSentence text="壓力二：高品質標註成本極高" delay={P2_AT} color={C.blue} fontSize={26 * S} />
                : frame >= P1_AT
                ? <StageSentence text="壓力一：真實資料越來越難取得" delay={P1_AT} color={C.orange} fontSize={26 * S} />
                : <StageSentence text="背後有三個現實壓力同時推動" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="版權、成本、規模——三股壓力同時推著大家用合成資料" delay={P3_AT} color={C.orange} />}
          >
            <ThreePressures p1At={P1_AT} p2At={P2_AT} p3At={P3_AT} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B hero — 按需生產 + 效果不亞於真實 ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="出路 ／ ON DEMAND" delay={B_SHOW_AT} color={C.primary} />}
          sentence={
            frame >= BAR_AT
              ? <StageSentence text="研究：好的合成資料效果不亞於真實" delay={BAR_AT} color={C.primary} fontSize={26 * S} />
              : <StageSentence text="合成資料能「按需生產」——要多少生多少" delay={B_SHOW_AT} color={C.text} fontSize={26 * S} />
          }
          takeaway={<StageTakeaway text="特定任務上，高品質合成資料可媲美等量的真實資料" delay={BAR_AT} color={C.primary} />}
        >
          <OnDemand tapAt={TAP_AT} researchAt={RESEARCH_AT} barAt={BAR_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 風險：模型崩潰（影印機）+ 業界應對 + 版權灰色地帶 ──────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: copy-of-a-copy degradation (model collapse)
function CopyDegrade({ startAt, applyAt }: { startAt: number; applyAt: number }) {
  const frame = useCurrentFrame();
  const gens = [0, 1, 2, 3, 4];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
        {gens.map((i) => {
          const at = i === 0 ? startAt : applyAt + (i - 1) * 60;
          const a = calcActive(at, frame, i === 0 ? 0.4 : 0.25);
          const blur = i * 2.4; // px (×S applied below)
          const gray = i * 0.22;
          const isLast = i === gens.length - 1;
          const accent = isLast ? C.red : i >= 3 ? C.orange : C.primary;
          return (
            <React.Fragment key={i}>
              <div style={{
                opacity: a.op, position: "relative",
                width: 168 * S, height: 132 * S, borderRadius: 16 * S, overflow: "hidden",
                background: "linear-gradient(135deg, #1a2540 0%, #2a1a40 50%, #401a2a 100%)",
                border: `1px solid ${a.isOn ? accent + "66" : C.surfaceBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{
                  fontSize: 64 * S,
                  filter: `blur(${blur * S}px) grayscale(${gray}) contrast(${1 - i * 0.12})`,
                  opacity: 1 - i * 0.12,
                }}>🖼️</span>
                <span style={{
                  position: "absolute", bottom: 6 * S, left: 8 * S,
                  fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700,
                  color: accent, background: C.chipBg, borderRadius: 6 * S, padding: `${2 * S}px ${8 * S}px`,
                }}>第 {i + 1} 代</span>
              </div>
              {i < gens.length - 1 && (
                <span style={{ fontFamily: F_BODY, fontSize: 26 * S, color: C.muted, opacity: a.op }}>→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{
        opacity: calcActive(applyAt + 60, frame, 0).op,
        fontFamily: F_BODY, fontSize: 18 * S, color: C.red, letterSpacing: "0.06em",
        display: "flex", alignItems: "center", gap: 10 * S,
      }}>
        🖨️ 就像「影印機的影印機」——複製越多次，畫面越失真
      </div>
    </div>
  );
}

// Phase A bottom: industry mitigations
function MitigationChip({ emoji, label, activeAt }: { emoji: string; label: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const a = calcActive(activeAt, frame, 0.28);
  return (
    <div style={{
      opacity: a.op, display: "flex", alignItems: "center", gap: 10 * S,
      background: C.surface, border: `1px solid ${a.isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${10 * S}px ${20 * S}px`,
      boxShadow: a.isOn ? `0 0 ${22 * S}px ${C.primaryGlow}` : "none",
    }}>
      <span style={{ fontSize: 26 * S }}>{emoji}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function CollapseHero({ collapseAt, degradeAt, fixAt, m1At, m2At, m3At }: {
  collapseAt: number; degradeAt: number; fixAt: number; m1At: number; m2At: number; m3At: number;
}) {
  const frame = useCurrentFrame();
  const fix = calcActive(fixAt, frame, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * S }}>
      <CopyDegrade startAt={collapseAt} applyAt={degradeAt} />
      {/* mitigations */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S }}>
        <span style={{
          opacity: fix.op, fontFamily: F_BODY, fontSize: 18 * S, color: C.primary, letterSpacing: "0.08em",
        }}>業界的應對方式 ↓</span>
        <div style={{ display: "flex", gap: 16 * S, justifyContent: "center", flexWrap: "wrap" as const }}>
          <MitigationChip emoji="🔀" label="混合真實＋合成" activeAt={m1At} />
          <MitigationChip emoji="🧹" label="嚴格品質過濾" activeAt={m2At} />
          <MitigationChip emoji="🌈" label="保持足夠多樣性" activeAt={m3At} />
        </div>
      </div>
    </div>
  );
}

// Phase B hero: copyright grey zone
function GreyZone({ srcAt, dataAt, liableAt, zoneAt }: {
  srcAt: number; dataAt: number; liableAt: number; zoneAt: number;
}) {
  const frame = useCurrentFrame();
  const src = calcActive(srcAt, frame, 0.3);
  const data = calcActive(dataAt, frame, 0.3);
  const liable = calcActive(liableAt, frame, 0.3);
  const zone = calcActive(zoneAt, frame, 0.32);

  const Box = ({ a, emoji, title, note, accent, danger }: {
    a: { op: number; isOn: boolean }; emoji: string; title: string; note: string; accent: string; danger?: boolean;
  }) => (
    <div style={{
      opacity: a.op, width: 320 * S, borderRadius: 20 * S,
      background: danger ? C.redLight : C.surface,
      border: `1px solid ${a.isOn ? (danger ? C.redBorder : accent + "66") : C.surfaceBorder}`,
      padding: `${20 * S}px ${18 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
    }}>
      <div style={{
        width: 84 * S, height: 84 * S, borderRadius: "50%",
        background: `${danger ? C.red : accent}1a`, border: `${2 * S}px solid ${danger ? C.red : accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42 * S,
      }}>{emoji}</div>
      <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub, textAlign: "center" }}>{title}</span>
      <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 500, color: danger ? C.red : C.textSub, textAlign: "center", lineHeight: 1.35 }}>{note}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
        <Box a={src} emoji="⚠️" title="來源模型" note="本身可能有版權爭議" accent={C.orange} danger />
        <FlowArrow activeAt={dataAt} label="生成" />
        <Box a={data} emoji="📄" title="合成資料" note="透過它產生的資料" accent={C.blue} />
        <FlowArrow activeAt={liableAt} label="那麼" />
        <Box a={liable} emoji="⚖️" title="法律責任" note="算誰的？至今沒有定論" accent={C.purple} />
      </div>
      <div style={{
        opacity: zone.op, display: "flex", alignItems: "center", gap: 14 * S,
        fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700, color: C.text,
        background: C.surface, border: `1px solid ${C.orangeBorder}`, borderRadius: 16 * S,
        padding: `${14 * S}px ${28 * S}px`,
      }}>
        <span style={{ fontSize: 30 * S }}>🌫️</span> 「資料從哪來」變模糊——這至今仍是法律灰色地帶
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_03.scene3.to - SCENES_2026_06_03.scene3.from;
  // local = global - 5164. Phase B 第一句「AI 素養提醒」230.48→6914, local 1750
  const A_FADE_START = 1670;
  const A_REMOVE = 1750;
  const B_SHOW_AT = 1750;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g5164 那合成資料有沒有風險
  const COLLAPSE_AT = 232; // g5396 核心風險：模型崩潰
  const DEGRADE_AT = 436; // g5600 多輪迴圈後
  const COPY_AT = 607; // g5771 就像影印機的影印機
  const FIX_AT = 1324; // g6488 業界的應對方式是
  const M1_AT = 1381; // g6545 混合真實與合成
  const M2_AT = 1462; // g6626 嚴格品質過濾
  const M3_AT = 1548; // g6712 保持足夠多樣性

  // Phase B captions (local)
  const LITERACY_AT = 1750; // g6914 AI 素養提醒 / 模糊來源
  const SRCISSUE_AT = 1908; // g7072 來源模型有版權爭議
  const SYNTH_AT = 2024; // g7188 透過它生成的合成資料
  const LIABLE_AT = 2080; // g7244 法律責任算誰
  const ZONE_AT = 2128; // g7292 灰色地帶

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A hero — 模型崩潰 ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="核心風險 ／ MODEL COLLAPSE" delay={HEADER_AT} color={C.red} />}
            sentence={
              frame >= FIX_AT
                ? <StageSentence text="業界做法：混真實＋過濾＋保持多樣性" delay={FIX_AT} color={C.primary} fontSize={26 * S} />
                : frame >= COPY_AT
                ? <StageSentence text="多輪後越來越同質、越偏離真實" delay={COPY_AT} color={C.red} fontSize={26 * S} />
                : frame >= COLLAPSE_AT
                ? <StageSentence text="核心風險：模型崩潰" delay={COLLAPSE_AT} color={C.red} />
                : <StageSentence text="那合成資料有沒有風險？有。" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="純粹讓 AI 自說自話是不行的——一定要混真實資料" delay={FIX_AT} color={C.red} />}
          >
            <CollapseHero collapseAt={COLLAPSE_AT} degradeAt={DEGRADE_AT} fixAt={FIX_AT} m1At={M1_AT} m2At={M2_AT} m3At={M3_AT} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B hero — 版權灰色地帶 ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="AI 素養提醒 ／ THE CAVEAT" delay={B_SHOW_AT} color={C.orange} />}
          sentence={
            frame >= SRCISSUE_AT
              ? <StageSentence text="來源模型若有爭議，責任算誰的？" delay={SRCISSUE_AT} color={C.orange} fontSize={26 * S} />
              : <StageSentence text="合成資料也模糊了「資料從哪來」" delay={B_SHOW_AT} color={C.text} fontSize={26 * S} />
          }
          takeaway={<StageTakeaway text="版權歸屬，至今仍是一塊未解的法律灰色地帶" delay={ZONE_AT} color={C.orange} />}
        >
          <GreyZone srcAt={SRCISSUE_AT} dataAt={SYNTH_AT} liableAt={LIABLE_AT} zoneAt={ZONE_AT} />
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
      <div style={{ fontFamily: F_TC, fontSize: 25 * S, color: C.text, fontWeight: 700, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_03.summary.to - SCENES_2026_06_03.summary.from;
  // local = global - 7865
  const BADGE_AT = 0; // g7865 今天的重點整理
  const CARD1_AT = 47; // g7912 第一
  const CARD2_AT = 551; // g8416 第二
  const CARD3_AT = 966; // g8831 第三
  const OUTRO_AT = 1424; // g9289 這裡是每日 AI 知識庫

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
        text="合成資料＝由 AI 生成的訓練資料，已是大模型訓練的標準配件，Meta、Microsoft、Google 都大量使用" />
      <BigTakeaway number="02" delay={CARD2_AT} color={C.orange} top={800}
        text="為什麼重要：版權收緊、標註成本高、模型規模擴張，三股壓力同時推動「按需生產」的解法" />
      <BigTakeaway number="03" delay={CARD3_AT} color={C.blue} top={1240}
        text="風險要知道：純 AI 教 AI 會「模型崩潰」、輸出越來越同質；需混合真實資料，且版權歸屬仍是法律灰色地帶" />

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
export function VideoComposition_2026_06_03() {
  const frame = useCurrentFrame();
  const T = SCENES_2026_06_03.title;
  const S1 = SCENES_2026_06_03.scene1;
  const S2 = SCENES_2026_06_03.scene2;
  const S3 = SCENES_2026_06_03.scene3;
  const SU = SCENES_2026_06_03.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Main narration */}
      <Audio src={staticFile("audio/2026-06-03-processed.wav")} volume={1.0} />

      {/* Background music (0.10 vol, fade in/out) */}
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_06_03 - 150, TOTAL_FRAMES_2026_06_03], [v, 0], {
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
