/**
 * ring-sizes.js — Tours de doigt et correspondances de tailles de bague.
 *
 * La reference physique est le DIAMETRE INTERIEUR en millimetres, qui pilote
 * reellement la geometrie de l'anneau. On fournit les correspondances usuelles :
 *   - France (tour de doigt = circonference en mm, ~ isotour) ;
 *   - USA (echelle numerique) ;
 *   - Royaume-Uni (echelle alphabetique).
 *
 * Table condensee et interpolable ; valeurs arrondies usuelles.
 */

export const RING_SIZES = [
  // { mmDiam: diametre interieur mm, fr: tour de doigt (circonf. mm), us, uk }
  { mmDiam: 14.0, fr: 44, us: 3, uk: 'F' },
  { mmDiam: 14.7, fr: 46, us: 3.75, uk: 'H' },
  { mmDiam: 15.3, fr: 48, us: 4.5, uk: 'J' },
  { mmDiam: 15.9, fr: 50, us: 5.25, uk: 'K' },
  { mmDiam: 16.6, fr: 52, us: 6, uk: 'M' },
  { mmDiam: 17.2, fr: 54, us: 6.75, uk: 'O' },
  { mmDiam: 17.8, fr: 56, us: 7.5, uk: 'P' },
  { mmDiam: 18.5, fr: 58, us: 8.25, uk: 'R' },
  { mmDiam: 19.1, fr: 60, us: 9, uk: 'T' },
  { mmDiam: 19.7, fr: 62, us: 10, uk: 'U' },
  { mmDiam: 20.4, fr: 64, us: 10.75, uk: 'W' },
  { mmDiam: 21.0, fr: 66, us: 11.5, uk: 'Y' },
  { mmDiam: 21.7, fr: 68, us: 12.25, uk: 'Z+1' }
];

/**
 * Trouve la correspondance la plus proche d'un diametre interieur (mm).
 * @param {number} mmDiam
 * @returns {object}
 */
export function nearestSize(mmDiam) {
  return RING_SIZES.reduce((best, s) =>
    Math.abs(s.mmDiam - mmDiam) < Math.abs(best.mmDiam - mmDiam) ? s : best
  , RING_SIZES[0]);
}
