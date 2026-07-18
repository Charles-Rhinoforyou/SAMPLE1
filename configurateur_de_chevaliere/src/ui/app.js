/**
 * ui/app.js — Construction de l'interface et cablage au store (Phase 1 + 2).
 *
 * L'UI est en DOM natif (pas de framework) pour rester DECOUPLEE des moteurs.
 * Etapes actives : Ecu + Composition. Les suivantes restent "a venir".
 *
 * Etat local (hors document design) :
 *   - selectedId : meuble selectionne ;
 *   - activeQuartier : quartier en cours d'edition (depot, champ, disposition) ;
 *   - guides : guides d'aimantation transitoires (pendant un deplacement).
 */

import { SHIELDS, SHIELD_ORDER, SHIELD_VIEWBOX } from '../data/shields.js';
import { SYMBOLS, SYMBOL_ORDER, SYMBOL_VIEWBOX, resolveSymbol } from '../data/symbols/index.js';
import { TINCTURES, TINCTURE_ORDER } from '../data/tinctures.js';
import { PARTITIONS, PARTITION_ORDER, partitionCount, getRegions, pointsToSvg } from '../engine2d/composition.js';
import { CROWNS, CROWN_ORDER, CROWN_VIEWBOX, getCrown } from '../data/crowns.js';
import { createShieldSvg, renderShield } from '../engine2d/shield-renderer.js';
import { buildCustomSymbolGroup } from '../engine2d/symbol-loader.js';
import { installInteractions } from '../engine2d/dnd.js';
import { analyserDesign } from '../core/heraldry-rules.js';
import { getQuartiers, createQuartier, defaultLayout } from '../core/design-document.js';
import { GENEALOGY, searchGenealogy } from '../data/genealogy-library.js';
import { ThreeView } from '../engine3d/scene.js';
import { RING_SIZES, nearestSize } from '../data/ring-sizes.js';
import { METALS, METAL_ORDER, FINITIONS, FINITION_ORDER } from '../engine3d/materials.js';
import { exportGLB, exportOBJ, exportSTL, convertViaBackend, downloadBlob } from '../exporters/exporters.js';
import { uploadToSketchfab } from '../integrations/sketchfab.js';
import { partagerEmail, partagerWhatsApp } from '../integrations/share.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const STEPS = [
  { id: 'ecu', label: 'Ecu', active: true, mode: '2d' },
  { id: 'composition', label: 'Composition', active: true, mode: '2d' },
  { id: 'genealogie', label: 'Genealogie', active: true, mode: '2d' },
  { id: '3d', label: '3D', active: true, mode: '3d' },
  { id: 'materiau', label: 'Materiau', active: true, mode: '3d' },
  { id: 'export', label: 'Export / Partage', active: true, mode: '3d' }
];

// Formes de plateau (chaton) de la chevaliere.
const PLATEAU_FORMES = [
  ['ecu', 'Ecu (contour du blason)'],
  ['rond', 'Rond'],
  ['ovale', 'Ovale'],
  ['coussin', 'Coussin'],
  ['rectangle', 'Rectangle'],
  ['octogone', 'Octogone']
];

const DISPOSITIONS = [
  ['libre', 'Libre (manuel)'],
  ['pal', 'En pal (colonne)'],
  ['fasce', 'En fasce (ligne)'],
  ['bande', 'En bande (diag. \\)'],
  ['barre', 'En barre (diag. /)'],
  ['grille', 'Grille N x M'],
  ['rangs', 'Rangs (2-1, 3-2-1...)'],
  ['cercle', 'En cercle / rayonnant'],
  ['orle', 'En orle (peripherie)'],
  ['chef', 'En chef (haut)'],
  ['pointe', 'En pointe (bas)']
];

export function mountApp(root, ctx) {
  const { store } = ctx;
  let selectedId = null;
  let activeQuartier = 0;
  let guides = [];
  let mode = '2d'; // '2d' (edition blason) | '3d' (chevaliere)
  let threeView = null;
  let activeStep = 'ecu';

  const setSelected = (id) => { selectedId = id; refresh(); };
  const getSelected = () => selectedId;
  const setActiveQuartier = (i) => { activeQuartier = i; selectedId = null; refresh(); };
  const getActiveQuartier = () => activeQuartier;
  const setGuides = (g) => { guides = g; refresh(); };

  // Squelette.
  root.innerHTML = '';
  const layout = document.createElement('div');
  layout.className = 'layout';
  const leftPanel = document.createElement('aside');
  leftPanel.className = 'panel';
  const centerPanel = document.createElement('section');
  centerPanel.className = 'panel';
  const rightPanel = document.createElement('aside');
  rightPanel.className = 'panel';
  layout.append(leftPanel, centerPanel, rightPanel);

  // Centre : en-tete + scene 2D (SVG) + scene 3D (WebGL).
  const centerHead = document.createElement('h2');
  centerHead.textContent = 'Blason';
  const stage2d = document.createElement('div');
  stage2d.className = 'stage panel-body';
  const svg = createShieldSvg();
  stage2d.appendChild(svg);
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent =
    'Glissez un meuble dans le quartier actif. En disposition « Libre », deplacez a la souris (aimantation). Choisissez une disposition pour un placement automatique.';
  stage2d.appendChild(hint);
  const stage3d = document.createElement('div');
  stage3d.className = 'stage3d';
  stage3d.style.display = 'none';
  centerPanel.append(centerHead, stage2d, stage3d);

  installInteractions({ svg, store, getSelected, setSelected, getActiveQuartier, setGuides });

  function ensureThree() {
    if (!threeView) threeView = new ThreeView(stage3d);
  }

  const setMode = (m, stepId) => {
    mode = m;
    if (stepId) activeStep = stepId;
    const is3d = mode === '3d';
    stage2d.style.display = is3d ? 'none' : '';
    stage3d.style.display = is3d ? '' : 'none';
    centerHead.textContent = is3d ? 'Chevaliere 3D' : 'Blason';
    if (is3d) {
      ensureThree();
      threeView.setDesign(store.getState());
      requestAnimationFrame(() => threeView._resize());
    }
    updateWizard();
    refresh();
  };

  function refresh() {
    const design = store.getState();
    const nQ = getQuartiers(design).length;
    if (activeQuartier >= nQ) activeQuartier = nQ - 1;
    if (activeQuartier < 0) activeQuartier = 0;

    if (mode === '3d') {
      if (threeView) threeView.setDesign(design);
      render3DLeftPanel(leftPanel, { store, design });
      if (activeStep === 'export') {
        renderExportPanel(rightPanel, { store, design, getThree: () => threeView, refresh });
      } else {
        render3DRightPanel(rightPanel, { store, design, getThree: () => threeView, ctx });
      }
    } else {
      const warnings = analyserDesign(design);
      const warnIds = new Set(warnings.map((w) => w.meubleId));
      renderShield(svg, design, { selectedId, warnMeubleIds: warnIds, activeQuartier, guides });
      renderLeftPanel(leftPanel, { store, design, ctx, activeQuartier, setActiveQuartier });
      renderRightPanel(rightPanel, { store, design, selectedId, setSelected, warnings });
    }
  }

  const { header, updateWizard } = buildHeader(store, ctx, { setMode, getStep: () => activeStep });
  root.append(header, layout, buildToastHost());

  store.subscribe(refresh);
}

