import type { TaskStatus } from "@laundry/shared";

type Tone = "cyan" | "magenta" | "violet" | "success" | "warning";

/** Libellé + couleur d'un statut de tâche pour l'UI. */
export function statusBadge(status: TaskStatus): { label: string; tone: Tone } {
  const map: Record<TaskStatus, { label: string; tone: Tone }> = {
    OUVERTE: { label: "Ouverte", tone: "cyan" },
    ATTRIBUEE: { label: "Attribuée", tone: "violet" },
    EN_COURS: { label: "En cours", tone: "warning" },
    TERMINEE: { label: "Terminée", tone: "success" },
    PAYEE: { label: "Payée", tone: "success" },
    ANNULEE: { label: "Annulée", tone: "magenta" },
  };
  return map[status];
}
