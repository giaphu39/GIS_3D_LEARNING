# Kiến thức ArcGIS/GIS cho đồ án du lịch ảo 3D

Bản ghi nhớ báo cáo — 17/10/2026. Thực hành: [SDK bước 1–5](guide_arcGis_js.md) và [tích hợp từ bước 6](guide_integrate.md).

## 1. GIS và ArcGIS là gì?

- **GIS**: hệ thống làm việc với dữ liệu có vị trí; gồm thu thập, quản lý, phân tích và hiển thị. Bản đồ chỉ là một phần.
- **ArcGIS**: hệ sinh thái GIS của Esri, gồm nhiều sản phẩm; không phải chỉ một thư viện.
- **ArcGIS Maps SDK for JavaScript**: công cụ lập trình bản đồ 2D/3D trong website. Nhóm dùng nó với React/TypeScript để hiển thị và tương tác.
- **ArcGIS Online**: nền tảng cloud quản lý dữ liệu, lớp, bản đồ/cảnh và chia sẻ. Tiện khi muốn quản lý bằng giao diện và dùng dịch vụ có sẵn; không bắt buộc nếu nhóm tự cung cấp dữ liệu bằng backend.
- **ArcGIS Pro**: ứng dụng desktop để biên tập/phân tích và chuẩn bị dữ liệu chuyên sâu; không bắt buộc cài chỉ để chạy website SDK.

## 2. Hai cách đưa bản đồ lên web

| Cách | Làm gì? | Khi dùng? |
|---|---|---|
| iframe | Nhúng trình xem đã cấu hình | Trang giới thiệu nhanh, ít logic riêng |
| JavaScript SDK | Lập trình đối tượng, camera, sự kiện, giao diện | Tour, tìm kiếm, chọn đối tượng, tương tác tùy biến |

Demo bước 1–5 đã dùng SDK. CDN hay npm chỉ là cách nạp thư viện, không phân biệt iframe/SDK. Dùng ArcGIS Online để dựng cảnh vẫn có thể tải cảnh bằng SDK và code thêm.

**Publish ≠ Public**: Publish tạo dịch vụ/lớp; Public là quyền truy cập công khai. Lớp đã Publish có thể Private. Private cần xác thực ArcGIS phù hợp; đăng nhập website riêng không tự cấp quyền. Upload CSV mới lưu file, chưa chắc tạo hosted layer. Tài khoản Public không được publish hosted feature layer. Email trường không tự cấp giấy phép/quyền.

**Deploy ≠ Publish hosted layer**: website có thể deploy với dữ liệu do Node.js/PostgreSQL cung cấp, không cần hosted layer trên ArcGIS Online. Nhưng nguồn nền/địa hình/dịch vụ vẫn có điều kiện truy cập, giấy phép và hạn mức riêng.

## 3. Các khái niệm cần giải thích được

| Khái niệm | Ý nghĩa trong đồ án |
|---|---|
| Layer | Lớp điểm du lịch, tuyến, công trình |
| Graphic / Feature | Đối tượng có hình học và thuộc tính, ví dụ vị trí + tên di tích |
| Web Scene | Cấu hình cảnh: lớp, nền, môi trường, góc nhìn/slide; không tự sao chép hết dữ liệu nguồn |
| SceneView / arcgis-scene | Phần hiển thị và tương tác cảnh 3D |
| Camera, goTo | Điều khiển vị trí và hướng nhìn |
| Slide | Lưu góc nhìn/trạng thái cảnh để tham quan |
| hitTest | Xác định đối tượng được chọn tại vị trí màn hình |
| GeoJSON | Định dạng dữ liệu địa lý; Point, LineString, Polygon; JSON thường chưa chắc là GeoJSON |
| CRS, cao độ | Hệ tọa độ và cách đặt đối tượng theo mặt đất/độ cao |

GeoJSON dùng [kinh độ, vĩ độ], không đảo thứ tự. Chiều dài cần tính bằng mét với phép đo thích hợp, không lấy chênh lệch độ làm mét. Nền địa hình 3D không đồng nghĩa có mô hình di tích; tour 3D trong trình duyệt cũng chưa phải trải nghiệm kính VR.

