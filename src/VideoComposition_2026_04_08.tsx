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

// ── Font loading (waitUntilDone 鐵律：避免 frame 間 CJK 標點漂移閃爍) ──────────
const fontHandle = delayRender("Loading fonts");
const notoTC = loadNotoSansTC("normal", { weights: ["400", "500", "700", "900"] });
const syne = loadSyne("normal", { weights: ["600", "700", "800"] });
const dmsans = loadDMSans("normal", { weights: ["400", "500"] });
Promise.all([notoTC.waitUntilDone(), syne.waitUntilDone(), dmsans.waitUntilDone()])
  .then(() => continueRender(fontHandle))
  .catch(() => continueRender(fontHandle));

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
// Title:   0s        → 0     hook（你問過 AI、答案超有信心卻是錯的）+ 三件事預告
// Scene1:  44.72s    → 1342  幻覺長什麼樣子（霧中走路 + 三種形態）
// Scene2:  118.16s   → 3545  為什麼會這樣（逐字預測 + 聽起來對≠實際對）
// Scene3:  224.0s    → 6720  該怎麼做（高風險驗證／低風險放心／問法）
// Summary: 315.76s   → 9473  重點整理
// End:     337.52s   → 10126（+buffer → 10140）
export const SCENES_2026_04_08 = {
  title: { from: 0, to: 1342 },
  scene1: { from: 1342, to: 3545 },
  scene2: { from: 3545, to: 6720 },
  scene3: { from: 6720, to: 9473 },
  summary: { from: 9473, to: 10140 },
} as const;
export const TOTAL_FRAMES_2026_04_08 = 10140;

