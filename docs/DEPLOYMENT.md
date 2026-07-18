# Guide de déploiement — obtenir les liens du site et de l'application

Ce guide te permet d'obtenir **toi-même** :
1. l'URL publique du **site web** ;
2. l'API + base de données qui le font fonctionner ;
3. le lien de l'**application Android** (test interne / Play Store).

> Rien de tout cela ne peut être fait à ta place : ces étapes exigent **tes**
> comptes (Vercel/Netlify, Render, Google Play), **tes** clés et **tes** secrets.

---

## 0. Ordre recommandé

1. Déployer l'**API + base** (obtenir `https://…/` de l'API).
2. Déployer le **site web** en pointant `EXPO_PUBLIC_API_URL` sur cette API.
3. Publier l'**app Android** (même API).

---

## 1. API + base de données

### Option A — Render (blueprint fourni)

Un blueprint `render.yaml` est à la racine (service Docker + PostgreSQL).

1. Pousse le repo sur GitHub (déjà fait).
2. Sur https://render.com → **New → Blueprint** → sélectionne ce repo.
3. Render crée l'API et la base, génère les secrets JWT.
4. Renseigne à la main les secrets : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `CORS_ORIGIN` (= l'URL de ton site web, ex. `https://laundry.vercel.app`).
5. Au démarrage, les migrations Prisma s'appliquent automatiquement.
6. (Optionnel) Lance le seed une fois : depuis le shell du service Render,
   `cd apps/api && pnpm prisma:seed`.

→ Tu obtiens l'URL de l'API, ex. `https://laundry-api.onrender.com`.

### Option B — Docker (n'importe quel hébergeur)

```bash
docker build -f apps/api/Dockerfile -t laundry-api .
docker run -p 4000:4000 \
  -e DATABASE_URL="postgresql://…" \
  -e JWT_ACCESS_SECRET="…" -e JWT_REFRESH_SECRET="…" \
  -e STRIPE_SECRET_KEY="sk_test_…" \
  -e CORS_ORIGIN="https://ton-site" \
  laundry-api
```

---

## 2. Site web (export Expo web statique)

Le site est un export statique (`apps/client/dist`) servi en SPA.

### Vercel (config `apps/client/vercel.json` fournie)

1. Sur https://vercel.com → **Add New → Project** → importe ce repo.
2. **Root Directory** = `apps/client`.
3. Variable d'environnement : `EXPO_PUBLIC_API_URL` = l'URL de ton API (étape 1).
4. Déploie.

→ Tu obtiens l'URL du site, ex. `https://laundry.vercel.app`.
Reporte cette URL dans `CORS_ORIGIN` côté API (étape 1.4).

### Netlify (config `apps/client/netlify.toml` fournie)

1. **Add new site → Import** ce repo.
2. **Base directory** = `apps/client`.
3. Variable : `EXPO_PUBLIC_API_URL` = URL de l'API.
4. Déploie.

---

## 3. Application Android

L'app est prête pour **EAS Build** (`apps/client/eas.json`, id `com.laundry.platform`).

### Prérequis (à ta charge)
- Compte **Expo/EAS** (gratuit) : `npx eas login`.
- Compte **Google Play Developer** (~25 $, une fois) pour un lien Play Store.
- Icône/splash définitifs et fiche store (captures, description, politique de
  confidentialité).

### Étapes

```bash
cd apps/client

# 1. Connexion et configuration du projet EAS
npx eas login
npx eas build:configure

# 2. APK de test (installable directement, sans store) — pour un premier lien de partage
npx eas build -p android --profile preview
#    → EAS renvoie une URL de téléchargement de l'APK à partager.

# 3. App Bundle signé pour le Play Store
npx eas build -p android --profile production

# 4. Dépôt sur Google Play (piste "internal" par défaut)
#    Place la clé de service account Google Play ici (NON committée) :
#    apps/client/play-service-account.json
npx eas submit -p android --profile production
```

- Le profil **`preview`** produit un **APK** : le moyen le plus rapide d'avoir un
  lien installable, **sans** compte Play Store.
- Le profil **`production`** produit un **.aab** signé (clé gérée par EAS) pour le
  Play Store ; le **test interne** de Google Play fournit un lien d'installation.

### iOS (optionnel)
Même flux avec `-p ios` ; nécessite un compte **Apple Developer** (99 $/an).

---

## Récapitulatif des liens obtenus

| Élément | D'où vient le lien | Prérequis |
|---|---|---|
| Site web | Vercel/Netlify | compte hébergeur |
| API | Render/Docker | hébergeur + PostgreSQL |
| APK Android | `eas build -p android --profile preview` | compte EAS |
| Play Store | `eas submit` + test interne | compte Google Play (~25 $) |
