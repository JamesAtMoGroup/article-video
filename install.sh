#!/usr/bin/env bash
# ============================================================================
# install.sh — 新電腦一鍵安裝（解壓資料包後，在資料夾裡執行這支就好）
#
# 它會自動：
#   1. 用 npm 重建相依套件（node_modules，因平台而異，不隨包帶）
#   2.（若有）重建 x-mcp 的 Python 虛擬環境
#   3. 做基本健檢（集數、驗證腳本）
#   4. 印出最後一步：在 Cowork 連接這個資料夾 + 安裝 Skill
#
# 用法：
#   tar -xzf article-video-full-XXXX.tar.gz      # 解壓資料包
#   cd article-video-full                        # 進入資料夾
#   ./install.sh                                 # 一鍵安裝
# ============================================================================

set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================"
echo "  每日 AI 知識庫 — 一鍵安裝"
echo "  位置：$(pwd)"
echo "============================================"

ok()   { echo "  ✅ $*"; }
warn() { echo "  ⚠️  $*"; }
step() { echo; echo "▶ $*"; }

# --- 1. node_modules ---------------------------------------------------------
step "1/4 安裝 Node 相依套件（npm install）"
if command -v npm >/dev/null 2>&1; then
  npm install
  ok "node_modules 完成"
else
  warn "找不到 npm。請先安裝 Node.js（https://nodejs.org），再重跑 ./install.sh"
fi

# --- 2. x-mcp venv -----------------------------------------------------------
step "2/4 重建 x-mcp Python 環境（若存在）"
if [[ -d "x-mcp" && -f "x-mcp/requirements.txt" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    python3 -m venv x-mcp/venv
    ./x-mcp/venv/bin/pip install --quiet --upgrade pip
    ./x-mcp/venv/bin/pip install --quiet -r x-mcp/requirements.txt
    ok "x-mcp venv 完成"
  else
    warn "找不到 python3，略過 x-mcp（非必要）"
  fi
else
  ok "無 x-mcp，略過"
fi

# --- 3. 健檢 -----------------------------------------------------------------
step "3/4 健檢"
EP=$(ls -d ai-knowledge-2026-* 2>/dev/null | grep -vi copy | wc -l | tr -d ' ')
ok "內容集數：$EP 集"
if command -v python3 >/dev/null 2>&1 && [[ -f scripts/verify_content.py ]]; then
  LATEST=$(ls -d ai-knowledge-2026-* 2>/dev/null | grep -vi copy | sort | tail -1 | sed 's#.*ai-knowledge-##')
  if [[ -n "${LATEST:-}" ]]; then
    python3 scripts/verify_content.py --root . --date "$LATEST" --audit >/dev/null 2>&1 \
      && ok "驗證腳本可執行（最新集 $LATEST）" \
      || warn "驗證腳本對 $LATEST 回報 FAIL（多半因該集尚無 _claims.json，屬正常）"
  fi
fi

# --- 4. 最後一步（Cowork，無法用腳本代勞）-----------------------------------
step "4/4 最後一步：Cowork（在 App 裡點，腳本做不了）"
cat <<'EOF'
  在新電腦上：
    1) 安裝並開啟 Claude 桌面版 → 登入同一帳號 → 開啟 Cowork
    2) 連接資料夾：指向「這個」article-video 資料夾
    3) 安裝 Skill：雙擊隨附的 ai-newsletter.skill（或在 Cowork 點 Save skill）

  完成後，跟 Claude 說「幫我做今天的 newsletter」即可。
EOF

echo
echo "============================================"
echo "  安裝完成 🎉"
echo "============================================"