/* ===================== EN-TETE ===================== */

function buildHeader(store, ctx, nav) {
  const header = document.createElement('header');
  header.className = 'app-header';
  const titleRow = document.createElement('div');
  titleRow.className = 'app-title';
  titleRow.innerHTML =
    '<h1>Configurateur de chevaliere</h1>' +
    '<span class="subtitle">Blason heraldique 2D &rarr; chevaliere 3D &middot; phases 1 a 6</span>';
  header.appendChild(titleRow);

  const wizard = document.createElement('nav');
  wizard.className = 'wizard';
  const stepEls = [];
  STEPS.forEach((s) => {
    const el = document.createElement('div');
    el.innerHTML = `<span class="num">${STEPS.indexOf(s) + 1}</span> ${s.label}` + (s.active ? '' : ' <em style="font-size:.7rem">(a venir)</em>');
    if (s.active) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => nav.setMode(s.mode, s.id));
    }
    stepEls.push({ el, step: s });
    wizard.appendChild(el);
  });
  header.appendChild(wizard);
  header.appendChild(buildToolbar(store, ctx));

  const updateWizard = () => {
    const cur = nav.getStep();
    for (const { el, step } of stepEls) {
      el.className = 'step' + (!step.active ? ' todo' : step.id === cur ? ' active' : ' active-2');
    }
  };
  updateWizard();
  return { header, updateWizard };
}

function buildToolbar(store, ctx) {
  const bar = document.createElement('div');
  bar.className = 'toolbar';
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
  const undoBtn = btn('Annuler', () => store.undo());
  const redoBtn = btn('Retablir', () => store.redo());
  bar.append(undoBtn, redoBtn);
  const libBtn = btn('Bibliotheque genealogique', () => openLibrary(store));
  libBtn.classList.add('primary');
  bar.appendChild(libBtn);
  bar.appendChild(btn('Importer JSON', () => ctx.io.importJson()));
  bar.appendChild(btn('Exporter JSON', () => ctx.io.exportJson()));
  bar.appendChild(btn('Nouveau', () => ctx.io.reset()));
  store.subscribe(() => {
    undoBtn.disabled = !store.canUndo();
    redoBtn.disabled = !store.canRedo();
    if (document.activeElement !== nameInput) nameInput.value = store.getState().meta.nom;
  });
  return bar;
}

/* ===================== PANNEAU GAUCHE ===================== */

function renderLeftPanel(panel, { store, design, ctx, activeQuartier, setActiveQuartier }) {
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
    thumb.addEventListener('click', () => store.commit((d) => (d.ecu.forme = id), 'forme ecu'));
    shieldGrid.appendChild(thumb);
  }
  secForme.appendChild(shieldGrid);
  body.appendChild(secForme);

  // 2) Partition (composition 1-4+).
  const secPart = section('Partition (division du blason)');
  const partGrid = document.createElement('div');
  partGrid.className = 'thumb-grid';
  for (const id of PARTITION_ORDER) {
    const part = PARTITIONS[id];
    const thumb = document.createElement('div');
    thumb.className = 'thumb' + (design.ecu.partition === id ? ' selected' : '');
    thumb.style.cursor = 'pointer';
    thumb.title = part.nom;
    thumb.appendChild(partitionThumbSvg(id, design.ecu.forme));
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = part.nom.replace(/\s*\(.*\)/, '');
    thumb.appendChild(label);
    thumb.addEventListener('click', () => setPartition(store, id));
    partGrid.appendChild(thumb);
  }
  secPart.appendChild(partGrid);
  body.appendChild(secPart);

  // 3) Selecteur de quartier actif (si > 1 quartier).
  const quartiers = getQuartiers(design);
  if (quartiers.length > 1) {
    const secQ = section('Quartier a editer');
    const chips = document.createElement('div');
    chips.className = 'row-btns';
    quartiers.forEach((q, i) => {
      const b = btn('Quartier ' + (i + 1), () => setActiveQuartier(i));
      if (i === activeQuartier) b.classList.add('primary');
      chips.appendChild(b);
    });
    secQ.appendChild(chips);
    body.appendChild(secQ);
  }

  const q = quartiers[activeQuartier] || quartiers[0];

  // 4) Champ du quartier actif.
  const secChamp = section(quartiers.length > 1 ? `Champ du quartier ${activeQuartier + 1}` : 'Teinture du champ (fond)');
  secChamp.appendChild(
    tinctureGrid(q.champ.tincture, (tid) => {
      store.commit((d) => (getQuartiers(d)[activeQuartier].champ.tincture = tid), 'teinture champ');
    })
  );
  body.appendChild(secChamp);

  // 5) Disposition parametrique du quartier actif.
  body.appendChild(dispositionControls(store, q, activeQuartier));

  // 6) Palette de meubles + import.
  const secMeubles = section('Meubles (glisser dans le quartier actif)');
  const grid = document.createElement('div');
  grid.className = 'thumb-grid';
  for (const id of SYMBOL_ORDER) {
    grid.appendChild(symbolThumb(id, SYMBOLS[id].nom, SYMBOLS[id].pathData, SYMBOL_VIEWBOX, SYMBOLS[id].fillRule));
  }
  for (const cs of design.customSymbols || []) grid.appendChild(customSymbolThumb(cs));
  secMeubles.appendChild(grid);
  const importBtn = btn('Importer un symbole SVG…', () => ctx.io.importSvgSymbol());
  importBtn.style.marginTop = '10px';
  secMeubles.appendChild(importBtn);
  body.appendChild(secMeubles);

  panel.appendChild(body);
}

