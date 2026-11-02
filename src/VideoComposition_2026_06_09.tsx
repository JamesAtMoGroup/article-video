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
const F_HEAD = "'Syne','Noto Sans TC',sans-serif"; // headings / titles / big numbers / Latin
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
// Title:   0s        → 0      hook + 三種記憶 teaser
// Scene1:  30s       → 900    短期記憶 / 上下文視窗（工作桌面 + token 上限）
// Scene2:  88s       → 2640   長期記憶 / 跨對話個人檔案（ChatGPT 記憶）
// Scene3:  128s      → 3840   外掛記憶 / 隨身硬碟 + 三層 recap
// Scene4:  170s      → 5100   為什麼重要（三種因果）
// Scene5:  263s      → 7890   怎麼運用（三個行動）
// Summary: 347s      → 10410  重點整理 + 小練習
// End:     414.1s(audio) → 12450
export const SCENES_2026_06_09 = {
  title: { from: 0, to: 900 },
  scene1: { from: 900, to: 2640 },
  scene2: { from: 2640, to: 3840 },
  scene3: { from: 3840, to: 5100 },
  scene4: { from: 5100, to: 7890 },
  scene5: { from: 7890, to: 10410 },
  summary: { from: 10410, to: 12450 },
} as const;
export const TOTAL_FRAMES_2026_06_09 = 12450;

const CHAPTERS = [
  { label: "今日主題", start: 0 },
  { label: "短期記憶", start: 900 },
  { label: "長期記憶", start: 2640 },
  { label: "外掛記憶", start: 3840 },
  { label: "為什麼重要", start: 5100 },
  { label: "怎麼運用", start: 7890 },
  { label: "重點整理", start: 10410 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // 想一想 #1（02:31→02:50）三層比喻：桌上紙 / 抽屜檔案 / 借來的參考書
  { from: 4530, to: 5100, sender: "想一想", text: "短期是桌上的紙、長期是抽屜的檔案、外掛是借來的參考書——你現在要交代給 AI 的事，該放在哪一層？" },
  // 想一想 #2（04:14→04:23）這個貼心回答來自哪一種記憶
  { from: 7620, to: 7890, sender: "想一想", text: "當 AI 給你一個「記得你」的貼心回答時，你分得出來，那是來自哪一種記憶嗎？" },
  // 親身經歷（06:29→06:50）今天的小練習
  { from: 11670, to: 12300, sender: "親身經歷", text: "打開你常用的 AI 工具，找到記憶設定，看看它記住了你哪些事，刪掉不需要的——感受自己掌控 AI 記憶。" },
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

// dim → bright tied to a VTT cue (scene-local frame). NEVER pop-in.
function calcDim(activeAt: number, frame: number, dimOpacity = 0.28) {
  const af = Math.max(0, frame - activeAt);
  const t = interpolate(af, [0, 20], [dimOpacity, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  return { op: Math.max(dimOpacity, Math.min(1, t)), isOn: frame >= activeAt };
}
// dim → bright with a slight settle pop (for nodes / icons)
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
        fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color,
        letterSpacing: "0.2em", textTransform: "uppercase" as const,
      }}>{label}</span>
    </div>
  );
}

