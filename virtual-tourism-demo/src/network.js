// Pure graph functions: no ArcGIS, tour state or camera dependencies.
export function prepareNetwork(data) {
  if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    throw new Error("Mạng đường phải có hai mảng nodes và edges.");
  }
  const nodes = new Map(), adjacency = new Map(), edgeIds = new Set();
  const validId = (id) => typeof id === "string" && id.trim().length > 0;
  const validPoint = (point) => Array.isArray(point) && point.length === 2
    && Number.isFinite(point[0]) && Math.abs(point[0]) <= 180
    && Number.isFinite(point[1]) && Math.abs(point[1]) <= 90;
  const samePoint = (a, b) => a.every((value, index) => Math.abs(value - b[index]) <= 1e-8);
  for (const node of data.nodes) {
    if (!node || !validId(node.id) || nodes.has(node.id)
      || !validPoint([node.longitude, node.latitude])) {
      throw new Error("Nút thiếu mã, trùng mã hoặc có tọa độ không hợp lệ.");
    }
    nodes.set(node.id, node);
    adjacency.set(node.id, []);
  }
  for (const edge of data.edges) {
    if (!edge || !validId(edge.id) || edgeIds.has(edge.id)
      || !nodes.has(edge.from) || !nodes.has(edge.to)
      || !Number.isFinite(edge.lengthMeters) || edge.lengthMeters < 0
      || edge.lengthMeters > Number.MAX_SAFE_INTEGER || typeof edge.oneWay !== "boolean") {
      throw new Error("Cạnh thiếu/trùng mã, tham chiếu nút sai, chiều dài không hợp lệ hoặc thiếu oneWay (true/false).");
    }
    const from = nodes.get(edge.from), to = nodes.get(edge.to);
    if (edge.path != null && (!Array.isArray(edge.path) || edge.path.length < 2
      || !edge.path.every(validPoint)
      || !samePoint(edge.path[0], [from.longitude, from.latitude])
      || !samePoint(edge.path.at(-1), [to.longitude, to.latitude]))) {
      throw new Error(`Hình học cạnh “${edge.id}” phải đi từ nút from tới nút to bằng cặp kinh độ/vĩ độ.`);
    }
    edgeIds.add(edge.id);
    adjacency.get(edge.from).push({ from: edge.from, to: edge.to, edge, reversed: false });
    if (!edge.oneWay) {
      adjacency.get(edge.to).push({ from: edge.to, to: edge.from, edge, reversed: true });
    }
  }
  return { nodes, adjacency, edgeCount: edgeIds.size, metadata: data.metadata ?? {} };
}

export function findShortestPath(network, startId, endId) {
  if (!network.nodes.has(startId) || !network.nodes.has(endId)) {
    throw new Error("Nút đầu hoặc nút cuối không tồn tại trong mạng.");
  }
  const remaining = new Set(network.nodes.keys());
  const distances = new Map([...remaining].map((id) => [id, Infinity]));
  const previous = new Map();
  distances.set(startId, 0);
  // Dijkstra with linear minimum selection: O(V² + E), suitable for the teaching demo.
  while (remaining.size) {
    let current = null, distance = Infinity;
    for (const id of remaining) {
      if (distances.get(id) < distance) { current = id; distance = distances.get(id); }
    }
    if (current === null) break; // All remaining nodes are unreachable.
    remaining.delete(current);
    if (current === endId) break;
    for (const step of network.adjacency.get(current)) {
      if (!remaining.has(step.to)) continue;
      const candidate = distance + step.edge.lengthMeters;
      if (!Number.isFinite(candidate) || candidate > Number.MAX_SAFE_INTEGER) {
        throw new Error("Tổng chiều dài vượt phạm vi số được hỗ trợ.");
      }
      if (candidate < distances.get(step.to)) {
        distances.set(step.to, candidate);
        previous.set(step.to, step);
      }
    }
  }
  if (distances.get(endId) === Infinity) return null;
  const steps = [];
  for (let id = endId; id !== startId;) {
    const step = previous.get(id);
    steps.push(step);
    id = step.from;
  }
  steps.reverse();
  return { nodeIds: [startId, ...steps.map((step) => step.to)], steps,
    lengthMeters: distances.get(endId) };
}

export function networkRouteGeometry(network, result) {
  if (!result.steps.length) {
    const node = network.nodes.get(result.nodeIds[0]);
    return { type: "point", longitude: node.longitude, latitude: node.latitude,
      spatialReference: { wkid: 4326 } };
  }
  const paths = result.steps.map(({ edge, reversed }) => {
    const from = network.nodes.get(edge.from), to = network.nodes.get(edge.to);
    const path = edge.path ?? [[from.longitude, from.latitude], [to.longitude, to.latitude]];
    return reversed ? [...path].reverse() : path;
  });
  return { type: "polyline", paths, spatialReference: { wkid: 4326 } };
}
