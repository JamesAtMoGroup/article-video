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
const H = 720 * S;   // 2160
const NAV_H         = 50  * S;  // 150px
const CONTAINER_W   = 640 * S;  // 1920px
const COL_LEFT      = (W - CONTAINER_W) / 2;  // 960px
const SUBTITLE_SAFE = 120 * S;  // 360px
const CONTENT_GAP   = 10  * S;  // 30px
const CONTENT_TOP   = NAV_H + CONTENT_GAP;         // 180px
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
  muted:        "#a0a0a0",
  yellow:       "#ffd166",
  yellowLight:  "rgba(255,209,102,0.1)",
  yellowBorder: "rgba(255,209,102,0.25)",
  red:          "#ff6b6b",
  redLight:     "rgba(255,107,107,0.08)",
  redBorder:    "rgba(255,107,107,0.25)",
  blue:         "#7cc4ff",
  blueLight:    "rgba(124,196,255,0.08)",
  blueBorder:   "rgba(124,196,255,0.25)",
  purple:       "#c89dff",
  purpleLight:  "rgba(200,157,255,0.08)",
  purpleBorder: "rgba(200,157,255,0.25)",
} as const;

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W       = 320 * S;
const NOTIF_TOP     = 14  * S;
const NOTIF_RIGHT   = 20  * S;
const NOTIF_SLOT    = 170 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// TitleScene: 0–24.32s     → 0–730
// Scene1:     24.32–74.22s → 730–2227
// Scene2:     74.22–164.50s→ 2227–4935
// Scene3:     164.50–243.22s→ 4935–7297
// Scene4:     243.22–288.66s→ 7297–8660
export const SCENES_2026_05_14 = {
  title:   { from: 0,    to: 730   },
  scene1:  { from: 730,  to: 2227  },
  scene2:  { from: 2227, to: 4935  },
  scene3:  { from: 4935, to: 7297  },
  summary: { from: 7297, to: 8660  },
} as const;
export const TOTAL_FRAMES_2026_05_14 = 8660;

const CHAPTERS = [
  { label: "今日焦點",          start: 0    },
  { label: "多模態 AI 是什麼",  start: 730  },
  { label: "為什麼重要",        start: 2227 },
  { label: "工具與提醒",        start: 4935 },
  { label: "重點整理",          start: 7297 },
] as const;

// ── iMessage callouts (global frames) ─────────────────────────────────────
interface Callout { from: number; to: number; sender: string; text: string; }
const ALL_CALLOUTS: Callout[] = [
  { from: 1935, to: 2227, sender: "想一想", text: "你最近有沒有想直接給 AI 看圖，但卻覺得它看不懂而放棄？可以重新試試" },
  { from: 4700, to: 4935, sender: "思考一下", text: "你工作中有哪種情境，解釋很長卻只要一張圖就能說清楚？" },
  { from: 7115, to: 7297, sender: "想一想", text: "AI 能同時看你螢幕、聽你說話即時建議——你是期待還是不安？" },
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
  const op = interpolate(f, [0, 14], [0, 1],      { easing: E.outCubic, extrapolateRight: "clamp" });
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
        const op = interpolate(f, [0, 12], [0, 1],      { easing: E.outCubic, extrapolateRight: "clamp" });
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
        background: "radial-gradient(circle, rgba(124,196,255,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", borderRadius: "50%",
        width: 500 * S, height: 500 * S, bottom: 100 * S, left: 300 * S,
        background: "radial-gradient(circle, rgba(200,157,255,0.05) 0%, transparent 70%)",
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

// ── iMessage Callout system ────────────────────────────────────────────────
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
      padding: `${14 * S}px ${16 * S}px`,
      boxShadow: `0 ${8 * S}px ${24 * S}px rgba(0,0,0,0.6)`,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 8 * S,
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

// 1. ImageVsTextAnimation — TitleScene triggerFrame=150, DURATION=570
//    Visual: 圖片 → 翻譯成文字 (X) vs 直接給 AI 看 (✓)
function ImageVsTextAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 570;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Image card appears first
  const imgScale = easeOutBack(prog(f, 24));
  // Old path (text translation): appears at f=40, marks ❌ at f=150
  const oldPathOp = interpolate(Math.max(0, f - 40), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const xMarkOp   = interpolate(Math.max(0, f - 150), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  // New path (direct see): appears at f=220, ✓ at f=320
  const newPathOp = interpolate(Math.max(0, f - 220), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const newPathTy = interpolate(Math.max(0, f - 220), [0, 22], [18 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
  const checkOp   = interpolate(Math.max(0, f - 320), [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const checkScale = easeOutBack(prog(Math.max(0, f - 320), 22));

  return (
    <div style={{
      position: "absolute", right: 60 * S, top: 180 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S, width: 280 * S,
    }}>
      {/* Image card */}
      <div style={{
        transform: `scale(${imgScale})`,
        background: "rgba(255,255,255,0.06)",
        border: `2px solid rgba(255,255,255,0.18)`,
        borderRadius: 14 * S,
        padding: `${14 * S}px ${18 * S}px`,
        display: "flex", alignItems: "center", gap: 12 * S,
      }}>
        <div style={{ fontSize: 38 * S }}>📷</div>
        <div>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.06em",
          }}>一張圖片</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
            color: C.text, marginTop: 2 * S,
          }}>想問 AI 問題</div>
        </div>
      </div>

      {/* Old path: translate to text — ❌ */}
      <div style={{
        opacity: oldPathOp,
        display: "flex", alignItems: "center", gap: 10 * S,
        background: C.redLight, border: `1px solid ${C.redBorder}`,
        borderRadius: 12 * S, padding: `${10 * S}px ${14 * S}px`,
      }}>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, flex: 1,
        }}>打一大串描述...</div>
        <div style={{
          opacity: xMarkOp,
          fontFamily: "'Space Mono', monospace", fontSize: 24 * S,
          color: C.red, fontWeight: "700",
          textShadow: `0 0 ${10 * S}px ${C.red}88`,
        }}>✕</div>
      </div>

      {/* New path: direct image to AI — ✓ */}
      <div style={{
        opacity: newPathOp,
        transform: `translateY(${newPathTy}px)`,
        display: "flex", alignItems: "center", gap: 10 * S,
        background: C.primaryLight, border: `1.5px solid ${C.primary}`,
        borderRadius: 12 * S, padding: `${10 * S}px ${14 * S}px`,
        boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.18)`,
      }}>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.text, fontWeight: "700", flex: 1,
        }}>直接丟給 AI</div>
        <div style={{
          opacity: checkOp,
          transform: `scale(${checkScale})`,
          fontFamily: "'Space Mono', monospace", fontSize: 24 * S,
          color: C.primary, fontWeight: "700",
          textShadow: `0 0 ${12 * S}px ${C.primary}88`,
        }}>✓</div>
      </div>
    </div>
  );
}

// 2. ModalityHubAnimation — Scene1 PhaseA triggerLocal=337, DURATION=420
//    Visual: 4 個模態 icon 圍繞 AI 大腦，每個依序「點亮」並連線到中心
function ModalityHubAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 420;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Modalities — each appears in sync with VTT cue at 30.46s "文字一種、圖片一種..."
  // VTT 30.46 = local 6 (relative to trigger at 337 = 30.46-24.32 = 6.14s after scene start, but trigger is at scene_local 337 which is 35.6s after scene1 start = 35.6 - 24.32 = 11.28s into scene. Hmm let me recompute.)
  // Actually: speaker says modalities at 30.46s (global cue start). scene1 starts at 24.32s. So at scene_local 30.46-24.32=6.14s = 184 frames in scene1.
  // But my trigger is at scene_local 337. That corresponds to 30.46+(337-184)/30 = 35.5s = "多模態AI的意思..."
  // The 4-modality enumeration is at 30.46s "文字是一種模態,圖片是一種,聲音是一種,影片又是另一種"
  // The text/image/sound/video sub-mentions are evenly within that one cue (30.46-35.58s, ~5s span)
  // So each modality at: 30.46, 31.76, 33.06, 34.36 (in scene-local terms = frame 184, 223, 262, 302 relative to scene1 start)
  // Relative to my trigger 337: f=-153, -114, -75, -35 — all negative (triggered before).
  // OK my trigger 337 is at "多模態 AI 的意思" — by then modalities already mentioned.
  // Let me move trigger earlier to align with "文字是一種模態,圖片是一種..." at local 184.
  // But the rule allows trigger only at first sentence of topic. The "multimodal concept" topic starts at 27.90s "先來講一個概念" = local 108.
  // Better: trigger at local 184 (30.46s "文字是一種模態..." VTT cue).
  // But my plan said 337. Let me adjust — I'll use 184 as trigger and shift indices accordingly.

  // Now relative to triggerLocal=184:
  // - text mention at f=0 (30.46s)
  // - image at f=39 (31.76s estimate)
  // - sound at f=78 (33.06s)
  // - video at f=117 (34.36s)
  // - unified hub forms at f=160+
  const modalities = [
    { icon: "📝", label: "文字",    color: C.primary, appearsAt:   0, angle: -90 },
    { icon: "🖼️", label: "圖片",    color: C.blue,    appearsAt:  39, angle:   0 },
    { icon: "🎵", label: "聲音",    color: C.yellow,  appearsAt:  78, angle:  90 },
    { icon: "🎬", label: "影片",    color: C.purple,  appearsAt: 117, angle: 180 },
  ];

  // Brain appears around f=160 (after all modalities listed)
  const brainScale = easeOutBack(prog(Math.max(0, f - 160), 26));
  const brainPulse = Math.sin(f * 0.06) * 0.08 + 0.92;
  const labelOp = interpolate(Math.max(0, f - 200), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const RADIUS = 90 * S;
  const CENTER = 130 * S;

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * S,
    }}>
      <div style={{ position: "relative", width: CENTER * 2, height: CENTER * 2 }}>
        {/* Brain center */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: `translate(-50%,-50%) scale(${brainScale * brainPulse})`,
          width: 90 * S, height: 90 * S, borderRadius: "50%",
          background: "rgba(124,255,178,0.14)",
          border: `${3 * S}px solid ${C.primary}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 38 * S,
          boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.45)`,
        }}>🧠</div>

        {/* Modality icons positioned around brain */}
        {modalities.map((m, i) => {
          const itemF = Math.max(0, f - m.appearsAt);
          const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemScale = easeOutBack(prog(itemF, 22));
          const rad = (m.angle * Math.PI) / 180;
          const cx = CENTER + Math.cos(rad) * RADIUS;
          const cy = CENTER + Math.sin(rad) * RADIUS;
          // Connecting line opacity (after icon appears + 10f)
          const lineOp = interpolate(itemF, [10, 28], [0, 0.7], { easing: E.outCubic, extrapolateRight: "clamp" });
          // Line endpoints from center to icon
          const lineLen = RADIUS - 38 * S;
          return (
            <React.Fragment key={i}>
              {/* connecting line */}
              <div style={{
                position: "absolute",
                top: CENTER, left: CENTER,
                width: lineLen, height: 2 * S,
                background: `linear-gradient(to right, ${m.color}, ${m.color}33)`,
                opacity: lineOp,
                transform: `rotate(${m.angle}deg) translateX(${38 * S}px)`,
                transformOrigin: "left center",
              }} />
              {/* icon */}
              <div style={{
                position: "absolute",
                left: cx - 36 * S,
                top: cy - 36 * S,
                width: 72 * S, height: 72 * S,
                borderRadius: 14 * S,
                background: "rgba(0,0,0,0.85)",
                border: `2px solid ${m.color}`,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                opacity: itemOp,
                transform: `scale(${itemScale})`,
                boxShadow: `0 0 ${12 * S}px ${m.color}44`,
              }}>
                <span style={{ fontSize: 26 * S, lineHeight: 1 }}>{m.icon}</span>
                <span style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: m.color, fontWeight: "700", marginTop: 2 * S,
                }}>{m.label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Caption */}
      <div style={{
        opacity: labelOp,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.08em",
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
        textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.5)`,
      }}>MULTIMODAL AI</div>
    </div>
  );
}

