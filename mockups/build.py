#!/usr/bin/env python3
"""Assemble self-contained mockup pages: inline CSS, JS, and data-URI assets."""
import base64, pathlib

here = pathlib.Path(__file__).parent
site = here.parent

css = (here / "shared.css").read_text()
shared = (here / "shared.js").read_text()
moonmath = (site / "js/moonmath.js").read_text()
moonglobe = (site / "js/moonglobe.js").read_text()
tex = "data:image/jpeg;base64," + base64.b64encode((site / "assets/moontex.jpg").read_bytes()).decode()
small = "data:image/png;base64," + base64.b64encode((site / "assets/moonsmall.png").read_bytes()).decode()

(here / "dist").mkdir(exist_ok=True)
for name in ["a", "b", "c"]:
    html = (here / f"{name}.html").read_text()
    html = (html.replace("__CSS__", css)
                .replace("__MOONMATH__", moonmath)
                .replace("__MOONGLOBE__", moonglobe)
                .replace("__SHARED__", shared)
                .replace("__MOONTEX_URI__", tex)
                .replace("__MOONSMALL_URI__", small))
    out = here / "dist" / f"{name}.html"
    out.write_text(html)
    # wrapped variant approximating the published artifact for local testing
    (here / "dist" / f"test-{name}.html").write_text(
        "<!doctype html>\n<html><head>" + html.split("</title>")[0] + "</title>"
        + html.split("</title>")[1].split("<canvas", 1)[0]
        + "</head><body><canvas" + html.split("<canvas", 1)[1] + "</body></html>")
    print(out, len(html) // 1024, "KB")
