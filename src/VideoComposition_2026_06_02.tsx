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

// ── Scale & canvas ─────────────────────────────────────────────────────────
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
// Title:    0s     → 0     hook: ChatGPT vs GPT-3 → RLHF 是關鍵
// Scene1:   19s    → 570   什麼是 RLHF + 三步驟訓練 (預訓練/監督/強化)
// Scene2:   103s   → 3090  為什麼 RLHF 改變了一切 (Before/After + ChatGPT/Claude)
// Scene3:   175s   → 5250  使用者必知三件事 + AI 素養提醒
// Summary:  265s   → 7950  重點整理
// End:      306s   → 9180  (+90 buffer → 9270)
export const SCENES_2026_06_02 = {
  title: { from: 0, to: 570 },
  scene1: { from: 570, to: 3090 },
  scene2: { from: 3090, to: 5250 },
  scene3: { from: 5250, to: 7950 },
  summary: { from: 7950, to: 9270 },
} as const;
export const TOTAL_FRAMES_2026_06_02 = 9270;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "RLHF 是什麼", start: 570 },
  { label: "為什麼重要", start: 3090 },
  { label: "使用者守則", start: 5250 },
  { label: "重點整理", start: 7950 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // 01:37 「如果你是評分員，你會怎麼定義好答案」
  { from: 2910, to: 3090, sender: "想一想", text: "如果你是評分員，你會怎麼定義「好答案」？你的標準和另一個人一定一樣嗎？" },
  // 02:46 「有幫助、安全、誠實這三個目標真的能同時完全做到嗎」
  { from: 4980, to: 5250, sender: "想一想", text: "「有幫助、安全、誠實」這三個目標真的能同時完全做到嗎？有沒有互相衝突的時候？" },
  // 04:14 「最後留給你一個問題」
  { from: 7620, to: 7950, sender: "親身經歷", text: "如果大多數標注員來自同一文化背景，AI 學到的「好答案」標準會不會有你看不見的盲點？" },
];

// ── Easing tokens ──────────────────────────────────────────────────────────
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

