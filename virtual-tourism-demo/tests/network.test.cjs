const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

(async () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/network.js"), "utf8");
  const { prepareNetwork, findShortestPath, networkRouteGeometry } =
    await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  // Synthetic topology for tests, not a supplied real-world road network.
  const data = {
    nodes: ["a", "b", "c", "d", "z"].map((id, index) => ({ id, longitude: index, latitude: 0 })),
    edges: [
      { id: "ab", from: "a", to: "b", lengthMeters: 8, oneWay: true },
      { id: "ac", from: "a", to: "c", lengthMeters: 2, oneWay: false, path: [[0, 0], [1, 1], [2, 0]] },
      { id: "cb", from: "c", to: "b", lengthMeters: 2, oneWay: true },
      { id: "bd", from: "b", to: "d", lengthMeters: 1, oneWay: false },
      { id: "cd", from: "c", to: "d", lengthMeters: 10, oneWay: false },
    ],
  };
  const graph = prepareNetwork(data);
  const route = findShortestPath(graph, "a", "d");
  assert.deepEqual(route.nodeIds, ["a", "c", "b", "d"]);
  assert.equal(route.lengthMeters, 5);
  assert.deepEqual(route.steps.map((step) => step.edge.id), ["ac", "cb", "bd"]);
  assert.equal(findShortestPath(graph, "d", "a").lengthMeters, 12);
  assert.equal(findShortestPath(graph, "a", "z"), null);
  assert.equal(findShortestPath(graph, "z", "a"), null);
  const same = findShortestPath(graph, "z", "z");
  assert.equal(same.lengthMeters, 0);
  assert.deepEqual(same.steps, []);
  assert.equal(networkRouteGeometry(graph, same).type, "point");
  assert.throws(() => findShortestPath(graph, "unknown", "a"));
  const reverse = findShortestPath(graph, "c", "a");
  assert.deepEqual(networkRouteGeometry(graph, reverse).paths, [[[2, 0], [1, 1], [0, 0]]]);
  assert.deepEqual(data.edges[1].path, [[0, 0], [1, 1], [2, 0]]); // No source mutation.

  const parallel = prepareNetwork({ ...data, edges: [...data.edges,
    { id: "short-ab", from: "a", to: "b", lengthMeters: 0, oneWay: false },
    { id: "loop", from: "a", to: "a", lengthMeters: 0, oneWay: false },
  ] });
  assert.equal(findShortestPath(parallel, "a", "d").lengthMeters, 1);
  assert.equal(findShortestPath(parallel, "a", "d").steps[0].edge.id, "short-ab");
  assert.equal(prepareNetwork({ nodes: [], edges: [] }).nodes.size, 0);
  assert.equal(findShortestPath(prepareNetwork({ ...data, edges: [] }), "a", "b"), null);

  for (const patch of [
    { lengthMeters: -1 }, { lengthMeters: NaN }, { lengthMeters: Infinity },
    { lengthMeters: "8" }, { oneWay: undefined }, { oneWay: "false" }, { from: "missing" },
    { path: [[1, 0], [0, 0]] }, { path: [[0, 0], [200, 0], [1, 0]] }, { path: [] },
  ]) {
    assert.throws(() => prepareNetwork({ ...data, edges: [{ ...data.edges[0], ...patch }] }));
  }
  assert.throws(() => prepareNetwork({ ...data, nodes: [...data.nodes, data.nodes[0]] }));
  assert.throws(() => prepareNetwork({ ...data, edges: [...data.edges, data.edges[0]] }));
  assert.throws(() => prepareNetwork({ nodes: [{ id: "bad", longitude: 0, latitude: 91 }], edges: [] }));
  assert.throws(() => prepareNetwork({}));

  // Validate the shipped network against the saved OSM snapshot, not just test fixtures.
  const actual = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/road-network.json"), "utf8"));
  const originalBytes = fs.readFileSync(path.join(__dirname, "../data/sources/osm-roads.json"));
  assert.equal(crypto.createHash("sha256").update(originalBytes).digest("hex"), actual.metadata.sourceSHA256);
  const osm = JSON.parse(originalBytes);
  const osmNodes = new Map(osm.elements.filter((e) => e.type === "node").map((e) => [e.id, e]));
  const osmWays = new Map(osm.elements.filter((e) => e.type === "way").map((e) => [e.id, e]));
  const actualGraph = prepareNetwork(actual);
  for (const node of actual.nodes) {
    const original = osmNodes.get(node.osmNodeId);
    assert.ok(original);
    assert.equal(node.longitude, original.lon);
    assert.equal(node.latitude, original.lat);
  }
  for (const edge of actual.edges) {
    const way = osmWays.get(edge.osmWayId);
    assert.ok(way);
    const tags = way.tags || {};
    const direction = (tags.oneway || (tags.junction === "roundabout" ? "yes" : "no")).toLowerCase();
    assert.equal(edge.oneWay, ["yes", "1", "true", "-1"].includes(direction));
    const from = actualGraph.nodes.get(edge.from).osmNodeId;
    const to = actualGraph.nodes.get(edge.to).osmNodeId;
    assert.ok(way.nodes.some((id, i) => direction === "-1"
      ? id === to && way.nodes[i + 1] === from : id === from && way.nodes[i + 1] === to));
    assert.ok(edge.path);
  }
  for (const from of actual.metadata.placeAnchors) {
    for (const to of actual.metadata.placeAnchors) {
      const result = findShortestPath(actualGraph, from.nodeId, to.nodeId);
      assert.ok(result);
      assert.equal(result.nodeIds[0], from.nodeId);
      assert.equal(result.nodeIds.at(-1), to.nodeId);
      assert.ok(Math.abs(result.steps.reduce((total, step) => total + step.edge.lengthMeters, 0) - result.lengthMeters) < 1e-8);
    }
  }
  console.log("PASS: Dijkstra weighted optimum, directed/reverse edges, disconnection, same/unknown node, parallel/zero edges, geometry orientation, invalid network data.");
  console.log(`PASS: OSM snapshot checksum, ${actual.nodes.length} real node coordinates, ${actual.edges.length} source edges/directions, six directed routes between place anchors.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
