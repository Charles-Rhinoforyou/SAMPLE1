# =============================================================================
#  PROJET : VOILE D'OMBRAGE PH - Génération maillage MED sans Salome
#  Fichier : generer_maillage_analytique.py
#  Objet   : Script Python pur (numpy + h5py) pour générer un fichier .med
#            directement exploitable par Code_Aster, sans interface graphique.
#
#  Requis  : pip install numpy h5py
#  Usage   : python generer_maillage_analytique.py
#            → génère ../aster/voile_PH.med
# =============================================================================

import numpy as np
import h5py
import os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from parametres import *

OUTPUT_MED = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                          "aster", "voile_PH.med")

# =============================================================================
#  GÉNÉRATION DES NOEUDS
# =============================================================================

Lx = LARGEUR_X * 1000.0    # conversion m → mm (unité Code_Aster)
Ly = LARGEUR_Y * 1000.0
zA = Z_A * 1000.0
zB = Z_B * 1000.0
zC = Z_C * 1000.0
zD = Z_D * 1000.0
H_MAT = HAUTEUR_MAT * 1000.0

nx = NX_MEMBRANE + 1   # nombre de noeuds selon X
ny = NY_MEMBRANE + 1   # nombre de noeuds selon Y

def surf_z(x, y):
    """Surface hyperbolique (paraboloïde hyperbolique)."""
    return (zA
            + (zB - zA) * (x / Lx)
            + (zD - zA) * (y / Ly)
            + (zA - zB - zD + zC) * (x / Lx) * (y / Ly))

# ─── Noeuds de la membrane (grille NX × NY) ──────────────────────────────────
noeuds_memb = []
for j in range(ny):
    for i in range(nx):
        xi = Lx * i / NX_MEMBRANE
        yi = Ly * j / NY_MEMBRANE
        zi = surf_z(xi, yi)
        noeuds_memb.append([xi, yi, zi])

noeuds_memb = np.array(noeuds_memb, dtype=np.float64)
N_MEMB = len(noeuds_memb)

def idx_memb(i, j):
    """Index noeud membrane (i=colonne X, j=ligne Y)."""
    return j * nx + i

# ─── Noeuds des mâts ─────────────────────────────────────────────────────────
# Mât A (coin haut gauche avant) : de la base (x=0,y=0,z=zA-H) au sommet (x=0,y=0,z=zA)
noeuds_mats = []
n_mat_a_base = N_MEMB  # index du premier noeud du mât A (base)

for k in range(NE_MAT + 1):
    z_k = zA - H_MAT + H_MAT * k / NE_MAT
    noeuds_mats.append([0.0, 0.0, z_k])

n_mat_c_base = N_MEMB + NE_MAT + 1  # index premier noeud mât C (base)
for k in range(NE_MAT + 1):
    z_k = zC - H_MAT + H_MAT * k / NE_MAT
    noeuds_mats.append([Lx, Ly, z_k])

noeuds_mats = np.array(noeuds_mats, dtype=np.float64)
N_MATS = len(noeuds_mats)

# ─── Noeuds des câbles d'ancrage B et D ──────────────────────────────────────
# (coins bas : de leur coin en surface jusqu'au sol)
n_cab_anc_b = N_MEMB + N_MATS

noeuds_anc = []
# Câble ancrage B (coin B = bas droit avant)
for k in range(NE_CABLE + 1):
    z_k = zB - zB * k / NE_CABLE   # descend de zB à 0
    noeuds_anc.append([Lx, 0.0, z_k])

n_cab_anc_d = N_MEMB + N_MATS + NE_CABLE + 1

# Câble ancrage D (coin D = bas gauche arrière)
for k in range(NE_CABLE + 1):
    z_k = zD - zD * k / NE_CABLE
    noeuds_anc.append([0.0, Ly, z_k])

noeuds_anc = np.array(noeuds_anc, dtype=np.float64)
N_ANC = len(noeuds_anc)

# ─── Noeuds des haubans ──────────────────────────────────────────────────────
n_hau_start = N_MEMB + N_MATS + N_ANC
off_h = 1.5 * H_MAT   # distance ancrage haubans

noeuds_hau = []
hau_ancrages = [
    # (pt_sommet, pt_ancrage_sol)
    ([0.0,  0.0,  zA], [-off_h, 0.0,   0.0]),  # hauban A1
    ([0.0,  0.0,  zA], [0.0,   off_h,  0.0]),  # hauban A2
    ([Lx,   Ly,   zC], [Lx+off_h, Ly, 0.0]),   # hauban C1
    ([Lx,   Ly,   zC], [Lx, Ly+off_h, 0.0]),   # hauban C2
]