## 4. Chức năng có thể xây cho hệ thống

| Chức năng | ArcGIS làm phần nào? | Nhóm tự làm phần nào? |
|---|---|---|
| Xem bản đồ/không gian 3D, UC05/07 | Vẽ nền, địa hình, lớp và điều hướng | Chọn dữ liệu, giao diện và giới hạn phạm vi |
| Tìm kiếm, UC04 | Truy vấn lớp hoặc hiển thị kết quả | Lọc API/dữ liệu, danh sách và lựa chọn |
| Chi tiết, UC06 | Chọn đối tượng, popup/highlight | Nội dung, ảnh, thuyết minh |
| Tour, UC08 | Camera, hiển thị tuyến và điểm | Kịch bản, thứ tự dừng, tiến độ |
| Tìm đường | Vẽ đường kết quả; có dịch vụ định tuyến nếu chọn dùng | Chuẩn bị mạng, Dijkstra/quy tắc hoặc tích hợp dịch vụ |
| Quản lý GIS/3D, UC13 | Hiển thị/chỉnh sửa qua API tùy dữ liệu/quyền | Nguồn mô hình, lưu trữ, phân quyền, phiên bản |
| Yêu thích, đánh giá, tài khoản | Có thể đánh dấu vị trí liên quan | Backend/database và nghiệp vụ |

Có thể mở rộng: đo khoảng cách, lọc loại địa điểm, đổi lớp, bật/tắt công trình, ánh sáng theo thời điểm, tìm điểm gần nhất, vùng đệm. Phân biệt công cụ SDK hỗ trợ với chức năng nhóm đã triển khai, không báo cáo khả năng thư viện như kết quả đã làm.

**Tour dựng sẵn**: thứ tự A → B → C. **Tìm đường**: tối ưu trên graph có nút, cạnh, trọng số và quy tắc. Dijkstra không âm; tối ưu theo trọng số nào thì chỉ khẳng định theo trọng số đó. Mạng thiếu đường/cổng/quy tắc không thể đảm bảo tuyến thực tế tốt nhất. Trong demo hiện tại thuật toán chạy ở client, PostgreSQL lưu dữ liệu.

## 5. Tự tạo dữ liệu cần làm gì?

1. Chọn khu vực nhỏ, xác định đối tượng và chế độ di chuyển.
2. Điểm: khảo sát/GPS hoặc dữ liệu mở; đặt vào cổng/điểm tiếp cận, bổ sung ID và nội dung có nguồn.
3. Tuyến: số hóa lối đi có quyền dùng hoặc lấy OSM; kiểm tra nối nút, một chiều, cấm đi, cầu/hầm và đoạn tiếp cận.
4. Mô hình: tự dựng trong công cụ 3D hoặc dùng model có giấy phép; tối ưu số đa giác/texture, kiểm tra định dạng SDK hỗ trợ.
5. Đặt mô hình đúng vị trí, hướng, đơn vị và cao độ; một file GLB không tự bảo đảm đúng tọa độ địa lý.
6. Lưu nguồn, ngày lấy, giấy phép, CRS và mức xác minh; thử trên cảnh trước khi nạp database.

PostgreSQL có thể lưu tọa độ + JSONB cho demo. PostGIS hữu ích khi cần kiểu geometry/geography, truy vấn không gian và chỉ mục; cài PostGIS không tự tạo mạng hoặc tính đường, cũng không phải điều kiện để vẽ bản đồ.

## 6. Ví dụ: bấm lư hương để thắp nhang online

Đây là tính năng tương tác do nhóm xây, không phải chỉ bật một nút có sẵn trong ArcGIS Online.

**Luồng tối thiểu:**

```text
Tạo đối tượng lư hương có ID → người dùng bấm → hitTest
→ nhận diện đúng ID → mở nút Thắp nhang → hiển thị hiệu ứng
```

Các bước:

