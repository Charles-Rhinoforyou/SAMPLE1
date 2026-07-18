/**
 * share.js — Partage par e-mail et WhatsApp (partage d'un LIEN, pas d'un binaire).
 *
 * FAISABILITE :
 *   - E-mail : `mailto:` ne peut PAS attacher un binaire 3D. On pre-remplit donc
 *     un e-mail contenant un LIEN (vers le modele Sketchfab publie ou une capture
 *     hebergee). Pour un envoi avec piece jointe, un back-end/service serait requis.
 *   - WhatsApp : `https://wa.me/?text=...` partage un texte + LIEN. Le partage
 *     direct d'un fichier binaire n'est pas possible par ce mecanisme.
 */

/**
 * Ouvre un e-mail pre-rempli contenant un lien.
 * @param {object} opts
 * @param {string} opts.sujet
 * @param {string} opts.corps
 * @param {string} [opts.lien]
 */
export function partagerEmail({ sujet, corps, lien }) {
  const body = lien ? `${corps}\n\n${lien}` : corps;
  const href = `mailto:?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}

/**
 * Ouvre WhatsApp avec un texte + lien pre-remplis.
 * @param {object} opts
 * @param {string} opts.texte
 * @param {string} [opts.lien]
 */
export function partagerWhatsApp({ texte, lien }) {
  const message = lien ? `${texte} ${lien}` : texte;
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
}

/**
 * Tente le partage natif (Web Share API) si disponible — permet, sur mobile,
 * de partager la capture PNG en fichier. Repli silencieux sinon.
 * @param {object} opts
 * @param {string} opts.titre
 * @param {string} opts.texte
 * @param {Blob} [opts.fichier] image a partager (si supporte)
 * @returns {Promise<boolean>} true si le partage natif a ete lance
 */
export async function partageNatif({ titre, texte, fichier }) {
  if (!navigator.share) return false;
  try {
    if (fichier && navigator.canShare?.({ files: [new File([fichier], 'chevaliere.png', { type: 'image/png' })] })) {
      await navigator.share({ title: titre, text: texte, files: [new File([fichier], 'chevaliere.png', { type: 'image/png' })] });
    } else {
      await navigator.share({ title: titre, text: texte });
    }
    return true;
  } catch {
    return false;
  }
}
