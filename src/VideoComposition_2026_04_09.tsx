import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  continueRender,
  delayRender,
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

// 🚨 字型載入鐵律 (06-16 案)：必須 delayRender + waitUntilDone，否則 frame 間 font fallback → CJK 標點飄
const fontHandle = delayRender("Loading fonts");
const notoTC = loadNotoSansTC("normal", { weights: ["400", "500", "700", "900"] });
const syne = loadSyne("normal", { weights: ["600", "700", "800"] });
const dmsans = loadDMSans("normal", { weights: ["400", "500"] });
Promise.all([notoTC.waitUntilDone(), syne.waitUntilDone(), dmsans.waitUntilDone()])
  .then(() => continueRender(fontHandle))
  .catch(() => continueRender(fontHandle));

// ── Font stacks (aischool) ────────────────────────────────────────────────
const F_HEAD = "'Syne','Noto Sans TC',sans-serif"; // headings / titles / big numbers / Latin emphasis
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
// Title:    0s        → 0     hook：RAG 是什麼？它記不住你的事
// Scene1:   21.48s    → 644   RAG 是什麼／概念（問題 → 翻資料的助理）
// Scene2:   64.84s    → 1945  兩步驟：檢索 + 生成
// Scene3:   107.52s   → 3226  為什麼重要（限制 → 更快更省）
// Scene4:   166.44s   → 4993  怎麼用 + 隱私提醒
// Summary:  237.84s   → 7135  重點整理
// End:      270.88s   → 8140（+buffer）
export const SCENES_2026_04_09 = {
  title: { from: 0, to: 644 },
  scene1: { from: 644, to: 1945 },
  scene2: { from: 1945, to: 3226 },
  scene3: { from: 3226, to: 4993 },
  scene4: { from: 4993, to: 7135 },
  summary: { from: 7135, to: 8140 },
} as const;
export const TOTAL_FRAMES_2026_04_09 = 8140;

