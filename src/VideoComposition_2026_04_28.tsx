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
import { loadFont as loadSpaceMono } from "@remotion/google-fonts/SpaceMono";

loadNotoSansTC("normal", { weights: ["400", "700", "900"] });
loadSpaceMono("normal", { weights: ["400", "700"] });

// ── Scale & canvas (4K = 3840×2160) ───────────────────────────────────────
const S = 3;
const W = 1280 * S;  // 3840
const H = 720  * S;  // 2160
const NAV_H         = 50  * S;  // 150px
const CONTAINER_W   = 640 * S;  // 1920px
const COL_LEFT      = (W - CONTAINER_W) / 2;  // 960px
const SUBTITLE_SAFE = 120 * S;  // 360px
const CONTENT_GAP   = 10  * S;  // 30px
const CONTENT_TOP   = NAV_H + CONTENT_GAP;       // 180px
const CONTENT_H     = H - CONTENT_TOP - SUBTITLE_SAFE;  // 1620px

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:           "#000000",
  surface:      "#0d0d0d",
  surfaceBorder:"rgba(255,255,255,0.08)",
  primary:      "#7cffb2",
  primaryLight: "rgba(124,255,178,0.07)",
  primaryBorder:"rgba(124,255,178,0.14)",
  text:         "#ffffff",
  muted:        "#888888",
  yellow:       "#ffd166",
  yellowLight:  "rgba(255,209,102,0.1)",
  yellowBorder: "rgba(255,209,102,0.2)",
  red:          "#ff6b6b",
  redLight:     "rgba(255,107,107,0.08)",
  redBorder:    "rgba(255,107,107,0.2)",
} as const;

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W       = 290 * S;
const NOTIF_TOP     = 12  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLOT    = 148 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// TitleScene:  0–19.16s     →    0–575
// Scene1:      19.16–93.80s → 575–2814
// Scene2:      93.80–168.88s→ 2814–5066
// Scene3:    168.88–255.32s → 5066–7660
// Summary:   255.32–288.44s → 7660–8700
export const SCENES_2026_04_28 = {
  title:   { from: 0,    to: 575   },
  scene1:  { from: 575,  to: 2814  },
  scene2:  { from: 2814, to: 5066  },
  scene3:  { from: 5066, to: 7660  },
  summary: { from: 7660, to: 8700  },
} as const;
export const TOTAL_FRAMES_2026_04_28 = 8700;

const CHAPTERS = [
  { label: "今日焦點",          start: 0    },
  { label: "AI 靠什麼學習",     start: 575  },
  { label: "你的資料在裡面嗎",  start: 2814 },
  { label: "對你的意義",        start: 5066 },
  { label: "重點整理",          start: 7660 },
] as const;

// ── iMessage callouts (global frames, aligned with 「想一想」moments) ─────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  // 82.60s "先停一秒,問你一個問題" → global 2478, ends at scene1 end 2814
  { from: 2478, to: 2814, sender: "想一想",
    text: "你在網路上發表過的公開內容，有意識到它可能被 AI 用來訓練模型嗎？" },
  // 158.96s "問你一個問題" → global 4769, ends at scene2 end 5066
  { from: 4769, to: 5066, sender: "想一想",
    text: "你對自己的公開內容被用於 AI 訓練——感覺是還好、不舒服、還是完全沒想過？" },
  // 244.72s "最後一個問題" → global 7341, ends at scene3 end 7660
  { from: 7341, to: 7660, sender: "想一想",
    text: "你有沒有查過正在使用的 AI 工具，它的資料使用政策是什麼？" },
];

// ── Easing tokens ─────────────────────────────────────────────────────────
const E = {
  outExpo:  Easing.bezier(0.19, 1, 0.22, 1),
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
  const ty = interpolate(f, [0, 22], [22 * S, 0], { easing: E.outExpo,  extrapolateRight: "clamp" });
  const op = interpolate(f, [0, 14], [0, 1],       { easing: E.outCubic, extrapolateRight: "clamp" });
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
        const ty = interpolate(f, [0, 20], [18 * S, 0], { easing: E.outExpo,  extrapolateRight: "clamp" });
        const op = interpolate(f, [0, 12], [0, 1],       { easing: E.outCubic, extrapolateRight: "clamp" });
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
  const fadeIn  = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
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
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: 900 * S, height: 900 * S, top: -200 * S, left: -150 * S,
        background: "radial-gradient(circle, rgba(124,255,178,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: 700 * S, height: 700 * S, top: 300 * S, right: -100 * S,
        background: "radial-gradient(circle, rgba(124,255,178,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: 500 * S, height: 500 * S, bottom: 100 * S, left: 300 * S,
        background: "radial-gradient(circle, rgba(255,209,102,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
        backgroundSize: `${60 * S}px ${60 * S}px`,
        pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );
}

