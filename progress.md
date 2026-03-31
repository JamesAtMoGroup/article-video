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
  │     │     └── ✅ checklist-audio.md
  │     └── Script Agent         — 確認逐字稿
  │           └── ✅ checklist-script.md
  │
  ├── Transcription Agent        — Whisper → .vtt
  │     └── ✅ checklist-transcription.md
  │
  ├── VTT QA Agent               — 逐字比對校正 VTT
  │     └── ✅ checklist-vtt-qa.md
  │
  ├── Visual Concept Agent       — VTT-driven 逐句動畫規格
  │     └── ✅ checklist-visual-concept.md
  │
  ├── Scene Dev Agent            — 寫 TSX 元件
  │     └── ✅ checklist-scene-dev.md
  │
  ├── Animation QA Agent         — 逐句對照 VTT 確認時間軸
  │     └── ✅ checklist-animation-qa.md
  │
  └── Render                     — Director 確認所有 checklist 後才能執行
        └── ✅ checklist-pre-render.md
```

**Director 規則：每個 phase 開始前，必須讀前一個 agent 的 checklist 檔案，確認所有項目為 `[x]`，才能進入下一步。checklist 有任何 `[ ]` 未完成，該 phase 必須重做。**

---

## Agent Checklist 模板

所有 checklist 存放於 `ai-knowledge-YYYY-MM-DD/` 資料夾。每個 agent 完成任務後必須將 checklist 存檔，Director 讀取確認後才能進入下一 phase。

---

### 📋 Audio Agent Checklist（`checklist-audio.md`）

```markdown
# Audio Agent Checklist — YYYY-MM-DD

## 輸入確認
- [ ] 原始音檔路徑：`_______________`（填實際路徑）
- [ ] 音檔可正常播放，無損壞

## 處理步驟
- [ ] highpass f=80Hz 已套用
- [ ] EQ 已套用（120Hz +2dB, 3000Hz +1dB）
- [ ] acompressor 已套用（threshold=0.06, ratio=4, attack=5, release=100, makeup=4）
- [ ] loudnorm 已套用（I=-20, LRA=5, TP=-2）
- [ ] BG music 已混入（volume=0.08, stream_loop=-1）
- [ ] 無套用 anlmdn（denoise 已禁用）

## 輸出確認
- [ ] 輸出檔案：`public/audio/ai-knowledge-YYYY-MM-DD-processed.wav`
- [ ] 輸出檔案存在且可播放
- [ ] 時長：`_____ 秒`（填實際秒數）
- [ ] Peak: `_____ dBFS`（目標 -2 dBFS）
- [ ] Integrated LUFS: `_____`（目標 -20 LUFS）

## Sign-off
- [ ] Audio Agent 確認以上全部完成
```

---

### 📋 Transcription Agent Checklist（`checklist-transcription.md`）

```markdown
# Transcription Agent Checklist — YYYY-MM-DD

## 輸入確認
- [ ] 使用的音檔：`public/audio/ai-knowledge-YYYY-MM-DD-processed.wav`（必須是 processed，非原始）
- [ ] 音檔時長確認：`_____ 秒`

## Whisper 執行
- [ ] 使用指令：`python3 -m whisper`（非 `whisper`）
- [ ] 參數：`--model medium --language zh --output_format vtt`
- [ ] 執行完成無報錯

## 輸出確認
- [ ] VTT 檔案存在：`out/YYYY-MM-DD/ai-knowledge-YYYY-MM-DD.vtt`
- [ ] VTT 共 `_____` 條 cue
- [ ] VTT 最後時間戳 `_____` 與音檔時長吻合（誤差 < 3 秒）

## Sign-off
- [ ] Transcription Agent 確認以上全部完成
```

---

### 📋 VTT QA Agent Checklist（`checklist-vtt-qa.md`）

```markdown
# VTT QA Agent Checklist — YYYY-MM-DD

