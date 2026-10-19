const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const places = JSON.parse(fs.readFileSync(path.join(root, "data/places.json"), "utf8"));
// Keep the existing POI/camera/routing regression fixture independent of asset loading.
for (const place of places) place.model = null;
const tours = JSON.parse(fs.readFileSync(path.join(root, "data/camera-tours.json"), "utf8"));
const tourSource = fs.readFileSync(path.join(root, "src/tour.js"), "utf8")
  .replace(/export /g, "").replace("import.meta.url", '"http://localhost/src/tour.js"');
const networkSource = fs.readFileSync(path.join(root, "src/network.js"), "utf8").replace(/export /g, "");
const routingSource = fs.readFileSync(path.join(root, "src/routing.js"), "utf8")
  .replace('import { prepareNetwork, findShortestPath, networkRouteGeometry } from "./network.js";', "")
  .replace(/export /g, "").replace("import.meta.url", '"http://localhost/src/routing.js"');
// Replace only the browser/CDN entry points; exercise the actual application logic.
const source = fs.readFileSync(path.join(root, "src/main.js"), "utf8")
  .replace('import { initializeTour } from "./tour.js";', "")
  .replace('import { initializeRouting } from "./routing.js";', "")
  .replace('import { loadTourData, sourceLink } from "./tour-data.js";', "")
  .replace('import { createModelController } from "./models.js";', "")
  .replace('import { createPhotoTour } from "./photo-tour.js";', "")
  .replace("import.meta.url", '"http://localhost/src/main.js"')
  .replace('await import("https://js.arcgis.com/5.1/")', "await loadSDK()")
  .replace(/start\(\);\s*$/, "globalThis.done = start();");

class Element {
  constructor() {
    this.children = []; this.dataset = {}; this.attrs = {}; this.events = {};
    this.hidden = false; this.value = "";
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this.attrs[key] = value; }
  addEventListener(key, value) { this.events[key] = value; }
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}

async function flush() { for (let i = 0; i < 20; i++) await Promise.resolve(); }

function setup(data = places, options = {}) {
  const nodes = Object.fromEntries([
    "arcgis-scene", "#status", "#map-status", "#places-list", "#place-details",
    "#places-section", "#place-search", "#search-status",
    ...["select", "status", "progress", "introduction", "route-note", "start", "previous", "next", "end"].map((name) => `#tour-${name}`),
    ...["from", "to", "find", "clear", "status", "result", "source"].map((name) => `#network-${name}`),
  ].map((key) => [key, new Element()]));
  nodes["#map-status"].hidden = true;
  const scene = nodes["arcgis-scene"], calls = [];
  scene.map = { add(layer) {
    if (layer.title === "Địa điểm du lịch") scene.layer = layer;
    else if (layer.title === "Tuyến tham quan") scene.routeLayer = layer;
    else if (layer.title !== "Mô hình công trình") scene.networkLayer = layer;
  } };
  scene.viewOnReady = () => options.ready?.promise ?? Promise.resolve();
  scene.view = { ready: true, animation: { stop() {} }, goTo(target, config) { calls.push({ target, config }); return Promise.resolve(); } };
  class Layer {
    constructor(props) { Object.assign(this, props); }
    addMany(graphics) { this.graphics = graphics; graphics.forEach((g) => { g.layer = this; }); }
    add(graphic) { this.addMany([...(this.graphics || []), graphic]); }
    removeAll() { this.graphics = []; }
  }
  class Graphic { constructor(props) { Object.assign(this, props); } }
  const context = vm.createContext({
    URL, console: { error() {}, warn() {} },
    document: { querySelector: (key) => nodes[key], createElement: () => new Element(), baseURI: "http://localhost/" },
    fetch: async (url) => {
      const isTour = url.pathname.endsWith("tours.json");
      const isNetwork = url.pathname.endsWith("road-network.json");
      return { ok: !(isTour && options.tourHTTPError) && !(isNetwork && options.networkHTTPError), status: 503,
        json: async () => {
          if (isNetwork && options.networkJSONError) throw new SyntaxError("Invalid JSON");
          return isTour ? (options.tours ?? tours)
            : isNetwork ? (options.network ?? { nodes: [], edges: [] }) : data;
        } };
    },
    customElements: { whenDefined: async () => {} }, loadSDK: async () => {},
    loadTourData: async () => { throw new Error('Photo assets tested separately'); },
    createModelController: () => ({ clear() {} }),
    $arcgis: { import: async () => [Layer, Graphic, class {}, {}] },
  });
  vm.runInContext(tourSource, context);
  vm.runInContext(networkSource, context);
  vm.runInContext(routingSource, context);
  vm.runInContext(source, context);
  return { nodes, scene, calls, context };
}

