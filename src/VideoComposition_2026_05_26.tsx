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
const F_HEAD = "'Syne','Noto Sans TC',sans-serif";
const F_BODY = "'DM Sans','Noto Sans TC',sans-serif";
const F_TC = "'Noto Sans TC', sans-serif";

// ── Scale & canvas (4K = 3840×2160) ───────────────────────────────────────
const S = 3;
const W = 1280 * S;
const H = 720 * S;
const NAV_H = 50 * S;
const CONTAINER_W = 640 * S;
const COL_LEFT = (W - CONTAINER_W) / 2;
const SUBTITLE_SAFE = 120 * S;
const CONTENT_GAP = 10 * S;
const CONTENT_TOP = NAV_H + CONTENT_GAP;
const CONTENT_H = H - CONTENT_TOP - SUBTITLE_SAFE;

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
  orangeBorder: "rgba(255,159,67,0.28)",
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
// Title:   0s        → 0     hook (第一名是怎麼量出來的)
// Scene1:  15.76s    → 473   為什麼難 + Benchmark (Phase A/B)
// Scene2:  67.92s    → 2038  Arena 排行榜
// Scene3:  96.56s    → 2897  三個限制 (汙染 / 條件性第一名 / 追趕效應)
// Scene4:  155.76s   → 4673  實用建議 (Phase A=3 tips, Phase B=速度成本+持續關注)
// Summary: 225.76s   → 6773  重點整理
// End:     262.88s   → 7886
export const SCENES_2026_05_26 = {
  title: { from: 0, to: 473 },
  scene1: { from: 473, to: 2038 },
  scene2: { from: 2038, to: 2897 },
  scene3: { from: 2897, to: 4673 },
  scene4: { from: 4673, to: 6773 },
  summary: { from: 6773, to: 7886 },
} as const;
export const TOTAL_FRAMES_2026_05_26 = 7886;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "如何評估", start: 473 },
  { label: "Arena 排行榜", start: 2038 },
  { label: "評估的限制", start: 2897 },
  { label: "實用建議", start: 4673 },
  { label: "重點整理", start: 6773 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // 1:29.60–1:36.56 — 思考題 (Scene 2 end)
  { from: 2688, to: 2897, sender: "想一想", text: "如果讓你評估兩個 AI，你會怎麼測？跟朋友聊聊，你覺得最公平的方法是什麼？" },
  // 3:39.76–3:45.36 — 思考題 (Scene 4 end)
  { from: 6593, to: 6773, sender: "想一想", text: "你現在用的 AI 工具，是看到排行榜才選的，還是自己用過覺得好？" },
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

// ── ContentColumn ──────────────────────────────────────────────────────────
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
        background: "radial-gradient(circle, rgba(91,143,255,0.05) 0%, transparent 70%)",
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
        borderBottom: `1px solid ${C.surfaceBorder}`,
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

// ── RippleRing ─────────────────────────────────────────────────────────────
function RippleRing({ activeAt, color, radius = 12 * S }: { activeAt: number; color: string; radius?: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - activeAt);
  if (f > 28) return null;
  const scale = interpolate(f, [0, 24], [0.85, 1.6], { easing: E.outExpo, extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 4, 24, 28], [0, 0.55, 0.2, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", inset: 0,
      border: `${2 * S}px solid ${color}`, borderRadius: radius,
      transform: `scale(${scale})`, opacity, pointerEvents: "none",
    }} />
  );
}