const CHAPTERS = [
  { label: "今日主題", start: 0 },
  { label: "RAG 是什麼", start: 644 },
  { label: "檢索＋生成", start: 1945 },
  { label: "為什麼重要", start: 3226 },
  { label: "怎麼用", start: 4993 },
  { label: "重點整理", start: 7135 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // 99.2s「想一想，如果你的工作需要大量查閱文件」→ 107.52s
  { from: 2976, to: 3226, sender: "想一想", text: "如果你的工作每天都要翻大量文件，RAG 能幫你省下哪些查資料的步驟？" },
  // 158.04s「想一想，你身邊有哪些資訊是外部 AI 不可能知道」→ 165.44s
  { from: 4741, to: 4963, sender: "想一想", text: "你身邊有哪些資訊是外部 AI 不可能知道，但如果它知道了，會對你很有幫助？" },
  // 231.08s「你願意把哪些資料餵給 AI」→ Summary
  { from: 6932, to: 7135, sender: "親身經歷", text: "你願意把哪些資料餵給 AI？哪些資料你覺得還是不要碰比較好？" },
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

// dim → bright tied to a VTT cue (scene-local frame) — 永不 pop-in
function calcDim(activeAt: number, frame: number, dimOpacity = 0.3) {
  const af = Math.max(0, frame - activeAt);
  const t = interpolate(af, [0, 22], [dimOpacity, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return { op: Math.max(dimOpacity, Math.min(1, t)), isOn: frame >= activeAt };
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

// ── iMessage Callout system (cursor blink 已移除 — 鐵律) ─────────────────────
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
          }}>{displayText}</div>
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

// ── RippleRing (one-time activation ripple) ────────────────────────────────
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

// ── Generic chip label with dark backplate (可讀性鐵律) ─────────────────────
function ChipLabel({ children, color = C.text }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color,
      background: C.chipBg, border: `1px solid ${C.chipBorder}`,
      borderRadius: 8 * S, padding: `${4 * S}px ${12 * S}px`, whiteSpace: "nowrap" as const,
    }}>{children}</span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// central hero: AI 記不住 ❓ → 接上 📚 知識庫 → 答得出來
function RagHeroDiagram() {
  const frame = useCurrentFrame();
  const ai = calcDim(118, frame, 0.4);   // 今天聊一個技術
  const forget = calcDim(446, frame, 0.3); // 它記不住你的事
  const lib = calcDim(508, frame, 0.3);  // 看看它怎麼做到（接上知識）
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 30 * S }}>
      {/* AI core */}
      <div style={{
        position: "relative", opacity: ai.op,
        width: 200 * S, height: 200 * S, borderRadius: "50%",
        background: "rgba(124,255,178,0.08)", border: `${2 * S}px solid ${C.primaryBorder}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 * S,
        boxShadow: `0 0 ${40 * S}px ${C.primaryGlow}`,
      }}>
        <span style={{ fontSize: 64 * S }}>🤖</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 700, color: C.primary }}>AI</span>
        {/* forget bubble */}
        <div style={{
          position: "absolute", top: -18 * S, right: -28 * S, opacity: forget.op,
          background: C.surface, border: `1px solid ${C.redBorder}`, borderRadius: 14 * S,
          padding: `${6 * S}px ${14 * S}px`, display: "flex", alignItems: "center", gap: 6 * S,
        }}>
          <span style={{ fontSize: 24 * S }}>❓</span>
          <span style={{ fontFamily: F_TC, fontSize: 18 * S, fontWeight: 700, color: C.red }}>記不住你的事</span>
        </div>
      </div>

      {/* connector */}
      <div style={{ opacity: lib.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S }}>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.primary, letterSpacing: "0.1em" }}>RAG 接上</span>
        <span style={{ fontSize: 40 * S, color: C.primary }}>→</span>
      </div>

      {/* knowledge base */}
      <div style={{
        position: "relative", opacity: lib.op,
        width: 220 * S, height: 200 * S, borderRadius: 24 * S,
        background: C.surface, border: `1px solid ${lib.isOn ? C.primaryBorder : C.surfaceBorder}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 * S,
        boxShadow: lib.isOn ? `0 0 ${40 * S}px ${C.primaryGlow}` : "none",
      }}>
        {lib.isOn && <RippleRing activeAt={508} color={C.primary} radius={24 * S} />}
        <span style={{ fontSize: 60 * S }}>📚</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: C.text }}>你的資料</span>
      </div>
    </div>
  );
}

