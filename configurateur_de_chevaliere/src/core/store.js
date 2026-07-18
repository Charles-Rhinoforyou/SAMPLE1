/**
 * store.js — Etat applicatif central (pub/sub) + historique undo/redo.
 *
 * Principe :
 *  - L'etat complet est UN seul objet "document design" serialisable en JSON.
 *  - Toute modification passe par `commit()` (mutation validee + snapshot d'historique)
 *    ou `update()` (mutation transitoire sans snapshot, ex. drag en cours).
 *  - Les abonnes (`subscribe`) sont notifies a chaque changement.
 *
 * Ce store est volontairement minimal et sans dependance : il doit rester
 * decouple des moteurs 2D/3D et de l'UI.
 */

import { createEmptyDesign, cloneDesign } from './design-document.js';

const HISTORY_LIMIT = 100; // profondeur maximale de l'historique undo/redo

export class Store {
  constructor(initialDesign) {
    /** @type {object} document design courant */
    this._state = initialDesign || createEmptyDesign();
    /** @type {Set<Function>} abonnes */
    this._subscribers = new Set();
    /** @type {object[]} pile d'annulation (snapshots passes) */
    this._undoStack = [];
    /** @type {object[]} pile de retablissement */
    this._redoStack = [];
  }

  /** Retourne l'etat courant (lecture seule cote appelant, ne pas muter directement). */
  getState() {
    return this._state;
  }

  /**
   * Abonne une fonction aux changements d'etat.
   * @param {(state:object)=>void} fn
   * @returns {()=>void} fonction de desabonnement
   */
  subscribe(fn) {
    this._subscribers.add(fn);
    // Notification immediate pour un rendu initial.
    fn(this._state);
    return () => this._subscribers.delete(fn);
  }

  _notify() {
    for (const fn of this._subscribers) fn(this._state);
  }

  /**
   * Applique une mutation SANS creer d'entree d'historique.
   * A utiliser pour les etats transitoires (ex. deplacement en cours d'un meuble).
   * @param {(draft:object)=>void} mutator
   */
  update(mutator) {
    mutator(this._state);
    this._notify();
  }

  /**
   * Applique une mutation ET cree une entree d'historique (point d'annulation).
   * @param {(draft:object)=>void} mutator
   * @param {string} [label] libelle facultatif de l'action (debug/UI)
   */
  commit(mutator, label = '') {
    // On sauvegarde l'etat AVANT mutation pour pouvoir l'annuler.
    this._pushHistory();
    this._state._lastAction = label;
    mutator(this._state);
    this._notify();
  }

  _pushHistory() {
    this.recordHistory(this._state);
  }

  /**
   * Empile un instantane donne comme point d'annulation, puis vide la pile de
   * retablissement. Utile pour les interactions transitoires (ex. glisser d'un
   * meuble) : on capture l'etat AVANT le geste, on modifie via `update()` sans
   * historique, puis on enregistre ce point une seule fois a la fin du geste.
   * @param {object} snapshot document design a memoriser
   */
  recordHistory(snapshot) {
    this._undoStack.push(cloneDesign(snapshot));
    if (this._undoStack.length > HISTORY_LIMIT) this._undoStack.shift();
    // Toute nouvelle action invalide la pile de retablissement.
    this._redoStack.length = 0;
  }

  canUndo() {
    return this._undoStack.length > 0;
  }

  canRedo() {
    return this._redoStack.length > 0;
  }

  undo() {
    if (!this.canUndo()) return;
    this._redoStack.push(cloneDesign(this._state));
    this._state = this._undoStack.pop();
    this._notify();
  }

  redo() {
    if (!this.canRedo()) return;
    this._undoStack.push(cloneDesign(this._state));
    this._state = this._redoStack.pop();
    this._notify();
  }

  /**
   * Remplace integralement l'etat (ex. chargement d'un document JSON importe).
   * Cree un point d'historique pour pouvoir revenir a l'etat precedent.
   * @param {object} newDesign
   */
  replaceState(newDesign) {
    this._pushHistory();
    this._state = cloneDesign(newDesign);
    this._notify();
  }
}
