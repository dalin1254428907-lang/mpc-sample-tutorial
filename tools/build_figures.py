#!/usr/bin/env python3
"""从 _data/*.yml 生成标注图。

输出两种格式（坐标、配色与原教程 Page 完全一致）：
  1. _includes/figures/<name>.html  —— 内联 SVG，Jekyll 站点使用（图片地址用 relative_url，适配 baseurl）
  2. assets/img/annotated/<name>.jpg —— 位图（无头 Chrome 截图后转 JPEG），github.com 直接浏览 Markdown 时使用

用法：python3 tools/build_figures.py [--no-png]   （依赖：pip install pyyaml pillow）
位图渲染需要本机有 Google Chrome / Chromium（无头截图）和中文字体（Noto Sans CJK）。
"""
import base64, html, os, shutil, subprocess, sys, tempfile
import yaml
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = dict(bg="#0B0B0D", panel="#16161B", panel2="#202027", line="#34343D", yellow="#FFE500",
         red="#FF3B3B", cyan="#00E5FF", white="#F5F5F5", gray="#B4B4BE", black="#0B0B0D")
FONT = "'Noto Sans SC','Noto Sans CJK SC','PingFang SC','Hiragino Sans GB','Microsoft YaHei',system-ui,sans-serif"
MAIN = ("assets/img/mpc-sample-top.jpg", 0, 200, 1536, 1240)
REAR = ("assets/img/akai-mpc-sample-rear.webp", 0, 0, 912, 231)
SIDE = ("assets/img/akai-mpc-sample-side.webp", 0, 0, 440, 280)


def load(name):
    with open(os.path.join(ROOT, "_data", name + ".yml"), encoding="utf-8") as f:
        return yaml.safe_load(f)


def e(s):
    return html.escape(str(s), quote=True)


def n(v):
    v = round(float(v), 2)
    return str(int(v)) if v == int(v) else str(v)


def text_w(s, fs):
    return sum(fs * 0.98 if ord(ch) > 0x2E80 else fs * 0.6 for ch in s)


def img_tag(img, href, clip=None):
    path, x, y, w, h = img
    c = f' clip-path="url(#{clip})"' if clip else ""
    return f'<image href="{href(path)}" x="{x}" y="{y}" width="{w}" height="{h}" preserveAspectRatio="none"{c}/>'


def svg_open(vb, title):
    return (f'<svg class="fig" viewBox="{" ".join(n(v) for v in vb)}" role="img" aria-label="{e(title)}" '
            f'xmlns="http://www.w3.org/2000/svg" font-family="{e(FONT)}" style="display:block;width:100%;height:auto;background:{C["panel"]};border-radius:14px">'
            f'<title>{e(title)}</title>')


