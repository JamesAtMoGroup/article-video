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

// 🚨 字型載入鐵律 (2026-06-16 案後加)
// 不 await waitUntilDone → 不同 frame 用不同 font fallback → CJK 標點位置 + 換行點 frame 間飄
// → 觀感「閃爍」(James 06-16 案：「，」「」」「結論」位置每 frame 不同)
// delayRender 強制等所有字型載入完成才開始 render
const fontHandle = delayRender("Loading fonts");
const notoTC = loadNotoSansTC("normal", { weights: ["400", "500", "700", "900"] });
const syne = loadSyne("normal", { weights: ["600", "700", "800"] });
const dmsans = loadDMSans("normal", { weights: ["400", "500"] });
Promise.all([notoTC.waitUntilDone(), syne.waitUntilDone(), dmsans.waitUntilDone()])
  .then(() => continueRender(fontHandle))
  .catch((err) => {
    console.error("Font loading failed:", err);
    continueRender(fontHandle);
  });

// ── Font stacks (aischool) ────────────────────────────────────────────────
const F_HEAD = "'Syne','Noto Sans TC',sans-serif"; // headings / titles / big numbers / Latin
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
// Title:   0s        → 0      hook：考贏醫生 ≠ 真的能看病
// Scene1:  41.42s    → 1242   醫療 AI 早就在醫院上工：影像判讀 + 對話式 AI
// Scene2:  149.13s   → 4474   它能做什麼，又還做不到什麼
// Scene3:  277.67s   → 8330   到底該怎麼用：三個原則
// Summary: 384.33s   → 11530  重點整理 + 小練習
// End:     472.23s   → 14167 (+buffer → 14190)
export const SCENES_2026_06_16 = {
  title: { from: 0, to: 1242 },
  scene1: { from: 1242, to: 4474 },
  scene2: { from: 4474, to: 8330 },
  scene3: { from: 8330, to: 11530 },
  summary: { from: 11530, to: 14190 },
} as const;
export const TOTAL_FRAMES_2026_06_16 = 14190;

