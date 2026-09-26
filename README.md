# AI Arena Vietnam 2026

Landing page V-Remix chạy bằng PHP trên XAMPP.

## Cấu trúc

- `index.php`: entry point, chỉ ghép các partial theo thứ tự render.
- `config/site.php`: metadata, nội dung lựa chọn và URL media dùng chung.
- `includes/partials/`: các mảnh giao diện có thể tái sử dụng (`head`, `header`, `hero`, `controller`, `media`, `feedback`).
- `assets/css/app.css`: design system và responsive layout.
- `assets/js/app.js`: hành vi chuyển cảnh, accessibility và trạng thái phát video.

## Chạy local

Mở `http://localhost/aiarenavietnam2026/` khi Apache/PHP của XAMPP đang chạy.

Sau khi cập nhật repo chính, đồng bộ bản XAMPP:

```bash
git -C /Applications/XAMPP/xamppfiles/htdocs/aiarenavietnam2026 pull --ff-only
```
