# Chẩn đoán lựa chọn và kết quả Studio V Remix

Ngày kiểm tra: 09/10/2026. Đối tượng: website production, luồng Studio và mức đáp ứng Audition Việt phục Remix.

Lựa chọn đang được truyền đúng vào yêu cầu tạo ảnh, nhưng kết quả chưa đáng tin cậy hoàn toàn. Hai kết quả production có phần mô tả thêm phụ kiện không được chọn. Luồng mở phiên bản cũ làm mất nội dung văn hóa của kết quả, còn yêu cầu chỉnh ảnh có chỉ dẫn giữ nguyên bối cảnh ngay cả khi đổi dịp mặc. Chưa có cơ chế kiểm tra ảnh AI thực sự khớp từng lựa chọn.

## Phạm vi và nguồn đối chiếu

Đề demo trong bản lưu `Dashboard thí sinh _ AI Arena Vietnam 2026.html` tại Downloads yêu cầu bốn khả năng: chọn trang phục hoặc sự kiện; chọn màu sắc, phụ kiện hoặc phong cách; xem kết quả bằng ảnh, thẻ hoặc mockup; đọc thông tin ngắn về nguồn gốc hoặc ý nghĩa trang phục. Các tính năng nâng cao được khuyến khích, không phải điều kiện bắt buộc.

PDF `Arena AI VietNam 2026.pdf` chỉ chứa tổng quan và hướng dẫn đội thi, không có nội dung đề Việt phục Remix. Form trong bản lưu dashboard chưa điền. Vì vậy danh sách cam kết V-Remix do người dùng cung cấp là cơ sở đối chiếu hồ sơ, chưa phải bản đăng ký đã nộp được xác minh độc lập.

Production đang chạy release `d8c6c7f`. Mã `assets/js/studio.js`, `studio-history.php`, `src/Support/StudioHistory.php` và `fallback-copy.ts` trên VPS có SHA256 trùng với checkout dùng để chẩn đoán. Hai mẫu kết quả có sẵn được đọc giới hạn, không gọi thêm lượt tạo ảnh. Không thay đổi lựa chọn, lưu/xóa bộ sưu tập, thông tin tài khoản hay cấu hình provider.

## Những phần đã hoạt động đúng

| Phần kiểm tra | Kết quả | Mức bằng chứng |
| --- | --- | --- |
| Gửi lựa chọn của 1, 2 và 12 người | Giữ trang phục, mẫu, màu, họa tiết, phong cách, bối cảnh và phụ kiện của từng người | Thực thi handler gửi thật trong môi trường offline với phản hồi giả |
| Người đang chỉnh không phải Người 1 | Trường tổng hợp gửi đi vẫn lấy Người 1, không nhầm sang tab cuối | Offline |
| Lựa chọn thay đổi sau khi gửi | Kết quả giữ bản chụp lựa chọn tại lúc gửi | Offline |
| Một lần xác nhận tạo | Một yêu cầu POST, không tự tạo khi chọn tùy chọn | Offline và mã nguồn |
| Prompt nhóm | Giải quyết đúng catalog đã duyệt cho từng người; không thêm phụ kiện catalog chưa chọn vào prompt nhóm | Offline PHP và Deno |
| Kết quả một người mặc Áo tấc đỏ son dự lễ | Input và output planning trùng; ảnh có một nhân vật chính mặc áo đỏ trong sân kiến trúc truyền thống | Dữ liệu production và quan sát ảnh; chưa xác nhận toàn bộ chi tiết phục dựng áo |
| So sánh | Hai phiên bản có sẵn tải được, hiển thị `object-fit: contain`, không cắt ảnh | Trình duyệt production |
| Xuất thẻ chia sẻ | Tải được PNG 1080 × 1920 | File tải thật từ production |
| Bridge tạo ảnh | Health có xác thực trả 200; thiếu xác thực trả 401; gateway từ chối chữ ký sai trước khi tạo job | Kiểm tra live không tạo ảnh |

