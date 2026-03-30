#!/bin/bash
# qa_and_wait.sh — Run QA checks, send iMessage report, wait for approval
#
# Usage:
#   ./scripts/qa_and_wait.sh <YYYY-MM-DD>   e.g. 2026-03-30
#
# Exit codes:
#   0 = approved (通過)
#   1 = timeout
#   2 = rejected

set -e

DATE="${1:?Usage: $0 <YYYY-MM-DD>  e.g. 2026-03-30}"
PROJECT="/Users/jamesshih/Projects/article-video"
FLAG_FILE="/tmp/qa_approved_article_${DATE//-/_}"
SEND="$HOME/.claude/scripts/imessage_send.sh"
WAIT="$HOME/.claude/scripts/imessage_wait_approval.sh"

echo "=== QA Check: article-video ${DATE} ==="

PASS=0
FAIL=0
REPORT=""

check() {
  local label="$1"
  local result="$2"
  if [ "$result" = "ok" ]; then
    REPORT+="  ✅ ${label}\n"
    PASS=$((PASS+1))
  else
    REPORT+="  ❌ ${label}: ${result}\n"
    FAIL=$((FAIL+1))
  fi
}

# --- Script/article MD ---
SCRIPT_MD="${PROJECT}/ai-knowledge-${DATE}/ai-knowledge-${DATE}_script.md"
[ -f "$SCRIPT_MD" ] && check "講稿 MD" "ok" || check "講稿 MD" "找不到 ${SCRIPT_MD}"

# --- Processed audio ---
PROCESSED_AUDIO="${PROJECT}/public/audio/ai-knowledge-${DATE}-processed.wav"
[ -f "$PROCESSED_AUDIO" ] && check "處理後音檔" "ok" || check "處理後音檔" "找不到 processed WAV"

# --- VTT ---
VTT="${PROJECT}/ai-knowledge-${DATE}/ai-knowledge-${DATE}.vtt"
[ -f "$VTT" ] && check "字幕 VTT" "ok" || check "字幕 VTT" "找不到 VTT"

# --- TSX Composition ---
DATE_UNDER="${DATE//-/_}"
TSX=$(ls "${PROJECT}/src/VideoComposition_${DATE_UNDER}.tsx" 2>/dev/null | head -1)
[ -n "$TSX" ] && check "VideoComposition TSX" "ok" || check "VideoComposition TSX" "找不到 src/VideoComposition_${DATE_UNDER}.tsx"

# --- Output MP4 ---
OUT_MP4="${PROJECT}/out/${DATE}/${DATE}.mp4"
if [ -f "$OUT_MP4" ]; then
  SIZE=$(du -sh "$OUT_MP4" | cut -f1)
  check "Output MP4 (${SIZE})" "ok"
else
  check "Output MP4" "尚未 render"
fi

# --- Summary ---
TOTAL=$((PASS+FAIL))
echo -e "$REPORT"
echo "QA 結果: ${PASS}/${TOTAL} 通過"

MSG="📰 article-video ${DATE} QA Report

$(echo -e "$REPORT")
結果：${PASS}/${TOTAL} 通過

請回覆「通過」開始 render，或「不通過」中止"

# Remove old flag
rm -f "$FLAG_FILE"

# Send iMessage
"$SEND" "$MSG"
echo ""
echo "📱 iMessage QA 報告已發送"
echo "⏳ 等待審核中... (iMessage 或對話中回覆「通過」)"
echo ""
echo "FLAG_FILE=${FLAG_FILE}"
echo "DATE=${DATE}"

# Background polling — writes flag file on approval
(
  "$WAIT" 3600
  if [ $? -eq 0 ]; then
    touch "$FLAG_FILE"
    echo "[QA polling] 通過 → ${FLAG_FILE}"
  fi
) &

POLL_PID=$!
echo "POLL_PID=${POLL_PID}"
echo ""
echo "--- 等待 James 確認 ---"
echo "在對話中說「通過」或用 iMessage 回覆，即可開始 render"

# Wait for flag (set by background polling) or manual trigger
while true; do
  if [ -f "$FLAG_FILE" ]; then
    echo "✅ iMessage 通過 → 開始 render"
    kill $POLL_PID 2>/dev/null
    exit 0
  fi
  sleep 5
done
