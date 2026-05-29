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
  redBorder: "rgba(248,113,113,0.24)",
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

// ── Scene boundaries (VTT seconds × 30, next-topic-first-sentence) ─────────
// TitleScene: 0s         → 0     hook + 三件預告
// Scene1:     47.4s      → 1422  Claude Opus 4.8 + Dynamic Workflows
// Scene2:     170.8s     → 5124  GPT-5.5 Instant 幻覺 -52.5%
// Scene3:     254.4s     → 7632  Gemini 3.5 Flash 取捨打破
// Summary:    348.6s     → 10458 重點整理
// End:        389.8s(audio) → 11710 (+~16f buffer)
export const SCENES_2026_05_29 = {
  title: { from: 0, to: 1422 },
  scene1: { from: 1422, to: 5124 },
  scene2: { from: 5124, to: 7632 },
  scene3: { from: 7632, to: 10458 },
  summary: { from: 10458, to: 11710 },
} as const;
export const TOTAL_FRAMES_2026_05_29 = 11710;

const CHAPTERS = [
  { label: "本週焦點", start: 0 },
  { label: "Claude Opus 4.8", start: 1422 },
  { label: "GPT-5.5 Instant", start: 5124 },
  { label: "Gemini 3.5 Flash", start: 7632 },
  { label: "重點整理", start: 10458 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene1 想一想 (02:35.8 → 4674)
  { from: 4674, to: 5124, sender: "想一想", text: "如果你能把一個需要多線並行的任務交給 AI，你最想讓它幫你做什麼？你會怎麼設定它的權限邊界？" },
  // Scene2 想一想 (04:04.0 → 7320)
  { from: 7320, to: 7632, sender: "想一想", text: "你覺得 ChatGPT 在哪類問題上最容易讓你直接信任？哪類問題你還是會去查一下？你的判斷標準是什麼？" },
  // Scene3 想一想 (05:38.4 → 10152)
  { from: 10152, to: 10458, sender: "想一想", text: "Claude、ChatGPT、Gemini 三平台同時升級，你平時主要用哪個？這些更新會改變你的使用習慣嗎？" },
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

// dim (~0.30) → bright (1) tied to a VTT cue (scene-local frame)
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
      fontWeight: 700, lineHeight: 1.35, maxWidth: 660 * S, margin: "0 auto",
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
      color: C.text, lineHeight: 1.45, maxWidth: 1080 * S,
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

function PlatformChip({ icon, brand, feature, accent, activeAt }: {
  icon: string; brand: string; feature: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  const sc = isOn ? easeOutBack(prog(Math.max(0, frame - activeAt), 22)) : 0.92;
  return (
    <div style={{
      width: 320 * S, opacity: op, transform: `scale(${Math.max(0.92, Math.min(1, sc))})`,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      boxShadow: isOn ? `0 0 ${44 * S}px ${accent}24` : "none",
      position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 92 * S, height: 92 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 * S,
        boxShadow: isOn ? `0 0 ${22 * S}px ${accent}55` : "none",
      }}>{icon}</div>
      <span style={{
        fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800,
        color: isOn ? C.text : C.textSub, textAlign: "center", lineHeight: 1.2,
      }}>{brand}</span>
      <span style={{
        fontFamily: F_TC, fontSize: 18 * S, fontWeight: 500,
        color: isOn ? accent : C.muted, textAlign: "center", lineHeight: 1.35,
      }}>{feature}</span>
    </div>
  );
}

function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_29.title.to - SCENES_2026_05_29.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(288);
  const rowStyle = useFadeUp(320);
  const tagStyle = useFadeUp(1362);
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
          }}>每日 AI 知識庫 · 本週精選</span>
        </div>

        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 48 * S, color: C.text,
        }}>
          <WordReveal text="本週 AI 大事" startFrame={10} staggerPerWord={6}
            fontSize={48 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary,
        }}>
          <WordReveal text="三大平台同週升級" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 22 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          Claude 學會指揮上百個 AI · ChatGPT 幻覺大幅下降 · Gemini 快模型達到旗艦智能
        </p>

        {/* three platform chips — light up as narrator previews each */}
        <div style={{ ...rowStyle, marginTop: 36 * S, display: "flex", gap: 28 * S, justifyContent: "center" }}>
          <PlatformChip icon="🧠" brand="Claude Opus 4.8" feature="Dynamic Workflows" accent={C.primary} activeAt={534} />
          <PlatformChip icon="💬" brand="GPT-5.5 Instant" feature="幻覺 -52.5%" accent={C.orange} activeAt={876} />
          <PlatformChip icon="⚡" brand="Gemini 3.5 Flash" feature="Flash = Pro 等級" accent={C.blue} activeAt={1146} />
        </div>

        <div style={{ ...tagStyle, marginTop: 30 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>並行子代理人 · 幻覺降低 · 速度質量同時兼得</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — CLAUDE OPUS 4.8 + DYNAMIC WORKFLOWS ───────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Big Claude Opus 4.8 model card (left side, present from scene start)
function ClaudeModelCard() {
  const frame = useCurrentFrame();
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.06);
  return (
    <div style={{ position: "relative", width: 280 * S, height: 280 * S, flexShrink: 0 }}>
      <div style={{
        position: "absolute", inset: 20 * S, borderRadius: 28 * S,
        background: "radial-gradient(circle, rgba(124,255,178,0.18) 0%, transparent 70%)",
        opacity: 0.6 + 0.4 * pulse,
      }} />
      <div style={{
        position: "absolute", inset: 30 * S, borderRadius: 24 * S,
        background: "rgba(124,255,178,0.08)", border: `${2 * S}px solid ${C.primary}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 10 * S, boxShadow: `0 0 ${(26 + pulse * 16) * S}px rgba(124,255,178,0.35)`,
      }}>
        <span style={{ fontSize: 72 * S }}>🧠</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 800, color: C.primary, letterSpacing: "0.04em" }}>
          Claude Opus 4.8
        </span>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500, color: C.textSub }}>
          Anthropic · 本週三推出
        </span>
      </div>
      <div style={{
        position: "absolute", top: -8 * S, right: -8 * S,
        background: C.primary, color: C.bg, fontFamily: F_HEAD, fontWeight: 800,
        fontSize: 20 * S, borderRadius: 12 * S, padding: `${5 * S}px ${14 * S}px`,
        boxShadow: `0 0 ${16 * S}px ${C.primary}88`,
      }}>v4.8</div>
    </div>
  );
}

function ImprovementRow({ icon, label, value, activeAt, entranceAt, accent = C.primary }: {
  icon: string; label: string; value: string; activeAt: number; entranceAt: number; accent?: string;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.45);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      display: "flex", alignItems: "center", gap: 16 * S, width: 540 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${14 * S}px ${20 * S}px`,
      boxShadow: isOn ? `0 0 ${28 * S}px ${accent}1f` : "none",
    }}>
      <div style={{
        width: 60 * S, height: 60 * S, borderRadius: 14 * S, flexShrink: 0,
        background: `${accent}1a`, border: `1px solid ${accent}66`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 * S,
      }}>{icon}</div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 * S }}>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500, color: C.muted, letterSpacing: "0.04em" }}>{label}</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: isOn ? C.text : C.textSub, lineHeight: 1.25 }}>{value}</span>
      </div>
    </div>
  );
}

