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

// 🚨 字型載入鐵律 (06-16 案)：必 delayRender + waitUntilDone，否則 CJK 標點每 frame 飄
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
// Title:   0s        → 0      hook + MCP 命名 (Model Context Protocol)
// Scene1:  37s       → 1110   什麼是 MCP：孤立大腦長出手腳 + USB 統一規格
// Scene2:  123s      → 3690   為什麼火紅：Anthropic 起源/採用 + 三個原因
// Scene3:  222s      → 6660   對使用者的意義：實際能力 + 隱私提醒
// Summary: 311s      → 9330   重點整理
// End:     341s(VTT) → 10230  (+20 buffer → 10250)
export const SCENES_2026_04_13 = {
  title: { from: 0, to: 1110 },
  scene1: { from: 1110, to: 3690 },
  scene2: { from: 3690, to: 6660 },
  scene3: { from: 6660, to: 9330 },
  summary: { from: 9330, to: 10250 },
} as const;
export const TOTAL_FRAMES_2026_04_13 = 10250;

const CHAPTERS = [
  { label: "今日主題", start: 0 },
  { label: "什麼是 MCP", start: 1110 },
  { label: "為什麼火紅", start: 3690 },
  { label: "對你的意義", start: 6660 },
  { label: "重點整理", start: 9330 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // Scene1 結尾 想一想 (1:50–2:03)
  { from: 3300, to: 3690, sender: "想一想", text: "你現在使用的 AI 工具，有沒有哪些事『它懂、卻做不到』？那可能就是它還沒連上對的 MCP。" },
  // Scene2 結尾 想一想 (3:32–3:42)
  { from: 6360, to: 6660, sender: "想一想", text: "如果你是開發者，有了 MCP 這套標準，你會最想讓 AI 連接哪些工具？" },
  // Scene3 結尾 想一想 (4:59–5:11)
  { from: 8970, to: 9330, sender: "想一想", text: "如果有一個 MCP 能讓 AI 讀取你所有的 Gmail，你願意開啟嗎？你的判斷標準又是什麼？" },
];

// ── Easing tokens ──────────────────────────────────────────────────────────
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

// dim → bright tied to a VTT cue (scene-local frame). 永不 pop-in。
function calcActive(activeAt: number, frame: number, dim = 0.28) {
  const dimF = Math.max(0, frame - activeAt);
  const t = interpolate(dimF, [0, 20], [dim, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
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
          <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500, color: C.text, letterSpacing: "0.02em" }}>
            每日 AI <span style={{ color: C.primary, fontWeight: 700 }}>知識庫</span>
          </span>
          <span style={{
            fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 500,
            color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase" as const,
          }}>{current.label}</span>
        </div>
        <div style={{ height: 3 * S, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginTop: 6 * S }}>
          <div style={{
            height: "100%", width: `${progress * 100}%`, background: C.primary, borderRadius: 99,
            boxShadow: `0 0 ${8 * S}px ${C.primary}88`,
          }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── iMessage Callout system ────────────────────────────────────────────────
function IMessageCard({ c, globalFrame, allCallouts }: { c: Callout; globalFrame: number; allCallouts: Callout[] }) {
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
  const cursor = charsVisible < c.text.length ? "▋" : ""; // 靜態游標，無 blink

  return (
    <div style={{
      position: "absolute", top: NAV_H + NOTIF_TOP + totalYPush, right: NOTIF_RIGHT,
      width: NOTIF_W, transform: `translateY(${slideY}px)`,
      opacity: opacity * depthAlpha, pointerEvents: "none", zIndex: 100,
    }}>
      <div style={{
        background: "rgba(17,17,24,0.92)", backdropFilter: "blur(48px)", WebkitBackdropFilter: "blur(48px)",
        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18 * S,
        boxShadow: `0 ${8 * S}px ${40 * S}px rgba(0,0,0,0.6)`,
        padding: `${12 * S}px ${16 * S}px`, display: "flex", gap: 12 * S, alignItems: "flex-start",
      }}>
        <div style={{
          width: 44 * S, height: 44 * S, borderRadius: 12 * S,
          background: "linear-gradient(145deg, rgba(124,255,178,0.22) 0%, rgba(124,255,178,0.08) 100%)",
          border: `1px solid ${C.primaryBorder}`, boxShadow: `0 ${2 * S}px ${10 * S}px rgba(124,255,178,0.18)`,
          flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 * S,
        }}>💬</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 * S }}>
            <span style={{ fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.primary, letterSpacing: "0.02em" }}>{c.sender}</span>
            <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>now</span>
          </div>
          <div style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.textSub, lineHeight: 1.5 }}>{displayText}{cursor}</div>
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

// ── RippleRing (one-shot, tied to activeAt) ────────────────────────────────
function RippleRing({ activeAt, color, radius = "50%" }: { activeAt: number; color: string; radius?: number | string }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - activeAt);
  if (f > 30) return null;
  const scale = interpolate(f, [0, 26], [0.85, 1.9], { easing: E.outExpo, extrapolateRight: "clamp" });
  const opacity = interpolate(f, [0, 4, 26, 30], [0, 0.5, 0.18, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{
      position: "absolute", inset: 0, border: `${2 * S}px solid ${color}`, borderRadius: radius,
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
      <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: color, boxShadow: `0 0 ${8 * S}px ${color}`, flexShrink: 0 }} />
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
      ...a, textAlign: "center", fontFamily: F_HEAD, fontWeight: 700, lineHeight: 1.35,
      maxWidth: 620 * S, margin: "0 auto", fontSize, color, wordBreak: "break-word" as const,
    }}>{text}</div>
  );
}

