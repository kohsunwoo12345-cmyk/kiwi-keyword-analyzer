#!/usr/bin/env python3
"""docs/*.md 를 한글이 깨지지 않는 PDF 로 굽는다 → docs/pdf/

  · 글꼴은 나눔고딕(TTF)을 base64 로 PDF 안에 심는다 — 받는 사람 컴퓨터에
    한글 글꼴이 없어도 네모칸(tofu)이 안 뜬다. 이게 이 스크립트의 존재 이유다.
  · 표가 많은 문서는 가로(landscape)로 굽는다.
  · 굽고 나서 글자를 다시 뽑아, 원문에 있던 한글이 PDF 안에 실제로 다 들어갔는지 센다.
    하나라도 빠지면 0 이 아닌 값으로 끝난다 — "만들어졌다" 와 "읽힌다" 는 다른 얘기다.

  준비물
    apt/pip : python3 -m pip install markdown pdfplumber
    글꼴    : /usr/share/fonts/truetype/nanum/NanumGothic-{Regular,Bold}.ttf
              (google/fonts 저장소 ofl/nanumgothic 에서 받아 넣고 fc-cache -f)
    크로뮴  : CHROME 경로 — Playwright 가 깔아 둔 것을 쓴다.

  실행 : python3 scripts/md2pdf.py   (저장소 뿌리에서)
"""
import base64, html, os, re, subprocess, sys, tempfile

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
FONT_R = "/usr/share/fonts/truetype/nanum/NanumGothic-Regular.ttf"
FONT_B = "/usr/share/fonts/truetype/nanum/NanumGothic-Bold.ttf"

import markdown


def b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


CSS = """
@font-face {{ font-family:'NG'; font-weight:400; src:url(data:font/ttf;base64,{r}) format('truetype'); }}
@font-face {{ font-family:'NG'; font-weight:700; src:url(data:font/ttf;base64,{b}) format('truetype'); }}
@page {{ size:{size}; margin:14mm 12mm 16mm 12mm; }}
* {{ box-sizing:border-box; }}
body {{ font-family:'NG',sans-serif; font-size:9.2pt; line-height:1.62; color:#14171c; margin:0;
        -webkit-font-smoothing:antialiased; word-break:keep-all; }}
h1 {{ font-size:19pt; margin:0 0 4mm; padding-bottom:3mm; border-bottom:2.4pt solid #111827; letter-spacing:-.02em; }}
h2 {{ font-size:13.5pt; margin:9mm 0 3mm; padding-left:2.6mm; border-left:3.4pt solid #2563eb; letter-spacing:-.01em;
      break-after:avoid; page-break-after:avoid; }}
h3 {{ font-size:11pt; margin:6mm 0 2mm; color:#1f2937; break-after:avoid; page-break-after:avoid; }}
h4 {{ font-size:9.8pt; margin:5mm 0 1.5mm; color:#374151; break-after:avoid; page-break-after:avoid; }}
p {{ margin:0 0 2.6mm; }}
ul,ol {{ margin:0 0 3mm; padding-left:5.5mm; }}
li {{ margin:0 0 1.2mm; }}
hr {{ border:0; border-top:.7pt solid #d5dae1; margin:6mm 0; }}
a {{ color:#1d4ed8; text-decoration:none; word-break:break-all; }}
code {{ font-family:'NG',monospace; background:#f1f3f6; border:.5pt solid #e0e4ea; border-radius:2.5pt;
        padding:.3mm 1.1mm; font-size:8.4pt; word-break:break-all; }}
pre {{ background:#f7f8fa; border:.6pt solid #e0e4ea; border-radius:3pt; padding:2.6mm 3mm; overflow:hidden;
       white-space:pre-wrap; word-break:break-all; font-size:8.2pt; margin:0 0 3mm; }}
pre code {{ background:none; border:0; padding:0; }}
blockquote {{ margin:0 0 3mm; padding:2mm 3mm; background:#fff8e6; border-left:3pt solid #f0b429; }}
blockquote p {{ margin:0; }}
/* auto 배치라야 열 너비가 내용에 맞게 나뉜다. fixed 로 하면 '단위' 같은 짧은 열이
   '모델' 같은 긴 열과 같은 폭을 먹어 글자가 쓸데없이 접힌다.
   word-break 는 normal — break-all 로 두면 'Alpha Turbo' 가 'Alph a' 로 잘린다. */
table {{ width:100%; border-collapse:collapse; margin:0 0 4mm; table-layout:auto; font-size:{tfs}; }}
th,td {{ border:.5pt solid #cbd2db; padding:1.4mm 1.7mm; text-align:left; vertical-align:top;
         word-break:normal; overflow-wrap:anywhere; }}
th {{ background:#eef2f7; font-weight:700; white-space:nowrap; }}
tbody tr:nth-child(even) td {{ background:#fafbfc; }}
tr {{ break-inside:avoid; page-break-inside:avoid; }}
thead {{ display:table-header-group; }}
strong {{ font-weight:700; }}
.foot {{ margin-top:8mm; padding-top:3mm; border-top:.6pt solid #d5dae1; font-size:7.6pt; color:#6b7280; }}
"""


