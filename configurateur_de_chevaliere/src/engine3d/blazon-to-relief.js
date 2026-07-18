/**
 * blazon-to-relief.js — Transformation du blason 2D en relief 3D.
 *
 * A partir du document design (champ + meubles + dispositions, via le MEME
 * calcul de placement que la 2D), construit un groupe THREE pose sur la face
 * superieure du plateau :
 *   - une fine plaque de CHAMP (couleur du fond) a la forme du plateau ;
 *   - chaque MEUBLE extrudé (relief), colore selon sa teinture.
 *
 * Style de relief :
 *   - 'bosse'  : relief positif (les meubles sont en saillie) ;
 *   - 'creux'  : intaille (les meubles s'enfoncent, sommet affleurant le champ).
 * `biseau` active des chanfreins sur les meubles.
 *
 * Approximations honnetes : le champ 3D prend la teinture du 1er quartier (pas de
 * partitions multicolores en volume) ; le creux est une intaille visuelle, sans
 * soustraction booleenne.
 */

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { computePlacements, BASE_SYMBOL_SPAN } from '../engine2d/shield-renderer.js';
import { resolveSymbol } from '../data/symbols/index.js';
import { getShield } from '../data/shields.js';
import { getQuartiers } from '../core/design-document.js';
import { TINCTURES } from '../data/tinctures.js';
import { createEnamelMaterial } from './materials.js';

const FIELD_THICK = 0.35; // epaisseur de la plaque de champ (mm, en unites plateau)

/**
 * Construit le relief du blason, pret a etre pose sur le plateau.
 * @param {object} design
 * @param {object} placement { bezelTopY, footprint:{w,h} }
 * @returns {THREE.Group}
 */
export function buildBlazonRelief(design, placement) {
  const r = design.ring3d;
  const { bezelTopY, footprint } = placement;
  const group = new THREE.Group();

  // Plan interne en coordonnees 2D (0..200 x 0..240), mis a l'echelle du plateau.
  const plane = new THREE.Group();
  const sx = footprint.w / 200;
  const sy = footprint.h / 240;
  plane.scale.set(sx, sy, 1);
  plane.position.set(-100 * sx, -120 * sy, 0);
  group.add(plane);

  // --- Plaque de champ (teinture du 1er quartier) ---
  const q0 = getQuartiers(design)[0];
  const fieldShape = fieldShape2D(r.plateauForme, getShield(design.ecu.forme).path);
  const fieldGeo = new THREE.ExtrudeGeometry(fieldShape, { depth: FIELD_THICK, bevelEnabled: false });
  const fieldMesh = new THREE.Mesh(fieldGeo, enamelFor(q0?.champ?.tincture));
  plane.add(fieldMesh);

  // --- Meubles (tous quartiers), places comme en 2D ---
  const placements = computePlacements(design);
  const depth = Math.max(0.15, r.profondeur);
  for (const q of getQuartiers(design)) {
    for (const m of q.meubles || []) {
      const pl = placements.get(m.id);
      if (!pl) continue;
      const sym = resolveSymbol(m.symbolId, design.customSymbols);
      if (!sym) continue;
      const shapes = shapesForSymbol(sym);
      if (!shapes.length) continue;

      const geo = new THREE.ExtrudeGeometry(shapes, {
        depth,
        bevelEnabled: !!r.biseau,
        bevelThickness: r.biseau ? Math.min(0.25, depth * 0.4) : 0,
        bevelSize: r.biseau ? 0.6 : 0,
        bevelSegments: 2
      });
      geo.translate(-50, -50, 0); // centre le symbole (repere 0..100)

      const mesh = new THREE.Mesh(geo, enamelFor(m.tincture));
      // Groupe de placement : reproduit la transformation 2D (translate/rotate/scale).
      const mg = new THREE.Group();
      mg.position.set(pl.x, pl.y, r.relief === 'creux' ? FIELD_THICK - depth : FIELD_THICK);
      mg.rotation.z = -((pl.rotation || 0) * Math.PI) / 180;
      const f = (BASE_SYMBOL_SPAN / 100) * (pl.scale || 1);
      mg.scale.set(f, f, 1); // echelle en plan ; profondeur (z) conservee en mm
      mg.add(mesh);
      plane.add(mg);
    }
  }

  // Couche le blason a plat et le pose sur la face du plateau.
  group.rotation.x = -Math.PI / 2;
  group.position.y = bezelTopY;
  return group;
}

