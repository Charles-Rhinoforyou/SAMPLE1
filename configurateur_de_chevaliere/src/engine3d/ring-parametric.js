/**
 * ring-parametric.js — Geometrie parametrique de la chevaliere (metal).
 *
 * Repere (unites = millimetres) :
 *   - up = +Y ; l'axe du doigt (trou de l'anneau) = Z ;
 *   - l'anneau (tore aplati) est dans le plan XY ;
 *   - le plateau (chaton) est pose sur le dessus (+Y), sa face superieure est
 *     horizontale (plan XZ) : c'est la que le blason est applique.
 *
 * Le TOUR DE DOIGT (diametre interieur mm) pilote reellement le diametre de
 * l'anneau. Toutes les dimensions du panneau 3D agissent en direct.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

/**
 * Construit la chevaliere metallique (anneau + plateau) et renvoie le groupe
 * ainsi que les infos de placement du blason.
 * @param {object} cfg
 * @param {object} cfg.ring3d parametres 3D (voir design-document.defaultRing3d)
 * @param {THREE.Material} cfg.material materiau metallique
 * @param {string} cfg.shieldPath tracé SVG de l'ecu (pour le plateau 'ecu')
 * @returns {{group:THREE.Group, bezelTopY:number, footprint:{w:number,h:number}}}
 */
export function buildRing({ ring3d, material, shieldPath }) {
  const r = ring3d;
  const group = new THREE.Group();

  // --- Anneau a epaules de chevaliere ---
  const innerR = r.tourDoigtMm / 2;
  const tube = Math.max(0.6, r.anneauEpaisseur / 2);
  const centerR = innerR + tube;
  const axialRatio = Math.max(0.4, r.anneauLargeur / r.anneauEpaisseur);
  const bandGeo = new THREE.TorusGeometry(centerR, tube, 28, 160);
  // 1) largeur de bande (aplatissement axial Z) baké dans la geometrie.
  bandGeo.scale(1, 1, axialRatio);
  // 2) epaules : evasement progressif vers le haut, alésage (doigt) conserve.
  shapeSignetShoulders(bandGeo, innerR, r.epaulement ?? 1.0, r.anneauLargeur);
  bandGeo.computeVertexNormals();
  const torus = new THREE.Mesh(bandGeo, material);
  group.add(torus);

  const torusTopY = centerR + tube + (r.epaulement ?? 1.0) * tube * 1.6;

  // --- Plateau (chaton) ---
  const ep = r.plateauEpaisseur;
  const bezelBottomY = torusTopY - Math.min(r.conge, tube * 1.5); // léger recouvrement
  const bezelCenterY = bezelBottomY + ep / 2;
  const bezelTopY = bezelBottomY + ep;

  const bezel = new THREE.Mesh(buildBezelGeometry(r, shieldPath), material);
  bezel.position.y = bezelCenterY;
  group.add(bezel);

  // --- Congé (transition anneau -> plateau) : un tronc de cone lisse ---
  if (r.conge > 0.1) {
    const congeGeo = new THREE.CylinderGeometry(
      Math.min(r.plateauLargeur, r.plateauHauteur) * 0.32,
      tube * 1.6,
      Math.max(0.5, r.conge * 1.4),
      32
    );
    const conge = new THREE.Mesh(congeGeo, material);
    conge.position.y = bezelBottomY - r.conge * 0.4;
    group.add(conge);
  }

  return { group, bezelTopY, footprint: { w: r.plateauLargeur, h: r.plateauHauteur } };
}

/**
 * Deforme un tore en profil de chevaliere : les epaules s'evasent vers le haut
 * (jonction avec le plateau) tandis que le bas reste un jonc fin. L'alesage
 * (trou du doigt) reste circulaire : on n'ecarte QUE la matiere exterieure.
 * @param {THREE.BufferGeometry} geo
 * @param {number} innerR rayon interieur (alesage)
 * @param {number} shoulder amplitude d'evasement (mm ~)
 * @param {number} bandWidth largeur de bande (mm)
 */
