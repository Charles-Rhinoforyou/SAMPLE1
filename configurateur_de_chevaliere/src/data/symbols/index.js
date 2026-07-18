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

// ---------- Utilitaires de generation de tracés (petits meubles) ----------

const r0 = (v) => Math.round(v * 100) / 100;

/** Disque (cercle plein) en unites 0..100. */
function disc(cx, cy, r) {
  return `M${cx - r},${cy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0 Z`;
}

/** Etoile/molette a `points` branches (rayon exterieur/interieur), en un sous-chemin. */
function star(points, rOut, rIn, cx = 50, cy = 50, rot = -90) {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? rIn : rOut;
    const a = ((rot + (i * 180) / points) * Math.PI) / 180;
    d += (i ? 'L' : 'M') + r0(cx + r * Math.cos(a)) + ',' + r0(cy + r * Math.sin(a));
  }
  return d + 'Z';
}

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
  },

  // ---------- Petits meubles (inspires des repertoires heraldiques) ----------
  besant: {
    nom: 'Besant / tourteau',
    pathData: disc(50, 50, 38)
  },
  annelet: {
    nom: 'Annelet (anneau)',
    fillRule: 'evenodd',
    pathData: disc(50, 50, 38) + ' ' + disc(50, 50, 23)
  },
  losange: {
    nom: 'Losange',
    pathData: 'M50,8 L86,50 L50,92 L14,50 Z'
  },
  macle: {
    nom: 'Macle (losange vide)',
    fillRule: 'evenodd',
    pathData: 'M50,8 L86,50 L50,92 L14,50 Z M50,26 L70,50 L50,74 L30,50 Z'
  },
  fusee: {
    nom: 'Fusee (losange allonge)',
    pathData: 'M50,6 L70,50 L50,94 L30,50 Z'
  },
  molette: {
    nom: 'Molette (d\'eperon)',
    fillRule: 'evenodd',
    pathData: star(6, 44, 17) + ' ' + disc(50, 50, 8)
  },
  quintefeuille: {
    nom: 'Quintefeuille',
    fillRule: 'evenodd',
    // 5 petales (disques) autour du centre + percage central.
    pathData:
      disc(50, 24, 17) + ' ' +
      disc(74.7, 41.97, 17) + ' ' +
      disc(65.28, 71.03, 17) + ' ' +
      disc(34.72, 71.03, 17) + ' ' +
      disc(25.3, 41.97, 17) + ' ' +
      disc(50, 50, 8)
  },
  trefle: {
    nom: 'Trefle',
    pathData:
      disc(50, 30, 18) + ' ' +
      disc(32, 52, 18) + ' ' +
      disc(68, 52, 18) + ' ' +
      'M47,52 L53,52 L54,90 L46,90 Z'
  },
  coeur: {
    nom: 'Coeur',
    pathData:
      'M50,34 C50,22 32,16 24,30 C16,46 40,64 50,86 C60,64 84,46 76,30 C68,16 50,22 50,34 Z'
  },
  merlette: {
    nom: 'Merlette (oiseau)',
    pathData:
      // Corps + tete + aile + queue, silhouette stylisee (sans bec ni pattes).
      'M20,52 C20,44 30,38 44,38 C56,38 64,34 70,30 C68,36 66,40 62,42 ' +
      'C72,42 80,46 84,52 C78,52 74,54 70,58 C74,62 74,68 70,72 ' +
      'C66,66 60,62 52,62 C40,62 26,60 20,52 Z ' +
      disc(30, 44, 3)
  },
  cloche: {
    nom: 'Cloche',
    pathData:
      'M50,14 C47,14 45,16 45,19 C34,23 30,40 30,60 L24,68 L76,68 L70,60 ' +
      'C70,40 66,23 55,19 C55,16 53,14 50,14 Z ' +
      disc(50, 74, 5)
  },
  soleil: {
    nom: 'Soleil',
    pathData: star(12, 46, 24) + ' ' + disc(50, 50, 22)
  },
  clef: {
    nom: 'Clef',
    fillRule: 'evenodd',
    pathData:
      // Anneau (perce) + tige + panneton.
      disc(50, 22, 16) + ' ' + disc(50, 22, 7) + ' ' +
      'M46,34 L54,34 L54,86 L46,86 Z ' +
      'M54,70 L66,70 L66,78 L54,78 Z M54,58 L62,58 L62,66 L54,66 Z'
  },
  gerbe: {
    nom: 'Gerbe (de ble)',
    pathData:
      // Faisceau d'epis lie en son milieu.
      'M50,10 C46,22 44,34 44,46 L56,46 C56,34 54,22 50,10 Z ' +
      'M30,16 C30,28 34,38 42,48 L50,44 C44,34 38,24 30,16 Z ' +
      'M70,16 C70,28 66,38 58,48 L50,44 C56,34 62,24 70,16 Z ' +
      'M38,48 L62,48 L66,60 C66,78 34,78 34,60 Z ' +
      'M32,58 L68,58 L68,64 L32,64 Z'
  },

  // ---------- Petits meubles (2e lot : objets & nature) ----------
  billette: {
    nom: 'Billette',
    pathData: 'M36,16 H64 V84 H36 Z'
  },
  ancre: {
    nom: 'Ancre',
    fillRule: 'evenodd',
    pathData:
      disc(50, 16, 8) + ' ' + disc(50, 16, 4) + ' ' + // organeau (anneau perce)
      'M47,22 H53 V78 H47 Z ' + // verge
      'M36,32 H64 V38 H36 Z ' + // jas (traverse)
      'M50,80 C34,80 22,66 22,50 L30,50 C30,62 38,70 50,72 C62,70 70,62 70,50 L78,50 C78,66 66,80 50,80 Z ' + // bras
      'M16,52 L24,42 L30,52 Z M70,52 L76,42 L84,52 Z' // becs
  },
  hache: {
    nom: 'Hache',
    pathData:
      'M47,14 H53 V86 H47 Z ' + // manche
      // Fer a taillant courbe (tranchant a droite) avec barbe basse.
      'M53,18 L66,17 C82,24 86,40 80,52 C76,44 66,40 53,40 Z ' +
      'M53,40 C63,40 70,44 72,52 C66,58 60,60 53,60 Z'
  },
  marteau: {
    nom: 'Marteau',
    pathData:
      'M30,18 H70 V32 L62,38 L38,38 L30,32 Z ' + // tete
      'M46,36 H54 V86 H46 Z' // manche
  },
  fleche: {
    nom: 'Fleche',
    pathData:
      'M50,8 L61,30 L54,30 L54,34 L46,34 L46,30 L39,30 Z ' + // pointe
      'M47,34 H53 V78 H47 Z ' + // fut
      'M47,66 L37,84 L47,78 Z M53,66 L63,84 L53,78 Z' // empennage
  },
  'fer-a-cheval': {
    nom: 'Fer a cheval',
    pathData:
      'M26,84 C6,58 14,20 50,16 C86,20 94,58 74,84 L62,76 C78,54 72,30 50,28 C28,30 22,54 38,76 Z'
  },
  cor: {
    nom: 'Cor (de chasse)',
    pathData:
      'M20,52 A30,30 0 1 1 78,58 L68,56 A20,20 0 1 0 30,50 Z ' + // corps
      disc(20, 52, 5) // embouchure
  },
  arbre: {
    nom: 'Arbre',
    pathData:
      'M50,10 C32,10 22,26 32,40 C22,50 32,64 44,60 C48,66 56,66 60,60 C72,64 82,50 72,40 C80,26 66,10 50,10 Z ' + // frondaison
      'M45,56 H55 V88 H45 Z' // fut
  },
  feuille: {
    nom: 'Feuille',
    pathData:
      'M50,10 C30,24 26,56 50,90 C74,56 70,24 50,10 Z ' +
      'M49,20 H51 V84 H49 Z'
  },
  gland: {
    nom: 'Gland',
    pathData:
      'M48,26 H52 V34 H48 Z ' + // pedoncule
      'M34,42 C34,34 66,34 66,42 C66,47 34,47 34,42 Z ' + // cupule
      'M37,46 C37,44 63,44 63,46 C63,74 37,74 37,46 Z' // fruit
  },
  abeille: {
    nom: 'Abeille',
    pathData:
      disc(50, 26, 8) + ' ' + // tete
      'M50,32 C40,32 36,44 36,58 C36,72 44,82 50,82 C56,82 64,72 64,58 C64,44 60,32 50,32 Z ' + // corps
      'M38,38 C22,30 18,44 32,50 Z M62,38 C78,30 82,44 68,50 Z' // ailes
  },
  poisson: {
    nom: 'Poisson',
    pathData:
      'M18,50 C30,36 60,36 74,50 C60,64 30,64 18,50 Z ' + // corps
      'M74,50 L88,38 L84,50 L88,62 Z' // queue
  },
  chateau: {
    nom: 'Chateau',
    fillRule: 'evenodd',
    pathData:
      'M18,36 L18,82 L38,82 L38,36 L34,36 L34,40 L30,40 L30,36 L26,36 L26,40 L22,40 L22,36 Z ' + // tour gauche
      'M62,36 L62,82 L82,82 L82,36 L78,36 L78,40 L74,40 L74,36 L70,36 L70,40 L66,40 L66,36 Z ' + // tour droite
      'M38,52 L38,82 L62,82 L62,52 L58,52 L58,56 L54,56 L54,52 L50,52 L50,56 L46,56 L46,52 L42,52 L42,56 L38,56 Z ' + // muraille crenelee
      'M46,82 L46,66 A4,4 0 0 1 54,66 L54,82 Z' // porte (trou)
  },
  flamme: {
    nom: 'Flamme',
    pathData:
      'M50,10 C58,26 66,32 62,46 C70,44 72,54 66,62 C68,72 60,82 50,84 C40,82 32,72 34,62 C28,54 30,44 38,46 C34,32 42,26 50,10 Z'
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
  'bande',
  // Petits meubles.
  'besant',
  'annelet',
  'losange',
  'macle',
  'fusee',
  'molette',
  'quintefeuille',
  'trefle',
  'coeur',
  'merlette',
  'cloche',
  'soleil',
  'clef',
  'gerbe',
  // Petits meubles (2e lot : objets & nature).
  'billette',
  'ancre',
  'hache',
  'marteau',
  'fleche',
  'fer-a-cheval',
  'cor',
  'arbre',
  'feuille',
  'gland',
  'abeille',
  'poisson',
  'chateau',
  'flamme'
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