function StageTakeaway({ text, delay, color = C.primary }: { text: string; delay: number; color?: string }) {
  const a = useFadeUp(delay);
  return (
    <div style={{
      ...a, textAlign: "center", margin: "0 auto",
      fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 500, color: C.text, lineHeight: 1.45, maxWidth: 1180 * S,
      background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 20 * S,
      padding: `${16 * S}px ${30 * S}px`, boxShadow: `0 0 ${60 * S}px ${C.primaryGlow}`,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 12 * S,
    }}>
      <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: color, boxShadow: `0 0 ${8 * S}px ${color}`, flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  );
}

function HeroFrame({ eyebrow, sentence, takeaway, children }: {
  eyebrow: React.ReactNode; sentence: React.ReactNode; takeaway: React.ReactNode; children: React.ReactNode;
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
// ── RadialHub — AI core in center, tool nodes around, MCP lines draw outward ──
// ═══════════════════════════════════════════════════════════════════════════
type HubTool = { icon: string; label: string; angle: number; at: number; color: string };
function RadialHub({ size, centerIcon, centerLabel, centerColor, centerAt, tools, dimNodes = 0.3 }: {
  size: number; centerIcon: string; centerLabel: string; centerColor: string;
  centerAt: number; tools: HubTool[]; dimNodes?: number;
}) {
  const frame = useCurrentFrame();
  const BOX = size;
  const cx = BOX / 2;
  const cy = BOX / 2;
  const R = BOX * 0.37;
  const NODE = BOX * 0.2;
  const CORE = BOX * 0.3;
  const center = calcActive(centerAt, frame, 0.4);
  const centerScale = easeOutBack(prog(Math.max(0, frame - centerAt), 22));

  return (
    <div style={{ position: "relative", width: BOX, height: BOX }}>
      {/* connection lines (draw outward from core) */}
      <svg width={BOX} height={BOX} style={{ position: "absolute", inset: 0, zIndex: 1, overflow: "visible" }}>
        {tools.map((t, i) => {
          const rad = (t.angle * Math.PI) / 180;
          const nx = cx + Math.cos(rad) * R;
          const ny = cy + Math.sin(rad) * R;
          const p = interpolate(Math.max(0, frame - t.at), [0, 24], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const x2 = cx + (nx - cx) * p;
          const y2 = cy + (ny - cy) * p;
          return (
            <line key={i} x1={cx} y1={cy} x2={x2} y2={y2}
              stroke={C.primary} strokeWidth={3 * S} strokeLinecap="round"
              strokeDasharray={`${10 * S} ${9 * S}`} opacity={0.7 * p} />
          );
        })}
      </svg>

      {/* tool nodes */}
      {tools.map((t, i) => {
        const rad = (t.angle * Math.PI) / 180;
        const x = cx + Math.cos(rad) * R;
        const y = cy + Math.sin(rad) * R;
        const a = calcActive(t.at, frame, dimNodes);
        const sc = easeOutBack(prog(Math.max(0, frame - t.at), 22));
        const below = Math.sin(rad) > 0.2;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", zIndex: 5 }}>
            <div style={{
              position: "relative", width: NODE, height: NODE,
              transform: `scale(${Math.max(0.7, a.isOn ? sc : 0.85)})`, opacity: a.op,
              borderRadius: "50%", background: C.surface,
              border: `${2 * S}px solid ${a.isOn ? t.color : C.surfaceBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: NODE * 0.42,
              boxShadow: a.isOn ? `0 0 ${24 * S}px ${t.color}55` : "none",
            }}>
              {t.icon}
              {a.isOn && <RippleRing activeAt={t.at} color={t.color} />}
            </div>
            <div style={{
              position: "absolute", left: "50%", top: below ? NODE + 8 * S : -10 * S,
              transform: `translate(-50%, ${below ? "0" : "-100%"})`, opacity: a.op,
              background: C.chipBg, border: `1px solid ${C.chipBorder}`, borderRadius: 8 * S,
              padding: `${4 * S}px ${12 * S}px`, whiteSpace: "nowrap" as const,
              fontFamily: F_TC, fontSize: 18 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub,
            }}>{t.label}</div>
          </div>
        );
      })}

      {/* center core */}
      <div style={{
        position: "absolute", left: cx, top: cy,
        transform: `translate(-50%,-50%) scale(${Math.max(0.75, center.isOn ? centerScale : 0.85)})`,
        width: CORE, height: CORE, borderRadius: "50%", zIndex: 6,
        background: C.surface, border: `${2 * S}px solid ${centerColor}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 * S,
        opacity: center.op, boxShadow: `0 0 ${36 * S}px ${centerColor}40`,
      }}>
        <span style={{ fontSize: CORE * 0.32 }}>{centerIcon}</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 800, color: centerColor, letterSpacing: "0.04em" }}>{centerLabel}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function TitleScene() {
  const dur = SCENES_2026_04_13.title.to - SCENES_2026_04_13.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(34);
  const hubStyle = useFadeUp(80);
  const tagStyle = useFadeUp(220);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        paddingTop: CONTENT_TOP, paddingBottom: SUBTITLE_SAFE, paddingLeft: 80 * S, paddingRight: 80 * S,
        textAlign: "center", zIndex: 5,
      }}>
        <div style={{ ...badgeOp, marginBottom: 14 * S, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S }}>
          <span style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary, boxShadow: `0 0 ${8 * S}px ${C.primary}` }} />
          <span style={{ fontFamily: F_BODY, fontWeight: 500, fontSize: 20 * S, color: C.primary, letterSpacing: "0.2em", textTransform: "uppercase" as const }}>每日 AI 知識庫</span>
        </div>

        <h1 style={{ margin: 0, lineHeight: 1.15, fontFamily: F_HEAD, fontWeight: 800, fontSize: 46 * S, color: C.text }}>
          <WordReveal text="什麼是 MCP？" startFrame={10} staggerPerWord={6} fontSize={46 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>
        <h1 style={{ margin: 0, lineHeight: 1.2, marginTop: 6 * S, fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary }}>
          <WordReveal text="為什麼最近大家都在講" startFrame={28} staggerPerWord={6} fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{ ...subtitleStyle, marginTop: 16 * S, fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6 }}>
          Model Context Protocol — 讓 AI 連上外部世界的標準
        </p>

        {/* central hub teaser — the core MCP metaphor */}
        <div style={{ ...hubStyle, marginTop: 26 * S }}>
          <RadialHub size={300 * S} centerIcon="🔌" centerLabel="MCP" centerColor={C.primary} centerAt={90}
            tools={[
              { icon: "📁", label: "本地檔案", angle: 215, at: 220, color: C.primary },
              { icon: "📅", label: "行事曆", angle: 325, at: 320, color: C.primary },
              { icon: "🌐", label: "瀏覽器", angle: 35, at: 430, color: C.primary },
              { icon: "🗄️", label: "資料庫", angle: 145, at: 560, color: C.primary },
            ]} />
        </div>

        <div style={{ ...tagStyle, marginTop: 40 * S }}>
          <span style={{ fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em" }}>MCP · 開放標準 · AI Agent · USB 比喻</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — 什麼是 MCP ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: isolated brain → grows hands (tools connect via MCP)
function IsolatedBrain({ connectAt }: { connectAt: number }) {
  const frame = useCurrentFrame();
  const connected = frame >= connectAt;
  const noHands = calcActive(0, frame, 0); // present from start
  const noHandsFade = interpolate(Math.max(0, frame - connectAt), [0, 18], [1, 0], clamp);
  const connLabel = calcActive(connectAt, frame, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S }}>
      <RadialHub size={300 * S} centerIcon="🧠" centerLabel="AI 模型" centerColor={connected ? C.primary : C.muted} centerAt={0}
        dimNodes={0.22}
        tools={[
          { icon: "📁", label: "本地檔案", angle: 215, at: connectAt, color: C.primary },
          { icon: "📝", label: "Notion", angle: 325, at: connectAt + 12, color: C.primary },
          { icon: "🌐", label: "瀏覽器", angle: 35, at: connectAt + 24, color: C.primary },
          { icon: "🗄️", label: "資料庫", angle: 145, at: connectAt + 36, color: C.primary },
        ]} />
      {/* status pill: 沒有手腳 → MCP 連上了 */}
      <div style={{ position: "relative", height: 60 * S, width: 560 * S, display: "flex", justifyContent: "center" }}>
        <div style={{
          position: "absolute", opacity: noHands.op * noHandsFade,
          display: "flex", alignItems: "center", gap: 10 * S,
          background: C.surface, border: `1px solid ${C.redBorder}`, borderRadius: 14 * S, padding: `${10 * S}px ${22 * S}px`,
        }}>
          <span style={{ fontSize: 26 * S }}>🚫</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.red }}>沒有手、沒有眼睛——碰不到外面的世界</span>
        </div>
        <div style={{
          position: "absolute", opacity: connLabel.op,
          display: "flex", alignItems: "center", gap: 10 * S,
          background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 14 * S, padding: `${10 * S}px ${22 * S}px`,
        }}>
          <span style={{ fontSize: 26 * S }}>🤚</span>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.primary }}>MCP 幫 AI 長出手腳，連上各種工具</span>
        </div>
      </div>
    </div>
  );
}

