/**
 * shield-renderer.js — Moteur de rendu 2D (SVG) du blason complet.
 *
 * Responsabilite UNIQUE : produire/mettre a jour le DOM SVG a partir du document
 * design (aucune interaction, aucune regle heraldique ici).
 *
 * Rendu Phase 2 :
 *   - PARTITION : l'ecu est divise en regions ; chaque quartier est rendu par
 *     INTERSECTION du clip d'ecu et du clip de sa region (clips imbriques) ;
 *   - DISPOSITION PARAMETRIQUE : les meubles d'un quartier sont places
 *     automatiquement selon `layout` (sauf 'libre' = coordonnees manuelles) ;
 *   - COURONNE au-dessus de l'ecu, DEVISE (listel) en dessous.
 *
 * Repere : les meubles et l'ecu vivent dans 0..200 x 0..240. La SCENE ajoute une
 * marge verticale pour la couronne et la devise (viewBox elargi).
 */

import { getShield } from '../data/shields.js';
import { fillForTincture, TINCTURES } from '../data/tinctures.js';
import { resolveSymbol } from '../data/symbols/index.js';
import { buildCustomSymbolGroup } from './symbol-loader.js';
import { getRegions, pointsToSvg } from './composition.js';
import { computeAnchors } from './layout-parametric.js';
import { getCrown, CROWN_VIEWBOX } from '../data/crowns.js';
import { getQuartiers } from '../core/design-document.js';
import { buildMotto } from './motto.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Un meuble d'echelle 1.0 occupe par defaut ~60 unites d'ecu.
export const BASE_SYMBOL_SPAN = 60;

// ViewBox de la scene : ecu 0..200/0..240 + marges couronne (haut) et devise (bas).
export const SCENE_VIEWBOX = { minX: -24, minY: -46, width: 248, height: 356 };

/** Cree l'element SVG racine (une seule fois). */
export function createShieldSvg() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const v = SCENE_VIEWBOX;
  svg.setAttribute('viewBox', `${v.minX} ${v.minY} ${v.width} ${v.height}`);
  svg.setAttribute('class', 'ecu-svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  return svg;
}

