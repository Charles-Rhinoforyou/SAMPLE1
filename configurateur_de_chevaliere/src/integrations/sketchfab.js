/**
 * sketchfab.js — Publication d'un modele GLB sur Sketchfab (optionnel, reseau).
 *
 * FAISABILITE : l'API Sketchfab expose un endpoint d'upload de modele qui
 * necessite un TOKEN API utilisateur (jamais code en dur). L'appel se fait ici
 * cote client ; selon la politique CORS de Sketchfab et l'environnement, un proxy
 * back-end peut etre requis. La fonction remonte une erreur claire en cas d'echec
 * (token invalide, reseau bloque, CORS...).
 *
 * IMPORTANT : dans un bac a sable a CSP stricte (ex. artifact), les requetes
 * reseau sortantes sont bloquees : cette fonction ne marchera que depuis un
 * deploiement autorisant l'acces a api.sketchfab.com.
 */

const SKETCHFAB_UPLOAD = 'https://api.sketchfab.com/v3/models';

/**
 * Televerse un GLB sur Sketchfab.
 * @param {object} opts
 * @param {string} opts.token token API utilisateur Sketchfab
 * @param {Blob} opts.glb modele GLB
 * @param {string} [opts.name]
 * @param {string} [opts.description]
 * @param {boolean} [opts.isPublished]
 * @returns {Promise<{uid:string, url:string}>}
 */
export async function uploadToSketchfab({ token, glb, name = 'Chevaliere', description = '', isPublished = false }) {
  if (!token) throw new Error('Token Sketchfab requis.');
  const form = new FormData();
  form.append('modelFile', glb, 'chevaliere.glb');
  form.append('name', name);
  form.append('description', description);
  form.append('isPublished', isPublished ? 'true' : 'false');
  form.append('tags', 'chevaliere heraldique signet-ring');

  const res = await fetch(SKETCHFAB_UPLOAD, {
    method: 'POST',
    headers: { Authorization: `Token ${token}` },
    body: form
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      /* ignore */
    }
    throw new Error(`Upload Sketchfab echoue (HTTP ${res.status}). ${detail}`);
  }
  const data = await res.json();
  const uid = data.uid || data.uri?.split('/').pop();
  return { uid, url: `https://sketchfab.com/models/${uid}` };
}
