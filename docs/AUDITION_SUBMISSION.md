# V-Remix hoàn thiện bài nộp Audition

Hạn nộp theo đề đội cung cấp là **10/10/2026 lúc 23:59:59, Asia/Ho_Chi_Minh**.
Mục tiêu trước hạn là demo được bốn chức năng bắt buộc, kiểm chứng một lượt
Gemini với ảnh mẫu, và sửa hồ sơ khớp sản phẩm. Mạng lưới cửa hàng là hướng
phát triển tiếp theo; không phải điều kiện để người dùng tạo bản phối sáng tạo.

## Phạm vi hoàn thành

- Chọn được dịp mặc và trang phục cho từng người.
- Chọn được màu, phụ kiện hoặc phong cách; kết quả tóm tắt đúng lựa chọn.
- Xem được kết quả ảnh AI hoặc thẻ bản phối có nguồn, phân biệt hai loại rõ ràng.
- Đọc được nguồn gốc, ý nghĩa và nguồn tham khảo của bốn dáng áo.
- AI nhận ảnh mẫu đã duyệt; prompt phiên bản và quy tắc văn hóa phải đi vào luồng ảnh nhóm.
- Yêu cầu có mã riêng, theo dõi được sau tải lại; lỗi không tự tiêu thêm lượt.
- Hồ sơ dùng đúng kiến trúc PHP, Supabase và bridge Gemini; không hứa độ trễ,
  model, độ chính xác hoặc đối tác chưa kiểm chứng.
- Người dự thi cung cấp video công khai, cuộc trò chuyện Gemini, xác nhận
  cam kết nguyên gốc và tự thực hiện nộp bài trước hạn.

## Trạng thái kiểm chứng

| Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- |
| Bốn chức năng bắt buộc | Thao tác máy tính và điện thoại với thẻ bản phối | QA template cách ly đạt: dịp, áo tấc, màu ngà, thẻ và nguồn; chưa phải thử toàn bộ catalog production |
| Tạo ảnh tham chiếu | Một lượt ảnh production, không ảnh mặt, không tự thử lại | Đạt ngày 10/10 lúc 15:57–15:58: job 40b1715c, một ảnh 1376×768, Storage HTTP 200, mẫu áo tấc đính kèm; một lượt đánh giá hoàn tất |
| Prompt và quy tắc | Unit test và metadata promptPolicy của job thật | Unit test đạt; job thật có versioned-group-v2, selected-catalog-only và garmentReferences=attached |
| Tiến trình bất đồng bộ | POST nhận sớm, GET cùng mã nhận trạng thái cuối | Lượt mới nhận HTTP 202, chỉ GET cùng requestId tới completed; không gửi POST lại |
| Thông tin văn hóa | Bốn hồ sơ có nguồn và phạm vi nhận định | Có dữ liệu biên tập, không phải chứng nhận chuyên gia |
| URL demo và repository | Mở công khai, không cần tài khoản giám khảo | HTTPS/SEO smoke production đạt sau triển khai; repository đã push |
| Video giới thiệu | Link xem công khai hoặc quyền xem phù hợp | Người dự thi xác nhận mới có thư mục, chưa có video |
| Chia sẻ Gemini | Mở link trong cửa sổ chưa đăng nhập | Chưa xác minh quyền xem |
| Cam kết và nộp bài | Trạng thái đã nộp trên cổng thi | Người dự thi thực hiện |

Các lượt trước, gồm job 75fb5fce lúc 14:16–14:18 và một yêu cầu hai người
lúc 15:42, gặp provider timeout. Lượt kiểm chứng bổ sung được người vận hành
cho phép đã thành công sau khi làm mới đúng hai cookie qua kênh riêng tư.
Fresh auth probe trên VPS trả SESSION_AVAILABLE, rồi kiểm tra HTTPS/gateway
đạt trước khi gửi ảnh. `/health` riêng lẻ vẫn không chứng minh khả năng tạo ảnh.

