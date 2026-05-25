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

loadNotoSansTC("normal", { weights: ["400", "700", "900"] });
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
// Title:   0s        → 0     hook + ReAct 命名 (Reasoning + Acting)
// Scene1:  32.92s    → 988   推理/行動/觀察迴圈 + 股價實例 + 人類自然解題
// Scene2:  104.22s   → 3127  為什麼更好：一口氣做太多 vs 推理↔行動對話
// Scene3:  155.3s    → 4659  幕後運作 / 你用的工具都在用 + 可靠≠正確提醒
// Summary: 231.42s   → 6943  重點整理
// End:     268.6s(audio) → 8060
export const SCENES_2026_05_25 = {
  title: { from: 0, to: 988 },
  scene1: { from: 988, to: 3127 },
  scene2: { from: 3127, to: 4659 },
  scene3: { from: 4659, to: 6943 },
  summary: { from: 6943, to: 8060 },
} as const;
export const TOTAL_FRAMES_2026_05_25 = 8060;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "ReAct 迴圈", start: 988 },
  { label: "為什麼更好", start: 3127 },
  { label: "幕後與提醒", start: 4659 },
  { label: "重點整理", start: 6943 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene1 結尾：人類自然解題的疑問 (94.72s「想一下、查一下」)
  { from: 2841, to: 3127, sender: "想一想", text: "你解決陌生問題時，是不是也會『想一下 → 查一下 → 看結果 → 再想』？ReAct 就是把這個過程交給 AI。" },
  // Scene2 結尾：透明可追蹤 (146.3s「追蹤每一步思考」)
  { from: 4389, to: 4659, sender: "想一想", text: "如果能看到 Agent 每一步在想什麼，你會願意一步步檢查它的推理嗎？" },
  // Scene3 結尾：疑問 (221.38s「你會更信任它的最終答案嗎」)
  { from: 6641, to: 6943, sender: "親身經歷", text: "看得到 AI 每一步思考，會讓你更信任它的答案，還是更容易抓到它哪裡錯？" },
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

// ── ContentColumn (kept for spec compliance / reuse) ───────────────────────
function ContentColumn({ children, scrollUp }: {
  children: React.ReactNode;
  scrollUp?: { at: number; amount: number };
}) {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  let scrollY = 0;
  if (scrollUp) {
    const scrollF = Math.max(0, frame - scrollUp.at);
    const p = spring({ frame: scrollF, fps, config: { damping: 200 } });
    scrollY = interpolate(p, [0, 1], [0, -scrollUp.amount], clamp);
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: CONTENT_TOP, left: COL_LEFT,
        width: CONTAINER_W, height: CONTENT_H, overflow: "hidden" as const,
      }}>
        <div style={{ transform: `translateY(${scrollY}px)` }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
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

// ── Active helpers ─────────────────────────────────────────────────────────
function calcActive(activeAt: number, frame: number, dim = 0.25) {
  const dimF = Math.max(0, frame - activeAt);
  const t = easeOutBack(prog(dimF, 22));
  const op = interpolate(t, [0, 1], [dim, 1], clamp);
  return { op: Math.max(dim, Math.min(1, op)), isOn: frame >= activeAt };
}

// ── RippleRing (circular) ──────────────────────────────────────────────────
function RippleRing({ activeAt, color }: { activeAt: number; color: string }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - activeAt);
  if (f > 28) return null;
  const scale = interpolate(f, [0, 24], [0.85, 1.9], { easing: E.outExpo, extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 4, 24, 28], [0, 0.55, 0.2, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", inset: 0,
      border: `${2 * S}px solid ${color}`, borderRadius: "50%",
      transform: `scale(${scale})`, opacity, pointerEvents: "none",
    }} />
  );
}

