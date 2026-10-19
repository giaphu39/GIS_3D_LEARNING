// Camera targets and illustrative route vertices are resolved from places.json.
export function validateTours(tours, places) {
  if (!Array.isArray(tours)) throw new Error("camera-tours.json phải chứa một mảng tour.");
  const placeIds = new Set(places.map((place) => place.id));
  const ids = new Set();
  for (const tour of tours) {
    if (!tour || typeof tour.id !== "string" || !tour.id.trim() || ids.has(tour.id)
      || typeof tour.name !== "string" || !tour.name.trim()
      || !Array.isArray(tour.stops) || !tour.stops.length) {
      throw new Error("Tour thiếu mã, tên, điểm dừng hoặc bị trùng mã.");
    }
    ids.add(tour.id);
    for (const stop of tour.stops) {
      const camera = stop?.camera;
      if (!placeIds.has(stop?.placeId) || !camera
        || !Number.isFinite(camera.heading) || camera.heading < 0 || camera.heading >= 360
        || !Number.isFinite(camera.tilt) || camera.tilt < 0 || camera.tilt >= 90
        || !Number.isFinite(camera.scale) || camera.scale <= 0) {
        throw new Error(`Tour “${tour.name}” có placeId hoặc góc camera không hợp lệ.`);
      }
    }
    // Optional route geometry uses longitude/latitude pairs in WGS84.
    if (tour.route != null && (tour.route.type !== "polyline"
      || tour.route.spatialReference?.wkid !== 4326
      || !Array.isArray(tour.route.paths) || !tour.route.paths.length
      || !tour.route.paths.every((path) => Array.isArray(path) && path.length >= 2
        && path.every((point) => Array.isArray(point) && point.length === 2
          && Number.isFinite(point[0]) && Math.abs(point[0]) <= 180
          && Number.isFinite(point[1]) && Math.abs(point[1]) <= 90)))) {
      throw new Error(`Hình học tuyến của tour “${tour.name}” không hợp lệ.`);
    }
  }
  return tours;
}

