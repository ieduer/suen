#!/usr/bin/env bash
set -euo pipefail

PY_BIN="${PYTHON_BIN:-}"
if [ -z "$PY_BIN" ]; then
  for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
      if "$candidate" - <<'PY' >/dev/null 2>&1
import sys
raise SystemExit(0 if sys.version_info >= (3, 8) else 1)
PY
      then
        PY_BIN="$candidate"
        break
      fi
    fi
  done
fi

if [ -z "$PY_BIN" ]; then
  cat >&2 <<'EOF'
[!] 需要 Python 3.8+ 才能运行 JKS 下载器。
    macOS: brew install python
    Debian/Ubuntu: sudo apt-get install -y python3 ca-certificates
EOF
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  cat >&2 <<'EOF'
[!] 需要 curl 才能访问 JKS API 和下载 PDF。
    macOS: brew install curl
    Debian/Ubuntu: sudo apt-get install -y curl ca-certificates
EOF
  exit 1
fi

exec "$PY_BIN" - "$@" <<'PY'
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path
from typing import Any

DEFAULT_API_BASE = "https://jks-ai.bdfz.net"
UA = "jks-public-downloader/2026.06 (+https://jks.bdfz.net)"

PHASE_ALIASES = {
    "1": "小学",
    "2": "初中",
    "3": "高中",
    "primary": "小学",
    "middle": "初中",
    "junior": "初中",
    "high": "高中",
    "小学": "小学",
    "小學": "小学",
    "初中": "初中",
    "國中": "初中",
    "国中": "初中",
    "高中": "高中",
}

DEFAULT_SUBJECTS = {
    "小学": ["语文", "数学", "英语", "科学", "道德与法治", "信息科技", "体育与健康", "音乐", "美术", "劳动", "艺术"],
    "初中": ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "道德与法治", "信息科技", "体育与健康", "音乐", "美术", "劳动", "艺术"],
    "高中": ["语文", "数学", "英语", "思想政治", "历史", "地理", "物理", "化学", "生物", "信息技术", "通用技术", "体育与健康", "音乐", "美术", "艺术"],
}

SUBJECT_ALIASES = {
    "语文": "语文",
    "語文": "语文",
    "数学": "数学",
    "數學": "数学",
    "英语": "英语",
    "英語": "英语",
    "物理": "物理",
    "化学": "化学",
    "化學": "化学",
    "生物": "生物",
    "生物学": "生物",
    "生物學": "生物",
    "历史": "历史",
    "歷史": "历史",
    "地理": "地理",
    "思想政治": "思想政治",
    "政治": "思想政治",
    "道德与法治": "道德与法治",
    "道德與法治": "道德与法治",
    "道法": "道德与法治",
    "思想品德": "道德与法治",
    "科学": "科学",
    "科學": "科学",
    "信息技术": "信息技术",
    "信息技術": "信息技术",
    "信息科技": "信息科技",
    "体育": "体育与健康",
    "體育": "体育与健康",
    "体育与健康": "体育与健康",
    "體育與健康": "体育与健康",
    "音乐": "音乐",
    "音樂": "音乐",
    "美术": "美术",
    "美術": "美术",
    "艺术": "艺术",
    "藝術": "艺术",
    "劳动": "劳动",
    "勞動": "劳动",
    "通用技术": "通用技术",
    "通用技術": "通用技术",
}


def eprint(message: str) -> None:
    print(message, file=sys.stderr)


def normalize_phase(raw: str) -> str:
    value = (raw or "").strip()
    return PHASE_ALIASES.get(value, value or "高中")


def normalize_subject(raw: str, phase: str) -> str:
    value = re.sub(r"\s+", "", (raw or "").strip())
    subject = SUBJECT_ALIASES.get(value, value)
    if phase in {"小学", "初中"} and subject in {"思想政治", "政治"}:
        return "道德与法治"
    if phase == "高中" and subject in {"道德与法治", "道法", "思想品德"}:
        return "思想政治"
    return subject


def split_subjects(raw: str, phase: str, all_subjects: bool) -> list[str]:
    value = (raw or "").strip()
    if all_subjects or value in {"", "0", "all", "ALL", "全部"}:
        return DEFAULT_SUBJECTS.get(phase, DEFAULT_SUBJECTS["高中"])
    parts = [p for p in re.split(r"[,，、/]+", value) if p.strip()]
    subjects: list[str] = []
    for part in parts:
        subject = normalize_subject(part, phase)
        if subject and subject not in subjects:
            subjects.append(subject)
    return subjects or DEFAULT_SUBJECTS.get(phase, DEFAULT_SUBJECTS["高中"])