// ── ProgressBar ────────────────────────────────────────────────────────────
function ProgressBar({ globalFrame }: { globalFrame: number }) {
  const { durationInFrames } = useVideoConfig();
  const progress = globalFrame / durationInFrames;
  const current = [...CHAPTERS].reverse().find(c => globalFrame >= c.start) ?? CHAPTERS[0];
  const slideIn = interpolate(globalFrame, [0, 15], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 10 }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: NAV_H,
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.primaryBorder}`,
        padding: `${10 * S}px ${32 * S}px`,
        transform: `translateY(${interpolate(slideIn, [0, 1], [-NAV_H, 0])}px)`,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 18 * S, color: C.muted,
          fontFamily: "'Space Mono', monospace", letterSpacing: "0.05em",
        }}>
          <span>每日 AI 知識庫</span>
          <span style={{ color: C.primary }}>{current.label}</span>
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

// ── iMessage Callout ───────────────────────────────────────────────────────
function IMessageCard({ callout, slotIndex, globalFrame }: {
  callout: Callout; slotIndex: number; globalFrame: number;
}) {
  const { fps } = useVideoConfig();
  const f = Math.max(0, globalFrame - callout.from);
  const remaining = callout.to - globalFrame;
  const slideY = spring({ frame: f, fps, config: { damping: 22, stiffness: 130 } });
  const translateY = interpolate(slideY, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);
  const fadeOut = remaining < FADE_OUT_FRAMES
    ? interpolate(remaining, [0, FADE_OUT_FRAMES], [0, 1], clamp)
    : 1;
  const slotOffset = slotIndex * NOTIF_SLOT;
  return (
    <div style={{
      position: "absolute", top: NOTIF_TOP + slotOffset, right: NOTIF_RIGHT,
      width: NOTIF_W, opacity: fadeOut,
      transform: `translateY(${translateY}px)`,
      zIndex: 100,
      background: "rgba(18,18,18,0.95)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderRadius: 16 * S,
      border: `1px solid rgba(124,255,178,0.2)`,
      padding: `${12 * S}px ${14 * S}px`,
      boxShadow: `0 ${8 * S}px ${24 * S}px rgba(0,0,0,0.6)`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 6 * S,
      }}>
        <div style={{
          width: 10 * S, height: 10 * S, borderRadius: "50%", background: C.primary,
          boxShadow: `0 0 ${6 * S}px ${C.primary}`,
        }} />
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S, color: C.primary,
          letterSpacing: "0.05em",
        }}>{callout.sender}</span>
      </div>
      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S, color: C.text,
        lineHeight: 1.55,
      }}>{callout.text}</div>
    </div>
  );
}

function IMessageOverlay({ globalFrame }: { globalFrame: number }) {
  const active = ALL_CALLOUTS.filter(c => globalFrame >= c.from && globalFrame < c.to);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 90 }}>
      {active.map((c, i) => (
        <IMessageCard key={c.from} callout={c} slotIndex={i} globalFrame={globalFrame} />
      ))}
    </AbsoluteFill>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Concept Animations ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// 1. BrainAbsorbAnimation — Title, triggerFrame=100, brain absorbing data streams
function BrainAbsorbAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 380;
  const envelope = interpolate(f, [0, 14, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const pulse = Math.sin(f * 0.06) * 0.10 + 0.92;
  const brainScale = easeOutBack(prog(f, 22));

  // 4 corner data streams flowing in
  const streams = [
    { top: 0, left: 0, content: "</> code", angle: 45 },
    { top: 0, right: 0, content: "📚 books", angle: 135 },
    { bottom: 0, left: 0, content: "🌐 web", angle: -45 },
    { bottom: 0, right: 0, content: "✨ wiki", angle: -135 },
  ];

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
    }}>
      <div style={{ position: "relative", width: 260 * S, height: 260 * S }}>
        {/* Brain center */}
        <div style={{
          width: 110 * S, height: 110 * S, borderRadius: "50%",
          background: "rgba(124,255,178,0.14)",
          border: `${3 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%,-50%) scale(${pulse * brainScale})`,
          boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.45)`,
          fontSize: 40 * S,
        }}>🧠</div>

        {/* Data streams flowing toward brain */}
        {streams.map((s, i) => {
          const delayF = 30 + i * 18;
          const itemF = Math.max(0, f - delayF);
          const flowOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          // Distance toward brain over time
          const dist = interpolate((itemF + i * 25) % 120, [0, 120], [110 * S, 50 * S], clamp);
          const rad = (s.angle * Math.PI) / 180;
          const offX = Math.cos(rad) * dist;
          const offY = Math.sin(rad) * dist;
          return (
            <div key={i} style={{
              position: "absolute",
              top: "50%", left: "50%",
              transform: `translate(calc(-50% + ${offX}px), calc(-50% + ${offY}px))`,
              opacity: flowOp,
              fontFamily: "'Space Mono', monospace",
              fontSize: 18 * S,
              color: C.primary,
              background: "rgba(0,0,0,0.7)",
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 8 * S,
              padding: `${6 * S}px ${10 * S}px`,
              whiteSpace: "nowrap" as const,
              boxShadow: `0 0 ${10 * S}px rgba(124,255,178,0.25)`,
            }}>
              {s.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 2. FourSourcesFlowAnimation — Scene1, triggerLocalFrame=251 (27.52s "這些文字從哪裡來?")
// Sources reveal at exact VTT timestamps:
//   公開網頁 at 29.24s → local 302 → step 51
//   書籍    at 52.04s → local 986 → step 735
//   程式碼   at 61.48s → local 1269 → step 1018
//   精選     at 71.08s → local 1557 → step 1306
// Last topic mention "對模型品質影響很大" at 76.72s → local 1726
// DURATION = (1726 - 251) + 90 = 1565
function FourSourcesFlowAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1565;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const sources = [
    { icon: "🌐", label: "公開網頁",   sub: "Common Crawl",   color: C.primary, appearsAt:   51 },
    { icon: "📚", label: "書籍 / 論文", sub: "PubMed · arXiv", color: C.yellow,  appearsAt:  735 },
    { icon: "💻", label: "程式碼",     sub: "GitHub OSS",     color: C.primary, appearsAt: 1018 },
    { icon: "✨", label: "精選資料",   sub: "Wikipedia",      color: C.yellow,  appearsAt: 1306 },
  ];

  return (
    <div style={{
      position: "absolute", right: 50 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 10 * S,
      width: 250 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em", marginBottom: 4 * S,
      }}>TRAINING DATA</div>
      {sources.map((src, i) => {
        const itemF = Math.max(0, f - src.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [30 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateX(${itemTx}px)`,
            display: "flex", alignItems: "center", gap: 10 * S,
            background: "rgba(0,0,0,0.82)",
            border: `1px solid ${src.color}44`,
            borderLeft: `3px solid ${src.color}`,
            borderRadius: 10 * S,
            padding: `${10 * S}px ${14 * S}px`,
            boxShadow: `0 0 ${10 * S}px ${src.color}11`,
          }}>
            <span style={{ fontSize: 22 * S, flexShrink: 0 }}>{src.icon}</span>
            <div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: src.color, fontWeight: "700", lineHeight: 1.2,
              }}>{src.label}</div>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, marginTop: 4 * S,
              }}>{src.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 3. LockUnlockAnimation — Scene2 Phase B, left side, triggerLocalFrame=792
// Three rules reveal at VTT:
//   第一 公開vs私下     at local 792  → step    0
//   第二 訓練vs對話     at local 1127 → step  335
//   第三 學的是語言模式 at local 1468 → step  676
// Last topic "學習語言規律" at local 1823. DURATION = 1823 - 792 + 90 = 1121
function LockUnlockAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1121;
  const envelope = interpolate(f, [0, 14, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const rules = [
    { left: { icon: "🔓", label: "公開" },  right: { icon: "🔒", label: "私下" }, caption: "只爬公開內容",   appearsAt:    0 },
    { left: { icon: "📥", label: "訓練資料" }, right: { icon: "💬", label: "對話記錄" }, caption: "兩者分開管理", appearsAt:  335 },
    { left: { icon: "🧠", label: "語言規律" }, right: { icon: "📇", label: "個人檔案" }, caption: "學模式·非檔案", appearsAt:  676 },
  ];

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
      width: 280 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>三個重要區別</div>
      {rules.map((r, i) => {
        const itemF = Math.max(0, f - r.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTy = interpolate(itemF, [0, 22], [20 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateY(${itemTy}px)`,
            background: "rgba(0,0,0,0.82)",
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 10 * S,
            padding: `${10 * S}px ${12 * S}px`,
            display: "flex", flexDirection: "column", gap: 8 * S,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 6 * S,
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6 * S,
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${8 * S}px`,
                flex: 1,
              }}>
                <span style={{ fontSize: 20 * S }}>{r.left.icon}</span>
                <span style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.primary, fontWeight: "700",
                }}>{r.left.label}</span>
              </div>
              <span style={{ color: C.muted, fontSize: 18 * S }}>vs</span>
              <div style={{
                display: "flex", alignItems: "center", gap: 6 * S,
                background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.12)`,
                borderRadius: 6 * S, padding: `${5 * S}px ${8 * S}px`,
                flex: 1,
              }}>
                <span style={{ fontSize: 20 * S }}>{r.right.icon}</span>
                <span style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text,
                }}>{r.right.label}</span>
              </div>
            </div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.muted, textAlign: "center" as const,
            }}>{r.caption}</div>
          </div>
        );
      })}
    </div>
  );
}

