/**
 * main.js — Point d'entree de l'application.
 *
 * Roles :
 *   - instancier le store (avec restauration depuis localStorage) ;
 *   - fournir les operations d'entree/sortie (import/export JSON, import SVG,
 *     reinitialisation) a l'UI ;
 *   - persister automatiquement le document design dans localStorage ;
 *   - monter l'UI.
 *
 * Tout le coeur fonctionnel (2D + persistance locale) est CLIENT-SIDE et
 * fonctionne hors-ligne. Aucune cle/secret n'est requis en Phase 1.
 */

import { Store } from './core/store.js';
import {
  createEmptyDesign,
  serializeDesign,
  deserializeDesign,
  cloneDesign
} from './core/design-document.js';
import { parseCustomSvg } from './engine2d/symbol-loader.js';
import { mountApp, toast } from './ui/app.js';

const STORAGE_KEY = 'chevaliere.design.v1';

// --- Restauration de l'etat depuis localStorage (si present) ---
function loadInitialDesign() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return deserializeDesign(raw);
  } catch (e) {
    console.warn('Restauration impossible, nouveau document.', e);
  }
  return createEmptyDesign();
}

const store = new Store(loadInitialDesign());

// --- Persistance automatique (debouncee) dans localStorage ---
let saveTimer = null;
store.subscribe((state) => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeDesign(state));
    } catch (e) {
      console.warn('Sauvegarde locale impossible.', e);
    }
  }, 300);
});

// --- Operations d'entree/sortie fournies a l'UI ---
const io = {
  /** Exporte le document design courant en fichier .json telecharge. */
  exportJson() {
    const json = serializeDesign(store.getState());
    const nom = (store.getState().meta.nom || 'blason').replace(/[^\w\-]+/g, '_');
    downloadFile(`${nom}.json`, json, 'application/json');
    toast('Document design exporte (.json).');
  },

  /** Importe un document design depuis un fichier .json choisi par l'utilisateur. */
  importJson() {
    pickFile('.json,application/json', async (file) => {
      try {
        const text = await file.text();
        const design = deserializeDesign(text);
        store.replaceState(design);
        toast('Document design charge.');
      } catch (e) {
        toast('Import JSON echoue : ' + e.message, true);
      }
    });
  },

  /** Importe un symbole SVG personnalise et l'ajoute a la bibliotheque du design. */
  importSvgSymbol() {
    pickFile('.svg,image/svg+xml', async (file) => {
      try {
        const text = await file.text();
        const symbol = parseCustomSvg(text, file.name);
        store.commit((d) => d.customSymbols.push(symbol), 'import symbole SVG');
        toast(`Symbole « ${symbol.nom} » ajoute a la palette.`);
      } catch (e) {
        toast('Import SVG echoue : ' + e.message, true);
      }
    });
  },

  /** Reinitialise le document design (nouveau blason vierge). */
  reset() {
    if (!confirm('Creer un nouveau blason ? Le blason courant sera remplace (annulable).')) return;
    store.replaceState(createEmptyDesign());
    toast('Nouveau blason.');
  }
};

// --- Montage de l'UI ---
mountApp(document.getElementById('app'), { store, io });

/* ---------- Utilitaires fichiers ---------- */

/**
 * Declenche le telechargement d'un fichier texte.
 * @param {string} filename
 * @param {string} content
 * @param {string} mime
 */
function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Ouvre un selecteur de fichier et transmet le fichier choisi.
 * @param {string} accept
 * @param {(file:File)=>void} onFile
 */
function pickFile(accept, onFile) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) onFile(file);
  });
  input.click();
}
