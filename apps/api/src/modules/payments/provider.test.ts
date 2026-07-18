import { describe, it, expect } from "vitest";
import { MockPaymentProvider } from "./provider.js";

describe("MockPaymentProvider", () => {
  const p = new MockPaymentProvider();

  it("crée un compte Connect simulé", async () => {
    const a = await p.createConnectAccount("x@y.fr");
    expect(a.accountId).toMatch(/^acct_mock_/);
  });

  it("crée un PaymentIntent en capture différée (requires_capture)", async () => {
    const r = await p.createPaymentIntent({
      amountCents: 4500,
      currency: "eur",
      applicationFeeCents: 675,
      destinationAccountId: "acct_mock_1",
    });
    expect(r.id).toMatch(/^pi_mock_/);
    expect(r.status).toBe("requires_capture");
    expect(r.clientSecret).toContain("secret");
  });

  it("capture le PaymentIntent -> succeeded", async () => {
    const r = await p.capturePaymentIntent("pi_mock_1");
    expect(r.status).toBe("succeeded");
  });

  it("rembourse", async () => {
    const r = await p.refund("pi_mock_1");
    expect(r.status).toBe("refunded");
  });
});
