# Phần B — Phương án 1: React + Node.js + PostgreSQL, tự quản lý dữ liệu

Cập nhật: 18/10/2026.

Đọc và hoàn thành [phần A](guide_arcGis_js.md) trước. Đây là một nhánh lựa chọn; [phần C](guide_location_platform.md) là nhánh Location Platform thay thế cho phần lưu POI.

## Mục tiêu và điều kiện bắt đầu

Luồng dữ liệu: PostgreSQL → Node.js API → React → ArcGIS SDK. Mô hình GLB và ảnh vẫn là file do nhóm phục vụ; database lưu metadata, URL và mạng tour, không bắt buộc chứa file nhị phân.

Phương án này không publish hosted layer của nhóm lên ArcGIS. Bản đồ nền và địa hình hiện vẫn dùng dịch vụ Esri theo điều kiện truy cập của nguồn: **tự quản lý dữ liệu của nhóm không đồng nghĩa tự host toàn bộ nền/địa hình hoặc chạy offline**.

Đầu vào bắt buộc từ phần A:

- UC04 tìm kiếm; UC05 bản đồ và phóng đến POI; UC06 thông tin.
- UC07 có mô hình công trình được đặt đúng vị trí, hướng và tỷ lệ.
- UC08 có tour ảnh thường hoặc panorama, chuyển scene và hotspot thông tin.
- Dữ liệu lõi: places.json, tours.json, scenes.json, ảnh và ít nhất một mô hình. Hợp đồng dữ liệu ở bước 5 phần A là nguồn thống nhất.
- camera-tours.json và road-network.json là tùy chọn. Tour camera cũ không được dùng thay tour ảnh.

**Trạng thái khi viết:** virtual-tourism-demo đang có POI, camera tour và mạng đường; chưa có mô hình công trình/tour ảnh. Hướng dẫn này là kế hoạch triển khai, không có nghĩa các chức năng mới đã được viết hoặc chạy thử.

Chưa làm tài khoản, đánh giá hoặc quản trị. Render là bước chia sẻ tùy chọn sau khi local chạy được. Các lệnh Windows dùng **CMD trong VS Code**; TypeScript/SQL dán vào file hoặc Query Tool, không dán vào CMD.

## Bước 6 — Chuyển bản phần A sang React + TypeScript

### 6.1. Giữ một bản đối chiếu

Chạy virtual-tourism-demo bằng Live Server. Hoàn thành phần A và thử đủ UC04–UC08 trước khi đổi kiến trúc. Không sửa đồng thời cả giao diện lẫn schema dữ liệu.

Các file hiện tại có src/main.js, src/tour.js, src/network.js, src/routing.js; tour.js hiện chỉ điều khiển camera. Sau phần A, kiểm tra các module tour ảnh/mô hình thực tế vừa bổ sung; không mặc định chúng đã tồn tại.

### 6.2. Tạo project riêng

Nếu gis-flow-demo đã tồn tại, kiểm tra nội dung trước; không chạy scaffold đè lên.

```cmd
cd /d E:\08_Project\GIS_LEARNING
mkdir gis-flow-demo
cd gis-flow-demo
npm create vite@latest client -- --template react-ts
cd client
npm install
npm install @arcgis/map-components@5.1 @arcgis/core@5.1 @esri/calcite-components
npm run dev
```

Dùng Node.js LTS đáp ứng yêu cầu Vite/SDK, kiểm tra peer dependencies khi cài. Hai package ArcGIS cùng dòng 5.1 để sát bản HTML hiện tại; commit package-lock.json để giữ phiên bản thực tế. Không nạp đồng thời SDK npm và script CDN. Calcite dùng phiên bản tương thích theo tài liệu SDK.

Dừng nếu cài/build báo xung đột phiên bản; không dùng --force để che lỗi. Mở URL terminal in ra, thường http://localhost:5173.

### 6.3. Chuyển dữ liệu

Trong Explorer:

