import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { config } from "../../config.js";
import { prisma } from "../../prisma.js";
import type { AccessTokenPayload } from "../../plugins/auth.js";

/** Hash opaque d'un refresh token pour stockage en base (jamais en clair). */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function refreshTtlMs(): number {
  // Supporte "30d" / "15m" / secondes brutes.
  const raw = config.jwt.refreshTtl;
  const m = /^(\d+)([dhms])$/.exec(raw);
  if (!m) return Number(raw) * 1000 || 30 * 24 * 3600 * 1000;
  const n = Number(m[1]);
  const unit = { d: 86400, h: 3600, m: 60, s: 1 }[m[2]]!;
  return n * unit * 1000;
}

export async function issueTokens(
  app: FastifyInstance,
  payload: AccessTokenPayload
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = app.jwt.sign(payload, { expiresIn: config.jwt.accessTtl });

  const refreshToken = crypto.randomBytes(48).toString("hex");
  await prisma.refreshToken.create({
    data: {
      userId: payload.sub,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshTtlMs()),
    },
  });

  return { accessToken, refreshToken };
}

/** Rotation : révoque l'ancien refresh token et en émet un nouveau. */
export async function rotateRefreshToken(
  app: FastifyInstance,
  presentedToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(presentedToken) },
    include: { user: true },
  });

  if (
    !record ||
    record.revokedAt ||
    record.expiresAt.getTime() < Date.now()
  ) {
    return null;
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(app, {
    sub: record.user.id,
    roles: record.user.roles,
    isAdmin: record.user.isAdmin,
    verifStatus: record.user.verifStatus,
  });
}
