import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  computePaymentBreakdown,
  eurosToCents,
  TaskStatus,
  PaymentStatus,
  NotificationType,
} from "@laundry/shared";
import { config } from "../../config.js";
import { prisma } from "../../prisma.js";
import { getPaymentProvider } from "./index.js";
import { notify } from "../notifications/service.js";

const idParams = z.object({ id: z.string() });
const paymentParams = z.object({ paymentId: z.string() });

export async function paymentRoutes(app: FastifyInstance) {
  const authed = { preHandler: [app.authenticate] };

  // Onboarding Connect Express du travailleur (déclenché dès la 1re candidature).
  app.post("/payments/connect/onboard", authed, async (req, reply) => {
    const provider = await getPaymentProvider();
    const user = await prisma.user.findUnique({
      where: { id: req.authUser!.sub },
    });
    if (!user) return reply.code(404).send({ error: "Utilisateur introuvable." });

    let accountId = user.stripeAccountId;
    if (!accountId) {
      const account = await provider.createConnectAccount(user.email);
      accountId = account.accountId;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeAccountId: accountId },
      });
    }

    const base = config.corsOrigin;
    const link = await provider.createAccountLink(
      accountId,
      `${base}/dashboard`,
      `${base}/dashboard`
    );
    return reply.send({ accountId, url: link.url, mode: provider.mode });
  });

  // Statut du compte Connect courant.
  app.get("/payments/connect/status", authed, async (req, reply) => {
    const provider = await getPaymentProvider();
    const user = await prisma.user.findUnique({
      where: { id: req.authUser!.sub },
    });
    if (!user?.stripeAccountId) {
      return reply.send({ onboarded: false });
    }
    const status = await provider.getAccountStatus(user.stripeAccountId);
    return reply.send({ onboarded: status.detailsSubmitted, ...status });
  });

  // Le demandeur autorise le paiement d'une tâche ATTRIBUEE (capture différée).
  app.post("/tasks/:id/pay", authed, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const provider = await getPaymentProvider();

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return reply.code(404).send({ error: "Annonce introuvable." });
    if (task.ownerId !== req.authUser!.sub) {
      return reply.code(403).send({ error: "Seul le demandeur peut payer." });
    }
    if (task.statut !== TaskStatus.ATTRIBUEE) {
      return reply
        .code(409)
        .send({ error: "La tâche doit être attribuée pour être payée." });
    }
    if (!task.workerId) {
      return reply.code(409).send({ error: "Aucun travailleur assigné." });
    }

    const worker = await prisma.user.findUnique({ where: { id: task.workerId } });
    if (!worker?.stripeAccountId) {
      return reply.code(409).send({
        error: "Le travailleur n'a pas encore configuré son compte de paiement.",
      });
    }

    const breakdown = computePaymentBreakdown(
      Number(task.montantTotal),
      config.business.commissionRate
    );

    const intent = await provider.createPaymentIntent({
      amountCents: eurosToCents(breakdown.montantTotal),
      currency: config.stripe.currency,
      applicationFeeCents: eurosToCents(breakdown.commission),
      destinationAccountId: worker.stripeAccountId,
      metadata: { taskId: id },
    });

    const payment = await prisma.payment.upsert({
      where: { taskId: id },
      create: {
        taskId: id,
        payerId: task.ownerId,
        payeeId: task.workerId,
        montant: breakdown.montantTotal,
        commission: breakdown.commission,
        statut: PaymentStatus.AUTHORIZED,
        stripeRef: intent.id,
      },
      update: {
        statut: PaymentStatus.AUTHORIZED,
        stripeRef: intent.id,
        montant: breakdown.montantTotal,
        commission: breakdown.commission,
      },
    });

    return reply.code(201).send({
      paymentId: payment.id,
      clientSecret: intent.clientSecret,
      breakdown,
      mode: provider.mode,
    });
  });

  // Capture à la fin (tâche TERMINEE) : le travailleur reçoit son dû,
  // la plateforme conserve la commission.
  app.post("/tasks/:id/capture", authed, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const provider = await getPaymentProvider();

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return reply.code(404).send({ error: "Annonce introuvable." });
    if (task.ownerId !== req.authUser!.sub) {
      return reply.code(403).send({ error: "Seul le demandeur peut libérer le paiement." });
    }
    if (task.statut !== TaskStatus.TERMINEE) {
      return reply.code(409).send({ error: "La tâche doit être terminée." });
    }

    const payment = await prisma.payment.findUnique({ where: { taskId: id } });
    if (!payment || payment.statut !== PaymentStatus.AUTHORIZED || !payment.stripeRef) {
      return reply.code(409).send({ error: "Aucun paiement autorisé à capturer." });
    }

    const result = await provider.capturePaymentIntent(payment.stripeRef);

    const [updated] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { statut: PaymentStatus.CAPTURED },
      }),
      prisma.task.update({
        where: { id },
        data: { statut: TaskStatus.PAYEE },
      }),
    ]);

    await notify(payment.payeeId, NotificationType.PAYMENT_RECEIVED, {
      taskId: id,
      montant: Number(payment.montant),
      message: "Paiement reçu pour votre prestation.",
    });

    return reply.send({ status: updated.statut, stripeStatus: result.status });
  });

  // Remboursement (demandeur ou admin).
  app.post("/payments/:paymentId/refund", authed, async (req, reply) => {
    const { paymentId } = paymentParams.parse(req.params);
    const provider = await getPaymentProvider();

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return reply.code(404).send({ error: "Paiement introuvable." });
    if (payment.payerId !== req.authUser!.sub && !req.authUser!.isAdmin) {
      return reply.code(403).send({ error: "Action non autorisée." });
    }
    if (!payment.stripeRef) {
      return reply.code(409).send({ error: "Aucune référence de paiement." });
    }

    const result = await provider.refund(payment.stripeRef);
    await prisma.payment.update({
      where: { id: paymentId },
      data: { statut: PaymentStatus.REFUNDED },
    });
    return reply.send({ status: PaymentStatus.REFUNDED, stripeStatus: result.status });
  });

  // Reçu simple.
  app.get("/payments/task/:id", authed, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const payment = await prisma.payment.findUnique({ where: { taskId: id } });
    if (!payment) return reply.code(404).send({ error: "Aucun paiement." });
    if (
      payment.payerId !== req.authUser!.sub &&
      payment.payeeId !== req.authUser!.sub &&
      !req.authUser!.isAdmin
    ) {
      return reply.code(403).send({ error: "Reçu non accessible." });
    }
    return reply.send(payment);
  });
}