1. Tạo gis-flow-demo/reference; copy index.html và src của bản phần A vào đây để đọc đối chiếu.
2. Copy places.json, tours.json, scenes.json vào client/public/data.
3. Copy ảnh và models vào client/public/images và client/public/models, giữ cấu trúc con khớp URL.
4. Chỉ copy camera-tours.json, road-network.json nếu giữ chức năng phụ.

Không copy cả repository hoặc .env vào public. File public được truy cập bằng /data/places.json, /images/... và /models/..., không có đoạn /public/ trong URL. Nếu sau này deploy dưới đường dẫn con, phải xử lý base URL thống nhất; đường dẫn bắt đầu / mặc định trỏ về gốc domain.

Cấu trúc gợi ý:

```text
gis-flow-demo/
├── reference/                    # Chỉ đối chiếu
├── client/
│   ├── public/data/
│   ├── public/images/
│   ├── public/models/
│   └── src/
│       ├── components/GisScene.tsx
│       ├── components/PlacesPanel.tsx
│       ├── components/PhotoTour.tsx
│       ├── gis/modelLayer.ts
│       ├── services/api.ts
│       ├── types/gis.ts
│       └── App.tsx
└── server/
```

### 6.4. Chuyển từng phần

Prompt đầu:

> Đọc bản phần A trong reference và hợp đồng dữ liệu bước 5 guide_arcGis_js.md. Chuyển UC04/05/06 sang React + TypeScript trước, dữ liệu vẫn đọc public/data. Dùng SDK npm và map components, khai báo TSX theo tài liệu Esri. Bản đồ có chiều cao. Dùng state/ref và sự kiện component; dọn listeners, graphics và tài nguyên khi unmount, không vẽ lớp trùng khi React StrictMode chạy lại. Không dùng document.querySelector toàn cục hoặc any để che lỗi. Không thêm backend.

React 19 dùng dạng sự kiện như onarcgisViewReadyChange theo tài liệu Esri và phiên bản package đã cài. Nếu cần, thêm vào client/src/vite-env.d.ts:

```ts
/// <reference types="vite/client" />
/// <reference types="@arcgis/map-components/types/react" />
```

Đăng ký component bằng import của package theo tài liệu, chẳng hạn:

```ts
import "@arcgis/map-components/components/arcgis-scene";
```

Prompt tiếp theo sau khi tìm kiếm/chọn POI hoạt động:

> Chuyển bộ hiển thị model và PhotoTour của phần A sang React. Giữ nguyên Place.model, Place.tourId; Tour có placeId/entrySceneId; Scene có type/imageUrl/hotspots. Chọn POI → phóng camera → xem mô hình → bắt đầu tour ở entrySceneId → navigation hotspot đổi scene → info hotspot mở thuyết minh → thoát về POI. Ảnh thường đặt hotspot theo tọa độ chuẩn hóa trong ảnh; panorama dùng adapter riêng. Không thay tour ảnh bằng stops/camera cũ. Tách lỗi tải model/ảnh khỏi khả năng xem bản đồ. Không thêm định tuyến bắt buộc.

Nếu giữ camera tour/Dijkstra: chuyển module thuần sang TypeScript sau; vẫn giữ lớp đường và lớp mô hình riêng.

### 6.5. Kiểm tra mốc React

```cmd
cd /d E:\08_Project\GIS_LEARNING\gis-flow-demo\client
npm run build
npm run dev
```

Không mở thêm dev server nếu bản trước còn chạy. Kiểm tra đủ UC04–UC08, đổi POI nhiều lần và thoát/mở tour nhiều lần. Không có model/ảnh/marker bị nhân đôi. React lúc này vẫn đọc JSON; chưa chứng minh kết nối database.

## Bước 7 — Chốt dữ liệu trước khi đổi sang API

### 7.1. Một hợp đồng dữ liệu

Dùng đúng schema bước 5 phần A; không phát minh schema khác trong React hoặc database:

