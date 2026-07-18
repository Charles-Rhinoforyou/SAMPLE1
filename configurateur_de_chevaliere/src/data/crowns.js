/**
 * crowns.js — Couronnes / timbres heraldiques par titre.
 *
 * Chaque couronne est un dessin vectoriel monochrome (or) defini dans un repere
 * `0 0 120 60` (large, peu haut), pense pour etre pose AU-DESSUS de l'ecu et mis
 * a l'echelle selon sa largeur. Le point d'ancrage horizontal est le centre.
 *
 * Les couronnes sont stylisees mais respectent la hierarchie des rangs (nombre de
 * fleurons/perles croissant avec le titre).
 */

export const CROWN_VIEWBOX = '0 0 120 60';

export const CROWNS = {
  aucune: { nom: 'Aucune', pathData: null },

  baron: {
    nom: 'Baron',
    // Tortil de baron : bandeau avec rang de perles.
    pathData:
      'M18,40 L102,40 L102,52 L18,52 Z ' +
      perles([28, 40, 52, 64, 76, 88, 100 - 8], 34, 4)
  },

  vicomte: {
    nom: 'Vicomte',
    pathData:
      'M18,40 L102,40 L102,52 L18,52 Z ' +
      perles([34, 52, 70, 86], 33, 5)
  },

  comte: {
    nom: 'Comte',
    // Cercle a rang de perles sur pointes.
    pathData:
      'M16,40 L104,40 L104,52 L16,52 Z ' +
      pointesPerles(9, 16, 104, 40, 6)
  },

  marquis: {
    nom: 'Marquis',
    // Fleurons alternes avec touffes de perles.
    pathData:
      'M14,40 L106,40 L106,52 L14,52 Z ' +
      fleurons([26, 60, 94], 40, 12) +
      pointesPerles(4, 14, 106, 40, 4)
  },

  duc: {
    nom: 'Duc',
    // Couronne a fleurons (feuilles) sur le cercle.
    pathData:
      'M12,40 L108,40 L108,52 L12,52 Z ' +
      fleurons([24, 42, 60, 78, 96], 40, 14)
  },

  prince: {
    nom: 'Prince',
    // Couronne fermee : cercle a fleurons + demi-cercles (bonnet).
    pathData:
      'M12,40 L108,40 L108,52 L12,52 Z ' +
      fleurons([24, 48, 72, 96], 40, 15) +
      'M20,40 Q60,4 100,40 Z'
  },

  royale: {
    nom: 'Royale',
    // Couronne fermee a arches et globe.
    pathData:
      'M10,40 L110,40 L110,52 L10,52 Z ' +
      fleurons([22, 44, 60, 76, 98], 40, 16) +
      'M18,40 Q60,0 102,40 ' + // arche
      'M60,8 L60,2 M56,5 L64,5' // croisette sommitale
  }
};

/** Ordre d'affichage (rang croissant). */
export const CROWN_ORDER = ['aucune', 'baron', 'vicomte', 'comte', 'marquis', 'duc', 'prince', 'royale'];

// ---------- Fabriques de motifs ----------

/** Rang de perles (petits cercles) a une hauteur donnee. */
function perles(xs, cy, r) {
  return xs.map((x) => circle(x, cy, r)).join(' ');
}

/** Perles au sommet de pointes reparties entre x0 et x1. */
function pointesPerles(count, x0, x1, baseY, r) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = x0 + ((x1 - x0) * (i + 0.5)) / count;
    s += `M${x - 3},${baseY} L${x},${baseY - 10} L${x + 3},${baseY} Z `;
    s += circle(x, baseY - 13, r) + ' ';
  }
  return s;
}

/** Fleurons (feuilles trilobees stylisees) a des abscisses donnees. */
function fleurons(xs, baseY, height) {
  return xs
    .map((x) => {
      const t = baseY - height;
      return `M${x - 8},${baseY} C${x - 8},${t + 4} ${x - 4},${t} ${x},${t} C${x + 4},${t} ${x + 8},${t + 4} ${x + 8},${baseY} Z`;
    })
    .join(' ');
}

function circle(cx, cy, r) {
  return `M${cx - r},${cy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0 Z`;
}

/**
 * Resout une couronne par id (gere l'alias prince).
 * @param {string} id
 * @returns {{nom:string, pathData:string|null}}
 */
export function getCrown(id) {
  const c = CROWNS[id];
  if (!c) return CROWNS.aucune;
  if (c.alias) return CROWNS[c.alias];
  return c;
}
