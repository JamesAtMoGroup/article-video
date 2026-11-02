---
name: daily-ai-newsletter
description: 產出「每日 AI 知識庫」繁體中文 AI 學習內容（文章 .md + 朗讀逐字稿 _script.md），內建事實查證閘門與 Google Drive 上傳。分為週五時事型（搜尋本週真實 AI 新聞）與一般觀念型（依題目庫選題）。當使用者說「幫我做今天的 newsletter」「產出 AI 知識庫」「給我 X/XX 的內容」「今天週五」「跑每日內容」等，立即使用此 skill。也可由 scheduled task 每日自動觸發。
---

# 每日 AI 知識庫 — daily-ai-newsletter

一條「產文 → 查證 → 驗證閘門 → 上架」的每日內容 pipeline。核心設計是**零污染**：任何未通過驗證的內容，都不會進入正式資料夾，也不會上傳 Drive。

---

## ⚙️ Step 0：讀取設定（必做）

本 skill 不硬編碼任何路徑。第一件事永遠是讀取同目錄下的 `config.json`：

```
<skill 目錄>/config.json
```

裡面有三個必填欄位：

| 欄位 | 說明 |
|------|------|
| `project_dir` | 內容專案資料夾（放每天的產出），例如 `/Users/<you>/Projects/article-video` |
| `drive_parent_folder_id` | Google Drive 母資料夾 ID（每天的子資料夾會建在它底下）。留空字串則跳過上傳 |
| `schedule_tsv` | 題目庫檔名，預設 `ai-newsletter-schedule.tsv`（放在 `project_dir` 下） |

若 `config.json` 尚未填好（還是 `REPLACE_ME`），**停下來請使用者先完成 SETUP.md 的步驟**，不要自行猜測路徑。

確認 `project_dir` 已掛載（Cowork 中用 `request_cowork_directory` 傳入該路徑）。

> ⚠️ File 工具（Read/Write/Edit）用主機路徑；bash 用 VM 掛載路徑。兩者指向同一個資料夾。

---

## Step 1：判斷日期與內容類型

日期一律用 bash 取得，不要憑印象：`TODAY=$(date +%Y-%m-%d)`

| 條件 | 類型 |
|------|------|
| 週五（或使用者指定的週五日期） | 時事型（Step 2A） |
| 其他日子 | 觀念型（Step 2B） |

使用者也可能指定日期或區間（「給我 5/25–5/28 的內容」）。多天任務就逐日跑完整流程，一天一天來。

**冪等檢查（重要）**：若 `project_dir/ai-knowledge-$TODAY/ai-knowledge-$TODAY.md` 已存在，**不要重新產生內容**，改為只補驗證（用 `--audit` 模式，見 Step 5）。避免覆蓋既有產出。

---

## Step 2A：時事型（週五）

用英文關鍵字搜尋**近 7 天**的 AI 重大事件（查詢帶上當月年份，如 "July 2026"）。

必查：Anthropic / Claude、OpenAI / ChatGPT、Google Gemini 的新模型與功能更新。
選查：AI 工具產品（Cursor、Copilot、Midjourney…）、AI 自動化（MCP、agent、workflow）。
優先媒體：TechCrunch、The Verge、Ars Technica、VentureBeat 與各家官方 Blog。

**選題角度（關鍵）**：以「學習 / 工具 / 怎麼用」為軸。避免把估值、IPO、融資、政治法規、商業賽局當主軸——那不是觀眾要的。

挑 2–3 個事件，每個依「發生了什麼 / 背後原因 / 對我們的意義」三段展開。

標題固定格式：`本週 AI 大事：[事件一]、[事件二]、[事件三]`

---

## Step 2B：觀念型（非週五）

讀 `project_dir/<schedule_tsv>`，找到當天那一列，**標題直接沿用題目庫的文字，不要自己改寫**。

若當天沒有排定題目，才從題目庫挑一個尚未使用的主題；選題前先 `ls` 既有的 `ai-knowledge-*` 資料夾並 `grep` 標題，確認沒撞題（驗證腳本也會擋，但先確認可以少跑一輪）。

依 What / Why / How 三段框架展開。

---

## Step 3：撰寫文章

### 絕對禁止
- 出現「學生」「給學生」「目標讀者」等字眼
- 任何來源引用區塊（Sources、資料來源、參考資料、延伸閱讀）
- 文章任何位置出現日期、年份、月份（含頁尾）
- 觀念型改寫題目庫的大標題

### 結構（嚴格遵守）

```markdown
> 🏷️ **主題 Title**：[短標題，15–25 字]

# [文章大標題]

> [一句話摘要]

---

## 今日速覽

- [要點一]
- [要點二]
- [要點三]

---

## 🔍 是什麼

[內文]

> 💡 **想一想**：[問題]

---

## 🔍 為什麼重要

[內文]

> 💡 **想一想**：[問題]

---

## 🔍 怎麼用

[內文，要 actionable：具體到可以照做]

> 💡 **想一想**：[問題]

---

## 🧭 今日重點整理

| 主題 | 核心洞見 |
|------|---------|
| [主題一] | [一句話精華] |
| [主題二] | [一句話精華] |

---

*每日 AI 知識庫 · AI 未來學院*
```

**三者必須逐字一致**：`🏷️ 主題 Title` 行 ＝ 文章 H1 ＝ 逐字稿第一行的標題。驗證腳本會擋。

觀念型的段落標題固定用「是什麼 / 為什麼重要 / 怎麼用」，不要自由命名。時事型則每個事件一個 `## 🔍` 段落。

