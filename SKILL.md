---
name: daily-knowledge-scrape
description: 每天自動搜尋最新 AI 資訊，整理成繁體中文學習文章，儲存至本地資料夾
---

## 每日 AI 知識庫 — 自動執行任務

### 任務目標
每天產出一篇「每日 AI 知識庫」文章，目標讀者是想學習 AI 的學生。內容重心是知識與學習價值，不是單純新聞報導。

---

### ⚙️ 設定

| 設定項目 | 值 |
|---------|-----|
| 本地資料夾路徑 | `/Users/jamesshih/article-video` |

---

### Step 1：掛載本地資料夾

使用 `request_cowork_directory` 工具，傳入路徑 `/Users/jamesshih/article-video`。

掛載成功後，VM 內路徑為 `mnt/article-video`，後續 Step 4 儲存檔案時使用此路徑。

---

### Step 2：搜尋今天最新的 AI 資訊

使用 WebSearch，以**英文關鍵字**搜尋今天或本週最新的 AI 相關資訊（含當前年月，例如 "March 2026"）。

每次至少搜尋以下 2–3 個類別（輪流挑選，不要每天都一樣）：

- **AI models & updates**：`"new AI model release [month year]"`, `"ChatGPT update"`, `"Claude update"`, `"Gemini news"`
- **AI coding tools**：`"Cursor AI update"`, `"GitHub Copilot"`, `"AI coding assistant news"`
- **AI automation**：`"n8n update"`, `"AI workflow automation"`, `"MCP agent news"`
- **AI literacy / ethics**：`"AI literacy students"`, `"responsible AI use"`, `"AI hallucination"`
- **AI creative tools**：`"Midjourney update"`, `"Runway AI"`, `"AI image video tool"`
- **AI in workplace**：`"AI jobs impact"`, `"AI productivity tools 2026"`

優先來源：TechCrunch, The Verge, Wired, Ars Technica, Anthropic Blog, OpenAI Blog, Google Blog, Hugging Face Blog, VentureBeat。
**避免中文網站（資訊較慢）。**

---

### Step 3：撰寫繁體中文文章

從搜尋結果中挑選 1–3 個最有學習價值的主題，每個主題依以下框架撰寫：

- **是什麼（What）**：簡單解釋這個工具 / 概念 / 更新
- **為什麼重要（Why）**：對學生或使用者的意義
- **怎麼用（How）**：實際應用方式或操作建議

#### 撰寫規範

- **語言**：繁體中文
- **風格**：輕鬆口語，像老師或同學在解說，避免學術艱澀用語
- **AI 素養**：每篇至少融入 1 個 AI 素養視角（工具的限制、隱私問題、如何負責任地使用等）
- **深度篇輪換**：每隔幾篇穿插一篇 AI 素養深度主題（AI 幻覺辨別、AI 與工作、學術誠信等）
- **標題**：加上吸引學生的大標題（帶趣味或疑問句）
- **不加**來源引用區塊（citation）
- **不加**關鍵詞速查表（不要在文末加「今日關鍵詞速查」之類的表格）
- **頁尾**：固定格式為 `*每日 AI 知識庫 · YYYY-MM-DD · AI 未來學院*`，不加其他說明

---

### Step 4：儲存 .md 檔案至本地資料夾

- 檔名格式：`ai-knowledge-YYYY-MM-DD.md`（使用今天日期）
- 儲存路徑（依序嘗試）：
  1. **優先**：Step 1 掛載的本地資料夾（VM 路徑：`mnt/article-video/`）
  2. **備用**：當前 session 的 outputs 資料夾（`mnt/outputs/`）

---

### ✅ 成功標準

- [ ] `.md` 檔案已儲存至本地資料夾（或備用 outputs）
- [ ] 文章為繁體中文，輕鬆易讀
- [ ] 包含至少 1 個 AI 素養視角
- [ ] 無關鍵詞速查表，頁尾格式為 `*每日 AI 知識庫 · YYYY-MM-DD · AI 未來學院*`
