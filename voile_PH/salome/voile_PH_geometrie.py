# =============================================================================
#  PROJET : VOILE D'OMBRAGE PH - Script SALOME-MECA
#  Fichier : voile_PH_geometrie.py
#  Objet   : Création géométrie + maillage paramétrique
#  Usage   : Lancer depuis Salome-Meca : File > Load Script
# =============================================================================

import salome
import GEOM
from salome.geom import geomBuilder
import SMESH
from salome.smesh import smeshBuilder
import math
import sys
import os

# Ajouter le chemin du projet pour importer les paramètres
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from parametres import *

salome.salome_init()
geompy = geomBuilder.New()
smesh  = smeshBuilder.New()

# =============================================================================
#  PARTIE 1 - GÉOMÉTRIE
# =============================================================================

# ─── Points principaux de la voile ───────────────────────────────────────────
#
#   D(0,Ly,zD) ─────────────────── C(Lx,Ly,zC)
#       │                                │
#       │     Surface hyperbolique       │
#       │                                │
#   A(0,0,zA) ──────────────────── B(Lx,0,zB)
#
#  Équation surface PH : z(x,y) = zA + (zB-zA)*(x/Lx) + (zD-zA)*(y/Ly)
#                               + (zA-zB-zD+zC)*(x/Lx)*(y/Ly)

Lx = LARGEUR_X
Ly = LARGEUR_Y
zA = Z_A
zB = Z_B
zC = Z_C
zD = Z_D

# Points d'angle de la voile
ptA = geompy.MakeVertex(0,  0,  zA, "ptA_HG")
ptB = geompy.MakeVertex(Lx, 0,  zB, "ptB_BD")
ptC = geompy.MakeVertex(Lx, Ly, zC, "ptC_HD")
ptD = geompy.MakeVertex(0,  Ly, zD, "ptD_BG")

# ─── Câbles périphériques (arêtes courbes de la membrane) ────────────────────
# Les câbles périmétrique suivent le contour de la voile.
# Pour une vraie courbe de bord, on utilise des splines passant par des points
# intermédiaires calculés sur la surface PH.

def surf_z(x, y):
    """Calcule Z sur la surface hyperbolique."""
    return (zA
            + (zB - zA) * (x / Lx)
            + (zD - zA) * (y / Ly)
            + (zA - zB - zD + zC) * (x / Lx) * (y / Ly))

# Bord AB (y=0) : câble avant bas
pts_AB = [ptA]
for i in range(1, NE_CABLE):
    xi = Lx * i / NE_CABLE
    zi = surf_z(xi, 0.0)
    pts_AB.append(geompy.MakeVertex(xi, 0.0, zi))
pts_AB.append(ptB)
cable_AB = geompy.MakePolyline(pts_AB, False)
geompy.addToStudy(cable_AB, "cable_AB")

# Bord BC (x=Lx) : câble droit
pts_BC = [ptB]
for i in range(1, NE_CABLE):
    yi = Ly * i / NE_CABLE
    zi = surf_z(Lx, yi)
    pts_BC.append(geompy.MakeVertex(Lx, yi, zi))
pts_BC.append(ptC)
cable_BC = geompy.MakePolyline(pts_BC, False)
geompy.addToStudy(cable_BC, "cable_BC")

# Bord CD (y=Ly) : câble arrière bas
pts_CD = [ptC]
for i in range(1, NE_CABLE):
    xi = Lx * (1.0 - i / NE_CABLE)
    zi = surf_z(xi, Ly)
    pts_CD.append(geompy.MakeVertex(xi, Ly, zi))
pts_CD.append(ptD)
cable_CD = geompy.MakePolyline(pts_CD, False)
geompy.addToStudy(cable_CD, "cable_CD")

# Bord DA (x=0) : câble gauche
pts_DA = [ptD]
for i in range(1, NE_CABLE):
    yi = Ly * (1.0 - i / NE_CABLE)
    zi = surf_z(0.0, yi)
    pts_DA.append(geompy.MakeVertex(0.0, yi, zi))
