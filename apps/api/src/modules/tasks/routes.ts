import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  createTaskSchema,
  applyToTaskSchema,
  taskFilterSchema,
  computeTaskAmount,
  assertTransition,
  TaskStatus,
  AppStatus,
  NotificationType,
} from "@laundry/shared";
import { prisma } from "../../prisma.js";
import { notify } from "../notifications/service.js";

const idParams = z.object({ id: z.string() });
const appParams = z.object({ id: z.string(), appId: z.string() });

export async function taskRoutes(app: FastifyInstance) {
  const authed = { preHandler: [app.authenticate] };
  const verified = { preHandler: [app.authenticate, app.requireVerified] };

  // Création d'une annonce — le montant total est calculé automatiquement.
  app.post("/tasks", verified, async (req, reply) => {
    const body = createTaskSchema.parse(req.body);
    const montantTotal = computeTaskAmount({
      heureDebut: body.heureDebut,
      heureFin: body.heureFin,
      tauxHoraire: body.tauxHoraire,
    });

    const task = await prisma.task.create({
      data: {
        ownerId: req.authUser!.sub,
        titre: body.titre,
        description: body.description,
        type: body.type,
        zone: body.zone,
        heureDebut: body.heureDebut,
        heureFin: body.heureFin,
        tauxHoraire: body.tauxHoraire,
        montantTotal,
        statut: TaskStatus.OUVERTE,
      },
    });
    return reply.code(201).send(task);
  });

  // Découverte : annonces ouvertes, filtrables (type, zone, taux).
  app.get("/tasks", authed, async (req, reply) => {
    const f = taskFilterSchema.parse(req.query);
    const tasks = await prisma.task.findMany({
      where: {
        statut: TaskStatus.OUVERTE,
        ...(f.type ? { type: f.type } : {}),
        ...(f.zone ? { zone: { contains: f.zone, mode: "insensitive" } } : {}),
        ...(f.tauxMin || f.tauxMax
          ? {
              tauxHoraire: {
                ...(f.tauxMin ? { gte: f.tauxMin } : {}),
                ...(f.tauxMax ? { lte: f.tauxMax } : {}),
              },
            }
          : {}),
      },
      include: {
        owner: { select: { id: true, nom: true, noteMoyenne: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return reply.send(tasks);
  });

  // Mes annonces (demandeur).
  app.get("/tasks/mine", authed, async (req, reply) => {
    const tasks = await prisma.task.findMany({
      where: { ownerId: req.authUser!.sub },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    });
    return reply.send(tasks);
  });

  // Détail d'une annonce + candidatures (profils candidats visibles par l'owner).
  app.get("/tasks/:id", authed, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, nom: true, noteMoyenne: true } },
        applications: {
          include: {
            worker: {
              select: {
                id: true,
                nom: true,
                noteMoyenne: true,
                bio: true,
                photoUrl: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!task) return reply.code(404).send({ error: "Annonce introuvable." });

    // Un candidat ne voit pas les autres candidatures ; l'owner voit tout.
    const isOwner = task.ownerId === req.authUser!.sub;
    if (!isOwner) {
      return reply.send({
        ...task,
        applications: task.applications.filter(
          (a) => a.workerId === req.authUser!.sub
        ),
      });
    }
    return reply.send(task);
  });

  // Postuler à une annonce (travailleur vérifié).
  app.post("/tasks/:id/applications", verified, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const body = applyToTaskSchema.parse(req.body);
    const workerId = req.authUser!.sub;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return reply.code(404).send({ error: "Annonce introuvable." });
    if (task.statut !== TaskStatus.OUVERTE) {
      return reply.code(409).send({ error: "Cette annonce n'accepte plus de candidatures." });
    }
    if (task.ownerId === workerId) {
      return reply.code(400).send({ error: "Vous ne pouvez pas postuler à votre propre annonce." });
    }

    const existing = await prisma.application.findUnique({
      where: { taskId_workerId: { taskId: id, workerId } },
    });
    if (existing) {
      return reply.code(409).send({ error: "Vous avez déjà postulé." });
    }

    const application = await prisma.application.create({
      data: { taskId: id, workerId, message: body.message },
    });

    await notify(task.ownerId, NotificationType.NEW_APPLICATION, {
      taskId: id,
      titre: task.titre,
      message: "Nouvelle candidature reçue.",
    });

    return reply.code(201).send(application);
  });

  // L'owner choisit un candidat : la tâche passe ATTRIBUEE, les autres REFUSEE.
  app.post("/tasks/:id/applications/:appId/accept", authed, async (req, reply) => {
    const { id, appId } = appParams.parse(req.params);

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return reply.code(404).send({ error: "Annonce introuvable." });
    if (task.ownerId !== req.authUser!.sub) {
      return reply.code(403).send({ error: "Seul l'auteur de l'annonce peut choisir." });
    }

    assertTransition(task.statut as TaskStatus, TaskStatus.ATTRIBUEE, "OWNER");

    const application = await prisma.application.findUnique({
      where: { id: appId },
    });
    if (!application || application.taskId !== id) {
      return reply.code(404).send({ error: "Candidature introuvable." });
    }

    // Transaction : accepter la candidature choisie, refuser les autres,
    // attribuer la tâche à ce travailleur.
    await prisma.$transaction([
      prisma.application.update({
        where: { id: appId },
        data: { statut: AppStatus.ACCEPTEE },
      }),
      prisma.application.updateMany({
        where: { taskId: id, id: { not: appId } },
        data: { statut: AppStatus.REFUSEE },
      }),
      prisma.task.update({
        where: { id },
        data: { statut: TaskStatus.ATTRIBUEE, workerId: application.workerId },
      }),
    ]);

    await notify(application.workerId, NotificationType.APP_ACCEPTED, {
      taskId: id,
      titre: task.titre,
      message: "Votre candidature a été acceptée.",
    });

    return reply.send({ ok: true, status: TaskStatus.ATTRIBUEE });
  });

  // Transitions de statut réalisées par l'owner ou le travailleur assigné.
  const transition =
    (to: TaskStatus) => async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = idParams.parse(req.params);
      const userId = req.authUser!.sub;
      const task = await prisma.task.findUnique({ where: { id } });
      if (!task) return reply.code(404).send({ error: "Annonce introuvable." });

      const actor =
        task.ownerId === userId
          ? "OWNER"
          : task.workerId === userId
            ? "WORKER"
            : null;
      if (!actor) {
        return reply.code(403).send({ error: "Action non autorisée sur cette annonce." });
      }

      try {
        assertTransition(task.statut as TaskStatus, to, actor);
      } catch (e) {
        return reply.code(409).send({ error: (e as Error).message });
      }

      const updated = await prisma.task.update({
        where: { id },
        data: { statut: to },
      });
      return reply.send({ status: updated.statut });
    };

  app.post("/tasks/:id/start", authed, transition(TaskStatus.EN_COURS));
  app.post("/tasks/:id/complete", authed, transition(TaskStatus.TERMINEE));
  app.post("/tasks/:id/cancel", authed, transition(TaskStatus.ANNULEE));
}
