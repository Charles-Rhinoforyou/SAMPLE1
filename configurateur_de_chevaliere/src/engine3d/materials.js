/**
 * materials.js — Materiaux PBR (metaux precieux + finitions) pour la chevaliere.
 *
 * Utilise `MeshStandardMaterial` (metalness/roughness) : rend des reflets
 * metalliques credibles avec un environnement (voir scene.js -> RoomEnvironment).
 *
 * Chaque materiau expose une couleur, une metallicite et une rugosite ; les
 * finitions (poli/satine/brosse) ajustent la rugosite.
 */

import * as THREE from 'three';

/** Definitions des metaux (couleur + parametres PBR de base). */
export const METALS = {
  'or-jaune': { nom: 'Or jaune', color: 0xf1c40f, metalness: 1.0, roughness: 0.18 },
  'or-rose': { nom: 'Or rose', color: 0xe0a487, metalness: 1.0, roughness: 0.2 },
  'or-blanc': { nom: 'Or blanc', color: 0xece9e2, metalness: 1.0, roughness: 0.16 },
  argent: { nom: 'Argent', color: 0xf4f6f7, metalness: 1.0, roughness: 0.14 },
  platine: { nom: 'Platine', color: 0xe5e4e2, metalness: 1.0, roughness: 0.22 },
  laiton: { nom: 'Laiton', color: 0xd4af37, metalness: 1.0, roughness: 0.3 },
  acier: { nom: 'Acier', color: 0xb8bcc2, metalness: 1.0, roughness: 0.28 }
};

export const METAL_ORDER = ['or-jaune', 'or-rose', 'or-blanc', 'argent', 'platine', 'laiton', 'acier'];

/** Finitions : modulent la rugosite. */
export const FINITIONS = {
  poli: { nom: 'Poli', roughnessMul: 0.6 },
  satine: { nom: 'Satine', roughnessMul: 1.4 },
  brosse: { nom: 'Brosse', roughnessMul: 2.2 }
};

export const FINITION_ORDER = ['poli', 'satine', 'brosse'];

/**
 * Cree le materiau metallique de la chevaliere.
 * @param {string} metalId
 * @param {string} [finitionId]
 * @returns {THREE.MeshStandardMaterial}
 */
export function createMetalMaterial(metalId = 'or-jaune', finitionId = 'poli') {
  const m = METALS[metalId] || METALS['or-jaune'];
  const f = FINITIONS[finitionId] || FINITIONS.poli;
  return new THREE.MeshStandardMaterial({
    color: m.color,
    metalness: m.metalness,
    roughness: Math.min(1, m.roughness * f.roughnessMul),
    envMapIntensity: 1.2
  });
}

/**
 * Cree un materiau "email" colore (pour les teintures du blason en relief),
 * facon email champleve : peu metallique, un peu brillant.
 * @param {number|string} color couleur CSS ou hex
 * @param {boolean} [metallic] true pour un meuble metallique (or/argent)
 * @returns {THREE.MeshStandardMaterial}
 */
export function createEnamelMaterial(color, metallic = false) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: metallic ? 1.0 : 0.15,
    roughness: metallic ? 0.2 : 0.45,
    envMapIntensity: metallic ? 1.2 : 0.7
  });
}
