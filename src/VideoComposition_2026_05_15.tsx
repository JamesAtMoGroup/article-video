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
const W = 1280 * S;
const H = 720 * S;
const NAV_H = 50 * S;
const CONTAINER_W = 640 * S;
const COL_LEFT = (W - CONTAINER_W) / 2;
const SUBTITLE_SAFE = 120 * S;
const CONTENT_GAP = 10 * S;
const CONTENT_TOP = NAV_H + CONTENT_GAP;
const CONTENT_H = H - CONTENT_TOP - SUBTITLE_SAFE;

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg: "#000000",
  surface: "#0d0d0d",
  surfaceBorder: "rgba(255,255,255,0.08)",
  primary: "#7cffb2",
  primaryLight: "rgba(124,255,178,0.07)",
  primaryBorder: "rgba(124,255,178,0.14)",
  text: "#ffffff",
  muted: "#888888",
  yellow: "#ffd166",
  yellowLight: "rgba(255,209,102,0.1)",
  yellowBorder: "rgba(255,209,102,0.2)",
  red: "#ff6b6b",
  redLight: "rgba(255,107,107,0.08)",
  redBorder: "rgba(255,107,107,0.2)",
} as const;

// ── iMessage constants ─────────────────────────────────────────────────────
const NOTIF_W = 290 * S;
const NOTIF_TOP = 12 * S;
const NOTIF_RIGHT = 20 * S;
const NOTIF_SLOT = 148 * S;
const NOTIF_SLIDE_H = 110 * S;
const FADE_OUT_FRAMES = 50;

// ── Scene boundaries (VTT seconds × 30) ───────────────────────────────────
// title:    0    → 556    (next topic "先說第一件" at 18.52s)
// scene1:   556  → 3452   (next topic "第二件事" at 115.08s)
// scene2:   3452 → 5686   (next topic "第三件事是Google" at 189.52s)
// scene3:   5686 → 8200   (next topic "重點整理" at 273.32s)
// summary:  8200 → 9550   (last cue end 317.38s + outro buffer)
export const SCENES_2026_05_15 = {
  title: { from: 0, to: 556 },
  scene1: { from: 556, to: 3452 },
  scene2: { from: 3452, to: 5686 },
  scene3: { from: 5686, to: 8200 },
  summary: { from: 8200, to: 9550 },
} as const;
export const TOTAL_FRAMES_2026_05_15 = 9550;

const CHAPTERS = [
  { label: "今日焦點", start: 0 },
  { label: "AI 駭系統", start: 556 },
  { label: "ChatGPT 廣告", start: 3452 },
  { label: "Gemini Android", start: 5686 },
  { label: "重點整理", start: 8200 },
] as const;

// ── iMessage callouts (global frames) — 3 思考題 ──────────────────────────
interface Callout {
  from: number;
  to: number;
  sender: string;
  text: string;
}
const ALL_CALLOUTS: Callout[] = [
  { from: 3084, to: 3452, sender: "想一想", text: "AI 能主動挖系統漏洞，在資安這個領域，AI 是讓世界更安全還是更危險？" },
  { from: 5380, to: 5686, sender: "親身經歷", text: "你願意為了免費用 ChatGPT，接受它在回覆裡可能摻雜廣告影響嗎？" },
  { from: 7902, to: 8200, sender: "想一想", text: "如果手機助理能跨 App 幫你預約、購物、操作，你願意給它多大行動權限？" },
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

// ── WordReveal ─────────────────────────────────────────────────────────────
function WordReveal({
  text,
  startFrame,
  staggerPerWord = 4,
  fontSize,
  color,
  fontFamily,
  fontWeight,
  lineHeight,
  letterSpacing,
}: {
  text: string;
  startFrame: number;
  staggerPerWord?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: number | string;
  lineHeight?: number;
  letterSpacing?: string;
}) {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline", lineHeight: lineHeight ?? 1.3 }}>
      {text.split(" ").map((word, i) => {
        const f = Math.max(0, frame - (startFrame + i * staggerPerWord));
        const ty = interpolate(f, [0, 20], [18 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const op = interpolate(f, [0, 12], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: op,
              transform: `translateY(${ty}px)`,
              marginRight: "0.28em",
              fontSize,
              color,
              fontFamily,
              fontWeight,
              letterSpacing,
            }}
          >
            {word}
          </span>
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
function ContentColumn({ children, scrollUp }: { children: React.ReactNode; scrollUp?: { at: number; amount: number } }) {
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
      <div
        style={{
          position: "absolute",
          top: CONTENT_TOP,
          left: COL_LEFT,
          width: CONTAINER_W,
          height: CONTENT_H,
          overflow: "hidden" as const,
        }}
      >
        <div style={{ transform: `translateY(${scrollY}px)` }}>{children}</div>
      </div>
    </AbsoluteFill>
  );
}

// ── Background ─────────────────────────────────────────────────────────────
function Background() {
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <div
        style={{
          position: "absolute",
          borderRadius: "50%",
          width: 900 * S,
          height: 900 * S,
          top: -200 * S,
          left: -150 * S,
          background: "radial-gradient(circle, rgba(124,255,178,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          borderRadius: "50%",
          width: 700 * S,
          height: 700 * S,
          top: 300 * S,
          right: -100 * S,
          background: "radial-gradient(circle, rgba(124,255,178,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          borderRadius: "50%",
          width: 500 * S,
          height: 500 * S,
          bottom: 100 * S,
          left: 300 * S,
          background: "radial-gradient(circle, rgba(255,209,102,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
          backgroundSize: `${60 * S}px ${60 * S}px`,
          pointerEvents: "none",
        }}
      />
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
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: NAV_H,
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.primaryBorder}`,
          padding: `${6 * S}px ${32 * S}px`,
          transform: `translateY(${interpolate(slideIn, [0, 1], [-NAV_H, 0])}px)`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 18 * S,
            color: C.muted,
            fontFamily: "'Space Mono', monospace",
            letterSpacing: "0.05em",
          }}
        >
          <span>每日 AI 知識庫</span>
          <span style={{ color: C.primary }}>{current.label}</span>
        </div>
        <div
          style={{
            height: 3 * S,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 99,
            overflow: "hidden",
            marginTop: 4 * S,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: C.primary,
              borderRadius: 99,
              boxShadow: `0 0 ${8 * S}px ${C.primary}88`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ── iMessage Callout system ────────────────────────────────────────────────
function IMessageCard({ callout, slotIndex, globalFrame }: { callout: Callout; slotIndex: number; globalFrame: number }) {
  const { fps } = useVideoConfig();
  const f = Math.max(0, globalFrame - callout.from);
  const remaining = callout.to - globalFrame;
  const slideY = spring({ frame: f, fps, config: { damping: 22, stiffness: 130 } });
  const translateY = interpolate(slideY, [0, 1], [-NOTIF_SLIDE_H, 0], clamp);
  const fadeOut =
    remaining < FADE_OUT_FRAMES
      ? interpolate(remaining, [0, FADE_OUT_FRAMES], [0, 1], clamp)
      : 1;
  const slotOffset = slotIndex * NOTIF_SLOT;
  return (
    <div
      style={{
        position: "absolute",
        top: NOTIF_TOP + slotOffset,
        right: NOTIF_RIGHT,
        width: NOTIF_W,
        opacity: fadeOut,
        transform: `translateY(${translateY}px)`,
        zIndex: 100,
        background: "rgba(18,18,18,0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 16 * S,
        border: `1px solid rgba(124,255,178,0.2)`,
        padding: `${14 * S}px ${16 * S}px`,
        boxShadow: `0 ${8 * S}px ${24 * S}px rgba(0,0,0,0.6)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 * S, marginBottom: 8 * S }}>
        <div
          style={{
            width: 10 * S,
            height: 10 * S,
            borderRadius: "50%",
            background: C.primary,
            boxShadow: `0 0 ${6 * S}px ${C.primary}`,
          }}
        />
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 18 * S,
            color: C.primary,
            letterSpacing: "0.05em",
          }}
        >
          {callout.sender}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 18 * S,
          color: C.text,
          lineHeight: 1.55,
        }}
      >
        {callout.text}
      </div>
    </div>
  );
}

