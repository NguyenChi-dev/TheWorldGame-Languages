# Kế hoạch Trello Play Language World

*Board trải nghiệm người chơi và game 3D*

Cập nhật ngày 19 tháng 10 năm 2026

## Mục đích tài liệu

Tài liệu này tổ chức công việc của web game và engine 3D. Mục tiêu sản phẩm tiếp theo là mở được một khu vực, hoàn thành một bài học và lưu tiến độ bằng dữ liệu do server kiểm soát.

## Kết luận hiện tại

Onboarding, tạo nhân vật, chọn land, thị trấn tiếng Anh, điều khiển và multiplayer vị trí đã có. Các địa điểm chưa mở được nội dung học. Chat đã có protocol nhưng chưa có giao diện. Map từ World Studio chưa được tải vào game.

## Mô hình board Trello

Board dùng bốn danh sách theo trạng thái. Mỗi card có mã ổn định, mục tiêu, đầu ra, tiêu chí hoàn thành, người chủ trì và phụ thuộc. Khi đưa vào Trello, giữ mã card trong tiêu đề để liên kết giữa các board.

| **Danh sách** | **Số card** | **Cách sử dụng** |
| --- | --- | --- |
| Đã hoàn thành | 6 | Các card đã có code và luồng sử dụng tương ứng trong dự án hiện tại. |
| Đang thực hiện | 2 | Các card đã có phần lớn nền tảng nhưng còn thiếu tích hợp hoặc giao diện hoàn chỉnh. |
| Cần làm tiếp | 4 | Các card tạo vòng lặp sản phẩm tiếp theo và nên được ưu tiên trong các sprint gần. |
| Backlog | 7 | Các card mở rộng được thực hiện sau khi vòng lặp học tập cốt lõi hoạt động ổn định. |

### Quy ước ưu tiên

- P0 là công việc chặn vòng lặp sản phẩm hoặc chặn phát hành.

- P1 là công việc cần cho sprint gần hoặc giảm rủi ro vận hành lớn.

- P2 là cải tiến quan trọng nhưng có thể lên lịch sau phần cốt lõi.

- P3 là mở rộng dài hạn hoặc tối ưu trải nghiệm.

## Đã hoàn thành

Các card đã có code và luồng sử dụng tương ứng trong dự án hiện tại.

#### PLAY 01 Luồng tài khoản người chơi

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P0**    Chủ trì  **Play Web và API

**Mục tiêu  **Cung cấp đăng ký, đăng nhập, xác nhận email và phục hồi mật khẩu.

**Đầu ra  **Auth đầy đủ cùng route guard và đăng xuất mọi thiết bị.

**Hoàn thành khi  **Các luồng thành công và lỗi đã được test; redirect an toàn.

#### PLAY 02 Tạo nhân vật

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P0**    Chủ trì  **Play Web và Game Engine

**Mục tiêu  **Cho người chơi chọn ngoại hình và tên.

**Đầu ra  **Preview 3D, giới tính, mũ, áo, quần váy và phối ngẫu nhiên.

**Hoàn thành khi  **Ngoại hình hợp lệ được lưu qua API và tải lại đúng.

#### PLAY 03 Chọn vùng đất

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P0**    Chủ trì  **Play Web và API

**Mục tiêu  **Cho người chơi chọn ngôn ngữ và đổi vùng đất.

**Đầu ra  **Danh sách land đang mở, ảnh bìa, số area và lưu land hiện tại.

**Hoàn thành khi  **Land tắt hoặc đã xóa không thể được chọn.

#### PLAY 04 Thị trấn tiếng Anh

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P0**    Chủ trì  **Game Engine

**Mục tiêu  **Cung cấp không gian 3D đầu tiên để di chuyển.

**Đầu ra  **Bản đồ procedural với chín địa điểm, cảnh quan, biển tên và hiệu ứng môi trường.

**Hoàn thành khi  **Map tải ổn định, có spawn và vùng đi lại hợp lệ.

#### PLAY 05 Điều khiển và tìm đường

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P0**    Chủ trì  **Game Engine và Play Web

**Mục tiêu  **Hỗ trợ desktop và mobile.

**Đầu ra  **WASD, phím mũi tên, joystick, click to move và đi đến địa điểm.

