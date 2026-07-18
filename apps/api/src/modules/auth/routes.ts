import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  SponsorStatus,
} from "@laundry/shared";
import { prisma } from "../../prisma.js";
import { issueTokens, rotateRefreshToken } from "./tokens.js";

function publicUser(u: {
  id: string;
  nom: string;
  email: string;
  roles: string[];
  verifStatus: string;
  accessMethod: string | null;
  noteMoyenne: number;
  invitationCode: string;
  isAdmin: boolean;
}) {
  return {
    id: u.id,
    nom: u.nom,
    email: u.email,
    roles: u.roles,
    verifStatus: u.verifStatus,
    accessMethod: u.accessMethod,
    noteMoyenne: u.noteMoyenne,
    invitationCode: u.invitationCode,
    isAdmin: u.isAdmin,
  };
}

export async function authRoutes(app: FastifyInstance) {
  // Inscription. Compte créé en PENDING. Si un code d'invitation valide est
  // fourni, un parrainage CONFIRMED est enregistré (le parrain doit être vérifié).
  app.post("/auth/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (existing) {
      return reply.code(409).send({ error: "Email déjà utilisé." });
    }

    const passwordHash = await argon2.hash(body.password);

    const user = await prisma.user.create({
      data: {
        nom: body.nom,
        email: body.email,
        telephone: body.telephone,
        passwordHash,
        roles: body.roles,
      },
    });

    // Voie parrainage : rattacher le nouvel utilisateur à un parrain vérifié.
    if (body.invitationCode) {
      const sponsor = await prisma.user.findUnique({
        where: { invitationCode: body.invitationCode },
      });
      if (sponsor && sponsor.verifStatus === "VERIFIED") {
        await prisma.sponsorship.create({
          data: {
            sponsorId: sponsor.id,
            invitedUserId: user.id,
            statut: SponsorStatus.CONFIRMED,
          },
        });
      }
    }

    const tokens = await issueTokens(app, {
      sub: user.id,
      roles: user.roles,
      isAdmin: user.isAdmin,
      verifStatus: user.verifStatus,
    });

    return reply.code(201).send({ user: publicUser(user), ...tokens });
  });

  app.post("/auth/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (!user || !(await argon2.verify(user.passwordHash, body.password))) {
      return reply.code(401).send({ error: "Identifiants invalides." });
    }

    const tokens = await issueTokens(app, {
      sub: user.id,
      roles: user.roles,
      isAdmin: user.isAdmin,
      verifStatus: user.verifStatus,
    });

    return reply.send({ user: publicUser(user), ...tokens });
  });

  app.post("/auth/refresh", async (req, reply) => {
    const body = refreshSchema.parse(req.body);
    const tokens = await rotateRefreshToken(app, body.refreshToken);
    if (!tokens) {
      return reply.code(401).send({ error: "Refresh token invalide ou expiré." });
    }
    return reply.send(tokens);
  });

  // Profil courant + progression d'éligibilité (parrainages confirmés).
  app.get(
    "/auth/me",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: req.authUser!.sub },
        include: { gdcVerification: true },
      });
      if (!user) return reply.code(404).send({ error: "Utilisateur introuvable." });

      const confirmedSponsorships = await prisma.sponsorship.count({
        where: { invitedUserId: user.id, statut: "CONFIRMED" },
      });

      const { sponsorshipProgress, evaluateEligibility } = await import(
        "@laundry/shared"
      );

      return reply.send({
        ...publicUser(user),
        eligibility: {
          progress: sponsorshipProgress(confirmedSponsorships),
          result: evaluateEligibility({
            confirmedSponsorships,
            gdcVerification: user.gdcVerification?.statut ?? null,
          }),
        },
      });
    }
  );
}
