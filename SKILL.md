---
name: daily-knowledge-scrape
description: 每天自動搜尋最新 AI 資訊，整理成繁體中文學習文章，並產出 Remotion 4K 影片；儲存至本地資料夾
---

# 每日 AI 知識庫 — 自動執行任務

---

## Part A — 文章生成

### 任務目標
每天產出一篇「每日 AI 知識庫」文章，目標讀者是想學習 AI 的學生。內容重心是知識與學習價值，不是單純新聞報導。

### ⚙️ 設定

| 設定項目 | 值 |
|---------|-----|
| 本地資料夾路徑 | `/Users/jamesshih/Projects/article-video` |

### Step 1：掛載本地資料夾

使用 `request_cowork_directory` 工具，傳入路徑 `/Users/jamesshih/Projects/article-video`。

### Step 2：搜尋今天最新的 AI 資訊

使用 WebSearch，以**英文關鍵字**搜尋今天或本週最新的 AI 相關資訊。

每次至少搜尋 2–3 個類別（輪流挑選）：
- **AI models & updates**：`"new AI model release [month year]"`, `"ChatGPT update"`, `"Claude update"`
- **AI coding tools**：`"Cursor AI update"`, `"GitHub Copilot"`, `"AI coding assistant news"`
- **AI automation**：`"n8n update"`, `"AI workflow automation"`, `"MCP agent news"`
- **AI literacy / ethics**：`"AI literacy students"`, `"responsible AI use"`, `"AI hallucination"`
- **AI creative tools**：`"Midjourney update"`, `"Runway AI"`, `"AI image video tool"`
- **AI in workplace**：`"AI jobs impact"`, `"AI productivity tools 2026"`

優先來源：TechCrunch, The Verge, Wired, Ars Technica, Anthropic Blog, OpenAI Blog, Google Blog, VentureBeat。
**避免中文網站（資訊較慢）。**

### Step 3：撰寫繁體中文文章

框架：**What / Why / How** 三段式

撰寫規範：
- 語言：繁體中文，輕鬆口語
- 每篇至少一個 AI 素養視角
- 不加來源引用區塊、不加關鍵詞速查表
- 頁尾：`*每日 AI 知識庫 · YYYY-MM-DD · AI 未來學院*`

### Step 4：儲存 .md 檔案

- 檔名：`ai-knowledge-YYYY-MM-DD.md`
- 優先存至：`mnt/article-video/`，備用：`mnt/outputs/`

---

## Part B — Remotion 4K 影片生成

### 核心規則（強制）

> **所有 article-video 影片必須以 4K（3840×2160）渲染輸出。**
> 所有 px 值乘以 `S = 3` 縮放係數。

---

### 視覺設計系統（Vibe Coding style）

#### 色彩 tokens

```ts
const C = {
  bg:           "#000000",              // 純黑背景
  surface:      "#0d0d0d",
  primary:      "#7cffb2",             // neon 綠
  primaryLight: "rgba(124,255,178,0.07)",
  primaryBorder:"rgba(124,255,178,0.14)",
  text:         "#ffffff",
  muted:        "#888888",
  yellow:       "#ffd166",
  yellowLight:  "rgba(255,209,102,0.1)",
  yellowBorder: "rgba(255,209,102,0.2)",
  red:          "#ff6b6b",
};
```

#### 字型

| 用途 | 字型 |
|------|------|
| 標題 / 正文 | `Noto Sans TC`, `PingFang TC` |
| 標籤 / 數字 / 技術資訊 | `Space Mono` |

安裝：`npm install @remotion/google-fonts@<matching version>`
載入：`loadNotoSansTC("normal", { weights: ["400","700","900"] })`

#### 嚴格禁止

- **禁止使用 emoji** in 主內容卡片、section badge、進度條（iMessage 通知內可用）
- **禁止**時間戳（mm:ss）in progress bar

---

### 4K 畫面規格

```ts
const S = 3;                              // scale factor — 乘以所有 px 值
const W = 1280 * S;                       // 3840
const H = 720  * S;                       // 2160
const NAV_H = 50 * S;                     // 150px — progress bar
const CONTAINER_W = 640 * S;             // 1920px — content column
const COL_LEFT = (W - CONTAINER_W) / 2; // 960px — left margin
```

Composition 設定：
```tsx
<Composition width={3840} height={2160} fps={30} />
```

#### 畫面圖層（從底到頂）

