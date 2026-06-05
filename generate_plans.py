#!/usr/bin/env python3
"""Generate Maison Saint Joseph — 10 Layout Variants as HTML.

Features:
  - Surface areas (m²) per zone per variant
  - Toggle overlay of existing architect floor plan images
  - 10 colour-coded variants × 4 floor plans + perspective view each
"""

# ─── Palette ─────────────────────────────────────────────────────────────────
CA   = "#F4A261"   # Orange  – Espaces communs MSJ
CB   = "#457B9D"   # Bleu    – Hébergement résidents
CC   = "#52B788"   # Vert    – Appartement couple gérant
CA_D = "#C47A3A"
CB_D = "#2E5E7E"
CC_D = "#2E8A5A"
ROOF  = "#4A4A5A"
ROOF2 = "#3A3A4A"
WIN   = "#A8D4E6"
GND   = "#C4D4A0"
WALL  = "#E8E4DC"

ZONE_COLOR = {'A': CA,   'B': CB,   'C': CC}
ZONE_DARK  = {'A': CA_D, 'B': CB_D, 'C': CC_D}
ZONE_LABEL = {'A': 'Communs', 'B': 'Héberg.', 'C': 'Apt.'}

# ─── Approximate usable areas per floor section (m²) ─────────────────────────
# Based on Esquisse N°3 room schedules — 5 horizontal sections left→right
# RDC: SAM03+SAM2+Chauf. | Cuisine+Office+Salon | SAM01+Oratoire | Salon/Biblio | Bureau+Ch01+Ch02
# R+1/R+2: Pce101-102 | Ch11-12 | Ch13-10+Esc | Ch09-03 | Ch04-08+WC
# Combles: Salle02 left | Salle02 right | Esc+Ch28 | Combles01 left | Combles01 right
SECTION_AREAS = {
    'RDC':     [72,  42,  70,  68,  40],   # 292 m²
    'R+1':     [48,  46,  52,  58,  72],   # 276 m²
    'R+2':     [48,  46,  52,  58,  72],   # 276 m²
    'Combles': [60,  62,  22,  52,  54],   # 250 m²
}
# Grand total: 1 094 m² net usable

# Room labels per floor × 5 sections
ROOMS = {
    'RDC':     [['SAM03','SAM2+Chauf.'],['Cuisine','Office+Salon'],
                ['SAM01','Oratoire'],   ['Salon','Bibliothèque'],  ['Bureau','Ch01-02']],
    'R+1':     [['Pce101','Pce102'],    ['Ch12','Ch11'],
                ['Ch13','Ch10'],        ['Ch03','Ch09'],           ['Ch04-05','Ch06-08']],
    'R+2':     [['Ch25','Ch24'],        ['Ch26','Ch23'],
                ['Ch27','Ch22'],        ['Ch14','Ch19'],           ['Ch15-16','Ch17-18']],
    'Combles': [['Salle02',''],         ['Salle02',''],
                ['Esc.01','Ch28'],      ['Combles01',''],          ['Combles01','']],
}

FLOOR_H    = {'Combles': 22, 'R+2': 38, 'R+1': 38, 'RDC': 32}  # px in perspective
FLOOR_ORDER = ['Combles', 'R+2', 'R+1', 'RDC']

# Image paths (relative to HTML file) + building extents within the PNG
# Extents: (x_left%, y_top%, x_right%, y_bottom%) as fractions of image size
PLAN_IMAGES = {
    'RDC':     ('plans/rdc.png',     0.02, 0.08, 0.69, 0.86),
    'R+1':     ('plans/r1.png',      0.02, 0.05, 0.69, 0.90),
    'R+2':     ('plans/r2.png',      0.02, 0.05, 0.69, 0.90),
    'Combles': ('plans/combles.png', 0.02, 0.07, 0.69, 0.87),
}

