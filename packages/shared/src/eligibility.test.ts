import { describe, it, expect } from "vitest";
import {
  sponsorshipProgress,
  evaluateEligibility,
  REQUIRED_SPONSORSHIPS,
} from "./eligibility.js";
import { AccessMethod, VerifStatus } from "./enums.js";

describe("sponsorshipProgress", () => {
  it("affiche la progression 3/5", () => {
    const p = sponsorshipProgress(3);
    expect(p.confirmed).toBe(3);
    expect(p.required).toBe(REQUIRED_SPONSORSHIPS);
    expect(p.remaining).toBe(2);
    expect(p.complete).toBe(false);
    expect(p.label).toBe("3/5 parrainages");
  });

  it("plafonne l'affichage à required", () => {
    const p = sponsorshipProgress(7);
    expect(p.complete).toBe(true);
    expect(p.label).toBe("5/5 parrainages");
    expect(p.remaining).toBe(0);
  });

  it("gère les valeurs négatives", () => {
    const p = sponsorshipProgress(-2);
    expect(p.confirmed).toBe(0);
    expect(p.label).toBe("0/5 parrainages");
  });
});

describe("evaluateEligibility", () => {
  it("éligible via parrainage complet (5/5)", () => {
    const r = evaluateEligibility({ confirmedSponsorships: 5 });
    expect(r.eligible).toBe(true);
    expect(r.method).toBe(AccessMethod.SPONSORSHIP);
  });

  it("éligible via Gens de Confiance vérifié même sans parrainage complet", () => {
    const r = evaluateEligibility({
      confirmedSponsorships: 2,
      gdcVerification: VerifStatus.VERIFIED,
    });
    expect(r.eligible).toBe(true);
    expect(r.method).toBe(AccessMethod.GENS_DE_CONFIANCE);
  });

  it("inéligible si < 5 parrainages et pas de GdC vérifié", () => {
    const r = evaluateEligibility({
      confirmedSponsorships: 4,
      gdcVerification: VerifStatus.PENDING,
    });
    expect(r.eligible).toBe(false);
    expect(r.method).toBeNull();
    expect(r.reason).toContain("4/5");
  });

  it("priorité au parrainage complet sur GdC", () => {
    const r = evaluateEligibility({
      confirmedSponsorships: 5,
      gdcVerification: VerifStatus.VERIFIED,
    });
    expect(r.method).toBe(AccessMethod.SPONSORSHIP);
  });

  it("respecte un seuil personnalisé", () => {
    const r = evaluateEligibility({ confirmedSponsorships: 3, required: 3 });
    expect(r.eligible).toBe(true);
  });
});