/** Bloc de reglages de disposition parametrique d'un quartier. */
function dispositionControls(store, q, qi) {
  const sec = section('Disposition parametrique');
  const layout = q.layout || defaultLayout();

  // Selecteur de disposition.
  const selWrap = document.createElement('div');
  selWrap.className = 'field';
  const selLabel = document.createElement('label');
  selLabel.textContent = 'Disposition';
  const sel = document.createElement('select');
  sel.className = 'select';
  for (const [val, lab] of DISPOSITIONS) {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = lab;
    if (layout.disposition === val) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => {
    store.commit((d) => (getQuartiers(d)[qi].layout.disposition = sel.value), 'disposition');
  });
  selWrap.append(selLabel, sel);
  sec.appendChild(selWrap);

  // Nombre d'elements (stepper) : ajoute/retire des copies du dernier meuble.
  const count = (q.meubles || []).length;
  const nombreRow = document.createElement('div');
  nombreRow.className = 'field';
  const nlab = document.createElement('label');
  nlab.innerHTML = 'Nombre d\'elements <span class="value">' + count + '</span>';
  const stepper = document.createElement('div');
  stepper.className = 'row-btns';
  stepper.appendChild(btn('−', () => store.commit((d) => {
    const m = getQuartiers(d)[qi].meubles;
    if (m.length) m.pop();
  }, 'nombre-')));
  stepper.appendChild(btn('+ copie', () => store.commit((d) => {
    const m = getQuartiers(d)[qi].meubles;
    if (!m.length) return;
    const src = m[m.length - 1];
    m.push({ ...src, id: 'meuble-' + Math.random().toString(36).slice(2, 9), z: (src.z || 0) + 1, x: Math.min(190, src.x + 10), y: Math.min(230, src.y + 10) });
  }, 'nombre+')));
  nombreRow.append(nlab, stepper);
  sec.appendChild(nombreRow);

  // Sliders (masques en mode libre pour marge/espacement/echelle... on garde echelle utile partout).
  if (layout.disposition !== 'libre') {
    sec.appendChild(rangeField('Marge', layout.marge, 0, 60, 1, (v) =>
      store.commit((d) => (getQuartiers(d)[qi].layout.marge = v), 'marge')));
    sec.appendChild(rangeField('Espacement', layout.espacement, 0.6, 2.2, 0.05, (v) =>
      store.commit((d) => (getQuartiers(d)[qi].layout.espacement = v), 'espacement')));
  }
  sec.appendChild(rangeField('Echelle globale', layout.echelle, 0.3, 2.5, 0.05, (v) =>
    store.commit((d) => (getQuartiers(d)[qi].layout.echelle = v), 'echelle')));

  // Colonnes / lignes pour la grille.
  if (layout.disposition === 'grille') {
    sec.appendChild(rangeField('Colonnes', layout.cols, 1, 6, 1, (v) =>
      store.commit((d) => (getQuartiers(d)[qi].layout.cols = v), 'cols')));
    sec.appendChild(rangeField('Lignes', layout.rows, 1, 6, 1, (v) =>
      store.commit((d) => (getQuartiers(d)[qi].layout.rows = v), 'rows')));
  }
  return sec;
}

/* ===================== PANNEAU DROIT ===================== */

