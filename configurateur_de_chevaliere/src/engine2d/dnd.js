/**
 * dnd.js — Interactions 2D : glisser-deposer + manipulation directe + aimantation.
 *
 * Adapte a la Phase 2 (quartiers) :
 *   - le DEPOT ajoute le meuble au QUARTIER ACTIF ;
 *   - selection / deplacement / rotation / echelle operent sur le meuble
 *     retrouve a travers tous les quartiers ;
 *   - en mode disposition 'libre', le deplacement manuel beneficie de
 *     l'AIMANTATION (snapping) : accrochage au centre de l'ecu (x=100) et
 *     alignement sur les meubles voisins, avec GUIDES visuels ;
 *   - en mode disposition automatique, la position est pilotee par le moteur
 *     parametrique : le deplacement manuel est neutralise (on ne fait que
 *     selectionner), la taille/rotation restent editables via le panneau.
 */

import { clientToSvg, computePlacements } from './shield-renderer.js';
import { createMeuble, cloneDesign, findMeuble, getQuartiers } from '../core/design-document.js';

const SNAP_THRESHOLD = 5; // unites d'ecu

/**
 * Installe les interactions sur le SVG.
 * @param {object} cfg
 * @param {SVGSVGElement} cfg.svg
 * @param {import('../core/store.js').Store} cfg.store
 * @param {()=>string|null} cfg.getSelected
 * @param {(id:string|null)=>void} cfg.setSelected
 * @param {()=>number} cfg.getActiveQuartier index du quartier actif (depot)
 * @param {(guides:Array)=>void} cfg.setGuides publie les guides d'aimantation
 * @returns {()=>void} nettoyage
 */
export function installInteractions({ svg, store, getSelected, setSelected, getActiveQuartier, setGuides }) {
  // --- Depot depuis la palette ---
  const onDragOver = (e) => {
    if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('text/x-symbol-id')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };
  const onDrop = (e) => {
    const symbolId = e.dataTransfer?.getData('text/x-symbol-id');
    if (!symbolId) return;
    e.preventDefault();
    const { x, y } = clientToSvg(svg, e.clientX, e.clientY);
    const qi = clampQuartier(store.getState(), getActiveQuartier());
    const meuble = createMeuble({
      symbolId,
      tincture: suggestTincture(store.getState(), qi),
      x: clamp(x, 0, 200),
      y: clamp(y, 0, 240),
      z: nextZ(store.getState(), qi)
    });
    store.commit((d) => getQuartiers(d)[qi].meubles.push(meuble), 'ajout meuble');
    setSelected(meuble.id);
  };
  svg.addEventListener('dragover', onDragOver);
  svg.addEventListener('drop', onDrop);

  // --- Manipulation directe ---
  let drag = null;

  const onPointerDown = (e) => {
    const handleEl = e.target.closest?.('[data-handle]');
    if (handleEl) {
      const id = getSelected();
      if (id) startHandleDrag(e, handleEl.getAttribute('data-handle'), id);
      return;
    }
    const meubleEl = e.target.closest?.('[data-meuble-id]');
    if (meubleEl) {
      const id = meubleEl.getAttribute('data-meuble-id');
      setSelected(id);
      startMoveDrag(e, id);
      return;
    }
    setSelected(null);
  };

  function startMoveDrag(e, id) {
    const found = findMeuble(store.getState(), id);
    if (!found) return;
    // En mode auto, la position est calculee : pas de deplacement manuel.
    if (found.quartier.layout?.disposition && found.quartier.layout.disposition !== 'libre') return;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    drag = {
      type: 'move',
      id,
      pre: cloneDesign(store.getState()),
      offsetX: found.meuble.x - p.x,
      offsetY: found.meuble.y - p.y
    };
    svg.setPointerCapture?.(e.pointerId);
  }

  function startHandleDrag(e, kind, id) {
    const found = findMeuble(store.getState(), id);
    if (!found) return;
    const place = computePlacements(store.getState()).get(id);
    const p = clientToSvg(svg, e.clientX, e.clientY);
    drag = {
      type: kind,
      id,
      pre: cloneDesign(store.getState()),
      cx: place.x,
      cy: place.y,
      startAngle: Math.atan2(p.y - place.y, p.x - place.x),
      startRotation: found.meuble.rotation || 0,
      startDist: Math.hypot(p.x - place.x, p.y - place.y) || 1,
      startScale: found.meuble.scale || 1
    };
    svg.setPointerCapture?.(e.pointerId);
  }

  const onPointerMove = (e) => {
    if (!drag) return;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    let guides = [];
    store.update((d) => {
      const found = findMeuble(d, drag.id);
      if (!found) return;
      const m = found.meuble;
      if (drag.type === 'move') {
        let nx = clamp(p.x + drag.offsetX, 0, 200);
        let ny = clamp(p.y + drag.offsetY, 0, 240);
        if (!e.shiftKey) {
          const snapped = applySnapping(d, drag.id, nx, ny);
          nx = snapped.x;
          ny = snapped.y;
          guides = snapped.guides;
        }
        m.x = nx;
        m.y = ny;
      } else if (drag.type === 'rotate') {
        const ang = Math.atan2(p.y - drag.cy, p.x - drag.cx);
        let deg = drag.startRotation + (ang - drag.startAngle) * (180 / Math.PI);
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        m.rotation = Math.round(deg);
      } else if (drag.type === 'scale') {
        const dist = Math.hypot(p.x - drag.cx, p.y - drag.cy) || 1;
        m.scale = clamp((drag.startScale * dist) / drag.startDist, 0.2, 4);
      }
    });
    setGuides?.(guides);
  };

  const onPointerUp = (e) => {
    if (!drag) return;
    if (JSON.stringify(drag.pre.ecu.quartiers) !== JSON.stringify(store.getState().ecu.quartiers)) {
      store.recordHistory(drag.pre);
    }
    svg.releasePointerCapture?.(e.pointerId);
    drag = null;
    setGuides?.([]);
  };

  svg.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  // --- Suppression clavier ---
  const onKeyDown = (e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    const id = getSelected();
    if (!id) return;
    e.preventDefault();
    store.commit((d) => {
      for (const q of getQuartiers(d)) q.meubles = q.meubles.filter((m) => m.id !== id);
    }, 'suppression meuble');
    setSelected(null);
  };
  window.addEventListener('keydown', onKeyDown);

  return () => {
    svg.removeEventListener('dragover', onDragOver);
    svg.removeEventListener('drop', onDrop);
    svg.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('keydown', onKeyDown);
  };
}

