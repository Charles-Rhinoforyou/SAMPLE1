/**
 * design-document.js — Schema et (de)serialisation du "document design".
 *
 * Le document design est l'UNIQUE source de verite : tout le blason tient dans
 * cet objet JSON. Le recharger reconstruit exactement le design.
 *
 * Phase 2 : introduction des QUARTIERS. L'ecu peut etre divise par une PARTITION
 * (parti, coupe, ecartele...). Chaque region est un mini-blason complet
 * (champ + meubles + disposition parametrique), stocke dans `ecu.quartiers[]`.
 * Un ecu "plain" a un seul quartier couvrant tout l'ecu.
 *
 * Compatibilite : un document de la Phase 1 (ecu.champ + meubles au niveau racine)
 * est migre automatiquement vers un quartier unique.
 */

export const DESIGN_SCHEMA_VERSION = 2;

/** Disposition parametrique par defaut d'un quartier. */
export function defaultLayout() {
  return {
    disposition: 'libre', // 'libre' | 'pal' | 'fasce' | 'bande' | 'barre' | 'grille' | 'orle' | 'cercle' | 'rangs' | 'chef' | 'pointe'
    nombre: 3, // nombre d'elements pilote par la disposition (steppers UI)
    marge: 22, // marge interieure (unites d'ecu)
    espacement: 1, // facteur d'espacement entre elements
    echelle: 1, // facteur d'echelle global des meubles du quartier
    cols: 2, // colonnes (grille)
    rows: 2 // lignes (grille)
  };
}

/**
 * Cree un quartier (mini-blason d'une region de l'ecu).
 * @param {string} [tincture]
 * @returns {object}
 */
export function createQuartier(tincture = 'azur') {
  return {
    id: genId('q'),
    champ: { tincture },
    meubles: [],
    layout: defaultLayout()
  };
}

/**
 * Cree un document design vierge et valide.
 * @returns {object}
 */
export function createEmptyDesign() {
  return {
    version: DESIGN_SCHEMA_VERSION,
    meta: {
      nom: 'Blason sans nom',
      creeLe: new Date().toISOString(),
      modifieLe: new Date().toISOString()
    },
    ecu: {
      forme: 'francais-moderne',
      partition: 'plain', // id d'une partition de engine2d/composition.js
      quartiers: [createQuartier('azur')]
    },
    // Symboles personnalises importes (stockes dans le document = export autonome).
    customSymbols: [],
    // Couronne / timbre par titre (Phase 2).
    couronne: { type: 'aucune' },
    // Devise sur listel (Phase 2).
    devise: {
      texte: '',
      visible: false,
      police: 'Georgia, "Times New Roman", serif',
      taille: 16,
      couleur: '#f4f6f7',
      casse: 'majuscules', // 'normale' | 'majuscules'
      listel: true, // afficher la banderole
      couleurListel: 'gueules',
      courbure: 14 // fleche de la courbure du listel (0 = droit)
    },
    // Parametres de la chevaliere 3D (Phase 4) + materiau/finition (Phase 5).
    ring3d: defaultRing3d(),
    materiau: 'or-jaune',
    finition: 'poli'
  };
}

/** Parametres 3D par defaut de la chevaliere (dimensions en millimetres). */
export function defaultRing3d() {
  return {
    plateauForme: 'ovale', // 'ecu' | 'rond' | 'ovale' | 'coussin' | 'rectangle' | 'octogone'
    tourDoigtMm: 17.2, // diametre interieur (mm) -> pilote le diametre de l'anneau
    anneauLargeur: 5.5, // largeur de l'anneau (mm)
    anneauEpaisseur: 2.2, // epaisseur de l'anneau (mm)
    epaulement: 1.2, // evasement des epaules vers le plateau (0 = jonc uniforme)
    plateauLargeur: 15, // largeur du plateau (mm)
    plateauHauteur: 18, // hauteur/longueur du plateau (mm)
    plateauEpaisseur: 2.8, // epaisseur du plateau (mm)
    conge: 2.5, // congé plateau <-> anneau (mm)
    relief: 'bosse', // 'bosse' (relief positif) | 'creux' (intaille)
    profondeur: 0.7, // profondeur/hauteur du relief (mm)
    biseau: true // biseaux/chanfreins sur le relief
  };
}

