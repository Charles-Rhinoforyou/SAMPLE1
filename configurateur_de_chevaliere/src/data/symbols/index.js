/**
 * data/symbols/index.js — Bibliotheque de meubles heraldiques (charges).
 *
 * Chaque symbole est un dessin VECTORIEL monochrome, defini dans un repere
 * normalise `0 0 100 100` et centre autour de (50,50). Il est stocke sous forme
 * de `pathData` (contenu de l'attribut `d` d'un `<path>`), ce qui le rend :
 *   - net a toute echelle (SVG) ;
 *   - facilement RE-COLORABLE : le rendu applique `fill` selon la teinture, on ne
 *     code donc AUCUNE couleur ici.
 *
 * `fillRule` ('nonzero' par defaut) vaut 'evenodd' pour les symboles a trou
 * (ex. la tour et sa porte).
 *
 * Note : lion et aigle sont des silhouettes STYLISEES (volontairement simples).
 * L'utilisateur peut importer ses propres symboles SVG (voir symbol-loader.js)
 * pour des meubles plus detailles ; ils rejoignent la meme bibliotheque.
 */

export const SYMBOL_VIEWBOX = '0 0 100 100';

export const SYMBOLS = {
  // ---------- Meubles figuratifs ----------
  lion: {
    nom: 'Lion (rampant, stylise)',
    pathData:
      'M30,90 L30,64 C24,60 22,52 26,48 L26,40 C24,36 26,30 30,30 C28,24 32,20 36,22 ' +
      'C36,16 42,16 42,22 C48,20 48,26 44,28 C50,28 50,34 44,34 L40,34 L56,44 L50,50 ' +
      'L62,48 L54,54 L54,64 C58,60 62,64 60,70 C66,68 66,76 60,76 L54,74 L54,90 L48,90 ' +
      'L48,72 L40,72 L40,90 Z'
  },
  aigle: {
    nom: 'Aigle (eployee, stylisee)',
    pathData:
      // Corps + tete + deux ailes + deux pattes + queue (union de sous-chemins).
      'M50,34 L18,26 L24,40 L14,44 L26,50 L20,60 L44,52 Z ' +
      'M50,34 L82,26 L76,40 L86,44 L74,50 L80,60 L56,52 Z ' +
      'M42,30 L58,30 L60,64 L50,72 L40,64 Z ' +
      'M50,9 a7,7 0 1 0 0.1,0 Z ' +
      'M44,68 L40,86 L46,86 L48,70 Z ' +
      'M56,68 L60,86 L54,86 L52,70 Z ' +
      'M44,70 L40,92 L50,86 L60,92 L56,70 Z'
  },
  'fleur-de-lys': {
    nom: 'Fleur de lys',
    pathData:
      'M50,8 C44,20 44,30 50,40 C56,30 56,20 50,8 Z ' +
      'M50,34 C40,26 30,30 30,42 C30,52 40,52 48,44 C46,40 47,36 50,34 Z ' +
      'M50,34 C60,26 70,30 70,42 C70,52 60,52 52,44 C54,40 53,36 50,34 Z ' +
      'M38,46 L62,46 L60,52 L40,52 Z ' +
      'M46,46 L54,46 L56,74 C56,82 44,82 44,74 Z'
  },
  tour: {
    nom: 'Tour',
    fillRule: 'evenodd',
    pathData:
      // Corps crenele (contour) + porte en ogive (trou, via evenodd).
      'M26,88 L26,32 L36,32 L36,40 L45,40 L45,32 L55,32 L55,40 L64,40 L64,32 L74,32 L74,88 Z ' +
      'M42,88 L42,66 A8,8 0 0 1 58,66 L58,88 Z'
  },
  epee: {
    nom: 'Epee (haute, en pal)',
    pathData:
      'M50,6 L55,18 L55,60 L45,60 L45,18 Z ' + // lame pointe en haut
      'M34,60 H66 V68 H34 Z ' + // garde (quillons)
      'M46,68 H54 V84 H46 Z ' + // fusee (poignee)
      'M50,84 a5,5 0 1 0 0.1,0 Z' // pommeau
  },
  rose: {
    nom: 'Rose heraldique',
    pathData:
      // 5 petales (cercles) + bouton central : union de sous-chemins.
      'M32,24 a18,18 0 1 0 36,0 a18,18 0 1 0 -36,0 Z ' +
      'M56.7,41.97 a18,18 0 1 0 36,0 a18,18 0 1 0 -36,0 Z ' +
      'M47.28,71.03 a18,18 0 1 0 36,0 a18,18 0 1 0 -36,0 Z ' +
      'M16.72,71.03 a18,18 0 1 0 36,0 a18,18 0 1 0 -36,0 Z ' +
      'M7.3,41.97 a18,18 0 1 0 36,0 a18,18 0 1 0 -36,0 Z ' +
      'M37,50 a13,13 0 1 0 26,0 a13,13 0 1 0 -26,0 Z'
  },
  coquille: {
    nom: 'Coquille (escalope)',
    pathData:
      'M50,86 C30,86 16,60 18,40 L20,40 L24,52 L28,42 L34,54 L40,43 L46,55 L50,44 ' +
      'L54,55 L60,43 L66,54 L72,42 L76,52 L80,40 L82,40 C84,60 70,86 50,86 Z'
  },

  // ---------- Croix ----------
  croix: {
    nom: 'Croix (pleine)',
    pathData: 'M44,10 H56 V44 H90 V56 H56 V90 H44 V56 H10 V44 H44 Z'
  },
  'croix-patee': {
    nom: 'Croix pattee',
    pathData:
      'M34,8 L66,8 L56,44 L44,44 Z ' + // bras haut
      'M34,92 L66,92 L56,56 L44,56 Z ' + // bras bas
      'M8,34 L8,66 L44,56 L44,44 Z ' + // bras gauche
      'M92,34 L92,66 L56,56 L56,44 Z ' + // bras droit
      'M44,44 H56 V56 H44 Z' // centre
  },
  'croix-de-malte': {
    nom: 'Croix de Malte',
    pathData:
      'M50,50 L30,8 L50,22 L70,8 Z ' +
      'M50,50 L92,30 L78,50 L92,70 Z ' +
      'M50,50 L70,92 L50,78 L30,92 Z ' +
      'M50,50 L8,70 L22,50 L8,30 Z'
  },

  // ---------- Astres ----------
  etoile: {
    nom: 'Etoile (a 5 rais)',
    pathData:
      'M50,8 L60,36.25 L89.9,37 L66.17,55.25 L74.7,84 L50,67 L25.3,84 ' +
      'L33.83,55.25 L10.1,37 L40,36.25 Z'
  },
  croissant: {
    nom: 'Croissant (tourne)',
    pathData: 'M14,58 A40,40 0 1 0 86,58 A34,34 0 1 1 14,58 Z'
  },

  // ---------- Pieces honorables (geometriques) ----------
  chevron: {
    nom: 'Chevron',
    pathData: 'M50,20 L88,86 L74,86 L50,44 L26,86 L12,86 Z'
  },
  fasce: {
    nom: 'Fasce (bande horizontale)',
    pathData: 'M6,40 H94 V60 H6 Z'
  },
  pal: {
    nom: 'Pal (bande verticale)',
    pathData: 'M40,6 H60 V94 H40 Z'
  },
  bande: {
    nom: 'Bande (diagonale)',
    pathData: 'M8,24 L24,8 L92,76 L76,92 Z'
  }
};

