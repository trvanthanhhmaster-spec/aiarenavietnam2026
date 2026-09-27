# V-Remix - Kế hoạch Audition đã định hình lại

Cập nhật: 2026-09-27

Tài liệu này là nguồn ưu tiên cho giai đoạn Audition. Kế hoạch nền tảng dài hạn
vẫn được giữ lại, nhưng không được làm chậm hoặc làm mỏng luồng demo cốt lõi.

## 1. Mục tiêu sản phẩm

V-Remix giúp người dùng chọn bối cảnh, Việt phục, màu sắc và phụ kiện hiện đại,
sau đó tạo một lookbook 9:16 có giải thích văn hóa rõ ràng.

Thông điệp demo:

> Việt phục không chỉ được lưu giữ; nó có thể được hiểu đúng, phối đúng và sống
> trong bối cảnh hiện đại.

## 2. Hành trình demo bắt buộc

1. Người xem vào Tầng 1 và thấy trải nghiệm cinematic V-Remix.
2. Bấm "Khám phá ngay" để vào Studio.
3. Chọn bối cảnh, cổ phục, phối sắc và phụ kiện.
4. Có thể tải ảnh đại diện lên, nhưng không bắt buộc.
5. Bấm "Tạo bản phối".
6. Nhận một kết quả ổn định gồm:
   - Ảnh AI 9:16.
   - Các phương án lookbook để so sánh.
   - Story Card.
   - Cultural Guardrail.
   - Mẹo Gen Z.
   - Nút tải kết quả.
7. Nếu video sẵn sàng, hiển thị video như một lớp nâng cao. Nếu video chậm hoặc
   lỗi, lookbook ảnh vẫn phải hoàn tất và demo vẫn tiếp tục.

Mục tiêu là hoàn thành hành trình này trong khoảng 90 giây khi thuyết trình.

## 3. Scope lock cho Audition

### P0 - Bắt buộc phải ổn định

- Bảo toàn visual, media transition và CTA của Tầng 1.
- Studio desktop và mobile đọc catalog thật từ Supabase.
- Gemini tạo prompt có version, Story Card, Guardrail và mẹo phối.
- Tạo ít nhất một ảnh kết quả 9:16; tối đa bốn ảnh nếu provider cho phép.
- Lưu asset vào Supabase Storage và trả signed URL.
- Generation job có `queued`, `processing`, `completed`, `failed`.
- Không tạo job trùng khi người dùng reload hoặc bấm lại.
- Có thể tiếp tục theo dõi job đang chạy sau khi reload trang.
- Có fallback rõ ràng khi AI timeout, quota hết hoặc Storage lỗi.
- Không để provider key trong HTML hoặc JavaScript phía client.
- Có một kịch bản demo dự phòng đã được kiểm thử.

### P1 - Chỉ làm sau khi P0 đạt

- Video Veo 8 giây cho kết quả.
- Dùng ảnh lookbook đã duyệt làm first frame của video để giữ nhân vật và trang
  phục nhất quán.
- Tải video MP4 và trạng thái tiến trình riêng.
- Một trợ lý hội thoại ngắn dựa trên kết quả đã tạo.

Video là progressive enhancement. Video không được chặn việc hiển thị ảnh,
Story Card hay nút tải lookbook.

### Sau Audition

- Supabase Auth email/password.
- Thư viện cá nhân, gallery, link chia sẻ và quyền xóa dữ liệu.
- Admin CRUD, biên tập nội dung và duyệt văn hóa.
- Roles, partner workspace, doanh nghiệp, trường học và sự kiện.
- Generated asset tables chuẩn hóa thay vì chỉ lưu JSON trong job.
- Dashboard eval, chi phí, quota và observability đầy đủ.

## 4. Trạng thái hiện tại

| Hạng mục | Trạng thái | Khoảng trống |
| --- | --- | --- |
| Tầng 1 data-driven | Đã có | Cần visual QA đầy đủ trên desktop/mobile và mọi branch |
| Supabase catalog | Đã có ban đầu | Nội dung văn hóa còn ngắn, chưa có bộ nguồn đã duyệt thực tế |
| Studio selector | Đã có | Cần test thao tác, responsive và accessibility theo kịch bản demo |
| Gemini text/prompt | Đã có một prompt v1 | Chưa có eval cases, schema validation và prompt regression |
| Image generation | Đã nối provider | Cần đánh giá chất lượng, identity consistency và fallback asset |
| Lookbook | Hiển thị tối đa bốn ảnh | Chưa có persistence riêng, resume và gallery |
| Video generation | Đã chạy được qua Vertex bridge | API-key Gemini route thiếu prepaid balance; video đang bị ưu tiên quá mức |
| Job polling | Đã có | Reload mất job; chưa chống submit trùng; chưa có cancel |
| Download | Đã có cho một asset | Chưa có lookbook composite 9:16 hoàn chỉnh |
| Auth/admin/share | Chưa có | Để sau Audition |
| VPS/domain | Chưa có | Chỉ làm sau khi P0 và demo script đã khóa |

