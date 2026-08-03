// Analyseur Politique France — logique du tableau de bord (vanilla JS)

const SECTIONS = [
  {
    id: "historique",
    icon: "🏛️",
    titre: "Contexte historique et géopolitique",
    desc: "Alliances, conflits passés, position stratégique, frontières, intérêts régionaux",
    hints: "Ex. : alliances (UE, OTAN), héritage colonial, position stratégique, frontières sensibles, influence régionale.",
  },
  {
    id: "demographie",
    icon: "👥",
    titre: "Démographie",
    desc: "Pyramide des âges, densité, migrations, natalité, composition sociale",
    hints: "Ex. : vieillissement, densité et disparités territoriales, flux migratoires, natalité, diversité culturelle et religieuse.",
  },
  {
    id: "economie",
    icon: "📈",
    titre: "Économie",
    desc: "Ressources, industrie, dépendances, développement, dette, inégalités",
    hints: "Ex. : structure industrielle et services, dépendances commerciales/énergétiques, dette publique, inégalités, chômage.",
  },
  {
    id: "institutions",
    icon: "⚖️",
    titre: "Institutions",
    desc: "Stabilité politique, séparation des pouvoirs, fonction publique, corruption",
    hints: "Ex. : stabilité gouvernementale, indépendance de la justice, qualité de l'administration, indicateurs de corruption.",
  },
  {
    id: "culture",
    icon: "🎭",
    titre: "Culture et valeurs",
    desc: "Traditions, idéologies, rapport à l'autorité, individualisme",
    hints: "Ex. : laïcité et traditions, courants idéologiques, confiance dans les institutions, rapport à l'autorité.",
  },
  {
    id: "environnement",
    icon: "🌍",
    titre: "Environnement et ressources",
    desc: "Eau, énergie, terres arables, vulnérabilité climatique",
    hints: "Ex. : mix énergétique, ressources en eau, agriculture, exposition aux risques climatiques.",
  },
  {
    id: "forces_internes",
    icon: "✊",
    titre: "Rapports de force internes",
    desc: "Lobbies, syndicats, médias, société civile, mouvements sociaux",
    hints: "Ex. : poids des syndicats, groupes d'intérêt, paysage médiatique, vitalité de la société civile, mobilisations.",
  },
  {
    id: "international",
    icon: "🌐",
    titre: "Contexte international",
    desc: "Organisations multilatérales, sanctions, traités, pressions",
    hints: "Ex. : engagements UE/ONU, traités, régime de sanctions, pressions diplomatiques et économiques.",
  },
  {
    id: "personnalites",
    icon: "💼",
    titre: "Influence des personnalités riches",
    desc: "Concentration de richesse, propriété des médias, philanthropie et lobbying",
    hints: "Analyse structurelle (catégories, mécanismes), sans viser d'individus : concentration capitalistique, propriété des médias, financement politique, influence philanthropique.",
  },
];

const EXEMPLE = {
  historique:
    "Membre fondateur de l'UE et de l'OTAN ; puissance nucléaire ; siège permanent au Conseil de sécurité ; forte présence en Afrique francophone ; frontières terrestres apaisées.",
  demographie:
    "Population vieillissante mais natalité relativement soutenue en Europe ; fortes disparités entre métropoles et zones rurales ; immigration significative ; société sécularisée et diverse.",
  economie:
    "Économie de services dominante, industrie affaiblie ; dépendance énergétique partielle ; dette publique élevée (>110% du PIB) ; inégalités modérées mais tensions sur le pouvoir d'achat.",
  institutions:
    "Régime semi-présidentiel stable ; justice indépendante mais critiquée pour ses moyens ; administration dense ; corruption perçue comme faible à modérée.",
  culture:
    "Attachement fort à la laïcité et au service public ; défiance croissante envers les élites ; tradition de contestation ; individualisme et universalisme mêlés.",
  environnement:
    "Électricité largement nucléaire et décarbonée ; ressources en eau sous tension estivale ; agriculture puissante ; exposition aux canicules et sécheresses.",
  forces_internes:
    "Syndicats capables de mobilisations massives ; médias concentrés entre quelques groupes ; société civile active ; mouvements sociaux récurrents.",
  international:
    "Engagements européens contraignants (budget, règles) ; participation aux sanctions internationales ; multilatéralisme actif ; pressions sur défense et commerce.",
  personnalites:
    "Concentration notable de la propriété des grands médias entre quelques groupes industriels ; financement encadré de la vie politique ; fondations philanthropiques influentes sur certains débats.",
};

