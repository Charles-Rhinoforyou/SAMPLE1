import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma.js";

const idParams = z.object({ id: z.string() });

export async function notificationRoutes(app: FastifyInstance) {
  const authed = { preHandler: [app.authenticate] };

  // Mes notifications (plus récentes d'abord) + compteur non lues.
  app.get("/notifications", authed, async (req, reply) => {
    const userId = req.authUser!.sub;
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.count({ where: { userId, lu: false } }),
    ]);
    return reply.send({ items, unread });
  });

  // Marquer une notification comme lue.
  app.post("/notifications/:id/read", authed, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== req.authUser!.sub) {
      return reply.code(404).send({ error: "Notification introuvable." });
    }
    await prisma.notification.update({ where: { id }, data: { lu: true } });
    return reply.send({ ok: true });
  });

  // Tout marquer comme lu.
  app.post("/notifications/read-all", authed, async (req, reply) => {
    await prisma.notification.updateMany({
      where: { userId: req.authUser!.sub, lu: false },
      data: { lu: true },
    });
    return reply.send({ ok: true });
  });
}
