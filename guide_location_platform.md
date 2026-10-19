# Phần C — Phương án 2: ArcGIS Location Platform host POI

Cập nhật: 18/10/2026.

Đọc [phần A](guide_arcGis_js.md) trước. Đây là nhánh **thay thế PostgreSQL/API của phần B cho dữ liệu POI**, không phải bắt buộc làm tiếp sau phần B.

## 1. Phạm vi và kiến trúc

```text
ArcGIS Location Platform → Hosted Feature Layer POI → ArcGIS SDK / giao diện web
Hosting của nhóm → models + ảnh + tours.json + scenes.json + model-config.json
Nguồn nền/địa hình được phép dùng → cảnh 3D
```

Nhóm vẫn viết frontend và bộ tham quan. Location Platform cung cấp dịch vụ dữ liệu không gian, xác thực và các dịch vụ vị trí; không tự tạo mô hình di tích, ảnh hoặc mạng tour.

Dùng cùng UC04–UC08 và hợp đồng dữ liệu phần A. Khác biệt chính là POI chuyển từ places.json sang Feature Service. Chưa cần PostgreSQL, Node.js hoặc React để chứng minh nhánh này; có thể giữ HTML/JavaScript của phần A.

**Trạng thái:** tài liệu chưa publish dữ liệu, tạo credential hoặc sửa ứng dụng thay bạn. Bản virtual-tourism-demo hiện tại chưa có model/tour ảnh, cần hoàn thành phần A trước.

### Phân biệt tài khoản

| Loại | Ý nghĩa với nhánh này |
|---|---|
| ArcGIS Online Public miễn phí | Không có quyền publish hosted feature layer riêng như quy trình này |
| ArcGIS Location Platform | Có data hosting/API credentials; dùng trong free tier của từng dịch vụ |
| ArcGIS Online tổ chức/trường | Một phương án tài khoản khác, quyền/credits theo tổ chức |
| ArcGIS Online trial | Dùng thử có thời hạn; không coi hosted layer là tồn tại vĩnh viễn |

Location Platform có portal và công cụ quản lý bản đồ/dữ liệu nhưng không đồng nhất toàn bộ chức năng/gói tài khoản ArcGIS Online. Không làm theo ảnh dashboard Developer cũ mà bỏ qua việc xác nhận loại tài khoản hiện tại.

## 2. Kiểm tra free tier trước khi làm

1. Đăng nhập https://location.arcgis.com/dashboard/ bằng tài khoản Location Platform.
2. Xem Billing, Usage và quyền Layers and data services.
3. Giữ **pay-as-you-go tắt** nếu mục tiêu chỉ dùng free tier. Với tài khoản mới, PAYG tắt mặc định theo tài liệu hiện hành.
4. Đối chiếu https://location.arcgis.com/pricing/ ngay lúc làm; không suy ra mọi dịch vụ đều miễn phí từ việc đăng ký không mất tiền.

Để định hướng bộ demo nhỏ: tại thời điểm cập nhật, feature storage có free tier 250 MB; tile/file/attachment storage là một nhóm hạn mức riêng. Dữ liệu trả về từ query cũng có hạn mức riêng; ảnh/model nặng không nên đưa vào chỉ vì POI nhỏ. **Không cần bật geocoding, routing hoặc spatial analysis** để có tour ảnh.

Khi PAYG tắt mà vượt hạn mức, dịch vụ có thể ngừng truy cập; storage và bandwidth có quy tắc khôi phục khác nhau. Đây không phải trial 21 ngày, nhưng không có nghĩa được hứa host miễn phí vĩnh viễn bất kể dung lượng, hoạt động tài khoản hoặc chính sách.

Điểm kiểm tra: chụp Usage/Billing để nhóm hiểu loại tài khoản và hạn mức, che thông tin nhạy cảm.

## 3. Chuẩn bị POI để publish

### 3.1. Bộ nguồn thống nhất

Dùng POI đã kiểm chứng ở phần A. Có thể chỉnh sửa bằng QGIS, lưu bản chủ GeoPackage, xuất GeoJSON WGS84. Hoặc chuyển places.json sang GeoJSON bằng script chuyển đổi có kiểm tra.

GeoJSON dùng Point với [longitude, latitude]. Nhập bằng tọa độ có sẵn để không phải geocode địa chỉ và tránh nhầm hạn mức geocoding có lưu kết quả.

