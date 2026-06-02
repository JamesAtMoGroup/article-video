# 內容驗證閘門 — verify_content.py

每日 AI 知識庫的「文章 + 逐字稿」在進入正式資料夾 / Part B 影片前，**必須**通過此閘門。

## 兩層驗證

**L1 結構（腳本全自動）**：標題規範、禁止日期入標、禁止來源/延伸閱讀區塊、禁用詞、頁尾格式、
逐字稿開場/結尾/首行、與歷史文章標題去重。

**L2 事實查證（Agent + 腳本）**：你（Agent）先用 WebSearch 逐條查證可驗證宣稱，寫進 `_claims.json`；
腳本負責 gate：任一 `refuted` → FAIL；`verified` 數不足門檻（news=2 / concept=1）→ FAIL；schema 不完整 → FAIL。

## SOP

```bash
# 1) 文章/逐字稿先寫到 staging（isolation）
mnt/article-video/.staging/YYYY-MM-DD/ai-knowledge-YYYY-MM-DD.md
mnt/article-video/.staging/YYYY-MM-DD/ai-knowledge-YYYY-MM-DD_script.md

# 2) WebSearch 查證 → 填 _claims.json（複製 scripts/_claims.template.json）
mnt/article-video/.staging/YYYY-MM-DD/_claims.json

# 3) dry-run 驗證（不搬移）
python3 scripts/verify_content.py --root mnt/article-video \
  --date YYYY-MM-DD --staging mnt/article-video/.staging/YYYY-MM-DD --mode auto

# 4) PASS 後 promote（自動 backup 被覆蓋檔）
python3 scripts/verify_content.py --root mnt/article-video \
  --date YYYY-MM-DD --staging mnt/article-video/.staging/YYYY-MM-DD --mode auto --promote
```

## 旗標

| 旗標 | 說明 |
|------|------|
| `--mode auto\|news\|concept` | 內容類型；auto 由標題判斷 |
| `--staging DIR` | 候選檔資料夾（isolation） |
| `--audit` | 重新稽核既有正式資料夾（in-place，不搬移） |
| `--promote` | 通過後搬入正式資料夾（含 backup） |
| `--strict` | 把逐字稿首行/頁尾日期/必要段落等 WARNING 升級為 ERROR |
| `--min-verified N` | 覆寫 verified 宣稱門檻 |

## 退出碼

- `0` PASS、`1` FAIL（禁止寫入）、`2` 執行/參數錯誤。

## 產物

- `<dir>/_verify.json` 驗證報告（result=PASS/FAIL、errors、warnings、info）
- `mnt/article-video/.logs/verify-<date>-<ts>.log` 日誌
- promote 時 `<official>/.backup/<ts>/` 保存被覆蓋檔（rollback 用）

## 批次稽核既有 39 集

```bash
for d in mnt/article-video/ai-knowledge-2026-*; do
  date=$(basename "$d" | sed 's/ai-knowledge-//')
  python3 scripts/verify_content.py --root mnt/article-video --date "$date" --audit || true
done
```