function renderRightPanel(panel, { store, design, selectedId, setSelected, warnings }) {
  panel.innerHTML = '<h2>Proprietes</h2>';
  const body = document.createElement('div');
  body.className = 'panel-body';

  // --- Meuble selectionne ---
  let meuble = null;
  let inAuto = false;
  for (const q of getQuartiers(design)) {
    const m = (q.meubles || []).find((x) => x.id === selectedId);
    if (m) { meuble = m; inAuto = q.layout?.disposition && q.layout.disposition !== 'libre'; break; }
  }

  if (!meuble) {
    const hint = document.createElement('p');
    hint.className = 'empty-hint';
    hint.textContent = 'Aucun meuble selectionne. Cliquez sur un meuble pour editer sa teinture, sa taille et sa rotation.';
    body.appendChild(hint);
  } else {
    const sym = resolveSymbol(meuble.symbolId, design.customSymbols);
    const title = document.createElement('h3');
    title.textContent = sym ? sym.nom : meuble.symbolId;
    body.appendChild(title);
    if (inAuto) {
      const note = document.createElement('p');
      note.className = 'empty-hint';
      note.textContent = 'Position pilotee par la disposition automatique du quartier.';
      body.appendChild(note);
    }
    const secT = section('Teinture');
    secT.appendChild(tinctureGrid(meuble.tincture, (tid) => {
      store.commit((d) => { const m = findAny(d, meuble.id); if (m) m.tincture = tid; }, 'teinture meuble');
    }));
    body.appendChild(secT);
    body.appendChild(rangeField('Taille', meuble.scale, 0.2, 4, 0.05, (v) =>
      store.commit((d) => { const m = findAny(d, meuble.id); if (m) m.scale = v; }, 'taille')));
    body.appendChild(rangeField('Rotation (deg)', meuble.rotation, -180, 180, 1, (v) =>
      store.commit((d) => { const m = findAny(d, meuble.id); if (m) m.rotation = v; }, 'rotation')));

    const secOrder = section('Actions');
    const rowBtns = document.createElement('div');
    rowBtns.className = 'row-btns';
    rowBtns.appendChild(btn('Devant', () => store.commit((d) => bumpZ(d, meuble.id, +1), 'ordre')));
    rowBtns.appendChild(btn('Derriere', () => store.commit((d) => bumpZ(d, meuble.id, -1), 'ordre')));
    const delBtn = btn('Supprimer', () => {
      store.commit((d) => { for (const q of getQuartiers(d)) q.meubles = q.meubles.filter((m) => m.id !== meuble.id); }, 'supprimer');
      setSelected(null);
    });
    delBtn.classList.add('danger');
    rowBtns.appendChild(delBtn);
    secOrder.appendChild(rowBtns);
    body.appendChild(secOrder);
  }

  // --- Couronne ---
  body.appendChild(crownControls(store, design));

  // --- Devise ---
  body.appendChild(deviseControls(store, design));

  // --- Avertissements heraldiques ---
  const warnBox = document.createElement('div');
  warnBox.className = 'warnings';
  if (warnings.length) {
    const h = document.createElement('h3');
    h.textContent = 'Regle de contrariete';
    warnBox.appendChild(h);
    for (const w of warnings) {
      const item = document.createElement('div');
      item.className = 'warn-item';
      item.textContent = w.message;
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => setSelected(w.meubleId));
      warnBox.appendChild(item);
    }
  }
  body.appendChild(warnBox);
  panel.appendChild(body);
}

/** Selecteur de couronne par titre. */
function crownControls(store, design) {
  const sec = section('Couronne / timbre (titre)');
  const grid = document.createElement('div');
  grid.className = 'thumb-grid';
  for (const id of CROWN_ORDER) {
    const c = CROWNS[id];
    const thumb = document.createElement('div');
    thumb.className = 'thumb' + (design.couronne.type === id ? ' selected' : '');
    thumb.style.cursor = 'pointer';
    thumb.title = c.nom;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', CROWN_VIEWBOX);
    if (c.pathData) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', c.pathData);
      p.setAttribute('fill', '#c9a227');
      svg.appendChild(p);
    } else {
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', '60'); t.setAttribute('y', '38');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '18'); t.setAttribute('fill', '#94a3b8');
      t.textContent = '—';
      svg.appendChild(t);
    }
    thumb.appendChild(svg);
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = c.nom;
    thumb.appendChild(label);
    thumb.addEventListener('click', () => store.commit((d) => (d.couronne.type = id), 'couronne'));
    grid.appendChild(thumb);
  }
  sec.appendChild(grid);
  return sec;
}

/** Reglages de la devise (listel). */
function deviseControls(store, design) {
  const dv = design.devise;
  const sec = section('Devise');

  const visRow = document.createElement('label');
  visRow.style.display = 'flex';
  visRow.style.gap = '8px';
  visRow.style.alignItems = 'center';
  visRow.style.fontSize = '0.8rem';
  const vis = document.createElement('input');
  vis.type = 'checkbox';
  vis.checked = dv.visible;
  vis.addEventListener('change', () => store.commit((d) => (d.devise.visible = vis.checked), 'devise-visible'));
  visRow.append(vis, document.createTextNode('Afficher la devise'));
  sec.appendChild(visRow);

  if (dv.visible) {
    const txt = document.createElement('input');
    txt.type = 'text';
    txt.placeholder = 'Texte de la devise';
    txt.value = dv.texte;
    txt.style.width = '100%';
    txt.style.marginTop = '8px';
    txt.className = 'text-input';
    txt.addEventListener('input', () => store.commit((d) => (d.devise.texte = txt.value), 'devise-texte'));
    sec.appendChild(txt);

    // Listel on/off.
    const lisRow = document.createElement('label');
    lisRow.style.cssText = 'display:flex;gap:8px;align-items:center;font-size:.8rem;margin-top:8px';
    const lis = document.createElement('input');
    lis.type = 'checkbox';
    lis.checked = dv.listel;
    lis.addEventListener('change', () => store.commit((d) => (d.devise.listel = lis.checked), 'listel'));
    lisRow.append(lis, document.createTextNode('Listel (banderole)'));
    sec.appendChild(lisRow);

    // Police.
    const polWrap = document.createElement('div');
    polWrap.className = 'field';
    polWrap.style.marginTop = '8px';
    const polLab = document.createElement('label');
    polLab.textContent = 'Police';
    const pol = document.createElement('select');
    const fonts = [
      ['Georgia, "Times New Roman", serif', 'Georgia (serif)'],
      ['"Times New Roman", serif', 'Times'],
      ['system-ui, sans-serif', 'Sans-serif'],
      ['"Courier New", monospace', 'Monospace']
    ];
    for (const [v, l] of fonts) { const o = document.createElement('option'); o.value = v; o.textContent = l; if (dv.police === v) o.selected = true; pol.appendChild(o); }
    pol.addEventListener('change', () => store.commit((d) => (d.devise.police = pol.value), 'police'));
    polWrap.append(polLab, pol);
    sec.appendChild(polWrap);

    // Casse.
    const casseWrap = document.createElement('div');
    casseWrap.className = 'field';
    const casseLab = document.createElement('label');
    casseLab.textContent = 'Casse';
    const casse = document.createElement('select');
    for (const [v, l] of [['majuscules', 'MAJUSCULES'], ['normale', 'Normale']]) {
      const o = document.createElement('option'); o.value = v; o.textContent = l; if (dv.casse === v) o.selected = true; casse.appendChild(o);
    }
    casse.addEventListener('change', () => store.commit((d) => (d.devise.casse = casse.value), 'casse'));
    casseWrap.append(casseLab, casse);
    sec.appendChild(casseWrap);

    sec.appendChild(rangeField('Taille', dv.taille, 8, 28, 1, (v) => store.commit((d) => (d.devise.taille = v), 'taille-devise')));
    sec.appendChild(rangeField('Courbure du listel', dv.courbure, 0, 40, 1, (v) => store.commit((d) => (d.devise.courbure = v), 'courbure')));

    // Couleur du texte.
    const colWrap = document.createElement('div');
    colWrap.className = 'field';
    const colLab = document.createElement('label');
    colLab.textContent = 'Couleur du texte';
    const col = document.createElement('input');
    col.type = 'color';
    col.value = toHex(dv.couleur);
    col.addEventListener('input', () => store.commit((d) => (d.devise.couleur = col.value), 'couleur-devise'));
    colWrap.append(colLab, col);
    sec.appendChild(colWrap);
  }
  return sec;
}

