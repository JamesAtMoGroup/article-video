#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
push_to_trello.py — 把「每日 AI 知識庫」當天主題自動開成 Trello 待辦卡片

用途：每天（或產文後）在指定的 Trello List 建立一張卡片，內含：
  - 卡名 = 當天題目（取自 ai-newsletter-schedule-2026.tsv）
  - 描述 = 文章/逐字稿檔路徑 + 當天類型
  - Due  = 當天日期
  - Checklist = 製作流程（撰稿→驗證→錄音→字幕→Render→發布）
協作者只要看 Trello 就知道今天要處理什麼。

安全：絕不在程式碼或對話中硬編碼金鑰。憑證從以下來源讀取（擇一）：
  1) 環境變數 TRELLO_KEY / TRELLO_TOKEN / TRELLO_LIST_ID
  2) 本機檔 .trello.local（repo 根目錄，已被 .gitignore 排除）
       格式（每行 KEY=VALUE）：
         TRELLO_KEY=你的key
         TRELLO_TOKEN=你的token
         TRELLO_LIST_ID=目標清單ID
金鑰請在你自己的 Mac 上建立該檔，不要貼到聊天視窗。

去重（歷史先驗證準則）：建立前先抓該 List 既有卡片，若已有同名卡片則略過，不重複建立。

相依：僅用 Python 標準庫（urllib），免安裝額外套件。

退出碼：0 成功 / 跳過；1 失敗；2 設定或參數錯誤。

用法：
  python3 scripts/push_to_trello.py --root . --date 2026-06-05
  python3 scripts/push_to_trello.py --root . --dry-run          # 不呼叫 API，只預覽
  python3 scripts/push_to_trello.py --root . --check            # 只檢查憑證/設定
