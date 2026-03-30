import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";
import { AUDIO_CONFIG } from "./audioConfig";
import { VideoComposition_2026_03_26, TOTAL_FRAMES_2026_03_26 } from "./VideoComposition_2026_03_26";
import { VideoComposition_2026_03_27, TOTAL_FRAMES_2026_03_27 } from "./VideoComposition_2026_03_27";
import { VideoComposition_2026_03_30, TOTAL_FRAMES_2026_03_30 } from "./VideoComposition_2026_03_30";
import { MCPDiagram, TOTAL_FRAMES_MCP } from "./MCPDiagram";
import React from "react";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 2026-03-24 — Cursor vs Copilot, MCP, AI 與工作 */}
      <Composition
        id="ArticleVideo"
        component={VideoComposition}
        durationInFrames={AUDIO_CONFIG.totalFrames}
        fps={AUDIO_CONFIG.fps}
        width={1280}
        height={720}
      />
      {/* 2026-03-26 — 4K · AI 代理人、生產力悖論、程式工具大戰 */}
      <Composition
        id="ArticleVideo-2026-03-26"
        component={VideoComposition_2026_03_26}
        durationInFrames={TOTAL_FRAMES_2026_03_26}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-03-27 — 4K · NVIDIA 模型家族、企業 AI 代理人、AI 工作強度悖論 */}
      <Composition
        id="ArticleVideo-2026-03-27"
        component={VideoComposition_2026_03_27}
        durationInFrames={TOTAL_FRAMES_2026_03_27}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-03-30 — 4K · Token 是什麼、上下文視窗、4 個實用技巧 */}
      <Composition
        id="ArticleVideo-2026-03-30"
        component={VideoComposition_2026_03_30}
        durationInFrames={TOTAL_FRAMES_2026_03_30}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* MCP Diagram — animated concept visual */}
      <Composition
        id="MCPDiagram"
        component={MCPDiagram}
        durationInFrames={TOTAL_FRAMES_MCP}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
