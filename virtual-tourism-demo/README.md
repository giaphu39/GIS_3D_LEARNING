# Demo du lịch GIS 3D

Mở `index.html` qua một máy chủ tệp tĩnh (ví dụ Live Server). Demo dùng JavaScript thuần và ArcGIS SDK 5.1 qua CDN; không cần backend hay bước build.

## Mô hình Dinh Độc Lập và tour ảnh — bước 5.3–5.6

Mở demo, chọn **Dinh Độc Lập**. Mô hình công trình tải theo lựa chọn; **Xem mô hình 3D** đưa camera về phạm vi model hoặc thử lại nếu lỗi. Chọn POI khác xóa model đang hiển thị; hai POI còn lại báo chưa có model.

Nhấn **Tham quan ảnh** để mở tour khu cổng → sân/đài phun nước → mặt tiền. Nhấn mũi tên hoặc tên scene để chuyển cảnh, ⓘ để đọc thông tin kiến trúc. Có zoom/vừa khung, lịch sử quay lại và thử tải lại ảnh. **Thoát tour** hoặc Escape trả về POI và camera trước khi mở. Tour ảnh dùng được ngay cả khi CDN bản đồ gặp lỗi.

`data/places.json` tham chiếu model và tourId; `data/tours.json` + `data/scenes.json` chứa mạng scene; `data/sources.json` chứa attribution. Các URL tài nguyên tương đối tính từ thư mục chứa index.html, nên dùng được khi host trong thư mục con. Tour camera cũ được giữ nguyên dữ liệu ở **`data/camera-tours.json`**.

GLB gốc được giữ nguyên. Bản web ~20,1 MiB đã bỏ phông trời, chuẩn hóa gốc và giảm texture. Vị trí/hướng/tỷ lệ là căn chỉnh xấp xỉ; cần nghiệm thu trực quan. Xem [hồ sơ nguồn](DATA_SOURCES.md) và [kết quả kiểm tra/kịch bản nghiệm thu](ACCEPTANCE.md).

Để dựng lại bản web từ file gốc, chạy `python virtual-tourism-demo/scripts/prepare_model.py` từ thư mục cha (cần Python, Pillow và numpy). File đo kích thước/biến đổi được ghi tại `data/models/dinh-doc-lap.json`.

## Tour camera giữa các địa điểm

Chọn tour, nhấn **Bắt đầu**, dùng **Trước / Tiếp theo** để chuyển điểm và **Kết thúc** để dừng. Chọn địa điểm từ bản đồ hoặc tìm kiếm/danh sách sẽ kết thúc tour và chuyển sang khám phá tự do. Kết thúc giữ lại chi tiết địa điểm cuối đang xem, dừng camera và xóa tuyến tour.

`data/camera-tours.json` chứa một mảng tour. Mỗi tour có `id`, `name`, `stops` không rỗng và `route` tùy chọn. Mỗi điểm dừng có:

- `placeId`: mã có thật trong `data/places.json`; thứ tự trong `stops` là thứ tự tham quan.
- `camera`: `heading` từ 0 đến dưới 360 độ, `tilt` từ 0 đến dưới 90 độ, `scale` lớn hơn 0. Camera nhắm tới tọa độ địa điểm được tham chiếu, không lưu thêm tọa độ giả định.
- `introduction` tùy chọn: nội dung giới thiệu riêng; nếu thiếu, dùng `description` của địa điểm.

Tour mẫu: Dinh Độc Lập → Nhà thờ Đức Bà → Chợ Bến Thành. Các thông số camera là cấu hình góc nhìn cho demo.

Khi `route` là `null` hoặc bị bỏ qua, tour nối thẳng các địa điểm theo thứ tự và ghi rõ **Tuyến minh họa**, không phải tuyến đường đi thực tế. Nếu đã có hình học tuyến, cung cấp đối tượng ArcGIS Polyline với `type: "polyline"`, `spatialReference: { "wkid": 4326 }`, và `paths` là mảng các đường, mỗi đường có ít nhất hai cặp `[kinh độ, vĩ độ]`. Tour không tự tìm đường trên mạng; chức năng này nằm trong phần **Tìm đường trên mạng** riêng.

Logic tour nằm trong `src/tour.js`. Các thao tác chuyển điểm dùng chung `selectPlace` trong `src/main.js` để cập nhật lựa chọn, chi tiết và camera. Tour chỉ được bật khi view sẵn sàng; các lượt chuyển mới thay lượt cũ, bỏ qua kết quả camera cũ và xử lý `AbortError` riêng với lỗi thực sự.