pts_DA.append(ptA)
cable_DA = geompy.MakePolyline(pts_DA, False)
geompy.addToStudy(cable_DA, "cable_DA")

# ─── Surface membrane ────────────────────────────────────────────────────────
# Génération par interpolation de courbes sur la surface PH
# On génère un réseau de courbes de remplissage

nb_iso = max(NX_MEMBRANE, NY_MEMBRANE) // 4  # courbes isoparamétriques

# Courbes iso-X pour le remplissage (surface filling)
iso_x_curves = []
for ix in range(nb_iso + 1):
    xi = Lx * ix / nb_iso
    pts_iso = []
    for iy in range(NY_MEMBRANE + 1):
        yi = Ly * iy / NY_MEMBRANE
        pts_iso.append(geompy.MakeVertex(xi, yi, surf_z(xi, yi)))
    iso_x_curves.append(geompy.MakePolyline(pts_iso, False))

# Courbes iso-Y pour le remplissage
iso_y_curves = []
for iy in range(nb_iso + 1):
    yi = Ly * iy / nb_iso
    pts_iso = []
    for ix in range(NX_MEMBRANE + 1):
        xi = Lx * ix / NX_MEMBRANE
        pts_iso.append(geompy.MakeVertex(xi, yi, surf_z(xi, yi)))
    iso_y_curves.append(geompy.MakePolyline(pts_iso, False))

# Surface par remplissage (GEOM filling)
edge_wires = geompy.MakeWire([cable_AB, cable_BC, cable_CD, cable_DA], 1e-4)
surface_membrane = geompy.MakeFilling(edge_wires, 2, 5, 1e-4, 1e-4, 0, GEOM.FOM_Default)
geompy.addToStudy(surface_membrane, "surface_membrane")

# ─── Mâts (poteaux verticaux aux coins hauts A et C) ─────────────────────────
# Mât 1 en A
base_matA = geompy.MakeVertex(0.0, 0.0, zA - HAUTEUR_MAT, "base_matA")
mat_A = geompy.MakeEdge(base_matA, ptA)
geompy.addToStudy(mat_A, "mat_A")

# Mât 2 en C
base_matC = geompy.MakeVertex(Lx, Ly, zC - HAUTEUR_MAT, "base_matC")
mat_C = geompy.MakeEdge(base_matC, ptC)
geompy.addToStudy(mat_C, "mat_C")

# ─── Haubans ─────────────────────────────────────────────────────────────────
# 2 haubans par mât, ancrés au sol à 1.5×H des pieds
offset_hauban = 1.5 * HAUTEUR_MAT

# Haubans mât A
anc_A1 = geompy.MakeVertex(-offset_hauban, 0.0, 0.0, "ancrage_A1")
anc_A2 = geompy.MakeVertex(0.0, offset_hauban, 0.0, "ancrage_A2")
hauban_A1 = geompy.MakeEdge(ptA, anc_A1)
hauban_A2 = geompy.MakeEdge(ptA, anc_A2)
geompy.addToStudy(hauban_A1, "hauban_A1")
geompy.addToStudy(hauban_A2, "hauban_A2")

# Haubans mât C
anc_C1 = geompy.MakeVertex(Lx + offset_hauban, Ly, 0.0, "ancrage_C1")
anc_C2 = geompy.MakeVertex(Lx, Ly + offset_hauban, 0.0, "ancrage_C2")
hauban_C1 = geompy.MakeEdge(ptC, anc_C1)
hauban_C2 = geompy.MakeEdge(ptC, anc_C2)
geompy.addToStudy(hauban_C1, "hauban_C1")
geompy.addToStudy(hauban_C2, "hauban_C2")

# ─── Points d'ancrage des coins bas (B et D) ─────────────────────────────────
# Les câbles périmétrique en B et D s'ancrent directement au sol
anc_B = geompy.MakeVertex(Lx, 0.0, 0.0, "ancrage_B")
anc_D = geompy.MakeVertex(0.0, Ly, 0.0, "ancrage_D")

