/**
 * ui/app.js — Construction de l'interface et cablage au store.
 *
 * L'UI est volontairement en DOM natif (pas de framework) pour rester DECOUPLEE
 * des moteurs 2D/3D. Elle :
 *   - construit le wizard d'etapes, la barre d'outils et les 3 panneaux ;
 *   - s'abonne au store pour rafraichir le rendu SVG et les panneaux ;
 *   - delegue le rendu du blason a engine2d/shield-renderer et les interactions
 *     a engine2d/dnd.
 *
 * Phase 1 : seule l'etape "Ecu" est active ; les etapes suivantes sont affichees
 * en "a venir" (degradation gracieuse).
 */

import { SHIELDS, SHIELD_ORDER, SHIELD_VIEWBOX } from '../data/shields.js';
import { SYMBOLS, SYMBOL_ORDER, SYMBOL_VIEWBOX, resolveSymbol } from '../data/symbols/index.js';
import { TINCTURES, TINCTURE_ORDER, fillForTincture } from '../data/tinctures.js';
import { createShieldSvg, renderShield } from '../engine2d/shield-renderer.js';
import { buildCustomSymbolGroup, parseCustomSvg } from '../engine2d/symbol-loader.js';
import { installInteractions } from '../engine2d/dnd.js';
import { analyserDesign } from '../core/heraldry-rules.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Etapes du wizard (Phase 1 : seule "Ecu" est operationnelle).
const STEPS = [
  { id: 'ecu', label: 'Ecu', active: true },
  { id: 'composition', label: 'Composition', active: false },
  { id: 'genealogie', label: 'Genealogie', active: false },
  { id: '3d', label: '3D', active: false },
  { id: 'materiau', label: 'Materiau', active: false },
  { id: 'export', label: 'Export / Partage', active: false }
];

/**
 * Monte l'application dans un conteneur.
 * @param {HTMLElement} root
 * @param {object} ctx { store, io } — io fournit import/export JSON (main.js)
 */
export function mountApp(root, ctx) {
  const { store } = ctx;
  let selectedId = null; // etat local de selection (hors document design)

  const setSelected = (id) => {
    selectedId = id;
    refresh();
  };
  const getSelected = () => selectedId;

  // --- Squelette ---
  root.innerHTML = '';
  root.appendChild(buildHeader(store, ctx));
  const layout = document.createElement('div');
  layout.className = 'layout';

  const leftPanel = document.createElement('aside');
  leftPanel.className = 'panel';
  const centerPanel = document.createElement('section');
  centerPanel.className = 'panel';
  const rightPanel = document.createElement('aside');
  rightPanel.className = 'panel';

  layout.append(leftPanel, centerPanel, rightPanel);
  root.appendChild(layout);
  root.appendChild(buildToastHost());

  // --- Scene 2D centrale ---
  centerPanel.innerHTML = '<h2>Ecu</h2>';
  const stage = document.createElement('div');
  stage.className = 'stage panel-body';
  const svg = createShieldSvg();
  stage.appendChild(svg);
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent =
    'Glissez un meuble depuis la palette. Cliquez pour selectionner, glissez pour deplacer, poignees pour tourner/redimensionner, Suppr pour effacer.';
  stage.appendChild(hint);
  centerPanel.appendChild(stage);

  // --- Interactions (une seule installation) ---
  installInteractions({ svg, store, getSelected, setSelected });

  // --- Rafraichissement complet a chaque changement d'etat ---
  function refresh() {
    const design = store.getState();
    const warnings = analyserDesign(design);
    const warnIds = new Set(warnings.map((w) => w.meubleId));
    // Rendu du blason.
    renderShield(svg, design, { selectedId, warnMeubleIds: warnIds });
    // Panneaux.
    renderLeftPanel(leftPanel, { store, design, ctx });
    renderRightPanel(rightPanel, { store, design, selectedId, setSelected, warnings });
  }

  store.subscribe(refresh);
}

/* ============================================================
 *  EN-TETE : titre + wizard + barre d'outils
 * ============================================================ */

