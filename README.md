# AI Arena Vietnam 2026

Landing page V-Remix chạy bằng PHP trên XAMPP.

Kế hoạch ưu tiên cho bản thi nằm tại
[`docs/AUDITION_PLAN.md`](docs/AUDITION_PLAN.md). Trong giai đoạn Audition,
lookbook ảnh và nội dung văn hóa là luồng bắt buộc; video là lớp nâng cao và
không được chặn kết quả chính.

## Cấu trúc

- `index.php`: entry point, chỉ ghép các partial theo thứ tự render.
- `config/database.php`: cấu hình kết nối Supabase từ biến môi trường.
- `src/`: HTTP client và repository lấy nội dung trang qua Supabase REST API.
- `database/schema.sql`: schema nền, RLS policies và dữ liệu seed tối thiểu cho Supabase.
- `supabase/migrations/`: các migration chính thức, gồm catalog Studio và generation contract.
- `includes/partials/`: các mảnh giao diện có thể tái sử dụng (`head`, `header`, `hero`, `controller`, `media`, `feedback`).
- `assets/css/app.css`: design system và responsive layout.
- `assets/js/app.js`: hành vi chuyển cảnh, accessibility và trạng thái phát video.
- `studio.php`: Studio tầng 2 đọc catalog Việt phục/phụ kiện từ Supabase.

## Chạy local

Mở `http://localhost/aiarenavietnam2026/` khi Apache/PHP của XAMPP đang chạy.

## Kết nối Supabase

1. Tạo project Supabase và chạy `database/schema.sql` trong SQL Editor hoặc dùng `supabase db push --linked --include-all` để áp dụng toàn bộ migration.
2. Sao chép `.env.example` thành `.env`, điền `SUPABASE_URL` và `SUPABASE_ANON_KEY`.
3. Đặt `.env` ở thư mục gốc dự án. File này đã được loại khỏi Git.

PHP đọc dữ liệu trang, branch, media và toàn bộ UI copy qua Supabase REST API, sau đó cache nội dung trong `storage/cache`. Nếu cả Supabase và cache đều không khả dụng, ứng dụng trả `503` thay vì dùng dữ liệu nội bộ.

Để thay video, mở Supabase Table Editor → `experience_branches`, rồi sửa:

- `forward_media_url`: video chạy khi chọn dịp.
- `reverse_media_url`: video chạy khi bấm `Chọn lại`. Để trống để tự tua ngược `forward_media_url`.
- `branch_key`: mã kỹ thuật tự chọn, không cần dùng các tên cũ.
- `page_slug`: trang mà branch thuộc về, hiện tại là `home`.
- `forward_guard`: số giây giữ ở cuối video forward để tránh lộ frame chuyển cảnh.
- `reverse_guard`: số giây giữ ở đầu video reverse trước khi kết thúc chuyển cảnh.
- `sort_order`: thứ tự hiển thị trên controller.
- `is_active`: bật/tắt branch khỏi giao diện mà không xóa dữ liệu.
- `is_base`: đánh dấu đúng một branch làm khung cảnh ban đầu.

Thêm branch mới chỉ cần thêm một dòng trong `experience_branches`; controller, video elements,
trạng thái tải và vị trí capsule sẽ tự sinh theo dữ liệu.

## Studio tầng 2

Mở `http://localhost/aiarenavietnam2026/studio.php` để chọn sự kiện, cổ phục, màu,
phong cách và phụ kiện. Catalog được đọc từ `studio_events`, `studio_garments`,
`studio_accessories` và `studio_options`; không cần sửa PHP khi thêm lựa chọn mới.

Migration Studio tạo `generation_jobs` và `studio_prompt_versions` làm contract
cho Supabase Edge Function. Bản hiện tại đã gọi Gemini server-side để tạo Story
Card, Cultural Guardrail, prompt ảnh, lookbook và video tùy chọn. Asset hoàn tất
được lưu trong Supabase Storage và trả về bằng signed URL.

Luồng ảnh tạo tối đa bốn biến thể tuần tự và giữ lại các ảnh đã thành công nếu
provider lỗi ở biến thể sau. Khi Gemini text tạm lỗi, Edge Function dùng đúng dữ
liệu catalog đã duyệt cho Story Card/Guardrail và đánh dấu
`copySource=catalog-fallback`; provider key không bao giờ được gửi về client.

Luồng video hiện dùng image-to-video: Edge Function tạo và lưu lookbook trước,
sau đó gửi chính ảnh đầu tiên sang Veo qua Cloud Run Vertex bridge. Chế độ
`video` tạo một first frame; chế độ `both` dùng ảnh đầu tiên của lookbook. Video
lỗi hoặc timeout không làm thất bại phần ảnh đã hoàn tất.

Kết quả ảnh luôn được yêu cầu theo canvas dọc `9:16` ở cả request Gemini,
prompt và khung hiển thị Studio. Provider có thể trả kích thước pixel gần
9:16 (ví dụ `768×1344`), nhưng không còn bị trình bày như một khung ngang.

Mở `admin.php` từ localhost để thiết lập mật khẩu quản trị lần đầu. Admin
chạy qua PHP session, CSRF và service-role key chỉ ở server; không đưa secret
vào HTML/JavaScript. Có thể sửa catalog Studio, media tầng 1, nguồn văn hoá,
prompt versions và xem generation jobs. Với XAMPP, đặt `ADMIN_AUTH_FILE` và
`SUPABASE_CACHE_FILE` ở thư mục runtime ngoài document root (ví dụ `/tmp`) để
PHP user `daemon` có quyền ghi mà không phải mở quyền cho source tree.

Sau khi cập nhật repo chính, đồng bộ bản XAMPP:

```bash
git -C /Applications/XAMPP/xamppfiles/htdocs/aiarenavietnam2026 pull --ff-only
```

## Kiểm tra nhanh

```bash
php -l index.php
php -l studio.php
node --check assets/js/app.js
node --check assets/js/studio.js
deno check supabase/functions/generate-look/index.ts
deno test supabase/functions/generate-look/copy-schema_test.ts \
  supabase/functions/generate-look/fallback-copy_test.ts \
  supabase/functions/generate-look/image-request_test.ts \
  supabase/functions/generate-look/video-request_test.ts
```
