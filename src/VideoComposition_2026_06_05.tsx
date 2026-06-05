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
// TitleScene:  0s        → 0     本週 AI 大事：權力轉移（3 故事預告）
// Scene1:      42.64s    → 1279  Anthropic 估值超車 OpenAI + 申請上市
// Scene2:      137.76s   → 4133  微軟 Build 2026 第一批自研模型
// Scene3:      234.24s   → 7027  OpenAI 模型退休 + 世代交替加速
// Summary:     318.76s   → 9563  重點整理
// End:         401.28s(audio) → 12060
export const SCENES_2026_06_05 = {
  title: { from: 0, to: 1279 },
  scene1: { from: 1279, to: 4133 },
  scene2: { from: 4133, to: 7027 },
  scene3: { from: 7027, to: 9563 },
  summary: { from: 9563, to: 12060 },
} as const;
export const TOTAL_FRAMES_2026_06_05 = 12060;

const CHAPTERS = [
  { label: "本週焦點", start: 0 },
  { label: "Anthropic 上市", start: 1279 },
  { label: "微軟自研模型", start: 4133 },
  { label: "模型換代", start: 7027 },
  { label: "重點整理", start: 9563 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 3855, to: 4133, sender: "想一想", text: "如果你常用的 AI 工具公司上市、開始對股東負責，你覺得它的免費功能和定價會怎麼變？" },
  { from: 6760, to: 7027, sender: "親身經歷", text: "你有發現過同一個 AI 工具，這週的回答品質跟上週不太一樣嗎？背後的模型可能已經悄悄換了。" },
  { from: 9300, to: 9563, sender: "想一想", text: "你的工作流程或提示詞，有沒有『焊死』在某一個特定模型上？它退休那天會出問題嗎？" },
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

// ── shared ValuationCard ─────────────────────────────────────────────────────
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
      boxShadow: glow && isOn ? `0 0 ${50 * S}px ${accent}33` : "none", minWidth: 290 * S,
    }}>
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>{label}</span>
      <div style={{
        fontFamily: F_HEAD, fontWeight: 800, fontSize: (big ? 52 : 44) * S, color: accent,
        lineHeight: 1, textShadow: isOn ? `0 0 ${24 * S}px ${accent}66` : "none",
      }}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function StoryChip({ icon, title, sub, accent, activeAt }: {
  icon: string; title: string; sub: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  const sc = isOn ? easeOutBack(prog(Math.max(0, frame - activeAt), 22)) : 0.9;
  return (
    <div style={{
      width: 290 * S, opacity: op, transform: `scale(${Math.max(0.9, Math.min(1, sc))})`,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${20 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
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
        fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: isOn ? C.text : C.textSub,
        textAlign: "center", lineHeight: 1.2,
      }}>{title}</span>
      <span style={{
        fontFamily: F_TC, fontSize: 18 * S, color: C.textSub,
        textAlign: "center", lineHeight: 1.3,
      }}>{sub}</span>
    </div>
  );
}

function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_05.title.to - SCENES_2026_06_05.title.from;
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
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 46 * S, color: C.text,
        }}>
          <WordReveal text="本週 AI 大事：三巨頭洗牌" startFrame={10} staggerPerWord={6}
            fontSize={46 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 32 * S, color: C.primary,
        }}>
          <WordReveal text="你的工具正在換代" startFrame={28} staggerPerWord={6}
            fontSize={32 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 22 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          一個關鍵字形容這週：<span style={{ color: C.primary, fontWeight: 700 }}>權力轉移</span>
        </p>

        {/* three story preview chips — light up as narrator previews each */}
        <div style={{ ...rowStyle, marginTop: 36 * S, display: "flex", gap: 26 * S, justifyContent: "center" }}>
          <StoryChip icon="🏛️" title="Anthropic" sub="估值超車、申請上市" accent={C.primary} activeAt={420} />
          <StoryChip icon="🪟" title="微軟" sub="第一批自研模型" accent={C.blue} activeAt={600} />
          <StoryChip icon="👋" title="OpenAI" sub="替舊模型辦退休" accent={C.orange} activeAt={869} />
        </div>

        <div style={{ ...tagStyle, marginTop: 28 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>IPO · 自研模型 · 模型換代加速</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — ANTHROPIC 估值超車 OpenAI + 申請上市 ──────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function Scene1HeroA() {
  const frame = useCurrentFrame();
  const secret = calcDim(0, frame, 0.32);
  const overtake = calcDim(475, frame, 0.0);
  const crown = calcDim(855, frame, 0.32);
  const engine = calcDim(1308, frame, 0.32);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * S }}>
      {/* secret SEC filing badge */}
      <div style={{
        opacity: secret.op, display: "flex", alignItems: "center", gap: 12 * S,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${8 * S}px ${20 * S}px`,
      }}>
        <span style={{ fontSize: 24 * S }}>🔒</span>
        <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, fontWeight: 500 }}>向美國 SEC 秘密遞交上市申請　·　最快今年秋天掛牌</span>
      </div>
      {/* valuation race: OpenAI 8,520億 → Anthropic 9,650億 */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 * S }}>
        <ValuationCard label="OpenAI 估值" value="8,520 億" brightAt={324} accent={C.textSub} />
        <div style={{
          opacity: overtake.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
        }}>
          <span style={{ fontSize: 38 * S, color: C.primary }}>↗</span>
          <span style={{
            fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.primary,
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 10 * S, padding: `${4 * S}px ${12 * S}px`, whiteSpace: "nowrap" as const,
          }}>首次超車</span>
        </div>
        <ValuationCard label="Anthropic 估值" value="9,650 億" brightAt={475} accent={C.primary} big glow />
      </div>
      {/* crown chip */}
      <div style={{
        opacity: crown.op, display: "flex", alignItems: "center", gap: 12 * S,
        background: C.surface, border: `1px solid ${crown.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${9 * S}px ${22 * S}px`,
        boxShadow: crown.isOn ? `0 0 ${24 * S}px ${C.primary}1f` : "none",
      }}>
        <span style={{ fontSize: 26 * S }}>👑</span>
        <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: crown.isOn ? C.text : C.textSub }}>全世界估值最高的 AI 新創</span>
      </div>
      {/* growth engine strip */}
      <div style={{
        opacity: engine.op, display: "flex", alignItems: "center", gap: 16 * S,
        background: C.surface, border: `1px solid ${engine.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 16 * S, padding: `${12 * S}px ${24 * S}px`,
      }}>
        <span style={{ fontSize: 28 * S }}>🛠️</span>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: engine.isOn ? C.text : C.textSub }}>成長引擎 <span style={{ color: C.primary }}>Claude Code</span></span>
        <span style={{ fontSize: 22 * S, color: C.muted }}>·</span>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500, color: C.textSub }}>Q2 營收約 <span style={{ fontFamily: F_HEAD, fontWeight: 800, color: C.primary }}>109 億</span> 美元</span>
      </div>
    </div>
  );
}