// 3. ScreenshotAnimation — Scene1 PhaseB triggerLocal=667, DURATION=628
//    Visual: 螢幕截圖 (含 error) → AI 眼睛掃描 → 回答 bubble
function ScreenshotAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 628;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT (scene-local frames, scene1 starts at 730):
  // 46.58s "最直接的例子,你把一張螢幕截圖傳給Claude或GPT-4o" → local 667 (trigger)
  // 52.74s "問它,這個錯誤訊息是什麼意思" → local 852 → f=185
  // 56.82s "它能直接看圖片,給你解釋" → local 974 → f=307
  // 59.38s "你不需要把截圖裡的文字打出來" → local 1051 → f=384

  const ssScale = easeOutBack(prog(f, 26));
  const eyeOp = interpolate(Math.max(0, f - 185), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const eyeScale = easeOutBack(prog(Math.max(0, f - 185), 22));
  // scan line moves down across screenshot from f=185 to f=290
  const scanY = interpolate(Math.max(0, f - 185), [0, 105], [0, 100 * S], { easing: E.outQuart, extrapolateRight: "clamp" });
  const scanOp = interpolate(Math.max(0, f - 185), [0, 20, 90, 105], [0, 0.8, 0.8, 0], clamp);
  // response bubble at f=307
  const respOp = interpolate(Math.max(0, f - 307), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const respTy = interpolate(Math.max(0, f - 307), [0, 22], [18 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", gap: 14 * S, width: 280 * S,
    }}>
      {/* Screenshot frame with mock error */}
      <div style={{
        transform: `scale(${ssScale})`,
        background: "rgba(20,20,20,0.95)",
        border: `2px solid rgba(255,255,255,0.18)`,
        borderRadius: 10 * S,
        padding: `${10 * S}px ${12 * S}px`,
        position: "relative", overflow: "hidden",
      }}>
        {/* Window dots */}
        <div style={{ display: "flex", gap: 5 * S, marginBottom: 8 * S }}>
          <div style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: "#ff5f57" }} />
          <div style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: "#ffbd2e" }} />
          <div style={{ width: 8 * S, height: 8 * S, borderRadius: "50%", background: "#28c940" }} />
        </div>
        {/* Mock error text */}
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.red, lineHeight: 1.4,
        }}>Error 0x80004005</div>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.muted, lineHeight: 1.4, marginTop: 4 * S,
        }}>unspecified error</div>
        {/* Scan line */}
        <div style={{
          position: "absolute",
          left: 0, right: 0, top: 0,
          height: 3 * S,
          background: `linear-gradient(90deg, transparent, ${C.primary}, transparent)`,
          boxShadow: `0 0 ${8 * S}px ${C.primary}`,
          opacity: scanOp,
          transform: `translateY(${scanY}px)`,
        }} />
      </div>

      {/* AI eye scanning */}
      <div style={{
        opacity: eyeOp,
        transform: `scale(${eyeScale})`,
        display: "flex", alignItems: "center", gap: 10 * S,
        alignSelf: "center",
        background: "rgba(0,0,0,0.85)",
        border: `1.5px solid ${C.primary}`,
        borderRadius: 99,
        padding: `${8 * S}px ${16 * S}px`,
        boxShadow: `0 0 ${14 * S}px rgba(124,255,178,0.3)`,
      }}>
        <span style={{ fontSize: 22 * S }}>👁</span>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary, letterSpacing: "0.06em",
        }}>AI 看圖中...</span>
      </div>

      {/* AI response bubble */}
      <div style={{
        opacity: respOp,
        transform: `translateY(${respTy}px)`,
        background: C.primaryLight,
        border: `1.5px solid ${C.primary}`,
        borderRadius: 14 * S,
        padding: `${12 * S}px ${16 * S}px`,
        boxShadow: `0 0 ${18 * S}px rgba(124,255,178,0.18)`,
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
          color: C.primary, letterSpacing: "0.06em", marginBottom: 6 * S,
        }}>AI 回答</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.text, lineHeight: 1.55,
        }}>這是系統錯誤碼，通常代表...</div>
      </div>
    </div>
  );
}

