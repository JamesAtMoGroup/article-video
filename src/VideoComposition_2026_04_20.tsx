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
const CONTENT_TOP   = NAV_H + CONTENT_GAP;      // 180px
const CONTENT_H     = H - CONTENT_TOP - SUBTITLE_SAFE; // 1620px

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
// TitleScene: 0s–14.08s   → 0–422
// Scene1:     14.08s–80.5s → 422–2415
// Scene2:     80.5s–168.02s → 2415–5041
// Scene3:     168.02s–235.86s → 5041–7076
// Summary:    235.86s–261.54s → 7076–7846
export const SCENES_2026_04_20 = {
  title:   { from: 0,    to: 422  },
  scene1:  { from: 422,  to: 2415 },
  scene2:  { from: 2415, to: 5041 },
  scene3:  { from: 5041, to: 7076 },
  summary: { from: 7076, to: 7846 },
} as const;
export const TOTAL_FRAMES_2026_04_20 = 7846;

const CHAPTERS = [
  { label: "今日主題",      start: 0    },
  { label: "什麼是開源/閉源", start: 422  },
  { label: "優缺點對比",    start: 2415 },
  { label: "實際怎麼選",    start: 5041 },
  { label: "重點整理",      start: 7076 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 2163, to: 2413, sender: "想一想",  text: "如果一個 AI 模型完全公開，你第一個反應是：好耶可以研究，還是這樣不會被濫用嗎？" },
  { from: 4840, to: 5038, sender: "你確定嗎", text: "你現在用的 AI 服務，你確定知道你的輸入資料有沒有被拿去訓練嗎？" },
  { from: 6907, to: 7073, sender: "備案計畫", text: "你現在在用的 AI 工具，如果明天漲價 50%，你有備案嗎？" },
];

