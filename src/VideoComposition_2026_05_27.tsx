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
// Title:    0s         → 0     intro hook (0:00-0:18)
// Scene1:   18s        → 540   三個耗電環節 + 5-10× 對照
// Scene2:   88s        → 2640  規模有多大 + 連動問題
// Scene3:   158s       → 4740  行業解法 + AI 素養 + 思考題
// Summary:  250s       → 7500  重點整理
// End:      289s       → 8670
export const SCENES_2026_05_27 = {
  title: { from: 0, to: 540 },
  scene1: { from: 540, to: 2640 },
  scene2: { from: 2640, to: 4740 },
  scene3: { from: 4740, to: 7500 },
  summary: { from: 7500, to: 8670 },
} as const;
export const TOTAL_FRAMES_2026_05_27 = 8670;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "三個耗電環節", start: 540 },
  { label: "規模有多大", start: 2640 },
  { label: "行業的解法", start: 4740 },
  { label: "重點整理", start: 7500 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // 1:17 (frame 2310) speaker asks "你每次和AI對話大概消耗多少電?"
  { from: 2310, to: 2640, sender: "親身經歷", text: "一次 ChatGPT ≈ 5–10 次 Google 搜尋。乘上你今天問了幾次，會是什麼數字？" },
  // 3:58 (frame 7140) speaker asks "你覺得 AI 公司應該主動揭露..."
  { from: 7140, to: 7470, sender: "想一想", text: "如果某個 AI 工具的環境成本是公開的，你會不會因此換一個更省電的選項？" },
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
        background: "radial-gradient(circle, rgba(255,159,67,0.05) 0%, transparent 70%)",
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

// 1. LightningGPUAnimation — TitleScene (centered, above subtitle safe zone)
//    Visual metaphor: GPU chip core surrounded by lightning bolts +
//    a power meter dial spiking — "算力 = 大量電力"
//    triggerFrame = 210 (0:07 "算力需要電 很多電")
//    DURATION = 330 (title scene end at 540, SceneFade handles last cut)
function LightningGPUAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 330;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const chipScale = easeOutBack(prog(f, 22));
  const corePulse = 0.55 + 0.45 * Math.sin(f * 0.12);
  const meterGrow = interpolate(f, [40, 110], [0.05, 0.92], { easing: E.outExpo, extrapolateRight: "clamp" });
  const meterPulse = 0.85 + 0.15 * Math.sin(f * 0.18);

  // 8 lightning bolts radiating outward
  const bolts = Array.from({ length: 8 }).map((_, i) => ({
    angle: (i * 360) / 8 - 90,
    delay: 18 + i * 6,
  }));

  return (
    <div style={{
      position: "absolute",
      bottom: SUBTITLE_SAFE + 80 * S,
      left: "50%",
      transform: "translateX(-50%)",
      opacity: envelope,
      pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S,
    }}>
      {/* GPU chip with lightning */}
      <div style={{ position: "relative", width: 340 * S, height: 240 * S }}>
        {/* Lightning bolts */}
        {bolts.map((b, i) => {
          const bF = Math.max(0, f - b.delay);
          const bLen = interpolate(bF, [0, 18], [0, 120 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
          const bOp = interpolate(bF, [0, 10, 60, 90], [0, 1, 1, 0.7], clamp);
          const flick = 0.6 + 0.4 * Math.sin((f + i * 4) * 0.25);
          const rad = (b.angle * Math.PI) / 180;
          const ex = Math.cos(rad) * bLen;
          const ey = Math.sin(rad) * bLen;
          return (
            <svg key={i} width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" as const, opacity: bOp * flick }}>
              <line
                x1="50%" y1="50%"
                x2={`calc(50% + ${ex}px)`} y2={`calc(50% + ${ey}px)`}
                stroke={C.primary}
                strokeWidth={3 * S}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 ${8 * S}px ${C.primary})` }}
              />
              {/* Bolt tip */}
              <circle
                cx={`calc(50% + ${ex}px)`} cy={`calc(50% + ${ey}px)`}
                r={6 * S}
                fill={C.primary}
                style={{ filter: `drop-shadow(0 0 ${10 * S}px ${C.primary})` }}
              />
            </svg>
          );
        })}

        {/* GPU chip core */}
        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: `translate(-50%,-50%) scale(${chipScale})`,
          width: 130 * S, height: 130 * S,
          borderRadius: 18 * S,
          background: `linear-gradient(135deg, ${C.surface2} 0%, ${C.surface} 100%)`,
          border: `${3 * S}px solid ${C.primary}`,
          boxShadow: `0 0 ${(28 + corePulse * 22) * S}px rgba(124,255,178,${0.4 + corePulse * 0.3})`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* GPU pads */}
          {Array.from({ length: 8 }).map((_, i) => {
            const isTop = i < 4;
            const idx = i % 4;
            return (
              <div key={i} style={{
                position: "absolute",
                top: isTop ? -8 * S : "auto",
                bottom: !isTop ? -8 * S : "auto",
                left: 22 * S + idx * 28 * S,
                width: 14 * S, height: 14 * S,
                background: C.primary,
                opacity: 0.55,
                borderRadius: 3 * S,
              }} />
            );
          })}
          <div style={{
            fontFamily: F_HEAD, fontSize: 30 * S, fontWeight: 800,
            color: C.primary, letterSpacing: "0.06em",
            textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.8)`,
          }}>GPU</div>
        </div>
      </div>

      {/* Power meter bar */}
      <div style={{
        opacity: interpolate(f, [30, 60], [0, 1], clamp),
        width: 320 * S,
        background: C.surface,
        border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 14 * S,
        padding: `${10 * S}px ${16 * S}px`,
        boxShadow: `0 0 ${20 * S}px ${C.primaryGlow}`,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 * S,
        }}>
          <span style={{
            fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
            color: C.muted, letterSpacing: "0.18em", textTransform: "uppercase" as const,
          }}>Power</span>
          <span style={{
            fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800,
            color: C.primary, opacity: meterPulse,
            textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.6)`,
          }}>HIGH</span>
        </div>
        <div style={{
          height: 12 * S, background: "rgba(255,255,255,0.06)",
          borderRadius: 99, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${meterGrow * 100}%`,
            background: `linear-gradient(90deg, ${C.primary} 0%, ${C.orange} 100%)`,
            borderRadius: 99,
            boxShadow: `0 0 ${10 * S}px ${C.primary}88`,
          }} />
        </div>
      </div>
    </div>
  );
}

// 2. ThreeSourcesAnimation — Scene 1 Phase A (right side)
//    Visual metaphor: 3 vertical icon cards (Training, Inference, Cooling) appearing
//    triggerLocalFrame = 180 (0:24 "第一個是訓練"; scene1 starts 0:18, local=6s=180)
//    Sub-delays: Training f=0, Inference f=630 (0:45 → local 810), Cooling f=1140 (1:02 → local 1320)
//    DURATION = 1590 (ends at A_REMOVE=1770)
function ThreeSourcesAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1590;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const items = [
    { idx: "01", emoji: "🏋️", label: "Training", desc: "訓練", color: C.primary, at: 0 },
    { idx: "02", emoji: "💬", label: "Inference", desc: "推理", color: C.blue, at: 630 },
    { idx: "03", emoji: "❄️", label: "Cooling", desc: "冷卻", color: C.orange, at: 1140 },
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
        耗電 · 三大來源
      </div>
      {items.map((item, i) => {
        const itemF = Math.max(0, f - item.at);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [40 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const iconScale = easeOutBack(prog(Math.max(0, itemF - 6), 18));
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
              width: 50 * S, height: 50 * S, borderRadius: 12 * S,
              background: `${item.color}1c`,
              border: `1px solid ${item.color}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 26 * S, flexShrink: 0,
              transform: `scale(${iconScale})`,
            }}>{item.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
                color: item.color, letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
              }}>{item.idx} · {item.label}</div>
              <div style={{
                fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700,
                color: C.text, lineHeight: 1.25, marginTop: 3 * S,
              }}>{item.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 3. ScaleCountersAnimation — Scene 2 Phase A (right side)
//    Visual metaphor: 4 numeric counter cards animating up — scale of AI energy spend
//    triggerLocalFrame = 60 (1:30 "微軟在2024-2026年..."; scene2 starts 1:28, local=2s=60)
//    Sub-delays:
//      微軟 $800B at f=0       (1:30)
//      Anthropic 數十億瓦 at f=330  (1:41 → local 390)
//      Google +48% at f=690    (1:53 → local 750)
//      2030 5× at f=1260       (2:12 → local 1320)
//    DURATION = 1440 (ends at A_FADE_START)
function ScaleCountersAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1440;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Animated counters
  const ctrMs = Math.round(interpolate(f, [0, 70], [0, 800], { easing: E.outExpo, extrapolateRight: "clamp" }));
  const ctrAnth = Math.round(interpolate(f, [330, 400], [0, 10], { easing: E.outExpo, extrapolateRight: "clamp" }));
  const ctrG = Math.round(interpolate(f, [690, 770], [0, 48], { easing: E.outExpo, extrapolateRight: "clamp" }));
  const ctr5x = interpolate(f, [1260, 1340], [1, 5], { easing: E.outExpo, extrapolateRight: "clamp" });

  const items = [
    { idx: "MSFT", value: `$${ctrMs}B+`, label: "資料中心投資 (24–26)", color: C.primary, at: 0 },
    { idx: "ANTH", value: `${ctrAnth}+ GW`, label: "Anthropic 算力協議", color: C.blue, at: 330 },
    { idx: "GOOGL", value: `+${ctrG}%`, label: "Google 排放 (19→24)", color: C.orange, at: 690 },
    { idx: "2030", value: `${ctr5x.toFixed(1)}×`, label: "全球 AI 用電預估", color: C.red, at: 1260 },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 12 * S,
      width: 300 * S,
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
        Scale · 數字會說話
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
            padding: `${11 * S}px ${16 * S}px`,
            display: "flex", alignItems: "center", gap: 14 * S,
            boxShadow: isOn ? `0 0 ${18 * S}px ${item.color}22` : "none",
          }}>
            <RippleRing activeAt={item.at} color={item.color} radius={14 * S} />
            <div style={{
              minWidth: 110 * S, flexShrink: 0,
              fontFamily: F_HEAD, fontSize: 28 * S, fontWeight: 800,
              color: item.color, letterSpacing: "0.02em", lineHeight: 1,
              textShadow: `0 0 ${10 * S}px ${item.color}66`,
            }}>{item.value}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
                color: item.color, letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
              }}>{item.idx}</div>
              <div style={{
                fontFamily: F_TC, fontSize: 18 * S, fontWeight: 500,
                color: C.textSub, lineHeight: 1.4, marginTop: 2 * S,
              }}>{item.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 4. GridStressAnimation — Scene 2 Phase B (right side)
//    Visual metaphor: power grid with overload indicator + climate gauge
//    triggerLocalFrame = 1560 (2:20 "一是對電網的壓力"; scene2 starts 1:28, local=52s=1560)
//    Sub: Grid at f=0, Climate at f=180 (2:26 → local 1740 → f=180)
//    DURATION = 540 (scene2 ends at local 2100)
function GridStressAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 540;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Grid bar progress and climate gauge
  const gridLoad = interpolate(f, [10, 90], [0.2, 0.94], { easing: E.outExpo, extrapolateRight: "clamp" });
  const gridFlick = 0.85 + 0.15 * Math.sin(f * 0.22);
  const warnPulse = 0.5 + 0.5 * Math.sin(f * 0.15);

  // Climate dial
  const climateF = Math.max(0, f - 180);
  const dialAngle = interpolate(climateF, [0, 80], [-90, 60], { easing: E.outExpo, extrapolateRight: "clamp" });
  const dialOp = interpolate(climateF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 16 * S,
      width: 290 * S,
    }}>
      {/* Eyebrow */}
      <div style={{
        opacity: interpolate(f, [0, 18], [0, 1], clamp),
        fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
        color: C.red, letterSpacing: "0.12em", textTransform: "uppercase" as const,
        display: "flex", alignItems: "center", gap: 8 * S,
      }}>
        <span style={{
          width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.red,
          opacity: warnPulse,
          boxShadow: `0 0 ${8 * S}px ${C.red}`,
        }} />
        兩個連動壓力
      </div>

      {/* Grid load card */}
      <div style={{
        position: "relative",
        background: C.surface,
        border: `1px solid ${C.orangeBorder}`,
        borderRadius: 14 * S,
        padding: `${14 * S}px ${16 * S}px`,
        boxShadow: `0 0 ${18 * S}px ${C.orangeLight}`,
      }}>
        <RippleRing activeAt={0} color={C.orange} radius={14 * S} />
        <div style={{
          display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 10 * S,
        }}>
          <div style={{
            width: 44 * S, height: 44 * S, borderRadius: 10 * S,
            background: `${C.orange}1c`,
            border: `1px solid ${C.orange}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22 * S, flexShrink: 0,
          }}>⚡</div>
          <div style={{
            fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700,
            color: C.text, lineHeight: 1.2,
          }}>電網壓力</div>
        </div>
        <div style={{
          height: 14 * S, background: "rgba(255,255,255,0.06)",
          borderRadius: 99, overflow: "hidden", marginBottom: 8 * S,
        }}>
          <div style={{
            height: "100%", width: `${gridLoad * 100}%`,
            background: `linear-gradient(90deg, ${C.primary} 0%, ${C.orange} 60%, ${C.red} 100%)`,
            borderRadius: 99,
            boxShadow: `0 0 ${10 * S}px ${C.orange}88`,
            opacity: gridFlick,
          }} />
        </div>
        <div style={{
          fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
          color: C.muted, letterSpacing: "0.04em",
        }}>基礎建設 沒準備好</div>
      </div>

      {/* Climate dial card */}
      <div style={{
        position: "relative",
        opacity: dialOp,
        background: C.surface,
        border: `1px solid ${C.redBorder}`,
        borderRadius: 14 * S,
        padding: `${14 * S}px ${16 * S}px`,
        boxShadow: `0 0 ${18 * S}px ${C.redLight}`,
      }}>
        <RippleRing activeAt={180} color={C.red} radius={14 * S} />
        <div style={{
          display: "flex", alignItems: "center", gap: 14 * S,
        }}>
          {/* Dial */}
          <div style={{
            position: "relative", width: 70 * S, height: 70 * S, flexShrink: 0,
          }}>
            <svg width={70 * S} height={70 * S} style={{ position: "absolute", inset: 0, overflow: "visible" as const }}>
              <circle cx={35 * S} cy={35 * S} r={30 * S}
                fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3 * S} />
              <path
                d={`M ${35 * S} ${35 * S} L ${35 * S + Math.cos((dialAngle * Math.PI) / 180) * 26 * S} ${35 * S + Math.sin((dialAngle * Math.PI) / 180) * 26 * S}`}
                stroke={C.red}
                strokeWidth={4 * S}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 ${6 * S}px ${C.red})` }}
              />
              <circle cx={35 * S} cy={35 * S} r={5 * S} fill={C.red} />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700,
              color: C.text, lineHeight: 1.2, marginBottom: 4 * S,
            }}>氣候目標</div>
            <div style={{
              fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
              color: C.red, letterSpacing: "0.04em",
            }}>碳中和承諾 更難達到</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 5. SolutionsAnimation — Scene 3 Phase A (right side)
//    Visual metaphor: 4 solution cards (efficient model / nuclear / cold-site / hardware)
//    triggerLocalFrame = 150 (2:43 "更高效率的模型"; scene3 starts 2:38, local=5s=150)
//    Sub-delays:
//      高效模型 f=0     (2:43)
//      核能 f=390       (2:56 → local 540)
//      寒冷地點 f=900   (3:13 → local 1050)
//      硬體效率 f=1170  (3:22 → local 1320)
//    DURATION = 1380 (ends at A_FADE_START=1450; envelope fades last 30)
function SolutionsAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1380;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const items = [
    { idx: "01", emoji: "🪶", label: "高效小模型",     color: C.primary, at: 0 },
    { idx: "02", emoji: "⚛️", label: "核能 / 再生能源", color: C.blue,    at: 390 },
    { idx: "03", emoji: "🧊", label: "寒冷地區選址",   color: C.purple,  at: 900 },
    { idx: "04", emoji: "🔬", label: "硬體效率提升",   color: C.orange,  at: 1170 },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 12 * S,
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
        多管齊下 · 四個方向
      </div>
      {items.map((item, i) => {
        const itemF = Math.max(0, f - item.at);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [40 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const iconScale = easeOutBack(prog(Math.max(0, itemF - 6), 18));
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
              fontSize: 24 * S, flexShrink: 0,
              transform: `scale(${iconScale})`,
            }}>{item.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
                color: item.color, letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
              }}>{item.idx}</div>
              <div style={{
                fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700,
                color: C.text, lineHeight: 1.25, marginTop: 2 * S,
              }}>{item.label}</div>
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
  const dur = SCENES_2026_05_27.title.to - SCENES_2026_05_27.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(36);
  const tagStyle = useFadeUp(56);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-start",
        paddingTop: 200 * S,
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
          fontWeight: 800, fontSize: 52 * S, color: C.text,
        }}>
          <WordReveal text="為什麼 AI 訓練" startFrame={10} staggerPerWord={6}
            fontSize={52 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        {/* H1 line 2 — accent */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 8 * S,
          fontFamily: F_HEAD,
          fontWeight: 800, fontSize: 40 * S, color: C.primary,
        }}>
          <WordReveal text="需要那麼多電？" startFrame={32} staggerPerWord={6}
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
          能源問題有多嚴重——算力需求帶來的真實代價
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 18 * S }}>
          <span style={{
            fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 500,
            color: C.muted, letterSpacing: "0.18em",
            textTransform: "uppercase" as const,
          }}>電力 · 算力 · 永續 · AI 素養</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — 三個耗電環節 + 5-10× ──────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_27.scene1.to - SCENES_2026_05_27.scene1.from;

  // Local timestamps (scene1 starts at global 540):
  // 18  → local 0    "AI 系統消耗電力主要來自兩個環節" (Phase A start)
  // 24  → local 180  "第一個是訓練"
  // 45  → local 810  "第二個是推理"
  // 62  → local 1320 "還有一個常被忽略的部分" (Cooling intro)
  // 65  → local 1410 "冷卻"
  // 77  → local 1770 "你每次和AI對話大概消耗多少電?"  (Phase A → B)
  // 79  → local 1830 "研究估算...5-10倍"

  // Phase A → B
  const A_FADE_START = 1690; // 1770 - 80
  const A_REMOVE = 1770;
  const B_SHOW_AT = 1770;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A delays (cards aligned to VTT cues)
  const A_EYEBROW = 0;
  const A_HEADING = 14;
  const A_CARD1 = 180;  // 0:24 Training
  const A_CARD2 = 810;  // 0:45 Inference
  const A_CARD3 = 1320; // 1:02 Cooling

  // Phase B delays
  const B_EYEBROW = 1770;
  const B_HEADING = 1784;
  const B_HIGHLIGHT = 1830; // 1:19 highlight reveal

  // Animation triggers
  const SOURCES_AT = 180;

  // Phase A styles
  const aEyebrowStyle = useFadeUp(A_EYEBROW);
  const aHeadingStyle = useFadeUp(A_HEADING);

  // Phase B styles
  const bEyebrowStyle = useFadeUp(showB ? B_EYEBROW : 999999);
  const bHeadingStyle = useFadeUp(showB ? B_HEADING : 999999);
  const bHighlightStyle = useFadeUp(showB ? B_HIGHLIGHT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn scrollUp={{ at: 0, amount: 140 }}>
        {/* ── Phase A: 三個耗電環節 ───────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...aEyebrowStyle, marginBottom: 14 * S }}>
              <EyebrowChip label="AI 的耗電來源" delay={A_EYEBROW} color={C.primary} />
            </div>

            <h2 style={{ ...aHeadingStyle, margin: 0, marginBottom: 22 * S }}>
              <span style={{
                fontFamily: F_HEAD, fontWeight: 800, fontSize: 28 * S,
                color: C.text, lineHeight: 1.3,
              }}>電力消耗來自<span style={{ color: C.primary }}>三個環節</span></span>
            </h2>

            <SourceCard
              num="01" label="訓練 Training" color={C.primary}
              desc="幾千到幾萬顆 GPU 連跑幾週到幾個月——單次訓練耗電可達數百萬度，等同幾百個美國家庭一年用電量"
              delay={A_CARD1}
            />
            <SourceCard
              num="02" label="推理 Inference" color={C.blue}
              desc="每次和 AI 對話都要算一次。單次耗電不多，但 ChatGPT 每天上億次對話，累積非常可觀"
              delay={A_CARD2}
            />
            <SourceCard
              num="03" label="冷卻 Cooling" color={C.orange}
              desc="GPU 高速運算發熱嚴重——資料中心冷卻的耗電，有時候和運算本身一樣多"
              delay={A_CARD3}
            />
          </div>
        )}

        {/* ── Phase B: 5-10× 對照 ─────────────────── */}
        {showB && (
          <>
            <div style={{ ...bEyebrowStyle, marginBottom: 14 * S }}>
              <EyebrowChip label="對照感受一下" delay={B_EYEBROW} color={C.primary} />
            </div>

            <h2 style={{ ...bHeadingStyle, margin: 0, marginBottom: 22 * S }}>
              <span style={{
                fontFamily: F_HEAD, fontWeight: 800, fontSize: 28 * S,
                color: C.text, lineHeight: 1.3,
              }}>一次對話到底用多少電？</span>
            </h2>

            {/* Highlight: 5-10x */}
            <div style={{ ...bHighlightStyle }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 18 * S,
                padding: `${22 * S}px ${24 * S}px`,
                boxShadow: `0 0 ${36 * S}px ${C.primaryGlow}`,
              }}>
                <div style={{
                  fontFamily: F_BODY, fontSize: 20 * S, fontWeight: 500,
                  color: C.muted, letterSpacing: "0.12em",
                  textTransform: "uppercase" as const, marginBottom: 14 * S,
                }}>研究估算</div>

                {/* Comparison bars */}
                <div style={{
                  display: "flex", flexDirection: "column", gap: 14 * S, marginBottom: 18 * S,
                }}>
                  {/* Google search */}
                  <div>
                    <div style={{
                      display: "flex", justifyContent: "space-between", marginBottom: 6 * S,
                    }}>
                      <span style={{
                        fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text,
                      }}>🔎 Google 搜尋</span>
                      <span style={{
                        fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800,
                        color: C.muted,
                      }}>1×</span>
                    </div>
                    <div style={{
                      height: 14 * S, background: "rgba(255,255,255,0.06)",
                      borderRadius: 99, overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%", width: `12%`,
                        background: C.muted, borderRadius: 99,
                      }} />
                    </div>
                  </div>
                  {/* ChatGPT */}
                  <div>
                    <div style={{
                      display: "flex", justifyContent: "space-between", marginBottom: 6 * S,
                    }}>
                      <span style={{
                        fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text,
                      }}>🤖 ChatGPT 對話</span>
                      <span style={{
                        fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800,
                        color: C.primary,
                        textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.6)`,
                      }}>5–10×</span>
                    </div>
                    <div style={{
                      height: 14 * S, background: "rgba(255,255,255,0.06)",
                      borderRadius: 99, overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%", width: `90%`,
                        background: `linear-gradient(90deg, ${C.primary} 0%, ${C.orange} 100%)`,
                        borderRadius: 99,
                        boxShadow: `0 0 ${10 * S}px ${C.primary}88`,
                      }} />
                    </div>
                  </div>
                </div>

                <div style={{
                  fontFamily: F_TC, fontSize: 22 * S, fontWeight: 500,
                  color: C.text, lineHeight: 1.55,
                }}>
                  單次差距不大，但<span style={{ color: C.primary, fontWeight: 700 }}>持續累積</span>，
                  全球規模就非常驚人
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ThreeSourcesAnimation triggerLocalFrame={SOURCES_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

function SourceCard({ num, label, color, desc, delay }: {
  num: string; label: string; color: string; desc: string; delay: number;
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
        borderRadius: 14 * S,
        padding: `${14 * S}px ${20 * S}px`,
        boxShadow: `0 0 ${18 * S}px ${color}11`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 8 * S }}>
          <div style={{
            width: 44 * S, height: 44 * S, borderRadius: 10 * S,
            background: `${color}1c`,
            border: `1px solid ${color}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800,
            color, flexShrink: 0,
          }}>{num}</div>
          <div style={{
            fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700,
            color: C.text, lineHeight: 1.2,
          }}>{label}</div>
        </div>
        <div style={{
          fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500,
          color: C.textSub, lineHeight: 1.55,
        }}>{desc}</div>
      </div>
    </div>
  );
}

// ── Scene2 — 規模有多大 + 連動壓力 ─────────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_27.scene2.to - SCENES_2026_05_27.scene2.from;

  // Local timestamps (scene2 starts at global 2640):
  // 88  → local 0    "問題有多大?"
  // 90  → local 60   "微軟 800 億美元"
  // 101 → local 390  "Anthropic 數十億瓦"
  // 113 → local 750  "Google +48%"
  // 132 → local 1320 "2030 5×"
  // 138 → local 1500 "這帶來兩個連動的問題" (Phase A → B)
  // 140 → local 1560 "一是對電網的壓力"
  // 146 → local 1740 "二是對氣候目標的挑戰"
  // 158 → local 2100 (scene end)

  // Phase A → B
  const A_FADE_START = 1420; // 1500 - 80
  const A_REMOVE = 1500;
  const B_SHOW_AT = 1500;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A delays
  const A_EYEBROW = 0;
  const A_HEADING = 14;
  const A_STAT1 = 60;    // 1:30 微軟
  const A_STAT2 = 390;   // 1:41 Anthropic
  const A_STAT3 = 750;   // 1:53 Google
  const A_STAT4 = 1320;  // 2:12 2030

  // Phase B delays
  const B_EYEBROW = 1500;
  const B_HEADING = 1514;
  const B_CARD1 = 1560;  // 2:20 電網
  const B_CARD2 = 1740;  // 2:26 氣候

  // Animation triggers
  const COUNTERS_AT = 60;
  const STRESS_AT = 1560;

  // Phase A styles
  const aEyebrowStyle = useFadeUp(A_EYEBROW);
  const aHeadingStyle = useFadeUp(A_HEADING);

  // Phase B styles
  const bEyebrowStyle = useFadeUp(showB ? B_EYEBROW : 999999);
  const bHeadingStyle = useFadeUp(showB ? B_HEADING : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A: 4 個數字 ──────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...aEyebrowStyle, marginBottom: 14 * S }}>
              <EyebrowChip label="數字會說話" delay={A_EYEBROW} color={C.primary} />
            </div>

            <h2 style={{ ...aHeadingStyle, margin: 0, marginBottom: 22 * S }}>
              <span style={{
                fontFamily: F_HEAD, fontWeight: 800, fontSize: 28 * S,
                color: C.text, lineHeight: 1.3,
              }}>讓<span style={{ color: C.primary }}>幾個數字</span>說話</span>
            </h2>

            <StatCard
              label="微軟 · 資料中心投資" highlight="800 億美元+"
              note="2024–2026 三年——大部分為了支援 AI 算力需求"
              color={C.primary} delay={A_STAT1}
            />
            <StatCard
              label="Anthropic × 雲廠合作" highlight="數十億瓦"
              note="與 SpaceX、Amazon、Google、微軟簽訂的算力協議"
              color={C.blue} delay={A_STAT2}
            />
            <StatCard
              label="Google 溫室氣體排放" highlight="+48%"
              note="2019 → 2024，主要原因是 AI 相關能源消耗"
              color={C.orange} delay={A_STAT3}
            />
            <StatCard
              label="2030 全球 AI 用電預估" highlight="5× 以上"
              note="依各大 AI 公司擴張計畫，算力需求還會持續大幅成長"
              color={C.red} delay={A_STAT4}
            />
          </div>
        )}

        {/* ── Phase B: 連動兩壓力 ─────────────────── */}
        {showB && (
          <>
            <div style={{ ...bEyebrowStyle, marginBottom: 14 * S }}>
              <EyebrowChip label="兩個連動的問題" delay={B_EYEBROW} color={C.red} />
            </div>

            <h2 style={{ ...bHeadingStyle, margin: 0, marginBottom: 22 * S }}>
              <span style={{
                fontFamily: F_HEAD, fontWeight: 800, fontSize: 28 * S,
                color: C.text, lineHeight: 1.3,
              }}>規模擴張，帶來<span style={{ color: C.red }}>兩個壓力</span></span>
            </h2>

            <PressureCard
              num="01" emoji="⚡" label="電網壓力"
              desc="很多地區的電力基礎建設沒有準備好——資料中心一座一座蓋上去，電網能不能撐住是大問題"
              color={C.orange} delay={B_CARD1}
            />
            <PressureCard
              num="02" emoji="🌡️" label="氣候目標"
              desc="很多 AI 公司都有碳中和承諾，但算力擴張使這些目標更難達到——可能要靠買碳權或核能來補"
              color={C.red} delay={B_CARD2}
            />
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ScaleCountersAnimation triggerLocalFrame={COUNTERS_AT} />
        <GridStressAnimation triggerLocalFrame={STRESS_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

function StatCard({ label, highlight, note, color, delay }: {
  label: string; highlight: string; note: string; color: string; delay: number;
}) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const op = interpolate(f, [0, 18], [0.28, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const ty = interpolate(f, [0, 22], [8 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const style = { opacity: op, transform: `translateY(${ty}px)` };
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${color}44`,
        borderRadius: 14 * S,
        padding: `${12 * S}px ${20 * S}px`,
        boxShadow: `0 0 ${18 * S}px ${color}11`,
        display: "flex", alignItems: "center", gap: 18 * S,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
            color: color, letterSpacing: "0.08em",
            textTransform: "uppercase" as const, marginBottom: 4 * S,
          }}>{label}</div>
          <div style={{
            fontFamily: F_TC, fontSize: 18 * S, fontWeight: 500,
            color: C.textSub, lineHeight: 1.5,
          }}>{note}</div>
        </div>
        <div style={{
          flexShrink: 0,
          fontFamily: F_HEAD, fontSize: 30 * S, fontWeight: 800,
          color: color, letterSpacing: "0.02em", lineHeight: 1,
          textShadow: `0 0 ${12 * S}px ${color}66`,
          whiteSpace: "nowrap" as const,
        }}>{highlight}</div>
      </div>
    </div>
  );
}

