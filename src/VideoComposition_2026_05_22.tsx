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
const F_HEAD = "'Syne','Noto Sans TC',sans-serif"; // headings / titles / big numbers
const F_BODY = "'DM Sans','Noto Sans TC',sans-serif"; // body / labels / eyebrows / takeaways
const F_TC = "'Noto Sans TC', sans-serif"; // CJK-heavy body sentences

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
// TitleScene:  0s        → 0     本週 AI 大事（3 故事預告）
// Scene1:      19.96s    → 599   Gemini Spark — 24/7 雲端 AI 代理人
// Scene2:      121.28s   → 3638  OpenAI 準備秘密提交 IPO
// Scene3:      209.56s   → 6287  SynthID — AI 內容看不見的浮水印
// Summary:     316.96s   → 9509  重點整理
// End:         361.84s   → 10855（+buffer → 10870）
export const SCENES_2026_05_22 = {
  title: { from: 0, to: 599 },
  scene1: { from: 599, to: 3638 },
  scene2: { from: 3638, to: 6287 },
  scene3: { from: 6287, to: 9509 },
  summary: { from: 9509, to: 10870 },
} as const;
export const TOTAL_FRAMES_2026_05_22 = 10870;

const CHAPTERS = [
  { label: "本週焦點", start: 0 },
  { label: "Gemini Spark", start: 599 },
  { label: "OpenAI IPO", start: 3638 },
  { label: "AI 浮水印", start: 6287 },
  { label: "重點整理", start: 9509 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 3378, to: 3638, sender: "想一想", text: "如果有 AI 代理人能在你睡覺時繼續工作，你最想讓它做什麼？你願意給它付款的權限嗎？" },
  { from: 5999, to: 6287, sender: "想一想", text: "當你最常用的 AI 工具公司要對股東負責，你覺得對產品的發展方向會有什麼影響？" },
  { from: 9162, to: 9509, sender: "想一想", text: "你現在能分辨一張圖是不是 AI 生成的嗎？如果每張 AI 圖都有看不見的標記，這樣就夠了嗎？" },
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

// dim (0.30) → bright (1) tied to a VTT cue (scene-local frame)
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

function StoryChip({ icon, title, accent, activeAt }: {
  icon: string; title: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  const sc = isOn ? easeOutBack(prog(Math.max(0, frame - activeAt), 22)) : 0.9;
  return (
    <div style={{
      width: 280 * S, opacity: op, transform: `scale(${Math.max(0.9, Math.min(1, sc))})`,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${20 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${accent}22` : "none",
      position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 80 * S, height: 80 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 * S,
        boxShadow: isOn ? `0 0 ${20 * S}px ${accent}55` : "none",
      }}>{icon}</div>
      <span style={{
        fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: isOn ? C.text : C.textSub,
        textAlign: "center", lineHeight: 1.25,
      }}>{title}</span>
    </div>
  );
}

function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_22.title.to - SCENES_2026_05_22.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(36);
  const tagStyle = useFadeUp(52);
  const rowStyle = useFadeUp(120);
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
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 32 * S, color: C.primary,
        }}>
          <WordReveal text="三件你不能錯過的事" startFrame={28} staggerPerWord={6}
            fontSize={32 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 22 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          Gemini Spark 全天候工作 · OpenAI 準備上市 · AI 內容有了浮水印
        </p>

        {/* three story preview chips — light up as narrator previews each */}
        <div style={{ ...rowStyle, marginTop: 40 * S, display: "flex", gap: 28 * S, justifyContent: "center" }}>
          <StoryChip icon="🤖" title="Gemini Spark" accent={C.primary} activeAt={157} />
          <StoryChip icon="📈" title="OpenAI IPO" accent={C.orange} activeAt={293} />
          <StoryChip icon="🔏" title="AI 浮水印" accent={C.blue} activeAt={499} />
        </div>

        <div style={{ ...tagStyle, marginTop: 30 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>AI 代理人 · IPO · SynthID 浮水印</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — GEMINI SPARK (24/7 雲端 AI 代理人) ────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// pulsing always-on agent orb
function AgentOrb() {
  const frame = useCurrentFrame();
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.06);
  const ringRot = (frame * 1.1) % 360;
  return (
    <div style={{ position: "relative", width: 230 * S, height: 230 * S, flexShrink: 0 }}>
      {/* 24/7 rotating ring */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: `${3 * S}px dashed ${C.primary}`, opacity: 0.5,
        transform: `rotate(${ringRot}deg)`,
      }} />
      {/* glow halo */}
      <div style={{
        position: "absolute", inset: 24 * S, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,255,178,0.25) 0%, transparent 70%)",
        opacity: 0.6 + 0.4 * pulse,
      }} />
      {/* core */}
      <div style={{
        position: "absolute", inset: 38 * S, borderRadius: "50%",
        background: "rgba(124,255,178,0.12)", border: `${2 * S}px solid ${C.primary}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 6 * S, boxShadow: `0 0 ${(28 + pulse * 18) * S}px rgba(124,255,178,0.4)`,
      }}>
        <span style={{ fontSize: 56 * S }}>🤖</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 18 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.05em" }}>Gemini Spark</span>
      </div>
      {/* 24/7 badge */}
      <div style={{
        position: "absolute", top: -6 * S, right: -6 * S,
        background: C.primary, color: C.bg, fontFamily: F_HEAD, fontWeight: 800,
        fontSize: 20 * S, borderRadius: 12 * S, padding: `${4 * S}px ${12 * S}px`,
        boxShadow: `0 0 ${16 * S}px ${C.primary}88`,
      }}>24/7</div>
    </div>
  );
}

function CapabilityRow({ icon, label, activeAt, entranceAt, accent = C.primary }: {
  icon: string; label: string; activeAt: number; entranceAt: number; accent?: string;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.55);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      display: "flex", alignItems: "center", gap: 14 * S, width: 460 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${14 * S}px ${18 * S}px`,
      boxShadow: isOn ? `0 0 ${28 * S}px ${accent}1f` : "none", position: "relative",
    }}>
      <div style={{
        width: 56 * S, height: 56 * S, borderRadius: 14 * S, flexShrink: 0,
        background: `${accent}1a`, border: `1px solid ${accent}66`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 * S,
      }}>{icon}</div>
      <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function Scene1HeroA() {
  const frame = useCurrentFrame();
  // devices-off strip lighting
  const deviceDim = calcDim(698, frame, 0.3);
  const cloudOn = calcDim(863, frame, 0.3);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * S }}>
      {/* main row: orb + capabilities */}
      <div style={{ display: "flex", alignItems: "center", gap: 50 * S }}>
        <AgentOrb />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 * S }}>
          <CapabilityRow icon="📧" label="寄信給它的 Gmail 下指令" entranceAt={40} activeAt={1021} />
          <CapabilityRow icon="🌐" label="用 Chrome 瀏覽網頁、採取行動" entranceAt={40} activeAt={1152} />
          <CapabilityRow icon="💳" label="在你設的預算內代你付款" entranceAt={40} activeAt={1152} accent={C.orange} />
        </div>
      </div>
      {/* devices-off → cloud strip */}
      <div style={{
        display: "flex", alignItems: "center", gap: 18 * S,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 18 * S, padding: `${14 * S}px ${24 * S}px`,
      }}>
        <div style={{ opacity: deviceDim.op, display: "flex", alignItems: "center", gap: 10 * S }}>
          <span style={{ fontSize: 30 * S, filter: "grayscale(1)" }}>💻</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.muted }}>電腦關機</span>
          <span style={{ fontSize: 28 * S, marginLeft: 8 * S, filter: "grayscale(1)" }}>📱</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.muted }}>手機鎖屏</span>
        </div>
        <span style={{ fontSize: 26 * S, color: C.primary }}>→</span>
        <div style={{
          opacity: cloudOn.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 12 * S, padding: `${8 * S}px ${16 * S}px`,
        }}>
          <span style={{ fontSize: 30 * S }}>☁️</span>
          <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.primary }}>雲端持續執行任務</span>
        </div>
      </div>
    </div>
  );
}

// Phase B — permission boundary
function BoundaryRule({ icon, label, activeAt, entranceAt, accent }: {
  icon: string; label: string; activeAt: number; entranceAt: number; accent: string;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      width: 380 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 18 * S, padding: `${20 * S}px ${18 * S}px`,
      boxShadow: isOn ? `0 0 ${30 * S}px ${accent}1f` : "none",
    }}>
      <div style={{
        width: 70 * S, height: 70 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 * S,
      }}>{icon}</div>
      <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: isOn ? C.text : C.textSub, textAlign: "center", lineHeight: 1.3 }}>{label}</span>
    </div>
  );
}

function Scene1HeroB() {
  const frame = useCurrentFrame();
  // agent inside a permission boundary frame; boundary draws in at 2271 (設定權限邊界)
  const boundIn = interpolate(Math.max(0, frame - 2271), [0, 30], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * S }}>
      {/* boundary box around mini agent */}
      <div style={{
        position: "relative", padding: `${22 * S}px ${40 * S}px`,
        border: `${3 * S}px dashed ${C.primary}`, borderRadius: 22 * S,
        opacity: 0.4 + 0.6 * boundIn,
        display: "flex", alignItems: "center", gap: 18 * S,
        background: "rgba(124,255,178,0.04)",
      }}>
        <span style={{ fontSize: 44 * S }}>🤖</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: C.text }}>AI 代理人的權限邊界</span>
        <div style={{
          position: "absolute", top: -16 * S, left: "50%", transform: "translateX(-50%)",
          background: C.bg, padding: `0 ${12 * S}px`,
          fontFamily: F_BODY, fontSize: 18 * S, color: C.primary, letterSpacing: "0.1em",
          textTransform: "uppercase" as const, opacity: boundIn,
        }}>permission boundary</div>
      </div>
      {/* three boundary rules */}
      <div style={{ display: "flex", gap: 22 * S, justifyContent: "center" }}>
        <BoundaryRule icon="🚧" label="它能做什麼、不能做什麼" entranceAt={2069} activeAt={2271} accent={C.primary} />
        <BoundaryRule icon="💰" label="花多少錢，要先問你" entranceAt={2069} activeAt={2384} accent={C.orange} />
        <BoundaryRule icon="👔" label="像授權一個員工去辦事" entranceAt={2069} activeAt={2639} accent={C.blue} />
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_22.scene1.to - SCENES_2026_05_22.scene1.from;
  const A_FADE_START = 1989;
  const A_REMOVE = 2069;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= A_REMOVE;
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="STORY 01 — GEMINI SPARK" delay={6} />}
            sentence={<StageSentence text="24 小時全天候幫你做事的個人 AI 代理人" delay={14} />}
            takeaway={<StageTakeaway text="你不在時把事情做完——早上看到的是結果，不是半成品" delay={1543} />}
          >
            <Scene1HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="重要提醒 — PERMISSIONS" delay={2069} color={C.orange} />}
          sentence={<StageSentence text="它能做什麼，要由你清楚設定邊界" delay={2077} />}
          takeaway={<StageTakeaway text="授權一個 24/7 的 AI 代理人＝和讓員工辦事一樣的責任" delay={2384} color={C.orange} />}
        >
          <Scene1HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — OPENAI IPO (估值 / 股東壓力) ──────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function ValuationCard({ label, value, brightAt, accent, big, glow }: {
  label: string; value: string; brightAt: number; accent: string; big?: boolean; glow?: boolean;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(brightAt, frame, 0.32);
  return (
    <div style={{
      opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${16 * S}px ${28 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
      boxShadow: glow && isOn ? `0 0 ${50 * S}px ${accent}33` : "none", minWidth: 270 * S,
    }}>
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>{label}</span>
      <div style={{
        fontFamily: F_HEAD, fontWeight: 800, fontSize: (big ? 52 : 44) * S, color: accent,
        lineHeight: 1, textShadow: isOn ? `0 0 ${24 * S}px ${accent}66` : "none",
      }}>{value}</div>
    </div>
  );
}

function CompBar({ name, heightPct, activeAt, highlight }: {
  name: string; heightPct: number; activeAt: number; highlight?: boolean;
}) {
  const frame = useCurrentFrame();
  const { op } = calcDim(activeAt, frame, 0.3);
  const grow = interpolate(Math.max(0, frame - activeAt), [0, 28], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  const maxH = 100 * S;
  return (
    <div style={{ opacity: op, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S }}>
      <div style={{ height: maxH, width: 76 * S, display: "flex", alignItems: "flex-end" }}>
        <div style={{
          width: "100%", height: maxH * heightPct * grow,
          background: highlight ? C.orange : "rgba(240,240,245,0.2)",
          border: `1px solid ${highlight ? C.orangeBorder : C.surfaceBorder}`,
          borderRadius: `${8 * S}px ${8 * S}px 0 0`,
          boxShadow: highlight ? `0 0 ${24 * S}px ${C.orange}33` : "none",
        }} />
      </div>
      <span style={{
        fontFamily: F_BODY, fontSize: 18 * S, fontWeight: highlight ? 700 : 500,
        color: highlight ? C.orange : C.textSub, whiteSpace: "nowrap" as const,
      }}>{name}</span>
    </div>
  );
}

function Scene2HeroA() {
  const frame = useCurrentFrame();
  const secretIn = calcDim(74, frame, 0.32);
  const arrowOp = interpolate(Math.max(0, frame - 960), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const compLabel = calcDim(1082, frame, 0.32);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S }}>
      {/* secret filing badge */}
      <div style={{
        opacity: secretIn.op, display: "flex", alignItems: "center", gap: 12 * S,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${8 * S}px ${18 * S}px`,
      }}>
        <span style={{ fontSize: 24 * S }}>🔒</span>
        <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, fontWeight: 500 }}>秘密提交申請文件給美國證管會 (SEC)，目標 9 月掛牌</span>
      </div>
      {/* valuation: 8520億 → 1兆+ */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 * S }}>
        <ValuationCard label="最近一輪融資估值" value="8,520 億" brightAt={747} accent={C.text} />
        <span style={{ fontSize: 40 * S, color: C.orange, opacity: arrowOp }}>→</span>
        <ValuationCard label="IPO 預估上看" value="1 兆 +" brightAt={960} accent={C.orange} big glow />
      </div>
      {/* comparison bars */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S }}>
        <span style={{
          opacity: compLabel.op, fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em",
        }}>史上最大科技 IPO 之一（美元計）</span>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24 * S }}>
          <CompBar name="OpenAI" heightPct={1.0} activeAt={1082} highlight />
          <CompBar name="Google" heightPct={0.42} activeAt={1209} />
          <CompBar name="Meta" heightPct={0.34} activeAt={1209} />
          <CompBar name="Amazon" heightPct={0.22} activeAt={1209} />
        </div>
      </div>
    </div>
  );
}

