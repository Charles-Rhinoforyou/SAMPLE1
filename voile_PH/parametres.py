# =============================================================================
#  PROJET : VOILE D'OMBRAGE PH - PARABOLOÏDE HYPERBOLIQUE
#  Fichier : parametres.py
#  Objet   : Paramètres globaux du projet - modifier ici pour toute variante
# =============================================================================

# ─── GÉOMÉTRIE DE LA VOILE ───────────────────────────────────────────────────

# Dimensions en plan (m)
LARGEUR_X = 6.0          # dimension selon X (direction chaîne)
LARGEUR_Y = 6.0          # dimension selon Y (direction trame)

# Cotes Z des quatre coins (m) - définissent la courbure PH
#   A(0,0)=haut  B(Lx,0)=bas  C(Lx,Ly)=haut  D(0,Ly)=bas
Z_A = 3.50               # coin A (haut, côté mât gauche avant)
Z_B = 2.00               # coin B (bas, côté câble droit avant)
Z_C = 3.50               # coin C (haut, côté mât droit arrière)
Z_D = 2.00               # coin D (bas, côté câble gauche arrière)

# ─── STRUCTURE PORTEUSE ──────────────────────────────────────────────────────

# Mâts (poteaux acier)
HAUTEUR_MAT = 4.00       # hauteur totale des mâts (m)
DIAM_MAT_EXT = 0.139     # diamètre extérieur CHS (m) = CHS 139.7×8
EPAISSEUR_MAT = 0.008    # épaisseur paroi (m)

# Câbles périphériques
DIAM_CABLE_PERIM = 0.016  # diamètre câble périmétrique (m)
SECTION_CABLE_PERIM = 3.14159 * (DIAM_CABLE_PERIM / 2)**2  # m²
PRECONTRAINTE_CABLE = 15.0  # kN - tension initiale câbles périmétrique

# Haubans de mâts
DIAM_HAUBAN = 0.012      # diamètre hauban (m)
SECTION_HAUBAN = 3.14159 * (DIAM_HAUBAN / 2)**2  # m²
PRECONTRAINTE_HAUBAN = 8.0   # kN - tension initiale haubans

# Poutres en bois (optionnelles - mettre à False pour désactiver)
AVEC_POUTRES_BOIS = False
SECTION_BOIS_B = 0.100   # largeur section bois (m)
SECTION_BOIS_H = 0.200   # hauteur section bois (m)

# ─── FONDATIONS ──────────────────────────────────────────────────────────────

# Raideurs des appuis élastiques (kN/m ou kN/rad)
K_VERTICAL   = 50000.0   # raideur verticale (kN/m)
K_HORIZONTAL = 30000.0   # raideur horizontale (kN/m)
K_ROTATION   = 5000.0    # raideur en rotation (kN.m/rad)

# ─── MEMBRANE TEXTILE ────────────────────────────────────────────────────────

# Serge Ferrari Précontraint 702 (séries PVC/PES)
# Propriétés par unité de largeur (kN/m)
E_CHAINE        = 1200.0   # module de Young direction chaîne (kN/m)
E_TRAME         = 850.0    # module de Young direction trame (kN/m)
G_MEMBRANE      = 150.0    # module de cisaillement membranaire (kN/m)
NU_CHAINE_TRAME = 0.15     # coefficient de Poisson νxy

EPAISSEUR_EQUIVALENTE = 0.0009  # épaisseur équivalente (m) - pour affichage uniquement
MASSE_SURFACIQUE = 0.85    # masse surfacique membrane kg/m²
PRECONTRAINTE_MEMBRANE = 3.0  # kN/m - précontrainte initiale dans les deux directions

# Angle de l'armature chaîne par rapport à X global (°)
ANGLE_CHAINE = 0.0         # 0° = chaîne selon X, 90° = chaîne selon Y

# ─── MATÉRIAUX ACIER ─────────────────────────────────────────────────────────

E_ACIER   = 210000.0       # module d'Young acier (MPa → N/mm²)
NU_ACIER  = 0.3            # coefficient de Poisson acier
RHO_ACIER = 7850.0         # masse volumique (kg/m³)
FY_ACIER  = 355.0          # limite élastique S355 (MPa)
FU_ACIER  = 490.0          # résistance à la rupture (MPa)

