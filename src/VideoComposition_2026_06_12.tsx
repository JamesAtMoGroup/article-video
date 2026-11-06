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
// Title:   0s       → 0      本週 AI 大事（三大公司同時出招）
// Scene1:  40.88s   → 1226   Claude Fable 5 — 最強又開放 + 安全護欄
// Scene2:  167.6s   → 5028   ChatGPT 做夢記憶 — 自動更新 + 記憶來源
// Scene3:  283.44s  → 8503   Gemini 全能 — Omni / Deep Think + 判斷力底線
// Summary: 389.0s   → 11670  重點整理 + 小練習
// End:     472.36s(audio) → 14190
export const SCENES_2026_06_12 = {
  title: { from: 0, to: 1226 },
  scene1: { from: 1226, to: 5028 },
  scene2: { from: 5028, to: 8503 },
  scene3: { from: 8503, to: 11670 },
  summary: { from: 11670, to: 14190 },
} as const;
export const TOTAL_FRAMES_2026_06_12 = 14190;

const CHAPTERS = [
  { label: "本週焦點", start: 0 },
  { label: "Claude Fable 5", start: 1226 },
  { label: "ChatGPT 做夢記憶", start: 5028 },
  { label: "Gemini 全能", start: 8503 },
  { label: "重點整理", start: 11670 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene1「這裡先想一想」151.50s → 4545，到 scene1 結束 5028
  { from: 4545, to: 5028, sender: "想一想", text: "如果 AI 會在敏感問題上偷偷換一顆比較保守的模型回答你，你希望它明確告訴你嗎？還是只要答得好就無所謂？" },
  // Scene2「再想一想」266.92s → 8008，到 scene2 結束 8503
  { from: 8008, to: 8503, sender: "想一想", text: "如果 ChatGPT 能自動記住、並更新關於你的一切，你會覺得貼心，還是有點不安？你多久會檢查一次它記得你什麼？" },
  // Scene3「最後想一想」372.96s → 11189，到 scene3 結束 11670
  { from: 11189, to: 11670, sender: "想一想", text: "當一個工具號稱文字圖片聲音影片全包，你會把更多分散的工作集中過去嗎？集中之後又有哪些風險，得先想清楚？" },
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

// dim → bright tied to a VTT cue (scene-local frame). Present-dim from scene start.
function calcActive(activeAt: number, frame: number, dim = 0.28) {
  const f = Math.max(0, frame - activeAt);
  const t = interpolate(f, [0, 22], [dim, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return { op: Math.max(dim, Math.min(1, t)), isOn: frame >= activeAt };
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
              fontFamily: F_BODY,
              fontSize: 18 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.02em",
            }}>{c.sender}</span>
            <span style={{
              fontFamily: F_BODY,
              fontSize: 18 * S, color: C.muted, letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
            }}>now</span>
          </div>
          <div style={{
            fontFamily: F_TC,
            fontSize: 18 * S, color: C.textSub, lineHeight: 1.5,
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
  const a = useFadeIn(delay);
  return (
    <div style={{ ...a, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S }}>
      <span style={{
        width: 8 * S, height: 8 * S, borderRadius: "50%", background: color,
        boxShadow: `0 0 ${8 * S}px ${color}`, flexShrink: 0,
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
      fontWeight: 700, lineHeight: 1.35, maxWidth: 620 * S, margin: "0 auto",
      fontSize, color, wordBreak: "break-word" as const,
    }}>{text}</div>
  );
}

// StageTakeaway — dim → bright (0.28 → 1.0)，禁止 useFadeUp pop-in（鐵律）
function StageTakeaway({ text, delay, color = C.primary }: { text: string; delay: number; color?: string }) {
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

function StoryChip({ icon, title, accent, activeAt }: {
  icon: string; title: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(activeAt, frame, 0.32);
  const sc = isOn ? easeOutBack(prog(Math.max(0, frame - activeAt), 22)) : 0.9;
  return (
    <div style={{
      width: 300 * S, opacity: op, transform: `scale(${Math.max(0.9, Math.min(1, sc))})`,
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
  const dur = SCENES_2026_06_12.title.to - SCENES_2026_06_12.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(36);
  const tagStyle = useFadeUp(52);
  const rowStyle = useFadeUp(150);

  // VTT (title-local = global):
  // Anthropic 15.9→477 | OpenAI 19.5→585 | Gemini 24.52→736
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
            boxShadow: `0 0 ${8 * S}px ${C.primary}`,
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
          <WordReveal text="本週 AI 大事" startFrame={10} staggerPerWord={6}
            fontSize={46 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary,
        }}>
          <WordReveal text="三大公司同時出招" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 22 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          你手上的 AI，正在變得更強、更懂你，也更全能
        </p>

        {/* three story preview chips — light up as narrator previews each */}
        <div style={{ ...rowStyle, marginTop: 40 * S, display: "flex", gap: 28 * S, justifyContent: "center" }}>
          <StoryChip icon="🚀" title="Claude Fable 5" accent={C.primary} activeAt={477} />
          <StoryChip icon="🌙" title="ChatGPT 做夢記憶" accent={C.orange} activeAt={585} />
          <StoryChip icon="🎬" title="Gemini 全能影音" accent={C.blue} activeAt={736} />
        </div>

        <div style={{ ...tagStyle, marginTop: 30 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>最強模型 · 自動記憶 · 全能工具</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — CLAUDE FABLE 5 (最強又開放 + 安全護欄) ────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// pulsing flagship model core
function FableCore() {
  const frame = useCurrentFrame();
  const pulse = 0.5 + 0.5 * Math.sin(frame * 0.06);
  const ringRot = (frame * 1.0) % 360;
  return (
    <div style={{ position: "relative", width: 160 * S, height: 160 * S, flexShrink: 0 }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        border: `${3 * S}px dashed ${C.primary}`, opacity: 0.45,
        transform: `rotate(${ringRot}deg)`,
      }} />
      <div style={{
        position: "absolute", inset: 16 * S, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,255,178,0.25) 0%, transparent 70%)",
        opacity: 0.6 + 0.4 * pulse,
      }} />
      <div style={{
        position: "absolute", inset: 26 * S, borderRadius: "50%",
        background: "rgba(124,255,178,0.12)", border: `${2 * S}px solid ${C.primary}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 2 * S, boxShadow: `0 0 ${(28 + pulse * 18) * S}px rgba(124,255,178,0.4)`,
      }}>
        <span style={{ fontSize: 38 * S }}>🚀</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 18 * S, fontWeight: 800, color: C.primary, letterSpacing: "0.04em" }}>Fable 5</span>
      </div>
      <div style={{
        position: "absolute", bottom: -10 * S, left: "50%", transform: "translateX(-50%)",
        background: C.primary, color: C.bg, fontFamily: F_HEAD, fontWeight: 800,
        fontSize: 18 * S, borderRadius: 10 * S, padding: `${3 * S}px ${12 * S}px`, whiteSpace: "nowrap" as const,
        boxShadow: `0 0 ${16 * S}px ${C.primary}88`,
      }}>MYTHOS 級</div>
    </div>
  );
}

function StatCard({ label, value, unit, brightAt, accent = C.primary }: {
  label: string; value: string; unit: string; brightAt: number; accent?: string;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(brightAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${12 * S}px ${24 * S}px`, minWidth: 240 * S,
      boxShadow: isOn ? `0 0 ${28 * S}px ${accent}1f` : "none",
    }}>
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.04em" }}>{label}</span>
      <div style={{
        fontFamily: F_HEAD, fontWeight: 800, fontSize: 34 * S, color: accent, lineHeight: 1,
        textShadow: isOn ? `0 0 ${22 * S}px ${accent}55` : "none",
      }}>{value}</div>
      <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.textSub }}>{unit}</span>
    </div>
  );
}

function Scene1HeroA() {
  const frame = useCurrentFrame();
  // tier ladder + gate
  const opusDim = calcActive(158, frame, 0.3); // 46.14 Mythos
  const gateOn = calcActive(1376, frame, 0.3); // 86.72 安全護欄
  const riskOn = calcActive(1535, frame, 0.3); // 92.04 高風險問題
  const routeOn = calcActive(1682, frame, 0.3); // 96.94 轉交保守模型
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
      {/* tier ladder + core */}
      <div style={{ display: "flex", alignItems: "center", gap: 28 * S, marginTop: 16 * S }}>
        <div style={{
          opacity: opusDim.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
          background: C.surface, border: `1px solid ${C.surfaceBorder}`,
          borderRadius: 14 * S, padding: `${12 * S}px ${20 * S}px`,
        }}>
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted }}>前一代</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: C.textSub }}>Opus 4.8</span>
        </div>
        <span style={{ fontSize: 30 * S, color: C.primary }}>↗</span>
        <FableCore />
      </div>
      {/* benchmark stats */}
      <div style={{ display: "flex", gap: 20 * S }}>
        <StatCard label="軟體工程測試" value="約 80%" unit="benchmark 分數" brightAt={742} />
        <StatCard label="領先上一代" value="+11 pp" unit="高於 Opus 4.8" brightAt={898} accent={C.blue} />
      </div>
      {/* safety gate strip */}
      <div style={{
        opacity: gateOn.op, display: "flex", alignItems: "center", gap: 16 * S,
        background: C.surface, border: `1px solid ${gateOn.isOn ? C.orangeBorder : C.surfaceBorder}`,
        borderRadius: 18 * S, padding: `${14 * S}px ${24 * S}px`,
      }}>
        <div style={{
          opacity: riskOn.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 12 * S,
          padding: `${8 * S}px ${16 * S}px`,
        }}>
          <span style={{ fontSize: 26 * S }}>⚠️</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text }}>網路攻擊 · 生物製劑</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * S, opacity: gateOn.op }}>
          <span style={{ fontSize: 30 * S }}>🚪</span>
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.orange, letterSpacing: "0.08em" }}>安全閘門</span>
        </div>
        <span style={{ fontSize: 28 * S, color: C.orange, opacity: routeOn.op }}>→</span>
        <div style={{
          opacity: routeOn.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.orangeLight, border: `1px solid ${C.orangeBorder}`, borderRadius: 12 * S,
          padding: `${8 * S}px ${16 * S}px`,
        }}>
          <span style={{ fontSize: 26 * S }}>🛡️</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.orange }}>轉交保守的舊模型</span>
        </div>
      </div>
    </div>
  );
}

