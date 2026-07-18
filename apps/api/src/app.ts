import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { ZodError } from "zod";
import { config } from "./config.js";
import authPlugin from "./plugins/auth.js";
import { authRoutes } from "./modules/auth/routes.js";
import { sponsorshipRoutes } from "./modules/sponsorship/routes.js";
import { verificationRoutes } from "./modules/verification/routes.js";
import { adminRoutes } from "./modules/admin/routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: config.corsOrigin, credentials: true });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await app.register(websocket);
  await app.register(authPlugin);

  // Erreurs de validation Zod -> 400 lisible.
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: "Validation échouée.",
        details: error.flatten(),
      });
    }
    app.log.error(error);
    return reply.code(error.statusCode ?? 500).send({
      error: error.message ?? "Erreur interne.",
    });
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "laundry-api",
    time: new Date().toISOString(),
  }));

  app.get("/", async () => ({
    name: "Plateforme lessive & pliage — API",
    version: "0.1.0",
    commissionRate: config.business.commissionRate,
    sponsorshipRequired: config.business.sponsorshipRequired,
  }));

  await app.register(authRoutes);
  await app.register(sponsorshipRoutes);
  await app.register(verificationRoutes);
  await app.register(adminRoutes);

  return app;
}
