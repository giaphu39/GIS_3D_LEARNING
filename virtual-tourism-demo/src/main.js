import { initializeTour } from "./tour.js";
import { initializeRouting } from "./routing.js";
import { loadTourData, sourceLink } from "./tour-data.js";
import { createModelController } from "./models.js";
import { createPhotoTour } from "./photo-tour.js";

const scene = document.querySelector("arcgis-scene");
const status = document.querySelector("#status");
const mapStatus = document.querySelector("#map-status");
const list = document.querySelector("#places-list");
const details = document.querySelector("#place-details");
const placesSection = document.querySelector("#places-section");
const searchInput = document.querySelector("#place-search");
const searchStatus = document.querySelector("#search-status");
const entries = new Map();
let selectedId = null;
let view = null;
let navigationSequence = 0;
let selectionSequence = 0;
let tourController = null;
let selectedCamera;
let modelController = null;
let photoTour = null;
let photoData = null;
let photoError = null;

function normalizeName(value) {
  return value.normalize("NFD").replace(/\p{M}/gu, "")
    .toLowerCase().replace(/đ/g, "d").trim().replace(/\s+/g, " ");
}

function filterPlaces() {
  const query = normalizeName(searchInput.value);
  let count = 0;
  for (const entry of entries.values()) {
    entry.item.hidden = !entry.searchName.includes(query);
    if (!entry.item.hidden) count++;
  }
  searchStatus.hidden = !query;
  searchStatus.textContent = count
    ? `Tìm thấy ${count} địa điểm.` : "Không tìm thấy địa điểm phù hợp.";
}

searchInput.addEventListener("input", filterPlaces);
searchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.isComposing) return;
  event.preventDefault();
  const match = [...entries.values()].find((entry) => !entry.item.hidden);
  if (match) selectPlace(match.place.id);
});

async function moveCamera(target, options) {
  if (!view) return { status: "pending" };
  const sequence = ++navigationSequence;
  if (mapStatus.dataset.source === "camera") mapStatus.hidden = true;
  try {
    // A new goTo interrupts the previous animation. Only the latest error matters.
    await view.goTo(target, options);
    return { status: sequence === navigationSequence ? "complete" : "cancelled" };
  } catch (error) {
    if (sequence === navigationSequence && error.name !== "AbortError") {
      showMapError("Không chuyển được camera tới địa điểm. Vui lòng chọn lại.", error, "camera");
    }
    return { status: sequence !== navigationSequence || error.name === "AbortError" ? "cancelled" : "error" };
  }
}

function cancelCamera() {
  navigationSequence++;
  view?.animation?.stop();
}

async function focusSelectedPlace() {
  const entry = entries.get(selectedId);
  const graphic = entry?.graphic;
  if (!view || !graphic) return;
  const request = selectionSequence;
  if (entry.place.model && modelController) {
    let modelStatus = document.querySelector('#model-status');
    if (modelStatus) modelStatus.textContent = 'Đang tải mô hình công trình…';
    try {
      const modelGraphic = await modelController.select(entry.place);
      if (request !== selectionSequence || photoTour?.active) return { status: 'cancelled' };
      modelStatus = document.querySelector('#model-status');
      if (modelStatus) {
        modelStatus.textContent = 'Đã tải mô hình. Vị trí, hướng và tỷ lệ được căn chỉnh xấp xỉ; chưa khảo sát.';
        modelStatus.dataset.state = 'ready';
      }
      if (modelGraphic && !selectedCamera) return moveCamera({ target: modelGraphic.geometry.extent, tilt: 65, heading: 225 });
    } catch (error) {
      if (request !== selectionSequence) return { status: 'cancelled' };
      modelStatus = document.querySelector('#model-status');
      if (modelStatus) {
        modelStatus.textContent = `Không tải được mô hình. ${error.message} Nhấn “Xem mô hình 3D” để thử lại.`;
        modelStatus.dataset.state = 'error';
      }
      console.error(error);
    }
  } else modelController?.clear();
  if (request !== selectionSequence || photoTour?.active) return { status: 'cancelled' };
  return moveCamera({ target: graphic, scale: 3500, tilt: 45, ...selectedCamera });
}