// dim → bright tied to a VTT cue (scene-local frame)
function calcDim(activeAt: number, frame: number, dimOpacity = 0.28) {
  const af = Math.max(0, frame - activeAt);
  const t = interpolate(af, [0, 22], [dimOpacity, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const isOn = frame >= activeAt;
  return { op: Math.max(dimOpacity, Math.min(1, t)), isOn };
}

// ── WordReveal (Latin words) ───────────────────────────────────────────────
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
      fontWeight: 700, lineHeight: 1.35, maxWidth: 700 * S, margin: "0 auto",
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

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function ModelOrb({ label, sublabel, accent, activeAt, dimmed }: {
  label: string; sublabel: string; accent: string; activeAt: number; dimmed?: boolean;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, dimmed ? 0.3 : 0.32);
  return (
    <div style={{
      opacity: op,
      width: 320 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 24 * S, padding: `${24 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${accent}22` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={24 * S} />}
      <div style={{
        width: 96 * S, height: 96 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 * S,
        boxShadow: isOn ? `0 0 ${20 * S}px ${accent}55` : "none",
      }}>🤖</div>
      <div style={{
        fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color: isOn ? C.text : C.textSub,
        letterSpacing: "0.02em",
      }}>{label}</div>
      <div style={{
        fontFamily: F_TC, fontSize: 18 * S, color: isOn ? accent : C.muted, fontWeight: 700,
        letterSpacing: "0.04em",
      }}>{sublabel}</div>
    </div>
  );
}

function RLHFArrowBadge({ activeAt }: { activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  const sc = isOn ? easeOutBack(prog(Math.max(0, frame - activeAt), 22)) : 0.9;
  return (
    <div style={{
      opacity: op, transform: `scale(${Math.max(0.9, Math.min(1, sc))})`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
      padding: `${14 * S}px ${28 * S}px`,
      background: C.surface, border: `1px solid ${C.primaryBorder}`,
      borderRadius: 18 * S,
      boxShadow: `0 0 ${30 * S}px ${C.primary}22`, position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={C.primary} radius={18 * S} />}
      <div style={{
        fontFamily: F_HEAD, fontWeight: 800, fontSize: 32 * S, color: C.primary,
        letterSpacing: "0.08em", textShadow: `0 0 ${16 * S}px ${C.primary}66`,
      }}>RLHF</div>
      <div style={{
        fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.text,
        letterSpacing: "0.04em",
      }}>關鍵訓練技術</div>
    </div>
  );
}

function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_02.title.to - SCENES_2026_06_02.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(60);
  const tagStyle = useFadeUp(440);
  const rowStyle = useFadeUp(100);
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
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 48 * S, color: C.text,
        }}>
          <WordReveal text="什麼是 RLHF？" startFrame={10} staggerPerWord={6}
            fontSize={48 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 32 * S, color: C.primary,
        }}>
          <WordReveal text="人類怎麼教 AI 判斷好壞答案" startFrame={28} staggerPerWord={6}
            fontSize={32 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 24 * S, marginBottom: 0,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6, maxWidth: 1400 * S,
        }}>
          ChatGPT 為什麼比 GPT-3 好用那麼多？關鍵藏在 RLHF 這個訓練技術裡
        </p>

        {/* GPT-3 → RLHF → ChatGPT comparison hero */}
        <div style={{ ...rowStyle, marginTop: 44 * S, display: "flex", alignItems: "center", gap: 30 * S, justifyContent: "center" }}>
          <ModelOrb label="GPT-3" sublabel="會說話，不太懂事" accent={C.muted} activeAt={120} dimmed />
          <span style={{ fontSize: 42 * S, color: C.primary, opacity: 0.8 }}>→</span>
          <RLHFArrowBadge activeAt={420} />
          <span style={{ fontSize: 42 * S, color: C.primary, opacity: 0.8 }}>→</span>
          <ModelOrb label="ChatGPT" sublabel="懂人類想要什麼" accent={C.primary} activeAt={420} />
        </div>

        <div style={{ ...tagStyle, marginTop: 32 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>人類回饋 · 強化學習 · 三步驟訓練</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — RLHF 是什麼 + 三步驟訓練 ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A: simple Try → Evaluate → Adjust loop + acronym chips
function CycleNode({ icon, label, accent, activeAt }: {
  icon: string; label: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, position: "relative",
      width: 180 * S, height: 180 * S, borderRadius: "50%",
      background: `${accent}14`, border: `${2 * S}px solid ${isOn ? accent : "rgba(255,255,255,0.15)"}`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 6 * S,
      boxShadow: isOn ? `0 0 ${30 * S}px ${accent}33` : "none",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} />}
      <div style={{ fontSize: 44 * S }}>{icon}</div>
      <div style={{
        fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: isOn ? C.text : C.textSub,
      }}>{label}</div>
    </div>
  );
}

function AcronymChip({ letter, word, accent, activeAt }: { letter: string; word: string; accent: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${10 * S}px ${16 * S}px`,
      display: "flex", alignItems: "center", gap: 12 * S,
      boxShadow: isOn ? `0 0 ${20 * S}px ${accent}1f` : "none",
    }}>
      <span style={{
        fontFamily: F_HEAD, fontWeight: 800, fontSize: 28 * S, color: accent,
        width: 36 * S, textAlign: "center" as const,
      }}>{letter}</span>
      <span style={{ fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 500, color: isOn ? C.text : C.textSub }}>{word}</span>
    </div>
  );
}

function Scene1HeroA() {
  const frame = useCurrentFrame();
  // arrow opacity tied to cycle nodes activation
  const arrow1 = interpolate(Math.max(0, frame - 360), [0, 20], [0.25, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const arrow2 = interpolate(Math.max(0, frame - 420), [0, 20], [0.25, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const arrow3 = interpolate(Math.max(0, frame - 480), [0, 20], [0.25, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 * S }}>
      {/* Core loop visual */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 * S }}>
        <CycleNode icon="🤖" label="AI 嘗試" accent={C.primary} activeAt={360} />
        <span style={{ fontSize: 40 * S, color: C.primary, opacity: arrow1 }}>→</span>
        <CycleNode icon="👤" label="人類評價" accent={C.blue} activeAt={420} />
        <span style={{ fontSize: 40 * S, color: C.primary, opacity: arrow2 }}>→</span>
        <CycleNode icon="⚙️" label="AI 調整" accent={C.orange} activeAt={480} />
        <span style={{ fontSize: 40 * S, color: C.primary, opacity: arrow3 }}>↻</span>
      </div>
      {/* RLHF acronym breakdown */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10 * S, flexWrap: "wrap" as const,
        justifyContent: "center",
      }}>
        <AcronymChip letter="R" word="Reinforcement" accent={C.primary} activeAt={0} />
        <AcronymChip letter="L" word="Learning" accent={C.primary} activeAt={0} />
        <AcronymChip letter="H" word="Human" accent={C.blue} activeAt={0} />
        <AcronymChip letter="F" word="Feedback" accent={C.blue} activeAt={0} />
      </div>
      {/* Chinese name + 三階段 preview */}
      <div style={{
        display: "flex", gap: 16 * S, alignItems: "center",
        background: C.surface, border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${10 * S}px ${22 * S}px`,
      }}>
        <span style={{ fontSize: 24 * S }}>🈳</span>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub }}>中文：</span>
        <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text }}>人類回饋強化學習</span>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, marginLeft: 14 * S }}>· 分三階段進行</span>
      </div>
    </div>
  );
}