Ảnh đang xem và hai ảnh so sánh đều có kích thước thực 1376 × 768. Đây không phải ảnh gốc 1920 × 1080.

## Các lỗi và khoảng trống cần xử lý

P1 là lỗi ảnh hưởng trực tiếp tính đúng của kết quả hoặc tính năng cam kết. P2 là vấn đề chất lượng, khả năng đối chiếu hoặc hồ sơ. Mức ưu tiên không đồng nghĩa mọi điểm dưới đây đã gây ảnh sai trong kiểm thử thật.

### P1 Nội dung dự phòng thêm phụ kiện chưa chọn

Hai job đã hoàn thành dùng `copySource=catalog-fallback`. Input của cả hai không có phụ kiện, nhưng story và Gen Z tip ghi sneaker, loafer, tote, kính râm và đồng hồ. Mẫu Áo tấc đỏ son còn được mô tả là bảng màu trung tính mặc dù tên mẫu và bảng màu catalog chỉ màu đỏ.

`processLook()` nạp toàn bộ catalog cho yêu cầu nhóm. `fallbackCopy()` lấy tên từ toàn bộ danh sách accessories/accessoryVariants nhận được, không lọc bằng lựa chọn. Hàm cũng chỉ xử lý áo chính, không mô tả trang phục khác của Người 2 trở đi. Lỗi phụ kiện và màu đã có bằng chứng production; lỗi bỏ Người 2 đã tái hiện offline.

Vị trí: `supabase/functions/generate-look/index.ts` phần `processLook`; `supabase/functions/generate-look/fallback-copy.ts:48`.

Tiêu chí sửa: dựng nội dung từ planning đã chuẩn hóa cho từng người; phụ kiện rỗng phải được mô tả là không thêm phụ kiện; ưu tiên màu người dùng chọn rồi mới tới màu mẫu; không tự đặt phong cách hay họa tiết thành lựa chọn đã được người dùng xác nhận.

### P1 AI viết nội dung thất bại và Cultural Score chưa thể trình diễn

Hai job được kiểm tra ghi nhận HTTP 403 ở provider viết nội dung, chuyển sang fallback và trả `culturalScore=null`, `culturalScoreSource=not-assessed`. Đây là lỗi phần viết nội dung, không phải bằng chứng bridge tạo ảnh đang hỏng. Nguyên nhân cụ thể của 403 chưa được xác nhận và không được suy diễn là thiếu quota.

Giao diện `renderResultInfo()` luôn ẩn Cultural Score, kể cả khi có điểm. Do đó tuy backend có schema điểm 0–100, sản phẩm hiện chưa trình diễn tính năng này theo danh sách cam kết. Giữ điểm null khi chưa đánh giá là đúng; không nên chữa bằng điểm cố định.

Vị trí: `index.ts:774`, `index.ts:831`; `assets/js/studio.js:1938`.

Tiêu chí sửa: kiểm tra riêng cấu hình/provider của văn bản; hiển thị rõ nội dung AI hay nội dung catalog; định nghĩa điểm là đánh giá gợi ý dựa trên tiêu chí và nguồn, không coi là chứng nhận văn hóa hoặc đánh giá chính ảnh nếu AI chưa xem ảnh.

### P1 Prompt chỉnh ảnh mâu thuẫn khi thay đổi dịp hoặc bối cảnh

`StudioHistory::reference()` luôn yêu cầu giữ identities, pose, camera và background. Diff chỉ chứa planning, không chứa eventSlug trước và sau. Đổi Đi học sang Dự lễ mà giữ cùng trang phục và scene rỗng tạo ra hai plan giống nhau cùng lệnh giữ nền. Prompt nhóm riêng lại có dịp mới, khiến chỉ dẫn mâu thuẫn.

Vị trí: `src/Support/StudioHistory.php:62`.

Đã tái hiện bằng hàm PHP thật với dependency giả; chưa gọi AI để xác nhận ảnh cụ thể có giữ sai nền hay không.