nh = 4   # noeuds par hauban (intermédiaires, pas d'extrémités = partagées)
hau_node_start = []
for som, anc in hau_ancrages:
    hau_node_start.append(n_hau_start + len(noeuds_hau))
    for k in range(1, nh):   # sans les extrémités (partagées avec mâts/sol)
        t = k / nh
        noeuds_hau.append([
            som[0] + (anc[0]-som[0]) * t,
            som[1] + (anc[1]-som[1]) * t,
            som[2] + (anc[2]-som[2]) * t,
        ])

noeuds_hau = np.array(noeuds_hau, dtype=np.float64) if noeuds_hau else np.zeros((0,3))
N_HAU = len(noeuds_hau)

# Noeuds d'ancrage des haubans au sol (6 points)
n_anc_hau_start = N_MEMB + N_MATS + N_ANC + N_HAU
noeuds_anc_hau = np.array([
    [-off_h, 0.0,  0.0],   # ancrage_A1
    [0.0,  off_h,  0.0],   # ancrage_A2
    [Lx+off_h, Ly, 0.0],   # ancrage_C1
    [Lx, Ly+off_h, 0.0],   # ancrage_C2
], dtype=np.float64)

# ─── Assemblage de tous les noeuds ───────────────────────────────────────────
tous_noeuds = np.vstack([
    noeuds_memb,      # [0           .. N_MEMB-1]
    noeuds_mats,      # [N_MEMB      .. N_MEMB+N_MATS-1]
    noeuds_anc,       # [N_MEMB+N_MATS .. ...]
    noeuds_hau,
    noeuds_anc_hau,
])
N_TOTAL = len(tous_noeuds)
print(f"Total noeuds : {N_TOTAL}")

# =============================================================================
#  GÉNÉRATION DES ÉLÉMENTS
# =============================================================================

# ─── Quadrangles membrane (QUAD4) ────────────────────────────────────────────
quad4_memb = []
for j in range(NY_MEMBRANE):
    for i in range(NX_MEMBRANE):
        n1 = idx_memb(i,   j)
        n2 = idx_memb(i+1, j)
        n3 = idx_memb(i+1, j+1)
        n4 = idx_memb(i,   j+1)
        quad4_memb.append([n1, n2, n3, n4])

quad4_memb = np.array(quad4_memb, dtype=np.int32)
N_QUAD = len(quad4_memb)

# ─── Segments câbles périmétrique (SEG2) ─────────────────────────────────────
seg2_cables = {}

def bord_j(j_val):
    """Indices noeuds sur bord Y=j_val*Ly/NY."""
    return [idx_memb(i, j_val) for i in range(nx)]
def bord_i(i_val):
    """Indices noeuds sur bord X=i_val*Lx/NX."""
    return [idx_memb(i_val, j) for j in range(ny)]

seg2_cables['CABLE_AB'] = [[bord_j(0)[i], bord_j(0)[i+1]]
                             for i in range(NX_MEMBRANE)]
seg2_cables['CABLE_BC'] = [[bord_i(NX_MEMBRANE)[j], bord_i(NX_MEMBRANE)[j+1]]
                             for j in range(NY_MEMBRANE)]
seg2_cables['CABLE_CD'] = [[bord_j(NY_MEMBRANE)[i+1], bord_j(NY_MEMBRANE)[i]]
                             for i in range(NX_MEMBRANE)]
seg2_cables['CABLE_DA'] = [[bord_i(0)[j+1], bord_i(0)[j]]
                             for j in range(NY_MEMBRANE)]

# ─── Segments mâts (SEG2) ────────────────────────────────────────────────────
seg2_mat_a = [[n_mat_a_base + k, n_mat_a_base + k + 1] for k in range(NE_MAT)]
seg2_mat_c = [[n_mat_c_base + k, n_mat_c_base + k + 1] for k in range(NE_MAT)]

# Index tête de mât A = noeud membrane coin A (i=0, j=0)
# Note : la tête du mât coïncide avec le coin de la membrane
# → partage de noeud (pré-requis pour connexion mécanique)
# Ici simplification : le dernier noeud du mât = noeud membrane idx_memb(0,0)
# Il faut donc ajuster : remplacer n_mat_a_base+NE_MAT par idx_memb(0,0)
seg2_mat_a[-1][1] = idx_memb(0, 0)
seg2_mat_c[-1][1] = idx_memb(NX_MEMBRANE, NY_MEMBRANE)

# ─── Segments câbles ancrage B et D (SEG2) ───────────────────────────────────
seg2_anc_b = [[n_cab_anc_b + k, n_cab_anc_b + k + 1] for k in range(NE_CABLE)]
seg2_anc_d = [[n_cab_anc_d + k, n_cab_anc_d + k + 1] for k in range(NE_CABLE)]
# Premier noeud = coin de la membrane
seg2_anc_b[0][0] = idx_memb(NX_MEMBRANE, 0)
seg2_anc_d[0][0] = idx_memb(0, NY_MEMBRANE)

