import { z } from "zod";
import { Role } from "../enums.js";

export const registerSchema = z.object({
  nom: z.string().min(2).max(120),
  email: z.string().email(),
  telephone: z.string().min(6).max(30).optional(),
  password: z.string().min(8).max(128),
  roles: z
    .array(z.nativeEnum(Role))
    .min(1)
    .default([Role.DEMANDEUR]),
  /** Code d'invitation d'un parrain (voie parrainage). */
  invitationCode: z.string().min(4).max(64).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshInput = z.infer<typeof refreshSchema>;