function appendExploreControls(place) {
  const actions = document.createElement('div');
  actions.id = 'place-explore'; actions.className = 'explore-controls';
  const message = document.createElement('p'); message.id = 'model-status'; message.setAttribute('role', 'status');
  if (place.model) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Xem mô hình 3D';
    button.addEventListener('click', () => { selectedCamera = undefined; void focusSelectedPlace(); });
    actions.append(button);
    message.textContent = view ? 'Chọn mô hình để quan sát nhiều phía.' : 'Đang chờ bản đồ 3D sẵn sàng…';
    if (photoData) actions.append(sourceLink(photoData.sourceById.get(place.model.sourceId)));
  } else message.textContent = 'Địa điểm này chưa có mô hình công trình.';
  actions.append(message);
  const tourButton = document.createElement('button'); tourButton.type = 'button'; tourButton.textContent = 'Tham quan ảnh';
  tourButton.disabled = !place.tourId || !photoTour;
  tourButton.addEventListener('click', () => photoTour?.open(place, tourButton));
  actions.append(tourButton);
  const note = document.createElement('p'); note.className = 'search-hint';
  note.textContent = photoError ? `Tour ảnh chưa sẵn sàng: ${photoError}`
    : !place.tourId ? 'Địa điểm này chưa có tour ảnh.'
    : !photoTour ? 'Đang kiểm tra dữ liệu tour ảnh…' : 'Ba ảnh thường có hotspot điều hướng và thông tin.';
  actions.append(note); details.append(actions);
}

function setStatus(message, state) {
  status.textContent = message;
  status.dataset.state = state;
  placesSection.setAttribute("aria-busy", String(state === "loading"));
}

function showMapError(message, error, source = "map") {
  mapStatus.textContent = message;
  mapStatus.dataset.source = source;
  mapStatus.hidden = false;
  console.error(message, error);
}

async function loadPlaces() {
  const response = await fetch(new URL("../data/places.json", import.meta.url));
  if (!response.ok) throw new Error(`Không đọc được places.json (HTTP ${response.status}).`);
  const places = await response.json();
  if (!Array.isArray(places)) throw new Error("places.json phải chứa một mảng địa điểm.");
  const ids = new Set();
  for (const [index, place] of places.entries()) {
    if (!place || typeof place.id !== "string" || !place.id.trim() || ids.has(place.id)
      || typeof place.name !== "string" || !place.name.trim()
      || !Number.isFinite(place.longitude) || Math.abs(place.longitude) > 180
      || !Number.isFinite(place.latitude) || Math.abs(place.latitude) > 90) {
      throw new Error(`Địa điểm thứ ${index + 1} thiếu thông tin, trùng mã hoặc có tọa độ không hợp lệ.`);
    }
    ids.add(place.id);
  }
  return places;
}

function markerSymbol(selected = false) {
  return { type: "simple-marker", style: "circle", color: selected ? "#ed8a16" : "#007eae",
    size: selected ? 17 : 12, outline: { color: "white", width: 2 } };
}

// Search, list buttons and map clicks share this selection path.
function selectPlace(id, { camera, source = "manual" } = {}) {
  const entry = entries.get(id);
  if (!entry) return;
  if (source !== "tour") tourController?.end();
  else if (searchInput.value) {
    searchInput.value = "";
    filterPlaces();
  }
  selectedId = id;
  selectedCamera = camera;
  selectionSequence++;
  for (const [entryId, item] of entries) {
    const selected = entryId === selectedId;
    item.button.setAttribute("aria-pressed", String(selected));
    if (item.graphic) item.graphic.symbol = markerSymbol(selected);
  }
  const { place } = entry;
  const heading = document.createElement("h3");
  heading.textContent = place.name;
  const table = document.createElement("table");
  table.className = "detail-table";
  table.setAttribute("aria-label", `Thông tin ${place.name}`);
  const body = document.createElement("tbody");
  const rows = [
    ["Mô tả", place.description || "Chưa có mô tả."],
    ["Thời gian tham quan", Number.isFinite(place.visitMinutes) && place.visitMinutes >= 0
      ? `${place.visitMinutes} phút` : "Chưa có thông tin"],
    ["Kinh độ", place.longitude], ["Vĩ độ", place.latitude],
  ];
  for (const [label, value] of rows) {
    const row = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = label;
    const td = document.createElement("td");
    td.textContent = value;
    row.append(th, td);
    body.append(row);
  }
  table.append(body);
  details.replaceChildren(heading, table);
  appendExploreControls(place);
  if (typeof place.image === "string" && place.image.trim()) {
    try {
      const url = new URL(place.image, document.baseURI);
      if (["http:", "https:"].includes(url.protocol)) {
        const image = document.createElement("img");
        image.className = "place-image";
        image.src = url.href;
        image.alt = place.name;
        image.addEventListener("error", () => image.remove(), { once: true });
        details.append(image);
      }
    } catch (error) { console.warn("Đường dẫn ảnh không hợp lệ:", error); }
  }
  // Before the view is ready, retain the selection; initializeMap will focus it.
  return focusSelectedPlace();
}

