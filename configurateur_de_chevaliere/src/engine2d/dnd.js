/**
 * dnd.js — Interactions 2D sur l'ecu : glisser-deposer + manipulation directe.
 *
 * Ce module cable les evenements pointeur sur le SVG et gere :
 *   - le DEPOT d'un meuble depuis la palette (drag & drop HTML5) ;
 *   - la SELECTION d'un meuble au clic ;
 *   - le DEPLACEMENT (glisser le corps du meuble) ;
 *   - la ROTATION et la MISE A L'ECHELLE via les poignees ;
 *   - la suppression au clavier (Suppr/Backspace).
 *
 * Principe d'historique : un geste (drag) capture l'etat AVANT le geste, applique
 * les changements en continu via `store.update()` (sans historique), puis
 * enregistre UN seul point d'annulation a la fin via `store.recordHistory()`.
 *
 * Le module ne connait pas l'UI : il communique la selection via un callback.
 */

import { clientToSvg, BASE_SYMBOL_SPAN } from './shield-renderer.js';
import { createMeuble, cloneDesign } from '../core/design-document.js';
import { getShield } from '../data/shields.js';

/**
 * Installe toutes les interactions sur le SVG d'ecu.
 * @param {object} cfg
 * @param {SVGSVGElement} cfg.svg
 * @param {import('../core/store.js').Store} cfg.store
 * @param {()=>string|null} cfg.getSelected id du meuble selectionne
 * @param {(id:string|null)=>void} cfg.setSelected change la selection
 * @returns {()=>void} fonction de nettoyage
 */
export function installInteractions({ svg, store, getSelected, setSelected }) {
  // --- Depot depuis la palette (HTML5 drag & drop) ---
  const onDragOver = (e) => {
    // Autoriser le drop uniquement si on transporte un symbole.
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
    const meuble = createMeuble({
      symbolId,
      tincture: suggestTincture(store.getState()),
      x,
      y,
      z: nextZ(store.getState())
    });
    store.commit((d) => d.meubles.push(meuble), 'ajout meuble');
    setSelected(meuble.id);
  };
  svg.addEventListener('dragover', onDragOver);
  svg.addEventListener('drop', onDrop);

  // --- Manipulation directe (pointer events) ---
  let drag = null; // etat du geste en cours

  const onPointerDown = (e) => {
    // Poignee (rotation / echelle) ?
    const handleEl = e.target.closest('[data-handle]');
    if (handleEl) {
      const forId = handleEl.closest('[data-selection-for]')?.getAttribute('data-selection-for');
      if (forId) {
        startHandleDrag(e, handleEl.getAttribute('data-handle'), forId);
        return;
      }
    }
    // Corps d'un meuble ?
    const meubleEl = e.target.closest('[data-meuble-id]');
    if (meubleEl) {
      const id = meubleEl.getAttribute('data-meuble-id');
      setSelected(id);
      startMoveDrag(e, id);
      return;
    }
    // Clic dans le vide : deselection.
    setSelected(null);
  };

  function startMoveDrag(e, id) {
    const m = findMeuble(store.getState(), id);
    if (!m) return;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    drag = {
      type: 'move',
      id,
      pre: cloneDesign(store.getState()),
      offsetX: m.x - p.x,
      offsetY: m.y - p.y
    };
    svg.setPointerCapture?.(e.pointerId);
  }

  function startHandleDrag(e, kind, id) {
    const m = findMeuble(store.getState(), id);
    if (!m) return;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    drag = {
      type: kind, // 'rotate' | 'scale'
      id,
      pre: cloneDesign(store.getState()),
      startAngle: Math.atan2(p.y - m.y, p.x - m.x),
      startRotation: m.rotation || 0,
      startDist: Math.hypot(p.x - m.x, p.y - m.y) || 1,
      startScale: m.scale || 1
    };
    svg.setPointerCapture?.(e.pointerId);
  }

  const onPointerMove = (e) => {
    if (!drag) return;
    const p = clientToSvg(svg, e.clientX, e.clientY);
    store.update((d) => {
      const m = findMeuble(d, drag.id);
      if (!m) return;
      if (drag.type === 'move') {
        m.x = clamp(p.x + drag.offsetX, 0, 200);
        m.y = clamp(p.y + drag.offsetY, 0, 240);
      } else if (drag.type === 'rotate') {
        const ang = Math.atan2(p.y - m.y, p.x - m.x);
        let deg = drag.startRotation + (ang - drag.startAngle) * (180 / Math.PI);
        // Aimantation legere tous les 15 deg si Maj enfoncee.
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        m.rotation = Math.round(deg);
      } else if (drag.type === 'scale') {
        const dist = Math.hypot(p.x - m.x, p.y - m.y) || 1;
        m.scale = clamp((drag.startScale * dist) / drag.startDist, 0.2, 4);
      }
    });
  };

  const onPointerUp = (e) => {
    if (!drag) return;
    // Enregistrer un unique point d'annulation pour tout le geste s'il a change.
    if (JSON.stringify(drag.pre.meubles) !== JSON.stringify(store.getState().meubles)) {
      store.recordHistory(drag.pre);
    }
    svg.releasePointerCapture?.(e.pointerId);
    drag = null;
  };

  svg.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  // --- Suppression au clavier ---
  const onKeyDown = (e) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;
    // Ne pas interferer avec la saisie dans un champ de formulaire.
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    const id = getSelected();
    if (!id) return;
    e.preventDefault();
    store.commit((d) => {
      d.meubles = d.meubles.filter((m) => m.id !== id);
    }, 'suppression meuble');
    setSelected(null);
  };
  window.addEventListener('keydown', onKeyDown);

  // --- Nettoyage ---
  return () => {
    svg.removeEventListener('dragover', onDragOver);
    svg.removeEventListener('drop', onDrop);
    svg.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('keydown', onKeyDown);
  };
}

// ---------- Utilitaires ----------

function findMeuble(design, id) {
  return (design.meubles || []).find((m) => m.id === id) || null;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** z suivant (au-dessus de tous les meubles existants). */
function nextZ(design) {
  const zs = (design.meubles || []).map((m) => m.z || 0);
  return zs.length ? Math.max(...zs) + 1 : 0;
}

/**
 * Suggere une teinture de meuble contrastant avec le champ (metal sur email et
 * inversement), pour un depot par defaut heraldiquement correct.
 * @param {object} design
 * @returns {string}
 */
function suggestTincture(design) {
  const champ = design?.ecu?.champ?.tincture;
  // Champ clair (metal) -> meuble sombre ; champ colore -> meuble or.
  if (champ === 'or' || champ === 'argent') return 'gueules';
  return 'or';
}

/**
 * Renvoie le centre par defaut de la forme d'ecu courante (placement initial).
 * @param {object} design
 * @returns {{x:number,y:number}}
 */
export function defaultDropCenter(design) {
  return getShield(design.ecu.forme).centre;
}
