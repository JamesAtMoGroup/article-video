import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import React from "react";
import { loadFont as loadNotoSansTC } from "@remotion/google-fonts/NotoSansTC";
import { loadFont as loadSpaceMono } from "@remotion/google-fonts/SpaceMono";

loadNotoSansTC("normal", { weights: ["400", "700", "900"] });
loadSpaceMono("normal", { weights: ["400", "700"] });

// ── Canvas (1920×1080 preview, S=1) ──────────────────────────
const W = 1920;
const H = 1080;

const C = {
  bg:      "#000000",
  green:   "#7cffb2",
  yellow:  "#ffd166",
  white:   "#ffffff",
  muted:   "#666666",
  dim:     "#222222",
} as const;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

function sp(frame: number, fps: number, stiffness = 120, damping = 22) {
  return spring({ frame, fps, config: { stiffness, damping } });
}

// ── Layout ───────────────────────────────────────────────────
const CLAUDE = { x: 360,  y: 540 };
const MCP    = { x: 860,  y: 540 };
const TOOLS  = [
  { x: 1440, y: 240,  en: "File System",  zh: "檔案系統",  desc: "read / write" },
  { x: 1440, y: 390,  en: "Database",     zh: "資料庫",    desc: "query" },
  { x: 1440, y: 540,  en: "Web Search",   zh: "網路搜尋",  desc: "fetch" },
  { x: 1440, y: 690,  en: "GitHub",       zh: "程式倉庫",  desc: "repos" },
  { x: 1440, y: 840,  en: "Custom API",   zh: "自訂 API",  desc: "REST / GraphQL" },
];

// ── Timing (frames at 30fps) ─────────────────────────────────
// 0-15   : bg grid fade in
// 15-45  : Claude node spring in
// 45-75  : line Claude→MCP draws
// 75-100 : MCP box pops in
// 100+   : tools stagger in (every 18f apart)
// all    : particles loop, glows pulse

const T = {
  bgIn:       0,
  claudeIn:  15,
  lineIn:    45,
  mcpIn:     75,
  toolStart: 100,
  toolStep:   20,
  titleIn:    10,
};

export const TOTAL_FRAMES_MCP = 300; // 10s

// ── Sub-components ───────────────────────────────────────────

/** Dot grid background */
const DotGrid: React.FC<{ opacity: number }> = ({ opacity }) => {
  const dots = [];
  for (let x = 60; x < W; x += 72) {
    for (let y = 60; y < H; y += 72) {
      dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} fill="rgba(255,255,255,0.12)" />);
    }
  }
  return (
    <svg style={{ position: "absolute", width: W, height: H, opacity }}>
      {dots}
    </svg>
  );
};

/** Glowing node circle */
const GlowNode: React.FC<{
  cx: number; cy: number; r: number;
  color: string; scale: number; pulsePhase: number;
  fill?: string; innerR?: number;
}> = ({ cx, cy, r, color, scale, pulsePhase, fill, innerR }) => {
  const pulse = 1 + Math.sin(pulsePhase) * 0.06;
  const rr = r * scale;
  return (
    <g transform={`translate(${cx},${cy}) scale(${scale})`} style={{ transformOrigin: `${cx}px ${cy}px` }}>
      {/* glow layers */}
      {[4, 3, 2, 1].map((i) => (
        <circle key={i} cx={0} cy={0}
          r={rr + i * 8 * pulse} fill="none"
          stroke={color} strokeWidth={1}
          opacity={0.06 * i}
        />
      ))}
      {/* fill */}
      {fill && <circle cx={0} cy={0} r={rr - 2} fill={fill} />}
      {/* main ring */}
      <circle cx={0} cy={0} r={rr} fill="none"
        stroke={color} strokeWidth={2.5} opacity={0.9} />
      {/* inner ring */}
      {innerR && (
        <circle cx={0} cy={0} r={innerR} fill="none"
          stroke={color} strokeWidth={1.5} opacity={0.5} />
      )}
    </g>
  );
};