function StageSentence({ text, delay, color = C.text, fontSize = 26 * S }: {
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

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function MemoryChip({ icon, title, sub, accent, activeAt }: {
  icon: string; title: string; sub: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(activeAt, frame, 0.32);
  const sc = isOn ? easeOutBack(prog(Math.max(0, frame - activeAt), 22)) : 0.9;
  return (
    <div style={{
      width: 290 * S, opacity: op, transform: `scale(${Math.max(0.9, Math.min(1, sc))})`,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${24 * S}px ${20 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${accent}22` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 84 * S, height: 84 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42 * S,
        boxShadow: isOn ? `0 0 ${20 * S}px ${accent}55` : "none",
      }}>{icon}</div>
      <span style={{
        fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: isOn ? C.text : C.textSub,
        textAlign: "center", lineHeight: 1.25,
      }}>{title}</span>
      <span style={{
        fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500, color: isOn ? accent : C.muted,
        letterSpacing: "0.06em", textAlign: "center",
      }}>{sub}</span>
    </div>
  );
}

function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_09.title.to - SCENES_2026_06_09.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(36);
  const tagStyle = useFadeUp(52);
  const rowStyle = useFadeUp(120);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));
  // 三種記憶預告：「AI 其實有三種完全不一樣的記憶」27s → title-local 810
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
            opacity: eyebrowPulse, boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          }} />
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.2em", textTransform: "uppercase" as const,
          }}>每日 AI 知識庫</span>
        </div>

        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 46 * S, color: C.text,
        }}>
          <WordReveal text="AI 真的記得你嗎？" startFrame={10} staggerPerWord={6}
            fontSize={46 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary,
        }}>
          <WordReveal text="拆解短期、長期、外掛三種記憶" startFrame={28} staggerPerWord={5}
            fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 22 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          聊到一半突然忘記，卻又記得你上週的偏好——為什麼？
        </p>

        {/* three memory teaser chips — light up as narrator previews 三種記憶 */}
        <div style={{ ...rowStyle, marginTop: 40 * S, display: "flex", gap: 28 * S, justifyContent: "center" }}>
          <MemoryChip icon="🗒️" title="短期記憶" sub="上下文視窗" accent={C.primary} activeAt={810} />
          <MemoryChip icon="🗄️" title="長期記憶" sub="個人檔案" accent={C.orange} activeAt={840} />
          <MemoryChip icon="💾" title="外掛記憶" sub="外部資料" accent={C.blue} activeAt={870} />
        </div>

        <div style={{ ...tagStyle, marginTop: 30 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>上下文視窗 · 跨對話記憶 · 知識庫</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — 短期記憶 / 上下文視窗（工作桌面 + token 上限） ─────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: AI 的工作桌面，攤著對話內容
function DeskSurface({ paperAt }: { paperAt: number }) {
  const frame = useCurrentFrame();
  const papers = [
    { label: "你打的字", emoji: "✍️", accent: C.blue },
    { label: "AI 回的話", emoji: "🤖", accent: C.primary },
    { label: "前面的對話", emoji: "💬", accent: C.purple },
  ];
  return (
    <div style={{ position: "relative", width: 880 * S, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S }}>
      {/* label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10 * S,
        background: C.chipBg, border: `1px solid ${C.primaryBorder}`, borderRadius: 12 * S,
        padding: `${8 * S}px ${20 * S}px`,
      }}>
        <span style={{ fontSize: 26 * S }}>🗒️</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: C.primary }}>工作桌面 = 上下文視窗</span>
      </div>
      {/* desk surface with papers spread on it */}
      <div style={{
        position: "relative", width: 880 * S, height: 360 * S,
        background: "linear-gradient(180deg, #16161f 0%, #0e0e15 100%)",
        border: `1px solid ${C.surfaceBorder}`, borderRadius: 26 * S,
        boxShadow: `0 ${10 * S}px ${50 * S}px rgba(0,0,0,0.5), inset 0 ${2 * S}px ${20 * S}px rgba(124,255,178,0.05)`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 24 * S,
      }}>
        {papers.map((p, i) => {
          const a = calcDim(paperAt + i * 30, frame, 0.28);
          const rot = [-4, 2, -2][i];
          return (
            <div key={i} style={{
              opacity: a.op, width: 230 * S, height: 250 * S, transform: `rotate(${rot}deg)`,
              background: C.surface, border: `1px solid ${a.isOn ? p.accent + "55" : C.surfaceBorder}`,
              borderRadius: 16 * S, padding: `${20 * S}px`,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 * S,
              boxShadow: a.isOn ? `0 ${6 * S}px ${28 * S}px ${p.accent}1f` : "none",
            }}>
              <span style={{ fontSize: 50 * S }}>{p.emoji}</span>
              <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub }}>{p.label}</span>
              {/* paper text lines */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 * S, width: "70%", marginTop: 4 * S }}>
                <div style={{ height: 4 * S, borderRadius: 99, background: "rgba(240,240,245,0.18)" }} />
                <div style={{ height: 4 * S, borderRadius: 99, background: "rgba(240,240,245,0.12)", width: "80%" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Phase B hero: 桌面有上限 — token 比較 + 超出被擠出
function TokenStat({ label, value, unit, accent, brightAt, glow }: {
  label: string; value: string; unit: string; accent: string; brightAt: number; glow?: boolean;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(brightAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, minWidth: 330 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${18 * S}px ${30 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
      boxShadow: glow && isOn ? `0 0 ${50 * S}px ${accent}28` : "none",
    }}>
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: isOn ? accent : C.muted, fontWeight: 700, letterSpacing: "0.04em" }}>{label}</span>
      <div style={{
        fontFamily: F_HEAD, fontWeight: 800, fontSize: 50 * S, color: accent, lineHeight: 1,
        textShadow: isOn ? `0 0 ${24 * S}px ${accent}55` : "none",
      }}>{value}</div>
      <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.textSub }}>{unit}</span>
    </div>
  );
}

function TokenLimit({ claudeAt, geminiAt, overflowAt }: { claudeAt: number; geminiAt: number; overflowAt: number }) {
  const frame = useCurrentFrame();
  // earliest paper slides off the desk edge when overflow happens
  const ov = Math.max(0, frame - overflowAt);
  const slideX = interpolate(ov, [0, 26], [0, -180 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const fallOp = interpolate(ov, [0, 10, 26], [1, 1, 0], { extrapolateRight: "clamp" });
  const overflowOn = frame >= overflowAt;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * S }}>
      {/* token comparison */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 24 * S }}>
        <TokenStat label="Claude 全系列" value="20 萬" unit="tokens 標準上下文視窗" accent={C.primary} brightAt={claudeAt} />
        <TokenStat label="Gemini 2.5 Pro" value="100 萬" unit="tokens 可達" accent={C.blue} brightAt={geminiAt} glow />
      </div>
      {/* overflow desk strip */}
      <div style={{
        position: "relative", width: 880 * S, height: 150 * S,
        background: "linear-gradient(180deg, #16161f 0%, #0e0e15 100%)",
        border: `1px solid ${overflowOn ? C.redBorder : C.surfaceBorder}`, borderRadius: 20 * S,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 14 * S, overflow: "hidden",
      }}>
        {/* earliest paper being pushed off the left edge */}
        <div style={{
          position: "absolute", left: 30 * S, top: "50%",
          transform: `translateY(-50%) translateX(${slideX}px) rotate(-12deg)`, opacity: fallOp,
          width: 130 * S, height: 110 * S, borderRadius: 12 * S,
          background: C.redLight, border: `1px solid ${C.redBorder}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 * S,
        }}>
          <span style={{ fontSize: 30 * S }}>❓</span>
          <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.red, fontWeight: 700 }}>最早的話</span>
        </div>
        {/* remaining papers */}
        <div style={{ display: "flex", gap: 14 * S, marginLeft: 120 * S }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{
              width: 120 * S, height: 100 * S, borderRadius: 12 * S,
              background: C.surface, border: `1px solid ${C.surfaceBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 * S, opacity: 0.85,
            }}>📄</div>
          ))}
        </div>
        {/* overflow label */}
        <div style={{
          position: "absolute", right: 24 * S, top: "50%", transform: "translateY(-50%)",
          opacity: calcDim(overflowAt, frame, 0).op,
          display: "flex", alignItems: "center", gap: 10 * S,
          background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 12 * S,
          padding: `${8 * S}px ${16 * S}px`,
        }}>
          <span style={{ fontSize: 24 * S }}>⬅️</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.red }}>超出上限<br />被擠出桌面</span>
        </div>
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_09.scene1.to - SCENES_2026_06_09.scene1.from;
  // local = global - 900. Phase B 第一句「但桌面是有上限的」53s → g1590, local 690
  const A_FADE_START = 610;
  const A_REMOVE = 690;
  const B_SHOW_AT = 690;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g900 先講第一種短期記憶
  const DESK_AT = 180; // g1080 想成 AI 的工作桌面
  const CONTENT_AT = 480; // g1380 包含你打的字還有它回的話
  // Phase B captions (local)
  const CLAUDE_AT = 930; // g1830 是二十萬個 token
  const GEMINI_AT = 1080; // g1980 達到一百萬個 token
  const TOKEN_AT = 1140; // g2040 token 是計量單位
  const OVERFLOW_AT = 1500; // g2400 最早的話被擠出桌面

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="短期記憶 ／ CONTEXT WINDOW" delay={HEADER_AT} color={C.primary} />}
            sentence={
              frame >= CONTENT_AT
                ? <StageSentence text="桌上攤著你的字，和它的回話" delay={CONTENT_AT} color={C.primary} />
                : frame >= DESK_AT
                ? <StageSentence text="把它想成 AI 的工作桌面" delay={DESK_AT} color={C.text} />
                : <StageSentence text="短期記憶，叫做「上下文視窗」" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="桌面有多大，它一次就能攤開多少資料" delay={570} color={C.primary} />}
          >
            <DeskSurface paperAt={CONTENT_AT} />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="桌面有上限 ／ THE LIMIT" delay={B_SHOW_AT} color={C.orange} />}
          sentence={
            frame >= OVERFLOW_AT
              ? <StageSentence text="超過上限，最早的話被擠出桌面" delay={OVERFLOW_AT} color={C.orange} />
              : frame >= TOKEN_AT
              ? <StageSentence text="token 是 AI 處理文字的計量單位" delay={TOKEN_AT} color={C.text} />
              : <StageSentence text="但這張桌面，是有上限的" delay={B_SHOW_AT} color={C.orange} />
          }
          takeaway={<StageTakeaway text="這，就是它突然忘記開頭的真正原因" delay={1590} color={C.orange} />}
        >
          <TokenLimit claudeAt={CLAUDE_AT} geminiAt={GEMINI_AT} overflowAt={OVERFLOW_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 長期記憶 / 跨對話個人檔案（ChatGPT 記憶） ──────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function ProfileItem({ icon, label, activeAt }: { icon: string; label: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, display: "flex", alignItems: "center", gap: 10 * S,
      background: C.surface2, border: `1px solid ${isOn ? C.orangeBorder : C.surfaceBorder}`,
      borderRadius: 12 * S, padding: `${8 * S}px ${16 * S}px`,
    }}>
      <span style={{ fontSize: 24 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function PersistentProfile({ convAt, nameAt, projectAt, t1At, t2At }: {
  convAt: number; nameAt: number; projectAt: number; t1At: number; t2At: number;
}) {
  const frame = useCurrentFrame();
  const convs = ["全新對話 ①", "全新對話 ②", "全新對話 ③"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S, width: 1140 * S }}>
      {/* three fresh conversations, all reading the same profile */}
      <div style={{ display: "flex", gap: 18 * S, justifyContent: "center" }}>
        {convs.map((label, i) => {
          const a = calcDim(convAt + i * 20, frame, 0.28);
          return (
            <div key={i} style={{
              opacity: a.op, width: 300 * S,
              background: C.surface, border: `1px solid ${a.isOn ? C.primaryBorder : C.surfaceBorder}`,
              borderRadius: 16 * S, padding: `${12 * S}px ${18 * S}px`,
              display: "flex", alignItems: "center", gap: 10 * S,
            }}>
              <span style={{ fontSize: 26 * S }}>💬</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.text }}>{label}</span>
                <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.primary }}>↻ 它還記得你</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* arrows converging down to profile */}
      <span style={{ fontFamily: F_BODY, fontSize: 28 * S, color: C.muted }}>↓ 都讀同一份 ↓</span>
      {/* shared profile card */}
      <div style={{
        width: 760 * S,
        background: C.surface, border: `1px solid ${C.orangeBorder}`, borderRadius: 22 * S,
        padding: `${20 * S}px ${28 * S}px`, boxShadow: `0 0 ${50 * S}px rgba(255,159,67,0.1)`,
        display: "flex", alignItems: "center", gap: 24 * S,
      }}>
        <div style={{
          width: 90 * S, height: 90 * S, borderRadius: 20 * S, flexShrink: 0,
          background: C.orangeLight, border: `${2 * S}px solid ${C.orange}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 46 * S,
        }}>📇</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
          <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: C.text }}>你的個人檔案</span>
          <div style={{ display: "flex", gap: 12 * S, flexWrap: "wrap" as const }}>
            <ProfileItem icon="🙂" label="名字" activeAt={nameAt} />
            <ProfileItem icon="🍜" label="口味偏好" activeAt={nameAt} />
            <ProfileItem icon="📁" label="進行中的專案" activeAt={projectAt} />
          </div>
        </div>
      </div>
      {/* ChatGPT memory timeline */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16 * S,
        background: C.chipBg, border: `1px solid ${C.surfaceBorder}`, borderRadius: 16 * S,
        padding: `${10 * S}px ${22 * S}px`,
      }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 700, color: C.textSub }}>ChatGPT 記憶功能</span>
        <TimelineNode label="2024 / 04" text="推出儲存記憶" activeAt={t1At} frame={frame} />
        <span style={{ fontSize: 24 * S, color: C.muted }}>→</span>
        <TimelineNode label="2024 / 09" text="開放免費＋付費" activeAt={t2At} frame={frame} />
      </div>
    </div>
  );
}

