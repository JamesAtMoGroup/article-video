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
// Title:   0s        → 0      hook: 老闆要簡報明天 8 點交 + 生產線預告
// Scene1:  24s       → 720    AI 做簡報像生產線（四道工序）+ Copilot 實例
// Scene2:  133s      → 3990   為什麼重要：餵原料 / 把關 / 等多久
// Scene3:  243s      → 7290   怎麼實際用：拆工序 / 餵原料 / 設檢查點
// Summary: 319s      → 9570   重點整理
// End:     390.28s(audio) → 11720
export const SCENES_2026_06_10 = {
  title: { from: 0, to: 720 },
  scene1: { from: 720, to: 3990 },
  scene2: { from: 3990, to: 7290 },
  scene3: { from: 7290, to: 9570 },
  summary: { from: 9570, to: 11720 },
} as const;
export const TOTAL_FRAMES_2026_06_10 = 11720;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "AI 生產線", start: 720 },
  { label: "為什麼重要", start: 3990 },
  { label: "怎麼實際用", start: 7290 },
  { label: "重點整理", start: 9570 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene1 結尾「先想一想」121s → 3630
  { from: 3630, to: 3990, sender: "想一想", text: "你過去以為 AI 一鍵生成的東西，如果拆成幾道工序，你覺得是哪一站最常出問題？" },
  // Scene2 結尾「再想一想」231s → 6930
  { from: 6930, to: 7290, sender: "想一想", text: "AI 一鍵生出簡報後，你會直接交給老闆，還是先當一次品管員、逐頁檢查它有沒有寫錯？" },
  // Summary 小練習 357s → 10710
  { from: 10710, to: 11670, sender: "親身經歷", text: "挑一件最近要做的成品，花三分鐘把它拆成四道工序，再標出哪幾站交給 AI、哪幾站你親自把關。" },
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

// dim → bright tied to a VTT cue (pure: pass frame in) ──────────────────────
function calcActive(activeAt: number, frame: number, dim = 0.28) {
  const dimF = Math.max(0, frame - activeAt);
  const t = interpolate(dimF, [0, 22], [dim, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
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
function RippleRingRect({ activeAt, color, radius = 20 * S }: { activeAt: number; color: string; radius?: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - activeAt);
  if (f > 28) return null;
  const scale = interpolate(f, [0, 24], [0.85, 1.5], { easing: E.outExpo, extrapolateRight: "clamp" });
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

// ═══════════════════════════════════════════════════════════════════════════
// ── ProductionLine — the core metaphor (reusable) ────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
const STATIONS = [
  { icon: "📥", num: "01", label: "理解需求", sub: "蒐集原料", color: C.primary },
  { icon: "📝", num: "02", label: "內容草稿", sub: "重點與段落", color: C.blue },
  { icon: "🎨", num: "03", label: "排版視覺化", sub: "版型與圖片", color: C.purple },
  { icon: "✅", num: "04", label: "產出成品", sub: "可再微調", color: C.orange },
] as const;

function StationBox({ idx, box, showSub, activeAt }: {
  idx: number; box: number; showSub: boolean; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const st = STATIONS[idx];
  const a = calcActive(activeAt, frame, 0.3);
  const sc = easeOutBack(prog(Math.max(0, frame - activeAt), 22));
  return (
    <div style={{
      position: "relative", width: box, opacity: a.op,
      transform: `scale(${a.isOn ? Math.max(0.9, Math.min(1, sc)) : 0.92})`,
      background: C.surface, border: `1px solid ${a.isOn ? st.color + "66" : C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${16 * S}px ${10 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
      boxShadow: a.isOn ? `0 0 ${30 * S}px ${st.color}1f` : "none",
    }}>
      {a.isOn && <RippleRingRect activeAt={activeAt} color={st.color} radius={20 * S} />}
      <span style={{
        fontFamily: F_HEAD, fontWeight: 800, fontSize: 18 * S,
        color: a.isOn ? st.color : C.muted, letterSpacing: "0.08em",
      }}>第 {st.num.slice(1)} 站</span>
      <div style={{
        width: 78 * S, height: 78 * S, borderRadius: "50%",
        background: `${st.color}1a`, border: `${2 * S}px solid ${a.isOn ? st.color : C.surfaceBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 * S,
        boxShadow: a.isOn ? `0 0 ${18 * S}px ${st.color}55` : "none",
      }}>{st.icon}</div>
      <span style={{
        fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700,
        color: a.isOn ? C.text : C.textSub, textAlign: "center", lineHeight: 1.2,
      }}>{st.label}</span>
      {showSub && (
        <span style={{
          fontFamily: F_TC, fontSize: 18 * S, color: a.isOn ? C.textSub : C.muted, textAlign: "center",
        }}>{st.sub}</span>
      )}
    </div>
  );
}

function FlowArrow({ activeAt, box = 36 }: { activeAt: number; box?: number }) {
  const frame = useCurrentFrame();
  const a = calcActive(activeAt, frame, 0.25);
  return (
    <span style={{
      fontFamily: F_BODY, fontSize: box * S, color: a.isOn ? C.primary : C.muted,
      opacity: a.op, flexShrink: 0, lineHeight: 1,
    }}>→</span>
  );
}

function ProductionLine({ box, showSub, activeAts, arrowSize }: {
  box: number; showSub: boolean; activeAts: number[]; arrowSize?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S }}>
      {STATIONS.map((_, i) => (
        <React.Fragment key={i}>
          <StationBox idx={i} box={box} showSub={showSub} activeAt={activeAts[i]} />
          {i < STATIONS.length - 1 && <FlowArrow activeAt={activeAts[i + 1]} box={arrowSize} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_10.title.to - SCENES_2026_06_10.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(40);
  const tagStyle = useFadeUp(60);
  const lineStyle = useFadeUp(90);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));

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

        <h1 style={{ margin: 0, lineHeight: 1.15, fontFamily: F_HEAD, fontWeight: 800, fontSize: 38 * S, color: C.text }}>
          <WordReveal text="老闆要簡報，明天 8 點交？" startFrame={10} staggerPerWord={5}
            fontSize={38 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>
        <h1 style={{ margin: 0, lineHeight: 1.2, marginTop: 6 * S, fontFamily: F_HEAD, fontWeight: 800, fontSize: 32 * S, color: C.primary }}>
          <WordReveal text="AI 生產線拆解" startFrame={28} staggerPerWord={6}
            fontSize={32 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 18 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          AI 做簡報不是一鍵魔術，而是一條生產線
        </p>

        {/* central teaser — the four-station production line forms */}
        <div style={{ ...lineStyle, marginTop: 36 * S }}>
          <ProductionLine box={156 * S} showSub={false} arrowSize={30}
            activeAts={[510, 555, 600, 645]} />
        </div>

        <div style={{ ...tagStyle, marginTop: 30 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>輸入 · 草稿 · 排版 · 成品 · AI 素養</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — AI 做簡報像生產線 + Microsoft 365 Copilot 實例 ─────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase B hero — Word 文件 → Copilot → 整份簡報草稿
function CopilotFlow({ docAt, copilotAt, slidesAt, accumAt, errAt }: {
  docAt: number; copilotAt: number; slidesAt: number; accumAt: number; errAt: number;
}) {
  const frame = useCurrentFrame();
  const doc = calcActive(docAt, frame, 0.3);
  const cop = calcActive(copilotAt, frame, 0.3);
  const slides = calcActive(slidesAt, frame, 0.3);
  const accum = calcActive(accumAt, frame, 0.28);
  const err = calcActive(errAt, frame, 0.28);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * S }}>
      {/* doc → copilot → slides */}
      <div style={{ display: "flex", alignItems: "center", gap: 22 * S }}>
        {/* Word doc */}
        <div style={{
          opacity: doc.op, width: 300 * S, height: 260 * S, borderRadius: 20 * S,
          background: C.surface, border: `1px solid ${doc.isOn ? C.blueBorder : C.surfaceBorder}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 * S,
          boxShadow: doc.isOn ? `0 0 ${28 * S}px ${C.blue}1f` : "none",
        }}>
          <span style={{ fontSize: 64 * S }}>📄</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: C.text }}>Word 文件</span>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub }}>標題 · 大綱 · 表格</span>
        </div>

        {/* arrow + copilot badge */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S }}>
          <div style={{
            opacity: cop.op,
            background: C.primaryLight, border: `1px solid ${cop.isOn ? C.primaryBorder : C.surfaceBorder}`,
            borderRadius: 14 * S, padding: `${10 * S}px ${18 * S}px`,
            display: "flex", alignItems: "center", gap: 10 * S,
            boxShadow: cop.isOn ? `0 0 ${24 * S}px ${C.primaryGlow}` : "none",
          }}>
            <span style={{ fontSize: 30 * S }}>⚙️</span>
            <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 700, color: C.primary, whiteSpace: "nowrap" as const }}>M365 Copilot</span>
          </div>
          <span style={{ fontFamily: F_BODY, fontSize: 44 * S, color: cop.isOn ? C.primary : C.muted, opacity: cop.op, lineHeight: 0.8 }}>→</span>
        </div>

        {/* slides deck */}
        <div style={{
          opacity: slides.op, width: 340 * S, height: 260 * S, borderRadius: 20 * S,
          background: C.surface, border: `1px solid ${slides.isOn ? C.primaryBorder : C.surfaceBorder}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 * S,
          boxShadow: slides.isOn ? `0 0 ${36 * S}px ${C.primaryGlow}` : "none",
        }}>
          <div style={{ display: "flex", gap: 8 * S }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 64 * S, height: 44 * S, borderRadius: 6 * S,
                background: C.surface2, border: `1px solid ${C.primaryBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 * S,
              }}>📊</div>
            ))}
          </div>
          <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: C.text }}>整份簡報草稿</span>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub }}>投影片 · 講者備忘稿</span>
        </div>
      </div>

      {/* 關鍵心法 chips */}
      <div style={{ display: "flex", gap: 20 * S, justifyContent: "center" }}>
        <div style={{
          opacity: accum.op, display: "flex", alignItems: "center", gap: 12 * S,
          background: C.primaryLight, border: `1px solid ${accum.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 14 * S, padding: `${12 * S}px ${22 * S}px`,
        }}>
          <span style={{ fontSize: 26 * S }}>✅</span>
          <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: accum.isOn ? C.text : C.textSub }}>每一站都順，成品才會好</span>
        </div>
        <div style={{
          opacity: err.op, display: "flex", alignItems: "center", gap: 12 * S,
          background: C.redLight, border: `1px solid ${err.isOn ? C.redBorder : C.surfaceBorder}`,
          borderRadius: 14 * S, padding: `${12 * S}px ${22 * S}px`,
        }}>
          <span style={{ fontSize: 26 * S }}>⚠️</span>
          <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: err.isOn ? C.text : C.textSub }}>一站出錯，一路帶到成品</span>
        </div>
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_10.scene1.to - SCENES_2026_06_10.scene1.from;
  // local = global - 720. Phase B 第一句「這不是空想」77s → 2310, local 1590
  const A_FADE_START = 1510;
  const A_REMOVE = 1590;
  const B_SHOW_AT = 1590;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions / station activations (local)
  const HEADER_AT = 0;   // g720  很多人以為一鍵魔術 (24s)
  const META_AT = 150;   // g870  其實不是，更像生產線 (29s)
  const SPLIT_AT = 390;  // g1110 拆成前後相連的工序 (37s)
  const ST1 = 690;       // g1410 第一站 (47s)
  const ST2 = 960;       // g1680 第二站 (56s)
  const ST3 = 1170;      // g1890 第三站 (63s)
  const ST4 = 1380;      // g2100 第四站 (70s)

  // Phase B captions (local)
  const COPILOT_AT = 1650; // g2370 微軟 Copilot (79s)
  const DOC_AT = 1860;     // g2580 依照 Word 文件 (86s)
  const SLIDES_AT = 2040;  // g2760 建立投影片 (92s)
  const KEYIDEA_AT = 2460; // g3180 關鍵心法 (106s)
  const ACCUM_AT = 2520;   // g3240 每一站累積 (108s)
  const ERR_AT = 2790;     // g3510 一站出錯帶到成品 (117s)

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A — the four-station production line ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="AI 生產線 ／ THE PIPELINE" delay={HEADER_AT} color={C.primary} />}
            sentence={
              frame >= SPLIT_AT
                ? <StageSentence text="把成品拆成一道道相連的工序" delay={SPLIT_AT} color={C.text} />
                : frame >= META_AT
                ? <StageSentence text="它更像一條工廠的生產線" delay={META_AT} color={C.primary} />
                : <StageSentence text="AI 做簡報，不是一鍵魔術" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="輸入 → 草稿 → 排版 → 成品，一站接一站跑出來" delay={ST4} color={C.primary} />}
          >
            <ProductionLine box={200 * S} showSub arrowSize={36}
              activeAts={[ST1, ST2, ST3, ST4]} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B — Microsoft 365 Copilot 實例 ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="現成例子 ／ COPILOT" delay={B_SHOW_AT} color={C.blue} />}
          sentence={
            frame >= KEYIDEA_AT
              ? <StageSentence text="成品好壞，是每道工序累積出來的" delay={KEYIDEA_AT} color={C.primary} fontSize={26 * S} />
              : <StageSentence text="這不是空想，微軟 Copilot 就在做" delay={B_SHOW_AT} color={C.text} fontSize={26 * S} />
          }
          takeaway={<StageTakeaway text="一份文件進、一整份簡報出，正是一條生產線" delay={SLIDES_AT} color={C.blue} />}
        >
          <CopilotFlow docAt={DOC_AT} copilotAt={COPILOT_AT} slidesAt={SLIDES_AT} accumAt={ACCUM_AT} errAt={ERR_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 為什麼重要：餵原料 / 把關 / 等多久 ─────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function ReasonCard({ num, icon, title, color, titleAt, sub1, sub1At, sub2, sub2At }: {
  num: string; icon: string; title: string; color: string; titleAt: number;
  sub1: string; sub1At: number; sub2: string; sub2At: number;
}) {
  const frame = useCurrentFrame();
  // card itself present-dim from scene start; title brightens at titleAt
  const card = calcActive(titleAt, frame, 0.32);
  const s1 = calcActive(sub1At, frame, 0.28);
  const s2 = calcActive(sub2At, frame, 0.28);
  return (
    <div style={{
      position: "relative", width: 280 * S, opacity: Math.max(0.32, card.op),
      background: C.surface, border: `1px solid ${card.isOn ? color + "66" : C.surfaceBorder}`,
      borderRadius: 24 * S, padding: `${22 * S}px ${20 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      boxShadow: card.isOn ? `0 0 ${36 * S}px ${color}1f` : "none",
    }}>
      {card.isOn && <RippleRingRect activeAt={titleAt} color={color} radius={24 * S} />}
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
        <div style={{
          width: 72 * S, height: 72 * S, borderRadius: "50%", flexShrink: 0,
          background: `${color}1a`, border: `${2 * S}px solid ${card.isOn ? color : C.surfaceBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 * S,
        }}>{icon}</div>
        <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color }}>{num}</span>
      </div>
      <span style={{
        fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700,
        color: card.isOn ? C.text : C.textSub, textAlign: "center", lineHeight: 1.3,
      }}>{title}</span>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 * S }}>
        <div style={{
          opacity: s1.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.surface2, border: `1px solid ${s1.isOn ? color + "44" : C.surfaceBorder}`,
          borderRadius: 12 * S, padding: `${9 * S}px ${16 * S}px`,
        }}>
          <span style={{ color, fontSize: 20 * S, flexShrink: 0 }}>›</span>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: s1.isOn ? C.text : C.textSub, lineHeight: 1.35 }}>{sub1}</span>
        </div>
        <div style={{
          opacity: s2.op, display: "flex", alignItems: "center", gap: 10 * S,
          background: C.surface2, border: `1px solid ${s2.isOn ? color + "44" : C.surfaceBorder}`,
          borderRadius: 12 * S, padding: `${9 * S}px ${16 * S}px`,
        }}>
          <span style={{ color, fontSize: 20 * S, flexShrink: 0 }}>›</span>
          <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: s2.isOn ? C.text : C.textSub, lineHeight: 1.35 }}>{sub2}</span>
        </div>
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_10.scene2.to - SCENES_2026_06_10.scene2.from;
  // local = global - 3990
  const HEADER_AT = 0;    // g3990 那把成品看成生產線 (133s)
  const WHY_AT = 150;     // g4140 因為改變協作方式 (138s)
  const R1_AT = 240;      // g4230 第一 (141s)
  const R1S1 = 480;       // g4470 只丟一句空泛 (149s)
  const R1S2 = 720;       // g4710 餵 Word 大綱 (157s)
  const R2_AT = 1170;     // g5160 第二 (172s)
  const R2S1 = 1590;      // g5580 寫錯數字/編造案例 (186s)
  const R2S2 = 2070;      // g6060 人的責任 (202s)
  const R3_AT = 2280;     // g6270 第三 (209s)
  const R3S1 = 2430;      // g6420 工序越多越久 (214s)
  const R3S2 = 2760;      // g6750 判斷哪些交給 AI (225s)
  const TAKE_AT = 1170;   // g5160

  return (
    <SceneFade durationInFrames={dur}>
      <HeroFrame
        eyebrow={<StageEyebrow label="為什麼重要 ／ WHY IT MATTERS" delay={HEADER_AT} color={C.primary} />}
        sentence={
          frame >= R3_AT
            ? <StageSentence text="原因三：合理預期它要跑多久" delay={R3_AT} color={C.blue} fontSize={26 * S} />
            : frame >= R2_AT
            ? <StageSentence text="原因二：知道該在哪一站把關" delay={R2_AT} color={C.orange} fontSize={26 * S} />
            : frame >= R1_AT
            ? <StageSentence text="原因一：知道該餵什麼原料" delay={R1_AT} color={C.primary} fontSize={26 * S} />
            : <StageSentence text="把成品看成生產線，為什麼重要？" delay={HEADER_AT} color={C.text} fontSize={26 * S} />
        }
        takeaway={<StageTakeaway text="看懂工序，你跟 AI 協作的方式就完全不同" delay={TAKE_AT} color={C.primary} />}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 24 * S }}>
          <ReasonCard num="01" icon="📥" title="該餵什麼原料" color={C.primary} titleAt={R1_AT}
            sub1="一句話 → 空泛內容" sub1At={R1S1}
            sub2="給大綱 → 草稿貼題" sub2At={R1S2} />
          <ReasonCard num="02" icon="🔍" title="該在哪一站把關" color={C.orange} titleAt={R2_AT}
            sub1="可能寫錯數字、編案例" sub1At={R2S1}
            sub2="事實查核仍是人的責任" sub2At={R2S2} />
          <ReasonCard num="03" icon="⏱️" title="要等它跑多久" color={C.blue} titleAt={R3_AT}
            sub1="工序越多 → 跑得越久" sub1At={R3S1}
            sub2="判斷哪些任務交給它" sub2At={R3S2} />
        </div>
      </HeroFrame>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 怎麼實際用：拆工序 / 餵原料 / 設檢查點 ─────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function StepCard({ num, icon, title, sub, color, titleAt, subAt }: {
  num: string; icon: string; title: string; sub: string; color: string; titleAt: number; subAt: number;
}) {
  const frame = useCurrentFrame();
  const card = calcActive(titleAt, frame, 0.32);
  const s = calcActive(subAt, frame, 0.28);
  return (
    <div style={{
      position: "relative", width: 280 * S, opacity: Math.max(0.32, card.op),
      background: C.surface, border: `1px solid ${card.isOn ? color + "66" : C.surfaceBorder}`,
      borderRadius: 24 * S, padding: `${24 * S}px ${20 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
      boxShadow: card.isOn ? `0 0 ${36 * S}px ${color}1f` : "none",
    }}>
      {card.isOn && <RippleRingRect activeAt={titleAt} color={color} radius={24 * S} />}
      <div style={{
        width: 96 * S, height: 96 * S, borderRadius: "50%",
        background: `${color}1a`, border: `${2 * S}px solid ${card.isOn ? color : C.surfaceBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46 * S,
        boxShadow: card.isOn ? `0 0 ${20 * S}px ${color}55` : "none",
      }}>{icon}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S }}>
        <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 20 * S, color, letterSpacing: "0.1em" }}>{num}</span>
        <span style={{ fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700, color: card.isOn ? C.text : C.textSub, textAlign: "center", lineHeight: 1.25, whiteSpace: "nowrap" as const }}>{title}</span>
      </div>
      <div style={{
        opacity: s.op, width: "100%",
        background: C.surface2, border: `1px solid ${s.isOn ? color + "44" : C.surfaceBorder}`,
        borderRadius: 12 * S, padding: `${10 * S}px ${16 * S}px`,
        fontFamily: F_TC, fontSize: 19 * S, color: s.isOn ? C.text : C.textSub,
        textAlign: "center", lineHeight: 1.4,
      }}>{sub}</div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_10.scene3.to - SCENES_2026_06_10.scene3.from;
  // local = global - 7290
  const HEADER_AT = 0;    // g7290 那懂了之後怎麼實際用 (243s)
  const CONTROL_AT = 270; // g7560 變成你能掌控的生產線 (252s)
  const S1_AT = 390;      // g7680 第一 先拆工序 (256s)
  const S1_SUB = 930;     // g8220 哪幾站交給 AI (274s)
  const S2_AT = 1080;     // g8370 第二 餵好原料 (279s)
  const S2_SUB = 1320;    // g8610 大綱/Word/重點 (287s)
  const S3_AT = 1680;     // g8970 第三 設檢查點 (299s)
  const S3_SUB = 1860;    // g9150 排版看重點 (305s)
  const TAKE_AT = 1080;   // g8370

  return (
    <SceneFade durationInFrames={dur}>
      <HeroFrame
        eyebrow={<StageEyebrow label="怎麼實際用 ／ HOW TO" delay={HEADER_AT} color={C.orange} />}
        sentence={
          frame >= S1_AT
            ? <StageSentence text="三步驟，把急件變你能掌控的生產線" delay={S1_AT} color={C.text} fontSize={26 * S} />
            : frame >= CONTROL_AT
            ? <StageSentence text="別硬要 AI 一步到位" delay={CONTROL_AT} color={C.orange} />
            : <StageSentence text="懂了之後，怎麼實際用？" delay={HEADER_AT} color={C.text} />
        }
        takeaway={<StageTakeaway text="拆完之後你會發現，急件其實沒那麼可怕" delay={TAKE_AT} color={C.orange} />}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 24 * S }}>
          <StepCard num="01" icon="🧩" title="先拆工序，再開工" color={C.primary} titleAt={S1_AT}
            sub="動手前先把任務拆成幾站，再決定哪幾站交給 AI、哪幾站自己來" subAt={S1_SUB} />
          <StepCard num="02" icon="📥" title="第一站就餵好原料" color={C.blue} titleAt={S2_AT}
            sub="與其讓 AI 從零發想，不如先給大綱、Word 文件、必出現的重點" subAt={S2_SUB} />
          <StepCard num="03" icon="✅" title="每一站設檢查點" color={C.orange} titleAt={S3_AT}
            sub="草稿查事實與邏輯、排版看重點，小檢查分散在每一站更省力" subAt={S3_SUB} />
        </div>
      </HeroFrame>
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
  const a = calcActive(activeAt, frame, 0.28);
  return (
    <div style={{
      width: 1040 * S, opacity: a.op,
      background: C.surface, border: `1px solid ${a.isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${18 * S}px ${28 * S}px`,
      display: "flex", alignItems: "center", gap: 24 * S,
      boxShadow: a.isOn ? `0 0 ${40 * S}px ${accent}1f` : "none", position: "relative",
    }}>
      {a.isOn && <RippleRingRect activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 78 * S, height: 78 * S, borderRadius: "50%", flexShrink: 0,
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 * S,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 6 * S }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 22 * S, color: accent }}>{index}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 24 * S, color: a.isOn ? C.text : C.textSub }}>{title}</span>
        </div>
        <div style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, lineHeight: 1.45 }}>{body}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_10.summary.to - SCENES_2026_06_10.summary.from;
  // local = global - 9570
  const BADGE_AT = 0;    // g9570 好來做個重點整理 (319s)
  const CARD1_AT = 90;   // g9660 第一 (322s)
  const CARD2_AT = 450;  // g10020 第二 (334s)
  const CARD3_AT = 720;  // g10290 第三 (343s)
  const OUTRO_AT = 1950; // g11520 我是播報員 (384s)

  const badgeStyle = useFadeIn(BADGE_AT);
  const headFade = useFadeUp(14);
  const outroStyle = useFadeUp(OUTRO_AT);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        paddingTop: CONTENT_TOP + 18 * S, paddingBottom: SUBTITLE_SAFE,
        paddingLeft: 80 * S, paddingRight: 80 * S,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ ...badgeStyle, display: "flex", alignItems: "center", gap: 10 * S }}>
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
          ...headFade, margin: `${8 * S}px 0 ${22 * S}px`,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 32 * S, color: C.text, textAlign: "center",
        }}>AI 生產線，三個重點</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 * S }}>
          <RecapCard index="01" icon="🏭" title="AI 生產線是什麼" accent={C.primary} activeAt={CARD1_AT}
            body="成品是輸入、草稿、排版、成品這幾道工序串起來跑出來的，不是單一神技。" />
          <RecapCard index="02" icon="🧭" title="為什麼重要" accent={C.blue} activeAt={CARD2_AT}
            body="看懂工序，你才知道該餵什麼原料、該在哪一站把關、要等它跑多久。" />
          <RecapCard index="03" icon="🙋" title="要記得的是" accent={C.orange} activeAt={CARD3_AT}
            body="AI 把生產線跑得快，但最後的事實查核與品質把關，仍然是人的責任，再急也不能省。" />
        </div>

        <div style={{ ...outroStyle, marginTop: 28 * S, display: "flex", alignItems: "center", gap: 12 * S }}>
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
// ── Main Composition ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export function VideoComposition_2026_06_10() {
  const frame = useCurrentFrame();
  const Sx = SCENES_2026_06_10;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Main narration */}
      <Audio src={staticFile("audio/2026-06-10-processed.wav")} volume={1.0} />

      {/* Background music (0.10 vol, fade in/out) */}
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_06_10 - 150, TOTAL_FRAMES_2026_06_10], [v, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
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
}
