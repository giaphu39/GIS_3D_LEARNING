# Mạng đường cho bước 5.3: nguồn và cách dựng

Codex lấy dữ liệu đường thực từ **OpenStreetMap**, không tự vẽ một mạng đường giả. `data/road-network.json` là bản chuyển đổi phục vụ bài học về Dijkstra; tour chuyển góc nhìn trong `tours.json` vẫn hoạt động riêng.

## Nguồn và bản chụp

- Nguồn: **© OpenStreetMap contributors**, [trang nguồn và giấy phép](https://www.openstreetmap.org/copyright), dữ liệu theo [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
- Công cụ lấy: [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API), endpoint `https://overpass-api.de/api/interpreter`.
- Thời điểm tải: `2026-10-16T17:09:25.284274+00:00` (UTC), tương ứng khoảng 00:09 ngày 17/10/2026 tại Việt Nam.
- Mốc dữ liệu OSM do máy chủ trả về: `2026-10-16T17:07:48Z`. Đây là bản chụp tĩnh, ứng dụng không gọi Overpass khi chạy.
- Phạm vi nam/tây/bắc/đông: `10.768, 106.690, 10.784, 106.706`, bao quanh Dinh Độc Lập, Nhà thờ Đức Bà và Chợ Bến Thành.
- Kết quả: **1.601 nút**, **1.780 cạnh**, gồm **1.286 cạnh một chiều** và **494 cạnh hai chiều**. Một cạnh hai chiều được đưa vào danh sách kề ở cả hai hướng.
- Dữ liệu tải nguyên bản: [data/sources/osm-roads.json](data/sources/osm-roads.json). Nhật ký truy vấn và thời điểm: [data/sources/osm-download.json](data/sources/osm-download.json).
- SHA-256 của bản tải gốc: `87e2e20471bfdc44944b59081f146aa9c6938164836daec88a0f1054d5a8f4b6`.

Truy vấn thực tế:

```overpass
[out:json][timeout:60];
way["highway"~"^(primary|secondary|tertiary|residential|unclassified|living_street|primary_link|secondary_link|tertiary_link)$"](10.768,106.690,10.784,106.706);
(._;>;);
out body;
```

## Chuyển thành đồ thị

Script [scripts/build_network.py](scripts/build_network.py) đọc OSM JSON và chuyển đổi như sau:

1. Giữ các loại đường trong truy vấn; bỏ way có `access`, `vehicle` hoặc `motor_vehicle` bằng `no`/`private`. Không lấy đường đi bộ, bậc thang hay đường dịch vụ trong bản mạng này.
2. Mỗi OSM node tham gia một đoạn hợp lệ trở thành nút mạng, với mã `osm-<nodeId>`. Tọa độ lấy nguyên từ OSM, không lấy tọa độ địa điểm để tạo nút đường mới.
3. Mỗi cặp node liền nhau trong way trở thành một cạnh. Giữ đoạn chỉ khi **cả hai đầu nằm trong phạm vi**; không tạo giao điểm cắt biên hoặc nối các đường chỉ vì nhìn thấy chúng giao nhau. Kết nối chỉ xảy ra tại node OSM dùng chung, tránh tự nối cầu và đường bên dưới.
4. Xử lý hướng theo [thẻ `oneway` của OSM](https://wiki.openstreetmap.org/wiki/Key:oneway): `yes`/`1`/`true` đi theo thứ tự node; `-1` đảo thứ tự node; `no`/`0`/`false` cho hai hướng. `junction=roundabout` mặc định một chiều nếu không có `oneway` tường minh. Nếu thiếu cả hai thì coi là hai chiều. Way có giá trị một chiều khác như `reversible` bị bỏ khỏi bản chuyển đổi.
5. Chiều dài `lengthMeters` được **tính từ tọa độ hình học OSM**, không phải một trường chiều dài có sẵn hay số đo khảo sát. Dùng công thức Haversine với bán kính Trái Đất trung bình 6.371.008,8 m, làm tròn tới 0,001 m. Dijkstra dùng tổng các trọng số này; số lẻ không hàm ý dữ liệu chính xác tới milimét.
6. `path` của cạnh lưu hai điểm OSM liên tiếp. Toàn bộ tuyến là chuỗi những đoạn nhỏ theo hình dạng đường trong OSM, không phải đường thẳng nối ba địa điểm của tour. `osmWayId`, `osmNodeId` và tên đường được giữ để tra nguồn.

Không gộp nút hình dạng thành giao lộ: các nút dọc đường vẫn được giữ, giúp bảo toàn hình học. Khi chạy ngược cạnh hai chiều, hình học được đảo đúng hướng. Dijkstra trong `src/network.js` chọn nút có khoảng cách nhỏ nhất bằng quét tuyến tính, độ phức tạp O(V² + E).

## Liên hệ với địa điểm du lịch

Để dễ thử, script tìm nút mạng gần nhất theo khoảng cách Haversine và đặt tên “Gần …”. Đây chỉ là gợi ý chọn nút đầu/cuối; **không tạo cạnh nối từ địa điểm đến đường** và không xác nhận nút đó là cổng vào.

| Địa điểm | Nút mạng gần nhất | Khoảng cách tới tọa độ địa điểm |
| --- | --- | --- |
| Dinh Độc Lập | `osm-11845290083` | khoảng 122,223 m |
| Nhà thờ Đức Bà | `osm-411918767` | khoảng 28,381 m |
| Chợ Bến Thành | `osm-2899065691` | khoảng 60,911 m |

Mặc định chọn nút gần Dinh Độc Lập → nút gần Chợ Bến Thành. Với bản chụp này, Dijkstra cho khoảng **856,538 m**, qua **21 cạnh**. Kết quả ngược chiều khoảng **1.554,251 m**, qua **41 cạnh** do các ràng buộc một chiều. Đã kiểm tra tìm được đường cho cả sáu cặp có hướng giữa ba nút gợi ý.

## Phân biệt kết quả và giới hạn

- **Xanh liền:** tuyến ngắn nhất theo chiều dài trên mạng đã nạp, hiển thị bằng GraphicsLayer riêng. Tìm đường không bắt đầu/kết thúc tour, đổi địa điểm đang chọn hoặc chuyển camera.
- **Cam nét đứt:** đường nối minh họa của tour, không được xem là kết quả Dijkstra.
- Nếu mạng do nhóm thay vào thiếu `path`, giao diện sẽ ghi rõ việc chỉ vẽ đoạn thẳng giữa các nút cạnh. Bản OSM kèm theo đã có `path` cho mọi cạnh.
- Bản mạng này phục vụ minh họa phân tích mạng theo hướng đường cho phương tiện nói chung, **không phải bộ chỉ đường đi bộ hoặc điều hướng giao thông đầy đủ**. Chưa mô hình hóa quan hệ cấm rẽ, hạn chế theo giờ, hạn chế theo loại xe, `oneway:conditional`, `oneway:motor_vehicle`, tốc độ, đèn tín hiệu hay thời gian di chuyển. Các thẻ truy cập ngoài `no`/`private` cũng chưa được diễn giải đầy đủ.
- Phạm vi cắt có thể loại bỏ đường vòng ra ngoài; “ngắn nhất” chỉ đúng trên đồ thị và trọng số đang có, không khẳng định là tuyến ngắn nhất toàn thành phố hoặc hợp lệ với mọi loại phương tiện. Có thể có thành phần không liên thông; chương trình báo không có đường thay vì nối thêm cạnh.
- Bản mạng có thể được cập nhật hoặc sửa trong OSM sau thời điểm chụp. Không dùng dữ liệu của Google Maps hoặc nguồn không rõ giấy phép để bù phần thiếu.

## Dựng lại và kiểm tra

Từ thư mục cha của demo, dựng lại hoàn toàn ngoại tuyến từ bản gốc đã lưu:

```powershell
python virtual-tourism-demo/scripts/build_network.py
node virtual-tourism-demo/tests/network.test.cjs
node virtual-tourism-demo/tests/main.test.cjs
```

Để tải lại từ Overpass rồi dựng lại:

```powershell
python virtual-tourism-demo/scripts/build_network.py --download
```

Lệnh tải lại sẽ cập nhật bản chụp, nhật ký và mạng đầu ra; số lượng nút/cạnh và kết quả có thể đổi. Các con số trong tài liệu này mô tả bản chụp đã ghi ở trên, cần cập nhật khi đổi dữ liệu. Giữ ghi công và thông tin giấy phép khi chia sẻ dữ liệu dẫn xuất.