function TimelineNode({ label, text, activeAt, frame }: { label: string; text: string; activeAt: number; frame: number }) {
  const { op, isOn } = calcDim(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * S,
      background: C.surface, border: `1px solid ${isOn ? C.orangeBorder : C.surfaceBorder}`,
      borderRadius: 12 * S, padding: `${8 * S}px ${18 * S}px`,
    }}>
      <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 800, color: isOn ? C.orange : C.muted }}>{label}</span>
      <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: isOn ? C.text : C.textSub }}>{text}</span>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_09.scene2.to - SCENES_2026_06_09.scene2.from;
  // local = global - 2640
  const HEADER_AT = 0; // g2640 第二種長期記憶
  const CROSS_AT = 270; // g2910 記在這段對話之外
  const CHATGPT_AT = 480; // g3120 ChatGPT 的記憶功能
  const T1_AT = 600; // g3240 二零二四年四月推出
  const T2_AT = 720; // g3360 同年九月開放
  const NAME_AT = 840; // g3480 記住名字口味
  const PROJECT_AT = 990; // g3630 正在進行的專案

  return (
    <SceneFade durationInFrames={dur}>
      <HeroFrame
        eyebrow={<StageEyebrow label="長期記憶 ／ PERSISTENT PROFILE" delay={HEADER_AT} color={C.orange} />}
        sentence={
          frame >= CHATGPT_AT
            ? <StageSentence text="代表是 ChatGPT 的記憶功能" delay={CHATGPT_AT} color={C.orange} />
            : frame >= CROSS_AT
            ? <StageSentence text="開一個全新對話，它還記得你" delay={CROSS_AT} color={C.text} />
            : <StageSentence text="長期記憶：跨對話的個人檔案" delay={HEADER_AT} color={C.text} />
        }
        takeaway={<StageTakeaway text="每一次新對話，都自帶對你的理解" delay={1050} color={C.orange} />}
      >
        <PersistentProfile convAt={CROSS_AT} nameAt={NAME_AT} projectAt={PROJECT_AT} t1At={T1_AT} t2At={T2_AT} />
      </HeroFrame>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 外掛記憶 / 隨身硬碟 + 三層 recap ──────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function ExternalDrive({ plugAt, docAt }: { plugAt: number; docAt: number }) {
  const frame = useCurrentFrame();
  const plug = calcActive(plugAt, frame, 0.3);
  const cableDraw = interpolate(Math.max(0, frame - plugAt), [0, 26], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const docs = [
    { icon: "📚", label: "知識庫" },
    { icon: "📄", label: "檔案上傳" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * S }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {/* AI brain */}
        <div style={{
          width: 200 * S, height: 200 * S, borderRadius: "50%",
          background: "rgba(124,255,178,0.1)", border: `${2 * S}px solid ${C.primary}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 * S,
          boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.25)`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 64 * S }}>🧠</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 700, color: C.primary }}>AI 本身</span>
        </div>
        {/* USB cable */}
        <div style={{ position: "relative", width: 200 * S, height: 14 * S, display: "flex", alignItems: "center" }}>
          <div style={{
            height: 8 * S, width: `${cableDraw * 100}%`, borderRadius: 99,
            background: `linear-gradient(90deg, ${C.primary}, ${C.blue})`,
            boxShadow: `0 0 ${12 * S}px ${C.blue}66`,
          }} />
          <span style={{
            position: "absolute", left: "50%", top: -34 * S, transform: "translateX(-50%)",
            fontFamily: F_BODY, fontSize: 18 * S, color: C.blue, letterSpacing: "0.08em", opacity: cableDraw,
          }}>掛上去</span>
        </div>
        {/* external drive */}
        <div style={{
          position: "relative", width: 240 * S, height: 200 * S, borderRadius: 24 * S, flexShrink: 0,
          opacity: plug.op,
          background: C.surface, border: `${2 * S}px solid ${plug.isOn ? C.blue : C.surfaceBorder}`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 * S,
          boxShadow: plug.isOn ? `0 0 ${36 * S}px ${C.blue}33` : "none",
        }}>
          {plug.isOn && <RippleRing activeAt={plugAt} color={C.blue} radius={24 * S} />}
          <span style={{ fontSize: 64 * S }}>💾</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: C.text }}>隨身硬碟</span>
          <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.blue }}>外接的外部資料</span>
        </div>
      </div>
      {/* documents mounting into the drive */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 * S }}>
        <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.muted }}>掛上你的：</span>
        {docs.map((d, i) => {
          const a = calcDim(docAt + i * 30, frame, 0.28);
          return (
            <div key={i} style={{
              opacity: a.op, display: "flex", alignItems: "center", gap: 10 * S,
              background: C.surface, border: `1px solid ${a.isOn ? C.blueBorder : C.surfaceBorder}`,
              borderRadius: 14 * S, padding: `${10 * S}px ${20 * S}px`,
            }}>
              <span style={{ fontSize: 28 * S }}>{d.icon}</span>
              <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub }}>{d.label}</span>
            </div>
          );
        })}
        <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.muted }}>→ 回答時去翻查</span>
      </div>
    </div>
  );
}

