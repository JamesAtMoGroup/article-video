#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
verify_content.py — 每日 AI 知識庫 內容驗證閘門 (Verification Gate)

職責
----
在「文章 + 逐字稿」寫入正式資料夾前，強制執行兩層驗證：

  L1 結構驗證 (Structural Lint) — 全自動
      標題規範、禁用字、禁止來源區塊、頁尾格式、逐字稿開場/結尾、
      與歷史文章標題去重 (零污染：避免重複主題)。

  L2 事實查證 (Factual Verification) — 由 Agent 用 WebSearch 填入 _claims.json，
      本腳本負責「校驗 ledger 完整性 + gate」：
        - 每條宣稱必須有 verdict / confidence / (verified 必須有 sources)
        - 任一 verdict == refuted  -> 直接 FAIL (污染)
        - verified 宣稱數 < 門檻    -> FAIL
        - schema 不完整            -> FAIL

設計準則
--------
  * 歷史先驗證：寫入前掃描既有 ai-knowledge-* 標題、檢查同日資料夾是否已存在。
  * Isolation / dry-run：預設只驗證、不寫入正式檔案。--promote 才搬移，且先 backup。
  * Rollback：任何被覆蓋的正式檔案，先複製到 <official>/.backup/<timestamp>/。
  * Logging：同時輸出 stdout 與 <root>/.logs/verify-<date>-<ts>.log。
  * 無硬編碼金鑰、無外部網路；WebSearch 由上游 Agent 執行後寫入 ledger。
  * 退出碼：0 = 通過；1 = 驗證失敗 (FAIL)；2 = 執行/參數錯誤。

用法
----
  # 驗證 staging 候選檔（不寫入正式）
  python3 verify_content.py --root mnt/article-video --date 2026-06-05 \
      --staging mnt/article-video/.staging/2026-06-05 --mode auto

  # 通過後搬入正式資料夾（含 backup）
  python3 verify_content.py --root mnt/article-video --date 2026-06-05 \
      --staging mnt/article-video/.staging/2026-06-05 --mode auto --promote

  # 重新稽核既有正式資料夾（in-place 驗證，不搬移）
  python3 verify_content.py --root mnt/article-video --date 2026-05-29 --audit