// Phase B: 3-step training pipeline
function StepCard({ stepIndex, icon, title, desc, accent, activeAt, expanded, children }: {
  stepIndex: string; icon: string; title: string; desc: string; accent: string; activeAt: number;
  expanded?: boolean; children?: React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.28);
  return (
    <div style={{
      opacity: op,
      width: 300 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      boxShadow: isOn ? `0 0 ${36 * S}px ${accent}22` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        display: "flex", alignItems: "center", gap: 12 * S, alignSelf: "stretch",
        justifyContent: "center",
      }}>
        <div style={{
          width: 72 * S, height: 72 * S, borderRadius: "50%",
          background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 * S,
          flexShrink: 0,
        }}>{icon}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 * S }}>
          <span style={{
            fontFamily: F_HEAD, fontWeight: 800, fontSize: 20 * S, color: accent, letterSpacing: "0.08em",
          }}>STEP {stepIndex}</span>
          <span style={{
            fontFamily: F_TC, fontWeight: 700, fontSize: 26 * S, color: isOn ? C.text : C.textSub,
          }}>{title}</span>
        </div>
      </div>
      <div style={{
        fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, lineHeight: 1.55,
        textAlign: "center" as const, maxWidth: 380 * S,
      }}>{desc}</div>
      {children}
    </div>
  );
}

