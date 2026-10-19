# Hồ sơ dữ liệu Dinh Độc Lập

Kiểm tra ngày **19/10/2026**. Registry dùng trong ứng dụng: `data/sources.json`. Ba ảnh được đọc/giải mã cục bộ thành công; không sửa các ảnh người dùng đã tải. Các tên file dưới đây nằm trong `data/model_3D/dinh-doc-lap-independence-palace/`.

| sourceId | Tệp / đối tượng | Tác giả, nguồn | Ngày chụp / lấy | Quyền dùng và trạng thái |
| --- | --- | --- | --- | --- |
| palace-model | `source/DINH.glb`; bản dẫn xuất `data/models/dinh-doc-lap.glb` | Hoàng Huy, [Sketchfab](https://sketchfab.com/3d-models/dinh-doc-lap-independence-palace-2c4905c6a1fd4fb18981886a77ba4fa9) | Người dùng đã tải trước phiên làm việc; không xác định ngày tải | CC Attribution theo hồ sơ người dùng cung cấp. Trang Sketchfab không truy xuất lại được trong phiên này; chưa xác nhận phiên bản giấy phép. File GLB 2.0 thực, có geometry và 28 ảnh texture nhúng. |
| palace-gate | `Images_outSource/Entrance building — Matti Blume.jpg` | Matti Blume, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Independence_Palace,_Ho_Chi_Minh_(LRM_20230823_093633).jpg) | 23/08/2023 | Chọn CC BY-SA 4.0 trong các giấy phép nguồn. Ảnh local 1920 × 1438, giữ nguyên; không đối chiếu checksum với bản full resolution. |
| palace-fountain | `Images_outSource/Independence Palace fountain-2 — Balon Greyjoy.jpg` | Balon Greyjoy, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:20190923_Independence_Palace_fountain-2.jpg) | 23/09/2019 | CC0 1.0; ảnh local 1920 × 1280. Nguồn và tọa độ máy ảnh đã đối chiếu. |
| palace-front | `Images_outSource/Independence Palace-1 — Balon Greyjoy.jpg` | Balon Greyjoy, [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:20190923_Independence_Palace-1.jpg) | 23/09/2019 | CC0 1.0; ảnh local 1920 × 1280. Nguồn và tọa độ máy ảnh đã đối chiếu. |
| palace-map | `Images_outSource/SoDoThamQuan.png`; quan hệ khu vực | [Sơ đồ chính thức](https://dinhdoclap.gov.vn/tham-quan/) | Ngày tải không xác định; đối chiếu 19/10/2026 | Chỉ dùng đối chiếu, chưa xác nhận giấy phép tái xuất bản. Không hiển thị ảnh sơ đồ trong tour. |
| palace-architecture | Giới thiệu công trình và nội dung info hotspot | [Kiến trúc Dinh Độc Lập](https://dinhdoclap.gov.vn/kien-truc-dinh-doc-lap/) | Đối chiếu 19/10/2026 | Diễn giải có dẫn nguồn: Ngô Viết Thụ, mốc xây dựng 1962–1966 và rèm hoa đá. |
| legacy-places | Ba POI kế thừa trong `data/places.json` | Dữ liệu sẵn có của dự án | Trước phiên làm việc | Địa điểm có thật; tọa độ/độ chính xác chưa khảo sát. Hai POI còn lại chưa có model/tour ảnh. |

Ứng dụng hiển thị tác giả, giấy phép và link nguồn cho model, mỗi ảnh và nội dung thông tin. Giấy phép ảnh và model không được áp dụng chung cho toàn bộ code dự án.

## Vị trí và quan hệ cảnh

Longitude/latitude dùng WGS84 (EPSG:4326). Tọa độ trong registry là **vị trí máy ảnh theo Commons**, không phải tọa độ vật thể được chụp, không được dùng làm vị trí neo model:

| Ảnh | Kinh độ | Vĩ độ | Hướng nhìn quan sát từ ảnh |
| --- | --- | --- | --- |
| Khu cổng | 106.696869 | 10.777933 | Từ ngoài đường nhìn vào công trình ở cổng |
| Đài phun nước | 106.695700 | 10.777290 | Từ phía Dinh nhìn ra cổng và trục đường |
| Mặt tiền | 106.696658 | 10.777549 | Nhìn về khối nhà chính |

Tour nối **khu cổng ↔ sân/đài phun nước ↔ mặt tiền**; cả bốn cạnh điều hướng được khai báo tường minh. Đây là tour ảnh ngoài trời tại các thời điểm khác nhau, có đổi hướng nhìn; không phải panorama, không phải video đi bộ liên tục và không có ảnh sảnh/nội thất. Hotspot trên ảnh chỉ là nút điều hướng giữa khu vực, không biểu diễn hướng đi chính xác tại từng bước. Không phát sinh GPS giả cho scene.

## Chuẩn hóa mô hình

- Giữ nguyên `source/DINH.glb`: **91.793.476 byte**. SHA256: `46900b15a8cc7d02b0aae9cf164fa8c838eb3b93db18f81dc4a0ff3b2b337226`.
- Bản web: `data/models/dinh-doc-lap.glb`, **21.125.036 byte** (~20,1 MiB). SHA256: `41bdfbbb7461da574477375ea90c5d3ecd10ae376b802c06b85eca715e8f64d4`.
- Script `scripts/prepare_model.py` bỏ primitive phông trời `white-cloud-blue-sky-sea`; giảm texture về tối đa 1024 px, JPEG quality 85, giữ geometry công trình/khuôn viên. Các texture vẫn nhúng trong GLB; không cần tải thư mục texture rời khi chạy web.
- GLB gốc có node scale không đồng nhất và translation. Script giữ transform này, bổ sung parent để đưa tâm khối nhà chính về gốc X/Z, đưa mặt thấp nhất về Y=0, xoay để mặt trước hướng -Z trong glTF (Bắc sau khi SDK đổi Y-up sang Z-up). Báo cáo số đo nằm trong `data/models/dinh-doc-lap.json`.
- Khối mesh nhà chính trước chuẩn hóa có bề ngang khoảng 86,3 và chiều cao khoảng 26,9 đơn vị; so sánh với chiều cao nhà chính 26 m trong nguồn chính thức. Đây là kiểm tra xấp xỉ tỷ lệ, không chứng minh mô hình đo đạc chính xác. Ứng dụng hiểu đơn vị là mét và dùng `scale=1`.
- Neo tại POI kế thừa `[106.695328, 10.776889]`, `headingDegrees=45` theo hướng mặt tiền Đông Bắc của khuôn viên. Đây là **căn chỉnh xấp xỉ, chưa đo đạc/kiểm tra WebGL thực tế**; có thể chỉnh các trường model trong `places.json` sau nghiệm thu trực quan.
- `headingDegrees` tăng theo chiều kim đồng hồ từ hướng Bắc của model đã chuẩn hóa. SDK dùng `mesh.rotate(0,0,-headingDegrees)` đúng một lần, đơn vị độ; scale quanh vị trí neo.
- `relative-to-ground`: truy vấn Ground tại neo, cộng `elevationMeters` một lần vào Z rồi hiển thị layer `absolute-height`. `absolute-height`: dùng trực tiếp `elevationMeters`, không truy vấn ground. Không cộng cao độ thêm ở layer.

API dùng cho SDK 5.1: [meshUtils.createFromGLTF](https://developers.arcgis.com/javascript/latest/references/core/geometry/support/meshUtils/), [Mesh.scale/rotate](https://developers.arcgis.com/javascript/latest/references/core/geometry/Mesh/). Model chỉ tải khi chọn POI, cache theo ID, các lượt tải/chuyển cũ không được thay lựa chọn mới.
