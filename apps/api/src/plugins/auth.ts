import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";

export interface AccessTokenPayload {
  sub: string;
  roles: string[];
  isAdmin: boolean;
  verifStatus: string;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      req: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    requireAdmin: (
      req: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    requireVerified: (
      req: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
  interface FastifyRequest {
    authUser?: AccessTokenPayload;
  }
}

/**
 * Plugin d'authentification : décode le JWT d'accès et expose des gardes
 * réutilisables (authenticate, requireAdmin, requireVerified).
 */
export default fp(async (app) => {
  await app.register(jwt, {
    secret: config.jwt.accessSecret,
  });

  app.decorate(
    "authenticate",
    async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        const payload = await req.jwtVerify<AccessTokenPayload>();
        req.authUser = payload;
      } catch {
        return reply.code(401).send({ error: "Non authentifié." });
      }
    }
  );

  app.decorate(
    "requireAdmin",
    async (req: FastifyRequest, reply: FastifyReply) => {
      if (!req.authUser?.isAdmin) {
        return reply.code(403).send({ error: "Accès administrateur requis." });
      }
    }
  );

  app.decorate(
    "requireVerified",
    async (req: FastifyRequest, reply: FastifyReply) => {
      if (req.authUser?.verifStatus !== "VERIFIED") {
        return reply.code(403).send({
          error: "Compte non vérifié : accès en lecture seule limité.",
        });
      }
    }
  );
});
