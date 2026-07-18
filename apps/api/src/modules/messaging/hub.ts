import type { WebSocket } from "ws";

/**
 * Hub de diffusion en mémoire : une « salle » par tâche.
 * Suffisant pour une instance unique ; passer à Redis pub/sub pour scaler.
 */
class MessageHub {
  private rooms = new Map<string, Set<WebSocket>>();

  join(taskId: string, socket: WebSocket): void {
    if (!this.rooms.has(taskId)) this.rooms.set(taskId, new Set());
    this.rooms.get(taskId)!.add(socket);
  }

  leave(taskId: string, socket: WebSocket): void {
    const room = this.rooms.get(taskId);
    if (!room) return;
    room.delete(socket);
    if (room.size === 0) this.rooms.delete(taskId);
  }

  broadcast(taskId: string, payload: unknown): void {
    const room = this.rooms.get(taskId);
    if (!room) return;
    const data = JSON.stringify(payload);
    for (const socket of room) {
      // 1 = OPEN
      if (socket.readyState === 1) socket.send(data);
    }
  }
}

export const messageHub = new MessageHub();