// ── RippleRing (rounded rect) ──────────────────────────────────────────────
function RippleRingRect({ activeAt, color, radius = 20 * S }: { activeAt: number; color: string; radius?: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - activeAt);
  if (f > 28) return null;
  const scale = interpolate(f, [0, 24], [0.85, 1.6], { easing: E.outExpo, extrapolateRight: "clamp" });
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

// ═══════════════════════════════════════════════════════════════════════════
// ── ReActLoop — reusable Reason → Act → Observe cycle (the core metaphor) ────
// ═══════════════════════════════════════════════════════════════════════════
function ReActLoop({ size, centerLabel, reasonAt, actAt, observeAt, loopAt, centerAt, showSubs = true }: {
  size: number; centerLabel: string;
  reasonAt: number; actAt: number; observeAt: number; loopAt: number; centerAt: number;
  showSubs?: boolean;
}) {
  const frame = useCurrentFrame();
  const BOX = size;
  const cx = BOX / 2;
  const cy = BOX / 2;
  const R = BOX * 0.32;
  const NODE = BOX * 0.225;

  const nodes = [
    { angle: -90, emoji: "💭", label: "推理", sub: "REASON", color: C.primary, at: reasonAt },
    { angle: 30, emoji: "⚡", label: "行動", sub: "ACT", color: C.blue, at: actAt },
    { angle: 150, emoji: "👁", label: "觀察", sub: "OBSERVE", color: C.orange, at: observeAt },
  ];
  // arrowheads at midpoints (clockwise): 推理→行動(-30), 行動→觀察(90), 觀察→推理(210)
  const arrows = [
    { mid: -30, at: actAt },
    { mid: 90, at: observeAt },
    { mid: 210, at: loopAt },
  ];

  const ring = calcActive(loopAt, frame, 0.2);
  const center = calcActive(centerAt, frame, 0.35);
  const centerScale = easeOutBack(prog(Math.max(0, frame - centerAt), 22));
  const centerGlow = 0.5 + 0.5 * Math.sin(frame * 0.06);

  return (
    <div style={{ position: "relative", width: BOX, height: BOX }}>
      {/* loop ring + arrowheads */}
      <svg width={BOX} height={BOX} style={{ position: "absolute", inset: 0, zIndex: 1, overflow: "visible" }}>
        <circle
          cx={cx} cy={cy} r={R}
          fill="none" stroke={C.primary} strokeWidth={3 * S}
          strokeDasharray={`${14 * S} ${12 * S}`}
          opacity={ring.op * 0.7}
        />
        {arrows.map((ar, i) => {
          const rad = (ar.mid * Math.PI) / 180;
          const x = cx + Math.cos(rad) * R;
          const y = cy + Math.sin(rad) * R;
          const a = calcActive(ar.at, frame, 0.15);
          const h = 13 * S;
          return (
            <polygon
              key={i}
              points={`0,${-h} ${-h * 0.72},${h * 0.7} ${h * 0.72},${h * 0.7}`}
              fill={C.primary}
              opacity={a.op}
              transform={`translate(${x},${y}) rotate(${ar.mid + 180})`}
            />
          );
        })}
      </svg>

      {/* nodes */}
      {nodes.map((n, i) => {
        const rad = (n.angle * Math.PI) / 180;
        const x = cx + Math.cos(rad) * R;
        const y = cy + Math.sin(rad) * R;
        const a = calcActive(n.at, frame, 0.28);
        const sc = easeOutBack(prog(Math.max(0, frame - n.at), 22));
        const labelAbove = n.angle === -90;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", zIndex: 5 }}>
            <div style={{
              position: "relative", width: NODE, height: NODE,
              transform: `scale(${Math.max(0.6, a.isOn ? sc : 0.85)})`, opacity: a.op,
            }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: C.surface,
                border: `${2 * S}px solid ${a.isOn ? n.color : C.surfaceBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: NODE * 0.46,
                boxShadow: a.isOn ? `0 0 ${28 * S}px ${n.color}55` : "none",
              }}>{n.emoji}</div>
              {n.at !== undefined && <RippleRing activeAt={n.at} color={n.color} />}
            </div>
            {/* radial chip label */}
            <div style={{
              position: "absolute", left: "50%",
              top: labelAbove ? -NODE / 2 - 18 * S : NODE / 2 + 18 * S,
              transform: "translate(-50%,-50%)", opacity: a.op,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * S,
              background: C.chipBg, border: `1px solid ${C.chipBorder}`,
              borderRadius: 8 * S, padding: `${4 * S}px ${12 * S}px`, whiteSpace: "nowrap" as const,
            }}>
              <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: a.isOn ? n.color : C.textSub }}>{n.label}</span>
              {showSubs && <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.1em" }}>{n.sub}</span>}
            </div>
          </div>
        );
      })}

      {/* center label */}
      <div style={{
        position: "absolute", left: cx, top: cy,
        transform: `translate(-50%,-50%) scale(${Math.max(0.7, center.isOn ? centerScale : 0.85)})`,
        width: BOX * 0.34, height: BOX * 0.34, borderRadius: "50%", zIndex: 6,
        background: C.surface, border: `1px solid ${C.primaryBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" as const,
        fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color: C.primary,
        opacity: center.op,
        boxShadow: `0 0 ${(24 + centerGlow * 20) * S}px rgba(124,255,178,0.25)`, lineHeight: 1.1,
      }}>{centerLabel}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_25.title.to - SCENES_2026_05_25.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(34);
  const tagStyle = useFadeUp(50);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));
  const loopStyle = useFadeUp(90);

  // loop activations tied to VTT (title-local = global):
  // 想 14.34→430 | 做 16.64→499 | 看 18.68→560 | 迴圈 22.52→676 | ReAct 命名 24.82→745
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
          <WordReveal text="AI Agent 怎麼「規劃」任務？" startFrame={10} staggerPerWord={6}
            fontSize={40 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>
        <h1 style={{ margin: 0, lineHeight: 1.2, marginTop: 6 * S, fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary }}>
          <WordReveal text="ReAct 框架簡介" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 18 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          推理 + 行動：讓 AI 一步步把事情做對
        </p>

        {/* central hero loop teaser — forms as the narration previews 想 → 做 → 看 */}
        <div style={{ ...loopStyle, marginTop: 30 * S }}>
          <ReActLoop size={260 * S} centerLabel="ReAct"
            reasonAt={430} actAt={499} observeAt={560} loopAt={676} centerAt={745} showSubs={false} />
        </div>

        <div style={{ ...tagStyle, marginTop: 26 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>ReAct · 推理 · 行動 · 觀察 · AI Agent</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — Reason/Act/Observe loop + 股價 trace ──────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase B hero: vertical ReAct trace of the stock-price example
type TraceType = "reason" | "act" | "observe" | "done";
function PriceTrace({ steps }: { steps: { type: TraceType; text: string; at: number }[] }) {
  const frame = useCurrentFrame();
  const colorOf = (t: TraceType) =>
    t === "reason" ? C.primary : t === "act" ? C.blue : t === "observe" ? C.orange : C.primary;
  const emojiOf = (t: TraceType) =>
    t === "reason" ? "💭" : t === "act" ? "⚡" : t === "observe" ? "👁" : "✅";
  const labelOf = (t: TraceType) =>
    t === "reason" ? "推理" : t === "act" ? "行動" : t === "observe" ? "觀察" : "完成";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 * S, width: 1140 * S }}>
      {steps.map((st, i) => {
        const a = calcActive(st.at, frame, 0.25);
        const tx = interpolate(Math.max(0, frame - st.at), [0, 20], [26 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const col = colorOf(st.type);
        return (
          <div key={i} style={{
            opacity: a.op, transform: `translateX(${tx}px)`,
            display: "flex", alignItems: "center", gap: 16 * S,
            background: C.surface,
            border: `1px solid ${a.isOn ? col + "55" : C.surfaceBorder}`,
            borderRadius: 12 * S, padding: `${5 * S}px ${20 * S}px`,
            boxShadow: a.isOn ? `0 0 ${30 * S}px ${col}14` : "none",
          }}>
            <div style={{
              flexShrink: 0, width: 44 * S, height: 44 * S, borderRadius: 10 * S,
              background: C.surface2, border: `1px solid ${a.isOn ? col + "66" : C.surfaceBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 * S,
            }}>{emojiOf(st.type)}</div>
            <div style={{
              flexShrink: 0, width: 80 * S, fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700,
              color: col, letterSpacing: "0.06em",
            }}>{labelOf(st.type)}</div>
            <div style={{ fontFamily: F_TC, fontSize: 22 * S, color: a.isOn ? C.text : C.textSub, lineHeight: 1.25 }}>{st.text}</div>
          </div>
        );
      })}
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_25.scene1.to - SCENES_2026_05_25.scene1.from;
  // local = global - 988. Phase B 第一句「舉個具體例子」63.18→1895, local 907
  const A_FADE_START = 827;
  const A_REMOVE = 907;
  const B_SHOW_AT = 907;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions / loop activations (local)
  const HEADER_AT = 0; // g988 交替做兩件事
  const REASON_AT = 162; // g1150 第一推理
  const ACT_AT = 397; // g1385 第二行動
  const OBS_AT = 538; // g1526 每次行動之後觀察
  const LOOP_AT = 696; // g1684 形成迴圈

  // Phase B captions (local)
  const HUMAN_AT = 1749; // g2737 你解決陌生問題時是不是也這樣

  const traceSteps: { type: TraceType; text: string; at: number }[] = [
    { type: "reason", text: "我需要先查 Apple 股價的資料", at: 1192 }, // g2180 72.68s
    { type: "act", text: "呼叫股票 API 查詢", at: 1288 }, // g2276 75.88s
    { type: "observe", text: "拿到了每天的股價數字", at: 1357 }, // g2345 78.18s
    { type: "reason", text: "有資料了，接著要計算平均值", at: 1447 }, // g2435 81.18s
    { type: "act", text: "執行計算，得出平均值", at: 1569 }, // g2557 85.22s
    { type: "done", text: "任務完成，可以回答了", at: 1689 }, // g2677 89.22s
  ];

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A hero — the ReAct loop ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="ReAct 迴圈 ／ THE LOOP" delay={HEADER_AT} color={C.primary} />}
            sentence={
              frame >= OBS_AT
                ? <StageSentence text="觀察結果後，再推理、再行動——形成迴圈" delay={OBS_AT} color={C.orange} />
                : frame >= ACT_AT
                ? <StageSentence text="行動：呼叫工具、搜尋資料、執行程式碼" delay={ACT_AT} color={C.blue} />
                : frame >= REASON_AT
                ? <StageSentence text="推理：想清楚現在的狀況、下一步該做什麼" delay={REASON_AT} color={C.primary} />
                : <StageSentence text="ReAct 讓 Agent 每一步都交替做兩件事" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="思考 → 行動 → 觀察 → 再思考，直到任務完成" delay={LOOP_AT} color={C.primary} />}
          >
            <ReActLoop size={262 * S} centerLabel="ReAct"
              reasonAt={REASON_AT} actAt={ACT_AT} observeAt={OBS_AT} loopAt={LOOP_AT} centerAt={HEADER_AT} showSubs />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B hero — 股價 trace ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="實際範例 ／ EXAMPLE" delay={B_SHOW_AT} color={C.blue} />}
          sentence={
            frame >= HUMAN_AT
              ? <StageSentence text="你解題時也是這樣——ReAct 把它搬進 AI Agent" delay={HUMAN_AT} color={C.blue} fontSize={26 * S} />
              : <StageSentence text="假設：查 Apple 股價，再算這個月平均" delay={B_SHOW_AT} color={C.text} fontSize={26 * S} />
          }
          takeaway={<StageTakeaway text="想一下 → 查一下 → 看結果 → 再想，正是人類自然的解題法" delay={1050} color={C.blue} />}
        >
          <PriceTrace steps={traceSteps} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 為什麼更好：一口氣做太多 vs 推理↔行動對話 ─────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: over-eager agent fires a tool chain with no reflection → cascade
function OvereagerChain({ fireAt, noReflectAt, breakAt, cascadeAt }: {
  fireAt: number; noReflectAt: number; breakAt: number; cascadeAt: number;
}) {
  const frame = useCurrentFrame();
  const tools = [0, 1, 2, 3];
  const broken = (i: number) => (i === 2 && frame >= breakAt) || (i === 3 && frame >= cascadeAt);
  const agent = calcActive(fireAt, frame, 0.3);
  const resultBroken = frame >= cascadeAt;
  const resultA = calcActive(cascadeAt - 60, frame, 0.25);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S }}>
      {/* agent */}
      <div style={{
        opacity: agent.op,
        fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: C.text,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${8 * S}px ${24 * S}px`,
      }}>🤖 AI Agent</div>
      {/* tool chain */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 * S }}>
        {tools.map((i) => {
          const at = fireAt + 20 + i * 14; // fast stagger = 一口氣
          const a = calcActive(at, frame, 0.2);
          const isBad = broken(i);
          const col = isBad ? C.red : C.blue;
          return (
            <React.Fragment key={i}>
              <div style={{
                position: "relative", opacity: a.op,
                width: 118 * S, height: 84 * S, borderRadius: 14 * S,
                background: isBad ? C.redLight : C.surface,
                border: `1px solid ${a.isOn ? col + "66" : C.surfaceBorder}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 * S,
                boxShadow: a.isOn && !isBad ? `0 0 ${24 * S}px ${col}1f` : "none",
              }}>
                <span style={{ fontSize: 28 * S }}>{isBad ? "❌" : "⚡"}</span>
                <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: isBad ? C.red : C.textSub, fontWeight: 700 }}>工具 {i + 1}</span>
              </div>
              {i < tools.length - 1 && (
                <span style={{ fontFamily: F_BODY, fontSize: 26 * S, color: C.muted, opacity: a.op }}>→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* no-reflection note */}
      <div style={{
        opacity: calcActive(noReflectAt, frame, 0).op,
        display: "flex", alignItems: "center", gap: 10 * S,
        fontFamily: F_TC, fontSize: 20 * S, color: C.red, fontWeight: 700,
        background: C.redLight, border: `1px solid ${C.redBorder}`,
        borderRadius: 12 * S, padding: `${7 * S}px ${18 * S}px`,
      }}>
        🚫 中間缺少反思和調整
      </div>
      {/* cascade result */}
      <div style={{
        opacity: resultA.op,
        display: "flex", alignItems: "center", gap: 12 * S,
        fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700,
        color: resultBroken ? C.red : C.textSub,
        background: resultBroken ? C.redLight : C.surface,
        border: `1px solid ${resultBroken ? C.redBorder : C.surfaceBorder}`,
        borderRadius: 14 * S, padding: `${10 * S}px ${22 * S}px`,
      }}>
        {resultBroken ? "❌ 後面全部建立在錯誤的基礎上" : "最終結果"}
      </div>
    </div>
  );
}

// Phase B hero: 推理 ↔ 行動 dialogue with self-correction + transparency
function ReasonActDialogue({ baseAt, beforeAt, afterAt, correctAt, transparentAt }: {
  baseAt: number; beforeAt: number; afterAt: number; correctAt: number; transparentAt: number;
}) {
  const frame = useCurrentFrame();
  const reason = calcActive(baseAt, frame, 0.3);
  const act = calcActive(baseAt + 20, frame, 0.3);
  const before = calcActive(beforeAt, frame, 0);
  const after = calcActive(afterAt, frame, 0);
  const correct = calcActive(correctAt, frame, 0);
  const transp = calcActive(transparentAt, frame, 0);

  const Bubble = ({ a, color, label, text, align }: { a: { op: number }; color: string; label: string; text: string; align: "left" | "right" }) => (
    <div style={{
      opacity: a.op, alignSelf: align === "left" ? "flex-start" : "flex-end",
      maxWidth: 560 * S,
      background: C.surface, border: `1px solid ${color}55`, borderRadius: 14 * S,
      padding: `${10 * S}px ${18 * S}px`,
      display: "flex", flexDirection: "column", gap: 2 * S,
    }}>
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color, letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontFamily: F_TC, fontSize: 22 * S, color: C.text, lineHeight: 1.3 }}>{text}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S, width: 1180 * S }}>
      {/* two poles */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 70 * S }}>
        <div style={{
          opacity: reason.op, width: 190 * S, height: 96 * S, borderRadius: 18 * S,
          background: C.surface, border: `1px solid ${reason.isOn ? C.primaryBorder : C.surfaceBorder}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 * S,
          boxShadow: reason.isOn ? `0 0 ${28 * S}px ${C.primaryGlow}` : "none",
        }}>
          <span style={{ fontSize: 30 * S }}>💭</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: C.primary }}>推理</span>
        </div>
        <div style={{ fontFamily: F_BODY, fontSize: 32 * S, color: C.muted }}>⇄</div>
        <div style={{
          opacity: act.op, width: 190 * S, height: 96 * S, borderRadius: 18 * S,
          background: C.surface, border: `1px solid ${act.isOn ? C.blueBorder : C.surfaceBorder}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 * S,
          boxShadow: act.isOn ? `0 0 ${28 * S}px rgba(91,143,255,0.12)` : "none",
        }}>
          <span style={{ fontSize: 30 * S }}>⚡</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: C.blue }}>行動</span>
        </div>
      </div>
      {/* dialogue bubbles */}
      <Bubble a={before} color={C.primary} label="行動前" text="我為什麼要這樣做？" align="left" />
      <Bubble a={after} color={C.blue} label="行動後" text="結果告訴了我什麼？" align="right" />
      {/* self-correction + transparency row */}
      <div style={{ display: "flex", gap: 16 * S, justifyContent: "center", flexWrap: "wrap" as const }}>
        <div style={{
          opacity: correct.op,
          fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.orange,
          background: C.orangeLight, border: `1px solid ${C.orangeBorder}`, borderRadius: 12 * S,
          padding: `${7 * S}px ${18 * S}px`,
        }}>↩ 走偏了 → 下一輪推理修正方向</div>
        <div style={{
          opacity: transp.op,
          fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.primary,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 12 * S,
          padding: `${7 * S}px ${18 * S}px`,
        }}>🔍 每一步思考都看得到</div>
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_25.scene2.to - SCENES_2026_05_25.scene2.from;
  // local = global - 3127. Phase B 第一句「ReAct的核心改進是」123.26→3698, local 571
  const A_FADE_START = 491;
  const A_REMOVE = 571;
  const B_SHOW_AT = 571;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g3127 為什麼這樣做更好
  const TOOMUCH_AT = 210; // g3337 一口氣做太多 (111.22 連續呼叫)
  const NOREFLECT_AT = 301; // g3428 缺少反思 (114.26)
  const BREAK_AT = 391; // g3518 某步驟出問題 (117.26)
  const CASCADE_AT = 451; // g3578 後面建立在錯誤基礎上 (119.26)

  // Phase B captions (local)
  const FIX_AT = 571; // g3698 核心改進
  const DIALOG_AT = 631; // g3758 產生對話 (125.26)
  const BEFORE_AT = 781; // g3908 行動前我為什麼 (130.26)
  const AFTER_AT = 901; // g4028 行動後結果告訴我 (134.26)
  const CORRECT_AT = 1021; // g4148 走偏了修正 (138.26)
  const TRANSP_AT = 1172; // g4299 行為更透明 (143.3)

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A hero — 一口氣做太多 ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="ReAct 之前 ／ THE PROBLEM" delay={HEADER_AT} color={C.red} />}
            sentence={
              frame >= NOREFLECT_AT
                ? <StageSentence text="連續呼叫一堆工具，中間卻缺少反思和調整" delay={NOREFLECT_AT} color={C.red} fontSize={26 * S} />
                : frame >= TOOMUCH_AT
                ? <StageSentence text="舊問題：一口氣做太多" delay={TOOMUCH_AT} color={C.red} />
                : <StageSentence text="為什麼這樣做更好？先看 ReAct 之前的問題" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="一步出錯，後面所有動作都建立在錯誤的基礎上" delay={CASCADE_AT} color={C.red} />}
          >
            <OvereagerChain fireAt={TOOMUCH_AT} noReflectAt={NOREFLECT_AT} breakAt={BREAK_AT} cascadeAt={CASCADE_AT} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B hero — 推理↔行動 對話 ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="核心改進 ／ THE FIX" delay={B_SHOW_AT} color={C.primary} />}
          sentence={
            frame >= TRANSP_AT
              ? <StageSentence text="行為更透明——你能追蹤它的每一步思考" delay={TRANSP_AT} color={C.primary} fontSize={26 * S} />
              : frame >= CORRECT_AT
              ? <StageSentence text="走偏了，就在下一輪推理時修正方向" delay={CORRECT_AT} color={C.primary} fontSize={26 * S} />
              : <StageSentence text="核心改進：讓推理和行動之間產生對話" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="看得到每一步推理——好除錯、也好驗證" delay={TRANSP_AT} color={C.primary} />}
        >
          <ReasonActDialogue baseAt={DIALOG_AT} beforeAt={BEFORE_AT} afterAt={AFTER_AT} correctAt={CORRECT_AT} transparentAt={TRANSP_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 幕後運作 / 你用的工具都在用 + 可靠≠正確 ──────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: tools you already use, with ReAct reasoning surfacing behind them
function BehindScenes({ toolsAt, q1At, q2At, q3At }: {
  toolsAt: number; q1At: number; q2At: number; q3At: number;
}) {
  const frame = useCurrentFrame();
  const tools = [
    { emoji: "🤖", label: "Claude" },
    { emoji: "💬", label: "ChatGPT" },
    { emoji: "⚙️", label: "AI Agent 工具" },
  ];
  const quotes = [
    { text: "「讓我先查一下…」", at: q1At },
    { text: "「好，現在我知道了…」", at: q2At },
    { text: "「下一步我應該…」", at: q3At },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S, width: 1180 * S }}>
      {/* tools row */}
      <div style={{ display: "flex", gap: 20 * S, justifyContent: "center" }}>
        {tools.map((t, i) => {
          const at = toolsAt + i * 30;
          const a = calcActive(at, frame, 0.25);
          return (
            <div key={i} style={{
              opacity: a.op, width: 240 * S, height: 96 * S, borderRadius: 18 * S,
              background: C.surface, border: `1px solid ${a.isOn ? C.orangeBorder : C.surfaceBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12 * S,
              boxShadow: a.isOn ? `0 0 ${24 * S}px rgba(255,159,67,0.14)` : "none",
            }}>
              <span style={{ fontSize: 32 * S }}>{t.emoji}</span>
              <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: C.text }}>{t.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.orange, letterSpacing: "0.08em" }}>
        背後都在跑類似 ReAct 的推理步驟 ↓
      </div>
      {/* reasoning quotes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S, width: 760 * S }}>
        {quotes.map((q, i) => {
          const a = calcActive(q.at, frame, 0.22);
          const tx = interpolate(Math.max(0, frame - q.at), [0, 20], [26 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: a.op, transform: `translateX(${tx}px)`,
              display: "flex", alignItems: "center", gap: 12 * S,
              background: C.surface, border: `1px solid ${a.isOn ? C.primaryBorder : C.surfaceBorder}`,
              borderRadius: 12 * S, padding: `${8 * S}px ${20 * S}px`,
            }}>
              <span style={{ color: C.primary, fontSize: 22 * S }}>💭</span>
              <span style={{ fontFamily: F_TC, fontSize: 22 * S, color: a.isOn ? C.text : C.textSub, fontWeight: 700 }}>{q.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Phase B hero: 可靠 (clean trace) vs 正確 (answer may still be wrong) → human verify
function ReliableVsCorrect({ reliableAt, correctAt, reasonsAt, wrongAt, humanAt }: {
  reliableAt: number; correctAt: number; reasonsAt: number; wrongAt: number; humanAt: number;
}) {
  const frame = useCurrentFrame();
  const rel = calcActive(reliableAt, frame, 0.28);
  const cor = calcActive(correctAt, frame, 0.28);
  const reasons = calcActive(reasonsAt, frame, 0);
  const wrong = frame >= wrongAt;
  const human = calcActive(humanAt, frame, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S, width: 1180 * S }}>
      <div style={{ display: "flex", gap: 36 * S, justifyContent: "center", alignItems: "stretch" }}>
        {/* 可靠 */}
        <div style={{
          opacity: rel.op, width: 480 * S, borderRadius: 20 * S,
          background: C.surface, border: `1px solid ${rel.isOn ? C.primaryBorder : C.surfaceBorder}`,
          padding: `${20 * S}px ${24 * S}px`, display: "flex", flexDirection: "column", gap: 12 * S,
          boxShadow: rel.isOn ? `0 0 ${40 * S}px ${C.primaryGlow}` : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 * S, fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
            <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary, boxShadow: `0 0 ${8 * S}px ${C.primary}` }} />可靠
          </div>
          <div style={{ fontFamily: F_TC, fontSize: 22 * S, color: C.text, lineHeight: 1.4 }}>✓ 步驟完整<br />✓ 推理清晰、每步有依據</div>
        </div>
        {/* 正確？ */}
        <div style={{
          opacity: cor.op, width: 480 * S, borderRadius: 20 * S,
          background: wrong ? C.redLight : C.surface, border: `1px solid ${wrong ? C.redBorder : (cor.isOn ? C.orangeBorder : C.surfaceBorder)}`,
          padding: `${20 * S}px ${24 * S}px`, display: "flex", flexDirection: "column", gap: 12 * S,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 * S, fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 700, color: wrong ? C.red : C.orange, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
            <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: wrong ? C.red : C.orange, boxShadow: `0 0 ${8 * S}px ${wrong ? C.red : C.orange}` }} />正確？
          </div>
          <div style={{ opacity: reasons.op, fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.4 }}>
            資訊錯誤 · 任務理解偏差
          </div>
          <div style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: wrong ? C.red : C.muted, lineHeight: 1.4 }}>
            {wrong ? "❌ 仍可能給出錯誤的最終結果" : "最終結果未必正確"}
          </div>
        </div>
      </div>
      {/* human verify gate */}
      <div style={{
        opacity: human.op, display: "flex", alignItems: "center", gap: 14 * S,
        fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700, color: C.text,
        background: C.surface, border: `1px solid ${C.primaryBorder}`, borderRadius: 16 * S,
        padding: `${14 * S}px ${28 * S}px`, boxShadow: `0 0 ${40 * S}px ${C.primaryGlow}`,
      }}>
        <span style={{ fontSize: 30 * S }}>👤</span> 高風險任務的最終輸出 → 仍然需要人來驗證
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_25.scene3.to - SCENES_2026_05_25.scene3.from;
  // local = global - 4659. Phase B 第一句「最後一個提醒」199.38→5981, local 1322
  const A_FADE_START = 1242;
  const A_REMOVE = 1322;
  const B_SHOW_AT = 1322;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g4659 對一般使用者來說
  const TOOLS_AT = 210; // g4869 你現在用的Claude/ChatGPT (162.3)
  const PHRASE_AT = 721; // g5380 這就是推理步驟在展現 (180.34)
  const Q1_AT = 571; // g5230 讓我先查一下 (174.34)
  const Q2_AT = 661; // g5320 好現在我知道了 (177.34)
  const Q3_AT = 721; // g5380 下一步我應該 (179.34)

  // Phase B captions (local)
  const RELIABLE_AT = 1352; // g6011 ReAct讓Agent更可靠 (200.38)
  const CORRECT_AT = 1442; // g6101 可靠和正確不是同一件事 (203.38)
  const REASONS_AT = 1622; // g6281 資訊錯誤/理解偏差 (209.38)
  const WRONG_AT = 1742; // g6401 給出錯誤結果 (213.38)
  const HUMAN_AT = 1832; // g6491 高風險需人驗證 (216.38)

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A hero — 幕後運作 ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="幕後運作 ／ BEHIND THE SCENES" delay={HEADER_AT} color={C.orange} />}
            sentence={
              frame >= PHRASE_AT
                ? <StageSentence text="AI 說「讓我先查一下…」——這就是推理在展現" delay={PHRASE_AT} color={C.orange} fontSize={26 * S} />
                : frame >= TOOLS_AT
                ? <StageSentence text="你用的 Claude、ChatGPT，背後都在用類似 ReAct" delay={TOOLS_AT} color={C.text} fontSize={26 * S} />
                : <StageSentence text="對一般使用者，ReAct 是在幕後運作的" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="任務越複雜，越值得讓它一步步來，別跳過中間步驟" delay={PHRASE_AT + 120} color={C.orange} />}
          >
            <BehindScenes toolsAt={TOOLS_AT} q1At={Q1_AT} q2At={Q2_AT} q3At={Q3_AT} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B hero — 可靠 ≠ 正確 ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="最後提醒 ／ THE CAVEAT" delay={B_SHOW_AT} color={C.orange} />}
          sentence={
            frame >= CORRECT_AT
              ? <StageSentence text="但「可靠」和「正確」不是同一件事" delay={CORRECT_AT} color={C.orange} />
              : <StageSentence text="最後一個提醒：ReAct 讓 Agent 更可靠" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="推理再清晰，也不等於結果正確" delay={WRONG_AT} color={C.orange} />}
        >
          <ReliableVsCorrect reliableAt={RELIABLE_AT} correctAt={CORRECT_AT} reasonsAt={REASONS_AT} wrongAt={WRONG_AT} humanAt={HUMAN_AT} />
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
  const dur = SCENES_2026_05_25.summary.to - SCENES_2026_05_25.summary.from;
  // local = global - 6943
  const BADGE_AT = 0; // g6943 今天的重點整理
  const CARD1_AT = 60; // g7003 第一 (233.42)
  const CARD2_AT = 300; // g7243 第二 (241.42)
  const CARD3_AT = 570; // g7513 第三 (250.42)
  const OUTRO_AT = 931; // g7874 掰掰 (262.46)

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
        text="ReAct 讓 AI Agent 交替進行推理和行動，每一步都有依據，比直接行動更可靠" />
      <BigTakeaway number="02" delay={CARD2_AT} color={C.blue} top={800}
        text="推理可見讓行為透明、錯誤更容易追蹤，複雜任務的表現顯著更好" />
      <BigTakeaway number="03" delay={CARD3_AT} color={C.orange} top={1240}
        text="看到思考過程是發現問題的最佳時機；但推理清晰 ≠ 結果正確，高風險任務仍需人工驗證" />

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
export function VideoComposition_2026_05_25() {
  const frame = useCurrentFrame();
  const T = SCENES_2026_05_25.title;
  const S1 = SCENES_2026_05_25.scene1;
  const S2 = SCENES_2026_05_25.scene2;
  const S3 = SCENES_2026_05_25.scene3;
  const SU = SCENES_2026_05_25.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Main narration */}
      <Audio src={staticFile("audio/2026-05-25-processed.wav")} volume={1.0} />

      {/* Background music (0.10 vol, fade in/out) */}
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_05_25 - 150, TOTAL_FRAMES_2026_05_25], [v, 0], {
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
