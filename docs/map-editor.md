# World Studio — editor bản đồ 3D

Chạy `corepack pnpm --filter @lw/admin dev`, mở http://localhost:3001/map-editor.
Trong chế độ development, riêng đường dẫn này dùng được không cần đăng nhập/Supabase.
Khi chạy production, trang vẫn yêu cầu quyền admin/editor và MFA theo cấu hình quản trị.
Cũng có liên kết **Vùng đất → Thiết kế bản đồ 3D** trong menu admin.

## Thiết kế

- Thêm khối hộp, trụ, cầu để phác bố cục; hoặc chọn/kéo thả file `.glb` (GLB 2.0, tối đa 50 MB/file).
- Chọn vật thể bằng chuột trái hoặc danh sách bên trái. Chọn trục của gizmo để kéo.
- **W**: di chuyển, **E**: xoay, **R**: đổi tỷ lệ; có thể nhập giá trị chính xác bên phải.
- **Y** là độ cao: cho phép xếp mô hình lên nhau. Editor không chặn va chạm.
- **Đặt xuống bề mặt**: thả từ đáy vật thể hiện tại xuống mặt gần nhất bên dưới tâm X/Z. Muốn đặt lên bàn, nâng vật thể cao hơn bàn trước khi dùng nút này. Đây không phải mô phỏng vật lý.
- Chuột phải kéo: xoay camera; Ctrl + chuột phải kéo: dịch camera; cuộn: zoom; **F**: nhìn gần vật thể.
- **Nhấp đúp** vật thể: chọn và nhìn gần. **Home / Vừa cảnh**: đưa tất cả vật thể đang hiện vào khung nhìn, không tính vật thể ẩn. **Toàn bản đồ**: xem mặt đất; **Từ trên xuống**: nhìn thẳng theo trục X/Z.
- Hai nút đầu thanh công cụ thu gọn/mở lại thư viện và thuộc tính để dành thêm chỗ cho khung 3D. Các tùy chọn mặt đất nằm trong **Cài đặt bản đồ** ở cuối bảng thuộc tính.
- **Ctrl+D**: nhân bản; Delete: xóa; **Ctrl+Z**: hoàn tác; **Ctrl+Shift+Z / Ctrl+Y**: làm lại.
- Lưới tự giãn theo zoom theo các bước 1/2/5 m và bội số; góc khung nhìn hiển thị kích thước ô hiện tại. Nét chính cách nhau 5 ô, nét nhỏ mờ dần ở xa để hạn chế răng cưa. **Bám lưới vẫn cố định**: di chuyển 0,5 m; xoay 15°; tỷ lệ 0,1, không phụ thuộc lưới hiển thị.
- Có thể ẩn/khóa từng vật thể và đặt điểm xuất hiện. Bản đồ tối đa 500 vật thể.

## Lưu và xuất

**Xuất JSON / Ctrl+S** tải một file `.json` xuống máy. **Nhập JSON** mở lại bố cục; thao tác thay bố cục vẫn hoàn tác được.
Bản nháp JSON tự lưu vào localStorage, GLB gốc được cache bằng IndexedDB trên trình duyệt đó.
Không ghi lên Supabase, không upload file, không tự ghi vào source của dự án.
Thay đổi ánh sáng, lưới, camera và thu gọn bảng chỉ ảnh hưởng giao diện editor, không thay tọa độ, kích thước hay màu đã lưu trong JSON. Khung 3D tạm ngừng vẽ khi tab trình duyệt bị ẩn.
Trình duyệt có thể xóa cache; luôn giữ file JSON và GLB gốc. Mỗi tài khoản production có bộ nhớ riêng; development dùng bản nháp `local`.

Trên máy khác, nhập JSON rồi chọn lại GLB có cùng tên. Khung dây hồng giữ vị trí các mô hình còn thiếu;
việc chọn lại file nối lại các vật thể cũ thay vì tạo trùng. Có thể thay một file cùng tên để cập nhật mọi bản sao.
Nếu JSON dùng thư mục con (ví dụ `/models/town/tree.glb`), chọn `tree.glb` sẽ nối lại đường dẫn đó khi tên file không bị trùng giữa các thư mục.
GLB nên đóng gói sẵn texture và mesh; các extension nén cần decoder tương ứng của Babylon.

## Định dạng v1

Schema và hàm đọc/ghi: `@lw/shared/map-layout`. Editor 3D độc lập React: `@lw/game/editor`.

```json
{
  "format": "language-world-map",
  "version": 1,
  "name": "Thị trấn của tôi",
  "ground": { "width": 48, "depth": 48, "color": "#7f9c83" },
  "spawn": { "x": 0, "y": 0, "z": 0 },
  "objects": [
    {
      "id": "school-1",
      "name": "Trường học",
      "kind": "glb",
      "source": "/models/school.glb",
      "position": { "x": 10, "y": 0, "z": -5 },
      "rotation": { "x": 0, "y": 90, "z": 0 },
      "scale": { "x": 1, "y": 1, "z": 1 },
      "visible": true,
      "locked": false
    }
  ]
}
```

Hệ tọa độ Babylon mặc định (left-handed), Y hướng lên, vị trí tính bằng mét; góc Euler tính bằng **độ**, tỷ lệ không có đơn vị.
Mỗi mô hình GLB được giữ nguyên kích thước tác giả, gốc được đưa về **tâm đáy bounding box** trước khi áp dụng position/rotation/scale.
Các khối cơ bản có kích thước 1 m trước khi áp dụng scale và cũng có gốc ở tâm đáy.
Thứ tự biến đổi: scale → rotation → translation. Trường `locked` là trạng thái editor; `visible` quyết định hiển thị.

`source` là đường dẫn tương đối từ public của web, ví dụ `apps/web/public/models/school.glb` → `/models/school.glb`.
Tên GLB được URL-encode; JSON không chứa blob URL, đường dẫn Windows hay dữ liệu nhị phân.
Editor mở GLB qua file picker/cache local, không tự quét thư mục dự án. Bản v1 chưa nối file JSON vào `/play`:
game vẫn dùng bản đồ procedural trong `english-town.ts`. Việc tích hợp bố cục với gameplay, khu vực và lưới va chạm là bước riêng.
