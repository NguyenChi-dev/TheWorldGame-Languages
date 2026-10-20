# Kế hoạch Trello Backend Language World

*Board API realtime database và hạ tầng*

Cập nhật ngày 19 tháng 10 năm 2026

## Mục đích tài liệu

Tài liệu này tổ chức công việc của API, realtime và Supabase. Backend cần cung cấp pipeline bản đồ và mô hình nội dung học trước khi mở rộng sang kinh tế hoặc nông trại.

## Kết luận hiện tại

Auth, hồ sơ, quản trị tài khoản, room realtime và database nội dung nền đã có. Backend chưa có map publishing, lesson, progress hay economy. Một số mutation nội dung admin đang đi trực tiếp qua Supabase và cần quyết định kiến trúc rõ ràng.

## Mô hình board Trello

Board dùng bốn danh sách theo trạng thái. Mỗi card có mã ổn định, mục tiêu, đầu ra, tiêu chí hoàn thành, người chủ trì và phụ thuộc. Khi đưa vào Trello, giữ mã card trong tiêu đề để liên kết giữa các board.

| **Danh sách** | **Số card** | **Cách sử dụng** |
| --- | --- | --- |
| Đã hoàn thành | 5 | Các card đã có code và luồng sử dụng tương ứng trong dự án hiện tại. |
| Đang thực hiện | 0 | Các card đã có phần lớn nền tảng nhưng còn thiếu tích hợp hoặc giao diện hoàn chỉnh. |
| Cần làm tiếp | 9 | Các card tạo vòng lặp sản phẩm tiếp theo và nên được ưu tiên trong các sprint gần. |
| Backlog | 7 | Các card mở rộng được thực hiện sau khi vòng lặp học tập cốt lõi hoạt động ổn định. |

### Quy ước ưu tiên

- P0 là công việc chặn vòng lặp sản phẩm hoặc chặn phát hành.

- P1 là công việc cần cho sprint gần hoặc giảm rủi ro vận hành lớn.

- P2 là cải tiến quan trọng nhưng có thể lên lịch sau phần cốt lõi.

- P3 là mở rộng dài hạn hoặc tối ưu trải nghiệm.

## Đã hoàn thành

Các card đã có code và luồng sử dụng tương ứng trong dự án hiện tại.

#### BACK 01 Nền tảng API Hono

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P0**    Chủ trì  **Backend

**Mục tiêu  **Cung cấp API Node có validate, CORS và lỗi thống nhất.

**Đầu ra  **Health, body limit, env validation, OpenAPI và Swagger.

**Hoàn thành khi  **Route công khai và route bảo vệ trả đúng status và schema.

#### BACK 02 Xác thực và hồ sơ người chơi

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P0**    Chủ trì  **Backend

**Mục tiêu  **Xác thực Bearer token và quản lý profile hiện tại.

**Đầu ra  **Signup, GET me và PATCH me cho tên, appearance và land.

**Hoàn thành khi  **User ID chỉ lấy từ token; land phải tồn tại và active.

#### BACK 03 API quản trị tài khoản

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P0**    Chủ trì  **Backend

**Mục tiêu  **Cung cấp thao tác auth user cho admin và moderator.

**Đầu ra  **List, detail, confirm email, reset password, ban, unban, rename và delete.

**Hoàn thành khi  **Role và AAL2 được kiểm tra; thao tác nhạy cảm có audit log.

#### BACK 04 Realtime theo vùng đất

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P0**    Chủ trì  **Realtime

**Mục tiêu  **Đồng bộ vị trí và chat trong room của land.

**Đầu ra  **Auth, filterBy landId, tối đa 60 client, movement clamp và phrase chat.

**Hoàn thành khi  **Người chơi chỉ vào room khớp profile land_id; state dọn khi rời room.

#### BACK 05 Database nội dung nền

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P0**    Chủ trì  **Database

**Mục tiêu  **Lưu tài khoản, phân quyền, land, area, skill và media.

**Đầu ra  **Tám migration cùng RLS, trigger và function sắp xếp.