function Scene1HeroA() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 50 * S }}>
      <ClaudeModelCard />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 * S }}>
        <ImprovementRow icon="📈" label="代理編程能力" value="64.3% → 69.2%" entranceAt={40} activeAt={420} />
        <ImprovementRow icon="🏁" label="Super-Agent 基準" value="唯一能跑完所有案例" entranceAt={40} activeAt={714} />
        <ImprovementRow icon="🚫" label='「錯誤照單全收」測試' value="得到 0 分 · 不再硬撐" entranceAt={40} activeAt={858} accent={C.orange} />
      </div>
    </div>
  );
}

// Phase B — Commander + sub-agents diagram
function CommanderViz() {
  const frame = useCurrentFrame();
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.08);
  // 6 sub-agents in a fan-out arc below commander
  const agents = [
    { activeAt: 1632, label: "子 1" },
    { activeAt: 1632, label: "子 2" },
    { activeAt: 1632, label: "子 3" },
    { activeAt: 1746, label: "子 4" },
    { activeAt: 1746, label: "子 5" },
    { activeAt: 1890, label: "子 6" },
  ];
  const W_VIZ = 700 * S, H_VIZ = 260 * S;
  return (
    <div style={{ position: "relative", width: W_VIZ, height: H_VIZ }}>
      {/* Commander at top center */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 180 * S, height: 110 * S,
        background: C.surface, border: `${2 * S}px solid ${C.primary}`,
        borderRadius: 18 * S, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 4 * S,
        boxShadow: `0 0 ${(22 + pulse * 14) * S}px rgba(124,255,178,0.4)`,
        zIndex: 4,
      }}>
        <span style={{ fontSize: 36 * S }}>👑</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 18 * S, fontWeight: 800, color: C.primary, letterSpacing: "0.04em" }}>Claude · 指揮官</span>
      </div>
      {/* Connection lines (SVG behind agents) */}
      <svg width={W_VIZ} height={H_VIZ} style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}>
        {agents.map((a, i) => {
          const cx = W_VIZ / 2;
          const cy = 110 * S;
          const ax = (W_VIZ / 7) * (i + 1);
          const ay = H_VIZ - 60 * S;
          const lineF = Math.max(0, frame - a.activeAt);
          const lineOpacity = interpolate(lineF, [0, 22], [0, 0.4], { easing: E.outCubic, extrapolateRight: "clamp" });
          return (
            <line key={i} x1={cx} y1={cy} x2={ax} y2={ay}
              stroke={C.primary} strokeWidth={1.5 * S} strokeDasharray={`${6 * S} ${5 * S}`}
              opacity={lineOpacity} />
          );
        })}
      </svg>
      {/* Sub-agents row */}
      {agents.map((a, i) => {
        const ax = (W_VIZ / 7) * (i + 1) - 40 * S;
        const ay = H_VIZ - 100 * S;
        const dimF = Math.max(0, frame - a.activeAt);
        const op = interpolate(dimF, [0, 22], [0.22, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const isOn = frame >= a.activeAt;
        return (
          <div key={i} style={{
            position: "absolute", left: ax, top: ay,
            width: 80 * S, height: 80 * S, borderRadius: "50%",
            background: isOn ? `${C.primary}1a` : "rgba(255,255,255,0.04)",
            border: `${2 * S}px solid ${isOn ? C.primary : C.surfaceBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 * S,
            opacity: op,
            boxShadow: isOn ? `0 0 ${16 * S}px ${C.primary}44` : "none",
            zIndex: 3,
          }}>🤖</div>
        );
      })}
    </div>
  );
}

function StatPanel({ value, label, brightAt, accent }: {
  value: string; label: string; brightAt: number; accent: string;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(brightAt, frame, 0.32);
  return (
    <div style={{
      opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 18 * S, padding: `${14 * S}px ${24 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
      boxShadow: isOn ? `0 0 ${28 * S}px ${accent}1f` : "none", minWidth: 220 * S,
    }}>
      <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 36 * S, color: accent, lineHeight: 1 }}>{value}</div>
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.04em" }}>{label}</span>
    </div>
  );
}

function BoundaryChip({ icon, label, activeAt, entranceAt, accent = C.orange }: {
  icon: string; label: string; activeAt: number; entranceAt: number; accent?: string;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      display: "flex", alignItems: "center", gap: 10 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${10 * S}px ${18 * S}px`,
      boxShadow: isOn ? `0 0 ${20 * S}px ${accent}1f` : "none",
    }}>
      <span style={{ fontSize: 24 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function Scene1HeroB() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
      <div style={{ display: "flex", alignItems: "center", gap: 36 * S }}>
        <CommanderViz />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 * S }}>
          <StatPanel value="16" label="同時並行" brightAt={1974} accent={C.primary} />
          <StatPanel value="1,000" label="單次上限" brightAt={2082} accent={C.primary} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 16 * S }}>
        <BoundaryChip icon="🚧" label="授權與監督要更明確" entranceAt={2706} activeAt={2922} />
        <BoundaryChip icon="📐" label="把邊界畫清楚" entranceAt={2706} activeAt={3042} />
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_29.scene1.to - SCENES_2026_05_29.scene1.from;
  const A_FADE_START = 1246;
  const A_REMOVE = 1326;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= A_REMOVE;
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="STORY 01 — CLAUDE OPUS 4.8" delay={6} />}
            sentence={<StageSentence text="模型更會做事，也學會了不再硬撐" delay={14} />}
            takeaway={<StageTakeaway text="不只更會做事，還會誠實說「我不知道」——「零分」是好的" delay={1140} />}
          >
            <Scene1HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="新功能 — DYNAMIC WORKFLOWS" delay={1332} />}
          sentence={<StageSentence text="一個 AI 指揮上百個 AI 並行解題" delay={1340} />}
          takeaway={<StageTakeaway text="從一問一答，變成一個有部隊的指揮官——授權給它，邊界要畫清楚" delay={2922} />}
        >
          <Scene1HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — GPT-5.5 INSTANT (幻覺大減) ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function ChatBubble({ label, score, bright, color, activeAt }: {
  label: string; score: number; bright: boolean; color: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op } = calcDim(activeAt, frame, 0.34);
  const grow = interpolate(Math.max(0, frame - activeAt), [0, 32], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  return (
    <div style={{
      opacity: op,
      width: 280 * S,
      background: C.surface,
      border: `1px solid ${bright ? color + "66" : C.surfaceBorder}`,
      borderRadius: 18 * S, padding: `${16 * S}px ${20 * S}px`,
      display: "flex", flexDirection: "column", gap: 10 * S,
      boxShadow: bright ? `0 0 ${36 * S}px ${color}24` : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 * S }}>
        <span style={{ fontSize: 22 * S }}>💬</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 19 * S, fontWeight: 700, color: bright ? C.text : C.textSub }}>{label}</span>
      </div>
      <div style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.04em" }}>幻覺率</div>
      {/* horizontal hallucination bar */}
      <div style={{ height: 16 * S, background: "rgba(255,255,255,0.06)", borderRadius: 8 * S, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${score * grow * 100}%`,
          background: color, borderRadius: 8 * S,
          boxShadow: bright ? `0 0 ${10 * S}px ${color}88` : "none",
        }} />
      </div>
    </div>
  );
}

function DomainChip({ icon, label, activeAt, entranceAt }: { icon: string; label: string; activeAt: number; entranceAt: number }) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      display: "flex", alignItems: "center", gap: 10 * S,
      background: C.surface, border: `1px solid ${isOn ? C.orangeBorder : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${10 * S}px ${20 * S}px`,
      boxShadow: isOn ? `0 0 ${20 * S}px ${C.orange}1f` : "none",
    }}>
      <span style={{ fontSize: 26 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function Scene2HeroA() {
  const frame = useCurrentFrame();
  const arrowOp = interpolate(Math.max(0, frame - 900), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      {/* new-default badge */}
      <div style={{
        opacity: calcDim(204, frame, 0.32).op,
        display: "flex", alignItems: "center", gap: 12 * S,
        background: C.surface, border: `1px solid ${C.orangeBorder}`,
        borderRadius: 14 * S, padding: `${8 * S}px ${20 * S}px`,
        boxShadow: `0 0 ${20 * S}px ${C.orange}1a`,
      }}>
        <span style={{ fontSize: 24 * S }}>⭐</span>
        <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: C.text }}>
          ChatGPT 新預設 · 你現在對話的就是這版
        </span>
      </div>
      {/* old vs new comparison + big -52.5% */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 * S }}>
        <ChatBubble label="GPT-5 (舊版)" score={1.0} bright={false} color={C.muted} activeAt={582} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S, opacity: arrowOp }}>
          <span style={{ fontSize: 28 * S, color: C.orange }}>↓</span>
          <div style={{
            fontFamily: F_HEAD, fontWeight: 800, fontSize: 44 * S, color: C.orange,
            textShadow: `0 0 ${22 * S}px ${C.orange}66`,
          }}>-52.5%</div>
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>幻覺率</span>
        </div>
        <ChatBubble label="GPT-5.5 Instant" score={0.475} bright={true} color={C.orange} activeAt={930} />
      </div>
      {/* three high-risk domains */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S }}>
        <span style={{
          fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em",
          opacity: calcDim(774, frame, 0.32).op,
        }}>高風險領域同樣大降</span>
        <div style={{ display: "flex", gap: 16 * S }}>
          <DomainChip icon="🏥" label="醫療" entranceAt={714} activeAt={774} />
          <DomainChip icon="⚖️" label="法律" entranceAt={714} activeAt={774} />
          <DomainChip icon="💰" label="財務" entranceAt={714} activeAt={774} />
        </div>
      </div>
    </div>
  );
}

