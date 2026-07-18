import type { FastifyInstance } from "fastify";
import { gdcVerificationSchema, VerifStatus } from "@laundry/shared";
import { prisma } from "../../prisma.js";
import { createIdentityProvider } from "./index.js";
import { refreshActivation } from "../users/activation.js";

export async function verificationRoutes(app: FastifyInstance) {
  const provider = createIdentityProvider();

  // Soumission d'une demande de vérification Gens de Confiance.
  app.post(
    "/verification/gdc",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const body = gdcVerificationSchema.parse(req.body);
      const userId = req.authUser!.sub;

      const check = await provider.check({
        gdcProfile: body.gdcProfile,
        proofUrl: body.proofUrl,
      });

      // Auto-vérification si le provider le permet (ex. API partenaire) ;
      // sinon PENDING en attente de validation admin.
      const statut = check.verified
        ? VerifStatus.VERIFIED
        : VerifStatus.PENDING;

      const record = await prisma.gdcVerification.upsert({
        where: { userId },
        create: {
          userId,
          gdcProfile: body.gdcProfile,
          proofUrl: body.proofUrl,
          statut,
        },
        update: {
          gdcProfile: body.gdcProfile,
          proofUrl: body.proofUrl,
          statut,
          reviewedBy: null,
          reviewNote: null,
        },
      });

      const activation = check.verified
        ? await refreshActivation(userId)
        : null;

      return reply.code(201).send({
        status: record.statut,
        provider: check.provider,
        requiresManualReview: check.requiresManualReview,
        message: check.message,
        activation,
      });
    }
  );

  // Statut de ma vérification GdC.
  app.get(
    "/verification/me",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const record = await prisma.gdcVerification.findUnique({
        where: { userId: req.authUser!.sub },
      });
      return reply.send(record ?? { statut: null });
    }
  );
}