| Tệp | Vai trò |
|---|---|
| places.json | POI, model, tourId, nguồn và loại dữ liệu |
| tours.json | id, placeId, name, entrySceneId |
| scenes.json | Ảnh, loại ảnh, hotspot navigation/info |
| images/, models/ | File gốc được phép dùng và bản đã tối ưu |
| camera-tours.json | Tùy chọn: tour camera cũ với stops |
| road-network.json | Tùy chọn: mạng đường giữa POI |

Các file JSON đầu là **mảng**, không phải GeoJSON FeatureCollection. Nếu xuất POI từ QGIS sang GeoJSON, viết adapter chuyển geometry.coordinates và properties sang Place, hoặc dùng GeoJSONLayer phù hợp. Không đưa FeatureCollection nguyên khối cho code đang chờ Place[].

### 7.2. Bộ kiểm tra nhỏ

Tạo bộ mock riêng, không ghi đè dữ liệu thật: ba POI; ít nhất một POI có model; một tour có ít nhất ba scene, có thể quay lại scene trước và có một hotspot thông tin. Ảnh/model giả phải ghi là minh họa; không gắn nhãn mô hình di tích thật.

Tạo DATA_SOURCES.md trong project triển khai khi thực hiện bước này: đường dẫn tài sản, nguồn, giấy phép, tác giả/credit, ngày lấy, thật/giả, hệ tọa độ, trạng thái xác minh và hạn chế.

Kiểm tra trước seed:

- ID không trùng; Place.tourId ↔ Tour.placeId khớp; entrySceneId thuộc đúng tour; targetSceneId tồn tại trong cùng tour.
- Tọa độ WGS84; GeoJSON là [longitude, latitude], không đảo. Kiểm chứng vị trí POI/cửa vào bằng nguồn độc lập.
- Model tồn tại, license phù hợp, đơn vị/tỷ lệ/hướng/cao độ đúng. Cao độ tuyệt đối và cao độ so với mặt đất không dùng lẫn.
- Ảnh thật đúng địa điểm; URL trả được file, định dạng phù hợp. Ảnh thường không giả thành 360°.
- Hotspot ảnh thường nằm trong [0,1]; tính theo vùng ảnh thực, không theo cả khung có khoảng trống. Panorama kiểm tra đơn vị yaw/pitch theo thư viện.
- Đi từ entrySceneId tới được mọi scene cần demo. Không cần thuật toán đường ngắn nhất cho mạng tour này.

Bộ thật tối thiểu: ba POI được kiểm chứng; một điểm có mô hình và 3–5 ảnh liên tiếp cùng địa điểm. Ghi rõ giới hạn nếu chỉ có ảnh thường hoặc mô hình chưa hoàn toàn chính xác. Không tải cả bản đồ TP.HCM nếu phạm vi demo chỉ vài di tích.

### 7.3. Mạng đường là phần phụ

Chỉ giữ nếu nhóm cần. Bản cũ có scripts/build_network.py và snapshot OSM; đọc script trước khi chạy vì nó ghi road-network.json của bản cũ. Lệnh dùng lại snapshot:

```cmd
cd /d E:\08_Project\GIS_LEARNING\virtual-tourism-demo
py scripts\build_network.py
```

Chỉ thêm --download khi chủ động muốn tải lại; kiểm tra vùng lấy dữ liệu, quyền sử dụng và hạn chế Overpass. Copy kết quả sang bản React có kiểm soát.

Mạng OSM thô không cùng schema nodes/edges. Kiểm tra hướng, đường cấm, đứt mạng, cổng vào, cạnh nối từ POI đến mạng và chế độ đi bộ/xe. Không tuyên bố tối ưu thực tế khi còn thiếu các quy tắc đó. Dijkstra giữa POI không thay mạng ảnh tham quan.

## Bước 8 — PostgreSQL và API đọc

### 8.1. Database riêng cho phiên bản này

Cài PostgreSQL nếu chưa có: https://www.postgresql.org/download/windows/. Dùng pgAdmin tạo database **gis_learning_v2**. Database chạy bằng dịch vụ riêng; mở VS Code không tự bật nó.

