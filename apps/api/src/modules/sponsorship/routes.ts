import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sponsorshipProgress, NotificationType } from "@laundry/shared";
import { config } from "../../config.js";
import { prisma } from "../../prisma.js";
import { refreshActivation } from "../users/activation.js";
import { notify } from "../notifications/service.js";

const sponsorSchema = z.object({
  /** Code d'invitation de la personne à parrainer. */
  invitedCode: z.string().min(4).max(64),
});

export async function sponsorshipRoutes(app: FastifyInstance) {
  // Tableau de bord parrainage du compte courant : progression + parrains.
  app.get(
    "/sponsorships/me",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = req.authUser!.sub;
      const sponsorships = await prisma.sponsorship.findMany({
        where: { invitedUserId: userId, statut: "CONFIRMED" },
        include: { sponsor: { select: { id: true, nom: true } } },
        orderBy: { createdAt: "desc" },
      });

      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { invitationCode: true },
      });

      return reply.send({
        invitationCode: me?.invitationCode,
        progress: sponsorshipProgress(
          sponsorships.length,
          config.business.sponsorshipRequired
        ),
        sponsors: sponsorships.map((s) => ({
          id: s.sponsor.id,
          nom: s.sponsor.nom,
          date: s.createdAt,
        })),
      });
    }
  );

  // Un utilisateur VÉRIFIÉ parraine une personne via son code d'invitation.
  app.post(
    "/sponsorships",
    { preHandler: [app.authenticate, app.requireVerified] },
    async (req, reply) => {
      const { invitedCode } = sponsorSchema.parse(req.body);
      const sponsorId = req.authUser!.sub;

      const invited = await prisma.user.findUnique({
        where: { invitationCode: invitedCode },
      });
      if (!invited) {
        return reply.code(404).send({ error: "Code d'invitation inconnu." });
      }
      if (invited.id === sponsorId) {
        return reply.code(400).send({ error: "Vous ne pouvez pas vous parrainer vous-même." });
      }

      // Un même parrain ne compte qu'une fois (contrainte unique en base).
      const existing = await prisma.sponsorship.findUnique({
        where: {
          sponsorId_invitedUserId: { sponsorId, invitedUserId: invited.id },
        },
      });
      if (existing) {
        return reply.code(409).send({ error: "Vous avez déjà parrainé cette personne." });
      }

      await prisma.sponsorship.create({
        data: { sponsorId, invitedUserId: invited.id, statut: "CONFIRMED" },
      });

      // Ré-évalue l'activation (peut passer le compte à VERIFIED si 5/5).
      const activation = await refreshActivation(invited.id);

      const confirmed = await prisma.sponsorship.count({
        where: { invitedUserId: invited.id, statut: "CONFIRMED" },
      });
      const progress = sponsorshipProgress(
        confirmed,
        config.business.sponsorshipRequired
      );

      await notify(invited.id, NotificationType.APP_ACCEPTED, {
        kind: "SPONSORSHIP_CONFIRMED",
        message: progress.complete
          ? "Votre compte est activé par parrainage !"
          : `Nouveau parrainage confirmé (${progress.label}).`,
      });

      return reply.code(201).send({ progress, activation });
    }
  );
}
