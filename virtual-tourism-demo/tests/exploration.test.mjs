import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateTourData } from '../src/tour-data.js';
import { createModelController } from '../src/models.js';
import { createPhotoTour } from '../src/photo-tour.js';

const read = name => JSON.parse(fs.readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const fixture = ['places', 'tours', 'scenes', 'sources'].map(read);
const data = validateTourData(...fixture);
const bad = mutate => { const copy = structuredClone(fixture); mutate(...copy); assert.throws(() => validateTourData(...copy)); };
bad(p => p.push(p[0]));
bad((p,t) => { t[0].placeId = 'missing'; });
bad((p,t) => { t[0].entrySceneId = 'missing'; });
bad((p,t,s) => { s[0].hotspots[0].targetSceneId = 'missing'; });
bad((p,t,s) => { s[0].hotspots[0].position.x = 1.1; });
bad((p,t,s) => { s[0].hotspots = []; });
bad((p,t,s) => { s[1].hotspots[0].id = s[0].hotspots[0].id; });
bad(p => { p[0].model.scale = 0; });
bad(p => { p[0].model.latitude = 200; });
bad(p => { p[0].model.heightMode = 'on-the-ground'; });
bad(p => { p[0].model.elevationMeters = null; });
bad(p => { p[0].model.headingDegrees = 360; });
bad((p,t,s) => { s[1].tourId = 'other'; });
bad((p,t,s) => { s[2].hotspots[1].sourceId = 'missing'; });

const defer = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const flush = async () => { for(let i=0;i<30;i++) await Promise.resolve(); };
class Layer { constructor(options) { Object.assign(this,options); this.graphics=[]; } add(g) { this.graphics.push(g); } removeAll() { this.graphics=[]; } }
const calls = [], elevationCalls = [], transforms = [];
let pending = defer(), fail = false;
const controller = createModelController({
  map: { add() {}, ground: { async queryElevation(p) { elevationCalls.push(p.z); return {geometry:{z:12}, noDataValue:-9999}; } } },
  GraphicsLayer: Layer, Graphic: class { constructor(p) { Object.assign(this,p); } },
  Point: class { constructor(p) { Object.assign(this,p); } },
  async createFromGLTF(location,url) {
    calls.push({location,url}); await pending.promise; if(fail) throw new Error('missing model');
    return { extent:{}, scale(f,o) { transforms.push(['scale',f,o.origin.z]); }, rotate(x,y,z,o) { transforms.push(['rotate',z,o.origin.z]); } };
  },
});
const place = structuredClone(fixture[0][0]); place.model.elevationMeters = 3;
const first=controller.select(place), second=controller.select(place);
await flush(); assert.equal(calls.length,1); assert.equal(calls[0].location.z,15);
pending.resolve(); assert.equal(await first,null); assert.ok(await second);
assert.equal(controller.layer.graphics.length,1);
assert.deepEqual(transforms,[['scale',1,15],['rotate',-45,15]]);
await controller.select(place); assert.equal(calls.length,1); // cached mesh
await controller.select(fixture[0][1]); assert.equal(controller.layer.graphics.length,0);
const absolute=structuredClone(place); absolute.id='absolute'; absolute.model.heightMode='absolute-height';
await controller.select(absolute); assert.equal(calls.at(-1).location.z,3); assert.equal(elevationCalls.length,1);
const slow=structuredClone(place); slow.id='slow'; pending=defer();
const loading=controller.select(slow); await flush(); controller.clear(); pending.resolve();
assert.equal(await loading,null); assert.equal(controller.layer.graphics.length,0);
const missing=structuredClone(place); missing.id='missing'; fail=true;
await assert.rejects(controller.select(missing)); fail=false;
await controller.select(missing); assert.equal(calls.filter(c=>c.url.includes('.glb')).length,5);
const invalid=structuredClone(place); invalid.id='invalid'; invalid.model.scale=-1;
await assert.rejects(controller.select(invalid), /cấu hình không hợp lệ/);
console.log('PASS: schema, reachability, elevation once, absolute height, heading, cache, stale loads and model retry.');

class Element {
  constructor() { this.children=[]; this.events={}; this.style={}; this.dataset={}; this.attrs={}; this.hidden=false; this.clientWidth=1000; this.clientHeight=500; this.open=false; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children=nodes; }
  addEventListener(k,f) { this.events[k]=f; }
  setAttribute(k,v) { this.attrs[k]=v; }
  showModal() { this.open=true; }
  close() { this.open=false; this.events.close?.(); }
  focus() { this.focused=true; }
}
const nodes = new Map();
globalThis.document = { querySelector(id) { if(!nodes.has(id)) nodes.set(id,new Element()); return nodes.get(id); }, createElement() { return new Element(); } };
let observer, imagePending=[], imageFailures=new Set();
globalThis.ResizeObserver = class { constructor(fn) { observer=fn; } observe() {} };
globalThis.Image = class extends Element {
  naturalWidth=1920; naturalHeight=1280;
  set src(url) { this.url=url; imagePending.push(this); }
};
const loadImage = async () => { const image=imagePending.shift(); assert.ok(image); (imageFailures.has(image.url)?image.onerror:image.onload)(); await flush(); };
let captured=0, restored=null;
const saved={placeId:'p1',camera:{heading:127}};
const viewer=createPhotoTour({data,capture() {captured++;return saved;},restore(s) {restored=s;}});
const n=key=>nodes.get(`#photo-${key}`);
const trigger=new Element();
viewer.open(fixture[0][0],trigger); await loadImage();
assert.equal(n('scene').textContent,data.sceneById.get('palace-gate').name);
assert.equal(n('stage').style.width,'750px'); assert.equal(n('stage').style.height,'500px');
const clickHotspot=async label=> { const b=n('stage').children.find(x=>x.textContent?.includes(label)); assert.ok(b); b.events.click(); };
await clickHotspot('Xem sân'); await loadImage();
await clickHotspot('Đổi góc nhìn'); await loadImage();
await clickHotspot('Kiến trúc'); assert.equal(n('info').hidden,false);
assert.match(n('info').children[1].textContent,/Ngô Viết Thụ/);
const hotspot=n('stage').children.find(x=>x.textContent?.includes('Kiến trúc'));
assert.equal(hotspot.style.left,'39%');
n('zoom-in').events.click(); assert.equal(n('stage').style.width,'937.5px');
n('viewport').clientWidth=600; observer(); assert.equal(n('stage').style.width,'750px'); assert.equal(hotspot.style.left,'39%');
// An image failure retains the current image and navigation history; retry succeeds.
const backUrl=new URL(fixture[2][1].imageUrl,new URL('../',import.meta.url)).href;
await clickHotspot('Trở về'); imageFailures.add(imagePending[0].url); const failedUrl=imagePending[0].url; await loadImage();
assert.equal(n('scene').textContent,data.sceneById.get('palace-front').name);
assert.equal(n('retry').hidden,false); assert.match(n('status').textContent,/Không tải được/);
imageFailures.delete(failedUrl); n('retry').events.click(); await loadImage();
assert.equal(n('scene').textContent,data.sceneById.get('palace-yard').name);
n('back').events.click(); await loadImage(); assert.equal(n('scene').textContent,data.sceneById.get('palace-front').name);
n('close').events.click(); assert.equal(viewer.active,false); assert.equal(restored,saved); assert.equal(trigger.focused,true);
// Late photo loads after close must not repaint the viewer.
viewer.open(fixture[0][0],trigger); n('close').events.click(); await loadImage();
assert.equal(n('stage').children.length,0); assert.equal(captured,2);
console.log('PASS: three-scene tour, info, contain/resize/zoom alignment, failed image + retry, back, close/camera restore, stale photo loads.');