**Hoàn thành khi  **Quyền player, admin, editor và moderator được pgTAP kiểm tra.

## Cần làm tiếp

Các card tạo vòng lặp sản phẩm tiếp theo và nên được ưu tiên trong các sprint gần.

#### BACK 06 Chuẩn hóa đường ghi dữ liệu admin

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P1**    Chủ trì  **Backend và Admin Web

**Mục tiêu  **Quyết định mutation nội dung đi qua API hay tiếp tục dùng Supabase RLS.

**Đầu ra  **Architecture decision record và một cách triển khai thống nhất.

**Hoàn thành khi  **Không còn quy tắc mâu thuẫn; test quyền bao phủ đường ghi được chọn.

#### BACK 07 Sửa lệnh Turbo ở repository root

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P1**    Chủ trì  **Developer Experience

**Mục tiêu  **Cho pnpm test và pnpm typecheck chạy ổn định qua Turbo.

**Đầu ra  **Cấu hình package manager và CI thống nhất.

**Hoàn thành khi  **Lệnh root chạy trên Windows và CI mà không báo cannot find binary path.

#### BACK 09 Realtime reconnect

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P1**    Chủ trì  **Realtime

**Mục tiêu  **Hỗ trợ rejoin và khôi phục state an toàn.

**Đầu ra  **Backoff, resume hoặc rejoin, cleanup session cũ.

**Hoàn thành khi  **Mất mạng ngắn không tạo duplicate và không để ghost player.

#### BACK 10 Schema bản đồ và version

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P0**    Chủ trì  **Backend và Database

**Mục tiêu  **Lưu MapLayout v1 theo land hoặc area.

**Đầu ra  **Map project, version, trạng thái draft review published và checksum.

**Hoàn thành khi  **Một target chỉ có một published version; rollback được kiểm tra bằng migration test.

#### BACK 11 API và storage bản đồ

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P0**    Chủ trì  **Backend và Infrastructure

**Mục tiêu  **Lưu JSON cùng GLB và cung cấp bản published cho Play.

**Đầu ra  **Upload asset, validate path, publish, fetch manifest và cache headers.

**Hoàn thành khi  **Không có path traversal; asset thiếu được phát hiện trước publish.

#### BACK 12 Schema kho từ vựng

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P0**    Chủ trì  **Learning Backend và Database

**Mục tiêu  **Lưu từ, nghĩa, ví dụ và media theo ngôn ngữ.

**Đầu ra  **Migration, RLS, index tìm kiếm và schema API dùng chung.

**Hoàn thành khi  **Trùng lặp được định nghĩa rõ; import có báo cáo lỗi từng dòng.

#### BACK 13 Schema bài học và activity

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P0**    Chủ trì  **Learning Backend và Database

**Mục tiêu  **Mô hình hóa nội dung học có version.

**Đầu ra  **Lesson, activity, prompt, option, đáp án, area mapping và publish state.

**Hoàn thành khi  **Nội dung published bất biến; draft sửa không ảnh hưởng attempt đang chạy.

#### BACK 14 API phân phối bài học

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P0**    Chủ trì  **Learning Backend

**Mục tiêu  **Trả bài học phù hợp cho player và area.

**Đầu ra  **Danh sách area, lesson manifest và start attempt.

**Hoàn thành khi  **Chỉ nội dung active và published được trả; không lộ đáp án.

#### BACK 15 Chấm điểm và lưu tiến độ

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P0**    Chủ trì  **Learning Backend

**Mục tiêu  **Chấm bài phía server và cập nhật mastery.

**Đầu ra  **Submit attempt, scoring, progress, idempotency và lịch sử.

**Hoàn thành khi  **Gửi lại request không cộng điểm hai lần; thời gian dùng giờ server.

## Backlog

Các card mở rộng được thực hiện sau khi vòng lặp học tập cốt lõi hoạt động ổn định.

#### BACK 08 Rate limit dùng chung

**Trạng thái  **Backlog**    Ưu tiên  **P2**    Chủ trì  **Backend và Infrastructure

**Mục tiêu  **Thay rate limiter trong memory trước khi chạy nhiều instance.