const CHAPTERS = [
  { label: "認識幻覺", start: 0 },
  { label: "三種形態", start: 1342 },
  { label: "為什麼會這樣", start: 3545 },
  { label: "聰明地用", start: 6720 },
  { label: "重點整理", start: 9473 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene1 結尾：信任的疑問（104.8s「你有沒有遇過這種情況」）
  { from: 3144, to: 3545, sender: "親身經歷", text: "AI 給你一個超詳細的答案，你後來去查卻發現根本不對——那一刻，你還會信任它嗎？" },
  // Scene2 結尾：本質的反思（211.44s「如果 AI 的本質是預測文字」）
  { from: 6343, to: 6720, sender: "想一想", text: "如果 AI 的本質是「預測文字」而不是「查找事實」，什麼類型的問題最容易讓它出錯？什麼又最安全？" },
  // Scene3 結尾：責任的疑問（300.72s「驗證 AI 的輸出該是誰的責任」）
  { from: 9022, to: 9473, sender: "想一想", text: "如果有人完全相信 AI、直接把答案用在報告上，可能有什麼後果？驗證輸出，又該是誰的責任？" },
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

// dim → bright tied to a VTT cue (scene-local frame)
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

// ── RippleRing (one-shot activation ripple) ────────────────────────────────
function RippleRing({ activeAt, color, radius = "50%" }: { activeAt: number; color: string; radius?: number | string }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - activeAt);
  if (f > 30) return null;
  const scale = interpolate(f, [0, 26], [0.85, 1.7], { easing: E.outExpo, extrapolateRight: "clamp" });
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
        opacity: 0.9, boxShadow: `0 0 ${8 * S}px ${color}`, flexShrink: 0,
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

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// confident-but-wrong AI answer card (the core hook metaphor)
function ConfidentWrongCard({ appearAt, wrongAt }: { appearAt: number; wrongAt: number }) {
  const frame = useCurrentFrame();
  const a = calcActive(appearAt, frame, 0.3);
  const wrong = frame >= wrongAt;
  const stampScale = easeOutBack(prog(Math.max(0, frame - wrongAt), 20));
  return (
    <div style={{
      position: "relative", opacity: a.op, width: 520 * S,
      background: C.surface, border: `1px solid ${wrong ? C.redBorder : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${16 * S}px ${24 * S}px`,
      display: "flex", flexDirection: "column", gap: 11 * S,
      boxShadow: wrong ? `0 0 ${50 * S}px ${C.red}1f` : `0 0 ${40 * S}px ${C.primaryGlow}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
        <div style={{
          width: 50 * S, height: 50 * S, borderRadius: 14 * S, flexShrink: 0,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 * S,
        }}>🤖</div>
        <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: C.text }}>AI 的回答</span>
        <span style={{
          marginLeft: "auto", fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.primary,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
          borderRadius: 10 * S, padding: `${4 * S}px ${12 * S}px`,
        }}>超有信心</span>
      </div>
      <div style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, lineHeight: 1.5 }}>
        「根據《某某研究》第 47 頁的數據，答案非常明確……」
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted }}>詳細 · 流暢 · 格式完整</span>
        {wrong && (
          <span style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 * S,
            transform: `scale(${Math.max(0.6, stampScale)})`,
            fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: C.red,
            background: C.redLight, border: `1px solid ${C.redBorder}`,
            borderRadius: 12 * S, padding: `${6 * S}px ${16 * S}px`,
          }}>❌ 其實是錯的</span>
        )}
      </div>
    </div>
  );
}

function PreviewChip({ icon, title, accent, activeAt }: {
  icon: string; title: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const a = calcActive(activeAt, frame, 0.32);
  const sc = a.isOn ? easeOutBack(prog(Math.max(0, frame - activeAt), 22)) : 0.9;
  return (
    <div style={{
      position: "relative", width: 252 * S, opacity: a.op,
      transform: `scale(${Math.max(0.9, Math.min(1, sc))})`,
      background: C.surface, border: `1px solid ${a.isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${16 * S}px ${16 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 11 * S,
      boxShadow: a.isOn ? `0 0 ${36 * S}px ${accent}1f` : "none",
    }}>
      {a.isOn && <RippleRing activeAt={activeAt} color={accent} radius={20 * S} />}
      <div style={{
        width: 64 * S, height: 64 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 * S,
      }}>{icon}</div>
      <span style={{
        fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub,
        textAlign: "center", lineHeight: 1.25,
      }}>{title}</span>
    </div>
  );
}

function TitleScene() {
  const dur = SCENES_2026_04_08.title.to - SCENES_2026_04_08.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(36);
  const heroStyle = useFadeUp(60);
  const rowStyle = useFadeUp(835);
  const tagStyle = useFadeUp(855);

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
          ...badgeOp, marginBottom: 10 * S,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S,
        }}>
          <span style={{
            width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
            opacity: 0.9, boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          }} />
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 20 * S,
            color: C.primary, letterSpacing: "0.2em", textTransform: "uppercase" as const,
          }}>每日 AI 知識庫</span>
        </div>

        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 40 * S, color: C.text,
        }}>
          <WordReveal text="AI 為什麼會「幻覺」？" startFrame={10} staggerPerWord={6}
            fontSize={40 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 28 * S, color: C.primary,
        }}>
          <WordReveal text="它不是在說謊" startFrame={28} staggerPerWord={6}
            fontSize={28 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 12 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          它給你一個超有信心的答案，後來卻發現根本是錯的
        </p>

        {/* central hook hero — confident wrong answer */}
        <div style={{ ...heroStyle, marginTop: 18 * S }}>
          <ConfidentWrongCard appearAt={60} wrongAt={526} />
        </div>

        {/* three-things preview chips */}
        <div style={{ ...rowStyle, marginTop: 20 * S, display: "flex", gap: 24 * S, justifyContent: "center" }}>
          <PreviewChip icon="🌫️" title="長什麼樣子" accent={C.primary} activeAt={919} />
          <PreviewChip icon="🧠" title="為什麼會這樣" accent={C.blue} activeAt={1030} />
          <PreviewChip icon="🧭" title="該怎麼用" accent={C.orange} activeAt={1171} />
        </div>

        <div style={{ ...tagStyle, marginTop: 16 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>AI 幻覺 · 逐字預測 · 怎麼聰明地用</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — 幻覺長什麼樣子 ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: a walker in fog confidently labels a blurry shape "a tree" → nothing
function FogWalker({ treeAt, emptyAt }: { treeAt: number; emptyAt: number }) {
  const frame = useCurrentFrame();
  const tree = calcActive(treeAt, frame, 0);
  const empty = frame >= emptyAt;
  const treeFade = empty
    ? interpolate(frame, [emptyAt, emptyAt + 22], [1, 0.12], { easing: E.outCubic, extrapolateRight: "clamp" })
    : tree.op;
  const emptyIn = calcActive(emptyAt, frame, 0);
  return (
    <div style={{
      position: "relative", width: 980 * S, height: 360 * S, borderRadius: 28 * S, overflow: "hidden",
      background: "linear-gradient(135deg, #14141d 0%, #1b1b27 55%, #14141d 100%)",
      border: `1px solid ${C.surfaceBorder}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: `0 ${70 * S}px`,
    }}>
      {/* fog veil */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 60% 80% at 72% 50%, rgba(240,240,245,0.10) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />
      {/* walker */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S, zIndex: 2 }}>
        <div style={{ fontSize: 78 * S, filter: "drop-shadow(0 0 12px rgba(0,0,0,0.5))" }}>🚶</div>
        {/* speech: confident claim */}
        <div style={{
          opacity: tree.op, display: "flex", alignItems: "center", gap: 8 * S,
          background: C.surface, border: `1px solid ${tree.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 14 * S, padding: `${8 * S}px ${16 * S}px`, whiteSpace: "nowrap" as const,
        }}>
          <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text }}>「那是一棵樹」</span>
          <span style={{ color: C.primary, fontSize: 22 * S, fontWeight: 800 }}>✓</span>
        </div>
      </div>
      {/* the shape: blurry tree → nothing */}
      <div style={{ position: "relative", width: 280 * S, height: 280 * S, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          fontSize: 128 * S, opacity: treeFade,
          filter: `blur(${empty ? 2 : 6}px) grayscale(0.4)`,
        }}>🌳</div>
        {empty && (
          <div style={{
            position: "absolute", inset: 0, opacity: emptyIn.op,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 * S,
          }}>
            <span style={{ fontSize: 70 * S, opacity: 0.5 }}>❓</span>
            <span style={{
              fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.red,
              background: C.redLight, border: `1px solid ${C.redBorder}`,
              borderRadius: 12 * S, padding: `${6 * S}px ${16 * S}px`, whiteSpace: "nowrap" as const,
            }}>走近一看，什麼都沒有</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Phase B form card (dim → bright stack)
function FormCard({ icon, title, desc, accent, entranceAt, activeAt }: {
  icon: string; title: string; desc: string; accent: string; entranceAt: number; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const a = calcActive(activeAt, frame, 0.28);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * a.op,
      position: "relative", width: 366 * S, alignSelf: "stretch",
      background: C.surface, border: `1px solid ${a.isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${24 * S}px ${24 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      boxShadow: a.isOn ? `0 0 ${36 * S}px ${accent}1f` : "none",
    }}>
      {a.isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 84 * S, height: 84 * S, borderRadius: "50%", flexShrink: 0,
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 * S,
      }}>{icon}</div>
      <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub }}>{title}</span>
      <span style={{
        fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, lineHeight: 1.55, textAlign: "center",
      }}>{desc}</span>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_08.scene1.to - SCENES_2026_04_08.scene1.from;
  const A_FADE_START = 506;
  const A_REMOVE = 576;
  const B_SHOW_AT = 576;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A — fog walker ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="幻覺長什麼樣子 ／ WHAT IT LOOKS LIKE" delay={0} color={C.primary} />}
            sentence={
              frame >= 372
                ? <StageSentence text="看到模糊的輪廓，就有自信地說「那是一棵樹」" delay={372} fontSize={26 * S} />
                : frame >= 156
                ? <StageSentence text="AI 不是故意騙你，它沒有壞意圖" delay={156} />
                : <StageSentence text="幻覺長什麼樣子？這個詞選得很妙" delay={0} />
            }
            takeaway={<StageTakeaway text="它更像在霧中走路的人——自信，卻看錯了" delay={247} color={C.primary} />}
          >
            <FogWalker treeAt={372} emptyAt={499} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B — three forms ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="三種常見形態 ／ THREE FORMS" delay={B_SHOW_AT} color={C.primary} />}
          sentence={<StageSentence text="幻覺常見的形態，大概有三種" delay={B_SHOW_AT} />}
          takeaway={<StageTakeaway text="格式對、語氣順，不代表內容是真的" delay={1615} color={C.primary} />}
        >
          <div style={{ display: "flex", gap: 24 * S, justifyContent: "center", alignItems: "stretch" }}>
            <FormCard icon="📚" title="事實捏造" accent={C.red} entranceAt={B_SHOW_AT} activeAt={650}
              desc="引用一本不存在的書，或給你假的研究數據——而且格式看起來完全正確" />
            <FormCard icon="⏳" title="時間錯亂" accent={C.orange} entranceAt={B_SHOW_AT} activeAt={1092}
              desc="把不同時期發生的事情混在一起，或說出不符現實時間點的資訊" />
            <FormCard icon="🔗" title="過度延伸" accent={C.blue} entranceAt={B_SHOW_AT} activeAt={1471}
              desc="從正確的前提推導出錯誤的結論——邏輯鏈斷了，卻還說得很順" />
          </div>
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 為什麼 AI 會這樣 ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: misconception strip + next-word fill-in-the-blank demo
function PredictDemo({ wrongAt, rightAt, blankAt, fillAt }: {
  wrongAt: number; rightAt: number; blankAt: number; fillAt: number;
}) {
  const frame = useCurrentFrame();
  const wrong = calcActive(wrongAt, frame, 0.3);
  const right = calcActive(rightAt, frame, 0.3);
  const blank = calcActive(blankAt, frame, 0.3);
  const filled = frame >= fillAt;

  const tokens = [
    { word: "台北", pct: 96, top: true },
    { word: "高雄", pct: 2 },
    { word: "台中", pct: 1 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * S }}>
      {/* misconception → reality */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 * S }}>
        <div style={{
          opacity: wrong.op, display: "flex", alignItems: "center", gap: 12 * S, width: 420 * S,
          background: C.redLight, border: `1px solid ${wrong.isOn ? C.redBorder : C.surfaceBorder}`,
          borderRadius: 16 * S, padding: `${14 * S}px ${20 * S}px`,
        }}>
          <span style={{ fontSize: 30 * S }}>🔎</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 * S }}>
            <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.red, letterSpacing: "0.04em" }}>以為 ❌</span>
            <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.text, fontWeight: 500 }}>像搜尋引擎，去資料庫查答案</span>
          </div>
        </div>
        <span style={{ fontSize: 34 * S, color: C.primary }}>→</span>
        <div style={{
          opacity: right.op, display: "flex", alignItems: "center", gap: 12 * S, width: 420 * S,
          background: C.primaryLight, border: `1px solid ${right.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 16 * S, padding: `${14 * S}px ${20 * S}px`,
        }}>
          <span style={{ fontSize: 30 * S }}>🔮</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 * S }}>
            <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.04em" }}>其實 ✓</span>
            <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.text, fontWeight: 500 }}>預測「下一個最可能出現的字」</span>
          </div>
        </div>
      </div>

      {/* fill-in-the-blank demo */}
      <div style={{
        opacity: blank.op, display: "flex", alignItems: "center", gap: 30 * S,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 22 * S, padding: `${22 * S}px ${36 * S}px`,
      }}>
        <div style={{ fontFamily: F_HEAD, fontSize: 30 * S, fontWeight: 700, color: C.text, whiteSpace: "nowrap" as const }}>
          台灣的首都是
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            minWidth: 130 * S, marginLeft: 12 * S,
            borderBottom: `${3 * S}px solid ${filled ? C.primary : C.muted}`,
            color: C.primary,
          }}>{filled ? "台北" : "＿＿"}</span>
        </div>
        {/* probability bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 * S, width: 360 * S }}>
          {tokens.map((t, i) => {
            const grow = filled
              ? interpolate(frame, [fillAt, fillAt + 24], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" })
              : 0;
            const col = t.top ? C.primary : C.muted;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
                <span style={{
                  width: 70 * S, fontFamily: F_TC, fontSize: 20 * S, fontWeight: t.top ? 700 : 500,
                  color: t.top ? C.text : C.textSub,
                }}>{t.word}</span>
                <div style={{ flex: 1, height: 16 * S, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${t.pct * grow}%`, background: col, borderRadius: 99,
                    boxShadow: t.top ? `0 0 ${10 * S}px ${col}88` : "none",
                  }} />
                </div>
                <span style={{ width: 58 * S, textAlign: "right" as const, fontFamily: F_BODY, fontSize: 18 * S, color: col, fontWeight: 700 }}>
                  {filled ? `${t.pct}%` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Phase B hero: 聽起來對 ≠ 實際上對
function SoundsVsActually({ soundsAt, actualAt, fillAt, lieAt }: {
  soundsAt: number; actualAt: number; fillAt: number; lieAt: number;
}) {
  const frame = useCurrentFrame();
  const sounds = calcActive(soundsAt, frame, 0.3);
  const actual = calcActive(actualAt, frame, 0.3);
  const fill = calcActive(fillAt, frame, 0.28);
  const lie = calcActive(lieAt, frame, 0.28);

  const Card = ({ a, accent, badge, title, lines, dim }: {
    a: { op: number; isOn: boolean }; accent: string; badge: string; title: string; lines: string[]; dim?: boolean;
  }) => (
    <div style={{
      opacity: a.op, width: 470 * S, alignSelf: "stretch",
      background: C.surface, border: `1px solid ${a.isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${20 * S}px ${26 * S}px`,
      display: "flex", flexDirection: "column", gap: 12 * S,
      boxShadow: a.isOn && !dim ? `0 0 ${36 * S}px ${accent}1a` : "none",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10 * S,
        fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 700, color: accent,
        letterSpacing: "0.08em", textTransform: "uppercase" as const,
      }}>
        <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: accent, boxShadow: `0 0 ${8 * S}px ${accent}` }} />
        {badge}
      </div>
      <div style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 700, color: C.text }}>{title}</div>
      {lines.map((l, i) => (
        <div key={i} style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, lineHeight: 1.45 }}>{l}</div>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * S, width: 1180 * S }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28 * S }}>
        <Card a={sounds} accent={C.primary} badge="AI 擅長的" title="聽起來對"
          lines={["流暢、自信、格式完整", "讀起來毫無破綻"]} />
        <span style={{ fontFamily: F_HEAD, fontSize: 44 * S, fontWeight: 800, color: C.muted }}>≠</span>
        <Card a={actual} accent={C.orange} badge="真正重要的" title="實際上對"
          lines={["真的符合事實", "經得起原始資料查證"]} />
      </div>
      {/* condition: sparse / contradictory training → plausible fill */}
      <div style={{
        opacity: fill.op, display: "flex", alignItems: "center", gap: 14 * S,
        fontFamily: F_TC, fontSize: 21 * S, fontWeight: 500, color: C.text,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 16 * S, padding: `${12 * S}px ${26 * S}px`,
      }}>
        <span style={{ fontSize: 26 * S }}>🧩</span>
        訓練資料很少見、或彼此矛盾時 → AI 會用「聽起來合理」的方式把答案<span style={{ color: C.red, fontWeight: 700 }}>填滿（哪怕是假的）</span>
      </div>
      {/* not lying banner */}
      <div style={{
        opacity: lie.op, display: "flex", alignItems: "center", gap: 14 * S,
        fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700, color: C.text,
        background: C.surface, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 16 * S, padding: `${14 * S}px ${30 * S}px`,
        boxShadow: `0 0 ${50 * S}px ${C.primaryGlow}`,
      }}>
        <span style={{ fontSize: 30 * S }}>🎯</span>
        它不是在說謊——只是在做被訓練做的事：生成「看起來像對」的輸出
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_08.scene2.to - SCENES_2026_04_08.scene2.from;
  const A_FADE_START = 1565;
  const A_REMOVE = 1615;
  const B_SHOW_AT = 1615;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A — how it works ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="為什麼會這樣 ／ HOW IT WORKS" delay={0} color={C.blue} />}
            sentence={
              frame >= 720
                ? <StageSentence text="就像玩填字接龍——一個字接一個字生成" delay={720} color={C.blue} fontSize={26 * S} />
                : frame >= 437
                ? <StageSentence text="它其實是在預測「下一個最可能出現的字」" delay={437} color={C.blue} fontSize={26 * S} />
                : frame >= 146
                ? <StageSentence text="很多人以為 AI 像搜尋引擎，去資料庫查答案" delay={146} fontSize={26 * S} />
                : <StageSentence text="先說最核心的問題：為什麼 AI 會這樣？" delay={0} />
            }
            takeaway={<StageTakeaway text="它從幾千億個字學到：什麼詞，通常接什麼詞" delay={1181} color={C.blue} />}
          >
            <PredictDemo wrongAt={146} rightAt={437} blankAt={720} fillAt={830} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B — the fundamental limit ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="根本的限制 ／ THE LIMIT" delay={B_SHOW_AT} color={C.orange} />}
          sentence={
            frame >= 1800
              ? <StageSentence text="「聽起來對」≠ 知道「實際上對」" delay={1800} color={C.orange} />
              : <StageSentence text="但它有一個根本的限制" delay={B_SHOW_AT} color={C.orange} />
          }
          takeaway={<StageTakeaway text="可以用很自信的語氣，說出完全錯誤的資訊" delay={2333} color={C.orange} />}
        >
          <SoundsVsActually soundsAt={1800} actualAt={1934} fillAt={2066} lieAt={2551} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 知道之後該怎麼做 ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A: three actionable directions (dim → bright stack)
