# Giao diện quản trị V-Remix

Admin lấy phong cách Vitalis từ bản tham chiếu: Inter, nền cyan `#f0f8fc`,
thẻ trắng bo mềm, thanh icon olive và nhấn xanh/lime. Không sao chép nội dung
sức khỏe, ảnh đại diện hay số liệu minh họa của mẫu. Các số trên màn hình là dữ
liệu Supabase thật; chi phí vẫn là **ước tính**, không phải hóa đơn nhà cung cấp.

## Cấu trúc

- `includes/admin/navigation.php`: bộ icon SVG và thanh nhóm quản trị.
- `assets/css/admin-dashboard.css`: lớp giao diện riêng của admin, không đổi
  trang tìm/nhập nguồn đang dùng stylesheet chung `admin.css`.
- `assets/js/admin-shell.js`: nhóm, tìm mục không phân biệt dấu, menu responsive.
- `assets/js/admin.js`: tiếp tục quản lý dữ liệu/editor như trước. Chuyển nhóm
  đi qua cùng handler kiểm tra thay đổi chưa lưu của Google Auth.

Desktop có rail và danh sách nhóm. Dưới 900px, danh sách thành menu nổi. Điện
thoại dưới 620px có topbar sticky và thanh icon ở đáy; nút Menu luôn mở toàn bộ
mục, kể cả Nội dung và Vận hành không nằm trên thanh icon nhỏ. Escape/nút đóng/
bấm nền đóng menu; focus quay về trigger. Chọn mục đóng menu và focus nội dung.

Không thu font về 7px theo frame mẫu, không khóa scroll trang. Bảng rộng cuộn
ngang trong thẻ. Mục dài và form luôn cuộn được. Nút lưu khóa trong khi gửi,
lỗi lưu hiện ngay trong dialog, không chỉ ở status phía sau dialog.

## Kiểm thử

`node tests/admin-shell.cjs` và `node tests/admin-google-auth.cjs` kiểm tra offline
điều hướng, search, menu đầy đủ, focus, dirty guard và secret clearing. Browser QA
chỉ đọc dữ liệu và mở/đóng editor, không lưu cấu hình, xóa bản ghi hoặc tạo ảnh.

Khi không có phiên admin, dùng `php tests/admin-design-preview.php <thư mục tmp>`
để render template thật với dữ liệu minh họa. Công cụ chỉ chạy CLI, không boot
Auth/đọc môi trường, không kết nối Supabase và từ chối mọi request ghi. Bản dựng
QA có dòng nhãn riêng và không chứng minh việc lưu dữ liệu production.
