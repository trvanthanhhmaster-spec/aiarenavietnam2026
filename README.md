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

Trang chủ giữ ảnh dự phòng lấy từ khung mở đầu của video, nền tối và chữ trắng
dễ đọc ngay khi mở. Không dùng lớp trắng che nền khi video đang tải hoặc lỗi.
Chỉ video gốc được ưu tiên tải; các clip chuyển cảnh bắt đầu tải sau khi khung
hình mở đầu đã được hiển thị. Giao diện cinematic được giữ nguyên khi media
sẵn sàng. Dùng `?loader=preview` để xem trạng thái chờ trong 2,6 giây khi sửa
thiết kế; lượt truy cập bình thường không có thời gian chờ cố định.
Kiểm tra hồi quy bằng `node tests/home-loading.cjs`.
Trên mobile, bảng chọn dùng nền trong tối nhẹ, không có backdrop blur hay bóng
đổ ra ngoài khung để tránh mảng nhòe khi ghép với video. Desktop vẫn giữ hiệu
ứng kính. Kiểm tra contract CSS bằng `node tests/mobile-controller.cjs`.

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

Studio dùng workspace sáng theo mẫu media-first: thanh công cụ bên trái,
khung preview và dải ảnh đã tạo, bảng bên phải có các tab Phối đồ,
Về trang phục và Mua & chụp. Navigation được tách trong `includes/studio`, lớp bố cục
mới nằm trong `studio-workspace.css` và hành vi tab trong `studio-workspace.js`.
Các icon Lucide được lưu cục bộ kèm giấy phép; không cần React/Vite để chạy PHP.
Video mở đầu luôn được ghi rõ là minh họa, không được nhận là ảnh AI của người
dùng. Dải ảnh chỉ xuất hiện khi có kết quả thật;
So sánh ảnh hiển thị trực tiếp hai kết quả trong khung preview.
Ảnh và video minh họa khởi đầu được cấu hình độc lập trong Admin → Studio
generation (`preview_poster_url`, `preview_media_url`) qua Supabase. Ảnh hiện
trước khi video tải; video lặp không tiếng. Nếu video lỗi hoặc người dùng
giảm chuyển động, Studio giữ ảnh minh họa. Media tầng 1 không bị thay đổi.
Kiểm thử tab, upload, responsive navigation và so sánh không gọi provider:
`node tests/studio-workspace.cjs`.

Studio hỏi một điều mỗi lần: **Dịp mặc → Số người → Thời gian → Trang phục**,
sau đó tổng kết và **Tạo ảnh bản phối**. Dịp có tìm kiếm không dấu và gợi ý từ
catalog; mô tả tự nhập là nhu cầu người dùng, không phải tri thức đã duyệt.
Preset chỉ đánh dấu gợi ý, không tự chọn trang phục hoặc gọi AI.
Khi tìm không có kết quả, bấm **Dùng dịp “…”** để dùng dịp tự nhập như Đi biển.
Nhập mô tả khi chưa chọn dịp cũng cho phép tiếp tục; dịp tự nhập được ghi rõ
là nhu cầu riêng, không tự thêm vào catalog hay coi là tri thức đã duyệt.
Tên dịp đi theo metadata của job/Look, không cần migration hay seed riêng.
Demo hỗ trợ 1–12 người: phối đồng điệu lấy Người 1 làm gợi ý cho những người
chưa tùy chỉnh, hoặc chọn riêng mỗi người. Tùy chỉnh riêng không bị ghi đè.
Thời gian gồm tuần này/tuần sau/tháng sau/chưa xác định/khoảng ngày cụ thể;
không phải thời điểm trong ảnh hay dự báo thời tiết trực tiếp.
Phong cách, phụ kiện, màu, họa tiết, bối cảnh và số đo là tùy chọn của từng người.
Ảnh mặt yêu cầu đồng ý, có nút xóa và chỉ giữ trong tab; khi tạo, trình duyệt
ghép thành một bảng ảnh đánh số gửi provider. Không lưu byte ảnh mặt vào
job, localStorage hay Look. Provider có chính sách xử lý riêng; không đảm bảo
giữ mặt chính xác. Số đo không thay thế tư vấn kích cỡ mua/thuê.
Mỗi xác nhận tạo **một ảnh nhóm**, không tự tạo A–E hoặc phương án so sánh.
Trong lúc tạo, bảng lựa chọn tạm khóa. Lưu Look dùng snapshot đã xác nhận,
không dùng trạng thái controls sau đó. Sửa lựa chọn không tự gọi lại AI.
Thư viện/so sánh chỉ hiện khi có các kết quả thật; không nhận ảnh catalog là
ảnh AI nhóm nếu provider lỗi. Trên mobile câu hỏi vẫn đứng trước preview.
Kiểm thử hướng dẫn, preset, trạng thái job và lời báo lỗi không gọi AI:
`node tests/studio-beginner.cjs`, `node tests/studio-planner.cjs`,
`php tests/studio-plan.php`, `deno test supabase/functions/generate-look/*_test.ts`.
Kiểm tra bridge với client giả, không đăng nhập hay gọi Gemini:
`services/gemini-webapi-bridge/.venv/bin/python3 tests/studio-bridge-group.py`.
Luồng nhóm lưu metadata vào JSONB sẵn có (`generation_jobs.input`,
`looks.selection`); không cần thay schema hay xóa dữ liệu hiện tại.