Tiêu chí sửa: diff đầy đủ dịp tự nhập, event, bối cảnh, số người và từng outfit. Chỉ giữ các yếu tố không thay đổi; thay đổi dịp có thể thay bối cảnh nếu scene không được người dùng khóa rõ ràng.

### P1 Không kiểm tra ảnh trả về có đúng lựa chọn

Điều kiện thành công hiện kiểm tra có ảnh, không kiểm tra số nhân vật chính, áo của từng người, màu, phụ kiện và bối cảnh. Prompt chi tiết giảm sai lệch nhưng không chứng minh ảnh tuân thủ. Ảnh tham khảo catalog của mẫu áo/phụ kiện không được gửi như reference pixels trong luồng nhóm; chủ yếu gửi mô tả, ảnh phiên bản trước và ảnh khuôn mặt khi có.

Vị trí: `assets/js/studio.js:1375`; `studio-plan.ts` phần `planPrompt`; `index.ts` phần tạo và lưu ảnh.

Tiêu chí sửa: định nghĩa điều kiện đúng và kiểm tra kết quả sau tạo, phân biệt nhân vật chính với người nền. Với mẫu có cấu trúc đặc thù cần reference và đánh giá có nguồn. Kết quả chưa đánh giá không nên được gắn nhãn đã phù hợp văn hóa.

### P2 Mở lại phiên bản làm mất nội dung kết quả

Endpoint lịch sử trả selection và ảnh nhưng không trả story, guardrail, Gen Z tip. `resultsApi.open()` thay output bằng một story chung về ảnh đã lưu/lịch sử. Ngay cả khi truyền output gốc cho handler, nó vẫn bị bỏ. Việc mở lại phiên bản có thể ghi lại output giản lược vào bản nháp qua persistStudio.

Vị trí: `studio-history.php` phần tạo items; `assets/js/studio.js:2246`.

Tiêu chí sửa: khôi phục output gốc đã lưu của đúng phiên bản, làm mới quyền truy cập ảnh mà không làm mất nội dung hoặc suy diễn lại theo lựa chọn hiện tại.

### P2 Bảng kết quả không cho đối chiếu đủ tùy biến

Thông tin bản phối chỉ liệt kê dịp, số người, thời gian và tên áo của từng người. Các màu, phụ kiện, phong cách, họa tiết và scene không xuất hiện trong bảng kết quả dù đã gửi cho AI.

Vị trí: `assets/js/studio.js:1910`.

Tiêu chí sửa: hiển thị lựa chọn từ snapshot lúc tạo, không lấy state đang chỉnh; cho người dùng đối chiếu những yếu tố ảnh có thể không thể hiện chính xác.

### P2 Nguồn văn hóa và cảnh báo còn hạn chế

Catalog production có đủ bốn nhóm áo, origin_note và significance_note. Nguồn đang gắn với cả bốn nhóm là trang tư liệu ảnh Wikimedia. Việc có nguồn ảnh không tự chứng minh từng khẳng định lịch sử, ý nghĩa hoặc quy tắc phối có căn cứ chuyên môn. Các significance_note chủ yếu là hướng dẫn giữ phom, chưa giải thích sâu ý nghĩa trang phục.

Giao diện chọn một rule đầu tiên khớp áo hoặc rule chung. Đây là lưu ý tham khảo, chưa phải phát hiện một kết hợp đang sai. Backend yêu cầu AI viết guardrail, nhưng không có kết quả phát hiện theo tiêu chí rõ ràng hay kiểm tra ảnh. Các mẫu fallback chỉ trả lời khuyên giữ phom chung.

Vị trí: `assets/js/studio.js` phần `updatePassport`; catalog `cultural_sources`, `cultural_rules`.

Tiêu chí sửa: gắn nguồn văn bản hỗ trợ từng nhận định, phân biệt nguồn hình và nguồn lịch sử; định nghĩa rule theo dịp và lựa chọn có xung đột; kiểm thử ví dụ đúng và sai, không chỉ kiểm tra chuỗi có từ guardrail.

