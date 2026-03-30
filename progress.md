# article-video — Progress Log

## Project Overview

Remotion project that turns daily AI knowledge articles into explainer videos (~6.5 min).
Each video covers 3 topics driven by narrator's own recorded audio, rendered at 3840×2160 (4K) 30fps.

**Skill:** `SKILL.md` (daily-knowledge-scrape) — auto-searches and writes daily AI article
**Output:** `out/YYYY-MM-DD/YYYY-MM-DD.mp4` + `out/YYYY-MM-DD/ai-knowledge-YYYY-MM-DD.vtt`

---

## Multi-Agent Pipeline（Director Agent 必讀）

```
Director
  ├── [並行]
  │     ├── Audio Agent          — 音訊處理 → processed.wav
  │     ├── Transcription Agent  — Whisper → .vtt + scene timestamps
  │     └── Visual Concept Agent — 設計每個 topic 的動畫規格
  │
  ├── Scene Dev Agent            — 收到三者輸出，寫 TSX 元件
  ├── QA Agent                   — 檢查 + iMessage 通知
  └── Render Agent               — 收到通過後 render
```

---

## Visual Concept Agent 規格

### 職責
讀文章 MD，為每個 topic 決定最適合的視覺動畫形式，輸出動畫規格給 Scene Dev Agent。

### 輸入
- `ai-knowledge-YYYY-MM-DD/ai-knowledge-YYYY-MM-DD_script.md`

### 輸出
- `ai-knowledge-YYYY-MM-DD/visual-spec-YYYY-MM-DD.json`

### 動畫類型選擇邏輯

| Topic 性質 | 選用類型 | 範例 |
|-----------|---------|------|
| 協議 / 架構 / 系統連接 | `topology` — SVG 節點連線動畫 | MCP 協議、Agent 架構 |
| 數據 / 比較 / 排名 | `stats` — 數字跑動 + bar 動畫 | 模型 benchmark、市佔率 |
| 流程 / 步驟 / 時序 | `flowchart` — 步驟依序顯示 | RAG 流程、fine-tuning 步驟 |
| 抽象概念 / 哲學 | `threejs` — 3D 幾何動畫 | AI 悖論、倫理議題 |
| 產品發布 / 功能介紹 | `cards` — 文字卡 fadeUp（現有模板）| 新模型發布、工具更新 |

### 輸出格式 (`visual-spec-YYYY-MM-DD.json`)
```json
{
  "date": "YYYY-MM-DD",
  "topics": [
    {
      "index": 1,
      "title": "Topic 標題",
      "type": "topology",
      "description": "用一句話說明這個動畫要呈現什麼",
      "nodes": ["Claude", "MCP Server", "File System"],
      "connections": [["Claude", "MCP Server"], ["MCP Server", "File System"]],
      "color_accent": "green"
    },
    {
      "index": 2,
      "title": "Topic 標題",
      "type": "stats",
      "description": "比較三個模型的 benchmark 分數",
      "stats": [
        { "label": "GPT-4o", "value": 92, "unit": "%" },
        { "label": "Claude 3.5", "value": 88, "unit": "%" }
      ],
      "color_accent": "yellow"
    },
    {
      "index": 3,
      "title": "Topic 標題",
      "type": "threejs",
      "description": "抽象幾何球體表現 AI 與人類工作的張力",
      "color_accent": "green"
    }
  ]
}
```

### 注意事項
- `cards` 是最輕量的 fallback，用於時間緊或概念不適合視覺化時
- `topology` 和 `flowchart` 由 Scene Dev 用 SVG + Remotion 實作（參考 `src/MCPDiagram.tsx`）
- `threejs` 由 Scene Dev 在 `src/three/` 建立新元件

---

## QA + Render 審核流程（Director Agent 必讀）

Render 前必須執行 QA 並等待 James 核准：

```bash
# Step 1: QA 報告 + 發 iMessage + 背景 polling
./scripts/qa_and_wait.sh <YYYY-MM-DD>   # e.g. 2026-03-30

# Step 2: 等待核准（雙管道）
# - James 在對話中說「通過」→ Director 直接呼叫 render
# - James 用 iMessage 回「通過」→ polling 寫入 flag file → 自動 render
# 任一先到即可

# Step 3: Render（需加 --gl=angle）
npm run build:YYYY-MM-DD
# 或
npx remotion render src/index.ts ArticleVideo-YYYY-MM-DD out/YYYY-MM-DD/YYYY-MM-DD.mp4 --gl=angle --codec=h264 --overwrite
```