function TitleScene() {
  const dur = SCENES_2026_04_09.title.to - SCENES_2026_04_09.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(36);
  const heroStyle = useFadeUp(100);
  const tagStyle = useFadeUp(150);

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
          }}>每日 AI 知識庫</span>
        </div>

        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 48 * S, color: C.text,
        }}>
          <WordReveal text="RAG 是什麼？" startFrame={10} staggerPerWord={6}
            fontSize={48 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 34 * S, color: C.primary,
        }}>
          <WordReveal text="讓 AI 記住你的資料" startFrame={28} staggerPerWord={6}
            fontSize={34 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 22 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          一個你可能聽過，但不太確定它在做什麼的技術
        </p>

        <div style={{ ...heroStyle, marginTop: 36 * S }}>
          <RagHeroDiagram />
        </div>

        <div style={{ ...tagStyle, marginTop: 34 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>是什麼 · 為什麼重要 · 怎麼用</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — RAG 是什麼 / 概念 ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function ChatBubble({ side, accent, label, text, activeAt, dim = 0.32 }: {
  side: "left" | "right"; accent: string; label: string; text: string; activeAt: number; dim?: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, dim);
  return (
    <div style={{
      opacity: op, alignSelf: side === "left" ? "flex-start" : "flex-end", maxWidth: 760 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 18 * S, padding: `${12 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", gap: 4 * S,
      boxShadow: isOn ? `0 0 ${28 * S}px ${accent}1a` : "none",
    }}>
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: accent, letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontFamily: F_TC, fontSize: 22 * S, color: C.text, lineHeight: 1.35 }}>{text}</span>
    </div>
  );
}

function Scene1HeroA() {
  const frame = useCurrentFrame();
  const reason = calcDim(264, frame, 0.32);  // 只靠訓練資料
  const notknow = calcDim(400, frame, 0.32); // 不知道公司規定
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 * S, width: 1180 * S }}>
      <ChatBubble side="right" accent={C.blue} label="你問 AI" text="我們公司的請假流程是什麼？" activeAt={75} />
      <ChatBubble side="left" accent={C.red} label="一般 AI ❌ 通用答案" text="得到一個很通用、完全不符合你公司的回答" activeAt={144} />
      {/* reason row */}
      <div style={{ display: "flex", gap: 18 * S, justifyContent: "center", marginTop: 8 * S }}>
        <div style={{
          opacity: reason.op, flex: 1, maxWidth: 520 * S,
          display: "flex", alignItems: "center", gap: 14 * S,
          background: C.surface, border: `1px solid ${reason.isOn ? C.surfaceBorder : C.surfaceBorder}`,
          borderRadius: 16 * S, padding: `${14 * S}px ${20 * S}px`,
        }}>
          <span style={{ fontSize: 34 * S }}>🧠</span>
          <span style={{ fontFamily: F_TC, fontSize: 21 * S, color: reason.isOn ? C.text : C.textSub, fontWeight: 500, lineHeight: 1.3 }}>只靠訓練時看過的資料來回答</span>
        </div>
        <div style={{
          opacity: notknow.op, flex: 1, maxWidth: 520 * S,
          display: "flex", alignItems: "center", gap: 14 * S,
          background: C.redLight, border: `1px solid ${notknow.isOn ? C.redBorder : C.surfaceBorder}`,
          borderRadius: 16 * S, padding: `${14 * S}px ${20 * S}px`,
        }}>
          <span style={{ fontSize: 34 * S }}>🔒</span>
          <span style={{ fontFamily: F_TC, fontSize: 21 * S, color: notknow.isOn ? C.text : C.textSub, fontWeight: 500, lineHeight: 1.3 }}>根本不知道你公司的規定</span>
        </div>
      </div>
    </div>
  );
}

function AssistantCard({ accent, icon, role, desc, activeAt, highlight }: {
  accent: string; icon: string; role: string; desc: string; activeAt: number; highlight?: boolean;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      width: 460 * S, opacity: op,
      background: highlight ? C.primaryLight : C.surface,
      border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${24 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      boxShadow: isOn && highlight ? `0 0 ${44 * S}px ${accent}22` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 96 * S, height: 96 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 * S,
      }}>{icon}</div>
      <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{role}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, textAlign: "center", lineHeight: 1.45 }}>{desc}</span>
    </div>
  );
}

function Scene1HeroB() {
  const frame = useCurrentFrame();
  const name = calcDim(0, frame, 0.4);      // B 開頭就在場（全名）
  const cn = calcDim(159, frame, 0.32);     // 中文叫做（local 642? — 用 NAME 區段，見下）
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      {/* naming banner */}
      <div style={{
        opacity: name.op, display: "flex", alignItems: "center", gap: 16 * S,
        background: C.surface, border: `1px solid ${cn.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 16 * S, padding: `${12 * S}px ${26 * S}px`,
        boxShadow: cn.isOn ? `0 0 ${40 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color: C.primary }}>RAG</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 600, color: C.textSub }}>Retrieval-Augmented Generation</span>
        <span style={{ width: 1, height: 30 * S, background: C.surfaceBorder }} />
        <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: cn.isOn ? C.text : C.textSub }}>檢索增強生成</span>
      </div>
      {/* two assistants */}
      <div style={{ display: "flex", gap: 28 * S, justifyContent: "center", alignItems: "stretch" }}>
        <AssistantCard accent={C.muted} icon="🧠" role="一般的 AI" desc="像一個只靠記憶回答的人" activeAt={244} />
        <AssistantCard accent={C.primary} icon="📚" role="RAG 的 AI" desc="像會先去翻資料、再整理成有條理回答的助理" activeAt={350} highlight />
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_09.scene1.to - SCENES_2026_04_09.scene1.from;
  // local = global - 644. Phase B「概念其實很直觀」45.56s→1367, local 723; 全名 37.56→1127 local 483
  const A_FADE_START = 403;
  const A_REMOVE = 483;
  const B_SHOW_AT = 483;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0;    // g644 你有沒有試過問 AI
  const REASON_AT = 264;  // g908 只靠訓練資料
  const NOTKNOW_AT = 400; // g1044 不知道公司規定

  // Phase B captions (local)
  const CONCEPT_AT = 723; // g1367 概念其實很直觀
  const RETRIEVE_AT = 994; // g1638 RAG 先去翻資料

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="問題 ／ THE PROBLEM" delay={HEADER_AT} color={C.red} />}
            sentence={
              frame >= NOTKNOW_AT
                ? <StageSentence text="它根本不知道你公司的規定" delay={NOTKNOW_AT} color={C.red} />
                : frame >= REASON_AT
                ? <StageSentence text="因為 AI 只靠訓練時看過的資料回答" delay={REASON_AT} color={C.red} fontSize={26 * S} />
                : <StageSentence text="問 AI 公司的請假流程，卻得到通用又不對的答案" delay={HEADER_AT} color={C.text} fontSize={26 * S} />
            }
            takeaway={<StageTakeaway text="一般 AI 記不住你的事——這正是 RAG 要解決的問題" delay={NOTKNOW_AT} color={C.red} />}
          >
            <Scene1HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="核心概念 ／ THE IDEA" delay={B_SHOW_AT} color={C.primary} />}
          sentence={
            frame >= RETRIEVE_AT
              ? <StageSentence text="RAG 的 AI 會先去翻資料，再整理成回答" delay={RETRIEVE_AT} color={C.primary} fontSize={26 * S} />
              : <StageSentence text="RAG＝檢索增強生成，概念其實很直觀" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="一個會先翻資料的助理，比只靠記憶回答可靠得多" delay={RETRIEVE_AT} color={C.primary} />}
        >
          <Scene1HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 兩步驟：檢索 + 生成 ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function PipelineStep({ stepNo, label, sub, icon, accent, brightAt, lines }: {
  stepNo: string; label: string; sub: string; icon: string; accent: string;
  brightAt: number; lines: { text: string; at: number }[];
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(brightAt, frame, 0.32);
  return (
    <div style={{
      width: 420 * S, opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${20 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", gap: 14 * S,
      boxShadow: isOn ? `0 0 ${36 * S}px ${accent}1f` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={brightAt} color={accent} radius={22 * S} />}
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
        <div style={{
          width: 70 * S, height: 70 * S, borderRadius: 16 * S, flexShrink: 0,
          background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 * S,
        }}>{icon}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: accent, letterSpacing: "0.12em" }}>{stepNo} · {sub}</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 28 * S, fontWeight: 800, color: isOn ? C.text : C.textSub }}>{label}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S }}>
        {lines.map((ln, i) => {
          const a = calcDim(ln.at, frame, 0.28);
          return (
            <div key={i} style={{
              opacity: a.op, display: "flex", alignItems: "center", gap: 10 * S,
              fontFamily: F_TC, fontSize: 20 * S, color: a.isOn ? C.text : C.textSub, lineHeight: 1.35,
            }}>
              <span style={{ color: accent, fontSize: 20 * S, flexShrink: 0 }}>›</span>
              <span>{ln.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Scene2HeroA() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 * S }}>
      {/* question */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
      }}>
        <div style={{
          width: 110 * S, height: 110 * S, borderRadius: "50%",
          background: C.surface, border: `1px solid ${C.surfaceBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 * S,
        }}>❓</div>
        <ChipLabel color={C.textSub}>你的問題</ChipLabel>
      </div>
      <span style={{ fontSize: 40 * S, color: C.blue }}>→</span>
      <PipelineStep
        stepNo="STEP 1" sub="RETRIEVAL" label="檢索" icon="📚" accent={C.blue} brightAt={113}
        lines={[
          { text: "從你提供的文件、資料庫裡", at: 177 },
          { text: "找出跟問題最相關的片段", at: 293 },
        ]}
      />
      <span style={{ fontSize: 40 * S, color: C.primary }}>→</span>
      <PipelineStep
        stepNo="STEP 2" sub="GENERATION" label="生成" icon="✍️" accent={C.primary} brightAt={403}
        lines={[
          { text: "把找到的片段當參考資料", at: 472 },
          { text: "寫出一段有邏輯的回答", at: 592 },
        ]}
      />
    </div>
  );
}

function SourceCard({ icon, label, activeAt }: { icon: string; label: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      width: 300 * S, opacity: op,
      background: C.surface, border: `1px solid ${isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 18 * S, padding: `${18 * S}px ${20 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      boxShadow: isOn ? `0 0 ${28 * S}px ${C.primaryGlow}` : "none",
    }}>
      <span style={{ fontSize: 44 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: isOn ? C.text : C.textSub, textAlign: "center" }}>{label}</span>
    </div>
  );
}

function Scene2HeroB() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
      <div style={{ display: "flex", gap: 22 * S, justifyContent: "center" }}>
        <SourceCard icon="📄" label="你公司的文件" activeAt={862} />
        <SourceCard icon="🆕" label="最新的產品說明" activeAt={862} />
        <SourceCard icon="📝" label="你自己的筆記" activeAt={963} />
      </div>
      <span style={{ fontSize: 36 * S, color: C.primary }}>↓</span>
      <div style={{
        display: "flex", alignItems: "center", gap: 18 * S,
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 20 * S, padding: `${16 * S}px ${34 * S}px`,
        boxShadow: `0 0 ${44 * S}px ${C.primaryGlow}`,
      }}>
        <span style={{ fontSize: 44 * S }}>🤖</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 700, color: C.text }}>能回答它原本不知道的東西</span>
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_09.scene2.to - SCENES_2026_04_09.scene2.from;
  // local = global - 1945. Phase B「設計讓 AI 回答不知道」88.12s→2644, local 699
  const A_FADE_START = 619;
  const A_REMOVE = 699;
  const B_SHOW_AT = 699;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  const HEADER_AT = 0;   // g1945 RAG 分成兩個步驟
  const STEP1_AT = 113;  // g2058 第一步 檢索
  const STEP2_AT = 403;  // g2348 第二步 生成
  const DOC_AT = 862;    // g2807 公司文件 / 產品說明

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="運作方式 ／ HOW IT WORKS" delay={HEADER_AT} color={C.blue} />}
            sentence={
              frame >= STEP2_AT
                ? <StageSentence text="第二步「生成」：把片段當參考，寫出回答" delay={STEP2_AT} color={C.primary} fontSize={26 * S} />
                : frame >= STEP1_AT
                ? <StageSentence text="第一步「檢索」：先找出最相關的片段" delay={STEP1_AT} color={C.blue} fontSize={26 * S} />
                : <StageSentence text="具體來說，RAG 分成兩個步驟" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="先檢索、再生成——找到對的資料，才寫得出對的答案" delay={STEP2_AT} color={C.blue} />}
          >
            <Scene2HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="能做到什麼 ／ WHAT IT UNLOCKS" delay={B_SHOW_AT} color={C.primary} />}
          sentence={<StageSentence text="讓 AI 回答它原本不知道的東西" delay={B_SHOW_AT} color={C.text} />}
          takeaway={<StageTakeaway text="公司文件、最新產品說明、你自己的筆記，都能成為它的答案來源" delay={DOC_AT} color={C.primary} />}
        >
          <Scene2HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 為什麼重要（限制 → 更快更省）─────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function LockedCard({ icon, label, activeAt, entranceAt }: { icon: string; label: string; activeAt: number; entranceAt: number }) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      width: 420 * S, display: "flex", alignItems: "center", gap: 16 * S,
      background: C.redLight, border: `1px solid ${isOn ? C.redBorder : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${14 * S}px ${20 * S}px`,
    }}>
      <span style={{ fontSize: 32 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: isOn ? C.text : C.textSub, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 26 * S }}>🔒</span>
    </div>
  );
}