# ─── 10 Variants ─────────────────────────────────────────────────────────────
VARIANTS = [
    dict(n=1, name="Appartement Aile Droite — R+1",
         desc=("L'appartement du couple (≈ 70 m², 5 pièces) occupe l'aile droite du 1er étage. "
               "Le RDC entier forme les espaces communs : cuisine, SAM, salon, bibliothèque, "
               "oratoire et bureau d'accueil. L'hébergement (8–10 chambres) occupe le reste du R+1 "
               "et la totalité du R+2. Les combles sont aménagés en ateliers d'activités (mosaïque, bois...)."),
         pros="Séparation claire vie commune / privée · Appartement bien ventilé en étage",
         cons="Couple et résidents partagent le même palier au R+1",
         floors={'RDC':['A','A','A','A','A'], 'R+1':['B','B','B','C','C'],
                 'R+2':['B','B','B','B','B'], 'Combles':['A','A','A','A','A']}),

    dict(n=2, name="Appartement Aile Droite — R+2",
         desc=("Même logique que V1, mais l'appartement monte d'un étage. Le R+1 entier "
               "(jusqu'à 14 chambres) est dédié aux résidents — capacité maximale. "
               "Le couple bénéficie d'une vue dégagée sur le parc de l'abbaye depuis le 2ème étage. "
               "Les combles restent en espace commun d'activités."),
         pros="Capacité d'hébergement maximale au R+1 · Vue dégagée pour le couple",
         cons="Couple plus éloigné de la vie quotidienne de la Maison",
         floors={'RDC':['A','A','A','A','A'], 'R+1':['B','B','B','B','B'],
                 'R+2':['B','B','B','C','C'], 'Combles':['A','A','A','A','A']}),

    dict(n=3, name="Duplex Bas — RDC + R+1 Droit",
         desc=("L'appartement est un duplex sur deux niveaux : entrée et bureau au RDC droit "
               "(Ch01-02 existants), séjour et chambres au R+1 droit. "
               "Entrée indépendante possible depuis l'extérieur. "
               "L'hébergement occupe le R+1 gauche et tout le R+2 (10–12 chambres)."),
         pros="Entrée indépendante · Duplex familial avec espace extérieur",
         cons="Appartement occupe des espaces communs potentiels au RDC",
         floors={'RDC':['A','A','A','C','C'], 'R+1':['B','B','B','C','C'],
                 'R+2':['B','B','B','B','B'], 'Combles':['A','A','A','A','A']}),

    dict(n=4, name="Duplex Haut — R+2 + Combles Droite",
         desc=("L'appartement est en hauteur : aile droite du R+2 et combles droits (sous les lucarnes). "
               "Accès par l'escalier droit ou ascenseur prévu. Intimité maximale avec vue panoramique. "
               "R+1 et R+2 gauche entièrement dédiés à l'hébergement (12 chambres)."),
         pros="Intimité maximale · Vue panoramique · Beau duplex sous les toits",
         cons="Couple plus éloigné des résidents · Combles à aménager",
         floors={'RDC':['A','A','A','A','A'], 'R+1':['B','B','B','B','B'],
                 'R+2':['B','B','B','C','C'], 'Combles':['A','A','A','C','C']}),

    dict(n=5, name="Penthouse — Combles Entiers",
         desc=("Les combles entiers (≈ 247 m²) forment un grand appartement de caractère "
               "sous le toit mansardé, avec les lucarnes comme fenêtres. "
               "R+1 et R+2 entiers (≈ 28 chambres potentielles) pour les résidents. "
               "Nécessite un aménagement complet des combles — concept d'exception."),
         pros="Logement généreux et lumineux · Capacité maximale pour les résidents",
         cons="Travaux combles importants · Accès uniquement par escalier",
         floors={'RDC':['A','A','A','A','A'], 'R+1':['B','B','B','B','B'],
                 'R+2':['B','B','B','B','B'], 'Combles':['C','C','C','C','C']}),

    dict(n=6, name="Appartement Aile Gauche — R+1",
         desc=("L'appartement occupe l'aile gauche du R+1 (Pièces 101-102 existantes + zones adjacentes, "
               "≈ 56 m²). Ces espaces sont déjà partiellement séparés dans les plans existants. "
               "Le reste du R+1 (8 chambres) et tout le R+2 (14 chambres) accueillent les résidents."),
         pros="S'appuie sur la division existante des plans · Discrète",
         cons="Appartement plus petit · Côté nord moins lumineux",
         floors={'RDC':['A','A','A','A','A'], 'R+1':['C','C','B','B','B'],
                 'R+2':['B','B','B','B','B'], 'Combles':['A','A','A','A','A']}),

    dict(n=7, name="Bande Verticale Gauche — Traversante",
         desc=("L'appartement forme une bande verticale sur toute la hauteur du côté gauche : "
               "rez-de-chaussée, 1er, 2ème étage et combles. Accès indépendant depuis le côté nord "
               "(accès cuisine existant). Concept architectural fort avec une circulation privée verticale dédiée."),
         pros="Accès entièrement indépendant · Très bonne séparation",
         cons="Nécessite une circulation privée sur 4 niveaux · Appartement linéaire",
         floors={'RDC':['C','A','A','A','A'], 'R+1':['C','B','B','B','B'],
                 'R+2':['C','B','B','B','B'], 'Combles':['C','A','A','A','A']}),

    dict(n=8, name="Logement de Fonction — RDC Coin Droit",
         desc=("L'appartement du couple est entièrement au RDC droit (Ch01, Ch02, bureau existants, ≈ 58 m²). "
               "Configuration de type 'logement de gardien' : le couple est au cœur de l'accueil, "
               "accessible en permanence. Idéal pour les premières années. "
               "R+1 et R+2 entiers pour les résidents (14 ch/étage)."),
         pros="Couple au cœur de la vie · Simple à réaliser · Accès direct",
         cons="Moins d'intimité pour le couple · Appartement au rez-de-chaussée uniquement",
         floors={'RDC':['A','A','A','C','C'], 'R+1':['B','B','B','B','B'],
                 'R+2':['B','B','B','B','B'], 'Combles':['A','A','A','A','A']}),

    dict(n=9, name="Grand Appartement Familial — R+1 + R+2 Droit",
         desc=("L'appartement s'étend sur deux étages côté droit (≈ 110 m²) : idéal pour un couple avec enfants. "
               "Séjour/cuisine au R+1, chambres au R+2. "
               "L'hébergement est concentré sur la partie gauche des deux étages (8–10 chambres)."),
         pros="Appartement spacieux et familial · Clair sur 2 niveaux",
         cons="Réduit la capacité d'hébergement · Appartement non contiguë avec RDC",
         floors={'RDC':['A','A','A','A','A'], 'R+1':['B','B','B','C','C'],
                 'R+2':['B','B','B','C','C'], 'Combles':['A','A','A','A','A']}),

    dict(n=10, name="Tour Verticale Droite — 4 Niveaux",
         desc=("L'appartement occupe la dernière section droite sur les 4 niveaux (≈ 82 m²) : "
               "entrée/SDB au RDC, cuisine/séjour au R+1, chambres au R+2, bureau/détente dans les combles. "
               "L'escalier de droite est privatisé. Concept d'appartement-tour discret mais bien délimité."),
         pros="Appartement sur toute la hauteur · Escalier privatif · Belle vue",
         cons="Appartement étroit (une section) · Circulation verticale à concevoir",
         floors={'RDC':['A','A','A','A','C'], 'R+1':['B','B','B','B','C'],
                 'R+2':['B','B','B','B','C'], 'Combles':['A','A','A','A','C']}),
]

