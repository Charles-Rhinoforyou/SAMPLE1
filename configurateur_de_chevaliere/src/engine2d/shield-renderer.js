/**
 * shield-renderer.js — Moteur de rendu 2D (SVG) du blason.
 *
 * Responsabilite UNIQUE : produire/mettre a jour le DOM SVG a partir du document
 * design. Aucune logique d'interaction ici (voir interactions.js) ni de regles
 * heraldiques (voir core/heraldry-rules.js).
 *
 * Strategie clip-path (point cle) :
 *   - la forme d'ecu est un `<path>` dans le repere `0 0 200 240` ;
 *   - ce path est declare une fois dans `<defs>` comme `<clipPath>` ;
 *   - le champ colore ET les meubles vivent dans un `<g clip-path="url(#...)">`,
 *     donc tout ce qui deborde de l'ecu est automatiquement decoupe ;
 *   - le meme path sert de contour visible (stroke).
 */

import { getShield, SHIELD_VIEWBOX } from '../data/shields.js';
import { fillForTincture, TINCTURES } from '../data/tinctures.js';
import { resolveSymbol } from '../data/symbols/index.js';
import { buildCustomSymbolGroup } from './symbol-loader.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Un meuble d'echelle 1.0 occupe par defaut ~60 unites d'ecu (sur 200 de large).
export const BASE_SYMBOL_SPAN = 60;

/**
 * Cree l'element SVG racine (une seule fois), avec son viewBox et ses defs.
 * @returns {SVGSVGElement}
 */