/* ===================== PANNEAUX 3D (Phase 4 + 5) ===================== */

function render3DLeftPanel(panel, { store, design }) {
  panel.innerHTML = '<h2>Chevaliere 3D</h2>';
  const body = document.createElement('div');
  body.className = 'panel-body';
  const r = design.ring3d;

  // Forme du plateau (chaton).
  const secF = section('Forme du plateau (chaton)');
  const fg = document.createElement('div');
  fg.className = 'row-btns';
  for (const [id, lab] of PLATEAU_FORMES) {
    const b = btn(lab.replace(/\s*\(.*\)/, ''), () => store.commit((d) => (d.ring3d.plateauForme = id), 'plateau'));
    if (r.plateauForme === id) b.classList.add('primary');
    b.title = lab;
    fg.appendChild(b);
  }
  secF.appendChild(fg);
  body.appendChild(secF);

  // Tour de doigt.
  const secT = section('Tour de doigt');
  const selWrap = document.createElement('div');
  selWrap.className = 'field';
  const sel = document.createElement('select');
  for (const s of RING_SIZES) {
    const o = document.createElement('option');
    o.value = s.mmDiam;
    o.textContent = `Ø ${s.mmDiam.toFixed(1)} mm — FR ${s.fr} / US ${s.us} / UK ${s.uk}`;
    if (Math.abs(s.mmDiam - r.tourDoigtMm) < 0.05) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => store.commit((d) => (d.ring3d.tourDoigtMm = parseFloat(sel.value)), 'tour-doigt'));
  selWrap.appendChild(sel);
  secT.appendChild(selWrap);
  const near = nearestSize(r.tourDoigtMm);
  const info = document.createElement('p');
  info.className = 'empty-hint';
  info.textContent = `Diametre interieur ${r.tourDoigtMm.toFixed(1)} mm (≈ FR ${near.fr}).`;
  secT.appendChild(info);
  body.appendChild(secT);

  // Dimensions.
  const secD = section('Dimensions (mm)');
  const mk = (label, key, min, max, step) =>
    secD.appendChild(rangeField(label, r[key], min, max, step, (v) => store.commit((d) => (d.ring3d[key] = v), key)));
  mk('Largeur de l\'anneau', 'anneauLargeur', 2, 12, 0.1);
  mk('Epaisseur de l\'anneau', 'anneauEpaisseur', 1, 5, 0.1);
  mk('Epaulement (evasement)', 'epaulement', 0, 2.5, 0.05);
  mk('Largeur du plateau', 'plateauLargeur', 8, 24, 0.5);
  mk('Hauteur du plateau', 'plateauHauteur', 8, 28, 0.5);
  mk('Epaisseur du plateau', 'plateauEpaisseur', 1.5, 6, 0.1);
  mk('Congé (anneau/plateau)', 'conge', 0, 6, 0.1);
  body.appendChild(secD);

  // Relief.
  const secR = section('Relief du blason');
  const relBtns = document.createElement('div');
  relBtns.className = 'row-btns';
  for (const [id, lab] of [['bosse', 'En bosse (saillie)'], ['creux', 'En creux (intaille)']]) {
    const b = btn(lab, () => store.commit((d) => (d.ring3d.relief = id), 'relief'));
    if (r.relief === id) b.classList.add('primary');
    relBtns.appendChild(b);
  }
  secR.appendChild(relBtns);
  secR.appendChild(rangeField('Profondeur du relief', r.profondeur, 0.2, 2, 0.05, (v) => store.commit((d) => (d.ring3d.profondeur = v), 'profondeur')));
  const bisRow = document.createElement('label');
  bisRow.style.cssText = 'display:flex;gap:8px;align-items:center;font-size:.8rem;margin-top:6px';
  const bis = document.createElement('input');
  bis.type = 'checkbox';
  bis.checked = r.biseau;
  bis.addEventListener('change', () => store.commit((d) => (d.ring3d.biseau = bis.checked), 'biseau'));
  bisRow.append(bis, document.createTextNode('Biseaux / chanfreins'));
  secR.appendChild(bisRow);
  body.appendChild(secR);

  panel.appendChild(body);
}

