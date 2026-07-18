/**
 * heraldry-rules.js — Le coeur du "systeme de conception" heraldique.
 *
 * Ce module regroupe les REGLES du blason, independamment de tout rendu :
 *  - classification des teintures (metaux / emaux / fourrures) ;
 *  - regle de contrariete des couleurs (metal sur metal, couleur sur couleur) ;
 *  - utilitaires de validation heraldique non bloquants.
 *
 * Les phases suivantes enrichiront ce module (dispositions, partitions, etc.).
 */

import { TINCTURES } from '../data/tinctures.js';

/**
 * Retourne la nature d'une teinture : 'metal' | 'email' | 'fourrure'.
 * @param {string} tinctureId
 * @returns {string|null}
 */
export function tinctureCategory(tinctureId) {
  const t = TINCTURES[tinctureId];
  return t ? t.categorie : null;
}

/**
 * Regle de contrariete des couleurs (regle fondamentale du blason) :
 *  - on ne pose pas metal sur metal, ni couleur (email) sur couleur.
 *  - les fourrures sont considerees neutres (tolerees) dans cette implementation.
 *
 * La verification est NON BLOQUANTE : elle sert seulement a signaler visuellement
 * une infraction, l'utilisateur reste libre.
 *
 * @param {string} fondTincture teinture du champ (ou du fond immediat)
 * @param {string} meubleTincture teinture du meuble pose dessus
 * @returns {{ok:boolean, message:string}}
 */
export function verifierContrariete(fondTincture, meubleTincture) {
  const catFond = tinctureCategory(fondTincture);
  const catMeuble = tinctureCategory(meubleTincture);

  // Les fourrures sont neutres : pas d'infraction signalee.
  if (catFond === 'fourrure' || catMeuble === 'fourrure') {
    return { ok: true, message: '' };
  }
  if (!catFond || !catMeuble) {
    return { ok: true, message: '' };
  }
  if (catFond === catMeuble) {
    const nature = catFond === 'metal' ? 'metal sur metal' : 'couleur sur couleur';
    return {
      ok: false,
      message: `Entorse a la regle de contrariete : ${nature}.`
    };
  }
  return { ok: true, message: '' };
}

/**
 * Analyse l'ensemble du design et retourne la liste des avertissements
 * heraldiques (non bloquants) sur les meubles poses.
 * @param {object} design document design
 * @returns {Array<{meubleId:string, message:string}>}
 */
export function analyserDesign(design) {
  const warnings = [];
  const fond = design?.ecu?.champ?.tincture;
  for (const m of design.meubles || []) {
    const res = verifierContrariete(fond, m.tincture);
    if (!res.ok) warnings.push({ meubleId: m.id, message: res.message });
  }
  return warnings;
}