1. Tạo một Graphic đại diện lư hương (giai đoạn đầu dùng biểu tượng điểm). Gán incenseBurnerId và interactionType='incense'.
2. Khi có mô hình 3D, đặt model đúng vị trí. Nếu lư hương nằm trong một mesh công trình chung không có đối tượng tách biệt, tạo hotspot/proxy Graphic riêng để chọn; không mặc định SDK tự hiểu bộ phận nào là lư hương.
3. Bắt sự kiện click và dùng view.hitTest, giới hạn lớp tương tác. Lấy ID từ Graphic được chọn, hiển thị thông tin/nút xác nhận hành động.
4. Khi nhấn Thắp nhang, thêm biểu tượng nhang/trạng thái hoặc animation UI. Nút hiện tượng trưng là đủ cho demo; khói/lửa 3D chân thực cần hiệu ứng/rendering riêng, không mặc định model có sẵn animation sẽ phát được.
5. Quyết định phạm vi: hiệu ứng chỉ trên máy hiện tại thì giữ React state; cần lưu lịch sử/số lượt thì gửi POST tới Node.js để lưu PostgreSQL; nhiều người thấy đồng thời thì thêm cơ chế đồng bộ sau.
6. Chống bấm lặp ngoài ý muốn, dọn hiệu ứng/timer khi rời cảnh, có thời gian tự tắt; ghi rõ đây là hoạt động tượng trưng trong trải nghiệm số.

Prompt demo:

> Thêm một Graphic hotspot lư hương có ID trong lớp tương tác riêng. Dùng hitTest mở bảng thông tin và nút Thắp nhang. Khi nhấn, hiển thị biểu tượng nhang và hiệu ứng UI nhẹ trong 10 giây, sau đó dọn sạch. Chỉ dùng state local, không backend, không đụng tới mạng tuyến/tour. Ghi rõ hiệu ứng tượng trưng; chưa có mô hình công trình.

## 7. Hạn chế và lựa chọn của nhóm

- Không có quyền Publish: vẫn dùng SDK + JSON/API; chỉ thiếu phương án hosted layer trên ArcGIS Online.
- ArcGIS Online: quyền theo tài khoản/tổ chức, một số thao tác lưu trữ/dịch vụ tiêu thụ credits; public scene chưa đủ nếu lớp còn private.
- Trình duyệt vẫn vẽ 3D bằng máy người xem, chịu giới hạn RAM/GPU/Internet. Cloud không xóa nhu cầu tối ưu mô hình.
- Dữ liệu frontend được tải tới trình duyệt không tự private; muốn bảo vệ phải kiểm soát API/quyền truy cập.
- Phạm vi báo cáo hiện tại: SDK JavaScript → React → API/PostgreSQL. Chưa có công trình 3D, kính VR hoặc hệ thống quản trị hoàn chỉnh.

## Nguồn đọc thêm

- Scene/3D: https://developers.arcgis.com/javascript/latest/scenes-3d/
- React: https://developers.arcgis.com/javascript/latest/react/
- Chọn đối tượng: https://developers.arcgis.com/javascript/latest/sample-code/scene-hittest/
- Publish và tài khoản Public: https://support.esri.com/en-us/knowledge-base/faq-can-a-user-with-a-public-account-publish-hosted-fea-000012093
- Chia sẻ scene: https://doc.arcgis.com/en/arcgis-online/share-maps/share-scenes.htm
- Nguồn OSM: https://www.openstreetmap.org/copyright

## 8. ArcGIS Online thay thế phần nào của kiến trúc tự triển khai?

**Đúng: ArcGIS Online có thể lưu trữ và cung cấp dịch vụ dữ liệu GIS giúp nhóm. Nếu không dùng hosted layers, nhóm phải có nơi cung cấp dữ liệu tương ứng cho ứng dụng. Tuy nhiên, ArcGIS Online không tự thay thế toàn bộ React + Node.js + PostgreSQL của hệ thống.**

