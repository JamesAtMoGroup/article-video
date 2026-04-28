import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";
import { AUDIO_CONFIG } from "./audioConfig";
import { VideoComposition_2026_03_26, TOTAL_FRAMES_2026_03_26 } from "./VideoComposition_2026_03_26";
import { VideoComposition_2026_03_27, TOTAL_FRAMES_2026_03_27 } from "./VideoComposition_2026_03_27";
import { VideoComposition_2026_03_30, TOTAL_FRAMES_2026_03_30 } from "./VideoComposition_2026_03_30";
import { VideoComposition_2026_03_31, TOTAL_FRAMES_2026_03_31 } from "./VideoComposition_2026_03_31";
import { VideoComposition_2026_04_01, TOTAL_FRAMES_2026_04_01 } from "./VideoComposition_2026_04_01";
import { VideoComposition_2026_04_02, TOTAL_FRAMES_2026_04_02 } from "./VideoComposition_2026_04_02";
import { VideoComposition_2026_04_14, TOTAL_FRAMES_2026_04_14 } from "./VideoComposition_2026_04_14";
import { VideoComposition_2026_04_15, TOTAL_FRAMES_2026_04_15 } from "./VideoComposition_2026_04_15";
import { VideoComposition_2026_04_16, TOTAL_FRAMES_2026_04_16 } from "./VideoComposition_2026_04_16";
import { VideoComposition_2026_04_10, TOTAL_FRAMES_2026_04_10 } from "./VideoComposition_2026_04_10";
import { VideoComposition_2026_04_17, TOTAL_FRAMES_2026_04_17 } from "./VideoComposition_2026_04_17";
import { VideoComposition_2026_04_20, TOTAL_FRAMES_2026_04_20 } from "./VideoComposition_2026_04_20";
import { VideoComposition_2026_04_21, TOTAL_FRAMES_2026_04_21 } from "./VideoComposition_2026_04_21";
import { VideoComposition_2026_04_22, TOTAL_FRAMES_2026_04_22 } from "./VideoComposition_2026_04_22";
import { VideoComposition_2026_04_23, TOTAL_FRAMES_2026_04_23 } from "./VideoComposition_2026_04_23";
import { VideoComposition_2026_04_24, TOTAL_FRAMES_2026_04_24 } from "./VideoComposition_2026_04_24";
import { VideoComposition_2026_04_27, TOTAL_FRAMES_2026_04_27 } from "./VideoComposition_2026_04_27";
import { VideoComposition_2026_04_28, TOTAL_FRAMES_2026_04_28 } from "./VideoComposition_2026_04_28";
import { VideoComposition_2026_04_29, TOTAL_FRAMES_2026_04_29 } from "./VideoComposition_2026_04_29";
import { VideoComposition_2026_04_30, TOTAL_FRAMES_2026_04_30 } from "./VideoComposition_2026_04_30";
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
      {/* 2026-03-31 — 4K · AI幻覺 · 為什麼AI會幻覺？它不是在說謊 */}
      <Composition
        id="ArticleVideo-2026-03-31"
        component={VideoComposition_2026_03_31}
        durationInFrames={TOTAL_FRAMES_2026_03_31}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-01 — 4K · RAG · 讓 AI 查你的資料 */}
      <Composition
        id="ArticleVideo-2026-04-01"
        component={VideoComposition_2026_04_01}
        durationInFrames={TOTAL_FRAMES_2026_04_01}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-02 — 4K · MCP · 什麼是 MCP？為什麼最近大家都在講 */}
      <Composition
        id="ArticleVideo-2026-04-02"
        component={VideoComposition_2026_04_02}
        durationInFrames={TOTAL_FRAMES_2026_04_02}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-14 — 4K · Prompt 寫不好的人都犯了這個錯 */}
      <Composition
        id="ArticleVideo-2026-04-14"
        component={VideoComposition_2026_04_14}
        durationInFrames={TOTAL_FRAMES_2026_04_14}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-15 — 4K · Temperature · 為什麼同一個問題問 AI，每次答案都不一樣 */}
      <Composition
        id="ArticleVideo-2026-04-15"
        component={VideoComposition_2026_04_15}
        durationInFrames={TOTAL_FRAMES_2026_04_15}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-16 — 4K · AI Agent 和一般 AI 聊天有什麼本質差異 */}
      <Composition
        id="ArticleVideo-2026-04-16"
        component={VideoComposition_2026_04_16}
        durationInFrames={TOTAL_FRAMES_2026_04_16}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-10 — 4K · 本週 AI 大事 — Mythos、Muse Spark、微軟三連發 */}
      <Composition
        id="ArticleVideo-2026-04-10"
        component={VideoComposition_2026_04_10}
        durationInFrames={TOTAL_FRAMES_2026_04_10}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-17 — 4K · Google 把 AI 塞進你的瀏覽器，Claude 也在同一週大升級 */}
      <Composition
        id="ArticleVideo-2026-04-17"
        component={VideoComposition_2026_04_17}
        durationInFrames={TOTAL_FRAMES_2026_04_17}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-20 — 4K · 開源模型 vs 閉源模型，你該選哪個 */}
      <Composition
        id="ArticleVideo-2026-04-20"
        component={VideoComposition_2026_04_20}
        durationInFrames={TOTAL_FRAMES_2026_04_20}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-21 — 4K · 為什麼模型越來越便宜，但能力越來越強 */}
      <Composition
        id="ArticleVideo-2026-04-21"
        component={VideoComposition_2026_04_21}
        durationInFrames={TOTAL_FRAMES_2026_04_21}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-22 — 4K · 用 AI 寫的東西，版權是誰的 */}
      <Composition
        id="ArticleVideo-2026-04-22"
        component={VideoComposition_2026_04_22}
        durationInFrames={TOTAL_FRAMES_2026_04_22}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-23 — 4K · 為什麼 AI 公司都在搶「上下文視窗」長度 */}
      <Composition
        id="ArticleVideo-2026-04-23"
        component={VideoComposition_2026_04_23}
        durationInFrames={TOTAL_FRAMES_2026_04_23}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-24 — 4K · 本週 AI 大事 — GPT-5.5 問世、Mythos 資安風波、Anthropic 雙發 */}
      <Composition
        id="ArticleVideo-2026-04-24"
        component={VideoComposition_2026_04_24}
        durationInFrames={TOTAL_FRAMES_2026_04_24}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-27 — 4K · AI 幫你做完的工作，你還算做了嗎 */}
      <Composition
        id="ArticleVideo-2026-04-27"
        component={VideoComposition_2026_04_27}
        durationInFrames={TOTAL_FRAMES_2026_04_27}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-28 — 4K · AI 訓練資料從哪來？你的資料有沒有在裡面 */}
      <Composition
        id="ArticleVideo-2026-04-28"
        component={VideoComposition_2026_04_28}
        durationInFrames={TOTAL_FRAMES_2026_04_28}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-29 — 4K · 為什麼有些國家要管制 AI，台灣呢 */}
      <Composition
        id="ArticleVideo-2026-04-29"
        component={VideoComposition_2026_04_29}
        durationInFrames={TOTAL_FRAMES_2026_04_29}
        fps={30}
        width={3840}
        height={2160}
      />
      {/* 2026-04-30 — 4K · 學 AI 工具 vs 學 AI 原理 */}
      <Composition
        id="ArticleVideo-2026-04-30"
        component={VideoComposition_2026_04_30}
        durationInFrames={TOTAL_FRAMES_2026_04_30}
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