// Phase B — IPO impact on users
function ImpactColumn({ titleIcon, title, accent, items, headAt, items_at }: {
  titleIcon: string; title: string; accent: string;
  items: string[]; headAt: number; items_at: number[];
}) {
  const frame = useCurrentFrame();
  const head = calcDim(headAt, frame, 0.32);
  return (
    <div style={{
      width: 520 * S, opacity: head.op,
      background: accent === C.primary ? C.primaryLight : C.orangeLight,
      border: `1px solid ${head.isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${20 * S}px ${24 * S}px`,
      display: "flex", flexDirection: "column", gap: 14 * S,
      boxShadow: head.isOn ? `0 0 ${30 * S}px ${accent}1f` : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
        <span style={{ fontSize: 30 * S }}>{titleIcon}</span>
        <span style={{
          fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: accent, letterSpacing: "0.04em",
        }}>{title}</span>
      </div>
      {items.map((it, i) => {
        const a = calcDim(items_at[i], frame, 0.3);
        return (
          <div key={i} style={{
            opacity: a.op, display: "flex", alignItems: "center", gap: 12 * S,
          }}>
            <span style={{ color: accent, fontSize: 22 * S, fontWeight: 700, flexShrink: 0 }}>{accent === C.primary ? "✓" : "⚠"}</span>
            <span style={{ fontFamily: F_TC, fontSize: 21 * S, color: a.isOn ? C.text : C.textSub, lineHeight: 1.35 }}>{it}</span>
          </div>
        );
      })}
    </div>
  );
}

function Scene1HeroB({ goodAt, cautionAt }: { goodAt: number; cautionAt: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
      {/* IPO node */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14 * S,
        background: C.surface, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 18 * S, padding: `${12 * S}px ${28 * S}px`,
        boxShadow: `0 0 ${30 * S}px ${C.primaryGlow}`,
      }}>
        <span style={{ fontSize: 34 * S }}>🏛️</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color: C.text }}>準備上市 <span style={{ color: C.primary }}>IPO</span></span>
      </div>
      {/* two impact columns */}
      <div style={{ display: "flex", gap: 28 * S, alignItems: "stretch" }}>
        <ImpactColumn titleIcon="📈" title="好處" accent={C.primary} headAt={goodAt}
          items={["公開財務、面對更嚴格監督", "產品穩定性通常會跟著提高"]}
          items_at={[goodAt, goodAt + 60]} />
        <ImpactColumn titleIcon="💼" title="提醒" accent={C.orange} headAt={cautionAt}
          items={["背後是一門越來越大的生意", "定價與功能取捨受商業壓力影響"]}
          items_at={[cautionAt, cautionAt + 60]} />
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_05.scene1.to - SCENES_2026_06_05.scene1.from;
  // local = global - 1279. Phase B 第一句「這對我們一般使用者代表什麼」111.84→3355, local 2076
  const A_FADE_START = 1996;
  const A_REMOVE = 2076;
  const B_SHOW_AT = 2076;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0;     // g1279 先說第一件，Anthropic 秘密遞交上市
  const VAL_AT = 475;      // g1754 估值 9650 億超越 OpenAI
  const WHY_AT = 1159;     // g2438 為什麼漲這麼快？關鍵賺錢能力
  const ENGINE_AT = 1308;  // g2587 Claude Code、Q2 營收 109 億
  const BOTTOM_AT = 1776;  // g3055 AI 不再只是玩具

  // Phase B captions (local)
  const GOOD_AT = 2076;    // g3355 公開財務、監督、穩定性
  const CAUTION_AT = 2462; // g3741 但也提醒：商業壓力影響定價功能

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="STORY 01 — ANTHROPIC" delay={6} />}
            sentence={
              frame >= ENGINE_AT
                ? <StageSentence text="成長引擎是 Claude Code——幫你寫、改程式" delay={ENGINE_AT} fontSize={26 * S} />
                : frame >= WHY_AT
                ? <StageSentence text="為什麼漲這麼快？關鍵是賺錢能力" delay={WHY_AT} />
                : frame >= VAL_AT
                ? <StageSentence text="9,650 億美元，首次超車 OpenAI" delay={VAL_AT} />
                : <StageSentence text="Claude 開發商 Anthropic 申請上市" delay={HEADER_AT} />
            }
            takeaway={<StageTakeaway text="AI 不再只是聊天玩具，而是真的有人付錢的生產力工具" delay={BOTTOM_AT} />}
          >
            <Scene1HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="對使用者的意義 — IMPACT" delay={B_SHOW_AT} />}
          sentence={
            frame >= CAUTION_AT
              ? <StageSentence text="但別忘了：它背後是一門越來越大的生意" delay={CAUTION_AT} fontSize={26 * S} color={C.orange} />
              : <StageSentence text="準備上市 → 公開財務、受更嚴格監督" delay={B_SHOW_AT} />
          }
          takeaway={<StageTakeaway text="監督讓產品更穩定，但定價與功能也會受商業壓力影響" delay={CAUTION_AT} color={C.orange} />}
        >
          <Scene1HeroB goodAt={GOOD_AT} cautionAt={CAUTION_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 微軟 BUILD 2026 第一批自研模型 ────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function ModelCard({ name, kind, icon, accent, bullets, brightAt, bulletAt }: {
  name: string; kind: string; icon: string; accent: string;
  bullets: string[]; brightAt: number; bulletAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(brightAt, frame, 0.3);
  return (
    <div style={{
      width: 520 * S, opacity: op, position: "relative",
      background: C.surface, border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${20 * S}px ${24 * S}px`,
      display: "flex", flexDirection: "column", gap: 12 * S,
      boxShadow: isOn ? `0 0 ${36 * S}px ${accent}1f` : "none",
    }}>
      {isOn && <RippleRing activeAt={brightAt} color={accent} radius={22 * S} />}
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
        <div style={{
          width: 64 * S, height: 64 * S, borderRadius: 16 * S, flexShrink: 0,
          background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 * S,
        }}>{icon}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 * S }}>
          <span style={{ fontFamily: F_HEAD, fontSize: 25 * S, fontWeight: 800, color: isOn ? C.text : C.textSub }}>{name}</span>
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: accent, letterSpacing: "0.04em" }}>{kind}</span>
        </div>
      </div>
      {bullets.map((b, i) => {
        const a = calcDim(bulletAt + i * 6, frame, 0.32);
        return (
          <div key={i} style={{ opacity: a.op, display: "flex", alignItems: "center", gap: 10 * S }}>
            <span style={{ color: accent, fontSize: 20 * S, flexShrink: 0 }}>▸</span>
            <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: a.isOn ? C.text : C.textSub, lineHeight: 1.3 }}>{b}</span>
          </div>
        );
      })}
    </div>
  );
}

function Scene2HeroA({ badgeAt, card1At, card2At }: { badgeAt: number; card1At: number; card2At: number }) {
  const frame = useCurrentFrame();
  const badge = calcDim(badgeAt, frame, 0.32);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * S }}>
      {/* fully self-trained badge */}
      <div style={{
        opacity: badge.op, display: "flex", alignItems: "center", gap: 12 * S,
        background: C.surface, border: `1px solid ${badge.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${9 * S}px ${22 * S}px`,
        boxShadow: badge.isOn ? `0 0 ${24 * S}px ${C.primary}1f` : "none",
      }}>
        <span style={{ fontSize: 24 * S }}>🚫</span>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: badge.isOn ? C.text : C.textSub }}>完全自研　·　<span style={{ color: C.primary }}>沒有用到 OpenAI 技術</span></span>
      </div>
      {/* two models */}
      <div style={{ display: "flex", gap: 28 * S, alignItems: "stretch" }}>
        <ModelCard name="MAI-Thinking-1" kind="推理模型" icon="🧠" accent={C.primary}
          bullets={["從頭用授權資料訓練，沒蒸餾第三方", "編程能力追平 Claude Opus 4.6"]}
          brightAt={card1At} bulletAt={card1At + 30} />
        <ModelCard name="MAI-Code-1-Flash" kind="小型寫程式模型" icon="⚡" accent={C.blue}
          bullets={["主打省 token、跑得快", "已推送到所有 GitHub Copilot 方案"]}
          brightAt={card2At} bulletAt={card2At + 30} />
      </div>
    </div>
  );
}

// Phase B — 不再綁 OpenAI + 模型悄悄替換
function Basket({ label, eggs, accent, activeAt }: { label: string; eggs: string; accent: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, width: 300 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 18 * S, padding: `${16 * S}px ${20 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
      boxShadow: isOn ? `0 0 ${26 * S}px ${accent}1f` : "none",
    }}>
      <span style={{ fontSize: 40 * S }}>🧺</span>
      <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
      <span style={{ fontSize: 26 * S }}>{eggs}</span>
    </div>
  );
}

function Scene2HeroB({ insuranceAt, literacyAt }: { insuranceAt: number; literacyAt: number }) {
  const frame = useCurrentFrame();
  const note = calcDim(insuranceAt + 60, frame, 0.0);
  const prodHead = calcDim(literacyAt, frame, 0.32);
  const weekA = calcDim(literacyAt + 40, frame, 0.3);
  const weekB = calcDim(literacyAt + 100, frame, 0.3);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
      {/* don't put all eggs in one basket */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 * S }}>
        <Basket label="OpenAI" eggs="🥚" accent={C.blue} activeAt={insuranceAt} />
        <span style={{ fontSize: 30 * S, color: C.primary }}>＋</span>
        <Basket label="微軟自研模型" eggs="🥚🥚" accent={C.primary} activeAt={insuranceAt + 30} />
      </div>
      <div style={{
        opacity: note.op, fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.primary,
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 12 * S, padding: `${7 * S}px ${20 * S}px`,
      }}>🛡️ 不再把所有雞蛋放在同一個籃子裡</div>
      {/* AI literacy — model swaps silently */}
      <div style={{
        opacity: prodHead.op, display: "flex", alignItems: "center", gap: 16 * S,
        background: C.surface, border: `1px solid ${prodHead.isOn ? C.orangeBorder : C.surfaceBorder}`,
        borderRadius: 16 * S, padding: `${12 * S}px ${22 * S}px`,
      }}>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text }}>📦 同一個 AI 產品</span>
        <span style={{
          opacity: weekA.op, fontFamily: F_BODY, fontSize: 19 * S, fontWeight: 700, color: C.textSub,
          background: C.surface2, borderRadius: 10 * S, padding: `${6 * S}px ${14 * S}px`,
        }}>上週：模型 A</span>
        <span style={{ fontSize: 24 * S, color: C.orange }}>→</span>
        <span style={{
          opacity: weekB.op, fontFamily: F_BODY, fontSize: 19 * S, fontWeight: 700, color: C.orange,
          background: C.orangeLight, border: `1px solid ${C.orangeBorder}`, borderRadius: 10 * S, padding: `${6 * S}px ${14 * S}px`,
        }}>本週：模型 B</span>
        <span style={{ opacity: weekB.op, fontFamily: F_TC, fontSize: 19 * S, color: C.orange, fontWeight: 700 }}>悄悄替換</span>
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_05.scene2.to - SCENES_2026_06_05.scene2.from;
  // local = global - 4133. Phase B 第一句「為什麼這件事重要」196.48→5894, local 1761
  const A_FADE_START = 1681;
  const A_REMOVE = 1761;
  const B_SHOW_AT = 1761;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0;    // g4133 微軟發表第一批完全自研模型
  const CARD1_AT = 415;   // g4548 第一個 MAI-Thinking-1
  const CARD2_AT = 835;   // g4968 追平 4.6、第二個 MAI-Code-1-Flash

  // Phase B captions (local)
  const INSURANCE_AT = 1761; // g5894 多買保險、不把雞蛋放同一籃
  const LITERACY_AT = 2267;  // g6400 AI 素養：模型會悄悄替換

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="STORY 02 — MICROSOFT" delay={6} color={C.blue} />}
            sentence={
              frame >= CARD2_AT
                ? <StageSentence text="MAI-Code-1-Flash：上 Copilot 的小模型" delay={CARD2_AT} fontSize={26 * S} color={C.blue} />
                : frame >= CARD1_AT
                ? <StageSentence text="MAI-Thinking-1：微軟第一個推理模型" delay={CARD1_AT} fontSize={26 * S} />
                : <StageSentence text="微軟發表第一批完全自研的模型" delay={HEADER_AT} />
            }
            takeaway={<StageTakeaway text="編程能力追平 Claude Opus 4.6，而且沒用任何 OpenAI 技術" delay={CARD2_AT} color={C.blue} />}
          >
            <Scene2HeroA badgeAt={HEADER_AT} card1At={CARD1_AT} card2At={CARD2_AT} />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="為什麼重要 — WHY IT MATTERS" delay={B_SHOW_AT} color={C.blue} />}
          sentence={
            frame >= LITERACY_AT
              ? <StageSentence text="同一個產品，背後的模型會悄悄替換" delay={LITERACY_AT} color={C.orange} />
              : <StageSentence text="微軟不再把雞蛋全押在 OpenAI 身上" delay={B_SHOW_AT} />
          }
          takeaway={<StageTakeaway text="與其死記哪個模型最強，不如養成測試、看結果的習慣" delay={LITERACY_AT} color={C.orange} />}
        >
          <Scene2HeroB insuranceAt={INSURANCE_AT} literacyAt={LITERACY_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — OPENAI 模型退休 + 世代交替加速 ───────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function RetireCard({ name, date, note, activeAt, entranceAt }: {
  name: string; date: string; note: string; activeAt: number; entranceAt: number;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op, width: 420 * S,
      background: C.surface, border: `1px solid ${isOn ? C.redBorder : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${14 * S}px ${20 * S}px`,
      display: "flex", alignItems: "center", gap: 14 * S,
    }}>
      <span style={{ fontSize: 30 * S, filter: isOn ? "none" : "grayscale(1)" }}>🪦</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 * S, flex: 1 }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 23 * S, fontWeight: 800, color: isOn ? C.text : C.textSub }}>{name}</span>
        <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.textSub }}>{note}</span>
      </div>
      <span style={{
        fontFamily: F_BODY, fontSize: 19 * S, fontWeight: 700, color: isOn ? C.red : C.muted,
        background: C.redLight, borderRadius: 10 * S, padding: `${5 * S}px ${12 * S}px`, whiteSpace: "nowrap" as const,
      }}>{date} 下線</span>
    </div>
  );
}

