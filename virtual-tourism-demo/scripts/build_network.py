"""Download a bounded OSM road snapshot and build the demo's directed network."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/sources/osm-roads.json"
OUTPUT = ROOT / "data/road-network.json"
BBOX = (10.768, 106.690, 10.784, 106.706)  # south, west, north, east
ENDPOINT = "https://overpass-api.de/api/interpreter"
QUERY = '''[out:json][timeout:60];
way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|primary_link|secondary_link|tertiary_link)$"](10.768,106.690,10.784,106.706);
(._;>;);
out body;
'''


def distance(a, b):
    """Haversine distance in metres on a sphere with mean Earth radius."""
    lon1, lat1, lon2, lat2 = map(math.radians, [*a, *b])
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371008.8 * 2 * math.asin(math.sqrt(min(1, max(0, h))))


def build(source):
    raw_nodes = {str(item["id"]): item for item in source["elements"] if item["type"] == "node"}
    edges, names, used_nodes = [], {}, set()
    excluded = 0
    for way in source["elements"]:
        if way["type"] != "way":
            continue
        tags = way.get("tags", {})
        if any(tags.get(key) in ("no", "private") for key in ("access", "vehicle", "motor_vehicle")):
            excluded += 1
            continue
        oneway = tags.get("oneway", "yes" if tags.get("junction") == "roundabout" else "no").lower()
        if oneway not in ("yes", "1", "true", "-1", "no", "0", "false"):
            excluded += 1
            continue
        node_ids = [str(value) for value in way["nodes"]]
        if oneway == "-1":
            node_ids.reverse()
        for index, (from_id, to_id) in enumerate(zip(node_ids, node_ids[1:])):
            a, b = raw_nodes[from_id], raw_nodes[to_id]
            if not all(BBOX[0] <= p["lat"] <= BBOX[2] and BBOX[1] <= p["lon"] <= BBOX[3] for p in (a, b)):
                continue
            if from_id == to_id:
                continue
            path = [[a["lon"], a["lat"]], [b["lon"], b["lat"]]]
            edges.append({"id": f"osm-way-{way['id']}-{index}", "from": f"osm-{from_id}", "to": f"osm-{to_id}",
                          "lengthMeters": round(distance(*path), 3), "oneWay": oneway in ("yes", "1", "true", "-1"),
                          "path": path, "osmWayId": way["id"], "name": tags.get("name", "")})
            for node_id in (from_id, to_id):
                used_nodes.add(node_id)
                names.setdefault(node_id, set())
                if tags.get("name"):
                    names[node_id].add(tags["name"])
    nodes = [{"id": f"osm-{node_id}", "name": " / ".join(sorted(names[node_id])) or f"Nút OSM {node_id}",
              "longitude": raw_nodes[node_id]["lon"], "latitude": raw_nodes[node_id]["lat"], "osmNodeId": int(node_id)}
             for node_id in sorted(used_nodes, key=int)]
    if not nodes or not edges:
        raise ValueError("OSM snapshot contains no usable network; refusing to overwrite output.")
    places = json.loads((ROOT / "data/places.json").read_text(encoding="utf-8-sig"))
    anchors = []
    for place in places:
        point = [place["longitude"], place["latitude"]]
        nearest = min(nodes, key=lambda node: distance(point, [node["longitude"], node["latitude"]]))
        nearest["name"] = f"Gần {place['name']} · {nearest['name']}"
        anchors.append({"placeId": place["id"], "placeName": place["name"], "nodeId": nearest["id"],
                        "distanceMeters": round(distance(point, [nearest["longitude"], nearest["latitude"]]), 3)})
    return {"metadata": {"source": "OpenStreetMap contributors", "sourceUrl": "https://www.openstreetmap.org/copyright",
                         "license": "ODbL-1.0", "endpoint": ENDPOINT, "query": QUERY,
                         "osmTimestamp": source.get("osm3s", {}).get("timestamp_osm_base"),
                         "sourceSHA256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                         "bbox": list(BBOX), "excludedWays": excluded, "placeAnchors": anchors,
                         "defaultFrom": anchors[0]["nodeId"] if anchors else nodes[0]["id"],
                         "defaultTo": anchors[-1]["nodeId"] if anchors else nodes[-1]["id"]},
            "nodes": nodes, "edges": edges}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="Fetch a fresh OSM snapshot; otherwise use the saved snapshot")
    args = parser.parse_args()
    if args.download:
        request = urllib.request.Request(f"{ENDPOINT}?{urllib.parse.urlencode({'data': QUERY})}",
                                         headers={"User-Agent": "GIS-Learning-Demo/1.0 (educational OSM extract)"})
        with urllib.request.urlopen(request, timeout=80) as response:
            raw = response.read()
        source = json.loads(raw)
        if source.get("remark") or not source.get("elements"):
            raise ValueError(f"Incomplete Overpass response: {source.get('remark', 'no elements')}")
        SOURCE.parent.mkdir(parents=True, exist_ok=True)
        SOURCE.write_bytes(raw)
        (SOURCE.parent / "osm-download.json").write_text(json.dumps({
            "retrievedAtUTC": datetime.now(timezone.utc).isoformat(), "endpoint": ENDPOINT,
            "query": QUERY, "sha256": hashlib.sha256(raw).hexdigest()}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    network = build(source)
    OUTPUT.write_text(json.dumps(network, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"nodes": len(network["nodes"]), "edges": len(network["edges"]),
                      "oneWayEdges": sum(edge["oneWay"] for edge in network["edges"]),
                      "osmTimestamp": network["metadata"]["osmTimestamp"],
                      "placeAnchors": network["metadata"]["placeAnchors"]}, ensure_ascii=True))


if __name__ == "__main__":
    main()