// Phase B — 20 次裡 1 次 (routing reality)
function RoutingGrid({ revealAt, swapAt }: { revealAt: number; swapAt: number }) {
  const frame = useCurrentFrame();
  const dots = Array.from({ length: 20 }, (_, i) => i);
  const swapIndex = 13; // the 1-in-20 swapped one
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 14 * S,
      }}>
        {dots.map((i) => {
          const at = revealAt + Math.floor(i / 10) * 8 + (i % 10) * 3;
          const a = calcActive(at, frame, 0.25);
          const swapped = i === swapIndex && frame >= swapAt;
          const col = swapped ? C.orange : C.primary;
          return (
            <div key={i} style={{
              position: "relative",
              width: 92 * S, height: 92 * S, borderRadius: 16 * S, opacity: a.op,
              background: swapped ? C.orangeLight : C.surface,
              border: `1px solid ${a.isOn ? col + "66" : C.surfaceBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 36 * S,
              boxShadow: swapped ? `0 0 ${26 * S}px ${C.orange}55` : "none",
            }}>
              {swapped && <RippleRing activeAt={swapAt} color={C.orange} radius={16 * S} />}
              {swapped ? "🛡️" : "💬"}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 20 * S, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
          <span style={{ width: 22 * S, height: 22 * S, borderRadius: 6 * S, background: C.primaryLight, border: `1px solid ${C.primaryBorder}` }} />
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, fontWeight: 500 }}>用 Fable 5 回答</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
          <span style={{ width: 22 * S, height: 22 * S, borderRadius: 6 * S, background: C.orangeLight, border: `1px solid ${C.orangeBorder}` }} />
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.orange, fontWeight: 700 }}>≈ 20 次有 1 次自動換模型</span>
        </div>
      </div>
    </div>
  );
}

function Scene1HeroB() {
  const frame = useCurrentFrame();
  const literacyOn = calcActive(2925, frame, 0.3); // 138.38 AI 素養
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
      <RoutingGrid revealAt={2268} swapAt={2609} />
      <div style={{
        opacity: literacyOn.op, display: "flex", alignItems: "center", gap: 14 * S,
        background: C.surface, border: `1px solid ${literacyOn.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 16 * S, padding: `${14 * S}px ${28 * S}px`,
        boxShadow: literacyOn.isOn ? `0 0 ${40 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontSize: 30 * S }}>🎓</span>
        <span style={{ fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700, color: C.text }}>AI 素養：搞清楚你現在用的，是哪一顆模型</span>
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_12.scene1.to - SCENES_2026_06_12.scene1.from;
  // local = global - 1226. Phase B 第一句「這對我們帶來什麼」114.12→3424, local 2198
  const A_FADE_START = 2118;
  const A_REMOVE = 2198;
  const B_SHOW_AT = 2198;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g1226 先講第一件 Fable 5
  const OPEN_AT = 415; // g1641 最強又開放
  const LEAD_AT = 537; // g1763 領先 Opus 4.8
  const WHY_AT = 1289; // g2515 為什麼敢開放
  const RISK_AT = 1535; // g2761 高風險問題自動轉交
  const GATE_TAKE = 1983; // g3209 高風險被擋住

  // Phase B captions (local)
  const GOOD_AT = 2268; // g3494 好消息更聰明助手
  const SWAP_AT = 2609; // g3835 20 次 1 次
  const LIT_AT = 2925; // g4151 AI 素養

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A — Fable 5 旗艦 + 安全護欄 ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="STORY 01 — CLAUDE FABLE 5" delay={HEADER_AT} color={C.primary} />}
            sentence={
              frame >= RISK_AT
                ? <StageSentence text="高風險問題，自動轉交保守的舊模型" delay={RISK_AT} color={C.orange} />
                : frame >= WHY_AT
                ? <StageSentence text="那它為什麼敢開放？關鍵是安全護欄" delay={WHY_AT} color={C.primary} />
                : frame >= LEAD_AT
                ? <StageSentence text="多項測試明顯領先上一代 Opus 4.8" delay={LEAD_AT} color={C.text} fontSize={26 * S} />
                : frame >= OPEN_AT
                ? <StageSentence text="目前最強，卻開放給一般大眾的模型" delay={OPEN_AT} color={C.primary} />
                : <StageSentence text="Anthropic 新旗艦：Claude Fable 5" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="高風險場景被擋住，最強的模型才放心對外開放" delay={GATE_TAKE} color={C.primary} />}
          >
            <Scene1HeroA />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B — 對我們的意義：20 次 1 次 ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="對我們的意義 — WHAT IT MEANS" delay={B_SHOW_AT} color={C.orange} />}
          sentence={
            frame >= LIT_AT
              ? <StageSentence text="重要 AI 素養：搞清楚你在用哪一顆模型" delay={LIT_AT} color={C.primary} fontSize={26 * S} />
              : frame >= SWAP_AT
              ? <StageSentence text="大約 20 次對話，有 1 次自動換模型" delay={SWAP_AT} color={C.orange} fontSize={26 * S} />
              : <StageSentence text="這對我們代表什麼？" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="與其盲信「我用最強的」，不如搞懂它何時會被切換" delay={LIT_AT} color={C.primary} />}
        >
          <Scene1HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — CHATGPT 做夢記憶 (自動更新 + 記憶來源) ────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function Scene2HeroA() {
  const frame = useCurrentFrame();
  const noteDim = calcActive(263, frame, 0.3); // 176.38 過去像便利貼
  const autoOn = calcActive(397, frame, 0.3); // 180.84 現在自動回顧
  const exBefore = calcActive(724, frame, 0.3); // 191.72 7月要去新加坡
  const exAfter = calcActive(803, frame, 0.3); // 194.38 改寫成去過了
  const srcOn = calcActive(1309, frame, 0.3); // 211.22 記憶來源
  const editOn = calcActive(1483, frame, 0.3); // 217.04 可刪改
  const doubleOn = calcActive(1595, frame, 0.3); // 220.78 容量翻倍
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      {/* 便利貼 → 做夢 → 自動更新 */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 * S }}>
        <div style={{
          opacity: noteDim.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
          background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 18 * S,
          padding: `${18 * S}px ${24 * S}px`, width: 280 * S,
        }}>
          <span style={{ fontSize: 44 * S }}>📝</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.textSub, textAlign: "center" }}>過去：手動維護的便利貼</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * S, opacity: autoOn.op }}>
          <span style={{ fontSize: 36 * S }}>🌙</span>
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.orange, letterSpacing: "0.06em" }}>做夢 · 背景更新</span>
        </div>
        <span style={{ fontSize: 30 * S, color: C.orange, opacity: autoOn.op }}>→</span>
        <div style={{
          opacity: autoOn.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
          background: C.orangeLight, border: `1px solid ${autoOn.isOn ? C.orangeBorder : C.surfaceBorder}`,
          borderRadius: 18 * S, padding: `${18 * S}px ${24 * S}px`, width: 280 * S,
          boxShadow: autoOn.isOn ? `0 0 ${30 * S}px ${C.orange}1f` : "none",
        }}>
          <span style={{ fontSize: 44 * S }}>🧠</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.orange, textAlign: "center" }}>現在：自動整理、自動更新</span>
        </div>
      </div>
      {/* 新加坡改寫範例 */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 * S }}>
        <div style={{
          opacity: exBefore.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 14 * S,
          padding: `${10 * S}px ${20 * S}px`,
        }}>
          <span style={{ fontSize: 24 * S }}>✈️</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.text, fontWeight: 500 }}>7 月「要去」新加坡</span>
        </div>
        <span style={{ fontSize: 26 * S, color: C.orange, opacity: exAfter.op }}>✍️→</span>
        <div style={{
          opacity: exAfter.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.orangeLight, border: `1px solid ${exAfter.isOn ? C.orangeBorder : C.surfaceBorder}`,
          borderRadius: 14 * S, padding: `${10 * S}px ${20 * S}px`,
        }}>
          <span style={{ fontSize: 24 * S }}>✅</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.orange, fontWeight: 700 }}>7 月「去過」新加坡了</span>
        </div>
      </div>
      {/* 記憶來源 / 可刪改 / 容量翻倍 */}
      <div style={{ display: "flex", gap: 16 * S }}>
        <div style={{
          opacity: srcOn.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.surface, border: `1px solid ${srcOn.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 12 * S, padding: `${10 * S}px ${18 * S}px`,
        }}>
          <span style={{ fontSize: 24 * S }}>🔍</span>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: srcOn.isOn ? C.text : C.textSub }}>記憶來源：用了哪些記憶</span>
        </div>
        <div style={{
          opacity: editOn.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.surface, border: `1px solid ${editOn.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 12 * S, padding: `${10 * S}px ${18 * S}px`,
        }}>
          <span style={{ fontSize: 24 * S }}>✏️</span>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: editOn.isOn ? C.text : C.textSub }}>可直接刪掉或更正</span>
        </div>
        <div style={{
          opacity: doubleOn.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.surface, border: `1px solid ${doubleOn.isOn ? C.blueBorder : C.surfaceBorder}`,
          borderRadius: 12 * S, padding: `${10 * S}px ${18 * S}px`,
        }}>
          <span style={{ fontSize: 24 * S }}>📈</span>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: doubleOn.isOn ? C.blue : C.textSub }}>Plus / Pro 容量翻倍</span>
        </div>
      </div>
    </div>
  );
}

function Scene2HeroB() {
  const frame = useCurrentFrame();
  const goodOn = calcActive(1838, frame, 0.3); // 228.86 一面更方便
  const privOn = calcActive(2045, frame, 0.3); // 235.76 另一面隱私
  const checkOn = calcActive(2364, frame, 0.3); // 246.40 以為的你
  const ctrlOn = calcActive(2474, frame, 0.3); // 250.08 記憶來源可查可改
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
      {/* two sides */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 30 * S }}>
        <div style={{
          opacity: goodOn.op, width: 480 * S, borderRadius: 20 * S,
          background: C.surface, border: `1px solid ${goodOn.isOn ? C.primaryBorder : C.surfaceBorder}`,
          padding: `${20 * S}px ${26 * S}px`, display: "flex", flexDirection: "column", gap: 12 * S,
          boxShadow: goodOn.isOn ? `0 0 ${40 * S}px ${C.primaryGlow}` : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
            <span style={{ fontSize: 34 * S }}>😊</span>
            <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: C.primary }}>一面：更方便</span>
          </div>
          <span style={{ fontFamily: F_TC, fontSize: 22 * S, color: C.text, lineHeight: 1.4 }}>像長期助理，記得你的來龍去脈</span>
        </div>
        <div style={{
          opacity: privOn.op, width: 480 * S, borderRadius: 20 * S,
          background: C.surface, border: `1px solid ${privOn.isOn ? C.orangeBorder : C.surfaceBorder}`,
          padding: `${20 * S}px ${26 * S}px`, display: "flex", flexDirection: "column", gap: 12 * S,
          boxShadow: privOn.isOn ? `0 0 ${40 * S}px ${C.orange}14` : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
            <span style={{ fontSize: 34 * S }}>🔐</span>
            <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: C.orange }}>另一面：隱私與掌控</span>
          </div>
          <span style={{ fontFamily: F_TC, fontSize: 22 * S, color: C.text, lineHeight: 1.4 }}>要定期檢查「它以為的你」是不是你</span>
        </div>
      </div>
      {/* action — 主導權還給你 */}
      <div style={{
        opacity: Math.max(checkOn.op, ctrlOn.op), display: "flex", alignItems: "center", gap: 14 * S,
        background: C.surface, border: `1px solid ${ctrlOn.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 16 * S, padding: `${14 * S}px ${28 * S}px`,
        boxShadow: ctrlOn.isOn ? `0 0 ${40 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontSize: 30 * S }}>🎛️</span>
        <span style={{ fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700, color: C.text }}>記憶來源可查、可改 — 主導權還在你手上</span>
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_12.scene2.to - SCENES_2026_06_12.scene2.from;
  // local = global - 5028. Phase B 第一句「這件事的兩面性」224.86→6746, local 1718
  const A_FADE_START = 1638;
  const A_REMOVE = 1718;
  const B_SHOW_AT = 1718;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g5028 第二件 新記憶系統
  const DREAM_AT = 166; // g5194 代號做夢
  const AUTO_AT = 397; // g5425 背景自動回顧
  const EX_AT = 724; // g5752 新加坡例子
  const A_TAKE = 947; // g5975 更貼近建議

  // Phase B captions (local)
  const GOOD_AT = 1838; // g6866 一面更方便
  const PRIV_AT = 2045; // g7073 另一面隱私
  const CHECK_AT = 2364; // g7392 以為的你

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A — 做夢記憶 ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="STORY 02 — CHATGPT 做夢記憶" delay={HEADER_AT} color={C.orange} />}
            sentence={
              frame >= EX_AT
                ? <StageSentence text="行程過了，它會自己改寫你的記憶" delay={EX_AT} color={C.orange} />
                : frame >= AUTO_AT
                ? <StageSentence text="它會在背景自動回顧、更新對你的了解" delay={AUTO_AT} color={C.text} fontSize={26 * S} />
                : frame >= DREAM_AT
                ? <StageSentence text="新記憶系統，代號叫「做夢」" delay={DREAM_AT} color={C.orange} />
                : <StageSentence text="ChatGPT 換上新的記憶系統" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="不用你動手，記憶會自己保持最新，給更貼近現況的建議" delay={A_TAKE} color={C.orange} />}
          >
            <Scene2HeroA />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B — 兩面性 ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="兩面性 — THE TRADE-OFF" delay={B_SHOW_AT} color={C.orange} />}
          sentence={
            frame >= CHECK_AT
              ? <StageSentence text="要定期檢查「它以為的你」是不是你" delay={CHECK_AT} color={C.orange} fontSize={26 * S} />
              : frame >= PRIV_AT
              ? <StageSentence text="另一面：隱私與掌控的功課變重了" delay={PRIV_AT} color={C.orange} />
              : <StageSentence text="這件事有兩面性，值得玩味" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="記憶來源可查、可改，把主導權還到你手上" delay={2474} color={C.primary} />}
        >
          <Scene2HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — GEMINI 全能 (Omni / Deep Think + 判斷力底線) ──────────────────
// ═══════════════════════════════════════════════════════════════════════════

function InputIcon({ icon, label, activeAt }: { icon: string; label: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const a = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: a.op, display: "flex", alignItems: "center", gap: 10 * S,
      background: C.surface, border: `1px solid ${a.isOn ? C.blueBorder : C.surfaceBorder}`,
      borderRadius: 12 * S, padding: `${8 * S}px ${16 * S}px`, width: 200 * S,
    }}>
      <span style={{ fontSize: 26 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function Scene3HeroA() {
  const frame = useCurrentFrame();
  const omniOn = calcActive(586, frame, 0.3); // 302.96 吃文字圖片聲音影片
  const outOn = calcActive(732, frame, 0.3); // 307.84 生成影片
  const deepOn = calcActive(1017, frame, 0.3); // 317.34 DeepThink
  const embedOn = calcActive(1446, frame, 0.3); // 331.62 多模態嵌入模型
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
      {/* multi-modal inputs → Gemini Omni → output video */}
      <div style={{ display: "flex", alignItems: "center", gap: 26 * S }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
          <InputIcon icon="📝" label="文字" activeAt={586} />
          <InputIcon icon="🖼️" label="圖片" activeAt={586} />
          <InputIcon icon="🔊" label="聲音" activeAt={586} />
          <InputIcon icon="🎬" label="影片" activeAt={586} />
        </div>
        <span style={{ fontSize: 30 * S, color: C.blue, opacity: omniOn.op }}>→</span>
        <div style={{
          opacity: omniOn.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
          background: C.blueLight, border: `1px solid ${omniOn.isOn ? C.blueBorder : C.surfaceBorder}`,
          borderRadius: 22 * S, padding: `${24 * S}px ${28 * S}px`,
          boxShadow: omniOn.isOn ? `0 0 ${40 * S}px ${C.blue}26` : "none",
        }}>
          <span style={{ fontSize: 52 * S }}>✦</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color: C.blue }}>Gemini Omni</span>
        </div>
        <span style={{ fontSize: 30 * S, color: C.blue, opacity: outOn.op }}>→</span>
        <div style={{
          opacity: outOn.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
          background: C.surface, border: `1px solid ${outOn.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 18 * S, padding: `${18 * S}px ${22 * S}px`, width: 220 * S,
          boxShadow: outOn.isOn ? `0 0 ${30 * S}px ${C.primaryGlow}` : "none",
        }}>
          <span style={{ fontSize: 44 * S }}>🎥</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: outOn.isOn ? C.primary : C.textSub }}>生成影片內容</span>
        </div>
      </div>
      {/* DeepThink + 嵌入模型 */}
      <div style={{ display: "flex", gap: 18 * S }}>
        <div style={{
          opacity: deepOn.op, display: "flex", alignItems: "center", gap: 12 * S,
          background: C.surface, border: `1px solid ${deepOn.isOn ? C.purpleBorder : C.surfaceBorder}`,
          borderRadius: 14 * S, padding: `${12 * S}px ${22 * S}px`,
          boxShadow: deepOn.isOn ? `0 0 ${26 * S}px ${C.purple}1f` : "none",
        }}>
          <span style={{ fontSize: 28 * S }}>🧠</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: deepOn.isOn ? C.text : C.textSub }}>Deep Think：數學 · 科學 · 邏輯硬題目</span>
        </div>
        <div style={{
          opacity: embedOn.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.surface, border: `1px solid ${embedOn.isOn ? C.blueBorder : C.surfaceBorder}`,
          borderRadius: 14 * S, padding: `${12 * S}px ${20 * S}px`,
        }}>
          <span style={{ fontSize: 26 * S }}>🧩</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: embedOn.isOn ? C.text : C.textSub }}>多模態嵌入模型</span>
        </div>
      </div>
    </div>
  );
}

