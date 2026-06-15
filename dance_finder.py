#!/usr/bin/env python3
"""
Outil de recherche d'écoles de danse — Aix-les-Bains
Génère des rapports HTML, CSV et TXT à partir des données saisies.

Usage:
  python3 dance_finder.py             # Mode interactif
  python3 dance_finder.py --report    # Génère tous les rapports
  python3 dance_finder.py --csv       # Export CSV seulement
  python3 dance_finder.py --html      # Export HTML seulement
"""

import json
import math
import csv
import sys
import os
from datetime import datetime, date

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────

REFERENCE = {
    "name": "École Saint-Joseph",
    "address": "Place du Rondeau, 73100 Aix-les-Bains",
    "lat": 45.699417,
    "lng": 5.904397,
}

CRITERIA = {
    "age": 5,
    "days": ["lundi", "mardi", "vendredi"],
    "min_time": "16:30",
    "school_year": "2025-2026",
}

DATA_FILE = "dance_schools_data.json"

SCHOOLS_DEFAULT = [
    {
        "id": "academie",
        "name": "L'Académie",
        "address": "670 Boulevard Lepic, 73100 Aix-les-Bains",
        "lat": 45.7001,
        "lng": 5.8937,
        "coords_approx": True,
        "phone": "",
        "website": "",
        "contact_status": "non_contacte",
        "notes": "",
        "schedules": [],
    },
    {
        "id": "doriane",
        "name": "Doriane Danse Académie",
        "address": "670 Boulevard Lepic, 73100 Aix-les-Bains",
        "lat": 45.7001,
        "lng": 5.8937,
        "coords_approx": True,
        "phone": "",
        "website": "",
        "contact_status": "non_contacte",
        "notes": "",
        "schedules": [],
    },
    {
        "id": "accordanses",
        "name": "Accor'Danses",
        "address": "40 Rue du Professeur Jean Bernard, 73100 Aix-les-Bains",
        "lat": 45.6872,
        "lng": 5.9183,
        "coords_approx": True,
        "phone": "",
        "website": "",
        "contact_status": "non_contacte",
        "notes": "",
        "schedules": [],
    },
    {
        "id": "verriere",
        "name": "Espace La Verrière",
        "address": "8 Avenue Charles de Gaulle, 73100 Aix-les-Bains",
        "lat": 45.6853,
        "lng": 5.9215,
        "coords_approx": True,
        "phone": "",
        "website": "",
        "contact_status": "non_contacte",
        "notes": "",
        "schedules": [],
    },
    {
        "id": "boutron",
        "name": "Reine Boutron",
        "address": "31 Avenue Liberté, 73100 Aix-les-Bains",
        "lat": 45.6935,
        "lng": 5.9108,
        "coords_approx": True,
        "phone": "",
        "website": "",
        "contact_status": "non_contacte",
        "notes": "",
        "schedules": [],
    },
    {
        "id": "mamborock",
        "name": "Mambo Rock",
        "address": "10 Rue du Docteur Jean Paillot, 73100 Aix-les-Bains",
        "lat": 45.6879,
        "lng": 5.9097,
        "coords_approx": True,
        "phone": "",
        "website": "",
        "contact_status": "non_contacte",
        "notes": "",
        "schedules": [],
    },
]

# ─────────────────────────────────────────────
# DATA PERSISTENCE
# ─────────────────────────────────────────────

def load_schools():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, encoding="utf-8") as f:
            stored = json.load(f)
        by_id = {s["id"]: s for s in stored}
        for school in SCHOOLS_DEFAULT:
            if school["id"] in by_id:
                school.update(by_id[school["id"]])
    return SCHOOLS_DEFAULT


def save_schools(schools):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(schools, f, ensure_ascii=False, indent=2)
    print(f"  ✓ Données sauvegardées dans {DATA_FILE}")


# ─────────────────────────────────────────────
# DISTANCE
# ─────────────────────────────────────────────

