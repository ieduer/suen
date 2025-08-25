#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse, subprocess, re, os, unicodedata, html
from difflib import SequenceMatcher

def run(cmd):
    return subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)

def get_pages(pdf):
    out = run(f"pdfinfo {quote(pdf)}").stdout
    m = re.search(r"Pages:\s+(\d+)", out)
    return int(m.group(1)) if m else 0

def quote(p):  # minimal shell quoting
    return "'" + p.replace("'", "'\\''") + "'"

def extract_page_text(pdf, page):
    cmd = f"pdftotext -layout -nopgbrk -enc UTF-8 -f {page} -l {page} {quote(pdf)} -"
    res = subprocess.run(cmd, shell=True, capture_output=True)
    return res.stdout.decode("utf-8", errors="ignore")

def normalize(s, cc=None):
    # 全半角统一
    s = unicodedata.normalize("NFKC", s)
    # 常见无意义空白规整
    s = re.sub(r"[ \t\u00A0]+", "", s)
    # 行首尾空白
    s = "\n".join(line.strip() for line in s.splitlines())
    # 页码/页眉页脚常见模式（按需扩充）
    s = re.sub(r"第[一二三四五六七八九十百千0-9]+页", "", s)
    s = re.sub(r"Page\s*\d+\s*(of\s*\d+)?", "", s, flags=re.I)
    # 可选繁简转换
    if cc:
        try:
            from opencc import OpenCC
            s = OpenCC(cc).convert(s)
        except Exception:
            pass
    return s

def highlight(a, b):
    # 字符级差异，高亮 <mark class="del/ins">
    sm = SequenceMatcher(None, a, b)
    a_out, b_out = [], []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            a_out.append(html.escape(a[i1:i2]))
            b_out.append(html.escape(b[j1:j2]))
        elif tag == "delete":
            a_out.append(f'<mark class="del">{html.escape(a[i1:i2])}</mark>')
        elif tag == "insert":
            b_out.append(f'<mark class="ins">{html.escape(b[j1:j2])}</mark>')
        elif tag == "replace":
            a_out.append(f'<mark class="del">{html.escape(a[i1:i2])}</mark>')
            b_out.append(f'<mark class="ins">{html.escape(b[j1:j2])}</mark>')
    return "".join(a_out), "".join(b_out)

def build_section(title, left_html, right_html):
    return f"""
<section class="page">
  <h2>{html.escape(title)}</h2>
  <div class="cols">
    <div><h3>A</h3><div class="box">{left_html}</div></div>
    <div><h3>B</h3><div class="box">{right_html}</div></div>
  </div>
</section>
"""

HTML_HEAD = """<!doctype html><meta charset="utf-8">
<title>PDF CN Compare Report</title>
<style>
body{font:14px/1.6 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Source Han Sans SC",sans-serif;margin:24px;color:#111}
h1{margin:0 0 12px}
h2{margin:24px 0 8px;border-left:4px solid #999;padding-left:8px}
h3{margin:0 0 6px;color:#444}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.box{white-space:pre-wrap;border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff;max-height:50vh;overflow:auto}
mark.del{background:#ffe2e2}
mark.ins{background:#e2ffe8}
.header{margin-bottom:8px;color:#666}
.sticky{position:sticky;top:0;background:#fafafa;padding:8px;border:1px solid #eee;border-radius:8px;margin-bottom:12px}
footer{margin-top:24px;color:#666}
</style>
"""

def main():
    ap = argparse.ArgumentParser(description="Compare two Chinese PDFs at character level with normalization.")
    ap.add_argument("pdfA")
    ap.add_argument("pdfB")
    ap.add_argument("--cc", default="", help="OpenCC mode, e.g., s2t, t2s (optional)")
    args = ap.parse_args()

    nA, nB = get_pages(args.pdfA), get_pages(args.pdfB)
    n = max(nA, nB)

    sections = []
    changed = 0
    for i in range(1, n+1):
        a_text = extract_page_text(args.pdfA, i) if i <= nA else ""
        b_text = extract_page_text(args.pdfB, i) if i <= nB else ""

        a_norm = normalize(a_text, args.cc)
        b_norm = normalize(b_text, args.cc)

        a_h, b_h = highlight(a_norm, b_norm)
        if a_h != html.escape(a_norm) or b_h != html.escape(b_norm):
            changed += 1

        sections.append(build_section(f"Page {i}", a_h, b_h))

    html_out = [HTML_HEAD, f"<h1>差异报告</h1>",
                f'<div class="sticky"><div class="header">A: {html.escape(args.pdfA)}<br>B: {html.escape(args.pdfB)}<br>页数 A={nA}, B={nB}；检测到差异页≈ {changed} / {n}</div></div>']
    html_out.extend(sections)
    html_out.append("<footer>生成完成。</footer>")

    with open("report.html", "w", encoding="utf-8") as f:
        f.write("\n".join(html_out))
    print("OK -> report.html")

if __name__ == "__main__":
    main()