let lastResult = null;
let lastMeta = { pays: "France", model: "" };

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};

const scoreColor = (s) =>
  s >= 70 ? "var(--good)" : s >= 45 ? "var(--mid)" : "var(--bad)";

// --- Rendu des cartes de sections ---
function renderSections() {
  const grid = $("#sections-grid");
  grid.innerHTML = "";
  for (const s of SECTIONS) {
    const card = el("article", "section-card");
    card.dataset.section = s.id;

    const head = el("div", "section-head");
    head.append(el("span", "section-icon", s.icon));
    const titleWrap = el("div");
    titleWrap.append(el("h3", null, s.titre), el("p", null, s.desc));
    head.append(titleWrap);
    const badge = el("span", "section-score", "–");
    badge.dataset.role = "score";
    head.append(badge);
    card.append(head);

    const ta = el("textarea");
    ta.id = `field-${s.id}`;
    ta.placeholder = "Décrivez la situation actuelle pour ce paramètre…";
    card.append(ta);
    card.append(el("p", "field-hints", s.hints));

    const result = el("div", "section-result hidden");
    result.dataset.role = "result";
    card.append(result);

    grid.append(card);
  }
}

// --- Chargement de la configuration serveur ---
async function loadConfig() {
  try {
    const res = await fetch("/api/config");
    const cfg = await res.json();
    const sel = $("#model");
    sel.innerHTML = "";
    for (const [id, label] of Object.entries(cfg.models)) {
      const opt = el("option", null, label);
      opt.value = id;
      if (id === cfg.defaultModel) opt.selected = true;
      sel.append(opt);
    }
    const status = $("#keyStatus");
    if (cfg.serverKeyConfigured) {
      status.textContent = "clé serveur active";
      status.className = "key-status ok";
    } else {
      status.textContent = "clé requise";
      status.className = "key-status missing";
    }
  } catch {
    setStatus("Impossible de charger la configuration du serveur.", "error");
  }
}

function setStatus(msg, kind) {
  const s = $("#status");
  s.textContent = msg || "";
  s.className = "status-line" + (kind ? " " + kind : "");
}

function gatherData() {
  const donnees = {};
  for (const s of SECTIONS) {
    donnees[s.id] = $(`#field-${s.id}`).value || "";
  }
  return donnees;
}

// --- Lancement de l'analyse ---
async function runAnalysis() {
  const btn = $("#btn-analyser");
  const donnees = gatherData();
  const hasData = Object.values(donnees).some((v) => v.trim());
  if (!hasData) {
    setStatus(
      "Renseignez au moins un paramètre avant de lancer l'analyse.",
      "error"
    );
    return;
  }

  const pays = $("#pays").value.trim() || "France";
  const model = $("#model").value;
  const apiKey = $("#apiKey").value.trim();

  btn.disabled = true;
  setStatus("Analyse en cours — le modèle évalue les 9 paramètres…", "busy");

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pays, donnees, model, apiKey }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Erreur du serveur.");

    lastResult = payload.result;
    lastMeta = { pays, model: payload.model || model };
    renderResults(lastResult);
    setStatus(
      `Analyse terminée avec ${payload.model || model}. Score global : ${
        lastResult.score_global
      }/100.`
    );
    $("#dashboard").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    setStatus(err.message || "Échec de l'analyse.", "error");
  } finally {
    btn.disabled = false;
  }
}