// ── Easing tokens ──────────────────────────────────────────────────────────
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
        background: "radial-gradient(circle, rgba(124,255,178,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: 700 * S, height: 700 * S, top: 300 * S, right: -100 * S,
        background: "radial-gradient(circle, rgba(255,209,102,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)`,
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
          fontSize: 12 * S, color: C.muted,
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
    ? interpolate(remaining, [0, FADE_OUT_FRAMES], [0, 1], clamp) : 1;
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
      <div style={{ display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 6 * S }}>
        <div style={{
          width: 10 * S, height: 10 * S, borderRadius: "50%", background: C.primary,
          boxShadow: `0 0 ${6 * S}px ${C.primary}`,
        }} />
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.primary,
          letterSpacing: "0.05em",
        }}>{callout.sender}</span>
      </div>
      <div style={{
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S, color: C.text,
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

// 1. OpenClosedDoorAnimation — TitleScene global=200, DURATION=200
// Visual: Open unlocked box (開源) vs locked vault (閉源)
function OpenClosedDoorAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 200;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const leftScale = easeOutBack(prog(f, 22));
  const rightScale = easeOutBack(prog(Math.max(0, f - 14), 22));
  const dividerOp = interpolate(Math.max(0, f - 30), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 80 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12 * S,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 * S }}>
        {/* Open box — 開源 */}
        <div style={{
          transform: `scale(${leftScale})`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
          background: C.primaryLight,
          border: `2px solid ${C.primary}`,
          borderRadius: 12 * S,
          padding: `${10 * S}px ${14 * S}px`,
          boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.3)`,
          minWidth: 100 * S,
        }}>
          <span style={{ fontSize: 24 * S }}>🔓</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
            color: C.primary, fontWeight: "700",
          }}>開源</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 11 * S,
            color: C.muted, textAlign: "center" as const,
          }}>可下載・可修改</span>
        </div>

        {/* Divider */}
        <div style={{
          opacity: dividerOp,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * S,
        }}>
          <div style={{
            width: 2 * S, height: 40 * S,
            background: "rgba(255,255,255,0.15)",
          }} />
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.muted,
          }}>vs</span>
          <div style={{
            width: 2 * S, height: 40 * S,
            background: "rgba(255,255,255,0.15)",
          }} />
        </div>

        {/* Vault — 閉源 */}
        <div style={{
          transform: `scale(${rightScale})`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
          background: C.redLight,
          border: `2px solid ${C.redBorder}`,
          borderRadius: 12 * S,
          padding: `${10 * S}px ${14 * S}px`,
          minWidth: 100 * S,
        }}>
          <span style={{ fontSize: 24 * S }}>🔒</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
            color: C.red, fontWeight: "700",
          }}>閉源</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 11 * S,
            color: C.muted, textAlign: "center" as const,
          }}>僅能透過 API</span>
        </div>
      </div>
    </div>
  );
}

// 2. PhilosophyScaleAnimation — Scene1 local=1083, DURATION=748
// Visual: Balance scale — 🌐 共享哲學 vs 🏢 資產哲學
function PhilosophyScaleAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 748;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const poleScale = easeOutBack(prog(f, 20));
  const leftArmOp = interpolate(Math.max(0, f - 20), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const rightArmOp = interpolate(Math.max(0, f - 35), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const leftTilt = interpolate(Math.max(0, f - 50), [0, 40], [0, -8], { easing: E.outQuart, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * S,
      width: 240 * S,
    }}>
      {/* Scale beam */}
      <div style={{
        position: "relative",
        transform: `scaleY(${poleScale})`,
        transformOrigin: "bottom",
      }}>
        {/* Vertical pole */}
        <div style={{
          width: 4 * S, height: 60 * S, margin: "0 auto",
          background: `linear-gradient(to top, ${C.primary}, rgba(124,255,178,0.4))`,
          borderRadius: 2 * S,
        }} />
        {/* Horizontal beam */}
        <div style={{
          position: "absolute", top: 0, left: "50%",
          width: 180 * S, height: 4 * S,
          transform: `translateX(-50%) rotate(${leftTilt}deg)`,
          background: C.primary,
          borderRadius: 2 * S,
          transformOrigin: "center",
          boxShadow: `0 0 ${10 * S}px rgba(124,255,178,0.4)`,
        }} />
      </div>

      {/* Two sides */}
      <div style={{ display: "flex", gap: 12 * S, alignItems: "flex-start" }}>
        {/* Left: 開源哲學 */}
        <div style={{
          opacity: leftArmOp,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
          background: C.primaryLight,
          border: `1px solid ${C.primaryBorder}`,
          borderRadius: 10 * S,
          padding: `${8 * S}px ${10 * S}px`,
          flex: 1,
        }}>
          <span style={{ fontSize: 18 * S }}>🌐</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
            color: C.primary, fontWeight: "700", textAlign: "center" as const,
          }}>共享哲學</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 11 * S,
            color: C.muted, textAlign: "center" as const, lineHeight: 1.5,
          }}>資訊共享・大家一起參與</span>
        </div>

        {/* Right: 閉源哲學 */}
        <div style={{
          opacity: rightArmOp,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid rgba(255,255,255,0.12)`,
          borderRadius: 10 * S,
          padding: `${8 * S}px ${10 * S}px`,
          flex: 1,
        }}>
          <span style={{ fontSize: 18 * S }}>🏢</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
            color: C.muted, fontWeight: "700", textAlign: "center" as const,
          }}>資產哲學</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 11 * S,
            color: C.muted, textAlign: "center" as const, lineHeight: 1.5,
          }}>核心資產・嚴格管控</span>
        </div>
      </div>
    </div>
  );
}

// 3. OpenSourceServerAnimation — Scene2 local=163, DURATION=450
// Visual: Server icon with data locked safely inside, no outgoing arrows → 可控性
function OpenSourceServerAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 450;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const serverScale = easeOutBack(prog(f, 22));
  const shieldOp = interpolate(Math.max(0, f - 25), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const labelOp = interpolate(Math.max(0, f - 50), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const pulse = Math.sin(f * 0.05) * 0.08 + 1.0;

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
    }}>
      {/* Server box */}
      <div style={{
        transform: `scale(${serverScale * pulse})`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * S,
        background: C.primaryLight,
        border: `2px solid ${C.primary}`,
        borderRadius: 14 * S,
        padding: `${12 * S}px ${16 * S}px`,
        boxShadow: `0 0 ${25 * S}px rgba(124,255,178,0.35)`,
        minWidth: 120 * S,
      }}>
        <span style={{ fontSize: 26 * S }}>🖥️</span>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
          color: C.primary, letterSpacing: "0.08em",
        }}>你的伺服器</span>
        {/* Data inside */}
        <div style={{
          opacity: shieldOp,
          background: "rgba(0,0,0,0.4)",
          border: `1px solid rgba(124,255,178,0.2)`,
          borderRadius: 8 * S,
          padding: `${4 * S}px ${8 * S}px`,
          display: "flex", alignItems: "center", gap: 6 * S,
        }}>
          <span style={{ fontSize: 12 * S }}>🔐</span>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 11 * S, color: C.text,
          }}>資料留在本地</span>
        </div>
      </div>

      {/* Cross / Block outgoing */}
      <div style={{
        opacity: labelOp,
        display: "flex", alignItems: "center", gap: 8 * S,
      }}>
        <span style={{ fontSize: 14 * S, color: C.red }}>✕</span>
        <span style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
          color: C.muted,
        }}>不用傳給任何人</span>
      </div>
    </div>
  );
}