// Phase B hero: USB unification — before mismatched, after one standard + capabilities
function ConnectorCard({ icon, label, plugColor, ok, activeAt }: {
  icon: string; label: string; plugColor: string; ok: boolean; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, width: 200 * S,
      background: ok ? C.surface : C.surface, border: `1px solid ${isOn ? (ok ? C.primaryBorder : C.redBorder) : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${12 * S}px ${14 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
      boxShadow: isOn && ok ? `0 0 ${24 * S}px ${C.primaryGlow}` : "none",
    }}>
      <span style={{ fontSize: 30 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
      <span style={{
        fontFamily: F_BODY, fontSize: 17 * S, fontWeight: 700, color: ok ? C.primary : C.red,
        display: "flex", alignItems: "center", gap: 6 * S,
      }}>
        <span style={{ fontSize: 18 * S }}>{ok ? "✓" : "✕"}</span>{ok ? "同一種接頭" : "各做各的接頭"}
      </span>
    </div>
  );
}

function USBUnify({ capAt, beforeAt, afterAt }: { capAt: number; beforeAt: number; afterAt: number }) {
  const frame = useCurrentFrame();
  const arrowOp = interpolate(Math.max(0, frame - afterAt), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const caps = [
    { icon: "📁", label: "讀本地資料夾" },
    { icon: "🔍", label: "搜尋 Notion" },
    { icon: "🌐", label: "操作瀏覽器" },
    { icon: "🗄️", label: "查詢資料庫" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S }}>
      {/* capability chips */}
      <div style={{ display: "flex", gap: 14 * S, justifyContent: "center" }}>
        {caps.map((cap, i) => {
          const a = calcActive(capAt, frame, 0.3);
          return (
            <div key={i} style={{
              opacity: a.op, display: "flex", alignItems: "center", gap: 10 * S,
              background: C.surface, border: `1px solid ${a.isOn ? C.primaryBorder : C.surfaceBorder}`,
              borderRadius: 12 * S, padding: `${9 * S}px ${16 * S}px`,
            }}>
              <span style={{ fontSize: 24 * S }}>{cap.icon}</span>
              <span style={{ fontFamily: F_TC, fontSize: 19 * S, fontWeight: 700, color: a.isOn ? C.text : C.textSub }}>{cap.label}</span>
            </div>
          );
        })}
      </div>

      {/* before: mismatched connectors */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S }}>
        <span style={{
          opacity: calcActive(beforeAt, frame, 0.35).op,
          fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: C.red, letterSpacing: "0.1em", textTransform: "uppercase" as const,
        }}>以前 · 每個工具自己一套</span>
        <div style={{ display: "flex", gap: 16 * S }}>
          <ConnectorCard icon="🔌" label="工具 A" plugColor={C.red} ok={false} activeAt={beforeAt} />
          <ConnectorCard icon="🔌" label="工具 B" plugColor={C.orange} ok={false} activeAt={beforeAt + 8} />
          <ConnectorCard icon="🔌" label="工具 C" plugColor={C.blue} ok={false} activeAt={beforeAt + 16} />
        </div>
      </div>

      {/* arrow */}
      <span style={{ fontSize: 34 * S, color: C.primary, opacity: arrowOp }}>↓</span>

      {/* after: one MCP / USB standard */}
      <div style={{
        opacity: calcActive(afterAt, frame, 0.3).op,
        display: "flex", alignItems: "center", gap: 16 * S,
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 18 * S,
        padding: `${14 * S}px ${28 * S}px`, boxShadow: `0 0 ${40 * S}px ${C.primaryGlow}`,
      }}>
        <span style={{ fontSize: 34 * S }}>🔌</span>
        <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color: C.primary }}>MCP</span>
        <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: C.text }}>就像 USB——統一規格，所有東西都能插在一起</span>
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_13.scene1.to - SCENES_2026_04_13.scene1.from;
  // local = global - 1110
  const A_FADE_START = 700;
  const A_REMOVE = 780;
  const B_SHOW_AT = 780;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const A_HEADER = 0;   // g1110 你有沒有想過為什麼 AI 很聰明卻做不到
  const A_ISO = 330;    // g1440 像大腦沒手沒眼
  const A_HANDS = 630;  // g1740 MCP 幫 AI 長出手腳

  // Phase B captions (local)
  const B_PROTO = 780;  // g1890 定義規則，說同一種語言
  const B_CAPS = 1290;  // g2400 讀資料夾/Notion/瀏覽器/資料庫
  const B_USB_BEFORE = 1530; // g2640 以前每台裝置自己接頭
  const B_USB_AFTER = 1860;  // g2970 MCP 像 USB 統一規格
  const B_DONE = 2070;       // g3180 一個標準解決一堆問題

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="什麼是 MCP ／ THE PROBLEM" delay={A_HEADER} color={C.primary} />}
            sentence={
              frame >= A_HANDS
                ? <StageSentence text="MCP 就是幫 AI 長出手腳的標準" delay={A_HANDS} color={C.primary} />
                : frame >= A_ISO
                ? <StageSentence text="AI 像一顆厲害的大腦，卻沒有手、沒有眼睛" delay={A_ISO} color={C.text} />
                : <StageSentence text="AI 很聰明，卻幫不了你存檔、查行事曆" delay={A_HEADER} color={C.text} />
            }
            takeaway={<StageTakeaway text="孤立的 AI 大腦，靠 MCP 才能真正碰到外部世界" delay={A_HANDS} color={C.primary} />}
          >
            <IsolatedBrain connectAt={A_HANDS} />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="一種共同語言 ／ THE STANDARD" delay={B_SHOW_AT} color={C.primary} />}
          sentence={
            frame >= B_USB_AFTER
              ? <StageSentence text="就像 USB 統一規格，所有東西都能插在一起" delay={B_USB_AFTER} color={C.primary} fontSize={26 * S} />
              : frame >= B_USB_BEFORE
              ? <StageSentence text="以前每個工具都用自己的接頭，又雜又麻煩" delay={B_USB_BEFORE} color={C.text} fontSize={26 * S} />
              : <StageSentence text="MCP 定義規則，讓 AI 和各種工具說同一種語言" delay={B_SHOW_AT} color={C.text} fontSize={26 * S} />
          }
          takeaway={<StageTakeaway text="一個標準，解決一堆整合的麻煩" delay={B_DONE} color={C.primary} />}
        >
          <USBUnify capAt={B_CAPS} beforeAt={B_USB_BEFORE} afterAt={B_USB_AFTER} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 為什麼火紅 ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function AdopterChip({ name, activeAt }: { name: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: isOn ? C.text : C.textSub,
      background: C.surface, border: `1px solid ${isOn ? C.orangeBorder : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${12 * S}px ${24 * S}px`,
      boxShadow: isOn ? `0 0 ${24 * S}px rgba(255,159,67,0.14)` : "none",
    }}>{name}</div>
  );
}

function AdoptionFlow({ originAt, claudeAt, adoptAt, heatAt }: {
  originAt: number; claudeAt: number; adoptAt: number; heatAt: number;
}) {
  const frame = useCurrentFrame();
  const origin = calcActive(originAt, frame, 0.32);
  const claude = calcActive(claudeAt, frame, 0.3);
  const arrowOp = interpolate(Math.max(0, frame - adoptAt), [0, 20], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // heat trend bars (drawn once)
  const heatGrow = interpolate(Math.max(0, frame - heatAt), [0, 30], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  const heat = calcActive(heatAt, frame, 0.3);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * S }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30 * S }}>
        {/* origin */}
        <div style={{
          opacity: origin.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
          background: C.surface, border: `1px solid ${origin.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 20 * S, padding: `${20 * S}px ${30 * S}px`,
          boxShadow: origin.isOn ? `0 0 ${40 * S}px ${C.primaryGlow}` : "none", position: "relative",
        }}>
          <span style={{ fontSize: 44 * S }}>🅰️</span>
          <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color: C.primary }}>Anthropic</span>
          <span style={{ fontFamily: F_TC, fontSize: 18 * S, color: C.textSub }}>Claude 背後的公司</span>
          <div style={{
            opacity: claude.op, marginTop: 4 * S,
            fontFamily: F_BODY, fontSize: 17 * S, fontWeight: 700, color: C.primary,
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`, borderRadius: 10 * S, padding: `${4 * S}px ${12 * S}px`,
          }}>2024 年底提出</div>
        </div>

        <span style={{ fontSize: 40 * S, color: C.orange, opacity: arrowOp }}>→</span>

        {/* adopters */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S }}>
          <span style={{ opacity: arrowOp, fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.08em" }}>大廠跟進支援</span>
          <div style={{ display: "flex", gap: 14 * S }}>
            <AdopterChip name="OpenAI" activeAt={adoptAt} />
            <AdopterChip name="Google" activeAt={adoptAt + 10} />
            <AdopterChip name="微軟" activeAt={adoptAt + 20} />
          </div>
        </div>
      </div>

      {/* heat trend */}
      <div style={{
        opacity: heat.op, display: "flex", alignItems: "flex-end", gap: 12 * S,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 18 * S, padding: `${16 * S}px ${28 * S}px`,
      }}>
        {[0.3, 0.5, 0.72, 1.0].map((h, i) => (
          <div key={i} style={{
            width: 40 * S, height: 90 * S * h * heatGrow, alignSelf: "flex-end",
            background: C.orange, borderRadius: `${6 * S}px ${6 * S}px 0 0`, boxShadow: `0 0 ${16 * S}px ${C.orange}33`,
          }} />
        ))}
        <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.orange, marginLeft: 10 * S }}>社群討論熱度直線上升 ↑</span>
      </div>
    </div>
  );
}

function ReasonCard({ index, icon, title, body, accent, activeAt }: {
  index: string; icon: string; title: string; body: string; accent: string; activeAt: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(activeAt, frame, 0.28);
  const ty = interpolate(Math.max(0, frame - activeAt), [0, 22], [10 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  return (
    <div style={{
      width: 1080 * S, opacity: op, transform: `translateY(${ty}px)`,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${20 * S}px ${28 * S}px`,
      display: "flex", alignItems: "center", gap: 24 * S,
      boxShadow: isOn ? `0 0 ${40 * S}px ${accent}1f` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={accent} radius={22 * S} />}
      <div style={{
        flexShrink: 0, width: 82 * S, height: 82 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 * S,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 6 * S }}>
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 22 * S, color: accent }}>{index}</span>
          <span style={{ fontFamily: F_HEAD, fontWeight: 700, fontSize: 25 * S, color: isOn ? C.text : C.textSub }}>{title}</span>
        </div>
        <div style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, lineHeight: 1.5 }}>{body}</div>
      </div>
    </div>
  );
}