/** Ordre d'affichage des meubles dans la palette de l'UI. */
export const SYMBOL_ORDER = [
  'lion',
  'aigle',
  'fleur-de-lys',
  'tour',
  'epee',
  'rose',
  'coquille',
  'croix',
  'croix-patee',
  'croix-de-malte',
  'etoile',
  'croissant',
  'chevron',
  'fasce',
  'pal',
  'bande'
];

/**
 * Resout un symbole par id, en cherchant d'abord dans la bibliotheque native
 * puis dans les symboles personnalises fournis (issus du document design).
 * @param {string} id
 * @param {Array<object>} [customSymbols] liste de symboles perso {id, viewBox, pathData, ...}
 * @returns {object|null} { pathData, viewBox, fillRule, nom }
 */
export function resolveSymbol(id, customSymbols = []) {
  if (SYMBOLS[id]) {
    return {
      kind: 'path',
      nom: SYMBOLS[id].nom,
      pathData: SYMBOLS[id].pathData,
      viewBox: SYMBOL_VIEWBOX,
      fillRule: SYMBOLS[id].fillRule || 'nonzero'
    };
  }
  const custom = customSymbols.find((s) => s.id === id);
  if (custom) {
    // Symbole perso importe : markup SVG brut (assaini) a re-echelonner.
    return {
      kind: 'raw',
      nom: custom.nom || 'Symbole importe',
      viewBox: custom.viewBox || SYMBOL_VIEWBOX,
      innerSvg: custom.innerSvg,
      fillRule: 'nonzero'
    };
  }
  return null;
}
