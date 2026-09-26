# AI Arena Vietnam 2026

Landing page V-Remix chạy bằng PHP trên XAMPP.

## Cấu trúc

- `index.php`: entry point, chỉ ghép các partial theo thứ tự render.
- `config/site.php`: metadata, nội dung lựa chọn và URL media dùng chung.
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

PHP đọc dữ liệu trang và các branch qua Supabase REST API, sau đó cache nội dung trong `storage/cache`. Khi chưa cấu hình Supabase hoặc API tạm thời lỗi, trang tự động dùng dữ liệu local trong `config/site.php`.

Sau khi cập nhật repo chính, đồng bộ bản XAMPP:

```bash
git -C /Applications/XAMPP/xamppfiles/htdocs/aiarenavietnam2026 pull --ff-only
```
