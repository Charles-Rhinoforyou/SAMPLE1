/**
 * crowns.js — Couronnes / timbres heraldiques par titre.
 *
 * Inspire de la planche "Les couronnes heraldiques" (systeme francais). Chaque
 * rang se distingue par son ornementation, du plus bas au plus haut :
 *   - baron   : tortil (cordon perle) autour d'un cercle simple ;
 *   - vicomte : cercle a quelques grosses perles sur pointes ;
 *   - comte   : cercle a rang de perles sur pointes (nombreuses) ;
 *   - marquis : fleurons alternes avec des trefles de perles ;
 *   - duc     : cercle a fleurons (feuilles), sans perles ;
 *   - prince  : couronne FERMEE a fleurons + arches + globe ;
 *   - royale  : couronne fermee a arches + croisette sommitale (roi).
 *
 * Repere `0 0 120 60` (large, peu haut), centre X = 60. Rendu monochrome (or),
 * pose au-dessus de l'ecu et mis a l'echelle selon sa largeur.
 */

export const CROWN_VIEWBOX = '0 0 120 60';

const BAND_TOP = 40; // haut du bandeau
const BAND_BOT = 52; // bas du bandeau

export const CROWNS = {
  aucune: { nom: 'Aucune', pathData: null },

  baron: {
    nom: 'Baron',
    // Cercle + tortil (rang de perles enfilees) sur le bandeau.
    pathData: bande() + rowPearls(rangeXs(28, 92, 8), 46, 2.6)
  },

  vicomte: {
    nom: 'Vicomte',
    // Cercle a 3 grosses perles sur courtes pointes + 2 petites.
    pathData:
      bande() +
      pointPearls([38, 60, 82], 4, 11) +
      pointPearls([26, 94], 2.6, 7)
  },

  comte: {
    nom: 'Comte',
    // Cercle a rang de perles sur pointes (9 perles).
    pathData: bande() + pointPearls(rangeXs(20, 100, 9), 3, 9)
  },

  marquis: {
    nom: 'Marquis',
    // Fleurons alternes avec des trefles de 3 perles.
    pathData:
      bande() +
      fleurons([28, 60, 92], 15) +
      trefles([44, 76])
  },

  duc: {
    nom: 'Duc',
    // Cercle a fleurons (feuilles), sans perles.
    pathData: bande() + fleurons([24, 42, 60, 78, 96], 16)
  },

  prince: {
    nom: 'Prince',
    // Couronne fermee : fleurons + 2 arches + globe.
    pathData:
      bande() +
      fleurons([26, 60, 94], 13) +
      arch(20, 100, 8) +
      arch(38, 82, 4) +
      circle(60, 8, 3)
  },

  royale: {
    nom: 'Royale (roi)',
    // Couronne fermee : fleurons + 3 arches + globe + croisette.
    pathData:
      bande() +
      fleurons([24, 44, 60, 76, 96], 13) +
      arch(18, 102, 9) +
      arch(34, 86, 6) +
      arch(50, 70, 4) +
      circle(60, 9, 3) +
      // Croisette sommitale (coordonnees positives pour rester dans le viewBox).
      'M58.5,6 L61.5,6 L61.5,3 L64,3 L64,1 L61.5,1 L61.5,0 L58.5,0 L58.5,1 L56,1 L56,3 L58.5,3 Z'
  }
};

export const CROWN_ORDER = ['aucune', 'baron', 'vicomte', 'comte', 'marquis', 'duc', 'prince', 'royale'];

// ---------- Fabriques de motifs ----------

/** Bandeau (cercle) legerement galbe. */
function bande(x0 = 14, x1 = 106) {
  return (
    `M${x0},${BAND_TOP} Q60,${BAND_TOP - 3} ${x1},${BAND_TOP} ` +
    `L${x1},${BAND_BOT} Q60,${BAND_BOT - 3} ${x0},${BAND_BOT} Z `
  );
}

/** Abscisses reparties uniformement (n points entre x0 et x1). */
function rangeXs(x0, x1, n) {
  const xs = [];
  for (let i = 0; i < n; i++) xs.push(x0 + ((x1 - x0) * i) / (n - 1));
  return xs;
}

/** Rang de perles (petits cercles) a une hauteur donnee. */
function rowPearls(xs, cy, r) {
  return xs.map((x) => circle(x, cy, r)).join(' ') + ' ';
}

/** Perles au sommet de pointes partant du haut du bandeau. */
function pointPearls(xs, r, len) {
  return (
    xs
      .map((x) => {
        const spike = `M${x - 2.4},${BAND_TOP} L${x},${BAND_TOP - len} L${x + 2.4},${BAND_TOP} Z`;
        return `${spike} ${circle(x, BAND_TOP - len - r + 1.5, r)}`;
      })
      .join(' ') + ' '
  );
}

/** Fleurons (feuilles trilobees) a des abscisses donnees. */
function fleurons(xs, h) {
  return (
    xs
      .map((x) => {
        const b = BAND_TOP;
        const t = b - h;
        return (
          `M${x},${t} ` +
          `C${x - 2.5},${t + 3} ${x - 8},${t + 4} ${x - 8},${b - 1} ` +
          `C${x - 8},${b - 6} ${x - 3},${b - 5} ${x},${b - 8} ` +
          `C${x + 3},${b - 5} ${x + 8},${b - 6} ${x + 8},${b - 1} ` +
          `C${x + 8},${t + 4} ${x + 2.5},${t + 3} ${x},${t} Z`
        );
      })
      .join(' ') + ' '
  );
}

/** Trefles de 3 perles (motif du marquis) a des abscisses donnees. */
function trefles(xs) {
  return (
    xs
      .map((x) => {
        const b = BAND_TOP;
        return `${circle(x, b - 10, 2.6)} ${circle(x - 5, b - 5, 2.6)} ${circle(x + 5, b - 5, 2.6)}`;
      })
      .join(' ') + ' '
  );
}

/** Arche fine (couronne fermee) du bandeau (x0) au sommet et vers (x1). */
function arch(x0, x1, topY) {
  const cx = (x0 + x1) / 2;
  return (
    `M${x0},${BAND_TOP} Q${cx},${topY} ${x1},${BAND_TOP} ` +
    `L${x1 - 3.5},${BAND_TOP} Q${cx},${topY + 5} ${x0 + 3.5},${BAND_TOP} Z `
  );
}

function circle(cx, cy, r) {
  return `M${cx - r},${cy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0 Z`;
}

/**
 * Resout une couronne par id.
 * @param {string} id
 * @returns {{nom:string, pathData:string|null}}
 */
export function getCrown(id) {
  return CROWNS[id] || CROWNS.aucune;
}