/** Convertit une coordonnee ecran en coordonnee de la scene SVG. */
export function clientToSvg(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

/** Transformation d'un meuble a partir d'une position/echelle/rotation explicites. */
export function placementTransform({ x, y, scale = 1, rotation = 0 }) {
  const f = (BASE_SYMBOL_SPAN / 100) * scale;
  return `translate(${x},${y}) rotate(${rotation}) scale(${f}) translate(-50,-50)`;
}

/**
 * Calcule la position effective de chaque meuble (en tenant compte de la
 * disposition parametrique du quartier). Partage par le rendu, la surcouche de
 * selection et l'aimantation (dnd).
 * @param {object} design
 * @returns {Map<string,{x:number,y:number,scale:number,rotation:number,quartierIndex:number}>}
 */
export function computePlacements(design) {
  const placements = new Map();
  const shield = getShield(design.ecu.forme);
  const { regions } = getRegions(design.ecu.partition);
  const quartiers = getQuartiers(design);

  quartiers.forEach((q, qi) => {
    const region = regions[qi] || regions[0];
    const bounds = intersectBounds(region.bounds, shield.bounds);
    const meubles = q.meubles || [];
    const anchors = computeAnchors({
      disposition: q.layout?.disposition,
      count: meubles.length,
      bounds,
      layout: q.layout
    });
    meubles.forEach((m, j) => {
      if (anchors && anchors[j]) {
        placements.set(m.id, {
          x: anchors[j].x,
          y: anchors[j].y,
          scale: anchors[j].s * (m.scale || 1),
          rotation: m.rotation || 0,
          quartierIndex: qi,
          auto: true
        });
      } else {
        placements.set(m.id, {
          x: m.x,
          y: m.y,
          scale: m.scale || 1,
          rotation: m.rotation || 0,
          quartierIndex: qi,
          auto: false
        });
      }
    });
  });
  return placements;
}

/**
 * (Re)construit le contenu du SVG a partir du design.
 * @param {SVGSVGElement} svg
 * @param {object} design
 * @param {object} [opts] { selectedId, warnMeubleIds, activeQuartier }
 */
export function renderShield(svg, design, opts = {}) {
  const { selectedId = null, warnMeubleIds = new Set(), activeQuartier = 0, guides = [] } = opts;
  const shield = getShield(design.ecu.forme);
  const { regions, lines } = getRegions(design.ecu.partition);
  const quartiers = getQuartiers(design);
  const placements = computePlacements(design);

  svg.replaceChildren();

  // --- defs : clip d'ecu, motifs de fourrures, clips de regions ---
  const defs = el('defs');
  const clip = el('clipPath', { id: 'ecu-clip', clipPathUnits: 'userSpaceOnUse' });
  clip.appendChild(el('path', { d: shield.path }));
  defs.appendChild(clip);
  defs.appendChild(patternHermine());
  defs.appendChild(patternVair());
  regions.forEach((r, i) => {
    const rc = el('clipPath', { id: `region-clip-${i}`, clipPathUnits: 'userSpaceOnUse' });
    rc.appendChild(el('polygon', { points: pointsToSvg(r.points) }));
    defs.appendChild(rc);
  });
  svg.appendChild(defs);

  // --- Couronne (derriere/au-dessus de l'ecu, dessinee avant pour passer sous le contour haut) ---
  const crownG = buildCrown(design.couronne, shield);
  if (crownG) svg.appendChild(crownG);

  // --- Contenu de l'ecu, quartier par quartier ---
  const ecuGroup = el('g', { 'clip-path': 'url(#ecu-clip)' });
  quartiers.forEach((q, qi) => {
    const regionGroup = el('g', { 'clip-path': `url(#region-clip-${qi})` });

    // Champ du quartier (grand rectangle couvrant la scene, decoupe par les 2 clips).
    regionGroup.appendChild(
      el('rect', {
        x: SCENE_VIEWBOX.minX,
        y: SCENE_VIEWBOX.minY,
        width: SCENE_VIEWBOX.width,
        height: SCENE_VIEWBOX.height,
        fill: fillForTincture(q.champ.tincture)
      })
    );

    // Meubles du quartier, dessines par z croissant.
    const meublesTries = [...(q.meubles || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
    for (const m of meublesTries) {
      const place = placements.get(m.id);
      if (!place) continue;
      const sym = resolveSymbol(m.symbolId, design.customSymbols);
      if (!sym) continue;
      const g = el('g', {
        transform: placementTransform(place),
        'data-meuble-id': m.id,
        class: 'meuble',
        fill: fillForTincture(m.tincture)
      });
      if (sym.kind === 'raw') g.appendChild(buildCustomSymbolGroup(sym));
      else g.appendChild(el('path', { d: sym.pathData, 'fill-rule': sym.fillRule || 'nonzero' }));
      regionGroup.appendChild(g);
    }
    ecuGroup.appendChild(regionGroup);
  });
  svg.appendChild(ecuGroup);

  // --- Lignes de partition (decoupees a l'ecu) ---
  if (lines && lines.length) {
    const lg = el('g', { 'clip-path': 'url(#ecu-clip)' });
    for (const seg of lines) {
      lg.appendChild(
        el('line', {
          x1: seg[0][0], y1: seg[0][1], x2: seg[1][0], y2: seg[1][1],
          stroke: '#1a1a1a', 'stroke-width': 2, 'stroke-linecap': 'round'
        })
      );
    }
    svg.appendChild(lg);
  }

  // --- Contour de l'ecu ---
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

  // --- Devise (listel) sous l'ecu ---
  const mottoG = buildMotto(design.devise, {
    cx: 100,
    y: shield.bounds.y + shield.bounds.height + 34,
    largeur: shield.bounds.width * 1.15
  });
  if (mottoG) svg.appendChild(mottoG);

  // --- Guides d'aimantation (pendant un deplacement) ---
  if (guides && guides.length) {
    const gg = el('g', { class: 'guides' });
    for (const gd of guides) {
      if (gd.type === 'v') {
        gg.appendChild(el('line', { x1: gd.pos, y1: -10, x2: gd.pos, y2: 250, stroke: '#e91e8c', 'stroke-width': 1, 'stroke-dasharray': '4 3', 'vector-effect': 'non-scaling-stroke' }));
      } else {
        gg.appendChild(el('line', { x1: -10, y1: gd.pos, x2: 210, y2: gd.pos, stroke: '#e91e8c', 'stroke-width': 1, 'stroke-dasharray': '4 3', 'vector-effect': 'non-scaling-stroke' }));
      }
    }
    svg.appendChild(gg);
  }

  // --- Surcouche selection / avertissements ---
  const overlay = el('g', { class: 'overlay' });
  for (const [id, place] of placements) {
    if (warnMeubleIds.has(id)) overlay.appendChild(selectionBox(place, '#e67e22', false));
  }
  if (selectedId && placements.has(selectedId)) {
    const place = placements.get(selectedId);
    overlay.appendChild(selectionBox(place, '#3498db', true, place.auto));
  }
  svg.appendChild(overlay);
}

/**
 * Cadre de selection + poignees d'un meuble a sa position effective.
 * En mode auto (disposition), on masque les poignees d'echelle/rotation manuelles.
 */
function selectionBox(place, color, withHandles, auto = false) {
  const g = el('g', { transform: placementTransform(place) });
  g.appendChild(
    el('rect', {
      x: 2, y: 2, width: 96, height: 96,
      fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-dasharray': '5 4',
      'vector-effect': 'non-scaling-stroke'
    })
  );
  if (withHandles && !auto) {
    g.appendChild(el('line', { x1: 50, y1: 2, x2: 50, y2: -18, stroke: color, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }));
    g.appendChild(handle(50, -18, 'rotate', color));
    g.appendChild(handle(98, 98, 'scale', color));
  }
  return g;
}

function handle(cx, cy, type, color) {
  return el('circle', {
    cx, cy, r: 6, fill: '#fff', stroke: color, 'stroke-width': 2,
    'vector-effect': 'non-scaling-stroke', 'data-handle': type, class: 'handle'
  });
}

/** Construit le groupe de la couronne, mis a l'echelle et positionne au-dessus de l'ecu. */
function buildCrown(couronne, shield) {
  const crown = getCrown(couronne?.type || 'aucune');
  if (!crown || !crown.pathData) return null;
  const [, , vbW] = CROWN_VIEWBOX.split(' ').map(Number);
  const drawW = shield.bounds.width * 0.72;
  const s = drawW / vbW;
  const crownH = 60 * s; // hauteur du repere couronne (0..60)
  const topEcu = shield.bounds.y;
  // Bas de la couronne (y=52 dans son repere) pose ~4 unites au-dessus du bord haut.
  const ty = topEcu + 4 - 52 * s;
  const tx = 100 - (vbW * s) / 2;
  const g = el('g', {
    transform: `translate(${tx},${ty}) scale(${s})`,
    fill: '#f1c40f',
    stroke: '#8a6d0b',
    'stroke-width': 1
  });
  g.appendChild(el('path', { d: crown.pathData, 'fill-rule': 'nonzero' }));
  return g;
}

// ---------- Motifs de fourrures ----------

function patternHermine() {
  const p = el('pattern', { id: 'pat-hermine', width: 20, height: 20, patternUnits: 'userSpaceOnUse' });
  p.appendChild(el('rect', { width: 20, height: 20, fill: TINCTURES.hermine.couleur }));
  const spot = 'M10,4 C8,4 7,6 8,8 C6,8 6,11 8,11 L12,11 C14,11 14,8 12,8 C13,6 12,4 10,4 Z';
  p.appendChild(el('path', { d: spot, fill: '#1c1c1c' }));
  p.appendChild(el('path', { d: spot, fill: '#1c1c1c', transform: 'translate(10,10)' }));
  return p;
}

function patternVair() {
  const p = el('pattern', { id: 'pat-vair', width: 20, height: 20, patternUnits: 'userSpaceOnUse' });
  p.appendChild(el('rect', { width: 20, height: 20, fill: '#f4f6f7' }));
  const bell = 'M0,0 L10,0 L10,6 Q10,10 5,10 Q0,10 0,6 Z';
  p.appendChild(el('path', { d: bell, fill: '#2456a4' }));
  p.appendChild(el('path', { d: bell, fill: '#2456a4', transform: 'translate(10,10)' }));
  return p;
}

// ---------- Utilitaires ----------

/** Intersection de deux boites englobantes. */
function intersectBounds(a, b) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  return { x, y, width: Math.max(4, x2 - x), height: Math.max(4, y2 - y) };
}

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}