## 掃描步驟（必須執行）
- [ ] 已執行全文掃描指令：
  `grep -v "^[0-9]" file.vtt | grep -v "^-->" | grep -v "^WEBVTT" | grep -v "^$" | tr '\n' '|'`
- [ ] 已將掃描結果與 script.md 逐字比對

## 同音字陷阱檢查（逐一確認）
- [ ] 常 → 長（長文、長任務）
- [ ] 斷 → 段（拆段）
- [ ] 播 → 撥（播報員）
- [ ] 員 → 源（播報員）
- [ ] 多餘字（如「英文方不一樣」）
- [ ] 其他自行發現的錯誤

## 修正記錄（每一處必須列出）
| 行號 | 錯誤 | 修正後 |
|------|------|-------|
| | | |

（若無修正，填「無」）

## 輸出確認
- [ ] 修正後 VTT 已存回：`out/YYYY-MM-DD/ai-knowledge-YYYY-MM-DD.vtt`
- [ ] 修正後 VTT 條數：`_____`，時間戳未被更動

## Sign-off
- [ ] VTT QA Agent 確認逐字比對完成，修正記錄如實填寫
```

---

### 📋 Visual Concept Agent Checklist（`checklist-visual-concept.md`）

```markdown
# Visual Concept Agent Checklist — YYYY-MM-DD

## 輸入確認
- [ ] 已讀取 script.md
- [ ] 已讀取 corrected VTT（必須是 VTT QA 通過後的版本）
- [ ] VTT QA checklist 已確認為全 [x]

## 逐句分析
- [ ] 已對每一條 VTT cue 標記 sentence_type
- [ ] 無任何 scene 超過 30 秒沒有新視覺元素
- [ ] 每個視覺元素的 vtt_seconds、frame、local_frame 均已計算（seconds × 30）

## 字幕安全區確認
- [ ] 所有規劃的視覺元素 bottom edge ≤ 1800px（4K）
- [ ] AbsoluteFill 置中 scene 已規劃 paddingBottom: SUBTITLE_SAFE
- [ ] ContentColumn scene 總高度估算 ≤ 1590px（如有多元素，已規劃 element fade-out）

## 輸出確認
- [ ] visual-spec-YYYY-MM-DD.json 已存檔
- [ ] JSON 包含所有 scene 的所有 cue
- [ ] 每個 cue 包含：vtt_seconds / frame / local_frame / sentence_type / visual.element / visual.animation

## Sign-off
- [ ] Visual Concept Agent 確認以上全部完成
```

---

### 📋 Scene Dev Agent Checklist（`checklist-scene-dev.md`）

```markdown
# Scene Dev Agent Checklist — YYYY-MM-DD

## 輸入確認
- [ ] 已讀取 corrected VTT
- [ ] 已讀取 visual-spec-YYYY-MM-DD.json
- [ ] Visual Concept checklist 已確認為全 [x]

## Frame 計算確認
- [ ] 所有 startFrame / delay 來自 VTT seconds × 30，無猜測值
- [ ] Scene 邊界 from/to 來自 VTT（填實際值）：
  - title: `_____` → `_____`
  - scene2: `_____` → `_____`
  - scene3: `_____` → `_____`
  - summary: `_____` → `_____`
- [ ] TOTAL_FRAMES = `_____`（= 音檔時長秒數 × 30）

## 字幕安全區確認（每個 scene 逐一）
- [ ] TitleScene：使用 AbsoluteFill，已加 `paddingBottom: SUBTITLE_SAFE` ✓/✗
- [ ] [Scene 2 名稱]：使用 ContentColumn，估算總高度 `_____px` ≤ 1590px ✓/✗
- [ ] [Scene 3 名稱]：使用 ContentColumn，估算總高度 `_____px` ≤ 1590px ✓/✗
- [ ] TipsScene：使用 ContentColumn，估算總高度 `_____px` ≤ 1590px ✓/✗
- [ ] SummaryScene：使用 AbsoluteFill，已加 `paddingBottom: SUBTITLE_SAFE` ✓/✗

