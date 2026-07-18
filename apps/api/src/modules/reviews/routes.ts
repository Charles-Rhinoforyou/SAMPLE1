import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { reviewSchema, TaskStatus, NotificationType } from "@laundry/shared";
import { prisma } from "../../prisma.js";
import { notify } from "../notifications/service.js";

const idParams = z.object({ id: z.string() });
const userParams = z.object({ userId: z.string() });

/** Recalcule et persiste la note moyenne d'un utilisateur. */
async function recomputeAverage(userId: string): Promise<number> {
  const agg = await prisma.review.aggregate({
    where: { targetId: userId },
    _avg: { note: true },
  });
  const moyenne = agg._avg.note ?? 0;
  await prisma.user.update({
    where: { id: userId },
    data: { noteMoyenne: moyenne },
  });
  return moyenne;
}

export async function reviewRoutes(app: FastifyInstance) {
  const authed = { preHandler: [app.authenticate] };

  // Noter l'autre partie après réalisation. Réciprocité prévue :
  // owner ↔ travailleur assigné, un avis par auteur et par tâche.
  app.post("/tasks/:id/reviews", authed, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const body = reviewSchema.parse(req.body);
    const authorId = req.authUser!.sub;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return reply.code(404).send({ error: "Annonce introuvable." });

    if (
      task.statut !== TaskStatus.TERMINEE &&
      task.statut !== TaskStatus.PAYEE
    ) {
      return reply
        .code(409)
        .send({ error: "La tâche doit être terminée pour être notée." });
    }

    // L'auteur doit être une partie de la tâche ; la cible est l'autre partie.
    let targetId: string | null = null;
    if (authorId === task.ownerId) targetId = task.workerId;
    else if (authorId === task.workerId) targetId = task.ownerId;

    if (!targetId) {
      return reply
        .code(403)
        .send({ error: "Seules les parties de la tâche peuvent noter." });
    }

    const existing = await prisma.review.findUnique({
      where: { taskId_authorId: { taskId: id, authorId } },
    });
    if (existing) {
      return reply.code(409).send({ error: "Vous avez déjà noté cette tâche." });
    }

    const review = await prisma.review.create({
      data: {
        taskId: id,
        authorId,
        targetId,
        note: body.note,
        commentaire: body.commentaire,
      },
    });

    const noteMoyenne = await recomputeAverage(targetId);

    await notify(targetId, NotificationType.NEW_REVIEW, {
      taskId: id,
      note: body.note,
      message: "Vous avez reçu un nouvel avis.",
    });

    return reply.code(201).send({ review, noteMoyenne });
  });

  // Avis reçus par un utilisateur (profil public).
  app.get("/users/:userId/reviews", authed, async (req, reply) => {
    const { userId } = userParams.parse(req.params);
    const reviews = await prisma.review.findMany({
      where: { targetId: userId },
      include: { author: { select: { id: true, nom: true } } },
      orderBy: { createdAt: "desc" },
    });
    return reply.send(reviews);
  });

  // Avis liés à une tâche.
  app.get("/tasks/:id/reviews", authed, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const reviews = await prisma.review.findMany({
      where: { taskId: id },
      include: { author: { select: { id: true, nom: true } } },
    });
    return reply.send(reviews);
  });
}