// --- Rendu des résultats ---
function renderResults(data) {
  $("#dashboard").classList.remove("hidden");

  // Jauge globale
  const gscore = clamp(data.score_global);
  animateGauge(gscore);
  $("#synthese").textContent = data.synthese_globale || "";

  // Cartes de sections
  const byId = Object.fromEntries((data.sections || []).map((s) => [s.id, s]));
  for (const s of SECTIONS) {
    const card = document.querySelector(`.section-card[data-section="${s.id}"]`);
    if (!card) continue;
    const sec = byId[s.id];
    const badge = card.querySelector('[data-role="score"]');
    const result = card.querySelector('[data-role="result"]');
    if (!sec) {
      badge.textContent = "–";
      result.classList.add("hidden");
      continue;
    }
    const sc = clamp(sec.score);
    badge.textContent = `${sc}/100`;
    badge.style.color = scoreColor(sc);
    badge.style.background = "var(--surface-2)";

    result.innerHTML = "";
    result.append(el("p", "diag", sec.diagnostic || ""));
    result.append(groupList("forces", "Forces", sec.forces));
    result.append(groupList("risques", "Risques", sec.risques));
    result.append(groupList("reco", "Recommandations", sec.recommandations));
    result.classList.remove("hidden");
  }

  // Graphique à barres
  renderBars(data.sections || []);

  // Actions prioritaires
  renderActions(data.actions_prioritaires || []);
}

function groupList(cls, label, items) {
  const g = el("div", `result-group ${cls}`);
  g.append(el("strong", null, label));
  const ul = el("ul");
  (items || []).forEach((it) => ul.append(el("li", null, it)));
  if (!items || !items.length) ul.append(el("li", null, "—"));
  g.append(ul);
  return g;
}

function renderBars(sections) {
  const wrap = $("#bars");
  wrap.innerHTML = "";
  const byId = Object.fromEntries(sections.map((s) => [s.id, s]));
  for (const s of SECTIONS) {
    const sec = byId[s.id];
    const sc = sec ? clamp(sec.score) : 0;
    const row = el("div", "bar-row");
    row.append(el("span", null, s.titre));
    const track = el("div", "bar-track");
    const fill = el("div", "bar-fill");
    fill.style.background = scoreColor(sc);
    track.append(fill);
    row.append(track);
    row.append(el("span", "bar-val", sec ? String(sc) : "–"));
    wrap.append(row);
    requestAnimationFrame(() => (fill.style.width = sc + "%"));
  }
}

function renderActions(actions) {
  const ul = $("#actions");
  ul.innerHTML = "";
  if (!actions.length) {
    ul.append(el("li", "action-item", "Aucune action prioritaire identifiée."));
    return;
  }
  for (const a of actions) {
    const urg = ["haute", "moyenne", "basse"].includes(a.urgence)
      ? a.urgence
      : "moyenne";
    const li = el("li", `action-item border-${urg}`);
    const h = el("h4");
    h.append(document.createTextNode(a.titre || ""));
    const tag = el("span", `urg urg-${urg}`, urg);
    h.append(tag);
    li.append(h);
    li.append(el("p", null, a.justification || ""));
    ul.append(li);
  }
}

// --- Jauge SVG ---
function animateGauge(score) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const fg = $("#gauge-fg");
  fg.style.strokeDasharray = String(circ);
  fg.style.strokeDashoffset = String(circ);
  fg.style.stroke = scoreColor(score);
  $("#gauge-text").textContent = String(score);
  requestAnimationFrame(() => {
    fg.style.strokeDashoffset = String(circ * (1 - score / 100));
  });
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

// --- Exports ---
function buildReportHTML() {
  if (!lastResult) return "";
  const d = lastResult;
  const bySec = Object.fromEntries((d.sections || []).map((s) => [s.id, s]));
  const parts = [];
  parts.push(`<h1>Analyse politique — ${escapeHtml(lastMeta.pays)}</h1>`);
  parts.push(
    `<p><em>Généré le ${new Date().toLocaleString(
      "fr-FR"
    )} — modèle ${escapeHtml(lastMeta.model)}</em></p>`
  );
  parts.push(
    `<h2>Score global : ${d.score_global}/100</h2><p>${escapeHtml(
      d.synthese_globale
    )}</p>`
  );
  for (const s of SECTIONS) {
    const sec = bySec[s.id];
    if (!sec) continue;
    parts.push(`<h3>${escapeHtml(s.titre)} — ${clamp(sec.score)}/100</h3>`);
    parts.push(`<p>${escapeHtml(sec.diagnostic)}</p>`);
    parts.push(listHtml("Forces", sec.forces));
    parts.push(listHtml("Risques", sec.risques));
    parts.push(listHtml("Recommandations", sec.recommandations));
  }
  parts.push(`<h2>Actions prioritaires</h2>`);
  parts.push(
    "<ul>" +
      (d.actions_prioritaires || [])
        .map(
          (a) =>
            `<li><strong>[${escapeHtml(a.urgence)}] ${escapeHtml(
              a.titre
            )}</strong> — ${escapeHtml(a.justification)}</li>`
        )
        .join("") +
      "</ul>"
  );
  return parts.join("\n");
}

