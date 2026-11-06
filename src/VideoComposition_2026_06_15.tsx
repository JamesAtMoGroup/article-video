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
  delayRender,
  continueRender,
} from "remotion";
import React from "react";
import { loadFont as loadNotoSansTC } from "@remotion/google-fonts/NotoSansTC";
import { loadFont as loadSyne } from "@remotion/google-fonts/Syne";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";

// 🚨 字型載入鐵律 (2026-06-16 案後加)
const fontHandle = delayRender("Loading fonts");
const notoTC = loadNotoSansTC("normal", { weights: ["400", "500", "700", "900"] });
const syne = loadSyne("normal", { weights: ["600", "700", "800"] });
const dmsans = loadDMSans("normal", { weights: ["400", "500"] });
Promise.all([notoTC.waitUntilDone(), syne.waitUntilDone(), dmsans.waitUntilDone()])
  .then(() => continueRender(fontHandle))
  .catch(() => continueRender(fontHandle));

// ── Font stacks (aischool) ────────────────────────────────────────────────
const F_HEAD = "'Syne','Noto Sans TC',sans-serif"; // headings / titles / big numbers
const F_BODY = "'DM Sans','Noto Sans TC',sans-serif"; // body / labels / eyebrows / takeaways
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

// ── Hero stage geometry ────────────────────────────────────────────────────
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
// Title:   0s       → 0      hook + 三種情況
// Scene1:  31.34s   → 940    AI 到底多快（5成5 vs 慢兩成 認知落差）
// Scene2:  160.74s  → 4822   三種情況 + 風險一：安全（45% 選不安全）
// Scene3:  233.56s  → 7007   風險二：看不懂 + 風險三：冷門/幻覺套件
// Scene4:  336.36s  → 10091  正確用法（資淺幫手・三個習慣）
// Summary: 447.7s   → 13431  重點整理 + 小練習
// End:     536.02s(audio) → 16170
export const SCENES_2026_06_15 = {
  title: { from: 0, to: 940 },
  scene1: { from: 940, to: 4822 },
  scene2: { from: 4822, to: 7007 },
  scene3: { from: 7007, to: 10091 },
  scene4: { from: 10091, to: 13431 },
  summary: { from: 13431, to: 16170 },
} as const;
export const TOTAL_FRAMES_2026_06_15 = 16170;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "AI 到底多快", start: 940 },
  { label: "風險一：安全", start: 4822 },
  { label: "風險二、三", start: 7007 },
  { label: "正確用法", start: 10091 },
  { label: "重點整理", start: 13431 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene1 結尾：速度的反問 (149.44s「先想一想」)
  { from: 4483, to: 4822, sender: "想一想", text: "你上次請 AI 幫忙，是真的變快了？還是把省下的打字時間，全花在來回檢查它的答案上？" },
  // Scene3 結尾：三種情況回顧 (323.96s「再想一想」)
  { from: 9719, to: 10091, sender: "想一想", text: "安全、看不懂、冷門依賴——你最近一次用 AI 寫東西，有踩到哪一個嗎？" },
  // Scene4 結尾：把 AI 當新人 (434.54s「最後想一想」)
  { from: 13036, to: 13431, sender: "親身經歷", text: "把 AI 當成手很快、但還不太可靠的新人——你會把哪些工作交給它，又會在哪幾關親自檢查？" },
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

// dim → bright tied to a VTT cue (scene-local frame). Present from frame 0.
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
  // 🚫 cursor blink 拿掉 — 持續每 20 frame 閃 = 「閃爍不停」鐵律違反 (06-15 案)
  const cursor = "";

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

// ── RippleRing (one-shot) ──────────────────────────────────────────────────
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
  const a = useFadeIn(delay);
  return (
    <div style={{ ...a, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S }}>
      <span style={{
        width: 8 * S, height: 8 * S, borderRadius: "50%", background: color,
        boxShadow: `0 0 ${8 * S}px ${color}`, flexShrink: 0,
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
      fontWeight: 700, lineHeight: 1.35, maxWidth: 620 * S, margin: "0 auto",
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

// ── Generic chip (present-dim → bright) ────────────────────────────────────
function LightChip({ icon, label, activeAt, accent = C.primary, dim = 0.3, width }: {
  icon?: string; label: string; activeAt: number; accent?: string; dim?: number; width?: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, dim);
  return (
    <div style={{
      opacity: op, width, display: "flex", alignItems: "center", gap: 12 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${11 * S}px ${18 * S}px`,
      boxShadow: isOn ? `0 0 ${24 * S}px ${accent}1f` : "none",
    }}>
      {icon && <span style={{ fontSize: 28 * S }}>{icon}</span>}
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function CoderOrb() {
  // static glow (no continuous oscillation)
  return (
    <div style={{ position: "relative", width: 200 * S, height: 200 * S, flexShrink: 0 }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: `${3 * S}px dashed ${C.primary}`, opacity: 0.35,
      }} />
      <div style={{
        position: "absolute", inset: 20 * S, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,255,178,0.22) 0%, transparent 70%)",
      }} />
      <div style={{
        position: "absolute", inset: 34 * S, borderRadius: "50%",
        background: "rgba(124,255,178,0.12)", border: `${2 * S}px solid ${C.primary}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 6 * S, boxShadow: `0 0 ${34 * S}px rgba(124,255,178,0.4)`,
      }}>
        <span style={{ fontSize: 50 * S }}>👨‍💻</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 18 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.04em" }}>AI 寫程式</span>
      </div>
      <div style={{
        position: "absolute", top: -6 * S, right: -10 * S,
        background: C.primary, color: C.bg, fontFamily: F_HEAD, fontWeight: 800,
        fontSize: 19 * S, borderRadius: 12 * S, padding: `${4 * S}px ${12 * S}px`,
        boxShadow: `0 0 ${16 * S}px ${C.primary}88`,
      }}>⚡ 快 55%</div>
    </div>
  );
}

function TitleCautionChip({ icon, label, activeAt }: { icon: string; label: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      position: "relative", opacity: op,
      background: C.surface, border: `1px solid ${isOn ? C.orangeBorder : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${12 * S}px ${20 * S}px`,
      display: "flex", alignItems: "center", gap: 12 * S,
      boxShadow: isOn ? `0 0 ${28 * S}px ${C.orange}22` : "none",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={C.orange} radius={16 * S} />}
      <span style={{ fontSize: 30 * S }}>{icon}</span>
      <span style={{ fontFamily: F_HEAD, fontSize: 21 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function TitleScene() {
  const dur = SCENES_2026_06_15.title.to - SCENES_2026_06_15.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(40);
  const rowStyle = useFadeUp(34);
  const chipRowStyle = useFadeUp(46);
  const tagStyle = useFadeUp(60);
  // 三種情況 mentioned @18.12s (544), 搞懂 @25.42s (763)
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
          ...badgeOp, marginBottom: 14 * S,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S,
        }}>
          <span style={{
            width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
            boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          }} />
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.2em", textTransform: "uppercase" as const,
          }}>每日 AI 知識庫</span>
        </div>

        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 42 * S, color: C.text,
        }}>
          <WordReveal text="AI 寫程式真的比工程師快？" startFrame={10} staggerPerWord={5}
            fontSize={42 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary,
        }}>
          <WordReveal text="這 3 種情況最好別讓它寫" startFrame={28} staggerPerWord={5}
            fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 16 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          它快，是真的快——但有三種情況，別把程式全交給它
        </p>

        {/* central hero coder */}
        <div style={{ ...rowStyle, marginTop: 22 * S, display: "flex", justifyContent: "center" }}>
          <CoderOrb />
        </div>

        {/* three caution chips (present-dim from start, light per VTT) */}
        <div style={{ ...chipRowStyle, marginTop: 22 * S, display: "flex", gap: 18 * S, justifyContent: "center" }}>
          <TitleCautionChip icon="🔒" label="安全與敏感資料" activeAt={544} />
          <TitleCautionChip icon="🙈" label="你看不懂的程式" activeAt={600} />
          <TitleCautionChip icon="📦" label="冷門依賴套件" activeAt={656} />
        </div>

        <div style={{ ...tagStyle, marginTop: 24 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>速度有邊界 · 它寫你審 · AI 素養</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — AI 到底多快（5成5 vs 認知落差） ───────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function TimeBar({ label, mins, maxMins, color, brightAt, valueText }: {
  label: string; mins: number; maxMins: number; color: string; brightAt: number; valueText: string;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(brightAt, frame, 0.32);
  const grow = interpolate(Math.max(0, frame - brightAt), [0, 28], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  const fullW = 760 * S;
  const barW = fullW * (mins / maxMins) * grow;
  return (
    <div style={{ opacity: op, display: "flex", alignItems: "center", gap: 18 * S }}>
      <span style={{ width: 170 * S, fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 700, color: isOn ? color : C.textSub, textAlign: "right" }}>{label}</span>
      <div style={{ width: fullW, height: 52 * S, background: "rgba(255,255,255,0.05)", borderRadius: 12 * S, position: "relative" }}>
        <div style={{
          width: barW, height: "100%", borderRadius: 12 * S,
          background: color, opacity: isOn ? 0.9 : 0.4,
          boxShadow: isOn ? `0 0 ${24 * S}px ${color}44` : "none",
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          paddingRight: 16 * S,
        }}>
          <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: C.bg, whiteSpace: "nowrap" as const }}>{valueText}</span>
        </div>
      </div>
    </div>
  );
}

function Scene1HeroA() {
  const frame = useCurrentFrame();
  const fasterBadge = calcDim(884, frame, 0.32); // 5成5 @60.80s local 884
  const premise = calcDim(1165, frame, 0.32); // 關鍵前提 @70.16s local 1165
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      {/* study label */}
      <LightChip icon="🧪" label="對照實驗：近 100 位工程師，寫一個網頁伺服器" activeAt={367} dim={0.32} />
      {/* two time bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 * S }}>
        <TimeBar label="用 AI 助手" mins={71} maxMins={161} color={C.primary} brightAt={575} valueText="1 小時 11 分" />
        <TimeBar label="沒用 AI" mins={161} maxMins={161} color={C.muted} brightAt={728} valueText="2 小時 41 分" />
      </div>
      {/* 55% faster badge */}
      <div style={{
        opacity: fasterBadge.op,
        display: "flex", alignItems: "center", gap: 16 * S,
        background: C.surface, border: `1px solid ${fasterBadge.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 18 * S, padding: `${12 * S}px ${30 * S}px`,
        boxShadow: fasterBadge.isOn ? `0 0 ${50 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 56 * S, fontWeight: 800, color: C.primary, lineHeight: 1, textShadow: fasterBadge.isOn ? `0 0 ${24 * S}px ${C.primary}66` : "none" }}>↓ 55%</span>
        <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text }}>AI 組整整快了大約五成五</span>
      </div>
      {/* premise note */}
      <div style={{
        opacity: premise.op, display: "flex", alignItems: "center", gap: 12 * S,
        background: C.orangeLight, border: `1px solid ${premise.isOn ? C.orangeBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${10 * S}px ${22 * S}px`,
      }}>
        <span style={{ fontSize: 26 * S }}>⚠️</span>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.orange }}>前提：範圍清楚、相對獨立、難度不高的任務</span>
      </div>
    </div>
  );
}

