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

// ── Hero stage geometry ────────────────────────────────────────────────────
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
// Title:    0s       → 0      hook：一個 AI 指揮一群 AI / 多代理人系統
// Scene1:   22s      → 660    怎麼分工：協調者—執行者 + 並行 vs 排隊
// Scene2:   142s     → 4260   為什麼重要：90.2% + 成本 15 倍
// Scene3:   278s     → 8340   怎麼應用：看懂強工具 / 生態 / 判斷該不該用
// Summary:  398s     → 11940  重點整理 + 小練習
// End:      485.7s(audio)     → 14610
export const SCENES_2026_06_08 = {
  title: { from: 0, to: 660 },
  scene1: { from: 660, to: 4260 },
  scene2: { from: 4260, to: 8340 },
  scene3: { from: 8340, to: 11940 },
  summary: { from: 11940, to: 14610 },
} as const;
export const TOTAL_FRAMES_2026_06_08 = 14610;

const CHAPTERS = [
  { label: "今日主題", start: 0 },
  { label: "怎麼分工", start: 660 },
  { label: "為什麼重要", start: 4260 },
  { label: "怎麼應用", start: 8340 },
  { label: "重點整理", start: 11940 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene1 結尾「這裡先想一想」02:04 → scene1 end
  { from: 3720, to: 4260, sender: "想一想", text: "一份任務要查 20 家公司，你要一個人慢慢查 20 次，還是派 20 個人各查一家、再交回來？" },
  // Scene2 結尾「這裡再想一想」04:27 → scene2 end
  { from: 8010, to: 8340, sender: "想一想", text: "當一個工具效果好、但很貴，關鍵就不再是「它能不能做」，而是「這件事值不值得用它做」。" },
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

// dim (0.28) → bright (1) tied to a VTT cue (scene-local frame)
function calcDim(activeAt: number, frame: number, dimOpacity = 0.28) {
  const af = Math.max(0, frame - activeAt);
  const t = interpolate(af, [0, 20], [dimOpacity, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
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
        fontFamily: F_BODY, fontWeight: 500, fontSize: 19 * S, color,
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
      fontWeight: 700, lineHeight: 1.35, maxWidth: 600 * S, margin: "0 auto",
      fontSize, color, wordBreak: "break-word" as const,
    }}>{text}</div>
  );
}

function StageTakeaway({ text, delay, color = C.primary }: { text: string; delay: number; color?: string }) {
  // dim → bright (0.28 → 1.0) — 不 pop-in，從 scene start 就 dim 在場
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - delay);
  const op = interpolate(f, [0, 18], [0.28, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const ty = interpolate(f, [0, 22], [8 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const a = { opacity: op, transform: `translateY(${ty}px)` };
  return (
    <div style={{
      ...a, textAlign: "center", margin: "0 auto",
      fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 500,
      color: C.text, lineHeight: 1.45, maxWidth: 1120 * S,
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

// ── BigStat (shared) ───────────────────────────────────────────────────────
function BigStat({ value, label, sub, brightAt, accent, glow }: {
  value: string; label: string; sub?: string; brightAt: number; accent: string; glow?: boolean;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(brightAt, frame, 0.3);
  return (
    <div style={{
      opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${16 * S}px ${34 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
      boxShadow: glow && isOn ? `0 0 ${50 * S}px ${accent}33` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={brightAt} color={accent} radius={22 * S} />}
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>{label}</span>
      <div style={{
        fontFamily: F_HEAD, fontWeight: 800, fontSize: 56 * S, color: accent,
        lineHeight: 1, textShadow: isOn ? `0 0 ${24 * S}px ${accent}66` : "none",
      }}>{value}</div>
      {sub && <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.textSub }}>{sub}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Shared agent nodes ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// a single sub-agent worker node
function WorkerNode({ label, activeAt, accent = C.blue }: { label: string; activeAt: number; accent?: string }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  const sc = isOn ? easeOutBack(prog(Math.max(0, frame - activeAt), 22)) : 0.9;
  return (
    <div style={{
      position: "relative", width: 150 * S, opacity: op,
      transform: `scale(${Math.max(0.9, Math.min(1, sc))})`,
      background: C.surface, border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${14 * S}px ${10 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
      boxShadow: isOn ? `0 0 ${22 * S}px ${accent}22` : "none",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={16 * S} />}
      <span style={{ fontSize: 32 * S }}>🤖</span>
      <span style={{ fontFamily: F_TC, fontSize: 18 * S, fontWeight: 700, color: isOn ? C.text : C.textSub, textAlign: "center", lineHeight: 1.2 }}>{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// manager commanding a fan of sub-agents
function TitleSwarm({ managerAt, workersAt }: { managerAt: number; workersAt: number }) {
  const frame = useCurrentFrame();
  const mgr = calcDim(managerAt, frame, 0.32);
  const mgrGlow = 0.5 + 0.5 * Math.sin(frame * 0.06);
  const workers = ["子代理人", "子代理人", "子代理人", "子代理人"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
      {/* manager */}
      <div style={{ position: "relative", opacity: mgr.op }}>
        {mgr.isOn && <RippleRing activeAt={managerAt} color={C.primary} radius={20 * S} />}
        <div style={{
          display: "flex", alignItems: "center", gap: 14 * S,
          background: C.surface, border: `1px solid ${mgr.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 20 * S, padding: `${14 * S}px ${28 * S}px`,
          boxShadow: mgr.isOn ? `0 0 ${(28 + mgrGlow * 16) * S}px ${C.primaryGlow}` : "none",
        }}>
          <span style={{ fontSize: 44 * S }}>🧑‍💼</span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color: C.primary, lineHeight: 1.1 }}>主管代理人</span>
            <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em" }}>ORCHESTRATOR</span>
          </div>
        </div>
      </div>
      {/* connectors */}
      <div style={{ display: "flex", gap: 70 * S, opacity: calcDim(workersAt, frame, 0.25).op }}>
        {workers.map((_, i) => (
          <div key={i} style={{ width: 3 * S, height: 36 * S, background: C.primaryBorder }} />
        ))}
      </div>
      {/* sub-agents */}
      <div style={{ display: "flex", gap: 22 * S }}>
        {workers.map((w, i) => (
          <WorkerNode key={i} label={w} activeAt={workersAt + i * 8} accent={C.primary} />
        ))}
      </div>
    </div>
  );
}

function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_08.title.to - SCENES_2026_06_08.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(40);
  const tagStyle = useFadeUp(56);
  const swarmStyle = useFadeUp(96);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));

  // VTT (title-local = global): 多代理人系統 00:16→480 | 一個AI指揮一群AI 00:18→540
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
            fontFamily: F_BODY, fontWeight: 500, fontSize: 19 * S,
            color: C.primary, letterSpacing: "0.2em", textTransform: "uppercase" as const,
          }}>每日 AI 知識庫</span>
        </div>

        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 44 * S, color: C.text,
        }}>
          <WordReveal text="一個 AI，指揮一群 AI" startFrame={10} staggerPerWord={6}
            fontSize={44 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary,
        }}>
          <WordReveal text="多代理人系統怎麼分工" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 18 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          一個主管指揮一群 AI，分頭並進、再彙整成果
        </p>

        <div style={{ ...swarmStyle, marginTop: 34 * S }}>
          <TitleSwarm managerAt={480} workersAt={540} />
        </div>

        <div style={{ ...tagStyle, marginTop: 30 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>多代理人 · 協調者—執行者 · 並行 · AI 素養</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — 怎麼分工 ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero — orchestrator → workers → merge flow
function OrchestratorFlow({ step1At, step2At, step3At }: { step1At: number; step2At: number; step3At: number }) {
  const frame = useCurrentFrame();
  const mgr = calcDim(step1At, frame, 0.3);
  const split = calcDim(step2At, frame, 0.22);
  const merge = calcDim(step3At, frame, 0.22);
  const result = calcDim(step3At, frame, 0.3);
  const workers = ["市場數據", "競爭對手", "專家訪談"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S }}>
      {/* 主管 */}
      <div style={{ position: "relative", opacity: mgr.op }}>
        {mgr.isOn && <RippleRing activeAt={step1At} color={C.primary} radius={18 * S} />}
        <div style={{
          display: "flex", alignItems: "center", gap: 14 * S,
          background: C.surface, border: `1px solid ${mgr.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 18 * S, padding: `${12 * S}px ${26 * S}px`,
          boxShadow: mgr.isOn ? `0 0 ${26 * S}px ${C.primaryGlow}` : "none",
        }}>
          <span style={{ fontSize: 38 * S }}>🧑‍💼</span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: F_HEAD, fontSize: 23 * S, fontWeight: 800, color: C.primary, lineHeight: 1.1 }}>主管代理人</span>
            <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.textSub }}>看懂需求 · 拆成小任務</span>
          </div>
        </div>
      </div>
      {/* split arrow */}
      <div style={{ opacity: split.op, fontFamily: F_BODY, fontSize: 20 * S, color: C.primary, display: "flex", alignItems: "center", gap: 8 * S }}>
        <span style={{ fontSize: 24 * S }}>↓</span> 拆解 · 派工
      </div>
      {/* workers parallel */}
      <div style={{ display: "flex", gap: 20 * S }}>
        {workers.map((w, i) => (
          <WorkerNode key={i} label={w} activeAt={step2At + i * 10} accent={C.blue} />
        ))}
      </div>
      {/* merge arrow */}
      <div style={{ opacity: merge.op, fontFamily: F_BODY, fontSize: 20 * S, color: C.orange, display: "flex", alignItems: "center", gap: 8 * S }}>
        <span style={{ fontSize: 24 * S }}>↓</span> 交回 · 去蕪存菁
      </div>
      {/* result */}
      <div style={{ position: "relative", opacity: result.op }}>
        {result.isOn && <RippleRing activeAt={step3At} color={C.orange} radius={16 * S} />}
        <div style={{
          display: "flex", alignItems: "center", gap: 12 * S,
          background: C.orangeLight, border: `1px solid ${result.isOn ? C.orangeBorder : C.surfaceBorder}`,
          borderRadius: 16 * S, padding: `${12 * S}px ${26 * S}px`,
        }}>
          <span style={{ fontSize: 32 * S }}>📋</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 23 * S, fontWeight: 700, color: result.isOn ? C.orange : C.textSub }}>彙整成一份完整答案</span>
        </div>
      </div>
    </div>
  );
}

// Phase B hero — parallel vs serial
function ParallelVsSerial({ serialAt, serialBAt, serialCAt, parallelAt }: {
  serialAt: number; serialBAt: number; serialCAt: number; parallelAt: number;
}) {
  const frame = useCurrentFrame();
  const QueryBox = ({ name, activeAt, accent }: { name: string; activeAt: number; accent: string }) => {
    const a = calcDim(activeAt, frame, 0.25);
    return (
      <div style={{
        opacity: a.op, width: 110 * S, height: 90 * S, borderRadius: 14 * S,
        background: C.surface, border: `1px solid ${a.isOn ? accent + "66" : C.surfaceBorder}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 * S,
        boxShadow: a.isOn ? `0 0 ${20 * S}px ${accent}22` : "none",
      }}>
        <span style={{ fontSize: 28 * S }}>🔍</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: a.isOn ? accent : C.textSub }}>{name}</span>
      </div>
    );
  };
  const serialRow = calcDim(serialAt, frame, 0.3);
  const parRow = calcDim(parallelAt, frame, 0.3);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 * S, width: 1080 * S }}>
      {/* serial */}
      <div style={{
        opacity: serialRow.op,
        display: "flex", alignItems: "center", gap: 22 * S,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 20 * S,
        padding: `${18 * S}px ${28 * S}px`,
      }}>
        <div style={{ width: 230 * S, display: "flex", flexDirection: "column", gap: 4 * S }}>
          <span style={{ fontFamily: F_HEAD, fontSize: 23 * S, fontWeight: 700, color: C.textSub }}>單一 AI</span>
          <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.muted }}>排隊式：一個一個查</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
          <QueryBox name="A" activeAt={serialAt} accent={C.muted} />
          <span style={{ fontSize: 26 * S, color: C.muted }}>→</span>
          <QueryBox name="B" activeAt={serialBAt} accent={C.muted} />
          <span style={{ fontSize: 26 * S, color: C.muted }}>→</span>
          <QueryBox name="C" activeAt={serialCAt} accent={C.muted} />
        </div>
        <span style={{ marginLeft: "auto", fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 700, color: C.muted }}>🐢 慢</span>
      </div>
      {/* parallel */}
      <div style={{
        opacity: parRow.op,
        display: "flex", alignItems: "center", gap: 22 * S,
        background: C.primaryLight, border: `1px solid ${parRow.isOn ? C.primaryBorder : C.surfaceBorder}`, borderRadius: 20 * S,
        padding: `${18 * S}px ${28 * S}px`,
        boxShadow: parRow.isOn ? `0 0 ${40 * S}px ${C.primaryGlow}` : "none",
      }}>
        <div style={{ width: 230 * S, display: "flex", flexDirection: "column", gap: 4 * S }}>
          <span style={{ fontFamily: F_HEAD, fontSize: 23 * S, fontWeight: 700, color: C.primary }}>多代理人</span>
          <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.textSub }}>並行：三個一起查</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 * S }}>
          <QueryBox name="A" activeAt={parallelAt} accent={C.primary} />
          <QueryBox name="B" activeAt={parallelAt} accent={C.primary} />
          <QueryBox name="C" activeAt={parallelAt} accent={C.primary} />
        </div>
        <span style={{ marginLeft: "auto", fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 700, color: C.primary }}>⚡ 快</span>
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_08.scene1.to - SCENES_2026_06_08.scene1.from;
  // local = global - 660. Phase B 第一句「關鍵差別就在並行」01:43→3090, local 2430
  const A_FADE_START = 2350;
  const A_REMOVE = 2430;
  const B_SHOW_AT = 2430;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g660 一問一答
  const SWITCH_AT = 240; // g900 換玩法 分工合作
  const MODEL_AT = 630; // g1290 協調者-執行者
  const STEP1_AT = 750; // g1410 第一 主管拆任務
  const STEP2_AT = 990; // g1650 第二 子代理人平行開工
  const STEP3_AT = 1290; // g1950 第三 彙整
  const EDITOR_AT = 1530; // g2190 打個比方 總編輯

  // Phase B captions (local)
  const KEY_AT = 2430; // g3090 關鍵差別並行
  const SERIAL_AT = 2520; // g3180 單一AI排隊 查完A
  const SERIAL_B_AT = 2610; // g3270 查完A才查B
  const SERIAL_C_AT = 2670; // g3330 查完B才查C
  const PARALLEL_AT = 2790; // g3450 多代理人同時查ABC
  const SCALE_AT = 3060; // g3720 速度跟廣度不是同一量級

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A — 協調者—執行者 flow ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="協調者—執行者 ／ ORCHESTRATOR" delay={HEADER_AT} color={C.primary} />}
            sentence={
              frame >= MODEL_AT
                ? <StageSentence text="最常見分工：協調者—執行者" delay={MODEL_AT} color={C.primary} />
                : frame >= SWITCH_AT
                ? <StageSentence text="多代理人：讓一群 AI 分工合作" delay={SWITCH_AT} color={C.text} />
                : <StageSentence text="平常用 AI，是「一問一答」" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="就像總編輯把報導拆給三位記者，最後整合成一篇" delay={EDITOR_AT} color={C.primary} />}
          >
            <OrchestratorFlow step1At={STEP1_AT} step2At={STEP2_AT} step3At={STEP3_AT} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B — 並行 vs 排隊 ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="關鍵差別 ／ PARALLEL" delay={B_SHOW_AT} color={C.primary} />}
          sentence={
            frame >= PARALLEL_AT
              ? <StageSentence text="多代理人：三個一起查 A、B、C" delay={PARALLEL_AT} color={C.primary} fontSize={26 * S} />
              : frame >= SERIAL_AT
              ? <StageSentence text="單一 AI：查完 A 才查 B" delay={SERIAL_AT} color={C.text} />
              : <StageSentence text="關鍵差別，就在「並行」" delay={KEY_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="速度跟廣度，都不是同一個量級" delay={SCALE_AT} color={C.primary} />}
        >
          <ParallelVsSerial serialAt={SERIAL_AT} serialBAt={SERIAL_B_AT} serialCAt={SERIAL_C_AT} parallelAt={PARALLEL_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 為什麼重要 ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function OutcomeRow({ tone, title, detail, result, activeAt }: {
  tone: "good" | "bad"; title: string; detail: string; result: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  const accent = tone === "good" ? C.primary : C.red;
  return (
    <div style={{
      opacity: op, width: 1040 * S,
      display: "flex", alignItems: "center", gap: 18 * S,
      background: tone === "good" ? C.primaryLight : C.redLight,
      border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${14 * S}px ${24 * S}px`,
      boxShadow: isOn ? `0 0 ${24 * S}px ${accent}1f` : "none",
    }}>
      <span style={{ fontSize: 32 * S }}>{tone === "good" ? "✅" : "❌"}</span>
      <div style={{ width: 250 * S, fontFamily: F_HEAD, fontSize: 23 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{title}</div>
      <div style={{ flex: 1, fontFamily: F_TC, fontSize: 20 * S, color: C.textSub }}>{detail}</div>
      <div style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: accent, whiteSpace: "nowrap" as const }}>{result}</div>
    </div>
  );
}

function AnthropicProof({ statAt, anthroAt, multiAt, singleAt }: {
  statAt: number; anthroAt: number; multiAt: number; singleAt: number;
}) {
  const frame = useCurrentFrame();
  const anthro = calcDim(anthroAt, frame, 0.3);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
      {/* source chip + big stat */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 * S }}>
        <div style={{
          opacity: anthro.op, display: "flex", flexDirection: "column", gap: 6 * S,
          background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 14 * S,
          padding: `${12 * S}px ${20 * S}px`, maxWidth: 360 * S,
        }}>
          <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 700, color: C.text }}>Anthropic · 2025/6</span>
          <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.textSub, lineHeight: 1.35 }}>Opus 4 當主管、Sonnet 4 當子代理人</span>
        </div>
        <BigStat value="+90.2%" label="比單一 Claude Opus 4" sub="內部研究評測表現" brightAt={statAt} accent={C.primary} glow />
      </div>
      {/* outcomes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 * S }}>
        <OutcomeRow tone="good" title="多代理人系統" detail="拆成子任務、派子代理人同時查" result="→ 找到答案" activeAt={multiAt} />
        <OutcomeRow tone="bad" title="單一代理人" detail="只能一筆一筆慢慢查" result="→ 沒能完成" activeAt={singleAt} />
      </div>
    </div>
  );
}

// Phase B — cost tradeoff
function FitZone({ tone, label, items, activeAt }: {
  tone: "good" | "bad"; label: string; items: string[]; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  const accent = tone === "good" ? C.primary : C.red;
  return (
    <div style={{
      opacity: op, width: 480 * S,
      background: tone === "good" ? C.primaryLight : C.redLight,
      border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${18 * S}px ${24 * S}px`,
      display: "flex", flexDirection: "column", gap: 10 * S,
      boxShadow: isOn ? `0 0 ${28 * S}px ${accent}1f` : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
        <span style={{ fontSize: 28 * S }}>{tone === "good" ? "✅" : "❌"}</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 23 * S, fontWeight: 700, color: accent }}>{label}</span>
      </div>
      {items.map((it, i) => (
        <div key={i} style={{ fontFamily: F_TC, fontSize: 20 * S, color: isOn ? C.text : C.textSub, lineHeight: 1.3 }}>· {it}</div>
      ))}
    </div>
  );
}

function CostTradeoff({ tokenAt, worthAt, wasteAt }: { tokenAt: number; worthAt: number; wasteAt: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      <BigStat value="≈ 15×" label="Token 用量（對比一般對話）" sub="15 倍的成本與能耗" brightAt={tokenAt} accent={C.orange} glow />
      <div style={{ display: "flex", gap: 24 * S }}>
        <FitZone tone="good" label="值得用" items={["深度研究", "大型程式專案"]} activeAt={worthAt} />
        <FitZone tone="bad" label="純粹浪費" items={["問天氣", "寫一封短信"]} activeAt={wasteAt} />
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_08.scene2.to - SCENES_2026_06_08.scene2.from;
  // local = global - 4260. Phase B 第一句「但這裡有一個重要的AI素養觀念」03:30→6300, local 2040
  const A_FADE_START = 1960;
  const A_REMOVE = 2040;
  const B_SHOW_AT = 2040;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g4260 為什麼重要
  const ANTHRO_AT = 660; // g4920 Anthropic研究
  const STAT_AT = 1230; // g5490 高出90.2%
  const MULTI_AT = 1650; // g5910 多代理人同時查找到答案
  const SINGLE_AT = 1860; // g6120 單一沒能完成

  // Phase B captions (local)
  const PRICE_AT = 2040; // g6300 重要前提
  const EXPENSIVE_AT = 2310; // g6570 很貴
  const TOKEN_AT = 2550; // g6810 15倍
  const NOTPANACEA_AT = 2970; // g7230 不是萬靈丹
  const WORTH_AT = 3150; // g7410 值得:深度研究/程式
  const WASTE_AT = 3390; // g7650 浪費:天氣短信
  const USE_AT = 3540; // g7800 會不會用比有沒有用

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A — Anthropic proof ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="為什麼重要 ／ THE PROOF" delay={HEADER_AT} color={C.primary} />}
            sentence={
              frame >= STAT_AT
                ? <StageSentence text="多代理人贏單一模型 90.2%" delay={STAT_AT} color={C.primary} />
                : frame >= ANTHRO_AT
                ? <StageSentence text="Anthropic 內部評測給了答案" delay={ANTHRO_AT} color={C.text} />
                : <StageSentence text="多代理人為什麼這麼重要？" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="拆開來「同時查」，正是它贏過單一代理人的關鍵" delay={MULTI_AT} color={C.primary} />}
          >
            <AnthropicProof statAt={STAT_AT} anthroAt={ANTHRO_AT} multiAt={MULTI_AT} singleAt={SINGLE_AT} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B — cost tradeoff ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="但它很貴 ／ THE COST" delay={B_SHOW_AT} color={C.orange} />}
          sentence={
            frame >= NOTPANACEA_AT
              ? <StageSentence text="多代理人，不是萬靈丹" delay={NOTPANACEA_AT} color={C.orange} />
              : frame >= TOKEN_AT
              ? <StageSentence text="Token 用量大約是 15 倍" delay={TOKEN_AT} color={C.orange} />
              : <StageSentence text="但有個重要前提：它很貴" delay={PRICE_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="會不會用，比有沒有用更重要" delay={USE_AT} color={C.orange} />}
        >
          <CostTradeoff tokenAt={TOKEN_AT} worthAt={WORTH_AT} wasteAt={WASTE_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 怎麼應用 ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function AppChip({ text, activeAt, accent }: { text: string; activeAt: number; accent: string }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700,
      color: isOn ? C.text : C.textSub,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 12 * S, padding: `${8 * S}px ${16 * S}px`,
    }}>{text}</div>
  );
}

function AppCard({ index, icon, title, accent, activeAt, children }: {
  index: string; icon: string; title: string; accent: string; activeAt: number; children: React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.28);
  return (
    <div style={{
      width: 540 * S, opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 24 * S, padding: `${24 * S}px ${28 * S}px`,
      display: "flex", flexDirection: "column", gap: 16 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${accent}1f` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={24 * S} />}
      <div style={{ display: "flex", alignItems: "center", gap: 16 * S }}>
        <div style={{
          width: 76 * S, height: 76 * S, borderRadius: "50%", flexShrink: 0,
          background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 * S,
        }}>{icon}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 20 * S, color: accent }}>應用 {index}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 24 * S, color: isOn ? C.text : C.textSub, lineHeight: 1.2 }}>{title}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 10 * S }}>{children}</div>
    </div>
  );
}

function TwoApplications({ app1At, archAt, app2At, autogenAt, msfAt }: {
  app1At: number; archAt: number; app2At: number; autogenAt: number; msfAt: number;
}) {
  return (
    <div style={{ display: "flex", gap: 28 * S, alignItems: "stretch" }}>
      <AppCard index="一" icon="🔍" title="看懂強工具為什麼強" accent={C.primary} activeAt={app1At}>
        <AppChip text="深度研究功能" activeAt={app1At + 60} accent={C.primary} />
        <AppChip text="AI coding 工具" activeAt={app1At + 60} accent={C.primary} />
        <AppChip text="背後 = 一個主管指揮一群員工" activeAt={archAt} accent={C.primary} />
      </AppCard>
      <AppCard index="二" icon="🧩" title="看懂工具背後的生態" accent={C.blue} activeAt={app2At}>
        <AppChip text="微軟開源框架 AutoGen" activeAt={autogenAt} accent={C.blue} />
        <AppChip text="後繼者：Microsoft Agent Framework" activeAt={msfAt} accent={C.blue} />
        <AppChip text="已成產業標準零件" activeAt={msfAt} accent={C.blue} />
      </AppCard>
    </div>
  );
}

// Phase B — decision framework
function QuestionCard({ index, text, activeAt }: { index: string; text: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.28);
  return (
    <div style={{
      width: 1000 * S, opacity: op,
      display: "flex", alignItems: "center", gap: 18 * S,
      background: C.surface, border: `1px solid ${isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${14 * S}px ${24 * S}px`,
      boxShadow: isOn ? `0 0 ${24 * S}px ${C.primaryGlow}` : "none",
    }}>
      <div style={{
        width: 50 * S, height: 50 * S, borderRadius: 12 * S, flexShrink: 0,
        background: C.surface2, border: `1px solid ${isOn ? C.primaryBorder : C.surfaceBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color: isOn ? C.primary : C.muted,
      }}>{isOn ? "✓" : index}</div>
      <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{text}</span>
    </div>
  );
}

function DecisionFramework({ q1At, q2At, q3At, sweetAt, noAt }: {
  q1At: number; q2At: number; q3At: number; sweetAt: number; noAt: number;
}) {
  const frame = useCurrentFrame();
  const sweet = calcDim(sweetAt, frame, 0.3);
  const no = calcDim(noAt, frame, 0.3);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S }}>
      <QuestionCard index="1" text="能不能拆成幾塊獨立小任務？" activeAt={q1At} />
      <QuestionCard index="2" text="這些小任務能不能同時進行？" activeAt={q2At} />
      <QuestionCard index="3" text="價值撐不撐得起較高的成本與時間？" activeAt={q3At} />
      <div style={{ display: "flex", gap: 22 * S, marginTop: 4 * S }}>
        <div style={{
          opacity: sweet.op, width: 490 * S,
          display: "flex", alignItems: "center", gap: 14 * S,
          background: C.primaryLight, border: `1px solid ${sweet.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 18 * S, padding: `${16 * S}px ${22 * S}px`,
          boxShadow: sweet.isOn ? `0 0 ${36 * S}px ${C.primaryGlow}` : "none",
        }}>
          <span style={{ fontSize: 34 * S }}>🎯</span>
          <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: C.primary }}>三個都「是」→ 多代理人甜蜜區</span>
        </div>
        <div style={{
          opacity: no.op, width: 490 * S,
          display: "flex", alignItems: "center", gap: 14 * S,
          background: C.surface, border: `1px solid ${no.isOn ? C.surfaceBorder : C.surfaceBorder}`,
          borderRadius: 18 * S, padding: `${16 * S}px ${22 * S}px`,
        }}>
          <span style={{ fontSize: 34 * S }}>💬</span>
          <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: no.isOn ? C.text : C.textSub }}>有一個「否」→ 單一 AI 更省更快</span>
        </div>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_08.scene3.to - SCENES_2026_06_08.scene3.from;
  // local = global - 8340. Phase B 第一句「第三,學會判斷該不該用」06:04→10920, local 2580
  const A_FADE_START = 2500;
  const A_REMOVE = 2580;
  const B_SHOW_AT = 2580;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const INTRO_AT = 0; // g8340 對你有什麼用
  const APP1_AT = 420; // g8760 應用一 看懂強工具
  const ARCH_AT = 990; // g9330 一個主管指揮一群員工
  const APP2_AT = 1440; // g9780 應用二 看懂生態
  const AUTOGEN_AT = 1740; // g10080 AutoGen
  const MSF_AT = 2310; // g10650 Microsoft Agent Framework
  const STD_AT = 2370; // g10710 產業標準零件

  // Phase B captions (local)
  const HEAD_AT = 2580; // g10920 第三 學會判斷
  const Q1_AT = 2850; // g11190 能不能拆成獨立小任務
  const Q2_AT = 2970; // g11310 能不能同時進行
  const Q3_AT = 3060; // g11400 價值撐得起成本時間
  const SWEET_AT = 3300; // g11640 三個都是 甜蜜區
  const NO_AT = 3450; // g11790 一個否 單一AI更省快

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A — 兩個應用 ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="對你有什麼用 ／ APPLY IT" delay={INTRO_AT} color={C.primary} />}
            sentence={
              frame >= APP2_AT
                ? <StageSentence text="應用二：看懂工具背後的生態" delay={APP2_AT} color={C.blue} />
                : frame >= APP1_AT
                ? <StageSentence text="應用一：看懂強工具為什麼強" delay={APP1_AT} color={C.primary} />
                : <StageSentence text="理解分工，會改變你的判斷力" delay={INTRO_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="多代理人已從研究題目，變成產業的標準零件" delay={STD_AT} color={C.blue} />}
          >
            <TwoApplications app1At={APP1_AT} archAt={ARCH_AT} app2At={APP2_AT} autogenAt={AUTOGEN_AT} msfAt={MSF_AT} />
          </HeroFrame>
        </div>
      )}

      {/* ── Phase B — 判斷該不該用 ── */}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="該不該用 ／ DECIDE" delay={B_SHOW_AT} color={C.primary} />}
          sentence={
            frame >= SWEET_AT
              ? <StageSentence text="三個都「是」，才是甜蜜區" delay={SWEET_AT} color={C.primary} />
              : frame >= Q1_AT
              ? <StageSentence text="先在心裡問自己三個問題" delay={Q1_AT} color={C.text} />
              : <StageSentence text="應用三：學會判斷該不該用" delay={HEAD_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="只要一個「否」，單一 AI 的一問一答反而更省更快" delay={NO_AT} color={C.primary} />}
        >
          <DecisionFramework q1At={Q1_AT} q2At={Q2_AT} q3At={Q3_AT} sweetAt={SWEET_AT} noAt={NO_AT} />
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
      width: 1120 * S, opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${20 * S}px ${28 * S}px`,
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 * S, marginBottom: 6 * S }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 22 * S, color: accent }}>{index}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 24 * S, color: isOn ? C.text : C.textSub }}>{title}</span>
        </div>
        <div style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  );
}

function PracticeStep({ index, text, activeAt }: { index: string; text: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.28);
  return (
    <div style={{
      width: 1000 * S, opacity: op,
      display: "flex", alignItems: "center", gap: 18 * S,
      background: C.surface, border: `1px solid ${isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${13 * S}px ${24 * S}px`,
      boxShadow: isOn ? `0 0 ${22 * S}px ${C.primaryGlow}` : "none",
    }}>
      <div style={{
        width: 50 * S, height: 50 * S, borderRadius: "50%", flexShrink: 0,
        background: C.surface2, border: `1px solid ${isOn ? C.primaryBorder : C.surfaceBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: isOn ? C.primary : C.muted,
      }}>{index}</div>
      <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{text}</span>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_08.summary.to - SCENES_2026_06_08.summary.from;
  // local = global - 11940. Phase B 第一句「最後,今天試試看一個小練習」07:24→13320, local 1380
  const A_FADE_START = 1300;
  const A_REMOVE = 1380;
  const B_SHOW_AT = 1380;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A (local)
  const CARD1_AT = 180; // g12120 第一 多代理人是什麼
  const CARD2_AT = 480; // g12420 第二 為什麼重要
  const CARD3_AT = 960; // g12900 第三 不是萬靈丹

  // Phase B (local)
  const MGR_AT = 1470; // g13410 先自己當一次主管
  const STEP1_AT = 1530; // g13470 拆成三個小步驟
  const STEP2_AT = 1590; // g13530 分成三則prompt
  const STEP3_AT = 1710; // g13650 請它整合成一份
  const RESULT_AT = 1980; // g13920 更完整也更可控
  const OUTRO_AT = 2400; // g14340 這裡是每日AI知識庫

  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));
  const eyebrowFadeA = useFadeIn(6);
  const headFadeA = useFadeUp(14);
  const eyebrowFadeB = useFadeIn(B_SHOW_AT + 6);
  const headFadeB = useFadeUp(B_SHOW_AT + 14);
  const resultStyle = useFadeUp(RESULT_AT);
  const outroStyle = useFadeUp(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      {/* ── Phase A — 三點重點 ── */}
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <AbsoluteFill style={{
            paddingTop: CONTENT_TOP + 18 * S, paddingBottom: SUBTITLE_SAFE,
            paddingLeft: 80 * S, paddingRight: 80 * S,
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <div style={{ ...eyebrowFadeA, display: "flex", alignItems: "center", gap: 10 * S }}>
              <span style={{
                width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
                opacity: eyebrowPulse, boxShadow: `0 0 ${8 * S}px ${C.primary}`,
              }} />
              <span style={{
                fontFamily: F_BODY, fontWeight: 500, fontSize: 19 * S, color: C.primary,
                letterSpacing: "0.2em", textTransform: "uppercase" as const,
              }}>重點整理 — RECAP</span>
            </div>
            <h2 style={{
              ...headFadeA, margin: `${10 * S}px 0 ${30 * S}px`,
              fontFamily: F_HEAD, fontWeight: 800, fontSize: 34 * S, color: C.text, textAlign: "center",
            }}>多代理人系統，三件事</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 * S }}>
              <RecapCard index="01" icon="🧑‍💼" title="是什麼" accent={C.primary} activeAt={CARD1_AT}
                body="一個主管代理人負責拆解、指揮，多個子代理人並行執行再彙整——把人類團隊的協作搬到 AI 身上。" />
              <RecapCard index="02" icon="📊" title="為什麼重要" accent={C.blue} activeAt={CARD2_AT}
                body="Anthropic 實測比單一模型高出 90.2%，但 Token 用量大約 15 倍；貴在哪、值不值得，才是關鍵。" />
              <RecapCard index="03" icon="🎯" title="要記得" accent={C.orange} activeAt={CARD3_AT}
                body="不是萬靈丹，只在複雜、可拆解、夠高價值的任務才划算——會不會用，比有沒有用更重要。" />
            </div>
          </AbsoluteFill>
        </div>
      )}

      {/* ── Phase B — 小練習 ── */}
      {showB && (
        <AbsoluteFill style={{
          paddingTop: CONTENT_TOP + 18 * S, paddingBottom: SUBTITLE_SAFE,
          paddingLeft: 80 * S, paddingRight: 80 * S,
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <div style={{ ...eyebrowFadeB, display: "flex", alignItems: "center", gap: 10 * S }}>
            <span style={{
              width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
              opacity: eyebrowPulse, boxShadow: `0 0 ${8 * S}px ${C.primary}`,
            }} />
            <span style={{
              fontFamily: F_BODY, fontWeight: 500, fontSize: 19 * S, color: C.primary,
              letterSpacing: "0.2em", textTransform: "uppercase" as const,
            }}>今日小練習 — TRY IT</span>
          </div>
          <h2 style={{
            ...headFadeB, margin: `${10 * S}px 0 ${28 * S}px`,
            fontFamily: F_HEAD, fontWeight: 800, fontSize: 32 * S, color: C.text, textAlign: "center",
          }}>下次給 AI 複雜任務前，先自己當一次主管</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 * S }}>
            <PracticeStep index="1" text="把任務拆成三個獨立小步驟" activeAt={STEP1_AT} />
            <PracticeStep index="2" text="分成三則 prompt，分別問 AI" activeAt={STEP2_AT} />
            <PracticeStep index="3" text="最後請它把三段結果整合成一份" activeAt={STEP3_AT} />
          </div>

          <div style={{
            ...resultStyle, marginTop: 26 * S, display: "flex", alignItems: "center", gap: 14 * S,
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 18 * S,
            padding: `${16 * S}px ${30 * S}px`, boxShadow: `0 0 ${40 * S}px ${C.primaryGlow}`,
          }}>
            <span style={{ fontSize: 30 * S }}>✨</span>
            <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text }}>分工後的答案，明顯更完整，也更可控</span>
          </div>

          <div style={{ ...outroStyle, marginTop: 26 * S, display: "flex", alignItems: "center", gap: 12 * S }}>
            <span style={{
              width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
              boxShadow: `0 0 ${8 * S}px ${C.primary}`,
            }} />
            <span style={{ fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 500, color: C.textSub }}>
              這裡是<span style={{ color: C.primary, fontWeight: 700 }}>每日 AI 知識庫</span>，我們明天見 👋
            </span>
          </div>
        </AbsoluteFill>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── ROOT COMPOSITION ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

export const VideoComposition_2026_06_08: React.FC = () => {
  const frame = useCurrentFrame();
  const Sx = SCENES_2026_06_08;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-06-08-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f, [TOTAL_FRAMES_2026_06_08 - 150, TOTAL_FRAMES_2026_06_08], [v, 0],
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
