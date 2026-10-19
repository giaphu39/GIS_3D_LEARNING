# Phần A — Demo use case GIS 3D bằng ArcGIS JavaScript, bước 1–5

Cập nhật: 18/10/2026.

> Phần chung cho cả hai phương án: HTML/CSS/JavaScript + JSON + tài nguyên do nhóm chuẩn bị. Sau phần A, chọn **một** nhánh: [phương án 1 — React, API và PostgreSQL](guide_integrate.md) hoặc [phương án 2 — ArcGIS Location Platform](guide_location_platform.md). Không bắt buộc làm lần lượt cả hai. Kiến thức bổ sung: [gis_knowledge.md](gis_knowledge.md).
>
> Tài liệu là kế hoạch thực hiện, không phải xác nhận các tính năng đã có. Tại lần rà soát 18/10/2026, demo hiện có bản đồ, ba POI và tour chuyển camera; chưa có mô hình công trình chi tiết, ảnh tour, scene hoặc hotspot. Việc sửa hướng dẫn không tự sửa ứng dụng.

## Mục đích của bản demo

**Có hai mốc:** bước 2–4 xác nhận nền tảng SDK; bước 5 bổ sung mô hình công trình và tour ảnh để demo các use case cốt lõi. Không gọi cảnh địa hình hoặc tour bay camera là đã hoàn thành UC07/UC08.

Sau khi hoàn thành, bạn cần trình diễn được:

> Mở bản đồ tổng quan → tìm/chọn POI → xem chi tiết → quan sát mô hình 3D của POI → mở tour ảnh → bấm hotspot chuyển scene và xem thông tin hiện vật → thoát về đúng POI.
>
> UC04: tìm kiếm; UC05: bản đồ; UC06: chi tiết; UC07: mô hình 3D; UC08: tham quan ảo tương tác. Tên UC08 là cách gọi đề xuất, cần đồng bộ với sơ đồ use case của nhóm.

Bạn sẽ phân biệt được:

| Phần | Vai trò |
|---|---|
| **ArcGIS Maps SDK for JavaScript** | Hiển thị bản đồ, cảnh 3D, chọn đối tượng và điều khiển camera |
| **ArcGIS Online** | Portal/công cụ cấu hình bản đồ và Web Scene; Public account không publish hosted layer |
| **ArcGIS Location Platform** | Tài khoản dành cho lập trình viên, có free tier cho hosted feature services và API; khác Public account và trial |
| **Code của nhóm** | Giao diện, tìm kiếm, điều khiển tour và kết nối các chức năng |
| **Backend và database** | Lưu dữ liệu nghiệp vụ, tour và quyền truy cập khi cần; chưa cần để học phần A |

**Phạm vi đề xuất:** ba POI để thử tìm kiếm; ít nhất một POI có mô hình công trình phù hợp và một tour gồm ba scene liên kết. Ảnh thường là lựa chọn mặc định dễ thu thập; panorama 360° là tùy chọn. Chỉ chọn địa điểm triển khai sâu sau khi biết có thể lấy mô hình và ảnh.

**Phân biệt nguồn:** bản đồ nền = ảnh/đường/tên địa điểm; địa hình = độ cao đất; mô hình công trình = hình học riêng. Ảnh vệ tinh thấy mái nhà không thay mô hình 3D chi tiết.

Toàn bộ project đặt tại:

```text
E:\08_Project\GIS_LEARNING
```

**Tất cả lệnh bên dưới dùng CMD**, còn việc tạo và sửa file thực hiện trong VS Code.

---

## Bước 1. Chuẩn bị VS Code, công cụ và cache

### 1.1. Mở thư mục học

Trong VS Code:

1. Chọn **File → Open Folder…**
2. Mở:

```text
E:\08_Project\GIS_LEARNING
```

### 1.2. Chọn CMD trong VS Code

1. Chọn **Terminal → New Terminal**.
2. Bấm mũi tên cạnh dấu **+** trong terminal.
3. Chọn **Select Default Profile → Command Prompt**.
4. Mở terminal mới.