### P2 Thẻ dọc và độ phân giải chưa giống trải nghiệm được kỳ vọng

File xuất đúng 9:16 nhưng là ảnh ngang được đặt vào khung dọc với khoảng trống lớn; không phải ảnh AI dọc mới. Thẻ không chứa lựa chọn, câu chuyện hay nguồn văn hóa. Yêu cầu targetResolution 1080 chỉ được đưa vào prompt bridge, chưa đảm bảo kích thước ảnh nhà cung cấp trả về. Hai ảnh kiểm tra là 1376 × 768.

Vị trí: `assets/js/studio.js:1645`; `services/gemini-webapi-bridge/server.py:219`.

Tiêu chí sửa: gọi rõ là thẻ chia sẻ 1080 × 1920; bố cục có nội dung hữu ích, không cắt nhân vật; không gọi ảnh gốc 1080p nếu chưa đạt. Upscale hay tạo ảnh dọc phải được công bố đúng và không tự gọi thêm lượt AI.

## Đối chiếu đề và cam kết

| Chức năng | Vai trò | Trạng thái hiện tại |
| --- | --- | --- |
| Chọn loại Việt phục hoặc sự kiện | Bắt buộc | Có UI và catalog; lựa chọn đi vào request |
| Chọn màu, phụ kiện hoặc phong cách | Bắt buộc | Cả ba được truyền theo từng người; copy fallback chưa giữ đúng lựa chọn |
| Xem ảnh, thẻ hoặc mockup | Bắt buộc | Có ảnh production đã hoàn thành; tính đúng mọi lựa chọn chưa được đánh giá |
| Đọc nguồn gốc hoặc ý nghĩa | Bắt buộc | Có nội dung ngắn và link nguồn hình; nội dung cần củng cố, lịch sử kết quả mất copy |
| Tải ảnh cá nhân hoặc chọn avatar | Nâng cao | Có ảnh tham khảo và kiểm tra consent trong code; chưa kiểm thử ảnh cá nhân thật trong lượt này; chưa xác nhận trình chọn avatar |
| Gợi ý thời tiết và sự kiện | Nâng cao và cam kết | Có sự kiện; weather/season bị để rỗng, không có tích hợp dự báo thực được tìm thấy |
| Kiểm tra hài hòa màu | Nâng cao | UI chỉ ghi nhận màu đã chọn và nhắc tự xem trên ảnh, không có phép đánh giá riêng |
| So sánh phương án | Nâng cao | Hai ảnh có sẵn hiển thị được trong trình duyệt production |
| Tạo và chia sẻ lookbook | Nâng cao và cam kết | Có bộ sưu tập riêng và tải PNG; chưa có link public hoặc luồng chia sẻ công khai được tìm thấy |
| Cảnh báo sai lệch văn hóa | Nâng cao và cam kết | Có rule tham khảo và guardrail text; chưa phải bộ phát hiện kết hợp sai đã kiểm chứng |
| AI Stylist | Cam kết | Schema và prompt có; hai mẫu văn bản đã kiểm tra bị 403 và dùng fallback |
| Cultural Score 100 | Cam kết | Schema có, hai mẫu null, UI luôn ẩn; chưa thể trình diễn |
| Heritage Context | Cam kết | Có origin/significance; chủ yếu nguồn ảnh và chỉ dẫn giữ phom |
| AI Lookbook | Cam kết | Ảnh thật đã tồn tại; chưa có kiểm tra đầu ra theo lựa chọn |
| Xuất 9:16 | Cam kết | Đã tải file đúng tỷ lệ, bố cục còn hạn chế |
| Nhận diện địa phương và mùa lễ hội | Cam kết | Chưa có geolocation, festival lookup hay suy luận địa phương tự động được tìm thấy |
| Lookbook mẫu và phụ kiện Gen Z | Cam kết | Có catalog/mẫu phụ kiện; chưa tương đương bộ gợi ý cá nhân hóa tự động |

