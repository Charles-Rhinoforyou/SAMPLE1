import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { messageHub } from "./hub.js";

const idParams = z.object({ id: z.string() });
const messageSchema = z.object({ contenu: z.string().min(1).max(2000) });

/** Vrai si l'utilisateur est une partie de la tâche (owner ou travailleur assigné). */
async function isParty(taskId: string, userId: string): Promise<boolean> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { ownerId: true, workerId: true },
  });
  if (!task) return false;
  return task.ownerId === userId || task.workerId === userId;
}

export async function messagingRoutes(app: FastifyInstance) {
  const authed = { preHandler: [app.authenticate] };

  // Historique des messages d'une tâche (parties uniquement).
  app.get("/tasks/:id/messages", authed, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    if (!(await isParty(id, req.authUser!.sub))) {
      return reply.code(403).send({ error: "Conversation non autorisée." });
    }
    const messages = await prisma.message.findMany({
      where: { taskId: id },
      include: { sender: { select: { id: true, nom: true } } },
      orderBy: { createdAt: "asc" },
    });
    return reply.send(messages);
  });

  // Envoyer un message : persistance + diffusion temps réel dans la salle.
  app.post("/tasks/:id/messages", authed, async (req, reply) => {
    const { id } = idParams.parse(req.params);
    const { contenu } = messageSchema.parse(req.body);
    const senderId = req.authUser!.sub;

    if (!(await isParty(id, senderId))) {
      return reply.code(403).send({ error: "Conversation non autorisée." });
    }

    const message = await prisma.message.create({
      data: { taskId: id, senderId, contenu },
      include: { sender: { select: { id: true, nom: true } } },
    });

    messageHub.broadcast(id, { type: "message", message });
    return reply.code(201).send(message);
  });

  // Canal temps réel par tâche. Auth par token en query (?token=), car les
  // en-têtes ne sont pas toujours disponibles côté WebSocket navigateur.
  app.get(
    "/ws/tasks/:id",
    { websocket: true },
    async (socket, req) => {
      const { id } = idParams.parse(req.params);
      const token = (req.query as { token?: string }).token;

      let userId: string;
      try {
        const payload = app.jwt.verify<{ sub: string }>(token ?? "");
        userId = payload.sub;
      } catch {
        socket.send(JSON.stringify({ type: "error", error: "Non authentifié." }));
        socket.close();
        return;
      }

      if (!(await isParty(id, userId))) {
        socket.send(JSON.stringify({ type: "error", error: "Accès refusé." }));
        socket.close();
        return;
      }

      messageHub.join(id, socket);
      socket.send(JSON.stringify({ type: "connected", taskId: id }));

      socket.on("close", () => messageHub.leave(id, socket));
    }
  );
}
