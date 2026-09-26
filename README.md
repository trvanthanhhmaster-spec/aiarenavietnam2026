# AI Arena Vietnam 2026

Landing page V-Remix chạy bằng PHP trên XAMPP.

## Cấu trúc

- `index.php`: entry point, chỉ ghép các partial theo thứ tự render.
- `config/database.php`: cấu hình kết nối Supabase từ biến môi trường.
- `src/`: HTTP client và repository lấy nội dung trang qua Supabase REST API.
- `database/schema.sql`: schema, RLS policies và dữ liệu seed cho Supabase.
- `includes/partials/`: các mảnh giao diện có thể tái sử dụng (`head`, `header`, `hero`, `controller`, `media`, `feedback`).
- `assets/css/app.css`: design system và responsive layout.
- `assets/js/app.js`: hành vi chuyển cảnh, accessibility và trạng thái phát video.

## Chạy local

Mở `http://localhost/aiarenavietnam2026/` khi Apache/PHP của XAMPP đang chạy.

## Kết nối Supabase

1. Tạo project Supabase và chạy toàn bộ `database/schema.sql` trong SQL Editor.
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

Sau khi cập nhật repo chính, đồng bộ bản XAMPP:

```bash
git -C /Applications/XAMPP/xamppfiles/htdocs/aiarenavietnam2026 pull --ff-only
```
