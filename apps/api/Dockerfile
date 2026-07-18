# Image de l'API. Contexte de build attendu : RACINE du monorepo.
#   docker build -f apps/api/Dockerfile -t laundry-api .
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
# Dépendances de build pour argon2 (au cas où le binaire prébuilt manque).
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- Dépendances ---
FROM base AS deps
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --filter @laundry/api... --frozen-lockfile=false

# --- Build ---
FROM deps AS build
COPY . .
RUN pnpm --filter @laundry/shared build \
    && cd apps/api && pnpm prisma generate && pnpm build

# --- Runtime ---
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 4000
# Applique les migrations puis démarre l'API.
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/index.js"]