**Hoàn thành khi  **Nhân vật tránh vật cản, dừng đúng điểm đến và UI phản ánh trạng thái.

#### PLAY 06 Hiện diện nhiều người chơi

**Trạng thái  **Đã hoàn thành**    Ưu tiên  **P1**    Chủ trì  **Play Web và Realtime

**Mục tiêu  **Hiển thị người chơi cùng vùng đất.

**Đầu ra  **Remote player, tên, ngoại hình, số online và fallback offline.

**Hoàn thành khi  **Không hiển thị chính mình; rời room thì nhân vật biến mất.

## Đang thực hiện

Các card đã có phần lớn nền tảng nhưng còn thiếu tích hợp hoặc giao diện hoàn chỉnh.

#### PLAY 09 Bản đồ được xuất bản từ World Studio

**Trạng thái  **Đang thực hiện**    Ưu tiên  **P0**    Chủ trì  **Play Web và Game Engine

**Mục tiêu  **Thay map hardcoded bằng map JSON published.

**Đầu ra  **Loader map, GLB asset resolver, collision và spawn từ layout.

**Hoàn thành khi  **Play tải đúng version published và có fallback khi asset lỗi.

**Phụ thuộc  **ADMIN 09 và BACK 10 đến BACK 11.

#### PLAY 10 Giao diện chat câu mẫu

**Trạng thái  **Đang thực hiện**    Ưu tiên  **P1**    Chủ trì  **Play Web và Realtime

**Mục tiêu  **Đưa protocol chat đã có lên giao diện.

**Đầu ra  **Menu phrase, bubble, lịch sử ngắn và chống spam.

**Hoàn thành khi  **Chỉ phrase hợp lệ được gửi; bubble gắn đúng người chơi; mobile dùng được.

## Cần làm tiếp

Các card tạo vòng lặp sản phẩm tiếp theo và nên được ưu tiên trong các sprint gần.

#### PLAY 07 Mở cửa khu vực

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P0**    Chủ trì  **Play Web và Backend

**Mục tiêu  **Thay nút Vào trong đang bị khóa bằng luồng khu vực thật.

**Đầu ra  **Chọn area theo địa điểm, tải scene và xử lý trạng thái chưa mở.

**Hoàn thành khi  **Người chơi vào đúng area đang active và quay lại thị trấn không mất phiên.

**Phụ thuộc  **BACK 14 và dữ liệu area.

#### PLAY 08 Bài học đầu tiên

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P0**    Chủ trì  **Play Web và Learning Backend

**Mục tiêu  **Tạo vòng lặp học tập tối thiểu.

**Đầu ra  **Bắt đầu bài, hiển thị activity, nộp câu trả lời, nhận điểm và lưu tiến độ.

**Hoàn thành khi  **Không lộ đáp án đúng trước khi nộp; tải lại vẫn thấy tiến độ.

**Phụ thuộc  **ADMIN 13 và BACK 13 đến BACK 15.

#### PLAY 11 Khôi phục kết nối realtime

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P1**    Chủ trì  **Play Web và Realtime

**Mục tiêu  **Tự kết nối lại sau mất mạng ngắn.

**Đầu ra  **Backoff, trạng thái reconnect và rejoin đúng land.

**Hoàn thành khi  **Không tạo nhân vật trùng; UI phân biệt reconnect và offline.

#### PLAY 12 Lưu vị trí và checkpoint

**Trạng thái  **Cần làm tiếp**    Ưu tiên  **P1**    Chủ trì  **Play Web và API

**Mục tiêu  **Khôi phục vị trí hợp lý khi quay lại game.

**Đầu ra  **Checkpoint theo map version và vị trí fallback an toàn.

**Hoàn thành khi  **Không spawn trong vật cản; map đổi version vẫn đưa người chơi về điểm hợp lệ.

## Backlog

Các card mở rộng được thực hiện sau khi vòng lặp học tập cốt lõi hoạt động ổn định.

#### PLAY 13 Kho từ vựng cá nhân

**Trạng thái  **Backlog**    Ưu tiên  **P2**    Chủ trì  **Play Web và Learning Backend

**Mục tiêu  **Cho người chơi ôn các từ đã gặp.

**Đầu ra  **Danh sách từ, trạng thái ghi nhớ, lịch ôn và bộ lọc.

