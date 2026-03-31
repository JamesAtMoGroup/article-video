---
name: daily-knowledge-scrape
description: 每天自動搜尋最新 AI 資訊，整理成繁體中文學習文章，並產出 Remotion 4K 影片；儲存至本地資料夾
---

# 每日 AI 知識庫 — 自動執行任務

---

## Part A — 文章生成

### ⚙️ 設定

| 設定項目 | 值 |
|---------|-----|
| 本地資料夾路徑 | `/Users/jamesshih/Projects/article-video` |
| VM 掛載路徑 | `mnt/article-video/` |

---

### Step 0：掛載本地資料夾（第一步，不可跳過）

立即呼叫 `request_cowork_directory`，傳入路徑 `/Users/jamesshih/Projects/article-video`。
掛載成功後，VM 內路徑為 `mnt/article-video/`。若掛載失敗，停止任務並記錄錯誤。

---

### Step 1：判斷今天的內容類型

| 條件 | 執行類型 |
|------|---------|
| 今天是**週五** | → 執行「週五時事型」（Step 2A） |
| 今天是其他日期 | → 執行「一般觀念型」（Step 2B） |

---

### Step 2A：週五時事型 — 搜尋本週 AI 事件

> 僅週五執行此步驟

使用 WebSearch，以**英文關鍵字**搜尋**本週（近 7 天）**內的 AI 重大事件，含當前年月（例如 "March 2026"）。

搜尋方向（每次至少 2–3 個）：
- **AI models & releases**：`"new AI model [month year]"`, `"Claude update"`, `"GPT update"`, `"Gemini news"`
- **AI tools & products**：`"Cursor AI"`, `"GitHub Copilot"`, `"Midjourney"`, `"Runway AI update"`
- **AI automation**：`"n8n update"`, `"MCP agent"`, `"AI workflow news"`
- **AI industry events**：`"AI company news this week"`, `"AI regulation"`, `"AI funding"`
- **AI controversy**：`"AI model removed"`, `"AI safety concern"`, `"AI company decision"`

優先來源：TechCrunch, The Verge, Wired, Ars Technica, Anthropic Blog, OpenAI Blog, Google Blog, VentureBeat。
**避免中文網站（資訊較慢）。**

挑選 **2–3 個本週最值得講的事件**，每個依以下框架：
- **發生了什麼（What happened）**
- **背後原因（Why）**
- **對我們的意義（So what）**

---

### Step 2B：一般觀念型 — 從題目庫挑選主題

> 非週五執行此步驟

從以下**題目庫**中挑選 1 個尚未產出過的主題：

#### 🧠 AI 基礎概念
1. AI 為什麼會「幻覺」？它不是在說謊
2. Token 是什麼？為什麼 AI 有字數限制
3. RAG 是什麼？讓 AI 記住你的資料
4. Fine-tuning vs Prompt Engineering，哪個更值得學
5. 為什麼同一個問題問 AI，每次答案都不一樣

#### 🤖 模型與工具
6. Claude、GPT、Gemini 到底差在哪
7. 開源模型 vs 閉源模型，你該選哪個
8. 什麼是 MCP？為什麼最近大家都在講
9. AI Agent 和一般 AI 聊天有什麼本質差異
10. 為什麼模型越來越便宜，但能力越來越強

#### ⚙️ AI 應用與工作流
11. Prompt 寫不好的人都犯了這個錯
12. 什麼是 AI 工作流？n8n 能幫你自動化什麼
13. 用 AI 寫的東西，版權是誰的
14. AI 幫你做完的工作，你還算做了嗎

#### 🌍 AI 素養與社會
15. 為什麼 AI 公司都在搶「上下文視窗」長度
16. AI 訓練資料從哪來？你的資料有沒有在裡面
17. 為什麼有些國家要管制 AI，台灣呢
18. 學 AI 工具，和學 AI 原理，有什麼不同
19. AI 會取代哪些工作？一個比較誠實的分析
20. 現在學 AI 的人，五年後的優勢是什麼

每個主題依 **What / Why / How** 框架撰寫。

**⚠️ 文章大標題（`#` 標題）必須直接使用題目庫中的文字，不得自行改寫或發揮。**

---

### Step 3：撰寫繁體中文文章

#### 【禁止事項】
- 嚴禁出現「學生」「給學生」「目標讀者」等用詞
- 嚴禁加入任何來源引用區塊（「資料來源」「Sources」「參考資料」等）
- 嚴禁加入關鍵詞速查表
- 嚴禁在文章開頭加入「目標讀者」標示
- 嚴禁在標題中出現任何日期、年份或月份——日期只能出現在頁尾

#### 固定文章格式

```
# [直接使用題目庫中的標題文字，不得改寫]

> [一句話摘要]

---

## 今日速覽

- [主題一簡述]
- [主題二簡述]
- [主題三簡述（若有）]

---

## 🔍 [主題一標題]

[內文：是什麼 / 為什麼重要 / 怎麼用，輕鬆口語]

> 💡 **想一想**：[引發思考的問題]

---

## 🔍 [主題二標題]

[內文]

> 💡 **想一想**：[引發思考的問題]

---

## 🔍 [主題三標題（若有）]

[內文]

> 💡 **想一想**：[引發思考的問題]

---

## 🧭 今日重點整理

| 主題 | 核心洞見 |
|------|---------|
| [主題一] | [一句話精華] |
| [主題二] | [一句話精華] |

---

*每日 AI 知識庫 · YYYY-MM-DD · AI 未來學院*
```

#### 撰寫規範
- 語言：繁體中文，輕鬆口語
- 每篇至少 1 個 AI 素養視角（工具限制、隱私、負責任使用等）

