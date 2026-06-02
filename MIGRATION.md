# 換電腦轉移指南 — article-video / 每日 AI 知識庫

> 最後更新：2026-06-02

## ⚠️ 最重要的一件事

本 repo 的 `.gitignore` **排除了所有內容資產**：`ai-knowledge-*/`、`public/audio/`、
`out/`、所有 `*.wav/.mp3/.mp4`。**這些東西不在 GitHub 上，只在本機。**

- ✅ 在 GitHub（git clone 就有）：程式碼、`SKILL.md`、`ai-newsletter-schedule-2026.tsv`、`scripts/`、`docs/`、Remotion `src/`。
- ❌ 不在 GitHub（必須手動搬）：39+ 集文章/逐字稿、音檔、影片、`out/` 成品。

**換電腦前，務必先跑 `scripts/backup_content.sh` 把內容資產備份出去，否則會遺失。**

---

## 資產地圖

| 內容 | 位置 | 在 git？ |
|------|------|---------|
| 逐日主題排程 | `ai-newsletter-schedule-2026.tsv` | ✅ |
| 選題規則/題目庫 | `SKILL.md`（Step 2B） | ✅ |
| 選題策略 | `docs/topic-strategy-2026-06.md` | ✅ |
| 驗證閘門 | `scripts/verify_content.py` | ✅ |
| 備份腳本 | `scripts/backup_content.sh` | ✅ |
| 每集文章/逐字稿/媒體 | `ai-knowledge-YYYY-MM-DD/` | ❌ 本機限定 |
| 音檔/影片成品 | `public/audio/`、`out/` | ❌ 本機限定 |
| Cowork 記憶（選題策略/驗證 SOP 等） | Claude App Support 目錄 | ❌ 本機限定 |

---

## 轉移步驟

### 方案一：整台 Mac 搬（最省事，推薦）

用 **Migration Assistant** 從舊 Mac 搬到新 Mac。會一次帶走：專案資料夾、內容資產、
Claude 桌面 App 設定、Cowork 記憶。搬完只需在新機 `cd ~/Projects/article-video && npm install`。

### 方案二：手動搬（只換專案，不搬整機）— 推薦用 `--full` 一包到底

`--full` 會把**整個資料夾**（含未 commit 的程式碼、git 歷史、x-mcp、所有內容資產）
一次打包，只排除可重建的 `node_modules`。最不容易漏東西。

**舊電腦（備份）：**

```bash
cd ~/Projects/article-video
# 接上外接硬碟後，一行搞定（約 3.7G，不含 node_modules）
scripts/backup_content.sh /Volumes/你的外接碟/av-backup --full --tar
```

**新電腦（下載 / 還原）：**

```bash
# 1) 把備份還原到專案位置
mkdir -p ~/Projects/article-video
rsync -a /Volumes/你的外接碟/av-backup/article-video-full/ ~/Projects/article-video/

# 2) 重建相依套件（node_modules 沒備份，這裡重裝）
cd ~/Projects/article-video
npm install

# 3)（選用）x-mcp 的 Python 環境重建
cd x-mcp && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt && cd ..

# 4) 健檢
ls -d ai-knowledge-2026-* | wc -l
python3 scripts/verify_content.py --root . --date 2026-05-29 --audit
```

> 因為 `--full` 已含 `.git`，新電腦不需要再 `git clone`；git 歷史與 origin 遠端都跟著過去，
> 之後照常 `git pull` / `git push` 即可。

---

### 方案三：只備份內容資產（日常增量備份用，非換機）

```bash
# 只搬 gitignored 的內容（程式碼靠 GitHub），含 SHA256 校驗
scripts/backup_content.sh /Volumes/你的外接碟/av-backup
# 新電腦：git clone 取程式碼，再把 article-video-content/ 內容 rsync 回 repo 根
```

---

## 新電腦上的 Cowork 設定

1. 安裝 **Claude 桌面版** → 登入同一帳號 → 開啟 Cowork。
2. **連接資料夾**：指向新電腦的 `~/Projects/article-video`。
3. **重新安裝 `ai-newsletter` plugin / skill**（Cowork 的 plugin 不會隨 git 過去）。
4. **記憶**：選題策略、驗證閘門等 Cowork 記憶存在 App Support，
   只有走「方案一 Migration Assistant」才會自動帶過去；方案二需在新機重新建立
   （或請 Claude 依本 repo 的 `SKILL.md` / `docs/` 重新記錄）。

---

## 移轉後健檢

```bash
# 確認集數齊全
ls -d ai-knowledge-2026-* | wc -l

# 驗證閘門可跑
python3 scripts/verify_content.py --root . --date 2026-05-29 --audit

# Remotion 可啟動
npm run dev
```