**Hoàn thành khi  **Tiến độ đồng bộ theo tài khoản và không phụ thuộc một thiết bị.

#### PLAY 14 Nghe và phát âm

**Trạng thái  **Backlog**    Ưu tiên  **P2**    Chủ trì  **Learning Experience

**Mục tiêu  **Bổ sung activity nghe và nói.

**Đầu ra  **Audio playback, ghi âm, phản hồi và fallback khi thiếu quyền microphone.

**Hoàn thành khi  **Activity dùng được trên desktop và mobile; dữ liệu riêng tư được xử lý rõ ràng.

#### PLAY 15 NPC và hội thoại

**Trạng thái  **Backlog**    Ưu tiên  **P2**    Chủ trì  **Game Engine và Learning Experience

**Mục tiêu  **Đưa bài hội thoại vào bối cảnh địa điểm.

**Đầu ra  **NPC, dialogue state, lựa chọn câu và kết quả học tập.

**Hoàn thành khi  **Hội thoại lưu đúng attempt và không chặn điều khiển game.

#### PLAY 16 Tiến độ và mở khóa

**Trạng thái  **Backlog**    Ưu tiên  **P2**    Chủ trì  **Play Web và Backend

**Mục tiêu  **Cho người chơi thấy mục tiêu và thành quả.

**Đầu ra  **XP, mastery, điều kiện mở area và màn hình tiến độ.

**Hoàn thành khi  **Điều kiện được tính phía server và hiển thị nhất quán.

#### PLAY 17 Kinh tế và nông trại

**Trạng thái  **Backlog**    Ưu tiên  **P3**    Chủ trì  **Game Design

**Mục tiêu  **Thêm tiền tệ, inventory, shop và vòng lặp nông trại.

**Đầu ra  **Trồng, chờ, thu hoạch, mua bán và vật phẩm.

**Hoàn thành khi  **Mọi giao dịch idempotent, dùng giờ máy chủ và có log.

**Phụ thuộc  **BACK 16 đến BACK 18.

#### PLAY 18 Thêm bản đồ ngôn ngữ

**Trạng thái  **Backlog**    Ưu tiên  **P3**    Chủ trì  **Content và World Design

**Mục tiêu  **Mở rộng ngoài language code en.

**Đầu ra  **Map, địa điểm, nội dung và asset cho từng ngôn ngữ.

**Hoàn thành khi  **Land mới không rơi về bãi cỏ mặc định khi được publish.

#### PLAY 19 Cài đặt trải nghiệm

**Trạng thái  **Backlog**    Ưu tiên  **P3**    Chủ trì  **Play Web và Game Engine

**Mục tiêu  **Cho người chơi điều chỉnh đồ họa, âm thanh và accessibility.

**Đầu ra  **Quality preset, âm lượng, giảm chuyển động, phụ đề và remap cơ bản.

**Hoàn thành khi  **Thiết lập được lưu; game vẫn hoạt động trên thiết bị cấu hình thấp.

## Definition of Done

- Có tiêu chí chấp nhận cụ thể và test tự động tương ứng.

- TypeScript typecheck, lint và test của workspace liên quan đều thành công.

- Quyền truy cập được kiểm tra ở giao diện, server và RLS khi có dữ liệu Supabase.

- Các trạng thái loading, empty, lỗi và retry được xử lý.

- Schema, API contract và tài liệu vận hành được cập nhật cùng thay đổi.

- Không đưa secret vào client hoặc biến NEXT_PUBLIC.

## Trình tự triển khai đề xuất

1. Nối map published vào Play.

2. Mở luồng vào area.

3. Tích hợp bài học đầu tiên.

4. Hoàn thiện chat câu mẫu và reconnect.

5. Bổ sung tiến độ học.

6. Chỉ bắt đầu economy và farm sau khi vòng lặp học tập ổn định.

## Ghi chú quản lý

Mỗi sprint nên chốt phạm vi bằng tiêu chí hoàn thành của card. Card chỉ chuyển sang Đã hoàn thành sau khi code, test, quyền truy cập, tài liệu và luồng lỗi liên quan đều được kiểm tra. Không gộp nhiều thay đổi dữ liệu độc lập vào một card nếu chúng cần triển khai hoặc rollback riêng.