function render3DRightPanel(panel, { store, design, getThree, ctx }) {
  panel.innerHTML = '<h2>Materiau &amp; rendu</h2>';
  const body = document.createElement('div');
  body.className = 'panel-body';

  // Metaux.
  const secM = section('Metal');
  const grid = document.createElement('div');
  grid.className = 'tincture-grid';
  for (const id of METAL_ORDER) {
    const m = METALS[id];
    const sw = document.createElement('div');
    sw.className = 'swatch' + (design.materiau === id ? ' active' : '');
    sw.title = m.nom;
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.style.background = '#' + m.color.toString(16).padStart(6, '0');
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = m.nom;
    sw.append(chip, name);
    sw.addEventListener('click', () => store.commit((d) => (d.materiau = id), 'materiau'));
    grid.appendChild(sw);
  }
  secM.appendChild(grid);
  body.appendChild(secM);

  // Finition.
  const secF = section('Finition');
  const selWrap = document.createElement('div');
  selWrap.className = 'field';
  const sel = document.createElement('select');
  for (const id of FINITION_ORDER) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = FINITIONS[id].nom;
    if ((design.finition || 'poli') === id) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => store.commit((d) => (d.finition = sel.value), 'finition'));
  selWrap.appendChild(sel);
  secF.appendChild(selWrap);
  body.appendChild(secF);

  // Vue & capture.
  const secV = section('Vue');
  const row = document.createElement('div');
  row.className = 'row-btns';
  row.appendChild(btn('Recentrer la vue', () => getThree()?.resetView()));
  row.appendChild(btn('Capture PNG', () => {
    const tv = getThree();
    if (!tv) return;
    const url = tv.capture();
    const a = document.createElement('a');
    a.href = url;
    a.download = (design.meta.nom || 'chevaliere').replace(/[^\w\-]+/g, '_') + '.png';
    a.click();
    toast('Capture PNG enregistree.');
  }));
  secV.appendChild(row);
  body.appendChild(secV);

  // Note honnete sur les approximations.
  const note = document.createElement('p');
  note.className = 'empty-hint';
  note.style.marginTop = '10px';
  note.textContent =
    'Rendu PBR temps reel (environnement studio procedural). Le champ 3D prend la teinture du 1er quartier ; l\'intaille (creux) est un rendu visuel sans soustraction booleenne.';
  body.appendChild(note);

  panel.appendChild(body);
}

/* ===================== EXPORT / GALERIE / PARTAGE (Phase 6) ===================== */

const GALLERY_KEY = 'chevaliere.gallery.v1';
const ENDPOINT_KEY = 'chevaliere.convert.endpoint';
const GALLERY_MAX = 12;
let sketchfabToken = ''; // conserve en memoire seulement (jamais persiste)
let lastShareLink = ''; // lien de partage (Sketchfab) apres publication

function loadGallery() {
  try {
    return JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]');
  } catch {
    return [];
  }
}
function saveGallery(list) {
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(list.slice(0, GALLERY_MAX)));
  } catch {
    /* quota depasse : on ignore silencieusement */
  }
}

