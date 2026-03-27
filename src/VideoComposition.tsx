import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  random,
  Audio,
} from "remotion";
import React from "react";
import { AUDIO_CONFIG } from "./audioConfig";
import { CharacterPip } from "./CharacterPip";

// ── Design tokens ─────────────────────────────────────────────────────────
const BG = "#0d0d1a";
const ORANGE = "#FF6B35";
const TEAL = "#20D9BA";
const YELLOW = "#FFD60A";
const TEXT = "#f0f0f8";
const SUBTEXT = "rgba(240,240,248,0.6)";

const glass = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 20,
  boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
} as const;

// ── Animation helpers ─────────────────────────────────────────────────────
function spr(frame: number, delay: number, fps: number, damping = 20, stiffness = 100) {
  return spring({ frame: frame - delay, fps, config: { damping, stiffness, mass: 0.8 } });
}

function fi(frame: number, from: number, to: number, inV = 0, outV = 1) {
  return interpolate(frame, [from, to], [inV, outV], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function morphIn(frame: number, delay: number, fps: number, damping = 20, stiffness = 100) {
  const p = spr(frame, delay, fps, damping, stiffness);
  return {
    opacity: fi(frame, delay, delay + 12),
    transform: `translateY(${interpolate(p, [0, 1], [28, 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})`,
  };
}

// ── Particles ─────────────────────────────────────────────────────────────
function Particles({ count = 28, seed = 0 }: { count?: number; seed?: number }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: count }).map((_, i) => {
        const x = random(`px-${seed}-${i}`) * 1280;
        const y = random(`py-${seed}-${i}`) * 720;
        const size = 2 + random(`ps-${seed}-${i}`) * 4;
        const speed = 0.2 + random(`pv-${seed}-${i}`) * 0.5;
        const phase = random(`pp-${seed}-${i}`) * Math.PI * 2;
        const color = [TEAL, ORANGE, YELLOW, "#ffffff"][Math.floor(random(`pc-${seed}-${i}`) * 4)];
        const opacity = 0.15 + random(`po-${seed}-${i}`) * 0.25;
        const dy = Math.sin(frame * speed * 0.04 + phase) * 12;
        const dx = Math.cos(frame * speed * 0.03 + phase) * 8;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + dx,
              top: y + dy,
              width: size,
              height: size,
              borderRadius: "50%",
              background: color,
              opacity,
              boxShadow: `0 0 ${size * 3}px ${color}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

// ── Grid bg ────────────────────────────────────────────────────────────────
function GridBg({ opacity = 0.04 }: { opacity?: number }) {
  return (
    <AbsoluteFill
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

// ── Glitch text ────────────────────────────────────────────────────────────
const GLITCH_CHARS = "アイウエオカキクケコ!@#$%&*<>?░▒▓";
function GlitchText({
  text,
  startFrame,
  duration,
  style,
}: {
  text: string;
  startFrame: number;
  duration: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const progress = fi(frame, startFrame, startFrame + duration);
  const revealedCount = Math.floor(progress * text.length);
  const displayed = text.split("").map((char, i) => {
    if (i < revealedCount) return char;
    if (i === revealedCount) {
      const idx = Math.floor(random(`g-${frame}-${i}`) * GLITCH_CHARS.length);
      return GLITCH_CHARS[idx];
    }
    return " ";
  });
  return <span style={style}>{displayed.join("")}</span>;
}

// ── Typewriter ─────────────────────────────────────────────────────────────
function Typewriter({
  text,
  startFrame,
  fps,
  charsPerSec = 18,
  style,
}: {
  text: string;
  startFrame: number;
  fps: number;
  charsPerSec?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const chars = Math.floor(((frame - startFrame) / fps) * charsPerSec);
  return <span style={style}>{text.slice(0, Math.max(0, chars))}</span>;
}

// ── SVG Doodle underline ───────────────────────────────────────────────────
function DoodleUnderline({
  width,
  color,
  startFrame,
  duration,
}: {
  width: number;
  color: string;
  startFrame: number;
  duration: number;
}) {
  const frame = useCurrentFrame();
  const progress = fi(frame, startFrame, startFrame + duration);
  const drawn = progress * width;
  return (
    <svg
      width={width}
      height={14}
      style={{ display: "block", marginTop: 4 }}
      viewBox={`0 0 ${width} 14`}
    >
      <path
        d={`M4,8 Q${width * 0.25},3 ${width * 0.5},8 Q${width * 0.75},13 ${width - 4},6`}
        stroke={color}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={width * 1.2}
        strokeDashoffset={width * 1.2 * (1 - progress)}
      />
    </svg>
  );
}

// ── SVG doodle circle (highlight) ─────────────────────────────────────────
function DoodleCircle({
  w,
  h,
  color,
  startFrame,
  duration,
}: {
  w: number;
  h: number;
  color: string;
  startFrame: number;
  duration: number;
}) {
  const frame = useCurrentFrame();
  const progress = fi(frame, startFrame, startFrame + duration);
  const perimeter = Math.PI * (w + h);
  return (
    <svg
      width={w + 16}
      height={h + 16}
      style={{ position: "absolute", top: -8, left: -8, pointerEvents: "none" }}
      viewBox={`0 0 ${w + 16} ${h + 16}`}
    >
      <ellipse
        cx={(w + 16) / 2}
        cy={(h + 16) / 2}
        rx={w / 2 + 4}
        ry={h / 2 + 4}
        stroke={color}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={perimeter}
        strokeDashoffset={perimeter * (1 - progress)}
        style={{ transform: "rotate(-10deg)", transformOrigin: "center" }}
      />
    </svg>
  );
}

// ── Animated counter ───────────────────────────────────────────────────────
function CountUp({
  from,
  to,
  startFrame,
  duration,
  suffix = "",
  style,
}: {
  from: number;
  to: number;
  startFrame: number;
  duration: number;
  suffix?: string;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const eased = fi(frame, startFrame, startFrame + duration);
  const value = Math.round(from + (to - from) * eased);
  return <span style={style}>{value.toLocaleString()}{suffix}</span>;
}

// ── Animated bar ───────────────────────────────────────────────────────────
function AnimatedBar({
  pct,
  color,
  startFrame,
  fps,
  label,
  height = 14,
}: {
  pct: number;
  color: string;
  startFrame: number;
  fps: number;
  label?: string;
  height?: number;
}) {
  const frame = useCurrentFrame();
  const p = spr(frame, startFrame, fps, 18, 90);
  const width = interpolate(p, [0, 1], [0, pct]);
  return (
    <div>
      {label && (
        <div style={{ fontSize: 12, color: SUBTEXT, marginBottom: 4 }}>{label}</div>
      )}
      <div
        style={{
          width: "100%",
          height,
          background: "rgba(255,255,255,0.08)",
          borderRadius: height,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            borderRadius: height,
            boxShadow: `0 0 12px ${color}88`,
          }}
        />
      </div>
    </div>
  );
}

// ── Floating emoji ─────────────────────────────────────────────────────────
function FloatingEmoji({
  emoji,
  x,
  y,
  delay,
  fps,
  size = 32,
}: {
  emoji: string;
  x: number;
  y: number;
  delay: number;
  fps: number;
  size?: number;
}) {
  const frame = useCurrentFrame();
  const enter = spr(frame, delay, fps, 12, 80);
  const bob = Math.sin((frame - delay) * 0.07) * 6;
  const rotate = Math.sin((frame - delay) * 0.05) * 8;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + bob,
        fontSize: size,
        opacity: fi(frame, delay, delay + 10),
        transform: `scale(${interpolate(enter, [0, 1], [0.3, 1])}) rotate(${rotate}deg)`,
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
        pointerEvents: "none",
      }}
    >
      {emoji}
    </div>
  );
}

// ── Scene wipe transition ──────────────────────────────────────────────────
function SceneWipe({ fromRight = true }: { fromRight?: boolean }) {
  const frame = useCurrentFrame();
  const p = spr(frame, 0, 30, 25, 120);
  const x = interpolate(p, [0, 1], [fromRight ? 1280 : -1280, 0]);
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${x}px)`,
        borderLeft: fromRight ? `3px solid ${TEAL}44` : undefined,
        borderRight: !fromRight ? `3px solid ${ORANGE}44` : undefined,
      }}
    />
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────
const CHAPTERS = [
  { label: "導言", start: 0, end: 150 },
  { label: "🛠️ Cursor vs Copilot", start: 150, end: 390 },
  { label: "🔌 MCP 協定", start: 390, end: 630 },
  { label: "💼 AI 與工作", start: 630, end: 900 },
];

function ProgressBar() {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const progress = frame / durationInFrames;
  const current = CHAPTERS.find((c) => frame >= c.start && frame < c.end) ?? CHAPTERS[CHAPTERS.length - 1];

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 40,
          fontSize: 13,
          color: "rgba(255,255,255,0.45)",
          fontFamily: "Inter, Nunito, system-ui, sans-serif",
          letterSpacing: 0.5,
        }}
      >
        {current.label}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 40,
          right: 40,
          height: 3,
          background: "rgba(255,255,255,0.1)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: `linear-gradient(90deg, ${TEAL}, ${ORANGE}, ${YELLOW})`,
            borderRadius: 3,
            boxShadow: `0 0 8px ${TEAL}88`,
          }}
        />
      </div>
      {CHAPTERS.slice(1).map((c) => (
        <div
          key={c.start}
          style={{
            position: "absolute",
            bottom: 8,
            left: 40 + (c.start / durationInFrames) * (width - 80) - 3.5,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: frame >= c.start ? TEAL : "rgba(255,255,255,0.25)",
            boxShadow: frame >= c.start ? `0 0 6px ${TEAL}` : "none",
            border: "1px solid rgba(0,0,0,0.5)",
          }}
        />
      ))}
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 1 — Title (0–5s, 0–150f)
// ══════════════════════════════════════════════════════════════════════════
function TitleScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgPulse = 0.12 + Math.sin(frame * 0.04) * 0.04;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #1e0e50 0%, ${BG} 65%)`,
        fontFamily: "Inter, Nunito, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <GridBg opacity={0.06} />
      <Particles count={35} seed={1} />

      {/* Big decorative ring */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          border: `1px solid rgba(108,99,255,${bgPulse})`,
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) rotate(${frame * 0.3}deg)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          border: `1px solid rgba(32,217,186,${bgPulse * 0.8})`,
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) rotate(${-frame * 0.2}deg)`,
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 80px",
          paddingBottom: 60,
        }}
      >
        {/* Date badge */}
        <div style={{ ...morphIn(frame, 0, fps), marginBottom: 22 }}>
          <div
            style={{
              ...glass,
              padding: "6px 20px",
              fontSize: 13,
              color: SUBTEXT,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: TEAL,
                boxShadow: `0 0 8px ${TEAL}`,
                animation: "none",
                opacity: 0.5 + 0.5 * Math.sin(frame * 0.15),
              }}
            />
            📅 2026年3月24日 · AI 未來學院
          </div>
        </div>

        {/* Main headline with glitch */}
        <div
          style={{
            ...morphIn(frame, 8, fps, 18, 90),
            textAlign: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 58, fontWeight: 900, color: TEXT, lineHeight: 1.25 }}>
            <GlitchText
              text="寫程式不用再孤軍奮戰？"
              startFrame={10}
              duration={40}
              style={{ display: "block" }}
            />
          </div>
        </div>

        {/* Doodle underline under key phrase */}
        <div style={{ opacity: fi(frame, 25, 35), marginBottom: 18 }}>
          <DoodleUnderline width={320} color={ORANGE} startFrame={26} duration={25} />
        </div>

        {/* Subtitle typewriter */}
        <div
          style={{
            ...morphIn(frame, 30, fps),
            fontSize: 20,
            color: SUBTEXT,
            marginBottom: 36,
            textAlign: "center",
          }}
        >
          <Typewriter text="AI 編程助手大比拼，學生必看 🎓" startFrame={32} fps={fps} charsPerSec={20} />
        </div>

        {/* Topic pills */}
        <div style={{ display: "flex", gap: 14 }}>
          {[
            { icon: "🛠️", label: "Cursor vs Copilot", color: ORANGE, delay: 45 },
            { icon: "🔌", label: "MCP 協定", color: TEAL, delay: 58 },
            { icon: "💼", label: "AI 與工作", color: YELLOW, delay: 71 },
          ].map((t) => (
            <div
              key={t.label}
              style={{
                ...morphIn(frame, t.delay, fps, 14, 120),
                ...glass,
                padding: "10px 18px",
                fontSize: 14,
                color: t.color,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 7,
                boxShadow: `0 0 20px ${t.color}22, 0 8px 32px rgba(0,0,0,0.3)`,
              }}
            >
              {t.icon} {t.label}
            </div>
          ))}
        </div>
      </AbsoluteFill>

      {/* Floating decorative emojis */}
      <FloatingEmoji emoji="💻" x={80} y={120} delay={20} fps={fps} size={36} />
      <FloatingEmoji emoji="🤖" x={1140} y={90} delay={30} fps={fps} size={40} />
      <FloatingEmoji emoji="⚡" x={100} y={540} delay={40} fps={fps} size={28} />
      <FloatingEmoji emoji="🚀" x={1120} y={520} delay={35} fps={fps} size={34} />
      <FloatingEmoji emoji="✨" x={620} y={60} delay={50} fps={fps} size={24} />
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 2 — Cursor vs Copilot (5–13s, 150–390f)
// ══════════════════════════════════════════════════════════════════════════
function CopilotScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #090918 0%, #0c1828 100%)`,
        fontFamily: "Inter, Nunito, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <GridBg opacity={0.05} />
      <Particles count={20} seed={2} />
      <SceneWipe fromRight />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", padding: "44px 60px 80px" }}>

        {/* Header */}
        <div style={morphIn(frame, 5, fps)}>
          <div style={{ fontSize: 13, color: ORANGE, fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>
            🛠️ 主題一
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 28 }}>
            <div style={{ fontSize: 40, fontWeight: 900, color: TEXT }}>
              Cursor vs GitHub Copilot
            </div>
            <div style={{ opacity: fi(frame, 25, 40) }}>
              <DoodleUnderline width={380} color={ORANGE} startFrame={26} duration={22} />
            </div>
          </div>
        </div>

        {/* Two tool cards */}
        <div style={{ display: "flex", gap: 22, marginBottom: 24, flex: 1 }}>
          {[
            {
              name: "GitHub Copilot",
              maker: "微軟 × GitHub",
              price: "$10 / 月",
              score: 56,
              feature: "Agent Mode — 自主多步驟任務",
              color: "#2ea043",
              delay: 10,
            },
            {
              name: "Cursor",
              maker: "AI 原生編輯器",
              price: "$20 / 月",
              score: 52,
              feature: "Background Agents — 背景默默跑",
              color: TEAL,
              delay: 22,
            },
          ].map((tool, idx) => (
            <div
              key={tool.name}
              style={{
                ...morphIn(frame, tool.delay, fps, 18, 95),
                ...glass,
                flex: 1,
                padding: "22px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                position: "relative",
                borderTop: `3px solid ${tool.color}`,
              }}
            >
              {/* Circle highlight on winner */}
              {idx === 0 && frame > 80 && (
                <div style={{ position: "absolute", top: 60, right: 20 }}>
                  <div
                    style={{
                      position: "relative",
                      display: "inline-block",
                    }}
                  >
                    <div style={{ fontSize: 13, color: "#2ea043", fontWeight: 700, padding: "3px 8px" }}>
                      🏆 領先
                    </div>
                    <DoodleCircle w={70} h={26} color="#2ea043" startFrame={82} duration={20} />
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: 19, fontWeight: 800, color: TEXT }}>{tool.name}</div>
                <div style={{ fontSize: 13, color: SUBTEXT }}>{tool.maker}</div>
              </div>

              {/* Big count-up score */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <CountUp
                  from={0}
                  to={tool.score}
                  startFrame={tool.delay + 10}
                  duration={35}
                  suffix="%"
                  style={{
                    fontSize: 52,
                    fontWeight: 900,
                    color: tool.color,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: SUBTEXT, marginTop: -8 }}>SWE-bench 解題率</div>

              {/* Animated bar */}
              <AnimatedBar
                pct={tool.score}
                color={tool.color}
                startFrame={tool.delay + 8}
                fps={fps}
                height={10}
              />

              {/* Feature tag */}
              <div
                style={{
                  ...glass,
                  padding: "8px 14px",
                  fontSize: 13,
                  color: tool.color,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ✨ {tool.feature}
              </div>

              <div style={{ fontSize: 18, fontWeight: 700, color: YELLOW }}>{tool.price}</div>
            </div>
          ))}
        </div>

        {/* Growth stat with animated counter */}
        <div
          style={{
            ...morphIn(frame, 55, fps),
            ...glass,
            padding: "14px 22px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span style={{ fontSize: 24 }}>📈</span>
          <div style={{ fontSize: 15, color: TEXT }}>
            Copilot 付費用戶：
            <CountUp
              from={270}
              to={470}
              startFrame={58}
              duration={40}
              suffix="萬"
              style={{ color: YELLOW, fontWeight: 800, fontSize: 18, margin: "0 4px" }}
            />
            <span style={{ color: SUBTEXT }}> (+75%，一年內成長)</span>
          </div>
        </div>
      </AbsoluteFill>

      <FloatingEmoji emoji="💻" x={1180} y={60} delay={5} fps={fps} size={32} />
      <FloatingEmoji emoji="⚡" x={52} y={400} delay={15} fps={fps} size={26} />
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 3 — MCP (13–21s, 390–630f)
// ══════════════════════════════════════════════════════════════════════════
function MCPConnectorDiagram({ frame, fps }: { frame: number; fps: number }) {
  const services = ["Google Drive", "GitHub", "Notion", "瀏覽器", "API"];
  return (
    <div style={{ position: "relative", height: 160 }}>
      {/* Center MCP node */}
      <div
        style={{
          ...morphIn(frame, 5, fps, 15, 110),
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          ...glass,
          padding: "12px 20px",
          color: TEAL,
          fontWeight: 800,
          fontSize: 16,
          textAlign: "center",
          border: `2px solid ${TEAL}55`,
          boxShadow: `0 0 30px ${TEAL}44`,
          zIndex: 2,
        }}
      >
        🔌 MCP
      </div>

      {/* SVG lines */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
        viewBox="0 0 700 160"
        preserveAspectRatio="xMidYMid meet"
      >
        {services.map((_, i) => {
          const angle = (i / services.length) * Math.PI * 2 - Math.PI / 2;
          const cx = 350, cy = 80, r = 220;
          const x2 = cx + Math.cos(angle) * r;
          const y2 = cy + Math.sin(angle) * (r * 0.45);
          const progress = fi(frame, 15 + i * 8, 15 + i * 8 + 20);
          const x = cx + (x2 - cx) * progress;
          const y = cy + (y2 - cy) * progress;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={TEAL}
              strokeWidth={1.5}
              strokeOpacity={0.4}
              strokeDasharray="4 4"
            />
          );
        })}
      </svg>

      {/* Service nodes */}
      {services.map((name, i) => {
        const angle = (i / services.length) * Math.PI * 2 - Math.PI / 2;
        const cx = 50, cy = 50, r = 44;
        const left = `${cx + Math.cos(angle) * r * 3.8}%`;
        const top = cy + Math.sin(angle) * r * 0.9 * 1.6;
        return (
          <div
            key={name}
            style={{
              ...morphIn(frame, 15 + i * 8, fps, 18, 100),
              position: "absolute",
              left,
              top,
              transform: "translate(-50%, -50%)",
              background: `rgba(32,217,186,0.1)`,
              border: `1px solid ${TEAL}44`,
              borderRadius: 10,
              padding: "5px 12px",
              fontSize: 12,
              color: TEAL,
              fontWeight: 600,
              whiteSpace: "nowrap",
              zIndex: 2,
            }}
          >
            {name}
          </div>
        );
      })}
    </div>
  );
}

function MCPScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #090918 0%, #001818 100%)`,
        fontFamily: "Inter, Nunito, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <GridBg opacity={0.05} />
      <Particles count={22} seed={3} />
      <SceneWipe fromRight />

      {/* Glow blob */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${TEAL}18 0%, transparent 70%)`,
          top: "30%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${1 + Math.sin(frame * 0.05) * 0.05})`,
          pointerEvents: "none",
        }}
      />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", padding: "44px 60px 80px" }}>

        {/* Header */}
        <div style={morphIn(frame, 3, fps)}>
          <div style={{ fontSize: 13, color: TEAL, fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>
            🔌 主題二
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: TEXT, marginBottom: 4 }}>
            MCP 協定
          </div>
          <div style={{ fontSize: 17, color: SUBTEXT, marginBottom: 20 }}>
            <Typewriter text="Model Context Protocol — AI 的通用 USB 介面" startFrame={6} fps={fps} charsPerSec={22} />
          </div>
        </div>

        {/* Connector diagram */}
        <div style={{ opacity: fi(frame, 8, 18), marginBottom: 16 }}>
          <MCPConnectorDiagram frame={frame} fps={fps} />
        </div>

        {/* Bottom row: big stat + callout */}
        <div style={{ display: "flex", gap: 18 }}>
          {/* Download stat */}
          <div
            style={{
              ...morphIn(frame, 55, fps),
              ...glass,
              padding: "18px 22px",
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 16,
              border: `1px solid ${YELLOW}33`,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                <CountUp
                  from={0}
                  to={9700}
                  startFrame={57}
                  duration={45}
                  suffix="萬+"
                  style={{ fontSize: 36, fontWeight: 900, color: YELLOW }}
                />
              </div>
              <div style={{ fontSize: 13, color: SUBTEXT }}>每月 SDK 下載量</div>
            </div>
          </div>

          {/* Companies */}
          <div
            style={{
              ...morphIn(frame, 68, fps),
              ...glass,
              padding: "14px 18px",
              flex: 1.2,
            }}
          >
            <div style={{ fontSize: 12, color: SUBTEXT, marginBottom: 8 }}>全球主要平台支援</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["Anthropic", "OpenAI", "Google", "微軟", "Amazon"].map((name, i) => (
                <div
                  key={name}
                  style={{
                    opacity: fi(frame, 70 + i * 8, 80 + i * 8),
                    transform: `scale(${interpolate(fi(frame, 70 + i * 8, 80 + i * 8), [0, 1], [0.7, 1])})`,
                    background: `${TEAL}18`,
                    border: `1px solid ${TEAL}44`,
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 13,
                    color: TEAL,
                    fontWeight: 600,
                  }}
                >
                  ✓ {name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Warning callout */}
        <div
          style={{
            ...morphIn(frame, 100, fps),
            background: "rgba(255,107,53,0.1)",
            border: "1px solid rgba(255,107,53,0.3)",
            borderRadius: 14,
            padding: "12px 18px",
            fontSize: 14,
            color: TEXT,
            display: "flex",
            gap: 10,
            marginTop: 14,
          }}
        >
          <span style={{ fontSize: 18 }}>⚡</span>
          <div>
            <strong style={{ color: ORANGE }}>現實提醒：</strong>
            Perplexity CTO — 追求速度的生產環境，傳統 API 效率更高；
            MCP 適合「動態探索」而非高頻呼叫
          </div>
        </div>
      </AbsoluteFill>

      <FloatingEmoji emoji="🔌" x={1160} y={55} delay={5} fps={fps} size={36} />
      <FloatingEmoji emoji="🌐" x={60} y={350} delay={20} fps={fps} size={28} />
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Scene 4 — AI & Work (21–30s, 630–900f)
// ══════════════════════════════════════════════════════════════════════════
function WorkScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { value: 56, suffix: "%", prefix: "+", label: "有 AI 技能者薪資溢價", icon: "💰", color: YELLOW, barDelay: 18 },
    { value: 15, suffix: "%", prefix: "+", label: "整體勞動生產力提升", icon: "📈", color: TEAL, barDelay: 30 },
    { value: 7, suffix: "%", prefix: "", label: "美國工作崗位風險", icon: "⚠️", color: ORANGE, barDelay: 42 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #090918 0%, #150a04 100%)`,
        fontFamily: "Inter, Nunito, system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <GridBg opacity={0.05} />
      <Particles count={24} seed={4} />
      <SceneWipe fromRight />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", padding: "44px 60px 80px" }}>

        {/* Header */}
        <div style={morphIn(frame, 3, fps)}>
          <div style={{ fontSize: 13, color: YELLOW, fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>
            💼 主題三
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: TEXT, marginBottom: 4 }}>
            AI 讓你更輕鬆？
          </div>
          <div style={{ fontSize: 17, color: SUBTEXT, marginBottom: 24 }}>
            <Typewriter text='哈佛研究：「AI 不會減少工作，它讓工作更密集」' startFrame={6} fps={fps} charsPerSec={22} />
          </div>
        </div>

        {/* Stat cards row */}
        <div style={{ display: "flex", gap: 18, marginBottom: 22 }}>
          {stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                ...morphIn(frame, 10 + i * 12, fps, 18, 95),
                ...glass,
                flex: 1,
                padding: "20px 18px",
                borderBottom: `3px solid ${s.color}`,
              }}
            >
              <div style={{ fontSize: 30, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 4 }}>
                {s.prefix && (
                  <span style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.prefix}</span>
                )}
                <CountUp
                  from={0}
                  to={s.value}
                  startFrame={12 + i * 12}
                  duration={35}
                  suffix={s.suffix}
                  style={{ fontSize: 42, fontWeight: 900, color: s.color, lineHeight: 1 }}
                />
              </div>
              <div style={{ marginBottom: 10 }}>
                <AnimatedBar
                  pct={s.value * 1.2}
                  color={s.color}
                  startFrame={s.barDelay}
                  fps={fps}
                  height={8}
                />
              </div>
              <div style={{ fontSize: 13, color: SUBTEXT, lineHeight: 1.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* HBR callout */}
        <div
          style={{
            ...morphIn(frame, 55, fps),
            ...glass,
            padding: "16px 20px",
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            marginBottom: 14,
            borderLeft: `4px solid ${YELLOW}`,
          }}
        >
          <span style={{ fontSize: 26 }}>📚</span>
          <div>
            <div style={{ fontSize: 14, color: YELLOW, fontWeight: 700, marginBottom: 4 }}>
              哈佛商業評論 HBR · 2026年2月
            </div>
            <div style={{ fontSize: 14, color: TEXT, lineHeight: 1.6 }}>
              使用 AI 後，工作者確實速度更快、承擔更多任務、時間更長——
              但<strong style={{ color: YELLOW }}>並非被要求</strong>，而是<strong style={{ color: ORANGE }}>自發性地多做了</strong>
            </div>
          </div>
        </div>

        {/* Final insight */}
        <div
          style={{
            ...morphIn(frame, 80, fps),
            background: `rgba(32,217,186,0.1)`,
            border: `1px solid ${TEAL}44`,
            borderRadius: 16,
            padding: "14px 20px",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 24 }}>🧠</span>
          <div style={{ fontSize: 15, color: TEXT, lineHeight: 1.6 }}>
            <strong style={{ color: TEAL }}>AI 素養：</strong>
            AI 讓你<strong style={{ color: YELLOW }}>「能做」</strong>更多，
            但能做 ≠ 應該做。主動設定邊界，比單純追求加速更重要。
          </div>
        </div>
      </AbsoluteFill>

      <FloatingEmoji emoji="💼" x={1160} y={55} delay={5} fps={fps} size={34} />
      <FloatingEmoji emoji="📊" x={52} y={400} delay={18} fps={fps} size={28} />
      <FloatingEmoji emoji="🎯" x={1130} y={480} delay={28} fps={fps} size={26} />
    </AbsoluteFill>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Root
// ══════════════════════════════════════════════════════════════════════════
export function VideoComposition() {
  const { scenes, bgMusic } = AUDIO_CONFIG;
  const [s1, s2, s3, s4] = scenes;

  return (
    <AbsoluteFill style={{ background: BG }}>

      {/* Background music — loops, very low volume */}
      <Audio src={bgMusic.src} volume={bgMusic.volume} loop />

      {/* Scene 1 — Title */}
      <Sequence from={s1.startFrame} durationInFrames={s1.durationInFrames}>
        <Audio src={s1.audioSrc} volume={1} />
        <TitleScene />
      </Sequence>

      {/* Scene 2 — Cursor vs Copilot */}
      <Sequence from={s2.startFrame} durationInFrames={s2.durationInFrames}>
        <Audio src={s2.audioSrc} volume={1} />
        <CopilotScene />
      </Sequence>

      {/* Scene 3 — MCP */}
      <Sequence from={s3.startFrame} durationInFrames={s3.durationInFrames}>
        <Audio src={s3.audioSrc} volume={1} />
        <MCPScene />
      </Sequence>

      {/* Scene 4 — AI & Work */}
      <Sequence from={s4.startFrame} durationInFrames={s4.durationInFrames}>
        <Audio src={s4.audioSrc} volume={1} />
        <WorkScene />
      </Sequence>

      <ProgressBar />
      <CharacterPip />
    </AbsoluteFill>
  );
}