"""

import argparse
import datetime as dt
import json
import logging
import os
import re
import shutil
import sys
import unicodedata

# ----------------------------------------------------------------------------
# 常數
# ----------------------------------------------------------------------------

ARTICLE_FMT = "ai-knowledge-{date}.md"
SCRIPT_FMT = "ai-knowledge-{date}_script.md"
CLAIMS_FMT = "_claims.json"
VERIFY_FMT = "_verify.json"
FOLDER_FMT = "ai-knowledge-{date}"

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# 禁用詞（出現在正文即視為違規）
BANNED_WORDS = ["學生", "給學生", "目標讀者"]

# 禁止的「來源引用區塊」標題 / 粗體標籤
BANNED_SECTION_RE = re.compile(
    r"^\s{0,3}(#{1,6}\s*|>?\s*\*\*\s*)?(資料來源|參考資料|參考來源|延伸閱讀|Sources?|References?)\b",
    re.IGNORECASE,
)

# 頁尾核心字串（日期可有可無，缺日期僅 WARN）
FOOTER_CORE_RE = re.compile(r"每日 AI 知識庫.*AI 未來學院")
FOOTER_DATED_RE = re.compile(r"每日 AI 知識庫\s*·\s*(\d{4}-\d{2}-\d{2})\s*·\s*AI 未來學院")

# 逐字稿規範
SCRIPT_FIRSTLINE_RE = re.compile(r"^#\s*逐字稿\s*—")
SCRIPT_OPEN = "歡迎來到每日 AI 知識庫"
SCRIPT_CLOSE_SIGN = "播報員"
SCRIPT_CLOSE_BYE = "掰掰"
SCRIPT_RECAP_HINTS = ["重點整理", "快速回顧", "回顧這", "三件大事", "今日重點"]

# 標題不得含日期
TITLE_DATE_RE = re.compile(r"\d{4}|\d+\s*月|\d+\s*年|\d+\s*日")

# 時事型偵測關鍵字（用於 mode=auto）
NEWS_HINTS = ["本週 AI 大事", "本週 AI", "這週", "本週最", "AI 大事"]

ALLOWED_VERDICTS = {"verified", "refuted", "unverifiable"}

DEFAULT_MIN_VERIFIED = {"news": 2, "concept": 1}


# ----------------------------------------------------------------------------
# 結果容器
# ----------------------------------------------------------------------------

class Report:
    def __init__(self):
        self.errors = []    # gate-blocking
        self.warnings = []  # 記錄但不擋
        self.info = {}

    def err(self, code, msg):
        self.errors.append({"code": code, "msg": msg})

    def warn(self, code, msg):
        self.warnings.append({"code": code, "msg": msg})

    @property
    def passed(self):
        return len(self.errors) == 0

    def as_dict(self, meta):
        return {
            "result": "PASS" if self.passed else "FAIL",
            "checked_at": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
            "meta": meta,
            "errors": self.errors,
            "warnings": self.warnings,
            "info": self.info,
        }


# ----------------------------------------------------------------------------
# 工具函式
# ----------------------------------------------------------------------------

def setup_logging(root, date):
    log_dir = os.path.join(root, ".logs")
    os.makedirs(log_dir, exist_ok=True)
    ts = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    log_path = os.path.join(log_dir, "verify-{}-{}.log".format(date, ts))
    logger = logging.getLogger("verify")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    logger.addHandler(sh)
    fh = logging.FileHandler(log_path, encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    logger.info("log file: %s", log_path)
    return logger, log_path


def read_text(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def normalize_title(s):
    """正規化標題以利去重：去全形空白、標點、emoji-ish 符號、轉小寫。"""
    s = unicodedata.normalize("NFKC", s)
    s = s.replace("　", " ")
    s = re.sub(r"[#>*`\s]", "", s)
    s = re.sub(r"[，,。.！!？?：:、—\-_~（）()\[\]【】「」『』\"'’“”]", "", s)
    return s.strip().lower()


def extract_title(md_text):
    """取第一個 ATX H1 ('# ...') 作為文章大標題。"""
    for line in md_text.splitlines():
        if re.match(r"^#\s+\S", line):
            return line.lstrip("#").strip()
    return None


def detect_mode(article_text):
    title = extract_title(article_text) or ""
    head = "\n".join(article_text.splitlines()[:6])
    blob = title + "\n" + head
    for h in NEWS_HINTS:
        if h in blob:
            return "news"
    return "concept"


# ----------------------------------------------------------------------------
# L1 結構驗證
# ----------------------------------------------------------------------------

def lint_article(article_text, date, mode, strict, rep, logger):
    title = extract_title(article_text)
    if not title:
        rep.err("ART_NO_TITLE", "文章找不到 H1 大標題 (# ...)")
        return
    rep.info["title"] = title
    logger.info("article title: %s", title)

    if TITLE_DATE_RE.search(title):
        rep.err("ART_TITLE_DATE", "標題不得含日期/年份/月份：'{}'".format(title))

    lines = article_text.splitlines()
    for i, line in enumerate(lines, 1):
        if BANNED_SECTION_RE.match(line):
            rep.err("ART_BANNED_SECTION",
                    "禁止來源引用/延伸閱讀區塊 (line {}): '{}'".format(i, line.strip()))
    for w in BANNED_WORDS:
        if w in article_text:
            rep.err("ART_BANNED_WORD", "出現禁用詞：'{}'".format(w))

    # 頁尾
    if not FOOTER_CORE_RE.search(article_text):
        rep.err("ART_NO_FOOTER", "文章缺少頁尾『每日 AI 知識庫 … AI 未來學院』")
    else:
        m = FOOTER_DATED_RE.search(article_text)
        if not m:
            (rep.err if strict else rep.warn)(
                "ART_FOOTER_NODATE",
                "頁尾未含日期，建議格式『每日 AI 知識庫 · {} · AI 未來學院』".format(date))
        elif m.group(1) != date:
            rep.err("ART_FOOTER_DATE_MISMATCH",
                    "頁尾日期 {} 與目標日期 {} 不符".format(m.group(1), date))

    # 必要結構
    for must, code in [("今日速覽", "ART_NO_OVERVIEW"),
                       ("今日重點整理", "ART_NO_RECAP")]:
        if must not in article_text:
            (rep.err if strict else rep.warn)(code, "文章缺少『{}』段落".format(must))


def lint_script(script_text, rep, strict, logger):
    first = ""
    for line in script_text.splitlines():
        if line.strip():
            first = line.strip()
            break
    if not SCRIPT_FIRSTLINE_RE.match(first):
        (rep.err if strict else rep.warn)(
            "SCR_FIRSTLINE",
            "逐字稿第一行應為『# 逐字稿 — [大標題]』，實際：'{}'".format(first[:60]))

    if SCRIPT_OPEN not in script_text:
        rep.err("SCR_NO_OPEN", "逐字稿缺少開場白『…歡迎來到每日 AI 知識庫』")
    if SCRIPT_CLOSE_SIGN not in script_text or SCRIPT_CLOSE_BYE not in script_text:
        rep.err("SCR_NO_CLOSE", "逐字稿缺少結尾署名『…播報員。掰掰！』")
    if not any(h in script_text for h in SCRIPT_RECAP_HINTS):
        (rep.err if strict else rep.warn)(
            "SCR_NO_RECAP", "逐字稿結尾缺少重點整理口播段")


def check_history_dup(root, date, title, mode, rep, logger):
    """掃描既有 ai-knowledge-* 標題，concept 型重複 -> FAIL，news 型 -> WARN。"""
    if not title:
        return
    target_norm = normalize_title(title)
    dups = []
    for name in sorted(os.listdir(root)):
        if not name.startswith("ai-knowledge-"):
            continue
        other_date = name.replace("ai-knowledge-", "").replace(".md", "")
        if other_date == date:
            continue
        md_path = None
        full = os.path.join(root, name)
        if os.path.isdir(full):
            cand = os.path.join(full, "ai-knowledge-{}.md".format(other_date))
            if os.path.isfile(cand):
                md_path = cand
        elif name.endswith(".md"):
            md_path = full
        if not md_path:
            continue
        try:
            t = extract_title(read_text(md_path))
        except OSError:
            continue
        if t and normalize_title(t) == target_norm:
            dups.append((other_date, t))
    rep.info["history_scanned"] = True
    if dups:
        detail = "; ".join("{}::{}".format(d, t) for d, t in dups)
        if mode == "concept":
            rep.err("DUP_TITLE", "標題與既有文章重複：{}".format(detail))
        else:
            rep.warn("DUP_TITLE_NEWS", "標題與既有文章相近（時事型容忍）：{}".format(detail))
        logger.info("duplicate check: %s", detail)
    else:
        logger.info("duplicate check: no collision")


# ----------------------------------------------------------------------------
# L2 事實查證 ledger 校驗
# ----------------------------------------------------------------------------

def verify_claims(claims_path, mode, min_verified, rep, logger):
    if not os.path.isfile(claims_path):
        rep.err("CLAIMS_MISSING",
                "缺少事實宣稱 ledger：{}（Agent 必須先 WebSearch 並填寫）".format(
                    os.path.basename(claims_path)))
        return
    try:
        data = json.loads(read_text(claims_path))
    except (OSError, ValueError) as e:
        rep.err("CLAIMS_BAD_JSON", "ledger 無法解析：{}".format(e))
        return

    claims = data.get("claims")
    if not isinstance(claims, list) or not claims:
        rep.err("CLAIMS_EMPTY", "ledger 的 claims 為空；至少需 1 條可查證宣稱")
        return

    verified = refuted = unverifiable = 0
    for idx, c in enumerate(claims, 1):
        cid = c.get("id", "c{}".format(idx))
        if not c.get("claim"):
            rep.err("CLAIM_NO_TEXT", "{}：缺少 claim 文字".format(cid))
            continue
        verdict = c.get("verdict")
        if verdict not in ALLOWED_VERDICTS:
            rep.err("CLAIM_BAD_VERDICT",
                    "{}：verdict 必須為 {}，實際 '{}'".format(cid, ALLOWED_VERDICTS, verdict))
            continue
        conf = c.get("confidence")
        if not isinstance(conf, (int, float)) or not (0.0 <= float(conf) <= 1.0):
            rep.err("CLAIM_BAD_CONF", "{}：confidence 必須為 0..1 數值".format(cid))
        if verdict == "verified":
            srcs = c.get("sources")
            if not isinstance(srcs, list) or not any(
                    isinstance(u, str) and u.startswith("http") for u in (srcs or [])):
                rep.err("CLAIM_NO_SOURCE", "{}：verified 宣稱必須附至少一個 http 來源".format(cid))
            verified += 1
        elif verdict == "refuted":
            refuted += 1
            rep.err("CLAIM_REFUTED",
                    "{}：宣稱被推翻（污染來源）→ '{}'".format(cid, c.get("claim")[:60]))
        else:
            unverifiable += 1

    rep.info["claims"] = {
        "total": len(claims), "verified": verified,
        "refuted": refuted, "unverifiable": unverifiable,
    }
    logger.info("claims: total=%d verified=%d refuted=%d unverifiable=%d",
                len(claims), verified, refuted, unverifiable)

    need = min_verified if min_verified is not None else DEFAULT_MIN_VERIFIED.get(mode, 1)
    if verified < need:
        rep.err("CLAIMS_TOO_FEW",
                "verified 宣稱數 {} < 門檻 {}（mode={}）".format(verified, need, mode))


# ----------------------------------------------------------------------------
# Promote (backup + 搬移)
# ----------------------------------------------------------------------------

def promote(staging_dir, official_dir, date, logger):
    os.makedirs(official_dir, exist_ok=True)
    ts = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir = os.path.join(official_dir, ".backup", ts)
    moved, backed = [], []
    for fname in sorted(os.listdir(staging_dir)):
        src = os.path.join(staging_dir, fname)
        if not os.path.isfile(src):
            continue
        dst = os.path.join(official_dir, fname)
        if os.path.isfile(dst):
            os.makedirs(backup_dir, exist_ok=True)
            shutil.copy2(dst, os.path.join(backup_dir, fname))
            backed.append(fname)
        shutil.copy2(src, dst)
        moved.append(fname)
    logger.info("promoted %d file(s) -> %s", len(moved), official_dir)
    if backed:
        logger.info("backup of %d overwritten file(s) -> %s", len(backed), backup_dir)
    return {"moved": moved, "backed_up": backed,
            "backup_dir": backup_dir if backed else None}


# ----------------------------------------------------------------------------
# 主流程
# ----------------------------------------------------------------------------

def run(args):
    if not DATE_RE.match(args.date):
        print("date 必須為 YYYY-MM-DD", file=sys.stderr)
        return 2
    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        print("root 不存在：{}".format(root), file=sys.stderr)
        return 2

    logger, log_path = setup_logging(root, args.date)
    logger.info("=== verify_content start | date=%s mode=%s strict=%s ===",
                args.date, args.mode, args.strict)

    official_dir = os.path.join(root, FOLDER_FMT.format(date=args.date))
    if args.audit:
        src_dir = official_dir
    elif args.staging:
        src_dir = os.path.abspath(args.staging)
    else:
        src_dir = official_dir

    if not os.path.isdir(src_dir):
        logger.error("來源資料夾不存在：%s", src_dir)
        return 2

    article_path = os.path.join(src_dir, ARTICLE_FMT.format(date=args.date))
    script_path = os.path.join(src_dir, SCRIPT_FMT.format(date=args.date))
    claims_path = os.path.join(src_dir, CLAIMS_FMT)

    rep = Report()
    rep.info["source_dir"] = src_dir
    rep.info["date"] = args.date

    if not os.path.isfile(article_path):
        rep.err("ART_FILE_MISSING", "找不到文章檔：{}".format(article_path))
    if not os.path.isfile(script_path):
        rep.err("SCR_FILE_MISSING", "找不到逐字稿檔：{}".format(script_path))

    article_text = read_text(article_path) if os.path.isfile(article_path) else ""
    script_text = read_text(script_path) if os.path.isfile(script_path) else ""

    mode = args.mode
    if mode == "auto":
        mode = detect_mode(article_text) if article_text else "concept"
    rep.info["mode"] = mode
    logger.info("resolved mode: %s", mode)

    if article_text:
        lint_article(article_text, args.date, mode, args.strict, rep, logger)
        check_history_dup(root, args.date, extract_title(article_text), mode, rep, logger)
    if script_text:
        lint_script(script_text, rep, args.strict, logger)

    verify_claims(claims_path, mode, args.min_verified, rep, logger)

    # 寫 _verify.json 報告（永遠寫，無論 pass/fail；isolation：寫在 src_dir）
    meta = {
        "date": args.date, "mode": mode, "strict": args.strict,
        "source_dir": src_dir, "log": log_path,
        "min_verified": args.min_verified
        if args.min_verified is not None else DEFAULT_MIN_VERIFIED.get(mode, 1),
    }
    verify_out = os.path.join(src_dir, VERIFY_FMT)
    report_dict = rep.as_dict(meta)
    try:
        with open(verify_out, "w", encoding="utf-8") as f:
            json.dump(report_dict, f, ensure_ascii=False, indent=2)
        logger.info("report written: %s", verify_out)
    except OSError as e:
        logger.error("無法寫入報告：%s", e)
        return 2

    # 摘要
    logger.info("--- ERRORS (%d) ---", len(rep.errors))
    for e in rep.errors:
        logger.info("  [%s] %s", e["code"], e["msg"])
    logger.info("--- WARNINGS (%d) ---", len(rep.warnings))
    for w in rep.warnings:
        logger.info("  [%s] %s", w["code"], w["msg"])

    if not rep.passed:
        logger.error("RESULT: FAIL — 禁止寫入正式資料 / 禁止進入 Part B")
        return 1

    logger.info("RESULT: PASS")

    if args.promote:
        if args.audit or not args.staging:
            logger.warning("--promote 需搭配 --staging（且非 --audit），略過搬移")
        else:
            info = promote(src_dir, official_dir, args.date, logger)
            # 把 promote 後的最終報告也放一份到正式資料夾
            report_dict["promote"] = info
            with open(os.path.join(official_dir, VERIFY_FMT), "w", encoding="utf-8") as f:
                json.dump(report_dict, f, ensure_ascii=False, indent=2)
            logger.info("promote done.")

    logger.info("=== verify_content end ===")
    return 0


def build_parser():
    p = argparse.ArgumentParser(
        description="每日 AI 知識庫 內容驗證閘門 (L1 結構 + L2 事實查證)")
    p.add_argument("--root", required=True, help="article-video 根目錄")
    p.add_argument("--date", required=True, help="目標日期 YYYY-MM-DD")
    p.add_argument("--mode", default="auto", choices=["auto", "news", "concept"],
                   help="內容類型；auto 由標題自動判斷")
    p.add_argument("--staging", default=None,
                   help="候選檔資料夾（isolation）；省略則驗證正式資料夾")
    p.add_argument("--audit", action="store_true",
                   help="重新稽核既有正式資料夾（in-place，不搬移）")
    p.add_argument("--promote", action="store_true",
                   help="驗證通過後將 staging 搬入正式資料夾（含 backup）")
    p.add_argument("--strict", action="store_true",
                   help="把部分 WARNING 升級為 ERROR（逐字稿首行/頁尾日期/必要段落）")
    p.add_argument("--min-verified", type=int, default=None,
                   help="verified 宣稱最低數；省略則 news=2 / concept=1")
    return p


def main():
    args = build_parser().parse_args()
    try:
        return run(args)
    except Exception as e:  # noqa: BLE001 — 最外層保護，確保非零退出與日誌
        logging.getLogger("verify").exception("未預期錯誤：%s", e)
        return 2


if __name__ == "__main__":
    sys.exit(main())
