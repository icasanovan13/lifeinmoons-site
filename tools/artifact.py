#!/usr/bin/env python3
"""Build a self-contained artifact preview of the production index.html.

Artifacts are wrapped in doctype/head/body at publish time and can load no
external resources, so this inlines the CSS, the three scripts, and both moon
images as data URIs, and strips the document shell. Output overwrites
mockups/dist/a.html so republishing keeps the direction-A artifact URL.
"""
import base64, pathlib, re

site = pathlib.Path(__file__).parent.parent
html = (site / "index.html").read_text()

css = (site / "css/site.css").read_text()
js = "".join((site / f"js/{n}.js").read_text() + "\n" for n in ["moonmath", "moonglobe", "site"])
tex = "data:image/jpeg;base64," + base64.b64encode((site / "assets/moontex.jpg").read_bytes()).decode()
small = "data:image/png;base64," + base64.b64encode((site / "assets/moonsmall.png").read_bytes()).decode()

body = html.split("<body>")[1].split("</body>")[0]
body = re.sub(r'<script src="[^"]+"></script>\s*', "", body)

out = (
    "<title>Life in Moons — production preview</title>\n"
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    f"<style>{css}</style>\n"
    f"{body}\n"
    f'<script>window.MOONTEX_SRC = "{tex}"; window.MOONSMALL_SRC = "{small}";</script>\n'
    f"<script>{js}</script>\n"
)
dest = site / "mockups/dist/a.html"
dest.parent.mkdir(exist_ok=True)
dest.write_text(out)
print(dest, len(out) // 1024, "KB")
