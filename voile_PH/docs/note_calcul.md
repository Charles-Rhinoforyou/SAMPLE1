# Note de Calcul — Voile d'Ombrage PH 6×6 m
## Paraboloïde Hyperbolique en Membrane Textile

**Projet :** Voile d'ombrage type PH — Conception et vérification EF  
**Référence :** VOILE_PH_6x6  
**Logiciel :** Code_Aster v17+ / Salome-Meca  
**Eurocodes :** EN 1990, EN 1991-1-1/4, EN 1993-1-1/11, EN 1794-3  

---

## 1. Présentation de la structure

### 1.1 Géométrie

La voile est un paraboloïde hyperbolique (PH) de forme carrée 6×6 m. La surface à double courbure est définie par ses quatre coins :

| Coin | X (m) | Y (m) | Z (m) | Type     |
|------|--------|--------|--------|----------|
| A    | 0      | 0      | 3.50   | Haut (mât) |
| B    | 6      | 0      | 2.00   | Bas (ancrage) |
| C    | 6      | 6      | 3.50   | Haut (mât) |
| D    | 0      | 6      | 2.00   | Bas (ancrage) |

L'équation de la surface hyperbolique est :

```
z(x,y) = zA + (zB-zA)·(x/Lx) + (zD-zA)·(y/Ly) + (zA-zB-zD+zC)·(x/Lx)·(y/Ly)
```

La courbure anticlastique garantit la mise en tension bidirectionnelle de la membrane sous précontrainte.

### 1.2 Structure porteuse

| Élément | Description | Matériau |
|---------|-------------|----------|
| Mâts    | CHS 139.7×8 | S355 |
| Câbles périmétrique | Ø16 mm | Câble 1×7, fu=1570 MPa |
| Haubans | Ø12 mm | Câble 1×7, fu=1570 MPa |
| Membrane | Serge Ferrari Précontraint 702 | PVC/PES |
| Fondations | Ressorts élastiques (k=50 000 kN/m) | — |

### 1.3 Membrane textile

**Serge Ferrari Précontraint 702 :**

| Propriété | Valeur | Unité |
|-----------|--------|-------|
| Module membranaire chaîne | 1 200 | kN/m |
| Module membranaire trame  | 850   | kN/m |
| Module de cisaillement    | 150   | kN/m |
| Coefficient de Poisson    | 0.15  | — |
| Masse surfacique          | 850   | g/m² |
| Précontrainte initiale    | 3.0   | kN/m |

---

## 2. Charges appliquées

### 2.1 Poids propre

- Membrane : q_g = 0.85 × 9.81 / 1000 = **0.0083 kN/m²**
- Structure acier : calculé automatiquement (ρ=7850 kg/m³)

### 2.2 Vent — EN 1991-1-4 (Zone 3 France)

| Paramètre | Valeur |
|-----------|--------|
| vb0 (vitesse de base) | 26 m/s |
| Catégorie de terrain | II (terrain ouvert) |
| Hauteur de référence | 4.0 m |
| qp (pression cinétique de pointe) | **0.70 kN/m²** |
| Cp pression | +0.60 |
| Cp succion | −1.30 |
| **w pression** | **+0.42 kN/m²** |
| **w succion** | **−0.91 kN/m²** |

### 2.3 Neige — NF EN 1991-1-3

- Zone A2, altitude < 200 m : sk = 0.45 kN/m²
- Coefficient de forme μ1 = 0.8
- **s = 0.36 kN/m²**

### 2.4 Température

- Variation thermique positive : ΔT = +35°C
- Variation thermique négative : ΔT = −25°C

---

## 3. Méthode de calcul

### 3.1 Form-finding

La recherche de forme est effectuée par analyse statique non-linéaire (STAT_NON_LINE) avec comportement GROT_GDEP (grands déplacements, grandes rotations) sous précontrainte imposée par déformation initiale équivalente.

La géométrie d'équilibre obtenue constitue la base de référence pour le calcul structural.

### 3.2 Analyse structurale

Calcul non-linéaire géométrique (GROT_GDEP) avec :
- Membrane : comportement membranaire orthotrope (ELAS_ORTH)
- Câbles : comportement CABLE (traction seule)
- Mâts : poutres 3D (POU_D_T)

### 3.3 Analyse de flambement

Calcul des valeurs propres de flambement (CALC_MODES, option flambage) sur l'état précontraint G0+G.

---

## 4. Combinaisons de calcul — EN 1990

### 4.1 ELU — Situations persistantes/transitoires (Tableau A1.2(B))

