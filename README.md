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
```

## Déploiement (obtenir les liens site + app)

Guide complet : **[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)**.

- **Site web** : export Expo web statique → Vercel (`apps/client/vercel.json`) ou Netlify (`apps/client/netlify.toml`). Définir `EXPO_PUBLIC_API_URL`.
- **API + base** : `apps/api/Dockerfile` (contexte = racine) ou blueprint Render (`render.yaml`, API + PostgreSQL, migrations auto au démarrage).
- **Android** : `eas build -p android --profile preview` pour un **APK** installable (lien immédiat, sans store), ou `--profile production` + `eas submit` pour le **Play Store**.

## Publication sur les stores (Android / iOS)

L'app est **prête à publier** via **EAS Build** (config dans `apps/client/eas.json`,
identifiants dans `apps/client/app.json` : `com.laundry.platform`).

**Prérequis (à ta charge — non fournis dans le code) :**
- un **compte Google Play Developer** (~25 $, une fois) pour le Play Store ;
- (optionnel iOS) un **compte Apple Developer** (99 $/an) ;
- un compte **Expo/EAS** (`npx eas login`).

**Flux de publication Android :**
```bash
cd apps/client
npx eas login
npx eas build:configure
npx eas build -p android --profile production      # génère un .aab signé
npx eas submit -p android --profile production      # dépôt sur Google Play
```
Le profil `production` produit un **App Bundle (.aab)** signé (clé gérée par EAS).
Pour `eas submit`, place la clé de **service account Google Play** en
`apps/client/play-service-account.json` (ignorée par git). La piste par défaut est
`internal` — passe en `production` dans `eas.json` quand tu es prêt.

> ⚠️ Aucune de ces étapes n'est exécutable sans **tes** comptes et **tes** clés :
> elles ne doivent pas être committées. Icônes/splash définitifs et fiche store
> (captures, description, politique de confidentialité) restent à fournir.

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

**Flux implémenté (destination charge + capture différée) :**
1. Le travailleur relie un **compte Connect Express** (`POST /payments/connect/onboard`), déclenché dès sa 1re candidature.
2. À la sélection, le demandeur **autorise** le paiement (`POST /tasks/:id/pay`) : `PaymentIntent` en **capture manuelle**, `transfer_data.destination` = compte du travailleur, `application_fee_amount` = commission → l'autorisation fait office de **séquestre**.
3. À la fin (`TERMINEE`), le demandeur **libère** le paiement (`POST /tasks/:id/capture`) : capture Stripe → le travailleur reçoit son dû, la plateforme conserve la commission, la tâche passe `PAYEE`.
4. **Remboursement** (`POST /payments/:id/refund`), **reçu** (`GET /payments/task/:id`), **webhook** signé (`POST /payments/webhook`) pour synchroniser les statuts.

Sans `STRIPE_SECRET_KEY`, un `MockPaymentProvider` simule tout le flux (dev/tests) ; le webhook répond alors en no-op.

### ⚠️ Note légale (CESU / URSSAF) — à traiter avant mise en production

En France, **rémunérer un particulier pour des tâches ménagères** (dont la lessive/le pliage relèvent) entre généralement dans le champ des **services à la personne** et implique souvent le **CESU** (Chèque Emploi Service Universel) et/ou une **déclaration URSSAF**, avec des obligations sociales/fiscales pour le particulier employeur.

Cette contrainte **n'est pas implémentée** dans le code (feu vert requis). Un **point d'extension** est prévu côté `Payment` pour brancher une éventuelle déclaration (ex. CESU) ultérieurement. **Ne pas ouvrir les paiements réels au public sans validation juridique.**

---

## État d'avancement (plan par phases)

- [x] **Phase 1 — Cadrage** : stack, schéma de données, arborescence.
- [x] **Phase 2 — Fondations** : monorepo, backend Fastify + Prisma + auth (JWT/refresh, argon2), logique métier partagée testée, app Expo (web + Android) avec écran d'accueil / démo design system.
- [x] **Phase 3 — Inscription** : parrainage 5/5 (code d'invitation, activation auto), voie GdC (repli manuel via `IdentityVerificationProvider`), **back-office admin** (liste + validation/rejet), écrans client (inscription, connexion, tableau de bord de progression, soumission GdC, admin). Config **EAS Build** pour publication store.
- [x] **Phase 4 — Cœur métier** : création d'annonce (heures + taux + **montant auto** calculé côté partagé), découverte/filtre des annonces ouvertes, candidatures, **choix du candidat** (attribution + refus des autres en transaction), transitions de statut (`OUVERTE → ATTRIBUEE → EN_COURS → TERMINEE`, annulation) gardées par la machine à états. Écrans : liste/filtre, création (montant en direct), détail (candidats + choix + suivi).
- [x] **Phase 5 — Notation & messagerie** : avis 1–5 + commentaire après `TERMINEE` (demandeur ↔ travailleur, réciprocité, un avis par auteur/tâche), **recalcul de la note moyenne** du profil ; messagerie légère demandeur ↔ candidat retenu (REST + **WebSocket temps réel** par tâche, auth par token). Écrans : notation (étoiles), fil de discussion.
- [x] **Phase 6 — Paiement Stripe Connect (mode test)** : modèle **destination charge + capture différée** derrière une interface `PaymentProvider` (impl. Stripe réelle + `MockPaymentProvider` par défaut sans clé). Onboarding **Connect Express** dès la 1re candidature, **autorisation** à la sélection (`/tasks/:id/pay`, capture manuelle + `application_fee` = commission 15 % + `destination` travailleur), **capture** après `TERMINEE` (`/tasks/:id/capture` → `PAYEE`), remboursement, reçu, **webhook** signé (contexte raw-body isolé). Écran client de configuration des paiements + actions payer/libérer.
- [x] **Phase 7 — Design futuriste responsive** : dégradés néon (expo-linear-gradient) sur les boutons/hero, animations sobres (`FadeIn`, respect reduce-motion), **page de démo du design system** (`/design`), aperçu visuel publié. Configs de déploiement web (Vercel/Netlify) + Docker/Render + guide `docs/DEPLOYMENT.md`.
- [x] **Phase 8 — Tests, seed, polish** : **notifications** (API + écran, non lues, tout marquer lu), **persistance de session** (AsyncStorage cross-plateforme + restauration au démarrage avec refresh automatique), tests d'intégration étendus (25 tests API), seed complet, README + guide de déploiement. Restent optionnels : icônes/splash définitifs, notifications push natives.
