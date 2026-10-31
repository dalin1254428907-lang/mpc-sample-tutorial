#!/usr/bin/env python3
"""检查章节前言字段与 Markdown 内相对链接/图片是否有效。用法：python3 tools/check_site.py"""
import glob, os, re, sys
import yaml
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errs = []
orders = {}
for p in sorted(glob.glob(os.path.join(ROOT, "chapters", "*.md"))):
    s = open(p, encoding="utf-8").read()
    m = re.match(r"---\n(.*?)\n---\n", s, re.S)
    if not m:
        errs.append(f"{p}: 缺少前言字段"); continue
    fm = yaml.safe_load(m.group(1))
    for k in ("title", "chapter", "nav_order"):
        if k not in fm: errs.append(f"{p}: 缺少 {k}")
    if fm.get("nav_order") in orders: errs.append(f"{p}: nav_order 与 {orders[fm['nav_order']]} 重复")
    orders[fm.get("nav_order")] = p
    for f in fm.get("figures") or []:
        if not os.path.exists(os.path.join(ROOT, "_includes", "figures", f + ".html")):
            errs.append(f"{p}: 找不到 _includes/figures/{f}.html")
for p in glob.glob(os.path.join(ROOT, "*.md")) + glob.glob(os.path.join(ROOT, "chapters", "*.md")):
    s = open(p, encoding="utf-8").read()
    s = re.sub(r"```.*?```", "", s, flags=re.S)
    s = re.sub(r"`[^`\n]*`", "", s)
    links = re.findall(r"\]\(([^)\s]+)\)", s) + re.findall(r'(?:src|href)="([^"]+)"', s)
    for l in links:
        if re.match(r"^(https?:|mailto:|#|\{\{)", l): continue
        path = l.split("#")[0]
        if not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(p), path))):
            errs.append(f"{os.path.relpath(p, ROOT)}: 链接无效 {l}")
    for a in re.findall(r"\]\(#([^)]+)\)", s):
        if f'id="{a}"' not in s: errs.append(f"{os.path.relpath(p, ROOT)}: 锚点不存在 #{a}")
print("\n".join(errs) if errs else f"OK：{len(orders)} 个章节，前言与链接均有效")
sys.exit(1 if errs else 0)
