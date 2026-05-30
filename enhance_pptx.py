#!/usr/bin/env python3
"""
Transformation du PowerPoint La_ballade.pptx
Thème: Partitions musicales anciennes / style parchemin vintage
"""

import io, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pptx import Presentation
from lxml import etree

IMG_W, IMG_H = 1920, 1080

# Palette de couleurs vintage
PARCH    = (232, 212, 158)   # Parchemin de base
STAFF_C  = (100, 62, 18)     # Lignes de portée (encre brune)
NOTE_C   = (68, 40, 8)       # Notes de musique (encre foncée)
BORDER_C = (82, 48, 10)      # Bordures ornementales


# ─── Texture Parchemin ───────────────────────────────────────────────────────

def parchment(seed=0):
    rng = np.random.RandomState(seed)

    # Base couleur parchemin
    arr = np.full((IMG_H, IMG_W, 3), PARCH, dtype=np.float32)

    def scaled_noise(h, w, sigma, scale, rng):
        """Bruit lisse à différentes échelles"""
        n = rng.randn(h, w).astype(np.float32) * scale
        img = Image.fromarray(np.clip(n + 128, 0, 255).astype(np.uint8), mode='L')
        img = img.resize((IMG_W, IMG_H), Image.BILINEAR)
        img = img.filter(ImageFilter.GaussianBlur(sigma))
        return np.array(img, dtype=np.float32) - 128

    # Variation grande échelle (variation du papier)
    n1 = scaled_noise(IMG_H // 12, IMG_W // 12, 10, 30, rng)
    # Variation moyenne (grain du papier)
    n2 = scaled_noise(IMG_H // 4,  IMG_W // 4,   4, 14, rng)
    # Grain fin
    n3 = rng.randn(IMG_H, IMG_W).astype(np.float32) * 5

    combo = n1 + n2 + n3
    arr[:, :, 0] += combo * 0.88
    arr[:, :, 1] += combo * 0.72
    arr[:, :, 2] += combo * 0.40

    # Vignette (bords plus sombres = aspect vieilli)
    x = np.linspace(-1, 1, IMG_W)
    y = np.linspace(-1, 1, IMG_H)
    xv, yv = np.meshgrid(x, y)
    vign = 1.0 - np.clip(xv ** 2 * 0.58 + yv ** 2 * 0.62, 0, 0.52)
    arr *= vign[:, :, np.newaxis]

    # Fibres horizontales du papier
    for _ in range(rng.randint(45, 75)):
        fy = int(rng.randint(0, IMG_H - 1))
        fl = int(rng.randint(80, 750))
        fx = int(rng.randint(0, max(1, IMG_W - fl)))
        arr[fy, fx: fx + fl, :] *= rng.uniform(0.93, 0.98)

    # Fibres verticales (plus légères)
    for _ in range(rng.randint(15, 35)):
        fx = int(rng.randint(0, IMG_W - 1))
        fl = int(rng.randint(40, 320))
        fy = int(rng.randint(0, max(1, IMG_H - fl)))
        arr[fy: fy + fl, fx, :] *= rng.uniform(0.95, 0.99)

    arr = np.clip(arr, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    img = img.filter(ImageFilter.GaussianBlur(0.7))
    return img


# ─── Éléments Musicaux ───────────────────────────────────────────────────────

def draw_staff(draw, x1, x2, yc, sp=11):
    """Portée musicale (5 lignes) centrée en yc"""
    for k in range(5):
        y = yc + (k - 2) * sp
        draw.line([(x1, y), (x2, y)], fill=STAFF_C, width=1)


def draw_clef(draw, x, y, s=1.0):
    """Clé de sol simplifiée"""
    c = NOTE_C
    lw = max(1, round(2 * s))
    # Tige verticale
    draw.line([(x, y - round(40 * s)), (x, y + round(34 * s))],
              fill=c, width=lw)
    # Cercle (ligne Sol)
    draw.ellipse([x - round(12 * s), y - round(11 * s),
                  x + round(12 * s), y + round(11 * s)],
                 outline=c, width=lw)
    # Arc du haut (spirale)
    draw.arc([x - round(14 * s), y - round(45 * s),
              x + round(10 * s), y - round(15 * s)],
             195, 75, fill=c, width=lw)
    # Pied (volute du bas)
    draw.arc([x - round(10 * s), y + round(22 * s),
              x + round(14 * s), y + round(38 * s)],
             85, 325, fill=c, width=lw)


def draw_note(draw, x, y, kind='q', s=1.0):
    """
    Dessine une note: q=noire, h=blanche, e=croche
    """
    c = NOTE_C
    hw = round(6 * s)
    hh = round(4 * s)
    lw = max(1, round(1.5 * s))
    sx = x + hw - 1

    if kind == 'h':  # Blanche (tête creuse)
        draw.ellipse([x - hw, y - hh, x + hw, y + hh],
                     outline=c, width=lw)
    else:            # Noire / croche (tête pleine)
        draw.ellipse([x - hw, y - hh, x + hw, y + hh], fill=c)

    # Hampe
    draw.line([(sx, y), (sx, y - round(30 * s))], fill=c, width=lw)

    # Crochet pour la croche
    if kind == 'e':
        sy = y - round(30 * s)
        pts = [
            (sx, sy),
            (sx + round(11 * s), sy + round(10 * s)),
            (sx + round(8 * s),  sy + round(20 * s)),
        ]
        for a, b in zip(pts, pts[1:]):
            draw.line([a, b], fill=c, width=lw)


def draw_sharp(draw, x, y, s=1.0):
    """Dièse (#)"""
    c = NOTE_C
    lw = max(1, round(1.5 * s))
    h = round(15 * s)
    w2 = round(5 * s)
    draw.line([(x - w2, y - h // 3), (x + w2, y - h // 3)], fill=c, width=lw)
    draw.line([(x - w2, y + h // 3), (x + w2, y + h // 3)], fill=c, width=lw)
    draw.line([(x - w2 // 2, y - h), (x - w2 // 2, y + h)], fill=c, width=lw)
    draw.line([(x + w2 // 2, y - h), (x + w2 // 2, y + h)], fill=c, width=lw)


def draw_flat(draw, x, y, s=1.0):
    """Bémol (b)"""
    c = NOTE_C
    lw = max(1, round(1.5 * s))
    draw.line([(x, y - round(20 * s)), (x, y + round(7 * s))],
              fill=c, width=lw)
    draw.arc([x, y - round(11 * s), x + round(9 * s), y + round(7 * s)],
             270, 90, fill=c, width=lw)


def draw_border(draw, w, h):
    """Double bordure ornementale avec losanges aux coins"""
    c = BORDER_C
    m = 20
    # Rect extérieur épais
    draw.rectangle([m, m, w - m, h - m], outline=c, width=3)
    # Rect intérieur fin
    draw.rectangle([m + 9, m + 9, w - m - 9, h - m - 9], outline=c, width=1)
    # Losanges aux quatre coins
    cd = 24
    for cx, cy in [(m, m), (w - m, m), (m, h - m), (w - m, h - m)]:
        pts = [(cx, cy - cd), (cx + cd, cy), (cx, cy + cd), (cx - cd, cy)]
        draw.polygon(pts, fill=c)
        draw.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=PARCH)


# ─── Décoration Complète ─────────────────────────────────────────────────────

def decorate(img, slide_num):
    draw = ImageDraw.Draw(img)
    w, h = img.size
    rng = random.Random(slide_num * 173 + 91)

    # --- Bordure ornementale ---
    draw_border(draw, w, h)

    sp = 11      # Espacement des lignes de portée
    kinds = ['q', 'h', 'e']

    for staff_y in (70, h - 82):
        # Portée sur toute la largeur
        draw_staff(draw, 42, w - 42, staff_y, sp)
        # Clé de sol
        draw_clef(draw, 58, staff_y + 6, s=1.5)

        # Notes sur la portée
        x = 105
        beat = 0
        while x < w - 58:
            ny = rng.choice([staff_y + d * sp for d in (-2, -1, 0, 1, 2)])
            nk = rng.choice(kinds)
            sc = rng.uniform(0.62, 0.78)
            draw_note(draw, x, ny, kind=nk, s=sc)

            # Altérations occasionnelles
            if rng.random() < 0.14:
                acc = rng.choice([draw_sharp, draw_flat])
                acc(draw, x - round(13 * sc), ny, s=sc * 0.75)

            x += rng.randint(22, 42)
            beat += 1

            # Barres de mesure tous les 4-5 temps
            if beat % rng.randint(4, 6) == 0:
                draw.line([(x, staff_y - 2 * sp), (x, staff_y + 2 * sp)],
                          fill=STAFF_C, width=1)
                x += 8

        # Double barre finale
        draw.line([(w - 53, staff_y - 2 * sp), (w - 53, staff_y + 2 * sp)],
                  fill=STAFF_C, width=1)
        draw.line([(w - 48, staff_y - 2 * sp), (w - 48, staff_y + 2 * sp)],
                  fill=STAFF_C, width=3)

    # --- Notes dans la marge gauche ---
    for _ in range(rng.randint(3, 6)):
        nx = rng.randint(32, 78)
        ny = rng.randint(130, h - 130)
        draw_note(draw, nx, ny,
                  kind=rng.choice(kinds),
                  s=rng.uniform(0.85, 1.15))

    # --- Notes dans la marge droite ---
    for _ in range(rng.randint(3, 6)):
        nx = rng.randint(w - 78, w - 32)
        ny = rng.randint(130, h - 130)
        draw_note(draw, nx, ny,
                  kind=rng.choice(kinds),
                  s=rng.uniform(0.85, 1.15))

    # --- Taches de vieillissement (uniquement dans les marges) ---
    for _ in range(rng.randint(10, 20)):
        sx = rng.randint(0, w - 1)
        sy = rng.randint(0, h - 1)
        if sx < 110 or sx > w - 110 or sy < 110 or sy > h - 110:
            size = rng.randint(3, 22)
            dark = rng.randint(20, 55)
            sc = tuple(max(0, c - dark) for c in PARCH)
            draw.ellipse([sx - size, sy - size, sx + size, sy + size], fill=sc)

    # --- Petite portée verticale (marge gauche, milieu) ---
    mid_y = h // 2
    for k in range(5):
        xv = 32 + k * 9
        draw.line([(xv, mid_y - 60), (xv, mid_y + 60)], fill=STAFF_C, width=1)
    for yv in range(mid_y - 60, mid_y + 65, 15):
        draw.line([(32, yv), (32 + 4 * 9, yv)], fill=STAFF_C, width=1)

    # Idem à droite
    for k in range(5):
        xv = w - 72 + k * 9
        draw.line([(xv, mid_y - 60), (xv, mid_y + 60)], fill=STAFF_C, width=1)
    for yv in range(mid_y - 60, mid_y + 65, 15):
        draw.line([(w - 72, yv), (w - 72 + 4 * 9, yv)], fill=STAFF_C, width=1)

    return img


# ─── Transitions ──────────────────────────────────────────────────────────────

NS = 'http://schemas.openxmlformats.org/presentationml/2006/main'

# (effet XML, vitesse)
TRANS = [
    ('<p:fade/>', 'slow'),               # 0  – Fondu lent (titres)
    ('<p:fade/>', 'med'),                # 1  – Fondu médium
    ('<p:dissolve/>', 'med'),            # 2  – Dissolution
    ('<p:wipe dir="r"/>', 'med'),        # 3  – Essuyage droite
    ('<p:wipe dir="u"/>', 'med'),        # 4  – Essuyage haut
    ('<p:blinds dir="horz"/>', 'med'),   # 5  – Store horizontal
    ('<p:wheel spokes="4"/>', 'slow'),   # 6  – Roue à 4 rayons
    ('<p:push dir="l"/>', 'med'),        # 7  – Poussée gauche
    ('<p:zoom dir="in"/>', 'med'),       # 8  – Zoom avant
    ('<p:checker dir="horz"/>', 'med'),  # 9  – Damier
    ('<p:zoom dir="out"/>', 'med'),      # 10 – Zoom arrière
    ('<p:split dir="in" orient="horz"/>', 'med'),  # 11 – Séparation
]

# Transition dédiée par diapositive (19 diapositives)
SLIDE_TRANS = [
    0,   # 1 – Titre principal → fondu lent
    6,   # 2 – Section → roue ornementale
    1,   # 3 – Définition → fondu
    3,   # 4 – Ballade médiévale → essuyage
    2,   # 5 – 18e/19e → dissolution
    7,   # 6 – Ballade instrumentale → poussée
    4,   # 7 – Structures → essuyage haut
    5,   # 8 – Compositeurs → store
    0,   # 9 – Section Chopin → fondu lent
    1,   # 10 – Présentation pièce → fondu
    3,   # 11 – Analyse → essuyage
    8,   # 12 – Intro → zoom
    2,   # 13 – Thème A → dissolution
    7,   # 14 – Thème B1 → poussée
    11,  # 15 – Thème B2 → séparation
    4,   # 16 – Thème A' → essuyage haut
    9,   # 17 – Pont 2 → damier
    10,  # 18 – Coda → zoom arrière
    0,   # 19 – Sources → fondu lent
]


def set_transition(slide, idx):
    ti = SLIDE_TRANS[idx] if idx < len(SLIDE_TRANS) else idx % len(TRANS)
    effect, spd = TRANS[ti]
    xml = f'<p:transition xmlns:p="{NS}" spd="{spd}">{effect}</p:transition>'
    elem = etree.fromstring(xml)

    sld = slide._element
    old = sld.find(f'{{{NS}}}transition')
    if old is not None:
        sld.remove(old)
    timing = sld.find(f'{{{NS}}}timing')
    if timing is not None:
        timing.addprevious(elem)
    else:
        sld.append(elem)


# ─── Application du fond ─────────────────────────────────────────────────────

def apply_background(prs, slide, img):
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=92)
    buf.seek(0)

    pic = slide.shapes.add_picture(
        buf, 0, 0,
        width=prs.slide_width,
        height=prs.slide_height
    )
    # Placer en arrière-plan (z-index 0)
    sp = slide.shapes._spTree
    sp.remove(pic._element)
    sp.insert(2, pic._element)


# ─── Génération par type de diapositive ──────────────────────────────────────

# Slides spéciales (index 0-based) : fond plus sombre / plus orné
SECTION_SLIDES = {0, 1, 8}   # Titre, "Définition…", "Étude Chopin"


def make_background(slide_num, total):
    seed = slide_num * 47 + 19
    img = parchment(seed=seed)

    # Les diapositives de section ont un parchemin légèrement plus foncé
    if slide_num in SECTION_SLIDES:
        arr = np.array(img, dtype=np.float32) * 0.88
        arr = np.clip(arr, 0, 255).astype(np.uint8)
        img = Image.fromarray(arr)

    img = decorate(img, slide_num)
    return img


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    src = '/home/user/SAMPLE1/La_ballade.pptx'
    dst = '/home/user/SAMPLE1/La_ballade_vintage.pptx'

    print('Chargement du PowerPoint…')
    prs = Presentation(src)
    n = len(prs.slides)
    print(f'→ {n} diapositives trouvées\n')

    for i, slide in enumerate(prs.slides):
        label = 'section' if i in SECTION_SLIDES else 'contenu'
        print(f'  [{i+1:02d}/{n}] Diapositive {i+1} ({label})…')
        bg = make_background(i, n)
        apply_background(prs, slide, bg)
        set_transition(slide, i)

    prs.save(dst)
    print(f'\n✓ Fichier sauvegardé : {dst}')


if __name__ == '__main__':
    main()