function ThreeReasons({ r1At, r2At, r3At }: { r1At: number; r2At: number; r3At: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 * S }}>
      <ReasonCard index="01" icon="🔓" title="它是開放的" accent={C.primary} activeAt={r1At}
        body="不是私有規格，不需授權、不需付費——任何人都能做 MCP 伺服器，生態系短時間內冒出幾百個工具。" />
      <ReasonCard index="02" icon="🎯" title="解決真實痛點" accent={C.blue} activeAt={r2At}
        body="以前每個平台都要自己寫整合，費時又易錯；MCP 統一後，開發者做一次，就能被多個 AI 使用。" />
      <ReasonCard index="03" icon="🤖" title="讓 AI Agent 真正可用" accent={C.orange} activeAt={r3At}
        body="Agent 要自主完成多步驟任務，就得穩定連接工具；MCP 補上這塊基礎建設，給 Agent 崛起鋪好了路。" />
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_13.scene2.to - SCENES_2026_04_13.scene2.from;
  // local = global - 3690
  const A_FADE_START = 670;
  const A_REMOVE = 750;
  const B_SHOW_AT = 750;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const A_HEADER = 0;  // g3690 Anthropic 2024 年底提出
  const A_CLAUDE = 270; // g3960 一開始只有 Claude
  const A_ADOPT = 390;  // g4080 OpenAI/Google/微軟跟進
  const A_HEAT = 600;   // g4290 討論熱度上升

  // Phase B captions (local)
  const B_HEADER = 750; // g4440 為什麼受關注 三個原因
  const B_R1 = 840;     // g4530 第一 開放
  const B_R2 = 1440;    // g5130 第二 痛點
  const B_R3 = 2010;    // g5700 第三 Agent

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="MCP 從哪來 ／ THE ORIGIN" delay={A_HEADER} color={C.orange} />}
            sentence={
              frame >= A_ADOPT
                ? <StageSentence text="沒多久，OpenAI、Google、微軟都跟進支援" delay={A_ADOPT} color={C.orange} fontSize={26 * S} />
                : frame >= A_CLAUDE
                ? <StageSentence text="一開始，只有 Claude 自己在用" delay={A_CLAUDE} color={C.text} />
                : <StageSentence text="MCP 是 Anthropic 在 2024 年底提出的開放標準" delay={A_HEADER} color={C.text} />
            }
            takeaway={<StageTakeaway text="從一家公司的提案，快速變成全業界的共同標準" delay={A_ADOPT} color={C.orange} />}
          >
            <AdoptionFlow originAt={A_HEADER} claudeAt={A_CLAUDE} adoptAt={A_ADOPT} heatAt={A_HEAT} />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="爆紅三個原因 ／ WHY NOW" delay={B_SHOW_AT} color={C.orange} />}
          sentence={<StageSentence text="為什麼這麼受關注？原因有三個" delay={B_HEADER} color={C.text} />}
          takeaway={<StageTakeaway text="開放 ＋ 解決痛點 ＋ 撐起 AI Agent ＝ 爆紅的關鍵" delay={B_R3} color={C.orange} />}
        >
          <ThreeReasons r1At={B_R1} r2At={B_R2} r3At={B_R3} />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 對使用者的意義 + 隱私提醒 ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function ToolChip({ name, activeAt }: { name: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, fontFamily: F_HEAD, fontSize: 21 * S, fontWeight: 700, color: isOn ? C.text : C.textSub,
      background: C.surface, border: `1px solid ${isOn ? C.blueBorder : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${10 * S}px ${22 * S}px`,
      boxShadow: isOn ? `0 0 ${20 * S}px ${C.blue}1f` : "none",
    }}>{name}</div>
  );
}