// Phase B — shareholder balance
function BalanceScale() {
  const frame = useCurrentFrame();
  // beam tilts toward shareholders (left, heavier) at 1832
  const tilt = interpolate(Math.max(0, frame - 1832), [0, 36], [0, -9], { easing: E.outCubic, extrapolateRight: "clamp" });
  const beamLen = 460 * S;
  return (
    <div style={{ position: "relative", width: 560 * S, height: 240 * S }}>
      {/* fulcrum */}
      <div style={{
        position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)",
        width: 0, height: 0, borderLeft: `${28 * S}px solid transparent`,
        borderRight: `${28 * S}px solid transparent`, borderBottom: `${70 * S}px solid ${C.surface2}`,
      }} />
      <div style={{
        position: "absolute", left: "50%", bottom: 64 * S, transform: "translateX(-50%)",
        width: 24 * S, height: 24 * S, borderRadius: "50%", background: C.primary,
        boxShadow: `0 0 ${12 * S}px ${C.primary}`, zIndex: 3,
      }} />
      {/* beam */}
      <div style={{
        position: "absolute", left: "50%", bottom: 76 * S,
        width: beamLen, height: 8 * S, background: C.text, borderRadius: 4 * S,
        transform: `translateX(-50%) rotate(${tilt}deg)`, transformOrigin: "center", zIndex: 2,
      }}>
        {/* left pan: shareholders (heavier) */}
        <div style={{
          position: "absolute", left: -10 * S, top: 4 * S,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
          transform: `rotate(${-tilt}deg)`,
        }}>
          <div style={{
            background: C.orangeLight, border: `1px solid ${C.orangeBorder}`, borderRadius: 14 * S,
            padding: `${10 * S}px ${16 * S}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
          }}>
            <span style={{ fontSize: 30 * S }}>📊</span>
            <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: C.orange, whiteSpace: "nowrap" as const }}>股東 · 在乎獲利</span>
          </div>
        </div>
        {/* right pan: users */}
        <div style={{
          position: "absolute", right: -10 * S, top: 4 * S,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
          transform: `rotate(${-tilt}deg)`,
        }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 14 * S,
            padding: `${10 * S}px ${16 * S}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
          }}>
            <span style={{ fontSize: 30 * S }}>🧑‍💻</span>
            <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: C.textSub, whiteSpace: "nowrap" as const }}>使用者 · 安全與功能</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImpactChip({ icon, label, activeAt, entranceAt }: { icon: string; label: string; activeAt: number; entranceAt: number }) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      width: 320 * S, display: "flex", alignItems: "center", gap: 12 * S,
      background: C.surface, border: `1px solid ${isOn ? C.orangeBorder : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${12 * S}px ${16 * S}px`,
      boxShadow: isOn ? `0 0 ${24 * S}px ${C.orange}1f` : "none",
    }}>
      <span style={{ fontSize: 28 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function Scene2HeroB() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
      <BalanceScale />
      <div style={{ display: "flex", gap: 20 * S, justifyContent: "center" }}>
        <ImpactChip icon="🏷️" label="未來產品的定價" entranceAt={1347} activeAt={2069} />
        <ImpactChip icon="🔒" label="哪些功能留給付費" entranceAt={1347} activeAt={2162} />
        <ImpactChip icon="⚖️" label="安全 vs 快速成長的取捨" entranceAt={1347} activeAt={2226} />
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_22.scene2.to - SCENES_2026_05_22.scene2.from;
  const A_FADE_START = 1267;
  const A_REMOVE = 1347;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= A_REMOVE;
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="STORY 02 — OPENAI IPO" delay={6} color={C.orange} />}
            sentence={<StageSentence text="OpenAI 準備秘密提交上市申請" delay={14} />}
            takeaway={<StageTakeaway text="估值上看 1 兆美元——史上最大的科技 IPO 之一" delay={1082} color={C.orange} />}
          >
            <Scene2HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="對使用者的意義 — IMPACT" delay={1347} color={C.orange} />}
          sentence={<StageSentence text="上市後，股東壓力會影響產品決策" delay={1355} />}
          takeaway={<StageTakeaway text="定價、付費功能、安全與成長的取捨都可能被重新權衡" delay={2069} color={C.orange} />}
        >
          <Scene2HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — SYNTHID (AI 內容看不見的浮水印) ───────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function AdoptionChip({ name, activeAt, entranceAt }: { name: string; activeAt: number; entranceAt: number }) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 700, color: isOn ? C.text : C.textSub,
      background: C.surface, border: `1px solid ${isOn ? C.blueBorder : C.surfaceBorder}`,
      borderRadius: 12 * S, padding: `${9 * S}px ${18 * S}px`,
      boxShadow: isOn ? `0 0 ${20 * S}px ${C.blue}1f` : "none",
    }}>{name}</div>
  );
}

