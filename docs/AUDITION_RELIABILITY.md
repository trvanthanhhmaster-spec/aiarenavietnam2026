# Minh chứng và đối chiếu ảnh trước Audition

## Phần được cải thiện

- Studio có bảng đối chiếu từng người: dáng áo, mẫu cụ thể, màu, họa tiết,
  phong cách, phụ kiện và bối cảnh. Giá trị lấy từ snapshot của bản kết quả,
  không dùng lựa chọn đang chỉnh của một bản khác.
- Trạng thái hiển thị suy ra từ số người và từng mục; thiếu kiểm tra cấu trúc,
  thiếu số người, trùng người hoặc dữ liệu chưa rõ không được hiển thị đạt.
  Dữ liệu cũ thiếu nguồn đánh giá hoặc lượt đánh giá thất bại là chưa đối chiếu.
- Phần cấu trúc cho biết đặc trưng cần giữ và nguồn của từng dáng áo. Phân biệt
  nguồn ảnh mẫu với nguồn thông tin văn hóa. Cảnh báo không thay thẩm định chuyên gia.
- `studio.php#studioExample` chứa bản phối mẫu ngay trong Studio, mở qua link
  ở phần giới thiệu hoặc mục thu gọn bên dưới. Mẫu được ghi nhãn rõ và không thay
  lựa chọn hay kết quả của người dùng. `/minh-chung.php` chuyển hướng vào mục này.
  Dữ liệu mẫu không truy vấn DB; ảnh gốc không chỉnh sửa, có SHA-256 trong JSON.
- Nhật ký các lượt QA mới lưu lựa chọn và metadata mẫu trước POST. Test này vẫn
  yêu cầu quyền riêng cho mỗi lượt AI; không chạy để kiểm tra triển khai.

## Nguồn của ca công khai

- Request `0c643f1a-3696-4743-8688-aa7c1ade84bf`;
  job `40b1715c-c6e4-4604-b67e-7595f87d962f`.
- Lượt cũ đã hoàn tất ngày 10/10/2026, 15:58 giờ Việt Nam; một ảnh và một review.
- Đã đọc lại **chỉ job QA này** để lấy outfit: `ao-tac` / `ao-tac-do-son`, không
  ghi đè màu/họa tiết, không phụ kiện. Không đưa tên, ảnh mặt, owner/session,
  khóa dịch vụ hay tài khoản vào artifact công khai.
- Ảnh `1376×768` JPEG được chép nguyên byte từ artifact đã kiểm chứng.
- Ảnh mẫu catalog ghi tác giả Ptdtch, CC BY-SA 4.0 và link Wikimedia; đây là
  ảnh tham khảo, không phải ảnh AI hoặc sản phẩm của shop đối tác.
- Nhận xét AI giữ nguyên. Kiểm tra bằng mắt xác nhận tay rộng và hình dáng nhìn
  thấy; không dùng nhận xét AI để khẳng định số thân/đường may bị che.

## Kiểm tra đã thực hiện cho thay đổi

- `node tests/studio-assessment.cjs`: bốn dáng áo, nhóm bốn người, người có mẫu
  phụ kiện cụ thể, lệch màu/tay, che tay, thiếu dữ liệu, trùng người, thiếu nguồn,
  review thất bại, text/URL không an toàn, hash ảnh gốc.
- Hồi quy result-info, lifecycle và generation-recovery; Deno plan, sample
  references và image-assessment (15 ca). Không gọi Gemini.
- Bản template Studio cách ly mở dữ liệu job thật đã ghi và hai phản hồi mô
  phỏng riêng: tay sai và tay bị che. Bảng và nút sửa được kiểm tra trong browser.
- Desktop và mobile 390px: ảnh dùng `contain`; bảng không tràn chiều rộng trang.

## Phần vẫn chưa được chứng minh

- Độ chính xác Gemini trên ảnh thật cho ba dáng áo còn lại và bản phối nhóm.
- Nhận diện lỗi cấu trúc trên bộ ảnh thực tế: test mô phỏng không phải bằng chứng
  về khả năng thị giác của mô hình.
- Đánh giá chuyên gia Việt phục, nghiên cứu người dùng và độ ổn định dài hạn.
- Video giới thiệu thật và việc nộp form. Trang minh chứng hỗ trợ quay video,
  không thay video hoặc biên nhận nộp bài.
