import type { FastifyInstance } from "fastify";
import { PaymentStatus } from "@laundry/shared";
import { config } from "../../config.js";
import { prisma } from "../../prisma.js";

/**
 * Webhook Stripe, encapsulé : parser raw body limité à ce contexte
 * (la vérification de signature exige le corps brut).
 * En l'absence de clé/secret (mode mock), la route répond 200 sans traitement.
 */
export async function webhookRoutes(app: FastifyInstance) {
  await app.register(async (scoped) => {
    scoped.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_req, body, done) => done(null, body)
    );

    scoped.post("/payments/webhook", async (req, reply) => {
      if (!config.stripe.secretKey || !config.stripe.webhookSecret) {
        // Mode mock : rien à vérifier.
        return reply.send({ received: true, mode: "mock" });
      }

      const sig = req.headers["stripe-signature"];
      let event: { type: string; data: { object: { id: string } } };
      try {
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(config.stripe.secretKey);
        event = stripe.webhooks.constructEvent(
          req.body as Buffer,
          sig as string,
          config.stripe.webhookSecret
        ) as typeof event;
      } catch (err) {
        return reply
          .code(400)
          .send({ error: `Signature invalide : ${(err as Error).message}` });
      }

      const intentId = event.data.object.id;
      const map: Record<string, PaymentStatus | undefined> = {
        "payment_intent.amount_capturable_updated": PaymentStatus.AUTHORIZED,
        "payment_intent.succeeded": PaymentStatus.CAPTURED,
        "payment_intent.payment_failed": PaymentStatus.FAILED,
        "charge.refunded": PaymentStatus.REFUNDED,
      };
      const newStatus = map[event.type];
      if (newStatus) {
        await prisma.payment.updateMany({
          where: { stripeRef: intentId },
          data: { statut: newStatus },
        });
      }

      return reply.send({ received: true });
    });
  });
}