/** Materiau email selon une teinture (metaux -> metallique). */
function enamelFor(tinctureId) {
  const t = TINCTURES[tinctureId] || TINCTURES.or;
  const metallic = t.categorie === 'metal';
  return createEnamelMaterial(t.couleur, metallic);
}

/**
 * Renvoie les THREE.Shape d'un symbole (natif 'path' ou perso 'raw').
 * @param {object} sym resultat de resolveSymbol
 * @returns {THREE.Shape[]}
 */
function shapesForSymbol(sym) {
  if (sym.kind === 'raw') {
    // Symbole importe : on reconstruit un SVG normalise 0..100 a partir du markup.
    const vb = sym.viewBox || '0 0 100 100';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${sym.innerSvg}</svg>`;
    const shapes = shapesFromSvg(svg);
    return rescaleShapesTo100(shapes, vb);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${sym.pathData}" fill-rule="${sym.fillRule || 'nonzero'}"/></svg>`;
  return shapesFromSvg(svg);
}

/** Parse un SVG et renvoie toutes les shapes (trous compris). */
function shapesFromSvg(svgString) {
  const data = new SVGLoader().parse(svgString);
  const shapes = [];
  for (const p of data.paths) {
    const fillRule = p.userData?.style?.fillRule || 'nonzero';
    SVGLoader.createShapes(p, { fillRule }).forEach((s) => shapes.push(s));
  }
  return shapes;
}

/** Remet des shapes d'un viewBox quelconque dans le repere 0..100. */
function rescaleShapesTo100(shapes, viewBox) {
  const [minX, minY, w, h] = viewBox.split(/[\s,]+/).map(Number);
  const s = 100 / Math.max(w || 100, h || 100);
  const m = new THREE.Matrix3().setUvTransform(0, 0, 1, 1, 0, 0, 0);
  // Applique une transformation affine simple sur chaque point.
  for (const shape of shapes) {
    transformShape(shape, (x, y) => [((x - minX) * s), ((y - minY) * s)]);
  }
  return shapes;
}

/** Applique une fonction (x,y)->[x,y] a tous les points d'une shape et ses trous. */
function transformShape(shape, fn) {
  // Reconstruction via points echantillonnes (robuste pour l'extrusion).
  const pts = shape.getPoints(24).map((p) => fn(p.x, p.y));
  const newShape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  newShape.holes = shape.holes.map((h) => {
    const hp = h.getPoints(24).map((p) => fn(p.x, p.y));
    return new THREE.Path(hp.map(([x, y]) => new THREE.Vector2(x, y)));
  });
  // Copie en place.
  shape.curves = newShape.curves;
  shape.holes = newShape.holes;
  return shape;
}

/**
 * Contour 2D du champ selon la forme de plateau (repere 0..200 x 0..240).
 * @param {string} plateauForme
 * @param {string} shieldPath
 * @returns {THREE.Shape}
 */
function fieldShape2D(plateauForme, shieldPath) {
  switch (plateauForme) {
    case 'ecu': {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${shieldPath}"/></svg>`;
      return shapesFromSvg(svg)[0] || rectShape(0, 0, 200, 240);
    }
    case 'rectangle':
      return rectShape(6, 6, 188, 228);
    case 'coussin':
      return roundedRectShape(6, 6, 188, 228, 44);
    case 'octogone':
      return polygonShape(octagonPoints(100, 120, 96, 116));
    case 'rond':
    case 'ovale':
    default:
      return ellipseShape(100, 120, 96, 116);
  }
}

// ---------- Fabriques de shapes 2D ----------

function rectShape(x, y, w, h) {
  const s = new THREE.Shape();
  s.moveTo(x, y);
  s.lineTo(x + w, y);
  s.lineTo(x + w, y + h);
  s.lineTo(x, y + h);
  s.closePath();
  return s;
}

function roundedRectShape(x, y, w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function ellipseShape(cx, cy, rx, ry) {
  const s = new THREE.Shape();
  s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, 0);
  return s;
}

function polygonShape(points) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

function octagonPoints(cx, cy, rx, ry) {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
}