## Element Fade-Out 確認
- [ ] 所有有多元素堆疊的 scene，已實作 element fade-out（或總高度確認安全）
- [ ] AnalogyBox delay < scene duration（無 delay ≥ duration 的 bug）

## 程式碼確認
- [ ] `SUBTITLE_SAFE = 120 * S`（非 80*S）
- [ ] Audio src 路徑正確：`audio/ai-knowledge-YYYY-MM-DD-processed.wav`
- [ ] CHAPTERS 包含所有 scene 邊界，含 SummaryScene
- [ ] TypeScript 無編譯錯誤（`npx tsc --noEmit` 通過）
- [ ] Remotion Studio 可開啟並顯示正確 composition

## Sign-off
- [ ] Scene Dev Agent 確認以上全部完成
```

---

### 📋 Animation QA Agent Checklist（`checklist-animation-qa.md`）

```markdown
# Animation QA Agent Checklist — YYYY-MM-DD

## 輸入確認
- [ ] 已讀取 corrected VTT
- [ ] 已讀取 VideoComposition_YYYY_MM_DD.tsx
- [ ] Scene Dev checklist 已確認為全 [x]

## 逐 Scene 逐 Cue 確認

### [Scene 名稱 1]（from: _____ to: _____）
| VTT 時間 | 台詞 | 預期視覺元素 | 實際 startFrame/delay | 對齊？ |
|---------|------|------------|---------------------|-------|
| | | | | ✓/✗ |

（每個 scene 填一張表）

## 字幕安全區視覺確認
- [ ] 已在 Remotion Studio 逐 scene 檢查
- [ ] 以下 frame 截圖確認無內容進入字幕區：
  - frame `_____`（最多元素同時出現的時間點）：✓/✗
  - frame `_____`（TipsScene 最後一個 step 出現時）：✓/✗
  - frame `_____`（SummaryScene 最後一張卡出現時）：✓/✗

## 30 秒無動畫檢查
- [ ] 無任何 scene 超過 30 秒沒有新視覺元素出現

## Sign-off
- [ ] Animation QA Agent 確認以上全部完成，所有 ✗ 項目已反映給 Scene Dev 修正
```

---

### 📋 Pre-Render Checklist（`checklist-pre-render.md`）— Director 執行

```markdown
# Pre-Render Checklist — YYYY-MM-DD

## 所有 Agent Checklist 確認
- [ ] checklist-audio.md：全 [x] ✓
- [ ] checklist-transcription.md：全 [x] ✓
- [ ] checklist-vtt-qa.md：全 [x] ✓
- [ ] checklist-visual-concept.md：全 [x] ✓
- [ ] checklist-scene-dev.md：全 [x] ✓
- [ ] checklist-animation-qa.md：全 [x] ✓

## 最終確認
- [ ] 音檔：`public/audio/ai-knowledge-YYYY-MM-DD-processed.wav` 存在
- [ ] VTT：`out/YYYY-MM-DD/ai-knowledge-YYYY-MM-DD.vtt` 存在（已校正版本）
- [ ] Composition ID：`ArticleVideo-YYYY-MM-DD`
- [ ] 輸出路徑：`out/YYYY-MM-DD/YYYY-MM-DD.mp4`
- [ ] package.json 有對應 build script：`build:YYYY-MM-DD`
- [ ] James 已口頭或 iMessage 核准

## 執行
- [ ] Render 指令：`npm run build:YYYY-MM-DD`
- [ ] Render 完成，檔案存在
- [ ] iMessage 通知已發送至 0981928525

