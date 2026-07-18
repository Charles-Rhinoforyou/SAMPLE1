# Références héraldiques fournies par l'utilisateur

Ces planches de référence guident l'implémentation. À respecter au fil des phases.

## Formes d'écu (Phase 1 — implémenté dans `src/data/shields.js`)

1. Écu Français ancien
2. Écu Français moderne
3. Écu des Dames (ovale)
4. Écu des Demoiselles (losange)
5. Écu des Tournois ou Bannière (carré)
6. Écu Suisse
7. Écu Anglais
8. Écu Allemand
9. Écu Polonais
10. Écu Espagnol, Portugais, Flamand (base en demi-cercle)

## Partitions (Phase 2 — à implémenter dans `src/engine2d/composition.js`)

- **Parti** : divisé verticalement en 2.
- **Coupé** : divisé horizontalement en 2.
- **Taillé** : divisé par la diagonale (haut-droit → bas-gauche).
- **Tranché** : divisé par la diagonale (haut-gauche → bas-droit).
- **Tiercé en pal** : divisé en 3 bandes verticales.
- **Écartelé en sautoir** : divisé en 4 par les 2 diagonales (X).
- **Gironné** : divisé en 8 girons (rayons depuis le centre).
- **Bandé de 4 pièces** : bandes diagonales alternées.
- **Tiercé en pairle** : divisé en 3 par un Y.

Le prompt Phase 2 demandait au minimum : plain (1), parti (2), coupé (2),
écartelé (4). Les partitions ci-dessus étendent ce jeu.

## Disposition des meubles selon leur nombre (Phase 2 — `src/engine2d/layout-parametric.js`)

Dispositions héraldiques classiques à reproduire dans le moteur paramétrique :

- **1 meuble** : centré (en cœur/abîme).
- **2 meubles** : côte à côte (accolés / adossés) ou l'un sur l'autre (en pal).
- **3 meubles** : « à trois » = 2 en chef + 1 en pointe (rang 2-1) ; variante en
  fasce (rangée) ou en pal (colonne).
- **4 meubles** : grille 2×2.
- **5 meubles** : en sautoir / quinconce (2-1-2).
- **6 meubles** : rangs 3-2-1 (ou 2-2-2).
- **semé** : petit meuble répété en pavage sur tout le champ.

Paramètres à exposer : nombre d'éléments, marges, espacement, échelle globale,
alignement — et les positions doivent suivre le CONTOUR de l'écu (via `bounds`
de chaque forme), pas un simple rectangle.
