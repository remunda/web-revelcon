#!/usr/bin/env python3
"""Convert Stoke font glyphs to SVG paths and assemble the Revelcon logo.

Outputs:
  - public/revelcon-logo.svg  (standalone SVG with paths)
  - prints the inline SVG block to stdout (for pasting into index.html)
"""

import math
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

# --- Configuration -----------------------------------------------------------
TEXT = "Revelcon"
FONT_PATH = "/tmp/opencode/stoke/Stoke.ttf"
VIEWBOX_W = 800
VIEWBOX_H = 200
AMPLITUDE = 10  # wave amplitude in px (subtle)
# ------------------------------------------------------------------------------


def glyph_to_path(font, char: str) -> tuple[str, float]:
    """Return (svg_path_d, advance_width) for a single character."""
    cmap = font.getBestCmap()
    glyph_name = cmap[ord(char)]
    glyph_set = font.getGlyphSet()
    glyph = glyph_set[glyph_name]
    pen = SVGPathPen(glyph_set)
    glyph.draw(pen)
    advance = glyph.width  # in font units
    return pen.getCommands(), advance


def build_svg() -> str:
    font = TTFont(FONT_PATH)
    units_per_em = font["head"].unitsPerEm
    # Scale so cap-height-ish letters fit ~100px tall in the viewBox.
    # Stoke cap-height ≈ 700 units, x-height ≈ 500 units.
    target_px = 100
    scale = target_px / units_per_em

    # Measure each glyph and compute x positions.
    paths = []
    advances = []
    for ch in TEXT:
        d, adv = glyph_to_path(font, ch)
        paths.append(d)
        advances.append(adv)

    # Total advance width in font units, then scaled.
    total_units = sum(advances)
    total_px = total_units * scale

    # Center horizontally with 10% margin (content area = 80% of viewBox).
    margin_x = VIEWBOX_W * 0.10
    content_w = VIEWBOX_W - 2 * margin_x
    # If text is wider than content, scale down to fit.
    if total_px > content_w:
        scale *= content_w / total_px
        total_px = total_px * (content_w / total_px)  # = content_w

    start_x = (VIEWBOX_W - total_px) / 2
    # Baseline: place text so it sits visually centered (cap-height ~ 0.7 of em).
    baseline_y = VIEWBOX_H / 2 + (units_per_em * 0.35) * scale

    # Wave offsets (sinusoid, first letter at 0, peak in middle).
    n = len(TEXT)
    offsets = [-AMPLITUDE * math.sin(i * math.pi / (n - 1)) for i in range(n)]

    # Build path elements.
    path_elements = []
    cursor = start_x
    for i, (d, adv) in enumerate(zip(paths, advances)):
        x = cursor
        y = baseline_y + offsets[i]
        # transform: translate to (x, y) and scale (font coords are Y-up,
        # SVG is Y-down, so flip Y).
        path_elements.append(
            f'    <path transform="translate({x:.2f} {y:.2f}) scale({scale:.5f} {-scale:.5f})" d="{d}"/>'
        )
        cursor += adv * scale

    paths_block = "\n".join(path_elements)

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEWBOX_W} {VIEWBOX_H}" width="{VIEWBOX_W}" height="{VIEWBOX_H}">
  <defs>
    <linearGradient id="titleGold" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff8dc"/>
      <stop offset="50%" stop-color="#f5e6a8"/>
      <stop offset="100%" stop-color="#a37a2c"/>
    </linearGradient>
    <filter id="titleGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="0.8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <g filter="url(#titleGlow)" fill="url(#titleGold)">
{paths_block}
  </g>
</svg>
'''


if __name__ == "__main__":
    svg = build_svg()
    out = "public/revelcon-logo.svg"
    with open(out, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"Wrote {out} ({len(svg)} bytes)")
    print("---")
    print(svg)
