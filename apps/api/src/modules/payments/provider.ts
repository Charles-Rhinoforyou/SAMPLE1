/**
 * Abstraction du prestataire de paiement (marketplace).
 * Modèle validé : destination charge + capture différée.
 *  - à la sélection : PaymentIntent en capture MANUELLE (séquestre l'autorisation),
 *    avec transfer_data.destination = compte du travailleur et
 *    application_fee_amount = commission plateforme ;
 *  - à la fin (TERMINEE) : capture -> le travailleur reçoit son dû, la plateforme
 *    conserve la commission.
 *
 * Deux implémentations derrière la même interface :
 *  - StripePaymentProvider (réel, activé si STRIPE_SECRET_KEY présent) ;
 *  - MockPaymentProvider (défaut sans clé) : ids simulés, pour le dev/les tests.
 */

export interface ConnectAccount {
  accountId: string;
}
export interface AccountLink {
  url: string;
}
export interface AccountStatus {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}
export interface CreateIntentInput {
  /** Montant total en centimes. */
  amountCents: number;
  currency: string;
  /** Commission plateforme en centimes. */
  applicationFeeCents: number;
  /** Compte Connect du travailleur (destination). */
  destinationAccountId: string;
  metadata?: Record<string, string>;
}
export interface IntentResult {
  id: string;
  clientSecret: string | null;
  status: string;
}

export interface PaymentProvider {
  readonly mode: "stripe" | "mock";
  createConnectAccount(email: string): Promise<ConnectAccount>;
  createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string
  ): Promise<AccountLink>;
  getAccountStatus(accountId: string): Promise<AccountStatus>;
  createPaymentIntent(input: CreateIntentInput): Promise<IntentResult>;
  capturePaymentIntent(id: string): Promise<IntentResult>;
  refund(paymentIntentId: string): Promise<{ status: string }>;
}

/** Implémentation simulée : aucun appel réseau, ids déterministes. */
export class MockPaymentProvider implements PaymentProvider {
  readonly mode = "mock" as const;

  async createConnectAccount(): Promise<ConnectAccount> {
    return { accountId: `acct_mock_${Date.now()}` };
  }
  async createAccountLink(): Promise<AccountLink> {
    return { url: "https://connect.stripe.test/onboarding/mock" };
  }
  async getAccountStatus(): Promise<AccountStatus> {
    // En mock, on considère l'onboarding complété pour dérouler le flux.
    return { chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true };
  }
  async createPaymentIntent(input: CreateIntentInput): Promise<IntentResult> {
    const id = `pi_mock_${Date.now()}`;
    return {
      id,
      clientSecret: `${id}_secret_mock`,
      // capture manuelle -> l'autorisation est "requires_capture" une fois confirmée.
      status: "requires_capture",
    };
  }
  async capturePaymentIntent(id: string): Promise<IntentResult> {
    return { id, clientSecret: null, status: "succeeded" };
  }
  async refund(): Promise<{ status: string }> {
    return { status: "refunded" };
  }
}

/** Implémentation Stripe réelle (chargée dynamiquement pour éviter la dép. dure). */
export class StripePaymentProvider implements PaymentProvider {
  readonly mode = "stripe" as const;
  // Typé large : le SDK est importé dynamiquement.
  private stripe: any;

  private constructor(stripe: any, private currency: string) {
    this.stripe = stripe;
  }

  static async create(
    secretKey: string,
    currency: string
  ): Promise<StripePaymentProvider> {
    const { default: Stripe } = await import("stripe");
    return new StripePaymentProvider(new Stripe(secretKey), currency);
  }

  async createConnectAccount(email: string): Promise<ConnectAccount> {
    const account = await this.stripe.accounts.create({
      type: "express",
      email,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
    });
    return { accountId: account.id };
  }

  async createAccountLink(
    accountId: string,
    refreshUrl: string,
    returnUrl: string
  ): Promise<AccountLink> {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
    return { url: link.url };
  }

  async getAccountStatus(accountId: string): Promise<AccountStatus> {
    const a = await this.stripe.accounts.retrieve(accountId);
    return {
      chargesEnabled: !!a.charges_enabled,
      payoutsEnabled: !!a.payouts_enabled,
      detailsSubmitted: !!a.details_submitted,
    };
  }

  async createPaymentIntent(input: CreateIntentInput): Promise<IntentResult> {
    const pi = await this.stripe.paymentIntents.create({
      amount: input.amountCents,
      currency: input.currency,
      capture_method: "manual", // capture différée (séquestre)
      application_fee_amount: input.applicationFeeCents,
      transfer_data: { destination: input.destinationAccountId },
      metadata: input.metadata,
    });
    return { id: pi.id, clientSecret: pi.client_secret, status: pi.status };
  }

  async capturePaymentIntent(id: string): Promise<IntentResult> {
    const pi = await this.stripe.paymentIntents.capture(id);
    return { id: pi.id, clientSecret: null, status: pi.status };
  }

  async refund(paymentIntentId: string): Promise<{ status: string }> {
    const r = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
    return { status: r.status };
  }
}
