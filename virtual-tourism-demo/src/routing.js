import { prepareNetwork, findShortestPath, networkRouteGeometry } from "./network.js";

// Network analysis has its own controls/layer and never changes tour progress or camera.
export async function initializeRouting({ map, GraphicsLayer, Graphic }) {
  const ui = Object.fromEntries(["from", "to", "find", "clear", "status", "result", "source"].map((key) =>
    [key, document.querySelector(`#network-${key}`)]));
  for (const key of ["from", "to", "find", "clear"]) ui[key].disabled = true;
  function report(message, state) {
    ui.status.textContent = message;
    ui.status.dataset.state = state;
  }
  report("Đang tải mạng đường…", "loading");
  let network;
  try {
    const response = await fetch(new URL("../data/road-network.json", import.meta.url));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    network = prepareNetwork(await response.json());
  } catch (error) {
    report(`Không đọc được mạng đường: ${error.message} Kiểm tra road-network.json và tải lại trang.`, "error");
    return null;
  }
  if (!network.nodes.size) {
    report("Chưa có mạng đường. Bổ sung nút, cạnh và chiều dài vào data/road-network.json để tìm đường.", "empty");
    return null;
  }
  const layer = new GraphicsLayer({ title: "Tuyến ngắn nhất — Dijkstra trên mạng đường",
    elevationInfo: { mode: "on-the-ground" }, popupEnabled: false });
  map.add(layer);
  const nameOf = (id) => network.nodes.get(id).name || id;
  const readyMessage = `Mạng có ${network.nodes.size} nút, ${network.edgeCount} cạnh. Chọn nút đầu và nút cuối.`;
  for (const node of network.nodes.values()) {
    for (const key of ["from", "to"]) {
      const option = document.createElement("option");
      option.value = node.id;
      option.textContent = node.name ? `${node.name} (${node.id})` : node.id;
      ui[key].append(option);
    }
  }
  const ids = [...network.nodes.keys()];
  ui.from.value = network.nodes.has(network.metadata.defaultFrom) ? network.metadata.defaultFrom : ids[0];
  ui.to.value = network.nodes.has(network.metadata.defaultTo) ? network.metadata.defaultTo : (ids[1] ?? ids[0]);
  if (network.metadata.source) {
    ui.source.textContent = `Nguồn: ${network.metadata.source} · ${network.metadata.license || "Chưa ghi giấy phép"}`;
    try {
      const url = new URL(network.metadata.sourceUrl);
      if (["https:", "http:"].includes(url.protocol)) {
        const link = document.createElement("a");
        link.href = url.href;
        link.textContent = "Nguồn và giấy phép dữ liệu";
        ui.source.append(" · ", link);
      }
    } catch { /* A source label is still shown if no valid source URL is provided. */ }
  }
  for (const key of ["from", "to", "find"]) ui[key].disabled = false;

  function clear() {
    layer.removeAll();
    ui.result.textContent = "";
    ui.clear.disabled = true;
    report(readyMessage, "ready");
  }
  ui.from.addEventListener("change", clear);
  ui.to.addEventListener("change", clear);
  ui.clear.addEventListener("click", clear);
  ui.find.addEventListener("click", () => {
    layer.removeAll();
    ui.result.textContent = "";
    ui.clear.disabled = true;
    try {
      const result = findShortestPath(network, ui.from.value, ui.to.value);
      if (!result) {
        report("Không có đường từ nút đầu tới nút cuối theo chiều cạnh được cung cấp. Các nút có thể không liên thông hoặc bị hạn chế một chiều.", "empty");
        return;
      }
      const geometry = networkRouteGeometry(network, result);
      layer.add(new Graphic({ geometry, symbol: geometry.type === "point"
        ? { type: "simple-marker", color: "#165dcc", size: 14, outline: { color: "white", width: 2 } }
        : { type: "simple-line", color: "#165dcc", width: 5, style: "solid" } }));
      ui.clear.disabled = false;
      const length = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(result.lengthMeters);
      ui.result.textContent = `${result.nodeIds.map(nameOf).join(" → ")} · ${length} m · ${result.steps.length} cạnh.`;
      const geometryNote = result.steps.some((step) => !step.edge.path)
        ? " Một số cạnh thiếu hình học: hiển thị đoạn thẳng giữa các nút mạng, chưa khẳng định bám đường thực tế." : "";
      report(result.steps.length
        ? `Tuyến ngắn nhất tính bằng Dijkstra theo chiều dài trên mạng đường đã nạp (màu xanh liền).${geometryNote}`
        : "Nút đầu trùng nút cuối: chiều dài 0 m, không cần di chuyển.", "ready");
    } catch (error) {
      report(`Không tính được tuyến: ${error.message}`, "error");
    }
  });
  report(readyMessage, "ready");
  return { clear };
}
