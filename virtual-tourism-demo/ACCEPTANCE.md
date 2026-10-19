# Kiểm tra bước 5.3–5.6

Ngày 19/10/2026. Đã triển khai phần dữ liệu, module hiển thị model và tour ảnh. **Chưa kết luận hoàn thành nghiệm thu trực quan UC07/UC08** vì công cụ của phiên này không có trình duyệt khả dụng. Chưa có ảnh chụp bằng chứng WebGL.

## Đã chạy và qua

Từ thư mục `E:\08_Project\GIS_LEARNING`:

```powershell
node virtual-tourism-demo/scripts/validate-data.mjs
node virtual-tourism-demo/tests/exploration.test.mjs
node virtual-tourism-demo/tests/main.test.cjs
node virtual-tourism-demo/tests/network.test.cjs
node virtual-tourism-demo/scripts/validate-data.mjs --http http://127.0.0.1:8765/
```

- 3 POI, 1 tour ảnh, 3 scene, 6 hotspot (4 điều hướng + 2 thông tin). ID/nguồn/tham chiếu hợp lệ; entry đúng tour; mọi scene đều tới được.
- File ảnh được giải mã bằng Pillow; file GLB có header/độ dài hợp lệ và texture nhúng. GLB web và cả ba ảnh trả HTTP 200 qua máy chủ static local, kể cả đường dẫn chứa khoảng trắng và dấu gạch ngang Unicode.
- Kiểm thử schema từ chối trùng ID, sai entry/target, scene bỏ rơi/khác tour, vị trí hotspot sai, scale/cao độ/tọa độ sai và thiếu nguồn.
- Kiểm thử module model với mock SDK: cộng cao độ đất đúng một lần, absolute-height không lấy ground, heading/scale, cache tải lặp, lượt tải cũ không thêm model sau khi đổi lựa chọn; lỗi model cho phép thử lại.
- Kiểm thử module tour ảnh với mock DOM/Image: mở entry, qua ba scene, mở info, quay lại, thoát/khôi phục camera, hotspot bám vùng ảnh contain khi resize/zoom, tải ảnh lỗi giữ cảnh cũ và thử lại, không cập nhật sau khi đóng.
- Bộ hồi quy cũ qua: tìm kiếm tiếng Việt/không dấu, chọn POI đồng bộ, camera/tour camera, hủy thao tác cũ, Dijkstra và mạng OSM thực.

Đây là bằng chứng kiểm tra dữ liệu và logic. Mock SDK/DOM không kiểm chứng texture, WebGL, vị trí neo thực tế, thao tác bàn phím và bố cục trực quan trên từng thiết bị.

## Nghiệm thu trực quan trên máy có WebGL

Chạy máy chủ (hoặc dùng Live Server):

```powershell
python -m http.server 8765 --bind 127.0.0.1 --directory virtual-tourism-demo
```

Mở `http://127.0.0.1:8765/`, cần Internet để lấy ArcGIS CDN/bản đồ/địa hình.

| Mốc | Thao tác | Cần xác nhận trực tiếp |
| --- | --- | --- |
| UC04 | Tìm `dinh doc lap`, nhấn Enter; tìm tên không tồn tại | Đúng kết quả và thông báo rỗng |
| UC05/06 | Chọn POI trên bản đồ/danh sách, xoay và zoom | Marker, chi tiết, camera đồng bộ |
| UC07 | Chọn Dinh Độc Lập → Xem mô hình 3D; xoay nhìn mặt tiền và bên hông | Mô hình công trình có texture, đúng vị trí/hướng/kích thước tương đối, chân không nổi/chìm, không bị lớp công trình nền che |
| UC07 thiếu model | Chọn Nhà thờ Đức Bà hoặc Chợ Bến Thành | Báo chưa có mô hình; app tiếp tục dùng được |
| UC08 | Tham quan ảnh → mũi tên qua ba scene → info kiến trúc → quay lại → thoát | Hotspot đúng ảnh, không lệch khi resize/zoom; thoát về POI/camera trước khi mở |
| Lỗi ảnh | DevTools chặn một request ảnh rồi chuyển cảnh | Giữ ảnh cũ; có thử lại/quay lại/thoát; bỏ chặn rồi thử lại thành công |
| Lỗi model | DevTools chặn `dinh-doc-lap.glb`, reload rồi chọn Dinh | Báo lỗi; POI và tour ảnh còn hoạt động; bỏ chặn và nhấn xem model để thử lại |
| Dữ liệu lỗi | Trên bản sao thử nghiệm, đổi targetSceneId thành ID không tồn tại | Tour ảnh bị vô hiệu hóa kèm lỗi dữ liệu; danh sách/bản đồ không trắng |
| Hồi quy | Chạy tour camera, tìm đường mạng | Hai chức năng cũ tiếp tục hoạt động độc lập |

Chụp bằng chứng mặt tiền + bên hông model và ba scene/info sau khi hoàn tất. Nếu cần chỉnh model, đổi longitude/latitude, headingDegrees, scale hoặc elevationMeters trong `data/places.json`, rồi kiểm tra lại. Không dùng tọa độ máy ảnh thay vị trí neo công trình.
