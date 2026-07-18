/**
 * Machine à états des tâches (annonces).
 * Transitions autorisées + garde d'acteur. Logique PURE — testée unitairement.
 */

import { TaskStatus } from "./enums.js";

export type Actor = "OWNER" | "WORKER" | "SYSTEM";

interface TransitionRule {
  from: TaskStatus;
  to: TaskStatus;
  actors: Actor[];
}

/**
 * OUVERTE ──(owner accepte candidature)──▶ ATTRIBUEE
 * ATTRIBUEE ──(worker démarre)──▶ EN_COURS
 * EN_COURS ──(worker/owner clôt)──▶ TERMINEE
 * TERMINEE ──(paiement capturé)──▶ PAYEE
 * {OUVERTE, ATTRIBUEE, EN_COURS} ──(annulation)──▶ ANNULEE
 */
const TRANSITIONS: TransitionRule[] = [
  { from: TaskStatus.OUVERTE, to: TaskStatus.ATTRIBUEE, actors: ["OWNER"] },
  { from: TaskStatus.ATTRIBUEE, to: TaskStatus.EN_COURS, actors: ["WORKER", "OWNER"] },
  { from: TaskStatus.EN_COURS, to: TaskStatus.TERMINEE, actors: ["WORKER", "OWNER"] },
  { from: TaskStatus.TERMINEE, to: TaskStatus.PAYEE, actors: ["SYSTEM", "OWNER"] },
  { from: TaskStatus.OUVERTE, to: TaskStatus.ANNULEE, actors: ["OWNER"] },
  { from: TaskStatus.ATTRIBUEE, to: TaskStatus.ANNULEE, actors: ["OWNER", "WORKER"] },
  { from: TaskStatus.EN_COURS, to: TaskStatus.ANNULEE, actors: ["OWNER"] },
];

export function canTransition(
  from: TaskStatus,
  to: TaskStatus,
  actor: Actor
): boolean {
  return TRANSITIONS.some(
    (r) => r.from === from && r.to === to && r.actors.includes(actor)
  );
}

/** Transitions possibles depuis un état, pour un acteur donné. */
export function nextStates(from: TaskStatus, actor?: Actor): TaskStatus[] {
  return TRANSITIONS.filter(
    (r) => r.from === from && (!actor || r.actors.includes(actor))
  ).map((r) => r.to);
}

/** Valide une transition ou lève une erreur explicite. */
export function assertTransition(
  from: TaskStatus,
  to: TaskStatus,
  actor: Actor
): void {
  if (!canTransition(from, to, actor)) {
    throw new Error(
      `Transition interdite : ${from} → ${to} par ${actor}.`
    );
  }
}

export function isTerminal(status: TaskStatus): boolean {
  return status === TaskStatus.PAYEE || status === TaskStatus.ANNULEE;
}
