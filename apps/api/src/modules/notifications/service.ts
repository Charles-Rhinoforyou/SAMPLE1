import type { NotificationType } from "@laundry/shared";
import { prisma } from "../../prisma.js";

/** Crée une notification persistée pour un utilisateur. */
export async function notify(
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, payload: payload as object },
  });
}