Mở `http://localhost/aiarenavietnam2026/studio.php` để chuẩn bị qua bốn bước
và xác nhận tạo ảnh. Người dùng không chọn thông số kỹ thuật. Catalog đọc từ
`studio_events`, `studio_garments`, `studio_accessories` và `studio_options`;
không cần sửa PHP khi thêm lựa chọn mới.

Ảnh chọn trang phục, phụ kiện, họa tiết và bối cảnh được lưu cục bộ trong
`assets/media/catalog` để Catalog tải nhanh và không phụ thuộc hotlink. Nguồn,
tác giả và giấy phép của từng ảnh tham chiếu được ghi tại
[`assets/media/catalog/CREDITS.md`](assets/media/catalog/CREDITS.md); metadata
ảnh và mô tả hiển thị vẫn do Supabase quản lý.

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

Khung ảnh, độ phân giải, chế độ và loại đầu ra là preset do Admin quản lý trong
`studio_generation_settings`; Studio chỉ hiển thị preset đang hoạt động. Mặc
định demo là canvas ngang `16:9` ở chất lượng mục tiêu `1080p`. Kết quả trả về
được hiển thị trực tiếp trong AI Preview, còn bảng chi tiết job nằm bên dưới,
không chặn toàn màn hình.

Gợi ý mua/thuê và địa điểm chụp thật được đọc từ
`studio_marketplace_listings` và `studio_locations`. Admin có CRUD riêng cho
hai catalog này; mỗi bản ghi có nguồn, trạng thái hoạt động và thời điểm xác
minh để Studio không phải hardcode brand hoặc địa điểm.

Trong Studio, nút Đăng nhập/Tài khoản mở hộp thoại tại chỗ. Khách có thể
chuyển giữa đăng nhập và đăng ký; thành viên xem email, trạng thái xác nhận,
sửa tên hiển thị và đăng xuất. Chỉ tài khoản có role `admin` được thấy lối
vào trang quản trị. Tên hiển thị cập nhật bằng access token của chính người
dùng; không sửa role, email hoặc mật khẩu. Icon thanh bên có nhãn khi hover
và focus bàn phím. Kiểm thử offline: `node tests/account-profile.cjs` và
`node tests/studio-auth-modal.cjs` (không ghi vào Supabase thật).

Gia hạn đăng nhập cùng tài khoản giữ phiên và CSRF của các tab đang mở;
đăng nhập mới hoặc đổi tài khoản vẫn xoay mã bảo vệ. Xem
[sửa phiên lưu và phản hồi số người](docs/studio-session-and-people-feedback.md).
Kiểm thử: `php tests/auth-refresh.php`, `node tests/studio-people-feedback.cjs`.

Mở `auth.php` để đăng ký/đăng nhập bằng email hoặc Google OAuth. Phiên đăng
nhập dùng cookie HttpOnly và được dùng chung giữa Studio, thư viện Look và
Admin. Cấu hình Google tại **Admin → Accounts → Đăng nhập Google**; kết nối máy
chủ cần token quản lý riêng (không phải service_role). Xem
[hướng dẫn cấu hình an toàn](docs/google-auth-admin.md). Google cần được bật, kèm
redirect URL `http://localhost/aiarenavietnam2026/auth-callback.php`.

