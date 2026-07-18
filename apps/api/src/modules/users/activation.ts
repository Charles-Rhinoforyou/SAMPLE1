import { evaluateEligibility, VerifStatus, AccessMethod } from "@laundry/shared";
import { config } from "../../config.js";
import { prisma } from "../../prisma.js";

/**
 * Ré-évalue l'éligibilité d'un utilisateur et active son compte si une voie
 * est remplie (parrainage 5/5 ou Gens de Confiance vérifié).
 * Appelé après tout événement pertinent : nouveau parrainage, décision admin GdC.
 * Idempotent : ne rétrograde jamais un compte déjà VERIFIED.
 */
export async function refreshActivation(userId: string): Promise<{
  verifStatus: VerifStatus;
  accessMethod: AccessMethod | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { gdcVerification: true },
  });
  if (!user) throw new Error("Utilisateur introuvable.");

  // Compte déjà activé : on n'y touche plus.
  if (user.verifStatus === VerifStatus.VERIFIED) {
    return { verifStatus: user.verifStatus, accessMethod: user.accessMethod };
  }

  const confirmedSponsorships = await prisma.sponsorship.count({
    where: { invitedUserId: userId, statut: "CONFIRMED" },
  });

  const result = evaluateEligibility({
    confirmedSponsorships,
    gdcVerification: user.gdcVerification?.statut ?? null,
    required: config.business.sponsorshipRequired,
  });

  if (result.eligible && result.method) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        verifStatus: VerifStatus.VERIFIED,
        accessMethod: result.method,
      },
    });
    return {
      verifStatus: updated.verifStatus,
      accessMethod: updated.accessMethod,
    };
  }

  return { verifStatus: user.verifStatus, accessMethod: user.accessMethod };
}
