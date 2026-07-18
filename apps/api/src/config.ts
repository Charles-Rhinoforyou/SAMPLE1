/** Configuration centralisée, lue depuis l'environnement. Aucun secret en dur. */

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return v;
}

export const config = {
  env: process.env.NODE_ENV ?? "development",
  host: process.env.API_HOST ?? "0.0.0.0",
  port: Number(process.env.API_PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",

  jwt: {
    accessSecret: req("JWT_ACCESS_SECRET", "dev-access-secret"),
    refreshSecret: req("JWT_REFRESH_SECRET", "dev-refresh-secret"),
    accessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL ?? "30d",
  },

  business: {
    sponsorshipRequired: Number(process.env.SPONSORSHIP_REQUIRED ?? 5),
    commissionRate: Number(process.env.PLATFORM_COMMISSION_RATE ?? 0.15),
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    currency: process.env.STRIPE_CURRENCY ?? "eur",
  },

  gdc: {
    provider: (process.env.GDC_PROVIDER ?? "manual") as "manual" | "trustfully",
    apiBaseUrl: process.env.GDC_API_BASE_URL ?? "",
    apiKey: process.env.GDC_API_KEY ?? "",
  },
} as const;
