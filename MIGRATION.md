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

### 方案二：手動搬（只換專案，不搬整機）

**舊電腦：**

```bash
cd ~/Projects/article-video
# 1) 確認程式碼/設定已上 GitHub
git add -A && git commit -m "pre-migration snapshot" && git push

# 2) 備份所有 gitignored 內容資產到外接硬碟（或雲端同步資料夾）
scripts/backup_content.sh /Volumes/你的外接碟/article-video-backup --tar
```

**新電腦：**

```bash
# 3) 取回程式碼
cd ~/Projects
git clone https://github.com/JamesAtMoGroup/article-video.git
cd article-video

# 4) 還原內容資產（把備份的 article-video-content/ 內容貼回 repo 根）
rsync -a /Volumes/你的外接碟/article-video-backup/article-video-content/ ./

# 5) 重建相依套件（node_modules 不需搬，2.8G）
npm install

# 6) 驗證還原完整性
cd /Volumes/你的外接碟/article-video-backup/article-video-content
shasum -a 256 -c SHA256SUMS-*.txt
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