// Phase B hero: 三層記憶 recap
function StackTier({ icon, name, sub, note, accent, activeAt }: {
  icon: string; name: string; sub: string; note: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.28);
  return (
    <div style={{
      opacity: op, width: 920 * S, position: "relative",
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 18 * S, padding: `${16 * S}px ${26 * S}px`,
      display: "flex", alignItems: "center", gap: 22 * S,
      boxShadow: isOn ? `0 0 ${30 * S}px ${accent}1f` : "none",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={18 * S} />}
      <div style={{
        width: 72 * S, height: 72 * S, borderRadius: 16 * S, flexShrink: 0,
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 * S,
      }}>{icon}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 * S, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 * S }}>
          <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{name}</span>
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500, color: accent, letterSpacing: "0.04em" }}>{sub}</span>
        </div>
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub }}>{note}</span>
      </div>
    </div>
  );
}

function MemoryStack({ t1At, t2At, t3At }: { t1At: number; t2At: number; t3At: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S }}>
      <StackTier icon="🗒️" name="短期記憶" sub="桌上的紙" note="這一段對話當下、能同時攤開的內容" accent={C.primary} activeAt={t1At} />
      <StackTier icon="🗄️" name="長期記憶" sub="抽屜的個人檔案" note="跨對話記住你的偏好、身分、習慣" accent={C.orange} activeAt={t2At} />
      <StackTier icon="💾" name="外掛記憶" sub="借來的參考書" note="臨時接上的外部文件，回答時去翻查" accent={C.blue} activeAt={t3At} />
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_09.scene3.to - SCENES_2026_06_09.scene3.from;
  // local = global - 3840. Phase B 第一句「這裡先想一想」02:31 → g4530, local 690
  const A_FADE_START = 610;
  const A_REMOVE = 690;
  const B_SHOW_AT = 690;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const HEADER_AT = 0; // g3840 第三種外掛記憶
  const NOTKNOW_AT = 150; // g3990 AI 不知道你公司內部文件
  const ATTACH_AT = 240; // g4080 把文件掛上去
  const PLUG_AT = 300; // g4140 讓它回答時去翻查
  const DOC_AT = 390; // g4230 知識庫 / 檔案上傳

  // Phase B captions (local)
  const T1_AT = 700; // g4590 桌上的紙（短期）
  const T2_AT = 870; // g4710 抽屜的檔案（長期）
  const T3_AT = 960; // g4800 借來的參考書（外掛）
  const WHICH_AT = 1140; // g4980 該放在哪一層

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="外掛記憶 ／ EXTERNAL MEMORY" delay={HEADER_AT} color={C.blue} />}
            sentence={
              frame >= ATTACH_AT
                ? <StageSentence text="把文件掛上去，回答時去翻查" delay={ATTACH_AT} color={C.blue} />
                : frame >= NOTKNOW_AT
                ? <StageSentence text="AI 不知道你公司的內部文件" delay={NOTKNOW_AT} color={C.text} />
                : <StageSentence text="外掛記憶：臨時接上的外部資料" delay={HEADER_AT} color={C.text} />
            }
            takeaway={<StageTakeaway text="等於幫 AI 外接了一顆隨身硬碟" delay={540} color={C.blue} />}
          >
            <ExternalDrive plugAt={PLUG_AT} docAt={DOC_AT} />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="三層記憶 ／ THE STACK" delay={B_SHOW_AT} color={C.primary} />}
          sentence={
            frame >= WHICH_AT
              ? <StageSentence text="你要交代的事，該放哪一層？" delay={WHICH_AT} color={C.primary} />
              : <StageSentence text="三種記憶，其實是三個位置" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="放對位置，AI 才能在對的時候，想起對的事" delay={T1_AT} color={C.primary} />}
        >
          <MemoryStack t1At={T1_AT} t2At={T2_AT} t3At={T3_AT} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 4 — 為什麼重要（三種因果） ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function ReasonCard({ fromIcon, toIcon, title, cause, accent, detail, activeAt, detailAt }: {
  fromIcon: string; toIcon: string; title: string; cause: string; accent: string;
  detail: string; activeAt: number; detailAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.28);
  const d = calcDim(detailAt, frame, 0.28);
  return (
    <div style={{
      opacity: op, width: 366 * S, position: "relative", alignSelf: "stretch",
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${24 * S}px ${24 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
      boxShadow: isOn ? `0 0 ${36 * S}px ${accent}1f` : "none",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      {/* icon transform */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
        <span style={{ fontSize: 48 * S }}>{fromIcon}</span>
        <span style={{ fontFamily: F_BODY, fontSize: 30 * S, color: accent }}>→</span>
        <span style={{ fontSize: 48 * S }}>{toIcon}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 700, color: isOn ? C.text : C.textSub, textAlign: "center" }}>{title}</span>
        <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: accent, textAlign: "center" }}>{cause}</span>
      </div>
      {/* detail line */}
      <div style={{
        opacity: d.op, width: "100%", marginTop: 2 * S,
        background: C.surface2, border: `1px solid ${C.surfaceBorder}`, borderRadius: 12 * S,
        padding: `${10 * S}px ${16 * S}px`,
      }}>
        <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, lineHeight: 1.45, textAlign: "center", display: "block" }}>{detail}</span>
      </div>
    </div>
  );
}