Chưa bắt buộc PostGIS: tọa độ và metadata JSONB đủ cho demo nhỏ. Chỉ thêm khi cần truy vấn không gian phía server. Không đặt database/mật khẩu vào client.

Nếu đã có database theo hướng dẫn cũ, tạo database mới như trên hoặc viết migration rõ ràng; CREATE TABLE IF NOT EXISTS không tự nâng cấp schema cũ. Không xóa database cũ để chạy ví dụ.

### 8.2. Tạo backend

```cmd
cd /d E:\08_Project\GIS_LEARNING\gis-flow-demo
mkdir server
cd server
npm init -y
npm install express pg dotenv
npm install -D typescript tsx @types/node @types/express @types/pg
mkdir src
```

Trong server/package.json, giữ dependencies đã cài, thêm "type": "module" và mục scripts:

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "db:seed": "tsx src/seed.ts"
}
```

Đây là một mục trong package.json, không phải toàn bộ file. Tạo server/tsconfig.json:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

Tạo server/.env trên máy triển khai:

```dotenv
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/gis_learning_v2
ENABLE_ROAD_NETWORK=false
```

Thay placeholder, percent-encode ký tự đặc biệt trong mật khẩu URI. Không đưa DATABASE_URL vào VITE_ hoặc gửi mật khẩu thật cho AI. .env.example chỉ chứa placeholder.

Trong .gitignore của **gis-flow-demo** cần có:

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
```

Đây là hướng dẫn cho project tương lai, khác .gitignore ở GIS_LEARNING đang bỏ qua hai repository tham khảo.

### 8.3. Kết nối database

server/src/db.ts:

```ts
import "dotenv/config";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("Thiếu DATABASE_URL");
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5
});
```

### 8.4. Seed metadata và mạng tour

server/src/seed.ts:

```ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pool } from "./db.js";

type Place = {
  id: string; name: string; longitude: number; latitude: number;
  description?: string; image?: string | null; visitMinutes: number;
  tourId?: string | null; [key: string]: unknown;
};
type Tour = { id: string; name: string; placeId: string; entrySceneId: string };
type Scene = {
  id: string; tourId: string; type: string; imageUrl: string;
  hotspots: { id: string; kind: string; targetSceneId?: string }[];
};

const directory = resolve(process.env.SEED_DIR ?? "../client/public/data");
async function readJson(file: string) {
  const text = await readFile(resolve(directory, file), "utf8");
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}
function uniqueIds(rows: { id: string }[], label: string) {
  const ids = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row.id !== "string" || !row.id.trim() || ids.has(row.id)) {
      throw new Error(label + ": ID thiếu hoặc trùng");
    }
    ids.add(row.id);
  }
  return ids;
}

async function seed() {
  const places = await readJson("places.json") as Place[];
  const tours = await readJson("tours.json") as Tour[];
  const scenes = await readJson("scenes.json") as Scene[];
  if (!Array.isArray(places) || !places.length ||
      !Array.isArray(tours) || !Array.isArray(scenes)) {
    throw new Error("places/tours/scenes phải là mảng; places không rỗng");
  }
  const placeIds = uniqueIds(places, "Place");
  uniqueIds(tours, "Tour");
  uniqueIds(scenes, "Scene");
  const tourById = new Map(tours.map(t => [t.id, t]));
  const sceneById = new Map(scenes.map(s => [s.id, s]));
  for (const p of places) {
    if (typeof p.name !== "string" || !p.name.trim() ||
        !Number.isFinite(p.longitude) || Math.abs(p.longitude) > 180 ||
        !Number.isFinite(p.latitude) || Math.abs(p.latitude) > 90 ||
        !Number.isInteger(p.visitMinutes) || p.visitMinutes < 0) {
      throw new Error("Place không hợp lệ: " + p.id);
    }
    if (p.tourId && tourById.get(p.tourId)?.placeId !== p.id) {
      throw new Error("Place.tourId không khớp: " + p.id);
    }
  }
  for (const t of tours) {
    if (!t.name || !placeIds.has(t.placeId) ||
        sceneById.get(t.entrySceneId)?.tourId !== t.id ||
        places.find(p => p.id === t.placeId)?.tourId !== t.id) {
      throw new Error("Tour/entryScene không khớp: " + t.id);
    }
  }
  for (const s of scenes) {
    if (!tourById.has(s.tourId) ||
        !["image", "equirectangular"].includes(s.type) ||
        !s.imageUrl || !Array.isArray(s.hotspots)) {
      throw new Error("Scene không hợp lệ: " + s.id);
    }
    uniqueIds(s.hotspots, "Hotspot trong " + s.id);
    for (const h of s.hotspots) {
      if (!["navigation", "info"].includes(h.kind) ||
          (h.kind === "navigation" &&
           sceneById.get(h.targetSceneId ?? "")?.tourId !== s.tourId)) {
        throw new Error("Hotspot không hợp lệ: " + h.id);
      }
    }
  }
  const networkEnabled = process.env.ENABLE_ROAD_NETWORK === "true";
  const network = networkEnabled ? await readJson("road-network.json") : null;
  if (networkEnabled &&
      (!network || !Array.isArray(network.nodes) || !Array.isArray(network.edges))) {
    throw new Error("Mạng đường cần nodes/edges, không dùng OSM thô");
  }
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query(
      "CREATE TABLE IF NOT EXISTS places (" +
      "id text PRIMARY KEY, name text NOT NULL, " +
      "longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180), " +
      "latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90), " +
      "description text NOT NULL DEFAULT '', image text, " +
      "visit_minutes integer NOT NULL CHECK (visit_minutes >= 0), " +
      "metadata jsonb NOT NULL DEFAULT '{}'::jsonb);" +
      "CREATE TABLE IF NOT EXISTS tours (" +
      "id text PRIMARY KEY, name text NOT NULL, payload jsonb NOT NULL);" +
      "CREATE TABLE IF NOT EXISTS scenes (" +
      "id text PRIMARY KEY, tour_id text NOT NULL REFERENCES tours(id), payload jsonb NOT NULL);" +
      "CREATE TABLE IF NOT EXISTS road_networks (id text PRIMARY KEY, payload jsonb NOT NULL);"
    );
    for (const p of places) {
      const { id, name, longitude, latitude, description, image, visitMinutes, ...metadata } = p;
      await db.query(
        "INSERT INTO places " +
        "(id,name,longitude,latitude,description,image,visit_minutes,metadata) " +
        "VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) ON CONFLICT (id) DO UPDATE SET " +
        "name=EXCLUDED.name, longitude=EXCLUDED.longitude, latitude=EXCLUDED.latitude, " +
        "description=EXCLUDED.description, image=EXCLUDED.image, " +
        "visit_minutes=EXCLUDED.visit_minutes, metadata=EXCLUDED.metadata",
        [id, name, longitude, latitude, description ?? "", image ?? null,
         visitMinutes, JSON.stringify(metadata)]
      );
    }
    for (const t of tours) {
      await db.query(
        "INSERT INTO tours (id,name,payload) VALUES ($1,$2,$3::jsonb) " +
        "ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,payload=EXCLUDED.payload",
        [t.id, t.name, JSON.stringify(t)]
      );
    }
    for (const s of scenes) {
      await db.query(
        "INSERT INTO scenes (id,tour_id,payload) VALUES ($1,$2,$3::jsonb) " +
        "ON CONFLICT (id) DO UPDATE SET tour_id=EXCLUDED.tour_id,payload=EXCLUDED.payload",
        [s.id, s.tourId, JSON.stringify(s)]
      );
    }
    if (networkEnabled) {
      await db.query(
        "INSERT INTO road_networks (id,payload) VALUES ('demo',$1::jsonb) " +
        "ON CONFLICT (id) DO UPDATE SET payload=EXCLUDED.payload",
        [JSON.stringify(network)]
      );
    }
    await db.query("COMMIT");
    console.log("Đã nạp", places.length, "POI,", tours.length, "tour,", scenes.length, "scene.");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
seed().catch(error => {
  console.error("Seed thất bại:", error instanceof Error ? error.message : "Lỗi không xác định");
  process.exitCode = 1;
}).finally(() => pool.end());
```