# ─── Surface calculator ───────────────────────────────────────────────────────
def compute_areas(floors):
    totals = {'A': 0, 'B': 0, 'C': 0}
    floor_totals = {}
    for fl, secs in floors.items():
        ft = {'A': 0, 'B': 0, 'C': 0}
        areas = SECTION_AREAS[fl]
        for i, z in enumerate(secs):
            totals[z] += areas[i]
            ft[z]     += areas[i]
        floor_totals[fl] = ft
    return totals, floor_totals

# ─── Corridor layout parameters per floor ────────────────────────────────────
# R+1 & R+2 have a genuine central corridor. RDC has circulation but no linear
# corridor. Combles are open-plan with no corridor.
FLOOR_LAYOUT = {
    # floor → (SH_north, SH_corr, SH_south)
    'RDC':     (20, 6, 20),   # circulation path, thinner band
    'R+1':     (21, 11, 21),  # clear central corridor full length
    'R+2':     (21, 11, 21),
    'Combles': (46, 0,  0),   # single open-plan row, no corridor
}

# Staircase position: (section_index_0based, label)
# Esc 02 ≈ at section 1 left edge, Esc 01 ≈ at section 3 left edge
ESC_POSITIONS = {
    'R+1': [(1, 'Esc02'), (3, 'Esc01')],
    'R+2': [(1, 'Esc02'), (3, 'Esc01')],
    'RDC': [(1, 'Esc02'), (3, 'Esc01')],
}