def haversine(lat1, lng1, lat2, lng2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def dist_km(school):
    return haversine(REFERENCE["lat"], REFERENCE["lng"], school["lat"], school["lng"])


# ─────────────────────────────────────────────
# FILTERING
# ─────────────────────────────────────────────

def schedule_matches(sched, criteria=None):
    if criteria is None:
        criteria = CRITERIA
    if sched["day"] not in criteria["days"]:
        return False
    if sched["time_start"] < criteria["min_time"]:
        return False
    age = criteria["age"]
    if sched.get("age_min") is not None and age < sched["age_min"]:
        return False
    if sched.get("age_max") is not None and age > sched["age_max"]:
        return False
    return True


def matching_schedules(school, criteria=None):
    return [s for s in school["schedules"] if schedule_matches(s, criteria)]


# ─────────────────────────────────────────────
# REPORT: TXT
# ─────────────────────────────────────────────

def generate_txt(schools, criteria=None, output_file="rapport_danse.txt"):
    if criteria is None:
        criteria = CRITERIA
    sorted_schools = sorted(schools, key=dist_km)
    lines = [
        "=" * 65,
        "  ÉCOLES DE DANSE — AIX-LES-BAINS",
        f"  Année scolaire {criteria.get('school_year','2025-2026')}",
        "=" * 65,
        f"  Référence : {REFERENCE['name']}",
        f"             {REFERENCE['address']}",
        "",
        f"  Critères : âge {criteria['age']} ans | "
        f"jours : {', '.join(criteria['days'])} | "
        f"après {criteria['min_time']}",
        "=" * 65,
        "",
    ]

    status_labels = {
        "non_contacte": "Non contacté",
        "en_cours": "En attente de réponse",
        "confirme": "Informations confirmées",
        "inscrit": "Inscrit ✓",
        "pas_de_cours": "Pas de cours adapté",
    }

    for school in sorted_schools:
        d = dist_km(school)
        matches = matching_schedules(school, criteria)
        approx_note = " (GPS approx.)" if school.get("coords_approx") else ""
        match_note = f"  ✅ {len(matches)} créneau(x) correspondant(s)" if matches else ""

        lines += [
            f"┌─ {school['name']}",
            f"│  📍 {school['address']}",
            f"│  📏 Distance : {d:.2f} km{approx_note}",
            f"│  📞 {school.get('phone') or 'N/A'}",
            f"│  Statut : {status_labels.get(school['contact_status'], school['contact_status'])}",
        ]
        if match_note:
            lines.append(f"│  {match_note}")

        if school["schedules"]:
            lines.append("│")
            lines.append("│  Horaires saisis :")
            for s in school["schedules"]:
                ok = "✅" if schedule_matches(s, criteria) else "  "
                age_range = f"{s.get('age_min','?')}-{s.get('age_max','?')} ans"
                end = f"–{s['time_end']}" if s.get("time_end") else ""
                price = f"  [{s['price']}]" if s.get("price") else ""
                lines.append(
                    f"│  {ok} {s['day'].capitalize():10s} "
                    f"{s['time_start']}{end:7s}  {s['type']:30s}  "
                    f"{age_range:12s}{price}"
                )
        else:
            lines.append("│  (Aucun horaire saisi — à contacter)")

        if school.get("notes"):
            lines.append(f"│  Notes : {school['notes']}")

        lines += ["└" + "─" * 64, ""]

    lines += [
        "─" * 65,
        f"Rapport généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}",
        "─" * 65,
    ]

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  ✓ Rapport TXT → {output_file}")
    return output_file


# ─────────────────────────────────────────────
# REPORT: CSV
# ─────────────────────────────────────────────

def generate_csv(schools, criteria=None, output_file="rapport_danse.csv"):
    if criteria is None:
        criteria = CRITERIA
    sorted_schools = sorted(schools, key=dist_km)
    status_labels = {
        "non_contacte": "Non contacté",
        "en_cours": "En attente de réponse",
        "confirme": "Informations confirmées",
        "inscrit": "Inscrit",
        "pas_de_cours": "Pas de cours adapté",
    }

    with open(output_file, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        writer.writerow([
            "École", "Adresse", "Téléphone", "Distance (km)", "GPS approx.",
            "Statut contact", "Jour", "Heure début", "Heure fin",
            "Type de cours", "Âge min", "Âge max",
            "Tarif", "Durée", "Correspond aux critères",
            "Notes école", "Notes cours"
        ])
        for school in sorted_schools:
            d = round(dist_km(school), 3)
            base = [
                school["name"],
                school["address"],
                school.get("phone", ""),
                d,
                "Oui" if school.get("coords_approx") else "Non",
                status_labels.get(school["contact_status"], school["contact_status"]),
            ]
            if not school["schedules"]:
                writer.writerow(base + [""] * 10 + [school.get("notes", ""), ""])
            else:
                for sched in school["schedules"]:
                    match = "Oui" if schedule_matches(sched, criteria) else "Non"
                    writer.writerow(base + [
                        sched["day"],
                        sched.get("time_start", ""),
                        sched.get("time_end", ""),
                        sched.get("type", ""),
                        sched.get("age_min", ""),
                        sched.get("age_max", ""),
                        sched.get("price", ""),
                        sched.get("duration", ""),
                        match,
                        school.get("notes", ""),
                        sched.get("notes", ""),
                    ])

    print(f"  ✓ Rapport CSV → {output_file}")
    return output_file


# ─────────────────────────────────────────────
# REPORT: HTML
# ─────────────────────────────────────────────

def generate_html(schools, criteria=None, output_file="rapport_danse.html"):
    if criteria is None:
        criteria = CRITERIA
    sorted_schools = sorted(schools, key=dist_km)
    now = datetime.now().strftime("%d/%m/%Y à %H:%M")

    status_labels = {
        "non_contacte": "Non contacté",
        "en_cours": "En attente",
        "confirme": "Confirmé",
        "inscrit": "Inscrit ✓",
        "pas_de_cours": "Pas adapté",
    }
    status_colors = {
        "non_contacte": "#6b7280",
        "en_cours": "#d97706",
        "confirme": "#059669",
        "inscrit": "#059669",
        "pas_de_cours": "#dc2626",
    }
    day_colors = {
        "lundi": "#1d4ed8", "mardi": "#15803d",
        "mercredi": "#854d0e", "jeudi": "#9d174d",
        "vendredi": "#6d28d9", "samedi": "#c2410c",
    }
    day_bg = {
        "lundi": "#dbeafe", "mardi": "#dcfce7",
        "mercredi": "#fef9c3", "jeudi": "#fce7f3",
        "vendredi": "#ede9fe", "samedi": "#ffedd5",
    }

    schools_html = []
    for school in sorted_schools:
        d = dist_km(school)
        matches = matching_schedules(school, criteria)
        border = "#22c55e" if matches else "#e2d9f3"
        match_badge = (
            f'<span style="color:#059669;font-size:.8rem;font-weight:700;">'
            f'✅ {len(matches)} créneau(x) correspondant(s)</span>'
            if matches else ""
        )
        approx = " <small style='color:#d97706;font-style:italic;'>(GPS approx.)</small>" \
            if school.get("coords_approx") else ""

        rows = []
        for s in school["schedules"]:
            ok = schedule_matches(s, criteria)
            dc = day_colors.get(s["day"], "#374151")
            db = day_bg.get(s["day"], "#f3f4f6")
            end = f"–{s['time_end']}" if s.get("time_end") else ""
            rows.append(f"""
            <tr style="background:{'#f0fdf4' if ok else '#fff'}">
              <td><span style="background:{db};color:{dc};border-radius:4px;padding:2px 7px;font-size:.75rem;font-weight:700;">
                {s['day'].capitalize()}</span></td>
              <td>{s.get('time_start','')}{end}</td>
              <td>{s.get('type','')}</td>
              <td>{s.get('age_min','?')}–{s.get('age_max','?')} ans</td>
              <td>{s.get('price','—')}</td>
              <td>{'✅' if ok else '○'}</td>
            </tr>""")

        table = ""
        if rows:
            table = f"""
            <table style="width:100%;border-collapse:collapse;font-size:.82rem;margin-top:10px;">
              <thead>
                <tr style="background:#f5f0fd;">
                  <th style="padding:6px 8px;text-align:left;color:#6b7280;font-size:.72rem;">Jour</th>
                  <th style="padding:6px 8px;text-align:left;color:#6b7280;font-size:.72rem;">Horaire</th>
                  <th style="padding:6px 8px;text-align:left;color:#6b7280;font-size:.72rem;">Cours</th>
                  <th style="padding:6px 8px;text-align:left;color:#6b7280;font-size:.72rem;">Âge</th>
                  <th style="padding:6px 8px;text-align:left;color:#6b7280;font-size:.72rem;">Tarif</th>
                  <th style="padding:6px 8px;text-align:left;color:#6b7280;font-size:.72rem;">✓</th>
                </tr>
              </thead>
              <tbody>{''.join(rows)}</tbody>
            </table>"""
        else:
            table = "<p style='color:#9ca3af;font-style:italic;font-size:.83rem;'>Aucun horaire saisi</p>"

        sc = status_colors.get(school["contact_status"], "#6b7280")
        sl = status_labels.get(school["contact_status"], school["contact_status"])
        notes_html = (
            f'<p style="font-size:.82rem;color:#374151;margin-top:8px;padding:8px 12px;'
            f'background:#fafafa;border-radius:6px;">📝 {school["notes"]}</p>'
            if school.get("notes") else ""
        )

        schools_html.append(f"""
        <div style="border:2px solid {border};border-radius:12px;overflow:hidden;margin-bottom:20px;break-inside:avoid;">
          <div style="background:linear-gradient(90deg,#ede8fa,#f5f0fd);padding:14px 18px;
                      display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:1rem;font-weight:700;color:#6c3fc5;">{school['name']}</div>
              {match_badge}
            </div>
            <span style="background:#6c3fc5;color:#fff;border-radius:20px;padding:3px 14px;
                         font-size:.8rem;font-weight:700;">{d:.2f} km{approx}</span>
          </div>
          <div style="padding:14px 18px;">
            <p style="font-size:.84rem;color:#6b7280;">📍 {school['address']}</p>
            {f'<p style="font-size:.84rem;color:#374151;">📞 {school["phone"]}</p>' if school.get("phone") else ""}
            <p style="font-size:.82rem;margin-top:6px;">
              Statut : <span style="color:{sc};font-weight:600;">{sl}</span>
            </p>
            {table}
            {notes_html}
          </div>
        </div>""")

    all_matches = [s for school in sorted_schools for s in matching_schedules(school, criteria)]
    summary = (
        f"<strong>{len(all_matches)}</strong> créneau(x) correspondant(s) trouvé(s) "
        f"dans <strong>{sum(1 for s in sorted_schools if matching_schedules(s, criteria))}</strong> "
        f"école(s) sur {len(sorted_schools)}."
        if any(school["schedules"] for school in sorted_schools)
        else "Aucun horaire saisi pour le moment. Contactez les écoles et saisissez les créneaux."
    )

    html = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Rapport — Écoles de Danse Aix-les-Bains</title>
  <style>
    body {{ font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; background: #f8f7fc; color: #1a1229; }}
    .page {{ max-width: 900px; margin: 0 auto; padding: 32px 20px; }}
    @media print {{ body {{ background: #fff; }} .no-print {{ display: none; }} }}
    table {{ border-collapse: collapse; }}
  </style>
</head>
<body>
<div class="page">
  <div style="background:linear-gradient(135deg,#6c3fc5,#9b59b6);color:#fff;padding:24px 28px;
              border-radius:12px;margin-bottom:24px;">
    <h1 style="font-size:1.6rem;font-weight:700;margin:0 0 4px;">🩰 Écoles de Danse — Aix-les-Bains</h1>
    <p style="margin:0;opacity:.85;">Année scolaire {criteria.get('school_year','2025-2026')}</p>
    <p style="margin:8px 0 0;font-size:.85rem;opacity:.8;">
      Référence : {REFERENCE['name']}, {REFERENCE['address']}<br>
      Critères : {criteria['age']} ans · {', '.join(criteria['days'])} · après {criteria['min_time']}
    </p>
  </div>

  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 18px;
              margin-bottom:20px;font-size:.85rem;color:#92400e;">
    {summary}
  </div>

  {''.join(schools_html)}

  <p style="text-align:center;font-size:.75rem;color:#9ca3af;margin-top:24px;">
    Rapport généré le {now} · École de référence : {REFERENCE['name']} ({REFERENCE['lat']}, {REFERENCE['lng']})
  </p>
</div>
</body>
</html>"""

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  ✓ Rapport HTML → {output_file}")
    return output_file


# ─────────────────────────────────────────────
# INTERACTIVE CLI
# ─────────────────────────────────────────────

def prompt(label, default=""):
    val = input(f"  {label}{' [' + default + ']' if default else ''}: ").strip()
    return val if val else default


def add_schedule_interactive(school):
    print(f"\n  → Ajout d'un créneau pour {school['name']}")
    days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
    print(f"    Jours disponibles : {', '.join(f'{i+1}={d}' for i,d in enumerate(days))}")
    day_num = input("    Choisir le jour (1-6) : ").strip()
    try:
        day = days[int(day_num) - 1]
    except (ValueError, IndexError):
        day = "lundi"

    time_start = prompt("Heure début (ex: 16:30)", "16:30")
    time_end = prompt("Heure fin (ex: 17:30)", "17:30")
    stype = prompt("Type de cours", "Éveil danse")
    age_min = prompt("Âge minimum", "4")
    age_max = prompt("Âge maximum", "6")
    price = prompt("Tarif (ex: 380€/an)", "")
    duration = prompt("Durée (ex: 45 min)", "")
    notes = prompt("Notes", "")

    school["schedules"].append({
        "day": day,
        "time_start": time_start,
        "time_end": time_end,
        "type": stype,
        "age_min": int(age_min) if age_min.isdigit() else None,
        "age_max": int(age_max) if age_max.isdigit() else None,
        "price": price,
        "duration": duration,
        "notes": notes,
    })
    print(f"  ✓ Créneau ajouté ({day} {time_start}–{time_end})")


def interactive(schools):
    print("\n" + "=" * 60)
    print("  ÉCOLES DE DANSE — AIX-LES-BAINS")
    print("=" * 60)
    print("  1. Afficher les écoles et distances")
    print("  2. Saisir les horaires d'une école")
    print("  3. Générer les rapports")
    print("  4. Quitter")
    print()

    while True:
        choice = input("→ Votre choix : ").strip()

        if choice == "1":
            sorted_s = sorted(schools, key=dist_km)
            print("\n  Écoles triées par distance depuis l'École Saint-Joseph :\n")
            for i, school in enumerate(sorted_s, 1):
                d = dist_km(school)
                approx = " (~)" if school.get("coords_approx") else ""
                matches = len(matching_schedules(school))
                match_str = f"  ✅ {matches} créneau(x)" if matches else "  (aucun horaire)"
                print(f"  {i}. {school['name']}")
                print(f"     {school['address']}")
                print(f"     Distance : {d:.2f} km{approx}{match_str}")
                print()

        elif choice == "2":
            sorted_s = sorted(schools, key=dist_km)
            print("\n  Choisir une école :")
            for i, s in enumerate(sorted_s, 1):
                print(f"  {i}. {s['name']} ({len(s['schedules'])} horaire(s))")
            try:
                idx = int(input("  N° de l'école : ").strip()) - 1
                school = sorted_s[idx]
            except (ValueError, IndexError):
                print("  Choix invalide.")
                continue

            # Update contact info
            phone = prompt("Téléphone", school.get("phone", ""))
            school["phone"] = phone
            status_opts = {
                "1": "non_contacte", "2": "en_cours",
                "3": "confirme", "4": "inscrit", "5": "pas_de_cours"
            }
            print("  Statut : 1=Non contacté  2=En cours  3=Confirmé  4=Inscrit  5=Pas adapté")
            st = input("  Statut [1-5] : ").strip()
            school["contact_status"] = status_opts.get(st, school["contact_status"])

            while True:
                add_more = input("  Ajouter un créneau ? (o/n) : ").strip().lower()
                if add_more in ("o", "oui", "y", "yes"):
                    add_schedule_interactive(school)
                else:
                    break

            notes = prompt("Notes sur l'école", school.get("notes", ""))
            school["notes"] = notes
            save_schools(schools)

        elif choice == "3":
            print()
            generate_txt(schools)
            generate_csv(schools)
            generate_html(schools)
            print("\n  Rapports générés avec succès !")

        elif choice in ("4", "q", "quit", "exit"):
            print("  Au revoir !")
            break
        else:
            print("  Choix non reconnu.")


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────

def main():
    schools = load_schools()
    args = sys.argv[1:]

    if "--report" in args or (not args and sys.stdin.isatty()):
        if "--report" in args:
            generate_txt(schools)
            generate_csv(schools)
            generate_html(schools)
        else:
            interactive(schools)
    elif "--csv" in args:
        generate_csv(schools)
    elif "--html" in args:
        generate_html(schools)
    elif "--txt" in args:
        generate_txt(schools)
    elif "--json" in args:
        data = {
            "generated": datetime.now().isoformat(),
            "reference": REFERENCE,
            "criteria": CRITERIA,
            "schools": sorted(
                [
                    {**s, "distance_km": round(dist_km(s), 3),
                     "matching_schedules": len(matching_schedules(s))}
                    for s in schools
                ],
                key=lambda x: x["distance_km"]
            ),
        }
        out = "rapport_danse.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  ✓ Export JSON → {out}")
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
