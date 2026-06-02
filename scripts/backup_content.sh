#!/usr/bin/env bash
# ============================================================================
# backup_content.sh — 備份「未進 git」的內容資產（每日 AI 知識庫）
#
# 背景：.gitignore 排除了 ai-knowledge-*/、public/audio/、out/ 與所有媒體檔，
#       這些資產只存在本機。換電腦 / 硬碟損毀前，用本腳本打包到外接或雲端。
#
# 特性：
#   * rsync 增量備份（可重複執行，只傳變更）
#   * 產出 manifest.txt（檔案清單）+ SHA256SUMS（完整性校驗）
#   * --tar 額外打包時間戳 tar.gz（離線封存用）
#   * --dry-run 預覽不寫入
#   * 完整 logging（stdout + <repo>/.logs/backup-<ts>.log）
#   * 嚴格錯誤處理（set -euo pipefail），失敗回傳非零碼
#   * 無硬編碼路徑/金鑰，來源 = 腳本所在 repo 根目錄
#
# 用法：
#   scripts/backup_content.sh /Volumes/MyDrive/article-video-backup
#   scripts/backup_content.sh ~/Backups/article-video --tar
#   scripts/backup_content.sh /tmp/dest --dry-run
# ============================================================================

set -euo pipefail

# ---- 解析參數 --------------------------------------------------------------
DEST=""
DO_TAR=0
DRY_RUN=0
DO_FULL=0

usage() {
  echo "用法: $0 <destination_dir> [--full] [--tar] [--dry-run]" >&2
  echo "  <destination_dir>  備份目的地（外接硬碟 / 雲端同步資料夾）" >&2
  echo "  --full             整包備份（整個資料夾，僅排除 node_modules）——換機推薦" >&2
  echo "  --tar              額外產出 tar.gz 封存檔" >&2
  echo "  --dry-run          僅預覽，不實際複製" >&2
  echo >&2
  echo "預設（不加 --full）：只備份 gitignored 內容資產（ai-knowledge-*/, public/audio/, out/）" >&2
  exit 2
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --full) DO_FULL=1; shift ;;
    --tar) DO_TAR=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage ;;
    -*) echo "未知選項：$1" >&2; usage ;;
    *) if [[ -z "$DEST" ]]; then DEST="$1"; else echo "多餘參數：$1" >&2; usage; fi; shift ;;
  esac
done

[[ -z "$DEST" ]] && usage

# ---- 定位 repo 根（腳本位於 <repo>/scripts/）------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# ---- 前置檢查 --------------------------------------------------------------
command -v rsync >/dev/null 2>&1 || { echo "缺少 rsync，請先安裝" >&2; exit 2; }