### 撰寫原則
- 繁體中文，輕鬆口語，像在跟朋友解說
- 每篇至少融入 1 個 AI 素養視角（工具限制、隱私、如何負責任地使用）
- 收尾要 actionable，讀者看完知道下一步做什麼

---

## Step 4：產出逐字稿

檔名 `ai-knowledge-$TODAY_script.md`，第一行固定：

```
# 逐字稿 — [與文章 H1 完全相同的標題]
```

- 開場固定：`嗨，歡迎來到每日 AI 知識庫。【停頓】`
- 結尾固定：`這裡是每日 AI 知識庫，我是你的每日 AI 知識庫播報員。掰掰！`
- 結尾前**必須**有「重點整理」口播段（把文章的重點整理表格改寫成「第一…第二…第三…」的口播節奏）
- 頁尾：`*每日 AI 知識庫 · AI 未來學院*`
- 口播標記：`【停頓】`（約 0.5 秒）、`【長停頓】`（換氣，約 1 秒）、`【語氣：疑問】`、`【語氣：強調】`
- 不朗讀 Markdown 符號；每段「想一想」保留並轉成口語提問

---

## Step 5：驗證閘門（強制，不可跳過）

先寫到 isolation 暫存區，**不要直接寫進正式資料夾**：

```
project_dir/.staging/$TODAY/
├── ai-knowledge-$TODAY.md
├── ai-knowledge-$TODAY_script.md
└── _claims.json
```

### 5a. 事實查證 ledger

從文章抽出**每一條可查證的事實宣稱**（模型版本、日期、數字、公司動作、研究結論等），用 WebSearch 逐條查證，寫進 `_claims.json`（schema 見 `scripts/_claims.template.json`）：

- 每條要有 `claim` / `verdict` / `confidence` / `sources` / `evidence`
- `verdict` 只能是 `verified` / `refuted` / `unverifiable`
- verified 必須附一級來源（官方 blog、官方文件、論文、一級媒體）
- 門檻：時事型至少 2 條 verified，觀念型至少 1 條
- **任一條 refuted → 必須回頭修文章**，不能硬過

### 5b. 跑閘門

```bash
python3 scripts/verify_content.py --root <project_dir> --date $TODAY \
    --staging <project_dir>/.staging/$TODAY --mode auto
```

退出碼 0 = PASS，1 = FAIL。FAIL 就讀 `_verify.json` 的 `errors` 修正後重跑，**最多 3 次**；仍 FAIL 就停在 staging，不 promote、不上傳，並簡短回報原因。

（既有文章補驗證時：`_claims.json` 放在 `ai-knowledge-$TODAY/`，改用 `--audit` 模式。）

常見 FAIL 與修法：
- `SCR_TITLE_MISMATCH` → 逐字稿首行標題和文章 H1 不一致
- `DUP_TITLE` → 觀念型撞到舊文章標題，換題
- `ART_BANNED_WORD` / `ART_BANNED_SECTION` → 出現禁用詞或來源區塊
- `CLAIMS_MISSING` → 忘了寫 `_claims.json`

`ART_FOOTER_NODATE` 只是 warning（本 skill 規定頁尾不放日期），不擋。

### 5c. PASS 才 promote

```bash
python3 scripts/verify_content.py --root <project_dir> --date $TODAY \
    --staging <project_dir>/.staging/$TODAY --mode auto --promote
```

會搬進 `project_dir/ai-knowledge-$TODAY/`，並自動備份被覆蓋的檔案。

---

## Step 6：上傳 Google Drive（PASS 後才做）

`config.json` 的 `drive_parent_folder_id` 為空就跳過這步。

1. 在母資料夾底下「找或建」當天子資料夾，名稱 `ai-knowledge-$TODAY`：
   - 先 `search_files`：`parentId = '<母資料夾id>' and title = 'ai-knowledge-$TODAY'`
   - 找不到才 `create_file`，`mimeType="application/vnd.google-apps.folder"`
2. 三個檔上傳到該子夾（`parentId` = 子夾 id），每個上傳前先在子夾 `search_files` 查同名檔，已存在就跳過（去重）：

| 檔案 | title | contentMimeType |
|------|-------|-----------------|
| 文章 | `ai-knowledge-$TODAY.md` | `text/markdown` |
| 逐字稿 | `ai-knowledge-${TODAY}_script.md` | `text/markdown` |
| 驗證報告 | `_verify.json` | `application/json` |

一律帶 `disableConversionToGoogleType=true`，`textContent` 帶完整檔案內容。

> ⚠️ Drive 連接器只有 create / copy / read / search，**沒有 update / delete**。同名重傳會產生重複檔，所以上傳前的去重檢查是必要的。

---

## ✅ 完成標準

- [ ] 文章與逐字稿在 `project_dir/ai-knowledge-YYYY-MM-DD/`
- [ ] 🏷️ 主題 Title ＝ 文章 H1 ＝ 逐字稿首行，三者逐字一致
- [ ] 無禁用詞、無來源區塊、文中無日期
- [ ] 逐字稿有固定開場、重點整理口播段、固定結尾
- [ ] `_claims.json` 每條宣稱都經 WebSearch 查證，0 refuted，verified 達門檻
- [ ] `verify_content.py` 退出碼 0（PASS）才 promote
- [ ] Drive 子資料夾已建立，三個檔都上傳且無重複

---

## 🤖 每日自動排程

要讓它每天自己跑，見 `SCHEDULED_TASK.md`——把裡面的 prompt 貼進 Cowork 的 scheduled task 即可。