## Sign-off
- [ ] Director 確認所有項目完成，render 已執行
```

---

## Visual Concept Agent 規格

### 核心原則（最重要）

> **每一條 VTT 字幕，都是一個視覺設計決策點。**
> 對每一句台詞問：「觀眾在聽這句話的時候，眼睛應該看到什麼，才能幫助他理解？」

動畫不是裝飾。每個視覺元素必須在**對應台詞的那一幀**出現，強化觀眾對那句話的理解。

---

### 必要輸入（缺一不可）

- `ai-knowledge-YYYY-MM-DD/ai-knowledge-YYYY-MM-DD_script.md` — 原始逐字稿
- `out/YYYY-MM-DD/ai-knowledge-YYYY-MM-DD.vtt` — **已校正的 VTT**（必須在 QA 通過後才能開始）

---

### 工作流程

**Step 1 — 逐句分類**

讀 VTT，對每一條 cue 標記句子類型：

| 句子類型 | 判斷關鍵字 | 視覺反應 |
|---------|-----------|---------|
| `definition` | 「X 叫做 Y」「這個單位就叫做」「就是」 | 顯示概念名稱 + 視覺定義框 |
| `analogy` | 「就像」「想像成」「你可以把 X 想像成 Y」 | 顯示比喻的視覺對照（左=抽象，右=具體） |
| `number` | 數字、「大約等於」「約」「%」 | 數字動畫跑動，或 bar/比例視覺 |
| `cause_effect` | 「因為...所以」「這就解釋了」「這才是」 | before → after 動畫，或箭頭連接兩個狀態 |
| `step` | 「第一」「第二」「第三」「第四」 | 依序 reveal，前一步保留，新步驟高亮 |
| `warning` | 「注意」「最容易被誤解」「不是...而是」 | 高亮脈衝、顏色強調（紅或黃） |
| `transition` | 場景切換台詞（「接下來」「那懂了之後」） | 不需新視覺，等待下一個 scene |
| `summary` | 「重點整理」「第一...第二...第三」（結尾） | 逐條 recap card 依序出現 |

**Step 2 — 決定視覺元素**

每個視覺元素必須回答：
1. **What** — 畫面上出現什麼（文字、圖形、數字、圖表、動畫）
2. **When** — 哪一幀出現（= VTT seconds × 30，必須精確）
3. **How** — 怎麼進場（fadeUp / scaleIn / drawLine / countUp / slideIn）
4. **How long** — 停留多久（直到下一個視覺取代它，或 scene 結束）

**Step 3 — 輸出 visual-spec JSON**

---

### 輸出格式 (`visual-spec-YYYY-MM-DD.json`)

```json
{
  "date": "YYYY-MM-DD",
  "scenes": [
    {
      "scene_id": "token",
      "scene_start_seconds": 27.0,
      "scene_start_frame": 810,
      "cues": [
        {
          "vtt_seconds": 30.5,
          "frame": 915,
          "local_frame": 105,
          "cue_text": "AI 讀文字的方式是把文字切成一塊一塊的小單位",
          "sentence_type": "definition",
          "visual": {
            "element": "TokenSplitAnimation",
            "description": "一段文字從左到右被切割成色塊積木，每塊 pop in",
            "animation": "splitIn",
            "accent_color": "green"
          }
        },
        {
          "vtt_seconds": 38.0,
          "frame": 1140,
          "local_frame": 330,
          "cue_text": "你可以把 Token 想像成積木",
          "sentence_type": "analogy",
          "visual": {
            "element": "AnalogyComparison",
            "description": "左：文字句子；右：拆開的積木塊（同步 pop in）",
            "animation": "fadeUp",
            "accent_color": "green"
          }
        },
        {
          "vtt_seconds": 86.8,
          "frame": 2604,
          "local_frame": 1794,
          "cue_text": "1000 個 Token 大約等於 750 個英文單字",
          "sentence_type": "number",
          "visual": {
            "element": "EstimateCard",
            "description": "大數字 1000 countUp，右側顯示 750 英文 / 500 中文",
            "animation": "countUp + fadeUp",
            "accent_color": "green"
          }
        }
      ]
    }
  ]
}
```

---

### 視覺元素庫（Scene Dev 可直接使用）

| Element | 適用句子類型 | 說明 |
|---------|------------|------|
| `TokenSplitAnimation` | definition | 文字逐字切割成色塊 |
| `AnalogyComparison` | analogy | 左右對照：抽象概念 vs 具體比喻 |
| `EstimateCard` | number | 大數字 + 換算公式 |
| `CompareTable` | number / cause_effect | 表格逐行 reveal |
| `StepSequence` | step | 步驟依序高亮，前步驟保留但降透明度 |
| `CauseEffectArrow` | cause_effect | 左框 → 箭頭動畫 → 右框 |
| `HighlightPulse` | warning | 文字或框脈衝發光 |
| `DeskViz` | analogy | 桌面視窗比喻的 CSS 動畫 |
| `TopologyDiagram` | definition (架構) | SVG 節點 + 連線逐一繪製 |
| `BarChart` | number / cause_effect | 橫向 bar 從 0 animate 到目標值 |
| `SummaryCards` | summary | 3 張 recap card 依序 fadeUp |

---

### 禁止事項

- ❌ 不能在沒有 corrected VTT 的情況下開始
- ❌ 不能讓一個 scene 超過 30 秒沒有新的視覺元素出現
- ❌ 不能只用 `cards` 撐完整個 scene（cards 只能當補充，不能是主體）
- ❌ 視覺元素的出現時間不能猜測，必須來自 VTT seconds × 30
- ❌ 不能設計超出 maxHeight=1590px 的元素堆疊（需做 element fade-out）

---

## QA + Render 審核流程（Director Agent 必讀）

**Render 前，Director 必須逐一讀取並確認以下所有 checklist 檔案全為 `[x]`：**

```
ai-knowledge-YYYY-MM-DD/checklist-audio.md
ai-knowledge-YYYY-MM-DD/checklist-transcription.md
ai-knowledge-YYYY-MM-DD/checklist-vtt-qa.md
ai-knowledge-YYYY-MM-DD/checklist-visual-concept.md
ai-knowledge-YYYY-MM-DD/checklist-scene-dev.md
ai-knowledge-YYYY-MM-DD/checklist-animation-qa.md
```

任何 checklist 有未完成項目（`[ ]`），Director 必須退回該 agent 重做，不得繼續。

確認全部通過後：

```bash
# Step 1: 填寫 checklist-pre-render.md，發 iMessage 給 James
./scripts/qa_and_wait.sh <YYYY-MM-DD>