Script giữ model/tourId/sourceId/datasetKind trong places.metadata; tours và scenes giữ payload JSONB. File ảnh/model không được nhét vào JSONB.

Kiểm tra trên chỉ bắt lỗi cấu trúc/liên kết cơ bản; vẫn cần kiểm tra nội dung model, hotspot, nguồn, file tồn tại và khả năng đi tới các scene ở bước 7. Type assertion không tự xác minh JSON đầy đủ.

Seed dùng upsert, không nhân bản cùng ID và **không xóa bản ghi cũ**. Khi đổi hẳn dataset, dùng database riêng hoặc migration có chủ đích để tránh tour/scene cũ còn sót. Chạy từ thư mục server; SEED_DIR đổi nguồn nạp.

### 8.5. API đọc, không làm lộ database

server/src/index.ts:

```ts
import express from "express";
import { pool } from "./db.js";

const app = express();
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch {
    res.status(503).json({ error: "Không kết nối được database" });
  }
});
app.get("/api/places", async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id,name,longitude,latitude,description,image,visit_minutes AS "visitMinutes",metadata ' +
      "FROM places ORDER BY id"
    );
    res.json(result.rows.map(({ metadata, ...base }) => ({ ...metadata, ...base })));
  } catch {
    res.status(500).json({ error: "Không đọc được địa điểm" });
  }
});
for (const table of ["tours", "scenes"] as const) {
  app.get("/api/" + table, async (_req, res) => {
    try {
      // Tên bảng chỉ lấy từ danh sách hằng ở trên, không lấy từ request.
      const result = await pool.query("SELECT payload FROM " + table + " ORDER BY id");
      res.json(result.rows.map(row => row.payload));
    } catch {
      res.status(500).json({ error: "Không đọc được " + table });
    }
  });
}
app.get("/api/network", async (_req, res) => {
  if (process.env.ENABLE_ROAD_NETWORK !== "true") {
    res.status(404).json({ error: "Chức năng mạng đường đang tắt" });
    return;
  }
  try {
    const result = await pool.query("SELECT payload FROM road_networks WHERE id=$1", ["demo"]);
    if (!result.rows.length) {
      res.status(404).json({ error: "Chưa có mạng đường" });
      return;
    }
    res.json(result.rows[0].payload);
  } catch {
    res.status(500).json({ error: "Không đọc được mạng đường" });
  }
});
// Bước 11 thêm static frontend ở đây, trước app.listen.
const port = Number(process.env.PORT ?? 3000);
app.listen(port, "0.0.0.0", () => console.log("API đang chạy ở cổng", port));
```

### 8.6. Seed và thử API

```cmd
cd /d E:\08_Project\GIS_LEARNING\gis-flow-demo\server
npm run db:seed
npm run build
npm run dev
```

Nếu dùng bộ mock riêng, trước seed đặt:

```cmd
set SEED_DIR=../client/public/data/mock
npm run db:seed
set SEED_DIR=
```

Mở:

- http://localhost:3000/api/health → ok true.
- http://localhost:3000/api/places → model/tourId không bị mất.
- http://localhost:3000/api/tours → placeId và entrySceneId.
- http://localhost:3000/api/scenes → ảnh và hotspot.
- /api/network chỉ hoạt động khi ENABLE_ROAD_NETWORK=true và đã seed mạng; tắt mặc định là bình thường.

Lỗi kết nối: kiểm tra dịch vụ PostgreSQL, cổng, database, .env và seed. Không đưa mật khẩu thẳng vào code để “sửa nhanh”.