function GaugeCard({ icon, kicker, value, sub, color, brightAt, isIllusion }: {
  icon: string; kicker: string; value: string; sub: string; color: string; brightAt: number; isIllusion?: boolean;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(brightAt, frame, 0.3);
  return (
    <div style={{
      width: 420 * S, opacity: op,
      background: isIllusion ? C.surface : C.redLight,
      border: `1px solid ${isOn ? color + "66" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${24 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${color}22` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={brightAt} color={color} radius={22 * S} />}
      <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
        <span style={{ fontSize: 30 * S }}>{icon}</span>
        <span style={{ fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 700, color, letterSpacing: "0.04em" }}>{kicker}</span>
      </div>
      <div style={{ fontFamily: F_HEAD, fontSize: 56 * S, fontWeight: 800, color, lineHeight: 1, textShadow: isOn ? `0 0 ${24 * S}px ${color}55` : "none" }}>{value}</div>
      <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, textAlign: "center" }}>{sub}</span>
    </div>
  );
}

function Scene1HeroB() {
  const frame = useCurrentFrame();
  const gap = calcDim(2601, frame, 0.3); // 40 個百分點 @118.02s local 2601
  const cause = calcDim(2812, frame, 0.3); // 花在清理檢查 @125.06s local 2812
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
      {/* context */}
      <LightChip icon="🧑‍🔧" label="16 位資深工程師，在自己上百萬行的大型專案裡做事" activeAt={163} dim={0.32} />
      {/* perception vs reality */}
      <div style={{ display: "flex", alignItems: "center", gap: 26 * S }}>
        <GaugeCard icon="🧠" kicker="工程師以為" value="快 20%" sub="感覺自己被 AI 加速了" color={C.orange} brightAt={2321} isIllusion />
        <div style={{
          opacity: gap.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
        }}>
          <span style={{ fontFamily: F_HEAD, fontSize: 30 * S, fontWeight: 800, color: C.red }}>落差</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 40 * S, fontWeight: 800, color: C.red, lineHeight: 1 }}>40 分</span>
        </div>
        <GaugeCard icon="📉" kicker="實際上卻" value="慢 20%" sub="完成任務的時間反而拉長" color={C.red} brightAt={2494} />
      </div>
      {/* cause */}
      <div style={{
        opacity: cause.op, display: "flex", alignItems: "center", gap: 12 * S,
        background: C.surface, border: `1px solid ${cause.isOn ? C.redBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${10 * S}px ${24 * S}px`,
      }}>
        <span style={{ fontSize: 26 * S }}>🧹</span>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text }}>慢下來的時間，都花在清理與反覆檢查 AI 的產出</span>
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_15.scene1.to - SCENES_2026_06_15.scene1.from;
  // local = global - 940. Phase B 第一句 @82.34s → 2470, local 1530
  const A_FADE_START = 1450;
  const A_REMOVE = 1530;
  const B_SHOW_AT = 1530;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g940 先講第一段
  const STUDY_AT = 189; // g1129 先說好消息
  const FIVE_AT = 884; // g1824 快了5成5
  const PREMISE_AT = 1165; // g2105 關鍵前提

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="它到底多快 ／ THE SPEED" delay={HEADER_AT} color={C.primary} />}
            sentence={
              frame >= PREMISE_AT
                ? <StageSentence text="但快，有一個關鍵前提" delay={PREMISE_AT} color={C.orange} />
                : frame >= FIVE_AT
                ? <StageSentence text="用 AI 的那組，整整快了大約五成五" delay={FIVE_AT} color={C.primary} fontSize={26 * S} />
                : frame >= STUDY_AT
                ? <StageSentence text="先說好消息：AI 寫程式真的可以很快" delay={STUDY_AT} color={C.text} fontSize={26 * S} />
                : <StageSentence text="先講第一段：AI 寫程式到底有多快" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="範圍清楚、獨立、難度不高的任務，AI 確實又快又好" delay={PREMISE_AT} color={C.primary} />}
          >
            <Scene1HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="反直覺的另一面 ／ THE PARADOX" delay={B_SHOW_AT} color={C.red} />}
          sentence={
            frame >= 2494
              ? <StageSentence text="感覺自己變快，實際上卻是慢了下來" delay={2494} color={C.red} fontSize={26 * S} />
              : <StageSentence text="另一個研究，給了完全相反的答案" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="速度有邊界：複雜、龐大、你很熟的系統裡，它可能反而拖慢你" delay={3066} color={C.red} />}
        >
          <Scene1HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 三種情況 + 風險一：安全（45% 選不安全） ───────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function DangerPreviewCard({ icon, index, title, desc, activeAt }: {
  icon: string; index: string; title: string; desc: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  const accent = C.orange;
  return (
    <div style={{
      width: 380 * S, opacity: op, position: "relative",
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${24 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${accent}1f` : "none",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 86 * S, height: 86 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42 * S,
      }}>{icon}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 * S }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 800, color: accent }}>{index}</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{title}</span>
      </div>
      <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, textAlign: "center", lineHeight: 1.4 }}>{desc}</span>
    </div>
  );
}

function Scene2HeroA() {
  return (
    <div style={{ display: "flex", gap: 28 * S, justifyContent: "center", alignItems: "stretch" }}>
      <DangerPreviewCard icon="🔒" index="01" title="安全敏感" desc="碰到安全性與敏感資料" activeAt={46} />
      <DangerPreviewCard icon="🙈" index="02" title="看不懂" desc="你自己無法審查的程式碼" activeAt={196} />
      <DangerPreviewCard icon="📦" index="03" title="冷門依賴" desc="冷門或最新、特殊的套件" activeAt={317} />
    </div>
  );
}

function Scene2HeroB() {
  const frame = useCurrentFrame();
  const pct = calcDim(1138, frame, 0.3); // 四成五 @198.68s local 1138
  const worse = calcDim(1339, frame, 0.3); // 超過七成 @205.38s local 1339
  const structural = calcDim(1416, frame, 0.3); // 越新越大沒改善 @207.94s local 1416
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
      {/* fork: AI picks unsafe */}
      <div style={{ display: "flex", alignItems: "center", gap: 26 * S }}>
        {/* safe option (dim) */}
        <div style={{
          width: 360 * S, opacity: 0.55,
          background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 18 * S,
          padding: `${16 * S}px ${20 * S}px`, display: "flex", alignItems: "center", gap: 14 * S,
        }}>
          <span style={{ fontSize: 32 * S }}>✅</span>
          <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: C.textSub }}>安全的寫法</span>
        </div>
        {/* unsafe option (selected, bright + 45%) */}
        <div style={{
          width: 460 * S, opacity: pct.op, position: "relative",
          background: C.redLight, border: `1px solid ${pct.isOn ? C.redBorder : C.surfaceBorder}`,
          borderRadius: 18 * S, padding: `${16 * S}px ${24 * S}px`,
          display: "flex", alignItems: "center", gap: 18 * S,
          boxShadow: pct.isOn ? `0 0 ${40 * S}px ${C.red}22` : "none",
        }}>
          {pct.isOn && <RippleRing activeAt={1138} color={C.red} radius={18 * S} />}
          <span style={{ fontFamily: F_HEAD, fontSize: 56 * S, fontWeight: 800, color: C.red, lineHeight: 1, textShadow: pct.isOn ? `0 0 ${24 * S}px ${C.red}66` : "none" }}>45%</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 * S }}>
            <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: C.text }}>❌ 不安全、但能跑的寫法</span>
            <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.textSub }}>兩種都能完成任務時，AI 的選擇</span>
          </div>
        </div>
      </div>
      {/* worse case + structural */}
      <div style={{ display: "flex", gap: 18 * S, justifyContent: "center" }}>
        <div style={{
          opacity: worse.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.surface, border: `1px solid ${worse.isOn ? C.redBorder : C.surfaceBorder}`,
          borderRadius: 12 * S, padding: `${10 * S}px ${20 * S}px`,
        }}>
          <span style={{ fontSize: 24 * S }}>🔺</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: worse.isOn ? C.text : C.textSub }}>某些情況，不安全比率甚至超過七成</span>
        </div>
        <div style={{
          opacity: structural.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.surface, border: `1px solid ${structural.isOn ? C.orangeBorder : C.surfaceBorder}`,
          borderRadius: 12 * S, padding: `${10 * S}px ${20 * S}px`,
        }}>
          <span style={{ fontSize: 24 * S }}>🧬</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: structural.isOn ? C.orange : C.textSub }}>越新越大也沒改善＝結構性問題</span>
        </div>
      </div>
      {/* sensitive domains */}
      <div style={{ display: "flex", gap: 14 * S, justifyContent: "center", flexWrap: "wrap" as const }}>
        {[{ i: "🔑", l: "登入驗證" }, { i: "🔒", l: "密碼" }, { i: "💳", l: "付款" }, { i: "🪪", l: "個資處理" }].map((d, idx) => (
          <LightChip key={idx} icon={d.i} label={d.l} activeAt={1857 + idx * 24} accent={C.red} dim={0.3} />
        ))}
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_15.scene2.to - SCENES_2026_06_15.scene2.from;
  // local = global - 4822. Phase B 第一句 @178.32s → 5350, local 528
  const A_FADE_START = 448;
  const A_REMOVE = 528;
  const B_SHOW_AT = 528;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  const HEADER_AT = 0; // g4822 重頭戲
  const ROLLOVER_AT = 196; // g5018 知道在哪翻車

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="今天的重頭戲 ／ 3 RED FLAGS" delay={HEADER_AT} color={C.orange} />}
            sentence={
              frame >= ROLLOVER_AT
                ? <StageSentence text="知道 AI 會在哪裡翻車，比知道它多快更重要" delay={ROLLOVER_AT} color={C.orange} fontSize={26 * S} />
                : <StageSentence text="這三種情況，最好別讓它全權代勞" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="安全、看不懂、冷門依賴——最容易出事、最該你親自把關" delay={317} color={C.orange} />}
          >
            <Scene2HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="風險一 ／ 安全與敏感資料" delay={B_SHOW_AT} color={C.red} />}
          sentence={
            frame >= 1138
              ? <StageSentence text="安全與不安全都能跑時，它常選不安全那種" delay={1138} color={C.red} fontSize={26 * S} />
              : <StageSentence text="第一種：碰到安全性，跟敏感資料" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="牽涉敏感資料時，別看它「跑得起來」就放行" delay={2071} color={C.red} />}
        >
          <Scene2HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 風險二：看不懂 + 風險三：冷門/幻覺套件 ────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function Scene3HeroA() {
  const frame = useCurrentFrame();
  const car = calcDim(572, frame, 0.3); // 方向盤閉眼副駕 @252.62s local 572
  const okRow = calcDim(374, frame, 0.3); // 只能核對看得懂 local 374
  const badRow = calcDim(723, frame, 0.3); // 出錯找不到 local 723
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      {/* car metaphor */}
      <div style={{
        opacity: car.op, position: "relative",
        display: "flex", alignItems: "center", gap: 0,
        background: C.surface, border: `1px solid ${car.isOn ? C.redBorder : C.surfaceBorder}`,
        borderRadius: 24 * S, padding: `${22 * S}px ${36 * S}px`,
        boxShadow: car.isOn ? `0 0 ${40 * S}px ${C.red}1f` : "none",
      }}>
        {/* AI at wheel */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S, width: 300 * S }}>
          <span style={{ fontSize: 64 * S }}>🤖🛞</span>
          <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: C.text }}>AI 握著方向盤</span>
        </div>
        <span style={{ fontSize: 40 * S, color: C.muted, margin: `0 ${20 * S}px` }}>·</span>
        {/* you blind in passenger */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S, width: 300 * S }}>
          <span style={{ fontSize: 64 * S }}>🙈💺</span>
          <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: C.red }}>你閉著眼睛坐副駕</span>
        </div>
      </div>
      {/* two contrast rows */}
      <div style={{ display: "flex", gap: 20 * S, justifyContent: "center" }}>
        <div style={{
          opacity: okRow.op, width: 480 * S, display: "flex", alignItems: "center", gap: 12 * S,
          background: C.primaryLight, border: `1px solid ${okRow.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 14 * S, padding: `${12 * S}px ${22 * S}px`,
        }}>
          <span style={{ fontSize: 26 * S }}>👀</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: okRow.isOn ? C.primary : C.textSub }}>看得懂 → 才核對得了它的產出</span>
        </div>
        <div style={{
          opacity: badRow.op, width: 480 * S, display: "flex", alignItems: "center", gap: 12 * S,
          background: C.redLight, border: `1px solid ${badRow.isOn ? C.redBorder : C.surfaceBorder}`,
          borderRadius: 14 * S, padding: `${12 * S}px ${22 * S}px`,
        }}>
          <span style={{ fontSize: 26 * S }}>🆘</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: badRow.isOn ? C.red : C.textSub }}>看不懂 → 一旦出錯，連錯在哪都找不到</span>
        </div>
      </div>
    </div>
  );
}

