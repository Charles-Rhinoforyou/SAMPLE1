# Plateforme « Lessive & Pliage »

Mise en relation **particulier-à-particulier** pour des tâches de **lessive et de pliage de linge**, livrée en **deux formes partageant le même code métier** :

- une **application Android** ;
- un **site web responsive**.

Les deux offrent les **mêmes fonctionnalités**, avec un affichage adaptatif (mobile / tablette / desktop).

> Boucle produit : *publier une tâche → recevoir des candidatures → choisir un profil → réaliser → payer → noter*.

---

## Stack

| Couche | Choix |
|---|---|
| Front unifié | **Expo** (React Native + React Native Web) → Android **et** web, codebase unique |
| Langage | **TypeScript** partout |
| Backend | **Node.js + Fastify** — API REST/JSON unique |
| ORM / DB | **Prisma + PostgreSQL** |
| Auth | **JWT + refresh tokens**, mots de passe hachés (argon2) |
| Paiement | **Stripe Connect (Express)**, commission paramétrable |
| Fichiers | **S3-compatible** (MinIO en dev) |
| Temps réel | **WebSocket** |
| Validation | **Zod** (dans `packages/shared`) |

## Architecture (monorepo pnpm)

```
apps/
  api/         Backend Fastify + Prisma + auth + WebSocket
  client/      App Expo (Android + web)
packages/
  shared/      Types, enums, schémas zod, LOGIQUE MÉTIER PURE (testée)
```

Toute règle métier (calcul du montant, éligibilité inscription, transitions de statut) vit dans `packages/shared` pour éviter la duplication web/mobile.

---

## Installation

Prérequis : **Node ≥ 20**, **pnpm ≥ 10**, **PostgreSQL** (local ou Docker), et (optionnel) un stockage S3-compatible type **MinIO**.

```bash
pnpm install
cp .env.example .env   # puis renseigner les valeurs
```

### Variables d'environnement

Voir `.env.example` (commenté). Points clés :

- `DATABASE_URL` — chaîne PostgreSQL.
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — **à changer**, jamais commités.
- `SPONSORSHIP_REQUIRED` (défaut `5`) — parrainages confirmés requis.
- `PLATFORM_COMMISSION_RATE` (défaut `0.15` = **15 %**).
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — **mode test** par défaut.
- `GDC_PROVIDER` — `manual` (défaut) ou `trustfully` (voir plus bas).

> ⚠️ **Aucun secret en dur.** Tout passe par `.env` (ignoré par git) + `.env.example`.

---

## Lancer le projet

### Backend (API)

```bash
pnpm db:generate          # génère le client Prisma
pnpm db:migrate           # applique les migrations (crée le schéma)
pnpm db:seed              # jeu de données de test
pnpm dev:api              # http://localhost:4000  (GET /health)
```

### Web

```bash
pnpm dev:web              # Expo web (http://localhost:8081)
```

### Android (Expo)

```bash
pnpm dev:android          # ouvre sur émulateur / appareil (Expo Go ou build dev)
# Build APK/AAB :
pnpm --filter @laundry/client build:web    # export web statique
# Pour un build natif Android : `eas build -p android` (EAS) ou `expo run:android`.
```

### Tests

```bash
pnpm test                                   # logique métier partagée (vitest)
pnpm --filter @laundry/api test             # tests d'intégration API (Prisma mocké)
```

---

## Comptes de test (après `pnpm db:seed`)

Mot de passe commun : `password123`

| Email | Rôle | Statut |
|---|---|---|
| `admin@laundry.test` | admin, les deux | vérifié |
| `alice@laundry.test` | demandeur | vérifié |
| `bob@laundry.test` | travailleur | vérifié |
| `chloe@laundry.test` | les deux | vérifié |
| `dan@laundry.test` | travailleur | **PENDING (3/5 parrainages)** |

---

## Inscription — règle d'accès stricte

Un compte n'est **activé** que par l'une de ces deux voies :

1. **Parrainage** — l'utilisateur doit être parrainé par **5 personnes déjà vérifiées**. Tant que < 5 confirmés → compte `PENDING`, accès en lecture seule limité, tableau de bord montrant la progression (« 3/5 parrainages »).
2. **Gens de Confiance** — validation via un compte GdC vérifié.

La logique d'éligibilité est dans `packages/shared/src/eligibility.ts` (testée).

### Statut de l'intégration « Gens de Confiance »

**Résultat de la recherche (2026-07) :**

- GdC propose bien un **programme « Partenaires API »** (vérification d'appartenance + badge de confiance), mais l'accès **n'est PAS self-service** : il faut un **partenariat + une clé API** obtenus **sur demande** auprès de GdC.
- La base technique historique (« TrustFully API », endpoints *Membership / Sponsorship / User*) existe via un SDK PHP open-source, mais **obsolète** (PHP5, dernière maj 2021, dépôt canonique inaccessible). À ne pas prendre comme contrat d'API fiable.

**Décision d'implémentation :** l'accès est isolé derrière l'interface `IdentityVerificationProvider` (`apps/api/src/modules/verification/`), avec deux implémentations :

- `ManualGdcProvider` — **actif par défaut** (`GDC_PROVIDER=manual`) : saisie du profil GdC + upload de preuve + **validation manuelle par un admin** (back-office).
- `TrustFullyGdcProvider` — **stub prêt à brancher** (`GDC_PROVIDER=trustfully` + `GDC_API_KEY`), activable dès l'obtention du partenariat. Le contrat d'endpoint réel **doit être confirmé auprès de GdC** avant activation en production.

> **Action côté équipe :** contacter Gens de Confiance pour obtenir l'accès partenaire et la clé API.

---

## Paiement (Stripe Connect)

- Modèle marketplace : le demandeur paie via la plateforme ; le travailleur (compte **Connect Express**) est payé **après réalisation**.
- Commission plateforme **paramétrable** (`PLATFORM_COMMISSION_RATE`, défaut 15 %).
- **Mode test** par défaut ; clés en variables d'environnement, **jamais en dur**.
- Le calcul de répartition (commission / reversement) est dans `packages/shared/src/pricing.ts` (testé).

### ⚠️ Note légale (CESU / URSSAF) — à traiter avant mise en production

En France, **rémunérer un particulier pour des tâches ménagères** (dont la lessive/le pliage relèvent) entre généralement dans le champ des **services à la personne** et implique souvent le **CESU** (Chèque Emploi Service Universel) et/ou une **déclaration URSSAF**, avec des obligations sociales/fiscales pour le particulier employeur.

Cette contrainte **n'est pas implémentée** dans le code (feu vert requis). Un **point d'extension** est prévu côté `Payment` pour brancher une éventuelle déclaration (ex. CESU) ultérieurement. **Ne pas ouvrir les paiements réels au public sans validation juridique.**

---

## État d'avancement (plan par phases)

- [x] **Phase 1 — Cadrage** : stack, schéma de données, arborescence.
- [x] **Phase 2 — Fondations** : monorepo, backend Fastify + Prisma + auth (JWT/refresh, argon2), logique métier partagée testée, app Expo (web + Android) avec écran d'accueil / démo design system.
- [ ] **Phase 3 — Inscription** : parrainage 5/5 + voie GdC (repli manuel) + back-office admin.
- [ ] **Phase 4 — Cœur métier** : création d'annonce (heures + taux + montant auto), candidatures, choix du candidat, statuts.
- [ ] **Phase 5 — Notation & messagerie.**
- [ ] **Phase 6 — Paiement Stripe Connect (mode test).**
- [ ] **Phase 7 — Design futuriste responsive partout.**
- [ ] **Phase 8 — Tests, seed, README, polish.**