(async () => {
  const { nodes, scene, calls, context } = setup();
  await context.done;
  const search = nodes["#place-search"];
  const items = nodes["#places-list"].children, buttons = items.map((item) => item.children[0]);
  function query(value) {
    search.value = value; search.events.input();
    return items.filter((item) => !item.hidden).map((item) => item.children[0].textContent);
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target.target.length, places.length);
  for (const value of ["dinh doc lap", "DINH ĐỘC LẬP", "  dinh   doc lap ", "Dinh Độc Lập".normalize("NFD")]) {
    assert.deepEqual(query(value), [places[0].name]);
  }
  assert.deepEqual(query("nha tho duc ba"), [places[1].name]);
  search.events.keydown({ key: "Enter", preventDefault() {} }); await flush();
  assert.equal(nodes["#place-details"].children[0].textContent, places[1].name);
  assert.equal(buttons[1].attrs["aria-pressed"], "true");
  assert.equal(calls.at(-1).target.target, scene.layer.graphics[1]);
  assert.deepEqual(query("khong co dia diem nay"), []);
  assert.match(nodes["#search-status"].textContent, /Không tìm thấy/);
  const count = calls.length;
  search.events.keydown({ key: "Enter", preventDefault() {} });
  assert.equal(calls.length, count);
  assert.equal(query("").length, places.length);
  assert.equal(nodes["#search-status"].hidden, true);

  scene.hitTest = async () => ({ results: [{ type: "graphic", graphic: scene.layer.graphics[2] }] });
  await scene.events.arcgisViewClick({ detail: { x: 1, y: 2 } });
  assert.equal(buttons[2].attrs["aria-pressed"], "true");
  assert.equal(calls.at(-1).target.target, scene.layer.graphics[2]);

  // Simulate ArcGIS cancelling an animation when another goTo starts.
  let pending = null;
  scene.view.goTo = () => {
    if (pending) pending.reject(Object.assign(new Error("cancelled"), { name: "AbortError" }));
    pending = deferred(); return pending.promise;
  };
  buttons[0].events.click(); buttons[1].events.click(); pending.resolve(); await flush();
  assert.equal(nodes["#map-status"].hidden, true);
  assert.equal(buttons[1].attrs["aria-pressed"], "true");
  assert.equal(scene.layer.graphics[0].symbol.size, 12);
  assert.equal(scene.layer.graphics[1].symbol.size, 17);

  // A delayed map hit must not override a newer list selection.
  const hit = deferred(); scene.hitTest = () => hit.promise;
  const click = scene.events.arcgisViewClick({ detail: { x: 1, y: 2 } });
  buttons[0].events.click(); pending.resolve();
  hit.resolve({ results: [{ type: "graphic", graphic: scene.layer.graphics[2] }] }); await click;
  assert.equal(nodes["#place-details"].children[0].textContent, places[0].name);

  // Before readiness, retain only the latest choice and skip the initial extent.
  const ready = deferred(), early = setup(places, { ready }); await flush();
  const earlyButtons = early.nodes["#places-list"].children.map((item) => item.children[0]);
  earlyButtons[0].events.click(); earlyButtons[2].events.click();
  assert.equal(early.calls.length, 0);
  ready.resolve(); await early.context.done;
  assert.equal(early.calls.length, 1);
  assert.equal(early.calls[0].target.target, early.scene.layer.graphics[2]);

  // Real navigation failures remain visible.
  scene.view.goTo = async () => { throw new Error("camera failure"); };
  buttons[0].events.click(); await flush();
  assert.equal(nodes["#map-status"].hidden, false);
  const empty = setup([]); await empty.context.done;
  assert.equal(empty.nodes["#place-search"].disabled, true);
  assert.equal(empty.nodes["#status"].dataset.state, "empty");
  assert.equal(empty.calls.length, 0);

  // Full A -> B -> C -> B -> A tour, bounds and restart/end behavior.
  const tourApp = setup(); await tourApp.context.done;
  const tourUI = (key) => tourApp.nodes[`#tour-${key}`];
  const press = async (key) => { tourUI(key).events.click(); await flush(); };
  await press("start");
  assert.match(tourUI("progress").textContent, /Điểm 1\/3/);
  assert.equal(tourUI("previous").disabled, true);
  assert.equal(tourUI("start").disabled, true);
  assert.match(tourUI("route-note").textContent, /Tuyến minh họa/);
  const vertices = tourApp.scene.routeLayer.graphics[0].geometry.paths[0];
  assert.equal(JSON.stringify(vertices), JSON.stringify(places.map((p) => [p.longitude, p.latitude])));
  const beforeBoundary = tourApp.calls.length;
  await press("previous"); assert.equal(tourApp.calls.length, beforeBoundary);
  for (const [command, stopIndex] of [["next", 1], ["next", 2], ["previous", 1], ["previous", 0]]) {
    await press(command);
    const stop = tours[0].stops[stopIndex];
    assert.match(tourUI("progress").textContent, new RegExp(`Điểm ${stopIndex + 1}/3`));
    assert.equal(tourApp.calls.at(-1).target.target.attributes.placeId, stop.placeId);
    assert.equal(tourApp.calls.at(-1).target.heading, stop.camera.heading);
    assert.equal(tourApp.nodes["#place-details"].children[0].textContent, places[stopIndex].name);
    assert.equal(tourApp.nodes["#places-list"].children[stopIndex].children[0].attrs["aria-pressed"], "true");
    if (stopIndex === 2) {
      assert.equal(tourUI("next").disabled, true);
      const count = tourApp.calls.length; await press("next"); assert.equal(tourApp.calls.length, count);
    }
  }
  await press("end");
  assert.equal(tourApp.scene.routeLayer.graphics.length, 0);
  assert.equal(tourUI("next").disabled, true);
  assert.equal(tourUI("start").disabled, false);
  await press("start"); assert.match(tourUI("progress").textContent, /Điểm 1\/3/);
  // Manual selection exits the tour to keep the progress consistent with the map.
  tourApp.nodes["#places-list"].children[2].children[0].events.click(); await flush();
  assert.equal(tourUI("end").disabled, true);
  assert.equal(tourApp.calls.at(-1).target.target.attributes.placeId, "p3");

  // Rapid transitions and ending while a camera promise is pending.
  let cameraPending, stopped = 0;
  tourApp.scene.view.animation.stop = () => { stopped++; cameraPending?.reject(Object.assign(new Error("cancel"), { name: "AbortError" })); };
  tourApp.scene.view.goTo = () => {
    cameraPending?.reject(Object.assign(new Error("cancel"), { name: "AbortError" }));
    cameraPending = deferred(); return cameraPending.promise;
  };
  await press("start"); await press("next"); await press("next");
  cameraPending.resolve(); await flush();
  assert.match(tourUI("progress").textContent, /Điểm 3\/3/);
  assert.equal(tourUI("status").dataset.state, "ready");
  await press("previous"); await press("end");
  assert.equal(stopped, 1);
  assert.match(tourUI("status").textContent, /Tour đã kết thúc/);
  tourApp.scene.view.goTo = async () => { throw new Error("camera failed"); };
  await press("start");
  assert.equal(tourUI("status").dataset.state, "error");
  assert.equal(tourUI("next").disabled, false);
  await press("end");
  tourApp.scene.view.goTo = async () => { throw Object.assign(new Error("cancel"), { name: "AbortError" }); };
  await press("start"); assert.match(tourUI("status").textContent, /bị hủy/);
  assert.equal(tourUI("status").dataset.state, "ready");

  for (const options of [{ tours: [] }, { tours: [{ ...tours[0], stops: [{ placeId: "missing", camera: tours[0].stops[0].camera }] }] },
    { tours: [{ ...tours[0], stops: [{ placeId: "p1", camera: { tilt: 100 } }] }] }, { tourHTTPError: true }]) {
    const invalid = setup(places, options); await invalid.context.done;
    assert.equal(invalid.nodes["#status"].dataset.state, "ready");
    assert.equal(invalid.nodes["#tour-start"].disabled, true);
    assert.match(invalid.nodes["#tour-status"].textContent, /Chưa có tour|Không tải được tour/);
  }
  // A supplied route is used unchanged and is not labelled illustrative.
  const route = { type: "polyline", paths: [places.map((p) => [p.longitude, p.latitude])], spatialReference: { wkid: 4326 } };
  const supplied = setup(places, { tours: [{ ...tours[0], route }] }); await supplied.context.done;
  supplied.nodes["#tour-start"].events.click(); await flush();
  assert.equal(JSON.stringify(supplied.scene.routeLayer.graphics[0].geometry), JSON.stringify(route));
  assert.doesNotMatch(supplied.nodes["#tour-route-note"].textContent, /Tuyến minh họa/);

  // Synthetic graph only for tests; no road data is invented in the application.
  const graph = { nodes: [
    { id: "a", longitude: 0, latitude: 0 }, { id: "b", longitude: 1, latitude: 0 },
    { id: "c", longitude: 2, latitude: 0 }, { id: "isolated", longitude: 3, latitude: 0 },
  ], edges: [
    { id: "ab", from: "a", to: "b", lengthMeters: 2, oneWay: true, path: [[0, 0], [1, 0]] },
    { id: "bc", from: "b", to: "c", lengthMeters: 3, oneWay: false },
    { id: "ac", from: "a", to: "c", lengthMeters: 10, oneWay: true },
  ] };
  const routed = setup(places, { network: graph }); await routed.context.done;
  const netUI = (key) => routed.nodes[`#network-${key}`];
  netUI("from").value = "a"; netUI("to").value = "c";
  routed.nodes["#tour-start"].events.click(); await flush();
  const progressBeforeRouting = routed.nodes["#tour-progress"].textContent;
  const cameraCount = routed.calls.length;
  netUI("find").events.click();
  assert.equal(routed.calls.length, cameraCount);
  assert.equal(routed.nodes["#tour-progress"].textContent, progressBeforeRouting);
  assert.equal(routed.scene.routeLayer.graphics.length, 1);
  assert.equal(routed.scene.networkLayer.graphics[0].symbol.color, "#165dcc");
  assert.equal(routed.scene.networkLayer.elevationInfo.mode, "on-the-ground");
  assert.match(netUI("result").textContent, /a → b → c · 5 m · 2 cạnh/);
  assert.match(netUI("status").textContent, /thiếu hình học/);
  routed.nodes["#tour-end"].events.click();
  assert.equal(routed.scene.networkLayer.graphics.length, 1);
  netUI("to").value = "isolated"; netUI("to").events.change();
  assert.equal(routed.scene.networkLayer.graphics.length, 0);
  assert.equal(netUI("result").textContent, "");
  netUI("find").events.click(); assert.match(netUI("status").textContent, /Không có đường/);
  netUI("from").value = "c"; netUI("to").value = "a";
  netUI("find").events.click(); assert.match(netUI("status").textContent, /Không có đường/);
  netUI("from").value = "a"; netUI("to").value = "a";
  netUI("find").events.click();
  assert.equal(routed.scene.networkLayer.graphics[0].geometry.type, "point");
  assert.match(netUI("status").textContent, /0 m/);
  netUI("clear").events.click();
  assert.equal(routed.scene.networkLayer.graphics.length, 0);
  assert.equal(netUI("clear").disabled, true);
  assert.equal(nodes["#network-find"].disabled, true); // Default application has no supplied network.
  assert.equal(nodes["#network-status"].dataset.state, "empty");
  for (const options of [{ networkHTTPError: true }, { networkJSONError: true }, { network: {} },
    { network: { ...graph, edges: [{ ...graph.edges[0], lengthMeters: -1 }] } }]) {
    const broken = setup(places, options); await broken.context.done;
    assert.equal(broken.nodes["#network-find"].disabled, true);
    assert.equal(broken.nodes["#network-status"].dataset.state, "error");
    assert.equal(broken.nodes["#tour-start"].disabled, false);
    assert.equal(broken.nodes["#status"].dataset.state, "ready");
  }
  const actualNetwork = JSON.parse(fs.readFileSync(path.join(root, "data/road-network.json"), "utf8"));
  const actualApp = setup(places, { network: actualNetwork }); await actualApp.context.done;
  assert.equal(actualApp.nodes["#network-from"].value, actualNetwork.metadata.defaultFrom);
  assert.equal(actualApp.nodes["#network-to"].value, actualNetwork.metadata.defaultTo);
  assert.match(actualApp.nodes["#network-source"].textContent, /OpenStreetMap/);
  actualApp.nodes["#network-find"].events.click();
  assert.equal(actualApp.nodes["#network-status"].dataset.state, "ready");
  assert.equal(actualApp.scene.networkLayer.graphics[0].geometry.type, "polyline");
  assert.doesNotMatch(actualApp.nodes["#network-status"].textContent, /thiếu hình học/);
  console.log("PASS: Vietnamese search, Enter, no results/reset, shared selection, view readiness, rapid navigation cancellation, delayed map hit, camera error, empty data.");
  console.log("PASS: tour A-B-C-back, bounds, restart/end/manual exit, route geometry, rapid camera cancellation, tour data/HTTP/camera errors.");
  console.log("PASS: routing display, direction/disconnected/same node, stale result clearing, empty/error data, independent tour/camera/layers.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
