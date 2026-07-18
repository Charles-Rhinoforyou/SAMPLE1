import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { adminReviewSchema, VerifStatus, NotificationType } from "@laundry/shared";
import { prisma } from "../../prisma.js";
import { refreshActivation } from "../users/activation.js";
import { notify } from "../notifications/service.js";

const listQuerySchema = z.object({
  status: z.nativeEnum(VerifStatus).optional(),
});

export async function adminRoutes(app: FastifyInstance) {
  const guard = { preHandler: [app.authenticate, app.requireAdmin] };

  // Liste des vérifications GdC (par défaut : en attente).
  app.get("/admin/verifications", guard, async (req, reply) => {
    const { status } = listQuerySchema.parse(req.query);
    const items = await prisma.gdcVerification.findMany({
      where: { statut: status ?? VerifStatus.PENDING },
      include: {
        user: { select: { id: true, nom: true, email: true, verifStatus: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    return reply.send(items);
  });

  // Décision admin sur une vérification manuelle.
  app.post("/admin/verifications/:id/review", guard, async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const { decision, note } = adminReviewSchema.parse(req.body);

    const record = await prisma.gdcVerification.findUnique({ where: { id } });
    if (!record) {
      return reply.code(404).send({ error: "Vérification introuvable." });
    }

    const newStatus =
      decision === "APPROVE" ? VerifStatus.VERIFIED : VerifStatus.REJECTED;

    await prisma.gdcVerification.update({
      where: { id },
      data: {
        statut: newStatus,
        reviewedBy: req.authUser!.sub,
        reviewNote: note,
      },
    });

    // Approbation -> tente d'activer le compte via la voie GdC.
    const activation =
      decision === "APPROVE" ? await refreshActivation(record.userId) : null;

    await notify(record.userId, NotificationType.APP_ACCEPTED, {
      kind: "GDC_REVIEW",
      decision,
      message:
        decision === "APPROVE"
          ? "Votre vérification Gens de Confiance est validée."
          : "Votre vérification Gens de Confiance a été refusée.",
      note,
    });

    return reply.send({ status: newStatus, activation });
  });

  // Vue d'ensemble minimale du back-office.
  app.get("/admin/stats", guard, async (_req, reply) => {
    const [pending, users, tasks] = await Promise.all([
      prisma.gdcVerification.count({ where: { statut: VerifStatus.PENDING } }),
      prisma.user.count(),
      prisma.task.count(),
    ]);
    return reply.send({ pendingVerifications: pending, users, tasks });
  });
}