// ── EyebrowChip (DM Sans uppercase + pulse dot) ────────────────────────────
function EyebrowChip({ label, delay, color = C.primary, align = "left" }: {
  label: string; delay: number; color?: string; align?: "left" | "center";
}) {
  const frame = useCurrentFrame();
  const a = useFadeIn(delay);
  const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));
  return (
    <div style={{
      ...a, display: "flex", alignItems: "center",
      justifyContent: align === "center" ? "center" : "flex-start",
      gap: 10 * S,
    }}>
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

  const CHARS_PER_FRAME = 0.7;
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

// ═══════════════════════════════════════════════════════════════════════════
// ── Concept Animations ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// 1. TrophyQuestionAnimation — TitleScene (centered bottom)
//    Visual metaphor: 🏆 with floating "?" marks — challenges the "第一名"
//    triggerFrame = 90, DURATION = 440 (covers entire title scene; scene end at 473 will cut via SceneFade)
function TrophyQuestionAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 440;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const trophyScale = easeOutBack(prog(f, 22));
  const trophyTilt = Math.sin(f * 0.05) * 3;
  const glowPulse = 0.5 + 0.5 * Math.sin(f * 0.08);

  // Three "?" marks orbiting around trophy
  const qMarks = [
    { delay: 30, angle: -45, radius: 110 * S },
    { delay: 70, angle: 45, radius: 130 * S },
    { delay: 110, angle: -135, radius: 100 * S },
  ];

  return (
    <div style={{
      position: "absolute", bottom: SUBTITLE_SAFE + 60 * S, left: "50%",
      transform: "translateX(-50%)",
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
    }}>
      <div style={{ position: "relative", width: 280 * S, height: 200 * S }}>
        {/* Trophy at center */}
        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: `translate(-50%, -50%) scale(${trophyScale}) rotate(${trophyTilt}deg)`,
          fontSize: 96 * S,
          filter: `drop-shadow(0 0 ${(20 + glowPulse * 16) * S}px rgba(124,255,178,${0.4 + glowPulse * 0.3}))`,
        }}>🏆</div>

        {/* Question marks */}
        {qMarks.map((q, i) => {
          const qF = Math.max(0, f - q.delay);
          const qOp = interpolate(qF, [0, 18, 200, 240], [0, 1, 1, 0], clamp);
          const qScale = easeOutBack(prog(qF, 18));
          const rad = (q.angle * Math.PI) / 180;
          const bob = Math.sin((f + i * 20) * 0.06) * 6 * S;
          const cx = Math.cos(rad) * q.radius;
          const cy = Math.sin(rad) * q.radius + bob;
          return (
            <div key={i} style={{
              position: "absolute", left: "50%", top: "50%",
              transform: `translate(calc(-50% + ${cx}px), calc(-50% + ${cy}px)) scale(${qScale})`,
              opacity: qOp,
              fontFamily: F_HEAD, fontSize: 44 * S, fontWeight: 800,
              color: C.primary,
              textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.7)`,
            }}>?</div>
          );
        })}
      </div>

      {/* Caption chip */}
      <div style={{
        opacity: interpolate(f, [80, 110], [0, 1], clamp),
        fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 500,
        color: C.text, letterSpacing: "0.12em", textTransform: "uppercase" as const,
        background: C.chipBg, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 10 * S, padding: `${8 * S}px ${18 * S}px`,
      }}>第一名 · 怎麼量？</div>
    </div>
  );
}

// 2. MultiDimensionRadarAnimation — Scene 1 Phase A (right side)
//    Visual metaphor: 4-axis radar (數學/程式/寫作/對話) showing AI ability is multidimensional
//    triggerLocalFrame = 125 (19.92s "多維度"), DURATION = 558
function MultiDimensionRadarAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 558;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const BOX = 220 * S;
  const cx = BOX / 2;
  const cy = BOX / 2;
  const R = BOX * 0.4;

  // Sub-element timings within scene-local frame:
  // cue 19.92-28.32 covers "多維度,數學,創意寫作"
  // cue 28.48-35.52 covers "對話,程式碼"
  // Approximate keyword positions within cues:
  // - 數學 (cue 1 early): trigger local 125 → f=0
  // - 創意寫作 (cue 1 mid): ~24s → local 247 → f=122
  // - 對話 (cue 2 start): 28.48s → local 381 → f=256
  // - 程式碼 (cue 2 mid): ~31s → local 457 → f=332
  const axes = [
    { label: "數學", angle: -90, at: 0, color: C.primary },
    { label: "創意寫作", angle: 0, at: 122, color: C.orange },
    { label: "對話", angle: 90, at: 256, color: C.blue },
    { label: "程式碼", angle: 180, at: 332, color: C.purple },
  ];

  // Build polygon points (each axis fills 0..1 based on its at)
  const points = axes.map((ax) => {
    const fillT = interpolate(Math.max(0, f - ax.at), [0, 24], [0.15, 0.92], { easing: E.outExpo, extrapolateRight: "clamp" });
    const rad = (ax.angle * Math.PI) / 180;
    const x = cx + Math.cos(rad) * R * fillT;
    const y = cy + Math.sin(rad) * R * fillT;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
    }}>
      <div style={{ position: "relative", width: BOX, height: BOX }}>
        <svg width={BOX} height={BOX} style={{ position: "absolute", inset: 0, overflow: "visible" as const }}>
          {/* Grid rings */}
          {[0.33, 0.66, 1].map((r, i) => (
            <circle key={i} cx={cx} cy={cy} r={R * r}
              fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1 * S} />
          ))}
          {/* Axis lines */}
          {axes.map((ax, i) => {
            const rad = (ax.angle * Math.PI) / 180;
            const x = cx + Math.cos(rad) * R;
            const y = cy + Math.sin(rad) * R;
            return (
              <line key={i} x1={cx} y1={cy} x2={x} y2={y}
                stroke="rgba(255,255,255,0.1)" strokeWidth={1 * S} />
            );
          })}
          {/* Filled polygon */}
          <polygon points={points}
            fill="rgba(124,255,178,0.22)"
            stroke={C.primary}
            strokeWidth={2 * S}
            style={{ filter: `drop-shadow(0 0 ${10 * S}px rgba(124,255,178,0.4))` }}
          />
          {/* Axis endpoint dots */}
          {axes.map((ax, i) => {
            const rad = (ax.angle * Math.PI) / 180;
            const fillT = interpolate(Math.max(0, f - ax.at), [0, 24], [0.15, 0.92], { easing: E.outExpo, extrapolateRight: "clamp" });
            const x = cx + Math.cos(rad) * R * fillT;
            const y = cy + Math.sin(rad) * R * fillT;
            const dotF = Math.max(0, f - ax.at);
            const dotOp = interpolate(dotF, [0, 16], [0, 1], { extrapolateRight: "clamp" });
            return (
              <circle key={i} cx={x} cy={y} r={6 * S}
                fill={ax.color}
                opacity={dotOp}
                style={{ filter: `drop-shadow(0 0 ${6 * S}px ${ax.color})` }}
              />
            );
          })}
        </svg>

        {/* Axis labels (chips with chipBg) */}
        {axes.map((ax, i) => {
          const labelF = Math.max(0, f - ax.at);
          const labelOp = interpolate(labelF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          // Place chip outside the axis endpoint
          const rad = (ax.angle * Math.PI) / 180;
          const lx = Math.cos(rad) * (R + 26 * S);
          const ly = Math.sin(rad) * (R + 26 * S);
          // Anchor adjustments
          const transX = ax.angle === 0 ? "0%" : ax.angle === 180 ? "-100%" : "-50%";
          const transY = ax.angle === -90 ? "-100%" : ax.angle === 90 ? "0%" : "-50%";
          return (
            <div key={i} style={{
              position: "absolute",
              left: cx + lx, top: cy + ly,
              transform: `translate(${transX},${transY})`,
              opacity: labelOp,
              fontFamily: F_TC, fontSize: 18 * S, fontWeight: 700,
              color: ax.color,
              background: C.chipBg, border: `1px solid ${C.chipBorder}`,
              borderRadius: 8 * S, padding: `${4 * S}px ${10 * S}px`,
              whiteSpace: "nowrap" as const,
            }}>{ax.label}</div>
          );
        })}
      </div>

      {/* Bottom caption */}
      <div style={{
        opacity: interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
        fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
        color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" as const,
        marginTop: 4 * S,
      }}>能力 · 多維度</div>
    </div>
  );
}

// 3. BenchmarkCardsAnimation — Scene 1 Phase B (right side)
//    Visual metaphor: 3 benchmark score cards sliding in as speaker introduces each
//    triggerLocalFrame = 950 (47.44s "常見的有 MMLU")
//    Sub-delays: MMLU f=0, HumanEval f=243 (55.52s), MATH f=435 (61.92s)
//    DURATION = 705 (last MATH cue ends at 67.92s = local 1565; +90 buffer; scene ends 1565 so SceneFade cuts)
function BenchmarkCardsAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 705;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const items = [
    { id: "MMLU", desc: "57 學科選擇題", emoji: "📚", color: C.primary, at: 0 },
    { id: "HumanEval", desc: "寫程式碼測試", emoji: "💻", color: C.blue, at: 243 },
    { id: "MATH", desc: "數學解題推理", emoji: "🧮", color: C.orange, at: 435 },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
      width: 280 * S,
    }}>
      <div style={{
        opacity: interpolate(f, [0, 18], [0, 1], clamp),
        fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
        color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" as const,
        marginBottom: 4 * S,
        display: "flex", alignItems: "center", gap: 8 * S,
      }}>
        <span style={{
          width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
          boxShadow: `0 0 ${8 * S}px ${C.primary}`,
        }} />
        Benchmark · 三大基準
      </div>
      {items.map((item, i) => {
        const itemF = Math.max(0, f - item.at);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [40 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const isOn = f >= item.at;
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateX(${itemTx}px)`,
            position: "relative",
            background: C.surface,
            border: `1px solid ${isOn ? `${item.color}66` : C.surfaceBorder}`,
            borderRadius: 14 * S,
            padding: `${12 * S}px ${16 * S}px`,
            display: "flex", alignItems: "center", gap: 12 * S,
            boxShadow: isOn ? `0 0 ${18 * S}px ${item.color}22` : "none",
          }}>
            <RippleRing activeAt={item.at} color={item.color} radius={14 * S} />
            <div style={{
              width: 48 * S, height: 48 * S, borderRadius: 12 * S,
              background: `${item.color}1c`,
              border: `1px solid ${item.color}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26 * S, flexShrink: 0,
            }}>{item.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800,
                color: item.color, letterSpacing: "0.02em", lineHeight: 1.2,
              }}>{item.id}</div>
              <div style={{
                fontFamily: F_TC, fontSize: 18 * S, fontWeight: 500,
                color: C.textSub, lineHeight: 1.4, marginTop: 3 * S,
              }}>{item.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 4. ArenaVotingAnimation — Scene 2 (right side)
//    Visual metaphor: anonymous A vs B with human voters → vote tally
//    triggerLocalFrame = 0 (scene starts at "Arena 排行榜")
//    Sub-elements:
//    - boxes A/B at f=0
//    - voting (👤 → vote) at f=108 (1:11.52 "盲測")
//    - final ratio + LMArena badge at f=494 (1:24.40 "LMArena")
//    DURATION = 600 (fades before iMessage at local 650)
function ArenaVotingAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 600;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const boxA_in = easeOutBack(prog(f, 22));
  const boxB_in = easeOutBack(prog(Math.max(0, f - 20), 22));

  // Voting starts at f=108 (盲測). Show 5 voters, each casts a vote with stagger.
  const VOTE_START = 108;
  const voters = Array.from({ length: 5 });

  // LMArena badge at f=494
  const LMARENA_AT = 494;
  const lmF = Math.max(0, f - LMARENA_AT);
  const lmOp = interpolate(lmF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const lmScale = easeOutBack(prog(lmF, 22));

  // Final tally counters
  const tallyA = Math.round(interpolate(f, [VOTE_START, VOTE_START + 280], [0, 3], { easing: E.outExpo, extrapolateRight: "clamp" }));
  const tallyB = Math.round(interpolate(f, [VOTE_START, VOTE_START + 280], [0, 2], { easing: E.outExpo, extrapolateRight: "clamp" }));

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 16 * S,
      width: 290 * S,
    }}>
      {/* Eyebrow */}
      <div style={{
        opacity: interpolate(f, [0, 18], [0, 1], clamp),
        fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
        color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" as const,
        display: "flex", alignItems: "center", gap: 8 * S,
      }}>
        <span style={{
          width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
          boxShadow: `0 0 ${8 * S}px ${C.primary}`,
        }} />
        Arena · 真人盲測
      </div>

      {/* A vs B boxes */}
      <div style={{ display: "flex", gap: 14 * S, justifyContent: "space-between" }}>
        {[
          { id: "A", scale: boxA_in, color: C.primary, tally: tallyA },
          { id: "B", scale: boxB_in, color: C.blue, tally: tallyB },
        ].map((box, i) => (
          <div key={i} style={{
            flex: 1, position: "relative",
            transform: `scale(${box.scale})`,
            background: C.surface,
            border: `1px solid ${box.color}55`,
            borderRadius: 14 * S,
            padding: `${14 * S}px ${10 * S}px`,
            textAlign: "center" as const,
            boxShadow: `0 0 ${14 * S}px ${box.color}22`,
          }}>
            <div style={{
              fontFamily: F_HEAD, fontSize: 30 * S, fontWeight: 800,
              color: box.color, lineHeight: 1,
              textShadow: `0 0 ${14 * S}px ${box.color}88`,
            }}>{box.id}</div>
            <div style={{
              fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
              color: C.muted, letterSpacing: "0.08em", marginTop: 4 * S,
              textTransform: "uppercase" as const,
            }}>匿名模型</div>
            {/* Tally */}
            <div style={{
              opacity: interpolate(f, [VOTE_START, VOTE_START + 30], [0, 1], clamp),
              marginTop: 8 * S,
              fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800,
              color: C.text,
            }}>{box.tally}<span style={{ fontSize: 18 * S, color: C.muted, marginLeft: 4 * S }}>票</span></div>
          </div>
        ))}
      </div>

      {/* Voters row */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 8 * S,
      }}>
        {voters.map((_, i) => {
          const vF = Math.max(0, f - (VOTE_START + i * 30));
          const vOp = interpolate(vF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const vScale = easeOutBack(prog(vF, 18));
          const votedA = i % 2 === 0;
          return (
            <div key={i} style={{
              opacity: vOp,
              transform: `scale(${vScale})`,
              width: 40 * S, height: 40 * S, borderRadius: "50%",
              background: C.surface,
              border: `1px solid ${votedA ? C.primaryBorder : C.blueBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20 * S,
              boxShadow: `0 0 ${8 * S}px ${(votedA ? C.primary : C.blue)}33`,
            }}>👤</div>
          );
        })}
      </div>

      {/* LMArena badge */}
      <div style={{
        opacity: lmOp,
        transform: `scale(${lmScale})`,
        background: C.surface,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 12 * S,
        padding: `${10 * S}px ${14 * S}px`,
        textAlign: "center" as const,
        boxShadow: `0 0 ${20 * S}px ${C.primaryGlow}`,
      }}>
        <div style={{
          fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800,
          color: C.primary, letterSpacing: "0.04em", lineHeight: 1.1,
          textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.5)`,
        }}>LMArena</div>
        <div style={{
          fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
          color: C.muted, letterSpacing: "0.04em", marginTop: 4 * S,
        }}>原 Chatbot Arena</div>
      </div>
    </div>
  );
}

// 5. ThreeLimitationsAnimation — Scene 3 (right side)
//    Visual metaphor: 3 X-marked failure cards appearing one at a time
//    triggerLocalFrame = 175 (1:42.40 first limit reveal)
//    Sub-delays: Limit 1 f=0, Limit 2 f=483 (1:58.56), Limit 3 f=1103 (2:19.12)
//    DURATION = 1700 (last cue ends 2:35.76 = local 1776; +90 buffer; scene end cuts via SceneFade)
function ThreeLimitationsAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1700;
  const envelope = interpolate(f, [0, 14, DURATION - 40, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const limits = [
    { idx: "01", title: "Benchmark 汙染", note: "訓練資料含考題", color: C.red, at: 0 },
    { idx: "02", title: "條件性第一名", note: "只挑強項說", color: C.orange, at: 483 },
    { idx: "03", title: "追趕效應", note: "分數高 ≠ 體驗好", color: C.purple, at: 1103 },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
      width: 290 * S,
    }}>
      {/* Eyebrow */}
      <div style={{
        opacity: interpolate(f, [0, 18], [0, 1], clamp),
        fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
        color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" as const,
        display: "flex", alignItems: "center", gap: 8 * S,
      }}>
        <span style={{
          width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.red,
          boxShadow: `0 0 ${8 * S}px ${C.red}`,
        }} />
        三大限制
      </div>
      {limits.map((lm, i) => {
        const lF = Math.max(0, f - lm.at);
        const lOp = interpolate(lF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const lTx = interpolate(lF, [0, 22], [40 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const isOn = f >= lm.at;
        return (
          <div key={i} style={{
            opacity: lOp,
            transform: `translateX(${lTx}px)`,
            position: "relative",
            background: C.surface,
            border: `1px solid ${isOn ? `${lm.color}66` : C.surfaceBorder}`,
            borderRadius: 14 * S,
            padding: `${12 * S}px ${16 * S}px`,
            display: "flex", alignItems: "center", gap: 12 * S,
            boxShadow: isOn ? `0 0 ${18 * S}px ${lm.color}22` : "none",
          }}>
            <RippleRing activeAt={lm.at} color={lm.color} radius={14 * S} />
            {/* X mark icon box */}
            <div style={{
              width: 48 * S, height: 48 * S, borderRadius: 12 * S,
              background: `${lm.color}1c`,
              border: `1px solid ${lm.color}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800,
              color: lm.color,
            }}>✕</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
                color: lm.color, letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
              }}>{lm.idx}</div>
              <div style={{
                fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700,
                color: C.text, lineHeight: 1.25, marginTop: 2 * S,
              }}>{lm.title}</div>
              <div style={{
                fontFamily: F_TC, fontSize: 18 * S, fontWeight: 500,
                color: C.textSub, lineHeight: 1.4, marginTop: 3 * S,
              }}>{lm.note}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 6. PracticalTipsCheckmarkAnimation — Scene 4 Phase A (right side)
