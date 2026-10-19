import { assetURL, validateModel } from './tour-data.js';

export function createModelController({ map, GraphicsLayer, Graphic, Point, createFromGLTF }) {
  const layer = new GraphicsLayer({ title: 'Mô hình công trình', popupEnabled: false,
    elevationInfo: { mode: 'absolute-height' } });
  map.add(layer);
  const cache = new Map();
  let revision = 0;

  async function load(place) {
    const m = place.model;
    validateModel(m, place.id);
    const location = new Point({ longitude: m.longitude, latitude: m.latitude, z: 0,
      spatialReference: { wkid: 4326 } });
    let groundZ = 0;
    if (m.heightMode === 'relative-to-ground') {
      const result = await map.ground.queryElevation(location);
      if (!Number.isFinite(result.geometry.z) || result.geometry.z === result.noDataValue) {
        throw new Error('Không xác định được cao độ mặt đất. Hãy thử lại.');
      }
      groundZ = result.geometry.z;
    }
    location.z = groundZ + m.elevationMeters;
    const mesh = await createFromGLTF(location, assetURL(m.url));
    // Prepared glTF faces north; positive data heading turns clockwise on the map.
    mesh.scale(m.scale, { origin: location });
    mesh.rotate(0, 0, -m.headingDegrees, { origin: location });
    const graphic = new Graphic({ geometry: mesh, attributes: { placeId: place.id },
      symbol: { type: 'mesh-3d', symbolLayers: [{ type: 'fill' }] } });
    return graphic;
  }

  return {
    layer,
    clear() { revision++; layer.removeAll(); },
    async select(place) {
      const request = ++revision;
      layer.removeAll();
      if (!place.model) return null;
      if (!cache.has(place.id)) {
        const promise = load(place).catch(error => { cache.delete(place.id); throw error; });
        cache.set(place.id, promise);
      }
      const graphic = await cache.get(place.id);
      if (request !== revision) return null;
      layer.add(graphic);
      return graphic;
    },
  };
}
