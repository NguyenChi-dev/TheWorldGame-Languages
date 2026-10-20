# Kế hoạch Trello Admin Language World

*Board quản trị nội dung người chơi và World Studio*

Cập nhật ngày 19 tháng 10 năm 2026

## Mục đích tài liệu

Tài liệu này chuyển trạng thái hiện tại của ứng dụng quản trị thành card Trello có thể giao việc. Trọng tâm gần nhất là đưa World Studio từ bản nháp cục bộ thành quy trình tạo và xuất bản bản đồ, sau đó xây kho từ vựng và trình soạn bài học.

## Kết luận hiện tại

Quản trị tài khoản, land, area, skill và upload ảnh đã hoạt động. Media Library, Audit Log, Words và Economy chưa hoàn chỉnh. World Studio đã có nền tảng mạnh nhưng chưa lưu lên backend và chưa nối với Play.

## Mô hình board Trello

Board dùng bốn danh sách theo trạng thái. Mỗi card có mã ổn định, mục tiêu, đầu ra, tiêu chí hoàn thành, người chủ trì và phụ thuộc. Khi đưa vào Trello, giữ mã card trong tiêu đề để liên kết giữa các board.

| **Danh sách** | **Số card** | **Cách sử dụng** |
| --- | --- | --- |
| Đã hoàn thành | 6 | Các card đã có code và luồng sử dụng tương ứng trong dự án hiện tại. |
| Đang thực hiện | 1 | Các card đã có phần lớn nền tảng nhưng còn thiếu tích hợp hoặc giao diện hoàn chỉnh. |
| Cần làm tiếp | 7 | Các card tạo vòng lặp sản phẩm tiếp theo và nên được ưu tiên trong các sprint gần. |
| Backlog | 3 | Các card mở rộng được thực hiện sau khi vòng lặp học tập cốt lõi hoạt động ổn định. |

### Quy ước ưu tiên

- P0 là công việc chặn vòng lặp sản phẩm hoặc chặn phát hành.

- P1 là công việc cần cho sprint gần hoặc giảm rủi ro vận hành lớn.

- P2 là cải tiến quan trọng nhưng có thể lên lịch sau phần cốt lõi.

- P3 là mở rộng dài hạn hoặc tối ưu trải nghiệm.

## Đã hoàn thành

Các card đã có code và luồng sử dụng tương ứng trong dự án hiện tại.

#### ADMIN 01 Xác thực và phân quyền nhân viên

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P0**    Chủ trì  **Admin Web và Backend

**Mục tiêu  **Bảo vệ trang quản trị bằng Supabase, role và MFA.

**Đầu ra  **Đăng nhập, đăng ký, TOTP, menu theo role và kiểm tra route phía server.

**Hoàn thành khi  **Player không vào được admin; admin, editor và moderator chỉ thấy đúng phần được cấp quyền.

#### ADMIN 02 Dashboard vận hành

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P1**    Chủ trì  **Admin Web

**Mục tiêu  **Cho nhân viên thấy số liệu chính và hoạt động gần đây.

**Đầu ra  **Số vùng đất, khu vực, media, tài khoản, log và tài khoản mới.

**Hoàn thành khi  **Dashboard xử lý đúng quyền và vẫn hiển thị được khi một truy vấn thống kê lỗi.

#### ADMIN 03 Quản lý tài khoản người chơi

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P0**    Chủ trì  **Admin Web và API

**Mục tiêu  **Cho admin và moderator tìm kiếm, lọc và xử lý tài khoản.

**Đầu ra  **Danh sách, phân trang, đổi role, xác nhận email, reset password, khóa, mở khóa, đổi tên và xóa.

**Hoàn thành khi  **Mỗi thao tác kiểm tra quyền, chống thao tác lên chính mình khi cần và ghi audit log.

#### ADMIN 04 Quản lý vùng đất và khu vực

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P0**    Chủ trì  **Admin Web

**Mục tiêu  **Quản lý cấu trúc nội dung theo ngôn ngữ và địa điểm.