function Scene4() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_09.scene4.to - SCENES_2026_06_09.scene4.from;
  // local = global - 5100
  const HEADER_AT = 0; // g5100 為什麼這麼重要
  const FAIL_AT = 150; // g5250 放錯地方會失憶或越界
  const R1_AT = 210; // g5310 第一短期有上限
  const R1D_AT = 690; // g5790 真的看不到不是敷衍
  const R2_AT = 990; // g6090 第二長期會累積
  const R2D_AT = 1620; // g6720 方便跟隱私一體兩面
  const R3_AT = 1920; // g7020 第三外掛
  const R3D_AT = 2040; // g7140 私有資料一無所知

  return (
    <SceneFade durationInFrames={dur}>
      <HeroFrame
        eyebrow={<StageEyebrow label="為什麼重要 ／ WHY IT MATTERS" delay={HEADER_AT} color={C.red} />}
        sentence={
          frame >= R3_AT
            ? <StageSentence text="外掛，決定它懂不懂你的世界" delay={R3_AT} color={C.blue} />
            : frame >= R2_AT
            ? <StageSentence text="長期會累積——隱私成了新課題" delay={R2_AT} color={C.orange} />
            : frame >= R1_AT
            ? <StageSentence text="短期有上限——所以它會忘" delay={R1_AT} color={C.primary} />
            : <StageSentence text="放錯地方，AI 會失憶或越界" delay={HEADER_AT} color={C.red} />
        }
        takeaway={<StageTakeaway text="三種記憶各有上限與風險，放錯層就會出問題" delay={FAIL_AT} color={C.red} />}
      >
        <div style={{ display: "flex", gap: 24 * S, justifyContent: "center", alignItems: "stretch" }}>
          <ReasonCard fromIcon="🗒️" toIcon="❓" title="短期有上限" cause="所以它會忘" accent={C.primary}
            detail="貼超長文件、聊太久 → 被擠掉。它不是敷衍，是真的看不到。" activeAt={R1_AT} detailAt={R1D_AT} />
          <ReasonCard fromIcon="🗄️" toIcon="🔐" title="長期會累積" cause="所以隱私成課題" accent={C.orange}
            detail="平台持續記住你說過的事——方便跟隱私，往往是一體兩面。" activeAt={R2_AT} detailAt={R2D_AT} />
          <ReasonCard fromIcon="💾" toIcon="🌍" title="外掛決定" cause="它懂不懂你" accent={C.blue}
            detail="通用 AI 對你的私有資料一無所知，關鍵在你掛了對的文件。" activeAt={R3_AT} detailAt={R3D_AT} />
        </div>
      </HeroFrame>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 5 — 怎麼運用（三個行動） ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function ActionCard({ index, icon, title, accent, detail, activeAt, detailAt }: {
  index: string; icon: string; title: string; accent: string;
  detail: string; activeAt: number; detailAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.28);
  const d = calcDim(detailAt, frame, 0.28);
  return (
    <div style={{
      opacity: op, width: 366 * S, position: "relative", alignSelf: "stretch",
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${24 * S}px ${24 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      boxShadow: isOn ? `0 0 ${36 * S}px ${accent}1f` : "none",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        width: 84 * S, height: 84 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42 * S,
      }}>{icon}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 * S }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color: accent }}>{index}</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{title}</span>
      </div>
      <div style={{
        opacity: d.op, width: "100%",
        background: C.surface2, border: `1px solid ${C.surfaceBorder}`, borderRadius: 12 * S,
        padding: `${10 * S}px ${16 * S}px`,
      }}>
        <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, lineHeight: 1.45, textAlign: "center", display: "block" }}>{detail}</span>
      </div>
    </div>
  );
}