**Đầu ra  **Redis hoặc storage tương đương, key strategy và retry headers.

**Hoàn thành khi  **Giới hạn nhất quán giữa instance và có test concurrency.

#### BACK 16 Schema kinh tế và inventory

**Trạng thái  **Backlog**    Ưu tiên  **P2**    Chủ trì  **Game Backend và Database

**Mục tiêu  **Lưu currency, item, inventory và catalog.

**Đầu ra  **Migration, constraint số lượng và API đọc inventory.

**Hoàn thành khi  **Không có số âm; mọi record thuộc đúng user.

#### BACK 17 Giao dịch shop

**Trạng thái  **Backlog**    Ưu tiên  **P2**    Chủ trì  **Game Backend

**Mục tiêu  **Mua bán bằng transaction phía server.

**Đầu ra  **Purchase, sell, price snapshot, idempotency key và audit.

**Hoàn thành khi  **Không mất tiền hoặc nhân đôi item khi retry hay lỗi giữa chừng.

#### BACK 18 Backend nông trại

**Trạng thái  **Backlog**    Ưu tiên  **P3**    Chủ trì  **Game Backend

**Mục tiêu  **Lưu ô đất, cây trồng và thời điểm thu hoạch.

**Đầu ra  **Plant, status, harvest và reward transaction.

**Hoàn thành khi  **Thời gian dựa trên server; không thu hoạch hai lần.

#### BACK 19 Kiểm tra movement phía server

**Trạng thái  **Backlog**    Ưu tiên  **P3**    Chủ trì  **Realtime

**Mục tiêu  **Giảm gian lận khi vị trí bắt đầu ảnh hưởng gameplay.

**Đầu ra  **Speed limit, collision validation và correction message.

**Hoàn thành khi  **Teleport bất hợp lệ bị từ chối mà chuyển động hợp lệ vẫn mượt.

#### BACK 20 Quan sát và vận hành production

**Trạng thái  **Backlog**    Ưu tiên  **P2**    Chủ trì  **Infrastructure

**Mục tiêu  **Theo dõi lỗi và sức khỏe dịch vụ.

**Đầu ra  **Structured logs, metrics, traces, alert, backup và rollback runbook.

**Hoàn thành khi  **Có dashboard và cảnh báo cho API, realtime, database và storage.

#### BACK 21 Pipeline CI đầy đủ

**Trạng thái  **Backlog**    Ưu tiên  **P1**    Chủ trì  **Developer Experience

**Mục tiêu  **Tự động kiểm tra mọi thay đổi.

**Đầu ra  **Lint, typecheck, unit test, build và pgTAP trên pull request.

**Hoàn thành khi  **Merge bị chặn khi bước bắt buộc thất bại; artifact log dễ đọc.

## Definition of Done

- Có tiêu chí chấp nhận cụ thể và test tự động tương ứng.

- TypeScript typecheck, lint và test của workspace liên quan đều thành công.

- Quyền truy cập được kiểm tra ở giao diện, server và RLS khi có dữ liệu Supabase.

- Các trạng thái loading, empty, lỗi và retry được xử lý.

- Schema, API contract và tài liệu vận hành được cập nhật cùng thay đổi.

- Không đưa secret vào client hoặc biến NEXT_PUBLIC.

## Trình tự triển khai đề xuất

1. Chốt đường ghi dữ liệu và sửa tooling Turbo.

2. Xây schema cùng API bản đồ.

3. Xây schema từ vựng và bài học.

4. Xây attempt, scoring và progress idempotent.

5. Đưa CI và pgTAP vào pipeline.

6. Thiết kế economy sau khi learning loop chạy ổn định.

## Ghi chú quản lý

Mỗi sprint nên chốt phạm vi bằng tiêu chí hoàn thành của card. Card chỉ chuyển sang Đã hoàn thành sau khi code, test, quyền truy cập, tài liệu và luồng lỗi liên quan đều được kiểm tra. Không gộp nhiều thay đổi dữ liệu độc lập vào một card nếu chúng cần triển khai hoặc rollback riêng.