async function initializeMap(places) {
  // Keep the SDK on the ArcGIS CDN; no build tool or local SDK dependency.
  await import("https://js.arcgis.com/5.1/");
  const [GraphicsLayer, Graphic, Point, meshUtils] = await $arcgis.import([
    "@arcgis/core/layers/GraphicsLayer.js", "@arcgis/core/Graphic.js",
    "@arcgis/core/geometry/Point.js", "@arcgis/core/geometry/support/meshUtils.js",
  ]);
  await customElements.whenDefined("arcgis-scene");
  await scene.viewOnReady();
  const layer = new GraphicsLayer({ title: "Địa điểm du lịch",
    elevationInfo: { mode: "on-the-ground" }, popupEnabled: false });
  const graphics = places.map((place) => {
    const graphic = new Graphic({
      geometry: { type: "point", longitude: place.longitude, latitude: place.latitude,
        spatialReference: { wkid: 4326 } },
      attributes: { placeId: place.id }, symbol: markerSymbol(place.id === selectedId),
    });
    entries.get(place.id).graphic = graphic;
    return graphic;
  });
  layer.addMany(graphics);
  scene.map.add(layer);
  view = scene.view;
  modelController = createModelController({ map: scene.map, GraphicsLayer, Graphic, Point,
    createFromGLTF: meshUtils.createFromGLTF });
  let clickSequence = 0;
  scene.addEventListener("arcgisViewClick", async (event) => {
    const sequence = ++clickSequence;
    const selectionAtClick = selectionSequence;
    try {
      const hit = await scene.hitTest(event.detail, { include: layer });
      if (sequence !== clickSequence || selectionAtClick !== selectionSequence) return;
      const result = hit.results.find((item) => item.type === "graphic" && item.graphic.layer === layer);
      if (result) selectPlace(result.graphic.attributes.placeId);
    } catch (error) {
      showMapError("Không xác định được điểm vừa bấm. Vui lòng thử lại hoặc chọn trong danh sách.", error);
    }
  });
  if (selectedId !== null) {
    await focusSelectedPlace();
  } else if (graphics.length) {
    // Compute the initial camera extent directly from the actual graphics.
    await moveCamera({ target: graphics, tilt: 45 }, { animate: false });
  }
  await Promise.all([
    initializeTour({ places, view, map: scene.map, GraphicsLayer, Graphic, selectPlace, cancelCamera })
      .then((controller) => { tourController = controller; }),
    initializeRouting({ map: scene.map, GraphicsLayer, Graphic }),
  ]);
}

async function start() {
  let places;
  try {
    places = await loadPlaces();
  } catch (error) {
    setStatus(`Không tải được dữ liệu. ${error.message} Hãy kiểm tra dữ liệu và tải lại trang.`, "error");
    console.error(error);
    document.querySelector("#tour-status").textContent = "Tour chưa sẵn sàng vì dữ liệu địa điểm gặp lỗi.";
    document.querySelector("#network-status").textContent = "Tìm đường chưa sẵn sàng vì bản đồ chưa được khởi tạo.";
    return;
  }
  for (const place of places) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "place-button";
    button.textContent = place.name;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => selectPlace(place.id));
    const item = document.createElement("li");
    item.append(button);
    list.append(item);
    entries.set(place.id, { place, button, item, searchName: normalizeName(place.name), graphic: null });
  }
  searchInput.disabled = !places.length;
  // Tour photos work independently, including when the GIS CDN is unavailable.
  void loadTourData(places).then(data => {
    photoData = data;
    photoTour = createPhotoTour({ data,
      capture() {
        tourController?.end(); cancelCamera(); selectionSequence++;
        return { placeId: selectedId, camera: view?.camera?.clone() };
      },
      restore(saved) {
        if (saved?.camera && saved.placeId === selectedId) void moveCamera(saved.camera, { animate: false });
      },
    });
  }).catch(error => { photoError = error.message; console.error(error); }).finally(() => {
    if (selectedId) {
      document.querySelector('#place-explore')?.remove();
      appendExploreControls(entries.get(selectedId).place);
    }
  });
  filterPlaces();
  if (!places.length) {
    setStatus("Chưa có địa điểm trong data/places.json.", "empty");
    details.textContent = "Chưa có dữ liệu để hiển thị chi tiết.";
  } else {
    setStatus(`Đã tải ${places.length} địa điểm. Đang tải bản đồ…`, "loading");
  }
  try {
    await initializeMap(places);
    if (places.length) setStatus(`Đã tải ${places.length} địa điểm. Chọn một địa điểm để xem chi tiết.`, "ready");
  } catch (error) {
    showMapError("Không tải được bản đồ 3D. Kiểm tra kết nối Internet và tải lại trang.", error);
    document.querySelector("#tour-status").textContent = "Không thể bắt đầu tour vì bản đồ chưa sẵn sàng.";
    document.querySelector("#network-status").textContent = "Không thể hiển thị tuyến vì bản đồ chưa sẵn sàng.";
    if (places.length) setStatus(`Đã tải ${places.length} địa điểm; bản đồ gặp lỗi. Bạn vẫn có thể chọn trong danh sách.`, "error");
  }
}

start();
