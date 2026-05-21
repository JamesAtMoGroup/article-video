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
// Hero visual fills the central ~60–70% of usable height and most of width.
// usable content band: y 180 (CONTENT_TOP) → 1800 (H - SUBTITLE_SAFE)
const STAGE_LEFT = 160 * S; // x = 480
const STAGE_W = W - STAGE_LEFT * 2; // 2880
const STAGE_TOP = 140 * S; // y = 420 — below eyebrow + sentence
const STAGE_H = 470 * S; // 1410 — central hero band (y 420 → 1830 clipped by stage frame; bottom takeaway sits inside)

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
  // auxiliaries (aischool): blue / orange / purple
  blue: "#5b8fff",
  blueLight: "rgba(91,143,255,0.1)",
  blueBorder: "rgba(91,143,255,0.28)",
  orange: "#ff9f43",
  orangeLight: "rgba(255,159,67,0.1)",
  orangeBorder: "rgba(255,159,67,0.22)",
  purple: "#a855f7",
  purpleLight: "rgba(168,85,247,0.1)",
  purpleBorder: "rgba(168,85,247,0.28)",
  // legacy aliases mapped to aischool palette (yellow→orange, cyan→blue)
  yellow: "#ff9f43",
  yellowLight: "rgba(255,159,67,0.1)",
  yellowBorder: "rgba(255,159,67,0.22)",
  cyan: "#5b8fff",
  cyanLight: "rgba(91,143,255,0.1)",
  cyanBorder: "rgba(91,143,255,0.28)",
  // softer red for "limited / wrong"
  red: "#f87171",
  redLight: "rgba(248,113,113,0.08)",
  redBorder: "rgba(248,113,113,0.2)",
  // shared chip backplate for labels over visuals
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
// TitleScene:  0s        → 0
// Scene1:      30.720s   → 922   "Embedding 是什麼" (向量 / 語意距離 / 語意空間 / 國王類比)
// Scene2:      127.920s  → 3838  "語意搜尋 vs 關鍵字 + RAG"
// Scene3:      193.280s  → 5798  "幕後運作 + AI 素養 / 偏見"
// Summary:     273.600s  → 8208  "重點整理"
// End:         307.760s  → 9233
export const SCENES_2026_05_21 = {
  title: { from: 0, to: 922 },
  scene1: { from: 922, to: 3838 },
  scene2: { from: 3838, to: 5798 },
  scene3: { from: 5798, to: 8208 },
  summary: { from: 8208, to: 9233 },
} as const;
export const TOTAL_FRAMES_2026_05_21 = 9233;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "Embedding 是什麼", start: 922 },
  { label: "語意搜尋 & RAG", start: 3838 },
  { label: "幕後與 AI 素養", start: 5798 },
  { label: "重點整理", start: 8208 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene1 結尾：程式設計師 & 咖啡 的距離疑問
  { from: 3511, to: 3838, sender: "想一想", text: "如果每個概念都有座標，那「程式設計師」和「咖啡」，你覺得它們的距離近還是遠？" },
  // Scene2 中段：換關鍵字的空檔
  { from: 4984, to: 5290, sender: "想一想", text: "你最近一次搜尋，是不是換了好幾組關鍵字才找到？語意搜尋就是要解決這件事。" },
  // Scene3 結尾：換個說法的親身經歷
  { from: 7925, to: 8208, sender: "親身經歷", text: "換個說法問 AI 同一個問題，答案有時真的不一樣——你遇過嗎？" },
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
        width: CONTAINER_W, height: CONTENT_H,
        overflow: "hidden" as const,
      }}>
        <div style={{ transform: `translateY(${scrollY}px)` }}>
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── Background ─────────────────────────────────────────────────────────────
function Background() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* ambient mint glow (brand main) */}
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
      {/* subtle 60px grid, faded out via radial mask (aischool hero) */}
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
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{
            fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
            color: C.text, letterSpacing: "0.02em",
          }}>
            每日 AI <span style={{ color: C.primary, fontWeight: 700 }}>知識庫</span>
          </span>
          <span style={{
            fontFamily: F_BODY, fontSize: 16 * S, fontWeight: 500,
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
              fontSize: 16 * S, color: C.muted, letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
            }}>now</span>
          </div>
          <div style={{
            fontFamily: F_TC,
            fontSize: 18 * S, color: C.textSub,
            lineHeight: 1.5,
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

// ═══════════════════════════════════════════════════════════════════════════
// ── Hero stage scaffolding (eyebrow + sentence above, takeaway below) ───────
// ═══════════════════════════════════════════════════════════════════════════

// activeAt helper: dim (0.25) → bright (1) tied to a VTT cue (scene-local frame)
function calcDot(activeAt: number | undefined, frame: number, dimOpacity = 0.25) {
  const dimF = activeAt !== undefined ? Math.max(0, frame - activeAt) : 1e9;
  const t = activeAt !== undefined ? easeOutBack(prog(dimF, 24)) : 1;
  const op = interpolate(t, [0, 1], [dimOpacity, 1], clamp);
  const isOn = activeAt !== undefined && frame >= activeAt;
  return { op: Math.max(dimOpacity, Math.min(1, op)), isOn };
}

// Eyebrow (DM Sans section label, pulsing accent dot) — top of stage
function StageEyebrow({ label, delay, color = C.primary }: { label: string; delay: number; color?: string }) {
  const frame = useCurrentFrame();
  const a = useFadeIn(delay);
  // gentle 2s opacity pulse on the dot
  const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));
  return (
    <div style={{
      ...a, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S,
    }}>
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

// Key sentence (WordReveal) — above the hero visual
function StageSentence({ text, delay, color = C.text, fontSize = 28 * S }: {
  text: string; delay: number; color?: string; fontSize?: number;
}) {
  const a = useFadeUp(delay);
  return (
    <div style={{
      ...a, textAlign: "center", fontFamily: F_HEAD,
      fontWeight: 700, lineHeight: 1.35, maxWidth: 600 * S, margin: "0 auto",
      fontSize, color, wordBreak: "break-word" as const,
    }}>{text}</div>
  );
}

// Takeaway card — below the hero visual. aischool card: dark surface + faint border;
// emphasis = subtle accent border + glow (NO colored left/top bar).
function StageTakeaway({ text, delay, color = C.primary }: { text: string; delay: number; color?: string }) {
  const a = useFadeUp(delay);
  return (
    <div style={{
      ...a, textAlign: "center", margin: "0 auto",
      fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 500,
      color: C.text, lineHeight: 1.45, maxWidth: 1100 * S,
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

// HeroFrame — top eyebrow + sentence, central hero visual band, bottom takeaway.
// The visual fills the central band; text supports it.
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
      {/* top captions */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S }}>
        {eyebrow}
        {sentence}
      </div>
      {/* central hero band — flex-grow to fill */}
      <div style={{
        flex: 1, width: "100%", position: "relative",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: 18 * S, marginBottom: 18 * S, minHeight: 0,
      }}>
        {children}
      </div>
      {/* bottom takeaway */}
      <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
        {takeaway}
      </div>
    </AbsoluteFill>
  );
}

// Labeled dot in a semantic space (reused). All nodes render from start, dim→bright via activeAt.
function SpaceDot({ x, y, label, color, activeAt, size = 22 * S }: {
  x: number; y: number; label: string; color: string; activeAt?: number; size?: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDot(activeAt, frame, 0.22);
  const sc = activeAt !== undefined ? easeOutBack(prog(Math.max(0, frame - activeAt), 22)) : 1;
  const scale = isOn ? Math.max(0.55, Math.min(1, sc)) : 0.7;
  return (
    <div style={{
      position: "absolute", left: x, top: y, transform: `translate(-50%,-50%)`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
      opacity: op, zIndex: 5,
    }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%", background: color,
          transform: `scale(${scale})`,
          boxShadow: isOn ? `0 0 ${16 * S}px ${color}` : `0 0 ${5 * S}px ${color}66`,
        }} />
        {activeAt !== undefined && <RippleRing activeAt={activeAt} color={color} />}
      </div>
      {/* backplate chip so label is readable over lines / glows */}
      <span style={{
        fontFamily: F_TC, fontSize: 22 * S,
        color: isOn ? C.text : C.textSub, fontWeight: 700, whiteSpace: "nowrap" as const,
        background: C.chipBg, borderRadius: 8 * S, padding: `${4 * S}px ${10 * S}px`,
        border: `1px solid ${C.chipBorder}`,
      }}>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE — ambient word constellation behind title ───────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Faint drifting word-points filling the whole frame to set the Embedding theme.
function WordConstellation({ density = 1 }: { density?: number }) {
  const frame = useCurrentFrame();
  // deterministic pseudo-random points
  const pts = React.useMemo(() => {
    const arr: { x: number; y: number; r: number; sp: number; ph: number; w?: string }[] = [];
    const labels = ["貓", "狗", "國王", "女王", "餐廳", "搜尋", "向量", "語意", "蘋果", "音樂", "城市", "海洋"];
    let seed = 1337;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const N = Math.round(46 * density);
    for (let i = 0; i < N; i++) {
      arr.push({
        x: rnd(), y: rnd(), r: (1.5 + rnd() * 3) * S, sp: 0.2 + rnd() * 0.5, ph: rnd() * Math.PI * 2,
        w: i % 6 === 0 ? labels[i % labels.length] : undefined,
      });
    }
    return arr;
  }, [density]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {pts.map((p, i) => {
        const drift = Math.sin(frame * 0.01 * p.sp + p.ph) * 18 * S;
        const driftX = Math.cos(frame * 0.008 * p.sp + p.ph) * 12 * S;
        const tw = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(frame * 0.03 * p.sp + p.ph));
        const px = p.x * W;
        const py = p.y * H;
        return (
          <div key={i} style={{
            position: "absolute", left: px + driftX, top: py + drift,
            transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 6 * S, opacity: tw,
          }}>
            <div style={{
              width: p.r * 2, height: p.r * 2, borderRadius: "50%",
              background: C.primary, boxShadow: `0 0 ${6 * S}px ${C.primary}88`,
            }} />
            {p.w && (
              <span style={{
                fontFamily: F_TC, fontSize: 18 * S,
                color: "rgba(124,255,178,0.5)", whiteSpace: "nowrap" as const,
              }}>{p.w}</span>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

// Top-right hook callout — smaller/subtler MeaningSearch teaser
function MeaningSearchHook({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 690;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const queryScale = easeOutBack(prog(f, 22));
  const literalOp = interpolate(Math.max(0, f - 60), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const semanticOp = interpolate(Math.max(0, f - 150), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const glow = 0.5 + 0.5 * Math.sin(f * 0.08);

  return (
    <div style={{
      position: "absolute", right: 56 * S, top: 240 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      width: 250 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
    }}>
      <div style={{
        transform: `scale(${queryScale})`,
        fontFamily: F_TC, fontSize: 20 * S, color: C.text, fontWeight: 700,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 12 * S, padding: `${9 * S}px ${16 * S}px`,
      }}>你問：<span style={{ color: C.primary }}>「吃的地方」</span></div>
      <div style={{ fontSize: 22 * S, color: C.muted }}>↓</div>
      <div style={{
        opacity: literalOp,
        display: "flex", alignItems: "center", gap: 8 * S,
        fontFamily: F_TC, fontSize: 18 * S, color: C.textSub,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 12 * S, padding: `${7 * S}px ${12 * S}px`, width: "100%",
      }}>
        <span style={{ color: C.red, fontSize: 18 * S }}>✕</span>
        <span style={{ fontSize: 20 * S }}>🌾</span>
        <span>字面：農場？</span>
      </div>
      <div style={{
        opacity: semanticOp,
        display: "flex", alignItems: "center", gap: 8 * S,
        fontFamily: F_TC, fontSize: 18 * S, color: C.text, fontWeight: 700,
        background: C.surface, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 12 * S, padding: `${7 * S}px ${12 * S}px`, width: "100%",
        boxShadow: `0 0 ${(8 + glow * 16) * S}px ${C.primaryGlow}`,
      }}>
        <span style={{ color: C.primary, fontSize: 18 * S }}>✓</span>
        <span style={{ fontSize: 20 * S }}>🍽️</span>
        <span>語意：餐廳</span>
      </div>
    </div>
  );
}

function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_21.title.to - SCENES_2026_05_21.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(34);
  const tagStyle = useFadeUp(50);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));

  return (
    <SceneFade durationInFrames={dur}>
      {/* ambient constellation behind everything */}
      <WordConstellation density={1} />

      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        paddingBottom: SUBTITLE_SAFE,
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
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 44 * S, color: C.text,
          textShadow: `0 0 ${40 * S}px rgba(0,0,0,0.85)`,
        }}>
          <WordReveal text="AI 怎麼理解語意？" startFrame={10} staggerPerWord={6}
            fontSize={44 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 32 * S, color: C.primary,
          textShadow: `0 0 ${40 * S}px rgba(0,0,0,0.85)`,
        }}>
          <WordReveal text="Embedding 向量的直覺解釋" startFrame={28} staggerPerWord={6}
            fontSize={32 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 22 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
          textShadow: `0 0 ${30 * S}px rgba(0,0,0,0.9)`,
        }}>
          把文字變成數字座標——讓 AI 真的「懂」你的意思
        </p>

        <div style={{ ...tagStyle, marginTop: 16 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>Embedding · 語意搜尋 · RAG · 向量空間</span>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <MeaningSearchHook triggerFrame={120} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — HERO: the SEMANTIC VECTOR SPACE (green) ───────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: 文字「貓」→ 向量 → 點落入大空間；貓·狗近 / 汽車遠
function Scene1HeroA({
  word2vecAt, distAt,
}: { word2vecAt: number; distAt: number }) {
  const frame = useCurrentFrame();

  // big central space canvas
  const SP_W = 940 * S;
  const SP_H = 350 * S; // fits the band with a comfortable gap below the heading

  // transformation strip (top-left of canvas): 貓 → [..] → •
  const wordScale = easeOutBack(prog(Math.max(0, frame - word2vecAt), 20));
  const arrowW = interpolate(Math.max(0, frame - word2vecAt - 22), [0, 24], [0, 90 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const nums = ["0.82", "0.15", "-0.31", "0.77", "-0.04", "0.59"];
  const vecBoxOp = interpolate(Math.max(0, frame - word2vecAt - 40), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  // dots positions inside space (relative)
  const cat = { x: SP_W * 0.34, y: SP_H * 0.46 };
  const dog = { x: SP_W * 0.45, y: SP_H * 0.6 };
  const car = { x: SP_W * 0.82, y: SP_H * 0.24 };

  // near / far lines tied to VTT
  const nearOp = interpolate(Math.max(0, frame - distAt - 30), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const farOp = interpolate(Math.max(0, frame - distAt - 200), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "relative", width: SP_W, height: SP_H,
      background: C.surface, border: `1px solid ${C.primaryBorder}`,
      borderRadius: 24 * S,
      backgroundImage: `linear-gradient(rgba(124,255,178,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,255,178,0.04) 1px, transparent 1px)`,
      backgroundSize: `${48 * S}px ${48 * S}px`,
      boxShadow: `0 0 ${60 * S}px ${C.primaryGlow}`,
      overflow: "hidden",
    }}>
      {/* transformation strip — 貓 → [vector] */}
      <div style={{
        position: "absolute", left: 40 * S, top: 36 * S,
        display: "flex", alignItems: "center", gap: 14 * S, zIndex: 3,
      }}>
        <div style={{
          transform: `scale(${wordScale})`,
          fontFamily: F_TC, fontSize: 36 * S, color: C.text, fontWeight: 900,
          background: C.surface2, border: `1px solid ${C.surfaceBorder}`,
          borderRadius: 14 * S, padding: `${8 * S}px ${22 * S}px`,
        }}>貓</div>
        <div style={{
          width: arrowW, height: 4 * S,
          background: `linear-gradient(to right, transparent, ${C.primary})`,
          boxShadow: `0 0 ${6 * S}px ${C.primary}66`,
        }} />
        <div style={{
          opacity: vecBoxOp,
          fontFamily: F_BODY, fontWeight: 500, fontSize: 20 * S, color: C.primary,
          background: C.surface2, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 12 * S, padding: `${8 * S}px ${14 * S}px`,
          display: "flex", flexWrap: "wrap" as const, gap: `${4 * S}px ${10 * S}px`,
        }}>
          <span style={{ color: C.muted }}>[</span>
          {nums.map((n, i) => (<span key={i}>{n},</span>))}
          <span style={{ color: C.muted }}>… ]</span>
        </div>
      </div>

      {/* near/far lines — drawn under labels & dots */}
      <svg width={SP_W} height={SP_H} style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <line x1={cat.x} y1={cat.y} x2={dog.x} y2={dog.y} stroke={C.primary} strokeWidth={4 * S} opacity={nearOp} />
        <line x1={cat.x} y1={cat.y} x2={car.x} y2={car.y} stroke={C.red} strokeWidth={4 * S} strokeDasharray={`${10 * S} ${8 * S}`} opacity={farOp} />
      </svg>
      {/* mid labels on the lines — chips so the line never crosses text */}
      <div style={{
        position: "absolute", left: cat.x - 64 * S, top: dog.y + 50 * S,
        opacity: nearOp, fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.primary,
        background: C.chipBg, border: `1px solid ${C.chipBorder}`, borderRadius: 8 * S,
        padding: `${4 * S}px ${10 * S}px`, whiteSpace: "nowrap" as const, zIndex: 4,
      }}>近 ＝ 相似</div>
      <div style={{
        position: "absolute", left: (cat.x + car.x) / 2 - 36 * S, top: (cat.y + car.y) / 2 - 40 * S,
        opacity: farOp, fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.red,
        background: C.chipBg, border: `1px solid ${C.chipBorder}`, borderRadius: 8 * S,
        padding: `${4 * S}px ${10 * S}px`, whiteSpace: "nowrap" as const, zIndex: 4,
      }}>遠 ＝ 差很多</div>

      {/* dots */}
      <SpaceDot x={cat.x} y={cat.y} label="貓" color={C.primary} activeAt={distAt} size={26 * S} />
      <SpaceDot x={dog.x} y={dog.y} label="狗" color={C.primary} activeAt={distAt + 30} size={26 * S} />
      <SpaceDot x={car.x} y={car.y} label="汽車" color={C.red} activeAt={distAt + 200} size={26 * S} />
    </div>
  );
}

// Phase B hero: populated constellation + 國王 − 男性 + 女性 ≈ 女王 vector arithmetic
function Scene1HeroB({ spaceAt, kingAt }: { spaceAt: number; kingAt: number }) {
  const frame = useCurrentFrame();
  const SP_W = 940 * S;
  const SP_H = 350 * S; // fits the band with a comfortable gap below the heading

  // populated word constellation — kept to the LEFT third so it never collides
  // with the King arithmetic chain on the right.
  const words = [
    { label: "貓", x: 0.08, y: 0.3, color: C.primary, at: spaceAt + 10 },
    { label: "狗", x: 0.14, y: 0.46, color: C.primary, at: spaceAt + 40 },
    { label: "兔", x: 0.05, y: 0.6, color: C.primary, at: spaceAt + 70 },
    { label: "蘋果", x: 0.22, y: 0.72, color: C.blue, at: spaceAt + 110 },
    { label: "香蕉", x: 0.32, y: 0.84, color: C.blue, at: spaceAt + 140 },
    { label: "音樂", x: 0.27, y: 0.32, color: C.primary, at: spaceAt + 170 },
    { label: "城市", x: 0.36, y: 0.5, color: C.primary, at: spaceAt + 200 },
  ];

  // King arithmetic — vectors inside the space (money shot, right side).
  // anchors pulled in so nowrap labels never clip the right edge.
  const king = { x: SP_W * 0.52, y: SP_H * 0.32 };
  const minusMan = { x: SP_W * 0.62, y: SP_H * 0.6 };
  const plusWoman = { x: SP_W * 0.72, y: SP_H * 0.3 };
  const queen = { x: SP_W * 0.8, y: SP_H * 0.58 };

  const kf = Math.max(0, frame - kingAt);
  const v1 = interpolate(kf, [20, 60], [0, 1], { easing: E.outExpo, ...clamp }); // king→minusMan
  const v2 = interpolate(kf, [60, 100], [0, 1], { easing: E.outExpo, ...clamp }); // →plusWoman
  const v3 = interpolate(kf, [110, 160], [0, 1], { easing: E.outExpo, ...clamp }); // →queen
  const queenP = easeOutBack(prog(Math.max(0, kf - 160), 24));
  const queenGlow = 0.5 + 0.5 * Math.sin(kf * 0.09);

  const lerp = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => ({
    x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
  });
  const p1 = lerp(king, minusMan, v1);
  const p2 = lerp(minusMan, plusWoman, v2);
  const p3 = lerp(plusWoman, queen, v3);

  const Node = ({ pos, emoji, label, color, op = 1, sc = 1, emphasis = false }: {
    pos: { x: number; y: number }; emoji: string; label: string; color: string; op?: number; sc?: number; emphasis?: boolean;
  }) => (
    <div style={{
      position: "absolute", left: pos.x, top: pos.y, transform: `translate(-50%,-50%) scale(${sc})`,
      opacity: op, display: "flex", alignItems: "center", gap: 8 * S, zIndex: 6,
      background: C.surface2,
      border: `1px solid ${emphasis ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${8 * S}px ${16 * S}px`,
      whiteSpace: "nowrap" as const,
      boxShadow: emphasis ? `0 0 ${(20 + queenGlow * 24) * S}px ${C.primaryGlow}` : "none",
    }}>
      <span style={{ fontSize: 30 * S }}>{emoji}</span>
      <span style={{ fontFamily: F_TC, fontSize: 24 * S, color, fontWeight: 900 }}>{label}</span>
    </div>
  );

  const kingOp = interpolate(kf, [0, 18], [0, 1], { easing: E.outCubic, ...clamp });

  return (
    <div style={{
      position: "relative", width: SP_W, height: SP_H,
      background: C.surface, border: `1px solid ${C.primaryBorder}`,
      borderRadius: 24 * S,
      backgroundImage: `linear-gradient(rgba(124,255,178,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,255,178,0.04) 1px, transparent 1px)`,
      backgroundSize: `${48 * S}px ${48 * S}px`,
      boxShadow: `0 0 ${60 * S}px ${C.primaryGlow}`,
      overflow: "hidden",
    }}>
      {/* arithmetic vectors — drawn first, under all dots & nodes */}
      <svg width={SP_W} height={SP_H} style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <line x1={king.x} y1={king.y} x2={p1.x} y2={p1.y} stroke={C.red} strokeWidth={4 * S} />
        <line x1={minusMan.x} y1={minusMan.y} x2={p2.x} y2={p2.y} stroke={C.blue} strokeWidth={4 * S} />
        <line x1={plusWoman.x} y1={plusWoman.y} x2={p3.x} y2={p3.y} stroke={C.primary} strokeWidth={4 * S} strokeDasharray={`${10 * S} ${6 * S}`} />
      </svg>

      {/* constellation dots — above the lines */}
      {words.map((w, i) => (
        <SpaceDot key={i} x={SP_W * w.x} y={SP_H * w.y} label={w.label} color={w.color} activeAt={w.at} size={20 * S} />
      ))}

      <Node pos={king} emoji="👑" label="國王" color={C.text} op={kingOp} />
      <Node pos={minusMan} emoji="♂" label="− 男性" color={C.red} op={interpolate(kf, [40, 60], [0, 1], clamp)} />
      <Node pos={plusWoman} emoji="♀" label="+ 女性" color={C.blue} op={interpolate(kf, [90, 110], [0, 1], clamp)} />
      <Node pos={queen} emoji="👸" label="≈ 女王" color={C.primary} op={interpolate(kf, [160, 180], [0, 1], clamp)} sc={Math.max(0.6, queenP)} emphasis />
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_21.scene1.to - SCENES_2026_05_21.scene1.from;
  // local = global - 922
  // Phase A: 定義 / 語意距離 (大語意空間). Phase B: 語意空間 / 國王類比
  // Phase B 第一句「用一個更直觀的類比」g2009 → local 1087
  const A_FADE_START = 1007; // 1087 - 80
  const A_REMOVE = 1087;
  const B_SHOW_AT = 1087;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const DEF_AT = 0; // g922 Embedding 定義
  const DIST_AT = 523; // g1445 貓和狗座標靠近
  const AIDIST_AT = 933; // g1855 AI 靠語意距離理解意思

  // Phase B captions (local)
  const SPACE_AT = 1087; // g2009 語意空間類比
  const KING_AT = 1821; // g2743 國王 − 男性 + 女性 ≈ 女王
  const ANALOGY_AT = 2260; // g3182 類比推理

  // hero sub-part activations (local)
  const WORD2VEC_AT = 60; // g982 文字→向量 (after eyebrow settles)
  const DIST_ANIM_AT = 523; // g1445 貓和狗座標靠近

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A hero ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="EMBEDDING ／ 嵌入" delay={DEF_AT} color={C.primary} />}
            sentence={
              frame >= AIDIST_AT
                ? <StageSentence text="AI 就是靠這種「語意距離」來理解意思" delay={AIDIST_AT} color={C.primary} />
                : frame >= DIST_AT
                ? <StageSentence text="座標靠近＝意思相近，座標很遠＝意思差很多" delay={DIST_AT} color={C.text} />
                : <StageSentence text="Embedding 把一段文字變成一組數字座標" delay={DEF_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="意思相近 → 座標靠近｜意思相反 → 座標遠" delay={DIST_AT + 40} color={C.primary} />}
          >
            <Scene1HeroA word2vecAt={WORD2VEC_AT} distAt={DIST_ANIM_AT} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B hero ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="語意空間 ／ SEMANTIC SPACE" delay={SPACE_AT} color={C.primary} />}
          sentence={
            frame >= KING_AT
              ? <StageSentence text="國王 − 男性 + 女性 ≈ 女王" delay={KING_AT} color={C.text} fontSize={30 * S} />
              : <StageSentence text="想像一個很大的空間，每個詞都是一個位置" delay={SPACE_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="語意關係能用數學算出來——這就是 AI 能「類比推理」的原因" delay={ANALOGY_AT} color={C.primary} />}
        >
          <Scene1HeroB spaceAt={SPACE_AT} kingAt={KING_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — HERO: search comparison → RAG pipeline (cyan/green split) ─────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: big side-by-side 關鍵字比對 vs 語意匹配
function Scene2HeroA({ keywordAt, semanticAt, semItemsAt }: {
  keywordAt: number; semanticAt: number; semItemsAt: number;
}) {
  const frame = useCurrentFrame();
  const PANEL_W = 448 * S;
  const PANEL_H = 400 * S;

  const kw = calcDot(keywordAt, frame, 0.28);
  const sem = calcDot(semanticAt, frame, 0.28);

  const semItems = ["餐廳推薦", "飲食景點", "哪裡好吃"];

  return (
    <div style={{ display: "flex", gap: 56 * S, alignItems: "stretch", justifyContent: "center" }}>
      {/* LEFT — keyword (limited) */}
      <div style={{
        position: "relative", width: PANEL_W, height: PANEL_H, opacity: kw.op,
        background: C.surface, border: `1px solid ${C.redBorder}`,
        borderRadius: 24 * S, padding: `${30 * S}px ${34 * S}px`,
        display: "flex", flexDirection: "column", gap: 22 * S,
      }}>
        {keywordAt !== undefined && <RippleRing activeAt={keywordAt} color={C.red} />}
        <div style={{
          display: "flex", alignItems: "center", gap: 10 * S,
          fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.red,
          letterSpacing: "0.2em", textTransform: "uppercase" as const,
        }}>
          <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.red, boxShadow: `0 0 ${8 * S}px ${C.red}` }} />
          關鍵字比對
        </div>
        <div style={{
          fontFamily: F_TC, fontSize: 26 * S, color: C.text, fontWeight: 700,
          background: C.surface2, border: `1px solid ${C.surfaceBorder}`,
          borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
        }}>查詢「吃的地方」</div>
        <div style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.muted, lineHeight: 1.5 }}>
          只找含這四個字的頁面
        </div>
        <div style={{
          marginTop: "auto",
          display: "flex", alignItems: "center", gap: 12 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.red, fontWeight: 700,
          background: C.redLight, border: `1px solid ${C.redBorder}`,
          borderRadius: 14 * S, padding: `${16 * S}px ${20 * S}px`,
        }}>
          <span style={{ fontSize: 26 * S }}>⛔</span> 漏掉同義說法
        </div>
      </div>

      {/* RIGHT — semantic (rich / mint) */}
      <div style={{
        position: "relative", width: PANEL_W, height: PANEL_H, opacity: sem.op,
        background: C.surface, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 24 * S, padding: `${30 * S}px ${34 * S}px`,
        display: "flex", flexDirection: "column", gap: 22 * S,
        boxShadow: `0 0 ${60 * S}px ${C.primaryGlow}`,
      }}>
        {semanticAt !== undefined && <RippleRing activeAt={semanticAt} color={C.primary} />}
        <div style={{
          display: "flex", alignItems: "center", gap: 10 * S,
          fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.primary,
          letterSpacing: "0.2em", textTransform: "uppercase" as const,
        }}>
          <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary, boxShadow: `0 0 ${8 * S}px ${C.primary}` }} />
          語意匹配
        </div>
        <div style={{
          fontFamily: F_TC, fontSize: 26 * S, color: C.text, fontWeight: 700,
          background: C.surface2, border: `1px solid ${C.surfaceBorder}`,
          borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
        }}>查詢「吃的地方」</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 * S, marginTop: 4 * S }}>
          {semItems.map((it, i) => {
            const at = semItemsAt + i * 60;
            const iop = interpolate(Math.max(0, frame - at), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
            const itx = interpolate(Math.max(0, frame - at), [0, 20], [30 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                opacity: iop, transform: `translateX(${itx}px)`,
                display: "flex", alignItems: "center", gap: 12 * S,
                fontFamily: F_TC, fontSize: 24 * S, color: C.text, fontWeight: 700,
                background: C.surface2, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 12 * S, padding: `${12 * S}px ${18 * S}px`,
              }}>
                <span style={{ color: C.primary, fontSize: 22 * S }}>✓</span>{it}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Phase B hero: horizontal RAG pipeline spanning the width
function Scene2HeroB({ flowAt, resultAt }: { flowAt: number; resultAt: number }) {
  const frame = useCurrentFrame();
  const steps = [
    { emoji: "📄", label: "文件", at: flowAt + 0 },
    { emoji: "✂️", label: "切段", at: flowAt + 40 },
    { emoji: "🔢", label: "轉 Embedding", at: flowAt + 80 },
    { emoji: "🗄️", label: "存向量庫", at: flowAt + 120 },
    { emoji: "❓", label: "問題轉 Embedding", at: resultAt + 0 },
    { emoji: "🎯", label: "找最近段落", at: resultAt + 60 },
    { emoji: "💬", label: "回答", at: resultAt + 120 },
  ];
  const NODE_W = 168 * S;
  const NODE_H = 168 * S;

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      flexWrap: "wrap" as const, gap: `${28 * S}px ${6 * S}px`, maxWidth: 940 * S,
    }}>
      {steps.map((st, i) => {
        const a = calcActive(st.at, frame);
        const isQuery = i >= 4;
        const ringColor = isQuery ? C.blue : C.primary;
        const accent = isQuery ? C.blue : C.primary;
        const accentBorder = isQuery ? C.blueBorder : C.primaryBorder;
        return (
          <React.Fragment key={i}>
            <div style={{
              position: "relative", width: NODE_W, height: NODE_H, opacity: a.op,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 * S,
              background: C.surface,
              border: `1px solid ${a.isOn ? accentBorder : C.surfaceBorder}`,
              borderRadius: 20 * S, textAlign: "center",
              boxShadow: a.isOn ? `0 0 ${40 * S}px ${accent}1f` : "none",
            }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 20 * S, overflow: "visible" }}>
                {st.at !== undefined && <RippleRingRect activeAt={st.at} color={ringColor} />}
              </div>
              <span style={{ fontSize: 46 * S }}>{st.emoji}</span>
              <span style={{
                fontFamily: F_TC, fontSize: 20 * S,
                color: a.isOn ? C.text : C.muted, fontWeight: 700, lineHeight: 1.2, padding: `0 ${8 * S}px`,
              }}>{st.label}</span>
            </div>
            {i < steps.length - 1 && (
              <Arrow activeAt={st.at + 20} color={i < 3 ? C.primary : C.blue} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// active helper for nodes (named function so hook usage stays at component top — but
// calcActive is itself a hook-free pure calc; we still call useCurrentFrame in parent)
function calcActive(activeAt: number, frame: number) {
  const dimF = Math.max(0, frame - activeAt);
  const t = easeOutBack(prog(dimF, 22));
  const op = interpolate(t, [0, 1], [0.25, 1], clamp);
  return { op: Math.max(0.25, Math.min(1, op)), isOn: frame >= activeAt };
}

// rectangular ripple for pipeline nodes
function RippleRingRect({ activeAt, color }: { activeAt: number; color: string }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - activeAt);
  if (f > 28) return null;
  const scale = interpolate(f, [0, 24], [0.85, 1.6], { easing: E.outExpo, extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 4, 24, 28], [0, 0.5, 0.18, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", inset: 0,
      border: `${2 * S}px solid ${color}`, borderRadius: 20 * S,
      transform: `scale(${scale})`, opacity, pointerEvents: "none",
    }} />
  );
}

// connecting arrow with activeAt
function Arrow({ activeAt, color }: { activeAt: number; color: string }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - activeAt);
  const op = interpolate(f, [0, 16], [0.2, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return (
    <span style={{
      fontFamily: F_BODY, fontSize: 30 * S, color,
      opacity: op, margin: `0 ${2 * S}px`,
    }}>→</span>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_21.scene2.to - SCENES_2026_05_21.scene2.from;
  // local = global - 3838
  // Phase B 第一句「Embedding 也是 RAG 的核心基礎」g5006 → local 1168
  const A_FADE_START = 1088;
  const A_REMOVE = 1168;
  const B_SHOW_AT = 1168;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g3838 升級到語意匹配
  const KEYWORD_AT = 213; // g4051 傳統關鍵字搜尋
  const SEMANTIC_AT = 681; // g4519 語意搜尋靠 Embedding
  const SEM_ITEMS_AT = 895; // g4733 餐廳推薦/飲食景點/哪裡好吃
  const SEM_CAP_AT = 1046; // g4884 不需猜對關鍵字

  // Phase B captions (local)
  const RAG_HEAD_AT = 1168; // g5006 RAG 核心基礎
  const RAG_FLOW_AT = 1456; // g5294 文件轉 Embedding 存
  const RAG_RESULT_AT = 1776; // g5614 問法不同一樣找到

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A hero ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="搜尋的進化 ／ SEARCH" delay={HEADER_AT} color={C.cyan} />}
            sentence={
              frame >= SEMANTIC_AT
                ? <StageSentence text="語意搜尋靠 Embedding，找語意最近的內容" delay={SEMANTIC_AT} color={C.cyan} />
                : <StageSentence text="從「關鍵字比對」升級到「語意匹配」" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="你不需要猜對關鍵字——系統懂你在問什麼" delay={SEM_CAP_AT} color={C.cyan} />}
          >
            <Scene2HeroA keywordAt={KEYWORD_AT} semanticAt={SEMANTIC_AT} semItemsAt={SEM_ITEMS_AT} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B hero ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="RAG 怎麼運作 ／ PIPELINE" delay={RAG_HEAD_AT} color={C.primary} />}
          sentence={
            frame >= RAG_FLOW_AT
              ? <StageSentence text="文件轉成 Embedding 存起來，問題也轉向量找最近段落" delay={RAG_FLOW_AT} color={C.primary} fontSize={26 * S} />
              : <StageSentence text="Embedding 是 RAG 的核心——讓 AI 讀你的文件再回答" delay={RAG_HEAD_AT} color={C.text} fontSize={26 * S} />
          }
          takeaway={<StageTakeaway text="就算問法和文件用詞不一樣，它一樣能找到對的內容" delay={RAG_RESULT_AT} color={C.primary} />}
        >
          <Scene2HeroB flowAt={RAG_FLOW_AT} resultAt={RAG_RESULT_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — HERO: applications orbit → bias-in-space (amber) ──────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: large centered orbit, apps lighting up on VTT cues
function OrbitApp({ cx, cy, R, angle, label, emoji, activeAt }: {
  cx: number; cy: number; R: number; angle: number; label: string; emoji: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const a = calcActive(activeAt, frame);
  const rad = (angle * Math.PI) / 180;
  const x = cx + Math.cos(rad) * R;
  const y = cy + Math.sin(rad) * R;
  const NODE = 96 * S;
  const labelAbove = Math.sin(rad) < -0.3; // upper apps → label above, away from core
  return (
    <>
      {/* node */}
      <div style={{
        position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)",
        opacity: a.op, zIndex: 5, width: NODE, height: NODE,
      }}>
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: C.surface,
          border: `1px solid ${a.isOn ? C.orangeBorder : C.surfaceBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: a.isOn ? `0 0 ${36 * S}px rgba(255,159,67,0.18)` : "none",
        }}>
          <span style={{ fontSize: 38 * S }}>{emoji}</span>
        </div>
        <RippleRing activeAt={activeAt} color={C.orange} />
      </div>
      {/* backplate chip — placed radially outside the node, never over the core */}
      <span style={{
        position: "absolute", left: x,
        top: labelAbove ? y - NODE / 2 - 28 * S : y + NODE / 2 + 28 * S,
        transform: "translate(-50%,-50%)", opacity: a.op, zIndex: 6,
        fontFamily: F_TC, fontSize: 19 * S,
        color: a.isOn ? C.text : C.textSub, fontWeight: 700,
        background: C.chipBg, border: `1px solid ${C.chipBorder}`,
        borderRadius: 8 * S, padding: `${4 * S}px ${10 * S}px`, whiteSpace: "nowrap" as const,
      }}>{label}</span>
    </>
  );
}

function Scene3HeroA({ orbitAt, app1At, app2At, app3At, app4At }: {
  orbitAt: number; app1At: number; app2At: number; app3At: number; app4At: number;
}) {
  const frame = useCurrentFrame();
  const BOX = 440 * S;
  const cx = BOX / 2;
  const cy = BOX / 2;
  const R = 125 * S;
  const coreScale = easeOutBack(prog(Math.max(0, frame - orbitAt), 22));
  const coreGlow = 0.5 + 0.5 * Math.sin(frame * 0.06);

  // angles avoid straight top (-90) / bottom (90) so no app/label collides with the core or heading
  const apps = [
    { label: "Notion AI", emoji: "📝", angle: -60, at: app1At },
    { label: "Google 搜尋", emoji: "🔍", angle: 0, at: app1At + 30 },
    { label: "YouTube", emoji: "▶️", angle: 60, at: app2At },
    { label: "Netflix", emoji: "🎬", angle: 120, at: app2At + 30 },
    { label: "AI 助理", emoji: "🤖", angle: 180, at: app3At },
    { label: "跨語言", emoji: "🌐", angle: 240, at: app4At },
  ];

  return (
    <div style={{ position: "relative", width: BOX, height: BOX }}>
      {/* spokes — under apps & core */}
      <svg width={BOX} height={BOX} style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        {apps.map((a, i) => {
          const op = interpolate(Math.max(0, frame - a.at), [0, 18], [0.08, 0.45], { extrapolateRight: "clamp" });
          const rad = (a.angle * Math.PI) / 180;
          return (
            <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(rad) * R} y2={cy + Math.sin(rad) * R}
              stroke={C.orange} strokeWidth={2.5 * S} opacity={op} />
          );
        })}
      </svg>
      {apps.map((a, i) => (
        <OrbitApp key={i} cx={cx} cy={cy} R={R} angle={a.angle} label={a.label} emoji={a.emoji} activeAt={a.at} />
      ))}
      {/* core */}
      <div style={{
        position: "absolute", left: cx, top: cy, transform: `translate(-50%,-50%) scale(${Math.max(0.6, coreScale)})`,
        width: 120 * S, height: 120 * S, borderRadius: "50%", zIndex: 6,
        background: C.surface, border: `1px solid ${C.primaryBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" as const,
        fontFamily: F_HEAD, fontSize: 18 * S, color: C.primary, fontWeight: 700,
        boxShadow: `0 0 ${(34 + coreGlow * 22) * S}px rgba(124,255,178,0.25)`, lineHeight: 1.2,
      }}>Embedding</div>
    </div>
  );
}

// Phase B hero: bias-in-space (工程師 & 男性 too close) then 換說法 two query points
function Scene3HeroB({ biasAt, rephraseAt }: { biasAt: number; rephraseAt: number }) {
  const frame = useCurrentFrame();
  const SP_W = 940 * S;
  const SP_H = 330 * S; // shorter than S1 stages: S3B caption wraps to 2 lines, so the
                        // stage must fit the reduced band without overlapping the heading

  // bias dots — spread across the LEFT half, vertically centered, fill the band
  const eng = { x: SP_W * 0.18, y: SP_H * 0.62 };
  const maleStart = { x: SP_W * 0.46, y: SP_H * 0.3 };
  const drift = interpolate(Math.max(0, frame - biasAt - 60), [0, 50], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  // male drifts suspiciously close to 工程師
  const male = { x: maleStart.x + (SP_W * 0.3 - maleStart.x) * drift, y: maleStart.y + (SP_H * 0.5 - maleStart.y) * drift };
  const warnP = easeOutBack(prog(Math.max(0, frame - biasAt - 120), 22));
  const warnGlow = 0.5 + 0.5 * Math.sin(frame * 0.12);
  const engA = calcDot(biasAt, frame, 0.22);
  const maleA = calcDot(biasAt + 30, frame, 0.22);
  const biasLineOp = interpolate(Math.max(0, frame - biasAt - 100), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  // rephrase: two query points landing in different spots → different answers.
  // kept faintly visible (dim 0.15) so the right half never reads empty before activation.
  const qa = { x: SP_W * 0.72, y: SP_H * 0.3 };
  const qb = { x: SP_W * 0.82, y: SP_H * 0.7 };
  const qaA = calcDot(rephraseAt, frame, 0.15);
  const qbA = calcDot(rephraseAt + 70, frame, 0.15);
  // faint divider hinting "same question, different phrasings → different spots"
  const rpHintOp = interpolate(frame, [biasAt, biasAt + 30], [0, 0.18], clamp);
  const rpActiveOp = interpolate(Math.max(0, frame - rephraseAt), [0, 20], [0.18, 0.55], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "relative", width: SP_W, height: SP_H,
      background: C.surface, border: `1px solid ${C.orangeBorder}`,
      borderRadius: 24 * S,
      backgroundImage: `linear-gradient(rgba(255,159,67,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,159,67,0.04) 1px, transparent 1px)`,
      backgroundSize: `${48 * S}px ${48 * S}px`,
      boxShadow: `0 0 ${60 * S}px rgba(255,159,67,0.06)`,
      overflow: "hidden",
    }}>
      {/* lines: bias (left) + rephrase split (right) — drawn under all labels */}
      <svg width={SP_W} height={SP_H} style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <line x1={eng.x} y1={eng.y} x2={male.x} y2={male.y} stroke={C.orange} strokeWidth={4 * S} opacity={biasLineOp} strokeDasharray={`${10 * S} ${8 * S}`} />
        {/* rephrase: one query splitting to two spots */}
        <line x1={SP_W * 0.62} y1={SP_H * 0.5} x2={qa.x} y2={qa.y} stroke={C.primary} strokeWidth={3 * S} opacity={frame >= rephraseAt ? rpActiveOp : rpHintOp} />
        <line x1={SP_W * 0.62} y1={SP_H * 0.5} x2={qb.x} y2={qb.y} stroke={C.orange} strokeWidth={3 * S} opacity={frame >= rephraseAt ? rpActiveOp : rpHintOp} />
      </svg>
      {/* rephrase query origin — chip */}
      <div style={{
        position: "absolute", left: SP_W * 0.62, top: SP_H * 0.5, transform: "translate(-50%,-50%)",
        opacity: frame >= rephraseAt ? 1 : 0.3, zIndex: 5,
        fontFamily: F_TC, fontSize: 18 * S, color: C.textSub, fontWeight: 700,
        background: C.chipBg, border: `1px solid ${C.chipBorder}`,
        borderRadius: 8 * S, padding: `${4 * S}px ${12 * S}px`, whiteSpace: "nowrap" as const,
      }}>同一個問題</div>
      {/* bias dots — chips */}
      <div style={{
        position: "absolute", left: eng.x, top: eng.y, transform: "translate(-50%,-50%)",
        opacity: engA.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S, zIndex: 5,
      }}>
        <div style={{ width: 24 * S, height: 24 * S, borderRadius: "50%", background: C.text, boxShadow: `0 0 ${14 * S}px ${C.text}` }} />
        <span style={{
          fontFamily: F_TC, fontSize: 22 * S, color: C.text, fontWeight: 700,
          background: C.chipBg, border: `1px solid ${C.chipBorder}`, borderRadius: 8 * S, padding: `${4 * S}px ${10 * S}px`,
        }}>工程師</span>
      </div>
      <div style={{
        position: "absolute", left: male.x, top: male.y, transform: "translate(-50%,-50%)",
        opacity: maleA.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S, zIndex: 5,
      }}>
        <div style={{ width: 24 * S, height: 24 * S, borderRadius: "50%", background: C.blue, boxShadow: `0 0 ${14 * S}px ${C.blue}` }} />
        <span style={{
          fontFamily: F_TC, fontSize: 22 * S, color: C.blue, fontWeight: 700,
          background: C.chipBg, border: `1px solid ${C.chipBorder}`, borderRadius: 8 * S, padding: `${4 * S}px ${10 * S}px`,
        }}>男性</span>
      </div>
      {/* warning between them — aischool card */}
      <div style={{
        position: "absolute", left: (eng.x + male.x) / 2, top: (eng.y + male.y) / 2 - 70 * S,
        transform: `translate(-50%,-50%) scale(${Math.max(0.5, warnP)})`,
        opacity: warnP > 0.02 ? 1 : 0, zIndex: 6,
        fontFamily: F_TC, fontSize: 22 * S, color: C.orange, fontWeight: 700,
        background: C.surface2, border: `1px solid ${C.orangeBorder}`, borderRadius: 14 * S,
        padding: `${10 * S}px ${18 * S}px`, whiteSpace: "nowrap" as const,
        boxShadow: `0 0 ${(20 + warnGlow * 20) * S}px rgba(255,159,67,0.18)`,
      }}>⚠ 訓練資料的偏見 ≠ 事實</div>

      {/* rephrase: two query points — chips */}
      <div style={{
        position: "absolute", left: qa.x, top: qa.y, transform: "translate(-50%,-50%)",
        opacity: qaA.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S, zIndex: 5,
      }}>
        <div style={{ width: 22 * S, height: 22 * S, borderRadius: "50%", background: C.primary, boxShadow: `0 0 ${12 * S}px ${C.primary}` }} />
        <span style={{
          fontFamily: F_TC, fontSize: 20 * S, color: C.primary, fontWeight: 700,
          background: C.chipBg, border: `1px solid ${C.chipBorder}`, borderRadius: 8 * S, padding: `${4 * S}px ${10 * S}px`, whiteSpace: "nowrap" as const,
        }}>問法 A → 答案 A</span>
      </div>
      <div style={{
        position: "absolute", left: qb.x, top: qb.y, transform: "translate(-50%,-50%)",
        opacity: qbA.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S, zIndex: 5,
      }}>
        <div style={{ width: 22 * S, height: 22 * S, borderRadius: "50%", background: C.orange, boxShadow: `0 0 ${12 * S}px ${C.orange}` }} />
        <span style={{
          fontFamily: F_TC, fontSize: 20 * S, color: C.orange, fontWeight: 700,
          background: C.chipBg, border: `1px solid ${C.chipBorder}`, borderRadius: 8 * S, padding: `${4 * S}px ${10 * S}px`, whiteSpace: "nowrap" as const,
        }}>問法 B → 答案 B</span>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_21.scene3.to - SCENES_2026_05_21.scene3.from;
  // local = global - 5798
  // Phase B 第一句「最後一個值得留意的 AI 素養點」g6574 → local 776
  const A_FADE_START = 696;
  const A_REMOVE = 776;
  const B_SHOW_AT = 776;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions/orbit (local)
  const HEADER_AT = 0; // g5798 幕後運作
  const APP1_AT = 168; // g5966 Notion AI / Google
  const APP2_AT = 387; // g6185 YouTube / Netflix
  const APP3_AT = 512; // g6310 AI 助理讀文件
  const APP4_AT = 622; // g6420 跨語言搜尋 / 背後都有 Embedding

  // Phase B captions (local)
  const LIT_HEAD_AT = 776; // g6574 AI 素養點
  const LIT_HL_AT = 876; // g6674 訓練資料的語意關係
  const BIAS_AT = 1191; // g6989 偏見 warning
  const TRUTH_AT = 1697; // g7495 找最近模式 != 真懂你
  const REPHRASE_AT = 1956; // g7754 換說法不同位置

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A hero ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="幕後運作 ／ APPLICATIONS" delay={HEADER_AT} color={C.yellow} />}
            sentence={<StageSentence text="Embedding 在你看不到的地方默默運作" delay={HEADER_AT} color={C.text} />}
            takeaway={<StageTakeaway text="這些你每天在用的功能，背後都有 Embedding 在運作" delay={APP4_AT} color={C.yellow} />}
          >
            <Scene3HeroA orbitAt={HEADER_AT + 20} app1At={APP1_AT} app2At={APP2_AT} app3At={APP3_AT} app4At={APP4_AT} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B hero ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="AI 素養 ／ LITERACY" delay={LIT_HEAD_AT} color={C.yellow} />}
          sentence={
            frame >= TRUTH_AT
              ? <StageSentence text="AI 說「理解你」，其實是找到語意最近的模式，不是真的懂你" delay={TRUTH_AT} color={C.yellow} fontSize={26 * S} />
              : frame >= BIAS_AT
              ? <StageSentence text="某些詞的位置反映了訓練資料的偏見" delay={BIAS_AT} color={C.yellow} />
              : <StageSentence text="Embedding 學的是訓練資料的語意關係，不是客觀事實" delay={LIT_HL_AT} color={C.text} fontSize={26 * S} />
          }
          takeaway={<StageTakeaway text="換個說法問，位置可能不同——AI 的理解也可能不同" delay={REPHRASE_AT} color={C.yellow} />}
        >
          <Scene3HeroB biasAt={BIAS_AT} rephraseAt={REPHRASE_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SUMMARY — balanced full-frame recap over faint semantic backdrop ────────
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
      opacity: op,
      display: "flex", alignItems: "center", gap: 36 * S,
      background: C.surface, border: `1px solid ${C.surfaceBorder}`,
      borderRadius: 24 * S, padding: `${26 * S}px ${40 * S}px`,
      boxShadow: `0 0 ${60 * S}px ${color}14`,
    }}>
      <div style={{
        flexShrink: 0, width: 110 * S, height: 110 * S, borderRadius: "50%",
        transform: `scale(${Math.max(0.6, numScale)})`,
        background: C.surface2, border: `1px solid ${color}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F_HEAD, fontSize: 40 * S, color, fontWeight: 800,
        boxShadow: `0 0 ${24 * S}px ${color}33`,
      }}>{number}</div>
      <div style={{
        fontFamily: F_TC, fontSize: 28 * S, color: C.text,
        fontWeight: 700, lineHeight: 1.5,
      }}>{text}</div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_21.summary.to - SCENES_2026_05_21.summary.from;
  // local = global - 8208
  const BADGE_AT = 0; // g8208
  const CARD1_AT = 46; // g8254 第一
  const CARD2_AT = 346; // g8554 第二
  const CARD3_AT = 602; // g8810 第三
  const OUTRO_AT = 890; // g9098 掰掰

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));

  return (
    <SceneFade durationInFrames={dur}>
      {/* faint semantic-space backdrop */}
      <AbsoluteFill style={{ opacity: 0.35 }}>
        <WordConstellation density={0.7} />
      </AbsoluteFill>

      <AbsoluteFill style={{ paddingTop: CONTENT_TOP + 8 * S, paddingBottom: SUBTITLE_SAFE }}>
        {/* eyebrow */}
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

      {/* 3 large takeaways distributed evenly top→bottom (raw canvas px, H=2160) */}
      <BigTakeaway number="01" delay={CARD1_AT} color={C.primary} top={400}
        text="Embedding 把文字轉成數字向量，讓 AI 能計算「語意距離」，理解意思而不只比對字面" />
      <BigTakeaway number="02" delay={CARD2_AT} color={C.cyan} top={820}
        text="它讓搜尋從關鍵字升級到語意，也是 RAG 和推薦系統的核心基礎" />
      <BigTakeaway number="03" delay={CARD3_AT} color={C.yellow} top={1240}
        text="Embedding 反映的是訓練資料的語意關係，可能帶偏見；換個說法問，AI 的理解也可能不同" />

      {/* outro */}
      <div style={{
        ...outroStyle, position: "absolute", left: 0, right: 0, top: 1700,
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.muted,
          letterSpacing: "0.2em", textTransform: "uppercase" as const,
        }}>每日 AI 知識庫</div>
      </div>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Main Composition ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export function VideoComposition_2026_05_21() {
  const frame = useCurrentFrame();
  const T = SCENES_2026_05_21.title;
  const S1 = SCENES_2026_05_21.scene1;
  const S2 = SCENES_2026_05_21.scene2;
  const S3 = SCENES_2026_05_21.scene3;
  const SU = SCENES_2026_05_21.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* processed.wav was recovered from the v1 mp4 (源音檔已被 Phase 3 cleanup 刪除)。
          它已是完整混音（人聲 + bgmusic@0.08 + course_bgm@0.1），故不再另疊 course_bgm，避免 BGM 重複。 */}
      <Audio src={staticFile("audio/2026-05-21-processed.wav")} volume={1.0} />

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
