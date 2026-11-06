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

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// Title:   0s    → 0      開場 hook：通用 AI 不認識你的資料 → 你需要一座專屬知識庫
// Scene1:  33s   → 990    什麼是專屬知識庫 + RAG（先查書，再作答）
// Scene2:  75s   → 2250   完整流程四步 + NotebookLM 範例
// Scene3:  154s  → 4620   為什麼重要：兩個缺口 + 引用是查證入口
// Scene4:  250s  → 7500   實際怎麼做：三個原則
// Summary: 337s  → 10110  今日重點整理 + 小練習
// End:     407s(audio) → 12240
export const SCENES_2026_06_11 = {
  title: { from: 0, to: 990 },
  scene1: { from: 990, to: 2250 },
  scene2: { from: 2250, to: 4620 },
  scene3: { from: 4620, to: 7500 },
  scene4: { from: 7500, to: 10110 },
  summary: { from: 10110, to: 12240 },
} as const;
export const TOTAL_FRAMES_2026_06_11 = 12240;

const CHAPTERS = [
  { label: "開場", start: 0 },
  { label: "什麼是知識庫", start: 990 },
  { label: "四步與範例", start: 2250 },
  { label: "為什麼重要", start: 4620 },
  { label: "實際怎麼做", start: 7500 },
  { label: "重點整理", start: 10110 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene2 結尾「這裡先想一想」138s → scene2 end 154s
  { from: 4140, to: 4620, sender: "想一想", text: "同樣一個問題，問通用 AI，跟問一個只讀你文件的知識庫，答案會差在哪？哪一種你會更敢直接拿來用？" },
  // Scene3 結尾「再想一想」238s → scene3 end 250s
  { from: 7140, to: 7500, sender: "想一想", text: "當 AI 答案附上了來源連結，你會點進去看，還是會因為它有附來源，就更放心地相信它？" },
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

// dim → bright tied to a cue (takes frame as param → safe inside .map)
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
  const scale = interpolate(f, [0, 26], [0.85, 1.8], { easing: E.outExpo, extrapolateRight: "clamp" });
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
      fontWeight: 700, lineHeight: 1.35, maxWidth: 620 * S, margin: "0 auto",
      fontSize, color, wordBreak: "break-word" as const,
    }}>{text}</div>
  );
}

function StageTakeaway({ text, delay, color = C.primary }: { text: string; delay: number; color?: string }) {
  // dim → bright (0.28 → 1.0)，不 pop-in
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
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>{takeaway}</div>
    </AbsoluteFill>
  );
}

// ── shared building block: a glowing pill icon node ─────────────────────────
function IconNode({ emoji, label, sub, activeAt, frame, color, w = 240 * S }: {
  emoji: string; label: string; sub?: string; activeAt: number; frame: number; color: string; w?: number;
}) {
  const a = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      position: "relative", width: w,
      opacity: a.op,
      background: C.surface, border: `1px solid ${a.isOn ? color + "66" : C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${18 * S}px ${16 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
      boxShadow: a.isOn ? `0 0 ${30 * S}px ${color}22` : "none",
    }}>
      {a.isOn && <RippleRing activeAt={activeAt} color={color} radius={20 * S} />}
      <div style={{
        width: 78 * S, height: 78 * S, borderRadius: "50%",
        background: `${color}1a`, border: `${2 * S}px solid ${color}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 * S,
        boxShadow: a.isOn ? `0 0 ${18 * S}px ${color}55` : "none",
      }}>{emoji}</div>
      <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub, textAlign: "center", lineHeight: 1.25 }}>{label}</span>
      {sub && <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.1em" }}>{sub}</span>}
    </div>
  );
}

