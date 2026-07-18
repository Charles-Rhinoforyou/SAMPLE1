import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Configuration Vite.
// `base: './'` permet d'ouvrir le build depuis un simple fichier ou un sous-chemin.
// `viteSingleFile` inline tout le CSS/JS dans un seul index.html : pratique pour un
// deploiement statique 100% hors-ligne, sans serveur ni requete reseau.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  server: {
    open: false,
    port: 5173
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 100000000,
    cssCodeSplit: false
  }
});