# ─── SVG: schematic floor plan ────────────────────────────────────────────────
def floor_svg(floor_name, sections, vid, fid):
    SW       = 58
    MX, MY   = 4, 8
    sn, sc, ss = FLOOR_LAYOUT[floor_name]       # north/corr/south heights
    SH_ZONE  = sn + sc + ss                      # total zone band height
    W        = MX * 2 + SW * 5
    H        = MY + SH_ZONE + 22                 # + label area

    img_path, xl, yt, xr, yb = PLAN_IMAGES[floor_name]
    sid      = f"v{vid}-{fid}"

    # Image crop: scale so building portion fills the zone band
    zone_w        = SW * 5
    img_display_w = zone_w / (xr - xl)
    img_display_h = SH_ZONE / (yb - yt)
    img_offset_x  = MX - xl * img_display_w
    img_offset_y  = MY - yt * img_display_h

    o = []
    o.append(f'<svg id="{sid}" viewBox="0 0 {W} {H}" '
             f'xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">')
    o.append(f'<defs><clipPath id="cp-{sid}">'
             f'<rect x="{MX}" y="{MY}" width="{zone_w}" height="{SH_ZONE}"/>'
             f'</clipPath></defs>')
    o.append(f'<rect width="{W}" height="{H}" fill="#f8f8f6" rx="3"/>')

    # Background plan image (opacity=0 by default, JS slider controls it)
    o.append(f'<image id="{sid}-bg" clip-path="url(#cp-{sid})" '
             f'href="{img_path}" x="{img_offset_x:.1f}" y="{img_offset_y:.1f}" '
             f'width="{img_display_w:.1f}" height="{img_display_h:.1f}" '
             f'preserveAspectRatio="none" opacity="0"/>')

    # ── Zone room rectangles ──────────────────────────────────────────────────
    o.append(f'<g id="{sid}-zones">')
    rooms = ROOMS.get(floor_name, [['', '']]*5)
    areas = SECTION_AREAS[floor_name]

    for i, z in enumerate(sections):
        x = MX + i * SW
        c = ZONE_COLOR[z]
        d = ZONE_DARK[z]
        area = areas[i]
        lbl_n = rooms[i][0] if rooms[i] else ''
        lbl_s = rooms[i][1] if len(rooms[i]) > 1 else ''

        if sc > 0:
            # ── North row ────────────────────────────────────────────────────
            yn = MY
            o.append(f'<rect class="zrect" x="{x+1}" y="{yn+1}" width="{SW-2}" height="{sn-1}" '
                     f'fill="{c}" stroke="{d}" stroke-width="1.5" opacity="1" '
                     f'style="rx:2px 2px 0 0"/>')
            if lbl_n:
                o.append(f'<text x="{x+SW//2}" y="{yn+sn//2+3}" text-anchor="middle" '
                         f'font-size="6.5" font-family="sans-serif" fill="rgba(255,255,255,.92)">{lbl_n}</text>')

            # ── South row ────────────────────────────────────────────────────
            ys = MY + sn + sc
            o.append(f'<rect class="zrect" x="{x+1}" y="{ys}" width="{SW-2}" height="{ss-1}" '
                     f'fill="{c}" stroke="{d}" stroke-width="1.5" opacity="1" '
                     f'style="rx:0 0 2px 2px"/>')
            if lbl_s:
                o.append(f'<text x="{x+SW//2}" y="{ys+ss//2+3}" text-anchor="middle" '
                         f'font-size="6.5" font-family="sans-serif" fill="rgba(255,255,255,.92)">{lbl_s}</text>')

            # area label (small, in south row bottom)
            o.append(f'<text x="{x+SW//2}" y="{ys+ss-2}" text-anchor="middle" '
                     f'font-size="6" font-family="sans-serif" fill="rgba(255,255,255,.7)">{area}m²</text>')
        else:
            # Single row (Combles: no corridor)
            o.append(f'<rect class="zrect" x="{x+1}" y="{MY+1}" width="{SW-2}" height="{sn-2}" '
                     f'fill="{c}" stroke="{d}" stroke-width="1.5" rx="2" opacity="1"/>')
            if lbl_n:
                o.append(f'<text x="{x+SW//2}" y="{MY+sn//2}" text-anchor="middle" '
                         f'font-size="6.5" font-family="sans-serif" fill="rgba(255,255,255,.9)">{lbl_n}</text>')
            if lbl_s:
                o.append(f'<text x="{x+SW//2}" y="{MY+sn//2+10}" text-anchor="middle" '
                         f'font-size="6" font-family="sans-serif" fill="rgba(255,255,255,.8)">{lbl_s}</text>')
            o.append(f'<text x="{x+SW//2}" y="{MY+sn-4}" text-anchor="middle" '
                     f'font-size="6.5" font-weight="bold" font-family="sans-serif" '
                     f'fill="rgba(255,255,255,.85)">{ZONE_LABEL[z]} · {area}m²</text>')

    o.append('</g>')

    # ── Corridor band (R+1 and R+2 — and thin band for RDC) ──────────────────
    if sc > 0:
        yc = MY + sn
        # Corridor fill (neutral, unzoned — it serves all zones)
        o.append(f'<rect x="{MX}" y="{yc}" width="{zone_w}" height="{sc}" '
                 f'fill="#E5E0D8" stroke="#BBB5AD" stroke-width="0.5"/>')

        # "COULOIR" label (centered, italic)
        if sc >= 9:
            o.append(f'<text x="{MX + zone_w//2}" y="{yc + sc//2 + 3}" '
                     f'text-anchor="middle" font-size="6.5" font-style="italic" '
                     f'font-family="sans-serif" fill="#888">couloir</text>')

        # Staircase markers in corridor
        for esc_sec, esc_lbl in ESC_POSITIONS.get(floor_name, []):
            ex = MX + esc_sec * SW - 10
            o.append(f'<rect x="{ex}" y="{yc+1}" width="20" height="{sc-2}" '
                     f'fill="#C8B89A" stroke="#8A7A60" stroke-width="1" rx="1"/>')
            o.append(f'<text x="{ex+10}" y="{yc + sc//2 + 3}" text-anchor="middle" '
                     f'font-size="5.5" font-weight="bold" font-family="sans-serif" fill="#555">{esc_lbl}</text>')

        # Door symbols at zone-boundary crossings in the corridor
        prev = sections[0]
        for i in range(1, 5):
            cur = sections[i]
            if cur != prev:
                dx = MX + i * SW
                # Dashed partition line through full height
                o.append(f'<line x1="{dx}" y1="{MY}" x2="{dx}" y2="{MY+SH_ZONE}" '
                         f'stroke="#333" stroke-width="2.5" stroke-dasharray="3,2" opacity=".7"/>')
                # Door symbol in corridor: small brown rectangle
                o.append(f'<rect x="{dx-4}" y="{yc+2}" width="8" height="{sc-4}" '
                         f'fill="#7A5040" stroke="#4A2810" stroke-width="1" rx="1"/>')
                # "Porte" label
                o.append(f'<text x="{dx}" y="{yc+sc+8}" text-anchor="middle" '
                         f'font-size="5" font-family="sans-serif" fill="#7A5040">▮ porte</text>')
            prev = cur

    # ── Zone labels below building (one per section) ──────────────────────────
    for i, z in enumerate(sections):
        x = MX + i * SW
        c = ZONE_COLOR[z]
        d = ZONE_DARK[z]
        o.append(f'<rect x="{x+2}" y="{MY+SH_ZONE+2}" width="{SW-4}" height="8" '
                 f'fill="{c}" opacity=".85" rx="1"/>')
        o.append(f'<text x="{x+SW//2}" y="{MY+SH_ZONE+9}" text-anchor="middle" '
                 f'font-size="6" font-weight="bold" font-family="sans-serif" fill="white">'
                 f'Zone {z}</text>')

    # ── Building outline + vertical section dividers ──────────────────────────
    o.append(f'<rect x="{MX}" y="{MY}" width="{zone_w}" height="{SH_ZONE}" '
             f'fill="none" stroke="#444" stroke-width="2" rx="2"/>')
    for i in range(1, 5):
        lx = MX + i * SW
        o.append(f'<line x1="{lx}" y1="{MY}" x2="{lx}" y2="{MY+SH_ZONE}" '
                 f'stroke="#555" stroke-width="0.6" opacity=".5"/>')

    # ── Floor label ───────────────────────────────────────────────────────────
    ly = MY + SH_ZONE + 19
    o.append(f'<text x="{W//2}" y="{ly}" text-anchor="middle" font-size="10" '
             f'font-weight="bold" font-family="sans-serif" fill="#333">{floor_name}</text>')

    o.append('</svg>')
    return ''.join(o)


