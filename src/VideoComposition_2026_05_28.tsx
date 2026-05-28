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

// ── Scale & canvas ────────────────────────────────────────────────────────
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

// ── Design tokens ──────────────────────────────────────────────────────────
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
  redBorder: "rgba(248,113,113,0.24)",
  chipBg: "rgba(9,9,15,0.85)",
  chipBorder: "rgba(255,255,255,0.06)",
} as const;

// ── iMessage constants ────────────────────────────────────────────────────
const NOTIF_W = 300 * S;
const NOTIF_TOP = 12 * S;
const NOTIF_RIGHT = 20 * S;
const NOTIF_SLOT = 158 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// Title:   0       → 515    (17.16s) hook + 兩個詞
// Scene1:  515     → 1390   (29s)    AI Safety 定義
// Scene2:  1390    → 3576   (73s)    AI Alignment 定義 + 信件例子 + 反饋訓練
// Scene3:  3576    → 5483   (64s)    日常 Alignment 失敗 + Constitutional AI
// Scene4:  5483    → 7678   (73s)    給使用者的 3 件提醒 + 平衡的態度
// Summary: 7678    → 8870   (40s)    重點整理
export const SCENES_2026_05_28 = {
  title: { from: 0, to: 515 },
  scene1: { from: 515, to: 1390 },
  scene2: { from: 1390, to: 3576 },
  scene3: { from: 3576, to: 5483 },
  scene4: { from: 5483, to: 7678 },
  summary: { from: 7678, to: 8870 },
} as const;
export const TOTAL_FRAMES_2026_05_28 = 8870;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "AI Safety", start: 515 },
  { label: "AI Alignment", start: 1390 },
  { label: "日常失敗", start: 3576 },
  { label: "使用者提醒", start: 5483 },
  { label: "重點整理", start: 7678 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene2 結尾：改稿例子（1:50.42-1:55.36 「改完反而失去你原本的語氣...小型的 Alignment 失敗」)
  { from: 3320, to: 3576, sender: "親身經歷", text: "你也遇過嗎？讓 AI 幫你改稿，改完反而失去你原本的語氣——這就是一個小型的 Alignment 失敗。" },
  // Scene3 結尾：Constitutional AI（2:54.24「Constitutional AI」)
  { from: 5240, to: 5483, sender: "想一想", text: "Anthropic 的「Constitutional AI」想讓 AI 內化原則、而不只是靠人類即時反饋——你覺得這個方向能解決多少？" },
  // Scene4 結尾：最終問題 (4:07.94「你覺得現在 AI 公司...正確的平衡嗎」)
  { from: 7440, to: 7678, sender: "想一想", text: "你覺得現在的 AI 公司，在「讓 AI 更有用」和「讓 AI 更安全」之間，取得了正確的平衡嗎？" },
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

// dim → bright, tied to a cue frame (scene-local)
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
function RippleRing({ activeAt, color, radius = "50%" as number | string }: { activeAt: number; color: string; radius?: number | string }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - activeAt);
  if (f > 28) return null;
  const scale = interpolate(f, [0, 24], [0.85, 1.9], { easing: E.outExpo, extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 4, 24, 28], [0, 0.5, 0.18, 0], { extrapolateRight: "clamp" });
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