//    Visual metaphor: 3 green checkmarks appearing as each tip is introduced
//    triggerLocalFrame = 125 (2:39.92 "第一,看到第一名先問")
//    Sub-delays: Tip 1 f=0, Tip 2 f=307 (2:50.16), Tip 3 f=650 (3:01.60)
//    DURATION = 1082 (covers until Phase A fade)
function PracticalTipsAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1082;
  const envelope = interpolate(f, [0, 14, DURATION - 40, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const tips = [
    { idx: "01", title: "看是哪個測試", note: "與你情境多相關", color: C.primary, at: 0 },
    { idx: "02", title: "Arena 較可信", note: "真人盲測難造假", color: C.blue, at: 307 },
    { idx: "03", title: "自己試最準", note: "同題丟給多模型", color: C.orange, at: 650 },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
      width: 290 * S,
    }}>
      {/* Eyebrow */}
      <div style={{
        opacity: interpolate(f, [0, 18], [0, 1], clamp),
        fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
        color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" as const,
        display: "flex", alignItems: "center", gap: 8 * S,
      }}>
        <span style={{
          width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
          boxShadow: `0 0 ${8 * S}px ${C.primary}`,
        }} />
        實用三招
      </div>
      {tips.map((t, i) => {
        const tF = Math.max(0, f - t.at);
        const tOp = interpolate(tF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const tTx = interpolate(tF, [0, 22], [40 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const checkScale = easeOutBack(prog(Math.max(0, tF - 8), 18));
        const isOn = f >= t.at;
        return (
          <div key={i} style={{
            opacity: tOp,
            transform: `translateX(${tTx}px)`,
            position: "relative",
            background: C.surface,
            border: `1px solid ${isOn ? `${t.color}66` : C.surfaceBorder}`,
            borderRadius: 14 * S,
            padding: `${12 * S}px ${16 * S}px`,
            display: "flex", alignItems: "center", gap: 12 * S,
            boxShadow: isOn ? `0 0 ${18 * S}px ${t.color}22` : "none",
          }}>
            <RippleRing activeAt={t.at} color={t.color} radius={14 * S} />
            {/* Check icon box */}
            <div style={{
              width: 48 * S, height: 48 * S, borderRadius: 12 * S,
              background: `${t.color}1c`,
              border: `1px solid ${t.color}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transform: `scale(${checkScale})`,
              fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800,
              color: t.color,
            }}>✓</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
                color: t.color, letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
              }}>{t.idx}</div>
              <div style={{
                fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700,
                color: C.text, lineHeight: 1.25, marginTop: 2 * S,
              }}>{t.title}</div>
              <div style={{
                fontFamily: F_TC, fontSize: 18 * S, fontWeight: 500,
                color: C.textSub, lineHeight: 1.4, marginTop: 3 * S,
              }}>{t.note}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Scene Components ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_05_26.title.to - SCENES_2026_05_26.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(36);
  const tagStyle = useFadeUp(56);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-start",
        paddingTop: 220 * S,
        paddingBottom: SUBTITLE_SAFE,
        paddingLeft: 100 * S, paddingRight: 100 * S,
        textAlign: "center",
      }}>
        {/* Badge */}
        <div style={{ ...badgeOp, marginBottom: 22 * S, display: "flex", alignItems: "center", gap: 10 * S }}>
          <span style={{
            width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
            boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          }} />
          <span style={{
            fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 500,
            color: C.primary, letterSpacing: "0.22em",
            textTransform: "uppercase" as const,
          }}>每日 AI 知識庫</span>
        </div>

        {/* H1 line 1 */}
        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: F_HEAD,
          fontWeight: 800, fontSize: 56 * S, color: C.text,
        }}>
          <WordReveal text="評估 AI 模型好不好" startFrame={10} staggerPerWord={6}
            fontSize={56 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        {/* H1 line 2 — accent */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 8 * S,
          fontFamily: F_HEAD,
          fontWeight: 800, fontSize: 40 * S, color: C.primary,
        }}>
          <WordReveal text="有哪些方法和指標？" startFrame={32} staggerPerWord={6}
            fontSize={40 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle,
          marginTop: 24 * S,
          fontFamily: F_TC,
          fontSize: 22 * S, fontWeight: 500,
          color: C.textSub, lineHeight: 1.55,
          maxWidth: 800 * S,
        }}>
          從 Benchmark 到 Arena 排行榜——看懂第一名是怎麼量出來的
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 20 * S }}>
          <span style={{
            fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 500,
            color: C.muted, letterSpacing: "0.18em",
            textTransform: "uppercase" as const,
          }}>Benchmark · LMArena · MMLU · 評估</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — 為什麼難 + Benchmark ──────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_26.scene1.to - SCENES_2026_05_26.scene1.from;

  // Local timestamps (scene1 starts at global 473):
  // 15.76 → local 0    "評估難得多"          (Phase A start)
  // 19.92 → local 125  "多維度,數學"        (radar anim trigger)
  // 28.48 → local 381  "對話,程式碼"
  // 35.52 → local 593  "Benchmark"          (Phase A → B)
  // 41.84 → local 782  "標準化的題目"
  // 47.44 → local 950  "MMLU"               (benchmark cards trigger)
  // 55.52 → local 1192 "HumanEval"
  // 61.92 → local 1385 "MATH"

  // Phase A → B transition (rule 0b)
  const A_FADE_START = 513;  // 593 - 80
  const A_REMOVE = 593;
  const B_SHOW_AT = 593;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A element delays
  const A_EYEBROW = 0;
  const A_HEADING = 12;
  const A_DIM_CARD = 125;     // when "多維度" mentioned
  const A_HIGHLIGHT = 381;    // when 對話/程式碼 mentioned

  // Phase B element delays (first element delay = B_SHOW_AT = 593)
  const B_EYEBROW = 593;
  const B_DEF = 605;
  const B_LIST_HEADER = 782;  // 41.84s — "研究者設計"
  const B_MMLU = 950;
  const B_HUMAN = 1192;
  const B_MATH = 1385;

  // Animation triggers
  const RADAR_AT = 125;
  const BENCH_AT = 950;

  // Phase A styles
  const aEyebrowStyle = useFadeUp(A_EYEBROW);
  const aHeadingStyle = useFadeUp(A_HEADING);
  const aDimStyle = useFadeUp(A_DIM_CARD);
  const aHlStyle = useFadeUp(A_HIGHLIGHT);

  // Phase B styles
  const bEyebrowStyle = useFadeUp(showB ? B_EYEBROW : 999999);
  const bDefStyle = useFadeUp(showB ? B_DEF : 999999);
  const bListHdrStyle = useFadeIn(showB ? B_LIST_HEADER : 999999);
  const bMMLUStyle = useFadeUp(showB ? B_MMLU : 999999);
  const bHumanStyle = useFadeUp(showB ? B_HUMAN : 999999);
  const bMathStyle = useFadeUp(showB ? B_MATH : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A: Why eval is hard ──────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...aEyebrowStyle, marginBottom: 14 * S }}>
              <EyebrowChip label="為什麼評估難" delay={A_EYEBROW} color={C.primary} />
            </div>

            <h2 style={{ ...aHeadingStyle, margin: 0, marginBottom: 22 * S }}>
              <span style={{
                fontFamily: F_HEAD, fontWeight: 800, fontSize: 28 * S,
                color: C.text, lineHeight: 1.3,
              }}>模型的能力是<span style={{ color: C.primary }}>多維度</span>的</span>
            </h2>

            {/* Multi-dimension card */}
            <div style={{ ...aDimStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 16 * S, padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${30 * S}px ${C.primaryGlow}`,
              }}>
                <div style={{
                  fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 500,
                  color: C.muted, letterSpacing: "0.12em",
                  textTransform: "uppercase" as const, marginBottom: 12 * S,
                }}>四種能力 · 不會同時強</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 * S }}>
                  {[
                    { emoji: "🧮", label: "數學題", color: C.primary },
                    { emoji: "✍️", label: "創意寫作", color: C.orange },
                    { emoji: "💬", label: "對話自然", color: C.blue },
                    { emoji: "💻", label: "寫程式", color: C.purple },
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 10 * S,
                      background: C.surface2,
                      border: `1px solid ${C.surfaceBorder}`,
                      borderRadius: 12 * S,
                      padding: `${10 * S}px ${14 * S}px`,
                    }}>
                      <span style={{ fontSize: 24 * S }}>{item.emoji}</span>
                      <span style={{
                        fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700,
                        color: item.color,
                      }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Highlight: 沒有一個指標 */}
            <div style={{ ...aHlStyle }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 16 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${30 * S}px ${C.primaryGlow}`,
              }}>
                <div style={{
                  fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700,
                  color: C.text, lineHeight: 1.4,
                }}>
                  <span style={{ color: C.primary }}>沒有一個指標</span>能說明全部
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B: Benchmark ──────────────────── */}
        {showB && (
          <>
            <div style={{ ...bEyebrowStyle, marginBottom: 14 * S }}>
              <EyebrowChip label="Benchmark · 基準測試" delay={B_EYEBROW} color={C.primary} />
            </div>

            {/* Definition */}
            <div style={{ ...bDefStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 16 * S, padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${30 * S}px ${C.primaryGlow}`,
              }}>
                <div style={{
                  fontFamily: F_HEAD, fontSize: 30 * S, fontWeight: 800,
                  color: C.primary, lineHeight: 1.2,
                  textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.5)`,
                  marginBottom: 8 * S,
                }}>Benchmark</div>
                <div style={{
                  fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500,
                  color: C.textSub, lineHeight: 1.5,
                }}>業界最常用的評估方式——設計一組標準化題目，讓模型作答，算答對率</div>
              </div>
            </div>

            {/* Benchmark list */}
            <div style={{ ...bListHdrStyle, marginBottom: 12 * S }}>
              <div style={{
                fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 500,
                color: C.muted, letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                display: "flex", alignItems: "center", gap: 8 * S,
              }}>
                <span style={{
                  width: 6 * S, height: 6 * S, borderRadius: "50%", background: C.primary,
                }} />
                三大常見基準
              </div>
            </div>

            {[
              { id: "MMLU", desc: "57 學科選擇題 · 測知識廣度", color: C.primary, style: bMMLUStyle },
              { id: "HumanEval", desc: "讓模型寫程式 · 測程式能力", color: C.blue, style: bHumanStyle },
              { id: "MATH", desc: "數學解題 · 測推理能力", color: C.orange, style: bMathStyle },
            ].map((item, i) => (
              <div key={i} style={{ ...item.style, marginBottom: 12 * S }}>
                <div style={{
                  background: C.surface, border: `1px solid ${item.color}44`,
                  borderRadius: 14 * S, padding: `${12 * S}px ${18 * S}px`,
                  display: "flex", alignItems: "center", gap: 14 * S,
                }}>
                  <div style={{
                    fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800,
                    color: item.color, letterSpacing: "0.02em",
                    minWidth: 180 * S, flexShrink: 0,
                  }}>{item.id}</div>
                  <div style={{
                    fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500,
                    color: C.text, lineHeight: 1.45,
                  }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <MultiDimensionRadarAnimation triggerLocalFrame={RADAR_AT} />
        <BenchmarkCardsAnimation triggerLocalFrame={BENCH_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — Arena 排行榜 ──────────────────────────────────────────────────
function Scene2() {
  const dur = SCENES_2026_05_26.scene2.to - SCENES_2026_05_26.scene2.from;

  // Local timestamps (scene2 starts at global 2038):
  // 67.92 → local 0     "Arena 排行榜"
  // 71.52 → local 108   "盲測"
  // 79.04 → local 334   "反映真實偏好"
  // 84.40 → local 494   "LMArena"
  // 89.60 → local 650   "如果讓你..." (iMessage starts)

  const EYEBROW_AT = 0;
  const HEADING_AT = 14;
  const DEF_AT = 108;        // 71.52s
  const ADVANTAGE_AT = 334;  // 79.04s "反映真實偏好"
  const LMARENA_AT = 494;    // 84.40s

  const ARENA_ANIM_AT = 0;

  const eyebrowStyle = useFadeUp(EYEBROW_AT);
  const headingStyle = useFadeUp(HEADING_AT);
  const defStyle = useFadeUp(DEF_AT);
  const advStyle = useFadeUp(ADVANTAGE_AT);
  const lmStyle = useFadeUp(LMARENA_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        <div style={{ ...eyebrowStyle, marginBottom: 14 * S }}>
          <EyebrowChip label="Arena · 真人盲測" delay={EYEBROW_AT} color={C.primary} />
        </div>

        <h2 style={{ ...headingStyle, margin: 0, marginBottom: 22 * S }}>
          <span style={{
            fontFamily: F_HEAD, fontWeight: 800, fontSize: 28 * S,
            color: C.text, lineHeight: 1.3,
          }}>讓真實使用者<span style={{ color: C.primary }}>盲測投票</span></span>
        </h2>

        {/* Method card */}
        <div style={{ ...defStyle, marginBottom: 18 * S }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 16 * S, padding: `${16 * S}px ${22 * S}px`,
            boxShadow: `0 0 ${30 * S}px ${C.primaryGlow}`,
          }}>
            <div style={{
              fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 500,
              color: C.muted, letterSpacing: "0.12em",
              textTransform: "uppercase" as const, marginBottom: 10 * S,
            }}>做法</div>
            <div style={{
              fontFamily: F_TC, fontSize: 22 * S, fontWeight: 500,
              color: C.text, lineHeight: 1.5,
            }}>
              同一個問題丟給兩個<span style={{ color: C.primary, fontWeight: 700 }}>匿名模型</span>，
              使用者投票哪個答案比較好
            </div>
          </div>
        </div>

        {/* Advantage card */}
        <div style={{ ...advStyle, marginBottom: 18 * S }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.blueBorder}`,
            borderRadius: 16 * S, padding: `${14 * S}px ${22 * S}px`,
          }}>
            <div style={{
              fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 500,
              color: C.blue, letterSpacing: "0.12em",
              textTransform: "uppercase" as const, marginBottom: 10 * S,
            }}>優點</div>
            <div style={{
              fontFamily: F_TC, fontSize: 22 * S, fontWeight: 500,
              color: C.text, lineHeight: 1.5,
            }}>
              反映<span style={{ color: C.blue, fontWeight: 700 }}>真實偏好</span>，
              比較難作弊
            </div>
          </div>
        </div>

        {/* LMArena card */}
        <div style={{ ...lmStyle }}>
          <div style={{
            background: C.surface, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 16 * S, padding: `${14 * S}px ${22 * S}px`,
            boxShadow: `0 0 ${24 * S}px ${C.primaryGlow}`,
            display: "flex", alignItems: "center", gap: 16 * S,
          }}>
            <div style={{
              fontFamily: F_HEAD, fontSize: 30 * S, fontWeight: 800,
              color: C.primary, lineHeight: 1,
              textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.5)`,
              flexShrink: 0,
            }}>LMArena</div>
            <div style={{
              fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500,
              color: C.textSub, lineHeight: 1.45,
            }}>目前最知名的真人盲測平台 · 原名 Chatbot Arena</div>
          </div>
        </div>
      </ContentColumn>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ArenaVotingAnimation triggerLocalFrame={ARENA_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 三個限制 ──────────────────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_26.scene3.to - SCENES_2026_05_26.scene3.from;

  // Local timestamps (scene3 starts at global 2897):
  // 96.56  → local 0    "知道評估方法之後..."
  // 102.40 → local 175  "第一個問題叫 Benchmark 汙染"
  // 118.56 → local 658  "第二個問題是第一名是有條件的"
  // 139.12 → local 1278 "第三個問題叫 Benchmark 追趕效應"
  // 155.76 → local 1776 (scene end)

  const EYEBROW_AT = 0;
  const HEADING_AT = 14;
  const LIMIT1_AT = 175;
  const LIMIT2_AT = 658;
  const LIMIT3_AT = 1278;

  const LIMITS_ANIM_AT = 175;

  // ScrollUp strategy: Phase A=Limit 1+2, Phase B=Limit 3. Use single column with scrollUp.
  // Estimated heights:
  //   header + heading: ~250
  //   Limit 1 card: ~500
  //   Limit 2 card: ~500
  //   Limit 3 card: ~500
  // Total when all 3 visible: 1750. CONTENT_H = 1620.
  // Push 200px up when Limit 3 appears, so Limit 1 partially scrolls out.

  const eyebrowStyle = useFadeUp(EYEBROW_AT);
  const headingStyle = useFadeUp(HEADING_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn scrollUp={{ at: 0, amount: 140 }}>
        <div style={{ ...eyebrowStyle, marginBottom: 14 * S }}>
          <EyebrowChip label="評估方法的限制" delay={EYEBROW_AT} color={C.red} />
        </div>

        <h2 style={{ ...headingStyle, margin: 0, marginBottom: 22 * S }}>
          <span style={{
            fontFamily: F_HEAD, fontWeight: 800, fontSize: 28 * S,
            color: C.text, lineHeight: 1.3,
          }}>三個<span style={{ color: C.red }}>你需要知道</span>的問題</span>
        </h2>

        <LimitCard
          idx="01" label="Benchmark 汙染" color={C.red}
          desc="訓練資料剛好包含測試題目和答案，分數虛高 · 業界都知道但難從外部驗證"
          delay={LIMIT1_AT}
        />
        <LimitCard
          idx="02" label="條件性第一名" color={C.orange}
          desc="廠商選擇性強調自己表現最好的測試 · 「MMLU 第一名」和「整體最強」是兩件事"
          delay={LIMIT2_AT}
        />
        <LimitCard
          idx="03" label="Benchmark 追趕效應" color={C.purple}
          desc="一旦測試變重要，廠商針對它最佳化 · 分數越來越高但真實體驗不一定有同步提升"
          delay={LIMIT3_AT}
        />
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ThreeLimitationsAnimation triggerLocalFrame={LIMITS_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

function LimitCard({ idx, label, color, desc, delay }: {
  idx: string; label: string; color: string; desc: string; delay: number;
}) {
  // dim→bright: present from scene start at 0.28 opacity, brighten to 1 at `delay`
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const op = interpolate(f, [0, 18], [0.28, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const ty = interpolate(f, [0, 22], [8 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const style = { opacity: op, transform: `translateY(${ty}px)` };
  return (
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${color}44`,
        borderRadius: 16 * S,
        padding: `${14 * S}px ${22 * S}px`,
        boxShadow: `0 0 ${20 * S}px ${color}11`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 8 * S,
        }}>
          <div style={{
            width: 44 * S, height: 44 * S, borderRadius: 10 * S,
            background: `${color}1c`,
            border: `1px solid ${color}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800,
            color, flexShrink: 0,
          }}>✕</div>
          <div>
            <div style={{
              fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
              color, letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
            }}>{idx}</div>
            <div style={{
              fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700,
              color: C.text, lineHeight: 1.2, marginTop: 2 * S,
            }}>{label}</div>
          </div>
        </div>
        <div style={{
          fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500,
          color: C.textSub, lineHeight: 1.55,
        }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Scene4 — 實用建議 ──────────────────────────────────────────────────────
function Scene4() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_26.scene4.to - SCENES_2026_05_26.scene4.from;

  // Local timestamps (scene4 starts at global 4673):
  // 155.76 → local 0     "作為使用者..."
  // 159.92 → local 125   "第一,看到第一名先問"
  // 170.16 → local 432   "第二,Arena 排行榜相對可信"
  // 181.60 → local 775   "第三,自己試是最準的"
  // 196.00 → local 1207  "最後別忘了,速度和成本"  (Phase A → B)
  // 206.40 → local 1519  "持續關注,定期自己試用"
  // 219.76 → local 1920  (iMessage starts)
  // 225.76 → local 2100  (scene end)

  // Phase A → B
  const A_FADE_START = 1127;  // 1207 - 80
  const A_REMOVE = 1207;
  const B_SHOW_AT = 1207;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A delays
  const A_EYEBROW = 0;
  const A_HEADING = 14;
  const A_TIP1 = 125;
  const A_TIP2 = 432;
  const A_TIP3 = 775;

  // Phase B delays
  const B_EYEBROW = 1207;
  const B_SPEED = 1219;
  const B_WATCH = 1519;       // 206.40s "持續關注"

  const TIPS_ANIM_AT = 125;

  // ScrollUp for Phase A — 3 cards + heading may exceed 1620
  // Heights estimate: header ~250 + 3 cards × 380 = 1390. Total ~1640. Push 80 to be safe.

  const aEyebrowStyle = useFadeUp(A_EYEBROW);
  const aHeadingStyle = useFadeUp(A_HEADING);
  const aTip1Style = useFadeUp(A_TIP1);
  const aTip2Style = useFadeUp(A_TIP2);
  const aTip3Style = useFadeUp(A_TIP3);

  const bEyebrowStyle = useFadeUp(showB ? B_EYEBROW : 999999);
  const bSpeedStyle = useFadeUp(showB ? B_SPEED : 999999);
  const bWatchStyle = useFadeUp(showB ? B_WATCH : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn scrollUp={showA ? { at: A_TIP3 - 30, amount: 120 } : undefined}>
        {/* ── Phase A: 3 tips ────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...aEyebrowStyle, marginBottom: 14 * S }}>
              <EyebrowChip label="使用者實用建議" delay={A_EYEBROW} color={C.primary} />
            </div>

            <h2 style={{ ...aHeadingStyle, margin: 0, marginBottom: 22 * S }}>
              <span style={{
                fontFamily: F_HEAD, fontWeight: 800, fontSize: 28 * S,
                color: C.text, lineHeight: 1.3,
              }}>作為使用者，<span style={{ color: C.primary }}>記住這三件事</span></span>
            </h2>

            <TipCard
              idx="01" label="看是哪個測試" color={C.primary}
              desc="同一個模型在不同測試上排名可能差很多——先問：這個 Benchmark 跟你的使用情境有多相關"
              style={aTip1Style}
            />
            <TipCard
              idx="02" label="Arena 排行榜相對可信" color={C.blue}
              desc="真人盲測，比廠商自跑 Benchmark 更難造假——但反映的是大多數人的偏好，不一定是你的"
              style={aTip2Style}
            />
            <TipCard
              idx="03" label="自己試是最準的" color={C.orange}
              desc="把你真正會問的問題用同一個提示詞，同時丟給幾個候選模型——原始但對你個人最有效"
              style={aTip3Style}
            />
          </div>
        )}

        {/* ── Phase B: 速度成本 + 持續關注 ─────────── */}
        {showB && (
          <>
            <div style={{ ...bEyebrowStyle, marginBottom: 14 * S }}>
              <EyebrowChip label="另外兩件事" delay={B_EYEBROW} color={C.primary} />
            </div>

            {/* Speed/Cost card */}
            <div style={{ ...bSpeedStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.orangeBorder}`,
                borderRadius: 16 * S, padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${20 * S}px ${C.orangeLight}`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 10 * S,
                }}>
                  <div style={{
                    width: 48 * S, height: 48 * S, borderRadius: 12 * S,
                    background: `${C.orange}1c`,
                    border: `1px solid ${C.orange}55`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 26 * S, flexShrink: 0,
                  }}>⚡</div>
                  <div style={{
                    fontFamily: F_TC, fontSize: 26 * S, fontWeight: 700,
                    color: C.text, lineHeight: 1.2,
                  }}>速度和成本，也是評估的一部分</div>
                </div>
                <div style={{
                  fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500,
                  color: C.textSub, lineHeight: 1.55,
                }}>
                  <span style={{ color: C.orange, fontWeight: 700 }}>夠好但很快很便宜</span>，
                  有時比最好但很慢很貴更實用
                </div>
              </div>
            </div>

            {/* Watch card */}
            <div style={{ ...bWatchStyle }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 16 * S, padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px ${C.primaryGlow}`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 10 * S,
                }}>
                  <div style={{
                    width: 48 * S, height: 48 * S, borderRadius: 12 * S,
                    background: `${C.primary}1c`,
                    border: `1px solid ${C.primary}55`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 26 * S, flexShrink: 0,
                  }}>🔄</div>
                  <div style={{
                    fontFamily: F_TC, fontSize: 26 * S, fontWeight: 700,
                    color: C.text, lineHeight: 1.2,
                  }}>持續關注，定期自己試用</div>
                </div>
                <div style={{
                  fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500,
                  color: C.textSub, lineHeight: 1.55,
                }}>
                  模型評估快速演進——
                  <span style={{ color: C.primary, fontWeight: 700 }}>今天的第一名，三個月後可能就不是了</span>
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <PracticalTipsAnimation triggerLocalFrame={TIPS_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

function TipCard({ idx, label, color, desc, style }: {
  idx: string; label: string; color: string; desc: string; style: React.CSSProperties;
}) {
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${color}44`,
        borderRadius: 14 * S,
        padding: `${12 * S}px ${18 * S}px`,
        boxShadow: `0 0 ${18 * S}px ${color}11`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 6 * S }}>
          <div style={{
            width: 40 * S, height: 40 * S, borderRadius: 10 * S,
            background: `${color}1c`,
            border: `1px solid ${color}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 800,
            color, flexShrink: 0,
          }}>✓</div>
          <div>
            <div style={{
              fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
              color, letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
            }}>{idx}</div>
            <div style={{
              fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700,
              color: C.text, lineHeight: 1.2, marginTop: 2 * S,
            }}>{label}</div>
          </div>
        </div>
        <div style={{
          fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500,
          color: C.textSub, lineHeight: 1.5,
        }}>{desc}</div>
      </div>
    </div>
  );
}

// ── SummaryScene ────────────────────────────────────────────────────────────
function SummaryCard({ number, title, desc, delay, color }: {
  number: string; title: string; desc: string; delay: number; color: string;
}) {
  // dim→bright: present from scene start at 0.28 opacity, brighten to 1 at `delay`
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const op = interpolate(f, [0, 18], [0.28, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const ty = interpolate(f, [0, 22], [8 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const style = { opacity: op, transform: `translateY(${ty}px)` };
  return (
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${color}44`,
        borderRadius: 16 * S,
        padding: `${14 * S}px ${22 * S}px`,
        boxShadow: `0 0 ${20 * S}px ${color}11`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 8 * S,
        }}>
          <div style={{
            width: 50 * S, height: 50 * S, borderRadius: 12 * S,
            background: `${color}1c`,
            border: `1px solid ${color}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800,
            color, flexShrink: 0,
            textShadow: `0 0 ${10 * S}px ${color}88`,
          }}>{number}</div>
          <div style={{
            fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700,
            color: C.text, lineHeight: 1.25, flex: 1,
          }}>{title}</div>
        </div>
        <div style={{
          fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500,
          color: C.textSub, lineHeight: 1.55,
        }}>{desc}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_05_26.summary.to - SCENES_2026_05_26.summary.from;

  // Local timestamps (summary starts at global 6773):
  // 225.76 → local 0    "今天的重點整理"
  // 227.36 → local 48   "第一,評估 AI 模型沒有單一指標"
  // 239.12 → local 401  "第二,Benchmark 有汙染問題"
  // 250.16 → local 732  "第三,自己試用最準"
  // 258.80 → local 991  "排行榜會變..."
  // 262.88 → end

  const BADGE_AT = 0;
  const CARD1_AT = 48;
  const CARD2_AT = 401;
  const CARD3_AT = 732;
  const OUTRO_AT = 991;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{
          ...badgeStyle, marginBottom: 22 * S, marginTop: 16 * S,
          display: "flex", alignItems: "center", gap: 10 * S,
        }}>
          <span style={{
            width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
            boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          }} />
          <span style={{
            fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 500,
            color: C.primary, letterSpacing: "0.22em",
            textTransform: "uppercase" as const,
          }}>重點整理</span>
        </div>

        <SummaryCard
          number="01" delay={CARD1_AT} color={C.primary}
          title="評估 AI 沒有單一指標"
          desc="Benchmark、Arena 排行榜、人工評估各有優缺點——選哪個方法看你想知道什麼"
        />
        <SummaryCard
          number="02" delay={CARD2_AT} color={C.orange}
          title="Benchmark 有三大限制"
          desc="汙染問題、條件性第一名、追趕效應——分數不一定反映真實能力"
        />
        <SummaryCard
          number="03" delay={CARD3_AT} color={C.primary}
          title="自己試用最準"
          desc="速度和成本也是評估的一部分——排行榜會變，定期自己試比死記排名更有用"
        />

        {/* Outro */}
        <div style={{ ...outroStyle, marginTop: 14 * S, textAlign: "center" as const }}>
          <div style={{
            fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 500,
            color: C.muted, letterSpacing: "0.18em",
            textTransform: "uppercase" as const,
          }}>每日 AI 知識庫 · 我是你的播報員</div>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Main Composition ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export function VideoComposition_2026_05_26() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_26.scene1;
  const S2 = SCENES_2026_05_26.scene2;
  const S3 = SCENES_2026_05_26.scene3;
  const S4 = SCENES_2026_05_26.scene4;
  const SU = SCENES_2026_05_26.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Main narration */}
      <Audio src={staticFile("audio/2026-05-26-processed.wav")} volume={1.0} />

      {/* Background music — fade in 45f, fade out last 150f */}
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_05_26 - 150, TOTAL_FRAMES_2026_05_26],
            [v, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          return Math.min(fi, fo);
        }}
        loop
      />

      <Background />

      {/* TitleScene */}
      <Sequence from={0} durationInFrames={S1.from}>
        <TitleScene />
      </Sequence>

      {/* Scene 1 — 為什麼難 + Benchmark */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — Arena */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — Three limits */}
      <Sequence from={S3.from} durationInFrames={S3.to - S3.from}>
        <Scene3 />
      </Sequence>

      {/* Scene 4 — Practical tips */}
      <Sequence from={S4.from} durationInFrames={S4.to - S4.from}>
        <Scene4 />
      </Sequence>

      {/* Summary */}
      <Sequence from={SU.from} durationInFrames={SU.to - SU.from}>
        <SummaryScene />
      </Sequence>

      {/* Global overlays */}
      <ProgressBar globalFrame={frame} />
      <IMessageOverlay globalFrame={frame} />
    </AbsoluteFill>
  );
}
