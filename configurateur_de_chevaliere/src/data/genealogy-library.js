/**
 * genealogy-library.js — Bibliotheque de blasons preconfigures.
 *
 * IMPORTANT : chaque entree n'est PAS une image figee mais un DOCUMENT DESIGN
 * complet, genere par les memes regles/moteurs que le configurateur. Charger une
 * entree = remplacer le document courant : le blason devient donc entierement
 * RE-EDITABLE (forme, partition, teintures, meubles, disposition, couronne...).
 *
 * ---------------------------------------------------------------------------
 * AJOUTER UNE ENTREE : appelez `makeDesign({...})` avec
 *   - nom        : nom de famille affiche/recherche ;
 *   - blason     : description heraldique (texte libre) ;
 *   - forme      : id de forme d'ecu (voir data/shields.js) ;
 *   - partition  : id de partition (voir engine2d/composition.js) ;
 *   - quartiers  : tableau de Q(tincture, charges, layout) ;
 *   - couronne   : id de couronne (voir data/crowns.js) ;
 *   - devise     : { texte, ... } optionnel.
 * `charges(symbolId, tincture, n)` cree n meubles identiques (dispositions auto).
 * ---------------------------------------------------------------------------
 *
 * Note : ces armoiries sont ILLUSTRATIVES (pedagogiques), destinees a demontrer
 * le systeme de reconstruction parametrique, pas une reference genealogique.
 */

import { createEmptyDesign, createMeuble, defaultLayout, genId } from '../core/design-document.js';

/** Cree n specifications de meubles identiques (positionnes par la disposition). */
function charges(symbolId, tincture, n = 1, extra = {}) {
  return Array.from({ length: n }, (_, i) => ({ symbolId, tincture, z: i, ...extra }));
}

/** Cree un quartier (mini-blason). */
function Q(tincture, chargeSpecs = [], layout = { disposition: 'libre' }) {
  return {
    id: genId('q'),
    champ: { tincture },
    meubles: chargeSpecs.map((c) => createMeuble(c)),
    layout: { ...defaultLayout(), ...layout }
  };
}

/** Assemble un document design complet a partir d'une specification compacte. */
function makeDesign({ nom, blason, forme = 'francais-moderne', partition = 'plain', quartiers, couronne = 'aucune', devise = null }) {
  const d = createEmptyDesign();
  d.meta.nom = nom;
  d.ecu.forme = forme;
  d.ecu.partition = partition;
  d.ecu.quartiers = quartiers;
  d.couronne = { type: couronne };
  if (devise) d.devise = { ...d.devise, visible: true, ...devise };
  d._blason = blason; // conserve pour l'affichage (retire a la serialisation)
  return d;
}

// ---------------------------------------------------------------------------
//  Les entrees (une douzaine, coherentes et variees)
// ---------------------------------------------------------------------------