function LoopMiniNode({ icon, label, activeAt, accent }: {
  icon: string; label: string; activeAt: number; accent: string;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      opacity: op,
      width: 130 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
      background: C.surface2, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${10 * S}px ${10 * S}px`,
    }}>
      <span style={{ fontSize: 28 * S }}>{icon}</span>
      <span style={{
        fontFamily: F_TC, fontSize: 18 * S, fontWeight: 700, color: isOn ? C.text : C.textSub,
        textAlign: "center" as const,
      }}>{label}</span>
    </div>
  );
}

function RLLoopDiagram() {
  const frame = useCurrentFrame();
  // 主模型 1950 (1:24), 評分員 2040 (1:27), 更新 2100 (1:29), loop 2160 (1:31)
  const a1 = interpolate(Math.max(0, frame - 1950), [0, 20], [0.25, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const a2 = interpolate(Math.max(0, frame - 2040), [0, 20], [0.25, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const a3 = interpolate(Math.max(0, frame - 2100), [0, 20], [0.25, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return (
    <div style={{
      marginTop: 8 * S, padding: `${12 * S}px ${14 * S}px`,
      background: C.bg, border: `1px solid ${C.orangeBorder}`, borderRadius: 16 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
    }}>
      <div style={{
        fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500, color: C.orange,
        letterSpacing: "0.16em", textTransform: "uppercase" as const,
      }}>INNER LOOP — 主模型 ↔ 評分員</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 * S }}>
        <LoopMiniNode icon="🤖" label="主模型生成" activeAt={1950} accent={C.primary} />
        <span style={{ fontSize: 26 * S, color: C.orange, opacity: a1 }}>→</span>
        <LoopMiniNode icon="💯" label="評分員打分" activeAt={2040} accent={C.blue} />
        <span style={{ fontSize: 26 * S, color: C.orange, opacity: a2 }}>→</span>
        <LoopMiniNode icon="📈" label="朝高分更新" activeAt={2100} accent={C.orange} />
        <span style={{ fontSize: 26 * S, color: C.orange, opacity: a3 }}>↻</span>
      </div>
    </div>
  );
}

function Scene1HeroB() {
  const frame = useCurrentFrame();
  // arrow connectors between step cards
  const arrow12 = interpolate(Math.max(0, frame - 1170), [0, 20], [0.25, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const arrow23 = interpolate(Math.max(0, frame - 1590), [0, 20], [0.25, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // Step 3 expansion to show inner loop
  const step3Expand = interpolate(Math.max(0, frame - 1650), [0, 24], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 * S, justifyContent: "center" }}>
        <StepCard
          stepIndex="01" icon="📚" title="預訓練" accent={C.blue}
          desc="讀海量文字學會語言基礎結構——學會說話，但不懂什麼是好回答"
          activeAt={720}
        />
        <div style={{ display: "flex", alignItems: "center", height: 220 * S }}>
          <span style={{ fontSize: 28 * S, color: C.primary, opacity: arrow12 }}>→</span>
        </div>
        <StepCard
          stepIndex="02" icon="✍️" title="監督式微調" accent={C.purple}
          desc="標注員寫出理想回應，再次訓練模型，朝正確方向移動"
          activeAt={1170}
        />
        <div style={{ display: "flex", alignItems: "center", height: 220 * S }}>
          <span style={{ fontSize: 28 * S, color: C.primary, opacity: arrow23 }}>→</span>
        </div>
        <StepCard
          stepIndex="03" icon="⚖️" title="強化學習（核心）" accent={C.orange}
          desc="標注員比較答案好壞，訓練「評分員 AI」幫主模型打分"
          activeAt={1590}
        />
      </div>
      {step3Expand > 0.05 && (
        <div style={{ opacity: step3Expand, width: 1400 * S }}>
          <RLLoopDiagram />
        </div>
      )}
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_02.scene1.to - SCENES_2026_06_02.scene1.from;
  const A_FADE_START = 640;
  const A_REMOVE = 720;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= A_REMOVE;
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="WHAT IS RLHF — 入門定義" delay={6} />}
            sentence={<StageSentence text="讓 AI 學會什麼是「好答案」的訓練技術" delay={14} />}
            takeaway={<StageTakeaway text="嘗試 → 評價 → 調整：通常分三個階段進行" delay={480} />}
          >
            <Scene1HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="THREE STAGES — 三步驟訓練流程" delay={720} color={C.orange} />}
          sentence={<StageSentence text="從會說話、到懂事的三階段" delay={728} />}
          takeaway={<StageTakeaway text="不斷迴圈——模型就越來越「懂事」" delay={2160} color={C.orange} />}
        >
          <Scene1HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 為什麼 RLHF 改變了一切 (Before / After + ChatGPT/Claude) ──────
// ═══════════════════════════════════════════════════════════════════════════

function BACheckRow({ icon, label, ok, activeAt, dim = 0.28 }: {
  icon: string; label: string; ok: boolean; activeAt: number; dim?: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, dim);
  const accent = ok ? C.primary : C.red;
  return (
    <div style={{
      opacity: op, display: "flex", alignItems: "center", gap: 10 * S,
      paddingTop: 6 * S, paddingBottom: 6 * S,
    }}>
      <span style={{
        fontFamily: F_HEAD, fontWeight: 800, fontSize: 22 * S, color: accent,
        width: 28 * S, textAlign: "center" as const,
      }}>{ok ? "✓" : "✗"}</span>
      <span style={{ fontSize: 22 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function Scene2HeroA() {
  const frame = useCurrentFrame();
  const arrowOp = interpolate(Math.max(0, frame - 780), [0, 22], [0.2, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const leapOn = calcDim(1050, frame, 0.3);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 * S }}>
        {/* BEFORE RLHF */}
        <div style={{
          width: 560 * S,
          background: C.surface, border: `1px solid ${C.surfaceBorder}`,
          borderRadius: 22 * S, padding: `${20 * S}px ${24 * S}px`,
          display: "flex", flexDirection: "column", gap: 8 * S,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 4 * S }}>
            <span style={{
              fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.muted,
              letterSpacing: "0.16em", textTransform: "uppercase" as const,
            }}>BEFORE RLHF</span>
          </div>
          <div style={{
            fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: C.text,
            marginBottom: 8 * S,
          }}>訓練目標：預測下一個 token</div>
          <BACheckRow icon="📝" label="會寫出流暢文字" ok activeAt={360} />
          <BACheckRow icon="🤷" label="不知道什麼是有用的回答" ok={false} activeAt={480} />
          <BACheckRow icon="⚠️" label="不知道什麼是危險的內容" ok={false} activeAt={570} />
          <BACheckRow icon="🎭" label="不知道誠實比好聽更重要" ok={false} activeAt={630} />
        </div>

        <span style={{ fontSize: 50 * S, color: C.primary, opacity: arrowOp }}>→</span>

        {/* AFTER RLHF */}
        <div style={{
          width: 560 * S,
          background: C.surface, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 22 * S, padding: `${20 * S}px ${24 * S}px`,
          display: "flex", flexDirection: "column", gap: 8 * S,
          boxShadow: `0 0 ${40 * S}px ${C.primary}1f`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 4 * S }}>
            <span style={{
              width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
              boxShadow: `0 0 ${8 * S}px ${C.primary}`,
            }} />
            <span style={{
              fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.primary,
              letterSpacing: "0.16em", textTransform: "uppercase" as const,
            }}>AFTER RLHF</span>
          </div>
          <div style={{
            fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: C.text,
            marginBottom: 8 * S,
          }}>+ 學到人類的判斷標準</div>
          <BACheckRow icon="📝" label="會寫出流暢文字" ok activeAt={780} />
          <BACheckRow icon="💡" label="知道什麼是有用回答" ok activeAt={780} />
          <BACheckRow icon="🛡️" label="知道什麼是危險內容" ok activeAt={780} />
          <BACheckRow icon="✨" label="知道誠實比好聽更重要" ok activeAt={780} />
        </div>
      </div>

      {/* 本質性躍進 badge */}
      <div style={{
        opacity: leapOn.op, display: "flex", alignItems: "center", gap: 12 * S,
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 14 * S, padding: `${10 * S}px ${22 * S}px`,
        boxShadow: leapOn.isOn ? `0 0 ${24 * S}px ${C.primary}33` : "none",
      }}>
        <span style={{ fontSize: 26 * S }}>⚡</span>
        <span style={{
          fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: C.primary,
          letterSpacing: "0.06em",
        }}>本質性的躍進</span>
      </div>
    </div>
  );
}

// Phase B: ChatGPT vs GPT-3 + Claude 三目標 + 偏見警告
function GoalChip({ icon, label, activeAt }: { icon: string; label: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      opacity: op, display: "flex", alignItems: "center", gap: 10 * S,
      background: C.surface, border: `1px solid ${isOn ? C.blueBorder : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${12 * S}px ${20 * S}px`,
      boxShadow: isOn ? `0 0 ${22 * S}px ${C.blue}1f` : "none",
    }}>
      <span style={{ fontSize: 26 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function Scene2HeroB() {
  const frame = useCurrentFrame();
  // ChatGPT vs GPT-3 contrast
  const arrowOp = interpolate(Math.max(0, frame - 1110), [0, 22], [0.25, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const claudeOn = calcDim(1380, frame, 0.32);
  const warnOn = calcDim(1710, frame, 0.32);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      {/* ChatGPT vs GPT-3 result strip */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 * S }}>
        <div style={{
          background: C.surface, border: `1px solid ${C.surfaceBorder}`,
          borderRadius: 18 * S, padding: `${14 * S}px ${22 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
          opacity: 0.6,
        }}>
          <span style={{ fontFamily: F_HEAD, fontSize: 28 * S, fontWeight: 800, color: C.textSub }}>GPT-3</span>
          <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.muted }}>沒學人類偏好</span>
        </div>
        <span style={{ fontSize: 40 * S, color: C.primary, opacity: arrowOp }}>→</span>
        <div style={{
          background: C.surface, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 18 * S, padding: `${14 * S}px ${28 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
          boxShadow: `0 0 ${28 * S}px ${C.primary}22`,
        }}>
          <span style={{ fontFamily: F_HEAD, fontSize: 32 * S, fontWeight: 800, color: C.primary }}>ChatGPT</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.text, fontWeight: 500 }}>
            學會「人類想要什麼樣的回應」
          </span>
        </div>
      </div>

      {/* Claude + 三個目標 */}
      <div style={{
        opacity: claudeOn.op,
        background: C.surface, border: `1px solid ${claudeOn.isOn ? C.blueBorder : C.surfaceBorder}`,
        borderRadius: 22 * S, padding: `${18 * S}px ${28 * S}px`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
        boxShadow: claudeOn.isOn ? `0 0 ${30 * S}px ${C.blue}1f` : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
          <span style={{ fontSize: 26 * S }}>🅰️</span>
          <span style={{
            fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: C.blue,
            letterSpacing: "0.04em",
          }}>Anthropic Claude</span>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub }}>· 採用類似技術，目標：</span>
        </div>
        <div style={{ display: "flex", gap: 14 * S, justifyContent: "center" }}>
          <GoalChip icon="💡" label="有幫助" activeAt={1500} />
          <GoalChip icon="🛡️" label="安全" activeAt={1560} />
          <GoalChip icon="✨" label="誠實" activeAt={1560} />
        </div>
      </div>

      {/* Bias warning */}
      <div style={{
        opacity: warnOn.op, display: "flex", alignItems: "center", gap: 14 * S,
        background: C.redLight, border: `1px solid ${warnOn.isOn ? C.redBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${12 * S}px ${22 * S}px`,
        boxShadow: warnOn.isOn ? `0 0 ${22 * S}px ${C.red}22` : "none",
      }}>
        <span style={{ fontSize: 26 * S }}>⚠️</span>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text }}>
          人類判斷有偏見 → AI 的「好答案」標準也會有偏見
        </span>
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_02.scene2.to - SCENES_2026_06_02.scene2.from;
  const A_FADE_START = 1030;
  const A_REMOVE = 1110;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= A_REMOVE;
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="BEFORE & AFTER — 本質性躍進" delay={6} />}
            sentence={<StageSentence text="在 RLHF 之前，模型只會預測下一個字" delay={14} />}
            takeaway={<StageTakeaway text="RLHF 讓模型不只學語言，還學到了人類的判斷標準" delay={960} />}
          >
            <Scene2HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="IN PRACTICE — 實際影響" delay={1110} color={C.blue} />}
          sentence={<StageSentence text="ChatGPT 為什麼比 GPT-3 有用那麼多" delay={1118} />}
          takeaway={<StageTakeaway text="RLHF 把人類偏好教給 AI——好處與風險並存" delay={1770} color={C.blue} />}
        >
          <Scene2HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 使用者必知三件事 + AI 素養提醒 ─────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function IssueCard({ idx, icon, title, body, accent, activeAt }: {
  idx: string; icon: string; title: string; body: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.28);
  return (
    <div style={{
      opacity: op, width: 1180 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${18 * S}px ${26 * S}px`,
      display: "flex", alignItems: "center", gap: 22 * S,
      boxShadow: isOn ? `0 0 ${32 * S}px ${accent}1f` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={20 * S} />}
      <div style={{
        width: 82 * S, height: 82 * S, borderRadius: "50%", flexShrink: 0,
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 * S,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 6 * S }}>
          <span style={{
            fontFamily: F_HEAD, fontWeight: 800, fontSize: 24 * S, color: accent, letterSpacing: "0.08em",
          }}>{idx}</span>
          <span style={{
            fontFamily: F_TC, fontWeight: 700, fontSize: 26 * S, color: isOn ? C.text : C.textSub,
          }}>{title}</span>
        </div>
        <div style={{
          fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, lineHeight: 1.5,
        }}>{body}</div>
      </div>
    </div>
  );
}