// 4. KnowledgeTimelineAnimation — Scene3 point 1, right side
// trigger at local 357 (180.76s "第一,AI的知識有邊界")
// Last topic "不是即時更新的百科全書" at 192.04s → local 695
// DURATION = (695 - 357) + 90 = 428
function KnowledgeTimelineAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 428;
  const envelope = interpolate(f, [0, 14, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const lineW = interpolate(f, [10, 80], [0, 220 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const cutoffOp = interpolate(f, [80, 110], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const cutoffPulse = Math.sin((f - 80) * 0.12) * 0.15 + 0.85;
  const labelOp = interpolate(f, [120, 150], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const unknownOp = interpolate(f, [180, 230], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 12 * S,
      width: 260 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>KNOWLEDGE BOUNDARY</div>

      {/* Timeline */}
      <div style={{ position: "relative", height: 100 * S, marginTop: 6 * S }}>
        {/* Base line */}
        <div style={{
          position: "absolute", top: 50 * S, left: 0,
          width: lineW, height: 4 * S,
          background: `linear-gradient(to right, ${C.primary}, ${C.primary})`,
          borderRadius: 2 * S,
          boxShadow: `0 0 ${8 * S}px ${C.primary}66`,
        }} />
        {/* Past area unknown extension */}
        <div style={{
          position: "absolute", top: 50 * S, left: 220 * S,
          width: interpolate(f, [110, 180], [0, 60 * S], { easing: E.outCubic, extrapolateRight: "clamp" }),
          height: 4 * S,
          background: "rgba(255,255,255,0.12)",
          borderRadius: 2 * S,
          opacity: cutoffOp,
        }} />

        {/* Cutoff bar */}
        <div style={{
          position: "absolute", top: 20 * S, left: 220 * S,
          width: 4 * S, height: 60 * S,
          background: C.yellow,
          opacity: cutoffOp * cutoffPulse,
          boxShadow: `0 0 ${10 * S}px ${C.yellow}`,
        }} />

        {/* Label TRAINING DATA */}
        <div style={{
          position: "absolute", top: 0, left: 0,
          opacity: labelOp,
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary,
        }}>← TRAINING</div>

        {/* Cutoff label */}
        <div style={{
          position: "absolute", top: 0, left: 200 * S,
          opacity: cutoffOp,
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.yellow,
          letterSpacing: "0.05em",
          whiteSpace: "nowrap" as const,
        }}>截止日</div>

        {/* Unknown label */}
        <div style={{
          position: "absolute", top: 80 * S, left: 220 * S,
          opacity: unknownOp,
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted,
          whiteSpace: "nowrap" as const,
        }}>? 不知道</div>
      </div>

      {/* Caption */}
      <div style={{
        opacity: unknownOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text, lineHeight: 1.5,
        background: C.yellowLight,
        border: `1px solid ${C.yellowBorder}`,
        borderRadius: 8 * S,
        padding: `${8 * S}px ${12 * S}px`,
      }}>非即時百科·有時間邊界</div>
    </div>
  );
}

// 5. BiasBarsAnimation — Scene3 point 2, left side
// trigger at local 784 (195.00s "第二,資料偏差會影響模型")
// Last topic "就是訓練資料比例的結果" at 209.76s → local 1227
// DURATION = (1227 - 784) + 90 = 533
function BiasBarsAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 533;
  const envelope = interpolate(f, [0, 14, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // EN bar grows first (203.36s "佔比高" → local 1035 → step 251)
  // ZH bar grows after (206.84s "英文AI表現" → local 1139 → step 355)
  const enWidth = interpolate(Math.max(0, f - 251), [0, 50], [0, 220 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const zhWidth = interpolate(Math.max(0, f - 355), [0, 50], [0, 55 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const captionOp = interpolate(Math.max(0, f - 410), [0, 30], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S,
      width: 260 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>DATA BIAS</div>

      {/* EN bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 * S }}>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.primary, fontWeight: "700",
        }}>🇺🇸 English</div>
        <div style={{
          width: enWidth, height: 22 * S,
          background: `linear-gradient(to right, ${C.primary}, rgba(124,255,178,0.6))`,
          borderRadius: 4 * S,
          boxShadow: `0 0 ${10 * S}px ${C.primary}44`,
        }} />
      </div>

      {/* ZH bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 * S }}>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.yellow, fontWeight: "700",
        }}>🇹🇼 中文</div>
        <div style={{
          width: zhWidth, height: 22 * S,
          background: `linear-gradient(to right, ${C.yellow}, rgba(255,209,102,0.6))`,
          borderRadius: 4 * S,
          boxShadow: `0 0 ${8 * S}px ${C.yellow}44`,
        }} />
      </div>

      {/* Caption */}
      <div style={{
        opacity: captionOp,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
        color: C.text, lineHeight: 1.5,
        background: "rgba(0,0,0,0.6)",
        border: `1px solid ${C.surfaceBorder}`,
        borderRadius: 8 * S,
        padding: `${8 * S}px ${12 * S}px`,
      }}>佔比高·模型表現好</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_04_28.title.to - SCENES_2026_04_28.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(60);
  const tagStyle = useFadeUp(80);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        paddingBottom: SUBTITLE_SAFE,
        paddingLeft: 80 * S, paddingRight: 80 * S,
        textAlign: "center",
      }}>
        {/* Badge */}
        <div style={{ ...badgeOp, marginBottom: 18 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
          }}>每日 AI 知識庫</span>
        </div>

        {/* H1 line 1 */}
        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 40 * S, color: C.text,
        }}>
          <WordReveal text="AI 訓練資料從哪來？" startFrame={10} staggerPerWord={6}
            fontSize={40 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 30 * S, color: C.primary,
        }}>
          <WordReveal text="你的資料有沒有在裡面" startFrame={28} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle,
          margin: 0, marginTop: 24 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
          maxWidth: 800 * S,
        }}>
          公開網頁 · 書籍 · 程式碼 · 精選資料——數兆文字單位餵給模型
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 20 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>訓練資料 · 公開內容 · 偏差 · 邊界</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation: BrainAbsorbAnimation at frame 100 */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <BrainAbsorbAnimation triggerFrame={100} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — AI 靠什麼學習？ ─────────────────────────────────────────────
// Single phase scene: header + 4 source cards revealing at VTT timestamps
// VTT anchors (local = global - 575):
//   22.28s → local  93   ("語言模型...數兆個文字單位")
//   27.52s → local 251   ("這些文字從哪裡來?") — animation trigger
//   29.24s → local 302   "第一個主要來源 公開網頁"
//   52.04s → local 986   "第二個來源 書籍學術論文"
//   61.48s → local 1269  "第三個來源 程式碼"
//   71.08s → local 1557  "最後 精選策劃資料"
function Scene1() {
  const HEADER_AT     = 0;
  const INTRO_AT      = 93;     // 22.28s
  const QUESTION_AT   = 251;    // 27.52s "這些文字從哪裡來?"
  const SRC1_AT       = 302;    // 29.24s 公開網頁
  const SRC2_AT       = 986;    // 52.04s 書籍
  const SRC3_AT       = 1269;   // 61.48s 程式碼
  const SRC4_AT       = 1557;   // 71.08s 精選
  const SOURCES_ANIM_AT = 251;  // animation trigger

  const dur = SCENES_2026_04_28.scene1.to - SCENES_2026_04_28.scene1.from;

  const headerStyle = useFadeUp(HEADER_AT);
  const introStyle  = useFadeUp(INTRO_AT);
  const questionStyle = useFadeIn(QUESTION_AT);
  const src1Style = useFadeUp(SRC1_AT);
  const src2Style = useFadeUp(SRC2_AT);
  const src3Style = useFadeUp(SRC3_AT);
  const src4Style = useFadeUp(SRC4_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Header */}
        <div style={{ ...headerStyle, marginBottom: 16 * S }}>
          <div style={{
            display: "inline-block",
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.1em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
            marginBottom: 12 * S,
          }}>第一段</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
            color: C.text, fontWeight: "900", lineHeight: 1.3,
          }}>AI 靠什麼學習？</div>
        </div>

        {/* Intro stat card */}
        <div style={{ ...introStyle, marginBottom: 16 * S }}>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 14 * S,
            padding: `${14 * S}px ${20 * S}px`,
            boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.05)`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 28 * S,
              color: C.primary, fontWeight: "700",
              textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.5)`,
              marginBottom: 6 * S,
            }}>數千億 ~ 數兆</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.muted, lineHeight: 1.5,
            }}>個文字單位餵給模型訓練</div>
          </div>
        </div>

        {/* Question prompt */}
        <div style={{ ...questionStyle, marginBottom: 14 * S }}>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
            color: C.yellow, fontWeight: "700",
          }}>這些文字從哪裡來？</div>
        </div>

        {/* 4 source cards */}
        <SourceCard style={src1Style} num="01" title="公開網頁" detail="Common Crawl 爬蟲整個網際網路——你的部落格、論壇回覆、公開貼文很可能都在裡面" color={C.primary} />
        <SourceCard style={src2Style} num="02" title="書籍 / 學術論文" detail="大量書籍文字 · PubMed · arXiv 等學術資料庫被廣泛收錄" color={C.yellow} />
        <SourceCard style={src3Style} num="03" title="程式碼" detail="GitHub 開源程式碼大量收集——這是 AI 寫程式特別強的原因" color={C.primary} />
        <SourceCard style={src4Style} num="04" title="精心策劃資料" detail="Wikipedia · 人工標註對話資料——量少但品質高，影響很大" color={C.yellow} />
      </ContentColumn>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <FourSourcesFlowAnimation triggerLocalFrame={SOURCES_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

function SourceCard({ style, num, title, detail, color }: {
  style: React.CSSProperties; num: string; title: string; detail: string; color: string;
}) {
  return (
    <div style={{ ...style, marginBottom: 12 * S }}>
      <div style={{
        background: `${color}10`,
        border: `1px solid ${color}55`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12 * S,
        padding: `${12 * S}px ${18 * S}px`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 6 * S,
        }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
            color, fontWeight: "700",
            textShadow: `0 0 ${8 * S}px ${color}66`,
          }}>{num}</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
            color: C.text, fontWeight: "700", lineHeight: 1.25,
          }}>{title}</span>
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, lineHeight: 1.55,
        }}>{detail}</div>
      </div>
    </div>
  );
}