**對話中核准：** James 說「通過」時，Director 應立即執行 render，並 kill 背景 polling。

---

## Completed Videos

| Composition ID | Date | Resolution | Duration | Status |
|----------------|------|------------|----------|--------|
| `ArticleVideo` | 2026-03-24 | 1280×720 | ~33s | ✅ Legacy (old style) |
| `ArticleVideo-2026-03-26` | 2026-03-26 | 3840×2160 | ~33s | ✅ Done |
| `ArticleVideo-2026-03-27` | 2026-03-27 | 3840×2160 | 6:29 (11678f) | ✅ Done (3D + own audio) |

---

## 2026-03-27 Video — What Was Built

### Topics
1. NVIDIA 開放 AI 模型家族（Nemotron 3 / Isaac GR00T N1.7 / Cosmos 3）
2. 企業 AI 代理人 + MCP 協議
3. 哈佛商業評論：AI 工作強度悖論

### New Features Introduced
| Feature | Detail |
|---------|--------|
| Narrator's own audio | `ai-knowledge-2026-03-27/ai-knowledge-2026-03-27.wav` |
| Whisper VTT | `--model small --language zh --word_timestamps True --output_format json` → corrected .vtt |
| Podcast audio pipeline | highpass 80Hz → afftdn(nf=-25,nr=5) → EQ → acompressor → loudnorm(-20 LUFS) → amix BG (stream_loop -1) |
| Looping BG music | `-stream_loop -1` on BG music input so it loops for full video duration |
| 3D animations | ThreeCanvas per scene (NvidiaThree / McpThree / HbrThree) — `--gl=angle` required |
| useFadeIn hook | Opacity-only fade for AnalogyBox (prevents 4K text layout jitter) |
| Output folder | `out/YYYY-MM-DD/` with `.mp4` + `.vtt` |

### Audio Processing Command
```bash
ffmpeg -i narrator.wav \
  -stream_loop -1 -i public/audio/course_bgmusic.wav \
  -filter_complex "
    [0:a]highpass=f=80[hp];
    [hp]afftdn=nf=-25:nr=5:nt=w[dn];
    [dn]equalizer=f=120:...,equalizer=f=3000:...[eq];
    [eq]acompressor=threshold=0.06:ratio=4:attack=5:release=100:makeup=4[comp];
    [comp]loudnorm=I=-20:LRA=5:TP=-2[loud];
    [1:a]volume=0.08[bg];
    [loud][bg]amix=inputs=2:duration=first:dropout_transition=3[out]
  " \
  -map "[out]" -ar 44100 -ac 2 processed.wav -y
```
Target profile: Peak -2 dBFS, RMS -23 dB, Crest ~11 (matches reference `0-1_4.3.wav`)

### Render Command
```bash
npm run build:2026-03-27
# = remotion render ArticleVideo-2026-03-27 out/2026-03-27/2026-03-27.mp4 --codec h264 --gl=angle
# --gl=angle is REQUIRED for ThreeCanvas (WebGL software renderer)
```

### 3D Scene Files
```
src/three/
  NvidiaThree.tsx   — rotating icosahedron + 3 orbiting model spheres + particles
  McpThree.tsx      — hub-and-spoke network graph + pulse rings + RPA nodes fade
  HbrThree.tsx      — animated 3D bar chart (before AI vs after AI)
```

---

## Current SOP (2026-03-30 revised — VTT-first pipeline)

### 正確執行順序（必須嚴格遵守，不可亂序）