function Scene5() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_09.scene5.to - SCENES_2026_06_09.scene5.from;
  // local = global - 7890
  const HEADER_AT = 0; // g7890 對你有什麼用
  const ORGANIZE_AT = 120; // g8010 就像整理收納
  const A1_AT = 270; // g8160 第一重貼短期
  const A1D_AT = 750; // g8640 與其賭它記不記得
  const A2_AT = 930; // g8820 第二檢視整理長期
  const A2D_AT = 1380; // g9270 敏感事用臨時對話
  const A3_AT = 1710; // g9600 第三善用外掛
  const A3D_AT = 2010; // g9900 大批文件硬塞會超出

  return (
    <SceneFade durationInFrames={dur}>
      <HeroFrame
        eyebrow={<StageEyebrow label="怎麼運用 ／ HOW TO USE" delay={HEADER_AT} color={C.primary} />}
        sentence={
          frame >= A3_AT
            ? <StageSentence text="善用外掛，處理大量私有資料" delay={A3_AT} color={C.blue} />
            : frame >= A2_AT
            ? <StageSentence text="定期檢視、整理你的長期記憶" delay={A2_AT} color={C.orange} />
            : frame >= A1_AT
            ? <StageSentence text="重要的話，主動重貼進短期" delay={A1_AT} color={C.primary} />
            : <StageSentence text="像整理收納，把資訊放對位置" delay={HEADER_AT} color={C.text} />
        }
        takeaway={<StageTakeaway text="放對位置，既不怕超出視窗，答案也更貼著你的資料" delay={A1_AT} color={C.primary} />}
      >
        <div style={{ display: "flex", gap: 24 * S, justifyContent: "center", alignItems: "stretch" }}>
          <ActionCard index="01" icon="🗒️" title="重貼短期" accent={C.primary}
            detail="長對話到一半，別賭它記得開頭——直接把關鍵再貼一次，或做個總結。" activeAt={A1_AT} detailAt={A1D_AT} />
          <ActionCard index="02" icon="🗄️" title="整理長期" accent={C.orange}
            detail="到設定裡看它記住了什麼，刪掉過時的；敏感事用臨時對話、不儲存模式。" activeAt={A2_AT} detailAt={A2D_AT} />
          <ActionCard index="03" icon="💾" title="善用外掛" accent={C.blue}
            detail="長報告、整批文件別硬塞進對話——用檔案上傳、知識庫讓 AI 去翻查。" activeAt={A3_AT} detailAt={A3D_AT} />
        </div>
      </HeroFrame>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SUMMARY SCENE ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function RecapCard({ index, icon, title, sub, body, accent, activeAt }: {
  index: string; icon: string; title: string; sub: string; body: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcDim(activeAt, frame, 0.28);
  return (
    <div style={{
      width: 1080 * S, opacity: op, position: "relative",
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${18 * S}px ${26 * S}px`,
      display: "flex", alignItems: "center", gap: 22 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${accent}1f` : "none",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={20 * S} />}
      <div style={{
        width: 76 * S, height: 76 * S, borderRadius: "50%", flexShrink: 0,
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 * S,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 * S, marginBottom: 4 * S }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 22 * S, color: accent }}>{index}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 24 * S, color: isOn ? C.text : C.textSub }}>{title}</span>
          <span style={{ fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: accent, letterSpacing: "0.04em" }}>{sub}</span>
        </div>
        <div style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, lineHeight: 1.45 }}>{body}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_09.summary.to - SCENES_2026_06_09.summary.from;
  // local = global - 10410
  const BADGE_AT = 0; // g10410 今日重點整理
  const CARD1_AT = 180; // g10590 短期是上下文視窗
  const CARD2_AT = 270; // g10680 長期是個人檔案
  const CARD3_AT = 390; // g10800 外掛是外部文件
  const PRACTICE_AT = 1170; // g11580 最後一個小練習
  const OUTRO_AT = 1770; // g12180 這裡是每日 AI 知識庫

  const badgeStyle = useFadeIn(BADGE_AT);
  const headStyle = useFadeUp(14);
  const practice = calcDim(PRACTICE_AT, frame, 0.28);
  const outroStyle = useFadeIn(OUTRO_AT);
  const eyebrowPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((frame / 30) * Math.PI));

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        paddingTop: CONTENT_TOP + 14 * S, paddingBottom: SUBTITLE_SAFE,
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
          ...headStyle, margin: `${10 * S}px 0 ${24 * S}px`,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 34 * S, color: C.text, textAlign: "center",
        }}>AI 的三種記憶</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 * S }}>
          <RecapCard index="01" icon="🗒️" title="短期記憶" sub="上下文視窗" accent={C.primary} activeAt={CARD1_AT}
            body="對話當下能攤開的桌面，有上限——一旦超出，最早講的話就被擠掉、它就會忘。" />
          <RecapCard index="02" icon="🗄️" title="長期記憶" sub="個人檔案" accent={C.orange} activeAt={CARD2_AT}
            body="跨對話記住你，很方便；但會累積，方便與隱私一體兩面，要主動檢視、刪除。" />
          <RecapCard index="03" icon="💾" title="外掛記憶" sub="外部文件" accent={C.blue} activeAt={CARD3_AT}
            body="臨時接上的資料，決定它懂不懂你的世界——把對的文件掛上去，答案才貼著你。" />
        </div>

        {/* today's practice */}
        <div style={{
          opacity: practice.op, marginTop: 22 * S, width: 1080 * S,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 18 * S,
          padding: `${14 * S}px ${26 * S}px`, display: "flex", alignItems: "center", gap: 16 * S,
          boxShadow: `0 0 ${50 * S}px ${C.primaryGlow}`,
        }}>
          <span style={{ fontSize: 34 * S }}>🛠️</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.text, lineHeight: 1.45 }}>
            今天的小練習：打開常用的 AI 工具，到記憶設定看看它記住了你哪些事，刪掉不需要的。
          </span>
        </div>

        <div style={{ ...outroStyle, marginTop: 22 * S, display: "flex", alignItems: "center", gap: 12 * S }}>
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

export const VideoComposition_2026_06_09: React.FC = () => {
  const frame = useCurrentFrame();
  const Sx = SCENES_2026_06_09;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-06-09-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f, [TOTAL_FRAMES_2026_06_09 - 150, TOTAL_FRAMES_2026_06_09], [v, 0],
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
      <Sequence from={Sx.scene5.from} durationInFrames={Sx.scene5.to - Sx.scene5.from}>
        <Scene5 />
      </Sequence>
      <Sequence from={Sx.summary.from} durationInFrames={Sx.summary.to - Sx.summary.from}>
        <SummaryScene />
      </Sequence>

      <ProgressBar globalFrame={frame} />
      <IMessageOverlay globalFrame={frame} />
    </AbsoluteFill>
  );
};