```
1. Background      — 兩個 radial-gradient orbs（top-right 0.07 / bottom-left 0.04）
2. Progress Bar    — 頂部 NAV_H=150px，chapter title + scrubber（無 mm:ss）
3. Sequences       — TitleScene + 3 × TopicScene（ContentColumn）
4. Notifications   — iMessage 通知堆疊層（永遠在最頂）
```

---

### iMessage 通知系統

#### 設計規格（4K 已縮放值）

```ts
const NOTIF_W         = 290 * S;   // 870px  卡片寬度
const NOTIF_TOP       = 12  * S;   // 36px   距 nav bar
const NOTIF_RIGHT     = 20  * S;   // 60px   距右邊
const NOTIF_SLOT      = 148 * S;   // 444px  每張通知佔用的垂直空間
const NOTIF_SLIDE_H   = 110 * S;   // 330px  從頂部滑入距離
const FADE_OUT_FRAMES = 50;        // 1.67s  結束後緩慢淡出
```

#### 視覺樣式

```
background: rgba(28,28,30,0.90)   ← macOS dark frosted glass
backdropFilter: blur(48px)
border: 1px solid rgba(255,255,255,0.13)
borderRadius: 14 * S = 42px
boxShadow: 0 24px 120px rgba(0,0,0,0.6)

icon: 38*S = 114px, borderRadius 9*S = 27px
      green gradient (145deg, #3DDC6A → #25A244)
      CSS speech bubble inside (白色圓角矩形 + 三角尾巴)

rows:
  1. "iMessage" (11*S=33px, 0.45 opacity) + "now" (right)
  2. sender name (13*S=39px, bold, 0.92 opacity)
  3. message body (13*S=39px, 0.60 opacity, typewriter 0.85 chars/frame)
```

#### 堆疊行為（Stacking Rules）

```
新通知到來時：
  - 新通知從頂部滑入（top-right 位置，spring damping:22 stiffness:130）
  - 舊通知被 spring 推下 NOTIF_SLOT px（444px）
  - 舊通知透明度隨深度遞減：depth 0=100%, 1=65%, 2=35%
  - 舊通知在 to + FADE_OUT_FRAMES(50f) 後淡出至 0

push-down 計算（每個舊通知）：
  for each newer callout that has started:
    pushF = globalFrame - newer.from
    pushP = spring({ frame: pushF, config: { damping:22, stiffness:120 } })
    totalYPush += NOTIF_SLOT * pushP

永遠不超過 2 張同時顯示（timing 控制）
左右交替設計已移除，全部固定在 top-right
```

#### Callout 資料結構

```ts
interface Callout {
  from: number;    // 開始幀（global）
  to:   number;    // 結束幀（通知可延長 FADE_OUT_FRAMES）
  sender: string;  // 顯示為寄件人（bold 第二行）
  text:   string;  // 訊息內文（typewriter）
}
```

刻意讓相鄰 callout 重疊 20–30 幀，製造堆疊效果：
```ts
const ALL_CALLOUTS: Callout[] = [
  { from: 220, to: 450, sender: "AI 未來學院",  text: "AI 開始主動替你執行任務了 🤖" },
  { from: 400, to: 480, sender: "產業觀察",     text: "..." },  // overlap 220-450
  ...
];
```

---

### useFadeUp Hook

```tsx
function useFadeUp(startFrame: number) {
  const frame = useCurrentFrame();  // Sequence local frame
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);
  const p = spring({ frame: f, fps, config: { damping: 22, stiffness: 90 } });
  return {
    opacity:   interpolate(f, [0, 18], [0, 1], clamp),
    transform: `translateY(${interpolate(p, [0, 1], [24 * S, 0], clamp)}px)`,
  };
}
```

---

### 影片結構（article-video 標準）

| Scene | 說明 | 建議時長 |
|-------|------|---------|
| 0 Title | 標題、日期 badge（pulsing dot）、3 topic pills | 180f（6s） |
| 1–3 Topics | SectionBadge + Card × 2 + AnalogyBox | 270–300f（9–10s）|

Total: ~1020f（34s）

---

### 音樂

- 背景音樂：`public/audio/course_bgmusic.wav`（來自 Vibe Coding 剪輯），volume: 0.06
- TTS 音檔：`public/audio/ai-{DD}-{1,2,3,4}.mp3`（生成後解開 Sequence Audio 註解）

---

### 命名與 SOP

