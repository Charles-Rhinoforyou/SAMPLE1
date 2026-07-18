/**
 * layout-parametric.js — Moteur de disposition parametrique (coeur de la Phase 2).
 *
 * A partir d'une DISPOSITION, d'un NOMBRE d'elements et de la boite utile d'une
 * region (quartier), calcule des ANCRES { x, y, s } (position + echelle) reparties
 * harmonieusement, sans chevauchement, en occupant l'espace disponible.
 *
 * Dispositions : pal (colonne), fasce (ligne), bande/barre (diagonales),
 * grille N*M, orle (peripherie), cercle/rayonnant, rangs heraldiques (2-1, 3-2-1,
 * 2-1-2...), chef (haut), pointe (bas). La disposition 'libre' renvoie null
 * (les meubles gardent leurs coordonnees x,y editees manuellement).
 *
 * Les ancres servent : au rendu (placement auto) ET a l'aimantation (snapping)
 * lors d'un deplacement manuel.
 */

import { BASE_SYMBOL_SPAN } from './shield-renderer.js';

/**
 * Rangs heraldiques classiques selon le nombre de meubles (planche "position des
 * meubles selon leur nombre"): 3 = 2-1, 5 = 2-1-2 (quinconce), 6 = 3-2-1, etc.
 */
function heraldicRows(n) {
  const table = {
    1: [1],
    2: [2],
    3: [2, 1],
    4: [2, 2],
    5: [2, 1, 2],
    6: [3, 2, 1],
    7: [3, 3, 1],
    8: [3, 2, 3],
    9: [3, 3, 3]
  };
  if (table[n]) return table[n];
  // Repli : pyramidal decroissant.
  const rows = [];
  let remaining = n;
  let width = Math.ceil(Math.sqrt(n)) + 1;
  while (remaining > 0) {
    const c = Math.min(width, remaining);
    rows.push(c);
    remaining -= c;
    width = Math.max(1, width - 1);
  }
  return rows;
}

/**
 * Calcule les ancres pour une disposition donnee.
 * @param {object} cfg
 * @param {string} cfg.disposition
 * @param {number} cfg.count nombre d'elements a placer
 * @param {object} cfg.bounds boite utile { x, y, width, height }
 * @param {object} cfg.layout parametres (marge, espacement, echelle, cols, rows)
 * @returns {Array<{x:number,y:number,s:number}>|null} null si 'libre'
 */
export function computeAnchors({ disposition, count, bounds, layout }) {
  if (!disposition || disposition === 'libre') return null;
  const n = Math.max(0, count | 0);
  if (n === 0) return [];

  const marge = layout?.marge ?? 22;
  const espacement = layout?.espacement ?? 1;
  const echelle = layout?.echelle ?? 1;

  // Zone interieure apres application de la marge (bornee a la region).
  const inner = {
    x: bounds.x + marge * 0.4,
    y: bounds.y + marge * 0.4,
    w: Math.max(10, bounds.width - marge * 0.8),
    h: Math.max(10, bounds.height - marge * 0.8)
  };
  const cx = inner.x + inner.w / 2;
  const cy = inner.y + inner.h / 2;

  switch (disposition) {
    case 'pal':
      return lineAnchors(n, cx, inner.y, cx, inner.y + inner.h, inner.w, echelle, espacement);
    case 'fasce':
      return lineAnchors(n, inner.x, cy, inner.x + inner.w, cy, inner.h, echelle, espacement);
    case 'chef':
      return lineAnchors(n, inner.x, inner.y + inner.h * 0.18, inner.x + inner.w, inner.y + inner.h * 0.18, inner.h * 0.4, echelle, espacement);
    case 'pointe':
      return lineAnchors(n, inner.x, inner.y + inner.h * 0.82, inner.x + inner.w, inner.y + inner.h * 0.82, inner.h * 0.4, echelle, espacement);
    case 'bande':
      return lineAnchors(n, inner.x, inner.y, inner.x + inner.w, inner.y + inner.h, Math.min(inner.w, inner.h), echelle, espacement);
    case 'barre':
      return lineAnchors(n, inner.x + inner.w, inner.y, inner.x, inner.y + inner.h, Math.min(inner.w, inner.h), echelle, espacement);
    case 'grille':
      return gridAnchors(n, inner, layout, echelle);
    case 'cercle':
      return circleAnchors(n, cx, cy, inner, echelle, espacement);
    case 'orle':
      return orleAnchors(n, inner, echelle);
    case 'rangs':
      return rowsAnchors(n, inner, echelle, espacement);
    default:
      return null;
  }
}