// media frame with sweeping scanner revealing a hidden mark
function MediaScanner() {
  const frame = useCurrentFrame();
  const embedded = calcDim(933, frame, 0.0); // mark embedded
  const detected = calcDim(1004, frame, 0.0); // machine detects
  const sweep = (frame % 90) / 90; // continuous scan
  const FW = 250 * S, FH = 156 * S;
  return (
    <div style={{
      position: "relative", width: FW, height: FH, borderRadius: 18 * S, overflow: "hidden",
      background: "linear-gradient(135deg, #1a2540 0%, #2a1a40 50%, #401a2a 100%)",
      border: `1px solid ${C.surfaceBorder}`, flexShrink: 0,
    }}>
      {/* fake image content */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 70 * S, opacity: 0.5 }}>🖼️</div>
      {/* hidden watermark mark — invisible-ish until detected */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 6 * S,
        opacity: 0.06 + 0.9 * detected.op,
      }}>
        <div style={{
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 24 * S, color: C.primary,
          background: "rgba(9,9,15,0.7)", borderRadius: 10 * S, padding: `${6 * S}px ${14 * S}px`,
          border: `1px solid ${C.primaryBorder}`, textShadow: `0 0 ${16 * S}px ${C.primary}`,
        }}>✓ AI · SynthID</div>
      </div>
      {/* scan line */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: `${sweep * 100}%`, width: 4 * S,
        background: `linear-gradient(to bottom, transparent, ${C.primary}, transparent)`,
        boxShadow: `0 0 ${14 * S}px ${C.primary}`, opacity: 0.8,
      }} />
      {/* embedding label */}
      <div style={{
        position: "absolute", bottom: 8 * S, left: 8 * S, opacity: embedded.op,
        fontFamily: F_BODY, fontSize: 18 * S, color: C.primary,
        background: "rgba(9,9,15,0.8)", borderRadius: 8 * S, padding: `${4 * S}px ${10 * S}px`,
      }}>嵌入肉眼看不見的標記</div>
    </div>
  );
}

