import { config } from "../../config.js";
import {
  MockPaymentProvider,
  StripePaymentProvider,
  type PaymentProvider,
} from "./provider.js";

let cached: PaymentProvider | null = null;

/** Fournit le provider de paiement (Stripe si clé présente, sinon mock). */
export async function getPaymentProvider(): Promise<PaymentProvider> {
  if (cached) return cached;
  if (config.stripe.secretKey) {
    cached = await StripePaymentProvider.create(
      config.stripe.secretKey,
      config.stripe.currency
    );
  } else {
    cached = new MockPaymentProvider();
  }
  return cached;
}

export * from "./provider.js";