export async function initializeTour({ places, view, map, GraphicsLayer, Graphic, selectPlace, cancelCamera }) {
  const ui = Object.fromEntries(["select", "status", "progress", "introduction", "route-note",
    "start", "previous", "next", "end"].map((name) => [name, document.querySelector(`#tour-${name}`)]));
  let tours;
  for (const name of ["select", "start", "previous", "next", "end"]) ui[name].disabled = true;
  ui.status.textContent = "Đang tải tour…";
  try {
    const response = await fetch(new URL("../data/camera-tours.json", import.meta.url));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    tours = validateTours(await response.json(), places);
  } catch (error) {
    ui.status.textContent = `Không tải được tour: ${error.message} Kiểm tra camera-tours.json và tải lại trang.`;
    ui.status.dataset.state = "error";
    return null;
  }
  if (!tours.length) {
    ui.status.textContent = "Chưa có tour trong data/camera-tours.json.";
    return null;
  }
  const placeById = new Map(places.map((place) => [place.id, place]));
  const routeLayer = new GraphicsLayer({ title: "Tuyến tham quan",
    elevationInfo: { mode: "on-the-ground" }, popupEnabled: false });
  map.add(routeLayer);
  let active = false;
  let index = -1;
  let revision = 0;
  const currentTour = () => tours.find((tour) => tour.id === ui.select.value);

  function updateControls() {
    const tour = currentTour();
    ui.select.disabled = active;
    ui.start.disabled = active || !tour;
    ui.previous.disabled = !active || index <= 0;
    ui.next.disabled = !active || index >= tour.stops.length - 1;
    ui.end.disabled = !active;
  }

  function showRoute(tour) {
    routeLayer.removeAll();
    const paths = [tour.stops.map((stop) => {
      const place = placeById.get(stop.placeId);
      return [place.longitude, place.latitude];
    })];
    const geometry = tour.route ?? { type: "polyline", paths, spatialReference: { wkid: 4326 } };
    ui["route-note"].hidden = false;
    ui["route-note"].textContent = tour.route
      ? "Tuyến hiển thị theo hình học được cung cấp trong dữ liệu tour."
      : "Tuyến minh họa: đường nối thẳng các điểm dừng, không phải tuyến đường đi thực tế.";
    if (tour.route || paths[0].length >= 2) {
      routeLayer.add(new Graphic({ geometry,
        symbol: { type: "simple-line", color: "#d76b12", width: 3, style: tour.route ? "solid" : "dash" } }));
    }
  }

  async function goToStop(nextIndex) {
    const tour = currentTour();
    if (!active || nextIndex < 0 || nextIndex >= tour.stops.length) return;
    const request = ++revision;
    index = nextIndex;
    const stop = tour.stops[index], place = placeById.get(stop.placeId);
    ui.progress.textContent = `Điểm ${index + 1}/${tour.stops.length} — ${place.name}`;
    ui.introduction.textContent = stop.introduction || place.description || "Chưa có nội dung giới thiệu.";
    ui.status.textContent = "Đang chuyển camera…";
    ui.status.dataset.state = "loading";
    updateControls();
    try {
      const { heading, tilt, scale } = stop.camera;
      const result = await selectPlace(stop.placeId, { camera: { heading, tilt, scale }, source: "tour" });
      if (request !== revision || !active) return;
      ui.status.dataset.state = result?.status === "error" ? "error" : "ready";
      if (result?.status === "error") {
        ui.status.textContent = "Camera gặp lỗi. Bạn vẫn có thể chuyển điểm hoặc kết thúc tour.";
      } else if (result?.status === "cancelled") {
        ui.status.textContent = "Chuyển camera đã bị hủy. Bạn vẫn có thể tiếp tục tour.";
      } else {
        ui.status.textContent = index === tour.stops.length - 1
          ? "Đã tới điểm cuối. Có thể quay lại hoặc kết thúc tour." : "Đang tham quan. Dùng Tiếp theo để tới điểm kế tiếp.";
      }
    } catch (error) {
      if (request !== revision || !active) return;
      ui.status.dataset.state = error.name === "AbortError" ? "ready" : "error";
      ui.status.textContent = error.name === "AbortError"
        ? "Chuyển camera đã bị hủy. Bạn vẫn có thể tiếp tục tour."
        : "Không chuyển được điểm dừng. Vui lòng thử lại hoặc kết thúc tour.";
    }
  }

  function end() {
    if (!active) return;
    active = false;
    revision++;
    cancelCamera();
    index = -1;
    routeLayer.removeAll();
    ui["route-note"].hidden = true;
    ui.progress.textContent = "Đã kết thúc tour";
    ui.introduction.textContent = "";
    ui.status.textContent = "Tour đã kết thúc. Có thể Bắt đầu lại hoặc khám phá địa điểm tự do.";
    ui.status.dataset.state = "ready";
    updateControls();
  }

  for (const tour of tours) {
    const option = document.createElement("option");
    option.value = tour.id;
    option.textContent = tour.name;
    ui.select.append(option);
  }
  ui.select.value = tours[0].id;
  ui.select.addEventListener("change", () => {
    if (active) end();
    ui.progress.textContent = "Chưa bắt đầu";
    updateControls();
  });
  ui.start.addEventListener("click", () => {
    if (active || !currentTour() || !view.ready) return;
    active = true;
    showRoute(currentTour());
    void goToStop(0);
  });
  ui.previous.addEventListener("click", () => { void goToStop(index - 1); });
  ui.next.addEventListener("click", () => { void goToStop(index + 1); });
  ui.end.addEventListener("click", end);
  ui.status.textContent = "Tour đã sẵn sàng. Nhấn Bắt đầu để tham quan.";
  ui.status.dataset.state = "ready";
  updateControls();
  return { end };
}