**Đầu ra  **CRUD, bật tắt, sắp xếp, ảnh bìa, scene và kỹ năng cho land và area.

**Hoàn thành khi  **RLS và giao diện cùng áp dụng đúng quyền admin và editor; xóa có bước xác nhận.

#### ADMIN 05 Quản lý kỹ năng luyện tập

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P1**    Chủ trì  **Admin Web

**Mục tiêu  **Cho phép kỹ năng dùng chung được quản lý bằng dữ liệu.

**Đầu ra  **CRUD, icon, màu và sắp xếp kỹ năng.

**Hoàn thành khi  **Không xóa được kỹ năng đang được khu vực sử dụng; thứ tự lưu đúng.

#### ADMIN 06 Upload ảnh Cloudinary

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P1**    Chủ trì  **Admin Web

**Mục tiêu  **Cho form nội dung tải ảnh và lưu metadata an toàn.

**Đầu ra  **Chữ ký upload, kiểm tra Cloudinary và đăng ký record media.

**Hoàn thành khi  **Upload thành công, metadata hợp lệ và audit log được ghi.

## Đang thực hiện

Các card đã có phần lớn nền tảng nhưng còn thiếu tích hợp hoặc giao diện hoàn chỉnh.

#### ADMIN 07 World Studio bản một

**Trạng thái  **Đang thực hiện**    Ưu tiên  **P0**    Chủ trì  **Admin Web và Game Engine

**Mục tiêu  **Tạo bố cục bản đồ 3D bằng primitive và GLB.

**Đầu ra  **Transform, gizmo, snap, camera, spawn, undo redo, import export JSON và lưu nháp cục bộ.

**Hoàn thành khi  **Bộ test editor xanh; thao tác không mất dữ liệu; tài liệu định dạng map v1 đầy đủ.

**Phụ thuộc  **Code hiện nằm trong working tree chưa commit.

## Cần làm tiếp

Các card tạo vòng lặp sản phẩm tiếp theo và nên được ưu tiên trong các sprint gần.

#### ADMIN 08 Kết nối World Studio với vùng đất

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P0**    Chủ trì  **Admin Web và Backend

**Mục tiêu  **Gắn một bản đồ có version với land hoặc area.

**Đầu ra  **Chọn land, tạo draft, lưu map và tải lại từ máy chủ.

**Hoàn thành khi  **Mỗi land hoặc area mở đúng draft của nó; không phụ thuộc localStorage.

**Phụ thuộc  **BACK 10 và BACK 11.

#### ADMIN 09 Quy trình xuất bản bản đồ

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P0**    Chủ trì  **Admin Web và Backend

**Mục tiêu  **Kiểm soát bản đồ được đưa vào game.

**Đầu ra  **Draft, review, published, lịch sử version và rollback.

**Hoàn thành khi  **Play chỉ đọc version published; rollback không phá dữ liệu cũ.

**Phụ thuộc  **ADMIN 08.

#### ADMIN 10 Thư viện media

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P1**    Chủ trì  **Admin Web

**Mục tiêu  **Hoàn thiện trang media đang là placeholder.

**Đầu ra  **Grid ảnh, tìm kiếm, phân trang, chi tiết, trạng thái sử dụng và xóa an toàn.

**Hoàn thành khi  **Không xóa asset đang được nội dung hoặc map sử dụng; có thông báo lỗi rõ ràng.

#### ADMIN 11 Trang nhật ký quản trị

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P1**    Chủ trì  **Admin Web

**Mục tiêu  **Cho admin tra cứu toàn bộ audit log.

**Đầu ra  **Lọc theo người thao tác, action, bảng, target và khoảng ngày.

**Hoàn thành khi  **Phân trang ổn định; chi tiết before và after đọc được; chỉ admin truy cập.

#### ADMIN 12 Kho từ vựng

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P0**    Chủ trì  **Content Admin và Backend

**Mục tiêu  **Thay trang placeholder bằng công cụ quản lý từ vựng.