function CapabilityCard({ icon, label, activeAt }: { icon: string; label: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, width: 520 * S, display: "flex", alignItems: "center", gap: 18 * S,
      background: C.surface, border: `1px solid ${isOn ? C.blueBorder : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${14 * S}px ${22 * S}px`,
      boxShadow: isOn ? `0 0 ${24 * S}px ${C.blue}1a` : "none", position: "relative",
    }}>
      {isOn && <RippleRing activeAt={activeAt} color={C.blue} radius={16 * S} />}
      <div style={{
        flexShrink: 0, width: 60 * S, height: 60 * S, borderRadius: 14 * S,
        background: C.blueLight, border: `1px solid ${C.blueBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 * S,
      }}>{icon}</div>
      <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function UserCapabilities({ toolsAt, cap1At, cap2At }: { toolsAt: number; cap1At: number; cap2At: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 * S }}>
      {/* supported tools */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S, flexWrap: "wrap" as const, justifyContent: "center" }}>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>已支援 MCP：</span>
        <ToolChip name="Claude Desktop" activeAt={toolsAt} />
        <ToolChip name="Cursor" activeAt={toolsAt + 10} />
        <ToolChip name="AI 筆記工具" activeAt={toolsAt + 20} />
      </div>
      {/* capability grid 2x2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 * S }}>
        <CapabilityCard icon="📁" label="讀取本機資料夾的檔案" activeAt={cap1At} />
        <CapabilityCard icon="🔍" label="搜尋 Notion 或 Google Drive" activeAt={cap1At} />
        <CapabilityCard icon="📅" label="查行事曆、建立活動" activeAt={cap2At} />
        <CapabilityCard icon="✉️" label="發送 Slack 訊息或 Gmail" activeAt={cap2At} />
      </div>
    </div>
  );
}

function QuestionChip({ text, activeAt }: { text: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, display: "flex", alignItems: "center", gap: 12 * S, width: 360 * S,
      background: C.surface, border: `1px solid ${isOn ? C.orangeBorder : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${12 * S}px ${18 * S}px`,
    }}>
      <span style={{ fontSize: 24 * S }}>❓</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{text}</span>
    </div>
  );
}

function CriteriaChip({ icon, text, activeAt }: { icon: string; text: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, display: "flex", alignItems: "center", gap: 10 * S,
      background: C.primaryLight, border: `1px solid ${isOn ? C.primaryBorder : C.surfaceBorder}`,
      borderRadius: 12 * S, padding: `${10 * S}px ${18 * S}px`,
    }}>
      <span style={{ fontSize: 22 * S }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: isOn ? C.primary : C.textSub }}>{text}</span>
    </div>
  );
}

function PrivacyGate({ warnAt, q1At, q2At, q3At, critAt }: {
  warnAt: number; q1At: number; q2At: number; q3At: number; critAt: number;
}) {
  const frame = useCurrentFrame();
  const warn = calcActive(warnAt, frame, 0.32);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      {/* warning */}
      <div style={{
        opacity: warn.op, display: "flex", alignItems: "center", gap: 16 * S,
        background: C.redLight, border: `1px solid ${C.redBorder}`, borderRadius: 18 * S,
        padding: `${14 * S}px ${28 * S}px`,
      }}>
        <span style={{ fontSize: 38 * S }}>🛡️</span>
        <span style={{ fontFamily: F_TC, fontSize: 23 * S, fontWeight: 700, color: C.text }}>
          連上外部服務，也代表 AI <span style={{ color: C.red }}>有機會讀取你的私人資料</span>
        </span>
      </div>

      {/* three questions */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S }}>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.orange, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>授權前先想清楚</span>
        <div style={{ display: "flex", gap: 16 * S, justifyContent: "center" }}>
          <QuestionChip text="這個工具可信嗎？" activeAt={q1At} />
          <QuestionChip text="資料會傳到哪裡？" activeAt={q2At} />
          <QuestionChip text="有意識地用，別什麼都開" activeAt={q3At} />
        </div>
      </div>

      {/* criteria */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S }}>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.primary, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>選工具優先看</span>
        <div style={{ display: "flex", gap: 16 * S, justifyContent: "center" }}>
          <CriteriaChip icon="🔓" text="是否開源" activeAt={critAt} />
          <CriteriaChip icon="📜" text="有明確隱私政策" activeAt={critAt + 10} />
          <CriteriaChip icon="🏢" text="背後誰在維護" activeAt={critAt + 20} />
        </div>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_13.scene3.to - SCENES_2026_04_13.scene3.from;
  // local = global - 6660
  const A_FADE_START = 1090;
  const A_REMOVE = 1170;
  const B_SHOW_AT = 1170;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW_AT;

  // Phase A captions (local)
  const A_HEADER = 0;   // g6660 你可能不會自己架 MCP 但影響大
  const A_TOOLS = 330;  // g6990 Claude Desktop/Cursor/AI 筆記
  const A_CAP1 = 660;   // g7320 讀本機檔案、搜尋 Notion/Drive
  const A_CAP2 = 810;   // g7470 查行事曆、發 Slack/Gmail

  // Phase B captions (local)
  const B_HEADER = 1170; // g7830 重要提醒
  const B_WARN = 1320;   // g7980 AI 可讀私人資料
  const B_Q1 = 1500;     // g8160 授權前先想清楚
  const B_Q2 = 1620;     // g8280 可信嗎
  const B_Q3 = 1740;     // g8400 有意識地使用
  const B_CRIT = 2010;   // g8670 開源/隱私政策/維護

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="對你的意義 ／ FOR YOU" delay={A_HEADER} color={C.blue} />}
            sentence={
              frame >= A_TOOLS
                ? <StageSentence text="Claude Desktop、Cursor、AI 筆記工具都已支援" delay={A_TOOLS} color={C.blue} fontSize={26 * S} />
                : <StageSentence text="你不會自己架 MCP，但它的影響比你想的大" delay={A_HEADER} color={C.text} />
            }
            takeaway={<StageTakeaway text="幾個月前還要複雜設定，現在開啟對應 MCP 就行" delay={A_CAP2} color={C.blue} />}
          >
            <UserCapabilities toolsAt={A_TOOLS} cap1At={A_CAP1} cap2At={A_CAP2} />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="重要提醒 ／ PRIVACY" delay={B_SHOW_AT} color={C.red} />}
          sentence={
            frame >= B_WARN
              ? <StageSentence text="連外部服務，等於把私人資料的門打開一道縫" delay={B_WARN} color={C.red} fontSize={26 * S} />
              : <StageSentence text="這裡有一個重要的提醒，想特別提" delay={B_SHOW_AT} color={C.text} />
          }
          takeaway={<StageTakeaway text="不是不要用，而是有意識地用——授權前先想清楚" delay={B_Q3} color={C.red} />}
        >
          <PrivacyGate warnAt={B_WARN} q1At={B_Q1} q2At={B_Q2} q3At={B_Q3} critAt={B_CRIT} />
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
      background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 24 * S, padding: `${22 * S}px ${40 * S}px`,
      boxShadow: `0 0 ${60 * S}px ${color}14`,
    }}>
      <div style={{
        flexShrink: 0, width: 90 * S, height: 90 * S, borderRadius: "50%",
        transform: `scale(${Math.max(0.6, numScale)})`,
        background: C.surface2, border: `1px solid ${color}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F_HEAD, fontSize: 36 * S, color, fontWeight: 800, boxShadow: `0 0 ${24 * S}px ${color}33`,
      }}>{number}</div>
      <div style={{ fontFamily: F_TC, fontSize: 25 * S, color: C.text, fontWeight: 700, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_04_13.summary.to - SCENES_2026_04_13.summary.from;
  // local = global - 9330
  const CARD1_AT = 90;  // g9420 第一
  const CARD2_AT = 330; // g9660 第二
  const CARD3_AT = 630; // g9960 第三
  const OUTRO_AT = 830;

  const badgeStyle = useFadeIn(0);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{ paddingTop: CONTENT_TOP + 8 * S, paddingBottom: SUBTITLE_SAFE }}>
        <div style={{ ...badgeStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 * S, marginBottom: 4 * S }}>
          <span style={{ width: 10 * S, height: 10 * S, borderRadius: "50%", background: C.primary, boxShadow: `0 0 ${10 * S}px ${C.primary}` }} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary, letterSpacing: "0.04em" }}>
            <WordReveal text="重點整理" startFrame={4} staggerPerWord={5} fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
          </span>
        </div>
      </AbsoluteFill>

      <BigTakeaway number="01" delay={CARD1_AT} color={C.primary} top={360}
        text="MCP 是一套讓 AI 連接外部工具的開放標準，就像 USB 一樣統一規格。" />
      <BigTakeaway number="02" delay={CARD2_AT} color={C.orange} top={800}
        text="它受關注，是因為開放、解決真實痛點，並讓 AI Agent 真正有辦法落地。" />
      <BigTakeaway number="03" delay={CARD3_AT} color={C.blue} top={1240}
        text="對使用者，MCP 擴大了 AI 的能力，但連接外部服務前，一定要先評估隱私風險。" />

      <div style={{ ...outroStyle, position: "absolute", left: 0, right: 0, top: 1720, textAlign: "center" }}>
        <span style={{ fontFamily: F_BODY, fontWeight: 500, fontSize: 20 * S, color: C.textSub }}>
          這裡是<span style={{ color: C.primary, fontWeight: 700 }}>每日 AI 知識庫</span>，我們明天見 👋
        </span>
      </div>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Main Composition ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export const VideoComposition_2026_04_13: React.FC = () => {
  const frame = useCurrentFrame();
  const Sx = SCENES_2026_04_13;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-13-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_04_13 - 150, TOTAL_FRAMES_2026_04_13], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
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