| 項目 | 規則 |
|------|------|
| 文章 | `ai-knowledge-YYYY-MM-DD.md` |
| 講者音檔（原始）| `ai-knowledge-YYYY-MM-DD/ai-knowledge-YYYY-MM-DD.wav` |
| 講者音檔（處理後）| `public/audio/ai-knowledge-YYYY-MM-DD-processed.wav` |
| VTT 字幕 | `ai-knowledge-YYYY-MM-DD/ai-knowledge-YYYY-MM-DD.vtt` |
| Remotion 元件 | `src/VideoComposition_YYYY_MM_DD.tsx` |
| 3D 動畫元件 | `src/three/[Scene]Three.tsx` |
| Composition ID | `ArticleVideo-YYYY-MM-DD`（用 `-` 不用 `_`） |
| 輸出資料夾 | `out/YYYY-MM-DD/` |
| 輸出影片 | `out/YYYY-MM-DD/YYYY-MM-DD.mp4` |
| 輸出字幕 | `out/YYYY-MM-DD/ai-knowledge-YYYY-MM-DD.vtt` |

```
新影片製作 SOP（2026-03-30 修訂版 — VTT-first pipeline）：

⚠️ 嚴格順序，不可亂序，QA 通過前絕對不能 render

━━━ Phase 1 — 並行（互不依賴）━━━
  Audio Agent（由 Director 直接用 Bash 執行，sub-agent 無 Bash 權限）：
    ffmpeg -i narrator.wav \
      -stream_loop -1 -i public/audio/course_bgmusic.wav \
      -filter_complex "
        [0:a]highpass=f=80[hp];
        [hp]equalizer=f=120:width_type=o:width=2:gain=2,
            equalizer=f=3000:width_type=o:width=1.5:gain=1.5[eq];
        [eq]acompressor=threshold=0.06:ratio=4:attack=5:release=100:makeup=4[comp];
        [comp]loudnorm=I=-20:LRA=5:TP=-2[loud];
        [1:a]volume=0.08[bg];
        [loud][bg]amix=inputs=2:duration=first:dropout_transition=3[out]
      " -map "[out]" -ar 44100 -ac 2 public/audio/...-processed.wav -y
    ⚠️ 不使用 anlmdn（de-reverb 太強，毀音質）
    ⚠️ BG music 必須 -stream_loop -1（否則 60s 後靜音）

  Script Agent：讀 article MD → 確認逐字稿

━━━ Phase 2 — Whisper（等 processed.wav 完成）━━━
  用 python3 -m whisper（不是 whisper，PATH 問題）：
    python3 -m whisper public/audio/...-processed.wav \
      --model medium --language zh --output_format vtt \
      --output_dir out/YYYY-MM-DD/
  rename: ai-knowledge-YYYY-MM-DD-processed.vtt → ai-knowledge-YYYY-MM-DD.vtt

━━━ Phase 3 — QA VTT（等 Whisper 完成）━━━
  對照 script MD 逐條校正 VTT 文字，保留所有時間戳
  常見錯誤：他/它同音混淆、的/得/地、數字中/英文切換
  存回 out/YYYY-MM-DD/ai-knowledge-YYYY-MM-DD.vtt

━━━ Phase 4 — Scene Dev（等 QA VTT 完成）━━━
  ⚠️ 所有 frame 必須從 VTT 計算：global_frame = seconds × 30
  ⚠️ local_frame = global_frame - scene_start_frame
  ⚠️ 畫面必須有大量動畫，不能只是靜態文字卡 fade in！

  Scene 結構（必含）：
  - TitleScene: 標題 + 日期 badge (pulsing dot) + 3 topic pills
  - 主題 Scenes: 每個主題要有「視覺動畫元件」解釋概念（見下方動畫元件庫）
  - SummaryScene: 重點整理 (最後約 30s)，顯示 3 條回顧 cards
  - CHAPTERS 含所有 scene 邊界（包含 SummaryScene）

━━━ Phase 5 — Animation QA（等 Scene Dev 完成）━━━
  對照 VTT 逐條確認：每個視覺元素是否在對應台詞的正確時間點出現
  輸出 animation timing report

━━━ Phase 6 — Render（Animation QA 通過後）━━━
  npm run build:YYYY-MM-DD
  （含 3D ThreeCanvas 時才需 --gl=angle）
  → out/YYYY-MM-DD/YYYY-MM-DD.mp4
```

**Whisper 指令：`python3 -m whisper`（不是 `whisper`）**
**render 只在有 ThreeCanvas 時才需 `--gl=angle`**