"""

import argparse
import csv
import datetime as dt
import json
import logging
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
import urllib.error

TRELLO_API = "https://api.trello.com/1"
SCHEDULE_FILE = "ai-newsletter-schedule-2026.tsv"
LOCAL_CRED_FILE = ".trello.local"
CONFIG_FILE = ".trello.config"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# (名稱, 推卡時是否已完成)。撰稿 + 內容驗證在推卡前必然已完成，預設打勾；
# 其餘為後續製作待辦。
CHECKLIST_ITEMS = [
    ("撰稿（文章 + 逐字稿）", True),
    ("內容驗證 PASS", True),
    ("影片製作", False),
    ("影片檢核", False),
    ("影片上傳", False),
    ("影片發佈", False),
]


# ----------------------------------------------------------------------------
# logging
# ----------------------------------------------------------------------------

def setup_logging(root, date):
    log_dir = os.path.join(root, ".logs")
    os.makedirs(log_dir, exist_ok=True)
    ts = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    log_path = os.path.join(log_dir, "trello-{}-{}.log".format(date, ts))
    logger = logging.getLogger("trello")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    logger.addHandler(sh)
    fh = logging.FileHandler(log_path, encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    return logger


# ----------------------------------------------------------------------------
# 憑證 / 設定
# ----------------------------------------------------------------------------

def _read_kv_file(path):
    out = {}
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip()
    return out


def load_credentials(root, logger):
    creds = {}
    # 非機密設定（看板/清單名）
    cfg_path = os.path.join(root, CONFIG_FILE)
    if os.path.isfile(cfg_path):
        logger.info("讀取設定檔：%s", CONFIG_FILE)
        creds.update(_read_kv_file(cfg_path))
    # 機密憑證
    local_path = os.path.join(root, LOCAL_CRED_FILE)
    if os.path.isfile(local_path):
        logger.info("讀取本機憑證檔：%s", LOCAL_CRED_FILE)
        creds.update(_read_kv_file(local_path))
    # 環境變數優先覆蓋
    for key in ("TRELLO_KEY", "TRELLO_TOKEN", "TRELLO_LIST_ID",
                "TRELLO_BOARD_NAME", "TRELLO_LIST_NAME"):
        if os.environ.get(key):
            creds[key] = os.environ[key]
    # 必要：KEY + TOKEN，且 (LIST_ID 或 BOARD_NAME+LIST_NAME) 擇一
    missing = [k for k in ("TRELLO_KEY", "TRELLO_TOKEN") if not creds.get(k)]
    if not creds.get("TRELLO_LIST_ID"):
        if not (creds.get("TRELLO_BOARD_NAME") and creds.get("TRELLO_LIST_NAME")):
            missing.append("TRELLO_LIST_ID 或 (TRELLO_BOARD_NAME+TRELLO_LIST_NAME)")
    return creds, missing


def resolve_list_id(creds, logger):
    """若未提供 LIST_ID，用看板名+清單名向 Trello 解析。"""
    if creds.get("TRELLO_LIST_ID"):
        return creds["TRELLO_LIST_ID"]
    board_name = creds.get("TRELLO_BOARD_NAME", "").strip()
    list_name = creds.get("TRELLO_LIST_NAME", "").strip()
    params = _auth(creds)
    params.update({"fields": "name", "lists": "open", "list_fields": "name"})
    boards = trello_get("/members/me/boards", params, logger)
    board = next((b for b in boards if b.get("name", "").strip() == board_name), None)
    if not board:
        names = ", ".join(b.get("name", "") for b in boards)
        raise ValueError("找不到看板「{}」。你的看板有：{}".format(board_name, names))
    lp = _auth(creds)
    lp.update({"fields": "name"})
    lists = trello_get("/boards/{}/lists".format(board["id"]), lp, logger)
    lst = next((l for l in lists if l.get("name", "").strip() == list_name), None)
    if not lst:
        names = ", ".join(l.get("name", "") for l in lists)
        raise ValueError("看板「{}」找不到清單「{}」。該看板清單有：{}".format(
            board_name, list_name, names))
    logger.info("解析清單成功：%s / %s → list_id=%s", board_name, list_name, lst["id"])
    return lst["id"]


# ----------------------------------------------------------------------------
# Google Drive 內容連結（協作者實際存取的地方）
# ----------------------------------------------------------------------------

def _find_rclone():
    """launchd 的 PATH 很精簡，這裡額外找常見安裝位置。"""
    p = shutil.which("rclone")
    if p:
        return p
    for cand in ("/opt/homebrew/bin/rclone", "/usr/local/bin/rclone", "/usr/bin/rclone"):
        if os.path.isfile(cand):
            return cand
    return None


def resolve_drive_link(creds, date, logger):
    """回傳 (當天子資料夾連結 or None, 母資料夾連結 or None)。

    用 rclone 在母資料夾底下找 ai-knowledge-{date} 子夾並深連；
    任何失敗都退回母資料夾連結，絕不讓建卡流程因 Drive 解析而失敗。
    """
    parent_id = creds.get("DRIVE_FOLDER_ID", "").strip()
    if not parent_id:
        return None, None
    parent_url = "https://drive.google.com/drive/folders/{}".format(parent_id)
    remote = (creds.get("DRIVE_REMOTE", "") or "gdrive").strip()
    rclone = _find_rclone()
    if not rclone:
        logger.warning("找不到 rclone，卡片改用 Drive 母資料夾連結")
        return None, parent_url
    sub_name = "ai-knowledge-{}".format(date)
    try:
        out = subprocess.run(
            [rclone, "lsjson", remote + ":",
             "--drive-root-folder-id", parent_id, "--dirs-only"],
            capture_output=True, text=True, timeout=60)
        if out.returncode != 0:
            logger.warning("rclone lsjson 失敗（rc=%s）：%s；改用母資料夾連結",
                           out.returncode, (out.stderr or "").strip()[:200])
            return None, parent_url
        dirs = json.loads(out.stdout or "[]")
        sub = next((d for d in dirs if d.get("Name") == sub_name), None)
        if sub and sub.get("ID"):
            url = "https://drive.google.com/drive/folders/{}".format(sub["ID"])
            logger.info("解析 Drive 當天資料夾：%s → %s", sub_name, url)
            return url, parent_url
        logger.info("Drive 尚無當天子夾「%s」，改用母資料夾連結", sub_name)
        return None, parent_url
    except (subprocess.TimeoutExpired, json.JSONDecodeError, OSError) as e:
        logger.warning("解析 Drive 連結失敗：%s；改用母資料夾連結", e)
        return None, parent_url


# ----------------------------------------------------------------------------
# 取得當天題目
# ----------------------------------------------------------------------------

def get_produced_title(root, date, logger):
    """優先採用「已產出文章」的主題標題，確保卡片與實際內容一致。"""
    f = os.path.join(root, "ai-knowledge-{0}".format(date),
                     "ai-knowledge-{0}.md".format(date))
    if not os.path.isfile(f):
        return None
    title_line = None
    h1 = None
    with open(f, "r", encoding="utf-8") as fh:
        for line in fh:
            m = re.search(r"主題\s*Title\**\s*[：:]\s*(.+?)\s*$", line)
            if m and title_line is None:
                title_line = m.group(1).strip()
            if h1 is None and re.match(r"^#\s+\S", line):
                h1 = line.lstrip("#").strip()
            if title_line:
                break
    chosen = title_line or h1
    if chosen:
        logger.info("採用已產出文章標題（%s）：%s", date, chosen)
    return chosen


def get_topic(root, date, logger):
    produced = get_produced_title(root, date, logger)
    if produced:
        return produced
    path = os.path.join(root, SCHEDULE_FILE)
    if not os.path.isfile(path):
        logger.warning("找不到排程檔 %s，改用泛用卡名", SCHEDULE_FILE)
        return None
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.reader(f, delimiter="\t")
        rows = list(reader)
    if not rows:
        return None
    hdr = rows[0]
    try:
        di = hdr.index("日期")
        ti = hdr.index("題目")
    except ValueError:
        logger.warning("排程檔欄位不符預期")
        return None
    for r in rows[1:]:
        if len(r) > ti and r[di] == date:
            return r[ti]
    return None


# ----------------------------------------------------------------------------
# Trello API（urllib）
# ----------------------------------------------------------------------------

def _auth(creds):
    return {"key": creds["TRELLO_KEY"], "token": creds["TRELLO_TOKEN"]}


def trello_get(path, params, logger):
    url = "{}{}?{}".format(TRELLO_API, path, urllib.parse.urlencode(params))
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def trello_post(path, params, logger):
    url = "{}{}".format(TRELLO_API, path)
    data = urllib.parse.urlencode(params).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def find_existing_card(creds, list_id, name, logger):
    params = _auth(creds)
    params.update({"fields": "name", "limit": "1000"})
    cards = trello_get("/lists/{}/cards".format(list_id), params, logger)
    for c in cards:
        if c.get("name", "").strip() == name.strip():
            return c.get("id")
    return None


def create_card(creds, list_id, name, desc, due, logger):
    params = _auth(creds)
    params.update({"idList": list_id, "name": name, "desc": desc, "due": due, "pos": "top"})
    member_id = creds.get("TRELLO_MEMBER_ID", "").strip()
    if member_id:
        params["idMembers"] = member_id
    return trello_post("/cards", params, logger)


def assign_member(creds, card_id, member_id, logger):
    """對既有卡片補指派負責人（已指派則 Trello 回 400，視為無害略過）。"""
    p = _auth(creds)
    p["value"] = member_id
    try:
        trello_post("/cards/{}/idMembers".format(card_id), p, logger)
        logger.info("已指派負責人（member_id=%s）", member_id)
    except urllib.error.HTTPError as e:
        if e.code == 400:
            logger.info("負責人已在卡片上，略過。")
        else:
            raise


def attach_url(creds, card_id, url, name, logger):
    params = _auth(creds)
    params.update({"url": url, "name": name})
    return trello_post("/cards/{}/attachments".format(card_id), params, logger)


def add_checklist(creds, card_id, items, logger):
    params = _auth(creds)
    params.update({"name": "製作流程"})
    chk = trello_post("/cards/{}/checklists".format(card_id), params, logger)
    chk_id = chk["id"]
    for name, done in items:
        p = _auth(creds)
        p.update({"name": name, "checked": "true" if done else "false"})
        trello_post("/checklists/{}/checkItems".format(chk_id), p, logger)
    return chk_id


# ----------------------------------------------------------------------------
# 主流程
# ----------------------------------------------------------------------------

def build_card_content(root, date, topic, drive_day_url=None, drive_parent_url=None):
    name = topic if topic else "每日 AI 知識庫 — {}".format(date)
    folder = "ai-knowledge-{}".format(date)
    weekday = dt.date.fromisoformat(date).strftime("%A")
    is_friday = dt.date.fromisoformat(date).weekday() == 4
    kind = "週五時事型" if is_friday else "一般觀念型"
    # 內容區塊：優先給協作者可直接存取的 Drive 連結，本機路徑只當備註。
    if drive_day_url:
        content = "📂 內容（Google Drive）：{}".format(drive_day_url)
    elif drive_parent_url:
        content = (
            "📂 內容（Google Drive 母資料夾）：{url}\n"
            "   當天資料夾：`{folder}/`（內容同步後會出現在母資料夾底下）"
        ).format(url=drive_parent_url, folder=folder)
    else:
        content = (
            "檔案（本機，協作者無法直接存取）：\n"
            "- 文章：`{folder}/ai-knowledge-{date}.md`\n"
            "- 逐字稿：`{folder}/ai-knowledge-{date}_script.md`"
        ).format(folder=folder, date=date)
    desc = (
        "**每日 AI 知識庫 — {date}（{wd}）**\n\n"
        "類型：{kind}\n\n"
        "{content}"
    ).format(date=date, wd=weekday, kind=kind, content=content)
    # Trello due 需 ISO8601；設當天 09:00 當地時間
    due = "{}T09:00:00.000Z".format(date)
    return name, desc, due


def run(args):
    if not DATE_RE.match(args.date):
        print("date 必須為 YYYY-MM-DD", file=sys.stderr)
        return 2
    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        print("root 不存在：{}".format(root), file=sys.stderr)
        return 2

    logger = setup_logging(root, args.date)
    logger.info("=== push_to_trello date=%s dry_run=%s ===", args.date, args.dry_run)

    creds, missing = load_credentials(root, logger)

    if args.check:
        if missing:
            logger.error("缺少設定：%s", ", ".join(missing))
            logger.error("請在 %s/%s 填入 TRELLO_KEY 與 TRELLO_TOKEN", root, LOCAL_CRED_FILE)
            return 2
        logger.info("KEY/TOKEN 齊全；嘗試解析目標清單…")
        try:
            list_id = resolve_list_id(creds, logger)
            logger.info("設定正確，目標 list_id=%s", list_id)
            return 0
        except (urllib.error.HTTPError, urllib.error.URLError, ValueError) as e:
            logger.error("清單解析失敗：%s", e)
            return 2

    topic = get_topic(root, args.date, logger)
    drive_day_url, drive_parent_url = resolve_drive_link(creds, args.date, logger)
    name, desc, due = build_card_content(
        root, args.date, topic, drive_day_url, drive_parent_url)
    logger.info("卡名：%s", name)
    logger.info("Due ：%s", due)

    if args.dry_run:
        logger.info("[dry-run] 將建立卡片，描述如下：\n%s", desc)
        logger.info("[dry-run] checklist：%s", " / ".join(
            "{}{}".format("✓" if d else "·", n) for n, d in CHECKLIST_ITEMS))
        logger.info("[dry-run] 未呼叫 Trello API。")
        return 0

    if missing:
        logger.error("缺少憑證/設定：%s。請先建立 %s 或設環境變數。",
                      ", ".join(missing), LOCAL_CRED_FILE)
        return 2

    try:
        list_id = resolve_list_id(creds, logger)
        existing = find_existing_card(creds, list_id, name, logger)
        if existing:
            logger.info("已存在同名卡片（id=%s），略過建立（去重）。", existing)
            member_id = creds.get("TRELLO_MEMBER_ID", "").strip()
            if member_id:
                assign_member(creds, existing, member_id, logger)
            return 0
        card = create_card(creds, list_id, name, desc, due, logger)
        card_id = card["id"]
        card_url = card.get("shortUrl", card.get("url", ""))
        logger.info("已建立卡片：%s", card_url)
        add_checklist(creds, card_id, CHECKLIST_ITEMS, logger)
        logger.info("已加入 checklist（%d 項）", len(CHECKLIST_ITEMS))
        attach_target = drive_day_url or drive_parent_url
        if attach_target:
            attach_url(creds, card_id, attach_target, "📂 Drive 內容資料夾", logger)
            logger.info("已附上 Drive 連結：%s", attach_target)
        logger.info("=== 完成 ===")
        return 0
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        logger.error("Trello API HTTP %s：%s", e.code, body[:300])
        return 1
    except urllib.error.URLError as e:
        logger.error("網路錯誤：%s", e)
        return 1
    except (KeyError, ValueError) as e:
        logger.error("回應解析錯誤：%s", e)
        return 1


def build_parser():
    p = argparse.ArgumentParser(description="把當天 AI 知識庫主題推到 Trello 待辦卡片")
    p.add_argument("--root", required=True, help="article-video 根目錄")
    p.add_argument("--date", default=dt.date.today().isoformat(),
                   help="目標日期 YYYY-MM-DD（預設今天）")
    p.add_argument("--dry-run", action="store_true", help="只預覽，不呼叫 Trello API")
    p.add_argument("--check", action="store_true", help="只檢查憑證/設定是否齊全")
    return p


def main():
    args = build_parser().parse_args()
    try:
        return run(args)
    except Exception as e:  # noqa: BLE001
        logging.getLogger("trello").exception("未預期錯誤：%s", e)
        return 1


if __name__ == "__main__":
    sys.exit(main())