---

### Step 4：產出逐字稿

完成文章後產出供朗讀的完整逐字稿：

- 語言：繁體中文口語，自然流暢
- 口播提示標記：【停頓】【長停頓】【語氣：疑問】【語氣：強調】
- 表格改成「第一⋯⋯第二⋯⋯第三⋯⋯」口播節奏
- 開場：「嗨，歡迎來到每日 AI 知識庫。」
- 結尾：「這裡是每日 AI 知識庫，我是你的每日 AI 知識庫播報員。掰掰！」
- 頁尾：`*每日 AI 知識庫 · YYYY-MM-DD · AI 未來學院*`

---

### Step 5：儲存檔案

在 `mnt/article-video/` 底下建立子資料夾，存入文章與逐字稿：

```
mnt/article-video/
└── ai-knowledge-YYYY-MM-DD/
    ├── ai-knowledge-YYYY-MM-DD.md
    └── ai-knowledge-YYYY-MM-DD_script.md
```

---

## Part B — Remotion 4K 影片生成

### 核心規則（強制）

> **每個 Agent 必須在完成任務後，將 checklist 存檔至 `ai-knowledge-YYYY-MM-DD/checklist-[agent].md`。Director 確認所有 checklist 全為 `[x]` 後，才能進入下一 phase 或執行 render。**
> Checklist 模板詳見 `progress.md` → Agent Checklist 模板。

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

### ⚠️ 動畫設計核心原則

> **每一條 VTT 字幕，都是一個視覺設計決策點。**
> 對每一句台詞問：「觀眾在聽這句話的時候，眼睛應該看到什麼，才能幫助他理解？」

動畫不是裝飾。每個視覺元素必須在對應台詞的那一幀出現，強化觀眾的理解。一個 scene 不能超過 30 秒沒有新視覺元素出現。

#### 句子類型 → 視覺決策

| 句子類型 | 判斷關鍵字 | 視覺設計方向 |
|---------|-----------|------------|
| `definition` | 「叫做」「就是」「這個單位就是」 | 概念名稱 + 視覺定義框，splitIn 或 scaleIn |
| `analogy` | 「就像」「想像成」「把 X 想像成 Y」 | 左右對照：抽象 vs 具體比喻 |
| `number` | 數字、「大約等於」「約」「%」 | 數字 countUp，或 bar animate width |
| `cause_effect` | 「因為...所以」「這就解釋了」「這才是」 | before → after，箭頭連結兩狀態 |
| `step` | 「第一」「第二」「第三」「第四」 | 依序 reveal，前步驟保留但降透明度 |
| `warning` | 「最容易被誤解」「不是...而是」 | 高亮脈衝，紅或黃強調色 |
| `transition` | 「接下來」「那懂了之後」 | 不需新視覺，等待 scene 切換 |
| `summary` | 「重點整理」（結尾段） | recap card 依序 fadeUp |

#### 動畫元件庫（Scene Dev 必讀）

| 元件 | 句子類型 | 實作方式 |
|------|---------|---------|
| `TokenSplitAnimation` | definition | 文字逐字切割成色塊 spring 彈入 |
| `AnalogyComparison` | analogy | 左右對照框同步 fadeUp |
| `TokenBlocksRow` | definition/analogy | CSS 方塊逐一 spring 彈入 |
| `DeskViz` | analogy | CSS 紙張掉入桌面，最後一張紅色溢出 |
| `SituationCards` | cause_effect | 3 個情境並排，依序 useFadeUp |
| `CompareTable` | number | useFocusHighlight 逐行高亮 |
| `EstimateCard` | number | spring 彈入 + pulsing glow + countUp |
| `BarChart` | number/cause_effect | 橫向 bar 從 0 animate 到目標值 |
| `CauseEffectArrow` | cause_effect | 左框 → 箭頭動畫 → 右框 |
| `StepSequence` | step | 依 VTT 時間逐一 useFadeUp，前步保留 |
| `HighlightPulse` | warning | 文字或框脈衝發光（紅/黃） |
| `TopologyDiagram` | definition(架構) | SVG 節點 + 線條逐一繪製 |
| `SummaryScene` | summary | 3 條 recap card + pulsing badge |
| `AnalogyBox` | analogy補充 | useFadeIn + 左側 border |

#### Visual Concept Agent 必須輸出的 JSON 格式

詳見 `progress.md` → Visual Concept Agent 規格。每個 cue 必須包含：`vtt_seconds`、`frame`、`local_frame`、`sentence_type`、`visual.element`、`visual.animation`。

#### 字幕安全區（全片強制，不限 scene 類型）

> 字幕是**全片都在的**。所有 scene 的所有視覺元素，bottom edge 不得低於 `H - SUBTITLE_SAFE = 1800px`。這是絕對邊界。

```tsx
const SUBTITLE_SAFE = 120 * S;  // 360px at 4K — 勿改回 80*S
const H = 720 * S;               // 2160px
// 任何元素的 bottom edge 必須 ≤ 1800px
```

佈局類型對應實作：

| 佈局類型 | 實作方式 |
|---------|---------|
| ContentColumn（一般 scene） | `maxHeight = 1590px` + `overflowY: hidden` |
| AbsoluteFill 置中（TitleScene / SummaryScene） | `paddingBottom: SUBTITLE_SAFE` |
| AbsoluteFill 自訂定位 | `bottom` ≥ `SUBTITLE_SAFE`，或確認 `top + height ≤ 1800px` |

**Scene Dev 每建立新元件前必確認：**
- [ ] 這個元件走哪種佈局？
- [ ] bottom edge 最大值是多少 px？
- [ ] 是否 ≤ 1800px？

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