function listHtml(label, items) {
  if (!items || !items.length) return "";
  return `<p><strong>${label} :</strong></p><ul>${items
    .map((i) => `<li>${escapeHtml(i)}</li>`)
    .join("")}</ul>`;
}

function escapeHtml(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportWord() {
  if (!lastResult) return;
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>body{font-family:Calibri,Arial,sans-serif;} h1{color:#1d3f8a;} h2{color:#16307a;} h3{color:#2f6fed;}</style></head><body>${buildReportHTML()}</body></html>`;
  download(
    `analyse-politique-${slug(lastMeta.pays)}.doc`,
    html,
    "application/msword"
  );
}

function exportExcel() {
  if (!lastResult) return;
  const d = lastResult;
  const rows = [
    ["Paramètre", "Score /100", "Diagnostic", "Forces", "Risques", "Recommandations"],
  ];
  const bySec = Object.fromEntries((d.sections || []).map((s) => [s.id, s]));
  for (const s of SECTIONS) {
    const sec = bySec[s.id];
    if (!sec) continue;
    rows.push([
      s.titre,
      clamp(sec.score),
      sec.diagnostic || "",
      (sec.forces || []).join(" | "),
      (sec.risques || []).join(" | "),
      (sec.recommandations || []).join(" | "),
    ]);
  }
  rows.push([]);
  rows.push(["SCORE GLOBAL", d.score_global, d.synthese_globale || ""]);
  rows.push([]);
  rows.push(["Actions prioritaires", "Urgence", "Justification"]);
  for (const a of d.actions_prioritaires || []) {
    rows.push([a.titre || "", a.urgence || "", a.justification || ""]);
  }

  // Table HTML lisible par Excel (préserve la structure et l'accentuation)
  const table = `<table border="1"><tr>${rows
    .map(
      (r) =>
        "<td>" +
        r.map((c) => escapeHtml(String(c))).join("</td><td>") +
        "</td>"
    )
    .join("</tr><tr>")}</tr></table>`;
  const html = `<html><head><meta charset="utf-8"></head><body>${table}</body></html>`;
  download(
    `analyse-politique-${slug(lastMeta.pays)}.xls`,
    html,
    "application/vnd.ms-excel"
  );
}

function exportPDF() {
  if (!lastResult) return;
  window.print(); // impression navigateur → « Enregistrer au format PDF »
}

const slug = (s) =>
  String(s || "pays")
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// --- Exemple / reset ---
function loadExample() {
  for (const s of SECTIONS) {
    $(`#field-${s.id}`).value = EXEMPLE[s.id] || "";
  }
  setStatus("Exemple chargé. Vous pouvez lancer l'analyse.");
}

function resetAll() {
  for (const s of SECTIONS) $(`#field-${s.id}`).value = "";
  $("#dashboard").classList.add("hidden");
  lastResult = null;
  setStatus("");
}

// --- Bascule de mode ---
function setMode(mode) {
  const analyse = mode === "analyse";
  document.body.classList.toggle("mode-rapport", !analyse);
  $("#mode-analyse").classList.toggle("active", analyse);
  $("#mode-rapport").classList.toggle("active", !analyse);
  $("#mode-analyse").setAttribute("aria-selected", String(analyse));
  $("#mode-rapport").setAttribute("aria-selected", String(!analyse));
}

// --- Initialisation ---
function init() {
  renderSections();
  loadConfig();
  $("#btn-analyser").addEventListener("click", runAnalysis);
  $("#btn-exemple").addEventListener("click", loadExample);
  $("#btn-reset").addEventListener("click", resetAll);
  $("#exp-word").addEventListener("click", exportWord);
  $("#exp-excel").addEventListener("click", exportExcel);
  $("#exp-pdf").addEventListener("click", exportPDF);
  $("#mode-analyse").addEventListener("click", () => setMode("analyse"));
  $("#mode-rapport").addEventListener("click", () => setMode("rapport"));
}

document.addEventListener("DOMContentLoaded", init);