TS="$(date +%Y%m%d-%H%M%S)"
LOG_DIR="$REPO_ROOT/.logs"
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/backup-$TS.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $*" | tee -a "$LOG"; }
err() { echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $*" | tee -a "$LOG" >&2; }

trap 'err "備份中止（第 $LINENO 行）"; exit 1' ERR

log "repo  = $REPO_ROOT"
log "dest  = $DEST"
log "full  = $DO_FULL   tar = $DO_TAR   dry-run = $DRY_RUN"

# ---- --full：整包備份（換機用，含未 commit 程式碼與 git 歷史）-------------
if [[ $DO_FULL -eq 1 ]]; then
  FULL_DIR="$DEST/article-video-full"
  log "=== FULL 模式：整包備份（排除 node_modules）==="
  mkdir -p "$FULL_DIR"
  FOPTS=(-a --delete --human-readable --stats
         --exclude 'node_modules/' --exclude '.DS_Store')
  [[ $DRY_RUN -eq 1 ]] && FOPTS+=(--dry-run)
  rsync "${FOPTS[@]}" "$REPO_ROOT/" "$FULL_DIR/" 2>&1 | tee -a "$LOG"
  if [[ $DRY_RUN -eq 0 ]]; then
    SIZE="$(du -sh "$FULL_DIR" | cut -f1)"
    log "整包大小（不含 node_modules）：$SIZE"
    if [[ $DO_TAR -eq 1 ]]; then
      TARBALL="$DEST/article-video-full-$TS.tar.gz"
      log "打包 tar.gz → $TARBALL"
      tar -czf "$TARBALL" -C "$FULL_DIR" . 2>&1 | tee -a "$LOG"
      log "tar 完成：$(du -sh "$TARBALL" | cut -f1)"
    fi
  fi
  log "=== FULL 備份完成 ==="
  echo
  echo "完成。新電腦還原方式："
  echo "  1) rsync -a \"$FULL_DIR/\" ~/Projects/article-video/"
  echo "  2) cd ~/Projects/article-video && npm install"
  echo "日誌：$LOG"
  exit 0
fi

# ---- 要備份的內容資產（皆為 gitignore，git 沒有）--------------------------
# 只列存在的項目，避免 rsync 對缺漏路徑報錯
CANDIDATES=(
  "public/audio"
  "out"
  "ai-newsletter-schedule-2026.tsv"
)
# 所有 ai-knowledge-* 資料夾
while IFS= read -r d; do CANDIDATES+=("$d"); done < <(find . -maxdepth 1 -type d -name 'ai-knowledge-*' -printf '%P\n' | sort)

SOURCES=()
for item in "${CANDIDATES[@]}"; do
  [[ -e "$REPO_ROOT/$item" ]] && SOURCES+=("$item")
done

if [[ ${#SOURCES[@]} -eq 0 ]]; then
  err "找不到任何內容資產可備份"
  exit 1
fi
log "將備份 ${#SOURCES[@]} 個項目"

# ---- 目的地 ----------------------------------------------------------------
DEST_DIR="$DEST/article-video-content"
RSYNC_OPTS=(-a --delete --human-readable --stats)
[[ $DRY_RUN -eq 1 ]] && RSYNC_OPTS+=(--dry-run)

# 目的地資料夾骨架一律建立（dry-run 也建空目錄，以便 rsync 正確預覽；不複製內容）
mkdir -p "$DEST_DIR"

# ---- 排除清單（保險：絕不複製這些）----------------------------------------
EXCLUDES=(--exclude 'node_modules/' --exclude '.git/' --exclude '*.pyc'
          --exclude '__pycache__/' --exclude '.venv/' --exclude 'venv/'
          --exclude '.DS_Store')

# ---- 執行 rsync ------------------------------------------------------------
log "--- rsync 開始 ---"
for src in "${SOURCES[@]}"; do
  log "rsync: $src"
  if [[ -d "$REPO_ROOT/$src" ]]; then
    # 資料夾：保留結構，傳到 DEST_DIR/<src>/
    mkdir -p "$DEST_DIR/$src"
    rsync "${RSYNC_OPTS[@]}" "${EXCLUDES[@]}" "$REPO_ROOT/$src/" "$DEST_DIR/$src/" 2>&1 | tee -a "$LOG"
  else
    rsync "${RSYNC_OPTS[@]}" "${EXCLUDES[@]}" "$REPO_ROOT/$src" "$DEST_DIR/$src" 2>&1 | tee -a "$LOG"
  fi
done
log "--- rsync 完成 ---"

# ---- manifest + checksum ---------------------------------------------------
if [[ $DRY_RUN -eq 0 ]]; then
  MANIFEST="$DEST_DIR/manifest-$TS.txt"
  log "產出 manifest: $MANIFEST"
  ( cd "$DEST_DIR" && find . -type f ! -name 'manifest-*.txt' ! -name 'SHA256SUMS*' \
      | sort > "$MANIFEST" )
  COUNT="$(wc -l < "$MANIFEST" | tr -d ' ')"
  SIZE="$(du -sh "$DEST_DIR" | cut -f1)"
  log "備份檔案數=$COUNT 總大小=$SIZE"

  # SHA256（macOS 用 shasum，Linux 用 sha256sum）
  SUMFILE="$DEST_DIR/SHA256SUMS-$TS.txt"
  log "計算 SHA256 校驗碼 → $SUMFILE"
  if command -v shasum >/dev/null 2>&1; then
    ( cd "$DEST_DIR" && find . -type f ! -name 'manifest-*.txt' ! -name 'SHA256SUMS*' -print0 \
        | xargs -0 shasum -a 256 > "$SUMFILE" )
  elif command -v sha256sum >/dev/null 2>&1; then
    ( cd "$DEST_DIR" && find . -type f ! -name 'manifest-*.txt' ! -name 'SHA256SUMS*' -print0 \
        | xargs -0 sha256sum > "$SUMFILE" )
  else
    err "找不到 shasum / sha256sum，略過校驗碼"
  fi
fi

# ---- 選用 tar 封存 ---------------------------------------------------------
if [[ $DO_TAR -eq 1 && $DRY_RUN -eq 0 ]]; then
  TARBALL="$DEST/article-video-content-$TS.tar.gz"
  log "打包 tar.gz → $TARBALL"
  tar -czf "$TARBALL" -C "$DEST_DIR" . 2>&1 | tee -a "$LOG"
  log "tar 完成，大小：$(du -sh "$TARBALL" | cut -f1)"
fi

log "=== 備份完成 ==="
if [[ $DRY_RUN -eq 1 ]]; then
  log "（dry-run：以上為預覽，未實際寫入）"
fi
echo
echo "完成。日誌：$LOG"
echo "驗證還原完整性：cd \"$DEST_DIR\" && shasum -a 256 -c SHA256SUMS-$TS.txt"