const CHAPTERS = [
  { label: "本集焦點", start: 0 },
  { label: "醫院上工", start: 1242 },
  { label: "能與不能", start: 4474 },
  { label: "怎麼用", start: 8330 },
  { label: "重點整理", start: 11530 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 3928, to: 4474, sender: "想一想", text: "聽到「AI 在某項測驗贏過醫生」，你會直接相信它能幫你看病嗎？考試很強，跟能照顧一個活生生的人，差在哪？" },
  { from: 7943, to: 8330, sender: "再想一想", text: "如果一個 AI 考標準題很強，但碰到講不清楚自己哪裡不舒服的真實病人就卡住，你會怎麼看它的「準」？" },
  { from: 11171, to: 11530, sender: "最後想一想", text: "下次身體不舒服，你會怎麼分配？哪些問題先丟給 AI 做功課，哪些一定要留給真人醫生親自判斷？" },
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

// dim → bright tied to a VTT cue (scene-local frame). Cubic, no overshoot.
function calcActive(activeAt: number, frame: number, dim = 0.3) {
  const af = Math.max(0, frame - activeAt);
  const t = interpolate(af, [0, 22], [dim, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
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

// ── RippleRing (one-shot node activation) ──────────────────────────────────
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
        opacity: 0.9, boxShadow: `0 0 ${8 * S}px ${color}`, flexShrink: 0,
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

// ── Shared building blocks ──────────────────────────────────────────────────
function StatCard({ label, value, unit, brightAt, accent, big, glow }: {
  label: string; value: string; unit?: string; brightAt: number; accent: string; big?: boolean; glow?: boolean;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(brightAt, frame, 0.3);
  return (
    <div style={{
      opacity: op,
      background: C.surface, border: `1px solid ${isOn ? accent + "66" : C.surfaceBorder}`,
      borderRadius: 20 * S, padding: `${16 * S}px ${30 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
      boxShadow: glow && isOn ? `0 0 ${50 * S}px ${accent}33` : "none", minWidth: 300 * S,
    }}>
      <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em", textAlign: "center" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 * S }}>
        <span style={{
          fontFamily: F_HEAD, fontWeight: 800, fontSize: (big ? 56 : 44) * S, color: accent,
          lineHeight: 1, textShadow: isOn ? `0 0 ${24 * S}px ${accent}55` : "none",
        }}>{value}</span>
        {unit && <span style={{ fontFamily: F_BODY, fontSize: 22 * S, fontWeight: 700, color: accent }}>{unit}</span>}
      </div>
    </div>
  );
}

function InfoChip({ icon, text, activeAt, accent = C.primary, width }: {
  icon: string; text: string; activeAt: number; accent?: string; width?: number;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, width,
      display: "flex", alignItems: "center", gap: 12 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${10 * S}px ${18 * S}px`,
      boxShadow: isOn ? `0 0 ${22 * S}px ${accent}1a` : "none",
    }}>
      <span style={{ fontSize: 26 * S, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: isOn ? C.text : C.textSub, lineHeight: 1.25 }}>{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TITLE SCENE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function ExamVsRealityHero({ examAt, lineAt, realAt }: { examAt: number; lineAt: number; realAt: number }) {
  const frame = useCurrentFrame();
  const exam = calcActive(examAt, frame, 0.32);
  const line = calcActive(lineAt, frame, 0.0);
  const real = calcActive(realAt, frame, 0.32);
  const lineGrow = interpolate(Math.max(0, frame - lineAt), [0, 26], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const Card = ({ a, icon, tag, head, sub, accent }: {
    a: { op: number; isOn: boolean }; icon: string; tag: string; head: string; sub: string; accent: string;
  }) => (
    <div style={{
      opacity: a.op, width: 540 * S, position: "relative",
      background: C.surface, border: `1px solid ${a.isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 24 * S, padding: `${28 * S}px ${28 * S}px`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
      boxShadow: a.isOn ? `0 0 ${44 * S}px ${accent}1f` : "none",
    }}>
      <div style={{
        width: 96 * S, height: 96 * S, borderRadius: "50%",
        background: `${accent}1a`, border: `${2 * S}px solid ${accent}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 * S,
        boxShadow: a.isOn ? `0 0 ${22 * S}px ${accent}44` : "none",
      }}>{icon}</div>
      <span style={{
        fontFamily: F_BODY, fontSize: 18 * S, fontWeight: 700, color: accent,
        letterSpacing: "0.16em", textTransform: "uppercase" as const,
      }}>{tag}</span>
      <span style={{ fontFamily: F_HEAD, fontSize: 30 * S, fontWeight: 800, color: a.isOn ? C.text : C.textSub, textAlign: "center", lineHeight: 1.25 }}>{head}</span>
      <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, textAlign: "center", lineHeight: 1.4 }}>{sub}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 30 * S }}>
      <Card a={exam} icon="🏆" tag="考題上" head="診斷推理 考贏醫生" sub="某些測驗裡，AI 分數確實比較高" accent={C.primary} />
      {/* 跨不過去的線 */}
      <div style={{ position: "relative", height: 360 * S, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 0, height: 360 * S * lineGrow,
          borderLeft: `${3 * S}px dashed ${C.orange}`, opacity: 0.4 + 0.6 * line.op,
          position: "relative", zIndex: 1,
        }} />
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          background: C.bg, border: `2px solid ${C.orangeBorder}`, borderRadius: 10 * S,
          padding: `${10 * S}px ${18 * S}px`, opacity: line.op, whiteSpace: "nowrap" as const,
          zIndex: 2,
        }}>
          <span style={{ fontFamily: F_TC, fontSize: 20 * S, fontWeight: 700, color: C.orange }}>跨不過去的線</span>
        </div>
      </div>
      <Card a={real} icon="🏥" tag="真實看病" head="真的能幫你看病？" sub="跟考贏，根本是兩回事" accent={C.orange} />
    </div>
  );
}

function TeaserChip({ icon, label, accent, activeAt }: { icon: string; label: string; accent: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(activeAt, frame, 0.32);
  return (
    <div style={{
      opacity: op,
      display: "flex", alignItems: "center", gap: 10 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${10 * S}px ${20 * S}px`,
      boxShadow: isOn ? `0 0 ${20 * S}px ${accent}1f` : "none",
    }}>
      <span style={{ fontSize: 26 * S }}>{icon}</span>
      <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 700, color: isOn ? C.text : C.textSub }}>{label}</span>
    </div>
  );
}

function TitleScene() {
  const dur = SCENES_2026_06_16.title.to - SCENES_2026_06_16.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(36);
  const heroStyle = useFadeUp(120);
  const rowStyle = useFadeUp(150);
  const tagStyle = useFadeUp(190);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-start",
        paddingTop: CONTENT_TOP + 30 * S, paddingBottom: SUBTITLE_SAFE,
        paddingLeft: 80 * S, paddingRight: 80 * S,
        textAlign: "center", zIndex: 5,
      }}>
        <div style={{
          ...badgeOp, marginBottom: 14 * S,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10 * S,
        }}>
          <span style={{
            width: 8 * S, height: 8 * S, borderRadius: "50%", background: C.primary,
            opacity: 0.9, boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          }} />
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.2em", textTransform: "uppercase" as const,
          }}>每日 AI 知識庫 · 醫療 AI</span>
        </div>

        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 46 * S, color: C.text,
        }}>
          <WordReveal text="AI 看病比醫生還準？" startFrame={10} staggerPerWord={6}
            fontSize={46 * S} color={C.text} fontFamily={F_HEAD} fontWeight={800} />
        </h1>
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary,
        }}>
          <WordReveal text="真實臨床的盲點與該怎麼用" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
        </h1>

        <p style={{
          ...subtitleStyle, marginTop: 18 * S,
          fontFamily: F_TC, fontSize: 22 * S, color: C.textSub, lineHeight: 1.6,
        }}>
          在考題上考贏，跟真的能幫你看病，根本是兩回事
        </p>

        {/* central hero — 考題 vs 真實 */}
        <div style={{ ...heroStyle, marginTop: 30 * S }}>
          <ExamVsRealityHero examAt={258} lineAt={782} realAt={500} />
        </div>

        {/* three section teasers */}
        <div style={{ ...rowStyle, marginTop: 30 * S, display: "flex", gap: 22 * S, justifyContent: "center" }}>
          <TeaserChip icon="🩻" label="它在做什麼" accent={C.primary} activeAt={899} />
          <TeaserChip icon="🚧" label="還做不到什麼" accent={C.orange} activeAt={1033} />
          <TeaserChip icon="🧭" label="該怎麼聰明用" accent={C.blue} activeAt={1090} />
        </div>

        <div style={{ ...tagStyle, marginTop: 24 * S }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em",
          }}>影像判讀 · 對話式 AI · 看診前功課 · 第二意見</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 1 — 醫療 AI 早就在醫院上工 ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero: medical scan with AI detection boxes (one-shot sweep + bright)
function ScanDetect({ scanAt, boxAt }: { scanAt: number; boxAt: number }) {
  const frame = useCurrentFrame();
  const FW = 300 * S, FH = 210 * S;
  const sweepF = Math.max(0, frame - scanAt);
  const sweep = interpolate(sweepF, [0, 42], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const showSweep = frame >= scanAt && sweepF < 46;
  const box = calcActive(boxAt, frame, 0.0);
  const boxBorder = 2.5 * S;
  const boxes = [
    { left: 0.22, top: 0.26, w: 0.2, h: 0.22 },
    { left: 0.58, top: 0.5, w: 0.18, h: 0.2 },
  ];
  return (
    <div style={{
      position: "relative", width: FW, height: FH, borderRadius: 18 * S, overflow: "hidden",
      background: "linear-gradient(135deg, #10151f 0%, #161b27 55%, #0e1218 100%)",
      border: `1px solid ${C.surfaceBorder}`, flexShrink: 0,
      boxShadow: `0 0 ${30 * S}px rgba(0,0,0,0.4)`,
    }}>
      {/* faux scan content */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 110 * S, opacity: 0.5 }}>🫁</div>
      {/* detection boxes */}
      {boxes.map((b, i) => (
        <div key={i} style={{
          position: "absolute", left: `${b.left * 100}%`, top: `${b.top * 100}%`,
          width: `${b.w * 100}%`, height: `${b.h * 100}%`,
          border: `${boxBorder}px solid ${C.primary}`, borderRadius: 8 * S,
          opacity: box.op, boxShadow: box.isOn ? `0 0 ${16 * S}px ${C.primary}88` : "none",
        }}>
          <span style={{
            position: "absolute", top: -22 * S, left: 0,
            fontFamily: F_BODY, fontSize: 14 * S, fontWeight: 700, color: C.primary,
            background: C.chipBg, borderRadius: 5 * S, padding: `${2 * S}px ${7 * S}px`, whiteSpace: "nowrap" as const,
          }}>可疑點</span>
        </div>
      ))}
      {/* one-shot scan line */}
      {showSweep && (
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: `${sweep * 100}%`, width: 4 * S,
          background: `linear-gradient(to bottom, transparent, ${C.primary}, transparent)`,
          boxShadow: `0 0 ${14 * S}px ${C.primary}`, opacity: 0.85,
        }} />
      )}
      {/* label */}
      <div style={{
        position: "absolute", bottom: 10 * S, left: 12 * S,
        fontFamily: F_BODY, fontSize: 15 * S, fontWeight: 700, color: C.primary,
        letterSpacing: "0.08em", background: C.chipBg, borderRadius: 6 * S, padding: `${3 * S}px ${10 * S}px`,
      }}>AI 影像判讀</div>
    </div>
  );
}

function Scene1HeroA() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      <div style={{ display: "flex", alignItems: "center", gap: 40 * S }}>
        <ScanDetect scanAt={546} boxAt={1096} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 * S }}>
          <StatCard label="美國已核准的 AI 醫療裝置" value="1,400" unit="+ 項" brightAt={655} accent={C.primary} glow />
          <StatCard label="其中用於放射科影像" value="≈ 3/4" brightAt={840} accent={C.blue} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 14 * S, justifyContent: "center", flexWrap: "wrap" as const }}>
        <InfoChip icon="🩻" text="X 光 · 電腦斷層 · 乳房攝影" activeAt={1005} accent={C.primary} />
        <InfoChip icon="🎯" text="圈出可疑處 · 提醒醫生別漏看" activeAt={1096} accent={C.primary} />
        <InfoChip icon="🧠" text="中風偵測 · 腦腫瘤 · 乳癌篩檢" activeAt={1311} accent={C.blue} />
      </div>
    </div>
  );
}

// Phase B hero: exam score comparison (AI 90 vs doctor 76)
// Bars present (grey, dim) from presentAt; numbers + colour reveal at brightAt.
function ScoreBar({ label, score, color, presentAt, brightAt, highlight }: {
  label: string; score: number; color: string; presentAt: number; brightAt: number; highlight?: boolean;
}) {
  const frame = useCurrentFrame();
  const present = calcActive(presentAt, frame, 0.32);
  const grow = interpolate(Math.max(0, frame - presentAt), [0, 30], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  const isBright = frame >= brightAt;
  const count = interpolate(Math.max(0, frame - brightAt), [0, 26], [0, score], { easing: E.outCubic, extrapolateRight: "clamp" });
  const maxH = 168 * S;
  return (
    <div style={{ opacity: present.op, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S }}>
      <div style={{
        height: 50 * S, display: "flex", alignItems: "flex-end",
        fontFamily: F_HEAD, fontWeight: 800, fontSize: 42 * S,
        color: isBright ? color : "transparent",
        textShadow: isBright ? `0 0 ${22 * S}px ${color}55` : "none",
      }}>{isBright ? `${Math.round(count)}%` : ""}</div>
      <div style={{ height: maxH, width: 120 * S, display: "flex", alignItems: "flex-end" }}>
        <div style={{
          width: "100%", height: maxH * (score / 100) * grow,
          background: isBright ? (highlight ? color : "rgba(91,143,255,0.85)") : "rgba(240,240,245,0.2)",
          border: `1px solid ${isBright ? color + "88" : C.surfaceBorder}`,
          borderRadius: `${10 * S}px ${10 * S}px 0 0`,
          boxShadow: isBright && highlight ? `0 0 ${26 * S}px ${color}44` : "none",
        }} />
      </div>
      <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: isBright ? C.text : C.textSub, whiteSpace: "nowrap" as const }}>{label}</span>
    </div>
  );
}

function Scene1HeroB() {
  const frame = useCurrentFrame();
  const ctx = calcActive(1844, frame, 0.32);
  const caveat = calcActive(2480, frame, 0.0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S }}>
      <div style={{
        opacity: ctx.op, fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, fontWeight: 500,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 12 * S,
        padding: `${8 * S}px ${20 * S}px`,
      }}>📄 醫學期刊研究 · 一批困難病例 · AI 獨自作答</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 90 * S }}>
        <ScoreBar label="AI 診斷推理" score={90} color={C.primary} presentAt={1590} brightAt={2072} highlight />
        <ScoreBar label="醫生" score={76} color={C.blue} presentAt={1590} brightAt={2072} />
      </div>
      <div style={{
        opacity: caveat.op, display: "flex", alignItems: "center", gap: 12 * S,
        fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: C.orange,
        background: C.orangeLight, border: `1px solid ${C.orangeBorder}`, borderRadius: 14 * S,
        padding: `${9 * S}px ${22 * S}px`,
      }}>⚠️ 別急著高興 —— 這個「準」後面藏了一大堆前提條件</div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_16.scene1.to - SCENES_2026_06_16.scene1.from;
  const A_FADE_START = 1510;
  const A_REMOVE = 1590;
  const B_SHOW = 1590;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW;
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="第一段 ／ 早就在醫院上工" delay={0} color={C.primary} />}
            sentence={
              frame >= 546
                ? <StageSentence text="最成熟、用最多的，是默默看片子的「影像判讀」" delay={546} color={C.primary} fontSize={26 * S} />
                : <StageSentence text="醫療 AI 不在實驗室裡，而是默默待在後台" delay={0} color={C.text} />
            }
            takeaway={<StageTakeaway text="它幫醫生把可疑處圈出來、提醒別漏看，是醫院裡的好幫手" delay={1096} color={C.primary} />}
          >
            <Scene1HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <HeroFrame
          eyebrow={<StageEyebrow label="另一條線 ／ 對話式 AI" delay={B_SHOW} color={C.primary} />}
          sentence={
            frame >= 2314
              ? <StageSentence text="「AI 看病比醫生準」這個說法，就是這樣來的" delay={2314} color={C.primary} fontSize={26 * S} />
              : <StageSentence text="困難病例考試裡，AI 的診斷推理分數考贏了醫生" delay={B_SHOW} color={C.text} fontSize={26 * S} />
          }
          takeaway={<StageTakeaway text="考試很強，跟能照顧一個活生生的人，到底差在哪？" delay={2958} color={C.orange} />}
        >
          <Scene1HeroB />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 2 — 它能做什麼，又還做不到什麼 ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

// Phase A hero — strengths
function StrengthCard({ icon, title, points, brightAt, accent }: {
  icon: string; title: string; points: { text: string; at: number }[]; brightAt: number; accent: string;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(brightAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, width: 620 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${24 * S}px ${28 * S}px`,
      display: "flex", flexDirection: "column", gap: 14 * S,
      boxShadow: isOn ? `0 0 ${34 * S}px ${accent}1a` : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
        <div style={{
          width: 70 * S, height: 70 * S, borderRadius: 16 * S, flexShrink: 0,
          background: `${accent}1a`, border: `1px solid ${accent}66`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 * S,
        }}>{icon}</div>
        <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, fontWeight: 800, color: isOn ? C.text : C.textSub, lineHeight: 1.2 }}>{title}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S }}>
        {points.map((p, i) => {
          const pa = calcActive(p.at, frame, 0.25);
          return (
            <div key={i} style={{ opacity: pa.op, display: "flex", alignItems: "center", gap: 10 * S }}>
              <span style={{ color: accent, fontSize: 22 * S, flexShrink: 0 }}>✓</span>
              <span style={{ fontFamily: F_TC, fontSize: 20 * S, color: pa.isOn ? C.text : C.textSub, lineHeight: 1.3 }}>{p.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Scene2HeroA() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      <StrengthCard
        icon="🩻" title="看片子：有標準答案、模式清楚" brightAt={245} accent={C.primary}
        points={[
          { text: "又快又穩 —— 幾秒鐘就掃完一張影像", at: 401 },
          { text: "把可疑的點標出來，當醫生的好幫手", at: 541 },
          { text: "降低漏看的機率", at: 637 },
        ]}
      />
      <StrengthCard
        icon="🧮" title="資料給齊、純推理的考題" brightAt={763} accent={C.blue}
        points={[{ text: "它也確實表現亮眼", at: 763 }]}
      />
    </div>
  );
}

// Phase B hero — reality check (≈50%)
function FindingRow({ icon, text, activeAt, accent }: { icon: string; text: string; activeAt: number; accent: string }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(activeAt, frame, 0.28);
  const tx = interpolate(Math.max(0, frame - activeAt), [0, 20], [24 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  return (
    <div style={{
      opacity: op, transform: `translateX(${tx}px)`, width: 1080 * S,
      display: "flex", alignItems: "center", gap: 14 * S,
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 14 * S, padding: `${12 * S}px ${22 * S}px`,
    }}>
      <span style={{ fontSize: 26 * S, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: isOn ? C.text : C.textSub, lineHeight: 1.3 }}>{text}</span>
    </div>
  );
}

function Scene2HeroB() {
  const frame = useCurrentFrame();
  const big = calcActive(859, frame, 0.32); // present from phase start
  const isBright = frame >= 1290;
  const count = interpolate(Math.max(0, frame - 1290), [0, 30], [0, 50], { easing: E.outExpo, extrapolateRight: "clamp" });
  const ctx = calcActive(1028, frame, 0.0);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 * S }}>
      <div style={{
        opacity: ctx.op, fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, fontWeight: 500,
        background: C.surface, border: `1px solid ${C.surfaceBorder}`, borderRadius: 12 * S,
        padding: `${8 * S}px ${20 * S}px`,
      }}>📊 大型分析 · 彙整 80＋ 項研究 · AI 與醫生擺在一起比</div>
      <div style={{
        opacity: big.op,
        background: C.surface, border: `1px solid ${isBright ? C.orangeBorder : C.surfaceBorder}`,
        borderRadius: 22 * S, padding: `${14 * S}px ${48 * S}px`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2 * S,
        boxShadow: isBright ? `0 0 ${50 * S}px ${C.orange}33` : "none",
      }}>
        <span style={{ fontFamily: F_BODY, fontSize: 18 * S, color: C.muted, letterSpacing: "0.06em" }}>放回真實世界 · 整體診斷準確率</span>
        <span style={{
          fontFamily: F_HEAD, fontWeight: 800, fontSize: 64 * S, color: C.orange, lineHeight: 1.05,
          textShadow: isBright ? `0 0 ${28 * S}px ${C.orange}55` : "none",
        }}>≈ {isBright ? Math.round(count) : "?"}%</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
        <FindingRow icon="⚖️" text="AI 並非全面碾壓 —— 跟醫生差距其實不明顯" activeAt={1547} accent={C.orange} />
        <FindingRow icon="🤝" text="醫生「搭配」AI 一起看，準確率也沒明顯變高" activeAt={1859} accent={C.orange} />
      </div>
    </div>
  );
}

// Phase C hero — what it can't do
function GapChip({ icon, text, activeAt }: { icon: string; text: string; activeAt: number }) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(activeAt, frame, 0.3);
  return (
    <div style={{
      opacity: op, width: 540 * S,
      display: "flex", alignItems: "center", gap: 14 * S,
      background: C.surface, border: `1px solid ${isOn ? C.redBorder : C.surfaceBorder}`,
      borderRadius: 16 * S, padding: `${14 * S}px ${20 * S}px`,
      boxShadow: isOn ? `0 0 ${22 * S}px ${C.red}18` : "none",
    }}>
      <span style={{ fontSize: 30 * S, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontFamily: F_TC, fontSize: 21 * S, fontWeight: 700, color: isOn ? C.text : C.textSub, lineHeight: 1.3 }}>{text}</span>
    </div>
  );
}

function Scene2HeroC() {
  const frame = useCurrentFrame();
  const doc = calcActive(2924, frame, 0.3);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * S }}>
      <div style={{ display: "flex", gap: 22 * S, justifyContent: "center" }}>
        <GapChip icon="🤲" text="親手觸診、察言觀色" activeAt={2504} />
        <GapChip icon="🗣️" text="搞懂講不清楚哪裡不舒服的病人" activeAt={2504} />
      </div>
      <div style={{ display: "flex", gap: 22 * S, justifyContent: "center" }}>
        <GapChip icon="🤔" text="在資訊不齊時做取捨" activeAt={2704} />
        <GapChip icon="🛡️" text="扛起做決定的責任" activeAt={2808} />
      </div>
      <div style={{
        opacity: doc.op, display: "flex", alignItems: "center", gap: 16 * S,
        fontFamily: F_TC, fontSize: 24 * S, fontWeight: 700, color: C.text,
        background: C.surface, border: `1px solid ${C.primaryBorder}`, borderRadius: 16 * S,
        padding: `${14 * S}px ${30 * S}px`, boxShadow: `0 0 ${40 * S}px ${C.primaryGlow}`,
      }}>
        <span style={{ fontSize: 30 * S }}>👨‍⚕️</span> 這些「考題上沒寫」的部分，目前都還牢牢握在真人醫生手裡
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_16.scene2.to - SCENES_2026_06_16.scene2.from;
  const A_FADE_START = 779;
  const A_REMOVE = 859;
  const B_SHOW = 859;
  const B_FADE_START = 2218;
  const B_REMOVE = 2298;
  const C_SHOW = 2298;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;
  const showB = frame >= B_SHOW && frame < B_REMOVE;
  const bOpacity = frame > B_FADE_START ? interpolate(frame, [B_FADE_START, B_REMOVE], [1, 0], clamp) : 1;
  const showC = frame >= C_SHOW;
  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
        <div style={{ opacity: aOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="第二段 ／ 它的強項" delay={0} color={C.primary} />}
            sentence={<StageSentence text="先說它真的厲害的地方" delay={0} color={C.text} />}
            takeaway={<StageTakeaway text="有標準答案、模式清楚的任務，AI 又快又穩" delay={637} color={C.primary} />}
          >
            <Scene2HeroA />
          </HeroFrame>
        </div>
      )}
      {showB && (
        <div style={{ opacity: bOpacity, height: "100%" }}>
          <HeroFrame
            eyebrow={<StageEyebrow label="放回真實世界 ／ THE REALITY" delay={B_SHOW} color={C.orange} />}
            sentence={
              frame >= 1547
                ? <StageSentence text="它不是全面碾壓，只是在某些特定場景特別強" delay={1547} color={C.orange} fontSize={26 * S} />
                : <StageSentence text="一把它放回真實世界，故事就不一樣了" delay={B_SHOW} color={C.text} />
            }
            takeaway={<StageTakeaway text="「強強聯手」聽起來合理，但數據沒那麼浪漫" delay={2017} color={C.orange} />}
          >
            <Scene2HeroB />
          </HeroFrame>
        </div>
      )}
      {showC && (
        <HeroFrame
          eyebrow={<StageEyebrow label="它做不到的 ／ THE GAP" delay={C_SHOW} color={C.red} />}
          sentence={
            frame >= 3035
              ? <StageSentence text="考試分數高，不等於它能在現實裡照顧你" delay={3035} color={C.red} fontSize={26 * S} />
              : <StageSentence text="它做不到的，是真實看病裡「考題上沒寫」的部分" delay={C_SHOW} color={C.text} fontSize={26 * S} />
          }
          takeaway={<StageTakeaway text="看到「贏過醫生」的標題，先問：它到底在什麼條件下贏的？" delay={3157} color={C.red} />}
        >
          <Scene2HeroC />
        </HeroFrame>
      )}
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SCENE 3 — 到底該怎麼用：三個原則 ─────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

function PrincipleCard({ num, icon, title, accent, brightAt, points }: {
  num: string; icon: string; title: string; accent: string; brightAt: number;
  points: { text: string; at: number; warn?: boolean }[];
}) {
  const frame = useCurrentFrame();
  // 🐢 3 卡 stagger pattern — 60 frame softer (鐵律 06-15/06-16)
  const af = Math.max(0, frame - brightAt);
  const op = interpolate(af, [0, 60], [0.3, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const isOn = frame >= brightAt + 30;
  return (
    <div style={{
      opacity: op, width: 300 * S, position: "relative", alignSelf: "stretch",
      background: C.surface, border: `1px solid ${isOn ? accent + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${22 * S}px ${22 * S}px`,
      display: "flex", flexDirection: "column", gap: 14 * S,
      boxShadow: isOn ? `0 0 ${34 * S}px ${accent}1a` : "none",
    }}>
      {/* 🚫 RippleRing 拿掉 — 3 卡 stagger 漣漪 = 觀感跳動 (鐵律 06-15/06-16) */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
        <div style={{
          width: 54 * S, height: 54 * S, borderRadius: "50%", flexShrink: 0,
          background: C.surface2, border: `1px solid ${accent}66`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color: accent,
        }}>{num}</div>
        <span style={{ fontSize: 32 * S }}>{icon}</span>
      </div>
      <span style={{ fontFamily: F_HEAD, fontSize: 24 * S, fontWeight: 800, color: isOn ? C.text : C.textSub, lineHeight: 1.25 }}>{title}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 * S }}>
        {points.map((p, i) => {
          const pa = calcActive(p.at, frame, 0.25);
          const col = p.warn ? C.red : accent;
          return (
            <div key={i} style={{ opacity: pa.op, display: "flex", alignItems: "flex-start", gap: 10 * S }}>
              <span style={{ color: col, fontSize: 20 * S, flexShrink: 0, marginTop: 2 * S }}>{p.warn ? "✕" : "·"}</span>
              <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: pa.isOn ? (p.warn ? C.red : C.text) : C.textSub, lineHeight: 1.4, fontWeight: p.warn ? 700 : 400 }}>{p.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_06_16.scene3.to - SCENES_2026_06_16.scene3.from;
  return (
    <SceneFade durationInFrames={dur}>
      <HeroFrame
        eyebrow={<StageEyebrow label="第三段 ／ 到底該怎麼用" delay={0} color={C.primary} />}
        sentence={<StageSentence text="不是拿來「取代醫生」，而是拿來讓你「更會看醫生」" delay={136} color={C.text} fontSize={26 * S} />}
        takeaway={<StageTakeaway text="抓住這三個原則就夠了：它給你的是參考，不是結論" delay={708} color={C.primary} />}
      >
        <div style={{ display: "flex", gap: 24 * S, justifyContent: "center", alignItems: "stretch" }}>
          <PrincipleCard
            num="01" icon="📋" title="看診前的功課" accent={C.primary} brightAt={302}
            points={[
              { text: "用 AI 查方向、把想問醫生的問題先整理一下", at: 551 },
              { text: "它給的是「參考」，不是「結論」", at: 708 },
              { text: "別自我診斷、別自己買藥或停藥", at: 832, warn: true },
            ]}
          />
          <PrincipleCard
            num="02" icon="💬" title="當第二意見來用" accent={C.blue} brightAt={1154}
            points={[
              { text: "醫生診斷後，用 AI 補背景、搞懂專有名詞", at: 1270 },
              { text: "想出更好的問題，當更會發問的病人", at: 1404 },
              { text: "不是拿去推翻醫生、自己當醫生", at: 1588, warn: true },
            ]}
          />
          <PrincipleCard
            num="03" icon="🔒" title="顧好健康隱私" accent={C.orange} brightAt={1731}
            points={[
              { text: "自己查、幫家人問，都一樣重要", at: 1880 },
              { text: "病情、檢查報告都是超級敏感的資料", at: 2080 },
              { text: "丟給 AI 前先想：平台會怎麼用我的資料？", at: 2265 },
            ]}
          />
        </div>
      </HeroFrame>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── SUMMARY ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function TakeawayCard({ number, title, detail, brightAt, detailAt, color }: {
  number: string; title: string; detail: string; brightAt: number; detailAt: number; color: string;
}) {
  const frame = useCurrentFrame();
  const { op, isOn } = calcActive(brightAt, frame, 0.3);
  const numScale = easeOutBack(prog(Math.max(0, frame - brightAt), 22));
  const det = calcActive(detailAt, frame, 0.0);
  return (
    <div style={{
      width: "100%",
      opacity: op, display: "flex", alignItems: "center", gap: 24 * S,
      background: C.surface, border: `1px solid ${isOn ? color + "55" : C.surfaceBorder}`,
      borderRadius: 22 * S, padding: `${16 * S}px ${36 * S}px`,
      boxShadow: isOn ? `0 0 ${50 * S}px ${color}14` : "none",
    }}>
      <div style={{
        flexShrink: 0, width: 58 * S, height: 58 * S, borderRadius: "50%",
        transform: `scale(${Math.max(0.6, numScale)})`,
        background: C.surface2, border: `1px solid ${color}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: F_HEAD, fontSize: 26 * S, color, fontWeight: 800,
        boxShadow: `0 0 ${22 * S}px ${color}33`,
      }}>{number}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 * S }}>
        <span style={{ fontFamily: F_HEAD, fontSize: 26 * S, color: C.text, fontWeight: 800, lineHeight: 1.3 }}>{title}</span>
        <span style={{ opacity: det.op, fontFamily: F_TC, fontSize: 20 * S, color: C.textSub, fontWeight: 500, lineHeight: 1.45 }}>{detail}</span>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_06_16.summary.to - SCENES_2026_06_16.summary.from;
  const frame = useCurrentFrame();
  const badgeStyle = useFadeIn(0);
  const practice = calcActive(1538, frame, 0.3);
  const item1 = calcActive(1740, frame, 0.0);
  const item2 = calcActive(1962, frame, 0.0);
  const bottomLine = calcActive(2208, frame, 0.3);
  const outroStyle = useFadeIn(2472);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        paddingTop: CONTENT_TOP + 8 * S, paddingBottom: SUBTITLE_SAFE - 10 * S,
        paddingLeft: STAGE_LEFT, paddingRight: STAGE_LEFT,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 16 * S,
      }}>
        {/* badge */}
        <div style={{
          ...badgeStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 * S, marginBottom: 4 * S,
        }}>
          <span style={{
            width: 10 * S, height: 10 * S, borderRadius: "50%", background: C.primary,
            opacity: 0.9, boxShadow: `0 0 ${10 * S}px ${C.primary}`,
          }} />
          <span style={{ fontFamily: F_HEAD, fontWeight: 800, fontSize: 30 * S, color: C.primary, letterSpacing: "0.04em" }}>
            <WordReveal text="今日重點整理" startFrame={4} staggerPerWord={5}
              fontSize={30 * S} color={C.primary} fontFamily={F_HEAD} fontWeight={800} />
          </span>
        </div>

        <TakeawayCard number="01" color={C.primary} brightAt={60} detailAt={195}
          title="醫療 AI 在做什麼"
          detail="最成熟的是影像判讀，已核准裝置約 3/4 用在放射科；對話式 AI 是較新戰場" />
        <TakeawayCard number="02" color={C.orange} brightAt={508} detailAt={637}
          title="能跟不能"
          detail="特定考題能贏過醫生；但真實世界整體準確率僅約五成，觸診、應變、扛責任仍靠真人" />
        <TakeawayCard number="03" color={C.blue} brightAt={1133} detailAt={1319}
          title="正確的用法"
          detail="當看診前功課與第二意見；別自我診斷、別自己停藥，守好健康隱私" />

        {/* 今日練習 */}
        <div style={{
          width: "100%", opacity: practice.op,
          background: C.surface, border: `1px solid ${practice.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 22 * S, padding: `${14 * S}px ${36 * S}px`,
          boxShadow: practice.isOn ? `0 0 ${44 * S}px ${C.primaryGlow}` : "none",
          display: "flex", flexDirection: "column", gap: 8 * S,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 * S }}>
            <span style={{ fontSize: 26 * S }}>🛠️</span>
            <span style={{ fontFamily: F_HEAD, fontSize: 22 * S, fontWeight: 800, color: C.text }}>今日練習 · 看醫生前花五分鐘用 AI 做兩件事</span>
          </div>
          <div style={{ display: "flex", gap: 24 * S }}>
            <div style={{ opacity: item1.op, flex: 1, display: "flex", alignItems: "center", gap: 10 * S }}>
              <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 800, color: C.primary }}>1.</span>
              <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, lineHeight: 1.4 }}>把症狀整理成幾個「想問醫生的具體問題」</span>
            </div>
            <div style={{ opacity: item2.op, flex: 1, display: "flex", alignItems: "center", gap: 10 * S }}>
              <span style={{ fontFamily: F_HEAD, fontSize: 20 * S, fontWeight: 800, color: C.blue }}>2.</span>
              <span style={{ fontFamily: F_TC, fontSize: 19 * S, color: C.textSub, lineHeight: 1.4 }}>看完診後，用它把專有名詞、診斷查清楚補背景</span>
            </div>
          </div>
        </div>

        {/* 底線 */}
        <div style={{
          width: "100%", opacity: bottomLine.op, textAlign: "center",
          fontFamily: F_TC, fontSize: 22 * S, fontWeight: 700, color: C.text, lineHeight: 1.4,
          background: C.surface, border: `1px solid ${bottomLine.isOn ? C.primaryBorder : C.surfaceBorder}`,
          borderRadius: 16 * S, padding: `${14 * S}px ${30 * S}px`,
          boxShadow: bottomLine.isOn ? `0 0 ${44 * S}px ${C.primaryGlow}` : "none",
        }}>
          底線：AI 是幫你「更會看醫生」，但真正替你做決定、開處方的，永遠是真人醫生
        </div>

        <div style={{ ...outroStyle, marginTop: 2 * S, textAlign: "center" }}>
          <span style={{
            fontFamily: F_BODY, fontWeight: 500, fontSize: 18 * S, color: C.muted,
            letterSpacing: "0.2em", textTransform: "uppercase" as const,
          }}>每日 AI 知識庫 · 我們明天見</span>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ── Main Composition ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export function VideoComposition_2026_06_16() {
  const frame = useCurrentFrame();
  const T = SCENES_2026_06_16.title;
  const S1 = SCENES_2026_06_16.scene1;
  const S2 = SCENES_2026_06_16.scene2;
  const S3 = SCENES_2026_06_16.scene3;
  const SU = SCENES_2026_06_16.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-06-16-processed.wav")} volume={1.0} />

      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_06_16 - 150, TOTAL_FRAMES_2026_06_16], [v, 0], {
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