function Scene3HeroA() {
  const frame = useCurrentFrame();
  const freeze = calcDim(109, frame, 0.32); // 知識凍結
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      {/* frozen LLM */}
      <div style={{
        opacity: freeze.op, position: "relative",
        display: "flex", alignItems: "center", gap: 18 * S,
        background: C.surface, border: `1px solid ${freeze.isOn ? C.blueBorder : C.surfaceBorder}`,
        borderRadius: 22 * S, padding: `${18 * S}px ${30 * S}px`,
      }}>
        <span style={{ fontSize: 48 * S }}>🤖</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: C.text }}>一般語言模型</span>
        <span style={{ width: 1, height: 40 * S, background: C.surfaceBorder }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
          <span style={{ fontSize: 38 * S }}>❄️</span>
          <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: C.blue }}>知識凍結在訓練截止日</span>
        </div>
      </div>
      {/* private data it can't see */}
      <div style={{ display: "flex", gap: 22 * S, justifyContent: "center" }}>
        <LockedCard icon="🗓️" label="上週的會議記錄" entranceAt={204} activeAt={325} />
        <LockedCard icon="👥" label="你的客戶資料" entranceAt={204} activeAt={470} />
      </div>
    </div>
  );
}

function CompareCard({ icon, title, points, accent, activeAt, highlight }: {
  icon: string; title: string; points: string[]; accent: string; activeAt: number; highlight?: boolean;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      width: 480 * S, opacity: op,
      background: highlight ? C.primaryLight : C.surface,
      border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${26 * S}px`,
      display: "flex", flexDirection: "column", gap: 14 * S,
      boxShadow: isOn && highlight ? `0 0 ${44 * S}px ${accent}22` : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
        <span style={{ fontSize: 38 * S }}>{icon}</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color: isOn ? C.text : C.textSub }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S }}>
        {points.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 * S, fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, lineHeight: 1.35 }}>
            <span style={{ color: accent, fontSize: 20 * S, flexShrink: 0 }}>•</span>
            <span>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Scene3HeroB() {
  const frame = useCurrentFrame();
  const ent = calcDim(1256, frame, 0.32); // 企業第一步
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 * S }}>
      <div style={{ display: "flex", gap: 28 * S, justifyContent: "center", alignItems: "stretch" }}>
        <CompareCard icon="🐢" title="重新微調模型" accent={C.muted} activeAt={579}
          points={["每次都要重新訓練", "更慢、更花錢"]} />
        <CompareCard icon="⚡" title="改用 RAG" accent={C.primary} activeAt={665} highlight
          points={["不必重新訓練就能接觸新知識", "資料更新，只要更新文件就好"]} />
      </div>
      <div style={{
        opacity: ent.op, display: "flex", alignItems: "center", gap: 14 * S,
        background: C.surface, border: `1px solid ${ent.isOn ? C.primaryBorder : C.surfaceBorder}`,
        borderRadius: 16 * S, padding: `${12 * S}px ${28 * S}px`,
        boxShadow: ent.isOn ? `0 0 ${36 * S}px ${C.primaryGlow}` : "none",
      }}>
        <span style={{ fontSize: 34 * S }}>🏢</span>
        <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text }}>很多企業導入 AI 的第一步，就是架 RAG 系統</span>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_09.scene3.to - SCENES_2026_04_09.scene3.from;
  // local = global - 3226. Phase B「RAG 解決就是這個問題」126.84s→3805, local 579
  const A_FADE_START = 499;
  const A_REMOVE = 579;
  const B_SHOW_AT = 579;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  const HEADER_AT = 0;    // g3226 根本限制
  const FREEZE_AT = 109;  // g3335 知識凍結
  const PRIVATE_AT = 204; // g3430 不知道私人資料
  const FAST_AT = 824;    // g4050 比微調更快更省

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="根本限制 ／ THE LIMIT" delay={HEADER_AT} color={C.orange} />}
            sentence={
              frame >= PRIVATE_AT
                ? <StageSentence text="而且它完全不知道你的私人資料" delay={PRIVATE_AT} color={C.orange} />
                : frame >= FREEZE_AT
                ? <StageSentence text="它的知識凍結在訓練截止日" delay={FREEZE_AT} color={C.blue} />
                : <StageSentence text="一般語言模型有一個根本限制" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="上週的會議記錄、你的客戶資料，它都答不出來" delay={PRIVATE_AT} color={C.orange} />}
          >
            <Scene3HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="為什麼重要 ／ WHY IT MATTERS" delay={B_SHOW_AT} color={C.primary} />}
          sentence={
            frame >= FAST_AT
              ? <StageSentence text="比重新微調模型更快、更省錢" delay={FAST_AT} color={C.primary} />
              : <StageSentence text="RAG 解決的就是這個問題" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="不用重新訓練、只要更新文件——所以成了企業導入 AI 的第一步" delay={FAST_AT} color={C.primary} />}
        >
          <Scene3HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 4 — 怎麼用 + 隱私提醒 ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function UserColumn({ icon, role, accent, items }: {
  icon: string; role: string; accent: string; items: { icon: string; text: string; at: number }[];
}) {
  const frame = useCurrentFrame();
  const head = calcDim(items[0]?.at ?? 0, frame, 0.4);
  return (
    <div style={{
      width: 520 * S, opacity: head.op,
      background: C.surface, border: `1px solid ${head.isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${24 * S}px`,
      display: "flex", flexDirection: "column", gap: 16 * S,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
        <div style={{
          width: 64 * S, height: 64 * S, borderRadius: "50%",
          background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 * S,
        }}>{icon}</div>
        <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color: C.text }}>{role}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
        {items.map((it, i) => {
          const a = calcDim(it.at, frame, 0.3);
          return (
            <div key={i} style={{
              opacity: a.op, display: "flex", alignItems: "center", gap: 12 * S,
              background: C.surface2, border: `1px solid ${a.isOn ? accent + "44" : C.surfaceBorder}`,
              borderRadius: 12 * S, padding: `${10 * S}px ${16 * S}px`,
            }}>
              <span style={{ fontSize: 26 * S }}>{it.icon}</span>
              <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: a.isOn ? C.text : C.textSub, lineHeight: 1.3 }}>{it.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Scene4HeroA() {
  return (
    <div style={{ display: "flex", gap: 28 * S, justifyContent: "center", alignItems: "stretch" }}>
      <UserColumn icon="👤" role="一般使用者" accent={C.purple}
        items={[
          { icon: "📤", text: "上傳文件給 AI，讓它回答問題", at: 204 },
          { icon: "🔗", text: "把 Notion 筆記連接到 AI 助理", at: 328 },
        ]} />
      <UserColumn icon="⚙️" role="開發者" accent={C.blue}
        items={[
          { icon: "🗂️", text: "搭配向量資料庫", at: 601 },
          { icon: "✂️", text: "把文件切成小片段、轉成向量", at: 706 },
        ]} />
    </div>
  );
}

function PrivacyCard({ icon, label, accent, activeAt, entranceAt }: {
  icon: string; label: string; accent: string; activeAt: number; entranceAt: number;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const { op, isOn } = calcDim(activeAt, frame, 0.32);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * op,
      width: 360 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 18 * S, padding: `${20 * S}px ${18 * S}px`,
      boxShadow: isOn ? `0 0 ${28 * S}px ${accent}1f` : "none",
    }}>
      <div style={{
        width: 70 * S, height: 70 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 * S,
      }}>{icon}</div>
      <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: isOn ? C.text : C.textSub, textAlign: "center", lineHeight: 1.35 }}>{label}</span>
    </div>
  );
}

function Scene4HeroB() {
  const frame = useCurrentFrame();
  const where = calcDim(1140, frame, 0.32); // 資料存在哪裡
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      {/* private docs → cloud? question */}
      <div style={{
        opacity: where.op, display: "flex", alignItems: "center", gap: 18 * S,
        background: C.redLight, border: `1px solid ${where.isOn ? C.redBorder : C.surfaceBorder}`,
        borderRadius: 18 * S, padding: `${14 * S}px ${28 * S}px`,
      }}>
        <span style={{ fontSize: 38 * S }}>📄</span>
        <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text }}>把私人文件交給 RAG</span>
        <span style={{ fontSize: 30 * S, color: C.red }}>→</span>
        <span style={{ fontSize: 38 * S }}>☁️</span>
        <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.red }}>資料到底存在哪裡？</span>
      </div>
      {/* three advice cards */}
      <div style={{ display: "flex", gap: 22 * S, justifyContent: "center" }}>
        <PrivacyCard icon="⚠️" label="敏感資料：客戶資料、合約內容" accent={C.red} entranceAt={947} activeAt={1359} />
        <PrivacyCard icon="🔍" label="先確認服務的隱私政策" accent={C.orange} entranceAt={947} activeAt={1486} />
        <PrivacyCard icon="🖥️" label="考慮本機運行的私有部署" accent={C.primary} entranceAt={947} activeAt={1564} />
      </div>
    </div>
  );
}

function Scene4() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_09.scene4.to - SCENES_2026_04_09.scene4.from;
  // local = global - 4993. Phase B「重要提醒」198s→5940, local 947
  const A_FADE_START = 867;
  const A_REMOVE = 947;
  const B_SHOW_AT = 947;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  const HEADER_AT = 0;   // g4993 如果你是一般使用者
  const DEV_AT = 553;    // g5546 如果你是開發者
  const SENSITIVE_AT = 1359; // g6352 敏感資料
  const NOTGONE_AT = 1704;   // g6697 不等於消失

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="怎麼用 ／ HOW TO USE" delay={HEADER_AT} color={C.purple} />}
            sentence={
              frame >= DEV_AT
                ? <StageSentence text="開發者：搭配向量資料庫，把文件切片轉成向量" delay={DEV_AT} color={C.blue} fontSize={26 * S} />
                : <StageSentence text="很多工具其實已經內建類似 RAG 的功能" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="上傳文件、連接筆記，背後通常都是類似 RAG 的概念" delay={DEV_AT} color={C.purple} />}
          >
            <Scene4HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="重要提醒 ／ PRIVACY" delay={B_SHOW_AT} color={C.red} />}
          sentence={
            frame >= SENSITIVE_AT
              ? <StageSentence text="敏感資料更要先確認隱私政策" delay={SENSITIVE_AT} color={C.red} />
              : <StageSentence text="你的私人文件，交給 RAG 後存在哪裡？" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="資料交給 AI 處理，不等於資料就消失了——用之前一定要先想清楚" delay={NOTGONE_AT} color={C.red} />}
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
  const { op, isOn } = calcDim(activeAt, frame, 0.28);
  return (
    <div style={{
      width: 1080 * S, opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${30 * S}px`,
      display: "flex", alignItems: "center", gap: 24 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${accent}1f` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 90 * S, height: 90 * S, borderRadius: "50%", flexShrink: 0,
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42 * S,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 6 * S }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 22 * S, color: accent }}>{index}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 26 * S, color: isOn ? C.text : C.textSub }}>{title}</span>
        </div>
        <div style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, lineHeight: 1.45 }}>{body}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_04_09.summary.to - SCENES_2026_04_09.summary.from;
  // local = global - 7135
  const eyebrowFade = useFadeIn(6);
  const headFade = useFadeUp(14);
  const outroFade = useFadeUp(870);
  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        paddingTop: CONTENT_TOP + 16 * S, paddingBottom: SUBTITLE_SAFE,
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
        }}>RAG 的三個面向</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 * S }}>
          <RecapCard index="01" icon="🔎" title="RAG 是什麼" accent={C.primary} activeAt={132}
            body="讓 AI 在回答前先查你指定的資料，突破訓練截止日與私人知識的限制。" />
          <RecapCard index="02" icon="⚡" title="為什麼重要" accent={C.orange} activeAt={430}
            body="比重新訓練模型更快、更省錢，是企業導入 AI 的第一步。" />
          <RecapCard index="03" icon="🛠️" title="怎麼用" accent={C.blue} activeAt={646}
            body="許多工具已內建類似功能；使用前，務必確認資料的存放位置與隱私政策。" />
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

export const VideoComposition_2026_04_09: React.FC = () => {
  const frame = useCurrentFrame();
  const Sx = SCENES_2026_04_09;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-09-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f, [TOTAL_FRAMES_2026_04_09 - 150, TOTAL_FRAMES_2026_04_09], [v, 0],
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