# Câbles d'ancrage verticaux B et D
cable_anc_B = geompy.MakeEdge(ptB, anc_B)
cable_anc_D = geompy.MakeEdge(ptD, anc_D)
geompy.addToStudy(cable_anc_B, "cable_anc_B")
geompy.addToStudy(cable_anc_D, "cable_anc_D")

print("Géométrie créée avec succès.")
print(f"  Surface membrane : {Lx:.1f} x {Ly:.1f} m")
print(f"  Coins : A({zA:.2f}m) B({zB:.2f}m) C({zC:.2f}m) D({zD:.2f}m)")

# =============================================================================
#  PARTIE 2 - MAILLAGE
# =============================================================================

mesh = smesh.Mesh(surface_membrane, "VOILE_PH_MESH")

# ─── Algorithme global - membrane ────────────────────────────────────────────
algo2D = mesh.Quadrangle(algo=smeshBuilder.QUADRANGLE)
params2D = algo2D.Parameters()
params2D.SetQuadType(smeshBuilder.QUAD_STANDARD)

# Subdivisions uniformes sur les bords
mesh.Segment().NumberOfSegments(NX_MEMBRANE)  # diviseur par défaut

# Diviseurs spécifiques sur les bords
algo_AB = mesh.Segment(geom=cable_AB)
algo_AB.NumberOfSegments(NX_MEMBRANE)

algo_BC = mesh.Segment(geom=cable_BC)
algo_BC.NumberOfSegments(NY_MEMBRANE)

algo_CD = mesh.Segment(geom=cable_CD)
algo_CD.NumberOfSegments(NX_MEMBRANE)

algo_DA = mesh.Segment(geom=cable_DA)
algo_DA.NumberOfSegments(NY_MEMBRANE)

# ─── Sous-maillages pour les câbles ──────────────────────────────────────────
for geom_obj, name in [
        (cable_AB, "cable_AB"), (cable_BC, "cable_BC"),
        (cable_CD, "cable_CD"), (cable_DA, "cable_DA"),
        (cable_anc_B, "cable_anc_B"), (cable_anc_D, "cable_anc_D")]:
    sub = mesh.GetSubMesh(geom_obj, name + "_sm")

# ─── Sous-maillages pour les mâts ────────────────────────────────────────────
for geom_obj, name, ne in [
        (mat_A, "mat_A", NE_MAT), (mat_C, "mat_C", NE_MAT)]:
    sub = mesh.GetSubMesh(geom_obj, name + "_sm")

for geom_obj, name, ne in [
        (hauban_A1, "hauban_A1", 4), (hauban_A2, "hauban_A2", 4),
        (hauban_C1, "hauban_C1", 4), (hauban_C2, "hauban_C2", 4)]:
    sub = mesh.GetSubMesh(geom_obj, name + "_sm")

# ─── Génération du maillage ───────────────────────────────────────────────────
mesh.Compute()

# =============================================================================
#  PARTIE 3 - GROUPES DE MAILLAGE
# =============================================================================

def make_group_from_geom(mesh_obj, geom_obj, name, elem_type):
    """Crée un groupe de maillage depuis une entité géométrique."""
    grp = mesh_obj.GroupOnGeom(geom_obj, name, elem_type)
    return grp

# ─── Groupes surfaciques (mailles QUAD4/TRIA3 membrane) ──────────────────────
GR_MEMBRANE = make_group_from_geom(mesh, surface_membrane, "MEMBRANE", SMESH.FACE)

