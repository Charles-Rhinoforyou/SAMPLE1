import { describe, it, expect } from "vitest";
import {
  computeDurationHours,
  computeTaskAmount,
  computePaymentBreakdown,
  roundMoney,
} from "./pricing.js";

describe("computeDurationHours", () => {
  it("calcule une durée simple en heures", () => {
    expect(
      computeDurationHours({
        heureDebut: "2026-07-18T09:00:00Z",
        heureFin: "2026-07-18T12:00:00Z",
      })
    ).toBe(3);
  });

  it("gère les demi-heures", () => {
    expect(
      computeDurationHours({
        heureDebut: "2026-07-18T09:00:00Z",
        heureFin: "2026-07-18T10:30:00Z",
      })
    ).toBe(1.5);
  });

  it("rejette une fin antérieure ou égale au début", () => {
    expect(() =>
      computeDurationHours({
        heureDebut: "2026-07-18T12:00:00Z",
        heureFin: "2026-07-18T09:00:00Z",
      })
    ).toThrow();
  });

  it("rejette des dates invalides", () => {
    expect(() =>
      computeDurationHours({ heureDebut: "pas-une-date", heureFin: "x" })
    ).toThrow();
  });
});

describe("computeTaskAmount", () => {
  it("montant = durée × taux", () => {
    expect(
      computeTaskAmount({
        heureDebut: "2026-07-18T09:00:00Z",
        heureFin: "2026-07-18T12:00:00Z",
        tauxHoraire: 15,
      })
    ).toBe(45);
  });

  it("arrondit correctement", () => {
    expect(
      computeTaskAmount({
        heureDebut: "2026-07-18T09:00:00Z",
        heureFin: "2026-07-18T10:30:00Z",
        tauxHoraire: 12.33,
      })
    ).toBe(18.5); // 1.5 * 12.33 = 18.495 -> 18.50
  });

  it("rejette un taux nul ou négatif", () => {
    expect(() =>
      computeTaskAmount({
        heureDebut: "2026-07-18T09:00:00Z",
        heureFin: "2026-07-18T12:00:00Z",
        tauxHoraire: 0,
      })
    ).toThrow();
  });
});

describe("computePaymentBreakdown", () => {
  it("répartit avec la commission par défaut (15%)", () => {
    const b = computePaymentBreakdown(100);
    expect(b.commission).toBe(15);
    expect(b.reversementTravailleur).toBe(85);
    expect(b.montantTotal).toBe(100);
  });

  it("accepte un taux personnalisé", () => {
    const b = computePaymentBreakdown(45, 0.2);
    expect(b.commission).toBe(9);
    expect(b.reversementTravailleur).toBe(36);
  });

  it("commission nulle => tout au travailleur", () => {
    const b = computePaymentBreakdown(50, 0);
    expect(b.commission).toBe(0);
    expect(b.reversementTravailleur).toBe(50);
  });

  it("rejette un taux hors [0,1[", () => {
    expect(() => computePaymentBreakdown(100, 1)).toThrow();
    expect(() => computePaymentBreakdown(100, -0.1)).toThrow();
  });
});

describe("roundMoney", () => {
  it("arrondit à 2 décimales", () => {
    expect(roundMoney(18.495)).toBe(18.5);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});