function RiseCard({ name, note, accent, activeAt, entranceAt }: {
  name: string; note: string; accent: string; activeAt: number; entranceAt: number;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op, width: 420 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${14 * S}px ${20 * S}px`,
      display: "flex", alignItems: "center", gap: 14 * S,
      boxShadow: isOn ? `0 0 ${26 * S}px ${accent}1f` : "none",
    }}>
      <span style={{ fontSize: 30 * S, color: accent }}>↑</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 * S, flex: 1 }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 23 * S, fontWeight: 800, color: isOn ? C.text : C.textSub }}>{name}</span>
        <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.textSub }}>{note}</span>
      </div>
    </div>
  );
}

function Scene3HeroA({ gpt45At, shortAt, gpt5At, geminiAt }: {
  gpt45At: number; shortAt: number; gpt5At: number; geminiAt: number;
}) {
  return (
    <div style={{ display: "flex", gap: 40 * S, alignItems: "flex-start", justifyContent: "center" }}>
      {/* retirements */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S }}>
        <span style={{
          fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.red,
          letterSpacing: "0.12em", textTransform: "uppercase" as const,
        }}>退役 RETIRE</span>
        <RetireCard name="GPT-4.5" date="6/27" note="2 月才登場，僅 4 個月" activeAt={gpt45At} entranceAt={0} />
        <RetireCard name="推理模型 o3" date="8/26" note="OpenAI 另一個推理模型" activeAt={gpt5At} entranceAt={0} />
      </div>
      {/* rising */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S }}>
        <span style={{
          fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.primary,
          letterSpacing: "0.12em", textTransform: "uppercase" as const,
        }}>接棒 RISING</span>
        <RiseCard name="GPT-5 系列" note="各項重要指標全面超越" accent={C.primary} activeAt={gpt5At} entranceAt={0} />
        <RiseCard name="Gemini 3.5 Flash" note="高水準＋速度與低成本" accent={C.blue} activeAt={geminiAt} entranceAt={0} />
      </div>
    </div>
  );
}

// Phase B — generations accelerating + don't weld workflow to one model
function LifeBar({ label, widthPct, accent, activeAt }: {
  label: string; widthPct: number; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  const grow = interpolate(Math.max(0, frame - activeAt), [0, 26], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  return (
    <div style={{ opacity: op, display: "flex", alignItems: "center", gap: 16 * S, width: 880 * S }}>
      <span style={{ fontFamily: F_BODY, fontSize: 19 * S, fontWeight: 500, color: C.textSub, width: 150 * S, textAlign: "right" as const, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 40 * S, background: "rgba(255,255,255,0.05)", borderRadius: 10 * S, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${widthPct * grow * 100}%`,
          background: accent, borderRadius: 10 * S,
          boxShadow: isOn ? `0 0 ${20 * S}px ${accent}44` : "none",
        }} />
      </div>
    </div>
  );
}