| Thành phần tự triển khai | ArcGIS Online có thể đảm nhiệm gì? |
|---|---|
| Lưu điểm, tuyến, thuộc tính GIS trong PostgreSQL | Hosted feature layers lưu và quản lý những dữ liệu GIS đã xuất bản; nhóm không cần vận hành PostgreSQL riêng chỉ cho các lớp đó |
| API Node.js đọc/truy vấn/chỉnh sửa lớp GIS | Dịch vụ/API của hosted layers cung cấp các thao tác tương ứng theo khả năng và quyền; có thể giảm phần API GIS phải tự viết |
| Lưu cấu hình lớp, popup, góc nhìn | Web Map/Web Scene lưu cấu hình để ứng dụng tải lại |
| Lưu và cung cấp dữ liệu 3D phù hợp | Các loại hosted 3D layers; vẫn cần chuẩn bị và xuất bản đúng định dạng |
| Frontend React tự code | Không tự host project React tùy ý chỉ vì đã Publish một lớp. Nhóm vẫn deploy React; có thể chọn công cụ dựng ứng dụng do Esri cung cấp nếu phù hợp |
| Backend tài khoản, đánh giá, yêu thích, logic thắp nhang | Không tự được thay thế. Có thể thiết kế lại một số dữ liệu bằng bảng/lớp, nhưng nghiệp vụ và bảo mật vẫn phải xây; mặc định giữ backend/database riêng |

Hai kiến trúc đều dùng được ArcGIS JavaScript SDK:

```text
A. Dùng hosted layers cho phần GIS
React + ArcGIS SDK → dịch vụ lớp ArcGIS Online → dữ liệu GIS do Esri host
                  → Node.js → database riêng cho nghiệp vụ, nếu có

B. Nhóm tự cung cấp dữ liệu GIS
React + ArcGIS SDK → Node.js API → PostgreSQL của nhóm
```

**Muốn mọi người dùng CHUNG dữ liệu cập nhật:** trong kiến trúc B, backend cần chạy trên máy chủ có thể truy cập và kết nối tới một PostgreSQL dùng chung, hoạt động ổn định. Chỉ deploy React nhưng giữ database trên laptop thường không tạo thành hệ thống dùng chung sẵn sàng. localhost trong trình duyệt của người khác là máy họ, không phải máy của bạn.

PostgreSQL có thể đặt cùng VPS với backend, trên một máy chủ riêng, hoặc dùng dịch vụ quản lý sẵn như Render Postgres/Amazon RDS for PostgreSQL. Trên AWS có hai hướng khác nhau: tự cài PostgreSQL trên EC2 (tự quản trị) hoặc dùng RDS (AWS quản lý một phần vận hành). Dùng dịch vụ cloud không nhất thiết là self-host theo nghĩa tự quản trị; gọi chính xác hơn là nhóm tự triển khai ứng dụng và chọn nơi lưu dữ liệu.

```text
Trình duyệt người dùng → HTTPS → backend → kết nối được cấp quyền → PostgreSQL
```

**Không cần và không nên cho mọi trình duyệt truy cập trực tiếp PostgreSQL.** Database có thể nằm trong mạng riêng, chỉ cho backend kết nối. Không đưa mật khẩu/chuỗi kết nối database vào React. Cần triển khai cả schema và dữ liệu bằng seed/migration hoặc backup/restore; push code GitHub không tự chuyển database local lên máy chủ.

Ngoại lệ cho demo chỉ đọc: GeoJSON tĩnh deploy cùng frontend cũng cho mọi người đọc chung một bản dữ liệu, không bắt buộc có PostgreSQL. Database cần khi kiến trúc nhóm chọn lưu dữ liệu tập trung, cập nhật và nghiệp vụ; không phải yêu cầu của mọi bản đồ web.

**Áp dụng cho nhóm:** giữ React + Node.js + PostgreSQL và deploy chúng qua Render như tài liệu tích hợp. ArcGIS Online là lựa chọn thay thế/bổ sung cho việc host các lớp GIS, không phải điều kiện bắt buộc để website online. Nếu sau này dùng hosted layers, xác định nguồn chính của từng dữ liệu để tránh vừa sửa PostgreSQL vừa sửa ArcGIS Online mà không có cơ chế đồng bộ.