// 4. TextOnlyWallAnimation — Scene2 PhaseA triggerLocal=76, DURATION=1272
//    Visual: 3 個問題 icon 出現 → 撞上「TEXT ONLY」牆 (純文字 AI 看不懂)
function TextOnlyWallAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1272;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT scene2 starts at 74.22s, trigger at local 76 = global 2303 = 76.77s
  // 81.90s "你看到一張產品照片有個問題" → local 230 → f=154
  // 86.72s "你聽到一段錄音想知道重點" → local 374 → f=298
  // 91.08s "你拍了一張菜單想知道有什麼推薦" → local 505 → f=429
  // 97.74s "如果AI只能理解文字" → local 705 → f=629 (wall emphasis)
  // 111.28s "多模態AI讓你可以直接把看到的丟給它" → local 1112 → f=1036 (wall breaks)
  const problems = [
    { icon: "📷", label: "產品照片",  appearsAt: 154, color: C.blue },
    { icon: "🎤", label: "錄音重點",  appearsAt: 298, color: C.yellow },
    { icon: "🍽️", label: "拍下菜單",  appearsAt: 429, color: C.purple },
  ];

  // Wall pulses red at f=629 (强調"純文字 AI" 不行)
  const wallPulse = interpolate(f, [629, 660, 720], [0, 1, 0.6], clamp);
  // After f=1036, wall "cracks" (rotates to ✓)
  const wallBreak = interpolate(Math.max(0, f - 1036), [0, 40], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 12 * S, width: 280 * S,
    }}>
      {/* Header */}
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.muted, letterSpacing: "0.08em",
      }}>真實世界的問題</div>

      {/* Incoming problems */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 * S, width: "100%" }}>
        {problems.map((p, i) => {
          const itemF = Math.max(0, f - p.appearsAt);
          const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemTx = interpolate(itemF, [0, 22], [-30 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: itemOp,
              transform: `translateX(${itemTx}px)`,
              display: "flex", alignItems: "center", gap: 10 * S,
              background: "rgba(0,0,0,0.8)",
              border: `1px solid ${p.color}44`,
              borderLeft: `3px solid ${p.color}`,
              borderRadius: 10 * S,
              padding: `${8 * S}px ${12 * S}px`,
            }}>
              <span style={{ fontSize: 22 * S }}>{p.icon}</span>
              <span style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.text,
              }}>{p.label}</span>
            </div>
          );
        })}
      </div>

      {/* Wall */}
      <div style={{
        position: "relative",
        background: wallBreak > 0.5
          ? `rgba(124,255,178,${0.12 + wallBreak * 0.08})`
          : `rgba(255,107,107,${0.1 + wallPulse * 0.08})`,
        border: wallBreak > 0.5
          ? `2px solid ${C.primary}`
          : `2px dashed ${C.red}`,
        borderRadius: 14 * S,
        padding: `${12 * S}px ${18 * S}px`,
        width: "100%",
        textAlign: "center" as const,
        boxShadow: wallBreak > 0.5
          ? `0 0 ${18 * S}px rgba(124,255,178,0.3)`
          : `0 0 ${14 * S}px rgba(255,107,107,${wallPulse * 0.4})`,
        transition: "all 0.3s",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 20 * S,
          color: wallBreak > 0.5 ? C.primary : C.red,
          letterSpacing: "0.1em", fontWeight: "700",
          textShadow: wallBreak > 0.5
            ? `0 0 ${10 * S}px ${C.primary}88`
            : `0 0 ${10 * S}px ${C.red}88`,
        }}>{wallBreak > 0.5 ? "MULTIMODAL ✓" : "TEXT ONLY ✕"}</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.muted, marginTop: 4 * S,
        }}>{wallBreak > 0.5 ? "直接看，不必翻譯" : "必須翻譯成文字"}</div>
      </div>
    </div>
  );
}

