# -*- coding: utf-8 -*-
"""Reconstruit la topologie « arrêt de transport ↔ ligne » à partir du GTFS complet IDFM,
pour le bloc « Transports à proximité » de la fiche (plans/P3/S4.md).

POURQUOI CE SCRIPT — ET POURQUOI CE JEU
----------------------------------------
Le plan visait initialement l'open data IDFM « arrets-lignes » (Licence Ouverte), le seul jeu qui
porte à la fois les coordonnées d'un arrêt ET les indicatifs de ligne qui le desservent. Ce jeu
est vide au 2026-07-18 (en cours de repeuplement côté IDFM — cf. plans/P3/S4.md §Bilan, tentative
précédente). Aucune autre source `data.iledefrance-mobilites.fr` ne relie arrêt et ligne.

Décision de Thibault (2026-07-18, cf. DECISIONS.md) : construire cette relation une fois, à partir
du GTFS complet **`offre-horaires-tc-gtfs-idfm`** (Licence Mobilité — pas la Licence Ouverte visée
au départ), en se limitant à la **topologie statique** arrêt↔ligne. Ce script ne retient AUCUNE
donnée d'horaire : `stop_times.txt` n'est qu'un moyen (c'est la seule table GTFS qui relie
`stop_id` à `trip_id`, donc à `route_id`), jamais une donnée de sortie.

Licence vérifiée avant ce script (cf. DECISIONS.md 2026-07-18) : la « Licence Mobilités » (texte
complet : https://cloud.fabmob.io/s/eYWWJBdM3fQiFNm) exempte explicitement l'usage interne —
Article 5.6.c : « L'Utilisation d'une Base de données dérivée en interne, au sein d'une
organisation n'est pas considérée comme publique et n'est donc pas soumise aux exigences de
l'Article 5.5 [partage à l'identique]. » L'app est un outil interne à la MSP (~10 membres
authentifiés), sans redistribution publique ni usage commercial : aucune clause bloquante.

COMMENT LE REJOUER
------------------
1. Télécharger le zip GTFS complet (mis à jour 3×/jour, ~106 Mo) :

    curl -o gtfs/IDFM-gtfs.zip https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip

   (URL trouvée via https://transport.data.gouv.fr/datasets/reseau-urbain-et-interurbain-dile-de-france-mobilites,
   à revérifier si elle change — ne pas la deviner : repasser par la page si ce script échoue au
   téléchargement.) Le zip contient tout le réseau (75 opérateurs) : pas de variante « Paris
   seulement » trouvée sur le portail, donc c'est ce fichier qu'on filtre nous-mêmes par bbox.
2. Lancer, en pointant GTFS_ZIP sur le fichier téléchargé (hors dépôt, comme CNAM_DIR) :

    GTFS_ZIP=/chemin/scratch/gtfs/IDFM-gtfs.zip python transit_prep.py

   Sans variable d'environnement, le script cherche `<ce dossier>/gtfs/IDFM-gtfs.zip`.
3. Écrit `src/features/proximite/data/arrets.json` (nom, lat, lng, modes, lignes — RIEN d'autre).

CE QUE LE GTFS CONTIENT — ET COMMENT ON EN EXTRAIT UNIQUEMENT LA TOPOLOGIE
---------------------------------------------------------------------------
`stop_times.txt` pèse ~880 Mo non compressé (9,4 M lignes) : c'est un horaire théorique sur 30
jours glissants, PAS une donnée qu'on veut garder. Le script le lit en flux (`zipfile` + itération
ligne à ligne, jamais chargé en mémoire) uniquement pour apprendre quelles paires
(arrêt, ligne) existent, puis oublie tout le reste (heures, jours de circulation, séquences).

Hiérarchie des arrêts IDFM (`stops.txt`, ~48 000 lignes, celui-ci chargé en mémoire — il est
petit) : `location_type=0` = quai/plateforme (référencé par `stop_times.stop_id`),
`location_type=1` = station (le point nommé, ex. « Pelleport », un seul par lieu — c'est le
niveau qu'on restitue), `location_type=2` = accès/entrée (ignoré, pas de ligne). Chaque quai porte
un `parent_station` vers sa station : on remonte donc chaque passage de `stop_times` jusqu'à la
station avant d'accumuler les lignes, ce qui réalise déjà le regroupement « plusieurs quais, un
même arrêt » demandé par le plan. Un second passage fusionne en plus les stations **homonymes et
proches (< 120 m)** — cas fréquent d'un même arrêt de bus dédoublé en deux `location_type=1`
(un par sens de circulation) — sans jamais fusionner deux arrêts qui partagent juste un nom
courant (« Mairie », « Église »…) à des endroits différents.

Modes (`route_type` GTFS, `routes.txt`) : 0→tram, 1→métro, 2→rer, 3→bus, 6/7 (câble, funiculaire,
très rares dans l'emprise) → autre. **Approximation assumée** : le GTFS ne distingue pas RER et
Transilien/TER au niveau `route_type` (les deux sont `2`, rail) ; le bucket « rer » peut donc
recouvrir une gare Transilien (ex. gares parisiennes). L'indicatif de ligne affiché
(`route_short_name`, ex. « H », « A », « 64 ») reste lui exact — seule l'étiquette de mode est une
simplification, documentée ici et dans le Bilan de S4.md, pas cachée.

Bornage géographique (bbox, pas un polygone de commune — on n'a pas de source fiable pour un
tracé exact des communes limitrophes, et un polygone deviné serait une donnée inventée) :
emprise Paris (48.8156–48.9022 lat, 2.2242–2.4699 lng, valeurs communément citées pour Paris
intra-muros) élargie d'une marge de sécurité (~0.025° lat, ~0.035° lng, soit 2 à 3 km) pour couvrir
la première couronne. Une marge généreuse ne casse rien : `nearestStops()` (T2) recoupe de toute
façon par un rayon en mètres, un arrêt en trop dans le fichier ne remontera simplement jamais.

CE QUE LE FICHIER NE CONTIENT PAS
----------------------------------
Aucune heure de passage, aucun calendrier, aucun identifiant de trajet/véhicule. Uniquement :
nom, coordonnées (5 décimales, ~1 m), modes desservis, indicatifs de ligne — dédupliqués.
"""
import csv
import io
import json
import math
import os
import sys
import time
import unicodedata
import zipfile
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
GTFS_ZIP = os.environ.get("GTFS_ZIP") or os.path.join(HERE, "gtfs", "IDFM-gtfs.zip")
REPO_ROOT = os.path.dirname(os.path.dirname(HERE))
OUT_PATH = os.path.join(REPO_ROOT, "src", "features", "proximite", "data", "arrets.json")

