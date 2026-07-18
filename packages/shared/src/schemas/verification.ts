import { z } from "zod";

/** Voie « Gens de Confiance » — repli manuel : saisie profil + preuve. */
export const gdcVerificationSchema = z.object({
  gdcProfile: z.string().min(3).max(300),
  proofUrl: z.string().url(),
});
export type GdcVerificationInput = z.infer<typeof gdcVerificationSchema>;

/** Décision admin sur une vérification manuelle. */
export const adminReviewSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(500).optional(),
});
export type AdminReviewInput = z.infer<typeof adminReviewSchema>;
