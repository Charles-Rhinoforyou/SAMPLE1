/**
 * tinctures.js — Palette heraldique : metaux, emaux et fourrures.
 *
 * Chaque teinture porte :
 *  - `nom`       : libelle francais (blason) ;
 *  - `categorie` : 'metal' | 'email' | 'fourrure' (pour la regle de contrariete) ;
 *  - `couleur`   : couleur CSS de rendu ;
 *  - `pattern`   : (fourrures uniquement) id du motif SVG a utiliser comme remplissage.
 *
 * Les couleurs sont des rendus "conventionnels" lisibles a l'ecran, pas des
 * references Pantone. Elles restent facilement ajustables ici.
 */

export const TINCTURES = {
  // --- Metaux ---
  or: { nom: 'Or', categorie: 'metal', couleur: '#f1c40f' },
  argent: { nom: 'Argent', categorie: 'metal', couleur: '#f4f6f7' },

  // --- Emaux (couleurs) ---
  gueules: { nom: 'Gueules (rouge)', categorie: 'email', couleur: '#c0392b' },
  azur: { nom: 'Azur (bleu)', categorie: 'email', couleur: '#2456a4' },
  sinople: { nom: 'Sinople (vert)', categorie: 'email', couleur: '#218c5a' },
  sable: { nom: 'Sable (noir)', categorie: 'email', couleur: '#1c1c1c' },
  pourpre: { nom: 'Pourpre', categorie: 'email', couleur: '#7d3c98' },

  // --- Fourrures (rendues via motifs SVG, voir shield-renderer.js) ---
  hermine: { nom: 'Hermine', categorie: 'fourrure', couleur: '#f4f6f7', pattern: 'pat-hermine' },
  vair: { nom: 'Vair', categorie: 'fourrure', couleur: '#f4f6f7', pattern: 'pat-vair' }
};

/** Ordre d'affichage recommande dans l'UI (groupé par categorie). */
export const TINCTURE_ORDER = [
  'or',
  'argent',
  'gueules',
  'azur',
  'sinople',
  'sable',
  'pourpre',
  'hermine',
  'vair'
];

/**
 * Resout la "couleur de remplissage" a appliquer pour une teinture donnee.
 * Pour une fourrure, on renvoie une reference au motif SVG (url(#id)).
 * @param {string} tinctureId
 * @returns {string} valeur CSS/SVG de `fill`
 */
export function fillForTincture(tinctureId) {
  const t = TINCTURES[tinctureId];
  if (!t) return '#888888';
  if (t.categorie === 'fourrure' && t.pattern) return `url(#${t.pattern})`;
  return t.couleur;
}
