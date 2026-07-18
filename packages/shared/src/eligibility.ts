/**
 * Règles d'éligibilité à l'activation d'un compte.
 * Un compte n'est activable que par PARRAINAGE (5 confirmés) ou GENS_DE_CONFIANCE.
 * Logique PURE — testée unitairement.
 */

import { AccessMethod, VerifStatus } from "./enums.js";

export const REQUIRED_SPONSORSHIPS = 5;

export interface SponsorshipProgress {
  confirmed: number;
  required: number;
  remaining: number;
  complete: boolean;
  /** Libellé prêt pour l'UI, ex. "3/5 parrainages". */
  label: string;
}

/** Progression du parrainage pour le tableau de bord. */
export function sponsorshipProgress(
  confirmedCount: number,
  required: number = REQUIRED_SPONSORSHIPS
): SponsorshipProgress {
  const confirmed = Math.max(0, Math.floor(confirmedCount));
  const remaining = Math.max(0, required - confirmed);
  return {
    confirmed,
    required,
    remaining,
    complete: confirmed >= required,
    label: `${Math.min(confirmed, required)}/${required} parrainages`,
  };
}

export interface EligibilityInput {
  /** Nombre de parrainages CONFIRMÉS reçus. */
  confirmedSponsorships: number;
  /** Statut de la vérification Gens de Confiance (si engagée). */
  gdcVerification?: VerifStatus | null;
  required?: number;
}

export interface EligibilityResult {
  eligible: boolean;
  method: AccessMethod | null;
  reason: string;
}

/**
 * Détermine si un compte peut être activé et par quelle voie.
 * Priorité au parrainage complet ; sinon GdC vérifié ; sinon inéligible.
 */
export function evaluateEligibility(
  input: EligibilityInput
): EligibilityResult {
  const required = input.required ?? REQUIRED_SPONSORSHIPS;
  const progress = sponsorshipProgress(input.confirmedSponsorships, required);

  if (progress.complete) {
    return {
      eligible: true,
      method: AccessMethod.SPONSORSHIP,
      reason: `Parrainage complet (${progress.label}).`,
    };
  }

  if (input.gdcVerification === VerifStatus.VERIFIED) {
    return {
      eligible: true,
      method: AccessMethod.GENS_DE_CONFIANCE,
      reason: "Compte Gens de Confiance vérifié.",
    };
  }

  return {
    eligible: false,
    method: null,
    reason: `Compte en attente : ${progress.label}, et aucune vérification Gens de Confiance validée.`,
  };
}