Lượt ngày 10/10 lúc 15:57–15:58 dùng request
`0c643f1a-3696-4743-8688-aa7c1ade84bf`, job
`40b1715c-c6e4-4604-b67e-7595f87d962f`. Một người mặc áo tấc, không tải ảnh
khuôn mặt, không thay đổi bộ sưu tập. Đã xem ảnh lưu thực tế: một người,
áo đỏ tay rộng, quần trắng và sân gạch. AI review trả matched, một người,
constructionChecks=match; đây là nhận định AI của một ca, không phải chứng
nhận văn hóa hoặc độ chính xác cho toàn bộ catalog. Minh chứng riêng nằm ở
`artifacts/reference-generation-qa/0c643f1a-3696-4743-8688-aa7c1ade84bf/`
gồm `generated-image.jpg` và `evidence.json`; không commit ảnh hoặc cookie.

Bridge production dùng image `vremix-bridge:dba0d31`: tắt retry của thư viện,
đặt watchdog sau deadline của request và không gửi lại khi mất phiên sau
submission. Mã yêu cầu được lưu trước POST; tải lại bằng GET không tạo job
mới. Đã dùng quyền bổ sung một ảnh và một lượt đánh giá; không chạy thêm.
Phiên Web có thể hết hạn; một ca thành công không bảo đảm vận hành lâu dài.
Dữ liệu mạng lưới shop hiện chưa có shop/sản phẩm; các liên kết mua/thuê cũ
không phải đối tác xác nhận.

Bằng chứng UI ngày 10/10: `artifacts/audition-readiness/suggestion-desktop.png`
và `suggestion-mobile.png` (390px). Catalog fixture, API bị vô hiệu hóa; không
lấy ảnh này làm bằng chứng AI production. Ảnh mẫu tải được, không tràn ngang,
đóng dialog trả focus về nút mở; thẻ hiển thị ngà ấm nhưng giải thích ảnh mẫu
đỏ không được tái tạo theo lựa chọn.

## Kịch bản demo ngắn

1. Mở Khám phá, chọn Dự lễ và vào Studio.
2. Chọn một người, thời gian chưa xác định, áo tấc và mẫu cụ thể.
3. Chọn màu hoặc phong cách; phụ kiện tùy chọn. Mở Về trang phục để đọc nguồn.
4. Kiểm tra tổng kết. Bấm Xem thẻ bản phối để thấy ngay thẻ lựa chọn có nguồn.
   Nói rõ đây là ảnh mẫu, chưa tái hiện màu hoặc phụ kiện trên người.
5. Bấm Tạo ảnh bản phối khi được phép tiêu lượt. Theo dõi cùng mã yêu cầu.
   Đối chiếu tay rộng, số người, màu và việc không tự thêm phụ kiện.
6. Khi thành công, tải ảnh gốc; phân biệt thẻ xuất 9:16 với tạo ảnh dọc mới.
   Nếu provider lỗi, tiếp tục dùng thẻ gợi ý, không nhận ảnh mẫu là ảnh Gemini.

## Quay video minh chứng 90–120 giây

Video chưa được tạo. Các mốc dưới đây là kịch bản quay, không phải minh chứng
đã có. Chỉ quay trang công khai; tránh Admin, DevTools, email, khóa và ảnh mặt
cá nhân. Kiểm tra lại bốn chức năng trên production trước khi quay.