function shapeSignetShoulders(geo, innerR, shoulder, bandWidth) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const rad = Math.hypot(v.x, v.y); // distance a l'axe du doigt
    if (rad < 1e-4) continue;
    const theta = Math.atan2(v.y, v.x); // angle : +PI/2 = haut
    // Profil vertical t : 0 en bas, 1 en haut (lisse).
    const t = (Math.sin(theta) + 1) / 2;
    const up = t * t * (3 - 2 * t); // smoothstep
    // Evasement radial : on eloigne la matiere exterieure a l'alesage, davantage
    // vers le haut. L'alesage (rad = innerR) reste fixe.
    const grow = 1 + shoulder * 1.35 * up;
    const newRad = innerR + (rad - innerR) * grow;
    const k = newRad / rad;
    v.x *= k;
    v.y *= k;
    // Elargissement axial des epaules (uniquement la matiere exterieure).
    const outer = Math.min(1, Math.max(0, (rad - innerR) / (bandWidth * 0.6)));
    const zWiden = 1 + shoulder * 0.5 * up * outer;
    v.z *= zWiden;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
}

/**
 * Construit la geometrie du plateau selon sa forme, epaisseur le long de Y.
 * @param {object} r ring3d
 * @param {string} shieldPath
 * @returns {THREE.BufferGeometry}
 */
function buildBezelGeometry(r, shieldPath) {
  const w = r.plateauLargeur;
  const h = r.plateauHauteur;
  const ep = r.plateauEpaisseur;

  switch (r.plateauForme) {
    case 'rond': {
      const g = new THREE.CylinderGeometry(w / 2, w / 2, ep, 64);
      return g;
    }
    case 'ovale': {
      const g = new THREE.CylinderGeometry(w / 2, w / 2, ep, 64);
      g.scale(1, 1, h / w); // ellipse (Z = longueur)
      return g;
    }
    case 'octogone': {
      const g = new THREE.CylinderGeometry(w / 2, w / 2, ep, 8);
      g.rotateY(Math.PI / 8);
      g.scale(1, 1, h / w);
      return g;
    }
    case 'rectangle': {
      return new THREE.BoxGeometry(w, ep, h);
    }
    case 'coussin': {
      return new RoundedBoxGeometry(w, ep, h, 5, Math.min(w, h) * 0.22);
    }
    case 'ecu':
    default: {
      // Extrusion du contour d'ecu (tracé SVG 200x240) mis a l'echelle du plateau.
      const g = extrudeShieldGeometry(shieldPath, w, h, ep);
      return g;
    }
  }
}

/**
 * Extrude le contour d'ecu en un volume de plateau, epaisseur le long de Y,
 * face superieure vers +Y, centre a l'origine.
 * @param {string} shieldPath
 * @param {number} w largeur cible (mm)
 * @param {number} h hauteur cible (mm)
 * @param {number} ep epaisseur (mm)
 * @returns {THREE.BufferGeometry}
 */
export function extrudeShieldGeometry(shieldPath, w, h, ep) {
  const shape = shapeFromPath(shieldPath);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: ep, bevelEnabled: false });
  // Le tracé est en 0..200 x 0..240 (Y vers le bas), extrudé le long de +Z.
  // 1) centrer/normaliser en X,Y ; 2) mettre a l'echelle ; 3) coucher (Z -> Y).
  geo.translate(-100, -120, 0);
  geo.scale(w / 200, -h / 240, 1); // -Y : remet l'ecu a l'endroit (Y SVG inverse)
  geo.rotateX(-Math.PI / 2); // couche le plateau : ancien Z (epaisseur) -> Y
  geo.translate(0, -ep / 2 + ep / 2, 0);
  geo.center();
  // Re-centrer verticalement autour de 0 (epaisseur sur Y).
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  geo.translate(0, -(bb.max.y + bb.min.y) / 2, 0);
  return geo;
}

/**
 * Convertit un tracé SVG (attribut d) en THREE.Shape (avec trous).
 * @param {string} pathData
 * @returns {THREE.Shape}
 */
export function shapeFromPath(pathData) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${pathData}"/></svg>`;
  const data = new SVGLoader().parse(svg);
  const shapes = [];
  for (const p of data.paths) {
    SVGLoader.createShapes(p).forEach((s) => shapes.push(s));
  }
  // On renvoie le premier contour (l'ecu est un contour simple).
  return shapes[0];
}
