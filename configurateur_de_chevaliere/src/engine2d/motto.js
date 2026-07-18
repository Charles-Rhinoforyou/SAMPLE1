/**
 * motto.js — Devise sur listel (banderole) placee sous l'ecu.
 *
 * Produit un groupe SVG contenant :
 *   - un listel (banderole) optionnel, courbe selon `courbure` ;
 *   - le texte de la devise pose sur un chemin courbe (textPath), avec police,
 *     taille, couleur et casse reglables.
 *
 * Le tout est dessine dans le repere de la scene (voir scene-viewbox du renderer),
 * centre horizontalement sur l'ecu, sous la pointe.
 */

import { fillForTincture } from '../data/tinctures.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
let pathSeq = 0; // pour des id de textPath uniques

/**
 * Construit le groupe SVG de la devise.
 * @param {object} devise config (voir design-document)
 * @param {object} geom { cx, y, largeur } centre, ordonnee du listel, largeur utile
 * @returns {SVGGElement|null} null si masquee ou vide
 */
export function buildMotto(devise, geom) {
  if (!devise || !devise.visible) return null;
  const texte = (devise.texte || '').trim();
  if (!texte && !devise.listel) return null;

  const { cx, y, largeur } = geom;
  const demi = largeur / 2;
  const fleche = devise.courbure || 0; // hauteur de la courbure (concave vers le haut)
  const g = el('g', { class: 'devise' });

  // Chemin de base du texte : arc concave (les extremites plus basses que le centre).
  const x0 = cx - demi;
  const x1 = cx + demi;
  const ctrlY = y - fleche; // point de controle remonte => sourire
  const textPathId = `devise-path-${pathSeq++}`;

  // Listel (banderole) optionnel derriere le texte.
  if (devise.listel) {
    const h = 18; // hauteur du ruban
    const bandFill = fillForTincture(devise.couleurListel || 'gueules');
    // Corps du ruban (deux arcs paralleles).
    const band =
      `M${x0},${y - h / 2} Q${cx},${ctrlY - h / 2} ${x1},${y - h / 2} ` +
      `L${x1},${y + h / 2} Q${cx},${ctrlY + h / 2} ${x0},${y + h / 2} Z`;
    g.appendChild(el('path', { d: band, fill: bandFill, stroke: '#00000033', 'stroke-width': 0.6 }));
    // Retours de ruban aux extremites (petites queues en accent).
    g.appendChild(el('path', { d: `M${x0},${y - h / 2} l-12,6 l12,6 Z`, fill: bandFill, stroke: '#00000033', 'stroke-width': 0.6 }));
    g.appendChild(el('path', { d: `M${x1},${y - h / 2} l12,6 l-12,6 Z`, fill: bandFill, stroke: '#00000033', 'stroke-width': 0.6 }));
  }

  // Chemin (invisible) support du texte.
  const defs = el('defs');
  defs.appendChild(el('path', { id: textPathId, d: `M${x0},${y} Q${cx},${ctrlY} ${x1},${y}` }));
  g.appendChild(defs);

  if (texte) {
    const label = devise.casse === 'majuscules' ? texte.toUpperCase() : texte;
    const fontSize = devise.taille || 16;
    const attrs = {
      'font-family': devise.police || 'Georgia, serif',
      'font-size': fontSize,
      fill: devise.couleur || '#f4f6f7',
      'letter-spacing': '1',
      'font-weight': '600'
    };
    // Si le texte risque de depasser la longueur utile du listel, on le CONTRAINT
    // a cette longueur (evite la troncature par textPath). On ne l'etire pas quand
    // il est plus court que l'espace disponible.
    const dispo = largeur * 0.94;
    const estim = label.length * fontSize * 0.6; // largeur estimee
    if (estim > dispo) {
      attrs.textLength = dispo;
      attrs.lengthAdjust = 'spacingAndGlyphs';
    }
    const text = el('text', attrs);
    const tp = el('textPath', { href: `#${textPathId}`, startOffset: '50%', 'text-anchor': 'middle' });
    // Compat : certains moteurs lisent xlink:href.
    tp.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${textPathId}`);
    tp.textContent = label;
    text.appendChild(tp);
    g.appendChild(text);
  }

  return g;
}

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}
