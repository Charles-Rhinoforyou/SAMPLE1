/**
 * composition.js — Partitions heraldiques : division de l'ecu en regions.
 *
 * Une PARTITION divise l'ecu en N regions (quartiers). Chaque region est definie
 * par un POLYGONE dans le repere de l'ecu (0..200 x 0..240). Au rendu, la region
 * est obtenue par INTERSECTION du contour d'ecu (clip-path) et de ce polygone
 * (clip-path imbrique) : pas besoin de calculer l'intersection geometrique.
 *
 * Partitions reprises de la planche de reference :
 *   plain, parti, coupe, taille, tranche, tierce-pal, ecartele,
 *   ecartele-sautoir, gironne, bande (bande de 4 pieces), tierce-pairle.
 *
 * `regions` renvoie un tableau de { points:[[x,y]...], bounds:{x,y,width,height},
 * ligne:[[x1,y1],[x2,y2]]... } ; `count` donne le nombre de quartiers attendu.
 */

const W = 200;
const H = 240;
const CX = 100; // centre X de l'ecu
const CY = 120; // centre Y de l'ecu

export const PARTITIONS = {
  plain: { nom: 'Plain (1)', count: 1, build: () => [rect(0, 0, W, H)] },

  parti: {
    nom: 'Parti (2)',
    count: 2,
    lines: [[[CX, 0], [CX, H]]],
    build: () => [rect(0, 0, CX, H), rect(CX, 0, W - CX, H)]
  },

  coupe: {
    nom: 'Coupe (2)',
    count: 2,
    lines: [[[0, CY], [W, CY]]],
    build: () => [rect(0, 0, W, CY), rect(0, CY, W, H - CY)]
  },

  taille: {
    // Diagonale "/" (bas-gauche -> haut-droit).
    nom: 'Taille (2)',
    count: 2,
    lines: [[[0, H], [W, 0]]],
    build: () => [poly([[0, 0], [W, 0], [0, H]]), poly([[W, 0], [W, H], [0, H]])]
  },

  tranche: {
    // Diagonale "\" (haut-gauche -> bas-droit).
    nom: 'Tranche (2)',
    count: 2,
    lines: [[[0, 0], [W, H]]],
    build: () => [poly([[0, 0], [W, 0], [W, H]]), poly([[0, 0], [W, H], [0, H]])]
  },

  'tierce-pal': {
    nom: 'Tierce en pal (3)',
    count: 3,
    lines: [[[W / 3, 0], [W / 3, H]], [[(2 * W) / 3, 0], [(2 * W) / 3, H]]],
    build: () => [rect(0, 0, W / 3, H), rect(W / 3, 0, W / 3, H), rect((2 * W) / 3, 0, W / 3, H)]
  },

  ecartele: {
    nom: 'Ecartele (4)',
    count: 4,
    lines: [[[CX, 0], [CX, H]], [[0, CY], [W, CY]]],
    // Ordre heraldique : 1 haut-gauche, 2 haut-droit, 3 bas-gauche, 4 bas-droit.
    build: () => [rect(0, 0, CX, CY), rect(CX, 0, CX, CY), rect(0, CY, CX, CY), rect(CX, CY, CX, CY)]
  },

  'ecartele-sautoir': {
    nom: 'Ecartele en sautoir (4)',
    count: 4,
    lines: [[[0, 0], [W, H]], [[W, 0], [0, H]]],
    // Ordre : haut, droit, bas, gauche.
    build: () => [
      poly([[0, 0], [W, 0], [CX, CY]]),
      poly([[W, 0], [W, H], [CX, CY]]),
      poly([[W, H], [0, H], [CX, CY]]),
      poly([[0, H], [0, 0], [CX, CY]])
    ]
  },

  gironne: {
    nom: 'Gironne (8)',
    count: 8,
    build: () => {
      // 8 girons : du centre vers 8 points du perimetre (coins + milieux d'aretes).
      const perim = [
        [CX, 0], [W, 0], [W, CY], [W, H],
        [CX, H], [0, H], [0, CY], [0, 0]
      ];
      const out = [];
      for (let i = 0; i < perim.length; i++) {
        const a = perim[i];
        const b = perim[(i + 1) % perim.length];
        out.push(poly([[CX, CY], a, b]));
      }
      return out;
    }
  },

  bande: {
    nom: 'Bande de 4 pieces',
    count: 4,
    build: () => {
      // 4 bandes diagonales paralleles a la direction "\" (200,240).
      // Coordonnee perpendiculaire p = 240*x - 200*y (constante le long de "\").
      const box = [[0, 0], [W, 0], [W, H], [0, H]];
      const pAt = (pt) => 240 * pt[0] - 200 * pt[1];
      const pMin = Math.min(...box.map(pAt)); // coin (0,240)
      const pMax = Math.max(...box.map(pAt)); // coin (200,0)
      const out = [];
      for (let k = 0; k < 4; k++) {
        const lo = pMin + ((pMax - pMin) * k) / 4;
        const hi = pMin + ((pMax - pMin) * (k + 1)) / 4;
        // Bande = box clippee par (p >= lo) et (p <= hi).
        let region = box;
        region = clipHalfPlane(region, (pt) => pAt(pt) - lo >= 0); // garder p>=lo
        region = clipHalfPlane(region, (pt) => hi - pAt(pt) >= 0); // garder p<=hi
        out.push(poly(region));
      }
      return out;
    }
  },

  'tierce-pairle': {
    nom: 'Tierce en pairle (3)',
    count: 3,
    lines: [[[CX, CY], [0, 0]], [[CX, CY], [W, 0]], [[CX, CY], [CX, H]]],
    // 3 regions d'un Y : haut, gauche, droite.
    build: () => [
      poly([[CX, CY], [0, 0], [W, 0]]),
      poly([[CX, CY], [0, 0], [0, H], [CX, H]]),
      poly([[CX, CY], [W, 0], [W, H], [CX, H]])
    ]
  }
};