Stack hiện tại là PHP, Supabase, Edge Functions và Gemini/bridge. Chỉ kết luận hồ sơ ghi Next.js, React, Tailwind bị lệch khi có bản đăng ký đã nộp chứa các thông tin đó. README và AUDITION_PLAN có một số mô tả cũ về biến thể A–E, triển khai VPS và Auth, cần đồng bộ với luồng nhóm hiện tại.

## Bằng chứng kiểm thử và giới hạn

Các kiểm tra offline đã chạy thành công:

- 20 Deno tests cho schema, plan, image/video request, gateway và provider errors.
- 9 suite CJS cho planner, profile, phản hồi số người, history, thông tin kết quả, menu thao tác, flow, collections và lifecycle.
- 3 suite Python bridge cho group, security và readiness.
- PHP StudioPlan và kiểm tra thực thi handler gửi payload 1/2/12 người.

Các script chẩn đoán tái hiện lỗi hiện tại, không phải bài test nghiệm thu tính năng:

```sh
node tests/studio-selection-payload.cjs
deno run tests/studio-selection-known-gaps.ts
php tests/studio-history-edit-audit.php
node tests/studio-history-output-audit.cjs
```

`tests/studio-selection-live-audit.php` chỉ chạy CLI `--live`, đọc hai job định trước và catalog văn hóa. Output loại bỏ tài khoản, tên cá nhân, ảnh mặt, token, URL ảnh ký và chi tiết provider thô. Script không tạo job, không cập nhật dữ liệu và không gọi AI.

Các tests sẵn có còn thiếu tình huống catalog đầy đủ có phụ kiện không được chọn; mở lịch sử phải giữ văn bản gốc; đổi dịp cần đổi nền; đánh giá pixel đầu ra. Vì vậy toàn bộ tests xanh không đồng nghĩa ảnh AI đã đúng.

File xuất production đã kiểm tra: `/Users/vthanh/Downloads/v-remix-lookbook-1080x1920 (9).png`. Hai ảnh so sánh tải đủ, lấy từ hai job khác nhau; việc khác job không tự chứng minh ảnh khác nội dung.

Chưa có kiểm thử ảnh thật cho mọi loại áo, nhiều người với outfit khác nhau, đổi màu độc lập, thêm/bớt phụ kiện, đổi nền và cảnh báo một kết hợp sai. Lượt rà soát này không tạo thêm ảnh, không gửi ảnh mặt và không thay đổi production.

## Thứ tự sửa và điều kiện nghiệm thu

1. Sửa copy fallback theo từng người và đúng lựa chọn; bổ sung test với catalog dư phụ kiện, màu của mẫu và outfit khác nhau.
2. Khôi phục văn bản provider hoặc trình bày fallback minh bạch; tách trạng thái tạo ảnh khỏi trạng thái đánh giá văn hóa.
3. Giữ nguyên output khi mở lịch sử và hiển thị đầy đủ snapshot để đối chiếu.
4. Sửa diff/edit instruction, kiểm tra đủ event, custom occasion, scene và khóa; giữ ổn định phần không thay đổi.
5. Thiết lập tiêu chí đánh giá ảnh; kiểm thử có giới hạn chi phí được người dùng cho phép cho bốn nhóm áo và các thay đổi cụ thể. Không tự retry vô hạn để tìm ảnh đúng.
6. Bổ sung nguồn văn bản văn hóa và case cảnh báo; sửa thẻ chia sẻ và cách mô tả độ phân giải.
7. Đồng bộ tài liệu và hồ sơ; chỉ cam kết thời tiết, địa phương, festival, color harmony và score sau khi có hành vi kiểm chứng được.

Nghiệm thu cần phân biệt ba điều: request giữ đúng lựa chọn; ảnh thể hiện đúng các yếu tố có thể đánh giá; story và cảnh báo không bịa hay nhầm sang lựa chọn khác. Không dùng việc job completed hoặc schema hợp lệ để thay cho cả ba.