ENCODING = "cp1252"  # vérifié empiriquement sur ce dump (les accents en UTF-8 sont mojibake)

# Emprise Paris intra-muros + marge de sécurité ~2-3 km (cf. docstring). Bbox, pas un polygone
# administratif exact — sciemment approximatif, documenté, jamais deviné champ par champ.
BBOX_LAT_MIN, BBOX_LAT_MAX = 48.790, 48.927
BBOX_LNG_MIN, BBOX_LNG_MAX = 2.189, 2.505

# route_type GTFS -> mode affiché. cf. docstring pour l'approximation du bucket "rer".
ROUTE_TYPE_MODE = {
    "0": "tram",
    "1": "metro",
    "2": "rer",
    "3": "bus",
}
FALLBACK_MODE = "autre"

# Distance de fusion des arrêts homonymes proches (un même arrêt dédoublé par sens de circulation).
HOMONYM_MERGE_M = 120

EARTH_RADIUS_M = 6371000


def in_bbox(lat, lng):
    return BBOX_LAT_MIN <= lat <= BBOX_LAT_MAX and BBOX_LNG_MIN <= lng <= BBOX_LNG_MAX


def haversine_m(lat1, lng1, lat2, lng2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(h))


def normalize_name(name):
    n = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    return " ".join(n.lower().split())


def natural_key(label):
    """Tri « naturel » des indicatifs de ligne (1, 2, ..., 13, 3bis avant 4, T1 avant T10)."""
    parts = []
    num = ""
    for ch in label:
        if ch.isdigit():
            num += ch
        else:
            if num:
                parts.append((0, int(num)))
                num = ""
            parts.append((1, ch.lower()))
    if num:
        parts.append((0, int(num)))
    return parts


def open_text(zf, name):
    return io.TextIOWrapper(zf.open(name), encoding=ENCODING, newline="")