function FlowArrow({ activeAt, frame, color = C.primary }: { activeAt: number; frame: number; color?: string }) {
  const a = calcActive(activeAt, frame, 0.2);
  return <span style={{ fontSize: 36 * S, color, opacity: a.op, flexShrink: 0 }}>→</span>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_11.title.to - SCENES_2026_06_11.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(40);
  const tagStyle = useFadeUp(56);
  const heroStyle = useFadeUp(120);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));

  // activations (global = title-local):
  // 390 不認識你公司文件 | 720 一座專屬知識庫 | 810 完整流程（答案）
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
            opacity: eyebrowPulse, boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          }} />
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 20 * S,
            color: C.primary, letterSpacing: "0.2em", textTransform: "uppercase" as const,
          }}>每日 AI 知識庫</span>
        </div>

        <h1 style={{ margin: 0, lineHeight: 1.15, fontFamily: F_HEAD, fontWeight: 800, fontSize: 42 * S, color: C.text }}>
          <WordReveal text="如何打造你的專屬知識庫？" startFrame={10} staggerPerWord={5}
            fontSize={42 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>
        <h1 style={{ margin: 0, lineHeight: 1.2, marginTop: 6 * S, fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary }}>
          <WordReveal text="上傳文件到問答的全流程" startFrame={28} staggerPerWord={5}
            fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 18 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          不必更強的模型，而是讓 AI 以你自己的資料為根據
        </p>

        {/* central teaser: 你的文件 → 知識庫 → 有根據的答案 */}
        <div style={{ ...heroStyle, marginTop: 40 * S, display: "flex", alignItems: "center", gap: 22 * S, justifyContent: "center" }}>
          <IconNode emoji="📄" label="你的文件" sub="PDF · 筆記 · 報告" activeAt={390} frame={frame} color={C.blue} w={250 * S} />
          <FlowArrow activeAt={690} frame={frame} color={C.primary} />
          <IconNode emoji="📚" label="專屬知識庫" sub="RAG" activeAt={720} frame={frame} color={C.primary} w={250 * S} />
          <FlowArrow activeAt={790} frame={frame} color={C.primary} />
          <IconNode emoji="💬" label="有根據的答案" sub="附引用" activeAt={810} frame={frame} color={C.orange} w={250 * S} />
        </div>

        <div style={{ ...tagStyle, marginTop: 30 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>RAG · 檢索增強生成 · NotebookLM · AI 素養</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — 什麼是專屬知識庫 + RAG（先查書，再作答）───────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: 通用 AI（只懂公開知識）vs 你的私有文件 → 交給 AI、以資料為根據
function GapHero({ handAt, groundAt }: { handAt: number; groundAt: number }) {
  const frame = useCurrentFrame();
  const ai = calcActive(0, frame, 0.4);
  const priv = [
    { emoji: "🏢", label: "公司內規" },
    { emoji: "📑", label: "研究文獻" },
    { emoji: "📝", label: "個人筆記" },
  ];
  const hand = calcActive(handAt, frame, 0.3);
  const ground = calcActive(groundAt, frame, 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 40 * S }}>
      {/* general AI brain — only knows public web knowledge */}
      <div style={{
        opacity: ai.op, width: 320 * S, borderRadius: 22 * S,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`,
        padding: `${22 * S}px ${20 * S}px`, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      }}>
        <div style={{
          width: 100 * S, height: 100 * S, borderRadius: "50%",
          background: "rgba(91,143,255,0.12)", border: `${2 * S}px solid ${C.blue}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52 * S,
        }}>🤖</div>
        <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: C.text }}>通用 AI</span>
        <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.muted, textAlign: "center", lineHeight: 1.4 }}>只學過公開的網路知識</span>
      </div>

      {/* hand-over arrow */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S, opacity: hand.op }}>
        <span style={{ fontSize: 34 * S, color: C.primary }}>→</span>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.primary, letterSpacing: "0.06em", whiteSpace: "nowrap" as const }}>把文件交給它</span>
      </div>

      {/* your private docs */}
      <div style={{
        width: 360 * S, borderRadius: 22 * S,
        background: C.surface, border: `1px solid ${ground.isOn ? C.primaryBorder : C.surfaceBorder}`,
        padding: `${20 * S}px ${22 * S}px`, display: "flex", flexDirection: "column", gap: 12 * S,
        boxShadow: ground.isOn ? `0 0 ${40 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>你的私有資料</span>
        {priv.map((p, i) => {
          const a = calcActive(40 + i * 14, frame, 0.4);
          return (
            <div key={i} style={{
              opacity: a.op, display: "flex", alignItems: "center", gap: 14 * S,
              background: C.surface2, border: `1px solid ${C.surfaceBorder}`,
              borderRadius: 12 * S, padding: `${10 * S}px ${16 * S}px`,
            }}>
              <span style={{ fontSize: 28 * S }}>{p.emoji}</span>
              <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: C.text }}>{p.label}</span>
            </div>
          );
        })}
        <div style={{
          opacity: ground.op, marginTop: 4 * S,
          fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: C.primary, textAlign: "center",
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 12 * S, padding: `${8 * S}px ${14 * S}px`,
        }}>✓ 回答以這些資料為根據</div>
      </div>
    </div>
  );
}

// Phase B hero: RAG flow — 問題 → 檢索（翻找文件）→ 生成（依內容作答）
function RagFlow({ retrieveAt, generateAt }: { retrieveAt: number; generateAt: number }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22 * S }}>
      <IconNode emoji="❓" label="你的問題" activeAt={0} frame={frame} color={C.blue} w={236 * S} />
      <FlowArrow activeAt={retrieveAt - 30} frame={frame} color={C.primary} />
      <IconNode emoji="🔎" label="先查書" sub="到文件裡翻找相關段落" activeAt={retrieveAt} frame={frame} color={C.primary} w={300 * S} />
      <FlowArrow activeAt={generateAt - 30} frame={frame} color={C.primary} />
      <IconNode emoji="✍️" label="再作答" sub="根據翻到的內容生成" activeAt={generateAt} frame={frame} color={C.orange} w={300 * S} />
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_11.scene1.to - SCENES_2026_06_11.scene1.from;
  // local = global - 990. Phase B 第一句「這背後有個主流技術 RAG」52s → g1560, local 570
  const A_FADE_START = 490;
  const A_REMOVE = 570;
  const B_SHOW_AT = 570;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A (local)
  const A_HEADER = 0;      // g990  先講知識庫是什麼
  const A_PUBLIC = 120;    // g1110 通用 AI 學公開知識
  const A_HAND = 360;      // g1350 把文件交給 AI
  const A_GROUND = 480;    // g1470 以這些資料為根據

  // Phase B (local)
  const B_RETRIEVE = 930;  // g1920 先去文件翻找相關段落 (64s)
  const B_GENERATE = 1020; // g2010 根據翻到內容生成 (67s)
  const B_BOOK = 1110;     // g2100 先查書再作答 (70s)

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="什麼是知識庫 ／ THE IDEA" delay={A_HEADER} color={C.primary} />}
            sentence={
              frame >= A_HAND
                ? <StageSentence text="專屬知識庫＝把你的文件交給 AI" delay={A_HAND} color={C.primary} />
                : frame >= A_PUBLIC
                ? <StageSentence text="通用 AI 學的是公開的網路知識" delay={A_PUBLIC} color={C.text} />
                : <StageSentence text="先講，專屬知識庫到底是什麼" delay={A_HEADER} color={C.text} />
            }
            takeaway={<StageTakeaway text="讓 AI 的回答，以你自己的資料為根據" delay={A_GROUND} color={C.primary} />}
          >
            <GapHero handAt={A_HAND} groundAt={A_GROUND} />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="RAG ／ 檢索增強生成" delay={B_SHOW_AT} color={C.primary} />}
          sentence={
            frame >= B_GENERATE
              ? <StageSentence text="再根據翻到的內容，生成答案" delay={B_GENERATE} color={C.orange} />
              : frame >= B_RETRIEVE
              ? <StageSentence text="回答前，先去你的文件裡翻找" delay={B_RETRIEVE} color={C.primary} />
              : <StageSentence text="這背後是一個主流技術：RAG" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="先查書，再作答——而不是憑印象硬講" delay={B_BOOK} color={C.primary} />}
        >
          <RagFlow retrieveAt={B_RETRIEVE} generateAt={B_GENERATE} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 完整流程四步 + NotebookLM 範例 ────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function StepCard({ n, emoji, title, desc, activeAt, frame, color }: {
  n: string; emoji: string; title: string; desc: string; activeAt: number; frame: number; color: string;
}) {
  const a = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      position: "relative", width: 268 * S,
      opacity: a.op,
      background: C.surface, border: `1px solid ${a.isOn ? color + "66" : C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${18 * S}px ${16 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
      boxShadow: a.isOn ? `0 0 ${28 * S}px ${color}1f` : "none",
    }}>
      {a.isOn && <RippleRing activeAt={activeAt} color={color} radius={20 * S} />}
      <div style={{
        position: "absolute", top: -18 * S, left: -10 * S,
        width: 50 * S, height: 50 * S, borderRadius: "50%",
        background: C.surface2, border: `1px solid ${color}88`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color,
        boxShadow: a.isOn ? `0 0 ${16 * S}px ${color}55` : "none",
      }}>{n}</div>
      <div style={{ fontSize: 40 * S }}>{emoji}</div>
      <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub }}>{title}</span>
      <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.muted, textAlign: "center", lineHeight: 1.4 }}>{desc}</span>
    </div>
  );
}