function buildHeader(store, ctx) {
  const header = document.createElement('header');
  header.className = 'app-header';

  const titleRow = document.createElement('div');
  titleRow.className = 'app-title';
  titleRow.innerHTML =
    '<h1>Configurateur de chevaliere</h1>' +
    '<span class="subtitle">Blason heraldique 2D &rarr; chevaliere 3D &middot; Phase 1</span>';
  header.appendChild(titleRow);

  // Wizard d'etapes.
  const wizard = document.createElement('nav');
  wizard.className = 'wizard';
  STEPS.forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'step' + (i === 0 ? ' active' : ' todo');
    el.title = s.active ? '' : 'Etape a venir (phase suivante)';
    el.innerHTML = `<span class="num">${i + 1}</span> ${s.label}` + (s.active ? '' : ' <em style="font-size:.7rem">(a venir)</em>');
    wizard.appendChild(el);
  });
  header.appendChild(wizard);

  // Barre d'outils.
  header.appendChild(buildToolbar(store, ctx));
  return header;
}

function buildToolbar(store, ctx) {
  const bar = document.createElement('div');
  bar.className = 'toolbar';

  // Nom du design.
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Nom du blason';
  nameInput.value = store.getState().meta.nom;
  nameInput.addEventListener('change', () => {
    store.commit((d) => (d.meta.nom = nameInput.value || 'Blason sans nom'), 'renommer');
  });
  bar.appendChild(nameInput);

  const spacer = document.createElement('div');
  spacer.className = 'spacer';
  bar.appendChild(spacer);

  // Undo / Redo.
  const undoBtn = btn('Annuler', () => store.undo());
  const redoBtn = btn('Retablir', () => store.redo());
  bar.append(undoBtn, redoBtn);

  // Import / Export JSON + nouveau.
  bar.appendChild(btn('Importer JSON', () => ctx.io.importJson()));
  bar.appendChild(btn('Exporter JSON', () => ctx.io.exportJson()));
  bar.appendChild(btn('Nouveau', () => ctx.io.reset()));

  // Mise a jour de l'etat des boutons undo/redo a chaque changement.
  store.subscribe(() => {
    undoBtn.disabled = !store.canUndo();
    redoBtn.disabled = !store.canRedo();
    // Resynchroniser le champ nom si change ailleurs (import/undo).
    if (document.activeElement !== nameInput) nameInput.value = store.getState().meta.nom;
  });

  return bar;
}

/* ============================================================
 *  PANNEAU GAUCHE : formes d'ecu, palette de meubles, teintures du champ, import
 * ============================================================ */

function renderLeftPanel(panel, { store, design, ctx }) {
  panel.innerHTML = '<h2>Composition de l\'ecu</h2>';
  const body = document.createElement('div');
  body.className = 'panel-body';

  // 1) Forme de l'ecu.
  const secForme = section('Forme de l\'ecu');
  const shieldGrid = document.createElement('div');
  shieldGrid.className = 'thumb-grid';
  for (const id of SHIELD_ORDER) {
    const sh = SHIELDS[id];
    const thumb = document.createElement('div');
    thumb.className = 'thumb' + (design.ecu.forme === id ? ' selected' : '');
    thumb.style.cursor = 'pointer';
    thumb.title = sh.nom;
    thumb.appendChild(shieldThumbSvg(sh.path));
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = sh.nom.replace(/^Ecu /, '');
    thumb.appendChild(label);
    thumb.addEventListener('click', () => {
      store.commit((d) => (d.ecu.forme = id), 'forme ecu');
    });
    shieldGrid.appendChild(thumb);
  }
  secForme.appendChild(shieldGrid);
  body.appendChild(secForme);

  // 2) Teinture du champ.
  const secChamp = section('Teinture du champ (fond)');
  secChamp.appendChild(
    tinctureGrid(design.ecu.champ.tincture, (tid) => {
      store.commit((d) => (d.ecu.champ.tincture = tid), 'teinture champ');
    })
  );
  body.appendChild(secChamp);

  // 3) Palette de meubles (glisser-deposer).
  const secMeubles = section('Meubles (glisser sur l\'ecu)');
  const grid = document.createElement('div');
  grid.className = 'thumb-grid';
  for (const id of SYMBOL_ORDER) {
    grid.appendChild(symbolThumb(id, SYMBOLS[id].nom, SYMBOLS[id].pathData, SYMBOL_VIEWBOX, SYMBOLS[id].fillRule));
  }
  // Symboles personnalises importes.
  for (const cs of design.customSymbols || []) {
    grid.appendChild(customSymbolThumb(cs));
  }
  secMeubles.appendChild(grid);

  // Import SVG perso.
  const importBtn = btn('Importer un symbole SVG…', () => ctx.io.importSvgSymbol());
  importBtn.style.marginTop = '10px';
  secMeubles.appendChild(importBtn);
  const importHint = document.createElement('p');
  importHint.className = 'empty-hint';
  importHint.style.marginTop = '6px';
  importHint.textContent =
    'Le SVG importe est normalise et rendu re-colorable (ses couleurs codees en dur sont neutralisees).';
  secMeubles.appendChild(importHint);

  body.appendChild(secMeubles);
  panel.appendChild(body);
}