function TermBlock({ kind, label, sub, accent, activeAt }: {
  kind: "safety" | "alignment"; label: string; sub: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const a = calcActive(activeAt, frame, 0.32);
  const sc = easeOutBack(prog(Math.max(0, frame - activeAt), 22));
  return (
    <div style={{
      position: "relative", width: 460 * S,
      opacity: a.op, transform: `scale(${Math.max(0.88, a.isOn ? sc : 0.9)})`,
      background: C.surface, border: `1px solid ${a.isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 24 * S, padding: `${22 * S}px ${24 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
      boxShadow: a.isOn ? `0 0 ${40 * S}px ${accent}22` : "none",
    }}>
      {a.isOn && <RippleRing activeAt={activeAt} color={accent} radius={24 * S} />}
      <div style={{
        width: 78 * S, height: 78 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 * S,
        boxShadow: a.isOn ? `0 0 ${20 * S}px ${accent}55` : "none",
      }}>{kind === "safety" ? "🛡️" : "🎯"}</div>
      <div style={{
        fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: a.isOn ? accent : C.textSub,
        textAlign: "center", lineHeight: 1.1, letterSpacing: "0.02em",
      }}>{label}</div>
      <div style={{
        fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500, color: C.textSub,
      }}>{sub}</div>
    </div>
  );
}

function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_28.title.to - SCENES_2026_05_28.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(34);
  const tagStyle = useFadeUp(50);
  const rowStyle = useFadeUp(80);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));

  // VTT activations (global = title-local):
  // 92  → "AI Safety、AI Alignment" — both terms first mentioned
  // 176 → "你一定在...看過這兩個詞"
  // 346 → "但它們到底...差別是什麼"
  const SAFETY_AT = 92;
  const ALIGN_AT = 122;
  const VS_AT = 176;
  const Q_AT = 346;

  const vsOp = interpolate(Math.max(0, frame - VS_AT), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const qOp = interpolate(Math.max(0, frame - Q_AT), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

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
          <WordReveal text="什麼是 AI Safety？" startFrame={10} staggerPerWord={6}
            fontSize={40 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>
        <h1 style={{ margin: 0, lineHeight: 1.2, marginTop: 6 * S, fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary }}>
          <WordReveal text="和 AI Alignment 有什麼不同" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 16 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          兩個你常看到的詞，差別究竟在哪
        </p>

        {/* Two-term juxtaposition — both light up as narrator first names them */}
        <div style={{ ...rowStyle, marginTop: 36 * S, display: "flex", alignItems: "center", gap: 28 * S, justifyContent: "center" }}>
          <TermBlock kind="safety" label="AI SAFETY" sub="AI 安全" accent={C.primary} activeAt={SAFETY_AT} />
          <div style={{
            opacity: vsOp, fontFamily: F_HEAD, fontSize: 44 * S, fontWeight: 800, color: C.muted,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
          }}>
            <span style={{ opacity: qOp, fontSize: 38 * S, color: C.primary, lineHeight: 1 }}>?</span>
            <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.16em", textTransform: "uppercase" as const }}>vs</span>
          </div>
          <TermBlock kind="alignment" label="AI ALIGNMENT" sub="AI 對齊" accent={C.orange} activeAt={ALIGN_AT} />
        </div>

        <div style={{ ...tagStyle, marginTop: 30 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>AI Safety · AI Alignment · Constitutional AI</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — AI SAFETY 廣泛領域 ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function StageChip({ label, activeAt, accent }: { label: string; activeAt: number; accent: string }) {
  const frame = useCurrentFrame();
  const a = calcActive(activeAt, frame, 0.4);
  return (
    <div style={{
      opacity: a.op,
      fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: a.isOn ? accent : C.textSub,
      background: C.chipBg, border: `1px solid ${a.isOn ? accent + "55" : C.chipBorder}`,
      borderRadius: 10 * S, padding: `${5 * S}px ${14 * S}px`,
      letterSpacing: "0.08em", textTransform: "uppercase" as const,
    }}>{label}</div>
  );
}

function ProtectedZone({ icon, label, activeAt }: { icon: string; label: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const a = calcActive(activeAt, frame, 0.32);
  return (
    <div style={{
      opacity: a.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
      width: 160 * S,
    }}>
      <div style={{
        width: 64 * S, height: 64 * S, borderRadius: "50%",
        background: `${C.primary}10`, border: `1px solid ${a.isOn ? C.primaryBorder : C.surfaceBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 * S,
        boxShadow: a.isOn ? `0 0 ${20 * S}px ${C.primary}22` : "none",
      }}>{icon}</div>
      <div style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub }}>{label}</div>
    </div>
  );
}

function ConcernCard({ icon, text, activeAt, entranceAt }: { icon: string; text: string; activeAt: number; entranceAt: number }) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const a = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * a.op,
      width: 290 * S, minHeight: 92 * S,
      display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 8 * S,
      background: C.surface, border: `1px solid ${a.isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${12 * S}px ${16 * S}px`,
      boxShadow: a.isOn ? `0 0 ${24 * S}px ${C.primaryGlow}` : "none",
      textAlign: "center",
    }}>
      <span style={{ fontSize: 28 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub, lineHeight: 1.35 }}>{text}</span>
    </div>
  );
}

function SafetyHero({ shieldOn, zonesAt, stagesAt }: { shieldOn: number; zonesAt: number; stagesAt: number }) {
  const frame = useCurrentFrame();
  const ringRot = (frame * 0.6) % 360;
  const shield = calcActive(shieldOn, frame, 0.4);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S }}>
      {/* shield arc + AI core — compact */}
      <div style={{ position: "relative", width: 320 * S, height: 190 * S }}>
        {/* protective dome arc */}
        <svg width={320 * S} height={190 * S} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <defs>
            <linearGradient id="shieldGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={C.primary} stopOpacity={0.9} />
              <stop offset="100%" stopColor={C.primary} stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <path
            d={`M ${20 * S} ${150 * S} Q ${160 * S} ${-30 * S} ${300 * S} ${150 * S}`}
            fill="none"
            stroke="url(#shieldGrad)"
            strokeWidth={5 * S}
            opacity={shield.op}
          />
        </svg>
        {/* rotating dashed ring */}
        <div style={{
          position: "absolute", left: 160 * S, top: 95 * S, width: 160 * S, height: 160 * S,
          borderRadius: "50%", border: `${3 * S}px dashed ${C.primary}`,
          opacity: 0.32, transform: `translate(-50%,-50%) rotate(${ringRot}deg)`,
        }} />
        {/* AI core */}
        <div style={{
          position: "absolute", left: 160 * S, top: 95 * S,
          transform: "translate(-50%,-50%)",
          width: 116 * S, height: 116 * S, borderRadius: "50%",
          background: C.surface, border: `${2 * S}px solid ${C.primary}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 * S,
          boxShadow: `0 0 ${30 * S}px ${C.primary}44`,
        }}>
          <span style={{ fontSize: 38 * S }}>🤖</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 18 * S, fontWeight: 800, color: C.primary, letterSpacing: "0.04em" }}>AI System</span>
        </div>
      </div>
      {/* 3-stage chips on inline row with zones */}
      <div style={{ display: "flex", gap: 10 * S, alignItems: "center" }}>
        <StageChip label="設計" activeAt={stagesAt} accent={C.primary} />
        <span style={{ color: C.muted, fontSize: 20 * S }}>→</span>
        <StageChip label="部署" activeAt={stagesAt + 18} accent={C.primary} />
        <span style={{ color: C.muted, fontSize: 20 * S }}>→</span>
        <StageChip label="運作" activeAt={stagesAt + 36} accent={C.primary} />
      </div>
      {/* 3 protected zones */}
      <div style={{ display: "flex", gap: 24 * S, justifyContent: "center" }}>
        <ProtectedZone icon="🧑" label="個人" activeAt={zonesAt} />
        <ProtectedZone icon="🏛️" label="社會" activeAt={zonesAt + 30} />
        <ProtectedZone icon="🌐" label="長遠未來" activeAt={zonesAt + 60} />
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_28.scene1.to - SCENES_2026_05_28.scene1.from;
  // local = global - 515
  const HEADER_AT = 0;
  const FIELD_AT = 100; // 20.48s 廣泛領域
  const HARM_AT = 299; // 27.14s 不會造成意外的傷害
  const SCOPE_AT = 368; // 29.44s 個人/社會/長遠
  const C1_AT = 484; // 33.28s 輸出會不會傷害人
  const C2_AT = 591; // 36.86s 系統能不能被濫用
  const C3_AT = 775; // 43.00s 高風險場景出錯

  return (
    <SceneFade durationInFrames={dur}>
      <HeroFrame
        eyebrow={<StageEyebrow label="廣義領域 ／ A BROAD DOMAIN" delay={HEADER_AT} color={C.primary} />}
        sentence={
          frame >= HARM_AT
            ? <StageSentence text="確保 AI 系統在運作的過程中，不會造成意外的傷害" delay={HARM_AT} color={C.primary} fontSize={26 * S} />
            : frame >= FIELD_AT
            ? <StageSentence text="AI Safety 是一個比較廣泛的領域" delay={FIELD_AT} color={C.text} />
            : <StageSentence text="先說 AI Safety——AI 安全" delay={HEADER_AT} color={C.text} />
        }
        takeaway={<StageTakeaway text="AI Safety 涵蓋設計、部署、運作的每個環節" delay={C3_AT} color={C.primary} />}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S, width: "100%" }}>
          <SafetyHero shieldOn={HEADER_AT} zonesAt={SCOPE_AT} stagesAt={FIELD_AT} />
          {/* 3 concern chips — horizontal */}
          <div style={{ display: "flex", gap: 14 * S, justifyContent: "center" }}>
            <ConcernCard icon="⚠️" text="輸出會不會傷害人" entranceAt={20} activeAt={C1_AT} />
            <ConcernCard icon="🛠️" text="系統能不能被濫用" entranceAt={20} activeAt={C2_AT} />
            <ConcernCard icon="🚨" text="高風險場景出錯的後果" entranceAt={20} activeAt={C3_AT} />
          </div>
        </div>
      </HeroFrame>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — AI ALIGNMENT 核心問題 ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: 信件壓縮 fork — input → AI → two outputs
function LetterFork({ inputAt, aiAt, saidAt, wantedAt, gapAt }: {
  inputAt: number; aiAt: number; saidAt: number; wantedAt: number; gapAt: number;
}) {
  const frame = useCurrentFrame();
  const inp = calcActive(inputAt, frame, 0.3);
  const ai = calcActive(aiAt, frame, 0.3);
  const said = calcActive(saidAt, frame, 0.3);
  const wanted = calcActive(wantedAt, frame, 0.3);
  const gap = calcActive(gapAt, frame, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S, width: "100%" }}>
      {/* input prompt */}
      <div style={{
        opacity: inp.op,
        background: C.surface, border: `1px solid ${inp.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${10 * S}px ${24 * S}px`,
        display: "flex", alignItems: "center", gap: 12 * S,
      }}>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.08em" }}>PROMPT</span>
        <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text }}>「幫我讓這封信更短」</span>
      </div>
      {/* arrow down to AI */}
      <div style={{
        opacity: ai.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
      }}>
        <span style={{ fontFamily: F_BODY, fontSize: 22 * S, color: C.muted }}>↓</span>
        <div style={{
          width: 72 * S, height: 72 * S, borderRadius: "50%",
          background: C.surface, border: `${2 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 * S,
          boxShadow: `0 0 ${24 * S}px ${C.primary}33`,
        }}>🤖</div>
      </div>
      {/* two outputs */}
      <div style={{ display: "flex", gap: 36 * S, justifyContent: "center", alignItems: "stretch" }}>
        {/* said: deleted everything */}
        <div style={{
          opacity: said.op, width: 480 * S, borderRadius: 18 * S,
          background: C.redLight, border: `1px solid ${said.isOn ? C.redBorder : C.surfaceBorder}`,
          padding: `${14 * S}px ${20 * S}px`, display: "flex", flexDirection: "column", gap: 8 * S,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10 * S,
            fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.red,
            letterSpacing: "0.1em", textTransform: "uppercase" as const,
          }}>
            <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.red, boxShadow: `0 0 ${8 * S}px ${C.red}` }} />你說的
          </div>
          {/* mock empty short letter */}
          <div style={{
            background: C.surface, borderRadius: 10 * S, padding: `${12 * S}px ${16 * S}px`,
            display: "flex", flexDirection: "column", gap: 4 * S,
          }}>
            <div style={{ height: 4 * S, width: "55%", background: "rgba(255,255,255,0.15)", borderRadius: 2 * S }} />
            <div style={{ height: 4 * S, width: "20%", background: "rgba(255,255,255,0.15)", borderRadius: 2 * S }} />
            <div style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.red, fontWeight: 700, marginTop: 4 * S }}>❌ 內容幾乎全刪光</div>
          </div>
          <div style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub }}>確實「更短」了——但這不是你想要的</div>
        </div>
        {/* wanted: condensed but kept */}
        <div style={{
          opacity: wanted.op, width: 480 * S, borderRadius: 18 * S,
          background: C.primaryLight, border: `1px solid ${wanted.isOn ? C.primaryBorder : C.surfaceBorder}`,
          padding: `${14 * S}px ${20 * S}px`, display: "flex", flexDirection: "column", gap: 8 * S,
          boxShadow: wanted.isOn ? `0 0 ${28 * S}px ${C.primaryGlow}` : "none",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10 * S,
            fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.primary,
            letterSpacing: "0.1em", textTransform: "uppercase" as const,
          }}>
            <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary, boxShadow: `0 0 ${8 * S}px ${C.primary}` }} />你想要的
          </div>
          <div style={{
            background: C.surface, borderRadius: 10 * S, padding: `${12 * S}px ${16 * S}px`,
            display: "flex", flexDirection: "column", gap: 4 * S,
          }}>
            <div style={{ height: 4 * S, width: "80%", background: "rgba(124,255,178,0.6)", borderRadius: 2 * S }} />
            <div style={{ height: 4 * S, width: "65%", background: "rgba(124,255,178,0.5)", borderRadius: 2 * S }} />
            <div style={{ height: 4 * S, width: "45%", background: "rgba(124,255,178,0.4)", borderRadius: 2 * S }} />
            <div style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.primary, fontWeight: 700, marginTop: 4 * S }}>✓ 保留重點，更精煉</div>
          </div>
          <div style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub }}>在不失去重要資訊的前提下更短</div>
        </div>
      </div>
      {/* equation: 你說的 ≠ 你想要的 */}
      <div style={{
        opacity: gap.op,
        fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800,
        background: C.surface, border: `1px solid ${C.orangeBorder}`, borderRadius: 12 * S,
        padding: `${6 * S}px ${22 * S}px`,
        display: "flex", alignItems: "center", gap: 10 * S, color: C.orange,
      }}>
        <span style={{ color: C.red }}>你說的</span>
        <span style={{ color: C.orange, fontSize: 26 * S }}>≠</span>
        <span style={{ color: C.primary }}>你真正想要的</span>
      </div>
    </div>
  );
}

// Phase B hero: training feedback pipeline + ghost deep values + 改稿例子
function FeedbackPipeline({ humanAt, feedbackAt, aiLearnsAt, deepAt, miniFailAt }: {
  humanAt: number; feedbackAt: number; aiLearnsAt: number; deepAt: number; miniFailAt: number;
}) {
  const frame = useCurrentFrame();
  const human = calcActive(humanAt, frame, 0.3);
  const fb = calcActive(feedbackAt, frame, 0.3);
  const ai = calcActive(aiLearnsAt, frame, 0.3);
  const deep = calcActive(deepAt, frame, 0);
  const miniF = calcActive(miniFailAt, frame, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S, width: "100%" }}>
      {/* pipeline row */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 * S, justifyContent: "center" }}>
        {/* human + 即時感受 */}
        <div style={{
          opacity: human.op, width: 280 * S,
          background: C.surface, border: `1px solid ${human.isOn ? C.orangeBorder : C.surfaceBorder}`,
          borderRadius: 16 * S, padding: `${14 * S}px ${18 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
        }}>
          <span style={{ fontSize: 36 * S }}>👤</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: human.isOn ? C.text : C.textSub }}>人類反饋</span>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.orange, fontWeight: 500 }}>當下的直覺反應</span>
        </div>
        {/* arrow */}
        <div style={{ opacity: fb.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S }}>
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em" }}>反饋訓練</span>
          <span style={{ fontFamily: F_BODY, fontSize: 28 * S, color: C.primary }}>→</span>
        </div>
        {/* AI brain */}
        <div style={{
          opacity: ai.op, width: 280 * S,
          background: C.surface, border: `1px solid ${ai.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 16 * S, padding: `${14 * S}px ${18 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
          boxShadow: ai.isOn ? `0 0 ${28 * S}px ${C.primaryGlow}` : "none",
        }}>
          <span style={{ fontSize: 36 * S }}>🤖</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: ai.isOn ? C.text : C.textSub }}>AI 學到的</span>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.primary, fontWeight: 500 }}>迎合即時感受</span>
        </div>
      </div>
      {/* ghost deep-values row */}
      <div style={{
        opacity: deep.op * 0.9, display: "flex", alignItems: "center", gap: 12 * S,
        background: "rgba(91,143,255,0.05)", border: `1px dashed ${C.blueBorder}`,
        borderRadius: 14 * S, padding: `${10 * S}px ${24 * S}px`,
      }}>
        <span style={{ fontSize: 26 * S, opacity: 0.85 }}>🧭</span>
        <span style={{ fontFamily: F_TC, fontSize: 21 * S, color: C.blue, fontWeight: 700 }}>人類真正的深層價值觀</span>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>不一定學得到</span>
      </div>
      {/* 改稿失敗 mini example */}
      <div style={{
        opacity: miniF.op, display: "flex", alignItems: "center", gap: 14 * S,
        background: C.surface, border: `1px solid ${miniF.isOn ? C.redBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${10 * S}px ${24 * S}px`,
        boxShadow: miniF.isOn ? `0 0 ${22 * S}px ${C.red}1f` : "none",
      }}>
        <span style={{ fontSize: 26 * S }}>📝</span>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text }}>幫你改稿，改完反而失去你原本的語氣</span>
        <span style={{
          fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.red,
          background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 8 * S,
          padding: `${4 * S}px ${10 * S}px`, letterSpacing: "0.06em", textTransform: "uppercase" as const,
        }}>小型 Alignment 失敗</span>
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_28.scene2.to - SCENES_2026_05_28.scene2.from;
  // local = global - 1390. Phase B 首句「還有另一個層次」01:21.60→2448, local 1058
  const A_FADE_START = 978;
  const A_REMOVE = 1058;
  const B_SHOW_AT = 1058;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_A = 0;
  const CORE_AT = 285; // 52.48s 怎麼讓 AI 真正做我們想要的事
  const EXAMPLE_AT = 467; // 58.56s 舉個簡單的例子
  const PROMPT_AT = 506; // 59.84s 幫我讓這封信更短
  const SAID_AT = 629; // 1:03.94 它刪掉了所有內容
  const WANTED_AT = 775; // 1:08.82 你真正想要的
  const GAP_AT = 937; // 1:14.18 Alignment 的核心問題
  const SAID_EQ_AT = 1029; // 1:17.26 你說的和你真正想要的

  // Phase B captions (local)
  const HEADER_B = B_SHOW_AT; // 1058
  const TRAIN_AT = 1231; // 1:24.04 AI 是用人類反饋訓練
  const NOT_DEEP_AT = 1334; // 1:27.48 但人類反饋不一定反映深層價值
  const LEARNS_AT = 1631; // 1:37.36 AI 學到的是迎合即時感受
  const REWRITE_AT = 1858; // 1:44.92 你有沒有遇過
  const MINIFAIL_AT = 2171; // 1:55.36 小型 Alignment 失敗

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="核心問題 ／ THE CORE QUESTION" delay={HEADER_A} color={C.orange} />}
            sentence={
              frame >= CORE_AT
                ? <StageSentence text="怎麼讓 AI 真正做我們想要它做的事？" delay={CORE_AT} color={C.orange} />
                : <StageSentence text="再說 AI Alignment——AI 對齊" delay={HEADER_A} color={C.text} />
            }
            takeaway={<StageTakeaway text="你說的，和你真正想要的，有時候不是同一件事" delay={SAID_EQ_AT} color={C.orange} />}
          >
            <LetterFork inputAt={PROMPT_AT} aiAt={EXAMPLE_AT + 30} saidAt={SAID_AT} wantedAt={WANTED_AT} gapAt={GAP_AT} />
          </HeroFrame>
        </div>
      )}
      {/* ── Phase B ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="另一個層次 ／ DEEPER LAYER" delay={HEADER_B} color={C.orange} />}
          sentence={
            frame >= LEARNS_AT
              ? <StageSentence text="AI 學到的是迎合即時感受，而不一定是真正想要的結果" delay={LEARNS_AT} color={C.orange} fontSize={26 * S} />
              : frame >= NOT_DEEP_AT
              ? <StageSentence text="人類反饋不一定反映了真正的深層價值觀" delay={NOT_DEEP_AT} color={C.orange} fontSize={26 * S} />
              : <StageSentence text="AI 是用人類的反饋來訓練的" delay={HEADER_B} color={C.text} />
          }
          takeaway={<StageTakeaway text="任務「完成了」≠ 結果「正確了」——這就是小型 Alignment 失敗" delay={MINIFAIL_AT} color={C.red} />}
        >
          <FeedbackPipeline humanAt={TRAIN_AT} feedbackAt={TRAIN_AT + 30} aiLearnsAt={LEARNS_AT} deepAt={NOT_DEEP_AT} miniFailAt={REWRITE_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 日常 ALIGNMENT 失敗 + CONSTITUTIONAL AI ───────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: 推薦系統 — goal achieved ✓ but side-effect ↑ ❌
function RecommenderEngine({ engineAt, goalAt, achievedAt, sideAt, whyAt, failAt }: {
  engineAt: number; goalAt: number; achievedAt: number; sideAt: number; whyAt: number; failAt: number;
}) {
  const frame = useCurrentFrame();
  const eng = calcActive(engineAt, frame, 0.3);
  const goal = calcActive(goalAt, frame, 0.3);
  const ach = calcActive(achievedAt, frame, 0);
  const side = calcActive(sideAt, frame, 0.3);
  const why = calcActive(whyAt, frame, 0);
  const fail = calcActive(failAt, frame, 0);
  const upPulse = 0.5 + 0.5 * Math.sin(frame * 0.12);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S, width: "100%" }}>
      {/* top goal row */}
      <div style={{
        opacity: goal.op, display: "flex", alignItems: "center", gap: 14 * S,
        background: C.surface, border: `1px solid ${goal.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${10 * S}px ${22 * S}px`,
      }}>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>目標</span>
        <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text }}>最大化用戶在平台上花的時間</span>
        <span style={{
          opacity: ach.op, fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.primary,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 8 * S,
          padding: `${4 * S}px ${10 * S}px`, letterSpacing: "0.08em",
        }}>✓ 達成</span>
      </div>
      {/* arrow up */}
      <div style={{
        opacity: (goal.op as number) * (0.5 + 0.5 * upPulse),
        fontFamily: F_BODY, fontSize: 24 * S, color: C.primary,
      }}>↑</div>
      {/* engine — recommender */}
      <div style={{
        opacity: eng.op, position: "relative",
        width: 380 * S,
        background: C.surface, border: `${2 * S}px solid ${eng.isOn ? C.orange : C.surfaceBorder}`,
        borderRadius: 22 * S, padding: `${16 * S}px ${24 * S}px`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 14 * S,
        boxShadow: eng.isOn ? `0 0 ${32 * S}px ${C.orange}33` : "none",
      }}>
        <span style={{ fontSize: 44 * S }}>📱</span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>YouTube · Facebook</span>
          <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.orange, fontWeight: 700 }}>推薦演算法</span>
        </div>
      </div>
      {/* arrow down */}
      <div style={{ opacity: side.op, fontFamily: F_BODY, fontSize: 22 * S, color: C.red }}>↓ 副作用</div>
      {/* side-effect row */}
      <div style={{
        opacity: side.op, display: "flex", alignItems: "center", gap: 14 * S,
        background: C.redLight, border: `1px solid ${side.isOn ? C.redBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${10 * S}px ${22 * S}px`,
      }}>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.red, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>結果</span>
        <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text }}>推薦越來越極端的內容</span>
        <span style={{
          opacity: why.op, fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.red,
          background: "rgba(248,113,113,0.16)", border: `1px solid ${C.redBorder}`, borderRadius: 8 * S,
          padding: `${4 * S}px ${10 * S}px`, letterSpacing: "0.06em",
        }}>引發情緒 · 讓人繼續看</span>
      </div>
      {/* alignment failure verdict */}
      <div style={{
        opacity: fail.op, display: "flex", alignItems: "center", gap: 12 * S,
        fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: C.orange,
        background: C.surface, border: `1px solid ${C.orangeBorder}`, borderRadius: 12 * S,
        padding: `${8 * S}px ${22 * S}px`, marginTop: 4 * S,
        boxShadow: fail.isOn ? `0 0 ${24 * S}px ${C.orange}22` : "none",
      }}>
        <span>⚠️</span>
        <span>推薦演算法的 Alignment 失敗</span>
      </div>
    </div>
  );
}