function FourSteps({ s1, s2, s3, s4 }: { s1: number; s2: number; s3: number; s4: number }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
      <StepCard n="1" emoji="📤" title="上傳文件" desc="PDF、筆記、報告丟進去" activeAt={s1} frame={frame} color={C.blue} />
      <FlowArrow activeAt={s2 - 30} frame={frame} color={C.blue} />
      <StepCard n="2" emoji="🗂️" title="建立索引" desc="切成小段、方便搜尋" activeAt={s2} frame={frame} color={C.blue} />
      <FlowArrow activeAt={s3 - 30} frame={frame} color={C.blue} />
      <StepCard n="3" emoji="💬" title="提問" desc="用自然語言發問" activeAt={s3} frame={frame} color={C.blue} />
      <FlowArrow activeAt={s4 - 30} frame={frame} color={C.blue} />
      <StepCard n="4" emoji="🔎" title="檢索生成" desc="找最相關段落並作答" activeAt={s4} frame={frame} color={C.primary} />
    </div>
  );
}

function NotebookHero({ srcAt, citeAt, refuseAt, limitAt }: {
  srcAt: number; citeAt: number; refuseAt: number; limitAt: number;
}) {
  const frame = useCurrentFrame();
  const head = calcActive(0, frame, 0.4);
  const feats = [
    { emoji: "✓", label: "只根據你上傳的來源生成", at: srcAt, color: C.primary },
    { emoji: "🔗", label: "附上可點回原文的引用", at: citeAt, color: C.blue },
    { emoji: "🚫", label: "資料裡沒有，它就不回答", at: refuseAt, color: C.orange },
  ];
  const limits = [
    { v: "50", u: "個來源 / 筆記本" },
    { v: "50 萬", u: "字 / 來源" },
    { v: "200MB", u: "單檔上限" },
  ];
  const lim = calcActive(limitAt, frame, 0.3);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
      <div style={{
        opacity: head.op, display: "flex", alignItems: "center", gap: 14 * S,
        background: C.surface, border: `1px solid ${C.blueBorder}`, borderRadius: 16 * S,
        padding: `${10 * S}px ${24 * S}px`, boxShadow: `0 0 ${30 * S}px rgba(91,143,255,0.12)`,
      }}>
        <span style={{ fontSize: 34 * S }}>📓</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color: C.text }}>Google NotebookLM</span>
      </div>
      <div style={{ display: "flex", gap: 16 * S, justifyContent: "center" }}>
        {feats.map((f, i) => {
          const a = calcActive(f.at, frame, 0.3);
          return (
            <div key={i} style={{
              opacity: a.op, width: 330 * S,
              background: C.surface, border: `1px solid ${a.isOn ? f.color + "55" : C.surfaceBorder}`,
              borderRadius: 16 * S, padding: `${16 * S}px ${18 * S}px`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
              boxShadow: a.isOn ? `0 0 ${24 * S}px ${f.color}1f` : "none",
            }}>
              <div style={{
                width: 60 * S, height: 60 * S, borderRadius: "50%",
                background: `${f.color}1a`, border: `${2 * S}px solid ${f.color}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 * S,
              }}>{f.emoji}</div>
              <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub, textAlign: "center", lineHeight: 1.35 }}>{f.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ opacity: lim.op, display: "flex", gap: 16 * S, justifyContent: "center" }}>
        {limits.map((l, i) => (
          <div key={i} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * S,
            background: C.surface2, border: `1px solid ${C.surfaceBorder}`, borderRadius: 14 * S,
            padding: `${10 * S}px ${22 * S}px`,
          }}>
            <span style={{ fontFamily: F_HEAD, fontSize: 28 * S, fontWeight: 800, color: C.primary }}>{l.v}</span>
            <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.muted }}>{l.u}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_11.scene2.to - SCENES_2026_06_11.scene2.from;
  // local = global - 2250. Phase B 第一句「用 NotebookLM 來舉例」108s → g3240, local 990
  const A_FADE_START = 910;
  const A_REMOVE = 990;
  const B_SHOW_AT = 990;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A (local)
  const A_HEADER = 0;   // g2250 整個流程四步
  const A_S1 = 90;      // g2340 第一步上傳
  const A_S2 = 270;     // g2520 第二步索引
  const A_S3 = 540;     // g2790 第三步提問
  const A_S4 = 720;     // g2970 第四步檢索生成

  // Phase B (local)
  const B_SRC = 1200;   // g3450 只根據上傳來源 (115s)
  const B_CITE = 1290;  // g3540 附引用 (118s)
  const B_REFUSE = 1500;// g3750 沒有就不回答 (125s)
  const B_LIMIT = 1620; // g3870 免費版限制 (129s)

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="完整流程 ／ 4 STEPS" delay={A_HEADER} color={C.blue} />}
            sentence={
              frame >= A_S3
                ? <StageSentence text="前兩步準備資料，後兩步才是問答" delay={A_S3} color={C.blue} />
                : <StageSentence text="整個流程，可以拆成四步" delay={A_HEADER} color={C.text} />
            }
            takeaway={<StageTakeaway text="上傳 → 建立索引 → 提問 → 檢索生成" delay={A_S4} color={C.blue} />}
          >
            <FourSteps s1={A_S1} s2={A_S2} s3={A_S3} s4={A_S4} />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="實際工具 ／ NOTEBOOKLM" delay={B_SHOW_AT} color={C.blue} />}
          sentence={
            frame >= B_REFUSE
              ? <StageSentence text="資料裡沒有，它就不回答" delay={B_REFUSE} color={C.orange} />
              : frame >= B_CITE
              ? <StageSentence text="回答附上可點回原文的引用" delay={B_CITE} color={C.blue} />
              : <StageSentence text="用 Google NotebookLM 來舉例" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="免費版：每本 50 來源、每來源約 50 萬字" delay={B_LIMIT} color={C.blue} />}
        >
          <NotebookHero srcAt={B_SRC} citeAt={B_CITE} refuseAt={B_REFUSE} limitAt={B_LIMIT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 為什麼重要：兩個缺口 + 引用是查證入口 ─────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function GapColumn({ icon, problem, fixIcon, fix, problemAt, fixAt, frame }: {
  icon: string; problem: string; fixIcon: string; fix: string; problemAt: number; fixAt: number; frame: number;
}) {
  const p = calcActive(problemAt, frame, 0.3);
  const f = calcActive(fixAt, frame, 0.28);
  return (
    <div style={{ width: 480 * S, display: "flex", flexDirection: "column", gap: 16 * S }}>
      {/* problem (red) */}
      <div style={{
        opacity: p.op, borderRadius: 20 * S,
        background: p.isOn ? C.redLight : C.surface, border: `1px solid ${p.isOn ? C.redBorder : C.surfaceBorder}`,
        padding: `${18 * S}px ${22 * S}px`, display: "flex", alignItems: "center", gap: 16 * S,
      }}>
        <span style={{ fontSize: 38 * S }}>{icon}</span>
        <span style={{ fontFamily: F_TC, fontSize: 23 * S, fontWeight: 700, color: p.isOn ? C.red : C.textSub, lineHeight: 1.35 }}>{problem}</span>
      </div>
      {/* down arrow */}
      <div style={{ textAlign: "center", opacity: f.op }}>
        <span style={{ fontSize: 30 * S, color: C.primary }}>↓</span>
      </div>
      {/* fix (green) */}
      <div style={{
        opacity: f.op, borderRadius: 20 * S,
        background: C.surface, border: `1px solid ${f.isOn ? C.primaryBorder : C.surfaceBorder}`,
        padding: `${18 * S}px ${22 * S}px`, display: "flex", alignItems: "center", gap: 16 * S,
        boxShadow: f.isOn ? `0 0 ${36 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontSize: 38 * S }}>{fixIcon}</span>
        <span style={{ fontFamily: F_TC, fontSize: 23 * S, fontWeight: 700, color: f.isOn ? C.text : C.textSub, lineHeight: 1.35 }}>{fix}</span>
      </div>
    </div>
  );
}

function TwoGaps({ gap1ProblemAt, gap1FixAt, gap2ProblemAt, gap2FixAt }: {
  gap1ProblemAt: number; gap1FixAt: number; gap2ProblemAt: number; gap2FixAt: number;
}) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 50 * S, justifyContent: "center", alignItems: "flex-start" }}>
      <GapColumn icon="🚫" problem="缺口一：不認識你的私有資料" fixIcon="📎" fix="把私有資料掛上去，AI 才懂你的世界"
        problemAt={gap1ProblemAt} fixAt={gap1FixAt} frame={frame} />
      <GapColumn icon="🌀" problem="缺口二：會一本正經地亂編" fixIcon="🔗" fix="先檢索再生成，答案綁定真實資料＋引用"
        problemAt={gap2ProblemAt} fixAt={gap2FixAt} frame={frame} />
    </div>
  );
}