# ─── Groupes linéiques (câbles, mâts, haubans) ───────────────────────────────
GR_CAB_AB  = make_group_from_geom(mesh, cable_AB,  "CABLE_AB",  SMESH.EDGE)
GR_CAB_BC  = make_group_from_geom(mesh, cable_BC,  "CABLE_BC",  SMESH.EDGE)
GR_CAB_CD  = make_group_from_geom(mesh, cable_CD,  "CABLE_CD",  SMESH.EDGE)
GR_CAB_DA  = make_group_from_geom(mesh, cable_DA,  "CABLE_DA",  SMESH.EDGE)
GR_CAB_B   = make_group_from_geom(mesh, cable_anc_B, "CABLE_ANC_B", SMESH.EDGE)
GR_CAB_D   = make_group_from_geom(mesh, cable_anc_D, "CABLE_ANC_D", SMESH.EDGE)
GR_MAT_A   = make_group_from_geom(mesh, mat_A,     "MAT_A",     SMESH.EDGE)
GR_MAT_C   = make_group_from_geom(mesh, mat_C,     "MAT_C",     SMESH.EDGE)
GR_HAU_A1  = make_group_from_geom(mesh, hauban_A1, "HAUBAN_A1", SMESH.EDGE)
GR_HAU_A2  = make_group_from_geom(mesh, hauban_A2, "HAUBAN_A2", SMESH.EDGE)
GR_HAU_C1  = make_group_from_geom(mesh, hauban_C1, "HAUBAN_C1", SMESH.EDGE)
GR_HAU_C2  = make_group_from_geom(mesh, hauban_C2, "HAUBAN_C2", SMESH.EDGE)

# ─── Groupes nodaux (appuis, ancrages) ───────────────────────────────────────
GR_APP_A  = make_group_from_geom(mesh, base_matA, "APPUI_MAT_A", SMESH.NODE)
GR_APP_C  = make_group_from_geom(mesh, base_matC, "APPUI_MAT_C", SMESH.NODE)
GR_APP_B  = make_group_from_geom(mesh, anc_B,     "APPUI_B",     SMESH.NODE)
GR_APP_D  = make_group_from_geom(mesh, anc_D,     "APPUI_D",     SMESH.NODE)
GR_ANC_A1 = make_group_from_geom(mesh, anc_A1,    "ANCRAGE_A1",  SMESH.NODE)
GR_ANC_A2 = make_group_from_geom(mesh, anc_A2,    "ANCRAGE_A2",  SMESH.NODE)
GR_ANC_C1 = make_group_from_geom(mesh, anc_C1,    "ANCRAGE_C1",  SMESH.NODE)
GR_ANC_C2 = make_group_from_geom(mesh, anc_C2,    "ANCRAGE_C2",  SMESH.NODE)

# ─── Groupe de tous les appuis ────────────────────────────────────────────────
GR_TOUS_APPUIS = mesh.CreateEmptyGroup(SMESH.NODE, "TOUS_APPUIS")
GR_TOUS_APPUIS.Add(GR_APP_A.GetListOfID()  + GR_APP_C.GetListOfID() +
                    GR_APP_B.GetListOfID()  + GR_APP_D.GetListOfID() +
                    GR_ANC_A1.GetListOfID() + GR_ANC_A2.GetListOfID() +
                    GR_ANC_C1.GetListOfID() + GR_ANC_C2.GetListOfID())

# ─── Groupe coins de la voile (nœuds de jonction membrane/câble) ─────────────
GR_COIN_A = make_group_from_geom(mesh, ptA, "COIN_A", SMESH.NODE)
GR_COIN_B = make_group_from_geom(mesh, ptB, "COIN_B", SMESH.NODE)
GR_COIN_C = make_group_from_geom(mesh, ptC, "COIN_C", SMESH.NODE)
GR_COIN_D = make_group_from_geom(mesh, ptD, "COIN_D", SMESH.NODE)

# ─── Export MED ──────────────────────────────────────────────────────────────
med_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "aster", "voile_PH.med"
)
mesh.ExportMED(med_path, auto_groups=False, version=smeshBuilder.MED_V2_2,
               overwrite=True, meshPart=None, autoDimension=True)

print(f"\nMaillage exporté : {med_path}")
print(f"  Nœuds     : {mesh.NbNodes()}")
print(f"  QUAD4     : {mesh.NbQuadrangles()}")
print(f"  SEG2      : {mesh.NbEdges()}")

salome.sg.updateObjBrowser()
