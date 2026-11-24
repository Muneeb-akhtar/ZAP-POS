"""Makes one 1200x630 share image per page into public/og/<slug>.jpg (dev-only; needs Python, Playwright and Chrome).
Run from src/zappos-web: python3 scripts/make-og-images.py. The prerender step uses a page's image when the file exists."""
import json, re, pathlib
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root / "src/content/landing-content.json").read_text(encoding="utf8"))
inter = (root / "node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2").as_uri()
brico = (root / "node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2").as_uri()
shot = (root / "public/media/zap-pos-billing-screen.jpg").as_uri()

def head(p):  # the part of the search title before the first separator
    return re.split(r"\s[|:]\s|:\s", p["seoTitle"])[0].replace(" | ZAP POS", "")

def line(p):
    first = re.split(r"(?<=[.!?])\s", p["seoDescription"])[0]
    if len(first) > 88:
        first = first[:86].rsplit(" ", 1)[0].rstrip(",;:.") + "…"
    return first

HTML = """<style>
@font-face{font-family:I;src:url('@@inter@@');font-weight:700}
@font-face{font-family:B;src:url('@@brico@@');font-weight:200 800}
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;background:linear-gradient(135deg,#0a1a3f,#0d3a8f 70%,#0b2a6b);font-family:I;color:#fff;position:relative;overflow:hidden}
.brand{position:absolute;left:60px;top:56px;font:800 40px B;display:flex;gap:14px;align-items:center}.logo{width:64px;height:64px;border-radius:16px;background:#1b84ff;display:grid;place-items:center;font-size:36px;color:#fff}
.t{position:absolute;left:60px;top:190px;width:560px;font:800 54px/1.12 B}.t em{font-style:normal;color:#ffd21f}
.s{position:absolute;left:60px;top:380px;width:540px;height:110px;overflow:hidden;font:400 26px/1.4 I;color:#c7d6f5}
.u{position:absolute;left:60px;bottom:48px;border:3px solid #ffd21f;border-radius:40px;padding:10px 34px;font:800 28px B;color:#ffd21f}
img{position:absolute;right:48px;top:150px;width:520px;border-radius:14px;border:3px solid #3a86ff;box-shadow:0 20px 50px rgba(0,0,0,.45)}
</style><div class=brand><span class=logo>⚡</span>ZAP POS</div><div class=t>@@title@@</div><div class=s>@@sub@@</div><div class=u>zappos.pk</div><img src="@@shot@@">"""

def esc(s): return s.replace("&", "&amp;").replace("<", "&lt;")

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--allow-file-access-from-files"])
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    for p in data["pages"]["items"]:
        if p.get("noindex"):
            continue
        t = esc(head(p)); t = re.sub(r"(Pakistan|Lahore|Karachi|Islamabad|Rawalpindi|Faisalabad|Peshawar)", r"<em>\1</em>", t, count=1)
        html = HTML
        for k, v in dict(inter=inter, brico=brico, shot=shot, title=t, sub=esc(line(p))).items():
            html = html.replace('@@' + k + '@@', v)
        f = root / "scripts/.og.html"; f.write_text(html, encoding="utf8")
        pg.goto(f.as_uri()); pg.wait_for_timeout(250)
        pg.screenshot(path=str(root / f"public/og/{p['slug']}.jpg"), type="jpeg", quality=84)
    b.close()
(root / "scripts/.og.html").unlink()