---

### ⚠️ 動畫設計強制要求

**每個 Scene 必須有視覺動畫元件，不能只是靜態文字 card fade in。**
**觀眾必須能「看著動畫學習」，不是讀字。**

#### 動畫元件庫（Scene Dev 必讀）

| 元件 | 用途 | 實作方式 |
|------|------|---------|
| `TokenBlocksRow` | 展示 Token 切割概念 | CSS 方塊逐一 spring 彈入 |
| `DeskViz` | 上下文視窗比喻（桌面） | CSS 紙張逐一掉入桌面，最後一張紅色溢出 |
| `SituationCards` | 3 個情境並排 | useFadeUp 依序顯示 |
| `CompareTable` | EN/ZH Token 數量比較表 | useFocusHighlight 逐行高亮 |
| `EstimateCard` | 大數字 + 公式 | spring 彈入 + pulsing glow |
| `TokenAnalogyBox` | 積木比喻說明 | useFadeIn（opacity only） |
| `StepCard × N` | 步驟流程 | 依 VTT 時間逐一 useFadeUp |
| `SummaryScene` | 重點整理 | 3 條回顧 card + pulsing badge |
| `AnalogyBox` | 核心觀念補充 | useFadeIn + 左側 border |

#### 新主題動畫設計原則

- **數字/統計** → 大數字動畫計數 + bar 圖 animate width
- **流程/步驟** → 箭頭依序出現，SVG path draw-on
- **比較** → 左右或上下並列，useFocusHighlight 切換
- **概念/比喻** → CSS 圖示或幾何動畫（不需 Three.js）
- **架構圖** → SVG 節點 + 線條逐一繪製
- **比例/佔比** → 圓形或橫向 progress bar animate

#### ContentColumn 字幕安全區（強制）

```tsx
const SUBTITLE_SAFE = 120 * S;  // 360px at 4K (17% of 2160) — 勿改回 80*S
const H = 720 * S;               // canvas height = 2160
const contentTop = NAV_H + 20 * S;  // 150 + 60 = 210
// ContentColumn maxHeight = H - contentTop - SUBTITLE_SAFE = 2160 - 210 - 360 = 1590px
```

所有場景內容總高度 **必須 ≤ 1590px（4K）**，否則會被 clip。

#### Element Fade-Out 規則（多元素 Scene 必須執行）

若一個 Scene 有多個垂直疊加元素，當後來元素出現時，早期元素必須先 fade out 再從 DOM 移除，確保任何時間點的可見總高度不超過 maxHeight。

```tsx
// Scene component 中：
const frame = useCurrentFrame();
const FADE_START = 1000;    // 開始淡出（比 REMOVE_FRAME 早 100f）
const REMOVE_FRAME = 1100;  // 從 DOM 移除（比 LaterElement.startFrame 早至少 100f）

const showEarly = frame < REMOVE_FRAME;
const earlyOpacity = frame > FADE_START
  ? interpolate(frame, [FADE_START, REMOVE_FRAME], [1, 0], clamp) : 1;

// JSX：
{showEarly && <div style={{ opacity: earlyOpacity }}><EarlyElement /></div>}
<LaterElement startFrame={LATER_FRAME} />  // LATER_FRAME > REMOVE_FRAME + 100
```

⚠️ **AnalogyBox delay 不能 ≥ scene duration** — 否則永遠不顯示（03-30 TipsScene bug）

---

### 音訊處理標準

目標音量輪廓（對標 `0-1_4.3.wav` 參考檔案）：
- Peak: -2 dBFS
- RMS: -23 dB
- Crest factor: ~11
- Integrated: -20 LUFS
- BG music: `public/audio/course_bgmusic.wav`，`-stream_loop -1` 確保全片循環，volume 0.08

---

### 現有影片

| Composition ID | 尺寸 | 日期 | 主題 | 狀態 |
|----------------|------|------|------|------|
| `ArticleVideo` | 1280×720 | 2026-03-24 | Cursor/Copilot, MCP, AI 與工作 | 舊版 |
| `ArticleVideo-2026-03-26` | 3840×2160 | 2026-03-26 | AI 代理人, 生產力悖論, Cursor vs Copilot | ✅ |
| `ArticleVideo-2026-03-27` | 3840×2160 | 2026-03-27 | NVIDIA模型, MCP, HBR工作強度悖論 | ✅ 含 3D |
