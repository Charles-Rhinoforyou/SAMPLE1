# Analyseur Politique France

Tableau de bord web qui évalue et documente les **paramètres structurels
influençant les décisions politiques** d'un pays. L'application fonctionne en
deux modes — **analyse** (saisie des données et scoring) et **rapport**
(consultation et export) — et s'appuie sur l'**API Claude** pour générer les
insights, le scoring et les recommandations.

> Outil à visée **analytique et éducative**. Les scores et recommandations sont
> des interprétations produites par l'IA à partir des données que vous saisissez ;
> ils ne constituent ni un jugement officiel ni des faits vérifiés. L'analyse
> porte sur des **facteurs structurels** (institutions, catégories, mécanismes),
> jamais sur des individus privés nommément visés.

## Fonctionnalités

- **9 sections d'analyse** en cartes interactives :
  1. Contexte historique et géopolitique
  2. Démographie
  3. Économie
  4. Institutions
  5. Culture et valeurs
  6. Environnement et ressources
  7. Rapports de force internes
  8. Contexte international
  9. Influence des personnalités riches (analyse structurelle)
- **Connexion flexible à Claude** : choix du modèle (**Opus 5**, **Sonnet 5**,
  **Haiku 4.5**) et de la clé API (donc du compte / de l'organisation).
- **Scoring** : score par paramètre + **score global** de santé politique, avec
  jauge et graphique à barres.
- **Insights IA** : diagnostic, forces, risques et recommandations par section,
  plus des **actions prioritaires** classées par urgence.
- **Export multi-format** : **Word** (`.doc`), **PDF** (impression navigateur),
  **Excel** (`.xls`).
- **Interface responsive** (desktop / tablette), palette professionnelle.

## Architecture

```
analyseur-politique-france/
├── server.js          # Backend Node.js/Express + proxy API Claude (sortie JSON structurée)
├── package.json
├── .env.example
└── public/
    ├── index.html     # Tableau de bord
    ├── styles.css
    └── app.js         # Logique, rendu des résultats, exports
```

Le backend appelle `messages.stream` avec **sortie structurée**
(`output_config.format`) pour garantir un JSON conforme au schéma attendu, puis
le frontend l'affiche. La clé API n'est **jamais** stockée : elle provient de
`ANTHROPIC_API_KEY` (côté serveur) ou est transmise ponctuellement pour la
requête en cours.

## Prérequis

- Node.js ≥ 18
- Une clé API Claude — https://platform.claude.com

## Installation

```bash
cd analyseur-politique-france
npm install
cp .env.example .env      # puis renseignez ANTHROPIC_API_KEY
npm start
```

Ouvrez ensuite http://localhost:3000

Vous pouvez aussi laisser `.env` vide et saisir votre clé directement dans le
panneau **Configuration** de l'interface (utile pour tester plusieurs comptes).

## Utilisation

1. Renseignez le **pays** et, pour chaque paramètre, la situation actuelle
   (le bouton **« Charger un exemple »** pré-remplit un cas France).
2. Choisissez le **modèle** et, au besoin, une **clé API**.
3. Cliquez sur **« Lancer l'analyse »**.
4. Consultez le tableau de bord (score global, scores par paramètre, actions
   prioritaires, diagnostics par carte) puis **exportez** en Word / PDF / Excel.

## Modèles

| Identifiant        | Description                        |
| ------------------ | --------------------------------- |
| `claude-opus-5`    | Le plus capable (par défaut)      |
| `claude-sonnet-5`  | Équilibré qualité / coût          |
| `claude-haiku-4-5` | Rapide et économique              |

## Confidentialité

- Aucune donnée n'est persistée côté serveur : chaque analyse est traitée en
  mémoire puis renvoyée au navigateur.
- La clé API saisie dans l'interface est utilisée uniquement pour la requête en
  cours et n'est pas conservée.
