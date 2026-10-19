import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateTourData } from '../src/tour-data.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = async name => JSON.parse(await fs.readFile(path.join(root, `data/${name}.json`), 'utf8'));
const [places, tours, scenes, sources] = await Promise.all(['places', 'tours', 'scenes', 'sources'].map(read));
validateTourData(places, tours, scenes, sources);
const assets = new Set();
for (const p of places) { if (p.model) assets.add(p.model.url); if (p.image) assets.add(p.image); }
for (const scene of scenes) {
  assets.add(scene.imageUrl);
  for (const h of scene.hotspots) if (h.audioUrl) assets.add(h.audioUrl);
}
for (const asset of assets) {
  const file = path.resolve(root, asset);
  if (!file.startsWith(root)) throw new Error(`Tệp nằm ngoài dự án: ${asset}`);
  const stat = await fs.stat(file);
  if (!stat.isFile() || !stat.size) throw new Error(`Tệp rỗng hoặc không hợp lệ: ${asset}`);
  if (asset.endsWith('.glb')) {
    const bytes = await fs.readFile(file);
    if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw new Error(`GLB hỏng: ${asset}`);
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    if (!doc.meshes?.length || !doc.images?.length) throw new Error(`GLB thiếu mesh/texture: ${asset}`);
    if (doc.images.some(i => i.uri) || doc.buffers.some(b => b.uri)) throw new Error('Cần kiểm tra thêm tài nguyên ngoài của GLB.');
  }
  console.log(`OK ${asset} (${stat.size.toLocaleString('en-US')} bytes)`);
}
if (process.argv.includes('--http')) {
  const base = process.argv[process.argv.indexOf('--http') + 1];
  for (const asset of assets) {
    const response = await fetch(new URL(asset, base), { method: 'HEAD' });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${asset}`);
  }
  console.log(`HTTP: ${assets.size} tài nguyên truy cập được.`);
}
console.log(`PASS: ${places.length} POI, ${tours.length} tour ảnh, ${scenes.length} scene; ID, nguồn, liên kết, khả năng tới scene và tài nguyên hợp lệ.`);