/** Ordre d'affichage des partitions dans l'UI (ordre de la planche de reference). */
export const PARTITION_ORDER = [
  'plain',
  'parti',
  'coupe',
  'taille',
  'tranche',
  'tierce-pal',
  'ecartele',
  'ecartele-sautoir',
  'gironne',
  'bande',
  'tierce-pairle'
];

/**
 * Renvoie les regions d'une partition, chacune avec son polygone, sa boite
 * englobante (utile au moteur de disposition) et les lignes de division.
 * @param {string} partitionId
 * @returns {{regions:Array<{points:number[][],bounds:object}>, lines:number[][][], count:number}}
 */
export function getRegions(partitionId) {
  const part = PARTITIONS[partitionId] || PARTITIONS.plain;
  const regions = part.build().map((points) => ({ points, bounds: polyBounds(points) }));
  return { regions, lines: part.lines || [], count: part.count };
}

/**
 * Nombre de quartiers attendus pour une partition.
 * @param {string} partitionId
 * @returns {number}
 */
export function partitionCount(partitionId) {
  return (PARTITIONS[partitionId] || PARTITIONS.plain).count;
}

// ---------- Utilitaires geometriques ----------

function rect(x, y, w, h) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}
function poly(points) {
  return points;
}

/** Boite englobante d'un polygone. */
function polyBounds(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/**
 * Clippe un polygone convexe par un demi-plan (Sutherland-Hodgman).
 * @param {number[][]} polygon
 * @param {(pt:number[])=>boolean} inside garde le point si vrai
 * @returns {number[][]}
 */
function clipHalfPlane(polygon, inside) {
  const out = [];
  for (let i = 0; i < polygon.length; i++) {
    const cur = polygon[i];
    const prev = polygon[(i + polygon.length - 1) % polygon.length];
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur, inside));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur, inside));
    }
  }
  return out;
}

/** Point d'intersection segment/frontiere par recherche dichotomique (robuste, sans equation). */
function intersect(a, b, inside) {
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    const pt = [a[0] + (b[0] - a[0]) * mid, a[1] + (b[1] - a[1]) * mid];
    if (inside(pt) === inside(a)) lo = mid;
    else hi = mid;
  }
  const t = (lo + hi) / 2;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Convertit un polygone en chaine de points SVG. */
export function pointsToSvg(points) {
  return points.map((p) => `${round(p[0])},${round(p[1])}`).join(' ');
}
function round(v) {
  return Math.round(v * 100) / 100;
}