/**
 * Cree un meuble (charge heraldique) pose dans un quartier.
 * @param {object} opts
 * @returns {object}
 */
export function createMeuble({ symbolId, tincture = 'or', x = 100, y = 120, scale = 1, rotation = 0, z = 0 }) {
  return {
    id: genId('meuble'),
    symbolId,
    tincture,
    x,
    y,
    scale,
    rotation,
    z
  };
}

/** Genere un identifiant court unique. */
export function genId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Clone profond d'un document design. */
export function cloneDesign(design) {
  return structuredClone(design);
}

// ---------- Accesseurs transverses (quartiers / meubles) ----------

/** Renvoie la liste des quartiers du design. */
export function getQuartiers(design) {
  return design?.ecu?.quartiers || [];
}

/**
 * Retrouve un meuble par id a travers tous les quartiers.
 * @param {object} design
 * @param {string} meubleId
 * @returns {{quartier:object, quartierIndex:number, meuble:object}|null}
 */
export function findMeuble(design, meubleId) {
  const quartiers = getQuartiers(design);
  for (let i = 0; i < quartiers.length; i++) {
    const m = (quartiers[i].meubles || []).find((x) => x.id === meubleId);
    if (m) return { quartier: quartiers[i], quartierIndex: i, meuble: m };
  }
  return null;
}

// ---------- (De)serialisation ----------

/** Serialise le document en JSON indente (export .json). */
export function serializeDesign(design) {
  const copy = cloneDesign(design);
  for (const key of Object.keys(copy)) {
    if (key.startsWith('_')) delete copy[key];
  }
  copy.meta = { ...copy.meta, modifieLe: new Date().toISOString() };
  return JSON.stringify(copy, null, 2);
}

/** Deserialise une chaine JSON en document design valide (migration douce). */
export function deserializeDesign(json) {
  let parsed;
  try {
    parsed = typeof json === 'string' ? JSON.parse(json) : json;
  } catch (e) {
    throw new Error('Fichier JSON invalide : ' + e.message);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Document design invalide.');
  }
  return migrateDesign(parsed);
}

/**
 * Migre/normalise un document importe vers le schema courant.
 * @param {object} parsed
 * @returns {object}
 */
export function migrateDesign(parsed) {
  const base = createEmptyDesign();
  const out = {
    ...base,
    ...parsed,
    version: DESIGN_SCHEMA_VERSION,
    meta: { ...base.meta, ...(parsed.meta || {}) },
    customSymbols: Array.isArray(parsed.customSymbols) ? parsed.customSymbols : [],
    couronne: { ...base.couronne, ...(parsed.couronne || {}) },
    devise: { ...base.devise, ...(parsed.devise || {}) },
    ring3d: { ...defaultRing3d(), ...(parsed.ring3d || {}) },
    materiau: parsed.materiau || 'or-jaune',
    finition: parsed.finition || 'poli'
  };

  // --- Ecu / quartiers ---
  const parsedEcu = parsed.ecu || {};
  if (Array.isArray(parsedEcu.quartiers) && parsedEcu.quartiers.length) {
    // Deja au format Phase 2.
    out.ecu = {
      forme: parsedEcu.forme || base.ecu.forme,
      partition: parsedEcu.partition || 'plain',
      quartiers: parsedEcu.quartiers.map(normalizeQuartier)
    };
  } else {
    // Migration Phase 1 -> un quartier unique reprenant champ + meubles racine.
    const q = createQuartier(parsedEcu.champ?.tincture || 'azur');
    q.meubles = Array.isArray(parsed.meubles) ? parsed.meubles : [];
    out.ecu = {
      forme: parsedEcu.forme || base.ecu.forme,
      partition: 'plain',
      quartiers: [q]
    };
  }
  return out;
}

/** Normalise un quartier importe (comble les champs manquants). */
function normalizeQuartier(q) {
  return {
    id: q.id || genId('q'),
    champ: { tincture: q.champ?.tincture || 'azur' },
    meubles: Array.isArray(q.meubles) ? q.meubles : [],
    layout: { ...defaultLayout(), ...(q.layout || {}) }
  };
}