E_CABLE   = 160000.0       # module d'Young câble (MPa) - torons hélicoïdaux
RHO_CABLE = 7850.0         # masse volumique câble (kg/m³)
FU_CABLE  = 1570.0         # résistance rupture câble (MPa) - classe 1570

# ─── MATÉRIAU BOIS (si activé) ───────────────────────────────────────────────

E_BOIS_L  = 12500.0        # module parallèle au fil (MPa) - GL24h
E_BOIS_T  = 300.0          # module perpendiculaire au fil (MPa)
G_BOIS    = 650.0          # module de glissement (MPa)
NU_BOIS   = 0.20           # coefficient de Poisson bois
RHO_BOIS  = 420.0          # masse volumique (kg/m³)

# ─── CHARGES CLIMATIQUES ─────────────────────────────────────────────────────

# Site - Zone de vent selon EN 1991-1-4
ZONE_VENT   = "3"          # Zone 3 France (vb0=26m/s)
CATEGORIE_TERRAIN = "II"   # catégorie de terrain (II = terrain ouvert)
HAUTEUR_REF = 4.0          # hauteur de référence pour le vent (m)
V_B0        = 26.0         # vitesse vent de base (m/s)
C_DIR       = 1.0          # facteur directionnel
C_SEASON    = 1.0          # facteur saisonnier
C_0         = 1.0          # facteur d'orographie
TURBULENCE  = 0.19         # intensité turbulence I_v

# Pression de vent de pointe (kN/m²) - calculée selon EN 1991-1-4
Q_P = 0.70                 # pression cinétique de pointe (kN/m²)
CP_PRESSION = 0.60         # coefficient de pression (pression)
CP_SUCCION  = -1.30        # coefficient de pression (succion)

# Neige - Zone A2 selon NF EN 1991-1-3
S_K         = 0.45         # valeur caractéristique (kN/m²) - altitude < 200m
MU_1        = 0.8          # coefficient de forme toiture plane
S_NEIGE     = MU_1 * S_K   # charge de neige sur toiture (kN/m²)

# Température (variation uniforme)
DELTA_T_PLUS  = +35.0      # variation thermique positive (°C)
DELTA_T_MOINS = -25.0      # variation thermique négative (°C)
ALPHA_THERM   = 1.2e-5     # coefficient de dilatation thermique (/°C) - acier

# Poids propre
G_MEMBRANE_KNM2 = MASSE_SURFACIQUE * 9.81 / 1000.0  # kN/m²

# ─── MAILLAGE ────────────────────────────────────────────────────────────────

NX_MEMBRANE = 12           # nombre de divisions selon X (membrane)
NY_MEMBRANE = 12           # nombre de divisions selon Y (membrane)
NE_CABLE    = 8            # nombre d'éléments par câble périmétrique
NE_MAT      = 6            # nombre d'éléments par mât

# ─── ANALYSE ─────────────────────────────────────────────────────────────────

NB_PAS_FORM_FINDING = 20   # nombre de pas pour le form-finding
NB_PAS_PRECONTRAINTE = 10  # nombre de pas pour application précontrainte
NB_PAS_CHARGES = 15        # nombre de pas pour les charges de service
ITER_MAX = 50              # iterations max par pas
RESI_RELA = 1.0e-4         # résidu relatif convergence

AVEC_FLAMBEMENT = True     # calcul de flambement post-précontrainte
NB_MODES_FLAMB = 5         # nombre de modes de flambement recherchés

# ─── COMBINAISONS EUROCODES (ELU/ELS) ────────────────────────────────────────

# Coefficients ELU - Situation persistante/transitoire EN 1990
GAMMA_G_DEF = 1.35         # poids propre défavorable
GAMMA_G_FAV = 1.00         # poids propre favorable
GAMMA_Q     = 1.50         # actions variables
PSI_0_VENT  = 0.60         # coefficient ψ0 vent
PSI_0_NEIGE = 0.50         # coefficient ψ0 neige (altitude ≤ 1000m)

# Coefficients ELS caractéristique
GAMMA_G_ELS = 1.00
GAMMA_Q_ELS = 1.00

print("Paramètres du projet voile PH chargés :")
print(f"  Voile {LARGEUR_X:.1f} x {LARGEUR_Y:.1f} m")
print(f"  Précontrainte membrane : {PRECONTRAINTE_MEMBRANE:.1f} kN/m")
print(f"  Membrane E_chaîne={E_CHAINE:.0f} kN/m / E_trame={E_TRAME:.0f} kN/m")