/** Animated line with draw-on effect */
const GlowLine: React.FC<{
  x1: number; y1: number; x2: number; y2: number;
  color: string; progress: number; width?: number;
}> = ({ x1, y1, x2, y2, color, progress, width = 2 }) => {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const dashOffset = len * (1 - progress);
  return (
    <g>
      {/* glow */}
      {[6, 4, 2].map((i) => (
        <line key={i}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={color} strokeWidth={width + i * 4}
          strokeDasharray={len} strokeDashoffset={dashOffset}
          opacity={0.05 * i}
          strokeLinecap="round"
        />
      ))}
      {/* core */}
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={width}
        strokeDasharray={len} strokeDashoffset={dashOffset}
        opacity={0.85} strokeLinecap="round"
      />
    </g>
  );
};

/** Arrow tip at fraction t along line */
const ArrowTip: React.FC<{
  x1: number; y1: number; x2: number; y2: number;
  color: string; t?: number; visible: boolean;
}> = ({ x1, y1, x2, y2, color, t = 0.6, visible }) => {
  if (!visible) return null;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const mx = x1 + dx * t, my = y1 + dy * t;
  const sz = 11;
  const tip   = [mx + ux * sz,          my + uy * sz         ];
  const left  = [mx - ux * sz * .5 + px * sz * .6, my - uy * sz * .5 + py * sz * .6];
  const right = [mx - ux * sz * .5 - px * sz * .6, my - uy * sz * .5 - py * sz * .6];
  return (
    <polygon
      points={`${tip[0]},${tip[1]} ${left[0]},${left[1]} ${right[0]},${right[1]}`}
      fill={color} opacity={0.85}
    />
  );
};

/** Flowing particle along a line */
const FlowParticle: React.FC<{
  x1: number; y1: number; x2: number; y2: number;
  color: string; phase: number; speed?: number;
}> = ({ x1, y1, x2, y2, color, phase, speed = 0.004 }) => {
  const t = ((phase * speed) % 1 + 1) % 1;
  const cx = x1 + (x2 - x1) * t;
  const cy = y1 + (y2 - y1) * t;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.07} />
      <circle cx={cx} cy={cy} r={4} fill={color} opacity={0.35} />
      <circle cx={cx} cy={cy} r={2} fill={color} opacity={0.9} />
    </g>
  );
};

// ── Main component ────────────────────────────────────────────