// 4. DataLeakRiskAnimation — Scene2 local=1897, DURATION=720
// Visual: Data flow → Cloud → ??? training, showing privacy risk
function DataLeakRiskAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 720;
  const envelope = interpolate(f, [0, 10, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const yourDataScale = easeOutBack(prog(f, 20));
  const arrowW = interpolate(Math.max(0, f - 20), [0, 25], [0, 45 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
  const cloudOp = interpolate(Math.max(0, f - 40), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const qMarkOp = interpolate(Math.max(0, f - 70), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const warningOp = interpolate(Math.max(0, f - 100), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const flashCycle = Math.sin(f * 0.08) * 0.2 + 0.8;

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * S,
      width: 230 * S,
    }}>
      {/* Flow diagram: Your Input → Cloud → ??? */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 * S }}>
        {/* Your input */}
        <div style={{
          transform: `scale(${yourDataScale})`,
          background: "rgba(255,255,255,0.08)",
          border: `1px solid rgba(255,255,255,0.15)`,
          borderRadius: 8 * S,
          padding: `${6 * S}px ${8 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3 * S,
        }}>
          <span style={{ fontSize: 16 * S }}>📝</span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.muted,
          }}>你的輸入</span>
        </div>

        {/* Arrow */}
        <div style={{
          width: arrowW, height: 3 * S,
          background: `linear-gradient(to right, rgba(255,107,107,0.5), ${C.red})`,
          borderRadius: 2 * S, position: "relative",
        }}>
          <div style={{
            position: "absolute", right: -1, top: "50%",
            transform: "translateY(-50%)",
            fontSize: 10 * S, color: C.red,
          }}>▶</div>
        </div>

        {/* Cloud */}
        <div style={{
          opacity: cloudOp,
          background: "rgba(255,255,255,0.06)",
          border: `1px solid rgba(255,255,255,0.12)`,
          borderRadius: 10 * S,
          padding: `${6 * S}px ${8 * S}px`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 3 * S,
        }}>
          <span style={{ fontSize: 16 * S }}>☁️</span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.muted,
          }}>廠商伺服器</span>
        </div>

        {/* Arrow to unknown */}
        <div style={{
          opacity: qMarkOp,
          width: 20 * S, height: 3 * S,
          background: `linear-gradient(to right, rgba(255,107,107,0.4), rgba(255,107,107,0.1))`,
          borderRadius: 2 * S,
        }} />

        {/* Question mark */}
        <div style={{
          opacity: qMarkOp * flashCycle,
          fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
          color: C.red,
          textShadow: `0 0 ${14 * S}px rgba(255,107,107,0.6)`,
        }}>?</div>
      </div>

      {/* Warning label */}
      <div style={{
        opacity: warningOp,
        background: C.redLight,
        border: `1px solid ${C.redBorder}`,
        borderRadius: 8 * S,
        padding: `${5 * S}px ${10 * S}px`,
        display: "flex", alignItems: "center", gap: 6 * S,
      }}>
        <span style={{ fontSize: 14 * S }}>⚠️</span>
        <span style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S, color: C.red,
        }}>可能被用來訓練</span>
      </div>
    </div>
  );
}

// 5. OpenSourceCatchUpAnimation — Scene3 local=1501, DURATION=455
// Visual: Two progress bars — open source catching up to closed source
function OpenSourceCatchUpAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 455;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const labelOp = interpolate(f, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // Closed bar: stays at 100%
  const closedW = interpolate(Math.max(0, f - 5), [0, 30], [0, 1], { easing: E.outExpo, extrapolateRight: "clamp" });
  // Open bar: animates from ~60% to 95% to show catching up
  const openP = interpolate(Math.max(0, f - 20), [0, 80], [0.6, 0.96], { easing: E.outExpo, extrapolateRight: "clamp" });
  const openW = interpolate(Math.max(0, f - 20), [0, 80], [0, openP], { easing: E.outExpo, extrapolateRight: "clamp" });
  const trendLabelOp = interpolate(Math.max(0, f - 100), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 220 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 10 * S,
      width: 220 * S,
    }}>
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>性能趨勢對比</div>

      {/* Closed source bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 * S }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S, color: C.muted,
          }}>閉源旗艦</span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.muted,
          }}>100%</span>
        </div>
        <div style={{
          height: 8 * S, background: "rgba(255,255,255,0.08)",
          borderRadius: 4 * S, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${closedW * 100}%`,
            background: "rgba(255,255,255,0.3)", borderRadius: 4 * S,
          }} />
        </div>
      </div>

      {/* Open source bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 * S }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S, color: C.primary,
          }}>開源模型</span>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S, color: C.primary,
          }}>↑ 追上中</span>
        </div>
        <div style={{
          height: 8 * S, background: "rgba(124,255,178,0.1)",
          borderRadius: 4 * S, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${openW * 100}%`,
            background: C.primary, borderRadius: 4 * S,
            boxShadow: `0 0 ${8 * S}px rgba(124,255,178,0.5)`,
          }} />
        </div>
      </div>

      {/* Conclusion label */}
      <div style={{
        opacity: trendLabelOp,
        background: C.primaryLight,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S,
        padding: `${5 * S}px ${10 * S}px`,
        fontFamily: "'Noto Sans TC', sans-serif", fontSize: 14 * S,
        color: C.primary, textAlign: "center" as const,
      }}>開源不再是「將就」</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_20.title.to - SCENES_2026_04_20.title.from;
  const badgeOp   = useFadeIn(5);
  const subtitleS = useFadeUp(35);
  const tagS      = useFadeUp(50);

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
        <div style={{ ...badgeOp, marginBottom: 14 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
          }}>每日 AI 知識庫</span>
        </div>

        {/* H1 line 1 */}
        <h1 style={{ margin: 0, lineHeight: 1.15,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 38 * S, color: C.text }}>
          <WordReveal text="開源模型 vs 閉源模型" startFrame={10} staggerPerWord={6}
            fontSize={38 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 — neon green */}
        <h1 style={{ margin: 0, lineHeight: 1.2, marginTop: 4 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 28 * S, color: C.primary }}>
          <WordReveal text="你到底該選哪個？" startFrame={28} staggerPerWord={6}
            fontSize={28 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleS, marginTop: 20 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 20 * S, color: C.muted, lineHeight: 1.6,
        }}>
          AI 工具選擇的哲學之爭——開源的自由，閉源的便利
        </p>

        {/* Tags */}
        <div style={{ ...tagS, marginTop: 16 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>開源 · 閉源 · 隱私 · 成本 · 自主部署</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <OpenClosedDoorAnimation triggerFrame={200} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — 什麼是開源/閉源？ ────────────────────────────────────────────
// VTT local frame anchors (global - 422):
// 開源模型 at 22.86s → local 264
// 閉源模型 at 37.18s → local 693
// 這兩種路線哲學 at 50.18s → local 1083
// 開源派 at 60.5s → local 1393
// 閉源派 at 67.22s → local 1595
function OpenSourceBadge({ delay }: { delay: number }) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        display: "flex", gap: 8 * S, flexWrap: "wrap" as const,
      }}>
        {["Meta Llama", "Mistral", "DeepSeek"].map((name, i) => (
          <span key={i} style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.primary, background: C.primaryLight,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 4 * S, padding: `${3 * S}px ${8 * S}px`,
          }}>{name}</span>
        ))}
      </div>
    </div>
  );
}