function RobustnessBadge({ icon, label, activeAt, entranceAt }: { icon: string; label: string; activeAt: number; entranceAt: number }) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      display: "flex", alignItems: "center", gap: 10 * S, width: 240 * S,
      background: C.surface, border: `1px solid ${isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 12 * S, padding: `${9 * S}px ${14 * S}px`,
    }}>
      <span style={{ fontSize: 24 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: isOn ? C.text : C.textSub, fontWeight: 500, flex: 1 }}>{label}</span>
      <span style={{ color: C.primary, fontSize: 20 * S, fontWeight: 700, opacity: isOn ? 1 : 0.3 }}>✓</span>
    </div>
  );
}

function ScaleStat({ label, value, unit, brightAt }: {
  label: string; value: string; unit: string; brightAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(brightAt, frame, 0.32);
  return (
    <div style={{
      opacity: op, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 * S,
      background: C.surface, border: `1px solid ${isOn ? C.blueBorder : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${12 * S}px ${24 * S}px`, minWidth: 250 * S,
    }}>
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted }}>{label}</span>
      <div style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 34 * S, color: C.blue, lineHeight: 1 }}>{value}</div>
      <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.textSub }}>{unit}</span>
    </div>
  );
}

function Scene3HeroA() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S }}>
      {/* adoption row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 * S, flexWrap: "wrap" as const, justifyContent: "center" }}>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>業界採用：</span>
        <AdoptionChip name="OpenAI" entranceAt={60} activeAt={379} />
        <AdoptionChip name="NVIDIA" entranceAt={60} activeAt={379} />
        <AdoptionChip name="ElevenLabs" entranceAt={60} activeAt={379} />
        <span style={{ fontSize: 22 * S, color: C.muted }}>+</span>
        <AdoptionChip name="Chrome · Search" entranceAt={60} activeAt={560} />
      </div>
      {/* scanner + robustness 2x2 */}
      <div style={{ display: "flex", alignItems: "center", gap: 30 * S }}>
        <MediaScanner />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 * S }}>
          <RobustnessBadge icon="✂️" label="被裁切" entranceAt={379} activeAt={1117} />
          <RobustnessBadge icon="🎨" label="加了濾鏡" entranceAt={379} activeAt={1117} />
          <RobustnessBadge icon="🗜️" label="被壓縮" entranceAt={379} activeAt={1117} />
          <RobustnessBadge icon="📸" label="重新截圖" entranceAt={379} activeAt={1232} />
        </div>
      </div>
      {/* scale stats */}
      <div style={{ display: "flex", gap: 22 * S }}>
        <ScaleStat label="已標記" value="1,000 億 +" unit="張圖片與影片" brightAt={1367} />
        <ScaleStat label="已標記" value="6 萬年" unit="份量的音訊" brightAt={1523} />
      </div>
    </div>
  );
}

// Phase B — coverage gap
function CoverageZone({ icon, title, mark, ok, activeAt, entranceAt }: {
  icon: string; title: string; mark: string; ok: boolean; activeAt: number; entranceAt: number;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  const accent = ok ? C.primary : C.red;
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      width: 380 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
      background: ok ? C.primaryLight : C.redLight,
      border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 18 * S, padding: `${18 * S}px ${20 * S}px`,
      boxShadow: isOn ? `0 0 ${28 * S}px ${accent}22` : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
        <span style={{ fontSize: 30 * S }}>{icon}</span>
        <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{title}</span>
      </div>
      <div style={{
        fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: accent,
        display: "flex", alignItems: "center", gap: 8 * S,
      }}>
        <span>{ok ? "✓" : "✕"}</span><span>{mark}</span>
      </div>
    </div>
  );
}

function LimitChip({ icon, label, activeAt, entranceAt }: { icon: string; label: string; activeAt: number; entranceAt: number }) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      display: "flex", alignItems: "center", gap: 10 * S,
      background: C.surface, border: `1px solid ${isOn ? C.blueBorder : C.surfaceBorder}`,
      borderRadius: 12 * S, padding: `${10 * S}px ${18 * S}px`,
    }}>
      <span style={{ fontSize: 24 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function Scene3HeroB() {
  const frame = useCurrentFrame();
  // problem → solution mini row
  const probIn = calcDim(1857, frame, 0.32);
  const arrowOp = interpolate(Math.max(0, frame - 2027), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const solIn = calcDim(2027, frame, 0.32);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      {/* deepfake problem → SynthID solution */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 * S }}>
        <div style={{
          opacity: probIn.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 14 * S,
          padding: `${10 * S}px ${18 * S}px`,
        }}>
          <span style={{ fontSize: 28 * S }}>🕵️</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text }}>深偽越來越難辨識</span>
        </div>
        <span style={{ fontSize: 30 * S, color: C.primary, opacity: arrowOp }}>→</span>
        <div style={{
          opacity: solIn.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 14 * S,
          padding: `${10 * S}px ${18 * S}px`,
        }}>
          <span style={{ fontSize: 28 * S }}>🏷️</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.primary }}>在源頭打上標記</span>
        </div>
      </div>
      {/* coverage zones */}
      <div style={{ display: "flex", gap: 24 * S }}>
        <CoverageZone icon="✅" title="有接入的工具" mark="內容有標記" ok entranceAt={1653} activeAt={2349} />
        <CoverageZone icon="⚠️" title="沒接入的工具" mark="仍然沒有標記" ok={false} entranceAt={1653} activeAt={2522} />
      </div>
      {/* limitations */}
      <div style={{ display: "flex", gap: 18 * S }}>
        <LimitChip icon="🔍" label="需專門工具才能查驗" entranceAt={1653} activeAt={2649} />
        <LimitChip icon="👁️" label="不是一看就知道" entranceAt={1653} activeAt={2777} />
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_22.scene3.to - SCENES_2026_05_22.scene3.from;
  const A_FADE_START = 1573;
  const A_REMOVE = 1653;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= A_REMOVE;
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="STORY 03 — SYNTHID" delay={6} color={C.blue} />}
            sentence={<StageSentence text="AI 生成內容開始有看不見的浮水印" delay={14} />}
            takeaway={<StageTakeaway text="裁切、濾鏡、壓縮、截圖都洗不掉的隱形標記，機器才偵測得到" delay={1059} color={C.blue} />}
          >
            <Scene3HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="為什麼重要 — REALITY CHECK" delay={1653} color={C.blue} />}
          sentence={<StageSentence text="辨識 AI 內容的重要一步，但有極限" delay={1661} />}
          takeaway={<StageTakeaway text="只標記有接入的工具，且還需要專門工具才能查驗" delay={2349} color={C.blue} />}
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
      width: 540 * S, opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${26 * S}px`,
      display: "flex", alignItems: "center", gap: 20 * S,
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
        <div style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, lineHeight: 1.45 }}>{body}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_22.summary.to - SCENES_2026_05_22.summary.from;
  const eyebrowFade = useFadeIn(6);
  const headFade = useFadeUp(14);
  const outroFade = useFadeUp(1213);
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
          <RecapCard index="01" icon="🤖" title="Gemini Spark" accent={C.primary} activeAt={73}
            body="24/7 在雲端幫你跑任務的 AI 代理人，電腦關機它還在——但行動權限要謹慎設定。" />
          <RecapCard index="02" icon="📈" title="OpenAI IPO" accent={C.orange} activeAt={451}
            body="準備秘密提交上市申請，估值可能破兆；上市後股東壓力恐影響產品決策，值得持續關注。" />
          <RecapCard index="03" icon="🔏" title="SynthID 浮水印" accent={C.blue} activeAt={799}
            body="AI 內容看不見的浮水印跨業界採用，是辨識 AI 的重要一步，但仍有覆蓋範圍的限制。" />
        </div>

        <div style={{ ...outroFade, marginTop: 30 * S, display: "flex", alignItems: "center", gap: 12 * S }}>
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

export const VideoComposition_2026_05_22: React.FC = () => {
  const frame = useCurrentFrame();
  const Sx = SCENES_2026_05_22;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-05-22-processed.wav")} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f, [TOTAL_FRAMES_2026_05_22 - 150, TOTAL_FRAMES_2026_05_22], [v, 0],
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
