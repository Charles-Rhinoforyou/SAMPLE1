/**
 * design-document.js — Schema et (de)serialisation du "document design".
 *
 * Le document design est l'UNIQUE source de verite : tout le blason (et, aux
 * phases suivantes, la composition, la couronne, la devise et les parametres 3D)
 * tient dans cet objet JSON. Le recharger reconstruit exactement le design.
 *
 * Regle de conception : les champs des phases futures (composition, couronne 3D...)
 * sont deja prevus comme OPTIONNELS afin de ne jamais casser la compatibilite du
 * schema au fil des phases.
 */

// Version du schema. Sert a migrer d'anciens documents si le format evolue.
export const DESIGN_SCHEMA_VERSION = 1;

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
    // --- Ecu (Phase 1) ---
    ecu: {
      forme: 'francais-moderne', // id d'une forme de src/data/shields.js
      champ: {
        tincture: 'azur' // teinture de fond (id de src/data/tinctures.js)
      }
    },
    // --- Meubles poses sur l'ecu (Phase 1) ---
    // Chaque meuble reference un symbole (bibliotheque ou perso) et porte sa
    // transformation dans le repere normalise de l'ecu (viewBox 0 0 200 240).
    meubles: [],
    // --- Symboles personnalises importes par l'utilisateur (Phase 1) ---
    // Stockes DANS le document pour que l'export JSON soit autonome.
    customSymbols: [],
    // --- Emplacements reserves pour les phases suivantes (optionnels) ---
    composition: null, // Phase 2 : partitions (parti/coupe/ecartele)
    couronne: null, // Phase 2 : timbre/couronne par titre
    devise: null, // Phase 2 : texte + listel
    ring3d: null, // Phase 3+ : parametres de la chevaliere 3D
    materiau: null // Phase 5 : materiau PBR
  };
}

/**
 * Cree un meuble (charge heraldique) pose sur l'ecu.
 * @param {object} opts
 * @returns {object}
 */
export function createMeuble({ symbolId, tincture = 'or', x = 100, y = 120, scale = 1, rotation = 0, z = 0 }) {
  return {
    id: genId('meuble'),
    symbolId, // id de bibliotheque (ex. 'lion') ou de symbole perso (ex. 'custom-xxxx')
    tincture, // teinture appliquee au meuble
    x, // position X (centre) dans le repere ecu 0..200
    y, // position Y (centre) dans le repere ecu 0..240
    scale, // facteur d'echelle
    rotation, // rotation en degres
    z // ordre de superposition (plus grand = au-dessus)
  };
}

/**
 * Genere un identifiant court unique (suffisant cote client).
 * @param {string} prefix
 * @returns {string}
 */
export function genId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Clone profond d'un document design (structure JSON pure, donc clonable ainsi).
 * @param {object} design
 * @returns {object}
 */
export function cloneDesign(design) {
  // structuredClone est disponible sur tous les navigateurs modernes vises.
  return structuredClone(design);
}

/**
 * Serialise le document en chaine JSON indentee (pour export .json).
 * @param {object} design
 * @returns {string}
 */
export function serializeDesign(design) {
  const copy = cloneDesign(design);
  // On ne persiste pas les champs internes prefixes par '_'.
  for (const key of Object.keys(copy)) {
    if (key.startsWith('_')) delete copy[key];
  }
  copy.meta = { ...copy.meta, modifieLe: new Date().toISOString() };
  return JSON.stringify(copy, null, 2);
}

/**
 * Deserialise une chaine JSON en document design valide (avec migration douce).
 * @param {string} json
 * @returns {object}
 * @throws {Error} si le JSON est invalide ou incompatible
 */
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
 * Fusionne un document importe avec le schema courant pour combler les champs
 * manquants (compatibilite ascendante et descendante douce).
 * @param {object} parsed
 * @returns {object}
 */
export function migrateDesign(parsed) {
  const base = createEmptyDesign();
  // Fusion superficielle raisonnee : on garde les valeurs importees quand elles
  // existent, sinon on retombe sur les valeurs par defaut du schema courant.
  return {
    ...base,
    ...parsed,
    version: DESIGN_SCHEMA_VERSION,
    meta: { ...base.meta, ...(parsed.meta || {}) },
    ecu: { ...base.ecu, ...(parsed.ecu || {}), champ: { ...base.ecu.champ, ...(parsed.ecu?.champ || {}) } },
    meubles: Array.isArray(parsed.meubles) ? parsed.meubles : [],
    customSymbols: Array.isArray(parsed.customSymbols) ? parsed.customSymbols : []
  };
}