// Phase B hero: 引用 = 查證的入口（正確用法 vs 錯誤用法）
function CitationGate({ goodAt, badAt, noteAt }: { goodAt: number; badAt: number; noteAt: number }) {
  const frame = useCurrentFrame();
  const center = calcActive(0, frame, 0.4);
  const good = calcActive(goodAt, frame, 0.28);
  const bad = calcActive(badAt, frame, 0.28);
  const note = calcActive(noteAt, frame, 0.3);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * S }}>
      {/* central citation chip */}
      <div style={{
        opacity: center.op, display: "flex", alignItems: "center", gap: 14 * S,
        background: C.surface, border: `1px solid ${C.primaryBorder}`, borderRadius: 18 * S,
        padding: `${12 * S}px ${28 * S}px`, boxShadow: `0 0 ${40 * S}px ${C.primaryGlow}`,
      }}>
        <span style={{ fontSize: 34 * S }}>🔗</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color: C.text }}>引用 ＝ 查證的入口</span>
      </div>
      {/* two usages */}
      <div style={{ display: "flex", gap: 36 * S, justifyContent: "center" }}>
        <div style={{
          opacity: good.op, width: 470 * S, borderRadius: 20 * S,
          background: C.surface, border: `1px solid ${good.isOn ? C.primaryBorder : C.surfaceBorder}`,
          padding: `${18 * S}px ${24 * S}px`, display: "flex", flexDirection: "column", gap: 8 * S,
          boxShadow: good.isOn ? `0 0 ${30 * S}px ${C.primaryGlow}` : "none",
        }}>
          <span style={{ fontFamily: F_BODY, fontSize: 19 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>✓ 負責任的用法</span>
          <span style={{ fontFamily: F_TC, fontSize: 22 * S, color: C.text, lineHeight: 1.4 }}>重要結論，點開原文核對一下</span>
        </div>
        <div style={{
          opacity: bad.op, width: 470 * S, borderRadius: 20 * S,
          background: bad.isOn ? C.redLight : C.surface, border: `1px solid ${bad.isOn ? C.redBorder : C.surfaceBorder}`,
          padding: `${18 * S}px ${24 * S}px`, display: "flex", flexDirection: "column", gap: 8 * S,
        }}>
          <span style={{ fontFamily: F_BODY, fontSize: 19 * S, fontWeight: 700, color: C.red, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>✗ 危險的用法</span>
          <span style={{ fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.4 }}>看到有連結，就照單全收</span>
        </div>
      </div>
      {/* caveat note */}
      <div style={{
        opacity: note.op, display: "flex", alignItems: "center", gap: 12 * S,
        fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.orange,
        background: C.orangeLight, border: `1px solid ${C.orangeBorder}`, borderRadius: 14 * S,
        padding: `${10 * S}px ${22 * S}px`,
      }}>
        ⚠️ 引用降低憑空捏造，但 AI 仍可能誤解或斷章取義
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_11.scene3.to - SCENES_2026_06_11.scene3.from;
  // local = global - 4620. Phase B 第一句「不過要提醒一句」211s → g6330, local 1710
  const A_FADE_START = 1630;
  const A_REMOVE = 1710;
  const B_SHOW_AT = 1710;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A (local)
  const A_HEADER = 0;     // g4620 為什麼這麼重要
  const A_G1P = 240;      // g4860 缺口一不認識私有 (162s)
  const A_G1F = 660;      // g5280 知識庫掛上私有 (176s)
  const A_G2P = 810;      // g5430 缺口二一本正經亂編 (181s)
  const A_G2F = 1080;     // g5700 先檢索再生成綁定 (190s)
  const A_CITE = 1320;    // g5940 附引用追回原文 (198s)
  const A_TRUST = 1560;   // g6180 可溯源可查證才可信 (206s)

  // Phase B (local)
  const B_HEADER = 1710;  // g6330 不過要提醒一句
  const B_NOTE = 1890;    // g6510 引用降低憑空捏造 (217s)
  const B_GOOD = 2160;    // g6780 真正負責任用法 (226s)
  const B_BAD = 2400;     // g7020 照單全收 (234s)
  const B_VERIFY = 2310;  // g6930 點開原文核對 (231s)

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="為什麼重要 ／ TWO GAPS" delay={A_HEADER} color={C.orange} />}
            sentence={
              frame >= A_CITE
                ? <StageSentence text="答案綁定真實資料，還附上引用" delay={A_CITE} color={C.primary} />
                : frame >= A_G2P
                ? <StageSentence text="缺口二：它會一本正經地亂編" delay={A_G2P} color={C.red} />
                : <StageSentence text="知識庫補上通用 AI 的兩個缺口" delay={A_HEADER} color={C.text} />
            }
            takeaway={<StageTakeaway text="可溯源、能查證的答案，才是可信的答案" delay={A_TRUST} color={C.primary} />}
          >
            <TwoGaps gap1ProblemAt={A_G1P} gap1FixAt={A_G1F} gap2ProblemAt={A_G2P} gap2FixAt={A_G2F} />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="重要提醒 ／ THE CAVEAT" delay={B_SHOW_AT} color={C.orange} />}
          sentence={
            frame >= B_GOOD
              ? <StageSentence text="把引用，當成查證的入口" delay={B_GOOD} color={C.primary} />
              : frame >= B_NOTE
              ? <StageSentence text="AI 仍可能誤解、或斷章取義" delay={B_NOTE} color={C.orange} />
              : <StageSentence text="附了引用，不代表你能完全放心" delay={B_HEADER} color={C.text} />
          }
          takeaway={<StageTakeaway text="重要結論，點開原文核對——別照單全收" delay={B_VERIFY} color={C.primary} />}
        >
          <CitationGate goodAt={B_GOOD} badAt={B_BAD} noteAt={B_NOTE} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 4 — 實際怎麼做：三個原則 ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: 原則一 = 照四步走 + 養成看引用的習慣
function PrincipleOne({ steps, habitAt }: { steps: number[]; habitAt: number }) {
  const frame = useCurrentFrame();
  const mini = [
    { emoji: "🧰", label: "選工具" },
    { emoji: "📤", label: "一次上傳" },
    { emoji: "🗂️", label: "等建索引" },
    { emoji: "💬", label: "自然發問" },
    { emoji: "🔗", label: "看引用" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14 * S,
        background: C.surface, border: `1px solid ${C.purpleBorder}`, borderRadius: 16 * S,
        padding: `${10 * S}px ${28 * S}px`, opacity: calcActive(0, frame, 0.4).op,
      }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 30 * S, fontWeight: 800, color: C.purple }}>原則 1</span>
        <span style={{ fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700, color: C.text }}>照著四步走</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
        {mini.map((m, i) => {
          const last = i === mini.length - 1;
          const a = calcActive(steps[i], frame, 0.3);
          const color = last ? C.primary : C.purple;
          return (
            <React.Fragment key={i}>
              <div style={{
                position: "relative", opacity: a.op, width: 168 * S,
                background: C.surface, border: `1px solid ${a.isOn ? color + "66" : C.surfaceBorder}`,
                borderRadius: 16 * S, padding: `${16 * S}px ${10 * S}px`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
                boxShadow: a.isOn ? `0 0 ${24 * S}px ${color}22` : "none",
              }}>
                {a.isOn && <RippleRing activeAt={steps[i]} color={color} radius={16 * S} />}
                <span style={{ fontSize: 34 * S }}>{m.emoji}</span>
                <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: a.isOn ? (last ? C.primary : C.text) : C.textSub }}>{m.label}</span>
              </div>
              {!last && <span style={{ fontSize: 26 * S, color: C.muted, opacity: a.op }}>→</span>}
            </React.Fragment>
          );
        })}
      </div>
      <div style={{
        opacity: calcActive(habitAt, frame, 0).op,
        fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.primary,
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 14 * S,
        padding: `${10 * S}px ${24 * S}px`,
      }}>🔗 一開始就養成「看引用」的習慣</div>
    </div>
  );
}