// Phase B — 減少 ≠ 消失
function ReductionBar({ reducedAt, remainAt }: { reducedAt: number; remainAt: number }) {
  const frame = useCurrentFrame();
  const redGrow = interpolate(Math.max(0, frame - reducedAt), [0, 28], [0, 0.525], { easing: E.outExpo, extrapolateRight: "clamp" });
  const remGrow = interpolate(Math.max(0, frame - remainAt), [0, 28], [0, 0.475], { easing: E.outExpo, extrapolateRight: "clamp" });
  const redOp = calcDim(reducedAt, frame, 0.32).op;
  const remOp = calcDim(remainAt, frame, 0.32).op;
  const BAR_W = 720 * S;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 * S, alignItems: "center" }}>
      <div style={{
        width: BAR_W, height: 80 * S, borderRadius: 18 * S, overflow: "hidden",
        background: "rgba(255,255,255,0.06)", border: `1px solid ${C.surfaceBorder}`,
        display: "flex",
      }}>
        <div style={{
          width: `${redGrow * 100}%`, height: "100%",
          background: `linear-gradient(90deg, ${C.primary} 0%, rgba(124,255,178,0.6) 100%)`,
          opacity: redOp,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 28 * S, color: C.bg,
          textShadow: `0 0 ${8 * S}px rgba(255,255,255,0.3)`,
        }}>{redGrow > 0.15 ? "52.5%" : ""}</div>
        <div style={{
          width: `${remGrow * 100}%`, height: "100%",
          background: `linear-gradient(90deg, rgba(248,113,113,0.6) 0%, ${C.red} 100%)`,
          opacity: remOp,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 26 * S, color: C.text,
          textShadow: `0 0 ${8 * S}px rgba(0,0,0,0.4)`,
        }}>{remGrow > 0.15 ? "47.5%" : ""}</div>
      </div>
      <div style={{ width: BAR_W, display: "flex", justifyContent: "space-between" }}>
        <span style={{
          opacity: redOp, fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
          color: C.primary, letterSpacing: "0.04em",
        }}>✓ 已減少的幻覺</span>
        <span style={{
          opacity: remOp, fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
          color: C.red, letterSpacing: "0.04em",
        }}>⚠ 仍會發生的幻覺</span>
      </div>
    </div>
  );
}

