# AI Arena Vietnam 2026

Landing page V-Remix chạy bằng PHP trên XAMPP.

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
- `is_base`: đánh dấu đúng một branch làm khung cảnh ban đầu.

Thêm branch mới chỉ cần thêm một dòng trong `experience_branches`; controller, video elements,
trạng thái tải và vị trí capsule sẽ tự sinh theo dữ liệu.

## Studio tầng 2

Mở `http://localhost/aiarenavietnam2026/studio.php` để chọn sự kiện, cổ phục, màu,
phong cách và phụ kiện. Catalog được đọc từ `studio_events`, `studio_garments`,
`studio_accessories` và `studio_options`; không cần sửa PHP khi thêm lựa chọn mới.

Migration Studio cũng tạo `generation_jobs` và `studio_prompt_versions` làm contract
cho Supabase Edge Function/Gemini ở bước tiếp theo. Bản hiện tại đã có Story Card và
Cultural Guardrail từ dữ liệu catalog; không giả vờ gọi AI khi Edge Function chưa được cấu hình.

Sau khi cập nhật repo chính, đồng bộ bản XAMPP:

```bash
git -C /Applications/XAMPP/xamppfiles/htdocs/aiarenavietnam2026 pull --ff-only
```