## Bước 9 — React đọc API

client/vite.config.ts:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:3000" } }
});
```

client/src/services/api.ts:

```ts
export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error("HTTP " + response.status + ": " + path);
  return response.json() as Promise<T>;
}
```

Prompt:

> Thay nguồn dữ liệu lõi bằng /api/places, /api/tours và /api/scenes. Giữ nguyên hợp đồng phần A và toàn bộ UC04–UC08. TypeScript generic không thay kiểm tra JSON runtime. Xử lý hủy fetch khi unmount, trạng thái tải/lỗi/thử lại. Không fallback âm thầm về file, không vẽ POI trùng từ hai nguồn. Không tải /api/network nếu chức năng phụ đang tắt. URL ảnh/model vẫn tải từ public hoặc kho tài sản, không đi qua SQL. Lỗi một ảnh/model không làm sập bản đồ hoặc mất thông tin POI.

Chạy backend và frontend trong hai terminal như các bước trước; đổi vite.config cần khởi động lại frontend.

**Mốc API:** Network thấy ba endpoint lõi trả 200; đủ UC04–UC08. Tắt backend và refresh: báo lỗi dữ liệu rõ ràng, không dùng bản JSON để giả kết nối thành công.

## Bước 10 — Kịch bản chứng minh database và chức năng

Trong pgAdmin → gis_learning_v2 → Query Tool:

```sql
SELECT id, name, longitude, latitude, metadata FROM places ORDER BY id;
SELECT id, tour_id FROM scenes ORDER BY id;
```

Chọn ID thực có trong database, ví dụ p1; chỉ chạy UPDATE một lần:

```sql
UPDATE places SET name = name || ' [Demo DB]' WHERE id = 'p1';
```

Refresh ứng dụng: tên thay đổi trong danh sách/chi tiết. Khôi phục sau demo:

```sql
UPDATE places SET name = replace(name, ' [Demo DB]', '') WHERE id = 'p1';
```

Không seed lại giữa lúc chứng minh cập nhật DB, vì tên trong file sẽ ghi đè.

Kịch bản báo cáo:

1. Bản đồ TP.HCM → tìm POI → phóng camera và xem thông tin.
2. Mô hình công trình chi tiết xuất hiện tại POI; giải thích dữ liệu model và vị trí đặt.
3. Bắt đầu tham quan → chuyển ít nhất ba ảnh/scene bằng navigation hotspot → mở thuyết minh → quay lại bản đồ.
4. Network/API và đổi tên trong PostgreSQL chứng minh luồng dữ liệu.
5. Nếu giữ định tuyến, demo sau cùng và gọi rõ là chức năng phụ giữa POI.

Chụp cảnh/mô hình, tour ảnh/hotspot và luồng API/DB. Không chụp secret. Nêu rõ dữ liệu còn giả, vị trí chưa kiểm chứng hoặc ảnh chưa đủ góc nhìn; không báo cáo là hoàn thành nếu chỉ có camera tour.

## Bước 11 — Deploy tùy chọn sau khi local ổn

Một Node.js Web Service có thể phục vụ cả React build và API; PostgreSQL là dịch vụ riêng. Hosting nào cũng cần đúng cấu hình tương ứng, Render dưới đây chỉ là một ví dụ.

### 11.1. Thử production local

Thêm import vào server/src/index.ts:

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
```

Thêm trước app.listen:

```ts
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API không tồn tại" });
});
const clientDist = fileURLToPath(new URL("../../client/dist/", import.meta.url));
app.use(express.static(clientDist));
app.get("/", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});
```

Chưa dùng React Router nên không cần wildcard route. Không phục vụ toàn bộ project bằng express.static.

```cmd
cd /d E:\08_Project\GIS_LEARNING\gis-flow-demo\client
npm run build
cd ..\server
npm run build
npm start
```

Dừng dev backend trước để tránh trùng cổng; mở http://localhost:3000. Đủ model/ảnh/API ở production local mới deploy.