function HabitChip({ icon, label, activeAt, entranceAt }: { icon: string; label: string; activeAt: number; entranceAt: number }) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      width: 280 * S, display: "flex", alignItems: "center", gap: 12 * S,
      background: C.surface, border: `1px solid ${isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${12 * S}px ${18 * S}px`,
      boxShadow: isOn ? `0 0 ${20 * S}px ${C.primary}1f` : "none",
    }}>
      <span style={{ fontSize: 28 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function Scene2HeroB() {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * S }}>
      {/* headline statement */}
      <div style={{
        fontFamily: F_HEAD, fontSize: 36 * S, fontWeight: 800,
        color: C.text, textAlign: "center", lineHeight: 1.25,
        opacity: calcDim(1758, frame, 0.32).op,
      }}>
        減少 <span style={{ color: C.red }}>≠</span> 消失
      </div>
      <ReductionBar reducedAt={1818} remainAt={1896} />
      <div style={{ display: "flex", gap: 18 * S }}>
        <HabitChip icon="🔍" label="查來源" entranceAt={1758} activeAt={2028} />
        <HabitChip icon="🧠" label="多方驗證" entranceAt={1758} activeAt={2028} />
        <HabitChip icon="⚠️" label="保持警覺" entranceAt={1758} activeAt={2100} />
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_29.scene2.to - SCENES_2026_05_29.scene2.from;
  const A_FADE_START = 1564;
  const A_REMOVE = 1644;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= A_REMOVE;
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="STORY 02 — GPT-5.5 INSTANT" delay={6} color={C.orange} />}
            sentence={<StageSentence text="ChatGPT 換上幻覺少一半的新預設模型" delay={14} />}
            takeaway={<StageTakeaway text="醫療、法律、財務這類事實題，捏造機率明顯下降" delay={1104} color={C.orange} />}
          >
            <Scene2HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="AI 素養提醒 — REALITY CHECK" delay={1650} color={C.orange} />}
          sentence={<StageSentence text="準確度大幅提升，但「減少」不是「消除」" delay={1658} />}
          takeaway={<StageTakeaway text="遇到要準確資訊的問題，還是要養成查來源的習慣" delay={2028} color={C.orange} />}
        >
          <Scene2HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — GEMINI 3.5 FLASH ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function ModelCompareCard({ name, tier, score, bright, color, activeAt }: {
  name: string; tier: string; score: number; bright: boolean; color: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  const grow = interpolate(Math.max(0, frame - activeAt), [0, 32], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  return (
    <div style={{
      opacity: op, width: 300 * S,
      background: C.surface, border: `1px solid ${bright && isOn ? color + "66" : C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${18 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", gap: 10 * S,
      boxShadow: bright && isOn ? `0 0 ${40 * S}px ${color}22` : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: bright ? C.text : C.textSub }}>{name}</span>
        <span style={{
          fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
          color: bright ? color : C.muted, letterSpacing: "0.06em",
          background: bright && isOn ? `${color}1a` : "transparent",
          border: bright && isOn ? `1px solid ${color}55` : "1px solid transparent",
          borderRadius: 8 * S, padding: `${3 * S}px ${10 * S}px`,
        }}>{tier}</span>
      </div>
      <div style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.04em" }}>代碼 + 代理任務</div>
      <div style={{ height: 16 * S, background: "rgba(255,255,255,0.06)", borderRadius: 8 * S, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${score * grow * 100}%`,
          background: color, borderRadius: 8 * S,
          boxShadow: bright && isOn ? `0 0 ${10 * S}px ${color}88` : "none",
        }} />
      </div>
    </div>
  );
}

function Scene3HeroA() {
  const frame = useCurrentFrame();
  const arrowOp = interpolate(Math.max(0, frame - 900), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
      {/* I/O badge */}
      <div style={{
        opacity: calcDim(168, frame, 0.32).op,
        display: "flex", alignItems: "center", gap: 12 * S,
        background: C.surface, border: `1px solid ${C.blueBorder}`,
        borderRadius: 14 * S, padding: `${8 * S}px ${20 * S}px`,
        boxShadow: `0 0 ${20 * S}px ${C.blue}1a`,
      }}>
        <span style={{ fontSize: 24 * S }}>📡</span>
        <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: C.text }}>
          Google I/O 發布 · Gemini 3.5 系列第一個正式版
        </span>
      </div>
      {/* model vs model */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 * S }}>
        <ModelCompareCard name="Gemini 3.5 Flash" tier="快 · 低成本" score={0.92} bright color={C.blue} activeAt={786} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S, opacity: arrowOp }}>
          <span style={{ fontSize: 30 * S, color: C.blue }}>{'>'}</span>
          <span style={{
            fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
            color: C.blue, letterSpacing: "0.08em", textTransform: "uppercase" as const,
          }}>SURPASS</span>
        </div>
        <ModelCompareCard name="Gemini 3.1 Pro" tier="上一代旗艦" score={0.78} bright={false} color={C.muted} activeAt={918} />
      </div>
      {/* punchline strip */}
      <div style={{
        opacity: calcDim(1074, frame, 0.32).op,
        display: "flex", alignItems: "center", gap: 14 * S,
        background: C.surface, border: `1px solid ${C.blueBorder}`,
        borderRadius: 16 * S, padding: `${12 * S}px ${24 * S}px`,
        boxShadow: `0 0 ${28 * S}px ${C.blue}1a`,
      }}>
        <span style={{ fontSize: 26 * S }}>⚡</span>
        <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: C.text }}>
          快速版本 → 拿到超過以前旗艦版的答題水準
        </span>
      </div>
    </div>
  );
}