/**
 * Applique l'aimantation : accroche x/y au centre de l'ecu (x=100) et aux
 * alignements avec les autres meubles ; renvoie la position corrigee + guides.
 */
function applySnapping(design, draggedId, x, y) {
  const guides = [];
  const placements = computePlacements(design);

  // Candidats d'accrochage.
  const xCandidates = [100]; // pal central
  const yCandidates = [120]; // centre vertical de l'ecu
  for (const [id, pl] of placements) {
    if (id === draggedId) continue;
    xCandidates.push(pl.x);
    yCandidates.push(pl.y);
  }

  let bestX = null;
  let bestXd = SNAP_THRESHOLD;
  for (const cx of xCandidates) {
    const d = Math.abs(cx - x);
    if (d < bestXd) { bestXd = d; bestX = cx; }
  }
  let bestY = null;
  let bestYd = SNAP_THRESHOLD;
  for (const cy of yCandidates) {
    const d = Math.abs(cy - y);
    if (d < bestYd) { bestYd = d; bestY = cy; }
  }
  if (bestX !== null) { x = bestX; guides.push({ type: 'v', pos: bestX }); }
  if (bestY !== null) { y = bestY; guides.push({ type: 'h', pos: bestY }); }
  return { x, y, guides };
}

// ---------- Utilitaires ----------

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function clampQuartier(design, qi) {
  const n = getQuartiers(design).length;
  return Math.max(0, Math.min(n - 1, qi || 0));
}

function nextZ(design, qi) {
  const zs = (getQuartiers(design)[qi]?.meubles || []).map((m) => m.z || 0);
  return zs.length ? Math.max(...zs) + 1 : 0;
}

function suggestTincture(design, qi) {
  const champ = getQuartiers(design)[qi]?.champ?.tincture;
  if (champ === 'or' || champ === 'argent') return 'gueules';
  return 'or';
}