### 11.2. GitHub và Render

Tạo repo gis-flow-demo riêng khi nhóm sẵn sàng. Trước commit kiểm tra .env không nằm trong staged files, giữ cả hai package-lock.json. Không cần push hai repository tham khảo vào repo của nhóm.

Trên Render:

1. Tạo PostgreSQL và Node Web Service từ repo, cùng vùng. Root Directory là gốc gis-flow-demo.
2. Dùng Node major tương thích giống local. Đặt DATABASE_URL bằng URL phù hợp của database Render, không dùng localhost.
3. ENABLE_ROAD_NETWORK=false nếu không cần tuyến phụ.
4. Build Command sau là shell Linux trên Render, không phải CMD:

```sh
npm ci --include=dev --prefix client && npm run build --prefix client && npm ci --include=dev --prefix server && npm run build --prefix server
```

5. Lần khởi tạo database demo có thể dùng Start Command:

```sh
cd server && npm run db:seed && npm start
```

Sau khi seed thành công, **đổi Start Command** để restart không ghi đè cập nhật DB:

```sh
cd server && npm start
```

Đây là cách seed demo; triển khai lâu dài dùng migration/seed riêng. File nguồn client/public/data phải còn trong checkout khi seed. Muốn giữ thay đổi đã làm trong database local phải backup/restore hoặc cập nhật nguồn có kiểm soát; push code không chuyển database.

6. Mở link ứng dụng và /api/health; thử lại UC04–UC08, kiểm tra URL ảnh/model, HTTPS, CORS nếu tài sản ở domain khác.
7. Render Free hiện ngủ Web Service sau 15 phút không truy cập; PostgreSQL Free hết hạn sau 30 ngày. Kiểm tra lại dashboard trước buổi demo.

Ảnh/model có sẵn trong repository/build được triển khai cùng bản web. **File upload mới trong lúc chạy** cần kho lưu trữ bền vững riêng; không dựa vào filesystem tạm của Web Service Free. Luôn giữ bản nguồn và backup database ngoài môi trường demo.

## Bước 12 — Điều kiện hoàn thành và bàn giao

| Mốc | Điều kiện |
|---|---|
| React đọc JSON | Đủ UC04–UC08 như phần A, không trùng lớp/tài nguyên |
| Dữ liệu | Nguồn rõ, model đặt đúng, graph ảnh không đứt |
| PostgreSQL/API | places/tours/scenes giữ đủ metadata và liên kết |
| React đọc API | Network có request thật; mất API báo lỗi |
| Chứng minh DB | Sửa tên trong DB → refresh web đổi |
| Deploy, tùy chọn | Production local và link Internet đều tải được tài sản |

Build client/server phải qua khi thực hiện. Seed chỉ kiểm tra một phần dữ liệu; nhóm vẫn cần chạy kịch bản và ghi kết quả thực tế. Hướng dẫn này chưa chạy build vì chỉ cập nhật tài liệu, chưa tạo project React/backend.

Prompt bàn giao:

> Rà soát demo theo phần A và phần B. Viết README đúng lệnh đã chạy, nguồn dữ liệu, biến môi trường, cách seed/backup và hạn chế. Phân biệt camera tour, tour ảnh và tuyến giữa POI. Không thêm tính năng ngoài phạm vi; ghi lỗi còn lại và cách tái hiện, không tuyên bố đã kiểm chứng khi chưa chạy.

## Nguồn chính thức

- React + ArcGIS: https://developers.arcgis.com/javascript/latest/react/
- Scene component: https://developers.arcgis.com/javascript/latest/references/map-components/arcgis-scene/
- PostgreSQL Windows: https://www.postgresql.org/download/windows/
- OSM attribution: https://www.openstreetmap.org/copyright
- Render Node.js: https://render.com/docs/deploy-node-express-app
- Render PostgreSQL: https://render.com/docs/postgresql-creating-connecting
- Render Free: https://render.com/docs/free