/* ============================================================
 *  PANNEAU DROIT : proprietes du meuble selectionne + avertissements
 * ============================================================ */

function renderRightPanel(panel, { store, design, selectedId, setSelected, warnings }) {
  panel.innerHTML = '<h2>Proprietes</h2>';
  const body = document.createElement('div');
  body.className = 'panel-body';

  const meuble = (design.meubles || []).find((m) => m.id === selectedId);
  if (!meuble) {
    const hint = document.createElement('p');
    hint.className = 'empty-hint';
    hint.textContent =
      'Aucun meuble selectionne. Cliquez sur un meuble pose sur l\'ecu pour editer sa teinture, sa taille, sa rotation et son ordre de superposition.';
    body.appendChild(hint);
  } else {
    const sym = resolveSymbol(meuble.symbolId, design.customSymbols);
    const title = document.createElement('h3');
    title.textContent = sym ? sym.nom : meuble.symbolId;
    body.appendChild(title);

    // Teinture du meuble.
    const secT = section('Teinture');
    secT.appendChild(
      tinctureGrid(meuble.tincture, (tid) => {
        store.commit((d) => {
          const m = d.meubles.find((x) => x.id === meuble.id);
          if (m) m.tincture = tid;
        }, 'teinture meuble');
      })
    );
    body.appendChild(secT);

    // Sliders : taille, rotation.
    body.appendChild(
      rangeField('Taille', meuble.scale, 0.2, 4, 0.05, (v) => {
        store.commit((d) => {
          const m = d.meubles.find((x) => x.id === meuble.id);
          if (m) m.scale = v;
        }, 'taille meuble');
      })
    );
    body.appendChild(
      rangeField('Rotation (deg)', meuble.rotation, -180, 180, 1, (v) => {
        store.commit((d) => {
          const m = d.meubles.find((x) => x.id === meuble.id);
          if (m) m.rotation = v;
        }, 'rotation meuble');
      })
    );

    // Ordre de superposition + actions.
    const secOrder = section('Disposition');
    const rowBtns = document.createElement('div');
    rowBtns.className = 'row-btns';
    rowBtns.appendChild(
      btn('Devant', () =>
        store.commit((d) => {
          const maxZ = Math.max(...d.meubles.map((m) => m.z || 0));
          const m = d.meubles.find((x) => x.id === meuble.id);
          if (m) m.z = maxZ + 1;
        }, 'ordre')
      )
    );
    rowBtns.appendChild(
      btn('Derriere', () =>
        store.commit((d) => {
          const minZ = Math.min(...d.meubles.map((m) => m.z || 0));
          const m = d.meubles.find((x) => x.id === meuble.id);
          if (m) m.z = minZ - 1;
        }, 'ordre')
      )
    );
    rowBtns.appendChild(
      btn('Dupliquer', () => {
        store.commit((d) => {
          const src = d.meubles.find((x) => x.id === meuble.id);
          if (!src) return;
          const copy = { ...src, id: 'meuble-' + Math.random().toString(36).slice(2, 9), x: src.x + 12, y: src.y + 12, z: (src.z || 0) + 1 };
          d.meubles.push(copy);
        }, 'dupliquer');
      })
    );
    const delBtn = btn('Supprimer', () => {
      store.commit((d) => {
        d.meubles = d.meubles.filter((m) => m.id !== meuble.id);
      }, 'supprimer');
      setSelected(null);
    });
    delBtn.classList.add('danger');
    rowBtns.appendChild(delBtn);
    secOrder.appendChild(rowBtns);
    body.appendChild(secOrder);
  }

  // Avertissements heraldiques (non bloquants).
  const warnBox = document.createElement('div');
  warnBox.className = 'warnings';
  if (warnings.length) {
    const h = document.createElement('h3');
    h.textContent = 'Regle de contrariete';
    warnBox.appendChild(h);
    for (const w of warnings) {
      const item = document.createElement('div');
      item.className = 'warn-item';
      item.textContent = w.message + ' (meuble concerne)';
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => setSelected(w.meubleId));
      warnBox.appendChild(item);
    }
  }
  body.appendChild(warnBox);

  panel.appendChild(body);
}

