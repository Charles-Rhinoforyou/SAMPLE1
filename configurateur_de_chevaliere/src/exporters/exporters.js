/**
 * exporters.js — Export 3D multi-formats (cote client).
 *
 * FAISABILITE (respectee, pas de faux boutons) :
 *   - GLB   : natif via GLTFExporter, AVEC materiaux PBR -> format de reference ;
 *   - OBJ   : natif via OBJExporter (geometrie) + MTL simple genere ici
 *             (couleurs diffuses, pas le PBR complet) ;
 *   - STL   : natif via STLExporter (geometrie SEULE, aucun materiau) ;
 *   - 3DM / STEP / FBX / DWG : PAS d'export propre en pur client (WASM lourds ou
 *             libs proprietaires). Deux voies honnetes cote UI : desactivation
 *             avec infobulle, OU micro-service de conversion optionnel
 *             (voir convertViaBackend ci-dessous) auquel on envoie le GLB.
 */

import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

/**
 * Exporte un objet 3D en GLB binaire (avec materiaux PBR).
 * @param {THREE.Object3D} object
 * @returns {Promise<Blob>}
 */
export function exportGLB(object) {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(
      object,
      (result) => resolve(new Blob([result], { type: 'model/gltf-binary' })),
      (err) => reject(err),
      { binary: true }
    );
  });
}

/**
 * Exporte un objet 3D en OBJ (+ MTL simple).
 * @param {THREE.Object3D} object
 * @returns {{obj:Blob, mtl:Blob}}
 */
export function exportOBJ(object) {
  // Nomme les materiaux (pour que l'OBJ reference des noms exploitables par le MTL).
  const materials = collectMaterials(object);
  let obj = new OBJExporter().parse(object);
  // Ajoute la reference au fichier MTL en tete de l'OBJ.
  obj = `mtllib model.mtl\n${obj}`;
  const mtl = buildMTL(materials);
  return {
    obj: new Blob([obj], { type: 'text/plain' }),
    mtl: new Blob([mtl], { type: 'text/plain' })
  };
}

/**
 * Exporte un objet 3D en STL (geometrie seule, sans materiau).
 * @param {THREE.Object3D} object
 * @param {boolean} [binary]
 * @returns {Blob}
 */
export function exportSTL(object, binary = true) {
  const result = new STLExporter().parse(object, { binary });
  if (binary) return new Blob([result], { type: 'model/stl' });
  return new Blob([result], { type: 'text/plain' });
}

/**
 * Convertit un GLB en un autre format via un MICRO-SERVICE de conversion optionnel.
 * Contrat attendu de l'endpoint : POST multipart (champ `file` = GLB, champ
 * `format` = 'fbx'|'dwg'|'step'|'3dm') -> reponse binaire du fichier converti.
 * Utilise uniquement si l'utilisateur a configure une URL d'endpoint.
 * @param {string} endpoint URL du service
 * @param {Blob} glbBlob
 * @param {string} format
 * @returns {Promise<Blob>}
 */
export async function convertViaBackend(endpoint, glbBlob, format) {
  const form = new FormData();
  form.append('file', glbBlob, 'model.glb');
  form.append('format', format);
  const res = await fetch(endpoint, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Conversion ${format} echouee (HTTP ${res.status}).`);
  return await res.blob();
}

// ---------- Utilitaires ----------

/** Collecte les materiaux uniques d'un objet, en leur donnant un nom stable. */
function collectMaterials(object) {
  const map = new Map();
  object.traverse((o) => {
    if (!o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m.name) m.name = 'mat_' + (m.color ? m.color.getHexString() : Math.random().toString(36).slice(2, 6));
      if (!map.has(m.name)) map.set(m.name, m);
    }
  });
  return map;
}

/** Genere un fichier MTL simple (couleur diffuse) a partir des materiaux. */
function buildMTL(materials) {
  let out = '# MTL genere par le configurateur de chevaliere\n';
  for (const [name, m] of materials) {
    const c = m.color || { r: 0.8, g: 0.8, b: 0.8 };
    out += `newmtl ${name}\n`;
    out += `Kd ${c.r.toFixed(4)} ${c.g.toFixed(4)} ${c.b.toFixed(4)}\n`;
    out += `Ks 0.5 0.5 0.5\n`;
    out += `Ns 60\n`;
    out += `illum 2\n\n`;
  }
  return out;
}

/** Declenche le telechargement d'un Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
