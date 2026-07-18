/**
 * shields.js — Formes d'ecu (heaumes de blason).
 *
 * Les 10 formes reprennent la planche de reference classique :
 *   1 Francais ancien, 2 Francais moderne, 3 Dames, 4 Demoiselles,
 *   5 Tournois/Banniere, 6 Suisse, 7 Anglais, 8 Allemand, 9 Polonais,
 *   10 Espagnol/Portugais/Flamand.
 *
 * IMPORTANT : toutes les formes partagent le MEME repere normalise, un viewBox
 * `0 0 200 240`. Le `path` de chaque forme sert simultanement :
 *   - de CONTOUR visible (stroke) ;
 *   - de MASQUE de decoupe (clipPath) pour le champ et les meubles.
 * Une seule source de verite par forme : changer d'ecu = remplacer ce `path`.
 *
 * `centre` et `bounds` decrivent la zone utile interne (placement par defaut des
 * meubles en Phase 1 ; moteur de disposition parametrique en Phase 2).
 */

export const SHIELD_VIEWBOX = { width: 200, height: 240 };

export const SHIELDS = {
  'francais-ancien': {
    nom: 'Ecu francais ancien',
    // Tete plate, flancs droits puis galbes vers une pointe basse.
    path: 'M35,20 L165,20 L165,120 C165,176 140,206 100,226 C60,206 35,176 35,120 Z',
    centre: { x: 100, y: 112 },
    bounds: { x: 40, y: 26, width: 120, height: 180 }
  },
  'francais-moderne': {
    nom: 'Ecu francais moderne',
    // Flancs droits, base horizontale a coins arrondis avec petite pointe centrale.
    path: 'M35,20 L165,20 L165,180 Q165,198 148,201 L110,201 Q100,211 90,201 L52,201 Q35,198 35,180 Z',
    centre: { x: 100, y: 110 },
    bounds: { x: 42, y: 26, width: 116, height: 168 }
  },
  dames: {
    nom: 'Ecu des Dames (ovale)',
    // Ovale : armes des dames mariees.
    path: 'M100,18 C142,18 172,64 172,122 C172,180 142,224 100,224 C58,224 28,180 28,122 C28,64 58,18 100,18 Z',
    centre: { x: 100, y: 121 },
    bounds: { x: 44, y: 44, width: 112, height: 154 }
  },
  demoiselles: {
    nom: 'Ecu des Demoiselles (losange)',
    // Losange : armes des demoiselles.
    path: 'M100,16 L178,120 L100,224 L22,120 Z',
    centre: { x: 100, y: 120 },
    bounds: { x: 54, y: 74, width: 92, height: 92 }
  },
  tournois: {
    nom: 'Ecu des Tournois / Banniere',
    // Carre a coins arrondis.
    path: 'M50,32 L150,32 Q162,32 162,44 L162,196 Q162,208 150,208 L50,208 Q38,208 38,196 L38,44 Q38,32 50,32 Z',
    centre: { x: 100, y: 120 },
    bounds: { x: 46, y: 40, width: 108, height: 160 }
  },
  suisse: {
    nom: 'Ecu suisse',
    // Tete decoupee (epaules arrondies + petite echancrure centrale), pointe basse.
    path: 'M40,34 Q48,26 60,30 Q74,34 85,30 L100,40 L115,30 Q126,34 140,30 Q152,26 160,34 L160,120 C160,176 135,206 100,226 C65,206 40,176 40,120 Z',
    centre: { x: 100, y: 118 },
    bounds: { x: 46, y: 42, width: 108, height: 170 }
  },
  anglais: {
    nom: 'Ecu anglais',
    // Rectangulaire, coins hauts droits, base a petite pointe centrale.
    path: 'M36,22 L164,22 L164,188 Q164,195 157,197 L110,197 Q100,207 90,197 L43,197 Q36,195 36,188 Z',
    centre: { x: 100, y: 108 },
    bounds: { x: 42, y: 28, width: 116, height: 166 }
  },
  allemand: {
    nom: 'Ecu allemand',
    // Ecu baroque a "bouche" (encoche a lance) et flancs galbes (silhouette stylisee).
    path: 'M42,32 C62,22 90,26 100,32 C106,24 122,22 132,34 C124,42 134,52 144,46 C160,54 164,94 156,132 C148,182 120,210 96,224 C72,206 46,180 44,140 C38,100 32,50 42,32 Z',
    centre: { x: 98, y: 116 },
    bounds: { x: 48, y: 40, width: 104, height: 160 }
  },
  polonais: {
    nom: 'Ecu polonais',
    // Cartouche baroque symetrique a bords chantournes (silhouette stylisee).
    path: 'M100,24 C110,20 118,26 116,34 C128,28 140,34 138,46 C150,44 156,56 150,66 C160,92 156,150 130,196 C118,214 108,222 100,226 C92,222 82,214 70,196 C44,150 40,92 50,66 C44,56 50,44 62,46 C60,34 72,28 84,34 C82,26 90,20 100,24 Z',
    centre: { x: 100, y: 120 },
    bounds: { x: 52, y: 46, width: 96, height: 156 }
  },
  espagnol: {
    nom: 'Ecu espagnol / portugais / flamand',
    // Tete plate, flancs droits, base en demi-cercle.
    path: 'M36,22 L164,22 L164,140 A64,64 0 0 1 36,140 Z',
    centre: { x: 100, y: 110 },
    bounds: { x: 42, y: 28, width: 116, height: 168 }
  }
};

/** Ordre d'affichage des formes dans l'UI (ordre de la planche de reference). */
export const SHIELD_ORDER = [
  'francais-ancien',
  'francais-moderne',
  'dames',
  'demoiselles',
  'tournois',
  'suisse',
  'anglais',
  'allemand',
  'polonais',
  'espagnol'
];

/**
 * Recupere une forme d'ecu par id (avec repli sur la forme par defaut).
 * @param {string} id
 * @returns {object}
 */
export function getShield(id) {
  return SHIELDS[id] || SHIELDS['francais-moderne'];
}