/** Ancres alignees sur un segment [ax,ay]->[bx,by]. `cross` = dimension transverse. */
function lineAnchors(n, ax, ay, bx, by, cross, echelle, espacement) {
  const out = [];
  const along = Math.hypot(bx - ax, by - ay);
  // Echelle : chaque element occupe ~ along/n (borne par la dimension transverse).
  const cell = along / Math.max(1, n);
  const s = fitScale(Math.min(cell, cross), echelle, espacement);
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    // Repartition avec petite marge aux extremites si n>1.
    const tt = n === 1 ? 0.5 : 0.5 / n + t * (1 - 1 / n);
    out.push({ x: ax + (bx - ax) * tt, y: ay + (by - ay) * tt, s });
  }
  return out;
}

/** Grille cols*rows centree dans la zone. */
function gridAnchors(n, inner, layout, echelle) {
  let cols = layout?.cols || Math.ceil(Math.sqrt(n));
  let rows = layout?.rows || Math.ceil(n / cols);
  // Ajuster pour contenir n.
  while (cols * rows < n) rows++;
  const cellW = inner.w / cols;
  const cellH = inner.h / rows;
  const s = fitScale(Math.min(cellW, cellH), echelle, 1);
  const out = [];
  let placed = 0;
  for (let r = 0; r < rows && placed < n; r++) {
    // Nombre d'elements sur cette ligne (derniere ligne potentiellement partielle, centree).
    const remaining = n - placed;
    const inRow = Math.min(cols, remaining);
    const rowW = inRow * cellW;
    const startX = inner.x + (inner.w - rowW) / 2 + cellW / 2;
    for (let c = 0; c < inRow; c++) {
      out.push({ x: startX + c * cellW, y: inner.y + cellH * (r + 0.5), s });
      placed++;
    }
  }
  return out;
}

/** Ancres sur un cercle (rayonnant). */
function circleAnchors(n, cx, cy, inner, echelle, espacement) {
  if (n === 1) return [{ x: cx, y: cy, s: fitScale(Math.min(inner.w, inner.h) * 0.9, echelle, espacement) }];
  const R = (Math.min(inner.w, inner.h) / 2) * 0.72;
  // Espacement angulaire -> corde entre voisins ~ 2R sin(pi/n).
  const chord = 2 * R * Math.sin(Math.PI / n);
  const s = fitScale(chord, echelle, espacement);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n; // depart en haut
    out.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), s });
  }
  return out;
}

/** Ancres reparties sur le pourtour interieur (orle). */
function orleAnchors(n, inner, echelle) {
  const pts = [];
  const per = 2 * (inner.w + inner.h);
  const s = fitScale(per / Math.max(6, n) * 0.8, echelle, 1);
  for (let i = 0; i < n; i++) {
    const d = (per * i) / n;
    pts.push(pointOnRectPerimeter(inner, d));
  }
  return pts.map((p) => ({ x: p.x, y: p.y, s }));
}

/** Rangs heraldiques (2-1, 3-2-1...). */
function rowsAnchors(n, inner, echelle, espacement) {
  const rows = heraldicRows(n);
  const rowH = inner.h / rows.length;
  const maxInRow = Math.max(...rows);
  const s = fitScale(Math.min(inner.w / maxInRow, rowH), echelle, espacement);
  const out = [];
  rows.forEach((c, r) => {
    const rowW = (inner.w / maxInRow) * c;
    const startX = inner.x + (inner.w - rowW) / 2 + rowW / (2 * c);
    for (let i = 0; i < c; i++) {
      out.push({ x: startX + (rowW / c) * i, y: inner.y + rowH * (r + 0.5), s });
    }
  });
  return out;
}

/** Point sur le perimetre d'un rectangle a la distance d (sens horaire depuis coin haut-gauche). */
function pointOnRectPerimeter(inner, d) {
  const { x, y, w, h } = inner;
  let dd = d % (2 * (w + h));
  if (dd < w) return { x: x + dd, y };
  dd -= w;
  if (dd < h) return { x: x + w, y: y + dd };
  dd -= h;
  if (dd < w) return { x: x + w - dd, y: y + h };
  dd -= w;
  return { x, y: y + h - dd };
}

/**
 * Convertit une "place disponible" (unites d'ecu) en facteur d'echelle de meuble,
 * sachant qu'un meuble d'echelle 1 occupe BASE_SYMBOL_SPAN unites.
 * @param {number} available
 * @param {number} echelle facteur global du quartier
 * @param {number} espacement >1 = plus d'air (elements plus petits)
 * @returns {number}
 */
function fitScale(available, echelle = 1, espacement = 1) {
  const raw = (available / BASE_SYMBOL_SPAN) * 0.92;
  return clamp((raw / Math.max(0.5, espacement)) * echelle, 0.12, 3);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