function AttackStep({ icon, label, accent, activeAt }: { icon: string; label: string; accent: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  return (
    <div style={{
      width: 300 * S, opacity: op, position: "relative",
      background: C.surface, border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 18 * S, padding: `${18 * S}px ${16 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
      boxShadow: isOn ? `0 0 ${28 * S}px ${accent}1f` : "none",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={18 * S} />}
      <span style={{ fontSize: 40 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: isOn ? C.text : C.textSub, textAlign: "center", lineHeight: 1.35 }}>{label}</span>
    </div>
  );
}

function Scene3HeroB() {
  const frame = useCurrentFrame();
  const stat = calcDim(1745, frame, 0.3); // 大約兩成 @291.72s local 1745
  const defense = calcDim(2582, frame, 0.3); // 官方來源確認 @319.62s local 2582
  const arrow1 = interpolate(Math.max(0, frame - 2034), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const arrow2 = interpolate(Math.max(0, frame - 2228), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
      {/* hallucinated install + stat */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 * S }}>
        <div style={{
          opacity: calcDim(1501, frame, 0.32).op,
          display: "flex", alignItems: "center", gap: 14 * S,
          background: "#0c0c12", border: `1px solid ${C.redBorder}`, borderRadius: 14 * S,
          padding: `${12 * S}px ${22 * S}px`,
        }}>
          <span style={{ fontFamily: F_BODY, fontSize: 20 * S, color: C.muted }}>$</span>
          <span style={{ fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 700, color: C.text }}>install ghost-utils</span>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: C.red }}>❌ 套件不存在</span>
        </div>
        <div style={{
          opacity: stat.op, display: "flex", alignItems: "center", gap: 14 * S,
          background: C.surface, border: `1px solid ${stat.isOn ? C.orangeBorder : C.surfaceBorder}`,
          borderRadius: 14 * S, padding: `${10 * S}px ${22 * S}px`,
          boxShadow: stat.isOn ? `0 0 ${30 * S}px ${C.orange}1f` : "none",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 * S }}>
            <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.orange }}>約</span>
            <span style={{ fontFamily: F_HEAD, fontSize: 44 * S, fontWeight: 800, color: C.orange, lineHeight: 1 }}>2 成</span>
          </div>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>200 萬份樣本中，<br />至少一個被捏造的套件名</span>
        </div>
      </div>
      {/* slopsquatting attack flow */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 * S }}>
        <AttackStep icon="🤖" label="AI 幻想出一個假套件名" accent={C.orange} activeAt={1914} />
        <span style={{ fontSize: 30 * S, color: C.red, opacity: arrow1 }}>→</span>
        <AttackStep icon="😈" label="壞人搶先註冊、塞進惡意程式" accent={C.red} activeAt={2034} />
        <span style={{ fontSize: 30 * S, color: C.red, opacity: arrow2 }}>→</span>
        <AttackStep icon="👤" label="有人照 AI 的話安裝＝中招" accent={C.red} activeAt={2228} />
      </div>
      {/* defense */}
      <div style={{
        opacity: defense.op, display: "flex", alignItems: "center", gap: 12 * S,
        background: C.primaryLight, border: `1px solid ${defense.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${10 * S}px ${24 * S}px`,
        boxShadow: defense.isOn ? `0 0 ${30 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontSize: 26 * S }}>🛡️</span>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.primary }}>沒聽過的套件，安裝前先到官方來源確認它真的存在</span>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_15.scene3.to - SCENES_2026_06_15.scene3.from;
  // local = global - 7007. Phase B 第一句 @267.54s → 8026, local 1019
  const A_FADE_START = 939;
  const A_REMOVE = 1019;
  const B_SHOW_AT = 1019;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  const HEADER_AT = 0; // g7007 第二種 看不懂
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="風險二 ／ 你看不懂的程式碼" delay={HEADER_AT} color={C.orange} />}
            sentence={
              frame >= 572
                ? <StageSentence text="讀不懂，就像把方向盤交給它、自己閉眼坐副駕" delay={572} color={C.orange} fontSize={26 * S} />
                : <StageSentence text="第二種：你自己看不懂、無法審查的程式碼" delay={HEADER_AT} color={C.text} fontSize={26 * S} />
            }
            takeaway={<StageTakeaway text="能不能看懂、能不能審查，是你該不該採用這段程式的底線" delay={825} color={C.orange} />}
          >
            <Scene3HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="風險三 ／ 冷門與幻覺套件" delay={B_SHOW_AT} color={C.red} />}
          sentence={
            frame >= 1184
              ? <StageSentence text="AI 的幻覺，會叫你去裝一個不存在的套件" delay={1184} color={C.red} fontSize={26 * S} />
              : <StageSentence text="第三種：需要冷門或最新、特殊的依賴" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="壞人會搶註這些假套件名塞惡意程式——裝前先確認來源" delay={2410} color={C.red} />}
        >
          <Scene3HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 4 — 正確用法（資淺幫手・三個習慣） ───────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function RoleCard({ icon, role, tag, desc, color, brightAt }: {
  icon: string; role: string; tag: string; desc: string; color: string; brightAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(brightAt, frame, 0.3);
  return (
    <div style={{
      width: 440 * S, opacity: op,
      background: C.surface, border: `1px solid ${isOn ? color + "66" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${24 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${color}1f` : "none",
    }}>
      <div style={{
        width: 80 * S, height: 80 * S, borderRadius: "50%",
        background: `${color}1a`, border: `${2 * S}px solid ${color}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 * S,
      }}>{icon}</div>
      <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 700, color }}>{role}</span>
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>{tag}</span>
      <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, textAlign: "center", lineHeight: 1.4 }}>{desc}</span>
    </div>
  );
}

function Scene4HeroA() {
  const frame = useCurrentFrame();
  const habit1 = calcDim(652, frame, 0.3); // 用在對的任務 local 652
  const advanced = calcDim(1122, frame, 0.3); // 複雜留給你 local 1122
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      {/* two roles */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 * S }}>
        <RoleCard icon="🤖" role="AI ＝ 資淺幫手" tag="它寫" desc="很快、很勤勞，但需要被盯著" color={C.blue} brightAt={182} />
        <span style={{ fontFamily: F_HEAD, fontSize: 36 * S, color: C.muted }}>⇄</span>
        <RoleCard icon="🧑" role="你 ＝ 資深審核" tag="你審" desc="最後負責的人，是你不是 AI" color={C.primary} brightAt={370} />
      </div>
      {/* habit 1 */}
      <div style={{
        opacity: habit1.op, width: 980 * S,
        display: "flex", alignItems: "center", gap: 16 * S,
        background: C.primaryLight, border: `1px solid ${habit1.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 16 * S, padding: `${14 * S}px ${26 * S}px`,
        boxShadow: habit1.isOn ? `0 0 ${30 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: C.primary }}>習慣 1</span>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text }}>
          用在對的任務：範圍清楚、相對獨立、出錯一眼就看得出來的小活
        </span>
      </div>
      {/* advanced -> you */}
      <div style={{
        opacity: advanced.op, display: "flex", alignItems: "center", gap: 12 * S,
        background: C.surface, border: `1px solid ${advanced.isOn ? C.surfaceBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${10 * S}px ${24 * S}px`,
      }}>
        <span style={{ fontSize: 24 * S }}>🧭</span>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500, color: C.textSub }}>複雜核心邏輯、牽動全局的改動，留給你自己主導，讓 AI 當輔助</span>
      </div>
    </div>
  );
}

function HabitChecklist({ index, title, color, items, brightAt }: {
  index: string; title: string; color: string; brightAt: number;
  items: { mark: string; text: string; at: number }[];
}) {
  const frame = useCurrentFrame();
  const head = calcDim(brightAt, frame, 0.3);
  return (
    <div style={{
      width: 560 * S, opacity: head.op,
      background: C.surface, border: `1px solid ${head.isOn ? color + "66" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${28 * S}px`,
      display: "flex", flexDirection: "column", gap: 14 * S,
      boxShadow: head.isOn ? `0 0 ${40 * S}px ${color}1a` : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
        <span style={{
          fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: C.bg,
          background: color, borderRadius: 10 * S, padding: `${4 * S}px ${14 * S}px`,
        }}>{index}</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: C.text }}>{title}</span>
      </div>
      {items.map((it, i) => {
        const a = calcDim(it.at, frame, 0.3);
        return (
          <div key={i} style={{ opacity: a.op, display: "flex", alignItems: "flex-start", gap: 12 * S }}>
            <span style={{ fontSize: 22 * S, flexShrink: 0, marginTop: 2 * S }}>{it.mark}</span>
            <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500, color: a.isOn ? C.text : C.textSub, lineHeight: 1.4 }}>{it.text}</span>
          </div>
        );
      })}
    </div>
  );
}

function Scene4HeroB() {
  const frame = useCurrentFrame();
  const reflex = calcDim(2715, frame, 0.3); // 反射動作 local 2715
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
      <div style={{ display: "flex", gap: 24 * S, justifyContent: "center", alignItems: "stretch" }}>
        <HabitChecklist index="習慣 2" title="讀得懂才採用" color={C.blue} brightAt={1365}
          items={[
            { mark: "✅", text: "凡是它寫的，你都要能讀懂並核對", at: 1428 },
            { mark: "↩️", text: "讀不懂？請它解釋到你懂，否則就別用", at: 1610 },
            { mark: "⚠️", text: "它出錯不用負責，最後負責的是你", at: 1880 },
          ]} />
        <HabitChecklist index="習慣 3" title="敏感與依賴特別小心" color={C.orange} brightAt={2141}
          items={[
            { mark: "🔒", text: "驗證、密碼、付款、個資：當成預設不安全，逐行檢查", at: 2248 },
            { mark: "📦", text: "任何要你裝的套件，先確認存在、來源可靠", at: 2547 },
          ]} />
      </div>
      <div style={{
        opacity: reflex.op, display: "flex", alignItems: "center", gap: 12 * S,
        background: C.primaryLight, border: `1px solid ${reflex.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${12 * S}px ${26 * S}px`,
        boxShadow: reflex.isOn ? `0 0 ${30 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontSize: 26 * S }}>⚡</span>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.primary }}>把這兩件變成反射動作：享受 AI 的速度，又不被盲點反咬一口</span>
      </div>
    </div>
  );
}

function Scene4() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_15.scene4.to - SCENES_2026_06_15.scene4.from;
  // local = global - 10091. Phase B 第一句 @381.86s → 11456, local 1365
  const A_FADE_START = 1285;
  const A_REMOVE = 1365;
  const B_SHOW_AT = 1365;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  const HEADER_AT = 0; // g10091 最後一段怎麼用
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="那到底該怎麼用 ／ THE PLAYBOOK" delay={HEADER_AT} color={C.primary} />}
            sentence={
              frame >= 370
                ? <StageSentence text="把它當資淺幫手，不是能全權託付的資深工程師" delay={370} color={C.primary} fontSize={26 * S} />
                : <StageSentence text="理解邊界後，讓 AI 寫，由你審" delay={HEADER_AT} color={C.text} fontSize={26 * S} />
            }
            takeaway={<StageTakeaway text="習慣 1：先把它用在範圍清楚、出錯你一眼就看得出來的小活上" delay={652} color={C.primary} />}
          >
            <Scene4HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="另外兩個習慣 ／ HABITS 2 & 3" delay={B_SHOW_AT} color={C.primary} />}
          sentence={
            frame >= 2141
              ? <StageSentence text="敏感與依賴，一律當成預設不安全來把關" delay={2141} color={C.orange} fontSize={26 * S} />
              : <StageSentence text="凡是它寫的，你都要能讀懂、並且核對" delay={B_SHOW_AT} color={C.text} fontSize={26 * S} />
          }
          takeaway={<StageTakeaway text="讀得懂才用、敏感與依賴親自把關——變成反射動作就對了" delay={2715} color={C.primary} />}
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
  // 🐢 slow transition — 60 frame dim→bright (~2 秒) 而非 22 frame，softer (06-15 案)
  const af = Math.max(0, frame - activeAt);
  const op = interpolate(af, [0, 60], [0.32, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const isOn = frame >= activeAt + 30;  // 半秒後才算 "on"，border/shadow 晚一點才切換
  return (
    <div style={{
      width: 1160 * S, opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${20 * S}px ${30 * S}px`,
      display: "flex", alignItems: "center", gap: 24 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${accent}1f` : "none", position: "relative",
    }}>
      {/* 🚫 RippleRing 拿掉 — Summary 卡片不需要漣漪 (鐵律 06-15) */}
      <div style={{
        width: 84 * S, height: 84 * S, borderRadius: "50%", flexShrink: 0,
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 * S,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 6 * S }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 22 * S, color: accent }}>{index}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 24 * S, color: isOn ? C.text : C.textSub }}>{title}</span>
        </div>
        <div style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, lineHeight: 1.45 }}>{body}</div>
      </div>
    </div>
  );
}