Mở `admin.php` sau khi đăng nhập bằng tài khoản có role `admin`. Trên một dự án
trống, tài khoản Supabase đầu tiên mở Admin từ localhost sẽ được cấp role
`admin`; các môi trường khác phải cấp role trong `user_roles`. Trang
`API & chi phí` là màn hình mặc định: tại đây có thể bật/tắt generation, chọn
provider/model ảnh và video, nhập Gemini API key dạng write-only, đặt số biến
thể, đơn giá ước tính và ngân sách ngày/tháng. API key được mã hoá AES-256-GCM
trước khi lưu; nếu để trống, Edge Function tiếp tục dùng secret đã deploy.
Thay đổi runtime được Edge Function nhận trong tối đa khoảng 15 giây.
Một Gemini API key dùng chung cho text, ảnh và video khi chọn Gemini Developer
API. Nếu video chọn Vertex AI / Cloud Run bridge, bridge URL và secret tiếp tục
được giữ ở Edge Function/Cloud Run và không hiển thị trong trình duyệt.

Admin chạy qua PHP session Supabase, role `admin`, CSRF và service-role key chỉ
ở server; không đưa secret vào HTML/JavaScript. Ngoài AI operations, có thể sửa catalog Studio,
nơi mua/thuê, địa điểm chụp, media tầng 1, nguồn văn hoá, prompt versions và
xem generation jobs. Chi phí
trên dashboard là dự toán theo đơn giá đã cấu hình, không phải số liệu hoá đơn
Google Cloud. Với XAMPP, đặt `SUPABASE_CACHE_FILE` ở thư mục runtime ngoài
document root (ví dụ `/tmp`) để PHP user `daemon` có quyền ghi mà không phải mở
quyền cho source tree.

Sau khi cập nhật repo chính, đồng bộ bản XAMPP:

```bash
git -C /Applications/XAMPP/xamppfiles/htdocs/aiarenavietnam2026 pull --ff-only
```

## Kiểm tra nhanh

### Bộ sưu tập Studio

Studio dùng một danh sách **Bộ sưu tập của tôi**. Mỗi bộ có lựa chọn, ảnh đang
xem và các phiên bản riêng; không nhập toàn bộ lịch sử ảnh khi mở danh sách.
“＋ Bộ sưu tập mới” giữ bộ cũ và đưa Studio về bước Dịp mặc. Bộ trống chưa
tạo một hàng mới; bộ có lựa chọn được tự lưu vào tài khoản. Ảnh mặt không được lưu.

Migration `20261008120000_studio_collections.sql` chuyển dữ liệu cũ một lần,
thêm bảng `studio_collections`, liên kết `generation_jobs.collection_id` và
dấu xóa. Xóa bộ/phiên bản chỉ ẩn dữ liệu và bookmark liên quan; chưa xóa tệp
Storage vĩnh viễn. Cửa sổ cũ không được hồi sinh ID đã xóa.

`studio-collections-api.php` kiểm tra tài khoản + CSRF, dùng revision riêng
từng bộ và ghi nguyên tử qua RPC service-only. Khi hai cửa sổ sửa cùng một
bộ, Studio cho giữ thay đổi trên thiết bị thành bộ riêng hoặc tải bản mới nhất.
Khôi phục cục bộ tách theo từng tab; signed URL và output không vào payload lưu.
Client cơ sở dữ liệu thử lại tối đa một lần cho GET khi lỗi kết nối hoặc HTTP
502/503/504. Ghi/RPC chỉ thử kết nối lại nếu DNS chưa tìm được host (curl 6,
chưa có kết nối hay yêu cầu gửi đi); không gửi lại sau timeout/HTTP vì giao dịch
có thể đã hoàn tất. Lỗi API ghi vào log theo loại và mã, không ghi payload hoặc
thông tin xác thực.

Kiểm thử: `node tests/studio-collection-store.cjs`,
`node tests/studio-collections.cjs`,
`php tests/supabase-admin-client.php`,
`php tests/studio-collections-live.php --live` (tạo rồi xóa tài khoản QA riêng,
không gọi AI). Dữ liệu tổng hợp trong kiểm thử không phải bằng chứng provider
tạo ảnh thật. Sau migration cần đồng bộ PHP/JS/CSS vào XAMPP và triển khai Edge
Function nếu sử dụng đường tạo ảnh Edge.

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
