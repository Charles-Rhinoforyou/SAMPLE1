/**
 * Calcul du montant d'une tâche et de la commission plateforme.
 * Logique PURE — testée unitairement, réutilisée par l'API et le client.
 */

export const DEFAULT_COMMISSION_RATE = 0.15;

export interface DurationInput {
  heureDebut: Date | string;
  heureFin: Date | string;
}

/** Durée d'une tâche en heures (décimales). Lève si l'intervalle est invalide. */
export function computeDurationHours(input: DurationInput): number {
  const start = new Date(input.heureDebut).getTime();
  const end = new Date(input.heureFin).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new Error("Heures de début/fin invalides.");
  }
  if (end <= start) {
    throw new Error("L'heure de fin doit être postérieure à l'heure de début.");
  }
  return (end - start) / (1000 * 60 * 60);
}

/** Arrondi monétaire à 2 décimales, stable pour les demi-centimes. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface AmountInput extends DurationInput {
  tauxHoraire: number;
}

/** Montant total facturé au demandeur = durée (h) × taux horaire. */
export function computeTaskAmount(input: AmountInput): number {
  if (input.tauxHoraire <= 0) {
    throw new Error("Le taux horaire doit être strictement positif.");
  }
  const hours = computeDurationHours(input);
  return roundMoney(hours * input.tauxHoraire);
}

export interface PaymentBreakdown {
  montantTotal: number;
  commission: number;
  reversementTravailleur: number;
}

/**
 * Répartition d'un paiement : commission plateforme + reversement travailleur.
 * @param commissionRate ex. 0.15 pour 15 %.
 */
export function computePaymentBreakdown(
  montantTotal: number,
  commissionRate: number = DEFAULT_COMMISSION_RATE
): PaymentBreakdown {
  if (montantTotal < 0) {
    throw new Error("Le montant total ne peut pas être négatif.");
  }
  if (commissionRate < 0 || commissionRate >= 1) {
    throw new Error("Le taux de commission doit être dans [0, 1[.");
  }
  const commission = roundMoney(montantTotal * commissionRate);
  return {
    montantTotal: roundMoney(montantTotal),
    commission,
    reversementTravailleur: roundMoney(montantTotal - commission),
  };
}