export const GENEALOGY = [
  {
    id: 'france',
    famille: 'de France',
    build: () =>
      makeDesign({
        nom: 'de France',
        blason: "D'azur a trois fleurs de lys d'or.",
        forme: 'francais-ancien',
        quartiers: [Q('azur', charges('fleur-de-lys', 'or', 3), { disposition: 'rangs', echelle: 1 })],
        couronne: 'royale',
        devise: { texte: 'Montjoie Saint-Denis' }
      })
  },
  {
    id: 'angleterre',
    famille: "d'Angleterre",
    build: () =>
      makeDesign({
        nom: "d'Angleterre",
        blason: 'De gueules a trois leopards (lions) d\'or, l\'un sur l\'autre.',
        forme: 'anglais',
        quartiers: [Q('gueules', charges('lion', 'or', 3), { disposition: 'pal', echelle: 1 })],
        couronne: 'royale'
      })
  },
  {
    id: 'leon',
    famille: 'de Leon',
    build: () =>
      makeDesign({
        nom: 'de Leon',
        blason: "D'or au lion de gueules.",
        forme: 'espagnol',
        quartiers: [Q('or', charges('lion', 'gueules', 1), { disposition: 'libre' })],
        couronne: 'comte'
      })
  },
  {
    id: 'de-la-tour',
    famille: 'de la Tour',
    build: () =>
      makeDesign({
        nom: 'de la Tour',
        blason: "D'azur a la tour d'argent, macoonnee de sable.",
        forme: 'francais-moderne',
        quartiers: [Q('azur', charges('tour', 'argent', 1), { disposition: 'libre', echelle: 1.4 })],
        couronne: 'vicomte',
        devise: { texte: 'Turris fortis' }
      })
  },
  {
    id: 'rosemont',
    famille: 'de Rosemont',
    build: () =>
      makeDesign({
        nom: 'de Rosemont',
        blason: 'De sinople a trois roses d\'argent.',
        forme: 'francais-moderne',
        quartiers: [Q('sinople', charges('rose', 'argent', 3), { disposition: 'rangs' })],
        couronne: 'baron'
      })
  },
  {
    id: 'de-lestoile',
    famille: "de l'Estoile",
    build: () =>
      makeDesign({
        nom: "de l'Estoile",
        blason: "D'azur seme d'etoiles d'or.",
        forme: 'francais-moderne',
        quartiers: [Q('azur', charges('etoile', 'or', 9), { disposition: 'grille', cols: 3, rows: 3, echelle: 0.9 })],
        couronne: 'marquis'
      })
  },
  {
    id: 'de-la-croix',
    famille: 'de la Croix',
    build: () =>
      makeDesign({
        nom: 'de la Croix',
        blason: "D'argent a la croix de gueules.",
        forme: 'suisse',
        quartiers: [Q('argent', charges('croix', 'gueules', 1), { disposition: 'libre', echelle: 1.5 })],
        couronne: 'aucune',
        devise: { texte: 'In cruce salus', couleurListel: 'azur' }
      })
  },
  {
    id: 'croissant',
    famille: 'de Croissant',
    build: () =>
      makeDesign({
        nom: 'de Croissant',
        blason: 'De gueules a trois croissants d\'or.',
        forme: 'francais-moderne',
        quartiers: [Q('gueules', charges('croissant', 'or', 3), { disposition: 'rangs' })],
        couronne: 'vicomte'
      })
  },
  {
    id: 'de-la-coquille',
    famille: 'de la Coquille',
    build: () =>
      makeDesign({
        nom: 'de la Coquille',
        blason: "D'azur a trois coquilles d'or (armes de pelerin).",
        forme: 'francais-ancien',
        quartiers: [Q('azur', charges('coquille', 'or', 3), { disposition: 'rangs' })],
        couronne: 'baron',
        devise: { texte: 'Ultreia' }
      })
  },
  {
    id: 'chevron-dor',
    famille: 'du Chevron',
    build: () =>
      makeDesign({
        nom: 'du Chevron',
        blason: "De sable au chevron d'or accompagne de trois etoiles d'or.",
        forme: 'francais-moderne',
        quartiers: [
          Q('sable', [
            { symbolId: 'chevron', tincture: 'or', x: 100, y: 130, scale: 1.3, z: 0 },
            { symbolId: 'etoile', tincture: 'or', x: 62, y: 80, scale: 0.6, z: 1 },
            { symbolId: 'etoile', tincture: 'or', x: 138, y: 80, scale: 0.6, z: 2 },
            { symbolId: 'etoile', tincture: 'or', x: 100, y: 180, scale: 0.6, z: 3 }
          ], { disposition: 'libre' })
        ],
        couronne: 'comte'
      })
  },
  {
    id: 'ecartele-alliance',
    famille: "d'Alliance (ecartele)",
    build: () =>
      makeDesign({
        nom: "d'Alliance",
        blason: 'Ecartele : aux 1 et 4 d\'azur a la fleur de lys d\'or ; aux 2 et 3 de gueules au lion d\'or.',
        forme: 'francais-moderne',
        partition: 'ecartele',
        quartiers: [
          Q('azur', charges('fleur-de-lys', 'or', 1), { disposition: 'libre', echelle: 0.9 }),
          Q('gueules', charges('lion', 'or', 1), { disposition: 'libre', echelle: 0.9 }),
          Q('gueules', charges('lion', 'or', 1), { disposition: 'libre', echelle: 0.9 }),
          Q('azur', charges('fleur-de-lys', 'or', 1), { disposition: 'libre', echelle: 0.9 })
        ],
        couronne: 'duc',
        devise: { texte: 'Union et fidelite' }
      })
  },
  {
    id: 'parti-aigle',
    famille: "de l'Empire (parti)",
    build: () =>
      makeDesign({
        nom: "de l'Empire",
        blason: "Parti : au 1 d'or a l'aigle de sable ; au 2 d'azur a trois fleurs de lys d'or.",
        forme: 'allemand',
        partition: 'parti',
        quartiers: [
          Q('or', charges('aigle', 'sable', 1), { disposition: 'libre', echelle: 1.1 }),
          Q('azur', charges('fleur-de-lys', 'or', 3), { disposition: 'pal', echelle: 0.7 })
        ],
        couronne: 'prince'
      })
  }
];

/**
 * Filtre les entrees par nom de famille (recherche insensible a la casse/accents).
 * @param {string} query
 * @returns {Array}
 */
export function searchGenealogy(query) {
  const q = normalize(query);
  if (!q) return GENEALOGY;
  return GENEALOGY.filter((e) => normalize(e.famille).includes(q) || normalize(e.build().meta.nom).includes(q));
}

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