# Step 2: 等待 James 核准
# - 對話中說「通過」→ Director 直接執行 render
# - iMessage 回「通過」→ polling flag → 自動 render

# Step 3: Render
npm run build:YYYY-MM-DD
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

字幕是全片都在的，不是某個 scene 才有。**所有 scene 的所有視覺元素，bottom edge 不得低於 `H - SUBTITLE_SAFE = 2160 - 360 = 1800px`。這是絕對邊界。**

```tsx
const SUBTITLE_SAFE = 120 * S;  // 360px at 4K (17% of canvas) — 全片共用，勿改
const H = 720 * S;               // canvas height = 2160
// 任何元素的 bottom edge 必須 ≤ 1800px
```

實作方式依佈局類型：

| 佈局類型 | 實作方式 |
|---------|---------|
| ContentColumn（一般 scene） | `maxHeight = H - contentTop - SUBTITLE_SAFE = 1590px` + `overflowY: hidden` |
| AbsoluteFill 置中（TitleScene / SummaryScene） | `paddingBottom: SUBTITLE_SAFE`（確保 flex 置中不會把內容推到底部） |
| AbsoluteFill 自訂定位（任何絕對定位元素） | `bottom` 值必須 ≥ `SUBTITLE_SAFE`；或明確計算 `top + height ≤ 1800px` |

**Scene Dev 清單（每個新元件建立前必確認）：**
- [ ] 這個元件走哪種佈局？
- [ ] bottom edge 最大值是多少 px？
- [ ] 是否 ≤ 1800px？

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
