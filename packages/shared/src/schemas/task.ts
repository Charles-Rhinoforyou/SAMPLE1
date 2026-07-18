import { z } from "zod";
import { TaskType } from "../enums.js";

export const createTaskSchema = z
  .object({
    titre: z.string().min(3).max(140),
    description: z.string().min(10).max(4000),
    type: z.nativeEnum(TaskType),
    zone: z.string().min(2).max(160),
    heureDebut: z.coerce.date(),
    heureFin: z.coerce.date(),
    tauxHoraire: z.number().positive().max(1000),
  })
  .refine((v) => v.heureFin.getTime() > v.heureDebut.getTime(), {
    message: "L'heure de fin doit être postérieure à l'heure de début.",
    path: ["heureFin"],
  });
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const applyToTaskSchema = z.object({
  message: z.string().max(1000).optional(),
});
export type ApplyToTaskInput = z.infer<typeof applyToTaskSchema>;

export const reviewSchema = z.object({
  note: z.number().int().min(1).max(5),
  commentaire: z.string().max(1000).optional(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const taskFilterSchema = z.object({
  type: z.nativeEnum(TaskType).optional(),
  zone: z.string().max(160).optional(),
  tauxMin: z.coerce.number().nonnegative().optional(),
  tauxMax: z.coerce.number().positive().optional(),
});
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