# ─── Segments haubans (SEG2) ─────────────────────────────────────────────────
sommet_A_idx = idx_memb(0, 0)
sommet_C_idx = idx_memb(NX_MEMBRANE, NY_MEMBRANE)
anc_A1 = n_anc_hau_start + 0
anc_A2 = n_anc_hau_start + 1
anc_C1 = n_anc_hau_start + 2
anc_C2 = n_anc_hau_start + 3

seg2_haubans = {
    'HAUBAN_A1': [[sommet_A_idx, anc_A1]],
    'HAUBAN_A2': [[sommet_A_idx, anc_A2]],
    'HAUBAN_C1': [[sommet_C_idx, anc_C1]],
    'HAUBAN_C2': [[sommet_C_idx, anc_C2]],
}

# =============================================================================
#  ÉCRITURE FICHIER MED (HDF5)
#  Format MED 3.x (standard CEA/EDF)
# =============================================================================

def write_med(filename):
    """Écrit le fichier MED au format HDF5 Code_Aster."""
    with h5py.File(filename, 'w') as f:

        # Métadonnées MED
        f.attrs['MED_FICHIER_COMPATIBILITE_AKA'] = np.bytes_('MAJEUR_3_MINEUR_4_RELEASE_1')

        # Informations sur le maillage
        mesh_grp = f.require_group('INFOS_GENERALES')
        f.create_dataset('INFOS_GENERALES/MAJ', data=np.array([3], dtype=np.int32))
        f.create_dataset('INFOS_GENERALES/MIN', data=np.array([4], dtype=np.int32))
        f.create_dataset('INFOS_GENERALES/REL', data=np.array([1], dtype=np.int32))

        mailles_grp = f.require_group('ENS_MAA')
        m_grp = mailles_grp.require_group('VOILE_PH_MESH')

        # Dimension
        m_grp.attrs['DIM'] = np.array([3], dtype=np.int32)
        m_grp.attrs['ESP'] = np.array([3], dtype=np.int32)
        m_grp.attrs['DES'] = np.bytes_('VOILE_PH_MESH - PARABOLOIDE HYPERBOLIQUE')

        # Noeuds
        noe_grp = m_grp.require_group('NOE')
        coords = tous_noeuds.flatten()
        noe_grp.create_dataset('COO', data=coords)
        noe_grp.attrs['NBR'] = np.array([N_TOTAL], dtype=np.int32)
        noe_grp.attrs['NOM'] = np.bytes_('XYZ')

        # Numérotation noeuds (1-based)
        noe_num = np.arange(1, N_TOTAL + 1, dtype=np.int32)
        noe_grp.create_dataset('NUM', data=noe_num)

        # Familles par défaut (0 = pas de famille)
        noe_grp.create_dataset('FAM', data=np.zeros(N_TOTAL, dtype=np.int32))

        # Éléments QUAD4 (membrane)
        if N_QUAD > 0:
            mai_grp = m_grp.require_group('MAI/QU4')
            conn = (quad4_memb + 1).flatten()   # 1-based
            mai_grp.create_dataset('NOD', data=conn)
            mai_grp.attrs['NBR'] = np.array([N_QUAD], dtype=np.int32)
            mai_grp.create_dataset('NUM', data=np.arange(1, N_QUAD+1, dtype=np.int32))
            mai_grp.create_dataset('FAM', data=np.ones(N_QUAD, dtype=np.int32))

        print(f"Fichier MED écrit (simplifié) : {filename}")
        print(f"  Noeuds : {N_TOTAL}")
        print(f"  QUAD4  : {N_QUAD}")

write_med(OUTPUT_MED)

# =============================================================================
#  RAPPORT RÉCAPITULATIF
# =============================================================================

print("\n" + "=" * 60)
print("RÉSUMÉ GÉOMÉTRIQUE DU MODÈLE")
print("=" * 60)
print(f"  Voile : {LARGEUR_X:.1f} × {LARGEUR_Y:.1f} m")
print(f"  Surface approx. : {LARGEUR_X * LARGEUR_Y:.1f} m² (projection)")
print(f"  Coins : A(z={Z_A:.2f}m)  B(z={Z_B:.2f}m)  C(z={Z_C:.2f}m)  D(z={Z_D:.2f}m)")
print(f"  Flèche maximale : {max(Z_A,Z_C) - min(Z_B,Z_D):.2f} m")
print(f"  Hauteur mâts   : {HAUTEUR_MAT:.1f} m")
print(f"  Maillage membrane : {NX_MEMBRANE}×{NY_MEMBRANE} = {NX_MEMBRANE*NY_MEMBRANE} QUAD4")
print(f"  Précontrainte membrane : {PRECONTRAINTE_MEMBRANE:.1f} kN/m")
print(f"  Câbles périm. Ø{DIAM_CABLE_PERIM*1000:.0f}mm, T0={PRECONTRAINTE_CABLE:.0f} kN")
print(f"  Haubans      Ø{DIAM_HAUBAN*1000:.0f}mm, T0={PRECONTRAINTE_HAUBAN:.0f} kN")
