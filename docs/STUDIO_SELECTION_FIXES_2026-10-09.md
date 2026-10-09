# Sửa lựa chọn và kết quả Studio V Remix

Studio giữ nội dung của từng phiên bản, mô tả đúng lựa chọn và phân biệt gợi ý văn hóa với đối chiếu ảnh. Đây là cập nhật sau báo cáo chẩn đoán ngày 09/10/2026, không phải chứng nhận toàn bộ tính năng trong hồ sơ Audition đã hoàn thành.

## Các thay đổi

- Nội dung dự phòng chỉ lấy trang phục và phụ kiện đã chọn của từng người. Phụ kiện rỗng không còn bị thay bằng toàn bộ catalog. Các kết quả cũ dùng nội dung dự phòng cũng được dựng lại phần mô tả khi hiển thị.
- Lịch sử và thư viện khôi phục story, guardrail và tip của đúng phiên bản. Địa chỉ ảnh được làm mới mà không ghi đè văn bản. Bản cũ thiếu dữ liệu không được gán nội dung AI giả.
- Chỉnh ảnh sau khi đổi dịp hoặc bối cảnh giải phóng nền cũ; các chi tiết không đổi vẫn được yêu cầu giữ lại. Màu và họa tiết chỉ ghi đè phần tương ứng của mẫu áo, không thay cấu trúc áo.
- Bảng kết quả hiển thị mẫu, màu, họa tiết, phong cách, bối cảnh và phụ kiện cho từng người theo lựa chọn tại lúc gửi.
- Provider web không còn cần lượt viết nội dung trước tạo ảnh qua một API key khác. Sau tạo ảnh, Edge gửi chính ảnh kết quả tới bridge để viết gợi ý và đối chiếu chi tiết. Kiểm tra số người và từng trường được suy ra từ dữ liệu có cấu trúc, không tin một cờ đạt do AI trả về.
- Bước đối chiếu có thể phát sinh thêm một lượt xử lý văn bản của provider. Nếu lỗi, ảnh vẫn được giữ, trạng thái là chưa đối chiếu và không tự tạo lại. Local-only endpoint hiện dùng nội dung catalog và ghi rõ chưa đối chiếu ảnh.
- Điểm 0–100 chỉ xuất hiện khi có nguồn đánh giá AI hợp lệ, kể cả điểm 0. Điểm đánh giá lựa chọn không được ghi là chứng nhận ảnh đạt chuẩn văn hóa.
- Thẻ 1080 × 1920 giữ toàn bộ ảnh, dành chỗ cho lựa chọn và trạng thái đối chiếu. Kích thước ảnh gốc được lấy từ dữ liệu ảnh khi đọc được; kích thước thẻ không phải cam kết ảnh gốc full HD.

## Kiểm thử và giới hạn

Kiểm thử offline gồm 28 tệp JavaScript, 24 bài Deno, các bộ kiểm tra PHP lựa chọn và lịch sử, cùng bốn bộ Python kiểm tra bridge. Các fixture đối chiếu bao gồm số người sai, thiếu trường, trùng người, chi tiết không được yêu cầu và phản hồi không hợp lệ. Bố cục thẻ được kiểm tra với 1, 2 và 12 người, không cắt ảnh nguồn.

Một lượt AI thật mới chưa được chạy trong đợt sửa này. Độ chính xác của đối chiếu thị giác và điểm văn hóa vẫn cần kiểm thử bằng mẫu thực tế; AI phải trả chưa chắc chắn nếu chi tiết không nhìn rõ. Nguồn văn hóa cần thẩm định chuyên môn. Thời tiết thực tế, tự nhận diện địa phương, lễ hội, hòa hợp màu độc lập và chia sẻ liên kết công khai không được bổ sung trong đợt sửa lỗi này.