## 5. Kiến trúc Audition

```text
Tầng 1 / Studio PHP
        |
        | catalog public
        v
Supabase Postgres
        |
        | POST /generate-look
        v
Supabase Edge Function
        |-- Gemini text: story + guardrail + image prompt
        |-- Gemini image: lookbook 9:16
        |-- Supabase Storage: generated assets
        `-- generation_jobs: trạng thái và output

Video tùy chọn:
Edge Function -> provider adapter -> Veo -> Storage
```

Quyết định provider:

- Text và ảnh tiếp tục chạy server-side qua Edge Function.
- Video được tách bằng `GOOGLE_VIDEO_PROVIDER`.
- Hiện tại dùng Vertex bridge vì nó đã được kiểm thử với Google Cloud credits.
- Chỉ chuyển sang Gemini API key khi prepaid balance đã sẵn sàng và test thật
  hoàn tất.
- Không thêm provider hoặc hạ tầng mới nếu không cải thiện trực tiếp demo P0.

## 6. Thứ tự phát triển mới

### Milestone A - Khóa luồng demo

- Lưu `jobId` và input đang chạy trong browser storage.
- Resume polling sau reload.
- Vô hiệu hóa submit trong khi job đang chạy.
- Tách trạng thái image và video để video không chặn lookbook.
- Thêm retry có kiểm soát và thông báo lỗi tiếng Việt nhất quán.

Trạng thái hiện tại: đã triển khai idempotency theo `clientRequestId`, resume
theo `jobId`/`requestId`, chống submit trùng, và cho phép ảnh hiển thị khi video
còn đang xử lý. Phần cancel job và test browser full-flow vẫn còn lại.

### Milestone B - Khóa chất lượng kết quả

- Định nghĩa JSON schema cho output Gemini.
- Tạo bộ eval tối thiểu cho bốn loại trang phục và bốn bối cảnh.
- Gắn nguồn văn hóa đã duyệt cho từng garment.
- Kiểm tra prompt version và output không bịa thông tin lịch sử.
- Tạo fallback lookbook được duyệt cho kịch bản demo.

Trạng thái hiện tại: đã thêm schema parser và test cho `story`, `guardrail`,
`genZTip`, `imagePrompt`, `confidence`; prompt v1 trên Supabase đã được đồng bộ
với contract này. Bộ eval văn hóa, nguồn được duyệt và fallback lookbook vẫn còn
lại.

### Milestone C - Khóa trải nghiệm trình bày

- Visual QA Tầng 1 và Studio trên desktop/mobile.
- Kiểm thử media loading, error state, keyboard và reduced motion.
- Xuất một lookbook composite 9:16 thay vì chỉ tải một ảnh đơn.
- Viết demo script 90 giây và chạy thử từ đầu đến cuối.

### Milestone D - Video tùy chọn

- Chỉ bắt đầu khi A-C đạt.
- Dùng ảnh lookbook đầu vào Veo.
- Video có trạng thái riêng và không làm thất bại job ảnh.
- Kiểm thử chi phí, quota, timeout và fallback.

### Milestone E - Deploy

- Deploy VPS/domain.
- Smoke test production, Supabase, Storage và Edge Function.
- Đồng bộ GitHub và XAMPP.
- Đóng băng một bản demo có thể rollback.

## 7. Tiêu chí nghiệm thu P0

- Tầng 1 vào được Studio mà không mất trải nghiệm cinematic.
- Thêm option catalog mới không cần sửa PHP/JavaScript lõi.
- Một lần bấm tạo chỉ sinh một generation job.
- Reload trang trong lúc tạo vẫn tiếp tục dùng job cũ.
- Ảnh kết quả, Story Card và Guardrail hiển thị khi video chưa sẵn sàng.
- Kết quả có thể tải ở tỉ lệ 9:16.
- Provider key không xuất hiện trong HTML, JavaScript hoặc network response.
- Lỗi quota, timeout, Storage và media đều có thông báo/fallback rõ ràng.
- PHP lint, `node --check`, `deno check`, HTTP smoke test và visual QA đạt.

## 8. Nguyên tắc thay đổi

- Mỗi task phải gắn với một milestone trong tài liệu này.
- Không mở rộng Auth/admin/partner trước khi P0 đạt.
- Không tối ưu provider video trước khi luồng ảnh và fallback ổn định.
- Mỗi thay đổi: kiểm tra local -> commit -> push GitHub -> đồng bộ XAMPP.
- Nếu một thử nghiệm provider thất bại, phải quay về cấu hình demo đã kiểm thử.
