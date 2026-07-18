#!/usr/bin/env python3
"""Génère les assets de l'app (icône, icône adaptative, splash, favicon).

Thème sombre néon : empilement de linge plié en dégradé cyan -> violet -> magenta.
Régénère avec :  python3 scripts/gen-assets.py
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)

BG = (10, 10, 20, 255)          # #0A0A14
CYAN = (34, 227, 255)           # #22E3FF
VIOLET = (138, 92, 255)         # #8A5CFF
MAGENTA = (255, 47, 208)        # #FF2FD0


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size, stops):
    """Dégradé diagonal 3 couleurs, renvoie une image RGB."""
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (x / w + y / h) / 2
            if t < 0.5:
                c = lerp(stops[0], stops[1], t / 0.5)
            else:
                c = lerp(stops[1], stops[2], (t - 0.5) / 0.5)
            px[x, y] = c
    return img


def rounded_mask(size, box, radius):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle(box, radius=radius, fill=255)
    return m


def radial_glow(size, center, color, max_alpha, radius):
    w, h = size
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    px = glow.load()
    cx, cy = center
    for y in range(h):
        for x in range(w):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if d < radius:
                a = int(max_alpha * (1 - d / radius) ** 2)
                px[x, y] = (color[0], color[1], color[2], a)
    return glow


def draw_mark(size, scale=1.0):
    """Empilement de 3 barres arrondies (linge plié) en dégradé néon, transparent."""
    S = size
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    grad = gradient((S, S), [CYAN, VIOLET, MAGENTA]).convert("RGBA")

    mask = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(mask)

    cx = S / 2
    bar_h = S * 0.13 * scale
    gap = S * 0.055 * scale
    widths = [0.56, 0.46, 0.36]  # décroissantes -> effet de pile pliée
    total_h = len(widths) * bar_h + (len(widths) - 1) * gap
    y = (S - total_h) / 2
    for wfrac in widths:
        bw = S * wfrac * scale
        d.rounded_rectangle(
            [cx - bw / 2, y, cx + bw / 2, y + bar_h],
            radius=bar_h / 2,
            fill=255,
        )
        y += bar_h + gap

    layer.paste(grad, (0, 0), mask)
    return layer


def make_icon(path, S=1024, with_bg=True):
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    if with_bg:
        bg = Image.new("RGBA", (S, S), BG)
        # halos néon
        bg.alpha_composite(radial_glow((S, S), (S * 0.28, S * 0.3), CYAN, 90, S * 0.55))
        bg.alpha_composite(radial_glow((S, S), (S * 0.75, S * 0.72), MAGENTA, 80, S * 0.55))
        mask = rounded_mask((S, S), [0, 0, S, S], radius=int(S * 0.22))
        rounded = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        rounded.paste(bg, (0, 0), mask)
        img = rounded
    img.alpha_composite(draw_mark(S, scale=1.0 if with_bg else 0.82))
    img.save(path)
    print("wrote", os.path.relpath(path))


def make_splash(path, S=1284):
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))  # transparent -> backgroundColor via app.json
    img.alpha_composite(draw_mark(S, scale=0.55))
    img.save(path)
    print("wrote", os.path.relpath(path))


def make_favicon(path, S=64):
    src = Image.open(os.path.join(OUT, "icon.png")).resize((S, S), Image.LANCZOS)
    src.save(path)
    print("wrote", os.path.relpath(path))


make_icon(os.path.join(OUT, "icon.png"), 1024, with_bg=True)
make_icon(os.path.join(OUT, "adaptive-icon.png"), 1024, with_bg=False)
make_splash(os.path.join(OUT, "splash.png"), 1284)
make_favicon(os.path.join(OUT, "favicon.png"), 64)
print("done")