function DirectionCard({ index, icon, title, desc, accent, entranceAt, activeAt }: {
  index: string; icon: string; title: string; desc: string; accent: string; entranceAt: number; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const e = useFadeUp(entranceAt);
  const a = calcActive(activeAt, frame, 0.28);
  return (
    <div style={{
      ...e, opacity: (e.opacity as number) * a.op,
      position: "relative", width: 1140 * S,
      background: C.surface, border: `1px solid ${a.isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${20 * S}px ${28 * S}px`,
      display: "flex", alignItems: "center", gap: 24 * S,
      boxShadow: a.isOn ? `0 0 ${36 * S}px ${accent}1a` : "none",
    }}>
      {a.isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 86 * S, height: 86 * S, borderRadius: "50%", flexShrink: 0,
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 * S,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 6 * S }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 22 * S, color: accent }}>{index}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 26 * S, color: a.isOn ? C.text : C.textSub }}>{title}</span>
        </div>
        <div style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

// Phase B: 盲目相信 ❌ vs 懂得質疑 ✓
function BelieveVsQuestion({ blindAt, questionAt }: { blindAt: number; questionAt: number }) {
  const frame = useCurrentFrame();
  const blind = calcActive(blindAt, frame, 0.3);
  const question = calcActive(questionAt, frame, 0.3);
  const Panel = ({ a, accent, icon, title, desc, dim }: {
    a: { op: number; isOn: boolean }; accent: string; icon: string; title: string; desc: string; dim?: boolean;
  }) => (
    <div style={{
      opacity: a.op, width: 500 * S, alignSelf: "stretch",
      background: dim ? C.redLight : C.surface, border: `1px solid ${a.isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 24 * S, padding: `${28 * S}px ${30 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
      boxShadow: a.isOn && !dim ? `0 0 ${50 * S}px ${C.primaryGlow}` : "none",
    }}>
      <div style={{
        width: 96 * S, height: 96 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46 * S,
      }}>{icon}</div>
      <span style={{ fontFamily: F_HEAD, fontSize: 28 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub }}>{title}</span>
      <span style={{ fontFamily: F_TC, fontSize: 21 * S, color: C.textSub, lineHeight: 1.5, textAlign: "center" }}>{desc}</span>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40 * S }}>
      <Panel a={blind} accent={C.red} icon="🙈" title="盲目相信" dim
        desc="全盤接受 AI 的輸出，直接拿去用" />
      <span style={{ fontFamily: F_HEAD, fontSize: 40 * S, fontWeight: 800, color: C.muted }}>vs</span>
      <Panel a={question} accent={C.primary} icon="🧐" title="懂得質疑"
        desc="知道什麼時候該停下來、回頭查證" />
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_08.scene3.to - SCENES_2026_04_08.scene3.from;
  const A_FADE_START = 2026;
  const A_REMOVE = 2076;
  const B_SHOW_AT = 2076;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A — three directions ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="該怎麼做 ／ WHAT TO DO" delay={0} color={C.primary} />}
            sentence={
              frame >= 175
                ? <StageSentence text="不是要停用 AI，而是用得更聰明——三個方向" delay={175} fontSize={26 * S} />
                : <StageSentence text="知道幻覺存在，不代表要停用 AI" delay={0} />
            }
            takeaway={<StageTakeaway text="好的提問，也可以讓幻覺少一點" delay={1853} color={C.primary} />}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 * S, alignItems: "center" }}>
              <DirectionCard index="01" icon="⚠️" title="高風險任務 → 一定要驗證" accent={C.red}
                entranceAt={0} activeAt={223}
                desc="法律、醫療、歷史、統計數字這類具體事實，一定要回原始資料核對，不能直接引用" />
              <DirectionCard index="02" icon="✅" title="低風險任務 → 放心用" accent={C.primary}
                entranceAt={0} activeAt={727}
                desc="發想、文章草稿、程式架構、解釋概念——AI 很擅長，有小錯也容易在過程中發現" />
              <DirectionCard index="03" icon="💬" title="問法，也有差" accent={C.orange}
                entranceAt={0} activeAt={1241}
                desc="與其問「最大的 AI 公司是哪家」，不如問「有哪些不確定的，請告訴我」" />
            </div>
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B — the mindset ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="最重要的素養 ／ THE MINDSET" delay={B_SHOW_AT} color={C.primary} />}
          sentence={
            frame >= 2191
              ? <StageSentence text="會用 AI 的人，不是盲目相信它的人" delay={2191} />
              : <StageSentence text="理解幻覺，是使用 AI 最重要的素養之一" delay={B_SHOW_AT} />
          }
          takeaway={<StageTakeaway text="會用 AI ＝ 懂得在對的時候質疑它" delay={2302} color={C.primary} />}
        >
          <BelieveVsQuestion blindAt={2076} questionAt={2302} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SUMMARY SCENE ───────────────────────────────────────────────────────────
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
      background: C.surface, border: `1px solid ${frame >= delay ? color + "44" : C.surfaceBorder}`,
      borderRadius: 24 * S, padding: `${24 * S}px ${42 * S}px`,
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
      <div style={{ fontFamily: F_TC, fontSize: 25 * S, color: C.text, fontWeight: 700, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_04_08.summary.to - SCENES_2026_04_08.summary.from;
  const badgeStyle = useFadeIn(0);
  const outroStyle = useFadeIn(560);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ paddingTop: CONTENT_TOP + 8 * S, paddingBottom: SUBTITLE_SAFE }}>
        <div style={{
          ...badgeStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 * S, marginBottom: 4 * S,
        }}>
          <span style={{
            width: 10 * S, height: 10 * S, borderRadius: "50%", background: C.primary,
            opacity: 0.9, boxShadow: `0 0 ${10 * S}px ${C.primary}`,
          }} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary, letterSpacing: "0.04em" }}>
            <WordReveal text="重點整理" startFrame={4} staggerPerWord={5}
              fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
          </span>
        </div>
      </AbsoluteFill>

      <BigTakeaway number="01" delay={84} color={C.primary} top={360}
        text="AI 幻覺不是 AI 在騙你——是它「逐字預測文字」的本質造成的" />
      <BigTakeaway number="02" delay={307} color={C.blue} top={800}
        text="語言模型只是在預測下一個字，本身沒有「查找事實」的能力" />
      <BigTakeaway number="03" delay={492} color={C.orange} top={1240}
        text="高風險事實要驗證、低風險創意放心用，好的問法能減少幻覺" />

      <div style={{ ...outroStyle, position: "absolute", left: 0, right: 0, top: 1720, textAlign: "center" }}>
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
export const VideoComposition_2026_04_08: React.FC = () => {
  const frame = useCurrentFrame();
  const Sx = SCENES_2026_04_08;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-08-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f, [TOTAL_FRAMES_2026_04_08 - 150, TOTAL_FRAMES_2026_04_08], [v, 0],
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