function PracticeRow({ icon, label, text, accent, activeAt }: {
  icon: string; label: string; text: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  return (
    <div style={{
      width: 1100 * S, opacity: op,
      display: "flex", alignItems: "center", gap: 18 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 18 * S, padding: `${16 * S}px ${28 * S}px`,
      boxShadow: isOn ? `0 0 ${30 * S}px ${accent}1a` : "none",
    }}>
      <span style={{ fontSize: 36 * S, flexShrink: 0 }}>{icon}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 * S }}>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: accent, letterSpacing: "0.08em" }}>{label}</span>
        <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 500, color: C.text, lineHeight: 1.4 }}>{text}</span>
      </div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_15.summary.to - SCENES_2026_06_15.summary.from;
  // local = global - 13431. Phase B 第一句 @494.48s → 14834, local 1403
  const A_FADE_START = 1323;
  const A_REMOVE = 1403;
  const B_SHOW_AT = 1403;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  const eyebrowFade = useFadeIn(6);
  const headFade = useFadeUp(14);
  const outroFade = useFadeUp(2474); // g15905 這裡是每日AI知識庫

  return (
    <SceneFade durationInFrames={dur}>
      {/* Phase A — three recaps */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <AbsoluteFill style={{
            paddingTop: CONTENT_TOP + 18 * S, paddingBottom: SUBTITLE_SAFE,
            paddingLeft: 80 * S, paddingRight: 80 * S,
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <div style={{ ...eyebrowFade, display: "flex", alignItems: "center", gap: 10 * S }}>
              <span style={{
                width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
                boxShadow: `0 0 ${8 * S}px ${C.primary}`,
              }} />
              <span style={{
                fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.primary,
                letterSpacing: "0.2em", textTransform: "uppercase" as const,
              }}>重點整理 — RECAP</span>
            </div>
            <h2 style={{
              ...headFade, margin: `${10 * S}px 0 ${26 * S}px`,
              fontFamily: F_HEAD, fontWeight: 800, fontSize: 34 * S, color: C.text, textAlign: "center",
            }}>AI 寫程式：快，但要會用</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 * S }}>
              <RecapCard index="01" icon="⚡" title="到底快不快" accent={C.primary} activeAt={83}
                body="簡單又獨立的任務，它可以快過五成；但在你熟悉的大型複雜系統裡，反而可能慢上約兩成，你還會誤以為自己變快了。" />
              <RecapCard index="02" icon="🚩" title="三種別全交給它" accent={C.orange} activeAt={558}
                body="安全敏感（約四成五會選不安全的寫法）、你看不懂無法審查的程式、還有需要冷門或它幻想出來的套件。" />
              <RecapCard index="03" icon="✅" title="正確的用法" accent={C.blue} activeAt={1015}
                body="把 AI 當資淺幫手：它寫、你審，用在對的任務上，敏感程式與陌生套件一律親自把關。" />
            </div>
          </AbsoluteFill>
        </div>
      )}

      {/* Phase B — practice + outro */}
      {showB && (
        <AbsoluteFill style={{
          paddingTop: CONTENT_TOP + 18 * S, paddingBottom: SUBTITLE_SAFE,
          paddingLeft: 80 * S, paddingRight: 80 * S,
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
            <span style={{
              width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
              boxShadow: `0 0 ${8 * S}px ${C.primary}`,
            }} />
            <span style={{
              fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.primary,
              letterSpacing: "0.2em", textTransform: "uppercase" as const,
            }}>今日小練習 — TRY IT</span>
          </div>
          <h2 style={{
            margin: `${12 * S}px 0 ${30 * S}px`,
            fontFamily: F_HEAD, fontWeight: 800, fontSize: 32 * S, color: C.text, textAlign: "center",
          }}>下次請 AI 寫東西時，做兩個動作</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 * S }}>
            <PracticeRow icon="🔍" label="動作一 · 能不能審查" accent={C.primary} activeAt={1500}
              text="問自己「這段我看得懂、能檢查嗎？」——看不懂，就請它解釋到懂，或者乾脆不用。" />
            <PracticeRow icon="📦" label="動作二 · 套件先查證" accent={C.orange} activeAt={1945}
              text="它叫你裝任何工具或套件，先花 30 秒到官方來源，確認它真的存在、是對的那一個。" />
          </div>

          <div style={{ ...outroFade, marginTop: 40 * S, display: "flex", alignItems: "center", gap: 12 * S }}>
            <span style={{
              width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
              boxShadow: `0 0 ${8 * S}px ${C.primary}`,
            }} />
            <span style={{ fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 500, color: C.textSub }}>
              這裡是<span style={{ color: C.primary, fontWeight: 700 }}>每日 AI 知識庫</span>，我們明天見 👋
            </span>
          </div>
        </AbsoluteFill>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── ROOT COMPOSITION ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export const VideoComposition_2026_06_15: React.FC = () => {
  const frame = useCurrentFrame();
  const Sx = SCENES_2026_06_15;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-06-15-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f, [TOTAL_FRAMES_2026_06_15 - 150, TOTAL_FRAMES_2026_06_15], [v, 0],
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