// 5. RealWorldCasesAnimation — Scene2 PhaseB triggerLocal=1427, DURATION=1039
//    Visual: 3 個產業案例 (醫療/教育/製造) 依 VTT 點亮
function RealWorldCasesAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 1039;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT scene2 starts at 74.22s, trigger at local 1427 = 121.80s
  // 121.80s "醫療影像分析" → f=0
  // 123.84s "AI直接看X光片、MRI" → f=61
  // 134.60s "教育輔助 — 學生拍下數學題目..." → f=384
  // 145.18s "製造業品管" → f=702
  // 153.42s end → f=948
  const cases = [
    {
      icon: "🏥",
      label: "醫療影像分析",
      detail: "AI 直接看 X 光、MRI",
      color: C.blue,
      appearsAt: 0,
    },
    {
      icon: "📚",
      label: "教育輔助",
      detail: "拍下數學題，AI 逐步解",
      color: C.yellow,
      appearsAt: 384,
    },
    {
      icon: "🏭",
      label: "製造業品管",
      detail: "攝影機即時判斷瑕疵",
      color: C.purple,
      appearsAt: 702,
    },
  ];

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column",
      gap: 12 * S, width: 290 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.08em",
      }}>真實應用</div>

      {cases.map((cs, i) => {
        const itemF = Math.max(0, f - cs.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTy = interpolate(itemF, [0, 22], [22 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const itemScale = easeOutBack(prog(itemF, 22));
        const pulse = itemF > 22 && itemF < 80
          ? Math.sin((itemF - 22) * 0.1) * 0.05 + 1.0
          : 1.0;
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateY(${itemTy}px) scale(${itemScale * pulse})`,
            background: `${cs.color}14`,
            border: `1.5px solid ${cs.color}`,
            borderRadius: 14 * S,
            padding: `${12 * S}px ${16 * S}px`,
            boxShadow: `0 0 ${14 * S}px ${cs.color}33`,
            display: "flex", alignItems: "center", gap: 14 * S,
          }}>
            <span style={{ fontSize: 30 * S, flexShrink: 0 }}>{cs.icon}</span>
            <div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                color: cs.color, fontWeight: "700", lineHeight: 1.2,
              }}>{cs.label}</div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                color: C.text, marginTop: 4 * S, lineHeight: 1.45,
              }}>{cs.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 6. ToolsLineupAnimation — Scene3 PhaseA triggerLocal=265, DURATION=639
//    Visual: 3 個 AI 工具 (Claude / GPT-4o / Gemini) + 各自模態 badges
function ToolsLineupAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 639;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT scene3 starts at 164.50s, trigger at local 265 = 173.34s
  // 173.34s "Claude 支援圖片輸入" → f=0
  // 183.34s "ChatGPT的GPT-4o 支援圖片和語音對話" → f=300
  // 187.54s "Gemini 支援文字、圖片、音頻、影片" → f=426
  const tools = [
    {
      name: "Claude",
      color: C.primary,
      modes: ["📝", "🖼️"],
      tag: "圖片 / PDF",
      appearsAt: 0,
    },
    {
      name: "GPT-4o",
      color: C.blue,
      modes: ["📝", "🖼️", "🎵"],
      tag: "圖片 / 語音",
      appearsAt: 300,
    },
    {
      name: "Gemini",
      color: C.purple,
      modes: ["📝", "🖼️", "🎵", "🎬"],
      tag: "文字 / 圖 / 音 / 影",
      appearsAt: 426,
    },
  ];

  return (
    <div style={{
      position: "absolute", right: 40 * S, top: 190 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column",
      gap: 12 * S, width: 280 * S,
    }}>
      <div style={{
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.08em",
      }}>支援多模態的工具</div>

      {tools.map((t, i) => {
        const itemF = Math.max(0, f - t.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [30 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        return (
          <div key={i} style={{
            opacity: itemOp,
            transform: `translateX(${itemTx}px)`,
            background: "rgba(0,0,0,0.85)",
            border: `1.5px solid ${t.color}`,
            borderRadius: 14 * S,
            padding: `${12 * S}px ${16 * S}px`,
            boxShadow: `0 0 ${12 * S}px ${t.color}33`,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 8 * S,
            }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
                color: t.color, fontWeight: "700",
                textShadow: `0 0 ${10 * S}px ${t.color}88`,
              }}>{t.name}</span>
              <div style={{ display: "flex", gap: 4 * S }}>
                {t.modes.map((m, j) => {
                  const modeF = Math.max(0, itemF - 22 - j * 6);
                  const modeOp = interpolate(modeF, [0, 14], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
                  const modeScale = easeOutBack(prog(modeF, 14));
                  return (
                    <span key={j} style={{
                      fontSize: 20 * S,
                      opacity: modeOp,
                      display: "inline-block",
                      transform: `scale(${modeScale})`,
                    }}>{m}</span>
                  );
                })}
              </div>
            </div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.text,
            }}>{t.tag}</div>
          </div>
        );
      })}
    </div>
  );
}

// 7. HallucinationAnimation — Scene3 PhaseB triggerLocal=1392, DURATION=672
//    Visual: AI 看一張圖 + 漂浮的「?」+ 警告標 → "重要判斷自己核實"
function HallucinationAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 672;
  const envelope = interpolate(f, [0, 12, DURATION - 30, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // VTT scene3 starts at 164.50s, trigger at local 1392 = 210.90s
  // 210.90s "多模態輸入有時候會帶來幻覺問題" → f=0
  // 214.50s "AI可能對圖片中的細節理解有誤" → f=108
  // 218.70s "或者對音頻的語境判斷有偏差" → f=234
  // 222.90s "重要的判斷仍然需要你自己核實" → f=360
  const eyeScale = easeOutBack(prog(f, 26));
  const eyePulse = Math.sin(f * 0.08) * 0.05 + 0.95;

  // Floating question marks (uncertain interpretation)
  const qMarks = [
    { x: -50, y: -10, delay: 70  },
    { x:  60, y: -30, delay: 110 },
    { x:   0, y: -65, delay: 150 },
    { x: -80, y: -55, delay: 190 },
  ];

  // Warning sign appears at f=234
  const warnOp = interpolate(Math.max(0, f - 234), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const warnPulse = Math.sin(Math.max(0, f - 234) * 0.12) * 0.1 + 0.9;

  // Verification label at f=360
  const verOp = interpolate(Math.max(0, f - 360), [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
  const verTy = interpolate(Math.max(0, f - 360), [0, 22], [18 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });

  return (
    <div style={{
      position: "absolute", left: 40 * S, top: 200 * S,
      opacity: envelope, pointerEvents: "none", zIndex: 50,
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 16 * S, width: 280 * S,
    }}>
      {/* AI eye looking at image with question marks */}
      <div style={{ position: "relative", width: 200 * S, height: 160 * S }}>
        {/* Image being analyzed */}
        <div style={{
          position: "absolute",
          left: 50 * S, top: 50 * S,
          width: 100 * S, height: 75 * S,
          borderRadius: 10 * S,
          background: "rgba(255,255,255,0.06)",
          border: `2px solid rgba(255,255,255,0.18)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32 * S,
          transform: `scale(${eyeScale})`,
        }}>📷</div>

        {/* AI eye looking */}
        <div style={{
          position: "absolute",
          right: 10 * S, top: 5 * S,
          fontSize: 32 * S,
          transform: `scale(${eyeScale * eyePulse})`,
          filter: `drop-shadow(0 0 ${10 * S}px ${C.yellow}66)`,
        }}>👁</div>

        {/* Floating ? marks */}
        {qMarks.map((q, i) => {
          const qF = Math.max(0, f - q.delay);
          const qOp = interpolate(qF, [0, 18, 60, 100], [0, 1, 1, 0.6], clamp);
          const qTy = interpolate(qF, [0, 60], [0, -20 * S], { easing: E.outExpo, extrapolateRight: "clamp" });
          const qScale = easeOutBack(prog(qF, 18));
          return (
            <div key={i} style={{
              position: "absolute",
              left: 100 * S + q.x * S,
              top: 50 * S + q.y * S,
              opacity: qOp,
              transform: `translateY(${qTy}px) scale(${qScale})`,
              fontFamily: "'Space Mono', monospace",
              fontSize: 28 * S,
              color: C.yellow,
              fontWeight: "700",
              textShadow: `0 0 ${10 * S}px ${C.yellow}88`,
            }}>?</div>
          );
        })}
      </div>

      {/* Warning */}
      <div style={{
        opacity: warnOp,
        transform: `scale(${warnPulse})`,
        display: "flex", alignItems: "center", gap: 10 * S,
        background: C.yellowLight,
        border: `1.5px solid ${C.yellowBorder}`,
        borderRadius: 12 * S,
        padding: `${10 * S}px ${16 * S}px`,
        boxShadow: `0 0 ${14 * S}px ${C.yellow}33`,
      }}>
        <span style={{ fontSize: 26 * S }}>⚠️</span>
        <span style={{
          fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
          color: C.yellow, fontWeight: "700",
        }}>細節可能理解有誤</span>
      </div>

      {/* Verification label */}
      <div style={{
        opacity: verOp,
        transform: `translateY(${verTy}px)`,
        fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
        color: C.primary, letterSpacing: "0.06em",
        background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
        borderRadius: 8 * S, padding: `${6 * S}px ${14 * S}px`,
      }}>重要判斷 自己核實</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_05_14.title.to - SCENES_2026_05_14.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(50);
  const tagStyle = useFadeUp(70);

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
            borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
          }}>每日 AI 知識庫</span>
        </div>

        {/* H1 line 1 */}
        <h1 style={{
          margin: 0, lineHeight: 1.15,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 42 * S, color: C.text,
        }}>
          <WordReveal text="多模態 AI 是什麼？" startFrame={10} staggerPerWord={6}
            fontSize={42 * S} color={C.text} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* H1 line 2 — neon green accent */}
        <h1 style={{
          margin: 0, lineHeight: 1.2, marginTop: 6 * S,
          fontFamily: "'Noto Sans TC', sans-serif",
          fontWeight: 900, fontSize: 30 * S, color: C.primary,
        }}>
          <WordReveal text="文字、圖片、聲音 一起理解" startFrame={32} staggerPerWord={6}
            fontSize={30 * S} color={C.primary} fontFamily="'Noto Sans TC', sans-serif" fontWeight={900} />
        </h1>

        {/* Subtitle */}
        <p style={{
          ...subtitleStyle, margin: 0,
          marginTop: 22 * S, fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 22 * S, color: C.muted, lineHeight: 1.6,
        }}>
          AI 不再只看文字 — 直接把圖、聲音、影片丟給它
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 18 * S }}>
          <span style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em",
          }}>MULTIMODAL · CLAUDE · GPT-4o · GEMINI</span>
        </div>
      </AbsoluteFill>

      {/* Concept animation: ImageVsTextAnimation at frame 150 */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ImageVsTextAnimation triggerFrame={150} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — 多模態 AI 是什麼 ────────────────────────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_14.scene1.to - SCENES_2026_05_14.scene1.from;

  // VTT-based local frame anchors (scene1 starts at 730):
  // 24.32s "先來講一個概念,多模態AI" → local 0 (heading appears at 5)
  // 27.90s "模態指的是資訊的類型" → local 108
  // 30.46s "文字是一種模態..." → local 184 (Modalities animation trigger)
  // 35.58s "多模態AI的意思" → local 337
  // 43.26s "不再限於文字輸入、文字輸出" → local 568
  // 46.58s "最直接的例子" → local 667 (Phase B start)
  const HEADING_AT = 5;
  const DEF_CARD_AT = 110;     // appears at 27.90s "模態指的是資訊的類型"
  const MULTI_CARD_AT = 340;   // appears at 35.58s "多模態 AI 的意思"
  const MODALITY_ANIM_AT = 184;  // 30.46s VTT trigger

  // Phase A → B boundary
  const A_FADE_START = 587;    // = 667 - 80
  const A_REMOVE     = 667;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B (screenshot example, local 667-1497)
  // 46.58s "最直接的例子" → local 667
  // 52.74s "問它,這個錯誤訊息是什麼意思" → local 852
  // 56.82s "它能直接看圖片,給你解釋" → local 974
  // 59.38s "你不需要把截圖裡的文字打出來,AI自己看得懂" → local 1051
  const B_SHOW_AT       = 667;
  const SS_EXAMPLE_AT   = 667;     // example card appears with first sentence
  const SS_QUESTION_AT  = 852;     // 52.74s "問它,這個錯誤訊息是什麼意思"
  const SS_ANSWER_AT    = 974;     // 56.82s "它能直接看圖片,給你解釋"
  const SS_HIGHLIGHT_AT = 1051;    // 59.38s "你不需要把截圖裡的文字打出來"
  const SCREENSHOT_ANIM_AT = 667;  // animation triggers with Phase B start
  const showB           = frame >= B_SHOW_AT;

  const headStyle    = useFadeUp(HEADING_AT);
  const defStyle     = useFadeUp(DEF_CARD_AT);
  const multiStyle   = useFadeUp(MULTI_CARD_AT);
  const ssExStyle    = useFadeUp(showB ? SS_EXAMPLE_AT : 999999);
  const ssQStyle     = useFadeUp(showB ? SS_QUESTION_AT : 999999);
  const ssAStyle     = useFadeUp(showB ? SS_ANSWER_AT : 999999);
  const ssHlStyle    = useFadeIn(showB ? SS_HIGHLIGHT_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A — 概念定義 ───────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Section badge */}
            <div style={{ ...headStyle, marginBottom: 22 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>CONCEPT</div>
              <h2 style={{
                margin: 0, marginTop: 12 * S,
                fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900,
                fontSize: 30 * S, color: C.text, lineHeight: 1.2,
              }}>多模態 AI 是什麼？</h2>
            </div>

            {/* "模態 = 資訊的類型" card */}
            <div style={{ ...defStyle, marginBottom: 22 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S,
                padding: `${18 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.08em", marginBottom: 10 * S,
                }}>模態 / MODALITY</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, lineHeight: 1.5, marginBottom: 10 * S,
                }}>「模態」指的是<span style={{ color: C.primary, fontWeight: "700" }}>資訊的類型</span></div>
                <div style={{
                  display: "flex", gap: 10 * S, flexWrap: "wrap" as const,
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.muted,
                }}>
                  {[
                    { icon: "📝", label: "文字" },
                    { icon: "🖼️", label: "圖片" },
                    { icon: "🎵", label: "聲音" },
                    { icon: "🎬", label: "影片" },
                  ].map((m, i) => (
                    <span key={i} style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid rgba(255,255,255,0.08)`,
                      borderRadius: 8 * S, padding: `${6 * S}px ${10 * S}px`,
                      display: "inline-flex", alignItems: "center", gap: 6 * S,
                    }}>
                      <span style={{ fontSize: 20 * S }}>{m.icon}</span>
                      <span style={{ color: C.text }}>{m.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* "多模態 AI 意思" highlight */}
            <div style={{ ...multiStyle }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: "700", lineHeight: 1.45,
                }}>同一個模型 同時處理 多種類型資訊</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.55, marginTop: 8 * S,
                }}>不再限於 文字輸入 → 文字輸出</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B — 螢幕截圖例子 ──────────────────── */}
        {showB && (
          <>
            {/* Heading */}
            <div style={{ ...ssExStyle, marginBottom: 18 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>最直接的例子</div>
              <h2 style={{
                margin: 0, marginTop: 12 * S,
                fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900,
                fontSize: 26 * S, color: C.text, lineHeight: 1.25,
              }}>把螢幕截圖丟給 Claude / GPT-4o</h2>
            </div>

            {/* Question */}
            <div style={{ ...ssQStyle, marginBottom: 16 * S }}>
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${20 * S}px`,
                display: "flex", alignItems: "center", gap: 14 * S,
              }}>
                <span style={{ fontSize: 28 * S }}>💬</span>
                <span style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.5,
                }}>「這個錯誤訊息是什麼意思？」</span>
              </div>
            </div>

            {/* Answer */}
            <div style={{ ...ssAStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${20 * S}px`,
                display: "flex", alignItems: "center", gap: 14 * S,
                boxShadow: `0 0 ${18 * S}px rgba(124,255,178,0.12)`,
              }}>
                <span style={{ fontSize: 28 * S }}>🤖</span>
                <span style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.5,
                }}>AI 能<span style={{ color: C.primary, fontWeight: "700" }}>直接看圖片</span>，給你解釋</span>
              </div>
            </div>

            {/* Highlight */}
            <div style={{ ...ssHlStyle }}>
              <div style={{
                background: "rgba(0,0,0,0.6)",
                borderLeft: `3px solid ${C.primary}`,
                borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.06em", marginBottom: 6 * S,
                }}>關鍵</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55,
                }}>不需要把截圖文字打出來，AI 自己看得懂</div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ModalityHubAnimation triggerLocalFrame={MODALITY_ANIM_AT} />
        <ScreenshotAnimation triggerLocalFrame={SCREENSHOT_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — 為什麼重要 + 真實案例 ───────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_14.scene2.to - SCENES_2026_05_14.scene2.from;

  // VTT scene2 starts at 74.22s (local 0):
  // 74.22s "為什麼多模態是個重要進展" → local 0
  // 76.78s "因為真實世界的問題從來就不是純文字的" → local 77
  // 81.90s "你看到一張產品照片有個問題" → local 230
  // 86.72s "你聽到一段錄音想知道重點" → local 374
  // 91.08s "你拍了一張菜單想知道有什麼推薦" → local 505
  // 97.74s "如果AI只能理解文字" → local 705
  // 100.04s "你就必須先把所有資訊翻譯成文字" → local 774
  // 111.28s "多模態AI讓你可以直接把看到的丟給它" → local 1112
  // 121.80s "幾個已經在發生的真實例子 / 醫療影像分析" → local 1427 (Phase B)
  const HEAD_AT          = 5;
  const STATEMENT_AT     = 77;
  const PHOTO_AT         = 230;
  const AUDIO_AT         = 374;
  const MENU_AT          = 505;
  const TEXT_ONLY_AT     = 705;
  const SOLUTION_AT      = 1112;
  const TEXT_WALL_ANIM_AT = 76;     // animation trigger

  // Phase A → B
  const A_FADE_START = 1347;        // = 1427 - 80
  const A_REMOVE     = 1427;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B (real cases)
  // 121.80s "醫療影像分析" → local 1427
  // 123.84s "AI直接看X光片、MRI" → local 1489
  // 134.60s "教育輔助" → local 1811
  // 145.18s "製造業品管" → local 2129
  // 156.66s "你的工作或生活中..." → local 2473 (reflection, goes to callout)
  const B_SHOW_AT     = 1427;
  const B_HEAD_AT     = 1427;
  const MEDICAL_AT    = 1427;
  const EDUCATION_AT  = 1811;
  const MANUF_AT      = 2129;
  const CASES_ANIM_AT = 1427;
  const showB         = frame >= B_SHOW_AT;

  const headStyle      = useFadeUp(HEAD_AT);
  const stmtStyle      = useFadeUp(STATEMENT_AT);
  const photoStyle     = useFadeUp(PHOTO_AT);
  const audioStyle     = useFadeUp(AUDIO_AT);
  const menuStyle      = useFadeUp(MENU_AT);
  const txtOnlyStyle   = useFadeUp(TEXT_ONLY_AT);
  const solStyle       = useFadeUp(SOLUTION_AT);

  const bHeadStyle     = useFadeUp(showB ? B_HEAD_AT : 999999);
  const medStyle       = useFadeUp(showB ? MEDICAL_AT : 999999);
  const eduStyle       = useFadeUp(showB ? EDUCATION_AT : 999999);
  const manStyle       = useFadeUp(showB ? MANUF_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
      <ContentColumn scrollUp={{ at: SOLUTION_AT - 30, amount: 480 }}>
        <div style={{ opacity: aOpacity }}>
            {/* Heading */}
            <div style={{ ...headStyle, marginBottom: 20 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>WHY</div>
              <h2 style={{
                margin: 0, marginTop: 12 * S,
                fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900,
                fontSize: 28 * S, color: C.text, lineHeight: 1.25,
              }}>為什麼多模態是重要進展？</h2>
            </div>

            {/* Statement */}
            <div style={{ ...stmtStyle, marginBottom: 18 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S,
                padding: `${16 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.text, lineHeight: 1.5,
                }}>真實世界的問題 <span style={{ color: C.red, fontWeight: "700" }}>從來就不是純文字的</span></div>
              </div>
            </div>

            {/* 3 problem examples */}
            <div style={{ ...photoStyle, marginBottom: 12 * S }}>
              <div style={{
                background: "rgba(0,0,0,0.6)",
                borderLeft: `3px solid ${C.blue}`,
                borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
                padding: `${10 * S}px ${18 * S}px`,
                display: "flex", alignItems: "center", gap: 12 * S,
              }}>
                <span style={{ fontSize: 26 * S }}>📷</span>
                <span style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text,
                }}>看到一張產品照片有問題 — <span style={{ color: C.blue, fontWeight: "700" }}>圖片問題</span></span>
              </div>
            </div>

            <div style={{ ...audioStyle, marginBottom: 12 * S }}>
              <div style={{
                background: "rgba(0,0,0,0.6)",
                borderLeft: `3px solid ${C.yellow}`,
                borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
                padding: `${10 * S}px ${18 * S}px`,
                display: "flex", alignItems: "center", gap: 12 * S,
              }}>
                <span style={{ fontSize: 26 * S }}>🎤</span>
                <span style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text,
                }}>聽到一段錄音想抓重點 — <span style={{ color: C.yellow, fontWeight: "700" }}>音頻問題</span></span>
              </div>
            </div>

            <div style={{ ...menuStyle, marginBottom: 18 * S }}>
              <div style={{
                background: "rgba(0,0,0,0.6)",
                borderLeft: `3px solid ${C.purple}`,
                borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
                padding: `${10 * S}px ${18 * S}px`,
                display: "flex", alignItems: "center", gap: 12 * S,
              }}>
                <span style={{ fontSize: 26 * S }}>🍽️</span>
                <span style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text,
                }}>拍下菜單想知道推薦 — <span style={{ color: C.purple, fontWeight: "700" }}>圖片加語境</span></span>
              </div>
            </div>

            {/* Text-only AI limitation */}
            <div style={{ ...txtOnlyStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.redLight,
                border: `1px solid ${C.redBorder}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.red, letterSpacing: "0.06em", marginBottom: 8 * S,
                }}>⚠ 純文字 AI 的限制</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.5,
                }}>必須先把所有資訊 <span style={{ color: C.red, fontWeight: "700" }}>翻譯成文字</span> — 耗時且容易遺漏細節</div>
              </div>
            </div>

            {/* Solution */}
            <div style={{ ...solStyle }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${22 * S}px rgba(124,255,178,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: "700", lineHeight: 1.45,
                }}>直接把看到的丟給它 — 改變 AI 能幫你的場景範圍</div>
              </div>
            </div>
        </div>
      </ContentColumn>
      )}

        {/* ── Phase B — 真實案例 ───────────────────────── */}
        {showB && (
        <ContentColumn>
          <>
            <div style={{ ...bHeadStyle, marginBottom: 22 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>REAL CASES</div>
              <h2 style={{
                margin: 0, marginTop: 12 * S,
                fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900,
                fontSize: 28 * S, color: C.text, lineHeight: 1.25,
              }}>幾個已經在發生的真實例子</h2>
            </div>

            {/* Medical */}
            <div style={{ ...medStyle, marginBottom: 16 * S }}>
              <div style={{
                background: `${C.blue}14`,
                border: `1.5px solid ${C.blue}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${14 * S}px ${C.blue}22`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 8 * S,
                }}>
                  <span style={{ fontSize: 28 * S }}>🏥</span>
                  <span style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                    color: C.blue, fontWeight: "700",
                  }}>醫療影像分析</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.5,
                }}>AI 直接看 X 光片、MRI，輔助醫師識別異常</div>
              </div>
            </div>

            {/* Education */}
            <div style={{ ...eduStyle, marginBottom: 16 * S }}>
              <div style={{
                background: `${C.yellow}14`,
                border: `1.5px solid ${C.yellow}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${14 * S}px ${C.yellow}22`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 8 * S,
                }}>
                  <span style={{ fontSize: 28 * S }}>📚</span>
                  <span style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                    color: C.yellow, fontWeight: "700",
                  }}>教育輔助</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.5,
                }}>學生拍下數學題目，AI 直接看題目逐步解</div>
              </div>
            </div>

            {/* Manufacturing */}
            <div style={{ ...manStyle }}>
              <div style={{
                background: `${C.purple}14`,
                border: `1.5px solid ${C.purple}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${14 * S}px ${C.purple}22`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 8 * S,
                }}>
                  <span style={{ fontSize: 28 * S }}>🏭</span>
                  <span style={{
                    fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                    color: C.purple, fontWeight: "700",
                  }}>製造業品管</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.5,
                }}>攝影機拍攝，AI 即時判斷是否有瑕疵</div>
              </div>
            </div>
          </>
        </ContentColumn>
        )}

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <TextOnlyWallAnimation triggerLocalFrame={TEXT_WALL_ANIM_AT} />
        <RealWorldCasesAnimation triggerLocalFrame={CASES_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — 工具現況 + 提醒 ──────────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_14.scene3.to - SCENES_2026_05_14.scene3.from;

  // VTT scene3 starts at 164.50s (local 0):
  // 164.50s "好消息是你不需要等待" → local 0
  // 166.82s "多模態AI現在就在你能用的工具裡了" → local 70
  // 173.34s "Claude 支援圖片輸入" → local 265
  // 175.34s "可以分析圖表、截圖、文件、照片" → local 325
  // 179.80s "也支援PDF" → local 459
  // 183.34s "ChatGPT的GPT-4o..." → local 565
  // 187.54s "Gemini..." → local 691
  // 191.62s "對Google服務也有直接整合" → local 814
  // 194.42s "一個最直接的入門建議" → local 898 (Phase B start)
  const HEAD_AT   = 5;
  const INTRO_AT  = 70;
  const CLAUDE_AT = 265;
  const GPT_AT    = 565;
  const GEMINI_AT = 691;
  const TOOLS_ANIM_AT = 265;

  // Phase A → B
  const A_FADE_START = 818;   // = 898 - 80
  const A_REMOVE     = 898;
  const showA        = frame < A_REMOVE;
  const aOpacity     = frame > A_FADE_START
    ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B (advice + warning)
  // 194.42s "一個最直接的入門建議" → local 898
  // 196.14s "下次你遇到需要描述某張圖..." → local 950
  // 204.82s "直接把圖片丟進去 — 比打一長串快多了" → local 1210
  // 207.86s "通常也更準確" → local 1301
  // 209.62s "最後個提醒" → local 1354
  // 210.90s "多模態輸入有時候會帶來幻覺問題" → local 1392
  // 214.50s "AI可能對圖片中的細節理解有誤" → local 1500
  // 222.90s "重要的判斷仍然需要你自己核實" → local 1752
  const B_SHOW_AT      = 898;
  const TIP_HEAD_AT    = 898;
  const TIP_BODY_AT    = 950;     // 196.14s
  const TIP_HL_AT      = 1210;    // 204.82s
  const WARN_HEAD_AT   = 1354;    // 209.62s "最後個提醒"
  const WARN_BODY_AT   = 1392;    // 210.90s "幻覺問題"
  const WARN_HL_AT     = 1752;    // 222.90s "重要判斷自己核實"
  const HALLU_ANIM_AT  = 1392;
  const showB          = frame >= B_SHOW_AT;

  const headStyle    = useFadeUp(HEAD_AT);
  const introStyle   = useFadeUp(INTRO_AT);
  const claudeStyle  = useFadeUp(CLAUDE_AT);
  const gptStyle     = useFadeUp(GPT_AT);
  const gemStyle     = useFadeUp(GEMINI_AT);

  const tipHeadStyle = useFadeUp(showB ? TIP_HEAD_AT : 999999);
  const tipBodyStyle = useFadeUp(showB ? TIP_BODY_AT : 999999);
  const tipHlStyle   = useFadeIn(showB ? TIP_HL_AT : 999999);
  const warnHeadStyle = useFadeUp(showB ? WARN_HEAD_AT : 999999);
  const warnBodyStyle = useFadeUp(showB ? WARN_BODY_AT : 999999);
  const warnHlStyle  = useFadeIn(showB ? WARN_HL_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      {showA && (
      <ContentColumn>
        {/* ── Phase A — 工具現況 ───────────────────────── */}
        <div style={{ opacity: aOpacity }}>
            <div style={{ ...headStyle, marginBottom: 18 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>NOW AVAILABLE</div>
              <h2 style={{
                margin: 0, marginTop: 12 * S,
                fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900,
                fontSize: 28 * S, color: C.text, lineHeight: 1.25,
              }}>多模態 AI 已在你的工具裡</h2>
            </div>

            <div style={{ ...introStyle, marginBottom: 22 * S }}>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                color: C.muted, lineHeight: 1.55,
              }}>不需要等待 — 現在主流工具都已支援</div>
            </div>

            {/* Claude */}
            <div style={{ ...claudeStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.primaryBorder}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 6 * S,
                }}>
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
                    color: C.primary, fontWeight: "700",
                    textShadow: `0 0 ${10 * S}px ${C.primary}88`,
                  }}>Claude</span>
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                    color: C.muted,
                  }}>· 圖片輸入 / PDF</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.5,
                }}>分析圖表、截圖、文件、照片</div>
              </div>
            </div>

            {/* GPT-4o */}
            <div style={{ ...gptStyle, marginBottom: 14 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.blueBorder}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 6 * S,
                }}>
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
                    color: C.blue, fontWeight: "700",
                    textShadow: `0 0 ${10 * S}px ${C.blue}88`,
                  }}>GPT-4o</span>
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                    color: C.muted,
                  }}>· 圖片 / 語音對話</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.5,
                }}>即時語音互動、讀取與生成圖片</div>
              </div>
            </div>

            {/* Gemini */}
            <div style={{ ...gemStyle }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.purpleBorder}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 6 * S,
                }}>
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
                    color: C.purple, fontWeight: "700",
                    textShadow: `0 0 ${10 * S}px ${C.purple}88`,
                  }}>Gemini</span>
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                    color: C.muted,
                  }}>· 文字 / 圖 / 音 / 影</span>
                </div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
                  color: C.text, lineHeight: 1.5,
                }}>對 Google 服務有直接整合</div>
              </div>
            </div>
          </div>
        </ContentColumn>
        )}

        {/* ── Phase B — 入門建議 + 提醒 ───────────────── */}
        {showB && (
        <ContentColumn>
          <>
            {/* Tip heading */}
            <div style={{ ...tipHeadStyle, marginBottom: 18 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.primary, letterSpacing: "0.1em",
                background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>QUICK START</div>
              <h2 style={{
                margin: 0, marginTop: 12 * S,
                fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900,
                fontSize: 28 * S, color: C.text, lineHeight: 1.25,
              }}>最直接的入門建議</h2>
            </div>

            {/* Tip body */}
            <div style={{ ...tipBodyStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.surface,
                border: `1px solid ${C.surfaceBorder}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55,
                }}>下次需要描述某張圖才能讓 AI 幫你的時候 —</div>
              </div>
            </div>

            {/* Tip highlight */}
            <div style={{ ...tipHlStyle, marginBottom: 28 * S }}>
              <div style={{
                background: C.primaryLight,
                border: `1.5px solid ${C.primary}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${22 * S}px`,
                boxShadow: `0 0 ${22 * S}px rgba(124,255,178,0.15)`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: C.primary, fontWeight: "700", lineHeight: 1.45,
                }}>直接把圖丟進去 — 快多了，通常也更準確</div>
              </div>
            </div>

            {/* Warning heading */}
            <div style={{ ...warnHeadStyle, marginBottom: 16 * S }}>
              <div style={{
                display: "inline-block",
                fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                color: C.yellow, letterSpacing: "0.1em",
                background: C.yellowLight, border: `1px solid ${C.yellowBorder}`,
                borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
              }}>⚠ 最後個提醒</div>
            </div>

            {/* Warning body */}
            <div style={{ ...warnBodyStyle, marginBottom: 16 * S }}>
              <div style={{
                background: C.yellowLight,
                border: `1px solid ${C.yellowBorder}`,
                borderRadius: 14 * S,
                padding: `${14 * S}px ${22 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.5,
                }}>多模態輸入也會有 <span style={{ color: C.yellow, fontWeight: "700" }}>幻覺問題</span> — AI 對細節或語境理解可能有誤</div>
              </div>
            </div>

            {/* Warning highlight */}
            <div style={{ ...warnHlStyle }}>
              <div style={{
                background: "rgba(0,0,0,0.6)",
                borderLeft: `3px solid ${C.primary}`,
                borderRadius: `0 ${10 * S}px ${10 * S}px 0`,
                padding: `${14 * S}px ${20 * S}px`,
              }}>
                <div style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
                  color: C.primary, letterSpacing: "0.06em", marginBottom: 6 * S,
                }}>KEY</div>
                <div style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                  color: C.text, lineHeight: 1.55,
                }}>重要判斷 — 還是要你自己核實</div>
              </div>
            </div>
          </>
        </ContentColumn>
        )}

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ToolsLineupAnimation triggerLocalFrame={TOOLS_ANIM_AT} />
        <HallucinationAnimation triggerLocalFrame={HALLU_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene — 重點整理 ───────────────────────────────────────────────
function SummaryScene() {
  const dur = SCENES_2026_05_14.summary.to - SCENES_2026_05_14.summary.from;

  // VTT scene4 starts at 243.22s (local 0):
  // 243.22s "好 今天的重點整理" → local 0
  // 245.38s "第一 多模態AI讓同一個模型..." → local 65
  // 256.34s "第二 真實世界的問題不是純文字的" → local 394
  // 267.54s "第三 現在主流工具都已支援..." → local 730
  // 276.66s "但多模態的幻覺問題也存在" → local 1003
  // 280.46s "重要判斷還是要自己核實" → local 1117
  // 284.06s "這裡是每日AI知識庫" → local 1225
  const HEAD_AT  = 5;
  const T1_AT    = 65;
  const T2_AT    = 394;
  const T3_AT    = 730;
  const NOTE_AT  = 1003;
  const CLOSE_AT = 1225;

  const headStyle  = useFadeUp(HEAD_AT);
  const t1Style    = useFadeUp(T1_AT);
  const t2Style    = useFadeUp(T2_AT);
  const t3Style    = useFadeUp(T3_AT);
  const noteStyle  = useFadeUp(NOTE_AT);
  const closeStyle = useFadeIn(CLOSE_AT);

  const items = [
    {
      style: t1Style,
      num: "01",
      label: "多模態 AI",
      desc: "同一個模型能處理文字、圖片、聲音等多種資訊 — 不再限於純文字",
      color: C.primary,
    },
    {
      style: t2Style,
      num: "02",
      label: "真實世界 ≠ 純文字",
      desc: "讓 AI 直接理解你看到的，省去翻譯成文字的步驟",
      color: C.blue,
    },
    {
      style: t3Style,
      num: "03",
      label: "工具都已支援",
      desc: "Claude / GPT-4o / Gemini — 遇到要解釋的圖直接丟給它",
      color: C.purple,
    },
  ];

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Heading */}
        <div style={{ ...headStyle, marginBottom: 26 * S }}>
          <div style={{
            display: "inline-block",
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.primary, letterSpacing: "0.12em",
            background: C.primaryLight, border: `1px solid ${C.primaryBorder}`,
            borderRadius: 6 * S, padding: `${6 * S}px ${14 * S}px`,
          }}>RECAP</div>
          <h2 style={{
            margin: 0, marginTop: 12 * S,
            fontFamily: "'Noto Sans TC', sans-serif", fontWeight: 900,
            fontSize: 32 * S, color: C.text, lineHeight: 1.2,
          }}>今天的三個重點</h2>
        </div>

        {/* 3 takeaways */}
        {items.map((it, i) => (
          <div key={i} style={{ ...it.style, marginBottom: 18 * S }}>
            <div style={{
              background: `${it.color}10`,
              border: `1.5px solid ${it.color}`,
              borderRadius: 14 * S,
              padding: `${14 * S}px ${22 * S}px`,
              boxShadow: `0 0 ${14 * S}px ${it.color}22`,
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12 * S, marginBottom: 8 * S,
              }}>
                <span style={{
                  fontFamily: "'Space Mono', monospace", fontSize: 22 * S,
                  color: it.color, fontWeight: "700",
                  textShadow: `0 0 ${10 * S}px ${it.color}88`,
                }}>{it.num}</span>
                <span style={{
                  fontFamily: "'Noto Sans TC', sans-serif", fontSize: 22 * S,
                  color: it.color, fontWeight: "700",
                }}>{it.label}</span>
              </div>
              <div style={{
                fontFamily: "'Noto Sans TC', sans-serif", fontSize: 20 * S,
                color: C.text, lineHeight: 1.5,
              }}>{it.desc}</div>
            </div>
          </div>
        ))}

        {/* Note */}
        <div style={{ ...noteStyle, marginBottom: 22 * S }}>
          <div style={{
            background: C.yellowLight,
            border: `1px solid ${C.yellowBorder}`,
            borderRadius: 14 * S,
            padding: `${12 * S}px ${20 * S}px`,
            display: "flex", alignItems: "center", gap: 12 * S,
          }}>
            <span style={{ fontSize: 24 * S }}>⚠️</span>
            <span style={{
              fontFamily: "'Noto Sans TC', sans-serif", fontSize: 18 * S,
              color: C.text, lineHeight: 1.5,
            }}>多模態的幻覺問題也存在 — 重要判斷還是要自己核實</span>
          </div>
        </div>

        {/* Closing */}
        <div style={{ ...closeStyle }}>
          <div style={{
            fontFamily: "'Space Mono', monospace", fontSize: 18 * S,
            color: C.muted, letterSpacing: "0.1em", textAlign: "center" as const,
            marginTop: 14 * S,
          }}>每日 AI 知識庫 · 下次見</div>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Composition ─────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

export const VideoComposition_2026_05_14: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background />

      <Sequence from={SCENES_2026_05_14.title.from}
        durationInFrames={SCENES_2026_05_14.title.to - SCENES_2026_05_14.title.from}>
        <TitleScene />
      </Sequence>

      <Sequence from={SCENES_2026_05_14.scene1.from}
        durationInFrames={SCENES_2026_05_14.scene1.to - SCENES_2026_05_14.scene1.from}>
        <Scene1 />
      </Sequence>

      <Sequence from={SCENES_2026_05_14.scene2.from}
        durationInFrames={SCENES_2026_05_14.scene2.to - SCENES_2026_05_14.scene2.from}>
        <Scene2 />
      </Sequence>

      <Sequence from={SCENES_2026_05_14.scene3.from}
        durationInFrames={SCENES_2026_05_14.scene3.to - SCENES_2026_05_14.scene3.from}>
        <Scene3 />
      </Sequence>

      <Sequence from={SCENES_2026_05_14.summary.from}
        durationInFrames={SCENES_2026_05_14.summary.to - SCENES_2026_05_14.summary.from}>
        <SummaryScene />
      </Sequence>

      <ProgressBar globalFrame={frame} />
      <IMessageOverlay globalFrame={frame} />

      <Audio src={staticFile("audio/2026-05-14-processed.wav")} />
      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.10;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(f, [TOTAL_FRAMES_2026_05_14 - 150, TOTAL_FRAMES_2026_05_14], [v, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return Math.min(fi, fo);
        }}
        loop
      />
    </AbsoluteFill>
  );
};