function renderExportPanel(panel, { store, design, getThree, refresh }) {
  panel.innerHTML = '<h2>Export / Partage</h2>';
  const body = document.createElement('div');
  body.className = 'panel-body';
  const nomFichier = (design.meta.nom || 'chevaliere').replace(/[^\w\-]+/g, '_');
  const getObj = () => getThree()?.getExportObject();

  // --- 1) Galerie de captures ---
  const secG = section('Galerie de captures');
  secG.appendChild(btn('Ajouter une capture', () => {
    const tv = getThree();
    if (!tv) return;
    const url = tv.capture();
    const list = loadGallery();
    list.unshift({ id: 'cap-' + Date.now(), url, nom: design.meta.nom || 'Chevaliere' });
    saveGallery(list);
    toast('Capture ajoutee a la galerie.');
    refresh();
  })).classList.add('primary');
  const gal = document.createElement('div');
  gal.className = 'gallery-grid';
  const list = loadGallery();
  if (!list.length) {
    const h = document.createElement('p');
    h.className = 'empty-hint';
    h.textContent = 'Aucune capture. Orientez la chevaliere puis « Ajouter une capture ».';
    gal.appendChild(h);
  }
  for (const item of list) {
    const cell = document.createElement('div');
    cell.className = 'gallery-cell';
    const img = document.createElement('img');
    img.src = item.url;
    cell.appendChild(img);
    const acts = document.createElement('div');
    acts.className = 'gallery-acts';
    acts.appendChild(btn('⤓', () => {
      const a = document.createElement('a');
      a.href = item.url;
      a.download = nomFichier + '.png';
      a.click();
    }));
    acts.appendChild(btn('✕', () => {
      saveGallery(loadGallery().filter((x) => x.id !== item.id));
      refresh();
    }));
    cell.appendChild(acts);
    gal.appendChild(cell);
  }
  secG.appendChild(gal);
  body.appendChild(secG);

  // --- 2) Export 3D (formats natifs) ---
  const secE = section('Export 3D');
  const eRow = document.createElement('div');
  eRow.className = 'row-btns';
  eRow.appendChild(btn('GLB (PBR)', async () => {
    const obj = getObj();
    if (!obj) return;
    try {
      const blob = await exportGLB(obj);
      downloadBlob(blob, nomFichier + '.glb');
      toast('GLB exporte (materiaux PBR inclus).');
    } catch (e) {
      toast('Export GLB echoue : ' + e.message, true);
    }
  }));
  eRow.appendChild(btn('OBJ + MTL', () => {
    const obj = getObj();
    if (!obj) return;
    const { obj: o, mtl } = exportOBJ(obj);
    downloadBlob(o, nomFichier + '.obj');
    downloadBlob(mtl, 'model.mtl');
    toast('OBJ + MTL exportes (materiaux simples).');
  }));
  eRow.appendChild(btn('STL', () => {
    const obj = getObj();
    if (!obj) return;
    downloadBlob(exportSTL(obj, true), nomFichier + '.stl');
    toast('STL exporte (geometrie seule, sans materiau).');
  }));
  secE.appendChild(eRow);
  const eNote = document.createElement('p');
  eNote.className = 'empty-hint';
  eNote.style.marginTop = '6px';
  eNote.textContent =
    'GLB : format de reference (PBR + textures). OBJ+MTL : couleurs simples. STL : impression 3D, sans matiere/couleur (normal).';
  secE.appendChild(eNote);
  body.appendChild(secE);

  // --- 3) Formats via micro-service optionnel (3DM / STEP / FBX / DWG) ---
  const secC = section('Autres formats (service de conversion)');
  const endpoint = localStorage.getItem(ENDPOINT_KEY) || '';
  const epInput = document.createElement('input');
  epInput.type = 'text';
  epInput.className = 'text-input';
  epInput.placeholder = 'URL du micro-service de conversion (optionnel)';
  epInput.value = endpoint;
  epInput.style.width = '100%';
  epInput.addEventListener('change', () => {
    localStorage.setItem(ENDPOINT_KEY, epInput.value.trim());
    refresh();
  });
  secC.appendChild(epInput);
  const cRow = document.createElement('div');
  cRow.className = 'row-btns';
  cRow.style.marginTop = '6px';
  for (const fmt of ['3dm', 'step', 'fbx', 'dwg']) {
    const b = btn(fmt.toUpperCase(), async () => {
      const obj = getObj();
      if (!obj) return;
      try {
        const glb = await exportGLB(obj);
        const blob = await convertViaBackend(endpoint, glb, fmt);
        downloadBlob(blob, nomFichier + '.' + fmt);
        toast(`${fmt.toUpperCase()} recu du service de conversion.`);
      } catch (e) {
        toast(`Conversion ${fmt.toUpperCase()} echouee : ${e.message}`, true);
      }
    });
    if (!endpoint) {
      b.disabled = true;
      b.title =
        'Pas d\'export propre en pur client (WASM lourds ou lib proprietaire). Renseignez un micro-service de conversion, ou utilisez GLB/OBJ/STL.';
    }
    cRow.appendChild(b);
  }
  secC.appendChild(cRow);
  const cNote = document.createElement('p');
  cNote.className = 'empty-hint';
  cNote.style.marginTop = '6px';
  cNote.textContent =
    '3DM/STEP/FBX/DWG ne s\'exportent pas proprement en pur navigateur. Ces boutons envoient le GLB a un micro-service de conversion que vous fournissez (POST file+format).';
  secC.appendChild(cNote);
  body.appendChild(secC);

  // --- 4) Publication Sketchfab ---
  const secS = section('Publier sur Sketchfab');
  const tokInput = document.createElement('input');
  tokInput.type = 'password';
  tokInput.className = 'text-input';
  tokInput.placeholder = 'Token API Sketchfab (non enregistre)';
  tokInput.value = sketchfabToken;
  tokInput.style.width = '100%';
  tokInput.addEventListener('input', () => (sketchfabToken = tokInput.value.trim()));
  secS.appendChild(tokInput);
  const pubBtn = btn('Publier le GLB', async () => {
    const obj = getObj();
    if (!obj) return;
    if (!sketchfabToken) return toast('Renseignez votre token Sketchfab.', true);
    toast('Envoi vers Sketchfab…');
    try {
      const glb = await exportGLB(obj);
      const { url } = await uploadToSketchfab({ token: sketchfabToken, glb, name: design.meta.nom, description: 'Chevaliere heraldique' });
      lastShareLink = url;
      toast('Publie sur Sketchfab.');
      refresh();
    } catch (e) {
      toast('Sketchfab : ' + e.message, true);
    }
  });
  pubBtn.style.marginTop = '6px';
  secS.appendChild(pubBtn);
  const sNote = document.createElement('p');
  sNote.className = 'empty-hint';
  sNote.style.marginTop = '6px';
  sNote.textContent =
    'Necessite un token utilisateur (jamais stocke). Requiert un acces reseau a api.sketchfab.com : bloque dans un bac a sable a CSP stricte.';
  secS.appendChild(sNote);
  body.appendChild(secS);

  // --- 5) Partage (lien) ---
  const secP = section('Partager un lien');
  const linkInput = document.createElement('input');
  linkInput.type = 'text';
  linkInput.className = 'text-input';
  linkInput.placeholder = 'Lien a partager (modele Sketchfab, capture hebergee…)';
  linkInput.value = lastShareLink;
  linkInput.style.width = '100%';
  linkInput.addEventListener('input', () => (lastShareLink = linkInput.value.trim()));
  secP.appendChild(linkInput);
  const pRow = document.createElement('div');
  pRow.className = 'row-btns';
  pRow.style.marginTop = '6px';
  pRow.appendChild(btn('E-mail', () =>
    partagerEmail({ sujet: `Ma chevaliere : ${design.meta.nom}`, corps: 'Voici ma chevaliere heraldique :', lien: lastShareLink })
  ));
  pRow.appendChild(btn('WhatsApp', () =>
    partagerWhatsApp({ texte: `Ma chevaliere heraldique « ${design.meta.nom} » :`, lien: lastShareLink })
  ));
  secP.appendChild(pRow);
  const pNote = document.createElement('p');
  pNote.className = 'empty-hint';
  pNote.style.marginTop = '6px';
  pNote.textContent =
    'E-mail (mailto) et WhatsApp partagent un LIEN, pas le fichier 3D binaire (impossible par ces mecanismes).';
  secP.appendChild(pNote);
  body.appendChild(secP);

  panel.appendChild(body);
}

