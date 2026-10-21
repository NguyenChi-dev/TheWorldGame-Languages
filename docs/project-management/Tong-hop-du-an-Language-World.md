# Tổng hợp dự án Language World

*Kiến trúc trạng thái roadmap và kế hoạch phối hợp*

Cập nhật ngày 19 tháng 10 năm 2026

## Tóm tắt điều hành

Language World đã có nền tảng tài khoản, quản trị nội dung cơ bản, thế giới 3D tiếng Anh và multiplayer vị trí. Sản phẩm chưa có vòng lặp học tập hoàn chỉnh. Ưu tiên chung là đưa bản đồ từ World Studio vào Play, mở một khu vực, phân phối một bài học, chấm điểm và lưu tiến độ. Economy và nông trại nên được xếp sau mốc này.

## Phạm vi hệ thống

| **Phần** | **Công nghệ** | **Trách nhiệm chính** |
| --- | --- | --- |
| Admin | Next.js 16 và Supabase | Tài khoản, quyền, nội dung, media, audit và World Studio |
| Play | Next.js 16 và Babylon.js | Onboarding, nhân vật, land, thế giới 3D và trải nghiệm học |
| Backend | Hono, Colyseus và Supabase | API tin cậy, realtime, dữ liệu, RLS và giao dịch game |
| Shared | TypeScript và Zod | Contract, role, map schema, character và realtime messages |

## Trạng thái kiểm tra

- 256 unit test hiện có đã thành công khi chạy trực tiếp theo workspace.

- Typecheck của shared, ui, game, API, realtime, admin và web đã thành công.

- Có 11 file pgTAP cho RLS và database; lần rà soát này chưa chạy vì cần Supabase và Docker.

- Lệnh root qua Turbo báo không tìm thấy package manager binary trong môi trường hiện tại; chạy từng workspace vẫn thành công.

## Luồng sản phẩm hiện tại

1. Người chơi đăng ký hoặc đăng nhập.

2. Người chơi tạo tên và ngoại hình.

3. Người chơi chọn vùng đất ngôn ngữ.

4. Play tải english town hoặc bãi cỏ mặc định.

5. Realtime đưa người chơi vào room theo landId.

6. Người chơi di chuyển đến địa điểm nhưng chưa thể vào bài học.

## Kiến trúc trách nhiệm

Game engine không import React. Play gọi startGame và nhận callback. API là nơi kiểm tra dữ liệu người chơi và các giao dịch có giá trị. Realtime chỉ đồng bộ vị trí cùng chat câu mẫu. Secret Supabase chỉ được giữ phía server. Shared chứa kiểu dữ liệu và schema dùng chung.

## Năng lực đã hoàn thành

### Admin

- Auth và MFA (chi tiết: [docs/xac-thuc-phan-quyen.md](../xac-thuc-phan-quyen.md))

- Role based access

- Dashboard

- Quản lý người chơi

- CRUD land area skill

- Upload Cloudinary và audit log

### Play

- Auth người chơi

- Tạo nhân vật 3D

- Chọn vùng đất

- English town

- Điều khiển và pathfinding

- Hiện diện multiplayer và health HUD

### Backend

- Hono API và OpenAPI

- Supabase token validation

- Player profile API

- Admin player API

- Colyseus room theo land

- RLS và migrations nội dung nền

## Khoảng trống sản phẩm

| **Khoảng trống** | **Ảnh hưởng** | **Board chịu trách nhiệm** |
| --- | --- | --- |
| Map editor chưa publish | Play chưa dùng được map do admin tạo | Admin và Backend |
| Địa điểm chưa mở | Chưa có vòng lặp gameplay học tập | Play và Backend |
| Chưa có lesson và progress | Không thể chấm điểm hoặc theo dõi học | Admin Play Backend |
| Media và Logs còn placeholder | Vận hành nội dung chưa hoàn chỉnh | Admin |
| Chat chưa có UI | Protocol có nhưng người chơi chưa sử dụng | Play |
| Economy chưa có schema | Chưa thể làm shop inventory hoặc farm | Backend và Play |

## Roadmap đề xuất

| **Giai đoạn** | **Kết quả bàn giao** |
| --- | --- |
| Giai đoạn 1 Nền tảng bản đồ | Commit World Studio, lưu map và GLB, version, publish, Play loader và fallback. |
| Giai đoạn 2 Nội dung học | Vocabulary schema, lesson authoring, activity contract và preview. |
| Giai đoạn 3 Learning loop | Vào area, start attempt, submit, scoring, progress và mastery. |
| Giai đoạn 4 Vận hành | Media Library, Audit Log, CI, pgTAP, monitoring và reconnect. |
| Giai đoạn 5 Mở rộng game | Chat UI, NPC, achievement, economy, inventory, shop và farm. |

## Phụ thuộc giữa ba board

- Admin tạo draft map; Backend lưu và publish; Play chỉ tải version published.

- Admin soạn vocabulary và lesson; Backend phân phối và chấm; Play hiển thị activity và kết quả.

- Play gửi intent của người chơi; Backend quyết định điểm, phần thưởng và tiến độ.

- Realtime tiếp tục giới hạn ở presence và chat cho đến khi movement ảnh hưởng phần thưởng.

## Rủi ro cần quản lý

- World Studio hiện lưu cục bộ nên dữ liệu có thể mất khi trình duyệt xóa cache.

- Map hardcoded và map JSON có thể lệch collision, spawn hoặc cách định danh địa điểm.

- Mutation nội dung admin đang đi trực tiếp qua Supabase trong khi quy tắc dự án ưu tiên API.

- Realtime tin tọa độ client sau khi clamp; cần validation mạnh hơn trước khi vị trí ảnh hưởng phần thưởng.

- Rate limiter trong memory không phù hợp với nhiều instance.

## Mốc phát hành đầu tiên

Mốc đầu tiên nên được coi là hoàn thành khi admin có thể tạo và publish một map cùng một lesson, người chơi vào area từ thị trấn, hoàn thành lesson, nhận kết quả do server chấm và thấy tiến độ sau khi đăng nhập lại. Mốc này chưa yêu cầu economy hoặc farm.

## Quy tắc thực hiện

- Có tiêu chí chấp nhận cụ thể và test tự động tương ứng.

- TypeScript typecheck, lint và test của workspace liên quan đều thành công.

- Quyền truy cập được kiểm tra ở giao diện, server và RLS khi có dữ liệu Supabase.

- Các trạng thái loading, empty, lỗi và retry được xử lý.

- Schema, API contract và tài liệu vận hành được cập nhật cùng thay đổi.

- Không đưa secret vào client hoặc biến NEXT_PUBLIC.