**Đầu ra  **CRUD từ, nghĩa, ví dụ, phát âm, audio, ảnh, tag và ngôn ngữ.

**Hoàn thành khi  **Validation dùng chung; có tìm kiếm, lọc, import và phát hiện trùng.

**Phụ thuộc  **BACK 12.

#### ADMIN 13 Trình soạn bài học

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P0**    Chủ trì  **Content Admin và Backend

**Mục tiêu  **Tạo bài học gắn với khu vực và kỹ năng.

**Đầu ra  **Lesson, activity, câu hỏi, đáp án, thứ tự, điểm đạt và preview.

**Hoàn thành khi  **Một bài có thể publish và được Play tải đúng nội dung.

**Phụ thuộc  **ADMIN 12 và BACK 13.

#### ADMIN 14 Preview nội dung như người chơi

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P1**    Chủ trì  **Admin Web và Play Web

**Mục tiêu  **Giảm lỗi trước khi publish.

**Đầu ra  **Preview map, khu vực và bài học bằng cùng renderer với Play.

**Hoàn thành khi  **Preview phản ánh đúng version draft và không ghi tiến độ thật.

## Backlog

Các card mở rộng được thực hiện sau khi vòng lặp học tập cốt lõi hoạt động ổn định.

#### ADMIN 15 Báo cáo người chơi

**Trạng thái  **Backlog**    Ưu tiên  **P2**    Chủ trì  **Moderator và Backend

**Mục tiêu  **Bổ sung phần báo cáo còn thiếu trong mục người chơi.

**Đầu ra  **Danh sách report, bằng chứng, trạng thái và lịch sử xử lý.

**Hoàn thành khi  **Moderator xử lý theo quyền; mọi quyết định đều được log.

#### ADMIN 16 Quản lý vật phẩm và kinh tế

**Trạng thái  **Backlog**    Ưu tiên  **P2**    Chủ trì  **Game Design và Backend

**Mục tiêu  **Thay trang economy placeholder bằng cấu hình dữ liệu game.

**Đầu ra  **Item, currency, shop, giá, giới hạn mua và trạng thái phát hành.

**Hoàn thành khi  **Thay đổi được version hóa và Play không tin giá từ client.

**Phụ thuộc  **BACK 16 đến BACK 18.

#### ADMIN 17 Giao diện cài đặt MFA

**Trạng thái  **Backlog**    Ưu tiên  **P2**    Chủ trì  **Admin Web

**Mục tiêu  **Cho admin thay đổi công tắc MFA đang nằm trong database.

**Đầu ra  **Trang cài đặt, xác nhận thay đổi và audit log.

**Hoàn thành khi  **Chỉ admin thao tác; hiệu lực thống nhất ở admin, API và RLS.

## Definition of Done

- Có tiêu chí chấp nhận cụ thể và test tự động tương ứng.

- TypeScript typecheck, lint và test của workspace liên quan đều thành công.

- Quyền truy cập được kiểm tra ở giao diện, server và RLS khi có dữ liệu Supabase.

- Các trạng thái loading, empty, lỗi và retry được xử lý.

- Schema, API contract và tài liệu vận hành được cập nhật cùng thay đổi.

- Không đưa secret vào client hoặc biến NEXT_PUBLIC.

## Trình tự triển khai đề xuất

1. Ổn định và commit World Studio bản một.

2. Xây storage và version bản đồ với Backend.

3. Thêm quy trình draft review published.

4. Xây kho từ vựng.

5. Xây trình soạn và preview bài học.

6. Hoàn thiện Media Library và Audit Log.

## Ghi chú quản lý

Mỗi sprint nên chốt phạm vi bằng tiêu chí hoàn thành của card. Card chỉ chuyển sang Đã hoàn thành sau khi code, test, quyền truy cập, tài liệu và luồng lỗi liên quan đều được kiểm tra. Không gộp nhiều thay đổi dữ liệu độc lập vào một card nếu chúng cần triển khai hoặc rollback riêng.