// Phase B — speed/quality trade-off broken + Managed Agents
function TradeoffQuadrant() {
  const frame = useCurrentFrame();
  const W_Q = 480 * S, H_Q = 220 * S;
  const flashOldOp = calcDim(1422, frame, 0.34).op;
  const proOldOp = calcDim(1542, frame, 0.34).op;
  const flashNewOp = calcDim(1656, frame, 0.0).op;
  const flashNewScale = easeOutBack(prog(Math.max(0, frame - 1656), 22));
  return (
    <div style={{ position: "relative", width: W_Q, height: H_Q }}>
      {/* axes */}
      <div style={{
        position: "absolute", left: 30 * S, bottom: 30 * S, top: 30 * S, width: 2 * S,
        background: C.surfaceBorder,
      }} />
      <div style={{
        position: "absolute", left: 30 * S, right: 30 * S, bottom: 30 * S, height: 2 * S,
        background: C.surfaceBorder,
      }} />
      {/* axis labels */}
      <div style={{
        position: "absolute", left: 30 * S, top: 0,
        fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
        color: C.muted, letterSpacing: "0.04em",
      }}>↑ 質量</div>
      <div style={{
        position: "absolute", right: 0, bottom: 0,
        fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
        color: C.muted, letterSpacing: "0.04em",
      }}>速度 →</div>
      {/* old Flash: bottom-right (fast, low quality) */}
      <div style={{
        position: "absolute", left: W_Q - 130 * S, top: H_Q - 130 * S,
        width: 100 * S, height: 70 * S, opacity: flashOldOp,
        background: C.surface, border: `1px dashed ${C.muted}`,
        borderRadius: 12 * S, padding: `${6 * S}px ${10 * S}px`,
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
      }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 18 * S, fontWeight: 700, color: C.muted }}>舊 Flash</span>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, marginTop: 2 * S }}>快但有上限</span>
      </div>
      {/* old Pro: top-left (slow, high quality) */}
      <div style={{
        position: "absolute", left: 50 * S, top: 60 * S,
        width: 100 * S, height: 70 * S, opacity: proOldOp,
        background: C.surface, border: `1px dashed ${C.muted}`,
        borderRadius: 12 * S, padding: `${6 * S}px ${10 * S}px`,
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
      }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 18 * S, fontWeight: 700, color: C.muted }}>舊 Pro</span>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, marginTop: 2 * S }}>準但慢且貴</span>
      </div>
      {/* new 3.5 Flash: top-right (fast AND high quality) */}
      <div style={{
        position: "absolute", left: W_Q - 170 * S, top: 50 * S,
        width: 140 * S, height: 86 * S, opacity: flashNewOp,
        transform: `scale(${Math.max(0.9, Math.min(1, flashNewScale))})`,
        background: C.surface, border: `${2 * S}px solid ${C.blue}`,
        borderRadius: 14 * S, padding: `${8 * S}px ${10 * S}px`,
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        boxShadow: `0 0 ${30 * S}px ${C.blue}33`,
      }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 18 * S, fontWeight: 800, color: C.blue }}>3.5 Flash</span>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.text, marginTop: 2 * S, textAlign: "center" }}>
          又快又準
        </span>
      </div>
      {/* ripple on breakthrough position */}
      {frame >= 1656 && frame < 1700 && (
        <div style={{
          position: "absolute", left: W_Q - 170 * S, top: 50 * S,
          width: 140 * S, height: 86 * S,
        }}>
          <RippleRing activeAt={1656} color={C.blue} radius={14 * S} />
        </div>
      )}
    </div>
  );
}