def callout(fid, title, vb, img, clip, fs, labels, href):
    out = [svg_open(vb, title)]
    out.append(f'<defs><clipPath id="{fid}"><rect x="{clip[0]}" y="{clip[1]}" width="{clip[2]}" height="{clip[3]}" rx="{n(fs*0.6)}"/></clipPath></defs>')
    out.append(img_tag(img, href, fid))
    out.append(f'<rect x="{clip[0]}" y="{clip[1]}" width="{clip[2]}" height="{clip[3]}" rx="{n(fs*0.6)}" fill="none" stroke="{C["yellow"]}" stroke-width="{n(fs*0.08)}" stroke-dasharray="{n(fs*0.4)} {n(fs*0.25)}"/>')
    def leader(x, y, l):
        return (f'<line x1="{x}" y1="{y}" x2="{l["lx"]}" y2="{l["ly"]}" stroke="{C["black"]}" stroke-width="{n(fs*0.22)}"/>'
                f'<line x1="{x}" y1="{y}" x2="{l["lx"]}" y2="{l["ly"]}" stroke="{C["yellow"]}" stroke-width="{n(fs*0.1)}"/>'
                f'<circle cx="{x}" cy="{y}" r="{n(fs*0.32)}" fill="{C["yellow"]}" stroke="{C["black"]}" stroke-width="{n(fs*0.08)}"/>')
    for l in labels:
        g = "".join(leader(q[0], q[1], l) for q in (l.get("pts") or []))
        out.append("<g>" + g + leader(l["px"], l["py"], l) + "</g>")
    for i, l in enumerate(labels):
        pad = fs * 0.35
        w = text_w(l["en"], fs) + pad * 2
        a = l["anchor"]
        rx = l["lx"] - w if a == "end" else l["lx"] if a == "start" else l["lx"] - w / 2
        tx = l["lx"] - pad if a == "end" else l["lx"] + pad if a == "start" else l["lx"]
        rot = -2 if i % 2 == 0 else 2
        s = [f'<g><g transform="rotate({rot} {l["lx"]} {l["ly"]})">',
             f'<rect x="{n(rx)}" y="{n(l["ly"]-fs*0.78)}" width="{n(w)}" height="{n(fs*1.5)}" rx="{n(fs*0.12)}" fill="{C["yellow"]}" stroke="{C["black"]}" stroke-width="{n(fs*0.06)}"/>',
             f'<text x="{n(tx)}" y="{n(l["ly"]+fs*0.33)}" font-size="{n(fs)}" font-weight="900" fill="{C["black"]}" text-anchor="{a}">{e(l["en"])}</text></g>',
             f'<text x="{n(tx)}" y="{n(l["ly"]+fs*1.65)}" font-size="{n(fs*0.92)}" font-weight="700" fill="{C["white"]}" text-anchor="{a}" stroke="{C["panel"]}" stroke-width="{n(fs*0.12)}" paint-order="stroke">{e(l["zh"])}</text>']
        if l.get("sh"):
            s.append(f'<text x="{n(tx)}" y="{n(l["ly"]+fs*2.7)}" font-size="{n(fs*0.8)}" font-weight="700" fill="{C["cyan"]}" text-anchor="{a}" stroke="{C["panel"]}" stroke-width="{n(fs*0.12)}" paint-order="stroke">⇧ {e(l["sh"])}</text>')
        s.append("</g>")
        out.append("".join(s))
    out.append("</svg>")
    return "\n".join(out)


def overview(href):
    legend = {x["n"]: x for x in load("legend")}
    out = [svg_open([0, 200, 1536, 1240], "MPC Sample 面板总览：编号 1–40 与分区 A–E"), img_tag(MAIN, href)]
    for r in load("regions"):
        out.append(f'<g class="region"><rect x="{r["x"]}" y="{r["y"]}" width="{r["w"]}" height="{r["h"]}" rx="18" fill="none" stroke="{C["cyan"]}" stroke-width="6" stroke-dasharray="22 12"/>'
                   f'<rect x="{r["x"]+8}" y="{r["y"]+8}" width="52" height="52" rx="6" fill="{C["cyan"]}" stroke="{C["black"]}" stroke-width="3"/>'
                   f'<text x="{r["x"]+34}" y="{r["y"]+47}" font-size="40" font-weight="900" fill="{C["black"]}" text-anchor="middle">{r["k"]}</text></g>')
    for m in load("markers"):
        lg = legend.get(m["n"], {})
        out.append(f'<g class="marker"><title>{m["n"]} {e(lg.get("en",""))} · {e(lg.get("zh",""))}</title>'
                   f'<circle cx="{m["x"]}" cy="{m["y"]}" r="27" fill="{C["red"]}" stroke="{C["black"]}" stroke-width="5"/>'
                   f'<text x="{m["x"]}" y="{m["y"]+10}" font-size="28" font-weight="900" fill="{C["white"]}" text-anchor="middle">{m["n"]}</text></g>')
    out.append("</svg>")
    return "\n".join(out)