export function createShieldSvg() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${SHIELD_VIEWBOX.width} ${SHIELD_VIEWBOX.height}`);
  svg.setAttribute('class', 'ecu-svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  return svg;
}

/**
 * Convertit une coordonnee ecran (clientX/clientY) en coordonnee du repere SVG
 * (0..200 / 0..240). Utilise par les interactions (drop, deplacement).
 * @param {SVGSVGElement} svg
 * @param {number} clientX
 * @param {number} clientY
 * @returns {{x:number,y:number}}
 */
export function clientToSvg(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

/**
 * Construit la transformation SVG d'un meuble (placement dans l'ecu).
 * @param {object} meuble
 * @returns {string} valeur de l'attribut transform
 */
export function meubleTransform(meuble) {
  const f = (BASE_SYMBOL_SPAN / 100) * (meuble.scale || 1);
  // Ordre applique de droite a gauche : on centre le symbole (50,50) a l'origine,
  // on l'echelle, on le tourne, puis on le place en (x,y).
  return `translate(${meuble.x},${meuble.y}) rotate(${meuble.rotation || 0}) scale(${f}) translate(-50,-50)`;
}

/**
 * (Re)construit le contenu du SVG a partir du design.
 * @param {SVGSVGElement} svg element racine (issu de createShieldSvg)
 * @param {object} design document design
 * @param {object} [opts]
 * @param {string|null} [opts.selectedId] id du meuble selectionne
 * @param {Set<string>} [opts.warnMeubleIds] ids des meubles en infraction heraldique
 */
export function renderShield(svg, design, opts = {}) {
  const { selectedId = null, warnMeubleIds = new Set() } = opts;
  const shield = getShield(design.ecu.forme);

  // On reconstruit integralement le contenu : simple et fiable pour la Phase 1.
  svg.replaceChildren();

  // --- defs : clipPath d'ecu + motifs de fourrures ---
  const defs = el('defs');
  const clip = el('clipPath', { id: 'ecu-clip', clipPathUnits: 'userSpaceOnUse' });
  clip.appendChild(el('path', { d: shield.path }));
  defs.appendChild(clip);
  defs.appendChild(patternHermine());
  defs.appendChild(patternVair());
  svg.appendChild(defs);

  // --- Groupe interne decoupe par le clip-path de l'ecu ---
  const inner = el('g', { 'clip-path': 'url(#ecu-clip)' });

  // Champ (fond) : un grand rectangle rempli de la teinture, decoupe a la forme.
  inner.appendChild(
    el('rect', {
      x: 0,
      y: 0,
      width: SHIELD_VIEWBOX.width,
      height: SHIELD_VIEWBOX.height,
      fill: fillForTincture(design.ecu.champ.tincture)
    })
  );

  // Meubles, tries par z croissant (les plus grands z au-dessus).
  const meubles = [...(design.meubles || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const m of meubles) {
    const sym = resolveSymbol(m.symbolId, design.customSymbols);
    if (!sym) continue;
    const g = el('g', {
      transform: meubleTransform(m),
      'data-meuble-id': m.id,
      class: 'meuble',
      // La teinture s'applique au groupe : les meubles perso (dont on a neutralise
      // les couleurs) en heritent, ce qui les rend re-colorables comme les natifs.
      fill: fillForTincture(m.tincture)
    });
    if (sym.kind === 'raw') {
      g.appendChild(buildCustomSymbolGroup(sym));
    } else {
      g.appendChild(
        el('path', {
          d: sym.pathData,
          'fill-rule': sym.fillRule || 'nonzero'
        })
      );
    }
    inner.appendChild(g);
  }
  svg.appendChild(inner);

  // --- Contour de l'ecu (par-dessus, non decoupe) ---
  svg.appendChild(
    el('path', {
      d: shield.path,
      fill: 'none',
      stroke: '#1a1a1a',
      'stroke-width': 2.5,
      'stroke-linejoin': 'round',
      class: 'ecu-contour'
    })
  );

  // --- Surcouche de selection / avertissements (non decoupee) ---
  const overlay = el('g', { class: 'overlay' });
  for (const m of meubles) {
    if (warnMeubleIds.has(m.id)) {
      // Halo d'avertissement heraldique (non bloquant).
      overlay.appendChild(selectionBox(m, '#e67e22', false));
    }
  }
  if (selectedId) {
    const sel = (design.meubles || []).find((m) => m.id === selectedId);
    if (sel) overlay.appendChild(selectionBox(sel, '#3498db', true));
  }
  svg.appendChild(overlay);
}

/**
 * Dessine le cadre de selection d'un meuble + poignees (rotation, echelle).
 * Les poignees portent des `data-handle` exploites par les interactions.
 * @param {object} meuble
 * @param {string} color
 * @param {boolean} withHandles
 * @returns {SVGGElement}
 */
function selectionBox(meuble, color, withHandles) {
  const g = el('g', { transform: meubleTransform(meuble), 'data-selection-for': meuble.id });
  // Cadre autour du symbole (repere local 0..100).
  g.appendChild(
    el('rect', {
      x: 2,
      y: 2,
      width: 96,
      height: 96,
      fill: 'none',
      stroke: color,
      'stroke-width': 2,
      'stroke-dasharray': '5 4',
      'vector-effect': 'non-scaling-stroke'
    })
  );
  if (withHandles) {
    // Poignee de rotation (au-dessus du cadre).
    g.appendChild(el('line', { x1: 50, y1: 2, x2: 50, y2: -18, stroke: color, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }));
    g.appendChild(handle(50, -18, 'rotate', color));
    // Poignee d'echelle (coin bas-droit).
    g.appendChild(handle(98, 98, 'scale', color));
  }
  return g;
}

function handle(cx, cy, type, color) {
  return el('circle', {
    cx,
    cy,
    r: 6,
    fill: '#fff',
    stroke: color,
    'stroke-width': 2,
    'vector-effect': 'non-scaling-stroke',
    'data-handle': type,
    class: 'handle'
  });
}

// ---------- Motifs de fourrures (SVG <pattern>) ----------

/** Hermine : champ argent seme de mouchetures de sable. */
function patternHermine() {
  const p = el('pattern', { id: 'pat-hermine', width: 20, height: 20, patternUnits: 'userSpaceOnUse' });
  p.appendChild(el('rect', { width: 20, height: 20, fill: TINCTURES.hermine.couleur }));
  // Une moucheture d'hermine stylisee (arrondie + trois points).
  const spot =
    'M10,4 C8,4 7,6 8,8 C6,8 6,11 8,11 L12,11 C14,11 14,8 12,8 C13,6 12,4 10,4 Z';
  p.appendChild(el('path', { d: spot, fill: '#1c1c1c', transform: 'translate(0,0)' }));
  p.appendChild(el('path', { d: spot, fill: '#1c1c1c', transform: 'translate(10,10)' }));
  return p;
}

/** Vair : rangs de clochettes alternant argent et azur. */
function patternVair() {
  const p = el('pattern', { id: 'pat-vair', width: 20, height: 20, patternUnits: 'userSpaceOnUse' });
  p.appendChild(el('rect', { width: 20, height: 20, fill: '#f4f6f7' }));
  const bell = 'M0,0 L10,0 L10,6 Q10,10 5,10 Q0,10 0,6 Z';
  p.appendChild(el('path', { d: bell, fill: '#2456a4', transform: 'translate(0,0)' }));
  p.appendChild(el('path', { d: bell, fill: '#2456a4', transform: 'translate(10,10)' }));
  return p;
}

// ---------- Utilitaire de creation d'elements SVG ----------

/**
 * Cree un element SVG avec ses attributs.
 * @param {string} name
 * @param {object} [attrs]
 * @returns {SVGElement}
 */
function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}