def main():
    if not os.path.isfile(GTFS_ZIP):
        print(f"Introuvable : {GTFS_ZIP}", file=sys.stderr)
        print("Cf. l'en-tête du script pour l'URL de téléchargement.", file=sys.stderr)
        sys.exit(1)

    t0 = time.time()
    zf = zipfile.ZipFile(GTFS_ZIP)

    # 1. routes.txt (petit) -> route_id -> (indicatif, mode)
    route_info = {}
    with open_text(zf, "routes.txt") as f:
        for row in csv.DictReader(f):
            mode = ROUTE_TYPE_MODE.get(row["route_type"], FALLBACK_MODE)
            label = (row["route_short_name"] or row["route_long_name"] or "").strip()
            if label:
                route_info[row["route_id"]] = (label, mode)
    print(f"routes.txt : {len(route_info)} lignes référencées")

    # 2. trips.txt (52 Mo, 440k lignes) -> trip_id -> (indicatif, mode). Chargé en mémoire une
    # fois (dictionnaire de tuples de chaînes courtes) : ça reste largement raisonnable.
    trip_route = {}
    with open_text(zf, "trips.txt") as f:
        reader = csv.reader(f)
        header = next(reader)
        i_trip, i_route = header.index("trip_id"), header.index("route_id")
        for row in reader:
            info = route_info.get(row[i_route])
            if info:
                trip_route[row[i_trip]] = info
    print(f"trips.txt : {len(trip_route)} trajets retenus en {time.time() - t0:.1f}s")

    # 3. stops.txt (petit, ~48k lignes) -> stations (location_type=1) dans la bbox + mapping
    # quai -> station pour la jointure avec stop_times.
    station_coords = {}  # station_id -> (nom, lat, lng)
    parent_of = {}  # stop_id (quai) -> station_id (parent_station)
    with open_text(zf, "stops.txt") as f:
        for row in csv.DictReader(f):
            if row["location_type"] == "1":
                try:
                    lat, lng = float(row["stop_lat"]), float(row["stop_lon"])
                except ValueError:
                    continue
                if in_bbox(lat, lng):
                    station_coords[row["stop_id"]] = (row["stop_name"], lat, lng)
            if row["parent_station"]:
                parent_of[row["stop_id"]] = row["parent_station"]
    stations_in_bbox = set(station_coords)
    print(f"stops.txt : {len(stations_in_bbox)} stations dans la bbox")

    # Jointure quai -> station, restreinte aux stations qui nous intéressent (borne le travail
    # de l'étape 4 : la plupart des lignes de stop_times seront ignorées d'un simple lookup raté).
    quai_to_station = {
        quai: station for quai, station in parent_of.items() if station in stations_in_bbox
    }

    # 4. stop_times.txt (883 Mo, 9,4M lignes) — LU EN FLUX, jamais chargé en mémoire. On ne retient
    # que l'ensemble des (indicatif, mode) vus par station : aucune heure, aucun calendrier.
    station_lines = defaultdict(set)
    seen = 0
    with open_text(zf, "stop_times.txt") as f:
        reader = csv.reader(f)
        header = next(reader)
        i_trip, i_stop = header.index("trip_id"), header.index("stop_id")
        for row in reader:
            seen += 1
            station = quai_to_station.get(row[i_stop]) or (
                row[i_stop] if row[i_stop] in stations_in_bbox else None
            )
            if station is None:
                continue
            info = trip_route.get(row[i_trip])
            if info:
                station_lines[station].add(info)
    print(f"stop_times.txt : {seen} lignes lues en flux, {time.time() - t0:.1f}s écoulées")

    # 5. Construction des enregistrements de sortie (une station sans ligne active dans cet
    # instantané de 30 jours n'apporte rien à la fonctionnalité : elle n'est pas incluse).
    records = []
    for station_id, (nom, lat, lng) in station_coords.items():
        lines = station_lines.get(station_id)
        if not lines:
            continue
        modes = sorted({mode for _, mode in lines})
        lignes = sorted({label for label, _ in lines}, key=natural_key)
        records.append(
            {
                "id": station_id,
                "nom": nom,
                "lat": round(lat, 5),
                "lng": round(lng, 5),
                "modes": modes,
                "lignes": lignes,
            }
        )
    print(f"{len(records)} arrêts avec au moins une ligne active")

    # 6. Fusion des homonymes proches (< HOMONYM_MERGE_M) : un même arrêt dédoublé (quais/sens de
    # circulation) en plusieurs stations GTFS distinctes. On ne fusionne QUE si le nom normalisé
    # est identique ET la distance est sous le seuil — un nom générique partagé par deux endroits
    # éloignés (« Mairie ») n'est jamais fusionné.
    by_name = defaultdict(list)
    for rec in records:
        by_name[normalize_name(rec["nom"])].append(rec)

    merged = []
    for _, group in by_name.items():
        used = [False] * len(group)
        for i, rec in enumerate(group):
            if used[i]:
                continue
            cluster = [rec]
            used[i] = True
            for j in range(i + 1, len(group)):
                if used[j]:
                    continue
                other = group[j]
                if haversine_m(rec["lat"], rec["lng"], other["lat"], other["lng"]) <= HOMONYM_MERGE_M:
                    cluster.append(other)
                    used[j] = True
            if len(cluster) == 1:
                merged.append(rec)
            else:
                modes = sorted({m for r in cluster for m in r["modes"]})
                lignes = sorted({l for r in cluster for l in r["lignes"]}, key=natural_key)
                merged.append(
                    {
                        "id": cluster[0]["id"],
                        "nom": cluster[0]["nom"],
                        "lat": cluster[0]["lat"],
                        "lng": cluster[0]["lng"],
                        "modes": modes,
                        "lignes": lignes,
                    }
                )
    merged.sort(key=lambda r: r["id"])
    print(f"{len(merged)} arrêts après fusion des homonymes proches (< {HOMONYM_MERGE_M} m)")

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, separators=(",", ":"))

    size_ko = os.path.getsize(OUT_PATH) / 1024
    print(f"Écrit {OUT_PATH} ({size_ko:.1f} ko) en {time.time() - t0:.1f}s au total")


if __name__ == "__main__":
    main()