function Scene3HeroB({ trendAt, weldAt }: { trendAt: number; weldAt: number }) {
  const frame = useCurrentFrame();
  const lead = calcDim(trendAt, frame, 0.32);
  const weldHead = calcDim(weldAt, frame, 0.32);
  const promptNote = calcDim(weldAt + 60, frame, 0.0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
      {/* shrinking lifespan bars */}
      <div style={{
        opacity: lead.op, fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text,
      }}>模型壽命正在快速縮短 ↓</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 * S }}>
        <LifeBar label="幾年前" widthPct={1.0} accent={C.textSub} activeAt={trendAt} />
        <LifeBar label="現在" widthPct={0.22} accent={C.orange} activeAt={trendAt + 50} />
      </div>
      <div style={{
        opacity: lead.op, fontFamily: F_TC, fontSize: 19 * S, color: C.textSub,
      }}>一個模型從登場到被淘汰，可能短到 <span style={{ color: C.orange, fontWeight: 700 }}>只有幾個月</span></div>
      {/* warning: welded workflow */}
      <div style={{
        opacity: weldHead.op, display: "flex", alignItems: "center", gap: 14 * S,
        background: C.surface, border: `1px solid ${weldHead.isOn ? C.orangeBorder : C.surfaceBorder}`,
        borderRadius: 16 * S, padding: `${12 * S}px ${24 * S}px`,
        boxShadow: weldHead.isOn ? `0 0 ${26 * S}px ${C.orange}1f` : "none",
      }}>
        <span style={{ fontSize: 30 * S }}>🔧</span>
        <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: weldHead.isOn ? C.text : C.textSub }}>別把工作流程「<span style={{ color: C.orange }}>焊死</span>」在單一模型上</span>
        <span style={{
          opacity: promptNote.op, fontFamily: F_TC, fontSize: 19 * S, color: C.orange, fontWeight: 700,
          background: C.orangeLight, border: `1px solid ${C.orangeBorder}`, borderRadius: 10 * S, padding: `${6 * S}px ${14 * S}px`,
        }}>依賴特性的提示詞會壞掉</span>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_05.scene3.to - SCENES_2026_06_05.scene3.from;
  // local = global - 7027. Phase B 第一句「把這幾件事放一起看」291.88→8756, local 1729
  const A_FADE_START = 1649;
  const A_REMOVE = 1729;
  const B_SHOW_AT = 1729;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0;   // g7027 GPT-4.5 將 6/27 下線
  const SHORT_AT = 507;  // g7534 才上線 4 個月就退休
  const GPT5_AT = 897;   // g7924 GPT-5 全面超越，o3 8/26 下線
  const GEMINI_AT = 1253; // g8280 Gemini 3.5 Flash 上線

  // Phase B captions (local)
  const TREND_AT = 1729; // g8756 趨勢：世代交替加速
  const WELD_AT = 2089;  // g9116 別把工作流程焊死在特定模型

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="STORY 03 — OPENAI" delay={6} color={C.orange} />}
            sentence={
              frame >= GEMINI_AT
                ? <StageSentence text="同時 Gemini 3.5 Flash 上線，維持高水準" delay={GEMINI_AT} fontSize={26 * S} color={C.blue} />
                : frame >= GPT5_AT
                ? <StageSentence text="GPT-5 全面超越，o3 也排定 8/26 下線" delay={GPT5_AT} fontSize={26 * S} />
                : frame >= SHORT_AT
                ? <StageSentence text="GPT-4.5 才上線 4 個月就要退休" delay={SHORT_AT} />
                : <StageSentence text="OpenAI 宣布：GPT-4.5 將在 6/27 下線" delay={HEADER_AT} color={C.orange} />
            }
            takeaway={<StageTakeaway text="登場才 4 個月就退休——新模型一出，舊的很快被替換" delay={GPT5_AT} color={C.orange} />}
          >
            <Scene3HeroA gpt45At={HEADER_AT} shortAt={SHORT_AT} gpt5At={GPT5_AT} geminiAt={GEMINI_AT} />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="趨勢與提醒 — THE TREND" delay={B_SHOW_AT} color={C.orange} />}
          sentence={
            frame >= WELD_AT
              ? <StageSentence text="別把工作流程「焊死」在單一模型上" delay={WELD_AT} color={C.orange} />
              : <StageSentence text="趨勢：模型世代交替正在加速" delay={B_SHOW_AT} />
          }
          takeaway={<StageTakeaway text="依賴某模型特性的提示詞，等它退休那天就會出問題" delay={WELD_AT} color={C.orange} />}
        >
          <Scene3HeroB trendAt={TREND_AT} weldAt={WELD_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SUMMARY SCENE ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function RecapCard({ index, icon, title, body, accent, activeAt, top }: {
  index: string; icon: string; title: string; body: string; accent: string; activeAt: number; top: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.28);
  return (
    <div style={{
      position: "absolute", left: STAGE_LEFT, right: STAGE_LEFT, top,
      opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${18 * S}px ${28 * S}px`,
      display: "flex", alignItems: "center", gap: 22 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${accent}1f` : "none",
    }}>
      <div style={{
        width: 76 * S, height: 76 * S, borderRadius: "50%", flexShrink: 0,
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 * S,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 4 * S }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 22 * S, color: accent }}>{index}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 24 * S, color: isOn ? C.text : C.textSub }}>{title}</span>
        </div>
        <div style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, lineHeight: 1.4 }}>{body}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_05.summary.to - SCENES_2026_06_05.summary.from;
  // local = global - 9563
  const BADGE_AT = 0;     // g9563 好，來快速回顧
  const CARD1_AT = 90;    // g9653 第一 Anthropic
  const CARD2_AT = 476;   // g10039 第二 微軟
  const CARD3_AT = 1012;  // g10575 第三 OpenAI
  const HABIT_AT = 1549;  // g11112 最後送你一個小習慣：並排比較
  const OUTRO_AT = 2269;  // g11832 掰掰

  const badgeStyle = useFadeIn(BADGE_AT);
  const habit = calcDim(HABIT_AT, frame, 0.28);
  const outroStyle = useFadeIn(OUTRO_AT);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ paddingTop: CONTENT_TOP + 8 * S }}>
        <div style={{
          ...badgeStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 * S,
        }}>
          <span style={{
            width: 10 * S, height: 10 * S, borderRadius: "50%", background: C.primary,
            opacity: eyebrowPulse, boxShadow: `0 0 ${10 * S}px ${C.primary}`,
          }} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary, letterSpacing: "0.04em" }}>
            <WordReveal text="本週三件大事" startFrame={4} staggerPerWord={5}
              fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
          </span>
        </div>
      </AbsoluteFill>

      <RecapCard index="01" icon="🏛️" title="Anthropic 超車上市" accent={C.primary} activeAt={CARD1_AT} top={330}
        body="以 9,650 億美元估值申請上市，史上第一次超車 OpenAI——AI 變成全世界最值錢的生意之一。" />
      <RecapCard index="02" icon="🪟" title="微軟自研模型" accent={C.blue} activeAt={CARD2_AT} top={620}
        body="Build 2026 推出 MAI-Thinking-1 與 MAI-Code-1-Flash，第一次擺脫對 OpenAI 的依賴。" />
      <RecapCard index="03" icon="👋" title="模型換代加速" accent={C.orange} activeAt={CARD3_AT} top={910}
        body="OpenAI 讓上線才四個月的 GPT-4.5 退休、Gemini 3.5 Flash 上線——別把流程焊死在單一模型上。" />

      {/* actionable habit */}
      <div style={{
        position: "absolute", left: STAGE_LEFT, right: STAGE_LEFT, top: 1230,
        opacity: habit.op,
        background: C.surface, border: `1px solid ${habit.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 20 * S, padding: `${18 * S}px ${28 * S}px`,
        display: "flex", alignItems: "center", gap: 20 * S,
        boxShadow: habit.isOn ? `0 0 ${50 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontSize: 38 * S }}>🧪</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 4 * S }}>今天就能用的小習慣</div>
          <div style={{ fontFamily: F_TC, fontSize: 21 * S, color: C.text, fontWeight: 500, lineHeight: 1.4 }}>挑一個沒用過的模型，拿同一個問題問新舊兩邊，<span style={{ color: C.primary, fontWeight: 700 }}>並排比較</span>回答。</div>
        </div>
      </div>

      <div style={{ ...outroStyle, position: "absolute", left: 0, right: 0, top: 1600, textAlign: "center" }}>
        <span style={{ fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 500, color: C.textSub }}>
          這裡是<span style={{ color: C.primary, fontWeight: 700 }}>每日 AI 知識庫</span>，我們明天見 👋
        </span>
      </div>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── ROOT COMPOSITION ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export const VideoComposition_2026_06_05: React.FC = () => {
  const frame = useCurrentFrame();
  const Sx = SCENES_2026_06_05;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-06-05-processed.wav")} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f, [TOTAL_FRAMES_2026_06_05 - 150, TOTAL_FRAMES_2026_06_05], [v, 0],
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