function Scene3HeroB() {
  const frame = useCurrentFrame();
  const stdOn = calcActive(1927, frame, 0.3); // 347.66 成為新標準
  const matOn = calcActive(2176, frame, 0.3); // 355.96 版權隱私
  const permOn = calcActive(2475, frame, 0.3); // 365.94 有沒有許可權
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
      {/* 全能 = 新標準 banner */}
      <div style={{
        opacity: stdOn.op, display: "flex", alignItems: "center", gap: 14 * S,
        background: C.blueLight, border: `1px solid ${stdOn.isOn ? C.blueBorder : C.surfaceBorder}`,
        borderRadius: 16 * S, padding: `${14 * S}px ${28 * S}px`,
        boxShadow: stdOn.isOn ? `0 0 ${30 * S}px ${C.blue}1f` : "none",
      }}>
        <span style={{ fontSize: 30 * S }}>🏅</span>
        <span style={{ fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700, color: C.text }}>「全能」正在成為 AI 工具的新標準</span>
      </div>
      {/* 素材 → 版權/隱私閘門 → 生成 */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 * S }}>
        <div style={{
          opacity: matOn.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
          background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 16 * S,
          padding: `${16 * S}px ${22 * S}px`, width: 320 * S,
        }}>
          <span style={{ fontSize: 36 * S }}>📂</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text, textAlign: "center" }}>別人的影片 · 有個資的檔案</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * S, opacity: permOn.op }}>
          <span style={{ fontSize: 34 * S }}>⚠️</span>
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.orange, letterSpacing: "0.06em" }}>版權 · 隱私</span>
        </div>
        <span style={{ fontSize: 28 * S, color: C.orange, opacity: permOn.op }}>→</span>
        <div style={{
          opacity: permOn.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
          background: C.orangeLight, border: `1px solid ${permOn.isOn ? C.orangeBorder : C.surfaceBorder}`,
          borderRadius: 16 * S, padding: `${16 * S}px ${22 * S}px`, width: 320 * S,
          boxShadow: permOn.isOn ? `0 0 ${30 * S}px ${C.orange}1f` : "none",
        }}>
          <span style={{ fontSize: 36 * S }}>🤔</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.orange, textAlign: "center" }}>先想：你有這個權限嗎？</span>
        </div>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_12.scene3.to - SCENES_2026_06_12.scene3.from;
  // local = global - 8503. Phase B 第一句「對我們的意義是全能」344.68→10340, local 1837
  const A_FADE_START = 1757;
  const A_REMOVE = 1837;
  const B_SHOW_AT = 1837;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g8503 第三件 Gemini
  const FOCUS_AT = 258; // g8761 重點 Omni + DeepThink
  const INPUT_AT = 586; // g9089 吃文字圖片聲音影片
  const OUT_AT = 732; // g9235 生成影片
  const DEEP_AT = 1017; // g9520 DeepThink
  const A_TAKE = 1644; // g10147 不必工具間跳來跳去

  // Phase B captions (local)
  const MORE_AT = 2072; // g10575 能輸入越多越要留意
  const MAT_AT = 2176; // g10679 版權隱私
  const PERM_AT = 2475; // g10978 有沒有許可權

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A — Gemini Omni / Deep Think ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="STORY 03 — GEMINI 全能影音" delay={HEADER_AT} color={C.blue} />}
            sentence={
              frame >= DEEP_AT
                ? <StageSentence text="Deep Think：對付數學科學的硬題目" delay={DEEP_AT} color={C.purple} />
                : frame >= OUT_AT
                ? <StageSentence text="多種素材丟進去，直接生成影片" delay={OUT_AT} color={C.primary} />
                : frame >= INPUT_AT
                ? <StageSentence text="文字、圖片、聲音、影片一起當輸入" delay={INPUT_AT} color={C.blue} fontSize={26 * S} />
                : frame >= FOCUS_AT
                ? <StageSentence text="兩大重點：Gemini Omni 與 Deep Think" delay={FOCUS_AT} color={C.blue} fontSize={26 * S} />
                : <StageSentence text="Google 把 Gemini 推向全能型工具" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="把多種素材到產出成品，整合在同一個地方" delay={A_TAKE} color={C.blue} />}
          >
            <Scene3HeroA />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B — 全能=新標準 + 判斷力底線 ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="對我們的意義 — THE BOTTOM LINE" delay={B_SHOW_AT} color={C.orange} />}
          sentence={
            frame >= PERM_AT
              ? <StageSentence text="丟素材前先想：你有這個權限嗎？" delay={PERM_AT} color={C.orange} />
              : frame >= MAT_AT
              ? <StageSentence text="版權、隱私，是全能工具的新課題" delay={MAT_AT} color={C.orange} />
              : <StageSentence text="全能，正在成為新標準" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="工具越全能，你的判斷力就越是那條真正的底線" delay={PERM_AT} color={C.orange} />}
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
  const { op, isOn } = calcActive(activeAt, frame, 0.28);
  return (
    <div style={{
      width: 1180 * S, opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${18 * S}px ${30 * S}px`,
      display: "flex", alignItems: "center", gap: 22 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${accent}1f` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 84 * S, height: 84 * S, borderRadius: "50%", flexShrink: 0,
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 * S,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 4 * S }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 22 * S, color: accent }}>{index}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 24 * S, color: isOn ? C.text : C.textSub }}>{title}</span>
        </div>
        <div style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, lineHeight: 1.45 }}>{body}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_12.summary.to - SCENES_2026_06_12.summary.from;
  // local = global - 11670
  const eyebrowFade = useFadeIn(6);
  const headFade = useFadeUp(14);
  // 第一 392.74→112 | 第二 407.96→569 | 第三 421.42→973 | 練習 436.36→1421 | outro 469.84→2425
  const CARD1_AT = 112;
  const CARD2_AT = 569;
  const CARD3_AT = 973;
  const PRACTICE_AT = 1421;
  const OUTRO_AT = 2425;
  const practiceStyle = calcActive(PRACTICE_AT, frame, 0.28);
  const outroFade = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        paddingTop: CONTENT_TOP + 14 * S, paddingBottom: SUBTITLE_SAFE,
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
          ...headFade, margin: `${10 * S}px 0 ${22 * S}px`,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 32 * S, color: C.text, textAlign: "center",
        }}>本週三件 AI 大事</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 * S }}>
          <RecapCard index="01" icon="🚀" title="Claude Fable 5" accent={C.primary} activeAt={CARD1_AT}
            body="最強模型靠安全護欄才敢開放給大眾；但約 20 次有 1 次會自動換模型——搞懂你在用哪一顆很重要。" />
          <RecapCard index="02" icon="🌙" title="ChatGPT 做夢記憶" accent={C.orange} activeAt={CARD2_AT}
            body="記憶能在背景自動更新、更懂你；但「記憶來源」可查、可改，定期檢查 AI 以為的你，是一門新功課。" />
          <RecapCard index="03" icon="🎬" title="Gemini 全能影音" accent={C.blue} activeAt={CARD3_AT}
            body="Omni 與 Deep Think 讓文字圖片聲音影片一站全包，正成為新標準；工具越全能，版權與隱私判斷越關鍵。" />
        </div>

        {/* 小練習 CTA */}
        <div style={{
          opacity: practiceStyle.op, marginTop: 22 * S, width: 1180 * S,
          background: C.surface, border: `1px solid ${practiceStyle.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 20 * S, padding: `${16 * S}px ${30 * S}px`,
          boxShadow: practiceStyle.isOn ? `0 0 ${50 * S}px ${C.primaryGlow}` : "none",
          display: "flex", alignItems: "center", gap: 20 * S,
        }}>
          <span style={{ fontSize: 36 * S }}>✅</span>
          <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 500, color: C.text, lineHeight: 1.45 }}>
            <span style={{ color: C.primary, fontWeight: 700 }}>今日小練習：</span>挑一個常用 AI 工具，3 分鐘——① 打開記憶頁面把不對的清掉；② 確認預設用的是哪一顆模型。
          </span>
        </div>

        <div style={{ ...outroFade, marginTop: 22 * S, display: "flex", alignItems: "center", gap: 12 * S }}>
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

export const VideoComposition_2026_06_12: React.FC = () => {
  const frame = useCurrentFrame();
  const Sx = SCENES_2026_06_12;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-06-12-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f, [TOTAL_FRAMES_2026_06_12 - 150, TOTAL_FRAMES_2026_06_12], [v, 0],
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