function AgentFeatureChip({ icon, label, activeAt, entranceAt }: { icon: string; label: string; activeAt: number; entranceAt: number }) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      display: "flex", alignItems: "center", gap: 10 * S, width: 280 * S,
      background: C.surface, border: `1px solid ${isOn ? C.blueBorder : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${10 * S}px ${16 * S}px`,
    }}>
      <span style={{ fontSize: 24 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: isOn ? C.text : C.textSub, flex: 1 }}>{label}</span>
    </div>
  );
}

function Scene3HeroB() {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      <div style={{ display: "flex", alignItems: "center", gap: 40 * S }}>
        <TradeoffQuadrant />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 * S }}>
          <div style={{
            opacity: calcDim(1752, frame, 0.32).op,
            display: "flex", alignItems: "center", gap: 12 * S,
            background: C.surface, border: `1px solid ${C.blueBorder}`,
            borderRadius: 14 * S, padding: `${10 * S}px ${20 * S}px`,
            boxShadow: `0 0 ${20 * S}px ${C.blue}1a`,
          }}>
            <span style={{ fontSize: 24 * S }}>🏗️</span>
            <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 800, color: C.blue, letterSpacing: "0.04em" }}>Managed Agents</span>
          </div>
          <AgentFeatureChip icon="🏝️" label="隔離的遠端環境" entranceAt={1752} activeAt={1836} />
          <AgentFeatureChip icon="📂" label="自主管理檔案" entranceAt={1752} activeAt={1938} />
          <AgentFeatureChip icon="🌐" label="自主瀏覽網頁" entranceAt={1752} activeAt={1938} />
          <AgentFeatureChip icon="🛠️" label="省去自架基礎設施" entranceAt={1752} activeAt={2058} />
        </div>
      </div>
      {/* common direction tagline */}
      <div style={{
        opacity: calcDim(2208, frame, 0.32).op,
        display: "flex", alignItems: "center", gap: 12 * S,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 16 * S, padding: `${12 * S}px ${24 * S}px`,
      }}>
        <span style={{ fontSize: 22 * S, color: C.primary }}>↗</span>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text }}>
          大平台共同方向：讓 AI 代理人長時間自主完成複雜任務
        </span>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_29.scene3.to - SCENES_2026_05_29.scene3.from;
  const A_FADE_START = 1258;
  const A_REMOVE = 1338;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= A_REMOVE;
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="STORY 03 — GEMINI 3.5 FLASH" delay={6} color={C.blue} />}
            sentence={<StageSentence text="快模型，第一次達到旗艦等級的推理能力" delay={14} />}
            takeaway={<StageTakeaway text="用快速版本，拿到超過上一代旗艦的代碼與代理任務水準" delay={1158} color={C.blue} />}
          >
            <Scene3HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="打破取捨 + MANAGED AGENTS" delay={1344} color={C.blue} />}
          sentence={<StageSentence text="速度跟質量的取捨，正在被一起兼得" delay={1352} />}
          takeaway={<StageTakeaway text="Claude 的 Dynamic Workflows、Google 的 Managed Agents 走向一致" delay={2208} color={C.blue} />}
        >
          <Scene3HeroB />
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
      width: 1080 * S, opacity: op,
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 6 * S }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 22 * S, color: accent }}>{index}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 24 * S, color: isOn ? C.text : C.textSub }}>{title}</span>
        </div>
        <div style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_29.summary.to - SCENES_2026_05_29.summary.from;
  const eyebrowFade = useFadeIn(6);
  const headFade = useFadeUp(14);
  const outroFade = useFadeUp(1092);
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
          ...headFade, margin: `${10 * S}px 0 ${28 * S}px`,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 34 * S, color: C.text, textAlign: "center",
        }}>本週三件 AI 大事</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 * S }}>
          <RecapCard index="01" icon="🧠" title="Claude Opus 4.8 · Dynamic Workflows" accent={C.primary} activeAt={90}
            body="AI 可以自己協調上百個子代理人並行作業——但授權邊界要設清楚。" />
          <RecapCard index="02" icon="💬" title="GPT-5.5 Instant · 幻覺 -52.5%" accent={C.orange} activeAt={420}
            body="ChatGPT 新預設模型；準確度大幅提升，但「減少」不是「消除」，還是要查來源。" />
          <RecapCard index="03" icon="⚡" title="Gemini 3.5 Flash · 取捨打破" accent={C.blue} activeAt={756}
            body="以 Flash 的成本拿到超越舊旗艦的推理能力；同時推出 Managed Agents 平台。" />
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

export const VideoComposition_2026_05_29: React.FC = () => {
  const frame = useCurrentFrame();
  const Sx = SCENES_2026_05_29;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-05-29-processed.wav")} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f, [TOTAL_FRAMES_2026_05_29 - 150, TOTAL_FRAMES_2026_05_29], [v, 0],
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