| Mốc | Thao tác màn hình | Lời giới thiệu gợi ý |
| --- | --- | --- |
| 0–15s | Trang Khám phá, chọn Dự lễ → Studio | V-Remix giúp người trẻ chọn và phối Việt phục, kèm thông tin văn hóa có nguồn. |
| 15–40s | Một người → chưa xác định ngày → áo tấc, chọn mẫu | Đây là hành trình chọn dịp và mẫu áo. Ảnh tham khảo có nguồn, không phải hàng shop đã xác nhận. |
| 40–60s | Biến tấu màu, chọn ngà, không thêm phụ kiện → kiểm tra | Lựa chọn được giữ riêng cho từng người; phụ kiện không được tự thêm. |
| 60–85s | Xem thẻ bản phối, cuộn xuống nguồn gốc/ý nghĩa | Thẻ hiển thị đúng lựa chọn và nội dung biên tập có nguồn. Ảnh mẫu vẫn giữ màu gốc; đây chưa phải ảnh AI tái hiện. |
| 85–105s | Trình bày ảnh đã kiểm chứng của job 40b1715c; không cần gọi tạo ảnh mới khi quay | Lượt production ngày 10/10 nhận mẫu áo và kế hoạch cấu trúc, tạo ảnh thật và hoàn tất một lượt đánh giá. Đây là một ca kiểm chứng; phiên Web vẫn có thể hết hạn. |
| 105–120s | Hiển thị URL demo và repository, hướng phát triển | Mạng lưới shop sẽ bổ sung dữ liệu được duyệt và quyền dùng ảnh; demo hiện chưa có đối tác xác nhận. |

Quay bằng công cụ màn hình của máy, xem lại chữ và thao tác, rồi tải video
thực tế lên Drive/YouTube. Người dự thi chọn quyền xem thích hợp, mở thử khi
chưa đăng nhập và dán **link xem video**, không dùng link thư mục. Không chờ
xây xong mạng lưới shop mới quay; cũng không che trạng thái AI bằng ảnh mẫu.

## Nội dung thay trong form

Các đoạn dưới đây giữ dưới giới hạn từng trường. Đội cần rà soát lại các tuyên
bố và minh chứng trước khi nộp; chưa thực hiện autosave trên cổng thi.

### Nhu cầu người dùng và tình huống sử dụng

Học sinh, sinh viên muốn mặc Việt phục khi đi học, dạo phố, dự lễ hoặc chụp ảnh nhưng chưa dễ chọn dáng áo, hiểu đặc trưng và phối phụ kiện hiện đại. V-Remix giúp họ xem mẫu có nguồn, thử lựa chọn màu và phong cách, rồi đọc lời giải thích văn hóa ngắn ngay trong hành trình phối đồ.

Tình huống chính gồm tìm cảm hứng trước buổi chụp ảnh, chuẩn bị trang phục cho sự kiện trường và phối cùng bạn bè. Người dùng tự chọn dịp mặc, số người và thời gian; số đo, giới tính và ảnh tham khảo là tùy chọn. Họ có thể xem thẻ gợi ý mà không gọi AI, hoặc chủ động tạo ảnh Gemini. Tư vấn theo khu vực và thời tiết được yêu cầu riêng; ứng dụng không mặc định theo dõi vị trí.

### Tóm tắt giải pháp

V-Remix là ứng dụng web phối Việt phục với hai phần: Khám phá để chọn nhanh dịp mặc và Studio để tùy biến bản phối. Catalog ban đầu gồm áo ngũ thân tay chẽn, áo tấc, Nhật Bình và tứ thân, ảnh mẫu có nguồn, màu sắc, phong cách và phụ kiện hiện đại.

Trong Studio, người dùng đi qua Dịp mặc → Số người → Thời gian → Trang phục → Xác nhận. Mỗi người có lựa chọn riêng hoặc phối đồng điệu. Kết quả có thể là thẻ bản phối từ catalog, hoặc một ảnh tạo sinh sử dụng ảnh mẫu trang phục làm tham chiếu. Ảnh mẫu và ảnh AI được ghi nhãn khác nhau.

Thông tin nguồn gốc, ý nghĩa và đặc trưng cấu trúc được biên tập kèm nguồn tham khảo. Quy tắc văn hóa nhắc giữ dáng áo và phân biệt Remix hiện đại với phục dựng lịch sử. Đánh giá AI sau tạo ảnh chỉ là nhận định tạm thời, không thay thế chuyên gia hoặc bảo đảm đúng lịch sử.

Phần bổ sung gồm tư vấn AI theo lựa chọn, dữ liệu thời tiết có thời điểm lấy, lookbook cảm hứng, so sánh phiên bản, tải ảnh và xuất thẻ chia sẻ dọc. Mạng lưới cửa hàng đã có nền tảng hồ sơ, catalog và hàng chờ duyệt; dữ liệu đối tác và quyền sử dụng ảnh vẫn cần bổ sung trước khi đưa sản phẩm thật vào tạo ảnh.

