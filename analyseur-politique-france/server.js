// Analyseur Politique France — serveur Node.js / Express
// Sert le tableau de bord statique et proxifie les appels vers l'API Claude.

import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Chargement minimal du .env (évite une dépendance supplémentaire) ---
function loadEnv() {
  const path = join(__dirname, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadEnv();

const PORT = process.env.PORT || 3000;

// Modèles proposés dans l'interface (les identifiants sont les IDs officiels).
const MODELS = {
  "claude-opus-5": "Claude Opus 5 — le plus capable",
  "claude-sonnet-5": "Claude Sonnet 5 — équilibré",
  "claude-haiku-4-5": "Claude Haiku 4.5 — rapide et économique",
};
const DEFAULT_MODEL = MODELS[process.env.DEFAULT_MODEL]
  ? process.env.DEFAULT_MODEL
  : "claude-opus-5";

// --- Sections d'analyse (source de vérité côté serveur pour le prompt) ---
const SECTIONS = [
  { id: "historique", titre: "Contexte historique et géopolitique" },
  { id: "demographie", titre: "Démographie" },
  { id: "economie", titre: "Économie" },
  { id: "institutions", titre: "Institutions" },
  { id: "culture", titre: "Culture et valeurs" },
  { id: "environnement", titre: "Environnement et ressources" },
  { id: "forces_internes", titre: "Rapports de force internes" },
  { id: "international", titre: "Contexte international" },
  { id: "personnalites", titre: "Influence des personnalités riches" },
];

const SYSTEM_PROMPT = `Tu es un analyste en science politique et en géopolitique, rigoureux, factuel et strictement neutre.
Ton rôle est d'évaluer les paramètres STRUCTURELS qui influencent les décisions politiques d'un pays, à des fins d'analyse et de pédagogie.

Règles impératives :
- Reste analytique et non partisan : n'exprime aucune préférence idéologique ou partisane.
- Analyse des facteurs structurels et des dynamiques collectives (institutions, lobbies, médias, catégories socio-économiques), jamais des individus privés nommément visés ni des accusations diffamatoires.
- Fonde tes appréciations sur les données fournies par l'utilisateur ; quand une information manque, dis-le explicitement et raisonne en tendances plausibles, sans inventer de faits précis.
- Les scores sont des indicateurs qualitatifs de « santé/robustesse démocratique et de stabilité » du paramètre (0 = très fragilisant, 100 = très favorable à une gouvernance saine et stable).
- Les recommandations doivent être des orientations de politique publique d'intérêt général, réalistes et respectueuses de l'État de droit.
- Réponds uniquement selon le schéma JSON imposé, en français.`;

function buildUserContent(pays, donnees) {
  const lignes = [];
  lignes.push(`Pays analysé : ${pays || "France"}`);
  lignes.push("");
  lignes.push(
    "Données saisies par l'utilisateur pour chaque paramètre (peut être partiel) :"
  );
  for (const s of SECTIONS) {
    const val = (donnees && donnees[s.id]) || "";
    lignes.push("");
    lignes.push(`### ${s.titre} [id: ${s.id}]`);
    lignes.push(val.trim() ? val.trim() : "(non renseigné)");
  }
  lignes.push("");
  lignes.push(
    "Analyse chaque section, attribue un score 0-100, puis produis une synthèse globale, un score global (moyenne pondérée cohérente) et des actions prioritaires classées par urgence."
  );
  return lignes.join("\n");
}

// Schéma de sortie structurée
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    score_global: { type: "integer" },
    synthese_globale: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          titre: { type: "string" },
          score: { type: "integer" },
          diagnostic: { type: "string" },
          forces: { type: "array", items: { type: "string" } },
          risques: { type: "array", items: { type: "string" } },
          recommandations: { type: "array", items: { type: "string" } },
        },
        required: [
          "id",
          "titre",
          "score",
          "diagnostic",
          "forces",
          "risques",
          "recommandations",
        ],
      },
    },
    actions_prioritaires: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          titre: { type: "string" },
          justification: { type: "string" },
          urgence: { type: "string", enum: ["haute", "moyenne", "basse"] },
        },
        required: ["titre", "justification", "urgence"],
      },
    },
  },
  required: [
    "score_global",
    "synthese_globale",
    "sections",
    "actions_prioritaires",
  ],
};

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(join(__dirname, "public")));

// Configuration disponible (modèles + présence d'une clé côté serveur)
app.get("/api/config", (_req, res) => {
  res.json({
    models: MODELS,
    defaultModel: DEFAULT_MODEL,
    serverKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    sections: SECTIONS,
  });
});

// Analyse principale
app.post("/api/analyze", async (req, res) => {
  try {
    const { pays, donnees, model, apiKey } = req.body || {};

    const chosenModel = MODELS[model] ? model : DEFAULT_MODEL;
    const key = (apiKey && apiKey.trim()) || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      return res.status(400).json({
        error:
          "Aucune clé API Claude disponible. Renseignez ANTHROPIC_API_KEY dans .env ou saisissez une clé dans le panneau de configuration.",
      });
    }

    const client = new Anthropic({ apiKey: key });

    // Streaming pour éviter les délais d'attente sur des sorties longues.
    const stream = client.messages.stream({
      model: chosenModel,
      max_tokens: 32000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      messages: [
        { role: "user", content: buildUserContent(pays, donnees) },
      ],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return res.status(422).json({
        error:
          "La requête a été déclinée par les systèmes de sécurité du modèle. Reformulez les données saisies de façon plus factuelle et neutre.",
      });
    }

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock) {
      return res
        .status(502)
        .json({ error: "Réponse vide du modèle." });
    }

    let data;
    try {
      data = JSON.parse(textBlock.text);
    } catch {
      return res.status(502).json({
        error: "Le modèle n'a pas renvoyé un JSON valide.",
        raw: textBlock.text,
      });
    }

    res.json({
      model: message.model,
      usage: message.usage,
      result: data,
    });
  } catch (err) {
    console.error("Erreur /api/analyze:", err);
    const status = err?.status || 500;
    const message =
      err?.error?.message ||
      err?.message ||
      "Erreur inattendue lors de l'appel au modèle.";
    res.status(status).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(
    `Analyseur Politique France — http://localhost:${PORT} (modèle par défaut : ${DEFAULT_MODEL})`
  );
});