// ── Scene2 — 你的資料有沒有在裡面？ ───────────────────────────────────────
// Phase A: 5 platform examples (local 0–714)
// Phase B: 3 important rules (local 792–1955)
// VTT anchors (local = global - 2814):
//   98.28s  → local  134  "答案是有"
//   103.84s → local  301  Medium/方格子
//   107.84s → local  421  Twitter/Facebook
//   110.84s → local  511  論壇/PTT
//   113.52s → local  591  GitHub/個人網站
//   117.60s → local  714  "不過有幾個重要的區別"
//   120.20s → local  792  Phase B start: 第一,公開內容才會被爬取
//   131.36s → local 1127  第二,訓練資料 vs 對話記錄
//   142.72s → local 1468  第三,AI學的是語言模式
function Scene2() {
  const frame = useCurrentFrame();
  const HEADER_AT  = 0;
  const ANSWER_AT  = 134;
  const PLAT1_AT   = 301;
  const PLAT2_AT   = 421;
  const PLAT3_AT   = 511;
  const PLAT4_AT   = 591;
  const TRANS_AT   = 714;

  // Phase A→B (rule 0b): A_FADE_START = 792 - 80 = 712, A_REMOVE = 792
  const A_FADE_START = 712;
  const A_REMOVE     = 792;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT  = 792;
  const RULE1_AT   = 792;
  const RULE2_AT   = 1127;
  const RULE3_AT   = 1468;
  const LOCK_ANIM_AT = 792;
  const showB        = frame >= B_SHOW_AT;

  const dur = SCENES_2026_04_28.scene2.to - SCENES_2026_04_28.scene2.from;

  const headerStyle = useFadeUp(HEADER_AT);
  const answerStyle = useFadeUp(ANSWER_AT);
  const plat1Style  = useFadeUp(PLAT1_AT);
  const plat2Style  = useFadeUp(PLAT2_AT);
  const plat3Style  = useFadeUp(PLAT3_AT);
  const plat4Style  = useFadeUp(PLAT4_AT);
  const transStyle  = useFadeIn(TRANS_AT);

  const phaseBHeaderStyle = useFadeUp(showB ? B_SHOW_AT : 999999);
  const rule1Style = useFadeUp(showB ? RULE1_AT : 999999);
  const rule2Style = useFadeUp(showB ? RULE2_AT : 999999);
  const rule3Style = useFadeUp(showB ? RULE3_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ─────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 16 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
                marginBottom: 12 * S,
              }}>第二段</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "900", lineHeight: 1.3,
              }}>你的資料有沒有在裡面？</div>
            </div>

            {/* Big answer */}
            <div style={{ ...answerStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted, marginBottom: 6 * S,
                }}>如果你在網路上有任何公開內容</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 30 * S,
                  color: C.primary, fontWeight: "900", lineHeight: 1.2,
                  textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.4)`,
                }}>答案很可能是：有</div>
              </div>
            </div>

            {/* Platform list */}
            <div style={{ marginBottom: 14 * S }}>
              <PlatformItem style={plat1Style} icon="📝" text="Medium / 方格子的文章" />
              <PlatformItem style={plat2Style} icon="🐦" text="Twitter / Facebook 公開貼文" />
              <PlatformItem style={plat3Style} icon="💬" text="論壇 / PTT 留言" />
              <PlatformItem style={plat4Style} icon="🔧" text="GitHub 程式碼 · 個人網站" />
            </div>

            {/* Transition cue */}
            <div style={{ ...transStyle }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                color: C.yellow, fontWeight: "700",
              }}>不過——有幾個重要的區別</div>
            </div>
          </div>
        )}

        {/* ── Phase B ─────────────────────── */}
        {showB && (
          <>
            <div style={{ ...phaseBHeaderStyle, marginBottom: 16 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
              }}>三個重要的區別</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "900", lineHeight: 1.3,
              }}>不是所有東西都會被收進訓練</div>
            </div>

            <RuleCard style={rule1Style} num="01"
              title="公開內容才會被爬取"
              detail="私下傳的訊息、不公開帳號理論上不在範疇——但這取決於平台的資料政策"
              color={C.primary} />
            <RuleCard style={rule2Style} num="02"
              title="訓練資料 ≠ 對話記錄"
              detail="兩者分開管理。多數 AI 公司允許你在設定頁面選擇退出對話記錄訓練"
              color={C.primary} />
            <RuleCard style={rule3Style} num="03"
              title="AI 學的是「語言模式」"
              detail="不是把你的個人資料建成資料庫——模型學的是語言規律，不會記住「某某人說過什麼」"
              color={C.yellow} />
          </>
        )}
      </ContentColumn>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <LockUnlockAnimation triggerLocalFrame={LOCK_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

function PlatformItem({ style, icon, text }: {
  style: React.CSSProperties; icon: string; text: string;
}) {
  return (
    <div style={{ ...style, marginBottom: 8 * S }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12 * S,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 10 * S,
        padding: `${10 * S}px ${16 * S}px`,
      }}>
        <span style={{ fontSize: 24 * S }}>{icon}</span>
        <span style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.text, lineHeight: 1.5,
        }}>{text}</span>
      </div>
    </div>
  );
}

function RuleCard({ style, num, title, detail, color }: {
  style: React.CSSProperties; num: string; title: string; detail: string; color: string;
}) {
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        background: `${color}10`,
        border: `1px solid ${color}55`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12 * S,
        padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 8 * S,
        }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
            color, fontWeight: "700",
            textShadow: `0 0 ${8 * S}px ${color}66`,
          }}>{num}</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
            color: C.text, fontWeight: "700", lineHeight: 1.25,
          }}>{title}</span>
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, lineHeight: 1.55,
        }}>{detail}</div>
      </div>
    </div>
  );
}

// ── Scene3 — 對你的意義 ────────────────────────────────────────────────
// Phase A: intro/header (local 0–277)
// Phase B: 4 numbered insights revealing (local 357 onwards)
// VTT anchors (local = global - 5066):
//   168.88s → local    0  "第三站,這件事對你意味著什麼?"
//   171.96s → local   92  "瞭解訓練資料不只是知道"
//   176.28s → local  222  "幫你建立幾個更深層的認識"
//   180.76s → local  357  "第一,AI的知識有邊界"  — Phase B start
//   195.00s → local  784  "第二,資料偏差會影響模型"
//   213.28s → local 1332  "第三,你有查詢和選擇退出的權利"
//   228.52s → local 1790  "第四,公開就意味著可能被使用"
function Scene3() {
  const frame = useCurrentFrame();

  const HEADER_AT   = 0;
  const SUBHEAD_AT  = 92;
  const HIGHLIGHT_AT = 222;

  // Phase A→B
  const A_FADE_START = 277;  // 357 - 80
  const A_REMOVE     = 357;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT    = 357;
  const POINT1_AT    = 357;
  const POINT2_AT    = 784;
  const POINT3_AT    = 1332;
  const POINT4_AT    = 1790;
  const KNOWLEDGE_ANIM_AT = 357;
  const BIAS_ANIM_AT      = 784;
  const showB        = frame >= B_SHOW_AT;

  // Scroll up: 4 insight cards may overflow CONTENT_H = 1620px
  // Each card ~360px, 4 cards = 1440px + header ~80px + gaps ~60px = 1580px → fits, no scroll needed
  // But to be safe with longer descriptions, scroll up at point 4
  const SCROLL_AT = POINT4_AT;
  const SCROLL_AMOUNT = 280;  // shift up to keep point 4 visible above subtitle safe zone

  const dur = SCENES_2026_04_28.scene3.to - SCENES_2026_04_28.scene3.from;

  const headerStyle    = useFadeUp(HEADER_AT);
  const subheadStyle   = useFadeUp(SUBHEAD_AT);
  const highlightStyle = useFadeIn(HIGHLIGHT_AT);

  const phaseBHeaderStyle = useFadeUp(showB ? B_SHOW_AT : 999999);
  const point1Style = useFadeUp(showB ? POINT1_AT + 60 : 999999);
  const point2Style = useFadeUp(showB ? POINT2_AT : 999999);
  const point3Style = useFadeUp(showB ? POINT3_AT : 999999);
  const point4Style = useFadeUp(showB ? POINT4_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn scrollUp={{ at: SCROLL_AT, amount: SCROLL_AMOUNT }}>
        {/* ── Phase A ─────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerStyle, marginBottom: 16 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
                marginBottom: 12 * S,
              }}>第三段</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 24 * S,
                color: C.text, fontWeight: "900", lineHeight: 1.3,
              }}>這件事對你意味著什麼？</div>
            </div>

            <div style={{ ...subheadStyle, marginBottom: 18 * S }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                color: C.muted, lineHeight: 1.6,
              }}>
                了解訓練資料，不只是知道「我的資料有沒有被用」
              </div>
            </div>

            <div style={{ ...highlightStyle }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: "700", lineHeight: 1.4,
                }}>而是建立四個更深層的認識</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ─────────────────── */}
        {showB && (
          <>
            <div style={{ ...phaseBHeaderStyle, marginBottom: 14 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.muted, letterSpacing: "0.08em",
              }}>四個深層認識</div>
            </div>

            <InsightCard style={point1Style} num="01"
              title="AI 的知識有邊界"
              detail="訓練資料有截止日期，之後的事 AI 不知道——它不是即時更新的百科全書"
              color={C.primary} />
            <InsightCard style={point2Style} num="02"
              title="資料偏差會影響模型"
              detail="某語言/文化佔比高，模型在那方向就更好——英文 AI 表現通常優於中文，就是比例的結果"
              color={C.yellow} />
            <InsightCard style={point3Style} num="03"
              title="你有查詢和退出的權利"
              detail="多數 AI 公司提供說明：收集了什麼、如何使用、怎麼選擇——值得了解，知情地做選擇"
              color={C.primary} />
            <InsightCard style={point4Style} num="04"
              title="公開就意味著可能被使用"
              detail="這不是 AI 時代才有的問題，但 AI 讓它更直接——你願意公開、甚至被學習嗎？"
              color={C.yellow} />
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <KnowledgeTimelineAnimation triggerLocalFrame={KNOWLEDGE_ANIM_AT} />
        <BiasBarsAnimation triggerLocalFrame={BIAS_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

function InsightCard({ style, num, title, detail, color }: {
  style: React.CSSProperties; num: string; title: string; detail: string; color: string;
}) {
  return (
    <div style={{ ...style, marginBottom: 12 * S }}>
      <div style={{
        background: `${color}10`,
        border: `1px solid ${color}55`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12 * S,
        padding: `${12 * S}px ${18 * S}px`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 6 * S,
        }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
            color, fontWeight: "700",
            textShadow: `0 0 ${8 * S}px ${color}66`,
          }}>{num}</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
            color: C.text, fontWeight: "700", lineHeight: 1.25,
          }}>{title}</span>
        </div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, lineHeight: 1.55,
        }}>{detail}</div>
      </div>
    </div>
  );
}

// ── SummaryScene — 重點整理 ──────────────────────────────────────────────
// VTT anchors (local = global - 7660):
//   255.32s → local    0  "好,快速整理今天的三個重點"
//   257.20s → local   56  "第一,訓練資料來源"
//   268.08s → local  382  "第二,你的資料在裡面嗎"
//   276.84s → local  645  "第三,給使用者的意義"
//   285.48s → local  904  "這裡是每日AI知識庫"
function SummaryScene() {
  const dur = SCENES_2026_04_28.summary.to - SCENES_2026_04_28.summary.from;

  const BADGE_AT  = 0;
  const CARD1_AT  = 56;
  const CARD2_AT  = 382;
  const CARD3_AT  = 645;
  const OUTRO_AT  = 904;

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{ ...badgeStyle, marginBottom: 18 * S, marginTop: 24 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
          }}>
            <WordReveal text="重點整理" startFrame={4} staggerPerWord={5}
              fontSize={18 * S} color={C.primary}
              fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
          </span>
        </div>

        <SummaryCard
          number="01" delay={CARD1_AT}
          text="訓練資料來源——公開網頁、書籍、程式碼、精選資料集，數量以兆計"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="02" delay={CARD2_AT}
          text="你的資料在裡面嗎——公開內容很可能有；私人內容和對話記錄有各自政策規範"
          color={C.primary} border={C.primary}
        />
        <SummaryCard
          number="03" delay={CARD3_AT}
          text="對使用者的意義——了解資料來源，幫你理解 AI 的偏差與邊界，也認識自己的資料權利"
          color={C.yellow} border={C.yellow}
        />

        {/* Outro */}
        <div style={{ ...outroStyle, marginTop: 14 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.08em", textAlign: "center" as const,
          }}>每日 AI 知識庫</div>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

function SummaryCard({ number, text, delay, color, border }: {
  number: string; text: string; delay: number; color: string; border: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div style={{
        display: "flex", gap: 14 * S, alignItems: "flex-start",
        background: `${border}12`,
        border: `1px solid ${border}`,
        borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
          color, fontWeight: "700", flexShrink: 0, marginTop: 2 * S,
          textShadow: `0 0 ${10 * S}px ${color}88`,
        }}>{number}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
          color: C.text, lineHeight: 1.6,
        }}>{text}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Composition ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export function VideoComposition_2026_04_28() {
  const frame = useCurrentFrame();
  const T  = SCENES_2026_04_28.title;
  const S1 = SCENES_2026_04_28.scene1;
  const S2 = SCENES_2026_04_28.scene2;
  const S3 = SCENES_2026_04_28.scene3;
  const SU = SCENES_2026_04_28.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-28-processed.wav")} volume={1.0} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_04_28 - 150, TOTAL_FRAMES_2026_04_28],
            [v, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return Math.min(fi, fo);
        }}
        loop
      />

      <Background />

      {/* TitleScene */}
      <Sequence from={T.from} durationInFrames={T.to - T.from}>
        <TitleScene />
      </Sequence>

      {/* Scene 1 — AI 靠什麼學習 */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — 你的資料有沒有在裡面 */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — 對你的意義 */}
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