function IMessageOverlay({ globalFrame }: { globalFrame: number }) {
  const active = ALL_CALLOUTS.filter((c) => globalFrame >= c.from && globalFrame < c.to);
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

// 1. ThreeTopicsAnimation — TitleScene, RIGHT side
//    Triggered when narrator says "這週的AI圈很熱鬧" (2.94s); items appear in sync
//    with each "AI 開始..." / "AI 工具..." / "Google 宣佈..." cue.
function ThreeTopicsAnimation({ triggerFrame }: { triggerFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerFrame);
  const DURATION = 500;
  const envelope = interpolate(f, [0, 10, DURATION - 20, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // appearsAt relative to triggerFrame (=88):
  //  Item1 @ 5.22s → frame 157 → 157-88 = 69
  //  Item2 @ 8.22s → frame 247 → 247-88 = 159
  //  Item3 @10.92s → frame 328 → 328-88 = 240
  const items = [
    { emoji: "🛡️", label: "AI 駭系統", color: C.red, appearsAt: 69 },
    { emoji: "💰", label: "ChatGPT 廣告", color: C.yellow, appearsAt: 159 },
    { emoji: "📱", label: "Gemini 接管", color: C.primary, appearsAt: 240 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 40 * S,
        top: 200 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        gap: 16 * S,
        width: 300 * S,
      }}
    >
      {items.map((item, i) => {
        const itemF = Math.max(0, f - item.appearsAt);
        const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const itemTx = interpolate(itemF, [0, 22], [40 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const scale = easeOutBack(prog(itemF, 22));
        return (
          <div
            key={i}
            style={{
              opacity: itemOp,
              transform: `translateX(${itemTx}px) scale(${scale})`,
              display: "flex",
              alignItems: "center",
              gap: 14 * S,
              background: "rgba(0,0,0,0.88)",
              border: `1px solid ${item.color}55`,
              borderLeft: `3px solid ${item.color}`,
              borderRadius: 12 * S,
              padding: `${14 * S}px ${20 * S}px`,
              boxShadow: `0 0 ${20 * S}px ${item.color}22`,
            }}
          >
            <span style={{ fontSize: 32 * S, flexShrink: 0 }}>{item.emoji}</span>
            <span
              style={{
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 22 * S,
                color: item.color,
                fontWeight: "700",
                lineHeight: 1.2,
              }}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 2. ZeroDayHuntAnimation — Scene 1 Phase A, RIGHT side
//    triggerLocalFrame=371 (corresponds to 30.9s "在測試中, Mythos Preview...")
//    Visual: AI scanner finds vulnerabilities in OS / Browser / FreeBSD
//    Step delays (relative to trigger):
//      step1 @  0   ("在測試中" 30.9s)
//      step2 @145   ("零日漏洞" 35.74s)
//      step3 @395   ("自動入侵" 44.08s)
//      step4 @581   ("FreeBSD" 50.26s)
//      step5 @714   ("完成入侵" 54.7s)
function ZeroDayHuntAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 970;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const aiScale = easeOutBack(prog(f, 22));
  const scanCycle = (Math.sin(f * 0.07) + 1) / 2; // 0..1 looping
  const scanY = 30 * S + scanCycle * 90 * S;

  const targets = [
    { emoji: "🪟", label: "OS", appearsAt: 0, exploitAt: 145 },
    { emoji: "🌐", label: "瀏覽器", appearsAt: 60, exploitAt: 220 },
    { emoji: "🐡", label: "FreeBSD", appearsAt: 120, exploitAt: 581 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 40 * S,
        top: 180 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        width: 300 * S,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14 * S,
      }}
    >
      {/* AI scanner header */}
      <div
        style={{
          transform: `scale(${aiScale})`,
          display: "flex",
          alignItems: "center",
          gap: 10 * S,
          fontFamily: "'Space Mono', monospace",
          fontSize: 18 * S,
          color: C.primary,
          background: C.primaryLight,
          border: `1px solid ${C.primaryBorder}`,
          borderRadius: 10 * S,
          padding: `${8 * S}px ${14 * S}px`,
          textShadow: `0 0 ${10 * S}px rgba(124,255,178,0.6)`,
        }}
      >
        <span style={{ fontSize: 22 * S }}>🤖</span>
        Mythos · 掃描中
      </div>

      {/* Scan area with scanline */}
      <div
        style={{
          position: "relative",
          width: 280 * S,
          padding: `${14 * S}px ${16 * S}px`,
          background: "rgba(0,0,0,0.82)",
          border: `1px solid rgba(255,107,107,0.25)`,
          borderRadius: 12 * S,
        }}
      >
        {/* Scanline */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: scanY,
            height: 2 * S,
            background: `linear-gradient(to right, transparent, ${C.primary}, transparent)`,
            boxShadow: `0 0 ${10 * S}px ${C.primary}`,
            opacity: 0.7,
            pointerEvents: "none",
          }}
        />

        {targets.map((t, i) => {
          const tF = Math.max(0, f - t.appearsAt);
          const tOp = interpolate(tF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const tTx = interpolate(tF, [0, 22], [20 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          const exF = Math.max(0, f - t.exploitAt);
          const exploited = exF > 0;
          const exOp = interpolate(exF, [0, 18], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const exScale = easeOutBack(prog(exF, 22));
          return (
            <div
              key={i}
              style={{
                opacity: tOp,
                transform: `translateX(${tTx}px)`,
                display: "flex",
                alignItems: "center",
                gap: 12 * S,
                padding: `${8 * S}px ${10 * S}px`,
                marginBottom: i < targets.length - 1 ? 8 * S : 0,
                background: exploited ? "rgba(255,107,107,0.12)" : "transparent",
                borderRadius: 8 * S,
                border: exploited ? `1px solid ${C.redBorder}` : `1px solid transparent`,
                transition: "background 0.3s",
              }}
            >
              <span style={{ fontSize: 22 * S }}>{t.emoji}</span>
              <span
                style={{
                  flex: 1,
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 18 * S,
                  color: exploited ? C.red : C.text,
                  fontWeight: exploited ? "700" : "400",
                }}
              >
                {t.label}
              </span>
              <span
                style={{
                  opacity: exOp,
                  transform: `scale(${exScale})`,
                  fontSize: 20 * S,
                  color: C.red,
                  filter: `drop-shadow(0 0 ${6 * S}px ${C.red})`,
                }}
              >
                🚨
              </span>
            </div>
          );
        })}
      </div>

      {/* FreeBSD callout: "17 年漏洞" */}
      {f > 581 && (
        <div
          style={{
            opacity: interpolate(f - 581, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
            transform: `scale(${easeOutBack(prog(f - 581, 22))})`,
            fontFamily: "'Space Mono', monospace",
            fontSize: 18 * S,
            color: C.red,
            background: C.redLight,
            border: `1.5px solid ${C.red}`,
            borderRadius: 10 * S,
            padding: `${8 * S}px ${14 * S}px`,
            textAlign: "center" as const,
            boxShadow: `0 0 ${16 * S}px rgba(255,107,107,0.4)`,
            textShadow: `0 0 ${10 * S}px ${C.red}`,
          }}
        >
          潛伏 17 年 · 完全自主入侵
        </div>
      )}
    </div>
  );
}

// 3. GlasswingDistributionAnimation — Scene 1 Phase B, LEFT side
//    triggerLocalFrame=1612 (72.28s "他們把這個計畫叫做Project Glasswing")
//    Visual: Mythos brain center → arrows to 5 partner company badges
//    Step delays:
//      step1 @  0  (Mythos core)
//      step2 @ 92  (company list — 75.32s "AWS Apple Google Microsoft Cisco")
//      step3 @420  (shield secured — 82.92s "搶在壞人發現之前")
function GlasswingDistributionAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 546;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const coreScale = easeOutBack(prog(f, 22));
  const companies = ["AWS", "Apple", "Google", "Microsoft", "Cisco"];

  return (
    <div
      style={{
        position: "absolute",
        left: 40 * S,
        top: 200 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        width: 280 * S,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14 * S,
      }}
    >
      {/* Mythos core */}
      <div
        style={{
          transform: `scale(${coreScale})`,
          fontFamily: "'Space Mono', monospace",
          fontSize: 20 * S,
          color: C.primary,
          fontWeight: "700",
          background: C.primaryLight,
          border: `2px solid ${C.primary}`,
          borderRadius: 10 * S,
          padding: `${10 * S}px ${18 * S}px`,
          textShadow: `0 0 ${12 * S}px rgba(124,255,178,0.7)`,
          boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.35)`,
        }}
      >
        Project Glasswing
      </div>

      {/* Down arrow */}
      <div
        style={{
          width: 2 * S,
          height: interpolate(f, [0, 28], [0, 28 * S], { easing: E.outExpo, extrapolateRight: "clamp" }),
          background: `linear-gradient(to bottom, ${C.primary}, rgba(124,255,178,0.3))`,
        }}
      />

      {/* Companies grid */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap" as const,
          gap: 8 * S,
          justifyContent: "center",
          maxWidth: 260 * S,
        }}
      >
        {companies.map((co, i) => {
          const stagger = 92 + i * 14;
          const itemF = Math.max(0, f - stagger);
          const itemOp = interpolate(itemF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
          const itemTy = interpolate(itemF, [0, 22], [16 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
          return (
            <span
              key={i}
              style={{
                opacity: itemOp,
                transform: `translateY(${itemTy}px)`,
                fontFamily: "'Space Mono', monospace",
                fontSize: 18 * S,
                color: C.text,
                background: "rgba(255,255,255,0.07)",
                border: `1px solid rgba(255,255,255,0.15)`,
                borderRadius: 8 * S,
                padding: `${6 * S}px ${12 * S}px`,
              }}
            >
              {co}
            </span>
          );
        })}
      </div>

      {/* Shield secured callout */}
      {f > 420 && (
        <div
          style={{
            opacity: interpolate(f - 420, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
            transform: `scale(${easeOutBack(prog(f - 420, 22))})`,
            display: "flex",
            alignItems: "center",
            gap: 10 * S,
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 18 * S,
            color: C.primary,
            fontWeight: "700",
            background: C.primaryLight,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 10 * S,
            padding: `${8 * S}px ${14 * S}px`,
          }}
        >
          <span style={{ fontSize: 22 * S }}>🛡️</span>
          搶先修補
        </div>
      )}
    </div>
  );
}

// 4. AdThresholdDropAnimation — Scene 2 Phase A, RIGHT side
//    triggerLocalFrame=417 (128.96s "最低預算高達5萬美元")
//    Visual: $50,000 threshold barrier drops to $0; revenue targets reveal
//    Step delays (relative to trigger=417):
//      step1 @  0  ($50,000 barrier)
//      step2 @108  (drops to $0, 132.56s "降到零")
//      step3 @401  ($25B target, 142.34s "今年靠廣告賺25億美元")
//      step4 @551  ($100B target, 147.34s "2030年賺到1000億美元")
function AdThresholdDropAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 641;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  // Threshold animation: starts at $50,000 (red), drops to $0 at f=108
  const dropProgress = interpolate(f, [108, 130], [0, 1], { easing: E.outExpo, ...clamp });
  const thresholdColor = dropProgress > 0.5 ? C.primary : C.red;
  const oldValue = "$50,000";
  const newValue = "$0";

  // Revenue counters
  const revF1 = Math.max(0, f - 401);
  const revVal1 = Math.round(interpolate(revF1, [0, 60], [0, 25], { easing: E.outExpo, extrapolateRight: "clamp" }));
  const revOp1 = interpolate(revF1, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  const revF2 = Math.max(0, f - 551);
  const revVal2 = Math.round(interpolate(revF2, [0, 60], [0, 1000], { easing: E.outExpo, extrapolateRight: "clamp" }));
  const revOp2 = interpolate(revF2, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        right: 40 * S,
        top: 180 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        width: 300 * S,
        display: "flex",
        flexDirection: "column",
        gap: 14 * S,
      }}
    >
      {/* Threshold drop card */}
      <div
        style={{
          background: "rgba(0,0,0,0.85)",
          border: `1px solid ${dropProgress > 0.5 ? C.primaryBorder : C.redBorder}`,
          borderRadius: 12 * S,
          padding: `${14 * S}px ${16 * S}px`,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 18 * S,
            color: C.muted,
            letterSpacing: "0.08em",
            marginBottom: 8 * S,
          }}
        >
          投放門檻
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10 * S,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 22 * S,
              fontWeight: "700",
              color: dropProgress > 0.3 ? C.muted : C.red,
              textDecoration: dropProgress > 0.3 ? "line-through" : "none",
              transition: "color 0.3s",
            }}
          >
            {oldValue}
          </div>
          <div
            style={{
              fontSize: 20 * S,
              color: thresholdColor,
              filter: `drop-shadow(0 0 ${6 * S}px ${thresholdColor})`,
            }}
          >
            →
          </div>
          <div
            style={{
              opacity: dropProgress,
              transform: `scale(${0.6 + dropProgress * 0.4})`,
              fontFamily: "'Space Mono', monospace",
              fontSize: 28 * S,
              fontWeight: "700",
              color: C.primary,
              textShadow: `0 0 ${12 * S}px rgba(124,255,178,0.6)`,
            }}
          >
            {newValue}
          </div>
        </div>
      </div>

      {/* Revenue targets */}
      {f > 401 && (
        <div
          style={{
            opacity: revOp1,
            background: "rgba(0,0,0,0.85)",
            border: `1px solid ${C.yellowBorder}`,
            borderLeft: `3px solid ${C.yellow}`,
            borderRadius: 12 * S,
            padding: `${12 * S}px ${16 * S}px`,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 18 * S,
              color: C.muted,
              letterSpacing: "0.06em",
              marginBottom: 6 * S,
            }}
          >
            2026 目標
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 24 * S,
              color: C.yellow,
              fontWeight: "700",
              textShadow: `0 0 ${10 * S}px rgba(255,209,102,0.5)`,
            }}
          >
            ${revVal1}B
          </div>
        </div>
      )}

      {f > 551 && (
        <div
          style={{
            opacity: revOp2,
            background: "rgba(0,0,0,0.85)",
            border: `1px solid ${C.primaryBorder}`,
            borderLeft: `3px solid ${C.primary}`,
            borderRadius: 12 * S,
            padding: `${12 * S}px ${16 * S}px`,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 18 * S,
              color: C.muted,
              letterSpacing: "0.06em",
              marginBottom: 6 * S,
            }}
          >
            2030 長期目標
          </div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 28 * S,
              color: C.primary,
              fontWeight: "700",
              textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.6)`,
            }}
          >
            ${revVal2}B
          </div>
        </div>
      )}
    </div>
  );
}

// 5. AppActionFlowAnimation — Scene 3 Phase A, RIGHT side
//    triggerLocalFrame=474 (205.32s "跨 App 完成複雜任務")
//    Visual: Gemini center node → connects to multiple apps with action checks
//    Step delays:
//      step1 @  0  (Gemini node)
//      step2 @133  (Yoga app, 209.76s "預約瑜伽課")
//      step3 @420  (Cart app, 219.34s "購物清單")
//      step4 @550  (complete check, 223.68s "完成操作")
function AppActionFlowAnimation({ triggerLocalFrame }: { triggerLocalFrame: number }) {
  const frame = useCurrentFrame();
  const f = Math.max(0, frame - triggerLocalFrame);
  const DURATION = 640;
  const envelope = interpolate(f, [0, 12, DURATION - 24, DURATION], [0, 1, 1, 0], clamp);
  if (f > DURATION) return null;

  const geminiScale = easeOutBack(prog(f, 22));

  const apps = [
    { emoji: "📅", label: "瑜伽預約", appearsAt: 133, actAt: 213 },
    { emoji: "🛒", label: "購物車", appearsAt: 420, actAt: 500 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        right: 40 * S,
        top: 180 * S,
        opacity: envelope,
        pointerEvents: "none",
        zIndex: 50,
        width: 300 * S,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16 * S,
      }}
    >
      {/* Gemini core */}
      <div
        style={{
          transform: `scale(${geminiScale})`,
          display: "flex",
          alignItems: "center",
          gap: 10 * S,
          fontFamily: "'Space Mono', monospace",
          fontSize: 20 * S,
          color: C.primary,
          fontWeight: "700",
          background: C.primaryLight,
          border: `2px solid ${C.primary}`,
          borderRadius: 12 * S,
          padding: `${10 * S}px ${18 * S}px`,
          textShadow: `0 0 ${12 * S}px rgba(124,255,178,0.6)`,
          boxShadow: `0 0 ${20 * S}px rgba(124,255,178,0.35)`,
        }}
      >
        <span style={{ fontSize: 22 * S }}>✨</span>
        Gemini
      </div>

      {/* Apps */}
      {apps.map((app, i) => {
        const aF = Math.max(0, f - app.appearsAt);
        const aOp = interpolate(aF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const aTx = interpolate(aF, [0, 22], [30 * S, 0], { easing: E.outExpo, extrapolateRight: "clamp" });
        const actF = Math.max(0, f - app.actAt);
        const actOp = interpolate(actF, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" });
        const actScale = easeOutBack(prog(actF, 22));
        return (
          <div
            key={i}
            style={{
              opacity: aOp,
              transform: `translateX(${aTx}px)`,
              display: "flex",
              alignItems: "center",
              gap: 12 * S,
              background: "rgba(0,0,0,0.85)",
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 12 * S,
              padding: `${12 * S}px ${16 * S}px`,
              width: 260 * S,
            }}
          >
            <span style={{ fontSize: 28 * S }}>{app.emoji}</span>
            <span
              style={{
                flex: 1,
                fontFamily: "'Noto Sans TC', sans-serif",
                fontSize: 20 * S,
                color: C.text,
                fontWeight: "700",
              }}
            >
              {app.label}
            </span>
            <span
              style={{
                opacity: actOp,
                transform: `scale(${actScale})`,
                fontSize: 22 * S,
                color: C.primary,
                fontWeight: "700",
                filter: `drop-shadow(0 0 ${6 * S}px ${C.primary})`,
              }}
            >
              ✓
            </span>
          </div>
        );
      })}

      {/* Final action label */}
      {f > 550 && (
        <div
          style={{
            opacity: interpolate(f - 550, [0, 22], [0, 1], { easing: E.outCubic, extrapolateRight: "clamp" }),
            transform: `scale(${easeOutBack(prog(f - 550, 22))})`,
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 18 * S,
            color: C.primary,
            fontWeight: "700",
            background: C.primaryLight,
            border: `1px solid ${C.primaryBorder}`,
            borderRadius: 8 * S,
            padding: `${6 * S}px ${14 * S}px`,
          }}
        >
          自動完成行動
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Scene Components ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ── TitleScene ─────────────────────────────────────────────────────────────
function TitleScene() {
  const dur = SCENES_2026_05_15.title.to - SCENES_2026_05_15.title.from;
  const badgeOp = useFadeIn(5);
  const subtitleStyle = useFadeUp(30);
  const tagStyle = useFadeUp(46);

  return (
    <SceneFade durationInFrames={dur}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: SUBTITLE_SAFE,
          paddingLeft: 80 * S,
          paddingRight: 80 * S,
          textAlign: "center",
        }}
      >
        {/* Badge */}
        <div style={{ ...badgeOp, marginBottom: 14 * S }}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 18 * S,
              color: C.primary,
              letterSpacing: "0.12em",
              background: C.primaryLight,
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 6 * S,
              padding: `${5 * S}px ${14 * S}px`,
            }}
          >
            每日 AI 知識庫
          </span>
        </div>

        {/* H1 line 1 */}
        <h1
          style={{
            margin: 0,
            lineHeight: 1.15,
            fontFamily: "'Noto Sans TC', sans-serif",
            fontWeight: 900,
            fontSize: 40 * S,
            color: C.text,
          }}
        >
          <WordReveal
            text="本週 AI 大事"
            startFrame={10}
            staggerPerWord={6}
            fontSize={40 * S}
            color={C.text}
            fontFamily="'Noto Sans TC', sans-serif"
            fontWeight={900}
          />
        </h1>

        {/* H1 line 2 — neon green accent */}
        <h1
          style={{
            margin: 0,
            lineHeight: 1.2,
            marginTop: 4 * S,
            fontFamily: "'Noto Sans TC', sans-serif",
            fontWeight: 900,
            fontSize: 28 * S,
            color: C.primary,
          }}
        >
          <WordReveal
            text="三件你該知道的事"
            startFrame={28}
            staggerPerWord={6}
            fontSize={28 * S}
            color={C.primary}
            fontFamily="'Noto Sans TC', sans-serif"
            fontWeight={900}
          />
        </h1>

        {/* Subtitle */}
        <p
          style={{
            ...subtitleStyle,
            marginTop: 20 * S,
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 20 * S,
            color: C.muted,
            lineHeight: 1.6,
          }}
        >
          Mythos Preview · ChatGPT 廣告 · Gemini Android
        </p>

        {/* Tag line */}
        <div style={{ ...tagStyle, marginTop: 16 * S }}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 18 * S,
              color: C.muted,
              letterSpacing: "0.1em",
            }}
          >
            資安 · 廣告 · AI 助理
          </span>
        </div>
      </AbsoluteFill>

      {/* Concept animation: ThreeTopicsAnimation at frame 88 (2.94s "AI圈很熱鬧") */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ThreeTopicsAnimation triggerFrame={88} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene1 — Claude Mythos Preview & 駭系統 ───────────────────────────────
function Scene1() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_15.scene1.to - SCENES_2026_05_15.scene1.from;
  // Local frames = global - 556

  // Phase A delays (VTT-aligned):
  const DEF_CARD_AT = 0; // 18.52s "先說第一件"
  const NAME_CARD_AT = 215; // 25.7s "叫做 Claude Mythos Preview"
  const CAPABILITY_AT = 285; // 28.04s "核心能力是資安"
  const ABILITIES_AT = 371; // 30.9s "Mythos Preview 能自主識別零日漏洞"
  const FREEBSD_AT = 952; // 50.26s "FreeBSD 17 年漏洞"

  // Concept animation triggers
  const ZERO_DAY_HUNT_AT = 371; // 30.9s — ZeroDayHuntAnimation (right)

  // Phase A → B boundary at 72.28s "Project Glasswing" → local 1612
  const A_FADE_START = 1612 - 80; // 1532
  const A_REMOVE = 1612;
  const showA = frame < A_REMOVE;
  const aOpacity =
    frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B delays
  const B_SHOW_AT = A_REMOVE; // 1612
  const GLASSWING_CARD_AT = 1612; // 72.28s
  const PARTNERS_AT = 1704; // 75.32s "AWS Apple Google Microsoft Cisco"
  const SIGNAL_AT = 2239; // 93.16s "AI 能力邊界已大幅移動"

  // Concept animation: Glasswing (left)
  const GLASSWING_ANIM_AT = 1612;

  const showB = frame >= B_SHOW_AT;

  const defStyle = useFadeUp(DEF_CARD_AT);
  const nameStyle = useFadeUp(NAME_CARD_AT);
  const capStyle = useFadeUp(CAPABILITY_AT);
  const abilStyle = useFadeUp(ABILITIES_AT);
  const freebsdStyle = useFadeUp(FREEBSD_AT);

  const glasswingStyle = useFadeUp(showB ? GLASSWING_CARD_AT : 999999);
  const partnersStyle = useFadeUp(showB ? PARTNERS_AT : 999999);
  const signalStyle = useFadeUp(showB ? SIGNAL_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn scrollUp={{ at: FREEBSD_AT - 30, amount: 500 }}>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Intro card */}
            <div style={{ ...defStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  display: "inline-block",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18 * S,
                  color: C.red,
                  letterSpacing: "0.1em",
                  background: C.redLight,
                  border: `1px solid ${C.redBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                  marginBottom: 10 * S,
                }}
              >
                第一件
              </div>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 22 * S,
                  color: C.text,
                  fontWeight: "700",
                  lineHeight: 1.4,
                }}
              >
                Anthropic 推出強力新模型
              </div>
            </div>

            {/* Model name card */}
            <div style={{ ...nameStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                  boxShadow: `0 0 ${30 * S}px rgba(124,255,178,0.06)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 28 * S,
                    color: C.primary,
                    fontWeight: "700",
                    letterSpacing: "0.04em",
                    textShadow: `0 0 ${20 * S}px rgba(124,255,178,0.5)`,
                    marginBottom: 8 * S,
                  }}
                >
                  Claude Mythos Preview
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.muted,
                    lineHeight: 1.5,
                  }}
                >
                  核心能力 · 資安
                </div>
              </div>
            </div>

            {/* Capability card */}
            <div style={{ ...capStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: C.yellowLight,
                  border: `1px solid ${C.yellowBorder}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.yellow,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  能做到的事
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.text,
                    fontWeight: "700",
                    lineHeight: 1.5,
                  }}
                >
                  自主識別 OS / 瀏覽器零日漏洞
                </div>
              </div>
            </div>

            {/* Abilities list */}
            <div style={{ ...abilStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.surfaceBorder}`,
                  borderRadius: 12 * S,
                  padding: `${12 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                    paddingBottom: 8 * S,
                    borderBottom: `1px solid rgba(255,255,255,0.04)`,
                  }}
                >
                  · 識別還沒公開的安全漏洞
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.6,
                    paddingTop: 8 * S,
                  }}
                >
                  · 找到後自動利用、完成入侵
                </div>
              </div>
            </div>

            {/* FreeBSD case */}
            <div style={{ ...freebsdStyle }}>
              <div
                style={{
                  background: C.redLight,
                  border: `1.5px solid ${C.red}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                  boxShadow: `0 0 ${24 * S}px rgba(255,107,107,0.15)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.red,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  案例 · 最驚人
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: "700",
                    lineHeight: 1.4,
                  }}
                >
                  獨力找出潛伏 17 年的 FreeBSD 漏洞
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.muted,
                    marginTop: 6 * S,
                  }}
                >
                  並完全自主地完成入侵
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            {/* Glasswing announcement */}
            <div style={{ ...glasswingStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  display: "inline-block",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18 * S,
                  color: C.primary,
                  letterSpacing: "0.1em",
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                  marginBottom: 10 * S,
                }}
              >
                計畫
              </div>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 24 * S,
                    color: C.primary,
                    fontWeight: "700",
                    letterSpacing: "0.03em",
                    textShadow: `0 0 ${14 * S}px rgba(124,255,178,0.5)`,
                    marginBottom: 8 * S,
                  }}
                >
                  Project Glasswing
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.text,
                    lineHeight: 1.55,
                  }}
                >
                  防守方搶先一步用 AI 找漏洞、修補它
                </div>
              </div>
            </div>

            {/* Partner companies card */}
            <div style={{ ...partnersStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.surfaceBorder}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 10 * S,
                  }}
                >
                  合作對象
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8 * S,
                    flexWrap: "wrap" as const,
                  }}
                >
                  {["AWS", "Apple", "Google", "Microsoft", "Cisco"].map((co, i) => (
                    <span
                      key={i}
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 18 * S,
                        color: C.primary,
                        background: C.primaryLight,
                        border: `1px solid ${C.primaryBorder}`,
                        borderRadius: 6 * S,
                        padding: `${5 * S}px ${12 * S}px`,
                      }}
                    >
                      {co}
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.muted,
                    lineHeight: 1.5,
                    marginTop: 10 * S,
                  }}
                >
                  目前不對一般使用者開放
                </div>
              </div>
            </div>

            {/* Signal highlight */}
            <div style={{ ...signalStyle }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1.5px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                  boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.15)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.primary,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  訊號
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.primary,
                    fontWeight: "700",
                    lineHeight: 1.4,
                  }}
                >
                  AI 的能力邊界已經大幅移動
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <ZeroDayHuntAnimation triggerLocalFrame={ZERO_DAY_HUNT_AT} />
        <GlasswingDistributionAnimation triggerLocalFrame={GLASSWING_ANIM_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene2 — ChatGPT 廣告 ──────────────────────────────────────────────────
function Scene2() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_15.scene2.to - SCENES_2026_05_15.scene2.from;
  // Local frames = global - 3452

  // Phase A delays:
  const HEADER_AT = 0; // 115.08s "第二件事"
  const ANNOUNCE_AT = 131; // 119.44s "ChatGPT 廣告自助平台"
  const THRESHOLD_AT = 417; // 128.96s "5萬美元"
  const REVENUE_AT = 818; // 142.34s "今年 25 億"

  // Concept animation: AdThresholdDrop (right)
  const AD_DROP_AT = 417;

  // Phase A → B at 152.02s "AI 素養意義" → local 1109
  const A_FADE_START = 1109 - 80;
  const A_REMOVE = 1109;
  const showA = frame < A_REMOVE;
  const aOpacity =
    frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B delays
  const B_SHOW_AT = A_REMOVE; // 1109
  const LITERACY_AT = 1109; // 152.02s
  const QUESTION_AT = 1184; // 154.52s "問 ChatGPT 推薦"
  const WARN_AT = 1419; // 162.36s "可能受到廣告影響"
  const STANCE_AT = 1674; // 170.86s "改變立場"
  const showB = frame >= B_SHOW_AT;

  const headerStyle = useFadeUp(HEADER_AT);
  const announceStyle = useFadeUp(ANNOUNCE_AT);
  const thresholdStyle = useFadeUp(THRESHOLD_AT);
  const revenueStyle = useFadeUp(REVENUE_AT);
  const literacyStyle = useFadeUp(showB ? LITERACY_AT : 999999);
  const questionStyle = useFadeUp(showB ? QUESTION_AT : 999999);
  const warnStyle = useFadeUp(showB ? WARN_AT : 999999);
  const stanceStyle = useFadeUp(showB ? STANCE_AT : 999999);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Header */}
            <div style={{ ...headerStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  display: "inline-block",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18 * S,
                  color: C.yellow,
                  letterSpacing: "0.1em",
                  background: C.yellowLight,
                  border: `1px solid ${C.yellowBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                }}
              >
                第二件
              </div>
            </div>

            {/* Announcement */}
            <div style={{ ...announceStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.yellowBorder}`,
                  borderRadius: 14 * S,
                  padding: `${16 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.muted,
                    letterSpacing: "0.06em",
                    marginBottom: 8 * S,
                  }}
                >
                  OpenAI 正式上線
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 24 * S,
                    color: C.text,
                    fontWeight: "700",
                    lineHeight: 1.4,
                  }}
                >
                  ChatGPT 廣告自助平台
                </div>
              </div>
            </div>

            {/* Threshold change */}
            <div style={{ ...thresholdStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  門檻變化
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.text,
                    lineHeight: 1.55,
                  }}
                >
                  以前 · 透過合作夥伴 · 最低 5 萬美元
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.primary,
                    fontWeight: "700",
                    lineHeight: 1.5,
                    marginTop: 6 * S,
                  }}
                >
                  現在 · 任何品牌 · 門檻歸零
                </div>
              </div>
            </div>

            {/* Revenue targets */}
            <div style={{ ...revenueStyle }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.surfaceBorder}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${22 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 10 * S,
                  }}
                >
                  營收目標
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  2026 年 · 25 億美元
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.primary,
                    fontWeight: "700",
                    lineHeight: 1.5,
                    marginTop: 4 * S,
                  }}
                >
                  2030 年 · 1000 億美元
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            {/* AI literacy header */}
            <div style={{ ...literacyStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18 * S,
                  color: C.yellow,
                  letterSpacing: "0.1em",
                  background: C.yellowLight,
                  border: `1px solid ${C.yellowBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                  display: "inline-block",
                  marginBottom: 10 * S,
                }}
              >
                AI 素養
              </div>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 22 * S,
                  color: C.text,
                  fontWeight: "700",
                  lineHeight: 1.4,
                }}
              >
                當你問 ChatGPT 推薦，要開始思考一件事
              </div>
            </div>

            {/* Question card */}
            <div style={{ ...questionStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.surfaceBorder}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.text,
                    lineHeight: 1.6,
                  }}
                >
                  「這個品牌的產品好不好？」
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.text,
                    lineHeight: 1.6,
                    marginTop: 4 * S,
                  }}
                >
                  「推薦我買哪款？」
                </div>
              </div>
            </div>

            {/* Warn card */}
            <div style={{ ...warnStyle, marginBottom: 16 * S }}>
              <div
                style={{
                  background: C.yellowLight,
                  border: `1.5px solid ${C.yellow}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                  boxShadow: `0 0 ${24 * S}px rgba(255,209,102,0.12)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.yellow,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  ⚠ 思考點
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: "700",
                    lineHeight: 1.4,
                  }}
                >
                  它的答案有沒有可能受到廣告影響？
                </div>
              </div>
            </div>

            {/* Stance shift */}
            <div style={{ ...stanceStyle }}>
              <div
                style={{
                  background: C.redLight,
                  border: `1px solid ${C.redBorder}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.red,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  立場改變
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.text,
                    lineHeight: 1.55,
                  }}
                >
                  廣告存在本身，已經改變了工具的立場 — 它不再是純粹只為你服務的助理
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <AdThresholdDropAnimation triggerLocalFrame={AD_DROP_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── Scene3 — Gemini Android ────────────────────────────────────────────────
function Scene3() {
  const frame = useCurrentFrame();
  const dur = SCENES_2026_05_15.scene3.to - SCENES_2026_05_15.scene3.from;
  // Local frames = global - 5686

  // Phase A delays:
  const HEADER_AT = 0; // 189.52s "第三件事是Google"
  const ANNOUNCE_AT = 64; // 191.68s "Android 發布活動"
  const REPLACE_AT = 313; // 199.98s "取代 Google Assistant"
  const NEW_ABILITY_AT = 474; // 205.32s "跨 App 完成任務"
  const EX1_AT = 607; // 209.76s "預約瑜伽"
  const EX2_AT = 894; // 219.34s "購物車"

  // Concept animation: AppActionFlow (right)
  const APP_ACTION_AT = 474;

  // Phase A → B at 227.34s "Google 特別強調" → local 1134
  const A_FADE_START = 1134 - 80;
  const A_REMOVE = 1134;
  const showA = frame < A_REMOVE;
  const aOpacity =
    frame > A_FADE_START ? interpolate(frame, [A_FADE_START, A_REMOVE], [1, 0], clamp) : 1;

  // Phase B delays
  const B_SHOW_AT = A_REMOVE; // 1134
  const EMPHASIS_AT = 1134; // 227.34s "Google 特別強調"
  const LOOP_AT = 1380; // 235.52s "人還在決策迴圈"
  const CONTEXT_AT = 1531; // 240.56s "Apple Siri 競爭"
  const UPGRADE_AT = 1855; // 251.36s "升級到採取行動"
  const showB = frame >= B_SHOW_AT;

  const headerStyle = useFadeUp(HEADER_AT);
  const announceStyle = useFadeUp(ANNOUNCE_AT);
  const replaceStyle = useFadeUp(REPLACE_AT);
  const newAbilStyle = useFadeUp(NEW_ABILITY_AT);
  const ex1Style = useFadeUp(EX1_AT);
  const ex2Style = useFadeUp(EX2_AT);
  const emphStyle = useFadeUp(showB ? EMPHASIS_AT : 999999);
  const loopStyle = useFadeUp(showB ? LOOP_AT : 999999);
  const ctxStyle = useFadeUp(showB ? CONTEXT_AT : 999999);
  const upgradeStyle = useFadeUp(showB ? UPGRADE_AT : 999999);

  // Phase A scrollUp: 5 cards may exceed 1620px after example 2 appears
  // Estimated cumulative height ≈ 1280px; just within bounds — no scrollUp needed

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* ── Phase A ────────────────────────────── */}
        {showA && (
          <div style={{ opacity: aOpacity }}>
            {/* Header */}
            <div style={{ ...headerStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  display: "inline-block",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18 * S,
                  color: C.primary,
                  letterSpacing: "0.1em",
                  background: C.primaryLight,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 6 * S,
                  padding: `${5 * S}px ${14 * S}px`,
                }}
              >
                第三件
              </div>
            </div>

            {/* Announcement */}
            <div style={{ ...announceStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.primaryBorder}`,
                  borderRadius: 14 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.muted,
                    letterSpacing: "0.06em",
                    marginBottom: 6 * S,
                  }}
                >
                  Google · Android 發布活動
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: "700",
                    lineHeight: 1.4,
                  }}
                >
                  Gemini Intelligence 全面整合 Android
                </div>
              </div>
            </div>

            {/* Replace */}
            <div style={{ ...replaceStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${12 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.primary,
                    fontWeight: "700",
                    lineHeight: 1.5,
                  }}
                >
                  正式取代 Google Assistant
                </div>
              </div>
            </div>

            {/* New ability */}
            <div style={{ ...newAbilStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18 * S,
                  color: C.muted,
                  letterSpacing: "0.08em",
                  marginBottom: 8 * S,
                }}
              >
                新能力
              </div>
              <div
                style={{
                  fontFamily: "'Noto Sans TC', sans-serif",
                  fontSize: 22 * S,
                  color: C.text,
                  fontWeight: "700",
                  lineHeight: 1.4,
                }}
              >
                跨越不同 App · 完成複雜任務
              </div>
            </div>

            {/* Example 1 */}
            <div style={{ ...ex1Style, marginBottom: 12 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.surfaceBorder}`,
                  borderLeft: `3px solid ${C.primary}`,
                  borderRadius: 10 * S,
                  padding: `${10 * S}px ${18 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.text,
                    fontWeight: "700",
                    lineHeight: 1.5,
                  }}
                >
                  📅「幫我預約明天下午的瑜伽課」
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.muted,
                    lineHeight: 1.5,
                    marginTop: 4 * S,
                  }}
                >
                  不只搜尋 — 實際完成預約動作
                </div>
              </div>
            </div>

            {/* Example 2 */}
            <div style={{ ...ex2Style }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.surfaceBorder}`,
                  borderLeft: `3px solid ${C.primary}`,
                  borderRadius: 10 * S,
                  padding: `${10 * S}px ${18 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.text,
                    fontWeight: "700",
                    lineHeight: 1.5,
                  }}
                >
                  🛒「把這個購物清單整理成購物車」
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 18 * S,
                    color: C.muted,
                    lineHeight: 1.5,
                    marginTop: 4 * S,
                  }}
                >
                  直接在電商 App 完成操作
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase B ────────────────────────────── */}
        {showB && (
          <>
            {/* Google emphasis */}
            <div style={{ ...emphStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.yellowLight,
                  border: `1.5px solid ${C.yellow}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                  boxShadow: `0 0 ${24 * S}px rgba(255,209,102,0.12)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.yellow,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  Google 強調
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.text,
                    fontWeight: "700",
                    lineHeight: 1.4,
                  }}
                >
                  涉及金錢或交易動作，會先請你確認
                </div>
              </div>
            </div>

            {/* Decision loop */}
            <div style={{ ...loopStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${12 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.primary,
                    fontWeight: "700",
                    lineHeight: 1.5,
                  }}
                >
                  人還是在決策迴圈裡
                </div>
              </div>
            </div>

            {/* Context: Apple Siri */}
            <div style={{ ...ctxStyle, marginBottom: 14 * S }}>
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.surfaceBorder}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.muted,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  大背景
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 20 * S,
                    color: C.text,
                    lineHeight: 1.55,
                  }}
                >
                  Apple 即將推強化版 AI Siri — Google 搶先讓 Android 體驗更深度
                </div>
              </div>
            </div>

            {/* Upgrade signal */}
            <div style={{ ...upgradeStyle }}>
              <div
                style={{
                  background: C.primaryLight,
                  border: `1.5px solid ${C.primary}`,
                  borderRadius: 12 * S,
                  padding: `${14 * S}px ${20 * S}px`,
                  boxShadow: `0 0 ${24 * S}px rgba(124,255,178,0.15)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 18 * S,
                    color: C.primary,
                    letterSpacing: "0.08em",
                    marginBottom: 8 * S,
                  }}
                >
                  升級
                </div>
                <div
                  style={{
                    fontFamily: "'Noto Sans TC', sans-serif",
                    fontSize: 22 * S,
                    color: C.primary,
                    fontWeight: "700",
                    lineHeight: 1.4,
                  }}
                >
                  從「幫你查資料」 → 「幫你採取行動」
                </div>
              </div>
            </div>
          </>
        )}
      </ContentColumn>

      {/* Concept animations */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <AppActionFlowAnimation triggerLocalFrame={APP_ACTION_AT} />
      </AbsoluteFill>
    </SceneFade>
  );
}

// ── SummaryScene ────────────────────────────────────────────────────────────
function SummaryCard({
  number,
  title,
  text,
  delay,
  color,
  border,
}: {
  number: string;
  title: string;
  text: string;
  delay: number;
  color: string;
  border: string;
}) {
  const style = useFadeUp(delay);
  return (
    <div style={{ ...style, marginBottom: 16 * S }}>
      <div
        style={{
          display: "flex",
          gap: 14 * S,
          alignItems: "flex-start",
          background: `${border}12`,
          border: `1px solid ${border}`,
          borderRadius: 14 * S,
          padding: `${14 * S}px ${20 * S}px`,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 22 * S,
            color,
            fontWeight: "700",
            flexShrink: 0,
            marginTop: 2 * S,
            textShadow: `0 0 ${10 * S}px ${color}88`,
          }}
        >
          {number}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 22 * S,
              color,
              fontWeight: "700",
              lineHeight: 1.4,
              marginBottom: 6 * S,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 18 * S,
              color: C.text,
              lineHeight: 1.6,
            }}
          >
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryScene() {
  const dur = SCENES_2026_05_15.summary.to - SCENES_2026_05_15.summary.from;
  // Local frames = global - 8200
  const BADGE_AT = 0; // 273.32s "重點整理"
  const CARD1_AT = 40; // 274.68s "第一 Claude Mythos Preview"
  const CARD2_AT = 523; // 290.76s "第二 ChatGPT 廣告"
  const CARD3_AT = 820; // 300.68s "第三 Gemini"
  const OUTRO_AT = 1234; // 314.48s "這裡是每日 AI 知識庫"

  const badgeStyle = useFadeIn(BADGE_AT);
  const outroStyle = useFadeIn(OUTRO_AT);

  return (
    <SceneFade durationInFrames={dur}>
      <ContentColumn>
        {/* Badge */}
        <div style={{ ...badgeStyle, marginBottom: 20 * S, marginTop: 24 * S }}>
          <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 18 * S,
              color: C.primary,
              letterSpacing: "0.12em",
              background: C.primaryLight,
              border: `1px solid ${C.primaryBorder}`,
              borderRadius: 6 * S,
              padding: `${5 * S}px ${14 * S}px`,
            }}
          >
            <WordReveal
              text="重點整理"
              startFrame={4}
              staggerPerWord={5}
              fontSize={18 * S}
              color={C.primary}
              fontFamily="'Space Mono', monospace"
              letterSpacing="0.12em"
            />
          </span>
        </div>

        <SummaryCard
          number="01"
          delay={CARD1_AT}
          title="Claude Mythos Preview"
          text="AI 已能自主找出並利用零日漏洞 — 訊號清楚：AI 能力邊界已大幅移動"
          color={C.red}
          border={C.red}
        />
        <SummaryCard
          number="02"
          delay={CARD2_AT}
          title="ChatGPT 開始跑廣告"
          text="免費不等於中立 — 使用 AI 工具時，留意推薦內容背後的立場"
          color={C.yellow}
          border={C.yellow}
        />
        <SummaryCard
          number="03"
          delay={CARD3_AT}
          title="Gemini 全面進 Android"
          text="AI 助理從回答問題升級到跨 App 採取行動 — 便利與隱私的邊界需重新思考"
          color={C.primary}
          border={C.primary}
        />

        {/* Outro */}
        <div style={{ ...outroStyle, marginTop: 10 * S }}>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 18 * S,
              color: C.muted,
              letterSpacing: "0.08em",
              textAlign: "center" as const,
            }}
          >
            每日 AI 知識庫
          </div>
        </div>
      </ContentColumn>
    </SceneFade>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Main Composition ──────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
export function VideoComposition_2026_05_15() {
  const frame = useCurrentFrame();
  const S1 = SCENES_2026_05_15.scene1;
  const S2 = SCENES_2026_05_15.scene2;
  const S3 = SCENES_2026_05_15.scene3;
  const SU = SCENES_2026_05_15.summary;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Audio src={staticFile("audio/2026-05-15-processed.wav")} volume={1.0} />

      <Audio
        src={staticFile("audio/course_background_music.wav")}
        volume={(f) => {
          const v = 0.1;
          const fi = interpolate(f, [0, 45], [0, v], { extrapolateRight: "clamp" });
          const fo = interpolate(
            f,
            [TOTAL_FRAMES_2026_05_15 - 150, TOTAL_FRAMES_2026_05_15],
            [v, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
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

      {/* Scene 1 — Claude Mythos Preview */}
      <Sequence from={S1.from} durationInFrames={S1.to - S1.from}>
        <Scene1 />
      </Sequence>

      {/* Scene 2 — ChatGPT 廣告 */}
      <Sequence from={S2.from} durationInFrames={S2.to - S2.from}>
        <Scene2 />
      </Sequence>

      {/* Scene 3 — Gemini Android */}
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