### Tác động kỳ vọng

V-Remix giúp người trẻ giảm thời gian tìm hiểu và lựa chọn Việt phục, đồng thời tiếp cận kiến thức văn hóa qua hình ảnh và những giải thích ngắn có nguồn. Việc phân biệt phối hiện đại, phục dựng lịch sử, ảnh mẫu và ảnh AI giúp người dùng sáng tạo mà không hiểu nhầm kết quả là tư liệu lịch sử hoặc hàng đang bán.

Trong tương lai, catalog có kiểm soát và mạng lưới cửa hàng có thể kết nối nhu cầu phối đồ với mẫu mua/thuê ngoài đời. Hiệu quả cần được đo bằng tỷ lệ hoàn tất bản phối, độ khớp lựa chọn của ảnh, phản hồi người dùng và đánh giá chuyên gia văn hóa; bản demo chưa có số liệu để khẳng định tác động ở quy mô lớn.

### Hướng tiếp cận và giải pháp kỹ thuật

Giao diện chạy bằng PHP, HTML, CSS và JavaScript thuần, không sử dụng Next.js, React hoặc Tailwind. PHP trên VPS cung cấp trang, phiên đăng nhập và gateway có CSRF. Supabase Postgres lưu catalog, phiên bản prompt, quy tắc, bộ sưu tập và trạng thái yêu cầu; Storage lưu ảnh kết quả. Supabase Auth kiểm soát tài khoản và quyền quản trị.

Luồng ảnh: gateway kiểm tra lựa chọn và phiên → Edge Function chuẩn hóa kế hoạch từng người → đọc catalog/mẫu đã xuất bản và quy tắc đã duyệt → nạp ảnh tham chiếu từ nguồn được giới hạn → tạo prompt cấu trúc → gọi adapter Gemini → lưu ảnh → đánh giá ảnh theo lựa chọn → trả kết quả. Runtime demo hiện dùng Gemini Web bridge riêng trên VPS; không mô tả nó là Gemini Developer API chính thức và không cam kết một phiên bản model hoặc độ trễ chưa được đo.

Mỗi lần xác nhận có UUID và job riêng. Edge tiếp tục xử lý sau phản hồi 202, giao diện theo dõi bằng GET cùng mã; tải lại không tạo thêm yêu cầu. Lỗi provider không tự thử lại. Khi AI chưa sẵn sàng, thẻ bản phối hiển thị lựa chọn và nội dung có nguồn, không giả làm ảnh tạo sinh hay bịa điểm văn hóa.

Dữ liệu văn hóa, dữ liệu thương mại và nội dung AI được tách biệt. Nền tảng shop có sản phẩm, biến thể, giá mua/thuê/đặt may và quyền ảnh riêng; dữ liệu mới phải được duyệt. Chưa có shop đối tác trong catalog mạng lưới hiện tại. Giá/tồn kho không được AI suy đoán. Khóa dịch vụ và dữ liệu ảnh mặt không được đưa vào mã client hoặc bản ghi lựa chọn lâu dài.

### Cách sử dụng Gemini

Gemini được dùng cho ba nhiệm vụ: tư vấn phối đồ khi người dùng yêu cầu, tạo ảnh từ lựa chọn và mẫu trang phục, và đánh giá ảnh sau tạo. Đầu vào tạo ảnh gồm dịp mặc, số người, dáng áo, mẫu cụ thể, màu, phong cách, bối cảnh, phụ kiện đã chọn, ràng buộc cấu trúc và ảnh tham chiếu. Ảnh mặt chỉ được gửi khi người dùng chủ động cung cấp và đồng ý.

AI không được tự thêm túi, trang sức hoặc phụ kiện từ ảnh mẫu khi người dùng chưa chọn. Nội dung văn hóa hiển thị lấy từ bộ dữ liệu biên tập có nguồn, không giao cho mô hình tự viết lịch sử. Tư vấn thời tiết dùng ngữ cảnh có khu vực, ngày và thời điểm lấy dữ liệu, không suy diễn dự báo ngoài phạm vi.