def convert(md_path, pdf_path, landscape=False, table_font="8.2pt"):
    src = open(md_path, encoding="utf-8").read()
    body = markdown.markdown(src, extensions=["tables", "fenced_code", "sane_lists", "nl2br"])
    size = "A4 landscape" if landscape else "A4"
    css = CSS.format(r=b64(FONT_R), b=b64(FONT_B), size=size, tfs=table_font)
    doc = (f"<!doctype html><html lang=ko><head><meta charset=utf-8>"
           f"<title>{html.escape(os.path.basename(md_path))}</title>"
           f"<style>{css}</style></head><body>{body}"
           f"<div class=foot>BYGENCY · {html.escape(os.path.basename(md_path))} · 코드에서 자동으로 뽑은 문서</div>"
           f"</body></html>")

    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as f:
        f.write(doc); tmp = f.name
    try:
        cmd = [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--font-render-hinting=none",
               "--no-pdf-header-footer", f"--print-to-pdf={pdf_path}", "--virtual-time-budget=8000",
               f"file://{tmp}"]
        r = subprocess.run(cmd, capture_output=True, timeout=180)
        if not os.path.exists(pdf_path):
            print(r.stderr.decode()[-2000:], file=sys.stderr)
            raise SystemExit(f"굽기 실패: {md_path}")
    finally:
        os.unlink(tmp)
    return pdf_path


def check(pdf_path, md_path):
    """구운 PDF 에서 글자를 다시 뽑아, 원문의 한글이 실제로 살아 있는지 본다."""
    import pdfplumber
    with pdfplumber.open(pdf_path) as pdf:
        pages = len(pdf.pages)
        out = "\n".join((p.extract_text() or "") for p in pdf.pages)
    han = re.findall(r"[가-힣]", out)
    src_han = set(re.findall(r"[가-힣]", open(md_path, encoding="utf-8").read()))
    got = set(han)
    missing = sorted(src_han - got)
    return pages, len(han), missing


if __name__ == "__main__":
    jobs = [
        ("docs/model-table.md", "docs/pdf/BYGENCY-모델-전체표.pdf", True, "7.6pt"),
        ("docs/model-gap-weave-higgsfield.md", "docs/pdf/BYGENCY-모델-비교-위브-힉스필드.pdf", True, "8.0pt"),
        ("docs/seedance20-real-person-route.md", "docs/pdf/BYGENCY-씨댄스2.0-인물사진-경로.pdf", False, "8.4pt"),
    ]
    os.makedirs("docs/pdf", exist_ok=True)
    bad = 0
    for md, pdf, land, tfs in jobs:
        if not os.path.exists(md):
            print(f"  없음 {md}"); bad += 1; continue
        convert(md, pdf, land, tfs)
        pages, han, missing = check(pdf, md)
        kb = os.path.getsize(pdf) // 1024
        ok = "OK " if not missing and han > 100 else "△  "
        print(f"{ok}{pdf}  {pages}쪽 · {kb}KB · 한글 {han}자" +
              (f" · ⚠ 빠진 글자 {len(missing)}개: {''.join(missing[:20])}" if missing else " · 빠진 글자 없음"))
        if missing or han <= 100:
            bad += 1
    raise SystemExit(bad)
