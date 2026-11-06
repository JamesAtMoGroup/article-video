# 安裝與設定（約 10 分鐘）

## 1. 安裝 skill

在 Cowork 對話裡點下方的 `daily-ai-newsletter.skill` 檔案卡片 → **Save skill**。
（或到 Settings › Capabilities 匯入。）

安裝後 skill 會在你的本機 skills 目錄下，含這些檔案：

```
daily-ai-newsletter/
├── SKILL.md              ← 主流程
├── SETUP.md              ← 你正在看的這份
├── SCHEDULED_TASK.md     ← 每日排程用的 prompt
├── config.json           ← 要改的只有這個
└── scripts/
    ├── verify_content.py     ← 驗證閘門
    └── _claims.template.json ← 事實查證 ledger 範本
```

## 2. 建一個內容資料夾

在你電腦上開一個資料夾放每天的產出，例如：

```
~/Projects/ai-newsletter
```

把 skill 裡的 `scripts/` 和題目庫 `ai-newsletter-schedule.tsv` 複製一份進去：

```bash
PROJECT=~/Projects/ai-newsletter
mkdir -p "$PROJECT"
cp -R <skill 目錄>/scripts "$PROJECT/"
cp <skill 目錄>/ai-newsletter-schedule.tsv "$PROJECT/"
```

（找不到 skill 目錄的話，直接在 Cowork 說「幫我把 daily-ai-newsletter 的 scripts 和題目庫複製到 ~/Projects/ai-newsletter」，它會幫你做。）

## 3. 填 config.json

打開 skill 目錄下的 `config.json`，把兩個 `REPLACE_ME` 換掉：

```json
{
  "project_dir": "/Users/你的帳號/Projects/ai-newsletter",
  "drive_parent_folder_id": "",
  "schedule_tsv": "ai-newsletter-schedule.tsv"
}
```

- `project_dir`：上一步那個資料夾的**絕對路徑**
- `drive_parent_folder_id`：Google Drive 母資料夾的 ID。開啟該資料夾，網址長這樣
  `https://drive.google.com/drive/folders/1zICxxxxxxxxxxxxx` ← 最後那段就是 ID。
  **不想上傳 Drive 就留空字串**，流程會自動跳過這步。

## 4. 準備題目庫

`ai-newsletter-schedule.tsv` 是排定每天要寫什麼的表，欄位：

```
日期	星期	週次	階段	週題	題目	完成
```

附的這份是範例（含一整套「理解 AI 底層機制 → AI 工具實戰」的課綱），你可以直接沿用、改標題、或整份換掉。**觀念型文章的標題會直接沿用「題目」欄的文字**，所以那一欄請寫成最終想要的標題。

沒排到的日子，skill 會自己從題目庫挑一個沒用過的主題。

## 5. 連接 Google Drive（可選）

要自動上傳的話，在 Cowork 的連接器設定裡連上 Google Drive。沒連也不影響產文與驗證。

## 6. 試跑一次

在 Cowork 說：

> 幫我產出今天的 AI 知識庫

第一次跑會經過：選題 → 寫文章 → 寫逐字稿 → WebSearch 查證 → 驗證閘門 → promote →（有連 Drive 就）上傳。
看到 `RESULT: PASS` 就成功了。

## 7. 設定每日自動跑

見 `SCHEDULED_TASK.md`。

---

## 疑難排解

**「驗證閘門一直 FAIL」**
讀 `<project_dir>/ai-knowledge-<日期>/_verify.json` 或 `.staging/<日期>/_verify.json` 的 `errors` 陣列，每個錯誤碼都有明確意思，SKILL.md 的 Step 5b 列了常見幾個。

**「python3 找不到」**
驗證腳本只用標準函式庫，任何 Python 3.8+ 都可以。

**「Drive 上出現重複檔案」**
Drive 連接器沒有 update/delete，只能 create。所以同名檔重傳會變成兩份——手動刪掉舊的即可，流程本身有去重檢查，正常不會發生。

**「文章標題被改掉了 / 跟題目庫不一樣」**
觀念型不該改標題。提醒它：標題沿用題目庫文字，且 🏷️ 主題 Title、文章 H1、逐字稿首行三者必須逐字一致。
