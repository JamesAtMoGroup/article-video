#!/usr/bin/env bash
# ============================================================================
# setup_trello_launchd.sh — 在「你的 Mac 本機」設定每日自動推送 Trello（launchd）
#
# 為什麼用 launchd 而不是 Cowork 排程：
#   Cowork 的指令跑在網路白名單沙箱，連不到 api.trello.com（403）。
#   launchd 是 macOS 原生排程，用你 Mac 的網路、連 Claude 沒開也會跑，最可靠。
#
# 這支會：
#   1. 產生 ~/Library/LaunchAgents/com.aischool.trello-daily.plist
#   2. 設定每天 07:00 執行 push_to_trello.py（--root 指向本 repo）
#   3. 載入排程；log 寫到 <repo>/.logs/launchd-trello.{out,err}.log
#
# 用法（在你 Mac 終端機）：
#   cd ~/Projects/article-video
#   bash scripts/setup_trello_launchd.sh            # 安裝/更新（預設 03:00）
#   bash scripts/setup_trello_launchd.sh --hour 8   # 改成 08:00
#   bash scripts/setup_trello_launchd.sh --uninstall # 移除排程
# ============================================================================

set -euo pipefail

LABEL="com.aischool.trello-daily"
HOUR=3          # 預設 03:00：在 Cowork 02:00 產文之後，留 1 小時 buffer
MIN=0
UNINSTALL=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --hour) HOUR="$2"; shift 2 ;;
    --min) MIN="$2"; shift 2 ;;
    --uninstall) UNINSTALL=1; shift ;;
    -h|--help) echo "用法: $0 [--hour H] [--min M] [--uninstall]"; exit 0 ;;
    *) echo "未知選項：$1" >&2; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [[ "$(uname)" != "Darwin" ]]; then
  echo "此腳本僅適用於 macOS（launchd）。" >&2
  exit 2
fi

# --- 移除 -------------------------------------------------------------------
if [[ $UNINSTALL -eq 1 ]]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "已移除排程 $LABEL"
  exit 0
fi

# --- 前置檢查 ---------------------------------------------------------------
PY="$(command -v python3 || true)"
if [[ -z "$PY" ]]; then
  echo "找不到 python3，請先安裝。" >&2
  exit 2
fi
if [[ ! -f "$REPO_ROOT/scripts/push_to_trello.py" ]]; then
  echo "找不到 push_to_trello.py，請在 repo 根目錄執行。" >&2
  exit 2
fi
if [[ ! -f "$REPO_ROOT/.trello.local" ]]; then
  echo "⚠️  尚未建立 .trello.local（TRELLO_KEY/TOKEN）。排程仍會安裝，但要等你填好憑證才會成功。" >&2
fi

mkdir -p "$REPO_ROOT/.logs"
mkdir -p "$HOME/Library/LaunchAgents"

# --- 寫 plist ---------------------------------------------------------------
cat > "$PLIST" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>$PY</string>
        <string>$REPO_ROOT/scripts/push_to_trello.py</string>
        <string>--root</string>
        <string>$REPO_ROOT</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$REPO_ROOT</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>$HOUR</integer>
        <key>Minute</key>
        <integer>$MIN</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$REPO_ROOT/.logs/launchd-trello.out.log</string>
    <key>StandardErrorPath</key>
    <string>$REPO_ROOT/.logs/launchd-trello.err.log</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
PLISTEOF

# --- 載入（先 unload 再 load，確保更新生效）--------------------------------
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

printf '%02d:%02d' "$HOUR" "$MIN" > /dev/null
echo "✅ 已安裝每日排程 ${LABEL}（每天 $(printf '%02d:%02d' "$HOUR" "$MIN") 執行）"
echo "   plist: $PLIST"
echo "   log  : $REPO_ROOT/.logs/launchd-trello.{out,err}.log"
echo
echo "立即測試一次（手動觸發）："
echo "   launchctl start $LABEL"
echo "   tail -n 20 $REPO_ROOT/.logs/launchd-trello.err.log"