Kết quả tạo là một ảnh cho cả nhóm. Lượt đánh giá riêng trả dữ liệu cấu trúc về số người, dáng áo, mẫu, màu, họa tiết, phụ kiện và bối cảnh, với trạng thái khớp, lệch hoặc chưa xác định. Điểm văn hóa, nếu có, chỉ là đánh giá tạm thời của AI. Nếu đánh giá thất bại, ảnh vẫn dùng được nhưng giao diện ghi chưa đối chiếu và không dựng điểm giả. Người dùng chủ động yêu cầu sửa phần bị lệch hoặc tạo ảnh dọc mới; các hành động này có thể tiêu lượt mới.

### Chiến lược và quy trình prompting

1. Kiểm tra đầu vào ở server: số người, ngày, slug, mẫu thuộc đúng loại áo và phụ kiện thuộc loại đã chọn. Chỉ dùng catalog đang hoạt động và mẫu đã xuất bản.
2. Gắn lựa chọn theo từng người bằng JSON. Tên và ghi chú người dùng là dữ liệu sở thích, không phải lệnh để thay đổi quy tắc. Ngày mặc không tự trở thành thời tiết.
3. Tạo prompt với hợp đồng cố định: một ảnh, đúng số người, giữ cấu trúc áo, không tự thêm phụ kiện. Bổ sung hướng dẫn từ phiên bản prompt đang hoạt động trong Admin và quy tắc văn hóa đã duyệt. Lựa chọn và ràng buộc cấu trúc được ưu tiên khi hướng dẫn cũ xung đột.
4. Gửi ảnh mẫu trang phục làm tham chiếu hình dáng, cổ, tay và vạt. Màu hoặc họa tiết người dùng chọn có thể biến tấu, nhưng không thay cấu trúc. Ảnh mẫu không được dùng để suy ra danh tính người trong ảnh, phụ kiện chưa chọn hoặc tình trạng hàng của shop.
5. Sau tạo, đối chiếu ảnh với kế hoạch và ảnh mẫu bằng lượt đánh giá JSON riêng. Kiểm tra schema, không coi thiếu dữ liệu là đạt. Giữ mô tả bản phối đúng lựa chọn thay vì chép phụ kiện AI tự thêm.
6. Kiểm thử bằng unit/contract test cho từng người, lựa chọn không hợp lệ, dữ liệu riêng tư, prompt phiên bản, quy tắc và lỗi provider; bổ sung ca tạo ảnh production có quyền. Chỉ sửa bằng yêu cầu mới có xác nhận, không tự tạo lặp để che lỗi. Một ca thành công không chứng minh độ chính xác cho toàn bộ catalog.

## Minh chứng và thao tác cuối

- Bản phối mẫu trong Studio: https://v-remix.vietnamsir.com/studio.php#studioExample — ca production
  đã ghi nhận, bảng đối chiếu từng mục, nguồn văn hóa và giới hạn kiểm thử.
  Xem `AUDITION_RELIABILITY.md` để phân biệt ca chạy thật với dữ liệu mô phỏng.

- Demo: https://v-remix.vietnamsir.com/
- Mã nguồn: https://github.com/trvanthanhhmaster-spec/aiarenavietnam2026
- Video đang ghi trong form: `https://drive.google.com/drive/project/1FZpNS97RrNoP1h56GL2iCs_hxcb9ueJw?usp=sharing`. Người dự thi xác nhận đây mới là thư mục, chưa có video. Cần quay/tải video thật và thay bằng link xem đã kiểm tra quyền.
- Gemini đang ghi trong form: `https://share.gemini.google/rGQwr4srgbg1`. Chưa xác minh được nội dung công khai; đội kiểm tra quyền xem và nội dung được phép chia sẻ.
- Người dự thi rà soát quyền ảnh, cam kết nguyên gốc, thay nội dung form, nộp và lưu xác nhận. Không coi autosave bản nháp là đã nộp.