# ─── SVG: perspective view ────────────────────────────────────────────────────
def persp_svg(floors):
    W, H    = 420, 210
    FX, FW  = 18, 300
    FBOT    = 178
    DX, DY  = 55, -26

    o = [f'<svg viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">']
    o.append('<defs><linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1">'
             '<stop offset="0%" stop-color="#B8D8F0"/>'
             '<stop offset="100%" stop-color="#D6EAF8"/></linearGradient></defs>')
    o.append(f'<rect width="{W}" height="{H}" fill="url(#skyg)"/>')

    gnd_pts = f"0,{H} {W},{H} {W},{FBOT+8} {FX+FW+DX},{FBOT+DY+8} {FX},{FBOT+8}"
    o.append(f'<polygon points="{gnd_pts}" fill="{GND}" opacity=".85"/>')

    ftop  = FBOT - sum(FLOOR_H.values())
    sw    = FW // 5
    y_cur = FBOT

    for fl in FLOOR_ORDER:
        fh   = FLOOR_H[fl]
        secs = floors[fl]

        for si, z in enumerate(secs):
            x = FX + si * sw
            y = y_cur - fh
            c = ZONE_COLOR[z]
            d = ZONE_DARK[z]
            o.append(f'<rect x="{x}" y="{y}" width="{sw}" height="{fh}" fill="{c}" stroke="{d}" stroke-width=".4"/>')
            if fl == 'Combles':
                wx, wy, ww, wh = x+sw//3, y+4, sw//4, fh-7
            else:
                wx, wy, ww, wh = x+sw//5, y+6, sw*3//5, fh-12
            o.append(f'<rect x="{wx}" y="{wy}" width="{ww}" height="{wh}" fill="{WIN}" '
                     f'stroke="white" stroke-width=".8" opacity=".75"/>')
            if fl != 'Combles':
                o.append(f'<line x1="{wx+ww//2}" y1="{wy}" x2="{wx+ww//2}" y2="{wy+wh}" '
                         f'stroke="white" stroke-width=".5" opacity=".6"/>')

        # right face
        z_r = secs[-1]
        c_r = ZONE_COLOR[z_r]
        d_r = ZONE_DARK[z_r]
        pts = (f"{FX+FW},{y_cur} {FX+FW+DX},{y_cur+DY} "
               f"{FX+FW+DX},{y_cur-fh+DY} {FX+FW},{y_cur-fh}")
        o.append(f'<polygon points="{pts}" fill="{c_r}" opacity=".55" stroke="{d_r}" stroke-width=".4"/>')
        y_cur -= fh

    # front border
    o.append(f'<rect x="{FX}" y="{ftop}" width="{FW}" height="{FBOT-ftop}" fill="none" stroke="#333" stroke-width="2"/>')
    y_cur = FBOT
    for fl in FLOOR_ORDER[:-1]:
        y_cur -= FLOOR_H[fl]
        o.append(f'<line x1="{FX}" y1="{y_cur}" x2="{FX+FW}" y2="{y_cur}" stroke="#333" stroke-width=".8" opacity=".6"/>')
    for i in range(1, 5):
        lx = FX + i * sw
        o.append(f'<line x1="{lx}" y1="{ftop}" x2="{lx}" y2="{FBOT}" stroke="#555" stroke-width=".5" opacity=".4"/>')

    # right face border
    pts_s = (f"{FX+FW},{FBOT} {FX+FW+DX},{FBOT+DY} "
             f"{FX+FW+DX},{ftop+DY} {FX+FW},{ftop}")
    o.append(f'<polygon points="{pts_s}" fill="none" stroke="#333" stroke-width="2"/>')

    # mansard roof
    ro = 18
    rmid  = ftop - 14
    rridge= ftop - 30
    o.append(f'<polygon points="{FX},{ftop} {FX+ro},{rmid} {FX+FW-ro},{rmid} {FX+FW},{ftop}" '
             f'fill="{ROOF}" stroke="#222" stroke-width="1.2"/>')
    o.append(f'<polygon points="{FX+ro},{rmid} {FX+FW//2},{rridge} {FX+FW-ro},{rmid}" '
             f'fill="{ROOF2}" stroke="#222" stroke-width="1.2"/>')
    o.append(f'<polygon points="{FX+FW},{ftop} {FX+FW+DX},{ftop+DY} {FX+FW+DX+ro//2},{rmid+DY//2} {FX+FW+ro//2},{rmid}" '
             f'fill="{ROOF2}" opacity=".75" stroke="#222" stroke-width="1.2"/>')
    o.append(f'<polygon points="{FX+ro},{rmid} {FX+FW-ro},{rmid} {FX+FW+ro//2+DX//2},{rmid+DY//2} {FX+ro+DX//2},{rmid+DY//2}" '
             f'fill="{WALL}" opacity=".45" stroke="#222" stroke-width=".8"/>')

    # dormers
    for di in range(4):
        dw_x = FX + 28 + di * 70
        dw_y = rmid - 14
        o.append(f'<rect x="{dw_x}" y="{dw_y}" width="22" height="14" fill="{WIN}" stroke="white" stroke-width="1" rx="1" opacity=".8"/>')
        o.append(f'<polygon points="{dw_x-4},{dw_y} {dw_x+11},{dw_y-8} {dw_x+26},{dw_y}" fill="{ROOF}" stroke="#222" stroke-width=".8"/>')

    # entrance door
    dx = FX + FW//2 - 9
    dy = FBOT - FLOOR_H['RDC'] + 10
    dh = FLOOR_H['RDC'] - 10
    o.append(f'<rect x="{dx}" y="{dy}" width="18" height="{dh}" fill="#5C3A1E" stroke="#3A2010" stroke-width="1" rx="1"/>')

    # floor labels on right
    y_cur = FBOT
    for fl in FLOOR_ORDER:
        fh = FLOOR_H[fl]
        ly = int(y_cur - fh//2 + DY//3)
        o.append(f'<text x="{FX+FW+DX+5}" y="{ly}" font-size="9" font-family="sans-serif" fill="#333" font-weight="bold">{fl}</text>')
        y_cur -= fh

    o.append('</svg>')
    return ''.join(o)


# ─── Corridor analysis ───────────────────────────────────────────────────────
def corridor_analysis(floors):
    """
    Verify that the central corridor (present at R+1 and R+2) is architecturally
    respected when a zone boundary crosses it.

    Rules:
    - The corridor runs the full length of R+1 and R+2.
    - Esc02 is at boundary between sections 1 and 2 (left staircase).
    - Esc01 is at boundary between sections 3 and 4 (right staircase).
    - When a zone split happens within [sections 2-5], each zone needs an Esc:
        * sections 1-2  get Esc02
        * sections 3-5  get Esc01 (and the spiral at far right)
    - A door at the corridor crossing point separates the zones — this is standard
      practice and does NOT disrupt the corridor.
    """
    notes = []
    for fl in ['R+1', 'R+2']:
        secs = floors[fl]
        # Detect zone-change positions
        changes = [i for i in range(1, 5) if secs[i] != secs[i-1]]
        if not changes:
            notes.append(f"<li><strong>{fl}</strong> : couloir non divisé — accès unifié, pas de porte nécessaire.</li>")
            continue

        # Check staircase access per zone
        zones_present = sorted(set(secs), key=lambda z: secs.index(z))
        zone_secs = {z: [i for i, s in enumerate(secs) if s == z] for z in zones_present}
        zone_esc  = {}
        for z, idxs in zone_secs.items():
            esc = []
            if any(i <= 1 for i in idxs):   esc.append("Esc02 (gauche)")
            if any(i >= 2 for i in idxs):   esc.append("Esc01 (centre)")
            if any(i == 4 for i in idxs):   esc.append("escalier hélicoïdal (droite)")
            zone_esc[z] = esc if esc else ["⚠ aucun escalier direct"]

        for z, escs in zone_esc.items():
            label = ZONE_LABEL[z]
            notes.append(f"<li><strong>{fl} — Zone {z} ({label})</strong> : "
                         f"sections {[i+1 for i in zone_secs[z]]} → accès couloir via {', '.join(escs)}.</li>")

        door_positions = ", ".join(f"entre sections {i} et {i+1}" for i in changes)
        notes.append(f"<li class='corr-door'>Porte(s) de séparation dans le couloir du {fl} : {door_positions}.</li>")

    return f"""<div class="corr-box">
  <strong>Couloir central — analyse</strong>
  <ul class="corr-list">{"".join(notes)}</ul>
</div>"""


# ─── Area summary table ───────────────────────────────────────────────────────
def area_table(v):
    totals, floor_totals = compute_areas(v['floors'])
    grand = sum(totals.values())
    rows  = []
    for fl in ['RDC', 'R+1', 'R+2', 'Combles']:
        ft = floor_totals[fl]
        fl_tot = sum(ft.values())
        rows.append(f"""
      <tr>
        <td class="td-floor">{fl}</td>
        <td class="td-a">{ft['A'] if ft['A'] else '—'}</td>
        <td class="td-b">{ft['B'] if ft['B'] else '—'}</td>
        <td class="td-c">{ft['C'] if ft['C'] else '—'}</td>
        <td class="td-tot">{fl_tot}</td>
      </tr>""")

    return f"""
  <div class="area-wrap">
    <table class="area-table">
      <thead>
        <tr>
          <th>Niveau</th>
          <th class="th-a">A — Communs</th>
          <th class="th-b">B — Hébergement</th>
          <th class="th-c">C — Appartement</th>
          <th class="th-tot">Total niveau</th>
        </tr>
      </thead>
      <tbody>{''.join(rows)}
        <tr class="tr-total">
          <td><strong>TOTAL</strong></td>
          <td class="td-a"><strong>{totals['A']}</strong></td>
          <td class="td-b"><strong>{totals['B']}</strong></td>
          <td class="td-c"><strong>{totals['C']}</strong></td>
          <td class="td-tot"><strong>{grand}</strong></td>
        </tr>
      </tbody>
    </table>
    <div class="area-chips">
      <span class="chip chip-a">Communs : <strong>{totals['A']} m²</strong></span>
      <span class="chip chip-b">Hébergement : <strong>{totals['B']} m²</strong></span>
      <span class="chip chip-c">Appartement : <strong>{totals['C']} m²</strong></span>
      <span class="chip chip-t">Bâtiment total : <strong>1 094 m²</strong></span>
    </div>
    <p class="area-note">* Surfaces nettes utilisables estimées d'après l'Esquisse N°3 (AC Architecture Ingénierie).</p>
  </div>"""


# ─── JavaScript ──────────────────────────────────────────────────────────────
JS = """
function setPlanOpacity(slider, vid) {
  const v   = parseFloat(slider.value);   // 0–100
  const img = v / 100;                    // image opacity
  const zone = Math.max(0.35, 1 - img * 0.65);  // zone fills fade as image appears

  // SVG <image> elements: use setAttribute (works in all browsers for SVG attrs)
  document.querySelectorAll('[id^="v'+vid+'-"][id$="-bg"]').forEach(el => {
    el.setAttribute('opacity', img);
  });
  // Zone rectangles inside this card
  document.querySelectorAll('#card-v'+vid+' .zrect').forEach(el => {
    el.setAttribute('opacity', zone);
  });
  // Update numeric label
  const lbl = document.getElementById('op-lbl-v'+vid);
  if (lbl) lbl.textContent = Math.round(v) + '%';
}

function setAllOpacity(slider) {
  const v = slider.value;
  document.querySelectorAll('.plan-slider').forEach(s => {
    s.value = v;
    const vid = s.dataset.vid;
    if (vid) setPlanOpacity(s, parseInt(vid));
  });
  const lbl = document.getElementById('op-lbl-global');
  if (lbl) lbl.textContent = Math.round(v) + '%';
}
"""


# ─── Full HTML ────────────────────────────────────────────────────────────────
def build_html():
    cards = []
    for v in VARIANTS:
        fsvgs = {fl: floor_svg(fl, v['floors'][fl], v['n'], fl.replace('+','p'))
                 for fl in ['RDC','R+1','R+2','Combles']}
        psvg  = persp_svg(v['floors'])
        atable = area_table(v)
        totals, _ = compute_areas(v['floors'])

        corr = corridor_analysis(v['floors'])
        card = f"""
<div class="card" id="card-v{v['n']}">
  <div class="card-header">
    <span class="badge">{v['n']}</span>
    <div style="flex:1">
      <div class="card-title">Variante {v['n']} — {v['name']}</div>
      <div class="card-desc">{v['desc']}</div>
      <div class="pros-cons">
        <span class="pro">✔ {v['pros']}</span>
        <span class="con">✘ {v['cons']}</span>
      </div>
    </div>
  </div>

  <div class="slider-bar">
    <span class="slider-lbl">Plans existants</span>
    <input type="range" class="plan-slider" data-vid="{v['n']}"
           min="0" max="100" value="0" step="5"
           oninput="setPlanOpacity(this, {v['n']})">
    <span class="slider-pct" id="op-lbl-v{v['n']}">0%</span>
  </div>

  <div class="plans-row" id="v{v['n']}">
    <div class="plan-cell"><div class="plan-wrap">{fsvgs['RDC']}</div></div>
    <div class="plan-cell"><div class="plan-wrap">{fsvgs['R+1']}</div></div>
    <div class="plan-cell"><div class="plan-wrap">{fsvgs['R+2']}</div></div>
    <div class="plan-cell"><div class="plan-wrap">{fsvgs['Combles']}</div></div>
    <div class="plan-cell persp-cell"><div class="plan-wrap">{psvg}</div></div>
  </div>

  {corr}
  {atable}
</div>
"""
        cards.append(card)

    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Maison Saint Joseph — 10 Variantes</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Segoe UI',system-ui,sans-serif;background:#F2EFE9;color:#2c2c2c;padding:20px;font-size:14px}}
h1{{text-align:center;color:#2c3e50;font-size:1.7em;margin-bottom:4px;font-weight:800}}
.subtitle{{text-align:center;color:#666;font-size:.88em;margin-bottom:10px}}

/* Programme */
.program-box{{background:#fff8f0;border:2px solid {CA};border-radius:10px;padding:14px 20px;
  max-width:900px;margin:0 auto 20px}}
.program-box h3{{color:{CA_D};font-size:.95em;font-weight:700;margin-bottom:8px}}
.program-grid{{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}}
.program-col ul{{padding-left:16px;color:#444;font-size:.83em;line-height:1.7}}
.program-col strong{{display:block;margin-bottom:4px;font-size:.9em;color:#333}}

/* Legend */
.legend{{display:flex;justify-content:center;gap:22px;flex-wrap:wrap;margin-bottom:18px;
  background:white;padding:10px 20px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.08)}}
.leg{{display:flex;align-items:center;gap:8px;font-size:.86em;font-weight:600}}
.leg-box{{width:20px;height:20px;border-radius:3px;border:2px solid rgba(0,0,0,.15)}}

/* Nav */
.nav{{display:flex;justify-content:center;flex-wrap:wrap;gap:5px;margin-bottom:20px}}
.nav a{{background:#2c3e50;color:white;padding:4px 11px;border-radius:20px;text-decoration:none;
  font-size:.78em;font-weight:600;transition:background .2s}}
.nav a:hover{{background:{CA_D}}}

/* Global toggle */
.global-toggle{{text-align:center;margin-bottom:16px;font-size:.85em}}
.global-toggle label{{cursor:pointer;background:white;padding:7px 14px;border-radius:20px;
  box-shadow:0 2px 6px rgba(0,0,0,.1);display:inline-flex;align-items:center;gap:7px}}
.global-toggle input{{cursor:pointer}}

/* Card */
.card{{background:white;border-radius:14px;box-shadow:0 3px 16px rgba(0,0,0,.09);
  margin-bottom:28px;padding:20px;scroll-margin-top:10px}}
.card-header{{display:flex;align-items:flex-start;gap:14px;margin-bottom:10px}}
.badge{{background:#2c3e50;color:white;width:32px;height:32px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.9em;flex-shrink:0;margin-top:2px}}
.card-title{{font-size:1.05em;font-weight:700;color:#2c3e50;margin-bottom:4px}}
.card-desc{{color:#555;font-size:.83em;line-height:1.5;margin-bottom:6px}}
.pros-cons{{display:flex;gap:14px;flex-wrap:wrap;font-size:.8em}}
.pro{{color:#2E8A5A;font-weight:500}}
.con{{color:#a0522d;font-weight:500}}

/* Slider bar */
.slider-bar{{display:flex;align-items:center;gap:10px;margin-bottom:10px;
  background:#f4f4f0;padding:6px 14px;border-radius:20px;border:1px solid #ddd;width:fit-content}}
.slider-lbl{{font-size:.8em;color:#555;white-space:nowrap}}
.plan-slider{{-webkit-appearance:none;appearance:none;width:180px;height:5px;border-radius:3px;
  background:linear-gradient(to right,{CA} 0%,{CA} var(--val,0%),#ddd var(--val,0%),#ddd 100%);
  outline:none;cursor:pointer}}
.plan-slider::-webkit-slider-thumb{{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;
  background:{CA_D};cursor:pointer;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)}}
.plan-slider::-moz-range-thumb{{width:16px;height:16px;border-radius:50%;background:{CA_D};
  cursor:pointer;border:2px solid white}}
.slider-pct{{font-size:.8em;font-weight:700;color:{CA_D};min-width:32px}}
/* Global toggle */
.global-toggle{{text-align:center;margin-bottom:16px;font-size:.85em;
  display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}}

/* Plans grid */
.plans-row{{display:grid;grid-template-columns:repeat(4,1fr) 1.55fr;gap:6px;align-items:start;margin-bottom:14px}}
.plan-cell{{min-width:0}}
.plan-wrap{{border:1px solid #ddd;border-radius:6px;overflow:hidden;background:#fafaf8}}

/* Corridor analysis */
.corr-box{{background:#F5F3EE;border-left:3px solid #8A7A60;border-radius:0 8px 8px 0;
  padding:8px 12px;margin-bottom:10px;font-size:.8em}}
.corr-box strong{{color:#5C4A30;display:block;margin-bottom:4px}}
.corr-list{{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:4px 16px}}
.corr-list li{{color:#444}}
.corr-door{{color:#7A5040;font-style:italic}}
/* Area table */
.area-wrap{{margin-top:4px}}
.area-table{{width:100%;border-collapse:collapse;font-size:.8em;margin-bottom:8px}}
.area-table th,.area-table td{{padding:4px 8px;border:1px solid #e0e0e0;text-align:center}}
.area-table thead{{background:#f4f4f0}}
.th-a{{background:#FEE9D4;color:#7a3800}}
.th-b{{background:#D6E8F4;color:#0d2e45}}
.th-c{{background:#D4EFE0;color:#0d3820}}
.th-tot{{background:#eee;font-weight:700}}
.td-a{{background:#FEF5EE;color:#7a3800;font-weight:600}}
.td-b{{background:#EEF5FC;color:#0d2e45;font-weight:600}}
.td-c{{background:#EEF9F3;color:#0d3820;font-weight:600}}
.td-tot{{font-weight:700;background:#f9f9f7}}
.td-floor{{font-weight:600;color:#333;background:#fafaf8}}
.tr-total td{{border-top:2px solid #aaa}}
.area-chips{{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:5px}}
.chip{{font-size:.8em;padding:4px 10px;border-radius:14px}}
.chip-a{{background:#FEE9D4;color:#7a3800;border:1px solid {CA}}}
.chip-b{{background:#D6E8F4;color:#0d2e45;border:1px solid {CB}}}
.chip-c{{background:#D4EFE0;color:#0d3820;border:1px solid {CC}}}
.chip-t{{background:#eee;color:#333;border:1px solid #ccc}}
.area-note{{font-size:.73em;color:#999;margin-top:2px}}

@media(max-width:860px){{
  .plans-row{{grid-template-columns:1fr 1fr}}
  .persp-cell{{grid-column:1/-1}}
  .program-grid{{grid-template-columns:1fr}}
}}
</style>
</head>
<body>
<h1>Maison Saint Joseph — Abbaye de La Richette</h1>
<p class="subtitle">Hôtellerie · 945 route du Village, 73 330 Belmont-Tramonet · 10 variantes de découpage en 3 zones</p>

<div class="program-box">
  <h3>Cahier des charges — Fédération Village Saint Joseph</h3>
  <div class="program-grid">
    <div class="program-col"><strong>Zone A — Espaces communs</strong>
      <ul><li>Grande cuisine + SAM (salle à manger)</li><li>Salon + bibliothèque</li>
      <li>Oratoire / chapelle (≥ 15 personnes)</li><li>Bureau d'accueil / secrétariat</li>
      <li>Lingerie / buanderie</li><li>Ateliers : mosaïque, bois, sculpture…</li>
      <li>Local ménage + réserves</li></ul></div>
    <div class="program-col"><strong>Zone B — Hébergement résidents</strong>
      <ul><li>8 à 12 chambres individuelles (~14 m²)</li>
      <li>Douches / WC partagés par étage</li>
      <li>1 chambre bénévole / ami de la Maison</li>
      <li>Chambre PMR accessible</li>
      <li>Accès ascenseur prévu</li></ul></div>
    <div class="program-col"><strong>Zone C — Appartement couple gérant</strong>
      <ul><li>Logement indépendant (≥ 70 m²)</li>
      <li>Cuisine + séjour + 2 chambres min.</li>
      <li>Entrée distincte si possible</li>
      <li>Conçu pour couple avec ou sans enfants</li>
      <li>Proximité sans manque d'intimité</li></ul></div>
  </div>
</div>

<div class="legend">
  <div class="leg"><div class="leg-box" style="background:{CA}"></div>Zone A — Espaces communs MSJ</div>
  <div class="leg"><div class="leg-box" style="background:{CB}"></div>Zone B — Hébergement résidents</div>
  <div class="leg"><div class="leg-box" style="background:{CC}"></div>Zone C — Appartement couple gérant</div>
</div>

<div class="nav">{"".join(f'<a href="#card-v{v["n"]}">V{v["n"]}</a>' for v in VARIANTS)}</div>

<div class="global-toggle">
  <span class="slider-lbl">Transparence plans existants — toutes les variantes</span>
  <input type="range" class="plan-slider" min="0" max="100" value="0" step="5"
         oninput="setAllOpacity(this)" style="width:220px;vertical-align:middle">
  <span class="slider-pct" id="op-lbl-global">0%</span>
</div>

{"".join(cards)}

<p style="text-align:center;color:#aaa;font-size:.73em;margin-top:8px">
  Plans schématiques basés sur l'Esquisse N°3 — AC Architecture Ingénierie, Lyon · Juillet 2025
  · Surfaces estimées — document non contractuel
</p>
<script>{JS}</script>
</body>
</html>"""


if __name__ == '__main__':
    html = build_html()
    out  = '/home/user/SAMPLE1/saint_joseph_plans.html'
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    sz = len(html) // 1024
    print(f"Generated: {out}  ({sz} KB)")