Tham khảo [mẫu Web scene – slides của Esri](https://developers.arcgis.com/javascript/latest/sample-code/webscene-slides/). Demo dùng dữ liệu tour JSON với góc nhìn từng điểm dừng; không yêu cầu lưu slide vào WebScene trên ArcGIS Online.

## Tìm đường trên mạng

Chọn **Nút đầu**, **Nút cuối**, rồi nhấn **Tìm tuyến ngắn nhất**. Kết quả màu xanh liền là đường do Dijkstra tính theo tổng chiều dài cạnh, có xét một chiều. Tuyến tour minh họa màu cam nét đứt vẫn là chức năng khác. Tính hoặc xóa tuyến mạng không thay đổi tiến độ tour, lựa chọn địa điểm hay camera; có thể kéo/zoom bản đồ để xem kết quả. Đổi đầu/cuối sẽ xóa kết quả cũ. Nút đầu trùng nút cuối cho kết quả 0 m; không có đường sẽ báo rõ và không giữ tuyến cũ.

Demo đã kèm trích xuất OpenStreetMap quanh ba địa điểm. Xem [network.md](network.md) để biết nguồn, truy vấn, dữ liệu gốc, cách tính chiều dài, giới hạn và cách dựng lại. Mặc định chọn nút mạng gần Dinh Độc Lập và gần Chợ Bến Thành; đây không phải cổng vào được xác nhận. © OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright).

Có thể thay `data/road-network.json` bằng mạng của nhóm theo cấu trúc:

| Phần | Trường | Ý nghĩa |
| --- | --- | --- |
| `nodes[]` | `id`, `longitude`, `latitude` | Mã duy nhất và tọa độ WGS84 có thật. |
| `nodes[]` | `name` | Tên hiển thị, tùy chọn. |
| `edges[]` | `id`, `from`, `to` | Mã cạnh duy nhất; tham chiếu mã nút. |
| `edges[]` | `lengthMeters` | Chiều dài không âm bằng mét; là trọng số Dijkstra, không phải thời gian. |
| `edges[]` | `oneWay` | Bắt buộc boolean: `true` chỉ từ `from` tới `to`, `false` cho cả hai chiều. |
| `edges[]` | `path` | Tùy chọn: mảng cặp `[kinh độ, vĩ độ]`, đầu/cuối khớp nút `from`/`to`. |
| `metadata` | `source`, `sourceUrl`, `license` | Ghi công nguồn và giấy phép. |
| `metadata` | `defaultFrom`, `defaultTo` | Tùy chọn: mã nút mặc định. |

Nếu thiếu `path`, tuyến tính toán vẫn dựa trên mạng và trọng số đã cung cấp, nhưng phần hiển thị cạnh chỉ nối hai nút bằng đoạn thẳng; giao diện ghi rõ giới hạn này. Không tự gắn địa điểm vào mạng hay bổ sung cạnh còn thiếu. Nút cô lập được giữ nếu có trong dữ liệu nhóm. Dữ liệu rỗng, sai, lỗi tải và cạnh chiều dài âm được xử lý riêng.

Logic đồ thị thuần nằm trong `src/network.js`; bộ đọc dữ liệu và lớp hiển thị mạng nằm trong `src/routing.js`, tách khỏi `src/tour.js`.

## Kiểm tra

Chạy từ thư mục cha:

```powershell
node virtual-tourism-demo/tests/main.test.cjs
node virtual-tourism-demo/tests/network.test.cjs
node virtual-tourism-demo/tests/exploration.test.mjs
node virtual-tourism-demo/scripts/validate-data.mjs
```

Kiểm tra dùng mock DOM/ArcGIS cho tìm kiếm, lựa chọn, tour tiến/lùi, ranh giới, hủy camera, lỗi, hình học tuyến và tính độc lập của hai chức năng. Kiểm tra Dijkstra gồm trọng số, một chiều, hai chiều, nút cô lập, không có đường, cạnh song song, cạnh 0 m, dữ liệu sai và mạng OSM thực. Các tọa độ tổng hợp chỉ nằm trong fixture kiểm thử, không dùng làm dữ liệu mạng của ứng dụng. Cần kiểm tra hiển thị 3D thực tế trong trình duyệt có WebGL và kết nối Internet.