function ClosedSourceBadge({ delay }: { delay: number }) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{ display: "flex", gap: 8 * S, flexWrap: "wrap" as const }}>
        {["GPT-4", "Claude", "Gemini"].map((name, i) => (
          <span key={i} style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.muted, background: "rgba(255,255,255,0.06)",
            border: `1px solid rgba(255,255,255,0.12)`,
            borderRadius: 4 * S, padding: `${3 * S}px ${8 * S}px`,
          }}>{name}</span>
        ))}
      </div>
    </div>
  );
}

function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_20.scene1.to - SCENES_2026_04_20.scene1.from;

  const INTRO_AT    = 0;
  const OPEN_AT     = 264;
  const CLOSED_AT   = 693;
  const PHILO_AT    = 1083;
  const OPEN_PHILO_AT  = 1393;
  const CLOSE_PHILO_AT = 1595;

  // Rule 1d: intro block (~443px) makes total exceed CONTENT_H=1620px → fade out before closePhiloS
  const INTRO_FADE_START = CLOSE_PHILO_AT - 120; // 1475
  const INTRO_REMOVE     = CLOSE_PHILO_AT - 10;  // 1585
  const showIntro        = frame < INTRO_REMOVE;
  const introFadeOpacity = frame > INTRO_FADE_START
    ? interpolate(frame, [INTRO_FADE_START, INTRO_REMOVE], [1, 0], clamp) : 1;

  const introS     = useFadeUp(INTRO_AT);
  const openCardS  = useFadeUp(OPEN_AT);
  const closedCardS = useFadeUp(CLOSED_AT);
  const philoS     = useFadeIn(PHILO_AT);
  const openPhiloS = useFadeUp(OPEN_PHILO_AT);
  const closePhiloS = useFadeUp(CLOSE_PHILO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Section badge + intro — fades out before closePhiloS to stay within CONTENT_H */}
        {showIntro && <div style={{ ...introS, marginBottom: 16 * S, opacity: introS.opacity * introFadeOpacity }}>
          <div style={{
            display: "inline-block",
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.primary, letterSpacing: "0.1em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${4 * S}px ${12 * S}px`,
            marginBottom: 10 * S,
          }}>什麼是開源 / 閉源？</div>
          <div style={{
            background: C.surface, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 14 * S, padding: `${14 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
              color: C.text, lineHeight: 1.6, fontWeight: "700",
            }}>說白了就是這個 AI 模型的核心</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.muted, lineHeight: 1.6, marginTop: 6 * S,
            }}>有沒有公開給大家看</div>
          </div>
        </div>}

        {/* 開源模型 card */}
        <div style={{ ...openCardS, marginBottom: 16 * S }}>
          <OpenSourceBadge delay={OPEN_AT} />
          <div style={{
            background: C.primaryLight,
            border: `1.5px solid ${C.primary}`,
            borderRadius: 14 * S,
            padding: `${14 * S}px ${20 * S}px`,
            boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.1)`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
              color: C.primary, letterSpacing: "0.1em", marginBottom: 8 * S,
            }}>🔓 開源模型</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.text, lineHeight: 1.65,
            }}>
              把整個訓練好的模型放出來，任何人都可以
              <span style={{ color: C.primary, fontWeight: "700" }}>下載、修改、自己部署</span>，甚至拿去做商業產品
            </div>
          </div>
        </div>

        {/* 閉源模型 card */}
        <div style={{ ...closedCardS, marginBottom: 16 * S }}>
          <ClosedSourceBadge delay={CLOSED_AT} />
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid rgba(255,255,255,0.12)`,
            borderRadius: 14 * S,
            padding: `${14 * S}px ${20 * S}px`,
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
              color: C.muted, letterSpacing: "0.1em", marginBottom: 8 * S,
            }}>🔒 閉源模型</div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.text, lineHeight: 1.65,
            }}>
              只能透過<span style={{ color: C.yellow, fontWeight: "700" }}>介面或 API</span> 使用，看不到裡面的東西，也動不了它的核心
            </div>
          </div>
        </div>

        {/* Philosophy divider */}
        <div style={{ ...philoS, marginBottom: 14 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.muted, letterSpacing: "0.1em",
            borderTop: `1px solid rgba(255,255,255,0.07)`,
            paddingTop: 14 * S,
          }}>兩種路線，代表不同的哲學</div>
        </div>

        {/* Open philosophy */}
        <div style={{ ...openPhiloS, marginBottom: 10 * S }}>
          <div style={{
            borderLeft: `3px solid ${C.primary}`,
            paddingLeft: 14 * S,
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.text, lineHeight: 1.65,
          }}>
            <span style={{ color: C.primary, fontWeight: "700" }}>開源派</span>相信資訊應該共享，讓更多人一起參與 AI 的發展
          </div>
        </div>

        {/* Closed philosophy */}
        <div style={{ ...closePhiloS }}>
          <div style={{
            borderLeft: `3px solid rgba(255,255,255,0.3)`,
            paddingLeft: 14 * S,
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.muted, lineHeight: 1.65,
          }}>
            <span style={{ color: C.text, fontWeight: "700" }}>閉源派</span>則認為模型是公司的核心資產，需要嚴格管控
          </div>
        </div>
      </ContentColumn>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <PhilosophyScaleAnimation triggerLocalFrame={PHILO_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — 優缺點對比 ────────────────────────────────────────────────────
// VTT local frame anchors (global - 2415):
// 先說開源模型的優勢 at 83.54s → local 91
// 第一可控性高 at 85.94s → local 163
// 第二客製化 at 97.94s → local 523
// 第三長期成本 at 106.82s → local 790
// 維護基礎設施挑戰 at 120.66s → local 1205
// 而且開源不代表安全 at 127.1s → local 1398  ← A_FADE_START
// 閉源模型優勢 at 134.38s → local 1616
// 但閉源挑戰 at 143.74s → local 1897
// 定價由廠商說了算 at 152.74s → local 2167

function AdvantageCard({ title, detail, icon, delay }: { title: string; detail: string; icon: string; delay: number }) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 14 * S }}>
      <div style={{
        background: C.primaryLight,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: 12 * S,
        padding: `${12 * S}px ${18 * S}px`,
        display: "flex", gap: 12 * S, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 20 * S, flexShrink: 0 }}>{icon}</span>
        <div>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
            color: C.primary, letterSpacing: "0.08em", marginBottom: 6 * S,
          }}>{title}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.text, lineHeight: 1.65,
          }}>{detail}</div>
        </div>
      </div>
    </div>
  );
}

function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_20.scene2.to - SCENES_2026_04_20.scene2.from;

  const INTRO_AT    = 0;
  const OPEN_ADV_AT = 91;
  const ADV1_AT     = 163;
  const ADV2_AT     = 523;
  const ADV3_AT     = 790;
  const CHAL_AT     = 1205;

  const A_FADE_START = 1398;
  const A_REMOVE     = A_FADE_START + 80;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT = A_REMOVE + 20;
  const CLOSED_ADV_AT = 1616;
  const CLOSED_CHAL_AT = 1897;
  const PRICING_AT = 2167;
  const showB = frame >= B_SHOW_AT;

  const introS   = useFadeUp(INTRO_AT);
  const openAdvS = useFadeIn(OPEN_ADV_AT);
  const chalS    = useFadeUp(CHAL_AT);
  const closedAdvS = useFadeUp(showB ? CLOSED_ADV_AT : 999999);
  const closedChalS = useFadeUp(showB ? CLOSED_CHAL_AT : 999999);
  const pricingS = useFadeUp(showB ? PRICING_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A: 開源優缺點 ─────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Intro */}
            <div style={{ ...introS, marginBottom: 14 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
              }}>優缺點怎麼看</div>
            </div>

            {/* Open source advantages section */}
            <div style={{ ...openAdvS, marginBottom: 12 * S }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "700",
              }}>
                <span style={{ color: C.primary }}>開源模型</span>的優勢
              </div>
            </div>

            <AdvantageCard
              icon="🏠" title="第一：可控性高" delay={ADV1_AT}
              detail="可以跑在自己的伺服器上，資料根本不用傳給別人。對醫療、法律這類隱私敏感的場景特別重要"
            />
            <AdvantageCard
              icon="🔧" title="第二：可以客製化" delay={ADV2_AT}
              detail="可以針對你的產業語言做 fine-tuning，讓模型更懂你在說什麼"
            />
            <AdvantageCard
              icon="💰" title="第三：長期成本可能更低" delay={ADV3_AT}
              detail="雖然自己部署需要算力，但比起按量計費的 API，長期下來通常划算"
            />

            {/* Challenge */}
            <div style={{ ...chalS }}>
              <div style={{
                background: C.yellowLight,
                border: `1px solid ${C.yellowBorder}`,
                borderRadius: 12 * S,
                padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.yellow, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>⚠ 開源的挑戰</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>
                  維護基礎設施需要技術能力，門檻不低。而且「開源」<span style={{ color: C.yellow, fontWeight: "700" }}>不代表安全</span>——任何人都能拿來用，包括想做壞事的人
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B: 閉源優缺點 ─────────────────── */}
        {showB && (
          <>
            {/* 閉源優勢 */}
            <div style={{ marginBottom: 12 * S }}>
              <div style={{
                ...closedAdvS,
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "700", marginBottom: 12 * S,
              }}>
                <span style={{ color: C.muted }}>閉源模型</span>的優勢
              </div>
            </div>

            <div style={{ ...closedAdvS, marginBottom: 14 * S }}>
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid rgba(255,255,255,0.12)`,
                borderRadius: 12 * S,
                padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>即插即用</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>文件完整、有安全過濾、API 穩定。出了問題有公司負責</div>
              </div>
            </div>

            {/* 閉源挑戰 */}
            <div style={{ ...closedChalS, marginBottom: 14 * S }}>
              <div style={{
                background: C.redLight,
                border: `1.5px solid ${C.redBorder}`,
                borderRadius: 12 * S,
                padding: `${12 * S}px ${18 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.red, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>⚠ 閉源的挑戰</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>
                  你的資料<span style={{ color: C.red, fontWeight: "700" }}>可能被拿去訓練</span>——要自己查隱私政策，不要假設它不會
                </div>
              </div>
            </div>

            {/* Pricing risk */}
            <div style={{ ...pricingS }}>
              <div style={{
                borderLeft: `3px solid ${C.red}`,
                paddingLeft: 14 * S,
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.muted, lineHeight: 1.65,
              }}>
                定價跟功能由廠商說了算，模型悄悄更新，你今天精心設計的 prompt，<span style={{ color: C.text }}>明天可能就沒效了</span>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <OpenSourceServerAnimation triggerLocalFrame={ADV1_AT} />
        <DataLeakRiskAnimation triggerLocalFrame={CLOSED_CHAL_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 實際怎麼選？ ──────────────────────────────────────────────────
// VTT local frame anchors (global - 5041):
// 第一你有多在意資料隱私 at 172.22s → local 126
// 優先考慮可本地部署 at 180.78s → local 341
// 第二你有沒有技術資源 at 184.38s → local 490
// 閉源API反而更省時間 at 194.74s → local 701
// 第三你的需求 at 198.46s → local 913
// 但如果需要微調 at 209.3s → local 1238
// 有一件很值得注意 at 215.54s → local 1425  ← A_FADE_START
// 現在很多開源模型已追上 at 218.06s → local 1501
// 選擇開源不再是將就 at 224.66s → local 1699

function QuestionCard({ number, question, answer, delay, color, border }: {
  number: string; question: string; answer: string;
  delay: number; color: string; border: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div style={{
        background: `${border}10`,
        border: `1.5px solid ${border}`,
        borderRadius: 14 * S,
        padding: `${14 * S}px ${20 * S}px`,
        display: "flex", gap: 14 * S, alignItems: "flex-start",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
          color, fontWeight: "700", flexShrink: 0, marginTop: 2 * S,
          textShadow: `0 0 ${10 * S}px ${color}88`,
        }}>{number}</div>
        <div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
            color, fontWeight: "700", lineHeight: 1.3, marginBottom: 8 * S,
          }}>{question}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.text, lineHeight: 1.65,
          }}>{answer}</div>
        </div>
      </div>
    </div>
  );
}

function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_20.scene3.to - SCENES_2026_04_20.scene3.from;

  const HEADER_AT = 0;
  const Q1_AT     = 126;
  const Q2_AT     = 490;
  const Q3_AT     = 913;

  const A_FADE_START = 1395;
  const A_REMOVE     = A_FADE_START + 80;
  const showA = frame < A_REMOVE;
  const aOpacity = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  const B_SHOW_AT   = A_REMOVE + 20;
  const TREND_AT    = 1501;
  const STRATEGY_AT = 1699;
  const showB = frame >= B_SHOW_AT;

  const headerS   = useFadeUp(HEADER_AT);
  const trendS    = useFadeUp(showB ? B_SHOW_AT : 999999);
  const strategyS = useFadeUp(showB ? STRATEGY_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A: 三個選擇問題 ─────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            <div style={{ ...headerS, marginBottom: 16 * S }}>
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                color: C.muted, letterSpacing: "0.08em", marginBottom: 8 * S,
              }}>實際怎麼選</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                color: C.text, fontWeight: "700",
              }}>你可以問自己三個問題</div>
            </div>

            <QuestionCard
              number="01" delay={Q1_AT}
              question="你有多在意資料隱私？"
              answer="工作涉及客戶個資或機密文件，優先考慮本地部署的開源模型，或有企業資料隔離保障的閉源服務"
              color={C.primary} border={C.primary}
            />
            <QuestionCard
              number="02" delay={Q2_AT}
              question="你有沒有技術資源？"
              answer="如果你或你的團隊沒有人懂怎麼架設，閉源 API 反而更省時間，不用糾結"
              color={C.yellow} border={C.yellow}
            />
            <QuestionCard
              number="03" delay={Q3_AT}
              question="你的需求是一般，還是高度專業化？"
              answer="文字生成、問答、摘要，閉源旗艦可能更順手；需要針對特定語料微調，開源的靈活性就很值錢"
              color={C.primary} border={C.primary}
            />
          </div>
        )}

        {/* ── Phase B: 開源追上的趨勢 ─────────── */}
        {showB && (
          <>
            {/* Trend card */}
            <div style={{ ...trendS, marginBottom: 16 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.12)`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 11 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 8 * S,
                }}>📈 值得注意的趨勢</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.65,
                }}>
                  現在很多開源模型已經<span style={{ color: C.primary, fontWeight: "700" }}>追上甚至超越</span>幾年前的頂尖閉源模型
                </div>
              </div>
            </div>

            {/* Strategy card */}
            <div style={{ ...strategyS }}>
              <div style={{
                borderLeft: `3px solid ${C.primary}`,
                paddingLeft: 16 * S,
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                color: C.text, lineHeight: 1.6, fontWeight: "700",
              }}>
                選擇開源，不再是「將就」——而是一種<span style={{ color: C.primary }}>有意識的策略選擇</span>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animation */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <OpenSourceCatchUpAnimation triggerLocalFrame={TREND_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene ─────────────────────────────────────────────────────────
// VTT local frames (global - 7076):
// 開源跟閉源的本質差異 at 238.02s → local 141
// 就是模型有沒有公開 at 240.58s → local 141 (same cue)
// 選擇的依據看三件事 at 245.78s → local 297
// 你的任務是通用型 at 252.7s → local 505
// 這裡是每日AI知識庫 at 257.38s → local 645

function SummaryCard2({ number, text, delay, color, border }: {
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
          fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
          color, fontWeight: "700", flexShrink: 0, marginTop: 2 * S,
          textShadow: `0 0 ${10 * S}px ${color}88`,
        }}>{number}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.text, lineHeight: 1.65,
        }}>{text}</div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_04_20.summary.to - SCENES_2026_04_20.summary.from;

  const BADGE_AT = 0;
  const CARD1_AT = 141;
  const CARD2_AT = 297;
  const CARD3_AT = 505;
  const OUTRO_AT = 645;

  const badgeS = useFadeIn(BADGE_AT);
  const outroS = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{ ...badgeS, marginBottom: 18 * S, marginTop: 24 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 14 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${5 * S}px ${14 * S}px`,
          }}>
            <WordReveal text="重點整理" startFrame={4} staggerPerWord={5}
              fontSize={14 * S} color={C.primary}
              fontFamily="'Space Mono', monospace" letterSpacing="0.12em" />
          </span>
        </div>

        <SummaryCard2
          number="01" delay={CARD1_AT} color={C.primary} border={C.primary}
          text="開源 vs 閉源的本質差異：模型有沒有公開、你能不能自己控制和部署"
        />
        <SummaryCard2
          number="02" delay={CARD2_AT} color={C.primary} border={C.primary}
          text="選擇時問三件事：資料隱私需求多高、有沒有技術資源、任務是通用型還是需要高度客製化"
        />
        <SummaryCard2
          number="03" delay={CARD3_AT} color={C.yellow} border={C.yellow}
          text="現在開源模型已追上頂尖閉源——選擇開源不再是將就，而是一種有意識的策略選擇"
        />

        {/* Outro */}
        <div style={{ ...outroS, marginTop: 10 * S }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 13 * S,
            color: C.muted, letterSpacing: "0.08em", textAlign: "center" as const,
          }}>每日 AI 知識庫</div>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Composition ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export function VideoComposition_2026_04_20() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_04_20.scene1;
  const S2 = SCENES_2026_04_20.scene2;
  const S3 = SCENES_2026_04_20.scene3;
  const SU = SCENES_2026_04_20.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-04-20-processed.wav")} volume={1.0} />
      <Audio src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_04_20 - 150, TOTAL_FRAMES_2026_04_20], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return Math.min(fi, fo);
        }}
        loop
      />

      <Background />

      {/* TitleScene */}
      <Sequence from={0} durationInFrames={S1.from}>
        <TitleScene />
      </Sequence>

      {/* Scene1 — 什麼是開源/閉源 */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene2 — 優缺點對比 */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene3 — 實際怎麼選 */}
      <Sequence from={S3.from} durationInFrames={S3.to - S3.from}>
        <Scene3 />
      </Sequence>

      {/* SummaryScene */}
      <Sequence from={SU.from} durationInFrames={SU.to - SU.from}>
        <SummaryScene />
      </Sequence>

      {/* Global overlays */}
      <ProgressBar globalFrame={frame} />
      <IMessageOverlay globalFrame={frame} />
    </AbsoluteFill>
  );
}