// Phase B hero: 原則二（資料品質）+ 原則三（隱私授權）
function PrincipleCard({ n, title, color, items, headAt, frame }: {
  n: string; title: string; color: string; items: { t: string; at: number }[]; headAt: number; frame: number;
}) {
  const head = calcActive(headAt, frame, 0.3);
  return (
    <div style={{
      width: 540 * S, borderRadius: 22 * S, opacity: head.op,
      background: C.surface, border: `1px solid ${head.isOn ? color + "55" : C.surfaceBorder}`,
      padding: `${22 * S}px ${26 * S}px`, display: "flex", flexDirection: "column", gap: 14 * S,
      boxShadow: head.isOn ? `0 0 ${36 * S}px ${color}1f` : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
        <div style={{
          width: 56 * S, height: 56 * S, borderRadius: "50%", flexShrink: 0,
          background: C.surface2, border: `1px solid ${color}88`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color,
        }}>{n}</div>
        <span style={{ fontFamily: F_HEAD, fontSize: 25 * S, fontWeight: 700, color: C.text, lineHeight: 1.25 }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
        {items.map((it, i) => {
          const a = calcActive(it.at, frame, 0.3);
          return (
            <div key={i} style={{
              opacity: a.op, display: "flex", alignItems: "center", gap: 12 * S,
              background: C.surface2, border: `1px solid ${a.isOn ? color + "44" : C.surfaceBorder}`,
              borderRadius: 12 * S, padding: `${10 * S}px ${18 * S}px`,
            }}>
              <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 ${8 * S}px ${color}` }} />
              <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 500, color: a.isOn ? C.text : C.textSub, lineHeight: 1.35 }}>{it.t}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrinciplesTwoThree({ p2Head, p2Items, p3Head, p3Items }: {
  p2Head: number; p2Items: { t: string; at: number }[]; p3Head: number; p3Items: { t: string; at: number }[];
}) {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 40 * S, justifyContent: "center", alignItems: "flex-start" }}>
      <PrincipleCard n="2" title="資料品質，決定答案品質" color={C.orange} items={p2Items} headAt={p2Head} frame={frame} />
      <PrincipleCard n="3" title="上傳前，顧好隱私與授權" color={C.purple} items={p3Items} headAt={p3Head} frame={frame} />
    </div>
  );
}

function Scene4() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_11.scene4.to - SCENES_2026_06_11.scene4.from;
  // local = global - 7500. Phase B 第一句「第二，資料品質」284s → g8520, local 1020
  const A_FADE_START = 940;
  const A_REMOVE = 1020;
  const B_SHOW_AT = 1020;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A (local)
  const A_HEADER = 0;    // g7500 懂了之後實際怎麼做
  const A_LOW = 120;     // g7620 門檻低不必寫程式 (254s)
  const A_P1 = 360;      // g7860 第一照四步走 (262s)
  // 5 mini steps: 選工具265 / 上傳268 / 索引271 / 發問274 / 看引用278
  const stepLocals = [450, 540, 630, 720, 840]; // g7950/8040/8130/8220/8340
  const A_HABIT = 930;   // g8430 養成看引用習慣 (281s)

  // Phase B (local)
  const B_P2 = 1020;     // g8520 第二資料品質 (284s)
  const B_P3 = 1770;     // g9270 第三隱私授權 (309s)
  const p2Items = [
    { t: "只根據你給的資料回答", at: 1140 },  // g8640 288s
    { t: "上傳前先確認正確、最新版本", at: 1410 }, // g8910 297s
    { t: "垃圾進、垃圾出——餵錯就答錯", at: 1560 }, // g9060 302s
  ];
  const p3Items = [
    { t: "這份文件可以放上這個服務嗎？", at: 2160 }, // g9660 322s
    { t: "平台會不會拿去做別的用途？", at: 2280 },   // g9780 326s
    { t: "涉及他人或公司機密，先確認有權限", at: 2430 }, // g9930 331s
  ];

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="實際怎麼做 ／ PRINCIPLE 1" delay={A_HEADER} color={C.purple} />}
            sentence={
              frame >= A_P1
                ? <StageSentence text="原則一：照著四步走就好" delay={A_P1} color={C.purple} />
                : frame >= A_LOW
                ? <StageSentence text="門檻已經很低，不必寫程式" delay={A_LOW} color={C.text} />
                : <StageSentence text="那懂了之後，實際該怎麼做？" delay={A_HEADER} color={C.text} />
            }
            takeaway={<StageTakeaway text="一開始就養成看引用的習慣，少踩很多雷" delay={A_HABIT} color={C.primary} />}
          >
            <PrincipleOne steps={stepLocals} habitAt={A_HABIT} />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="實際怎麼做 ／ PRINCIPLE 2 & 3" delay={B_SHOW_AT} color={C.purple} />}
          sentence={
            frame >= B_P3
              ? <StageSentence text="原則三：上傳前顧好隱私與授權" delay={B_P3} color={C.purple} />
              : <StageSentence text="原則二：資料品質決定答案品質" delay={B_P2} color={C.orange} />
          }
          takeaway={<StageTakeaway text="守住資料的界線，是使用知識庫的基本功" delay={B_P3 + 120} color={C.purple} />}
        >
          <PrinciplesTwoThree p2Head={B_P2} p2Items={p2Items} p3Head={B_P3} p3Items={p3Items} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SUMMARY ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function SummaryCard({ number, text, delay, color, top }: {
  number: string; text: string; delay: number; color: string; top: number;
}) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const op = interpolate(f, [0, 16], [0.28, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const numScale = easeOutBack(prog(f, 22));
  return (
    <div style={{
      position: "absolute", left: STAGE_LEFT, right: STAGE_LEFT, top,
      opacity: op, display: "flex", alignItems: "center", gap: 28 * S,
      background: C.surface, border: `1px solid ${C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${18 * S}px ${34 * S}px`,
      boxShadow: `0 0 ${50 * S}px ${color}14`,
    }}>
      <div style={{
        flexShrink: 0, width: 72 * S, height: 72 * S, borderRadius: "50%",
        transform: `scale(${Math.max(0.6, numScale)})`,
        background: C.surface2, border: `1px solid ${color}66`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F_HEAD, fontSize: 30 * S, color, fontWeight: 800,
        boxShadow: `0 0 ${20 * S}px ${color}33`,
      }}>{number}</div>
      <div style={{ fontFamily: F_TC, fontSize: 23 * S, color: C.text, fontWeight: 700, lineHeight: 1.45 }}>{text}</div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_11.summary.to - SCENES_2026_06_11.summary.from;
  // local = global - 10110
  const BADGE_AT = 30;   // g10140 來做重點整理 (338s)
  const C1_AT = 120;     // g10230 第一 (341s)
  const C2_AT = 420;     // g10530 第二 (351s)
  const C3_AT = 690;     // g10800 第三 (360s)
  const PRACTICE_AT = 1050; // g11160 最後小練習 (372s)
  const OUTRO_AT = 1920; // g12030 這裡是每日AI知識庫 (401s)

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);
  const practice = calcActive(PRACTICE_AT, frame, 0.28);
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
            <WordReveal text="今日重點整理" startFrame={BADGE_AT + 4} staggerPerWord={5}
              fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
          </span>
        </div>
      </AbsoluteFill>

      <SummaryCard number="01" delay={C1_AT} color={C.primary} top={300}
        text="知識庫是什麼——用 RAG 先檢索、再生成，讓 AI 只根據你上傳的文件回答，並附上引用" />
      <SummaryCard number="02" delay={C2_AT} color={C.blue} top={640}
        text="為什麼重要——一次補上通用 AI 不懂你的私有資料、又會幻覺亂編這兩大缺口" />
      <SummaryCard number="03" delay={C3_AT} color={C.orange} top={980}
        text="要記得——引用是查證入口不是免死金牌；資料品質決定答案品質；上傳前先顧好隱私授權" />

      {/* practice CTA */}
      <div style={{
        position: "absolute", left: STAGE_LEFT, right: STAGE_LEFT, top: 1330,
        opacity: practice.op, display: "flex", alignItems: "center", gap: 18 * S,
        background: C.surface, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 22 * S, padding: `${18 * S}px ${34 * S}px`,
        boxShadow: `0 0 ${50 * S}px ${C.primaryGlow}`,
      }}>
        <span style={{ fontSize: 40 * S, flexShrink: 0 }}>🧪</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 * S }}>
          <span style={{ fontFamily: F_BODY, fontSize: 19 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>今日小練習</span>
          <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text, lineHeight: 1.45 }}>
            上傳一份熟悉的文件，問三個你已知答案的問題，對照它的回答與引用準不準
          </span>
        </div>
      </div>

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
export function VideoComposition_2026_06_11() {
  const frame = useCurrentFrame();
  const T = SCENES_2026_06_11.title;
  const S1 = SCENES_2026_06_11.scene1;
  const S2 = SCENES_2026_06_11.scene2;
  const S3 = SCENES_2026_06_11.scene3;
  const S4 = SCENES_2026_06_11.scene4;
  const SU = SCENES_2026_06_11.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Main narration */}
      <Audio src={staticFile("audio/2026-06-11-processed.wav")} volume={1.0} />

      {/* Background music (0.10 vol, fade in/out) */}
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_06_11 - 150, TOTAL_FRAMES_2026_06_11], [v, 0], {
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