function PressureCard({ num, emoji, label, desc, color, delay }: {
  num: string; emoji: string; label: string; desc: string; color: string; delay: number;
}) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const op = interpolate(f, [0, 18], [0.28, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const ty = interpolate(f, [0, 22], [8 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const style = { opacity: op, transform: `translateY(${ty}px)` };
  return (
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${color}66`,
        borderRadius: 16 * S,
        padding: `${16 * S}px ${22 * S}px`,
        boxShadow: `0 0 ${24 * S}px ${color}1a`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 * S, marginBottom: 10 * S }}>
          <div style={{
            width: 50 * S, height: 50 * S, borderRadius: 12 * S,
            background: `${color}1c`,
            border: `1px solid ${color}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26 * S, flexShrink: 0,
          }}>{emoji}</div>
          <div>
            <div style={{
              fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
              color, letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
            }}>{num}</div>
            <div style={{
              fontFamily: F_TC, fontSize: 26 * S, fontWeight: 700,
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

// ── Scene3 — 行業解法 + AI 素養 ───────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_27.scene3.to - SCENES_2026_05_27.scene3.from;

  // Local timestamps (scene3 starts at global 4740):
  // 158 → local 0    "應對能源問題"
  // 163 → local 150  "更高效率的模型"
  // 176 → local 540  "核能再生能源"
  // 193 → local 1050 "資料中心地點選擇 冰島、挪威"
  // 202 → local 1320 "硬體效率提升"
  // 209 → local 1530 "最後一個AI素養視角" (Phase A → B)
  // 211 → local 1590 "AI 的能源問題是真實存在的挑戰"
  // 215 → local 1710 "AI系統同時也在帶來效率提升"
  // 231 → local 2190 "AI的能源足跡需要被透明的量化"
  // 238 → local 2400 (iMessage 思考題 starts at global 7140 = local 2400)
  // 250 → local 2760 (scene end)

  // Phase A → B
  const A_FADE_START = 1450; // 1530 - 80
  const A_REMOVE = 1530;
  const B_SHOW_AT = 1530;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A delays
  const A_EYEBROW = 0;
  const A_HEADING = 14;
  const A_SOL1 = 150;   // 2:43 高效模型
  const A_SOL2 = 540;   // 2:56 核能
  const A_SOL3 = 1050;  // 3:13 寒冷地點
  const A_SOL4 = 1320;  // 3:22 硬體效率

  // Phase B delays
  const B_EYEBROW = 1530;
  const B_HEADING = 1544;
  const B_HIGHLIGHT = 1710; // 3:35 AI 也帶來效率提升
  const B_TAKEAWAY = 2190;  // 3:51 能源足跡需要透明

  // Animation triggers
  const SOLUTIONS_AT = 150;

  // Phase A styles
  const aEyebrowStyle = useFadeUp(A_EYEBROW);
  const aHeadingStyle = useFadeUp(A_HEADING);

  // Phase B styles
  const bEyebrowStyle = useFadeUp(showB ? B_EYEBROW : 999999);
  const bHeadingStyle = useFadeUp(showB ? B_HEADING : 999999);
  const bHighlightStyle = useFadeUp(showB ? B_HIGHLIGHT : 999999);
  const bTakeawayStyle = useFadeUp(showB ? B_TAKEAWAY : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn scrollUp={{ at: 0, amount: 140 }}>
        {/* ── Phase A: 4 個解法 ──────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...aEyebrowStyle, marginBottom: 14 * S }}>
              <EyebrowChip label="行業多管齊下" delay={A_EYEBROW} color={C.primary} />
            </div>

            <h2 style={{ ...aHeadingStyle, margin: 0, marginBottom: 22 * S }}>
              <span style={{
                fontFamily: F_HEAD, fontWeight: 800, fontSize: 28 * S,
                color: C.text, lineHeight: 1.3,
              }}>從<span style={{ color: C.primary }}>四個方向</span>同時找出路</span>
            </h2>

            <SolutionCard
              num="01" emoji="🪶" label="高效小模型" color={C.primary}
              desc="相同能力、更少算力——開源小模型在某些任務上已接近大模型，耗能卻小很多"
              delay={A_SOL1}
            />
            <SolutionCard
              num="02" emoji="⚛️" label="核能 / 再生能源" color={C.blue}
              desc="微軟重啟核電廠、Google 投資小型模組化核反應爐、Amazon 評估核能合作——穩定低碳大量基礎電"
              delay={A_SOL2}
            />
            <SolutionCard
              num="03" emoji="🧊" label="寒冷地區選址" color={C.purple}
              desc="冰島、挪威因為氣候寒冷加上豐富再生能源，成為新一波資料中心的熱門選址"
              delay={A_SOL3}
            />
            <SolutionCard
              num="04" emoji="🔬" label="硬體效率提升" color={C.orange}
              desc="晶片廠商不斷讓同樣的電力跑出更多算力——每代 GPU 每瓦效能持續成長"
              delay={A_SOL4}
            />
          </div>
        )}

        {/* ── Phase B: AI 素養 ────────────────────── */}
        {showB && (
          <>
            <div style={{ ...bEyebrowStyle, marginBottom: 14 * S }}>
              <EyebrowChip label="AI 素養視角" delay={B_EYEBROW} color={C.primary} />
            </div>

            <h2 style={{ ...bHeadingStyle, margin: 0, marginBottom: 22 * S }}>
              <span style={{
                fontFamily: F_HEAD, fontWeight: 800, fontSize: 28 * S,
                color: C.text, lineHeight: 1.3,
              }}>挑戰<span style={{ color: C.primary }}>真實存在</span>，但別走極端</span>
            </h2>

            {/* Highlight: AI 也帶來效率 */}
            <div style={{ ...bHighlightStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 16 * S,
                padding: `${16 * S}px ${22 * S}px`,
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
                  }}>♻️</div>
                  <div style={{
                    fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700,
                    color: C.text, lineHeight: 1.25,
                  }}>AI 也在帶來<span style={{ color: C.primary }}>效率提升</span></div>
                </div>
                <div style={{
                  fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500,
                  color: C.textSub, lineHeight: 1.55,
                }}>
                  用 AI 最佳化電網調度、提升工業流程效率——
                  這些效益<span style={{ color: C.primary, fontWeight: 700 }}>有時能抵消</span>部分能源成本
                </div>
              </div>
            </div>

            {/* Takeaway: 透明揭露 */}
            <div style={{ ...bTakeawayStyle }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.orangeBorder}`,
                borderRadius: 16 * S,
                padding: `${16 * S}px ${22 * S}px`,
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
                  }}>🔍</div>
                  <div style={{
                    fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700,
                    color: C.text, lineHeight: 1.25,
                  }}>能源足跡需要被<span style={{ color: C.orange }}>透明揭露</span></div>
                </div>
                <div style={{
                  fontFamily: F_TC, fontSize: 20 * S, fontWeight: 500,
                  color: C.textSub, lineHeight: 1.55,
                }}>
                  不是只談好處不談代價——量化、公開、可追蹤，
                  才能讓使用者用<span style={{ color: C.orange, fontWeight: 700 }}>知情的方式</span>選擇工具
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <SolutionsAnimation triggerLocalFrame={SOLUTIONS_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

function SolutionCard({ num, emoji, label, color, desc, delay }: {
  num: string; emoji: string; label: string; color: string; desc: string; delay: number;
}) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const op = interpolate(f, [0, 18], [0.28, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const ty = interpolate(f, [0, 22], [8 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const style = { opacity: op, transform: `translateY(${ty}px)` };
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        background: C.surface,
        border: `1px solid ${color}44`,
        borderRadius: 14 * S,
        padding: `${12 * S}px ${20 * S}px`,
        boxShadow: `0 0 ${18 * S}px ${color}11`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 6 * S }}>
          <div style={{
            width: 44 * S, height: 44 * S, borderRadius: 10 * S,
            background: `${color}1c`,
            border: `1px solid ${color}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22 * S, flexShrink: 0,
          }}>{emoji}</div>
          <div>
            <div style={{
              fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
              color, letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
            }}>{num}</div>
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
  const dur = SCENES_2026_05_27.summary.to - SCENES_2026_05_27.summary.from;

  // Local timestamps (summary starts at global 7500):
  // 250 → local 0    "好 今天的重點整理"
  // 252 → local 60   "第一 AI的訓練和推理"
  // 259 → local 270  "第二 規模正在快速擴大"
  // 271 → local 630  "第三 高效小模型"
  // 285 → local 1050 "這裡是每日AI知識庫"
  // 289 → end

  const BADGE_AT = 0;
  const CARD1_AT = 60;
  const CARD2_AT = 270;
  const CARD3_AT = 630;
  const OUTRO_AT = 1050;

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
          title="耗電來源 = 訓練 + 推理 + 冷卻"
          desc="訓練幾百萬度、推理累積驚人、冷卻有時和運算一樣多——整體用電非常高"
        />
        <SummaryCard
          number="02" delay={CARD2_AT} color={C.orange}
          title="規模正在快速擴大"
          desc="資料中心投資破千億、2030 用電預估數倍成長——對電網和氣候目標都有壓力"
        />
        <SummaryCard
          number="03" delay={CARD3_AT} color={C.primary}
          title="行業多管齊下，但挑戰仍大"
          desc="高效小模型 + 核能再生 + 寒冷選址 + 硬體效率——能源足跡需要被透明揭露"
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
export function VideoComposition_2026_05_27() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_27.scene1;
  const S2 = SCENES_2026_05_27.scene2;
  const S3 = SCENES_2026_05_27.scene3;
  const SU = SCENES_2026_05_27.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Main narration */}
      <Audio src={staticFile("audio/2026-05-27-processed.wav")} volume={1.0} />

      {/* Background music — fade in 45f, fade out last 150f */}
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_05_27 - 150, TOTAL_FRAMES_2026_05_27],
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

      {/* Scene 1 — 三個耗電環節 + 5-10× */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — 規模 + 連動壓力 */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — 行業解法 + AI 素養 */}
      <Sequence from={S3.from} durationInFrames={S3.to - S3.from}>
        <Scene3 />
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