def safe_filename(title: str) -> str:
    name = re.sub(r'[\\/:*?"<>|]+', "_", title).strip(" .")
    name = re.sub(r"\s+", " ", name)
    if not name:
        name = "jks-textbook"
    if not name.lower().endswith(".pdf"):
        name += ".pdf"
    return name


def api_url(api_base: str, path: str, params: dict[str, str] | None = None) -> str:
    url = api_base.rstrip("/") + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    return url


def request_json(api_base: str, path: str, params: dict[str, str]) -> Any:
    url = api_url(api_base, path, params)
    last_error = ""
    for attempt in range(1, 4):
        proc = subprocess.run(
            [
                "curl",
                "-fsSL",
                "--retry",
                "2",
                "--connect-timeout",
                "15",
                "--max-time",
                "90",
                "-A",
                UA,
                "-H",
                "Accept: application/json",
                url,
            ],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        if proc.returncode == 0:
            try:
                return json.loads(proc.stdout)
            except json.JSONDecodeError as exc:
                last_error = f"JSON parse failed: {exc}"
        else:
            last_error = proc.stderr.strip() or f"curl exit {proc.returncode}"
        if attempt < 3:
            time.sleep(attempt)
    raise RuntimeError(f"API 请求失败: {url}: {last_error}")


def search_books(api_base: str, phase: str, subject: str) -> list[dict[str, str]]:
    data = request_json(api_base, "/search", {"phase": phase, "subject": subject})
    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(str(data.get("error")))
    if not isinstance(data, list):
        raise RuntimeError(f"API 返回格式异常: {type(data).__name__}")
    books: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in data:
        if not isinstance(item, dict):
            continue
        book_id = str(item.get("id") or "").strip()
        title = str(item.get("title") or book_id or "未命名教材").strip()
        if not book_id or book_id in seen:
            continue
        books.append({"id": book_id, "title": title})
        seen.add(book_id)
    return books


def looks_like_pdf(path: Path) -> bool:
    try:
        return path.exists() and path.stat().st_size > 1024 and path.read_bytes()[:5] == b"%PDF-"
    except OSError:
        return False


def check_pdf(api_base: str, book_id: str) -> tuple[bool, str]:
    url = api_url(api_base, f"/pdf/{urllib.parse.quote(book_id, safe='')}")
    proc = subprocess.run(
        [
            "curl",
            "-sSIL",
            "--fail",
            "--connect-timeout",
            "15",
            "--max-time",
            "90",
            "-A",
            UA,
            "-H",
            "Accept: application/pdf,*/*",
            url,
        ],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if proc.returncode != 0:
        return False, proc.stderr.strip() or f"curl exit {proc.returncode}"
    headers = proc.stdout
    statuses = re.findall(r"(?im)^HTTP/\S+\s+(\d+)", headers)
    status = int(statuses[-1]) if statuses else 0
    ctype_match = re.findall(r"(?im)^content-type:\s*(.+)$", headers)
    clen_match = re.findall(r"(?im)^content-length:\s*(.+)$", headers)
    ctype = ctype_match[-1].strip() if ctype_match else ""
    clen = clen_match[-1].strip() if clen_match else ""
    ok = 200 <= status < 300 and ("pdf" in ctype.lower() or clen)
    return ok, f"HTTP {status or 'unknown'} {ctype or 'unknown'} {clen or 'unknown-size'}"


def download_pdf(api_base: str, book: dict[str, str], dest_dir: Path, force: bool) -> Path:
    title = book["title"]
    book_id = book["id"]
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / safe_filename(title)

    if dest.exists() and not force and looks_like_pdf(dest):
        print(f"[skip] {dest}")
        return dest

    url = api_url(api_base, f"/pdf/{urllib.parse.quote(book_id, safe='')}")
    part = dest.with_suffix(dest.suffix + ".part")

    proc = subprocess.run(
        [
            "curl",
            "-fL",
            "--retry",
            "3",
            "--connect-timeout",
            "15",
            "--max-time",
            "900",
            "-A",
            UA,
            "-H",
            "Accept: application/pdf,*/*",
            "--progress-bar",
            "-o",
            str(part),
            url,
        ],
        check=False,
        text=True,
    )
    if proc.returncode != 0:
        part.unlink(missing_ok=True)
        raise RuntimeError(f"curl exit {proc.returncode}")

    if not looks_like_pdf(part):
        part.unlink(missing_ok=True)
        raise RuntimeError(f"下载结果不是有效 PDF: {title}")

    part.replace(dest)
    print(f"[ok] {dest}")
    return dest


def prompt(default: str, text: str) -> str:
    value = input(f"{text} [{default}]: ").strip()
    return value or default


def maybe_interactive(args: argparse.Namespace) -> None:
    if len(sys.argv) > 1 or not sys.stdin.isatty():
        return
    print("JKS 智慧教材下载器")
    print("学段: 1) 小学  2) 初中  3) 高中")
    args.phase = prompt(args.phase, "选择学段")
    args.subject = prompt("全部", "科目，多个用逗号分隔，输入 全部 下载该学段全部可用科目")
    args.all = args.subject in {"", "0", "全部", "all", "ALL"}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="JKS 智慧教材下载器，使用 jks-ai.bdfz.net 搜索并下载国家智慧教育平台 PDF。"
    )
    parser.add_argument("-p", "--phase", default=os.getenv("SMARTEDU_PHASE", "高中"), help="学段：小学、初中、高中")
    parser.add_argument("-s", "--subject", default=os.getenv("SMARTEDU_SUBJ", "语文"), help="科目，多个用逗号分隔；可用 全部/all")
    parser.add_argument("-a", "--all", action="store_true", help="下载该学段默认科目集合")
    parser.add_argument("-o", "--output", default=os.getenv("JKS_OUT", "jks_textbooks"), help="输出目录")
    parser.add_argument("-l", "--list", action="store_true", help="只列出教材，不下载")
    parser.add_argument("--check", action="store_true", help="只检查 PDF 端点，不保存文件")
    parser.add_argument("--limit", type=int, default=0, help="限制每科处理数量，便于测试")
    parser.add_argument("--book-id", help="直接下载指定教材 ID")
    parser.add_argument("--title", default="", help="直接下载时使用的文件名")
    parser.add_argument("-f", "--force", action="store_true", help="覆盖已存在 PDF")
    parser.add_argument("--api-base", default=os.getenv("JKS_API_BASE", DEFAULT_API_BASE), help="JKS API 地址")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    maybe_interactive(args)

    api_base = str(args.api_base).rstrip("/")
    phase = normalize_phase(args.phase)
    out_root = Path(args.output).expanduser().resolve()

    if args.book_id:
        title = args.title or args.book_id
        book = {"id": args.book_id, "title": title}
        if args.check:
            ok, detail = check_pdf(api_base, args.book_id)
            print(f"{'OK' if ok else 'FAIL'}\t{args.book_id}\t{detail}")
            return 0 if ok else 2
        download_pdf(api_base, book, out_root / "direct", args.force)
        return 0

    subjects = split_subjects(args.subject, phase, bool(args.all))
    print(f"[i] API: {api_base}")
    print(f"[i] 学段: {phase}")
    print(f"[i] 科目: {', '.join(subjects)}")
    print(f"[i] 输出: {out_root}")

    total_books = 0
    failures: list[str] = []

    for subject in subjects:
        try:
            books = search_books(api_base, phase, subject)
        except Exception as exc:
            failures.append(f"{phase}/{subject}: search failed: {exc}")
            eprint(f"[fail] {phase}/{subject}: {exc}")
            continue

        if args.limit and args.limit > 0:
            books = books[: args.limit]

        print(f"\n== {phase} / {subject}: {len(books)} 本 ==")
        if not books:
            continue

        for idx, book in enumerate(books, start=1):
            print(f"{idx:03d}. {book['title']}  {book['id']}")
            if args.list:
                continue
            if args.check:
                ok, detail = check_pdf(api_base, book["id"])
                print(f"     {'OK' if ok else 'FAIL'} {detail}")
                if not ok:
                    failures.append(f"{phase}/{subject}/{book['id']}: {detail}")
                continue
            try:
                download_pdf(api_base, book, out_root / phase / subject, args.force)
            except Exception as exc:
                failures.append(f"{phase}/{subject}/{book['id']}: {exc}")
                eprint(f"[fail] {book['title']}: {exc}")
        total_books += len(books)

    print(f"\n[i] 处理教材数: {total_books}")
    if failures:
        eprint("[!] 以下项目失败：")
        for failure in failures:
            eprint(f"    - {failure}")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
PY
