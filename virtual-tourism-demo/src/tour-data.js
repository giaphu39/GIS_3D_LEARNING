// Shared by the browser and the offline acceptance checker.
export function validateModel(m, id) {
  if (!m || typeof m.url !== 'string' || !m.url.trim()
    || !Number.isFinite(m.longitude) || Math.abs(m.longitude) > 180
    || !Number.isFinite(m.latitude) || Math.abs(m.latitude) > 90
    || !Number.isFinite(m.scale) || m.scale <= 0 || !Number.isFinite(m.elevationMeters)
    || !Number.isFinite(m.headingDegrees) || m.headingDegrees < 0 || m.headingDegrees >= 360
    || !['relative-to-ground', 'absolute-height'].includes(m.heightMode)) throw new Error(`Model ${id}: cấu hình không hợp lệ.`);
}

export function validateTourData(places, tours, scenes, sources) {
  function index(items, label) {
    if (!Array.isArray(items)) throw new Error(`${label} phải là mảng.`);
    const map = new Map();
    for (const item of items) {
      if (!item || typeof item.id !== 'string' || !item.id.trim() || map.has(item.id)) {
        throw new Error(`${label}: ID thiếu hoặc trùng (${item?.id}).`);
      }
      map.set(item.id, item);
    }
    return map;
  }
  const placeById = index(places, 'POI'), tourById = index(tours, 'Tour');
  const sceneById = index(scenes, 'Scene'), sourceById = index(sources, 'Nguồn');
  const hotspotIds = new Set();
  const text = (v) => typeof v === 'string' && !!v.trim();
  function source(id) {
    if (!sourceById.has(id)) throw new Error(`Không có nguồn ${id}.`);
  }
  for (const place of places) {
    if (!text(place.name) || !Number.isFinite(place.longitude) || Math.abs(place.longitude) > 180
      || !Number.isFinite(place.latitude) || Math.abs(place.latitude) > 90) throw new Error(`POI ${place.id}: tọa độ/tên sai.`);
    source(place.sourceId);
    if (!['real', 'illustrative'].includes(place.datasetKind)) throw new Error(`POI ${place.id}: thiếu datasetKind.`);
    if (place.tourId && tourById.get(place.tourId)?.placeId !== place.id) throw new Error(`POI ${place.id}: tourId không khớp.`);
    const m = place.model;
    if (m) {
      validateModel(m, place.id);
      source(m.sourceId);
    }
  }
  for (const tour of tours) {
    if (!text(tour.name) || placeById.get(tour.placeId)?.tourId !== tour.id) throw new Error(`Tour ${tour.id}: POI không khớp.`);
    if (sceneById.get(tour.entrySceneId)?.tourId !== tour.id) throw new Error(`Tour ${tour.id}: entrySceneId sai.`);
  }
  for (const scene of scenes) {
    if (!text(scene.name) || !tourById.has(scene.tourId) || scene.type !== 'image' || !text(scene.imageUrl)
      || !Array.isArray(scene.hotspots)) throw new Error(`Scene ${scene.id}: cấu hình không hợp lệ (chỉ hỗ trợ ảnh thường).`);
    source(scene.sourceId);
    for (const h of scene.hotspots) {
      if (!text(h.id) || hotspotIds.has(h.id) || !text(h.label)) throw new Error(`Hotspot ${h.id}: ID trùng/thiếu hoặc thiếu nhãn.`);
      hotspotIds.add(h.id);
      if (!h.position || ![h.position.x, h.position.y].every(v => Number.isFinite(v) && v >= 0 && v <= 1)) throw new Error(`Hotspot ${h.id}: vị trí ngoài ảnh.`);
      if (h.kind === 'navigation') {
        if (sceneById.get(h.targetSceneId)?.tourId !== scene.tourId) throw new Error(`Hotspot ${h.id}: targetSceneId sai hoặc khác tour.`);
      } else if (h.kind === 'info') {
        if (!text(h.title) || !text(h.text) || (h.audioUrl != null && !text(h.audioUrl))) throw new Error(`Hotspot ${h.id}: thiếu nội dung.`);
        source(h.sourceId);
      } else throw new Error(`Hotspot ${h.id}: kind không hỗ trợ.`);
    }
  }
  for (const tour of tours) {
    const reachable = new Set(), pending = [tour.entrySceneId];
    while (pending.length) {
      const id = pending.pop();
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const h of sceneById.get(id).hotspots) if (h.kind === 'navigation') pending.push(h.targetSceneId);
    }
    for (const scene of scenes.filter(s => s.tourId === tour.id)) {
      if (!reachable.has(scene.id)) throw new Error(`Scene ${scene.id}: không đến được từ entry.`);
    }
  }
  return { placeById, tourById, sceneById, sourceById };
}

export const assetURL = (path) => new URL(path, new URL('../', import.meta.url)).href;

export async function loadTourData(places) {
  const [tours, scenes, sources] = await Promise.all(['tours', 'scenes', 'sources'].map(async name => {
    const response = await fetch(new URL(`../data/${name}.json`, import.meta.url));
    if (!response.ok) throw new Error(`${name}.json: HTTP ${response.status}.`);
    return response.json();
  }));
  return validateTourData(places, tours, scenes, sources);
}

export function sourceLink(source) {
  const link = document.createElement('a');
  link.textContent = `${source.title} — ${source.author} · ${source.license}`;
  link.href = source.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}