// Phase B hero: 傳統 RLHF vs Anthropic Constitutional AI
function TrainingCompare({ tradAt, satisfyAt, mayWrongAt, ctxAt, constAt, internAt, ruleAt }: {
  tradAt: number; satisfyAt: number; mayWrongAt: number; ctxAt: number; constAt: number; internAt: number; ruleAt: number;
}) {
  const frame = useCurrentFrame();
  const trad = calcActive(tradAt, frame, 0.3);
  const satisfy = calcActive(satisfyAt, frame, 0);
  const mayWrong = calcActive(mayWrongAt, frame, 0);
  const ctx = calcActive(ctxAt, frame, 0);
  const cons = calcActive(constAt, frame, 0.3);
  const intern = calcActive(internAt, frame, 0);
  const rule = calcActive(ruleAt, frame, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S, width: "100%" }}>
      <div style={{ display: "flex", gap: 32 * S, justifyContent: "center", alignItems: "stretch" }}>
        {/* Left: 傳統 RLHF */}
        <div style={{
          opacity: trad.op, width: 530 * S, borderRadius: 22 * S,
          background: C.surface, border: `1px solid ${trad.isOn ? C.orangeBorder : C.surfaceBorder}`,
          padding: `${18 * S}px ${22 * S}px`, display: "flex", flexDirection: "column", gap: 10 * S,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10 * S,
            fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.orange,
            letterSpacing: "0.1em", textTransform: "uppercase" as const,
          }}>
            <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.orange, boxShadow: `0 0 ${8 * S}px ${C.orange}` }} />傳統訓練方式
          </div>
          <div style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>
            讓 AI 學「什麼樣的回答人類喜歡」
          </div>
          <div style={{
            opacity: satisfy.op, fontFamily: F_TC, fontSize: 20 * S, color: C.textSub,
            background: C.orangeLight, border: `1px solid ${C.orangeBorder}`, borderRadius: 10 * S,
            padding: `${8 * S}px ${14 * S}px`,
          }}>AI 學到：讓人類「感覺滿意」</div>
          <div style={{
            opacity: mayWrong.op, fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.red,
            display: "flex", alignItems: "center", gap: 8 * S,
          }}>
            <span style={{ color: C.red }}>≠</span>給出真正「正確」的答案
          </div>
          <div style={{
            opacity: ctx.op, fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.04em",
          }}>有時兩件事一樣，有時不一樣</div>
        </div>
        {/* Right: Constitutional AI */}
        <div style={{
          opacity: cons.op, width: 530 * S, borderRadius: 22 * S,
          background: C.surface, border: `1px solid ${cons.isOn ? C.purpleBorder : C.surfaceBorder}`,
          padding: `${18 * S}px ${22 * S}px`, display: "flex", flexDirection: "column", gap: 10 * S,
          boxShadow: cons.isOn ? `0 0 ${30 * S}px rgba(168,85,247,0.16)` : "none",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 * S,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10 * S,
              fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.purple,
              letterSpacing: "0.1em", textTransform: "uppercase" as const,
            }}>
              <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.purple, boxShadow: `0 0 ${8 * S}px ${C.purple}` }} />
              Constitutional AI
            </div>
            <span style={{
              fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.purple,
              background: C.purpleLight, border: `1px solid ${C.purpleBorder}`, borderRadius: 8 * S,
              padding: `${3 * S}px ${10 * S}px`,
            }}>Anthropic</span>
          </div>
          <div style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>
            讓 AI 內化一套明確的原則
          </div>
          {/* mini rulebook */}
          <div style={{
            opacity: intern.op, display: "flex", flexDirection: "column", gap: 4 * S,
            background: C.purpleLight, border: `1px solid ${C.purpleBorder}`, borderRadius: 10 * S,
            padding: `${10 * S}px ${14 * S}px`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 * S, fontFamily: F_TC, fontSize: 19 * S, color: C.text }}>
              <span style={{ color: C.purple }}>📜</span>明確的原則 #1
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 * S, fontFamily: F_TC, fontSize: 19 * S, color: C.text }}>
              <span style={{ color: C.purple }}>📜</span>明確的原則 #2
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 * S, fontFamily: F_TC, fontSize: 19 * S, color: C.text }}>
              <span style={{ color: C.purple }}>📜</span>明確的原則 #3 …
            </div>
          </div>
          <div style={{
            opacity: rule.op, fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.purple,
            display: "flex", alignItems: "center", gap: 8 * S,
          }}>
            <span>✓</span>而不只是靠人類即時反饋來修正行為
          </div>
        </div>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_28.scene3.to - SCENES_2026_05_28.scene3.from;
  // local = global - 3576. Phase B 首句「還有現在大多數 AI 模型...」02:31.86→4555.8, local 979
  const A_FADE_START = 899;
  const A_REMOVE = 979;
  const B_SHOW_AT = 979;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_A = 0;
  const TODAY_AT = 99; // 02:02.50 今天的 AI 系統每天面對
  const PLATFORM_AT = 239; // 02:07.14 YouTube/Facebook
  const GOAL_AT = 309; // 02:09.50 最大化時間
  const ACHIEVED_AT = 444; // 02:14.02 從技術上達到了
  const SIDE_AT = 520; // 02:16.52 推薦越來越極端
  const WHY_AT = 633; // 02:20.32 因為極端引發情緒
  const FAIL_AT = 868; // 02:28.16 推薦演算法的 Alignment 失敗

  // Phase B captions (local)
  const HEADER_B = B_SHOW_AT;
  const TRAD_AT = 979; // 02:31.86 還有現在大多數 AI 模型
  const SATISFY_AT = 1248; // 02:40.80 讓人類感覺滿意
  const MAYWRONG_AT = 1302; // 02:42.60 而不是真正正確
  const CTX_AT = 1395; // 02:45.70 有時一樣有時不一樣
  const CONST_AT = 1485; // 02:48.70 Anthropic Constitutional AI
  const INTERN_AT = 1651; // 02:54.24 內化明確原則
  const RULE_AT = 1775; // 02:58.38 不靠即時反饋

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="日常案例 ／ EVERY DAY" delay={HEADER_A} color={C.orange} />}
            sentence={
              frame >= PLATFORM_AT
                ? <StageSentence text="YouTube、Facebook 的推薦系統就是經典案例" delay={PLATFORM_AT} color={C.orange} fontSize={26 * S} />
                : frame >= TODAY_AT
                ? <StageSentence text="今天的 AI 系統，每天都在面對 Alignment 問題" delay={TODAY_AT} color={C.text} fontSize={26 * S} />
                : <StageSentence text="這些問題不只是遙遠的科幻場景" delay={HEADER_A} color={C.text} />
            }
            takeaway={<StageTakeaway text="目標達成了 ≠ 我們真正想要的結果" delay={FAIL_AT} color={C.orange} />}
          >
            <RecommenderEngine engineAt={PLATFORM_AT} goalAt={GOAL_AT} achievedAt={ACHIEVED_AT}
              sideAt={SIDE_AT} whyAt={WHY_AT} failAt={FAIL_AT} />
          </HeroFrame>
        </div>
      )}
      {/* ── Phase B ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="正在嘗試的解法 ／ A NEW APPROACH" delay={HEADER_B} color={C.purple} />}
          sentence={
            frame >= CONST_AT
              ? <StageSentence text="Anthropic 的 Constitutional AI：讓 AI 內化原則，不只靠即時反饋" delay={CONST_AT} color={C.purple} fontSize={24 * S} />
              : <StageSentence text="現在的訓練方式，本身就藏著 Alignment 風險" delay={HEADER_B} color={C.text} fontSize={26 * S} />
          }
          takeaway={<StageTakeaway text="從學「人喜歡聽什麼」→ 內化「該遵守什麼原則」" delay={RULE_AT} color={C.purple} />}
        >
          <TrainingCompare tradAt={TRAD_AT} satisfyAt={SATISFY_AT} mayWrongAt={MAYWRONG_AT}
            ctxAt={CTX_AT} constAt={CONST_AT} internAt={INTERN_AT} ruleAt={RULE_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 4 — 給使用者的 3 件提醒 + 平衡的態度 ──────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function InsightCard({ number, icon, title, body, color, activeAt, entranceAt }: {
  number: string; icon: string; title: string; body: string; color: string; activeAt: number; entranceAt: number;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const a = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * a.op,
      width: 300 * S, position: "relative",
      background: C.surface, border: `1px solid ${a.isOn ? color + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${20 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", gap: 12 * S,
      boxShadow: a.isOn ? `0 0 ${36 * S}px ${color}1f` : "none",
    }}>
      {a.isOn && <RippleRing activeAt={activeAt} color={color} radius={22 * S} />}
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
        <div style={{
          width: 64 * S, height: 64 * S, borderRadius: "50%", flexShrink: 0,
          background: `${color}1a`, border: `${2 * S}px solid ${color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color,
        }}>{number}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 * S }}>
          <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color: a.isOn ? C.text : C.textSub, lineHeight: 1.2 }}>{title}</span>
          <span style={{ fontSize: 26 * S }}>{icon}</span>
        </div>
      </div>
      <div style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}

function AttitudeChip({ icon, label, activeAt, entranceAt }: { icon: string; label: string; activeAt: number; entranceAt: number }) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const a = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * a.op, width: 330 * S,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
      background: C.surface, border: `1px solid ${a.isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 18 * S, padding: `${16 * S}px ${18 * S}px`,
      boxShadow: a.isOn ? `0 0 ${24 * S}px ${C.primaryGlow}` : "none",
    }}>
      <div style={{
        width: 64 * S, height: 64 * S, borderRadius: "50%",
        background: `${C.primary}1a`, border: `${2 * S}px solid ${C.primary}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 * S,
      }}>{icon}</div>
      <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub, textAlign: "center" }}>{label}</span>
    </div>
  );
}

// Phase B hero: extreme-pessimist ← BALANCE → extreme-optimist + 3 attitude chips
function BalancedAttitude({ pessAt, optAt, midAt, persistAt, limitAt, respAt }: {
  pessAt: number; optAt: number; midAt: number; persistAt: number; limitAt: number; respAt: number;
}) {
  const frame = useCurrentFrame();
  const pess = calcActive(pessAt, frame, 0.32);
  const opt = calcActive(optAt, frame, 0.32);
  const mid = calcActive(midAt, frame, 0.3);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S, width: "100%" }}>
      {/* spectrum row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 * S, width: "100%" }}>
        <div style={{
          opacity: pess.op, width: 360 * S,
          background: C.surface, border: `1px solid ${pess.isOn ? C.redBorder : C.surfaceBorder}`,
          borderRadius: 16 * S, padding: `${12 * S}px ${20 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
        }}>
          <span style={{ fontSize: 30 * S }}>😰</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: C.red }}>極端悲觀</span>
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.red, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>不準確</span>
        </div>
        {/* center balance */}
        <div style={{
          opacity: mid.op, width: 200 * S,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
        }}>
          <span style={{ fontSize: 50 * S }}>⚖️</span>
          <span style={{
            fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.primary,
            letterSpacing: "0.12em", textTransform: "uppercase" as const,
          }}>更有用的態度</span>
        </div>
        <div style={{
          opacity: opt.op, width: 360 * S,
          background: C.surface, border: `1px solid ${opt.isOn ? C.redBorder : C.surfaceBorder}`,
          borderRadius: 16 * S, padding: `${12 * S}px ${20 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
        }}>
          <span style={{ fontSize: 30 * S }}>😎</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: C.red }}>極端樂觀</span>
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.red, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>不準確</span>
        </div>
      </div>
      {/* 3 attitude chips */}
      <div style={{ display: "flex", gap: 20 * S, justifyContent: "center" }}>
        <AttitudeChip icon="👁️" label="持續關注實際行為" entranceAt={midAt} activeAt={persistAt} />
        <AttitudeChip icon="📏" label="理解它的限制" entranceAt={midAt} activeAt={limitAt} />
        <AttitudeChip icon="🤝" label="為使用後果負責" entranceAt={midAt} activeAt={respAt} />
      </div>
    </div>
  );
}

function Scene4() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_28.scene4.to - SCENES_2026_05_28.scene4.from;
  // local = global - 5483. Phase B 首句「最後一個提醒」03:51.82→6954.6, local 1471
  const A_FADE_START = 1391;
  const A_REMOVE = 1471;
  const B_SHOW_AT = 1471;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_A = 0;
  const INTRO_AT = 36; // 03:03.98 有幾件事值得了解
  const FIRST_AT = 119; // 03:06.76 第一
  const SECOND_AT = 533; // 03:20.54 第二
  const THIRD_AT = 965; // 03:34.92 第三
  const BAL_AT = 1278; // 03:45.38 模型能力變強

  // Phase B captions (local)
  const HEADER_B = B_SHOW_AT;
  const EXTREMES_AT = 1502; // 03:52.86 兩種極端都不準確
  const APPROACH_AT = 1703; // 03:59.56 更有用的態度
  const PERSIST_AT = 1778; // 04:02.04 持續關注
  const LIMIT_AT = 1816; // 04:03.30 理解限制
  const RESP_AT = 1895; // 04:05.94 負責任的態度

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="使用者提醒 ／ FOR YOU AS A USER" delay={HEADER_A} color={C.blue} />}
            sentence={
              frame >= THIRD_AT
                ? <StageSentence text="更強大 ≠ 更安全，這個平衡需要持續投入" delay={THIRD_AT} color={C.blue} fontSize={26 * S} />
                : frame >= SECOND_AT
                ? <StageSentence text="第二：Alignment 失敗的跡象，你可能每天都遇到" delay={SECOND_AT} color={C.blue} fontSize={26 * S} />
                : frame >= FIRST_AT
                ? <StageSentence text="第一：AI 安全是進行中的工程，不是已解決的問題" delay={FIRST_AT} color={C.blue} fontSize={26 * S} />
                : <StageSentence text="作為一個 AI 使用者，有 3 件事值得了解" delay={INTRO_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="能力變強會做更多好事，誤用也能做更多壞事——平衡靠持續投入" delay={BAL_AT} color={C.blue} />}
          >
            <div style={{ display: "flex", gap: 18 * S, justifyContent: "center", alignItems: "stretch", width: "100%" }}>
              <InsightCard number="01" icon="🛠️" title="進行中的工程" color={C.primary}
                entranceAt={20} activeAt={FIRST_AT}
                body="「通過安全評估」不代表「在所有情況下都安全」——尤其在新的、未曾預測到的使用情境下。" />
              <InsightCard number="02" icon="🪞" title="失敗就在日常裡" color={C.orange}
                entranceAt={20} activeAt={SECOND_AT}
                body="AI 說了你想聽的、但不是真實的；AI 完成了任務、但不是你真正想要的——這些都是 Alignment 沒做到位。" />
              <InsightCard number="03" icon="⚖️" title="強大 ≠ 安全" color={C.blue}
                entranceAt={20} activeAt={THIRD_AT}
                body="不一定對立，但也不是自動一致。能力變強 → 做更多好事的同時，誤用也能做更多壞事。" />
            </div>
          </HeroFrame>
        </div>
      )}
      {/* ── Phase B ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="最後提醒 ／ THE RIGHT POSTURE" delay={HEADER_B} color={C.primary} />}
          sentence={
            frame >= APPROACH_AT
              ? <StageSentence text="更有用的態度：持續關注、理解限制、為使用負責" delay={APPROACH_AT} color={C.primary} fontSize={26 * S} />
              : frame >= EXTREMES_AT
              ? <StageSentence text="對 AI Safety 的極端悲觀和極端樂觀，都不準確" delay={EXTREMES_AT} color={C.red} fontSize={26 * S} />
              : <StageSentence text="最後一個提醒——關於我們該抱持的態度" delay={HEADER_B} color={C.text} />
          }
          takeaway={<StageTakeaway text="既不極端悲觀，也不極端樂觀——關注實際行為、理解限制、為後果負責" delay={RESP_AT} color={C.primary} />}
        >
          <BalancedAttitude
            pessAt={EXTREMES_AT} optAt={EXTREMES_AT + 22} midAt={APPROACH_AT}
            persistAt={PERSIST_AT} limitAt={LIMIT_AT} respAt={RESP_AT}
          />
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
      <div style={{ fontFamily: F_TC, fontSize: 26 * S, color: C.text, fontWeight: 700, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_28.summary.to - SCENES_2026_05_28.summary.from;
  // local = global - 7678
  const BADGE_AT = 0; // 04:15.92 重點整理
  const CARD1_AT = 66; // 04:17.80 第一 AI Safety
  const CARD2_AT = 487; // 04:31.84 第二 AI Alignment
  const CARD3_AT = 799; // 04:42.26 第三 持續工程
  const OUTRO_AT = 1034; // 04:50.08 這裡是每日 AI 知識庫

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
        text="AI Safety 是確保 AI 不造成意外傷害的廣義領域，涵蓋技術、應用、社會各層面" />
      <BigTakeaway number="02" delay={CARD2_AT} color={C.orange} top={800}
        text="AI Alignment 是讓 AI 真正做我們想要的事，比聽起來難得多，是 AI Safety 的核心子問題" />
      <BigTakeaway number="03" delay={CARD3_AT} color={C.blue} top={1240}
        text="AI 安全是持續進行的工程，Alignment 失敗每天都可能發生——使用 AI 時保持負責任的態度比什麼都重要" />

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
// ── Main Composition ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export function VideoComposition_2026_05_28() {
  const frame = useCurrentFrame();
  const T = SCENES_2026_05_28.title;
  const S1 = SCENES_2026_05_28.scene1;
  const S2 = SCENES_2026_05_28.scene2;
  const S3 = SCENES_2026_05_28.scene3;
  const S4 = SCENES_2026_05_28.scene4;
  const SU = SCENES_2026_05_28.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Main narration */}
      <Audio src={staticFile("audio/2026-05-28-processed.wav")} volume={1.0} />

      {/* Background music (0.10 vol, fade in/out) */}
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_05_28 - 150, TOTAL_FRAMES_2026_05_28], [v, 0], {
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
      <Sequence from={S4.from} durationInFrames={S4.to - S4.from}>
        <Scene4 />
      </Sequence>
      <Sequence from={SU.from} durationInFrames={SU.to - SU.from}>
        <SummaryScene />
      </Sequence>

      <ProgressBar globalFrame={frame} />
      <IMessageOverlay globalFrame={frame} />
    </AbsoluteFill>
  );
}