```
Phase 1 — 並行（互不依賴）
  ├── Audio Agent:  raw WAV → ffmpeg podcast chain → public/audio/...-processed.wav
  └── Script Agent: 讀 article MD → 確認 script 逐字稿

Phase 2 — Whisper（必須等 processed.wav 完成）
  └── Transcription Agent: python3 -m whisper processed.wav --model medium --language zh
                           → out/YYYY-MM-DD/...-processed.vtt
                           → rename to ai-knowledge-YYYY-MM-DD.vtt

Phase 3 — QA VTT（必須等 Whisper 完成）
  └── QA Agent: 對照 script MD 逐條校正 VTT 文字，保留時間戳
                → 輸出修正報告 → 存回 ai-knowledge-YYYY-MM-DD.vtt
                ⚠️ 逐字比對強制規則（缺一不可）：
                   1. 先執行掃描指令，把所有字幕文字合成一行再比對：
                      ```bash
                      grep -v "^[0-9]" file.vtt | grep -v "^-->" | grep -v "^WEBVTT" | grep -v "^$" | tr '\n' '|'
                      ```
                   2. 每一條 VTT cue 必須對應到 script 的對應句子，逐字確認
                   3. 同音字陷阱（Whisper 常犯）：常→長、斷→段、播→撥、員→源、方（多餘字）
                   4. 不能只看整體語意，必須逐字元比對
                   5. 修正報告必須列出每一處修改（before → after），不能只說「已校對」

Phase 4 — Scene Dev（必須等 QA VTT 完成）
  └── Scene Dev Agent: 讀取 corrected VTT → 計算每個元素的 frame = seconds × 30
                       → 寫 VideoComposition_YYYY_MM_DD.tsx
                       ⚠️ 所有 startFrame / delay 必須來自 VTT，絕不能猜測

Phase 5 — Animation QA（必須等 Scene Dev 完成）
  └── Animation QA Agent: 對照 VTT 每條字幕，確認對應視覺元素的出現時間正確
                          → 輸出 animation timing report

Phase 6 — Render（必須等 Animation QA 通過 + James 核准）
  └── npm run build:YYYY-MM-DD (no --gl=angle unless 3D ThreeCanvas used)
```

### 字幕安全區（Subtitle Safe Zone）

在 4K (3840×2160, S=3) 下，字幕出現在畫面底部約 360px（17%）。
ContentColumn 的 maxHeight 必須留出此空間，避免內容被遮擋：

```tsx
const SUBTITLE_SAFE = 120 * S;  // 360px at 4K (17% of canvas)
const H = 720 * S;               // canvas height = 2160
const contentTop = NAV_H + 20 * S;  // 150 + 60 = 210
// ContentColumn maxHeight = H - contentTop - SUBTITLE_SAFE = 2160 - 210 - 360 = 1590px
```

**⚠️ 多元素 Scene 必須做 Element Fade-Out（重要！）**

若一個 Scene 包含多個垂直疊加的元素，當後來的元素出現時，
早期元素必須先 fade out，再從 DOM 移除（height 歸零），
確保任何時間點的總高度都不超過 maxHeight。

```tsx
// Pattern: 在 scene component 中用 frame 控制早期元素的生命週期
const frame = useCurrentFrame();
const showEarly = frame < REMOVE_FRAME;   // DOM removal threshold
const earlyOpacity = frame > FADE_START   // opacity 先降到 0
  ? interpolate(frame, [FADE_START, REMOVE_FRAME], [1, 0], clamp) : 1;

// 在 JSX 中：
{showEarly && <div style={{ opacity: earlyOpacity }}><EarlyElement /></div>}
<LaterElement startFrame={LATER_FRAME} />
```

規則：
- FADE_START 應比 REMOVE_FRAME 早 100f（3.3s 淡出過渡）
- REMOVE_FRAME 必須早於 LaterElement 的 startFrame（留至少 100f 緩衝）
- 每個 Scene 的 Scene Dev 必須計算所有元素的總高度，確保不超過 maxHeight=1590px

### Frame 計算規則

```
global_frame = seconds × 30
local_frame  = global_frame − scene_start_frame

scene 邊界 → 讀 VTT，找每個段落的開始時間
element delay → 找 VTT 中對應台詞的開始時間，轉 local frame
```

### 注意事項

- **QA Agent 通過前絕對不能 render** — 否則浪費 token 和時間
- **Scene Dev 收到 VTT 前不能猜 frame** — 猜測必然對不上音訊
- **Animation QA 是獨立角色** — 負責驗證每個視覺元素的時間是否對齊 VTT
- **SUBTITLE_SAFE = 120*S** — 不是 80*S，已驗證，勿改回
- **多元素 Scene 必須做 Element Fade-Out** — 後來元素出現前，早期元素必須先淡出並從 DOM 移除
- **AnalogyBox delay 不能 ≥ scene duration** — 否則永遠不顯示（TipsScene 03-30 bug）
- `python3 -m whisper` (不是 `whisper`) — PATH 問題，用 module 方式執行
- Sub-agents 沒有 Bash 權限 — ffmpeg / whisper 必須由 Director 直接執行

**Multi-agent rule:** Audio + Script 可並行；其他階段必須按序。

---

## Pending / Next

- [ ] 2026-03-28 video (next episode)
- [ ] Consider pre-rendered 3D sequences to cut render time (currently ~5–15 min per video)
- [ ] Automate Whisper → frame offset calculation
