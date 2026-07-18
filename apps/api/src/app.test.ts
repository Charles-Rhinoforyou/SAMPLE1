import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Mock Prisma pour tester les routes sans base de données réelle.
vi.mock("./prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    sponsorship: { count: vi.fn(), create: vi.fn() },
  },
}));

import { buildApp } from "./app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("routes publiques", () => {
  it("GET /health répond ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "ok" });
  });

  it("GET / expose la config métier", async () => {
    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveProperty("commissionRate");
  });

  it("GET /auth/me sans token -> 401", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(401);
  });

  it("POST /auth/register avec corps invalide -> 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "pas-un-email" },
    });
    expect(res.statusCode).toBe(400);
  });
});