def pads(href):
    out = [svg_open([410, 705, 810, 715], "16 打击垫 SHIFT 功能"),
           '<defs><clipPath id="clipE"><rect x="420" y="712" width="790" height="700" rx="16"/></clipPath></defs>',
           img_tag(MAIN, href, "clipE")]
    for p in load("pads"):
        x, y = p["x"], p["y"]
        fs = 17 if len(p["en"]) > 10 else 20
        out.append(f'<g><rect x="{x-80}" y="{y-38}" width="160" height="78" rx="8" fill="{C["black"]}" fill-opacity="0.84" stroke="{C["yellow"]}" stroke-width="2.5"/>'
                   f'<circle cx="{x-72}" cy="{y-36}" r="19" fill="{C["red"]}" stroke="{C["black"]}" stroke-width="3"/>'
                   f'<text x="{x-72}" y="{y-29}" font-size="20" font-weight="900" fill="{C["white"]}" text-anchor="middle">{p["n"]}</text>'
                   f'<text x="{x+6}" y="{y-4}" font-size="{fs}" font-weight="900" fill="{C["yellow"]}" text-anchor="middle">{e(p["en"])}</text>'
                   f'<text x="{x+6}" y="{y+27}" font-size="21" font-weight="700" fill="{C["white"]}" text-anchor="middle">{e(p["zh"])}</text></g>')
    out.append("</svg>")
    return "\n".join(out)


def figures(href):
    c = load("callouts")
    return {
        "overview": overview(href),
        "fig-a": callout("cA", "A 区 顶部", [100, 20, 1320, 760], MAIN, [160, 205, 1200, 350], 30, c["figA"], href),
        "fig-b": callout("cB", "B 区 左列", [-640, 540, 1820, 900], MAIN, [75, 580, 390, 830], 32, c["figB"], href),
        "fig-c": callout("cC", "C 区 K1–K3", [400, 500, 760, 470], MAIN, [440, 545, 660, 175], 30, c["figC"], href),
        "fig-d": callout("cD", "D 区 右列", [460, 470, 1640, 900], MAIN, [1080, 560, 450, 770], 28, c["figD"], href),
        "fig-e": pads(href),
        "fig-f": callout("cF", "F 区 后面板", [-30, -170, 980, 560], REAR, [0, 0, 912, 231], 24, c["figF"], href),
        "fig-side": callout("cS", "侧面 microSD", [0, 0, 900, 290], SIDE, [0, 0, 440, 280], 28, c["figSide"], href),
    }


def main():
    inc = os.path.join(ROOT, "_includes", "figures")
    os.makedirs(inc, exist_ok=True)
    site = figures(lambda p: "{{ '/" + p + "' | relative_url }}")
    for k, svg in site.items():
        with open(os.path.join(inc, k + ".html"), "w", encoding="utf-8") as f:
            f.write("<!-- 由 tools/build_figures.py 生成，请修改 _data/*.yml 后重新生成 -->\n<figure class=\"fig-wrap\" id=\"fig-" + k.replace("fig-", "") + "\">\n" + svg + "\n</figure>\n")
    print("wrote", len(site), "includes")
    if "--no-png" in sys.argv:
        return
    chrome = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser")
    if not chrome:
        print("未找到 Chrome，跳过位图"); return
    mime = {".jpg": "image/jpeg", ".webp": "image/webp", ".png": "image/png"}
    def data_uri(p):
        with open(os.path.join(ROOT, p), "rb") as f:
            return f"data:{mime[os.path.splitext(p)[1]]};base64," + base64.b64encode(f.read()).decode()
    cache = {}
    def href(p):
        if p not in cache: cache[p] = data_uri(p)
        return cache[p]
    outdir = os.path.join(ROOT, "assets", "img", "annotated")
    os.makedirs(outdir, exist_ok=True)
    W = 1600
    with tempfile.TemporaryDirectory() as td:
        for k, svg in figures(href).items():
            vb = [float(v) for v in svg.split('viewBox="')[1].split('"')[0].split()]
            H = round(W * vb[3] / vb[2])
            page = os.path.join(td, k + ".html")
            with open(page, "w", encoding="utf-8") as f:
                f.write(f'<!doctype html><meta charset="utf-8"><style>html,body{{margin:0;background:{C["bg"]};width:{W}px;height:{H}px;overflow:hidden}}svg{{border-radius:0!important}}</style>{svg}')
            png = os.path.join(outdir, k + ".png")
            subprocess.run([chrome, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
                            "--force-device-scale-factor=1", f"--window-size={W},{H}", f"--screenshot={png}",
                            "file://" + page], check=True, capture_output=True)
            jpg = os.path.join(outdir, k + ".jpg")
            Image.open(png).convert("RGB").save(jpg, quality=85, optimize=True, progressive=True)
            os.remove(png)
            print("jpg", k, W, H)


if __name__ == "__main__":
    main()