Nguồn: [ArcGIS Online hosted layers](https://doc.arcgis.com/en/arcgis-online/manage-data/hosted-web-layers.htm), [PostgreSQL trên Amazon RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.CreatingConnecting.PostgreSQL.html).

## 9. Nguồn dữ liệu sẵn có để hoàn thiện đồ án và dự trù dung lượng

Kiểm tra ngày 17/10/2026, ưu tiên khu trung tâm TP.HCM. Có thể tận dụng mạng đường, ảnh và một số mô hình; nhóm vẫn cần chuẩn hóa, định vị, kiểm tra và biên tập tour. Nguồn cộng đồng có giấy phép không đồng nghĩa dữ liệu đo đạc chính thức.

**Cách đọc dung lượng:** “đã xác minh” là số ghi trên nguồn hoặc đo file hiện có; “dự trù/mục tiêu” là ước lượng lập kế hoạch, không phải dung lượng tải thực tế. MB/MiB khác nhau: 1 MB = 1.000.000 byte; 1 MiB = 1.048.576 byte. Giữ nguyên đơn vị nguồn khi dẫn số.

### 9.1. Mạng đường và điểm tham quan — OpenStreetMap

- Khu vực nhỏ: [Overpass Turbo](https://overpass-turbo.eu/), xuất OSM thô để dựng graph, GeoJSON để hiển thị.
- Toàn Việt Nam: [Geofabrik Vietnam](https://download.geofabrik.de/asia/vietnam.html). Trang hiện ghi PBF khoảng **315 MB**, Shapefile ZIP **689 MB**, GeoPackage ZIP **706 MB**. Đây là các định dạng thay thế, không cần tải cả ba; số thay đổi theo cập nhật. Dung lượng ZIP/PBF không phải dung lượng sau giải nén, chuyển đổi hoặc nạp database.
- Có đường phố, một số lối đi, địa điểm, footprint công trình, thuộc tính đường tùy vùng. Nhóm phải chọn đi bộ/xe, lọc quyền tiếp cận, dựng graph, kiểm tra một chiều/cầu/hầm/đứt mạng và nối đúng cổng vào. Không dùng riêng ảnh nền để tính đường.
- Project đã có script build_network.py và snapshot OSM. Tái sử dụng, không tải toàn quốc chỉ để demo vài điểm. Đường có sẵn chưa phải tour du lịch có thứ tự/thuyết minh; phần này nhóm biên tập.
- Giữ credit © OpenStreetMap contributors, URL nguồn, ngày lấy và giấy phép ODbL. [Giấy phép OSM](https://www.openstreetmap.org/copyright), [GeoJSON từ Overpass](https://wiki.openstreetmap.org/wiki/Overpass_turbo/GeoJSON).

**Dung lượng dữ liệu đang có trong project, đo tại thời điểm cập nhật:**

| File | Số byte thực đo | Quy đổi gần đúng | Ghi chú |
|---|---:|---:|---|
| data/places.json | 1.109 | 1,08 KiB | Ba địa điểm, chưa chứa ảnh/model |
| data/tours.json | 396 | 0,39 KiB | Thứ tự và camera, route null |
| data/road-network.json | 997.153 | 0,951 MiB | Mạng đã chuyển đổi để tính tuyến |
| data/sources/osm-roads.json | 512.711 | 0,489 MiB | OSM thô lưu đối chiếu, không phải graph chạy trực tiếp |

Các số trên là dung lượng FILE, không phải dung lượng PostgreSQL; database có thêm overhead, index và WAL. Một vùng khác hoặc nhiều thuộc tính hơn có thể khác nhiều. Tuyến và mạng là dữ liệu dùng chung, không nên nhân bản toàn bộ theo mỗi công trình.

### 9.2. Ảnh — Wikimedia Commons

Nguồn có thể chọn ngay:

- [Dinh Độc Lập](https://commons.wikimedia.org/wiki/Category:Independence_Palace).
- [Nhà thờ Đức Bà](https://commons.wikimedia.org/wiki/Category:Notre-Dame_Cathedral_Basilica_of_Saigon).
- [Chợ Bến Thành](https://commons.wikimedia.org/wiki/Category:Ben_Thanh_Market).
- Ví dụ đã kiểm tra: [Independence Palace(Reunification Palace).JPG](https://commons.wikimedia.org/wiki/File:Independence_Palace(Reunification_Palace).JPG), bản hiện tại 1.286 × 789 pixel, **265.516 byte (~259 KiB, trang ghi 259 KB)**, CC0, tác giả Rudolph.A.Furtado. Không nhầm với bản cũ trong lịch sử file có dung lượng khác.

Nhóm chọn ảnh phù hợp, kiểm tra giấy phép TỪNG FILE, tạo thumbnail/WebP/JPEG tối ưu, lưu tác giả/license/source URL và gắn place_id. Không phải mọi ảnh trong cùng category có cùng dung lượng hoặc giấy phép. Dự trù ảnh web sau tối ưu: **0,3–0,8 MB/ảnh** là mục tiêu cho bài này, không phải số đo của toàn bộ kho; thumbnail thường nhỏ hơn. Năm ảnh/công trình tương ứng khoảng **1,5–4 MB** theo mục tiêu đó. Xem [hướng dẫn tái sử dụng](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia).

### 9.3. Mô hình 3D tải được, sát demo hiện tại

| Tài nguyên | Thông tin nguồn đã tìm được | Dung lượng tải về |
|---|---|---|
| [Dinh Độc Lập — Hoàng Huy](https://sketchfab.com/3d-models/dinh-doc-lap-independence-palace-2c4905c6a1fd4fb18981886a77ba4fa9) | Trang được lập chỉ mục có Download 3D Model, khoảng 148.500 tam giác, CC Attribution | **Chưa xác minh số MB của gói tải**; chưa tải file |
| [Nhà thờ Đức Bà — cgart.com](https://sketchfab.com/3d-models/notre-dame-cathedral-basilica-of-saigon-c3dfdc2be8504c4ba7ee076994a15108) | Download 3D Model, khoảng 2.200 tam giác, low-poly/hand-painted, CC Attribution | **Chưa xác minh số MB của gói tải**; chưa tải file |

Không lấy số tam giác để khẳng định dung lượng ZIP/GLB: texture có thể chiếm phần lớn, còn nhiều định dạng tải có kích thước khác nhau. Truy cập trực tiếp Sketchfab khi kiểm tra lại bị 403, nên chưa có số byte tải đáng tin cậy. Không dùng dung lượng một bản mod/game hoặc ảnh preview thay cho dung lượng model gốc. Cần đăng nhập/xem hộp Download và giấy phép hiện tại của đúng model để xác nhận; việc có nút tải không xác nhận sẵn định dạng tối ưu cho ArcGIS.

Sau khi tải: giữ gói gốc, kiểm tra model/texture, chuyển sang GLB/glTF nếu cần, tối ưu, đặt đúng kích thước/đơn vị/hướng/cao độ/tọa độ, kiểm tra mất texture hoặc nổi/lún. Mô hình cá nhân không tự là bản khảo sát chính xác và có thể không có nội thất.

ArcGIS hỗ trợ tài nguyên mô hình glTF/GLB qua [ObjectSymbol3DLayerResource](https://developers.arcgis.com/javascript/latest/references/core/symbols/support/ObjectSymbol3DLayerResource/). Nhóm có thể host file tương thích trên server riêng rồi đặt vào cảnh; không cần Publish model thành hosted layer chỉ cho demo này. Nhúng iframe Sketchfab chỉ là trình xem riêng, chưa đặt mô hình vào không gian GIS.

**Ngân sách model cho lập kế hoạch, KHÔNG phải số đo của hai model trên:**

| Loại mô hình sau xử lý | Dự trù/mục tiêu file triển khai | Lưu ý |
|---|---:|---|
| Low-poly, ít texture | 2–10 MB/công trình | Nên thử đầu tiên |
| Ngoại thất chi tiết vừa | 10–50 MB/công trình | Cần tối ưu và tải theo nhu cầu |
| Scan photogrammetry, nhiều texture lớn | 50–300 MB hoặc hơn/công trình | Có thể vượt xa khoảng này; cần giảm mạnh cho web |

Các khoảng là dự trù kỹ thuật rộng. Không đảm bảo bản gốc sẽ đạt khoảng đó hoặc model có ít tam giác chắc chắn nhẹ. Tải một model, đo và thử thực tế trước khi nhân lên cả bộ.

### 9.4. Địa hình, công trình nền và nội dung giới thiệu

- [ArcGIS Living Atlas/OSM 3D](https://www.esri.com/arcgis-blog/products/arcgis-living-atlas/3d-gis/osm-3d-scene): bối cảnh công trình và nội dung lớp; kiểm tra điều kiện truy cập từng item, độ phủ và quyền sử dụng. Nếu dùng dịch vụ trực tuyến, không có một gói “cả khu vực X MB” cố định: trình duyệt tải theo vùng nhìn/chi tiết/cache. Không coi đó là mô hình di tích chính xác hoặc tự tải lại toàn bộ để host riêng.
- [Copernicus DEM qua OpenTopography](https://portal.opentopography.org/datasetMetadata.jsp?otCollectionID=OT.032021.4326.1): DSM 30 m/90 m, không đủ để dựng chi tiết lư hương, cầu thang hoặc mặt tiền. Dung lượng phụ thuộc vùng cắt, raster và nén; **chưa chọn vùng nên chưa có số tải xác minh**. Ví dụ tính toán thuần: raster một band float32, 1.000 × 1.000 ô có khoảng 4 MB giá trị thô, chưa tính metadata/nén. GeoTIFF không tự trở thành dịch vụ địa hình ArcGIS dùng trực tiếp. Đồ án hiện tại nên giữ nguồn địa hình đã chạy được.
- Nội dung du lịch: [Dinh Độc Lập — tham quan](https://dinhdoclap.gov.vn/tham-quan/), [Cục Du lịch — Dinh Độc Lập](https://vietnamtourism.vn/index.php/tourism/items/281), [Vietnam Tourism — các điểm TP.HCM](https://www.vietnam.travel/vi/things-to-do/10-tourist-spots-not-be-missed-ho-chi-minh-city). Biên tập tóm tắt và dẫn nguồn, xác minh giờ/giá tại thời điểm làm; không mặc định ảnh/văn bản trên website chính thức có giấy phép sao chép. Không có dung lượng tải bộ dữ liệu chuẩn vì đây là các trang nội dung.

### 9.5. Mỗi công trình thêm vào tốn bao nhiêu?

Không có mức cố định. Tách **dữ liệu triển khai**, **bản nguồn làm việc**, **băng thông người xem** và **RAM/VRAM**.

```text
Dung lượng triển khai tăng thêm/công trình
≈ model + texture chưa được đóng gói trong model + ảnh/thumbnail + metadata
```

Nếu GLB đã nhúng texture, không cộng texture thêm lần nữa. Network/nền/thư viện dùng chung tính riêng, không nhân theo công trình. PostgreSQL trong kiến trúc này lưu metadata và URL; model/ảnh ở file hosting hoặc object storage, không mặc định nhét toàn bộ vào bảng.

Ví dụ dự trù, không phải số đo tài nguyên tải về:

| Mức | Giả định | Dung lượng tăng thêm |
|---|---|---:|
| Chỉ điểm + thông tin + 5 ảnh | Mỗi ảnh 0,3–0,8 MB, metadata nhỏ | Khoảng 1,5–4 MB + thumbnail/metadata |
| Thêm model nhẹ | Model gồm texture 2–10 MB + 5 ảnh như trên | Khoảng 3,5–14 MB + phần phụ |
| Thêm model vừa | Model gồm texture 10–50 MB + 5 ảnh | Khoảng 11,5–54 MB + phần phụ |
| Scan lớn | Model gồm texture 50–300 MB hoặc hơn + ảnh | Khoảng 51,5–304 MB hoặc hơn |

Ví dụ dễ tính: 10 công trình, mỗi model+texture 6 MB, mỗi công trình 5 ảnh × 0,4 MB → **10 × (6 + 2) = 80 MB** asset triển khai; 20 công trình cùng mức → **160 MB**. Chưa cộng thumbnail, mạng, frontend build, database/index, log và backup. Đây là ví dụ cùng mức tài nguyên, không cam kết mọi công trình đều 8 MB.

Ổ làm việc cần giữ ZIP gốc + thư mục giải nén + file chỉnh sửa + bản tối ưu, nên có thể tốn nhiều lần bản web. Để lập kế hoạch demo nhỏ có thể dự trù **3–5 lần tổng asset triển khai**, nhưng gói nguồn nặng có thể vượt xa; thay bằng số đo sau khi tải. Băng thông gần bằng tổng tài nguyên người dùng thực sự tải theo phiên trước cache/nén. Nên tải model khi người dùng đến/chọn khu vực, không nạp tất cả ngay lần mở đầu.

**RAM không bằng dung lượng file.** Ví dụ một texture RGBA8 không nén 4.096 × 4.096 cần 64 MiB ở mức ảnh gốc; đầy đủ mipmap khoảng 85 MiB. Đây là phép tính minh họa cho định dạng đó, không phải đo RAM của model; nén GPU, nhiều texture, geometry và bản sao CPU/GPU làm kết quả khác. File JPG/GLB nhỏ không đảm bảo cảnh dùng ít RAM/VRAM.

### 9.6. Cách xác nhận dung lượng bằng giao diện/CMD

1. Trên nguồn tải, ghi định dạng và size hiển thị của đúng gói (nếu có).
2. Sau khi tải, nhấp phải ZIP → Properties, ghi Size; giải nén sang thư mục riêng, xem Properties của toàn thư mục.
3. Sau tối ưu, đo GLB và các texture phụ thực sự cần deploy; không cộng cả ZIP gốc vào dung lượng web.
4. Với CMD trong thư mục model:

```cmd
dir /s /-c
```

Xem tổng số byte của các file cuối phần liệt kê, không nhầm dòng dung lượng ổ trống. Thư mục phải chỉ chứa bản đang đo, tránh gom cả nguồn và output.

5. Trình duyệt F12 → Network → bật Disable cache → tải lại/chọn công trình; ghi transferred/resource size. Đây là số tải web, có thể khác Size trên ổ đĩa do HTTP compression/cache. Đo production build để đánh giá deploy, không lấy toàn bộ node_modules làm số byte người xem tải.
6. Ghi bảng asset: place_id, URL nguồn, tác giả, license, định dạng, byte gói gốc, byte sau giải nén, byte bản triển khai, ngày đo, vị trí/hướng/cao độ và ghi chú hiệu năng. Nếu chưa đo, ghi “chưa xác minh”, không điền ước lượng vào cột số đo.

### 9.7. Chốt bộ dữ liệu cho nhóm

- 3–5 địa điểm trung tâm, nguồn OSM đối chiếu trang chính thức, kiểm tra cổng vào.
- Mạng đường OSM cắt khu vực nhỏ, kiểm tra chế độ di chuyển, graph và nguồn/giấy phép.
- 1–2 tour nhóm biên tập, camera và nội dung theo điểm dừng; tính tuyến là chức năng riêng.
- Ảnh Commons theo từng điểm, tối ưu và ghi nguồn.
- Thử model Nhà thờ Đức Bà trước để kiểm tra quy trình; thêm Dinh Độc Lập khi đo/tối ưu được. Đánh giá texture/file thực tế, không chỉ số tam giác.
- Dùng nguồn địa hình hiện có; chưa cần tự host DEM.
- Tương tác như thắp nhang: nhóm bổ sung hotspot và hành vi, không bịa đó là vật thể thực trong di tích. Có model không đồng nghĩa có sẵn các bộ phận tương tác.

Bộ nguồn này là cơ sở cho bản đồ 3D, chi tiết, tour và mạng tuyến. Chưa xác minh một gói duy nhất chứa toàn bộ dữ liệu đã khớp nhau; nhóm vẫn cần xử lý và kiểm thử tích hợp. Chưa tải các model/ảnh vào project trong lần cập nhật tài liệu này.
