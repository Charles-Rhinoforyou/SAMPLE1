import { describe, it, expect } from "vitest";
import { ManualGdcProvider, TrustFullyGdcProvider } from "./provider.js";

describe("ManualGdcProvider", () => {
  it("ne vérifie jamais automatiquement et exige une revue manuelle", async () => {
    const p = new ManualGdcProvider();
    const r = await p.check({ gdcProfile: "profil", proofUrl: "https://x/p.png" });
    expect(r.verified).toBe(false);
    expect(r.requiresManualReview).toBe(true);
    expect(r.provider).toBe("manual");
  });

  it("signale l'absence de preuve", async () => {
    const p = new ManualGdcProvider();
    const r = await p.check({ gdcProfile: "profil" });
    expect(r.message).toMatch(/preuve/i);
  });
});

describe("TrustFullyGdcProvider", () => {
  it("retombe sur la revue manuelle sans clé API", async () => {
    const p = new TrustFullyGdcProvider("https://api.trustfully.com/v1/", "");
    const r = await p.check({ gdcProfile: "profil" });
    expect(r.verified).toBe(false);
    expect(r.requiresManualReview).toBe(true);
  });

  it("lève tant que le contrat d'API partenaire n'est pas confirmé", async () => {
    const p = new TrustFullyGdcProvider("https://api.trustfully.com/v1/", "key123");
    await expect(p.check({ gdcProfile: "profil" })).rejects.toThrow();
  });
});
