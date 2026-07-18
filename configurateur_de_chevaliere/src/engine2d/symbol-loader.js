/**
 * symbol-loader.js — Import de symboles SVG personnalises (vectoriels).
 *
 * L'utilisateur charge un fichier .svg ; on le transforme en "symbole perso"
 * conforme au schema, qui rejoint la bibliotheque et devient re-colorable et
 * plaçable comme les meubles natifs.
 *
 * Etapes :
 *   1. parser le SVG (DOMParser) ;
 *   2. lire / normaliser le viewBox ;
 *   3. NEUTRALISER les couleurs codees en dur (fill/stroke/style) pour que le
 *      symbole herite de la teinture appliquee au rendu (re-coloriage) ;
 *   4. supprimer tout element dangereux (script, handlers, refs externes) ;
 *   5. renvoyer un objet { id, nom, viewBox, innerSvg, kind:'raw' }.
 *
 * Les symboles perso sont stockes DANS le document design (export JSON autonome).
 */

import { genId } from '../core/design-document.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Analyse le texte d'un fichier SVG et renvoie un symbole perso normalise.
 * @param {string} svgText contenu brut du fichier .svg
 * @param {string} [nom] nom affiche dans la palette
 * @returns {{id:string, nom:string, viewBox:string, innerSvg:string, kind:'raw'}}
 * @throws {Error} si le SVG est invalide
 */
export function parseCustomSvg(svgText, nom = 'Symbole importe') {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Fichier SVG illisible.');

  const src = doc.querySelector('svg');
  if (!src) throw new Error('Aucune balise <svg> trouvee dans le fichier.');

  // 1) Determiner le viewBox source (repli sur width/height, puis 0 0 100 100).
  const viewBox = resolveViewBox(src);

  // 2) Nettoyer + neutraliser les couleurs sur une copie de travail.
  sanitize(src);

  // 3) Recuperer le markup interne (les enfants du <svg>).
  const innerSvg = Array.from(src.childNodes)
    .map((n) => (n.nodeType === 1 ? n.outerHTML : ''))
    .join('')
    .trim();

  if (!innerSvg) throw new Error('Le SVG ne contient aucune forme exploitable.');

  return {
    id: genId('custom'),
    nom: nom.replace(/\.svg$/i, ''),
    viewBox,
    innerSvg,
    kind: 'raw'
  };
}

/**
 * Determine un viewBox exploitable pour le SVG importe.
 * @param {SVGSVGElement} svg
 * @returns {string} "minX minY width height"
 */
function resolveViewBox(svg) {
  const vb = svg.getAttribute('viewBox');
  if (vb && vb.trim().split(/[\s,]+/).length === 4) return vb.trim();
  const w = parseFloat(svg.getAttribute('width')) || 100;
  const h = parseFloat(svg.getAttribute('height')) || 100;
  return `0 0 ${w} ${h}`;
}

/**
 * Nettoie l'arbre SVG en place :
 *   - retire les elements dangereux et les gestionnaires d'evenements ;
 *   - retire les references externes (image/use href externe) ;
 *   - NEUTRALISE les couleurs pour rendre le symbole re-colorable.
 * @param {Element} root
 */
function sanitize(root) {
  const all = [root, ...root.querySelectorAll('*')];
  for (const node of all) {
    const tag = node.tagName.toLowerCase();

    // Elements interdits (scripts, styles globaux, medias externes).
    if (['script', 'foreignobject', 'style', 'image', 'animate', 'animatetransform', 'set'].includes(tag)) {
      node.remove();
      continue;
    }

    // Attributs : on retire les handlers, refs externes et couleurs en dur.
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith('on')) {
        node.removeAttribute(attr.name); // handlers JS
      } else if ((name === 'href' || name === 'xlink:href') && /^\s*(https?:|\/\/|data:)/i.test(value)) {
        node.removeAttribute(attr.name); // ref externe
      } else if (name === 'fill' && value.toLowerCase() !== 'none') {
        node.removeAttribute('fill'); // -> heritera de la teinture
      } else if (name === 'stroke' && value.toLowerCase() !== 'none') {
        node.removeAttribute('stroke');
      } else if (name === 'style') {
        // On ne garde du style que ce qui n'est pas une couleur imposee.
        const cleaned = value
          .split(';')
          .filter((decl) => !/^\s*(fill|stroke|color)\s*:/i.test(decl))
          .join(';');
        if (cleaned.trim()) node.setAttribute('style', cleaned);
        else node.removeAttribute('style');
      }
    }
  }
}

/**
 * Cree un fragment SVG (dans le bon namespace) a partir du markup interne d'un
 * symbole perso, normalise dans un repere 0..100 pour s'aligner sur les meubles
 * natifs. Utilise par le moteur de rendu.
 * @param {{viewBox:string, innerSvg:string}} custom
 * @returns {SVGGElement} groupe pret a inserer (les enfants heritent du fill)
 */
export function buildCustomSymbolGroup(custom) {
  const [minX, minY, w, h] = custom.viewBox.split(/[\s,]+/).map(Number);
  const g = document.createElementNS(SVG_NS, 'g');
  // Mise a l'echelle du viewBox source vers un carre 0..100 (comme les natifs).
  const sx = 100 / (w || 100);
  const sy = 100 / (h || 100);
  const s = Math.min(sx, sy);
  // Centrage dans le carre 100x100.
  const tx = (100 - (w || 100) * s) / 2 - minX * s;
  const ty = (100 - (h || 100) * s) / 2 - minY * s;
  g.setAttribute('transform', `translate(${tx},${ty}) scale(${s})`);
  g.innerHTML = custom.innerSvg; // markup deja assaini
  return g;
}