CMD thường có dấu nhắc như:

```text
E:\08_Project\GIS_LEARNING>
```

Nếu thấy `PS` ở đầu thì đó vẫn là PowerShell.

### 1.3. Kiểm tra công cụ

```cmd
git --version
node --version
npm --version
```

Nếu thiếu, cài từ [Git](https://git-scm.com/downloads) và [Node.js bản LTS](https://nodejs.org/), sau đó mở lại VS Code.

### 1.4. Đặt cache npm ở ổ E — tùy chọn

Nếu bạn đã cấu hình rồi, chỉ cần chạy lệnh kiểm tra cuối.

```cmd
if not exist "E:\08_Project\npm-cache" mkdir "E:\08_Project\npm-cache"
```

```cmd
npm config set cache "E:\08_Project\npm-cache"
```

```cmd
npm config get cache
```

Kết quả:

```text
E:\08_Project\npm-cache
```

Cấu hình vẫn giữ sau khi khởi động lại máy. Project ở E và cache npm ở E; cache trình duyệt vẫn theo cấu hình của trình duyệt.

**Hoàn thành bước 1:** Node.js/npm hoạt động và terminal đang dùng CMD. Git chỉ cần nếu quản lý mã/lấy repo; cache ổ E là sở thích lưu trữ, không phải yêu cầu của ArcGIS.

---

## Bước 2. Lấy template và chạy cảnh 3D đầu tiên

### 2.1. Nguồn code sử dụng

Dùng repository chính thức [Esri/jsapi-resources](https://github.com/Esri/jsapi-resources), thư mục [`templates/js-maps-sdk-cdn`](https://github.com/Esri/jsapi-resources/tree/main/templates/js-maps-sdk-cdn).

Template dùng SDK qua CDN nên chưa cần cài thư viện ArcGIS vào project. `esri-reference` chỉ là code tham khảo, không cần khi chạy website; có thể dùng HTML ở mục 2.4 và tạo scene riêng ở mục 2.6.

### 2.2. Kiểm tra repo đã clone — tùy chọn nếu cần tham khảo template

```cmd
cd /d E:\08_Project\GIS_LEARNING
```

```cmd
dir
```

**Nếu đã có repo thì không clone lại.** Trong hướng dẫn dưới đây, tên repo là `esri-reference`.

Nếu thư mục của bạn tên `jsapi-resources`, thay `esri-reference` bằng tên đó trong các lệnh.

Kiểm tra template:

```cmd
dir esri-reference\templates\js-maps-sdk-cdn
```

Nếu trước đó dùng sparse checkout nhưng chưa lấy template:

```cmd
git -C esri-reference sparse-checkout set templates/js-maps-sdk-cdn
```

**Chỉ khi chưa clone**, chạy:

```cmd
git clone --depth 1 --filter=blob:none --sparse https://github.com/Esri/jsapi-resources.git esri-reference
```

```cmd
git -C esri-reference sparse-checkout set templates/js-maps-sdk-cdn
```

### 2.3. Chọn một cách khởi tạo, không ghi đè project hiện có

Nếu đã tạo `virtual-tourism-demo` ở các bước trước, giữ thư mục đó và bỏ qua việc sao chép để tránh ghi đè code đang làm.

Nếu chưa có:

```cmd
mkdir virtual-tourism-demo
```

```cmd
REM Chi can sao chep template neu ban chon tu phat trien template.
REM Neu dung HTML o muc 2.4 thi tao index.html trong VS Code, khong can copy.
```

Trong VS Code, chọn **File → Open Folder…** và mở:

```text
E:\08_Project\GIS_LEARNING\virtual-tourism-demo
```

### 2.4. Hiển thị cảnh mẫu

**Chỉ với project mới hoặc file trống:** tạo `index.html` bằng mẫu dưới. Nếu `virtual-tourism-demo` đã có giao diện/code, giữ nguyên, đọc mẫu để hiểu và chạy kiểm tra; không dán đè. Template Esri là nguồn tham khảo, không bắt buộc vừa copy template vừa thay toàn bộ HTML.

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Demo du lịch GIS 3D</title>

    <script type="module" src="https://js.arcgis.com/5.1/"></script>

    <style>
      html,
      body {
        margin: 0;
        width: 100%;
        height: 100%;
      }

      arcgis-scene {
        display: block;
        width: 100%;
        height: 100%;
      }
    </style>
  </head>

  <body>
    <arcgis-scene item-id="1c7a06421a314ac9b7d0fae22aa367fb">
      <arcgis-zoom slot="top-left"></arcgis-zoom>
      <arcgis-navigation-toggle slot="top-left">
      </arcgis-navigation-toggle>
      <arcgis-compass slot="top-left"></arcgis-compass>
    </arcgis-scene>

    <script type="module">
      const sceneElement = document.querySelector("arcgis-scene");

      try {
        await customElements.whenDefined("arcgis-scene");
        await sceneElement.viewOnReady();
        console.log("Cảnh 3D đã sẵn sàng");
      } catch (error) {
        console.error("Không tải được cảnh 3D:", error);
      }
    </script>
  </body>
</html>
```

Đây là cảnh công khai được dùng trong [mẫu Web scene – slides của Esri](https://developers.arcgis.com/javascript/latest/sample-code/webscene-slides/). Nó đang tham chiếu World Imagery và WorldElevation3D/Terrain3D; không có lớp công trình của nhóm. Lưu cấu hình nguồn ở một nơi, giữ attribution, kiểm tra quyền truy cập/sử dụng. Chạy localhost vẫn cần mạng. Nếu nguồn cần xác thực, cấu hình credential hợp lệ hoặc chuyển sang nhánh Location Platform; không bỏ xác thực để né giới hạn.

### 2.5. Chạy website

Cách thuận tiện trên giao diện VS Code:

1. Mở Extensions bằng `Ctrl+Shift+X`.
2. Cài **Live Server**, tác giả **Ritwick Dey**.
3. Nhấp chuột phải vào `index.html`.
4. Chọn **Open with Live Server**.

Hoặc dùng CMD, không cần Live Server:

```cmd
cd /d E:\08_Project\GIS_LEARNING\virtual-tourism-demo
```

```cmd
npx --yes http-server . -p 8080 -c-1
```

Mở [http://localhost:8080](http://localhost:8080). Nhấn `Ctrl+C` trong terminal để dừng.

**Chỉ chọn một cách chạy.** Cần Internet để tải SDK và dữ liệu.

### 2.6. Tạo WebScene riêng trên ArcGIS Online và đưa ID vào project — tùy chọn

Có thể tạo scene mới hoàn toàn, không cần sao chép scene của người khác hoặc dùng `esri-reference`:

1. Đăng nhập [ArcGIS Online](https://www.arcgis.com/home/index.html) bằng **Public Account** miễn phí cho mục đích cá nhân, phi thương mại.
2. Mở **Scene Viewer → New scene → New global scene**. Trong **Basemap**, chọn nền có sẵn; tìm đến TP.HCM và chỉnh góc nhìn. Đây là chọn/cấu hình nền, không tự tạo dữ liệu bản đồ toàn thế giới.
3. Mở **Daylight / Weather**, chọn **Sunny** để bỏ tuyết, chỉnh ánh sáng/bóng đổ. Nếu cần, vào **Slide Manager → Capture slide** để lưu các góc nhìn.
4. Bấm **Save**, đặt tên scene. Vào **Content → My content**, chọn scene của mình → **Share → Everyone (public) → Save**. Public Account được chia sẻ scene cơ bản nhưng không publish hosted layers; các lớp tham chiếu phải có quyền truy cập phù hợp.
5. Mở trang thông tin scene, lấy chuỗi sau `id=` trong URL `https://www.arcgis.com/home/item.html?id=...`.
6. Trong `virtual-tourism-demo/index.html`, chỉ thay giá trị `item-id` của thẻ hiện có, giữ nguyên nội dung bên trong và thẻ đóng:

```html
<arcgis-scene item-id="ID_SCENE_CUA_BAN">
```

Lưu file và tải lại website; thử bằng cửa sổ ẩn danh để kiểm tra quyền truy cập. SDK tải scene bằng ID, còn model/POI/tour ảnh vẫn do project bổ sung. Slide Online cần thêm giao diện SDK nếu muốn bấm chuyển slide trong website; code camera/thời tiết của project có thể ghi đè cấu hình scene.

Nguồn: [Tạo/lưu scene](https://doc.arcgis.com/en/arcgis-online/create-maps/save-scene.htm), [chia sẻ bằng Public Account](https://doc.arcgis.com/en/arcgis-online/share-maps/share-items.htm), [giới hạn miễn phí](https://doc.arcgis.com/en/arcgis-online/reference/faq.htm).

**Hoàn thành bước 2:** thấy cảnh 3D, zoom và xoay được. Bạn đang xác nhận máy và môi trường chạy ArcGIS hoạt động.

---

## Bước 3. Thêm ba địa điểm và xem chi tiết

**Use case:** UC05 — Xem bản đồ GIS; UC06 — Xem chi tiết địa điểm.

### 3.1. Tạo cấu trúc thư mục

Trong Explorer của VS Code, tạo:

```text
virtual-tourism-demo/
├── index.html
├── data/
│   ├── places.json
│   ├── tours.json                 # Tour ảnh: mỗi tour thuộc một POI
│   ├── scenes.json                # Ảnh và các hotspot/liên kết
│   └── camera-tours.json          # Tùy chọn: tour camera cũ, không phải UC08
├── images/                       # Ảnh giới thiệu/ảnh tour
├── models/                       # GLB/glTF và các file phụ nếu có
└── src/
```

Hoặc tạo thư mục bằng CMD:

```cmd
cd /d E:\08_Project\GIS_LEARNING\virtual-tourism-demo
```

```cmd
mkdir data images models src
```

Chỉ tạo file còn thiếu bằng giao diện; không ghi `[]` đè dữ liệu đã có. Các file mảng `places.json`, `tours.json`, `scenes.json` mới có thể bắt đầu bằng:

```json
[]
```

### 3.2. Chuẩn bị dữ liệu

Chọn ba địa điểm gần nhau. Mỗi địa điểm cần:

| Trường | Ý nghĩa |
|---|---|
| `id` | Mã duy nhất, dùng xuyên suốt hệ thống |
| `name` | Tên địa điểm |
| `longitude` | Kinh độ |
| `latitude` | Vĩ độ |
| `description` | Nội dung giới thiệu |
| `image` | Đường dẫn ảnh hoặc `null` |
| `visitMinutes` | Thời gian tham quan dự kiến |

**Bạn cần kiểm tra tọa độ thật.** Chưa có ảnh thì để `null`. Các trường mở rộng sau được thêm khi triển khai bước 5:

| Trường | Ý nghĩa |
|---|---|
| `model` | `null` hoặc cấu hình mô hình: `url`, `longitude`, `latitude`, `elevationMeters`, `heightMode`, `headingDegrees`, `scale`, `sourceId` |
| `tourId` | `null` hoặc mã tour trong `tours.json` |
| `sourceId` | Mã nguồn để tra hồ sơ nguồn gốc/giấy phép |
| `datasetKind` | `real` hoặc `mock`; không gán hình giả thành hiện trạng di tích thật |

Chọn một quy ước tài nguyên cho cả ba hướng dẫn: URL `/images/...`, `/models/...` tính từ gốc ứng dụng, hoặc URL HTTPS đầy đủ. Nếu deploy dưới thư mục con, cần cấu hình base URL và chuyển đổi đường dẫn; không mặc định URL bắt đầu `/` sẽ trỏ đúng GitHub Pages dạng project.

Trước khi chuyển nhánh, bổ sung rõ `model: null`, `tourId: null` cho POI chưa có tài nguyên. Dữ liệu có tên thật nhưng chưa xác minh vẫn phải ghi trạng thái trong hồ sơ nguồn.

### 3.3. Giao AI viết phần hiển thị

Sao chép yêu cầu sau vào công cụ AI đang mở project:

> Giữ ArcGIS SDK qua CDN. Tách CSS và JavaScript thành các file trong src. Đọc data/places.json và hiển thị các địa điểm bằng GraphicsLayer, Graphic, cao độ bám mặt đất. Thêm danh sách và bảng chi tiết địa điểm. Bấm điểm trên bản đồ hoặc danh sách đều chọn cùng một địa điểm. Sau khi dữ liệu tải xong, chuyển camera tới phạm vi các điểm. Có trạng thái đang tải, dữ liệu rỗng và lỗi. Không thêm framework, backend hay tự bịa tọa độ.

**Hoàn thành bước 3:** ba điểm hiển thị đúng vị trí; bấm từng điểm thấy đúng thông tin.

---

## Bước 4. Tìm kiếm và liên kết với camera

**Use case:** UC04 — Tìm kiếm địa điểm.

Giao AI:

> Thêm tìm kiếm theo tên trong places.json, hỗ trợ tiếng Việt không dấu. Hiển thị kết quả trong danh sách. Dùng chung hàm selectPlace(id) cho thao tác chọn từ tìm kiếm, danh sách và bản đồ. Khi chọn, đánh dấu địa điểm, mở chi tiết và chuyển camera bằng view.goTo sau khi view sẵn sàng. Xử lý chuyển camera bị hủy khi người dùng chọn liên tiếp. Có thông báo không tìm thấy kết quả.

Tự kiểm tra:

1. Nhập một phần tên.
2. Chọn kết quả.
3. Kiểm tra camera và thông tin có cùng địa điểm.
4. Nhập từ không có trong dữ liệu.
5. Chọn nhanh nhiều điểm để xem giao diện có bị lỗi không.

**Hoàn thành bước 4:** luồng **tìm kiếm → chọn → xem vị trí → xem thông tin** chạy liên tục.

---

## Bước 5. Hoàn thiện mô hình 3D và tour ảnh tương tác

**Use case:** UC07 — Khám phá không gian 3D; UC08 — Tham quan ảo tương tác.

### 5.1. Giữ lại chức năng cũ và phân biệt hai cấp dữ liệu

Demo hiện tại dùng tours.json dạng stops[{placeId,camera}], chỉ chuyển camera giữa các POI. Trước khi đổi schema:
1. Giữ nội dung cũ trong camera-tours.json bằng VS Code và đổi module đọc tương ứng nếu vẫn dùng chức năng đó.
2. Dùng tours.json mới cho tour ảnh, thêm scenes.json.
3. Không đổi tên/mất dữ liệu cũ âm thầm. Nếu chưa làm bước này, dừng ở mốc SDK cơ bản.

POI là điểm đến trên bản đồ; một POI có thể có nhiều scene ảnh. Mạng scene gồm các liên kết điều hướng bên trong tour, không phải mạng đường giữa các POI. Không cần Dijkstra để chuyển ảnh.

### 5.2. Chuẩn bị tài nguyên tối thiểu và hồ sơ nguồn

Chọn một POI có đủ:
- Một mô hình công trình GLB/glTF có quyền dùng, nhận dạng được địa điểm; nếu chỉ dùng mô hình mẫu phải ghi minh họa và chưa đạt nội dung thật của UC07.
- Ba ảnh tại ba vị trí có quan hệ không gian xác minh được, ví dụ cổng → sân → sảnh.
- Ít nhất hai liên kết chuyển scene và một hotspot thông tin.
- Với đường quay về, khai báo hotspot chiều ngược; không tự coi mọi cạnh là hai chiều.

Tự chụp ảnh thường bằng điện thoại là đủ để bắt đầu. Bộ panorama không bắt buộc. Không kéo giãn ảnh thường thành ảnh hình cầu rồi gọi đó là 360°. Ảnh lấy ở nhiều nguồn phải được đối chiếu vị trí, không ghép ngẫu nhiên thành tuyến thực tế.

Lưu hồ sơ nguồn trong DATA_SOURCES.md do nhóm chuẩn bị: sourceId, file/đối tượng, URL hoặc người chụp, ngày lấy/chụp, giấy phép/quyền dùng, hệ tọa độ, đơn vị, loại dữ liệu thật/giả và trạng thái kiểm chứng. Đây là yêu cầu dữ liệu khi triển khai, không phải tuyên bố đã có tài nguyên.

### 5.3. Hợp đồng dữ liệu dùng chung cho hai nhánh

Ví dụ **schema**, không phải bộ dữ liệu thật chạy ngay. Các file ảnh/mô hình bên dưới là tên minh họa, phải thay bằng file thật.

Bổ sung model và tourId vào POI tương ứng trong places.json:

```json
{
  "id": "p1",
  "name": "Địa điểm đã chọn",
  "longitude": 106.695328,
  "latitude": 10.776889,
  "description": "Thay bằng nội dung đã kiểm chứng",
  "image": null,
  "visitMinutes": 30,
  "model": {
    "url": "/models/site.glb",
    "longitude": 106.695328,
    "latitude": 10.776889,
    "elevationMeters": 0,
    "heightMode": "relative-to-ground",
    "headingDegrees": 0,
    "scale": 1,
    "sourceId": "model-source"
  },
  "tourId": "tour-p1",
  "sourceId": "place-source",
  "datasetKind": "real"
}
```

Các tọa độ trên kế thừa ví dụ hiện có, **chưa xác nhận vị trí neo của mô hình**. Phải đo/chỉnh theo tài nguyên thật. Longitude/latitude dùng WGS84; elevationMeters tính bằng mét; scale là hệ số dương. headingDegrees là quy ước dữ liệu của ứng dụng, cần đổi sang quy ước trục/đơn vị của SDK một lần khi nạp. Không mặc định gốc/tỷ lệ GLB đã đúng GIS.

tours.json là mảng; một tour cơ bản:

```json
[
  {
    "id": "tour-p1",
    "placeId": "p1",
    "name": "Khám phá địa điểm",
    "entrySceneId": "p1-gate"
  }
]
```

scenes.json là mảng; ví dụ ba scene có liên kết hai chiều:

```json
[
  {
    "id": "p1-gate",
    "tourId": "tour-p1",
    "name": "Cổng",
    "type": "image",
    "imageUrl": "/images/p1-gate.jpg",
    "sourceId": "photo-source",
    "hotspots": [
      {
        "id": "gate-to-yard",
        "kind": "navigation",
        "label": "Vào sân",
        "position": {
          "x": 0.65,
          "y": 0.55
        },
        "targetSceneId": "p1-yard"
      },
      {
        "id": "gate-info",
        "kind": "info",
        "label": "Tìm hiểu cổng",
        "position": {
          "x": 0.3,
          "y": 0.4
        },
        "title": "Giới thiệu",
        "text": "Thay bằng thuyết minh có nguồn",
        "audioUrl": null
      }
    ]
  },
  {
    "id": "p1-yard",
    "tourId": "tour-p1",
    "name": "Sân",
    "type": "image",
    "imageUrl": "/images/p1-yard.jpg",
    "sourceId": "photo-source",
    "hotspots": [
      {
        "id": "yard-to-gate",
        "kind": "navigation",
        "label": "Về cổng",
        "position": {
          "x": 0.2,
          "y": 0.6
        },
        "targetSceneId": "p1-gate"
      },
      {
        "id": "yard-to-hall",
        "kind": "navigation",
        "label": "Vào sảnh",
        "position": {
          "x": 0.7,
          "y": 0.5
        },
        "targetSceneId": "p1-hall"
      }
    ]
  },
  {
    "id": "p1-hall",
    "tourId": "tour-p1",
    "name": "Sảnh",
    "type": "image",
    "imageUrl": "/images/p1-hall.jpg",
    "sourceId": "photo-source",
    "hotspots": [
      {
        "id": "hall-to-yard",
        "kind": "navigation",
        "label": "Về sân",
        "position": {
          "x": 0.2,
          "y": 0.55
        },
        "targetSceneId": "p1-yard"
      }
    ]
  }
]
```

Các ID trong ví dụ liên kết đủ, nhưng ảnh/model vẫn là placeholder: thay bằng tài sản thật và đặt lại vị trí hotspot theo ảnh trước khi demo.

Quy ước:
- type=image: position.x/y trong [0,1], đo trên vùng ảnh thực, không đo trên khoảng trắng của khung chứa. Khi resize/zoom, hotspot phải bám đúng ảnh.
- type=equirectangular (tùy chọn): ảnh panorama phù hợp; hotspot dùng position.yaw/pitch theo radian, không dùng x/y. Có thể thêm initialView cho scene; không bắt ảnh thường dùng cùng cơ chế chiếu.
- kind=navigation bắt buộc có targetSceneId cùng tour. kind=info có title/text và audioUrl tùy chọn, không cần scene đích.
- Tọa độ scene trên mặt bằng/GIS là metadata tùy chọn khi có khảo sát; không bịa GPS cho ảnh trong nhà. Chuỗi ID/liên kết đã đủ để điều hướng ảnh.
- Tour gợi ý theo thứ tự scene là phần mở rộng. Mạng liên kết có thể phân nhánh, không bắt buộc mọi người theo một danh sách cố định.

### 5.4. Hiển thị mô hình công trình — UC07

Prompt thực hiện:

> Đọc places.json và mã GIS hiện có. Thêm module tải model theo model.url bằng API glTF/Mesh phù hợp SDK 5.1; đối chiếu tài liệu Esri. Dùng lớp riêng cho mô hình, giữ lớp POI riêng. Hỗ trợ vị trí neo, headingDegrees, scale, heightMode và elevationMeters theo quy ước phần 5.3; với cao độ tương đối phải lấy/móc đúng mặt đất, không cộng độ cao hai lần. Chỉ tải mô hình cần xem, tránh tải trùng khi chọn lại. Khi chọn POI, camera chuyển đến phạm vi mô hình; cho phép quan sát nhiều phía. Báo rõ thiếu/lỗi mô hình. Không biến marker hoặc địa hình thành bằng chứng mô hình công trình. Giữ attribution/nguồn.

Kiểm tra bằng công trình thật: vị trí, hướng mặt tiền, tỷ lệ với khuôn viên, chân công trình và ảnh bề mặt. Xoay nhìn ít nhất hai phía; chọn POI chưa có model không được treo app.

### 5.5. Trình xem tour ảnh — UC08

Prompt thực hiện theo từng phần:

> Tạo module tham quan tách khỏi tour camera cũ. Đọc tours.json/scenes.json theo phần 5.3, kiểm tra ID và liên kết trước khi dùng. Nút Tham quan mở đúng tourId của POI và entrySceneId. Bản đầu dùng ảnh thường + overlay HTML, không cần thư viện 360°. Hiển thị tên scene và hotspot điều hướng/thông tin. Click navigation đổi scene; click info mở nội dung, âm thanh là tùy chọn. Đặt hotspot theo kích thước ảnh thực, xử lý object-fit/resize và giữ vị trí đúng nếu có zoom. Khi ảnh đích tải lỗi, giữ đường quay lại hoặc cho thử lại. Thoát tour quay về đúng POI và trạng thái camera. Không yêu cầu đăng nhập, backend hay Dijkstra.

Sau khi ảnh thường chạy, nếu có panorama thật thì thêm adapter Marzipano/Pannellum phù hợp. Không thay ảnh thường bằng ảnh giả 360° để đạt nghiệm thu.

### 5.6. Kiểm tra dữ liệu và nghiệm thu

Trước khi demo:
1. POI/tour/scene/hotspot có ID duy nhất; tour trỏ đến POI tồn tại; place.tourId và tour.placeId khớp.
2. entrySceneId tồn tại, thuộc đúng tour; mọi targetSceneId tồn tại và cùng tour.
3. Không có scene bị bỏ rơi ngoài chủ đích; có thể tới các scene cần demo từ entry.
4. File ảnh, mô hình, âm thanh truy cập được; không chỉ có đường dẫn placeholder.
5. Model có scale > 0, tọa độ hợp lệ, quy ước cao độ xác định; hotspot nằm trong miền hợp lệ cho loại ảnh.
6. Làm rõ đâu là dữ liệu minh họa, đâu là hiện trạng đã kiểm chứng.

| Mốc | Thao tác trình diễn | Bằng chứng đạt |
|---|---|---|
| UC04 | Tìm không dấu, chọn kết quả; tìm tên không tồn tại | Kết quả đúng; báo rỗng rõ |
| UC05/UC06 | Xoay/zoom bản đồ, chọn POI | Đúng vị trí, chi tiết và lựa chọn đồng bộ |
| UC07 | Phóng đến mô hình, quan sát nhiều phía | Công trình riêng có hình dáng/chi tiết nhận dạng được, đặt đúng |
| UC08 | Mở tour → chuyển ít nhất ba scene → mở info → quay lại → thoát | Điều hướng đúng mạng, hotspot đúng ảnh, trả về POI |
| Trường hợp lỗi | Một ảnh/model thiếu hoặc link scene sai | Báo lỗi, không trắng màn hình/khóa toàn ứng dụng |

**Hoàn thành bước 5** chỉ khi UC07 và UC08 có bằng chứng như trên. Nếu thiếu tài nguyên, ghi rõ phần chưa đạt; không đổi nhãn tour camera thành tour ảnh.

---

## Phụ lục tùy chọn — Tour camera và tìm đường giữa POI

- Web Scene slides/tour camera có thể giữ để giới thiệu các điểm đến; không thay UC08.
- src/network.js, src/routing.js, scripts/build_network.py và road-network.json hiện có là mở rộng mạng đường. Không xóa nếu muốn giữ; không bắt bước 3–5 hoặc hai nhánh sau phụ thuộc vào chúng.
- Nếu cần tìm đường giữa POI, dùng mạng có nodes/edges/chiều dài và Dijkstra; xử lý một chiều, nút cô lập, không có đường. Giữ nguồn OSM, ngày lấy, giới hạn mạng và chế độ di chuyển.
- Mạng scene phục vụ chuyển ảnh; mạng đường phục vụ định tuyến địa lý; không dùng ảnh nền để tự suy ra cạnh/chiều dài.

## Sau phần A: chọn một nhánh

- [Phương án 1](guide_integrate.md): tích hợp React + API + PostgreSQL, tự lưu dữ liệu của nhóm.
- [Phương án 2](guide_location_platform.md): host POI bằng ArcGIS Location Platform; giữ mô hình/tour ở nguồn của nhóm.
- Cả hai vẫn dùng JavaScript SDK. Bản đồ nền/địa hình trực tuyến vẫn cần Internet; "dữ liệu cục bộ" không đồng nghĩa offline toàn bộ.
- Đổi tài liệu chưa có nghĩa đã sửa code ứng dụng. Các prompt, schema và lệnh phải được triển khai/kiểm tra từng mốc.

## Tài liệu chính thức

- [SDK và ví dụ Esri](https://github.com/Esri/jsapi-resources)
- [Web Scene slides — chỉ là tour camera](https://developers.arcgis.com/javascript/latest/sample-code/webscene-slides/)
- [Quy trình đối tượng 3D](https://developers.arcgis.com/javascript/latest/3d-object-workflows/)
- [Mesh](https://developers.arcgis.com/javascript/latest/references/core/geometry/Mesh/)
- [Marzipano và hotspot](https://www.marzipano.net/docs.html)
- [Giới hạn Public account](https://doc.arcgis.com/en/arcgis-online/reference/faq.htm)