function Scene3HeroA() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 * S, alignItems: "center" }}>
      <IssueCard
        idx="01" icon="🎯" title="聰明 ≠ 正確" accent={C.orange}
        body="標注員偏好「聽起來有把握」的回答——AI 可能給出自信但錯誤的答案"
        activeAt={150}
      />
      <IssueCard
        idx="02" icon="🤝" title="過於順從" accent={C.purple}
        body="為了打高分，模型傾向迎合使用者的想法，而不是誠實反駁錯誤"
        activeAt={840}
      />
      <IssueCard
        idx="03" icon="👥" title="標注員背景" accent={C.blue}
        body="若大多數標注員來自相似的文化背景——模型可能存在系統性盲點"
        activeAt={1410}
      />
    </div>
  );
}

// Phase B: AI 素養提醒
function HumansToAI() {
  const frame = useCurrentFrame();
  // group of people sending judgments to AI brain, value chip emerges
  const valueOn = calcDim(2040, frame, 0.32);
  const equationOn = calcDim(2190, frame, 0.3);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
      {/* Humans → AI flow */}
      <div style={{ display: "flex", alignItems: "center", gap: 30 * S }}>
        {/* group of people */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
          background: C.surface, border: `1px solid ${C.surfaceBorder}`,
          borderRadius: 20 * S, padding: `${18 * S}px ${26 * S}px`,
        }}>
          <div style={{ display: "flex", gap: 6 * S, fontSize: 40 * S }}>👤 👤 👤</div>
          <div style={{ display: "flex", gap: 6 * S, fontSize: 40 * S }}>👤 👤 👤</div>
          <div style={{
            fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text,
            marginTop: 4 * S,
          }}>標注員的判斷</div>
          <div style={{
            fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em",
          }}>HUMAN JUDGMENTS</div>
        </div>

        <span style={{ fontSize: 42 * S, color: C.primary }}>→</span>

        {/* AI brain */}
        <div style={{
          position: "relative", width: 220 * S, height: 220 * S, borderRadius: "50%",
          background: `${C.primary}14`, border: `${3 * S}px solid ${C.primary}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 6 * S, boxShadow: `0 0 ${30 * S}px ${C.primary}33`,
        }}>
          <span style={{ fontSize: 56 * S }}>🧠</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: C.primary }}>AI</span>
        </div>

        <span style={{ fontSize: 42 * S, color: C.primary, opacity: valueOn.op }}>→</span>

        {/* Values chip */}
        <div style={{
          opacity: valueOn.op,
          background: C.surface, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 18 * S, padding: `${16 * S}px ${24 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
          boxShadow: valueOn.isOn ? `0 0 ${28 * S}px ${C.primary}33` : "none",
        }}>
          <span style={{ fontSize: 44 * S }}>💎</span>
          <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text }}>價值觀</span>
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>VALUES</span>
        </div>
      </div>

      {/* Equation: AI 的問題 = 人的問題 */}
      <div style={{
        opacity: equationOn.op,
        background: C.surface, border: `1px solid ${equationOn.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 18 * S, padding: `${16 * S}px ${36 * S}px`,
        boxShadow: equationOn.isOn ? `0 0 ${30 * S}px ${C.primary}22` : "none",
      }}>
        <div style={{
          fontFamily: F_HEAD, fontSize: 30 * S, fontWeight: 800, color: C.text,
          display: "flex", alignItems: "center", gap: 14 * S,
        }}>
          <span>AI 的問題</span>
          <span style={{ color: C.primary }}>≈</span>
          <span style={{ color: C.primary }}>人的問題</span>
        </div>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_02.scene3.to - SCENES_2026_06_02.scene3.from;
  const A_FADE_START = 1840;
  const A_REMOVE = 1920;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= A_REMOVE;
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="USER GUIDE — 使用者必知 3 件事" delay={6} color={C.orange} />}
            sentence={<StageSentence text="使用 AI 時要知道的三件事" delay={14} />}
            takeaway={<StageTakeaway text="RLHF 把人類偏好裝進 AI——也把人類的限制裝了進去" delay={1500} color={C.orange} />}
          >
            <Scene3HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="AI LITERACY — 素養提醒" delay={1920} />}
          sentence={<StageSentence text="AI 的「價值觀」不是從天而降" delay={1928} />}
          takeaway={<StageTakeaway text="標注員的偏見 → 模型的偏見：使用時保持獨立判斷很重要" delay={2190} />}
        >
          <HumansToAI />
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
      borderRadius: 22 * S, padding: `${20 * S}px ${28 * S}px`,
      display: "flex", alignItems: "center", gap: 22 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${accent}1f` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 86 * S, height: 86 * S, borderRadius: "50%", flexShrink: 0,
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 * S,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 6 * S }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 22 * S, color: accent }}>{index}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 26 * S, color: isOn ? C.text : C.textSub }}>{title}</span>
        </div>
        <div style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_02.summary.to - SCENES_2026_06_02.summary.from;
  const eyebrowFade = useFadeIn(6);
  const headFade = useFadeUp(14);
  const outroFade = useFadeUp(1140);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        paddingTop: CONTENT_TOP + 18 * S, paddingBottom: SUBTITLE_SAFE,
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
          ...headFade, margin: `${10 * S}px 0 ${24 * S}px`,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 34 * S, color: C.text, textAlign: "center",
        }}>RLHF · 今天三件事</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 * S }}>
          <RecapCard index="01" icon="🧩" title="RLHF 是什麼" accent={C.primary} activeAt={90}
            body="三步驟訓練流程：預訓練 → 監督微調 → 強化學習，讓 AI 從人類排名反饋中學「好答案」。" />
          <RecapCard index="02" icon="⚡" title="為什麼重要" accent={C.blue} activeAt={420}
            body="這是 ChatGPT 比 GPT-3 更有用的關鍵——讓 AI 從學語言進化到學人類的判斷標準。" />
          <RecapCard index="03" icon="🧠" title="使用者要知道" accent={C.orange} activeAt={750}
            body="標注員偏見會進入模型、AI 有時過於順從、讓人滿意 ≠ 真正正確——保持獨立判斷。" />
        </div>

        <div style={{ ...outroFade, marginTop: 26 * S, display: "flex", alignItems: "center", gap: 12 * S }}>
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

export const VideoComposition_2026_06_02: React.FC = () => {
  const frame = useCurrentFrame();
  const Sx = SCENES_2026_06_02;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-06-02-processed.wav")} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f, [TOTAL_FRAMES_2026_06_02 - 150, TOTAL_FRAMES_2026_06_02], [v, 0],
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
      <Sequence from={Sx.summary.from} durationInFrames={Sx.summary.to - Sx.summary.from}>
        <SummaryScene />
      </Sequence>

      <ProgressBar globalFrame={frame} />
      <IMessageOverlay globalFrame={frame} />
    </AbsoluteFill>
  );
};

// Used to satisfy COL_LEFT/CONTAINER_W referenced in skill (ContentColumn alt path unused here)
void COL_LEFT; void CONTAINER_W;