/* ===================== BIBLIOTHEQUE GENEALOGIQUE ===================== */

/**
 * Ouvre l'overlay de la bibliotheque : recherche par nom de famille + apercus
 * (rendus par le MEME moteur) + chargement dans le configurateur.
 * @param {import('../core/store.js').Store} store
 */
function openLibrary(store) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay-modal';
  const dialog = document.createElement('div');
  dialog.className = 'modal';
  overlay.appendChild(dialog);

  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = '<h2>Bibliotheque genealogique</h2>';
  const closeBtn = btn('Fermer', () => overlay.remove());
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  const searchRow = document.createElement('div');
  searchRow.className = 'modal-search';
  const search = document.createElement('input');
  search.type = 'text';
  search.placeholder = 'Rechercher un nom de famille (ex. Tour, France, Croix…)';
  search.className = 'text-input';
  const info = document.createElement('span');
  info.className = 'empty-hint';
  info.textContent = `${GENEALOGY.length} blasons — chaque entree est un document design re-editable.`;
  searchRow.append(search, info);
  dialog.appendChild(searchRow);

  const grid = document.createElement('div');
  grid.className = 'modal-grid';
  dialog.appendChild(grid);

  const renderCards = (query) => {
    grid.replaceChildren();
    const results = searchGenealogy(query);
    if (!results.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-hint';
      empty.textContent = 'Aucun blason ne correspond a cette recherche.';
      grid.appendChild(empty);
      return;
    }
    for (const entry of results) {
      const design = entry.build();
      const card = document.createElement('div');
      card.className = 'gene-card';
      const preview = createShieldSvg();
      preview.classList.add('gene-preview');
      renderShield(preview, design, {});
      card.appendChild(preview);
      const name = document.createElement('div');
      name.className = 'gene-name';
      name.textContent = entry.famille;
      card.appendChild(name);
      const blason = document.createElement('div');
      blason.className = 'gene-blason';
      blason.textContent = design._blason || '';
      card.appendChild(blason);
      const load = btn('Charger', () => {
        store.replaceState(design);
        overlay.remove();
        toast(`Blason « ${entry.famille} » charge — entierement re-editable.`);
      });
      load.classList.add('primary');
      card.appendChild(load);
      grid.appendChild(card);
    }
  };
  renderCards('');
  search.addEventListener('input', () => renderCards(search.value));

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  search.focus();
}

/* ===================== Fabriques ===================== */

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
  input.min = min; input.max = max; input.step = step; input.value = value;
  input.addEventListener('input', () => {
    val.textContent = Number(input.value).toFixed(step < 1 ? 2 : 0);
    onInput(parseFloat(input.value));
  });
  f.append(lab, input);
  return f;
}

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

/** Vignette d'une partition (contour d'ecu + lignes de division). */
function partitionThumbSvg(partitionId, forme) {
  const sh = SHIELDS[forme] || SHIELDS['francais-moderne'];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${SHIELD_VIEWBOX.width} ${SHIELD_VIEWBOX.height}`);
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', sh.path);
  p.setAttribute('fill', '#e7edf6');
  p.setAttribute('stroke', '#2456a4');
  p.setAttribute('stroke-width', '4');
  svg.appendChild(p);
  const { lines } = getRegions(partitionId);
  for (const seg of lines || []) {
    const l = document.createElementNS(SVG_NS, 'line');
    l.setAttribute('x1', seg[0][0]); l.setAttribute('y1', seg[0][1]);
    l.setAttribute('x2', seg[1][0]); l.setAttribute('y2', seg[1][1]);
    l.setAttribute('stroke', '#2456a4'); l.setAttribute('stroke-width', '4');
    svg.appendChild(l);
  }
  return svg;
}

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

export function toast(message, isError = false) {
  const host = document.getElementById('toast-host');
  if (!host) return;
  const t = document.createElement('div');
  t.className = 'toast' + (isError ? ' error' : '');
  t.textContent = message;
  host.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ===================== Helpers d'etat ===================== */

/** Change la partition et ajuste le nombre de quartiers (en preservant les donnees). */
function setPartition(store, partitionId) {
  store.commit((d) => {
    d.ecu.partition = partitionId;
    const target = partitionCount(partitionId);
    const quartiers = d.ecu.quartiers;
    while (quartiers.length < target) quartiers.push(createQuartier(alternateTincture(quartiers.length)));
    if (quartiers.length > target) quartiers.length = target; // on tronque (donnees des quartiers en trop retirees)
  }, 'partition');
}

/** Alterne les teintures par defaut des nouveaux quartiers (contraste). */
function alternateTincture(index) {
  const pairs = ['azur', 'or', 'gueules', 'argent', 'sinople', 'or', 'gueules', 'argent'];
  return pairs[index % pairs.length];
}

/** Retrouve un meuble (objet mutable) a travers tous les quartiers. */
function findAny(design, id) {
  for (const q of getQuartiers(design)) {
    const m = (q.meubles || []).find((x) => x.id === id);
    if (m) return m;
  }
  return null;
}

/** Change le z d'un meuble (devant/derriere) dans son quartier. */
function bumpZ(design, id, dir) {
  for (const q of getQuartiers(design)) {
    const m = (q.meubles || []).find((x) => x.id === id);
    if (!m) continue;
    const zs = q.meubles.map((x) => x.z || 0);
    m.z = dir > 0 ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
    return;
  }
}

/** Convertit une couleur (nom hex deja) en #rrggbb pour input[type=color]. */
function toHex(c) {
  if (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) return c;
  return '#f4f6f7';
}