export const MCPDiagram: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const f = (start: number) => Math.max(0, frame - start);

  // bg
  const bgOpacity = interpolate(frame, [T.bgIn, T.bgIn + 20], [0, 1], clamp);

  // Claude
  const claudeScale = sp(f(T.claudeIn), fps, 140, 18);
  const claudeOpacity = interpolate(f(T.claudeIn), [0, 12], [0, 1], clamp);

  // line Claude→MCP
  const lineProgress = interpolate(f(T.lineIn), [0, 30], [0, 1], clamp);

  // MCP box
  const mcpScale = sp(f(T.mcpIn), fps, 160, 20);
  const mcpOpacity = interpolate(f(T.mcpIn), [0, 10], [0, 1], clamp);

  // tools
  const toolScales = TOOLS.map((_, i) =>
    sp(f(T.toolStart + i * T.toolStep), fps, 150, 20)
  );
  const toolOpacities = TOOLS.map((_, i) =>
    interpolate(f(T.toolStart + i * T.toolStep), [0, 10], [0, 1], clamp)
  );
  const toolLineProgress = TOOLS.map((_, i) =>
    interpolate(f(T.toolStart + i * T.toolStep), [0, 22], [0, 1], clamp)
  );

  // pulse (continuous sine)
  const pulse = frame * 0.06;

  // title
  const titleOpacity = interpolate(f(T.titleIn), [0, 20], [0, 1], clamp);
  const titleY = interpolate(
    sp(f(T.titleIn), fps, 100, 22),
    [0, 1], [20, 0], clamp
  );

  // label fade helper
  const labelOpacity = (start: number) =>
    interpolate(f(start + 8), [0, 15], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: "hidden" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", width: W, height: H }}>

        {/* dot grid */}
        <g opacity={bgOpacity}>
          {Array.from({ length: Math.ceil(W / 72) }, (_, xi) =>
            Array.from({ length: Math.ceil(H / 72) }, (_, yi) => (
              <circle key={`${xi}-${yi}`}
                cx={60 + xi * 72} cy={60 + yi * 72}
                r={1.2} fill="rgba(255,255,255,0.10)" />
            ))
          )}
        </g>

        {/* ── lines ── */}
        {/* Claude → MCP */}
        <GlowLine
          x1={CLAUDE.x + 72} y1={CLAUDE.y}
          x2={MCP.x - 104} y2={MCP.y}
          color={C.green} progress={lineProgress} width={2.5}
        />
        <ArrowTip
          x1={CLAUDE.x + 72} y1={CLAUDE.y}
          x2={MCP.x - 104} y2={MCP.y}
          color={C.green} t={0.6} visible={lineProgress > 0.5}
        />

        {/* MCP → Tools */}
        {TOOLS.map((tool, i) => (
          <g key={i}>
            <GlowLine
              x1={MCP.x + 104} y1={MCP.y}
              x2={tool.x - 36} y2={tool.y}
              color={C.green} progress={toolLineProgress[i]} width={2}
            />
            <ArrowTip
              x1={MCP.x + 104} y1={MCP.y}
              x2={tool.x - 36} y2={tool.y}
              color={C.green} t={0.65} visible={toolLineProgress[i] > 0.6}
            />
          </g>
        ))}

        {/* ── particles (after lines are drawn) ── */}
        {lineProgress > 0.9 && (
          <FlowParticle
            x1={CLAUDE.x + 72} y1={CLAUDE.y}
            x2={MCP.x - 104} y2={MCP.y}
            color={C.green} phase={frame * 60} speed={0.005}
          />
        )}
        {TOOLS.map((tool, i) =>
          toolLineProgress[i] > 0.9 ? (
            <FlowParticle key={i}
              x1={MCP.x + 104} y1={MCP.y}
              x2={tool.x - 36} y2={tool.y}
              color={C.green} phase={frame * 60 + i * 220} speed={0.004 + i * 0.001}
            />
          ) : null
        )}

        {/* ── Claude node ── */}
        <g opacity={claudeOpacity}
          transform={`translate(${CLAUDE.x},${CLAUDE.y}) scale(${claudeScale}) translate(${-CLAUDE.x},${-CLAUDE.y})`}>
          <GlowNode cx={CLAUDE.x} cy={CLAUDE.y} r={70} color={C.green}
            scale={1} pulsePhase={pulse} fill="#061510" innerR={48} />
        </g>

        {/* ── MCP Server box ── */}
        <g opacity={mcpOpacity}
          transform={`translate(${MCP.x},${MCP.y}) scale(${mcpScale}) translate(${-MCP.x},${-MCP.y})`}>
          {/* glow bg */}
          <rect x={MCP.x - 108} y={MCP.y - 42} width={216} height={84}
            rx={42} fill="#0a2215" opacity={0.9} />
          {[3,2,1].map(i => (
            <rect key={i}
              x={MCP.x - 108 - i*4} y={MCP.y - 42 - i*4}
              width={216 + i*8} height={84 + i*8}
              rx={42 + i*2} fill="none"
              stroke={C.green} strokeWidth={1} opacity={0.07 * i}
            />
          ))}
          <rect x={MCP.x - 108} y={MCP.y - 42} width={216} height={84}
            rx={42} fill="none" stroke={C.green} strokeWidth={2} opacity={0.85} />
        </g>

        {/* ── Tool nodes ── */}
        {TOOLS.map((tool, i) => (
          <g key={i} opacity={toolOpacities[i]}
            transform={`translate(${tool.x},${tool.y}) scale(${toolScales[i]}) translate(${-tool.x},${-tool.y})`}>
            <GlowNode cx={tool.x} cy={tool.y} r={30} color={C.yellow}
              scale={1} pulsePhase={pulse + i * 1.2} fill="#160e02" />
            <circle cx={tool.x} cy={tool.y} r={8} fill={C.yellow} opacity={0.85} />
          </g>
        ))}

      </svg>

      {/* ── Text labels (HTML for font support) ── */}

      {/* Title */}
      <div style={{
        position: "absolute", left: 72, top: 58 + titleY,
        opacity: titleOpacity,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
          <div style={{ width: 6, height: 68, background: C.green, borderRadius: 3, boxShadow: `0 0 16px ${C.green}` }} />
          <div>
            <div style={{
              fontFamily: "'Noto Sans TC', sans-serif",
              fontSize: 52, fontWeight: 900, color: C.white,
              letterSpacing: "-0.5px", lineHeight: 1.1,
            }}>MCP 協議架構</div>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 17, color: C.muted, marginTop: 4,
            }}>Model Context Protocol · AI 工具整合層</div>
          </div>
        </div>
      </div>

      {/* Claude label */}
      <div style={{
        position: "absolute",
        left: CLAUDE.x - 60, top: CLAUDE.y - 20,
        width: 120, textAlign: "center",
        opacity: claudeOpacity,
        pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 22, fontWeight: 700, color: C.green,
          textShadow: `0 0 20px ${C.green}88`,
        }}>Claude</div>
        <div style={{
          fontFamily: "'Noto Sans TC', sans-serif",
          fontSize: 16, color: C.green, opacity: 0.6, marginTop: 2,
        }}>AI 模型</div>
      </div>

      {/* MCP label */}
      <div style={{
        position: "absolute",
        left: MCP.x - 80, top: MCP.y - 18,
        width: 160, textAlign: "center",
        opacity: mcpOpacity,
        pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 22, fontWeight: 700, color: C.green,
          textShadow: `0 0 20px ${C.green}88`,
        }}>MCP Server</div>
      </div>

      {/* Protocol label on line */}
      <div style={{
        position: "absolute",
        left: (CLAUDE.x + MCP.x) / 2 - 120,
        top: CLAUDE.y - 54,
        width: 240, textAlign: "center",
        opacity: interpolate(f(T.lineIn + 20), [0, 15], [0, 1], clamp),
      }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 14, color: C.green, opacity: 0.55,
        }}>Model Context Protocol</div>
      </div>

      {/* Tool labels */}
      {TOOLS.map((tool, i) => (
        <div key={i} style={{
          position: "absolute",
          left: tool.x + 50,
          top: tool.y - 28,
          opacity: labelOpacity(T.toolStart + i * T.toolStep),
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 20, fontWeight: 700, color: C.yellow,
            textShadow: `0 0 16px ${C.yellow}66`,
          }}>{tool.en}</div>
          <div style={{
            fontFamily: "'Noto Sans TC', sans-serif",
            fontSize: 17, color: C.yellow, opacity: 0.7, marginTop: 2,
          }}>{tool.zh}</div>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 13, color: C.muted, marginTop: 2,
          }}>{tool.desc}</div>
        </div>
      ))}

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 36, left: 72,
        display: "flex", gap: 32, alignItems: "center",
        opacity: interpolate(f(T.toolStart + 20), [0, 20], [0, 1], clamp),
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: C.green, boxShadow: `0 0 10px ${C.green}` }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: C.green, opacity: 0.7 }}>AI 模型 / MCP 伺服器</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: C.yellow, boxShadow: `0 0 10px ${C.yellow}` }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: C.yellow, opacity: 0.7 }}>外部工具 / 資源</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