Ví dụ **một feature để giải thích schema**, không thay toàn bộ bộ dữ liệu:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [106.695328, 10.776889]
      },
      "properties": {
        "placeId": "p1",
        "name": "Dinh Độc Lập",
        "description": "Nội dung cần đối chiếu nguồn chính thức",
        "visitMinutes": 60,
        "image": "",
        "tourId": "tour-p1",
        "sourceId": "poi-source-p1",
        "datasetKind": "real"
      }
    }
  ]
}
```

Tọa độ ví dụ lấy từ demo hiện tại, chưa phải kết quả khảo sát mới. Chỉ giữ tourId nếu tour đó thật sự có trong tours.json.

### 3.2. Không import nested model/hotspot vào thuộc tính tùy tiện

Feature layer phù hợp với geometry và các trường thuộc tính phẳng. Chọn cách đơn giản cho demo:

| Dữ liệu | Nơi lưu |
|---|---|
| placeId, tên, mô tả, thời gian, image, tourId, sourceId, datasetKind | Hosted Feature Layer |
| Geometry vị trí POI | Hosted Feature Layer, WGS84 đầu vào |
| model theo từng placeId | model-config.json của nhóm |
| tours/scenes/hotspots | tours.json và scenes.json của nhóm |
| File GLB và ảnh | models/ và images/ hoặc kho tài sản của nhóm |

model-config.json là object ánh xạ placeId → giá trị Place.model đã chốt ở phần A; POI không có model có thể không có mục hoặc có giá trị null. Không giữ thêm một danh sách POI từ places.json để vẽ trùng.

Prompt chuyển đổi:

> Đọc places.json đã hoàn thành theo phần A. Tạo poi.geojson chỉ chứa geometry và các thuộc tính phẳng trong bảng trên, dùng placeId bằng id gốc; null image/tourId có thể chuyển thành chuỗi rỗng để import, nhưng adapter phải đổi về null. Tách model sang model-config.json ánh xạ theo placeId, giữ nguyên metadata đặt mô hình. Giữ nguyên dữ liệu nguồn; kiểm tra ID, tọa độ và liên kết tour. Không tạo mô hình/ảnh giả để lấp tài sản thiếu.

Kiểm tra ba POI và các trường bằng QGIS hoặc công cụ đọc GeoJSON. Lưu bản nguồn và thông tin giấy phép; hosted service không phải bản backup duy nhất.

## 4. Publish Hosted Feature Layer

Theo luồng dashboard hiện hành:

1. Layers and data services → **Import data**.
2. Chọn poi.geojson và tạo **hosted feature layer**. Nếu dùng CSV, chỉ rõ trường longitude/latitude; không chọn geocode theo địa chỉ khi đã có tọa độ.
3. Đặt tên dễ nhận biết, ví dụ virtual-tourism-poi-demo.
4. Kiểm tra preview và geometry. Nếu điểm xuất hiện sai quốc gia/vùng, dừng và sửa thứ tự/hệ tọa độ.
5. Kiểm tra schema sau import: placeId/name/tourId/sourceId là text; visitMinutes là số. Đặt độ dài trường đủ chứa mô tả. Nếu importer đổi tên trường, ghi mapping thực tế; không mặc định nó giữ nguyên.
6. Kiểm tra đủ số bản ghi và ID không trùng, không bị cắt mô tả/URL.
7. Lưu item ID và URL **lớp con**, thường kết thúc FeatureServer/0. Item ID không phải URL dịch vụ và không phải business ID placeId.

Không dùng OBJECTID để liên kết tour/model: OBJECTID do dịch vụ quản lý và có thể thay khi publish lại. placeId của nhóm mới là khóa ổn định.

**Điểm kiểm tra:** bảng thuộc tính và bản đồ preview đúng; dữ liệu đã nằm trong hosted service của tài khoản nhóm, không phải chỉ upload file nguồn.

## 5. Cấp quyền cho web truy cập

Hosted data của Location Platform **không chia sẻ anonymous/public trực tiếp**. Website công khai vẫn dùng được khi request có xác thực phù hợp; chỉ copy URL vào web là chưa đủ.

1. Mở Developer credentials → tạo API key credential theo tài liệu.
2. Cho quyền đọc/truy vấn đúng hosted item cần dùng. Nếu đổi nền sang Basemap Styles service, thêm quyền dịch vụ nền tương ứng.
3. Giới hạn website referrers theo cổng local đang dùng và domain deploy. Ví dụ localhost:5500 hoặc localhost:5173 phải khớp URL thực tế; dùng cú pháp dashboard hướng dẫn.
4. Không cấp quyền sửa/xóa cho khóa chỉ phục vụ khách xem.
5. Kiểm tra hạn credential và cách thay khóa trước buổi báo cáo.

API key dành cho ứng dụng trình duyệt sẽ hiện trong request; phạm vi quyền và referrer là phần bắt buộc của thiết kế. Không đưa OAuth client secret, mật khẩu tài khoản hoặc DATABASE_URL vào frontend. Biến VITE_ cũng được nhúng vào frontend build, không phải nơi giữ secret server.

Trong cấu hình ứng dụng, dùng placeholder khi chia sẻ tài liệu/code:

```js
export const gisConfig = {
  poiLayerUrl: "https://YOUR_HOST/arcgis/rest/services/YOUR_SERVICE/FeatureServer/0",
  apiKey: "YOUR_READ_ONLY_SCOPED_API_KEY"
};
```

Điền giá trị thật tại môi trường của nhóm; không dán khóa thật vào ảnh báo cáo hoặc đoạn log gửi công khai. Tài khoản quản lý dùng để import/chỉnh dữ liệu, khách xem chỉ cần credential ứng dụng.

## 6. Tích hợp vào ArcGIS SDK

### 6.1. Giữ cách hiển thị của phần A

Có thể tạo một bản sao riêng gis-location-demo để đối chiếu. Chỉ copy mã ứng dụng và tài sản cần thiết, không copy .git, node_modules hoặc .env của project khác. Không chạy scaffold đè lên virtual-tourism-demo.

Vẫn dùng cùng dòng SDK 5.1 như bản hiện tại. Với HTML CDN, chờ customElements.whenDefined("arcgis-scene") và viewOnReady trước khi thao tác cảnh. Nếu dùng npm/React, làm phần chuyển frontend ở bước 6 phần B; không cần làm backend PostgreSQL của phần B.

### 6.2. Một nguồn POI duy nhất

Prompt triển khai:

> Thêm chế độ nguồn POI được chọn rõ ràng là hosted. Tạo FeatureLayer từ gisConfig.poiLayerUrl với apiKey tương ứng và renderer/popup phù hợp. Chỉ thêm hosted POI layer một lần sau khi scene sẵn sàng; không đồng thời vẽ GraphicsLayer POI từ places.json. Không xóa lớp mô hình riêng. Query các trường đã xác minh sau import và geometry, chuyển tọa độ về WGS84 trước khi đưa vào Place. Adapter map attributes.placeId → Place.id, image/tourId chuỗi rỗng → null, visitMinutes → số hợp lệ; ghép Place.model từ model-config.json theo placeId. Giữ UC04/05/06 và liên kết UC07/08. Không fallback sang local khi key/hosted service lỗi.

Khung truy vấn để đọc dữ liệu cho danh sách/tìm kiếm, sau khi đã tạo poiLayer:

```js
const query = poiLayer.createQuery();
query.where = "1=1";
query.outFields = [
  "placeId", "name", "description", "visitMinutes",
  "image", "tourId", "sourceId", "datasetKind"
];
query.returnGeometry = true;
query.outSpatialReference = { wkid: 4326 };
const result = await poiLayer.queryFeatures(query);
```

Dùng tên trường thực tế của dịch vụ. Đây chỉ là phần query, không phải một ứng dụng hoàn chỉnh. Với bộ ba POI thì kiểm tra đủ ba bản ghi; khi dữ liệu lớn phải xử lý phân trang/giới hạn service, không mặc định query đầu trả toàn bộ.

Nếu dùng renderer/labels theo metadata địa điểm, xác minh mapping field name. Search tiếng Việt không dấu có thể chạy trên danh sách nhỏ đã query; không tự đổi thành một lời gọi geocoding trả phí.

### 6.3. Giữ phần model và tour

- Nhận placeId từ thao tác chọn feature để phóng đến POI và lấy thông tin.
- UC07: tải GLB theo model-config, đặt model theo tọa độ/cao độ/hướng/tỷ lệ đã kiểm chứng.
- UC08: dùng Place.tourId để đọc entrySceneId, hiển thị ảnh và hotspot theo phần A.
- Đóng tour: về POI vừa chọn, không tải lại toàn bộ app.
- Lỗi ảnh/model: hiện lỗi cục bộ, vẫn xem được bản đồ và POI.

Không cần hosted scene layer để đặt một vài GLB trong SDK. Nhánh này **chỉ cam kết quy trình hosted feature layer cho POI**; publish scene layer/địa hình riêng là bài toán khác, phải kiểm tra loại dịch vụ, công cụ và quyền tài khoản.

### 6.4. Web Scene có bắt buộc không?

Không. Có thể tạo cảnh trong code rồi thêm FeatureLayer, nền/địa hình và model.

Nếu dùng Scene Viewer để lưu Web Scene, đó là cấu hình camera/layers/style thuận tiện cho nhóm. JavaScript có thể tải scene bằng item ID khi có quyền, nhưng dữ liệu referenced vẫn nằm ở dịch vụ/file nguồn và có cơ chế xác thực riêng. Một item Web Scene không tự bao gồm ảnh/model/terrain để chạy offline.

Nền và địa hình cũng cần quyền truy cập tương ứng. Dịch vụ lấy giá trị độ cao tại một điểm không đồng nghĩa dịch vụ terrain tiles để dựng cả bề mặt 3D.

## 7. Chứng minh hosted service hoạt động

1. Mở app ở local; Network thấy request tới FeatureServer/0/query hoặc endpoint tương ứng, trả thành công.
2. Bản đồ, tìm kiếm và thông tin đúng ba POI; không có marker trùng do JSON cũ.
3. Trong trang quản lý hosted layer, đổi tạm tên một POI hoặc sửa bằng công cụ được cấp quyền.
4. Refresh app hoặc gọi layer.refresh và query lại danh sách: tên mới xuất hiện. Sau demo khôi phục giá trị.
5. Thử credential thiếu quyền/hết hạn hoặc URL sai: app phải báo lỗi rõ, không âm thầm dùng dữ liệu local.
6. Demo UC07 và UC08 như phần A: mô hình thật sự tải, tour có chuyển ảnh và tương tác.
7. Xem Usage để nhận biết dịch vụ nào phát sinh; che khóa trong ảnh Network.

Sửa layer có thể chưa hiện ngay do cache; chủ động refresh layer và query dữ liệu lại trước khi kết luận lỗi. Không kiểm tra bằng cách chỉ nhìn Web Scene có sẵn của Esri.

## 8. Deploy và sao lưu

### Deploy

Nếu chỉ HTML/JS/JSON/tài sản tĩnh: đưa frontend lên hosting tĩnh của nhóm. Không cần deploy database/backend chỉ để đọc hosted POI.

- Giữ paths đúng, ảnh/model trả 200 và đúng kiểu file; dùng HTTPS.
- Tài sản khác domain cần CORS phù hợp.
- Thêm domain production vào referrer của credential, kiểm tra cả local và production.
- Giữ attribution của dịch vụ nền và nguồn dữ liệu.
- Xem quota trước buổi demo; free tier không thay thế việc kiểm tra thực tế.

Ứng dụng vẫn cần Internet cho hosted POI/nền/địa hình. Tắt Internet không phải bài kiểm tra offline đã được hỗ trợ.

### Backup và chuyển sang phương án 1

Giữ poi.geojson nguồn, model-config.json, tours.json, scenes.json và file tài sản. Nếu sửa trực tiếp trên hosted layer, phải lấy lại dữ liệu mới về bộ nguồn trước khi đổi phương án.

Có thể dùng truy vấn Feature Service đã được cấp quyền hoặc công cụ GIS phù hợp để lấy geometry/attributes và xuất GeoJSON; xử lý phân trang và chuyển hệ tọa độ khi cần. Chỉ xuất dữ liệu nhóm sở hữu hoặc được phép tải. Nút Export Data trong portal phụ thuộc loại tài khoản, quyền và cấu hình lớp; không coi mọi Public account đều có cùng nút export.

GeoJSON chỉ chứa POI/thuộc tính hình học; không tự chứa file GLB/ảnh hoặc toàn bộ cảnh 3D. Không scrape/tải hàng loạt tiles nền từ dịch vụ để làm “bản offline” khi chưa có quyền tương ứng.

## 9. Điều kiện hoàn thành

| Hạng mục | Bằng chứng |
|---|---|
| Hosted POI | Layer thuộc tài khoản nhóm, geometry/trường đúng |
| Credential | Đọc được item, quyền tối thiểu, local và domain deploy hợp lệ |
| UC04–UC06 | Tìm kiếm/chọn/thông tin từ hosted layer |
| UC07 | Model chi tiết đặt đúng ở POI |
| UC08 | Tour ảnh có entry scene, navigation và info hotspot |
| Luồng dữ liệu | Sửa hosted thuộc tính → app cập nhật |
| Lỗi và quota | Không fallback âm thầm; kiểm tra Usage |
| Backup | Có bản dữ liệu nguồn và tài sản độc lập |

Đây là tiêu chí để nhóm thực hiện và ghi kết quả, không phải xác nhận ứng dụng hiện tại đã đạt.

## Nguồn chính thức

- Dashboard: https://location.arcgis.com/dashboard/
- Hướng dẫn dashboard: https://location.arcgis.com/help/dashboard/
- Import hosted feature layer: https://developers.arcgis.com/documentation/portal-and-data-services/data-services/tutorials/tools/import-data-to-create-a-feature-layer/
- Quyền truy cập hosted data: https://location.arcgis.com/help/data-sharing-and-access/
- API key Location Platform: https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/api-key-credentials/location-platform/
- Billing/free tier: https://location.arcgis.com/help/billing/
- Giá và hạn mức hiện tại: https://location.arcgis.com/pricing/
- Tạo Web Scene: https://developers.arcgis.com/documentation/mapping-and-location-services/mapping/tutorials/tools/create-a-web-scene/