| Combinaison | Expression | Critère de dimensionnement |
|-------------|------------|---------------------------|
| **ELU1** | 1.35G + 1.50Wp | Résistance câbles + mâts (pression) |
| **ELU2** | 1.35G + 1.50Ws | Arrachement ancrages (succion) |
| **ELU3** | 1.35G + 1.50S + 0.90Wp | Neige dominante |
| **ELU4** | 1.00G + 1.50Ws | Uplift (vérification fondations) |

### 4.2 ELS — Combinaison caractéristique

| Combinaison | Expression | Critère |
|-------------|------------|---------|
| **ELS_C** | G + Wp | Déformations + absence de plis |
| **ELS_F** | G + 0.6Wp | État fréquent (confort) |

---

## 5. Vérifications structurales

### 5.1 Membrane textile

**Critère d'absence de plis (ELS) :**
```
N_min = min(N1, N2) ≥ 0  pour tout point de la surface
```
où N1, N2 sont les efforts principaux membranaires.

**Critère de résistance (ELU) :**
```
N_max ≤ N_rup,k / γM   (résistance caractéristique membrane / coefficient partiel)
```

### 5.2 Câbles périmétrique Ø16 (EN 1993-1-11)

```
Trd = A × fuk / γM2 = 201.06 × 1570 / 1.25 = 252 534 N ≈ 252 kN
```

### 5.3 Mâts CHS 139.7×8 S355 (EN 1993-1-1)

```
Section A  = 3 296 mm²
I_y = I_z  = 5.58 × 10⁶ mm⁴
W_el       = 79 900 mm³

N_rd = A × fy / γM0 = 3 296 × 355 / 1.0 = 1 170 kN
M_rd = W_el × fy / γM0 = 79 900 × 355 / 1.0 = 28.4 kN.m
```

Interaction N+M selon EN 1993-1-1 §6.2.9 à vérifier.

### 5.4 Déformations (ELS)

```
δ_max ≤ L/50 = 6000/50 = 120 mm  (critère de confort visuel voile d'ombrage)
```

### 5.5 Flambement des mâts

```
λ_cr ≥ 3.0  (facteur critique de flambement post-précontrainte)
```

---

## 6. Utilisation du projet Code_Aster

### 6.1 Structure des fichiers

```
voile_PH/
├── parametres.py                    ← MODIFIER ICI pour variantes
├── salome/
│   ├── voile_PH_geometrie.py        ← Script Salome-Meca
│   └── generer_maillage_analytique.py ← Script Python pur (sans Salome)
├── aster/
│   ├── 01_form_finding.comm         ← Étape 1 : form-finding
│   ├── 02_calcul_principal.comm     ← Étape 2 : calcul tous cas de charge
│   ├── 03_flambement.comm           ← Étape 3 : flambement
│   ├── 04_post_traitement.comm      ← Étape 4 : vérifications
│   ├── voile_PH_01_formfinding.export
│   ├── voile_PH_02_principal.export
│   ├── voile_PH_03_flambement.export
│   └── voile_PH_04_posttraitement.export
├── resultats/                       ← Fichiers .med de résultats
└── docs/
    └── note_calcul.md               ← Ce fichier
```

### 6.2 Procédure de lancement

```bash
# 1) Générer le maillage (sans Salome)
python salome/generer_maillage_analytique.py

# 2) Form-finding
as_run aster/voile_PH_01_formfinding.export

# 3) Calcul principal (tous cas de charge)
as_run aster/voile_PH_02_principal.export

# 4) Flambement
as_run aster/voile_PH_03_flambement.export

# 5) Post-traitement et vérifications
as_run aster/voile_PH_04_posttraitement.export

# 6) Visualisation des résultats
# Ouvrir calcul_principal_result.med dans ParaVis (Salome) ou GMSH
```

### 6.3 Paramétrage — Comment modifier les dimensions

Tout est piloté depuis `parametres.py`. Pour changer les dimensions :

```python
LARGEUR_X = 8.0          # nouvelle largeur X
LARGEUR_Y = 6.0          # nouvelle largeur Y
Z_A = 4.00               # nouveau coin haut
Z_B = 2.50               # nouveau coin bas
PRECONTRAINTE_MEMBRANE = 4.0  # augmentation précontrainte
```

Relancer ensuite la séquence complète.

---

## 7. Résultats attendus (ordre de grandeur pour 6×6 m)

| Grandeur | Valeur typique |
|----------|----------------|
| Déflexion max sous vent succion | ~60–100 mm (L/60) |
| Effort membranaire précontraint | 3.0 kN/m |
| Effort membranaire max ELU | ~12–18 kN/m |
| Tension câble max ELU | ~80–120 kN |
| Effort normal mât (compression) | ~30–60 kN |
| Facteur flambement λ_cr | > 5 (câbles tendus = rigidification) |

---

*Note générée automatiquement — Bureau d'études structures textiles*