/* ============================================================
 *  Fabriques de composants reutilisables
 * ============================================================ */

function section(title) {
  const s = document.createElement('div');
  s.className = 'panel-section';
  const h = document.createElement('h3');
  h.textContent = title;
  s.appendChild(h);
  return s;
}

function btn(label, onClick) {
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

/** Grille de pastilles de teinture avec teinture active surlignee. */
function tinctureGrid(activeId, onPick) {
  const grid = document.createElement('div');
  grid.className = 'tincture-grid';
  for (const id of TINCTURE_ORDER) {
    const t = TINCTURES[id];
    const sw = document.createElement('div');
    sw.className = 'swatch' + (activeId === id ? ' active' : '');
    sw.title = t.nom;
    const chip = document.createElement('div');
    chip.className = 'chip';
    // Apercu : pour une fourrure on affiche sa couleur de base (motif au rendu final).
    chip.style.background = t.couleur;
    if (t.categorie === 'fourrure') chip.style.backgroundImage = 'repeating-linear-gradient(45deg,#0002 0 3px,transparent 3px 6px)';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = t.nom.split(' ')[0];
    sw.append(chip, name);
    sw.addEventListener('click', () => onPick(id));
    grid.appendChild(sw);
  }
  return grid;
}

/** Champ curseur (range) avec valeur affichee. */
function rangeField(label, value, min, max, step, onInput) {
  const f = document.createElement('div');
  f.className = 'field';
  const lab = document.createElement('label');
  lab.textContent = label;
  const val = document.createElement('span');
  val.className = 'value';
  val.textContent = Number(value).toFixed(step < 1 ? 2 : 0);
  lab.appendChild(val);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;
  input.addEventListener('input', () => {
    val.textContent = Number(input.value).toFixed(step < 1 ? 2 : 0);
    onInput(parseFloat(input.value));
  });
  f.append(lab, input);
  return f;
}

/** Vignette d'une forme d'ecu. */
function shieldThumbSvg(pathData) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${SHIELD_VIEWBOX.width} ${SHIELD_VIEWBOX.height}`);
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', pathData);
  p.setAttribute('fill', '#c7d3e6');
  p.setAttribute('stroke', '#2456a4');
  p.setAttribute('stroke-width', '4');
  svg.appendChild(p);
  return svg;
}

/** Vignette draggable d'un meuble natif. */
function symbolThumb(id, nom, pathData, viewBox, fillRule) {
  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  thumb.title = nom;
  thumb.draggable = true;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', pathData);
  p.setAttribute('fill', '#3a4a63');
  if (fillRule) p.setAttribute('fill-rule', fillRule);
  svg.appendChild(p);
  thumb.appendChild(svg);
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = nom;
  thumb.appendChild(label);
  thumb.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/x-symbol-id', id);
    e.dataTransfer.effectAllowed = 'copy';
  });
  return thumb;
}

/** Vignette draggable d'un symbole personnalise importe. */
function customSymbolThumb(cs) {
  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  thumb.title = cs.nom;
  thumb.draggable = true;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  const g = buildCustomSymbolGroup(cs);
  g.setAttribute('fill', '#3a4a63');
  svg.appendChild(g);
  thumb.appendChild(svg);
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = cs.nom;
  thumb.appendChild(label);
  thumb.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/x-symbol-id', cs.id);
    e.dataTransfer.effectAllowed = 'copy';
  });
  return thumb;
}

function buildToastHost() {
  const host = document.createElement('div');
  host.className = 'toast-host';
  host.id = 'toast-host';
  return host;
}

/**
 * Affiche une notification ephemere.
 * @param {string} message
 * @param {boolean} [isError]
 */
export function toast(message, isError = false) {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' error' : '');
  t.textContent = message;
  host.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}
